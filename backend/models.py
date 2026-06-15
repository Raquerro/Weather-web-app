from sqlalchemy import Column, Integer, String, Boolean, DateTime, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class NotificationConfig(Base):
    __tablename__ = "notification_configs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, nullable=False, index=True)
    name        = Column(String(100), nullable=False)
    latitude    = Column(DECIMAL(9, 6), nullable=False)
    longitude   = Column(DECIMAL(9, 6), nullable=False)
    active      = Column(Boolean, default=True)
    notify_hour = Column(Integer, default=7)
    created_at  = Column(DateTime, default=datetime.utcnow)