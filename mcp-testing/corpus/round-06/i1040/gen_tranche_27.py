#!/usr/bin/env python3
"""Author tranche 27 of the i1040 rebuild: printed pages 86-87 — Interest and
Penalties, and Refund Information.

This completes everything before the schedule instructions (88-117).

Usage: python gen_tranche_27.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-27-pages-86-87.json")

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


# ============================================================ page 86
# NOTE: the "Contacting your local TAC" paragraph that finishes at the top of
# this page was authored whole at page 85 in tranche 26 and is NOT repeated.

heading("Interest and Penalties", 86, 3)
para(
    "You don’t have to figure the amount of any interest or penalties you may "
    "owe. We will send you a bill for any amount due. If you choose to include "
    "interest or penalties (other than the estimated tax penalty) with your "
    "payment, identify and enter the amount in the bottom margin of Form 1040 "
    "or 1040-SR, page 2. Don’t include interest or penalties (other than the "
    "estimated tax penalty) in the amount you owe on line 37. For more "
    "information on the estimated tax penalty, see «Line 38», earlier.",
    86,
)

heading("Interest", 86, 4)
para(
    "We will charge you interest on taxes not paid by their due date, even if "
    "an extension of time to file is granted. We will also charge you interest "
    "on penalties imposed for failure to file, negligence, fraud, substantial "
    "or gross valuation misstatements, substantial understatements of tax, and "
    "reportable transaction understatements. Interest is charged on the penalty "
    "from the due date of the return (including extensions).",
    86,
)

heading("Penalties", 86, 4)

heading("Late filing", 86, 5)
para(
    "If you don’t file your return by the due date (including extensions), the "
    "penalty is usually 5% of the amount due for each month or part of a month "
    "your return is late, unless you have a reasonable explanation. If you have "
    "a reasonable explanation for filing late, include it with your return. The "
    "penalty can be as much as 25% of the tax due. The penalty is 15% per "
    "month, up to a maximum of 75%, if the failure to file is fraudulent. If "
    "your return is more than 60 days late, the minimum penalty will be $525 or "
    "the amount of any tax you owe, whichever is smaller.",
    86,
)

heading("Late payment of tax", 86, 5)
para(
    "If you pay your taxes late, the penalty is usually ½ of 1% of the unpaid "
    "amount for each month or part of a month the tax isn’t paid. The penalty "
    "can be as much as 25% of the unpaid amount. It applies to any unpaid tax "
    "on the return. This penalty is in addition to interest charges on late "
    "payments.",
    86,
)

heading("Frivolous return", 86, 5)
para(
    "In addition to any other penalties, the law imposes a penalty of $5,000 "
    "for filing a frivolous return. A frivolous return is one that doesn’t "
    "contain information needed to figure the correct tax or shows a "
    "substantially incorrect tax because you take a frivolous position or "
    "desire to delay or interfere with the tax laws. This includes altering or "
    "striking out the preprinted language above the space where you sign. For a "
    "list of positions identified as frivolous, see Notice 2010-33, 2010-17 "
    "I.R.B. 609, available at "
    "[[IRS.gov/irb/2010-17_IRB#NOT-2010-33|https://www.irs.gov/irb/2010-17_IRB#NOT-2010-33]].",
    86,
)

heading("Other", 86, 5)
para(
    "Other penalties can be imposed for, among other things, negligence, "
    "substantial understatement of tax, reportable transaction understatements, "
    "filing an erroneous refund claim, and fraud. Criminal penalties may be "
    "imposed for willful failure to file, tax evasion, making a false "
    "statement, or identity theft. See Pub. 17 for details on some of these "
    "penalties.",
    86,
)

# ============================================================ page 87

heading("Refund Information", 87, 2)
para(
    "To check the status of your refund, go to "
    "[[IRS.gov/Refunds|https://www.irs.gov/refunds]] or use the free IRS2Go "
    "app, 24 hours a day, 7 days a week. Information about your refund will "
    "generally be available within 24 hours after the IRS receives your "
    "«e-filed» return or 4 weeks after you mail a paper return. But if you "
    "filed Form 8379 with your return, allow 14 weeks (11 weeks if you filed "
    "electronically) before checking your refund status.",
    87,
)
para(
    "The IRS can’t issue refunds before mid-February 2026 for returns that "
    "claim the earned income credit or the additional child tax credit. This "
    "delay applies to the entire refund, not just the portion associated with "
    "these credits.",
    87,
)
para(
    "To use «Where’s My Refund», have a copy of your tax return handy. You will "
    "need to enter the following information from your return.",
    87,
)
bullets(
    [
        "Your social security number (or individual taxpayer identification "
        "number).",
        "Your filing status.",
        "The exact whole dollar amount of your refund.",
    ],
    87,
)
para(
    "«Where’s My Refund» will provide an actual personalized refund date as "
    "soon as the IRS processes your tax return and approves your refund.",
    87,
)
callout(
    "Tip.",
    "Updates to refund status are made once a day—usually at night.",
    87,
)
para(
    "If you don’t have Internet access, you can call 800-829-1954, 24 hours a "
    "day, 7 days a week, for automated refund information. Our phone and "
    "walk-in assistors can research the status of your refund only if it's been "
    "21 days or more since you filed electronically or more than 6 weeks since "
    "you mailed your paper return.",
    87,
)
para("Don’t send in a copy of your return unless asked to do so.", 87)
para(
    "To get a refund, you must generally file your return within 3 years from "
    "the date the return was due (including extensions).",
    87,
)
para(
    "«Where’s My Refund» doesn’t track refunds that are claimed on an amended "
    "tax return.",
    87,
)
para(
    "Refund information is also available in Spanish at "
    "[[IRS.gov/Spanish|https://www.irs.gov/es]] and by calling 800-829-1954.",
    87,
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 27 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "86-87: Interest and Penalties, and Refund Information. It completes "
    "everything before the schedule instructions. It carries no document title "
    "by design — only tranche 1 does — so this file validates through "
    "merge-plans rather than standalone. No partial rebuild is delivered.",

    "THE “CONTACTING YOUR LOCAL TAC” PARAGRAPH AT THE TOP OF PAGE 86 IS NOT "
    "REPEATED. It was authored whole at page 85 in tranche 26. Check the "
    "page-86 shortfall with mcp-testing/tools/carried_block_check.cjs against "
    "tranche 26 rather than reading it as loss.",

    "A STACKED FRACTION IS REASSEMBLED. The late-payment penalty is printed as "
    "a raised “1” over “/2”, set as three separate glyphs at three positions, "
    "and the raised numerator sits high enough that the reading order delivers "
    "it several words early: “If you pay your 1 taxes late, the penalty is "
    "usually /2 of 1%”. It is authored as “½ of 1%” using the single character "
    "U+00BD, which screen readers announce as “one half”. Reading the "
    "extraction alone would have produced a sentence with a stray 1 in it and a "
    "penalty rate of “/2 of 1%”.",

    "“INTEREST AND PENALTIES” NESTS UNDER “HOW TO GET TAX HELP”, which fits "
    "poorly with what it says. It is printed at 14pt with no TOC entry, "
    "following the level-2 “How To Get Tax Help” banner, so by the document's "
    "own structure it is a subsection of it. Same situation as “Third Party "
    "Designee” in session 20, and followed for the same reason: re-parenting "
    "would mean overriding the source on a judgment call. Its own subheads "
    "Interest and Penalties are level 4, and the four run-in leads under "
    "Penalties are level 5.",

    "“REFUND INFORMATION” IS LEVEL 2. It is printed at 18pt — larger than every "
    "other head in this stretch — AND the page-2 table of contents lists it as "
    "a top-level entry. Type size and TOC agree here, which they did not for "
    "“How To Get Tax Help”.",

    "PAGE 87'S THREE GRAPHICS ARE NOT REPRODUCED, and that is a decision rather "
    "than an omission. A “where's my refund?” logotype sits at the top left, "
    "and a computer icon and a telephone icon mark the online and by-phone "
    "routes; the body text wraps around all three, which is why the extraction "
    "shows the first lines of those paragraphs indented. None carries "
    "information the adjacent sentence does not already state — the text names "
    "Where's My Refund, says to go to IRS.gov/Refunds, and says “if you don't "
    "have Internet access, you can call”. They are decorative, so this rebuild "
    "carries their meaning in the prose and does not emit image blocks that a "
    "screen reader would skip anyway. The TIP icon is different: its label is "
    "real text in the content stream and it becomes a callout, as everywhere "
    "else.",

    "PARAGRAPH BREAKS ON PAGE 87 WERE READ OFF THE RENDER, not the indents. The "
    "text wrapping around those three graphics puts a large left indent on "
    "several lines that have nothing to do with paragraph starts, so the "
    "first-line-indent rule from session 20 cannot be applied mechanically "
    "here. The rendered page shows the real breaks, including the one before "
    "“The IRS can't issue refunds before mid-February 2026”, which the indent "
    "test alone would have missed.",

    "PAGE FURNITURE OMITTED as in every earlier tranche: printed page numbers "
    "and the standing “Need more information or forms? Visit IRS.gov.” footer. "
    "Soft hyphens removed and justified line-break hyphens closed, while "
    "genuine compounds are kept (1040-SR, mid-February, walk-in, e-filed, "
    "2010-33, 2010-17). The em dash in “once a day—usually at night” is the "
    "source's own and is kept.",
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
