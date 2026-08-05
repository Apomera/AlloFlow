#!/usr/bin/env python3
"""Author tranche 23 of the i1040 rebuild: printed pages 81-82 — the opening of
General Information: How To Avoid Common Mistakes, Innocent Spouse Relief,
Income Tax Withholding and Estimated Tax Payments for 2026, Secure Your Tax
Records From Identity Theft, How Do You Make a Gift To Reduce Debt Held By the
Public?, and How Long Should Records Be Kept?

Back to hand-authored prose. Link-heavy: page 82 alone carries 20 Link
annotations, several of which point somewhere the visible text does not
suggest, and three of which have no visible URL at all.

Usage: python gen_tranche_23.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-23-pages-81-82.json")

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
    block = {"type": "list", "ordered": False, "items": [e[0] for e in expanded],
             "source_page": page}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# ============================================================ page 81

heading("General Information", 81, 2)
callout(
    "The IRS Mission.",
    "Provide America's taxpayers top-quality service by helping them understand "
    "and meet their tax responsibilities and enforce the law with integrity and "
    "fairness to all.",
    81,
)

heading("How To Avoid Common Mistakes", 81, 3)
para(
    "Mistakes can delay your refund or result in notices being sent to you. One "
    "of the best ways to file an accurate return is to file electronically. Tax "
    "software does the math for you and will help you avoid mistakes. Free File "
    "provides eligible taxpayers the ability to file their taxes electronically "
    "for free. See [[IRS.gov/FreeFile|https://www.irs.gov/Freefile]] for details "
    "and to see if you are eligible.",
    81,
)
bullets(
    [
        "File your return on a standard size sheet of paper. Cutting the paper "
        "may cause problems in processing your return.",

        "Make sure you entered the correct name and social security number (SSN) "
        "for each dependent you claim in the «Dependents» section. Check that "
        "each dependent’s name and SSN agrees with the dependent’s social "
        "security card. For each child under age 17 who is a qualifying child "
        "for the child tax credit or each dependent who qualifies you for the "
        "credit for other dependents, make sure you checked the appropriate box "
        "on row (7) of the «Dependents» section.",

        "Check your math, especially for the child tax credit, earned income "
        "credit (EIC), taxable social security benefits, total income, itemized "
        "deductions or standard deduction, taxable income, total tax, federal "
        "income tax withheld, and refund or amount you owe.",

        "Be sure you used the correct method to figure your tax. See the "
        "instructions for line 16.",

        "Be sure to enter your SSN in the space provided on page 1 of Form 1040 "
        "or 1040-SR. If you are married filing a joint or separate return, also "
        "enter your spouse’s SSN. Be sure to enter your SSN in the space next to "
        "your name. Check that your name and SSN agree with your social security "
        "card.",

        "Make sure your name and address are correct. Enter your (and your "
        "spouse’s) name in the same order as shown on your last return.",

        "If you live in an apartment, be sure to include your apartment number "
        "in your address.",

        "If you are taking the standard deduction, see the instructions for line "
        "12e to be sure you entered the correct amount.",

        "If you received capital gain distributions but weren’t required to file "
        "Schedule D, make sure you checked the box on line 7b.",

        "If you are taking the EIC, be sure you used the correct column of the "
        "EIC Table for your filing status and the number of qualifying children "
        "you have who have valid SSNs.",

        "Remember to sign and date Form 1040 or 1040-SR and enter your "
        "occupation(s).",

        "Attach your Form(s) W-2 and other required forms and schedules. Put all "
        "forms and schedules in the proper order. See «Assemble Your Return», "
        "earlier.",

        "If you owe tax and are paying by check or money order, be sure to "
        "include all the required information on your payment. See the "
        "instructions for line 37 for details.",

        "Make sure to check «Where Do You File?» before mailing your return. "
        "Over the next several years, the IRS will be reducing the number of "
        "paper tax return processing sites. Because of this, you may need to "
        "mail your return to a different address than you have in the past. You "
        "can also file electronically.",

        "Don’t file more than one original return for the same year, even if you "
        "haven’t gotten your refund or haven’t heard from the IRS since you "
        "filed. Filing more than one original return for the same year, or "
        "sending in more than one copy of the same return (unless we ask you to "
        "do so), could delay your refund.",

        "Make sure that if you, your spouse with whom you are filing a joint "
        "return, or your dependent was enrolled in Marketplace coverage, and "
        "advance payments of the premium tax credit were made for the coverage, "
        "that you attach Form 8962. For tax years other than 2020, you may have "
        "to repay excess advance payments, even if someone else enrolled you, "
        "your spouse, or your dependent in the Marketplace coverage. Excess "
        "advance payments may also have to be repaid if you enrolled someone in "
        "Marketplace coverage, you don’t claim that individual as a dependent, "
        "and no one else claims that individual as a dependent. See the "
        "instructions for Schedule 2, line 1a, and the Instructions for Form "
        "8962. You or whoever enrolled you should have received Form 1095-A from "
        "the Marketplace with information about who was covered and any advance "
        "payments of the premium tax credit.",
    ],
    81,
)

heading("Innocent Spouse Relief", 81, 3)
para(
    "Generally, both you and your spouse are each responsible for paying the "
    "full amount of tax, interest, and penalties on your joint return. However, "
    "you may qualify for relief from liability for tax on a joint return if (a) "
    "there is an understatement of tax because your spouse omitted income or "
    "claimed false deductions or credits; (b) you are divorced, separated, or no "
    "longer living with your spouse; or (c) given all the facts and "
    "circumstances, it wouldn’t be fair to hold you liable for the tax.",
    81,
)
para(
    "You may also qualify for relief if you were a married resident of a "
    "community property state but didn’t file a joint return and are now liable "
    "for an unpaid or understated tax.",
    81,
)
para(
    "File Form 8857 to request relief. In some cases, Form 8857 may need to be "
    "filed within 2 years of the date on which the IRS first attempted to "
    "collect the tax from you. Don’t file Form 8857 with your Form 1040 or "
    "1040-SR. For more information, see Pub. 971 and Form 8857, or you can call "
    "the Innocent Spouse office toll free at 855-851-2009.",
    81,
)

# ============================================================ page 82

heading("Income Tax Withholding and Estimated Tax Payments for 2026", 82, 3)
callout(
    "Tip.",
    "You can use the [[Tax Withholding Estimator|https://www.irs.gov/w4app]] "
    "instead of Pub. 505 or the worksheets included with Form W-4 or W-4P to "
    "determine whether you need to have your withholding increased or decreased.",
    82,
)
para(
    "In general, you don’t have to make estimated tax payments if you expect "
    "that your 2026 Form 1040 or 1040-SR will show a tax refund or a tax balance "
    "due of less than $1,000. If your total estimated tax for 2026 is $1,000 or "
    "more, see Form 1040-ES and Pub. 505 for a worksheet you can use to see if "
    "you have to make estimated tax payments. For more details, see Pub. 505.",
    82,
)

heading("Secure Your Tax Records From Identity Theft", 82, 3)
callout(
    "Tip.",
    "All taxpayers can now apply for an Identity Protection PIN (IP PIN). Go to "
    "[[IRS.gov/GetAnIPPIN|https://www.irs.gov/ippin]] to request an IP PIN "
    "through your online account, file Form 15227 if your AGI on your last filed "
    "return is less than $84,000 ($168,000 if married filing jointly), or make "
    "an appointment to visit a Taxpayer Assistance Center.",
    82,
)
para(
    "Identity theft occurs when someone uses your personal information, such as "
    "your name, social security number (SSN), or other identifying information, "
    "without your permission to commit fraud or other crimes. An identity thief "
    "may use your SSN to get a job or may file a tax return using your SSN to "
    "receive a refund. To reduce your risk:",
    82,
)
bullets(
    [
        "Protect your SSN,",
        "Ensure your employer is protecting your SSN, and",
        "Be careful when choosing a tax return preparer.",
    ],
    82,
)
para(
    "If your tax records are affected by identity theft and you receive a notice "
    "from the IRS, respond right away to the name and phone number printed on "
    "the IRS notice or letter. For more information, see Pub. 5027.",
    82,
)
para(
    "If your SSN has been lost or stolen or you suspect you are a victim of "
    "tax-related identity theft, visit "
    "[[IRS.gov/IdentityTheft|https://www.irs.gov/idtheft]] to learn what steps "
    "you should take.",
    82,
)
para(
    "Victims of identity theft who are experiencing economic harm or a systemic "
    "problem, or are seeking help in resolving tax problems that haven’t been "
    "resolved through normal channels, may be eligible for Taxpayer Advocate "
    "Service (TAS) assistance. You can reach TAS by calling the National "
    "Taxpayer Advocate helpline at 877-777-4778. People who are deaf, hard of "
    "hearing, or have a speech disability and who have access to TTY/TDD "
    "equipment can call 800-829-4059. Deaf or hard-of-hearing individuals can "
    "also contact the IRS through Telecommunications Relay Services at "
    "[[FCC.gov/TRS|https://www.fcc.gov/trs]].",
    82,
)

heading(
    "Protect yourself from suspicious emails, texts, and social media messages, "
    "phishing schemes, and phone scams",
    82, 4,
)
para(
    "Phishing is the creation and use of emails, texts, social media messages, "
    "and websites designed to mimic legitimate business communication and "
    "websites. The most common form is sending an email to a user falsely "
    "claiming to be an established legitimate enterprise in an attempt to scam "
    "the user into surrendering private information that will be used for "
    "identity theft.",
    82,
)
para(
    "The IRS doesn’t initiate contact with or request detailed personal "
    "information from taxpayers via emails, texts, or social media messages. "
    "Also, the IRS doesn’t ask taxpayers for the PIN numbers, passwords, or "
    "similar secret access information for their credit card, bank, or other "
    "financial accounts.",
    82,
)
para(
    "If you receive an unsolicited email claiming to be from the IRS, forward "
    "the message to [[phishing@irs.gov|mailto:phishing@irs.gov]]. For more "
    "information, go to [[IRS.gov/Phishing|https://www.irs.gov/phishing]].",
    82,
)
para(
    "You may also report misuse of the IRS name, logo, forms, or other IRS "
    "property to the Treasury Inspector General for Tax Administration toll free "
    "at 800-366-4484. People who are deaf, hard of hearing, or have a speech "
    "disability and who have access to TTY/TDD equipment can call 800-877-8339.",
    82,
)
para(
    "You can report suspicious emails, texts, and social media messages to the "
    "Federal Trade Commission (FTC) at "
    "[[ftc.gov/complaint|https://reportfraud.ftc.gov/]]. You can contact them at "
    "[[www.ftc.gov/idtheft|https://www.consumer.ftc.gov/features/feature-0014-identity-theft]] "
    "or 877-IDTHEFT (877-438-4338). If you have been the victim of identity "
    "theft, see [[www.IdentityTheft.gov|https://www.identitytheft.gov/]] and "
    "Pub. 5027. People who are deaf, hard of hearing, or have a speech "
    "disability and who have access to TTY/TDD equipment can call 866-653-4261.",
    82,
)
para(
    "Visit IRS.gov and enter “identity theft” in the search box to learn more "
    "about identity theft and how to reduce your risk.",
    82,
)
para(
    "You can report a phone scam to the Treasury Inspector General for Tax "
    "Administration at [[IRS Impersonation Scam Reporting|https://www.tigta.gov/]] "
    "or the FTC using the "
    "[[FTC Complaint Assistant|https://reportfraud.ftc.gov/#/]] at FTC.gov. Add "
    "“IRS Telephone Scam” in the notes.",
    82,
)

heading("How Do You Make a Gift To Reduce Debt Held By the Public?", 82, 3)
para(
    "If you wish to do so, go to [[Pay.gov|https://www.pay.gov/]] and make a "
    "contribution by credit card, debit card, PayPal, checking account, or "
    "savings account. Don’t add your gift to any tax you may owe. See the "
    "instructions for line 37 for details on how to pay any tax you owe. For "
    "more information, go to "
    "[[TreasuryDirect.gov/Help-Center/Public-Debt-FAQs/#DebtFinance|https://www.treasurydirect.gov/help-center/public-debt-faqs/#DebtFinance]] "
    "and click on “How do you make a contribution to reduce the debt?”",
    82,
)
callout("Tip.", "You may be able to deduct this gift on your 2026 tax return.", 82)

heading("How Long Should Records Be Kept?", 82, 3)
# spans the 82->83 break; authored whole at its starting page
para(
    "Keep a copy of your tax return, worksheets you used, and records of all "
    "items appearing on it (such as Forms W-2 and 1099) until the statute of "
    "limitations runs out for that return. Usually, this is 3 years from the "
    "date the return was due or filed or 2 years from the date the tax was paid, "
    "whichever is later. You should keep some records longer. For example, keep "
    "property records (including those on your home) as long as they are needed "
    "to figure the basis of the original or replacement property. For more "
    "details, see chapter 1 of Pub. 17.",
    82,
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 23 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "81-82, the opening of General Information. It carries no document title by "
    "design — only tranche 1 does — so this file validates through merge-plans "
    "rather than standalone. No partial rebuild is delivered.",

    "ENDS AT PAGE 82 BY DESIGN. Page 83 finishes the records-retention "
    "paragraph and then opens Amended Return, Need a Copy of Your Tax Return "
    "Information?, Past Due Returns, and — halfway down — “How To Get Tax "
    "Help”, which the table of contents lists as a top-level section. Stopping "
    "at 82 keeps that section's start out of the middle of this tranche.",

    "EVERY LINK TARGET IS THE PDF'S OWN ANNOTATION, matched to its text by rect "
    "position. This matters more here than anywhere so far, because several "
    "targets are nothing like the visible text: “ftc.gov/complaint” goes to "
    "reportfraud.ftc.gov, “www.ftc.gov/idtheft” goes to a consumer.ftc.gov "
    "feature page, and “IRS.gov/GetAnIPPIN” goes to irs.gov/ippin. THREE links "
    "have no visible URL at all and would have been missed entirely by reading "
    "the text: “Tax Withholding Estimator” (irs.gov/w4app), “IRS Impersonation "
    "Scam Reporting” (tigta.gov) and “FTC Complaint Assistant” "
    "(reportfraud.ftc.gov). One is a mailto: phishing@irs.gov.",

    "THE IRS MISSION IS A FULL-WIDTH BOX AND IS AUTHORED AS THE SECTION'S FIRST "
    "BLOCK. It is set in a box spanning the second and third columns at the top "
    "of page 81, which means the column-aware reading order splits it: the "
    "second line arrives before the first (“The IRS Mission. Provide America's "
    "taxpayers top-quality service by helping them” … “understand and meet "
    "their tax responsibilities…”). It is reassembled and placed immediately "
    "after the General Information heading, the same treatment the full-width "
    "banner in tranche 2 got.",

    "A SENTENCE-LONG BOLD RUN-IN IS PROMOTED TO A HEADING. “Protect yourself "
    "from suspicious emails, texts, and social media messages, phishing "
    "schemes, and phone scams.” is set in the same bold face as “The IRS "
    "Mission.” and heads seven paragraphs about phishing and scam reporting. It "
    "is an imperative sentence rather than the noun phrase these run-in leads "
    "usually are, which makes it a long heading — but leaving it inside a "
    "paragraph would leave that whole discussion unnavigable, so it is a "
    "level-4 heading with the trailing period dropped.",

    "SIXTEEN BULLETS UNDER “HOW TO AVOID COMMON MISTAKES” ARE ONE LIST, though "
    "the printed page splits them across two columns with the IRS Mission box "
    "between. The split is a column break, not a division in the content.",

    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS: “Dependents” (twice), "
    "“Assemble Your Return”, “Where Do You File?”. These are references to "
    "other parts of the document rather than links; page 81 carries exactly one "
    "Link annotation, for IRS.gov/FreeFile.",

    "ICON CALLOUTS as established in tranche 3: the three TIP boxes become "
    "paragraphs opening with a strong “Tip.” in sentence case. The IRS Mission "
    "box uses the same shape with its printed label “The IRS Mission.” as the "
    "strong lead.",

    "THE RECORDS-RETENTION PARAGRAPH SPANS THE 82-83 BREAK and is authored "
    "whole at page 82, as this rebuild's handoff convention requires. Page 83's "
    "tranche must not re-author “…replacement property. For more details, see "
    "chapter 1 of Pub. 17.”",

    "PAGE FURNITURE OMITTED as in every earlier tranche: printed page numbers "
    "and the standing “Need more information or forms? Visit IRS.gov.” footer. "
    "Soft hyphens removed and justified line-break hyphens closed, while "
    "genuine compounds (1040-SR, tax-related, hard-of-hearing, TTY/TDD, "
    "877-IDTHEFT) are kept.",
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
links += sum(1 for b in blocks for item in (b.get("item_runs") or []) for r in item if r.get("href"))
print(f"wrote {OUT}: {len(blocks)} blocks, pages {pages[0]}-{pages[-1]}, "
      f"{links} links, {len(review_notes)} review notes")
