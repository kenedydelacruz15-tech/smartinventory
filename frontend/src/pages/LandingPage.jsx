import { Link } from "react-router-dom";
import "./DarkLandingPage.css";
import "./LandingTypography.css";
import "./LandingFeaturesScale.css";
import "./MotorpartsLanding.css";

const parts = [
  {
    icon: "bi-gear-wide-connected",
    title: "Engine & Tune-up",
    description: "Parts for routine servicing, repairs, and engine maintenance.",
  },
  {
    icon: "bi-disc",
    title: "Brakes & Suspension",
    description: "Explore components that help keep your motorcycle controlled and road-ready.",
  },
  {
    icon: "bi-lightning-charge",
    title: "Electrical & Lighting",
    description: "Find electrical and lighting parts for common replacement needs.",
  },
  {
    icon: "bi-wrench-adjustable",
    title: "Drive & Maintenance",
    description: "Everyday parts and essentials for upkeep and repairs.",
  },
];

const reasons = [
  {
    icon: "bi-search",
    title: "Find the right part",
    description: "Start with the part category, then check fitment for your motorcycle.",
  },
  {
    icon: "bi-tools",
    title: "For repairs and upkeep",
    description: "Parts for the regular maintenance and repair work that keeps a bike moving.",
  },
  {
    icon: "bi-shop",
    title: "A local motorparts shop",
    description: "KEN Motorparts is focused on motorcycle parts and the riders who need them.",
  },
];

function MotorpartsShowcase() {
  return (
    <div className="motorparts-showcase" aria-label="Motorcycle parts at KEN Motorparts">
      <div className="motorparts-showcase-heading">
        <span><i className="bi bi-shop" /> KEN MOTORPARTS</span>
        <i className="bi bi-three-dots" aria-hidden="true" />
      </div>
      <div className="motorparts-showcase-main">
        <div className="motorparts-showcase-icon">
          <i className="bi bi-gear-wide-connected" />
        </div>
        <span className="motorparts-showcase-kicker">PARTS FOR EVERYDAY RIDES</span>
        <h2>Keep your motorcycle moving.</h2>
        <p>Explore parts for maintenance, repairs, and your next upgrade.</p>
      </div>
      <div className="motorparts-showcase-tags">
        <span><i className="bi bi-gear" /> Engine</span>
        <span><i className="bi bi-disc" /> Brakes</span>
        <span><i className="bi bi-lightning" /> Electrical</span>
        <span><i className="bi bi-wrench" /> Maintenance</span>
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
          <a href="#parts">Parts</a>
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
            <span className="smart-home-eyebrow">KEN MOTORPARTS · MOTORCYCLE PARTS</span>
            <h1>Find the parts<br />to keep you <span>moving.</span></h1>
            <p>
              From routine maintenance to your next repair, KEN Motorparts is
              your neighborhood shop for motorcycle parts and essentials.
            </p>
            <div className="smart-home-actions">
              <Link className="smart-home-primary" to="/login">
                Login <i className="bi bi-arrow-right" />
              </Link>
              <a className="smart-home-secondary" href="#about">About KEN Motorparts</a>
            </div>
            <div className="smart-home-highlights">
              <span><i className="bi bi-gear" /><b>Maintenance</b></span>
              <span><i className="bi bi-tools" /><b>Repairs</b></span>
              <span><i className="bi bi-lightning" /><b>Upgrades</b></span>
            </div>
          </div>
          <div className="smart-home-visual">
            <MotorpartsShowcase />
          </div>
        </div>
      </section>

      <section className="smart-home-benefits motorparts-benefits">
        <p>Motorcycle parts and essentials for the road ahead</p>
        <div>
          <span><i className="bi bi-gear-wide-connected" /> Engine Parts</span>
          <span><i className="bi bi-disc" /> Brakes &amp; Suspension</span>
          <span><i className="bi bi-lightning-charge" /> Electrical</span>
          <span><i className="bi bi-wrench-adjustable" /> Maintenance</span>
        </div>
      </section>

      <section className="smart-home-features motorparts-parts" id="parts">
        <div className="smart-home-section-heading">
          <span>WHAT YOU'RE LOOKING FOR</span>
          <h2>Parts for your bike, all in one place</h2>
          <p>Explore common motorcycle part categories for servicing, repairs, and upgrades.</p>
        </div>
        <div className="smart-home-feature-grid">
          {parts.map((part) => (
            <article className="smart-home-feature" key={part.title}>
              <i className={`bi ${part.icon}`} />
              <div><h3>{part.title}</h3><p>{part.description}</p></div>
            </article>
          ))}
        </div>
        <p className="motorparts-availability-note">
          Product availability and motorcycle fitment may vary. Ask the shop about a specific part.
        </p>
      </section>

      <section className="smart-home-steps motorparts-about" id="about">
        <div className="smart-home-section-heading">
          <span>ABOUT KEN MOTORPARTS</span>
          <h2>A motorparts shop built around your ride</h2>
          <p>
            Whether you are keeping up with maintenance, fixing a worn part, or
            planning an upgrade, start with the parts your motorcycle needs.
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
        <div className="smart-home-cta">
          <div>
            <span>KEN MOTORPARTS INVENTORY</span>
            <h2>Manage your motorparts inventory.</h2>
            <p>Sign in to access the inventory workspace.</p>
          </div>
          <Link to="/login">Login <i className="bi bi-arrow-right" /></Link>
        </div>
      </section>

      <footer className="smart-home-footer">
        <a className="smart-home-logo" href="#home">
          <img src="/ken-motorparts-logo.jpg" alt="KEN Motorparts" />
          <span>KEN MOTORPARTS<small>MOTORCYCLE PARTS &amp; ACCESSORIES</small></span>
        </a>
        <nav aria-label="Footer navigation">
          <a href="#parts">Parts</a>
          <a href="#about">About</a>
          <Link to="/login">Login</Link>
        </nav>
        <small>© {new Date().getFullYear()} KEN Motorparts. All rights reserved.</small>
      </footer>
    </main>
  );
}
