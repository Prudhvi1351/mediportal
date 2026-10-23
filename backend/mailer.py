import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple

from dotenv import load_dotenv

logger = logging.getLogger("mediportal.mailer")
logging.basicConfig(level=logging.INFO)

def get_smtp_config():
    # Reload from .env if present so dynamic edits take effect immediately
    load_dotenv(override=True)
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except (ValueError, TypeError):
        port = 587
    email = os.getenv("SMTP_EMAIL", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    sender_name = os.getenv("SMTP_SENDER_NAME", "MediPortal Network")
    return host, port, email, password, sender_name

def is_smtp_configured() -> bool:
    """Check if SMTP credentials are configured in the environment."""
    _, _, email, password, _ = get_smtp_config()
    return bool(email and password)

def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> Tuple[bool, str]:
    """
    Send an email via SMTP.
    Returns (True, "Success") or (False, error_message).
    Gracefully logs and returns failure if SMTP is unconfigured or encounters an error.
    """
    smtp_host, smtp_port, smtp_email, smtp_password, sender_name = get_smtp_config()

    if not is_smtp_configured():
        msg = f"[Mailer] SMTP credentials not configured (SMTP_EMAIL / SMTP_PASSWORD in backend/.env). Skipped sending email to: {to_email}"
        logger.warning(msg)
        return False, msg

    if not to_email or "@" not in to_email:
        msg = f"[Mailer] Invalid recipient email address: {to_email}"
        logger.warning(msg)
        return False, msg

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{smtp_email}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)

        logger.info(f"[Mailer] Successfully delivered email to: {to_email} (Subject: '{subject}')")
        return True, "Email sent successfully"
    except Exception as e:
        err_msg = f"[Mailer] Failed to send email to {to_email}: {str(e)}"
        logger.error(err_msg)
        return False, err_msg


def send_patient_registration_email(patient_info: dict) -> Tuple[bool, str]:
    """
    Send patient onboarding email with generated Patient ID and registration summary.
    """
    to_email = patient_info.get("email", "")
    full_name = patient_info.get("full_name", "Valued Patient")
    patient_id = patient_info.get("patient_id", "N/A")
    dob = patient_info.get("dob", "N/A")
    age = patient_info.get("age", "N/A")
    gender = patient_info.get("gender", "N/A")
    blood_group = patient_info.get("blood_group", "N/A")
    address = patient_info.get("address", "N/A")
    contact1 = patient_info.get("emergency_contact_1", "N/A")
    contact2 = patient_info.get("emergency_contact_2", "N/A")
    wallet = patient_info.get("wallet_address", "Assigned on Genesis Block")

    subject = f"Welcome to MediPortal - Your Patient ID: {patient_id}"

    text_body = f"""Hello {full_name},

Welcome to MediPortal Secure Decentralized Network!
Your patient registration has been processed successfully.

--- REGISTRATION SUMMARY ---
Patient ID: {patient_id}
Full Name: {full_name}
Date of Birth: {dob}
Age: {age}
Gender: {gender}
Blood Group: {blood_group}
Emergency Contact 1: {contact1}
Emergency Contact 2: {contact2}
Address: {address}
Blockchain Wallet: {wallet}

You can log in to your dashboard anytime using your Patient ID ({patient_id}) and password.

Best regards,
MediPortal Health & Security Administration
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b14; color: #e2e8f0; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #0c1222; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
        .header {{ background: linear-gradient(135deg, #0b1f3a, #0c1222); padding: 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; }}
        .logo {{ color: #00f2fe; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }}
        .badge {{ display: inline-block; background: rgba(0,242,254,0.12); color: #00f2fe; border: 1px solid rgba(0,242,254,0.3); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }}
        .content {{ padding: 32px 24px; }}
        .id-box {{ background: #131b2e; border: 1px dashed #00f2fe; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }}
        .id-label {{ font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }}
        .id-value {{ font-size: 28px; font-weight: 900; color: #00f2fe; font-family: monospace; letter-spacing: 2px; margin-top: 6px; }}
        .details-table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
        .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #1e293b; font-size: 14px; }}
        .label-col {{ color: #94a3b8; width: 40%; font-weight: 500; }}
        .value-col {{ color: #f8fafc; font-weight: 600; }}
        .footer {{ background: #070b14; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #00f2fe, #4facfe); color: #070b14 !important; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; margin-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">MEDIPORTAL</h1>
          <div class="badge">Decentralized Patient Onboarding</div>
        </div>
        <div class="content">
          <h2 style="color: #ffffff; margin-top: 0;">Welcome, {full_name}!</h2>
          <p style="color: #94a3b8; line-height: 1.6;">
            Your registration on the MediPortal Secure Decentralized Network has been confirmed. Your account is now active with role-based cryptographic access.
          </p>

          <div class="id-box">
            <div class="id-label">Assigned Deterministic Patient ID</div>
            <div class="id-value">{patient_id}</div>
          </div>

          <h3 style="color: #cbd5e1; font-size: 16px; margin-bottom: 8px;">Registration Summary</h3>
          <table class="details-table">
            <tr><td class="label-col">Full Name</td><td class="value-col">{full_name}</td></tr>
            <tr><td class="label-col">Date of Birth</td><td class="value-col">{dob}</td></tr>
            <tr><td class="label-col">Calculated Age</td><td class="value-col">{age} years</td></tr>
            <tr><td class="label-col">Gender</td><td class="value-col">{gender}</td></tr>
            <tr><td class="label-col">Blood Group</td><td class="value-col">{blood_group}</td></tr>
            <tr><td class="label-col">Proxy Contact 1</td><td class="value-col">{contact1}</td></tr>
            <tr><td class="label-col">Proxy Contact 2</td><td class="value-col">{contact2}</td></tr>
            <tr><td class="label-col">Address</td><td class="value-col">{address}</td></tr>
            <tr><td class="label-col">Blockchain Wallet</td><td class="value-col" style="font-family: monospace; font-size: 12px; color: #38bdf8;">{wallet}</td></tr>
          </table>

          <div style="text-align: center; margin-top: 28px;">
            <a href="http://localhost:3000" class="button">Access Patient Dashboard</a>
          </div>
        </div>
        <div class="footer">
          &copy; 2026 MediPortal Decentralized Healthcare Network. All medical records encrypted via AES-256 and anchored to blockchain.
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html_body, text_body)


def send_doctor_registration_email(doctor_info: dict) -> Tuple[bool, str]:
    """
    Send doctor application confirmation email (Under Review).
    """
    to_email = doctor_info.get("email", "")
    full_name = doctor_info.get("full_name", "Dr. Applicant")
    app_id = doctor_info.get("app_id", "N/A")
    specialty = doctor_info.get("specialty", "N/A")
    license_number = doctor_info.get("license_number", "N/A")
    phone = doctor_info.get("phone", "N/A")

    subject = f"MediPortal - Doctor Application Received [{app_id}]"

    text_body = f"""Hello Dr. {full_name},

Thank you for applying to join the MediPortal Healthcare Network.
Your application is currently UNDER REVIEW by hospital administration.

--- APPLICATION DETAILS ---
Application ID: {app_id}
Full Name: Dr. {full_name}
Specialty: {specialty}
Medical License: {license_number}
Phone: {phone}
Status: PENDING_ADMIN_APPROVAL

Our administration team will review your credentials and IPFS-anchored license documentation.
Once approved, you will receive an email with your Doctor ID and login credentials.

Best regards,
MediPortal Administration
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b14; color: #e2e8f0; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #0c1222; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #1e1b4b, #0c1222); padding: 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; }}
        .logo {{ color: #a855f7; font-size: 24px; font-weight: 800; margin: 0; }}
        .badge {{ display: inline-block; background: rgba(234,179,8,0.15); color: #facc15; border: 1px solid rgba(234,179,8,0.3); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }}
        .content {{ padding: 32px 24px; }}
        .box {{ background: #131b2e; border: 1px dashed #facc15; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }}
        .details-table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
        .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #1e293b; font-size: 14px; }}
        .label-col {{ color: #94a3b8; width: 40%; }}
        .value-col {{ color: #f8fafc; font-weight: 600; }}
        .footer {{ background: #070b14; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">MEDIPORTAL</h1>
          <div class="badge">Application Under Review</div>
        </div>
        <div class="content">
          <h2 style="color: #ffffff; margin-top: 0;">Application Received: Dr. {full_name}</h2>
          <p style="color: #94a3b8; line-height: 1.6;">
            Your credentials and medical license have been uploaded to IPFS and submitted to hospital administration for verification.
          </p>

          <div class="box">
            <div style="font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">Application Reference ID</div>
            <div style="font-size: 26px; font-weight: 900; color: #facc15; font-family: monospace; letter-spacing: 2px; margin-top: 6px;">{app_id}</div>
          </div>

          <table class="details-table">
            <tr><td class="label-col">Doctor Name</td><td class="value-col">Dr. {full_name}</td></tr>
            <tr><td class="label-col">Specialty</td><td class="value-col">{specialty}</td></tr>
            <tr><td class="label-col">License Number</td><td class="value-col">{license_number}</td></tr>
            <tr><td class="label-col">Phone</td><td class="value-col">{phone}</td></tr>
            <tr><td class="label-col">Status</td><td class="value-col" style="color: #facc15;">Pending Admin Approval</td></tr>
          </table>

          <p style="color: #64748b; font-size: 13px; margin-top: 24px; line-height: 1.5;">
            You will receive a notification once an administrator reviews and approves your application.
          </p>
        </div>
        <div class="footer">
          &copy; 2026 MediPortal Decentralized Healthcare Network.
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html_body, text_body)


def send_doctor_approval_email(doctor_info: dict) -> Tuple[bool, str]:
    """
    Send doctor welcome and approval notification with assigned Doctor ID.
    """
    to_email = doctor_info.get("email", "")
    full_name = doctor_info.get("full_name", "Doctor")
    doctor_id = doctor_info.get("doctor_id", "N/A")
    specialty = doctor_info.get("specialty", "N/A")
    wallet = doctor_info.get("wallet_address", "Assigned on Genesis Block")

    subject = f"MediPortal - Your Doctor Account Has Been Approved! [{doctor_id}]"

    text_body = f"""Congratulations Dr. {full_name},

Your medical credentials have been verified, and your MediPortal doctor account is now APPROVED and ACTIVE!

--- ACCOUNT CREDENTIALS ---
Doctor ID: {doctor_id}
Specialty: {specialty}
Status: VERIFIED
Blockchain Wallet: {wallet}

You can now log in at http://localhost:3000 using your Doctor ID ({doctor_id}) and password to access authorized EHR records, execute break-glass emergency access, and view predictive ML risk analytics.

Best regards,
MediPortal Administration
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b14; color: #e2e8f0; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #0c1222; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #064e3b, #0c1222); padding: 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; }}
        .logo {{ color: #10b981; font-size: 24px; font-weight: 800; margin: 0; }}
        .badge {{ display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }}
        .content {{ padding: 32px 24px; }}
        .id-box {{ background: #131b2e; border: 1px dashed #10b981; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }}
        .details-table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
        .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #1e293b; font-size: 14px; }}
        .label-col {{ color: #94a3b8; width: 40%; }}
        .value-col {{ color: #f8fafc; font-weight: 600; }}
        .footer {{ background: #070b14; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; margin-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">MEDIPORTAL</h1>
          <div class="badge">Verification Approved</div>
        </div>
        <div class="content">
          <h2 style="color: #ffffff; margin-top: 0;">Welcome, Dr. {full_name}!</h2>
          <p style="color: #94a3b8; line-height: 1.6;">
            Your doctor application has been approved by the network administration. Your role-based cryptographic keys are enabled.
          </p>

          <div class="id-box">
            <div style="font-size: 12px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">Assigned Doctor ID</div>
            <div style="font-size: 28px; font-weight: 900; color: #34d399; font-family: monospace; letter-spacing: 2px; margin-top: 6px;">{doctor_id}</div>
          </div>

          <table class="details-table">
            <tr><td class="label-col">Full Name</td><td class="value-col">Dr. {full_name}</td></tr>
            <tr><td class="label-col">Specialty</td><td class="value-col">{specialty}</td></tr>
            <tr><td class="label-col">Status</td><td class="value-col" style="color: #34d399;">VERIFIED</td></tr>
            <tr><td class="label-col">Blockchain Wallet</td><td class="value-col" style="font-family: monospace; font-size: 12px; color: #38bdf8;">{wallet}</td></tr>
          </table>

          <div style="text-align: center; margin-top: 28px;">
            <a href="http://localhost:3000" class="button">Log In to Doctor Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; 2026 MediPortal Decentralized Healthcare Network.
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html_body, text_body)


def send_password_reset_code_email(email_info: dict) -> Tuple[bool, str]:
    """
    Send OTP code email for password recovery.
    """
    to_email = email_info.get("email", "")
    full_name = email_info.get("full_name", "User")
    user_id = email_info.get("user_id", "N/A")
    user_type = email_info.get("user_type", "PATIENT") # PATIENT or DOCTOR
    code = email_info.get("code", "000000")
    expires_minutes = email_info.get("expires_minutes", 15)

    role_label = "Doctor" if user_type == "DOCTOR" else "Patient"
    accent_color = "#38bdf8" if user_type == "DOCTOR" else "#00f2fe"

    subject = f"MediPortal Security: Your Password Reset Verification Code [{code}]"

    text_body = f"""Hello {full_name},

A password reset request was initiated for your MediPortal {role_label} account.

YOUR 6-DIGIT VERIFICATION CODE:
========================================
             {code}
========================================

Account ID: {user_id}
Role: {role_label}
Expiration: {expires_minutes} minutes

Enter this verification code on the password reset screen along with your new password.

SECURITY WARNING:
If you did not request this password reset, please ignore this email. Your current password remains secure.

Best regards,
MediPortal Healthcare Security
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b14; color: #e2e8f0; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #0c1222; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }}
        .header {{ background: linear-gradient(135deg, #0f172a, #0c1222); padding: 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; }}
        .logo {{ color: {accent_color}; font-size: 24px; font-weight: 800; margin: 0; }}
        .badge {{ display: inline-block; background: rgba(0,242,254,0.12); color: {accent_color}; border: 1px solid rgba(0,242,254,0.3); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }}
        .content {{ padding: 32px 24px; }}
        .code-box {{ background: #131b2e; border: 2px dashed {accent_color}; border-radius: 14px; padding: 24px 20px; text-align: center; margin: 24px 0; }}
        .details-table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
        .details-table td {{ padding: 10px 12px; border-bottom: 1px solid #1e293b; font-size: 14px; }}
        .label-col {{ color: #94a3b8; width: 40%; }}
        .value-col {{ color: #f8fafc; font-weight: 600; }}
        .footer {{ background: #070b14; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">MEDIPORTAL</h1>
          <div class="badge">Password Reset Request</div>
        </div>
        <div class="content">
          <h2 style="color: #ffffff; margin-top: 0;">Hello, {full_name}</h2>
          <p style="color: #94a3b8; line-height: 1.6;">
            We received a request to reset the password for your MediPortal <strong>{role_label}</strong> account. Please use the verification code below to authorize your password update:
          </p>

          <div class="code-box">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 2px; font-weight: 700;">Your 6-Digit Verification Code</div>
            <div style="font-size: 42px; font-weight: 900; color: {accent_color}; letter-spacing: 8px; font-family: monospace; margin: 12px 0;">{code}</div>
            <div style="font-size: 12px; color: #f59e0b; font-weight: 600;">⏱️ Valid for {expires_minutes} minutes</div>
          </div>

          <table class="details-table">
            <tr><td class="label-col">Account ID</td><td class="value-col" style="font-family: monospace;">{user_id}</td></tr>
            <tr><td class="label-col">Account Role</td><td class="value-col">{role_label}</td></tr>
            <tr><td class="label-col">Registered Email</td><td class="value-col">{to_email}</td></tr>
          </table>

          <div style="margin-top: 24px; padding: 14px 18px; border-radius: 10px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; font-size: 12px; line-height: 1.5;">
            <strong>Security Notice:</strong> If you did not request this verification code, please ignore this email. Your current password remains completely unchanged and secure.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 MediPortal Decentralized Healthcare Security.
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html_body, text_body)


def send_password_reset_success_email(email_info: dict) -> Tuple[bool, str]:
    """
    Send confirmation email after password has been successfully updated.
    """
    to_email = email_info.get("email", "")
    full_name = email_info.get("full_name", "User")
    user_id = email_info.get("user_id", "N/A")
    user_type = email_info.get("user_type", "PATIENT")

    role_label = "Doctor" if user_type == "DOCTOR" else "Patient"
    subject = f"MediPortal Security: Password Successfully Changed [{user_id}]"

    text_body = f"""Hello {full_name},

This email confirms that the password for your MediPortal {role_label} account ({user_id}) was successfully reset.

If you made this change, no further action is required and you may log in with your new password.

If you did NOT authorize this change, please contact your hospital or security administrator immediately.

Best regards,
MediPortal Healthcare Security
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b14; color: #e2e8f0; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #0c1222; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #064e3b, #0c1222); padding: 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; }}
        .logo {{ color: #10b981; font-size: 24px; font-weight: 800; margin: 0; }}
        .badge {{ display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; }}
        .content {{ padding: 32px 24px; }}
        .footer {{ background: #070b14; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }}
        .btn {{ display: inline-block; background: #10b981; color: #070b14 !important; font-weight: 700; text-decoration: none; padding: 12px 26px; border-radius: 8px; margin-top: 20px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">MEDIPORTAL</h1>
          <div class="badge">Password Reset Complete</div>
        </div>
        <div class="content">
          <h2 style="color: #ffffff; margin-top: 0;">Password Successfully Changed</h2>
          <p style="color: #94a3b8; line-height: 1.6;">
            Hello <strong>{full_name}</strong>, the password for your MediPortal <strong>{role_label}</strong> account (<code style="color: #38bdf8;">{user_id}</code>) was successfully updated.
          </p>

          <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 10px; padding: 16px; margin: 20px 0; color: #6ee7b7; font-size: 13px;">
            ✓ Your credentials have been refreshed. You can now log in securely using your new password.
          </div>

          <div style="text-align: center;">
            <a href="http://localhost:3000" class="btn">Proceed to Login</a>
          </div>
        </div>
        <div class="footer">
          &copy; 2026 MediPortal Decentralized Healthcare Security.
        </div>
      </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html_body, text_body)

