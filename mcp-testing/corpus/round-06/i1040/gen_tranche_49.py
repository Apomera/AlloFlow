#!/usr/bin/env python3
"""Author tranche 49 of the i1040 rebuild: printed page 109 — Schedule 1-A
Part IV, No Tax on Car Loan Interest: the VIN requirement, the deduction
limits, what qualifies as QPVLI, and what counts as an applicable passenger
vehicle and personal use.

Usage: python gen_tranche_49.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-49-pages-109-109.json")

PAGE = 109
MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

VIN_DECODER = "https://vpic.nhtsa.dot.gov/decoder/"

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


heading("Part IV. No Tax on Car Loan Interest", 3)
para(
    "You may be able to claim a deduction if you and/or your spouse paid or "
    "accrued qualified passenger vehicle loan interest (QPVLI) (see «Qualified "
    "passenger vehicle loan interest», later) in 2025. You can claim this "
    "deduction whether you claim the standard deduction or itemize deductions "
    "on Schedule A (Form 1040)."
)
para("Fill out Schedule 1-A, Part IV, only if you paid or accrued QPVLI in 2025.")

heading("VIN required on your return", 4)
para(
    "In order to take the QPVLI deduction, you must include the vehicle "
    "identification number (VIN) of the purchased applicable passenger vehicle "
    "(APV) (see «Applicable passenger vehicle», later) on your tax return. If "
    "you paid QPVLI allocable to multiple APVs, include the VIN of each APV."
)
para(
    "If the purchased APV was replaced due to an unforeseen intervening event "
    "(for example, a defective APV was replaced under a state lemon law), "
    "include the VIN of the substitute APV. For more information, see Proposed "
    "Regulations section 1.163-16(c)(3)(ii)."
)

heading("Maximum amount of deduction", 4)
para(
    "You can’t deduct more than $10,000 of the QPVLI you paid or accrued in "
    "2025."
)
para(
    "The amount of the QPVLI deduction (after applying the $10,000 limit) is "
    "reduced if your MAGI is greater than the amount shown next to your filing "
    "status below."
)
listing([
    "Married filing jointly—$200,000.",
    "All other filing statuses—$100,000.",
], ordered=False)
para("Your MAGI is the amount on line 3 in Part I of Schedule 1-A.")

heading("Qualified passenger vehicle loan interest", 4)
para(
    "To qualify for the QPVLI deduction, the interest must be paid or accrued "
    "on a loan that generally meets all the following requirements."
)
# The printed "1." through "5." are not carried as literal text; the ordered
# list generates them. The enumeration is load-bearing - "Change in obligor"
# below refers to "requirements 1 through 5".
listing([
    "Your loan was originated after December 31, 2024.",
    "The loan was originated by you.",
    "The proceeds from your loan were used to purchase an APV (lease payments "
    "do not qualify).",
    "Your APV is for personal use (which means you don’t expect it to be used "
    "predominantly for business or commercial use. See «Personal use», later).",
    "Your loan is secured by a first lien on the purchased APV.",
], ordered=True)

heading("Change in obligor by reason of previous obligor’s death", 5)
para(
    "The obligor on the loan is generally the person responsible for paying "
    "the loan. If a loan met requirements 1 through 5 at the time it was "
    "originated by a previous obligor, and you became the obligor by reason of "
    "a previous obligor’s death, interest paid by you on the loan is generally "
    "QPVLI if the loan continues to be secured by a first lien on the "
    "purchased APV. A change in obligor by reason of a previous obligor’s "
    "death could occur, for example, when you inherit an APV subject to a loan "
    "originated by the person who died. See Proposed Regulation section "
    "1.163-16(d)(5)."
)

heading("Loan amount", 5)
para(
    "Indebtedness that can be counted for purposes of determining QPVLI "
    "includes indebtedness incurred to finance the purchase price of the APV, "
    "as well as items or amounts that are customarily financed in an APV "
    "purchase transaction and that are directly related to the purchased APV. "
    "For example, this includes vehicle service plans, extended warranties, "
    "sales tax, and vehicle-related fees. Interest on items and services not "
    "customarily financed in an APV purchase transaction and that are directly "
    "related to the purchased APV, such as liability insurance, a trailer, or "
    "amounts representing debt on a vehicle traded in as part of the purchase "
    "transaction for the APV (so-called negative equity), is not eligible for "
    "the deduction."
)

heading("Refinanced loan", 5)
para(
    "If your prior loan that had QPVLI is later refinanced, interest paid on "
    "the refinanced amount is generally eligible for the deduction, so long as "
    "the new loan is secured by a first lien on the APV with respect to which "
    "the refinanced loan was incurred. The loan amount is limited to the "
    "outstanding balance of the refinanced loan as of the date of the "
    "refinancing."
)

heading("Applicable passenger vehicle", 4)
para("In general, an APV is any vehicle that meets the following conditions:")
listing([
    "The original use of the vehicle starts with you (a used vehicle does not "
    "qualify),",
    "The vehicle is a motor vehicle manufactured primarily for use on public "
    "streets, roads, and highways (not including a vehicle operated "
    "exclusively on a rail or rails),",
    "The vehicle has at least 2 wheels,",
    "The vehicle is a car, minivan, van, SUV, pickup truck, or motorcycle, and "
    "has a gross vehicle weight rating of less than 14,000 pounds, and",
    "The vehicle has undergone final assembly in the United States.",
], ordered=False)

heading("Final assembly in the United States", 4)
para(
    "The location of final assembly will be listed on the vehicle information "
    "label attached to each vehicle on a dealer’s premises. You can rely on "
    "that information label. You can also rely on the vehicle’s plant of "
    "manufacture as reported in the VIN to determine whether the vehicle has "
    f"undergone final assembly in the United States. The [[VIN Decoder|{VIN_DECODER}]] "
    "website for the National Highway Traffic Safety Administration provides "
    "plant of manufacture information. You can follow the instructions on that "
    "website to see if your vehicle’s plant of manufacture is located in the "
    "United States."
)

heading("Personal use", 4)
para("Personal use means a use other than:")
listing([
    "Use in any trade or business (except for the use in the trade or business "
    "of performing services as an employee), or",
    "For the production of income.",
], ordered=False)
para(
    "You are considered to have purchased an APV for personal use if, at the "
    "time you incur a loan to purchase an APV, you expect that the APV will be "
    "used for personal use for more than 50% of the time by you and/or any "
    "combination of individuals with certain relationships to you, including "
    "your spouse; your or your spouse’s child, grandchild, father, mother, "
    "brother, or sister; as well as an individual who has the same main home "
    "as you and is a member of your household."
)

# Spans the 109-110 break: the last sentence is printed at the top of page 110.
# Authored whole here; tranche 50 must not repeat it.
heading("Example", 5)
para(
    "You purchase an APV that you expect to use to earn income as a driver for "
    "a rideshare service for 15% of the time you expect to own the APV. You "
    "expect to use the APV for personal use for the remaining 85% of the time. "
    "You are considered to have purchased your APV for personal use."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 49 OF A MULTI-SESSION REBUILD. This plan covers printed page 109, "
    "the opening of Schedule 1-A Part IV, No Tax on Car Loan Interest. It "
    "carries no document title by design — only tranche 1 does — so this file "
    "validates through merge-plans rather than standalone. No partial rebuild "
    "is delivered.",

    "NOTHING IS CARRIED IN. Page 108 closes on line 18's TIP box and this page "
    "opens a new Part. ONE BLOCK IS CARRIED OUT: the closing Example, whose "
    "last sentence — “You are considered to have purchased your APV for "
    "personal use.” — is printed at the top of page 110. It is authored whole "
    "here and tranche 50 must open at “Interest deducted elsewhere on your "
    "return instead of on Schedule 1-A”.",

    "THE SOURCE MARKS TWO LEVELS OF RUN-IN HEADING ON THIS PAGE, and this is "
    "the first page in the rebuild where the distinction is unambiguous. Six "
    "run-ins are set in face g_d0_f4 and start FLUSH at the column left (“VIN "
    "required on your return.”, “Maximum amount of deduction.”, “Qualified "
    "passenger vehicle loan interest.”, “Applicable passenger vehicle.”, "
    "“Final assembly in the United States.”, “Personal use.”); four are set in "
    "a DIFFERENT face, g_d0_f5, and are INDENTED by 12pt (“Change in obligor "
    "by reason of previous obligor’s death.”, “Loan amount.”, “Refinanced "
    "loan.”, “Example.”). Face and indentation agree, and so does the meaning: "
    "the indented four are subordinate to the flush ones above them — the "
    "first three sit under “Qualified passenger vehicle loan interest” and "
    "“Example.” under “Personal use”. Authored as level 4 and level 5 "
    "respectively, giving 3 → 4 → 5 with no skips.",

    "“Example.” IS A HEADING HERE, unlike the single run-in “Example.” in "
    "tranche 6. That one was left as a strong run-in because it illustrated a "
    "glossary entry rather than defining a term. On this page the source sets "
    "“Example.” IDENTICALLY to “Loan amount.” and “Refinanced loan.” — same "
    "face, same indent — and those are unambiguous section run-ins, so the "
    "typography decides it. The difference between the two tranches is the "
    "source's, not the rebuild's.",

    "THE FIVE REQUIREMENTS ARE AN ORDERED LIST AND THE ENUMERATION IS "
    "LOAD-BEARING: “Change in obligor” refers to “requirements 1 through 5”. "
    "The printed “1.”–“5.” are not carried as literal text, so the digits "
    "appear in the recall shortfall exactly as in tranches 29 and 47.",

    "ONE LINK ANNOTATION, read from the annotation rect rather than inferred: "
    "“VIN Decoder” → vpic.nhtsa.dot.gov/decoder. The two references to "
    "Proposed Regulations section 1.163-16 carry NO annotation and are left as "
    "plain text; inventing URLs for them would be fabrication. THREE ITALIC "
    "CROSS-REFERENCES are marked emphasis (“Qualified passenger vehicle loan "
    "interest”, “Applicable passenger vehicle”, “Personal use”), each pointing "
    "at a heading on this same page.",

    "PAGE FURNITURE OMITTED: the printed page number. Soft hyphens removed and "
    "line-break hyphens closed, while genuine compounds are kept (1-A, 1040, "
    "1.163-16, vehicle-related, so-called). The em dashes before the MAGI "
    "thresholds are the source's own.",
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
