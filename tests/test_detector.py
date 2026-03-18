"""Tests for Indian script detection."""

from app.detector import detect_script, _count_scripts


def test_detect_gurmukhi():
    text = "ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਵਿੱਚ ਲਿਖਿਆ"
    result = detect_script(text)
    assert result["script"] == "Gurmukhi"
    assert "Punjabi" in result["languages"]
    assert result["code"] == "pa"


def test_detect_devanagari():
    text = "हिन्दी में लिखा हुआ पाठ"
    result = detect_script(text)
    assert result["script"] == "Devanagari"
    assert "Hindi" in result["languages"]
    assert result["code"] == "hi"


def test_detect_bengali():
    text = "বাংলায় লেখা পাঠ্য"
    result = detect_script(text)
    assert result["script"] == "Bengali"
    assert result["code"] == "bn"


def test_detect_tamil():
    text = "தமிழில் எழுதப்பட்ட உரை"
    result = detect_script(text)
    assert result["script"] == "Tamil"
    assert result["code"] == "ta"


def test_detect_telugu():
    text = "తెలుగులో వ్రాసిన వచనం"
    result = detect_script(text)
    assert result["script"] == "Telugu"
    assert result["code"] == "te"


def test_detect_kannada():
    text = "ಕನ್ನಡದಲ್ಲಿ ಬರೆದ ಪಠ್ಯ"
    result = detect_script(text)
    assert result["script"] == "Kannada"
    assert result["code"] == "kn"


def test_detect_malayalam():
    text = "മലയാളത്തിൽ എഴുതിയ വാചകം"
    result = detect_script(text)
    assert result["script"] == "Malayalam"
    assert result["code"] == "ml"


def test_detect_gujarati():
    text = "ગુજરાતીમાં લખેલ લખાણ"
    result = detect_script(text)
    assert result["script"] == "Gujarati"
    assert result["code"] == "gu"


def test_detect_odia():
    text = "ଓଡ଼ିଆରେ ଲେଖା ପାଠ୍ୟ"
    result = detect_script(text)
    assert result["script"] == "Odia"
    assert result["code"] == "or"


def test_detect_english_only():
    text = "This is plain English text with no Indian scripts"
    result = detect_script(text)
    assert result["script"] is None
    assert result["all_scripts"] == []


def test_detect_empty_string():
    result = detect_script("")
    assert result["script"] is None


def test_detect_mixed_scripts():
    text = "ਪੰਜਾਬੀ text with some हिन्दी mixed in"
    result = detect_script(text)
    assert result["script"] is not None
    assert len(result["all_scripts"]) == 2


def test_count_scripts():
    text = "ਪੰਜਾਬੀ"
    counts = _count_scripts(text)
    assert "Gurmukhi" in counts
    assert counts["Gurmukhi"] > 0


def test_detect_mixed_flag():
    # Mostly Gurmukhi with a tiny bit of Devanagari — not mixed
    text = "ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਵਿੱਚ ਲਿਖਿਆ ਹੋਇਆ ਬਹੁਤ ਲੰਬਾ ਪਾਠ ह"
    result = detect_script(text)
    assert result["script"] == "Gurmukhi"
    assert result["is_mixed"] is False
