import logging

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt

from backend.routes.user_routes import role_required
from backend.database import get_db_connection
from backend.services.stock_out_schema import (
    ensure_stock_out_store_foreign_key,
    stock_out_error_message,
)


# Creates the Blueprint for stock-out operations.
stock_out_bp = Blueprint(
    "stock_out",
    __name__,
    url_prefix="/api/stock-out"
)


# Removes stock from inventory and records the stock-out reason.
@stock_out_bp.route("/", methods=["POST"])
@role_required("OWNER", "STAFF")
def create_stock_out():

    # Gets the JSON data sent by the user.
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required."
        }), 400

    # Gets the product ID.
    product_id = data.get("product_id")

    # Gets the quantity being removed.
    quantity = data.get("quantity")

    # Gets the stock-out reason.
    stock_out_reason = str(data.get(
        "stock_out_reason",
        data.get("reference_type", "OTHER")
    )).strip().upper()

    # Gets the optional reference number.
    reference_number = str(data.get(
        "reference_number",
        ""
    )).strip()

    # Gets the optional remarks.
    remarks = str(data.get(
        "remarks",
        ""
    )).strip()
    movement_remarks = remarks
    if reference_number:
        movement_remarks = f"Reference: {reference_number}"
        if remarks:
            movement_remarks = f"{movement_remarks} | {remarks}"

    # Defines the allowed stock-out reasons.
    allowed_reasons = [
        "SALE",
        "DAMAGED",
        "RETURN_TO_SUPPLIER",
        "LOST",
        "TRANSFER",
        "ADJUSTMENT",
        "OTHER"
    ]

    # Requires a product ID and quantity.
    if not product_id or quantity is None:
        return jsonify({
            "error": "Product ID and quantity are required."
        }), 400

    # Validates the stock-out reason.
    if stock_out_reason not in allowed_reasons:
        return jsonify({
            "error": "Invalid stock-out reason.",
            "allowed_reasons": allowed_reasons
        }), 400

    # Validates the quantity.
    try:
        quantity = int(quantity)

        if quantity <= 0:
            raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "error": "Quantity must be greater than zero."
        }), 400

    if not product_id or quantity is None:
        return jsonify({
            "error": "Product ID and quantity are required."
        }), 400

    # Gets the logged-in user's store ID.
    store_id = get_jwt().get("store_id")

    # Prevents users without a store from creating stock-out records.
    if not store_id:
        return jsonify({
            "error": "You are not assigned to a store."
        }), 403

    connection = None
    cursor = None

    try:

        # Gets a database connection.
        connection = get_db_connection()

        ensure_stock_out_store_foreign_key(connection)

        # Starts a database transaction.
        connection.start_transaction()

        # Creates a dictionary cursor.
        cursor = connection.cursor(dictionary=True)

        # Checks whether the product belongs to the user's store.
        cursor.execute("""
            SELECT product_id, product_name
            FROM products
            WHERE product_id = %s
            AND store_id = %s
        """, (
            product_id,
            store_id
        ))

        product = cursor.fetchone()

        # Stops when the product does not belong to the store.
        if not product:
            connection.rollback()

            return jsonify({
                "error": "Product not found in your store."
            }), 404

        # Gets the current inventory record.
        cursor.execute("""
            SELECT inventory_id, stock_quantity
            FROM inventory
            WHERE product_id = %s
            AND store_id = %s
            FOR UPDATE
        """, (
            product_id,
            store_id
        ))

        inventory = cursor.fetchone()

        # Stops when no inventory record exists.
        if not inventory:
            connection.rollback()

            return jsonify({
                "error": "Inventory record not found."
            }), 404

        # Gets the current stock quantity.
        previous_quantity = inventory["stock_quantity"]

        # Prevents removing more stock than available.
        if quantity > previous_quantity:
            connection.rollback()

            return jsonify({
                "error": "Insufficient stock.",
                "available_stock": previous_quantity
            }), 400

        # Calculates the remaining stock.
        new_quantity = previous_quantity - quantity

        legacy_reason = {
            "SALE": "SOLD",
            "DAMAGED": "DAMAGED",
            "RETURN_TO_SUPPLIER": "RETURNED_TO_SUPPLIER",
            "TRANSFER": "OTHER",
            "LOST": "LOST",
            "ADJUSTMENT": "OTHER",
            "OTHER": "OTHER"
        }[stock_out_reason]
        legacy_stock_out_reason = (
            stock_out_reason
            if stock_out_reason in {
                "DAMAGED",
                "RETURN_TO_SUPPLIER",
                "TRANSFER",
                "LOST",
                "OTHER"
            }
            else "OTHER"
        )
        stock_out_notes = f"Reason: {stock_out_reason}"
        if movement_remarks:
            stock_out_notes = f"{stock_out_notes} | {movement_remarks}"

        cursor.close()

        # Creates a normal cursor for database changes.
        cursor = connection.cursor()

        # Creates the stock-out record.
        cursor.execute("""
            INSERT INTO stock_out (
                product_id,
                quantity,
                reason,
                notes,
                stock_out_date,
                store_id,
                stock_out_reason
            )
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, %s, %s)
        """, (
            product_id,
            quantity,
            legacy_reason,
            stock_out_notes,
            store_id,
            legacy_stock_out_reason
        ))

        # Gets the newly created stock-out ID.
        stock_out_id = cursor.lastrowid

        # Updates the inventory quantity.
        cursor.execute("""
            UPDATE inventory
            SET stock_quantity = %s
            WHERE product_id = %s
            AND store_id = %s
        """, (
            new_quantity,
            product_id,
            store_id
        ))

        # Records the transaction in stock movements.
        cursor.execute("""
            INSERT INTO stock_movements (
                product_id,
                movement_type,
                quantity,
                previous_quantity,
                new_quantity,
                reference_type,
                reference_id,
                remarks,
                store_id
            )
            VALUES (
                %s,
                'STOCK_OUT',
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """, (
            product_id,
            quantity,
            previous_quantity,
            new_quantity,
            stock_out_reason,
            stock_out_id,
            movement_remarks if movement_remarks else None,
            store_id
        ))

        # Saves all database changes.
        connection.commit()

        return jsonify({
            "message": "Stock removed successfully.",
            "product_id": product_id,
            "product_name": product["product_name"],
            "stock_out_reason": stock_out_reason,
            "previous_quantity": previous_quantity,
            "removed_quantity": quantity,
            "new_quantity": new_quantity
        }), 201

    except Exception as e:

        if connection:
            connection.rollback()

        logging.getLogger(__name__).exception("Stock-out request failed")

        return jsonify({
            "error": stock_out_error_message(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# Gets all stock-out records from the logged-in user's store.
@stock_out_bp.route("/", methods=["GET"])
@role_required("OWNER", "STAFF")
def get_stock_out_records():

    # Gets the logged-in user's store ID.
    store_id = get_jwt().get("store_id")

    # Gets the search keyword.
    search = request.args.get(
        "search",
        ""
    ).strip()

    # Gets the stock-out reason filter.
    stock_out_reason = request.args.get(
        "stock_out_reason",
        ""
    ).strip().upper()

    connection = None
    cursor = None

    try:

        # Gets a database connection.
        connection = get_db_connection()

        # Creates a dictionary cursor.
        cursor = connection.cursor(dictionary=True)

        # Creates the stock-out query.
        sql = """
            SELECT
                so.stock_out_id,
                so.product_id,
                p.product_name,
                p.sku,
                p.part_number,
                so.quantity,
                so.reason,
                so.stock_out_reason,
                NULL AS reference_number,
                so.notes AS remarks,
                so.stock_out_date AS created_at
            FROM stock_out so
            INNER JOIN products p
                ON so.product_id = p.product_id
            WHERE so.store_id = %s
        """

        params = [store_id]

        # Searches product and reference information.
        if search:

            sql += """
                AND (
                    p.product_name LIKE %s
                    OR p.sku LIKE %s
                    OR p.part_number LIKE %s
                    OR so.notes LIKE %s
                )
            """

            search_value = f"%{search}%"

            params.extend([
                search_value,
                search_value,
                search_value,
                search_value
            ])

        # Filters records by stock-out reason.
        if stock_out_reason:

            sql += """
                AND so.stock_out_reason = %s
            """

            params.append(stock_out_reason)

        # Shows the newest records first.
        sql += """
            ORDER BY so.stock_out_date DESC
        """

        cursor.execute(sql, tuple(params))

        records = cursor.fetchall()

        return jsonify(records), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# Gets one stock-out record from the logged-in user's store.
@stock_out_bp.route("/<int:stock_out_id>", methods=["GET"])
@role_required("OWNER", "STAFF")
def get_stock_out_record(stock_out_id):

    # Gets the logged-in user's store ID.
    store_id = get_jwt().get("store_id")

    connection = None
    cursor = None

    try:

        # Gets a database connection.
        connection = get_db_connection()

        # Creates a dictionary cursor.
        cursor = connection.cursor(dictionary=True)

        # Gets the selected stock-out record.
        cursor.execute("""
            SELECT
                so.stock_out_id,
                so.product_id,
                p.product_name,
                p.sku,
                p.part_number,
                so.quantity,
                so.reason,
                so.stock_out_reason,
                NULL AS reference_number,
                so.notes AS remarks,
                so.stock_out_date AS created_at
            FROM stock_out so
            INNER JOIN products p
                ON so.product_id = p.product_id
            WHERE so.stock_out_id = %s
            AND so.store_id = %s
        """, (
            stock_out_id,
            store_id
        ))

        record = cursor.fetchone()

        # Returns an error when the record does not exist.
        if not record:
            return jsonify({
                "error": "Stock-out record not found."
            }), 404

        return jsonify(record), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()