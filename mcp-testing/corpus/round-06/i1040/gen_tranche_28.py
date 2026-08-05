#!/usr/bin/env python3
"""Author tranche 28 of the i1040 rebuild: printed page 88 — the opening of the
Instructions for Schedule 1: General Instructions, Form(s) 1099-K with its four
worked examples, and the start of Additional Income at line 1.

First page of the schedule instructions (88-117), the largest remaining block.

Usage: python gen_tranche_28.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-28-pages-88-88.json")

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


def heading(text, level, page=88):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page=88):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body, page=88):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": page})


def bullets(items, page=88):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded],
             "source_page": page}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


heading("Instructions for Schedule 1: Additional Income and Adjustments to Income", 2)

heading("General Instructions", 3)
para(
    "Use Schedule 1 to report income or adjustments to income that can’t be "
    "entered directly on Form 1040, 1040-SR, or 1040-NR."
)
para(
    "Additional income is entered on Schedule 1, Part I. The amount on line 10 "
    "of Schedule 1 is entered on Form 1040, 1040-SR, or 1040-NR, line 8."
)
para(
    "Adjustments to income are entered on Schedule 1, Part II. The amount on "
    "line 26 is entered on Form 1040, 1040-SR, or 1040-NR, line 10."
)

heading("Form(s) 1099-K", 4)
para(
    "If, for tax year 2025, you received a Form(s) 1099-K that shows payments "
    "that were included in error (for example, money for gifts or "
    "reimbursements) or for personal items that you sold at a loss (for "
    "example, an old refrigerator), enter the amount that was included in error "
    "or for personal items sold at a loss in the entry space at the top of "
    "Schedule 1."
)
bullets([
    "If the entire amount reported to you on Form(s) 1099-K was in error or for "
    "personal items sold at a loss, enter the total amount from Form(s) 1099-K, "
    "box 1(a), in the entry space at the top of Schedule 1.",

    "If only some of the amount reported to you on Form(s) 1099-K in box 1(a) "
    "was in error or for personal items sold at a loss, only enter the amount "
    "that was in error or for personal items sold at a loss in the entry space "
    "at the top of Schedule 1. The remaining amounts reported to you on Form(s) "
    "1099-K should be reported elsewhere on your return depending on the nature "
    "of the transactions.",

    "If you received more than one incorrect Form(s) 1099-K, with amounts "
    "reported in error or for personal items sold at a loss, add the incorrect "
    "amounts together and enter the total incorrect amount in the entry space "
    "at the top of Schedule 1. The remaining amounts reported to you on Form(s) "
    "1099-K in box 1(a) should be reported elsewhere on your return depending "
    "on the nature of the transactions.",
])
callout(
    "Tip.",
    "If you received a Form 1099-K for a personal item that you sold at a gain, "
    "don’t report this amount in the entry space at the top of Schedule 1; "
    "instead, report it as you would report any other capital gain on Form 8949 "
    "and Schedule D.",
)
callout(
    "Tip.",
    "For 2025, payment card companies, payment apps, and online marketplaces "
    "will be required to send you a Form 1099-K only if the amount of your "
    "business transactions during the year is more than $20,000 and the total "
    "number of your transactions is more than 200.",
)

heading("Example–Incorrect Form 1099-K", 5)
para(
    "You received a Form 1099-K that incorrectly showed $800 of payments to you "
    "in box 1(a). You would enter $800 in the entry space at the top of "
    "Schedule 1."
)

heading("Example–Personal item sold at a loss", 5)
para(
    "You bought a couch for $1,000 and sold it through a third-party vendor for "
    "$700, which was reported in box 1(a) of your Form 1099-K. You would enter "
    "$700 in the entry space at the top of Schedule 1."
)

heading("Example–Personal items sold at a loss and a gain", 5)
para(
    "In addition to selling your couch for $700, you also sold a handbag that "
    "you bought for $800 and sold for $1,200. Your Form 1099-K shows $1,900 in "
    "box 1(a). You would enter $700 in the entry space at the top of Schedule 1 "
    "for your loss on selling the couch, and the remaining $400 of gain from "
    "the sale of the handbag would be reported as capital gain on Form 8949 and "
    "Schedule D."
)

heading("Example–Multiple incorrect Form(s) 1099-K", 5)
para(
    "You received a Form 1099-K that incorrectly showed $800 of payments to you "
    "in box 1(a). You also received a Form 1099-K that reported $6,000 in box "
    "1(a) but $700 of that amount was reported in error. You would enter $1,500 "
    "in the entry space at the top of Schedule 1. The remaining $5,300 should "
    "be reported elsewhere on your return depending on the nature of the "
    "transactions."
)

heading("Additional Income", 3)
heading(
    "Line 1. Taxable Refunds, Credits, or Offsets of State and Local Income Taxes",
    4,
)
callout(
    "Tip.",
    "None of your refund is taxable if, in the year you paid the tax, you "
    "either (a) didn’t itemize deductions, or (b) elected to deduct state and "
    "local general sales taxes instead of state and local income taxes.",
)
para(
    "If you received a refund, credit, or offset of state or local income taxes "
    "in 2025, you may be required to report this amount. If you didn’t receive "
    "a Form 1099-G, check with the government agency that made the payments to "
    "you. Your 2025 Form 1099-G may have been made available to you only in an "
    "electronic format, and you will need to get instructions from the agency "
    "to retrieve this document. Report any taxable refund you received even if "
    "you didn’t receive Form 1099-G."
)
para(
    "If you chose to apply part or all of the refund to your 2025 estimated "
    "state or local income tax, the amount applied is treated as received in "
    "2025. If the refund was for a tax you paid in 2024 and you deducted state "
    "and local income taxes on your 2024 Schedule A, use the «State and Local "
    "Income Tax Refund Worksheet» in these instructions to see if any of your "
    "refund is taxable."
)

heading("Exception", 5)
para(
    "See «Itemized Deduction Recoveries» in Pub. 525 instead of using the State "
    "and Local Income Tax Refund Worksheet in these instructions if any of the "
    "following applies."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 28 OF A MULTI-SESSION REBUILD. This plan covers printed page 88, "
    "the opening of the Instructions for Schedule 1. It carries no document "
    "title by design — only tranche 1 does — so this file validates through "
    "merge-plans rather than standalone. No partial rebuild is delivered.",

    "THE READING ORDER WAS REBUILT FROM GEOMETRY, NOT TAKEN FROM THE COLUMN-"
    "AWARE TEXT. This page changes layout down the page — a full-width subtitle "
    "banner over three columns, then two TIP boxes that the body wraps around — "
    "and the column detector loses the thread partway down, interleaving "
    "sentences from different columns (“The remaining amounts reported to you "
    "on Form(s) 1099-K in 88 Additional Income and Adjustments to Income box "
    "1(a) should be reported elsewhere would enter $1,500 in the entry space "
    "at…”). Each column was banded independently and read top to bottom "
    "instead, which is the treatment session 3 prescribed for pages whose "
    "layout changes down the page.",

    "THE SCHEDULE'S SUBTITLE IS FOLDED INTO ITS HEADING. The page prints "
    "“Instructions for Schedule 1” and “Additional Income and Adjustments to "
    "Income” as two separate full-width lines; the table of contents lists only "
    "the first. They are authored as one level-2 heading, “Instructions for "
    "Schedule 1: Additional Income and Adjustments to Income”, so a reader "
    "landing on it from a heading list learns which schedule it is AND what "
    "that schedule is for. Same treatment as “Line 28. Additional Child Tax "
    "Credit” in tranche 18.",

    "THE FOUR WORKED EXAMPLES BECOME LEVEL-5 HEADINGS with their trailing "
    "period dropped and the source's en dash kept (“Example–Incorrect Form "
    "1099-K”). They are parallel cases a reader picks between rather than "
    "prose to read through, so as headings they can be scanned; buried in "
    "paragraphs they cannot.",

    "PAGE 88 CARRIES NO LINK ANNOTATIONS AT ALL, checked rather than assumed. "
    "Its cross-references — the State and Local Income Tax Refund Worksheet, "
    "Itemized Deduction Recoveries — are italic in the source and are marked "
    "emphasis only.",

    "NOTHING SPANS THE 88-89 BREAK. The “Exception” paragraph ends on page 88 "
    "with “…if any of the following applies.”, and the list it introduces is "
    "printed wholly on page 89. So no block is carried here, and the page-89 "
    "tranche opens with that list. It should keep the list attached to this "
    "Exception heading rather than starting a new topic above it.",

    "ICON CALLOUTS as established in tranche 3: the three TIP boxes become "
    "paragraphs opening with a strong “Tip.” in sentence case. Two of them "
    "interrupt the Form(s) 1099-K discussion in print and are placed after the "
    "bulleted rules they qualify.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: the printed page "
    "number and the standing “Need more information or forms? Visit IRS.gov.” "
    "footer. Soft hyphens removed and justified line-break hyphens closed, "
    "while genuine compounds are kept (1040-SR, 1040-NR, 1099-K, 1099-G, "
    "third-party).",
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

print(f"wrote {OUT}: {len(blocks)} blocks, page 88, {len(review_notes)} review notes")
