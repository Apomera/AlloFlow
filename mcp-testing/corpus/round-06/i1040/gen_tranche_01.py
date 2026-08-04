# Tranche 1 (pages 1-5) of the 2025 IRS Form 1040 instructions - session 1 of
# the long-document protocol. Authored from the per-page structure digest
# (page_outline.cjs), the content-stream page texts, and page-3 geometry for
# IF/THEN table pairing. Verbatim wording follows the pdf.js item text where
# the content-stream decode loses fi-ligatures ("qualified", "file").
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SRC = ROOT / 'mcp-testing/corpus/born-digital/irs-i1040-instructions.pdf'
sha = hashlib.sha256(SRC.read_bytes()).hexdigest()

DOC = {
    'title': '2025 Instructions for Form 1040 (and 1040-SR)',
    'language': 'en',
    'source_page_count': 126,
    'source_sha256': sha,
    'document_type': 'booklet',
    'subject': 'Internal Revenue Service instructions for the 2025 Form 1040 and Form 1040-SR, including the instructions for Schedules 1 through 3.',
    'variant': 'original',
}

B = []
def h(level, text, page): B.append({'type': 'heading', 'level': level, 'text': text, 'source_page': page})
def p(text, page): B.append({'type': 'paragraph', 'text': text, 'source_page': page})
def ul(items, page): B.append({'type': 'list', 'ordered': False, 'items': items, 'source_page': page})

# ── page 1: cover ──
h(1, '2025 Instructions for Form 1040 (and 1040-SR)', 1)
p('TAX YEAR 2025. Including the instructions for Schedules 1 through 3.', 1)
h(2, '2025 Changes', 1)
p('See What’s New in these instructions.', 1)
h(2, 'Future Developments', 1)
p('See IRS.gov and IRS.gov/Forms, and for the latest information about developments related to Forms 1040 and 1040-SR and their instructions, such as legislation enacted after they were published, go to IRS.gov/Form1040.', 1)
p('Free File is the fast, safe, and free way to prepare and e-file your taxes. See IRS.gov/FreeFile.', 1)
p('Pay Online. It’s fast, simple, and secure. Go to IRS.gov/Payments.', 1)
p('Instructions for Form 1040 (2025). Catalog Number 24811V. Department of the Treasury, Internal Revenue Service, www.irs.gov. Feb 25, 2026.', 1)

# ── page 2: table of contents ──
h(2, 'Table of Contents', 2)
ul([
    'What’s New — page 6',
    'Filing Requirements — page 8',
    'Filing Requirements: Do You Have To File? — page 8',
    'Filing Requirements: When and Where Should You File? — page 8',
    'Line Instructions for Forms 1040 and 1040-SR — page 12',
    'Line Instructions: Name and Address — page 12',
    'Line Instructions: Social Security Number (SSN) — page 12',
    'Line Instructions: Filing Status — page 13',
    'Line Instructions: Dependents, Qualifying Child for Child Tax Credit, and Credit for Other Dependents — page 17',
    'Line Instructions: Income — page 23',
    'Line Instructions: Total Income and Adjusted Gross Income — page 33',
    'Line Instructions: Tax and Credits — page 33',
    'Line Instructions: Payments — page 39',
    'Line Instructions: Refund — page 61',
    'Line Instructions: Amount You Owe — page 63',
    'Line Instructions: Sign Your Return — page 65',
    'Assemble Your Return — page 67',
    '2025 Tax Table — page 68',
    'General Information — page 81',
    'How To Get Tax Help — page 83',
    'Refund Information — page 87',
    'Instructions for Schedule 1 — page 88',
    'Instructions for Schedule 1-A — page 101',
    'Instructions for Schedule 2 — page 111',
    'Instructions for Schedule 3 — page 115',
    'Tax Topics — page 118',
    'Disclosure, Privacy Act, and Paperwork Reduction Act Notice — page 120',
    'Major Categories of Federal Income and Outlays for Fiscal Year 2024 — page 122',
    'Index — page 123',
], 2)

# ── page 3: helpful hints + IF/THEN schedule guide ──
h(2, 'Form 1040 and 1040-SR Helpful Hints', 3)
p('For 2025, you will use Form 1040 or, if you were born before January 2, 1961, you have the option to use Form 1040-SR.', 3)
p('You may only need to file Form 1040 or 1040-SR and none of the numbered schedules, Schedules 1 through 3. However, if your return is more complicated (for example, you claim certain deductions or credits or owe additional taxes), you will need to complete one or more of the numbered schedules. Below is a general guide to which schedule(s) you will need to file based on your circumstances. See the instructions for the schedules for more information. If you e-file your return, the software you use will generally determine which schedules you need.', 3)
B.append({'type': 'table', 'caption': 'Guide to which numbered schedule to use, by circumstance (IF YOU... / THEN USE...).',
          'columns': ['IF YOU...', 'THEN USE...'], 'row_headers': False, 'rows': [
    ['Have additional income, such as business or farm income or loss, unemployment compensation, or prize or award money.', 'Schedule 1, Part I'],
    ['Have any adjustments to income, such as student loan interest, self-employment tax, or educator expenses.', 'Schedule 1, Part II'],
    ['Can claim a deduction for qualified cash tips, qualified overtime, qualified vehicle loan interest, or the enhanced deduction for seniors.', 'Schedule 1-A'],
    ['Owe alternative minimum tax (AMT) or need to make an excess advance premium tax credit repayment.', 'Schedule 2, Part I'],
    ['Owe other taxes, such as self-employment tax, household employment taxes, additional tax on IRAs or other qualified retirement plans and tax-favored accounts.', 'Schedule 2, Part II'],
    ['Can claim a nonrefundable credit (other than the child tax credit or the credit for other dependents), such as the foreign tax credit, education credits, or general business credit.', 'Schedule 3, Part I'],
    ['Can claim a refundable credit (other than the earned income credit, American opportunity credit, refundable adoption credit, or additional child tax credit), such as the net premium tax credit. Have other payments, such as an amount paid with a request for an extension to file or excess social security tax withheld.', 'Schedule 3, Part II'],
], 'source_page': 3})

# ── page 4: TAS / LITC / TAP ──
h(2, 'The Taxpayer Advocate Service Is Here To Help You', 4)
h(3, 'What is the Taxpayer Advocate Service?', 4)
p('The Taxpayer Advocate Service (TAS) is an independent organization within the Internal Revenue Service (IRS) that helps taxpayers and protects taxpayer rights. TAS strives to ensure that every taxpayer is treated fairly and that you know and understand your rights under the Taxpayer Bill of Rights.', 4)
h(3, 'What can TAS do for you?', 4)
p('TAS can help you if your tax problem is causing a financial difficulty, you’ve tried and been unable to resolve your issue with the IRS, or you believe an IRS system, process, or procedure just isn’t working as it should. And the service is free. If you qualify for TAS assistance, you will be assigned to one advocate who will work with you throughout the process and will do everything possible to resolve your issue. TAS can help you if:', 4)
ul([
    'Your problem is causing a financial difficulty for you, your family, or your business.',
    'You face (or your business is facing) an immediate threat of adverse action.',
    'You’ve tried to contact the IRS but no one has responded, or the IRS hasn’t responded by the date promised.',
], 4)
h(3, 'How can you reach TAS?', 4)
p('TAS has offices in every state, the District of Columbia, and Puerto Rico. To find your advocate’s number:', 4)
ul([
    'Go to TaxpayerAdvocate.IRS.gov/Contact-Us;',
    'Download Publication 1546, Taxpayer Advocate Service Is Your Voice at the IRS. If you do not have Internet access, you can call the IRS toll free at 800-TAX-FORM (800-829-3676) and ask for a copy of Publication 1546;',
    'Check your local directory; or',
    'Call TAS toll free at 877-777-4778.',
], 4)
h(3, 'How can you learn about your taxpayer rights?', 4)
p('The Taxpayer Bill of Rights describes 10 basic rights that all taxpayers have when dealing with the IRS. The TAS website TaxpayerAdvocate.IRS.gov can help you understand what these rights mean to you and how they apply. These are your rights. Know them. Use them.', 4)
h(3, 'How else does TAS help taxpayers?', 4)
p('TAS works to resolve large-scale problems that affect many taxpayers. If you know of one of these broad issues, please report it to TAS at IRS.gov/SAMS. Be sure not to include any personal taxpayer information.', 4)
h(2, 'Low Income Taxpayer Clinics Help Taxpayers', 4)
p('Low Income Taxpayer Clinics (LITCs) are independent from the Internal Revenue Service (IRS) and the Taxpayer Advocate Service (TAS). LITCs represent individuals whose income is below a certain level and who need to resolve tax problems with the IRS. LITCs can represent taxpayers in audits, appeals, and tax collection disputes before the IRS and in court. In addition, LITCs can provide information about taxpayer rights and responsibilities in different languages for individuals who speak English as a second language. Services are offered for free or a small fee. For more information or to find an LITC near you, see the LITC page at TaxpayerAdvocate.IRS.gov/LITCmap or IRS Publication 4134, Low Income Taxpayer Clinic List. This publication is available online at IRS.gov/Forms-Pubs or by calling the IRS toll free at 800-TAX-FORM (800-829-3676).', 4)
h(2, 'Suggestions for Improving the IRS', 4)
h(3, 'Taxpayer Advocacy Panel', 4)
p('Taxpayers have an opportunity to provide direct feedback to the IRS through the Taxpayer Advocacy Panel (TAP). The TAP is a Federal Advisory Committee comprised of an independent panel of citizen volunteers who listen to taxpayers, identify taxpayers’ systemic issues, and make suggestions for improving IRS customer service. Contact TAP at ImproveIRS.org.', 4)

# ── page 5: ACA ──
h(2, 'Affordable Care Act — What You Need To Know', 5)
h(3, 'Requirement To Reconcile Advance Payments of the Premium Tax Credit', 5)
p('The premium tax credit helps pay premiums for health insurance purchased from the Health Insurance Marketplace (the Marketplace). Eligible individuals may have advance payments of the premium tax credit made on their behalf directly to the insurance company.', 5)
p('If you or a family member enrolled in health insurance through the Marketplace and advance payments of the premium tax credit were made to your insurance company to reduce your monthly premium payment, you must attach Form 8962 to your return to reconcile (compare) the advance payments with your premium tax credit for the year.', 5)
p('The Marketplace is required to send Form 1095-A by January 31, 2026, listing the advance payments and other information you need to complete Form 8962.', 5)
B.append({'type': 'list', 'ordered': True, 'items': [
    'You will need Form 1095-A from the Marketplace.',
    'Complete Form 8962 to claim the credit and to reconcile your advance credit payments.',
    'Include Form 8962 with your Form 1040, 1040-SR, or 1040-NR. (Don’t include Form 1095-A.)',
], 'source_page': 5})
h(3, 'Health Coverage Reporting', 5)
p('If you or someone in your family was an employee in 2025, the employer may be required to send you Form 1095-C. Part II of Form 1095-C shows whether your employer offered you health insurance coverage and, if so, information about the offer. You should receive Form 1095-C by early March 2026. This information may be relevant if you purchased health insurance coverage for 2025 through the Marketplace and wish to claim the premium tax credit on Schedule 3, line 9. However, you don’t need to wait to receive this form to file your return. You may rely on other information received from your employer. If you don’t wish to claim the premium tax credit for 2025, you don’t need the information in Part II of Form 1095-C. For more information on who is eligible for the premium tax credit, see the Instructions for Form 8962.', 5)
p('Reminder: Health care coverage. If you need health care coverage, go to www.HealthCare.gov to learn about health insurance options for you and your family, how to buy health insurance, and how you might qualify to get financial assistance to buy health insurance.', 5)

NOTES = [
    'TRANCHE 1 OF A MULTI-SESSION REBUILD. This plan covers printed pages 1-5 of a 126-page document under the long-document protocol (mcp-testing/corpus/round-06/LONG-DOCUMENT-PROTOCOL.md). It is an authoring artifact: no partial rebuild is delivered; remediation and verification run only on the fully merged plan.',
    'TITLE IS SYNTHESISED. The cover sets “1040 (and 1040-SR)”, “INSTRUCTIONS”, and “TAX YEAR 2025” as display typography; the imprint line names the document “Instructions for Form 1040 (2025)”. The title joins these as ‘2025 Instructions for Form 1040 (and 1040-SR)’.',
    'COVER ART NOT REPRODUCED. Page 1 carries a decorative photograph (a compass over a map) and the IRS eagle wordmark. Both are identifying/decorative imagery, described here rather than embedded.',
    'TABLE OF CONTENTS FLATTENED WITH CONTEXT PREFIXES. The printed two-column TOC nests sub-entries by indentation (e.g. ‘Do You Have To File?’ under ‘Filing Requirements’). The plan format has no nested lists, so nested entries carry their parent as a prefix (‘Filing Requirements: Do You Have To File?’). Entries are ordered left column top-to-bottom, then right column, matching print reading order. Dotted leaders are typography and are rendered as ‘— page N’.',
    'PAGE 3 IF/THEN GUIDE REBUILT AS A TABLE FROM GEOMETRY. The schedule guide is a drawn two-column graphic; its text arrives scrambled in the content stream. Row pairings were reconstructed from per-item coordinates (each condition’s y-band paired with the schedule label in the right column at the same band) and each pairing was cross-checked against the visible column positions. The final row combines two printed condition sentences that share the ‘Schedule 3, Part II’ answer cell, as printed.',
    'HIDDEN PRINT-PRODUCTION TEXT OMITTED. Every page carries an invisible print-control line (‘Fileid: ... MUST be removed before printing’ with a cycle/date stamp) in the text layer but not in the rendered page. It is production furniture addressed to the printer, not document content, and is deliberately not reproduced; deterministic recall will honestly count it as uncovered source text.',
    'PAGE FURNITURE DROPPED. Printed page numbers (1-5) are not reproduced as body text.',
    'FI-LIGATURE WORDING VERIFIED. The byte-level extraction loses fi ligatures (‘qualied’, ‘le’); all wording here follows the pdf.js per-item text, which decodes them correctly (‘qualified’, ‘file’).',
    'SOURCE IS THE FEB 25, 2026 REVISION. Catalog Number 24811V; content is time-sensitive tax guidance for tax year 2025 and is reproduced as published, not updated.',
]

plan = {'schema_version': '1.0', 'document': DOC, 'blocks': B, 'review_notes': NOTES}
out = HERE / 'tranche-01-pages-1-5.json'
out.write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding='utf-8', newline='\n')
print(json.dumps({'blocks': len(B), 'out': out.name}))
