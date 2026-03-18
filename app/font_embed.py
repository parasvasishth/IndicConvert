"""Embed a TrueType font into a DOCX file for cross-platform rendering.

OOXML font embedding ensures the document renders correctly on devices
that don't have the specified font installed (e.g., Android phones).
"""

import os
import shutil
import tempfile
import uuid
import zipfile
import xml.etree.ElementTree as ET

NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_CT = "http://schemas.openxmlformats.org/package/2006/content-types"
NS_RELS = "http://schemas.openxmlformats.org/package/2006/relationships"

ET.register_namespace("w", NS_W)
ET.register_namespace("r", NS_R)
ET.register_namespace("", NS_CT)


def embed_font(docx_path: str, ttf_path: str, font_name: str) -> None:
    """Embed a TrueType font into an existing DOCX file."""
    font_guid = uuid.uuid4()
    font_key = "{" + str(font_guid).upper() + "}"

    # Obfuscation key: 16 bytes from GUID hex
    guid_bytes = bytes.fromhex(str(font_guid).replace("-", ""))
    obfuscation_key = guid_bytes + guid_bytes  # 32 bytes

    # Read and obfuscate font
    with open(ttf_path, "rb") as f:
        font_data = bytearray(f.read())
    for i in range(min(32, len(font_data))):
        font_data[i] ^= obfuscation_key[i]

    safe_name = font_name.replace(" ", "")
    odttf_part = f"word/fonts/{safe_name}.odttf"

    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".docx")
    os.close(tmp_fd)

    try:
        with zipfile.ZipFile(docx_path, "r") as zin, \
             zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zout:

            existing = set(zin.namelist())

            for item in zin.namelist():
                raw = zin.read(item)

                if item == "[Content_Types].xml":
                    raw = _update_content_types(raw, odttf_part)
                elif item == "word/fontTable.xml":
                    raw = _update_font_table(raw, font_name, font_key)
                elif item == "word/_rels/fontTable.xml.rels":
                    raw = _update_font_rels(raw, odttf_part)

                zout.writestr(item, raw)

            # Add obfuscated font
            zout.writestr(odttf_part, bytes(font_data))

            # Create fontTable.xml.rels if missing
            if "word/_rels/fontTable.xml.rels" not in existing:
                zout.writestr(
                    "word/_rels/fontTable.xml.rels",
                    _create_font_rels(odttf_part),
                )

        shutil.move(tmp_path, docx_path)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


def _update_content_types(raw: bytes, odttf_part: str) -> bytes:
    root = ET.fromstring(raw)
    part_name = "/" + odttf_part
    for child in root:
        if child.get("PartName") == part_name:
            return ET.tostring(root, xml_declaration=True, encoding="UTF-8")
    override = ET.SubElement(root, "Override")
    override.set("PartName", part_name)
    override.set("ContentType", "application/vnd.openxmlformats-officedocument.obfuscatedFont")
    return ET.tostring(root, xml_declaration=True, encoding="UTF-8")


def _update_font_table(raw: bytes, font_name: str, font_key: str) -> bytes:
    root = ET.fromstring(raw)
    W = f"{{{NS_W}}}"
    R = f"{{{NS_R}}}"

    font_el = None
    for el in root.findall(f"{W}font"):
        if el.get(f"{W}name") == font_name:
            font_el = el
            break

    if font_el is None:
        font_el = ET.SubElement(root, f"{W}font")
        font_el.set(f"{W}name", font_name)

    for tag, val in [("charset", "00"), ("family", "auto"), ("pitch", "variable")]:
        if font_el.find(f"{W}{tag}") is None:
            child = ET.SubElement(font_el, f"{W}{tag}")
            child.set(f"{W}val", val)

    old = font_el.find(f"{W}embedRegular")
    if old is not None:
        font_el.remove(old)
    embed = ET.SubElement(font_el, f"{W}embedRegular")
    embed.set(f"{R}id", "rId1")
    embed.set(f"{W}fontKey", font_key)

    return ET.tostring(root, xml_declaration=True, encoding="UTF-8")


def _update_font_rels(raw: bytes, odttf_part: str) -> bytes:
    root = ET.fromstring(raw)
    target = odttf_part.replace("word/", "", 1)
    for child in root:
        if child.get("Target") == target:
            return ET.tostring(root, xml_declaration=True, encoding="UTF-8")
    ids = {child.get("Id") for child in root}
    rid = "rId1"
    n = 1
    while rid in ids:
        n += 1
        rid = f"rId{n}"
    rel = ET.SubElement(root, "Relationship")
    rel.set("Id", rid)
    rel.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font")
    rel.set("Target", target)
    return ET.tostring(root, xml_declaration=True, encoding="UTF-8")


def _create_font_rels(odttf_part: str) -> bytes:
    root = ET.Element("Relationships")
    root.set("xmlns", NS_RELS)
    target = odttf_part.replace("word/", "", 1)
    rel = ET.SubElement(root, "Relationship")
    rel.set("Id", "rId1")
    rel.set("Type", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font")
    rel.set("Target", target)
    return ET.tostring(root, xml_declaration=True, encoding="UTF-8")
