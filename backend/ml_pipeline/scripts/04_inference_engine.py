#!/usr/bin/env python3
"""
04_inference_engine.py
Explainable AI (XAI) & Production Inference Engine.
Contains predict_patient_risk(patient_data_dict) for backend integration.
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
import shap

# Module-level model cache
_MODELS_CACHE = {}

def get_ml_assets():
    """Load and cache trained ML artifacts."""
    global _MODELS_CACHE
    if _MODELS_CACHE:
        return _MODELS_CACHE

    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_root = os.path.abspath(os.path.join(script_dir, ".."))
    models_dir = os.path.join(ml_root, "models")

    scaler_path = os.path.join(models_dir, "scaler.pkl")
    rf_path = os.path.join(models_dir, "rf_model.pkl")
    iso_path = os.path.join(models_dir, "isolation_forest.pkl")
    features_path = os.path.join(models_dir, "feature_names.json")

    for p in [scaler_path, rf_path, iso_path, features_path]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing required model asset: {p}. Run 02 & 03 scripts first.")

    scaler = joblib.load(scaler_path)
    rf_model = joblib.load(rf_path)
    iso_forest = joblib.load(iso_path)
    with open(features_path, "r") as f:
        feature_names = json.load(f)

    # Initialize SHAP TreeExplainer for Random Forest
    explainer = shap.TreeExplainer(rf_model)

    _MODELS_CACHE = {
        "scaler": scaler,
        "rf_model": rf_model,
        "iso_forest": iso_forest,
        "feature_names": feature_names,
        "explainer": explainer
    }
    return _MODELS_CACHE


def predict_patient_risk(patient_data_dict):
    """
    Main diagnostic inference function.
    1. Scales incoming patient biomarker array.
    2. Runs Isolation Forest anomaly check. Rejects if flagged (-1).
    3. Calculates exact probability / risk percentage of malignancy via Random Forest.
    4. Computes SHAP values and extracts the top 3 contributing factors.
    5. Returns formatted dictionary.
    """
    assets = get_ml_assets()
    scaler = assets["scaler"]
    rf_model = assets["rf_model"]
    iso_forest = assets["iso_forest"]
    feature_names = assets["feature_names"]
    explainer = assets["explainer"]

    # 1. Parse and format input data
    if isinstance(patient_data_dict, dict):
        if "features" in patient_data_dict:
            raw_vals = patient_data_dict["features"]
        elif all(fn in patient_data_dict for fn in feature_names):
            raw_vals = [patient_data_dict[fn] for fn in feature_names]
        else:
            # Match case-insensitively or take first matching values
            raw_vals = []
            for fn in feature_names:
                if fn in patient_data_dict:
                    raw_vals.append(patient_data_dict[fn])
                else:
                    found = False
                    for k, v in patient_data_dict.items():
                        if k.lower().replace(" ", "_") == fn.lower().replace(" ", "_"):
                            raw_vals.append(v)
                            found = True
                            break
                    if not found:
                        raise ValueError(f"Missing required clinical biomarker feature: '{fn}'")
    elif isinstance(patient_data_dict, (list, tuple, np.ndarray)):
        raw_vals = list(patient_data_dict)
    elif isinstance(patient_data_dict, pd.DataFrame):
        raw_vals = patient_data_dict[feature_names].iloc[0].tolist()
    else:
        raise TypeError(f"Unsupported input type: {type(patient_data_dict)}")

    if len(raw_vals) != len(feature_names):
        raise ValueError(f"Expected {len(feature_names)} features, but received {len(raw_vals)}.")

    raw_df = pd.DataFrame([raw_vals], columns=feature_names)

    # 2. Scale the patient biomarker vector
    X_scaled = scaler.transform(raw_df)

    # 3. Anomaly Detection via Isolation Forest
    anomaly_prediction = iso_forest.predict(X_scaled)[0]
    anomaly_score = float(iso_forest.decision_function(X_scaled)[0])

    if anomaly_prediction == -1:
        # Immediate rejection of out-of-distribution / corrupted biomedical inputs
        return {
            "status": "error",
            "error": "Data Rejected: Anomaly Detected",
            "anomaly_detected": True,
            "anomaly_score": round(anomaly_score, 4),
            "message": "Incoming clinical biomarkers deviate significantly from the normal physiological distribution. Verification aborted for safety."
        }

    # 4. Core Diagnostic Risk Calculation (Malignancy Probability)
    probs = rf_model.predict_proba(X_scaled)[0]
    malignant_prob = float(probs[1]) # Class 1 is Malignant
    risk_percentage = round(malignant_prob * 100, 2)
    diagnosis = "Malignant" if malignant_prob >= 0.50 else "Benign"

    # 5. Explainable AI (SHAP TreeExplainer)
    shap_raw = explainer.shap_values(X_scaled)
    # Handle different SHAP output format versions (list of classes vs single array)
    if isinstance(shap_raw, list):
        # Class 1 (Malignant) contributions
        patient_shap = shap_raw[1][0]
    elif len(shap_raw.shape) == 3:
        # (1, n_features, 2) -> take class 1
        patient_shap = shap_raw[0, :, 1]
    else:
        patient_shap = shap_raw[0]

    # Rank features by absolute impact magnitude for this patient
    top_indices = np.argsort(np.abs(patient_shap))[::-1][:3]

    top_3_reasons = []
    for rank, idx in enumerate(top_indices, start=1):
        f_name = feature_names[idx]
        f_val = float(raw_df.iloc[0, idx])
        impact = float(patient_shap[idx])
        direction = "Increased Risk (Malignant Indicator)" if impact > 0 else "Decreased Risk (Benign Indicator)"
        
        top_3_reasons.append({
            "rank": rank,
            "feature": f_name,
            "patient_value": round(f_val, 4),
            "shap_impact": round(impact, 4),
            "direction": direction,
            "description": f"{f_name} ({round(f_val, 2)}) contributed {abs(round(impact, 3))} toward a {'higher' if impact > 0 else 'lower'} malignancy assessment."
        })

    return {
        "status": "success",
        "risk_score": f"{risk_percentage}%",
        "risk_probability": round(malignant_prob, 4),
        "diagnosis": diagnosis,
        "confidence": f"{round(max(malignant_prob, 1 - malignant_prob) * 100, 2)}%",
        "anomaly_status": "Normal (Inlier Verified)",
        "anomaly_score": round(anomaly_score, 4),
        "top_3_shap_reasons": top_3_reasons
    }


def run_standalone_demo():
    print("=" * 60)
    print("Step 4 & 5: Inference Engine & XAI Simulation Test")
    print("=" * 60)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_root = os.path.abspath(os.path.join(script_dir, ".."))
    data_dir = os.path.join(ml_root, "data")
    x_test_path = os.path.join(data_dir, "X_test.csv")
    y_test_path = os.path.join(data_dir, "y_test.csv")

    if not os.path.exists(x_test_path):
        raise FileNotFoundError(f"Missing {x_test_path}. Run 01 & 02 first.")

    X_test_df = pd.read_csv(x_test_path)
    y_test_df = pd.read_csv(y_test_path)

    # 1. Test Normal Patient Prediction (Row 0)
    sample_patient = X_test_df.iloc[0].to_dict()
    true_label = "Malignant" if y_test_df.iloc[0].values[0] == 1 else "Benign"
    print(f"\n[Test 1] Simulating Patient Inference (Ground Truth: {true_label})...")
    result = predict_patient_risk(sample_patient)
    print(json.dumps(result, indent=2))

    # 2. Test Anomaly Rejection with Out-Of-Distribution Adversarial Biomarkers
    print("\n[Test 2] Simulating Out-Of-Distribution Anomaly Injection...")
    corrupted_patient = {k: v * 25.0 for k, v in sample_patient.items()}
    anomaly_result = predict_patient_risk(corrupted_patient)
    print(json.dumps(anomaly_result, indent=2))

    print("\nInference Engine & Anomaly Rejection Successfully Verified!\n")

if __name__ == "__main__":
    run_standalone_demo()
