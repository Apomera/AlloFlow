#!/usr/bin/env python3
"""Author tranche 12 of the i1040 rebuild: printed pages 40-41 — the start of
the Earned Income Credit (lines 27a, 27b, 27c): what the EIC is, and Steps 1
through 4 of its eligibility flowchart.

The EIC flowchart reuses the shape settled in tranche 5 for the
qualifying-dependent chart: each Step is a heading carrying its printed badge,
each numbered question is a paragraph keeping its number, and the Yes/No
branches are a two-item list with strong labels. No new shape was needed.

Boundary out: Step 4's question 2 begins on page 41 and its answers print at
the top of page 42. It is authored whole here at page 41, so tranche 13 must
start at Step 4 question 3 ("Was your main home…") and NOT re-author it.

Note on the column detector: pages 40, 46 and 47 report 5-6 "columns". That is
the round-8 band cut counting REGIONS, not a fault — the reading order on
these pages was checked against the render and is correct.

Usage: python gen_tranche_12.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-12-pages-40-41.json")

EITC = "https://www.irs.gov/eitc"

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


def bullets(items, page, ordered=False):
    plains, all_runs, any_runs = [], [], False
    for item in items:
        plain, runs = rich(item)
        plains.append(plain)
        if runs:
            any_runs = True
        all_runs.append(runs or [{"text": plain, "style": "normal"}])
    block = {"type": "list", "ordered": ordered, "items": plains, "source_page": page}
    if any_runs:
        block["item_runs"] = all_runs
    blocks.append(block)


def question(number, text, yes, no, page):
    """Flowchart question: numbered paragraph + its two labelled branches."""
    para(f"{number}. {text}", page)
    bullets([f"‹Yes.› {yes}", f"‹No.› {no}"], page)


CANT_TAKE = "STOP. You can’t take the credit."
DEFS = "«Definitions and Special Rules»"

# ── page 40 ──────────────────────────────────────────────────────────────────
heading("Lines 27a, 27b, and 27c—Earned Income Credit (EIC)", 40, 4)
heading("What Is the EIC?", 40, 5)
para(
    "The EIC is a credit for certain people who work. The credit may give you a "
    "refund even if you don’t owe any tax or didn’t have any tax withheld.",
    40,
)
heading("To Take the EIC:", 40, 5)
bullets(
    [
        "Follow the steps in the following flowchart.",
        "Complete the worksheet that applies to you or let the IRS figure the "
        "credit for you.",
        # The source italicises only "Social security number"; "(SSN)"
        # continues in roman (independent verification 2026-08-10).
        f"Review the SSN requirements for claiming the EIC under «Social "
        f"security number» (SSN) in the {DEFS} section, later.",
        "If you have at least one child who meets the conditions to be your "
        "qualifying child for purposes of claiming the EIC, complete and attach "
        "Schedule EIC, even if that child doesn’t have a valid SSN. See "
        "Schedule EIC for more information, including how to complete "
        "Schedule EIC if your qualifying child doesn’t have a valid SSN.",
    ],
    40,
)
para(
    f"For help in determining if you are eligible for the EIC, go to "
    f"[[IRS.gov/EITC|{EITC}]] and click on “Check if You Qualify.” This "
    "service is available in English and Spanish.",
    40,
)
callout(
    "Caution.",
    "If you claim the EIC even though you aren’t eligible and it is "
    "determined that your error is due to reckless or intentional disregard of "
    "the EIC rules, you won’t be allowed to take the credit for 2 years even "
    "if you are otherwise eligible to do so. If you fraudulently claim the EIC, "
    "you won’t be allowed to take the credit for 10 years. See «Form 8862, "
    "who must file», later. You may also have to pay penalties.",
    40,
)
callout(
    "Tip.",
    "Refunds for returns claiming the earned income credit can’t be issued "
    "before mid-February 2026. This delay applies to the entire refund, not "
    "just the portion associated with the earned income credit.",
    40,
)

heading("Step 1. All Filers", 40, 5)
para("1. If, in 2025:", 40)
bullets(
    [
        "3 or more children who have valid SSNs lived with you, is the amount "
        "on Form 1040 or 1040-SR, line 11b, less than $61,555 ($68,675 if "
        "married filing jointly)?",
        "2 children who have valid SSNs lived with you, is the amount on "
        "Form 1040 or 1040-SR, line 11b, less than $57,310 ($64,430 if married "
        "filing jointly)?",
        "1 child who has a valid SSN lived with you, is the amount on Form 1040 "
        "or 1040-SR, line 11b, less than $50,434 ($57,554 if married filing "
        "jointly)?",
        "No children who have valid SSNs lived with you, is the amount on "
        "Form 1040 or 1040-SR, line 11b, less than $19,104 ($26,214 if married "
        "filing jointly)?",
    ],
    40,
)
bullets([f"‹Yes.› Continue.", f"‹No.› {CANT_TAKE}"], 40)
question(
    2,
    "Do you, and your spouse if filing a joint return, have a social security "
    "number issued on or before the due date of your 2025 return (including "
    "extensions) that allows you to work and is valid for EIC purposes "
    f"(explained later under {DEFS})?",
    "Continue.",
    "STOP. You can’t take the credit. Check the box on line 27c.",
    40,
)
question(
    3,
    "Are you filing Form 2555 (relating to foreign earned income)?",
    CANT_TAKE,
    "Continue.",
    40,
)
question(
    4,
    "Were you or your spouse a nonresident alien for any part of 2025?",
    f"See «Nonresident aliens», later, under {DEFS}.",
    "Go to Step 2.",
    40,
)

heading("Step 2. Investment Income", 40, 5)
para(
    "1. Add the amounts from Form 1040 or 1040-SR: Line 2a, plus Line 2b, plus "
    "Line 3b, plus Line 7a*, to give your Investment Income. *If line 7a is a "
    "loss, enter -0-.",
    40,
)
question(
    2,
    "Is your investment income more than $11,950?",
    "Continue.",
    "Skip question 3; go to question 4.",
    40,
)
question(
    3,
    "Are you filing Form 4797 (relating to sales of business property)?",
    f"See «Form 4797 filers», later, under {DEFS}.",
    CANT_TAKE,
    40,
)
para("4. Do any of the following apply for 2025?", 40)
bullets(
    [
        "You are filing Schedule E.",
        "You are reporting income from the rental of personal property not used "
        "in a trade or business.",
        "You are filing Form 8814 (relating to election to report child’s "
        "interest and dividends on your return).",
        "You have income or loss from a passive activity.",
    ],
    40,
)
bullets(
    [
        "‹Yes.› Use Worksheet 1 in Pub. 596 to see if you can take the credit.",
        "‹No.› Go to Step 3.",
    ],
    40,
)

# ── page 41 ──────────────────────────────────────────────────────────────────
heading("Step 3. Qualifying Child", 41, 5)
para("A qualifying child for the EIC is your…", 41)
bullets(
    [
        "Son, daughter, stepchild, foster child, brother, sister, stepbrother, "
        "stepsister, half brother, half sister, or a descendant of any of them "
        "(for example, your grandchild, niece, or nephew)",
        "AND was under age 19 at the end of 2025 and younger than you (or your "
        "spouse if filing jointly); or under age 24 at the end of 2025, a "
        "full-time student (defined later), and younger than you (or your "
        "spouse if filing jointly) — if the child is a full-time student, check "
        "the “Full-time student” box on row (6) of the Dependents section "
        "on page 1 of Form 1040 or 1040-SR; or any age and permanently and "
        "totally disabled (defined later) — if the child is permanently and "
        "totally disabled, check the “Permanently and totally disabled” "
        "box on row (6) of the Dependents section on page 1 of Form 1040 or "
        "1040-SR.",
        "AND who isn't filing a joint return for 2025 or is filing a joint "
        "return for 2025 only to claim a refund of withheld income tax or "
        "estimated tax paid (see Pub. 596 for examples).",
        "AND who lived with you in the United States for more than half of "
        "2025. If the child lived with you in the United States for more than "
        "half of 2025, check both boxes (box (a) and box (b)) on row (5) of the "
        "Dependents section on page 1 of Form 1040 or 1040-SR. Also, make sure "
        "to check the box to the right of the address block on page 1 of "
        "Form 1040 or 1040-SR. See «Main home» and «United States», later.",
    ],
    41,
)
callout(
    "Caution.",
    "You can’t take the credit for a child who didn’t live with you for "
    "more than half the year, even if you paid most of the child’s living "
    "expenses. The IRS may ask you for documents to show you lived with each "
    "qualifying child. Documents you might want to keep for this purpose "
    "include school and child care records and other records that show your "
    "child’s address.",
    41,
)
callout(
    "Tip.",
    "If the child didn’t live with you for more than half of 2025 because of "
    "a temporary absence, birth, death, placement with you for foster or "
    "adoption, or kidnapping, see «Exception to time lived with you», later.",
    41,
)
callout(
    "Caution.",
    "If the child meets the conditions to be a qualifying child of any other "
    "person (other than your spouse, if filing a joint return) for 2025, see "
    "«Qualifying child of more than one person», later. If the child was "
    "married, see «Married child», later.",
    41,
)
question(
    1,
    "Do you have at least one child who meets the conditions to be your "
    "qualifying child for the purpose of claiming the EIC?",
    "Continue.",
    "Skip questions 2 through 6; go to Step 4.",
    41,
)
question(
    2,
    "Are you filing a joint return for 2025?",
    "Skip questions 3 through 6 and Step 4; go to Step 5.",
    "Continue.",
    41,
)
question(
    3,
    "Are you a married taxpayer whose filing status is married filing "
    "separately or head of household?",
    "Continue.",
    "Skip questions 4 and 5; go to question 6.",
    41,
)
question(
    4,
    "Did you and your spouse have the same principal residence for the last "
    "6 months of 2025?",
    "Continue.",
    "Skip question 5; go to question 6.",
    41,
)
question(
    5,
    "Are you legally separated according to your state law under a written "
    "separation agreement or a decree of separate maintenance and you lived "
    "apart from your spouse at the end of 2025?",
    "Continue.",
    CANT_TAKE,
    41,
)
question(
    6,
    "Could you be a qualifying child of another person for 2025? (Check "
    "“No” if the other person isn't required to file, and isn’t "
    "filing, a 2025 tax return or is filing a 2025 return only to claim a "
    "refund of withheld income tax or estimated tax paid (see Pub. 596 for "
    "examples).)",
    "STOP. You can’t take the credit. Check the box on line 27c.",
    "Check the box in the Dependents section that discusses the special rule "
    "for separated spouses on page 1 of Form 1040 or 1040-SR. See «Special rule "
    f"for separated spouses», later, under {DEFS}. Skip Step 4; go to Step 5.",
    41,
)

heading("Step 4. Filers Without a Qualifying Child", 41, 5)
question(
    1,
    "Are you a married taxpayer whose filing status is married filing "
    "separately or head of household?",
    CANT_TAKE,
    "Continue.",
    41,
)
# Question 2 begins on page 41; its answers print at the top of page 42.
question(
    2,
    "Were you, or your spouse if filing a joint return, at least age 25 but "
    "under age 65 at the end of 2025? (Check “Yes” if you, or your "
    "spouse if filing a joint return, were born after December 31, 1960, and "
    "before January 2, 2001.) If your spouse died in 2025 or if you are "
    "preparing a return for someone who died in 2025, see Pub. 596 before you "
    "answer.",
    "Continue.",
    CANT_TAKE,
    41,
)

review_notes = [
    "TRANCHE 12 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "40-41 — the start of the Earned Income Credit (lines 27a, 27b, 27c) and "
    "Steps 1 through 4 of its eligibility flowchart. It carries no document "
    "title by design: only tranche 1 does, so this file validates through "
    "merge-plans rather than standalone. No partial rebuild is delivered.",
    "THE EIC FLOWCHART REUSES THE TRANCHE-5 SHAPE with no changes: each Step is "
    "a heading carrying its printed badge (“Step 1. All Filers”), each "
    "numbered question keeps its printed number, and the Yes/No branches are a "
    "two-item list with strong labels. STOP is kept as text; the checkbox "
    "glyphs and connector arrows are dropped as decoration. This is the second "
    "flowchart in the document and it needed no new decisions.",
    "TWO QUESTIONS CARRY THEIR CONDITIONS AS A LIST FIRST. Step 1 question 1 "
    "and Step 2 question 4 each print a bulleted set of conditions and THEN a "
    "single Yes/No pair that applies to the whole set. Those are authored as "
    "the numbered question, then the condition list, then the branch list — "
    "so the branches still read as belonging to the question, and no condition "
    "is folded into the branch text.",
    "STEP 2 QUESTION 1 IS AN ADDITION GRID IN PRINT. It shows Line 2a, "
    "Line 2b, Line 3b and Line 7a stacked with plus signs and an equals sign "
    "leading to “Investment Income”. There is one result, not four "
    "entries, so it is authored as a sentence naming the same four lines in the "
    "same order with the footnote kept — rather than as a worksheet table, "
    "which would imply four entry boxes the form does not have.",
    "BOUNDARY OUT. Step 4’s question 2 begins on page 41 and its Yes/No "
    "branches print at the top of page 42. It is authored whole here at "
    "page 41, so tranche 13 must start at Step 4 question 3 (“Was your main "
    "home…”) and NOT re-author it.",
    "COLUMN-DETECTOR NOTE, not a defect. Pages 40, 46 and 47 report 5-6 "
    "“columns”. That is the round-8 band cut counting REGIONS of a page "
    "whose layout changes down the page, not a mis-detection; the reading order "
    "on these pages was checked and is correct, which is why they could be "
    "authored from the text layer.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked — this section "
    "refers constantly to its own Definitions and Special Rules, which are in a "
    "later tranche. The one real link on these pages, IRS.gov/EITC, comes from "
    "the PDF’s own annotation.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (full-time, mid-February, "
    "1040-SR, Form 4797, half brother). PAGE FURNITURE OMITTED: printed page "
    "numbers, the standing “Need more information or forms?” footer, and "
    "the invisible “Fileid: … MUST be removed before printing” "
    "production lines.",
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
