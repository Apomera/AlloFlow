// 2026-10-25 fix lane F (Activities view, DBQ, Timeline).
//  F1  Discussion and Jigsaw learners can answer; answers go to studentResponses, never prefilled
//  F2  DBQ teacher-asserted provenance replaces the "not recorded" placeholders for students
//  F3  DBQ tells the teacher when documents are missing; custom docs match the teacher's text
//  F4  DBQ student-facing text goes through t() with English fallbacks
//  F5  Timeline shows the teacher a "not yet checked" badge until verification has run
// Mutation hooks: FIX1025_F_DIR (built modules), FIX1025_F_DISPATCHER (dispatcher source).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const DIR = process.env.FIX1025_F_DIR || process.cwd();
const DISPATCHER = process.env.FIX1025_F_DISPATCHER || 'generate_dispatcher_source.jsx';
let React, createRoot, act, root, host, Brainstorm, DbqView, TimelineView;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.React = globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  for (const name of ['view_brainstorm_module.js', 'view_dbq_module.js', 'view_timeline_module.js']) {
    new Function(readFileSync(join(DIR, name), 'utf8'))();
  }
  Brainstorm = window.AlloModules.BrainstormView;
  DbqView = window.AlloModules.DbqView;
  TimelineView = window.AlloModules.TimelineView;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); });
function draw(element) {
  if (!host) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  act(() => root.render(element));
}
function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
  act(() => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}

// ---------------------------------------------------------------- F1
const activities = () => ({
  id: 'act-1', type: 'brainstorm',
  data: [
    { kind: 'idea', title: 'Warm-up', description: 'Talk', connection: 'x' },
    { kind: 'discussion', title: 'River talk', protocol: 'think-pair-share', openingQuestion: 'Why do rivers flood?',
      questionSets: [{ depth: 'literal', questions: ['', 'What does the text say about rain?'] }, { depth: 'evaluative', questions: ['Should towns build levees?'] }],
      talkStems: { agree: ['I agree because'] }, facilitationNotes: 'TEACHER-ONLY-NOTES', lookFors: ['TEACHER-LOOKFOR'] },
    { kind: 'jigsaw', title: 'Water cycle jigsaw', groupSize: 3,
      chunks: [{ label: 'Evaporation', expertPacket: 'Heat lifts water.', teachBack: { keyPoints: ['heat'], checkQuestions: ['What lifts water?'] } }],
      accountabilityCheck: [{ q: 'Name one stage of the water cycle.', answer: 'SECRET-ANSWER-KEY' }] }
  ]
});
function brainstorm(resource, extra = {}) {
  const handleStudentInput = vi.fn();
  draw(React.createElement(Brainstorm, {
    t: () => '', generatedContent: resource, isTeacherMode: false, isEditingBrainstorm: false,
    isGeneratingGuide: {}, isGeneratingWorksheet: {}, isGeneratingWorksheetCover: {},
    handleBrainstormChange: () => {}, renderFormattedText: v => v, getRows: () => 3,
    studentResponses: {}, handleStudentInput, ...extra
  }));
  return handleStudentInput;
}
const fields = () => [...host.querySelectorAll('textarea[data-activity-response]')];

describe('F1: Activities learners can answer discussion questions and jigsaw checks', () => {
  it('gives every discussion question, the opening question and each accountability check an answer field', () => {
    brainstorm(activities());
    // opening + 2 non-blank discussion questions + 1 accountability check
    expect(fields()).toHaveLength(4);
    expect(fields().every(field => field.getAttribute('aria-label').startsWith('Your answer: '))).toBe(true);
    expect(fields().some(field => field.getAttribute('aria-label').includes('Name one stage'))).toBe(true);
  });
  it('records typing through handleStudentInput under the resource id', () => {
    const onInput = brainstorm(activities());
    const check = fields().find(field => field.getAttribute('aria-label').includes('Name one stage'));
    type(check, 'Evaporation');
    expect(onInput).toHaveBeenCalledWith('act-1', check.getAttribute('data-activity-response'), 'Evaporation');
  });
  it('shows only the learner\'s own saved answers; teacher answer keys never prefill or appear', () => {
    const key = Brainstorm.activityResponseKey(activities().data[2], 'check', 'Name one stage of the water cycle.');
    brainstorm(activities(), { studentResponses: { 'act-1': { [key]: 'Condensation' } } });
    const values = fields().map(field => field.value);
    expect(values.filter(Boolean)).toEqual(['Condensation']);
    expect(host.textContent.includes('SECRET-ANSWER-KEY'), 'answer key leaked to student').toBe(false);
    expect(host.textContent.includes('TEACHER-ONLY-NOTES'), 'facilitation notes leaked').toBe(false);
  });
  it('uses the same keys on the teacher copy and the student projection (blank lines and idea cards dropped)', () => {
    brainstorm(activities());
    const fullKeys = fields().map(field => field.getAttribute('data-activity-response'));
    const projected = Brainstorm.projectStudentActivityResource(activities());
    brainstorm(projected);
    expect(fields().map(field => field.getAttribute('data-activity-response'))).toEqual(fullKeys);
    expect(new Set(fullKeys).size).toBe(fullKeys.length);
  });
  it('keeps the teacher view free of answer fields, and renders none when the host gives no input handler', () => {
    brainstorm(activities(), { isTeacherMode: true });
    expect(fields()).toHaveLength(0);
    brainstorm(activities(), { handleStudentInput: undefined });
    expect(fields()).toHaveLength(0);
    expect(host.textContent).toContain('Name one stage of the water cycle.');
  });
});

// ---------------------------------------------------------------- F2 / F3 / F4
const dbqData = (over = {}) => ({
  title: 'Mill towns', historicalContext: 'Context.', rubric: [{ criteria: 'Thesis', 1: 'a', 2: 'b', 3: 'c', 4: 'd' }],
  documents: [
    { id: 'A', title: 'Document A: Supplied reading', source: 'Supplied reading; author and date not recorded', excerpt: 'The mill closed today.', sourcingQuestions: ['Who wrote this and when?'] },
    { id: 'B', title: 'Document B: Supplied reading', source: 'Supplied reading; author and date not recorded', excerpt: 'Workers marched.' }
  ], ...over
});
function dbq(data, extra = {}, responses = {}) {
  draw(React.createElement(DbqView, {
    generatedContent: { id: 'dbq-1', type: 'dbq', data }, studentResponses: { 'dbq-1': responses },
    handleStudentInput: vi.fn(), cleanJson: s => s, gradeLevel: '8th', t: () => '', isTeacherMode: false,
    addToast: () => {}, handleScoreUpdate: () => {}, ...extra
  }));
}

describe('F2: DBQ teacher-asserted provenance', () => {
  it('lets the teacher record title, author, date and citation, and students then see them instead of the placeholders', () => {
    let resource = { id: 'dbq-1', type: 'dbq', data: dbqData() };
    const onUpdateResource = vi.fn((id, updater) => {
      const next = updater(resource);
      if (!next || next === resource) return false;
      resource = next; return true;
    });
    dbq(resource.data, { isTeacherMode: true, onUpdateResource });
    const editor = host.querySelector('[data-dbq-provenance-editor]');
    expect(editor, 'teacher editor').toBeTruthy();
    const input = name => [...editor.querySelectorAll('label')].find(label => label.textContent.startsWith(name)).querySelector('input');
    type(input('Title'), 'Letter from a mill worker');
    type(input('Author'), 'Jane Doe');
    type(input('Date'), '1911');
    type(input('Source or citation'), 'Lowell Historical Society, Box 4');
    act(() => [...editor.querySelectorAll('button')].find(b => b.textContent === 'Save source details').click());
    expect(onUpdateResource).toHaveBeenCalledWith('dbq-1', expect.any(Function));
    expect(resource.data.documents[0].teacherProvenance).toEqual({ provenance: 'teacher', title: 'Letter from a mill worker', author: 'Jane Doe', date: '1911', citation: 'Lowell Historical Society, Box 4' });
    // The captured record is not rewritten.
    expect(resource.data.documents[0].source).toBe('Supplied reading; author and date not recorded');
    expect(resource.data.documents[1].teacherProvenance).toBeUndefined();

    dbq(resource.data, { isTeacherMode: false });
    expect(host.querySelector('[data-dbq-provenance-editor]'), 'students see no editor').toBeNull();
    const text = host.textContent;
    expect(text).toContain('Document A: Letter from a mill worker');
    expect(text).toContain('Author: Jane Doe · Date: 1911');
    expect(text).toContain('Lowell Historical Society, Box 4');
    expect(text).toContain('Added by your teacher');
    expect(text.includes('author and date not recorded'), 'placeholder still shown for doc A').toBe(false);
  });
  it('ignores provenance that is not marked as teacher-asserted', () => {
    const data = dbqData();
    data.documents[0].teacherProvenance = { provenance: 'model', author: 'Invented Person' };
    dbq(data);
    expect(host.textContent.includes('Invented Person')).toBe(false);
    expect(host.textContent).toContain('author and date not recorded');
  });
});

describe('F3: missing documents and custom-document matching', () => {
  it('warns the teacher, and only the teacher, when fewer documents came back than were requested', () => {
    const data = dbqData({ documentCount: { requested: 3, actual: 2, distinctSources: 1 } });
    dbq(data, { isTeacherMode: true });
    const alert = host.querySelector('[data-dbq-missing-docs]');
    expect(alert, 'teacher notice').toBeTruthy();
    expect(alert.textContent).toContain('3 documents were requested but only 2 came back');
    dbq(data, { isTeacherMode: false });
    expect(host.querySelector('[data-dbq-missing-docs]')).toBeNull();
    dbq(dbqData({ documentCount: { requested: 2, actual: 2, distinctSources: 1 } }), { isTeacherMode: true });
    expect(host.querySelector('[data-dbq-missing-docs]')).toBeNull();
  });

  const source = readFileSync(DISPATCHER, 'utf8');
  const start = source.indexOf('             // Unique ids, honest excerpt kinds');
  const end = source.indexOf('             metaInfo =', start);
  const normalize = new Function('content', '_dbqSourceRecords', '_dbqRequestedCount', '_dbqFocusTopic', '_dbqMode', '_dbqUrl', source.slice(start, end) + '\nreturn content;');
  const url = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const rec = (i, text) => ({ id: 'custom-' + i, title: 'Teacher doc ' + i, source: 'Teacher-supplied document; author and date not recorded', url: '', text, origin: 'supplied' });
  const records = [rec(0, 'First teacher document about the mill strike.'), rec(1, 'Second teacher document about wages in 1912.'), rec(2, 'Third teacher document about child labor laws.')];

  it('matches custom documents by their text, so a dropped document does not shift the rest', () => {
    const result = normalize({ documents: [{ id: 'A', excerpt: records[0].text }, { id: 'B', excerpt: records[2].text }] }, records, 3, '', 'custom', url);
    expect(result.documents.map(d => d.title)).toEqual(['Document A: Teacher doc 0', 'Document B: Teacher doc 2']);
    expect(result.documents.map(d => d.sourceMatchedBy)).toEqual(['excerpt', 'excerpt']);
    expect(result.documentCount).toEqual({ requested: 3, actual: 2, distinctSources: 2 });
  });
  it('matches reordered documents by text and falls back to order only when the text was changed', () => {
    const swapped = normalize({ documents: [{ id: 'A', excerpt: records[1].text }, { id: 'B', excerpt: records[0].text }] }, records.slice(0, 2), 2, '', 'custom', url);
    expect(swapped.documents.map(d => d.excerpt)).toEqual([records[1].text, records[0].text]);
    const rewritten = normalize({ documents: [{ id: 'A', excerpt: 'model paraphrase one' }, { id: 'B', excerpt: 'model paraphrase two' }] }, records.slice(0, 2), 2, '', 'custom', url);
    expect(rewritten.documents.map(d => d.excerpt)).toEqual([records[0].text, records[1].text]);
    expect(rewritten.documents.map(d => d.sourceMatchedBy)).toEqual(['position', 'position']);
  });
  it('flags order-matched documents in the teacher notice when documents are missing', () => {
    const result = normalize({ documents: [{ id: 'A', excerpt: 'model paraphrase one' }] }, records.slice(0, 2), 2, '', 'custom', url);
    dbq(result, { isTeacherMode: true });
    expect(host.querySelector('[data-dbq-missing-docs]').textContent).toContain('matched to your text by order');
  });
});

describe('F4: DBQ student text is translatable', () => {
  const translated = key => (key.startsWith('dbq.') ? '«' + key + '»' : '');
  it('routes headings, tabs, steps, rubric levels and the timer through t()', () => {
    dbq(dbqData(), { t: translated }, { _dbqTimerEnd: Date.now() - 5000 });
    const text = host.textContent;
    for (const key of ['dbq.times_up', 'dbq.print_dbq_packet', 'dbq.happ_heading', 'dbq.happ_historical', 'dbq.sourcing_questions', 'dbq.reliability_heading', 'dbq.step_analyze', 'dbq.step_corroborate', 'dbq.doc_short', 'dbq.highlight', 'dbq.listen']) {
      expect(text.includes('«' + key + '»'), key).toBe(true);
    }
    for (const english of ["Time's up!", 'HAPP Source Analysis', 'Print DBQ Packet', 'Source Reliability Check']) {
      expect(text.includes(english), english).toBe(false);
    }
    dbq(dbqData(), { t: translated }, { _dbqTab: 'rubric' });
    expect(host.textContent.includes('«dbq.level_1»'), 'rubric level').toBe(true);
    expect(host.textContent.includes('«dbq.rubric_heading»'), 'rubric heading').toBe(true);
    expect(host.textContent.includes('Beginning')).toBe(false);
  });
  it('falls back to English when t() echoes the key', () => {
    dbq(dbqData(), { t: key => key }, { _dbqTimerEnd: Date.now() - 5000 });
    expect(host.textContent).toContain("Time's up!");
    expect(host.textContent).toContain('HAPP Source Analysis');
    expect(host.textContent.includes('dbq.happ_heading')).toBe(false);
  });
});

// ---------------------------------------------------------------- F5
describe('F5: Timeline "not yet checked" badge', () => {
  function timeline(items, isTeacherMode = true) {
    draw(React.createElement(TimelineView, {
      t: () => '', generatedContent: { id: 'tl-1', type: 'timeline', data: { items, progressionLabel: 'Year' } }, isTeacherMode,
      TIMELINE_MODE_DEFINITIONS: {}, dismissedVerifications: new Set(), timelineImageSize: 96, timelineRefinementInputs: {},
      isGeneratingTimelineImage: {}, isVerifyingTimeline: false, handleVerifyTimelineAccuracy: () => {},
      ErrorBoundary: props => props.children, TimelineGame: () => null
    }));
    return host.querySelector('[data-timeline-unverified]');
  }
  const item = (event, verification) => ({ date: '1900', event, ...(verification ? { verification } : {}) });
  it('shows the teacher that nothing has been checked yet', () => {
    expect(timeline([item('a'), item('b')]).textContent).toContain('Accuracy not yet checked');
  });
  it('counts items added or edited after a check', () => {
    expect(timeline([item('a', { factual: true, position: true }), item('b')]).textContent).toContain('1 items not yet checked');
  });
  it('disappears once every item is checked, and never shows to students', () => {
    expect(timeline([item('a', { factual: true, position: true })])).toBeNull();
    expect(timeline([item('a'), item('b')], false)).toBeNull();
  });
});
