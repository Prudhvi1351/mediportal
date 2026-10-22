import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import warnings

warnings.filterwarnings('ignore')

os.makedirs("experiments/results/figures", exist_ok=True)

data = load_breast_cancer()
X = data.data
y = 1 - data.target  

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

###########################################
# PART A: FEDERATED LEARNING
###########################################

central_lr = LogisticRegression(random_state=42, max_iter=100)
central_lr.fit(X_train_scaled, y_train)
central_pred = central_lr.predict(X_test_scaled)
central_prob = central_lr.predict_proba(X_test_scaled)[:, 1]

central_metrics = {
    "Accuracy": accuracy_score(y_test, central_pred),
    "Precision": precision_score(y_test, central_pred, zero_division=0),
    "Recall": recall_score(y_test, central_pred),
    "F1": f1_score(y_test, central_pred),
    "AUC": roc_auc_score(y_test, central_prob)
}

num_clients = 5
client_data = []
np.random.seed(42)
indices = np.arange(len(X_train_scaled))
np.random.shuffle(indices)
splits = np.array_split(indices, num_clients)

dist_records = []
for i, split_idx in enumerate(splits):
    cX = X_train_scaled[split_idx]
    cy = y_train[split_idx]
    client_data.append((cX, cy))
    dist_records.append({
        "Client": i+1,
        "Total_Samples": len(cy),
        "Malignant": np.sum(cy == 1),
        "Benign": np.sum(cy == 0)
    })
df_dist = pd.DataFrame(dist_records)
df_dist.to_csv("experiments/results/federated_client_distribution.csv", index=False)

num_rounds = 10
global_model = LogisticRegression(random_state=42, max_iter=100)
global_model.fit(X_train_scaled[:2], y_train[:2]) 
global_coef = np.zeros_like(global_model.coef_)
global_intercept = np.zeros_like(global_model.intercept_)

round_results = []

for r in range(1, num_rounds + 1):
    local_coefs = []
    local_intercepts = []
    local_sizes = []
    
    for cX, cy in client_data:
        local_model = LogisticRegression(random_state=42, max_iter=10, warm_start=True)
        local_model.fit(cX, cy) 
        if r > 1:
            local_model.coef_ = np.copy(global_coef)
            local_model.intercept_ = np.copy(global_intercept)
        local_model.fit(cX, cy)
        
        local_coefs.append(local_model.coef_)
        local_intercepts.append(local_model.intercept_)
        local_sizes.append(len(cy))
        
    total_samples = sum(local_sizes)
    global_coef = np.sum([c * (n / total_samples) for c, n in zip(local_coefs, local_sizes)], axis=0)
    global_intercept = np.sum([i * (n / total_samples) for i, n in zip(local_intercepts, local_sizes)], axis=0)
    
    eval_model = LogisticRegression(random_state=42)
    eval_model.fit(X_train_scaled[:2], y_train[:2])
    eval_model.coef_ = global_coef
    eval_model.intercept_ = global_intercept
    eval_model.classes_ = np.array([0, 1])
    
    y_pred = eval_model.predict(X_test_scaled)
    y_prob = eval_model.predict_proba(X_test_scaled)[:, 1]
    
    metrics = {
        "Round": r,
        "Accuracy": accuracy_score(y_test, y_pred),
        "Precision": precision_score(y_test, y_pred, zero_division=0),
        "Recall": recall_score(y_test, y_pred),
        "F1": f1_score(y_test, y_pred),
        "AUC": roc_auc_score(y_test, y_prob)
    }
    round_results.append(metrics)

df_rounds = pd.DataFrame(round_results)
df_rounds.to_csv("experiments/results/federated_round_results.csv", index=False)

fl_final = df_rounds.iloc[-1].to_dict()
fl_final.pop("Round")

df_final_comparison = pd.DataFrame([
    {"Model": "Centralized", **central_metrics},
    {"Model": "Federated (Round 10)", **fl_final}
])
df_final_comparison.to_csv("experiments/results/federated_final_results.csv", index=False)

plt.figure(figsize=(10, 6))
plt.plot(df_rounds["Round"], df_rounds["Accuracy"]*100, marker='o', label='Accuracy')
plt.plot(df_rounds["Round"], df_rounds["F1"]*100, marker='s', label='F1 Score')
plt.plot(df_rounds["Round"], df_rounds["AUC"]*100, marker='^', label='AUC')
plt.title("Federated Learning Performance Over 10 Communication Rounds")
plt.xlabel("Communication Round")
plt.ylabel("Score (%)")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("experiments/results/figures/Fig8_FL_Round_Performance_HighRes.png", dpi=300)
plt.close()

df_comp_melt = df_final_comparison.melt(id_vars="Model", var_name="Metric", value_name="Score")
df_comp_melt["Score"] *= 100
plt.figure(figsize=(10, 6))
sns.barplot(data=df_comp_melt, x="Metric", y="Score", hue="Model", palette="viridis")
plt.title("Centralized vs Federated Final Performance (Held-Out Test Set)")
plt.tight_layout()
plt.savefig("experiments/results/figures/Fig9_Centralized_vs_Federated_HighRes.png", dpi=300)
plt.close()

###########################################
# PART B: ANOMALY DETECTION
###########################################

iso_forest = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
iso_forest.fit(X_train_scaled)

normal_X = X_test_scaled.copy()
normal_y_anomaly = np.zeros(len(normal_X))

np.random.seed(42)
std_devs = np.std(X_train_scaled, axis=0)

def generate_anomalies(X_base, num_features, std_multiplier):
    X_anom = X_base.copy()
    for i in range(len(X_anom)):
        features_to_perturb = np.random.choice(30, num_features, replace=False)
        X_anom[i, features_to_perturb] += np.random.randn(num_features) * std_devs[features_to_perturb] * std_multiplier
    return X_anom

X_anom_low = generate_anomalies(X_test_scaled, 3, 2)
X_anom_med = generate_anomalies(X_test_scaled, 10, 3)
X_anom_high = generate_anomalies(X_test_scaled, 20, 5)

y_anom_true = np.ones(len(X_test_scaled))

def evaluate_detector(X_test_mixed, y_test_mixed, severity):
    preds = iso_forest.predict(X_test_mixed)
    preds_binary = np.where(preds == -1, 1, 0)
    scores = -iso_forest.decision_function(X_test_mixed)
    
    return {
        "Severity": severity,
        "Accuracy": accuracy_score(y_test_mixed, preds_binary),
        "Precision": precision_score(y_test_mixed, preds_binary, zero_division=0),
        "Recall": recall_score(y_test_mixed, preds_binary),
        "F1": f1_score(y_test_mixed, preds_binary),
        "AUC": roc_auc_score(y_test_mixed, scores)
    }

res_low = evaluate_detector(np.vstack([normal_X, X_anom_low]), np.concatenate([normal_y_anomaly, y_anom_true]), "Low")
res_med = evaluate_detector(np.vstack([normal_X, X_anom_med]), np.concatenate([normal_y_anomaly, y_anom_true]), "Medium")
res_high = evaluate_detector(np.vstack([normal_X, X_anom_high]), np.concatenate([normal_y_anomaly, y_anom_true]), "High")

df_anomaly = pd.DataFrame([res_low, res_med, res_high])
df_anomaly.to_csv("experiments/results/anomaly_detection_results.csv", index=False)

pd.DataFrame([
    {"Severity": "Low", "Features_Perturbed": 3, "Std_Multiplier": 2},
    {"Severity": "Medium", "Features_Perturbed": 10, "Std_Multiplier": 3},
    {"Severity": "High", "Features_Perturbed": 20, "Std_Multiplier": 5}
]).to_csv("experiments/results/anomaly_generation_parameters.csv", index=False)

scores_normal = -iso_forest.decision_function(normal_X)
scores_low = -iso_forest.decision_function(X_anom_low)
scores_med = -iso_forest.decision_function(X_anom_med)
scores_high = -iso_forest.decision_function(X_anom_high)

plt.figure(figsize=(10, 6))
sns.kdeplot(scores_normal, label="Normal", fill=True, color='green')
sns.kdeplot(scores_low, label="Low Severity Anomaly", fill=True, alpha=0.5)
sns.kdeplot(scores_med, label="Medium Severity Anomaly", fill=True, alpha=0.5)
sns.kdeplot(scores_high, label="High Severity Anomaly", fill=True, alpha=0.5)
plt.axvline(x=-iso_forest.offset_, color='red', linestyle='--', label='Decision Threshold')
plt.title("Anomaly Score Distribution (Synthetic Perturbations)")
plt.xlabel("Anomaly Score (Higher = More Anomalous)")
plt.ylabel("Density")
plt.legend()
plt.tight_layout()
plt.savefig("experiments/results/figures/Fig10_Anomaly_Score_Distribution_HighRes.png", dpi=300)
plt.close()

df_anom_melt = df_anomaly.melt(id_vars="Severity", var_name="Metric", value_name="Score")
df_anom_melt["Score"] *= 100
plt.figure(figsize=(10, 6))
sns.barplot(data=df_anom_melt, x="Severity", y="Score", hue="Metric", palette="mako")
plt.title("Anomaly Detection Performance by Synthetic Severity")
plt.ylabel("Score (%)")
plt.ylim(0, 110)
plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
plt.tight_layout()
plt.savefig("experiments/results/figures/Fig11_Anomaly_Performance_HighRes.png", dpi=300)
plt.close()

print("EXPERIMENT 5 FINISHED SUCCESSFULLY.")
