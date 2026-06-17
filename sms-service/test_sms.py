# test_sms.py  (uruchom w folderze serwisu SMS)
import os
from dotenv import load_dotenv
load_dotenv()

from providers.smsapi_provider import SMSApiProvider

provider = SMSApiProvider(
    token=os.getenv("SMSAPI_TOKEN"),
    sender=os.getenv("SMSAPI_SENDER", "Test")
)

# wpisz swój numer
result = provider.send("+48663804021", "Test z Weather App działa!")
print("Wysłano!" if result else "Błąd!")