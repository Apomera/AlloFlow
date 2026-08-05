#!/usr/bin/env python3
"""Author tranche 51 of the i1040 rebuild: printed page 111 — the opening of the
Instructions for Schedule 2, Additional Taxes: General Instructions and the
lines 1a through 1y additions to tax.

Usage: python gen_tranche_51.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-51-pages-111-111.json")

PAGE = 111
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


def listing(items, ordered):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


heading("Instructions for Schedule 2: Additional Taxes", 2)

heading("General Instructions", 3)
para(
    "Use Schedule 2 if you have additional taxes that can’t be entered "
    "directly on Form 1040, 1040-SR, or 1040-NR."
)
para(
    "Include the amount on Schedule 2, line 3, in the total on Form 1040, "
    "1040-SR, or 1040-NR, line 17."
)
para(
    "Enter the amount on Schedule 2, line 21, on Form 1040 or 1040-SR, line "
    "23; or 1040-NR, line 23b."
)

heading("Specific Instructions", 3)
# "Lines 1a Through 1z" (12pt) over "Additions to Tax" (10pt) is the same
# number-line/title-line pair the source sets on page 88 as "Line 1" (14pt)
# over "Taxable Refunds, Credits, or Offsets..." (12pt), which tranche 28
# merged into one heading. Merged the same way here.
heading("Lines 1a Through 1z. Additions to Tax", 4)

heading("Line 1a. Excess advance premium tax credit repayment", 5)
para(
    "The premium tax credit helps pay premiums for health insurance purchased "
    "from the Marketplace. Eligible individuals may have advance payments of "
    "the premium tax credit paid on their behalf directly to the insurance "
    "company. If you, your spouse with whom you are filing a joint return, or "
    "your dependent was enrolled in coverage purchased from the Marketplace "
    "and advance payments of the premium tax credit were made for the "
    "coverage, complete Form 8962 to reconcile (compare) the advance payments "
    "with your premium tax credit. You (or whoever enrolled you) should have "
    "received Form 1095-A from the Marketplace with information about your "
    "coverage and any advance credit payments. If the advance credit payments "
    "were more than the premium tax credit you can claim, the amount you must "
    "repay will be shown on Form 8962, line 29. Enter that amount, if any, on "
    "line 1a."
)
para(
    "You may have to repay excess advance payments of the premium tax credit "
    "even if someone else enrolled you, your spouse, or your dependent in "
    "Marketplace coverage. In that case, another individual may have received "
    "the Form 1095-A for the coverage. You may also have to repay excess "
    "advance payments of the premium tax credit if you enrolled an individual "
    "in coverage through the Marketplace, you don’t claim the individual as a "
    "dependent on your return, and no one else claims that individual as a "
    "dependent. For more information, see the Instructions for Form 8962."
)

heading(
    "Line 1b. Repayment of new clean vehicle credit(s) from Schedule A "
    "(Form 8936), Part II",
    5,
)
para(
    "If you purchased a new clean vehicle from a registered dealer and reduced "
    "the amount you paid at the time of sale by transferring the credit to the "
    "dealer, you may have to repay the amount of the credit you transferred if "
    "you no longer qualify. If you completed Schedule A (Form 8936), Part II, "
    "and you:"
)
listing([
    "Checked the “Yes” box on Part II, line 8a or 8d; and",
    "Checked the “Yes” box on Part I, line 4a;",
], ordered=False)
# The sentence introduced above resumes after the list. Kept as its own block
# rather than folded back into the intro: the two conditions are a real
# conjunction and flattening them would lose the "and" structure a filer has
# to satisfy. See the review notes.
para("then, enter the amount from Part I, line 4a, on Schedule 2, line 1b.")
para(
    "If you completed more than one Schedule A (Form 8936), Part II, and you "
    "need to report an amount from more than one Schedule A (Form 8936), Part "
    "II, enter the total of those amounts on line 1b."
)

heading(
    "Line 1c. Repayment of previously owned clean vehicle credit(s) from "
    "Schedule A (Form 8936), Part IV",
    5,
)
para(
    "If you purchased a previously owned clean vehicle from a registered "
    "dealer and reduced the amount you paid at the time of sale by "
    "transferring the credit to the dealer, you may have to repay the amount "
    "of the credit you transferred if you no longer qualify. If you completed "
    "Schedule A (Form 8936), Part IV, and you:"
)
listing([
    "Checked the “Yes” box on Part IV, line 13a or 13c; and",
    "Checked the “Yes” box on Part I, line 4a;",
], ordered=False)
para("then, enter the amount from Part I, line 4a, on Schedule 2, line 1c.")
para(
    "If you completed more than one Schedule A (Form 8936), Part IV, and you "
    "need to report an amount from more than one Schedule A (Form 8936), Part "
    "IV, enter the total of those amounts on line 1c."
)

heading("Line 1d. Recapture of net EPE", 5)
para(
    "Enter any amount of net elective payment election (EPE) recapture from "
    "Form 4255, line 2a, column (l)."
)

heading("Line 1e. Excessive payments (EPs) on gross EPE from Form 4255", 5)
para(
    "If you reported an amount on Form 4255, column (n)(1), on line 1a, 1c, "
    "1d, and/or 2a, check the applicable box and enter the amount on line 1e. "
    "If you checked more than one box, enter the total amount on line 1e."
)

heading("Line 1f. 20% EP from Form 4255", 5)
para(
    "If you reported an amount on Form 4255, column (n)(3), line 1a, 1c, 1d, "
    "and/or 2a, check the applicable box and enter the amount on line 1f. If "
    "you checked more than one box, enter the total on line 1f."
)

heading("Line 1y. Other additions to tax", 5)
para("Enter the following additions to tax.")
listing([
    "Recapture of the alternative fuel vehicle refueling property credit (see "
    "Form 8911). Identify as “ARPCR.”",
    "Any EPE related to the credit applied against tax from Form 8933 reported "
    "on Form 4255, line 2a, column (k). Identify as “EPE8933.”",
    "Recapture of any non-EPE credit from Form 8933 reported on Form 4255, "
    "line 2a, column (j). Also, any section 6418(g)(3) amounts attributable to "
    "recapture from Form 8933 reported on Form 4255, line 2a, column (m)(3). "
    "Identify as “NEPE8933.”",
    "Any amount that was reported on Form 4255, column (n)(2), line 1a, 1c, "
    "1d, and/or 2a. Identify as “EPGEPE.”",
    "Any section 6418(g)(2) excessive credit transfer amount reported on Form "
    "4255, column (m)(1) and (m)(2). Identify as “6418(g)(2).”",
], ordered=True)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 51 OF A MULTI-SESSION REBUILD. This plan covers printed page 111, "
    "the opening of the Instructions for Schedule 2, Additional Taxes. It "
    "carries no document title by design — only tranche 1 does — so this file "
    "validates through merge-plans rather than standalone. No partial rebuild "
    "is delivered.",

    "NOTHING IS CARRIED IN OR OUT, checked in both directions. Page 110 ends "
    "on a completed “Valid SSN” paragraph and this page opens a new schedule; "
    "the line 1y list completes here at item 5 and page 112 opens with a TIP "
    "box. The first tranche since 40 that needs no handoff either way.",

    "THE SCHEDULE'S SUBTITLE IS FOLDED INTO ITS HEADING — “Instructions for "
    "Schedule 2: Additional Taxes” — as for Schedule 1 in tranche 28 and "
    "Schedule 1-A in tranche 41. The table of contents lists only the first "
    "half.",

    "“Lines 1a Through 1z” AND “Additions to Tax” ARE MERGED INTO ONE HEADING. "
    "The source sets them as a size cascade under “Specific Instructions” "
    "(16pt): the range at 12pt, the title at 10pt. That is the same "
    "number-line-over-title-line pair it sets on page 88 — “Line 1” at 14pt "
    "over “Taxable Refunds, Credits, or Offsets of State and Local Income "
    "Taxes” at 12pt — which tranche 28 merged into a single level-4 heading. "
    "Merged the same way, giving 2 → 3 → 4 → 5 with no skips. Checked against "
    "page 88's geometry rather than assumed from the wording.",

    "ALL THIRTEEN LINE RUN-INS SHARE ONE FACE AND ARE ALL FLUSH, measured with "
    "runin_levels.cjs: this page has ONE run-in level, not the two that pages "
    "102, 104, 107, 109, and 110 carry. They are level 5, children of “Lines "
    "1a Through 1z. Additions to Tax”, and each merges its line number with "
    "its printed title as “Line NN. Title” with the trailing period dropped.",

    "THE CONDITION LISTS UNDER LINES 1b AND 1c INTERRUPT THEIR SENTENCES, and "
    "the sentence is allowed to resume in its own block (“then, enter the "
    "amount from Part I, line 4a, on Schedule 2, line 1b.”). The alternative "
    "was folding the two conditions into the parent sentence, as method 5 was "
    "handled in tranche 47. It is the wrong call here: those two conditions "
    "are joined by “and” and BOTH must hold, so flattening them into prose "
    "would bury a conjunction a filer has to satisfy. Tranche 47's fold was "
    "forced by an ordered list whose numbering the prose referenced; nothing "
    "here is numbered.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed — the "
    "references to Forms 8962, 8936, 4255, 8911, and 8933 are all plain text "
    "in the source. Both contractions on the page are curly. PAGE FURNITURE "
    "OMITTED: the printed page number. Soft hyphens removed and line-break "
    "hyphens closed, while genuine compounds are kept (1040-SR, 1040-NR, "
    "1095-A, non-EPE, 6418(g)(2), (m)(1), (n)(3)).",
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
