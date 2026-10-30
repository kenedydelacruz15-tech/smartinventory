"""Keep `python app.py` as the simple project-root API start command."""

from backend.app import app


if __name__ == "__main__":
    app.run(debug=True)
