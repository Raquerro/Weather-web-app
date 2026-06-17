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
    password_changed: "Hasło zostało zmienione. Zaloguj się używając nowego hasła.",
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
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <h2 style={styles.title}>Logowanie</h2>

        {sessionMessage && <p style={styles.warning}>{sessionMessage}</p>}
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
        <p style={styles.text}>
          Nie masz konta? <Link to="/register" style={styles.link}>Zarejestruj się</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: { 
    minHeight: "100vh", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#121212",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: { 
    display: "flex", 
    flexDirection: "column", 
    width: 360, 
    padding: 32, 
    borderRadius: "12px", 
    backgroundColor: "#1E1E1E",
    border: "1px solid #333",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    boxSizing: "border-box"
  },
  title: {
    marginBottom: 24,
    color: "#E0E0E0",
    textAlign: "center",
    marginTop: 0
  },
  input: { 
    marginBottom: 16, 
    padding: 12, 
    borderRadius: 8, 
    backgroundColor: "#2A2A2A",
    border: "1px solid #444",
    color: "#FFF",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    width: "100%"
  },
  button: { 
    padding: "12px", 
    borderRadius: 8, 
    backgroundColor: "#4A90E2", 
    color: "white", 
    border: "none", 
    cursor: "pointer", 
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 8,
    transition: "background-color 0.2s"
  },
  error: { 
    color: "#ff7675", 
    backgroundColor: "#3A1C1C", 
    border: "1px solid #e74c3c",
    padding: "10px", 
    borderRadius: 8, 
    marginBottom: 16, 
    fontSize: 14,
    textAlign: "center"
  },
  warning: { 
    color: "#f1c40f", 
    backgroundColor: "#332A18", 
    border: "1px solid #d4af37",
    padding: "10px", 
    borderRadius: 8, 
    marginBottom: 16, 
    fontSize: 14,
    textAlign: "center"
  },
  text: {
    marginTop: 20,
    textAlign: "center",
    color: "#A0A0A0",
    fontSize: 14
  },
  link: {
    color: "#4A90E2",
    textDecoration: "none",
    fontWeight: "bold"
  }
};