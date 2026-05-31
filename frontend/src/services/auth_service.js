const AUTH_URL = process.env.REACT_APP_AUTH_URL;
const API_URL  = process.env.REACT_APP_API_URL;

export const register = async (email, password) => {
  const res = await fetch(`${AUTH_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
};

export const login = async (email, password) => {
  const res = await fetch(`${AUTH_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
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