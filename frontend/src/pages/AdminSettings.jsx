import BackButton from "../components/BackButton";

export default function AdminSettings() {
  return (
    <div className="admin-page">
      <BackButton fallback="/admin/dashboard" label="Back to Admin Dashboard" />
      <div className="page-header compact-header">
        <div>
          <h1>System Settings</h1>
          <p className="muted">System-level information and configuration.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-icon purple"><i className="bi bi-shield-check" /></div>
          <div><h3>Security</h3><p>Authentication and role-based access are enabled.</p></div>
          <span className="status-badge status-active">Active</span>
        </div>
        <div className="settings-card">
          <div className="settings-icon blue"><i className="bi bi-database-check" /></div>
          <div><h3>Database</h3><p>Connected through the existing inventory backend.</p></div>
          <span className="status-badge status-active">Connected</span>
        </div>
        <div className="settings-card">
          <div className="settings-icon green"><i className="bi bi-graph-up-arrow" /></div>
          <div><h3>Analytics</h3><p>Forecasting and inventory analytics are available to store roles.</p></div>
          <span className="status-badge status-active">Enabled</span>
        </div>
        <div className="settings-card">
          <div className="settings-icon amber"><i className="bi bi-bell" /></div>
          <div><h3>Inventory Alerts</h3><p>Low, critical, and stock-out risks can be surfaced to users.</p></div>
          <span className="status-badge status-warning">Monitoring</span>
        </div>
      </div>
    </div>
  );
}
