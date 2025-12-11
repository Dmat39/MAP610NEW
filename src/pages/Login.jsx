import React, { useState } from "react";
import { FaIdCard, FaLock } from "react-icons/fa";
import "./Login.css";

export default function Login() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Iniciar sesión", { dni, password });
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
          <div className="input-group">
            <FaIdCard className="input-icon" />
            <input
              type="text"
              placeholder="Ingrese su DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
          </div>

          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-btn">
            Acceder
          </button>
        </form>
      </div>
    </div>
  );
}
