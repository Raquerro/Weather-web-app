import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile, changePassword, getProfile } from "../services/settingsService";
import { getNotifications, updateNotification, deleteNotification } from "../services/settingsService";
import { authFetch } from "../services/authService";

const validate = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/[+\s-]/g, "");
  if (!/^\d+$/.test(digits) || digits.length < 7 || digits.length > 15)
    return "Podaj prawidłowy numer telefonu (7-15 cyfr)";
  return null;
};

const getPasswordStrength = (password) => {
  if (!password) return null;
  if (password.length < 8)  return { label: "Za krótkie", color: "#e74c3c", width: "25%" };
  if (password.length < 12) return { label: "Słabe",      color: "#e67e22", width: "50%" };
  if (password.length < 16) return { label: "Dobre",      color: "#2ecc71", width: "75%" };
  return                           { label: "Silne",       color: "#27ae60", width: "100%" };
};

export default function SettingsPage({ user, logout: handleLogout }) {
  const navigate  = useNavigate();
  const [loading, setLoading]   = useState(true);

  const canUseSms = user?.role === "premium" || user?.role === "admin";
  const isAdmin   = user?.role === "admin";

  // profil
  const [phone, setPhone]                       = useState("");
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [profileMsg, setProfileMsg]             = useState(null);
  const [profileLoading, setProfileLoading]     = useState(false);

  // hasło
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg]         = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notifError, setNotifError]       = useState(null);

  // SMS trigger (tylko admin)
  const [smsStatus, setSmsStatus] = useState(null); // null | "loading" | { sent, checked } | "error"

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProfile(user.user_id);
        setPhone(data.phone || "");
        setSmsNotifications(data.sms_notifications || false);
        const notifs = await getNotifications();
        setNotifications(notifs);
      } catch {
        // profil niedostępny
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.user_id]);

  const handleProfileSave = async () => {
    const phoneError = validate(phone);
    if (phoneError) { setProfileMsg({ type: "error", text: phoneError }); return; }
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      await updateProfile(user.user_id, {
        phone:             phone || null,
        sms_notifications: smsNotifications,
      });
      setProfileMsg({ type: "success", text: "Profil został zaktualizowany." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMsg(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "Wypełnij wszystkie pola." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Nowe hasła nie są identyczne." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Nowe hasło musi mieć co najmniej 8 znaków." });
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(user.user_id, currentPassword, newPassword);
      await handleLogout();
      navigate("/login?reason=password_changed");
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.message });
    } finally {
      setPasswordLoading(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleToggleNotif = async (id, currentActive) => {
    try {
      await updateNotification(id, { active: !currentActive });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, active: !currentActive } : n)
      );
    } catch (err) {
      setNotifError(err.message);
    }
  };

  const handleDeleteNotif = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      setNotifError(err.message);
    }
  };

  const handleTriggerSms = async () => {
    setSmsStatus("loading");
    try {
      const res = await authFetch("/admin/trigger-sms", { method: "POST" });
      if (!res || !res.ok) throw new Error("Błąd serwera");
      const data = await res.json();
      setSmsStatus(data);
      setTimeout(() => setSmsStatus(null), 5000);
    } catch {
      setSmsStatus("error");
      setTimeout(() => setSmsStatus(null), 4000);
    }
  };

  const strength = getPasswordStrength(newPassword);

  if (loading) return (
    <div style={{ padding: 40, color: "#E0E0E0", backgroundColor: "#121212", minHeight: "100vh" }}>
      Ładowanie...
    </div>
  );

  return (
    <div style={styles.pageContainer}>
      {/* Nagłówek */}
      <div style={styles.header}>
        <h1 style={{ margin: 0, color: "#E0E0E0" }}>Ustawienia konta</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#A0A0A0" }}>👤 {user?.email}</span>
          <button onClick={() => navigate("/")} style={styles.backBtn}>
            ← Wróć do mapy
          </button>
        </div>
      </div>

      <div style={styles.content}>

        {/* Sekcja: Profil */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Profil</h2>

          <label style={styles.label}>Adres email</label>
          <input
            style={{ ...styles.input, backgroundColor: "#1A1A1A", color: "#666", borderColor: "#333" }}
            value={user?.email}
            disabled
          />
          <p style={styles.hint}>Adres email nie może być zmieniony.</p>

          <label style={styles.label}>Numer telefonu</label>
          <input
            style={{ ...styles.input, opacity: canUseSms ? 1 : 0.5 }}
            type="tel"
            placeholder="+48 123 456 789"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={!canUseSms}
          />
          <p style={styles.hint}>Używany do powiadomień SMS o niebezpiecznych warunkach pogodowych.</p>

          <div style={{ ...styles.checkboxRow, opacity: canUseSms ? 1 : 0.5 }}>
            <input
              type="checkbox"
              id="sms"
              checked={smsNotifications}
              onChange={e => setSmsNotifications(e.target.checked)}
              style={{ marginRight: 8 }}
              disabled={!canUseSms}
            />
            <label htmlFor="sms">Włącz powiadomienia SMS o niebezpiecznych warunkach</label>
          </div>

          {!canUseSms && (
            <div style={{ padding: "10px", backgroundColor: "#332A18", borderRadius: "8px", border: "1px solid #d4af37", marginBottom: "16px" }}>
              <p style={{ color: "#d4af37", fontSize: 13, margin: 0 }}>
                ⭐ Funkcja powiadomień SMS jest dostępna tylko dla użytkowników <b>Premium</b>.
              </p>
            </div>
          )}

          {profileMsg && (
            <p style={profileMsg.type === "success" ? styles.success : styles.error}>
              {profileMsg.text}
            </p>
          )}

          <button
            onClick={handleProfileSave}
            disabled={profileLoading}
            style={{ ...styles.btn, opacity: profileLoading ? 0.7 : 1 }}
          >
            {profileLoading ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>

        {/* Sekcja: Zmiana hasła */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Zmiana hasła</h2>

          <input
            type="text"
            autoComplete="username"
            value={user?.email}
            readOnly
            style={{ display: "none" }}
          />

          <label style={styles.label}>Obecne hasło</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Obecne hasło"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />

          <label style={styles.label}>Nowe hasło</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Nowe hasło (min. 8 znaków)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />

          {strength && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 4, backgroundColor: "#333", borderRadius: 2, marginBottom: 4 }}>
                <div style={{ height: "100%", width: strength.width, backgroundColor: strength.color,
                              borderRadius: 2, transition: "width 0.3s" }} />
              </div>
              <span style={{ fontSize: 12, color: strength.color }}>{strength.label}</span>
            </div>
          )}

          <label style={styles.label}>Potwierdź nowe hasło</label>
          <input
            style={{
              ...styles.input,
              borderColor: confirmPassword && newPassword !== confirmPassword ? "#e74c3c" : "#444"
            }}
            type="password"
            placeholder="Powtórz nowe hasło"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p style={{ color: "#e74c3c", fontSize: 12, marginTop: -8, marginBottom: 8 }}>
              Hasła nie są identyczne
            </p>
          )}

          {passwordMsg && (
            <p style={passwordMsg.type === "success" ? styles.success : styles.error}>
              {passwordMsg.text}
            </p>
          )}

          <p style={styles.hint}>
            Po zmianie hasła zostaniesz wylogowany ze wszystkich urządzeń.
          </p>

          <button
            onClick={handlePasswordChange}
            disabled={passwordLoading}
            style={{ ...styles.btn, opacity: passwordLoading ? 0.7 : 1 }}
          >
            {passwordLoading ? "Zmienianie..." : "Zmień hasło"}
          </button>
        </div>

        {/* Sekcja: Moje lokalizacje */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            Moje lokalizacje powiadomień
            <span style={{ fontSize: 13, fontWeight: "normal", color: "#A0A0A0", marginLeft: 8 }}>
              ({notifications.length}/5)
            </span>
          </h2>

          {notifError && <p style={styles.error}>{notifError}</p>}

          {notifications.length === 0 ? (
            <p style={{ color: "#A0A0A0", fontSize: 14 }}>
              Brak zapisanych lokalizacji. Wróć na mapę i kliknij 📌 Zapisz lokalizację.
            </p>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", borderRadius: 8, marginBottom: 8,
                backgroundColor: n.active ? "#1E3A2A" : "#2A2A2A",
                border: `1px solid ${n.active ? "#27ae60" : "#444"}`,
              }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: 14, color: "#E0E0E0" }}>{n.name}</div>
                  <div style={{ fontSize: 12, color: "#A0A0A0" }}>
                    {Number(n.latitude).toFixed(4)}, {Number(n.longitude).toFixed(4)}
                    {" · "}powiadomienie o {String(n.notify_hour).padStart(2, "0")}:00
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleToggleNotif(n.id, n.active)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                      backgroundColor: n.active ? "#27ae60" : "#555", color: "#fff", fontSize: 12,
                      fontWeight: "bold"
                    }}
                  >
                    {n.active ? "Aktywna" : "Nieaktywna"}
                  </button>
                  <button
                    onClick={() => handleDeleteNotif(n.id)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      backgroundColor: "#5C1C1C", color: "#ff7675", cursor: "pointer", fontSize: 12,
                      fontWeight: "bold"
                    }}
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))
          )}

          <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
            Możesz zapisać maksymalnie 5 lokalizacji. Powiadomienia SMS wysyłane są codziennie
            o wybranej godzinie jeśli prognoza przewiduje niebezpieczne warunki.
          </p>
        </div>

        {/* Sekcja: Panel SMS — tylko admin */}
        {isAdmin && (
          <div style={{ ...styles.card, borderColor: "#4A90E244", boxShadow: "0 0 16px #4A90E211" }}>
            <h2 style={styles.cardTitle}>
              🛠️ Panel administratora
              <span style={{
                marginLeft: 10, fontSize: 11, fontWeight: "bold",
                backgroundColor: "#4A90E222", color: "#4A90E2",
                border: "1px solid #4A90E266", borderRadius: 6,
                padding: "2px 8px", verticalAlign: "middle",
              }}>
                ADMIN
              </span>
            </h2>

            <p style={{ color: "#A0A0A0", fontSize: 13, marginTop: 0, marginBottom: 20 }}>
              Ręcznie wywołaj sprawdzenie pogody i wysyłkę SMS-ów do wszystkich użytkowników
              z włączonymi powiadomieniami i zapisanymi lokalizacjami.
            </p>

            <button
              onClick={handleTriggerSms}
              disabled={smsStatus === "loading"}
              style={{
                ...styles.btn,
                opacity: smsStatus === "loading" ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 8, width: "fit-content",
              }}
            >
              {smsStatus === "loading" ? "⏳ Sprawdzanie pogody..." : "📨 Wyślij powiadomienia SMS teraz"}
            </button>

            {smsStatus && smsStatus !== "loading" && smsStatus !== "error" && (
              <div style={{ ...styles.success, marginTop: 12, marginBottom: 0 }}>
                ✅ Wysłano <b>{smsStatus.sent}</b> SMS-ów (sprawdzono <b>{smsStatus.checked}</b> użytkowników)
              </div>
            )}
            {smsStatus === "error" && (
              <div style={{ ...styles.error, marginTop: 12, marginBottom: 0 }}>
                ❌ Błąd połączenia z serwisem SMS — sprawdź czy docker compose działa
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: "100vh",
    backgroundColor: "#121212",
    color: "#E0E0E0",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "15px 20px", borderBottom: "1px solid #333", backgroundColor: "#1A1A1A",
  },
  content: {
    padding: 20, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start",
  },
  card: {
    flex: 1, minWidth: 300, maxWidth: 480, padding: 24,
    borderRadius: "12px", backgroundColor: "#1E1E1E", border: "1px solid #333",
    boxShadow: "0 4px 6px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column",
  },
  cardTitle: {
    fontSize: 18, fontWeight: "bold", color: "#E0E0E0",
    marginBottom: 16, marginTop: 0, borderBottom: "1px solid #333", paddingBottom: "10px",
  },
  label:       { fontSize: 13, fontWeight: "bold", color: "#A0A0A0", marginBottom: 6 },
  input: {
    marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: "#2A2A2A",
    border: "1px solid #444", color: "#FFF", fontSize: 14, width: "100%",
    boxSizing: "border-box", outline: "none",
  },
  hint:         { fontSize: 12, color: "#888", marginTop: -8, marginBottom: 16 },
  checkboxRow:  { display: "flex", alignItems: "center", marginBottom: 16, fontSize: 14, color: "#E0E0E0" },
  btn: {
    padding: "10px 20px", borderRadius: 8, backgroundColor: "#4A90E2",
    color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: "bold", marginTop: 4,
  },
  error: {
    color: "#ff7675", backgroundColor: "#3A1C1C", border: "1px solid #e74c3c",
    padding: "10px", borderRadius: 8, marginBottom: 16, fontSize: 14,
  },
  success: {
    color: "#2ecc71", backgroundColor: "#1E3A2A", border: "1px solid #27ae60",
    padding: "10px", borderRadius: 8, marginBottom: 16, fontSize: 14,
  },
  backBtn: {
    padding: "8px 16px", borderRadius: 8,
    border: "1px solid #444", backgroundColor: "#2A2A2A", color: "#E0E0E0", cursor: "pointer",
  },
};