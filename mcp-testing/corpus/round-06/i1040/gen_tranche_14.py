#!/usr/bin/env python3
"""Author tranche 14 of the i1040 rebuild: printed pages 44-45 — the rest of
the EIC's "Definitions and Special Rules".

Boundary in: tranche 13 ended on a complete definition ("Foster child"), so
this tranche starts at "Full-time student" with nothing carried over.

Boundary out: page 45 ends on a complete definition ("Welfare benefits, effect
of credit on"), so nothing spans the 45/46 edge. Page 46 begins the EIC
worksheets.

No new shapes: glossary entries as level-5 headings under the level-4
"Definitions and Special Rules", exactly as in tranches 6 and 13.

Usage: python gen_tranche_14.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-14-pages-44-45.json")

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


def bullets(items, page, ordered=False):
    plains, all_runs, any_runs = [], [], False
    for item in items:
        plain, runs = rich(item)
        plains.append(plain)
        if runs:
            any_runs = True
        all_runs.append(runs or [{"text": plain, "style": "normal"}])
    block = {"type": "list", "ordered": ordered, "items": plains, "source_page": page}
    if any_runs:
        block["item_runs"] = all_runs
    blocks.append(block)


def term(name, page):
    heading(name, page, 5)


WQYD = "«Who Qualifies as Your Dependent»"

# ── page 44 ──────────────────────────────────────────────────────────────────
term("Full-time student", 44)
para(
    "A full-time student is a child who during any part of 5 calendar months of "
    "2025 was enrolled as a full-time student at a school or took a full-time, "
    "on-farm training course given by a school or a state, county, or local "
    "government agency. A school includes a technical, trade, or mechanical "
    "school. It doesn't include an on-the-job training course, correspondence "
    "school, or school offering courses only through the Internet.",
    44,
)

term("Main home", 44)
para(
    "Your main home may be your house, apartment, mobile home, shelter, "
    "temporary lodging, or other location and doesn’t need to be the same "
    "physical location throughout 2025. You don’t need a permanent address.",
    44,
)

term("Married child", 44)
para(
    "A child who was married at the end of 2025 is a qualifying child only if "
    "(a) you can claim the child as your dependent, or (b) you could have "
    "claimed the child as your dependent except for the special rule for "
    f"«Children of divorced or separated parents» under {WQYD}, earlier.",
    44,
)

term("Members of the military", 44)
para(
    "If you were on extended active duty outside the United States, your main "
    "home is considered to be in the United States during that duty period. "
    "Extended active duty is military duty ordered for an indefinite period or "
    "for a period of more than 90 days. Once you begin serving extended active "
    "duty, you are considered to be on extended active duty even if you "
    "don’t serve more than 90 days.",
    44,
)

term("Nonresident aliens", 44)
para(
    "If you checked the box in the Filing Status section to treat a nonresident "
    "alien or dual-status alien spouse as a U.S. resident for the entire year, "
    "go to Step 2. Otherwise, stop; you can’t take the EIC. Check the box on "
    "line 27c. See «Nonresident aliens and dual-status aliens», earlier.",
    44,
)

term("Permanently and totally disabled", 44)
para(
    "A person is permanently and totally disabled if, at any time in 2025, the "
    "person couldn’t engage in any substantial gainful activity because of a "
    "physical or mental condition and a doctor has determined that this "
    "condition (a) has lasted or can be expected to last continuously for at "
    "least a year, or (b) can be expected to lead to death.",
    44,
)

term("Special rule for separated spouses", 44)
para(
    "If you are married, but not filing a joint return, had a qualifying child "
    "who lived with you in the United States for more than half of 2025, and "
    "either of the following apply, you can claim the EIC if:",
    44,
)
bullets(
    [
        "You lived apart from your spouse for the last 6 months of 2025, or",
        "You are legally separated according to your state law under a written "
        "separation agreement or a decree of separate maintenance and you "
        "didn’t live in the same household as your spouse at the end of 2025.",
    ],
    44,
)
para(
    "If you meet these requirements, make sure you check the box in the "
    "Dependents section that discusses the special rule for separated spouses "
    "on page 1 of Form 1040 or 1040-SR.",
    44,
)

term("Qualifying child of more than one person", 44)
para(
    "Even if a child meets the conditions to be the qualifying child of more "
    "than one person, only one person can claim the child as a qualifying child "
    "for all of the following tax benefits, unless the special rule for "
    f"«Children of divorced or separated parents» under {WQYD}, earlier, "
    "applies.",
    44,
)
bullets(
    [
        "Child tax credit, credit for other dependents, and additional child "
        "tax credit (lines 19 and 28).",
        "Head of household filing status.",
        "Credit for child and dependent care expenses (Schedule 3, line 2).",
        "Exclusion for dependent care benefits (Form 2441, Part III).",
        "Earned income credit (line 27a).",
    ],
    44,
    ordered=True,
)
para(
    "No other person can take any of the five tax benefits just listed based on "
    "the qualifying child. If you and any other person can claim the child as a "
    "qualifying child, the following rules apply. For purposes of these rules, "
    "the term “parent” means a biological or adoptive parent of an "
    "individual. It doesn’t include a stepparent or foster parent unless that "
    "person has adopted the individual.",
    44,
)
bullets(
    [
        "If only one of the persons is the child’s parent, the child is "
        "treated as the qualifying child of the parent.",
        "If the parents file a joint return together and can claim the child as "
        "a qualifying child, the child is treated as the qualifying child of the "
        "parents.",
        "If the parents don’t file a joint return together but both parents "
        "claim the child as a qualifying child, the IRS will treat the child as "
        "the qualifying child of the parent with whom the child lived for the "
        "longer period of time in 2025. If the child lived with each parent for "
        "the same amount of time, the IRS will treat the child as the qualifying "
        "child of the parent who had the higher adjusted gross income (AGI) for "
        "2025.",
        "If no parent can claim the child as a qualifying child, the child is "
        "treated as the qualifying child of the person who had the highest AGI "
        "for 2025.",
        "If a parent can claim the child as a qualifying child but no parent "
        "does so claim the child, the child is treated as the qualifying child "
        "of the person who had the highest AGI for 2025, but only if that "
        "person’s AGI is higher than the highest AGI of any parent of the "
        "child who can claim the child.",
    ],
    44,
)
callout(
    "Tip.",
    "If, under these rules, you can’t claim a child as a qualifying child "
    "for the EIC, you may be able to claim the EIC under the rules for a "
    "taxpayer without a qualifying child. For more information, see Pub. 596.",
    44,
)
heading("Example", 44, 6)
para(
    "Your child, Lee, meets the conditions to be a qualifying child for both "
    "you and your parent. Lee doesn’t meet the conditions to be a qualifying "
    "child of any other person, including Lee’s other parent. Under the rules "
    "just described, you can claim Lee as a qualifying child for all of the "
    "five tax benefits listed here for which you otherwise qualify. Your parent "
    "can’t claim any of the five tax benefits listed here based on Lee. "
    "However, if your parent’s AGI is higher than yours and you don’t "
    "claim Lee as a qualifying child, Lee is the qualifying child of your "
    "parent. For more details and examples, see Pub. 596.",
    44,
)

term("Social security number (SSN)", 44)
# Runs across the 44-45 page break; authored whole here.
para(
    "For the EIC, a valid SSN is a number issued by the Social Security "
    "Administration unless “Not Valid for Employment” is printed on the "
    "social security card and the number was issued solely to allow the "
    "recipient of the SSN to apply for or receive a federally funded benefit. "
    "If “Not Valid for Employment” is printed on the social security card "
    "and the cardholder’s immigration status has changed so that they are now "
    "a U.S. citizen or permanent resident, ask the SSA for a new social "
    "security card without the legend. However, if “Valid for Work Only "
    "With DHS Authorization” is printed on your social security card, your "
    "SSN is valid for EIC purposes only as long as the DHS authorization is "
    "still valid.",
    44,
)

# ── page 45 ──────────────────────────────────────────────────────────────────
para(
    "To find out how to get an SSN, see «Social Security Number (SSN)» near the "
    "beginning of these instructions. If you won’t have an SSN by the date "
    "your return is due, see «What if You Can’t File on Time?»",
    45,
)
para(
    "If you didn’t have an SSN issued on or before the due date of your 2025 "
    "return (including extensions), you can’t claim the EIC on your original "
    "or an amended 2025 return. If a child didn’t have an SSN issued on or "
    "before the due date of your return (including extensions), you can’t "
    "count that child as a qualifying child in figuring the amount of the EIC "
    "on your original or an amended 2025 return.",
    45,
)

term("United States", 45)
para(
    "The United States means the 50 states and the District of Columbia. It "
    "doesn’t include Puerto Rico or U.S. territories. If you are a member of "
    "the military stationed outside the United States, see «Members of the "
    "military», earlier.",
    45,
)

term("Welfare benefits, effect of credit on", 45)
para(
    "Any refund you receive as a result of taking the EIC can’t be counted as "
    "income when determining if you or anyone else is eligible for benefits or "
    "assistance, or how much you or anyone else can receive, under any federal "
    "program or under any state or local program financed in whole or in part "
    "with federal funds. These programs include Temporary Assistance for Needy "
    "Families (TANF), Medicaid, Supplemental Security Income (SSI), and "
    "Supplemental Nutrition Assistance Program (formerly food stamps). In "
    "addition, when determining eligibility, the refund can’t be counted as a "
    "resource for at least 12 months after you receive it. Check with your "
    "local benefit coordinator to find out if your refund will affect your "
    "benefits.",
    45,
)

review_notes = [
    "TRANCHE 14 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "44-45 — the rest of the EIC’s Definitions and Special Rules. It "
    "carries no document title by design: only tranche 1 does, so this file "
    "validates through merge-plans rather than standalone. No partial rebuild "
    "is delivered.",
    "NO NEW SHAPES. Glossary entries are level-5 headings under the level-4 "
    "“Definitions and Special Rules”, exactly as in tranches 6 and 13. "
    "The worked example under “Qualifying child of more than one "
    "person” is a level-6 heading, matching the treatment of numbered and "
    "self-contained examples settled in tranches 7 and 9.",
    "BOUNDARIES. In: tranche 13 ended on a complete definition (“Foster "
    "child”), so nothing was carried over. Out: page 45 ends on a complete "
    "definition (“Welfare benefits, effect of credit on”), so nothing "
    "spans the 45/46 edge and there is no handoff note. Page 46 begins the EIC "
    "worksheets.",
    "THE “SOCIAL SECURITY NUMBER (SSN)” ENTRY SPANS THE PAGE BREAK. Its "
    "first paragraph begins on page 44 and finishes on page 45; it is authored "
    "whole at page 44, and the two paragraphs that follow it on page 45 are "
    "attributed to page 45 where they begin.",
    "THIS SECTION DUPLICATES EARLIER DEFINITIONS DELIBERATELY. "
    "“Full-time student”, “Permanently and totally disabled” and "
    "“Qualifying child of more than one person” all appear in the "
    "tranche-6 glossary too, with different wording — the EIC versions cite "
    "Pub. 596 and EIC-specific line numbers, and the “Qualifying child of "
    "more than one person” list differs in its first item. Both are kept in "
    "full, as tranche 6 decided: a reader working through the EIC must not have "
    "to consult a different section for a rule stated differently there.",
    "THE EXAMPLE USES A NAMED CHILD. The source writes this example with the "
    "name “Lee” where the corresponding example in the tranche-6 glossary "
    "used “your child”. The wording is kept exactly as printed in each "
    "place rather than harmonised, since both are the IRS’s own text.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked. Pages 44 and 45 "
    "carry no link annotations.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (full-time, on-farm, "
    "on-the-job, dual-status, 1040-SR, stepparent). PAGE FURNITURE OMITTED: "
    "printed page numbers, the standing “Need more information or "
    "forms?” footer, and the invisible “Fileid: … MUST be removed "
    "before printing” production lines.",
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

pages = sorted({block["source_page"] for block in blocks})
print(f"wrote {OUT}: {len(blocks)} blocks, pages {pages}, {len(review_notes)} review notes")
