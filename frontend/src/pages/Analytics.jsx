import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import BackButton from "../components/BackButton";

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [status, setStatus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const [summaryRes, movementRes, statusRes, categoryRes] = await Promise.all([
        api.get("/api/dashboard/summary"),
        api.get("/api/dashboard/charts/stock-movements?days=7"),
        api.get("/api/dashboard/charts/inventory-status"),
        api.get("/api/dashboard/charts/category-stock")
      ]);
      setSummary(summaryRes.data || {});
      setMovements(movementRes.data?.data || []);
      setStatus(statusRes.data?.data || []);
      setCategories(categoryRes.data?.data || []);
    } catch (err) {
      console.error("Could not load analytics:", err);
      setError(err.response?.data?.error || "Could not load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnalytics(); }, []);

  const stockIn = Number(movements.find((item) => item.movement_type === "STOCK_IN")?.total_quantity || 0);
  const stockOut = Number(movements.find((item) => item.movement_type === "STOCK_OUT")?.total_quantity || 0);
  const net = stockIn - stockOut;
  const inStock = Number(status.find((item) => item.stock_status === "IN_STOCK")?.product_count || 0);
  const lowStock = Number(status.find((item) => item.stock_status === "LOW_STOCK")?.product_count || 0);
  const outOfStock = Number(status.find((item) => item.stock_status === "OUT_OF_STOCK")?.product_count || 0);
  const totalProducts = Number(summary?.total_products || 0);
  const healthTotal = Math.max(inStock + lowStock + outOfStock, 1);
  const healthPercent = {
    in: (inStock / healthTotal) * 100,
    low: (lowStock / healthTotal) * 100,
    out: (outOfStock / healthTotal) * 100
  };
  const topCategories = [...categories]
    .sort((a, b) => Number(b.total_stock || 0) - Number(a.total_stock || 0))
    .slice(0, 8);
  const maxCategory = Math.max(...topCategories.map((item) => Number(item.total_stock || 0)), 1);
  const totalCategoryStock = useMemo(
    () => categories.reduce((sum, item) => sum + Number(item.total_stock || 0), 0),
    [categories]
  );
  const movementMax = Math.max(stockIn, stockOut, 1);

  return (
    <div className="inventory-dashboard analytics-page">
      <BackButton fallback="/owner/dashboard" label="Back to Owner Dashboard" />

      <div className="dashboard-top-row">
        <div>
          <div className="dashboard-breadcrumb">STORE / ANALYTICS</div>
          <h1>Inventory Analytics</h1>
          <p>See stock movement, inventory health, and category levels at a glance.</p>
        </div>
        <button className="dashboard-refresh" onClick={loadAnalytics} disabled={loading}>
          <i className="bi bi-arrow-clockwise" /> {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="dashboard-error"><i className="bi bi-exclamation-circle" /> {error}</div>}

      <div className="dashboard-kpi-grid analytics-kpis">
        <div className="dashboard-kpi green"><span><i className="bi bi-box-seam" /> Products</span><strong>{loading ? "..." : totalProducts}</strong><small>Active products</small></div>
        <div className="dashboard-kpi blue"><span><i className="bi bi-stack" /> Inventory</span><strong>{loading ? "..." : Number(summary?.total_stock || 0).toLocaleString()}</strong><small>Total units in stock</small></div>
        <div className="dashboard-kpi orange"><span><i className="bi bi-exclamation-circle" /> Low Stock</span><strong>{loading ? "..." : lowStock}</strong><small>Needs replenishment</small></div>
        <div className="dashboard-kpi red"><span><i className="bi bi-x-octagon" /> Out of Stock</span><strong>{loading ? "..." : outOfStock}</strong><small>Zero stock products</small></div>
        <div className="dashboard-kpi cyan"><span><i className="bi bi-box-arrow-in-down" /> Stock In</span><strong>{loading ? "..." : stockIn.toLocaleString()}</strong><small>Last 7 days</small></div>
        <div className="dashboard-kpi teal"><span><i className="bi bi-box-arrow-up" /> Stock Out</span><strong>{loading ? "..." : stockOut.toLocaleString()}</strong><small>Last 7 days</small></div>
      </div>

      <div className="dashboard-panel-heading">
        <div><h2>Inventory Performance</h2><span>Useful visual summaries from your current inventory records.</span></div>
        <Link to="/inventory">Open Inventory <i className="bi bi-arrow-right" /></Link>
      </div>

      <div className="analytics-visual-grid">
        <div className="dashboard-panel analytics-chart-panel">
          <div className="dashboard-panel-title">
            <div><i className="bi bi-bar-chart-fill" /><strong>Stock Movement</strong></div>
            <span>Last 7 days</span>
          </div>
          <div className="analytics-column-chart">
            <div className="analytics-y-line"><span>Units</span></div>
            <div className="analytics-columns">
              <div className="analytics-column-item">
                <strong>{stockIn.toLocaleString()}</strong>
                <div className="analytics-column in" style={{ height: `${Math.max(28, (stockIn / movementMax) * 175)}px` }} />
                <span><i className="legend-dot green-dot" /> Stock In</span>
              </div>
              <div className="analytics-column-item">
                <strong>{stockOut.toLocaleString()}</strong>
                <div className="analytics-column out" style={{ height: `${Math.max(28, (stockOut / movementMax) * 175)}px` }} />
                <span><i className="legend-dot red-dot" /> Stock Out</span>
              </div>
              <div className={`analytics-net-card ${net >= 0 ? "positive" : "negative"}`}>
                <small>Net movement</small>
                <strong>{net >= 0 ? "+" : ""}{net.toLocaleString()}</strong>
                <span>units</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-panel analytics-chart-panel">
          <div className="dashboard-panel-title">
            <div><i className="bi bi-pie-chart-fill" /><strong>Inventory Health</strong></div>
            <span>{totalProducts} products</span>
          </div>
          <div className="analytics-health-chart">
            <div
              className="analytics-donut"
              style={{
                background: `conic-gradient(#0aaa68 0 ${healthPercent.in}%, #f39a05 ${healthPercent.in}% ${healthPercent.in + healthPercent.low}%, #e7463d ${healthPercent.in + healthPercent.low}% 100%)`
              }}
            >
              <div><strong>{totalProducts}</strong><span>Products</span></div>
            </div>
            <div className="analytics-health-legend">
              <div><span><i className="legend-dot green-dot" /> In Stock</span><strong>{inStock}</strong></div>
              <div><span><i className="legend-dot orange-dot" /> Low Stock</span><strong>{lowStock}</strong></div>
              <div><span><i className="legend-dot red-dot" /> Out of Stock</span><strong>{outOfStock}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-panel analytics-category-panel">
        <div className="dashboard-panel-title">
          <div><i className="bi bi-grid-fill" /><strong>Stock by Category</strong></div>
          <span>{totalCategoryStock.toLocaleString()} total units</span>
        </div>
        {topCategories.length === 0 ? (
          <div className="dashboard-empty">No category data available.</div>
        ) : (
          <div className="analytics-category-chart">
            {topCategories.map((item, index) => {
              const units = Number(item.total_stock || 0);
              const pct = Math.round((units / maxCategory) * 100);
              return (
                <div className="analytics-category-row" key={`${item.category_name}-${index}`}>
                  <div className="analytics-category-name"><strong>{item.category_name}</strong><span>{units.toLocaleString()} units</span></div>
                  <div className="analytics-category-track"><span style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-two-column analytics-bottom-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-lightbulb-fill" /><strong>Inventory Insight</strong></div></div>
          <div className="analytics-insight">
            <strong>{outOfStock > 0 ? "Inventory attention required" : lowStock > 0 ? "Some products need attention" : "Inventory is currently healthy"}</strong>
            <p>{outOfStock > 0 ? `${outOfStock} product${outOfStock === 1 ? "" : "s"} currently have zero stock.` : lowStock > 0 ? `${lowStock} product${lowStock === 1 ? "" : "s"} are at or below the minimum stock level.` : "No low or out-of-stock products are currently recorded."}</p>
          </div>
        </div>
        <div className="dashboard-panel">
          <div className="dashboard-panel-title"><div><i className="bi bi-arrow-left-right" /><strong>Movement Summary</strong></div><span>Last 7 days</span></div>
          <div className="analytics-summary-list">
            <div><span>Stock In</span><strong>{stockIn.toLocaleString()}</strong></div>
            <div><span>Stock Out</span><strong>{stockOut.toLocaleString()}</strong></div>
            <div><span>Net Movement</span><strong className={net >= 0 ? "text-green" : "text-red"}>{net >= 0 ? "+" : ""}{net.toLocaleString()}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
