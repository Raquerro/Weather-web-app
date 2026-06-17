import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const getPasswordStrength = (password) => {
  if (password.length === 0) return null;
  if (password.length < 8)   return { label: "Za krótkie (min. 8 znaków)", color: "#ff7675", width: "25%" }; // Dopasowany jaśniejszy czerwony
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
     <div style={styles.pageContainer}>
      <div style={styles.card}>
        <h2 style={styles.title}>Rejestracja</h2>

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
          <div style={{ marginBottom: 16 }}>
            {/* Zmieniono tło paska na ciemnoszare (#333) */}
            <div style={{ height: 6, backgroundColor: "#333", borderRadius: 3, marginBottom: 6 }}>
              <div style={{ height: "100%", width: strength.width, backgroundColor: strength.color, borderRadius: 3, transition: "width 0.3s ease-in-out" }} />
            </div>
            <span style={{ fontSize: 12, color: strength.color, fontWeight: "bold" }}>{strength.label}</span>
          </div>
        )}

        <button
          style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Rejestrowanie..." : "Zarejestruj się"}
        </button>
        
        <p style={styles.text}>
          Masz już konto? <Link to="/login" style={styles.link}>Zaloguj się</Link>
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