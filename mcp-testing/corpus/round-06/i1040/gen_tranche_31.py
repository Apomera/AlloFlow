#!/usr/bin/env python3
"""Author tranche 31 of the i1040 rebuild: printed page 91 — Schedule 1 lines
8a through 8o, the "Other Income" series.

Fourteen short topics, each a "Line 8x" heading over a bold run-in lead. The
two are merged into one heading; see the review notes.

Usage: python gen_tranche_31.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-31-pages-91-91.json")

PAGE = 91
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


def heading(text, level=5):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": PAGE})


def para(text):
    plain, runs = rich(text)
    block = {"type": "paragraph", "text": plain, "source_page": PAGE}
    if runs:
        block["runs"] = runs
    blocks.append(block)


def callout(label, body):
    plain, runs = rich(body)
    text = f"{label} {plain}"
    if runs:
        runs = [{"text": label, "style": "strong"}, {"text": " ", "style": "normal"}] + runs
    else:
        runs = [{"text": label, "style": "strong"}, {"text": " " + plain, "style": "normal"}]
    assert "".join(run["text"] for run in runs) == text
    blocks.append({"type": "paragraph", "text": text, "runs": runs, "source_page": PAGE})


# NOTE: the lines 8a-8z CAUTION whose tail is printed at the top of this page
# was authored whole at page 89 (tranche 29); it runs 89 -> 91, skipping the
# full-page worksheet on page 90. It is NOT repeated here.

heading("Line 8a. Net operating loss (NOL) deduction")
para(
    "Enter any deduction for an NOL from an earlier year. Enter the amount in "
    "the preprinted parentheses (as a negative number). The amount of your "
    "deduction will be subtracted from the other amounts of income listed on "
    "lines 8b through 8z. See the Instructions for Form 172 for details."
)

heading("Line 8b. Gambling")
para(
    "Enter gambling winnings not attributable to a trade or business. Gambling "
    "winnings include lotteries, raffles, a lump-sum payment from the sale of a "
    "right to receive future lottery payments, etc. For details on gambling "
    "losses, see the instructions for Schedule A, line 16."
)
callout(
    "Tip.",
    "Attach Form(s) W-2G to Form 1040 or 1040-SR if any federal income tax was "
    "withheld.",
)

heading("Line 8c. Cancellation of debt")
para(
    "Enter any canceled debt. Canceled debt may be shown in box 2 of Form "
    "1099-C. However, part or all of your income from cancellation of debt may "
    "be nontaxable. See Pub. 4681 or go to IRS.gov and enter “canceled debt” or "
    "“foreclosure” in the search box."
)

heading("Line 8d. Foreign earned income exclusion and housing exclusion from Form 2555")
para(
    "Enter the amount of your foreign earned income and housing exclusion from "
    "Form 2555, line 45. Enter the amount in the preprinted parentheses (as a "
    "negative number). The amount from Form 2555, line 45, will be subtracted "
    "from the other amounts of income listed on lines 8a through 8c and lines "
    "8e through 8z."
)
para(
    "Complete the Foreign Earned Income Tax Worksheet if you enter an amount on "
    "Form 2555, line 45."
)

heading("Line 8e. Income from Form 8853")
para("Enter the total of the amounts from Form 8853, lines 8, 12, and 26. See Pub. 969.")
callout(
    "Caution.",
    "You may have to pay an additional tax if you received a taxable "
    "distribution from an Archer MSA or Medicare Advantage MSA. See the "
    "Instructions for Form 8853.",
)

heading("Line 8f. Income from Form 8889")
para("Enter the total of the amounts from Form 8889, lines 16 and 20.")
callout(
    "Caution.",
    "You may have to pay an additional tax if you received a taxable "
    "distribution from a health savings account. See the Instructions for Form "
    "8889.",
)

heading("Line 8h. Jury duty pay")
para("Enter any jury duty pay and see the instructions for line 24a.")

heading("Line 8i. Prizes and awards")
para(
    "Enter prizes and awards but see the instructions for line 8m, «Olympic and "
    "Paralympic medals and USOC prize money», later."
)

heading("Line 8j. Activity not engaged in for profit income")
para("See Pub. 525.")

heading("Line 8k. Stock options")
para(
    "Enter any income from the exercise of stock options not otherwise reported "
    "on Form 1040 or 1040-SR, line 1h."
)

heading(
    "Line 8l. Income from the rental of personal property if you engaged in the "
    "rental for profit but were not in the business of renting such property"
)
para("Also see the instructions for line 24b, later.")

heading("Line 8m. Olympic and Paralympic medals and USOC prize money")
para(
    "The value of Olympic and Paralympic medals and the amount of United States "
    "Olympic Committee (USOC) prize money you receive on account of your "
    "participation in the Olympic or Paralympic Games may be nontaxable. These "
    "amounts should be reported to you in box 3 of Form 1099-MISC. To see if "
    "these amounts are nontaxable, first figure your adjusted gross income, "
    "including the amount of your medals and prize money."
)
para(
    "If your adjusted gross income is not more than $1,000,000 ($500,000 if "
    "married filing separately), these amounts are nontaxable and you should "
    "include the amount in box 3 of Form 1099-MISC on line 8m, then subtract it "
    "by including it on line 24c."
)

heading("Line 8n. Section 951(a) inclusion")
para(
    "Section 951 generally requires that a U.S. shareholder of a controlled "
    "foreign corporation include in income its pro rata share of the "
    "corporation’s subpart F income and its amount determined under section "
    "956. Enter on line 8n the sum of any amounts reported on lines 1a through "
    "1h and line 2 of your Forms 5471, Schedule(s) I."
)

heading("Line 8o. Section 951A(a) inclusion")
para(
    "Section 951A generally requires that a U.S. shareholder of a controlled "
    "foreign corporation include in income its global intangible low-taxed "
    "income (GILTI). Enter on line 8o from your Forms 8992 the sum of any "
    "amounts reported on Part II, line 5. Remember to attach copies of your "
    "Forms 8992."
)
callout(
    "Caution.",
    "If you made a section 962 election and have an income inclusion under "
    "section 951 or 951A, do not report that income on line 8n or 8o, as "
    "applicable. Instead, report the tax with respect to the section 962 "
    "election on Form 1040 or 1040-SR, line 16, and attach a statement showing "
    "how you figured the tax that includes the gross amounts of section 951 and "
    "section 951A income.",
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 31 OF A MULTI-SESSION REBUILD. This plan covers printed page 91, "
    "Schedule 1 lines 8a through 8o. It carries no document title by design — "
    "only tranche 1 does — so this file validates through merge-plans rather "
    "than standalone. No partial rebuild is delivered.",

    "THE CAUTION AT THE TOP OF THIS PAGE IS NOT REPEATED. It was authored whole "
    "at page 89 in tranche 29 and runs 89 to 91, skipping the full-page "
    "worksheet on page 90. Check this page's shortfall with "
    "mcp-testing/tools/carried_block_check.cjs against TRANCHE 29, not against "
    "the page-90 tranche, which carries nothing.",

    "“Line 8x” AND ITS BOLD RUN-IN LEAD ARE MERGED INTO ONE HEADING, and this "
    "is the decision worth arguing. The source prints a small “Line 8b” head "
    "and then opens the paragraph beneath it with a bold “Gambling.”. Left as "
    "printed, the heading list for this page would read “Line 8a, Line 8b, Line "
    "8c…” — fourteen entries that tell a reader nothing, on a page whose whole "
    "purpose is to let someone find the one kind of income that applies to "
    "them. Merged, it reads “Line 8b. Gambling”, “Line 8c. Cancellation of "
    "debt”, “Line 8k. Stock options”. The lead is removed from the paragraph "
    "rather than duplicated, which is what tranche 2 established for promoted "
    "run-in leads, and the two conventions (Line NN plus its title; promote the "
    "run-in) agree here.",

    "ONE MERGED HEADING IS UNAVOIDABLY LONG. Line 8l's lead is a full clause — "
    "“Income from the rental of personal property if you engaged in the rental "
    "for profit but were not in the business of renting such property” — and "
    "the paragraph left under it is a single cross-reference. It is kept whole "
    "rather than truncated: the condition is the point of that line, and a "
    "shortened heading would invite a reader to enter rental income that does "
    "not qualify.",

    "LINE 8g IS ABSENT, AND THAT IS THE SOURCE'S OWN NUMBERING. The series runs "
    "8a, 8b, 8c, 8d, 8e, 8f, 8h, 8i… with no 8g on the page and no gap in the "
    "text around it. Nothing was dropped in authoring; the printed instructions "
    "simply have no entry for 8g.",

    "ICON CALLOUTS as established in tranche 3: one TIP and three CAUTION boxes "
    "become paragraphs opening with a strong label in sentence case, each "
    "placed after the line it qualifies. The last of them, on the section 962 "
    "election, qualifies BOTH lines 8n and 8o and sits after 8o.",

    "NOTHING SPANS THE 91-92 BREAK, checked rather than assumed. The last "
    "column of this page appears to stop mid-sentence at “Enter on line 8o "
    "from your Forms 8992 the”, which is what a truncated reading of the "
    "column dump suggests; page 92 in fact opens a new topic at line 8p. The "
    "sentence completes on this page (“…the sum of any amounts reported on "
    "Part II, line 5. Remember to attach copies of your Forms 8992.”) and is "
    "followed by a third CAUTION box that a short reading of the column misses "
    "entirely. Both were recovered by reading the column to its end before "
    "authoring.",

    "PAGE FURNITURE OMITTED: the printed page number and the standing “Need "
    "more information or forms? Visit IRS.gov.” footer. Soft hyphens removed "
    "and justified line-break hyphens closed, while genuine compounds are kept "
    "(1040-SR, 1099-C, 1099-MISC, W-2G, lump-sum, low-taxed, non-taxable "
    "spellings as printed).",
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

print(f"wrote {OUT}: {len(blocks)} blocks, page {PAGE}, "
      f"{len([b for b in blocks if b['type'] == 'heading'])} headings, "
      f"{len(review_notes)} review notes")
