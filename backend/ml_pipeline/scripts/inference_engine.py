"""
inference_engine.py
Direct Python import alias for 04_inference_engine.py.
Allows: from ml_pipeline.scripts.inference_engine import predict_patient_risk
"""
import importlib.util
import os

_script_dir = os.path.dirname(os.path.abspath(__file__))
_target_path = os.path.join(_script_dir, "04_inference_engine.py")

_spec = importlib.util.spec_from_file_location("inference_engine_mod", _target_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

predict_patient_risk = _mod.predict_patient_risk
get_ml_assets = _mod.get_ml_assets
