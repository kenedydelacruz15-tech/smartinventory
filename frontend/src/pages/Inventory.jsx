import { useEffect, useState } from "react";
import api from "../services/api";


function ProductThumbnail({ item }) {
  const imageUrl =
    item.product_image_url ||
    item.image_url ||
    item.product_image ||
    item.image ||
    item.photo_url ||
    item.image_path;

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <div
      className="inventory-product-thumbnail"
      style={{
        width: 54,
        height: 54,
        flex: "0 0 54px",
        borderRadius: 10,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        background: "var(--surface, #f1f5f9)",
        border: "1px solid var(--line, #e2e8f0)",
      }}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={item.product_name || "Product"}
          loading="lazy"
          onError={() => setImageFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <i className="bi bi-image" aria-label="No product image" style={{ fontSize: 22, color: "var(--muted, #94a3b8)" }} />
      )}

    </div>
  );
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("all");

  // Search
  const [search, setSearch] = useState("");

  // Stock movement modal
  const [movementItem, setMovementItem] = useState(null);
  const [movementType, setMovementType] = useState("");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementRemarks, setMovementRemarks] = useState("");

  // Adjust stock modal
  const [editItem, setEditItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");

  // Vehicle compatibility is managed from Inventory.
  const [compatibilityItem, setCompatibilityItem] = useState(null);
  const [compatibilityList, setCompatibilityList] = useState([]);
  const [compatibilityBrands, setCompatibilityBrands] = useState([]);
  const [compatibilityModels, setCompatibilityModels] = useState([]);
  const [compatibilityBrand, setCompatibilityBrand] = useState("");
  const [compatibilityModel, setCompatibilityModel] = useState("");
  const [compatibilityError, setCompatibilityError] = useState("");
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);

  // Load inventory
  const loadInventory = async () => {
    try {
      setLoading(true);
      setError("");

      const params = { status: "all" };
      if (search.trim()) params.search = search.trim();
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

  useEffect(() => {
    loadInventory();
    loadCategories();
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

  const visibleItems = statusItems.filter((item) =>
    selectedCategory === "ALL" ||
    (item.category_name || "Uncategorized").toLowerCase() === selectedCategory.toLowerCase()
  );

  const activeCount = items.filter(isActiveItem).length;
  const inactiveCount = items.length - activeCount;

  // Search when user presses Enter
  const handleSearch = (e) => {
    e.preventDefault();
    loadInventory();
  };

  // Open Stock In / Stock Out modal
  const openMovement = (item, type) => {
    console.log("BUTTON CLICKED:", type, item);

    setMovementItem(item);
    setMovementType(type);
    setMovementQuantity("");
    setMovementReason("");
    setMovementRemarks("");
  };

  // Close movement modal
  const closeMovement = () => {
    setMovementItem(null);
    setMovementType("");
    setMovementQuantity("");
    setMovementReason("");
    setMovementRemarks("");
  };

  // Submit Stock In / Stock Out
  const submitMovement = async () => {
    if (!movementItem) return;

    const quantity = Number(movementQuantity);

    if (!quantity || quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (movementType === "STOCK_OUT" && !movementReason) {
      alert("Please select a reason for Stock Out.");
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
        remarks: movementRemarks,
      };

      if (movementType === "STOCK_IN") {
        payload.reference_type = "SUPPLIER";
      } else {
        payload.reference_type = movementReason;
      }

      await api.post(endpoint, payload);

      alert(
        movementType === "STOCK_IN"
          ? "Stock added successfully."
          : "Stock removed successfully."
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

  const openCompatibility = async (item) => {
    setCompatibilityItem(item);
    setCompatibilityList([]);
    setCompatibilityBrand("");
    setCompatibilityModel("");
    setCompatibilityModels([]);
    setCompatibilityError("");
    setCompatibilityLoading(true);
    try {
      const [brandsRes, listRes] = await Promise.all([
        api.get("/api/products/compatibility/brands"),
        api.get(`/api/products/${item.product_id}/compatibility`),
      ]);
      setCompatibilityBrands(Array.isArray(brandsRes.data) ? brandsRes.data : []);
      setCompatibilityList(Array.isArray(listRes.data) ? listRes.data : []);
    } catch (err) {
      setCompatibilityError(err.response?.data?.error || "Could not load vehicle compatibility.");
    } finally {
      setCompatibilityLoading(false);
    }
  };

  const loadCompatibilityModels = async (brandId) => {
    setCompatibilityBrand(brandId);
    setCompatibilityModel("");
    if (!brandId) { setCompatibilityModels([]); return; }
    try {
      const res = await api.get("/api/products/compatibility/models", { params: { brand_id: brandId } });
      setCompatibilityModels(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCompatibilityError(err.response?.data?.error || "Could not load vehicle models.");
    }
  };

  const addCompatibility = async () => {
    if (!compatibilityItem || !compatibilityModel) {
      setCompatibilityError("Select a vehicle model first.");
      return;
    }
    try {
      setCompatibilityLoading(true);
      setCompatibilityError("");
      await api.post(`/api/products/${compatibilityItem.product_id}/compatibility`, { model_id: Number(compatibilityModel) });
      const res = await api.get(`/api/products/${compatibilityItem.product_id}/compatibility`);
      setCompatibilityList(Array.isArray(res.data) ? res.data : []);
      setCompatibilityModel("");
    } catch (err) {
      setCompatibilityError(err.response?.data?.error || "Could not add compatibility.");
    } finally {
      setCompatibilityLoading(false);
    }
  };

  const removeCompatibility = async (entry) => {
    if (!compatibilityItem || !window.confirm(`Remove ${entry.brand_name} ${entry.model_name} from this product?`)) return;
    try {
      setCompatibilityLoading(true);
      await api.delete(`/api/products/${compatibilityItem.product_id}/compatibility/${entry.compatibility_id}`);
      setCompatibilityList((current) => current.filter((row) => row.compatibility_id !== entry.compatibility_id));
    } catch (err) {
      setCompatibilityError(err.response?.data?.error || "Could not remove compatibility.");
    } finally {
      setCompatibilityLoading(false);
    }
  };

  return (
    <div className="page-container inventory-page">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>Manage stock levels and inventory movements.</p>
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

      {/* Active / inactive inventory filters */}
      <div className="inventory-status-filters" role="group" aria-label="Filter inventory by status" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 16px" }}>
        {[{ value: "all", label: "All Items", count: items.length }, { value: "active", label: "Active", count: activeCount }, { value: "inactive", label: "Inactive", count: inactiveCount }].map((option) => (
          <button
            key={option.value}
            type="button"
            className={statusFilter === option.value ? "btn-primary" : "btn-secondary"}
            aria-pressed={statusFilter === option.value}
            onClick={() => setStatusFilter(option.value)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9, padding: "9px 13px", fontWeight: statusFilter === option.value ? 600 : 500 }}
          >
            {option.label}<span className="inventory-filter-count" style={{ opacity: 0.8 }}>{option.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <form className="search-bar inventory-search" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search product, SKU, part number, brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button type="submit">
          Search
        </button>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setTimeout(loadInventory, 0);
          }}
        >
          Clear
        </button>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          Loading...
        </div>
      )}

      {/* Category browser and filtered inventory */}
      <div
        className="inventory-category-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(190px, 240px) minmax(0, 1fr)",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <aside
          className="inventory-category-sidebar"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "14px",
            padding: "14px",
            background: "var(--card, #fff)",
            position: "sticky",
            top: "16px",
            maxHeight: "calc(100vh - 150px)",
            overflowY: "auto",
          }}
        >
          <h2 style={{ fontSize: "16px", margin: "0 0 12px" }}>Categories</h2>
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            aria-pressed={selectedCategory === "ALL"}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "10px", marginBottom: "6px", borderRadius: "8px",
              border: "1px solid var(--line)", cursor: "pointer", textAlign: "left",
              background: selectedCategory === "ALL" ? "var(--surface-hover, #e9edf3)" : "transparent",
              borderColor: selectedCategory === "ALL" ? "var(--line-strong, #cbd5e1)" : "var(--line)",
              color: "var(--text, #263449)",
              fontWeight: selectedCategory === "ALL" ? 500 : 400,
            }}
          >
            <span><i className="bi bi-grid" /> All Items</span>
            <span>{statusItems.length}</span>
          </button>

          {categoryOptions.map((categoryName) => {
            const count = statusItems.filter(
              (item) => (item.category_name || "Uncategorized").toLowerCase() === categoryName.toLowerCase()
            ).length;
            const active = selectedCategory.toLowerCase() === categoryName.toLowerCase();

            return (
              <button
                key={categoryName}
                type="button"
                onClick={() => setSelectedCategory(categoryName)}
                aria-pressed={active}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: "8px", width: "100%", padding: "10px", marginBottom: "6px",
                  borderRadius: "8px", border: "1px solid var(--line)", cursor: "pointer",
                  textAlign: "left", background: active ? "var(--surface-hover, #e9edf3)" : "transparent",
                  borderColor: active ? "var(--line-strong, #cbd5e1)" : "var(--line)",
                  color: "var(--text, #263449)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <i className="bi bi-folder2-open" /> {categoryName}
                </span>
                <span>{count}</span>
              </button>
            );
          })}

          {items.some((item) => !item.category_name) && (
            <button
              type="button"
              onClick={() => setSelectedCategory("Uncategorized")}
              aria-pressed={selectedCategory === "Uncategorized"}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: "100%", padding: "10px", marginBottom: "6px", borderRadius: "8px",
                border: "1px solid var(--line)", cursor: "pointer", textAlign: "left",
                background: selectedCategory === "Uncategorized" ? "var(--surface-hover, #e9edf3)" : "transparent",
                borderColor: selectedCategory === "Uncategorized" ? "var(--line-strong, #cbd5e1)" : "var(--line)",
                color: "var(--text, #263449)",
                fontWeight: selectedCategory === "Uncategorized" ? 500 : 400,
              }}
            >
              <span><i className="bi bi-folder" /> Uncategorized</span>
              <span>{statusItems.filter((item) => !item.category_name).length}</span>
            </button>
          )}
        </aside>

        <section className="inventory-category-results" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", margin: "0 0 12px", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px" }}>
                {selectedCategory === "ALL" ? (statusFilter === "all" ? "All Inventory Items" : `${statusFilter === "active" ? "Active" : "Inactive"} Inventory Items`) : selectedCategory}
              </h2>
              <p style={{ margin: "4px 0 0", color: "var(--muted, #64748b)", fontSize: "13px" }}>
                Showing {visibleItems.length} {visibleItems.length === 1 ? "item" : "items"} · {statusFilter === "all" ? "all statuses" : `${statusFilter} only`}
              </p>
            </div>
            {selectedCategory !== "ALL" && (
              <button type="button" onClick={() => setSelectedCategory("ALL")}>
                Clear category
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="data-table inventory-products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU / Part No.</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      {selectedCategory === "ALL"
                        ? "No inventory found."
                        : `No items found in ${selectedCategory}.`}
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => (
                    <tr key={item.inventory_id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 190 }}>
                          <ProductThumbnail item={item} />
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ display: "block", overflowWrap: "anywhere" }}>{item.product_name || "Unnamed product"}</strong>
                            <span style={{ display: "block", marginTop: 4, color: "var(--muted, #64748b)", fontSize: 12 }}>
                              {item.brand || item.category_name || "Motorcycle part"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span>{item.sku || item.part_number || "-"}</span>
                        {item.sku && item.part_number && (
                          <small style={{ display: "block", marginTop: 4, color: "var(--muted, #64748b)" }}>Part: {item.part_number}</small>
                        )}
                      </td>
                      <td>₱{Number(item.selling_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        <strong>{item.stock_quantity ?? 0}</strong>
                        <small style={{ display: "block", marginTop: 4, color: "var(--muted, #64748b)" }}>Min: {item.reorder_level ?? 0}</small>
                      </td>
                      <td>
                        {!(item.is_active === true || Number(item.is_active) === 1) ? (
                          <span className="status-badge">Inactive</span>
                        ) : Number(item.stock_quantity) <= 0 ? (
                          <span className="status-badge danger">Out of Stock</span>
                        ) : Number(item.stock_quantity) <= Number(item.reorder_level || 0) ? (
                          <span className="status-badge warning">Low Stock</span>
                        ) : (
                          <span className="status-badge success">In Stock</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {(item.is_active === true || Number(item.is_active) === 1) ? (
                            <>
                              <button type="button" className="btn-success" onClick={() => openMovement(item, "STOCK_IN")}>Stock In</button>
                              <button type="button" className="btn-warning" onClick={() => openMovement(item, "STOCK_OUT")}>Stock Out</button>
                              <button type="button" className="btn-primary" onClick={() => openEdit(item)}>Adjust</button>
                              <button type="button" className="btn-secondary" onClick={() => openCompatibility(item)}>Compatibility</button>
                              <button type="button" className="btn-danger" onClick={() => deactivateItem(item)}>Deactivate</button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="btn-primary" onClick={() => restoreItem(item)}>Restore</button>
                              <button type="button" className="btn-secondary" onClick={() => openCompatibility(item)}>Compatibility</button>
                              <button type="button" className="btn-danger" onClick={() => permanentlyDeleteItem(item)}>Permanently Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

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

            {movementType === "STOCK_OUT" && (
              <>
                <label>
                  Reason
                </label>

                <select
                  value={movementReason}
                  onChange={(e) =>
                    setMovementReason(e.target.value)
                  }
                >
                  <option value="">
                    Select reason
                  </option>

                  <option value="DAMAGED">
                    Damaged
                  </option>

                  <option value="LOST">
                    Lost
                  </option>

                  <option value="ADJUSTMENT">
                    Adjustment
                  </option>

                  <option value="OTHER">
                    Other
                  </option>
                </select>
              </>
            )}

            <label>
              Remarks
            </label>

            <textarea
              placeholder="Optional remarks..."
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

      {compatibilityItem && (
        <div className="inventory-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCompatibilityItem(null); }}>
          <div className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-compatibility-title">
            <div className="modal-header">
              <div>
                <h2 id="inventory-compatibility-title">Vehicle Compatibility</h2>
                <p className="modal-help">{compatibilityItem.product_name}</p>
              </div>
              <button type="button" aria-label="Close compatibility" onClick={() => setCompatibilityItem(null)}>×</button>
            </div>
            {compatibilityError && <div className="error-message">{compatibilityError}</div>}
            <div className="form-grid">
              <label>Vehicle brand
                <select value={compatibilityBrand} onChange={(e) => loadCompatibilityModels(e.target.value)}>
                  <option value="">Select brand</option>
                  {compatibilityBrands.map((brand) => <option key={brand.brand_id} value={brand.brand_id}>{brand.brand_name}</option>)}
                </select>
              </label>
              <label>Vehicle model
                <select value={compatibilityModel} onChange={(e) => setCompatibilityModel(e.target.value)} disabled={!compatibilityBrand}>
                  <option value="">Select model</option>
                  {compatibilityModels.map((model) => <option key={model.model_id} value={model.model_id}>{model.model_name}{model.model_year ? ` (${model.model_year})` : ""}</option>)}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setCompatibilityItem(null)}>Close</button>
              <button type="button" className="btn-primary" onClick={addCompatibility} disabled={compatibilityLoading || !compatibilityModel}>{compatibilityLoading ? "Saving..." : "Add Compatibility"}</button>
            </div>
            <h3>Compatible vehicles</h3>
            {compatibilityLoading && compatibilityList.length === 0 ? <p className="muted">Loading compatibility...</p> : compatibilityList.length === 0 ? <p className="muted">No compatible vehicles added yet.</p> : (
              <div className="table-container"><table className="data-table"><thead><tr><th>Brand</th><th>Model</th><th>Year</th><th>Action</th></tr></thead><tbody>
                {compatibilityList.map((entry) => <tr key={entry.compatibility_id}><td>{entry.brand_name}</td><td>{entry.model_name}</td><td>{entry.model_year || "—"}</td><td><button type="button" className="btn-danger" onClick={() => removeCompatibility(entry)} disabled={compatibilityLoading}>Remove</button></td></tr>)}
              </tbody></table></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}