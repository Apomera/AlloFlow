#!/usr/bin/env python3
"""Author tranche 56 of the i1040 rebuild: printed page 116 — the Saver's Credit
exclusions, Schedule 3 line 5 (residential energy credits), lines 6a through
6z with the Negative Form 8978 Adjustment Worksheet, and the opening of line 9.

Usage: python gen_tranche_56.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-56-pages-116-116.json")

PAGE = 116
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

TAX_TOPIC_610 = "https://www.irs.gov/taxtopics/tc610.html"
WORKSHEET = "Negative Form 8978 Adjustment Worksheet—Schedule 3 (Line 6l)"

blocks = []


def rich(text):
    """«…» emphasis, ‹…› strong, [[text|url]] link, [[«text»|url]] italic link."""
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


def table(caption, columns, rows_markup):
    """Table whose CELLS may carry inline markup, expanded into cell_runs.

    Needed here because worksheet line 3 folds a Yes/No branch into one cell and
    the source prints no period after the Yes branch. Folding the labels as
    plain text would read "...on line 6l No. Enter..." as a run-on; carrying the
    source's own bold on "Yes."/"No." separates them without inventing
    punctuation.
    """
    rows, cell_runs = [], []
    for row in rows_markup:
        plain_row, runs_row = [], []
        for cell in row:
            plain, runs = rich(cell)
            plain_row.append(plain)
            # NULL, not [], for a cell with no inline markup. The validator
            # accepts null per cell and rejects an empty array outright — and
            # an EMPTY cell could not carry runs anyway, since a run's text has
            # minLength 1. Caught by merge-plans on the first attempt here.
            runs_row.append(runs)
        rows.append(plain_row)
        cell_runs.append(runs_row)
    block = {
        "type": "table", "caption": caption, "columns": columns, "rows": rows,
        "row_headers": True, "source_page": PAGE,
    }
    if any(any(r is not None for r in row) for row in cell_runs):
        block["cell_runs"] = cell_runs
    blocks.append(block)


# Opens with the numbered list that tranche 55's Line 4 paragraph introduces
# ("However, you can't take the credit if either of the following applies.").
# The list is printed wholly on this page.
listing([
    "The amount on Form 1040, 1040-SR, or 1040-NR, line 11b, is more than "
    "$39,500 ($59,250 if head of household; $79,000 if married filing jointly).",
    "The person(s) who made the qualified contribution or elective deferral "
    "(a) was born after January 1, 2008, (b) is claimed as a dependent on "
    "someone else’s 2025 tax return, or (c) was a student (defined next).",
], ordered=True)
para("You were a student if during any part of 5 calendar months of 2025, you:")
listing([
    "Were enrolled as a full-time student at a school; or",
    "Took a full-time, on-farm training course given by a school or a state, "
    "county, or local government agency.",
], ordered=False)
para(
    "A school includes a technical, trade, or mechanical school. It doesn’t "
    "include an on-the-job training course, correspondence school, or school "
    "offering courses only through the Internet."
)
para(
    f"For more details, use [[«Tax Topic 610»|{TAX_TOPIC_610}]] or see Form 8880."
)

heading("Line 5. Residential Energy Credits", 4)

heading("Line 5a—residential clean energy credit", 5)
para(
    "If you made energy saving improvements to one or more homes that you used "
    "as a residence during 2025, you may be able to take the residential clean "
    "energy credit. For more information, see Form 5695 and its instructions."
)

heading("Line 5b—energy efficient home improvement credit", 5)
para(
    "If you made qualified energy efficiency improvements to your main home "
    "located in the United States in 2025, you may be able to take the energy "
    "efficient home improvement credit. For more information, see Form 5695 "
    "and its instructions."
)

heading("Condos and co-ops", 5)
para(
    "If you are a member of a condominium management association for a "
    "condominium you own or a tenant-stockholder in a cooperative housing "
    "corporation, you are treated as having paid your proportionate share of "
    "any costs of such association or corporation for purposes of these credits."
)

heading("More details", 5)
para("For details, see Form 5695.")

heading("Lines 6a Through 6z. Other Nonrefundable Credits", 4)

heading("Line 6a", 5)
para(
    "The general business credit consists of a number of credits that usually "
    "apply only to individuals who are partners, shareholders in an S "
    "corporation, self-employed, or who have rental property. See Form 3800 or "
    "Pub. 334."
)
callout(
    "Caution.",
    "The net elective payment election amount from Form 3800, Part III, line "
    "6, column (j), is reported on Schedule 3, line 13c.",
)

heading("Line 6b", 5)
para("Enter any credit for prior-year minimum tax. See Form 8801.")

heading("Line 6c", 5)
para(
    "You may be able to take the adoption credit if you paid expenses to adopt "
    "a child or you adopted a child with special needs and the adoption became "
    "final in 2025. See the Instructions for Form 8839."
)

heading("Line 6d", 5)
para("Enter any credit for the elderly or the disabled. See Schedule R.")

heading("Line 6e", 5)
para("Line 6e has been reserved for future use.")

heading("Line 6f", 5)
para(
    "Enter the personal use part of any credit for new clean vehicles. See "
    "Form 8936, Part III."
)

heading("Line 6g", 5)
para(
    "Enter any mortgage interest credit if a state or local government gave "
    "you a mortgage credit certificate. See Form 8396."
)

heading("Line 6h", 5)
para(
    "You can’t claim the District of Columbia first-time homebuyer credit for "
    "a home you bought after 2011. You can claim it only if you have a credit "
    "carryforward from 2024. See Form 8859."
)

heading("Line 6i", 5)
para(
    "Enter any qualified electric vehicle credit. You can’t claim this credit "
    "for a vehicle placed in service after 2006. You can claim this credit "
    "only if you have an electric vehicle passive activity credit carried "
    "forward from a prior year. See Form 8834."
)

heading("Line 6j", 5)
para(
    "Enter any alternative fuel vehicle refueling property credit. See Form "
    "8911."
)

heading("Line 6k", 5)
para("Enter any credit to holders of tax credit bonds. See Form 8912.")

heading("Line 6l", 5)
para(
    "Enter the amount from Form 8978, line 14 (relating to partner’s audit "
    "liability under section 6226). If the amount on Form 8978, line 14, is "
    "negative, complete the following worksheet to figure the amount to enter "
    "on line 6l. If the amount on Form 8978, line 14, is positive, see the "
    "instructions for Form 1040 or 1040-SR, line 16."
)

# PLACED HERE, DIRECTLY AFTER LINE 6l, not at the foot of the page where it is
# printed. Line 6l says "complete the FOLLOWING worksheet", so this position is
# the source's own stated reading order; print order would put it after line 9
# and nest it under that heading. Same test as tranches 45 and 54.
heading(WORKSHEET, 5)
para("‹Note.› Complete this worksheet if Form 8978, line 14, is negative.")
table(
    caption=(
        f"{WORKSHEET}. The Amount column holds the entry spaces you fill in; "
        "they are blank in the printed form, and line 3's entry space is "
        "printed in parentheses because the amount is negative. Line 3 is a "
        "Yes/No branch."
    ),
    columns=["Line", "Instruction", "Amount"],
    rows_markup=[
        ["1.", "Enter the amount from Form 1040 or 1040-SR, line 18", ""],
        ["2.",
         "Enter as a positive number the negative amount from Form 8978, line 14",
         ""],
        ["3.",
         "Is the amount on line 1 equal to or more than the amount on line 2? "
         "‹Yes.› Enter the amount from line 2 on line 6l ‹No.› Enter the "
         "amount from line 1 on line 6l, and subtract line 2 from line 1*",
         ""],
    ],
)
para(
    "* Use this amount to complete the Negative Form 8978 Adjustment Worksheet "
    "in the Schedule 2, line 17z, instructions."
)

heading("Line 6m", 5)
para(
    "Enter any credit for previously owned clean vehicles. See Form 8936, Part "
    "IV."
)

heading("Line 6z", 5)
para("Leave line 6z blank.")

heading("Line 9. Net Premium Tax Credit", 4)
# Spans the 116-117 break; authored WHOLE here. Tranche 57 must not repeat it.
#
# CORRECTED after page 117's geometry was read: this is ONE paragraph running
# from this page's last column to "...Instructions for Form 8962." near the top
# of page 117. Column 1 of page 117 carries NO first-line indent anywhere, so
# none of the three sentence groups that look like separate paragraphs in the
# column-aware text actually starts one. The first pass ended this block at
# "...through the Marketplace." and would have split a single source paragraph
# across the tranche boundary.
para(
    "The premium tax credit helps pay for health insurance purchased through "
    "the Marketplace. You may be eligible to claim the premium tax credit if "
    "you, your spouse, or a dependent enrolled in health insurance through the "
    "Marketplace. Eligible individuals may have advance payments of the "
    "premium tax credit made on their behalf directly to the insurance "
    "company. You (or whoever enrolled you) should have received Form 1095-A "
    "from the Marketplace with information about your coverage and any advance "
    "credit payments. Complete Form 8962 to determine the amount of your "
    "premium tax credit, if any. If the premium tax credit you can claim "
    "exceeds your advance credit payments, your net premium tax credit will be "
    "shown on Form 8962, line 26. Enter that amount, if any, on line 9. For "
    "more information, see the Instructions for Form 8962."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 56 OF A MULTI-SESSION REBUILD. This plan covers printed page 116: "
    "the Saver's Credit exclusions, Schedule 3 line 5, lines 6a through 6z "
    "with the Negative Form 8978 Adjustment Worksheet, and the opening of line "
    "9. It carries no document title by design — only tranche 1 does — so this "
    "file validates through merge-plans rather than standalone. No partial "
    "rebuild is delivered.",

    "THIS TRANCHE OPENS WITH THE LIST TRANCHE 55 INTRODUCED. Page 115's line 4 "
    "paragraph ends “…if either of the following applies.” and the two "
    "numbered items are printed wholly here. ONE BLOCK IS CARRIED OUT: line "
    "9's paragraph begins in this page's last column and finishes at the top "
    "of page 117 — and it is ONE PARAGRAPH, not the two or three the "
    "column-aware text suggests, because page 117's column 1 carries no "
    "first-line indent anywhere. A first pass ended the block at “…through the "
    "Marketplace.” and would have split a single source paragraph across the "
    "tranche boundary; reading page 117's geometry before authoring it caught "
    "that. It is authored whole here and **tranche 57 must open at “Line 10”**.",

    "THE READING ORDER WAS REBUILT FROM GEOMETRY. The column-aware text places "
    "the full-width worksheet BETWEEN column 2 and column 3 — “Line 6f.” is "
    "followed by the worksheet and then “Line 6g.” — because the worksheet "
    "band spans all three column x-ranges and the splitter emitted it with the "
    "left region. The true order is column 1, column 2, column 3, then the "
    "worksheet. Checked because the page reports 4 columns, which on page 114 "
    "meant a genuine worksheet band and on page 108 meant the detector had "
    "failed; here it is a third thing again, a band emitted in the wrong place.",

    "THE WORKSHEET IS PLACED DIRECTLY AFTER LINE 6l, not at the foot of the "
    "page where it is printed. Line 6l says “complete the FOLLOWING "
    "worksheet”, so this is the source's own stated reading order rather than "
    "a rebuild preference; print order would put it after line 9 and nest it "
    "under that heading. Same test as tranches 45 and 54.",

    "THE TWO NEGATIVE FORM 8978 WORKSHEETS ARE ALREADY DISTINGUISHABLE and "
    "neither is renamed. Tranche 54 authored “…Worksheet—Schedule 2 (Line "
    "17z)” and this one is “…Worksheet—Schedule 3 (Line 6l)”; each one's "
    "footnote points at the other by its full name, so the source's own "
    "suffixes do the disambiguating.",

    "WORKSHEET LINE 3 CARRIES ITS YES/NO BRANCH IN ONE CELL WITH cell_runs. "
    "The source prints NO period after the Yes branch, so folding the labels "
    "as plain text would read “…on line 6l No. Enter…” as a run-on. Rather "
    "than invent punctuation, the cell keeps the source's own bold on “Yes.” "
    "and “No.” through cell_runs, which the schema supports. The generator "
    "gained a table() helper that expands inline markup per cell.",

    "ELEVEN “Line 6x.” RUN-INS ARE BARE LINE NUMBERS at level 5, under “Lines "
    "6a Through 6z. Other Nonrefundable Credits” which merges its own "
    "number-and-title pair as tranches 51 and 53 did. The four line 5 run-ins "
    "keep the source's em dash (“Line 5a—residential clean energy credit”) "
    "because it is part of the printed name, not a separator this rebuild "
    "added. “Tax Topic 610” is an ITALIC LINK, authored with the "
    "[[«text»|url]] form introduced in tranche 55, and its target "
    "(taxtopics/tc610.html) was read from the annotation rect.",

    "PAGE FURNITURE OMITTED: the printed page number, which the failing "
    "band placement had dropped into the middle of the worksheet. All five "
    "contractions are curly. Soft hyphens removed and line-break hyphens "
    "closed, while genuine compounds are kept (1040-SR, 1040-NR, "
    "tenant-stockholder, co-ops, on-farm, on-the-job, full-time, first-time, "
    "prior-year, self-employed).",
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
