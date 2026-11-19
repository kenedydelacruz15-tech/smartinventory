"""Detailed audit logging helper for SmartInventory."""
import json
from flask_jwt_extended import get_jwt
from database import get_db_connection


from threading import Lock

_audit_schema_lock = Lock()
_audit_schema_ready = False


def ensure_audit_logs_table(connection):
    global _audit_schema_ready

    if _audit_schema_ready:
        return

    with _audit_schema_lock:
        if _audit_schema_ready:
            return

        cursor = connection.cursor()

        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                    actor_user_id INT NULL,
                    actor_name VARCHAR(100) NULL,
                    actor_role VARCHAR(20) NULL,
                    store_id INT NULL,
                    event_category VARCHAR(40) NOT NULL,
                    action VARCHAR(80) NOT NULL,
                    entity_type VARCHAR(50) NULL,
                    entity_id VARCHAR(100) NULL,
                    description TEXT NULL,
                    details LONGTEXT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (log_id),
                    INDEX idx_audit_logs_store_created (store_id, created_at),
                    INDEX idx_audit_logs_action_created (action, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)

            connection.commit()
            _audit_schema_ready = True

        finally:
            cursor.close()



def _json_payload(old_data=None, new_data=None):
    if old_data is None and new_data is None:
        return None
    return json.dumps({"old_data": old_data, "new_data": new_data}, default=str, ensure_ascii=False)


def _event_category(action, entity_type=None):
    action = str(action or "").upper()
    if action.startswith("USER_") or action.startswith("ACCOUNT_"):
        return "USERS"
    if action.startswith("CATEGORY_"):
        return "CATEGORY"
    if action.startswith("PRODUCT_") or action.startswith("COMPATIBILITY_"):
        return "PRODUCT"
    if action.startswith("STOCK_") or action.startswith("INVENTORY_"):
        return "INVENTORY"
    return str(entity_type or "GENERAL").upper()


def create_audit_log(store_id, action, entity_type, entity_id=None, description=None,
                     user_id=None, old_data=None, new_data=None,
                     connection=None):

    own_connection = connection is None
    cursor = actor_cursor = None

    try:
        if own_connection:
            connection = get_db_connection()
            ensure_audit_logs_table(connection)

        actor_name = None
        actor_role = None

        if user_id is not None:
            try:
                actor_cursor = connection.cursor(dictionary=True)
                actor_cursor.execute(
                    """
                    SELECT username, full_name, role
                    FROM users
                    WHERE user_id = %s
                    LIMIT 1
                    """,
                    (user_id,)
                )

                actor = actor_cursor.fetchone()

                if actor:
                    actor_role = str(
                        actor.get("role") or ""
                    ).upper()

                    actor_name = (
                        actor.get("username")
                        if actor_role in ("OWNER", "STAFF")
                        else (
                            actor.get("full_name")
                            or actor.get("username")
                        )
                    )

            except Exception as exc:
                print("AUDIT ACTOR LOOKUP WARNING:", repr(exc))

            finally:
                if actor_cursor:
                    actor_cursor.close()
                    actor_cursor = None

        claims = {}

        if user_id is not None and (not actor_name or not actor_role):
            try:
                claims = get_jwt()
            except RuntimeError:
                claims = {}

        actor_role = (
            actor_role
            or str(claims.get("role") or "").upper()
            or None
        )

        if not actor_name and actor_role in ("OWNER", "STAFF"):
            actor_name = claims.get("username")

        details = _json_payload(old_data, new_data)

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO audit_logs
                (
                    actor_user_id,
                    actor_name,
                    actor_role,
                    store_id,
                    event_category,
                    action,
                    entity_type,
                    entity_id,
                    description,
                    details
                )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                actor_name,
                actor_role,
                store_id,
                _event_category(action, entity_type),
                action,
                entity_type,
                str(entity_id) if entity_id is not None else None,
                description or str(action),
                details
            )
        )

        if own_connection:
            connection.commit()

        return True

    except Exception as exc:

        if own_connection and connection:
            try:
                connection.rollback()
            except Exception:
                pass

        else:
            raise

        print("AUDIT LOG INSERT ERROR:", repr(exc))
        return False

    finally:
        for active_cursor in (cursor, actor_cursor):
            if active_cursor:
                try:
                    active_cursor.close()
                except Exception:
                    pass

        if own_connection and connection:
            try:
                connection.close()
            except Exception:
                pass