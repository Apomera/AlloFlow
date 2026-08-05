#!/usr/bin/env python3
"""Author tranche 11 of the i1040 rebuild: printed pages 38-39 — the Qualified
Dividends and Capital Gain Tax Worksheet, the child tax credit (line 19), and
the start of Payments (lines 25-26).

Boundary out: page 40 opens "Lines 27a, 27b, and 27c—Earned Income Credit
(EIC)", the longest and most structurally involved section left in the
document. It gets its own session rather than being started at the tail of
this one. Nothing spans the 39/40 edge — page 39 ends on a complete sentence.

Shapes are all established; the page-38 worksheet reuses the tranche-8 shape.
The one thing worth noting is how its "Enter:" lines are handled — see the
review notes.

Usage: python gen_tranche_11.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-11-pages-38-39.json")

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


def worksheet(caption, lines, page):
    blocks.append({
        "type": "table",
        "caption": caption,
        "columns": ["Line", "Instruction", "Amount"],
        "rows": [[n, text, ""] for n, text in lines],
        "row_headers": True,
        "source_page": page,
    })


def line_heading(number, description, page, level=4):
    heading(f"Line {number}. {description}" if description else f"Line {number}", page, level)


# ── page 38: Qualified Dividends and Capital Gain Tax Worksheet ──────────────
heading("Qualified Dividends and Capital Gain Tax Worksheet—Line 16", 38, 4)
para("Keep for Your Records.", 38)
callout(
    "Before you begin.",
    "See the earlier instructions for line 16 to see if you can use this "
    "worksheet to figure your tax. Before completing this worksheet, complete "
    "Form 1040 or 1040-SR through line 15. If you don’t have to file "
    "Schedule D and you received capital gain distributions, be sure you "
    "checked the box on Form 1040 or 1040-SR, line 7b.",
    38,
)
worksheet(
    "Qualified Dividends and Capital Gain Tax Worksheet, line 16: twenty-five "
    "numbered steps for figuring tax when qualified dividends or capital gains "
    "are taxed at the lower rates. The Amount column is where you write your "
    "figures; it is blank in the printed form.",
    [
        ("1.", "Enter the amount from Form 1040 or 1040-SR, line 15. However, "
               "if you are filing Form 2555 (relating to foreign earned income), "
               "enter the amount from line 3 of the Foreign Earned Income Tax "
               "Worksheet"),
        ("2.", "Enter the amount from Form 1040 or 1040-SR, line 3a*"),
        ("3.", "Are you filing Schedule D?* Yes. Enter the smaller of line 15 "
               "or line 16 of Schedule D. If either line 15 or line 16 is blank "
               "or a loss, enter -0-. No. Enter the amount from Form 1040 or "
               "1040-SR, line 7a."),
        ("4.", "Add lines 2 and 3"),
        ("5.", "Subtract line 4 from line 1. If zero or less, enter -0-"),
        ("6.", "Enter: $48,350 if single or married filing separately, $96,700 "
               "if married filing jointly or qualifying surviving spouse, "
               "$64,750 if head of household."),
        ("7.", "Enter the smaller of line 1 or line 6"),
        ("8.", "Enter the smaller of line 5 or line 7"),
        ("9.", "Subtract line 8 from line 7. This amount is taxed at 0%"),
        ("10.", "Enter the smaller of line 1 or line 4"),
        ("11.", "Enter the amount from line 9"),
        ("12.", "Subtract line 11 from line 10"),
        ("13.", "Enter: $533,400 if single, $300,000 if married filing "
                "separately, $600,050 if married filing jointly or qualifying "
                "surviving spouse, $566,700 if head of household."),
        ("14.", "Enter the smaller of line 1 or line 13"),
        ("15.", "Add lines 5 and 9"),
        ("16.", "Subtract line 15 from line 14. If zero or less, enter -0-"),
        ("17.", "Enter the smaller of line 12 or line 16"),
        ("18.", "Multiply line 17 by 15% (0.15)"),
        ("19.", "Add lines 9 and 17"),
        ("20.", "Subtract line 19 from line 10"),
        ("21.", "Multiply line 20 by 20% (0.20)"),
        ("22.", "Figure the tax on the amount on line 5. If the amount on "
                "line 5 is less than $100,000, use the Tax Table to figure the "
                "tax. If the amount on line 5 is $100,000 or more, use the Tax "
                "Computation Worksheet"),
        ("23.", "Add lines 18, 21, and 22"),
        ("24.", "Figure the tax on the amount on line 1. If the amount on "
                "line 1 is less than $100,000, use the Tax Table to figure the "
                "tax. If the amount on line 1 is $100,000 or more, use the Tax "
                "Computation Worksheet"),
        ("25.", "Tax on all taxable income. Enter the smaller of line 23 or "
                "line 24. Also include this amount on the entry space on "
                "Form 1040 or 1040-SR, line 16. If you are filing Form 2555, "
                "don’t enter this amount on the entry space on Form 1040 or "
                "1040-SR, line 16. Instead, enter it on line 4 of the Foreign "
                "Earned Income Tax Worksheet"),
    ],
    38,
)
para(
    "* If you are filing Form 2555, see the footnote in the «Foreign Earned "
    "Income Tax Worksheet» before completing this line.",
    38,
)

# ── page 39 ──────────────────────────────────────────────────────────────────
line_heading("19", "Child Tax Credit and Credit for Other Dependents", 39)
callout(
    "Caution.",
    "To claim the child tax credit, you must have a valid SSN, which means it "
    "must be valid for employment and issued before the due date of your return "
    "(including extensions). If you are filing a joint return, only one spouse "
    "is required to have a valid SSN to be eligible for the CTC and ACTC. The "
    "other spouse must have either an SSN or ITIN, and it must have been issued "
    "on or before the due date of the return. To claim the credit for other "
    "dependents, you, and your spouse if married filing a joint return, must "
    "have either an SSN or ITIN issued on or before the due date of your 2025 "
    "return (including extensions).",
    39,
)
para(
    "See Schedule 8812 and its instructions for information on figuring and "
    "claiming any child tax credit and credit for other dependents that you may "
    "qualify to claim.",
    39,
)
heading("Form 8862, who must file", 39, 5)
para(
    "You must file Form 8862 to claim the child tax credit or credit for other "
    "dependents if your child tax credit (refundable or nonrefundable depending "
    "on the tax year), additional child tax credit, or credit for other "
    "dependents for a year after 2015 was denied or reduced for any reason "
    "other than a math or clerical error. Attach a completed Form 8862 to your "
    "2025 return to claim the credit for 2025. Don’t file Form 8862 if you "
    "filed Form 8862 for 2024, and the child tax credit, additional child tax "
    "credit, or credit for other dependents was allowed for that year. See "
    "Form 8862 and its instructions for details.",
    39,
)
callout(
    "Caution.",
    "If you claim the child tax credit or credit for other dependents even "
    "though you aren’t eligible and it is determined that your error is due "
    "to reckless or intentional disregard of the rules for these credits, you "
    "won’t be allowed to take either credit or the additional child tax "
    "credit for 2 years even if you’re otherwise eligible to do so. If you "
    "claim the child tax credit or credit for other dependents even though you "
    "aren’t eligible and it is later determined that you fraudulently claimed "
    "either credit, you won’t be allowed to take either credit or the "
    "additional child tax credit for 10 years. You may also have to pay "
    "penalties.",
    39,
)
callout(
    "Caution.",
    "If your qualifying child didn’t have an SSN valid for employment issued "
    "before the due date of your 2025 return (including extensions), you "
    "can’t claim the child tax credit for that child on your original or "
    "amended return. However, you may be able to claim the credit for other "
    "dependents for that child.",
    39,
)

heading("Payments", 39, 3)
line_heading("25", "Federal Income Tax Withheld", 39)
heading("Line 25a—Form(s) W-2", 39, 5)
para(
    "Add the amounts shown as federal income tax withheld on your "
    "Form(s) W-2. Enter the total on line 25a. The amount withheld should be "
    "shown in box 2 of Form W-2. Attach your Form(s) W-2 to your return.",
    39,
)
heading("Line 25b—Form(s) 1099", 39, 5)
para(
    "Include on line 25b any federal income tax withheld on your "
    "Form(s) 1099-R. The amount withheld should be shown in box 4. Attach your "
    "Form(s) 1099-R to the front of your return if federal income tax was "
    "withheld.",
    39,
)
para(
    "If you received a 2025 Form 1099 showing federal income tax withheld on "
    "dividends, taxable or tax-exempt interest income, unemployment "
    "compensation, social security benefits, railroad retirement benefits, or "
    "other income you received, include the amount withheld in the total on "
    "line 25b. This should be shown in box 4 of Form 1099, box 6, of "
    "Form SSA-1099, or box 10 of Form RRB-1099.",
    39,
)
heading("Line 25c—Other Forms", 39, 5)
para("Include on line 25c any", 39)
bullets(
    [
        "Federal income tax withheld on your Form(s) W-2G. The amount withheld "
        "should be shown in box 4. Attach Form(s) W-2G to the front of your "
        "return if federal income tax was withheld.",
        "Additional Medicare Tax you had withheld. Include the amount shown on "
        "Form 8959, line 24, in the total on line 25c. Attach Form 8959.",
        "Federal income tax withheld that is shown on a Schedule K-1.",
        "Tax withheld that is shown on Form 1042-S, Form 8805, or "
        "Form 8288-A. To assist in processing, attach the form to your return "
        "to claim a credit for the withholding.",
    ],
    39,
)

line_heading("26", "2025 Estimated Tax Payments", 39)
para(
    "Enter any estimated federal income tax payments you made for 2025. Include "
    "any overpayment that you applied to your 2025 estimated tax from your 2024 "
    "return or an amended return.",
    39,
)
para(
    "If you and your spouse paid joint estimated tax but are now filing "
    "separate income tax returns, you can divide the amount paid in any way you "
    "choose as long as you both agree. If you can’t agree, you must divide "
    "the payments in proportion to each spouse’s individual tax as shown on "
    "your separate returns for 2025. For more information, see Pub. 505. Be "
    "sure to show both SSNs in the space provided on the separate returns. If "
    "you or your spouse paid separate estimated tax but you are now filing a "
    "joint return, add the amounts you each paid. Follow these instructions "
    "even if your spouse died in 2025 or in 2026 before filing a 2025 return.",
    39,
)
heading("Divorced taxpayers", 39, 5)
para(
    "If you got divorced in 2025 and you made joint estimated tax payments with "
    "your former spouse, enter your former spouse’s SSN in the space provided "
    "on line 26. If you were divorced and remarried in 2025, enter your present "
    "spouse’s SSN in the space provided on the front of Form 1040 or 1040-SR.",
    39,
)
heading("Name change", 39, 5)
para(
    "If you changed your name and you made estimated tax payments using your "
    "former name, attach a statement to the front of Form 1040 or 1040-SR that "
    "explains all the payments you and your spouse made in 2025 and the name(s) "
    "and SSN(s) under which you made them.",
    39,
)

review_notes = [
    "TRANCHE 11 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "38-39 — the Qualified Dividends and Capital Gain Tax Worksheet, the "
    "child tax credit (line 19), and the start of Payments (lines 25-26). It "
    "carries no document title by design: only tranche 1 does, so this file "
    "validates through merge-plans rather than standalone. No partial rebuild "
    "is delivered.",
    "BOUNDARY OUT. Page 40 opens “Lines 27a, 27b, and 27c—Earned Income "
    "Credit (EIC)”, the longest and most structurally involved section left "
    "in the document. It is given its own session rather than being started at "
    "the tail of this one. Nothing spans the 39/40 edge: page 39 ends on a "
    "complete sentence, so there is no handoff note this time.",
    "THE WORKSHEET REUSES THE TRANCHE-8 SHAPE — Line / Instruction / Amount, "
    "row headers on, dot leaders dropped, entry column blank. At 25 lines it is "
    "the longest worksheet so far and needed no adjustment to the shape.",
    "THE “ENTER:” LINES KEEP THEIR OPTIONS INLINE. Worksheet lines 6 and 13 "
    "print a list of filing-status amounts stacked beside a single entry box "
    "($48,350 if single…, $96,700 if married filing jointly…, and so on). "
    "There is one entry for the line, not one per status, so the options stay "
    "inside that line’s instruction cell rather than becoming separate rows. "
    "This is the same reasoning that made 4a/4b/4c SEPARATE rows in tranche 10: "
    "rows follow the printed ENTRY lines, not the printed layout.",
    "LINE 3’S BRANCHES ARE FOLDED, as the shape prescribes — the Yes/No pair "
    "under worksheet line 3 goes into that line’s instruction cell, since a "
    "table cell cannot hold a sub-block.",
    "THE THREE CAUTIONS ON PAGE 39 ARE KEPT SEPARATE. The source prints three "
    "consecutive caution callouts under line 19; the second one runs across a "
    "column break in the middle of a sentence (“fraudulently claimed "
    "ei-/ther credit”). They are authored as three blocks, matching the "
    "source, rather than merged into one.",
    "SUB-LINE HEADINGS KEEP THEIR PRINTED FORM. Lines 25a, 25b and 25c print "
    "as “Line 25a—Form(s) W-2” with an em dash rather than the "
    "“Line 1a. Description” pattern used elsewhere. The printed form is "
    "kept, since that is how the form itself labels them.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked. Pages 38 and 39 "
    "carry no link annotations at all.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (tax-exempt, "
    "nonrefundable, 1040-SR, SSA-1099, RRB-1099, W-2G, 8288-A, Form 1042-S). "
    "PAGE FURNITURE OMITTED: printed page numbers, the standing “Need more "
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
