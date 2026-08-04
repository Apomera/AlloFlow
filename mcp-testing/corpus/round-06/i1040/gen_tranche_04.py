#!/usr/bin/env python3
"""Author tranche 4 of the i1040 rebuild: printed pages 12-16, the start of
"Line Instructions for Forms 1040 and 1040-SR" — Name and Address, Social
Security Number, Filing Status, Digital Assets, and the Dependents lead-in.

Scope note: the session log originally pencilled tranche 4 as pages 12-22.
That was split. Pages 12-16 are prose line-instructions; pages 17+ are the
qualifying-child DECISION CHARTS, a different structure that deserves its own
session. 16/17 is a clean semantic boundary.

Method notes specific to this tranche:

  * Page 12 is a MIXED layout — a full-width title block and a banner above
    three columns — so the column detector reports one column and the title
    interleaves into the body ("...that follow the Line Form 1040 and 1040-SR
    instructions. ! CAUTION Instructions What form to file."). Its reading
    order was rebuilt from the page image, the same workaround page 9 needed
    in tranche 3. Pages 13-16 are detected correctly as three columns.
  * This tranche is dense with ITALIC CROSS-REFERENCES ("see Who Qualifies as
    Your Dependent, later"). Rather than hand-build ~40 run arrays, text is
    written with inline markers and expanded by `rich()` below:
        «...»            emphasis (italic cross-reference)
        ‹...›            strong (bold run-in inside a sentence)
        [[text|url]]     hyperlink
    The expansion asserts that the runs concatenate back to the plain text,
    which is also what the plan schema enforces at load time.

Usage: python gen_tranche_04.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-04-pages-12-16.json")

SS5 = "https://www.ssa.gov/forms/ss-5.pdf"
ITIN = "https://www.irs.gov/itin"
VCFAQ = "https://www.irs.gov/virtualcurrencyfaq"

MARKER = re.compile(r"(«[^»]*»|‹[^›]*›|\[\[[^\]]*\]\])")

blocks = []


def rich(text):
    """Expand inline markers to (plain_text, runs). runs is None if unmarked."""
    if not MARKER.search(text):
        return text, None
    runs = []
    plain = []
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
    """TIP/CAUTION margin icon: the label is real text, so it is kept."""
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


WQYD = "«Who Qualifies as Your Dependent»"
DEPENDENTS_TIP = (
    "The dependents you claim are those you list by name and SSN in the "
    "Dependents section on Form 1040 or 1040-SR."
)
ADOPTED_CHILD = (
    "An adopted child is always treated as your own child. An adopted child "
    "includes a child lawfully placed with you for legal adoption."
)
KEEPING_UP_HOME = "To find out what is included in the cost of keeping up a home, see Pub. 501."

# ── page 12 ──────────────────────────────────────────────────────────────────
heading("Line Instructions for Forms 1040 and 1040-SR", 12, 2)
callout(
    "Caution.",
    "Also see the instructions for Schedule 1 through Schedule 3 that follow "
    "the Form 1040 and 1040-SR instructions.",
    12,
)
heading("What form to file", 12, 3)
para(
    "Everyone can file Form 1040. Form 1040-SR is available to you if you were "
    "born before January 2, 1961.",
    12,
)
heading("Fiscal-year filers", 12, 3)
para(
    "If you are a fiscal-year filer using a tax year other than January 1 "
    "through December 31, 2025, enter the beginning and ending months of your "
    "fiscal year in the entry space provided at the top of page 1 of Form 1040 "
    "or 1040-SR.",
    12,
)
para("Section references are to the Internal Revenue Code.", 12)

heading("Name and Address", 12, 3)
para(
    "Print or type the information in the spaces provided. If you are married "
    "filing a separate return, enter your spouse’s name in the entry space "
    "below the filing status checkboxes instead of below your name. If you are "
    "currently incarcerated, enter your inmate identifying number near your "
    "last name.",
    12,
)
callout(
    "Tip.",
    "If you filed a joint return for 2024 and you are filing a joint return for "
    "2025 with the same spouse, be sure to enter your names and SSNs in the "
    "same order as on your 2024 return.",
    12,
)
heading("Name Change", 12, 4)
para(
    "If you changed your name because of marriage, divorce, etc., be sure to "
    "report the change to the Social Security Administration (SSA) before "
    "filing your return. This prevents delays in processing your return and "
    "issuing refunds. It also safeguards your future social security benefits.",
    12,
)
heading("Address Change", 12, 4)
para(
    "If you plan to move after filing your return, use Form 8822 to notify the "
    "IRS of your new address.",
    12,
)
heading("P.O. Box", 12, 4)
para(
    "Enter your box number only if your post office doesn’t deliver mail to "
    "your home.",
    12,
)
heading("Foreign Address", 12, 4)
para(
    "If you have a foreign address, enter the city name on the appropriate "
    "line. Don’t enter any other information on that line, but do complete "
    "the spaces below that line (Foreign country name, Foreign "
    "province/state/county, and Foreign postal code).",
    12,
)
para("Don’t abbreviate the country name.", 12)
heading("Death of a Taxpayer", 12, 4)
para(
    "If a taxpayer died before filing a return for 2025, the taxpayer’s "
    "spouse or personal representative may have to file and sign a return for "
    "that taxpayer. A personal representative can be an executor, "
    "administrator, or anyone who is in charge of the deceased taxpayer’s "
    "property. If the deceased taxpayer didn’t have to file a return but had "
    "tax withheld, a return must be filed to get a refund. The person who files "
    "the return must check the “Deceased” box at the top of page 1 of "
    "Form 1040 or 1040-SR. They must also enter the date of death in the entry "
    "spaces. If a return is being filed for both spouses who died in 2025, the "
    "person who files the return must check the “Deceased” box and enter "
    "the date of death for both the primary taxpayer and the spouse.",
    12,
)
para(
    "If your spouse died in 2025 and you didn’t remarry in 2025, or if your "
    "spouse died in 2026 before filing a return for 2025, you can file a joint "
    "return. A joint return should show your spouse’s 2025 income before "
    "death and your income for all of 2025. Check the “Deceased” box at "
    "the top of page 1 of Form 1040 or 1040-SR and enter the date your spouse "
    "died in the entry spaces after “Spouse.” Enter “Filing as "
    "surviving spouse” in the area where you sign the return. If someone "
    "other than you is the personal representative, they must also sign the "
    "return.",
    12,
)
para("Failure to complete this section may delay the processing of the return.", 12)
para(
    "All payers of income, including financial institutions, should be promptly "
    "notified of the taxpayer’s death. This will ensure the proper reporting "
    "of income earned by the taxpayer’s estate or heirs. A deceased "
    "taxpayer’s social security number shouldn’t be used for tax years "
    "after the year of death, except for estate tax return purposes.",
    12,
)

heading("Social Security Number (SSN)", 12, 3)
para(
    "An incorrect or missing SSN can increase your tax, reduce your refund, or "
    "delay your refund. To apply for an SSN, fill in Form SS-5 and return it, "
    "along with the appropriate evidence documents, to the Social Security "
    "Administration (SSA). You can get Form SS-5 online at "
    f"[[SSA.gov/forms/ss-5.pdf|{SS5}]], from your local SSA office, or by "
    "calling the SSA at 800-772-1213. It usually takes about 2 weeks to get an "
    "SSN once the SSA has all the evidence and information it needs.",
    12,
)
para(
    "Check that both the name and SSN on your Forms 1040 or 1040-SR, W-2, and "
    "1099 agree with your social security card. If they don’t, certain "
    "deductions and credits on Form 1040 or 1040-SR may be reduced or "
    "disallowed and you may not receive credit for your social security "
    "earnings. If your Form W-2 shows an incorrect SSN or name, notify your "
    "employer or the form-issuing agent as soon as possible to make sure your "
    "earnings are credited to your social security record. If the name or SSN "
    "on your social security card is incorrect, call the SSA.",
    12,
)
# Runs across the 12-13 page break; both pages are inside this tranche.
para(
    "Once you are issued an SSN, use it to file your tax return. Use your SSN "
    "to file your tax return even if your SSN does not authorize employment or "
    "if you have been issued an SSN that authorizes employment and you lose "
    "your employment authorization.",
    12,
)

# ── page 13 ──────────────────────────────────────────────────────────────────
para(
    "An ITIN won’t be issued to you once you have been issued an SSN. If you "
    "received your SSN after previously using an ITIN, stop using your ITIN. "
    "Use your SSN instead.",
    13,
)
heading("IRS Individual Taxpayer Identification Numbers (ITINs) for Aliens", 13, 4)
para(
    "If you are a nonresident or resident alien and you don’t have and "
    "aren’t eligible to get an SSN, you must apply for an ITIN. It takes "
    "about 7 weeks to get an ITIN. If you already have an ITIN, enter it "
    "wherever your SSN is requested on your tax return.",
    13,
)
para(
    "Some ITINs must be renewed. If you haven’t used your ITIN on a federal "
    "tax return at least once for tax year 2022, 2023, or 2024, it has expired "
    "and must be renewed if you need to file a federal tax return. You "
    "don’t need to renew your ITIN if you don’t need to file a federal "
    f"tax return. You can find more information at [[IRS.gov/ITIN|{ITIN}]].",
    13,
)
para(
    "An ITIN is for tax use only. It doesn’t entitle you to social security "
    "benefits or change your employment or immigration status under U.S. law.",
    13,
)
para(
    "For more information on ITINs, including application, expiration, and "
    "renewal, see Form W-7 and its instructions.",
    13,
)
para(
    "If you receive an SSN after previously using an ITIN, stop using your "
    "ITIN. Use your SSN instead. Visit a local IRS office or write a letter to "
    "the IRS explaining that you now have an SSN and want all your tax records "
    "combined under your SSN. Details about what to include with the letter and "
    f"where to mail it are at [[IRS.gov/ITIN|{ITIN}]].",
    13,
)
heading("Nonresident Alien Spouse", 13, 4)
para(
    "If your spouse is a nonresident alien, your spouse must have either an SSN "
    "or an ITIN if:",
    13,
)
bullets(["You file a joint return, or", "Your spouse is filing a separate return."], 13)
heading("2025 Residency", 13, 4)
para(
    "If your main home, and your spouse’s if filing a joint return, was in "
    "the United States for more than half of 2025, check the box. Answering "
    "this question will help the IRS determine your eligibility for certain tax "
    "benefits, including the earned income credit.",
    13,
)
heading("Presidential Election Campaign Fund", 13, 4)
para(
    "This fund helps pay for Presidential election campaigns. The fund reduces "
    "candidates’ dependence on large contributions from individuals and "
    "groups and places candidates on an equal financial footing in the general "
    "election. The fund also helps pay for pediatric medical research. If you "
    "want $3 to go to this fund, check the box. If you are filing a joint "
    "return, your spouse can also have $3 go to the fund. If you check a box, "
    "your tax or refund won’t change.",
    13,
)

heading("Filing Status", 13, 3)
para(
    "Check only the filing status that applies to you. The ones that will "
    "usually give you the lowest tax are listed last.",
    13,
)
bullets(
    [
        "Married filing separately.",
        "Single.",
        "Head of household.",
        "Married filing jointly.",
        "Qualifying surviving spouse.",
    ],
    13,
)
para("For information about marital status, see Pub. 501.", 13)
callout(
    "Tip.",
    "More than one filing status can apply to you. You can choose the one for "
    "which you qualify that will give you the lowest tax.",
    13,
)

heading("Single", 13, 4)
para(
    "You can check the “Single” box in the Filing Status section on "
    "page 1 of Form 1040 or 1040-SR if any of the following was true on "
    "December 31, 2025.",
    13,
)
bullets(
    [
        "You were never married.",
        "You were legally separated according to your state law under a decree "
        "of divorce or separate maintenance. But if, at the end of 2025, your "
        "divorce wasn’t final (an interlocutory decree), you are considered "
        "married and can’t check the box.",
        "You were widowed before January 1, 2025, and didn’t remarry before "
        "the end of 2025. But if you have a child, you may be able to use the "
        "qualifying surviving spouse filing status. See the instructions for "
        "«Qualifying Surviving Spouse», later.",
    ],
    13,
)

heading("Married Filing Jointly", 13, 4)
para(
    "You can check the “Married filing jointly” box in the Filing Status "
    "section on page 1 of Form 1040 or 1040-SR if any of the following apply.",
    13,
)
bullets(
    [
        "You were married at the end of 2025, even if you didn’t live with "
        "your spouse at the end of 2025.",
        "Your spouse died in 2025 and you didn’t remarry in 2025.",
        "You were married at the end of 2025 and your spouse died in 2026 "
        "before filing a 2025 return.",
    ],
    13,
)
para(
    "A married couple filing jointly report their combined income and deduct "
    "their combined allowable expenses on one return. They can file a joint "
    "return even if only one had income or if they didn’t live together all "
    "year. However, both persons must sign the return. Once you file a joint "
    "return, you can’t choose to file separate returns for that year after "
    "the due date of the return.",
    13,
)
heading("Joint and several tax liability", 13, 5)
para(
    "If you file a joint return, both you and your spouse are generally "
    "responsible for the tax and interest or penalties due on the return. This "
    "means that if one spouse doesn’t pay the tax due, the other may have "
    "to. Or, if one spouse doesn’t report the correct tax, both spouses may "
    "be responsible for any additional taxes assessed by the IRS. You may want "
    "to file separately if:",
    13,
)
bullets(
    [
        "You believe your spouse isn’t reporting all of their income, or",
        "You don’t want to be responsible for any taxes due if your spouse "
        "doesn’t have enough tax withheld or doesn’t pay enough estimated "
        "tax.",
    ],
    13,
)
para(
    "See the instructions for «Married Filing Separately». Also see «Innocent "
    "Spouse Relief» under «General Information», later.",
    13,
)
heading("Nonresident aliens and dual-status aliens", 13, 5)
# Runs across the 13-14 page break.
para(
    "Generally, a married couple can’t file a joint return if either spouse "
    "is a nonresident alien at any time during the year. However, you and your "
    "spouse can choose to be treated as U.S. residents for the entire year and "
    "file a joint return if one spouse was a nonresident alien at the end of "
    "the tax year (the nonresident spouse) and the other was a U.S. citizen or "
    "resident at the end of the tax year. This choice remains in effect in "
    "subsequent years until terminated. You and your spouse can also choose to "
    "file as U.S. residents for the entire year if both of you are U.S. "
    "citizens or residents at the end of the year and either (or both) of you "
    "were a nonresident at the beginning of the year (the dual-status "
    "spouse(s)). You can only make this choice for 1 year, and it does not "
    "apply to any future years.",
    13,
)

# ── page 14 ──────────────────────────────────────────────────────────────────
para(
    "If you and your spouse are making either of these choices to be treated as "
    "U.S. residents for 2025, check the box in the Filing Status section and "
    "enter the name of the nonresident spouse or dual-status spouse(s) "
    "(whichever applies to you) in the entry space. Also check the box and "
    "enter their name if you and your nonresident spouse made the choice to be "
    "treated as residents in a prior year and the choice remains in effect.",
    14,
)
callout(
    "Caution.",
    "To make either choice for 2025, you and your spouse must file a joint "
    "return and attach a statement, signed by both spouses, to your return. To "
    "find out what information must be included in the statement, as well as "
    "more information on these choices, see «Nonresident Spouse Treated as a "
    "Resident» for nonresident aliens and «Choosing Resident Alien Status» for "
    "dual-status aliens in Pub. 519.",
    14,
)

heading("Married Filing Separately", 14, 4)
para(
    "Check the “Married filing separately” box in the Filing Status "
    "section on page 1 of Form 1040 or 1040-SR if you are married at the end of "
    "2025 and file a separate return. Enter your spouse’s name in the entry "
    "space. Be sure to enter your spouse’s SSN or ITIN in the space for "
    "spouse’s SSN on Form 1040 or 1040-SR. If your spouse doesn’t have "
    "and isn’t required to have an SSN or ITIN, enter “NRA” in the "
    "entry space.",
    14,
)
para(
    "For electronic filing, enter the spouse’s name or “NRA” if the "
    "spouse doesn’t have an SSN or ITIN in the entry space.",
    14,
)
para(
    "If you are married and file a separate return, you generally report only "
    "your own income, deductions, and credits. Generally, you are responsible "
    "only for the tax on your own income. Different rules apply to people in "
    "community property states; see Pub. 555.",
    14,
)
para(
    "However, you will usually pay more tax than if you use another filing "
    "status for which you qualify. Also, if you file a separate return, you "
    "can’t take the deduction for qualified tips, the deduction for "
    "qualified overtime, the enhanced senior deduction, the student loan "
    "interest deduction, or the education credits, and you will only be able to "
    "take the earned income credit and child and dependent care credit in very "
    "limited circumstances. You also can’t take the standard deduction if "
    "your spouse itemizes deductions.",
    14,
)
para(
    "For situations when you might want to file separately, see «Joint and "
    "several tax liability», earlier.",
    14,
)
callout(
    "Tip.",
    "You may be able to file as head of household if you had a child living "
    "with you and you lived apart from your spouse during the last 6 months of "
    "2025. See «Married persons who live apart», later.",
    14,
)

heading("Head of Household", 14, 4)
para(
    "You can check the “Head of household” box in the Filing Status "
    "section on page 1 of Form 1040 or 1040-SR if you are unmarried and provide "
    "a home for certain other persons. You are considered unmarried for this "
    "purpose if any of the following applies.",
    14,
)
bullets(
    [
        "You were legally separated according to your state law under a decree "
        "of divorce or separate maintenance at the end of 2025. But if, at the "
        "end of 2025, your divorce wasn’t final (an interlocutory decree), "
        "you are considered married.",
        "You are married but lived apart from your spouse for the last 6 months "
        "of 2025 and you meet the other rules under «Married persons who live "
        "apart», later.",
        "You are married and your spouse was a nonresident alien at any time "
        "during the year and the election to treat the alien spouse as a "
        "resident alien is not made. See «Nonresident aliens and dual-status "
        "aliens», earlier.",
    ],
    14,
)
para(
    "Check the “Head of household” box only if you are unmarried (or "
    "considered unmarried) and either Test 1 or Test 2 applies.",
    14,
)
heading("Test 1", 14, 5)
para(
    "You paid over half the cost of keeping up a home that was the main home "
    "for all of 2025 of your parent whom you can claim as a dependent, except "
    f"under a multiple support agreement (see {WQYD}, later). Your parent "
    "didn’t have to live with you.",
    14,
)
heading("Test 2", 14, 5)
para(
    "You paid over half the cost of keeping up a home in which you lived and in "
    "which one of the following also lived for more than half of the year (if "
    "half or less, see «Exception to time lived with you», later).",
    14,
)
bullets(
    [
        "Any person whom you can claim as a dependent. But don’t include: "
        "a. Your child whom you claim as your dependent because of the rule for "
        f"«Children of divorced or separated parents» under {WQYD}, later; "
        "b. Any person who is your dependent only because the person lived with "
        "you for all of 2025; or c. Any person you claimed as a dependent under "
        f"a multiple support agreement. See {WQYD}, later.",
        "Your unmarried qualifying child who isn’t your dependent.",
        "Your married qualifying child who isn’t your dependent only because "
        "you can be claimed as a dependent on someone else’s 2025 return.",
        "Your qualifying child who, even though you are the custodial parent, "
        "isn’t your dependent because of the rule for «Children of divorced "
        f"or separated parents» under {WQYD}, later.",
    ],
    14,
    ordered=True,
)
para(
    "If the child isn’t claimed as your dependent, enter the child’s "
    "name in the entry space below qualifying surviving spouse. If you "
    "don’t enter the name, it will take us longer to process your return.",
    14,
)
heading("Qualifying child", 14, 5)
para(f"To find out if someone is your qualifying child, see Step 1 under {WQYD}, later.", 14)
heading("Dependent", 14, 5)
para(f"To find out if someone is your dependent, see {WQYD}, later.", 14)
callout("Tip.", DEPENDENTS_TIP, 14)
heading("Exception to time lived with you", 14, 5)
# Runs across the 14-15 page break.
para(
    "Temporary absences by you or the other person for special circumstances, "
    "such as school, vacation, business, medical care, military service, or "
    "detention in a juvenile facility, count as time lived in the home. Also "
    f"see «Kidnapped child», later, under {WQYD}, if applicable.",
    14,
)

# ── page 15 ──────────────────────────────────────────────────────────────────
para(
    "If the person for whom you kept up a home was born or died in 2025, you "
    "still may be able to file as head of household. If the person is your "
    "qualifying child, the child must have lived with you for more than half "
    "the part of the year the child was alive. If the person is anyone else, "
    "see Pub. 501. Similarly, if you adopted the person for whom you kept up a "
    "home in 2025, the person was lawfully placed with you for legal adoption "
    "by you in 2025, or the person was an eligible foster child placed with you "
    "during 2025, the person is considered to have lived with you for more than "
    "half of 2025 if your main home was this person’s main home for more "
    "than half the time since the person was adopted or placed with you in 2025.",
    15,
)
heading("Keeping up a home", 15, 5)
para(KEEPING_UP_HOME, 15)
heading("Married persons who live apart", 15, 5)
para(
    "Even if you weren’t divorced or legally separated at the end of 2025, "
    "you are considered unmarried if all of the following apply.",
    15,
)
bullets(
    [
        "You lived apart from your spouse for the last 6 months of 2025. "
        "Temporary absences for special circumstances, such as for business, "
        "medical care, school, or military service, count as time lived in the "
        "home.",
        "You file a separate return from your spouse.",
        "You paid over half the cost of keeping up your home for 2025.",
        "Your home was the main home of your child, stepchild, or foster child "
        "for more than half of 2025 (if half or less, see «Exception to time "
        "lived with you», earlier).",
        "You can claim this child as your dependent or could claim the child "
        "except that the child’s other parent can claim the child under the "
        f"rule for «Children of divorced or separated parents» under {WQYD}, "
        "later.",
    ],
    15,
)
heading("Adopted child", 15, 5)
para(ADOPTED_CHILD, 15)
heading("Foster child", 15, 5)
para(
    "A foster child is any child placed with you by an authorized placement "
    "agency or by judgment, decree, or other order of any court of competent "
    "jurisdiction.",
    15,
)

heading("Qualifying Surviving Spouse", 15, 4)
para(
    "You can check the “Qualifying surviving spouse” box in the Filing "
    "Status section on page 1 of Form 1040 or 1040-SR and use joint return tax "
    "rates for 2025 if all of the following apply.",
    15,
)
bullets(
    [
        "Your spouse died in 2023 or 2024 and you didn’t remarry before the "
        "end of 2025.",
        "You have a child or stepchild (not a foster child) whom you can claim "
        "as a dependent or could claim as a dependent except that, for 2025: "
        "a. The child had gross income of $5,200 or more, b. The child filed a "
        "joint return, or c. You could be claimed as a dependent on someone "
        "else’s return. If the child isn’t claimed as your dependent, "
        "enter the child’s name in the entry space. If you don’t enter "
        "the name, it will take us longer to process your return.",
        "This child lived in your home for all of 2025. If the child didn’t "
        "live with you for the required time, see «Exception to time lived with "
        "you», later.",
        "You paid over half the cost of keeping up your home.",
        "You could have filed a joint return with your spouse the year your "
        "spouse died, even if you didn’t actually do so.",
    ],
    15,
    ordered=True,
)
para(
    "If your spouse died in 2025, you can't file as qualifying surviving "
    "spouse. Instead, see the instructions for «Married Filing Jointly», "
    "earlier.",
    15,
)
heading("Adopted child", 15, 5)
para(ADOPTED_CHILD, 15)
heading("Dependent", 15, 5)
para(f"To find out if someone is your dependent, see {WQYD}, later.", 15)
callout("Tip.", DEPENDENTS_TIP, 15)
heading("Exception to time lived with you", 15, 5)
para(
    "Temporary absences by you or the child for special circumstances, such as "
    "school, vacation, business, medical care, military service, or detention "
    "in a juvenile facility, count as time lived in the home. Also see "
    f"«Kidnapped child», later, under {WQYD}, if applicable.",
    15,
)
para(
    "A child is considered to have lived with you for all of 2025 if the child "
    "was born or died in 2025 and your home was the child’s home for the "
    "entire time the child was alive. Similarly, if you adopted the child in "
    "2025, or the child was lawfully placed with you for legal adoption by you "
    "in 2025, the child is considered to have lived with you for all of 2025 if "
    "your main home was this child’s main home for the entire time since the "
    "child was adopted or placed with you in 2025.",
    15,
)
heading("Keeping up a home", 15, 5)
para(KEEPING_UP_HOME, 15)

heading("Digital Assets", 15, 3)
para(
    "Digital assets are any digital representations of value that are recorded "
    "on a cryptographically secured distributed ledger or any similar "
    "technology. For example, digital assets include non-fungible tokens (NFTs) "
    "and virtual currencies, such as cryptocurrencies and stablecoins. If a "
    "particular asset has the characteristics of a digital asset, it will be "
    "treated as a digital asset for federal income tax purposes.",
    15,
)
para(
    "Check the “Yes” box next to the question on digital assets on "
    "page 1 of Form 1040 or 1040-SR if at any time during 2025, you (a) "
    "received (as a reward, award, or payment for property or services); or (b) "
    "sold, exchanged, or otherwise disposed of a digital asset (or any "
    "financial interest in any digital asset). For example, check "
    "“Yes” if at any time during 2025, you:",
    15,
)
# Runs across the 15-16 page break.
bullets(
    [
        "Received digital assets as payment for property or services provided;",
        "Received digital assets as a result of a reward or award;",
        "Received new digital assets as a result of mining, staking, and "
        "similar activities;",
        "Received digital assets as a result of a hard fork;",
        "Disposed of digital assets in exchange for property or services;",
        "Disposed of a digital asset in exchange or trade for another digital "
        "asset;",
        "Sold a digital asset; or",
        "Otherwise disposed of any other financial interest in a digital asset.",
    ],
    15,
)

# ── page 16 ──────────────────────────────────────────────────────────────────
para(
    "You have a financial interest in a digital asset if you are the owner of "
    "record of a digital asset, or have an ownership stake in an account that "
    "holds one or more digital assets, including the rights and obligations to "
    "acquire a financial interest, or you own a wallet that holds digital "
    "assets.",
    16,
)
para(
    "The following actions or transactions in 2025, alone, generally don’t "
    "require you to check “Yes.”",
    16,
)
bullets(
    [
        "Holding a digital asset in a wallet or account;",
        "Transferring a digital asset from one wallet or account you own or "
        "control to another wallet or account that you own or control; or",
        "Purchasing digital assets using U.S. or other real currency, including "
        "through the use of electronic platforms such as PayPal and Venmo.",
    ],
    16,
)
para(
    "If you used a broker to effect the sale of a digital asset, your broker "
    "should send you Form 1099-DA. You must answer the digital asset question "
    "on Form 1040 whether or not you received a Form 1099-DA.",
    16,
)
callout(
    "Caution.",
    "Do not leave the question unanswered. You must answer “Yes” or "
    "“No” by checking the appropriate box.",
    16,
)
para(f"For more information, go to [[IRS.gov/VirtualCurrencyFAQs|{VCFAQ}]].", 16)
heading("How To Report Digital Asset Transactions", 16, 4)
para(
    "If, in 2025, you disposed of any digital asset, which you held as a "
    "capital asset, through a sale, trade, exchange, payment, or other "
    "transfer, check “Yes” and use Form 8949 to calculate your capital "
    "gain or loss and report that gain or loss on Schedule D.",
    16,
)
para(
    "If you received any digital asset as compensation for services or disposed "
    "of any digital asset that you held for sale to customers in a trade or "
    "business, you must report the income as you would report other income of "
    "the same type (for example, W-2 wages on Form 1040 or 1040-SR, line 1a, or "
    "inventory or services on Schedule C).",
    16,
)
para(
    "If you received ordinary income in connection with digital assets that "
    "isn’t reported elsewhere on your return, see the instructions for "
    "Schedule 1, line 8v.",
    16,
)
para(
    "If you disposed of any digital asset by gift, you may be required to file "
    "Form 709. See «Who Must File» and «Transfers Subject to the Gift Tax» in "
    "the Instructions for Form 709 for more information.",
    16,
)

heading("Dependents", 16, 3)
para(
    "Use the Dependents section to list your dependents. The flowchart and "
    f"instructions in {WQYD} will help you determine who you should list in "
    "this section. The information provided in rows (5), (6), and (7), and the "
    "question below row (7) in the Dependents section, will help the IRS "
    "determine your eligibility for certain tax benefits, including the child "
    "tax credit, the credit for other dependents, and the earned income credit. "
    f"For more information, see {WQYD} and the instructions for line 27a.",
    16,
)

review_notes = [
    "TRANCHE 4 OF A MULTI-SESSION REBUILD. This plan covers printed pages 12-16 "
    "— the start of “Line Instructions for Forms 1040 and 1040-SR” "
    "through the Dependents lead-in. It carries no document title by design: "
    "only tranche 1 does, so this file validates through merge-plans rather "
    "than standalone. No partial rebuild is delivered.",
    "SCOPE NARROWED FROM THE PLANNED 12-22. Pages 12-16 are prose "
    "line-instructions; pages 17 onward are the qualifying-child DECISION "
    "CHARTS, a structure that needs its own session. 16/17 is a clean semantic "
    "boundary, so this tranche ends there and the remaining tranches shift by "
    "one.",
    "PAGE 12 READING ORDER REBUILT FROM THE PAGE IMAGE. Page 12 sets a "
    "full-width title block and an intro banner above three columns. As on "
    "page 9 in tranche 3, the column detector reports a single column and the "
    "title interleaves into the body text (“…that follow the Line Form "
    "1040 and 1040-SR instructions. ! CAUTION Instructions What form to "
    "file.”). Its reading order was reconstructed from the rendered page. "
    "Pages 13-16 are detected correctly as three columns and were authored from "
    "the text layer.",
    "FIVE HEADING LEVELS. This part of the document nests deeply, and the "
    "levels follow the printed type sizes: level 2 for the section title "
    "(“Line Instructions…”, 23pt), level 3 for its parts (Name and "
    "Address, Social Security Number, Filing Status, Digital Assets, "
    "Dependents, 16pt), level 4 for their subsections (Death of a Taxpayer, "
    "Single, Married Filing Jointly, Head of Household, Qualifying Surviving "
    "Spouse), and level 5 for the bold run-in topics inside those (Test 1, "
    "Test 2, Joint and several tax liability, Adopted child, Keeping up a "
    "home, and so on). Level 1 is the document title, which lives in "
    "tranche 1.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS. The instructions refer to "
    "other parts of themselves constantly (“see Who Qualifies as Your "
    "Dependent, later”), always in italics. Every such reference is marked "
    "as emphasis, consistent with tranches 2 and 3. They are NOT turned into "
    "links: the source carries no link annotations for them, and the "
    "destinations are in later tranches, so inventing anchors now would risk "
    "pointing at nothing.",
    "TIP AND CAUTION CALLOUTS. Seven margin callouts are handled as in "
    "tranche 3: the label is real text in the content stream, so each is "
    "authored as a paragraph opening with a strong “Tip.”/"
    "“Caution.” and the interrupted sentence restored around it, in "
    "sentence case rather than the printed all-caps.",
    "NESTED SUB-ITEMS FOLDED. Two ordered lists nest one level: Head of "
    "Household Test 2 item 1 (sub-items a-c) and Qualifying Surviving Spouse "
    "item 2 (sub-items a-c). As in Chart C in tranche 3, the printed "
    "“a.”/“b.”/“c.” markers are kept verbatim inside the "
    "parent item, so the enumeration is unchanged. In the Qualifying Surviving "
    "Spouse list, the paragraph that the source prints BETWEEN items 2 and 3 "
    "(“If the child isn’t claimed as your dependent…”) belongs "
    "to item 2 and is folded into it, because a flat list cannot be "
    "interrupted.",
    "REPEATED DEFINITIONS KEPT. Several short definitions appear twice in "
    "these pages — “Adopted child”, “Dependent”, "
    "“Exception to time lived with you”, “Keeping up a home”, "
    "and the dependents Tip — once under Head of Household and again under "
    "Qualifying Surviving Spouse. Both copies are kept, because each belongs to "
    "the filing status a reader is working through and de-duplicating would "
    "leave one status incomplete.",
    "SOFT HYPHENS REMOVED. As throughout this document, justified type breaks "
    "words with real hyphen glyphs (“informa-tion”, “re-turn”, "
    "“du-al-status”). Line-break hyphens are closed; genuine compounds "
    "are kept (1040-SR, dual-status, non-fungible, form-issuing, W-2, "
    "SS-5, W-7).",
    "LINK TARGETS FROM ANNOTATIONS. Four hyperlinks take their URLs from the "
    "PDF’s own Link annotations: SSA.gov/forms/ss-5.pdf on page 12, "
    "IRS.gov/ITIN twice on page 13, and IRS.gov/VirtualCurrencyFAQs on "
    "page 16 (whose annotation resolves to irs.gov/virtualcurrencyfaq, "
    "singular, which is kept as the real target). Pages 14 and 15 have no "
    "links.",
    "PAGE FURNITURE OMITTED. The printed page numbers (12-16), the standing "
    "footer (“Need more information or forms? Visit IRS.gov.”), and the "
    "invisible production lines every page carries (“Fileid: … MUST "
    "be removed before printing”) are dropped as print furniture rather "
    "than document content.",
    "PAGE-BREAK SPANNING BLOCKS. Four blocks begin on one page and finish on "
    "the next — the SSN/employment-authorization paragraph (12→13), the "
    "nonresident-alien joint-return paragraph (13→14), the "
    "“Exception to time lived with you” paragraph (14→15), and "
    "the digital-asset “check Yes if” list (15→16). All four pages "
    "are inside this tranche, so each block is authored whole and attributed to "
    "the page it starts on.",
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
