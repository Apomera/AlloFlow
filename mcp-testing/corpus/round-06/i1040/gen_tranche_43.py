#!/usr/bin/env python3
"""Author tranche 43 of the i1040 rebuild: printed page 103 — the tipped
occupations list and how to determine the amount of qualified tips received,
as an employee and as a non-employee.

Usage: python gen_tranche_43.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-43-pages-103-103.json")

PAGE = 103
OCCUPATIONS_URL = ("https://www.irs.gov/forms-pubs/occupations-that-customarily-"
                   "and-regularly-received-tips-on-or-before-december-31-2024")
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


def callout(label, body):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": PAGE})


def listing(items, ordered=False):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# NOTE: the "Occupations that customarily and regularly received tips" paragraph
# whose tail opens this page was authored whole at page 102 (tranche 42).

para(
    "The full list of occupations, including the TTOC, occupation title, "
    "occupation description, illustrative examples, and SOC code(s) can be "
    f"found at [[IRS.gov/TippedOccupations|{OCCUPATIONS_URL}]]."
)
para(
    "Examples of occupations that customarily and regularly received tips on or "
    "before December 31, 2024, as well as the occupation title and TTOC, are "
    "listed next."
)
listing([
    "‹Beverage and food service:› bartenders (101); wait staff (102); chefs and "
    "cooks (105); dishwashers (108); host staff, restaurant, lounge, and coffee "
    "shop (109); and bakers (110).",

    "‹Entertainment and events:› gambling dealers (201), dancers (205), "
    "musicians and singers (206), and digital content creators (209).",

    "‹Hospitality and guest services:› baggage porters and bellhops (301), "
    "concierges (302), and maids and housekeeping cleaners (304).",

    "‹Home services:› home maintenance and repair workers (401), home "
    "landscaping workers and groundskeeping workers (402), home cleaning "
    "service workers (407), locksmiths (408), and roadside assistance workers "
    "(409).",

    "‹Personal services:› personal care and service workers (501), private "
    "event planners (502), private event and portrait photographers (503), pet "
    "caretakers (506), tutors (507), and nannies and babysitters (508).",

    "‹Personal appearance and wellness:› massage therapists (602); barbers, "
    "hairdressers, hairstylists, and cosmetologists (603); exercise trainers "
    "and group fitness instructors (608); and tattoo artists and piercers (609).",

    "‹Recreation and instruction:› golf caddies (701), tour guides (704), and "
    "sports and recreation instructors (706).",

    "‹Transportation and delivery:› parking and valet attendants (801), taxi "
    "and rideshare drivers and chauffeurs (802), goods delivery people (804), "
    "and home movers (809).",
])

heading("Determining the amount of qualified tips received by an employee for 2025", 5)
para(
    "Because no changes have been made to Form W-2 for 2025, a separate "
    "accounting for cash tips you report to your employer may not appear on "
    "your Form W-2 for 2025. For 2026, Form W-2 will be updated to provide for "
    "a separate accounting for cash tips you report to your employer."
)
para(
    "If you received tips as an employee in more than one occupation for the "
    "same employer, only those tips that were received in an occupation on the "
    "list of occupations that customarily and regularly received tips on or "
    "before December 31, 2024, are considered qualified tips. Do not include "
    "tips received in occupations that are not included on this list in line "
    "4a, 4b, or 4c."
)
para(
    "In order to determine the qualified tips you received as an employee for "
    "2025, you can figure your qualified tips using one of the methods "
    "described in paragraphs 1 through 4."
)
listing([
    "You can use the amount reported to you on your Form W-2 in box 7. Enter "
    "this amount on line 4a. If you had more than one employer, see the "
    "instructions for line 4c and enter this amount in column 1(b) of the "
    "Qualified Tips From More Than One Employer Worksheet.",

    "You can use the total amount of tips reported to your employer on all your "
    "Forms 4070 or any similar form used to report your tips monthly to your "
    "employer. This amount may be more accurate if the amount in box 1 or box 5 "
    "is more than $176,100. Enter this amount on line 4a. If you received tips "
    "as an employee from more than one employer, see the instructions for line "
    "4c and enter this amount in column 1(b) of the Qualified Tips From More "
    "Than One Employer Worksheet.",

    "If your employer voluntarily chooses to report the amount of your tips in "
    "box 14 of your Form W-2 (or on a separate statement), you can use the "
    "amount reported to you.",

    "If you are submitting Form 4137, you can use the amount of qualified tips "
    "included for the employer in column 1(c) of Form 4137 to enter on line 4b. "
    "If you received tips as an employee from more than one employer, see the "
    "instructions for line 4c and use this amount to enter in column 1(c) of "
    "the Qualified Tips From More Than One Employer Worksheet.",
], ordered=True)
callout(
    "Tip.",
    "If you are a railroad employee who received tips in your RRTA "
    "compensation, the tips you report to your employer should be reported to "
    "you on your Form W-2, box 14.",
)

heading("Example 1", 6)
para(
    "You are a restaurant server and have only one employer. Your Form W-2, box "
    "7, is $18,000. You have no unreported tips. You can use the $18,000 in box "
    "7 to figure the deduction for qualified tips. You enter $18,000 on "
    "Schedule 1-A, lines 4a and 4c."
)

heading("Example 2", 6)
para(
    "You are a bartender and have only one employer. Your 2025 Form W-2 shows "
    "$200,000 in box 1 and $15,000 in box 7. You report $20,000 of tips on Form "
    "4070 and report $4,000 of unreported tips on Form 4137, line 4. You can "
    "use the $4,000 reported on Form 4137 plus either the $15,000 from box 7 of "
    "your Form W-2 or the $20,000 of tips reported on Form 4070 to figure the "
    "deduction for qualified tips."
)

heading(
    "Determining the amount of qualified tips received by a non-employee for 2025",
    5,
)
para(
    "Because no changes have been made to Form 1099-NEC, Form 1099-MISC, or "
    "Form 1099-K for 2025, a separate accounting for cash tips received by you "
    "as a non-employee won’t appear on these Forms. For 2025, the separate "
    "accounting requirement is treated as satisfied if your qualified tips are "
    "included in the total amount of compensation, income, or payments reported "
    "to you on one or more of these Forms. For 2026, these Forms will be "
    "updated to provide for a separate accounting for cash tips received by you "
    "as a non-employee. Base your determination of the amount of your qualified "
    "tips on documentation such as receipts, point-of-sale system reports, "
    "daily tip logs, third party settlement organization records, or other "
    "documents that show that the amount you reported as qualified tips is the "
    "correct amount. Make sure to keep a record of the documents you use when "
    "determining the amount of your qualified tips."
)

heading("Example 1", 6)
# Runs from page 103 past the full-page worksheet at the top of page 104 and
# finishes below it. Authored whole here.
para(
    "You are a rideshare driver and receive a Form 1099-K from the rideshare "
    "company that includes tips in the total amount of compensation, income, or "
    "payments. The rideshare company reports separately in your earnings "
    "statement on its rideshare app or website the fares you earned and tips "
    "you received during the year. In order to figure the amount of your "
    "qualified tips for 2025, you can use the amount designated as tips by the "
    "rideshare company in your earnings statement on the rideshare app or "
    "website."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 43 OF A MULTI-SESSION REBUILD. This plan covers printed page 103, "
    "the tipped occupations list and how to determine the amount of qualified "
    "tips received. It carries no document title by design — only tranche 1 "
    "does — so this file validates through merge-plans rather than standalone. "
    "No partial rebuild is delivered.",

    "THE PARAGRAPH OPENING THIS PAGE IS NOT REPEATED. “Occupations that "
    "customarily and regularly received tips…” was authored whole at page 102 "
    "in tranche 42. Check the shortfall with carried_block_check.cjs against "
    "tranche 42.",

    "THE EIGHT OCCUPATION CATEGORIES KEEP THEIR TREASURY TIPPED OCCUPATION "
    "CODES INLINE, exactly as printed — bartenders (101), wait staff (102), and "
    "so on. The codes are what a reader matches against the full list, so they "
    "are content rather than reference clutter. Each category name is bold in "
    "the source and is marked strong, which keeps the eight categories "
    "distinguishable when the list is read aloud.",

    "A TIP BOX IS MOVED FROM THE MIDDLE OF A NUMBERED LIST TO AFTER IT, the "
    "same decision as tranche 42 and for a stronger reason: the railroad/RRTA "
    "note is printed between methods 2 and 3, and splitting a list numbered 1 "
    "through 4 would either break the numbering or produce two lists that both "
    "claim to start at 1. The note names its own subject (“If you are a "
    "railroad employee…”), so placing it after the four methods costs nothing.",

    "THE METHODS ARE AN ORDERED LIST because the source numbers them and the "
    "sentence introducing them refers to “paragraphs 1 through 4” — the "
    "numbering is cited, not decorative.",

    "TWO “Example 1” HEADINGS AGAIN, one under the employee discussion and one "
    "under the non-employee discussion, both at level 6 beneath the level-5 "
    "run-in lead that governs them. Same treatment as tranche 42.",

    "THE NON-EMPLOYEE “Example 1” SPANS PAGE 103 PAST THE FULL-PAGE WORKSHEET "
    "ON PAGE 104 and finishes below it. Authored whole here, so the page-104 "
    "tranche must not re-author it. FOURTH block in the rebuild to jump a "
    "full-page insert, after tranches 29, 33 and 38. Joining the halves needed "
    "care: page 103 ends at “…on its rideshare app or website” and the "
    "continuation begins mid-word at “…designa-/ted as tips”, so a first look "
    "that started below the worksheet's visible bottom produced a sentence that "
    "did not join up.",

    "BOTH LINK ANNOTATIONS POINT AT THE SAME PLACE — the occupations page on "
    "irs.gov — because the visible text IRS.gov/TippedOccupations wraps across "
    "two lines and the PDF marks each line separately. One link is authored, "
    "with the target taken from the annotation rather than from the visible "
    "shorthand.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing footer. "
    "Soft hyphens removed and line-break hyphens closed, while genuine "
    "compounds are kept (W-2, 1099-NEC, 1099-MISC, 1099-K, 1040-SR, "
    "non-employee, point-of-sale, rideshare).",
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
