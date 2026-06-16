import { authFetch } from "./authService";

export const getUsers = async () => {
  const res = await authFetch("/users");
  if (!res) return [];
  if (!res.ok) throw new Error("Błąd pobierania użytkowników");
  return res.json();
};

export const getStats = async () => {
  const res = await authFetch("/users/stats");
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd pobierania statystyk");
  return res.json();
};

export const updateRole = async (userId, role) => {
  const res = await authFetch(`/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd zmiany roli");
  return res.json();
};

export const toggleActive = async (userId) => {
  const res = await authFetch(`/users/${userId}/active`, {
    method: "PATCH",
  });
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd zmiany statusu konta");
  return res.json();
};