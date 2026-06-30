from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use SQLite stored in /app/data for persistence
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////app/data/dev_hub.db")

if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Postgres (prod): never let a single statement, lock wait, or idle
    # transaction hang forever — that would tie up a pooled connection and,
    # once the pool and the request threadpool are starved, make *every*
    # request time out (the 504-on-everything failure mode). Hard timeouts
    # abort fast so the app self-heals; pre_ping drops dead connections; the
    # pool is sized for request traffic + the background activity writer.
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_timeout=15,
        connect_args={
            "connect_timeout": 10,
            "options": (
                "-c statement_timeout=8000"
                " -c lock_timeout=4000"
                " -c idle_in_transaction_session_timeout=15000"
            ),
        },
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
