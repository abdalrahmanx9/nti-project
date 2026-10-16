import time
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import text, Integer, String, DateTime
from config import settings

logger = logging.getLogger("app.database")

class Base(DeclarativeBase):
    pass

class VisitLog(Base):
    __tablename__ = "visit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    client_ip: Mapped[str] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str] = mapped_column(String(256), nullable=True)
    pod_name: Mapped[str] = mapped_column(String(128), default=settings.POD_NAME)

# Async database engine with pool settings
DATABASE_URL = settings.get_database_url()
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_timeout=5,
    connect_args={"timeout": 4} if "asyncpg" in DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def init_db() -> bool:
    """Initialize database tables. Returns True if successful, False otherwise."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized successfully.")
        return True
    except Exception as e:
        # ponytail: graceful initialization failure so app boots up even if DB is still starting
        logger.warning(f"Database initialization deferred: {e}")
        return False

async def check_db_health() -> tuple[bool, float, str]:
    """
    Pings the database and calculates latency in milliseconds.
    Returns: (is_healthy, latency_ms, error_message_or_ok)
    """
    start_time = time.perf_counter()
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        latency = (time.perf_counter() - start_time) * 1000.0
        return True, round(latency, 2), "Connected"
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000.0
        error_msg = str(e)
        # Simplify common connection error messages for UI display
        if "Connect call failed" in error_msg or "Connection refused" in error_msg:
            error_msg = "Connection refused (DB unreachable)"
        elif "password authentication failed" in error_msg:
            error_msg = "Authentication failed"
        elif "timeout" in error_msg.lower():
            error_msg = "Connection timed out"
        return False, round(latency, 2), error_msg

async def record_visit(client_ip: str = "127.0.0.1", user_agent: str = "system") -> dict:
    """Inserts a visit entry and returns summary telemetry."""
    start_time = time.perf_counter()
    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                visit = VisitLog(
                    client_ip=client_ip[:64],
                    user_agent=user_agent[:256],
                    pod_name=settings.POD_NAME
                )
                session.add(visit)
            
            # Fetch total count
            result = await session.execute(text("SELECT count(*) FROM visit_logs"))
            total_visits = result.scalar_one_or_none() or 0
        
        latency = (time.perf_counter() - start_time) * 1000.0
        return {
            "success": True,
            "total_visits": total_visits,
            "query_latency_ms": round(latency, 2),
            "message": "Visit logged to PostgreSQL successfully"
        }
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000.0
        return {
            "success": False,
            "total_visits": 0,
            "query_latency_ms": round(latency, 2),
            "message": f"Database write failed: {e}"
        }
