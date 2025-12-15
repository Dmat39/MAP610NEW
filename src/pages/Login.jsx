import React, { useState } from "react";
import { FaIdCard, FaLock } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(username, password);

      if (!result.success) {
        setError(result.error || "Error al iniciar sesión");
      }
    } catch (err) {
      setError("Error de conexión. Verifica tu red o contacta al administrador.");
      console.error("Error en login:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      {/* TÍTULO INSTITUCIONAL ARRIBA */}
      <div className="top-title">
        <h1 className="cecom">CECOM</h1>
        <h2 className="sjl">SAN JUAN DE LURIGANCHO</h2>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h1>Iniciar Sesión</h1>
          <p>Acceso para personal autorizado</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="input-group">
            <FaIdCard className="input-icon" />
            <input
              type="text"
              placeholder="Ingrese su usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Ingresando..." : "Acceder"}
          </button>
        </form>
      </div>
    </div>
  );
}
