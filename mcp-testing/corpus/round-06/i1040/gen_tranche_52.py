#!/usr/bin/env python3
"""Author tranche 52 of the i1040 rebuild: printed page 112 — Schedule 2 lines
2, 4, 5, 6, and 8 (AMT, self-employment tax, unreported and uncollected social
security and Medicare tax, and the additional tax on IRAs).

Usage: python gen_tranche_52.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-52-pages-112-112.json")

PAGE = 112
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

# Both hrefs are read from the annotation rects. IRS.gov/AMT is the reason that
# matters: its target is a Tax Topic page, NOT the address the link text spells.
ELECTIVE_PAY = (
    "https://www.irs.gov/credits-deductions/"
    "elective-pay-and-transferability-frequently-asked-questions-transferability"
)
IRS_AMT = "https://www.irs.gov/taxtopics/tc556.html"

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


def listing(items, ordered):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# Closes line 1y, whose numbered list finished on page 111.
callout(
    "Tip.",
    "For more information about elective pay and credit transferability, go to "
    f"[[IRS.gov/Credits-Deductions/Elective-Pay-and-Transferability-Frequently-Asked-Questions-Transferability|{ELECTIVE_PAY}]].",
)

heading("Line 2. Alternative Minimum Tax (AMT)", 4)
para(
    "The AMT exemption amount is increased to $88,100 ($137,000 if married "
    "filing jointly or qualifying surviving spouse; $68,500 if married filing "
    "separately). The income levels at which the AMT exemption begins to phase "
    "out has increased to $626,350 ($1,252,700 if married filing jointly or "
    "qualifying surviving spouse)."
)
para(
    "See the Instructions for Form 6251 to see if you must file the form and "
    "then use Form 6251 to figure the amount, if any, of your AMT. Enter the "
    "amount from Form 6251, line 11, on line 2."
)
para(
    "For help with the alternative minimum tax, go to "
    f"[[IRS.gov/AMT|{IRS_AMT}]]."
)

heading("Line 4. Self-employment Tax", 4)
# "net earning" is singular in the source. Reproduced as printed.
para(
    "On line 4, enter the amount of the tax due on net earning from "
    "self-employment from Schedule SE, line 12."
)
para(
    "If you filed Form 4361, received IRS approval, and had no other income "
    "subject to self-employment tax, check box 1 on line 4."
)
para(
    "If you filed Form 4029 and received IRS approval, check box 2 on line 4. "
    "See Pub. 517 for details."
)
para(
    "If you are a U.S. citizen or resident alien living outside the United "
    "States and your self-employment income is exempt from self-employment "
    "tax, you should get a statement from the appropriate agency of the "
    "foreign country verifying that your self-employment income is subject to "
    "social security in that country. Attach a copy of the statement, check "
    "box 3, and enter “EAS” on the entry space next to box 3."
)
para(
    "If you have income from a business (including farming) and the income is "
    "community income, but you aren’t the spouse who carried on the business "
    "and you had no other income subject to self-employment tax, check box 3 "
    "and enter “ECI” on the entry space next to box 3."
)
para(
    "If you received fees for services performed as a notary public and you "
    "had no other income subject to self-employment tax, check box 3 and enter "
    "“EN” on the entry space next to box 3. If you did have other earnings of "
    "$400 or more subject to self-employment tax, check box 3 and enter “EN” "
    "and the amount of your net profit as a notary public from Schedule C on "
    "the entry space next to box 3."
)
para("For more information, see the Instructions for Schedule SE.")

heading(
    "Line 5. Unreported Social Security and Medicare Tax From Form 4137", 4
)
para("Enter the total of any taxes from Form 4137.")
para(
    "If you received tips of $20 or more in any month and you didn’t report "
    "the full amount to your employer, you must pay the social security and "
    "Medicare or railroad retirement (RRTA) tax on the unreported tips."
)
# "non-" ends a line and closes to "noncash", which is how the source spells it
# unhyphenated in the very next sentence.
para(
    "Don’t include the value of any noncash tips, such as tickets or passes. "
    "You don’t pay social security and Medicare taxes or RRTA tax on these "
    "noncash tips."
)
para(
    "To figure the social security and Medicare tax, use Form 4137. If you owe "
    "RRTA tax, contact your employer. Your employer will figure and collect "
    "the RRTA tax."
)
callout(
    "Caution.",
    "You may be charged a penalty equal to 50% of the social security and "
    "Medicare or RRTA tax due on tips you received but didn’t report to your "
    "employer.",
)

heading(
    "Line 6. Uncollected Social Security and Medicare Tax From Form 8919", 4
)
para("Enter the total of any taxes from Form 8919.")
para(
    "If you are an employee who received wages from an employer who didn’t "
    "withhold social security and Medicare tax from your wages, use Form 8919 "
    "to figure your share of the unreported tax. Include on line 6 the amount "
    "from line 13 of Form 8919. Include the amount from line 6 of Form 8919 on "
    "Form 1040 or 1040-SR, line 1g."
)

heading(
    "Line 8. Additional Tax on IRAs, Other Qualified Retirement Plans, etc.", 4
)
para(
    "If any of the following apply, see Form 5329 and its instructions to find "
    "out if you owe this tax and if you must file Form 5329. Also see Form "
    "5329 and its instructions for definitions of the terms used here."
)
listing([
    "You received an early distribution from (a) an IRA or other qualified "
    "retirement plan, (b) an annuity, or (c) a modified endowment contract "
    "entered into after June 20, 1988, and the total distribution wasn’t "
    "rolled over.",
    "Excess contributions were made to your IRA, Coverdell education savings "
    "account (ESA), Archer MSA, health savings account (HSA), or ABLE account.",
    "You received a taxable distribution from a Coverdell ESA, qualified "
    "tuition program, or ABLE account.",
    "You didn’t take the minimum required distribution from your IRA or other "
    "qualified retirement plan by April 1 of the year following the year you "
    "reached age 73.",
], ordered=True)

heading("Exception", 5)
para(
    "If only item (1) applies and distribution code 1 is correctly shown in "
    "box 7 of all your Forms 1099-R, you don’t have to file Form 5329. "
    "Instead, multiply the taxable amount of the distribution by 10% (0.10) "
    "and enter the result on line 8. The taxable amount of the distribution is "
    "the part of the distribution you reported on Form 1040, 1040-SR, or "
    "1040-NR, line 4b or 5b, or on Form 4972. Also check the box on line 8 to "
    "indicate that you don’t have to file Form 5329. But you must file Form "
    "5329 if distribution code 1 is incorrectly shown in box 7 of Form 1099-R "
    "or you qualify for an exception, such as the exceptions for qualified "
    "medical expenses, qualified higher education expenses, qualified "
    "first-time homebuyer distributions, or a qualified reservist distribution."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 52 OF A MULTI-SESSION REBUILD. This plan covers printed page 112: "
    "Schedule 2 lines 2, 4, 5, 6, and 8. It carries no document title by "
    "design — only tranche 1 does — so this file validates through merge-plans "
    "rather than standalone. No partial rebuild is delivered.",

    "NOTHING IS CARRIED IN OR OUT, checked both ways. The line 1y list "
    "completed on page 111 and this page opens with the TIP box that closes "
    "line 1y; the Exception paragraph completes here and page 113 opens at "
    "“Line 9 Household Employment Taxes”.",

    "THE LINK TEXT IS NOT THE LINK TARGET, and this page is the reason to keep "
    "reading annotation rects rather than constructing hrefs from prose. "
    "“IRS.gov/AMT” resolves to https://www.irs.gov/taxtopics/tc556.html — a "
    "Tax Topic page, not the address the text spells. Building the href from "
    "the visible text would have produced a plausible, wrong link that nothing "
    "downstream would flag. The elective-pay URL is split across FOUR "
    "annotation rects because the address breaks over four lines; all four "
    "carry the same target.",

    "THE HYPHENS IN THAT URL ARE REAL AND ARE KEPT. The address breaks at its "
    "own hyphens (“IRS.gov/Credits-” / “Deductions/Elective-Pay-and-” / "
    "“Transferability-Frequently-Asked-” / “Questions-Transferability.”), so "
    "the usual line-break-hyphen close would have silently deleted five "
    "characters from a URL. Checked against the annotation target, which "
    "matches the reassembled text exactly.",

    "“non-” IS A LINE-BREAK HYPHEN AND CLOSES TO “noncash”. It sits at the end "
    "of its line, and the source spells the same word unhyphenated one "
    "sentence later (“these noncash tips”), so closing it is right and keeping "
    "it would have invented a spelling the source does not use in the same "
    "paragraph.",

    "“net earning” IS SINGULAR IN THE SOURCE and is reproduced as printed. "
    "Line 4 reads “the tax due on net earning from self-employment”. The "
    "surrounding instructions all say “net earnings”, so this looks like a "
    "typo, but correcting it would be editing tax instructions — the same call "
    "made for line 24z in tranche 40 and the two Line 2 worksheet "
    "instructions in tranche 48.",

    "FIVE LINE HEADINGS MERGE NUMBER AND TITLE at level 4 (“Line 2. "
    "Alternative Minimum Tax (AMT)” and so on), siblings of tranche 51's "
    "“Lines 1a Through 1z. Additions to Tax”. “Exception” is level 5 under "
    "line 8, matching how tranche 28 placed the Exception under “Line 1. "
    "Taxable Refunds…”; it is set in its own face, distinct from the line "
    "headings, although on this page it is flush rather than indented. PAGE "
    "FURNITURE OMITTED: the printed page number. All ten contractions on the "
    "page are curly.",
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
