"""Build participant and facilitator workshop supplements from the Case Lab data."""
from pathlib import Path
from io import BytesIO
import json
import html
import re
import zipfile
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'sld-case-handouts'
DATA = json.loads((ROOT / 'maine_sld_case_data.json').read_text(encoding='utf-8'))
RECORD_REVIEW = json.loads((ROOT / 'dev-tools/sld_case_record_review.json').read_text(encoding='utf-8'))
COMPLETE_RECORD = json.loads((ROOT / 'dev-tools/samira_complete_record.json').read_text(encoding='utf-8'))
INK = colors.HexColor('#16343B')
GREEN = colors.HexColor('#23665B')
MUTED = colors.HexColor('#52656A')
RULE = colors.HexColor('#D9D9D9')
PALE = colors.HexColor('#EDF3EF')
WIDTH = 516
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial', boldItalic='Arial-Bold')
STYLES = {
    'title': ParagraphStyle('title', fontName='Arial-Bold', fontSize=21, leading=25, textColor=INK, spaceAfter=12),
    'heading': ParagraphStyle('heading', fontName='Arial-Bold', fontSize=13, leading=17, textColor=GREEN, spaceBefore=10, spaceAfter=7, keepWithNext=True),
    'body': ParagraphStyle('body', fontName='Arial', fontSize=10.5, leading=14.5, textColor=INK, spaceAfter=8),
    'small': ParagraphStyle('small', fontName='Arial', fontSize=9, leading=12, textColor=MUTED, spaceAfter=6),
    'cell': ParagraphStyle('cell', fontName='Arial', fontSize=9.5, leading=12.5, textColor=INK),
    'headcell': ParagraphStyle('headcell', fontName='Arial-Bold', fontSize=9.5, leading=12.5, textColor=colors.white),
    'score': ParagraphStyle('score', fontName='Arial', fontSize=9, leading=11, textColor=INK),
    'matrixheading': ParagraphStyle('matrixheading', fontName='Arial-Bold', fontSize=10, leading=13, textColor=GREEN, spaceBefore=5, spaceAfter=4),
    'inventory': ParagraphStyle('inventory', fontName='Arial', fontSize=9, leading=11, textColor=INK),
    'recordtitle': ParagraphStyle('recordtitle', fontName='Arial-Bold', fontSize=18, leading=22, textColor=INK, spaceAfter=10, keepWithNext=True),
    'recordbody': ParagraphStyle('recordbody', fontName='Arial', fontSize=10, leading=13.5, textColor=INK, spaceAfter=8),
}

def p(text, style='body'):
    return Paragraph(escape(str(text)), STYLES[style])

def link(label, url):
    return Paragraph(f'<link href="{escape(url, {chr(34): "&quot;"})}" color="#23665B"><u>{escape(label)}</u></link>', STYLES['small'])

def table(rows, widths, cell_style='cell'):
    cells = [[p(value, 'headcell' if i == 0 else cell_style) for value in row] for i, row in enumerate(rows)]
    result = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT')
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), INK), ('GRID', (0, 0), (-1, -1), .5, RULE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, PALE]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return result

class Response(Flowable):
    def __init__(self, name, label, height=57, fillable=True, width=WIDTH, maxlen=400):
        Flowable.__init__(self)
        self.name, self.label, self.width, self.height, self.fillable = name, label, width, height, fillable
        self.maxlen = maxlen

    def draw(self):
        canvas = self.canv
        if not self.fillable:
            canvas.setStrokeColor(RULE)
            for y in range(4, int(self.height), 18):
                canvas.line(0, y, self.width, y)
        if self.fillable:
            x, y = canvas.absolutePosition(0, 0)
            canvas.acroForm.textfield(name=self.name, tooltip=self.label + ' - continue on the continuation page if full',
                x=x, y=y, width=self.width, height=self.height, value='', fontName='Helvetica', fontSize=10,
                borderWidth=.7, fillColor=colors.HexColor('#F7FAF8'), textColor=INK, borderColor=colors.HexColor('#A4B5B0'),
                fieldFlags='multiline doNotScroll', annotationFlags='print', maxlen=self.maxlen, forceBorder=True)


class PageAnchor(Flowable):
    def __init__(self, name):
        Flowable.__init__(self)
        self.name = name
        self.width = self.height = 0

    def draw(self):
        self.canv.bookmarkPage(self.name, fit='Fit')


def response_keys():
    return ([s['id'] for s in DATA['formSteps']] + ['evidence', 'next', 'instruction', 'family']
        + ['Q3' + part for part in 'abcd']
        + ['Q4' + part + '_' + side for part in 'abcd' for side in ['strengths', 'weaknesses']]
        + ['continuation'])

def footer(label, navigation=False):
    def draw(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(RULE)
        canvas.line(48, 39, 564, 39)
        canvas.setFont('Arial', 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(48, 27, 'Maine SLD | Fictional practice' if navigation else 'Maine SLD | Fictional practice | ' + label)
        if navigation and doc.page > 1:
            text = 'Back to case list'
            width = pdfmetrics.stringWidth(text, 'Arial', 8)
            x = 482 - width
            canvas.setFillColor(GREEN)
            canvas.drawString(x, 27, text)
            canvas.setStrokeColor(GREEN)
            canvas.setLineWidth(.4)
            canvas.line(x, 26, 482, 26)
            canvas.linkRect('Back to case list', 'case-menu', (x - 2, 24, 484, 37), relative=0, thickness=0)
            canvas.setFillColor(MUTED)
        canvas.drawRightString(564, 27, str(doc.page))
        canvas.restoreState()
    return draw

def build_pdf(filename, story, label, navigation=False):
    path = OUT / filename
    doc = SimpleDocTemplate(str(path), pagesize=(612, 792), rightMargin=48, leftMargin=48,
        topMargin=43, bottomMargin=52, title=label, author='AlloFlow workshop materials',
        subject='Fictional educator practice; not an eligibility determination')
    doc.build(story, onFirstPage=footer(label, navigation), onLaterPages=footer(label, navigation))
    reader = PdfReader(BytesIO(path.read_bytes()))
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    writer.root_object[NameObject('/Lang')] = TextStringObject('en-US')
    for page in writer.pages:
        page[NameObject('/Tabs')] = NameObject('/R')
    with path.open('wb') as stream:
        writer.write(stream)
    return path

def case_label(case):
    if case['id'] == 'alex-general-ed-adequate':
        return 'Alex B - Grade 4'
    return case['id'].capitalize() + ' - Grade ' + str(case['grade'])

def case_focus(case):
    if case['id'] == COMPLETE_RECORD['caseId']:
        return 'Complete Q1-Q9 source record; multilingual reading case. Advance reading recommended.'
    return case.get('practiceFocus') or {
        'alex': 'Reading evidence and instruction needed',
        'alex-general-ed-adequate': 'Same reading record with a changed instruction premise',
        'jordan': 'Academic performance and concerns beyond the scores',
    }.get(case['id'], ', '.join(case.get('selection', {}).get('academicFocus', [])))

def rows_for(case):
    ids = set(case.get('scoreRowIds', []))
    return [r for r in DATA['scoreRows'] if r['id'] in ids] + case.get('extraScoreRows', case.get('inlineScores', []))

def alex_scores(rows):
    halves = []
    for groups in (DATA['scoreGroups'][:3], DATA['scoreGroups'][3:]):
        cells, commands = [], []
        for group in groups:
            start = len(cells)
            cells.append([p(group['label'], 'score'), p('SS' if group['scaleId'] == 'standard' else 'Scaled', 'score')])
            commands.append(('BACKGROUND', (0, start), (-1, start), PALE))
            for row in rows:
                if row.get('groupId') == group['id']:
                    cells.append([p(row['label'], 'score'), p(row['value'], 'score')])
        t = Table(cells, colWidths=[212, 40], hAlign='LEFT')
        t.setStyle(TableStyle(commands + [('GRID', (0, 0), (-1, -1), .4, RULE), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
        halves.append(t)
    t = Table([[halves[0], '', halves[1]]], colWidths=[252, 12, 252], hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    return t

def add_sources(story):
    content = [p('Sources and interpretation', 'heading'),
        p('Use the current Maine form and the full evaluation record for actual team decisions. These prompts paraphrase the form. More evidence needed is a training response, not an additional official checkbox. No separate adverse effect form is required for SLD.', 'small')]
    for source in DATA['sources']:
        content.append(link(source['label'], source['url']))
    story.append(KeepTogether(content))

def record_review(case, facilitator=False):
    review = RECORD_REVIEW['cases'].get(case['id'])
    if not review:
        return []
    story = [p(case_label(case) + ' record-review scenario', 'title'),
        p(review['scenario']), p('Stage 1: audit the excerpts', 'heading'),
        p(review['stage1']), p('Stage 2: rehearse using supplied premises', 'heading'),
        p(review['stage2']), p('Completing the actual form', 'heading'),
        p(review['completionReminder'], 'small'),
        p('Procedural record: not established here', 'heading'),
        p(review['recordInventory'][-1]['supplied'] + ' ' + review['recordInventory'][-1]['request'], 'small')]
    if facilitator:
        story += [PageBreak(), p('Stage 1 example responses', 'title'),
            p('These examples assess evidence awareness. The later YES/NO selections are Stage 2 only, not the answer key for this audit.')]
        for example in review['stage1Examples']:
            story += [p(example['label'], 'heading'), p(example['entry']),
                p('Why: ' + example['why'], 'small')]
    else:
        story += [p('Your response', 'heading'),
            p('Use the worksheet discussion and continuation fields to record: what is supplied, what is missing, who should provide it, and which question it would clarify. Prefix your entries Stage 1 or Stage 2. The inventory on the next page is a record-checking aid, not an answer about eligibility.')]
    inventory = table([['Form area', 'What the excerpt supplies', 'What to retrieve and from whom']] +
        [[row['form'].split(':', 1)[0], row['supplied'], row['request']] for row in review['recordInventory'][:-1]], [62, 192, 262], 'inventory')
    inventory.setStyle(TableStyle([('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story += [PageBreak(), p('Samira: record inventory', 'title'),
        p('Missing from this handout does not mean missing from the school file. Retrieve and review records before finalizing an actual determination. The requests below are case-specific examples, not a required universal test battery.', 'small'),
        inventory,
        p('No new test results are released in Stage 2. Its supplied findings do not fill these documentation gaps.', 'small')]
    return story


def worksheet(case, fillable=True):
    story = [PageBreak(), p(case_label(case) + ' reasoning worksheet', 'title'),
        p('Record sources, findings, assumptions, skipped questions and missing evidence. Boxes have character and visible-space limits; use the labeled continuation page when full.', 'body')]
    for i, step in enumerate(DATA['formSteps']):
        if i in (3, 6):
            story += [PageBreak(), p(case_label(case) + ' reasoning continued', 'title')]
        content = [p(step['label'], 'heading'), p(step['prompt'])]
        if step['id'] == 'Q1':
            content.append(p('If NO, identify affected areas: ' + '; '.join(DATA['academicAreas']) + '. Verify either answer with sources and data.', 'small'))
            content.append(p('When cultural or linguistic background places the child outside the achievement test norm group, the form calls for age or grade equivalents, not standardized scores, and work samples or other performance data through a multi-tiered problem-solving approach. This condition does not apply automatically to every multilingual learner; do not invent or convert scores.', 'small'))
        if step.get('subparts'):
            content.append(p('Complete the four separate Q3 determinations and verifications on the detailed worksheet page. Use this space to summarize the route.', 'small'))
        if step.get('evidenceCategories'):
            content.append(p('Complete all eight Q4 evidence cells on the detailed worksheet page. Use this space to explain the relevant pattern and your YES or NO.', 'small'))
        if step['id'] == 'Q5':
            content.append(p('The observation must address the learning environment, including the regular classroom, and the areas of difficulty. Identify the setting, task, supports and source of the observations.', 'small'))
        if step['id'] == 'Q7':
            content.append(p('If NO, identify each assessment concerned and explain why it is not valid or reliable, or was not performed by a qualified person. The printed form does not give Q7 an automatic stopping or skip branch.', 'small'))
        if step.get('options'):
            content.append(p('Response options: ' + ' | '.join(o['label'] for o in step['options']), 'small'))
        if step.get('routes'):
            content.append(p('Form route: ' + '; '.join(r['answer'].replace('_', ' ') + ' to ' + r['next'] for r in step['routes']) + '.', 'small'))
        content.append(Response(case['id'] + '_' + step['id'], step['label'], 50, fillable))
        content.append(Spacer(1, 7))
        story.append(KeepTogether(content))
    story += [PageBreak(), p(case_label(case) + ' Q3 verification', 'title'),
        p('For each subpart, record YES or NO and the evidence source and finding supporting that determination. The question asks whether the factor is the PRIMARY cause of the lack of achievement, not simply whether the factor is present. If this question was bypassed, identify the earlier form route.', 'body'),
        p('Any YES: proceed to Q8 (no SLD qualification under this form). All NO: proceed to Q4. A pending training response is not an additional official checkbox.', 'small')]
    q3 = next(step for step in DATA['formSteps'] if step['id'] == 'Q3')
    for part in q3['subparts']:
        label = part['id'] + '. ' + part['label']
        story.append(KeepTogether([p(label, 'heading'),
            p('YES / NO and verification (source, finding, and why it supports this determination):', 'small'),
            Response(case['id'] + '_' + part['id'], label + ' determination and verification', 65, fillable, maxlen=450), Spacer(1, 8)]))
    story += [PageBreak(), p(case_label(case) + ' Q4 evidence matrix', 'title'),
        p('Provide a source and finding for both strengths and weaknesses in each evidence stream. State when the record does not supply a finding; do not invent one. If Q4 was bypassed, identify that route. Explain the overall pattern in the main Q4 response.', 'body')]
    streams = [
        ('a', 'Response to scientific research-based intervention, including general education interventions'),
        ('b', 'Classroom performance data'),
        ('c', 'Achievement: district core curriculum summative, State, and/or published nationally norm-referenced assessments'),
        ('d', 'Psychological processing: standardized measures, including standardized composite scores from nationally norm-referenced measures'),
    ]
    for part, label in streams:
        cells = [[p('Verification of strengths', 'small'), p('Verification of weaknesses', 'small')],
            [Response(case['id'] + '_Q4' + part + '_strengths', 'Q4' + part + ' strengths: source and finding', 84, fillable, 246, maxlen=350),
             Response(case['id'] + '_Q4' + part + '_weaknesses', 'Q4' + part + ' weaknesses: source and finding', 84, fillable, 246, maxlen=350)]]
        matrix = Table(cells, colWidths=[258, 258], hAlign='LEFT')
        matrix.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
        story.append(KeepTogether([p('Q4' + part + '. ' + label, 'matrixheading'), matrix, Spacer(1, 7)]))
    story.append(p('Q4d cannot be replaced by classroom observations or achievement scores. Consider whether the pattern is consistent with the child\'s cultural and linguistic population and whether assessments are appropriate.', 'small'))
    story += [PageBreak(), p(case_label(case) + ' discussion notes', 'title')]
    prompts = [
        ('evidence', 'Which findings support your interpretation and which complicate it? Identify each source and one interpretation limit.'),
        ('next', 'What information would you request next, from whom, and which decision would it clarify? What support can continue now?'),
        ('instruction', 'Distinguish access supports from teaching adaptations. What establishes whether the adaptations are necessary?'),
        ('family', 'Explain your current reasoning to the student and family, including strengths, uncertainty, and a next step.'),
    ]
    for key, prompt in prompts:
        story.append(KeepTogether([p(prompt, 'heading'), Response(case['id'] + '_' + key, prompt, 65, fillable, maxlen=450), Spacer(1, 12)]))
    story += [PageBreak(), p(case_label(case) + ' continuation', 'title'),
        p('Label each entry with its question or cell, such as Q2 or Q4b strengths. Continue your evidence and reasoning here when a response box is full. If this page fills, use an additional labeled page. Do not add findings that are not in the case record.'),
        Response(case['id'] + '_continuation', 'Question or cell reference and continued response', 480, fillable, maxlen=2800),
        Spacer(1, 10), p('Before sharing or printing, save a copy, reopen it, and check that every response is present and fully visible. Viewer behavior can vary; check the printed or print-preview pages too.', 'small')]
    return story

def participant(case, fillable=True):
    if case['id'] == COMPLETE_RECORD['caseId']:
        return complete_participant(case, fillable)
    story = record_review(case)
    if story:
        story.append(PageBreak())
    story += [p(case_label(case), 'title'), p(case_focus(case)),
        p('Participant case record | Supplement to the Maine SLD workshop | October 13, 2026', 'small'),
        p('Read the record before choosing a supported provisional response. This case is fictional: names, histories, observations, scores and progress values are simulated. They are not diagnostic cutoffs, eligibility rules or required waiting periods.', 'small'),
        p('Language and learning context', 'heading'), p(case['languageContext']), p('Case record', 'heading')]
    if case.get('baseCaseId'):
        base = next(c for c in DATA['cases'] if c['id'] == case['baseCaseId'])
        story.append(p('Shared Alex record', 'heading'))
        story += [p(item) for item in base['narrative']]
        for item in base.get('evidenceSupplement', []):
            if item['id'] == 'instruction-unknown':
                continue
            story += [p(item['title'], 'heading'), p(item['text'])]
        story.append(p('Changed premise for Alex B', 'heading'))
    for i, item in enumerate(case['narrative']):
        story.append(p(f'Record {i + 1}. ' + (item if isinstance(item, str) else item.get('body', item.get('text', '')))))
    for item in case.get('evidenceSupplement', []):
        story += [p(item['title'], 'heading'), p(item['text'])]
    context = case.get('contextEvidence', [])
    if context:
        story.append(p('Additional context from the record', 'heading'))
        for item in context:
            story.append(p(item if isinstance(item, str) else json.dumps(item, ensure_ascii=False)))
    story.append(p('Exercise assumptions and limits', 'heading'))
    story += [p(a, 'small') for a in case.get('assumptions', [])]
    rows = rows_for(case)
    if len(rows) == 52:
        story.append(PageBreak())
    story.append(p(case_label(case) + ' assessment record', 'heading' if len(rows) != 52 else 'title'))
    fallback = 'All results below are simulated. Interpret them with the full case record. Standard scores use mean 100 and SD 15; scaled scores use mean 10 and SD 3. These scales must not be compared as if they use the same units. Composite and index values are independently stipulated, not calculated from these subtests. No percentile, confidence interval or significance test is inferred.'
    if case['id'] == 'jordan':
        fallback = 'The single fictional working-memory result is a standard score (mean 100, SD 15). The test and norm comparison are not specified. Do not infer a diagnosis, score cutoff, percentile, or intellectual ability from it. Academic adequacy across all eight areas is a separate exercise assumption.'
    story.append(p(case.get('scoreGuidance', fallback)))
    if len(rows) == 52:
        story.append(alex_scores(rows))
        story.append(PageBreak())
        story.append(p(case_label(case) + ' references and tasks', 'title'))
        story.append(p('All scores above are age-based comparisons. WISC-V: September 15, 2026. WIAT-4: September 17, 2026. Age at evaluation: 9 years, 2 months. Secondary or complementary WISC-V tests, Alphabet Writing Fluency and Orthographic Choice are not included.', 'small'))
    elif rows:
        group_ids = list(dict.fromkeys(r.get('groupId') or r.get('test') or 'Unspecified assessment' for r in rows))
        for group_id in group_ids:
            group = next((g for g in DATA['scoreGroups'] if g['id'] == group_id), None)
            group_rows = [r for r in rows if (r.get('groupId') or r.get('test') or 'Unspecified assessment') == group_id]
            story.append(p(group['label'] if group else str(group_id), 'heading'))
            story.append(table([['Result', 'Score', 'Scale / comparison']] + [[r['label'], r['value'], ('Scaled' if r['scaleId'] == 'scaled' else 'SS') + ' / ' + r.get('comparison', 'age-based')] for r in group_rows], [316, 50, 150]))
            story.append(Spacer(1, 8))
        dates = sorted(set(r.get('administrationDate', '') for r in rows) - {''})
        if dates:
            story.append(p('Simulated administration dates: ' + ', '.join(dates) + '.', 'small'))
    else:
        story.append(p('No standardized score table is supplied for this case. Use the narrative evidence, including its stated limits, and identify what further information would be needed. Do not invent scores.', 'body'))
    story.append(p('Discussion focus', 'heading'))
    for task in case.get('tasks', []):
        story.append(p(task.get('prompt', ''), 'small'))
    add_sources(story)
    story += worksheet(case, fillable)
    return story

def complete_participant(case, fillable=True):
    record = COMPLETE_RECORD
    story = [p(case_label(case) + ' complete practice record', 'title'),
        p('Fictional source summaries | PDF workshop edition ' + record['version'] + ' | October 13, 2026', 'small')]
    story += [p(item) for item in record['overview']]
    story += [p('Official form header information', 'heading'),
        table([['Header field', 'Fictional training information']] + record['headerRows'], [178, 338])]
    for section in record['sections']:
        if section.get('pageBreak', True):
            story.append(PageBreak())
        story.append(p(section['id'] + '. ' + section['title'], 'recordtitle' if section.get('pageBreak', True) else 'heading'))
        story += [p(item, 'recordbody') for item in section.get('paragraphs', [])]
        if section.get('table'):
            grid = section['table']
            columns = len(grid['headers'])
            widths = grid.get('widths', [WIDTH / columns] * columns)
            story += [table([grid['headers']] + grid['rows'], widths, 'inventory'), Spacer(1, 8)]
        story += [p(item, 'small') for item in section.get('notes', [])]
    story += [PageBreak(), p('Using the record to complete the form', 'title'),
        p(record['completionNote'])]
    story += [p(item) for item in record['tasks']]
    add_sources(story)
    story.append(p('Assessment references', 'heading'))
    story += [link(source['label'], source['url']) for source in record.get('sources', [])]
    story += worksheet(case, fillable)
    return story


def menu(fillable=False):
    story = ([PageAnchor('case-menu')] if fillable else []) + [p('Choose an SLD practice case', 'title'),
        p('Choose a learning concern and context. Every packet contains its fictional record and the same Q1 to Q9 worksheet. Case choices do not indicate conclusions.'),
        p('For the 12 minute workshop activity, read the record in advance and concentrate on its discussion focus. Full-form completion needs a longer activity, especially for Samira.', 'small')]
    for case in DATA['cases']:
        selection = case.get('selection', {})
        heading = Paragraph(f'<link href="#case-{case["id"]}" color="#23665B"><u>{escape(case_label(case))}</u></link>', STYLES['heading']) if fillable else p(case_label(case), 'heading')
        story += [heading, p(case_focus(case)),
            p('Context: ' + '; '.join(selection.get('contexts', [case['languageContext']])), 'small')]
    story += [p('Working with the packets', 'heading'),
        p('Select a case name or use the PDF bookmarks to jump to its record. Each case has separate fillable fields and a continuation page. Back to case list returns here. Save, reopen and check your responses before printing. Facilitator answers are not included.' if fillable else 'Individual PDFs are fillable and printable; save, reopen and check responses before printing. Use each case\'s fillable continuation page for longer answers. This combined packet is for printing. Facilitator guidance is separate.', 'small'),
        p('Every record includes strengths and family or student perspectives. Language, culture, mobility, and access to instruction require case-specific inquiry; none alone establishes or excludes a disability.', 'small')]
    return story

def facilitator():
    story = [p('SLD case facilitator supplement', 'title'),
        p('Use these seven cases to practice connecting evidence to the Maine SLD form. Participants can choose a learning concern and context from the case menu. Use the same evidence reasoning process for every case.'),
        p('Workshop integration', 'heading'),
        p('Share the case menu and current Maine form before the session. Participants choose by grade, academic concern, or context. Distribute selected participant packets and retain this guide. Teams can assign recorder, evidence mapper, and challenger roles.'),
        p('For a 45-60 minute session, assign case reading in advance. For the 12 minute activity on slides 18 and 19: select evidence for 3 minutes, discuss focus questions for 6, then share a provisional recommendation and evidence request for 3. Add reading time if needed. The full worksheet supports extended practice; all nine questions need not be completed during this round.'),
        p('Use Alex on slides 20 and 21 to contrast identification and instruction need, and Jordan on slides 22 and 23 for comparison. Invite other teams to contribute one insight.'),
        p('Facilitation and quality checks', 'heading'),
        p('Identify each source: observation, student or family report, teaching record, assessment, assumption, or unresolved question. Accept supported provisional reasoning; a count of low scores cannot replace interpretation or resolve missing evidence.'),
        p('Compare Marisol and Samira through language and literacy history, instruction, assessment validity, appropriate comparisons, and qualified interpretation. No language proficiency waiting period applies. Eligible learners can receive language services and special education together.'),
        p('For Q9, ask what general education provides and what establishes the necessity of a disability-related teaching adaptation. Intensity, staff, program, or placement alone does not define SDI. Do not withdraw necessary support to prove need.'),
        p('These fictional practice cases are not a required evaluation battery or a substitute for qualified team judgment. Ask participants to explain how each source supports a form entry and to identify what remains uncertain.', 'small')]
    add_sources(story)
    for case in DATA['cases']:
        if case['id'] == COMPLETE_RECORD['caseId']:
            story += [PageBreak(), p(case_label(case) + ' facilitator guidance', 'title'),
                p('Use the Samira participant record with its matching worked answer key. Ask participants to cite sources S1-S9 when explaining their Q1-Q9 entries, including the strengths and limits of the evidence.'),
                link('Open the complete Samira facilitator key', '../sld-facilitator-keys/samira-facilitator-key.pdf')]
            continue
        story += [PageBreak(), p(case_label(case) + ' facilitator guidance', 'title'), p(case['debrief']['summary']), p('Discussion focus', 'heading')]
        for task in case.get('tasks', []):
            story.append(p(task.get('prompt', ''), 'small'))
        for step in DATA['formSteps']:
            response = case['recommendedResponses'][step['id']]
            story += [p(step['id'] + ' ' + response['responseLabel'], 'heading'), p(response['feedback'])]
        for label, key, fallback in [('Q9 explanation', 'q9Example', 'q9Summary'), ('Family explanation', 'familyExplanation', 'familyExample'), ('Interpretation caution', 'caution', 'caution')]:
            value = case['debrief'].get(key, case['debrief'].get(fallback))
            if value:
                story += [p(label, 'heading'), p(value)]
        if case['debrief'].get('nextEvidence'):
            story.append(p('Next evidence to seek', 'heading'))
            story += [p(v) for v in case['debrief']['nextEvidence']]
    return story

def index_html():
    cards = []
    for case in DATA['cases']:
        sel = case.get('selection', {})
        attrs = ' '.join(f'data-{key}="{html.escape(value, quote=True)}"' for key, value in {
            'grade': str(case['grade']), 'focus': '|'.join(sel.get('academicFocus', [])), 'context': '|'.join(sel.get('contexts', []))}.items())
        cards.append(f'<article {attrs}><h2>{html.escape(case_label(case))}</h2><p>{html.escape(case_focus(case))}</p><p class="context">{html.escape("; ".join(sel.get("contexts", [])))}</p><a href="{case["id"]}-participant.pdf">Open fillable case packet</a></article>')
    document = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SLD practice case handouts</title>
<style>*{box-sizing:border-box}body{margin:0;color:#16343b;background:#f5f7f6;font:16px/1.55 system-ui,sans-serif;letter-spacing:0}main{max-width:1050px;margin:auto;padding:32px 24px}h1{font-size:30px;line-height:1.2;margin:0 0 12px}h2{font-size:20px;line-height:1.3}a{color:#155b80;text-underline-offset:3px}a:focus-visible,select:focus-visible,button:focus-visible{outline:3px solid #a04b16;outline-offset:3px}.filters{display:flex;gap:16px;flex-wrap:wrap;border-block:1px solid #cad6d1;padding:18px 0;margin:24px 0}label{display:flex;flex-direction:column;gap:6px;flex:1;min-width:180px;font-weight:600}select,button{font:inherit;padding:9px;border:1px solid #82988e;border-radius:4px;background:white;color:#16343b;max-width:100%}#cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:20px}article{border:1px solid #cad6d1;border-top:4px solid #23665b;background:white;padding:20px;border-radius:4px}article[hidden]{display:none}.context{font-size:14px;color:#52656a}.downloads{border-top:1px solid #cad6d1;margin-top:32px;padding-top:16px}.downloads a{display:block;margin:12px 0}footer{font-size:14px;margin-top:24px;color:#52656a}button{align-self:end;cursor:pointer}</style>
<main><h1>SLD practice case handouts</h1><p>Choose a grade, learning concern, or context for your workshop discussion.</p><div class="filters"><label>Grade<select id="grade"><option value="">All grades</option></select></label><label>Academic focus<select id="focus"><option value="">All areas</option></select></label><label>Context<select id="context"><option value="">All contexts</option></select></label><button id="reset" type="button">Reset filters</button></div><p id="count" role="status" aria-live="polite"></p><section id="cases" aria-label="Case choices">CARDS</section><p id="empty" hidden>No cases match these choices. Reset a filter to broaden the results.</p><section class="downloads"><h2>Workshop materials</h2><a href="SLD-Participant-Fillable-Case-Pack.pdf">All participant cases - fillable packet</a><a href="SLD-Participant-Case-Pack.pdf">All participant cases - print packet</a><a href="SLD-Facilitator-Supplement.pdf">Facilitator guidance - separate from participant packets</a></section><footer>All cases and data are fictional. These are practice materials, not real student records or eligibility determinations. Workshop materials | October 13, 2026. Individual PDFs contain fillable response fields.</footer></main>
<script>const cards=[...document.querySelectorAll('article')],fields=['grade','focus','context'];for(const key of fields){const el=document.getElementById(key);const vals=[...new Set(cards.flatMap(c=>c.dataset[key].split('|')).filter(Boolean))].sort();for(const v of vals){const o=document.createElement('option');o.value=v;o.textContent=v;el.append(o)}el.addEventListener('change',filter)}function filter(){let n=0;for(const c of cards){c.hidden=!fields.every(k=>!document.getElementById(k).value||c.dataset[k].split('|').includes(document.getElementById(k).value));if(!c.hidden)n++}document.getElementById('count').textContent=n+' of '+cards.length+' cases';document.getElementById('empty').hidden=n>0}document.getElementById('reset').addEventListener('click',()=>{fields.forEach(k=>document.getElementById(k).value='');filter()});filter();</script></html>'''
    document = document.replace('</style>', '@media(max-width:600px){.filters label{flex-basis:100%;min-width:0}.filters button{align-self:flex-start}}</style>')
    (OUT / 'Choose-a-Case.html').write_text(document.replace('CARDS', ''.join(cards)), encoding='utf-8')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'dataVersion': DATA['metadata']['version'], 'samiraRecordVersion': COMPLETE_RECORD['version'], 'caseIds': [c['id'] for c in DATA['cases']], 'files': []}
    for case in DATA['cases']:
        path = build_pdf(case['id'] + '-participant.pdf', participant(case), case_label(case))
        reader = PdfReader(path)
        fields = reader.get_fields() or {}
        expected = {case['id'] + '_' + key for key in response_keys()}
        assert set(fields) == expected, (path, set(fields), expected)
        widgets = [a.get_object() for page in reader.pages for a in page.get('/Annots', []) if a.get_object().get('/Subtype') == '/Widget']
        assert len(widgets) == len(expected)
        assert all(w.get('/AP', {}).get('/N') is not None and w.get('/V', '') == '' for w in widgets)
        manifest['files'].append({'name': path.name, 'pages': len(reader.pages), 'fields': len(fields)})
    story = menu()
    for case in DATA['cases']:
        story += [PageBreak()] + participant(case, False)
    path = build_pdf('SLD-Participant-Case-Pack.pdf', story, 'Participant print pack')
    manifest['files'].append({'name': path.name, 'pages': len(PdfReader(path).pages)})
    story = menu(fillable=True)
    for case in DATA['cases']:
        story += [PageBreak(), PageAnchor('case-' + case['id'])] + participant(case, True)
    path = build_pdf('SLD-Participant-Fillable-Case-Pack.pdf', story, 'Participant fillable pack', navigation=True)
    reader = PdfReader(path)
    expected = {case['id'] + '_' + key for case in DATA['cases'] for key in response_keys()}
    assert set(reader.get_fields() or {}) == expected
    widgets = [a.get_object() for page in reader.pages for a in page.get('/Annots', []) if a.get_object().get('/Subtype') == '/Widget']
    assert len(widgets) == len(expected)
    assert all(w.get('/V', '') == '' and w.get('/AP', {}).get('/N') is not None for w in widgets)
    # Individual case page counts also locate the matching sections in the combined packet.
    case_pages = {item['name']: item['pages'] for item in manifest['files'] if item.get('fields')}
    offset = len(reader.pages) - sum(case_pages.values())
    assert offset >= 1
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    writer.add_outline_item('Choose a case', 0)
    for case in DATA['cases']:
        assert case_label(case) in (reader.pages[offset].extract_text() or '')
        writer.add_outline_item(case_label(case), offset)
        offset += case_pages[case['id'] + '-participant.pdf']
    assert offset == len(reader.pages)
    with path.open('wb') as stream:
        writer.write(stream)
    manifest['files'].append({'name': path.name, 'pages': len(reader.pages), 'fields': len(expected)})
    path = build_pdf('SLD-Facilitator-Supplement.pdf', facilitator(), 'Facilitator only')
    manifest['files'].append({'name': path.name, 'pages': len(PdfReader(path).pages)})
    index_html()
    chooser = OUT / 'Choose-a-Case.html'
    chooser.write_text(chooser.read_text(encoding='utf-8').replace('<a href="SLD-Facilitator-Supplement.pdf">Facilitator guidance - separate from participant packets</a>', ''), encoding='utf-8')
    with zipfile.ZipFile(OUT / 'SLD-Participant-Handouts.zip', 'w', zipfile.ZIP_DEFLATED) as bundle:
        for file in [chooser, OUT / 'SLD-Participant-Case-Pack.pdf', OUT / 'SLD-Participant-Fillable-Case-Pack.pdf'] + [OUT / (c['id'] + '-participant.pdf') for c in DATA['cases']]:
            bundle.write(file, file.name)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    main()
