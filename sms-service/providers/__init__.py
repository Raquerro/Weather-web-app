from .mock_provider import MockSMSProvider
from config import SMS_PROVIDER

def get_provider():
    if SMS_PROVIDER == "mock":
        return MockSMSProvider()
    # tutaj dodasz kolejne providery w przyszłości
    # if SMS_PROVIDER == "twilio":
    #     return TwilioProvider()
    raise ValueError(f"Nieznany provider: {SMS_PROVIDER}")