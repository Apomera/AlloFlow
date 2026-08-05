#!/usr/bin/env python3
"""Author tranche 47 of the i1040 rebuild: printed page 107 — the five methods
for figuring qualified overtime compensation and worked Examples 1 through 4.

Usage: python gen_tranche_47.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-47-pages-107-107.json")

PAGE = 107
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


def heading(text, level):
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


def listing(items, ordered):
    expanded = [rich(i) for i in items]
    block = {"type": "list", "ordered": ordered, "items": [e[0] for e in expanded],
             "source_page": PAGE}
    if any(e[1] for e in expanded):
        block["item_runs"] = [e[1] or [{"text": e[0], "style": "normal"}] for e in expanded]
    blocks.append(block)


# The paragraph that opens this page ("If the amount of your qualified overtime
# compensation isn't separately identified...") was authored whole in tranche 46
# because it begins in page 106's last column. It is deliberately not repeated.
para(
    "If your employer is covered by a different overtime rule in section 7 of "
    "the FLSA, rather than the general rule in section 7(a), you must compute "
    "your overtime compensation using the rule that applies to you and may use "
    "any of the following methods so long as it produces a reasonable result "
    "under the rule that applies to you. This may apply if, for example, you "
    "are a public sector employee in fire protection or law enforcement, or an "
    "employee of a political subdivision of a state or an interstate "
    "governmental agency who receives compensatory time off instead of cash "
    "overtime. See «Example 4» and «Example 5» for how this might apply to "
    "certain employees."
)

# The printed "1." through "5." markers are NOT carried as literal text — the
# ordered list generates them. The prose refers to these by number ("paragraphs
# 1 through 5", "paragraph 2 or paragraph 4"), so the enumeration is
# load-bearing and the five methods must stay one numbered list.
listing([
    "‹Statement received separately accounts for overtime.› If a statement "
    "from your employer separately shows the “half” portion of the “time and a "
    "half” compensation (FLSA Overtime Premium), you can use the FLSA Overtime "
    "Premium that is separately shown to determine the amount of your "
    "qualified overtime compensation.",

    "‹Statement shows the overtime premium and regular wages.› If you are paid "
    "FLSA Overtime Premium and you receive a statement from your employer or "
    "the service recipient and the statement shows the total of all wages for "
    "the overtime hours (FLSA Overtime Premium plus regular wages), you can "
    "divide the total amount by three (3) and use the result when figuring "
    "your qualified overtime compensation.",

    "‹Statement shows the overtime premium and the premium you are paid is "
    "more than the amount of the FLSA Overtime Premium.› If you are paid more "
    "than the amount of FLSA Overtime Premium (for example, your employer pays "
    "you double your regular wages) and you receive a statement from your "
    "employer or the service recipient that shows the portion of the overtime "
    "earnings that is more than your regular wage rate for the overtime hours, "
    "then you can multiply that portion by the appropriate fraction to "
    "calculate the half portion of FLSA Overtime Premium. See «Example 2» for "
    "more information on how to figure the amount of your qualified overtime "
    "compensation in this situation.",

    "‹Statement shows the overtime premium and regular wages and the premium "
    "you are paid is more than the amount of the FLSA Overtime Premium.› If "
    "you are paid more than the amount of FLSA Overtime Premium (for example, "
    "your employer pays you double your regular rate of pay) and you receive a "
    "statement from your employer or the service recipient that shows the "
    "total of all pay for the overtime hours (for example, double your regular "
    "wages), then you can multiply the total amount by the appropriate "
    "fraction to estimate the half portion of FLSA Overtime Premium. See "
    "«Example 3» for more information on how to figure the amount of your "
    "qualified overtime compensation in this situation.",

    # The two printed sub-bullets are folded into this item: the plan schema's
    # list items are plain strings, so a nested list cannot be a child, and the
    # numbering above must not be broken. Same handling as Chart C in tranche 4,
    # with the second option's leading capital lowercased where it now sits
    # mid-sentence (Chart B). The source's own ", and" already joins them.
    "‹Statement doesn’t show overtime and employer or service recipient won’t "
    "provide information.› If the statements you receive from your employer or "
    "the service recipient don’t show the extra pay or the FLSA Overtime "
    "Premium and your employer or service recipient doesn’t give you any "
    "additional information, you can use a reasonable method to figure the "
    "amount of your qualified overtime compensation, that takes into account: "
    "the regular rate paid to you by your employer or service recipient, and "
    "the number of hours over the 40-hour workweek or an estimate if you don’t "
    "have records of the actual hours you worked.",
], ordered=True)

callout(
    "Tip.",
    "If you use the method described in paragraph 2 or paragraph 4 to "
    "determine the amount of your qualified overtime compensation, and the "
    "method results in underestimating your qualified overtime compensation "
    "(for example, because your regular rate of pay is increased by a "
    "discretionary bonus), you can adjust the method to take the difference "
    "into account.",
)
para(
    "Make sure to keep a record of the documents you use when determining the "
    "amount of your qualified overtime compensation."
)

heading("Example 1", 5)
para(
    "You are an FLSA-eligible employee. In 2025, you received $50,000 in "
    "regular pay and $15,000 for overtime hours worked. Your Form W-2 does not "
    "separately show your qualified overtime compensation; however, you have "
    "access to your payroll system that shows you were paid $15,000 for "
    "overtime hours in 2025. You can include $5,000 of your wages for the "
    "overtime hours when figuring your deduction for qualified overtime "
    "compensation. The $5,000 is the “half” portion of “time-and-a-half” "
    "($15,000 divided by 3)."
)

heading("Example 2", 5)
para(
    "You are an FLSA-eligible employee and work for an employer who pays "
    "overtime equal to twice the regular pay. In 2025, you were paid $50,000 "
    "for non-overtime hours and $20,000 for overtime hours worked. Your Form "
    "W-2 does not separately show qualified overtime compensation. However, "
    "you have a pay stub showing that $10,000 of the overtime pay was for the "
    "normal rate of pay for the overtime hours and $10,000 of the overtime pay "
    "was the premium amount. “Time-and-a-half” would be equal to $15,000 (the "
    "$10,000 for your regular wage for the overtime hours multiplied by 1.5). "
    "The “half” portion of the “time-and-a-half” rate required by the FLSA is "
    "$5,000 ($15,000 divided by 3). You can include $5,000 when figuring your "
    "deduction for qualified overtime compensation."
)

heading("Example 3", 5)
para(
    "The facts are the same as in «Example 2», but your pay stub does not "
    "separately show the premium amount of overtime pay that is more than your "
    "regular wages. Instead, it shows that $20,000 was the total amount of pay "
    "for the overtime hours. The $20,000 is double your regular wages for the "
    "overtime hours you worked. Your regular wages are $10,000 (the $20,000 "
    "total amount of overtime pay divided by 2). “Time-and-a-half” would be "
    "equal to $15,000 (the $10,000 of your regular wages for the overtime "
    "hours multiplied by 1.5). The “half” portion of the “time-and-a-half” "
    "rate required by the FLSA is $5,000 ($15,000 divided by 3). You can "
    "include $5,000 when figuring your deduction for qualified overtime "
    "compensation."
)

# Spans the 107-108 break and jumps TWO full-page worksheets: it begins in the
# last column here and finishes below both worksheets at the top of page 108.
# Authored whole here; tranche 48 must not repeat it.
heading("Example 4", 5)
para(
    "You work in law enforcement and your employer is covered by a special "
    "overtime rule in section 7 of the FLSA. In 2025, you were paid $15,000 "
    "for overtime hours worked on a “work period” basis of 14 days. You can "
    "include $5,000 of your overtime pay when figuring your deduction for "
    "qualified overtime compensation ($15,000 divided by 3)."
)

# ------------------------------------------------------------- review notes

review_notes = [
    "TRANCHE 47 OF A MULTI-SESSION REBUILD. This plan covers printed page 107: "
    "the five methods for figuring qualified overtime compensation and worked "
    "Examples 1 through 4. It carries no document title by design — only "
    "tranche 1 does — so this file validates through merge-plans rather than "
    "standalone. No partial rebuild is delivered.",

    "ONE BLOCK IS CARRIED IN AND NOT REPEATED: the paragraph opening this page, "
    "“If the amount of your qualified overtime compensation isn’t separately "
    "identified…”, was authored whole at page 106 in tranche 46. Check the "
    "shortfall with carried_block_check.cjs against tranche 46.",

    "ONE BLOCK IS CARRIED OUT AND IT JUMPS TWO FULL-PAGE WORKSHEETS. Example 4 "
    "begins in the last column here and finishes at the top of page 108 BELOW "
    "both the “Qualified Overtime Compensation From More Than One Employer” "
    "worksheet and the payor worksheet beneath it. It is authored whole here, "
    "ending “…($15,000 divided by 3).”. **Tranche 48 must open at the "
    "worksheets and then Example 5**, and must not re-author Example 4. Sixth "
    "block in the rebuild to jump a full-page insert, and the first to jump "
    "two.",

    "THE FIVE METHODS ARE ONE ORDERED LIST AND THE ENUMERATION IS "
    "LOAD-BEARING. The prose refers to them by number — “the methods described "
    "in paragraphs 1 through 5”, “the method described in paragraph 2 or "
    "paragraph 4” — so they cannot be split into paragraphs. The printed “1.” "
    "through “5.” are NOT carried as literal text; the list structure "
    "generates them, so the five digits appear in the recall shortfall exactly "
    "as they did in tranche 29.",

    "METHOD 5's TWO SUB-BULLETS ARE FOLDED INTO ITS ITEM. The plan schema's "
    "list items are plain strings (checked in repair-plan.schema.json), so a "
    "nested list cannot be a child of a list item, and breaking the numbered "
    "list to emit them would destroy the enumeration the prose depends on. "
    "They are joined into the parent sentence after its colon, exactly as "
    "Chart C was handled in tranche 4, with the second option's leading "
    "capital lowercased where it now sits mid-sentence (Chart B). The source's "
    "own “, and” already joins the two, so no connective was invented. WHAT IS "
    "LOST: the visual fact that these were two bullets rather than one "
    "sentence. Nothing else.",

    "FOUR FACES SEPARATE CLEANLY ON THIS PAGE and each is treated differently: "
    "g_d0_f3 (bold) is the five methods' run-in leads, kept as strong INSIDE "
    "their list items; g_d0_f4 is the Example labels, promoted to level-5 "
    "headings with the period dropped; g_d0_f2 (italic) is both the inline "
    "«Example N» cross-references, marked emphasis, and the TIP box text; "
    "g_d0_f5 is the TIP icon glyph. The Examples are level 5 under "
    "“Determining the amount of qualified overtime compensation for 2025”, "
    "which tranche 46 set at level 4.",

    "A SECOND “Example 1/2/3” SERIES. Page 105 already carries Examples 1-3 "
    "for the net income limitation; these are the overtime series and the "
    "numbering restarts in the source. Same situation as tranches 43 and 44, "
    "and the headings are deliberately not disambiguated — renaming them would "
    "break the cross-references, which say “Example 2” and “Example 3” plainly.",

    "“time and a half” IS UNHYPHENATED IN METHOD 1 and hyphenated "
    "(“time-and-a-half”) in Examples 1, 2, and 3. Both are reproduced as "
    "printed. PAGE FURNITURE OMITTED: the printed page number. Soft hyphens "
    "removed and line-break hyphens closed, while genuine compounds are kept "
    "(W-2, FLSA-eligible, 40-hour, non-overtime, time-and-a-half).",
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

print(f"wrote {OUT}: {len(blocks)} blocks, page {PAGE}, {len(review_notes)} review notes")
