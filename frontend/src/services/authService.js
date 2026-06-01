const AUTH_URL = process.env.REACT_APP_AUTH_URL;
const API_URL  = process.env.REACT_APP_API_URL;

let inMemoryToken = null;

export const getToken = () => inMemoryToken;


const getErrorMessage = async (res) => {
  try {
    const data = await res.json();
    if (res.status === 429) return "Zbyt wiele prób. Spróbuj ponownie za minutę.";
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map(e => e.msg.replace("Value error, ", "")).join(", ");
    return "Nieznany błąd serwera.";
  } catch {
    return "Nieznany błąd serwera.";
  }
};  

export const register = async (email, password) => {
  let res;
  try {
    res = await fetch(`${AUTH_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
  } catch {
    throw new Error("Brak połączenia z serwerem. Sprawdź połączenie internetowe.");
  }
  if (!res.ok) throw new Error(await getErrorMessage(res));
  return res.json();
};

export const login = async (email, password) => {
  let res;
  try {
    res = await fetch(`${AUTH_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
  } catch {
    throw new Error("Brak połączenia z serwerem. Sprawdź połączenie internetowe.");
  }
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
  try {
    await fetch(`${AUTH_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // nawet jeśli serwer nie odpowie, czyścimy token lokalnie
  }
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
      inMemoryToken = null;
      // przekazuje powód przekierowania jako parametr URL
      window.location.href = "/login?reason=session_expired";
      return;
    }
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${getToken()}` },
    });
  }

  return res;
};

