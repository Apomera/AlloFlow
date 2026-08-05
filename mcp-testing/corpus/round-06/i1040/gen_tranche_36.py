#!/usr/bin/env python3
"""Author tranche 36 of the i1040 rebuild: printed page 96 — the rest of the
retirement-plan coverage discussion under Schedule 1 line 20.

A short page. Page 97 is the IRA Deduction Worksheet, which needs a two-entry-
column shape this rebuild has not used before, so it gets its own tranche.

Usage: python gen_tranche_36.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-36-pages-96-96.json")

PAGE = 96
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


# NOTE: the "Were You Covered by a Retirement Plan?" paragraph whose tail is
# printed at the top of this page was authored whole at page 95 (tranche 35).
# It is NOT repeated; this tranche opens at the "Retirement plan" box.

para(
    "The “Retirement plan” box in box 13 of your Form W-2 should be checked if "
    "you were covered by a plan at work even if you weren’t vested in the plan. "
    "You are also covered by a plan if you were self-employed and had a SEP, "
    "SIMPLE, or qualified retirement plan."
)
para(
    "If you were covered by a retirement plan and you file Form 2555 or 8815, "
    "or you exclude employer-provided adoption benefits, see Pub. 590-A to "
    "figure the amount, if any, of your IRA deduction."
)

heading("Married persons filing separately", 5)
para(
    "If you weren’t covered by a retirement plan but your spouse was, you are "
    "considered covered by a plan unless you lived apart from your spouse for "
    "all of 2025."
)
para(
    "If you are married filing separately and you lived apart from your spouse "
    "for all of 2025, check the box on line 20. If you don’t check the box on "
    "line 20, you may get a math error notice from the IRS."
)
callout(
    "Tip.",
    "You may be able to take the retirement savings contributions credit. See "
    "the Schedule 3, line 4, instructions.",
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 36 OF A MULTI-SESSION REBUILD. This plan covers printed page 96, "
    "the rest of the retirement-plan coverage discussion under Schedule 1 line "
    "20. It carries no document title by design — only tranche 1 does — so this "
    "file validates through merge-plans rather than standalone. No partial "
    "rebuild is delivered.",

    "THE PARAGRAPH AT THE TOP OF THIS PAGE IS NOT REPEATED. “Were You Covered "
    "by a Retirement Plan?” was authored whole at page 95 in tranche 35, so "
    "this tranche opens at the “Retirement plan” box sentence. Check this "
    "page's shortfall with mcp-testing/tools/carried_block_check.cjs against "
    "tranche 35.",

    "A SHORT TRANCHE ON PURPOSE. Page 96 carries only five blocks, and page 97 "
    "is the IRA Deduction Worksheet — the most complex worksheet in the "
    "document so far, with TWO entry columns (Your IRA, Spouse's IRA) rather "
    "than the single Amount column the six worksheets before it used, plus "
    "nested i./ii. options inside branch arms and two STOP conditions. That "
    "needs a column shape this rebuild has not used before, so it gets its own "
    "tranche rather than being appended here.",

    "“Married persons filing separately” IS A BOLD RUN-IN LEAD, confirmed from "
    "the face data rather than from its position: it is the page's only item in "
    "the bold serif face. Promoted to a level-5 heading with the trailing "
    "period dropped, under line 20 where it belongs.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed. Its one "
    "cross-reference, to the Schedule 3 line 4 instructions, sits inside the "
    "TIP and is plain text in the source.",

    "ICON CALLOUT as established in tranche 3: the TIP becomes a paragraph "
    "opening with a strong “Tip.” in sentence case.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing “Need "
    "more information or forms? Visit IRS.gov.” footer. Soft hyphens removed "
    "and line-break hyphens closed, while genuine compounds are kept (W-2, "
    "employer-provided, self-employed).",
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
