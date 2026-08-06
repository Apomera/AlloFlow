#!/usr/bin/env python3
"""Author tranche 62 of the i1040 rebuild: printed page 125 — Your Rights as a
Taxpayer, the Taxpayer Bill of Rights.

Usage: python gen_tranche_62.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-62-pages-125-125.json")

PAGE = 125
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

blocks = []

# The ten rights, in the source's own numbering. Read per COLUMN from the page
# geometry: the detector reports this page as 1 column and interleaves the two,
# so the column-aware text is unusable here.
RIGHTS = [
    ("1. The Right to Be Informed",
     "Taxpayers have the right to know what they need to do to comply with "
     "the tax laws. They are entitled to clear explanations of the laws and "
     "IRS procedures in all tax forms, instructions, publications, notices, "
     "and correspondence. They have the right to be informed of IRS decisions "
     "about their tax accounts and to receive clear explanations of the "
     "outcomes."),
    ("2. The Right to Quality Service",
     "Taxpayers have the right to receive prompt, courteous, and professional "
     "assistance in their dealings with the IRS, to be spoken to in a way they "
     "can easily understand, to receive clear and easily understandable "
     "communications from the IRS, and to speak to a supervisor about "
     "inadequate service."),
    ("3. The Right to Pay No More than the Correct Amount of Tax",
     "Taxpayers have the right to pay only the amount of tax legally due, "
     "including interest and penalties, and to have the IRS apply all tax "
     "payments properly."),
    ("4. The Right to Challenge the IRS’s Position and Be Heard",
     "Taxpayers have the right to raise objections and provide additional "
     "documentation in response to formal IRS actions or proposed actions, to "
     "expect that the IRS will consider their timely objections and "
     "documentation promptly and fairly, and to receive a response if the IRS "
     "does not agree with their position."),
    ("5. The Right to Appeal an IRS Decision in an Independent Forum",
     "Taxpayers are entitled to a fair and impartial administrative appeal of "
     "most IRS decisions, including many penalties, and have the right to "
     "receive a written response regarding the IRS Independent Office of "
     "Appeals’ decision. Taxpayers generally have the right to take their "
     "cases to court."),
    ("6. The Right to Finality",
     "Taxpayers have the right to know the maximum amount of time they have to "
     "challenge the IRS’s position as well as the maximum amount of time the "
     "IRS has to audit a particular tax year or collect a tax debt. Taxpayers "
     "have the right to know when the IRS has finished an audit."),
    ("7. The Right to Privacy",
     "Taxpayers have the right to expect that any IRS inquiry, examination, or "
     "enforcement action will comply with the law and be no more intrusive "
     "than necessary, and will respect all due process rights, including "
     "search and seizure protections, and will provide, where applicable, a "
     "collection due process hearing."),
    ("8. The Right to Confidentiality",
     "Taxpayers have the right to expect that any information they provide to "
     "the IRS will not be disclosed unless authorized by the taxpayer or by "
     "law. Taxpayers have the right to expect appropriate action will be taken "
     "against employees, return preparers, and others who wrongfully use or "
     "disclose taxpayer return information."),
    ("9. The Right to Retain Representation",
     "Taxpayers have the right to retain an authorized representative of their "
     "choice to represent them in their dealings with the IRS. Taxpayers have "
     "the right to seek assistance from a Low Income Taxpayer Clinic if they "
     "cannot afford representation."),
    ("10. The Right to a Fair and Just Tax System",
     "Taxpayers have the right to expect the tax system to consider facts and "
     "circumstances that might affect their underlying liabilities, ability to "
     "pay, or ability to provide information timely. Taxpayers have the right "
     "to receive assistance from the Taxpayer Advocate Service if they are "
     "experiencing financial difficulty or if the IRS has not resolved their "
     "tax issues properly and timely through its normal channels."),
]

# The source numbers them 1-10 and the numbering is part of each printed
# heading, so it is kept rather than regenerated. This checks it is intact and
# in order - the failure a per-column read could produce is rights 6-10 landing
# among 1-5.
numbers = [int(title.split(".")[0]) for title, _ in RIGHTS]
assert numbers == list(range(1, 11)), f"rights out of order: {numbers}"
assert len({t for t, _ in RIGHTS}) == 10, "duplicate right titles"


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


heading("Your Rights as a Taxpayer", 2)
heading("The Taxpayer Bill of Rights", 3)

for title, body in RIGHTS:
    heading(title, 4)
    para(body)

# Printed at the foot of the left column, after right 5, but it closes the
# whole list rather than that one right - so it is placed after all ten.
para("Learn more at IRS.gov/TaxpayerRights.")

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 62 OF A MULTI-SESSION REBUILD. This plan covers printed page 125, "
    "Your Rights as a Taxpayer: the ten rights of the Taxpayer Bill of Rights. "
    "It carries no document title by design — only tranche 1 does — so this "
    "file validates through merge-plans rather than standalone. Nothing is "
    "carried in or out.",

    "THE READING ORDER WAS REBUILT FROM GEOMETRY. The column detector reports "
    "this page as **1 column** and interleaves the two: “1. The Right to Be "
    "Informed 6. The Right to FinalityTaxpayers have the right to know what "
    "they need to do to Taxpayers have the right to know the maximum amount "
    "of…”. The page is two columns at x=59 and x=316 carrying rights 1-5 and "
    "6-10, and each was read top to bottom. Same failure shape as page 121 — "
    "very little running prose for the gutter search to work with, on a page "
    "that is mostly display type.",

    "THE NUMBERING IS PART OF EACH PRINTED HEADING and is kept rather than "
    "regenerated as an ordered list. A reader who is told elsewhere to consult "
    "“the fourth right” needs the number to be in the heading, and the source "
    "prints it there. Two assertions check the ten titles are intact and run "
    "1-10 in order, which is the failure a per-column read could produce — "
    "rights 6-10 landing among 1-5.",

    "TWO HEADINGS WRAP OVER TWO PRINTED LINES and are joined: “3. The Right to "
    "Pay No More than the / Correct Amount of Tax”, “4. The Right to Challenge "
    "the IRS’s Position / and Be Heard”, and “5. The Right to Appeal an IRS "
    "Decision in an / Independent Forum”. The wrap is typographic, not "
    "structural.",

    "“Learn more at IRS.gov/TaxpayerRights.” IS PLACED AFTER ALL TEN RIGHTS, "
    "not after right 5 where it is printed. It sits at the foot of the LEFT "
    "column because that is where the column ends, but it closes the whole "
    "list rather than right 5 — leaving it in print position would file it "
    "under “5. The Right to Appeal an IRS Decision in an Independent Forum”, "
    "where it does not belong. Same test as tranches 45, 54, and 56. **The "
    "address carries NO Link annotation on this page**, checked rather than "
    "assumed, so it is left as plain text and no URL was invented for it; the "
    "closing period is the rebuild's own, since the printed line ends without "
    "one.",

    "PAGE FURNITURE OMITTED: the printed page number. The two curly "
    "apostrophes (“IRS’s”, “Appeals’”) are the source's own. No soft hyphens "
    "or line-break hyphens appear on this page — it is set ragged-right "
    "without hyphenation, the only page in the rebuild for which that is true.",
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

print(f"wrote {OUT}: {len(blocks)} blocks, page {PAGE}, {len(RIGHTS)} rights, "
      f"{len(review_notes)} review notes")
