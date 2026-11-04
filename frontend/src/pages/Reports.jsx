import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const safeCsvValue = (value) => {
  const text = value == null ? "" : String(value);
  const protectedText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
};

const downloadCsv = (filename, headers, rows) => {
  const csv = [headers, ...rows]
    .map((row) => row.map(safeCsvValue).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function Reports() {
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [report, setReport] = useState("inventory");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    setError("");
    const results = await Promise.allSettled([
      api.get("/api/reports/current-inventory"),
      api.get("/api/reports/stock-movements"),
    ]);
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) {
      const requestError = failures[0].reason;
      setError(requestError.response?.data?.error || "Unable to load reports.");
      throw requestError;
    }
    setInventory(Array.isArray(results[0].value.data) ? results[0].value.data : []);
    setMovements(Array.isArray(results[1].value.data) ? results[1].value.data : []);
  };

  useEffect(() => {
    loadReports()
      .catch((requestError) => {
        console.error("Reports page load error:", requestError);
        setError(requestError.response?.data?.error || "Unable to load reports.");
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleInventory = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inventory.filter((item) =>
      !query ||
      [item.product_name, item.category_name, item.product_id]
        .some((value) => String(value ?? "").toLowerCase().includes(query))
    );
  }, [inventory, search]);

  const visibleMovements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return movements.filter((item) =>
      !query ||
      [item.product_name, item.movement_type, item.reference_id]
        .some((value) => String(value ?? "").toLowerCase().includes(query))
    );
  }, [movements, search]);

  const exportReport = () => {
    if (report === "inventory") {
      downloadCsv(
        "smartinventory-current-inventory.csv",
        ["Product ID", "Product", "Category", "Unit price", "Stock quantity", "Total value"],
        visibleInventory.map((item) => [
          item.product_id,
          item.product_name,
          item.category_name,
          item.price,
          item.stock_quantity,
          item.total_value,
        ])
      );
      return;
    }
    downloadCsv(
      "smartinventory-stock-movements.csv",
      ["Movement ID", "Product ID", "Product", "Movement type", "Quantity", "Reference ID", "Date"],
      visibleMovements.map((item) => [
        item.movement_id,
        item.product_id,
        item.product_name,
        item.movement_type,
        item.quantity,
        item.reference_id,
        item.movement_date,
      ])
    );
  };

  const currency = (value) =>
    `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="page reports-page">
      <header className="page-header reports-page-header">
        <div>
          <h1>Reports</h1>
          <p>Review and export inventory valuation and stock movement history.</p>
        </div>
        <div className="action-buttons">
          <button type="button" className="secondary" onClick={() => loadReports().catch((requestError) => setError(requestError.response?.data?.error || "Unable to refresh reports."))}>
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
          <button type="button" className="primary" onClick={exportReport} disabled={loading}>
            <i className="bi bi-download" /> Export CSV
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="report-toolbar">
        <div className="report-tabs" role="tablist" aria-label="Report type">
          <button type="button" role="tab" aria-selected={report === "inventory"} className={`filter-btn ${report === "inventory" ? "active" : ""}`} onClick={() => { setReport("inventory"); setSearch(""); }}>Current inventory</button>
          <button type="button" role="tab" aria-selected={report === "movements"} className={`filter-btn ${report === "movements" ? "active" : ""}`} onClick={() => { setReport("movements"); setSearch(""); }}>Stock movements</button>
        </div>
        <input
          className="report-search"
          type="search"
          placeholder={report === "inventory" ? "Search product or category..." : "Search product, type, or reference..."}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search report rows"
        />
      </div>

      <section className="products-card">
        <div className="table-header">
          <div>
            <h2>{report === "inventory" ? "Current inventory valuation" : "Stock movement history"}</h2>
            <span>{report === "inventory" ? `${visibleInventory.length} products` : `${visibleMovements.length} movements`} · CSV export includes the current search results</span>
          </div>
        </div>
        {loading ? <div className="loading-message">Loading report...</div> : report === "inventory" ? (
          <div className="table-container report-table-container">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Category</th><th>Unit price</th><th>Stock</th><th>Total value</th></tr></thead>
              <tbody>
                {visibleInventory.length === 0 ? (
                  <tr><td className="empty-state" colSpan="5"><h3>No inventory records</h3><p>No records match your search, or inventory data is not available.</p></td></tr>
                ) : visibleInventory.map((item) => (
                  <tr key={item.product_id}>
                    <td><strong>{item.product_name}</strong><small className="report-subtext">ID: {item.product_id}</small></td>
                    <td>{item.category_name || "—"}</td>
                    <td>{currency(item.price)}</td>
                    <td>{Number(item.stock_quantity || 0).toLocaleString()}</td>
                    <td><strong>{currency(item.total_value)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container report-table-container">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Product</th><th>Movement</th><th>Quantity</th><th>Reference</th><th>Movement ID</th></tr></thead>
              <tbody>
                {visibleMovements.length === 0 ? (
                  <tr><td className="empty-state" colSpan="6"><h3>No stock movements</h3><p>No records match your search, or no stock movements have been recorded.</p></td></tr>
                ) : visibleMovements.map((item) => (
                  <tr key={item.movement_id}>
                    <td>{item.movement_date ? new Date(item.movement_date).toLocaleString() : "—"}</td>
                    <td><strong>{item.product_name}</strong><small className="report-subtext">ID: {item.product_id}</small></td>
                    <td><span className={`status-badge ${item.movement_type === "STOCK_IN" ? "success" : "warning"}`}>{item.movement_type}</span></td>
                    <td>{Number(item.quantity || 0).toLocaleString()}</td>
                    <td>{item.reference_id ?? "—"}</td>
                    <td>#{item.movement_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
