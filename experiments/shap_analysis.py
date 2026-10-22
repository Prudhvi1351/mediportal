import json
import os
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler

def main():
    os.makedirs('experiments/results', exist_ok=True)
    data = load_breast_cancer()
    X, y = data.data, data.target
    feature_names = data.feature_names
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, stratify=y, random_state=42)
    
    # Train an XGBoost model
    model = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)
    model.fit(X_train, y_train)
    
    import xgboost as xgb
    dtest = xgb.DMatrix(X_test, feature_names=list(feature_names))
    
    # Extract SHAP values using XGBoost's native pred_contribs
    shap_values_raw = model.get_booster().predict(dtest, pred_contribs=True)
    
    # The last column is the bias (expected value)
    shap_values = shap_values_raw[:, :-1]
    
    mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
    
    sorted_idx = np.argsort(mean_abs_shap)[::-1]
    top_10_idx = sorted_idx[:10]
    
    top_10_features = []
    for idx in top_10_idx:
        top_10_features.append({
            "feature": feature_names[idx],
            "mean_abs_shap": float(mean_abs_shap[idx])
        })
        
    with open('experiments/results/shap_rankings.json', 'w') as f:
        json.dump({"top_10_features": top_10_features}, f, indent=4)
        
    # Generate a fallback bar chart to replace shap.summary_plot
    plt.figure(figsize=(10, 6))
    features = [f['feature'] for f in top_10_features]
    values = [f['mean_abs_shap'] for f in top_10_features]
    
    plt.barh(features[::-1], values[::-1], color='dodgerblue')
    plt.xlabel('mean(|SHAP value|) (average impact on model output magnitude)')
    plt.title('Top 10 Features (XGBoost Native SHAP)')
    plt.tight_layout()
    plt.savefig('experiments/results/shap_summary.png', bbox_inches='tight')
    plt.close()
    
    print("Saved to experiments/results/shap_rankings.json and shap_summary.png")

if __name__ == "__main__":
    main()
