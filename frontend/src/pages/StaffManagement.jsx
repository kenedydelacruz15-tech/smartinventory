import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import BackButton from "../components/BackButton";

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState({ full_name: "", username: "", email: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStaff = async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/api/users/");
      setStaff((res.data || []).filter(user => user.role === "STAFF"));
    } catch (err) {
      console.error("Could not load staff:", err);
      setError(err.response?.data?.error || "Could not load staff.");
    } finally { setLoading(false); }
  };
  useEffect(() => { loadStaff(); }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const resetForm = () => { setForm({ full_name: "", username: "", email: "", password: "" }); setEditingStaff(null); setShowForm(false); };
  const openAddForm = () => { setError(""); setMessage(""); setEditingStaff(null); setForm({ full_name: "", username: "", email: "", password: "" }); setShowForm(true); };

  const addStaff = async e => {
    e.preventDefault(); setError(""); setMessage("");
    if (!form.full_name.trim()) return setError("Full name is required.");
    if (!form.username.trim()) return setError("Username is required.");
    if (!form.email.trim()) return setError("Email is required.");
    if (!form.password) return setError("Password is required.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    try {
      setSaving(true);
      await api.post("/api/users/", { full_name: form.full_name.trim(), username: form.username.trim(), email: form.email.trim(), password: form.password });
      setMessage("Staff account created successfully."); resetForm(); await loadStaff();
    } catch (err) { setError(err.response?.data?.error || "Could not create staff account."); }
    finally { setSaving(false); }
  };

  const startEdit = user => { setEditingStaff(user); setForm({ full_name: user.full_name || "", username: user.username || "", email: user.email || "", password: "" }); setShowForm(true); setMessage(""); setError(""); };

  const updateStaff = async e => {
    e.preventDefault(); setError(""); setMessage("");
    if (!form.full_name.trim()) return setError("Full name is required.");
    if (!form.email.trim()) return setError("Email is required.");
    try {
      setSaving(true);
      await api.put(`/api/users/${editingStaff.user_id}`, { full_name: form.full_name.trim(), email: form.email.trim() });
      setMessage("Staff information updated successfully."); resetForm(); await loadStaff();
    } catch (err) { setError(err.response?.data?.error || "Could not update staff information."); }
    finally { setSaving(false); }
  };

  const toggleStatus = async user => {
    const action = user.is_active ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;
    try {
      setError(""); setMessage("");
      await api.put(`/api/users/${user.user_id}/deactivate`);
      setMessage(user.is_active ? "Staff account deactivated." : "Staff account activated.");
      await loadStaff();
    } catch (err) { setError(err.response?.data?.error || "Could not change staff status."); }
  };

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter(user => {
      const matchesSearch = !q || [user.full_name, user.username, user.email].some(v => String(v || "").toLowerCase().includes(q));
      const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? Number(user.is_active) === 1 : Number(user.is_active) !== 1);
      return matchesSearch && matchesStatus;
    });
  }, [staff, search, statusFilter]);

  const activeCount = staff.filter(u => Number(u.is_active) === 1).length;
  const inactiveCount = staff.length - activeCount;

  return (
    <div className="staff-page staff-management-page">
      <BackButton fallback="/owner/dashboard" label="Back to Owner Dashboard" />

      <div className="page-header staff-feature-header">
        <div>
          <div className="staff-feature-eyebrow"><i className="bi bi-person-workspace" /> TEAM ACCESS</div>
          <h1>Staff Management</h1>
          <p className="muted">Manage the people who handle daily inventory operations in your store.</p>
        </div>
        {!showForm && <button type="button" className="primary staff-add-button" onClick={openAddForm}><i className="bi bi-person-plus-fill" /> Add Staff</button>}
      </div>

      <div className="staff-summary-grid staff-feature-summary">
        <div className="staff-summary-card blue"><i className="bi bi-people-fill" /><div><span>Total Staff</span><strong>{staff.length}</strong><small>Store accounts</small></div></div>
        <div className="staff-summary-card green"><i className="bi bi-person-check-fill" /><div><span>Active</span><strong>{activeCount}</strong><small>Currently enabled</small></div></div>
        <div className="staff-summary-card gray"><i className="bi bi-person-x-fill" /><div><span>Inactive</span><strong>{inactiveCount}</strong><small>Access disabled</small></div></div>
      </div>

      {error && <div className="alert staff-message"><i className="bi bi-exclamation-circle-fill" /> {error}</div>}
      {message && <div className="success staff-message"><i className="bi bi-check-circle-fill" /> {message}</div>}

      {showForm && (
        <div className="staff-feature-form">
          <div className="feature-form-title"><div className="feature-form-icon"><i className="bi bi-person-plus-fill" /></div><div><h2>{editingStaff ? "Edit Staff Account" : "Add Staff Account"}</h2><p>{editingStaff ? "Update the staff member's account information." : "Create a new staff account for this store."}</p></div></div>
          <form onSubmit={editingStaff ? updateStaff : addStaff}>
            <div className="form-grid">
              <div className="form-group"><label>Full Name</label><input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Enter full name" required /></div>
              <div className="form-group"><label>Username</label><input name="username" value={form.username} onChange={handleChange} placeholder="Enter username" disabled={!!editingStaff} required /></div>
              <div className="form-group"><label>Email</label><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" required /></div>
              {!editingStaff && <div className="form-group"><label>Password</label><input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Minimum 8 characters" required /></div>}
            </div>
            <div className="feature-form-actions"><button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button><button type="submit" className="primary" disabled={saving}><i className="bi bi-check2-circle" /> {saving ? "Saving..." : editingStaff ? "Save Changes" : "Create Staff"}</button></div>
          </form>
        </div>
      )}

      <div className="staff-directory-card">
        <div className="staff-directory-head">
          <div><div className="section-kicker"><i className="bi bi-people-fill" /> STAFF DIRECTORY</div><h2>Store Staff</h2><p>Search, update, and control staff access.</p></div>
          <div className="record-count"><strong>{filteredStaff.length}</strong><span>shown</span></div>
        </div>
        <div className="staff-filter-bar">
          <div className="admin-search"><i className="bi bi-search" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, username, email..." /></div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
          <button className="filter-refresh" onClick={loadStaff} disabled={loading}><i className="bi bi-arrow-clockwise" /> Refresh</button>
        </div>

        {loading ? <div className="admin-empty-state"><i className="bi bi-arrow-repeat" /><strong>Loading staff...</strong></div> : filteredStaff.length === 0 ? <div className="admin-empty-state"><i className="bi bi-person-slash" /><strong>No matching staff</strong><span>Try changing your search or filter.</span></div> : (
          <div className="staff-directory-list">
            {filteredStaff.map(user => (
              <div className="staff-directory-item" key={user.user_id}>
                <div className="user-avatar role-staff">{String(user.full_name || "?").trim().charAt(0).toUpperCase()}</div>
                <div className="staff-main"><strong>{user.full_name}</strong><span>@{user.username}</span><small>{user.email}</small></div>
                <div className="staff-role-chip"><i className="bi bi-person-badge-fill" /> STAFF</div>
                <div className="staff-status"><span className={`status-chip ${Number(user.is_active) === 1 ? "active" : "inactive"}`}><i className="bi bi-circle-fill" /> {Number(user.is_active) === 1 ? "Active" : "Inactive"}</span></div>
                <div className="staff-table-actions"><button className="staff-edit-button" onClick={() => startEdit(user)}><i className="bi bi-pencil-square" /> Edit</button><button onClick={() => toggleStatus(user)}><i className={`bi ${Number(user.is_active) === 1 ? "bi-person-dash" : "bi-person-check"}`} /> {Number(user.is_active) === 1 ? "Deactivate" : "Activate"}</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
