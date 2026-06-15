from fastapi import HTTPException
from sqlalchemy.orm import Session
import models

ROLE_HIERARCHY = {"user": 1, "premium": 2, "admin": 3}
MAX_CONFIGS_PER_USER = 5

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def _check_owner(self, config: models.NotificationConfig, requester: dict):
        if str(config.user_id) != str(requester["user_id"]) and requester.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Brak dostępu")

    def get_all(self, requester: dict) -> list:
        return self.db.query(models.NotificationConfig).filter_by(
            user_id=requester["user_id"]
        ).all()

    def create(self, data: dict, requester: dict) -> models.NotificationConfig:
        count = self.db.query(models.NotificationConfig).filter_by(
            user_id=requester["user_id"]
        ).count()
        if count >= MAX_CONFIGS_PER_USER:
            raise HTTPException(
                status_code=400,
                detail=f"Maksymalna liczba lokalizacji to {MAX_CONFIGS_PER_USER}"
            )
        config = models.NotificationConfig(
            user_id=requester["user_id"],
            **data
        )
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def update(self, config_id: int, data: dict, requester: dict) -> models.NotificationConfig:
        config = self.db.query(models.NotificationConfig).filter_by(id=config_id).first()
        if not config:
            raise HTTPException(status_code=404, detail="Konfiguracja nie istnieje")
        self._check_owner(config, requester)
        allowed = {"name", "active", "notify_hour"}
        for key, value in data.items():
            if key in allowed:
                setattr(config, key, value)
        self.db.commit()
        return config

    def delete(self, config_id: int, requester: dict):
        config = self.db.query(models.NotificationConfig).filter_by(id=config_id).first()
        if not config:
            raise HTTPException(status_code=404, detail="Konfiguracja nie istnieje")
        self._check_owner(config, requester)
        self.db.delete(config)
        self.db.commit()
        return {"message": "Usunięto konfigurację"}

    def get_all_active(self) -> list:
        return self.db.query(models.NotificationConfig).filter_by(active=True).all()