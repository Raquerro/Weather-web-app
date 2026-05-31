from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import requests
import pathlib
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
import os
import requests
import pathlib
import os


app = FastAPI()
# dodaj po inicjalizacji app
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(token = Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            os.getenv("SECRET_KEY"),
            algorithms=[os.getenv("ALGORITHM", "HS256")]
        )
        return {"user_id": payload["sub"], "email": payload["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Nieprawidłowy token")

@app.get("/api/")
def read_root():
    return {"Hello": "World"}

@app.get("/api/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


@app.get("/weather")
def get_weather(lat: float, lon: float):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,weathercode",
        "timezone": "auto"
    }

    response = requests.get(url, params=params)
    return response.json()

# dodaj nowy endpoint
@app.get("/protected")
def protected(user = Depends(get_current_user)):
    return {"user": user}

# Serve React build when present
build_dir = pathlib.Path(__file__).resolve().parent.parent / "frontend" / "build"
if build_dir.exists():
    app.mount("/static", StaticFiles(directory=build_dir / "static"), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(build_dir / "index.html")

