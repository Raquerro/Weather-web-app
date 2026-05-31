from fastapi import FastAPI, HTTPException, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from jose import JWTError
from datetime import datetime

import models, auth
from database import engine, get_db
from schemas import RegisterRequest, LoginRequest, TokenResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/auth/register", status_code=201)
@limiter.limit("3/minute")
def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=data.email).first():
        raise HTTPException(status_code=400, detail="Email już zajęty")
    db.add(models.User(
        email=data.email,
        password=auth.hash_password(data.password)
    ))
    db.commit()
    return {"message": "Zarejestrowano pomyślnie"}

@app.post("/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=data.email).first()
    if not user or not auth.verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Nieprawidłowe dane logowania")

    # usuń stare refresh tokeny użytkownika
    db.query(models.RefreshToken).filter_by(user_id=user.id).delete()

    refresh_token, expires_at = auth.create_refresh_token()
    db.add(models.RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=expires_at
    ))
    db.commit()

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,    # niedostępny dla JS
        secure=True,      # tylko HTTPS
        samesite="strict",# blokuje CSRF
        max_age=7 * 24 * 60 * 60
    )

    return {
        "access_token": auth.create_access_token({"sub": str(user.id), "email": user.email}),
        "refresh_token": refresh_token
    }

@app.post("/auth/refresh")
def refresh(request: Request, db: Session = Depends(get_db)):
    token_record = db.query(models.RefreshToken).filter_by(token=...).first()

    if not token_record:
        # token nie istnieje – ktoś próbuje użyć już zrotowanego tokenu
        # unieważnij CAŁĄ rodzinę tokenów dla tego usera
        db.query(models.RefreshToken).filter_by(family=suspected_family).delete()
        db.commit()
        raise HTTPException(status_code=401, detail="Wykryto podejrzaną aktywność")

    user = db.query(models.User).filter_by(id=token_record.user_id).first()

    # rotacja – stary token zastępowany nowym
    db.delete(token_record)
    new_refresh_token, expires_at = auth.create_refresh_token()
    db.add(models.RefreshToken(
        token=new_refresh_token,
        user_id=user.id,
        expires_at=expires_at
    ))
    db.commit()

    return {
        "access_token": auth.create_access_token({"sub": str(user.id), "email": user.email}),
        "refresh_token": new_refresh_token
    }

@app.post("/auth/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        db.query(models.RefreshToken).filter_by(token=token).delete()
        db.commit()
    response = Response()
    response.delete_cookie("refresh_token")
    return response

@app.post("/auth/verify")
def verify(payload: dict):
    try:
        data = auth.decode_token(payload["token"])
        return {"valid": True, "user_id": data["sub"], "email": data["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")