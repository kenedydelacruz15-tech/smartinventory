"""Audit-log API routes for SmartInventory's current audit_logs schema."""
import json

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from backend.database import get_db_connection

audit_bp = Blueprint("audit_bp", __name__)


def _decode_details(value):
    if not value or not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def _fetch_logs(where_sql="", params=None, limit=250):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        sql = """
            SELECT log_id, actor_user_id, actor_name, actor_role, store_id,
                   event_category, action, entity_type, entity_id,
                   description, details, created_at
            FROM audit_logs
        """
        if where_sql:
            sql += " WHERE " + where_sql
        sql += " ORDER BY created_at DESC, log_id DESC LIMIT %s"
        cursor.execute(sql, tuple(list(params or []) + [limit]))
        records = cursor.fetchall()

        for record in records:
            record["details"] = _decode_details(record.get("details"))
            # Backward-compatible keys used by the current React table.
            record["audit_log_id"] = record.get("log_id")
            record["user_id"] = record.get("actor_user_id")
            record["username"] = record.get("actor_name") or "—"
            record["source"] = record.get("entity_type") or record.get("event_category")
        return records, None
    except Exception as exc:
        print("AUDIT LOG QUERY ERROR:", repr(exc))
        return None, str(exc)
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def _limit_from_request():
    try:
        return min(max(int(request.args.get("limit", 250)), 1), 500)
    except (TypeError, ValueError):
        return None


def _role():
    return str(get_jwt().get("role") or "").upper()


def _store_id():
    # The login endpoint puts store_id in the JWT custom claims.
    # JWT identity is user_id in this project, so do not use it as store_id.
    return get_jwt().get("store_id")


@audit_bp.route("/api/audit-logs/admin", methods=["GET"])
@jwt_required()
def get_admin_audit_logs():
    if _role() != "ADMIN":
        return jsonify({"error": "Admin access required."}), 403

    limit = _limit_from_request()
    if limit is None:
        return jsonify({"error": "limit must be a valid number."}), 400

    category = (request.args.get("category") or "ALL").strip().upper()
    allowed = {"ALL", "STORE_CREATED", "USER_CREATED"}
    if category not in allowed:
        return jsonify({"error": "Invalid event category."}), 400

    where_sql = ""
    params = []
    if category != "ALL":
        where_sql = "action = %s"
        params.append(category)

    records, error = _fetch_logs(where_sql, params, limit)
    if error:
        return jsonify({
            "error": "Could not load admin audit logs.",
            "details": error,
        }), 500
    return jsonify(records), 200


@audit_bp.route("/api/audit-logs/owner", methods=["GET"])
@jwt_required()
def get_owner_audit_logs():
    if _role() != "OWNER":
        return jsonify({"error": "Owner access required."}), 403

    store_id = _store_id()
    if store_id is None:
        return jsonify({"error": "Store not found in session. Please sign out and sign in again."}), 400

    limit = _limit_from_request()
    if limit is None:
        return jsonify({"error": "limit must be a valid number."}), 400

    records, error = _fetch_logs("store_id = %s", [store_id], limit)
    if error:
        return jsonify({
            "error": "Could not load owner audit logs.",
            "details": error,
        }), 500
    return jsonify(records), 200


@audit_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
def get_audit_logs():
    if _role() == "ADMIN":
        return jsonify({"error": "Use /api/audit-logs/admin for admin audit logs."}), 403

    store_id = _store_id()
    if store_id is None:
        return jsonify({"error": "Store not found in session. Please sign out and sign in again."}), 400

    limit = _limit_from_request()
    if limit is None:
        return jsonify({"error": "limit must be a valid number."}), 400

    conditions = ["store_id = %s"]
    params = [store_id]

    action = (request.args.get("action") or "").strip().upper()
    category = (request.args.get("category") or "").strip().upper()
    entity_type = (request.args.get("entity_type") or "").strip().upper()
    entity_id = (request.args.get("entity_id") or "").strip()
    actor_user_id = (request.args.get("user_id") or "").strip()
    start_date = (request.args.get("start_date") or "").strip()
    end_date = (request.args.get("end_date") or "").strip()

    if action:
        conditions.append("action = %s")
        params.append(action)
    if category and category != "ALL":
        # Support both broad event categories and legacy action-name filters.
        conditions.append("(event_category = %s OR action = %s)")
        params.extend([category, category])
    if entity_type:
        conditions.append("entity_type = %s")
        params.append(entity_type)
    if entity_id:
        conditions.append("entity_id = %s")
        params.append(entity_id)
    if actor_user_id:
        try:
            params.append(int(actor_user_id))
        except ValueError:
            return jsonify({"error": "user_id must be a valid number."}), 400
        conditions.append("actor_user_id = %s")
    if start_date:
        conditions.append("created_at >= %s")
        params.append(start_date)
    if end_date:
        conditions.append("created_at < DATE_ADD(%s, INTERVAL 1 DAY)")
        params.append(end_date)

    records, error = _fetch_logs(" AND ".join(conditions), params, limit)
    if error:
        return jsonify({"error": "Could not load audit logs.", "details": error}), 500
    return jsonify({"total_logs": len(records), "logs": records}), 200


@audit_bp.route("/audit-logs/<int:log_id>", methods=["GET"])
@jwt_required()
def get_audit_log(log_id):
    if _role() == "ADMIN":
        return jsonify({"error": "Use the admin audit-log endpoint."}), 403

    store_id = _store_id()
    if store_id is None:
        return jsonify({"error": "Store not found in session. Please sign out and sign in again."}), 400

    records, error = _fetch_logs("log_id = %s AND store_id = %s", [log_id, store_id], 1)
    if error:
        return jsonify({"error": "Could not load audit log.", "details": error}), 500
    if not records:
        return jsonify({"error": "Audit log not found."}), 404
    return jsonify(records[0]), 200
