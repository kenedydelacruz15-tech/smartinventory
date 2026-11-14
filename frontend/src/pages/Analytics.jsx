import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import BackButton from "../components/BackButton";

const number = (value) => Number(value || 0).toLocaleString();

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [dailyMovements, setDailyMovements] = useState([]);
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
        api.get("/api/dashboard/charts/category-stock"),
      ]);
      setSummary(summaryRes.data || {});
      setMovements(movementRes.data?.data || []);
      setDailyMovements(movementRes.data?.daily_data || []);
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
  const totalHealth = Math.max(inStock + lowStock + outOfStock, 1);
  const totalCategoryStock = useMemo(
    () => categories.reduce((sum, item) => sum + Number(item.total_stock || 0), 0),
    [categories]
  );
  const topCategories = [...categories]
    .sort((a, b) => Number(b.total_stock || 0) - Number(a.total_stock || 0))
    .slice(0, 8);
  const maxCategoryStock = Math.max(...topCategories.map((item) => Number(item.total_stock || 0)), 1);
  const dailyTrend = useMemo(() => {
    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date()).reduce((parts, part) => {
      if (part.type !== "literal") parts[part.type] = part.value;
      return parts;
    }, {});
    const today = Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day));
    const byDate = new Map(dailyMovements.map((item) => [item.movement_date, item]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today - (6 - index) * 86400000).toISOString().slice(0, 10);
      const movement = byDate.get(date) || {};
      return {
        date,
        label: new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)),
        stockIn: Number(movement.stock_in || 0),
        stockOut: Number(movement.stock_out || 0),
      };
    });
  }, [dailyMovements]);
  const dailyMax = Math.max(1, ...dailyTrend.flatMap((day) => [day.stockIn, day.stockOut]));

  return (
    <div className="shadcn-analytics">
      <BackButton fallback="/owner/dashboard" label="Back to Owner Dashboard" />
      <header className="shadcn-analytics-header">
        <div>
          <div className="shadcn-breadcrumb">Workspace / Analytics</div>
          <h1>Analytics</h1>
          <p>Inventory health and stock movement for your store.</p>
        </div>
        <div className="shadcn-header-actions">
          <span className="shadcn-date-chip"><i className="bi bi-calendar3" /> Last 7 days</span>
          <button type="button" className="shadcn-button shadcn-button-outline" onClick={loadAnalytics} disabled={loading}>
            <i className={`bi ${loading ? "bi-arrow-repeat" : "bi-arrow-clockwise"}`} /> {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      {error && <div className="shadcn-alert" role="alert"><i className="bi bi-exclamation-circle" /> {error}</div>}

      <section className="shadcn-metric-grid" aria-label="Inventory metrics">
        {[
          ["Total products", totalProducts, "bi-box-seam", "blue"],
          ["Units in stock", Number(summary?.total_stock || 0), "bi-stack", "violet"],
          ["Low stock", lowStock, "bi-exclamation-triangle", "amber"],
          ["Out of stock", outOfStock, "bi-x-circle", "red"],
        ].map(([label, value, icon, tone]) => (
          <article className="shadcn-card shadcn-metric-card" key={label}>
            <div className="shadcn-metric-top"><span>{label}</span><i className={`bi ${icon} metric-${tone}`} /></div>
            <strong>{loading ? "—" : number(value)}</strong>
            <small>{label === "Units in stock" ? "Current quantity on hand" : label === "Total products" ? "Products in your catalog" : "Products that may need action"}</small>
          </article>
        ))}
      </section>

      <section className="shadcn-chart-grid">
        <article className="shadcn-card">
          <div className="shadcn-card-heading">
            <div><h2>Stock movement</h2><p>Quantity moved in the last 7 days</p></div>
            <Link to="/inventory">View inventory <i className="bi bi-arrow-up-right" /></Link>
          </div>
          <div className="shadcn-movement-chart shadcn-daily-chart">
            <div className="shadcn-chart-gridlines"><span /><span /><span /><span /></div>
            <div className="shadcn-daily-bars">
              {dailyTrend.map((day) => (
                <div className="shadcn-daily-column" key={day.date} aria-label={`${day.label}: stock in ${day.stockIn}, stock out ${day.stockOut}`}>
                  <div className="shadcn-daily-bar-pair">
                    <i className="shadcn-bar shadcn-bar-in" style={{ height: `${Math.max(day.stockIn ? 3 : 0, (day.stockIn / dailyMax) * 150)}px` }} title={`Stock In: ${number(day.stockIn)}`} />
                    <i className="shadcn-bar shadcn-bar-out" style={{ height: `${Math.max(day.stockOut ? 3 : 0, (day.stockOut / dailyMax) * 150)}px` }} title={`Stock Out: ${number(day.stockOut)}`} />
                  </div>
                  <span>{day.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="shadcn-chart-legend">
            <span><i className="dot-in" /> Stock In</span>
            <span><i className="dot-out" /> Stock Out</span>
            <strong>Net: <em className={net < 0 ? "negative" : ""}>{net > 0 ? "+" : ""}{loading ? "—" : number(net)}</em> units</strong>
          </div>
        </article>

        <article className="shadcn-card">
          <div className="shadcn-card-heading">
            <div><h2>Inventory health</h2><p>Product count by stock status</p></div>
          </div>
          <div className="shadcn-health">
            <div className="shadcn-donut" style={{ background: `conic-gradient(#16a34a 0 ${(inStock / totalHealth) * 100}%, #f59e0b ${(inStock / totalHealth) * 100}% ${((inStock + lowStock) / totalHealth) * 100}%, #ef4444 ${((inStock + lowStock) / totalHealth) * 100}% 100%)` }}>
              <div><strong>{loading ? "—" : number(totalProducts)}</strong><span>products</span></div>
            </div>
            <div className="shadcn-health-list">
              {[["In stock", inStock, "green"], ["Low stock", lowStock, "amber"], ["Out of stock", outOfStock, "red"]].map(([label, value, tone]) => (
                <div key={label}><span><i className={`health-dot health-${tone}`} />{label}</span><strong>{loading ? "—" : number(value)}</strong></div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="shadcn-lower-grid">
        <article className="shadcn-card">
          <div className="shadcn-card-heading">
            <div><h2>Stock by category</h2><p>{number(totalCategoryStock)} units across all categories</p></div>
            <Link to="/categories">Manage categories <i className="bi bi-arrow-up-right" /></Link>
          </div>
          {topCategories.length === 0 ? <div className="shadcn-empty">No category data available.</div> : (
            <div className="shadcn-category-list">
              {topCategories.map((item, index) => {
                const quantity = Number(item.total_stock || 0);
                return (
                  <div className="shadcn-category-row" key={`${item.category_name}-${index}`}>
                    <div className="shadcn-category-label"><strong>{item.category_name}</strong><span>{number(quantity)} units</span></div>
                    <div className="shadcn-progress"><span style={{ width: `${(quantity / maxCategoryStock) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="shadcn-card shadcn-insight-card">
          <div className="shadcn-card-heading"><div><h2>Inventory insight</h2><p>Recommended next step</p></div><i className="bi bi-lightbulb shadcn-insight-icon" /></div>
          <div className={`shadcn-insight ${outOfStock > 0 ? "insight-red" : lowStock > 0 ? "insight-amber" : "insight-green"}`}>
            <strong>{outOfStock > 0 ? "Restock needed" : lowStock > 0 ? "Review low-stock items" : "Inventory looks healthy"}</strong>
            <p>{outOfStock > 0 ? `${number(outOfStock)} product${outOfStock === 1 ? "" : "s"} currently have zero stock.` : lowStock > 0 ? `${number(lowStock)} product${lowStock === 1 ? "" : "s"} are at or below the minimum stock level.` : "No low or out-of-stock products are currently recorded."}</p>
            <Link to="/inventory">Open inventory <i className="bi bi-arrow-right" /></Link>
          </div>
        </article>
      </section>
    </div>
  );
}
