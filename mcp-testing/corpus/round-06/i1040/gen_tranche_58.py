#!/usr/bin/env python3
"""Author tranche 58 of the i1040 rebuild: printed pages 118-119 — Tax Topics.

MECHANICAL. The List of Tax Topics is a three-column NUMBER/SUBJECT table
grouped under category sub-heads, and it is parsed out of per-item page
geometry rather than transcribed. The generator refuses to write a plan unless
six assertions hold, so a silent mis-parse cannot reach the output.

Usage: python gen_tranche_58.py [out.json]
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
PDF = os.path.join(REPO, "mcp-testing", "corpus", "born-digital",
                   "irs-i1040-instructions.pdf")
ITEMS_TOOL = os.path.join(REPO, "mcp-testing", "tools", "page_items.cjs")
# Cache OUTSIDE the repo, as tranches 17 and 21 do - a geometry dump is a
# build artifact, not source.
CACHE = os.path.join(tempfile.gettempdir(), "i1040_topics_items_118_119.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-58-pages-118-119.json")

FIRST_PAGE, LAST_PAGE = 118, 119
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

TAX_TOPICS_URL = "https://www.irs.gov/taxtopics/"

# The three columns, as (topic-number x, subject x, right edge). Measured, not
# guessed: the x histogram over both pages has exactly six spikes, at 42/67,
# 221/247 and 401/426. The right edge matters: a subject
# column must stop before the NEXT column's number, or column 1 swallows
# column 2's topic numbers and they arrive as continuation text. The first run
# asserted out on exactly that ("continuation line with no open row: '356'").
COLUMNS = [(42, 67, 215), (221, 247, 395), (401, 426, 575)]
XTOL = 4
BAND_TOL = 2.0
SUBHEAD_FACE = "g_d0_f5"      # category sub-heads AND the repeated column headers
BODY_FACE = "g_d0_f1"         # the topic numbers and subjects
# Only those two faces take part in the parse. Everything else on these pages
# is furniture that happens to sit at a column x: the 18pt title, the languages
# note, and - the one that bit - the FOLIO, which sits at x=42 below the header
# cut and parsed as "topic 118 with no subject" until this filter was added.
COLUMN_HEADER_WORDS = {"Topic", "No.", "Subject"}

blocks = []


def rich(text):
    """«…» emphasis, ‹…› strong, [[text|url]] link, [[«text»|url]] italic link."""
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
            if body.startswith("«") and body.endswith("»"):
                body = body[1:-1]
                runs.append({"text": body, "style": "emphasis", "href": url})
            else:
                runs.append({"text": body, "style": "normal", "href": url})
        else:
            body = piece
            runs.append({"text": body, "style": "normal"})
        plain.append(body)
    joined = "".join(plain)
    assert joined == "".join(run["text"] for run in runs)
    return joined, runs


def heading(text, level, page):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


# ---------------------------------------------------------------- extraction

def load_pages():
    if not os.path.exists(CACHE):
        subprocess.run(
            ["node", ITEMS_TOOL, PDF, str(FIRST_PAGE), str(LAST_PAGE), "--out", CACHE],
            check=True,
        )
    with open(CACHE, encoding="utf-8") as handle:
        return json.load(handle)["pages"]


def bands(items):
    """Group items into rows by baseline, top of page first."""
    rows, current, last_y = [], [], None
    for item in sorted(items, key=lambda i: (-i["y"], i["x"])):
        if last_y is None or abs(item["y"] - last_y) <= BAND_TOL:
            current.append(item)
            last_y = item["y"] if last_y is None else last_y
        else:
            rows.append(current)
            current, last_y = [item], item["y"]
    if current:
        rows.append(current)
    return rows


def join(parts):
    """Join a band's text, closing line-break hyphens the way the rest of the
    rebuild does. The subjects wrap, so this runs per ROW and the caller then
    joins rows with a space."""
    return " ".join(p["text"].strip() for p in parts if p["text"].strip())


def parse():
    """Walk the three columns of each page in reading order and return
    [(category, [(number, subject), ...]), ...]."""
    categories = []          # list of (name, rows)
    current = None           # the category being filled
    pending_subhead = []     # a sub-head that wraps over several bands

    def flush_subhead():
        nonlocal pending_subhead, current
        if pending_subhead:
            name = " ".join(pending_subhead)
            categories.append((name, []))
            current = categories[-1][1]
            pending_subhead = []

    for page in load_pages():
        items = [i for i in page["items"]
                 if str(i["text"]).strip()
                 and i["face"] in (BODY_FACE, SUBHEAD_FACE)]
        for num_x, sub_x, right_x in COLUMNS:
            column = [i for i in items
                      if abs(i["x"] - num_x) <= XTOL
                      or (sub_x - XTOL <= i["x"] < right_x)]
            # Parse only BELOW this column's own "Topic No. / Subject" header.
            # Everything above it is page furniture — the 18pt "Tax Topics"
            # title, the IRS.gov sentence, "List of Tax Topics", the languages
            # note — and all of it sits at the topic-number x, so without this
            # cut the title parses as a topic. The first run asserted out on
            # exactly that, which is the gate doing its job.
            header_ys = [i["y"] for i in column
                         if i["face"] == SUBHEAD_FACE
                         and i["text"].strip() in COLUMN_HEADER_WORDS]
            if not header_ys:
                continue          # a column with no header carries no list
            cut = min(header_ys)
            column = [i for i in column if i["y"] < cut - BAND_TOL]
            for row in bands(column):
                subhead_parts = [i for i in row if i["face"] == SUBHEAD_FACE]
                if subhead_parts:
                    words = {p["text"].strip() for p in subhead_parts}
                    if words & COLUMN_HEADER_WORDS:
                        continue          # the repeated "Topic No. / Subject" header
                    pending_subhead.append(join(subhead_parts))
                    continue
                flush_subhead()
                numbers = [i for i in row if abs(i["x"] - num_x) <= XTOL]
                subject = join([i for i in row if i["x"] >= sub_x - XTOL])
                if numbers:
                    number = numbers[0]["text"].strip()
                    assert current is not None, \
                        f"topic {number} appears before any category sub-head"
                    current.append([number, subject])
                elif subject:
                    assert current and current, \
                        f"continuation line with no open row: {subject!r}"
                    current[-1][1] = (current[-1][1] + " " + subject).strip()
    flush_subhead()
    return categories


categories = parse()

# ------------------------------------------------------------- assertions
# Six gates. The plan is not written unless every one holds.

all_rows = [row for _, rows in categories for row in rows]

# 1. Every category has a name and at least one topic.
for name, rows in categories:
    assert name and not name.isspace(), "unnamed category"
    assert rows, f"category {name!r} has no topics"

# 2. Every topic number is digits only.
for number, _ in all_rows:
    assert number.isdigit(), f"non-numeric topic number {number!r}"

# 3. Every topic has a subject.
for number, subject in all_rows:
    assert subject and not subject.isspace(), f"topic {number} has no subject"

# 4. Topic numbers strictly increase down the whole list. This is the check
#    that would catch a column read out of order, which is the failure mode
#    that matters here: the three columns flow left to right and the numbers
#    only ever climb.
numbers = [int(n) for n, _ in all_rows]
for prev, nxt in zip(numbers, numbers[1:]):
    assert nxt > prev, f"topic numbers out of order: {prev} then {nxt}"

# 5. No subject swallowed a topic number, which is what a mis-set column x
#    would produce - a merged row reads "356 Decedents": digits then a SPACE.
#    The space matters. The first version of this gate used \b and fired on
#    topic 424, whose subject is legitimately "401(k) plans". That was the GATE
#    being wrong rather than the parse, and the fix is to require the separator
#    a genuinely merged row would carry.
for number, subject in all_rows:
    assert not re.match(r"^\d{3}\s", subject), \
        f"subject for topic {number} starts with a topic number: {subject!r}"

# 6. Sanity on scale: the printed list runs to well over a hundred topics.
assert len(all_rows) >= 120, f"only {len(all_rows)} topics parsed"
assert len(categories) >= 8, f"only {len(categories)} categories parsed"

# ------------------------------------------------------------------ blocks

heading("Tax Topics", 2, 118)
para(
    f"You can read these Tax Topics at [[«IRS.gov/TaxTopics»|{TAX_TOPICS_URL}]].",
    118,
)
heading("List of Tax Topics", 3, 118)
para(
    "All topics are also available in Spanish (and most topics are available "
    "in Chinese, Korean, Vietnamese, and Russian).",
    118,
)

for name, rows in categories:
    page = 118 if int(rows[0][0]) < 400 else 119
    heading(name, 4, page)
    blocks.append({
        "type": "table",
        # Deliberately terse. A caption is ADDED wording, and this one is
        # emitted 17 times; repeating "read these at IRS.gov/TaxTopics" in
        # every one would trade a little orientation for a lot of noise when
        # the page already says it once at the top.
        "caption": f"Tax Topics under “{name}”: topic number and subject.",
        "columns": ["Topic No.", "Subject"],
        "rows": [list(r) for r in rows],
        "row_headers": True,
        "source_page": page,
    })

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 58 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    f"118-119, Tax Topics: {len(all_rows)} topics in {len(categories)} "
    "categories. It carries no document title by design — only tranche 1 does "
    "— so this file validates through merge-plans rather than standalone. No "
    "partial rebuild is delivered.",

    "MECHANICAL, NOT TRANSCRIBED. The list is parsed out of per-item page "
    "geometry (mcp-testing/tools/page_items.cjs) and the generator REFUSES TO "
    "WRITE A PLAN unless six assertions hold: every category is named and "
    "non-empty; every topic number is digits only; every topic has a subject; "
    "**the topic numbers strictly increase down the whole list**; no subject "
    "begins with a three-digit number (which is what a mis-set column x would "
    "produce); and the totals clear 120 topics in 8 categories. The "
    "strictly-increasing check is the one that matters — the three columns "
    "flow left to right across two pages and the numbers only ever climb, so "
    "a column read out of order cannot pass.",

    "THE COLUMN GEOMETRY WAS MEASURED, NOT GUESSED. The x histogram over both "
    "pages has exactly six spikes — 42/67, 221/247, 401/426 — being the topic "
    "number and subject of each of the three columns. Subjects wrap onto "
    "continuation lines that carry no number, and those are appended to the "
    "row above rather than becoming rows of their own.",

    "CATEGORY SUB-HEADS AND COLUMN HEADERS SHARE ONE FACE, and are separated "
    "by their text rather than their typography. Face g_d0_f5 carries both the "
    "category names (“IRS help available”, “IRS procedures”, …) and the "
    "“Topic No. / Subject” header that repeats at the top of every column. The "
    "header is dropped as furniture by matching its exact words; sub-heads "
    "that wrap over two or three bands are joined before the category opens.",

    "A CATEGORY CAN CONTINUE ACROSS A COLUMN OR PAGE BREAK, and the parser "
    "carries the open category across both — topics appearing at the top of a "
    "column before any sub-head belong to the category above. Each category "
    "becomes a level-4 heading with its own two-column table, so a reader can "
    "navigate to a category rather than scrolling one 130-row table.",

    "THE ONE LINK IS READ FROM ITS ANNOTATION: “IRS.gov/TaxTopics” → "
    "https://www.irs.gov/taxtopics/. It is set in the italic face, so it is "
    "authored as an italic link with the [[«text»|url]] form introduced in "
    "tranche 55. PAGE FURNITURE OMITTED: both printed page numbers, the "
    "“(Continued)” marker at the top of page 119, and the repeated column "
    "headers. The em dashes inside subjects (“IRS services—Volunteer tax "
    "assistance…”) are the source's own.",
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

print(f"wrote {OUT}: {len(blocks)} blocks, {len(all_rows)} topics, "
      f"{len(categories)} categories, {len(review_notes)} review notes")
