from pydantic import BaseModel, EmailStr, field_validator

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v):
        if len(v) > 72:
            raise ValueError("Hasło nie może być dłuższe niż 72 znaki")
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UpdateRoleRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v not in ("user", "premium", "admin"):
            raise ValueError("Rola musi być jedną z: user, premium, admin")
        return v

class UpdateProfileRequest(BaseModel):
    phone: str | None = None
    sms_notifications: bool | None = None

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v):
        if v is not None:
            digits = v.replace("+", "").replace(" ", "").replace("-", "")
            if not digits.isdigit() or not (7 <= len(digits) <= 15):
                raise ValueError("Nieprawidłowy numer telefonu")
        return v