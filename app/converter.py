"""PDF-to-DOCX conversion using pdf2docx + post-processing + font embedding."""

import asyncio
import logging
import os
from pathlib import Path

from pdf2docx import Converter

from .font_embed import embed_font
from .postprocess import postprocess_docx

logger = logging.getLogger(__name__)

CONVERT_TIMEOUT = 120  # seconds
GURMUKHI_FONT = "/usr/share/fonts/truetype/lohit-punjabi/Lohit-Gurmukhi.ttf"
GURMUKHI_FONT_NAME = "Lohit Gurmukhi"


async def convert_pdf_to_docx(input_pdf: Path, output_dir: Path) -> Path:
    """Convert a PDF to DOCX with proper Indian script support."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / input_pdf.with_suffix(".docx").name

    try:
        await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None, _convert_and_fix, str(input_pdf), str(output_path)
            ),
            timeout=CONVERT_TIMEOUT,
        )
    except asyncio.TimeoutError:
        raise RuntimeError(f"Conversion timed out after {CONVERT_TIMEOUT}s")
    except Exception as e:
        raise RuntimeError(f"Conversion failed: {e}")

    if not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError("Conversion produced no output")

    logger.info("Conversion succeeded: %s (%d bytes)", output_path, output_path.stat().st_size)
    return output_path


def _convert_and_fix(input_path: str, output_path: str) -> None:
    """Synchronous pdf2docx conversion + post-processing + font embedding."""
    # Step 1: pdf2docx conversion
    cv = Converter(input_path)
    cv.convert(output_path)
    cv.close()

    # Step 2: Post-process (text fixes, fonts, layout)
    stats = postprocess_docx(output_path, pdf_path=input_path)
    logger.info("Post-processing: %s", stats)

    # Step 3: Embed Gurmukhi font for cross-platform rendering
    if os.path.exists(GURMUKHI_FONT):
        try:
            embed_font(output_path, GURMUKHI_FONT, GURMUKHI_FONT_NAME)
            logger.info("Embedded font: %s", GURMUKHI_FONT_NAME)
        except Exception:
            logger.warning("Font embedding failed (non-critical)", exc_info=True)
