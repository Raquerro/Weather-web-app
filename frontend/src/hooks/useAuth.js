import { useState, useEffect } from "react";
import { login, logout, register, getUser, tryRefresh  } from "../services/authService";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);  // nowe – czekamy na silent refresh

  useEffect(() => {
    const init = async () => {
      const refreshed = await tryRefresh();
      if (refreshed) setUser(getUser());
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async (email, password) => {
    const data = await login(email, password);
    setUser(getUser(data.access_token));
  };

  const handleRegister = async (email, password) => {
    await register(email, password);
    await handleLogin(email, password);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return { user, loading, login: handleLogin, register: handleRegister, logout: handleLogout };
};