import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getUser } from "./services/authService";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WeatherPage from "./pages/WeatherPage";

function PrivateRoute({ children }) {
  return getUser() ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={
          <PrivateRoute>
            <WeatherPage />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}