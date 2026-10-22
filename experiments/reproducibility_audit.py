import json
import os
import numpy as np
import pandas as pd
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, roc_curve
from xgboost import XGBClassifier
import warnings
warnings.filterwarnings('ignore')

os.makedirs("experiments/results", exist_ok=True)

# 1. DATASET & PREPROCESSING
data = load_breast_cancer()
X = data.data
# Invert target so Malignant (originally 0 in sklearn) is 1 (Positive Class)
y = 1 - data.target 

# 80/20 Stratified Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# Min-Max Normalization (Fit on train, transform train/test)
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 2. MODEL CONFIGURATION
models = {
    "Logistic Regression": LogisticRegression(random_state=42),
    "Random Forest": RandomForestClassifier(random_state=42),
    "XGBoost": XGBClassifier(random_state=42, eval_metric='logloss'),
    "MLP": MLPClassifier(random_state=42, max_iter=1000)
}

paper_results = {
    "Logistic Regression": {"Accuracy": 0.965, "Precision": 0.975, "Recall": 0.929, "F1": 0.951, "AUC": 0.996},
    "Random Forest":       {"Accuracy": 0.974, "Precision": 1.000, "Recall": 0.929, "F1": 0.963, "AUC": 0.995},
    "XGBoost":             {"Accuracy": 0.965, "Precision": 1.000, "Recall": 0.905, "F1": 0.950, "AUC": 0.993},
    "MLP":                 {"Accuracy": 0.965, "Precision": 1.000, "Recall": 0.905, "F1": 0.950, "AUC": 0.993}
}

# 3. EXECUTE EXPERIMENT
results = {}
cv_results = {}
predictions_db = {"y_true": y_test.tolist()}
probabilities_db = {}
roc_data = {}

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for name, model in models.items():
    # 5-Fold CV
    cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=skf, scoring='accuracy')
    cv_results[name] = {
        "Fold 1": cv_scores[0], "Fold 2": cv_scores[1], "Fold 3": cv_scores[2], 
        "Fold 4": cv_scores[3], "Fold 5": cv_scores[4],
        "Mean": cv_scores.mean(), "Std": cv_scores.std()
    }
    
    # Train & Predict
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]
    
    # Calculate Metrics
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    
    results[name] = {
        "Accuracy": acc, "Precision": prec, "Recall": rec, "F1": f1, "AUC": auc, "Confusion Matrix": cm.tolist()
    }
    
    predictions_db[f"{name}_pred"] = y_pred.tolist()
    probabilities_db[f"{name}_prob"] = y_prob.tolist()
    roc_data[name] = {"fpr": fpr.tolist(), "tpr": tpr.tolist()}

# 4. FORMAT OUTPUTS & COMPARISONS
comparison_data = []
for name in models.keys():
    for metric in ["Accuracy", "Precision", "Recall", "F1", "AUC"]:
        rep_val = results[name][metric]
        pap_val = paper_results[name][metric]
        diff = rep_val - pap_val
        comparison_data.append({
            "Model": name, "Metric": metric, "Reproduced": round(rep_val, 4), 
            "Paper": pap_val, "Difference": round(diff, 4)
        })

df_comp = pd.DataFrame(comparison_data)

# Save Raw Files
pd.DataFrame(predictions_db).to_csv("experiments/results/test_predictions.csv", index=False)
pd.DataFrame(probabilities_db).to_csv("experiments/results/test_probabilities.csv", index=False)
with open("experiments/results/roc_data.json", "w") as f: json.dump(roc_data, f)
with open("experiments/results/cv_results.json", "w") as f: json.dump(cv_results, f, indent=4)
df_comp.to_csv("experiments/results/paper_comparison.csv", index=False)

print("\n--- 1. DATASET SUMMARY ---")
print(f"Total Samples: {len(X)} | Features: {X.shape[1]}")
print(f"Class Distribution: Malignant={sum(y)}, Benign={len(y)-sum(y)}")
print(f"Train/Test Split: 80/20 Stratified -> Train: {len(X_train)}, Test: {len(X_test)}")

print("\n--- 2. COMPARISON WITH PAPER (REPRODUCIBILITY ASSESSMENT) ---")
print(df_comp.to_string(index=False))

print("\n--- 3. 5-FOLD CROSS VALIDATION (TRAIN SET) ---")
for model, scores in cv_results.items():
    print(f"{model}: Mean {scores['Mean']:.4f} ± {scores['Std']:.4f}")

print("\n--- 4. CONFUSION MATRICES (TEST SET) ---")
for model, metrics in results.items():
    print(f"{model}:\n{np.array(metrics['Confusion Matrix'])}\n")

print("\nSUCCESS: All raw files saved to experiments/results/")
