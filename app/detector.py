"""Indian script detection via Unicode block analysis."""

import fitz  # PyMuPDF

SCRIPT_RANGES = {
    "Gurmukhi": {
        "range": (0x0A00, 0x0A7F),
        "languages": ["Punjabi"],
        "code": "pa",
        "sample": "ਪੰਜਾਬੀ",
    },
    "Devanagari": {
        "range": (0x0900, 0x097F),
        "languages": ["Hindi", "Sanskrit", "Marathi"],
        "code": "hi",
        "sample": "हिन्दी",
    },
    "Bengali": {
        "range": (0x0980, 0x09FF),
        "languages": ["Bengali", "Assamese"],
        "code": "bn",
        "sample": "বাংলা",
    },
    "Tamil": {
        "range": (0x0B80, 0x0BFF),
        "languages": ["Tamil"],
        "code": "ta",
        "sample": "தமிழ்",
    },
    "Telugu": {
        "range": (0x0C00, 0x0C7F),
        "languages": ["Telugu"],
        "code": "te",
        "sample": "తెలుగు",
    },
    "Kannada": {
        "range": (0x0C80, 0x0CFF),
        "languages": ["Kannada"],
        "code": "kn",
        "sample": "ಕನ್ನಡ",
    },
    "Malayalam": {
        "range": (0x0D00, 0x0D7F),
        "languages": ["Malayalam"],
        "code": "ml",
        "sample": "മലയാളം",
    },
    "Gujarati": {
        "range": (0x0A80, 0x0AFF),
        "languages": ["Gujarati"],
        "code": "gu",
        "sample": "ગુજરાતી",
    },
    "Odia": {
        "range": (0x0B00, 0x0B7F),
        "languages": ["Odia"],
        "code": "or",
        "sample": "ଓଡ଼ିଆ",
    },
}


def _count_scripts(text: str) -> dict[str, int]:
    """Count characters belonging to each Indian script Unicode block."""
    counts: dict[str, int] = {}
    for char in text:
        cp = ord(char)
        for script_name, info in SCRIPT_RANGES.items():
            low, high = info["range"]
            if low <= cp <= high:
                counts[script_name] = counts.get(script_name, 0) + 1
                break
    return counts


def detect_script(text: str) -> dict:
    """Detect the dominant Indian script in the given text.

    Returns a dict with keys: script, languages, code, sample, is_mixed, all_scripts.
    If no Indian script is found, script will be None.
    """
    counts = _count_scripts(text)

    if not counts:
        return {
            "script": None,
            "languages": [],
            "code": None,
            "sample": None,
            "is_mixed": False,
            "all_scripts": [],
        }

    dominant = max(counts, key=counts.get)
    total_indic = sum(counts.values())
    is_mixed = len(counts) > 1 and (counts[dominant] / total_indic) < 0.9

    all_scripts = [
        {"script": s, "count": c, **{k: v for k, v in SCRIPT_RANGES[s].items() if k != "range"}}
        for s, c in sorted(counts.items(), key=lambda x: x[1], reverse=True)
    ]

    info = SCRIPT_RANGES[dominant]
    return {
        "script": dominant,
        "languages": info["languages"],
        "code": info["code"],
        "sample": info["sample"],
        "is_mixed": is_mixed,
        "all_scripts": all_scripts,
    }


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF using PyMuPDF."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def analyze_pdf(pdf_path: str) -> dict:
    """Extract text from PDF and detect Indian scripts.

    Returns detection result plus is_scanned flag.
    """
    text = extract_text_from_pdf(pdf_path)
    stripped = text.strip()

    if len(stripped) < 10:
        return {
            "script": None,
            "languages": [],
            "code": None,
            "sample": None,
            "is_mixed": False,
            "all_scripts": [],
            "is_scanned": True,
            "text_length": len(stripped),
        }

    result = detect_script(text)
    result["is_scanned"] = False
    result["text_length"] = len(stripped)
    return result
