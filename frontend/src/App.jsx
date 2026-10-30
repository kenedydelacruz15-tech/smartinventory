import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import Categories from "./pages/Categories";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import StoreSettings from "./pages/StoreSettings";
import AdminUsers from "./pages/AdminUsers";
import AdminStores from "./pages/AdminStores";
import StaffManagement from "./pages/StaffManagement";
import AdminSettings from "./pages/AdminSettings";
import AuditLogs from "./pages/AuditLogs";
import Analytics from "./pages/Analytics";
import LandingPage from "./pages/LandingPage";

import {
  getDashboardPath,
  getRole,
  getUser,
  isLoggedIn,
  logout,
} from "./services/auth";

import api from "./services/api";
import "./styles.css";
// Shared theme rules used across the public-facing pages.
import "./pages/PublicPagesTheme.css";

function Protected({ children, roles }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const role = getRole();

  if (roles && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

const navItems = {
  ADMIN: [
    ["Dashboard", "/admin/dashboard", "bi-speedometer2"],
    ["Stores", "/admin/stores", "bi-shop"],
    ["Users", "/admin/users", "bi-people"],
    ["System Settings", "/admin/settings", "bi-gear"],
    ["Audit Logs", "/admin/audit-logs", "bi-clipboard-data"],
  ],

  OWNER: [
    ["Dashboard", "/owner/dashboard", "bi-speedometer2"],
    ["Inventory", "/inventory", "bi-box-seam"],
    ["Products", "/products", "bi-bag"],
    ["Categories", "/categories", "bi-grid"],
    ["Staff", "/staff", "bi-person-badge"],
    ["Analytics", "/analytics", "bi-bar-chart-line"],
    ["Audit Logs", "/owner/audit-logs", "bi-clipboard-data"],
    ["Store Settings", "/settings/store", "bi-gear"],
  ],

  STAFF: [
    ["Dashboard", "/staff/dashboard", "bi-speedometer2"],
    ["Inventory", "/inventory", "bi-box-seam"],
    ["Categories", "/categories", "bi-grid"],
    ["Products", "/products", "bi-bag"],
  ],
};

function Layout() {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("smartinventory-theme") === "dark"
  );

  const [storeName, setStoreName] = useState("Inventory Workspace");

  const user = getUser();
  const role = getRole();
  const items = navItems[role] || [];

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";

    localStorage.setItem(
      "smartinventory-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadStoreName() {
      if (role === "ADMIN") {
        setStoreName("Inventory Workspace");
        return;
      }

      try {
        const response = await api.get("/api/store/profile");

        if (cancelled) return;

        const name = response.data?.store_name?.trim();

        setStoreName(name || "Inventory Workspace");
      } catch (error) {
        if (!cancelled) {
          setStoreName("Inventory Workspace");
        }

        console.error("Could not load store name:", error);
      }
    }

    loadStoreName();

    return () => {
      cancelled = true;
    };
  }, [role]);

  const signOut = () => {
    if (window.confirm("Sign out of SmartInventory?")) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brand-mark brand-logo"
            src="/ken-motorparts-logo.jpg"
            alt="KEN Motorparts"
          />

          <div>
            <strong>KEN Motorparts</strong>
            <span>Inventory System</span>
          </div>
        </div>

        {/* Store name replaces the sidebar name and role. */}
        <div className="sidebar-user">
          <div
            className="avatar"
            title={storeName}
            aria-label={storeName}
          >
            <i className="bi bi-shop" />
          </div>

          <div
            className="sidebar-store-name"
            title={storeName}
            style={{
              minWidth: 0,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <strong>{storeName}</strong>
          </div>
        </div>

        <div className="nav-caption">WORKSPACE</div>

        <nav className="sidebar-nav">
          {items.map(([label, path, icon]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              <i className={`bi ${icon}`} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="logout-icon"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-search">
            <i className="bi bi-search" />
            <span>Inventory workspace</span>
          </div>

          <div className="topbar-right">
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <i
                className={`bi ${
                  darkMode ? "bi-sun-fill" : "bi-moon-stars-fill"
                }`}
              />
              <span>{darkMode ? "Light" : "Dark"}</span>
            </button>

            <span className="role-pill">{role}</span>

            <div className="top-user">
              <span className="top-avatar">
                {(
                  user?.full_name ||
                  user?.username ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <strong>
                {user?.full_name || user?.username || "User"}
              </strong>
            </div>
          </div>
        </header>

        <main className="content-area">
          <Routes>
            <Route
              path="/admin/dashboard"
              element={
                <Protected roles={["ADMIN"]}>
                  <AdminDashboard />
                </Protected>
              }
            />

            <Route
              path="/owner/dashboard"
              element={
                <Protected roles={["OWNER"]}>
                  <OwnerDashboard />
                </Protected>
              }
            />

            <Route
              path="/staff/dashboard"
              element={
                <Protected roles={["STAFF"]}>
                  <StaffDashboard />
                </Protected>
              }
            />

            <Route
              path="/dashboard"
              element={<Navigate to={getDashboardPath(role)} replace />}
            />

            <Route
              path="/inventory"
              element={
                <Protected roles={["OWNER", "STAFF"]}>
                  <Inventory />
                </Protected>
              }
            />

            <Route
              path="/categories"
              element={
                <Protected roles={["OWNER", "STAFF"]}>
                  <Categories />
                </Protected>
              }
            />

            <Route
              path="/products"
              element={
                <Protected roles={["OWNER", "STAFF"]}>
                  <Products />
                </Protected>
              }
            />

            <Route
              path="/staff"
              element={
                <Protected roles={["OWNER"]}>
                  <StaffManagement />
                </Protected>
              }
            />

            <Route
              path="/settings/store"
              element={
                <Protected roles={["OWNER"]}>
                  <StoreSettings />
                </Protected>
              }
            />

            <Route
              path="/analytics"
              element={
                <Protected roles={["OWNER"]}>
                  <Analytics />
                </Protected>
              }
            />

            <Route
              path="/admin/stores"
              element={
                <Protected roles={["ADMIN"]}>
                  <AdminStores />
                </Protected>
              }
            />

            <Route
              path="/admin/users"
              element={
                <Protected roles={["ADMIN"]}>
                  <AdminUsers />
                </Protected>
              }
            />

            <Route path="/admin/audit-logs" element={<Protected roles={["ADMIN"]}><AuditLogs /></Protected>} />
            <Route path="/owner/audit-logs" element={<Protected roles={["OWNER"]}><AuditLogs /></Protected>} />

            <Route
              path="/admin/settings"
              element={
                <Protected roles={["ADMIN"]}>
                  <AdminSettings />
                </Protected>
              }
            />

            <Route
              path="*"
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/*"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
