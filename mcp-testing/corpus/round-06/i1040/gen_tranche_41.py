#!/usr/bin/env python3
"""Author tranche 41 of the i1040 rebuild: printed page 101 — the opening of the
Instructions for Schedule 1-A, Additional Deductions: General Instructions,
Part I (MAGI), and the start of Part II (No Tax on Tips).

Usage: python gen_tranche_41.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-41-pages-101-101.json")

PAGE = 101
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


def bullets(items):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


heading("Instructions for Schedule 1-A: Additional Deductions", 2)

heading("General Instructions", 3)
para(
    "Use Schedule 1-A to report additional deductions that can’t be entered "
    "directly on Form 1040, 1040-SR, or 1040-NR. You can claim these deductions "
    "whether you claim the standard deduction or itemize deductions on Schedule "
    "A or Schedule A (Form 1040-NR)."
)
para(
    "These additional deductions are deductions for qualified tips, qualified "
    "overtime compensation, no tax on car loan interest, and the enhanced "
    "deduction for seniors. The amount on line 38 of Schedule 1-A is entered on "
    "Form 1040 or 1040-SR, line 13b, and on Form 1040-NR, line 13c."
)
callout(
    "Caution.",
    "If you are filing a tax return on Form 1041 for an estate or trust and "
    "intend to claim the deduction for car loan interest, see the “No Tax on "
    "Car Loan Interest” worksheet in the Instructions for Form 1041.",
)

heading("Part I. Modified Adjusted Gross Income (MAGI) Amount", 3)
para(
    "Use Part I of Schedule 1-A to figure your MAGI. If you don’t have income "
    "from Puerto Rico that you excluded from your income, or you aren’t filing "
    "Form 2555 or 4563, then enter the amount from Form 1040, 1040-SR, or "
    "1040-NR, line 11b, on Schedule 1-A, line 3. If you do have excluded income "
    "from Puerto Rico, or you are filing Form 2555 or 4563, complete lines 2a "
    "through 2e in Part I of Schedule 1-A to figure your MAGI."
)

heading("Part II. No Tax on Tips", 3)
para(
    "In general, tips received as an employee or from self-employment must be "
    "included in your gross income and are subject to income tax and social "
    "security and Medicare tax."
)
para(
    "If you received cash and charge tips of $20 or more in a calendar month "
    "and didn’t report all of those tips to your employer, you must file Form "
    "4137. You must also file Form 4137 if your Form(s) W-2, box 8, shows "
    "allocated tips that you must report as income."
)
para(
    "If you have net earnings from self-employment, use Schedule SE to figure "
    "the tax due on net earnings from self-employment."
)
para(
    "You may be able to claim a deduction for qualified tips paid to you in "
    "2025 that are included on Form W-2, Form 1099-NEC, Form 1099-MISC, Form "
    "1099-K, or reported directly by you on Form 4137."
)
para(
    "You can claim this deduction whether you claim the standard deduction or "
    "itemize deductions on Schedule A or Schedule A (Form 1040-NR)."
)
callout(
    "Caution.",
    "If you are married, you must file a joint return with your spouse to claim "
    "this deduction.",
)
callout(
    "Caution.",
    "For tax year 2025, Form W-2, Form 1099-NEC, Form 1099-MISC, and Form "
    "1099-K were not updated to separately identify tips that may qualify for "
    "this deduction. See «Determining the amount of qualified tips received by "
    "employees» and «Determining the amount of qualified tips received by "
    "non-employees», later. Also, see the instructions for lines 4a and 5 for "
    "more information about how to identify the qualified tips included in the "
    "amounts reported on these forms.",
)
para("Fill out Schedule 1-A, Part II, only if:")
bullets([
    "You (and/or your spouse if filing a joint return) received qualified tips "
    "in 2025.",
    "You have a valid social security number (SSN). If you are married filing a "
    "joint return, the spouse who received the qualified tips must have a valid "
    "SSN.",
])

heading("Maximum amount of deduction", 4)
para(
    "You can’t deduct more than $25,000 of qualified tips, regardless of your "
    "filing status. If you are self-employed, your tips from your trade or "
    "business are taken into account in figuring the deduction only to the "
    "extent you had net income. Your net income is the gross income from the "
    "trade or business in which the qualified tips were received less the "
    "amount of the total deductions (other than the deduction for qualified "
    "tips) allocable to that trade or business. See «Net income limitation», "
    "later."
)
callout(
    "Tip.",
    "If you are married and filing a joint return, and both you and your spouse "
    "have qualified tip income, the $25,000 maximum amount of deduction limit "
    "applies to your combined qualified tip income. It is not a per spouse "
    "limit.",
)
para(
    "The deduction amount (after applying the $25,000 deduction limit) is "
    "reduced if your MAGI is more than the amount shown next for your filing "
    "status."
)
bullets([
    "Married filing jointly—$300,000.",
    "Single, Head of household, or Qualifying surviving spouse—$150,000.",
])
para("Your MAGI is the amount on line 3 in Part I of Schedule 1-A.")

heading("Qualified Tips", 4)
para(
    "Qualified tips are tips that you received from customers or, as an "
    "employee, through a tip-sharing arrangement in an occupation that "
    "customarily and regularly received tips on or before December 31, 2024. "
    "See «Occupations that customarily and regularly received tips on or before "
    "December 31, 2024», later. Qualified tips are tips that are:"
)
# The last item is printed at the top of page 102; the list is authored whole.
bullets([
    "Cash tips,",
    "Paid voluntarily,",
    "Not the subject of negotiation, and",
    "Determined by the customer/payor.",
])

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 41 OF A MULTI-SESSION REBUILD. This plan covers printed page 101, "
    "the opening of the Instructions for Schedule 1-A. It carries no document "
    "title by design — only tranche 1 does — so this file validates through "
    "merge-plans rather than standalone. No partial rebuild is delivered.",

    "THE FIRST PAGE IN THIS REBUILD WHOSE LINK ANNOTATIONS HAVE NO URL. Page "
    "101 carries two Link annotations and both are INTERNAL GoTo destinations "
    "(named destination en_US_2025_publink1000168847), not web addresses — they "
    "make “Net income limitation, later” clickable within the PDF. The plan "
    "schema's href takes a URL, and inventing an anchor that does not exist in "
    "the plan would be worse than leaving the reference plain, so both are "
    "marked emphasis as the italic already indicates. THE SOURCE IS SLIGHTLY "
    "RICHER THAN THE REBUILD HERE, and that is worth saying plainly rather than "
    "leaving it to be discovered.",

    "THE SCHEDULE'S SUBTITLE IS FOLDED INTO ITS HEADING, as for Schedule 1 in "
    "tranche 28: “Instructions for Schedule 1-A: Additional Deductions”. The "
    "table of contents lists only the first half.",

    "THE PART HEADINGS KEEP THEIR NUMBER AND TITLE TOGETHER — “Part I. Modified "
    "Adjusted Gross Income (MAGI) Amount”, “Part II. No Tax on Tips” — for the "
    "same reason “Line NN. Title” pairs are merged everywhere else: a heading "
    "list of “Part I, Part II” tells a reader nothing. They are level 3, "
    "siblings of General Instructions.",

    "“Maximum amount of deduction” AND “Qualified Tips” ARE BOTH LEVEL 4. The "
    "first is a bold run-in lead and the second a 12pt heading, so they look "
    "different in print, but both are direct children of Part II with nothing "
    "between, and the validator rejects the h3-to-h5 skip that treating the "
    "run-in as level 5 would create. Same lesson as tranche 24: the level a "
    "run-in takes depends on what encloses it.",

    "THE “QUALIFIED TIPS ARE TIPS THAT ARE” LIST SPANS THE 101-102 BREAK and is "
    "authored whole here; its fourth item, “Determined by the customer/payor.”, "
    "is printed at the top of page 102. The page-102 tranche must not "
    "re-author it and should open at “Cash tips.”.",

    "ICON CALLOUTS as established in tranche 3: three CAUTION boxes and one TIP "
    "become paragraphs opening with a strong label in sentence case. ITALIC "
    "CROSS-REFERENCES marked as emphasis, including the two that the source "
    "also makes into internal links.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing footer. "
    "Soft hyphens removed and line-break hyphens closed, while genuine "
    "compounds are kept (1040-SR, 1040-NR, 1099-NEC, 1099-MISC, 1099-K, W-2, "
    "self-employment, tip-sharing, non-employees, customer/payor). The em "
    "dashes before the MAGI thresholds are the source's own.",
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
