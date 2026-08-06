#!/usr/bin/env python3
"""Author tranche 59 of the i1040 rebuild: printed pages 120-121 — the
Disclosure, Privacy Act, and Paperwork Reduction Act Notice, and the Estimated
Average Taxpayer Burden table.

Usage: python gen_tranche_59.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-59-pages-120-121.json")

MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")
FORMS_COMMENTS = "https://www.irs.gov/formscomments"

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


def heading(text, level, page):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


heading("Disclosure, Privacy Act, and Paperwork Reduction Act Notice", 2, 120)
para(
    "The IRS Restructuring and Reform Act of 1998, the Privacy Act of 1974, "
    "and the Paperwork Reduction Act of 1980 require that when we ask you for "
    "information we must first tell you our legal right to ask for the "
    "information, why we are asking for it, and how it will be used. We must "
    "also tell you what could happen if we do not receive it and whether your "
    "response is voluntary, required to obtain a benefit, or mandatory under "
    "the law.",
    120,
)
para(
    "This notice applies to all records and other material (in paper or "
    "electronic format) you file with us, including this tax return. It also "
    "applies to any questions we need to ask you so we can complete, correct, "
    "or process your return; figure your tax; and collect tax, interest, or "
    "penalties.",
    120,
)
para(
    "Our legal right to ask for information is Internal Revenue Code sections "
    "6001, 6011, and 6012(a), and their regulations. They say that you must "
    "file a return or statement with us for any tax you are liable for. Your "
    "response is mandatory under these sections. Code section 6109 requires "
    "you to provide your identifying number on the return. This is so we know "
    "who you are, and can process your return and other papers. You must fill "
    "in all parts of the tax form that apply to you. But you do not have to "
    "check the boxes for the Presidential Election Campaign Fund or for the "
    "third-party designee. You also do not have to provide your daytime phone "
    "number or email address.",
    120,
)
para(
    "You are not required to provide the information requested on a form that "
    "is subject to the Paperwork Reduction Act unless the form displays a "
    "valid OMB control number. Books or records relating to a form or its "
    "instructions must be retained as long as their contents may become "
    "material in the administration of any Internal Revenue law.",
    120,
)
para(
    "We ask for tax return information to carry out the tax laws of the United "
    "States. We need it to figure and collect the right amount of tax.",
    120,
)
# Runs from column 1 into column 2; the folio sits between the two halves in
# the column flow and is dropped as furniture.
para(
    "If you do not file a return, do not provide the information we ask for, "
    "or provide fraudulent information, you may be charged penalties and be "
    "subject to criminal prosecution. We may also have to disallow the "
    "exemptions, exclusions, credits, deductions, or adjustments shown on the "
    "tax return. This could make the tax higher or delay any refund. Interest "
    "may also be charged.",
    120,
)
para(
    "Generally, tax returns and return information are confidential, as stated "
    "in Code section 6103. However, Code section 6103 allows or requires the "
    "Internal Revenue Service to disclose or give the information shown on "
    "your tax return to others as described in the Code. For example, we may "
    "disclose your tax information to the Department of Justice to enforce the "
    "tax laws, both civil and criminal, and to cities, states, the District of "
    "Columbia, and U.S. commonwealths or territories to carry out their tax "
    "laws. We may disclose your tax information to the Department of Treasury "
    "and contractors for tax administration purposes; and to other persons as "
    "necessary to obtain information needed to determine the amount of or to "
    "collect the tax you owe. We may disclose your tax information to the "
    "Comptroller General of the United States to permit the Comptroller "
    "General to review the Internal Revenue Service. We may disclose your tax "
    "information to committees of Congress; federal, state, and local child "
    "support agencies; and to other federal agencies for the purposes of "
    "determining entitlement for benefits or the eligibility for and the "
    "repayment of loans. We may also disclose this information to other "
    "countries under a tax treaty, to federal and state agencies to enforce "
    "federal nontax criminal laws, or to federal law enforcement and "
    "intelligence agencies to combat terrorism.",
    120,
)
para(
    "Please keep this notice with your records. It may help you if we ask you "
    "for other information. If you have questions about the rules for filing "
    "and giving information, please call or visit any Internal Revenue Service "
    "office.",
    120,
)

heading("We Welcome Comments on Forms", 3, 120)
para(
    "We try to create forms and instructions that can be easily understood. "
    "Often this is difficult to do because our tax laws are very complex. For "
    "some people with income mostly from wages, filling in the forms is easy. "
    "For others who have businesses, pensions, stocks, rental income, or other "
    "investments, it is more difficult.",
    120,
)
# Runs from column 2 into column 3.
para(
    "If you have suggestions for making these forms simpler, we would be happy "
    f"to hear from you. You can send us comments through "
    f"[[«IRS.gov/FormsComments»|{FORMS_COMMENTS}]]. Or you can send your "
    "comments to Internal Revenue Service, Tax Forms and Publications "
    "Division, 1111 Constitution Ave. NW, IR-6526, Washington, DC 20224. Don’t "
    "send your return to this address. Instead, see the addresses at the end "
    "of these instructions.",
    120,
)
para(
    "Although we can’t respond individually to each comment received, we do "
    "appreciate your feedback and will consider your comments as we revise our "
    "tax forms and instructions.",
    120,
)

heading("Estimates of Taxpayer Burden", 3, 120)
para(
    "The following table shows burden estimates based on current statutory "
    "requirements as of October 1, 2025, for taxpayers filing a 2025 Form 1040 "
    "or 1040-SR tax return. Time spent and out-of-pocket costs are presented "
    "separately. Time burden is broken out by taxpayer activity, with "
    "recordkeeping representing the largest component. Out-of-pocket costs "
    "include any expenses incurred by taxpayers to prepare and submit their "
    "tax returns. Examples include tax return preparation and submission fees, "
    "postage and photocopying costs, and tax return preparation software "
    "costs. While these estimates don’t include burden associated with "
    "post-filing activities, IRS operational data indicate that electronically "
    "prepared and filed returns have fewer arithmetic errors, implying lower "
    "post-filing burden.",
    120,
)
para(
    "Reported time and cost burdens are national averages and don’t "
    "necessarily reflect a “typical” case. Most taxpayers experience lower "
    "than average burden, with taxpayer burden varying considerably by "
    "taxpayer type. For instance, the estimated average time burden for all "
    "taxpayers filing a Form 1040 or 1040-SR is 12 hours, with an average cost "
    "of $290 per return. This average includes all associated forms and "
    "schedules, across all tax return preparation methods and taxpayer "
    "activities.",
    120,
)
# Spans the 120-121 break and is authored whole at page 120.
para(
    "Within this estimate, there is significant variation in taxpayer "
    "activity. For example, nonbusiness taxpayers are expected to have an "
    "average burden of about 8 hours and $160, while business taxpayers are "
    "expected to have an average burden of about 21 hours and $610. Similarly, "
    "tax return preparation fees and other out-of-pocket costs vary "
    "extensively depending on the tax situation of the taxpayer, the type of "
    "software or professional preparer used, and the geographic location.",
    120,
)
para(
    "For more information on taxpayer burden, see Pub. 5743. If you have "
    "comments concerning the time and cost estimates below, you can contact us "
    "at either one of the addresses shown under «We Welcome Comments on "
    "Forms».",
    121,
)

heading("Estimated Average Taxpayer Burden for Individuals by Activity", 3, 121)
blocks.append({
    "type": "table",
    "caption": (
        "Estimated Average Taxpayer Burden for Individuals by Activity. The "
        "printed table groups columns 3 through 8 under a spanning “Average "
        "Burden” head, and columns 3 through 7 under “Average Time (Hours)”; "
        "those group names are folded into each column name here because the "
        "plan's table has one header row. “Type of taxpayer” is a grouping row "
        "with no figures of its own, as printed. Footnotes follow the table."
    ),
    "columns": [
        "Type of Taxpayer",
        "Percentage of Returns",
        "Average Time (Hours): Total Time*",
        "Average Time (Hours): Recordkeeping",
        "Average Time (Hours): Tax Planning",
        "Average Time (Hours): Form Completion and Submission",
        "Average Time (Hours): All Other",
        "Average Cost (Dollars)**",
    ],
    "rows": [
        ["All taxpayers", "100%", "12", "5", "2", "4", "1", "$290"],
        ["Type of taxpayer", "", "", "", "", "", "", ""],
        ["Nonbusiness***", "71%", "8", "3", "1", "3", "1", "160"],
        ["Business***", "29%", "21", "10", "4", "5", "2", "610"],
    ],
    "row_headers": True,
    "source_page": 121,
})
para("* Detail may not add to total time due to rounding.", 121)
para("** Dollars rounded to the nearest $10.", 121)
para(
    "*** You are considered a “business” filer if you file one or more of the "
    "following with Form 1040 or 1040-SR: Schedule C, E, or F or Form 2106. "
    "You are considered a “nonbusiness” filer if you don’t file any of those "
    "schedules or forms with Form 1040 or 1040-SR.",
    121,
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 59 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "120-121: the Disclosure, Privacy Act, and Paperwork Reduction Act Notice, "
    "and the Estimated Average Taxpayer Burden table. It carries no document "
    "title by design — only tranche 1 does — so this file validates through "
    "merge-plans rather than standalone. No partial rebuild is delivered.",

    "PAGE 121's READING ORDER WAS REBUILT FROM GEOMETRY. The column detector "
    "reports **1 column** for it and interleaves all three: “about 21 hours "
    "and $610. Similarly, tax preparer used, and the geographic loca- ments "
    "concerning the time and cost esti- return preparation fees and other "
    "tion.” The page is three short columns of prose above a full-width table, "
    "and only nine text lines sit above the table — too little for the "
    "splitter to find a gutter. Each column was banded and read top to bottom "
    "instead. Page 120 by contrast reports 4 columns and is correct: a title "
    "band over three columns, which is the round-9 peel working.",

    "TWO PARAGRAPHS SPAN COLUMN BREAKS AND ONE SPANS THE PAGE BREAK, all "
    "authored whole. “If you do not file a return…” runs from page 120's "
    "column 1 into column 2 with the FOLIO sitting between its halves in the "
    "column flow; “If you have suggestions for making these forms simpler…” "
    "runs from column 2 into column 3; and “Within this estimate…” runs from "
    "page 120's last column onto page 121. Nothing is carried out of this "
    "tranche — page 122 opens “Major Categories of Federal Income and "
    "Outlays”.",

    "THE BURDEN TABLE HAS A TWO-LEVEL SPANNING HEADER AND THE PLAN'S TABLE "
    "HAS ONE HEADER ROW. The printed table groups columns 3-8 under “Average "
    "Burden” and columns 3-7 under “Average Time (Hours)”. Those group names "
    "are FOLDED INTO each column name (“Average Time (Hours): Recordkeeping”) "
    "rather than dropped, because a reader of the flat table would otherwise "
    "have no way to know that “Recordkeeping” is measured in hours. The fold "
    "is disclosed in the caption.",

    "“Type of taxpayer” IS KEPT AS A ROW WITH NO FIGURES, as printed. It is a "
    "grouping label that introduces the Nonbusiness/Business breakdown below "
    "the All-taxpayers total, and it carries no numbers in the source. Its "
    "seven empty cells are the same shape that failed PDF/UA-1 clause 7.2 "
    "twenty-two times in the 2026-08-05 end-to-end run and is now fixed in the "
    "renderer; the cells stay empty because that is what the table prints.",

    "THE THREE FOOTNOTES ARE PARAGRAPHS AFTER THE TABLE, not rows — they are "
    "printed full width below the table frame and belong to no row, as in "
    "tranches 44, 45, 48, and 54. A space was added after each asterisk marker "
    "(“*Detail” → “* Detail”) so the marker reads as a marker rather than "
    "running into the word; that is the only punctuation change on these two "
    "pages and it adds no content.",

    "ONE LINK, read from its annotation rect: “IRS.gov/FormsComments” → "
    "https://www.irs.gov/formscomments. It is set in the italic face, so it is "
    "authored as an italic link with the [[«text»|url]] form. All five "
    "contractions across the two pages are curly. PAGE FURNITURE OMITTED: both "
    "printed page numbers. Soft hyphens removed and line-break hyphens closed "
    "(“for-mat” → “format”, “Comptrol-ler” → “Comptroller”, “intelli-gence” → "
    "“intelligence”), while genuine compounds are kept (1040-SR, IR-6526, "
    "out-of-pocket, post-filing, third-party, nontax).",
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

print(f"wrote {OUT}: {len(blocks)} blocks, pages 120-121, {len(review_notes)} review notes")
