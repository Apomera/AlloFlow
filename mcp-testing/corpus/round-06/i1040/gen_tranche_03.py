#!/usr/bin/env python3
"""Author tranche 3 of the i1040 rebuild: printed pages 8-11, "Filing
Requirements" and Charts A, B, and C.

Method notes specific to this tranche (see SESSION-LOG.md for the general one):

  * Page 9 is a MIXED layout — three columns of prose above a full-width chart
    — and the column detector reports it as one column, because the chart's
    full-width rows fill the gutters the detector looks for. Its prose is
    therefore interleaved in the text layer and was reconstructed from the page
    IMAGE (render_pages.cjs with modern pdfjs-dist). Logged as a finding.
  * The TIP and CAUTION callouts are icons in the margin whose LABEL is real
    text in the content stream, so it lands mid-sentence in the extraction
    ("Even if you do not otherwise TIP have to file a return"). The label
    carries meaning that the icon alone would not convey to a screen reader,
    so each callout is authored as a paragraph opening with a strong
    "Tip."/"Caution." and the sentence restored around it.
  * Chart A is a merged-cell table: one filing status spans two or three age
    rows. It is flattened to one row per age bracket with the status repeated,
    because the plan schema (and an accessible data table) has no rowspan.
  * Charts B and C nest sub-bullets one level deep. The schema's lists are
    flat, so each parent item absorbs its own sub-items — Chart C keeps its
    printed "a."/"b." markers verbatim, and Chart B joins its two "larger of—"
    options into the parent sentence.

Usage: python gen_tranche_03.py [out.json]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TRANCHE_1 = os.path.join(HERE, "tranche-01-pages-1-5.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "tranche-03-pages-8-11.json")

TC901 = "https://www.irs.gov/taxtopics/tc901.html"
TC553 = "https://www.irs.gov/taxtopics/tc553.html"
FORM1040 = "https://www.irs.gov/form1040"
PDS = "https://www.irs.gov/privatedeliveryservices"
PDS_ADDR = (
    "https://www.irs.gov/uac/submission-processing-center-street-addresses-"
    "for-private-delivery-service-pds"
)

blocks = []


def heading(text, page, level):
    blocks.append({"type": "heading", "level": level, "text": text, "source_page": page})


def para(text, page, runs=None):
    block = {"type": "paragraph", "text": text, "source_page": page}
    if runs:
        joined = "".join(run["text"] for run in runs)
        assert joined == text, f"runs do not reproduce the text:\n{joined!r}\n{text!r}"
        block["runs"] = runs
    blocks.append(block)


def callout(label, body, page):
    """A TIP/CAUTION margin icon: its label is real text, so keep it."""
    text = f"{label} {body}"
    para(text, page, runs=[
        {"text": label, "style": "strong"},
        {"text": " " + body, "style": "normal"},
    ])


def bullets(items, page, ordered=False, item_runs=None):
    block = {"type": "list", "ordered": ordered, "items": items, "source_page": page}
    if item_runs:
        assert len(item_runs) == len(items), "item_runs must have one entry per item"
        for runs, item in zip(item_runs, items):
            joined = "".join(run["text"] for run in runs)
            assert joined == item, f"item runs do not reproduce the item:\n{joined!r}\n{item!r}"
        block["item_runs"] = item_runs
    blocks.append(block)


def table(caption, columns, rows, page):
    blocks.append({
        "type": "table",
        "caption": caption,
        "columns": columns,
        "rows": rows,
        "source_page": page,
    })


def link_para(prefix, anchor, href, suffix, page):
    text = prefix + anchor + suffix
    para(text, page, runs=[
        {"text": prefix, "style": "normal"},
        {"text": anchor, "style": "normal", "href": href},
        {"text": suffix, "style": "normal"},
    ])


# ── page 8 ───────────────────────────────────────────────────────────────────
heading("Filing Requirements", 8, 2)
para(
    "These rules apply to all U.S. citizens, regardless of where they live, and "
    "resident aliens.",
    8,
)
efile_tail = (
    "? It’s the fastest way to get your refund and it’s free if you are "
    "eligible. Visit IRS.gov for details."
)
para("Have you tried IRS e-file" + efile_tail, 8, runs=[
    {"text": "Have you tried IRS ", "style": "normal"},
    {"text": "e-file", "style": "emphasis"},
    {"text": efile_tail, "style": "normal"},
])

heading("Do You Have To File?", 8, 3)
link_para(
    "Use Chart A, B, or C to see if you must file a return. U.S. citizens who "
    "lived in or had income from a U.S. territory should see Pub. 570. "
    "Residents of Puerto Rico can use ",
    "Tax Topic 901",
    TC901,
    " to see if they must file.",
    8,
)
callout(
    "Tip.",
    "Even if you do not otherwise have to file a return, you should file one to "
    "get a refund of any federal income tax withheld. You should also file if "
    "you are eligible for any of the following credits.",
    8,
)
bullets(
    [
        "Earned income credit.",
        "Additional child tax credit.",
        "American opportunity credit.",
        "Premium tax credit.",
        "Refundable adoption credit.",
    ],
    8,
)
para(
    "See Pub. 501 for details. Also, see Pub. 501 if you do not have to file but "
    "received a Form 1099-B or 1099-DA (or substitute statement).",
    8,
)

heading("Requirement to reconcile advance payments of the premium tax credit", 8, 4)
para(
    "If you, your spouse with whom you are filing a joint return, or a dependent "
    "was enrolled in coverage through the Marketplace for 2025 and advance "
    "payments of the premium tax credit were made for this coverage, you must "
    "file a 2025 return and attach Form 8962. You (or whoever enrolled you) "
    "should have received Form 1095-A from the Marketplace with information "
    "about your coverage and any advance payments.",
    8,
)
para(
    "You must attach Form 8962 even if someone else enrolled you, your spouse, "
    "or your dependent. If you are a dependent who is claimed on someone "
    "else’s 2025 return, you do not have to attach Form 8962.",
    8,
)

heading("Exception for certain children under age 19 or full-time students", 8, 4)
link_para(
    "If certain conditions apply, you can elect to include on your return the "
    "income of a child who was under age 19 at the end of 2025 or was a "
    "full-time student under age 24 at the end of 2025. To do so, use Form 8814. "
    "If you make this election, your child doesn’t have to file a return. "
    "For details, use ",
    "Tax Topic 553",
    TC553,
    " or see Form 8814.",
    8,
)
para(
    "A child born on January 1, 2002, is considered to be age 24 at the end of "
    "2025. Do not use Form 8814 for such a child.",
    8,
)

heading("Resident aliens", 8, 4)
para(
    "These rules also apply if you were a resident alien. Also, you may qualify "
    "for certain tax treaty benefits. Generally, you are a resident alien if you "
    "meet either the green card test or the substantial presence test for 2025. "
    "See Pub. 519 for details.",
    8,
)

heading("Nonresident aliens and dual-status aliens", 8, 4)
para(
    "These rules also apply if you were a nonresident alien or a dual-status "
    "alien and both of the following apply.",
    8,
)
bullets(
    [
        "You were married to a U.S. citizen or resident alien at the end of 2025.",
        "You elected to be taxed as a resident alien.",
    ],
    8,
)
xref = "Nonresident aliens and dual-status aliens"
para("For more information, see " + xref + ", later, and Pub. 519.", 8, runs=[
    {"text": "For more information, see ", "style": "normal"},
    {"text": xref, "style": "emphasis"},
    {"text": ", later, and Pub. 519.", "style": "normal"},
])
callout(
    "Caution.",
    "Specific rules apply to determine if you are a resident alien, nonresident "
    "alien, or dual-status alien. Most nonresident aliens and dual-status aliens "
    "have different filing requirements and may have to file Form 1040-NR. "
    "Pub. 519 discusses these requirements and other information to help aliens "
    "comply with U.S. tax law.",
    8,
)

heading("When and Where Should You File?", 8, 3)
penalties = "Interest and Penalties"
file_by = (
    "File Form 1040 or 1040-SR by April 15, 2026. If you file after this date, "
    "you may have to pay interest and penalties. See "
)
para(file_by + penalties + ", later.", 8, runs=[
    {"text": file_by, "style": "normal"},
    {"text": penalties, "style": "emphasis"},
    {"text": ", later.", "style": "normal"},
])
para(
    "If you were serving in, or in support of, the U.S. Armed Forces in a "
    "designated combat zone or contingency operation, you may be able to file "
    "later. See Pub. 3 for details.",
    8,
)
para(
    "If you e-file your return, there is no need to mail it. However, if you "
    "choose to mail it instead, filing instructions and addresses are at the end "
    "of these instructions.",
    8,
)
tip_chart_head = (
    "The chart at the end of these instructions provides the current address for "
    "mailing your return. Use these addresses for Form 1040 or 1040-SR filed in "
    "2026. The address for returns filed after 2026 may be different. See "
)
tip_chart = tip_chart_head + "IRS.gov/Form1040" + " for any updates."
para("Tip. " + tip_chart, 8, runs=[
    {"text": "Tip.", "style": "strong"},
    {"text": " " + tip_chart_head, "style": "normal"},
    {"text": "IRS.gov/Form1040", "style": "normal", "href": FORM1040},
    {"text": " for any updates.", "style": "normal"},
])

heading("What if You Can’t File on Time?", 8, 4)
para(
    "You can get an automatic 6-month extension if, no later than the date your "
    "return is due, you file Form 4868. If you want to apply for an extension "
    "electronically, see Form 4868 for details.",
    8,
)
callout(
    "Caution.",
    "An automatic 6-month extension to file doesn’t extend the time to pay "
    "your tax. If you don’t pay your tax by the original due date of your "
    "return, you will owe interest on the unpaid tax and may owe penalties. See "
    "Form 4868.",
    8,
)
para(
    "If you are a U.S. citizen or resident alien, you may qualify for an "
    "automatic extension of time to file without filing Form 4868. You qualify "
    "if, on the due date of your return, you meet one of the following "
    "conditions.",
    8,
)
bullets(
    [
        "You live outside the United States and Puerto Rico and your main place "
        "of business or post of duty is outside the United States and Puerto Rico.",
        "You are in military or naval service on duty outside the United States "
        "and Puerto Rico.",
    ],
    8,
)
# This paragraph runs across the 8-9 page break; both pages are in this tranche.
para(
    "This extension gives you an extra 2 months to file and pay the tax, but "
    "interest will be charged from the original due date of the return on any "
    "unpaid tax. You must include a statement showing that you meet the "
    "requirements. If you are still unable to file your return by the end of the "
    "2-month period, you can get an additional 4 months if, no later than "
    "June 15, 2026, you file Form 4868. This 4-month extension of time to file "
    "doesn’t extend the time to pay your tax. See Form 4868.",
    8,
)

# ── page 9 ───────────────────────────────────────────────────────────────────
heading("Private Delivery Services", 9, 4)
para(
    "If you choose to mail your return, you can use certain private delivery "
    "services designated by the IRS to meet the “timely mailing treated as "
    "timely filing/paying” rule for tax returns and payments. These private "
    "delivery services include only the following.",
    9,
)
bullets(
    [
        "DHL Express 9:00, DHL Express 10:30, DHL Express 12:00, DHL Express "
        "Worldwide, DHL Express Envelope, DHL Import Express 10:30, DHL Import "
        "Express 12:00, and DHL Import Express Worldwide.",
        "UPS Next Day Air Early A.M., UPS Next Day Air, UPS Next Day Air Saver, "
        "UPS 2nd Day Air, UPS 2nd Day Air A.M., UPS Worldwide Express Plus, and "
        "UPS Worldwide Express.",
        "FedEx First Overnight, FedEx Priority Overnight, FedEx Standard "
        "Overnight, FedEx 2 Day, FedEx International Next Flight Out, FedEx "
        "International Priority, FedEx International First, and FedEx "
        "International Economy.",
    ],
    9,
)
pds_head = "To check for any updates to the list of designated private delivery services, go to "
pds_mid = (
    ". For the IRS mailing address to use if you’re using a private delivery "
    "service, go to "
)
pds_text = pds_head + "IRS.gov/PDS" + pds_mid + "IRS.gov/PDSStreetAddresses" + "."
para(pds_text, 9, runs=[
    {"text": pds_head, "style": "normal"},
    {"text": "IRS.gov/PDS", "style": "normal", "href": PDS},
    {"text": pds_mid, "style": "normal"},
    {"text": "IRS.gov/PDSStreetAddresses", "style": "normal", "href": PDS_ADDR},
    {"text": ".", "style": "normal"},
])
para(
    "The private delivery service can tell you how to get written proof of the "
    "mailing date.",
    9,
)
callout(
    "Caution.",
    "Only the U.S. Postal Service can deliver to P.O. boxes. You can’t use a "
    "private delivery service to make tax payments required to be sent to a "
    "P.O. box.",
    9,
)

heading("Chart A—For Most People", 9, 3)
table(
    "Chart A—For Most People: gross income at which you must file, by filing "
    "status and age at the end of 2025",
    [
        "IF your filing status is . . .",
        "AND at the end of 2025 you were* . . .",
        "THEN file a return if your gross income** was at least . . .",
    ],
    [
        ["Single", "under 65", "$15,750"],
        ["Single", "65 or older", "17,750"],
        ["Married filing jointly***", "under 65 (both spouses)", "$31,500"],
        ["Married filing jointly***", "65 or older (one spouse)", "33,100"],
        ["Married filing jointly***", "65 or older (both spouses)", "34,700"],
        ["Married filing separately", "any age", "$5"],
        ["Head of household", "under 65", "$23,625"],
        ["Head of household", "65 or older", "25,625"],
        ["Qualifying surviving spouse", "under 65", "$31,500"],
        ["Qualifying surviving spouse", "65 or older", "33,100"],
    ],
    9,
)
para(
    "*If you were born on January 1, 1961, you are considered to be age 65 at "
    "the end of 2025. (If your spouse died in 2025 or if you are preparing a "
    "return for someone who died in 2025, see Pub. 501.)",
    9,
)
gross_note_tail = (
    " means all income you received in the form of money, goods, property, and "
    "services that isn’t exempt from tax, including any income from sources "
    "outside the United States or from the sale of your main home (even if you "
    "can exclude part or all of it). Don’t include any social security "
    "benefits unless (a) you are married filing a separate return and you lived "
    "with your spouse at any time in 2025, or (b) one-half of your social "
    "security benefits plus your other gross income and any tax-exempt interest "
    "is more than $25,000 ($32,000 if married filing jointly). If (a) or (b) "
    "applies, see the instructions for lines 6a and 6b to figure the taxable "
    "part of social security benefits you must include in gross income. Gross "
    "income includes gains, but not losses, reported on Form 8949 or "
    "Schedule D. Gross income from a business means, for example, the amount on "
    "Schedule C, line 7, or Schedule F, line 9. But, in figuring gross income, "
    "don’t reduce your income by any losses, including any loss on "
    "Schedule C, line 7, or Schedule F, line 9."
)
para("**Gross income" + gross_note_tail, 9, runs=[
    {"text": "**Gross income", "style": "strong"},
    {"text": gross_note_tail, "style": "normal"},
])
para(
    "***If you didn’t live with your spouse at the end of 2025 (or on the "
    "date your spouse died) and your gross income was at least $5, you must file "
    "a return regardless of your age.",
    9,
)

# ── page 10: Chart B ─────────────────────────────────────────────────────────
chart_b_title = "Chart B—For Children and Other Dependents"
heading(chart_b_title, 10, 3)
see_who = "Who Qualifies as Your Dependent"
para("(See " + see_who + ", later.)", 10, runs=[
    {"text": "(See ", "style": "normal"},
    {"text": see_who, "style": "emphasis"},
    {"text": ", later.)", "style": "normal"},
])
para(
    "If your parent (or someone else) can claim you as a dependent, use this "
    "chart to see if you must file a return.",
    10,
)
defs_a = "In this chart, "
defs_b = (
    " includes taxable interest, ordinary dividends, and capital gain "
    "distributions. It also includes unemployment compensation, taxable social "
    "security benefits, pensions, annuities, and distributions of unearned "
    "income from a trust. "
)
defs_c = (
    " includes salaries, wages, tips, professional fees, and taxable scholarship "
    "and fellowship grants. "
)
defs_d = " is the total of your unearned and earned income."
defs_text = defs_a + "unearned income" + defs_b + "Earned income" + defs_c + "Gross income" + defs_d
para(defs_text, 10, runs=[
    {"text": defs_a, "style": "normal"},
    {"text": "unearned income", "style": "strong"},
    {"text": defs_b, "style": "normal"},
    {"text": "Earned income", "style": "strong"},
    {"text": defs_c, "style": "normal"},
    {"text": "Gross income", "style": "strong"},
    {"text": defs_d, "style": "normal"},
])

APPLY = " You must file a return if any of the following apply."


def branch(answer, items, page):
    text = answer + APPLY
    para(text, page, runs=[
        {"text": answer, "style": "strong"},
        {"text": APPLY, "style": "normal"},
    ])
    bullets(items, page)


heading("Single dependents", 10, 4)
para("Were you either age 65 or older or blind?", 10)
branch("No.", [
    "Your unearned income was over $1,350.",
    "Your earned income was over $15,750.",
    "Your gross income was more than the larger of— $1,350, or your earned "
    "income (up to $15,300) plus $450.",
], 10)
branch("Yes.", [
    "Your unearned income was over $3,350 ($5,350 if 65 or older and blind).",
    "Your earned income was over $17,750 ($19,750 if 65 or older and blind).",
    "Your gross income was more than the larger of— $3,350 ($5,350 if 65 or "
    "older and blind), or your earned income (up to $15,300) plus $2,450 "
    "($4,450 if 65 or older and blind).",
], 10)

heading("Married dependents", 10, 4)
para("Were you either age 65 or older or blind?", 10)
branch("No.", [
    "Your unearned income was over $1,350.",
    "Your earned income was over $15,750.",
    "Your gross income was at least $5 and your spouse files a separate return "
    "and itemizes deductions.",
    "Your gross income was more than the larger of— $1,350, or your earned "
    "income (up to $15,300) plus $450.",
], 10)
branch("Yes.", [
    "Your unearned income was over $2,950 ($4,550 if 65 or older and blind).",
    "Your earned income was over $17,350 ($18,950 if 65 or older and blind).",
    "Your gross income was at least $5 and your spouse files a separate return "
    "and itemizes deductions.",
    "Your gross income was more than the larger of— $2,950 ($4,550 if 65 or "
    "older and blind), or your earned income (up to $15,300) plus $2,050 "
    "($3,650 if 65 or older and blind).",
], 10)

# ── page 11: Chart C ─────────────────────────────────────────────────────────
heading("Chart C—Other Situations When You Must File", 11, 3)
para("You must file a return if any of the conditions below apply for 2025.", 11)
bullets(
    [
        "You owe any special taxes, including any of the following (see the "
        "instructions for Schedule 2). a. Alternative minimum tax. b. Additional "
        "tax on a qualified plan, including an individual retirement arrangement "
        "(IRA), or other tax-favored account. c. Household employment taxes. "
        "d. Social security and Medicare tax on tips you didn’t report to "
        "your employer or on wages you received from an employer who "
        "didn’t withhold these taxes. e. Uncollected social security and "
        "Medicare or RRTA tax on tips you reported to your employer or on "
        "group-term life insurance and additional taxes on health savings "
        "accounts. f. Recapture taxes.",
        "You (or your spouse if filing jointly) received health savings account, "
        "Archer MSA, or Medicare Advantage MSA distributions.",
        "You had net earnings from self-employment of at least $400.",
        "You had wages of $108.28 or more from a church or qualified "
        "church-controlled organization that is exempt from employer social "
        "security and Medicare taxes.",
        "Advance payments of the premium tax credit were made for you, your "
        "spouse, or a dependent who enrolled in coverage through the "
        "Marketplace. You or whoever enrolled you should have received Form(s) "
        "1095-A showing the amount of the advance payments.",
        "You are required to include amounts in income under section 965 or you "
        "have a net tax liability under section 965 that you are paying in "
        "installments under section 965(h) or deferred by making an election "
        "under section 965(i).",
        "You purchased a new or used clean vehicle from a registered dealer and "
        "reduced the amount you paid at the time of sale by transferring the "
        "credit to the dealer. See Form 8936 and Schedule A (Form 8936).",
    ],
    11,
    ordered=True,
)

review_notes = [
    "TRANCHE 3 OF A MULTI-SESSION REBUILD. This plan covers printed pages 8-11 "
    "(“Filing Requirements” and Charts A, B, and C) of a 126-page "
    "document. It carries no document title by design: only tranche 1 does, so "
    "this file validates through merge-plans rather than standalone. No partial "
    "rebuild is delivered.",
    "PAGE 9 READING ORDER REBUILT FROM THE PAGE IMAGE. Page 9 sets three "
    "columns of prose above a full-width chart. The column detector reports it "
    "as a single column — the chart’s full-width rows fill the gutters it "
    "looks for — so the extracted text interleaves the three columns "
    "(“still unable to file your return by the end press Worldwide, DHL "
    "Express Enve- to IRS.gov/PDS.”). That section’s reading order was "
    "reconstructed from the rendered page instead. Recorded as an engine "
    "finding for a later round; it does not affect the other three pages, which "
    "the detector reads correctly.",
    "TIP AND CAUTION CALLOUTS. Five margin callouts are drawn as an icon plus "
    "italic text, and the words “TIP” and “CAUTION” are real "
    "text in the content stream, so they land mid-sentence in any extraction. "
    "Each is authored as a paragraph beginning with a strong "
    "“Tip.”/“Caution.” and the interrupted sentence restored "
    "around it. The label is kept because the icon alone conveys nothing to a "
    "screen reader; it is set in sentence case rather than the printed all-caps "
    "so it is not read out letter by letter. The decorative “!” glyph "
    "inside the caution icon is dropped.",
    "CHART A FLATTENED. In print, one filing status cell spans two or three age "
    "rows. An accessible data table cannot carry that rowspan here, so the "
    "chart is flattened to ten rows with the filing status repeated on each. "
    "Cell values are kept exactly as printed, including the continuation "
    "amounts that omit the dollar sign in the source (“17,750” under "
    "“$15,750”). The three footnotes below the chart follow it as "
    "paragraphs.",
    "TABLE CAPTION EXTENDED. Chart A is printed under the bare title "
    "“Chart A—For Most People”, which does not say what the table "
    "holds. The authored caption keeps that title and adds what the columns "
    "actually are (“: gross income at which you must file, by filing "
    "status and age at the end of 2025”), so the table announces itself to "
    "a screen reader without the reader having to scan the header row. This is "
    "the one place in this tranche where wording is ADDED rather than "
    "re-arranged; the printed heading above the table is unchanged.",
    "NESTED SUB-BULLETS FOLDED. The schema’s lists are flat and these charts "
    "nest one level. Chart C keeps its printed “a.” through "
    "“f.” markers verbatim inside item 1, so its enumeration is "
    "unchanged. In Chart B, the two options under “the larger of—” "
    "are joined into their parent sentence; the second option’s leading "
    "capital is lowercased where it now sits mid-sentence "
    "(“Your earned income” → “your earned income”). No "
    "wording is added or dropped.",
    "BOLD LOGICAL OPERATORS NOT MARKED. Chart B bolds the operators "
    "“either”, “and”, “or”, “any”, and "
    "“larger” throughout. These are left unmarked: assistive technology "
    "does not announce bold by default, so marking them would not convey the "
    "logic anyway, and the wording carries it. Defined terms that the chart "
    "introduces (unearned income, Earned income, Gross income) ARE marked, as "
    "is each “No.”/“Yes.” branch label.",
    "HEADING LEVELS FOLLOW THE PRINTED HIERARCHY. The page sets three sizes: "
    "23pt for the section (“Filing Requirements”), 16pt for its major "
    "parts (“Do You Have To File?”, “When and Where Should You "
    "File?”), and 12pt for minor parts (“What if You Can’t "
    "File on Time?”, “Private Delivery Services”). These map to "
    "levels 2, 3, and 4, with the bold run-in item leads also at level 4 under "
    "their level-3 parent. The three charts are set at 12pt like the minor "
    "parts but are standalone references for the whole section, so they are "
    "authored at level 3 rather than being nested under Private Delivery "
    "Services.",
    "SOFT HYPHENS REMOVED. As on pages 6-7, justified type breaks words with "
    "real hyphen glyphs (“Mar-ketplace”, “designa-ted”, "
    "“dual-sta-tus”). Line-break hyphens are closed; genuine compounds "
    "are kept (dual-status, full-time, 1040-NR, group-term, tax-favored, "
    "self-employment, church-controlled).",
    "LINK TARGETS FROM ANNOTATIONS. The five hyperlinks take their URLs from "
    "the PDF’s own Link annotations: Tax Topic 901, Tax Topic 553, and "
    "IRS.gov/Form1040 on page 8; IRS.gov/PDS and IRS.gov/PDSStreetAddresses on "
    "page 9. The last resolves to a long irs.gov/uac/... address, and wraps "
    "across two lines in print, so it appears as two annotation rectangles in "
    "the source and is authored as one link. Pages 10 and 11 have no links.",
    "PAGE FURNITURE OMITTED. The printed page numbers (8-11), the standing "
    "footer on page 11 (“Need more information or forms? Visit "
    "IRS.gov.”), and the invisible production lines every page carries "
    "(“Fileid: … MUST be removed before printing” plus cycle and "
    "date) are dropped as print furniture rather than document content.",
    "PAGE-BREAK SPANNING PARAGRAPH. The extension-of-time paragraph begins on "
    "page 8 (“This extension gives you an extra 2 months…”) and "
    "finishes on page 9. Both pages are inside this tranche, so it is authored "
    "as one paragraph attributed to page 8.",
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
