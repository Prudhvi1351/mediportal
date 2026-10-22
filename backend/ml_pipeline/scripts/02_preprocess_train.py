#!/usr/bin/env python3
"""
02_preprocess_train.py
Preprocessing and Scaler Pipeline Creation.
80/20 Stratified split with MinMaxScaler serialization.
"""
import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler

def preprocess_and_split():
    print("=" * 60)
    print("Step 2: Preprocessing & Scaler Pipeline Creation")
    print("=" * 60)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_root = os.path.abspath(os.path.join(script_dir, ".."))
    data_dir = os.path.join(ml_root, "data")
    models_dir = os.path.join(ml_root, "models")
    os.makedirs(models_dir, exist_ok=True)

    raw_csv_path = os.path.join(data_dir, "breast_cancer_raw.csv")
    if not os.path.exists(raw_csv_path):
        raise FileNotFoundError(f"Missing {raw_csv_path}. Please run 01_fetch_data.py first.")

    print(f"Loading raw dataset from {raw_csv_path}...")
    df = pd.read_csv(raw_csv_path)

    # In sklearn load_breast_cancer, 0 is malignant and 1 is benign.
    # We map 1 = Malignant (Positive Cancer Class), 0 = Benign (Negative/Normal)
    # so model probability predict_proba()[:, 1] directly represents Malignancy Risk.
    if "target" in df.columns:
        X = df.drop(columns=["target"])
        # Map: original 0 (malignant) -> 1, original 1 (benign) -> 0
        y = (df["target"] == 0).astype(int)
    else:
        raise ValueError("Column 'target' not found in dataset.")

    feature_names = list(X.columns)
    print(f"Total samples: {len(X)}, Feature count: {len(feature_names)}")
    print(f"Class distribution: {np.bincount(y)} (0: Benign, 1: Malignant)")

    # 80/20 Stratified train-test split
    print("\nExecuting 80/20 Stratified Train-Test Split (random_state=42)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Test set:     {X_test.shape[0]} samples")

    # Fit MinMaxScaler strictly on X_train to prevent data leakage
    print("\nFitting MinMaxScaler on training data...")
    scaler = MinMaxScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Convert back to DataFrame for clean saving
    df_X_train_scaled = pd.DataFrame(X_train_scaled, columns=feature_names)
    df_X_test_scaled = pd.DataFrame(X_test_scaled, columns=feature_names)

    # Serialize and save scaler
    scaler_path = os.path.join(models_dir, "scaler.pkl")
    joblib.dump(scaler, scaler_path)
    print(f"Fitted MinMaxScaler serialized and saved to: {scaler_path}")

    # Save feature names for inference verification
    features_path = os.path.join(models_dir, "feature_names.json")
    with open(features_path, "w") as f:
        json.dump(feature_names, f, indent=2)
    print(f"Feature names saved to: {features_path}")

    # Save processed splits
    df_X_train_scaled.to_csv(os.path.join(data_dir, "X_train_scaled.csv"), index=False)
    df_X_test_scaled.to_csv(os.path.join(data_dir, "X_test_scaled.csv"), index=False)
    X_train.to_csv(os.path.join(data_dir, "X_train.csv"), index=False)
    X_test.to_csv(os.path.join(data_dir, "X_test.csv"), index=False)
    y_train.to_csv(os.path.join(data_dir, "y_train.csv"), index=False)
    y_test.to_csv(os.path.join(data_dir, "y_test.csv"), index=False)
    print(f"Scaled splits saved to {data_dir}")
    print("Step 2 Complete.\n")

if __name__ == "__main__":
    preprocess_and_split()
