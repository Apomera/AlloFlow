"""Verify generated packet coverage, fillable fields, and rendered page bounds."""
from pathlib import Path
import json
import subprocess
import re
from pypdf import PdfReader, PdfWriter
from PIL import Image, ImageOps, ImageDraw
import pdfplumber
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/sld-case-handouts'
QA = ROOT / 'reports/sld-handouts-2026-10-12'
POPPLER = Path('C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
DATA = json.loads((ROOT / 'maine_sld_case_data.json').read_text(encoding='utf-8'))
REVIEWS = json.loads((ROOT / 'dev-tools/sld_case_record_review.json').read_text(encoding='utf-8'))['cases']
COMPLETE = json.loads((ROOT / 'dev-tools/samira_complete_record.json').read_text(encoding='utf-8'))
FIELD_KEYS = ([s['id'] for s in DATA['formSteps']] + ['evidence', 'next', 'instruction', 'family']
    + ['Q3' + part for part in 'abcd']
    + ['Q4' + part + '_' + side for part in 'abcd' for side in ['strengths', 'weaknesses']]
    + ['continuation'])


def test_value(name):
    if re.search(r'_Q4[a-d]_', name):
        return ('Classroom work and the teaching record are the evidence sources. Compare the student\'s independent response with supported performance, describe the relevant pattern, and identify what is still missing before treating this finding as verification.')
    if name.endswith('_continuation'):
        return '\n\n'.join('Q' + str(i) + ' continuation: ' + ('The source, finding, interpretation limit, and next evidence request belong together. Check the case record and distinguish supplied facts from exercise assumptions. ' * 2) for i in range(1, 7))
    return ('Practice response: identify the source and relevant finding, explain how it supports or complicates the selected form response, and name the evidence still needed. Do not invent a missing result. Identify skipped questions and continue any longer reasoning on the labeled continuation page.')


def expected_maxlen(name):
    if name.endswith('_continuation'):
        return 2800
    if re.search(r'_Q4[a-d]_', name):
        return 350
    if re.search(r'_Q3[a-d]$', name) or name.rsplit('_', 1)[-1] in ('evidence', 'next', 'instruction', 'family'):
        return 450
    return 400

def normalized(text):
    return re.sub(r'\s+', ' ', text).strip()


def appearance_test_value(value, widget):
    # pypdf's appearance writer honors newlines but does not wrap long lines.
    width = float(widget['/Rect'][2]) - float(widget['/Rect'][0]) - 8
    height = float(widget['/Rect'][3]) - float(widget['/Rect'][1])
    lines = []
    for paragraph in value.split('\n'):
        line = ''
        for word in paragraph.split():
            candidate = (line + ' ' + word).strip()
            if line and stringWidth(candidate, 'Helvetica', 10) > width:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
    assert all(stringWidth(line, 'Helvetica', 10) <= width for line in lines)
    assert len(lines) * 14 <= height - 4, (widget['/T'], len(lines), height)
    return '\n'.join(lines)

def verify():
    QA.mkdir(parents=True, exist_ok=True)
    summary = []
    for case in DATA['cases']:
        path = OUT / (case['id'] + '-participant.pdf')
        reader = PdfReader(path)
        text = normalized(' '.join(page.extract_text() for page in reader.pages))
        entries = case['narrative'] + [s['text'] for s in case.get('evidenceSupplement', [])] + case.get('assumptions', [])
        if case['id'] == COMPLETE['caseId']:
            entries = COMPLETE['overview'] + [COMPLETE['completionNote']] + COMPLETE['tasks']
            entries += [str(cell) for row in COMPLETE['headerRows'] for cell in row]
            for section in COMPLETE['sections']:
                entries += [section['title']] + section.get('paragraphs', []) + section.get('notes', [])
                if section.get('table'):
                    entries += [str(cell) for row in [section['table']['headers']] + section['table']['rows'] for cell in row]
            for stale in ('STAGE 2 ONLY', 'No new evidence is released', 'No standardized score table is supplied', 'full-record findings are stipulated'):
                assert stale not in text, (case['id'], 'stale incomplete-record text', stale)
        for entry in entries:
            assert normalized(entry) in text, (case['id'], entry[:70])
        for step in DATA['formSteps']:
            assert normalized(step['prompt']) in text, (case['id'], step['id'])
        for area in DATA['academicAreas']:
            assert normalized(area) in text, (case['id'], 'Q1 area', area)
        assert 'outside the achievement test norm group' in text
        assert 'does not give Q7 an automatic stopping or skip branch' in text
        assert 'learning environment, including the regular classroom' in text
        if case['id'] in REVIEWS:
            review = REVIEWS[case['id']]
            for field in ('scenario', 'stage1', 'stage2', 'completionReminder'):
                assert normalized(review[field]) in text, (case['id'], field)
            for row in review['recordInventory']:
                for field in ('supplied', 'request'):
                    assert normalized(row[field]) in text, (case['id'], row['form'], field)
        assert 'Verification of strengths' in text and 'Verification of weaknesses' in text
        fields = reader.get_fields() or {}
        assert set(fields) == {case['id'] + '_' + key for key in FIELD_KEYS}, (case['id'], list(fields))
        assert len(fields) == 26, (case['id'], len(fields))
        assert reader.trailer['/Root'].get('/Lang') == 'en-US'
        assert all(page.get('/Tabs') == '/R' for page in reader.pages)
        assert 'character and visible-space limits' in text
        assert 'continuation page' in text
        source_widgets = [a.get_object() for page in reader.pages for a in page.get('/Annots', [])
            if a.get_object().get('/Subtype') == '/Widget']
        assert len(source_widgets) == len(fields)
        for widget in source_widgets:
            name = widget['/T']
            assert widget.get('/MaxLen') == expected_maxlen(name), (name, widget.get('/MaxLen'))
            assert widget.get('/Ff', 0) & 4096 and widget.get('/Ff', 0) & 8388608, name
        writer = PdfWriter()
        writer.clone_document_from_reader(reader)
        widgets_by_name = {widget['/T']: widget for widget in source_widgets}
        values = {name: appearance_test_value(test_value(name), widgets_by_name[name]) for name in fields}
        assert all(len(value) <= expected_maxlen(name) for name, value in values.items())
        writer.update_page_form_field_values(None, values, auto_regenerate=False)
        filled = QA / (case['id'] + '-filled-check.pdf')
        with filled.open('wb') as stream:
            writer.write(stream)
        reread = PdfReader(filled)
        assert all(reread.get_fields()[name].get('/V') == value for name, value in values.items())
        for page in reread.pages:
            for annotation in page.get('/Annots', []):
                widget = annotation.get_object()
                if widget.get('/Subtype') == '/Widget':
                    assert widget.get('/V') == values[widget['/T']]
                    assert widget.get('/AP', {}).get('/N') is not None
                    assert len(widget['/AP']['/N'].get_object().get_data()) > 0
                    assert widget.get('/BS', {}).get('/W') == .7
                    assert widget.get('/TU')
                    x0, y0, x1, y1 = map(float, widget['/Rect'])
                    assert 40 <= x0 < x1 <= 572 and 45 <= y0 < y1 <= 760, (case['id'], widget['/T'], widget['/Rect'])
        summary.append({'case': case['id'], 'pages': len(reader.pages), 'fields': len(values),
            'contentAndFill': 'pass', 'appearanceTest': 'Explicit line breaks at measured widths; not a PDF-viewer compatibility certification',
            'capacityTestChars': {'main': len(test_value(case['id'] + '_Q1')),
            'Q4': len(test_value(case['id'] + '_Q4a_strengths')), 'continuation': len(test_value(case['id'] + '_continuation'))}})
    for file in ([OUT / (c['id'] + '-participant.pdf') for c in DATA['cases']]
            + [QA / (c['id'] + '-filled-check.pdf') for c in DATA['cases']]
            + [OUT / 'SLD-Facilitator-Supplement.pdf']):
        with pdfplumber.open(file) as pdf:
            for i, page in enumerate(pdf.pages):
                bad = [ch for ch in page.chars if ch['x0'] < 40 or ch['x1'] > 572 or ch['top'] < 32 or ch['bottom'] > 773]
                assert not bad, (file.name, i + 1, bad[:1])
        prefix = QA / file.stem
        subprocess.run([str(POPPLER), '-scale-to', '1100', '-png', str(file), str(prefix)], check=True, capture_output=True)
        page_count = len(PdfReader(file).pages)
        digits = len(str(page_count))
        pages = [Path(str(prefix) + '-' + str(i).zfill(digits) + '.png') for i in range(1, page_count + 1)]
        assert all(page.exists() for page in pages)
        for start in range(0, len(pages), 8):
            batch = pages[start:start + 8]
            sheet = Image.new('RGB', (1280, 470 * ((len(batch) + 3) // 4)), 'white')
            draw = ImageDraw.Draw(sheet)
            for j, page in enumerate(batch):
                thumb = Image.open(page).convert('RGB')
                thumb.thumbnail((305, 425))
                x, y = (j % 4) * 320 + 7, (j // 4) * 470 + 25
                sheet.paste(thumb, (x, y))
                draw.text((x, y - 20), page.stem, fill='black')
            sheet.save(QA / (file.stem + '-contact-' + str(start // 8 + 1) + '.jpg'))
    (QA / 'verification.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary, indent=2))

if __name__ == '__main__':
    verify()
