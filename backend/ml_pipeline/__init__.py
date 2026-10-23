"""
ml_pipeline package
Exposes predict_patient_risk for direct backend API imports.
"""
from .scripts.inference_engine import predict_patient_risk, get_ml_assets
from .scripts.nlp_parser import extract_text_from_file
from .scripts.llm_analyzer import analyze_medical_report

__all__ = ["predict_patient_risk", "get_ml_assets", "extract_text_from_file", "analyze_medical_report"]

