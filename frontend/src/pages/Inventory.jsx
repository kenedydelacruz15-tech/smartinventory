import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../services/api";

const STOCK_IN_REASONS = [
  { value: "SUPPLIER", label: "Supplier restock / purchase" },
  { value: "CUSTOMER_RETURN", label: "Customer return (sellable)" },
  { value: "TRANSFER", label: "Transfer from another branch" },
  { value: "ADJUSTMENT", label: "Physical count correction" },
  { value: "OTHER", label: "Other" },
];

const STOCK_OUT_REASONS = [
  { value: "SALE", label: "Sold to customer" },
  { value: "DAMAGED", label: "Damaged / defective" },
  { value: "RETURN_TO_SUPPLIER", label: "Returned to supplier" },
  { value: "TRANSFER", label: "Transfer to another branch" },
  { value: "LOST", label: "Lost / missing" },
  { value: "ADJUSTMENT", label: "Physical count correction" },
  { value: "OTHER", label: "Other" },
];

const formatMovementReason = (reason) =>
  reason
    ? reason
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Unspecified";


const DATE_FILTERS = [
  { value: "recent", label: "Recently Added" },
  { value: "today", label: "Added Today" },
  { value: "week", label: "Added This Week" },
  { value: "month", label: "Added This Month" },
  { value: "oldest", label: "Oldest Products" },
];

const MOVEMENT_FILTERS = [
  { value: "recent_in", label: "Recently Stocked In" },
  { value: "recent_out", label: "Recently Stocked Out" },
  { value: "in_today", label: "Stock In Today" },
  { value: "out_today", label: "Stock Out Today" },
  { value: "in_week", label: "Stock In This Week" },
  { value: "out_week", label: "Stock Out This Week" },
  { value: "recent_adjusted", label: "Recently Adjusted Stock" },
];

const PAGE_SIZES = [10, 25, 50, 100];

// Every category gets its own stable colour, so new categories are coloured
// automatically (same name = same colour, no setup needed).
const categoryBadgeStyle = (name = "") => {
  let hash = 0;
  for (const ch of String(name).trim().toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  const hue = hash % 360;
  return {
    background: `hsl(${hue} 85% 92%)`,
    color: `hsl(${hue} 65% 26%)`,
    border: `1px solid hsl(${hue} 70% 82%)`,
  };
};

// The API sends "YYYY-MM-DD HH:MM:SS" (server local time).
const parseDbDate = (value) => {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  const date = parseDbDate(value);
  return date
    ? date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
    : "—";
};

const formatPeso = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;


function ProductThumbnail({ item }) {
  const imagePath =
    item.product_image_url ||
    item.image_url ||
    item.product_image ||
    item.image ||
    item.photo_url ||
    item.image_path;

  const imageUrl = imagePath
    ? imagePath.startsWith("http://") ||
      imagePath.startsWith("https://")
      ? imagePath
      : `${api.defaults.baseURL.replace(/\/$/, "")}${
          imagePath.startsWith("/") ? "" : "/"
        }${imagePath}`
    : "";

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <div
      className="inventory-product-thumbnail"
      style={{
        width: "55px",
        height: "55px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: "8px",
        background: "#f5f5f5",
      }}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={item.product_name || "Product"}
          onError={() => setImageFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      ) : (
        <i
          className="bi bi-image"
          style={{ fontSize: "22px", color: "#999" }}
        />
      )}
    </div>
  );
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("all");

  // Search + filters + list controls
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [movementFilter, setMovementFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [viewMode, setViewMode] = useState("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewItem, setViewItem] = useState(null);
  const [rowMenu, setRowMenu] = useState(null);

  // Stock movement modal
  const [movementItem, setMovementItem] = useState(null);
  const [movementType, setMovementType] = useState("");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementSupplierId, setMovementSupplierId] = useState("");
  const [movementReference, setMovementReference] = useState("");
  const [movementRemarks, setMovementRemarks] = useState("");
  const qrScannerRef = useRef(null);
  const qrScannerOpenRef = useRef(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrScannerError, setQrScannerError] = useState("");
  const [qrMovementType, setQrMovementType] = useState("STOCK_IN");

  // Adjust stock modal
  const [editItem, setEditItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");

  // Load inventory
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError("");

      const params = { status: "all" };
      const res = await api.get("/api/inventory/", { params });

      setItems(res.data || []);
    } catch (err) {
      console.error("Inventory load error:", err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load inventory."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await api.get("/api/suppliers/");
      setSuppliers(Array.isArray(res.data?.suppliers) ? res.data.suppliers : []);
    } catch (err) {
      console.error("Supplier list error:", err);
    }
  };

  useEffect(() => {
    loadInventory();
    loadCategories();
    loadSuppliers();
  }, []);

  useEffect(() => () => {
    const scanner = qrScannerRef.current;
    if (scanner) {
      scanner.stop()
        .catch((err) => console.warn("Inventory QR scanner stopped during cleanup:", err))
        .finally(() => scanner.clear().catch((err) => console.warn("Inventory QR scanner cleanup failed:", err)));
    }
  }, []);

  // Load active categories for the inventory category browser.
  const loadCategories = async () => {
    try {
      const res = await api.get("/api/categories/", {
        params: { status: "active" },
      });
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // If the category endpoint is unavailable, categories are derived
      // from the inventory records below as a fallback.
      console.error("Category load error:", err);
    }
  };

  const categoryOptions = (() => {
    const activeCategories = categories
      .filter((category) => Number(category.is_active) === 1 || category.is_active === true)
      .map((category) => category.category_name)
      .filter(Boolean);

    const inventoryCategories = items
      .map((item) => item.category_name)
      .filter(Boolean);

    return [...new Set([...activeCategories, ...inventoryCategories])]
      .sort((a, b) => a.localeCompare(b));
  })();

  const isActiveItem = (item) =>
    (item.is_active === true || Number(item.is_active) === 1) &&
    (item.product_is_active === undefined || Number(item.product_is_active) === 1);

  const statusItems = items.filter((item) => {
    if (statusFilter === "active") return isActiveItem(item);
    if (statusFilter === "inactive") return !isActiveItem(item);
    return true;
  });

  const activeCount = items.filter(isActiveItem).length;
  const inactiveCount = items.length - activeCount;

  const brandOptions = [...new Set(items.map((item) => item.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  const filteredItems = (() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7)); // Monday
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const query = search.trim().toLowerCase();
    const toNum = (value) => (value === "" ? null : Number(value));
    const minP = toNum(minPrice);
    const maxP = toNum(maxPrice);
    const minS = toNum(minStock);
    const maxS = toNum(maxStock);
    const since = (date, from) => Boolean(date && date >= from);

    const list = statusItems.filter((item) => {
      if (
        selectedCategory !== "ALL" &&
        (item.category_name || "Uncategorized").toLowerCase() !== selectedCategory.toLowerCase()
      ) return false;

      if (
        query &&
        ![item.product_name, item.sku, item.part_number, item.barcode, item.brand, item.category_name]
          .some((value) => String(value || "").toLowerCase().includes(query))
      ) return false;

      if (brandFilter && item.brand !== brandFilter) return false;
      if (
        supplierFilter &&
        !String(item.supplier_ids || "").split(",").includes(String(supplierFilter))
      ) return false;

      const price = Number(item.selling_price || 0);
      const stock = Number(item.stock_quantity || 0);
      if (minP !== null && price < minP) return false;
      if (maxP !== null && price > maxP) return false;
      if (minS !== null && stock < minS) return false;
      if (maxS !== null && stock > maxS) return false;

      const created = parseDbDate(item.product_created_at);
      if (dateFilter === "today" && !since(created, todayStart)) return false;
      if (dateFilter === "week" && !since(created, weekStart)) return false;
      if (dateFilter === "month" && !since(created, monthStart)) return false;

      const lastIn = parseDbDate(item.last_stock_in_at);
      const lastOut = parseDbDate(item.last_stock_out_at);
      const lastAdj = parseDbDate(item.last_adjusted_at);
      if (movementFilter === "recent_in" && !lastIn) return false;
      if (movementFilter === "recent_out" && !lastOut) return false;
      if (movementFilter === "recent_adjusted" && !lastAdj) return false;
      if (movementFilter === "in_today" && !since(lastIn, todayStart)) return false;
      if (movementFilter === "out_today" && !since(lastOut, todayStart)) return false;
      if (movementFilter === "in_week" && !since(lastIn, weekStart)) return false;
      if (movementFilter === "out_week" && !since(lastOut, weekStart)) return false;
      return true;
    });

    const time = (value) => parseDbDate(value)?.getTime() || 0;
    const dir = sortDir === "asc" ? 1 : -1;
    let compare;
    if (movementFilter === "recent_out" || movementFilter === "out_today" || movementFilter === "out_week") {
      compare = (a, b) => time(b.last_stock_out_at) - time(a.last_stock_out_at);
    } else if (movementFilter === "recent_adjusted") {
      compare = (a, b) => time(b.last_adjusted_at) - time(a.last_adjusted_at);
    } else if (movementFilter) {
      compare = (a, b) => time(b.last_stock_in_at) - time(a.last_stock_in_at);
    } else if (dateFilter === "oldest") {
      compare = (a, b) => time(a.product_created_at) - time(b.product_created_at);
    } else if (dateFilter) {
      compare = (a, b) => time(b.product_created_at) - time(a.product_created_at);
    } else if (sortBy === "price") {
      compare = (a, b) => (Number(a.selling_price) - Number(b.selling_price)) * dir;
    } else if (sortBy === "stock") {
      compare = (a, b) => (Number(a.stock_quantity) - Number(b.stock_quantity)) * dir;
    } else {
      compare = (a, b) => String(a.product_name || "").localeCompare(String(b.product_name || "")) * dir;
    }
    return [...list].sort(compare);
  })();

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedItems = filteredItems.slice(pageStart, pageStart + pageSize);
  const pageNumbers = (() => {
    const first = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const last = Math.min(totalPages, first + 4);
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  })();

  const activeFilterCount = [
    dateFilter, movementFilter, brandFilter, supplierFilter,
    minPrice, maxPrice, minStock, maxStock,
  ].filter((value) => value !== "").length;

  const clearFilters = () => {
    setDateFilter("");
    setMovementFilter("");
    setBrandFilter("");
    setSupplierFilter("");
    setMinPrice("");
    setMaxPrice("");
    setMinStock("");
    setMaxStock("");
  };

  const sortLabel = (field) => {
    const asc = sortDir === "asc";
    if (field === "price") return asc ? "Price (low–high)" : "Price (high–low)";
    if (field === "stock") return asc ? "Stock (low–high)" : "Stock (high–low)";
    return asc ? "Name (A–Z)" : "Name (Z–A)";
  };

  // Back to page 1 whenever the result set changes.
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory, statusFilter, dateFilter, movementFilter, brandFilter,
      supplierFilter, minPrice, maxPrice, minStock, maxStock, sortBy, sortDir, pageSize]);

  // Close the "..." row menu on outside click, scroll or resize.
  useEffect(() => {
    if (!rowMenu) return undefined;
    const close = () => setRowMenu(null);
    document.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [rowMenu]);

  const openRowMenu = (event, item) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom + 200 > window.innerHeight;
    const right = window.innerWidth - rect.right;
    setRowMenu((current) =>
      current?.item.inventory_id === item.inventory_id
        ? null
        : { item, right, ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) }
    );
  };

  const isRowActive = (item) => item.is_active === true || Number(item.is_active) === 1;

  const renderStatus = (item) => {
    if (!isRowActive(item)) return <span className="status-badge">Inactive</span>;
    if (Number(item.stock_quantity) <= 0) return <span className="status-badge danger">Out of Stock</span>;
    if (Number(item.stock_quantity) <= Number(item.reorder_level || 0)) return <span className="status-badge warning">Low Stock</span>;
    return <span className="status-badge success">In Stock</span>;
  };

  const renderRowActions = (item) => (
    <div className="inv-row-actions">
      <button type="button" className="inv-btn" onClick={() => setViewItem(item)}>
        <i className="bi bi-eye" /> View
      </button>
      <button type="button" className="inv-btn" disabled={!isRowActive(item)} onClick={() => openEdit(item)}>
        <i className="bi bi-pencil-square" /> Edit
      </button>
      <button type="button" className="inv-btn inv-more" aria-label="More actions" onClick={(event) => openRowMenu(event, item)}>
        <i className="bi bi-three-dots" />
      </button>
    </div>
  );

  const renderCategoryBadge = (item) => (
    <span className="inv-cat" style={categoryBadgeStyle(item.category_name)}>
      {item.category_name || "Uncategorized"}
    </span>
  );

  // Open Stock In / Stock Out modal
  const openMovement = (item, type) => {
    console.log("BUTTON CLICKED:", type, item);

    setMovementItem(item);
    setMovementType(type);
    setMovementQuantity("");
    setMovementReason("");
    setMovementSupplierId("");
    setMovementReference("");
    setMovementRemarks("");
  };

  // Close movement modal
  const closeMovement = () => {
    setMovementItem(null);
    setMovementType("");
    setMovementQuantity("");
    setMovementReason("");
    setMovementSupplierId("");
    setMovementReference("");
    setMovementRemarks("");
  };

  const stopQrScanner = async () => {
    qrScannerOpenRef.current = false;
    const scanner = qrScannerRef.current;
    qrScannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
      } catch (err) {
        console.error("Could not stop inventory QR scanner:", err);
      }
      try {
        await scanner.clear();
      } catch (err) {
        console.error("Could not clear inventory QR scanner:", err);
      }
    }
    setQrScannerOpen(false);
  };

  const startQrScanner = (type) => {
    setQrMovementType(type);
    setQrScannerError("");
    qrScannerOpenRef.current = true;
    setQrScannerOpen(true);
    window.setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("inventory-qr-reader");
        qrScannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          async (decodedText) => { 
            const value = decodedText.trim();

            const productId = value.match(
              /^SMARTINVENTORY:PRODUCT:(\d+)$/i
            )?.[1];

            const barcode = productId ? null : value;

            // First search currently loaded inventory
            let item = items.find((entry) =>
              productId
                ? Number(entry.product_id) === Number(productId)
                : String(entry.barcode || "").trim() === barcode
            );

            // If not loaded, search local MySQL inventory
            if (!item) {
              try {
                const res = await api.get("/api/inventory/", {
                  params: {
                    status: "all",
                    ...(barcode ? { search: barcode } : {})
                  }
                });

                const records = Array.isArray(res.data) ? res.data : [];

                item = records.find((entry) =>
                  productId
                    ? Number(entry.product_id) === Number(productId)
                    : String(entry.barcode || "").trim() === barcode
                );
              } catch (err) {
                console.error("Local inventory search failed:", err);
              }
            }

            if (!item) {
              setQrScannerError(
                "Product not found in your local inventory."
              );
              return;
            }

            await stopQrScanner();
            if (type === "SEARCH") setViewItem(item);
            else openMovement(item, type);
          },
          () => {}
        );
        if (!qrScannerOpenRef.current) {
          await scanner.stop();
          await scanner.clear();
          if (qrScannerRef.current === scanner) qrScannerRef.current = null;
        }
      } catch (err) {
        console.error("Inventory QR scanner error:", err);
        setQrScannerError("Could not start the camera. Allow camera access and try again.");
      }
    }, 0);
  };

  // Submit Stock In / Stock Out
  const submitMovement = async () => {
    if (!movementItem) return;

    const quantity = Number(movementQuantity);

    if (!quantity || quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (!movementReason) {
      alert(`Please select a reason for ${movementType === "STOCK_IN" ? "Stock In" : "Stock Out"}.`);
      return;
    }

    if (movementType === "STOCK_IN" && movementReason === "SUPPLIER" && !movementSupplierId) {
      alert("Select the supplier for this stock-in, or choose another stock-in reason.");
      return;
    }

    try {
      setLoading(true);

      const endpoint =
        movementType === "STOCK_IN"
          ? `/api/inventory/${movementItem.inventory_id}/stock-in`
          : `/api/inventory/${movementItem.inventory_id}/stock-out`;

      const payload = {
        quantity,
        reference_type: movementReason,
        supplier_id: movementSupplierId ? Number(movementSupplierId) : null,
        reference_number: movementReference,
        remarks: movementRemarks,
      };

      await api.post(endpoint, payload);

      alert(
        movementType === "STOCK_IN"
          ? `Stock in recorded: ${formatMovementReason(movementReason)}.`
          : `Stock out recorded: ${formatMovementReason(movementReason)}.`
      );

      closeMovement();
      await loadInventory();
    } catch (err) {
      console.error("Stock movement error:", err);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Stock movement failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // Open Adjust Stock modal
  const openEdit = (item) => {
    setEditItem(item);
    setEditQuantity(item.stock_quantity);
  };

  // Close Adjust Stock modal
  const closeEdit = () => {
    setEditItem(null);
    setEditQuantity("");
  };

  // Adjust stock
  const submitEdit = async () => {
    if (!editItem) return;

    const quantity = Number(editQuantity);

    if (Number.isNaN(quantity) || quantity < 0) {
      alert("Please enter a valid stock quantity.");
      return;
    }

    try {
      setLoading(true);

      await api.put(`/api/inventory/${editItem.inventory_id}`, {
        stock_quantity: quantity,
      });

      alert("Stock adjusted successfully.");

      closeEdit();
      await loadInventory();
    } catch (err) {
      console.error("Stock adjustment error:", err);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Stock adjustment failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // Deactivate inventory
  const deactivateItem = async (item) => {
    if (Number(item.stock_quantity) !== 0) {
      alert("You can only deactivate an item when its stock is 0.");
      return;
    }

    const confirmed = window.confirm(
      `Deactivate "${item.product_name}"?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await api.put(
        `/api/inventory/${item.inventory_id}/deactivate`
      );

      alert("Inventory item deactivated.");

      await loadInventory();
    } catch (err) {
      console.error("Deactivate error:", err);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to deactivate item."
      );
    } finally {
      setLoading(false);
    }
  };

  const permanentlyDeleteItem = async (item) => {
    if (isActiveItem(item)) { alert("Deactivate this inventory item before permanently deleting it."); return; }
    if (Number(item.stock_quantity || 0) > 0) { alert("Stock must be zero before permanently deleting an inventory record."); return; }
    if (!window.confirm(`Permanently delete the inventory record for "${item.product_name}"? The product will move to Products Trash and disappear from the active Products list. This cannot be undone.`)) return;
    try { await api.delete(`/api/inventory/${item.inventory_id}/permanent`); alert("Inventory record deleted. Product moved to Products Trash."); await loadInventory(); }
    catch (err) { alert(err.response?.data?.error || "Could not permanently delete inventory record."); }
  };

  // Restore inventory
  const restoreItem = async (item) => {
    const confirmed = window.confirm(
      `Restore "${item.product_name}"?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await api.put(
        `/api/inventory/${item.inventory_id}/restore`
      );

      alert("Inventory item restored.");

      await loadInventory();
    } catch (err) {
      console.error("Restore error:", err);

      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to restore item."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container inventory-page">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>Manage stock levels and inventory movements.</p>
        </div>
        <div className="inventory-quick-actions">
          <button type="button" className="inv-qr inv-qr-search" onClick={() => startQrScanner("SEARCH")}>
            <i className="bi bi-qr-code-scan" /> QR Search
          </button>
          <button type="button" className="inv-qr inv-qr-in" onClick={() => startQrScanner("STOCK_IN")}>
            <i className="bi bi-qr-code-scan" /> QR Stock In
          </button>
          <button type="button" className="inv-qr inv-qr-out" onClick={() => startQrScanner("STOCK_OUT")}>
            <i className="bi bi-qr-code-scan" /> QR Stock Out
          </button>
        </div>
      </div>

      {/* Inventory overview */}
      <div className="inventory-summary-grid">
        <div className="inventory-summary-card blue">
          <div className="inventory-summary-icon"><i className="bi bi-box-seam" /></div>
          <div><span>Total Items</span><strong>{items.length}</strong><small>Inventory records</small></div>
        </div>
        <div className="inventory-summary-card green">
          <div className="inventory-summary-icon"><i className="bi bi-check-circle" /></div>
          <div><span>In Stock</span><strong>{items.filter((x) => Number(x.stock_quantity) > Number(x.reorder_level || 0)).length}</strong><small>Healthy stock level</small></div>
        </div>
        <div className="inventory-summary-card amber">
          <div className="inventory-summary-icon"><i className="bi bi-exclamation-triangle" /></div>
          <div><span>Needs Attention</span><strong>{items.filter((x) => Number(x.stock_quantity) > 0 && Number(x.stock_quantity) <= Number(x.reorder_level || 0)).length}</strong><small>At or below minimum stock level</small></div>
        </div>
        <div className="inventory-summary-card red">
          <div className="inventory-summary-icon"><i className="bi bi-x-circle" /></div>
          <div><span>Out of Stock</span><strong>{items.filter((x) => Number(x.stock_quantity) === 0).length}</strong><small>Requires replenishment</small></div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading-message">Loading...</div>}

      {/* Toolbar: category, search, filters, status, view */}
      <div className="inv-card inv-toolbar-card">
        <div className="inv-toolbar">
          <label className="inv-select">
            <i className="bi bi-grid" />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} aria-label="Filter by category">
              <option value="ALL">All Categories</option>
              {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>

          <div className="inv-search">
            <i className="bi bi-search" />
            <input
              type="text"
              placeholder="Search product, SKU, brand, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="inv-search-clear" aria-label="Clear search" onClick={() => setSearch("")}>
                <i className="bi bi-x-lg" />
              </button>
            )}
          </div>

          <button type="button" className={`inv-btn inv-filter-toggle${showFilters ? " is-open" : ""}`} aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
            <i className="bi bi-sliders" /> Filters
            {activeFilterCount > 0 && <span className="inv-count-dot">{activeFilterCount}</span>}
          </button>

          <div className="inv-pills" role="group" aria-label="Filter inventory by status">
            {[
              { value: "all", label: "All", count: items.length },
              { value: "active", label: "Active", count: activeCount },
              { value: "inactive", label: "Inactive", count: inactiveCount },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`inv-pill${statusFilter === option.value ? " active" : ""}`}
                aria-pressed={statusFilter === option.value}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>

          <div className="inv-view-toggle" role="group" aria-label="Switch view">
            <button type="button" className={viewMode === "list" ? "active" : ""} aria-label="List view" onClick={() => setViewMode("list")}>
              <i className="bi bi-list-ul" />
            </button>
            <button type="button" className={viewMode === "grid" ? "active" : ""} aria-label="Grid view" onClick={() => setViewMode("grid")}>
              <i className="bi bi-grid-3x3-gap" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="inv-filter-panel">
            <div className="inv-filter-grid">
              <div className="inv-filter-group">
                <h4>Product date</h4>
                <div className="inv-chips">
                  {DATE_FILTERS.map((option) => (
                    <button key={option.value} type="button" className={`inv-chip${dateFilter === option.value ? " active" : ""}`}
                      onClick={() => setDateFilter(dateFilter === option.value ? "" : option.value)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="inv-filter-group">
                <h4>Stock movement</h4>
                <div className="inv-chips">
                  {MOVEMENT_FILTERS.map((option) => (
                    <button key={option.value} type="button" className={`inv-chip${movementFilter === option.value ? " active" : ""}`}
                      onClick={() => setMovementFilter(movementFilter === option.value ? "" : option.value)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="inv-filter-group">
                <h4>Other filters</h4>
                <div className="inv-field-row">
                  <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} aria-label="Brand">
                    <option value="">All brands</option>
                    {brandOptions.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                  </select>
                  <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} aria-label="Supplier">
                    <option value="">All suppliers</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.supplier_name}</option>
                    ))}
                  </select>
                </div>
                <div className="inv-field-row">
                  <input type="number" min="0" placeholder="Min price (₱)" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                  <input type="number" min="0" placeholder="Max price (₱)" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </div>
                <div className="inv-field-row">
                  <input type="number" min="0" placeholder="Min stock" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
                  <input type="number" min="0" placeholder="Max stock" value={maxStock} onChange={(e) => setMaxStock(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="inv-filter-actions">
              <button type="button" className="inv-btn" onClick={clearFilters} disabled={activeFilterCount === 0}>
                <i className="bi bi-x-circle" /> Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product list */}
      <div className="inv-card">
        <div className="inv-list-head">
          <h2><i className="bi bi-box-seam" /> Products ({filteredItems.length})</h2>
          <div className="inv-sort">
            <span>Sort by:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort by">
              <option value="name">{sortLabel("name")}</option>
              <option value="price">{sortLabel("price")}</option>
              <option value="stock">{sortLabel("stock")}</option>
            </select>
            <button type="button" className="inv-icon-btn" aria-label="Toggle sort direction" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
              <i className={`bi bi-arrow-${sortDir === "asc" ? "up" : "down"}`} />
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="inv-empty">
            {items.length === 0 ? "No inventory found." : "No products match your search or filters."}
          </div>
        ) : viewMode === "list" ? (
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={item.inventory_id}>
                    <td>
                      <div className="inv-product">
                        <ProductThumbnail item={item} />
                        <div>
                          <strong>{item.product_name || "Unnamed product"}</strong>
                          <span>{item.brand || item.category_name || "Motorcycle part"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{item.brand || "—"}</td>
                    <td>{renderCategoryBadge(item)}</td>
                    <td className="inv-strong">{formatPeso(item.selling_price)}</td>
                    <td className="inv-strong">{item.stock_quantity ?? 0}</td>
                    <td>{renderStatus(item)}</td>
                    <td>{renderRowActions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="inv-grid">
            {pagedItems.map((item) => (
              <div key={item.inventory_id} className="inv-grid-card">
                <div className="inv-grid-top">
                  <ProductThumbnail item={item} />
                  {renderStatus(item)}
                </div>
                <strong>{item.product_name || "Unnamed product"}</strong>
                <span className="inv-sub">{item.brand || "—"}</span>
                {renderCategoryBadge(item)}
                <div className="inv-grid-meta">
                  <b>{formatPeso(item.selling_price)}</b>
                  <span>Stock: {item.stock_quantity ?? 0}</span>
                </div>
                {renderRowActions(item)}
              </div>
            ))}
          </div>
        )}

        <div className="inv-footer">
          <span>
            {filteredItems.length
              ? `Showing ${pageStart + 1}–${Math.min(pageStart + pageSize, filteredItems.length)} of ${filteredItems.length} products`
              : "Showing 0 products"}
          </span>
          <div className="inv-pager">
            <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              <i className="bi bi-arrow-left" />
            </button>
            {pageNumbers.map((number) => (
              <button key={number} type="button" className={number === currentPage ? "active" : ""} onClick={() => setPage(number)}>
                {number}
              </button>
            ))}
            <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
              <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
        <div className="inv-footer inv-footer-sub">
          <label className="inv-per-page">
            Show
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            per page
          </label>
        </div>
      </div>

      {/* "..." row menu */}
      {rowMenu && (
        <div
          className="inv-row-menu"
          style={{ top: rowMenu.top, bottom: rowMenu.bottom, right: rowMenu.right }}
          onClick={(event) => event.stopPropagation()}
        >
          {isRowActive(rowMenu.item) ? (
            <>
              <button type="button" onClick={() => { const it = rowMenu.item; setRowMenu(null); openMovement(it, "STOCK_IN"); }}>
                <i className="bi bi-box-arrow-in-down" /> Stock In
              </button>
              <button type="button" onClick={() => { const it = rowMenu.item; setRowMenu(null); openMovement(it, "STOCK_OUT"); }}>
                <i className="bi bi-box-arrow-up" /> Stock Out
              </button>
              <button type="button" className="danger" onClick={() => { const it = rowMenu.item; setRowMenu(null); deactivateItem(it); }}>
                <i className="bi bi-slash-circle" /> Deactivate
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { const it = rowMenu.item; setRowMenu(null); restoreItem(it); }}>
                <i className="bi bi-arrow-counterclockwise" /> Restore
              </button>
              <button type="button" className="danger" onClick={() => { const it = rowMenu.item; setRowMenu(null); permanentlyDeleteItem(it); }}>
                <i className="bi bi-trash" /> Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* ============================= */}
      {/* STOCK IN / STOCK OUT MODAL */}
      {/* ============================= */}

      {movementItem && (
        <div
          className="inventory-modal-overlay"
          onClick={closeMovement}
        >
          <div
            className="inventory-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              {movementType === "STOCK_IN"
                ? "Stock In"
                : "Stock Out"}
            </h2>

            <div className="modal-product">
              <strong>
                {movementItem.product_name}
              </strong>

              <span>
                Current Stock:{" "}
                {movementItem.stock_quantity}
              </span>
            </div>

            <p className="modal-help">
              {movementType === "STOCK_IN"
                ? "Choose where the incoming items came from. Each entry is saved to stock-in records and movement history."
                : "Choose where the outgoing items went. Sales and damaged/defective items will be separately identifiable in movement history."}
            </p>

            <label>
              Quantity
            </label>

            <input
              type="number"
              min="1"
              placeholder="Enter quantity"
              value={movementQuantity}
              onChange={(e) =>
                setMovementQuantity(e.target.value)
              }
              autoFocus
            />

            <label>Reason / destination</label>
            <select
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
            >
              <option value="">Select reason</option>
              {(movementType === "STOCK_IN" ? STOCK_IN_REASONS : STOCK_OUT_REASONS).map((reason) => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>

            {movementType === "STOCK_IN" && movementReason === "SUPPLIER" && (
              <>
                <label>Supplier</label>
                <select
                  value={movementSupplierId}
                  onChange={(e) => setMovementSupplierId(e.target.value)}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="modal-help">No suppliers found. Add a supplier first or choose another stock-in reason.</p>
                )}
              </>
            )}

            <label>
              {movementType === "STOCK_IN" ? "Delivery / return reference (optional)" : "Receipt / transfer reference (optional)"}
            </label>
            <input
              type="text"
              placeholder={movementType === "STOCK_OUT" && movementReason === "SALE" ? "e.g. sales receipt or invoice number" : "e.g. receipt, return, or transfer number"}
              value={movementReference}
              onChange={(e) => setMovementReference(e.target.value)}
            />

            <label>
              Notes
            </label>

            <textarea
              placeholder="Optional details about this stock movement..."
              value={movementRemarks}
              onChange={(e) =>
                setMovementRemarks(e.target.value)
              }
            />

            <div className="modal-actions">
              <button
                type="button"
                onClick={closeMovement}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  movementType === "STOCK_IN"
                    ? "btn-success"
                    : "btn-warning"
                }
                onClick={submitMovement}
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================= */}
      {/* ADJUST STOCK MODAL */}
      {/* ============================= */}

      {editItem && (
        <div
          className="inventory-modal-overlay"
          onClick={closeEdit}
        >
          <div
            className="inventory-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              Adjust Stock
            </h2>

            <div className="inventory-modal-product">
              <strong>
                {editItem.product_name}
              </strong>

              <span>
                Current Stock:{" "}
                {editItem.stock_quantity}
              </span>
            </div>

            <p className="modal-help">
              Use Adjust only when the actual physical
              stock does not match the system stock.
            </p>

            <label>
              New Stock Quantity
            </label>

            <input
              type="number"
              min="0"
              value={editQuantity}
              onChange={(e) =>
                setEditQuantity(e.target.value)
              }
              autoFocus
            />

            <div className="modal-actions">
              <button
                type="button"
                onClick={closeEdit}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={submitEdit}
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : "Save Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="inventory-modal-overlay" onClick={() => setViewItem(null)}>
          <div className="inventory-modal inv-view-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className="inv-product">
                <ProductThumbnail item={viewItem} />
                <div>
                  <h2>{viewItem.product_name}</h2>
                  <span className="inv-sub">{viewItem.brand || "—"}</span>
                </div>
              </div>
              <button type="button" className="secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
            <dl className="inv-detail-grid">
              <div><dt>SKU</dt><dd>{viewItem.sku || "—"}</dd></div>
              <div><dt>Part number</dt><dd>{viewItem.part_number || "—"}</dd></div>
              <div><dt>Barcode</dt><dd>{viewItem.barcode || "—"}</dd></div>
              <div><dt>Category</dt><dd>{renderCategoryBadge(viewItem)}</dd></div>
              <div><dt>Price</dt><dd>{formatPeso(viewItem.selling_price)}</dd></div>
              <div><dt>Status</dt><dd>{renderStatus(viewItem)}</dd></div>
              <div><dt>Stock</dt><dd>{viewItem.stock_quantity ?? 0}</dd></div>
              <div><dt>Minimum stock</dt><dd>{viewItem.reorder_level ?? 0}</dd></div>
              <div><dt>Added on</dt><dd>{formatDateTime(viewItem.product_created_at)}</dd></div>
              <div><dt>Last stock in</dt><dd>{formatDateTime(viewItem.last_stock_in_at)}</dd></div>
              <div><dt>Last stock out</dt><dd>{formatDateTime(viewItem.last_stock_out_at)}</dd></div>
              <div><dt>Last adjusted</dt><dd>{formatDateTime(viewItem.last_adjusted_at)}</dd></div>
            </dl>
            {isRowActive(viewItem) && (
              <div className="modal-actions">
                <button type="button" className="inv-qr inv-qr-in" onClick={() => { const it = viewItem; setViewItem(null); openMovement(it, "STOCK_IN"); }}>Stock In</button>
                <button type="button" className="inv-qr inv-qr-out" onClick={() => { const it = viewItem; setViewItem(null); openMovement(it, "STOCK_OUT"); }}>Stock Out</button>
              </div>
            )}
          </div>
        </div>
      )}

      {qrScannerOpen && (
        <div className="inventory-modal-overlay" onClick={stopQrScanner}>
          <div className="inventory-modal qr-scanner-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-qr-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="inventory-qr-title">{qrMovementType === "SEARCH" ? "QR Search" : qrMovementType === "STOCK_IN" ? "Scan for Stock In" : "Scan for Stock Out"}</h2>
                <p className="modal-help">{qrMovementType === "SEARCH" ? "Scan a product QR label to open its details." : "Scan a product QR label to open its stock movement form."}</p>
              </div>
              <button type="button" className="secondary" onClick={stopQrScanner}>Close</button>
            </div>
            <div id="inventory-qr-reader" />
            {qrScannerError && <div className="alert alert-error" role="alert">{qrScannerError}</div>}
          </div>
        </div>
      )}

    </div>
  );
}