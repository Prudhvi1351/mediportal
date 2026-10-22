import json
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from statsmodels.stats.contingency_tables import mcnemar
from statsmodels.stats.multitest import multipletests
from sklearn.utils import resample
import warnings
warnings.filterwarnings('ignore')

print("========================================")
print("TASK 1 — VERIFY AVAILABLE RAW RESULTS")
print("========================================")
try:
    preds_df = pd.read_csv("experiments/results/test_predictions.csv")
    probs_df = pd.read_csv("experiments/results/test_probabilities.csv")
    with open("experiments/results/cv_results.json", "r") as f:
        cv_data = json.load(f)
    print("STATUS: SUCCESS - All required raw data files found.")
except Exception as e:
    print(f"STATUS: FAILED - Missing data files. {e}")
    exit()

y_true = preds_df['y_true'].values
models = ["Logistic Regression", "Random Forest", "XGBoost", "MLP"]

print("\n========================================")
print("TABLE 1 — Five-Fold Cross-Validation Results")
print("========================================")
cv_rows = []
for m in models:
    d = cv_data[m]
    cv_rows.append({"Model": m, "Fold 1": d["Fold 1"], "Fold 2": d["Fold 2"], "Fold 3": d["Fold 3"], 
                    "Fold 4": d["Fold 4"], "Fold 5": d["Fold 5"], "Mean": d["Mean"], "SD": d["Std"]})
cv_df = pd.DataFrame(cv_rows)
print(cv_df.to_string(index=False, float_format="%.4f"))

print("\n========================================")
print("TABLE 2 — 95% Confidence Intervals (Method: Empirical Bootstrap, n=1000)")
print("========================================")
np.random.seed(42)
n_iterations = 1000
ci_data = []

for m in models:
    y_pred = preds_df[f"{m}_pred"].values
    y_prob = probs_df[f"{m}_prob"].values
    
    # Store point estimates cleanly in a dictionary
    point_estimates = {
        "Accuracy": accuracy_score(y_true, y_pred),
        "Precision": precision_score(y_true, y_pred, zero_division=0),
        "Recall": recall_score(y_true, y_pred),
        "F1": f1_score(y_true, y_pred),
        "AUC": roc_auc_score(y_true, y_prob)
    }
    
    metrics = {"Accuracy": [], "Precision": [], "Recall": [], "F1": [], "AUC": []}
    
    for _ in range(n_iterations):
        idx = resample(np.arange(len(y_true)))
        y_t, y_p, y_pr = y_true[idx], y_pred[idx], y_prob[idx]
        metrics["Accuracy"].append(accuracy_score(y_t, y_p))
        metrics["Precision"].append(precision_score(y_t, y_p, zero_division=0))
        metrics["Recall"].append(recall_score(y_t, y_p))
        metrics["F1"].append(f1_score(y_t, y_p))
        metrics["AUC"].append(roc_auc_score(y_t, y_pr))
        
    for metric_name in metrics.keys():
        pt_est = point_estimates[metric_name]
        lower = np.percentile(metrics[metric_name], 2.5)
        upper = np.percentile(metrics[metric_name], 97.5)
        ci_data.append({"Model": m, "Metric": metric_name, "Point Estimate": round(pt_est, 4), 
                        "Lower 95% CI": round(lower, 4), "Upper 95% CI": round(upper, 4), "Method": "Bootstrap"})

ci_df = pd.DataFrame(ci_data)
print(ci_df.to_string(index=False))

print("\n========================================")
print("TABLE 3 — Statistical Significance Comparison (McNemar's Test with Holm Correction)")
print("========================================")

comparisons = ["Logistic Regression", "XGBoost", "MLP"]
p_values_raw = []
stats = []

rf_pred = preds_df["Random Forest_pred"].values

for m in comparisons:
    m_pred = preds_df[f"{m}_pred"].values
    b = sum((rf_pred == y_true) & (m_pred != y_true))
    c = sum((rf_pred != y_true) & (m_pred == y_true))
    
    table = [[0, b], [c, 0]]
    result = mcnemar(table, exact=False, correction=True)
    stats.append(result.statistic)
    p_values_raw.append(result.pvalue)

reject, pvals_corrected, _, _ = multipletests(p_values_raw, alpha=0.05, method='holm')

sig_data = []
for i, m in enumerate(comparisons):
    sig_data.append({
        "Comparison": f"RF vs {m}",
        "Test": "McNemar's Test",
        "Statistic": round(stats[i], 4),
        "Raw p-value": round(p_values_raw[i], 4),
        "Adjusted p-value": round(pvals_corrected[i], 4),
        "Significant at α=0.05?": "YES" if reject[i] else "NO"
    })

sig_df = pd.DataFrame(sig_data)
print(sig_df.to_string(index=False))
