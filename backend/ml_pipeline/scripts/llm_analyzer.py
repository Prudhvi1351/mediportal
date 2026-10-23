"""
llm_analyzer.py module alias for 06_llm_analyzer.py
"""
import importlib.util
import os

_script_path = os.path.join(os.path.dirname(__file__), "06_llm_analyzer.py")
_spec = importlib.util.spec_from_file_location("06_llm_analyzer", _script_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

analyze_medical_report = _mod.analyze_medical_report
