import os

from werkzeug.security import generate_password_hash

from backend.database import get_db_connection


def create_admin():
    # Set these ADMIN_* values in the project-root .env before running this script.
    fields = {
        "ADMIN_FULL_NAME": os.getenv("ADMIN_FULL_NAME"),
        "ADMIN_USERNAME": os.getenv("ADMIN_USERNAME"),
        "ADMIN_EMAIL": os.getenv("ADMIN_EMAIL"),
        "ADMIN_PASSWORD": os.getenv("ADMIN_PASSWORD"),
    }
    missing = [name for name, value in fields.items() if not value]
    if missing:
        raise RuntimeError(f"Set the following values in .env: {', '.join(missing)}")

    connection = get_db_connection()
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO users (
                full_name,
                username,
                email,
                password_hash,
                role,
                is_active,
                store_id
            )
            VALUES (%s, %s, %s, %s, 'ADMIN', TRUE, NULL)
            """,
            (
                fields["ADMIN_FULL_NAME"],
                fields["ADMIN_USERNAME"],
                fields["ADMIN_EMAIL"],
                generate_password_hash(fields["ADMIN_PASSWORD"]),
            ),
        )
        connection.commit()
        print("ADMIN account created successfully.")
    finally:
        if cursor:
            cursor.close()
        connection.close()


if __name__ == "__main__":
    create_admin()