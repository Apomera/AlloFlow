#!/usr/bin/env python3
"""Author tranche 42 of the i1040 rebuild: printed page 102 — Schedule 1-A Part
II continued: what counts as a cash tip, TRDA/GITCA programs, the
voluntariness test, and amounts that are not qualified tips.

Usage: python gen_tranche_42.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-42-pages-102-102.json")

PAGE = 102
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


# NOTE: "Determined by the customer/payor." at the top of this page closes the
# qualified-tips list authored WHOLE at page 101 (tranche 41). Not repeated.

heading("Cash tips", 5)
para(
    "Cash tips are tips received from customers or, in the case of an employee, "
    "through a mandatory or voluntary tip-sharing arrangement, such as a tip "
    "pool, that are paid in a cash medium, including by cash, check, credit "
    "card, debit card, gift card, tangible or intangible tokens that are "
    "readily exchangeable for a fixed amount (for example, casino chips), and "
    "any other form of electronic settlement or mobile payment app that is "
    "denominated in cash. Tips are the excess amount paid by a customer for "
    "services over the amount agreed to or otherwise reasonably expected to "
    "have been paid for the services in an arm’s-length transaction."
)
para(
    "Cash tips don’t include items paid in any medium other than cash. For "
    "example, cash tips don’t include:"
)
bullets([
    "Event tickets,",
    "Meals,",
    "Services, or",
    "Other assets that aren’t exchangeable for a fixed amount of cash.",
])

heading("TRDA and GITCA programs", 5)
para(
    "Tips reported pursuant to a Tipped Employee Participation Agreement as "
    "part of the Tip Rate Determination Agreement (TRDA) program or a Model "
    "Gaming Employee Tip Reporting Agreement as part of the Gaming Industry Tip "
    "Compliance Agreement (GITCA) program are considered qualified tips as long "
    "as the participating employee is otherwise eligible for the deduction for "
    "qualified tips and reports tips using the tip rates established under their "
    "agreement. An employee participating in a TRDA or GITCA program may report "
    "any additional qualified tips on Form 4137."
)

heading(
    "Paid voluntarily, not subject to negotiation, and determined by the "
    "customer/payor",
    5,
)
para(
    "Amounts are qualified tips only if they are paid voluntarily and without "
    "any consequence in the event of nonpayment. Qualified tips do not include "
    "service charges, automatic gratuities, or any other mandatory amounts "
    "automatically added to a customer’s bill by the vendor or the "
    "establishment, unless the customer is expressly provided an option to "
    "disregard or modify such charges, gratuities, and amounts without "
    "consequence."
)

heading("Example 1", 6)
para(
    "You work on the wait staff at a restaurant. You serve a table with a group "
    "of six people. The restaurant has an automatic 18% charge added to a bill "
    "of any party of six or more people. The bill includes the 18% automatic "
    "gratuity on the “tip line,” and the total bill includes this amount. Even "
    "though the restaurant distributed the amount to you and bussers, because "
    "the customer did not determine the amount of the additional charge and was "
    "not given an express option to ignore or change the amount, the 18% charge "
    "is not a qualified tip and may not be deducted."
)

heading("Example 2", 6)
para(
    "You work on the wait staff at a restaurant. When you give customers the "
    "bill, you present the customer an electronic handheld point-of-sale (POS) "
    "device. Besides the charges for the meal and sales tax, the POS device "
    "also prompts the customer to leave a tip, giving the option of 15%, 18%, "
    "20%, other, and no tip. The customer selects 18% and pays the total with a "
    "credit card. Because the customer had the right to determine the tip "
    "amount, including the option to leave no tip, the 18% is a qualified tip."
)

heading("Amounts received that are not qualified tips", 5)
para("The following are examples of amounts that are not qualified tips.")
bullets([
    "If your employer is in a specified service trade or business (SSTB), tips "
    "received as an employee of that employer are not qualified tips. If you "
    "are self-employed in an SSTB, tips received in the course of that trade or "
    "business are not qualified tips. If you received tips in the course of "
    "another trade or business that is not an SSTB, those tips may be qualified "
    "tips if they meet the other requirements. For more information on SSTBs, "
    "see the instructions for Form 8995-A.",

    "Tips received while performing a service that is a felony or misdemeanor "
    "under applicable law are not qualified tips. However, tips you received "
    "for a service that is legal but were received while working for an "
    "establishment that violates applicable law in other respects may be "
    "qualified tips.",

    "Amounts received for prostitution and pornographic activity are not "
    "qualified tips.",
])
callout(
    "Tip.",
    "Until the issuance of final regulations determining whether a trade or "
    "business is an SSTB for purposes of this deduction, and for taxable years "
    "beginning before the date the final regulations are published, the IRS "
    "will treat employees and self-employed individuals as having received tips "
    "in the course of a trade or business that is not an SSTB if the employee "
    "is in an occupation that customarily and regularly received tips on or "
    "before December 31, 2024. For more information on the transition relief, "
    "see [[Notice 2025-69|https://www.irs.gov/pub/irs-drop/n-25-69.pdf]].",
)

heading("Example 1", 6)
para(
    "You are an employee who works as a bartender but don’t have a license that "
    "is required by the state to serve alcohol. State law provides that serving "
    "alcohol without a license is a misdemeanor. You received $10,000 in tips "
    "during 2025 while serving alcohol at the bar. “Bartender” is on the list "
    "of occupations that customarily and regularly received tips. However, "
    "because you served alcohol in violation of applicable state law, the "
    "$10,000 in tips that you received in 2025 are not qualified tips and may "
    "not be deducted."
)

heading("Example 2", 6)
para(
    "You are an employee who works as a server at a restaurant that has a bar "
    "that serves alcohol. The restaurant doesn’t have a liquor license required "
    "by state law. You received $10,000 in tips in 2025 waiting tables at the "
    "restaurant. “Wait Staff” is on the list of occupations that customarily "
    "and regularly received tips. Even though the restaurant is in violation of "
    "applicable state law by not having a liquor license, because working as a "
    "server is legal under state law, the $10,000 in tips you received in 2025 "
    "are qualified tips and qualify for the deduction."
)

heading(
    "Occupations that customarily and regularly received tips on or before "
    "December 31, 2024",
    5,
)
# Runs across the 102-103 break; authored whole at its starting page.
para(
    "In order for a tip to be a qualified tip, it must have been paid to you "
    "while you were working in an occupation that customarily and regularly "
    "received tips on or before December 31, 2024. The list of occupations that "
    "customarily and regularly received tips on or before December 31, 2024, "
    "provides for each occupation a numeric Treasury Tipped Occupation Code "
    "(TTOC), an occupation title, a description of the types of services "
    "performed by individuals working in the occupation, illustrative examples "
    "of specific occupations that would be included, and the Standard "
    "Occupation Classification (SOC) system code(s) that related to the "
    "occupation."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 42 OF A MULTI-SESSION REBUILD. This plan covers printed page 102, "
    "Schedule 1-A Part II continued. It carries no document title by design — "
    "only tranche 1 does — so this file validates through merge-plans rather "
    "than standalone. No partial rebuild is delivered.",

    "THE BULLET AT THE TOP OF THIS PAGE IS NOT REPEATED. “Determined by the "
    "customer/payor.” closes the qualified-tips list authored whole at page 101 "
    "in tranche 41. Check the shortfall with carried_block_check.cjs against "
    "tranche 41.",

    "A TIP BOX IS MOVED FROM THE MIDDLE OF A LIST TO AFTER IT. The transition "
    "relief note is printed between the first and second bullets of “Amounts "
    "received that are not qualified tips”, and it qualifies the FIRST bullet "
    "only — the SSTB rule. Splitting a three-item list in two to hold its "
    "position would be worse for a reader than moving it, and the note names "
    "its own subject in its first sentence (“whether a trade or business is an "
    "SSTB for purposes of this deduction”), so no ambiguity results from "
    "placing it after the list rather than beside the bullet it belongs to.",

    "TWO PAIRS OF EXAMPLES SHARE THE SAME HEADINGS. The page carries “Example "
    "1” and “Example 2” under the voluntariness test, and another “Example 1” "
    "and “Example 2” under amounts that are not qualified tips. The repetition "
    "is the source's; the headings are level 6 beneath the level-5 run-in lead "
    "that governs each pair, so a reader navigating by heading sees which "
    "discussion each belongs to.",

    "“Notice 2025-69” IS A PHRASE LINK WITH NO VISIBLE URL, and its target is "
    "an irs-drop PDF (irs.gov/pub/irs-drop/n-25-69.pdf) rather than an "
    "irs.gov page. Taken from the annotation as always; reading the visible "
    "text would have produced a dead reference to a notice number.",

    "THE “OCCUPATIONS THAT CUSTOMARILY AND REGULARLY RECEIVED TIPS” PARAGRAPH "
    "SPANS THE 102-103 BREAK and is authored whole here. The page-103 tranche "
    "must not re-author it and should open at the list of occupations. "
    "Confirming this took reading column 3 to its end: a truncated dump stops "
    "inside Example 2 and page 103 opens on unrelated text, which together "
    "suggest the Example spans the break. It does not — the Example finishes on "
    "this page and the occupations paragraph is what carries over.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing footer. "
    "Soft hyphens removed and line-break hyphens closed, while genuine "
    "compounds are kept (arm's-length, tip-sharing, point-of-sale, "
    "self-employed, customer/payor, 8995-A, 2025-69).",
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
