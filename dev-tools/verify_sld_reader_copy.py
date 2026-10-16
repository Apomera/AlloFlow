"""Keep known drafting and revision comments out of workshop PDFs."""
from pathlib import Path
import json
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'maine_sld_case_data.json').read_text(encoding='utf-8'))
PHRASES = (
    'the short score excerpt does not independently establish those findings',
    'this replaces samira',
    'former assumption-only samira',
    'samira now',
    'newly authored',
    'missing-record premise',
    'no hidden full-record premise',
    'not an unseen evaluation',
    'if refinements are made',
    'well-designed incomplete-evidence case',
    'the honest sample',
    'answer key appear complete',
    'a truthful completed training example',
    'not an answer-key omission',
    'the original deck has not been rewritten',
    'no identifiers, scores, records or signatures have been manufactured',
    'this review checks internal consistency',
)


def normalize(text):
    return re.sub(r'\s+', ' ', text).strip().lower()


def verify():
    handouts = ROOT / 'output/sld-case-handouts'
    keys = ROOT / 'output/sld-facilitator-keys'
    packaged = ROOT / 'output/sld-pdf-materials'
    paths = [handouts / (case['id'] + '-participant.pdf') for case in DATA['cases']]
    paths += [handouts / 'SLD-Participant-Case-Pack.pdf', handouts / 'SLD-Participant-Fillable-Case-Pack.pdf', handouts / 'SLD-Facilitator-Supplement.pdf']
    paths += [keys / (case['id'] + '-facilitator-key.pdf') for case in DATA['cases']]
    paths += [keys / 'SLD-Facilitator-Worked-Answer-Keys.pdf', keys / 'SLD-Facilitator-Quick-Reference.pdf']
    paths += [packaged / 'Participants/START_HERE-Participants.pdf', packaged / 'Presenters/START_HERE-Presenters.pdf']
    results = []
    for path in paths:
        reader = PdfReader(path)
        text = normalize(' '.join(page.extract_text() or '' for page in reader.pages))
        found = [phrase for phrase in PHRASES if normalize(phrase) in text]
        assert not found, (str(path), found)
        results.append({'file': str(path.relative_to(ROOT)), 'pages': len(reader.pages)})
    report = ROOT / 'reports/sld-reader-copy-2026-10-13'
    report.mkdir(parents=True, exist_ok=True)
    result = {'documentsChecked': len(results), 'knownDraftingPhrasesAbsent': True, 'documents': results}
    (report / 'verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    verify()
