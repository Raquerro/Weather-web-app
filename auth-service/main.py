from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from jose import JWTError

import models, auth
from database import engine, get_db
from schemas import RegisterRequest, LoginRequest, TokenResponse

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/auth/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=data.email).first():
        raise HTTPException(status_code=400, detail="Email już zajęty")
    db.add(models.User(
        email=data.email,
        password=auth.hash_password(data.password)
    ))
    db.commit()
    return {"message": "Zarejestrowano pomyślnie"}

@app.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=data.email).first()
    if not user or not auth.verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Nieprawidłowe dane logowania")
    return {"access_token": auth.create_access_token({"sub": str(user.id), "email": user.email})}

@app.post("/auth/verify")
def verify(payload: dict):
    try:
        data = auth.decode_token(payload["token"])
        return {"valid": True, "user_id": data["sub"], "email": data["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")