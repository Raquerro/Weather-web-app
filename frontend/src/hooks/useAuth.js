import { useState } from "react";
import { login, logout, register, getUser } from "../services/authService";

export const useAuth = () => {
  const [user, setUser] = useState(null);

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

  return { user, login: handleLogin, register: handleRegister, logout: handleLogout };
};