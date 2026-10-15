import os
import requests
from urllib.parse import quote

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from routes.user_routes import role_required
from database import get_db_connection


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


# BARCODE LOOKUP - AUTO PARTS + UPC + TECHNICAL SPECIFICATION ENRICHMENT
@product_bp.route("/autoparts/barcode/<string:ean>", methods=["GET"])
@jwt_required()
def lookup_autoparts_barcode(ean):
    ean = clean_text(ean)

    if not ean:
        return jsonify({"error": "Barcode/EAN is required."}), 400

    if not ean.isdigit():
        return jsonify({"error": "Barcode/EAN must contain numbers only."}), 400

    api_key = os.getenv("AUTOPARTS_API_KEY")
    openspec_key = os.getenv("OPENSPEC_API_KEY")

    autoparts = {
        "found": False,
        "article_id": None,
        "article_no": "",
        "product_name": "",
        "supplier_name": "",
        "supplier_id": None,
        "brand": "",
        "image": ""
    }

    upc = {
        "found": False,
        "title": "",
        "brand": "",
        "model": "",
        "description": "",
        "category": "",
        "images": [],
        "upc": "",
        "gtin": "",
        "ean": ""
    }

    openspec = {
        "found": False,
        "mpn": "",
        "manufacturer": "",
        "part_type": "",
        "specifications": {},
        "images": []
    }

    # Query AutoPartsAPI.
    if api_key:
        autoparts_url = (
            "https://auto-parts-catalog.apiprofile.com"
            "/api/v2/artlookup/search-articles-by-article-no"
        )

        try:
            response = requests.get(
                autoparts_url,
                params={
                    "langId": 4,
                    "articleType": "EAN",
                    "articleNo": ean
                },
                headers={
                    "x-apiprofile-key": api_key,
                    "Accept": "application/json"
                },
                timeout=20
            )

            if response.status_code == 200:
                data = response.json()
                articles = data.get("articles") or []

                if articles:
                    article = articles[0]
                    autoparts.update({
                        "found": True,
                        "article_id": article.get("articleId"),
                        "article_no": clean_text(article.get("articleNo")),
                        "product_name": clean_text(
                            article.get("articleProductName")
                        ),
                        "supplier_name": clean_text(
                            article.get("supplierName")
                        ),
                        "supplier_id": article.get("supplierId"),
                        "brand": clean_text(
                            article.get("brand")
                            or article.get("articleBrand")
                        ),
                        "image": clean_text(article.get("s3image"))
                    })

        except (requests.RequestException, ValueError):
            pass

    # Query UPCitemDB.
    try:
        response = requests.get(
            "https://api.upcitemdb.com/prod/trial/lookup",
            params={"upc": ean},
            headers={"Accept": "application/json"},
            timeout=20
        )

        if response.status_code == 200:
            data = response.json()
            items = data.get("items") or []

            if items:
                item = items[0]
                images = item.get("images") or []

                upc.update({
                    "found": True,
                    "title": clean_text(item.get("title")),
                    "brand": clean_text(item.get("brand")),
                    "model": clean_text(item.get("model")),
                    "description": clean_text(item.get("description")),
                    "category": clean_text(item.get("category")),
                    "images": [
                        clean_text(image)
                        for image in images
                        if clean_text(image)
                    ],
                    "upc": clean_text(item.get("upc")),
                    "gtin": clean_text(item.get("gtin")),
                    "ean": clean_text(item.get("ean"))
                })

    except (requests.RequestException, ValueError):
        pass

    # Use the first two sources to create a useful OpenSpec search phrase.
    openspec_terms = []

    if autoparts["article_no"]:
        openspec_terms.append(autoparts["article_no"])

    if upc["model"] and upc["model"] not in openspec_terms:
        openspec_terms.append(upc["model"])

    if autoparts["product_name"]:
        openspec_terms.append(autoparts["product_name"])
    elif upc["title"]:
        openspec_terms.append(upc["title"])

    if autoparts["brand"]:
        openspec_terms.append(autoparts["brand"])
    elif upc["brand"]:
        openspec_terms.append(upc["brand"])

    openspec_query = " ".join(openspec_terms).strip()

    # Query OpenSpec only when there is a meaningful part description/number.
    if openspec_query:
        openspec_url = (
            "https://api.openspecindex.com/api/v1/find/"
            + quote(openspec_query, safe="")
        )

        openspec_headers = {"Accept": "application/json"}
        if openspec_key:
            openspec_headers["X-Api-Key"] = openspec_key

        try:
            response = requests.get(
                openspec_url,
                headers=openspec_headers,
                timeout=20
            )

            if response.status_code == 200:
                data = response.json()
                parts = data.get("parts") or []

                if not parts and isinstance(data.get("part"), dict):
                    parts = [data["part"]]

                if parts:
                    part = parts[0]
                    manufacturer = part.get("manufacturer") or {}
                    assets = part.get("assets") or {}
                    raw_specs = part.get("specs") or {}
                    facts = part.get("facts") or []

                    specifications = {}

                    if isinstance(raw_specs, dict):
                        specifications.update({
                            clean_text(key): clean_text(value)
                            for key, value in raw_specs.items()
                            if clean_text(key) and clean_text(value)
                        })

                    if isinstance(facts, list):
                        for fact in facts:
                            if not isinstance(fact, dict):
                                continue
                            key = clean_text(fact.get("attr"))
                            value = clean_text(fact.get("value"))
                            if key and value and key not in specifications:
                                specifications[key] = value

                    asset_images = assets.get("images") or []
                    image_urls = []

                    if isinstance(asset_images, list):
                        for image in asset_images:
                            if isinstance(image, str):
                                image_urls.append(image)
                            elif isinstance(image, dict):
                                image_url = (
                                    image.get("url")
                                    or image.get("href")
                                    or image.get("src")
                                )
                                if image_url:
                                    image_urls.append(clean_text(image_url))

                    # Keep only useful, user-facing specifications.
                    important_keys = {
                        "material", "type", "part type", "product type",
                        "thread size", "thread", "thread pitch", "thread reach",
                        "hex size", "diameter", "outer diameter", "inner diameter",
                        "length", "width", "height", "thickness", "voltage",
                        "current", "power", "capacity", "color", "finish",
                        "electrode type", "terminal type", "mounting type"
                    }

                    important_specifications = {}
                    for key, value in specifications.items():
                        normalized_key = clean_text(key).lower().replace("_", " ").strip()
                        if normalized_key in important_keys:
                            important_specifications[clean_text(key)] = clean_text(value)

                    openspec.update({
                        "found": True,
                        "mpn": clean_text(part.get("mpn")),
                        "manufacturer": clean_text(
                            manufacturer.get("name")
                            if isinstance(manufacturer, dict)
                            else manufacturer
                        ),
                        "part_type": clean_text(part.get("partType")),
                        "specifications": important_specifications,
                        "images": list(dict.fromkeys(
                            image for image in image_urls if image
                        ))
                    })

        except (requests.RequestException, ValueError):
            pass

    # Merge product fields. Automotive-specific data has priority.
    product_name = (
        autoparts["product_name"]
        or upc["title"]
        or openspec["part_type"]
        or ""
    )

    part_number = (
        autoparts["article_no"]
        or upc["model"]
        or openspec["mpn"]
        or ""
    )

    brand = (
        autoparts["brand"]
        or upc["brand"]
        or openspec["manufacturer"]
        or ""
    )

    description = upc["description"]

    images = []

    if autoparts["image"]:
        images.append(autoparts["image"])

    for image in upc["images"] + openspec["images"]:
        if image and image not in images:
            images.append(image)

    found = (
        autoparts["found"]
        or upc["found"]
        or openspec["found"]
    )

    duplicate = None
    connection = None
    cursor = None

    try:
        store_id = get_jwt().get("store_id")
        if store_id:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT p.product_id, p.product_name, p.sku, p.barcode,
                       p.part_number, p.product_type, p.brand, p.is_active,
                       COALESCE(i.stock_quantity, 0) AS stock_quantity
                FROM products p
                LEFT JOIN inventory i
                    ON i.product_id = p.product_id AND i.store_id = p.store_id
                WHERE p.barcode = %s AND p.store_id = %s
                LIMIT 1
            """, (ean, store_id))
            duplicate = cursor.fetchone()
    except Exception:
        duplicate = None
    finally:
        if cursor: cursor.close()
        if connection: connection.close()

    # Only merged product data is returned. API names, statuses, errors,
    # source URLs and lookup details stay on the server.
    return jsonify({
        "found": found,
        "ean": ean,
        "product_name": product_name,
        "part_number": part_number,
        "brand": brand,
        "description": description,
        "supplier_name": autoparts["supplier_name"],
        "supplier_id": autoparts["supplier_id"],
        "upc": upc["upc"],
        "gtin": upc["gtin"],
        "image": images[0] if images else "",
        "images": images,
        "category": upc["category"],
        "product_type": openspec["part_type"],
        "specifications": openspec["specifications"],
        "duplicate": duplicate,
        "message": (
            "Product information found. Review it before saving."
            if found
            else "No product information was found."
        )
    }), 200


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



# GET COMPATIBILITY BRANDS
@product_bp.route("/compatibility/brands", methods=["GET"])
@jwt_required()
def get_compatibility_brands():
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT brand_id, brand_name
            FROM item_brands
            ORDER BY brand_name ASC
        """)
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# GET COMPATIBILITY MODELS
@product_bp.route("/compatibility/models", methods=["GET"])
@jwt_required()
def get_compatibility_models():
    brand_id = clean_text(request.args.get("brand_id"))
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        sql = """
            SELECT
                m.model_id,
                m.brand_id,
                b.brand_name,
                m.model_name,
                m.model_year
            FROM item_models m
            INNER JOIN item_brands b ON m.brand_id = b.brand_id
        """
        params = []
        if brand_id:
            sql += " WHERE m.brand_id = %s"
            params.append(brand_id)
        sql += " ORDER BY b.brand_name ASC, m.model_name ASC, m.model_year ASC"
        cursor.execute(sql, tuple(params))
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# CREATE COMPATIBILITY BRAND
@product_bp.route("/compatibility/brands", methods=["POST"])
@role_required("OWNER")
def create_compatibility_brand():
    data = request.get_json() or {}
    brand_name = clean_text(data.get("brand_name"))
    if not brand_name:
        return jsonify({"error": "Brand name is required."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT brand_id, brand_name FROM item_brands WHERE LOWER(brand_name) = LOWER(%s) LIMIT 1", (brand_name,))
        existing = cursor.fetchone()
        if existing:
            return jsonify({"message": "Brand already exists.", "brand": existing}), 200
        cursor.execute("INSERT INTO item_brands (brand_name) VALUES (%s)", (brand_name,))
        brand_id = cursor.lastrowid
        connection.commit()
        return jsonify({"message": "Compatibility brand created successfully.", "brand_id": brand_id}), 201
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# CREATE COMPATIBILITY MODEL
@product_bp.route("/compatibility/models", methods=["POST"])
@role_required("OWNER")
def create_compatibility_model():
    data = request.get_json() or {}
    brand_id = data.get("brand_id")
    model_name = clean_text(data.get("model_name"))
    model_year = clean_text(data.get("model_year"))

    if not brand_id:
        return jsonify({"error": "Brand is required."}), 400
    if not model_name:
        return jsonify({"error": "Model name is required."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT brand_id FROM item_brands WHERE brand_id = %s LIMIT 1", (brand_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Compatibility brand not found."}), 404

        cursor.execute("""
            SELECT model_id, brand_id, model_name, model_year
            FROM item_models
            WHERE brand_id = %s
              AND LOWER(model_name) = LOWER(%s)
              AND COALESCE(model_year, '') = COALESCE(%s, '')
            LIMIT 1
        """, (brand_id, model_name, model_year or None))
        existing = cursor.fetchone()
        if existing:
            return jsonify({"message": "Model already exists.", "model": existing}), 200

        cursor.execute("""
            INSERT INTO item_models (brand_id, model_name, model_year)
            VALUES (%s, %s, %s)
        """, (brand_id, model_name, model_year or None))
        model_id = cursor.lastrowid
        connection.commit()
        return jsonify({"message": "Compatibility model created successfully.", "model_id": model_id}), 201
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()



# AUTOMATIC COMPATIBILITY LOOKUP
@product_bp.route("/<int:product_id>/compatibility/auto", methods=["POST"])
@role_required("OWNER")
def auto_product_compatibility(product_id):
    store_id = get_jwt().get("store_id")
    if not store_id:
        return jsonify({"error": "Your account is not assigned to a store."}), 400

    api_key = os.getenv("AUTOPARTS_API_KEY")
    if not api_key:
        return jsonify({"error": "Automatic vehicle compatibility is not configured."}), 503

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT product_id, part_number
            FROM products
            WHERE product_id = %s AND store_id = %s
            LIMIT 1
        """, (product_id, store_id))
        product = cursor.fetchone()

        if not product:
            return jsonify({"error": "Product not found in your store."}), 404

        article_no = clean_text(product.get("part_number"))
        if not article_no:
            return jsonify({
                "found": False,
                "saved": 0,
                "message": "This product has no part number, so automatic vehicle compatibility cannot be looked up."
            }), 200

        headers = {
            "x-apiprofile-key": api_key,
            "Accept": "application/json",
        }

        # -------------------------------------------------
        # STEP 1: Resolve the article and supplier.
        # This lets us use the more precise supplier-specific
        # compatibility endpoint when possible.
        # -------------------------------------------------
        article_id = None
        supplier_id = None

        search_url = (
            "https://auto-parts-catalog.apiprofile.com"
            "/api/v2/artlookup/search-articles-by-article-no"
        )

        try:
            search_response = requests.get(
                search_url,
                params={
                    "langId": 4,
                    "articleType": "ArticleNumber",
                    "articleNo": article_no,
                },
                headers=headers,
                timeout=20,
            )

            if search_response.status_code == 200:
                search_payload = search_response.json()
                articles = search_payload.get("articles") or []
                if articles:
                    article = articles[0]
                    article_id = article.get("articleId")
                    supplier_id = article.get("supplierId")
        except (requests.RequestException, ValueError):
            pass

        # -------------------------------------------------
        # STEP 2: Ask AutoPartsAPI for compatible motorbikes.
        # API-GAR-009 is preferred when supplierId is known;
        # API-GAR-008 is the fallback.
        # -------------------------------------------------
        compatibility_url = (
            "https://auto-parts-catalog.apiprofile.com"
            "/api/v2/articles/get-compatible-cars-by-article-number"
            "/type-id/3"
        )

        params = {
            "langId": 4,
            "countryFilterId": 63,
            "articleNo": article_no,
        }

        if supplier_id:
            params["supplierId"] = supplier_id

        response = requests.get(
            compatibility_url,
            params=params,
            headers=headers,
            timeout=20,
        )

        # If the supplier-specific request is rejected/not found,
        # retry once without supplierId using API-GAR-008.
        if response.status_code != 200 and supplier_id:
            params.pop("supplierId", None)
            response = requests.get(
                compatibility_url,
                params=params,
                headers=headers,
                timeout=20,
            )

        if response.status_code != 200:
            return jsonify({
                "found": False,
                "saved": 0,
                "message": "Automatic vehicle compatibility could not be retrieved right now."
            }), 200

        payload = response.json()

        # -------------------------------------------------
        # STEP 3: Parse the compatibility response.
        # AutoPartsAPI can nest manufacturer/model/year data
        # at different levels, so we inspect all nested objects.
        # -------------------------------------------------
        def collect_objects(value, output):
            if isinstance(value, dict):
                output.append(value)
                for child in value.values():
                    collect_objects(child, output)
            elif isinstance(value, list):
                for child in value:
                    collect_objects(child, output)

        def first_value(obj, keys):
            lowered = {
                str(k).lower().replace("_", "").replace("-", ""): v
                for k, v in obj.items()
            }
            for key in keys:
                normalized = key.lower().replace("_", "").replace("-", "")
                value = lowered.get(normalized)
                if value not in (None, ""):
                    return value
            return None

        def object_name(value, keys):
            if isinstance(value, dict):
                return first_value(value, keys)
            return value

        def make_year_value(obj):
            direct = first_value(obj, [
                "modelYear", "year", "productionYears", "productionYear",
                "years", "constructionYear"
            ])
            if direct not in (None, "") and not isinstance(direct, dict):
                return clean_text(direct)

            year_from = first_value(obj, [
                "modelYearFrom", "yearFrom", "productionYearFrom",
                "constructionYearFrom", "productionFrom", "yearStart",
                "constructionYearStart"
            ])
            year_to = first_value(obj, [
                "modelYearTo", "yearTo", "productionYearTo",
                "constructionYearTo", "productionTo", "yearEnd",
                "constructionYearEnd"
            ])

            year_from = clean_text(year_from)
            year_to = clean_text(year_to)

            if year_from and year_to:
                return f"{year_from}-{year_to}"
            return year_from or year_to

        def parse_vehicles(source):
            objects = []
            collect_objects(source, objects)

            vehicles = []
            seen = set()

            for obj in objects:
                brand_name = first_value(obj, [
                    "manufacturerName", "manufacturer", "manufacturerDescription",
                    "make", "brandName", "brand", "manuName"
                ])
                model_name = first_value(obj, [
                    "modelName", "model", "modelSeries", "modelSeriesName",
                    "modelDescription", "vehicleModel", "vehicleName", "typeName"
                ])

                brand_name = object_name(brand_name, [
                    "name", "manufacturerName", "brandName", "description"
                ])
                model_name = object_name(model_name, [
                    "name", "modelName", "modelSeriesName", "description"
                ])

                brand_name = clean_text(brand_name)
                model_name = clean_text(model_name)
                year = make_year_value(obj)

                if not brand_name or not model_name:
                    continue

                key = (
                    brand_name.lower(),
                    model_name.lower(),
                    clean_text(year).lower()
                )

                if key in seen:
                    continue

                seen.add(key)
                vehicles.append({
                    "brand_name": brand_name,
                    "model_name": model_name,
                    "model_year": year or None,
                })

            return vehicles

        vehicles = parse_vehicles(payload)

        # -------------------------------------------------
        # STEP 4: If GAR-008 returned no parseable vehicles,
        # use the resolved article ID and ask for complete
        # article details. The complete-details endpoint
        # includes compatibility information as well.
        # -------------------------------------------------
        if not vehicles and article_id:
            details_url = (
                "https://auto-parts-catalog.apiprofile.com"
                "/api/v2/articles/article-complete-details/type-id/3"
            )

            try:
                details_response = requests.get(
                    details_url,
                    params={
                        "articleId": article_id,
                        "langId": 4,
                    },
                    headers=headers,
                    timeout=20,
                )

                if details_response.status_code == 200:
                    vehicles = parse_vehicles(details_response.json())
            except (requests.RequestException, ValueError):
                pass

        if not vehicles:
            return jsonify({
                "found": False,
                "saved": 0,
                "vehicles": [],
                "message": "No motorcycle compatibility information was found for this part number."
            }), 200

        # -------------------------------------------------
        # STEP 5: Save the normalized fitment into the
        # existing item_brands/item_models/product_compatibility
        # tables.
        # -------------------------------------------------
        saved = 0

        for vehicle in vehicles:
            cursor.execute(
                """
                SELECT brand_id
                FROM item_brands
                WHERE LOWER(brand_name) = LOWER(%s)
                LIMIT 1
                """,
                (vehicle["brand_name"],)
            )
            brand = cursor.fetchone()

            if brand:
                brand_id = brand["brand_id"]
            else:
                cursor.execute(
                    "INSERT INTO item_brands (brand_name) VALUES (%s)",
                    (vehicle["brand_name"],)
                )
                brand_id = cursor.lastrowid

            cursor.execute(
                """
                SELECT model_id
                FROM item_models
                WHERE brand_id = %s
                  AND LOWER(model_name) = LOWER(%s)
                  AND COALESCE(model_year, '') = COALESCE(%s, '')
                LIMIT 1
                """,
                (
                    brand_id,
                    vehicle["model_name"],
                    vehicle["model_year"]
                )
            )
            model = cursor.fetchone()

            if model:
                model_id = model["model_id"]
            else:
                cursor.execute(
                    """
                    INSERT INTO item_models (brand_id, model_name, model_year)
                    VALUES (%s, %s, %s)
                    """,
                    (
                        brand_id,
                        vehicle["model_name"],
                        vehicle["model_year"]
                    )
                )
                model_id = cursor.lastrowid

            cursor.execute(
                """
                SELECT compatibility_id
                FROM product_compatibility
                WHERE product_id = %s AND model_id = %s
                LIMIT 1
                """,
                (product_id, model_id)
            )

            if cursor.fetchone():
                continue

            cursor.execute(
                """
                INSERT INTO product_compatibility (product_id, model_id)
                VALUES (%s, %s)
                """,
                (product_id, model_id)
            )
            saved += 1

        connection.commit()

        return jsonify({
            "found": True,
            "saved": saved,
            "vehicles": vehicles,
            "message": f"{len(vehicles)} compatible motorcycle application(s) found."
        }), 200

    except requests.RequestException:
        if connection:
            connection.rollback()
        return jsonify({
            "found": False,
            "saved": 0,
            "message": "Automatic vehicle compatibility is temporarily unavailable."
        }), 200
    except ValueError:
        if connection:
            connection.rollback()
        return jsonify({
            "found": False,
            "saved": 0,
            "message": "The compatibility service returned an unexpected response."
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


# GET PRODUCT COMPATIBILITY
@product_bp.route("/<int:product_id>/compatibility", methods=["GET"])
@jwt_required()
def get_product_compatibility(product_id):
    store_id = get_jwt().get("store_id")
    if not store_id:
        return jsonify({"error": "Your account is not assigned to a store."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT product_id
            FROM products
            WHERE product_id = %s AND store_id = %s
            LIMIT 1
        """, (product_id, store_id))
        if not cursor.fetchone():
            return jsonify({"error": "Product not found in your store."}), 404

        cursor.execute("""
            SELECT
                pc.compatibility_id,
                pc.product_id,
                m.model_id,
                b.brand_id,
                b.brand_name,
                m.model_name,
                m.model_year
            FROM product_compatibility pc
            INNER JOIN item_models m ON pc.model_id = m.model_id
            INNER JOIN item_brands b ON m.brand_id = b.brand_id
            WHERE pc.product_id = %s
            ORDER BY b.brand_name ASC, m.model_name ASC, m.model_year ASC
        """, (product_id,))
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# ADD PRODUCT COMPATIBILITY
@product_bp.route("/<int:product_id>/compatibility", methods=["POST"])
@role_required("OWNER")
def add_product_compatibility(product_id):
    data = request.get_json() or {}
    model_id = data.get("model_id")
    store_id = get_jwt().get("store_id")

    if not store_id:
        return jsonify({"error": "Your account is not assigned to a store."}), 400
    if not model_id:
        return jsonify({"error": "Model is required."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT product_id FROM products WHERE product_id = %s AND store_id = %s LIMIT 1", (product_id, store_id))
        if not cursor.fetchone():
            return jsonify({"error": "Product not found in your store."}), 404

        cursor.execute("SELECT model_id FROM item_models WHERE model_id = %s LIMIT 1", (model_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Compatibility model not found."}), 404

        cursor.execute("SELECT compatibility_id FROM product_compatibility WHERE product_id = %s AND model_id = %s LIMIT 1", (product_id, model_id))
        if cursor.fetchone():
            return jsonify({"error": "This compatibility is already assigned to the product."}), 409

        cursor.execute("INSERT INTO product_compatibility (product_id, model_id) VALUES (%s, %s)", (product_id, model_id))
        compatibility_id = cursor.lastrowid
        connection.commit()
        return jsonify({"message": "Compatibility added successfully.", "compatibility_id": compatibility_id}), 201
    except Exception as e:
        if connection:
            connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


# DELETE PRODUCT COMPATIBILITY
@product_bp.route("/<int:product_id>/compatibility/<int:compatibility_id>", methods=["DELETE"])
@role_required("OWNER")
def delete_product_compatibility(product_id, compatibility_id):
    store_id = get_jwt().get("store_id")
    if not store_id:
        return jsonify({"error": "Your account is not assigned to a store."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT pc.compatibility_id
            FROM product_compatibility pc
            INNER JOIN products p ON pc.product_id = p.product_id
            WHERE pc.compatibility_id = %s
              AND pc.product_id = %s
              AND p.store_id = %s
            LIMIT 1
        """, (compatibility_id, product_id, store_id))
        if not cursor.fetchone():
            return jsonify({"error": "Compatibility record not found."}), 404

        cursor.execute("DELETE FROM product_compatibility WHERE compatibility_id = %s", (compatibility_id,))
        connection.commit()
        return jsonify({"message": "Compatibility removed successfully."}), 200
    except Exception as e:
        if connection:
            connection.rollback()
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
                product_id,
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

        connection.commit()

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