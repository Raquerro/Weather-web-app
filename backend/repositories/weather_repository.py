import requests
from fastapi import HTTPException

ROLE_CONFIG = {
    "user": {
        "daily":        "temperature_2m_max,temperature_2m_min,weathercode",
        "forecast_days": 3,
        "premium":       False,
    },
    "premium": {
        "daily":        "temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max",
        "forecast_days": 7,
        "premium":       True,
    },
    "admin": {
        "daily":        "temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max",
        "forecast_days": 7,
        "premium":       True,
    },
}

class WeatherRepository:

    def _check_permission(self, requester: dict):
        if requester.get("role") not in ROLE_CONFIG:
            raise HTTPException(status_code=403, detail="Brak dostępu do danych pogodowych")

    def _sanitize(self, data: dict) -> dict:
        # usuń wewnętrzne pola API których nie chcemy eksponować
        for field in ("generationtime_ms", "utc_offset_seconds"):
            data.pop(field, None)
        return data

    def get_forecast(self, lat: float, lon: float, requester: dict) -> dict:
        self._check_permission(requester)

        role   = requester.get("role", "user")
        config = ROLE_CONFIG.get(role, ROLE_CONFIG["user"])

        if not (-90 <= lat <= 90):
            raise HTTPException(status_code=400, detail="Szerokość geograficzna musi być między -90 a 90")
        if not (-180 <= lon <= 180):
            raise HTTPException(status_code=400, detail="Długość geograficzna musi być między -180 a 180")

        params = {
            "latitude":      lat,
            "longitude":     lon,
            "daily":         config["daily"],
            "forecast_days": config["forecast_days"],
            "timezone":      "auto",
        }

        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params=params
        )

        if not response.ok:
            raise HTTPException(
                status_code=502,
                detail="Błąd zewnętrznego API pogodowego"
            )

        data = self._sanitize(response.json())
        data["_meta"] = {
            "role":          role,
            "forecast_days": config["forecast_days"],
            "premium":       config["premium"],
        }
        return data