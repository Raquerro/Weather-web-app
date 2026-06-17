import logging
from .base_provider import BaseSMSProvider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("./logs/sms.log"),
    ]
)
sms_log = logging.getLogger("sms")

class MockSMSProvider(BaseSMSProvider):
    def send(self, phone: str, message: str) -> bool:
        sms_log.info(f"[MOCK SMS] → {phone}: {message}")
        return True