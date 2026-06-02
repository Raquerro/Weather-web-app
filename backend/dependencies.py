from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")
security   = HTTPBearer()

ROLE_HIERARCHY = {
    "user":    1,
    "premium": 2,
    "admin":   3,
}

def get_current_user(token = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "user_id": payload["sub"],
            "email":   payload["email"],
            "role":    payload.get("role", "user")
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

def require_role(required_role: str):
    def checker(user = Depends(get_current_user)):
        user_level     = ROLE_HIERARCHY.get(user["role"], 0)
        required_level = ROLE_HIERARCHY.get(required_role, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=403,
                detail=f"Wymagana rola: {required_role}. Twoja rola: {user['role']}"
            )
        return user
    return checker

# gotowe dependency do użycia w endpointach
def require_user(user    = Depends(require_role("user"))):    return user
def require_premium(user = Depends(require_role("premium"))): return user
def require_admin(user   = Depends(require_role("admin"))):   return user