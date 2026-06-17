import os
from .mock_provider import MockSMSProvider
from config import SMS_PROVIDER
from .smsapi_provider import SMSApiProvider

def get_provider():
    if SMS_PROVIDER == "mock":
        return MockSMSProvider()

    if SMS_PROVIDER == "smsapi":
        token  = os.getenv("SMSAPI_TOKEN")
        sender = os.getenv("SMSAPI_SENDER", "Test")
        if not token:
            raise ValueError("Brak SMSAPI_TOKEN w zmiennych środowiskowych")
        return SMSApiProvider(token=token, sender=sender)

    raise ValueError(f"Nieznany provider: {SMS_PROVIDER}")