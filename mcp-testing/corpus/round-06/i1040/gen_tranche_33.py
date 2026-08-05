#!/usr/bin/env python3
"""Author tranche 33 of the i1040 rebuild: printed page 93 — the end of
Schedule 1 Part I (nontaxable income) and the opening of Part II, Adjustments
to Income, lines 11 through 16.

Usage: python gen_tranche_33.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-33-pages-93-93.json")

PAGE = 93
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


def bullets(items):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# NOTE: the Coverdell/QTP bullet whose tail is printed at the top of this page
# closes the line 8z examples list, authored WHOLE at page 92 (tranche 32).
# It is not repeated. The CAUTION that follows it is authored here.

callout(
    "Caution.",
    "You may have to pay an additional tax if you received a taxable "
    "distribution from a Coverdell ESA or a QTP. See the Instructions for Form "
    "5329.",
)

heading("Nontaxable income", 5)
para(
    "Don’t report any nontaxable income on line 8z. Examples of nontaxable "
    "income include the following."
)
bullets([
    "Child support.",

    "Life insurance proceeds received because of someone’s death (with some "
    "exceptions; any taxable amounts will generally be reported to you on Form "
    "1099-R).",

    "Gifts and bequests. You may have to report information on your gifts or "
    "bequests on Form 3520, Part IV, if you received: 1. A gift or bequest from "
    "a foreign individual or foreign estate (including foreign persons related "
    "to that foreign individual or foreign estate) totaling more than $100,000; "
    "or 2. Amounts totaling more than $20,116 from a foreign corporation or "
    "foreign partnership (including foreign persons related to such foreign "
    "corporations or foreign partnerships) that you treated as gifts.",
])
para("See the Instructions for Form 3520.")

heading("Adjustments to Income", 3)

heading("Line 11. Educator Expenses", 4)
para(
    "If you were an eligible educator in 2025, you can deduct on line 11 up to "
    "$300 of qualified expenses you paid in 2025. If you and your spouse are "
    "filing jointly and both of you were eligible educators, the maximum "
    "deduction is $600. However, neither spouse can deduct more than $300 of "
    "their qualified expenses on line 11. An eligible educator is a "
    "kindergarten through grade 12 teacher, instructor, counselor, principal, "
    "or aide who worked in a school for at least 900 hours during a school year."
)
para("Qualified expenses include ordinary and necessary expenses paid:")
bullets([
    "For professional development courses you have taken related to the "
    "curriculum you teach or to the students you teach; or",
    "In connection with books, supplies, equipment (including computer "
    "equipment, software, and services), and other materials used in the "
    "classroom.",
])
para(
    "An ordinary expense is one that is common and accepted in your educational "
    "field. A necessary expense is one that is helpful and appropriate for your "
    "profession as an educator. An expense doesn’t have to be required to be "
    "considered necessary."
)
callout(
    "Tip.",
    "Qualified expenses include amounts paid or incurred in 2025 for personal "
    "protective equipment, disinfectant, and other supplies used for the "
    "prevention of the spread of coronavirus.",
)
para(
    "Qualified expenses don’t include expenses for home schooling or for "
    "nonathletic supplies for courses in health or physical education."
)
para("You must reduce your qualified expenses by the following amounts.")
bullets([
    "Excludable U.S. series EE and I savings bond interest from Form 8815.",
    "Nontaxable qualified tuition program earnings or distributions.",
    "Any nontaxable distribution of Coverdell education savings account "
    "earnings.",
    "Any reimbursements you received for these expenses that weren’t reported "
    "to you in box 1 of your Form W-2.",
])
para(
    "For more details, use "
    "[[Tax Topic 458|https://www.irs.gov/taxtopics/tc458.html]] or see Pub. 529."
)

heading(
    "Line 12. Certain Business Expenses of Reservists, Performing Artists, and "
    "Fee-Basis Government Officials",
    4,
)
para("Include the following deductions on line 12.")
bullets([
    "Certain business expenses of National Guard and reserve members who "
    "traveled more than 100 miles from home to perform services as a National "
    "Guard or reserve member.",
    "Performing-arts-related expenses as a qualified performing artist.",
    "Business expenses of fee-basis state or local government officials.",
])
para("For more details, see Form 2106.")

heading("Line 13. Health Savings Account (HSA) Deduction", 4)
para(
    "You may be able to take this deduction if contributions (other than "
    "employer contributions, rollovers, and qualified HSA funding distributions "
    "from an IRA) were made to your HSA for 2025. See Form 8889."
)

heading("Line 14. Moving Expenses", 4)
para(
    "You can deduct moving expenses if you are a member of the Armed Forces on "
    "active duty and due to a military order you move because of a permanent "
    "change of station. Use "
    "[[Tax Topic 455|https://www.irs.gov/taxtopics/tc455.html]] or see Form 3903."
)
para(
    "If you are claiming only storage fees during your absence from the United "
    "States, check the box on line 14. For more information, see the "
    "Instructions for Form 3903."
)

heading("Line 15. Deductible Part of Self-Employment Tax", 4)
para(
    "If you were self-employed and owe self-employment tax, fill in Schedule SE "
    "to figure the amount of your deduction. The deductible part of your "
    "self-employment tax is on line 13 of Schedule SE."
)

heading("Line 16. Self-Employed SEP, SIMPLE, and Qualified Plans", 4)
# Runs across the 93->94 break, past the full-page worksheet that opens page
# 94; authored whole at its starting page.
para(
    "If you were self-employed or a partner, you may be able to take this "
    "deduction. See Pub. 560 or, if you were a minister, Pub. 517."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 33 OF A MULTI-SESSION REBUILD. This plan covers printed page 93: "
    "the end of Schedule 1 Part I and the opening of Part II, Adjustments to "
    "Income, lines 11 through 16. It carries no document title by design — only "
    "tranche 1 does — so this file validates through merge-plans rather than "
    "standalone. No partial rebuild is delivered.",

    "THE COVERDELL/QTP BULLET AT THE TOP OF THIS PAGE IS NOT REPEATED. It "
    "closes the line 8z examples list, authored whole at page 92 in tranche 32. "
    "The CAUTION that follows it IS authored here, because it is a separate "
    "block rather than part of the bullet. Check this page's shortfall with "
    "mcp-testing/tools/carried_block_check.cjs against tranche 32.",

    "LINE 16 SPANS THE 93-94 BREAK PAST A FULL-PAGE WORKSHEET, and finding its "
    "ending took looking. Page 93 stops mid-word at “you may be able to take "
    "this deduc-”, and page 94 opens with the Self-Employed Health Insurance "
    "Deduction Worksheet running the full width of the page; below that, the "
    "next heading is Line 17. The continuation is not missing — it sits in a "
    "two-line fragment between the foot of the worksheet and the Line 17 "
    "heading (“tion. See Pub. 560 or, if you were a minister, Pub. 517.”). It "
    "is authored whole here. This is the second block in the rebuild to jump a "
    "full-page insert, after the lines 8a-8z caution in tranche 29.",

    "THE NESTED FORM 3520 CONDITIONS KEEP THEIR PRINTED “1.” AND “2.” MARKERS "
    "INSIDE THEIR BULLET. The plan schema takes flat lists only, and this is a "
    "list inside a list item: the gifts-and-bequests bullet is qualified by two "
    "numbered reporting thresholds. Keeping the markers verbatim inside the "
    "parent item preserves the enumeration a reader is meant to choose between, "
    "which is the treatment Chart C got in tranche 3.",

    "“Adjustments to Income” IS LEVEL 3, matching “Additional Income” on page "
    "88 — both are 16pt section banners within the schedule, and the “Line NN” "
    "headings beneath them are level 4. “Nontaxable income” stays at level 5, "
    "since it is one more run-in topic under “Lines 8a Through 8z. Other "
    "Income”, which is where Part I ends.",

    "BOTH LINK TARGETS COME FROM THE ANNOTATIONS: Tax Topic 458 resolves to "
    "irs.gov/taxtopics/tc458.html and Tax Topic 455 to tc455.html. Both are "
    "phrase links with no visible URL, so reading the text alone would have "
    "produced two dead cross-references.",

    "ICON CALLOUTS as established in tranche 3: one CAUTION and one TIP, each a "
    "paragraph opening with a strong label in sentence case, placed after the "
    "content it qualifies.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing “Need "
    "more information or forms? Visit IRS.gov.” footer. Soft hyphens removed "
    "and justified line-break hyphens closed, while genuine compounds are kept "
    "(1099-R, W-2, Fee-Basis, Performing-arts-related, fee-basis, "
    "self-employment, long-term).",
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

print(f"wrote {OUT}: {len(blocks)} blocks, page {PAGE}, "
      f"{len([b for b in blocks if b['type'] == 'heading'])} headings, "
      f"{len(review_notes)} review notes")
