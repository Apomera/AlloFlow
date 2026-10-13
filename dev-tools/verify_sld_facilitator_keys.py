"""Check worked-key coverage and render individual PDFs for visual review."""
from pathlib import Path
import json
import re
import subprocess
import hashlib
from pypdf import PdfReader
from PIL import Image, ImageDraw
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/sld-facilitator-keys'
QA = ROOT / 'reports/sld-facilitator-keys-2026-10-12/visual'
POPPLER = Path('C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
REVIEW_PATH = ROOT / 'dev-tools/sld_case_record_review.json'


def normalized(text):
    return re.sub(r'\s+', '', text)


def review_fragments(review):
    for field in ('scenario', 'stage1', 'stage2', 'completionReminder'):
        yield field, review[field]
    for i, row in enumerate(review['recordInventory']):
        yield f'inventory {i} form', row['form'].split(':', 1)[0]
        for field in ('supplied', 'request'):
            yield f'inventory {i} {field}', row[field]
    for i, example in enumerate(review['stage1Examples']):
        for field in ('label', 'entry', 'why'):
            yield f'example {i} {field}', example[field]


def verify():
    QA.mkdir(parents=True, exist_ok=True)
    document = json.loads((OUT / 'worked-keys.json').read_text(encoding='utf-8'))
    manifest = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
    reviews = json.loads(REVIEW_PATH.read_text(encoding='utf-8'))['cases']
    assert document['metadata']['caseDataSha256'] == hashlib.sha256((ROOT / 'maine_sld_case_data.json').read_bytes()).hexdigest()
    assert manifest['recordReviewSha256'] == hashlib.sha256(REVIEW_PATH.read_bytes()).hexdigest(), 'Rebuild keys after record-review changes'
    for field, filename in [('samiraRecordSha256', 'samira_complete_record.json'), ('samiraKeySha256', 'samira_complete_key.json')]:
        assert manifest[field] == hashlib.sha256((ROOT / 'dev-tools' / filename).read_bytes()).hexdigest(), filename
    results = []
    for case in document['cases']:
        path = OUT / (case['caseId'] + '-facilitator-key.pdf')
        reader = PdfReader(path)
        pages = [p.extract_text() or '' for p in reader.pages]
        assert 'quick key' in pages[0] and 'worked form' in pages[1], (case['caseId'], 'Quick key must fit one page')
        text = normalized(' '.join(pages))
        if case['caseId'] == 'samira':
            for stale in ('STAGE 2 ONLY', 'under the full-record premise', 'no numerical standardized scores are supplied', 'specific measures, composites and verified strengths are not reproduced'):
                assert normalized(stale).lower() not in text.lower(), stale
        for section in case['sections']:
            for field in ('selection', 'entry', 'rationale'):
                assert normalized(section[field]) in text, (case['caseId'], section['id'], field)
            for part in section.get('parts', []):
                for field in ('entry', 'strengths', 'weaknesses', 'rationale'):
                    if part.get(field):
                        assert normalized(part[field]) in text, (case['caseId'], section['id'], part['label'], field)
        assert normalized('Verification of strengths') in text and normalized('Verification of weaknesses') in text
        assert normalized('agreement/disagreement signatures') in text
        assert normalized('Date of birth') in text and normalized('School address') in text
        review = reviews.get(case['caseId'])
        if review:
            for label, fragment in review_fragments(review):
                assert normalized(fragment) in text, (case['caseId'], 'record review', label)
            assert 'STAGE 2 ONLY:' in pages[0], (case['caseId'], 'quick-key stage label')
            audit_pos = text.index(normalized('Stage 1 example responses'))
            rehearsal_pos = text.index(normalized('STAGE 2: all selections and verification examples below'))
            assert audit_pos < rehearsal_pos, (case['caseId'], 'audit must precede rehearsal')
        with pdfplumber.open(path) as pdf:
            for number, page in enumerate(pdf.pages, 1):
                bad = [ch for ch in page.chars if ch['x0'] < 40 or ch['x1'] > 572 or ch['top'] < 32 or ch['bottom'] > 773]
                assert not bad, (path.name, number, bad[:1])
        prefix = QA / case['caseId']
        subprocess.run([str(POPPLER), '-scale-to', '1300', '-png', str(path), str(prefix)], check=True, capture_output=True)
        digits = len(str(len(pages)))
        images = [QA / (case['caseId'] + '-' + str(i).zfill(digits) + '.png') for i in range(1, len(pages) + 1)]
        assert all(p.exists() for p in images)
        for start in range(0, len(images), 8):
            batch = images[start:start + 8]
            sheet = Image.new('RGB', (1280, 470 * ((len(batch) + 3) // 4)), 'white')
            draw = ImageDraw.Draw(sheet)
            for i, image in enumerate(batch):
                thumb = Image.open(image).convert('RGB')
                thumb.thumbnail((305, 425))
                x, y = i % 4 * 320 + 7, i // 4 * 470 + 25
                sheet.paste(thumb, (x, y))
                draw.text((x, y - 20), image.stem, fill='black')
            sheet.save(QA / (case['caseId'] + '-contact-' + str(start // 8 + 1) + '.jpg'))
        results.append({'case': case['caseId'], 'pages': len(pages), 'onePageQuickKey': True, 'allEntriesAndRationalesPresent': True, 'bounds': 'pass'})
    combined = PdfReader(OUT / 'SLD-Facilitator-Worked-Answer-Keys.pdf')
    assert len(combined.pages) == 1 + sum(r['pages'] for r in results)
    combined_text = normalized(' '.join(page.extract_text() or '' for page in combined.pages))
    for case_id, review in reviews.items():
        for label, fragment in review_fragments(review):
            assert normalized(fragment) in combined_text, (case_id, 'combined record review', label)
    quick = PdfReader(OUT / 'SLD-Facilitator-Quick-Reference.pdf')
    assert len(quick.pages) == len(results)
    for case, page in zip(document['cases'], quick.pages):
        assert 'quick key' in page.extract_text() and all('Q' + str(i) in page.extract_text() for i in range(1, 10))
        if case['caseId'] in reviews:
            assert 'STAGE 2 ONLY:' in page.extract_text(), (case['caseId'], 'combined quick-key stage label')
    for filename, prefix, options in [('SLD-Facilitator-Worked-Answer-Keys.pdf', 'introduction', ['-f', '1', '-l', '1']), ('SLD-Facilitator-Quick-Reference.pdf', 'quick-reference', [])]:
        subprocess.run([str(POPPLER), '-scale-to', '1300', '-png'] + options + [str(OUT / filename), str(QA / prefix)], check=True, capture_output=True)
    (QA.parent / 'verification.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    verify()
