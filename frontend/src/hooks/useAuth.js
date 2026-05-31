import { useState, useEffect } from "react";
import { login, logout, register, getToken, getUser } from "../services/authService";

export const useAuth = () => {
  const [user, setUser] = useState(getUser);

  const handleLogin = async (email, password) => {
    await login(email, password);
    setUser(getUser());
  };

  const handleRegister = async (email, password) => {
    await register(email, password);
    await handleLogin(email, password);   // po rejestracji od razu loguje
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return { user, login: handleLogin, register: handleRegister, logout: handleLogout };
};