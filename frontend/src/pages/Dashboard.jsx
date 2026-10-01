import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">Manage your inventory and store operations.</p>
      <div className="dashboard-grid">
        <Link className="module-card" to="/inventory">
          <strong>Inventory</strong>
          <span>View and manage current stock.</span>
        </Link>
      </div>
    </div>
  );
}
