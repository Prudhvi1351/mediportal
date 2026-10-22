from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(String(50), unique=True, index=True, nullable=True) # e.g. PAT-0001
    full_name = Column(String(255))
    email = Column(String(255), unique=True, index=True)
    password_hash = Column(String(255))
    age = Column(Integer)
    dob = Column(String(50))
    gender = Column(String(20))
    blood_group = Column(String(10))
    address = Column(Text)
    emergency_contact_1 = Column(String(255))
    emergency_contact_2 = Column(String(255), nullable=True)
    wallet_address = Column(String(255))
    
    records = relationship("EHRRecord", back_populates="patient")

class EmergencyAudit(Base):
    __tablename__ = "emergency_audits"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(String(50), index=True)
    patient_id = Column(String(50), index=True)
    proxy_number_used = Column(String(255))
    timestamp = Column(String(100))

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doctor_id = Column(String(50), unique=True, index=True, nullable=True) # DOC-12345
    app_id = Column(String(50), unique=True, index=True) # APP-0001
    full_name = Column(String(255))
    specialty = Column(String(255))
    age = Column(Integer)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(50))
    password_hash = Column(String(255))
    license_number = Column(String(255))
    license_cid = Column(String(255))
    status = Column(String(50)) # PENDING_ADMIN_APPROVAL or VERIFIED
    wallet_address = Column(String(255))

class EHRRecord(Base):
    __tablename__ = "ehr_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"))
    filename = Column(String(255))
    ipfs_cid = Column(String(255))
    from sqlalchemy.dialects.mysql import LONGTEXT
    encrypted_data = Column(LONGTEXT)
    timestamp = Column(String(100))

    patient = relationship("Patient", back_populates="records")
