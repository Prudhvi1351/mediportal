import requests

# We need a valid doctor token to test this, or we can just bypass auth temporarily in main.py.
# Actually, let's just make a script that prints the first few bytes of the response of a direct db fetch.
import base64
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

db = SessionLocal()
rec = db.query(models.EHRRecord).first()
if rec:
    encrypted_payload = bytes.fromhex(rec.encrypted_data)
    iv = encrypted_payload[:16]
    cipher = AES.new(b'MyCollegeProjectSecureKey2026!!!', AES.MODE_CBC, iv)
    dec = unpad(cipher.decrypt(encrypted_payload[16:]), AES.block_size)
    print("Decrypted len:", len(dec))
    try:
        text = dec.decode('utf-8', errors='replace')
        print("Decoded string len:", len(text))
    except Exception as e:
        print("Decode error:", e)
else:
    print("No records found")
