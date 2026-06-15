import { useState } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { authFetch } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { createNotification } from "../services/settingsService";

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

// Modal zapisu lokalizacji
function SaveLocationModal({ coords, onSave, onClose }) {
  const [name, setName]       = useState("");
  const [hour, setHour]       = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSave = async () => {
    if (!name.trim()) { setError("Podaj nazwę lokalizacji."); return; }
    setLoading(true);
    setError(null);
    try {
      await createNotification({
        name:        name.trim(),
        latitude:    coords.lat,
        longitude:   coords.lon,
        active:      true,
        notify_hour: hour,
      });
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Zapisz lokalizację</h3>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>

        <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
          📍 {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
        </p>

        {error && <p style={modalStyles.error}>{error}</p>}

        <label style={modalStyles.label}>Nazwa lokalizacji</label>
        <input
          style={modalStyles.input}
          placeholder='np. "Dom", "Praca"'
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          autoFocus
        />

        <label style={modalStyles.label}>Godzina powiadomienia</label>
        <select
          style={modalStyles.input}
          value={hour}
          onChange={e => setHour(Number(e.target.value))}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{ ...modalStyles.btn, flex: 1, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Zapisywanie..." : "Zapisz"}
          </button>
          <button onClick={onClose} style={modalStyles.cancelBtn}>
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WeatherPage({ user, logout }) {
  const navigate = useNavigate();
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSuccess, setSaveSuccess]     = useState(false);

  const fetchWeather = async () => {
    if (!coords) return;
    const res = await authFetch(`/weather?lat=${coords.lat}&lon=${coords.lon}`);
    if (!res) return;
    const data = await res.json();
    if (!data.daily) {
      alert("Nie udało się pobrać pogody.");
      console.error("Odpowiedź API:", data);
      return;
    }
    setWeather(data);
  };

  const handleSaveSuccess = () => {
    setShowSaveModal(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };


  return (
    <div>
      {/* Nagłówek */}
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Pogoda z mapy</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ marginRight: 8 }}>
            👤 {user?.email}
            {user?.role === "premium" && (
              <span style={styles.badgePremium}>PREMIUM</span>
            )}
            {user?.role === "admin" && (
              <span style={styles.badgeAdmin}>ADMIN</span>
            )}
          </span>
          <button onClick={() => navigate("/settings")} style={styles.btn}>
            ⚙️ Ustawienia
          </button>
          {user?.role === "admin" && (
            <button onClick={() => navigate("/admin")} style={styles.btnDark}>
              Panel admina
            </button>
          )}
          <button onClick={logout} style={styles.btn}>
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

        {/* Przyciski akcji */}
        <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
          <button
            onClick={fetchWeather}
            disabled={!coords}
            style={{ ...styles.btnPrimary, opacity: coords ? 1 : 0.5 }}
          >
            Pobierz pogodę
          </button>

          {coords && (
            <button
              onClick={() => setShowSaveModal(true)}
              style={styles.btnSave}
            >
              📌 Zapisz lokalizację
            </button>
          )}

          {saveSuccess && (
            <span style={{ color: "#27ae60", fontSize: 14 }}>
              ✓ Lokalizacja zapisana!
            </span>
          )}
        </div>

        {/* Prognoza */}
        {weather && (
          <div style={{ marginTop: 20 }}>
            <h2>Prognoza {weather._meta?.forecast_days || 3} dni</h2>
            {weather.daily.time.slice(0, weather._meta?.forecast_days || 3).map((day, index) => {
              const code        = weather.daily.weathercode[index];
              const isDangerous = [56, 57, 82, 95, 96, 99].includes(code);
              const info        = weatherMap[code] || { label: "Nieznana", icon: "❓" };
              return (
                <div key={day} style={{
                  marginBottom: 15, padding: 10, borderRadius: 10,
                  backgroundColor: isDangerous ? "#ffe5e5" : "#f5f5f5",
                  border: isDangerous ? "2px solid red" : "1px solid #ddd",
                }}>
                  <p>
                    <b>{day}</b>
                    {isDangerous && <span style={{ color: "red", marginLeft: 8 }}>⚠️</span>}
                  </p>
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
                  {isDangerous && (
                    <p style={{ color: "red", fontWeight: "bold" }}>
                      Uwaga: niebezpieczne warunki pogodowe
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal zapisu */}
      {showSaveModal && (
        <SaveLocationModal
          coords={coords}
          onSave={handleSaveSuccess}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}

const styles = {
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 20px", borderBottom: "1px solid #eee",
  },
  btn: {
    padding: "6px 14px", borderRadius: 6, border: "1px solid #ccc",
    backgroundColor: "#fff", cursor: "pointer",
  },
  btnDark: {
    padding: "6px 14px", borderRadius: 6, border: "none",
    backgroundColor: "#1B3A5C", color: "#fff", cursor: "pointer",
  },
  btnPrimary: {
    padding: "8px 18px", borderRadius: 6, border: "none",
    backgroundColor: "#4A90E2", color: "#fff", cursor: "pointer", fontSize: 14,
  },
  btnSave: {
    padding: "8px 18px", borderRadius: 6, border: "none",
    backgroundColor: "#27ae60", color: "#fff", cursor: "pointer", fontSize: 14,
  },
  badgePremium: {
    marginLeft: 6, fontSize: 12, backgroundColor: "#f0c040",
    padding: "2px 8px", borderRadius: 10,
  },
  badgeAdmin: {
    marginLeft: 6, fontSize: 12, backgroundColor: "#4A90E2",
    color: "white", padding: "2px 8px", borderRadius: 10,
  },
};

const modalStyles = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff", borderRadius: 12, padding: 28,
    width: 360, maxWidth: "90vw",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  closeBtn: {
    background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888",
  },
  label: { fontSize: 13, fontWeight: "bold", color: "#555", marginBottom: 4, display: "block" },
  input: {
    width: "100%", marginBottom: 14, padding: 10, borderRadius: 6,
    border: "1px solid #ccc", fontSize: 14, boxSizing: "border-box",
  },
  btn: {
    padding: 10, borderRadius: 6, backgroundColor: "#4A90E2",
    color: "#fff", border: "none", cursor: "pointer", fontSize: 14,
  },
  cancelBtn: {
    padding: 10, borderRadius: 6, backgroundColor: "#f5f5f5",
    color: "#333", border: "1px solid #ccc", cursor: "pointer", fontSize: 14,
  },
  error: {
    color: "#c0392b", backgroundColor: "#fdecea",
    padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 14,
  },
};