"""Detailed audit logging helper for SmartInventory."""
import json
from flask_jwt_extended import get_jwt
from backend.database import get_db_connection


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
                     user_id=None, old_data=None, new_data=None):
    """Write an audit event without breaking the main business operation if logging fails."""
    connection = cursor = actor_cursor = None
    try:
        connection = get_db_connection()
        actor_name = None
        actor_role = None
        if user_id is not None:
            try:
                actor_cursor = connection.cursor(dictionary=True)
                actor_cursor.execute(
                    "SELECT username, full_name, role FROM users WHERE user_id = %s LIMIT 1",
                    (user_id,),
                )
                actor = actor_cursor.fetchone()
                if actor:
                    actor_role = str(actor.get("role") or "").upper()
                    # Owner/staff are identified by username as requested.
                    actor_name = actor.get("username") if actor_role in ("OWNER", "STAFF") else (actor.get("full_name") or actor.get("username"))
            except Exception as exc:
                print("AUDIT ACTOR LOOKUP WARNING:", repr(exc))
            finally:
                if actor_cursor:
                    actor_cursor.close()
        claims = get_jwt() if user_id is not None else {}
        actor_role = actor_role or str(claims.get("role") or "").upper() or None
        if not actor_name and actor_role in ("OWNER", "STAFF"):
            actor_name = claims.get("username")
        details = _json_payload(old_data, new_data)
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO audit_logs
                (actor_user_id, actor_name, actor_role, store_id,
                 event_category, action, entity_type, entity_id, description, details)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, actor_name, actor_role, store_id, _event_category(action, entity_type),
              action, entity_type, str(entity_id) if entity_id is not None else None,
              description or str(action), details))
        connection.commit()
        return True
    except Exception as exc:
        if connection:
            try: connection.rollback()
            except Exception: pass
        print("AUDIT LOG INSERT ERROR:", repr(exc))
        return False
    finally:
        if cursor:
            try: cursor.close()
            except Exception: pass
        if actor_cursor:
            try: actor_cursor.close()
            except Exception: pass
        if connection:
            try: connection.close()
            except Exception: pass
