import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function OwnerDashboard() {
  const [setup, setSetup] = useState(null);
  const [summary, setSummary] = useState(null);
  const [categoryStock, setCategoryStock] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [setupRes, summaryRes, categoryRes, statusRes, movementRes] =
        await Promise.all([
          api.get("/api/store/setup-status"),
          api.get("/api/dashboard/summary"),
          api.get("/api/dashboard/charts/category-stock"),
          api.get("/api/dashboard/charts/inventory-status"),
          api.get("/api/dashboard/charts/stock-movements?days=7")
        ]);

      setSetup(setupRes.data || {});
      setSummary(summaryRes.data || {});
      setCategoryStock(categoryRes.data?.data || []);
      setInventoryStatus(statusRes.data?.data || []);
      setStockMovements(movementRes.data?.data || []);
    } catch (err) {
      console.error("Could not load dashboard:", err);
      setError(err.response?.data?.error || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const statusCount = (status) => {
    const item = inventoryStatus.find((row) => row.stock_status === status);
    return Number(item?.product_count || 0);
  };

  const movementCount = (type) => {
    const item = stockMovements.find((row) => row.movement_type === type);
    return Number(item?.total_quantity || 0);
  };

  const categoryTotal = useMemo(
    () => categoryStock.reduce((total, item) => total + Number(item.total_stock || 0), 0),
    [categoryStock]
  );

  const topCategories = [...categoryStock]
    .sort((a, b) => Number(b.total_stock || 0) - Number(a.total_stock || 0))
    .slice(0, 5);

  return (
    <div className="inventory-dashboard">
      <div className="dashboard-top-row">
        <div>
          <div className="dashboard-breadcrumb">STORE / CONTROL PANEL</div>
          <h1>Dashboard</h1>
          <p>Monitor your motorcycle parts inventory and daily store operations.</p>
        </div>

        <button className="dashboard-refresh" onClick={loadDashboard} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {!loading && setup?.setup_complete === false && (
        <div className="dashboard-warning">
          <div className="dashboard-warning-icon"><i className="bi bi-exclamation-triangle-fill" /></div>
          <div>
            <strong>Store setup is incomplete</strong>
            <span>Complete your store information before starting normal operations.</span>
          </div>
          <Link to="/settings/store">Complete Setup</Link>
        </div>
      )}

      {error && <div className="dashboard-error"><i className="bi bi-exclamation-circle" /> {error}</div>}

      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi green">
          <span><i className="bi bi-box-seam" /> Products</span>
          <strong>{loading ? "..." : summary?.total_products ?? 0}</strong>
          <small>Active products</small>
        </div>
        <div className="dashboard-kpi blue">
          <span><i className="bi bi-stack" /> Inventory</span>
          <strong>{loading ? "..." : summary?.total_stock ?? 0}</strong>
          <small>Total units in stock</small>
        </div>
        <div className="dashboard-kpi orange">
          <span><i className="bi bi-exclamation-circle" /> Low Stock</span>
          <strong>{loading ? "..." : summary?.inventory?.low_stock ?? 0}</strong>
          <small>Needs attention</small>
        </div>
        <div className="dashboard-kpi red">
          <span><i className="bi bi-x-octagon" /> Out of Stock</span>
          <strong>{loading ? "..." : summary?.inventory?.out_of_stock ?? 0}</strong>
          <small>Zero stock products</small>
        </div>
        <div className="dashboard-kpi purple">
          <span><i className="bi bi-bell" /> Alerts</span>
          <strong>{loading ? "..." : summary?.unread_alerts ?? 0}</strong>
          <small>Items needing action</small>
        </div>
        <div className="dashboard-kpi cyan">
          <span><i className="bi bi-box-arrow-in-down" /> Stock In</span>
          <strong>{loading ? "..." : movementCount("STOCK_IN")}</strong>
          <small>Units added · 7 days</small>
        </div>
        <div className="dashboard-kpi teal">
          <span><i className="bi bi-box-arrow-up" /> Stock Out</span>
          <strong>{loading ? "..." : movementCount("STOCK_OUT")}</strong>
          <small>Units removed · 7 days</small>
        </div>
        <div className="dashboard-kpi dark">
          <span><i className="bi bi-grid" /> Categories</span>
          <strong>{loading ? "..." : categoryStock.length}</strong>
          <small>{categoryTotal.toLocaleString()} units grouped</small>
        </div>
      </div>

      <div className="dashboard-panel-heading">
        <div>
          <h2>Inventory Overview</h2>
          <span>Current stock health and recent movement.</span>
        </div>
        <Link to="/inventory">View Inventory <i className="bi bi-arrow-right" /></Link>
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-title">
            <div><i className="bi bi-bar-chart-fill" /><strong>Stock Movement</strong></div>
            <span>Last 7 days</span>
          </div>

          <div className="movement-visual">
            <div className="movement-column">
              <div className="movement-bar in" style={{ height: `${Math.max(14, Math.min(100, movementCount("STOCK_IN") / Math.max(movementCount("STOCK_IN"), movementCount("STOCK_OUT"), 1) * 100))}%` }} />
              <strong>{movementCount("STOCK_IN").toLocaleString()}</strong>
              <small>Stock In</small>
            </div>
            <div className="movement-column">
              <div className="movement-bar out" style={{ height: `${Math.max(14, Math.min(100, movementCount("STOCK_OUT") / Math.max(movementCount("STOCK_IN"), movementCount("STOCK_OUT"), 1) * 100))}%` }} />
              <strong>{movementCount("STOCK_OUT").toLocaleString()}</strong>
              <small>Stock Out</small>
            </div>
            <div className="movement-summary">
              <span>Net movement</span>
              <strong>{(movementCount("STOCK_IN") - movementCount("STOCK_OUT")).toLocaleString()} units</strong>
              <small>Based on recorded stock movements</small>
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-title">
            <div><i className="bi bi-pie-chart-fill" /><strong>Inventory Status</strong></div>
            <span>{loading ? "Loading..." : `${summary?.total_products ?? 0} products`}</span>
          </div>

          <div className="status-dashboard-grid">
            <div className="status-dashboard-item good"><span>In Stock</span><strong>{statusCount("IN_STOCK")}</strong></div>
            <div className="status-dashboard-item warning"><span>Low Stock</span><strong>{statusCount("LOW_STOCK")}</strong></div>
            <div className="status-dashboard-item danger"><span>Out of Stock</span><strong>{statusCount("OUT_OF_STOCK")}</strong></div>
          </div>
        </div>
      </div>

      <div className="dashboard-two-column">
        <div className="dashboard-panel dashboard-table-panel">
          <div className="dashboard-panel-title">
            <div><i className="bi bi-trophy-fill" /><strong>Top Stock Categories</strong></div>
            <span>Current units</span>
          </div>

          {topCategories.length === 0 ? (
            <div className="dashboard-empty">No category stock data available.</div>
          ) : (
            <table className="dashboard-table">
              <thead><tr><th>Category</th><th>Units in Stock</th><th>Share</th></tr></thead>
              <tbody>
                {topCategories.map((item, index) => {
                  const units = Number(item.total_stock || 0);
                  const share = categoryTotal ? Math.round((units / categoryTotal) * 100) : 0;
                  return (
                    <tr key={`${item.category_name}-${index}`}>
                      <td><strong>{item.category_name}</strong></td>
                      <td>{units.toLocaleString()}</td>
                      <td><div className="share-cell"><div><span style={{ width: `${share}%` }} /></div><b>{share}%</b></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashboard-panel dashboard-table-panel">
          <div className="dashboard-panel-title">
            <div><i className="bi bi-lightning-fill" /><strong>Quick Actions</strong></div>
            <span>Store operations</span>
          </div>
          <div className="dashboard-actions">
            <Link to="/products" className="dashboard-action green"><i className="bi bi-plus-square" /><span><strong>Add Product</strong><small>Create a new motorcycle part</small></span><i className="bi bi-chevron-right" /></Link>
            <Link to="/inventory" className="dashboard-action blue"><i className="bi bi-boxes" /><span><strong>Manage Inventory</strong><small>Stock in, stock out and adjust</small></span><i className="bi bi-chevron-right" /></Link>
            <Link to="/categories" className="dashboard-action orange"><i className="bi bi-grid" /><span><strong>Categories</strong><small>Organize your products</small></span><i className="bi bi-chevron-right" /></Link>
            <Link to="/settings/store" className="dashboard-action purple"><i className="bi bi-gear" /><span><strong>Store Settings</strong><small>Update store information</small></span><i className="bi bi-chevron-right" /></Link>
          </div>
        </div>
      </div>

      <div className="dashboard-footer-note">
        <i className="bi bi-info-circle" /> Dashboard values are based on the current store records and recorded inventory movements.
      </div>
    </div>
  );
}
