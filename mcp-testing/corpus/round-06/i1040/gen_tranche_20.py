#!/usr/bin/env python3
"""Author tranche 20 of the i1040 rebuild: printed pages 65-67 — the estimated
tax penalty (line 38), Third Party Designee, Sign Your Return, Identity
Protection PIN, Paid Preparer Must Sign Your Return, and Assemble Your Return.

This completes the Line Instructions section. Page 68 begins the 2025 Tax
Table, the next MECHANICAL span.

Heading levels here could not be read off the type sizes alone; see the review
notes. The document's own table of contents was the deciding evidence.

Usage: python gen_tranche_20.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-20-pages-65-67.json")

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


def listing(items, page, ordered=False):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": page}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


SUBTRACT = [
    "Tax on an excess parachute payment,",
    "Excise tax on insider stock compensation of an expatriated corporation,",
    "Uncollected social security and Medicare or RRTA tax on tips or group-term "
    "life insurance,",
]

# ============================================================ page 65

heading("Line 38. Estimated Tax Penalty", 65, 4)
para("You may owe this penalty if:", 65)
listing(
    [
        "Line 37 is at least $1,000 and it is more than 10% of the tax shown on "
        "your return, or",
        "You didn’t pay enough estimated tax by any of the due dates. This is "
        "true even if you are due a refund.",
    ],
    65,
)
para(
    "For most people, the “tax shown on your return” is the amount on your 2025 "
    "Form 1040 or 1040-SR, line 24, minus the total of any amounts shown on "
    "lines 27a, 28, 29, and 30; Schedule 3, lines 9 and 12; and Forms 8828, "
    "4137, 5329 (Parts III through IX only), and 8919. Also subtract from line "
    "24 any:",
    65,
)
listing(SUBTRACT + ["Look-back interest due under section 167(g) or 460(b)."], 65)
para(
    "When figuring the amount on line 24, include household employment taxes "
    "only if line 25d is more than zero or you would owe the penalty even if "
    "you didn’t include those taxes.",
    65,
)

heading("Exception", 65, 5)
para(
    "You won’t owe the penalty if your 2024 tax return was for a tax year of 12 "
    "full months and either of the following applies.",
    65,
)
listing(
    [
        "You had no tax shown on your 2024 return and you were a U.S. citizen "
        "or resident for all of 2024.",
        "The total of lines 25d, 26, and Schedule 3, line 11, on your 2025 "
        "return is at least 100% of the tax shown on your 2024 return (110% of "
        "that amount if you aren’t in the business of farming or fishing, and "
        "your adjusted gross income (AGI) shown on your 2024 return was more "
        "than $150,000 (more than $75,000 if married filing separately for "
        "2025)). Your estimated tax payments for 2025 must have been made on "
        "time and for the required amount.",
    ],
    65,
    ordered=True,
)
para(
    "For most people, the “tax shown on your 2024 return” is the amount on your "
    "2024 Form 1040 or 1040-SR, line 24, minus the total of any amounts shown "
    "on lines 27, 28, and 29; Schedule 3, lines 9 and 12; and Forms 8828, 4137, "
    "5329 (Parts III through IX only), and 8919. Also subtract from line 24 any:",
    65,
)
listing(SUBTRACT[:-1] + [
    SUBTRACT[-1][:-1] + ", and",
    "Look-back interest due under section 167(g) or 460(b).",
], 65)
para(
    "When figuring the amount on line 24, include household employment taxes "
    "only if line 25d is more than zero or you would have owed the estimated "
    "tax penalty for 2024 even if you didn't include those taxes.",
    65,
)
para(
    "If the «Exception» just described doesn’t apply, see the Instructions for "
    "Form 2210 for other situations in which you may be able to lower your "
    "penalty by filing Form 2210.",
    65,
)

heading("Figuring the Penalty", 65, 5)
para(
    "If you choose to figure the penalty yourself, use Form 2210 (or 2210-F for "
    "farmers and fishers).",
    65,
)
para(
    "Enter any penalty on line 38. Add the penalty to any tax due and enter the "
    "total on line 37.",
    65,
)
para(
    "However, if you have an overpayment on line 34, subtract the penalty from "
    "the amount you would otherwise enter on line 35a or line 36. Lines 35a, "
    "36, and 38 must equal line 34.",
    65,
)
para(
    "If the penalty is more than the overpayment on line 34, enter -0- on lines "
    "35a and 36. Then, subtract line 34 from line 38 and enter the result on "
    "line 37.",
    65,
)
para(
    "Don’t file Form 2210 with your return unless Form 2210 indicates that you "
    "must do so. Instead, keep it for your records.",
    65,
)
callout(
    "Tip.",
    "Because Form 2210 is complicated, you can leave line 38 blank and the IRS "
    "will figure the penalty and send you a bill. We won’t charge you interest "
    "on the penalty if you pay by the date specified on the bill. There are "
    "situations where the IRS can’t figure your penalty for you and you must "
    "file Form 2210. See Form 2210 for details.",
    65,
)

heading("Third Party Designee", 65, 4)
para(
    "If you want to allow your preparer, a friend, a family member, or any "
    "other person you choose to discuss your 2025 tax return with the IRS, "
    "check the “Yes” box in the “Third Party Designee” area of your return. "
    "Also enter the designee’s name, phone number, and any five digits the "
    "designee chooses as their personal identification number (PIN).",
    65,
)
para(
    "If you check the “Yes” box, you, and your spouse if filing a joint return, "
    "are authorizing the IRS to call the designee to answer any questions that "
    "may arise during the processing of your return. You are also authorizing "
    "the designee to:",
    65,
)
listing(
    [
        "Give the IRS any information that is missing from your return;",
        "Call the IRS for information about the processing of your return or "
        "the status of your refund or payment(s);",
        "Receive copies of notices or transcripts related to your return, upon "
        "request; and",
        "Respond to certain IRS notices about math errors, offsets, and return "
        "preparation.",
    ],
    65,
)
para(
    "You aren’t authorizing the designee to receive any refund check, bind you "
    "to anything (including any additional tax liability), or otherwise "
    "represent you before the IRS. If you want to expand the designee’s "
    "authorization, see Pub. 947.",
    65,
)
para(
    "This authorization will automatically end no later than the due date (not "
    "counting extensions) for filing your 2026 tax return. This is April 15, "
    "2027, for most people.",
    65,
)

heading("Sign Your Return", 65, 3)
# spans the 65->66 break; authored whole at its starting page
para(
    "Form 1040 or 1040-SR isn’t considered a valid return unless you sign it in "
    "accordance with the requirements in these instructions. If you are filing "
    "a joint return, your spouse must also sign. If your spouse can’t sign the "
    "return, see Pub. 501. Be sure to date your return and enter your "
    "occupation(s). If you have someone prepare your return, you are still "
    "responsible for the correctness of the return. If your return is signed by "
    "a representative for you, you must have a power of attorney attached that "
    "specifically authorizes the representative to sign your return. To do "
    "this, you can use Form 2848. If you are filing a joint return with your "
    "spouse who died in 2025, see «Death of a Taxpayer», earlier.",
    65,
)

# ============================================================ page 66

heading("Court-Appointed Conservator, Guardian, or Other Fiduciary", 66, 4)
para(
    "If you are a court-appointed conservator, guardian, or other fiduciary for "
    "a mentally or physically incompetent individual who has to file Form 1040 "
    "or 1040-SR, sign your name for the individual and file Form 56.",
    66,
)

heading("Child’s Return", 66, 4)
para(
    "If your child can’t sign their return, either parent can sign the child’s "
    "name in the space provided. Then, enter “By (your signature), parent for "
    "minor child.”",
    66,
)

heading("Requirements for a Paper Return", 66, 4)
para(
    "You must handwrite your signature on your return if you file it on paper. "
    "Digital, electronic, or typed-font signatures are not valid signatures for "
    "Form 1040 or 1040-SR filed on paper.",
    66,
)

heading("Requirements for an Electronic Return", 66, 4)
para(
    "The requirements for signing an electronic return will be different "
    "depending on whether you use tax software or a tax practitioner. To file "
    "your return electronically, you must sign the return electronically using "
    "a personal identification number (PIN) and provide the information "
    "described below. If you are filing online using software, you must use a "
    "Self-Select PIN. If you are filing electronically using a tax "
    "practitioner, you can use a Self-Select PIN or a Practitioner PIN.",
    66,
)
para(
    "If we issued you an identity protection personal identification number (IP "
    "PIN) (as described in more detail next), all six digits of your IP PIN "
    "must appear in the IP PIN spaces provided next to the space for your "
    "occupation for your electronic signature to be complete. Failure to "
    "include an issued IP PIN on the electronic return will result in an "
    "invalid signature and a rejected return. If you are filing a joint return "
    "and both taxpayers were issued an IP PIN, enter both IP PINs in the spaces "
    "provided.",
    66,
)

heading("Self-Select PIN", 66, 5)
para(
    "The Self-Select PIN method allows you to create your own PIN. If you are "
    "married filing jointly, you and your spouse will each need to create a PIN "
    "and enter these PINs as your electronic signatures.",
    66,
)
para(
    "A PIN is any combination of five digits you choose except five zeros. If "
    "you use a PIN, there are no papers to sign and nothing to mail—not even "
    "your Form(s) W-2.",
    66,
)
para(
    "Your electronic return signed with a Self-Select PIN is considered a "
    "validly signed return only when it includes your PIN, last name, date of "
    "birth, IP PIN, if applicable, and your adjusted gross income (AGI) from "
    "your originally filed 2024 federal income tax return, if applicable. If "
    "you’re filing jointly, your electronic return must also include your "
    "spouse’s PIN, last name, date of birth, IP PIN, if applicable, and AGI, if "
    "applicable, in order to be considered validly signed. (You, and your "
    "spouse if filing jointly, may each use your own prior-year PIN to verify "
    "your identity if you filed electronically last year. If you use your "
    "prior-year PIN or enter your IP PIN, you are not required to enter your "
    "prior-year AGI. The prior-year PIN is the five-digit PIN you used to "
    "electronically sign your 2024 return.)",
    66,
)
para(
    "If you need your AGI from your originally filed 2024 federal income tax "
    "return, and you don’t have your 2024 income tax return, you can access "
    "your transcript through your online account at "
    "[[IRS.gov/Account|https://www.irs.gov/account]]. You can also go to "
    "[[IRS.gov/Transcript|https://www.irs.gov/transcript]] or call the IRS at "
    "800-908-9946 to get a free transcript of your return. Don’t use your AGI "
    "from an amended return (Form 1040-X) or a math error correction made by "
    "the IRS. AGI is the amount shown on your 2024 Form 1040 or 1040-SR, line "
    "11.",
    66,
)
para(
    "For more information, go to [[IRS.gov/Efile|https://www.irs.gov/efile]].",
    66,
)
callout(
    "Caution.",
    "You can’t use the Self-Select PIN method if you are a first-time filer "
    "under age 16 at the end of 2025.",
    66,
)

heading("Practitioner PIN", 66, 5)
para(
    "The Practitioner PIN method allows you to authorize your tax practitioner "
    "to enter or generate your PIN. Your electronic return is considered a "
    "validly signed return only when it includes your PIN, last name, date of "
    "birth, and IP PIN, if applicable. If you’re filing jointly, your "
    "electronic return must also include your spouse's PIN, last name, date of "
    "birth, and IP PIN, if applicable, in order to be considered validly "
    "signed. The practitioner can provide you with details.",
    66,
)

heading("Form 8453", 66, 5)
para(
    "You must send in a paper Form 8453 if you have to attach certain forms or "
    "other documents that can't be electronically filed. See Form 8453.",
    66,
)

heading("Identity Protection PIN", 66, 3)
callout(
    "Tip.",
    "All taxpayers are now eligible for an Identity Protection Personal "
    "Identification Number (IP PIN). For more information, see Pub. 5477. To "
    "apply for an IP PIN, go to [[IRS.gov/IPPIN|https://www.irs.gov/ippin]] and "
    "use the Get an IP PIN tool.",
    66,
)
para(
    "If you received an IP PIN from the IRS, enter it in the IP PIN spaces "
    "provided next to the space for your occupation. You must correctly enter "
    "all six numbers of your IP PIN. If you didn’t receive an IP PIN, leave "
    "these spaces blank.",
    66,
)
callout(
    "Caution.",
    "New IP PINs are generated every year. They will generally be sent out by "
    "mid-January 2026. Use this IP PIN on your 2025 return as well as any "
    "prior-year returns you file in 2026.",
    66,
)
para(
    "If you are filing a joint return and both taxpayers receive an IP PIN, "
    "enter both IP PINs in the spaces provided.",
    66,
)
para(
    "If you need more information, including how to retrieve your IP PIN "
    "online, go to [[IRS.gov/IPPIN|https://www.irs.gov/ippin]]. If you’re "
    "unable to retrieve your IP PIN online, you can call 800-908-4490.",
    66,
)

heading("Phone Number and Email Address", 66, 4)
para(
    "You have the option of entering your phone number and email address in the "
    "spaces provided. There will be no effect on the processing of your return "
    "if you choose not to enter this information. Note that the IRS initiates "
    "most contacts through regular mail delivered by the United States Postal "
    "Service.",
    66,
)
# spans the 66->67 break; authored whole at its starting page
para(
    "For information on how to report phone scams or unsolicited emails "
    "claiming to be from the IRS, see «Secure Your Tax Records From Identity "
    "Theft», later.",
    66,
)

# ============================================================ page 67

heading("Paid Preparer Must Sign Your Return", 67, 3)
para(
    "Generally, anyone you pay to prepare your return must sign it and include "
    "their Preparer Tax Identification Number (PTIN) in the space provided. The "
    "preparer must give you a copy of the return for your records. Someone who "
    "prepares your return but doesn’t charge you shouldn’t sign your return.",
    67,
)
para(
    "If your paid preparer is self-employed, then they should check the "
    "“self-employed” checkbox.",
    67,
)

heading("Assemble Your Return", 67, 2)
# ONE paragraph, not four. This document marks a new paragraph with a
# first-line indent, and there is none anywhere in this block: "attach them
# last." and "File your return," sit on the same line. The four sentences read
# like separate instructions and were first authored as four paragraphs; the
# rendered page says otherwise.
para(
    "Assemble any schedules and forms behind Form 1040 or 1040-SR in order of "
    "the “Attachment Sequence No.” shown in the upper-right corner of the "
    "schedule or form. If you have supporting statements, arrange them in the "
    "same order as the schedules or forms they support and attach them last. "
    "File your return, schedules, and other attachments on standard size paper. "
    "Cutting the paper may cause problems in processing your return. Don’t "
    "attach correspondence or other items unless required to do so. Attach "
    "Forms W-2 and 2439 to Form 1040 or 1040-SR. If you received a Form W-2c "
    "(a corrected Form W-2), attach your original Forms W-2 and any Forms "
    "W-2c. Attach Forms W-2G and 1099-R to Form 1040 or 1040-SR if tax was "
    "withheld.",
    67,
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 20 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "65-67 and completes the Line Instructions section: the estimated tax "
    "penalty, Third Party Designee, Sign Your Return, Identity Protection PIN, "
    "Paid Preparer Must Sign Your Return, and Assemble Your Return. It carries "
    "no document title by design — only tranche 1 does — so this file validates "
    "through merge-plans rather than standalone. No partial rebuild is "
    "delivered.",

    "THE HEADING LEVELS COULD NOT BE READ OFF THE TYPE SIZES, and the "
    "document's own table of contents is what settled them. Two sizes of "
    "section banner are printed here: 16pt over a thick rule and 14pt over a "
    "thin one. That distinguishes “Sign Your Return” (16pt) from “Line 38” and "
    "“Third Party Designee” (14pt) cleanly enough. But “Assemble Your Return” "
    "is ALSO 16pt over a thick rule, and is nevertheless a different depth: the "
    "TOC on page 2 lists it as a top-level entry alongside “What's New”, "
    "“Filing Requirements” and “Line Instructions for Forms 1040 and 1040-SR”, "
    "while “Sign Your Return” appears there nested UNDER Line Instructions. So "
    "“Assemble Your Return” is authored at level 2 and “Sign Your Return” at "
    "level 3, though they are typographically identical. Type size states "
    "prominence; the TOC states structure, and where they disagree the TOC is "
    "the better evidence.",

    "“THIRD PARTY DESIGNEE” IS NESTED UNDER “AMOUNT YOU OWE”, WHICH IS THE "
    "SOURCE'S DOING. It is printed at 14pt over a thin rule, the same treatment "
    "as “Line 37” and “Line 38”, and it falls inside the run of those headings "
    "that follows the “Amount You Owe” banner on page 63. It is not in the TOC, "
    "so there is no independent evidence to promote it. Reading it as a "
    "subsection of Amount You Owe is a poor fit for what it says, but "
    "re-parenting it would mean overriding the document's own structure on a "
    "judgment call, so the printed hierarchy is followed and the oddity noted "
    "here instead.",

    "“PHONE NUMBER AND EMAIL ADDRESS” LIKEWISE SITS UNDER “IDENTITY PROTECTION "
    "PIN”. It is a 12pt subhead that follows the Identity Protection PIN banner "
    "with no new banner between, so by the page's own typography it is a child "
    "of that section, even though it is about the phone and email fields rather "
    "than about IP PINs. Same reasoning as above: followed, and disclosed.",

    "THE SAME VISIBLE LINK TEXT RESOLVES TO DIFFERENT TARGETS ON DIFFERENT "
    "PAGES, so every href is taken from that page's own annotation rather than "
    "from a document-wide table. “IRS.gov/Account” on page 66 targets "
    "irs.gov/account, but the identical text on page 64 (tranche 19) targets "
    "irs.gov/your-account. Each rect was matched against the text items falling "
    "inside it. Pages 65 and 67 carry no Link annotations at all, so their "
    "cross-references are marked emphasis only.",

    "THE FOUR-ITEM “ALSO SUBTRACT FROM LINE 24 ANY” LIST IS PRINTED TWICE, once "
    "for the 2025 return and once for the 2024 return, and both copies are "
    "reproduced. They are not quite identical — the second adds “and” to the "
    "third item — and each governs a different tax year, so collapsing them "
    "would force a reader working through the 2024 test to look back at the "
    "2025 one. The generator builds both from one shared list so the wording "
    "cannot drift between them.",

    "THE EXCEPTION'S TWO CONDITIONS ARE AN ORDERED LIST, because the source "
    "numbers them 1. and 2. and the surrounding sentence says “either of the "
    "following applies” — the numbering is referred to, not decorative.",

    "ICON CALLOUTS AND RUN-IN LEADS follow the conventions already settled: "
    "CAUTION and TIP become paragraphs opening with a strong “Caution.”/“Tip.” "
    "in sentence case, and bold run-in leads (Exception, Self-Select PIN, "
    "Practitioner PIN, Form 8453) become headings with the trailing period "
    "dropped.",

    "PARAGRAPH BREAKS COME FROM THE FIRST-LINE INDENT, not from where a "
    "sentence sounds like it ends. “Assemble Your Return” reads as four "
    "separate instructions — assemble in sequence order, use standard size "
    "paper, don't attach correspondence, attach the W-2s — and was first "
    "authored as four paragraphs. The rendered page has no indent anywhere in "
    "the block, and “attach them last.” and “File your return,” fall on the "
    "same line, so it is ONE paragraph and is authored as one. This document "
    "indents every genuine new paragraph, which makes the render the deciding "
    "evidence; extraction alone cannot show it.",

    "TWO PARAGRAPHS SPAN A PAGE BREAK and are authored whole at their starting "
    "page, as this rebuild's handoff convention requires: the “Sign Your "
    "Return” opening paragraph runs from 65 to 66, and the phone-scams "
    "paragraph runs from 66 to 67.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: printed page numbers "
    "and the standing “Need more information or forms? Visit IRS.gov.” footer. "
    "Soft hyphens removed and justified line-break hyphens closed, while "
    "genuine compounds (1040-SR, prior-year, court-appointed, typed-font, "
    "group-term, Look-back, self-employed) and the source's own em dash in "
    "“nothing to mail—not even your Form(s) W-2” are kept. The literal “-0-” on "
    "line 35a is kept as printed.",
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
print(f"wrote {OUT}: {len(blocks)} blocks, pages {pages[0]}-{pages[-1]}, "
      f"{links} links, {len(review_notes)} review notes")
