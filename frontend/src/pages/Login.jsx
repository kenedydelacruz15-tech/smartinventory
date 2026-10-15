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
        <div className="login-brand"><span className="login-brand-mark"><i className="bi bi-boxes" /></span><strong>SmartInventory</strong></div>
        <div className="login-visual-copy">
          <span className="eyebrow">INVENTORY MANAGEMENT</span>
          <h1>Know your stock.<br />Run your store smarter.</h1>
          <p>Motorcycle parts inventory, stock monitoring, and analytics in one workspace.</p>
          <div className="login-feature-row"><span><i className="bi bi-box-seam" /> Inventory</span><span><i className="bi bi-graph-up" /> Analytics</span><span><i className="bi bi-bell" /> Alerts</span></div>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <Link className="login-back-link" to="/"><i className="bi bi-arrow-left" /> Back to home</Link>
          <div className="mobile-login-logo"><i className="bi bi-boxes" /></div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in</h2>
          <p className="login-subtitle">Use your SmartInventory account.</p>
          {error && <div className="alert alert-error"><i className="bi bi-exclamation-circle" /> {error}</div>}
          <form onSubmit={submit} className="login-form">
            <div className="form-field"><label htmlFor="username">Username</label><div className="input-with-icon"><i className="bi bi-person" /><input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" disabled={loading} required /></div></div>
            <div className="form-field"><label htmlFor="password">Password</label><div className="input-with-icon"><i className="bi bi-lock" /><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} required /></div></div>
            <button type="submit" className="primary full login-submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}<i className="bi bi-arrow-right" /></button>
          </form>
          <p className="login-footer">Your account role controls the features available to you.</p>
        </div>
      </div>
    </div>
  );
}
