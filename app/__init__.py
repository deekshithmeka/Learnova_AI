import os
import shutil
from flask import Flask
from pathlib import Path
from dotenv import load_dotenv

from .db import init_db

# Load environment variables from project root .env before reading config values.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

def create_app():
    app = Flask(__name__)
    openai_key = os.getenv("OPEN_API_KEY") or os.getenv("OPENAI_API_KEY", "")
    llm_provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()
    groq_key = os.getenv("GROQ_API_KEY", "")

    data_dir = Path(app.root_path).parent / "data"
    legacy_db = data_dir / "preppulse.db"
    primary_db = data_dir / "learnova_ai.db"

    # One-time safe migration: copy legacy DB to new name if needed.
    if legacy_db.exists() and not primary_db.exists():
        try:
            shutil.copy2(legacy_db, primary_db)
        except OSError:
            # Fallback to legacy DB so the app still runs with existing data.
            primary_db = legacy_db

    # If migration has not happened yet, continue using the existing legacy DB.
    if not primary_db.exists() and legacy_db.exists():
        primary_db = legacy_db

    app.config["DATABASE"] = str(primary_db)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["RESET_TOKEN_MAX_AGE"] = int(os.getenv("RESET_TOKEN_MAX_AGE", "900"))
    app.config["SMTP_HOST"] = os.getenv("SMTP_HOST", "smtp.gmail.com")
    app.config["SMTP_PORT"] = int(os.getenv("SMTP_PORT", "587"))
    app.config["SMTP_USER"] = os.getenv("SMTP_USER", "")
    app.config["SMTP_PASSWORD"] = os.getenv("SMTP_PASSWORD", "")
    app.config["SMTP_USE_TLS"] = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")
    app.config["OPEN_API_KEY"] = openai_key
    app.config["OPENAI_API_KEY"] = openai_key
    app.config["LLM_PROVIDER"] = llm_provider
    app.config["GROQ_API_KEY"] = groq_key
    app.config["GROQ_MODEL"] = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    app.config["OPENAI_CHAT_MODEL"] = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
    app.config["APIFY_API_TOKEN"] = os.getenv("APIFY_API_TOKEN", "")
    app.config["APIFY_YOUTUBE_ACTOR_ID"] = os.getenv("APIFY_YOUTUBE_ACTOR_ID", "pintostudio~youtube-transcript")
    app.config["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY", "")
    app.config["GEMINI_MODEL"] = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    init_db(app)
    
    # Initialize RAG pipeline with knowledge base
    with app.app_context():
        try:
            from .rag_pipeline import get_rag_pipeline
            rag = get_rag_pipeline(app.config["DATABASE"])
            app.logger.info("✅ RAG Vector Database initialized successfully")
        except Exception as e:
            app.logger.warning(f"⚠️  RAG initialization: {str(e)}")

    # Import routes
    from .routes import main
    app.register_blueprint(main)

    return app
