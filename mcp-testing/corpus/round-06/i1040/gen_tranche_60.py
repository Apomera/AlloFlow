#!/usr/bin/env python3
"""Author tranche 60 of the i1040 rebuild: printed page 122 — Major Categories
of Federal Income and Outlays for Fiscal Year 2024.

The two PIE CHARTS become data tables. Their slices were paired to their
percentages by x-cluster in the page geometry, not read off the interleaved
text layer, and both tables are asserted to sum to 100%.

Usage: python gen_tranche_60.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-60-pages-122-122.json")

PAGE = 122
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

blocks = []

# ---------------------------------------------------------------- chart data
# Paired by x-cluster from the page geometry. The text layer interleaves the
# two charts completely ("IncomeOutlays Net Law Physical, Social security,
# Medicare, Personal income ... retirement taxes36% retirement debt 3"), so
# reading percentages off it would have mispaired them - a factual error in a
# tax document, and one nothing downstream could catch.

INCOME = [
    ("Social security, Medicare, and unemployment and other retirement taxes", 25),
    ("Personal income taxes", 36),
    ("Corporate income taxes", 8),
    ("Excise, customs, estate, gift, and miscellaneous taxes", 4),
    ("Borrowing to cover deficit", 27),
]

# (category, percentage, footnote number or None)
OUTLAYS = [
    ("Social security, Medicare, and other retirement", 37, "1"),
    ("National defense, veterans, and foreign affairs", 18, "2"),
    ("Physical, human, and community development", 10, "3"),
    ("Social programs", 20, "4"),
    ("Net interest on the debt", 13, None),
    ("Law enforcement and general government", 2, None),
]

FOOTNOTES = [
    "‹Social security, Medicare, and other retirement:› These programs provide "
    "income support for the retired and disabled and medical care for the "
    "elderly.",
    "‹National defense, veterans, and foreign affairs:› About 13% of outlays "
    "were to equip, modernize, and pay our armed forces and to fund national "
    "defense activities; about 5% were for veterans benefits and services; and "
    "about 1% were for international activities, including military and "
    "economic assistance to foreign countries and the maintenance of U.S. "
    "embassies abroad.",
    "‹Physical, human, and community development:› These outlays were for "
    "agriculture; natural resources; environment; transportation; aid for "
    "elementary and secondary education and direct assistance to college "
    "students; job training; deposit insurance, commerce and housing credit, "
    "and community development; and space, energy, and general science "
    "programs.",
    "‹Social programs:› About 14% of total outlays were for Medicaid, "
    "Supplemental Nutrition Assistance Program (formerly food stamps), "
    "temporary assistance for needy families, supplemental security income, "
    "and related programs; and 6% for health research and public health "
    "programs, unemployment compensation, assisted housing, and social "
    "services.",
]

# ------------------------------------------------------------- assertions

assert sum(p for _, p in INCOME) == 100, \
    f"income slices sum to {sum(p for _, p in INCOME)}%, not 100%"
assert sum(p for _, p, _ in OUTLAYS) == 100, \
    f"outlay slices sum to {sum(p for _, p, _ in OUTLAYS)}%, not 100%"
marked = [n for _, _, n in OUTLAYS if n]
assert marked == ["1", "2", "3", "4"], f"footnote markers out of order: {marked}"
assert len(FOOTNOTES) == len(marked), \
    f"{len(FOOTNOTES)} footnotes for {len(marked)} marked slices"


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


def listing(items, ordered):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


heading("Major Categories of Federal Income and Outlays for Fiscal Year 2024", 2)
para(
    "‹Income and Outlays.› These pie charts show the relative sizes of the "
    "major categories of federal income and outlays for fiscal year 2024."
)

heading("Income", 3)
blocks.append({
    "type": "table",
    "caption": (
        "Income for fiscal year 2024 by major category, as a percentage of "
        "total income. This is the “Income” pie chart rendered as a table; the "
        "five slices sum to 100%."
    ),
    "columns": ["Category", "Percentage of total income"],
    "rows": [[name, f"{pct}%"] for name, pct in INCOME],
    "row_headers": True,
    "source_page": PAGE,
})

heading("Outlays", 3)
blocks.append({
    "type": "table",
    "caption": (
        "Outlays for fiscal year 2024 by major category, as a percentage of "
        "total outlays. This is the “Outlays” pie chart rendered as a table; "
        "the six slices sum to 100%. The Footnote column carries the "
        "superscript the chart prints beside four of the categories, and those "
        "footnotes follow under “Footnotes for Certain Federal Outlays”."
    ),
    "columns": ["Category", "Percentage of total outlays", "Footnote"],
    "rows": [[name, f"{pct}%", note or ""] for name, pct, note in OUTLAYS],
    "row_headers": True,
    "source_page": PAGE,
})

para(
    "On or before the first Monday in February of each year, the President is "
    "required by law to submit to the Congress a budget proposal for the "
    "fiscal year that begins the following October. The budget plan sets forth "
    "the President’s proposed receipts, spending, and the surplus or deficit "
    "for the federal government. The plan includes recommendations for new "
    "legislation as well as recommendations to change, eliminate, and add "
    "programs. After receipt of the President’s proposal, the Congress reviews "
    "the proposal and makes changes. It first passes a budget resolution "
    "setting its own targets for receipts, outlays, and surplus or deficit. "
    "Next, individual spending and revenue bills that are consistent with the "
    "goals of the budget resolution are enacted."
)
para(
    "In fiscal year 2024 (which began on October 1, 2023, and ended on "
    "September 30, 2024, federal income was $4.920 trillion and outlays were "
    "$6.751 trillion, leaving a deficit of $1.831 trillion."
)

heading("Footnotes for Certain Federal Outlays", 3)
listing(FOOTNOTES, ordered=True)

para(
    "‹Note.› The percentages shown here exclude undistributed offsetting "
    "receipts, which were $147 billion in fiscal year 2024. In the budget, "
    "these receipts are offset against spending in figuring the outlay totals "
    "shown above. These receipts are for the U.S. Government's share of its "
    "employee retirement programs, rents and royalties on the Outer "
    "Continental Shelf, and proceeds from the sale of assets."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 60 OF A MULTI-SESSION REBUILD. This plan covers printed page 122, "
    "Major Categories of Federal Income and Outlays for Fiscal Year 2024. It "
    "carries no document title by design — only tranche 1 does — so this file "
    "validates through merge-plans rather than standalone. No partial rebuild "
    "is delivered. Nothing is carried in or out.",

    "THE TWO PIE CHARTS BECOME DATA TABLES. A pie chart carries its meaning "
    "entirely in numbers a screen reader cannot see, so each is rendered as a "
    "Category/Percentage table — the standard accessible equivalent, and the "
    "only form in which the figures survive at all. This is the largest "
    "deliberate transformation in the rebuild so far and it is disclosed in "
    "both captions.",

    "THE SLICES WERE PAIRED TO THEIR PERCENTAGES BY X-CLUSTER IN THE PAGE "
    "GEOMETRY, NOT READ OFF THE TEXT LAYER. The text layer interleaves the two "
    "charts completely — “IncomeOutlays Net Law Physical, Social security, "
    "Medicare, Personal income Social security, interest enforcement human, "
    "and … retirement taxes36% retirement debt 3 government development 25% "
    "37% 13% 2% 10%” — so reading percentages off it would have mispaired "
    "them. **That would be a factual error in a tax document and nothing "
    "downstream could catch it**: every token would be present, every number "
    "correct, and only the pairing wrong. Each label and its percentage were "
    "matched by x-position within its own chart.",

    "BOTH TABLES ARE ASSERTED TO SUM TO 100%, and the generator refuses to "
    "write a plan otherwise: income 25 + 36 + 8 + 4 + 27 = 100, outlays 37 + "
    "18 + 10 + 20 + 13 + 2 = 100. Two further gates check that the four "
    "footnote markers appear in order 1-4 and that there are exactly four "
    "footnotes to match. A mispairing that swapped two percentages between "
    "charts would break the sums; one that swapped two within a chart would "
    "not, which is why the x-clustering was done carefully rather than relying "
    "on the arithmetic alone.",

    "THE FOOTNOTE SUPERSCRIPTS BECOME THEIR OWN COLUMN. The chart prints a "
    "small 1, 2, 3, or 4 beside four of the six outlay categories. There is no "
    "superscript style in the plan schema, and appending a bare digit to the "
    "category name would read as “…and other retirement 1”. A “Footnote” "
    "column says the same thing unambiguously, and the four footnotes below "
    "are an ORDERED LIST whose generated numbers match.",

    "THE SECOND BODY PARAGRAPH REPRODUCES AN UNCLOSED PARENTHESIS. The source "
    "reads “In fiscal year 2024 (which began on October 1, 2023, and ended on "
    "September 30, 2024, federal income was $4.920 trillion…” — the bracket "
    "opened after “2024” is never closed. Reproduced as printed rather than "
    "silently repaired, the same call made for line 24z in tranche 40, the two "
    "worksheet line 2 instructions in tranche 48, and “net earning” in tranche "
    "52.",

    "PAGE FURNITURE OMITTED: the printed page number. The straight apostrophe "
    "in “U.S. Government's share” is the source's own and is kept; every other "
    "apostrophe on the page is curly. Soft hyphens removed and line-break "
    "hyphens closed (“elim-inate” → “eliminate”, “communi-ty” → “community”, "
    "“as-sisted” → “assisted”), while genuine compounds are kept.",
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

print(f"wrote {OUT}: {len(blocks)} blocks, page {PAGE}, "
      f"income {sum(p for _, p in INCOME)}%, outlays {sum(p for _, p, _ in OUTLAYS)}%, "
      f"{len(review_notes)} review notes")
