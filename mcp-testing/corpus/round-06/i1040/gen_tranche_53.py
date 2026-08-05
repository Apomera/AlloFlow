#!/usr/bin/env python3
"""Author tranche 53 of the i1040 rebuild: printed page 113 — Schedule 2 lines
9 through 16 and the opening of lines 17a through 17z.

Usage: python gen_tranche_53.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-53-pages-113-113.json")

PAGE = 113
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


heading("Line 9. Household Employment Taxes", 4)
para(
    "Enter the household employment taxes you owe for having a household "
    "employee. If any of the following apply, see Schedule H and its "
    "instructions to find out if you owe these taxes."
)
listing([
    "You paid any one household employee (defined below) cash wages of $2,800 "
    "or more in 2025. Cash wages include wages paid by check, money order, "
    "etc. But don’t count amounts paid to an employee who was under age 18 at "
    "any time in 2025 and was a student.",
    "You withheld federal income tax during 2025 at the request of any "
    "household employee.",
    "You paid total cash wages of $1,000 or more in any calendar quarter of "
    "2024 or 2025 to household employees.",
], ordered=True)
para(
    "Any person who does household work is a household employee if you can "
    "control what will be done and how it will be done. Household work "
    "includes work done in or around your home by babysitters, nannies, health "
    "aides, housekeepers, yard workers, and similar domestic workers."
)

heading("Line 10. Reserved for Future Use", 4)
para("Line 10 has been reserved for future use.")

heading("Line 11. Additional Medicare Tax", 4)
para(
    "See Form 8959 and its instructions if the total of your 2025 wages and "
    "any self-employment income was more than:"
)
listing([
    "$125,000 if married filing separately;",
    "$250,000 if married filing jointly; or",
    "$200,000 if single, head of household, or qualifying surviving spouse.",
], ordered=False)
para(
    "Also see Form 8959 if you had railroad retirement (RRTA) compensation "
    "that was more than the amount just listed that applies to you."
)
para(
    "If you are married filing jointly and either you or your spouse had wages "
    "or RRTA compensation of more than $200,000, your employer may have "
    "withheld Additional Medicare Tax even if you don’t owe the tax. In that "
    "case, you may be able to get a refund of the tax withheld. See the "
    "Instructions for Form 8959 to find out how to report the withheld tax on "
    "Form 8959."
)

heading("Line 12. Net Investment Income Tax", 4)
para(
    "See Form 8960 and its instructions if the amount on Form 1040, 1040-SR, "
    "or 1040-NR, line 11b, is more than:"
)
listing([
    "$125,000 if married filing separately,",
    "$250,000 if married filing jointly or qualifying surviving spouse, or",
    "$200,000 if single or head of household.",
], ordered=False)
para(
    "If you file Form 2555, see Form 8960 and its instructions if the amount "
    "on Form 1040, 1040-SR, or 1040-NR, line 11b, is more than:"
)
listing([
    "$0 if married filing separately,",
    "$120,000 if married filing jointly or qualifying surviving spouse, or",
    "$70,000 if single or head of household.",
], ordered=False)

# Line 13 is the odd one out: the source gives it a 12pt "Line 13" but NO
# display title line. Its title is a bold RUN-IN that leads the paragraph, in
# the same face as the "Line 17a."-"Line 17g." run-ins below. Merged into the
# heading anyway, because it is the line's name and a heading list of a bare
# "Line 13" tells a reader nothing. Sentence case is the source's own.
heading(
    "Line 13. Uncollected social security and Medicare or RRTA tax on tips or "
    "group-term life insurance",
    4,
)
para(
    "This tax should be shown in box 12 of Form W-2 with codes A and B or M "
    "and N."
)

heading(
    "Line 14. Interest on Tax Due on Installment Income From the Sale of "
    "Certain Residential Lots and Timeshares",
    4,
)
para(
    "Enter interest on tax due on installment income from the sale of certain "
    "residential lots and timeshares under section 453(l)(3)."
)

heading(
    "Line 15. Interest on the Deferred Tax on Gain From Certain Installment "
    "Sales With a Sales Price Over $150,000",
    4,
)
para(
    "Enter interest on the deferred tax on gain from certain installment sales "
    "with a sales price over $150,000 under section 453A(c)."
)

heading("Line 16. Recapture of Low-Income Housing Credit", 4)
para("Enter the amount from Form 8611, line 14.")

heading("Lines 17a Through 17z. Other Additional Taxes", 4)

heading("Line 17a", 5)
para("Recapture of the following credits.")
listing([
    "Amounts from Form 4255, column (j), lines 1b, 1j, 1l, and 1m. Identify as "
    "“3468.”",
    "Non-EPE recapture applied against tax from Form 3468, Part IV, reported "
    "on Form 4255, line 1d, column (j). Identify as “NEPE3468.”",
    "New markets credit (see Form 8874). Identify as “NMCR.”",
    "Credit for employer-provided childcare facilities (see Form 8882). "
    "Identify as “ECCFR.”",
    "Any section 6418(g)(3) amounts attributable to recapture from Form 4255, "
    "column (m)(3). Identify as “6418(g)(3).”",
], ordered=True)

heading("Line 17b", 5)
para(
    "If you sold your home in 2025 and it was financed (in whole or in part) "
    "from the proceeds of any tax-exempt qualified mortgage bond or you "
    "claimed the mortgage interest credit, you may owe a recapture tax on the "
    "mortgage subsidy. See Form 8828."
)

heading("Line 17c", 5)
para(
    "Enter any additional tax on health savings account (HSA) distributions "
    "you received from Form 8889, line 17b. See Form 8889, Part II."
)

heading("Line 17d", 5)
para(
    "Enter any additional tax for failure to remain an eligible individual "
    "during the testing period from Form 8889, line 21. See Form 8889, Part "
    "III."
)

heading("Line 17e", 5)
para(
    "Enter any additional tax on Archer MSA distributions from Form 8853, line "
    "9b. See Form 8853."
)

heading("Line 17f", 5)
para(
    "Enter any additional tax on Medicare Advantage MSA distributions from "
    "Form 8853, line 13b. See Form 8853."
)

# Spans the 113-114 break: begins in this page's last column and finishes at
# the top of page 114. Authored whole here; tranche 54 must not repeat it.
heading("Line 17g", 5)
para(
    "Enter any additional tax on recapture of a charitable contribution "
    "deduction relating to a fractional interest in tangible personal "
    "property. See Pub. 526 for more information."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 53 OF A MULTI-SESSION REBUILD. This plan covers printed page 113: "
    "Schedule 2 lines 9 through 16 and the opening of lines 17a through 17z. "
    "It carries no document title by design — only tranche 1 does — so this "
    "file validates through merge-plans rather than standalone. No partial "
    "rebuild is delivered.",

    "NOTHING IS CARRIED IN. ONE BLOCK IS CARRIED OUT: line 17g's instruction "
    "begins in this page's last column and finishes at the top of page 114 "
    "(“…tangible personal property. See Pub. 526 for more information.”). It "
    "is authored whole here and **tranche 54 must open at “Line 17h”**.",

    "LINE 13 IS SET DIFFERENTLY FROM EVERY OTHER LINE ON THE PAGE and is "
    "merged anyway. Lines 9-16 each get a 12pt number over a 10pt DISPLAY "
    "title in face g_d0_f3. Line 13 gets the 12pt number but no display title: "
    "its name is a bold RUN-IN in face g_d0_f4 — the same face as the “Line "
    "17a.”–“Line 17g.” run-ins — leading straight into the paragraph. It is "
    "still the line's name, and a heading list containing a bare “Line 13” "
    "would tell a reader nothing, so it is merged like the others. The "
    "sentence case (“Uncollected social security and…”, against Title Case "
    "everywhere else) is the source's own and is kept.",

    "THE LINE 17x HEADINGS ARE BARE LINE NUMBERS. “Line 17a.” through “Line "
    "17g.” are run-ins with no title: the text following each is body face, "
    "checked rather than assumed — “Recapture of the following credits.” after "
    "“Line 17a.” is g_d0_f1, not part of the run-in. Same shape as lines 24f "
    "through 24z in tranche 40. They are level 5 under “Lines 17a Through 17z. "
    "Other Additional Taxes”, which merges its own number-and-title pair the "
    "way tranche 51 merged “Lines 1a Through 1z. Additions to Tax”.",

    "TEXT RESUMING AFTER A BULLET LIST IS NOT RE-INDENTED ON THIS PAGE, so "
    "indentation cannot mark those paragraph breaks and they were taken from "
    "sense instead. Lines 11 and 12 both do it: “Also see Form 8959 if you had "
    "railroad retirement…” and “If you file Form 2555, see Form 8960…” each "
    "start flush at the column left yet plainly begin new paragraphs — the "
    "second introduces a whole second bullet list. Worth noting because every "
    "other paragraph break in this rebuild has been read off a 12pt first-line "
    "indent.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed; the "
    "references to Schedule H and Forms 8959, 8960, 2555, 8611, 4255, 3468, "
    "8874, 8882, 8828, 8889, and 8853 are all plain text. Both contractions "
    "are curly. PAGE FURNITURE OMITTED: the printed page number. Soft hyphens "
    "removed and line-break hyphens closed, while genuine compounds are kept "
    "(1040-SR, 1040-NR, W-2, Non-EPE, group-term, tax-exempt, Low-Income, "
    "employer-provided, self-employment, 6418(g)(3), 453(l)(3), 453A(c)).",
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
