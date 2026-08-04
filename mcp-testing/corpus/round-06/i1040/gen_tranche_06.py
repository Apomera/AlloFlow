#!/usr/bin/env python3
"""Author tranche 6 of the i1040 rebuild: printed pages 20-22, "Definitions and
Special Rules" — the glossary that closes "Who Qualifies as Your Dependent".

Boundary: tranche 5 already carries Step 5's question 3, whose Yes/No branches
print at the top of page 20. This tranche therefore starts at the "Definitions
and Special Rules" heading and does NOT re-author that question.

Method note: these three pages are two-column prose that used to extract
INTERLEAVED — the round-8 column fix (a two-column gutter is 10pt, narrower
than the old 16.5pt minimum) is what made them readable from the text layer at
all. Earlier sessions would have had to rebuild them from page images.

Structure: the section is a glossary. Every entry is a bold run-in term, so
each becomes a level-5 heading (the level tranche 4 established for run-in
topics), sitting under the level-4 "Definitions and Special Rules" that is a
sibling of the five Steps in tranche 5.

Usage: python gen_tranche_06.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-06-pages-20-22.json")

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
    """A glossary entry: the printed bold run-in term, minus its full stop."""
    heading(name, page, 5)


# ── page 20 ──────────────────────────────────────────────────────────────────
heading("Definitions and Special Rules", 20, 4)

term("Adopted child", 20)
para(
    "An adopted child is always treated as your own child. An adopted child "
    "includes a child lawfully placed with you for legal adoption.",
    20,
)

term("Adoption taxpayer identification numbers (ATINs)", 20)
para(
    "If you have a dependent who was placed with you for legal adoption and you "
    "don’t know the dependent’s SSN, you must get an ATIN for the "
    "dependent from the IRS. See Form W-7A for details. If the dependent "
    "isn’t a U.S. citizen or resident alien, apply for an ITIN instead using "
    "Form W-7.",
    20,
)

term("Children of divorced or separated parents", 20)
para(
    "A child will be treated as the qualifying child or qualifying relative of "
    "the child’s noncustodial parent (defined later) if all of the following "
    "conditions apply.",
    20,
)
bullets(
    [
        "The parents are divorced, legally separated, separated under a written "
        "separation agreement, or lived apart at all times during the last "
        "6 months of 2025 (whether or not they are or were married).",
        "The child received over half of the child’s support for 2025 from "
        "the parents (and the rules on «Multiple support agreements», later, "
        "don’t apply). Support of a child received from a parent’s spouse "
        "is treated as provided by the parent.",
        "The child is in custody of one or both of the parents for more than "
        "half of 2025.",
        "Either of the following applies. a. The custodial parent signs "
        "Form 8332 or a substantially similar statement that they won’t "
        "claim the child as a dependent for 2025, and the noncustodial parent "
        "includes a copy of the form or statement with their return. If the "
        "divorce decree or separation agreement went into effect after 1984 and "
        "before 2009, the noncustodial parent may be able to include certain "
        "pages from the decree or agreement instead of Form 8332. See "
        "«Post-1984 and pre-2009 decree or agreement» and «Post-2008 decree or "
        "agreement». b. A pre-1985 decree of divorce or separate maintenance or "
        "written separation agreement between the parents provides that the "
        "noncustodial parent can claim the child as a dependent, and the "
        "noncustodial parent provides at least $600 for support of the child "
        "during 2025.",
    ],
    20,
    ordered=True,
)
para(
    "If conditions (1) through (4) apply, only the noncustodial parent can "
    "claim the child for purposes of the child tax credit and credit for other "
    "dependents (lines 19 and 28). However, this doesn’t allow the "
    "noncustodial parent to claim head of household filing status, the credit "
    "for child and dependent care expenses, the exclusion for dependent care "
    "benefits, or the earned income credit. The custodial parent or another "
    "taxpayer, if eligible, can claim the child for the earned income credit "
    "and these other benefits. See Pub. 501 for details.",
    20,
)

term("Custodial and noncustodial parents", 20)
para(
    "The custodial parent is the parent with whom the child lived for the "
    "greater number of nights in 2025. The noncustodial parent is the other "
    "parent. If the child was with each parent for an equal number of nights, "
    "the custodial parent is the parent with the higher adjusted gross income. "
    "See Pub. 501 for an exception for a parent who works at night, rules for a "
    "child who is emancipated under state law, and other details.",
    20,
)

term("Post-1984 and pre-2009 decree or agreement", 20)
para("The decree or agreement must state all three of the following.", 20)
bullets(
    [
        "The noncustodial parent can claim the child as a dependent without "
        "regard to any condition, such as payment of support.",
        "The other parent won’t claim the child as a dependent.",
        "The years for which the claim is released.",
    ],
    20,
    ordered=True,
)
para(
    "The noncustodial parent must include all of the following pages from the "
    "decree or agreement.",
    20,
)
bullets(
    [
        "Cover page (include the other parent’s SSN on that page).",
        "The pages that include all the information identified in (1) through "
        "(3) above.",
        "Signature page with the other parent’s signature and date of agreement.",
    ],
    20,
)
callout(
    "Caution.",
    "You must include the required information even if you filed it with your "
    "return in an earlier year.",
    20,
)

term("Post-2008 decree or agreement", 20)
para(
    "If the divorce decree or separation agreement went into effect after 2008, "
    "the noncustodial parent can’t include pages from the decree or "
    "agreement instead of Form 8332. The custodial parent must sign either "
    "Form 8332 or a substantially similar statement the only purpose of which "
    "is to release the custodial parent’s claim to certain tax benefits for "
    "a child, and the noncustodial parent must include a copy with their "
    "return. The form or statement must release the custodial parent’s claim "
    "to the child without any conditions. For example, the release must not "
    "depend on the noncustodial parent paying support.",
    20,
)

term("Release of certain tax benefits revoked", 20)
para(
    "A custodial parent who has revoked their previous release of a claim to "
    "certain tax benefits for a child must include a copy of the revocation "
    "with their return. For details, see Form 8332.",
    20,
)

term("Exception to citizen test", 20)
para(
    "If you are a U.S. citizen or U.S. national and your adopted child lived "
    "with you all year as a member of your household, that child meets the "
    "requirement to be a U.S. citizen in Step 2, question 1; Step 3, "
    "question 2; Step 4, question 2; and Step 5, question 3.",
    20,
)

term("Exception to gross income test", 20)
para(
    "If your relative (including a person who lived with you all year as a "
    "member of your household) is permanently and totally disabled (defined "
    "later), certain income for services performed at a sheltered workshop may "
    "be excluded for this test. For details, see Pub. 501.",
    20,
)

# ── page 21 ──────────────────────────────────────────────────────────────────
term("Exception to time lived with you", 21)
para(
    "Temporary absences by you or the other person for special circumstances, "
    "such as school, vacation, business, medical care, military service, or "
    "detention in a juvenile facility, count as time the person lived with you. "
    "Also see «Children of divorced or separated parents», earlier, or "
    "«Kidnapped child», later.",
    21,
)
para(
    "If the person meets all other requirements to be your qualifying child but "
    "was born or died in 2025, the person is considered to have lived with you "
    "for more than half of 2025 if your home was this person’s home for more "
    "than half the time the person was alive in 2025. If the person meets all "
    "other requirements to be your qualifying child but you adopted the person "
    "in 2025, the person was lawfully placed with you for legal adoption by you "
    "in 2025, or if the person was an eligible foster child placed with you "
    "during 2025, the person is considered to have lived with you for more than "
    "half of 2025 if your main home was this person’s main home for more than "
    "half the time since the person was adopted or placed with you in 2025.",
    21,
)
para(
    "Any other person is considered to have lived with you for all of 2025 if "
    "the person was born or died in 2025 and your home was this person’s "
    "home for the entire time the person was alive in 2025, or if you adopted "
    "the person in 2025, the person was lawfully placed with you for legal "
    "adoption by you in 2025, or the person was an eligible foster child placed "
    "with you during 2025 and your main home was the person’s main home for "
    "the entire time since the person was adopted or placed with you in 2025.",
    21,
)

term("Foster child", 21)
para(
    "A foster child is any child placed with you by an authorized placement "
    "agency or by judgment, decree, or other order of any court of competent "
    "jurisdiction.",
    21,
)

term("Full-time student", 21)
para(
    "A full-time student is a child who during any part of 5 calendar months of "
    "2025 was enrolled as a full-time student at a school or took a full-time, "
    "on-farm training course given by a school or a state, county, or local "
    "government agency. A school includes a technical, trade, or mechanical "
    "school. It doesn’t include an on-the-job training course, "
    "correspondence school, or school offering courses only through the "
    "Internet.",
    21,
)

term("Kidnapped child", 21)
para(
    "If your child is presumed by law enforcement authorities to have been "
    "kidnapped by someone who isn’t a family member, you may be able to take "
    "the child into account in determining your eligibility for head of "
    "household or qualifying surviving spouse filing status, the child tax "
    "credit, the credit for other dependents, and the earned income credit "
    "(EIC). For details, see Pub. 501 (Pub. 596 for the EIC).",
    21,
)

term("Married person", 21)
para(
    "If the person is married and files a joint return, you can’t claim that "
    "person as your dependent. However, if the person is married but "
    "doesn’t file a joint return or files a joint return only to claim a "
    "refund of withheld income tax or estimated tax paid, you may be able to "
    "claim that person as a dependent. (See Pub. 501 for details and examples.) "
    "In that case, go to Step 2, question 3 (for a qualifying child), or "
    "Step 4, question 4 (for a qualifying relative).",
    21,
)

term("Multiple support agreements", 21)
para(
    "If no one person contributed over half of the support of your relative (or "
    "a person who lived with you all year as a member of your household) but "
    "you and another person(s) provided more than half of your relative’s "
    "support, special rules may apply that would treat you as having provided "
    "over half of the support. For details, see Pub. 501.",
    21,
)

term("Permanently and totally disabled", 21)
para(
    "A person is permanently and totally disabled if, at any time in 2025, the "
    "person can’t engage in any substantial gainful activity because of a "
    "physical or mental condition and a doctor has determined that this "
    "condition has lasted or can be expected to last continuously for at least "
    "a year or can be expected to lead to death.",
    21,
)

term("Public assistance payments", 21)
para(
    "If you received payments under the Temporary Assistance for Needy Families "
    "(TANF) program or other public assistance program and you used the money "
    "to support another person, see Pub. 501.",
    21,
)

term("Qualifying child of more than one person", 21)
para(
    "Even if a child meets the conditions to be the qualifying child of more "
    "than one person, only one person can claim the child as a qualifying child "
    "for all of the following tax benefits, unless the special rule for "
    "«Children of divorced or separated parents», described earlier, applies.",
    21,
)
bullets(
    [
        "Child tax credit and credit for other dependents (line 19) and "
        "additional child tax credit (line 28).",
        "Head of household filing status.",
        "Credit for child and dependent care expenses (Schedule 3, line 2).",
        "Exclusion for dependent care benefits (Form 2441, Part III).",
        "Earned income credit (line 27a).",
    ],
    21,
    ordered=True,
)
para(
    "No other person can take any of the five tax benefits just listed based on "
    "the qualifying child. If you and any other person can claim the child as a "
    "qualifying child, the following rules apply. For purposes of these rules, "
    "the term “parent” means a biological or adoptive parent of an "
    "individual. It doesn’t include a stepparent or foster parent unless "
    "that person has adopted the individual.",
    21,
)
# The final bullet runs across the 21-22 page break into the Example paragraph.
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
    21,
)

# ── page 22 ──────────────────────────────────────────────────────────────────
example_body = (
    " Your child meets the conditions to be a qualifying child for both you and "
    "your parent. Your child doesn’t meet the conditions to be a qualifying "
    "child of any other person, including your child’s other parent. Under "
    "the rules just described, you can claim your child as a qualifying child "
    "for all of the five tax benefits just listed for which you otherwise "
    "qualify. Your parent can’t claim any of those five tax benefits based "
    "on your child. However, if your parent’s AGI is higher than yours and "
    "you do not claim your child as a qualifying child, your child is the "
    "qualifying child of your parent. For more details and examples, see "
    "Pub. 501."
)
para("‹Example.›" + example_body, 22)
para(
    "If you will be claiming the child as a qualifying child, go to Step 2. "
    "Otherwise, stop; you can’t claim any benefits based on this child.",
    22,
)

term("Social security number", 22)
para(
    "You must enter each dependent’s social security number (SSN). Be sure "
    "the name and SSN entered agree with the dependent’s social security "
    "card. Otherwise, at the time we process your return, we may reduce or "
    "disallow any tax benefits (such as the child tax credit) based on that "
    "dependent. If the name or SSN on the dependent’s social security card "
    "isn’t correct or you need to get an SSN for your dependent, contact the "
    "Social Security Administration (SSA). See «Social Security Number (SSN)», "
    "earlier. If your dependent won’t have a number by the date your return "
    "is due, see «What if You Can’t File on Time?» earlier.",
    22,
)
para(
    "For the child tax credit, your child must have a valid SSN. A valid SSN is "
    "one that is valid for employment and that is issued by the SSA before the "
    "due date of your 2025 return (including extensions). If your child was a "
    "U.S. citizen when the child received the SSN, the SSN is valid for "
    "employment. If “Not Valid for Employment” is printed on your "
    "child’s social security card and your child’s immigration status has "
    "changed so that your child is now a U.S. citizen or permanent resident, "
    "ask the SSA for a new social security card without the legend. However, if "
    "“Valid for Work Only With DHS Authorization” is printed on your "
    "child’s social security card, your child has the required SSN only as "
    "long as the DHS authorization is valid.",
    22,
)
para(
    "If your dependent child was born and died in 2025 and you do not have an "
    "SSN for the child, enter “Died” on row (3) of the Dependents "
    "section and include a copy of the child’s birth certificate, death "
    "certificate, or hospital records. The document must show the child was "
    "born alive.",
    22,
)
para(
    "If you didn’t have an SSN that is valid for employment and issued "
    "before the due date of your 2025 return (including extensions), you "
    "can’t claim the child tax credit on your original or amended 2025 "
    "return. To claim the credit on a joint return, you or your spouse must "
    "have an SSN that is valid for employment and issued before the due date of "
    "your 2025 return (including extensions). The other spouse must have either "
    "an SSN or ITIN, and it must have been issued on or before the due date of "
    "the return (including extensions). If you, or your spouse if filing "
    "jointly, didn’t have either an SSN or ITIN issued on or before the due "
    "date of your 2025 return (including extensions), you can’t claim the "
    "credit for other dependents on your original or amended return. If you "
    "apply for an ITIN on or before the due date of your 2025 return (including "
    "extensions) and the IRS issues you an ITIN as a result of the application, "
    "the IRS will consider your ITIN as issued on or before the due date of "
    "your return.",
    22,
)

review_notes = [
    "TRANCHE 6 OF A MULTI-SESSION REBUILD. This plan covers printed pages 20-22 "
    "— “Definitions and Special Rules”, the glossary that closes "
    "“Who Qualifies as Your Dependent”. It carries no document title by "
    "design: only tranche 1 does, so this file validates through merge-plans "
    "rather than standalone. No partial rebuild is delivered.",
    "BOUNDARY WITH TRANCHE 5. Step 5’s question 3 begins on page 19 and its "
    "Yes/No branches print at the top of page 20. Tranche 5 authored that "
    "question whole; this tranche therefore starts at the “Definitions and "
    "Special Rules” heading and deliberately does not repeat it.",
    "AUTHORED FROM THE TEXT LAYER, WHICH IS NEW. These three pages are "
    "two-column prose whose columns used to extract interleaved, so an earlier "
    "session would have had to rebuild them from page images. The round-8 "
    "column fix — a real two-column gutter is 10pt, narrower than the old "
    "16.5pt minimum the detector could see — is what made the text layer "
    "usable here.",
    "GLOSSARY ENTRIES AS HEADINGS. Every entry is a bold run-in term followed "
    "by its definition. Each is authored as a level-5 heading with the trailing "
    "period dropped, under the level-4 “Definitions and Special "
    "Rules” that is a sibling of the five Steps in tranche 5. That makes "
    "the glossary navigable term by term, which is how it is actually used: "
    "the Steps send readers here by name.",
    "“EXAMPLE.” LEFT AS A RUN-IN. The worked example under "
    "“Qualifying child of more than one person” also prints as a bold "
    "run-in, but it is an illustration inside one entry rather than a defined "
    "term. It is marked strong at the head of its paragraph instead of being "
    "promoted to a heading, so the glossary’s heading level lists terms only.",
    "NESTED SUB-ITEMS FOLDED, AS IN EARLIER TRANCHES. In “Children of "
    "divorced or separated parents”, condition 4 has printed sub-items "
    "“a.” and “b.”; they are kept verbatim inside item 4, so "
    "the enumeration is unchanged and the flat list schema is respected.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked. This section is "
    "dense with them (“see Multiple support agreements, later”, "
    "“See Social Security Number (SSN), earlier”). They are marked "
    "emphasis; pages 20-22 carry no link annotations at all, and several "
    "destinations live in tranches not yet authored, so inventing anchors now "
    "could point at nothing.",
    "REPEATED DEFINITIONS ARE INTENTIONAL. “Adopted child”, "
    "“Foster child”, “Exception to time lived with you” and "
    "“Keeping up a home” also appear in tranche 4 under the filing "
    "statuses. Both copies are kept: the filing-status text and this glossary "
    "are separate reference points, and the wording differs between them.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (full-time, on-farm, "
    "pre-1985, Post-2008, on-the-job, Form W-7A, 1040-SR). PAGE FURNITURE "
    "OMITTED: printed page numbers, the standing “Need more information or "
    "forms?” footer, and the invisible “Fileid: … MUST be removed "
    "before printing” production lines.",
    "PAGE-BREAK SPANNING LIST. The five “which person can claim the "
    "child” bullets begin on page 21 and the worked example that follows "
    "them prints on page 22. The list is authored whole at page 21 and the "
    "example as its own paragraph at page 22, matching where each begins.",
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
