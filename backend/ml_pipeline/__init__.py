"""
ml_pipeline package
Exposes predict_patient_risk for direct backend API imports.
"""
from .scripts.inference_engine import predict_patient_risk, get_ml_assets

__all__ = ["predict_patient_risk", "get_ml_assets"]
