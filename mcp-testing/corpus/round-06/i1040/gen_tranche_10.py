#!/usr/bin/env python3
"""Author tranche 10 of the i1040 rebuild: printed pages 34-37 — the standard
deduction (line 12e) and its worksheet and chart, the qualified business income
deduction, and line 16 Tax with the Foreign Earned Income Tax Worksheet.

Boundary in: tranche 9 authored page 33's final bullet whole (it completes at
the top of page 34), so this tranche starts at "Line 12e".

Boundary out: page 38 opens a new worksheet (Qualified Dividends and Capital
Gain Tax Worksheet), so this tranche ends with page 37.

Shapes are all established. Two are reused here:
  * the tranche-8 WORKSHEET (Line / Instruction / Amount, row headers, dot
    leaders dropped, entry column blank) for the two worksheets on pages 35
    and 37;
  * the tranche-3 MERGED-CELL TABLE flatten for the Standard Deduction Chart,
    where one filing status spans two to four "number of boxes" rows.

Usage: python gen_tranche_10.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-10-pages-34-37.json")

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


def table(caption, columns, rows, page, row_headers=False):
    block = {"type": "table", "caption": caption, "columns": columns, "rows": rows,
             "source_page": page}
    if row_headers:
        block["row_headers"] = True
    blocks.append(block)


def worksheet(caption, lines, page):
    table(caption, ["Line", "Instruction", "Amount"],
          [[n, text, ""] for n, text in lines], page, row_headers=True)


def line_heading(number, description, page, level=4):
    heading(f"Line {number}. {description}" if description else f"Line {number}", page, level)


# ── page 34 ──────────────────────────────────────────────────────────────────
line_heading("12e", "Standard Deduction or Itemized Deductions", 34)
callout(
    "Tip.",
    "If you are filing Form 1040-SR, you can find a Standard Deduction Chart on "
    "the last page of that form. Don’t file the Standard Deduction Chart with "
    "your return.",
    34,
)
para(
    "In most cases, your federal income tax will be less if you take the larger "
    "of your standard deduction or itemized deductions.",
    34,
)

heading("Standard Deduction", 34, 5)
para(
    "Most Form 1040 filers can find their standard deduction by looking at the "
    "amounts listed to the left of line 12e. Most Form 1040-SR filers can find "
    "their standard deduction by using the chart on the last page of "
    "Form 1040-SR.",
    34,
)
heading("Exception 1—Dependent. Line 12a", 34, 6)
para(
    "If you checked a box on line 12a, use the «Standard Deduction Worksheet "
    "for Dependents» to figure your standard deduction.",
    34,
)
callout(
    "Tip.",
    "Someone claims you or your spouse as a dependent if they list your or your "
    "spouse’s name and SSN in the Dependents section of their return.",
    34,
)
heading("Exception 2—Spouse itemizes on a separate return. Line 12b", 34, 6)
para(
    "If you checked the box on line 12b, your standard deduction is zero, even "
    "if you were born before January 2, 1961, or were blind.",
    34,
)
heading("Exception 3—Dual-status alien. Line 12c", 34, 6)
para(
    "If you checked the box on line 12c, your standard deduction is zero, even "
    "if you were born before January 2, 1961, or were blind.",
    34,
)
heading("Exception 4—Born before January 2, 1961, or blind. Line 12d", 34, 6)
para(
    "If you checked any box on line 12d, figure your standard deduction by "
    "using the «Standard Deduction Chart for People Who Were Born Before "
    "January 2, 1961, or Were Blind» if you are filing Form 1040 or by using "
    "the chart on the last page of Form 1040-SR.",
    34,
)
heading("Exception 5—Increased standard deduction for net qualified disaster loss", 34, 6)
para(
    "If you had a net qualified disaster loss and you elect to increase your "
    "standard deduction by the amount of your net qualified disaster loss, use "
    "Schedule A to figure your standard deduction. Qualified disaster loss "
    "refers to losses arising from certain disasters occurring in 2016 and "
    "subsequent years. See the Instructions for Form 4684 and Schedule A, "
    "line 16, for more information.",
    34,
)

heading("Itemized Deductions", 34, 5)
para("To figure your itemized deductions, fill in Schedule A.", 34)
callout(
    "Caution.",
    "If you made a section 962 election and are taking a deduction under "
    "section 250 with respect to any income inclusions under section 951A, "
    "don’t report the deduction on line 12e. Instead, report the tax with "
    "respect to a section 962 election on line 16 and include in the statement "
    "required by line 16 how you figured the section 250 deduction.",
    34,
)

line_heading("13a", "Qualified Business Income Deduction (Section 199A Deduction)", 34)
para(
    "To figure your Qualified Business Income Deduction, use Form 8995 or "
    "Form 8995-A as applicable. Use Form 8995 if:",
    34,
)
bullets(
    [
        "You have qualified business income, qualified REIT dividends, or "
        "qualified PTP income (loss);",
        "Your 2025 taxable income before the qualified business income "
        "deduction is less than or equal to $197,300 ($394,600 if married "
        "filing jointly); and",
        "You aren’t a patron in a specified agricultural or horticultural "
        "cooperative.",
    ],
    34,
)
para(
    "If you don’t meet these requirements, use Form 8995-A, Qualified "
    "Business Income Deduction. Attach whichever form you use (Form 8995 or "
    "8995-A) to your return. See the Instructions for Forms 8995 and 8995-A for "
    "more information for figuring and reporting your qualified business income "
    "deduction.",
    34,
)

line_heading("13b", "Additional Deductions From Schedule 1-A, Line 38", 34)
para(
    "If you are eligible to claim a deduction for no tax on tips, no tax on "
    "overtime, no tax on car loan interest, and/or the enhanced deduction for "
    "seniors, enter on line 13b the amount, if any, from Schedule 1-A, line 38. "
    "See Schedule 1-A and the instructions for Schedule 1-A for more "
    "information.",
    34,
)

line_heading("16", "Tax", 34)
para(
    "Include in the total on the entry space on line 16 all of the following "
    "taxes that apply.",
    34,
)
# Continues past the page-35 insert onto page 36; authored whole here.
bullets(
    [
        "Tax on your taxable income. Figure the tax using one of the methods "
        "described later.",
        "Tax from Form(s) 8814 (relating to the election to report child’s "
        "interest or dividends). Check the appropriate box.",
        "Tax from Form 4972 (relating to lump-sum distributions). Check the "
        "appropriate box.",
        "Tax with respect to a section 962 election (election made by a "
        "domestic shareholder of a controlled foreign corporation to be taxed at "
        "corporate rates) reduced by the amount of any foreign tax credits "
        "claimed on Form 1118. See section 962 for details. Check box 3 and "
        "enter the amount and “962” in the space next to that box. Attach "
        "a statement showing how you figured the tax.",
        "Recapture of an education credit. You may owe this tax if you claimed "
        "an education credit in an earlier year, and either tax-free educational "
        "assistance or a refund of qualified expenses was received in 2025 for "
        "the student. See Form 8863 and its instructions for more details. Check "
        "box 3 and enter the amount and “ECR” in the space next to that "
        "box.",
        "Any tax from Form 8621, line 16e, relating to a section 1291 fund. "
        "Check box 3 and enter the amount of the tax and “1291TAX” in the "
        "space next to that box.",
        "Tax from Form 8978, line 14 (relating to partner’s audit liability "
        "under section 6226). Check box 3 and enter the amount of the liability "
        "and “Form 8978” in the space next to that box. If the amount on "
        "Form 8978, line 14, is negative, see the instructions for Schedule 3, "
        "line 6l.",
        "Triggering event under section 965(i). If you had a triggering event "
        "under section 965(i) during the year and did not enter into a transfer "
        "agreement, check box 3 and enter the amount of the triggered deferred "
        "net 965 tax liability and enter “965INC” on the line next to that "
        "box.",
    ],
    34,
)

# ── page 35: worksheet + chart ───────────────────────────────────────────────
heading("Standard Deduction Worksheet for Dependents—Line 12e", 35, 4)
para("Keep for Your Records.", 35)
para(
    "Use this worksheet only if someone can claim you, or your spouse if filing "
    "jointly, as a dependent.",
    35,
)
worksheet(
    "Standard Deduction Worksheet for Dependents, line 12e: four numbered steps "
    "for figuring the standard deduction of someone who can be claimed as a "
    "dependent. The Amount column is where you write your figures; it is blank "
    "in the printed form.",
    [
        ("1.", "Check if: You were born before January 2, 1961. You are blind. "
               "Spouse was born before January 2, 1961. Spouse is blind. Total "
               "number of boxes checked"),
        ("2.", "Is your earned income* more than $900? Yes. Add $450 to your "
               "earned income. Enter the total. No. Enter $1,350."),
        ("3.", "Enter the amount shown below for your filing status. Single or "
               "married filing separately—$15,750. Married filing "
               "jointly—$31,500. Head of household—$23,625"),
        ("4a.", "Standard deduction. Enter the smaller of line 2 or line 3. If "
                "born after January 1, 1961, and not blind, stop here and enter "
                "this amount on Form 1040 or 1040-SR, line 12e. Otherwise, go to "
                "line 4b"),
        ("4b.", "If born before January 2, 1961, or blind, multiply the number "
                "on line 1 by $1,600 ($2,000 if single or head of household)"),
        ("4c.", "Add lines 4a and 4b. Enter the total here and on Form 1040 or "
                "1040-SR, line 12e"),
    ],
    35,
)
para(
    "* Earned income includes wages, salaries, tips, professional fees, and "
    "other compensation received for personal services you performed. It also "
    "includes any taxable scholarship or fellowship grant. Generally, your "
    "earned income is the total of the amount(s) you reported on Form 1040 or "
    "1040-SR, line 1z, and Schedule 1, lines 3, 6, 8r, 8t, and 8u minus the "
    "amount, if any, on Schedule 1, line 15.",
    35,
)

heading(
    "Standard Deduction Chart for People Who Were Born Before January 2, 1961, "
    "or Were Blind",
    35,
    4,
)
para(
    "Don’t use this chart if someone can claim you, or your spouse if filing "
    "jointly, as a dependent. Instead, use the worksheet above.",
    35,
)
para(
    "Count the boxes that apply and enter the total number: You were born "
    "before January 2, 1961. You are blind. Spouse was born before "
    "January 2, 1961. Spouse is blind.",
    35,
)
table(
    "Standard Deduction Chart for people born before January 2, 1961, or who "
    "were blind: the standard deduction by filing status and by the number of "
    "boxes checked above. The printed chart spans one filing status across "
    "several rows; here the status is repeated on each row.",
    [
        "IF your filing status is…",
        "AND the number in the box above is…",
        "THEN your standard deduction is…",
    ],
    [
        ["Single", "1", "$17,750"],
        ["Single", "2", "19,750"],
        ["Married filing jointly", "1", "$33,100"],
        ["Married filing jointly", "2", "34,700"],
        ["Married filing jointly", "3", "36,300"],
        ["Married filing jointly", "4", "37,900"],
        ["Qualifying surviving spouse", "1", "$33,100"],
        ["Qualifying surviving spouse", "2", "34,700"],
        ["Married filing separately*", "1", "$17,350"],
        ["Married filing separately*", "2", "18,950"],
        ["Married filing separately*", "3", "20,550"],
        ["Married filing separately*", "4", "22,150"],
        ["Head of household", "1", "$25,625"],
        ["Head of household", "2", "27,625"],
    ],
    35,
    row_headers=True,
)
para(
    "* You can check the boxes for spouse if your filing status is married "
    "filing separately and your spouse had no income, isn’t filing a return, "
    "and can’t be claimed as a dependent on another person’s return.",
    35,
)

# ── page 36 ──────────────────────────────────────────────────────────────────
heading("Do you want the IRS to figure the tax on your taxable income for you?", 36, 5)
bullets(
    [
        "‹Yes.› See chapter 13 of Pub. 17 for details, including who is "
        "eligible and what to do. If you have paid too much, we will send you a "
        "refund. If you didn’t pay enough, we will send you a bill.",
        "‹No.› Use one of the following methods to figure your tax.",
    ],
    36,
)
heading("Tax Table or Tax Computation Worksheet", 36, 6)
para(
    "If your taxable income is less than $100,000, you must use the «Tax "
    "Table», later in these instructions, to figure your tax. Be sure you use "
    "the correct column. If your taxable income is $100,000 or more, use the "
    "«Tax Computation Worksheet» right after the Tax Table. However, don’t "
    "use the Tax Table or Tax Computation Worksheet to figure your tax if any "
    "of the following applies.",
    36,
)
heading("Form 8615", 36, 6)
para(
    "Form 8615 must generally be used to figure the tax on your unearned income "
    "over $2,700 if you are under age 18, and in certain situations if you are "
    "older.",
    36,
)
para("You must file Form 8615 if you meet all of the following conditions.", 36)
bullets(
    [
        "You had more than $2,700 of unearned income (such as taxable interest, "
        "ordinary dividends, or capital gains (including capital gain "
        "distributions)).",
        "You are required to file a tax return.",
        "You were either: a. Under age 18 at the end of 2025, b. Age 18 at the "
        "end of 2025 and didn’t have earned income that was more than half of "
        "your support, or c. A full-time student at least age 19 but under "
        "age 24 at the end of 2025 and didn’t have earned income that was "
        "more than half of your support.",
        "At least one of your parents was alive at the end of 2025.",
        "You don’t file a joint return in 2025.",
    ],
    36,
    ordered=True,
)
para(
    "A child born on January 1, 2008, is considered to be age 18 at the end of "
    "2025; a child born on January 1, 2007, is considered to be age 19 at the "
    "end of 2025; and a child born on January 1, 2002, is considered to be "
    "age 24 at the end of 2025.",
    36,
)
heading("Schedule D Tax Worksheet", 36, 6)
para(
    "Use the «Schedule D Tax Worksheet» in the Instructions for Schedule D to "
    "figure the amount to enter on Form 1040 or 1040-SR, line 16, if:",
    36,
)
bullets(
    [
        "You have to file Schedule D, line 18 or 19 of Schedule D is more than "
        "zero, and lines 15 and 16 of Schedule D are gains; or",
        "You have to file Form 4952 and you have an amount on line 4g, even if "
        "you don’t need to file Schedule D.",
    ],
    36,
)
para(
    "But if you are filing Form 2555, you must use the «Foreign Earned Income "
    "Tax Worksheet» instead.",
    36,
)
heading("Qualified Dividends and Capital Gain Tax Worksheet", 36, 6)
para(
    "Use the «Qualified Dividends and Capital Gain Tax Worksheet», later, to "
    "figure your tax if you don’t have to use the Schedule D Tax Worksheet "
    "and if any of the following applies.",
    36,
)
bullets(
    [
        "You reported qualified dividends on Form 1040 or 1040-SR, line 3a.",
        "You don’t have to file Schedule D and you reported capital gain "
        "distributions on Form 1040 or 1040-SR, line 7a.",
        "You are filing Schedule D, and Schedule D, lines 15 and 16, are both "
        "more than zero.",
    ],
    36,
)
para(
    "But if you are filing Form 2555, you must use the «Foreign Earned Income "
    "Tax Worksheet» instead.",
    36,
)
heading("Schedule J", 36, 6)
para(
    "If you had income from farming or fishing, your tax may be less if you "
    "choose to figure it using income averaging on Schedule J.",
    36,
)
heading("Foreign Earned Income Tax Worksheet", 36, 6)
para(
    "If you claimed the foreign earned income exclusion, housing exclusion, or "
    "housing deduction on Form 2555, you must figure your tax using the "
    "«Foreign Earned Income Tax Worksheet».",
    36,
)

# ── page 37: the Foreign Earned Income Tax Worksheet ─────────────────────────
heading("Foreign Earned Income Tax Worksheet—Line 16", 37, 4)
para("Keep for Your Records.", 37)
callout(
    "Caution.",
    "If Form 1040 or 1040-SR, line 15, is zero, don’t complete this "
    "worksheet.",
    37,
)
worksheet(
    "Foreign Earned Income Tax Worksheet, line 16: six numbered steps for "
    "figuring the tax when the foreign earned income exclusion, housing "
    "exclusion, or housing deduction was claimed on Form 2555. The Amount "
    "column is where you write your figures; it is blank in the printed form.",
    [
        ("1.", "Enter the amount from Form 1040 or 1040-SR, line 15"),
        ("2a.", "Enter the amount from your (and your spouse’s if filing "
                "jointly) Form 2555, lines 45 and 50"),
        ("2b.", "Enter the total amount of any itemized deductions or "
                "exclusions you couldn’t claim because they are related to "
                "excluded income"),
        ("2c.", "Subtract line 2b from line 2a. If zero or less, enter -0-"),
        ("3.", "Add lines 1 and 2c"),
        ("4.", "Figure the tax on the amount on line 3. Use the Tax Table, Tax "
               "Computation Worksheet, Qualified Dividends and Capital Gain Tax "
               "Worksheet*, Schedule D Tax Worksheet*, or Form 8615, whichever "
               "applies. See the instructions for Form 1040 or 1040-SR, line 16, "
               "to see which tax computation method applies. (Don’t use a "
               "second Foreign Earned Income Tax Worksheet to figure the tax on "
               "this line.)"),
        ("5.", "Figure the tax on the amount on line 2c. If the amount on "
               "line 2c is less than $100,000, use the Tax Table to figure this "
               "tax. If the amount on line 2c is $100,000 or more, use the Tax "
               "Computation Worksheet"),
        ("6.", "Subtract line 5 from line 4. Enter the result. If zero or less, "
               "enter -0-. Also include this amount on the entry space on "
               "Form 1040 or 1040-SR, line 16"),
    ],
    37,
)
para(
    "* Enter the amount from line 3 above on line 1 of the Qualified Dividends "
    "and Capital Gain Tax Worksheet or Schedule D Tax Worksheet if you use "
    "either of those worksheets to figure the tax on line 4 above. Complete the "
    "rest of that worksheet through line 4 (line 10 if you use the Schedule D "
    "Tax Worksheet). Next, you must determine if you have a capital gain "
    "excess. To find out if you have a capital gain excess, subtract Form 1040 "
    "or 1040-SR, line 15, from line 4 of your Qualified Dividends and Capital "
    "Gain Tax Worksheet (line 10 of your Schedule D Tax Worksheet). If the "
    "result is more than zero, that amount is your capital gain excess.",
    37,
)
para(
    "If you don’t have a capital gain excess, complete the rest of either of "
    "those worksheets according to the worksheet’s instructions. Then, "
    "complete lines 5 and 6 above.",
    37,
)
para(
    "If you have a capital gain excess, complete a second Qualified Dividends "
    "and Capital Gain Tax Worksheet or Schedule D Tax Worksheet (whichever "
    "applies) as instructed above but in its entirety and with the following "
    "additional modifications. Then, complete lines 5 and 6 above. These "
    "modifications are to be made only for purposes of filling out the Foreign "
    "Earned Income Tax Worksheet above.",
    37,
)
bullets(
    [
        "Reduce (but not below zero) the amount you would otherwise enter on "
        "line 3 of your Qualified Dividends and Capital Gain Tax Worksheet or "
        "line 9 of your Schedule D Tax Worksheet by your capital gain excess.",
        "Reduce (but not below zero) the amount you would otherwise enter on "
        "line 2 of your Qualified Dividends and Capital Gain Tax Worksheet or "
        "line 6 of your Schedule D Tax Worksheet by any of your capital gain "
        "excess not used in (1) above.",
        "Reduce (but not below zero) the amount on your Schedule D, line 18, by "
        "your capital gain excess.",
        "Include your capital gain excess as a loss on line 16 of your "
        "Unrecaptured Section 1250 Gain Worksheet in the Instructions for "
        "Schedule D.",
    ],
    37,
    ordered=True,
)

review_notes = [
    "TRANCHE 10 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "34-37 — the standard deduction and its worksheet and chart, the "
    "qualified business income deduction, and line 16 Tax with the Foreign "
    "Earned Income Tax Worksheet. It carries no document title by design: only "
    "tranche 1 does, so this file validates through merge-plans rather than "
    "standalone. No partial rebuild is delivered.",
    "BOUNDARY IN. Tranche 9 authored page 33’s final bullet whole because it "
    "completes at the top of page 34, so this tranche starts at “Line "
    "12e”. BOUNDARY OUT: page 38 opens the Qualified Dividends and Capital "
    "Gain Tax Worksheet, a new block, so this tranche ends with page 37 and "
    "nothing spans that edge.",
    "NO NEW SHAPES WERE NEEDED. Both worksheets reuse the tranche-8 shape "
    "(Line / Instruction / Amount, row headers on, dot leaders dropped, entry "
    "column blank) and the Standard Deduction Chart reuses the tranche-3 "
    "merged-cell flatten. Sub-numbered worksheet lines (4a/4b/4c on page 35, "
    "2a/2b/2c on page 37) are their own ROWS rather than being folded, because "
    "the source numbers them as separate entry lines and later lines reference "
    "them individually.",
    "THE STANDARD DEDUCTION CHART IS FLATTENED. In print one filing status "
    "spans two to four “number of boxes” rows. It is flattened to "
    "fourteen rows with the status repeated, as Chart A was in tranche 3, and "
    "cell values are kept exactly as printed including the continuation amounts "
    "that omit the dollar sign (“19,750” under “$17,750”).",
    "THE CHART’S CHECKBOX BLOCK BECAME A SENTENCE. Above the chart the source "
    "prints four checkboxes and an arrow leading to a “total number of "
    "boxes checked” blank. The checkboxes and arrow are paper-form "
    "furniture; their four labels are kept as a sentence so the reader still "
    "knows what to count, and the blank is not reproduced.",
    "LINE 16’S LIST SPANS THE PAGE-35 INSERT. The bulleted list of taxes to "
    "include begins on page 34 and finishes on page 36, because the worksheet "
    "and chart occupy all of page 35. It is authored whole at page 34, so the "
    "merged reading order runs 34 → 35 (insert) → 36, which is the printed "
    "order.",
    "THE FIVE STANDARD-DEDUCTION EXCEPTIONS ARE HEADINGS AT LEVEL 6, since "
    "they sit inside the level-5 “Standard Deduction” topic. Each keeps "
    "its printed line reference in the heading text (“Exception "
    "1—Dependent. Line 12a”) because that is how the form directs a "
    "reader to them.",
    "“Do you want the IRS to figure the tax…?” KEEPS ITS BRANCHES AS A "
    "LIST, with strong Yes/No labels — the same two-branch shape used for "
    "the flowchart questions in tranche 5, since that is what it is.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked. This span is dense "
    "with references to worksheets that live in later tranches (Tax Table, Tax "
    "Computation Worksheet, Schedule D Tax Worksheet, Qualified Dividends and "
    "Capital Gain Tax Worksheet, Foreign Earned Income Tax Worksheet); none is "
    "turned into a link, since the source carries no link annotations here and "
    "the destinations are not yet authored.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (tax-free, full-time, "
    "dual-status, 1040-SR, 8995-A, section 965(i)). PAGE FURNITURE OMITTED: "
    "printed page numbers, the standing “Need more information or "
    "forms?” footer, and the invisible “Fileid: … MUST be removed "
    "before printing” production lines.",
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
