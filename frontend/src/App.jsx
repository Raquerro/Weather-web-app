import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WeatherPage from "./pages/WeatherPage";


function App() {
  const { user, loading, login, register, logout } = useAuth();

  if (loading) return <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>Ładowanie...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage login={login} />} />
        <Route path="/register" element={<RegisterPage register={register} />} />
        <Route path="/" element={
          user
            ? <WeatherPage logout={logout} user={user} />
            : <Navigate to="/login" />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;