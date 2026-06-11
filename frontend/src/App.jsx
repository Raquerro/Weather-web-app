import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WeatherPage from "./pages/WeatherPage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";


function App() {
  const { user, loading, login, register, logout } = useAuth();

  if (loading) return <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>Ładowanie...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage login={login} />} />
        <Route path="/register" element={<RegisterPage register={register} />} />
        <Route path="/" element={
          user ? <WeatherPage user={user} logout={logout} />
               : <Navigate to="/login" />
        } />
        <Route path="/admin" element={
          user?.role === "admin" ? <AdminPage user={user} />
          : user ? <Navigate to="/" />
                 : <Navigate to="/login" />
        } />
        <Route path="/settings" element={
          user ? <SettingsPage user={user} logout={logout} />
              : <Navigate to="/login" />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;