import os
import uuid

from flask import current_app
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from backend.routes.user_routes import role_required
from backend.database import get_db_connection
from backend.audit_logger import create_audit_log


product_bp = Blueprint(
    "products",
    __name__,
    url_prefix="/api/products"
)


def clean_text(value):
    if value is None:
        return ""
    return str(value).strip()


# GET ALL PRODUCTS
@product_bp.route("/", methods=["GET"])
@jwt_required()
def get_products():

    claims = get_jwt()

    user_role = claims.get("role")
    store_id = claims.get("store_id")

    if user_role == "ADMIN":
        return jsonify({
            "error": "ADMIN does not manage store products."
        }), 403

    if not store_id:
        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    search = clean_text(request.args.get("search"))
    category_id = clean_text(request.args.get("category_id"))

    status = clean_text(
        request.args.get("status", "active")
    ).lower()

    if status not in ["active", "inactive", "all"]:
        status = "active"

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        sql = """
            SELECT
                p.product_id,
                p.product_name,
                p.image_url,
                p.sku,
                p.barcode,
                p.part_number,
                p.product_type,
                p.brand,
                p.category_id,
                c.category_name,
                p.selling_price,
                p.reorder_level,
                p.description,
                p.is_active,
                p.store_id,
                p.created_at
            FROM products p
            INNER JOIN categories c
                ON p.category_id = c.category_id
            WHERE p.store_id = %s
        """

        params = [store_id]

        # -------------------------------------------------
        # STATUS FILTER
        # -------------------------------------------------
        if status == "active":
            sql += " AND p.is_active = 1"

        elif status == "inactive":
            sql += " AND p.is_active = 0"

        # -------------------------------------------------
        # SEARCH
        # -------------------------------------------------
        if search:

            sql += """
                AND (
                    p.product_name LIKE %s
                    OR p.sku LIKE %s
                    OR p.part_number LIKE %s
                    OR p.barcode LIKE %s
                    OR p.product_type LIKE %s
                    OR p.brand LIKE %s
                    OR c.category_name LIKE %s
                )
            """

            search_value = f"%{search}%"

            params.extend([
                search_value,
                search_value,
                search_value,
                search_value,
                search_value,
                search_value,
                search_value
            ])

        # -------------------------------------------------
        # CATEGORY FILTER
        # -------------------------------------------------
        if category_id:

            sql += """
                AND p.category_id = %s
            """

            params.append(category_id)

        sql += """
            ORDER BY p.product_id DESC
        """

        cursor.execute(sql, tuple(params))

        products = cursor.fetchall()

        return jsonify(products), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


@product_bp.route("/<int:product_id>", methods=["GET"])
@jwt_required()
def get_product(product_id):

    claims = get_jwt()

    user_role = claims.get("role")
    store_id = claims.get("store_id")

    if user_role == "ADMIN":
        return jsonify({
            "error": "ADMIN does not manage store products."
        }), 403

    if not store_id:
        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    connection = None
    cursor = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                p.product_id,
                p.product_name,
                p.image_url,
                p.sku,
                p.barcode,
                p.part_number,
                p.product_type,
                p.brand,
                p.category_id,
                c.category_name,
                p.selling_price,
                p.reorder_level,
                p.description,
                p.is_active,
                p.store_id,
                p.created_at
            FROM products p
            INNER JOIN categories c
                ON p.category_id = c.category_id
            WHERE p.product_id = %s
            AND p.store_id = %s
        """, (
            product_id,
            store_id
        ))

        product = cursor.fetchone()

        if not product:

            return jsonify({
                "error": "Product not found."
            }), 404

        return jsonify(product), 200

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()



# LOCAL BARCODE LOOKUP
@product_bp.route("/barcode/<string:barcode>", methods=["GET"])
@jwt_required()
def lookup_local_barcode(barcode):

    claims = get_jwt()
    store_id = claims.get("store_id")

    if claims.get("role") == "ADMIN":
        return jsonify({"error": "Unauthorized."}), 403

    if not store_id:
        return jsonify({
            "error": "Your account is not assigned to a store."
        }), 400

    barcode = clean_text(barcode)

    if not barcode:
        return jsonify({
            "error": "Barcode or QR code is required."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                p.product_id,
                p.product_name,
                p.image_url,
                p.sku,
                p.barcode,
                p.part_number,
                p.product_type,
                p.brand,
                p.category_id,
                c.category_name,
                p.selling_price,
                p.reorder_level,
                p.description,
                p.is_active,
                p.store_id
            FROM products p
            LEFT JOIN categories c
                ON p.category_id = c.category_id
            WHERE p.barcode = %s
              AND p.store_id = %s
              AND p.is_active = 1
            LIMIT 1
        """, (barcode, store_id))

        product = cursor.fetchone()

        if not product:
            return jsonify({
                "found": False,
                "message": "Product not found in your local inventory."
            }), 404

        return jsonify({
            "found": True,
            "product": product
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()

# CREATE PRODUCT
@product_bp.route("/", methods=["POST"])
@role_required("OWNER")
def create_product():

    data = request.get_json()

    if not data:

        return jsonify({
            "error": "Request body is required."
        }), 400

    product_name = clean_text(
        data.get("product_name")
    )

    sku = clean_text(
        data.get("sku")
    )

    category_id = data.get("category_id")

    barcode = clean_text(
        data.get("barcode")
    )

    if barcode and not barcode.isdigit():
        return jsonify({"error": "Barcode must contain numbers only."}), 400

    part_number = clean_text(
        data.get("part_number")
    )

    product_type = clean_text(
        data.get("product_type")
    )

    brand = clean_text(
        data.get("brand")
    )

    description = clean_text(
        data.get("description")
    )

    image_url = clean_text(
        data.get("image_url")
    )

    selling_price = data.get(
        "selling_price",
        0
    )

    reorder_level = data.get(
        "reorder_level",
        10
    )

    # -------------------------------------------------
    # REQUIRED FIELDS
    # -------------------------------------------------
    if not product_name:

        return jsonify({
            "error": "Product name is required."
        }), 400

    if not sku:

        return jsonify({
            "error": "SKU is required."
        }), 400

    if not category_id:

        return jsonify({
            "error": "Category is required."
        }), 400

    # -------------------------------------------------
    # SELLING PRICE
    # -------------------------------------------------
    try:

        selling_price = float(
            selling_price
        )

        if selling_price < 0:
            raise ValueError

    except (ValueError, TypeError):

        return jsonify({
            "error": "Selling price must be a valid number."
        }), 400

    # -------------------------------------------------
    # REORDER LEVEL
    # -------------------------------------------------
    try:

        reorder_level = int(
            reorder_level
        )

        if reorder_level < 0:
            raise ValueError

    except (ValueError, TypeError):

        return jsonify({
            "error": "Reorder level must be a valid number."
        }), 400

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

        # -------------------------------------------------
        # CHECK CATEGORY
        # -------------------------------------------------
        cursor.execute("""
            SELECT category_id
            FROM categories
            WHERE category_id = %s
            AND store_id = %s
            AND is_active = 1
        """, (
            category_id,
            store_id
        ))

        category = cursor.fetchone()

        if not category:

            return jsonify({
                "error": "Category not found or does not belong to your store."
            }), 400

        # -------------------------------------------------
        # CHECK SKU
        # -------------------------------------------------
        cursor.execute("""
            SELECT
                product_id,
                is_active
            FROM products
            WHERE sku = %s
            AND store_id = %s
        """, (
            sku,
            store_id
        ))

        existing_product = cursor.fetchone()

        if existing_product:

            if existing_product["is_active"] == 0:

                return jsonify({
                    "error": "This SKU belongs to a product in Trash. Restore that product or use a different SKU."
                }), 409

            return jsonify({
                "error": "SKU already exists in your store."
            }), 409

        if barcode:
            cursor.execute("""
                SELECT product_id, product_name, sku, barcode, part_number, product_type, brand, is_active
                FROM products
                WHERE barcode = %s AND store_id = %s
                LIMIT 1
            """, (barcode, store_id))
            duplicate_barcode = cursor.fetchone()
            if duplicate_barcode:
                return jsonify({
                    "error": "This barcode already belongs to another product in your store.",
                    "duplicate": duplicate_barcode
                }), 409

        # -------------------------------------------------
        # CREATE PRODUCT
        # -------------------------------------------------
        cursor.close()

        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO products (
                product_name,
                image_url,
                sku,
                barcode,
                part_number,
                product_type,
                brand,
                category_id,
                selling_price,
                reorder_level,
                description,
                is_active,
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
                %s,
                %s,
                %s,
                1,
                %s
            )
        """, (
            product_name,
            image_url if image_url else None,
            sku,
            barcode if barcode else None,
            part_number if part_number else None,
            product_type if product_type else None,
            brand if brand else None,
            category_id,
            selling_price,
            reorder_level,
            description if description else None,
            store_id
        ))

        product_id = cursor.lastrowid

        # -------------------------------------------------
        # CREATE INVENTORY RECORD
        # -------------------------------------------------
        cursor.execute("""
            INSERT INTO inventory (
                product_id,
                stock_quantity,
                store_id
            )
            VALUES (
                %s,
                0,
                %s
            )
        """, (
            product_id,
            store_id
        ))

        create_audit_log(store_id, "PRODUCT_ADDED", "PRODUCT", product_id,
                         f"Added product: {product_name}", get_jwt_identity() or None,
                         new_data={"product_name": product_name, "sku": sku, "category_id": category_id, "selling_price": selling_price, "reorder_level": reorder_level})
        connection.commit()

        return jsonify({
            "message": "Product created successfully.",
            "product_id": product_id
        }), 201

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


# UPDATE PRODUCT
@product_bp.route("/<int:product_id>", methods=["PUT"])
@role_required("OWNER")
def update_product(product_id):

    data = request.get_json()

    if not data:

        return jsonify({
            "error": "Request body is required."
        }), 400

    product_name = clean_text(
        data.get("product_name")
    )

    sku = clean_text(
        data.get("sku")
    )

    category_id = data.get("category_id")

    barcode = clean_text(
        data.get("barcode")
    )

    if barcode and not barcode.isdigit():
        return jsonify({"error": "Barcode must contain numbers only."}), 400

    part_number = clean_text(
        data.get("part_number")
    )

    product_type = clean_text(
        data.get("product_type")
    )

    brand = clean_text(
        data.get("brand")
    )

    description = clean_text(
        data.get("description")
    )

    image_url = clean_text(
        data.get("image_url")
    )

    selling_price = data.get(
        "selling_price",
        0
    )

    reorder_level = data.get(
        "reorder_level",
        10
    )

    if not product_name:

        return jsonify({
            "error": "Product name is required."
        }), 400

    if not sku:

        return jsonify({
            "error": "SKU is required."
        }), 400

    if not category_id:

        return jsonify({
            "error": "Category is required."
        }), 400

    try:

        selling_price = float(
            selling_price
        )

        if selling_price < 0:
            raise ValueError

    except (ValueError, TypeError):

        return jsonify({
            "error": "Selling price must be a valid number."
        }), 400

    try:

        reorder_level = int(
            reorder_level
        )

        if reorder_level < 0:
            raise ValueError

    except (ValueError, TypeError):

        return jsonify({
            "error": "Reorder level must be a valid number."
        }), 400

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

        # -------------------------------------------------
        # CHECK PRODUCT
        # -------------------------------------------------
        cursor.execute("""
            SELECT
            FROM products
            WHERE product_id = %s
            AND store_id = %s
        """, (
            product_id,
            store_id
        ))

        product = cursor.fetchone()

        if not product:

            return jsonify({
                "error": "Product not found in your store."
            }), 404

        # -------------------------------------------------
        # CHECK CATEGORY
        # -------------------------------------------------
        cursor.execute("""
            SELECT category_id
            FROM categories
            WHERE category_id = %s
            AND store_id = %s
            AND is_active = 1
        """, (
            category_id,
            store_id
        ))

        category = cursor.fetchone()

        if not category:

            return jsonify({
                "error": "Category not found or is inactive."
            }), 400

        # -------------------------------------------------
        # CHECK DUPLICATE SKU
        # -------------------------------------------------
        cursor.execute("""
            SELECT product_id
            FROM products
            WHERE sku = %s
            AND store_id = %s
            AND product_id != %s
        """, (
            sku,
            store_id,
            product_id
        ))

        duplicate_sku = cursor.fetchone()

        if duplicate_sku:

            return jsonify({
                "error": "SKU already exists in your store."
            }), 409

        if barcode:
            cursor.execute("""
                SELECT product_id, product_name, sku, barcode, part_number, product_type, brand, is_active
                FROM products
                WHERE barcode = %s AND store_id = %s AND product_id != %s
                LIMIT 1
            """, (barcode, store_id, product_id))
            duplicate_barcode = cursor.fetchone()
            if duplicate_barcode:
                return jsonify({
                    "error": "This barcode already belongs to another product in your store.",
                    "duplicate": duplicate_barcode
                }), 409

        cursor.close()

        cursor = connection.cursor()

        # -------------------------------------------------
        # UPDATE PRODUCT
        # -------------------------------------------------
        cursor.execute("""
            UPDATE products
            SET
                product_name = %s,
                image_url = %s,
                sku = %s,
                barcode = %s,
                part_number = %s,
                product_type = %s,
                brand = %s,
                category_id = %s,
                selling_price = %s,
                reorder_level = %s,
                description = %s
            WHERE product_id = %s
            AND store_id = %s
        """, (
            product_name,
            image_url if image_url else None,
            sku,
            barcode if barcode else None,
            part_number if part_number else None,
            product_type if product_type else None,
            brand if brand else None,
            category_id,
            selling_price,
            reorder_level,
            description if description else None,
            product_id,
            store_id
        ))

        create_audit_log(
            store_id,
            "PRODUCT_EDITED",
            "PRODUCT",
            product_id,
            f"Edited product: {product_name}",
            get_jwt_identity(),
            old_data=product,
            new_data={
                "product_name": product_name,
                "image_url": image_url or None,
                "sku": sku,
                "barcode": barcode or None,
                "part_number": part_number or None,
                "product_type": product_type or None,
                "brand": brand or None,
                "category_id": category_id,
                "selling_price": selling_price,
                "reorder_level": reorder_level,
                "description": description or None
            },
            connection=connection
        )

        return jsonify({
            "message": "Product updated successfully."
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


# SOFT DELETE / MOVE TO TRASH
@product_bp.route(
    "/<int:product_id>/deactivate",
    methods=["PUT"]
)
@role_required("OWNER")
def deactivate_product(product_id):

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

        # -------------------------------------------------
        # CHECK PRODUCT
        # -------------------------------------------------
        cursor.execute("""
            SELECT
                product_id,
                product_name,
                is_active
            FROM products
            WHERE product_id = %s
            AND store_id = %s
        """, (
            product_id,
            store_id
        ))

        product = cursor.fetchone()

        if not product:

            return jsonify({
                "error": "Product not found in your store."
            }), 404

        if product["is_active"] == 0:

            return jsonify({
                "error": "Product is already in Trash."
            }), 400

        # -------------------------------------------------
        # SOFT DELETE
        # -------------------------------------------------
        cursor.execute("""
            UPDATE products
            SET is_active = 0
            WHERE product_id = %s
            AND store_id = %s
        """, (
            product_id,
            store_id
        ))

        create_audit_log(
            store_id,
            "PRODUCT_DEACTIVATED",
            "PRODUCT",
            product_id,
            f"Deactivated product: {product.get('product_name')}",
            get_jwt_identity() or None,
            old_data=product,
            new_data={"is_active": 0},
            connection=connection
        )
        connection.commit()

        return jsonify({
            "message": "Product moved to Trash successfully."
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


# RESTORE PRODUCT
@product_bp.route(
    "/<int:product_id>/restore",
    methods=["PUT"]
)
@role_required("OWNER")
def restore_product(product_id):

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

        # -------------------------------------------------
        # CHECK PRODUCT
        # -------------------------------------------------
        cursor.execute("""
            SELECT
                p.product_id,
                p.product_name,
                p.category_id,
                p.is_active,
                c.is_active AS category_active
            FROM products p
            INNER JOIN categories c
                ON p.category_id = c.category_id
            WHERE p.product_id = %s
            AND p.store_id = %s
        """, (
            product_id,
            store_id
        ))

        product = cursor.fetchone()

        if not product:

            return jsonify({
                "error": "Product not found in your store."
            }), 404

        if product["is_active"] == 1:

            return jsonify({
                "error": "Product is already active."
            }), 400

        # -------------------------------------------------
        # CATEGORY MUST BE ACTIVE
        # -------------------------------------------------
        if product["category_active"] == 0:

            return jsonify({
                "error": "Cannot restore this product because its category is inactive. Restore the category first."
            }), 400

        # -------------------------------------------------
        # RESTORE
        # -------------------------------------------------
        cursor.execute("""
            UPDATE products
            SET is_active = 1
            WHERE product_id = %s
            AND store_id = %s
        """, (
            product_id,
            store_id
        ))

        create_audit_log(store_id, "PRODUCT_RESTORED", "PRODUCT", product_id,
                         f"Restored product: {product.get('product_name')}", get_jwt_identity() or None,
                         new_data={"is_active": 1})
        connection.commit()

        return jsonify({
            "message": "Product restored successfully."
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
            
@product_bp.route("/upload-image", methods=["POST"])
@jwt_required()
@role_required("OWNER")
def upload_product_image():
    if "image" not in request.files:
        return jsonify({"error": "No image was uploaded."}), 400

    image = request.files["image"]

    if not image.filename:
        return jsonify({"error": "Please select an image."}), 400

    allowed_extensions = {"png", "jpg", "jpeg", "webp"}

    original_name = secure_filename(image.filename)
    extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""

    if extension not in allowed_extensions:
        return jsonify({
            "error": "Only PNG, JPG, JPEG, and WEBP images are allowed."
        }), 400

    filename = f"{uuid.uuid4().hex}.{extension}"

    upload_folder = current_app.config["PRODUCT_UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    image.save(os.path.join(upload_folder, filename))

    image_url = f"/uploads/products/{filename}"

    return jsonify({
        "message": "Product image uploaded successfully.",
        "image_url": image_url
    }), 201