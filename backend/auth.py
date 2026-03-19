from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
import jwt
from db import get_connection
from config import JWT_SECRET

security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: int, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return {"user_id": payload["user_id"], "username": payload["username"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def register_user(username: str, password: str) -> dict:
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, hash_password(password)),
        )
        conn.commit()
        user_id = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()["id"]
        return {"user_id": user_id, "token": create_token(user_id, username)}
    except Exception:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        conn.close()

def login_user(username: str, password: str) -> dict:
    conn = get_connection()
    row = conn.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    if not row or not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"user_id": row["id"], "token": create_token(row["id"], username)}
