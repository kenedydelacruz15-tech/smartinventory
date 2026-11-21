
import { useEffect, useState } from "react";
import api from "../services/api";
import BackButton from "../components/BackButton";

export default function AdminSettings() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadBackups = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/backup/admin/database");
      setBackups(response.data.backups || []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Unable to load database backups."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const createBackup = async () => {
    setCreating(true);
    setMessage("");
    setError("");

    try {
      const response = await api.post("/backup/admin/database");

      setMessage(
        `Backup created: ${response.data.backup.filename}`
      );

      await loadBackups();
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Database backup failed."
      );
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (filename) => {
    setError("");

    try {
      const response = await api.get(
        `/backup/admin/database/${encodeURIComponent(filename)}/download`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download this backup.");
    }
  };

  const restoreBackup = async (filename) => {
    const confirmed = window.confirm(
      `WARNING: Restoring ${filename} will replace the current database contents. A fresh pre-restore backup will be created first. Continue?`
    );

    if (!confirmed) return;

    const confirmation = window.prompt(
      'Type RESTORE DATABASE to confirm this operation:'
    );

    if (confirmation !== "RESTORE DATABASE") {
      setMessage("Restore cancelled.");
      return;
    }

    setRestoring(filename);
    setMessage("");
    setError("");

    try {
      const response = await api.post(
        `/backup/admin/database/${encodeURIComponent(filename)}/restore`,
        { confirmation }
      );

      setMessage(
        `${response.data.message} Pre-restore backup: ${response.data.pre_restore_backup}`
      );

      await loadBackups();
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Database restoration failed."
      );
    } finally {
      setRestoring(null);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="admin-page">
      <BackButton
        fallback="/admin/dashboard"
        label="Back to Admin Dashboard"
      />

      <div className="page-header compact-header">
        <div>
          <h1>System Settings</h1>
          <p className="muted">
            System configuration and database management.
          </p>
        </div>
      </div>

      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-icon purple">
            <i className="bi bi-shield-check" />
          </div>
          <div>
            <h3>Security</h3>
            <p>Authentication and role-based access are enabled.</p>
          </div>
          <span className="status-badge status-active">Active</span>
        </div>

        <div className="settings-card">
          <div className="settings-icon blue">
            <i className="bi bi-database-check" />
          </div>
          <div>
            <h3>Database</h3>
            <p>Connected through the existing inventory backend.</p>
          </div>
          <span className="status-badge status-active">Connected</span>
        </div>

        <div className="settings-card">
          <div className="settings-icon green">
            <i className="bi bi-graph-up-arrow" />
          </div>
          <div>
            <h3>Analytics</h3>
            <p>Forecasting and inventory analytics are available to store roles.</p>
          </div>
          <span className="status-badge status-active">Enabled</span>
        </div>

        <div className="settings-card">
          <div className="settings-icon amber">
            <i className="bi bi-bell" />
          </div>
          <div>
            <h3>Inventory Alerts</h3>
            <p>Low, critical, and stock-out risks can be surfaced to users.</p>
          </div>
          <span className="status-badge status-warning">Monitoring</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div>
            <h2>Database Backup & Restore</h2>
            <p className="muted">
              Create, download, and manage complete SQL database backups.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={createBackup}
            disabled={creating}
          >
            <i className="bi bi-database-add me-2" />
            {creating ? "Creating Backup..." : "Create Backup"}
          </button>
        </div>

        <div className="alert alert-warning">
          <strong>Important:</strong> Restoring a backup replaces
          current database contents. Always verify the selected
          backup before proceeding.
        </div>

        <div className="card shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>
              <i className="bi bi-clock-history me-2" />
              Backup History
            </strong>

            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={loadBackups}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise me-1" />
              Refresh
            </button>
          </div>

          <div className="card-body">
            {loading ? (
              <p className="text-muted">Loading backups...</p>
            ) : backups.length === 0 ? (
              <p className="text-muted">
                No database backups found.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Backup File</th>
                      <th>Date Created</th>
                      <th>Size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.filename}>
                        <td>
                          <i className="bi bi-file-earmark-code me-2" />
                          {backup.filename}
                        </td>

                        <td>
                          {new Date(
                            backup.created_at
                          ).toLocaleString()}
                        </td>

                        <td>{formatSize(backup.size)}</td>

                        <td>
                          <div className="d-flex gap-2 flex-wrap">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() =>
                                downloadBackup(backup.filename)
                              }
                            >
                              <i className="bi bi-download me-1" />
                              Download
                            </button>

                            <button
                              className="btn btn-outline-secondary btn-sm"
                              disabled
                              title="Restore is temporarily disabled for safety"
                            >
                              <i className="bi bi-lock me-1" />
                              Restore Disabled
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
