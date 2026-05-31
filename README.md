# Weather Web App

Aplikacja webowa pokazująca prognozę pogody dla wybranej lokalizacji na mapie. Składa się z trzech serwisów uruchamianych w kontenerach Docker.

## Architektura

```
[ React :3000 ]  →  [ Backend API :8000 ]  →  [ Open-Meteo API ]
                 →  [ Auth Service :8001 ]  →  [ MySQL :3306 ]
```

- **Frontend** – React z mapą Leaflet do wyboru lokalizacji
- **Backend API** – FastAPI obsługujący pobieranie pogody z Open-Meteo
- **Auth Service** – FastAPI obsługujący rejestrację i logowanie użytkowników (JWT)
- **Baza danych** – MySQL 8 z osobnymi bazami dla aplikacji i auth serwisu

## Wymagania

- [Docker](https://www.docker.com/) z Docker Compose

## Uruchomienie

### 1. Sklonuj repozytorium

```bash
git clone <url-repozytorium>
cd Weather-web-app
```

### 2. Skonfiguruj zmienne środowiskowe

Skopiuj `.env.example` do `.env` i uzupełnij wartości:

```bash
cp .env.example .env
```

Wygeneruj `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Uruchom aplikację

```bash
docker compose up --build
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

## Endpointy

### Backend API (`http://localhost:8000`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/weather?lat={lat}&lon={lon}` | Prognoza pogody dla podanych współrzędnych |
| GET | `/protected` | Chroniony endpoint (wymaga JWT) |
| GET | `/docs` | Dokumentacja Swagger |

### Auth Service (`http://localhost:8001`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/auth/register` | Rejestracja nowego użytkownika |
| POST | `/auth/login` | Logowanie, zwraca token JWT |
| POST | `/auth/verify` | Weryfikacja tokenu JWT |
| GET | `/docs` | Dokumentacja Swagger |

## Przydatne komendy

```bash
# Uruchomienie w tle
docker compose up --build -d

# Logi konkretnego serwisu
docker compose logs -f auth-service
docker compose logs -f backend
docker compose logs -f frontend

# Zatrzymanie
docker compose down

# Zatrzymanie i usunięcie danych bazy
docker compose down -v
```

## Dane pogodowe

Aplikacja korzysta z darmowego API [Open-Meteo](https://open-meteo.com/) – nie wymaga klucza API. Prognoza obejmuje 3 dni i zawiera temperaturę maksymalną i minimalną, opis pogody z ikoną oraz ostrzeżenie przy niebezpiecznych warunkach (burze, silne opady, marznąca mżawka).