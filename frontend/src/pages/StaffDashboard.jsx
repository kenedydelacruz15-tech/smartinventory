import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function StaffDashboard() {
  const [summary, setSummary] = useState(null);
  const [inventoryStatus, setInventoryStatus] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    await Promise.all([
      loadSummary(),
      loadCharts()
    ]);
  };

  // Load dashboard summary
  const loadSummary = async () => {
    try {
      setError("");

      const res = await api.get(
        "/api/dashboard/summary"
      );

      setSummary(res.data);
    } catch (error) {
      console.error(
        "Could not load staff dashboard:",
        error
      );

      setError(
        error.response?.data?.error ||
        "Could not load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  // Load staff dashboard charts
  const loadCharts = async () => {
    try {
      setLoadingCharts(true);

      const statusRes = await api.get(
        "/api/dashboard/charts/inventory-status"
      );

      setInventoryStatus(
        statusRes.data?.data || []
      );
    } catch (error) {
      console.error(
        "Could not load staff dashboard charts:",
        error
      );

      setChartError(
        error.response?.data?.error ||
        "Could not load dashboard charts."
      );
    } finally {
      setLoadingCharts(false);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return `₱${Number(value || 0).toLocaleString(
      "en-PH",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`;
  };

  // Format chart date
  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric"
    });
  };

  // Get inventory status count
  const getStatusCount = (status) => {
    const item = inventoryStatus.find(
      (entry) =>
        entry.stock_status === status
    );

    return Number(
      item?.product_count || 0
    );
  };

  return (
    <div>

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Staff Dashboard
          </h1>

          <p className="muted">
            Overview of today's store operations.
          </p>

        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Dashboard"}
        </button>
      </div>


      {/* ERROR */}

      {error && (

        <div className="alert">

          <strong>
            Dashboard Error
          </strong>

          <p>
            {error}
          </p>

        </div>

      )}


      {/* MAIN STATS */}

      <div className="dashboard-stats">


        <div className="stat-card">

          <span className="stat-label">
            Inventory
          </span>

          <strong>
            {loading
              ? "..."
              : summary?.total_stock ?? 0}
          </strong>

          <small>
            Total units in stock
          </small>

        </div>


        <div className="stat-card">

          <span className="stat-label">
            Low Stock
          </span>

          <strong>
            {loading
              ? "..."
              : summary?.inventory?.low_stock ?? 0}
          </strong>

          <small>
            Items needing attention
          </small>

        </div>

      </div>


      {/* MORE INVENTORY INFORMATION */}

      <div className="dashboard-stats">

        <div className="stat-card">

          <span className="stat-label">
            Products
          </span>

          <strong>
            {loading
              ? "..."
              : summary?.total_products ?? 0}
          </strong>

          <small>
            Products in store
          </small>

        </div>


        <div className="stat-card">

          <span className="stat-label">
            Out of Stock
          </span>

          <strong>
            {loading
              ? "..."
              : summary?.inventory?.out_of_stock ?? 0}
          </strong>

          <small>
            Products with no stock
          </small>

        </div>


        <div className="stat-card">

          <span className="stat-label">
            Alerts
          </span>

          <strong>
            {loading
              ? "..."
              : summary?.unread_alerts ?? 0}
          </strong>

          <small>
            Store alerts
          </small>

        </div>

      </div>

      {/* INVENTORY STATUS */}

      <div className="dashboard-section">

        <div className="section-header">

          <div>

            <h2>
              Inventory Status
            </h2>

            <p className="muted">
              Current product stock status.
            </p>

          </div>

        </div>


        <div className="dashboard-stats">

          <div className="stat-card">

            <span className="stat-label">
              In Stock
            </span>

            <strong>
              {loadingCharts
                ? "..."
                : getStatusCount("IN_STOCK")}
            </strong>

          </div>


          <div className="stat-card">

            <span className="stat-label">
              Low Stock
            </span>

            <strong>
              {loadingCharts
                ? "..."
                : getStatusCount("LOW_STOCK")}
            </strong>

          </div>


          <div className="stat-card">

            <span className="stat-label">
              Out of Stock
            </span>

            <strong>
              {loadingCharts
                ? "..."
                : getStatusCount("OUT_OF_STOCK")}
            </strong>

          </div>

        </div>

      </div>


      {/* DAILY OPERATIONS */}

      <div className="dashboard-section">

        <div className="section-header">

          <div>

            <h2>
              Daily Operations
            </h2>

            <p className="muted">
              Access the tools needed for daily
              store operations.
            </p>

          </div>

        </div>


        <div className="dashboard-grid">


          <Link
            className="module-card"
            to="/inventory"
          >

            <strong>
              Inventory
            </strong>

            <span>
              View current stock and inventory information.
            </span>

          </Link>

        </div>

      </div>


      {/* STAFF ACCESS */}

      <div className="dashboard-section">

        <div className="info-panel">

          <strong>
            Staff Access
          </strong>

          <p className="muted">
            You can manage daily inventory operations
            and update inventory records. Product, category and
            store settings are managed by the store Owner.
          </p>

        </div>

      </div>

    </div>
  );
}