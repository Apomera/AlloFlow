"""Assemble the participant and presenter PDF sets without changing the deck."""
from pathlib import Path
import importlib.util
import json
import shutil
import zipfile
import hashlib
from reportlab.platypus import PageBreak
from pypdf import PdfReader
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/sld-pdf-materials'
HANDOUTS = ROOT / 'output/sld-case-handouts'
KEYS = ROOT / 'output/sld-facilitator-keys'
FORM = Path('C:/Users/cabba/Documents/Codex/2026-09-30/p/outputs/Maine_SLD_Workshop_Ready/Reference_Forms/Maine_DOE_SLD_Form_and_Checklist.pdf')
FORM_NAME = 'Maine_DOE_SLD_Form_and_Checklist.pdf'
FORM_SHA = '1e0c42367960f12e5fcb9197c5662342fe9f75b28cb5c0511ca58fc8fd0d72d3'
spec = importlib.util.spec_from_file_location('handouts', ROOT / 'dev-tools/build_sld_case_handouts.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


def participant_guide():
    return [h.p('Start here: participant PDFs', 'title'),
        h.p('Maine SLD case practice | October 12, 2026', 'small'),
        h.p('Choose one case', 'heading'),
        h.p('Open Choose-a-Case.html to compare the seven cases, or open your assigned file ending in -participant.pdf. Each individual PDF contains the case record and fillable worksheet. Keep the chooser and PDFs together after extracting the ZIP.'),
        h.p('Type in the individual PDF', 'heading'),
        h.p('The visible response boxes are interactive. Use a PDF reader that supports forms. Before the activity, type a short test response, save the PDF, close it and reopen it to confirm that your reader preserves the response. Use the individual case PDF for electronic work, not the combined print packet.'),
        h.p('Keep answers readable', 'heading'),
        h.p('Write a concise source, finding and explanation in each box. Use the fillable Continuation notes page for longer answers, beginning each entry with its question or cell label, such as Q3d or Q4b strengths. When a box is full, continue there instead of reducing readability. Review saved pages and print preview so that all intended text is visible; reader behavior can vary.'),
        h.p('Follow the form route', 'heading'),
        h.p('Use the included official Maine SLD form as the reference. It is an unchanged reference PDF, not the interactive worksheet. Complete only the questions reached by your case. Identify skipped questions, exercise assumptions and missing information. Pending is a training status, not an extra official checkbox. Do not invent assessment findings or signatures.'),
        h.p('During the short activity', 'heading'),
        h.p('Identify two relevant findings and one limitation. Explain the applicable form route, the conclusion supported at that point and the next evidence or instruction question. The full worksheet supports extended practice; you do not need to finish every box during a 12-minute discussion.'),
        h.p('Files to keep separate', 'heading'),
        h.p('SLD-Participant-Case-Pack.pdf is a nonfillable printing master containing every case. The presenter answer keys are intentionally not included in this participant package. All cases are fictional training examples, not student records.', 'small')]


def presenter_guide(manifest):
    stories = [h.p('Start here: presenter PDFs', 'title'),
        h.p('Maine SLD case practice | October 12, 2026 | Presenter only', 'small'),
        h.p('The participant worksheets and the case-specific keys are the primary materials. This package does not require AlloFlow or a slide-deck update to conduct the PDF activity.'),
        h.p('What to distribute', 'heading'),
        h.p('Share SLD-Participant-Materials.zip, or distribute each group\'s selected individual case PDF plus the official Maine SLD form. The participant package contains a short start guide, a chooser, seven fillable case packets, an optional nonfillable print master and the unchanged official reference form. Do not distribute this presenter ZIP before participants discuss their reasoning.'),
        h.p('What to keep open', 'heading'),
        h.table([['Presenter document', 'Purpose'],
            ['SLD-Facilitator-Quick-Reference.pdf', 'Seven pages: one quick key for each case. Use while circulating or debriefing.'],
            ['SLD-Facilitator-Worked-Answer-Keys.pdf', 'Detailed model entries, evidence and rationale. Use the page map on the next page.'],
            ['samira-facilitator-key.pdf', 'Samira only: the expanded source record\'s matching worked key.'],
            [FORM_NAME, 'Official form/checklist reference. It is unchanged and not made fillable here.']], [240, 276]),
        h.p('Before participants begin', 'heading'),
        h.p('Ask participants to test typing, saving and reopening their individual PDF. Explain that the visible boxes hold brief answers and that longer responses belong on the fillable Continuation notes page. Check print preview when printing completed work. No PDF/UA or universal viewer compatibility certification is claimed.'),
        h.p('A focused activity within a 45-60 minute session', 'heading'),
        h.p('Advance selection and reading are helpful. For a 12-minute discussion, allow about 3 minutes to identify evidence, 6 minutes to connect it to the form and 3 minutes to share a conclusion or evidence request. Ask for two relevant findings, one limitation, the applicable route and a next step. A complete review of every worksheet field is extended practice, not the short-activity requirement.'),
        h.p('Presenter checks', 'heading'),
        h.p('Samira now includes complete fictional source summaries for Q1-Q9 practice. Other cases retain their stated evidence limits. Ask participants to cite evidence and explain reasoning, not merely match an answer label. Accept uncertainty when the selected case leaves facts unresolved.', 'small'),
        PageBreak(), h.p('Case keys and form safeguards', 'title')]
    labels = {
        'alex': 'Reading evidence; Q8 provisional, Q9 unresolved.',
        'alex-general-ed-adequate': 'Changed premise; Q9b only under the explicit adequacy assumption.',
        'jordan': 'Q1 YES proceeds to Q8 NO; Q2-Q7 bypassed, Q9 not reached.',
        'marisol': 'Multilingual evaluation with missing evidence; Q1/Q8 unresolved.',
        'taylor': 'Reevaluation; Q9a under the complete-record premise.',
        'samira': 'Complete fictional source record; separate evidence supports Q8 YES and Q9a.',
        'avery': 'Mathematics SLD stipulated; Q9 unresolved.',
    }
    rows = [['Case', 'Worked-key pages', 'Discussion emphasis / example route']]
    start = 2
    for item, case in zip(manifest['cases'], h.DATA['cases']):
        end = start + item['pages'] - 1
        rows.append([h.case_label(case), str(start) + '-' + str(end), labels[case['id']]])
        start = end + 1
    stories += [h.table(rows, [117, 88, 311]),
        h.p('Q3 and Q4', 'heading'),
        h.p('Q3 requires four separate primary-cause determinations with verification. Q4 requires strengths and weaknesses across four evidence streams: eight cells. When the excerpt omits psychological-processing measures or composites, name that limitation. Classroom observations and achievement scores do not substitute for that documentation.'),
        h.p('Routing and conclusions', 'heading'),
        h.p('Skipped questions are not NO findings. Q7 asks for assessment-specific verification if NO and has no printed automatic stop branch. Q8 asks whether SLD exists; Q9 separately asks whether the disability requires special education or can be adequately addressed through general education interventions/accommodations. Do not force Q9 when the case has not reached it.'),
        h.p('Multilingual cases', 'heading'),
        h.p('Language history and instructional access require inquiry; multilingual identity alone establishes neither SLD nor an exclusion. Follow the official form\'s conditional norm-group instruction without applying it to every multilingual learner or inventing equivalent scores. Keep appropriate supports and timely evaluation in view.'),
        h.p('How to use the answers', 'heading'),
        h.p('The worked keys model training documentation, not signed eligibility forms. Samira has newly authored, explicitly fictional source data; participants should not invent additional findings. Keep answer keys private until discussion is complete, then share the relevant key.', 'small'),
        h.p('Base case version ' + h.DATA['metadata']['version'] + '; Samira source-record edition ' + h.COMPLETE_RECORD['version'] + '. Use the matching Samira source-record edition in the PDFs and AlloFlow. Verify the edition before switching formats, and keep the worksheet with its matching facilitator key.', 'small')]
    return stories


def build():
    assert hashlib.sha256(FORM.read_bytes()).hexdigest() == FORM_SHA
    manifest = json.loads((KEYS / 'manifest.json').read_text(encoding='utf-8'))
    assert manifest['caseDataSha256'] == hashlib.sha256((ROOT / 'maine_sld_case_data.json').read_bytes()).hexdigest()
    assert manifest['recordReviewSha256'] == hashlib.sha256((ROOT / 'dev-tools/sld_case_record_review.json').read_bytes()).hexdigest()
    assert manifest['samiraRecordSha256'] == hashlib.sha256((ROOT / 'dev-tools/samira_complete_record.json').read_bytes()).hexdigest()
    assert manifest['samiraKeySha256'] == hashlib.sha256((ROOT / 'dev-tools/samira_complete_key.json').read_bytes()).hexdigest()
    participant_dir, presenter_dir = OUT / 'Participants', OUT / 'Presenters'
    for folder in (participant_dir, presenter_dir):
        folder.mkdir(parents=True, exist_ok=True)
        shutil.copy2(FORM, folder / FORM_NAME)
    participant_names = ['Choose-a-Case.html', 'SLD-Participant-Case-Pack.pdf'] + [c['id'] + '-participant.pdf' for c in h.DATA['cases']]
    for name in participant_names:
        shutil.copy2(HANDOUTS / name, participant_dir / name)
    presenter_names = ['SLD-Facilitator-Quick-Reference.pdf', 'SLD-Facilitator-Worked-Answer-Keys.pdf', 'samira-facilitator-key.pdf']
    for name in presenter_names:
        shutil.copy2(KEYS / name, presenter_dir / name)
    h.OUT = participant_dir
    h.build_pdf('START_HERE-Participants.pdf', participant_guide(), 'Participant instructions')
    h.OUT = presenter_dir
    h.build_pdf('START_HERE-Presenters.pdf', presenter_guide(manifest), 'Presenter only')
    participant_names += [FORM_NAME, 'START_HERE-Participants.pdf']
    presenter_names += [FORM_NAME, 'START_HERE-Presenters.pdf']
    for folder, names, filename in [(participant_dir, participant_names, 'SLD-Participant-Materials.zip'), (presenter_dir, presenter_names, 'SLD-Presenter-Materials.zip')]:
        with zipfile.ZipFile(OUT / filename, 'w', zipfile.ZIP_DEFLATED) as archive:
            for name in names:
                archive.write(folder / name, name)
        with zipfile.ZipFile(OUT / filename) as archive:
            assert archive.testzip() is None
            assert set(archive.namelist()) == set(names)
    counts = []
    for case in h.DATA['cases']:
        reader = PdfReader(participant_dir / (case['id'] + '-participant.pdf'))
        assert len(reader.get_fields() or {}) == 26
        assert case['id'] + '_continuation' in reader.get_fields()
        counts.append({'case': case['id'], 'pages': len(reader.pages), 'fields': len(reader.get_fields())})
    for path, expected in [(participant_dir / 'START_HERE-Participants.pdf', 1), (presenter_dir / 'START_HERE-Presenters.pdf', 2)]:
        assert len(PdfReader(path).pages) == expected, path
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                assert all(40 <= c['x0'] <= c['x1'] <= 572 and 32 <= c['top'] <= c['bottom'] <= 773 for c in page.chars), path
    summary = {'caseDataVersion': h.DATA['metadata']['version'], 'samiraRecordVersion': h.COMPLETE_RECORD['version'], 'samiraRecordSha256': manifest['samiraRecordSha256'], 'samiraKeySha256': manifest['samiraKeySha256'], 'participantFiles': participant_names, 'presenterFiles': presenter_names, 'cases': counts, 'officialFormSha256': FORM_SHA}
    (OUT / 'manifest.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    build()
