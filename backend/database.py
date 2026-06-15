from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import time

def create_engine_with_retry(url, retries=10, delay=3):
    for attempt in range(retries):
        try:
            engine = create_engine(url, pool_pre_ping=True)
            engine.connect().close()
            return engine
        except Exception as e:
            print(f"Próba {attempt + 1}/{retries}: {e}")
            time.sleep(delay)
    raise RuntimeError("Nie udało się połączyć z bazą")

engine       = create_engine_with_retry(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()