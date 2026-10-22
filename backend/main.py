from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os
import random
import time
import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from dotenv import load_dotenv
from web3 import Web3
from sqlalchemy.orm import Session
import json
import hashlib
import joblib
import numpy as np
import re
from datetime import datetime

from database import engine, Base, get_db
import models
import auth
import mailer

# Create tables
Base.metadata.create_all(bind=engine)

load_dotenv()

app = FastAPI(title="MediPortal Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

aes_key_env = os.getenv("AES_SECRET_KEY")
if not aes_key_env:
    raise RuntimeError("AES_SECRET_KEY environment variable is missing")
AES_KEY = aes_key_env.encode('utf-8')

# --- Web3 Setup ---
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
ehr_contract = None
try:
    with open("contract_address.txt", "r") as f:
        CONTRACT_ADDRESS = f.read().strip()
    with open("../contracts/artifacts/contracts/EHR_AccessControl.sol/EHR_AccessControl.json", "r") as f:
        CONTRACT_ABI = json.load(f)["abi"]
    if w3.is_connected():
        ehr_contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        print("Connected to Hardhat and EHR_AccessControl loaded.")
except Exception as e:
    print("Contract setup failed (deploy first):", e)

# --- Pinata Setup ---
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")

def upload_to_pinata(file_bytes, filename):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {
        "pinata_api_key": PINATA_API_KEY,
        "pinata_secret_api_key": PINATA_SECRET_API_KEY
    }
    files = {
        'file': (filename, file_bytes)
    }
    response = requests.post(url, files=files, headers=headers)
    if response.status_code == 200:
        return response.json()["IpfsHash"]
    else:
        print("Pinata Error:", response.text)
        raise HTTPException(status_code=500, detail="Failed to upload to IPFS via Pinata")

# --- Models ---
class PatientRegistrationRequest(BaseModel):
    full_name: str
    email: str
    password: str
    age: int
    dob: str
    gender: str
    blood_group: str
    address: str
    emergency_contact_1: str
    emergency_contact_2: str = None

class MLRequest(BaseModel):
    features: list
    model_name: str = "Random Forest"

class AnchorDiagnosisRequest(BaseModel):
    patient_id: str
    diagnosis: str
    probability: float
    diagnosis_hash: str

def generate_patient_id(full_name: str, dob_str: str) -> str:
    """
    Generate dynamic deterministic patient ID using formula:
    [FirstName_FirstLetter] + [DOB_Day] + [LastName_FirstLetter] + [DOB_Month] + [DOB_Year_Last2] + [FirstName_LastLetter]
    Example:
        Name: 'prudhvi am', DOB: '20-01-2005' -> 'P20A0105I'
    """
    cleaned_name = re.sub(r'[^a-zA-Z\s]', '', full_name.strip())
    words = [w for w in cleaned_name.split() if w]
    if not words:
        first_name = "PATIENT"
        last_name_initial = "X"
    elif len(words) == 1:
        first_name = words[0]
        last_name_initial = "X"
    else:
        first_name = words[0]
        last_name_initial = words[-1][0].upper()

    first_letter = first_name[0].upper() if first_name else "P"
    last_letter = first_name[-1].upper() if first_name else "T"

    day_str, month_str, year_str = "01", "01", "00"
    parsed_date = None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y", "%d %B %Y", "%d %b %Y", "%B %d %Y", "%b %d %Y"):
        try:
            parsed_date = datetime.strptime(dob_str.strip(), fmt)
            break
        except (ValueError, TypeError):
            continue

    if parsed_date:
        day_str = f"{parsed_date.day:02d}"
        month_str = f"{parsed_date.month:02d}"
        year_str = f"{parsed_date.year % 100:02d}"
    else:
        nums = re.findall(r'\d+', dob_str)
        if len(nums) >= 3:
            if len(nums[0]) == 4:
                year_str = f"{int(nums[0]) % 100:02d}"
                month_str = f"{int(nums[1]):02d}"
                day_str = f"{int(nums[2]):02d}"
            else:
                day_str = f"{int(nums[0]):02d}"
                month_str = f"{int(nums[1]):02d}"
                year_str = f"{int(nums[2]) % 100:02d}"

    return f"{first_letter}{day_str}{last_name_initial}{month_str}{year_str}{last_letter}"

# --- Patient Routes ---
@app.post("/api/v1/patient/register")
def register_patient(patient: PatientRegistrationRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if db.query(models.Patient).filter(models.Patient.email == patient.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(patient.password)

    # Dynamic deterministic Patient ID generation
    base_id = generate_patient_id(patient.full_name, patient.dob)
    patient_id = base_id
    counter = 1
    while db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first():
        patient_id = f"{base_id}-{counter}"
        counter += 1

    new_patient = models.Patient(
        patient_id=patient_id,
        full_name=patient.full_name,
        email=patient.email,
        password_hash=hashed_password,
        age=patient.age,
        dob=patient.dob,
        gender=patient.gender,
        blood_group=patient.blood_group,
        address=patient.address,
        emergency_contact_1=patient.emergency_contact_1,
        emergency_contact_2=patient.emergency_contact_2
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    
    wallet_address = w3.eth.accounts[new_patient.id % 10] if w3.is_connected() else ""
    new_patient.wallet_address = wallet_address
    db.commit()
    
    # Trigger patient onboarding email notification via background task
    patient_info = {
        "email": patient.email,
        "full_name": patient.full_name,
        "patient_id": patient_id,
        "dob": patient.dob,
        "age": patient.age,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "address": patient.address,
        "emergency_contact_1": patient.emergency_contact_1,
        "emergency_contact_2": patient.emergency_contact_2,
        "wallet_address": wallet_address
    }
    background_tasks.add_task(mailer.send_patient_registration_email, patient_info)

    # Issue access token immediately for automated auto-login routing
    access_token = auth.create_access_token(data={"sub": patient_id, "role": "PATIENT"})

    return {
        "patient_id": patient_id, 
        "access_token": access_token,
        "token_type": "bearer",
        "status": "registered", 
        "wallet_address": wallet_address,
        "full_name": patient.full_name
    }

@app.post("/api/v1/patient/login")
def login_patient(patient_id: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient or not auth.verify_password(password, patient.password_hash):
        raise HTTPException(status_code=401, detail="Invalid Credentials")
    
    access_token = auth.create_access_token(data={"sub": patient.patient_id, "role": "PATIENT"})
    return {"access_token": access_token, "token_type": "bearer", "patient_id": patient_id}

@app.post("/api/v1/ehr/upload")
async def upload_ehr(
    patient_id: str = Form(...), 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "PATIENT" or current_user.patient_id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload for this patient")

    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    raw_content = await file.read()
    cipher = AES.new(AES_KEY, AES.MODE_CBC)
    ciphertext = cipher.encrypt(pad(raw_content, AES.block_size))
    encrypted_payload = cipher.iv + ciphertext
    
    ipfs_cid = upload_to_pinata(encrypted_payload, file.filename)

    patient_wallet = patient.wallet_address
    if ehr_contract and patient_wallet and w3.is_connected():
        tx_hash = ehr_contract.functions.addRecord(ipfs_cid).transact({'from': patient_wallet})
        w3.eth.wait_for_transaction_receipt(tx_hash)

    timestamp_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    new_record = models.EHRRecord(
        patient_id=patient_id,
        filename=file.filename,
        ipfs_cid=ipfs_cid,
        encrypted_data=encrypted_payload.hex(),
        timestamp=timestamp_str
    )
    db.add(new_record)
    db.commit()

    return {"status": "success", "ipfs_cid": ipfs_cid}

@app.post("/api/v1/patient/{patient_id}/grant")
def grant_access(
    patient_id: str, 
    doctor_id: str = Form(...), 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "PATIENT" or current_user.patient_id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    doctor = db.query(models.Doctor).filter(models.Doctor.doctor_id == doctor_id).first()
    
    if not patient or not doctor:
        raise HTTPException(status_code=404, detail="Patient or Doctor not found")
        
    patient_wallet = patient.wallet_address
    doctor_wallet = doctor.wallet_address
    
    if ehr_contract and w3.is_connected() and patient_wallet and doctor_wallet:
        tx_hash = ehr_contract.functions.grantAccess(doctor_wallet).transact({'from': patient_wallet})
        w3.eth.wait_for_transaction_receipt(tx_hash)
        return {"status": "success", "message": f"Access granted to {doctor_id} on the blockchain"}
    else:
        raise HTTPException(status_code=500, detail="Blockchain not connected or wallet missing")

@app.post("/api/v1/access/break-glass")
def break_glass_access(
    patient_id: str = Form(...),
    proxy_phone_number: str = Form(...),
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "DOCTOR":
        raise HTTPException(status_code=403, detail="Only doctors can use emergency bypass")

    doctor = db.query(models.Doctor).filter(models.Doctor.doctor_id == current_user.doctor_id).first()
    if not doctor or doctor.status != 'VERIFIED':
        raise HTTPException(status_code=401, detail="Unauthorized")

    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if proxy_phone_number not in [patient.emergency_contact_1, patient.emergency_contact_2]:
        raise HTTPException(status_code=403, detail="Access Denied: Invalid Proxy Key")

    patient_wallet = patient.wallet_address
    doctor_wallet = doctor.wallet_address

    if ehr_contract and w3.is_connected() and patient_wallet and doctor_wallet:
        try:
            # Execute bypass using the system authenticator wallet (accounts[0])
            sys_auth_wallet = w3.eth.accounts[0]
            tx_hash = ehr_contract.functions.grantEmergencyAccess(patient_wallet, patient_id, doctor_wallet).transact({'from': sys_auth_wallet})
            w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Log audit trail
            timestamp_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            audit = models.EmergencyAudit(
                doctor_id=doctor.doctor_id,
                patient_id=patient.patient_id,
                proxy_number_used=proxy_phone_number,
                timestamp=timestamp_str
            )
            db.add(audit)
            db.commit()
            
            return {"status": "success", "message": "Emergency Access Granted"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        raise HTTPException(status_code=500, detail="Blockchain connection error")

# --- Doctor Registration & Admin Verification Routes ---
@app.post("/api/v1/doctor/register")
async def register_doctor(
    full_name: str = Form(...),
    specialty: str = Form(...),
    age: int = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    license_number: str = Form(...),
    license_file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    if db.query(models.Doctor).filter(models.Doctor.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    raw_content = await license_file.read()
    license_cid = upload_to_pinata(raw_content, license_file.filename)
    
    hashed_password = auth.get_password_hash(password)

    new_doctor = models.Doctor(
        full_name=full_name,
        specialty=specialty,
        age=age,
        email=email,
        phone=phone,
        password_hash=hashed_password,
        license_number=license_number,
        license_cid=license_cid,
        status="PENDING_ADMIN_APPROVAL"
    )
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)
    
    app_id = f"APP-{new_doctor.id:04d}"
    new_doctor.app_id = app_id
    db.commit()

    # Trigger doctor application received email notification
    doctor_info = {
        "email": email,
        "full_name": full_name,
        "app_id": app_id,
        "specialty": specialty,
        "license_number": license_number,
        "phone": phone
    }
    background_tasks.add_task(mailer.send_doctor_registration_email, doctor_info)
    
    return {"app_id": app_id, "status": "PENDING_ADMIN_APPROVAL"}

@app.get("/api/v1/admin/doctors")
def get_pending_doctors(db: Session = Depends(get_db)):
    pending = db.query(models.Doctor).filter(models.Doctor.status == "PENDING_ADMIN_APPROVAL").all()
    result = []
    for d in pending:
        result.append({
            "app_id": d.app_id,
            "full_name": d.full_name,
            "specialty": d.specialty,
            "age": d.age,
            "email": d.email,
            "phone": d.phone,
            "license_number": d.license_number,
            "license_cid": d.license_cid,
            "status": d.status
        })
    return {"pending_doctors": result}

@app.post("/api/v1/admin/doctors/{app_id}/approve")
def approve_doctor(app_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.app_id == app_id).first()
    if not doctor or doctor.status != "PENDING_ADMIN_APPROVAL":
        raise HTTPException(status_code=404, detail="Application not found or already processed")
    
    doctor_id = f"DOC-{random.randint(10000, 99999)}"
    wallet_address = w3.eth.accounts[10 + (doctor.id % 10)] if w3.is_connected() else ""
    
    doctor.doctor_id = doctor_id
    doctor.status = "VERIFIED"
    doctor.wallet_address = wallet_address
    db.commit()

    # Trigger doctor approval and credentials email notification
    doc_info = {
        "email": doctor.email,
        "full_name": doctor.full_name,
        "doctor_id": doctor_id,
        "specialty": doctor.specialty,
        "wallet_address": wallet_address
    }
    background_tasks.add_task(mailer.send_doctor_approval_email, doc_info)
    
    return {"doctor_id": doctor_id, "status": "VERIFIED", "wallet_address": wallet_address}

@app.post("/api/v1/doctor/login")
def login_doctor(doctor_id: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.doctor_id == doctor_id).first()
    if not doctor or not auth.verify_password(password, doctor.password_hash) or doctor.status != "VERIFIED":
        raise HTTPException(status_code=401, detail="Invalid Credentials or Not Verified")
    
    access_token = auth.create_access_token(data={"sub": doctor.doctor_id, "role": "DOCTOR"})

    profile = {
        "full_name": doctor.full_name,
        "specialty": doctor.specialty,
        "email": doctor.email,
        "phone": doctor.phone,
        "license_number": doctor.license_number
    }
    return {"access_token": access_token, "token_type": "bearer", "doctor_id": doctor_id, "status": "logged_in", "profile": profile}

# --- Doctor Data Access ---
@app.get("/api/v1/ehr/{patient_id}")
def retrieve_ehr(
    patient_id: str, 
    doctor_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if current_user.role != "DOCTOR" or current_user.doctor_id != doctor_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    doctor = db.query(models.Doctor).filter(models.Doctor.doctor_id == doctor_id).first()
    if not doctor or doctor.status != 'VERIFIED':
        raise HTTPException(status_code=401, detail="Unauthorized: Only VERIFIED doctors can access EHRs")
        
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    patient_wallet = patient.wallet_address
    doctor_wallet = doctor.wallet_address
    
    decrypted_records = []

    if ehr_contract and w3.is_connected() and patient_wallet and doctor_wallet:
        try:
            record_count = ehr_contract.functions.patientRecordCount(patient_wallet).call({'from': doctor_wallet})
            for i in range(record_count):
                cid, timestamp = ehr_contract.functions.getRecord(patient_wallet, i).call({'from': doctor_wallet})
                
                ipfs_url = f"https://gateway.pinata.cloud/ipfs/{cid}"
                try:
                    res = requests.get(ipfs_url, timeout=5)
                    if res.status_code == 200:
                        encrypted_payload = res.content
                    else:
                        raise Exception("Gateway failed")
                except:
                    rec_local = db.query(models.EHRRecord).filter(models.EHRRecord.ipfs_cid == cid).first()
                    if rec_local:
                        encrypted_payload = bytes.fromhex(rec_local.encrypted_data)
                    else:
                        continue
                        
                import base64
                iv = encrypted_payload[:16]
                cipher = AES.new(AES_KEY, AES.MODE_CBC, iv)
                decrypted_bytes = unpad(cipher.decrypt(encrypted_payload[16:]), AES.block_size)
                
                # Base64 encode the binary data instead of decoding it to a raw UTF-8 string with control characters
                decrypted_content = base64.b64encode(decrypted_bytes).decode('utf-8')
                
                rec_local = db.query(models.EHRRecord).filter(models.EHRRecord.ipfs_cid == cid).first()
                filename = rec_local.filename if rec_local else f"Record_{i}"
                
                decrypted_records.append({
                    "filename": filename,
                    "ipfs_cid": cid,
                    "content": decrypted_content,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(timestamp))
                })
        except Exception as e:
            if "Unauthorized" in str(e):
                raise HTTPException(status_code=403, detail="Unauthorized: You do not have access to this record on the blockchain")
            else:
                raise HTTPException(status_code=500, detail=str(e))
    else:
        raise HTTPException(status_code=500, detail="Blockchain connection not available")

    profile = {
        "full_name": patient.full_name,
        "email": patient.email,
        "age": patient.age,
        "dob": patient.dob,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "address": patient.address,
        "emergency_contact_1": patient.emergency_contact_1,
        "emergency_contact_2": patient.emergency_contact_2
    }

    return {
        "patient_id": patient_id, 
        "profile": profile,
        "records": decrypted_records
    }

# --- ML Prediction & Web3 Anchoring Endpoints ---
ml_models = {}
ml_scaler = None

def load_ml_assets():
    global ml_scaler, ml_models
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    scaler_path = os.path.join(models_dir, "scaler.pkl")
    if ml_scaler is None and os.path.exists(scaler_path):
        ml_scaler = joblib.load(scaler_path)
    
    if not ml_models:
        for m_name, f_name in [
            ("Random Forest", "rf.pkl"),
            ("Logistic Regression", "lr.pkl"),
            ("XGBoost", "xgb.pkl"),
            ("MLP", "mlp.pkl")
        ]:
            p = os.path.join(models_dir, f_name)
            if os.path.exists(p):
                ml_models[m_name] = joblib.load(p)

@app.post("/api/v1/ml/predict")
def predict_disease(request: MLRequest):
    load_ml_assets()
    if ml_scaler is None:
        raise HTTPException(status_code=500, detail="ML Scaler (scaler.pkl) not found on backend.")
    
    if len(request.features) != 30:
        raise HTTPException(status_code=400, detail=f"Invalid feature length: Expected 30 features, received {len(request.features)}")
    
    model = ml_models.get(request.model_name) or ml_models.get("Random Forest")
    if model is None:
        raise HTTPException(status_code=500, detail=f"Model '{request.model_name}' could not be loaded.")
        
    X_raw = np.array(request.features, dtype=float).reshape(1, -1)
    X_scaled = ml_scaler.transform(X_raw)
    
    pred_class = int(model.predict(X_scaled)[0])
    probs = model.predict_proba(X_scaled)[0]
    prob_malignant = float(probs[1]) if len(probs) > 1 else float(probs[0])
    
    diagnosis = "Malignant" if pred_class == 1 else "Benign"
    confidence = prob_malignant if pred_class == 1 else (1.0 - prob_malignant)
    
    payload_str = json.dumps({
        "features": [round(float(v), 6) for v in request.features],
        "diagnosis": diagnosis,
        "probability": round(prob_malignant, 6)
    }, sort_keys=True)
    diagnosis_hash = hashlib.sha256(payload_str.encode('utf-8')).hexdigest()
    
    return {
        "status": "success",
        "model": request.model_name,
        "prediction": diagnosis,
        "class_label": pred_class,
        "malignant_probability": round(prob_malignant, 4),
        "confidence": round(confidence, 4),
        "diagnosis_hash": diagnosis_hash
    }

@app.post("/api/v1/ml/anchor")
def anchor_diagnosis(request: AnchorDiagnosisRequest, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == request.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    patient_wallet = patient.wallet_address
    if not (ehr_contract and w3.is_connected() and patient_wallet):
        raise HTTPException(status_code=500, detail="Blockchain not connected or patient wallet missing")
        
    ipfs_cid = f"QmDiag_{request.diagnosis_hash[:32]}"
    tx_hash = ehr_contract.functions.addRecord(ipfs_cid).transact({'from': patient_wallet})
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    timestamp_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    new_record = models.EHRRecord(
        patient_id=request.patient_id,
        filename=f"AI_Diagnosis_{request.diagnosis}.json",
        ipfs_cid=ipfs_cid,
        encrypted_data=request.diagnosis_hash,
        timestamp=timestamp_str
    )
    db.add(new_record)
    db.commit()
    
    return {
        "status": "anchored",
        "patient_id": request.patient_id,
        "diagnosis": request.diagnosis,
        "ipfs_cid": ipfs_cid,
        "tx_hash": tx_hash.hex(),
        "block_number": receipt.blockNumber
    }

# --- Explainable AI (XAI) Diagnostic Prediction Endpoint ---
try:
    from ml_pipeline.scripts.inference_engine import predict_patient_risk
except ImportError:
    from backend.ml_pipeline.scripts.inference_engine import predict_patient_risk

@app.post("/api/predict")
@app.post("/api/v1/predict")
def predict_clinical_risk(
    payload: Dict[str, Any] = Body(...),
    current_user = Depends(auth.get_current_user)
):
    if getattr(current_user, "role", None) != "DOCTOR":
        raise HTTPException(
            status_code=403, 
            detail="Forbidden: Clinical Diagnostic AI is strictly restricted to authorized medical practitioners."
        )

    try:
        result = predict_patient_risk(payload)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference pipeline execution error: {str(e)}")

    if result.get("status") == "error" or result.get("anomaly_detected") is True:
        return JSONResponse(status_code=400, content=result)

    return result

