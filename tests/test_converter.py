"""Tests for the conversion pipeline.

Run with: docker compose run --rm app python -m pytest tests/test_converter.py
"""

import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import pytest

from app.converter import convert_pdf_to_docx
from app.detector import analyze_pdf

FIXTURES_DIR = Path(__file__).parent / "fixtures"
TEST_PDF = FIXTURES_DIR / "problem pdf.pdf"

WP_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


@pytest.fixture
def output_dir(tmp_path):
    return tmp_path / "output"


def test_fixture_exists():
    """Verify test fixture is present."""
    assert TEST_PDF.exists(), f"Test fixture not found: {TEST_PDF}"


def test_analyze_punjabi_pdf():
    """Test language detection on the Punjabi salary document."""
    result = analyze_pdf(str(TEST_PDF))
    assert not result["is_scanned"], "PDF should not be detected as scanned"
    assert result["text_length"] > 0
    assert result["script"] == "Gurmukhi"
    assert "Punjabi" in result["languages"]


@pytest.mark.asyncio
async def test_convert_punjabi_pdf(output_dir):
    """Test full PDF to DOCX conversion of the Punjabi document."""
    output_path = await convert_pdf_to_docx(TEST_PDF, output_dir)
    assert output_path.exists()
    assert output_path.suffix == ".docx"
    assert output_path.stat().st_size > 0


@pytest.mark.asyncio
async def test_conversion_produces_tables(output_dir):
    """Verify conversion produces real table elements, not text boxes."""
    output_path = await convert_pdf_to_docx(TEST_PDF, output_dir)

    with zipfile.ZipFile(output_path) as z:
        doc_xml = z.read("word/document.xml")

    root = ET.fromstring(doc_xml)
    tags = {}
    for elem in root.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        tags[tag] = tags.get(tag, 0) + 1

    # Must have real table structure
    assert tags.get("tr", 0) > 0, "No table rows found — conversion used text boxes instead of tables"
    assert tags.get("tc", 0) > 0, "No table cells found"

    # Must NOT have scattered text boxes (the LibreOffice Draw problem)
    assert tags.get("txbxContent", 0) == 0, "Found text boxes — conversion is not table-based"


@pytest.mark.asyncio
async def test_conversion_preserves_gurmukhi(output_dir):
    """Verify Gurmukhi text is preserved in the output DOCX."""
    output_path = await convert_pdf_to_docx(TEST_PDF, output_dir)

    with zipfile.ZipFile(output_path) as z:
        doc_xml = z.read("word/document.xml")

    root = ET.fromstring(doc_xml)
    all_text = "".join(
        elem.text for elem in root.iter(f"{{{WP_NS}}}t") if elem.text
    )

    gurmukhi_count = sum(1 for c in all_text if 0x0A00 <= ord(c) <= 0x0A7F)
    assert gurmukhi_count > 1000, f"Only {gurmukhi_count} Gurmukhi characters found — text likely garbled"
