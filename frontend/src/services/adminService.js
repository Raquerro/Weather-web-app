import { authFetch } from "./authService";

const AUTH_URL = process.env.REACT_APP_AUTH_URL;

export const getUsers = async () => {
  const res = await authFetch("/users", {}, AUTH_URL);
  if (!res) return [];
  if (!res.ok) throw new Error("Błąd pobierania użytkowników");
  return res.json();
};

export const getStats = async () => {
  const res = await authFetch("/users/stats", {}, AUTH_URL);
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd pobierania statystyk");
  return res.json();
};

export const updateRole = async (userId, role) => {
  const res = await authFetch(`/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  }, AUTH_URL);
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd zmiany roli");
  return res.json();
};

export const toggleActive = async (userId) => {
  const res = await authFetch(`/users/${userId}/active`, {
    method: "PATCH",
  }, AUTH_URL);
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd zmiany statusu konta");
  return res.json();
};