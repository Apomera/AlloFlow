#!/usr/bin/env python3
"""Author tranche 8 of the i1040 rebuild: printed pages 27-29 — the IRA
distribution exceptions, pensions and annuities, and the document's first
fill-in WORKSHEET.

THE WORKSHEET SHAPE, decided here and meant to be reused for every later
worksheet in this document:

  A worksheet is authored as a TABLE with columns Line / Instruction / Amount.
  * The line NUMBER is a real column, not list numbering, because the
    instructions reference it constantly ("Subtract line 6 from line 2"). With
    row_headers set, each row announces its own line number.
  * The Amount column is intentionally EMPTY. It is where the reader writes,
    and a blank cell says that honestly; inventing a placeholder would put
    content in the document that the IRS did not print.
  * The printed dot leaders (". . . . .") are dropped. They exist to lead the
    eye across to the entry box and carry no meaning in a linear reading.
  * Material the source nests INSIDE a numbered line — the Note under line 2,
    the Yes/No branches under line 10 — is folded into that line's instruction
    cell, since a table cell cannot hold a sub-block.

Scope: pages 27-29. Page 28's closing paragraph continues past the worksheet
insert onto page 30 ("...enter “PSO” and the amount excluded on the line
next to line 1h."); it is authored whole here at page 28, so tranche 9 must
start at "Payments when you are disabled" and NOT re-author it.

Usage: python gen_tranche_08.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-08-pages-27-29.json")

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
    block = {
        "type": "table",
        "caption": caption,
        "columns": columns,
        "rows": rows,
        "source_page": page,
    }
    if row_headers:
        block["row_headers"] = True
    blocks.append(block)


def worksheet(caption, lines, page):
    """A fill-in worksheet: Line / Instruction / Amount, entry column blank."""
    table(caption, ["Line", "Instruction", "Amount"],
          [[number, instruction, ""] for number, instruction in lines], page, row_headers=True)


# ── page 27 ──────────────────────────────────────────────────────────────────
para(
    "If the distribution from your IRA is fully taxable, enter the total "
    "distribution on line 4b; don’t make an entry on line 4a.",
    27,
)
callout(
    "Tip.",
    "Attach Form(s) 1099-R to Form 1040 or 1040-SR if any federal income tax "
    "was withheld.",
    27,
)
callout(
    "Tip.",
    "For purposes of the following Exceptions, Roth IRA includes a Roth SIMPLE "
    "IRA.",
    27,
)

heading("Exception 1", 27, 5)
para(
    "Enter the total distribution on line 4a if you rolled over part or all of "
    "the distribution from one:",
    27,
)
bullets(
    [
        "Roth IRA to another Roth IRA, or",
        "IRA (other than a Roth IRA) to a qualified plan or another IRA (other "
        "than a Roth IRA).",
    ],
    27,
)
para(
    "Also check box 1 on line 4c. If the total distribution was rolled over, "
    "enter -0- on line 4b. If the total distribution wasn’t rolled over, "
    "enter the part not rolled over on line 4b unless «Exception 2» applies to "
    "the part not rolled over. Generally, a rollover must be made within "
    "60 days after the day you received the distribution. For more details on "
    "rollovers, see Pub. 590-A and Pub. 590-B. If you rolled over the "
    "distribution into a qualified plan or you made the rollover in 2026, "
    "include a statement explaining what you did.",
    27,
)

heading("Exception 2", 27, 5)
para(
    "If any of the following apply, enter the total distribution on line 4a and "
    "see Form 8606 and its instructions to figure the amount to enter on "
    "line 4b.",
    27,
)
bullets(
    [
        "You received a distribution from an IRA (other than a Roth IRA) and "
        "you made nondeductible contributions to any of your traditional IRAs "
        "for 2025 or an earlier year. If you made nondeductible contributions to "
        "these IRAs for 2025, also see Pub. 590-A and Pub. 590-B.",
        "You received a distribution from a Roth IRA. But if either (a) or (b) "
        "below applies, enter -0- on line 4b; you don’t have to see Form 8606 "
        "or its instructions. a. Distribution code T is shown in box 7 of "
        "Form 1099-R and you made a contribution (including a conversion) to a "
        "Roth IRA for 2020 or an earlier year. b. Distribution code Q is shown "
        "in box 7 of Form 1099-R.",
        "You converted part or all of a traditional IRA or traditional SIMPLE "
        "IRA to a Roth IRA in 2025.",
        "You had a 2024 or 2025 IRA contribution returned to you, with the "
        "related earnings or less any loss, by the due date (including "
        "extensions) of your tax return for that year.",
        "You made excess contributions to your IRA for an earlier year and had "
        "them returned to you in 2025.",
        "You recharacterized part or all of a contribution to a Roth IRA as a "
        "contribution to a traditional IRA, or vice versa.",
    ],
    27,
    ordered=True,
)

heading("Exception 3", 27, 5)
para(
    "If all or part of the distribution is a qualified charitable distribution "
    "(QCD), enter the total distribution on line 4a. If the total amount "
    "distributed is a QCD, enter -0- on line 4b. If only part of the "
    "distribution is a QCD, enter the part that is not a QCD on line 4b unless "
    "«Exception 2» applies to that part. Check box 2 on line 4c.",
    27,
)
para(
    "A QCD is a distribution made directly by the trustee of your IRA (other "
    "than an ongoing SEP or SIMPLE IRA) to an organization eligible to receive "
    "tax-deductible contributions (with certain exceptions). You must have been "
    "at least age 70 1/2 when the distribution was made. Generally, your total "
    "QCDs for the year can’t be more than $108,000. This includes any amount "
    "(up to $54,000) of a one-time QCD to a split-interest entity (SIE). If you "
    "file a joint return, the same rules apply to your spouse. The amount of "
    "the QCD is limited to the amount that would otherwise be included in your "
    "income. If your IRA includes nondeductible contributions, the distribution "
    "is first considered to be paid out of otherwise taxable income. If you "
    "make the one-time QCD to an SIE, you must attach a statement to your "
    "return. See Pub. 590-B for details on QCDs, including the information you "
    "must include on the attachment for QCDs to an SIE.",
    27,
)
callout(
    "Caution.",
    "You can’t claim a charitable contribution deduction for any QCD not "
    "included in your income.",
    27,
)

heading("Exception 4", 27, 5)
para(
    "If all or part of the distribution is a health savings account (HSA) "
    "funding distribution (HFD), enter the total distribution on line 4a. If "
    "the total amount distributed is an HFD and you elect to exclude it from "
    "income, enter -0- on line 4b. If only part of the distribution is an HFD "
    "and you elect to exclude that part from income, enter the part that "
    "isn’t an HFD on line 4b unless «Exception 2» applies to that part. Check "
    "box 3 on line 4c and enter “HFD” in the entry space next to box 3.",
    27,
)
para(
    "An HFD is a distribution made directly by the trustee of your IRA (other "
    "than an ongoing SEP or SIMPLE IRA) to your HSA. If eligible, you can "
    "generally elect to exclude an HFD from your income once in your lifetime. "
    "You can’t exclude more than the limit on HSA contributions or more than "
    "the amount that would otherwise be included in your income. If your IRA "
    "includes nondeductible contributions, the HFD is first considered to be "
    "paid out of otherwise taxable income. See Pub. 969 for details.",
    27,
)
callout(
    "Caution.",
    "The amount of an HFD reduces the amount you can contribute to your HSA for "
    "the year. If you fail to maintain eligibility for an HSA for the 12 months "
    "following the month of the HFD, you may have to report the HFD as income "
    "and pay an additional tax. See Form 8889, Part III.",
    27,
)

heading("More than one distribution", 27, 5)
para(
    "If you (or your spouse if filing jointly) received more than one "
    "distribution, figure the taxable amount of each distribution and enter the "
    "total of the taxable amounts on line 4b. Enter the total amount of those "
    "distributions on line 4a.",
    27,
)
callout(
    "Tip.",
    "You must start receiving at least a minimum amount from your traditional "
    "IRA by April 1 of the year following the year you reach age 73. If you "
    "don’t receive the minimum distribution amount, you may have to pay an "
    "additional tax on the amount that should have been distributed. For "
    "details, including how to figure the minimum required distribution, see "
    "Pub. 590-B.",
    27,
)
callout(
    "Caution.",
    "You may have to pay an additional tax if you received an early "
    "distribution from your IRA and the total wasn’t rolled over. See the "
    "instructions for Schedule 2, line 8, for details.",
    27,
)

# ── page 28 ──────────────────────────────────────────────────────────────────
heading("More information", 28, 5)
para(
    "For more information about IRAs, see Pub. 590-A and Pub. 590-B.",
    28,
)

heading("Line 4c", 28, 4)
para(
    "If «Exception 1» applies to you, check box 1 on line 4c. If «Exception 3» "
    "applies to you, check box 2 on line 4c. If «Exception 4» applies to you, "
    "check box 3 on line 4c and enter “HFD” in the entry space next to "
    "box 3.",
    28,
)
para(
    "If another publication or instruction tells you to write a word or code "
    "next to line 4b, check box 3 on line 4c and enter that word or code on the "
    "entry space next to box 3.",
    28,
)
para(
    "If more than one exception applies, check a box for each exception and "
    "include a statement showing the amount of each exception, for example, "
    "“Line 4b – $1,000 Rollover and $500 HFD.” You don’t need to "
    "attach a statement if only «Exception 2» and one other exception apply.",
    28,
)

heading("Lines 5a, 5b, and 5c", 28, 4)
heading("Lines 5a and 5b. Pensions and Annuities", 28, 5)
para(
    "You should receive a Form 1099-R showing the total amount of your pension "
    "and annuity payments before income tax or other deductions were withheld. "
    "This amount should be shown in box 1 of Form 1099-R. Pension and annuity "
    "payments include distributions from 401(k), 403(b), and governmental "
    "457(b) plans. Rollovers and lump-sum distributions are explained later.",
    28,
)
para(
    "Don’t include the following payments on lines 5a and 5b. Instead, report "
    "them on line 1h.",
    28,
)
bullets(
    [
        "Disability pensions received before you reach the minimum retirement "
        "age set by your employer.",
        "Corrective distributions (including any earnings) of excess elective "
        "deferrals or other excess contributions to retirement plans. The plan "
        "must advise you of the year(s) the distributions are includible in "
        "income.",
    ],
    28,
)
callout(
    "Tip.",
    "Attach Form(s) 1099-R to Form 1040 or 1040-SR if any federal income tax "
    "was withheld.",
    28,
)

heading("Fully Taxable Pensions and Annuities", 28, 5)
para(
    "Your payments are fully taxable if (a) you didn’t contribute to the cost "
    "(see «Cost», later) of your pension or annuity, or (b) you got your entire "
    "cost back tax free before 2025. But see «Insurance Premiums for Retired "
    "Public Safety Officers», later. If your pension or annuity is fully "
    "taxable, enter the total pension or annuity payments (from Form(s) 1099-R, "
    "box 1) on line 5b; don’t make an entry on line 5a.",
    28,
)
para(
    "Fully taxable pensions and annuities also include military retirement pay "
    "shown on Form 1099-R. For details on military disability pensions, see "
    "Pub. 525. If you received a Form RRB-1099-R, see Pub. 575 to find out how "
    "to report your benefits.",
    28,
)

heading("Partially Taxable Pensions and Annuities", 28, 5)
para(
    "Enter the total pension or annuity payments (from Form 1099-R, box 1) on "
    "line 5a. If your Form 1099-R doesn’t show the taxable amount, you must "
    "use the General Rule explained in Pub. 939 to figure the taxable part to "
    "enter on line 5b. But if your annuity starting date (defined later) was "
    "after July 1, 1986, see «Simplified Method», later, to find out if you "
    "must use that method to figure the taxable part.",
    28,
)
para(
    "You can ask the IRS to figure the taxable part for you for a $1,000 fee. "
    "For details, see Pub. 939.",
    28,
)
para(
    "If your Form 1099-R shows a taxable amount, you can report that amount on "
    "line 5b. But you may be able to report a lower taxable amount by using the "
    "General Rule or the Simplified Method or if the exclusion for retired "
    "public safety officers, discussed next, applies.",
    28,
)

heading("Insurance Premiums for Retired Public Safety Officers", 28, 5)
para(
    "If you are an eligible retired public safety officer (law enforcement "
    "officer, firefighter, chaplain, or member of a rescue squad or ambulance "
    "crew who is retired because of disability or because you reached normal "
    "retirement age), you can elect to exclude from income distributions made "
    "from your eligible retirement plan that are used to pay the premiums for "
    "coverage by an accident or health plan or a long-term care insurance "
    "contract. The premiums can be for coverage for you, your spouse, or "
    "dependents. The distribution must be from the plan maintained by the "
    "employer from which you retired as a public safety officer. The "
    "distribution can be made directly from the plan to the provider of the "
    "accident or health plan or long-term care insurance contract, or the "
    "distribution can be made to you to pay to the provider of the accident or "
    "health plan or long-term care insurance contract. You can exclude from "
    "income the smaller of the amount of the premiums paid or $3,000. You can "
    "make this election only for amounts that would otherwise be included in "
    "your income. The amount excluded from your income can’t be used to claim "
    "a medical expense deduction.",
    28,
)
para(
    "An eligible retirement plan is a governmental plan that is a qualified "
    "trust or a section 403(a), 403(b), or 457(b) plan.",
    28,
)
callout(
    "Caution.",
    "You can exclude from income only the smaller of the amount of the premiums "
    "paid or $3,000. This is true if the distribution was made directly from "
    "the plan to the provider of the accident or health plan or long-term care "
    "insurance contract or if the distribution was made to you and you paid the "
    "provider of the accident or health plan or long-term care insurance "
    "contract.",
    28,
)
para(
    "If you received a distribution from your eligible retirement plan, and you "
    "used part of that distribution to pay premiums for an accident or health "
    "plan or long-term care insurance contract, you can still exclude from "
    "income only the smaller of the amount of the premiums paid or $3,000. The "
    "rest of the distribution is taxable to you and must be reported on "
    "line 5b.",
    28,
)
para(
    "If you make this election, reduce the otherwise taxable amount of your "
    "pension or annuity by the amount excluded. The amount shown in box 2a of "
    "Form 1099-R doesn’t reflect the exclusion. Report your total "
    "distributions on line 5a and the taxable amount on line 5b. Also check "
    "box 2 on line 5c.",
    28,
)
# Continues past the page-29 worksheet insert onto page 30; authored whole here.
para(
    "If you are retired on disability and reporting your disability pension on "
    "line 1h, include only the taxable amount on that line and enter "
    "“PSO” and the amount excluded on the line next to line 1h.",
    28,
)

# ── page 29: the worksheet ───────────────────────────────────────────────────
heading("Simplified Method Worksheet—Lines 5a and 5b", 29, 4)
para("Keep for Your Records.", 29)
callout(
    "Before you begin.",
    "If you are the beneficiary of a deceased employee or former employee who "
    "died before August 21, 1996, include any death benefit exclusion that you "
    "are entitled to (up to $5,000) in the amount entered on line 2 below.",
    29,
)
para(
    "‹More than one pension or annuity.› If you had more than one partially "
    "taxable pension or annuity, figure the taxable part of each separately. "
    "Enter the total of the taxable parts on Form 1040 or 1040-SR, line 5b. "
    "Enter the total pension or annuity payments received in 2025 on Form 1040 "
    "or 1040-SR, line 5a.",
    29,
)
worksheet(
    "Simplified Method Worksheet for lines 5a and 5b: eleven numbered steps "
    "for figuring the taxable part of a partially taxable pension or annuity. "
    "The Amount column is where you write your figures; it is blank in the "
    "printed form.",
    [
        ("1.", "Enter the total pension or annuity payments from Form 1099-R, "
               "box 1. Also, enter this amount on Form 1040 or 1040-SR, line 5a"),
        ("2.", "Enter your cost in the plan at the annuity starting date. "
               "Note. If you completed this worksheet last year, skip line 3 and "
               "enter the amount from line 4 of last year’s worksheet on "
               "line 4 below (even if the amount of your pension or annuity has "
               "changed). Otherwise, go to line 3."),
        ("3.", "Enter the appropriate number from Table 1 below. But if your "
               "annuity starting date was after 1997 and the payments are for "
               "your life and that of your beneficiary, enter the appropriate "
               "number from Table 2 below"),
        ("4.", "Divide line 2 by the number on line 3"),
        ("5.", "Multiply line 4 by the number of months for which this "
               "year’s payments were made. If your annuity starting date was "
               "before 1987, skip lines 6 and 7 and enter this amount on line 8. "
               "Otherwise, go to line 6"),
        ("6.", "Enter the amount, if any, recovered tax free in years after "
               "1986. If you completed this worksheet last year, enter the "
               "amount from line 10 of last year’s worksheet"),
        ("7.", "Subtract line 6 from line 2"),
        ("8.", "Enter the smaller of line 5 or line 7"),
        ("9.", "Taxable amount. Subtract line 8 from line 1. Enter the result, "
               "but not less than zero. Also, enter this amount on Form 1040 or "
               "1040-SR, line 5b. If your Form 1099-R shows a larger amount, use "
               "the amount on this line instead of the amount from Form 1099-R. "
               "If you are a retired public safety officer, see Insurance "
               "Premiums for Retired Public Safety Officers before entering an "
               "amount on line 5b"),
        ("10.", "Was your annuity starting date before 1987? Yes. STOP. Do not "
                "complete the rest of this worksheet. No. Add lines 6 and 8. "
                "This is the amount you have recovered tax free through 2025. "
                "You will need this number if you need to fill out this "
                "worksheet next year"),
        ("11.", "Balance of cost to be recovered. Subtract line 10 from line 2. "
                "If zero, you won’t have to complete this worksheet next "
                "year. The payments you receive next year will generally be "
                "fully taxable"),
    ],
    29,
)
table(
    "Table 1 for Line 3 Above: number to enter on line 3, by age at the annuity "
    "starting date and whether that date was before November 19, 1996, or after "
    "November 18, 1996",
    [
        "IF the age at annuity starting date was…",
        "AND your annuity starting date was before November 19, 1996, enter on line 3…",
        "AND your annuity starting date was after November 18, 1996, enter on line 3…",
    ],
    [
        ["55 or under", "300", "360"],
        ["56–60", "260", "310"],
        ["61–65", "240", "260"],
        ["66–70", "170", "210"],
        ["71 or older", "120", "160"],
    ],
    29,
    row_headers=True,
)
table(
    "Table 2 for Line 3 Above: number to enter on line 3, by the combined ages "
    "at the annuity starting date",
    [
        "IF the combined ages at annuity starting date were…",
        "THEN enter on line 3…",
    ],
    [
        ["110 or under", "410"],
        ["111–120", "360"],
        ["121–130", "310"],
        ["131–140", "260"],
        ["141 or older", "210"],
    ],
    29,
    row_headers=True,
)

review_notes = [
    "TRANCHE 8 OF A MULTI-SESSION REBUILD. This plan covers printed pages 27-29 "
    "— the IRA distribution exceptions, pensions and annuities, and the "
    "document’s first fill-in worksheet. It carries no document title by "
    "design: only tranche 1 does, so this file validates through merge-plans "
    "rather than standalone. No partial rebuild is delivered.",
    "WORKSHEET SHAPE, DECIDED HERE FOR REUSE. A worksheet is authored as a "
    "TABLE with columns Line / Instruction / Amount and row headers on. The "
    "line NUMBER is a real column rather than list numbering, because the "
    "instructions reference it constantly (“Subtract line 6 from line "
    "2”) and a row header makes each row announce which line it is. Later "
    "worksheets in this document should follow the same shape.",
    "THE AMOUNT COLUMN IS DELIBERATELY EMPTY. It is where the reader writes "
    "their figures, and a blank cell says that honestly. Putting a placeholder "
    "there would add content the IRS did not print, and this rebuild does not "
    "add content to a tax document.",
    "DOT LEADERS DROPPED. Each printed worksheet line ends in a row of dots "
    "leading the eye across to the entry box, and repeats the line number just "
    "before it. Both are visual aids for filling in a paper form; the leaders "
    "are dropped and the number appears once, in the Line column.",
    "MATERIAL NESTED INSIDE A LINE IS FOLDED INTO THAT LINE. A table cell "
    "cannot hold a sub-block, so the “Note.” the source prints under "
    "line 2, and the Yes/No branches with their STOP badge under line 10, are "
    "folded into those lines’ instruction cells. Nothing is reordered, and "
    "STOP is kept because it is that branch’s whole meaning.",
    "THE TWO REFERENCE TABLES KEEP THEIR OWN HEADERS. Table 1 prints a spanning "
    "header (“AND your annuity starting date was—”) above two "
    "date-range columns. A flat header row cannot span, so each of those two "
    "column headers is written out in full (“AND your annuity starting "
    "date was before November 19, 1996, enter on line 3…”), which is what "
    "a screen reader needs to announce with each cell. Captions likewise say "
    "what the table holds, since the printed titles (“Table 1 for Line 3 "
    "Above”) do not.",
    "PAGE 28’S LAST PARAGRAPH SPANS THE WORKSHEET INSERT. It begins on "
    "page 28 and finishes at the top of page 30, because the worksheet occupies "
    "all of page 29. It is authored whole here at page 28, so tranche 9 must "
    "start at “Payments when you are disabled” and NOT re-author it.",
    "EXCEPTION HEADINGS. “Exception 1” through “Exception 4” "
    "under lines 4a and 4b are printed as bold run-ins and are cross-referenced "
    "by number throughout the section (“unless Exception 2 applies”), so "
    "each is a level-5 heading and each cross-reference to one is marked as "
    "emphasis, matching the source’s italics.",
    "TIP AND CAUTION CALLOUTS as established in tranche 3, and the "
    "worksheet’s “Before you begin” box is authored the same way — "
    "its label is real text and its checkmark glyph is dropped as decoration.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (long-term, tax-deductible, "
    "one-time, split-interest, lump-sum, 1099-R, 590-A, 403(b), 70 1/2). PAGE "
    "FURNITURE OMITTED: printed page numbers, the standing “Need more "
    "information or forms?” footer, and the invisible “Fileid: … "
    "MUST be removed before printing” production lines.",
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
