#!/usr/bin/env python3
"""
01_fetch_data.py
Automated Acquisition of the Breast Cancer Wisconsin (Diagnostic) Dataset.
"""
import os
from sklearn.datasets import load_breast_cancer
import pandas as pd

def fetch_and_save_data():
    print("=" * 60)
    print("Step 1: Automated Dataset Acquisition")
    print("=" * 60)

    # Resolve paths relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_root = os.path.abspath(os.path.join(script_dir, ".."))
    data_dir = os.path.join(ml_root, "data")
    os.makedirs(data_dir, exist_ok=True)
    raw_csv_path = os.path.join(data_dir, "breast_cancer_raw.csv")

    print("Fetching Breast Cancer Wisconsin (Diagnostic) dataset from sklearn...")
    dataset = load_breast_cancer(as_frame=True)
    df = dataset.frame.copy()

    print(f"Dataset successfully fetched! Shape: {df.shape} (Rows: {df.shape[0]}, Columns: {df.shape[1]})")
    print(f"Features: {len(dataset.feature_names)} features")
    print(f"Target distribution:\n{df['target'].value_counts().to_dict()} (0: Malignant, 1: Benign)")

    # Save to CSV
    df.to_csv(raw_csv_path, index=False)
    print(f"Raw DataFrame successfully saved to: {raw_csv_path}")
    print("Step 1 Complete.\n")

if __name__ == "__main__":
    fetch_and_save_data()
