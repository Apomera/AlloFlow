#!/usr/bin/env python3
"""Author tranche 35 of the i1040 rebuild: printed page 95 — the end of line 17,
then Schedule 1 lines 18, 19a-19c and 20.

Usage: python gen_tranche_35.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-35-pages-95-95.json")

PAGE = 95
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


def listing(items, ordered=False):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# This page opens with a NEW paragraph continuing the line 17 topic, not with a
# mid-sentence fragment, so nothing is carried in from page 94.

para(
    "Medicare premiums you voluntarily pay to obtain insurance in your name "
    "that is similar to qualifying private health insurance can be used to "
    "figure the deduction. Amounts paid for health insurance coverage from "
    "retirement plan distributions that were nontaxable because you are a "
    "retired public safety officer can’t be used to figure the deduction."
)
para("For more details, see Instructions for Form 7206.")
para(
    "If you qualify to take the deduction, use the Self-Employed Health "
    "Insurance Deduction Worksheet to figure the amount you can deduct."
)

heading("Exceptions", 5)
para(
    "Use Form 7206 instead of the Self-Employed Health Insurance Deduction "
    "Worksheet in these instructions to figure your deduction if any of the "
    "following applies."
)
listing([
    "You had more than one source of income subject to self-employment tax.",
    "You file Form 2555.",
    "You are using amounts paid for qualified long-term care insurance to "
    "figure the deduction.",
])
para(
    "Use Pub. 974 instead of the worksheet in these instructions if the "
    "insurance plan was considered to be established under your business and "
    "was obtained through the Marketplace, and advance payments of the premium "
    "tax credit were made or you are claiming the premium tax credit."
)

heading("Line 18. Penalty on Early Withdrawal of Savings", 4)
para(
    "The Form 1099-INT or Form 1099-OID you received will show the amount of "
    "any penalty you were charged."
)

heading("Lines 19a, 19b, and 19c. Alimony Paid", 4)

heading("Line 19a", 5)
para(
    "If you made payments to or for your spouse or former spouse under a "
    "divorce or separation agreement entered into on or before December 31, "
    "2018, you may be able to take this deduction. You can’t take a deduction "
    "for alimony payments you made to or for your spouse if you entered into "
    "your divorce or separation agreement after December 31, 2018, or if you "
    "entered into the agreement on or before December 31, 2018, and the "
    "agreement was changed after December 31, 2018, to expressly provide that "
    "alimony received is not included in your former spouse’s income. Use "
    "[[Tax Topic 452|https://www.irs.gov/taxtopics/tc452.html]] or see Pub. 504."
)

heading("Line 19c", 5)
para(
    "On line 19c, enter the month and year of your original divorce or "
    "separation agreement that relates to this deduction for alimony paid."
)

heading("Line 20. IRA Deduction", 4)
callout(
    "Tip.",
    "If you made any nondeductible contributions to a traditional individual "
    "retirement arrangement (IRA) for 2025, you must report them on Form 8606.",
)
callout(
    "Tip.",
    "You are entitled to a deduction for your contribution to a traditional IRA "
    "regardless of age.",
)
para(
    "If you made contributions to a traditional IRA for 2025, you may be able "
    "to take an IRA deduction. But you, or your spouse if filing a joint "
    "return, must have had earned income to do so. For IRA purposes, earned "
    "income includes alimony and separate maintenance payments reported on "
    "Schedule 1, line 2a. If you were a member of the U.S. Armed Forces, earned "
    "income includes any nontaxable combat pay you received. If you were "
    "self-employed, earned income is generally your net earnings from "
    "self-employment if your personal services were a material "
    "income-producing factor. For more details, see Pub. 590-A. A statement "
    "should be sent to you by June 1, 2026, that shows all contributions to "
    "your traditional IRA for 2025."
)
para(
    "Use the IRA Deduction Worksheet to figure the amount, if any, of your IRA "
    "deduction. But read the following list before you fill in the worksheet."
)
listing([
    "You can’t deduct contributions to a Roth IRA. But you may be able to take "
    "the retirement savings contributions credit (saver’s credit). See the "
    "instructions for Schedule 3, line 4.",

    "If you are filing a joint return and you or your spouse made contributions "
    "to both a traditional IRA and a Roth IRA for 2025, don’t use the IRA "
    "Deduction Worksheet in these instructions. Instead, see Pub. 590-A to "
    "figure the amount, if any, of your IRA deduction.",

    "You can’t deduct elective deferrals to a 401(k) plan, 403(b) plan, section "
    "457 plan, SIMPLE IRA plan, or the federal Thrift Savings Plan. Except for "
    "designated Roth contributions, these amounts aren’t included as income in "
    "box 1 of your Form W-2.",

    "If you made contributions to your IRA in 2025 that you deducted for 2024, "
    "don’t include them in the worksheet.",

    "If you received income from a nonqualified deferred compensation plan or "
    "nongovernmental section 457 plan that is included in box 1 of your Form "
    "W-2, or in box 1 of Form 1099-NEC, don’t include that income on line 8 of "
    "the worksheet. The income should be shown in (a) box 11 of your Form W-2, "
    "(b) box 12 of your Form W-2 with code Z, or (c) box 15 of Form 1099-MISC. "
    "If it isn’t, contact your employer or the payer for the amount of the "
    "income.",

    "You must file a joint return to deduct contributions to your spouse’s IRA. "
    "Enter the total IRA deduction for you and your spouse on line 20.",

    "Don’t include rollover contributions in figuring your deduction. Instead, "
    "see the instructions for Form 1040 or 1040-SR, lines 4a and 4b.",

    "Don’t include trustees’ fees that were billed separately and paid by you "
    "for your IRA.",

    "Don’t include any repayments of qualified reservist distributions. You "
    "can’t deduct them. For information on how to report these repayments, see "
    "«Qualified reservist repayments» in Pub. 590-A.",

    "If the total of your IRA deduction on line 20 plus any nondeductible "
    "contributions to your traditional IRAs shown on Form 8606 is less than "
    "your total traditional IRA contributions for 2025, see Pub. 590-A for "
    "special rules.",
], ordered=True)

heading("Were You Covered by a Retirement Plan?", 5)
# Runs across the 95->96 break; authored whole at its starting page.
para(
    "If you were covered by a retirement plan (qualified pension, "
    "profit-sharing (including 401(k)), annuity, SEP, SIMPLE, etc.) at work or "
    "through self-employment, your IRA deduction may be reduced or eliminated. "
    "But you can still make contributions to an IRA even if you can’t deduct "
    "them. In any case, the income earned on your IRA contributions isn’t taxed "
    "until it is paid to you."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 35 OF A MULTI-SESSION REBUILD. This plan covers printed page 95: "
    "the end of the line 17 discussion, then Schedule 1 lines 18, 19a-19c and "
    "20. It carries no document title by design — only tranche 1 does — so this "
    "file validates through merge-plans rather than standalone. No partial "
    "rebuild is delivered.",

    "NOTHING IS CARRIED IN, checked rather than assumed. Page 94 ends on a "
    "complete Example and page 95 opens a NEW paragraph on Medicare premiums, "
    "so unlike pages 91, 93 and 94 there is no fragment to inherit.",

    "THE TEN-ITEM LIST UNDER LINE 20 IS WHOLLY ON THIS PAGE, and confirming "
    "that took reading the third column to its end. A truncated dump stops at "
    "item 6 mid-word (“You must file a joint return to de-”) and page 96 opens "
    "on an unrelated fragment, which together suggest the list spans the break. "
    "It does not: items 6 through 10 and the following run-in lead all sit in "
    "the rest of column 3. It is an ORDERED list, since the source numbers the "
    "items and item 2 refers to the worksheet by position.",

    "“WERE YOU COVERED BY A RETIREMENT PLAN?” IS WHAT SPANS THE 95-96 BREAK, "
    "not the list. Its paragraph is authored whole here — “…the income earned "
    "on your IRA contributions isn't taxed until it is paid to you.” — so the "
    "page-96 tranche must not re-author it and should open at “The ‘Retirement "
    "plan’ box in box 13 of your Form W-2…”.",

    "LINE 19b HAS NO INSTRUCTION OF ITS OWN. The heading pairs lines 19a, 19b "
    "and 19c as the source does, but only 19a and 19c carry text beneath them. "
    "Nothing was dropped; 19b is the recipient's SSN field and the printed "
    "instructions say nothing about it.",

    "THE ONE LINK TARGET CAME FROM THE ANNOTATION: Tax Topic 452 resolves to "
    "irs.gov/taxtopics/tc452.html. It is a phrase link with no visible URL, so "
    "reading the text alone would have left a dead cross-reference — the third "
    "Tax Topic link in three tranches to behave this way.",

    "ICON CALLOUTS as established in tranche 3: two TIP boxes on line 20, each "
    "a paragraph opening with a strong “Tip.” in sentence case. “Exceptions” "
    "and “Were You Covered by a Retirement Plan?” are bold run-in leads "
    "promoted to level-5 headings under the line they belong to, with the "
    "trailing period dropped and the question mark kept.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing “Need "
    "more information or forms? Visit IRS.gov.” footer. Soft hyphens removed "
    "and line-break hyphens closed, while genuine compounds are kept (1040-SR, "
    "1099-INT, 1099-OID, 1099-NEC, 1099-MISC, W-2, 401(k), 403(b), long-term, "
    "profit-sharing, income-producing, self-employment, nonqualified).",
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
