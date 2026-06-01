import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

export default function LoginPage({ login }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const sessionMessages = {
    session_expired: "Twoja sesja wygasła. Zaloguj się ponownie.",
  };
  const sessionMessage = sessionMessages[searchParams.get("reason")]; 

  const validate = (email, password) => {
  if (!email || !password) return "Wypełnij wszystkie pola.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Podaj prawidłowy adres email.";
  return null;
};

  const handleSubmit = async () => {
    const validationError = validate(email, password);
    if (validationError) { setError(validationError); return; }
    setError(null);
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
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
        <h2 style={{ marginBottom: 20 }}>Logowanie</h2>

        {sessionMessage && (
          <p style={styles.warning}>{sessionMessage}</p>
        )}

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
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Logowanie..." : "Zaloguj się"}
        </button>
        <p style={{ marginTop: 12, textAlign: "center" }}>
          Nie masz konta? <Link to="/register">Zarejestruj się</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", marginTop: 80 },
  card: { display: "flex", flexDirection: "column", width: 340, padding: 30, borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  input: { marginBottom: 12, padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 },
  button: { padding: 10, borderRadius: 6, backgroundColor: "#4A90E2", color: "white", border: "none", cursor: "pointer", fontSize: 15 },
  error: { color: "#c0392b", backgroundColor: "#fdecea", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 14 },
  warning: { color: "#856404", backgroundColor: "#fff3cd", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 14 },
};