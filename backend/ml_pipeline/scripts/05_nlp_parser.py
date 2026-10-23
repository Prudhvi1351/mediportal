#!/usr/bin/env python3
"""
05_nlp_parser.py
Document parsing utility for medical reports.
Extracts raw clinical text from PDFs (via PyMuPDF) and images (via Tesseract/PIL).
"""
import os
import io
import re
from typing import Optional

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    from PIL import Image
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None


LAB_ROW_STARTERS = [
    r'^(?:iron-serum|serum iron)\b',
    r'^(?:total iron binding capacity|\(?tibc\)?)\b',
    r'^(?:transferrin saturation)\b',
    r'^(?:unsaturated iron binding capacity|\(?uibc\)?)\b',
    r'^(?:ferritin-serum|ferritin)\b',
    r'^(?:haemoglobin|hemoglobin|\(?hb\)?)\b',
    r'^(?:red blood cell|rbc)\b',
    r'^(?:packed cell volume|pcv)\b',
    r'^(?:mean corpuscular volume|mcv)\b',
    r'^(?:mean corpuscular hemoglobin concentration|mchc)\b',
    r'^(?:mean corpuscular hemoglobin|mch)\b',
    r'^(?:white blood cell count|wbc)\b',
    r'^(?:deferential leukocyte count|\(?dlc\)?)\b',
    r'^(?:neutrophils|lymphocytes|eosinophils|monocytes|basophils)\b',
    r'^(?:platelet|platelets)\b',
    r'^(?:interpretation|comments?)\b',
    r'^(?:test name|reference value|method)\b',
    r'^(?:cbc-complete blood count)\b',
    r'^(?:glucose|fasting blood sugar|hba1c)\b',
    r'^(?:creatinine|blood urea nitrogen|bun|uric acid|egfr)\b',
    r'^(?:sgot|ast|sgpt|alt|bilirubin|alkaline phosphatase)\b',
    r'^(?:total cholesterol|hdl|ldl|triglycerides|vldl)\b',
    r'^(?:tsh|free t3|free t4)\b'
]

def _is_lab_row_starter(line: str) -> bool:
    l_lower = line.strip().lower()
    return any(re.search(pat, l_lower) for pat in LAB_ROW_STARTERS)


def clean_extracted_text(text: str) -> str:
    """Normalize extracted text, preserve laboratory parameter rows on distinct lines, and clean whitespace."""
    if not text:
        return ""
    # Normalize unicode spaces and clean carriage returns
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Replace multiple spaces/tabs with a single space
    text = re.sub(r'[ \t]+', ' ', text)
    # Condense 3+ newlines to double newline (paragraphs)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Merge wrapped lines inside paragraphs, but preserve lab parameters and list items on their own line
    paragraphs = text.split('\n\n')
    cleaned_paras = []
    for p in paragraphs:
        lines = [line.strip() for line in p.split('\n') if line.strip()]
        if not lines:
            continue
        joined = lines[0]
        for next_line in lines[1:]:
            if (joined.endswith(('.', '!', '?', ':')) or 
                next_line.startswith(('-', '*', '•', '1.', '2.', '3.')) or
                _is_lab_row_starter(next_line)):
                joined += '\n' + next_line
            else:
                joined += ' ' + next_line
        cleaned_paras.append(joined)

    return '\n\n'.join(cleaned_paras).strip()



def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF (fitz) with pypdf and OCR fallbacks."""
    extracted_text = ""

    # 1. Primary: PyMuPDF (fitz)
    if fitz is not None:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            pages_text = []
            for page in doc:
                t = page.get_text("text")
                if t:
                    pages_text.append(t)
            doc.close()
            extracted_text = "\n".join(pages_text).strip()
        except Exception as e:
            print(f"[Warning] PyMuPDF extraction failed: {e}")

    # 2. Secondary fallback: pypdf
    if not extracted_text and pypdf is not None:
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            extracted_text = "\n".join(pages_text).strip()
        except Exception as e:
            print(f"[Warning] pypdf extraction fallback failed: {e}")

    # 3. Tertiary fallback for scanned PDFs without embedded text: PyMuPDF pixmap OCR
    if not extracted_text and fitz is not None and Image is not None and pytesseract is not None:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            ocr_pages = []
            for page in doc:
                pix = page.get_pixmap()
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                t = pytesseract.image_to_string(img)
                if t:
                    ocr_pages.append(t)
            doc.close()
            extracted_text = "\n".join(ocr_pages).strip()
        except Exception as e:
            print(f"[Warning] PDF OCR fallback failed: {e}")

    return clean_extracted_text(extracted_text)


def extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from image bytes using pytesseract and PIL."""
    if Image is None:
        raise ImportError("PIL (Pillow) is required for image text extraction.")

    try:
        img = Image.open(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Unable to parse image file: {e}")

    if pytesseract is None:
        return "[Warning: pytesseract not installed on server for OCR extraction]"

    try:
        raw_text = pytesseract.image_to_string(img)
        return clean_extracted_text(raw_text)
    except Exception as e:
        # If tesseract binary is not installed in the OS path
        print(f"[Warning] Tesseract OCR system binary unavailable: {e}")
        return f"[Image text extraction unavailable: {e}]"


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """
    Main entry point: Extracts text from PDFs, images, or plaintext clinical reports.
    """
    if not file_bytes:
        raise ValueError("File content is empty (0 bytes).")

    ext = os.path.splitext(filename.lower())[1]

    # Check for PDF extension or magic bytes (%PDF)
    if ext == ".pdf" or file_bytes.startswith(b"%PDF"):
        text = extract_text_from_pdf(file_bytes)
    elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"]:
        text = extract_text_from_image(file_bytes)
    else:
        # Fallback to text decoding
        try:
            text = file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode('latin-1')
            except Exception:
                # Try PDF extraction as last resort
                text = extract_text_from_pdf(file_bytes)

    cleaned = clean_extracted_text(text)
    if not cleaned:
        raise ValueError(f"Could not extract readable text from '{filename}'. Ensure the document contains text content.")

    return cleaned


if __name__ == "__main__":
    # Test with dummy in-memory PDF
    if fitz:
        test_doc = fitz.open()
        p = test_doc.new_page()
        p.insert_text((50, 72), "Patient John Doe. Previously diagnosed with Type 2 Diabetes. Current HbA1c is 8.5% due to poor diet. Recommend starting Metformin and low-carb diet.")
        sample_pdf = test_doc.tobytes()
        test_doc.close()

        res = extract_text_from_file(sample_pdf, "test_report.pdf")
        print("05_nlp_parser Test Result:")
        print(res)
