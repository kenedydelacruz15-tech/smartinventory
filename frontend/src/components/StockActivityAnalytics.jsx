import { useEffect, useState } from "react";
import api from "../services/api";

const REASONS = [
  "SUPPLIER",
  "CUSTOMER_RETURN",
  "SALE",
  "DAMAGED",
  "RETURN_TO_SUPPLIER",
  "TRANSFER",
  "LOST",
  "ADJUSTMENT",
  "OTHER",
];

const formatReason = (reason) =>
  reason
    ? reason.toLowerCase().split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ")
    : "Unspecified";

const toLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const defaultDateRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return {
    start_date: toLocalDateInput(start),
    end_date: toLocalDateInput(end),
    movement_type: "",
    reference_type: "",
  };
};

export default function StockActivityAnalytics() {
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState({ transaction_count: 0, stock_in_quantity: 0, stock_out_quantity: 0 });
  const [filters, setFilters] = useState(defaultDateRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMovements = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/stock-movements/", {
        params: { limit: 100, include_summary: true, ...nextFilters },
      });
      setMovements(Array.isArray(response.data?.movements) ? response.data.movements : []);
      setSummary(response.data?.summary || { transaction_count: 0, stock_in_quantity: 0, stock_out_quantity: 0 });
    } catch (requestError) {
      console.error("Dashboard stock activity load error:", requestError);
      setError(requestError.response?.data?.error || "Unable to load stock activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

  const stockIn = Number(summary.stock_in_quantity || 0);
  const stockOut = Number(summary.stock_out_quantity || 0);
  const net = stockIn - stockOut;

  const applyFilters = (event) => {
    event.preventDefault();
    loadMovements(filters);
  };

  const resetFilters = () => {
    const defaults = defaultDateRange();
    setFilters(defaults);
    loadMovements(defaults);
  };

  return (
    <section className="dashboard-panel stock-activity-panel">
      <div className="dashboard-panel-title">
        <div>
          <i className="bi bi-activity" />
          <span>
            <strong>Stock Activity</strong>
            <small>Stock-in, stock-out, and adjustment history</small>
          </span>
        </div>
        <button type="button" className="dashboard-refresh" disabled={loading} onClick={() => loadMovements()}>
          <i className="bi bi-arrow-clockwise" /> {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="stock-activity-stats">
        <div><span>Stock In</span><strong className="stock-activity-in">{loading ? "…" : stockIn.toLocaleString()}</strong><small>units received</small></div>
        <div><span>Stock Out</span><strong className="stock-activity-out">{loading ? "…" : stockOut.toLocaleString()}</strong><small>units removed</small></div>
        <div><span>Net Change</span><strong>{loading ? "…" : `${net > 0 ? "+" : ""}${net.toLocaleString()}`}</strong><small>units in selected period</small></div>
        <div><span>Transactions</span><strong>{loading ? "…" : Number(summary.transaction_count || 0).toLocaleString()}</strong><small>recorded movements</small></div>
      </div>

      <form className="stock-activity-filters" onSubmit={applyFilters}>
        <label><span>Date range</span><div className="stock-date-range">
          <input aria-label="Start date" type="date" value={filters.start_date} onChange={(event) => setFilters({ ...filters, start_date: event.target.value })} />
          <span>to</span>
          <input aria-label="End date" type="date" value={filters.end_date} onChange={(event) => setFilters({ ...filters, end_date: event.target.value })} />
        </div></label>
        <label><span>Movement type</span>
          <select value={filters.movement_type} onChange={(event) => setFilters({ ...filters, movement_type: event.target.value })}>
            <option value="">All movements</option>
            <option value="STOCK_IN">Stock In</option>
            <option value="STOCK_OUT">Stock Out</option>
          </select>
        </label>
        <label><span>Reason</span>
          <select value={filters.reference_type} onChange={(event) => setFilters({ ...filters, reference_type: event.target.value })}>
            <option value="">All reasons</option>
            {REASONS.map((reason) => <option key={reason} value={reason}>{formatReason(reason)}</option>)}
          </select>
        </label>
        <div className="stock-filter-actions">
          <button type="submit" className="primary" disabled={loading}>Apply filters</button>
          <button type="button" className="secondary" disabled={loading} onClick={resetFilters}>Reset</button>
        </div>
      </form>

      {error && <div className="alert alert-error stock-activity-error" role="alert">{error}</div>}

      <div className="table-container stock-activity-table-container">
        <table className="dashboard-table stock-activity-table">
          <thead>
            <tr><th>Date &amp; Time</th><th>Product</th><th>Action</th><th>Reason / Destination</th><th>Quantity</th><th>Stock Before → After</th><th>Reference / Notes</th></tr>
          </thead>
          <tbody>
            {loading && movements.length === 0 ? (
              <tr><td colSpan="7" className="dashboard-empty">Loading stock activity...</td></tr>
            ) : movements.length === 0 ? (
              <tr><td colSpan="7" className="dashboard-empty">No stock activity found for the selected filters.</td></tr>
            ) : movements.map((movement) => {
              const isStockIn = movement.movement_type === "STOCK_IN";
              return (
                <tr key={movement.movement_id}>
                  <td>{movement.created_at ? new Date(movement.created_at).toLocaleString() : "—"}</td>
                  <td><strong>{movement.product_name || "Unknown product"}</strong><small>{movement.sku || movement.part_number || "—"}</small></td>
                  <td><span className={`status-badge ${isStockIn ? "success" : "warning"}`}>{isStockIn ? "Stock In" : "Stock Out"}</span></td>
                  <td>{formatReason(movement.reference_type || movement.movement_type)}</td>
                  <td className={isStockIn ? "stock-activity-in" : "stock-activity-out"}>{isStockIn ? "+" : "-"}{Number(movement.quantity || 0).toLocaleString()}</td>
                  <td>{movement.previous_quantity ?? "—"} → {movement.new_quantity ?? "—"}</td>
                  <td>{[movement.reference_id, movement.remarks].filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="stock-activity-footnote">Showing the 100 most recent matching transactions. Totals include all matching records.</p>
    </section>
  );
}
