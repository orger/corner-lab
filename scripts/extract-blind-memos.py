"""Read the supplied workbook as data; never execute workbook content.

Run from the repository root. The original workbook is left untouched. Only
public card metadata is written to the app: memo text must be encrypted by the
separate private-vault build step and must never enter this output.
"""
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def extract():
    with ZipFile(ROOT / "LP.xlsx") as workbook:
        strings = ["".join(item.itertext()) for item in ET.fromstring(workbook.read("xl/sharedStrings.xml"))]
        sheet = ET.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
        cells = {}
        for cell in sheet.findall(".//s:sheetData/s:row/s:c", NS):
            value = cell.find("s:v", NS)
            if value is not None:
                cells[cell.attrib["r"]] = strings[int(value.text)] if cell.attrib.get("t") == "s" else value.text
    pairs = []
    for row in range(2, 26):
        for col in range(2, 26):
            address = f"{chr(64 + col)}{row}"
            pair = f"{chr(63 + row)}{chr(63 + col)}"
            pairs.append(dict(id=f"pair:{pair}", pair=pair, kind="pair", memo="",
                              source=f"Sheet1!{address}"))
    specials = []
    current_piece = None
    for row in range(28, 42):
        if cells.get(f"F{row}"):
            current_piece = cells[f"F{row}"].split(" ")[0].strip()
        if cells.get(f"G{row}"):
            direction = cells[f"G{row}"].split(" ", 1)[0]
            specials.append(dict(id=f"twist:{current_piece}:{direction}", kind="twist",
                                 piece=current_piece, direction=direction, memo="",
                                 source=f"Sheet1!G{row}"))
        if cells.get(f"J{row}"):
            piece = cells[f"J{row}"].strip()
            specials.append(dict(id=f"flip:{piece}", kind="flip", piece=piece,
                                 memo="",
                                 source=f"Sheet1!K{row}"))
    assert len(pairs) == 576 and len(specials) == 25
    output = ROOT / "app/blind/data.js"
    output.parent.mkdir(parents=True, exist_ok=True)
    lines = ["// Public card metadata only. Private memo text is encrypted separately.",
             "// CW/CCW describe the direction to twist the corner TO SOLVE it.",
             "export const DATA_SOURCE = 'Memo cards';"]
    for name, records in (("PAIRS", pairs), ("SPECIALS", specials)):
        lines.append(f"export const {name} = Object.freeze([");
        lines.extend("  Object.freeze(" + json.dumps(record, ensure_ascii=False) + ")," for record in records)
        lines.append("]);")
    output.write_text("\n".join(lines) + "\n")
    print(f"Extracted {len(pairs)} pairs and {len(specials)} orientations to {output}")


if __name__ == "__main__":
    extract()
