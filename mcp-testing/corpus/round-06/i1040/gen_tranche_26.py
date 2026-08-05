#!/usr/bin/env python3
"""Author tranche 26 of the i1040 rebuild: printed page 85 — How To Get Tax
Help continued: identity theft, refund status, making a payment, paying late,
amended returns, notices, and contacting a local TAC.

The most link-dense page of the rebuild so far: 28 Link annotations, of which
nine are phrase links carrying no visible URL at all.

Usage: python gen_tranche_26.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-26-pages-85-85.json")

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


def heading(text, level=3, page=85):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page=85):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body, page=85):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": page})


def bullets(items, page=85):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded],
             "source_page": page}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# NOTE: the "Using direct deposit" paragraph that finishes at the top of this
# page was authored whole at page 84 in tranche 25 and is NOT repeated.

heading("Reporting and resolving your tax-related identity theft issues")
bullets([
    "Tax-related identity theft happens when someone steals your personal "
    "information to commit tax fraud. Your taxes can be affected if your SSN is "
    "used to file a fraudulent return or to claim a refund or credit.",

    "The IRS doesn’t initiate contact with taxpayers by email, text messages "
    "(including shortened links), telephone calls, or social media channels to "
    "request or verify personal or financial information. This includes "
    "requests for personal identification numbers (PINs), passwords, or similar "
    "information for credit cards, banks, or other financial accounts.",

    "Go to [[IRS.gov/IdentityTheft|https://www.irs.gov/identitytheft]], the IRS "
    "Identity Theft Central webpage, for information on identity theft and data "
    "security protection for taxpayers, tax professionals, and businesses. If "
    "your SSN has been lost or stolen or you suspect you’re a victim of "
    "tax-related identity theft, you can learn what steps you should take.",

    "Get an Identity Protection PIN (IP PIN). IP PINs are six-digit numbers "
    "assigned to taxpayers to help prevent the misuse of their SSNs on "
    "fraudulent federal income tax returns. When you have an IP PIN, it "
    "prevents someone else from filing a tax return with your SSN. To learn "
    "more, go to [[IRS.gov/IPPIN|https://www.irs.gov/ippin]].",
])

heading("Ways to check on the status of your refund")
bullets([
    "Go to [[IRS.gov/Refunds|https://www.irs.gov/refunds]].",
    "Download the official IRS2Go app to your mobile device to check your "
    "refund status.",
    "Call the automated refund hotline at 800-829-1954.",
])
callout(
    "Caution.",
    "The IRS can’t issue refunds before mid-February for returns that claimed "
    "the EITC or the additional child tax credit (ACTC). This applies to the "
    "entire refund, not just the portion associated with these credits.",
)

heading("Making a tax payment")
para(
    "The IRS recommends paying electronically whenever possible. Options to pay "
    "electronically are included in the list below. Payments of U.S. tax must "
    "be remitted to the IRS in U.S. dollars. [[Digital "
    "assets|https://www.irs.gov/digitalassets]] are ‹not› accepted. Go to "
    "[[IRS.gov/Payments|https://www.irs.gov/payments]] for information on how "
    "to make a payment using any of the following options."
)
bullets([
    "[[IRS Direct Pay|https://www.irs.gov/directpay]]: Pay taxes from your bank "
    "account. It’s free and secure, and no sign-in is required. You can change "
    "or cancel within 2 days of scheduled payment.",

    "[[Debit Card, Credit Card, or Digital "
    "Wallet|https://www.irs.gov/paybycard]]: Choose an approved payment "
    "processor to pay online or by phone.",

    "[[Electronic Funds Withdrawal|https://www.irs.gov/efw]]: Schedule a "
    "payment when filing your federal taxes using tax return preparation "
    "software or through a tax professional.",

    "[[Electronic Federal Tax Payment System|https://www.irs.gov/eftps]]: This "
    "is the best option for businesses. Enrollment is required.",

    "[[Check or Money Order|https://www.irs.gov/paybymail]]: Mail your payment "
    "to the address listed on the notice or instructions.",

    "[[Cash|https://www.irs.gov/paywithcash]]: You may be able to pay your "
    "taxes with cash at a participating retail store.",

    "[[Same-Day Wire|https://www.irs.gov/samedaywire]]: You may be able to do "
    "same-day wire from your financial institution. Contact your financial "
    "institution for availability, cost, and time frames.",
])
callout(
    "Note:",
    "The IRS uses the latest encryption technology to ensure that the "
    "electronic payments you make online, by phone, or from a mobile device "
    "using the IRS2Go app are safe and secure. Paying electronically is quick "
    "and easy.",
)

heading("What if I can’t pay now?")
para(
    "Go to [[IRS.gov/Payments|https://www.irs.gov/payments]] for more "
    "information about your options."
)
bullets([
    "Apply for an [[online payment agreement|https://www.irs.gov/paymentplans]] "
    "([[IRS.gov/OPA|https://www.irs.gov/opa]]) to meet your tax obligation in "
    "monthly installments if you can’t pay your taxes in full today. Once you "
    "complete the online process, you will receive immediate notification of "
    "whether your agreement has been approved.",

    "Use the [[Offer in Compromise Pre-Qualifier|https://irs.gov/oictool]] to "
    "see if you can settle your tax debt for less than the full amount you owe. "
    "For more information on the Offer in Compromise program, go to "
    "[[IRS.gov/OIC|https://www.irs.gov/oic]].",
])

heading("Filing an amended return")
para(
    "Go to [[IRS.gov/1040X|https://www.irs.gov/1040x]] for information and "
    "updates."
)

heading("Checking the status of your amended return")
para(
    "Go to [[IRS.gov/WMAR|https://www.irs.gov/wmar]] to track the status of "
    "Form 1040-X amended returns."
)
callout(
    "Caution.",
    "It can take up to 3 weeks from the date you filed your amended return for "
    "it to show up in our system, and processing it can take up to 16 weeks.",
)

heading("Understanding an IRS notice or letter you’ve received")
para(
    "Go to [[IRS.gov/Notices|https://www.irs.gov/notices]] to find additional "
    "information about responding to an IRS notice or letter."
)

heading("IRS Document Upload Tool")
para(
    "You may be able to use the Document Upload Tool to respond digitally to "
    "eligible IRS notices and letters by securely uploading required documents "
    "online through IRS.gov. For more information, go to "
    "[[IRS.gov/DUT|https://www.irs.gov/dut]]."
)

heading("Schedule LEP")
para(
    "You can use Schedule LEP (Form 1040), Request for Change in Language "
    "Preference, to state a preference to receive notices, letters, or other "
    "written communications from the IRS in an alternative language. You may "
    "not immediately receive written communications in the requested language. "
    "The IRS’s commitment to LEP taxpayers is part of a multi-year timeline "
    "that began providing translations in 2023. You will continue to receive "
    "communications, including notices and letters, in English until they are "
    "translated to your preferred language."
)

heading("Contacting your local TAC")
# Runs across the 85->86 break; authored whole at its starting page, so the
# page-86 tranche must not re-author it. The IRS.gov/TAC target comes from
# page 86's annotations, where that half of the paragraph is printed.
para(
    "Keep in mind, many questions can be answered on IRS.gov without visiting a "
    "TAC. Go to [[IRS.gov/LetUsHelp|https://www.irs.gov/letushelp]] for the "
    "topics people ask about most. If you still need help, TACs provide tax "
    "help when a tax issue can’t be handled online or by phone. All TACs now "
    "provide service by appointment, so you’ll know in advance that you can get "
    "the service you need without long wait times. Before you visit, go to "
    "[[IRS.gov/TAC|https://www.irs.gov/tac]] to find the nearest TAC and to "
    "check hours, available services, and appointment options. Or, on the "
    "IRS2Go app, under the Stay Connected tab, choose the Contact Us option and "
    "click on “Local Offices.”"
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 26 OF A MULTI-SESSION REBUILD. This plan covers printed page 85, "
    "continuing How To Get Tax Help. It carries no document title by design — "
    "only tranche 1 does — so this file validates through merge-plans rather "
    "than standalone. No partial rebuild is delivered.",

    "THE “USING DIRECT DEPOSIT” PARAGRAPH AT THE TOP OF THIS PAGE IS NOT "
    "REPEATED. It was authored whole at page 84 in tranche 25. A recall check "
    "on page 85 alone will therefore report its words as uncovered; they are "
    "covered by the previous tranche.",

    "THE MOST LINK-DENSE PAGE OF THE REBUILD SO FAR: 28 Link annotations, and "
    "NINE of them are phrase links with no visible URL at all. The whole "
    "payment-options list works this way — “IRS Direct Pay”, “Debit Card, "
    "Credit Card, or Digital Wallet”, “Electronic Funds Withdrawal”, "
    "“Electronic Federal Tax Payment System”, “Check or Money Order”, “Cash” "
    "and “Same-Day Wire” each carry their own target, as do “Digital assets”, "
    "“online payment agreement” and “Offer in Compromise Pre-Qualifier”. "
    "Reading the visible text would have produced a list of seven payment "
    "methods with no way to reach any of them.",

    "ONE TARGET IS DELIBERATELY NOT NORMALISED. Every other link on the page "
    "resolves to a www.irs.gov address, but the Offer in Compromise "
    "Pre-Qualifier resolves to irs.gov/oictool with NO www. That is what the "
    "annotation contains and it is reproduced exactly; quietly “fixing” it to "
    "match its neighbours would be inventing a URL.",

    "TEN RUN-IN LEADS BECOME LEVEL-3 HEADINGS, with the trailing period dropped "
    "and the question mark kept where the source uses one (“What if I can't pay "
    "now?”). Level 3 because “How To Get Tax Help” is level 2, so these are its "
    "direct children.",

    "THE “Note:” LABEL IS SET IN A DIFFERENT FACE FROM THE OTHER LEADS — "
    "sans-serif, where the run-in topic leads on this page are bold serif. It "
    "introduces a remark about the security of electronic payments rather than "
    "opening a new topic, so it is authored as a callout paragraph with a "
    "strong “Note:” lead, keeping the printed colon, rather than promoted to a "
    "heading.",

    "TWO CAUTION BOXES INTERRUPT THEIR TOPICS IN PRINT and are placed after the "
    "content they qualify: the mid-February refund hold sits after the "
    "refund-status list, and the amended-return processing times after the "
    "IRS.gov/WMAR pointer. Both are authored as paragraphs opening with a "
    "strong “Caution.” in sentence case, as established in tranche 3.",

    "“CONTACTING YOUR LOCAL TAC” SPANS THE 85-86 BREAK and is authored whole "
    "here. Its IRS.gov/TAC target had to be taken from page 86's annotations, "
    "since that is where the second half of the paragraph is printed. The "
    "page-86 tranche must not re-author it.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: the printed page "
    "number and the standing “Need more information or forms? Visit IRS.gov.” "
    "footer. Soft hyphens removed and justified line-break hyphens closed, "
    "while genuine compounds are kept (tax-related, six-digit, mid-February, "
    "Same-Day, sign-in, multi-year, 1040-X).",
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
print(f"wrote {OUT}: {len(blocks)} blocks, page 85, {links} links, "
      f"{len(review_notes)} review notes")
