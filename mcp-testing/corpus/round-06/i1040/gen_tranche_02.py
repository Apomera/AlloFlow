#!/usr/bin/env python3
"""Author tranche 2 of the i1040 rebuild: printed pages 6-7, "What's New".

Method (mcp-testing/corpus/round-06/i1040/SESSION-LOG.md):
  * structure + reading order from page_text.cjs, which now orders the three
    columns correctly (the round-7 prose-column fix; before it, these two
    pages interleaved mid-sentence and were unauthorable);
  * page images from render_pages.cjs with modern pdfjs-dist, used to confirm
    the full-width banner, the run-in heading style, and which phrases are
    italic or bold-italic;
  * link hrefs from the PDF's own Link ANNOTATIONS, not guessed from the text
    (each wraps across two lines, so pdf.js reports two rects per logical
    link: irs.gov/form1040, irs.gov/directpay, irs.gov/payments,
    irs.gov/modernpayments; page 7 carries none).

The document header is copied from tranche 1 so the merge cannot drift.

Usage: python gen_tranche_02.py [out.json]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-02-pages-6-7.json")

blocks = []


def heading(text, page, level=3):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page, runs=None):
    block = {"type": "paragraph", "text": text, "source_page": page}
    if runs:
        block["runs"] = runs
        joined = "".join(run["text"] for run in runs)
        assert joined == text, f"runs do not reproduce the text:\n{joined!r}\n{text!r}"
    blocks.append(block)


def bullets(items, page, item_runs=None):
    block = {"type": "list", "ordered": False, "items": items, "source_page": page}
    if item_runs:
        assert len(item_runs) == len(items), "item_runs must have one entry per item"
        for runs, item in zip(item_runs, items):
            joined = "".join(run["text"] for run in runs)
            assert joined == item, f"item runs do not reproduce the item:\n{joined!r}\n{item!r}"
        block["item_runs"] = item_runs
    blocks.append(block)


def lead(bold_lead, rest):
    """A bullet whose bold-italic run-in phrase is marked strong."""
    return [
        {"text": bold_lead, "style": "strong"},
        {"text": rest, "style": "normal"},
    ]


# ── page 6 ───────────────────────────────────────────────────────────────────
heading("What’s New", 6, level=2)

banner = (
    "For information about any additional changes to the 2025 tax law or any "
    "other developments affecting Form 1040 or 1040-SR or the instructions, go "
    "to IRS.gov/Form1040."
)
para(banner, 6, runs=[
    {"text": banner[: banner.index("IRS.gov/Form1040")], "style": "normal"},
    {"text": "IRS.gov/Form1040", "style": "normal", "href": "https://www.irs.gov/form1040"},
    {"text": ".", "style": "normal"},
])

heading("Trump accounts and new Form 4547", 6)
para(
    "Recent legislation allows parents, guardians, and other authorized "
    "individuals to elect to establish a new type of individual retirement "
    "account, called a Trump account, for the exclusive benefit of certain "
    "children. If the child was born after 2024 and before 2029, is a U.S. "
    "citizen, and meets certain other requirements, the authorized individual "
    "may also elect to receive a $1,000 pilot program contribution to the "
    "child’s Trump account. Both elections can be made on Form 4547, which "
    "can be filed at the same time as the authorized individual’s 2025 "
    "income tax return. For more information on Trump accounts, and to learn "
    "how to make these elections, see Form 4547 and its instructions.",
    6,
)

heading("Standard deduction amount increased", 6)
para("For 2025, the standard deduction amount has been increased for all filers. The amounts are:", 6)
bullets(
    [
        "$15,750–Single or Married filing separately.",
        "$31,500–Married filing jointly or Qualifying surviving spouse.",
        "$23,625–Head of household.",
    ],
    6,
)

heading("Higher catch-up contribution limit for ages 60 to 63", 6)
para(
    "If, at the end of 2025, you were at least age 60, but younger than age 64, "
    "and you participated in a deferred compensation plan (including most "
    "401(k), 403(b), governmental 457 plans, and the governmental Thrift "
    "Savings Plan), a higher catch-up contribution limit may apply to you. For "
    "2025, this higher catch-up contribution limit is $11,250 ($5,250 for "
    "section 401(k)(11) and SIMPLE plans). For more information, contact your "
    "plan administrator.",
    6,
)

heading("Main home was in the U.S.", 6)
para(
    "If your main home (and spouse if filing a joint return) was in the U.S. "
    "for over half of 2025, check the box on the front of Form 1040 or 1040-SR. "
    "Providing this information will help the IRS determine your eligibility "
    "for certain tax benefits, including the earned income credit.",
    6,
)

heading("Changes to the Dependents section", 6)
dependents = (
    "The Dependents section now has numbered rows and asks for more information "
    "about you and your dependents. This new information is being asked to help "
    "the IRS determine your eligibility for certain tax benefits, including the "
    "child tax credit, the credit for other dependents, and the earned income "
    "credit."
)
para(dependents, 6, runs=[
    {"text": "The ", "style": "normal"},
    {"text": "Dependents", "style": "emphasis"},
    {"text": dependents[len("The Dependents"):], "style": "normal"},
])

heading("Write-in information", 6)
para(
    "Beginning in 2025, most of the words, codes, and/or dollar amounts that "
    "are used to explain an item of income or deduction, and that you "
    "previously had to enter next to a specific line, now have a dedicated "
    "checkbox or entry space.",
    6,
)

heading("Death of a taxpayer", 6)
death = (
    "If you need to file a return for someone who died before filing a 2025 "
    "return, check the “Deceased” box at the top of Form 1040 or "
    "1040-SR and enter the date of death. For more information, see Death of a "
    "Taxpayer."
)
para(death, 6, runs=[
    {"text": death[: death.index("Death of a Taxpayer")], "style": "normal"},
    {"text": "Death of a Taxpayer", "style": "emphasis"},
    {"text": ".", "style": "normal"},
])

heading("Contributions to a governmental paid family leave program", 6)
para(
    "Beginning in 2025, if you made contributions to a governmental paid family "
    "leave program, you will now include the full amount of those contributions "
    "in your income. If you itemize your deductions on Schedule A, you can "
    "include the amounts contributed as part of the state and local taxes that "
    "you paid.",
    6,
)

heading("Form 1099-DA", 6)
para(
    "If, in 2025, you used a broker to effect the sale of a digital asset, your "
    "broker should send you a Form 1099-DA that reports information regarding "
    "the transaction. In 2025, your broker has the option to report your basis "
    "in the digital asset on Form 1099-DA but is not required to do so. If your "
    "broker did not report your basis on Form 1099-DA, you will need to use "
    "your own books and records to determine your basis. As a reminder, you "
    "must answer the digital asset question on Form 1040 whether or not you "
    "received a Form 1099-DA, and you must report gain or loss from the "
    "transaction with respect to the digital assets (see line 7(a)). For more "
    "information, see the Instructions for Form 1099-DA.",
    6,
)

heading("Electronic payments and direct deposit", 6)
payments_head = (
    "If you have access to U.S. banking services or electronic payments "
    "systems, you should use direct deposit for any refunds. The IRS "
    "recommends paying electronically whenever possible. Options to pay "
    "electronically include using your bank account with "
)
payments_mid = ", your debit or credit card, your digital wallet, or your online account. Go to "
payments_tail = " to see all your payment options. Also, see "
payments = payments_head + "Direct Pay" + payments_mid + "IRS.gov/Payments" + payments_tail + "ModernPayments."
para(payments, 6, runs=[
    {"text": payments_head, "style": "normal"},
    {"text": "Direct Pay", "style": "normal", "href": "https://www.irs.gov/directpay"},
    {"text": payments_mid, "style": "normal"},
    {"text": "IRS.gov/Payments", "style": "normal", "href": "https://www.irs.gov/payments"},
    {"text": payments_tail, "style": "normal"},
    {"text": "ModernPayments", "style": "normal", "href": "https://www.irs.gov/modernpayments"},
    {"text": ".", "style": "normal"},
])

heading("New deductions for itemizers and non-itemizers", 6)
para(
    "Recent legislation provided for four new deductions that take effect "
    "beginning in 2025. If you are eligible, you can claim these deductions if "
    "you take the standard deduction or if you itemize on Schedule A. For more "
    "information on these deductions, see the instructions for Schedule 1-A. "
    "The new deductions are as follows.",
    6,
)
tips_rest = (
    " You may be eligible to take a deduction for qualified tips paid to you in "
    "2025. You can’t deduct more than $25,000 of those tips. Your deduction "
    "will be limited if your modified adjusted gross income is more than "
    "$150,000 ($300,000 if married filing jointly). To be eligible, you and/or "
    "your spouse who received the tips must have a valid SSN. If you are "
    "married, you must file a joint return."
)
overtime_rest = (
    " If you earned qualified overtime, you may be eligible to deduct up to "
    "$12,500 ($25,000 if married filing jointly) of your qualified overtime "
    "compensation. Your deduction will be limited if your modified adjusted "
    "gross income is more than $150,000 ($300,000 if married filing jointly). "
    "To be eligible, you and/or your spouse who received the overtime must have "
    "a valid SSN. If you are married, you must file a joint return."
)
carloan_rest = (
    " If you paid or accrued qualified passenger vehicle loan interest on a "
    "vehicle you purchased in 2025 for personal use, you may be eligible to "
    "deduct up to $10,000 of that interest. Your deduction will be limited if "
    "your modified adjusted gross income is more than $100,000 ($200,000 if "
    "married filing jointly)."
)
# This bullet runs across the 6-7 page break; both pages are inside this
# tranche, so it is authored whole and attributed to the page it starts on.
seniors_rest = (
    " If you were born before January 2, 1961, you may be eligible for an "
    "enhanced deduction for seniors. Your deduction will be limited if your "
    "modified adjusted gross income is more than $75,000 ($150,000 if married "
    "filing jointly). To be eligible, you and/or your spouse must have a valid "
    "SSN. If you are married, you must file a joint return. The maximum amount "
    "of the deduction is $6,000 ($12,000 if both spouses are eligible)."
)
bullets(
    [
        "No tax on tips." + tips_rest,
        "No tax on overtime." + overtime_rest,
        "No tax on car loan interest." + carloan_rest,
        "Enhanced deduction for seniors." + seniors_rest,
    ],
    6,
    item_runs=[
        lead("No tax on tips.", tips_rest),
        lead("No tax on overtime.", overtime_rest),
        lead("No tax on car loan interest.", carloan_rest),
        lead("Enhanced deduction for seniors.", seniors_rest),
    ],
)

# ── page 7 ───────────────────────────────────────────────────────────────────
heading("New Schedule 1-A", 7)
para(
    "A new schedule to Form 1040, Schedule 1-A, has been created for taxpayers "
    "to claim a deduction for the recently enacted deductions for no tax on "
    "tips, no tax on overtime, no tax on car loan interest, and the enhanced "
    "deduction for seniors. For more information, see the instructions for "
    "Schedule 1-A.",
    7,
)

heading("State and local tax deduction limit increased", 7)
para(
    "The overall limit on the deduction for state and local income, sales, and "
    "property taxes has increased to $40,000 ($20,000 if married filing "
    "separately). The overall limit is reduced if your modified adjusted gross "
    "income is more than $500,000 ($250,000 if married filing separately) but "
    "will not be reduced below $10,000 ($5,000 if married filing separately). "
    "For more information, see the Instructions for Schedule A.",
    7,
)

heading("Changes to the child tax credit and additional child tax credit", 7)
para(
    "Recent legislation made permanent the increase to the child tax credit "
    "(CTC) and additional child tax credit (ACTC) amount. For 2025, the maximum "
    "CTC has increased to $2,200 per qualifying child, of which $1,700 can be "
    "claimed for the ACTC. In addition, beginning in 2025, to be eligible to "
    "claim the CTC or ACTC, you must have a valid SSN, which means it must be "
    "valid for employment and issued before the due date of your return "
    "(including extensions). If you are filing a joint return, only one spouse "
    "is required to have a valid SSN in order to be eligible for the CTC and "
    "ACTC. The other spouse must have either an SSN or ITIN, and it must have "
    "been issued on or before the due date of the return (including "
    "extensions).",
    7,
)

heading("Changes to the adoption credit", 7)
para("Recent legislation made changes to the adoption credit. Beginning in 2025:", 7)
refundable_rest = (
    " Up to $5,000 of your adoption credit may be refundable. The amount of the "
    "refundable portion is determined separately for each eligible child."
)
parity_rest = (
    " Tribal governments now have parity for special needs adoption "
    "determinations. This means that state government and Indian tribal "
    "government determinations of special needs are both recognized for "
    "purposes of the adoption credit."
)
bullets(
    [
        "Up to $5,000 of adoption credit is refundable." + refundable_rest,
        "Parity for Indian tribal governments." + parity_rest,
    ],
    7,
    item_runs=[
        lead("Up to $5,000 of adoption credit is refundable.", refundable_rest),
        lead("Parity for Indian tribal governments.", parity_rest),
    ],
)
para("For more information, see Form 8839 and its instructions.", 7)

heading("Election to pay tax on farmland sale or exchange in installments", 7)
para(
    "If your tax year began after July 4, 2025, and you sold or exchanged "
    "qualified farmland to a qualified farmer after that date, you can elect to "
    "pay the net income tax liability on the sale or exchange in four equal "
    "installments. For more information, see the instructions for Schedule 3. "
    "Also, see Form 1062 and its instructions.",
    7,
)

heading("Domestic research and experimental expenditures", 7)
para(
    "Beginning in 2025, taxpayers are allowed to deduct domestic research or "
    "experimental expenditures. Alternatively, taxpayers may elect to charge "
    "their domestic research or experimental expenditures to a capital account "
    "and deduct them ratably over a period of not less than 60 months "
    "(beginning with the month in which the taxpayers first realize the "
    "benefits from such expenditures).",
    7,
)

heading("Updated reporting requirements for Form 1099-K", 7)
para(
    "Payment card companies, payment apps, and online marketplaces will be "
    "required to send you a Form 1099-K only if the amount of your business "
    "transactions during the year is more than $20,000 and the total number of "
    "your transactions is more than 200.",
    7,
)

heading("New option for scheduled appointments at Taxpayer Assistance Centers (TAC)", 7)
para(
    "Beginning in 2025, taxpayers with scheduled appointments at TACs may "
    "choose to receive appointment confirmations, reminders, and cancellation "
    "notices directly via text message on their mobile devices.",
    7,
)

review_notes = [
    "TRANCHE 2 OF A MULTI-SESSION REBUILD. This plan covers printed pages 6-7 "
    "(the complete “What’s New” section) of a 126-page document. It "
    "carries no document title by design: only tranche 1 does, so this file "
    "validates through merge-plans rather than standalone. No partial rebuild "
    "is delivered.",
    "RUN-IN HEADINGS PROMOTED. Every What’s New item begins with a bold "
    "run-in phrase followed by its prose in the same paragraph. Each is "
    "authored as a level-3 heading, with the trailing period dropped, so the "
    "section is navigable by heading rather than being 19 unlabelled "
    "paragraphs. No wording is added or removed.",
    "SOFT HYPHENS REMOVED. These pages are justified three-column type, so "
    "words break across lines with real hyphen glyphs in the text layer "
    "(“guard-ians”, “individu-al”, “expendi-tures”). "
    "Line-break hyphens are closed up; genuine compound hyphens are kept "
    "(1040-SR, catch-up, non-itemizers, Form 1099-DA, Form 1099-K, "
    "Schedule 1-A, Write-in).",
    "LINK TARGETS FROM ANNOTATIONS. The four hyperlinks (IRS.gov/Form1040, "
    "Direct Pay, IRS.gov/Payments, ModernPayments) take their URLs from the "
    "PDF’s own Link annotations, not from the visible text. Each wraps "
    "across two lines and so appears as two annotation rectangles in the "
    "source; each is authored as one link. Page 7 has no links.",
    "BANNER PLACEMENT. Page 6 opens with a full-width banner ( “For "
    "information about any additional changes…” ) set beside the "
    "section title, above the three columns. It is authored as the first "
    "paragraph of the section, which is its reading order.",
    "ITALIC CROSS-REFERENCES MARKED. Italicised references to other parts of "
    "the instructions (Death of a Taxpayer) and to the form’s Dependents "
    "section are marked as emphasis, matching the source’s use of italics "
    "for internal references.",
    "BOLD-ITALIC LEAD-INS MARKED STRONG. The bulleted new deductions and "
    "adoption-credit changes lead with bold-italic phrases. The plan schema’s "
    "inline styles are normal, emphasis, and strong with no combined value, so "
    "these are marked strong.",
    "PAGE FURNITURE OMITTED. The printed page numbers (6, 7) are dropped, and "
    "so are the invisible production lines every page carries "
    "(“Fileid: … MUST be removed before printing” plus cycle and "
    "date), which are print-shop control text rather than document content.",
    "PAGE-BREAK SPANNING ITEM. The “Enhanced deduction for seniors” "
    "bullet begins on page 6 and finishes on page 7. Both pages are inside this "
    "tranche, so it is authored as one whole item attributed to page 6.",
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
