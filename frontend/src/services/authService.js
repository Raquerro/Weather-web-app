const AUTH_URL = process.env.REACT_APP_AUTH_URL;
const API_URL  = process.env.REACT_APP_API_URL;

const getErrorMessage = async (res) => {
  const data = await res.json();
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map(e => e.msg).join(", ");
  return "Nieznany błąd";
};

export const register = async (email, password) => {
  const res = await fetch(`${AUTH_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  return res.json();
};

export const login = async (email, password) => {
  const res = await fetch(`${AUTH_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  const data = await res.json();
  localStorage.setItem("token", data.access_token);
  return data;
};

export const logout = () => localStorage.removeItem("token");

export const getToken = () => localStorage.getItem("token");

export const authFetch = (path, options = {}) =>
  fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${getToken()}`,
    },
  });

export const getUser = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) {
      logout();
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};