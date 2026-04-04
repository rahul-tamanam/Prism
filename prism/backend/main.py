import os
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("prism")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
_protocol_configs: list[dict] = []


def load_protocol_configs() -> list[dict]:
    path = os.path.join(DATA_DIR, "protocols.json")
    with open(path, "r") as f:
        return json.load(f)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _protocol_configs
    logger.info("PRISM backend starting...")
    try:
        _protocol_configs = load_protocol_configs()
        logger.info(f"Loaded {len(_protocol_configs)} protocol configs")
    except Exception as e:
        logger.error(f"Failed to load protocol configs: {e}")
        _protocol_configs = []
    yield
    logger.info("PRISM backend shutting down...")


app = FastAPI(
    title="PRISM API",
    version="0.1.0",
    description="DeFi Exit Capacity & Reflexivity Risk Engine",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import protocols, scores, stress, narrative, portfolio

app.include_router(protocols.router, prefix="/api")
app.include_router(scores.router, prefix="/api")
app.include_router(stress.router, prefix="/api")
app.include_router(narrative.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "protocols_loaded": len(_protocol_configs)}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": str(type(exc).__name__), "detail": str(exc)},
    )
