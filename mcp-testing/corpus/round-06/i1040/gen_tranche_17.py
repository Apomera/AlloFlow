#!/usr/bin/env python3
"""Author tranche 17 of the i1040 rebuild: printed pages 49-60 — the 2025
Earned Income Credit (EIC) Table.

THIS TRANCHE IS MECHANICAL. The 1,374 lookup rows are not transcribed; they
are parsed out of per-item page geometry and then verified against structural
invariants that a transcription error would break. Only the page-49 preamble
(title, caution, the two how-to steps, the worked example) is hand-authored.

Layout. Each printed page carries two side-by-side panels. Each panel is a
10-column grid: At least | But less than | four credit columns for single,
head of household, or qualifying surviving spouse | four for married filing
jointly. The panels are a print device, not a semantic division: reading the
left panel top to bottom and then the right panel top to bottom gives one
ascending run of income brackets that also continues across page breaks. So
stream-order text is useless here — it interleaves a left-panel row and a
right-panel row on every visual line — and the rows are rebuilt from geometry
instead, exactly as the protocol's step 3 requires for drawn tables.

Verification (all assertions below, all must pass before a plan is written):
  1. CONTIGUITY. Every bracket's "But less than" equals the next bracket's
     "At least", from the first row on page 49 to the last on page 60, with no
     gap and no overlap. A dropped cell, a misassigned column, or a panel read
     out of order all break this.
  2. Every credit cell is an integer or one of the printed footnote markers.
  3. Each of the eight credit columns is SINGLE-PEAKED over all 1,374 rows
     (phase-in, plateau, phase-out). Contiguity says nothing about the credit
     columns; this does.
  4. Credit never decreases as the number of qualifying children rises, and
     the married-filing-jointly credit is never below the single-group credit
     at the same income. Together these pin the column ORDER.
  5. Each footnote marker sits in a column whose number of children matches
     the number named in that marker's own footnote text.
  6. Column maxima are 649 / 4,328 / 7,152 / 8,046, the published 2025
     maximum EIC amounts.

Usage: python gen_tranche_17.py [out.json]
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
CACHE = os.path.join(tempfile.gettempdir(), "i1040_eic_items_49_60.json")
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-17-pages-49-60.json")

FIRST_PAGE, LAST_PAGE = 49, 60
DATA_SIZE_MAX = 5.2   # data rows are set at 4.9pt; every header is 6.5pt or more
PANEL_SPLIT = 310.0   # page is 612pt wide; the two panels meet near the middle
BAND_TOL = 1.5        # a row's two panels are painted within ~0.5pt of each other

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
    """Per-item geometry for pages 49-60, regenerated from the PDF on demand."""
    if not os.path.exists(CACHE):
        subprocess.run(
            ["node", ITEMS_TOOL, PDF, str(FIRST_PAGE), str(LAST_PAGE), "--out", CACHE],
            check=True,
        )
    with open(CACHE, encoding="utf-8") as handle:
        return json.load(handle)["pages"]


def band(items, tol=BAND_TOL):
    """Group items into visual lines by y, top of page first."""
    out = []
    for it in sorted(items, key=lambda i: -i["y"]):
        if out and abs(out[-1]["y"] - it["y"]) <= tol:
            out[-1]["items"].append(it)
            out[-1]["y"] = (out[-1]["y"] + it["y"]) / 2
        else:
            out.append({"y": it["y"], "items": [it]})
    return out


def parse_rows(page):
    """The page's lookup rows in logical order: left panel, then right panel."""
    left, right = [], []
    for b in band(page["items"]):
        if len(b["items"]) < 6 or any(i["size"] > DATA_SIZE_MAX for i in b["items"]):
            continue
        for lo_hi, sink in ((True, left), (False, right)):
            cells = sorted(
                (i for i in b["items"] if (i["x"] < PANEL_SPLIT) == lo_hi),
                key=lambda i: i["x"],
            )
            if not cells:
                continue
            assert len(cells) == 10, (
                f"page {page['page']} y={b['y']:.1f}: panel has {len(cells)} cells, expected 10"
            )
            sink.append([c["text"].strip() for c in cells])
    return left + right


def parse_notes(page):
    """The starred notes under the table: (marker, [paragraph, ...])."""
    body = [i for i in page["items"] if i["y"] < 260 and abs(i["size"] - 8.0) < 0.2 and i["x"] >= 50]
    marks = sorted(
        (i for i in page["items"] if i["y"] < 260 and i["x"] < 50 and re.fullmatch(r"\*+", i["text"])),
        key=lambda i: -i["y"],
    )
    star = [i for i in page["items"] if i["y"] < 260 and i["x"] < 60 and i["text"] == "★"]
    assert len(star) == 1, f"page {page['page']}: expected exactly one star note marker"
    star_y = star[0]["y"]
    body = [i for i in body if abs(i["y"] - star_y) > 0.6]  # drop the star note's own line

    notes = []
    for idx, mark in enumerate(marks):
        top = mark["y"] + 1.0
        bottom = marks[idx + 1]["y"] + 1.0 if idx + 1 < len(marks) else -1.0
        lines = sorted((i for i in body if bottom < i["y"] <= top), key=lambda i: -i["y"])
        # the note is two sentences set as two paragraphs: line spacing inside a
        # paragraph is ~9pt, the gap between them ~12pt.
        paras, current = [], []
        for j, line in enumerate(lines):
            if j and (lines[j - 1]["y"] - line["y"]) > 10.5:
                paras.append(" ".join(current))
                current = []
            current.append(line["text"].strip())
        if current:
            paras.append(" ".join(current))
        assert paras, f"page {page['page']}: note {mark['text']} has no text"
        notes.append((mark["text"], [re.sub(r"\s+", " ", p).strip() for p in paras]))
    return notes


def parse_example_excerpt(page):
    """The two-row illustration beside the worked example on page 49."""
    cand = [i for i in page["items"] if i["x"] >= 400 and 5.8 <= i["size"] <= 6.4 and 680 <= i["y"] <= 710]
    rows = []
    for b in band(cand):
        rows.append([i["text"].strip() for i in sorted(b["items"], key=lambda i: i["x"])])
    assert len(rows) == 2 and all(len(r) == 6 for r in rows), (
        f"example excerpt: got {[len(r) for r in rows]}, expected two rows of six"
    )
    return rows


# ------------------------------------------------------------- verification

def as_int(cell):
    return int(cell.replace(",", "")) if re.fullmatch(r"[\d,]+", cell) else None


pages = load_items()
assert [p["page"] for p in pages] == list(range(FIRST_PAGE, LAST_PAGE + 1))

rows_by_page = {p["page"]: parse_rows(p) for p in pages}
notes_by_page = {p["page"]: parse_notes(p) for p in pages}
all_rows = [r for p in pages for r in rows_by_page[p["page"]]]

# 1. contiguity across every panel and every page break
prev_high = None
for row in all_rows:
    lo, hi = as_int(row[0]), as_int(row[1])
    assert lo is not None and hi is not None, f"non-numeric bracket {row[:2]}"
    assert hi > lo, f"bracket not ascending: {row[:2]}"
    if prev_high is not None:
        assert lo == prev_high, f"DISCONTINUITY {prev_high} -> {lo}"
    prev_high = hi
assert all_rows[0][0] == "1" and all_rows[-1][1] == "68,700"
assert len(all_rows) == 1374, f"expected 1374 rows, got {len(all_rows)}"

# 2. every credit cell is an integer or a printed footnote marker
star_cells = []
for pg in pages:
    for row in rows_by_page[pg["page"]]:
        for col in range(2, 10):
            value = row[col]
            if re.fullmatch(r"\*+", value):
                star_cells.append((pg["page"], row[0], row[1], col, value))
            else:
                assert as_int(value) is not None, f"non-numeric credit {value!r} at {row[0]}"

# 3. each credit column is single-peaked, and 6. its maximum is the published one
MAXIMA = [649, 4328, 7152, 8046]
for col in range(2, 10):
    seq = [as_int(r[col]) for r in all_rows if as_int(r[col]) is not None]
    direction, rise_after_fall = 0, 0
    for i in range(1, len(seq)):
        if seq[i] > seq[i - 1]:
            if direction == -1:
                rise_after_fall += 1
            direction = 1
        elif seq[i] < seq[i - 1]:
            direction = -1
    assert rise_after_fall == 0, f"column {col} is not single-peaked"
    assert max(seq) == MAXIMA[(col - 2) % 4], f"column {col} max {max(seq)}"

# 4. column ORDER: more children never pays less; joint never pays less than single
for row in all_rows:
    for base in (2, 6):
        for col in range(base, base + 3):
            a, b = as_int(row[col]), as_int(row[col + 1])
            if a is not None and b is not None:
                assert b >= a, f"credit falls with more children at {row[0]}"
    for k in range(4):
        single, joint = as_int(row[2 + k]), as_int(row[6 + k])
        if single is not None and joint is not None:
            assert joint >= single, f"joint below single at {row[0]}"

# 5. each marker's column matches the number of children named in its own note
CHILD_WORD = {0: "no qualifying children", 1: "one qualifying child",
              2: "two qualifying children", 3: "three qualifying children"}
assert len(star_cells) == 8, f"expected 8 footnote markers, got {len(star_cells)}"
for page_no, lo, hi, col, mark in star_cells:
    note = dict(notes_by_page[page_no]).get(mark)
    assert note, f"page {page_no}: cell marker {mark} has no matching note"
    text = " ".join(note)
    assert CHILD_WORD[(col - 2) % 4] in text, (
        f"page {page_no}: marker {mark} sits in a {(col - 2) % 4}-child column "
        f"but its note says otherwise: {text[:90]}"
    )
    assert f"at least ${lo} but less than " in text, (
        f"page {page_no}: note for {mark} does not name bracket {lo}"
    )

# ------------------------------------------------------------------ authoring

STATUS_SINGLE = "Single, head of household, or qualifying surviving spouse"
STATUS_JOINT = "Married filing jointly"


def child_label(n):
    return "1 qualifying child" if n == 1 else f"{n} qualifying children"


# Each credit column opens with the word the printed header supplies in a row
# of its own ("Your credit is—"). Without it a cell announced on its own gives
# a status, a child count and a bare number, and never says the number is a
# credit.
COLUMNS = ["At least", "But less than"] + \
    [f"Your credit is: {STATUS_SINGLE}, {child_label(n)}" for n in range(4)] + \
    [f"Your credit is: {STATUS_JOINT}, {child_label(n)}" for n in range(4)]

STAR_NOTE = (
    "‹Note.› Use the single, head of household, or qualifying surviving spouse "
    "columns if your filing status is married filing separately and you qualify "
    "to claim the EIC. See the instructions for line 27a."
)

# --- page 49 preamble (the only hand-authored part of this tranche) ---------
heading("2025 Earned Income Credit (EIC) Table", 49, 4)
callout("Caution.", "This is not a tax table.", 49)
blocks.append({
    "type": "list",
    "ordered": True,
    "items": [
        "To find your credit, read down the “At least - But less than” columns "
        "and find the line that includes the amount you were told to look up "
        "from your EIC Worksheet.",
        "Then, go to the column that includes your filing status and the number "
        "of qualifying children you have who have valid SSNs as defined earlier. "
        "Enter the credit from that column on your EIC Worksheet.",
    ],
    "source_page": 49,
})
callout(
    "Example.",
    "If your filing status is single, you have one qualifying child who has a "
    "valid SSN, and the amount you are looking up from your EIC Worksheet is "
    "$2,455, you would enter $842.",
    49,
)

excerpt = parse_example_excerpt([p for p in pages if p["page"] == 49][0])
assert excerpt[1][3] == "842", f"example excerpt does not carry the worked answer: {excerpt[1]}"
assert excerpt[1][0] == "2,450" and excerpt[1][1] == "2,500"
blocks.append({
    "type": "table",
    "caption": (
        "Excerpt from the EIC Table, reproduced beside the example above to show "
        "how the lookup works. It repeats only the single, head of household, or "
        "qualifying surviving spouse columns. The example looks up $2,455, which "
        "falls in the row for at least 2,450 but less than 2,500; reading across "
        "to the column for 1 child gives the credit of 842."
    ),
    "columns": ["At least", "But less than"] +
               [f"Your credit is: {STATUS_SINGLE}, {child_label(n)}" for n in range(4)],
    "rows": [list(r) for r in excerpt],
    "row_headers": True,
    "source_page": 49,
})

# --- the twelve table parts, one per printed page --------------------------
total = LAST_PAGE - FIRST_PAGE + 1
for index, pg in enumerate(pages, start=1):
    page_no = pg["page"]
    rows = rows_by_page[page_no]
    lo, hi = rows[0][0], rows[-1][1]
    span = f"${lo} to ${hi}"
    marks = sorted({r[c] for r in rows for c in range(2, 10) if re.fullmatch(r"\*+", r[c])},
                   key=len)

    label = "2025 EIC Table" if index == 1 else "2025 EIC Table, continued"
    heading(f"{label}: part {index} of {total}, {span}", page_no, 5)

    caption = (
        f"2025 Earned Income Credit (EIC) Table, part {index} of {total}: amounts "
        f"from {span}. Caution: this is not a tax table. Find the row whose At "
        "least and But less than values bracket the amount you were told to look "
        "up from your EIC Worksheet, then read across to the column for your "
        "filing status and the number of qualifying children you have who have "
        "valid SSNs. Credit amounts are in whole dollars."
    )
    if marks:
        listed = " or ".join(f"See note {m}" for m in marks)
        caption += (
            f" A cell reading {listed} has no single credit amount; it refers to "
            "the correspondingly marked note just after this table."
        )
    blocks.append({
        "type": "table",
        "caption": caption,
        "columns": COLUMNS,
        "rows": [[f"See note {c}" if re.fullmatch(r"\*+", c) else c for c in row] for row in rows],
        "row_headers": True,
        "source_page": page_no,
    })

    para(STAR_NOTE, page_no)
    for mark, paragraphs in notes_by_page[page_no]:
        for pos, text in enumerate(paragraphs):
            para(f"‹Note {mark}.› {text}" if pos == 0 else text, page_no)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 17 OF A MULTI-SESSION REBUILD. This plan covers printed pages 49-60, "
    "the 2025 Earned Income Credit (EIC) Table. It carries no document title by "
    "design: only tranche 1 does, so this file validates through merge-plans "
    "rather than standalone. No partial rebuild is delivered.",

    "THE 1,374 LOOKUP ROWS ARE GENERATED, NOT TRANSCRIBED. gen_tranche_17.py "
    "parses them out of per-item page geometry (mcp-testing/tools/page_items.cjs) "
    "and refuses to write a plan unless six verifications pass. The load-bearing "
    "one is CONTIGUITY: every bracket's “But less than” must equal the next "
    "bracket's “At least”, unbroken from the first row on page 49 to the last on "
    "page 60. A dropped cell, a misassigned column, or a panel read out of order "
    "all break it. Only the page-49 preamble is hand-authored.",

    "THE TWO PRINTED PANELS ARE A PRINT DEVICE AND ARE MERGED. Each page sets two "
    "10-column panels side by side; reading the left panel top to bottom and then "
    "the right gives one ascending run of brackets that continues across page "
    "breaks. Stream-order text cannot be used here at all — it interleaves a "
    "left-panel row and a right-panel row on every visual line — so the rows are "
    "rebuilt from geometry, as the protocol requires for drawn tables.",

    "ONE TABLE PER PRINTED PAGE, NOT ONE TABLE OF 1,374 ROWS. The logical table is "
    "continuous, but every page must carry blocks or merge-plans reports it as "
    "uncovered, so the table is split at the printed page boundaries: twelve "
    "tables, each with the full column header repeated and its own caption "
    "naming the range it covers and its part number. Each part is preceded by a "
    "level-5 heading carrying the same range, so a reader can jump to the right "
    "part instead of scanning twelve tables.",

    "THE FOUR-LEVEL COLUMN HEADER IS FLATTENED, because the plan schema takes a "
    "flat list of column names. The printed header stacks “And your filing status "
    "is—” over two status groups, each over “0 1 2 3”, with “Your credit is—” on "
    "a row of its own. Each of the eight credit columns is therefore named with "
    "all three: “Your credit is: married filing jointly, 1 qualifying child”. "
    "Bare “0”–“3” would have been useless to a screen reader, and dropping “Your "
    "credit is” would have left a cell announcing a status, a child count and a "
    "bare number without ever saying the number is a credit. The recall check is "
    "what caught that: the word “credit” came up short, and the fix was to put it "
    "back into the column names rather than to explain the shortfall away.",

    "COLUMN ORDER IS VERIFIED, NOT ASSUMED. Contiguity proves the two bracket "
    "columns; it says nothing about the eight credit columns. Three further "
    "checks pin those: each column is single-peaked across all 1,374 rows "
    "(phase-in, plateau, phase-out); credit never decreases as the number of "
    "qualifying children rises; and the married-filing-jointly credit is never "
    "below the single-group credit at the same income. The eight column maxima "
    "come out at 649, 4,328, 7,152 and 8,046 in both status groups, which are the "
    "published 2025 maximum EIC amounts.",

    "THE EIGHT FOOTNOTE-MARKER CELLS ARE WRITTEN OUT. Eight cells print *, ** or "
    "*** instead of an amount, because the credit changes partway through the "
    "bracket. A bare asterisk conveys nothing when a cell is announced on its "
    "own, so each is authored as “See note *” and the notes follow immediately "
    "after that page's table, each opening with its own marker in bold. The "
    "generator checks every marker against its note: the column a marker sits in "
    "must match the number of children the note names, and the note must name the "
    "bracket the marker sits in. All eight agree.",

    "THE ★ NOTE IS RESOLVED RATHER THAN REPEATED VERBATIM. Every page prints "
    "“★ Use this column if your filing status is married filing separately…”, "
    "where the star refers to the single/head of household/qualifying surviving "
    "spouse group header. Once the header is flattened the star has nothing to "
    "point at, so the note is authored with the reference resolved: “Use the "
    "single, head of household, or qualifying surviving spouse columns if…”. It "
    "is kept on every page rather than stated once, because each part has to "
    "stand on its own.",

    "THE PAGE-49 PREAMBLE IS HAND-AUTHORED: the title, the “This is not a tax "
    "table” caution, the two numbered how-to steps (authored as an ordered list, "
    "as printed), and the worked example. The two-row illustration printed beside "
    "the example is kept as a small table, since it is what makes the example "
    "legible; it repeats only the single-group columns, as printed. Its caption "
    "states the connection the layout makes visually — that $2,455 falls in the "
    "2,450-to-2,500 row and the 1-child column there holds the 842 the example "
    "arrives at. The generator asserts that cell really does read 842, so the "
    "caption cannot drift from the data.",

    "THE CAUTION IS CARRIED IN EVERY CAPTION. “This is not a tax table” is printed "
    "in the running banner of all twelve pages. Rather than repeat it as twelve "
    "identical paragraphs, it is stated once as a caution on page 49 where it is "
    "set as real content, and folded into each part's caption, which is where a "
    "screen reader will announce it before the table is read.",

    "PAGE FURNITURE OMITTED, as in every earlier tranche: the printed page "
    "numbers, the “(Continued)” marker, and the standing “Need more information "
    "or forms?” footer. Cell values are kept exactly as printed, including the "
    "thousands separators and the bare “0”. No dollar signs are added inside the "
    "table; the caption states that amounts are in whole dollars.",
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

pages_covered = sorted({b["source_page"] for b in blocks})
tables = [b for b in blocks if b["type"] == "table"]
print(f"wrote {OUT}: {len(blocks)} blocks, pages {pages_covered[0]}-{pages_covered[-1]}, "
      f"{len(tables)} tables, {sum(len(t['rows']) for t in tables)} rows, "
      f"{len(review_notes)} review notes")
print(f"verified: {len(all_rows)} brackets {all_rows[0][0]}-{all_rows[-1][1]} contiguous, "
      f"{len(star_cells)} footnote markers matched to notes")
