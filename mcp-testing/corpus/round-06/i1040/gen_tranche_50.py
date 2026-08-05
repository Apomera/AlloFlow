#!/usr/bin/env python3
"""Author tranche 50 of the i1040 rebuild: printed page 110 — the close of
Schedule 1-A Part IV (lines 22, 24, and 27) and the whole of Part V, Enhanced
Deduction for Seniors.

Usage: python gen_tranche_50.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-50-pages-110-110.json")

PAGE = 110
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


def bullets(items):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# The Example carried out of tranche 49 finishes with the first sentence of
# this page ("You are considered to have purchased your APV for personal
# use."). It was authored whole at page 109 and is not repeated.

heading("Interest deducted elsewhere on your return instead of on Schedule 1-A", 4)
para(
    "If some or all of the QPVLI qualifies to be deducted in more than one "
    "place on your return, you may choose where to report the deduction, but "
    "you cannot deduct the same amount more than once. For example, if you "
    "deducted some or all of the interest that you paid or accrued on your "
    "loan as interest on Schedule C, Schedule E, or Schedule F, then you can’t "
    "deduct that same interest as QPVLI on Schedule 1-A."
)

heading("Line 22", 4)
para(
    "Enter the VIN(s) of the APV(s) on line 22, column (i). If you need to "
    "report more than two VINs, attach a statement to your return showing the "
    "information required on line 22."
)
para(
    "Next, for each entered VIN, enter the QPVLI paid or accrued on the loan "
    "originated for the purchase of that APV. On line 22, column (ii), enter "
    "the amount of the QPVLI, if any, that was deducted elsewhere on your "
    "return (for example, on Schedule C, Schedule E, or Schedule F). On line "
    "22, column (iii), enter the total amount of the QPVLI paid or accrued on "
    "the loan during the taxable year minus the amount on line 22, column (ii)."
)

heading("Line 24", 4)
para(
    "The amount on line 24 cannot be more than $10,000, the maximum amount of "
    "the QPVLI deduction."
)

heading("Line 27", 4)
para(
    "If the amount on line 27 is zero or less, the amount of your QPVLI "
    "reported on line 24 is not reduced. Skip lines 28 and 29 and enter the "
    "amount from Schedule 1-A, line 24, on Schedule 1-A, line 30."
)

heading("Part V. Enhanced Deduction for Seniors", 3)
para(
    "You may be able to claim the enhanced deduction for seniors. You can "
    "claim this deduction whether you claim the standard deduction or itemize "
    "deductions on Schedule A or Schedule A (Form 1040-NR)."
)
callout(
    "Caution.",
    "If you are married, you must file a joint return with your spouse to "
    "claim this deduction.",
)
# "don't" is a STRAIGHT apostrophe in the source; every other contraction on
# the page is curly. Reproduced as printed - see the review notes.
callout(
    "Caution.",
    "The special rules that apply to U.S. nationals; residents of Canada, "
    "Mexico, and South Korea; and residents of India who were students or "
    "business apprentices don't apply to the enhanced deduction for seniors. "
    "See Pub. 519 for more information.",
)
para("Fill out Schedule 1-A, Part V, only if:")
bullets([
    "You (and/or your spouse if filing a joint return) were born before "
    "January 2, 1961.",
    "You have a valid social security number (SSN). If you are married filing "
    "jointly, the spouse who is claiming the enhanced deduction for seniors "
    "must have a valid SSN.",
])

heading("Death of a taxpayer in 2025", 4)
para(
    "If a taxpayer was born before January 2, 1961, but died in 2025 before "
    "reaching age 65, then the taxpayer doesn’t qualify for the enhanced "
    "deduction for seniors. A person is considered to reach age 65 on the day "
    "before the person’s 65th birthday."
)

heading("Example", 5)
para(
    "Your spouse was born on February 14, 1960, and died on February 13, 2025. "
    "Your spouse is considered age 65 at the time of death and would qualify "
    "for the enhanced deduction for seniors. However, if your spouse died on "
    "February 12, 2025, your spouse isn’t considered age 65 and wouldn’t "
    "qualify for the enhanced deduction for seniors."
)

heading("Maximum amount of deduction", 4)
para(
    "The maximum amount of the enhanced deduction for seniors is $6,000 per "
    "person. If you are married filing jointly, and both you and your spouse "
    "were born before January 2, 1961, and you both have a valid SSN, the "
    "maximum amount of the enhanced deduction for seniors is $12,000. The "
    "$6,000 per person amount is reduced if your MAGI is more than the amount "
    "shown next for your filing status."
)
bullets([
    "Married filing jointly—$150,000.",
    "Single, Head of household, or Qualifying surviving spouse—$75,000.",
])
para("Your MAGI is the amount on line 3 on Part I of Schedule 1-A.")

heading("Valid SSN", 4)
para(
    "You and/or your spouse must have a valid SSN to take this deduction. A "
    "valid SSN for purposes of the enhanced deduction for seniors is one that "
    "is valid for employment and that is issued by the SSA before the due date "
    "of your 2025 return (including extensions). For more information, see "
    "«Valid SSN for No Tax on Tips», earlier."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 50 OF A MULTI-SESSION REBUILD. This plan covers printed page 110: "
    "the close of Schedule 1-A Part IV (lines 22, 24, and 27) and the whole of "
    "Part V, Enhanced Deduction for Seniors. It carries no document title by "
    "design — only tranche 1 does — so this file validates through merge-plans "
    "rather than standalone. No partial rebuild is delivered.",

    "ONE BLOCK IS CARRIED IN AND NOT REPEATED: the Example closing page 109, "
    "whose last sentence — “You are considered to have purchased your APV for "
    "personal use.” — is the first thing printed on this page. Check the "
    "shortfall with carried_block_check.cjs against tranche 49. NOTHING IS "
    "CARRIED OUT: the page ends on a completed “Valid SSN” paragraph and page "
    "111 opens the Instructions for Schedule 2, checked rather than assumed.",

    "RUN-IN LEVELS WERE SET FROM MEASUREMENT, using runin_levels.cjs. Seven "
    "run-ins share face g_d0_f3 and start FLUSH at the column left (“Interest "
    "deducted elsewhere…”, “Line 22.”, “Line 24.”, “Line 27.”, “Death of a "
    "taxpayer in 2025.”, “Maximum amount of deduction.”, “Valid SSN.”) and are "
    "authored level 4. “Example.” alone is set in a DIFFERENT face, g_d0_f7, "
    "and is INDENTED 12pt, so it is level 5 — the same pattern the run-in "
    "audit confirmed on pages 102, 104, 107, and 109, where an indented "
    "Example label is always one level below the flush run-ins around it.",

    "THE SOURCE MIXES APOSTROPHES AGAIN, as on page 106. Five contractions "
    "here are curly (“can’t”, “doesn’t”, “person’s”, “isn’t”, “wouldn’t”) and "
    "ONE is straight — “business apprentices don't apply”, inside the second "
    "CAUTION box. Reproduced as printed. The recall check cannot see this "
    "either way, since its normalisation strips punctuation.",

    "THE PAGE CARRIES NO LINK ANNOTATIONS, checked rather than assumed. The "
    "reference to Pub. 519 is plain text in the source and is left plain.",

    "A THIRD HEADING NAMED FOR AN SSN REQUIREMENT, and deliberately not "
    "disambiguated. Part II has “Valid SSN for No Tax on Tips” (tranche 44), "
    "Part III has “Valid SSN” (tranche 48), and Part V has “Valid SSN” here. "
    "All three are printed exactly so, and this one's own text cross-refers to "
    "the Part II heading by its full name, so renaming any of them would break "
    "a reference the source relies on. Same call as the repeated Example "
    "numbering.",

    "PAGE FURNITURE OMITTED: the printed page number, which sits between the "
    "Line 27 paragraph and the Part V heading in the column flow. Soft hyphens "
    "removed and line-break hyphens closed, while genuine compounds are kept "
    "(1-A, 1040-NR, QPVLI, VIN(s), APV(s), 65th). The em dashes before the "
    "MAGI thresholds are the source's own.",
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
