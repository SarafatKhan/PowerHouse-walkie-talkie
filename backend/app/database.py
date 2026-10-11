import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger("walkie_talkie.database")

Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    try:
        if db_url.startswith("postgresql"):
            # Test connecting with a short timeout
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3}
            )
            # Try a quick connection test
            with engine.connect() as conn:
                logger.info(f"Connected to PostgreSQL database at {db_url.split('@')[-1]}")
            return engine
    except Exception as e:
        logger.warning(
            f"Could not connect to PostgreSQL ({e}). Falling back to local SQLite ({settings.SQLITE_FALLBACK_URL}) for development."
        )

    # Fallback to SQLite
    fallback_engine = create_engine(
        settings.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )
    logger.info(f"Using SQLite database: {settings.SQLITE_FALLBACK_URL}")
    return fallback_engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models.user import User  # ensure model is registered
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
