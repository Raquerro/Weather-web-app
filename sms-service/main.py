from fastapi import FastAPI, Header, HTTPException
from contextlib import asynccontextmanager
from scheduler import create_scheduler
from sms_sender import run_sms_check
from config import INTERNAL_SERVICE_TOKEN
import logging

logger = logging.getLogger("sms_service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("Scheduler uruchomiony")
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok", "service": "sms-service"}

@app.post("/sms/trigger")
async def trigger_check(
    x_service_token: str = Header(None),
    lat: float = 52.23,
    lon: float = 21.01
):
    if not INTERNAL_SERVICE_TOKEN or x_service_token != INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Brak dostępu")
    return await run_sms_check(lat=lat, lon=lon)