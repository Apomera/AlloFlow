#!/usr/bin/env python3
"""Author tranche 15 of the i1040 rebuild: printed pages 46-47 — EIC
Worksheet A and Worksheet B.

These are the most form-like pages so far: each worksheet is divided into
numbered PARTS, and Worksheet B's Parts 1 and 2 are arithmetic blocks with
sub-lines (1a-1e, 2a-2c) and printed + and = signs down the entry column.

Shape: each Part is a level-5 heading and its lines are a worksheet table in
the tranche-8 shape. Splitting per Part rather than emitting one long table
keeps each Part's title attached to the lines it governs — the titles are
load-bearing here ("Filers Who Answered 'No' on Line 4" tells you whether to
fill the Part in at all).

Boundary: page 45 ended on a complete definition and page 48 begins the EIC
tables, so nothing spans either edge.

Usage: python gen_tranche_15.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-15-pages-46-47.json")

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


def heading(text, page, level):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body, page):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": page})


def worksheet(caption, lines, page):
    blocks.append({
        "type": "table",
        "caption": caption,
        "columns": ["Line", "Instruction", "Amount"],
        "rows": [[n, text, ""] for n, text in lines],
        "row_headers": True,
        "source_page": page,
    })


EIC_TABLE_LOOKUP = (
    "Be sure you use the correct column for your filing status and the number "
    "of qualifying children you have who have valid SSNs"
)

# ── page 46: Worksheet A ─────────────────────────────────────────────────────
heading("Worksheet A—2025 EIC—Line 27a", 46, 4)
para("Keep for Your Records.", 46)
callout(
    "Before you begin.",
    "Be sure you are using the correct worksheet. Use this worksheet only if "
    "you answered “No” to Step 5, question 2. Otherwise, use "
    "«Worksheet B».",
    46,
)
heading("Part 1. All Filers Using Worksheet A", 46, 5)
worksheet(
    "EIC Worksheet A, Part 1 (All Filers Using Worksheet A): lines 1 to 4. The "
    "Amount column is where you write your figures; it is blank in the printed "
    "form.",
    [
        ("1.", "Enter your earned income from Step 5."),
        ("2.", "Look up the amount on line 1 above in the EIC Table (right "
               f"after Worksheet B) to find the credit. {EIC_TABLE_LOOKUP} as "
               "defined earlier. Enter the credit here. STOP. If line 2 is "
               "zero, you can’t take the credit. Check the box on Form 1040 "
               "or 1040-SR, line 27c."),
        ("3.", "Enter the amount from Form 1040 or 1040-SR, line 11b."),
        ("4.", "Are the amounts on lines 3 and 1 the same? Yes. Skip line 5; "
               "enter the amount from line 2 on line 6. No. Go to line 5."),
    ],
    46,
)
heading("Part 2. Filers Who Answered “No” on Line 4", 46, 5)
worksheet(
    "EIC Worksheet A, Part 2 (Filers Who Answered “No” on Line 4): "
    "line 5. The Amount column is where you write your figures; it is blank in "
    "the printed form.",
    [
        ("5.", "If you have: no qualifying children who have valid SSNs, is the "
               "amount on line 3 less than $10,620 ($17,730 if married filing "
               "jointly)?; or 1 or more qualifying children who have valid "
               "SSNs, is the amount on line 3 less than $23,350 ($30,470 if "
               "married filing jointly)? Yes. Leave line 5 blank; enter the "
               "amount from line 2 on line 6. No. Look up the amount on line 3 "
               f"in the EIC Table to find the credit. {EIC_TABLE_LOOKUP}. Enter "
               "the credit here."),
    ],
    46,
)
para(
    "Look at the amounts on lines 5 and 2. Then, enter the smaller amount on "
    "line 6.",
    46,
)
heading("Part 3. Your Earned Income Credit", 46, 5)
worksheet(
    "EIC Worksheet A, Part 3 (Your Earned Income Credit): line 6. The Amount "
    "column is where you write your figures; it is blank in the printed form.",
    [
        ("6.", "This is your earned income credit. Enter this amount on "
               "Form 1040 or 1040-SR, line 27a."),
    ],
    46,
)
callout(
    "Reminder.",
    "If you have a qualifying child, complete and attach Schedule EIC.",
    46,
)
callout(
    "Caution.",
    "If your EIC for a year after 1996 was reduced or disallowed, see «Form "
    "8862, who must file», earlier, to find out if you must file Form 8862 to "
    "take the credit for 2025.",
    46,
)

# ── page 47: Worksheet B ─────────────────────────────────────────────────────
heading("Worksheet B—2025 EIC—Line 27a", 47, 4)
para("Keep for Your Records.", 47)
callout(
    "Before you begin.",
    "Use this worksheet if you answered “Yes” to Step 5, question 2. "
    "Complete the parts below (Parts 1 through 3) that apply to you. Then, "
    "continue to Part 4. If you are married filing a joint return, include your "
    "spouse’s amounts, if any, with yours to figure the amounts to enter in "
    "Parts 1 through 3.",
    47,
)
heading(
    "Part 1. Self-Employed, Members of the Clergy, and People With Church "
    "Employee Income Filing Schedule SE",
    47,
    5,
)
worksheet(
    "EIC Worksheet B, Part 1 (Self-Employed, Members of the Clergy, and People "
    "With Church Employee Income Filing Schedule SE): lines 1a to 1e. The "
    "printed form stacks these with plus, minus and equals signs down the entry "
    "column; each line’s own instruction says which operation to perform. The "
    "Amount column is blank in the printed form.",
    [
        ("1a.", "Enter the amount from Schedule SE, Part I, line 3."),
        ("1b.", "Enter any amount from Schedule SE, Part I, line 4b and "
                "line 5a."),
        ("1c.", "Combine lines 1a and 1b."),
        ("1d.", "Enter the amount from Schedule SE, Part I, line 13."),
        ("1e.", "Subtract line 1d from line 1c."),
    ],
    47,
)
heading("Part 2. Self-Employed NOT Required To File Schedule SE", 47, 5)
para(
    "For example, your net earnings from self-employment were less than $400.",
    47,
)
para(
    "2. Don’t include on these lines any statutory employee income, any net "
    "profit from services performed as a notary public, any amount exempt from "
    "self-employment tax as the result of the filing and approval of Form 4029 "
    "or Form 4361, or any other amounts exempt from self-employment tax.",
    47,
)
worksheet(
    "EIC Worksheet B, Part 2 (Self-Employed NOT Required To File "
    "Schedule SE): lines 2a to 2c. The Amount column is blank in the printed "
    "form.",
    [
        ("2a.", "Enter any net farm profit or (loss) from Schedule F, line 34; "
                "and from farm partnerships, Schedule K-1 (Form 1065), box 14, "
                "code A*."),
        ("2b.", "Enter any net profit or (loss) from Schedule C, line 31; and "
                "Schedule K-1 (Form 1065), box 14, code A (other than "
                "farming)*."),
        ("2c.", "Combine lines 2a and 2b."),
    ],
    47,
)
para(
    "* If you have any Schedule K-1 amounts, complete the appropriate line(s) "
    "of Schedule SE, Part I. Reduce the Schedule K-1 amounts as described in "
    "the Partner’s Instructions for Schedule K-1. Enter your name and social "
    "security number on Schedule SE and attach it to your return.",
    47,
)
heading("Part 3. Statutory Employees Filing Schedule C", 47, 5)
worksheet(
    "EIC Worksheet B, Part 3 (Statutory Employees Filing Schedule C): line 3. "
    "The Amount column is blank in the printed form.",
    [
        ("3.", "Enter the amount from Schedule C, line 1, that you are filing "
               "as a statutory employee."),
    ],
    47,
)
heading("Part 4. All Filers Using Worksheet B", 47, 5)
callout(
    "Note.",
    "If line 4b includes income on which you should have paid self-employment "
    "tax but didn’t, we may reduce your credit by the amount of "
    "self-employment tax not paid.",
    47,
)
worksheet(
    "EIC Worksheet B, Part 4 (All Filers Using Worksheet B): lines 4a to 5. "
    "The Amount column is blank in the printed form.",
    [
        ("4a.", "Enter your earned income from Step 5."),
        ("4b.", "Combine lines 1e, 2c, 3, and 4a. This is your total earned "
                "income. STOP. If line 4b is zero or less, you can’t take "
                "the credit. Check the box on Form 1040 or 1040-SR, line 27c."),
        ("5.", "If you have: 3 or more qualifying children who have valid SSNs, "
               "is line 4b less than $61,555 ($68,675 if married filing "
               "jointly)?; 2 qualifying children who have valid SSNs, is "
               "line 4b less than $57,310 ($64,430 if married filing "
               "jointly)?; 1 qualifying child who has a valid SSN, is line 4b "
               "less than $50,434 ($57,554 if married filing jointly)?; no "
               "qualifying children who have valid SSNs, is line 4b less than "
               "$19,104 ($26,214 if married filing jointly)? Yes. If you want "
               "the IRS to figure your credit, see Credit figured by the IRS, "
               "earlier. If you want to figure the credit yourself, enter the "
               "amount from line 4b on line 6 of this worksheet. No. STOP. You "
               "can’t take the credit. Check the box on Form 1040 or 1040-SR, "
               "line 27c."),
    ],
    47,
)

review_notes = [
    "TRANCHE 15 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "46-47 — EIC Worksheet A and Worksheet B. It carries no document title by "
    "design: only tranche 1 does, so this file validates through merge-plans "
    "rather than standalone. No partial rebuild is delivered.",
    "ONE TABLE PER PART, not one table per worksheet. Each worksheet is divided "
    "into numbered Parts whose titles are load-bearing — “Filers Who "
    "Answered “No” on Line 4” tells a reader whether to fill that Part "
    "in at all, and “Self-Employed NOT Required To File Schedule SE” is a "
    "precondition, not a label. Each Part is a level-5 heading followed by a "
    "worksheet table of its own lines, so the title stays attached to the lines "
    "it governs. Line numbering is unaffected: the printed numbers are carried "
    "in the Line column, so 1a-1e, 2a-2c, 3 and 4a-5 read continuously across "
    "the four tables of Worksheet B.",
    "THE ARITHMETIC COLUMN IS NOT REPRODUCED. Worksheet B’s Parts 1 and 2 "
    "print +, − and = signs down the entry column to show how the sub-lines "
    "combine. Those symbols are a visual aid beside the boxes; each line’s "
    "own instruction already states the operation (“Combine lines 1a and "
    "1b”, “Subtract line 1d from line 1c”), so the symbols are dropped "
    "and nothing is lost. This is disclosed in the table captions.",
    "STOP FOLDS INTO ITS LINE, as in earlier worksheets. Worksheet A line 2 and "
    "Worksheet B line 4b each carry a STOP condition printed beside the entry "
    "box; both fold into their line’s instruction cell with STOP kept as "
    "text, since it is the whole meaning of that outcome.",
    "THE LOOKUP INSTRUCTION IS REPEATED, NOT CROSS-REFERENCED. Worksheet A "
    "lines 2 and 5 both tell the reader to use the correct EIC Table column for "
    "filing status and number of qualifying children. The source repeats it in "
    "full on both lines and so does this plan: a reader filling in line 5 "
    "should not have to look back at line 2 for the caveat.",
    "PART 2’S PREAMBLE IS KEPT AS PROSE. The sentence numbered “2.” in "
    "Worksheet B Part 2 (“Don’t include on these lines any statutory "
    "employee income…”) governs lines 2a-2c rather than being an entry "
    "line — it has no entry box. It is authored as a paragraph before the "
    "table, keeping its printed “2.”, rather than as a row that would "
    "imply an amount to enter.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked. Pages 46 and 47 "
    "carry no link annotations.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (self-employment, "
    "self-employed, 1040-SR, Schedule K-1, Form 1065). PAGE FURNITURE OMITTED: "
    "printed page numbers, the standing “Need more information or "
    "forms?” footer, and the invisible “Fileid: … MUST be removed "
    "before printing” production lines.",
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

pages = sorted({block["source_page"] for block in blocks})
print(f"wrote {OUT}: {len(blocks)} blocks, pages {pages}, {len(review_notes)} review notes")
