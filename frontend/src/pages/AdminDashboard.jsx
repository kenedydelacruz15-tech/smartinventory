import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const [usersRes, storesRes] = await Promise.all([
        api.get("/api/users/admin/users"),
        api.get("/api/store")
      ]);
      setUsers(usersRes.data || []);
      setStores(storesRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = users.length - activeUsers;
  const owners = users.filter((user) => user.role === "OWNER").length;
  const staff = users.filter((user) => user.role === "STAFF").length;
  const activeStores = stores.length;

  return (
    <div className="inventory-dashboard admin-inventory-dashboard">
      <div className="dashboard-top-row">
        <div>
          <div className="dashboard-breadcrumb">SYSTEM / CONTROL PANEL</div>
          <h1>Admin Dashboard</h1>
          <p>Manage stores, user accounts, and system access.</p>
        </div>
        <button className="dashboard-refresh" onClick={loadDashboard} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="dashboard-error"><i className="bi bi-exclamation-circle" /> {error}</div>}

      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi green"><span><i className="bi bi-check-circle" /> System</span><strong>{loading ? "..." : "Active"}</strong><small>System operational</small></div>
        <div className="dashboard-kpi blue"><span><i className="bi bi-shop" /> Stores</span><strong>{loading ? "..." : stores.length}</strong><small>Registered stores</small></div>
        <div className="dashboard-kpi purple"><span><i className="bi bi-people" /> Users</span><strong>{loading ? "..." : users.length}</strong><small>System accounts</small></div>
        <div className="dashboard-kpi teal"><span><i className="bi bi-person-check" /> Active Users</span><strong>{loading ? "..." : activeUsers}</strong><small>Active accounts</small></div>
        <div className="dashboard-kpi orange"><span><i className="bi bi-person-badge" /> Owners</span><strong>{loading ? "..." : owners}</strong><small>Store owners</small></div>
        <div className="dashboard-kpi cyan"><span><i className="bi bi-person-workspace" /> Staff</span><strong>{loading ? "..." : staff}</strong><small>Staff accounts</small></div>
        <div className="dashboard-kpi red"><span><i className="bi bi-person-x" /> Inactive</span><strong>{loading ? "..." : inactiveUsers}</strong><small>Inactive accounts</small></div>
        <div className="dashboard-kpi dark"><span><i className="bi bi-buildings" /> Store Records</span><strong>{loading ? "..." : activeStores}</strong><small>Registered locations</small></div>
      </div>

      <div className="dashboard-panel-heading">
        <div><h2>System Overview</h2><span>Account and store status at a glance.</span></div>
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-people-fill" /><strong>User Accounts</strong></div><span>Current accounts</span></div>
          <div className="admin-overview-body">
            <div className="admin-progress-row"><div><span>Active</span><strong>{activeUsers}</strong></div><div className="admin-progress"><span style={{ width: `${users.length ? activeUsers / users.length * 100 : 0}%` }} /></div></div>
            <div className="admin-progress-row"><div><span>Inactive</span><strong>{inactiveUsers}</strong></div><div className="admin-progress danger"><span style={{ width: `${users.length ? inactiveUsers / users.length * 100 : 0}%` }} /></div></div>
            <div className="admin-mini-grid"><div><small>Owners</small><strong>{owners}</strong></div><div><small>Staff</small><strong>{staff}</strong></div><div><small>Active</small><strong>{activeUsers}</strong></div></div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-shop-window" /><strong>Store Status</strong></div><span>Registered stores</span></div>
          <div className="status-dashboard-grid">
            <div className="status-dashboard-item good"><span>Registered</span><strong>{stores.length}</strong></div>
            <div className="status-dashboard-item warning"><span>Owners Assigned</span><strong>{stores.filter((store) => store.owner_name).length}</strong></div>
            <div className="status-dashboard-item danger"><span>No Owner</span><strong>{stores.filter((store) => !store.owner_name).length}</strong></div>
          </div>
        </div>
      </div>

      <div className="dashboard-two-column">
        <div className="dashboard-panel dashboard-table-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-lightning-fill" /><strong>System Management</strong></div><span>Quick access</span></div>
          <div className="dashboard-actions">
            <Link to="/admin/users" className="dashboard-action purple"><i className="bi bi-people" /><span><strong>User Management</strong><small>Create accounts and manage access</small></span><i className="bi bi-chevron-right" /></Link>
            <Link to="/admin/stores" className="dashboard-action blue"><i className="bi bi-shop" /><span><strong>Store Management</strong><small>Register and update stores</small></span><i className="bi bi-chevron-right" /></Link>
            <Link to="/admin/settings" className="dashboard-action green"><i className="bi bi-gear" /><span><strong>System Settings</strong><small>View system configuration</small></span><i className="bi bi-chevron-right" /></Link>
          </div>
        </div>

        <div className="dashboard-panel dashboard-table-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-person-lines-fill" /><strong>Recent Accounts</strong></div><span>Latest records</span></div>
          {users.length === 0 ? <div className="dashboard-empty">No user accounts found.</div> : (
            <table className="dashboard-table"><thead><tr><th>User</th><th>Role</th><th>Status</th></tr></thead><tbody>
              {users.slice(0, 5).map((user) => <tr key={user.user_id}><td><strong>{user.full_name || user.username}</strong><div className="admin-table-sub">{user.username}</div></td><td><span className={`role-badge role-${String(user.role || "").toLowerCase()}`}>{user.role}</span></td><td><span className={`status-badge ${user.is_active ? "active" : "inactive"}`}>{user.is_active ? "Active" : "Inactive"}</span></td></tr>)}
            </tbody></table>
          )}
        </div>
      </div>

      <div className="dashboard-footer-note"><i className="bi bi-shield-check" /> Admin access is limited to system-level management.</div>
    </div>
  );
}
