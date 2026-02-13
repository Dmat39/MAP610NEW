import React, { useState, useEffect } from "react";
import { FaIdCard, FaLock, FaShieldAlt, FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Grid pattern de fondo */}
      <div className="particles"></div>

      {/* Acentos sutiles de fondo */}
      <div className="waves">
        <div className="wave wave-1"></div>
        <div className="wave wave-2"></div>
        <div className="wave wave-3"></div>
      </div>

      {/* TÍTULO INSTITUCIONAL ARRIBA */}
      <div className={`top-title ${mounted ? 'visible' : ''}`}>
        <div className="shield-icon">
          <FaShieldAlt />
        </div> 
        <h2 className="sjl">SAN JUAN DE LURIGANCHO</h2>
        <div className="title-underline"></div>
      </div>

      <div className={`login-card ${mounted ? 'visible' : ''}`}>
        <div className="login-header">
          <div className="header-glow"></div>
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
            <div className="input-icon-wrapper">
              <FaIdCard className="input-icon" />
            </div>
            <input
              type="text"
              placeholder="Ingrese su usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
            <div className="input-border"></div>
          </div>

          <div className="input-group">
            <div className="input-icon-wrapper">
              <FaLock className="input-icon" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
            <div className="input-border"></div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            <span className="btn-content">
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Ingresando...
                </>
              ) : (
                "Acceder"
              )}
            </span>
            <div className="btn-glow"></div>
          </button>
        </form>
      </div>
    </div>
  );
}
