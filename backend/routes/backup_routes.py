
import os
import re
import json
import hashlib
import subprocess

from pathlib import Path
from datetime import datetime, date

from flask import Blueprint, jsonify, Response, send_file, request
from flask_jwt_extended import jwt_required, get_jwt

from backend.database import get_db_connection


backup_bp = Blueprint("backup", __name__, url_prefix="/backup")

# Backup storage
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKUP_DIR = PROJECT_ROOT / "database_backups"

# MySQL utilities
MYSQL_BIN = Path(
    os.getenv("MYSQL_BIN_DIR", r"C:\xampp\mysql\bin")
)

MYSQLDUMP_EXE = MYSQL_BIN / "mysqldump.exe"
MYSQL_EXE = MYSQL_BIN / "mysql.exe"

# Only allow application-generated backup filenames
BACKUP_PATTERN = re.compile(
    r"^smart_inventory_(manual|pre_restore)_\d{8}_\d{6}\.sql$"
)

MAX_RESTORE_SECONDS = 600


# --------------------------------------------------
# ADMIN AUTHORIZATION
# --------------------------------------------------

def admin_required():
    return get_jwt().get("role") == "ADMIN"


# --------------------------------------------------
# DATABASE CONFIGURATION
# --------------------------------------------------

def database_config():
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": str(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "database": os.getenv("DB_NAME", ""),
    }


def mysql_environment(config):
    env = os.environ.copy()
    env["MYSQL_PWD"] = config["password"]
    return env


def validate_configuration():
    config = database_config()

    if not config["database"]:
        raise RuntimeError("DB_NAME is not configured.")

    if not re.fullmatch(r"[A-Za-z0-9_]+", config["database"]):
        raise RuntimeError("Invalid database name configuration.")

    if not MYSQLDUMP_EXE.is_file():
        raise RuntimeError("mysqldump.exe was not found.")

    if not MYSQL_EXE.is_file():
        raise RuntimeError("mysql.exe was not found.")

    return config


# --------------------------------------------------
# SHA256 INTEGRITY
# --------------------------------------------------

def calculate_sha256(file_path):
    digest = hashlib.sha256()

    with open(file_path, "rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def get_manifest_path(backup_path):
    return backup_path.with_suffix(".json")


def verify_backup_integrity(backup_path):
    manifest_path = get_manifest_path(backup_path)

    if not manifest_path.is_file():
        return False

    try:
        with open(manifest_path, "r", encoding="utf-8") as file:
            manifest = json.load(file)

        config = database_config()

        if manifest.get("filename") != backup_path.name:
            return False

        if manifest.get("database") != config["database"]:
            return False

        if manifest.get("verified") is not True:
            return False

        if manifest.get("size") != backup_path.stat().st_size:
            return False

        expected_hash = manifest.get("sha256")

        if not isinstance(expected_hash, str):
            return False

        actual_hash = calculate_sha256(backup_path)

        return actual_hash == expected_hash

    except (OSError, ValueError, TypeError):
        return False


# --------------------------------------------------
# CREATE DATABASE BACKUP
# --------------------------------------------------

def create_database_backup(kind="manual"):

    if kind not in ("manual", "pre_restore"):
        raise ValueError("Invalid backup type.")

    config = validate_configuration()

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    filename = f"smart_inventory_{kind}_{timestamp}.sql"

    destination = BACKUP_DIR / filename
    manifest_path = get_manifest_path(destination)

    command = [
        str(MYSQLDUMP_EXE),
        "--host=" + config["host"],
        "--port=" + config["port"],
        "--user=" + config["user"],
        "--protocol=tcp",
        "--single-transaction",
        "--skip-lock-tables",
        "--routines",
        "--triggers",
        "--events",
        "--hex-blob",
        "--default-character-set=utf8mb4",
        config["database"],
    ]

    try:
        with open(destination, "wb") as output:

            result = subprocess.run(
                command,
                stdout=output,
                stderr=subprocess.PIPE,
                env=mysql_environment(config),
                timeout=MAX_RESTORE_SECONDS,
                check=False,
            )

        if result.returncode != 0 or destination.stat().st_size == 0:
            error = result.stderr.decode(
                "utf-8", errors="replace"
            )

            raise RuntimeError(error or "Database backup failed.")

        backup_size = destination.stat().st_size
        backup_hash = calculate_sha256(destination)

        created_at = datetime.now().isoformat(
            timespec="seconds"
        )

        manifest = {
            "filename": filename,
            "size": backup_size,
            "sha256": backup_hash,
            "created_at": created_at,
            "database": config["database"],
            "verified": True,
        }

        with open(
            manifest_path, "w", encoding="utf-8"
        ) as manifest_file:

            json.dump(manifest, manifest_file, indent=4)

        return {
            "filename": filename,
            "size": backup_size,
            "sha256": backup_hash,
            "created_at": created_at,
            "verified": verify_backup_integrity(destination),
        }

    except Exception:
        if destination.exists():
            destination.unlink()

        if manifest_path.exists():
            manifest_path.unlink()

        raise


# --------------------------------------------------
# SAFE BACKUP FILE ACCESS
# --------------------------------------------------

def get_safe_backup(filename):

    if not isinstance(filename, str):
        return None

    if not BACKUP_PATTERN.fullmatch(filename):
        return None

    path = BACKUP_DIR / filename

    if not path.is_file():
        return None

    return path


# --------------------------------------------------
# EXISTING STORE-LEVEL JSON EXPORT
# --------------------------------------------------

@backup_bp.route("/export", methods=["GET"])
@jwt_required()
def export_tenant_data():

    import json
    import decimal

    claims = get_jwt()
    current_store_id = claims.get("store_id")

    if not current_store_id:
        return jsonify({
            "error": "No store is associated with this account."
        }), 403

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    backup_payload = {
        "export_metadata": {
            "store_id": current_store_id,
            "exported_at": str(datetime.now()),
        },
        "batches": [],
        "products": [],
    }

    try:
        cursor.execute(
            "SELECT * FROM batches WHERE store_id = %s",
            (current_store_id,)
        )

        backup_payload["batches"] = cursor.fetchall()

        cursor.execute(
            "SELECT * FROM products WHERE store_id = %s",
            (current_store_id,)
        )

        backup_payload["products"] = cursor.fetchall()

        for section in ["batches", "products"]:

            for row in backup_payload[section]:

                for key, val in row.items():

                    if isinstance(val, (datetime, date)):
                        row[key] = str(val)

                    elif isinstance(val, decimal.Decimal):
                        row[key] = float(val)

        json_output = json.dumps(
            backup_payload, indent=4
        )

        filename = (
            f"store_{current_store_id}_backup_"
            f"{datetime.now().strftime('%Y%m%d')}.json"
        )

        return Response(
            json_output,
            mimetype="application/json",
            headers={
                "Content-Disposition":
                    f"attachment;filename={filename}"
            }
        )

    except Exception:
        return jsonify({
            "error": "Store export failed."
        }), 500

    finally:
        cursor.close()
        db.close()


# --------------------------------------------------
# ADMIN: CREATE SQL BACKUP
# --------------------------------------------------

@backup_bp.route("/admin/database", methods=["POST"])
@jwt_required()
def create_admin_backup():

    if not admin_required():
        return jsonify({
            "error": "Admin access required."
        }), 403

    try:
        result = create_database_backup("manual")

        return jsonify({
            "message": "Database backup created successfully.",
            "backup": result,
        }), 201

    except Exception:
        return jsonify({
            "error": "Database backup failed. Check backend logs."
        }), 500


# --------------------------------------------------
# ADMIN: LIST SQL BACKUPS
# --------------------------------------------------

@backup_bp.route("/admin/database", methods=["GET"])
@jwt_required()
def list_admin_backups():

    if not admin_required():
        return jsonify({
            "error": "Admin access required."
        }), 403

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    backups = []

    for path in BACKUP_DIR.glob("smart_inventory_*.sql"):

        if not BACKUP_PATTERN.fullmatch(path.name):
            continue

        backups.append({
            "filename": path.name,
            "size": path.stat().st_size,
            "created_at": datetime.fromtimestamp(
                path.stat().st_mtime
            ).isoformat(timespec="seconds"),
            "sha256": calculate_sha256(path),
            "verified": verify_backup_integrity(path),
        })

    backups.sort(
        key=lambda item: item["created_at"],
        reverse=True
    )

    return jsonify({
        "backups": backups
    })


# --------------------------------------------------
# ADMIN: DOWNLOAD SQL BACKUP
# --------------------------------------------------

@backup_bp.route(
    "/admin/database/<filename>/download",
    methods=["GET"]
)
@jwt_required()
def download_admin_backup(filename):

    if not admin_required():
        return jsonify({
            "error": "Admin access required."
        }), 403

    path = get_safe_backup(filename)

    if path is None:
        return jsonify({
            "error": "Backup not found."
        }), 404

    return send_file(
        path,
        as_attachment=True,
        download_name=filename,
        mimetype="application/sql",
    )


# --------------------------------------------------
# ADMIN: RESTORE SQL BACKUP
# TEMPORARILY DISABLED FOR SAFETY
# --------------------------------------------------

@backup_bp.route(
    "/admin/database/<filename>/restore",
    methods=["POST"]
)
@jwt_required()
def restore_admin_backup(filename):

    if not admin_required():
        return jsonify({
            "error": "Admin access required."
        }), 403

    return jsonify({
        "error": (
            "Restore is temporarily disabled "
            "pending safety validation."
        )
    }), 501
