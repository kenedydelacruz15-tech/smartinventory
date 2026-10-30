import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { getDashboardPath, saveAuth } from "../services/auth";
import "./LoginPage.css";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) return setError("Enter your username and password.");
    setLoading(true);
    try {
      const res = await api.post("/api/users/login", { username: username.trim(), password });
      const user = res.data?.user;
      const token = res.data?.access_token;
      const role = String(user?.role || "").toUpperCase();
      if (!user || !token) throw new Error("Incomplete authentication response.");
      if (!["ADMIN", "OWNER", "STAFF"].includes(role)) throw new Error("Unsupported account role.");
      saveAuth({ access_token: token, user: { ...user, role } });
      navigate(getDashboardPath(role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || "Invalid username or password.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-brand">
          <img
            className="login-brand-logo"
            src="/ken-motorparts-logo.jpg"
            alt="KEN Motorparts"
          />
          <span>
            <strong>KEN MOTORPARTS</strong>
            <small>SMART INVENTORY WORKSPACE</small>
          </span>
        </div>
        <div className="login-visual-copy">
          <span className="eyebrow">STAFF &amp; ADMIN ACCESS</span>
          <h1>Keep every part<br /><span>moving forward.</span></h1>
          <p>Track motorcycle parts, monitor stock, and make confident decisions from one inventory workspace.</p>
          <div className="login-feature-row">
            <span><i className="bi bi-box-seam" /> Inventory</span>
            <span><i className="bi bi-graph-up" /> Analytics</span>
            <span><i className="bi bi-bell" /> Stock alerts</span>
          </div>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <Link className="login-back-link" to="/"><i className="bi bi-arrow-left" /> Back to home</Link>
          <img className="mobile-login-logo" src="/ken-motorparts-logo.jpg" alt="KEN Motorparts" />
          <span className="eyebrow">KEN MOTORPARTS INVENTORY</span>
          <h2>Welcome back</h2>
          <p className="login-subtitle">Sign in to your account to continue.</p>
          {error && <div className="alert alert-error"><i className="bi bi-exclamation-circle" /> {error}</div>}
          <form onSubmit={submit} className="login-form">
            <div className="form-field">
              <label htmlFor="username">Username</label>
              <div className="input-with-icon">
                <i className="bi bi-person" />
                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" disabled={loading} required />
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <i className="bi bi-lock" />
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} required />
              </div>
            </div>
            <button type="submit" className="primary full login-submit" disabled={loading}>
              <i className="bi bi-arrow-right" />
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="login-access-note">
            <i className="bi bi-shield-lock" />
            <span>Secure access for authorized staff and administrators.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
