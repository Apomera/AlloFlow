#!/usr/bin/env python3
"""Author tranche 39 of the i1040 rebuild: printed page 99 — the Student Loan
Interest Deduction Worksheet, the rest of the line 21 discussion, and Schedule
1 lines 22, 23 and 24a through 24e.

Usage: python gen_tranche_39.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-39-pages-99-99.json")

PAGE = 99
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


heading("Student Loan Interest Deduction Worksheet—Schedule 1, Line 21", 5)
callout(
    "Before you begin:",
    "If the instructions for Schedule 1, line 24z, have you enter a write-in "
    "adjustment on line 24z, figure that write-in before completing this "
    "worksheet (see the instructions for Schedule 1, line 24z). Be sure you "
    "have read the «Exception» in the instructions for this line to see if you "
    "can use this worksheet instead of Pub. 970 to figure your deduction.",
)
worksheet(
    "Student Loan Interest Deduction Worksheet for Schedule 1, line 21, lines 1 "
    "through 9. The Amount column is where you write your figures; it is blank "
    "in the printed form. The Yes and No branches on line 6 are given inside "
    "the line they belong to.",
    [
        ("1.",
         "Enter the total interest you paid in 2025 on qualified student loans "
         "(see the instructions for line 21). ‹Don’t› enter more than $2,500."),
        ("2.", "Enter the amount from Form 1040 or 1040-SR, line 9."),
        ("3.",
         "Enter the total of the amounts from Schedule 1, lines 11 through 20, "
         "and 23 and 25."),
        ("4.", "Subtract line 3 from line 2."),
        ("5.",
         "Enter the amount shown below for your filing status. Single, head of "
         "household, or qualifying surviving spouse—$85,000. Married filing "
         "jointly—$170,000."),
        ("6.",
         "Is the amount on line 4 more than the amount on line 5? ‹No.› Skip "
         "lines 6 and 7, enter -0- on line 8, and go to line 9. ‹Yes.› Subtract "
         "line 5 from line 4."),
        ("7.",
         "Divide line 6 by $15,000 ($30,000 if married filing jointly). Enter "
         "the result as a decimal (rounded to at least three places). If the "
         "result is 1.000 or more, enter 1.000."),
        ("8.", "Multiply line 1 by line 7."),
        ("9.",
         "‹Student loan interest deduction.› Subtract line 8 from line 1. Enter "
         "the result here and on Schedule 1, line 21. ‹Don’t› include this "
         "amount in figuring any other deduction on your return (such as on "
         "Schedule A, C, E, etc.)."),
    ],
)

# NOTE: items 2 and 3 of the "Qualified student loan" list are printed below
# this worksheet but belong to the list authored WHOLE at page 98 (tranche 38).
# They are NOT repeated here; this tranche resumes at the "However" paragraph.

para(
    "However, a loan isn’t a qualified student loan if (a) any of the proceeds "
    "were used for other purposes, or (b) the loan was from either a related "
    "person or a person who borrowed the proceeds under a qualified employer "
    "plan or a contract purchased under such a plan. For details, see Pub. 970."
)

heading("Qualified higher education expenses", 5)
para(
    "Qualified higher education expenses generally include tuition, fees, room "
    "and board, and related expenses such as books and supplies. The expenses "
    "must be for education in a degree, certificate, or similar program at an "
    "eligible educational institution. An eligible educational institution "
    "includes most colleges, universities, and certain vocational schools. For "
    "details, see Pub. 970."
)

heading("Line 22", 4)
para("Line 22 has been reserved for future use.")

heading("Line 23. Archer MSA Deduction", 4)
para("See Form 8853.")

heading("Lines 24a Through 24z", 4)

heading("Line 24a. Jury duty pay", 5)
para(
    "Enter your jury duty pay if you gave the pay to your employer because your "
    "employer paid your salary while you served on the jury."
)

heading("Line 24b", 5)
para(
    "Enter the deductible expenses related to income reported on line 8l from "
    "the rental of personal property you engaged in for profit but were not in "
    "the business of renting such property."
)

heading("Line 24c", 5)
para(
    "Enter the nontaxable amount of the value of Olympic and Paralympic medals "
    "and USOC prize money reported on line 8m."
)

heading("Line 24d", 5)
para(
    "Enter reforestation amortization and expenses (see the Instructions for "
    "Form 4562)."
)

heading("Line 24e", 5)
para(
    "Enter repayment of supplemental unemployment benefits under the Trade Act "
    "of 1974 (see Pub. 525)."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 39 OF A MULTI-SESSION REBUILD. This plan covers printed page 99: "
    "the Student Loan Interest Deduction Worksheet, the rest of the line 21 "
    "discussion, and Schedule 1 lines 22, 23 and 24a-24e. It carries no "
    "document title by design — only tranche 1 does — so this file validates "
    "through merge-plans rather than standalone. No partial rebuild is "
    "delivered.",

    "ITEMS 2 AND 3 OF THE QUALIFIED-STUDENT-LOAN LIST ARE NOT REPEATED. They "
    "are printed below this page's worksheet but belong to the list authored "
    "whole at page 98 in tranche 38, which spans this full-page insert. This "
    "tranche resumes at the “However, a loan isn't a qualified student loan” "
    "paragraph. Check the shortfall with carried_block_check.cjs against "
    "tranche 38.",

    "THE SINGLE-AMOUNT WORKSHEET SHAPE IS BACK. Page 97-98's worksheet needed "
    "two entry columns because it is filled in per spouse; this one takes one "
    "figure per line, so it uses the [Line, Instruction, Amount] shape settled "
    "in tranches 15 and 16 — the seventh worksheet on that shape. Choosing "
    "between the two is a per-worksheet decision, not a document-wide one.",

    "LINE 6's BRANCHES AND LINE 5's TWO FILING-STATUS AMOUNTS ARE FOLDED INTO "
    "THEIR LINES, as established in tranche 30. Line 9 also absorbs the "
    "“Don't include this amount in figuring any other deduction” sentence, "
    "which the printed form sets on a continuation line after the entry box "
    "rather than as a separate note.",

    "“Line 22 HAS BEEN RESERVED FOR FUTURE USE” IS KEPT, heading and all. It "
    "would be tempting to drop a line that does nothing, but a reader working "
    "down the schedule needs to know that 22 is absent by design rather than "
    "missing from this rebuild.",

    "LINE 24a KEEPS ITS RUN-IN TITLE, the others do not have one. The source "
    "prints “Line 24a” followed by a bold “Jury duty pay.”, so the two are "
    "merged as elsewhere; lines 24b through 24e are printed with the line "
    "number alone and no bold lead, so their headings are the bare line "
    "numbers. The difference is the source's, not an inconsistency in the "
    "authoring.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed. PAGE "
    "FURNITURE OMITTED: the printed page number and the standing footer. Soft "
    "hyphens removed and line-break hyphens closed, while genuine compounds are "
    "kept (1040-SR, write-in, non-taxable spellings as printed).",
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
