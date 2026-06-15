import httpx
import logging
from config import AUTH_SERVICE_URL, INTERNAL_SERVICE_TOKEN, DANGEROUS_CODES, BACKEND_URL
from providers import get_provider

logger = logging.getLogger("sms_sender")

TIMEOUT = httpx.Timeout(10.0)  # timeout 10 sekund na każdy request

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
                logger.error(f"Błąd pobierania konfiguracji: {res.status_code}")
                return []
        except httpx.RequestError as e:
            logger.warning(f"Próba {attempt + 1}/{retries} nieudana (notifications): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    logger.error("Nie udało się pobrać konfiguracji po wszystkich próbach")
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
                logger.error(f"Błąd pobierania użytkowników: {res.status_code}")
                return []
        except httpx.RequestError as e:
            logger.warning(f"Próba {attempt + 1}/{retries} nieudana (sms-targets): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)  # 1s, 2s, 4s
    logger.error("Nie udało się pobrać użytkowników po wszystkich próbach")
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
                        "daily":         "weathercode",
                        "forecast_days": 2,
                        "timezone":      "auto",
                    }
                )
                if res.status_code == 200:
                    return res.json()
                logger.error(f"Błąd API pogodowego: {res.status_code}")
                return None
        except httpx.RequestError as e:
            logger.warning(f"Próba {attempt + 1}/{retries} nieudana (weather): {e}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    logger.error(f"Nie udało się pobrać pogody dla {lat},{lon}")
    return None


def is_dangerous(weather: dict) -> tuple[bool, str]:
    codes = weather.get("daily", {}).get("weathercode", [])
    if len(codes) < 2:
        return False, ""
    code = codes[1]
    if code not in DANGEROUS_CODES:
        return False, ""

    descriptions = {
        56: "marznąca mżawka",
        57: "intensywna marznąca mżawka",
        82: "silne przelotne opady",
        95: "burza",
        96: "burza z gradem",
        99: "burza z silnym gradem",
    }
    return True, descriptions.get(code, "niebezpieczne warunki pogodowe")

async def run_sms_check(lat: float = None, lon: float = None):
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
            user_configs = [{"name": "Domyślna", "latitude": check_lat, "longitude": check_lon}]

        for config in user_configs:
            weather = await get_weather(config["latitude"], config["longitude"])
            if not weather:
                continue

            dangerous, description = is_dangerous(weather)
            if dangerous:
                message = (
                    f"Uwaga! Prognoza na jutro dla lokalizacji '{config['name']}' "
                    f"ostrzega przed: {description}. Aplikacja Weather Web App"
                )
                if provider.send(user["phone"], message):
                    sent += 1
                    logger.info(f"SMS → {user['email']} ({config['name']})")

    logger.info(f"Sprawdzono {len(targets)} użytkowników, wysłano {sent} SMS-ów")
    return {"sent": sent, "checked": len(targets)}