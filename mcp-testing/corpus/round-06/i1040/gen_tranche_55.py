#!/usr/bin/env python3
"""Author tranche 55 of the i1040 rebuild: printed page 115 — the opening of the
Instructions for Schedule 3, Additional Credits and Payments: General
Instructions and lines 1 through 4.

Usage: python gen_tranche_55.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-55-pages-115-115.json")

PAGE = 115
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

TAX_TOPIC_602 = "https://www.irs.gov/taxtopics/tc602.html"
IRS_EDCREDIT = "https://www.irs.gov/help/ita/am-i-eligible-to-claim-an-education-credit"

blocks = []


def rich(text):
    """Expand the inline markers.

    «…» emphasis, ‹…› strong, [[text|url]] link. NEW IN THIS TRANCHE:
    [[«text»|url]] is a link that is ALSO italic. The plan schema says outright
    that "style and href may combine", and page 115 is the first page in the
    rebuild carrying spans that are demonstrably both — "Tax Topic 602" and
    "IRS.gov/EdCredit" are set in the italic face g_d0_f2 AND carry Link
    annotations. Marking them as plain links would have silently dropped the
    italics the source uses for every other cross-reference around them.
    """
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


heading("Instructions for Schedule 3: Additional Credits and Payments", 2)

heading("General Instructions", 3)
para(
    "Use Schedule 3 if you have nonrefundable credits, other than the child "
    "tax credit or the credit for other dependents, or other payments and "
    "refundable credits."
)
para(
    "Include the amount on Schedule 3, line 8, in the amount entered on Form "
    "1040, 1040-SR, or 1040-NR, line 20."
)
para(
    "Enter the amount on Schedule 3, line 15, on Form 1040, 1040-SR, or "
    "1040-NR, line 31."
)

heading("Specific Instructions", 3)

heading("Line 1. Foreign Tax Credit", 4)
callout(
    "Tip.",
    "If you are a shareholder in a controlled foreign corporation and made a "
    "section 962 election, see the instructions for Forms 1040 and 1040-SR, "
    "line 16, for the foreign tax credit you figured on Form 1118.",
)
para(
    "If you paid income tax to a foreign country or U.S. territory, you may be "
    "able to take this credit. Generally, you must complete and attach Form "
    "1116 to do so."
)

heading("Exception", 5)
para(
    "You don’t have to complete Form 1116 to take this credit if all of the "
    "following apply."
)
# Item 5's "a." and "b." sub-items are printed at the SAME 12pt indent as the
# numbers themselves, and the flat list schema cannot nest them, so they are
# folded into item 5 with their markers kept verbatim (Chart C, tranche 4).
# "wasn't" in item 2 is a STRAIGHT apostrophe in the source; "weren't" in item
# 3 is curly. Both reproduced as printed.
listing([
    "All of your foreign source gross income was from interest and dividends "
    "and all of that income and the foreign tax paid on it were reported to "
    "you on Form 1099-INT, Form 1099-DIV, or Schedule K-3 (or substitute "
    "statement).",
    "The total of your foreign taxes wasn't more than $300 (not more than $600 "
    "if married filing jointly).",
    "You held the stock or bonds on which the dividends or interest were paid "
    "for at least 16 days and weren’t obligated to pay these amounts to "
    "someone else.",
    "You aren’t filing Form 4563 or excluding income from sources within "
    "Puerto Rico.",
    "All of your foreign taxes were: a. Legally owed and not eligible for a "
    "refund or reduced tax rate under a tax treaty, and b. Paid to countries "
    "that are recognized by the United States and don’t support terrorism.",
], ordered=True)
para(
    "For more details on these requirements, see the Instructions for Form "
    "1116."
)
para("‹Do you meet all five requirements just listed?›")
listing([
    "‹Yes.› Enter on line 1 the smaller of (a) your total foreign taxes, or "
    "(b) the total of the amounts on Form 1040 or 1040-SR, line 16, and "
    "Schedule 2, line 1a.",
    "‹No.› See Form 1116 to find out if you can take the credit and, if you "
    "can, if you have to file Form 1116.",
], ordered=False)

heading("Line 2. Credit for Child and Dependent Care Expenses", 4)
para(
    "You may be able to take this credit if, in order to work or look for "
    "work, you paid someone to care for:"
)
listing([
    "Your qualifying child under age 13 whom you claim as your dependent,",
    "Your disabled spouse or any other disabled person who couldn’t care for "
    "themselves, or",
    "Your child whom you couldn't claim as a dependent because of the rules "
    "for «Children of divorced or separated parents» under «Who Qualifies as "
    "Your Dependent», earlier.",
], ordered=False)
para(
    f"For details, use [[«Tax Topic 602»|{TAX_TOPIC_602}]] or see Form 2441."
)

heading("Line 3. Education Credits", 4)
para(
    "If you (or your dependent) paid qualified expenses in 2025 for yourself, "
    "your spouse, or your dependent to enroll in or attend an eligible "
    "educational institution, you may be able to take an education credit. See "
    "Form 8863 for details. However, you can’t take an education credit if any "
    "of the following applies."
)
listing([
    "You, or your spouse if filing jointly, are claimed as a dependent on "
    "someone else’s (such as your parent’s) 2025 tax return.",
    "Your filing status is married filing separately.",
    "The amount on Form 1040 or 1040-SR, line 11b, is $90,000 or more "
    "($180,000 or more if married filing jointly).",
    "You, or your spouse, were a nonresident alien for any part of 2025 unless "
    "your filing status is married filing jointly. See «Nonresident aliens and "
    "dual-status aliens», earlier.",
], ordered=False)
para(
    "You may be able to increase an education credit if the student chooses to "
    "include all or part of a Pell grant or certain other scholarships or "
    "fellowships in income."
)
para(
    "For more information, see Pub. 970; the instructions for Form 1040 or "
    f"1040-SR, line 29; and [[«IRS.gov/EdCredit»|{IRS_EDCREDIT}]]."
)

heading("Line 4. Retirement Savings Contributions Credit (Saver’s Credit)", 4)
para(
    "You may be able to take this credit if you, or your spouse if filing "
    "jointly, made (a) contributions, other than rollover contributions, to a "
    "traditional or Roth IRA; (b) elective deferrals to a 401(k) or 403(b) "
    "plan (including designated Roth contributions) or to a governmental "
    "section 457(b) plan, SIMPLE IRA, or a SEP; (c) voluntary employee "
    "contributions to a qualified retirement plan (including the federal "
    "Thrift Savings Plan); (d) contributions to a 501(c)(18)(D) plan; or (e) "
    "contributions to an ABLE account by the designated beneficiary, as "
    "defined in section 529A."
)
# The list this sentence introduces is printed WHOLLY on page 116, so it is
# tranche 56's to author - the same handoff the Exception paragraph made across
# the 88-89 break in tranche 28.
para(
    "However, you can’t take the credit if either of the following applies."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 55 OF A MULTI-SESSION REBUILD. This plan covers printed page 115, "
    "the opening of the Instructions for Schedule 3, Additional Credits and "
    "Payments. It carries no document title by design — only tranche 1 does — "
    "so this file validates through merge-plans rather than standalone. No "
    "partial rebuild is delivered.",

    "NOTHING IS CARRIED IN OR OUT, but the 115-116 break needs care. The last "
    "paragraph ends “…if either of the following applies.” and the numbered "
    "list it introduces is printed WHOLLY on page 116. That list is tranche "
    "56's to author, exactly as the Exception paragraph handed its list across "
    "the 88-89 break in tranche 28. **Tranche 56 must open with that list and "
    "keep it attached to the Line 4 heading.**",

    "A NEW INLINE SHAPE: LINKS THAT ARE ALSO ITALIC. “Tax Topic 602” and "
    "“IRS.gov/EdCredit” are set in the italic face g_d0_f2 AND carry Link "
    "annotations. The plan schema states outright that “style and href may "
    "combine”, so both are now authored as emphasis runs carrying an href; the "
    "generator's rich() helper gained a [[«text»|url]] form for it. Marking "
    "them as plain links, as every earlier tranche's helper would have done, "
    "would have silently dropped the italics the source uses for every other "
    "cross-reference on the same page.",

    "AND THE LINK TEXT IS AGAIN NOT THE LINK TARGET. “IRS.gov/EdCredit” "
    "resolves to https://www.irs.gov/help/ita/am-i-eligible-to-claim-an-"
    "education-credit and “Tax Topic 602” to "
    "https://www.irs.gov/taxtopics/tc602.html. Both were read from the "
    "annotation rects. Second page running where constructing an href from the "
    "visible text would have produced a plausible, wrong link — see tranche 52.",

    "THE SOURCE MIXES APOSTROPHES AGAIN: nine contractions are curly and TWO "
    "are straight — “wasn't more than $300” in requirement 2 and “you couldn't "
    "claim as a dependent” in the line 2 bullets. Both reproduced as printed. "
    "This is the third page (with 106 and 110) where the mix appears, and the "
    "recall check cannot see it in either direction.",

    "REQUIREMENT 5's “a.” AND “b.” ARE FOLDED INTO IT with their markers kept "
    "verbatim (Chart C, tranche 4). They are printed at the SAME 12pt indent "
    "as the numbered items, so the source does not even step them in; the flat "
    "list schema could not nest them regardless.",

    "THE YES/NO BRANCH USES THE TRANCHE-5 SHAPE: the question is a paragraph "
    "and the two branches are a bullet list with strong “Yes.”/“No.” leads. "
    "Here the question itself is BOLD (face g_d0_f4, the same face as the "
    "branch labels), unlike the flowchart questions in tranche 5, so it is "
    "marked strong. PAGE FURNITURE OMITTED: the printed page number. Soft "
    "hyphens removed and line-break hyphens closed (“nonrefunda-ble” → "
    "“nonrefundable”, “separa-ted” → “separated”, “dual-sta-tus” → "
    "“dual-status”), while genuine compounds are kept (1040-SR, 1040-NR, "
    "1099-INT, 1099-DIV, K-3, 401(k), 403(b), 457(b), 501(c)(18)(D)).",
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
