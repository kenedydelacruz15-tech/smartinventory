import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function OwnerDashboard() {
  const [setup, setSetup] = useState(null);
  const [summary, setSummary] = useState(null);

  const [categoryStock, setCategoryStock] = useState([]);
  const [inventoryStatus, setInventoryStatus] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  const [error, setError] = useState("");
  

  

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    await Promise.all([
      loadSetupStatus(),
      loadSummary(),
      loadCharts()
    ]);
  };

  // Load store setup status
  const loadSetupStatus = async () => {
    try {
      const res = await api.get(
        "/api/store/setup-status"
      );

      setSetup(res.data);
    } catch (error) {
      console.error(
        "Could not load setup status:",
        error
      );

      setSetup({
        setup_complete: false
      });
    } finally {
      setLoadingSetup(false);
    }
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
        "Could not load dashboard summary:",
        error
      );

      setError(
        error.response?.data?.error ||
        "Could not load dashboard data."
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  // Load dashboard charts
  const loadCharts = async () => {
    try {
      setLoadingCharts(true);

      const [
        categoryRes,
        statusRes,
        movementRes
      ] = await Promise.all([
        api.get("/api/dashboard/charts/category-stock"),
        api.get("/api/dashboard/charts/inventory-status"),
        api.get("/api/dashboard/charts/stock-movements?days=7")
      ]);

      setCategoryStock(categoryRes.data?.data || []);
      setInventoryStatus(statusRes.data?.data || []);
      setStockMovements(movementRes.data?.data || []);

    } catch (error) {
      console.error(
        "Could not load dashboard charts:",
        error
      );

      console.error(
        error.response?.data?.error ||
        "Could not load dashboard charts."
      );
    } finally {
      setLoadingCharts(false);
    }
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

  // Get movement quantity
  const getMovementQuantity = (type) => {
    const item = stockMovements.find(
      (entry) =>
        entry.movement_type === type
    );

    return Number(
      item?.total_quantity || 0
    );
  };

  return (
    <div>

      {/* HEADER */}

      <div className="page-header">

        <div>

          <h1>
            Owner Dashboard
          </h1>

          <p className="muted">
            Overview of your store's inventory and products.
          </p>

        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh Dashboard"}
        </button>

      </div>


      {/* SETUP STATUS */}

      {!loadingSetup && (

        <div
          className={
            setup?.setup_complete
              ? "success"
              : "alert"
          }
        >

          <strong>

            {setup?.setup_complete
              ? "✓ Store Setup Complete"
              : "Store Setup Incomplete"}

          </strong>

          <p>

            {setup?.setup_complete
              ? "Your store is ready for normal operations."
              : "Complete your store information before starting normal operations."}

          </p>

          {!setup?.setup_complete && (

            <Link to="/settings/store">
              Complete Store Setup
            </Link>

          )}

        </div>

      )}


      {/* DASHBOARD ERROR */}

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


      {/* STAT CARDS */}

      <div className="dashboard-stats">

        <div className="stat-card">

          <span className="stat-label">
            Products
          </span>

          <strong>
            {loadingSummary
              ? "..."
              : summary?.total_products ?? 0}
          </strong>

          <small>
            Products in your store
          </small>

        </div>


        <div className="stat-card">

          <span className="stat-label">
            Inventory
          </span>

          <strong>
            {loadingSummary
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
            {loadingSummary
              ? "..."
              : summary?.inventory?.low_stock ?? 0}
          </strong>

          <small>
            Items requiring attention
          </small>

        </div>

      </div>


      {/* ADDITIONAL STATS */}

      <div className="dashboard-stats">

        <div className="stat-card">

          <span className="stat-label">
            Out of Stock
          </span>

          <strong>
            {loadingSummary
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
            {loadingSummary
              ? "..."
              : summary?.unread_alerts ?? 0}
          </strong>

          <small>
            Store alerts
          </small>

        </div>

      </div>


      {/* INVENTORY ALERTS */}

      <div className="dashboard-section">

        <div className="section-header">

          <div>

            <h2>
              Inventory Alerts
            </h2>

            <p className="muted">
              Items that may require attention.
            </p>

          </div>

        </div>


        <div className="dashboard-grid">

          <div className="module-card">

            <strong>
              Expiring Soon
            </strong>

            <span>
              {loadingSummary
                ? "Loading..."
                : `${summary?.expiration?.expiring_soon ?? 0} product(s) expiring within 7 days`}
            </span>

          </div>


          <div className="module-card">

            <strong>
              Expired
            </strong>

            <span>
              {loadingSummary
                ? "Loading..."
                : `${summary?.expiration?.expired ?? 0} product(s) already expired`}
            </span>

          </div>

        </div>

      </div>

      {/* STOCK BY CATEGORY */}

      <div className="dashboard-section">

        <div className="section-header">

          <div>

            <h2>
              Stock by Category
            </h2>

            <p className="muted">
              Current inventory grouped by category.
            </p>

          </div>

        </div>


        {loadingCharts ? (

          <div className="module-card">
            Loading category data...
          </div>

        ) : categoryStock.length === 0 ? (

          <div className="module-card">
            No category stock data available.
          </div>

        ) : (

          <div className="dashboard-grid">

            {categoryStock.map((item, index) => (

              <div
                className="module-card"
                key={`${item.category_name}-${index}`}
              >

                <strong>
                  {item.category_name}
                </strong>

                <span>
                  {Number(
                    item.total_stock || 0
                  ).toLocaleString()} units
                </span>

              </div>

            ))}

          </div>

        )}

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


      {/* STOCK MOVEMENTS */}

      <div className="dashboard-section">

        <div className="section-header">

          <div>

            <h2>
              Stock Movements
            </h2>

            <p className="muted">
              Stock movement totals during the last 7 days.
            </p>

          </div>

        </div>


        <div className="dashboard-stats">

          <div className="stat-card">

            <span className="stat-label">
              Stock In
            </span>

            <strong>
              {loadingCharts
                ? "..."
                : getMovementQuantity("STOCK_IN")}
            </strong>

            <small>
              Units added
            </small>

          </div>


          <div className="stat-card">

            <span className="stat-label">
              Stock Out
            </span>

            <strong>
              {loadingCharts
                ? "..."
                : getMovementQuantity("STOCK_OUT")}
            </strong>

            <small>
              Units removed
            </small>

          </div>
        </div>

      </div>


      {/* STORE OVERVIEW */}

      <div className="dashboard-section">

        <div className="section-header">

          <div>

            <h2>
              Store Overview
            </h2>

            <p className="muted">
              Manage your daily store operations
              from here.
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
              Check current stock and inventory records.
            </span>
          </Link>


          <Link
            className="module-card"
            to="/products"
          >
            <strong>
              Products
            </strong>

            <span>
              Create, update and manage motorcycle parts.
            </span>
          </Link>


          <Link
            className="module-card"
            to="/categories"
          >
            <strong>
              Categories
            </strong>

            <span>
              Organize products into store categories.
            </span>
          </Link>

        </div>

      </div>


      {/* QUICK ACTIONS */}

      <div className="dashboard-section">

        <div className="section-header">

          <div>

            <h2>
              Quick Actions
            </h2>

            <p className="muted">
              Frequently used store management functions.
            </p>

          </div>

        </div>


        <div className="quick-actions">

          <Link to="/products">
            Add Product
          </Link>

          <Link to="/categories">
            Add Category
          </Link>

          <Link to="/settings/store">
            Store Settings
          </Link>

        </div>

      </div>

    </div>
  );
}