#!/usr/bin/env python3
"""Author tranche 30 of the i1040 rebuild: printed page 90 — the State and
Local Income Tax Refund Worksheet for Schedule 1, line 1.

A full-page worksheet, self-contained: no links, and nothing spans either
edge. Uses the worksheet shape settled in tranches 15 and 16.

Usage: python gen_tranche_30.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-30-pages-90-90.json")

PAGE = 90
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


def callout(label, body):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": PAGE})


def worksheet(caption, lines):
    rows, cell_runs, any_runs = [], [], False
    for number, instruction in lines:
        plain, runs = rich(instruction)
        rows.append([number, plain, ""])
        cell_runs.append([None, runs, None])
        if runs:
            any_runs = True
    block = {
        "type": "table", "caption": caption,
        "columns": ["Line", "Instruction", "Amount"],
        "rows": rows, "row_headers": True, "source_page": PAGE,
    }
    if any_runs:
        block["cell_runs"] = cell_runs
    blocks.append(block)


heading("State and Local Income Tax Refund Worksheet—Schedule 1, Line 1", 5)
callout(
    "Before you begin:",
    "Be sure you have read the «Exception» in the instructions for this line to "
    "see if you can use this worksheet instead of Pub. 525 to figure if any of "
    "your refund is taxable.",
)
worksheet(
    "State and Local Income Tax Refund Worksheet for Schedule 1, line 1, lines "
    "1 through 9. The Amount column is where you write your figures; it is "
    "blank in the printed form. Each line's Yes and No branches, and the STOP "
    "conditions, are given inside the line they belong to.",
    [
        ("1.",
         "Enter the income tax refund from ‹Form(s) 1099-G› (or similar "
         "statement). But ‹don’t› enter more than the amount of your state and "
         "local income taxes shown on your 2024 Schedule A, line 5d."),

        ("2.",
         "Is the amount of state and local income taxes (or general sales "
         "taxes), real estate taxes, and personal property taxes paid in 2024 "
         "(generally, this is the amount reported on your 2024 Schedule A, line "
         "5d) more than the amount on your 2024 Schedule A, line 5e? ‹No.› "
         "Enter the amount from line 1 on line 3 and go to line 4. ‹Yes.› "
         "Subtract the amount on your 2024 Schedule A, line 5e, from the amount "
         "of state and local income taxes (or general sales taxes), real estate "
         "taxes, and personal property taxes paid in 2024 (generally, this is "
         "the amount reported on your 2024 Schedule A, line 5d)."),

        ("3.",
         "Is the amount on line 1 more than the amount on line 2? ‹No.› STOP. "
         "None of your refund is taxable. ‹Yes.› Subtract line 2 from line 1."),

        ("4.",
         "Enter your total itemized deductions from your 2024 Schedule A, line "
         "17. ‹Note.› If the filing status on your 2024 Form 1040 or 1040-SR "
         "was married filing separately and your spouse itemized deductions in "
         "2024, skip lines 5 through 7, enter the amount from line 4 on line 8, "
         "and go to line 9."),

        ("5.",
         "Enter the amount shown below for the filing status claimed on your "
         "‹2024› Form 1040 or 1040-SR. Single or married filing "
         "separately—$14,600. Married filing jointly or qualifying surviving "
         "spouse—$29,200. Head of household—$21,900."),

        ("6.",
         "Check any boxes that apply: you were born before January 2, 1960; you "
         "are blind; spouse was born before January 2, 1960; spouse is blind. "
         "No boxes checked, enter -0-. Otherwise multiply the number of boxes "
         "checked by $1,550 ($1,950 if your 2024 filing status was single or "
         "head of household). If your filing status is married filing "
         "separately, you can check the boxes for your spouse only if your "
         "spouse had no income, isn’t filing a return, and can’t be claimed as "
         "a dependent on another person’s return."),

        ("7.", "Add lines 5 and 6."),

        ("8.",
         "Is the amount on line 7 less than the amount on line 4? ‹No.› STOP. "
         "None of your refund is taxable. ‹Yes.› Subtract line 7 from line 4."),

        ("9.",
         "‹Taxable part of your refund.› Enter the ‹smaller› of line 3 or line "
         "8 here and on Schedule 1, line 1."),
    ],
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 30 OF A MULTI-SESSION REBUILD. This plan covers printed page 90, "
    "the State and Local Income Tax Refund Worksheet for Schedule 1, line 1. It "
    "carries no document title by design — only tranche 1 does — so this file "
    "validates through merge-plans rather than standalone. No partial rebuild "
    "is delivered.",

    "A SELF-CONTAINED PAGE, unusually. It carries no Link annotations, nothing "
    "spans either edge, and it interrupts rather than continues its "
    "neighbours: the lines 8a-8z caution runs from page 89 straight past this "
    "worksheet to page 91, and was authored whole at page 89 in tranche 29. "
    "Nothing from that caution belongs here.",

    "THE WORKSHEET SHAPE SETTLED IN TRANCHES 15 AND 16 IS REUSED UNCHANGED: one "
    "table, printed line numbers in the Line column, the entry column left "
    "blank because it is blank in the printed form, and each line's branches "
    "folded into the line they belong to. This is the fifth worksheet to use "
    "it without alteration.",

    "THE YES/NO BRANCHES AND THE STOP MARKERS LIVE INSIDE THEIR LINE. Lines 2, "
    "3 and 8 print a decision with indented Yes and No arms, and lines 3 and 8 "
    "put a STOP icon on the No arm. Splitting a decision across table rows "
    "would separate the question from its answers; each line therefore reads as "
    "one instruction with its branches in sequence, with the Yes and No labels "
    "marked strong as they are in print and STOP written as a word.",

    "THE CHECKBOX GRID ON LINE 6 IS LINEARISED. The source prints four "
    "checkboxes in a two-by-two grid (born before January 2 1960, blind, and "
    "the same pair for a spouse), which is a layout a reader cannot perceive "
    "from a linear reading. They are given as a single list within the line, in "
    "the printed order, so the count a filer needs to make is still available. "
    "The asterisked footnote qualifying the spouse boxes is folded into the "
    "same line rather than left dangling at the foot of the worksheet, which is "
    "where the asterisk would otherwise send a reader with nothing to return "
    "to.",

    "THE THREE FILING-STATUS AMOUNTS ON LINE 5 ARE FOLDED INTO THE LINE too. "
    "They are printed as bulleted options with em dashes before the amounts; "
    "the em dashes are the source's own and are kept.",

    "BOLD SPANS TAKEN FROM THE FACE DATA, not guessed: Form(s) 1099-G, don't, "
    "the Yes and No labels, Note., the 2024 in line 5, Taxable part of your "
    "refund. and smaller are all set in the bold face and are marked strong. "
    "Only “Exception” in the Before you begin note is italic, and it is marked "
    "emphasis — it points at the Exception paragraph authored on page 88.",

    "PAGE FURNITURE OMITTED: the printed page number. This page carries no "
    "standing footer, unlike most of the document.",
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
