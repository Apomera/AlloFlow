#!/usr/bin/env python3
"""Author tranche 54 of the i1040 rebuild: printed page 114 — Schedule 2 lines
17h through 17z, the Negative Form 8978 Adjustment Worksheet, and line 19.
This completes the Instructions for Schedule 2.

Usage: python gen_tranche_54.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-54-pages-114-114.json")

PAGE = 114
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

WORKSHEET = "Negative Form 8978 Adjustment Worksheet—Schedule 2 (Line 17z)"

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


def listing(items, ordered):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# Line 17g's instruction finishes in this page's first column. It was authored
# whole at page 113 in tranche 53 and is not repeated.

heading("Line 17h", 5)
para(
    "Enter any additional tax on income you received from a nonqualified "
    "deferred compensation plan that fails to meet the requirements of section "
    "409A. This income should be shown in box 12 of Form W-2 with code Z, or "
    "in box 15 of Form 1099-MISC. The tax is 20% of the amount required to be "
    "included in income plus an interest amount determined under section "
    "409A(a)(1)(B)(ii). See section 409A(a)(1)(B) for details."
)

heading("Line 17i", 5)
para(
    "Enter any additional tax on compensation you received from a "
    "nonqualified deferred compensation plan described in section 457A if the "
    "compensation would have been includible in your income in an earlier year "
    "except that the amount wasn’t determinable until 2025. The tax is 20% of "
    "the amount required to be included in income plus an interest amount "
    "determined under section 457A(c)(2). See section 457A for details."
)

heading("Line 17j", 5)
para(
    "Enter any section 72(m)(5) excess benefits tax. See Pub. 560 for more "
    "information."
)

heading("Line 17k", 5)
para(
    "If you received an excess parachute payment (EPP), you must pay a 20% tax "
    "on it. This tax should be shown in box 12 of Form W-2 with code K. If you "
    "received a Form 1099-NEC, the tax is 20% of the EPP shown in box 3. Enter "
    "this amount on line 17k."
)

heading("Line 17l", 5)
para(
    "Enter any tax on accumulation distribution of trusts. See Form 4970 for "
    "more information."
)

heading("Line 17m", 5)
para(
    "Enter any excise tax on insider stock compensation from an expatriated "
    "corporation. See section 4985."
)

heading("Line 17n", 5)
para(
    "Enter any look-back interest under section 167(g) or 460(b). See Form "
    "8697 or 8866 for more information."
)

heading("Line 17o", 5)
para(
    "Enter any tax on non-effectively connected income for any part of the "
    "year you were a nonresident alien. See the Instructions for Form 1040-NR "
    "for more information."
)

heading("Line 17p", 5)
para(
    "Enter any interest amount from Form 8621, line 16f, relating to "
    "distributions from, and dispositions of, stock of a section 1291 fund."
)

heading("Line 17q", 5)
para("Enter any interest amount from Form 8621, line 24.")

heading("Line 17z", 5)
para(
    "Use line 17z to report any taxes not reported elsewhere on your return or "
    "other schedules. List the type and amount of tax. Other taxes to be "
    "listed include the following."
)
# The three PWA sub-items are folded into their parent bullet with their
# printed "1."-"3." markers kept verbatim, exactly as Chart C was handled in
# tranche 4: the plan schema's list items are plain strings, so a nested list
# cannot be a child, and splitting the two top-level bullets into separate
# one-item lists to make room for the numbers would read far worse.
listing([
    "The prevailing wage and apprenticeship penalties (PWA) from Form 4255 for "
    "the following: 1. Form 7210/Form 4255, line 1c, columns (o)(1), (o)(2), "
    "(p)(1), and/or (p)(2). If you entered an amount in more than one column, "
    "enter the total on line 17z. Identify as “PWA7210.” 2. Form 8933/Form "
    "4255, line 2a, columns (o)(1), (o)(2), (p)(1), and/or (p)(2). If you "
    "entered an amount in more than one column, enter the total on line 17z. "
    "Identify as “PWA8933.” 3. Any amount from Form 4255, columns (o)(1), "
    "(o)(2), (p)(1), and/or (p)(2) not reported elsewhere. If you entered an "
    "amount in more than one column, enter the total on line 17z. Identify as "
    "“NPWA.”",
    f"Form 8978 adjustment. Complete the {WORKSHEET} if you are filing Form "
    "8978 and completed the worksheet in the Schedule 3, line 6l, instructions "
    "and the amount on line 3 of that worksheet is negative.",
], ordered=False)
callout(
    "Caution.",
    "If you file Form 8621, don’t enter the amount from line 9c on line 17z. "
    "Instead, see the Instructions for Form 8621 for how to report this amount.",
)

# PLACED HERE, NOT AT THE END OF THE PAGE. The worksheet is printed full width
# BELOW all three columns, so print order would put it after line 19 and nest
# it under that heading, where a reader would never look for it. Same test as
# tranche 45: an insert is moved only when print order would file it under a
# heading it does not belong to. It belongs to line 17z, whose second bullet
# names it.
heading(WORKSHEET, 5)
blocks.append({
    "type": "table",
    "caption": (
        f"{WORKSHEET}. Complete this worksheet if you completed line 3 on the "
        "Negative Form 8978 Adjustment Worksheet in the Schedule 3, line 6l, "
        "instructions. The Amount column holds the entry spaces you fill in; "
        "they are blank in the printed form. Line 3 is a Yes/No branch with no "
        "entry space, and the instruction that follows the table completes it."
    ),
    "columns": ["Line", "Instruction", "Amount"],
    "rows": [
        [
            "1.",
            "Enter the sum of any chapter 1 taxes* (other than your negative "
            "Form 8978 adjustment) reported in Part II of Schedule 2",
            "",
        ],
        [
            "2.",
            "Enter as a positive number the negative amount from line 3 of the "
            "Negative Form 8978 Adjustment Worksheet in the Schedule 3, line "
            "6l, instructions",
            "",
        ],
        [
            "3.",
            "Is the amount on line 1 more than the amount on line 2? Yes. List "
            "the type (Form 8978 ADJ) and the amount from line 2 as a negative "
            "number (in parentheses) on line 17z. No. List the type (Form 8978 "
            "ADJ) and the amount from line 1 as a negative number (in "
            "parentheses) on line 17z.",
            "",
        ],
    ],
    "row_headers": True,
    "source_page": PAGE,
})
para(
    "Combine this amount with any other amounts reported on line 17z to "
    "complete the line 17z entry space."
)
para(
    "* Chapter 1 taxes include taxes from sections 1 through 1400Z-2 of the "
    "Code, as well as certain amounts the Code treats as chapter 1 taxes. "
    "Generally, this does not include amounts reported on Schedule 2, lines 4, "
    "7, 9, 11–13, 17k–17m, or 17z (other than chapter 1 taxes)."
)

heading("Line 19. Recapture of Net EPE From Form 4255", 4)
para(
    "Enter the recapture amount of the net EPE claimed on Form 4255, line 1d, "
    "column (l), related to the credit from Form 3468, Part IV."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 54 OF A MULTI-SESSION REBUILD. This plan covers printed page 114: "
    "Schedule 2 lines 17h through 17z, the Negative Form 8978 Adjustment "
    "Worksheet, and line 19. **It completes the Instructions for Schedule 2** "
    "(pages 111-114). It carries no document title by design — only tranche 1 "
    "does — so this file validates through merge-plans rather than standalone. "
    "No partial rebuild is delivered.",

    "ONE BLOCK IS CARRIED IN AND NOT REPEATED: line 17g's instruction, which "
    "finishes in this page's first column and was authored whole at page 113 "
    "in tranche 53. Check the shortfall with carried_block_check.cjs against "
    "tranche 53. NOTHING IS CARRIED OUT — the page ends with the worksheet "
    "footnote and page 115 opens the Instructions for Schedule 3.",

    "THE COLUMN-AWARE TEXT READ THIS PAGE CORRECTLY, unlike page 108. It "
    "reports 4 columns because the page really is three columns of prose above "
    "a FULL-WIDTH worksheet, and the splitter separated the worksheet band "
    "properly — the round-9 peel doing its job on furniture at a region EDGE. "
    "The geometry was checked before authoring anyway, because a 4-column "
    "report on a 3-column page is exactly what a detector wobble looks like.",

    "THE WORKSHEET IS MOVED AHEAD OF LINE 19, the one departure from print "
    "order on this page. It is printed full width BELOW all three columns, so "
    "print order would place it after line 19 and nest it under that heading, "
    "where nobody would look for it. Same test as tranche 45: an insert is "
    "moved only when print order would file it under a heading it does not "
    "belong to. It belongs to line 17z, whose second bullet names it, and it "
    "sits directly after that bullet's CAUTION.",

    "THE THREE PWA SUB-ITEMS ARE FOLDED INTO THEIR PARENT BULLET with their "
    "printed “1.”–“3.” markers kept verbatim, exactly as Chart C was handled "
    "in tranche 4. The plan schema's list items are plain strings, so a nested "
    "list cannot be a child; and the alternative — splitting the two "
    "top-level bullets into separate one-item lists so the numbers could sit "
    "between them — would announce “list of 1 item” twice and read far worse. "
    "NEITHER BULLET HAS A BOLD LEAD: “The prevailing wage…” and “Form 8978 "
    "adjustment.” are both body face, checked rather than assumed, so neither "
    "is marked strong.",

    "WORKSHEET LINE 3 IS A YES/NO BRANCH WITH NO ENTRY SPACE, and its branches "
    "are folded into its Instruction cell — the same handling EIC Worksheet A "
    "line 5 got in tranche 17. The closing “Combine this amount…” sentence and "
    "the chapter 1 taxes footnote are PARAGRAPHS after the table, not rows: "
    "both are printed full width across the worksheet frame and belong to no "
    "row, as line 2 did in tranches 44, 45, and 48.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed. Both "
    "contractions are curly. The em dash in the worksheet title and the en "
    "dashes in the footnote's line ranges (11–13, 17k–17m) are the source's "
    "own. PAGE FURNITURE OMITTED: the printed page number. Soft hyphens "
    "removed and line-break hyphens closed (“nonquali-fied” → “nonqualified”, "
    "“non-qualified” → “nonqualified”, “accumula-tion” → “accumulation”), "
    "while genuine compounds are kept (W-2, 1099-MISC, 1099-NEC, 1040-NR, "
    "look-back, non-effectively, 1400Z-2, 409A(a)(1)(B)(ii)).",
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
