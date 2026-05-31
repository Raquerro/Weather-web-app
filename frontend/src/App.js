import { useState } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import L from "leaflet";

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

  return position ? (
      <Marker position={position} icon={customIcon}></Marker>
  ) : null;
}

function App() {
  const [coords, setCoords] = useState(null);
  const [weather, setWeather] = useState(null);

  const fetchWeather = async () => {
  if (!coords) return;

  const res = await fetch(
    `http://127.0.0.1:8000/weather?lat=${coords.lat}&lon=${coords.lon}`
  );
  const data = await res.json();

  if (!data.daily) {
    alert("Nie udało się pobrać pogody. Sprawdź konsolę.");
    console.error("Odpowiedź API:", data);
    return;
  }

  setWeather(data);
  };

  return (
    <div>
      <h1>Pogoda z mapy</h1>

      <MapContainer
        center={[50, 20]}
        zoom={6}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          attribution='© OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker setCoords={setCoords} />
      </MapContainer>

      <button onClick={fetchWeather} style={{ marginTop: 10 }}>
        Pobierz pogodę
      </button>

    {weather && (
      <div style={{ marginTop: 20 }}>
        <h2>Prognoza 3 dni</h2>

        {weather.daily.time.slice(0, 3).map((day, index) => {
          const code = weather.daily.weathercode[index];
          const isDangerous = [56, 57, 82, 95, 96, 99].includes(code);
          const info = weatherMap[code] || { label: "Nieznana", icon: "❓" };

          return (
              <div
                key={day}
                style={{
                  marginBottom: 15,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: isDangerous ? "#ffe5e5" : "#f5f5f5",
                  border: isDangerous ? "2px solid red" : "1px solid #ddd",
                }}
              >
                <p>
                  <b>{day}</b>
                  {isDangerous && (
                    <span style={{ color: "red", marginLeft: 8 }}>
                      ⚠️
                    </span>
                  )}
                </p>

                <p style={{ fontSize: 22 }}>
                  {info.icon} {info.label}
                </p>

                <p>Max: {weather.daily.temperature_2m_max[index]}°C</p>
                <p>Min: {weather.daily.temperature_2m_min[index]}°C</p>

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
  );
}

export default App;