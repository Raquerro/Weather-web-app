from fastapi import FastAPI, HTTPException, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from datetime import datetime
import os
import models, auth
from database import engine, get_db
from schemas import RegisterRequest, LoginRequest, TokenResponse, UpdateRoleRequest, UpdateProfileRequest, ChangePasswordRequest
from slowapi import Limiter
from slowapi.util import get_remote_address
import secrets
from repositories.user_repository import UserRepository

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


security  = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.post("/auth/register", status_code=201)
@limiter.limit("3/minute")
def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=data.email).first():
        raise HTTPException(status_code=400, detail="Email już zajęty")
    db.add(models.User(
        email=data.email,
        password=auth.hash_password(data.password),
        role="user"   # każdy nowy użytkownik dostaje rolę user
    ))
    db.commit()
    return {"message": "Zarejestrowano pomyślnie"}

@app.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=data.email).first()
    if not user or not auth.verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Nieprawidłowe dane logowania")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Konto zostało zablokowane")

    # aktualizuj statystyki logowania
    user.login_count += 1
    user.last_login   = datetime.utcnow()

    # usuń stare refresh tokeny
    db.query(models.RefreshToken).filter_by(user_id=user.id).delete(synchronize_session=False)

    refresh_token, expires_at = auth.create_refresh_token()
    db.add(models.RefreshToken(
        token=refresh_token,
        user_id=user.id,
        family=secrets.token_hex(16),
        expires_at=expires_at
    ))
    db.commit()

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,   # True na produkcji z HTTPS
        samesite="strict",
        max_age=7 * 24 * 60 * 60
    )

    # rola trafia do tokenu
    access_token = auth.create_access_token({
        "sub":   str(user.id),
        "email": user.email,
        "role":  user.role
    })
    return {"access_token": access_token}

@app.post("/auth/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Brak refresh tokenu")

    token_record = db.query(models.RefreshToken).filter_by(token=token).first()

    if not token_record:
        # token nie istnieje – mógł już być użyty (reuse attack)
        # nie znamy family więc nie możemy jej unieważnić,
        # ale możemy wyczyścić cookie żeby wymusić ponowne logowanie
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Wykryto podejrzaną aktywność")

    if token_record.expires_at < datetime.utcnow():
        db.query(models.RefreshToken).filter_by(id=token_record.id).delete(synchronize_session=False)
        db.commit()
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Sesja wygasła")

    # znamy family – rotacja z zachowaniem family
    family = token_record.family
    user   = db.query(models.User).filter_by(id=token_record.user_id).first()

    db.query(models.RefreshToken).filter_by(id=token_record.id).delete(synchronize_session=False)
    new_refresh_token, expires_at = auth.create_refresh_token()
    db.add(models.RefreshToken(
        token=new_refresh_token,
        user_id=user.id,
        family=family,
        expires_at=expires_at
    ))
    db.commit()

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="strict",
        max_age=7 * 24 * 60 * 60
    )

    return {"access_token": auth.create_access_token({
        "sub":   str(user.id),
        "email": user.email,
        "role":  user.role
    })}

@app.post("/auth/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        db.query(models.RefreshToken).filter_by(token=token).delete(synchronize_session=False)
        db.commit()
    response = Response()
    response.delete_cookie("refresh_token")
    return response

@app.post("/auth/verify")
def verify(payload: dict):
    try:
        data = auth.decode_token(payload["token"])
        return {"valid": True, "user_id": data["sub"], "email": data["email"], "role": data["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")


def get_current_user(token = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "user_id": str(payload["sub"]),
            "email":   payload["email"],
            "role":    payload.get("role", "user")
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

@app.get("/users")
def get_users(
    requester = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return UserRepository(db).get_all(requester)

@app.get("/users/stats")
def get_stats(
    requester = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return UserRepository(db).get_stats(requester)

@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    requester = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return UserRepository(db).get_by_id(user_id, requester)

@app.patch("/users/{user_id}/role")
def update_role(
    user_id: int,
    payload: UpdateRoleRequest,
    requester = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return UserRepository(db).update_role(user_id, payload.role, requester)

@app.patch("/users/{user_id}/active")
def toggle_active(
    user_id: int,
    requester = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return UserRepository(db).toggle_active(user_id, requester)

@app.patch("/users/{user_id}/profile")
def update_profile(
    user_id: int,
    payload: UpdateProfileRequest,
    requester = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return UserRepository(db).update_profile(user_id, payload.model_dump(exclude_none=True), requester)

@app.patch("/users/{user_id}/password")
def change_password(
    user_id: int,
    payload: ChangePasswordRequest,
    requester = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return UserRepository(db).change_password(
        user_id,
        payload.current_password,
        payload.new_password,
        requester
    )