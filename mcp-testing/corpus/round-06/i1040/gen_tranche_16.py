#!/usr/bin/env python3
"""Author tranche 16 of the i1040 rebuild: printed page 48 — EIC Worksheet B
continued, Parts 5 through 7.

Small tranche by design. Page 48 completes Worksheet B, and page 49 begins the
2025 Earned Income Credit (EIC) Table — a multi-page lookup table that should
be generated MECHANICALLY with a verification pass, not hand-authored. Ending
here keeps the hand-authored work and the generated work in separate tranches
with a clean seam.

Shape: identical to tranche 15 — one worksheet table per Part, each Part a
level-5 heading, printed line numbers in the Line column, entry column blank,
STOP folded into the line it qualifies.

Usage: python gen_tranche_16.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-16-pages-48-48.json")

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


LOOKUP = (
    "Be sure you use the correct column for your filing status and the number "
    "of qualifying children you have who have valid SSNs"
)

heading("Worksheet B—2025 EIC—Line 27a—Continued", 48, 4)
para("Keep for Your Records.", 48)

heading("Part 5. All Filers Using Worksheet B", 48, 5)
worksheet(
    "EIC Worksheet B, Part 5 (All Filers Using Worksheet B): lines 6 to 9. The "
    "Amount column is where you write your figures; it is blank in the printed "
    "form.",
    [
        ("6.", "Enter your total earned income from Part 4, line 4b."),
        ("7.", "Look up the amount on line 6 above in the EIC Table to find the "
               f"credit. {LOOKUP}. Enter the credit here. STOP. If line 7 is "
               "zero, you can’t take the credit. Check the box on Form 1040 "
               "or 1040-SR, line 27c."),
        ("8.", "Enter the amount from Form 1040 or 1040-SR, line 11b."),
        ("9.", "Are the amounts on lines 8 and 6 the same? Yes. Skip line 10; "
               "enter the amount from line 7 on line 11. No. Go to line 10."),
    ],
    48,
)

heading("Part 6. Filers Who Answered “No” on Line 9", 48, 5)
worksheet(
    "EIC Worksheet B, Part 6 (Filers Who Answered “No” on Line 9): "
    "line 10. The Amount column is where you write your figures; it is blank in "
    "the printed form.",
    [
        ("10.", "If you have: no qualifying children who have valid SSNs, is "
                "the amount on line 8 less than $10,620 ($17,730 if married "
                "filing jointly)?; or 1 or more qualifying children who have "
                "valid SSNs, is the amount on line 8 less than $23,350 "
                "($30,470 if married filing jointly)? Yes. Leave line 10 blank; "
                "enter the amount from line 7 on line 11. No. Look up the "
                f"amount on line 8 in the EIC Table to find the credit. {LOOKUP}"
                ". Enter the credit here."),
    ],
    48,
)
para(
    "Look at the amounts on lines 10 and 7. Then, enter the smaller amount on "
    "line 11.",
    48,
)

heading("Part 7. Your Earned Income Credit", 48, 5)
worksheet(
    "EIC Worksheet B, Part 7 (Your Earned Income Credit): line 11. The Amount "
    "column is where you write your figures; it is blank in the printed form.",
    [
        ("11.", "This is your earned income credit. Enter this amount on "
                "Form 1040 or 1040-SR, line 27a."),
    ],
    48,
)
callout(
    "Reminder.",
    "If you have a qualifying child, complete and attach Schedule EIC.",
    48,
)
callout(
    "Caution.",
    "If your EIC for a year after 1996 was reduced or disallowed, see «Form "
    "8862, who must file», earlier, to find out if you must file Form 8862 to "
    "take the credit for 2025.",
    48,
)

review_notes = [
    "TRANCHE 16 OF A MULTI-SESSION REBUILD. This plan covers printed page 48 "
    "only — EIC Worksheet B continued, Parts 5 through 7. It carries no "
    "document title by design: only tranche 1 does, so this file validates "
    "through merge-plans rather than standalone. No partial rebuild is "
    "delivered.",
    "DELIBERATELY A ONE-PAGE TRANCHE. Page 48 completes Worksheet B, and "
    "page 49 begins the 2025 Earned Income Credit (EIC) Table — a multi-page "
    "lookup table that should be GENERATED with a verification pass rather than "
    "hand-authored, exactly as planned for the Tax Table and the Index. Ending "
    "the tranche here keeps hand-authored and generated work in separate "
    "tranches with a clean seam, so the generator for the table has an "
    "unambiguous starting page and neither kind of work has to be reviewed "
    "through the other.",
    "SHAPE IDENTICAL TO TRANCHE 15: one worksheet table per Part, each Part a "
    "level-5 heading, printed line numbers in the Line column, entry column "
    "blank, and the STOP condition folded into the line it qualifies. Parts 5-7 "
    "continue the numbering of Parts 1-4 on page 47, and because the numbers "
    "live in the Line column the sequence 1a…5, 6…11 reads continuously "
    "across both pages.",
    "THE PAGE TITLE IS REASSEMBLED. The printed banner reads “Worksheet "
    "B—2025 EIC—Line 27a—Continued”, but the page number sits inside "
    "it in the content stream, so any extraction returns it broken "
    "(“Worksheet B … 48 —2025 EIC—Line 27a—Continued”). The "
    "heading is authored as the banner reads on the page.",
    "THE LOOKUP INSTRUCTION IS REPEATED IN FULL on lines 7 and 10, as the "
    "source repeats it, so a reader filling in line 10 does not have to look "
    "back at line 7 for the caveat about which column to use.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked. Page 48 carries no "
    "link annotations.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (1040-SR, Form 8862). PAGE "
    "FURNITURE OMITTED: the printed page number, the standing “Need more "
    "information or forms?” footer, and the invisible “Fileid: … "
    "MUST be removed before printing” production lines.",
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
