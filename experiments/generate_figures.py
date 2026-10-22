import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Ensure directories exist
os.makedirs("experiments/results/figures", exist_ok=True)
os.makedirs("experiments/results/figure_data", exist_ok=True)

# Formatting settings for publication quality
plt.rcParams.update({'font.size': 12, 'axes.labelsize': 14, 'axes.titlesize': 16})
sns.set_theme(style="whitegrid")

# --- DATA DEFINITIONS (Strictly from Deliverable 1) ---
models = ["Logistic Regression", "Random Forest", "XGBoost", "MLP"]

# Figure 1 Data
test_metrics = {
    "Logistic Regression": {"Accuracy": 0.9737, "Precision": 1.0000, "Recall": 0.9286, "F1": 0.9630},
    "Random Forest": {"Accuracy": 0.9737, "Precision": 1.0000, "Recall": 0.9286, "F1": 0.9630},
    "XGBoost": {"Accuracy": 0.9649, "Precision": 1.0000, "Recall": 0.9048, "F1": 0.9500},
    "MLP": {"Accuracy": 0.9737, "Precision": 1.0000, "Recall": 0.9286, "F1": 0.9630}
}

# Figure 4 & 5 Data (CV)
cv_folds = {
    "Logistic Regression": [0.9451, 0.9890, 0.9451, 0.9560, 0.9780],
    "Random Forest": [0.9560, 0.9890, 0.9451, 0.9670, 0.9670],
    "XGBoost": [0.9670, 0.9780, 0.9560, 0.9670, 0.9890],
    "MLP": [0.9560, 0.9780, 0.9890, 0.9780, 0.9780]
}
cv_summary = {
    "Logistic Regression": {"Mean": 0.9626, "SD": 0.0179},
    "Random Forest": {"Mean": 0.9648, "SD": 0.0146},
    "XGBoost": {"Mean": 0.9714, "SD": 0.0112},
    "MLP": {"Mean": 0.9758, "SD": 0.0108}
}

# --- FIGURE 1: ML MODEL PERFORMANCE ---
df_metrics = pd.DataFrame(test_metrics).T * 100
df_metrics.to_csv("experiments/results/figure_data/fig1_ml_performance.csv")

fig, ax = plt.subplots(figsize=(10, 6))
df_metrics.plot(kind='bar', ax=ax, colormap='viridis', edgecolor='black')
ax.set_title("Test-Set Classification Performance")
ax.set_ylabel("Score (%)")
ax.set_ylim(85, 105)
plt.xticks(rotation=0)
plt.legend(loc='lower right')
plt.tight_layout()
plt.savefig("experiments/results/figures/Fig1_ML_Performance.png", dpi=100)
plt.savefig("experiments/results/figures/Fig1_ML_Performance_HighRes.png", dpi=300)
plt.close()

# --- FIGURE 2: ROC CURVES ---
try:
    with open("experiments/results/roc_data.json", "r") as f:
        roc_data = json.load(f)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    aucs = {"Logistic Regression": 0.9980, "Random Forest": 0.9929, "XGBoost": 0.9904, "MLP": 0.9914}
    
    for m in models:
        ax.plot(roc_data[m]['fpr'], roc_data[m]['tpr'], lw=2, label=f"{m} (AUC = {aucs[m]:.4f})")
    
    ax.plot([0, 1], [0, 1], color='black', lw=2, linestyle='--')
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel('False Positive Rate')
    ax.set_ylabel('True Positive Rate')
    ax.set_title('Receiver Operating Characteristic (ROC) Curves')
    ax.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig("experiments/results/figures/Fig2_ROC_Curves.png", dpi=100)
    plt.savefig("experiments/results/figures/Fig2_ROC_Curves_HighRes.png", dpi=300)
    plt.close()
except Exception as e:
    print(f"Warning: ROC data could not be loaded/plotted: {e}")

# --- FIGURE 3: RANDOM FOREST CONFUSION MATRIX ---
cm = np.array([[72, 0], [3, 39]])
df_cm = pd.DataFrame(cm, index=["Actual Benign", "Actual Malignant"], columns=["Predicted Benign", "Predicted Malignant"])
df_cm.to_csv("experiments/results/figure_data/fig3_rf_confusion_matrix.csv")

fig, ax = plt.subplots(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", cbar=False, 
            xticklabels=["Benign (TN/FN)", "Malignant (FP/TP)"], 
            yticklabels=["Benign (TN/FP)", "Malignant (FN/TP)"], annot_kws={"size": 16})
ax.set_title("Random Forest Confusion Matrix (Test Set)")
ax.set_ylabel("True Clinical Status")
ax.set_xlabel("Predicted Clinical Status")
plt.tight_layout()
plt.savefig("experiments/results/figures/Fig3_RF_Confusion_Matrix.png", dpi=100)
plt.savefig("experiments/results/figures/Fig3_RF_Confusion_Matrix_HighRes.png", dpi=300)
plt.close()

# --- FIGURE 4: FIVE-FOLD CROSS-VALIDATION LINE PLOT ---
df_cv_folds = pd.DataFrame(cv_folds, index=["Fold 1", "Fold 2", "Fold 3", "Fold 4", "Fold 5"]) * 100
df_cv_folds.to_csv("experiments/results/figure_data/fig4_cv_folds.csv")

fig, ax = plt.subplots(figsize=(10, 6))
df_cv_folds.plot(kind='line', marker='o', lw=2, markersize=8, ax=ax)
ax.set_title("5-Fold Stratified Cross-Validation Accuracy Trajectory")
ax.set_ylabel("Accuracy (%)")
ax.set_xlabel("Cross-Validation Fold")
ax.set_ylim(92, 100)
plt.grid(True, linestyle='--', alpha=0.7)
plt.legend(title="Models")
plt.tight_layout()
plt.savefig("experiments/results/figures/Fig4_CV_LinePlot.png", dpi=100)
plt.savefig("experiments/results/figures/Fig4_CV_LinePlot_HighRes.png", dpi=300)
plt.close()

# --- FIGURE 5: CROSS-VALIDATION MEAN ± SD ---
df_cv_summary = pd.DataFrame(cv_summary).T * 100 # Convert mean to %
df_cv_summary['SD'] = df_cv_summary['SD'] / 100 * 100 # Keep SD in % scale
df_cv_summary.to_csv("experiments/results/figure_data/fig5_cv_summary.csv")

fig, ax = plt.subplots(figsize=(8, 6))
ax.bar(df_cv_summary.index, df_cv_summary['Mean'], yerr=df_cv_summary['SD'], 
       capsize=5, color=['#4C72B0', '#55A868', '#C44E52', '#8172B2'], edgecolor='black')
ax.set_title("Training Set 5-Fold CV: Mean Accuracy ± SD")
ax.set_ylabel("Mean Accuracy (%)")
ax.set_ylim(94, 100)
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig("experiments/results/figures/Fig5_CV_BarChart.png", dpi=100)
plt.savefig("experiments/results/figures/Fig5_CV_BarChart_HighRes.png", dpi=300)
plt.close()

print("SUCCESS: All figures and CSVs generated in experiments/results/figures/ and experiments/results/figure_data/")
