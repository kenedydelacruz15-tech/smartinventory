from threading import Lock


_schema_lock = Lock()


def ensure_stock_out_store_foreign_key(connection):
    """Make sure stock-out rows reference stores, not users."""
    with _schema_lock:
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("""
                SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'stock_out'
                AND COLUMN_NAME = 'store_id'
                AND REFERENCED_COLUMN_NAME IS NOT NULL
            """)
            constraints = cursor.fetchall()
            if any(
                row["REFERENCED_TABLE_NAME"] == "stores"
                and row["REFERENCED_COLUMN_NAME"] == "store_id"
                for row in constraints
            ):
                return

            cursor.execute("""
                SELECT COUNT(*) AS invalid_rows
                FROM stock_out so
                LEFT JOIN stores s ON s.store_id = so.store_id
                WHERE s.store_id IS NULL
            """)
            if cursor.fetchone()["invalid_rows"]:
                raise RuntimeError(
                    "Cannot repair stock_out store_id constraint: "
                    "existing records reference missing stores."
                )

            for row in constraints:
                constraint_name = row["CONSTRAINT_NAME"].replace("`", "``")
                cursor.execute(
                    f"ALTER TABLE stock_out DROP FOREIGN KEY `{constraint_name}`"
                )

            cursor.execute("""
                ALTER TABLE stock_out
                ADD CONSTRAINT fk_stock_out_store
                FOREIGN KEY (store_id) REFERENCES stores (store_id)
                ON UPDATE CASCADE
            """)
            connection.commit()
        finally:
            cursor.close()


def stock_out_error_message(error):
    """Return an actionable message without exposing raw database errors."""
    message = str(error).lower()
    if getattr(error, "errno", None) == 1452 and (
        "stock_out" in message or "stock_out_ibfk_2" in message
    ):
        return (
            "Stock Out was not saved because the database still links "
            "stock_out.store_id to users.user_id instead of stores.store_id. "
            "Restart the backend to load the schema fix, then try again. "
            "No stock was removed."
        )
    if "existing records reference missing stores" in message:
        return (
            "Stock Out was not saved because existing stock-out records contain "
            "store IDs that do not exist in stores.store_id. Ask an administrator "
            "to correct those records before retrying. No stock was removed."
        )

    return (
        "Stock Out could not be saved because of a database error. "
        "No stock was removed; please try again or contact your administrator."
    )
