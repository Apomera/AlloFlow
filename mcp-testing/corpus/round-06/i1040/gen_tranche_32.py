#!/usr/bin/env python3
"""Author tranche 32 of the i1040 rebuild: printed page 92 — Schedule 1 lines
8p through 8z, completing the Other Income series.

Usage: python gen_tranche_32.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-32-pages-92-92.json")

PAGE = 92
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


def heading(text, level=5):
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


heading("Line 8p. 461(l) excess business loss adjustment")
para("Enter the amount of your excess business loss from Form 461, line 16.")

heading("Line 8q. Taxable distributions from an ABLE account")
para(
    "Distributions from this type of account may be taxable if (a) they are "
    "more than the designated beneficiary’s qualified disability expenses, and "
    "(b) they were not included in a qualified rollover. See Pub. 907 for more "
    "information."
)
callout(
    "Caution.",
    "You may have to pay an additional tax if you received a taxable "
    "distribution from an ABLE account. See the Instructions for Form 5329.",
)

heading("Line 8r. Scholarship and fellowship grants not reported on Form W-2")
para(
    "Enter the amount of scholarship and fellowship grants not reported on Form "
    "W-2. However, if you were a degree candidate, include on line 8r only the "
    "amounts you used for expenses other than tuition and course-related "
    "expenses. For example, amounts used for room, board, and travel must be "
    "reported on line 8r."
)

heading(
    "Line 8s. Nontaxable amount of Medicaid waiver payments included on Form "
    "1040, line 1a or 1d"
)
para(
    "Certain Medicaid waiver payments you received for caring for someone "
    "living in your home with you may be nontaxable. Your nontaxable Medicaid "
    "waiver payments should be reported to you on Form(s) W-2 in box 12, Code "
    "II. If nontaxable payments were reported to you in box 1 of Form(s) W-2, "
    "report the amount on Form 1040 or 1040-SR, line 1a. If you did not receive "
    "a Form W-2 for nontaxable payments, or you received nontaxable payments "
    "that you didn’t report on line 1a, and choose to include nontaxable "
    "amounts in earned income for purposes of claiming a credit or other tax "
    "benefit, report the amount on Form 1040 or 1040-SR, line 1d. Then, on line "
    "8s, enter the total amount of the nontaxable payments reported on Form "
    "1040 or 1040-SR, line 1a or 1d, in the entry space in the preprinted "
    "parentheses (as a negative number). For more information about these "
    "payments, see Pub. 525."
)
para(
    "If you do not have a separate trade or business of providing these "
    "services, enter any nontaxable Medicaid waiver payments on Schedule 1, "
    "line 8s. Also, enter your Medicaid waiver payments reported on Form "
    "1099-MISC or Form 1099-NEC on Form 1040, line 1d."
)

heading(
    "Line 8t. Pension or annuity from a nonqualified deferred compensation plan "
    "or a nongovernmental section 457 plan"
)
para(
    "Enter the amount that you received as a pension or annuity from a "
    "nonqualified deferred compensation plan or a nongovernmental 457 plan. "
    "This may be shown in box 11 of Form W-2. If you received such an amount "
    "but box 11 is blank, contact your employer or the payer for the amount "
    "received."
)

heading("Line 8u. Wages earned while incarcerated")
para(
    "Enter the amount that you received for services performed while an inmate "
    "in a penal institution. You may receive Form(s) W-2 or Form(s) 1099."
)

heading("Line 8v. Digital assets not reported elsewhere")
para(
    "If, in 2025, you received ordinary income in connection with digital "
    "assets that isn’t reported elsewhere on your return (for example, digital "
    "assets, such as income from forks, staking, or mining, which aren’t wages "
    "reported on line 1a or capital gain or loss reported on Form 8949 and "
    "Schedule D), report this income on line 8v. Don’t report a gift or "
    "inheritance of digital assets on line 8v. For more information, go to "
    "[[IRS.gov/Digital-Assets|https://www.irs.gov/digitalassets]]."
)
para(
    "If you used a broker to effect the sale of a digital asset, your broker "
    "should send you Form 1099-DA. You must answer the digital asset question "
    "on Form 1040 whether or not you received a Form 1099-DA."
)

heading("Line 8z. Other income")
para(
    "Use line 8z to report any taxable income not reported elsewhere on your "
    "return or other schedules. List the type and amount of income. If "
    "necessary, include a statement showing the required information. For more "
    "details, see «Miscellaneous Income» in Pub. 525."
)
para("Examples of income to report on line 8z include the following.")
# The last item runs across the 92->93 break; the whole list is authored here.
bullets([
    "Reimbursements or other amounts received for items deducted in an earlier "
    "year, such as medical expenses, real estate taxes, general sales taxes, or "
    "home mortgage interest. See «Recoveries» in Pub. 525 for details on how to "
    "figure the amount to report.",

    "Reemployment trade adjustment assistance (RTAA) payments. These payments "
    "should be shown in box 5 of Form 1099-G.",

    "Loss on certain corrective distributions of excess deferrals. See "
    "«Retirement Plan Contributions» in Pub. 525.",

    "Dividends on insurance policies if they exceed the total of all net "
    "premiums you paid for the contract.",

    "Recapture of a charitable contribution deduction relating to the "
    "contribution of a fractional interest in tangible personal property. See "
    "«Fractional Interest in Tangible Personal Property» in Pub. 526. Interest "
    "and an additional 10% tax apply to the amount of the recapture. See the "
    "instructions for Schedule 2, line 17g.",

    "Recapture of a charitable contribution deduction if the charitable "
    "organization disposes of the donated property within 3 years of the "
    "contribution. See «Recapture if no exempt use» in Pub. 526.",

    "Taxable part of disaster relief payments. See Pub. 525 to figure the "
    "taxable part, if any. If any of your disaster relief payment is taxable, "
    "attach a statement showing the total payment received and how you figured "
    "the taxable part.",

    "Taxable distributions from a Coverdell education savings account (ESA) or "
    "a qualified tuition program (QTP). Distributions from these accounts may "
    "be taxable if (a) in the case of distributions from a QTP, they are more "
    "than the qualified higher education expenses of the designated beneficiary "
    "in 2025 or, in the case of distributions from an ESA, they are more than "
    "the qualified education expenses of the designated beneficiary in 2025; "
    "and (b) they were not included in a qualified rollover. Nontaxable "
    "distributions from these accounts don’t have to be reported on Form 1040 "
    "or 1040-SR. This includes rollovers and qualified higher education "
    "expenses refunded to a student from a QTP that were recontributed to a QTP "
    "with the same designated beneficiary generally within 60 days after the "
    "date of refund. See Pub. 970.",
])

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 32 OF A MULTI-SESSION REBUILD. This plan covers printed page 92, "
    "Schedule 1 lines 8p through 8z. It carries no document title by design — "
    "only tranche 1 does — so this file validates through merge-plans rather "
    "than standalone. No partial rebuild is delivered.",

    "NOTHING IS CARRIED IN. Line 8o completes on page 91, checked against page "
    "92's opening rather than inferred from a truncated column dump — the "
    "mistake session 31 nearly made. This page opens cleanly at line 8p.",

    "“Line 8x” AND ITS BOLD RUN-IN LEAD ARE MERGED INTO ONE HEADING, as in "
    "tranche 31, so the heading list reads “Line 8q. Taxable distributions from "
    "an ABLE account”, “Line 8u. Wages earned while incarcerated”, “Line 8v. "
    "Digital assets not reported elsewhere” instead of eleven bare line "
    "numbers. Three of these leads are long clauses (8s, 8t, and 8s's Form 1040 "
    "line reference) and are kept whole for the same reason as line 8l: the "
    "qualifying condition is the point of the line.",

    "THE SERIES SKIPS FROM 8v TO 8z, and that is the source's own numbering, as "
    "the missing 8g was on page 91. There is no 8w, 8x or 8y in the printed "
    "instructions and no gap in the text around them.",

    "THE LINE 8z EXAMPLES LIST SPANS THE 92-93 BREAK AND IS AUTHORED WHOLE "
    "HERE. Its eighth and last item — taxable distributions from a Coverdell "
    "ESA or a QTP — breaks mid-word at the foot of page 92 (“Nontaxa-” / “ble "
    "distributions from these accounts…”) and finishes at the top of page 93. "
    "Splitting an eight-item list at a page boundary would leave a reader "
    "seven items and an orphan, so the page-93 tranche must not re-author that "
    "item; it opens instead with the CAUTION that follows it.",

    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS: Miscellaneous Income, "
    "Recoveries, Retirement Plan Contributions, Fractional Interest in Tangible "
    "Personal Property, Recapture if no exempt use. These are pointers into "
    "Pub. 525 and Pub. 526 rather than links; the page's only Link annotation "
    "is IRS.gov/Digital-Assets, whose target was taken from the annotation "
    "(irs.gov/digitalassets, not the hyphenated form shown).",

    "ONE ICON CALLOUT, on line 8q, authored as a paragraph opening with a "
    "strong “Caution.” in sentence case, as established in tranche 3.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing “Need "
    "more information or forms? Visit IRS.gov.” footer. Soft hyphens removed "
    "and justified line-break hyphens closed, while genuine compounds are kept "
    "(1040-SR, 1099-MISC, 1099-NEC, 1099-DA, 1099-G, W-2, course-related, "
    "nonqualified, nongovernmental).",
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
      f"{len([b for b in blocks if b['type'] == 'heading'])} headings, "
      f"{len(review_notes)} review notes")
