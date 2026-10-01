import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../services/api";

const emptyForm = {
  product_name: "",
  sku: "",
  part_number: "",
  product_type: "",
  brand: "",
  barcode: "",
  category_id: "",
  selling_price: "",
  reorder_level: "10",
  description: "",
  image_url: "",
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [duplicateProduct, setDuplicateProduct] = useState(null);
  const [duplicateOverride, setDuplicateOverride] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Product compatibility
  const [compatibilityOpen, setCompatibilityOpen] = useState(false);
  const [compatibilityProduct, setCompatibilityProduct] = useState(null);
  const [compatibilities, setCompatibilities] = useState([]);
  const [compatibilityBrands, setCompatibilityBrands] = useState([]);
  const [compatibilityModels, setCompatibilityModels] = useState([]);
  const [selectedCompatibilityBrand, setSelectedCompatibilityBrand] = useState("");
  const [selectedCompatibilityModel, setSelectedCompatibilityModel] = useState("");
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [compatibilityError, setCompatibilityError] = useState("");
  const [newCompatibilityBrand, setNewCompatibilityBrand] = useState("");
  const [newCompatibilityModel, setNewCompatibilityModel] = useState("");
  const [newCompatibilityYear, setNewCompatibilityYear] = useState("");

  // Barcode scanner
  const scannerRef = useRef(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [filter]);

  // Load Products

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setError("");

      const params = {
        status: filter,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get("/api/products/", {
        params,
      });

      const data = res.data;

      if (Array.isArray(data)) {
        setProducts(data);
      } else if (Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Load products error:", err);

      setError(
        err.response?.data?.error ||
          "Failed to load products."
      );

      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load Categories

  const loadCategories = async () => {
    try {
      const res = await api.get("/api/categories/");

      const data = res.data;

      if (Array.isArray(data)) {
        setCategories(data);
      } else if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("Load categories error:", err);

      setError(
        err.response?.data?.error ||
          "Failed to load categories."
      );
    }
  };

  // Form Change

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // Reset Form

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError("");
    setSuccess("");
    setLookupResult(null);
    setDuplicateProduct(null);
    setDuplicateOverride(false);
    setPreviewImage(null);
  };

  // Search

  const handleSearch = async () => {
    await loadProducts();
  };

  // Look up barcode using both APIs
  const handleBarcodeLookup = async (barcodeValue = null) => {
    const barcode = String(
      barcodeValue ?? form.barcode ?? ""
    ).trim();

    if (!barcode) {
      setError("Please enter or scan a barcode first.");
      return;
    }

    if (!/^\d+$/.test(barcode)) {
      setError("Barcode must contain numbers only.");
      return;
    }

    try {
      setBarcodeLoading(true);
      setError("");
      setSuccess("");
      setLookupResult(null);
      setDuplicateProduct(null);
      setDuplicateOverride(false);

      const res = await api.get(
        `/api/products/autoparts/barcode/${encodeURIComponent(
          barcode
        )}`
      );

      const data = res.data;

      if (data.duplicate) {
        setDuplicateProduct(data.duplicate);
      }

      if (!data.found) {
        setLookupResult(data);
        setError(
          data.message ||
            "No product was found in either API."
        );
        return;
      }

      setLookupResult(data);

      setForm((prev) => ({
        ...prev,

        barcode:
          data.ean || barcode,

        product_name:
          data.product_name ||
          prev.product_name,

        part_number:
          data.part_number ||
          prev.part_number,

        brand:
          data.brand ||
          prev.brand,

        description:
          data.description ||
          prev.description
      }));

      setSuccess(
        data.message ||
          "Product information found. Review the fields before saving."
      );
    } catch (err) {
      console.error(
        "Dual API barcode lookup error:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to look up barcode."
      );
    } finally {
      setBarcodeLoading(false);
    }
  };

  // Start Barcode Scanner

  const startScanner = async () => {
    setScannerError("");
    setError("");
    setSuccess("");
    setScannerOpen(true);

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(
          "barcode-reader"
        );

        scannerRef.current = scanner;

        await scanner.start(
          {
            facingMode: "environment",
          },
          {
            fps: 10,
            qrbox: {
              width: 300,
              height: 150,
            },
          },
          async (decodedText) => {
            console.log(
              "Barcode detected:",
              decodedText
            );

            // Put scanned barcode into the form
            setForm((prev) => ({
              ...prev,
              barcode: decodedText,
            }));

            // Stop camera
            await stopScanner();

            // Automatically look up the barcode
            await handleBarcodeLookup(decodedText);
          },
          () => {
            // Ignore continuous scan failures.
          }
        );
      } catch (err) {
        console.error(
          "Barcode scanner error:",
          err
        );

        setScannerError(
          "Unable to access the camera. Please allow camera permission and try again."
        );
      }
    }, 150);
  };

  // Stop Barcode Scanner

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err) {
          console.log(
            "Scanner already stopped."
          );
        }

        try {
          await scannerRef.current.clear();
        } catch (err) {
          console.log(
            "Scanner already cleared."
          );
        }

        scannerRef.current = null;
      }
    } catch (err) {
      console.error(
        "Stop scanner error:",
        err
      );
    }

    setScannerOpen(false);
  };

  // Clean Up Scanner When Leaving Page

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current
              ?.clear()
              .catch(() => {});
          });
      }
    };
  }, []);

  // Save Product

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.product_name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.sku.trim()) {
      setError("SKU is required.");
      return;
    }

    if (!form.category_id) {
      setError("Please select a category.");
      return;
    }

    if (
      form.selling_price === "" ||
      Number(form.selling_price) < 0
    ) {
      setError("Please enter a valid selling price.");
      return;
    }

    if (
      form.reorder_level === "" ||
      Number(form.reorder_level) < 0
    ) {
      setError("Please enter a valid reorder level.");
      return;
    }

    if (editingId === null && duplicateProduct && !duplicateOverride) {
      setError("This barcode already belongs to an existing product. Choose an option in the duplicate warning before saving.");
      return;
    }

    const productData = {
      product_name:
        form.product_name.trim(),

      sku:
        form.sku.trim(),

      barcode:
        form.barcode.trim() || null,

      part_number:
        form.part_number.trim() || null,

      product_type:
        form.product_type.trim() || null,

      brand:
        form.brand.trim() || null,

      category_id:
        Number(form.category_id),

      selling_price:
        Number(form.selling_price),

      reorder_level:
        Number(form.reorder_level),

      description:
        form.description.trim() || null,

      image_url:
        lookupResult?.image || form.image_url || null,
    };

    try {
      setLoading(true);

      if (editingId !== null) {
        await api.put(
          `/api/products/${editingId}`,
          productData
        );

        setSuccess(
          "Product updated successfully."
        );
      } else {
        await api.post(
          "/api/products/",
          productData
        );

        setSuccess(
          "Product added successfully."
        );
      }

      setForm({ ...emptyForm });
      setEditingId(null);

      await loadProducts();
    } catch (err) {
      console.error(
        "Save product error:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to save product."
      );
    } finally {
      setLoading(false);
    }
  };

  // Edit Product

  const handleEdit = (product) => {
    setEditingId(product.product_id);

    setForm({
      product_name:
        product.product_name || "",

      sku:
        product.sku || "",

      part_number:
        product.part_number || "",

      product_type:
        product.product_type || "",

      brand:
        product.brand || "",

      barcode:
        product.barcode || "",

      category_id:
        product.category_id
          ? String(product.category_id)
          : "",

      selling_price:
        product.selling_price !== null &&
        product.selling_price !== undefined
          ? String(product.selling_price)
          : "",

      reorder_level:
        product.reorder_level !== null &&
        product.reorder_level !== undefined
          ? String(product.reorder_level)
          : "10",

      description:
        product.description || "",

      image_url:
        product.image_url || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Deactivate Product

  const handleDeactivate = async (product) => {
    const confirmed = window.confirm(
      `Deactivate "${product.product_name}"?\n\n` +
        "The product will be hidden from the active product list, " +
        "but its records and history will be preserved."
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.put(
        `/api/products/${product.product_id}/deactivate`
      );

      setSuccess(
        `"${product.product_name}" was deactivated successfully.`
      );

      if (
        editingId === product.product_id
      ) {
        resetForm();
      }

      await loadProducts();
    } catch (err) {
      console.error(
        "Deactivate product error:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to deactivate product."
      );
    }
  };

  // Restore Product

  const handleRestore = async (product) => {
    const confirmed = window.confirm(
      `Restore "${product.product_name}"?\n\n` +
        "The product will become active again."
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.put(
        `/api/products/${product.product_id}/restore`
      );

      setSuccess(
        `"${product.product_name}" was restored successfully.`
      );

      await loadProducts();
    } catch (err) {
      console.error(
        "Restore product error:",
        err
      );

      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to restore product."
      );
    }
  };

  // Load compatibility brands
  const loadCompatibilityBrands = async () => {
    try {
      const res = await api.get("/api/products/compatibility/brands");
      setCompatibilityBrands(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCompatibilityError(
        err.response?.data?.error || "Failed to load vehicle brands."
      );
    }
  };

  // Load compatibility models
  const loadCompatibilityModels = async (brandId) => {
    if (!brandId) {
      setCompatibilityModels([]);
      return;
    }
    try {
      const res = await api.get("/api/products/compatibility/models", {
        params: { brand_id: brandId },
      });
      setCompatibilityModels(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCompatibilityError(
        err.response?.data?.error || "Failed to load vehicle models."
      );
    }
  };

  // Open compatibility manager
  const openCompatibility = async (product) => {
    try {
      setCompatibilityProduct(product);
      setCompatibilityOpen(true);
      setCompatibilityLoading(true);
      setCompatibilityError("");
      setSelectedCompatibilityBrand("");
      setSelectedCompatibilityModel("");
      setCompatibilityModels([]);
      await loadCompatibilityBrands();

      // Automatically import motorcycle compatibility from the product part number.
      try {
        const autoRes = await api.post(
          `/api/products/${product.product_id}/compatibility/auto`
        );
        if (autoRes.data?.message) {
          setCompatibilityError(autoRes.data.message);
        }
      } catch (autoErr) {
        setCompatibilityError(
          autoErr.response?.data?.error ||
            "Automatic vehicle compatibility could not be loaded."
        );
      }

      const res = await api.get(
        `/api/products/${product.product_id}/compatibility`
      );
      setCompatibilities(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCompatibilityError(
        err.response?.data?.error || "Failed to load compatibility."
      );
    } finally {
      setCompatibilityLoading(false);
    }
  };

  // Add compatibility to product
  const addCompatibility = async () => {
    if (!compatibilityProduct || !selectedCompatibilityModel) {
      setCompatibilityError("Please select a vehicle model.");
      return;
    }
    try {
      setCompatibilityLoading(true);
      setCompatibilityError("");
      await api.post(
        `/api/products/${compatibilityProduct.product_id}/compatibility`,
        { model_id: Number(selectedCompatibilityModel) }
      );
      const res = await api.get(
        `/api/products/${compatibilityProduct.product_id}/compatibility`
      );
      setCompatibilities(Array.isArray(res.data) ? res.data : []);
      setSelectedCompatibilityModel("");
    } catch (err) {
      setCompatibilityError(
        err.response?.data?.error || "Failed to add compatibility."
      );
    } finally {
      setCompatibilityLoading(false);
    }
  };

  // Remove compatibility
  const removeCompatibility = async (item) => {
    if (!compatibilityProduct) return;
    const confirmed = window.confirm(
      `Remove ${item.brand_name} ${item.model_name}${item.model_year ? ` (${item.model_year})` : ""} from this product?`
    );
    if (!confirmed) return;
    try {
      setCompatibilityLoading(true);
      setCompatibilityError("");
      await api.delete(
        `/api/products/${compatibilityProduct.product_id}/compatibility/${item.compatibility_id}`
      );
      setCompatibilities((prev) =>
        prev.filter((row) => row.compatibility_id !== item.compatibility_id)
      );
    } catch (err) {
      setCompatibilityError(
        err.response?.data?.error || "Failed to remove compatibility."
      );
    } finally {
      setCompatibilityLoading(false);
    }
  };

  // Create a vehicle brand
  const addCompatibilityBrand = async () => {
    const name = newCompatibilityBrand.trim();
    if (!name) {
      setCompatibilityError("Enter a vehicle brand name.");
      return;
    }
    try {
      setCompatibilityLoading(true);
      setCompatibilityError("");
      const res = await api.post("/api/products/compatibility/brands", {
        brand_name: name,
      });
      await loadCompatibilityBrands();
      const brandId = res.data.brand_id || res.data.brand?.brand_id;
      if (brandId) {
        setSelectedCompatibilityBrand(String(brandId));
        await loadCompatibilityModels(brandId);
      }
      setNewCompatibilityBrand("");
    } catch (err) {
      setCompatibilityError(
        err.response?.data?.error || "Failed to create vehicle brand."
      );
    } finally {
      setCompatibilityLoading(false);
    }
  };

  // Create a vehicle model
  const addCompatibilityModel = async () => {
    if (!selectedCompatibilityBrand) {
      setCompatibilityError("Select a vehicle brand first.");
      return;
    }
    const name = newCompatibilityModel.trim();
    if (!name) {
      setCompatibilityError("Enter a vehicle model name.");
      return;
    }
    try {
      setCompatibilityLoading(true);
      setCompatibilityError("");
      const res = await api.post("/api/products/compatibility/models", {
        brand_id: Number(selectedCompatibilityBrand),
        model_name: name,
        model_year: newCompatibilityYear.trim() || null,
      });
      await loadCompatibilityModels(selectedCompatibilityBrand);
      const modelId = res.data.model_id || res.data.model?.model_id;
      if (modelId) setSelectedCompatibilityModel(String(modelId));
      setNewCompatibilityModel("");
      setNewCompatibilityYear("");
    } catch (err) {
      setCompatibilityError(
        err.response?.data?.error || "Failed to create vehicle model."
      );
    } finally {
      setCompatibilityLoading(false);
    }
  };

  // Close compatibility manager
  const closeCompatibility = () => {
    setCompatibilityOpen(false);
    setCompatibilityProduct(null);
    setCompatibilities([]);
    setCompatibilityModels([]);
    setSelectedCompatibilityBrand("");
    setSelectedCompatibilityModel("");
    setCompatibilityError("");
    setNewCompatibilityBrand("");
    setNewCompatibilityModel("");
    setNewCompatibilityYear("");
  };

  // Category Name

  const getCategoryName = (categoryId) => {
    const category = categories.find(
      (item) =>
        Number(item.category_id) ===
        Number(categoryId)
    );

    return category
      ? category.category_name
      : "Unknown";
  };

  // Render

  return (
    <div className="page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <h1>Products</h1>

          <p>
            Manage motorcycle parts and
            product information.
          </p>
        </div>
      </div>

      {/* =====================================================
          ALERTS
      ===================================================== */}

      {error && (
        <div className="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          {success}
        </div>
      )}

      {/* =====================================================
          PRODUCT FORM
      ===================================================== */}

      <div className="product-form-card">

        <div className="form-header">
          <div>
            <h2>
              {editingId !== null
                ? "Edit Product"
                : "Add Product"}
            </h2>

            {editingId !== null && (
              <p>
                You are currently editing
                product ID #{editingId}
              </p>
            )}
          </div>
        </div>

        {/* =================================================
            BARCODE SCANNER
        ================================================= */}

        {scannerOpen && (
          <div
            style={{
              margin: "0 0 20px 0",
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <h3>Scan Barcode</h3>

            <p>
              Point your camera at the
              product barcode.
            </p>

            <div
              id="barcode-reader"
              style={{
                width: "100%",
                maxWidth: "500px",
                margin: "0 auto",
              }}
            />

            {scannerError && (
              <div className="alert">
                {scannerError}
              </div>
            )}

            <button
              type="button"
              className="secondary"
              onClick={stopScanner}
              style={{
                marginTop: "10px",
              }}
            >
              ✕ Stop Camera
            </button>
          </div>
        )}


        {/* DUPLICATE WARNING */}
        {duplicateProduct && editingId === null && (
          <div style={{ margin: "0 0 20px 0", padding: "15px", border: "1px solid #e0a800", borderRadius: "8px", background: "#fff8e1" }}>
            <h3 style={{ marginTop: 0 }}>Possible Duplicate Product</h3>
            <p>This barcode already belongs to a product in your inventory. Review the existing product before saving.</p>
            <div style={{ padding: "12px", background: "#fff", borderRadius: "6px", marginBottom: "12px" }}>
              <strong>{duplicateProduct.product_name || "Existing Product"}</strong>
              <p style={{ margin: "6px 0" }}>SKU: {duplicateProduct.sku || "-"}</p>
              <p style={{ margin: "6px 0" }}>Part Number: {duplicateProduct.part_number || "-"}</p>
              <p style={{ margin: "6px 0" }}>Product Type: {duplicateProduct.product_type || "-"}</p>
              <p style={{ margin: "6px 0" }}>Brand: {duplicateProduct.brand || "-"}</p>
              <p style={{ margin: "6px 0" }}>Barcode: {duplicateProduct.barcode || form.barcode || "-"}</p>
              <p style={{ margin: "6px 0" }}>Current Stock: {duplicateProduct.stock_quantity ?? 0}</p>
              <p style={{ margin: "6px 0" }}>Status: {Number(duplicateProduct.is_active) === 1 ? "Active" : "Inactive"}</p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" className="secondary" onClick={async () => {
                try {
                  const res = await api.get(`/api/products/${duplicateProduct.product_id}`);
                  const existing = res.data;
                  setForm((prev) => ({
                    ...prev,
                    product_name: existing.product_name || "",
                    sku: existing.sku || "",
                    barcode: existing.barcode || "",
                    part_number: existing.part_number || "",
                    product_type: existing.product_type || "",
                    brand: existing.brand || "",
                    category_id: existing.category_id || "",
                    selling_price: existing.selling_price ?? "",
                    reorder_level: existing.reorder_level ?? "10",
                    description: existing.description || "",
                  }));
                  setEditingId(existing.product_id);
                  setDuplicateProduct(null);
                  setDuplicateOverride(false);
                  setError("");
                  setSuccess("Existing product loaded. You are now editing the existing product.");
                } catch (err) {
                  setError(err.response?.data?.error || "Failed to load the existing product.");
                }
              }}>Use Existing Product</button>
              <button type="button" className="secondary" onClick={() => {
                setDuplicateProduct(null);
                setDuplicateOverride(false);
                setError("");
                setSuccess("Use your Stock In module to add quantity to the existing product instead of creating a duplicate.");
              }}>Add Stock Instead</button>
              <button type="button" className="secondary" onClick={() => {
                setForm((prev) => ({ ...prev, barcode: "" }));
                setDuplicateProduct(null);
                setDuplicateOverride(false);
                setError("");
                setSuccess("Create a separate product with a different barcode, or leave it blank if this product has no barcode.");
              }}>Create Different Product</button>
              <button type="button" className="secondary" onClick={() => {
                setDuplicateProduct(null);
                setDuplicateOverride(false);
                setError("");
                setSuccess("");
              }}>Cancel</button>
            </div>
          </div>
        )}

        {/* PRODUCT REVIEW */}
        {lookupResult && (
          <div
            style={{
              margin: "0 0 20px 0",
              padding: "16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fafafa",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Product Review</h3>

            {lookupResult.images?.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}
              >
                {lookupResult.images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setPreviewImage(image)}
                    aria-label={`Preview product image ${index + 1}`}
                    style={{
                      padding: 0,
                      width: index === 0 ? "220px" : "100px",
                      height: index === 0 ? "220px" : "100px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      background: "#fff",
                      cursor: "zoom-in",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={image}
                      alt={lookupResult.product_name || "Product"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div>
              <h4 style={{ margin: "0 0 12px 0" }}>
                {lookupResult.product_name || "Product"}
              </h4>

              <p><strong>Barcode:</strong> {lookupResult.ean || form.barcode || "-"}</p>
              <p><strong>Part Number:</strong> {lookupResult.part_number || "-"}</p>
              <p><strong>Brand:</strong> {lookupResult.brand || "-"}</p>
              <p><strong>Product Type:</strong> {lookupResult.product_type || "-"}</p>
            </div>

            {lookupResult.specifications &&
              Object.keys(lookupResult.specifications).length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <strong>Important Specifications</strong>
                  <div style={{ marginTop: "8px" }}>
                    {Object.entries(lookupResult.specifications).map(
                      ([key, value]) => (
                        <p key={key} style={{ margin: "5px 0" }}>
                          <strong>{key}:</strong> {value}
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* IMAGE PREVIEW MODAL */}
        {previewImage && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product image preview"
            onClick={() => setPreviewImage(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              background: "rgba(0, 0, 0, 0.78)",
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              aria-label="Close image preview"
              style={{
                position: "absolute",
                top: "18px",
                right: "18px",
                width: "42px",
                height: "42px",
                border: "none",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.95)",
                color: "#222",
                fontSize: "24px",
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <img
              src={previewImage}
              alt={lookupResult?.product_name || "Product preview"}
              onClick={(event) => event.stopPropagation()}
              style={{
                maxWidth: "min(1000px, 92vw)",
                maxHeight: "88vh",
                objectFit: "contain",
                borderRadius: "10px",
                background: "#fff",
                padding: "10px",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="product-form"
        >

          {/* PRODUCT NAME */}

          <div className="form-field">
            <label>Product Name</label>

            <input
              type="text"
              name="product_name"
              placeholder="Enter product name"
              value={form.product_name}
              onChange={handleChange}
              disabled={
                loading ||
                barcodeLoading
              }
              required
            />
          </div>

          {/* SKU */}

          <div className="form-field">
            <label>SKU</label>

            <input
              type="text"
              name="sku"
              placeholder="Example: BP-001"
              value={form.sku}
              onChange={handleChange}
              disabled={
                loading ||
                barcodeLoading
              }
              required
            />
          </div>

          {/* BARCODE / EAN */}

          <div className="form-field">
            <label>Barcode / EAN</label>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >

              <input
                type="text"
                name="barcode"
                placeholder="Scan or enter EAN"
                value={form.barcode}
                onChange={handleChange}
                disabled={
                  loading ||
                  barcodeLoading
                }
              />

              <button
                type="button"
                className="secondary"
                onClick={startScanner}
                disabled={
                  loading ||
                  barcodeLoading ||
                  scannerOpen
                }
              >
                📷 Scan
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  handleBarcodeLookup()
                }
                disabled={
                  loading ||
                  barcodeLoading
                }
              >
                {barcodeLoading
                  ? "Looking up..."
                  : "🔎 Lookup"}
              </button>

            </div>

            <small>
              Scan or enter the product EAN.
              The scanner will automatically
              look it up.
            </small>
          </div>

          {/* PART NUMBER */}

          <div className="form-field">
            <label>Part Number</label>

            <input
              type="text"
              name="part_number"
              placeholder="Part number"
              value={form.part_number}
              onChange={handleChange}
              disabled={
                loading ||
                barcodeLoading
              }
            />
          </div>

          {/* PRODUCT TYPE */}

          <div className="form-field">
            <label>Product Type</label>

            <input
              type="text"
              name="product_type"
              placeholder="Example: Brake Pad"
              value={form.product_type}
              onChange={handleChange}
              disabled={loading || barcodeLoading}
            />
          </div>

          {/* BRAND */}

          <div className="form-field">
            <label>Brand</label>

            <input
              type="text"
              name="brand"
              placeholder="Example: Honda"
              value={form.brand}
              onChange={handleChange}
              disabled={
                loading ||
                barcodeLoading
              }
            />
          </div>

          {/* CATEGORY */}

          <div className="form-field">
            <label>Category</label>

            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value="">
                Select Category
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={
                      category.category_id
                    }
                    value={
                      category.category_id
                    }
                  >
                    {
                      category.category_name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* SELLING PRICE */}

          <div className="form-field">
            <label>Selling Price</label>

            <input
              type="number"
              name="selling_price"
              placeholder="0.00"
              value={form.selling_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              disabled={loading}
              required
            />
          </div>

          {/* REORDER LEVEL */}

          <div className="form-field">
            <label>Reorder Level</label>

            <input
              type="number"
              name="reorder_level"
              placeholder="10"
              value={form.reorder_level}
              onChange={handleChange}
              min="0"
              step="1"
              disabled={loading}
              required
            />
          </div>

          {/* DESCRIPTION */}

          <div className="form-field full-width">
            <label>Description</label>

            <input
              type="text"
              name="description"
              placeholder="Product description"
              value={form.description}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          {/* FORM BUTTONS */}

          <div className="product-form-buttons">

            <button
              type="submit"
              className="primary update-button"
              disabled={
                loading ||
                barcodeLoading
              }
            >
              {loading
                ? "Saving..."
                : editingId !== null
                ? "✓ Update Product"
                : "+ Add Product"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="secondary cancel-button"
                onClick={resetForm}
                disabled={
                  loading ||
                  barcodeLoading
                }
              >
                ✕ Cancel
              </button>
            )}

          </div>

        </form>
      </div>

      {/* =====================================================
          SEARCH / FILTER TOOLBAR
      ===================================================== */}

      <div className="product-toolbar">

        <div className="search-box">

          <input
            type="text"
            placeholder="Search product, SKU, brand..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />

          <button
            type="button"
            className="search-button"
            onClick={handleSearch}
          >
            Search
          </button>

        </div>

        <div className="filter-box">

          <label>Status</label>

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value)
            }
          >
            <option value="active">
              Active Products
            </option>

            <option value="inactive">
              Inactive Products
            </option>

            <option value="all">
              All Products
            </option>
          </select>

        </div>

      </div>

      {/* =====================================================
          PRODUCT TABLE
      ===================================================== */}

      <div className="table-container">

        {loadingProducts ? (
          <div className="empty-state">
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">

            <h3>No products found</h3>

            <p>
              {filter === "active"
                ? "There are no active products."
                : filter === "inactive"
                ? "There are no inactive products."
                : "No products are available."}
            </p>

          </div>
        ) : (
          <table>

            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Part Number</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Price</th>
                <th>Reorder</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {products.map((product) => {

                const isActive =
                  Number(
                    product.is_active
                  ) === 1;

                return (
                  <tr
                    key={
                      product.product_id
                    }
                  >

                    <td>
                      {product.product_id}
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          minWidth: "220px",
                        }}
                      >
                        {product.image_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage(
                                product.image_url
                              )
                            }
                            style={{
                              border: "none",
                              padding: 0,
                              background: "transparent",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                            title="Preview product image"
                          >
                            <img
                              src={product.image_url}
                              alt={product.product_name || "Product"}
                              style={{
                                width: "48px",
                                height: "48px",
                                objectFit: "contain",
                                borderRadius: "8px",
                                border: "1px solid #ddd",
                                background: "#fff",
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </button>
                        ) : (
                          <div
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "8px",
                              border: "1px solid #ddd",
                              background: "#f5f5f5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "20px",
                              flexShrink: 0,
                            }}
                            title="No product image"
                          >
                            🖼️
                          </div>
                        )}

                        <strong>
                          {product.product_name}
                        </strong>
                      </div>
                    </td>

                    <td>
                      {product.sku}
                    </td>

                    <td>
                      {product.part_number ||
                        "-"}
                    </td>

                    <td>
                      {product.brand ||
                        "-"}
                    </td>

                    <td>
                      {product.category_name ||
                        getCategoryName(
                          product.category_id
                        )}
                    </td>

                    <td>
                      ₱
                      {Number(
                        product.selling_price ||
                          0
                      ).toFixed(2)}
                    </td>

                    <td>
                      {
                        product.reorder_level
                      }
                    </td>

                    <td>

                      <span
                        className={
                          isActive
                            ? "status-badge active-status"
                            : "status-badge inactive-status"
                        }
                      >
                        {isActive
                          ? "Active"
                          : "Inactive"}
                      </span>

                    </td>

                    <td>

                      <div className="action-buttons">

                        {/* EDIT */}

                        <button
                          type="button"
                          className="action-button edit-button"
                          onClick={() =>
                            handleEdit(
                              product
                            )
                          }
                          disabled={loading}
                          title="Edit product"
                        >
                          <span className="action-icon">
                            ✎
                          </span>

                          Edit
                        </button>

                        {/* COMPATIBILITY */}

                        <button
                          type="button"
                          className="action-button"
                          onClick={() => openCompatibility(product)}
                          disabled={loading}
                          title="Manage vehicle compatibility"
                        >
                          <span className="action-icon">🏍️</span>
                          Compatibility
                        </button>

                        {/* DEACTIVATE / RESTORE */}

                        {isActive ? (
                          <button
                            type="button"
                            className="action-button deactivate-button"
                            onClick={() =>
                              handleDeactivate(
                                product
                              )
                            }
                            disabled={loading}
                            title="Deactivate product"
                          >
                            <span className="action-icon">
                              ⏸
                            </span>

                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="action-button restore-button"
                            onClick={() =>
                              handleRestore(
                                product
                              )
                            }
                            disabled={loading}
                            title="Restore product"
                          >
                            <span className="action-icon">
                              ↻
                            </span>

                            Restore
                          </button>
                        )}

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>
        )}

      </div>

      {/* PRODUCT COMPATIBILITY MODAL */}
      {compatibilityOpen && compatibilityProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={closeCompatibility}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: "12px",
              padding: "24px",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "15px" }}>
              <div>
                <h2 style={{ margin: 0 }}>Product Compatibility</h2>
                <p style={{ margin: "6px 0 0", color: "#666" }}>
                  {compatibilityProduct.product_name}
                  {compatibilityProduct.part_number ? ` • ${compatibilityProduct.part_number}` : ""}
                </p>
              </div>
              <button type="button" className="secondary" onClick={closeCompatibility}>✕ Close</button>
            </div>

            {compatibilityError && (
              <div className="alert" style={{ marginTop: "18px" }}>
                {compatibilityError}
              </div>
            )}

            <div style={{ marginTop: "20px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
              <h3 style={{ marginTop: 0 }}>Compatible Vehicles</h3>
              <p style={{ marginTop: 0, color: "#666" }}>
                Vehicle applications are automatically retrieved when the product has a part number. You can still add a vehicle manually below if needed.
              </p>

              <h4 style={{ marginBottom: "10px" }}>Add Manually</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px", alignItems: "end" }}>
                <div className="form-field">
                  <label>Vehicle Brand</label>
                  <select
                    value={selectedCompatibilityBrand}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setSelectedCompatibilityBrand(value);
                      setSelectedCompatibilityModel("");
                      await loadCompatibilityModels(value);
                    }}
                    disabled={compatibilityLoading}
                  >
                    <option value="">Select brand</option>
                    {compatibilityBrands.map((brand) => (
                      <option key={brand.brand_id} value={brand.brand_id}>
                        {brand.brand_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Vehicle Model / Year</label>
                  <select
                    value={selectedCompatibilityModel}
                    onChange={(e) => setSelectedCompatibilityModel(e.target.value)}
                    disabled={compatibilityLoading || !selectedCompatibilityBrand}
                  >
                    <option value="">Select model</option>
                    {compatibilityModels.map((model) => (
                      <option key={model.model_id} value={model.model_id}>
                        {model.model_name}{model.model_year ? ` (${model.model_year})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="primary"
                  onClick={addCompatibility}
                  disabled={compatibilityLoading || !selectedCompatibilityModel}
                >
                  + Add
                </button>
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <h3>Saved Compatible Vehicles</h3>
              {compatibilityLoading && compatibilities.length === 0 ? (
                <p>Loading compatibility...</p>
              ) : compatibilities.length === 0 ? (
                <div className="empty-state" style={{ padding: "25px 10px" }}>
                  <p>No compatible vehicles have been assigned yet.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {compatibilities.map((item) => (
                    <div
                      key={item.compatibility_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "15px",
                        padding: "12px 14px",
                        border: "1px solid #e2e2e2",
                        borderRadius: "8px",
                      }}
                    >
                      <div>
                        <strong>{item.brand_name} {item.model_name}</strong>
                        {item.model_year && (
                          <div style={{ color: "#666", marginTop: "3px" }}>
                            Model year: {item.model_year}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="action-button deactivate-button"
                        onClick={() => removeCompatibility(item)}
                        disabled={compatibilityLoading}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: "24px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
              <h3 style={{ marginTop: 0 }}>Add Vehicle Brand</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Example: Honda"
                  value={newCompatibilityBrand}
                  onChange={(e) => setNewCompatibilityBrand(e.target.value)}
                  disabled={compatibilityLoading}
                  style={{ flex: 1 }}
                />
                <button type="button" className="secondary" onClick={addCompatibilityBrand} disabled={compatibilityLoading}>
                  + Add Brand
                </button>
              </div>
            </div>

            <div style={{ marginTop: "16px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
              <h3 style={{ marginTop: 0 }}>Add Vehicle Model</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "10px", alignItems: "end" }}>
                <div className="form-field">
                  <label>Brand</label>
                  <select
                    value={selectedCompatibilityBrand}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setSelectedCompatibilityBrand(value);
                      setSelectedCompatibilityModel("");
                      await loadCompatibilityModels(value);
                    }}
                    disabled={compatibilityLoading}
                  >
                    <option value="">Select brand</option>
                    {compatibilityBrands.map((brand) => (
                      <option key={brand.brand_id} value={brand.brand_id}>
                        {brand.brand_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Model</label>
                  <input
                    type="text"
                    placeholder="Example: Click 125i"
                    value={newCompatibilityModel}
                    onChange={(e) => setNewCompatibilityModel(e.target.value)}
                    disabled={compatibilityLoading}
                  />
                </div>
                <div className="form-field">
                  <label>Year / Range</label>
                  <input
                    type="text"
                    placeholder="Example: 2020-2024"
                    value={newCompatibilityYear}
                    onChange={(e) => setNewCompatibilityYear(e.target.value)}
                    disabled={compatibilityLoading}
                  />
                </div>
                <button type="button" className="secondary" onClick={addCompatibilityModel} disabled={compatibilityLoading}>
                  + Add Model
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}