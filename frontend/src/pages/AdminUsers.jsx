import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import BackButton from "../components/BackButton";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [form, setForm] = useState({
    full_name: "", username: "", email: "", password: "", role: "STAFF", store_id: ""
  });

  useEffect(() => { loadUsers(); loadStores(); }, []);

  const loadUsers = async () => {
    try {
      setError("");
      const res = await api.get("/api/users/admin/users");
      setUsers(res.data || []);
    } catch (error) {
      console.error("Could not load users:", error);
      setError(error.response?.data?.error || "Could not load users.");
    } finally { setLoading(false); }
  };

  const loadStores = async () => {
    try {
      const res = await api.get("/api/store");
      setStores(res.data || []);
    } catch (error) { console.error("Could not load stores:", error); }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await api.post("/api/users/admin/users", { ...form, store_id: Number(form.store_id) });
      setForm({ full_name: "", username: "", email: "", password: "", role: "STAFF", store_id: "" });
      setShowForm(false);
      await loadUsers();
    } catch (error) {
      console.error("Could not create user:", error);
      setError(error.response?.data?.error || "Could not create user.");
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      setError("");
      await api.put(`/api/users/admin/users/${user.user_id}/status`, { is_active: !user.is_active });
      await loadUsers();
    } catch (error) {
      console.error("Could not update user:", error);
      setError(error.response?.data?.error || "Could not update user.");
    }
  };

  const permanentlyDeleteUser = async (user) => {
    if (Number(user.is_active) === 1) { setError("Deactivate this user before permanently deleting the account."); return; }
    if (!window.confirm(`Permanently delete user "${user.full_name}" (@${user.username})? This cannot be undone.`)) return;
    try { setError(""); await api.delete(`/api/users/admin/users/${user.user_id}/permanent`); await loadUsers(); }
    catch (err) { setError(err.response?.data?.error || "Could not permanently delete user."); }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !q || [user.full_name, user.username, user.email, user.store_name]
        .some((value) => String(value || "").toLowerCase().includes(q));
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? Number(user.is_active) === 1 : Number(user.is_active) !== 1);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeCount = users.filter(u => Number(u.is_active) === 1).length;
  const inactiveCount = users.length - activeCount;
  const ownerCount = users.filter(u => u.role === "OWNER").length;
  const staffCount = users.filter(u => u.role === "STAFF").length;

  return (
    <div className="admin-page admin-users-page">
      <BackButton fallback="/admin/dashboard" label="Back to Admin Dashboard" />

      <div className="page-header admin-feature-header">
        <div>
          <div className="admin-feature-eyebrow"><i className="bi bi-people-fill" /> SYSTEM ACCESS</div>
          <h1>User Management</h1>
          <p className="muted">Control user accounts, roles, store access, and account status.</p>
        </div>
        <button className="btn btn-primary admin-add-button" onClick={() => setShowForm(!showForm)}>
          <i className={`bi ${showForm ? "bi-x-lg" : "bi-person-plus-fill"}`} /> {showForm ? "Close Form" : "Add User"}
        </button>
      </div>

      {error && <div className="alert alert-error admin-alert"><i className="bi bi-exclamation-circle-fill" /> {error}</div>}

      <div className="admin-feature-stats">
        <div className="admin-feature-stat purple"><div className="feature-stat-icon"><i className="bi bi-people-fill" /></div><div><span>Total Users</span><strong>{users.length}</strong><small>Registered accounts</small></div></div>
        <div className="admin-feature-stat green"><div className="feature-stat-icon"><i className="bi bi-person-check-fill" /></div><div><span>Active</span><strong>{activeCount}</strong><small>Access enabled</small></div></div>
        <div className="admin-feature-stat amber"><div className="feature-stat-icon"><i className="bi bi-person-gear" /></div><div><span>Owners</span><strong>{ownerCount}</strong><small>Store managers</small></div></div>
        <div className="admin-feature-stat blue"><div className="feature-stat-icon"><i className="bi bi-person-badge-fill" /></div><div><span>Staff</span><strong>{staffCount}</strong><small>Store accounts</small></div></div>
        <div className="admin-feature-stat gray"><div className="feature-stat-icon"><i className="bi bi-person-x-fill" /></div><div><span>Inactive</span><strong>{inactiveCount}</strong><small>Access disabled</small></div></div>
      </div>

      {showForm && (
        <div className="admin-feature-form">
          <div className="feature-form-title"><div className="feature-form-icon"><i className="bi bi-person-plus-fill" /></div><div><h2>Create User</h2><p>Add an OWNER or STAFF account and assign its store access.</p></div></div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group"><label>Full Name</label><input type="text" name="full_name" value={form.full_name} onChange={handleChange} required placeholder="Enter full name" /></div>
              <div className="form-group"><label>Username</label><input type="text" name="username" value={form.username} onChange={handleChange} required placeholder="Enter username" /></div>
              <div className="form-group"><label>Email</label><input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="name@example.com" /></div>
              <div className="form-group"><label>Password</label><input type="password" name="password" value={form.password} onChange={handleChange} minLength={8} required placeholder="Minimum 8 characters" /></div>
              <div className="form-group"><label>Role</label><select name="role" value={form.role} onChange={handleChange}><option value="STAFF">STAFF</option><option value="OWNER">OWNER</option></select></div>
              <div className="form-group"><label>Store</label><select name="store_id" value={form.store_id} onChange={handleChange} required><option value="">Select Store</option>{stores.map(store => <option key={store.store_id} value={store.store_id}>{store.store_name}</option>)}</select></div>
            </div>
            <div className="feature-form-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="btn btn-primary"><i className="bi bi-check2-circle" /> Create User</button></div>
          </form>
        </div>
      )}

      <div className="admin-feature-card">
        <div className="admin-feature-card-head">
          <div><div className="section-kicker"><i className="bi bi-shield-lock-fill" /> ACCESS DIRECTORY</div><h2>System Users</h2><p>Search and manage accounts across all stores.</p></div>
          <div className="record-count"><strong>{filteredUsers.length}</strong><span>shown</span></div>
        </div>
        <div className="admin-filter-bar">
          <div className="admin-search"><i className="bi bi-search" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, username, email, store..." /></div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}><option value="ALL">All Roles</option><option value="ADMIN">Admin</option><option value="OWNER">Owner</option><option value="STAFF">Staff</option></select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
          <button className="filter-refresh" onClick={loadUsers} disabled={loading}><i className={`bi ${loading ? "bi-arrow-repeat" : "bi-arrow-clockwise"}`} /> Refresh</button>
        </div>

        {loading ? <div className="admin-empty-state"><i className="bi bi-arrow-repeat" /><strong>Loading users...</strong></div> : filteredUsers.length === 0 ? <div className="admin-empty-state"><i className="bi bi-person-slash" /><strong>No matching users</strong><span>Try changing your search or filters.</span></div> : (
          <div className="admin-user-directory">
            {filteredUsers.map(user => (
              <div className="admin-user-item" key={user.user_id}>
                <div className={`user-avatar role-${String(user.role || "").toLowerCase()}`}>{String(user.full_name || "?").trim().charAt(0).toUpperCase()}</div>
                <div className="user-main"><strong>{user.full_name}</strong><span>@{user.username}</span><small>{user.email}</small></div>
                <div className="user-meta"><span className={`role-chip ${String(user.role || "").toLowerCase()}`}><i className="bi bi-person-badge" /> {user.role}</span><span className="store-chip"><i className="bi bi-shop" /> {user.store_name || "No Store"}</span></div>
                <div className="user-status"><span className={`status-chip ${Number(user.is_active) === 1 ? "active" : "inactive"}`}><i className="bi bi-circle-fill" /> {Number(user.is_active) === 1 ? "Active" : "Inactive"}</span></div>
                <div className="user-action">{user.role !== "ADMIN" && <><button className={Number(user.is_active) === 1 ? "deactivate" : "activate"} onClick={() => toggleUserStatus(user)}><i className={`bi ${Number(user.is_active) === 1 ? "bi-person-dash" : "bi-person-check"}`} /> {Number(user.is_active) === 1 ? "Deactivate" : "Activate"}</button>{Number(user.is_active) !== 1 && <button className="deactivate" onClick={() => permanentlyDeleteUser(user)}><i className="bi bi-trash3" /> Permanently Delete</button>}</>}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
