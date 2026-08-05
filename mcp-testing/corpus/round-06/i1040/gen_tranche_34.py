#!/usr/bin/env python3
"""Author tranche 34 of the i1040 rebuild: printed page 94 — the Self-Employed
Health Insurance Deduction Worksheet and Schedule 1 line 17.

Usage: python gen_tranche_34.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-34-pages-94-94.json")

PAGE = 94
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


# NOTE: the two-line fragment "tion. See Pub. 560 or, if you were a minister,
# Pub. 517." printed between the foot of this worksheet and the Line 17 heading
# completes LINE 16, which was authored whole at page 93 (tranche 33). It is
# NOT repeated here.

heading("Self-Employed Health Insurance Deduction Worksheet—Schedule 1, Line 17", 5)
callout(
    "Before you begin:",
    "Be sure you have read the «Exceptions» in the instructions for this line "
    "to see if you can use this worksheet instead of Form 7206 to figure your "
    "deduction.",
)
worksheet(
    "Self-Employed Health Insurance Deduction Worksheet for Schedule 1, line "
    "17, lines 1 through 3. The Amount column is where you write your figures; "
    "it is blank in the printed form. The two footnotes keyed to lines 1 and 2 "
    "are given inside the lines they qualify.",
    [
        ("1.",
         "Enter the total amount paid in 2025 for health insurance coverage "
         "established under your business (or the S corporation in which you "
         "were a more-than-2% shareholder) for 2025 for you, your spouse, and "
         "your dependents. Your insurance can also cover your child who was "
         "under age 27 at the end of 2025, even if the child wasn’t your "
         "dependent. But don’t include amounts for any month you were eligible "
         "to participate in an employer-sponsored health plan or amounts paid "
         "from retirement plan distributions that were nontaxable because you "
         "are a retired public safety officer."),

        ("2.",
         "Enter your net profit and any other earned income from the business "
         "under which the insurance plan is established, minus any deductions "
         "on Schedule 1, lines 15 and 16. Don’t include Conservation Reserve "
         "Program payments exempt from self-employment tax. If you used either "
         "optional method to figure your net earnings from self-employment, "
         "don’t enter your net profit; instead, enter the amount from Schedule "
         "SE, line 4b. «Earned income» includes net earnings and gains from the "
         "sale, transfer, or licensing of property you created. However, it "
         "doesn’t include capital gain income. If you were a more-than-2% "
         "shareholder in the S corporation under which the insurance plan is "
         "established, earned income is your Medicare wages (box 5 of Form W-2) "
         "from that corporation."),

        ("3.",
         "‹Self-employed health insurance deduction.› Enter the ‹smaller› of "
         "line 1 or line 2 here and on Schedule 1, line 17. ‹Don’t› include "
         "this amount in figuring any medical expense deduction on Schedule A."),
    ],
)

heading("Line 17. Self-Employed Health Insurance Deduction", 4)
para(
    "You may be able to deduct the amount you paid for health insurance (which "
    "includes medical, dental, and vision insurance and qualified long-term "
    "care insurance) for yourself, your spouse, and your dependents. The "
    "insurance can also cover your child who was under age 27 at the end of "
    "2025, even if the child wasn’t your dependent. A child includes your son, "
    "daughter, stepchild, adopted child, or foster child (defined in «Who "
    "Qualifies as Your Dependent» in the Instructions for Form 1040)."
)
para("One of the following statements must be true.")
bullets([
    "You were self-employed and had a net profit for the year reported on "
    "Schedule C or F.",
    "You were a partner with net earnings from self-employment.",
    "You used one of the optional methods to figure your net earnings from "
    "self-employment on Schedule SE.",
    "You received wages in 2025 from an S corporation in which you were a "
    "more-than-2% shareholder. Health insurance premiums paid or reimbursed by "
    "the S corporation are shown as wages on Form W-2.",
])
para(
    "The insurance plan must be established under your business. Your personal "
    "services must have been a material income-producing factor in the "
    "business. If you are filing Schedule C or F, the policy can be either in "
    "your name or in the name of the business."
)
para(
    "If you are a partner, the policy can be either in your name or in the name "
    "of the partnership. You can either pay the premiums yourself or your "
    "partnership can pay them and report them as guaranteed payments. If the "
    "policy is in your name and you pay the premiums yourself, the partnership "
    "must reimburse you and report the premiums as guaranteed payments."
)
para(
    "If you are a more-than-2% shareholder in an S corporation, the policy can "
    "be either in your name or in the name of the S corporation. You can either "
    "pay the premiums yourself or the S corporation can pay them and report "
    "them as wages. If the policy is in your name and you pay the premiums "
    "yourself, the S corporation must reimburse you. You can deduct the "
    "premiums only if the S corporation reports the premiums paid or reimbursed "
    "as wages in box 1 of your Form W-2 in 2025 and you also report the premium "
    "payments or reimbursements as wages on Form 1040 or 1040-SR, line 1a."
)
para(
    "But if you were also eligible to participate in any subsidized health plan "
    "maintained by your or your spouse’s employer for any month or part of a "
    "month in 2025, amounts paid for health insurance coverage for that month "
    "can’t be used to figure the deduction. Also, if you were eligible for any "
    "month or part of a month to participate in any subsidized health plan "
    "maintained by the employer of either your dependent or your child who was "
    "under age 27 at the end of 2025, don’t use amounts paid for coverage for "
    "that month to figure the deduction."
)
callout(
    "Caution.",
    "A qualified small employer health reimbursement arrangement (QSEHRA) is "
    "considered to be a subsidized health plan maintained by an employer.",
)
callout(
    "Example.",
    "If you were eligible to participate in a subsidized health plan maintained "
    "by your spouse’s employer from September 30 through December 31, you can’t "
    "use amounts paid for health insurance coverage for September through "
    "December to figure your deduction.",
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 34 OF A MULTI-SESSION REBUILD. This plan covers printed page 94: "
    "the Self-Employed Health Insurance Deduction Worksheet and Schedule 1 line "
    "17. It carries no document title by design — only tranche 1 does — so this "
    "file validates through merge-plans rather than standalone. No partial "
    "rebuild is delivered.",

    "THE TWO-LINE LINE 16 FRAGMENT ON THIS PAGE IS NOT REPEATED. “tion. See "
    "Pub. 560 or, if you were a minister, Pub. 517.” is printed between the "
    "foot of this worksheet and the Line 17 heading, and completes the line 16 "
    "paragraph authored whole at page 93 in tranche 33. Check this page's "
    "shortfall with mcp-testing/tools/carried_block_check.cjs against tranche "
    "33.",

    "THE WORKSHEET SHAPE FROM TRANCHES 15, 16 AND 30 IS REUSED UNCHANGED — one "
    "table, printed line numbers in the Line column, entry column blank. Sixth "
    "worksheet, no alteration.",

    "THE TWO ASTERISKED FOOTNOTES ARE FOLDED INTO THE LINES THEY QUALIFY. Line "
    "2 carries both a * (on “net profit”) and a ** (on “other earned income”), "
    "and both notes are printed below the table. An asterisk a reader cannot "
    "see is a dead end, so each note is moved inside line 2 at the point it "
    "applies and the markers are dropped. The same treatment the line 6 "
    "footnote got in tranche 30.",

    "“Line 17” AND ITS TITLE ARE ONE HEADING, as throughout: “Line 17. "
    "Self-Employed Health Insurance Deduction”. The worksheet keeps its own "
    "printed banner as a level-5 heading, since it is a distinct artifact the "
    "instructions refer to by name.",

    "THE WORKSHEET IS PLACED BEFORE THE LINE 17 INSTRUCTIONS, as printed. It "
    "occupies the full width at the top of the page and the line 17 prose runs "
    "beneath it in three columns, so the printed reading order puts the "
    "worksheet first even though the prose is what introduces it. Kept as "
    "printed rather than reordered: the “Before you begin” note tells a reader "
    "to read the Exceptions in the line instructions first, so the worksheet "
    "already points at its own context.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed. Its "
    "cross-references — Exceptions, Who Qualifies as Your Dependent, Earned "
    "income — are italic in the source and marked emphasis only.",

    "ICON CALLOUTS as established in tranche 3: one CAUTION, plus an “Example.” "
    "run-in which takes the same shape. PAGE FURNITURE OMITTED: the printed "
    "page number and the standing footer. Soft hyphens removed and line-break "
    "hyphens closed, while genuine compounds are kept (1040-SR, W-2, "
    "more-than-2%, long-term, income-producing, employer-sponsored, "
    "self-employment).",
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
