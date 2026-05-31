from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os, time

def create_engine_with_retry(url: str, retries: int = 10, delay: int = 3):
    for attempt in range(retries):
        try:
            engine = create_engine(url, pool_pre_ping=True)
            engine.connect().close()  # testuje połączenie
            print("Połączono z bazą danych")
            return engine
        except Exception as e:
            print(f"Próba {attempt + 1}/{retries} nieudana: {e}")
            time.sleep(delay)
    raise RuntimeError("Nie udało się połączyć z bazą danych")

engine = create_engine_with_retry(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()