import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      const response = await api.get("/api/notifications");
      setNotifications(response.data?.notifications || []);
      setError("");
    } catch (requestError) {
      console.error("Notifications load error:", requestError);
      setError(requestError.response?.data?.error || "Unable to load notifications.");
    }
  };

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="notifications-menu">
      <button
        type="button"
        className="notifications-trigger"
        aria-label={`Notifications: ${notifications.length} active`}
        aria-expanded={open}
        onClick={() => {
          setOpen((isOpen) => !isOpen);
          if (!open) loadNotifications();
        }}
      >
        <i className="bi bi-bell" />
        {notifications.length > 0 && <span className="notifications-count">{notifications.length > 99 ? "99+" : notifications.length}</span>}
      </button>
      {open && (
        <section className="notifications-popover" aria-label="Inventory notifications">
          <header><strong>Inventory notifications</strong><button type="button" onClick={loadNotifications}>Refresh</button></header>
          {error ? <p className="notifications-error" role="alert">{error}</p> : notifications.length === 0 ? (
            <p className="notifications-empty">No active inventory notifications.</p>
          ) : (
            <ul>
              {notifications.slice(0, 30).map((notification) => (
                <li key={notification.id} className={`notification-item ${notification.severity}`}>
                  <i className={`bi ${notification.severity === "critical" ? "bi-exclamation-octagon" : "bi-exclamation-triangle"}`} />
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    {notification.reorder_recommended && <small>Reorder suggestion: {Number(notification.recommended_quantity || 0).toLocaleString()} units</small>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {notifications.length > 30 && <p className="notifications-footnote">Showing 30 of {notifications.length} active notifications.</p>}
          <Link to="/inventory" onClick={() => setOpen(false)}>View inventory</Link>
        </section>
      )}
    </div>
  );
}
