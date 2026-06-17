import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, getStats, updateRole, toggleActive } from "../services/adminService";

const ROLE_LABELS = { user: "Użytkownik", premium: "Premium", admin: "Admin" };
const ROLE_COLORS = { user: "#888", premium: "#f0a500", admin: "#4A90E2" };

function StatCard({ label, value, color = "#4A90E2" }) {
  return (
    <div style={{
      flex: 1,
      padding: 20,
      borderRadius: 10,
      backgroundColor: "#1E1E1E",
      border: `1px solid ${color}33`,
      textAlign: "center",
      boxShadow: `0 0 12px ${color}22`,
    }}>
      <div style={{ fontSize: 32, fontWeight: "bold", color }}>{value}</div>
      <div style={{ fontSize: 13, color: "#A0A0A0", marginTop: 6 }}>{label}</div>
    </div>
  );
}

function UserModal({ user, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: "#E0E0E0" }}>Szczegóły użytkownika</h3>
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
              <tr key={label} style={{ borderBottom: "1px solid #2A2A2A" }}>
                <td style={{ padding: "10px 8px", fontWeight: "bold", color: "#A0A0A0", width: "45%", fontSize: 13 }}>{label}</td>
                <td style={{ padding: "10px 8px", color: "#E0E0E0", fontSize: 13 }}>{value}</td>
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
  const [users, setUsers]       = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadData(); }, []);

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
    <div style={styles.pageWrapper}>
      {/* Nagłówek */}
      <div style={styles.header}>
        <h1 style={{ margin: 0, fontSize: 20, color: "#E0E0E0" }}>Panel administratora</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#A0A0A0", fontSize: 14 }}>👤 {user?.email}</span>
          <button onClick={() => navigate("/")} style={styles.backBtn}>
            ← Wróć do mapy
          </button>
        </div>
      </div>

      <div style={{ padding: 24 }}>

        {/* Błąd */}
        {error && (
          <div style={styles.error}>
            {error}
            <button
              onClick={loadData}
              style={{ marginLeft: 12, cursor: "pointer", color: "#ff7675", background: "none", border: "none", fontSize: 13 }}
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {/* Statystyki */}
        {stats && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={styles.sectionTitle}>Statystyki</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <StatCard label="Wszyscy użytkownicy"  value={stats.total_users}         color="#4A90E2" />
              <StatCard label="Aktywni użytkownicy"  value={stats.active_users}        color="#2ecc71" />
              <StatCard label="Użytkownicy (user)"   value={stats.by_role?.user ?? 0}  color="#888"    />
              <StatCard label="Premium"              value={stats.by_role?.premium ?? 0} color="#f0a500" />
              <StatCard label="Administratorzy"      value={stats.by_role?.admin ?? 0} color="#e74c3c" />
            </div>
          </div>
        )}

        {/* Lista użytkowników */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Użytkownicy</h2>
            <button onClick={loadData} style={styles.refreshBtn} disabled={loading}>
              {loading ? "Ładowanie..." : "↻ Odśwież"}
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#A0A0A0" }}>Ładowanie użytkowników...</p>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #2A2A2A" }}>
              <table style={styles.table}>
                <thead>
                  <tr style={{ backgroundColor: "#252525" }}>
                    {["ID", "Email", "Rola", "Status", "Ostatnie logowanie", "Akcje"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      style={{ backgroundColor: i % 2 === 0 ? "#1A1A1A" : "#1E1E1E" }}
                    >
                      <td style={styles.td}><span style={{ color: "#A0A0A0" }}>{u.id}</span></td>
                      <td style={styles.td}>{u.email}</td>

                      {/* Zmiana roli */}
                      <td style={styles.td}>
                        {u.id === user?.user_id || u.email === user?.email ? (
                          <span style={{ ...styles.roleBadge, backgroundColor: ROLE_COLORS[u.role] + "33", color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}66` }}>
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
                        <span style={{ color: u.is_active ? "#2ecc71" : "#e74c3c", fontWeight: "bold", fontSize: 13 }}>
                          {u.is_active ? "✅ Aktywne" : "🚫 Zablokowane"}
                        </span>
                      </td>

                      {/* Ostatnie logowanie */}
                      <td style={{ ...styles.td, color: "#A0A0A0" }}>
                        {u.last_login ? new Date(u.last_login).toLocaleString("pl-PL") : "—"}
                      </td>

                      {/* Akcje */}
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setSelected(u)} style={styles.detailsBtn}>
                            Szczegóły
                          </button>
                          {u.email !== user?.email && (
                            <button
                              onClick={() => handleToggleActive(u.id)}
                              disabled={actionLoading === `active-${u.id}`}
                              style={u.is_active ? styles.blockBtn : styles.unblockBtn}
                            >
                              {actionLoading === `active-${u.id}` ? "..." : u.is_active ? "Zablokuj" : "Odblokuj"}
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
  pageWrapper: {
    minHeight: "100vh",
    backgroundColor: "#121212",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#E0E0E0",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 24px",
    borderBottom: "1px solid #2A2A2A",
    backgroundColor: "#1E1E1E",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#A0A0A0",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  error: {
    color: "#ff7675",
    backgroundColor: "#3A1C1C",
    border: "1px solid #e74c3c",
    padding: "10px 16px",
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  th: {
    padding: "12px 14px",
    textAlign: "left",
    color: "#A0A0A0",
    fontWeight: "bold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #2A2A2A",
  },
  td: {
    padding: "11px 14px",
    borderBottom: "1px solid #222",
    color: "#E0E0E0",
  },
  select: {
    padding: "5px 8px",
    borderRadius: 6,
    border: "1px solid #444",
    backgroundColor: "#2A2A2A",
    color: "#E0E0E0",
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
  },
  roleBadge: {
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "bold",
    display: "inline-block",
  },
  detailsBtn: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #4A90E2",
    backgroundColor: "transparent",
    color: "#4A90E2",
    cursor: "pointer",
    fontSize: 13,
    transition: "background-color 0.2s",
  },
  blockBtn: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#5C1C1C",
    color: "#ff7675",
    cursor: "pointer",
    fontSize: 13,
  },
  unblockBtn: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#1C3A2A",
    color: "#2ecc71",
    cursor: "pointer",
    fontSize: 13,
  },
  backBtn: {
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid #444",
    backgroundColor: "transparent",
    color: "#A0A0A0",
    cursor: "pointer",
    fontSize: 14,
  },
  refreshBtn: {
    padding: "6px 14px",
    borderRadius: 8,
    border: "1px solid #4A90E2",
    backgroundColor: "transparent",
    color: "#4A90E2",
    cursor: "pointer",
    fontSize: 14,
    transition: "background-color 0.2s",
  },
  overlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#1E1E1E",
    border: "1px solid #333",
    borderRadius: 12,
    padding: 28,
    width: 480,
    maxWidth: "90vw",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "#666",
  },
};