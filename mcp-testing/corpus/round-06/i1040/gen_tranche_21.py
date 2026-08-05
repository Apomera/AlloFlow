#!/usr/bin/env python3
"""Author tranche 21 of the i1040 rebuild: printed pages 68-79 — the 2025 Tax
Table. MECHANICAL, like tranche 17.

2,062 lookup rows covering taxable income from $0 to $100,000, parsed out of
per-item page geometry and verified before a plan is written. Only the page-68
preamble (title, caution, worked example, sample table) is hand-authored.

Layout, and how it differs from the EIC Table in tranche 17: each page sets
THREE panels side by side, each a 6-column grid (At least, But less than, and
one tax column per filing status). The panels are NOT aligned by y — page 68's
first panel carries 42 rows because income under $100 is bracketed in finer
steps, while panels 2 and 3 carry 40 rows plus a "1,000"/"2,000" section
heading. So the panels are read INDEPENDENTLY by x-range and concatenated,
rather than banded across the page as the EIC parser could do.

Verification (all assertions below; no plan is written unless every one holds):
  1. CONTIGUITY. Every bracket's "But less than" equals the next bracket's
     "At least", unbroken from $0 on page 68 to $100,000 on page 79.
  2. 2,062 rows, which is what the printed bracket scheme requires: 6 rows
     below $100, 116 rows of $25 steps to $3,000, then 1,940 rows of $50
     steps to $100,000.
  3. Every tax cell is an integer, and none exceeds its own bracket ceiling.
  4. The Single and Married-filing-separately columns are IDENTICAL in all
     2,062 rows (the 2025 brackets for the two coincide below $100,000). A
     column read into the wrong slot breaks this immediately.
  5. Married filing jointly <= Head of household <= Single, row by row.
  6. All four tax columns are non-decreasing as income rises.

Usage: python gen_tranche_21.py [out.json]
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
PDF = os.path.join(HERE, "..", "..", "born-digital", "irs-i1040-instructions.pdf")
ITEMS_TOOL = os.path.join(REPO, "mcp-testing", "tools", "page_items.cjs")
CACHE = os.path.join(tempfile.gettempdir(), "i1040_tax_items_68_79.json")
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-21-pages-68-79.json")

FIRST_PAGE, LAST_PAGE = 68, 79
PANELS = ((0, 215), (215, 395), (395, 620))
DATA_SIZE = 5.7          # the lookup rows; every heading and note is larger
BAND_TOL = 1.5
NUM = re.compile(r"^[\d,]+$")
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


def heading(text, page, level):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body, page):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": page})


# ---------------------------------------------------------------- extraction

def load_items():
    if not os.path.exists(CACHE):
        subprocess.run(
            ["node", ITEMS_TOOL, PDF, str(FIRST_PAGE), str(LAST_PAGE), "--out", CACHE],
            check=True,
        )
    with open(CACHE, encoding="utf-8") as handle:
        return json.load(handle)["pages"]


def band(items, tol=BAND_TOL):
    out = []
    for it in sorted(items, key=lambda i: -i["y"]):
        if out and abs(out[-1]["y"] - it["y"]) <= tol:
            out[-1]["items"].append(it)
            out[-1]["y"] = (out[-1]["y"] + it["y"]) / 2
        else:
            out.append({"y": it["y"], "items": [it]})
    return out


def parse_page(page):
    """Rows in logical order: panel 1 top to bottom, then panel 2, then 3.

    Anything inside a panel's x-range that is NOT a 6-cell numeric row is
    returned separately, so nothing can be dropped silently.
    """
    rows, other = [], []
    for lo, hi in PANELS:
        cand = [i for i in page["items"]
                if abs(i["size"] - DATA_SIZE) < 0.25 and lo <= i["x"] < hi]
        for b in band(cand):
            cells = [i["text"].strip() for i in sorted(b["items"], key=lambda i: i["x"])]
            if len(cells) == 6 and all(NUM.match(c) for c in cells):
                rows.append(cells)
            else:
                other.append((page["page"], round(b["y"], 1), cells))
    return rows, other


def parse_sample_table(page):
    """The four-row illustration beside the worked example on page 68."""
    # The bracket columns are set at 7.5pt and the tax columns at 8pt, so the
    # size window has to span BOTH or every row comes back half-empty. The
    # surrounding example prose is 8.5pt and sits at x~130, so it is excluded
    # by size and by x.
    cand = [i for i in page["items"]
            if i["x"] >= 390 and 7.3 <= i["size"] <= 8.2 and 655 <= i["y"] <= 700]
    rows = []
    for b in band(cand):
        cells = [i["text"].strip() for i in sorted(b["items"], key=lambda i: i["x"])]
        if len(cells) == 6 and all(NUM.match(c) for c in cells):
            rows.append(cells)
    assert len(rows) == 4, f"sample table: expected 4 rows, got {len(rows)}"
    return rows


# ------------------------------------------------------------- verification

def as_int(cell):
    return int(cell.replace(",", ""))


pages = load_items()
assert [p["page"] for p in pages] == list(range(FIRST_PAGE, LAST_PAGE + 1))

rows_by_page, leftovers = {}, []
for pg in pages:
    rows, other = parse_page(pg)
    rows_by_page[pg["page"]] = rows
    leftovers.extend(other)

all_rows = [r for pg in pages for r in rows_by_page[pg["page"]]]

# The ONLY non-row content that may sit inside a panel's x-range is the note in
# page 79's third panel pointing over-$100,000 filers at the worksheet. Anything
# else means the parser is dropping something.
EXPECTED_LEFTOVER = ["$100,000", "or over", "use the Tax", "Computation", "Worksheet"]
assert [c for _, _, cells in leftovers for c in cells] == EXPECTED_LEFTOVER, (
    f"unexpected non-row content inside the panels: {leftovers}"
)

# 1. contiguity, and 2. the row count the bracket scheme requires
prev = None
for row in all_rows:
    lo, hi = as_int(row[0]), as_int(row[1])
    assert hi > lo, f"bracket not ascending: {row[:2]}"
    if prev is not None:
        assert lo == prev, f"DISCONTINUITY {prev} -> {lo}"
    prev = hi
assert all_rows[0][0] == "0" and all_rows[-1][1] == "100,000"
assert len(all_rows) == 2062, f"expected 2062 rows, got {len(all_rows)}"

# 3. every tax cell is an integer no larger than its own bracket ceiling
for row in all_rows:
    for col in range(2, 6):
        assert NUM.match(row[col]), f"non-numeric tax {row[col]!r} at {row[0]}"
        assert as_int(row[col]) <= as_int(row[1]), f"tax above bracket at {row[0]}"

# 4-6. the column checks that pin which column is which
for row in all_rows:
    single, joint, separate, household = (as_int(row[c]) for c in range(2, 6))
    assert single == separate, f"single != married-filing-separately at {row[0]}"
    assert joint <= household <= single, f"column order wrong at {row[0]}"
for col in range(2, 6):
    seq = [as_int(r[col]) for r in all_rows]
    assert all(b >= a for a, b in zip(seq, seq[1:])), f"column {col} decreases"

# ------------------------------------------------------------------ authoring

COLUMNS = [
    "At least",
    "But less than",
    "Your tax is: Single",
    "Your tax is: Married filing jointly",
    "Your tax is: Married filing separately",
    "Your tax is: Head of a household",
]
JOINT_NOTE = (
    "‹Note.› The married filing jointly column must also be used by a "
    "qualifying surviving spouse."
)

heading("2025 Tax Table", 68, 2)
callout(
    "Caution.",
    "See the instructions for line 16 to see if you must use the Tax Table "
    "below to figure your tax.",
    68,
)
callout(
    "Example.",
    "A married couple is filing a joint return. Their taxable income on Form "
    "1040, line 15, is $25,300. First, they find the $25,300-25,350 taxable "
    "income line. Next, they find the column for married filing jointly and "
    "read down the column. The amount shown where the taxable income line and "
    "filing status column meet is $2,562. This is the tax amount they should "
    "enter in the entry space on Form 1040, line 16.",
    68,
)

sample = parse_sample_table([p for p in pages if p["page"] == 68][0])
assert sample[2][0] == "25,300" and sample[2][3] == "2,562", (
    f"sample table does not carry the worked answer: {sample[2]}"
)
blocks.append({
    "type": "table",
    "caption": (
        "Sample Table, printed beside the example above to show how the lookup "
        "works. The example looks up taxable income of $25,300, which falls in "
        "the row for at least 25,300 but less than 25,350; reading across to "
        "the married filing jointly column gives the tax of 2,562."
    ),
    "columns": COLUMNS,
    "rows": [list(r) for r in sample],
    "row_headers": True,
    "source_page": 68,
})

total = LAST_PAGE - FIRST_PAGE + 1
for index, pg in enumerate(pages, start=1):
    page_no = pg["page"]
    rows = rows_by_page[page_no]
    lo, hi = rows[0][0], rows[-1][1]
    span = f"${lo} to ${hi}"
    label = "2025 Tax Table" if index == 1 else "2025 Tax Table, continued"
    heading(f"{label}: part {index} of {total}, {span}", page_no, 3)
    blocks.append({
        "type": "table",
        "caption": (
            f"2025 Tax Table, part {index} of {total}: taxable income from {span}. "
            "Find the row whose At least and But less than values bracket the "
            "amount on Form 1040 or 1040-SR, line 15, then read across to the "
            "column for your filing status. Tax amounts are in whole dollars."
        ),
        "columns": COLUMNS,
        "rows": rows,
        "row_headers": True,
        "source_page": page_no,
    })
    para(JOINT_NOTE, page_no)

para(
    "If your taxable income is $100,000 or over, use the Tax Computation "
    "Worksheet, next.",
    79,
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 21 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "68-79, the 2025 Tax Table. It carries no document title by design — only "
    "tranche 1 does — so this file validates through merge-plans rather than "
    "standalone. No partial rebuild is delivered.",

    "THE 2,062 LOOKUP ROWS ARE GENERATED, NOT TRANSCRIBED, as in tranche 17. "
    "gen_tranche_21.py parses them from per-item geometry and refuses to write "
    "a plan unless six checks pass. The load-bearing one is CONTIGUITY: every "
    "bracket's “But less than” must equal the next bracket's “At least”, "
    "unbroken from $0 on page 68 to $100,000 on page 79. The row count is "
    "checked against what the printed bracket scheme requires — 6 rows below "
    "$100, 116 rows of $25 steps to $3,000, then 1,940 rows of $50 steps — and "
    "comes out at exactly 2,062.",

    "THE THREE PANELS ARE READ INDEPENDENTLY, WHICH THE EIC TABLE DID NOT NEED. "
    "Each page sets three 6-column panels side by side, but unlike the EIC "
    "Table they are NOT aligned by y: page 68's first panel carries 42 rows "
    "because income under $100 is bracketed in finer steps, while panels 2 and "
    "3 carry 40 rows plus a section heading. Banding across the full page would "
    "pair a row from one panel with an unrelated row from another. Each panel "
    "is therefore parsed on its own x-range and the three are concatenated left "
    "to right, which is also the printed reading order.",

    "WHICH COLUMN IS WHICH IS VERIFIED, NOT ASSUMED. Contiguity proves the two "
    "bracket columns and says nothing about the four tax columns. Three further "
    "checks pin those. The Single and Married-filing-separately columns are "
    "IDENTICAL in all 2,062 rows, which is true because the 2025 brackets for "
    "the two coincide below $100,000 — a column read into the wrong slot breaks "
    "it at once. Married filing jointly is never above Head of household, which "
    "is never above Single, row by row. And all four columns are non-decreasing "
    "as income rises, so no cell can have been picked up from the wrong line.",

    "THE TWO IDENTICAL COLUMNS ARE BOTH KEPT. Single and Married filing "
    "separately hold the same figure in every row of this table, so one of them "
    "is strictly redundant as data. They are kept separate anyway: a reader "
    "looking up “married filing separately” has to find that column, and "
    "collapsing the two would make them hunt for their status under someone "
    "else's name. The identity is a verification result, not a licence to merge.",

    "NOTHING INSIDE A PANEL IS DROPPED SILENTLY. The parser collects every band "
    "in a panel's x-range that is not a six-cell numeric row and asserts the "
    "collection is exactly one known item — the note in page 79's third panel "
    "sending filers at or above $100,000 to the Tax Computation Worksheet, "
    "which is authored as a paragraph. Any other stray content aborts the run "
    "instead of vanishing.",

    "ONE TABLE PER PRINTED PAGE, as in tranche 17: the logical table is "
    "continuous, but every page must carry blocks or merge-plans reports it "
    "uncovered. Twelve tables, each repeating the full column header, each "
    "preceded by a level-3 heading and carrying a caption that names its income "
    "range and part number so a reader can jump to the right part.",

    "THE COLUMN HEADER IS FLATTENED and each tax column is named with “Your tax "
    "is” and its filing status in full, because the plan schema takes a flat "
    "list of names and the printed header stacks “And you are—” over the four "
    "statuses with “Your tax is—” on a row of its own. A cell announced on its "
    "own therefore says whose tax it is and that it is a tax.",

    "THE ASTERISK ON “MARRIED FILING JOINTLY” IS RESOLVED INTO A NOTE. Every "
    "page prints “* This column must also be used by a qualifying surviving "
    "spouse.” Once the header is flattened the asterisk has nothing to point "
    "at, so the note follows each table with the reference resolved: “The "
    "married filing jointly column must also be used by a qualifying surviving "
    "spouse.” It is repeated on every part rather than stated once, because "
    "each part has to stand on its own — the same treatment the EIC Table's ★ "
    "note got in tranche 17.",

    "THE $1,000 SECTION HEADINGS ARE DROPPED. The printed table breaks into "
    "blocks headed “1,000”, “2,000”, “3,000” and so on, set large at the top of "
    "each panel. They are a device for finding your place while scanning a "
    "printed page, and the At least column already carries the same figure on "
    "the row below each of them. Keeping them would insert bare numbers into "
    "the reading order with nothing to say.",

    "THE PAGE-68 PREAMBLE IS HAND-AUTHORED: the title, the caution about "
    "checking the line 16 instructions first, and the worked example. The "
    "four-row Sample Table printed beside the example is kept, since it is what "
    "makes the example legible, and its caption states the connection the "
    "layout makes visually — that $25,300 falls in the 25,300-to-25,350 row and "
    "the married filing jointly column there holds the 2,562 the example "
    "arrives at. The generator asserts that cell really does read 2,562, so the "
    "caption cannot drift from the data.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: printed page numbers, "
    "the “(Continued)” marker, the repeated “2025 Tax Table — Continued” "
    "running banner, and the standing “Need more information or forms?” footer. "
    "Cell values are kept exactly as printed, including thousands separators "
    "and the bare “0”; no dollar signs are added inside the table, and the "
    "captions state that amounts are whole dollars.",
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

covered = sorted({b["source_page"] for b in blocks})
tables = [b for b in blocks if b["type"] == "table"]
print(f"wrote {OUT}: {len(blocks)} blocks, pages {covered[0]}-{covered[-1]}, "
      f"{len(tables)} tables, {sum(len(t['rows']) for t in tables)} rows, "
      f"{len(review_notes)} review notes")
print(f"verified: {len(all_rows)} brackets {all_rows[0][0]}-{all_rows[-1][1]} contiguous; "
      f"single == married-filing-separately in every row")
