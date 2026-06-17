import asyncio
import httpx
import logging
from config import AUTH_SERVICE_URL, INTERNAL_SERVICE_TOKEN, DANGEROUS_CODES, BACKEND_URL
from providers import get_provider

logger = logging.getLogger("sms_sender")

TIMEOUT = httpx.Timeout(10.0)

# Pełna mapa kodów pogodowych open-meteo
WEATHER_DESCRIPTIONS = {
    0:  "bezchmurnie",
    1:  "przeważnie słonecznie",
    2:  "częściowe zachmurzenie",
    3:  "całkowite zachmurzenie",
    45: "mgła",
    48: "marznąca mgła",
    51: "lekka mżawka",
    53: "umiarkowana mżawka",
    55: "silna mżawka",
    56: "marznąca mżawka",
    57: "intensywna marznąca mżawka",
    61: "lekki deszcz",
    63: "umiarkowany deszcz",
    65: "silny deszcz",
    66: "marznący deszcz",
    67: "silny marznący deszcz",
    71: "lekkie opady śniegu",
    73: "umiarkowane opady śniegu",
    75: "silne opady śniegu",
    77: "ziarna śniegu",
    80: "przelotne opady deszczu",
    81: "umiarkowane przelotne opady",
    82: "silne przelotne opady",
    85: "przelotne opady śniegu",
    86: "silne przelotne opady śniegu",
    95: "burza",
    96: "burza z gradem",
    99: "burza z silnym gradem",
}

DANGEROUS_DESCRIPTIONS = {
    56: "marznąca mżawka",
    57: "intensywna marznąca mżawka",
    82: "silne przelotne opady",
    95: "burza",
    96: "burza z gradem",
    99: "burza z silnym gradem",
}


async def get_notification_configs(retries: int = 3) -> list:
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.get(
                    f"{BACKEND_URL}/internal/notifications/active",
                    headers={"X-Service-Token": INTERNAL_SERVICE_TOKEN}
                )
                if res.status_code == 200:
                    return res.json()
                logger.error(f"Blad pobierania konfiguracji: {res.status_code}")
                return []
        except httpx.RequestError as e:
            logger.warning(f"Proba {attempt + 1}/{retries} nieudana (notifications): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    logger.error("Nie udalo sie pobrac konfiguracji po wszystkich probach")
    return []


async def get_sms_targets(retries: int = 3) -> list:
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.get(
                    f"{AUTH_SERVICE_URL}/internal/users/sms-targets",
                    headers={"X-Service-Token": INTERNAL_SERVICE_TOKEN}
                )
                if res.status_code == 200:
                    return res.json()
                logger.error(f"Blad pobierania uzytkownikow: {res.status_code}")
                return []
        except httpx.RequestError as e:
            logger.warning(f"Proba {attempt + 1}/{retries} nieudana (sms-targets): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    logger.error("Nie udalo sie pobrac uzytkownikow po wszystkich probach")
    return []


async def get_weather(lat: float, lon: float, retries: int = 3) -> dict | None:
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                res = await client.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude":      lat,
                        "longitude":     lon,
                        "daily":         "weathercode,temperature_2m_max,temperature_2m_min",
                        "forecast_days": 2,
                        "timezone":      "auto",
                    }
                )
                if res.status_code == 200:
                    return res.json()
                logger.error(f"Blad API pogodowego: {res.status_code}")
                return None
        except httpx.RequestError as e:
            logger.warning(f"Proba {attempt + 1}/{retries} nieudana (weather): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    logger.error(f"Nie udalo sie pobrac pogody dla {lat},{lon}")
    return None


def is_dangerous(weather: dict) -> tuple[bool, str]:
    codes = weather.get("daily", {}).get("weathercode", [])
    if len(codes) < 2:
        return False, ""
    code = codes[1]
    if code not in DANGEROUS_CODES:
        return False, ""
    return True, DANGEROUS_DESCRIPTIONS.get(code, "niebezpieczne warunki pogodowe")


def build_message(config_name: str, weather: dict, force: bool) -> str | None:
    """Buduje treść SMS na podstawie prognozy. Zwraca None jeśli nie wysylac."""
    codes   = weather.get("daily", {}).get("weathercode", [])
    t_max   = weather.get("daily", {}).get("temperature_2m_max", [])
    t_min   = weather.get("daily", {}).get("temperature_2m_min", [])

    if len(codes) < 2:
        return None

    tomorrow_code = codes[1]
    dangerous     = tomorrow_code in DANGEROUS_CODES
    description   = WEATHER_DESCRIPTIONS.get(tomorrow_code, "nieznane warunki")

    # temperatura jutro (jesli dostepna)
    temp_info = ""
    if len(t_max) > 1 and len(t_min) > 1:
        temp_info = f", temp. {int(t_min[1])}-{int(t_max[1])}C"

    if force:
        status = "OSTRZEZENIE" if dangerous else "Prognoza"
        return (
            f"[Weather App] {status} dla '{config_name}': "
            f"{description}{temp_info}. "
            f"{'Zachowaj ostroznosc!' if dangerous else 'Pogoda bez zagrozen.'}"
        )

    if dangerous:
        return (
            f"[Weather App] OSTRZEZENIE dla '{config_name}': "
            f"jutro {description}{temp_info}. "
            f"Zachowaj ostroznosc!"
        )

    return None  # nie wysylaj jesli nie niebezpieczne i nie force


async def run_sms_check(lat: float = None, lon: float = None, force: bool = False):
    targets  = await get_sms_targets()
    configs  = await get_notification_configs()
    provider = get_provider()
    sent     = 0

    configs_by_user = {}
    for c in configs:
        configs_by_user.setdefault(c["user_id"], []).append(c)

    for user in targets:
        user_configs = configs_by_user.get(user["user_id"], [])

        if not user_configs:
            check_lat = lat or 52.23
            check_lon = lon or 21.01
            user_configs = [{"name": "Domyslna", "latitude": check_lat, "longitude": check_lon}]

        for config in user_configs:
            weather = await get_weather(config["latitude"], config["longitude"])
            if not weather:
                continue

            message = build_message(config["name"], weather, force)
            if not message:
                continue

            if provider.send(user["phone"], message):
                sent += 1
                logger.info(f"SMS -> {user['email']} ({config['name']})")

    logger.info(f"Sprawdzono {len(targets)} uzytkownikow, wyslano {sent} SMS-ow")
    return {"sent": sent, "checked": len(targets)}