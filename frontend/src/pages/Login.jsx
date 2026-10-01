import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getDashboardPath, saveAuth } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/api/users/login", {
        username: username.trim(),
        password,
      });

      const user = res.data?.user;
      const token = res.data?.access_token;
      const actualRole = String(user?.role || "").toUpperCase();

      if (!user || !token) {
        setError("Login succeeded, but the server returned incomplete authentication information.");
        return;
      }

      if (!["ADMIN", "OWNER", "STAFF"].includes(actualRole)) {
        setError("Your account has an invalid or unsupported role.");
        return;
      }

      const saved = saveAuth({
        access_token: token,
        user: { ...user, role: actualRole },
      });

      if (!saved) {
        setError("Login succeeded, but authentication information could not be saved.");
        return;
      }

      navigate(getDashboardPath(actualRole), { replace: true });
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err.response?.data?.error ||
        "Invalid username or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-login-page">
      <div className="role-login-card">
        <div className="login-heading">
          <h1>SmartInventory</h1>
          <p>Motorcycle Parts Inventory System</p>
        </div>

        <h3>Sign in</h3>
        <p className="muted">Use your account credentials. The system will automatically identify whether you are an Admin, Owner, or Staff member.</p>

        {error && (
          <div className="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="login-form">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={loading}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
            required
          />

          <button
            type="submit"
            className="primary full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="muted login-role-note">
          Your verified role determines which dashboard and features you can access.
        </p>
      </div>
    </div>
  );
}
