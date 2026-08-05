#!/usr/bin/env python3
"""Author tranche 45 of the i1040 rebuild: printed page 105 — the Multiple
Trades or Businesses Worksheet, the sole-proprietor discussion of the net
income limitation with its three worked examples, and Schedule 1-A line 10.

Usage: python gen_tranche_45.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-45-pages-105-105.json")

PAGE = 105
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


# The net income limitation discussion resumes here. The paragraph that ends
# "...allocate the deductions in a reasonable manner." was authored whole in
# tranche 44 because it starts at the foot of page 104 and finishes BELOW this
# page's full-page worksheet; it is deliberately not repeated. This paragraph
# is printed with a first-line indent (x=54 against a column left of x=42), so
# it is a new paragraph and not the tail of that one.
para(
    "For example, a sole proprietor who only has one business and received "
    "qualified tips in the business, reports deductions allocable to the "
    "business on Schedule C, as well as the deduction for self-employment tax "
    "on Schedule 1, line 15. The net income limitation will be the net profit "
    "shown on the Schedule C for the business, less the amount from Schedule "
    "1, line 15. The sole proprietor would include on line 5 of Schedule 1-A "
    "the lesser of (i) the qualified tips received in the business, or (ii) "
    "the net profit for the business less the amount from Schedule 1, line 15. "
    "If the business shows a net loss on Schedule C, then the sole proprietor "
    "would not include any qualified tips received in the business on line 5 "
    "of Schedule 1-A."
)

heading("Multiple Trades or Businesses Worksheet", 5)
blocks.append({
    "type": "table",
    "caption": (
        "Multiple Trades or Businesses Worksheet, line 1: one row per business, "
        "A through E. All ten columns are entry spaces you fill in; they are "
        "blank in the printed form. Keep this worksheet for your records. The "
        "total is taken on line 2, given just after this table."
    ),
    "columns": [
        "Row",
        "(a) Name of your business",
        "(b) Net profit of business from Schedule C, line 31; the total of "
        "Schedule E, line 28(g) through 28(k); or Schedule F, line 34",
        "(c) Other deductions allocable to the trade or business and not "
        "reported on Schedule C, Schedule E, or Schedule F (as applicable)",
        "(d) Subtract column (c) from column (b)",
        "(e) Qualified tip amount from first Form 1099-NEC, box 1; Form "
        "1099-MISC, box 3; or Form 1099-K, box 1a",
        "(f) Qualified tip amount from second Form 1099-NEC, box 1; Form "
        "1099-MISC, box 3; or Form 1099-K, box 1a",
        "(g) Qualified tip amount from third Form 1099-NEC, box 1; Form "
        "1099-MISC, box 3; or Form 1099-K, box 1a",
        "(h) Qualified tip amount from fourth Form 1099-NEC, box 1; Form "
        "1099-MISC, box 3; or Form 1099-K, box 1a",
        "(i) Total qualified tip amount. Add columns (e), (f), (g), and (h)",
        "(j) Enter the lesser of column (d) and column (i)",
    ],
    "rows": [[letter, "", "", "", "", "", "", "", "", "", ""] for letter in "ABCDE"],
    "row_headers": True,
    "source_page": PAGE,
})
para(
    "‹Line 2.› Add lines 1A through 1E, column (j), and enter the total on "
    "Schedule 1-A, line 5."
)

heading("Example 1", 5)
para(
    "You have a business tutoring for local schools as an independent "
    "contractor. You operate your business as a sole proprietorship. During "
    "2025, you received $500 in qualified tips from students that were "
    "reported to you by the schools on Forms 1099-NEC and reported separately "
    "in earnings statements provided by the schools. Your gross income from "
    "the business for 2025 was $5,000 and your deductible expenses from the "
    "business are $500. Your net income limitation from your tutoring business "
    "is $4,500. On Schedule 1-A, line 5, you enter $500. You can take the full "
    "amount of qualified tips from the business into account when figuring "
    "your deduction because the net income from that business was more than "
    "the amount of qualified tips from the business."
)

heading("Example 2", 5)
para(
    "You are a rideshare driver who operates as a sole proprietor. During 2025, "
    "you received $1,800 in qualified tips from customers that were reported to "
    "you on Form 1099-NEC and reported separately in your earnings statement "
    "provided on the rideshare company’s app. Your gross income from the "
    "business for 2025 was $15,000 and your deductible expenses from the "
    "business were $14,000. Your net income limitation for this business is "
    "$1,000. You enter $1,000 of qualified tips on Schedule 1-A, line 5. Do "
    "not enter the remaining $800 of qualified tips. This portion of your "
    "qualified tips from the business can’t be taken into account in figuring "
    "your deduction because it is more than your net income limitation from "
    "the business."
)

heading("Example 3", 5)
para(
    "The facts are the same as in «Example 1» and «Example 2», except that you "
    "own and operate both businesses. You enter $1,500 of qualified tips on "
    "Schedule 1-A, line 5. This includes $500 from the tutoring business "
    "because the net income from that business was more than the amount of "
    "qualified tips received in the course of that business. It also includes "
    "$1,000 in qualified tips from your rideshare business. It does not "
    "include the remaining $800 of qualified tips from your rideshare business "
    "because the qualified tips received in the course of the rideshare "
    "business are more than the net income from that business by that amount."
)

heading("Line 10", 4)
para(
    "If the amount on line 10 is zero or less, your deduction for your "
    "qualified tips is not reduced. Skip lines 11 and 12 and enter the amount "
    "from Schedule 1-A, line 7, on Schedule 1-A, line 13."
)
callout(
    "Tip.",
    "For more information on the qualified tips deduction, see Notice 2025-69.",
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 45 OF A MULTI-SESSION REBUILD. This plan covers printed page 105: "
    "the Multiple Trades or Businesses Worksheet, the sole-proprietor "
    "discussion of the net income limitation with its three worked examples, "
    "and Schedule 1-A line 10. It carries no document title by design — only "
    "tranche 1 does — so this file validates through merge-plans rather than "
    "standalone. No partial rebuild is delivered.",

    "THE PARAGRAPH CARRIED FROM PAGE 104 IS NOT REPEATED. “The net income "
    "limitation applies to each separate trade or business…” begins at the "
    "foot of page 104 and finishes BELOW this page's full-page worksheet; "
    "tranche 44 authored it whole. This tranche opens at “For example, a sole "
    "proprietor…”, which the source prints with a first-line indent (x=54 "
    "against a column left of x=42) and a wider leading gap — checked in the "
    "geometry rather than guessed, because the two run together in the "
    "column-aware text.",

    "THE SOLE-PROPRIETOR PARAGRAPH IS PLACED BEFORE THE WORKSHEET, which is "
    "the one deliberate departure from print order on this page. The worksheet "
    "is a full-page insert across the top; the prose beneath it continues the "
    "net income limitation discussion sentence-for-sentence from page 104. "
    "Putting the insert first would drop a full-page table into the middle of "
    "one argument and, worse, would nest a paragraph about sole proprietors "
    "INSIDE a heading named for the worksheet, where a reader navigating by "
    "heading would never look for it. Reading order beats print order here; "
    "the table still carries its own heading and caption, so nothing about the "
    "worksheet's identity is lost.",

    "NOT A FOURTH WORKSHEET SHAPE — the third one, widened. The session log "
    "predicted a fourth shape for this page. It is the same shape tranche 44 "
    "settled, [Row, (a)…], filled ACROSS labelled columns with one row per "
    "entity and rows lettered A-E; it simply runs to column (j) instead of "
    "(d). Three shapes still cover ten worksheets. Line 2 is again a "
    "PARAGRAPH, not a table row: it is an instruction about the table with no "
    "cells under (a)-(j), and forcing it into the grid would hand a filer ten "
    "entry spaces that must not be used.",

    "EVERY CELL IN THE GRID IS BLANK BY DESIGN — 5 rows × 10 entry columns. "
    "That is what the printed worksheet is: the filer writes there. This is "
    "the exact shape that made 22 tables fail PDF/UA-1 clause 7.2 in the "
    "2026-08-05 end-to-end run, because a cell with nothing in it emits no "
    "structure element and the row arrives a column short. Fixed in the "
    "renderer, not here; the cells stay empty.",

    "“Line 10.” IS A BOLD RUN-IN AND THE DISPLAY-FACE TEST MISSES IT. The "
    "rarity rule in page_outline.cjs/page_items.cjs calls a face display when "
    "it holds under 20% of a page's glyphs. On this page the bold face "
    "g_d0_f4 carries 102 items — but 101 of them are the full-page worksheet's "
    "column headers, and the ONE below it is “Line 10.”. A page whose "
    "full-page table is set in the display face inflates that face past the "
    "threshold and the rule goes blind for the rest of the page. Settled by "
    "checking WHERE the face is used, not how often: face distribution should "
    "be measured per region. Level 4, a sibling of “Line 5” and “Net income "
    "limitation”, matching every other line instruction in Part II.",

    "THE THREE EXAMPLES ARE LEVEL-5 HEADINGS, siblings of the worksheet under "
    "“Net income limitation”, not children of it — they illustrate the "
    "limitation, not the worksheet. Numbered worked examples have been "
    "headings since tranche 8; the period is dropped. Inside Example 3 the "
    "references to «Example 1» and «Example 2» are marked emphasis: they are "
    "set in the same face as the labels, so the source draws no distinction "
    "between the label and the cross-reference, and emphasis is what every "
    "other cross-reference in this rebuild takes.",

    "THE CLOSING TIP IS LEFT PLAIN. “Notice 2025-69” is NOT marked emphasis: "
    "the whole TIP box is set in one face (g_d0_f2), so there is no italic to "
    "detect, and marking it would be inventing a distinction the source does "
    "not draw. PAGE FURNITURE OMITTED: the printed page number. Soft hyphens "
    "removed and line-break hyphens closed, while genuine compounds are kept "
    "(1099-NEC, 1099-MISC, 1099-K, 1-A, self-employment, rideshare).",
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

print(f"wrote {OUT}: {len(blocks)} blocks, page {PAGE}, {len(review_notes)} review notes")
