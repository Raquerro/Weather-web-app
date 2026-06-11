import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, getStats, updateRole, toggleActive } from "../services/adminService";

const ROLE_LABELS = { user: "Użytkownik", premium: "Premium", admin: "Admin" };
const ROLE_COLORS = { user: "#888", premium: "#f0a500", admin: "#4A90E2" };

function StatCard({ label, value, color = "#4A90E2" }) {
  return (
    <div style={{ flex: 1, padding: 20, borderRadius: 10, backgroundColor: "#f8f9fa", border: `2px solid ${color}`, textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: "bold", color }}>{value}</div>
      <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function UserModal({ user, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Szczegóły użytkownika</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["ID", user.id],
              ["Email", user.email],
              ["Rola", ROLE_LABELS[user.role] || user.role],
              ["Status", user.is_active ? "✅ Aktywne" : "🚫 Zablokowane"],
              ["Telefon", user.phone || "—"],
              ["Powiadomienia SMS", user.sms_notifications ? "Włączone" : "Wyłączone"],
              ["Liczba logowań", user.login_count ?? "—"],
              ["Ostatnie logowanie", user.last_login ? new Date(user.last_login).toLocaleString("pl-PL") : "—"],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 8px", fontWeight: "bold", color: "#555", width: "45%" }}>{label}</td>
                <td style={{ padding: "10px 8px" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage({ user }) {
  const navigate = useNavigate();
  const [users, setUsers]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, statsData] = await Promise.all([getUsers(), getStats()]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(`role-${userId}`);
    try {
      const updated = await updateRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (userId) => {
    setActionLoading(`active-${userId}`);
    try {
      const updated = await toggleActive(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      {/* Nagłówek */}
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Panel administratora</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#666" }}>👤 {user?.email}</span>
          <button onClick={() => navigate("/")} style={styles.backBtn}>
            ← Wróć do mapy
          </button>
        </div>
      </div>

      <div style={{ padding: 20 }}>

        {/* Błąd */}
        {error && (
          <div style={styles.error}>
            {error}
            <button onClick={loadData} style={{ marginLeft: 12, cursor: "pointer" }}>Spróbuj ponownie</button>
          </div>
        )}

        {/* Statystyki */}
        {stats && (
          <div style={{ marginBottom: 30 }}>
            <h2 style={styles.sectionTitle}>Statystyki</h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <StatCard label="Wszyscy użytkownicy" value={stats.total_users} color="#4A90E2" />
              <StatCard label="Aktywni użytkownicy" value={stats.active_users} color="#2ecc71" />
              <StatCard label="Użytkownicy (user)" value={stats.by_role?.user ?? 0} color="#888" />
              <StatCard label="Premium" value={stats.by_role?.premium ?? 0} color="#f0a500" />
              <StatCard label="Administratorzy" value={stats.by_role?.admin ?? 0} color="#e74c3c" />
            </div>
          </div>
        )}

        {/* Lista użytkowników */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Użytkownicy</h2>
            <button onClick={loadData} style={styles.refreshBtn} disabled={loading}>
              {loading ? "Ładowanie..." : "↻ Odśwież"}
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#888" }}>Ładowanie użytkowników...</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr style={{ backgroundColor: "#1B3A5C" }}>
                    {["ID", "Email", "Rola", "Status", "Ostatnie logowanie", "Akcje"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ backgroundColor: i % 2 === 0 ? "#f8f9fa" : "#fff" }}>
                      <td style={styles.td}>{u.id}</td>
                      <td style={styles.td}>{u.email}</td>

                      {/* Zmiana roli */}
                      <td style={styles.td}>
                        {u.id === user?.user_id || u.email === user?.email ? (
                          <span style={{ ...styles.roleBadge, backgroundColor: ROLE_COLORS[u.role] }}>
                            {ROLE_LABELS[u.role]}
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={actionLoading === `role-${u.id}`}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            style={styles.select}
                          >
                            <option value="user">Użytkownik</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>

                      {/* Status */}
                      <td style={styles.td}>
                        <span style={{ color: u.is_active ? "#2ecc71" : "#e74c3c", fontWeight: "bold" }}>
                          {u.is_active ? "✅ Aktywne" : "🚫 Zablokowane"}
                        </span>
                      </td>

                      {/* Ostatnie logowanie */}
                      <td style={styles.td}>
                        {u.last_login
                          ? new Date(u.last_login).toLocaleString("pl-PL")
                          : "—"}
                      </td>

                      {/* Akcje */}
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setSelected(u)}
                            style={styles.detailsBtn}
                          >
                            Szczegóły
                          </button>
                          {u.email !== user?.email && (
                            <button
                              onClick={() => handleToggleActive(u.id)}
                              disabled={actionLoading === `active-${u.id}`}
                              style={u.is_active ? styles.blockBtn : styles.unblockBtn}
                            >
                              {actionLoading === `active-${u.id}`
                                ? "..."
                                : u.is_active ? "Zablokuj" : "Odblokuj"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal szczegółów */}
      {selected && <UserModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const styles = {
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 20px", borderBottom: "1px solid #eee", backgroundColor: "#fff",
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1B3A5C", marginBottom: 12 },
  error: {
    backgroundColor: "#fdecea", color: "#c0392b", padding: "10px 16px",
    borderRadius: 8, marginBottom: 20,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    padding: "10px 12px", textAlign: "left", color: "#fff",
    fontWeight: "bold", fontSize: 13,
  },
  td: { padding: "10px 12px", borderBottom: "1px solid #eee" },
  select: {
    padding: "4px 8px", borderRadius: 6, border: "1px solid #ccc",
    fontSize: 13, cursor: "pointer",
  },
  roleBadge: {
    padding: "3px 10px", borderRadius: 12, color: "#fff",
    fontSize: 12, fontWeight: "bold",
  },
  detailsBtn: {
    padding: "4px 10px", borderRadius: 6, border: "1px solid #4A90E2",
    backgroundColor: "#fff", color: "#4A90E2", cursor: "pointer", fontSize: 13,
  },
  blockBtn: {
    padding: "4px 10px", borderRadius: 6, border: "none",
    backgroundColor: "#e74c3c", color: "#fff", cursor: "pointer", fontSize: 13,
  },
  unblockBtn: {
    padding: "4px 10px", borderRadius: 6, border: "none",
    backgroundColor: "#2ecc71", color: "#fff", cursor: "pointer", fontSize: 13,
  },
  backBtn: {
    padding: "6px 14px", borderRadius: 6, border: "1px solid #ccc",
    backgroundColor: "#fff", cursor: "pointer",
  },
  refreshBtn: {
    padding: "6px 14px", borderRadius: 6, border: "1px solid #4A90E2",
    backgroundColor: "#fff", color: "#4A90E2", cursor: "pointer",
  },
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff", borderRadius: 12, padding: 30,
    width: 480, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  closeBtn: {
    background: "none", border: "none", fontSize: 18,
    cursor: "pointer", color: "#888",
  },
};