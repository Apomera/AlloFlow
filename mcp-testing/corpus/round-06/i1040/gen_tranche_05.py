#!/usr/bin/env python3
"""Author tranche 5 of the i1040 rebuild: printed pages 17-19, "Who Qualifies
as Your Dependent" — the five-step qualifying-child / qualifying-relative
DECISION FLOWCHART.

This is the first flowchart in the document, and the linearisation is the
decision worth reviewing:

  * Each step is a level-4 heading carrying its printed step badge
    ("Step 1. Do You Have a Qualifying Child?"), so a reader always knows
    which step they are in.
  * Each numbered question is a paragraph keeping its printed number, followed
    by a two-item list holding the Yes and No branches with strong labels.
    That preserves the pairing a sighted reader gets from the two-column
    layout, without inventing a table the source does not have.
  * The AND/OR criteria stacks that open Steps 1 and 4 are drawn as boxes
    joined by AND/or connector arrows. The connectives are real text in the
    source, so each criterion becomes a list item that keeps its leading
    "AND"/"or" — the logic stays readable in linear order.
  * Decorative-only marks are dropped: the checkbox glyph before every
    Yes/No, and the flow arrows between boxes. The STOP badge is KEPT as
    text, because it is the branch's whole meaning.

Scope: the session log pencilled tranche 5 as pages 17-22. Pages 20-22 are
"Definitions and Special Rules", a two-column glossary that is a different job
(and, like pages 9/12, extracts interleaved). This tranche stops after the
flowchart. Step 5's question 3 begins on page 19 and its answers print at the
top of page 20; it is authored whole here and attributed to page 19, so
tranche 6 must start at "Definitions and Special Rules" and NOT re-author it.

Usage: python gen_tranche_05.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-05-pages-17-19.json")

MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

blocks = []


def rich(text):
    """Expand inline markers to (plain_text, runs). runs is None if unmarked."""
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


def question(number, text, yes, no, page):
    """A flowchart question: numbered paragraph + its two labelled branches."""
    para(f"{number}. {text}", page)
    bullets([f"‹Yes.› {yes}", f"‹No.› {no}"], page)


DEPENDENTS_SECTION = "«Dependents»"
CLAIM_CHILD_THEN_STEP3 = (
    "You can claim this child as a dependent. Complete rows (1) through (4), "
    f"(5)(a), and (6) of the {DEPENDENTS_SECTION} section on page 1 of "
    "Form 1040 or 1040-SR for this child. Then, go to Step 3."
)
CLAIM_RELATIVE_THEN_STEP5 = (
    "You can claim this person as a dependent. Complete rows (1) through (4), "
    f"(5)(a), and (6) of the {DEPENDENTS_SECTION} section on page 1 of "
    "Form 1040 or 1040-SR. Then, go to Step 5."
)
NO_DEPENDENTS_STOP = (
    "STOP. You can’t claim any dependents. Complete the rest of Form 1040 "
    "or 1040-SR and any applicable schedules."
)
NO_CTC_ODC_FOR_CHILD = (
    "STOP. You can’t claim the child tax credit or the credit for other "
    "dependents for this child."
)
CITIZEN_TEST_NOTE = (
    "(See Pub. 519 for the definition of a U.S. national or U.S. resident "
    "alien. If the child was adopted, see «Exception to citizen test», later.)"
)
COULD_YOU_BE_CLAIMED = (
    "Could you be claimed as a dependent on someone else’s 2025 tax return? "
    "(If the person who could claim you on their 2025 tax return is not "
    "required to file, and isn’t filing a 2025 tax return or is filing a "
    "2025 return only to claim a refund of withheld income tax or estimated "
    "tax paid, check “No.”)"
)

# ── page 17 ──────────────────────────────────────────────────────────────────
heading("Who Qualifies as Your Dependent", 17, 3)
heading(
    "Dependents, Qualifying Child for Child Tax Credit, and Credit for Other "
    "Dependents",
    17,
    4,
)
para(
    "Follow the steps in the following flowchart to find out if a person "
    "qualifies as your dependent and to find out if your dependent qualifies "
    "you to take the child tax credit or the credit for other dependents. If "
    "you have more than four dependents, check the box under "
    f"{DEPENDENTS_SECTION} on page 1 of Form 1040 or 1040-SR and include a "
    f"statement showing the information requested in the {DEPENDENTS_SECTION} "
    "section.",
    17,
)
callout(
    "Tip.",
    "The dependents you claim are those you list by name and SSN in the "
    "Dependents section on Form 1040 or 1040-SR.",
    17,
)
heading("Before you begin", 17, 5)
para(
    "See the definition of «Social security number», later. If you want to "
    "claim the child tax credit, you must have a valid SSN, which means it must "
    "be valid for employment and issued before the due date of your return "
    "(including extensions). If you are filing a joint return, only one spouse "
    "is required to have a valid SSN to be eligible for the CTC and ACTC. The "
    "other spouse must have either an SSN or ITIN, and it must have been issued "
    "on or before the due date of the return (including extensions). If you "
    "want to claim the credit for other dependents, you, and your spouse if "
    "filing jointly, must have either an SSN or ITIN issued on or before the "
    "due date of your 2025 return (including extensions).",
    17,
)

heading("Step 1. Do You Have a Qualifying Child?", 17, 4)
para("A qualifying child is your…", 17)
bullets(
    [
        "Son, daughter, stepchild, foster child, brother, sister, stepbrother, "
        "stepsister, half brother, half sister, or a descendant of any of them "
        "(for example, your grandchild, niece, or nephew)",
        "AND was under age 19 at the end of 2025 and younger than you (or your "
        "spouse if filing jointly); or under age 24 at the end of 2025, a "
        "full-time student (defined later), and younger than you (or your "
        "spouse if filing jointly) — if the child is a full-time student, check "
        "the “Full-time student” box on row (6) of the "
        f"{DEPENDENTS_SECTION} section on page 1 of Form 1040 or 1040-SR; or "
        "any age and permanently and totally disabled (defined later) — if the "
        "child is permanently and totally disabled, check the "
        "“Permanently and totally disabled” box on row (6) of the "
        f"{DEPENDENTS_SECTION} section on page 1 of Form 1040 or 1040-SR.",
        "AND who didn’t provide over half of their own support for 2025 "
        "(see Pub. 501)",
        "AND who isn’t filing a joint return for 2025 or is filing a joint "
        "return for 2025 only to claim a refund of withheld income tax or "
        "estimated tax paid (see Pub. 501 for details and examples)",
        "AND who lived with you for more than half of 2025. If the child "
        "didn’t live with you for the required time, see «Exception to time "
        "lived with you», later. If the child lived with you for more than half "
        "of 2025, check the “Yes” box (box (a)) on row (5) of the "
        f"{DEPENDENTS_SECTION} section on page 1 of Form 1040 or 1040-SR.",
    ],
    17,
)
callout(
    "Caution.",
    "If the child meets the conditions to be a qualifying child of any other "
    "person (other than your spouse if filing jointly) for 2025, see "
    "«Qualifying child of more than one person», later.",
    17,
)
question(
    1,
    "Do you have a child who meets the conditions to be your qualifying child?",
    "Go to Step 2.",
    "Go to Step 4.",
    17,
)

# ── page 18 ──────────────────────────────────────────────────────────────────
heading("Step 2. Is Your Qualifying Child Your Dependent?", 18, 4)
question(
    1,
    "Was the child a U.S. citizen, U.S. national, U.S. resident alien, or a "
    f"resident of Canada or Mexico? {CITIZEN_TEST_NOTE}",
    "Continue.",
    "STOP. You can’t claim this child as a dependent.",
    18,
)
question(2, "Was the child married?", "See «Married person», later.", "Continue.", 18)
question(3, "Are you filing a joint return for 2025?", CLAIM_CHILD_THEN_STEP3, "Continue.", 18)
question(4, COULD_YOU_BE_CLAIMED, NO_DEPENDENTS_STOP, CLAIM_CHILD_THEN_STEP3, 18)

heading(
    "Step 3. Does Your Qualifying Child Qualify You for the Child Tax Credit "
    "or Credit for Other Dependents?",
    18,
    4,
)
question(
    1,
    "Did the child have an SSN, ITIN, or adoption taxpayer identification "
    "number (ATIN) issued on or before the due date of your return (including "
    "extensions)? (Answer “Yes” if you are applying for an ITIN or ATIN "
    "for the child on or before the due date of your return (including "
    "extensions).)",
    "Continue.",
    NO_CTC_ODC_FOR_CHILD,
    18,
)
question(
    2,
    "Was the child a U.S. citizen, U.S. national, or U.S. resident alien? "
    f"{CITIZEN_TEST_NOTE}",
    "Continue.",
    NO_CTC_ODC_FOR_CHILD,
    18,
)
question(
    3,
    "Was the child under age 17 at the end of 2025?",
    "Continue.",
    "You can claim the credit for other dependents for this child. Check the "
    "“Credit for other dependents” box on row (7) of the "
    f"{DEPENDENTS_SECTION} section on page 1 of Form 1040 or 1040-SR for this "
    "person.",
    18,
)
question(
    4,
    "Did you, or your spouse if filing a joint return, and this child have SSNs "
    "valid for employment and issued before the due date of your 2025 return "
    "(including extensions)? (See «Social Security Number», later.)",
    "You can claim the child tax credit for this person. Check the "
    "“Child tax credit” box on row (7) of the "
    f"{DEPENDENTS_SECTION} section on page 1 of Form 1040 or 1040-SR for this "
    "person.",
    "Go to Step 5.",
    18,
)

# ── page 19 ──────────────────────────────────────────────────────────────────
heading("Step 4. Is Your Qualifying Relative Your Dependent?", 19, 4)
para("A qualifying relative is your…", 19)
bullets(
    [
        "Son, daughter, stepchild, foster child, or a descendant of any of them "
        "(for example, your grandchild)",
        "or brother, sister, half brother, half sister, or a son or daughter of "
        "any of them (for example, your niece or nephew)",
        "or father, mother, or an ancestor or sibling of either of them (for "
        "example, your grandmother, grandfather, aunt, or uncle)",
        "or stepbrother, stepsister, stepfather, stepmother, son-in-law, "
        "daughter-in-law, father-in-law, mother-in-law, brother-in-law, or "
        "sister-in-law",
        "or any other person (other than your spouse) who lived with you all "
        "year as a member of your household if your relationship didn’t "
        "violate local law. If the person didn’t live with you for the "
        "required time, see «Exception to time lived with you», later.",
        "AND who wasn’t a qualifying child (see Step 1) of any taxpayer for "
        "2025. For this purpose, a person isn’t a taxpayer if the person "
        "isn’t required to file a U.S. income tax return and either "
        "doesn’t file such a return or files only to get a refund of "
        "withheld income tax or estimated tax paid. See Pub. 501 for details "
        "and examples.",
        "AND who had gross income of less than $5,200 in 2025. If the person "
        "was permanently and totally disabled, see «Exception to gross income "
        "test», later.",
        "AND for whom you provided over half of the person’s support in "
        "2025. But see «Children of divorced or separated parents», «Multiple "
        "support agreements», and «Kidnapped child», later.",
    ],
    19,
)
# The source prints this No branch as the STOP badge alone, with no sentence
# after it. Nothing is invented here to fill the gap.
question(
    1,
    "Does any person meet the conditions to be your qualifying relative?",
    "Continue.",
    "STOP.",
    19,
)
question(
    2,
    "Was your qualifying relative a U.S. citizen, U.S. national, U.S. resident "
    "alien, or a resident of Canada or Mexico? (See Pub. 519 for the definition "
    "of a U.S. national or U.S. resident alien. If your qualifying relative was "
    "adopted, see «Exception to citizen test», later.)",
    "Continue.",
    "STOP. You can’t claim this person as a dependent.",
    19,
)
question(
    3,
    "Was your qualifying relative married?",
    "See «Married person», later.",
    "Continue.",
    19,
)
question(
    4,
    "Are you filing a joint return for 2025?",
    CLAIM_RELATIVE_THEN_STEP5,
    "Continue.",
    19,
)
question(5, COULD_YOU_BE_CLAIMED, NO_DEPENDENTS_STOP, CLAIM_RELATIVE_THEN_STEP5, 19)

heading(
    "Step 5. Does Your Qualifying Relative Qualify You for the Credit for "
    "Other Dependents?",
    19,
    4,
)
question(
    1,
    "Did you, and your spouse if filing a joint return, have either an SSN or "
    "ITIN issued on or before the due date of your 2025 return (including "
    "extensions)? (Answer “Yes” if you are applying for an ITIN on or "
    "before the return due date (including extensions).)",
    "Continue.",
    "STOP. You can’t claim the credit for other dependents.",
    19,
)
question(
    2,
    "Did your qualifying relative have an SSN, ITIN, or ATIN issued on or "
    "before the due date of your 2025 return (including extensions)? (Answer "
    "“Yes” if you are applying for an ITIN or ATIN for the qualifying "
    "relative on or before the return due date (including extensions).)",
    "Continue.",
    "STOP. You can’t claim the credit for other dependents for this "
    "qualifying relative.",
    19,
)
# Question 3 starts on page 19; its Yes/No branches print at the top of
# page 20. Authored whole here — tranche 6 must not repeat it.
question(
    3,
    "Was your qualifying relative a U.S. citizen, U.S. national, or U.S. "
    "resident alien? (See Pub. 519 for the definition of a U.S. national or a "
    "U.S. resident alien. If your qualifying relative was adopted, see "
    "«Exception to citizen test», later.)",
    "You can claim the credit for other dependents for this dependent. Check "
    "the “Credit for other dependents” box on row (7) of the "
    f"{DEPENDENTS_SECTION} section on page 1 of Form 1040 or 1040-SR for this "
    "person.",
    "STOP. You can’t claim the credit for other dependents for this "
    "qualifying relative.",
    19,
)

review_notes = [
    "TRANCHE 5 OF A MULTI-SESSION REBUILD. This plan covers printed pages 17-19 "
    "— “Who Qualifies as Your Dependent”, the five-step decision "
    "flowchart. It carries no document title by design: only tranche 1 does, so "
    "this file validates through merge-plans rather than standalone. No partial "
    "rebuild is delivered.",
    "FLOWCHART LINEARISED AS STEPS, QUESTIONS, AND LABELLED BRANCHES. This is "
    "the document’s first flowchart, and the shape chosen here should be "
    "reused for the later ones. Each step is a level-4 heading carrying its "
    "printed step badge (“Step 1. Do You Have a Qualifying "
    "Child?”), so a reader always knows where they are. Each numbered "
    "question keeps its printed number and is followed by a two-item list "
    "holding the Yes and No branches with strong labels. That preserves the "
    "pairing a sighted reader gets from the two-column layout without "
    "inventing a table the source does not have, and it keeps the branch text "
    "verbatim.",
    "AND/OR CRITERIA STACKS KEPT AS TEXT. Steps 1 and 4 open with a stack of "
    "criteria boxes joined by AND and or connector arrows. The connectives are "
    "real text in the source, so each criterion is a list item that keeps its "
    "leading “AND”/“or” and the logic survives in linear "
    "order. In Step 1 the three age alternatives are joined into one item with "
    "semicolons, and each alternative keeps its own “check the box” "
    "sentence beside it rather than being moved to the end.",
    "STOP KEPT, CHECKBOXES AND ARROWS DROPPED. “STOP” is real text in "
    "the source — it is set inside a small octagon drawn as a reusable Form "
    "XObject that the page stamps wherever a branch ends — so authoring it as "
    "the word “STOP.” at the head of its branch reproduces the "
    "document rather than adding to it, and it is that branch’s entire "
    "meaning. The empty checkbox glyph printed before every Yes and No, and "
    "the connector arrows drawn between criteria boxes, are decoration for a "
    "reader working down the page and are dropped. (The same stamping applies "
    "to the “AND” connectors, whose text IS kept, as part of the "
    "criteria items.)",
    "ONE BRANCH IS DELIBERATELY BARE. In Step 4, question 1, the source prints "
    "the No branch as the STOP badge ALONE, with no sentence explaining what to "
    "do — unlike every other STOP in the chart. It is authored as "
    "“STOP.” with nothing added. Filling that gap would mean writing "
    "tax guidance the IRS did not publish, which this rebuild does not do.",
    "SCOPE STOPS AT THE FLOWCHART. The session log pencilled tranche 5 as pages "
    "17-22. Pages 20-22 are “Definitions and Special Rules”, a "
    "two-column glossary that is a separate job. Step 5’s question 3 begins "
    "on page 19 and its Yes/No branches print at the top of page 20; it is "
    "authored whole here and attributed to page 19, so the next tranche starts "
    "at “Definitions and Special Rules” and must NOT re-author that "
    "question.",
    "STEP HEADINGS AT LEVEL 4. “Who Qualifies as Your Dependent” is "
    "set at 18pt, between the 23pt section title and the 16pt parts around it. "
    "It is authored at level 3, as a sibling of the “Dependents” "
    "section that refers to it, with its subtitle and the five steps at "
    "level 4 and “Before you begin” at level 5 — consistent with the "
    "level scheme established in tranche 4.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked. As in tranche 4, "
    "references such as “Exception to citizen test” and “Married person” are "
    "marked emphasis; they are not turned into links because the source has no "
    "link annotations for them and their destinations are in later tranches.",
    "REPEATED BRANCH TEXT KEPT VERBATIM. Several outcomes repeat word for word "
    "across steps (the two “Complete rows (1) through (4), (5)(a), and "
    "(6)” instructions, and the “You can’t claim any "
    "dependents” STOP). Each is kept in full where it appears, because a "
    "reader arrives at exactly one of them and must not have to look elsewhere.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (full-time, son-in-law, "
    "half brother, 1040-SR, on-farm). PAGE FURNITURE OMITTED: the printed page "
    "numbers, the standing “Need more information or forms?” footer, "
    "and the invisible “Fileid: … MUST be removed before "
    "printing” production lines.",
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
