# SmartInventory

SmartInventory is a Flask + React inventory management system for motorcycle parts. POS/sales functionality has been removed.

## Authentication

There is one login screen and one backend login endpoint: `POST /api/users/login`. Users do not choose a role before signing in. After credentials are verified, the backend returns the account role (`ADMIN`, `OWNER`, or `STAFF`) and the frontend uses that role for dashboard and route access.

## Main modules

- Admin: store and user administration
- Owner: products, categories, inventory, staff, and store settings
- Staff: inventory operations
- Inventory reports and stock movement tracking

## Removed

The POS/sales transaction feature and its dependent sales analytics/forecasting modules have been removed, including the `sales` and `sale_items` database tables, POS page, sales API routes, sales dashboard charts, sales history report, and sales-dependent analytics/forecasting services.

## Setup

1. Create a MySQL database and import `smartinventory.sql`.
2. Copy `.env.example` to `.env` and set the database credentials and a strong JWT secret.
3. Install backend dependencies: `pip install -r requirements.txt`.
4. Start Flask: `python app.py`.
5. In `frontend/`, run `npm install` and then `npm run dev`.

The frontend expects Flask at `http://127.0.0.1:5000` by default; change `frontend/.env` if needed.
