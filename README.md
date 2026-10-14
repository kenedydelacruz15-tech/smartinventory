# SmartInventory - Final React + Axios + Flask Version

Smart Inventory Forecasting and Analytics System for motorcycle-parts inventory.

## Architecture

React + Vite frontend -> Axios -> Python Flask API -> MariaDB/MySQL

The frontend does not connect directly to the database. Existing backend routes and the existing `smart_inventory` database remain the source of truth.

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

Run from the project root:

```powershell
python app.py
```

Default API address:

```text
http://127.0.0.1:5000
```

## Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173/login
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
