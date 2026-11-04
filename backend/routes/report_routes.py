from functools import wraps

from flask import Blueprint, jsonify
from backend.database import get_db_connection
from flask_jwt_extended import get_jwt, jwt_required

report_bp = Blueprint("report_bp", __name__, url_prefix="/api")


def owner_store_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "OWNER":
            return jsonify({"error": "Only store owners can view reports."}), 403
        if not claims.get("store_id"):
            return jsonify({"error": "Your account is not assigned to a store."}), 403
        return view(*args, **kwargs)

    return wrapped


# CURRENT INVENTORY REPORT

@report_bp.route("/reports/current-inventory", methods=["GET"])
@jwt_required()
@owner_store_required
def current_inventory_report():
    """
    Generates a current inventory valuation report for the active store owner.
    """
    current_store_id = get_jwt().get("store_id")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    sql = """
        SELECT
            products.product_id,
            products.product_name,
            categories.category_name,
            products.selling_price AS price,
            COALESCE(inventory.stock_quantity, 0) AS stock_quantity,
            (products.selling_price * COALESCE(inventory.stock_quantity, 0)) AS total_value
        FROM products
        LEFT JOIN categories
            ON products.category_id = categories.category_id
            AND categories.store_id = products.store_id
        LEFT JOIN inventory
            ON products.product_id = inventory.product_id
        WHERE products.store_id = %s
        ORDER BY products.product_name
    """

    try:
        cursor.execute(sql, (current_store_id,))
        inventory = cursor.fetchall()
    finally:
        cursor.close()
        db.close()

    return jsonify(inventory)

# STOCK MOVEMENT REPORT

@report_bp.route("/reports/stock-movements", methods=["GET"])
@jwt_required()
@owner_store_required
def stock_movement_report():
    """
    Generates an inventory ledger audit trail report for the active store owner.
    """
    current_store_id = get_jwt().get("store_id")

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    sql = """
        SELECT
            stock_movements.movement_id,
            products.product_id,
            products.product_name,
            stock_movements.movement_type,
            stock_movements.quantity,
            stock_movements.reference_id,
            stock_movements.movement_date
        FROM stock_movements
        JOIN products
            ON stock_movements.product_id = products.product_id
        WHERE products.store_id = %s
        ORDER BY stock_movements.movement_date DESC,
                 stock_movements.movement_id DESC
    """

    try:
        cursor.execute(sql, (current_store_id,))
        movements = cursor.fetchall()
    finally:
        cursor.close()
        db.close()

    return jsonify(movements)
