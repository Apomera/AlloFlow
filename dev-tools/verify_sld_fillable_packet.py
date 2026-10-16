"""Verify all-case participant content and 182 independent, persistent PDF fields."""
from collections import Counter
from pathlib import Path
import json
import subprocess

import pdfplumber
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter

from verify_sld_case_handouts import (
    COMPLETE, DATA, FIELD_KEYS, OUT, POPPLER, ROOT,
    appearance_test_value, expected_maxlen, normalized,
)


PACKET = OUT / 'SLD-Participant-Fillable-Case-Pack.pdf'
QA = ROOT / 'reports/sld-fillable-packet-2026-10-13'


def source_entries(case):
    if case['id'] == COMPLETE['caseId']:
        entries = COMPLETE['overview'] + [COMPLETE['completionNote']] + COMPLETE['tasks']
        entries += [str(cell) for row in COMPLETE['headerRows'] for cell in row]
        for section in COMPLETE['sections']:
            entries += [section['title']] + section.get('paragraphs', []) + section.get('notes', [])
            if section.get('table'):
                entries += [str(cell) for row in [section['table']['headers']] + section['table']['rows'] for cell in row]
        return entries
    entries = case['narrative'] + [s['text'] for s in case.get('evidenceSupplement', [])] + case.get('assumptions', [])
    entries += [task['prompt'] for task in case.get('tasks', [])]
    if case.get('scoreGuidance'):
        entries.append(case['scoreGuidance'])
    if case.get('baseCaseId'):
        base = next(c for c in DATA['cases'] if c['id'] == case['baseCaseId'])
        entries += base['narrative']
        entries += [s['text'] for s in base.get('evidenceSupplement', []) if s['id'] != 'instruction-unknown']
    return entries


def canonical_fields(reader):
    found = []

    def visit(ref, prefix=''):
        obj = ref.get_object()
        partial = str(obj.get('/T', ''))
        name = '.'.join(value for value in (prefix, partial) if value)
        child_fields = [kid for kid in obj.get('/Kids', []) if kid.get_object().get('/T')]
        if child_fields:
            for kid in child_fields:
                visit(kid, name)
        else:
            assert name, 'Unnamed terminal field in canonical field tree'
            found.append((name, obj))

    form = reader.trailer['/Root'].get('/AcroForm')
    assert form is not None, 'Missing AcroForm'
    for field in form.get_object().get('/Fields', []):
        visit(field)
    names = [name for name, _ in found]
    assert len(names) == len(set(names)), ('Duplicate canonical names', Counter(names))
    return dict(found)


def inherited(widget, key, default=None):
    current = widget
    for _ in range(20):
        if key in current:
            return current[key]
        if '/Parent' not in current:
            return default
        current = current['/Parent'].get_object()
    raise AssertionError('Cyclic field parent chain')


def widgets(reader):
    found = []
    for page_number, page in enumerate(reader.pages, 1):
        for annotation in page.get('/Annots', []):
            obj = annotation.get_object()
            if obj.get('/Subtype') == '/Widget':
                name = str(inherited(obj, '/T', ''))
                assert name, ('Unnamed widget', page_number)
                found.append((name, page_number, obj))
    names = [name for name, _, _ in found]
    assert len(names) == len(set(names)), ('Duplicate widget names', Counter(names))
    return {name: (page, obj) for name, page, obj in found}


def assert_fields(reader, expected, values=None):
    canonical = canonical_fields(reader)
    visible = widgets(reader)
    public = reader.get_fields() or {}
    assert set(canonical) == set(visible) == set(public) == expected
    assert len(canonical) == len(visible) == len(public) == 182
    for name, field in canonical.items():
        page_number, widget = visible[name]
        desired = values[name] if values is not None else ''
        assert field.get('/V', '') == public[name].get('/V', '') == inherited(widget, '/V', '') == desired, name
        assert inherited(widget, '/FT') == '/Tx', name
        assert inherited(widget, '/MaxLen') == expected_maxlen(name), name
        flags = int(inherited(widget, '/Ff', 0))
        assert flags & 4096 and flags & 8388608 and not flags & 1, name
        assert inherited(widget, '/TU'), name
        assert int(widget.get('/F', 0)) & 4, name
        assert widget.get('/AP', {}).get('/N') is not None, name
        assert widget['/AP']['/N'].get_object().get_data(), name
        assert widget.get('/BS', {}).get('/W') == .7, name
        x0, y0, x1, y1 = map(float, widget['/Rect'])
        assert 40 <= x0 < x1 <= 572 and 45 <= y0 < y1 <= 760, (name, page_number, widget['/Rect'])
    return visible


def unique_test_value(name):
    if name.endswith('_continuation'):
        return '\n\n'.join(
            name + ' / Q' + str(i) + ': ' +
            ('Record the source, finding, interpretation limit and next evidence request. Keep supplied facts separate from exercise assumptions. ' * 2)
            for i in range(1, 7)
        )
    return name + ': Compare independent and supported work. Identify the source, finding and any missing evidence. This response belongs only to this field.'


def check_bounds(path):
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            bad = [ch for ch in page.chars if ch['x0'] < 40 or ch['x1'] > 572 or ch['top'] < 32 or ch['bottom'] > 773]
            assert not bad, (path.name, i, bad[:1])


def assert_navigation(reader, path, case_summary):
    page_refs = {
        (page.indirect_reference.idnum, page.indirect_reference.generation): number
        for number, page in enumerate(reader.pages)
    }

    def overlaps(first, second):
        return min(first[2], second[2]) > max(first[0], second[0]) and min(first[3], second[3]) > max(first[1], second[1])

    def text_rect(match, height):
        return (float(match['x0']), height - float(match['bottom']),
                float(match['x1']), height - float(match['top']))

    def covers_label(rect, label_rect):
        center_x = (label_rect[0] + label_rect[2]) / 2
        center_y = (label_rect[1] + label_rect[3]) / 2
        return (rect[0] <= center_x <= rect[2] and rect[1] <= center_y <= rect[3]
                and rect[0] <= label_rect[0] + 1 and rect[2] >= label_rect[2] - 1)

    def internal_links(page):
        links = []
        for reference in page.get('/Annots', []):
            annotation = reference.get_object()
            if annotation.get('/Subtype') != '/Link':
                continue
            destination = annotation.get('/Dest')
            if destination is None:
                action = annotation.get('/A')
                assert action is not None, 'Link has neither a destination nor an action'
                action = action.get_object()
                if action.get('/S') == '/URI':
                    continue
                assert action.get('/S') == '/GoTo', ('Unexpected link action', action)
                destination = action.get('/D')
            assert isinstance(destination, list) and len(destination) >= 2, ('Invalid internal destination', destination)
            target = destination[0]
            assert hasattr(target, 'idnum'), ('Internal destination lacks a page reference', destination)
            target_ref = (target.idnum, target.generation)
            assert target_ref in page_refs, ('Unknown destination page', destination)
            rect = tuple(float(value) for value in annotation['/Rect'])
            x0, y0, x1, y1 = rect
            assert (float(page.cropbox.left) <= x0 < x1 <= float(page.cropbox.right)
                    and float(page.cropbox.bottom) <= y0 < y1 <= float(page.cropbox.top)), ('Link outside page', rect)
            links.append((page_refs[target_ref], rect))
        return links

    signatures = []
    menu = []
    with pdfplumber.open(path) as pdf:
        cover_links = internal_links(reader.pages[0])
        assert len(cover_links) == len(case_summary) == 7, ('Cover case-link count', len(cover_links))
        destinations = [target for target, _ in cover_links]
        assert sorted(destinations) == sorted(item['firstPage'] - 1 for item in case_summary), ('Wrong menu destinations', destinations)
        for i, (_, first_rect) in enumerate(cover_links):
            assert all(not overlaps(first_rect, other_rect) for _, other_rect in cover_links[i + 1:]), 'Overlapping case-menu hitboxes'
        for case, summary in zip(DATA['cases'], case_summary):
            label = 'Alex B - Grade 4' if case['id'] == 'alex-general-ed-adequate' else case['id'].capitalize() + ' - Grade ' + str(case['grade'])
            matches = pdf.pages[0].search(label, regex=False, case=True)
            assert len(matches) == 1, ('Missing or ambiguous menu label', label)
            label_box = text_rect(matches[0], pdf.pages[0].height)
            matched = [(target, rect) for target, rect in cover_links if covers_label(rect, label_box)]
            assert len(matched) == 1 and matched[0][0] == summary['firstPage'] - 1, ('Menu label targets wrong case', label, matched)
            menu.append({'case': case['id'], 'label': label, 'page': summary['firstPage']})
        signatures.extend((1, target + 1, rect) for target, rect in cover_links)
        for page_number, (page, text_page) in enumerate(zip(reader.pages[1:], pdf.pages[1:]), 2):
            links = internal_links(page)
            assert len(links) == 1 and links[0][0] == 0, ('Missing or incorrect return link', page_number, links)
            target, rect = links[0]
            matches = text_page.search('Back to case list', regex=False, case=True, return_chars=True)
            assert len(matches) == 1 and covers_label(rect, text_rect(matches[0], text_page.height)), ('Return hitbox misses its label', page_number)
            assert 18 <= rect[1] < rect[3] < 39, ('Return link outside footer', page_number, rect)
            assert not overlaps(rect, (40, 52, 572, 760)), ('Return link overlaps case body', page_number)
            label_chars = {id(char) for char in matches[0]['chars']}
            other_chars = [char for char in text_page.chars if char['text'].strip() and id(char) not in label_chars]
            assert all(not overlaps(rect, text_rect(char, text_page.height)) for char in other_chars), ('Return link overlaps other text or page number', page_number)
            for reference in page.get('/Annots', []):
                annotation = reference.get_object()
                if annotation.get('/Subtype') == '/Widget':
                    assert not overlaps(rect, tuple(float(value) for value in annotation['/Rect'])), ('Return link overlaps a response field', page_number)
            signatures.append((page_number, target + 1, rect))
    return {
        'menuLinks': menu,
        'returnLinks': len(reader.pages) - 1,
        'signatures': sorted(signatures),
        'hitboxesAndDestinations': 'pass',
    }


def contact_sheets(pages, prefix):
    outputs = []
    for start in range(0, len(pages), 8):
        batch = pages[start:start + 8]
        sheet = Image.new('RGB', (1280, 470 * ((len(batch) + 3) // 4)), 'white')
        draw = ImageDraw.Draw(sheet)
        for j, page in enumerate(batch):
            with Image.open(page) as source:
                thumb = source.convert('RGB')
            thumb.thumbnail((305, 425))
            x, y = (j % 4) * 320 + 7, (j // 4) * 470 + 25
            sheet.paste(thumb, (x, y))
            draw.text((x, y - 20), page.stem, fill='black')
        output = QA / (prefix + '-contact-' + str(start // 8 + 1) + '.jpg')
        sheet.save(output)
        outputs.append(output.name)
    return outputs


def verify():
    QA.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(PACKET)
    expected = {case['id'] + '_' + key for case in DATA['cases'] for key in FIELD_KEYS}
    assert len(DATA['cases']) == 7 and len(FIELD_KEYS) == 26 and len(expected) == 182
    visible = assert_fields(reader, expected)
    assert reader.trailer['/Root'].get('/Lang') == 'en-US'
    assert all(page.get('/Tabs') == '/R' for page in reader.pages)
    texts = [normalized(page.extract_text()) for page in reader.pages]
    joined = ' '.join(texts)
    case_summary = []
    cursor = 1
    combined_body = pdfplumber.open(PACKET)
    for case in DATA['cases']:
        individual_path = OUT / (case['id'] + '-participant.pdf')
        standalone = PdfReader(individual_path)
        count = len(standalone.pages)
        case_text = ' '.join(texts[cursor:cursor + count])
        with pdfplumber.open(individual_path) as individual:
            for offset, page in enumerate(individual.pages):
                expected_body = normalized(page.crop((40, 32, 572, 740)).extract_text() or '')
                actual_body = normalized(combined_body.pages[cursor + offset].crop((40, 32, 572, 740)).extract_text() or '')
                assert actual_body == expected_body, (case['id'], 'Body differs from individual PDF', offset + 1)
        for entry in source_entries(case):
            assert normalized(entry) in case_text, (case['id'], 'Missing content', str(entry)[:90])
        for step in DATA['formSteps']:
            assert normalized(step['prompt']) in case_text, (case['id'], step['id'])
        for area in DATA['academicAreas']:
            assert normalized(area) in case_text, (case['id'], area)
        for phrase in ('outside the achievement test norm group', 'does not give Q7 an automatic stopping or skip branch',
                       'learning environment, including the regular classroom', 'Verification of strengths',
                       'Verification of weaknesses', 'character and visible-space limits', 'continuation page'):
            assert phrase in case_text, (case['id'], phrase)
        case_fields = [case['id'] + '_' + key for key in FIELD_KEYS]
        assert all(cursor + 1 <= visible[name][0] <= cursor + count for name in case_fields), case['id']
        case_summary.append({'case': case['id'], 'firstPage': cursor + 1, 'lastPage': cursor + count, 'fields': len(case_fields)})
        cursor += count
    combined_body.close()
    assert cursor == len(reader.pages) == 81, ('Unexpected packet page count', cursor, len(reader.pages))
    outline = reader.outline
    expected_bookmarks = [('Choose a case', 0)]
    for case, summary in zip(DATA['cases'], case_summary):
        label = 'Alex B - Grade 4' if case['id'] == 'alex-general-ed-adequate' else case['id'].capitalize() + ' - Grade ' + str(case['grade'])
        expected_bookmarks.append((label, summary['firstPage'] - 1))
    assert len(outline) == 8 and all(not isinstance(item, list) for item in outline)
    actual_bookmarks = [(str(item.title), reader.get_destination_page_number(item)) for item in outline]
    assert actual_bookmarks == expected_bookmarks, ('Wrong bookmark destinations', actual_bookmarks)
    navigation = assert_navigation(reader, PACKET, case_summary)

    for marker in ('Facilitator answer key', 'SLD case facilitator supplement', 'Stage 1 example responses',
                   'Q1-Q9 worked answer key', 'Facilitator-only answer key'):
        assert marker.lower() not in joined.lower(), ('Facilitator material in participant packet', marker)
    participant_sources = normalized(' '.join(str(entry) for c in DATA['cases'] for entry in source_entries(c)))
    screened_answers = 0
    for case in DATA['cases']:
        for step in case['recommendedResponses'].values():
            answer = normalized(step['feedback'])
            if len(answer) > 60 and answer not in participant_sources:
                assert answer not in joined, (case['id'], 'Facilitator feedback leaked', answer[:90])
                screened_answers += 1

    values = {name: appearance_test_value(unique_test_value(name), visible[name][1]) for name in expected}
    assert len(set(values.values())) == 182, 'Test values must uniquely identify every field'
    assert all(len(value) <= expected_maxlen(name) for name, value in values.items())
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    writer.update_page_form_field_values(None, values, auto_regenerate=False)
    filled = QA / 'SLD-Participant-Fillable-Case-Pack-filled-check.pdf'
    with filled.open('wb') as stream:
        writer.write(stream)
    reread = PdfReader(filled)
    assert len(reread.pages) == len(reader.pages)
    assert_fields(reread, expected, values)
    assert assert_navigation(reread, filled, case_summary) == navigation, 'Navigation changed after filling and saving'
    saved_bookmarks = [(str(item.title), reread.get_destination_page_number(item)) for item in reread.outline]
    assert saved_bookmarks == actual_bookmarks, 'Bookmarks changed after filling and saving'
    check_bounds(PACKET)
    check_bounds(filled)

    blank_prefix = QA / 'participant-blank'
    subprocess.run([str(POPPLER), '-scale-to', '1100', '-png', str(PACKET), str(blank_prefix)], check=True, capture_output=True)
    digits = len(str(len(reader.pages)))
    blank_pages = [Path(str(blank_prefix) + '-' + str(i).zfill(digits) + '.png') for i in range(1, len(reader.pages) + 1)]
    assert all(path.exists() for path in blank_pages)
    blank_contacts = contact_sheets(blank_pages, 'participant-blank')
    selected = sorted({visible[case['id'] + '_' + key][0] for case in DATA['cases']
                       for key in ('Q1', 'Q3a', 'Q4a_strengths', 'continuation')})
    filled_pages = []
    for page in selected:
        prefix = QA / ('participant-filled-page-' + str(page).zfill(digits))
        subprocess.run([str(POPPLER), '-f', str(page), '-l', str(page), '-singlefile', '-scale-to', '1100',
                        '-png', str(filled), str(prefix)], check=True, capture_output=True)
        output = prefix.with_suffix('.png')
        assert output.exists()
        filled_pages.append(output)
    filled_contacts = contact_sheets(filled_pages, 'participant-filled-selected')
    result = {
        'packet': str(PACKET), 'pages': len(reader.pages), 'canonicalFields': 182, 'widgets': 182,
        'initiallyBlank': True, 'uniqueSavedValues': len(set(values.values())), 'contentCoverage': 'pass',
        'facilitatorFeedbackScreened': screened_answers, 'saveReopenAndAppearance': 'pass', 'pageBounds': 'pass',
        'individualPageBodyComparison': 'pass', 'bookmarks': [{'title': title, 'page': page + 1} for title, page in actual_bookmarks],
        'navigation': {key: value for key, value in navigation.items() if key != 'signatures'},
        'navigationSaveReopen': 'pass',
        'cases': case_summary, 'blankContactSheets': blank_contacts, 'filledPagesRendered': selected,
        'filledContactSheets': filled_contacts,
        'appearanceTest': 'Explicit line breaks at measured widths; not a PDF-viewer compatibility certification',
    }
    (QA / 'verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    verify()
