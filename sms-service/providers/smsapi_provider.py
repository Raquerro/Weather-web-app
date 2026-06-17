import httpx
import logging
from .base_provider import BaseSMSProvider

logger = logging.getLogger("sms.smsapi")

SMSAPI_URL = "https://api2.smsapi.pl/sms.do"


class SMSApiProvider(BaseSMSProvider):
    def __init__(self, token: str, sender: str = "Test"):
        self.token  = token
        self.sender = sender

    def send(self, phone: str, message: str) -> bool:
        normalized = phone.lstrip("+").replace(" ", "")
        if normalized.startswith("0"):
            normalized = "48" + normalized[1:]
        elif not normalized.startswith("48"):
            normalized = "48" + normalized

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    SMSAPI_URL,
                    headers={"Authorization": f"Bearer {self.token}"},
                    data={
                        "to":      normalized,
                        "message": message,
                        "from":    self.sender,
                        "format":  "json",
                    },
                )
                data = res.json()

                if res.status_code == 200 and data.get("count", 0) > 0:
                    logger.info(f"[SMSAPI] Wysłano → {phone}")
                    return True

                logger.error(f"[SMSAPI] Błąd: {data}")
                return False

        except Exception as e:
            logger.error(f"[SMSAPI] Wyjątek: {e}")
            return False