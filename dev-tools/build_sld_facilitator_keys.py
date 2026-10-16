"""Build form-aligned worked examples and quick keys for fictional SLD cases."""
from pathlib import Path
import importlib.util
import json
import html
import zipfile
import hashlib
from reportlab.platypus import Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'reports/sld-facilitator-keys-2026-10-12'
OUT = ROOT / 'output/sld-facilitator-keys'
spec = importlib.util.spec_from_file_location('handouts', ROOT / 'dev-tools/build_sld_case_handouts.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
h.OUT = OUT
h.STYLES['body'].fontSize = 10
h.STYLES['body'].leading = 14
h.STYLES['small'].fontSize = 9
h.STYLES['small'].leading = 12
h.STYLES['matrix'] = ParagraphStyle('matrix', fontName='Arial', fontSize=9.2, leading=12.4, textColor=h.INK, spaceAfter=3)
DATA = h.DATA
FORM_URL = next(s['url'] for s in DATA['sources'] if s['id'] == 'sld-form')
FORM_SHA = '1e0c42367960f12e5fcb9197c5662342fe9f75b28cb5c0511ca58fc8fd0d72d3'
PAGE_MAP = {'Q1':'2', 'Q2':'3', 'Q3':'4', 'Q4':'5', 'Q5':'5', 'Q6':'5-6', 'Q7':'6', 'Q8':'6', 'Q9':'6'}
SHORT = {
    'alex':['NO*','NO*','a-d NO*','YES*','Narrative','None reported*','YES*','Provisional YES*','Pending; a/b unselected'],
    'alex-general-ed-adequate':['NO*','NO*','a-d NO*','YES*','Narrative','None reported*','YES*','YES*','9b*; counterfactual premise'],
    'jordan':['YES*','Bypassed','a-d bypassed','Bypassed','Bypassed','Bypassed','Bypassed','NO','Not reached'],
    'marisol':['Pending','Planning notes','a-d pending','Planning notes','Planning notes','Not supplied','Not yet verified','Pending','Not reached'],
    'taylor':['NO*','NO*','a-d NO*','YES*','Narrative','None reported*','YES*','YES*','9a*'],
    'samira':['NO','NO','a-d NO','YES','Narrative','None relevant','YES','YES','9a'],
    'avery':['NO*','NO*','a-d NO*','YES*','Narrative','None reported*','YES*','YES*','Pending; a/b unselected'],
}
QUICK_BASIS = {
    'alex': ['Reading achievement, classroom work and response to intervention.', 'Appropriate instruction is an explicit exercise assumption.', 'No primary exclusionary cause is assumed; verify each separately.', 'Converging reading and processing pattern, not a single cutoff.', 'Connect observed reading behavior to academic performance.', 'No relevant findings are reported under the exercise assumption.', 'Appropriateness and qualified administration are stipulated.', 'Working disability finding; full-record verification still matters.', 'The excerpt does not establish whether adapted instruction is necessary.'],
    'alex-general-ed-adequate': ['The same underachievement record as Alex.', 'Appropriate instruction is stipulated.', 'All four primary-cause findings are stipulated NO.', 'The same reading and processing pattern as Alex.', 'Use the documented classroom reading observations.', 'No relevant findings reported under the assumption.', 'Appropriate evaluation is stipulated.', 'Disability existence is separate from instruction needed.', 'Assumed complete review finds general education adequate; weak fluency alone does not show this.'],
    'jordan': ['Achievement is sufficient across all eight areas under the exercise assumption.', 'Q1 YES routes directly to Q8.', 'Not reached on the printed route.', 'Not reached; do not force a processing-score explanation.', 'Not reached on the printed route.', 'Not reached; do not invent a medical finding.', 'Not reached on the printed route.', 'Q1 YES supports NO on this case route.', 'Only Q8 YES leads to Q9; continue appropriate general-education support.'],
    'marisol': ['Current evidence cannot establish sufficient or insufficient achievement fairly.', 'Plan an instruction and language-access review; not a formal finding yet.', 'Determine primary cause without equating multilingualism with disability.', 'Collect interpretable evidence across all four sources.', 'Observe with attention to language demands and access.', 'Medical information was not supplied.', 'Assessment appropriateness and qualifications still need verification.', 'Unresolved evidence is not a NO-SLD determination.', 'Q8 has not established SLD; Q9 is not reached.'],
    'taylor': ['Persistent word-level reading and fluency difficulties.', 'Documented intervention and stipulated appropriate instruction.', 'All four primary-cause findings are stipulated NO.', 'Full-record pattern stipulated; processing measures/composites omitted here.', 'Independent novel-text decoding remains difficult.', 'No relevant findings reported under the assumption.', 'Appropriate full evaluation is stipulated, not independently reproduced.', 'Reevaluation exercise stipulates continued SLD.', 'Adapted instruction remains necessary; access supports do not replace it.'],
    'samira': ['Eight-area achievement and connected-text records.', 'Dated methods, qualified delivery, fidelity and access records.', 'Separate sensory/motor, cognitive/adaptive, emotional and context evidence.', 'Four evidence streams, including named processing measures and composites.', 'Dated regular-classroom observations with independent/support conditions.', 'Dated health review and screening results.', 'Measure-specific administration, qualifications and interpretation limits.', 'Integrate the supplied sources; no single score defines SLD.', 'Instructional comparison, retention and transfer establish necessity separately.'],
    'avery': ['Math calculation and problem-solving concerns converge across sources.', 'Instruction/opportunity history must be considered, not ignored.', 'All four primary-cause findings are stipulated NO.', 'Pattern stipulated; named processing measures/composites still absent.', 'Link observed math strategies to independent performance.', 'No relevant findings reported under the assumption.', 'Appropriate full evaluation is stipulated.', 'Math SLD is stipulated for this instruction-need exercise.', 'Continuity and response evidence do not yet resolve adapted instruction versus general education.'],
}

def load_keys():
    entries = []
    for name in ('keys-a.json', 'keys-b.json'):
        value = json.loads((REPORT / name).read_text(encoding='utf-8'))
        entries.extend(value if isinstance(value, list) else value['cases'])
    by_id = {k['caseId']: k for k in entries}
    by_id['samira'] = json.loads((ROOT / 'dev-tools/samira_complete_key.json').read_text(encoding='utf-8'))
    entries = list(by_id.values())
    assert set(by_id) == {c['id'] for c in DATA['cases']}
    for key in entries:
        assert [s['id'] for s in key['sections']] == ['Q' + str(i) for i in range(1, 10)]
        q3, q4 = key['sections'][2], key['sections'][3]
        assert len(q3['parts']) == 4 and len(q4['parts']) == 4
        assert all(p.get('strengths') and p.get('weaknesses') for p in q4['parts'])
    return [by_id[c['id']] for c in DATA['cases']]

def intro():
    story = [h.p('SLD facilitator answer keys', 'title'),
        h.p('Seven fictional cases with a quick reference and a worked example for every form field. Use each example beside the official Maine form and the matching participant record.'),
        h.p('How to interpret the examples', 'heading'),
        h.p('Entries are model language for training, not signed official eligibility records. An asterisk marks an explicit full-record assumption or provisional interpretation in cases with selected source summaries. Samira supplies fictional source evidence for every decision. Pending entries leave official boxes unselected; they are not additional official options.'),
        h.p('Jordan follows Q1 YES directly to Q8 NO. Marisol remains unresolved at Q1. Alex and Avery leave Q9 pending. Alex B models 9b under an explicit exercise assumption. Taylor models 9a under a complete-reevaluation assumption. Samira models 9a using the supplied source summaries S1-S9.'),
        h.p('Exact form structure', 'heading'),
        h.p('Q1 identifies affected academic areas and supplies verification. Q3 needs four separate answers and verification statements. Q4 needs strengths and weaknesses for each of four sources, including standardized psychological-processing documentation. Q5 and Q6 are narratives. Q7 requests assessment-specific verification if NO, without a printed automatic stopping branch. Q8 and Q9 are separate decisions; Q9 needs a supporting summary.'),
        h.p('Norm-group condition at Q1', 'heading'),
        h.p('The form gives a specific instruction when cultural or linguistic background places a child outside an achievement test\'s norm group: consider age/grade equivalents instead of standardized scores and use work samples and other performance data in a multi-tiered problem-solving approach. Do not apply this to every multilingual learner, invent equivalent scores, or treat a change of score format as validation. Any assessment still needs an appropriate basis for interpretation.'),
        h.p('Reference and version', 'heading'),
        h.p('Checked October 12, 2026 against the live official seven-page PDF. The posted filename is dated August 13, 2026; the checklist states Updated 6/10/2026, with form effective dates of 7/1/2024 on page 1 and 10/25/2023 on later pages. Page references below refer to that PDF.', 'small'),
        h.link('Open the official Maine SLD form and checklist', FORM_URL),
        h.p('The case narratives, scores and histories are fictional practice information, not a required evaluation battery or a substitute for qualified team judgment. No separate adverse-effect form is required for SLD.', 'small')]
    return story

def demographics(case):
    if case['id'] == h.COMPLETE_RECORD['caseId']:
        return h.table([['Official header field', 'Fictional training entry']] + h.COMPLETE_RECORD['headerRows'], [178, 338])
    name = 'Alex' if case['id'].startswith('alex') else case['id'].capitalize()
    fields = [
        ['Child\'s name', name + ' (fictional training case; full legal name not supplied)'],
        ['Grade', str(case['grade'])],
        ['Date of meeting; dates on pages 2-7', 'Not supplied. Workshop date is not an evaluation meeting date.'],
        ['Date of birth', 'Not supplied. Do not derive it from the approximate age.'],
        ['SAU; school; school phone', 'Not supplied in this fictional case.'],
        ['Parent/guardian name', 'Not supplied; family perspectives are included in the narrative.'],
        ['Parent/guardian address; city, state, ZIP', 'Not supplied in this fictional case.'],
        ['School address; city, state, ZIP; school contact', 'Not supplied in this fictional case.'],
    ]
    return h.table([['Official header field', 'Model training entry']] + fields, [207, 309])


def checklist(case):
    if case['id'] == h.COMPLETE_RECORD['caseId']:
        return h.table([
            ['Page 1 review item', 'Model practice completion'],
            ['Variety of sources / information for YES and NO', 'Cite the supplied source IDs and findings; do not rely on score cutoffs.'],
            ['Correct boxes / summaries', 'Follow Q1-Q9; complete Q3 separately, all eight Q4 cells, Q5/Q6 and Q9 summary.'],
            ['Written Notice / clinical guidance', 'In actual practice, document the discussion and decision in Written Notice using the current official checklist. This exercise does not simulate issuing notice or certify compliance.'],
        ], [190, 326])
    return h.table([
        ['Page 1 review item', 'Training status; not a compliance certification'],
        ['Variety of sources', 'Sources and gaps identified below; verify the full record.'],
        ['Information for YES/NO', 'Model verification supplied; missing records remain explicit.'],
        ['Correct question boxes', 'Route shown; bypassed and unresolved boxes left unselected.'],
        ['Summaries and explanations', 'Worked entries and rationales below; pending findings not finalized.'],
        ['Written Notice', 'Discussion/completion should be documented; no actual notice issued here.'],
        ['2017 Clinical Guidance', 'Checklist reference noted; actual team use is not documented in the case.'],
    ], [190, 326])

def quick_page(case, key):
    story = [h.p(h.case_label(case) + ' quick key', 'title'), h.p(key['summary']),
        h.p('Form route', 'heading'), h.p(key['routeSummary']),
        h.table([['Q', 'Example selection', 'Basis or limit']] + [[s['id'], SHORT[case['id']][i], QUICK_BASIS[case['id']][i]] for i, s in enumerate(key['sections'])], [35, 129, 352]),
        h.p('Samira: cite sources S1-S9 when explaining each finding. This model uses fictional practice information and is not an actual eligibility decision.' if case['id'] == 'samira' else '* Assumption-dependent or provisional training response. See the worked entries for source details and missing verification. Pending is not an official form checkbox.', 'small')]
    if case['id'] in h.RECORD_REVIEW['cases']:
        story.append(h.p('STAGE 2 ONLY: these selections rehearse supplied premises. Stage 1 audits the excerpts and accepts unresolved findings; no new evidence is released in Stage 2. See the record-review scenario before using this key.', 'small'))
    return story

def render_part(part):
    story = [h.p(part['label'], 'heading'), h.p(part.get('entry', ''))]
    if part.get('rationale'):
        story.append(h.p('Why: ' + part['rationale'], 'small'))
    return [KeepTogether(story)]

def render_section(section, compact_labels=False, compact_q1=False):
    q = section['id']
    story = [h.p(q + ' ' + next(s['label'].split(': ', 1)[1] for s in DATA['formSteps'] if s['id'] == q), 'heading'),
        h.p('Official form page ' + PAGE_MAP[q] + ' | ' + section['selection'], 'small'),
        h.p('Example entry: ' + section['entry']), h.p('Why: ' + section['rationale'], 'small')]
    if compact_labels and q == 'Q4':
        story.pop(0)
    if q == 'Q1':
        story.append(h.p('Conditional norm-group instruction: when cultural/linguistic background places the child outside an achievement test norm group, the form directs consideration of age/grade equivalents rather than standardized scores and multi-tiered work/performance evidence. Do not generalize this to every multilingual learner or invent equivalent scores; score conversion cannot make an unsuitable assessment valid.', 'small'))
    if q == 'Q7':
        story.append(h.p('IF NO verification: identify each affected assessment and explain why it is not valid/reliable or was not performed by a qualified individual. The printed form has no automatic Q7 stop or skip branch. Resolve interpretation concerns before relying on affected findings.', 'small'))
    if q == 'Q9':
        story += [h.p('Official choices: a. the child requires special education and related services. b. it can be adequately addressed through general education interventions and/or accommodations.', 'small'),
            h.p('Under the form, 9(a) means the child qualifies as a child with SLD under MUSER; 9(b) means the child does not qualify under that category. The example entry above is the required supporting Summary. Pending is not a third checkbox.', 'small')]
    if section.get('evidence'):
        story.append(h.p('Record sources: ' + '; '.join(section['evidence']), 'small'))
    if q == 'Q4':
        matrix = [[h.p('Evidence source', 'headcell'), h.p('Verification of strengths', 'headcell'), h.p('Verification of weaknesses', 'headcell')]]
        row_labels = ['Q4a. Intervention response', 'Q4b. Classroom performance', 'Q4c. Achievement assessments', 'Q4d. Psychological processing']
        for label, part in zip(row_labels, section['parts']):
            matrix.append([h.p(label, 'matrix'), h.p(part['strengths'], 'matrix'), h.p(part['weaknesses'], 'matrix')])
        t = Table(matrix, colWidths=[100, 208, 208], repeatRows=1, hAlign='LEFT')
        t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), .5, h.RULE), ('BACKGROUND', (0, 0), (-1, 0), h.INK), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, h.PALE]), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
        if compact_labels:
            t.setStyle(TableStyle([('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
        story.append(t)
        for part in section['parts']:
            if part.get('rationale'):
                label = part['label'].split('.', 1)[0] if compact_labels else part['label']
                story.append(h.p(label + ' interpretation: ' + part['rationale'], 'small'))
    elif q == 'Q1' and section.get('parts'):
        academic_table = h.table([['Academic area', 'Example verification', 'Rationale or limit']] +
            [[part['label'], part['entry'], part['rationale']] for part in section['parts']], [99, 218, 199], 'inventory' if compact_q1 else 'cell')
        if compact_q1:
            academic_table.setStyle(TableStyle([('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
        story.append(academic_table)
    else:
        for part in section.get('parts', []):
            story += render_part(part)
    return story

def case_story(case, key):
    story = quick_page(case, key)
    story += [PageBreak(), h.p(h.case_label(case) + ' worked form', 'title'),
        h.p('Header and repeated identifiers', 'heading'), demographics(case),
        h.p('Whole-form checklist', 'heading'), checklist(case),
        h.p('Use Samira\'s supplied fictional identifiers and source findings to complete the practice form. Leave actual signatures unsigned; this exercise does not certify compliance.' if case['id'] == 'samira' else 'Use only the supplied case information and stated exercise assumptions. Leave unavailable identifiers and actual signatures blank. Unresolved findings are not final eligibility decisions, and this exercise does not certify compliance.', 'small')]
    if case['id'] in h.RECORD_REVIEW['cases']:
        story += [PageBreak()] + h.record_review(case, facilitator=True)
    bypass = case['id'] == 'jordan'
    story += [PageBreak(), h.p('Q1 achievement verification' if bypass else 'Q1 and Q2 verification', 'title')]
    if case['id'] in h.RECORD_REVIEW['cases']:
        story.append(h.p('STAGE 2: all selections and verification examples below rely on supplied full-record premises. They do not independently substantiate the absent records or finalize an actual eligibility report.', 'small'))
    for s in key['sections'][:1 if bypass else 2]:
        story += render_section(s, compact_q1=bypass)
    story += [PageBreak(), h.p('Q2 and Q3 bypassed on this route' if bypass else 'Q3 separate determinations', 'title')]
    if bypass:
        story += render_section(key['sections'][1])
    story += render_section(key['sections'][2])
    story += [PageBreak(), h.p('Q4 strengths and weaknesses', 'title')]
    story += render_section(key['sections'][3], compact_labels=case['id'] == 'samira')
    story += [PageBreak(), h.p('Q5 to Q7 findings and validity', 'title')]
    for s in key['sections'][4:7]:
        story += render_section(s)
    story += [PageBreak(), h.p('Q8 and Q9 conclusions', 'title')]
    for s in key['sections'][7:]:
        story += render_section(s)
    story += [h.p('Certification and follow-through', 'heading'),
        h.p('Official form page 7: agreement/disagreement signatures must reflect each member\'s own conclusion. For Samira, use the supplied fictional roster to enter printed names and titles in a practice form; participants may record their own role-play agreement or dissent, never imitate another person\'s signature. In actual practice every team member certifies a conclusion; dissenting members submit a separate statement.' if case['id'] == 'samira' else 'Official form page 7: leave agreement/disagreement signatures, printed names and titles blank because a team roster is not supplied for this practice case. In an actual completed report, every team member certifies agreement or disagreement; dissenting members submit a separate statement. Discuss the required certification and Written Notice steps without recording them as completed.', 'small'),
        h.p('The checklist identifies documentation of the discussion and form completion in Written Notice as best practice. Any unresolved example remains a planning record, with timely evaluation and needed supports continuing.', 'small')]
    story += [PageBreak(), h.p('Facilitator discussion and case review', 'title'), h.p('Family explanation', 'heading'), h.p(key['familyExample'])]
    story.append(h.p('Next evidence or action', 'heading'))
    story += [h.p(item) for item in key.get('followUp', [])]
    story.append(h.p('Facilitation notes and interpretation limits', 'heading'))
    story += [h.p(item, 'small') for item in key.get('qualityNotes', [])]
    edition = 'Samira PDF record edition ' + h.COMPLETE_RECORD['version'] if case['id'] == 'samira' else 'Source case version ' + DATA['metadata']['version']
    story += [h.link('Official Maine form and checklist', FORM_URL), h.p(edition + ' | Reviewed October 12, 2026 | Facilitator only', 'small')]
    return story

def build():
    OUT.mkdir(parents=True, exist_ok=True)
    keys = load_keys()
    manifest = {'dataVersion': DATA['metadata']['version'], 'caseDataSha256': hashlib.sha256((ROOT / 'maine_sld_case_data.json').read_bytes()).hexdigest(), 'recordReviewSha256': hashlib.sha256((ROOT / 'dev-tools/sld_case_record_review.json').read_bytes()).hexdigest(), 'samiraRecordSha256': hashlib.sha256((ROOT / 'dev-tools/samira_complete_record.json').read_bytes()).hexdigest(), 'samiraKeySha256': hashlib.sha256((ROOT / 'dev-tools/samira_complete_key.json').read_bytes()).hexdigest(), 'officialFormSha256': FORM_SHA, 'cases': []}
    for case, key in zip(DATA['cases'], keys):
        path = h.build_pdf(case['id'] + '-facilitator-key.pdf', case_story(case, key), h.case_label(case) + ' facilitator key')
        manifest['cases'].append({'id': case['id'], 'file': path.name, 'pages': len(PdfReader(path).pages)})
    story = intro()
    for case, key in zip(DATA['cases'], keys):
        story += [PageBreak()] + case_story(case, key)
    combined = h.build_pdf('SLD-Facilitator-Worked-Answer-Keys.pdf', story, 'Facilitator worked examples')
    manifest['combinedPages'] = len(PdfReader(combined).pages)
    quick_story = []
    for case, key in zip(DATA['cases'], keys):
        if quick_story:
            quick_story.append(PageBreak())
        quick_story += quick_page(case, key)
    quick = h.build_pdf('SLD-Facilitator-Quick-Reference.pdf', quick_story, 'Facilitator quick reference')
    manifest['quickReferencePages'] = len(PdfReader(quick).pages)
    assert manifest['quickReferencePages'] == len(keys)
    (OUT / 'worked-keys.json').write_text(json.dumps({'metadata': manifest, 'cases': keys}, ensure_ascii=False, indent=2), encoding='utf-8')
    cards = ''.join('<li><a href="' + item['file'] + '">' + html.escape(h.case_label(case)) + '</a> - ' + html.escape(key['routeSummary']) + '</li>' for case, key, item in zip(DATA['cases'], keys, manifest['cases']))
    page = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SLD facilitator answer keys</title><style>body{max-width:900px;margin:32px auto;padding:0 20px;font:16px/1.6 system-ui;color:#16343b}h1{font-size:28px}a{color:#155b80}li{margin-bottom:18px}a:focus-visible{outline:3px solid #a04b16}</style><main><h1>SLD facilitator answer keys</h1><p>Facilitator only. Each case begins with a quick key, followed by worked form entries, evidence, rationale and documentation limits.</p><p><a href="SLD-Facilitator-Worked-Answer-Keys.pdf">All seven worked answer keys</a></p><ul>' + cards + '</ul><p>Pending is a training disposition, not an official checkbox. All cases are fictional; signatures and absent assessment findings are not invented.</p></main></html>'
    page = page.replace('All cases are fictional; signatures and absent assessment findings are not invented.', 'All cases are fictional. Use the supplied source summaries and stated exercise assumptions. Do not add findings beyond the selected case or imitate signatures.')
    page = page.replace('<ul>', '<p><a href="SLD-Facilitator-Quick-Reference.pdf">Quick reference: one page per case</a></p><ul>', 1)
    (OUT / 'Facilitator-Keys.html').write_text(page, encoding='utf-8')
    with zipfile.ZipFile(OUT / 'SLD-Facilitator-Keys.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for file in [combined, quick, OUT / 'Facilitator-Keys.html'] + [OUT / item['file'] for item in manifest['cases']]:
            z.write(file, file.name)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    build()
