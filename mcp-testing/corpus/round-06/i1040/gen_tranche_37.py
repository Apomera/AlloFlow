#!/usr/bin/env python3
"""Author tranche 37 of the i1040 rebuild: printed page 97 — the IRA Deduction
Worksheet for Schedule 1 line 20, part 1 (lines 1a through 6).

FIRST WORKSHEET WITH TWO ENTRY COLUMNS. The six worksheets before it used
[Line, Instruction, Amount]; this one is filled in separately for your IRA and
your spouse's, so it needs [Line, Instruction, Your IRA, Spouse's IRA]. The
worksheet continues on page 98 as "IRA Deduction Worksheet—Continued".

Usage: python gen_tranche_37.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-37-pages-97-97.json")

PAGE = 97
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


def worksheet(caption, columns, lines):
    """lines: (number, instruction, your_ira, spouse_ira)."""
    rows, cell_runs, any_runs = [], [], False
    for number, instruction, mine, theirs in lines:
        plain, runs = rich(instruction)
        rows.append([number, plain, mine, theirs])
        cell_runs.append([None, runs, None, None])
        if runs:
            any_runs = True
    block = {
        "type": "table", "caption": caption, "columns": columns,
        "rows": rows, "row_headers": True, "source_page": PAGE,
    }
    if any_runs:
        block["cell_runs"] = cell_runs
    blocks.append(block)


AGE_OPTIONS = ("$7,000 if under age 50 at the end of 2025; $8,000 if age 50 or "
               "older at the end of 2025")

heading("IRA Deduction Worksheet—Schedule 1, Line 20", 5)
callout(
    "Before you begin:",
    "Be sure you have read the instructions for this line. You may not be able "
    "to use this worksheet. If the instructions for Schedule 1, line 24z, have "
    "you enter a write-in adjustment on line 24z, figure that write-in before "
    "completing this worksheet (see the instructions for Schedule 1, line 24z). "
    "If you are married filing separately and you lived apart from your spouse "
    "for all of 2025, check the box on line 20.",
)
worksheet(
    "IRA Deduction Worksheet for Schedule 1, line 20, part 1 of 2: lines 1a "
    "through 6. The worksheet is filled in separately for your own IRA and your "
    "spouse's, so the last two columns are the entry spaces for each; they are "
    "blank in the printed form. Lines 3 and 4 take a single figure covering "
    "both, and the printed form gives them one entry box across the two "
    "columns. Lines 1a and 1b are answered by checking Yes or No rather than by "
    "entering an amount. Part 2, lines 7 through 12, is on the next page.",
    ["Line", "Instruction", "Your IRA", "Spouse’s IRA"],
    [
        ("1a.",
         "Were you covered by a retirement plan (see «Were You Covered by a "
         "Retirement Plan?»)?",
         "Yes or No", ""),

        ("1b.",
         "If married filing jointly, was your spouse covered by a retirement "
         "plan? ‹Next.› If you checked “No” on line 1a (and “No” on line 1b if "
         "married filing jointly), skip lines 2 through 6, enter the applicable "
         f"amount below on line 7a (and line 7b, if applicable), and go to line "
         f"8: {AGE_OPTIONS}. Otherwise, go to line 2.",
         "", "Yes or No"),

        ("2.",
         "Enter the amount shown below that applies to you. Single, head of "
         "household, or married filing separately and you «lived apart» from "
         "your spouse for all of 2025, enter $89,000. Qualifying surviving "
         "spouse, enter $146,000. Married filing jointly, enter $146,000 in "
         "both columns; but if you checked “No” on either line 1a or 1b, enter "
         "$246,000 for the person who wasn’t covered by a plan. Married filing "
         "separately and you lived with your spouse at any time in 2025, enter "
         "$10,000.",
         "", ""),

        ("3.", "Enter the amount from Form 1040 or 1040-SR, line 9.", "", ""),

        ("4.",
         "Enter the total of the amounts from Schedule 1, lines 11 through 19a, "
         "plus 23 and 25.",
         "", ""),

        ("5.",
         "Subtract line 4 from line 3. If married filing jointly, enter the "
         "result in both columns.",
         "", ""),

        ("6.",
         "Is the amount on line 5 less than the amount on line 2? ‹No.› STOP. "
         "None of your IRA contributions are deductible. For details on "
         "nondeductible IRA contributions, see Form 8606. ‹Yes.› Subtract line "
         "5 from line 2 in each column. Follow the instructions below that "
         "apply to you. If single, head of household, or married filing "
         "separately, and the result is $10,000 or more, enter the applicable "
         f"amount below on line 7 for that column and go to line 8: "
         f"{AGE_OPTIONS}; if the result is less than $10,000, go to line 7. If "
         "married filing jointly or qualifying surviving spouse, and the result "
         "is $20,000 or more ($10,000 or more in the column for the IRA of a "
         "person who wasn’t covered by a retirement plan), enter the applicable "
         f"amount below on line 7 for that column and go to line 8: "
         f"{AGE_OPTIONS}; otherwise, go to line 7.",
         "", ""),
    ],
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 37 OF A MULTI-SESSION REBUILD. This plan covers printed page 97, "
    "the IRA Deduction Worksheet for Schedule 1 line 20, lines 1a through 6. It "
    "carries no document title by design — only tranche 1 does — so this file "
    "validates through merge-plans rather than standalone. No partial rebuild "
    "is delivered.",

    "THE FIRST WORKSHEET IN THIS REBUILD WITH TWO ENTRY COLUMNS. The six before "
    "it used [Line, Instruction, Amount]; this one is filled in separately for "
    "your own IRA and your spouse's, so it takes [Line, Instruction, Your IRA, "
    "Spouse's IRA]. The shape is otherwise unchanged: printed line numbers in "
    "the Line column, entry columns blank because they are blank in print, and "
    "branches folded into the line they belong to.",

    "THE COLUMNS ARE NOT UNIFORM, AND THE CAPTION SAYS SO. Lines 3 and 4 take a "
    "single figure covering both IRAs and the printed form gives them one entry "
    "box spanning the two columns; lines 2, 5 and 6 take a figure in each. "
    "Lines 1a and 1b are answered by checking Yes or No rather than by entering "
    "an amount, and each has its box under one column only — 1a asks about you, "
    "1b about your spouse. Those two cells therefore read “Yes or No” in the "
    "column they belong to, which is what the printed checkboxes offer.",

    "THE SECOND ROW IS LABELLED “1b.”, NOT “b.” AS PRINTED. The form sets the "
    "pair as “1a.” and then simply “b.”, the 1 inherited from the row above — a "
    "convention that works when both rows are visible at once and fails when a "
    "screen reader announces one row on its own. The Line column carries “1b.” "
    "so the row identifies itself. The per-column entry labels the form prints "
    "beside each box (2a/2b, 5a/5b, 6a/6b) are dropped for the same reason in "
    "reverse: with the columns headed Your IRA and Spouse's IRA and the line "
    "number in its own cell, repeating the a/b suffix inside every entry cell "
    "adds nothing. Both choices show up in a token-recall check as small "
    "shortfalls and neither is a loss.",

    "THE “Next.” BRANCH IS FOLDED INTO LINE 1b. It is printed as an unnumbered "
    "instruction between lines 1b and 2, and it applies to the answers given on "
    "BOTH 1a and 1b, so it sits at the end of 1b — the last line it depends on. "
    "Giving it a row of its own would put a table row with no line number in "
    "the middle of a numbered sequence.",

    "THE $7,000/$8,000 AGE OPTIONS APPEAR THREE TIMES and are built from one "
    "shared string in the generator, so the wording cannot drift between them. "
    "The source prints them as a nested i./ii. pair inside each branch arm; "
    "they are given inline as a semicolon-separated pair, because a "
    "two-item list nested two levels deep inside a table cell is not something "
    "a linear reading can convey, and the choice between them is a single "
    "either/or.",

    "THE THREE “Before you begin” SENTENCES ARE ONE CALLOUT. The printed form "
    "sets them as three separate lines under one bold label; they are joined "
    "into a single paragraph opening with a strong “Before you begin:”, the "
    "shape used for this worksheet header since tranche 30.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed. Its two "
    "cross-references — Were You Covered by a Retirement Plan?, lived apart — "
    "are italic in the source and marked emphasis only. The first points at the "
    "run-in heading authored on page 95.",

    "PAGE FURNITURE OMITTED: the printed page number. Soft hyphens removed and "
    "line-break hyphens closed, while genuine compounds are kept (1040-SR, "
    "write-in, nondeductible).",
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
