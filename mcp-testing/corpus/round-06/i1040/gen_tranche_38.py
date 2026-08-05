#!/usr/bin/env python3
"""Author tranche 38 of the i1040 rebuild: printed page 98 — the IRA Deduction
Worksheet part 2 (lines 7-12), then Schedule 1 line 21, Student Loan Interest
Deduction.

Usage: python gen_tranche_38.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-38-pages-98-98.json")

PAGE = 98
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


def listing(items, ordered=False):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


def worksheet(caption, lines):
    rows, cell_runs, any_runs = [], [], False
    for number, instruction, mine, theirs in lines:
        plain, runs = rich(instruction)
        rows.append([number, plain, mine, theirs])
        cell_runs.append([None, runs, None, None])
        if runs:
            any_runs = True
    block = {
        "type": "table", "caption": caption,
        "columns": ["Line", "Instruction", "Your IRA", "Spouse’s IRA"],
        "rows": rows, "row_headers": True, "source_page": PAGE,
    }
    if any_runs:
        block["cell_runs"] = cell_runs
    blocks.append(block)


heading("IRA Deduction Worksheet—Continued", 5)
worksheet(
    "IRA Deduction Worksheet for Schedule 1, line 20, part 2 of 2: lines 7 "
    "through 12, continued from the previous page. The last two columns are the "
    "entry spaces for your own IRA and your spouse's; they are blank in the "
    "printed form. Lines 8, 9 and 10 take a single figure covering both. The "
    "condition that sends married filers to Pub. 590-A is given inside line 10, "
    "the line it tests.",
    [
        ("7.",
         "Multiply lines 6a and 6b by the percentage below that applies to you. "
         "If the result isn’t a multiple of $10, increase it to the next "
         "multiple of $10 (for example, increase $490.30 to $500). If the "
         "result is $200 or more, enter the result. But if it is less than "
         "$200, enter $200. Single, head of household, or married filing "
         "separately, multiply by 70% (0.70) (or by 80% (0.80) in the column "
         "for the IRA of a person who is age 50 or older at the end of 2025). "
         "Married filing jointly or qualifying surviving spouse, multiply by "
         "35% (0.35) (or by 40% (0.40) in the column for the IRA of a person "
         "who is age 50 or older at the end of 2025); but if you checked “No” "
         "on either line 1a or 1b, then in the column for the IRA of the person "
         "who wasn’t covered by a retirement plan, multiply by 70% (0.70) (or "
         "by 80% (0.80) if age 50 or older at the end of 2025).",
         "", ""),

        ("8.",
         "Enter the total of your (and your spouse’s if filing jointly): wages, "
         "salaries, tips, etc. — generally, this is the amount reported in box "
         "1 of Form W-2, and exceptions are explained earlier in these "
         "instructions for line 20; alimony and separate maintenance payments "
         "reported on Schedule 1, line 2a; and nontaxable combat pay. This "
         "amount should be reported in box 12 of Form W-2 with code Q or "
         "reported on Form 1040, line 1i.",
         "", ""),

        ("9.",
         "Enter the earned income you (and your spouse if filing jointly) "
         "received as a self-employed individual or a partner. Generally, this "
         "is your (and your spouse’s if filing jointly) net earnings from "
         "self-employment if your personal services were a material "
         "income-producing factor, minus any deductions on Schedule 1, lines 15 "
         "and 16. If zero or less, enter -0-. For more details, see Pub. 590-A.",
         "", ""),

        ("10.",
         "Add lines 8 and 9. ‹Caution.› If married filing jointly and line 10 "
         "is less than $14,000 ($15,000 if one spouse is age 50 or older at the "
         "end of 2025; $16,000 if both spouses are age 50 or older at the end "
         "of 2025), «stop here» and use the worksheet in Pub. 590-A to figure "
         "your IRA deduction.",
         "", ""),

        ("11.",
         "Enter traditional IRA contributions made, or that will be made by the "
         "due date of your 2025 return not counting extensions (April 15, 2026, "
         "for most people), for 2025 to your IRA on line 11a and to your "
         "spouse’s IRA on line 11b.",
         "", ""),

        ("12.",
         "On line 12a, enter the ‹smallest› of line 7a, 10, or 11a. On line "
         "12b, enter the ‹smallest› of line 7b, 10, or 11b. This is the most "
         "you can deduct. Add the amounts on lines 12a and 12b and enter the "
         "total on Schedule 1, line 20. Or, if you want, you can deduct a "
         "smaller amount and treat the rest as a nondeductible contribution "
         "(see Form 8606).",
         "", ""),
    ],
)

heading("Line 21. Student Loan Interest Deduction", 4)
para("You can take this deduction only if all of the following apply.")
listing([
    "You paid interest in 2025 on a qualified student loan (defined later).",
    "Your filing status is any status except married filing separately.",
    "Your modified adjusted gross income (AGI) is less than $100,000 if single, "
    "head of household, or qualifying surviving spouse; $200,000 if married "
    "filing jointly. Use lines 2 through 4 of the worksheet in these "
    "instructions to figure your modified AGI.",
    "You, or your spouse if filing jointly, aren’t claimed as a dependent on "
    "someone else's (such as your parent’s) 2025 tax return.",
])
para(
    "Don’t include any amount paid from a distribution of earnings made from a "
    "qualified tuition program (QTP) after 2018 to the extent the earnings are "
    "treated as tax free because they were used to pay student loan interest."
)
para(
    "Use the worksheet in these instructions to figure your student loan "
    "interest deduction."
)

heading("Exception", 5)
para(
    "Use Pub. 970 instead of the worksheet in these instructions to figure your "
    "student loan interest deduction if you file Form 2555 or 4563, or you "
    "exclude income from sources within Puerto Rico."
)

heading("Qualified student loan", 5)
para(
    "A qualified student loan is any loan you took out to pay the qualified "
    "higher education expenses for any of the following individuals who were "
    "eligible students."
)
# This list runs from page 98 past the full-page Student Loan Interest
# Deduction Worksheet on page 99 and finishes below it. Authored whole here.
listing([
    "Yourself or your spouse.",
    "Any person who was your dependent when the loan was taken out.",
    "Any person you could have claimed as a dependent for the year the loan was "
    "taken out except that: a. The person filed a joint return; b. The person "
    "had gross income that was equal to or more than the exemption amount for "
    "that year or $5,200 for 2025; or c. You, or your spouse if filing jointly, "
    "could be claimed as a dependent on someone else’s return.",
], ordered=True)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 38 OF A MULTI-SESSION REBUILD. This plan covers printed page 98: "
    "the IRA Deduction Worksheet part 2 and Schedule 1 line 21. It carries no "
    "document title by design — only tranche 1 does — so this file validates "
    "through merge-plans rather than standalone. No partial rebuild is "
    "delivered.",

    "THE FOUR-COLUMN WORKSHEET SHAPE FROM TRANCHE 37 IS REUSED UNCHANGED. This "
    "is the second and final part of the same worksheet, split at the printed "
    "page boundary because every page must carry blocks for merge-plans to "
    "report it covered — the same reason the EIC and Tax Tables were split into "
    "twelve parts each. The caption names it part 2 of 2 and says which lines "
    "take one figure and which take two.",

    "THE CAUTION IS FOLDED INTO LINE 10, the line it tests. It is printed as an "
    "icon box between rows 10 and 11, and it is a condition on line 10's "
    "result: if the total is below a threshold, stop and use Pub. 590-A "
    "instead. Placing it between two table rows would leave a reader who "
    "navigates by row unable to reach it. Its emphasised “stop here” is set in "
    "the bold-italic face in the source and is kept as emphasis.",

    "LINE 7's TWO PERCENTAGE RULES AND LINE 8's THREE INCOME KINDS ARE INLINED. "
    "The source sets each as a bulleted list inside the worksheet cell; a list "
    "nested inside a table cell is not something the plan schema expresses, and "
    "tranche 30 settled the treatment — give them in printed order inside the "
    "line, so the choice a filer has to make survives.",

    "THE “QUALIFIED STUDENT LOAN” LIST SPANS FROM PAGE 98 PAST A FULL-PAGE "
    "WORKSHEET. Its item 1 is printed at the foot of this page; items 2 and 3, "
    "with sub-items a, b and c, appear below the Student Loan Interest "
    "Deduction Worksheet that fills the top of page 99. It is authored whole "
    "here, so the page-99 tranche must not re-author items 2 and 3 — run "
    "carried_block_check.cjs on page 99 against this tranche. THIRD block in "
    "the rebuild to jump a full-page insert, after tranches 29 and 33.",

    "THE a/b/c SUB-CONDITIONS KEEP THEIR PRINTED MARKERS INSIDE ITEM 3, as the "
    "Form 3520 thresholds did in tranche 33 and Chart C in tranche 3. The "
    "schema takes flat lists only and this is one level of nesting.",

    "BOLD SPANS TAKEN FROM THE FACE DATA: the line numbers, “smallest” (twice "
    "in line 12), “Exception.” and “Qualified student loan.” are all the bold "
    "face; “stop here” is the one bold-italic span. The two run-in leads are "
    "promoted to level-5 headings with the trailing period dropped.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed. PAGE "
    "FURNITURE OMITTED: the printed page number and the standing footer. Soft "
    "hyphens removed and line-break hyphens closed, while genuine compounds are "
    "kept (1040-SR, W-2, self-employed, income-producing, nondeductible).",
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
