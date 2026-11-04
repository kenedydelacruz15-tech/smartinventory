import { Link } from "react-router-dom";
import "./DarkLandingPage.css";
import "./LandingTypography.css";
import "./LandingFeaturesScale.css";
import "./MotorpartsLanding.css";

const inventoryFeatures = [
  {
    icon: "bi-box-seam",
    title: "Product inventory",
    description: "Keep products, categories, and current stock levels organized in one place.",
  },
  {
    icon: "bi-arrow-down-up",
    title: "Stock movements",
    description: "Record stock in and stock out, with reasons and timestamps for each movement.",
  },
  {
    icon: "bi-bell",
    title: "Low-stock alerts",
    description: "See products that need attention before they run out.",
  },
  {
    icon: "bi-file-earmark-bar-graph",
    title: "Reports",
    description: "Review inventory valuation and stock movement history.",
  },
];

const reasons = [
  {
    icon: "bi-search",
    title: "One inventory workspace",
    description: "Manage products and stock from a single workspace for your motorparts shop.",
  },
  {
    icon: "bi-clock-history",
    title: "Trace stock activity",
    description: "Review stock-in and stock-out activity with the date, reason, and quantity.",
  },
  {
    icon: "bi-people",
    title: "Owner and staff access",
    description: "Give your team role-based access to the inventory tools they need.",
  },
];

function MotorpartsShowcase() {
  return (
    <div className="motorparts-showcase inventory-showcase" aria-label="SmartInventory dashboard preview">
      <div className="motorparts-showcase-heading">
        <span><i className="bi bi-box-seam" /> INVENTORY OVERVIEW</span>
        <small>Dashboard preview</small>
      </div>
      <div className="inventory-preview-metrics">
        <div><span>Total products</span><strong>Product catalog</strong><small><i className="bi bi-box-seam" /> Organized by category</small></div>
        <div><span>Stock levels</span><strong>At a glance</strong><small><i className="bi bi-bar-chart-line" /> Current quantities</small></div>
        <div><span>Stock activity</span><strong>In and out</strong><small><i className="bi bi-arrow-down-up" /> Recorded movements</small></div>
      </div>
      <div className="inventory-preview-list">
        <div className="inventory-preview-list-heading"><strong>Inventory status</strong><span>Live in your workspace</span></div>
        <div><i className="bi bi-check-circle-fill" /><span>In stock</span><b>Available</b></div>
        <div><i className="bi bi-exclamation-circle-fill" /><span>Needs attention</span><b>Reorder alert</b></div>
        <div><i className="bi bi-clock-history" /><span>Recent activity</span><b>Timestamped</b></div>
      </div>
      <div className="inventory-preview-footer">
        <span><i className="bi bi-shop" /> KEN MOTORPARTS</span>
        <span>Product and stock management</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="smart-home motorparts-home">
      <header className="smart-home-header">
        <a className="smart-home-logo" href="#home">
          <img src="/ken-motorparts-logo.jpg" alt="KEN Motorparts" />
          <span>KEN MOTORPARTS<small>MOTORCYCLE PARTS &amp; ACCESSORIES</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#parts">Inventory</a>
          <a href="#about">About</a>
        </nav>
        <Link className="smart-home-login" to="/login">
          <i className="bi bi-box-arrow-in-right" /> Login
        </Link>
      </header>

      <section className="smart-home-hero motorparts-hero" id="home">
        <img
          className="smart-home-photo"
          src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=2200&q=85"
          alt=""
        />
        <div className="smart-home-hero-inner">
          <div className="smart-home-copy">
            <span className="smart-home-eyebrow">KEN MOTORPARTS · INVENTORY MANAGEMENT</span>
            <h1>Know your stock.<br />Keep your shop <span>moving.</span></h1>
            <p>
              Track products, stock levels, and daily movements with one clear
              inventory workspace built for your motorparts shop.
            </p>
            <div className="smart-home-actions">
              <a className="smart-home-secondary" href="#parts">Explore inventory features <i className="bi bi-arrow-down" /></a>
            </div>
            <div className="smart-home-highlights">
              <span><i className="bi bi-box-seam" /><b>Products</b></span>
              <span><i className="bi bi-arrow-down-up" /><b>Stock activity</b></span>
              <span><i className="bi bi-bell" /><b>Alerts</b></span>
            </div>
          </div>
          <div className="smart-home-visual">
            <MotorpartsShowcase />
          </div>
        </div>
      </section>

      <section className="smart-home-benefits motorparts-benefits">
        <p>Everything you need to keep your store inventory in view</p>
        <div>
          <span><i className="bi bi-box-seam" /> Products</span>
          <span><i className="bi bi-arrow-down-up" /> Stock In &amp; Out</span>
          <span><i className="bi bi-bell" /> Reorder Alerts</span>
          <span><i className="bi bi-file-earmark-bar-graph" /> Reports</span>
        </div>
      </section>

      <section className="smart-home-features motorparts-parts" id="parts">
        <div className="smart-home-section-heading">
          <span>INVENTORY AT A GLANCE</span>
          <h2>Your stock, all in one place</h2>
          <p>Tools to help your team manage products, stock activity, and replenishment.</p>
        </div>
        <div className="smart-home-feature-grid">
          {inventoryFeatures.map((feature) => (
            <article className="smart-home-feature" key={feature.title}>
              <i className={`bi ${feature.icon}`} />
              <div><h3>{feature.title}</h3><p>{feature.description}</p></div>
            </article>
          ))}
        </div>
        <p className="motorparts-availability-note">Inventory updates are recorded by your team in the SmartInventory workspace.</p>
      </section>

      <section className="smart-home-steps motorparts-about" id="about">
        <div className="smart-home-section-heading">
          <span>ABOUT SMARTINVENTORY</span>
          <h2>Built around your store's daily stock work</h2>
          <p>
            Keep your product catalog, stock levels, and movement history organized
            as your team serves customers and replenishes stock.
          </p>
        </div>
        <div className="smart-home-step-grid">
          {reasons.map((reason) => (
            <article key={reason.title}>
              <i className={`bi ${reason.icon}`} />
              <h3>{reason.title}</h3>
              <p>{reason.description}</p>
            </article>
          ))}
        </div>
        <div className="smart-home-cta inventory-home-cta">
          <div>
            <span>KEN MOTORPARTS INVENTORY</span>
            <h2>A clearer view of your inventory.</h2>
            <p>Products, stock status, and activity in one workspace.</p>
          </div>
        </div>
      </section>

      <footer className="smart-home-footer">
        <a className="smart-home-logo" href="#home">
          <img src="/ken-motorparts-logo.jpg" alt="KEN Motorparts" />
          <span>KEN MOTORPARTS<small>MOTORCYCLE PARTS &amp; ACCESSORIES</small></span>
        </a>
        <nav aria-label="Footer navigation">
          <a href="#parts">Inventory</a>
          <a href="#about">About</a>
        </nav>
        <small>© {new Date().getFullYear()} KEN Motorparts. All rights reserved.</small>
      </footer>
    </main>
  );
}
