from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.security import HTTPBearer
import requests
from fastapi.middleware.cors import CORSMiddleware
import os
from dependencies import get_current_user, require_user, require_premium, require_admin
from repositories.weather_repository import WeatherRepository
from database import engine, get_db, SessionLocal
from models import Base, NotificationConfig
from repositories.notification_repository import NotificationRepository
from sqlalchemy.orm import Session
import httpx


app = FastAPI()
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/weather")
def get_weather(
    lat: float,
    lon: float,
    user = Depends(require_user)
):
    return WeatherRepository().get_forecast(lat, lon, user)

# dodaj nowy endpoint
@app.get("/protected")
def protected(user = Depends(get_current_user)):
    return {"user": user}

@app.get("/notifications")
def get_notifications(
    user = Depends(require_user),
    db: Session = Depends(get_db)
):
    return NotificationRepository(db).get_all(user)

@app.post("/notifications", status_code=201)
def create_notification(
    payload: dict,
    user = Depends(require_user),
    db: Session = Depends(get_db)
):
    allowed = {"name", "latitude", "longitude", "active", "notify_hour"}
    data = {k: v for k, v in payload.items() if k in allowed}
    return NotificationRepository(db).create(data, user)

@app.patch("/notifications/{config_id}")
def update_notification(
    config_id: int,
    payload: dict,
    user = Depends(require_user),
    db: Session = Depends(get_db)
):
    return NotificationRepository(db).update(config_id, payload, user)

@app.delete("/notifications/{config_id}")
def delete_notification(
    config_id: int,
    user = Depends(require_user),
    db: Session = Depends(get_db)
):
    return NotificationRepository(db).delete(config_id, user)

@app.get("/internal/notifications/active")
def get_active_notifications(
    x_service_token: str = Header(None),
    db: Session = Depends(get_db)
):
    token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if not token or x_service_token != token:
        raise HTTPException(status_code=403, detail="Nieprawidłowy token serwisu")
    configs = NotificationRepository(db).get_all_active()
    return [
        {
            "user_id":   c.user_id,
            "name":      c.name,
            "latitude":  float(c.latitude),
            "longitude": float(c.longitude),
            "notify_hour": c.notify_hour,
        }
        for c in configs
    ]

SMS_SERVICE_URL = os.getenv("SMS_SERVICE_URL", "http://sms-service:8002")

@app.post("/admin/trigger-sms")
async def trigger_sms(user = Depends(require_admin)):
    token = os.getenv("INTERNAL_SERVICE_TOKEN")
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{SMS_SERVICE_URL}/sms/trigger",
            headers={"X-Service-Token": token},
            params={"force": "true"}   # wywolanie admina
        )
        return res.json()