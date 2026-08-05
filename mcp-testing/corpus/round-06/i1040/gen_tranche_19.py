#!/usr/bin/env python3
"""Author tranche 19 of the i1040 rebuild: printed pages 63-64 — the
direct-deposit mechanics (Form 8888, the sample-check figure, lines 35b-35d,
rejection reasons), line 36, and the whole Amount You Owe payment section.

Two firsts for this rebuild:
  * THE FIRST IMAGE BLOCK. Page 63 carries the sample-check illustration, whose
    entire purpose is to show WHICH number on a cheque goes on which line. Its
    alt text has to carry that instruction, not merely announce that a picture
    of a cheque is present.
  * THE FIRST TABLE BUILT FROM NON-TABULAR PRINT. The two card-payment
    providers are set as indented address blocks, but the content is strictly
    parallel (provider, phone, website), so it is authored as a table.

Usage: python gen_tranche_19.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-19-pages-63-64.json")

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


def table(caption, columns, rows, page, row_headers=True):
    """Rows may carry inline markup; cell_runs is emitted only where needed."""
    plain_rows, cell_runs, any_runs = [], [], False
    for row in rows:
        expanded = [rich(c) for c in row]
        plain_rows.append([e[0] for e in expanded])
        cell_runs.append([e[1] for e in expanded])
        if any(e[1] for e in expanded):
            any_runs = True
    block = {
        "type": "table", "caption": caption, "columns": columns,
        "rows": plain_rows, "row_headers": row_headers, "source_page": page,
    }
    if any_runs:
        block["cell_runs"] = cell_runs
    blocks.append(block)


# ============================================================ page 63
# Continues "Lines 35a Through 35d — Amount Refunded to You", opened on page 62.

heading("Form 8888", 63, 5)
para(
    "You can have your refund directly deposited into more than one account. "
    "For more information, see the Form 8888 instructions.",
    63,
)
callout(
    "Tip.",
    "Your refund can be split and directly deposited into up to three different "
    "accounts in your name on Form 8888. You can’t have your refund deposited "
    "into more than one account if you file Form 8379, «Injured Spouse "
    "Allocation».",
    63,
)

heading("Line 35b", 63, 5)
para(
    "The routing number must be nine digits. The first two digits must be 01 "
    "through 12 or 21 through 32. On the sample check shown later, the routing "
    "number is 250250025. Stella and Bailey Keys would use that routing number "
    "unless their financial institution instructed them to use a different "
    "routing number for direct deposits.",
    63,
)
para("Ask your financial institution for the correct routing number to enter on line 35b if:", 63)
bullets(
    [
        "The routing number on a deposit slip is different from the routing "
        "number on your checks,",
        "Your deposit is to a savings account that doesn’t allow you to write "
        "checks, or",
        "Your checks state they are payable through a financial institution "
        "different from the one at which you have your checking account.",
    ],
    63,
)

heading("Line 35c", 63, 5)
para(
    "Check the appropriate box for the type of account. Don’t check more than "
    "one box. If the deposit is to an account such as an IRA, health savings "
    "account, brokerage account, or other similar account, ask your financial "
    "institution whether you should check the “Checking” or “Savings” box. You "
    "must check the correct box to ensure your deposit is accepted.",
    63,
)

heading("Line 35d", 63, 5)
para(
    "The account number can be up to 17 characters (both numbers and letters). "
    "Include hyphens but omit spaces and special symbols. Enter the number from "
    "left to right and leave any unused boxes blank. On the sample check shown "
    "later, the account number is 20202086. Don’t include the check number.",
    63,
)

blocks.append({
    "type": "image",
    "decorative": False,
    "alt": (
        "Illustration of a personal check with the numbers along its bottom "
        "edge labelled, showing which one to enter on which line. The check is "
        "printed for Stella Keys and Bailey Keys, 123 Pear Lane, Anyplace, MI "
        "00000, drawn on Anyplace Bank, and carries the check number 1234 in "
        "its top right corner. Along the bottom edge three groups of digits "
        "read, from left to right: 250250025, then 20202086, then 1234. A "
        "label with an arrow points to the first group and reads “Routing "
        "number (line 35b)”. A second label points to the middle group and "
        "reads “Account number (line 35d)”. A third label points to both the "
        "check number in the top right corner and to the repeated 1234 at the "
        "end of the bottom edge, and reads “Do not include the check number.” "
        "The word SAMPLE is printed diagonally across the face of the check."
    ),
    "caption": "Sample Check—Lines 35b Through 35d",
    "source_page": 63,
})
callout(
    "Caution.",
    "The routing and account numbers may be in different places on your check.",
    63,
)
para(
    "If the direct deposit to your account(s) is different from the amount you "
    "expected, you will receive an explanation in the mail about 2 weeks after "
    "your refund is deposited.",
    63,
)

heading("Reasons Your Direct Deposit Request Will Be Rejected", 63, 5)
para(
    "If any of the following apply, your direct deposit request will be "
    "rejected and your refund may be delayed.",
    63,
)
bullets(
    [
        "You are asking to have a joint refund deposited to an individual "
        "account, and your financial institution(s) won’t allow this. The IRS "
        "isn’t responsible if a financial institution rejects a direct deposit.",
        "The name on your account doesn’t match the name on the refund, and "
        "your financial institution(s) won’t allow a refund to be deposited "
        "unless the name on the refund matches the name on the account.",
        "Three direct deposits of tax refunds already have been made to the "
        "same account or prepaid debit card.",
        "You haven't given a valid account number.",
        "Any numbers or letters on lines 35b through 35d are crossed out or "
        "whited out.",
    ],
    63,
)
callout(
    "Caution.",
    "The IRS isn’t responsible for a lost refund if you enter the wrong account "
    "information. Check with your financial institution to get the correct "
    "routing and account numbers to make sure your direct deposit will be "
    "accepted.",
    63,
)

heading("Line 36. Applied to Your 2026 Estimated Tax", 63, 4)
para(
    "Enter on line 36 the amount, if any, of the overpayment on line 34 you "
    "want applied to your 2026 estimated tax. We will apply this amount to your "
    "account unless you include a statement requesting us to apply it to your "
    "spouse’s account. Include your spouse’s social security number in the "
    "statement.",
    63,
)
callout(
    "Caution.",
    "This election to apply part or all of the amount overpaid to your 2026 "
    "estimated tax can’t be changed later.",
    63,
)

heading("Amount You Owe", 63, 3)
callout(
    "Tip.",
    "To avoid interest and penalties, pay your taxes in full by the due date of "
    "your return (not including extensions)—April 15, 2026, for most taxpayers. "
    "You don’t have to pay if line 37 is under $1.",
    63,
)
# spans the 63->64 break; authored whole at its starting page
para(
    "Include any estimated tax penalty from line 38 in the amount you enter on "
    "line 37. Don’t include any estimated payments for 2026 in this payment. "
    "Instead, make the estimated payment separately.",
    63,
)

# ============================================================ page 64

# Level 4, not 5: this run-in sits directly under the "Amount You Owe" section
# banner with no "Line NN" heading between, so it is a SIBLING of "Line 37",
# not a child of it. merge-plans rejects the h3->h5 skip, and it is right to.
heading("Insufficient funds", 64, 4)
para(
    "The penalty for making a payment to the IRS that was dishonored is $25 or "
    "2% of the dishonored payment amount, whichever is more. However, if the "
    "dishonored payment amount is less than $25, the penalty equals the amount "
    "paid. Use [[Tax Topic 206|https://www.irs.gov/taxtopics/tc206.html]].",
    64,
)

heading("Line 37. Amount You Owe", 64, 4)
para(
    "The IRS offers several payment options. Go to "
    "[[IRS.gov/ModernPayments|https://www.irs.gov/modernpayments]] to see your "
    "options.",
    64,
)

heading("Pay Online", 64, 5)
para(
    "Paying online is convenient and secure and helps make sure we get your "
    "payments on time. To pay your taxes online or for more information, go to "
    "[[IRS.gov/ModernPayments|https://www.irs.gov/modernpayments]]. You can pay "
    "using any of the following methods.",
    64,
)
bullets(
    [
        "‹Your Online Account.› You can make tax payments through your online "
        "account, including balance payments, estimated tax payments, or other "
        "types. You can also see your payment history and other tax records "
        "there. Go to [[IRS.gov/Account|https://www.irs.gov/your-account]].",
        "‹IRS Direct Pay.› For online transfers directly from your checking or "
        "savings account at no cost to you, go to "
        "[[IRS.gov/Payments|https://www.irs.gov/payments]].",
        "‹Pay by Card or Digital Wallet.› To pay by debit or credit card, or "
        "digital wallet, go to [[IRS.gov/Payments|https://www.irs.gov/payments]]"
        ". A fee is charged by these service providers. You can also pay by "
        "phone with a debit or credit card. See «Debit or credit card» under "
        "«Pay by Phone», later.",
        "‹Electronic Funds Withdrawal› (EFW) is an integrated «e-file»/e-pay "
        "option offered when filing your federal taxes electronically using tax "
        "return preparation software, through a tax professional or the IRS at "
        "[[IRS.gov/Payments|https://www.irs.gov/payments]].",
        "‹Online Payment Agreement.› If you can’t pay in full by the due date "
        "of your tax return, you can apply for an online monthly installment "
        "agreement at [[IRS.gov/OPA|https://www.irs.gov/paymentplans]]. Once "
        "you complete the online process, you will receive immediate "
        "notification of whether your agreement has been approved. A user fee "
        "is charged.",
        "‹Electronic Federal Tax Payment System (EFTPS).› Allows you to pay "
        "your taxes online or by phone directly from your checking or savings "
        "account. There is no fee for this service. You must be enrolled either "
        "online or have an enrollment form mailed to you. See «EFTPS» under "
        "«Pay by Phone», later.",
    ],
    64,
)

heading("Pay by Phone", 64, 5)
para(
    "Paying by phone is another safe and secure method of paying "
    "electronically. Use one of the following methods: ‹(1)› call one of the "
    "debit or credit card service providers, or ‹(2)› use the Electronic "
    "Federal Tax Payment System (EFTPS) to pay directly from your checking or "
    "savings account.",
    64,
)

heading("Debit or credit card", 64, 6)
para(
    "Call one of our service providers. Each charges a fee that varies by "
    "provider, card type, and payment amount.",
    64,
)
table(
    "The two card payment service providers, with the phone number and website "
    "for each. The printed page sets these as two indented blocks rather than "
    "as a ruled table.",
    ["Service provider", "Phone", "Website"],
    [
        ["Link2Gov Corporation", "888-PAY-1040™ (888-729-1040)",
         "[[PAY1040.com|https://www.pay1040.com/]]"],
        ["ACI Payments, Inc.", "888-UPAY-TAX℠ (888-872-9829)",
         "[[fed.acipayonline.com|https://fed.acipayonline.com/]]"],
    ],
    64,
)

heading("EFTPS", 64, 6)
para(
    "To get more information about EFTPS or to enroll in EFTPS, visit "
    "[[EFTPS.gov|https://www.eftps.gov/]] or call 800-555-4477. To contact "
    "EFTPS using Telecommunications Relay Services (TRS) for people who are "
    "deaf, hard of hearing, or have a speech disability, dial 711 and then "
    "provide the TRS assistant the 800-555-4477 number or 800-733-4829. "
    "Additional information about EFTPS is also available in Pub. 966.",
    64,
)

heading("Pay by Mobile Device", 64, 5)
para("To pay through your mobile device, download the IRS2Go app.", 64)

heading("Pay by Cash", 64, 5)
para(
    "You can pay your taxes in cash. To find out about the different cash "
    "payment methods, go to "
    "[[IRS.gov/PayCash|https://www.irs.gov/paycash]]. Don’t send cash payments "
    "through the mail.",
    64,
)

heading("Pay by Check or Money Order", 64, 5)
para(
    "Before submitting a payment through the mail, please consider alternative "
    "methods. One of our safe, quick, and easy electronic payment options might "
    "be right for you. If you choose to mail a tax payment, attach Form 1040-V. "
    "For the most up-to-date information on Form 1040-V, go to "
    "[[IRS.gov/Form1040V|https://www.irs.gov/forms-pubs/about-form-1040-v]].",
    64,
)

heading("What if You Can’t Pay?", 64, 5)
para("If you can’t pay the full amount shown on line 37 when you file, you can ask for:", 64)
bullets(["An installment agreement, or", "An extension of time to pay."], 64)

heading("Installment agreement", 64, 6)
para(
    "Under an installment agreement, you can pay all or part of the tax you owe "
    "in monthly installments. However, even if an installment agreement is "
    "granted, you will be charged interest and may be charged a late payment "
    "penalty on the tax not paid by the due date of your return (not counting "
    "extensions)—April 15, 2026, for most people. You must also pay a fee. To "
    "limit the interest and penalty charges, pay as much of the tax as possible "
    "when you file. But before requesting an installment agreement, you should "
    "consider other less costly alternatives, such as a bank loan or credit "
    "card payment.",
    64,
)
para(
    "To ask for an installment agreement, you can apply online or use Form "
    "9465. To apply online, go to "
    "[[IRS.gov/OPA|https://www.irs.gov/paymentplans]].",
    64,
)

heading("Extension of time to pay", 64, 6)
para(
    "If paying the tax when it is due would cause you an undue hardship, you "
    "can ask for an extension of time to pay by filing Form 1127 by the due "
    "date of your return (not counting extensions)—April 15, 2026, for most "
    "people. An extension generally won’t be granted for more than 6 months. "
    "You will be charged interest on the tax not paid by April 15, 2026. You "
    "must pay the tax before the extension runs out. If you do not pay the tax "
    "by the extended due date, penalties and interest will be imposed until "
    "taxes are paid in full. For the most up-to-date information on Form 1127, "
    "go to [[IRS.gov/Form1127|https://www.irs.gov/F1127]].",
    64,
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 19 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "63-64: the direct-deposit mechanics, line 36, and the whole Amount You Owe "
    "payment section. It carries no document title by design — only tranche 1 "
    "does — so this file validates through merge-plans rather than standalone. "
    "No partial rebuild is delivered.",

    "THE SAMPLE-CHECK FIGURE IS THE FIRST IMAGE BLOCK IN THIS REBUILD, and its "
    "alt text carries the instruction rather than the appearance. The figure "
    "exists to answer one question — which number on a cheque goes on which "
    "line — so the alt text names the three groups of digits along the bottom "
    "edge in order, says which label points at which group, and spells out that "
    "the third group repeats the check number that must NOT be entered. A "
    "reader who cannot see it gets what a reader who can see it gets. The "
    "printed banner “Sample Check—Lines 35b Through 35d” is used as the "
    "figure's caption rather than as a heading, because it names a figure "
    "rather than opening a section.",

    "THE CHEQUE'S GENERIC BOILERPLATE IS DELIBERATELY OUTSIDE THE ALT TEXT. "
    "The illustration also prints the scaffolding every cheque carries — “PAY "
    "TO THE ORDER OF”, “DOLLARS”, a dollar sign, “For”, and the fractional "
    "routing code 15-0000/0000. None of it bears on which number goes on which "
    "line, and reciting it would bury the part that does; the alt text opens by "
    "saying the image is a personal check, which is what that furniture "
    "signals to someone who can see it. Every load-bearing value IS in the alt: "
    "250250025, 20202086, 1234, both names, the bank, and the SAMPLE overprint. "
    "The consequence is that a token-recall check will always report this "
    "boilerplate as uncovered on page 63; that is expected and is not a loss.",

    "THE FIGURE IS MOVED TO A SENTENCE BOUNDARY. In the printed page the check "
    "sits at the top of the second column, which drops it into the MIDDLE of "
    "the line 35d paragraph — the column-aware reading order splits “On the "
    "sample check shown later,” from “the account number is 20202086.” The "
    "paragraph is authored whole and the figure placed immediately after it, "
    "which is also where the text's own “shown later” points.",

    "THE TWO CARD PAYMENT PROVIDERS ARE AUTHORED AS A TABLE, though the source "
    "sets them as two indented address blocks with no rules. The content is "
    "strictly parallel — provider, phone, website — so a table makes it "
    "comparable and navigable instead of leaving a reader to infer the "
    "structure from indentation they cannot see. The caption states that the "
    "printed page is not ruled. The ™ and ℠ marks are kept on the vanity "
    "numbers as printed.",

    "EVERY LINK TARGET WAS DERIVED FROM THE PDF'S OWN ANNOTATIONS BY POSITION, "
    "not guessed from the visible text. Page 64 carries 19 Link annotations "
    "covering 11 distinct URLs (several report more than once because they wrap "
    "across a line); each rect was matched against the text items falling "
    "inside it to pair visible text with target. Two are worth noting because a "
    "guess would have got them wrong: IRS.gov/Account resolves to "
    "irs.gov/your-account, and IRS.gov/OPA to irs.gov/paymentplans. Page 63 "
    "carries NO annotations at all, so its cross-references are marked emphasis "
    "only.",

    "A SIX-LEVEL HEADING HIERARCHY. “Amount You Owe” is a level-3 section "
    "banner on page 63; “Line 37. Amount You Owe” is level 4; the payment "
    "methods (Pay Online, Pay by Phone, Pay by Mobile Device, Pay by Cash, Pay "
    "by Check or Money Order, What if You Can't Pay?) are level 5; and the "
    "run-in leads that sit UNDER one of those (Debit or credit card, EFTPS, "
    "Installment agreement, Extension of time to pay) are level 6, so the "
    "nesting matches the meaning rather than flattening two different depths "
    "onto one level.",

    "“Insufficient funds” IS LEVEL 4, not level 5, and the validator is what "
    "settled it. The run-in has the same modest weight in print as “Installment "
    "agreement”, so it was first authored at level 5 — but it sits directly "
    "under the “Amount You Owe” banner with no “Line NN” heading between, which "
    "made the outline skip from h3 to h5 and merge-plans rejected it. It is in "
    "fact a SIBLING of “Line 37”: both are direct children of the section, one "
    "covering the dishonoured-payment penalty and one the line itself. Printed "
    "weight and structural depth are not the same thing here.",

    "THE TIP ON PAGE 63 IS ONE CALLOUT, NOT TWO. The printed box sets its "
    "second sentence as a separate italic paragraph with no repeated icon, "
    "which is how this document continues a callout. Authored as a single Tip "
    "paragraph so the continuation stays attached to the label; the only thing "
    "lost is a paragraph break inside a callout.",

    "ICON CALLOUTS AND RUN-IN LEADS follow the conventions already settled: "
    "CAUTION and TIP become paragraphs opening with a strong “Caution.”/“Tip.” "
    "in sentence case, and bold run-in leads become headings with the trailing "
    "period dropped. Bold leads INSIDE list items stay inside the item and are "
    "marked strong, because promoting them would break the list.",

    "THE PARAGRAPH THAT SPANS THE PAGE BREAK (“Include any estimated tax "
    "penalty from line 38…”, which runs from page 63 to page 64) is authored "
    "whole at page 63, as the handoff convention in this rebuild requires.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: printed page numbers "
    "and the standing “Need more information or forms? Visit IRS.gov.” footer. "
    "Soft hyphens removed and justified line-break hyphens closed, while "
    "genuine compounds and the source's own em dashes in “(not counting "
    "extensions)—April 15, 2026” are kept.",
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
links = sum(1 for b in blocks for r in b.get("runs", []) if r.get("href"))
links += sum(1 for b in blocks for row in (b.get("cell_runs") or [])
             for cell in row if cell for r in cell if r.get("href"))
links += sum(1 for b in blocks for item in (b.get("item_runs") or [])
             for r in item if r.get("href"))
print(f"wrote {OUT}: {len(blocks)} blocks, pages {pages[0]}-{pages[-1]}, "
      f"{links} links, {len(review_notes)} review notes")
