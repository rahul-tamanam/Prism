import asyncio
import json
import os
import logging
from fastapi import APIRouter, HTTPException
from services.defillama import get_protocol_tvl

logger = logging.getLogger(__name__)
router = APIRouter(tags=["protocols"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load_protocol_configs() -> list[dict]:
    path = os.path.join(DATA_DIR, "protocols.json")
    with open(path, "r") as f:
        return json.load(f)


@router.get("/protocols")
async def list_protocols():
    """Return all supported protocols with basic metadata and current TVL."""
    try:
        configs = _load_protocol_configs()
    except Exception as e:
        logger.error(f"Failed to load protocol configs: {e}")
        raise HTTPException(status_code=500, detail="Failed to load protocol data")

    slugs = [c.get("defillama_slug", c["id"]) for c in configs]
    tvl_rows = await asyncio.gather(*[get_protocol_tvl(s) for s in slugs], return_exceptions=True)

    results = []
    for config, tvl_data in zip(configs, tvl_rows):
        if isinstance(tvl_data, Exception):
            logger.warning("TVL fetch failed for %s: %s", config.get("id"), tvl_data)
            tvl_val = 0
        else:
            tvl_val = tvl_data.get("tvl", 0)

        results.append({
            "id": config["id"],
            "name": config["name"],
            "type": config["type"],
            "chain": config["chain"],
            "description": config.get("description", ""),
            "color": config.get("color", "#666"),
            "logo": config.get("logo", ""),
            "token_symbol": config.get("token_symbol", ""),
            "current_tvl": tvl_val,
        })

    return results


@router.get("/protocols/{protocol_id}")
async def get_protocol(protocol_id: str):
    """Return detailed config for a single protocol."""
    try:
        configs = _load_protocol_configs()
    except Exception as e:
        logger.error(f"Failed to load protocol configs: {e}")
        raise HTTPException(status_code=500, detail="Failed to load protocol data")

    for config in configs:
        if config["id"] == protocol_id:
            slug = config.get("defillama_slug", config["id"])
            tvl_data = await get_protocol_tvl(slug)
            return {**config, "current_tvl": tvl_data.get("tvl", 0)}

    raise HTTPException(status_code=404, detail=f"Protocol '{protocol_id}' not found")
