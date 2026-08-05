#!/usr/bin/env python3
"""Author tranche 48 of the i1040 rebuild: printed page 108 — the two Qualified
Overtime Compensation From More Than One Employer/Payor worksheets, Example 5,
the SSN requirement, and Schedule 1-A lines 14a, 14b, and 18.

Usage: python gen_tranche_48.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-48-pages-108-108.json")

PAGE = 108
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

DETERMINING = "Determining the amount of qualified overtime compensation for 2025"

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


def worksheet(title, col_a, col_b, caption, line2):
    heading(title, 5)
    blocks.append({
        "type": "table",
        "caption": caption,
        "columns": ["Row", col_a, col_b],
        "rows": [[letter, "", ""] for letter in "ABCDE"],
        "row_headers": True,
        "source_page": PAGE,
    })
    para(line2)


# Example 4's tail occupies the first six lines of column 1, below BOTH
# worksheets. It was authored whole at page 107 in tranche 47 and is not
# repeated here.

worksheet(
    "Qualified Overtime Compensation From More Than One Employer Worksheet",
    "(a) Name of employer",
    "(b) Qualified overtime reported on Form W-2, box 1",
    "Qualified Overtime Compensation From More Than One Employer Worksheet, "
    "line 1: one row per employer, A through E. Both columns are entry spaces "
    "you fill in; they are blank in the printed form. Keep this worksheet for "
    "your records. The total is taken on line 2, given just after this table.",
    "‹Line 2.› Add the amounts from lines 1A through 1E, column (b), and enter "
    "this amount on Schedule 1-A, line 14a",
)

worksheet(
    "Qualified Overtime Compensation From More Than One Payor Worksheet",
    "(a) Payor’s name",
    "(b) Qualified overtime reported on Form 1099-NEC, box 1, or Form "
    "1099-MISC, box 3",
    "Qualified Overtime Compensation From More Than One Payor Worksheet, line "
    "1: one row per payor, A through E. Both columns are entry spaces you fill "
    "in; they are blank in the printed form. Keep this worksheet for your "
    "records. The total is taken on line 2, given just after this table.",
    # The source omits the comma after "column (b)" here that the employer
    # worksheet above carries, and ends neither line 2 with a period. Both are
    # reproduced as printed.
    "‹Line 2.› Add the amounts from lines 1A through 1E, column (b) and enter "
    "this amount on Schedule 1-A, line 14b",
)

heading("Example 5", 5)
para(
    "You work for a state government agency that is covered by a special "
    "overtime rule in section 7 of the FLSA. Your state agency pays "
    "compensatory time at a rate of one and one-half hours for each overtime "
    "hour worked. In 2025, you were paid wages of $4,500 for the compensatory "
    "time you took off during the year. You can include $1,500 when figuring "
    "your deduction for qualified overtime compensation ($4,500 divided by 3)."
)

heading("Valid SSN", 4)
para(
    "You and/or your spouse who received qualified overtime compensation must "
    "have a valid SSN to take this deduction. A valid SSN for purposes of the "
    "deduction for qualified overtime compensation is one that is valid for "
    "employment and that is issued by the SSA before the due date of your 2025 "
    "return (including extensions). For more information, see «Valid SSN for "
    "No Tax on Tips», earlier."
)

heading("Line 14a", 4)
# Runs from the foot of column 1 into column 2.
para(
    "In most cases, the amount on Form W-2, box 1, includes all of your wages "
    "and compensation, including your regular wages plus any qualified "
    "overtime compensation. Enter on line 14a only the qualified overtime "
    "compensation amount that is included on Form W-2. Some employers may "
    "choose to provide the amount of qualified overtime compensation to "
    f"employees using box 14 of Form W-2. See «{DETERMINING}», earlier, to "
    "figure the amount to enter on Schedule 1-A, line 14a. Keep a copy of any "
    "document you relied on to support your calculation of qualified overtime "
    "compensation."
)
para(
    "If you and/or your spouse received qualified overtime compensation from "
    "more than one employer in 2025, complete the Qualified Overtime "
    "Compensation From More Than One Employer Worksheet. If you received "
    "qualified overtime compensation that is not included in box 1 of Form W-2 "
    "(for example, overtime amounts that are deferred under a qualified "
    "retirement plan), enter that amount here. Keep a copy of any document you "
    "relied on to support your calculation of qualified overtime compensation."
)

heading("Line 14b", 4)
# Runs from the foot of column 2 into column 3.
para(
    "The amount on Form 1099-NEC, box 1, or Form 1099-MISC, box 3, is your "
    "nonemployee compensation or other income, including your compensation and "
    "other income plus any qualified overtime compensation. Enter on Line 14b "
    "only the qualified overtime compensation amount that is included in Form "
    "1099-NEC, box 1, or Form 1099-MISC, box 3. Do not enter the total amount "
    "from Form 1099-NEC, box 1, or Form 1099-MISC, box 3. See "
    f"«{DETERMINING}», earlier, to figure the amount to enter on Schedule 1-A, "
    "line 14b. Keep a copy of any document you relied on to support your "
    "calculation of qualified overtime compensation."
)
para(
    "If you and/or your spouse received qualified overtime compensation from "
    "more than one payor in 2025, complete the Qualified Overtime Compensation "
    "From More Than One Payor Worksheet."
)

heading("Line 18", 4)
para(
    "If the amount on line 18 is zero or less, your deduction for your "
    "qualified overtime compensation is not reduced. Skip lines 19 and 20 and "
    "enter the amount from Schedule 1-A, line 15, on Schedule 1-A, line 21."
)
callout(
    "Tip.",
    "For more information on the qualified overtime deduction, see Notice "
    "2025-69.",
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 48 OF A MULTI-SESSION REBUILD. This plan covers printed page 108: "
    "the two Qualified Overtime Compensation From More Than One "
    "Employer/Payor worksheets, Example 5, the SSN requirement, and Schedule "
    "1-A lines 14a, 14b, and 18. It carries no document title by design — only "
    "tranche 1 does — so this file validates through merge-plans rather than "
    "standalone. No partial rebuild is delivered.",

    "EXAMPLE 4's TAIL IS NOT REPEATED. It occupies the first six lines of "
    "column 1, below BOTH worksheets, and was authored whole at page 107 in "
    "tranche 47. Check the shortfall with carried_block_check.cjs against "
    "tranche 47.",

    "THE READING ORDER WAS REBUILT FROM GEOMETRY, NOT TAKEN FROM THE "
    "COLUMN-AWARE TEXT. This page carries a full-page worksheet at the top AND "
    "a second one across the MIDDLE, and the column detector interleaves the "
    "Line 14a and Line 14b paragraphs, which sit in adjacent columns: "
    "“…including your regular wages plus any qualified over- 108 Qualified "
    "Overtime Compensation From More Than One Payor Worksheet… time "
    "compensation. Enter on line 14a qualified overtime compensation. Enter "
    "only the qualified overtime compensa- on Line 14b only the qualified "
    "overtime…”. A crosser stranded in the MIDDLE of a region is the case the "
    "round-9 peel deliberately does not handle, so each column was banded and "
    "read top to bottom instead. LINE 14a RUNS FROM COLUMN 1 INTO COLUMN 2 AND "
    "LINE 14b FROM COLUMN 2 INTO COLUMN 3; both are authored whole.",

    "BOTH WORKSHEETS KEEP THEIR PRINTED POSITION at the head of the tranche, "
    "unlike tranche 45 where a paragraph was moved ahead of an insert. The "
    "test there was whether the insert split an argument; these two do not — "
    "Example 4, the only block they interrupt, is already complete in tranche "
    "47 — so print order stands and no departure needs justifying. The cost is "
    "that both worksheet headings sit at level 5 under “Determining the amount "
    "of qualified overtime compensation for 2025” rather than under the line "
    "instructions that reference them by name; moving two full-page tables to "
    "fix that is a larger intervention than the imprecision is worth.",

    "THE TWO “Line 2.” INSTRUCTIONS ARE REPRODUCED WITH THE SOURCE'S OWN "
    "INCONSISTENCY. The employer worksheet reads “…column (b), and enter…” and "
    "the payor worksheet “…column (b) and enter…” — one comma, one not — and "
    "NEITHER ends with a period. Checked in the item dump. Harmonising them "
    "would be editing tax instructions, the same call made for line 24z in "
    "tranche 40.",

    "EVERY CELL IN BOTH GRIDS IS BLANK BY DESIGN — 5 rows x 2 entry columns "
    "each. Line 2 is a PARAGRAPH in both, not a table row, as in tranches 44 "
    "and 45: it is an instruction about the table with no cells under (a) and "
    "(b). “Keep for Your Records” is folded into each caption.",

    "HEADING LEVELS: the two worksheets and Example 5 are level 5, siblings of "
    "tranche 47's Examples under “Determining the amount…” (level 4). “Valid "
    "SSN”, “Line 14a”, “Line 14b”, and “Line 18” are level 4, matching every "
    "other line instruction in this schedule. “Valid SSN” is printed exactly "
    "so and is NOT renamed to distinguish it from Part II's “Valid SSN for No "
    "Tax on Tips” — the cross-reference in its own text points at that other "
    "heading by its full name, so the two are already distinguishable.",

    "PAGE FURNITURE OMITTED: the printed page number, which the failing "
    "column detector had dropped into the middle of the Line 14a paragraph. "
    "Soft hyphens removed and line-break hyphens closed, while genuine "
    "compounds are kept (W-2, 1099-NEC, 1099-MISC, 1-A, one-half, "
    "nonemployee).",
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
