"""Background file cleanup for zero data retention policy."""

import asyncio
import logging
import shutil
import time
from pathlib import Path

logger = logging.getLogger(__name__)

TEMP_BASE = Path("/tmp/indicconvert")
MAX_AGE_SECONDS = 15 * 60  # 15 minutes
CLEANUP_INTERVAL = 5 * 60  # 5 minutes


def cleanup_job_directory(job_dir: Path) -> None:
    """Delete a specific job directory."""
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)
        logger.info("Cleaned up job directory: %s", job_dir)


def cleanup_old_jobs() -> int:
    """Delete job directories older than MAX_AGE_SECONDS. Returns count deleted."""
    if not TEMP_BASE.exists():
        return 0

    now = time.time()
    deleted = 0

    for job_dir in TEMP_BASE.iterdir():
        if not job_dir.is_dir():
            continue
        try:
            age = now - job_dir.stat().st_mtime
            if age > MAX_AGE_SECONDS:
                shutil.rmtree(job_dir, ignore_errors=True)
                logger.info("Cleaned up old job: %s (age: %.0fs)", job_dir.name, age)
                deleted += 1
        except OSError:
            pass

    return deleted


def clear_temp_directory() -> None:
    """Clear the entire temp directory on startup."""
    if TEMP_BASE.exists():
        shutil.rmtree(TEMP_BASE, ignore_errors=True)
        logger.info("Cleared temp directory on startup")
    TEMP_BASE.mkdir(parents=True, exist_ok=True)


async def cleanup_loop() -> None:
    """Background loop that cleans up old files every CLEANUP_INTERVAL seconds."""
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL)
        try:
            deleted = cleanup_old_jobs()
            if deleted:
                logger.info("Background cleanup removed %d old job(s)", deleted)
        except Exception:
            logger.exception("Error in background cleanup")
