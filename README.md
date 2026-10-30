# SmartInventory - Final React + Axios + Flask Version

Smart Inventory Forecasting and Analytics System for motorcycle-parts inventory.

## Architecture

React + Vite frontend -> Axios -> Python Flask API -> MariaDB/MySQL

The frontend does not connect directly to the database. Existing backend routes and the existing `smart_inventory` database remain the source of truth.

## Project layout

```text
backend/
  app.py               # Flask app and API configuration
  database.py          # MySQL connection pool
  audit_logger.py      # Shared audit logging helper
  routes/              # Flask API endpoints
  services/            # Business logic used by routes
  scripts/             # Database/admin helper commands
frontend/
  src/
    pages/             # Screen components and their page-specific CSS
    components/        # Reusable UI components
    services/          # API client and authentication helpers
    styles.css         # App-wide styles
```

## Frontend

Location: `frontend/`

```text
frontend/src/
  App.jsx
  main.jsx
  styles.css
  pages/
  services/
    api.js        # Axios client + JWT interceptor
    auth.js
```

Axios automatically attaches the JWT from `localStorage` to API requests.

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

### Common edit locations

- Database connection: `backend/database.py` and the `DB_*` values in `.env`.
- Backend routes and API registration: `backend/routes/` and `backend/app.py`.
- Shared backend logic: `backend/services/`.
- Frontend API address: `frontend/src/services/api.js` (`VITE_API_URL`).
- Page content and page-specific appearance: `frontend/src/pages/`.
- App-wide appearance: `frontend/src/styles.css`.

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
