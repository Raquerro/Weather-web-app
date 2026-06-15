import { authFetch } from "./authService";

const AUTH_URL = process.env.REACT_APP_AUTH_URL;

export const updateProfile = async (userId, data) => {
  const res = await authFetch(`/users/${userId}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, AUTH_URL);
  if (!res) return null;
  if (!res.ok) throw new Error((await res.json()).detail || "Błąd aktualizacji profilu");
  return res.json();
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const res = await authFetch(`/users/${userId}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password:     newPassword,
    }),
  }, AUTH_URL);
  if (!res) return null;
  if (!res.ok) throw new Error((await res.json()).detail || "Błąd zmiany hasła");
  return res.json();
};

export const getProfile = async (userId) => {
  const res = await authFetch(`/users/${userId}`, {}, AUTH_URL);
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd pobierania profilu");
  return res.json();
};

export const getNotifications = async () => {
  const res = await authFetch("/notifications");
  if (!res) return [];
  if (!res.ok) throw new Error("Błąd pobierania lokalizacji");
  return res.json();
};

export const createNotification = async (data) => {
  const res = await authFetch("/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res) return null;
  if (!res.ok) throw new Error((await res.json()).detail || "Błąd zapisu lokalizacji");
  return res.json();
};

export const updateNotification = async (id, data) => {
  const res = await authFetch(`/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd aktualizacji lokalizacji");
  return res.json();
};

export const deleteNotification = async (id) => {
  const res = await authFetch(`/notifications/${id}`, { method: "DELETE" });
  if (!res) return null;
  if (!res.ok) throw new Error("Błąd usuwania lokalizacji");
  return res.json();
};