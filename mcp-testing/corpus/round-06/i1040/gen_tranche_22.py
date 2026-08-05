#!/usr/bin/env python3
"""Author tranche 22 of the i1040 rebuild: printed page 80 — the 2025 Tax
Computation Worksheet for line 16.

Small, but generated and verified rather than transcribed, because the numbers
are rate bands and subtraction amounts where a single transposed digit changes
someone's tax. Four sections (A-D by filing status), five rate-band rows each.

The verification worth reading is the last one. The worksheet computes
tax = (income x rate) - subtraction. The Tax Table in tranche 21 computes the
same tax by lookup, at each bracket's MIDPOINT. So the worksheet's parameters,
applied to the Tax Table's own brackets, must reproduce the Tax Table's printed
figures — and they do, for 1,031 consecutive rows for Single, 1,031 for Married
filing separately, 703 for Head of household and 61 for Married filing jointly.
Each run then stops exactly where that filing status's 22% bracket begins, which
is where a different rate takes over. That cross-checks two SEPARATELY parsed
tables against each other through arithmetic neither parser knows about.

Usage: python gen_tranche_22.py [out.json]
"""
import json
import math
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
PDF = os.path.join(HERE, "..", "..", "born-digital", "irs-i1040-instructions.pdf")
ITEMS_TOOL = os.path.join(REPO, "mcp-testing", "tools", "page_items.cjs")
CACHE = os.path.join(tempfile.gettempdir(), "i1040_tcw_items_80.json")
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
TRANCHE_21 = os.path.join(HERE, "tranche-21-pages-68-79.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-22-pages-80-80.json")

PAGE = 80
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

blocks = []


def rich(text):
    if not MARKER.search(text):
        return text, None
    runs, plain = [], []
    for piece in MARKER.split(text):
        if not piece:
            continue
        if piece.startswith("«"):
            body = piece[1:-1]
            runs.append({"text": body, "style": "emphasis"})
        elif piece.startswith("‹"):
            body = piece[1:-1]
            runs.append({"text": body, "style": "strong"})
        elif piece.startswith("[["):
            body, url = piece[2:-2].split("|", 1)
            runs.append({"text": body, "style": "normal", "href": url})
        else:
            body = piece
            runs.append({"text": body, "style": "normal"})
        plain.append(body)
    joined = "".join(plain)
    assert joined == "".join(run["text"] for run in runs)
    return joined, runs


def heading(text, level):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": PAGE})


def para(text):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": PAGE}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": PAGE})


# ---------------------------------------------------------------- extraction

def load_items():
    if not os.path.exists(CACHE):
        subprocess.run(["node", ITEMS_TOOL, PDF, str(PAGE), str(PAGE), "--out", CACHE], check=True)
    with open(CACHE, encoding="utf-8") as handle:
        return json.load(handle)["pages"][0]


page = load_items()
bands = []
for it in sorted(page["items"], key=lambda i: -i["y"]):
    if bands and abs(bands[-1]["y"] - it["y"]) <= 2:
        bands[-1]["items"].append(it)
        bands[-1]["y"] = (bands[-1]["y"] + it["y"]) / 2
    else:
        bands.append({"y": it["y"], "items": [it]})

sections, current = [], None
for b in bands:
    cells = [i["text"].strip() for i in sorted(b["items"], key=lambda i: i["x"])]
    first_x = min(i["x"] for i in b["items"])
    if cells and cells[0].startswith("Section "):
        current = {"label": " ".join(cells), "rows": []}
        sections.append(current)
        continue
    # A data row is six cells whose first begins at the table's left edge; the
    # two-line column header starts further in (x >= 79), so x < 60 separates
    # them without having to match the header text.
    if current is not None and len(cells) == 6 and first_x < 60:
        current["rows"].append(cells)

# ------------------------------------------------------------- verification

RATES = ["× 22% (0.22)", "× 24% (0.24)", "× 32% (0.32)", "× 35% (0.35)", "× 37% (0.37)"]
money = lambda s: float(s.replace("$", "").replace(",", "").strip())

assert len(sections) == 4, f"expected 4 sections, got {len(sections)}"
for sec in sections:
    assert len(sec["rows"]) == 5, f"{sec['label'][:20]}: expected 5 rows, got {len(sec['rows'])}"
    assert [r[2] for r in sec["rows"]] == RATES, f"{sec['label'][:20]}: rate bands out of order"
    # columns (a), (c) and Tax are entry spaces: a bare dollar sign in print
    for row in sec["rows"]:
        assert row[1] == "$" and row[3] == "$" and row[5] == "$", f"unexpected entry cell: {row}"
    subs = [money(r[4]) for r in sec["rows"]]
    assert all(b > a for a, b in zip(subs, subs[1:])), f"{sec['label'][:20]}: subtraction amounts not increasing"
    # bracket edges: first starts at $100,000, each row resumes where the last
    # stopped, and the final row is open ended
    edges = []
    for row in sec["rows"]:
        found = re.findall(r"\$([\d,]+)", row[0])
        edges.append([int(x.replace(",", "")) for x in found])
    assert edges[0][0] == 100000, f"{sec['label'][:20]}: first band does not start at $100,000"
    for i in range(len(edges) - 1):
        assert len(edges[i]) == 2 and edges[i][1] == edges[i + 1][0], (
            f"{sec['label'][:20]}: band {i} does not meet band {i + 1}"
        )
    assert len(edges[-1]) == 1, f"{sec['label'][:20]}: last band should be open ended"

# THE CROSS-CHECK: the worksheet's own 22% parameters must reproduce the Tax
# Table's printed figures at each bracket midpoint, and must stop doing so
# exactly where that filing status's 22% bracket begins.
with open(TRANCHE_21, encoding="utf-8") as handle:
    tax_plan = json.load(handle)
tax_rows = []
for block in tax_plan["blocks"]:
    if block["type"] == "table" and "part " in block.get("caption", ""):
        tax_rows.extend(block["rows"])
num = lambda s: int(s.replace(",", ""))


def round_half_up(value):
    """The IRS rounds a half cent UP; Python's round() rounds half to EVEN.

    Every bracket midpoint here lands on x.5 exactly, so the two disagree on
    every single row: round(16908.5) is 16908 in Python but the printed table
    says 16909. Getting this wrong makes a correct parse look completely
    broken, which is how it first presented.
    """
    return math.floor(value + 0.5)


# (section index, Tax Table column, expected run length)
CROSS = [(0, 2, 1031, "Single"), (1, 3, 61, "Married filing jointly"),
         (2, 4, 1031, "Married filing separately"), (3, 5, 703, "Head of household")]
cross_report = []
for sec_i, col, expected_run, cross_name in CROSS:
    sub = money(sections[sec_i]["rows"][0][4])
    run, floor = 0, None
    for row in reversed(tax_rows):
        midpoint = (num(row[0]) + num(row[1])) / 2
        if round_half_up(midpoint * 0.22 - sub) != num(row[col]):
            break
        run += 1
        floor = row[0]
    assert run == expected_run, (
        f"section {sec_i}: formula reproduces {run} Tax Table rows, expected {expected_run}"
    )
    cross_report.append((cross_name, run, floor))

# ------------------------------------------------------------------ authoring

COLUMNS = [
    "Taxable income. If line 15 is—",
    "(a) Enter the amount from line 15.",
    "(b) Multiplication amount.",
    "(c) Multiply (a) by (b).",
    "(d) Subtraction amount.",
    "Tax. Subtract (d) from (c). Enter the result here and on the entry space on line 16.",
]
STATUS = [
    "Single",
    "Married filing jointly or Qualifying surviving spouse",
    "Married filing separately",
    "Head of household",
]

heading("2025 Tax Computation Worksheet—Line 16", 3)
callout(
    "Caution.",
    "See the instructions for line 16 to see if you must use the worksheet "
    "below to figure your tax.",
    )
callout(
    "Note.",
    "If you are required to use this worksheet to figure the tax on an amount "
    "from another form or worksheet, such as the Qualified Dividends and "
    "Capital Gain Tax Worksheet, the Schedule D Tax Worksheet, Schedule J, "
    "Form 8615, or the Foreign Earned Income Tax Worksheet, enter the amount "
    "from that form or worksheet in column (a) of the row that applies to the "
    "amount you are looking up. Enter the result on the appropriate line of the "
    "form or worksheet that you are completing.",
)

for letter, status, sec in zip("ABCD", STATUS, sections):
    heading(f"Section {letter}. Use if your filing status is {status}", 4)
    blocks.append({
        "type": "table",
        "caption": (
            f"Section {letter} of the 2025 Tax Computation Worksheet, for filing "
            f"status {status}. Complete the row below that applies to you. "
            "Columns (a), (c) and the Tax column are entry spaces you fill in; "
            "each shows only a dollar sign in the printed form."
        ),
        "columns": COLUMNS,
        "rows": sec["rows"],
        "row_headers": True,
        "source_page": PAGE,
    })

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 22 OF A MULTI-SESSION REBUILD. This plan covers printed page 80, "
    "the 2025 Tax Computation Worksheet for line 16. It carries no document "
    "title by design — only tranche 1 does — so this file validates through "
    "merge-plans rather than standalone. No partial rebuild is delivered.",

    "A ONE-PAGE TRANCHE BY DESIGN, for the same reason page 48 was: page 79 "
    "ends the generated Tax Table and page 81 opens General Information, so "
    "this worksheet is a different structure from either neighbour and gets a "
    "clean seam on both sides.",

    "GENERATED AND VERIFIED, THOUGH IT IS ONLY 20 ROWS. Twenty rows is well "
    "within transcription range, but these are rate bands and subtraction "
    "amounts where one transposed digit changes someone's tax, so they are "
    "parsed from geometry and checked: four sections of exactly five rows, the "
    "rate bands in the order 22, 24, 32, 35, 37 in every section, subtraction "
    "amounts strictly increasing, each band starting where the previous one "
    "stopped, the first band starting at $100,000 and the last left open ended.",

    "THE CHECK WORTH READING IS THE ARITHMETIC ONE. This worksheet computes "
    "tax as (income × rate) − subtraction. The Tax Table in tranche 21 computes "
    "the same tax by lookup, at each bracket's midpoint. So the worksheet's "
    "parameters, applied to the Tax Table's own brackets, must reproduce the "
    "Tax Table's printed figures — and they do, for 1,031 consecutive rows for "
    "Single, 1,031 for Married filing separately, 703 for Head of household and "
    "61 for Married filing jointly. Each run then stops exactly where that "
    "filing status's 22% bracket begins and a different rate takes over. That "
    "is 2,826 cell values in one table reproduced from the parameters of "
    "another, cross-checking two SEPARATELY parsed tables through arithmetic "
    "neither parser knows about.",

    "THE ENTRY CELLS ARE KEPT AS PRINTED. Columns (a), (c) and Tax are spaces "
    "the filer writes in, and the printed form puts a bare dollar sign in each. "
    "The dollar sign is kept rather than blanked, because it is what tells a "
    "reader the cell wants a money amount; the caption of every section says "
    "these three are entry spaces. This differs from the EIC and earlier "
    "worksheets, whose entry columns are genuinely empty in print and are "
    "authored empty.",

    "EACH SECTION IS ITS OWN TABLE UNDER ITS OWN HEADING, and the heading names "
    "the filing status rather than just the letter: “Section A. Use if your "
    "filing status is Single”. The printed page sets “Section A—Use if your "
    "filing status is Single. Complete the row below that applies to you.” as "
    "one line; the instruction half moves into the table's caption, where it "
    "applies to the rows it governs, and the identifying half becomes the "
    "heading. A reader navigating by heading needs to know which section is "
    "theirs without reading into the table.",

    "THE COLUMN HEADERS ARE REASSEMBLED FROM STACKED LINES. Each is printed "
    "over two or three lines with its letter on its own row — “(c)” above "
    "“Multiply (a) by (b).” — and the last column's wording wraps differently "
    "in each of the four sections purely because of the column width. They are "
    "joined into one string per column and normalised to a single wording "
    "across all four sections, since the difference is line breaking rather "
    "than content.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: the printed page "
    "number and the standing “Need more information or forms? Visit IRS.gov.” "
    "footer.",

    "A NOTE ON TOOLING, RECORDED BECAUSE IT COST TIME. The full-fidelity "
    "renderer needs pdfjs-dist, which is not a declared dependency and had "
    "disappeared from node_modules again by this session. Reinstalling it "
    "risks disturbing @babel/core, which is also undeclared and which the "
    "build needs, so the structure here was confirmed from the vendored "
    "layout-only render (rules and cell boxes are exact even where glyphs are "
    "tofu) plus the per-item geometry, which together were sufficient.",
]

with open(TRANCHE_1, encoding="utf-8") as handle:
    tranche_1 = json.load(handle)

plan = {
    "schema_version": tranche_1["schema_version"],
    "document": tranche_1["document"],  # identical header: merge-plans requires it
    "blocks": blocks,
    "review_notes": review_notes,
}

with open(OUT, "w", encoding="utf-8") as handle:
    json.dump(plan, handle, ensure_ascii=False, indent=1)
    handle.write("\n")

print(f"wrote {OUT}: {len(blocks)} blocks, page {PAGE}, "
      f"{len([b for b in blocks if b['type'] == 'table'])} tables, "
      f"{len(review_notes)} review notes")
for name, run, floor in cross_report:
    print(f"  cross-check: {name:<32} formula reproduces {run:>4} Tax Table rows, down to ${floor}")
