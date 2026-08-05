#!/usr/bin/env python3
"""Author tranche 40 of the i1040 rebuild: printed page 100 — Schedule 1 lines
24f through 24k and 24z. This completes the Instructions for Schedule 1.

Usage: python gen_tranche_40.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-40-pages-100-100.json")

PAGE = 100
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


def heading(text, level=5):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": PAGE})


def para(text):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": PAGE}
    if runs:
        block["runs"] = runs
    blocks.append(block)


heading("Line 24f")
para("Enter contributions to section 501(c)(18)(D) pension plans (see Pub. 525).")

heading("Line 24g")
para(
    "Enter contributions by certain chaplains to section 403(b) plans (see Pub. "
    "517)."
)

heading("Line 24h")
para(
    "Enter attorney fees and court costs for actions involving certain unlawful "
    "discrimination claims, but only to the extent of gross income from such "
    "actions (see Pub. 525)."
)

heading("Line 24i")
para(
    "Enter attorney fees and court costs you paid in connection with an award "
    "from the IRS for information you provided that helped the IRS detect tax "
    "law violations, up to the amount of the award includible in your gross "
    "income."
)

heading("Line 24j")
para("Enter the housing deduction from Form 2555.")

heading("Line 24k")
para(
    "Enter excess deductions of section 67(e) expenses from Schedule K-1 (Form "
    "1041), box 11, code A. See the Instructions for Schedule K-1 (Form 1041)."
)

heading("Line 24z")
para("Leave line 24z blank.")

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 40 OF A MULTI-SESSION REBUILD. This plan covers printed page 100, "
    "Schedule 1 lines 24f through 24k and 24z. **It completes the Instructions "
    "for Schedule 1** (pages 88-100). It carries no document title by design — "
    "only tranche 1 does — so this file validates through merge-plans rather "
    "than standalone. No partial rebuild is delivered.",

    "NOTHING IS CARRIED IN OR OUT. The line 24e paragraph completes on page 99 "
    "and line 24z completes here, so this tranche needs no handoff in either "
    "direction — the first page since 95 for which that is true.",

    "THE LINE HEADINGS ARE BARE LINE NUMBERS, as they are in the source. Lines "
    "24f through 24k and 24z carry no bold run-in title, unlike line 24a's "
    "“Jury duty pay.” on the previous page, so there is nothing to merge into "
    "the heading. Each instruction is a single sentence beginning “Enter…”, "
    "which is what the heading's line number already points at.",

    "“Leave line 24z blank.” IS REPRODUCED AS PRINTED. Line 24z is the "
    "schedule's catch-all write-in line, and other pages of these instructions "
    "refer to it as though a write-in may be required — the Self-Employed "
    "Health Insurance and Student Loan Interest worksheets both open by saying "
    "“if the instructions for Schedule 1, line 24z, have you enter a write-in "
    "adjustment on line 24z, figure that write-in first”. For 2025 the line 24z "
    "instruction is simply to leave it blank. The apparent tension is the "
    "source's own and is reproduced without comment or correction; a rebuild "
    "that quietly harmonised the two would be editing tax instructions.",

    "SCHEDULE 1 ENDS AT LINE 24z. There are no printed instructions for lines "
    "25 or 26 (the Part II totals), and none were dropped: the page ends after "
    "line 24z and page 101 opens the Instructions for Schedule 1-A.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed, and no "
    "icon callouts. PAGE FURNITURE OMITTED: the printed page number and the "
    "standing footer. Soft hyphens removed and line-break hyphens closed, while "
    "genuine compounds are kept (K-1, 501(c)(18)(D), 403(b), 67(e)).",
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
