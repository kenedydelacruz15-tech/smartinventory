import logging

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from backend.routes.user_routes import role_required
from backend.database import get_db_connection
from backend.audit_logger import create_audit_log
from backend.services.stock_out_schema import (
    ensure_stock_out_store_foreign_key,
    stock_out_error_message,
)


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
        connection.start_transaction()

        cursor = connection.cursor(
            dictionary=True
        )

        sql = """
            SELECT
                i.inventory_id,
                i.product_id,
                p.product_name,
                p.image_url AS product_image_url,
                p.sku,
                p.part_number,
                p.barcode,
                p.brand,
                p.selling_price,
                p.reorder_level,
                c.category_id,
                c.category_name,
                i.stock_quantity,
                i.is_active,
                i.store_id,
                i.updated_at,
                CAST(p.created_at AS CHAR) AS product_created_at,
                (
                    SELECT CAST(MAX(sm.movement_date) AS CHAR)
                    FROM stock_movements sm
                    WHERE sm.product_id = i.product_id
                      AND sm.store_id = i.store_id
                      AND sm.movement_type = 'STOCK_IN'
                      AND COALESCE(sm.reference_type, '') <> 'ADJUSTMENT'
                ) AS last_stock_in_at,
                (
                    SELECT CAST(MAX(sm.movement_date) AS CHAR)
                    FROM stock_movements sm
                    WHERE sm.product_id = i.product_id
                      AND sm.store_id = i.store_id
                      AND sm.movement_type = 'STOCK_OUT'
                      AND COALESCE(sm.reference_type, '') <> 'ADJUSTMENT'
                ) AS last_stock_out_at,
                (
                    SELECT CAST(MAX(sm.movement_date) AS CHAR)
                    FROM stock_movements sm
                    WHERE sm.product_id = i.product_id
                      AND sm.store_id = i.store_id
                      AND sm.reference_type = 'ADJUSTMENT'
                ) AS last_adjusted_at,
                (
                    SELECT GROUP_CONCAT(DISTINCT si.supplier_id)
                    FROM stock_in si
                    WHERE si.product_id = i.product_id
                      AND si.store_id = i.store_id
                      AND si.supplier_id IS NOT NULL
                ) AS supplier_ids
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
                    OR p.part_number LIKE %s
                    OR p.barcode LIKE %s
                    OR p.brand LIKE %s
                    OR c.category_name LIKE %s
                )
            """

            value = f"%{search}%"

            params.extend([
                value,
                value,
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
        connection.start_transaction()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute("""
            SELECT
                i.inventory_id,
                i.product_id,
                p.product_name,
                p.image_url AS product_image_url,
                p.sku,
                p.part_number,
                p.barcode,
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
            connection.rollback()
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
@inventory_bp.route("/<int:inventory_id>", methods=["PUT"])
@role_required("OWNER")
def update_inventory(inventory_id):

    data = request.get_json() or {}

    try:
        stock_quantity = int(data.get("stock_quantity"))

        if stock_quantity < 0:
            raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "error": "Stock quantity must be a valid non-negative number."
        }), 400

    reference_type = str(
        data.get("reference_type", "ADJUSTMENT")
    ).strip().upper()

    remarks = str(data.get("remarks", "")).strip()

    if reference_type == "":
        reference_type = "ADJUSTMENT"

    store_id = get_jwt().get("store_id")

    if not store_id:
        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()

        cursor = connection.cursor(dictionary=True)

        # Lock inventory record to prevent concurrent adjustments.
        cursor.execute("""
            SELECT
                i.inventory_id,
                i.product_id,
                p.product_name,
                i.stock_quantity,
                i.is_active
            FROM inventory i
            INNER JOIN products p
                ON p.product_id = i.product_id
                AND p.store_id = i.store_id
            WHERE i.inventory_id = %s
                AND i.store_id = %s
            FOR UPDATE
        """, (inventory_id, store_id))

        item = cursor.fetchone()

        if not item:
            connection.rollback()
            return jsonify({
                "error": "Inventory record not found."
            }), 404

        if item["is_active"] == 0:
            connection.rollback()
            return jsonify({
                "error": "Cannot adjust inactive inventory."
            }), 400

        previous_quantity = int(item["stock_quantity"] or 0)

        # Prevent direct stock increases.
        if stock_quantity > previous_quantity:
            connection.rollback()
            return jsonify({
                "error": "Stock increases must be recorded through a Purchase Order and receiving."
            }), 403

        if previous_quantity == stock_quantity:
            connection.rollback()
            return jsonify({
                "message": "Inventory quantity is unchanged.",
                "previous_quantity": previous_quantity,
                "new_quantity": stock_quantity
            }), 200

        # Update inventory.
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

        movement_quantity = abs(stock_quantity - previous_quantity)

        movement_type = (
            "STOCK_IN"
            if stock_quantity > previous_quantity
            else "STOCK_OUT"
        )

        # Record stock movement.
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
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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

        # Audit log uses the SAME transaction connection.
        create_audit_log(
            action="INVENTORY_ADJUSTED",
            entity_type="INVENTORY",
            entity_id=str(inventory_id),
            description=(
                f"Adjusted stock for {item['product_name']}: "
                f"{previous_quantity} → {stock_quantity} units."
            ),
            old_data={
                "stock_quantity": previous_quantity
            },
            new_data={
                "stock_quantity": stock_quantity,
                "adjustment": movement_quantity,
                "movement_type": movement_type,
                "reference_type": reference_type,
                "remarks": remarks
            },
            connection=connection
        )

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

        logging.getLogger(__name__).exception(
            "UPDATE INVENTORY ERROR"
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
        quantity = int(data.get("quantity"))

        if quantity <= 0:
            raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "error": "Stock-in quantity must be greater than 0."
        }), 400

    reference_type = str(
        data.get("reference_type", "SUPPLIER")
    ).strip().upper()

    allowed_references = [
        "SUPPLIER",
        "CUSTOMER_RETURN",
        "TRANSFER",
        "ADJUSTMENT",
        "OTHER"
    ]

    if reference_type not in allowed_references:
        return jsonify({
            "error": "Invalid stock-in reason.",
            "allowed_reasons": allowed_references
        }), 400

    supplier_id = data.get("supplier_id")

    if supplier_id in ("", None):
        supplier_id = None
    else:
        try:
            supplier_id = int(supplier_id)

            if supplier_id <= 0:
                raise ValueError

        except (ValueError, TypeError):
            return jsonify({
                "error": "Supplier ID must be a valid number."
            }), 400

    reference_number = str(
        data.get("reference_number", "")
    ).strip()

    remarks = str(data.get("remarks", "")).strip()

    movement_remarks = remarks

    if reference_number:
        movement_remarks = f"Reference: {reference_number}"

        if remarks:
            movement_remarks += f" | {remarks}"

    store_id = get_jwt().get("store_id")

    if not store_id:
        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()

        cursor = connection.cursor(dictionary=True)

        # Lock inventory before modifying stock.
        cursor.execute("""
            SELECT
                i.inventory_id,
                i.product_id,
                p.product_name,
                i.stock_quantity,
                i.is_active
            FROM inventory i
            INNER JOIN products p
                ON p.product_id = i.product_id
                AND p.store_id = i.store_id
            WHERE i.inventory_id = %s
                AND i.store_id = %s
            FOR UPDATE
        """, (
            inventory_id,
            store_id
        ))

        item = cursor.fetchone()

        if not item:
            connection.rollback()
            return jsonify({
                "error": "Inventory record not found."
            }), 404

        # Validate supplier.
        if supplier_id is not None:

            cursor.execute("""
                SELECT supplier_id
                FROM suppliers
                WHERE supplier_id = %s
                    AND store_id = %s
                    AND deleted_at IS NULL
            """, (
                supplier_id,
                store_id
            ))

            if not cursor.fetchone():
                connection.rollback()
                return jsonify({
                    "error": "Supplier not found or does not belong to your store."
                }), 404

        if item["is_active"] == 0:
            connection.rollback()
            return jsonify({
                "error": "Cannot add stock to inactive inventory."
            }), 400

        previous_quantity = int(item["stock_quantity"] or 0)
        new_quantity = previous_quantity + quantity

        # Insert stock-in record.
        cursor.execute("""
            INSERT INTO stock_in (
                product_id,
                quantity,
                supplier_id,
                store_id
            )
            VALUES (%s, %s, %s, %s)
        """, (
            item["product_id"],
            quantity,
            supplier_id,
            store_id
        ))

        stock_in_id = cursor.lastrowid

        # Update inventory.
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

        # Record movement.
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
            stock_in_id,
            movement_remarks or None,
            store_id
        ))

        # Audit log shares the transaction connection.
        create_audit_log(
            action="STOCK_IN_CREATED",
            entity_type="INVENTORY",
            entity_id=str(inventory_id),
            description=(
                f"Added {quantity} units of {item['product_name']}. "
                f"Stock changed from {previous_quantity} "
                f"to {new_quantity}."
            ),
            old_data={
                "stock_quantity": previous_quantity
            },
            new_data={
                "stock_in_id": stock_in_id,
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "supplier_id": supplier_id,
                "quantity": quantity,
                "reason": reference_type,
                "reference_number": reference_number,
                "remarks": remarks,
                "stock_quantity": new_quantity
            },
            connection=connection
        )

        connection.commit()

        return jsonify({
            "message": "Stock added successfully.",
            "stock_in_id": stock_in_id,
            "supplier_id": supplier_id,
            "previous_quantity": previous_quantity,
            "new_quantity": new_quantity,
            "quantity_added": quantity,
            "reason": reference_type
        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        logging.getLogger(__name__).exception(
            "STOCK IN ERROR"
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
        quantity = int(data.get("quantity"))

        if quantity <= 0:
            raise ValueError

    except (ValueError, TypeError):
        return jsonify({
            "error": "Stock-out quantity must be greater than 0."
        }), 400

    reference_type = str(
        data.get("reference_type", "OTHER")
    ).strip().upper()

    allowed_references = [
        "SALE",
        "DAMAGED",
        "RETURN_TO_SUPPLIER",
        "TRANSFER",
        "LOST",
        "ADJUSTMENT",
        "OTHER"
    ]

    if reference_type not in allowed_references:
        return jsonify({
            "error": "Invalid stock-out reason.",
            "allowed_reasons": allowed_references
        }), 400

    reference_number = str(
        data.get("reference_number", "")
    ).strip()

    remarks = str(data.get("remarks", "")).strip()

    movement_remarks = remarks

    if reference_number:
        movement_remarks = f"Reference: {reference_number}"

        if remarks:
            movement_remarks += f" | {remarks}"

    store_id = get_jwt().get("store_id")

    if not store_id:
        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()

        connection.start_transaction()

        cursor = connection.cursor(dictionary=True)

        # Lock inventory before modifying stock.
        cursor.execute("""
            SELECT
                i.inventory_id,
                i.product_id,
                p.product_name,
                i.stock_quantity,
                i.is_active
            FROM inventory i
            INNER JOIN products p
                ON p.product_id = i.product_id
                AND p.store_id = i.store_id
            WHERE i.inventory_id = %s
                AND i.store_id = %s
            FOR UPDATE
        """, (
            inventory_id,
            store_id
        ))

        item = cursor.fetchone()

        if not item:
            connection.rollback()
            return jsonify({
                "error": "Inventory record not found."
            }), 404

        if item["is_active"] == 0:
            connection.rollback()
            return jsonify({
                "error": "Cannot remove stock from inactive inventory."
            }), 400

        previous_quantity = int(item["stock_quantity"] or 0)

        if quantity > previous_quantity:
            connection.rollback()
            return jsonify({
                "error": "Stock-out quantity cannot be greater than the current stock."
            }), 400

        new_quantity = previous_quantity - quantity

        legacy_reason = {
            "SALE": "SOLD",
            "DAMAGED": "DAMAGED",
            "RETURN_TO_SUPPLIER": "RETURNED_TO_SUPPLIER",
            "TRANSFER": "OTHER",
            "LOST": "LOST",
            "ADJUSTMENT": "OTHER",
            "OTHER": "OTHER"
        }[reference_type]

        legacy_stock_out_reason = (
            reference_type
            if reference_type in {
                "DAMAGED",
                "RETURN_TO_SUPPLIER",
                "TRANSFER",
                "LOST",
                "OTHER"
            }
            else "OTHER"
        )

        stock_out_notes = f"Reason: {reference_type}"

        if movement_remarks:
            stock_out_notes += f" | {movement_remarks}"

        # Insert stock-out record.
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
            VALUES (
                %s,
                %s,
                %s,
                %s,
                CURRENT_TIMESTAMP,
                %s,
                %s
            )
        """, (
            item["product_id"],
            quantity,
            legacy_reason,
            stock_out_notes,
            store_id,
            legacy_stock_out_reason
        ))

        stock_out_id = cursor.lastrowid

        # Update inventory.
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

        # Record movement.
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
            stock_out_id,
            movement_remarks or None,
            store_id
        ))

        # Audit log shares the transaction connection.
        create_audit_log(
            action="STOCK_OUT_CREATED",
            entity_type="INVENTORY",
            entity_id=str(inventory_id),
            description=(
                f"Removed {quantity} units of {item['product_name']}. "
                f"Stock changed from {previous_quantity} "
                f"to {new_quantity}."
            ),
            old_data={
                "stock_quantity": previous_quantity
            },
            new_data={
                "stock_out_id": stock_out_id,
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "quantity": quantity,
                "reason": reference_type,
                "reference_number": reference_number,
                "remarks": remarks,
                "stock_quantity": new_quantity
            },
            connection=connection
        )

        connection.commit()

        return jsonify({
            "message": "Stock removed successfully.",
            "stock_out_id": stock_out_id,
            "previous_quantity": previous_quantity,
            "new_quantity": new_quantity,
            "quantity_removed": quantity,
            "reason": reference_type
        }), 200

    except Exception as e:

        if connection:
            connection.rollback()

        logging.getLogger(__name__).exception(
            "Stock-out request failed"
        )

        return jsonify({
            "error": stock_out_error_message(e)
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
            connection.rollback()
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

        create_audit_log(
            action="INVENTORY_DEACTIVATED",
            entity_type="INVENTORY",
            entity_id=str(inventory_id),
            description=(
                f"Deactivated inventory item: {item['product_name']}."
            ),
            old_data=item,
            new_data={
                "is_active": 0
            },
            connection=connection
        )
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

        create_audit_log(
            action="INVENTORY_RESTORED",
            entity_type="INVENTORY",
            entity_id=str(inventory_id),
            description=(
                f"Restored inventory item: {restore_item['product_name']}."
            ),
            old_data={
                "is_active": 0
            },
            new_data={
                "is_active": 1
            },
            connection=connection
        )
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
            action="INVENTORY_PERMANENTLY_DELETED",
            entity_type="INVENTORY",
            entity_id=str(inventory_id),
            description=(
                f"Permanently deleted inventory record for "
                f"product: {item['product_name']}."
            ),
            old_data=item,
            new_data={
                "inventory_record_deleted": True,
                "product_moved_to_trash": True
            },
            connection=connection
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
