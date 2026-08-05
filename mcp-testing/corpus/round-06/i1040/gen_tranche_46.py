#!/usr/bin/env python3
"""Author tranche 46 of the i1040 rebuild: printed page 106 — the opening of
Schedule 1-A Part III, No Tax on Overtime: the deduction limits, what counts as
qualified overtime compensation, what does not, and how to determine the amount
for 2025.

Usage: python gen_tranche_46.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-46-pages-106-106.json")

PAGE = 106
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

WHD_FACT_SHEETS = "https://www.dol.gov/agencies/whd/fact-sheets"
WHD_OVERTIME = "https://www.dol.gov/agencies/whd/overtime"
WHD_FLSA_GUIDE = (
    "https://www.dol.gov/agencies/whd/compliance-assistance/handy-reference-guide-flsa"
)

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


heading("Part III. No Tax on Overtime", 3)
para(
    "Overtime compensation must be included in your gross income and is subject "
    "to income tax and generally social security and Medicare tax."
)
para(
    "If you have net earnings from self-employment, use Schedule SE to figure "
    "the tax due on net earnings from self-employment."
)
# ONE paragraph here, unlike page 101: "You can claim this deduction whether..."
# is NOT indented on this page, so it continues the sentence before it. On page
# 101 the matching pair IS indented twice (both at x=236 against a column left
# of x=224), which is why tranche 41 split them. Checked, not assumed.
para(
    "You may be able to claim a deduction for qualified overtime compensation "
    "paid to you in 2025 and that is reported on Form W-2, Form 1099-NEC, or "
    "Form 1099-MISC. You can claim this deduction whether you claim the "
    "standard deduction or itemize deductions on Schedule A or Schedule A "
    "(Form 1040-NR)."
)
callout(
    "Caution.",
    "If you are married, you must file a joint return with your spouse to claim "
    "this deduction.",
)
callout(
    "Caution.",
    "For tax year 2025, qualified overtime was not required to be separately "
    "accounted for on Form W-2, Form 1099-NEC, or Form 1099-MISC. See the "
    "instructions for lines 14a and 14b for more information about how to "
    "identify the qualified overtime included in the amounts reported on these "
    "forms.",
)
para("Fill out Schedule 1-A, Part III, only if:")
bullets([
    "You (and/or your spouse if filing a joint return) received qualified "
    "overtime compensation in 2025; and",
    "You have a valid social security number (SSN). If you are married filing "
    "jointly, the spouse who received the qualified overtime compensation must "
    "have a valid SSN.",
])

heading("Maximum amount of deduction", 4)
para(
    "You can’t deduct more than $12,500 ($25,000 if married filing jointly) of "
    "qualified overtime compensation."
)
callout(
    "Tip.",
    "If you are married and filing a joint return, and both you and your spouse "
    "have qualified overtime compensation, the $25,000 maximum amount of "
    "deduction limit applies to your combined overtime compensation. It is not "
    "a per spouse limit.",
)
para(
    "The deduction amount (after applying the $12,500 ($25,000 if married "
    "filing jointly) limit) is reduced if your MAGI is greater than the amount "
    "shown next for your filing status."
)
bullets([
    "Married filing jointly—$300,000.",
    "Single, Head of household, or Qualifying surviving spouse—$150,000.",
])
para("Your MAGI is the amount on line 3 on Part I of Schedule 1-A.")

heading("Qualified overtime compensation", 4)
para(
    "Qualified overtime compensation means overtime compensation that is paid "
    "to you as required under section 7 of the Fair Labor Standards Act of 1938 "
    "(FLSA) that is more than the amount of your regular rate of pay. This "
    "generally means the “half” portion of “time-and-a-half” compensation that "
    "is required by the FLSA. This “half” portion may be described by employers "
    "on various forms and statements as “overtime premium” or “FLSA Overtime "
    "Premium”."
)
# "won't" is a STRAIGHT apostrophe in the source; the curly form is used
# everywhere else on the page. Reproduced as printed - see the review notes.
para(
    "In order for overtime to be required to be paid to you under the FLSA, you "
    "must (among other requirements) be covered by and not exempt from the FLSA "
    "(an FLSA-eligible employee). If you are ineligible for federal overtime, "
    "you are an FLSA-ineligible employee and you generally won't be paid "
    "overtime."
)
para(
    "If you are an FLSA-eligible employee, you must generally receive overtime "
    "pay for hours you work that are more than a 40-hour workweek. Generally, "
    "the rate can’t be less than one and a half times your regular rate of pay."
)

heading("Amounts that are not qualified overtime compensation", 4)
para(
    "The following amounts are not qualified overtime compensation and can’t be "
    "included when figuring your deduction for qualified overtime compensation."
)
bullets([
    "‹Premium pay.› Some employers under a collective bargaining agreement "
    "and/or under state law provide more pay than section 7 of the FLSA "
    "requires. For example, an employer might choose to pay more than "
    "“time-and-a-half.” The amount of overtime paid that is over "
    "“time-and-a-half” is not qualified overtime compensation.",
    "‹Payment for holidays and weekends.› Some employers may pay more for "
    "certain weekends or holidays even if the employee doesn’t work more than "
    "40 hours in the workweek. Extra pay for certain weekends or holidays is "
    "generally not qualified overtime compensation if the employee doesn’t work "
    "more than 40 hours in the workweek.",
    "‹Qualified tips.› Qualified overtime compensation doesn’t include any "
    "amount you receive as a qualified tip.",
    # Second straight apostrophe on the page: "can't".
    "‹Coverage under state rules.› Some FLSA-ineligible employees are eligible "
    "for overtime under state law or are paid premium rates for certain work "
    "for other reasons. Overtime pay that is paid to these FLSA-ineligible "
    "employees is not qualified overtime compensation and these amounts can't "
    "be included when figuring the deduction for qualified overtime "
    "compensation.",
])
callout(
    "Caution.",
    "Qualified overtime must be paid to a covered, nonexempt employee under the "
    "FLSA (an FLSA-eligible employee). Ask your employer or other service "
    "recipients whether you are an FLSA-eligible employee. For more information "
    f"on coverage and exemption under the FLSA, see [[WHD Fact Sheets|{WHD_FACT_SHEETS}]], "
    f"[[Overtime Pay|{WHD_OVERTIME}]], and [[FLSA Guide|{WHD_FLSA_GUIDE}]].",
)

heading("Determining the amount of qualified overtime compensation for 2025", 4)
para(
    "Because no changes have been made to Form W-2, Form 1099-NEC, or Form "
    "1099-MISC to account for a separate accounting of qualified overtime "
    "compensation, a separate accounting may not appear on your Form W-2, Form "
    "1099-NEC, or Form 1099-MISC. Some employers may choose to provide for the "
    "amount of qualified overtime compensation using Form W-2, box 14. If your "
    "employer does provide a separate accounting of your qualified overtime on "
    "Form W-2, box 14, you can generally rely on this amount, and the methods "
    "described in paragraphs 1 through 5 don’t apply to you."
)
callout(
    "Tip.",
    "If you request the amount of your FLSA Overtime Premium from your employer "
    "or the service recipient, you can rely on the information that is provided "
    "to you to determine the amount of your qualified overtime compensation.",
)
# Spans the 106-107 break: begins in the last column of page 106 and finishes
# at the top of page 107. Authored whole here; tranche 47 must not repeat it.
para(
    "If the amount of your qualified overtime compensation isn’t separately "
    "identified on your Form W-2, Form 1099-NEC, or Form 1099-MISC, you can "
    "figure your qualified overtime compensation using one of the methods "
    "described in paragraphs 1 through 5."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 46 OF A MULTI-SESSION REBUILD. This plan covers printed page 106, "
    "the opening of Schedule 1-A Part III, No Tax on Overtime. It carries no "
    "document title by design — only tranche 1 does — so this file validates "
    "through merge-plans rather than standalone. No partial rebuild is "
    "delivered.",

    "NOTHING IS CARRIED IN. Page 105 ends with a completed TIP box, and page "
    "106 opens a new Part, so this tranche starts clean. ONE BLOCK IS CARRIED "
    "OUT: the closing paragraph, “If the amount of your qualified overtime "
    "compensation isn’t separately identified…”, begins in the last column here "
    "and finishes at the top of page 107. It is authored whole at this page and "
    "tranche 47 must open at “If your employer is covered by a different "
    "overtime rule…”, not repeat it.",

    "THE THIRD PARAGRAPH IS ONE PARAGRAPH, NOT TWO — AND PAGE 101 IS "
    "DIFFERENT. “You can claim this deduction whether you claim the standard "
    "deduction…” is NOT indented here (it continues at the column left, x=42), "
    "so it belongs to the sentence before it. On page 101 the matching pair is "
    "indented twice (both at x=236 against a column left of x=224), which is "
    "why tranche 41 authored them separately. Both were checked in the "
    "geometry; the source really does set the same two sentences differently "
    "on the two pages, and neither tranche is wrong.",

    "THE SOURCE MIXES STRAIGHT AND CURLY APOSTROPHES AND BOTH ARE REPRODUCED "
    "AS PRINTED. Eight contractions on this page use the curly ’ (can’t, "
    "doesn’t, don’t, isn’t); TWO use a straight ' — “you generally won't be "
    "paid overtime” and “these amounts can't be included”. Normalising them "
    "would be silently editing the source, and the recall check could not have "
    "caught it either way because its normalisation strips punctuation. Checked "
    "character by character in the item dump.",

    "FOUR BOLD RUN-INS BECOME LEVEL-4 HEADINGS with the trailing period "
    "dropped (“Maximum amount of deduction”, “Qualified overtime "
    "compensation”, “Amounts that are not qualified overtime compensation”, "
    "“Determining the amount of qualified overtime compensation for 2025”). "
    "They are children of Part III at level 3, matching how Part II's run-ins "
    "sit in tranches 41-44. FOUR MORE BOLD RUN-INS STAY INSIDE THEIR LIST "
    "ITEMS (“Premium pay.”, “Payment for holidays and weekends.”, “Qualified "
    "tips.”, “Coverage under state rules.”) — they lead bullets in a "
    "four-item list introduced by a sentence, exactly the shape tranche 24 "
    "settled with “Free File.”, and promoting them would break the list.",

    "ALL FIVE LINK ANNOTATIONS RESOLVE TO THREE dol.gov TARGETS, read from the "
    "annotation rects rather than inferred from the prose: WHD Fact Sheets, "
    "Overtime Pay, and FLSA Guide. Two of the three are split across two rects "
    "each because the link text breaks across a line. They sit INSIDE the "
    "CAUTION box, not in a paragraph after it: the sentence “For more "
    "information on coverage and exemption under the FLSA…” continues at the "
    "column left below the icon with no indent, which is how an icon callout "
    "wraps once it clears the icon.",

    "PAGE FURNITURE OMITTED: the printed page number. Soft hyphens removed and "
    "line-break hyphens closed (“el-igible” → “eligible”, “over- time” → "
    "“overtime”, “com-pensation” → “compensation”), while genuine compounds "
    "are kept (W-2, 1099-NEC, 1099-MISC, 1040-NR, 1-A, FLSA-eligible, "
    "FLSA-ineligible, time-and-a-half, 40-hour, self-employment). The em "
    "dashes before the MAGI thresholds are the source's own.",
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
