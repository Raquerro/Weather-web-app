from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import models
import logging
import auth

# konfiguracja loggera – zapisuje do pliku i konsoli
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),                        # konsola (widoczne w docker logs)
        logging.FileHandler("/app/logs/audit.log"),     # plik
    ]
)
audit = logging.getLogger("audit")

ROLE_HIERARCHY = {"user": 1, "premium": 2, "admin": 3}

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- uprawnienia ---

    def _check_permission(self, requester: dict, required_role: str):
        user_level     = ROLE_HIERARCHY.get(requester.get("role", "user"), 0)
        required_level = ROLE_HIERARCHY.get(required_role, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=403,
                detail=f"Brak uprawnień – wymagana rola: {required_role}"
            )

    def _is_own_account(self, requester: dict, user_id: int) -> bool:
        return requester.get("user_id") == str(user_id)

    def _require_own_or_admin(self, requester: dict, user_id: int):
        if not self._is_own_account(requester, user_id):
            self._check_permission(requester, "admin")

    # --- sanityzacja ---

    def _sanitize(self, user: models.User, requester: dict) -> dict:
        is_admin = requester.get("role") == "admin"
        is_own   = self._is_own_account(requester, user.id)

        data = {
            "id":       user.id,
            "email":    user.email,
            "role":     user.role,
            "is_active": user.is_active,
        }

        # numer telefonu i SMS widzi tylko właściciel konta lub admin
        if is_own or is_admin:
            data["phone"]             = user.phone
            data["sms_notifications"] = user.sms_notifications

        # statystyki widzi tylko admin
        if is_admin:
            data["login_count"] = user.login_count
            data["last_login"]  = user.last_login.isoformat() if user.last_login else None

        return data

    # --- operacje ---

    def get_all(self, requester: dict) -> list:
        self._check_permission(requester, "admin")
        audit.info(f"GET_ALL_USERS by={requester.get('email')}")
        return [self._sanitize(u, requester) for u in self.db.query(models.User).all()]

    def get_by_id(self, user_id: int, requester: dict) -> dict:
        self._require_own_or_admin(requester, user_id)
        user = self.db.query(models.User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
        return self._sanitize(user, requester)

    def update_role(self, user_id: int, new_role: str, requester: dict) -> dict:
        self._check_permission(requester, "admin")

        # admin nie może zmienić własnej roli
        if str(user_id) == requester.get("user_id"):
            audit.warning(f"SELF_ROLE_CHANGE_BLOCKED by={requester.get('email')}")
            raise HTTPException(status_code=400, detail="Nie możesz zmienić własnej roli")

        if new_role not in ROLE_HIERARCHY:
            raise HTTPException(status_code=400, detail=f"Nieprawidłowa rola: {new_role}")

        user = self.db.query(models.User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

        old_role = user.role
        user.role = new_role
        self.db.commit()

        audit.info(
            f"ROLE_CHANGE user={user.email} "
            f"old_role={old_role} new_role={new_role} "
            f"by={requester.get('email')}"
        )
        return self._sanitize(user, requester)

    def toggle_active(self, user_id: int, requester: dict) -> dict:
        self._check_permission(requester, "admin")

        user = self.db.query(models.User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

        user.is_active = not user.is_active
        # unieważnij refresh tokeny przy blokowaniu
        if not user.is_active:
            self.db.query(models.RefreshToken).filter_by(user_id=user.id).delete(synchronize_session=False)

        self.db.commit()

        action = "ACCOUNT_BLOCKED" if not user.is_active else "ACCOUNT_UNBLOCKED"
        audit.info(f"{action} user={user.email} by={requester.get('email')}")

        return self._sanitize(user, requester)

    def update_profile(self, user_id: int, data: dict, requester: dict) -> dict:
        self._require_own_or_admin(requester, user_id)

        user = self.db.query(models.User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
        # tylko bezpieczne pola mogą być zmienione przez użytkownika
        allowed = {"phone", "sms_notifications"}
        changed = {}
        for key, value in data.items():
            if key in allowed:
                setattr(user, key, value)
                changed[key] = value

        self.db.commit()

        audit.info(
            f"PROFILE_UPDATE user={user.email} "
            f"fields={list(changed.keys())} "
            f"by={requester.get('email')}"
        )
        return self._sanitize(user, requester)

    def get_stats(self, requester: dict) -> dict:
        self._check_permission(requester, "admin")
        audit.info(f"GET_STATS by={requester.get('email')}")
        total  = self.db.query(models.User).count()
        active = self.db.query(models.User).filter_by(is_active=True).count()
        return {
            "total_users":  total,
            "active_users": active,
            "by_role": {
                role: self.db.query(models.User).filter_by(role=role).count()
                for role in ROLE_HIERARCHY
            }
        }

    def change_password(self, user_id: int, current_password: str, new_password: str, requester: dict) -> dict:
        self._require_own_or_admin(requester, user_id)

        user = self.db.query(models.User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

        if not auth.verify_password(current_password, user.password):
            audit.warning(f"WRONG_CURRENT_PASSWORD user={user.email}")
            raise HTTPException(status_code=400, detail="Nieprawidłowe obecne hasło")

        if auth.verify_password(new_password, user.password):
            raise HTTPException(status_code=400, detail="Nowe hasło musi być inne niż obecne")

        user.password = auth.hash_password(new_password)
        # unieważnij wszystkie sesje – użytkownik musi zalogować się ponownie
        self.db.query(models.RefreshToken).filter_by(user_id=user.id).delete(synchronize_session=False)
        self.db.commit()

        audit.info(f"PASSWORD_CHANGED user={user.email} by={requester.get('email')}")
        return {"message": "Hasło zostało zmienione. Zaloguj się ponownie."}