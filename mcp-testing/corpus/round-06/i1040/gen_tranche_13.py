#!/usr/bin/env python3
"""Author tranche 13 of the i1040 rebuild: printed pages 42-43 — the rest of
EIC Steps 4, 5 and 6, lines 27b and 27c, and the start of the EIC's own
"Definitions and Special Rules".

Boundary in: tranche 12 authored Step 4's question 2 whole (its branches print
at the top of page 42), so this tranche starts at Step 4 question 3.

Boundary out: page 44 continues the EIC definitions. Page 43 ends on a
complete definition ("Foster child"), so nothing spans the 43/44 edge.

New combination, not a new shape: Step 5 embeds a five-line WORKSHEET inside a
flowchart branch, with a Tip and a Caution attached to individual lines. The
worksheet uses the tranche-8 shape and the two callouts fold into the cells of
the lines they belong to, keeping the line numbering continuous.

Usage: python gen_tranche_13.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-13-pages-42-43.json")

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


def worksheet(caption, lines, page):
    blocks.append({
        "type": "table",
        "caption": caption,
        "columns": ["Line", "Instruction", "Amount"],
        "rows": [[n, text, ""] for n, text in lines],
        "row_headers": True,
        "source_page": page,
    })


def question(number, text, yes, no, page):
    para(f"{number}. {text}", page)
    bullets([f"‹Yes.› {yes}", f"‹No.› {no}"], page)


def term(name, page):
    heading(name, page, 5)


CANT_TAKE = "STOP. You can’t take the credit."
CANT_TAKE_27C = "STOP. You can’t take the credit. Check the box on line 27c."

# ── page 42: rest of Step 4 ──────────────────────────────────────────────────
question(
    3,
    "Was your main home, and your spouse’s if filing a joint return, in the "
    "United States for more than half of 2025? Your main home can be any "
    "location where you regularly live. If your main home (and spouse’s if "
    "filing a joint return) was in the United States for more than half of "
    "2025, check the box to the right of the address block on page 1 of "
    "Form 1040 or 1040–SR. See «Main home» and «United States», later. Members "
    "of the military stationed outside the United States, see «Members of the "
    "military», later, before you answer.",
    "Continue.",
    CANT_TAKE_27C,
    42,
)
question(
    4,
    "Are you filing a joint return for 2025?",
    "Skip questions 5 and 6; go to Step 5.",
    "Continue.",
    42,
)
question(
    5,
    "Could you be a qualifying child of another person for 2025? (Check "
    "“No” if the other person isn’t required to file, and isn’t "
    "filing, a 2025 tax return or is filing a 2025 return only to claim a "
    "refund of withheld income tax or estimated tax paid (see Pub. 596 for "
    "examples).)",
    CANT_TAKE_27C,
    "Continue.",
    42,
)
question(
    6,
    "Can you be claimed as a dependent on someone else’s 2025 tax return? "
    "(If the person who could claim you on their 2025 tax return is not "
    "required to file, and isn’t filing a 2025 tax return or is filing a "
    "2025 return only to claim a refund of withheld income tax or estimated "
    "tax paid, check “No.”)",
    CANT_TAKE,
    "Go to Step 5.",
    42,
)

heading("Step 5. Earned Income", 42, 5)
question(
    1,
    "Are you filing Schedule SE because you were a member of the clergy or you "
    "had church employee income of $108.28 or more?",
    "See «Clergy» or «Church employees», whichever applies.",
    "Complete the following worksheet.",
    42,
)
worksheet(
    "EIC Step 5 earned income worksheet: five numbered steps for figuring your "
    "earned income for the EIC. The Amount column is where you write your "
    "figures; it is blank in the printed form.",
    [
        ("1.", "Enter the amount from Form 1040 or 1040-SR, line 1z"),
        ("2.", "Enter the Medicaid waiver payment amounts excluded from income "
               "on Schedule 1, line 8s, unless you choose to include these "
               "amounts in earned income, in which case enter -0-. See the "
               "instructions for Schedule 1, line 8s. Tip. If you and your "
               "spouse both received Medicaid waiver payments during the year, "
               "you and your spouse can make different choices about including "
               "the full amount of your payments in earned income. Enter only "
               "the amount of Medicaid waiver payments that you or your spouse, "
               "if filing a joint return, do not want to include in earned "
               "income. To include all nontaxable Medicaid waiver payment "
               "amounts in earned income, enter -0-."),
        ("3.", "Subtract line 2 from line 1"),
        ("4.", "Enter all of your nontaxable combat pay if you elect to include "
               "it in earned income. Also enter the amount of your nontaxable "
               "combat pay on line 1i of Form 1040 or 1040-SR. See Combat pay, "
               "nontaxable, later. Caution. Electing to include nontaxable "
               "combat pay may increase or decrease your EIC. Figure the credit "
               "with and without your nontaxable combat pay before making the "
               "election."),
        ("5.", "Add lines 3 and 4. This is your earned income"),
    ],
    42,
)
question(
    2,
    "Were you self-employed at any time in 2025, or are you filing Schedule SE "
    "because you were a member of the clergy or you had church employee income, "
    "or are you filing Schedule C as a statutory employee?",
    "Skip question 3 and Step 6; go to Worksheet B.",
    "Continue.",
    42,
)
para("3. If you have:", 42)
bullets(
    [
        "3 or more qualifying children who have valid SSNs, is your earned "
        "income less than $61,555 ($68,675 if married filing jointly)?",
        "2 qualifying children who have valid SSNs, is your earned income less "
        "than $57,310 ($64,430 if married filing jointly)?",
        "1 qualifying child who has a valid SSN, is your earned income less "
        "than $50,434 ($57,554 if married filing jointly)?",
        "No qualifying children who have valid SSNs, is your earned income less "
        "than $19,104 ($26,214 if married filing jointly)?",
    ],
    42,
)
bullets(["‹Yes.› Go to Step 6.", f"‹No.› {CANT_TAKE}"], 42)

# ── page 43 ──────────────────────────────────────────────────────────────────
heading("Step 6. How To Figure the Credit", 43, 5)
question(
    1,
    "Do you want the IRS to figure the credit for you?",
    "See «Credit figured by the IRS», later.",
    "Go to Worksheet A.",
    43,
)

heading("Line 27b", 43, 4)
para(
    "Check the box on line 27b if you are (1) a minister, member of a religious "
    "order who has not taken a vow of poverty, or a Christian Science "
    "practitioner; and (2) filing Schedule SE and the amount on line 2 of that "
    "schedule includes an amount that was also reported on Form 1040 or "
    "1040-SR, line 1z. See the instructions under «Clergy», later, for how to "
    "determine the amount of your earned income.",
    43,
)
heading("Line 27c", 43, 4)
para(
    "Check the box on line 27c if you do not want to claim the earned income "
    "credit or if you have been instructed to check the box in the instructions "
    "for line 27a.",
    43,
)

heading("Definitions and Special Rules", 43, 4)
term("Adopted child", 43)
para(
    "An adopted child is always treated as your own child. An adopted child "
    "includes a child lawfully placed with you for legal adoption.",
    43,
)
term("Church employees", 43)
para(
    "Determine how much of the amount on Form 1040 or 1040-SR, line 1a, was "
    "also reported on Schedule SE, Part I, line 5a. Subtract that amount from "
    "the amount on Form 1040 or 1040-SR, line 1a, and enter the result on "
    "line 1 of the worksheet in Step 5 (instead of entering the actual amount "
    "from Form 1040 or 1040-SR, line 1a). Be sure to answer “Yes” to "
    "question 2 in Step 5.",
    43,
)
term("Clergy", 43)
para(
    "The following instructions apply to ministers, members of religious orders "
    "who have not taken a vow of poverty, and Christian Science practitioners. "
    "If you are filing Schedule SE and the amount on line 2 of that schedule "
    "includes an amount that was also reported on Form 1040 or 1040-SR, "
    "line 1z, do the following.",
    43,
)
bullets(
    [
        "Check the box on line 27b.",
        "Determine how much of the amount on Form 1040 or 1040-SR, line 1z, was "
        "also reported on Schedule SE, Part I, line 2.",
        "Subtract that amount from the amount on Form 1040 or 1040-SR, "
        "line 1z. Enter the result on line 1 of the worksheet in Step 5 "
        "(instead of entering the actual amount from Form 1040 or 1040-SR, "
        "line 1z).",
        "Be sure to answer “Yes” to question 2 in Step 5.",
    ],
    43,
    ordered=True,
)
term("Combat pay, nontaxable", 43)
para(
    "If you were a member of the U.S. Armed Forces who served in a combat zone, "
    "certain pay is excluded from your income. See «Combat Zone Exclusion» in "
    "Pub. 3. You can elect to include this pay in your earned income when "
    "figuring the EIC. The amount of your nontaxable combat pay should be shown "
    "in box 12 of Form(s) W-2 with code Q.",
    43,
)
para(
    "If you are filing a joint return and both you and your spouse received "
    "nontaxable combat pay, you can each make your own election. In other "
    "words, if one of you makes the election, the other one can also make it "
    "but doesn’t have to.",
    43,
)
callout(
    "Caution.",
    "If you elect to use your nontaxable combat pay in figuring your EIC, enter "
    "that amount on line 1i.",
    43,
)
term("Credit figured by the IRS", 43)
para("To have the IRS figure your EIC, do the following.", 43)
bullets(
    [
        "Enter “EIC” on the dotted line next to line 27a.",
        "Be sure you enter the nontaxable combat pay you elect to include in "
        "earned income by entering that amount on line 1i. See «Combat pay, "
        "nontaxable», earlier.",
        "If you have a qualifying child, complete and attach Schedule EIC.",
    ],
    43,
    ordered=True,
)
para(
    "If your EIC for a year after 1996 was reduced or disallowed, see «Form "
    "8862, who must file», later.",
    43,
)
term("Exception to time lived with you", 43)
para(
    "Temporary absences by you or the child for special circumstances, such as "
    "school, vacation, business, medical care, military service, or detention "
    "in a juvenile facility, count as time the child lived with you. Also see "
    "«Kidnapped child» under «Who Qualifies as Your Dependent», earlier, and "
    "«Members of the military», later.",
    43,
)
para(
    "A child is considered to have lived with you for more than half of 2025 if "
    "the child was born or died in 2025 and your home was this child’s home "
    "for more than half the time the child was alive in 2025 or, if you adopted "
    "the child in 2025, the child was lawfully placed with you for legal "
    "adoption by you in 2025, or if the child was an eligible foster child "
    "placed with you during 2025 and your main home was the child’s main home "
    "for more than half the time since the child was adopted or placed with you "
    "in 2025.",
    43,
)
term("Form 4797 filers", 43)
para(
    "If the amount on Form 1040 or 1040-SR, line 7a, includes an amount from "
    "Form 4797, you must use Worksheet 1 in Pub. 596 to see if you can take the "
    "EIC. Otherwise, stop; you can’t take the EIC.",
    43,
)
term("Form 8862, who must file", 43)
para(
    "You must file Form 8862 if your EIC for a year after 1996 was reduced or "
    "disallowed for any reason other than a math or clerical error. But "
    "don’t file Form 8862 if either of the following applies.",
    43,
)
bullets(
    [
        "You filed Form 8862 for another year, the EIC was allowed for that "
        "year, and your EIC hasn’t been reduced or disallowed again for any "
        "reason other than a math or clerical error.",
        "You are taking the EIC without a qualifying child and the only reason "
        "your EIC was reduced or disallowed in the other year was because it "
        "was determined that a child listed on Schedule EIC wasn’t your "
        "qualifying child.",
    ],
    43,
)
para("Also, don’t file Form 8862 or take the credit for the:", 43)
bullets(
    [
        "2 years after the most recent tax year for which there was a final "
        "determination that your EIC claim was due to reckless or intentional "
        "disregard of the EIC rules, or",
        "10 years after the most recent tax year for which there was a final "
        "determination that your EIC claim was due to fraud.",
    ],
    43,
)
term("Foster child", 43)
para(
    "A foster child is any child placed with you by an authorized placement "
    "agency or by judgment, decree, or other order of any court of competent "
    "jurisdiction. For more details on authorized placement agencies, see "
    "Pub. 596.",
    43,
)

review_notes = [
    "TRANCHE 13 OF A MULTI-SESSION REBUILD. This plan covers printed pages "
    "42-43 — the rest of EIC Steps 4, 5 and 6, lines 27b and 27c, and the "
    "start of the EIC’s own Definitions and Special Rules. It carries no "
    "document title by design: only tranche 1 does, so this file validates "
    "through merge-plans rather than standalone. No partial rebuild is "
    "delivered.",
    "BOUNDARY IN. Tranche 12 authored Step 4’s question 2 whole because its "
    "Yes/No branches print at the top of page 42, so this tranche starts at "
    "Step 4 question 3. BOUNDARY OUT: page 43 ends on a complete definition "
    "(“Foster child”), so nothing spans the 43/44 edge and there is no "
    "handoff note.",
    "A WORKSHEET INSIDE A FLOWCHART BRANCH — a new COMBINATION, not a new "
    "shape. Step 5 question 1’s No branch says “Complete the following "
    "worksheet”, and a five-line worksheet follows. It uses the tranche-8 "
    "worksheet shape unchanged, sitting between the question and the next "
    "question, which is where the source prints it.",
    "CALLOUTS ATTACHED TO WORKSHEET LINES ARE FOLDED INTO THOSE LINES. The "
    "worksheet prints a Tip after line 2 and a Caution after line 4, each about "
    "the line above it. Both fold into their line’s instruction cell with the "
    "label kept, so the line numbering stays continuous and each note stays "
    "with the line it qualifies. This follows the tranche-8 rule for material "
    "nested inside a numbered line; splitting the worksheet into three tables "
    "would have broken the numbering a reader is asked to add up.",
    "CONDITIONS-THEN-BRANCHES again, as in tranche 12: Step 5 question 3 prints "
    "a bulleted set of income thresholds and then one Yes/No pair covering the "
    "whole set. Authored as question → condition list → branch list.",
    "THE EIC HAS ITS OWN DEFINITIONS SECTION, separate from the one in "
    "tranches 6 and 20-22’s glossary. Several terms appear in both "
    "(“Adopted child”, “Foster child”, “Exception to time "
    "lived with you”) with DIFFERENT wording — the EIC versions refer to "
    "Pub. 596 and to EIC-specific rules. Both are kept in full, as tranche 6 "
    "decided for the earlier duplicates: each belongs to the section a reader "
    "is working through.",
    "GLOSSARY ENTRIES AS LEVEL-5 HEADINGS, matching the tranche-6 treatment of "
    "the earlier Definitions and Special Rules, under the level-4 section "
    "heading that sits beside the EIC’s Steps.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked. Pages 42 and 43 "
    "carry no link annotations.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (self-employed, "
    "nontaxable, 1040-SR, Form 4797, Schedule SE). PAGE FURNITURE OMITTED: "
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
