const AUTH_URL = process.env.REACT_APP_AUTH_URL;
const API_URL  = process.env.REACT_APP_API_URL;

let inMemoryToken = null;

export const getToken = () => inMemoryToken;

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
    credentials: "include",
  });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  return res.json();
};

export const login = async (email, password) => {
  const res = await fetch(`${AUTH_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",   // ← wysyła i przyjmuje cookies
  });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  const data = await res.json();
  inMemoryToken = data.access_token;
  return data;
};

export const tryRefresh = async () => {
  try {
    const res = await fetch(`${AUTH_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    inMemoryToken = data.access_token;
    return true;
  } catch {
    return false;
  }
};

export const logout = async () => {
  await fetch(`${AUTH_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  inMemoryToken = null;
};

export const getUser = (token = inMemoryToken) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

// automatycznie odnawia access token gdy wygaśnie
export const authFetch = async (path, options = {}) => {
  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${getToken()}` },
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (!refreshed) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return;
    }
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${getToken()}` },
    });
  }

  return res;
};

