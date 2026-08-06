#!/usr/bin/env python3
"""Author tranche 57 of the i1040 rebuild: printed page 117 — Schedule 3 lines
10, 11, 12, and 13a through 13z. This completes the Instructions for Schedule 3
and the whole of the schedule instructions.

Usage: python gen_tranche_57.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-57-pages-117-117.json")

PAGE = 117
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

blocks = []


def rich(text):
    """«…» emphasis, ‹…› strong, [[text|url]] link, [[«text»|url]] italic link."""
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
            if body.startswith("«") and body.endswith("»"):
                body = body[1:-1]
                runs.append({"text": body, "style": "emphasis", "href": url})
            else:
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


# Line 9's paragraph runs from page 116's last column to "...Instructions for
# Form 8962." near the top of this page's first column. It is ONE paragraph -
# column 1 carries no first-line indent anywhere - and tranche 56 authors it
# whole. It is not repeated here.

heading("Line 10. Amount Paid With Request for Extension To File", 4)
para(
    "If you got an automatic extension of time to file Form 1040, 1040-SR, or "
    "1040-NR by filing Form 4868 or by making a payment, enter the amount of "
    "the payment or any amount you paid with Form 4868. If you paid a fee when "
    "making your payment, don’t include on line 10 the fee you were charged. "
    "Also, include any amounts paid with Form 2350."
)

heading("Line 11. Excess Social Security and Tier 1 RRTA Tax Withheld", 4)
para(
    "If you, or your spouse if filing a joint return, had more than one "
    "employer for 2025 and total wages of more than $176,100, too much social "
    "security or tier 1 railroad retirement (RRTA) tax may have been withheld. "
    "You can take a credit on this line for the amount withheld in excess of "
    "$10,918.20. But if any one employer withheld more than $10,918.20, you "
    "can’t claim the excess on your return. The employer should adjust the tax "
    "for you. If the employer doesn’t adjust the overcollection, you can file "
    "a claim for refund using Form 843. Figure this amount separately for you "
    "and your spouse."
)
para(
    "You can’t claim a refund for excess tier 2 RRTA tax on Form 1040, "
    "1040-SR, or 1040-NR. Instead, use Form 843."
)

heading("Line 12. Credit for Federal Tax on Fuels", 4)
para(
    "Enter any credit for federal excise taxes paid on fuels that are "
    "ultimately used for a nontaxable purpose (for example, an off-highway "
    "business use). Attach Form 4136."
)

heading("Lines 13a Through 13z. Other Payments or Refundable Credits", 4)

heading("Line 13b", 5)
para(
    "If you are claiming a credit for repayment of amounts you included in "
    "your income in an earlier year because it appeared you had a right to the "
    "income, enter the amount on line 13b. See Pub. 525 for details about this "
    "credit."
)

heading("Line 13c", 5)
para(
    "Enter any net elective payment election amount from Form 3800, Part III, "
    "line 6, column (j)."
)

heading("Line 13d", 5)
para(
    "If you elected to pay your net 965 tax liability in installments, report "
    "the deferred amount on line 13d. Enter the amount of net 965 tax "
    "liability remaining to be paid in future years."
)

# "Line 13z" carries no display title; "Other refundable credits." is a bold
# RUN-IN in a different face, so it is the line's name and merges into the
# heading - the same call tranche 53 made for Line 13.
heading("Line 13z. Other refundable credits", 5)
para(
    "Use line 13z to report the credit under section 960(c) with respect to an "
    "excess limitation account. If an increase in the limitation under section "
    "960(c) is more than your U.S. income tax reported on Form 1116, Part III, "
    "line 20, the amount of the excess is deemed an overpayment of tax and can "
    "be claimed on line 13z as a refundable credit. See section 960(c)(5). "
    "Enter “960(c)” and the amount of the credit. See section 960(c) for more "
    "information about the circumstances under which an excess in limitation "
    "arises. Also, see the instructions for Form 1116, Part III, line 22, for "
    "your increase in limitation."
)
para(
    "Also use line 13z to report the amount of U.S. tax allocable to the U.S. "
    "Virgin Islands. Enter “Form 8689” and the amount paid."
)
para(
    "If you made the election to defer net income tax attributable to the gain "
    "on the sale or exchange of qualified farmland property, use Form 1062 to "
    "figure the amount of your applicable net tax liability. On line 13z, "
    "enter 75% of your applicable net tax liability from Form 1062, line 14. "
    "Identify as “1062NL.”"
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 57 OF A MULTI-SESSION REBUILD. This plan covers printed page 117: "
    "Schedule 3 lines 10, 11, 12, and 13a through 13z. **It completes the "
    "Instructions for Schedule 3** (pages 115-117), and with it every schedule "
    "in the document — Schedule 1 (88-100), Schedule 1-A (101-110), Schedule 2 "
    "(111-114), and Schedule 3. It carries no document title by design — only "
    "tranche 1 does — so this file validates through merge-plans rather than "
    "standalone. No partial rebuild is delivered.",

    "ONE BLOCK IS CARRIED IN AND NOT REPEATED, AND ITS EXTENT WAS CORRECTED "
    "WHILE AUTHORING THIS PAGE. Line 9's discussion is a SINGLE paragraph "
    "running from page 116's last column to “…see the Instructions for Form "
    "8962.” near the top of this page. Page 117's column 1 carries NO "
    "first-line indent anywhere, so none of the three sentence groups that "
    "look like separate paragraphs in the column-aware text actually starts "
    "one. Tranche 56's first pass ended the block at “…through the "
    "Marketplace.” and was corrected to carry the whole paragraph. **Reading "
    "the RECEIVING page's geometry is what caught it** — the sending page "
    "alone cannot show where a paragraph ends.",

    "NOTHING IS CARRIED OUT. The page ends on a completed line 13z paragraph "
    "and page 118 opens “Tax Topics”, the first of the back matter, checked "
    "rather than assumed.",

    "“Line 13z” MERGES ITS RUN-IN NAME, as Line 13 did in tranche 53. It "
    "carries no display title; “Other refundable credits.” is a bold run-in in "
    "a different face (g_d0_f4 against the g_d0_f3 of every display heading on "
    "the page), so it is the line's name rather than body text. Lines 13b, "
    "13c, and 13d have no title at all and stay bare line numbers, as lines "
    "24f-24z did in tranche 40.",

    "THERE IS NO “Line 13a” INSTRUCTION, and none was dropped. The section "
    "heading reads “Lines 13a Through 13z” and the instructions jump straight "
    "to 13b; the source simply gives 13a no text, exactly as it gives Schedule "
    "2 no instruction for lines 25 or 26 (tranche 40) and reserves line 10 of "
    "Schedule 2 and line 6e of Schedule 3 for future use.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed; the "
    "references to Forms 4868, 2350, 843, 4136, 3800, 1116, 8689, and 1062 and "
    "to Pub. 525 are all plain text. All four contractions are curly. PAGE "
    "FURNITURE OMITTED: the printed page number. Soft hyphens removed and "
    "line-break hyphens closed, while genuine compounds are kept (1040-SR, "
    "1040-NR, off-highway, nontaxable, overcollection, 960(c)(5), 1062NL).",
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
