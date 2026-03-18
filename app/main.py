"""FastAPI application for IndicConvert."""

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.background import BackgroundTask
from starlette.requests import Request

from .cleanup import TEMP_BASE, cleanup_job_directory, cleanup_loop, clear_temp_directory
from .converter import convert_pdf_to_docx
from .detector import analyze_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

# Store job state in memory (ephemeral by design)
jobs: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    clear_temp_directory()
    cleanup_task = asyncio.create_task(cleanup_loop())
    yield
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="IndicConvert", lifespan=lifespan)

BASE_DIR = Path(__file__).resolve().parent.parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # Validate extension
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Validate MIME type
    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 20MB limit.")

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty.")

    # Save to temp directory
    job_id = str(uuid.uuid4())
    job_dir = TEMP_BASE / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_dir / "input.pdf"
    input_path.write_bytes(content)

    # Detect language
    detection = analyze_pdf(str(input_path))

    jobs[job_id] = {
        "status": "uploaded",
        "input_path": str(input_path),
        "job_dir": str(job_dir),
        "detection": detection,
    }

    return {
        "job_id": job_id,
        "detection": detection,
    }


@app.post("/api/convert/{job_id}")
async def convert(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job["status"] == "converting":
        raise HTTPException(status_code=409, detail="Conversion already in progress.")

    if job["status"] == "completed":
        return {"status": "completed", "job_id": job_id}

    job["status"] = "converting"

    try:
        input_path = Path(job["input_path"])
        job_dir = Path(job["job_dir"])
        output_path = await convert_pdf_to_docx(input_path, job_dir)
        job["status"] = "completed"
        job["output_path"] = str(output_path)
        return {"status": "completed", "job_id": job_id}
    except RuntimeError as e:
        job["status"] = "failed"
        job["error"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        job["status"] = "failed"
        job["error"] = str(e)
        logger.exception("Conversion failed for job %s", job_id)
        raise HTTPException(status_code=500, detail="Conversion failed unexpectedly.")


@app.get("/api/status/{job_id}")
async def job_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {
        "status": job["status"],
        "job_id": job_id,
        "error": job.get("error"),
    }


@app.get("/api/download/{job_id}")
async def download(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Conversion not yet completed.")

    output_path = Path(job["output_path"])
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Output file not found.")

    job_dir = Path(job["job_dir"])

    def cleanup():
        cleanup_job_directory(job_dir)
        jobs.pop(job_id, None)

    return FileResponse(
        path=output_path,
        filename="converted.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        background=BackgroundTask(cleanup),
    )
