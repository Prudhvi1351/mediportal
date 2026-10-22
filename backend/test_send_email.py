import os
import sys
from dotenv import load_dotenv

load_dotenv(override=True)

import mailer

recipient = sys.argv[1] if len(sys.argv) > 1 else "srichandralekhaagasti@gmail.com"

print("=" * 60)
print("MediPortal SMTP Dispatch Test Utility")
print("=" * 60)

host, port, sender_email, password, sender_name = mailer.get_smtp_config()

print(f"SMTP Host:     {host}")
print(f"SMTP Port:     {port}")
print(f"Sender Email:  {sender_email or '[NOT SET IN backend/.env]'}")
print(f"Sender Pass:   {'*' * len(password) if password else '[NOT SET IN backend/.env]'}")
print(f"Recipient:     {recipient}")
print("-" * 60)

if not sender_email or not password:
    print("\n[ERROR] Cannot send email because SMTP credentials are missing!")
    print("Please add the following lines to backend/.env:")
    print("--------------------------------------------------")
    print(f"SMTP_EMAIL={recipient}")
    print("SMTP_PASSWORD=your_16_char_google_app_password")
    print("--------------------------------------------------")
    print("Note: To generate a Google App Password:")
    print("1. Go to https://myaccount.google.com/security")
    print("2. Enable 2-Step Verification")
    print("3. Search for 'App passwords', name it 'MediPortal', and copy the 16-char code.\n")
    sys.exit(1)

sample_patient = {
    "email": recipient,
    "full_name": "Sri Chandralekha Agasti",
    "patient_id": "S20A0105I",
    "dob": "2005-01-20",
    "age": 21,
    "gender": "Female",
    "blood_group": "O+",
    "address": "Bangalore, Karnataka, India",
    "emergency_contact_1": "+91-9876543210",
    "emergency_contact_2": "+91-9123456780",
    "wallet_address": "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
}

print(f"Attempting to dispatch test email to {recipient} via {host}:{port}...")
success, msg = mailer.send_patient_registration_email(sample_patient)

if success:
    print(f"\n[SUCCESS] Email successfully sent to {recipient}!")
    print("Please check your Gmail inbox (and Spam/Promotions folder).")
else:
    print(f"\n[FAILURE] SMTP Error: {msg}")
    print("\nTroubleshooting tips:")
    print("1. If you see 'Username and Password not accepted', make sure you are using a 16-character Google App Password, NOT your regular Gmail account login password.")
    print("2. Make sure 2-Step Verification is active on the sender Google Account.")
