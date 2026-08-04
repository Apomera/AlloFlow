#!/usr/bin/env python3
"""Author tranche 7 of the i1040 rebuild: printed pages 23-26, the start of the
"Income" line instructions — general income rules, then lines 1a through 4b.

Scope: the session log pencilled tranche 7 as pages 23-38. That is 16 pages and
two different structures. Pages 23-26 are three-column line instructions; page
29 onward introduces the fill-in WORKSHEETS ("Simplified Method
Worksheet—Lines 5a and 5b", with dot leaders and numbered entry lines), which
are a new shape deserving their own session. This tranche stops at the end of
page 26, where the Lines 4a/4b paragraph completes cleanly.

Structure note — line headings. The source prints each line instruction as a
small bold "Line 1a" above a larger bold description ("Total Amount From
Form(s) W-2, Box 1"). Those are authored as ONE heading, "Line 1a. Total
Amount From Form(s) W-2, Box 1", so the heading says both which line it is and
what it is for; a reader jumping by heading needs both.

Usage: python gen_tranche_07.py [out.json]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-07-pages-23-26.json")

RP_2014_55 = "https://www.irs.gov/irb/2014-44_IRB#RP-2014-55"
NOT_2006_83 = "https://www.irs.gov/irb/2006-40_IRB#NOT-2006-83"
TC756 = "https://www.irs.gov/taxtopics/tc756.html"
TC154 = "https://www.irs.gov/taxtopics/tc154.html"

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


def line_heading(number, description, page):
    heading(f"Line {number}. {description}", page, 4)


# ── page 23 ──────────────────────────────────────────────────────────────────
heading("Income", 23, 3)
para(
    "Generally, you must report all income except income that is exempt from "
    "tax by law. For details, see the following instructions and the Schedule 1 "
    "instructions, especially the instructions for lines 1 through 7 and "
    "Schedule 1, lines 1 through 8z. Also see Pub. 525.",
    23,
)

heading("Forgiveness of Paycheck Protection Program (PPP) Loans", 23, 4)
para(
    "You don’t need to include the amount of a forgiven PPP Loan in your "
    "income. Although you don’t need to report the income from the "
    "forgiveness of your PPP Loan on Form 1040 or 1040-SR, you do need to "
    "report certain information related to your PPP Loan as an attachment to "
    "your tax return. For more information, see Pub. 525.",
    23,
)

heading("Foreign-Source Income", 23, 4)
para(
    "You must report unearned income, such as interest, dividends, and "
    "pensions, from sources outside the United States unless exempt by law or a "
    "tax treaty. You must also report earned income, such as wages and tips, "
    "from sources outside the United States.",
    23,
)
para(
    "If you worked abroad, you may be able to exclude part or all of your "
    "foreign earned income. For details, see Pub. 54 and Form 2555.",
    23,
)
heading("Foreign retirement plans", 23, 5)
para(
    "If you were a beneficiary of a foreign retirement plan, you may have to "
    "report the undistributed income earned in your plan. However, if you were "
    "the beneficiary of a Canadian registered retirement plan, see "
    "Rev. Proc. 2014-55, 2014-44 I.R.B. 753, available at "
    f"[[IRS.gov/irb/2014-44_IRB#RP-2014-55|{RP_2014_55}]], to find out if you "
    "can elect to defer tax on the undistributed income. Report distributions "
    "from foreign pension plans on lines 5a and 5b.",
    23,
)
heading("Foreign accounts and trusts", 23, 5)
para("You must complete Part III of Schedule B if you:", 23)
bullets(
    [
        "Had a foreign account; or",
        "Received a distribution from, or were a grantor of, or a transferor "
        "to, a foreign trust.",
    ],
    23,
)
para("You may also have to file Form 3520.", 23)
heading("Foreign financial assets", 23, 5)
para(
    "If you had foreign financial assets in 2025, you may have to file "
    "Form 8938. See Form 8938 and its instructions.",
    23,
)

heading("Chapter 11 Bankruptcy Cases", 23, 4)
para(
    "If you are a debtor in a chapter 11 bankruptcy case, income taxable to the "
    "bankruptcy estate and reported on the estate’s income tax return "
    "includes:",
    23,
)
bullets(
    [
        "Earnings from services you performed after the beginning of the case "
        "(both wages and self-employment income); and",
        "Income from property described in section 541 of title 11 of the U.S. "
        "Code that you either owned when the case began or that you acquired "
        "after the case began and before the case was closed, dismissed, or "
        "converted to a case under a different chapter.",
    ],
    23,
)
para(
    "Because this income is taxable to the estate, don’t include this income "
    "on your own individual income tax return. The only exception is for "
    "purposes of figuring your self-employment tax. For that purpose, you must "
    "take into account all your self-employment income for the year from "
    "services performed both before and after the beginning of the case.",
    23,
)
para(
    "Also, you (or the trustee if one is appointed) must allocate between you "
    "and the bankruptcy estate the wages, salary, or other compensation and "
    "withheld income tax reported to you on Form W-2. A similar allocation is "
    "required for income and withheld income tax reported to you on "
    "Forms 1099. You must also include a statement that indicates you filed a "
    "chapter 11 case and that explains how income and withheld income tax "
    "reported to you on Forms W-2 and 1099 are allocated between you and the "
    "estate. For more details, including acceptable allocation methods, see "
    "Notice 2006-83, 2006-40 I.R.B. 596, available at "
    f"[[IRS.gov/irb/2006-40_IRB#NOT-2006-83|{NOT_2006_83}]].",
    23,
)

heading("Community Property States", 23, 4)
para(
    "Community property states include Arizona, California, Idaho, Louisiana, "
    "Nevada, New Mexico, Texas, Washington, and Wisconsin. If you and your "
    "spouse lived in a community property state, you must usually follow state "
    "law to determine what is community income and what is separate income. For "
    "details, see Form 8958 and Pub. 555.",
    23,
)
heading("Nevada, Washington, and California domestic partners", 23, 5)
para(
    "A registered domestic partner in Nevada, Washington, or California must "
    "generally report half the combined community income of the individual and "
    "their domestic partner. See Form 8958 and Pub. 555.",
    23,
)

heading("Rounding Off to Whole Dollars", 23, 4)
para(
    "You can round off cents to whole dollars on your return and schedules. If "
    "you do round to whole dollars, you must round all amounts. To round, drop "
    "amounts under 50 cents and increase amounts from 50 to 99 cents to the "
    "next dollar. For example, $1.39 becomes $1 and $2.50 becomes $3.",
    23,
)
para(
    "If you have to add two or more amounts to figure the amount to enter on a "
    "line, include cents when adding the amounts and round off only the total.",
    23,
)
para(
    "If you are entering amounts that include cents, make sure to include the "
    "decimal point. There is no cents column on the form.",
    23,
)
callout(
    "Caution.",
    "The lines on Forms 1040 and 1040-SR are the same. References to lines in "
    "the following instructions refer to the line on either form.",
    23,
)

line_heading("1a", "Total Amount From Form(s) W-2, Box 1", 23)
para(
    "Enter the total amount from Form(s) W-2, box 1. If a joint return, also "
    "include your spouse’s income from Form(s) W-2, box 1.",
    23,
)
callout(
    "Caution.",
    "If you earned wages while you were an inmate in a penal institution, "
    "report these amounts on Schedule 1, line 8u. Do not report these wages on "
    "line 1a. See the instructions for Schedule 1, line 8u.",
    23,
)

# ── page 24 ──────────────────────────────────────────────────────────────────
callout(
    "Caution.",
    "If you received a pension or annuity from a nonqualified deferred "
    "compensation plan or a nongovernmental section 457 plan and it was "
    "reported in box 1 of Form W-2, do not include this amount on Form 1040, "
    "line 1a. This amount is reported on Schedule 1, line 8t.",
    24,
)

line_heading("1b", "Household Employee Wages Not Reported on Form(s) W-2", 24)
para(
    "Enter the total of your wages received as a household employee that was "
    "not reported on Form(s) W-2. An employer isn’t required to provide a "
    "Form W-2 to you if they paid you wages of less than $2,800 in 2025. For "
    f"information on employment taxes for household employees, see "
    f"[[Tax Topic 756|{TC756}]].",
    24,
)

line_heading("1c", "Tip Income Not Reported on Line 1a", 24)
para(
    "Enter the total of your tip income that was not reported on Form 1040, "
    "line 1a. This should include any tip income you didn’t report to your "
    "employer and any allocated tips shown in box 8 on your Form(s) W-2 unless "
    "you can prove that your unreported tips are less than the amount in box 8. "
    "Allocated tips aren’t included as income in box 1. See Pub. 531 for more "
    "details.",
    24,
)
para(
    "Also, include the value of any noncash tips you received, such as tickets, "
    "passes, or other items of value. Although you don’t report these noncash "
    "tips to your employer, you must report them on line 1c.",
    24,
)
callout(
    "Caution.",
    "You may owe social security and Medicare or railroad retirement (RRTA) tax "
    "on unreported tips. See the instructions for Schedule 2, line 5.",
    24,
)

line_heading("1d", "Medicaid Waiver Payments Not Reported on Form(s) W-2, Box 1", 24)
para(
    "Enter your taxable Medicaid waiver payments that were not reported on "
    "Form(s) W-2. Also enter the total of your taxable and nontaxable Medicaid "
    "waiver payments that were not reported on Form(s) W-2, or not reported in "
    "box 1 of Form(s) W-2, if you choose to include nontaxable payments in "
    "earned income for purposes of claiming a credit or other tax benefit. If "
    "you and your spouse both received nontaxable Medicaid waiver payments "
    "during the year, you and your spouse can make different choices about "
    "including payments in earned income. See the instructions for Schedule 1, "
    "line 8s.",
    24,
)
para(
    "If you are a sole proprietor in a business of providing home care "
    "services, see the Schedule C instructions for how to report these amounts. "
    "If you do not have a separate trade or business of providing these "
    "services, enter on Form 1040, line 1d, your Medicaid waiver payments "
    "reported on Form 1099-MISC or Form 1099-NEC. Also, enter your nontaxable "
    "Medicaid waiver payments on Schedule 1, line 8s.",
    24,
)
callout(
    "Tip.",
    "Your nontaxable Medicaid waiver payments may have been reported to you on "
    "Form(s) W-2, box 12, with Code II.",
    24,
)
callout(
    "Caution.",
    "If you received nontaxable Medicaid waiver payments, and box 1 of your "
    "Form(s) W-2 is blank or has zeros, and you are choosing not to include "
    "nontaxable payments in earned income for purposes of claiming a credit, do "
    "not attach any of these Form(s) W-2 to your return.",
    24,
)

line_heading("1e", "Taxable Dependent Care Benefits From Form 2441, Line 26", 24)
para(
    "Enter the total of your taxable dependent care benefits from Form 2441, "
    "line 26. Dependent care benefits should be shown in box 10 of your "
    "Form(s) W-2. But first complete Form 2441 to see if you can exclude part "
    "or all of the benefits.",
    24,
)

line_heading("1f", "Employer-Provided Adoption Benefits From Form 8839, Line 31", 24)
para(
    "Enter the total of your employer-provided adoption benefits from "
    "Form 8839, line 31. Employer-provided adoption benefits should be shown in "
    "box 12 of your Form(s) W-2 with code T. But see the Instructions for "
    "Form 8839 to find out if you can exclude part or all of the benefits. You "
    "may also be able to exclude amounts if you adopted a child with special "
    "needs and the adoption became final in 2025.",
    24,
)

line_heading("1g", "Wages From Form 8919, Line 6", 24)
para("Enter the total of your wages from Form 8919, line 6.", 24)

line_heading("1h", "Other Earned Income", 24)
callout(
    "Tip.",
    "If you received scholarship or fellowship grants that were not reported to "
    "you on Form W-2, report these amounts on Schedule 1, line 8r. See the "
    "instructions for Schedule 1, line 8r.",
    24,
)
para("The following types of income must be included in the total on line 1h.", 24)
# The bulleted list is INTERRUPTED on page 25 by a caution callout, so it is
# authored as two lists with the callout between them; the sub-bullets under
# "Excess elective deferrals" are folded into that item.
bullets(
    [
        "Strike or lockout benefits (other than bona fide gifts).",
        "Excess elective deferrals. The amount deferred should be shown in "
        "box 12 of your Form W-2, and the “Retirement plan” box in "
        "box 13 should be checked. If the total amount you (or your spouse if "
        "filing jointly) deferred for 2025 under all plans was more than $23,500 "
        "(excluding catch-up contributions, as explained later), include the "
        "excess on line 1h. This limit is generally (a) $16,500 if you have only "
        "SIMPLE plans, and (b) $26,500 for section 403(b) plans if you qualify "
        "for the 15-year rule in Pub. 571. Although designated Roth "
        "contributions are subject to this limit, don’t include the excess "
        "attributable to such contributions on line 1h. They are already "
        "included as income in box 1 of your Form W-2. A higher limit of $17,600 "
        "may apply to participants in certain SIMPLE plans. A higher limit may "
        "also apply to participants in section 457(b) deferred compensation "
        "plans for the 3 years before retirement age. Contact your plan "
        "administrator for more information. If you were age 50 or older at the "
        "end of 2025, your employer may have allowed an additional deferral "
        "(catch-up contributions) of up to $7,500 (generally, $3,500 for section "
        "401(k)(11) and SIMPLE plans). If you were age 60 to 63 at the end of "
        "2025, your employer may have allowed a catch-up contribution of up to "
        "$11,250 ($5,250 for section 401(k)(11) and SIMPLE plans). This "
        "additional deferral amount isn’t subject to the overall limit on "
        "elective deferrals. A catch-up contribution limit of $3,850 may apply "
        "to certain participants in certain SIMPLE plans. Contact your plan "
        "administrator for more information.",
    ],
    24,
)

# ── page 25 ──────────────────────────────────────────────────────────────────
callout(
    "Caution.",
    "You can’t deduct the amount deferred. It isn’t included as income in "
    "box 1 of your Form W-2.",
    25,
)
bullets(
    [
        "Disability pensions shown on Form 1099-R if you haven’t reached the "
        "minimum retirement age set by your employer. But see «Insurance "
        "Premiums for Retired Public Safety Officers» in the instructions for "
        "lines 5a and 5b. Disability pensions received after you reach minimum "
        "retirement age and other payments shown on Form 1099-R (other than "
        "payments from an IRA) are reported on lines 5a and 5b. Payments from an "
        "IRA are reported on lines 4a and 4b.",
        "Corrective distributions from a retirement plan shown on Form 1099-R "
        "of excess elective deferrals and excess contributions (plus earnings). "
        "But don’t include distributions from an IRA on line 1h. Instead, "
        "report distributions from an IRA on lines 4a and 4b.",
    ],
    25,
)

line_heading("1i", "Nontaxable Combat Pay Election", 25)
para(
    "If you elect to include your nontaxable combat pay in your earned income "
    "when figuring the EIC, enter the amount on line 1i. See the instructions "
    "for line 27a.",
    25,
)

heading("Were You a Statutory Employee?", 25, 4)
para(
    "If you were a statutory employee, the “Statutory employee” box in "
    "box 13 of your Form W-2 should be checked. Statutory employees include "
    "full-time life insurance salespeople and certain agent or commission "
    "drivers, certain traveling salespeople, and certain homeworkers.",
    25,
)
para(
    "Statutory employees report the amount shown in box 1 of Form W-2 on a "
    "Schedule C along with any related business expenses.",
    25,
)

heading("Missing or Incorrect Form W-2?", 25, 4)
para(
    "Your employer is required to provide or send Form W-2 to you no later than "
    "February 2, 2026. If you don’t receive it by early February, use "
    f"[[Tax Topic 154|{TC154}]] to find out what to do. Even if you don’t get "
    "a Form W-2, you must still report your earnings. If you lose your "
    "Form W-2 or it is incorrect, ask your employer for a new one.",
    25,
)

line_heading("2a", "Tax-Exempt Interest", 25)
para(
    "If you received any tax-exempt interest (including any tax-exempt original "
    "issue discount (OID)), such as from municipal bonds, each payer should "
    "send you a Form 1099-INT or a Form 1099-OID. In general, your tax-exempt "
    "stated interest should be shown in box 8 of Form 1099-INT or, for a "
    "tax-exempt OID bond, in box 2 of Form 1099-OID, and your tax-exempt OID "
    "should be shown in box 11 of Form 1099-OID. Enter the total on line 2a. "
    "However, if you acquired a tax-exempt bond at a premium, only report the "
    "net amount of tax-exempt interest on line 2a (that is, the excess of the "
    "tax-exempt interest received during the year over the amortized bond "
    "premium for the year). Also, if you acquired a tax-exempt OID bond at an "
    "acquisition premium, only report the net amount of tax-exempt OID on "
    "line 2a (that is, the excess of tax-exempt OID for the year over the "
    "amortized acquisition premium for the year). See Pub. 550 for more "
    "information about OID, bond premium, and acquisition premium.",
    25,
)
para(
    "Also include on line 2a any exempt-interest dividends from a mutual fund "
    "or other regulated investment company. This amount should be shown in "
    "box 12 of Form 1099-DIV.",
    25,
)
para(
    "Don’t include interest earned on your IRA, health savings account, "
    "Archer or Medicare Advantage MSA, or Coverdell education savings account.",
    25,
)
callout(
    "Caution.",
    "Don’t include any amounts related to the forgiveness of PPP Loans on "
    "this line.",
    25,
)

line_heading("2b", "Taxable Interest", 25)
para(
    "Each payer should send you a Form 1099-INT or Form 1099-OID. Enter your "
    "total taxable interest income on line 2b. But you must fill in and attach "
    "Schedule B if the total is over $1,500 or any of the other conditions "
    "listed at the beginning of the Schedule B instructions applies to you.",
    25,
)
para(
    "For more details about reporting taxable interest, including original "
    "issue discount or market discount on debt instruments and adjustments for "
    "amortizable bond premium or acquisition premium, see Pub. 550.",
    25,
)
para(
    "Interest credited in 2025 on deposits that you couldn’t withdraw "
    "because of the bankruptcy or insolvency of the financial institution may "
    "not have to be included in your 2025 income. For details, see Pub. 550.",
    25,
)
callout(
    "Tip.",
    "If you get a 2025 Form 1099-INT for U.S. savings bond interest that "
    "includes amounts you reported before 2025, see Pub. 550.",
    25,
)

line_heading("3a", "Qualified Dividends", 25)
# Runs across the 25-26 page break.
para(
    "Enter your total qualified dividends on line 3a. Qualified dividends are "
    "also included in the ordinary dividend total required to be shown on "
    "line 3b. Qualified dividends are eligible for a lower tax rate than other "
    "ordinary income. Generally, these dividends are shown in box 1b of "
    "Form(s) 1099-DIV. If you are including your child’s qualified dividends "
    "in the total on line 3a, check box 1 on line 3c. For more information, see "
    "the Instructions for Form 8814. See Pub. 550 for the definition of "
    "qualified dividends if you received dividends not reported on "
    "Form 1099-DIV.",
    25,
)

# ── page 26 ──────────────────────────────────────────────────────────────────
heading("Exception", 26, 5)
para(
    "Some dividends may be reported as qualified dividends in box 1b of "
    "Form 1099-DIV but aren’t qualified dividends. These include the "
    "following.",
    26,
)
bullets(
    [
        "Dividends you received as a nominee. See the Schedule B instructions.",
        "Dividends you received on any share of stock that you held for less "
        "than 61 days during the 121-day period that began 60 days before the "
        "ex-dividend date. The ex-dividend date is the first date following the "
        "declaration of a dividend on which the purchaser of a stock isn’t "
        "entitled to receive the next dividend payment. When counting the number "
        "of days you held the stock, include the day you disposed of the stock "
        "but not the day you acquired it. See the examples that follow. Also, "
        "when counting the number of days you held the stock, you can’t count "
        "certain days during which your risk of loss was diminished. See "
        "Pub. 550 for more details.",
        "Dividends attributable to periods totaling more than 366 days that you "
        "received on any share of preferred stock held for less than 91 days "
        "during the 181-day period that began 90 days before the ex-dividend "
        "date. When counting the number of days you held the stock, you "
        "can’t count certain days during which your risk of loss was "
        "diminished. See Pub. 550 for more details. Preferred dividends "
        "attributable to periods totaling less than 367 days are subject to the "
        "61-day holding period rule just described.",
        "Dividends on any share of stock to the extent that you are under an "
        "obligation (including a short sale) to make related payments with "
        "respect to positions in substantially similar or related property.",
        "Payments in lieu of dividends, but only if you know or have reason to "
        "know that the payments aren’t qualified dividends.",
        "Dividends from a corporation that first became a surrogate foreign "
        "corporation after December 22, 2017, other than a foreign corporation "
        "that is treated as a domestic corporation under section 7874(b).",
    ],
    26,
)
heading("Example 1", 26, 5)
para(
    "You bought 5,000 shares of XYZ Corp. common stock on July 8. XYZ Corp. "
    "paid a cash dividend of 10 cents per share. The ex-dividend date was "
    "July 16. Your Form 1099-DIV from XYZ Corp. shows $500 in box 1a (ordinary "
    "dividends) and in box 1b (qualified dividends). However, you sold the "
    "5,000 shares on August 11. You held your shares of XYZ Corp. for only "
    "34 days of the 121-day period (from July 9 through August 11). The "
    "121-day period began on May 17 (60 days before the ex-dividend date) and "
    "ended on September 14. You have no qualified dividends from XYZ Corp. "
    "because you held the XYZ stock for less than 61 days.",
    26,
)
heading("Example 2", 26, 5)
para(
    "The facts are the same as in Example 1 except that you bought the stock on "
    "July 15 (the day before the ex-dividend date), and you sold the stock on "
    "September 16. You held the stock for 63 days (from July 16 through "
    "September 16). The $500 of qualified dividends shown in box 1b of "
    "Form 1099-DIV are all qualified dividends because you held the stock for "
    "61 days of the 121-day period (from July 16 through September 14).",
    26,
)
heading("Example 3", 26, 5)
para(
    "You bought 10,000 shares of ABC Mutual Fund common stock on July 8. ABC "
    "Mutual Fund paid a cash dividend of 10 cents a share. The ex-dividend date "
    "was July 16. The ABC Mutual Fund advises you that the part of the dividend "
    "eligible to be treated as qualified dividends equals 2 cents a share. Your "
    "Form 1099-DIV from ABC Mutual Fund shows total ordinary dividends of "
    "$1,000 and qualified dividends of $200. However, you sold the 10,000 "
    "shares on August 11. You have no qualified dividends from ABC Mutual Fund "
    "because you held the ABC Mutual Fund stock for less than 61 days.",
    26,
)
callout(
    "Tip.",
    "Use the «Qualified Dividends and Capital Gain Tax Worksheet» or the "
    "«Schedule D Tax Worksheet», whichever applies, to figure your tax. See the "
    "instructions for line 16 for details.",
    26,
)

line_heading("3b", "Ordinary Dividends", 26)
para(
    "Each payer should send you a Form 1099-DIV. Enter your total ordinary "
    "dividends on line 3b. This amount should be shown in box 1a of "
    "Form(s) 1099-DIV. If you are including your child’s ordinary dividends "
    "in the total on line 3b, check box 2 on line 3c. For more information, see "
    "the Instructions for Form 8814.",
    26,
)
para(
    "You must fill in and attach Schedule B if the total is over $1,500 or you "
    "received, as a nominee, ordinary dividends that actually belong to someone "
    "else.",
    26,
)

heading("Nondividend Distributions", 26, 4)
para(
    "Some distributions are a return of your cost (or other basis). They "
    "won’t be taxed until you recover your cost (or other basis). You must "
    "reduce your cost (or other basis) by these distributions. After you get "
    "back all of your cost (or other basis), you must report these "
    "distributions as capital gains on Form 8949. For details, see Pub. 550.",
    26,
)
callout(
    "Tip.",
    "Dividends on insurance policies are a partial return of the premiums you "
    "paid. Don’t report them as dividends. Include them in income on "
    "Schedule 1, line 8z, only if they exceed the total of all net premiums you "
    "paid for the contract.",
    26,
)
callout(
    "Tip.",
    "If you are including your child’s dividends on either line 3a or 3b, "
    "check the applicable box on line 3c.",
    26,
)

heading("Lines 4a, 4b, and 4c", 26, 4)
heading("Lines 4a and 4b. IRA Distributions", 26, 5)
para(
    "You should receive a Form 1099-R showing the total amount of any "
    "distribution from your IRA before income tax or other deductions were "
    "withheld. This amount should be shown in box 1 of Form 1099-R. Unless "
    "otherwise noted in the line 4a and 4b instructions, an IRA includes a "
    "traditional IRA (which includes a traditional IRA that receives "
    "contributions from a simplified employee pension (SEP) arrangement), Roth "
    "IRA (which includes a Roth IRA that receives contributions from a SEP "
    "arrangement), and a SIMPLE IRA (a SIMPLE IRA may either be a traditional "
    "SIMPLE IRA or a Roth SIMPLE IRA).",
    26,
)

review_notes = [
    "TRANCHE 7 OF A MULTI-SESSION REBUILD. This plan covers printed pages 23-26 "
    "— the general income rules and the line instructions for lines 1a "
    "through 4b. It carries no document title by design: only tranche 1 does, "
    "so this file validates through merge-plans rather than standalone. No "
    "partial rebuild is delivered.",
    "SCOPE NARROWED FROM THE PLANNED 23-38. That span is 16 pages and two "
    "different structures. Pages 23-26 are three-column line instructions; from "
    "page 29 the section switches to fill-in WORKSHEETS (“Simplified "
    "Method Worksheet—Lines 5a and 5b”, with dot leaders and numbered "
    "entry lines), which are a new shape and need their own session. This "
    "tranche ends at page 26, where the Lines 4a/4b paragraph completes.",
    "LINE HEADINGS CARRY BOTH PARTS. The source prints each line instruction as "
    "a small bold “Line 1a” above a larger bold description "
    "(“Total Amount From Form(s) W-2, Box 1”). They are authored as one "
    "level-4 heading, “Line 1a. Total Amount From Form(s) W-2, Box "
    "1”, because a reader navigating by heading needs to know both which "
    "line it is and what it is for; neither half alone is enough.",
    "AN INTERRUPTED LIST BECAME TWO LISTS. Line 1h’s bulleted list of income "
    "types is broken on page 25 by a caution callout, and the flat list schema "
    "cannot hold a callout mid-list. The list is authored as two lists with the "
    "callout between them, exactly where the source prints it. No item is "
    "reordered.",
    "SUB-BULLETS FOLDED. The three bullets about higher and catch-up deferral "
    "limits sit UNDER the “Excess elective deferrals” item, so they are "
    "folded into that item, as in earlier tranches. The item is long as a "
    "result, but the alternative — a sibling list — would read as a new "
    "set of income types rather than as detail about one of them.",
    "TIP AND CAUTION CALLOUTS, as established in tranche 3: the label is real "
    "text in the content stream, so each callout is a paragraph opening with a "
    "strong “Tip.”/“Caution.” with the interrupted sentence "
    "restored around it, in sentence case rather than the printed all-caps.",
    "LINK TARGETS FROM ANNOTATIONS. Six link rectangles resolve to four "
    "destinations: the two Internal Revenue Bulletin citations on page 23 "
    "(Rev. Proc. 2014-55 and Notice 2006-83, each wrapping across two lines and "
    "so appearing twice), Tax Topic 756 on page 24, and Tax Topic 154 on "
    "page 25. Page 26 has no links. The bulletin URLs keep their fragment "
    "identifiers, which is how the source cites the specific ruling.",
    "ITALIC CROSS-REFERENCES MARKED AS EMPHASIS, not linked — “Insurance "
    "Premiums for Retired Public Safety Officers”, the two worksheets named "
    "in the line 3a tip — since the source carries no link annotations for "
    "them and their destinations are in later tranches.",
    "WORKED EXAMPLES AS HEADINGS. “Example 1”, “Example 2” and "
    "“Example 3” under line 3a are printed as bold run-ins like the "
    "surrounding topics, and each is a self-contained scenario a reader may "
    "want to jump to, so each is a level-5 heading. This differs from the "
    "single “Example.” in tranche 6, which illustrated one glossary "
    "entry and stayed a run-in; here the examples are numbered and parallel.",
    "SOFT HYPHENS REMOVED and genuine compounds kept (tax-exempt, ex-dividend, "
    "self-employment, catch-up, full-time, 1099-DIV, 401(k)(11), 15-year, "
    "121-day). PAGE FURNITURE OMITTED: printed page numbers, the standing "
    "“Need more information or forms?” footer, and the invisible "
    "“Fileid: … MUST be removed before printing” production lines.",
    "PAGE-BREAK SPANNING BLOCKS. The line 1h list runs from page 24 into "
    "page 25 (authored as described above), and the line 3a paragraph begins on "
    "page 25 and finishes on page 26; it is authored whole at page 25.",
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
