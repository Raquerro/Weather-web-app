from fastapi import FastAPI, Depends
from fastapi.security import HTTPBearer
import requests
from fastapi.middleware.cors import CORSMiddleware
import os
from dependencies import get_current_user, require_user, require_premium, require_admin
from repositories.weather_repository import WeatherRepository


app = FastAPI()
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


