import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { getRole } from "../services/auth";
import BackButton from "../components/BackButton";
import "./AuditLogs.css";

const ACTION_LABELS = {
  PRODUCT_ADDED: "Add", PRODUCT_CREATED: "Add", PRODUCT_EDITED: "Edit", PRODUCT_UPDATED: "Edit",
  PRODUCT_DEACTIVATED: "Deactivate", PRODUCT_PERMANENTLY_DELETED: "Delete", PRODUCT_RESTORED: "Restore",
  INVENTORY_ADDED: "Add", INVENTORY_CREATED: "Add", INVENTORY_EDITED: "Edit", INVENTORY_UPDATED: "Edit",
  INVENTORY_ADJUSTED: "Adjust", STOCK_IN: "Stock In", STOCK_OUT: "Stock Out",
  INVENTORY_DEACTIVATED: "Deactivate", INVENTORY_PERMANENTLY_DELETED: "Delete", INVENTORY_RESTORED: "Restore",
  CATEGORY_ADDED: "Add", CATEGORY_CREATED: "Add", CATEGORY_EDITED: "Edit", CATEGORY_UPDATED: "Edit",
  CATEGORY_DEACTIVATED: "Deactivate", CATEGORY_PERMANENTLY_DELETED: "Delete", CATEGORY_RESTORED: "Restore",
  USER_ADDED: "Add", USER_CREATED: "Add", USER_EDITED: "Edit", USER_UPDATED: "Edit",
  USER_ACTIVATED: "Activate", USER_DEACTIVATED: "Deactivate", USER_PERMANENTLY_DELETED: "Delete",
  COMPATIBILITY_ADDED: "Compatibility Add", COMPATIBILITY_REMOVED: "Compatibility Remove",
  STORE_CREATED: "Add", STORE_PERMANENTLY_DELETED: "Delete",
};
const pretty = (value) => String(value || "—").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const actionLabel = (log) => ACTION_LABELS[String(log.action || "").toUpperCase()] || pretty(log.action || log.event_category);
const sourceLabel = (log) => pretty(log.entity_type || log.event_category || "Other");

export default function AuditLogs() {
  const role = String(getRole() || "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const endpoint = isAdmin ? "/api/audit-logs/admin" : "/api/audit-logs/owner";
      const params = filter === "ALL" ? {} : { category: filter };
      const response = await api.get(endpoint, { params });
      const data = Array.isArray(response.data) ? response.data : (response.data?.logs || []);
      setLogs(data);
    } catch (e) {
      setError(e.response?.data?.error || "Could not load audit logs. Check the backend terminal for audit-log errors.");
      setLogs([]);
    } finally { setLoading(false); }
  }, [isAdmin, filter]);

  useEffect(() => { load(); }, [load]);

  const filteredLogs = filter !== "ALL"
    ? logs.filter((log) => String(log.action || "").toUpperCase() === filter)
    : logs;

  return (
    <div className="admin-page audit-logs-page">
      <BackButton fallback={isAdmin ? "/admin/dashboard" : "/owner/dashboard"} label="Back to Dashboard" />
      <div className="page-header audit-logs-header">
        <div><h1>Audit Logs</h1><p className="muted">Detailed history of inventory, products, categories, and user activity.</p></div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </div>
      <div className="audit-logs-toolbar">
        <label htmlFor="audit-filter">{isAdmin ? "Event filter" : "Activity filter"}</label>
        <select id="audit-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">All activities</option>
          {isAdmin ? <><option value="STORE_CREATED">Store Added</option><option value="USER_CREATED">User Added</option></> : <>
            <option value="STOCK_IN">Stock In</option><option value="STOCK_OUT">Stock Out</option><option value="INVENTORY_ADJUSTED">Adjust</option>
            <option value="INVENTORY_DEACTIVATED">Inventory Deactivated</option><option value="PRODUCT_ADDED">Product Added</option><option value="PRODUCT_EDITED">Product Edited</option><option value="PRODUCT_DEACTIVATED">Product Deactivated</option>
            <option value="CATEGORY_ADDED">Category Added</option><option value="CATEGORY_EDITED">Category Edited</option><option value="CATEGORY_DEACTIVATED">Category Deactivated</option>
            <option value="USER_ADDED">Staff Added</option><option value="USER_EDITED">Staff Edited</option><option value="USER_DEACTIVATED">Staff Deactivated</option>
          </>}
        </select>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="dashboard-section audit-logs-table-section">
        <div className="table-wrapper">
          <table className="audit-logs-table">
            <thead><tr><th>Time</th><th>Source</th><th>Category</th><th>Description</th><th>Username</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5">Loading audit logs…</td></tr> : filteredLogs.length === 0 ? <tr><td colSpan="5">No audit records found for this activity.</td></tr> : filteredLogs.map((log) => (
                <tr key={log.log_id ?? log.audit_log_id}>
                  <td>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                  <td><span className="audit-source-pill">{sourceLabel(log)}</span></td>
                  <td><span className={`audit-action-pill audit-action-${String(log.action || "other").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{actionLabel(log)}</span></td>
                  <td className="audit-description">{log.description || `${sourceLabel(log)} #${log.entity_id || "—"}`}</td>
                  <td>{log.username || log.actor_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
