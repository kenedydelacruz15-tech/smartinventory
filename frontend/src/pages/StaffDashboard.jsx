import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function StaffDashboard() {
  const [summary, setSummary] = useState(null);
  const [inventoryStatus, setInventoryStatus] = useState([]);
  const [movements, setMovements] = useState([]);
  const [categoryStock, setCategoryStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const [summaryRes, statusRes, movementRes, categoryRes] = await Promise.all([
        api.get("/api/dashboard/summary"),
        api.get("/api/dashboard/charts/inventory-status"),
        api.get("/api/dashboard/charts/stock-movements?days=7"),
        api.get("/api/dashboard/charts/category-stock")
      ]);
      setSummary(summaryRes.data || {});
      setInventoryStatus(statusRes.data?.data || []);
      setMovements(movementRes.data?.data || []);
      setCategoryStock(categoryRes.data?.data || []);
    } catch (err) {
      console.error("Could not load staff dashboard:", err);
      setError(err.response?.data?.error || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const statusCount = (status) => Number(
    inventoryStatus.find((item) => item.stock_status === status)?.product_count || 0
  );

  const movementCount = (type) => Number(
    movements.find((item) => item.movement_type === type)?.total_quantity || 0
  );

  const categoryTotal = useMemo(
    () => categoryStock.reduce((sum, item) => sum + Number(item.total_stock || 0), 0),
    [categoryStock]
  );

  const topCategories = [...categoryStock]
    .sort((a, b) => Number(b.total_stock || 0) - Number(a.total_stock || 0))
    .slice(0, 5);

  return (
    <div className="inventory-dashboard staff-inventory-dashboard">
      <div className="dashboard-top-row">
        <div>
          <div className="dashboard-breadcrumb">STORE / INVENTORY OPERATIONS</div>
          <h1>Staff Dashboard</h1>
          <p>Monitor stock levels and handle daily inventory operations.</p>
        </div>
        <button className="dashboard-refresh" onClick={loadDashboard} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="dashboard-error"><i className="bi bi-exclamation-circle" /> {error}</div>}

      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi green"><span><i className="bi bi-box-seam" /> Products</span><strong>{loading ? "..." : summary?.total_products ?? 0}</strong><small>Active products</small></div>
        <div className="dashboard-kpi blue"><span><i className="bi bi-stack" /> Inventory</span><strong>{loading ? "..." : summary?.total_stock ?? 0}</strong><small>Total units in stock</small></div>
        <div className="dashboard-kpi orange"><span><i className="bi bi-exclamation-circle" /> Low Stock</span><strong>{loading ? "..." : summary?.inventory?.low_stock ?? 0}</strong><small>Needs attention</small></div>
        <div className="dashboard-kpi red"><span><i className="bi bi-x-octagon" /> Out of Stock</span><strong>{loading ? "..." : summary?.inventory?.out_of_stock ?? 0}</strong><small>Zero stock products</small></div>
        <div className="dashboard-kpi purple"><span><i className="bi bi-bell" /> Alerts</span><strong>{loading ? "..." : summary?.unread_alerts ?? 0}</strong><small>Items needing action</small></div>
        <div className="dashboard-kpi cyan"><span><i className="bi bi-box-arrow-in-down" /> Stock In</span><strong>{loading ? "..." : movementCount("STOCK_IN")}</strong><small>Units · last 7 days</small></div>
        <div className="dashboard-kpi teal"><span><i className="bi bi-box-arrow-up" /> Stock Out</span><strong>{loading ? "..." : movementCount("STOCK_OUT")}</strong><small>Units · last 7 days</small></div>
        <div className="dashboard-kpi dark"><span><i className="bi bi-grid" /> Categories</span><strong>{loading ? "..." : categoryStock.length}</strong><small>{categoryTotal.toLocaleString()} units grouped</small></div>
      </div>

      <div className="dashboard-panel-heading">
        <div><h2>Inventory Overview</h2><span>Current stock health and recent movement.</span></div>
        <Link to="/inventory">View Inventory <i className="bi bi-arrow-right" /></Link>
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-bar-chart-fill" /><strong>Stock Movement</strong></div><span>Last 7 days</span></div>
          <div className="movement-visual">
            <div className="movement-column"><div className="movement-bar in" style={{ height: `${Math.max(14, movementCount("STOCK_IN") / Math.max(movementCount("STOCK_IN"), movementCount("STOCK_OUT"), 1) * 100)}%` }} /><strong>{movementCount("STOCK_IN").toLocaleString()}</strong><small>Stock In</small></div>
            <div className="movement-column"><div className="movement-bar out" style={{ height: `${Math.max(14, movementCount("STOCK_OUT") / Math.max(movementCount("STOCK_IN"), movementCount("STOCK_OUT"), 1) * 100)}%` }} /><strong>{movementCount("STOCK_OUT").toLocaleString()}</strong><small>Stock Out</small></div>
            <div className="movement-summary"><span>Net movement</span><strong>{(movementCount("STOCK_IN") - movementCount("STOCK_OUT")).toLocaleString()} units</strong><small>Recorded inventory movements</small></div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-pie-chart-fill" /><strong>Inventory Status</strong></div><span>Product health</span></div>
          <div className="status-dashboard-grid">
            <div className="status-dashboard-item good"><span>In Stock</span><strong>{loading ? "..." : statusCount("IN_STOCK")}</strong></div>
            <div className="status-dashboard-item warning"><span>Low Stock</span><strong>{loading ? "..." : statusCount("LOW_STOCK")}</strong></div>
            <div className="status-dashboard-item danger"><span>Out of Stock</span><strong>{loading ? "..." : statusCount("OUT_OF_STOCK")}</strong></div>
          </div>
        </div>
      </div>

      <div className="dashboard-two-column">
        <div className="dashboard-panel dashboard-table-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-bar-chart-steps" /><strong>Stock by Category</strong></div><span>Current units</span></div>
          {topCategories.length === 0 ? <div className="dashboard-empty">No category stock data available.</div> : (
            <table className="dashboard-table"><thead><tr><th>Category</th><th>Units</th><th>Share</th></tr></thead><tbody>
              {topCategories.map((item, index) => { const units = Number(item.total_stock || 0); const share = categoryTotal ? Math.round(units / categoryTotal * 100) : 0; return <tr key={`${item.category_name}-${index}`}><td><strong>{item.category_name}</strong></td><td>{units.toLocaleString()}</td><td><div className="share-cell"><div><span style={{ width: `${share}%` }} /></div><b>{share}%</b></div></td></tr>; })}
            </tbody></table>
          )}
        </div>

        <div className="dashboard-panel dashboard-table-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-lightning-fill" /><strong>Quick Actions</strong></div><span>Daily operations</span></div>
          <div className="dashboard-actions">
            <Link to="/inventory" className="dashboard-action green"><i className="bi bi-boxes" /><span><strong>Manage Inventory</strong><small>Stock in, stock out and adjust</small></span><i className="bi bi-chevron-right" /></Link>
            <Link to="/analytics" className="dashboard-action blue"><i className="bi bi-bar-chart-line" /><span><strong>View Analytics</strong><small>Review inventory trends</small></span><i className="bi bi-chevron-right" /></Link>
          </div>
        </div>
      </div>

      <div className="dashboard-footer-note"><i className="bi bi-shield-check" /> Staff access is limited to daily inventory operations.</div>
    </div>
  );
}
