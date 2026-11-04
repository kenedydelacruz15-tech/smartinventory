# SmartInventory - Final React + Axios + Flask Version

Smart Inventory Forecasting and Analytics System for motorcycle-parts inventory.

## Architecture

React + Vite frontend -> Axios -> Python Flask API -> MariaDB/MySQL

The frontend does not connect directly to the database. Existing backend routes and the existing `smart_inventory` database remain the source of truth.

## Find files quickly

```text
app.py                  # Simple project-root launcher; imports backend.app
backend/                # Active Flask backend package
  app.py                # Flask app setup and API route registration
  database.py           # MySQL connection pool
  audit_logger.py       # Shared audit-log helper
  routes/               # Active Flask API endpoints
  services/             # Shared backend business logic
  scripts/              # Admin and database helper commands
frontend/
  src/
    App.jsx             # Frontend routes, navigation, and app layout
    pages/              # Screen components and page-specific styles
    components/         # Shared UI components
    services/           # API client and authentication helpers
    styles.css          # App-wide styles
```

### Which backend files should I edit?

The normal start command is `python app.py`. That file imports `backend.app`,
so **`backend/` is the active backend**.

The repository also contains older top-level copies such as `routes/`,
`services/`, `database.py`, and `audit_logger.py`. They are not imported by the
normal launcher. Keep them untouched unless you are intentionally working on
the legacy version; for current backend changes, use the matching file under
`backend/`.

### Common feature edit locations

| To change... | Edit here |
|---|---|
| Flask startup, configuration, or registered endpoints | `backend/app.py` |
| Database connection behavior | `backend/database.py` |
| Audit event creation or audit table setup | `backend/audit_logger.py` |
| Login, users, and roles API | `backend/routes/user_routes.py` |
| Product API | `backend/routes/product_routes.py` |
| Inventory and stock adjustments API | `backend/routes/inventory_routes.py`, `backend/routes/stock_in_routes.py`, `backend/routes/stock_out_routes.py` |
| Stock activity history API | `backend/routes/stock_movement_routes.py` |
| Dashboard API and summary calculations | `backend/routes/dashboard_routes.py`, `backend/services/dashboard_service.py` |
| Alerts and mobile notifications API | `backend/routes/alert_routes.py`, `backend/services/alert_service.py` |
| Reorder recommendations | `backend/routes/reorder_routes.py`, `backend/services/reorder_service.py` |
| Reports API | `backend/routes/report_routes.py` |
| Store, supplier, or category API | Matching file in `backend/routes/` |
| Admin/database helper commands | `backend/scripts/` |
| Frontend screen URL, sidebar, or protected routes | `frontend/src/App.jsx` |
| Inventory page content and behavior | `frontend/src/pages/Inventory.jsx` |
| Owner or staff dashboard content | `frontend/src/pages/OwnerDashboard.jsx`, `frontend/src/pages/StaffDashboard.jsx` |
| Landing page wording and sections | `frontend/src/pages/LandingPage.jsx` |
| Landing page appearance and text sizing | `frontend/src/pages/MotorpartsLanding.css` |
| Reports page content and behavior | `frontend/src/pages/Reports.jsx` |
| Audit log screen | `frontend/src/pages/AuditLogs.jsx` |
| Reusable notification bell or stock activity panel | Matching file in `frontend/src/components/` |
| API base URL or Axios behavior | `frontend/src/services/api.js` |
| Login state and token helpers | `frontend/src/services/auth.js` |
| General application styling | `frontend/src/styles.css` |

The landing page imports several style files. For its current motorparts
inventory theme and text sizing, start with `frontend/src/pages/MotorpartsLanding.css`.
The shared landing layout and responsive styles are in `DarkLandingPage.css`,
`LandingTypography.css`, and `LandingFeaturesScale.css`.

### Store operations screens and mobile API

- Owners and staff can review stock-in/out analytics and movement history from their dashboards, with date, type, and reason filters.
- Owners and staff can view live stock/expiry and reorder notifications from the notification bell.
- Mobile clients can poll `GET /api/notifications` with the same JWT bearer token for a JSON response containing `count`, `generated_at`, and `notifications`. Notifications are derived from current stock conditions; read/unread state and push delivery are not persisted.
- Dashboard movement analytics use `GET /api/stock-movements/` with optional `start_date`, `end_date`, `movement_type`, and `reference_type` filters. Add `include_summary=true` for filtered stock-in/out totals and transaction count.
- Purchase-order API routes and stored records are retained in the backend but are not exposed in the frontend.
- These screens use the existing Flask endpoints; no database schema or migration changes are required.

## Backend

Run from the project root (the root launcher keeps the command short):

```powershell
python app.py
```

Default API address:

```text
http://127.0.0.1:5000
```

### Handy backend commands

Run these from the project root:

```powershell
python -m backend.scripts.test_db
python -m backend.scripts.create_admin
```

Before creating an admin account, set `ADMIN_FULL_NAME`, `ADMIN_USERNAME`,
`ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the project-root `.env` file.

## Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the public landing page:

```text
http://localhost:5173/
```

## Environment

Copy `.env.example` to `.env` in the project root and fill in your existing database credentials and private secrets.

Do not commit `.env` to Git.

Example:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_inventory
SECRET_KEY=your-private-secret
JWT_SECRET_KEY=your-private-jwt-secret
AUTOPARTS_API_KEY=
```

## Important

- Do not import the SQL file again if your existing `smart_inventory` database is already populated.
- Do not put database credentials in React.
- Keep `.env` only in the backend/project root.
- The frontend uses Axios for API communication.
- The logout control is icon-only in the sidebar as requested for the presentation design.
