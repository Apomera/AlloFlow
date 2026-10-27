import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let pipeline;
const model = vi.fn(async () => '{}');
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
const record = (data = {}) => ({ id: 'cornell-example', type: 'note-taking', title: 'Decision record', meta: '', data: {
  templateType: 'cornell-notes',
  cues: [{ id: 'cue-1', text: 'Our reason', guidance: 'Use the companion case.\nExplain <why> & ask a question.' }, { id: 'cue-2', text: 'Next check', guidance: 'Name one check before deciding.' }],
  notes: [{ id: 'note-1', text: '' }, { id: 'note-2', text: '' }], summary: '', connections: '', ...data,
} });

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: model, callGeminiVision: model, callImagen: model,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Resource', state: {},
  });
});

describe('Cornell print copies preserve guidance and usable response space', () => {
  it('prints authored guidance as text beside blank ruled responses without adding an AI task', () => {
    const input = record(), before = JSON.stringify(input);
    const doc = parse(pipeline.generateResourceHTML(input, false, {}, { isWorksheet: true }));
    const guidance = [...doc.querySelectorAll('[data-cornell-print-guidance]')];
    expect(guidance.map(node => node.textContent)).toEqual(input.data.cues.map(cue => cue.guidance));
    expect(guidance[0].querySelector('why')).toBeNull();
    expect(guidance[0].style.whiteSpace).toBe('pre-wrap');
    const spaces = [...doc.querySelectorAll('[data-cornell-writing-space="notes"]')];
    expect(spaces).toHaveLength(2);
    expect(spaces.every(space => space.style.height === '96px' && space.children.length === 4)).toBe(true);
    expect(doc.querySelector('[data-cornell-summary-space]').textContent).toBe('Summary');
    expect(doc.body.textContent).not.toContain('No summary written yet');
    expect(doc.body.textContent).not.toContain('Student has not requested AI feedback');
    expect(doc.body.textContent).not.toContain('Summary (optional)');
    expect(JSON.stringify(input)).toBe(before);
    expect(model).not.toHaveBeenCalled();
  });

  it('retains filled notes, summary, connections and actual feedback in a worksheet export', () => {
    const input = record({ notes: [{ text: 'A <lamp> helps here.\nOne position only.' }, { text: '' }], summary: 'We kept our reason & named a check.', connections: 'A connection <to> another decision.', feedbackCount: 2 });
    const before = JSON.stringify(input), doc = parse(pipeline.generateResourceHTML(input, false, {}, { isWorksheet: true }));
    expect(doc.body.textContent).toContain(input.data.notes[0].text);
    expect(doc.body.textContent).toContain(input.data.summary);
    expect(doc.body.textContent).toContain(input.data.connections);
    // fix1025 C: the AI-feedback badge is teacher-only and never prints on a student worksheet.
    expect(doc.body.textContent).not.toContain('Student requested feedback 2×');
    expect(parse(pipeline.generateResourceHTML(input, true, {}, { isWorksheet: false })).body.textContent).toContain('Student requested feedback 2×');
    expect(doc.querySelectorAll('[data-cornell-writing-space="notes"]')).toHaveLength(1);
    expect(doc.querySelector('[data-cornell-summary-space]')).toBeNull();
    expect(doc.querySelector('lamp')).toBeNull();
    expect(JSON.stringify(input)).toBe(before);
  });

  it('keeps normal exports compact and their existing empty-state messages', () => {
    const doc = parse(pipeline.generateResourceHTML(record(), false, {}, { isWorksheet: false }));
    expect(doc.querySelectorAll('[data-cornell-print-guidance]')).toHaveLength(2);
    expect(doc.querySelector('[data-cornell-writing-space]')).toBeNull();
    expect(doc.body.textContent).toContain('No summary written yet');
    expect(doc.body.textContent).not.toContain('Student has not requested AI feedback');
    expect(parse(pipeline.generateResourceHTML(record(), true, {}, { isWorksheet: false })).body.textContent).toContain('Student has not requested AI feedback');
  });

  it('provides a blank row for an empty worksheet instead of reporting missing student work', () => {
    const doc = parse(pipeline.generateResourceHTML(record({ cues: [], notes: [] }), false, {}, { isWorksheet: true }));
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(doc.querySelectorAll('[data-cornell-writing-space="notes"]')).toHaveLength(1);
    expect(doc.body.textContent).not.toContain('No rows filled in yet');
    expect([...doc.querySelectorAll('thead th')].every(cell => cell.getAttribute('scope') === 'col')).toBe(true);
  });

  it('preserves every authored notebook prompt in both Katie packs without exposing a quiz key', () => {
    const filenames = ['academic_discourse_reading_space_grade6', 'academic_discourse_more_practice_grade6', 'reading_decisions_grade6'];
    let checked = 0;
    for (const filename of filenames) {
      const pack = JSON.parse(readFileSync(`allopacks/${filename}.allopack.json`, 'utf8'));
      for (const item of pack.history.filter(resource => resource.type === 'note-taking')) {
        const doc = parse(pipeline.generateResourceHTML(item, false, {}, { isWorksheet: true }));
        expect([...doc.querySelectorAll('[data-cornell-print-guidance]')].map(node => node.textContent)).toEqual(item.data.cues.map(cue => cue.guidance));
        expect(doc.querySelectorAll('[data-cornell-writing-space="notes"]')).toHaveLength(item.data.notes.length);
        checked++;
      }
    }
    expect(checked).toBe(5);
    const html = pipeline.generateFullPackHTML([record(), { id: 'quiz', type: 'quiz', title: 'Reflection', data: { questions: [{ type: 'short-answer', question: 'Explain your reason.', expectedAnswer: 'PRIVATE TEACHER ANSWER' }], reflections: [] } }], 'Student worksheet', true, {}, { includeTeacherKey: false });
    const doc = parse(html);doc.querySelectorAll('script,style').forEach(node => node.remove());
    expect(doc.body.textContent).not.toContain('PRIVATE TEACHER ANSWER');
    expect(model).not.toHaveBeenCalled();
  });

  it.each([
    ['lab-report', { question: 'Lab question stays', conclusion: 'Lab conclusion stays' }, 'Lab conclusion stays'],
    ['reading-response', { title: 'Reading', thinkings: 'Reading response stays' }, 'Reading response stays'],
    ['double-entry', { entries: [{ quote: 'Source quote stays', response: 'Journal response stays' }] }, 'Journal response stays'],
    ['guided-notes', { blanks: [{ before: 'A ', studentAnswer: 'Guided answer stays', after: '.' }] }, 'Guided answer stays'],
    ['q-and-a', { pairs: [{ question: 'Question stays', answer: 'Study answer stays' }] }, 'Study answer stays'],
  ])('keeps filled %s exports unchanged by the Cornell workspace', (templateType, data, expected) => {
    for (const isWorksheet of [true, false]) {
      const doc = parse(pipeline.generateResourceHTML(record({ ...data, templateType }), false, {}, { isWorksheet }));
      // fix1025 C: Q&A model answers are generator-seeded, so a worksheet prints the question with lines instead.
      if (templateType === 'q-and-a' && isWorksheet) expect(doc.body.textContent).not.toContain(expected);
      else expect(doc.body.textContent).toContain(expected);
      expect(doc.querySelector('[data-cornell-writing-space]')).toBeNull();
      expect(doc.querySelector('[data-cornell-print-guidance]')).toBeNull();
    }
  });
});

describe('concept sort print methods', () => {
  const item = { id: 'sort', type: 'concept-sort', title: 'Read the record', data: { categories: [{ id: 'reply', label: 'Reply recorded' }], items: [{ id: 'one', content: 'A contributor asks a useful question.', categoryId: 'reply', image: 'data:image/png;base64,iVBORw0KGgo=' }] } };
  it('offers writing or cutting without assigning a fixed visual learning style', () => {
    const doc = parse(pipeline.generateResourceHTML(item, false, {}, { isWorksheet: true }));
    expect(doc.body.textContent).toContain('Write a category beside each item, or cut and sort');
    expect(doc.body.textContent).toContain('Use the written information to decide where each belongs.');
    expect(doc.body.textContent).not.toContain('visual learners');
    expect(doc.body.textContent).toContain('Reply recorded');
  });
  it('retains the existing screen controls for interactive exports', () => {
    const doc = parse(pipeline.generateResourceHTML(item, false, {}, { isWorksheet: false }));
    expect(doc.body.textContent).toContain('Select an item, then choose the named Place button');
    expect(doc.querySelector('.alloflow-cs-place-btn')).not.toBeNull();
  });
});
