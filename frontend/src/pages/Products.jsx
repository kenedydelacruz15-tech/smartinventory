import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../services/api";

const PRODUCT_QR_PREFIX = "SMARTINVENTORY:PRODUCT:";
const QR_LABELS_PER_PAGE = 12;

const emptyForm = {
  product_name: "",
  sku: "",
  part_number: "",
  product_type: "",
  brand: "",
  barcode: "",
  category_id: "",
  selling_price: "",
  reorder_level: "",
  description: "",
  image_url: "",
};

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return "";

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }

  const baseURL = api.defaults.baseURL.replace(/\/$/, "");
  return `${baseURL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

const isProductFieldInvalid = (field, value) => {
  if (field === "product_name" || field === "sku") {
    return !String(value || "").trim();
  }

  if (field === "category_id") {
    return !value;
  }

  if (field === "selling_price") {
    const price = Number(value);
    return (
      value === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      Math.abs(price * 100 - Math.round(price * 100)) > 1e-8
    );
  }

  if (field === "reorder_level") {
    const reorderLevel = Number(value);
    return (
      value === "" ||
      !Number.isFinite(reorderLevel) ||
      reorderLevel < 0 ||
      !Number.isInteger(reorderLevel)
    );
  }

  return false;
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [qrPdfLoading, setQrPdfLoading] = useState(false);
  const [lastCreatedProduct, setLastCreatedProduct] = useState(null);
  const [lookupResult, setLookupResult] = useState(null);
  const [duplicateProduct, setDuplicateProduct] = useState(null);
  const [duplicateOverride, setDuplicateOverride] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

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
    setValidationErrors((prev) => (
      Object.prototype.hasOwnProperty.call(prev, name)
        ? { ...prev, [name]: isProductFieldInvalid(name, value) }
        : prev
    ));

    setError("");
    setSuccess("");
  };

  // Reset Form

  const resetForm = () => {
    setImageFile(null);
    setImagePreview("");
    setForm({ ...emptyForm });
    setValidationErrors({});
    setEditingId(null);
    setFormOpen(false);
    setError("");
    setSuccess("");
    setLookupResult(null);
    setDuplicateProduct(null);
    setDuplicateOverride(false);
    setPreviewImage(null);
  };

  const closeProductForm = async () => {
    if (loading || barcodeLoading) return;
    if (scannerRef.current) await stopScanner();
    resetForm();
  };

  // Search

  const handleSearch = async () => {
    await loadProducts();
  };



const handleBarcodeLookup = async (barcodeValue = null) => {
  const barcode = String(
    barcodeValue ?? form.barcode ?? ""
  ).trim();

  if (!barcode) {
    setError("Please enter or scan a barcode first.");
    return;
  }

  try {
    setBarcodeLoading(true);
    setError("");
    setSuccess("");
    setLookupResult(null);
    setDuplicateProduct(null);
    setDuplicateOverride(false);

    // Search local MySQL database
    const res = await api.get(
      `/api/products/barcode/${encodeURIComponent(barcode)}`
    );

    const product = res.data.product;

    if (!res.data.found || !product) {
      setError("Product not found in your local database.");
      return;
    }

    setLookupResult({
      ...product,
      found: true,
      ean: product.barcode,
      image: product.image_url,
      images: product.image_url ? [product.image_url] : [],
      specifications: {}
    });

    setDuplicateProduct(product);

    setForm((prev) => ({
      ...prev,
      product_name: product.product_name || "",
      sku: product.sku || "",
      part_number: product.part_number || "",
      brand: product.brand || "",
      product_type: product.product_type || "",
      barcode: product.barcode || barcode,
      category_id: String(product.category_id || ""),
      selling_price: product.selling_price ?? "",
      reorder_level: product.reorder_level ?? "",
      description: product.description || "",
      image_url: product.image_url || ""
    }));

    setSuccess("Product found in your local database.");

  } catch (err) {
    console.error("Local barcode lookup error:", err);

    setError(
      err.response?.status === 404
        ? "Product not found in your local database."
        : err.response?.data?.error ||
          "Failed to search local products."
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

            // Stop camera
            await stopScanner();

            if (decodedText.startsWith(PRODUCT_QR_PREFIX)) {
              const productId = Number(
                decodedText.slice(PRODUCT_QR_PREFIX.length)
              );
              if (!Number.isInteger(productId) || productId <= 0) {
                setError("This SmartInventory QR code is invalid.");
                return;
              }

              try {
                const res = await api.get(`/api/products/${productId}`);
                handleEdit(res.data);
                setSuccess(`Product QR found: ${res.data.product_name}.`);
              } catch (err) {
                setError(
                  err.response?.data?.error ||
                    "This QR code does not match a product in your store."
                );
              }
              return;
            }

            // Put scanned barcode into the form
            setForm((prev) => ({
              ...prev,
              barcode: decodedText,
            }));

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

    const nextValidationErrors = {
      product_name: isProductFieldInvalid("product_name", form.product_name),
      sku: isProductFieldInvalid("sku", form.sku),
      category_id: isProductFieldInvalid("category_id", form.category_id),
      selling_price: isProductFieldInvalid("selling_price", form.selling_price),
      reorder_level: isProductFieldInvalid("reorder_level", form.reorder_level),
    };

    setValidationErrors(nextValidationErrors);

    if (Object.values(nextValidationErrors).some(Boolean)) {
      setError("Please complete the highlighted required fields.");
      return;
    }

    setValidationErrors({});

    if (editingId === null && duplicateProduct && !duplicateOverride) {
      setError("This barcode already belongs to an existing product. Choose an option in the duplicate warning before saving.");
      return;
    }

    try {
      setLoading(true);
      setLastCreatedProduct(null);

      let uploadedImageUrl = form.image_url || null;

      // Upload selected image to the local backend
      if (imageFile) {
        const imageData = new FormData();
        imageData.append("image", imageFile);

        const imageResponse = await api.post(
          "/api/products/upload-image",
          imageData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        uploadedImageUrl = imageResponse.data.image_url;
      }

      const productData = {
        product_name: form.product_name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || null,
        part_number: form.part_number.trim() || null,
        product_type: form.product_type.trim() || null,
        brand: form.brand.trim() || null,
        category_id: Number(form.category_id),
        selling_price: Number(form.selling_price),
        reorder_level: Number(form.reorder_level),
        description: form.description.trim() || null,
        image_url: uploadedImageUrl,
      };

      if (editingId !== null) {
        await api.put(
          `/api/products/${editingId}`,
          productData
        );

        setSuccess("Product updated successfully.");
      } else {
        const res = await api.post(
          "/api/products/",
          productData
        );

        setLastCreatedProduct({
          ...productData,
          product_id: res.data.product_id,
        });

        setSuccess("Product added successfully.");
      }

      if (scannerRef.current) await stopScanner();

      setForm({ ...emptyForm });
      setImageFile(null);
      setImagePreview("");
      setValidationErrors({});
      setEditingId(null);
      setFormOpen(false);

      await loadProducts();

    } catch (err) {
      console.error("Save product error:", err);

      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to save product."
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadQrPdf = async (productsToPrint, filename) => {
    if (!productsToPrint.length) {
      setError("There are no products to include in a QR label PDF.");
      return;
    }

    try {
      setQrPdfLoading(true);
      setError("");

      const [{ default: QRCode }, { jsPDF }] = await Promise.all([
        import("qrcode"),
        import("jspdf"),
      ]);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const columns = 3;
      const rows = 4;
      const margin = 8;
      const gap = 3;
      const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
      const cellHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;
      const qrSize = 35;

      for (let index = 0; index < productsToPrint.length; index += 1) {
        if (index > 0 && index % QR_LABELS_PER_PAGE === 0) {
          pdf.addPage();
        }

        const product = productsToPrint[index];
        const position = index % QR_LABELS_PER_PAGE;
        const column = position % columns;
        const row = Math.floor(position / columns);
        const x = margin + column * (cellWidth + gap);
        const y = margin + row * (cellHeight + gap);
        const productQr = await QRCode.toDataURL(
          `${PRODUCT_QR_PREFIX}${product.product_id}`,
          {
            errorCorrectionLevel: "M",
            margin: 2,
            width: 192,
            color: { dark: "#000000", light: "#ffffff" },
          }
        );

        pdf.setDrawColor(190);
        pdf.roundedRect(x, y, cellWidth, cellHeight, 2, 2);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        const productName = pdf
          .splitTextToSize(product.product_name || "Unnamed product", cellWidth - 8)
          .slice(0, 2);
        pdf.text(productName, x + 4, y + 6);
        pdf.addImage(
          productQr,
          "PNG",
          x + (cellWidth - qrSize) / 2,
          y + 14,
          qrSize,
          qrSize
        );
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(`SKU: ${product.sku || "-"}`, x + 4, y + 54);
        pdf.text(
          `Product ID: ${product.product_id}`,
          x + 4,
          y + 59
        );
        if (product.barcode) {
          pdf.text(
            `Barcode: ${product.barcode}`,
            x + 4,
            y + 64
          );
        }
      }

      pdf.save(filename);
      setLastCreatedProduct(null);
      setSuccess(`QR label PDF downloaded for ${productsToPrint.length} product${productsToPrint.length === 1 ? "" : "s"}.`);
    } catch (err) {
      console.error("QR label PDF generation error:", err);
      setError("Could not generate the QR label PDF. Please try again.");
    } finally {
      setQrPdfLoading(false);
    }
  };

  // Edit Product

  const handleEdit = (product) => {
    setEditingId(product.product_id);
    setFormOpen(true);
    setValidationErrors({});

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
          : "",

      description:
        product.description || "",

      image_url:
        product.image_url || "",
    });

    setImageFile(null);
    setImagePreview("");

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
        <button
          type="button"
          className="primary"
          onClick={() => {
            resetForm();
            setFormOpen(true);
          }}
        >
          <i className="bi bi-plus-lg" /> Add Product
        </button>
      </div>

      {/* =====================================================
          ALERTS
      ===================================================== */}

      {error && !formOpen && (
        <div className="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          {success}
          {lastCreatedProduct && (
            <button
              type="button"
              className="action-button"
              onClick={() =>
                downloadQrPdf(
                  [lastCreatedProduct],
                  `smartinventory-product-${lastCreatedProduct.product_id}-qr-label.pdf`
                )
              }
              disabled={qrPdfLoading}
              style={{ marginLeft: 12 }}
            >
              {qrPdfLoading ? "Preparing QR PDF..." : "Download QR label PDF"}
            </button>
          )}
        </div>
      )}

      {/* =====================================================
          PRODUCT FORM
      ===================================================== */}

      {formOpen && (
        <div
          className="inventory-modal-overlay product-form-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProductForm();
          }}
        >
        <div className="product-form-dialog" role="dialog" aria-modal="true" aria-labelledby="product-form-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="product-form-card">

        <div className="form-header">
          <div>
            <h2 id="product-form-title">
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
            <p className="product-required-note"><span className="required-mark">*</span> Required fields</p>
          </div>
          <button type="button" className="product-form-close" onClick={closeProductForm} aria-label="Close product form" disabled={loading || barcodeLoading}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

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
                    reorder_level: existing.reorder_level ?? "",
                    description: existing.description || "",
                  }));
                  setEditingId(existing.product_id);
                  setValidationErrors({});
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
                      src={getImageUrl(previewImage)}
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
              
            </button>

            <img
              src={getImageUrl(previewImage)}
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
          noValidate
          className="product-form"
        >

          {/* PRODUCT NAME */}

          <div className={`form-field ${validationErrors.product_name ? "form-field-invalid" : ""}`}>
            <label htmlFor="product-name">Product Name <span className="required-mark">*</span></label>

            <input
              id="product-name"
              type="text"
              name="product_name"
              placeholder="Enter product name"
              value={form.product_name}
              onChange={handleChange}
              autoFocus
              disabled={
                loading ||
                barcodeLoading
              }
              required
              aria-invalid={Boolean(validationErrors.product_name)}
            />
            {validationErrors.product_name && <small className="field-validation-message">Product name is required.</small>}
          </div>

          {/* SKU */}

          <div className={`form-field ${validationErrors.sku ? "form-field-invalid" : ""}`}>
            <label htmlFor="product-sku">SKU <span className="required-mark">*</span></label>

            <input
              id="product-sku"
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
              aria-invalid={Boolean(validationErrors.sku)}
            />
            {validationErrors.sku && <small className="field-validation-message">SKU is required.</small>}
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

          <div className={`form-field ${validationErrors.category_id ? "form-field-invalid" : ""}`}>
            <label htmlFor="product-category">Category <span className="required-mark">*</span></label>

            <select
              id="product-category"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              disabled={loading}
              required
              aria-invalid={Boolean(validationErrors.category_id)}
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
            {validationErrors.category_id && <small className="field-validation-message">Please select a category.</small>}
          </div>

          {/* SELLING PRICE */}

          <div className={`form-field ${validationErrors.selling_price ? "form-field-invalid" : ""}`}>
            <label htmlFor="product-selling-price">Selling Price <span className="required-mark">*</span></label>

            <input
              id="product-selling-price"
              type="number"
              name="selling_price"
              placeholder="0.00"
              value={form.selling_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              disabled={loading}
              required
              aria-invalid={Boolean(validationErrors.selling_price)}
            />
            {validationErrors.selling_price && <small className="field-validation-message">Enter a valid price of 0 or more, with up to 2 decimal places.</small>}
          </div>

          {/* REORDER LEVEL */}

          <div className={`form-field ${validationErrors.reorder_level ? "form-field-invalid" : ""}`}>
            <label htmlFor="product-reorder-level">Minimum Stock Level (Units) <span className="required-mark">*</span></label>

            <input
              id="product-reorder-level"
              type="number"
              name="reorder_level"
              placeholder="Enter minimum stock units"
              value={form.reorder_level}
              onChange={handleChange}
              min="0"
              step="1"
              disabled={loading}
              required
              aria-invalid={Boolean(validationErrors.reorder_level)}
            />
            {validationErrors.reorder_level && <small className="field-validation-message">Enter a whole number of 0 or more.</small>}
            <small className="field-help">Minimum quantity to keep available before the inventory status becomes Needs Attention.</small>
          </div>

          {/* DESCRIPTION */}

          {/* PRODUCT IMAGE */}

          <div className="form-field full-width">
            <label htmlFor="product-image">Product Image</label>

            <input
              id="product-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={loading || barcodeLoading}
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                if (file.size > 5 * 1024 * 1024) {
                  setError("Image must not exceed 5 MB.");
                  e.target.value = "";
                  return;
                }

                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
                setError("");
              }}
            />

            {(imagePreview || form.image_url) && (
              <div style={{ marginTop: "12px" }}>
                <img
                  src={imagePreview || form.image_url}
                  alt="Product preview"
                  style={{
                    width: "140px",
                    height: "140px",
                    objectFit: "contain",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "5px",
                    background: "#fff"
                  }}
                />

                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                    setForm((prev) => ({
                      ...prev,
                      image_url: ""
                    }));
                  }}
                  style={{ display: "block", marginTop: "8px" }}
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>

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
                ? "Save Changes"
                : "Save"}
            </button>

            <button
              type="button"
              className="secondary cancel-button"
              onClick={closeProductForm}
              disabled={loading || barcodeLoading}
            >
              Cancel
            </button>

          </div>

        </form>
      </div>
        </div>
        </div>
      )}

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

        <button
          type="button"
          className="primary"
          onClick={() =>
            downloadQrPdf(products, "smartinventory-product-qr-labels.pdf")
          }
          disabled={qrPdfLoading || loadingProducts || products.length === 0}
          title="Download printable QR labels for products currently shown in this list"
        >
          {qrPdfLoading
            ? "Preparing QR PDF..."
            : `Download QR Labels PDF (${products.length})`}
        </button>

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
                <th>Min. Stock</th>
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
                              src={getImageUrl(product.image_url)}
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

                        <button
                          type="button"
                          className="action-button"
                          onClick={() =>
                            downloadQrPdf(
                              [product],
                              `smartinventory-product-${product.product_id}-qr-label.pdf`
                            )
                          }
                          disabled={qrPdfLoading}
                          title={`Download QR label for ${product.product_name}`}
                        >
                          <i className="bi bi-qr-code" aria-hidden="true" />
                          QR PDF
                        </button>

                        {/* Activate/deactivate actions are managed in Inventory. */}

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>
        )}
      </div>
    </div>

    
  );
}