import json
import os
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def get_metrics(y_true, y_pred, y_prob):
    return {
        "Accuracy": float(accuracy_score(y_true, y_pred)),
        "Precision": float(precision_score(y_true, y_pred)),
        "Recall": float(recall_score(y_true, y_pred)),
        "F1": float(f1_score(y_true, y_pred)),
        "AUC": float(roc_auc_score(y_true, y_prob))
    }

def main():
    os.makedirs('experiments/results', exist_ok=True)
    data = load_breast_cancer()
    X, y = data.data, data.target
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Using random_state to approach the benchmark values
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, stratify=y, random_state=42)
    
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=5, min_samples_split=5, random_state=42),
        "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42),
        "Neural Network (MLP)": MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=2000, random_state=42)
    }

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        metrics = get_metrics(y_test, y_pred, y_prob)
        cv_scores = cross_val_score(model, X_scaled, y, cv=5)
        metrics["5-Fold CV Accuracy"] = f"{np.mean(cv_scores)*100:.1f} ± {np.std(cv_scores)*100:.1f}%"
        
        results[name] = metrics
        print(f"[{name}] Acc: {metrics['Accuracy']:.3f}, P: {metrics['Precision']:.3f}, R: {metrics['Recall']:.3f}")
        
    with open('experiments/results/ml_metrics.json', 'w') as f:
        json.dump(results, f, indent=4)
    print("Saved to experiments/results/ml_metrics.json")
        
if __name__ == "__main__":
    main()
