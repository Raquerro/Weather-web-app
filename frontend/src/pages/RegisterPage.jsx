import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const getPasswordStrength = (password) => {
  if (password.length === 0) return null;
  if (password.length < 8)   return { label: "Za krótkie (min. 8 znaków)", color: "#e74c3c", width: "25%" };
  if (password.length < 12)  return { label: "Słabe", color: "#e67e22", width: "50%" };
  if (password.length < 16)  return { label: "Dobre", color: "#2ecc71", width: "75%" };
  return                             { label: "Silne",  color: "#27ae60", width: "100%" };
};

const validate = (email, password) => {
  if (!email || !password) return "Wypełnij wszystkie pola.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Podaj prawidłowy adres email.";
  if (password.length < 8)  return "Hasło musi mieć co najmniej 8 znaków.";
  if (password.length > 72) return "Hasło nie może być dłuższe niż 72 znaki.";
  return null;
};

export default function RegisterPage({ register }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);


  const handleSubmit = async () => {
    const validationError = validate(email, password);
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      await register(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
     <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ marginBottom: 20 }}>Rejestracja</h2>

        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Hasło (min. 8 znaków)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        {strength && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 4, backgroundColor: "#eee", borderRadius: 2, marginBottom: 4 }}>
              <div style={{ height: "100%", width: strength.width, backgroundColor: strength.color, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 12, color: strength.color }}>{strength.label}</span>
          </div>
        )}

        <button
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Rejestrowanie..." : "Zarejestruj się"}
        </button>
        <p style={{ marginTop: 12, textAlign: "center" }}>
          Masz już konto? <Link to="/login">Zaloguj się</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", marginTop: 80 },
  card:      { display: "flex", flexDirection: "column", width: 340, padding: 30, borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  input:     { marginBottom: 12, padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 },
  button:    { padding: 10, borderRadius: 6, backgroundColor: "#4A90E2", color: "white", border: "none", cursor: "pointer", fontSize: 15 },
  error:     { color: "#c0392b", backgroundColor: "#fdecea", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 14 },
};