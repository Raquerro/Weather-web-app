import os
from dotenv import load_dotenv

load_dotenv()

SMS_PROVIDER          = os.getenv("SMS_PROVIDER", "mock")
AUTH_SERVICE_URL      = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN")
CHECK_INTERVAL_HOURS  = int(os.getenv("SMS_CHECK_INTERVAL_HOURS", 1))
BACKEND_URL = os.getenv("BACKEND_URL", "http://api:8000")

# kody pogodowe uznawane za niebezpieczne
DANGEROUS_CODES = {56, 57, 82, 95, 96, 99}