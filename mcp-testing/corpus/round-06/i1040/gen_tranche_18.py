#!/usr/bin/env python3
"""Author tranche 18 of the i1040 rebuild: printed pages 61-62 — the last three
refundable credits (lines 28, 29, 30) and the start of the Refund section
(line 34, lines 35a-35d, direct deposit).

Back to hand-authored prose after the mechanical EIC Table. Three-column pages,
so the column-aware text (page_text.cjs) is the reading order and the per-item
geometry (page_items.cjs) supplies the heading structure.

Ends at page 62 by design: page 63 opens the direct-deposit MECHANICS (Form
8888, the sample check figure, lines 35b-35d, rejection reasons), which is a
different kind of content and carries the tranche's first real figure.

Usage: python gen_tranche_18.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-18-pages-61-62.json")

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


def heading(text, page, level):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body, page):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": page})


def bullets(items, page):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded], "source_page": page}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# ============================================================ page 61

heading("Line 28. Additional Child Tax Credit", 61, 4)
callout(
    "Caution.",
    "To claim the additional child tax credit, you must have a valid SSN, which "
    "means it must be valid for employment and issued before the due date of "
    "your return (including extensions). If you are filing a joint return, only "
    "one spouse is required to have a valid SSN in order to be eligible for the "
    "credit. The other spouse must have either an SSN or ITIN, and it must have "
    "been issued on or before the due date of the return.",
    61,
)
para(
    "See Schedule 8812 and its instructions for information on figuring and "
    "claiming any additional child tax credit that you may qualify to claim. If "
    "you are claiming the additional child tax credit, complete Schedule 8812 "
    "and attach it to your Form 1040 or 1040-SR.",
    61,
)
para(
    "If you ‹do not› want to claim the additional child tax credit, check the "
    "box on line 28.",
    61,
)

heading("Form 8862, who must file", 61, 5)
para(
    "You must file Form 8862 to claim the additional child tax credit if your "
    "child tax credit (refundable or nonrefundable depending on the tax year), "
    "additional child tax credit, or credit for other dependents for a year "
    "after 2015 was denied or reduced for any reason other than a math or "
    "clerical error. Attach a completed Form 8862 to your 2025 return to claim "
    "the credit for 2025. Don’t file Form 8862 if you filed Form 8862 for 2024 "
    "and the child tax credit, additional child tax credit, or credit for other "
    "dependents was allowed for that year. See Form 8862 and its instructions "
    "for details.",
    61,
)
callout(
    "Caution.",
    "If you claim the additional child tax credit even though you aren’t "
    "eligible and it is determined that your error is due to reckless or "
    "intentional disregard of the additional child tax credit rules, you won’t "
    "be allowed to take the child tax credit, the credit for other dependents, "
    "or the additional child tax credit for 2 years even if you’re otherwise "
    "eligible to do so. If you claim the additional child tax credit even "
    "though you aren’t eligible and it is later determined that you "
    "fraudulently claimed the credit, you won’t be allowed to take the child "
    "tax credit, the credit for other dependents, or the additional child tax "
    "credit for 10 years. You may also have to pay penalties.",
    61,
)
callout(
    "Tip.",
    "Refunds for returns claiming the additional child tax credit can’t be "
    "issued before mid-February 2026. This delay applies to the entire refund, "
    "not just the portion associated with the additional child tax credit.",
    61,
)

heading("Line 29. American Opportunity Credit", 61, 4)
para(
    "If you meet the requirements to claim an education credit (see the "
    "instructions for Schedule 3, line 3), enter on line 29 the amount, if any, "
    "from Form 8863, line 8. You may be able to increase an education credit "
    "and reduce your total tax or increase your tax refund if the student "
    "chooses to include all or part of a Pell grant or certain other "
    "scholarships or fellowships in income. See Pub. 970 and the Instructions "
    "for Form 8863 for more information.",
    61,
)

heading("Form 8862 required", 61, 5)
para(
    "You must file Form 8862 to claim the American opportunity credit if your "
    "American opportunity credit for a year after 2015 was denied or reduced "
    "for any reason other than a math or clerical error. Attach a completed "
    "Form 8862 to your 2025 return to claim the credit for 2025. Don’t file "
    "Form 8862 if you filed Form 8862 for 2024 and the American opportunity "
    "credit was allowed for that year. See Form 8862 and its instructions for "
    "details.",
    61,
)
callout(
    "Caution.",
    "If you claim the American opportunity credit even though you aren’t "
    "eligible and it is determined that your error is due to reckless or "
    "intentional disregard of the American opportunity credit rules, you won’t "
    "be allowed to take the credit for 2 years even if you’re otherwise "
    "eligible to do so. If you claim the American opportunity credit even "
    "though you aren’t eligible and it is determined that you fraudulently "
    "claimed the credit, you won’t be allowed to take the credit for 10 years. "
    "You may also have to pay penalties.",
    61,
)

heading("Line 30. Refundable Adoption Credit", 61, 4)
para(
    "See Form 8839 and its instructions for information on figuring any "
    "refundable adoption credit that you may be eligible to claim. If you are "
    "eligible to claim the refundable portion of the adoption credit, enter on "
    "line 30 the amount from Form 8839, line 13. You may also be eligible to "
    "claim a nonrefundable adoption credit on Schedule 3, line 6c. See the "
    "Instructions for Form 8839 for more information.",
    61,
)

heading("Refund", 61, 3)
heading("Line 34. Amount Overpaid", 61, 4)
para("If line 34 is under $1, we will send a refund only on written request.", 61)

heading("Refund Offset", 61, 5)
para(
    "If you owe past-due federal tax, state income tax, state unemployment "
    "compensation debts, child support, spousal support, or certain federal "
    "nontax debts, such as student loans, all or part of the overpayment on "
    "line 34 may be used (offset) to pay the past-due amount. Offsets for "
    "federal taxes are made by the IRS. All other offsets are made by the "
    "Treasury Department’s Bureau of the Fiscal Service. For federal tax "
    "offsets, you will receive a notice from the IRS. For all other offsets, "
    "you will receive a notice from the Fiscal Service. To find out if you may "
    "have an offset or if you have any questions about it, contact the agency "
    "to which you owe the debt.",
    61,
)

heading("Deposit Refund Into Multiple Accounts", 61, 5)
para(
    "If you want your refund to be split and direct deposited into more than "
    "one account, file Form 8888. Use Form 8888 to direct deposit your refund "
    "(or part of it) to one or more accounts in your name at a bank or other "
    "financial institution (such as a mutual fund, brokerage firm, or credit "
    "union) in the United States.",
    61,
)

# ============================================================ page 62

heading("Injured Spouse", 62, 5)
para(
    "If you file a joint return and your spouse hasn’t paid past-due federal "
    "tax, state income tax, state unemployment compensation debts, child "
    "support, spousal support, or a federal nontax debt, such as a student "
    "loan, part or all of the overpayment on line 34 may be used (offset) to "
    "pay the past-due amount. But your part of the overpayment may be refunded "
    "to you if certain conditions apply and you complete Form 8379. For "
    "details, see Form 8379.",
    62,
)

heading("Lines 35a Through 35d. Amount Refunded to You", 62, 4)
para(
    "If you want to check the status of your refund, just use the IRS2Go app or "
    "go to [[IRS.gov/Refunds|https://www.irs.gov/refunds]]. See «Refund "
    "Information», later. Information about your refund will generally be "
    "available within 24 hours after the IRS receives your «e-filed» return, or "
    "4 weeks after you mail your paper return. If you filed Form 8379 with your "
    "return, wait 14 weeks (11 weeks if you filed electronically). Have your "
    "2025 tax return handy so you can enter your social security number, your "
    "filing status, and the exact whole dollar amount of your refund.",
    62,
)
para(
    "«Where’s My Refund» will provide a personalized refund date as soon as the "
    "IRS processes your tax return and approves your refund.",
    62,
)

heading("Claiming a refund for a deceased taxpayer", 62, 5)
para(
    "If you are filing a joint return with your deceased spouse, you only need "
    "to file the tax return to claim the refund. If you are a court-appointed "
    "representative, file the return and include a copy of the certificate that "
    "shows your appointment. All other filers requesting the deceased "
    "taxpayer’s refund must file the return and attach Form 1310.",
    62,
)

heading("Effect of refund on benefits", 62, 5)
para(
    "Any refund you receive can’t be counted as income when determining if you "
    "or anyone else is eligible for benefits or assistance, or how much you or "
    "anyone else can receive, under any federal program or under any state or "
    "local program financed in whole or in part with federal funds. These "
    "programs include Temporary Assistance for Needy Families (TANF), Medicaid, "
    "Supplemental Security Income (SSI), and Supplemental Nutrition Assistance "
    "Program (formerly food stamps). In addition, when determining eligibility, "
    "the refund can’t be counted as a resource for at least 12 months after you "
    "receive it. Check with your local benefit coordinator to find out if your "
    "refund will affect your benefits.",
    62,
)

heading("Direct Deposit", 62, 5)
para(
    "‹Simple. Safe. Secure.› Have your refund deposited automatically to your "
    "checking or savings account, including an individual retirement "
    "arrangement (IRA). See the information about IRAs, later.",
    62,
)
para(
    "Starting in October 2025, the IRS will generally stop issuing paper checks "
    "for federal disbursements, including tax refunds, unless an exception "
    "applies. For more information, go to "
    "[[IRS.gov/ModernPayments|https://www.irs.gov/modernpayments]].",
    62,
)
para(
    "To directly deposit the amount shown on line 35a to your checking, "
    "savings, health savings, brokerage, or other similar account, including an "
    "IRA, at a bank or other financial institution (such as a mutual fund, "
    "brokerage firm, or credit union) in the United States:",
    62,
)
bullets(
    [
        "Complete lines 35b through 35d (if you want your refund deposited to "
        "only one account), or",
        "Check the box on line 35a and attach Form 8888 if you want to split "
        "the direct deposit of your refund into more than one account.",
    ],
    62,
)

heading("Account must be in your name", 62, 5)
para(
    "Don’t request a deposit of your refund to an account that isn’t in your "
    "name, such as your tax return preparer’s account. Although you may owe "
    "your tax return preparer a fee for preparing your return, don’t have any "
    "part of your refund deposited into the preparer’s account to pay the fee.",
    62,
)
para(
    "The number of refunds that can be directly deposited to a single account "
    "or prepaid debit card is limited to three a year. Learn more at "
    "[[IRS.gov/DepositLimit|https://www.irs.gov/depositlimit]].",
    62,
)

heading("Benefits of Direct Deposit", 62, 5)
bullets(
    [
        "You get your refund faster by direct deposit than you do by check.",
        "Payment is more secure. There is no check that can get lost or stolen.",
        "It is more convenient. You don’t have to make a trip to the bank to "
        "deposit your check.",
        "It saves tax dollars. It costs the government less to refund by direct "
        "deposit.",
        "It’s proven itself. Nearly 98% of social security and veterans’ "
        "benefits are sent electronically using direct deposit.",
    ],
    62,
)
callout(
    "Caution.",
    "If you file a joint return and check the box on line 35a and attach Form "
    "8888 or fill in lines 35b through 35d, your spouse may get at least part "
    "of the refund.",
    62,
)

heading("IRA", 62, 5)
para(
    "You can have your refund (or part of it) directly deposited to a "
    "traditional IRA or Roth IRA, but not a SIMPLE IRA. You must establish the "
    "IRA at a bank or other financial institution before you request direct "
    "deposit. Make sure your direct deposit will be accepted. You must also "
    "notify the trustee or custodian of your account of the year to which the "
    "deposit is to be applied (unless the trustee or custodian won’t accept a "
    "deposit for 2025). If you don’t, the trustee or custodian can assume the "
    "deposit is for the year during which you are filing the return. For "
    "example, if you file your 2025 return during 2026 and don’t notify the "
    "trustee or custodian in advance, the trustee or custodian can assume the "
    "deposit to your IRA is for 2026.",
    62,
)
para(
    "If you designate your deposit to be for 2025, you must verify that the "
    "deposit was actually made to the account by the due date of the return "
    "(not counting extensions). If the deposit isn’t made by that date, the "
    "deposit isn’t an IRA contribution for 2025. In that case, you must file an "
    "amended 2025 return and reduce any IRA deduction and any retirement "
    "savings contributions credit you claimed.",
    62,
)
callout(
    "Caution.",
    "You and your spouse, if filing jointly, each may be able to contribute up "
    "to $7,000 ($8,000 if age 50 or older at the end of 2025) to a traditional "
    "IRA or Roth IRA for 2025. You may owe an additional tax if your "
    "contributions exceed these limits, and the limits may be lower depending "
    "on your compensation and income. For more information on IRA "
    "contributions, see Pub. 590-A.",
    62,
)
para("For more information on IRAs, see Pub. 590-A and Pub. 590-B.", 62)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 18 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "61-62: the last three refundable credits (lines 28, 29, 30) and the start "
    "of the Refund section. It carries no document title by design — only "
    "tranche 1 does — so this file validates through merge-plans rather than "
    "standalone. No partial rebuild is delivered.",

    "ENDS AT PAGE 62 BY DESIGN. Page 63 opens the direct-deposit MECHANICS: "
    "Form 8888, the sample-check figure, the line 35b/35c/35d field "
    "instructions, and the list of reasons a deposit request is rejected. That "
    "is a different kind of content and carries this part of the document's "
    "first real figure, which needs its own alt text and its own decision "
    "about how much of a cheque image to describe. Page 62 ends cleanly on the "
    "IRA paragraph, so the seam costs nothing.",

    "THE HEADING STRUCTURE WAS REBUILT AFTER FINDING A TOOL DEFECT. pdf.js "
    "reports this document's fonts as synthetic ids (g_d0_f1..g_d0_f17) with "
    "generic serif/sans-serif families, so the “does the font name contain "
    "bold” test that page_outline.cjs used was false for EVERY item on EVERY "
    "page of this PDF, and its heading detection had silently degraded to "
    "size-only for seventeen sessions. Subheads set at body size — “Refund "
    "Offset”, “Injured Spouse”, “Benefits of Direct Deposit” — were invisible "
    "to it. Both tools now classify a face as display by how rarely the page "
    "uses it, and the structure below was confirmed against a rendered page "
    "before authoring.",

    "“Line NN” AND ITS TITLE ARE ONE HEADING. The source sets “Line 28” and "
    "“Additional Child Tax Credit” as two stacked lines at different sizes. "
    "They are authored as a single level-4 heading “Line 28. Additional Child "
    "Tax Credit”, matching the convention tranche 11 settled on, so the "
    "heading a reader lands on says both which line it is and what it is for.",

    "BOLD RUN-IN LEADS PROMOTED TO LEVEL-5 HEADINGS with the trailing period "
    "dropped: “Form 8862, who must file”, “Claiming a refund for a deceased "
    "taxpayer”, “Effect of refund on benefits”, “Account must be in your "
    "name”, “IRA”. Each opens a self-contained topic, so as headings they "
    "become navigable instead of vanishing into the paragraph that follows.",

    "ITALIC IS TWO DIFFERENT THINGS HERE AND IS TREATED AS TWO. The same "
    "italic face sets the body of every CAUTION and TIP box AND the "
    "cross-references in running text. The cross-references are marked "
    "emphasis (IRS.gov/Refunds, Refund Information, e-filed, Where's My "
    "Refund, IRS.gov/ModernPayments, IRS.gov/DepositLimit). The callout bodies "
    "are NOT: there the italic marks the box, which the callout already "
    "conveys, and emphasising a whole paragraph tells a screen-reader user "
    "nothing. “do not” on page 61 is bold in the source, not italic, and is "
    "marked strong.",

    "ICON CALLOUTS AS ESTABLISHED IN TRANCHE 3. CAUTION and TIP are margin "
    "icons whose label is real text in the content stream, so it lands "
    "mid-sentence in any extraction. Each is authored as a paragraph opening "
    "with a strong “Caution.” or “Tip.” in sentence case, not the printed "
    "all-caps, so it is not spelled out letter by letter.",

    "THE DIRECT DEPOSIT PANEL IS A BOXED PROMOTIONAL SIDEBAR, authored as a "
    "level-5 heading plus one paragraph whose “Simple. Safe. Secure.” tagline "
    "is marked strong. Its all-caps “DIRECT DEPOSIT” logotype is set in "
    "sentence case for the same reason as the icon labels. The panel is placed "
    "where the column-aware reading order puts it, after the “Effect of refund "
    "on benefits” paragraph.",

    "LINK TARGETS COME FROM THE PDF'S OWN ANNOTATIONS, not from the visible "
    "text, exactly as in tranche 2. Page 62 carries five Link annotations for "
    "three logical links — IRS.gov/Refunds, IRS.gov/ModernPayments and "
    "IRS.gov/DepositLimit — the latter two reported twice because each wraps "
    "across a line. The visible text is kept as printed while the href is the "
    "annotation's own target (https://www.irs.gov/refunds and so on), so no URL "
    "is guessed from what is on the page. Page 61 has NO annotations at all: "
    "its cross-references are italic but not linked, and they are marked "
    "emphasis only. The distinction is visible in the rendered page, where the "
    "three linked addresses are underlined and the italic cross-references "
    "(Refund Information, e-filed, Where's My Refund) are not.",

    "PAGE FURNITURE OMITTED, as in every earlier tranche: the printed page "
    "numbers and the standing “Need more information or forms? Visit IRS.gov.” "
    "footer. Soft hyphens removed and justified line-break hyphens closed, "
    "while genuine compounds are kept (1040-SR, court-appointed, e-filed, "
    "past-due, mid-February).",
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

pages = sorted({b["source_page"] for b in blocks})
print(f"wrote {OUT}: {len(blocks)} blocks, pages {pages[0]}-{pages[-1]}, "
      f"{len(review_notes)} review notes")
