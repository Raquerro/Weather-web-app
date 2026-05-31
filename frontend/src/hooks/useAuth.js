import { useState, useEffect } from "react";
import { login, logout, getToken } from "../services/authService";

export const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 > Date.now()) setUser(payload);
      else logout();
    }
  }, []);

  const handleLogin = async (email, password) => {
    await login(email, password);
    const payload = JSON.parse(atob(getToken().split(".")[1]));
    setUser(payload);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return { user, login: handleLogin, logout: handleLogout };
};