#!/usr/bin/env python3
"""Author tranche 24 of the i1040 rebuild: printed page 83 — Amended Return,
Need a Copy of Your Tax Return Information?, Past Due Returns, and the opening
of How To Get Tax Help.

One page, but a dense and link-heavy one: 31 Link annotations, several of them
phrase links with no visible URL, and one whose target does not resemble its
visible text at all.

Usage: python gen_tranche_24.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-24-pages-83-83.json")

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


def heading(text, level, page=83):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page=83):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def bullets(items, page=83):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded],
             "source_page": page}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# NOTE: the records-retention paragraph that finishes at the top of this page
# was authored whole at page 82 in tranche 23 and is deliberately NOT repeated.

heading("Amended Return", 3)
para(
    "File Form 1040-X to change a return you already filed. Generally, to timely "
    "claim a refund on your amended return, Form 1040-X must be filed within 3 "
    "years after the date the original return was filed or within 2 years after "
    "the date the tax was paid, whichever is later. But you may have more time "
    "to file Form 1040-X if you live in a federally declared disaster area or "
    "you are physically or mentally unable to manage your financial affairs. See "
    "Pub. 556 for details."
)
para(
    "You can file Form 1040-X electronically with tax filing software to amend "
    "Forms 1040 and 1040-SR. See "
    "[[IRS.gov/Filing/Amended-Return-Frequently-Asked-Questions|https://www.irs.gov/filing/amended-return-frequently-asked-questions]] "
    "for more information."
)
para(
    "Use the [[Where’s My Amended Return|https://www.irs.gov/1040xstatus]] "
    "application on IRS.gov to track the status of your amended return. It can "
    "take up to 3 weeks from the date you mailed it to show up in our system."
)

heading("Need a Copy of Your Tax Return Information?", 3)
para(
    "Tax return transcripts are free and are generally used to validate income "
    "and tax filing status for mortgage applications, student and small business "
    "loan applications, and during tax return preparation. To get a free "
    "transcript:"
)
bullets([
    "Access your online account at [[IRS.gov/Account|https://www.irs.gov/account]],",
    "Visit [[IRS.gov/Transcript|https://www.irs.gov/transcript]],",
    "Use Form 4506-T or 4506T-EZ, or",
    "Call us at 800-908-9946.",
])
para(
    "If you need a copy of your actual tax return, use Form 4506. There is a fee "
    "for each return requested. See Form 4506 for the current fee. If your main "
    "home, principal place of business, or tax records are located in a "
    "federally declared disaster area, this fee will be waived."
)

heading("Past Due Returns", 3)
para(
    "If you or someone you know needs to file past due tax returns, go to "
    "[[Filing past due returns|https://www.irs.gov/Filingpastdue]] or "
    "[[IRS.gov/Individuals|https://www.irs.gov/individual-tax-filing]] for help "
    "in filing those returns. Send the return to the address that applies to you "
    "in the latest Form 1040 and 1040-SR instructions. For example, if you are "
    "filing a 2022 return in 2026 use the address at the end of these "
    "instructions. However, if you got an IRS notice, mail the return to the "
    "address in the notice."
)

heading("How To Get Tax Help", 2)
para(
    "If you have questions about a tax issue; need help preparing your tax "
    "return; or want to download free publications, forms, or instructions, go "
    "to [[IRS.gov|https://www.irs.gov/]] to find resources that can help you "
    "right away."
)

heading("Tax reform", 3)
para(
    "Tax reform legislation impacting federal taxes, credits, and deductions was "
    "enacted in P.L. 119-21, commonly known as the One Big Beautiful Bill Act, "
    "on July 4, 2025. Go to [[IRS.gov/OBBB|https://www.irs.gov/obbb]] for more "
    "information and updates on how this legislation affects your taxes."
)

heading("Preparing and filing your tax return", 3)
para(
    "After receiving all your wage and earnings statements (Forms W-2, W-2G, "
    "1099-R, 1099-MISC, 1099-NEC, etc.); unemployment compensation statements "
    "(by mail or in a digital format) or other government payment statements "
    "(Form 1099-G); and interest, dividend, and retirement statements from banks "
    "and investment firms (Forms 1099), you have several options to choose from "
    "to prepare and file your tax return. You can prepare the tax return "
    "yourself, see if you qualify for free tax preparation, or hire a tax "
    "professional to prepare your return."
)

heading("Free options for tax preparation", 3)
para(
    "Your options for preparing and filing your return online or in your local "
    "community, if you qualify, include the following."
)
bullets([
    "‹Free File.› This program lets you prepare and file your federal individual "
    "income tax return for free using software or Free File Fillable Forms. "
    "However, state tax preparation may not be available through Free File. Go "
    "to [[IRS.gov/FreeFile|https://www.irs.gov/freefile]] to see if you qualify "
    "for free online federal tax preparation, e-filing, and direct deposit or "
    "payment options.",

    "‹VITA.› The Volunteer Income Tax Assistance (VITA) program offers free tax "
    "help to people with low-to-moderate incomes, persons with disabilities, and "
    "limited-English-speaking taxpayers who need help preparing their own tax "
    "returns. Go to [[IRS.gov/VITA|https://www.irs.gov/vita]], download the free "
    "IRS2Go app, or call 800-906-9887 for information on free tax return "
    "preparation.",

    "‹TCE.› The Tax Counseling for the Elderly (TCE) program offers free tax "
    "help for all taxpayers, particularly those who are 60 years of age and "
    "older. TCE volunteers specialize in answering questions about pensions and "
    "retirement-related issues unique to seniors. Go to "
    "[[IRS.gov/TCE|https://www.irs.gov/tce]] or download the free IRS2Go app for "
    "information on free tax return preparation.",

    "‹MilTax.› Members of the U.S. Armed Forces and qualified veterans may use "
    "MilTax, a free tax service offered by the Department of Defense through "
    "Military OneSource. For more information, go to "
    "[[MilitaryOneSource|https://www.militaryonesource.mil/miltax]] "
    "([[MilitaryOneSource.mil/MilTax|https://www.militaryonesource.mil/miltax]]).",
])
para(
    "Also, the IRS offers Free Fillable Forms, which can be completed online and "
    "then e-filed regardless of income."
)

heading("Using online tools to help prepare your return", 3)
para("Go to [[IRS.gov/Tools|https://www.irs.gov/tools]] for the following.")
bullets([
    "The [[Earned Income Tax Credit Assistant|https://www.irs.gov/eitcassistant]] "
    "([[IRS.gov/EITCAssistant|https://www.irs.gov/eitcassistant]]) determines if "
    "you’re eligible for the earned income credit (EITC).",

    "The [[Online EIN Application|https://www.irs.gov/ein]] "
    "([[IRS.gov/EIN|https://www.irs.gov/ein]]) helps you get an employer "
    "identification number (EIN) at no cost.",

    "The [[Tax Withholding Estimator|https://www.irs.gov/W4app]] "
    "([[IRS.gov/W4App|https://www.irs.gov/w4app]]) makes it easier for you to "
    "estimate the federal income tax you want your employer to withhold from "
    "your paycheck. This is tax withholding. See how your withholding affects "
    "your refund, take-home pay, or tax due.",

    "The [[Sales Tax Deduction Calculator|https://www.irs.gov/salestax]] "
    "([[IRS.gov/SalesTax|https://www.irs.gov/salestax]]) figures the amount you "
    "can claim if you itemize deductions on Schedule A (Form 1040).",
])

heading("Getting answers to your tax questions", 3)
para(
    "On IRS.gov, you can get up-to-date information on current events and "
    "changes in tax law."
)
# This list runs across the 83->84 break; authored whole at its starting page,
# so the next tranche must not re-author the last two items.
bullets([
    "[[IRS.gov/Help|https://www.irs.gov/help]]: A variety of tools to help you "
    "get answers to some of the most common tax questions.",

    "[[IRS.gov/ITA|https://www.irs.gov/ita]]: The Interactive Tax Assistant, a "
    "tool that will ask you questions and, based on your input, provide answers "
    "on a number of tax topics.",

    "[[IRS.gov/Forms|https://www.irs.gov/forms]]: Find forms, instructions, and "
    "publications. You will find details on the most recent tax changes and "
    "interactive links to help you find answers to your questions.",

    "You may also be able to access tax information in your e-filing software.",
])

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 24 OF A MULTI-SESSION REBUILD. This plan covers printed page 83 "
    "only: Amended Return, Need a Copy of Your Tax Return Information?, Past Due "
    "Returns, and the opening of How To Get Tax Help. It carries no document "
    "title by design — only tranche 1 does — so this file validates through "
    "merge-plans rather than standalone. No partial rebuild is delivered.",

    "A ONE-PAGE TRANCHE because the page earns it: 31 Link annotations, three "
    "section headings, a top-level section opening halfway down, and six "
    "run-in-led topics with four embedded lists. Page 84 continues the same "
    "section and is a natural next tranche.",

    "“HOW TO GET TAX HELP” IS LEVEL 2 THOUGH IT IS PRINTED AT 14pt, the same "
    "size as the level-3 heads immediately above it (Amended Return, Past Due "
    "Returns). The page-2 table of contents lists it as a top-level entry "
    "alongside “What's New”, “Filing Requirements” and “Line Instructions”, "
    "while those neighbours are not listed at all. This is the same conflict "
    "“Assemble Your Return” posed in session 20 and is resolved the same way: "
    "type size states prominence, the TOC states structure, and where they "
    "disagree the TOC is the better evidence.",

    "THE RECORDS-RETENTION PARAGRAPH THAT FINISHES AT THE TOP OF THIS PAGE IS "
    "NOT REPEATED. It was authored whole at page 82 in tranche 23, as the "
    "handoff convention requires. A recall check on this page alone will "
    "therefore show “replacement property. For more details, see chapter 1 of "
    "Pub. 17.” as uncovered; it is covered by the previous tranche.",

    "THE LAST LIST RUNS ACROSS THE 83-84 BREAK AND IS AUTHORED WHOLE HERE. "
    "“Getting answers to your tax questions” has four items, two of which are "
    "printed on page 84. Splitting a four-item list at a page boundary would "
    "leave a reader with two orphaned fragments, so the whole list is authored "
    "at page 83 and the page-84 tranche must not re-author its last two items.",

    "EVERY LINK TARGET IS THE PDF'S OWN ANNOTATION, matched to its text by rect "
    "position, and this page shows why that is not optional. "
    "“IRS.gov/Individuals” resolves to irs.gov/individual-tax-filing, which no "
    "amount of reading the visible text would produce. Two are phrase links "
    "with no visible URL at all: “Where's My Amended Return” "
    "(irs.gov/1040xstatus) and “Filing past due returns” "
    "(irs.gov/Filingpastdue).",

    "FOUR TOOL NAMES ARE LINKED TWICE, and both links are kept. The source sets "
    "each as “The Earned Income Tax Credit Assistant (IRS.gov/EITCAssistant)” "
    "with the NAME and the PARENTHETICAL both carrying the same target. "
    "Collapsing them to one link would mean choosing which half to drop and "
    "rewriting the sentence; keeping both is faithful, and the mild redundancy "
    "of two adjacent links to one destination costs a screen-reader user far "
    "less than altered wording would.",

    "BOLD RUN-IN LEADS BECOME LEVEL-3 HEADINGS with the trailing period dropped "
    "(Tax reform, Preparing and filing your tax return, Free options for tax "
    "preparation, Using online tools to help prepare your return, Getting "
    "answers to your tax questions), so the directory of help options is "
    "navigable. Level 3 and not 4: they are the direct children of “How To Get "
    "Tax Help”, which is itself level 2, and merge-plans rejects the h2-to-h4 "
    "skip that level 4 would create. Bold leads INSIDE list items — Free File, VITA, TCE, MilTax — "
    "stay in the item and are marked strong, because promoting them would break "
    "the list they belong to.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: the printed page number "
    "and the standing “Need more information or forms? Visit IRS.gov.” footer. "
    "Soft hyphens removed and justified line-break hyphens closed, while genuine "
    "compounds are kept (1040-SR, 1099-MISC, low-to-moderate, "
    "limited-English-speaking, retirement-related, take-home, up-to-date, "
    "e-filing).",
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

links = sum(1 for b in blocks for r in b.get("runs", []) if r.get("href"))
links += sum(1 for b in blocks for item in (b.get("item_runs") or []) for r in item if r.get("href"))
print(f"wrote {OUT}: {len(blocks)} blocks, page 83, {links} links, "
      f"{len(review_notes)} review notes")
