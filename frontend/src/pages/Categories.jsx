import { useEffect, useState } from "react";
import api from "../services/api";

export default function Categories() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/api/categories/", { params: { status, search: search.trim() } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Could not load categories.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); }, [status]);

  const resetForm = () => { setEditingId(null); setName(""); setDescription(""); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!name.trim()) return setError("Category name is required.");
    try {
      if (editingId) {
        await api.put(`/api/categories/${editingId}`, { category_name: name.trim(), description: description.trim() });
        setSuccess("Category updated successfully.");
      } else {
        await api.post("/api/categories/", { category_name: name.trim(), description: description.trim() });
        setSuccess("Category created successfully.");
      }
      resetForm(); await loadCategories();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Something went wrong.");
    }
  };

  const editCategory = (category) => {
    setEditingId(category.category_id); setName(category.category_name); setDescription(category.description || "");
    setError(""); setSuccess(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStatus = async (category, action) => {
    const verb = action === "restore" ? "Restore" : "Deactivate";
    if (!window.confirm(`${verb} "${category.category_name}"?`)) return;
    try {
      setError(""); setSuccess("");
      await api.put(`/api/categories/${category.category_id}/${action}`);
      setSuccess(`Category ${action === "restore" ? "restored" : "deactivated"} successfully.`);
      await loadCategories();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || `Could not ${action} category.`);
    }
  };

  const permanentlyDeleteCategory = async (category) => {
    if (Number(category.is_active) === 1) { setError("Deactivate the category before permanently deleting it."); return; }
    if (!window.confirm(`Permanently delete category "${category.category_name}"? This cannot be undone. Categories with products cannot be deleted.`)) return;
    try { setError(""); setSuccess(""); await api.delete(`/api/categories/${category.category_id}/permanent`); setSuccess("Category permanently deleted."); await loadCategories(); }
    catch (err) { setError(err.response?.data?.message || err.response?.data?.error || "Could not permanently delete category."); }
  };

  const activeCount = items.filter((x) => Number(x.is_active) === 1).length;
  const inactiveCount = items.filter((x) => Number(x.is_active) === 0).length;

  return (
    <div className="categories-page">
      <div className="page-header categories-header">
        <div><span className="eyebrow">INVENTORY SETUP</span><h1>Categories</h1><p>Organize motorcycle parts into clear product groups.</p></div>
      </div>

      {error && <div className="alert alert-error"><i className="bi bi-exclamation-circle" /> {error}</div>}
      {success && <div className="success"><i className="bi bi-check-circle" /> {success}</div>}

      <div className="category-form-card">
        <div className="form-header">
          <div><h2><i className="bi bi-folder-plus" /> {editingId ? "Edit Category" : "Add New Category"}</h2><p>{editingId ? "Update the selected category information." : "Create a category for your store's products."}</p></div>
        </div>
        <form className="category-form" onSubmit={handleSubmit}>
          <div className="form-group"><label htmlFor="category-name">Category Name</label><input id="category-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brake System" required /></div>
          <div className="form-group"><label htmlFor="category-description">Description</label><input id="category-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" /></div>
          <div className="form-actions">
            {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel</button>}
            <button type="submit" className="primary"><i className={`bi ${editingId ? "bi-check2" : "bi-plus-lg"}`} /> {editingId ? "Save Changes" : "Add Category"}</button>
          </div>
        </form>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", marginBottom: 22 }}>
        <div className="stat-card"><span className="stat-label">VISIBLE CATEGORIES</span><strong>{items.length}</strong></div>
        <div className="stat-card"><span className="stat-label">ACTIVE</span><strong>{activeCount}</strong></div>
        <div className="stat-card"><span className="stat-label">INACTIVE</span><strong>{inactiveCount}</strong></div>
      </div>

      <div className="categories-card">
        <div className="table-header"><div><h2>Category List</h2><span>Manage category status and details.</span></div></div>
        <div className="categories-toolbar">
          <form className="search-box" onSubmit={(e) => { e.preventDefault(); loadCategories(); }}><div className="input-with-icon" style={{ flex: 1 }}><i className="bi bi-search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search category or description..." /></div><button className="search-button" type="submit">Search</button></form>
          <div className="status-filters">
            {["active", "inactive", "all"].map((value) => <button key={value} type="button" className={`filter-btn ${status === value ? "active" : ""}`} onClick={() => setStatus(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
          </div>
        </div>
        <div className="table-container">
          <table><thead><tr><th>ID</th><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="empty-state">Loading categories...</td></tr> : items.length === 0 ? <tr><td colSpan="5" className="empty-state"><h3>No categories found</h3><p>Try another search or status filter.</p></td></tr> : items.map((category) => (
                <tr key={category.category_id}>
                  <td>#{category.category_id}</td><td><strong><i className="bi bi-folder2-open" /> {category.category_name}</strong></td><td>{category.description || "—"}</td>
                  <td><span className={`status-badge ${category.is_active ? "active" : "inactive"}`}><i className={`bi ${category.is_active ? "bi-check-circle" : "bi-dash-circle"}`} /> {category.is_active ? "Active" : "Inactive"}</span></td>
                  <td><div className="action-buttons">
                    {category.is_active ? <><button className="action-button edit-button" onClick={() => editCategory(category)} title="Edit"><i className="bi bi-pencil" /> Edit</button><button className="action-button deactivate-button" onClick={() => changeStatus(category, "deactivate")} title="Deactivate"><i className="bi bi-slash-circle" /> Deactivate</button></> : <><button className="action-button restore-button" onClick={() => changeStatus(category, "restore")}><i className="bi bi-arrow-counterclockwise" /> Restore</button><button className="action-button deactivate-button" onClick={() => permanentlyDeleteCategory(category)}><i className="bi bi-trash3" /> Permanently Delete</button></>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
