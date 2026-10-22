#!/usr/bin/env python3
"""
03_train_models.py
Train Core Diagnostic Models & Unsupervised Anomaly Detection.
- Random Forest Classifier (General Robust Diagnostic)
- XGBoost Classifier (High-Accuracy Ensemble)
- Isolation Forest (Unsupervised Anomaly Detector on Normal Distribution)
"""
import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, classification_report
)

def train_and_evaluate_models():
    print("=" * 60)
    print("Step 3: Core Model Training & Anomaly Detection")
    print("=" * 60)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_root = os.path.abspath(os.path.join(script_dir, ".."))
    data_dir = os.path.join(ml_root, "data")
    models_dir = os.path.join(ml_root, "models")
    os.makedirs(models_dir, exist_ok=True)

    # 1. Load scaled training and testing data
    X_train_scaled = pd.read_csv(os.path.join(data_dir, "X_train_scaled.csv")).values
    X_test_scaled = pd.read_csv(os.path.join(data_dir, "X_test_scaled.csv")).values
    y_train = pd.read_csv(os.path.join(data_dir, "y_train.csv")).values.ravel()
    y_test = pd.read_csv(os.path.join(data_dir, "y_test.csv")).values.ravel()

    print(f"Loaded training data: {X_train_scaled.shape[0]} samples, {X_train_scaled.shape[1]} features")
    print(f"Loaded test data:     {X_test_scaled.shape[0]} samples")

    # -------------------------------------------------------------
    # Model 1: Random Forest Classifier
    # -------------------------------------------------------------
    print("\n[1/3] Training Random Forest Classifier...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train_scaled, y_train)

    rf_preds = rf_model.predict(X_test_scaled)
    rf_probs = rf_model.predict_proba(X_test_scaled)[:, 1]

    rf_metrics = {
        "Accuracy": float(accuracy_score(y_test, rf_preds)),
        "Precision": float(precision_score(y_test, rf_preds)),
        "Recall": float(recall_score(y_test, rf_preds)),
        "F1-Score": float(f1_score(y_test, rf_preds)),
        "ROC-AUC": float(roc_auc_score(y_test, rf_probs))
    }

    # -------------------------------------------------------------
    # Model 2: XGBoost Classifier
    # -------------------------------------------------------------
    print("[2/3] Training XGBoost Classifier...")
    xgb_model = XGBClassifier(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=4,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1
    )
    xgb_model.fit(X_train_scaled, y_train)

    xgb_preds = xgb_model.predict(X_test_scaled)
    xgb_probs = xgb_model.predict_proba(X_test_scaled)[:, 1]

    xgb_metrics = {
        "Accuracy": float(accuracy_score(y_test, xgb_preds)),
        "Precision": float(precision_score(y_test, xgb_preds)),
        "Recall": float(recall_score(y_test, xgb_preds)),
        "F1-Score": float(f1_score(y_test, xgb_preds)),
        "ROC-AUC": float(roc_auc_score(y_test, xgb_probs))
    }

    # -------------------------------------------------------------
    # Model 3: Isolation Forest Anomaly Detector
    # Trained on the clean training distribution (genuine clinical data)
    # -------------------------------------------------------------
    print("[3/3] Training Isolation Forest on Normal Clinical Training Distribution...")
    print(f"Normal training baseline samples: {X_train_scaled.shape[0]}")

    iso_forest = IsolationForest(
        n_estimators=150,
        contamination=0.03,
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_train_scaled)

    # Sanity test anomaly detector on test set
    inlier_preds = iso_forest.predict(X_test_scaled)
    normal_inlier_ratio = np.mean(inlier_preds == 1) * 100
    print(f"Test clinical inlier acceptance rate: {normal_inlier_ratio:.1f}%")

    # -------------------------------------------------------------
    # Terminal Metrics Output Table
    # -------------------------------------------------------------
    print("\n" + "=" * 65)
    print(f"{'EVALUATION METRIC':<20} | {'RANDOM FOREST':<18} | {'XGBOOST':<18}")
    print("-" * 65)
    for m in ["Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC"]:
        print(f"{m:<20} | {rf_metrics[m]:<18.4f} | {xgb_metrics[m]:<18.4f}")
    print("=" * 65)

    # -------------------------------------------------------------
    # Serialization
    # -------------------------------------------------------------
    rf_path = os.path.join(models_dir, "rf_model.pkl")
    xgb_path = os.path.join(models_dir, "xgb_model.pkl")
    iso_path = os.path.join(models_dir, "isolation_forest.pkl")
    metrics_path = os.path.join(models_dir, "model_metrics.json")

    joblib.dump(rf_model, rf_path)
    joblib.dump(xgb_model, xgb_path)
    joblib.dump(iso_forest, iso_path)

    all_metrics = {
        "random_forest": rf_metrics,
        "xgboost": xgb_metrics,
        "isolation_forest": {
            "trained_samples": int(X_train_scaled.shape[0]),
            "normal_inlier_acceptance_rate": float(normal_inlier_ratio)
        }
    }
    with open(metrics_path, "w") as f:
        json.dump(all_metrics, f, indent=2)

    print(f"\nModels successfully serialized to {models_dir}:")
    print(f"  - {rf_path}")
    print(f"  - {xgb_path}")
    print(f"  - {iso_path}")
    print(f"  - {metrics_path}")
    print("Step 3 Complete.\n")

if __name__ == "__main__":
    train_and_evaluate_models()
