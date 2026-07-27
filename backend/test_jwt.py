import sys
sys.path.append("c:\\Users\\arfan\\Documents\\Projects\\stellar-admin\\backend")
from auth_utils import create_access_token
from jose import jwt
from datetime import datetime, timezone

SECRET_KEY = "supersecretkey_change_me"
ALGORITHM = "HS256"

token = create_access_token(data={"sub": "12345"})
print("Generated:", token)

try:
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    print("Decoded successfully:", decoded)
except Exception as e:
    print("Decode failed:", type(e).__name__, "-", e)
