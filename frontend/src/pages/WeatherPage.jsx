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
          <h3 style={{ margin: 0, color: "#E0E0E0" }}>Zapisz lokalizację</h3>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>

        <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
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
    <div style={styles.pageContainer}>
      {/* Nagłówek */}
      <div style={styles.header}>
        <h1 style={{ margin: 0, color: "#E0E0E0" }}>Pogoda z mapy</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ marginRight: 8, color: "#A0A0A0" }}>
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
        {/* Kontener mapy z zaokrąglonymi rogami, by pasowało do nowoczesnego designu */}
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #333" }}>
          <MapContainer center={[50, 20]} zoom={6} style={{ height: "400px", width: "100%" }}>
            <TileLayer
              attribution="© OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker setCoords={setCoords} />
          </MapContainer>
        </div>

        {/* Przyciski akcji */}
        <div style={{ display: "flex", gap: 10, marginTop: 15, alignItems: "center" }}>
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
            <span style={{ color: "#2ecc71", fontSize: 14, fontWeight: "bold" }}>
              ✓ Lokalizacja zapisana!
            </span>
          )}
        </div>

        {/* Prognoza - układ kolumnowy */}
        {weather && (
          <div style={{ marginTop: 30 }}>
            <h2 style={{ color: "#E0E0E0", borderBottom: "1px solid #333", paddingBottom: "10px" }}>
              Prognoza na {weather._meta?.forecast_days || 3} dni
            </h2>
            
            {/* Tutaj dzieje się magia układu kolumnowego (Flexbox) */}
            <div style={styles.forecastGrid}>
              {weather.daily.time.slice(0, weather._meta?.forecast_days || 3).map((day, index) => {
                const code        = weather.daily.weathercode[index];
                const isDangerous = [56, 57, 82, 95, 96, 99].includes(code);
                const info        = weatherMap[code] || { label: "Nieznana", icon: "❓" };
                
                return (
                  <div key={day} style={{
                    ...styles.forecastCard,
                    backgroundColor: isDangerous ? "#2C1A1A" : "#1E1E1E", // Ciemna czerwień dla niebezpieczeństw
                    border: isDangerous ? "1px solid #e74c3c" : "1px solid #333",
                  }}>
                    <p style={{ margin: "0 0 10px 0", color: "#A0A0A0" }}>
                      <b>{day}</b>
                      {isDangerous && <span style={{ color: "#e74c3c", marginLeft: 8 }}>⚠️</span>}
                    </p>
                    <p style={{ fontSize: 24, margin: "10px 0", color: "#E0E0E0" }}>
                      {info.icon} {info.label}
                    </p>
                    <div style={{ display: "flex", gap: "15px", marginBottom: "10px", color: "#E0E0E0" }}>
                      <span>📈 Max: <b>{weather.daily.temperature_2m_max[index]}°C</b></span>
                      <span>📉 Min: <b>{weather.daily.temperature_2m_min[index]}°C</b></span>
                    </div>
                    
                    {weather._meta?.premium && (
                      <div style={{ color: "#A0A0A0", fontSize: "14px" }}>
                        {weather.daily.precipitation_sum?.[index] !== undefined && (
                          <p style={{ margin: "4px 0" }}>🌧️ Opady: {weather.daily.precipitation_sum[index]} mm</p>
                        )}
                        {weather.daily.windspeed_10m_max?.[index] !== undefined && (
                          <p style={{ margin: "4px 0" }}>💨 Wiatr: {weather.daily.windspeed_10m_max[index]} km/h</p>
                        )}
                      </div>
                    )}
                    {isDangerous && (
                      <p style={{ color: "#e74c3c", fontWeight: "bold", fontSize: "13px", marginTop: "10px" }}>
                        Uwaga: niebezpieczne warunki!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
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

// Zaktualizowane Style dla ciemnego motywu
const styles = {
  pageContainer: {
    minHeight: "100vh",
    backgroundColor: "#121212", // Główne ciemne tło strony
    color: "#E0E0E0", // Jasnoszary tekst
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "15px 20px", borderBottom: "1px solid #333", backgroundColor: "#1A1A1A"
  },
  forecastGrid: {
    display: "flex",       // Ustawia elementy w rzędzie
    flexWrap: "wrap",      // Jeśli zabraknie miejsca, przenosi do nowej linii
    gap: "20px",           // Odstępy między kafelkami
    marginTop: "20px"
  },
  forecastCard: {
    flex: "1 1 250px",     // Karta zajmuje wolną przestrzeń, minimalnie ma 250px szerokości
    padding: "20px", 
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
    transition: "transform 0.2s ease-in-out",
  },
  btn: {
    padding: "8px 16px", borderRadius: "8px", border: "1px solid #444",
    backgroundColor: "#2A2A2A", color: "#E0E0E0", cursor: "pointer", transition: "0.2s"
  },
  btnDark: {
    padding: "8px 16px", borderRadius: "8px", border: "none",
    backgroundColor: "#0f3460", color: "#fff", cursor: "pointer",
  },
  btnPrimary: {
    padding: "10px 20px", borderRadius: "8px", border: "none",
    backgroundColor: "#4A90E2", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: "bold"
  },
  btnSave: {
    padding: "10px 20px", borderRadius: "8px", border: "none",
    backgroundColor: "#27ae60", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: "bold"
  },
  badgePremium: {
    marginLeft: 6, fontSize: 12, backgroundColor: "#d4af37", color: "#000",
    padding: "3px 8px", borderRadius: 12, fontWeight: "bold"
  },
  badgeAdmin: {
    marginLeft: 6, fontSize: 12, backgroundColor: "#4A90E2",
    color: "white", padding: "3px 8px", borderRadius: 12, fontWeight: "bold"
  },
};

const modalStyles = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)", display: "flex", // Mocniejsze przyciemnienie tła
    alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    backgroundColor: "#1E1E1E", borderRadius: 12, padding: 28, // Ciemne tło modala
    width: 360, maxWidth: "90vw", border: "1px solid #333",
    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  },
  closeBtn: {
    background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888",
  },
  label: { fontSize: 13, fontWeight: "bold", color: "#A0A0A0", marginBottom: 6, display: "block" },
  input: {
    width: "100%", marginBottom: 16, padding: 12, borderRadius: 8,
    border: "1px solid #444", backgroundColor: "#2A2A2A", color: "#FFF", // Ciemne pola tekstowe
    fontSize: 14, boxSizing: "border-box", outline: "none",
  },
  btn: {
    padding: 12, borderRadius: 8, backgroundColor: "#4A90E2",
    color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: "bold"
  },
  cancelBtn: {
    padding: 12, borderRadius: 8, backgroundColor: "#2A2A2A",
    color: "#E0E0E0", border: "1px solid #444", cursor: "pointer", fontSize: 14, fontWeight: "bold"
  },
  error: {
    color: "#ff7675", backgroundColor: "#3A1C1C", border: "1px solid #e74c3c",
    padding: "10px", borderRadius: 8, marginBottom: 16, fontSize: 14,
  },
};