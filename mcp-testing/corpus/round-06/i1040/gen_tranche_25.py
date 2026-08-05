#!/usr/bin/env python3
"""Author tranche 25 of the i1040 rebuild: printed page 84 — How To Get Tax
Help continued, from choosing a preparer through the online-account tools.

Fifteen run-in-led topics on one page, all of them level 3 because "How To Get
Tax Help" is level 2 (see tranche 24's notes and the session log).

Usage: python gen_tranche_25.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-25-pages-84-84.json")

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


def heading(text, level=3, page=84):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page=84):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": page}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body, page=84):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": page})


def bullets(items, page=84):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded],
             "source_page": page}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# NOTE: the two list items printed at the top of this page (IRS.gov/Forms, and
# the e-filing-software note) close the "Getting answers to your tax questions"
# list, which was authored WHOLE at page 83 in tranche 24. Not repeated here.

heading("Need someone to prepare your tax return?")
para(
    "There are various types of tax return preparers, including enrolled "
    "agents, certified public accountants (CPAs), accountants, and many others "
    "who don’t have professional credentials. If you choose to have someone "
    "prepare your tax return, choose that preparer wisely. A paid tax preparer "
    "is:"
)
bullets([
    "Primarily responsible for the overall substantive accuracy of your return,",
    "Required to sign the return, and",
    "Required to include their preparer tax identification number (PTIN).",
])
callout(
    "Caution.",
    "Although the tax preparer always signs the return, you’re ultimately "
    "responsible for providing all the information required for the preparer to "
    "accurately prepare your return and for the accuracy of every item reported "
    "on the return. Anyone paid to prepare tax returns for others should have a "
    "thorough understanding of tax matters. For more information on how to "
    "choose a tax preparer, go to [[Tips for Choosing a Tax "
    "Preparer|https://www.irs.gov/chooseataxpro]] on IRS.gov.",
)

heading("Employers can register to use Business Services Online")
para(
    "The Social Security Administration (SSA) offers online service at "
    "[[SSA.gov/employer|https://www.ssa.gov/employer/]] for fast, free, and "
    "secure W-2 filing options to CPAs, accountants, enrolled agents, and "
    "individuals who process Form W-2, Wage and Tax Statement; and Form W-2c, "
    "Corrected Wage and Tax Statement."
)

heading("Business tax account")
para(
    "If you are a sole proprietor, a partnership, an S corporation, a C "
    "corporation, or a single-member limited liability company (LLC), you can "
    "view your tax information on record with the IRS and do more with a "
    "business tax account. Go to "
    "[[IRS.gov/BusinessAccount|https://www.irs.gov/businessaccount]] for more "
    "information."
)

heading("IRS social media")
para(
    "Go to [[IRS.gov/SocialMedia|https://www.irs.gov/socialmedia]] to see the "
    "various social media tools the IRS uses to share the latest information on "
    "tax changes, scam alerts, initiatives, products, and services. At the IRS, "
    "privacy and security are our highest priority. We use these tools to share "
    "public information with you. ‹Don’t› post your social security number "
    "(SSN) or other confidential information on social media sites. Always "
    "protect your identity when using any social networking site."
)
para(
    "The following IRS YouTube channels provide short, informative videos on "
    "various tax-related topics in English and ASL."
)
bullets([
    "[[Youtube.com/irsvideos|https://www.youtube.com/irsvideos]].",
    "[[Youtube.com/irsvideosASL|https://www.youtube.com/IRSvideosASL]].",
])

heading("Over-the-Phone Interpreter (OPI) Service")
para(
    "The IRS offers the OPI Service to taxpayers needing language "
    "interpretation. The OPI Service is available at Taxpayer Assistance "
    "Centers (TACs), most IRS offices, and every VITA/TCE tax return site. This "
    "service is available in Spanish, Mandarin, Cantonese, Korean, Vietnamese, "
    "Russian, and Haitian Creole."
)

heading("Accessibility Helpline available for taxpayers with disabilities")
para(
    "Taxpayers who need information about accessibility services can call "
    "833-690-0598. The Accessibility Helpline can answer questions related to "
    "current and future accessibility products and services available in "
    "alternative media formats (for example, braille-ready, large print, audio, "
    "etc.). The Accessibility Helpline does not have access to your IRS "
    "account. For help with tax law, refunds, or account-related issues, go to "
    "[[IRS.gov/LetUsHelp|https://www.irs.gov/letushelp]]."
)

heading("Alternative media preference")
para(
    "Form 9000, Alternative Media Preference, or Form 9000(SP) allows you to "
    "elect to receive certain types of written correspondence in the following "
    "formats."
)
bullets([
    "Standard Print.",
    "Large Print.",
    "Braille.",
    "Audio (MP3).",
    "Plain Text File (TXT).",
    "Braille-Ready File (BRF).",
])

heading("Disasters")
para(
    "Go to [[IRS.gov/DisasterRelief|https://www.irs.gov/disasterrelief]] to "
    "review the available disaster tax relief."
)

heading("Getting tax forms and publications")
para(
    "Go to [[IRS.gov/Forms|https://www.irs.gov/forms]] to view, download, or "
    "print all the forms, instructions, and publications you may need. Or you "
    "can go to [[IRS.gov/OrderForms|https://www.irs.gov/orderforms]] to place "
    "an order."
)

heading("Mobile-friendly forms")
para(
    "You’ll need an IRS Online Account (OLA) to complete mobile-friendly forms "
    "that require signatures. You’ll have the option to submit your form(s) "
    "online or download a copy for mailing. You’ll need scans of your documents "
    "to support your submission. Go to "
    "[[IRS.gov/MobileFriendlyForms|https://www.irs.gov/mobilefriendlyforms]] "
    "for more information."
)

heading("Getting tax publications and instructions in eBook format")
para(
    "Download and view most tax publications and instructions (including the "
    "Instructions for Form 1040) on mobile devices as eBooks at "
    "[[IRS.gov/eBooks|https://www.irs.gov/ebooks]]. IRS eBooks have been tested "
    "using Apple’s iBooks for iPad. Our eBooks haven’t been tested on other "
    "dedicated eBook readers, and eBook functionality may not operate as "
    "intended."
)

heading("Access your online account (individual taxpayers only)")
para(
    "Go to [[IRS.gov/Account|https://www.irs.gov/account]] to securely access "
    "information about your federal tax account."
)
bullets([
    "View the amount you owe and a breakdown by tax year.",
    "See payment plan details or apply for a new payment plan.",
    "Make a payment or view 5 years of payment history and any pending or "
    "scheduled payments.",
    "Access your tax records, including key data from your most recent tax "
    "return, and transcripts.",
    "View digital copies of select notices from the IRS.",
    "Approve or reject authorization requests from tax professionals.",
])

heading("Get a transcript of your return")
para(
    "With an online account, you can access a variety of information to help "
    "you during the filing season. You can get a transcript, review your most "
    "recently filed tax return, and get your adjusted gross income. Create or "
    "access your online account at "
    "[[IRS.gov/Account|https://www.irs.gov/account]]."
)

heading("Tax Pro Account")
para(
    "This tool lets your tax professional submit an authorization request to "
    "access your individual taxpayer IRS OLA. For more information, go to "
    "[[IRS.gov/TaxProAccount|https://www.irs.gov/taxproaccount]]."
)

heading("Using direct deposit")
# Runs across the 84->85 break; authored whole at its starting page, so the
# page-85 tranche must not re-author it.
para(
    "The safest and easiest way to receive a tax refund is to «e-file» and "
    "choose direct deposit, which securely and electronically transfers your "
    "refund directly into your financial account. Direct deposit also avoids "
    "the possibility that your check could be lost, stolen, destroyed, or "
    "returned undeliverable to the IRS. Eight in 10 taxpayers use direct "
    "deposit to receive their refunds. If you don’t have a bank account, go to "
    "[[IRS.gov/DirectDeposit|https://www.irs.gov/directdeposit]] for more "
    "information on where to find a bank or credit union that can open an "
    "account online."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 25 OF A MULTI-SESSION REBUILD. This plan covers printed page 84, "
    "continuing How To Get Tax Help. It carries no document title by design — "
    "only tranche 1 does — so this file validates through merge-plans rather "
    "than standalone. No partial rebuild is delivered.",

    "THE TWO LIST ITEMS AT THE TOP OF THIS PAGE ARE NOT REPEATED. They close "
    "the “Getting answers to your tax questions” list, which was authored WHOLE "
    "at page 83 in tranche 24 rather than split across the page break. A recall "
    "check on page 84 alone will therefore report “IRS.gov/Forms: Find forms, "
    "instructions, and publications…” and the e-filing-software note as "
    "uncovered; they are covered by the previous tranche.",

    "FIFTEEN RUN-IN LEADS BECOME LEVEL-3 HEADINGS, with the trailing period "
    "dropped and the question mark kept where the source uses one (“Need "
    "someone to prepare your tax return?”). Level 3 because “How To Get Tax "
    "Help” is level 2, so these are its direct children — the level a run-in "
    "lead takes depends on what encloses it, not on how it is set. This page is "
    "essentially a directory of IRS services, and it is unusable without those "
    "headings: fifteen topics buried inside paragraphs cannot be skimmed or "
    "jumped between.",

    "THE CAUTION BOX RUNS LONGER THAN IT LOOKS. Its italic body continues past "
    "the sentence about the preparer signing, through “Anyone paid to prepare "
    "tax returns for others should have a thorough understanding of tax "
    "matters” and the pointer to Tips for Choosing a Tax Preparer. The face "
    "data settles where it ends; splitting it into a callout plus a loose "
    "paragraph would have been the natural guess from reading alone, and would "
    "have been wrong.",

    "EVERY LINK TARGET IS THE PDF'S OWN ANNOTATION, matched to its text by rect "
    "position. Two are phrase links with no visible URL: “Tips for Choosing a "
    "Tax Preparer” (irs.gov/chooseataxpro) and, on the following page, the "
    "target for the direct-deposit paragraph carried into this tranche "
    "(irs.gov/directdeposit). The YouTube link keeps the source's capitalisation "
    "in its target (youtube.com/IRSvideosASL) even though the visible text is "
    "lowercase.",

    "“USING DIRECT DEPOSIT” SPANS THE 84-85 BREAK and is authored whole here, "
    "as the handoff convention requires. Its link target had to be taken from "
    "page 85's annotations, since that is where the second half of the "
    "paragraph is printed. The page-85 tranche must not re-author it.",

    "“Don’t” IS BOLD IN THE SOURCE, not italic, in “Don't post your social "
    "security number (SSN) or other confidential information on social media "
    "sites”, and is marked strong. It is the only inline emphasis on the page "
    "that is not a link or a cross-reference.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: the printed page "
    "number and the standing “Need more information or forms? Visit IRS.gov.” "
    "footer. Soft hyphens removed and justified line-break hyphens closed, "
    "while genuine compounds are kept (W-2c, Over-the-Phone, braille-ready, "
    "account-related, Braille-Ready, mobile-friendly, tax-related, e-file).",
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
print(f"wrote {OUT}: {len(blocks)} blocks, page 84, {links} links, "
      f"{len(review_notes)} review notes")
