from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id                 = Column(Integer, primary_key=True, index=True)
    email              = Column(String(255), unique=True, index=True, nullable=False)
    password           = Column(String(255), nullable=False)
    role               = Column(String(20), default="user", nullable=False)   # user/premium/admin
    is_active          = Column(Boolean, default=True)
    phone              = Column(String(20), nullable=True)    # dla SMS
    sms_notifications  = Column(Boolean, default=False)       # opt-in
    login_count        = Column(Integer, default=0)           # dla statystyk admina
    last_login         = Column(DateTime, nullable=True)      # dla statystyk admina
    refresh_tokens     = relationship("RefreshToken", back_populates="user")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id         = Column(Integer, primary_key=True, index=True)
    token      = Column(String(512), unique=True, index=True, nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    family     = Column(String(64))   # ← identyfikator rodziny
    expires_at = Column(DateTime, nullable=False)
    user       = relationship("User", back_populates="refresh_tokens")