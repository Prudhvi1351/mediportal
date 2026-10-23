"""
nlp_parser.py module alias for 05_nlp_parser.py
"""
import importlib.util
import os

_script_path = os.path.join(os.path.dirname(__file__), "05_nlp_parser.py")
_spec = importlib.util.spec_from_file_location("05_nlp_parser", _script_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

extract_text_from_file = _mod.extract_text_from_file
clean_extracted_text = _mod.clean_extracted_text
