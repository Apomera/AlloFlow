#!/usr/bin/env python3
"""Author tranche 44 of the i1040 rebuild: printed page 104 — the Qualified Tips
From More Than One Employer Worksheet, the SSN requirement, and the line
instructions for Schedule 1-A lines 4a through 5.

THIRD WORKSHEET SHAPE IN THIS REBUILD. Not [Line, Instruction, Amount] and not
the two-IRA form either: this one is a five-row grid the filer fills across
four labelled columns, one row per employer.

Usage: python gen_tranche_44.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-44-pages-104-104.json")

PAGE = 104
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


# NOTE: the rideshare "Example 1" whose tail is printed below this page's
# worksheet was authored whole at page 103 (tranche 43). Not repeated.

heading("Qualified Tips From More Than One Employer Worksheet", 5)
blocks.append({
    "type": "table",
    "caption": (
        "Qualified Tips From More Than One Employer Worksheet, line 1: one row "
        "per employer, A through E. All four columns are entry spaces you fill "
        "in; they are blank in the printed form. Keep this worksheet for your "
        "records. The total is taken on line 2, given just after this table."
    ),
    "columns": [
        "Row",
        "(a) Name of employer",
        "(b) Amount of qualified tips reported by this employer on Form W-2, or "
        "reported by you to this employer on Form(s) 4070",
        "(c) Qualified tips reported on Form 4137, column 1(c), for this employer",
        "(d) Enter the greater of column (b) or column (c)",
    ],
    "rows": [[letter, "", "", "", ""] for letter in "ABCDE"],
    "row_headers": True,
    "source_page": PAGE,
})
para(
    "‹Line 2.› Add lines 1A through 1E, column (d), and enter this amount on "
    "Schedule 1-A, line 4c."
)

heading("Example 2", 6)
para(
    "You are a self-employed travel guide who operates as a sole proprietor. In "
    "2025, you received cash tips from customers in connection with guided "
    "tours. These tips are voluntarily paid by customers in addition to the "
    "stated price of the tour. During 2025, you receive a Form 1099-K from the "
    "online booking platform customers use to book the guided tours. The Form "
    "1099-K shows $55,000 of total payments, of which $7,000 is customer tips. "
    "The Form 1099-K doesn’t separately identify the tips, but you keep a log "
    "of each tour that shows the date, customer, and tip amount. Because you "
    "have daily tip logs substantiating the $7,000 tip amount, you can use the "
    "$7,000 tip amount to figure your deduction for qualified tips. You enter "
    "$7,000 on Schedule 1-A, line 5."
)
callout(
    "Tip.",
    "Only amounts that appear in the aggregate on Forms 1099 can be considered "
    "qualified tips. Any “cash tips” received by the tour guide in actual cash "
    "that don’t appear on Form 1099-K cannot be included in the deduction.",
)
para(
    "If you received qualified tips in the course of more than one trade or "
    "business, see the instructions for line 5 and the «Multiple Trades or "
    "Businesses Worksheet»."
)

heading("Valid SSN for No Tax on Tips", 4)
para(
    "You and/or your spouse who received qualified tips must have a valid "
    "social security number to claim the deduction for qualified tips. A valid "
    "SSN for purposes of the deduction for qualified tips is one that is valid "
    "for employment and that is issued by the Social Security Administration "
    "(SSA) before the due date of your 2025 return (including extensions). If "
    "you were a U.S. citizen when you received your SSN, the SSN is valid for "
    "employment. If “Not Valid for Employment” is printed on your social "
    "security card and your immigration status has changed so that you are now "
    "a U.S. citizen or permanent resident, ask the SSA for a new social "
    "security card without the legend. However, if “Valid for Work Only with "
    "DHS Authorization” is printed on your social security card, your SSN is "
    "valid only as long as the DHS authorization is valid."
)

heading("Line 4a", 4)
para(
    "See «Determining the amount of qualified tips received by an employee for "
    "2025», earlier, for the amount to enter on this line. If you received "
    "qualified tips as an employee with respect to employment with more than "
    "one employer, enter -0- on line 4a and see the instructions for line 4c."
)

heading("Line 4b", 4)
para(
    "Enter the qualified tips included on Form 4137, line 1, row A, column (c). "
    "If you have multiple jobs for which you filed a Form 4137, see the "
    "instructions for line 4c and the Qualified Tips From More Than One "
    "Employer Worksheet."
)

heading("Line 4c", 4)
para(
    "If you and/or your spouse received qualified tips as employees with "
    "respect to employment with more than one employer, complete the Qualified "
    "Tips From More Than One Employer Worksheet."
)

heading("Line 5", 4)
para(
    "Include the qualified tips you and/or your spouse received in the course "
    "of a trade or business, but only to the extent the trade or business in "
    "which you received the qualified tips has net income. See «Net income "
    "limitation», later."
)
para(
    "If you and/or your spouse received qualified tips in the course of more "
    "than one trade or business, complete the Multiple Trades or Businesses "
    "Worksheet. If you and/or your spouse received more than three Forms "
    "1099-NEC, 1099-MISC, or 1099-K, then complete as many copies of the "
    "worksheet as needed and include the total for all worksheets in column (i) "
    "on the row for the business in which you received the Forms 1099."
)

heading("Net income limitation", 4)
# Runs across the 104-105 break; authored whole at its starting page.
para(
    "Qualified tips from a trade or business can’t be more than the gross "
    "income from the trade or business in which the qualified tips were "
    "received minus the total of all deductions allocable to that trade or "
    "business, including the deductible part of self-employment tax; the "
    "deduction for contributions to self-employed SEP, SIMPLE, and qualified "
    "plans; and the self-employed health insurance deduction, but not including "
    "the deduction for qualified tips. After you determine the other deductions "
    "that apply to the trade or business in which you earned qualified tips, "
    "reduce the net profit (Schedule C, line 31; the total of Schedule E, line "
    "28(g) through 28(k); or Schedule F, line 34) by the amount of these "
    "deductions. Do not reduce it below zero."
)
# Starts on page 104 and finishes below the full-page Multiple Trades or
# Businesses Worksheet at the top of page 105. Authored whole here.
para(
    "The net income limitation applies to each separate trade or business in "
    "which you received qualified tips. If you have more than one trade or "
    "business in which you received qualified tips, you should allocate the "
    "deductions in a reasonable manner."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 44 OF A MULTI-SESSION REBUILD. This plan covers printed page 104: "
    "the Qualified Tips From More Than One Employer Worksheet, the SSN "
    "requirement, and the line instructions for lines 4a through 5. It carries "
    "no document title by design — only tranche 1 does — so this file validates "
    "through merge-plans rather than standalone. No partial rebuild is "
    "delivered.",

    "THE RIDESHARE “Example 1” BELOW THIS PAGE'S WORKSHEET IS NOT REPEATED. It "
    "was authored whole at page 103 in tranche 43, which spans this full-page "
    "insert. Check the shortfall with carried_block_check.cjs against tranche "
    "43.",

    "A THIRD WORKSHEET SHAPE. The seven earlier worksheets took [Line, "
    "Instruction, Amount]; pages 97-98 took [Line, Instruction, Your IRA, "
    "Spouse's IRA]. This one is a different thing again: a five-row grid the "
    "filer completes ACROSS four labelled columns, one row per employer, so it "
    "takes [Row, (a) Name of employer, (b)…, (c)…, (d)…] with the rows "
    "labelled A through E as printed. The shape follows the worksheet, not a "
    "house style — that is now three distinct shapes across nine worksheets, "
    "each chosen by what the form actually asks a filer to do.",

    "THE TOTAL IS A PARAGRAPH, NOT A TABLE ROW. Line 2 says “Add lines 1A "
    "through 1E, column (d), and enter this amount on Schedule 1-A, line 4c” — "
    "an instruction about the table rather than another row in it, and it has "
    "no cells under columns (a) to (d). Forcing it into the grid would give it "
    "four empty entry spaces that a filer must not use.",

    "“Keep for Your Records” IS FOLDED INTO THE CAPTION rather than authored as "
    "a separate line. It is printed at the top right of the worksheet frame, is "
    "not part of any row, and is exactly the kind of thing a caption exists to "
    "carry.",

    "THE LINE INSTRUCTIONS ARE LEVEL 4, the definitions before them level 5. "
    "“Valid SSN for No Tax on Tips”, “Line 4a”, “Line 4b”, “Line 4c”, “Line 5” "
    "and “Net income limitation” are instructions for specific lines of "
    "Schedule 1-A and are siblings of “Qualified Tips” under Part II; the "
    "definitional run-ins on pages 102-103 (Cash tips, TRDA and GITCA "
    "programs, and so on) sit UNDER “Qualified Tips” at level 5. All of them "
    "are printed identically as bold run-in leads at body size, so the "
    "distinction is one of meaning rather than typography.",

    "THE PAGE'S ONE LINK ANNOTATION IS INTERNAL, not a URL: a GoTo destination "
    "(en_US_2025_publink1000168847, the same one page 101 uses) making “Net "
    "income limitation, later” clickable within the PDF. As in tranche 41 it is "
    "marked emphasis, since the plan schema's href takes a URL and inventing an "
    "anchor would be worse than leaving the reference plain.",

    "TWO BLOCKS SPAN THE 104-105 BREAK, and the second was MISSED on the first "
    "pass. The “Net income limitation” definition runs to “Do not reduce it "
    "below zero.”, and a further paragraph — “The net income limitation "
    "applies to each separate trade or business in which you received qualified "
    "tips…” — begins on this page and finishes BELOW the full-page Multiple "
    "Trades or Businesses Worksheet on page 105. Both are authored whole here. "
    "The omission was caught by the recall check, which reported seven ordinary "
    "words (applies, business, each, limitation, net, trade, which) as short; "
    "that is the signature of a dropped sentence rather than furniture. FIFTH "
    "block in the rebuild to jump a full-page insert.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing footer. "
    "Soft hyphens removed and line-break hyphens closed, while genuine "
    "compounds are kept (W-2, 1099-K, 1099-NEC, 1099-MISC, 1040-SR, "
    "self-employed, self-employment).",
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
