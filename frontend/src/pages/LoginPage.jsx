import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage({ login }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Logowanie</h2>
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
        />
        <button style={styles.button} onClick={handleSubmit}>
          Zaloguj się
        </button>
        <p style={{ marginTop: 10 }}>
          Nie masz konta? <Link to="/register">Zarejestruj się</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", marginTop: 80 },
  card: { display: "flex", flexDirection: "column", width: 320, padding: 30, borderRadius: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" },
  input: { marginBottom: 12, padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 },
  button: { padding: 10, borderRadius: 6, backgroundColor: "#4A90E2", color: "white", border: "none", cursor: "pointer", fontSize: 15 },
  error: { color: "red", marginBottom: 10 },
};