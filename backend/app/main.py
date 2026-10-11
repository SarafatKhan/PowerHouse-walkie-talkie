import json
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, SessionLocal
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.services.auth_service import get_user_from_token_str
from app.websocket.manager import manager
from app.websocket.signaling import handle_websocket_message

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("walkie_talkie.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    init_db()
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(users_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "online_users": manager.get_online_count(),
    }


# ======================================================================
# GLOBAL WALKIE-TALKIE WEBSOCKET ENDPOINT
# ======================================================================
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for the Global Walkie-Talkie channel.
    Requires a valid JWT access token query parameter.
    """
    if not token:
        logger.warning("WebSocket connection rejected: No authentication token provided")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = SessionLocal()
    try:
        user = get_user_from_token_str(token, db)
    finally:
        db.close()

    if not user:
        logger.warning("WebSocket connection rejected: Invalid or expired token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # User authenticated -> join global channel
    await manager.connect(websocket, user)

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from user {user.user_id}")
                continue

            await handle_websocket_message(user, data)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user.name} ({user.user_id})")
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Unexpected error in WebSocket loop for {user.user_id}: {e}")
        await manager.disconnect(websocket)
