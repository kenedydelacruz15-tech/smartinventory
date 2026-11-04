from datetime import datetime, timezone
from functools import wraps

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, jwt_required

from backend.services.alert_service import (
    get_all_smart_alerts,
    get_expiring_alerts,
    get_expired_alerts,
    get_low_stock_alerts,
    get_out_of_stock_alerts
)
from backend.services.reorder_service import get_reorder_recommendations


alert_bp = Blueprint("alert_bp", __name__, url_prefix="/api")


def store_user_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") not in {"OWNER", "STAFF"}:
            return jsonify({"error": "Only store users can view inventory alerts."}), 403
        if not claims.get("store_id"):
            return jsonify({"error": "Your account is not assigned to a store."}), 403
        return view(*args, **kwargs)

    return wrapped


# Get all current smart alerts
@alert_bp.route("/alerts", methods=["GET"])
@jwt_required()
@store_user_required
def get_alerts():
    store_id = get_jwt().get("store_id")

    try:
        alerts = get_all_smart_alerts(store_id)

        return jsonify({
            "alert_count": len(alerts),
            "alerts": alerts
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@alert_bp.route("/notifications", methods=["GET"])
@jwt_required()
@store_user_required
def get_notifications():
    store_id = get_jwt().get("store_id")

    try:
        alerts = get_all_smart_alerts(store_id)
        recommendations = get_reorder_recommendations(store_id)
        detected_at = datetime.now(timezone.utc).isoformat()
        notifications_by_product = {}

        for alert in alerts:
            alert_type = alert.get("alert_type", "INVENTORY_ALERT")
            product_id = alert.get("product_id")
            notification_id = (
                f"alert:{alert_type}:{product_id}:"
                f"{alert.get('batch_id', '')}"
            )
            severity = (
                "critical"
                if alert_type in {"OUT_OF_STOCK", "EXPIRED"}
                else "warning"
            )
            notification = {
                "id": notification_id,
                "type": alert_type,
                "severity": severity,
                "title": alert_type.replace("_", " ").title(),
                "message": alert.get("message", ""),
                "product_id": product_id,
                "product_name": alert.get("product_name"),
                "quantity": alert.get("stock_quantity", alert.get("quantity")),
                "expiry_date": alert.get("expiry_date"),
                "detected_at": detected_at,
            }
            notifications_by_product.setdefault(product_id, []).append(notification)

        for recommendation in recommendations:
            product_id = recommendation.get("product_id")
            existing = notifications_by_product.get(product_id, [])
            if existing:
                for notification in existing:
                    notification["reorder_recommended"] = True
                    notification["recommended_quantity"] = recommendation.get(
                        "recommended_quantity"
                    )
                continue

            notifications_by_product.setdefault(product_id, []).append({
                "id": f"reorder:{product_id}",
                "type": "REORDER",
                "severity": "warning",
                "title": "Reorder recommended",
                "message": (
                    f"{recommendation.get('product_name', 'Product')} is at or "
                    "below its reorder level."
                ),
                "product_id": product_id,
                "product_name": recommendation.get("product_name"),
                "quantity": recommendation.get("stock_quantity"),
                "reorder_level": recommendation.get("reorder_level"),
                "recommended_quantity": recommendation.get(
                    "recommended_quantity"
                ),
                "detected_at": detected_at,
            })

        notifications = sorted(
            (
                notification
                for product_notifications in notifications_by_product.values()
                for notification in product_notifications
            ),
            key=lambda notification: (
                notification["severity"] != "critical",
                notification["title"],
                notification["product_name"] or "",
            ),
        )

        return jsonify({
            "count": len(notifications),
            "generated_at": detected_at,
            "notifications": notifications,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Get expiring products
@alert_bp.route("/alerts/expiring", methods=["GET"])
@jwt_required()
@store_user_required
def expiring_alerts():
    store_id = get_jwt().get("store_id")

    try:
        products = get_expiring_alerts(store_id)

        return jsonify({
            "alert_count": len(products),
            "expiring_products": products
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# Get expired products
@alert_bp.route("/alerts/expired", methods=["GET"])
@jwt_required()
@store_user_required
def expired_alerts():
    store_id = get_jwt().get("store_id")

    try:
        products = get_expired_alerts(store_id)

        return jsonify({
            "alert_count": len(products),
            "expired_products": products
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# Get low-stock products
@alert_bp.route("/alerts/low-stock", methods=["GET"])
@jwt_required()
@store_user_required
def low_stock_alerts():
    store_id = get_jwt().get("store_id")

    try:
        products = get_low_stock_alerts(store_id)

        return jsonify({
            "alert_count": len(products),
            "low_stock_products": products
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# Get out-of-stock products
@alert_bp.route("/alerts/out-of-stock", methods=["GET"])
@jwt_required()
@store_user_required
def out_of_stock_alerts():
    store_id = get_jwt().get("store_id")

    try:
        products = get_out_of_stock_alerts(store_id)

        return jsonify({
            "alert_count": len(products),
            "out_of_stock_products": products
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500