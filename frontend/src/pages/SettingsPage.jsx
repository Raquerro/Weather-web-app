import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile, changePassword, getProfile } from "../services/settingsService";

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

  // profil
  const [phone, setPhone]                     = useState("");
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [profileMsg, setProfileMsg]           = useState(null);
  const [profileLoading, setProfileLoading]   = useState(false);

  // hasło
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg]         = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProfile(user.user_id);
        setPhone(data.phone || "");
        setSmsNotifications(data.sms_notifications || false);
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
      // po zmianie hasła wyloguj – serwer unieważnił sesje
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

  const strength = getPasswordStrength(newPassword);

  if (loading) return <div style={{ padding: 40 }}>Ładowanie...</div>;

  return (
    <div>
      {/* Nagłówek */}
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Ustawienia konta</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#666" }}>👤 {user?.email}</span>
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
            style={{ ...styles.input, backgroundColor: "#f5f5f5", color: "#888" }}
            value={user?.email}
            disabled
          />
          <p style={styles.hint}>Adres email nie może być zmieniony.</p>

          <label style={styles.label}>Numer telefonu</label>
          <input
            style={styles.input}
            type="tel"
            placeholder="+48 123 456 789"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
          <p style={styles.hint}>Używany do powiadomień SMS o niebezpiecznych warunkach pogodowych.</p>

          <div style={styles.checkboxRow}>
            <input
              type="checkbox"
              id="sms"
              checked={smsNotifications}
              onChange={e => setSmsNotifications(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <label htmlFor="sms">Włącz powiadomienia SMS o niebezpiecznych warunkach</label>
          </div>

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
              <div style={{ height: 4, backgroundColor: "#eee", borderRadius: 2, marginBottom: 4 }}>
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
              borderColor: confirmPassword && newPassword !== confirmPassword ? "#e74c3c" : "#ccc"
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

      </div>
    </div>
  );
}

const styles = {
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 20px", borderBottom: "1px solid #eee",
  },
  content: {
    padding: 20, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start",
  },
  card: {
    flex: 1, minWidth: 300, maxWidth: 480, padding: 24,
    borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    display: "flex", flexDirection: "column",
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#1B3A5C", marginBottom: 16, marginTop: 0 },
  label: { fontSize: 13, fontWeight: "bold", color: "#555", marginBottom: 4 },
  input: {
    marginBottom: 12, padding: 10, borderRadius: 6,
    border: "1px solid #ccc", fontSize: 14, width: "100%", boxSizing: "border-box",
  },
  hint: { fontSize: 12, color: "#888", marginTop: -8, marginBottom: 12 },
  checkboxRow: { display: "flex", alignItems: "center", marginBottom: 16, fontSize: 14 },
  btn: {
    padding: "10px 20px", borderRadius: 6, backgroundColor: "#4A90E2",
    color: "#fff", border: "none", cursor: "pointer", fontSize: 15, marginTop: 4,
  },
  error: {
    color: "#c0392b", backgroundColor: "#fdecea",
    padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 14,
  },
  success: {
    color: "#27ae60", backgroundColor: "#eafaf1",
    padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 14,
  },
  backBtn: {
    padding: "6px 14px", borderRadius: 6,
    border: "1px solid #ccc", backgroundColor: "#fff", cursor: "pointer",
  },
};