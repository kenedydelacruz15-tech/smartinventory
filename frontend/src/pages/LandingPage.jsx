import { Link } from "react-router-dom";
import "./DarkLandingPage.css";
import "./LandingTypography.css";
import "./LandingFeaturesScale.css";

const features = [
  { icon: "bi-box-seam", title: "Inventory Tracking", description: "Keep track of your products in real time and never run out of stock." },
  { icon: "bi-graph-up-arrow", title: "Stock Monitoring", description: "Get notified when stock is low and avoid costly shortages." },
  { icon: "bi-bar-chart-line", title: "Reports & Analytics", description: "Make better decisions with detailed reports and insights." },
];

const chartBars = [34, 48, 42, 66, 55, 82, 72, 96, 75, 88, 64, 100];

function DashboardPreview() {
  return (
    <div className="smart-home-preview" aria-label="Preview of the owner inventory dashboard">
      <aside className="smart-preview-sidebar">
        <div className="smart-preview-brand"><i className="bi bi-boxes" /> SmartInventory</div>
        <div className="smart-preview-nav active"><i className="bi bi-speedometer2" /> Dashboard</div>
        <div className="smart-preview-nav"><i className="bi bi-bag" /> Products</div>
        <div className="smart-preview-nav"><i className="bi bi-grid" /> Categories</div>
        <div className="smart-preview-nav"><i className="bi bi-gear" /> Settings</div>
      </aside>
      <div className="smart-preview-main">
        <div className="smart-preview-top"><div><span className="smart-window-dots"><i /><i /><i /></span><strong>Dashboard</strong></div><span><i className="bi bi-person-circle" /> Store Owner</span></div>
        <div className="smart-preview-metrics">
          <div><span><i className="bi bi-box-seam" /> Total Products</span><strong>248</strong></div>
          <div><span><i className="bi bi-exclamation-circle" /> Low Stock</span><strong>12</strong></div>
          <div><span><i className="bi bi-currency-dollar" /> Total Value</span><strong>₱24.8k</strong></div>
        </div>
        <div className="smart-preview-panels">
          <section className="smart-preview-chart"><div className="smart-preview-panel-title"><strong><i className="bi bi-bar-chart-fill" /> Stock Overview</strong><small>This year</small></div><div className="smart-chart-bars">{chartBars.slice(0, 8).map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div><div className="smart-chart-months"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span></div></section>
          <section className="smart-preview-status"><div className="smart-preview-panel-title"><strong><i className="bi bi-clock-history" /> Recent Activity</strong><small>Today</small></div><div><i className="bi bi-plus-circle" /><span><b>New item added</b><small>Engine oil · 2 min ago</small></span></div><div><i className="bi bi-arrow-left-right" /><span><b>Stock adjusted</b><small>Brake pads · 15 min ago</small></span></div><div><i className="bi bi-check-circle" /><span><b>Inventory checked</b><small>12 products · 1 hr ago</small></span></div></section>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="smart-home">
      <header className="smart-home-header">
        <a className="smart-home-logo" href="#home"><span><i className="bi bi-box-seam-fill" /></span><span>Smart<span>Inventory</span><small>FORECASTING & ANALYTICS SYSTEM</small></span></a>
        <nav aria-label="Main navigation"><a href="#home">Home</a><a href="#features">Features</a><a href="#benefits">About</a></nav>
        <Link className="smart-home-login" to="/login"><i className="bi bi-person" /> Login</Link>
      </header>
      <section className="smart-home-hero" id="home">
        <img className="smart-home-photo" src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=2200&q=85" alt="Motorcycle ready for the road" />
        <div className="smart-home-hero-inner">
          <div className="smart-home-copy">
            <span className="smart-home-eyebrow">SMART INVENTORY MANAGEMENT</span>
            <h1>Manage Your Inventory<br /><span>Smarter</span>, Not Harder</h1>
            <p>SmartInventory helps you track, manage, and monitor your stock in real time. Say goodbye to manual tracking and hello to a more efficient way of doing business.</p>
            <div className="smart-home-actions"><Link className="smart-home-primary" to="/login">Get Started <i className="bi bi-arrow-right" /></Link></div>
            <div className="smart-home-highlights"><span><i className="bi bi-check-circle" /><b>Easy to Use</b></span><span><i className="bi bi-check-circle" /><b>Secure</b></span><span><i className="bi bi-check-circle" /><b>Accessible Anytime</b></span></div>
          </div>
          <div className="smart-home-visual"><DashboardPreview /></div>
        </div>
      </section>
      <section className="smart-home-benefits" id="benefits"><p>Trusted by motorcycle parts shops and businesses</p><div><span><i className="bi bi-graph-up-arrow" /> Increase Efficiency</span><span><i className="bi bi-shield-check" /> Reduce Stockouts</span><span><i className="bi bi-pie-chart" /> Data-Driven Decisions</span><span><i className="bi bi-rocket-takeoff" /> Grow Your Business</span></div></section>
      <section className="smart-home-features" id="features">
        <div className="smart-home-section-heading"><span>OUR FEATURES</span><h2>Everything You Need</h2><p>Powerful features designed to make inventory management simple and efficient.</p></div>
        <div className="smart-home-feature-grid">{features.map((feature) => <article className="smart-home-feature" key={feature.title}><i className={`bi ${feature.icon}`} /><div><h3>{feature.title}</h3><p>{feature.description}</p></div></article>)}</div>
      </section>
      <section className="smart-home-steps" id="how-it-works">
        <div className="smart-home-section-heading"><span>HOW IT WORKS</span><h2>Get Started in 3 Simple Steps</h2><p>Setting up your inventory system is quick and easy.</p></div>
        <div className="smart-home-step-grid"><article><span>01</span><i className="bi bi-person" /><h3>Create Your Account</h3><p>Sign up and set up your business information.</p></article><i className="bi bi-arrow-right" /><article><span>02</span><i className="bi bi-box-seam" /><h3>Add Your Products</h3><p>Input your items, categories, and suppliers.</p></article><i className="bi bi-arrow-right" /><article><span>03</span><i className="bi bi-bar-chart-line" /><h3>Start Managing</h3><p>Track your stock, view reports, and grow your business.</p></article></div>
        <div className="smart-home-cta" id="contact"><div><span>READY TO GET STARTED?</span><h2>Ready to take control of your inventory?</h2><p>Join SmartInventory today and make your business more efficient.</p></div><Link to="/login">Get Started <i className="bi bi-arrow-right" /></Link></div>
      </section>
      <footer className="smart-home-footer">
        <a className="smart-home-logo" href="#home"><span><i className="bi bi-box-seam-fill" /></span><span>Smart<span>Inventory</span><small>FORECASTING & ANALYTICS SYSTEM</small></span></a>
        <nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#benefits">Benefits</a><a href="#how-it-works">How It Works</a><a href="#contact">Contact</a></nav>
        <small>© {new Date().getFullYear()} SmartInventory. All rights reserved.</small>
      </footer>
    </main>
  );
}