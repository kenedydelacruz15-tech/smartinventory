import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { getRole } from "../services/auth";

const emptySupplier = {
  supplier_name: "",
  contact_person: "",
  contact_number: "",
  email: "",
  address: "",
};

const formatManilaDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date)} PHT`;
};

export default function Suppliers() {
  const canAddSupplier = getRole() === "OWNER";
  const [suppliers, setSuppliers] = useState([]);
  const [stockIns, setStockIns] = useState([]);
  const [query, setQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptySupplier);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [supplierResponse, historyResponse] = await Promise.all([
        api.get("/api/suppliers/"),
        api.get("/api/suppliers/stock-in-history"),
      ]);
      setSuppliers(Array.isArray(supplierResponse.data?.suppliers) ? supplierResponse.data.suppliers : []);
      setStockIns(Array.isArray(historyResponse.data?.stock_ins) ? historyResponse.data.stock_ins : []);
    } catch (err) {
      console.error("Could not load supplier history:", err);
      setError(err.response?.data?.error || "Could not load suppliers and incoming stock history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const visibleStockIns = useMemo(() => {
    const search = query.trim().toLowerCase();
    return stockIns.filter((item) => {
      const matchesSupplier = supplierFilter === "ALL" || String(item.supplier_id || "") === supplierFilter;
      const matchesSearch = !search || [
        item.supplier_name,
        item.product_name,
        item.sku,
        item.reference_type,
        item.remarks,
      ].some((value) => String(value || "").toLowerCase().includes(search));
      return matchesSupplier && matchesSearch;
    });
  }, [query, stockIns, supplierFilter]);

  const totalReceived = visibleStockIns.reduce((total, item) => total + Number(item.quantity || 0), 0);

  const saveSupplier = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.supplier_name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    try {
      setSaving(true);
      await api.post("/api/suppliers/", {
        ...form,
        supplier_name: form.supplier_name.trim(),
      });
      setForm(emptySupplier);
      setFormOpen(false);
      setSuccess("Supplier added successfully.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Could not add supplier.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page suppliers-page">
      <header className="suppliers-page-header">
        <div>
          <span className="eyebrow">INVENTORY WORKSPACE</span>
          <h1>Suppliers</h1>
          <p>View supplier records and track every incoming item with its recorded time.</p>
        </div>
        <div className="suppliers-header-actions">
          <button type="button" className="secondary" onClick={loadData} disabled={loading}>
            <i className="bi bi-arrow-clockwise" /> {loading ? "Refreshing..." : "Refresh"}
          </button>
          {canAddSupplier && (
            <button type="button" className="primary" onClick={() => { setFormOpen((open) => !open); setError(""); }}>
              <i className={`bi ${formOpen ? "bi-x-lg" : "bi-plus-lg"}`} /> {formOpen ? "Close" : "Add Supplier"}
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert alert-error" role="alert"><i className="bi bi-exclamation-circle" /> {error}</div>}
      {success && <div className="success" role="status"><i className="bi bi-check-circle" /> {success}</div>}

      {formOpen && (
        <form className="card supplier-create-form" onSubmit={saveSupplier}>
          <div className="supplier-section-heading">
            <div><h2>Add supplier</h2><p>Supplier details will be available when recording stock-in deliveries.</p></div>
          </div>
          <div className="supplier-form-grid">
            <label>Supplier name <span className="required-mark">*</span>
              <input required value={form.supplier_name} onChange={(event) => setForm({ ...form, supplier_name: event.target.value })} />
            </label>
            <label>Contact person
              <input value={form.contact_person} onChange={(event) => setForm({ ...form, contact_person: event.target.value })} />
            </label>
            <label>Contact number
              <input value={form.contact_number} onChange={(event) => setForm({ ...form, contact_number: event.target.value })} />
            </label>
            <label>Email
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className="supplier-form-wide">Address
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </label>
          </div>
          <div className="supplier-form-actions">
            <button type="button" className="secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="primary" disabled={saving}>{saving ? "Saving..." : "Save Supplier"}</button>
          </div>
        </form>
      )}

      <section className="supplier-summary-grid" aria-label="Supplier and delivery summary">
        <article className="card"><span>Active suppliers</span><strong>{loading ? "—" : suppliers.length}</strong><small>Suppliers registered in this store</small></article>
        <article className="card"><span>Incoming records</span><strong>{loading ? "—" : stockIns.length}</strong><small>Recent stock-in entries</small></article>
        <article className="card"><span>Units received</span><strong>{loading ? "—" : totalReceived.toLocaleString()}</strong><small>{supplierFilter === "ALL" && !query ? "Across listed deliveries" : "For the current filter"}</small></article>
      </section>

      <section className="card supplier-directory-card">
        <div className="supplier-section-heading">
          <div><h2>Supplier directory</h2><p>Suppliers available for incoming stock records.</p></div>
        </div>
        {loading ? <div className="loading-message">Loading suppliers...</div> : suppliers.length === 0 ? (
          <div className="supplier-empty"><i className="bi bi-truck" /><strong>No suppliers yet</strong><span>Add a supplier to connect deliveries with their source.</span></div>
        ) : (
          <div className="supplier-directory-grid">
            {suppliers.map((supplier) => (
              <article className="supplier-directory-item" key={supplier.supplier_id}>
                <span className="supplier-directory-icon"><i className="bi bi-building" /></span>
                <div>
                  <strong>{supplier.supplier_name}</strong>
                  <span>{supplier.contact_person || supplier.contact_number || supplier.email || "No contact details"}</span>
                </div>
                <button type="button" className="supplier-history-link" onClick={() => setSupplierFilter(String(supplier.supplier_id))}>View deliveries</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card supplier-history-card">
        <div className="supplier-section-heading supplier-history-heading">
          <div><h2>Incoming items</h2><p>Stock-in time is shown in Manila time (PHT). Showing the latest 500 records.</p></div>
          <div className="supplier-history-filters">
            <select aria-label="Filter by supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
              <option value="ALL">All suppliers</option>
              {suppliers.map((supplier) => <option key={supplier.supplier_id} value={String(supplier.supplier_id)}>{supplier.supplier_name}</option>)}
            </select>
            <input type="search" aria-label="Search incoming items" placeholder="Search supplier or item..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
        <div className="table-container">
          <table className="data-table supplier-history-table">
            <thead><tr><th>Date and time (PHT)</th><th>Supplier</th><th>Item</th><th>Quantity in</th><th>Stock after</th><th>Reason / reference</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" className="empty-state">Loading incoming items...</td></tr> : visibleStockIns.length === 0 ? (
                <tr><td colSpan="6" className="empty-state"><h3>No incoming items found</h3><p>Stock-in records will appear here after they are saved from Inventory.</p></td></tr>
              ) : visibleStockIns.map((item) => (
                <tr key={item.movement_id}>
                  <td><strong>{formatManilaDate(item.movement_date)}</strong></td>
                  <td>{item.supplier_name || "No supplier recorded"}</td>
                  <td><strong>{item.product_name}</strong><small className="report-subtext">{item.sku || `Product #${item.product_id}`}</small></td>
                  <td><span className="status-badge success">+{Number(item.quantity || 0).toLocaleString()}</span></td>
                  <td>{Number(item.new_quantity || 0).toLocaleString()}</td>
                  <td>{String(item.reference_type || "SUPPLIER").replaceAll("_", " ")}{item.remarks ? <small className="report-subtext">{item.remarks}</small> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
