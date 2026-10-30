import { useEffect, useState } from "react";
import api from "../services/api";
import BackButton from "../components/BackButton";
import { getRole } from "../services/auth";

const emptyStore = {
  store_name: "",
  address: "",
  contact_number: ""
};

export default function StoreSettings() {
  const role = getRole();
  const [store, setStore] = useState(emptyStore);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (role !== "OWNER") {
      setLoading(false);
      return;
    }
    loadStore();
  }, [role]);

  const loadStore = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/store/profile");
      setStore({
        store_name: res.data?.store_name || "",
        address: res.data?.address || "",
        contact_number: res.data?.contact_number || ""
      });
    } catch (err) {
      console.error("Could not load store information:", err);
      setError(err.response?.data?.error || "Could not load store information.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    setStore((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const saveStore = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!store.store_name.trim()) {
      setError("Store name is required.");
      return;
    }
    try {
      setSaving(true);
      await api.put("/api/store/profile", {
        store_name: store.store_name.trim(),
        address: store.address.trim(),
        contact_number: store.contact_number.trim()
      });
      setMessage("Store information updated successfully.");
    } catch (err) {
      console.error("Could not update store information:", err);
      setError(err.response?.data?.error || "Could not update store information.");
    } finally {
      setSaving(false);
    }
  };

  if (role !== "OWNER") {
    return <div className="inventory-page"><h1>Store Settings</h1><div className="alert">Only the store owner can access store settings.</div></div>;
  }

  if (loading) {
    return <div className="inventory-page"><h1>Store Settings</h1><p className="muted">Loading store information...</p></div>;
  }

  return (
    <div className="inventory-page store-settings-page">
      <BackButton fallback="/owner/dashboard" label="Back to Owner Dashboard" />

      <div className="page-header">
        <div>
          <div className="dashboard-breadcrumb">STORE / SETTINGS</div>
          <h1>Store Settings</h1>
          <p className="muted">Update the information of your registered store.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="settings-form-layout">
        <div className="settings-info-card">
          <div className="settings-info-icon"><i className="bi bi-shop" /></div>
          <h2>Store Profile</h2>
          <p>Keep your store information accurate for system records.</p>
        </div>

        <div className="product-form-card store-settings-form-card">
          <div className="form-header">
            <div><h2>Store Information</h2><p>Only values saved in your store record are loaded here.</p></div>
          </div>
          <form onSubmit={saveStore}>
            <div className="form-grid">
              <div className="form-group form-group-full"><label>Store Name</label><input name="store_name" value={store.store_name} onChange={handleChange} placeholder="Enter store name" required /></div>
              <div className="form-group form-group-full"><label>Address</label><input name="address" value={store.address} onChange={handleChange} placeholder="Enter store address" /></div>
              <div className="form-group form-group-full"><label>Contact Number</label><input name="contact_number" value={store.contact_number} onChange={handleChange} placeholder="Enter contact number" /></div>
              <div className="product-form-buttons"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Store Information"}</button></div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
