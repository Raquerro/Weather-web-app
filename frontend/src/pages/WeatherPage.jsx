import { useState } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { authFetch } from "../services/authService";
import { useNavigate } from "react-router-dom";

const customIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [32, 32],
});

const weatherMap = {
  0: { label: "Słonecznie", icon: "☀️" },
  1: { label: "Głównie słonecznie", icon: "🌤️" },
  2: { label: "Częściowe zachmurzenie", icon: "⛅" },
  3: { label: "Zachmurzenie", icon: "☁️" },
  45: { label: "Mgła", icon: "🌫️" },
  48: { label: "Szadź", icon: "🌫️" },
  51: { label: "Lekka mżawka", icon: "🌦️" },
  53: { label: "Mżawka", icon: "🌦️" },
  55: { label: "Silna mżawka", icon: "🌧️" },
  56: { label: "Marznąca mżawka (lekka)", icon: "🌨️" },
  57: { label: "Marznąca mżawka (intensywna)", icon: "❄️🌧️" },
  61: { label: "Lekki deszcz", icon: "🌧️" },
  63: { label: "Deszcz", icon: "🌧️" },
  65: { label: "Silny deszcz", icon: "🌧️" },
  71: { label: "Lekki śnieg", icon: "🌨️" },
  73: { label: "Śnieg", icon: "🌨️" },
  75: { label: "Silny śnieg", icon: "❄️" },
  77: { label: "Śnieg ziarnisty", icon: "🌨️" },
  80: { label: "Przelotne opady (lekkie)", icon: "🌦️" },
  81: { label: "Przelotne opady (umiarkowane)", icon: "🌧️" },
  82: { label: "Przelotne opady (silne)", icon: "⛈️" },
  95: { label: "Burza", icon: "⛈️" },
  96: { label: "Burza z gradem", icon: "⛈️" },
  99: { label: "Burza z silnym gradem", icon: "⚡" },
};

function LocationMarker({ setCoords }) {
  const [position, setPosition] = useState(null);
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      setCoords({ lat, lon: lng });
    },
  });
  return position ? <Marker position={position} icon={customIcon} /> : null;
}

export default function WeatherPage({ user, logout }) {
  const navigate = useNavigate();
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);

  const fetchWeather = async () => {
    if (!coords) return;
    const res = await authFetch(
    `/weather?lat=${coords.lat}&lon=${coords.lon}`
    );

    if (!res) return; // authFetch przekierował na /login
    
    const data = await res.json();
    if (!data.daily) {
      alert("Nie udało się pobrać pogody.");
      console.error("Odpowiedź API:", data);
      return;
    }
    setWeather(data);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid #eee" }}>
        <h1 style={{ margin: 0 }}>Pogoda z mapy</h1>
        <div>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #1B3A5C",
                      backgroundColor: "#1B3A5C", color: "#fff", cursor: "pointer", marginRight: 8 }}
            >
              Panel admina
            </button>
          )}
          <button
            onClick={() => navigate("/settings")}
            style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #ccc",
                    backgroundColor: "#fff", cursor: "pointer", marginRight: 8 }}
          >
            ⚙️ Ustawienia
          </button>
          <span style={{ marginRight: 15 }}>
          👤 {user?.email}
          {user?.role === "premium" && (
            <span style={{ marginLeft: 6, fontSize: 12, backgroundColor: "#f0c040", padding: "2px 8px", borderRadius: 10 }}>
              PREMIUM
            </span>
          )}
          {user?.role === "admin" && (
            <span style={{ marginLeft: 6, fontSize: 12, backgroundColor: "#4A90E2", color: "white", padding: "2px 8px", borderRadius: 10 }}>
              ADMIN
            </span>
          )}
        </span>
          <button onClick={logout} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}>
            Wyloguj
          </button>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <MapContainer center={[50, 20]} zoom={6} style={{ height: "400px", width: "100%" }}>
          <TileLayer
            attribution="© OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker setCoords={setCoords} />
        </MapContainer>

        <button onClick={fetchWeather} style={{ marginTop: 10 }}>
          Pobierz pogodę
        </button>

        {weather && (
          <div style={{ marginTop: 20 }}>
            <h2>Prognoza {weather._meta?.forecast_days || 3} dni</h2>
            {weather.daily.time.slice(0, weather._meta?.forecast_days || 3).map((day, index) => {
              const code = weather.daily.weathercode[index];
              const isDangerous = [56, 57, 82, 95, 96, 99].includes(code);
              const info = weatherMap[code] || { label: "Nieznana", icon: "❓" };
              return (
                <div key={day} style={{ marginBottom: 15, padding: 10, borderRadius: 10, backgroundColor: isDangerous ? "#ffe5e5" : "#f5f5f5", border: isDangerous ? "2px solid red" : "1px solid #ddd" }}>
                  <p><b>{day}</b>{isDangerous && <span style={{ color: "red", marginLeft: 8 }}>⚠️</span>}</p>
                  <p style={{ fontSize: 22 }}>{info.icon} {info.label}</p>
                  <p>Max: {weather.daily.temperature_2m_max[index]}°C</p>
                  <p>Min: {weather.daily.temperature_2m_min[index]}°C</p>
                  {weather._meta?.premium && (
                    <>
                      {weather.daily.precipitation_sum?.[index] !== undefined && (
                        <p>🌧️ Opady: {weather.daily.precipitation_sum[index]} mm</p>
                      )}
                      {weather.daily.windspeed_10m_max?.[index] !== undefined && (
                        <p>💨 Wiatr: {weather.daily.windspeed_10m_max[index]} km/h</p>
                      )}
                    </>
                  )}
                  {isDangerous && <p style={{ color: "red", fontWeight: "bold" }}>Uwaga: niebezpieczne warunki pogodowe</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}