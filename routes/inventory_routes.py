from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from routes.user_routes import role_required
from database import get_db_connection
from audit_logger import create_audit_log


inventory_bp = Blueprint(
    "inventory",
    __name__,
    url_prefix="/api/inventory"
)


# =========================================================
# GET INVENTORY
# =========================================================
@inventory_bp.route("/", methods=["GET"])
@jwt_required()
def get_inventory():

    claims = get_jwt()

    role = claims.get("role")
    store_id = claims.get("store_id")

    if role == "ADMIN":
        return jsonify({
            "error": "ADMIN does not manage store inventory."
        }), 403

    if not store_id:
        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    search = request.args.get(
        "search",
        ""
    ).strip()

    status = request.args.get(
        "status",
        "active"
    ).strip().lower()

    if status not in [
        "active",
        "inactive",
        "all"
    ]:
        status = "active"

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor(
            dictionary=True
        )

        sql = """
            SELECT
                i.inventory_id,
                i.product_id,
                p.product_name,
                p.sku,
                p.part_number,
                p.brand,
                p.selling_price,
                p.reorder_level,
                c.category_id,
                c.category_name,
                i.stock_quantity,
                i.is_active,
                i.store_id,
                i.updated_at
            FROM inventory i

            INNER JOIN products p
                ON i.product_id = p.product_id

            INNER JOIN categories c
                ON p.category_id = c.category_id

            WHERE i.store_id = %s
        """

        params = [store_id]

        if status == "active":

            sql += """
                AND i.is_active = 1
                AND p.is_active = 1
            """

        elif status == "inactive":

            sql += """
                AND i.is_active = 0
            """

        if search:

            sql += """
                AND (
                    p.product_name LIKE %s
                    OR p.sku LIKE %s
                    OR p.brand LIKE %s
                    OR c.category_name LIKE %s
                )
            """

            value = f"%{search}%"

            params.extend([
                value,
                value,
                value,
                value
            ])

        sql += """
            ORDER BY i.inventory_id DESC
        """

        cursor.execute(
            sql,
            tuple(params)
        )

        inventory = cursor.fetchall()

        return jsonify(inventory), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET SINGLE INVENTORY
# =========================================================
@inventory_bp.route(
    "/<int:inventory_id>",
    methods=["GET"]
)
@jwt_required()
def get_inventory_item(inventory_id):

    claims = get_jwt()

    role = claims.get("role")
    store_id = claims.get("store_id")

    if role == "ADMIN":

        return jsonify({
            "error": "ADMIN does not manage store inventory."
        }), 403

    if not store_id:

        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute("""
            SELECT
                i.inventory_id,
                i.product_id,
                p.product_name,
                p.sku,
                p.part_number,
                p.brand,
                p.selling_price,
                p.reorder_level,
                c.category_id,
                c.category_name,
                i.stock_quantity,
                i.is_active,
                i.store_id,
                i.updated_at
            FROM inventory i

            INNER JOIN products p
                ON i.product_id = p.product_id

            INNER JOIN categories c
                ON p.category_id = c.category_id

            WHERE i.inventory_id = %s
            AND i.store_id = %s
        """, (
            inventory_id,
            store_id
        ))

        item = cursor.fetchone()

        if not item:

            return jsonify({
                "error": "Inventory record not found."
            }), 404

        return jsonify(item), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# UPDATE INVENTORY / STOCK ADJUSTMENT
# OWNER ONLY
# =========================================================
@inventory_bp.route(
    "/<int:inventory_id>",
    methods=["PUT"]
)
@role_required("OWNER")
def update_inventory(inventory_id):

    data = request.get_json() or {}

    try:

        stock_quantity = int(
            data.get("stock_quantity")
        )

        if stock_quantity < 0:
            raise ValueError

    except (ValueError, TypeError):

        return jsonify({
            "error": "Stock quantity must be a valid non-negative number."
        }), 400

    # Adjustment reason is optional for backwards compatibility.
    reference_type = str(
        data.get(
            "reference_type",
            "ADJUSTMENT"
        )
    ).strip().upper()

    remarks = str(
        data.get(
            "remarks",
            ""
        )
    ).strip()

    if reference_type == "":
        reference_type = "ADJUSTMENT"

    store_id = get_jwt().get(
        "store_id"
    )

    if not store_id:

        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor(
            dictionary=True
        )

        # Gets current inventory.
        cursor.execute("""
            SELECT i.inventory_id, i.product_id, p.product_name, i.stock_quantity, i.is_active
            FROM inventory i
            INNER JOIN products p ON p.product_id = i.product_id AND p.store_id = i.store_id
            WHERE i.inventory_id = %s AND i.store_id = %s
        """, (
            inventory_id,
            store_id
        ))

        item = cursor.fetchone()

        if not item:

            return jsonify({
                "error": "Inventory record not found."
            }), 404

        if item["is_active"] == 0:

            return jsonify({
                "error": "Cannot adjust inactive inventory."
            }), 400

        previous_quantity = int(
            item["stock_quantity"] or 0
        )

        # No movement is needed if quantity did not change.
        if previous_quantity == stock_quantity:

            return jsonify({
                "message": "Inventory quantity is unchanged.",
                "previous_quantity": previous_quantity,
                "new_quantity": stock_quantity
            }), 200

        # Updates inventory quantity.
        cursor.execute("""
            UPDATE inventory
            SET stock_quantity = %s
            WHERE inventory_id = %s
            AND store_id = %s
        """, (
            stock_quantity,
            inventory_id,
            store_id
        ))

        # Calculates the actual movement amount.
        movement_quantity = abs(
            stock_quantity - previous_quantity
        )

        # Determines whether the adjustment adds or removes stock.
        movement_type = (
            "STOCK_IN"
            if stock_quantity > previous_quantity
            else "STOCK_OUT"
        )

        # Records the stock adjustment.
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
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """, (
            item["product_id"],
            movement_type,
            movement_quantity,
            previous_quantity,
            stock_quantity,
            reference_type,
            inventory_id,
            remarks,
            store_id
        ))

        create_audit_log(store_id, "INVENTORY_ADJUSTED", "INVENTORY", inventory_id,
                         f"Adjusted stock for {item.get('product_name') or ('Product #' + str(item['product_id']))}: {previous_quantity} → {stock_quantity} units",
                         get_jwt_identity() or None,
                         old_data={"stock_quantity": previous_quantity},
                         new_data={"stock_quantity": stock_quantity, "adjustment": movement_quantity, "movement_type": movement_type, "remarks": remarks})
        connection.commit()

        return jsonify({
            "message": "Inventory adjusted successfully.",
            "previous_quantity": previous_quantity,
            "new_quantity": stock_quantity,
            "movement_quantity": movement_quantity
        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        print(
            "UPDATE INVENTORY ERROR:",
            e
        )

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# STOCK IN
# OWNER / STAFF
# =========================================================
@inventory_bp.route(
    "/<int:inventory_id>/stock-in",
    methods=["POST"]
)
@role_required("OWNER", "STAFF")
def stock_in(inventory_id):

    data = request.get_json() or {}

    try:

        quantity = int(
            data.get("quantity")
        )

        if quantity <= 0:
            raise ValueError

    except (ValueError, TypeError):

        return jsonify({
            "error": "Stock-in quantity must be greater than 0."
        }), 400

    reference_type = str(
        data.get(
            "reference_type",
            "SUPPLIER"
        )
    ).strip().upper()

    remarks = str(
        data.get(
            "remarks",
            ""
        )
    ).strip()

    store_id = get_jwt().get(
        "store_id"
    )

    if not store_id:

        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor(
            dictionary=True
        )

        # Gets current stock.
        cursor.execute("""
            SELECT i.inventory_id, i.product_id, p.product_name, i.stock_quantity, i.is_active
            FROM inventory i
            INNER JOIN products p ON p.product_id = i.product_id AND p.store_id = i.store_id
            WHERE i.inventory_id = %s AND i.store_id = %s
        """, (
            inventory_id,
            store_id
        ))

        item = cursor.fetchone()

        if not item:

            return jsonify({
                "error": "Inventory record not found."
            }), 404

        if item["is_active"] == 0:

            return jsonify({
                "error": "Cannot add stock to inactive inventory."
            }), 400

        previous_quantity = int(
            item["stock_quantity"] or 0
        )

        new_quantity = (
            previous_quantity + quantity
        )

        # Adds stock.
        cursor.execute("""
            UPDATE inventory
            SET stock_quantity = %s
            WHERE inventory_id = %s
            AND store_id = %s
        """, (
            new_quantity,
            inventory_id,
            store_id
        ))

        # Records stock-in movement.
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
                'STOCK_IN',
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
        """, (
            item["product_id"],
            quantity,
            previous_quantity,
            new_quantity,
            reference_type,
            inventory_id,
            remarks,
            store_id
        ))

        create_audit_log(store_id, "STOCK_IN", "INVENTORY", inventory_id,
                         f"Stock in: {item.get('product_name') or ('Product #' + str(item['product_id']))} — +{quantity} units ({previous_quantity} → {new_quantity})",
                         get_jwt_identity() or None,
                         old_data={"stock_quantity": previous_quantity},
                         new_data={"stock_quantity": new_quantity, "quantity": quantity, "reason": reference_type, "remarks": remarks})
        connection.commit()

        return jsonify({
            "message": "Stock added successfully.",
            "previous_quantity": previous_quantity,
            "new_quantity": new_quantity,
            "quantity_added": quantity
        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        print(
            "STOCK IN ERROR:",
            e
        )

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# STOCK OUT
# OWNER / STAFF
# =========================================================
@inventory_bp.route(
    "/<int:inventory_id>/stock-out",
    methods=["POST"]
)
@role_required("OWNER", "STAFF")
def stock_out(inventory_id):

    data = request.get_json() or {}

    try:

        quantity = int(
            data.get("quantity")
        )

        if quantity <= 0:
            raise ValueError

    except (ValueError, TypeError):

        return jsonify({
            "error": "Stock-out quantity must be greater than 0."
        }), 400

    reference_type = str(
        data.get(
            "reference_type",
            "OTHER"
        )
    ).strip().upper()

    allowed_references = [
        "DAMAGED",
        "LOST",
        "ADJUSTMENT",
        "OTHER"
    ]

    if reference_type not in allowed_references:

        return jsonify({
            "error": (
                "Stock-out reason must be "
                "DAMAGED, LOST, ADJUSTMENT, or OTHER."
            )
        }), 400

    remarks = str(
        data.get(
            "remarks",
            ""
        )
    ).strip()

    store_id = get_jwt().get(
        "store_id"
    )

    if not store_id:

        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor(
            dictionary=True
        )

        # Gets current stock.
        cursor.execute("""
            SELECT i.inventory_id, i.product_id, p.product_name, i.stock_quantity, i.is_active
            FROM inventory i
            INNER JOIN products p ON p.product_id = i.product_id AND p.store_id = i.store_id
            WHERE i.inventory_id = %s AND i.store_id = %s
        """, (
            inventory_id,
            store_id
        ))

        item = cursor.fetchone()

        if not item:

            return jsonify({
                "error": "Inventory record not found."
            }), 404

        if item["is_active"] == 0:

            return jsonify({
                "error": "Cannot remove stock from inactive inventory."
            }), 400

        previous_quantity = int(
            item["stock_quantity"] or 0
        )

        # Prevents negative inventory.
        if quantity > previous_quantity:

            return jsonify({
                "error": (
                    "Stock-out quantity cannot be greater "
                    "than the current stock."
                )
            }), 400

        new_quantity = (
            previous_quantity - quantity
        )

        # Removes stock.
        cursor.execute("""
            UPDATE inventory
            SET stock_quantity = %s
            WHERE inventory_id = %s
            AND store_id = %s
        """, (
            new_quantity,
            inventory_id,
            store_id
        ))

        # Records stock-out movement.
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
            item["product_id"],
            quantity,
            previous_quantity,
            new_quantity,
            reference_type,
            inventory_id,
            remarks,
            store_id
        ))

        create_audit_log(store_id, "STOCK_OUT", "INVENTORY", inventory_id,
                         f"Stock out: {item.get('product_name') or ('Product #' + str(item['product_id']))} — -{quantity} units ({previous_quantity} → {new_quantity})",
                         get_jwt_identity() or None,
                         old_data={"stock_quantity": previous_quantity},
                         new_data={"stock_quantity": new_quantity, "quantity": quantity, "reason": reference_type, "remarks": remarks})
        connection.commit()

        return jsonify({
            "message": "Stock removed successfully.",
            "previous_quantity": previous_quantity,
            "new_quantity": new_quantity,
            "quantity_removed": quantity,
            "reason": reference_type
        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        print(
            "STOCK OUT ERROR:",
            e
        )

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# SOFT DELETE INVENTORY
# OWNER ONLY
# =========================================================
@inventory_bp.route(
    "/<int:inventory_id>/deactivate",
    methods=["PUT"]
)
@role_required("OWNER")
def deactivate_inventory(inventory_id):

    store_id = get_jwt().get(
        "store_id"
    )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute("""
            SELECT i.inventory_id, i.product_id, p.product_name, i.stock_quantity, i.is_active
            FROM inventory i
            INNER JOIN products p ON p.product_id = i.product_id AND p.store_id = i.store_id
            WHERE i.inventory_id = %s AND i.store_id = %s
        """, (
            inventory_id,
            store_id
        ))

        item = cursor.fetchone()

        if not item:

            return jsonify({
                "error": "Inventory record not found."
            }), 404

        if item["is_active"] == 0:

            return jsonify({
                "error": "Inventory record is already in Trash."
            }), 400

        # Prevents hiding inventory that still has stock.
        if item["stock_quantity"] > 0:

            return jsonify({
                "error": (
                    "Cannot move inventory to Trash "
                    "while stock quantity is greater than 0."
                )
            }), 400

        cursor.execute("""
            UPDATE inventory
            SET is_active = 0
            WHERE inventory_id = %s
            AND store_id = %s
        """, (
            inventory_id,
            store_id
        ))

        # Keep the Products page in sync with Inventory.
        cursor.execute("""
            UPDATE products
            SET is_active = 0
            WHERE product_id = %s
              AND store_id = %s
        """, (item["product_id"], store_id))

        create_audit_log(store_id, "INVENTORY_DEACTIVATED", "INVENTORY", inventory_id,
                         f"Deactivated inventory item: {item.get('product_name') or ('Product #' + str(item['product_id']))}",
                         get_jwt_identity() or None, old_data=item, new_data={"is_active": 0})
        connection.commit()

        return jsonify({
            "message": "Inventory record moved to Trash."
        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# RESTORE INVENTORY
# OWNER ONLY
# =========================================================
@inventory_bp.route(
    "/<int:inventory_id>/restore",
    methods=["PUT"]
)
@role_required("OWNER")
def restore_inventory(inventory_id):

    store_id = get_jwt().get(
        "store_id"
    )

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT i.inventory_id, i.product_id, p.product_name FROM inventory i JOIN products p ON p.product_id=i.product_id AND p.store_id=i.store_id WHERE i.inventory_id=%s AND i.store_id=%s AND i.is_active=0", (inventory_id, store_id))
        restore_item = cursor.fetchone()
        cursor.execute("""
            UPDATE inventory
            SET is_active = 1
            WHERE inventory_id = %s
            AND store_id = %s
            AND is_active = 0
        """, (
            inventory_id,
            store_id
        ))

        if cursor.rowcount == 0:

            return jsonify({
                "error": (
                    "Inventory record not found "
                    "or already active."
                )
            }), 404

        # Restore the matching product so it appears on the Products page again.
        cursor.execute("""
            UPDATE products
            SET is_active = 1
            WHERE product_id = %s
              AND store_id = %s
        """, (restore_item["product_id"], store_id))

        create_audit_log(store_id, "INVENTORY_RESTORED", "INVENTORY", inventory_id,
                         f"Restored inventory item: {(restore_item or {}).get('product_name') or ('Product #' + str((restore_item or {}).get('product_id', 'unknown')))}",
                         get_jwt_identity() or None, new_data={"is_active": 1})
        connection.commit()

        return jsonify({
            "message": "Inventory restored successfully."
        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

# =========================================================
# PERMANENTLY DELETE INVENTORY RECORD
# Remove the inventory row but retain product/history data.
# The product is moved to Products Trash so it disappears
# from the active Products list without breaking references.
# OWNER ONLY
# =========================================================
@inventory_bp.route("/<int:inventory_id>/permanent", methods=["DELETE"])
@role_required("OWNER")
def permanently_delete_inventory(inventory_id):
    store_id = get_jwt().get("store_id")
    if not store_id:
        return jsonify({"error": "Your account is not assigned to a store."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT i.inventory_id, i.product_id, i.stock_quantity,
                   i.is_active, p.product_name
            FROM inventory i
            INNER JOIN products p
              ON p.product_id = i.product_id
             AND p.store_id = i.store_id
            WHERE i.inventory_id = %s AND i.store_id = %s
            LIMIT 1
        """, (inventory_id, store_id))
        item = cursor.fetchone()

        if not item:
            return jsonify({"error": "Inventory record not found."}), 404
        if int(item["is_active"]) == 1:
            return jsonify({"error": "Deactivate this inventory item before permanently deleting its inventory record."}), 400
        if int(item["stock_quantity"] or 0) > 0:
            return jsonify({"error": "Stock must be zero before permanently deleting an inventory record."}), 400

        # Soft-delete the product instead of physically deleting it;
        # this preserves stock movements and other related history.
        cursor.execute("""
            UPDATE products
            SET is_active = 0
            WHERE product_id = %s AND store_id = %s
        """, (item["product_id"], store_id))

        cursor.execute("""
            DELETE FROM inventory
            WHERE inventory_id = %s AND store_id = %s
        """, (inventory_id, store_id))

        create_audit_log(
            store_id,
            "INVENTORY_PERMANENTLY_DELETED",
            "INVENTORY",
            inventory_id,
            f"Permanently deleted inventory record for product: {item['product_name']}",
            get_jwt_identity() or None,
            old_data=item,
            new_data={"inventory_record_deleted": True, "product_moved_to_trash": True}
        )
        connection.commit()
        return jsonify({
            "message": "Inventory record deleted. The product was moved to Products Trash."
        }), 200
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
