// 2026-09-27 fixes in the shared learner-response boundary (studio_response_module.js):
// N1 teacher authoring must not write learner answers into the shared Notes resource;
// M1 Memory Aid submissions carry only image descriptions the learner wrote;
// M2 a learner's first edit must not freeze the teacher's picture, status, or review.
// FIX0927_STUDIO_RESPONSE=<path> loads a candidate copy (mutation checks).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let S, root, host;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(readFileSync(process.env.FIX0927_STUDIO_RESPONSE || resolve('studio_response_module.js'), 'utf8'))();
  S = window.AlloModules.StudioResponse;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; });

function mountBoundary(props) {
  let child;
  function View(p) { child = p; return null; }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(S.Boundary, { View, studentResponses: {}, onResponseChange: vi.fn(), activeProfileId: 'p', t: () => '', ...props })));
  return () => child;
}
function hostStore(initial) {
  const store = { resource: initial };
  store.update = vi.fn((key, value) => { store.resource = { ...store.resource, data: { ...store.resource.data, [key]: typeof value === 'function' ? value(store.resource.data[key]) : value } }; });
  return store;
}

describe('N1: teacher authoring never writes learner Notes fields into the shared resource', () => {
  const guided = () => ({ id: 'g1', type: 'note-taking', data: { templateType: 'guided-notes', title: 'Cells', notesExtra: '', summary: '',
    blanks: [{ id: 'gn-0', before: 'The powerhouse is the ', answer: 'mitochondria', after: '.', studentAnswer: '' }, { id: 'gn-1', before: 'Plants use ', answer: 'chloroplasts', after: '.', studentAnswer: '' }] } });

  it('drops typed blank answers but keeps template edits to the statement', () => {
    const store = hostStore(guided());
    const child = mountBoundary({ generatedContent: store.resource, isTeacherMode: true, handleNoteUpdate: store.update });
    act(() => child().handleNoteUpdate('blanks', rows => rows.map((row, i) => i === 0 ? { ...row, studentAnswer: 'mitochondria', before: 'The cell powerhouse is the ' } : row)));
    expect(store.resource.data.blanks[0]).toMatchObject({ id: 'gn-0', before: 'The cell powerhouse is the ', answer: 'mitochondria', studentAnswer: '' });
    expect(JSON.stringify(S.toSubmission(store.resource))).not.toContain('"studentAnswer":"mitochondria"');
    expect(Object.values(S.toResponseEntries(store.resource))).not.toContain('mitochondria');
  });

  it('blocks learner writing, feedback and scores on every template but still allows title and cue edits', () => {
    const store = hostStore({ id: 'c1', type: 'note-taking', data: { templateType: 'cornell-notes', title: 'Water', cues: [{ id: 'c', text: 'Heat' }], notes: [{ id: 'n', text: '' }], summary: '', connections: '' } });
    const child = mountBoundary({ generatedContent: store.resource, isTeacherMode: true, handleNoteUpdate: store.update });
    act(() => { const h = child().handleNoteUpdate; h('summary', 'TEACHER SUMMARY'); h('connections', 'TEACHER LINK'); h('feedback', { strength: 'x', growthNudge: 'y' }); h('prevFeedbackScore', 40); h('notes', [{ id: 'n', text: 'TEACHER NOTE' }, { id: 'n2', text: 'NEW ROW TEXT' }]); h('title', 'Water cycle'); h('cues', [{ id: 'c', text: 'Heat energy' }]); });
    const data = store.resource.data;
    expect(JSON.stringify(data)).not.toMatch(/TEACHER|NEW ROW TEXT/);
    expect(data.feedback).toBeUndefined(); expect(data.prevFeedbackScore).toBeUndefined();
    expect(data.notes).toEqual([{ id: 'n', text: '' }, { id: 'n2', text: '' }]);
    expect(data.title).toBe('Water cycle'); expect(data.cues[0].text).toBe('Heat energy');
  });

  it('keeps reading-response prompts learner-owned but lab research questions teacher-owned', () => {
    const reading = hostStore({ id: 'r', type: 'note-taking', data: { templateType: 'reading-response', title: 'Story', author: '', question: '', pageRange: '', entries: [{ id: 'e', quote: 'Q', response: '' }] } });
    let child = mountBoundary({ generatedContent: reading.resource, isTeacherMode: true, handleNoteUpdate: reading.update });
    act(() => { child().handleNoteUpdate('question', 'TEACHER Q'); child().handleNoteUpdate('author', 'Author name'); child().handleNoteUpdate('entries', [{ id: 'e', quote: 'New quote', response: 'TEACHER RESPONSE' }]); });
    expect(reading.resource.data).toMatchObject({ question: '', author: 'Author name', entries: [{ id: 'e', quote: 'New quote', response: '' }] });
    act(() => root.unmount()); root = null; host.remove();
    const lab = hostStore({ id: 'l', type: 'note-taking', data: { templateType: 'lab-report', question: '', hypothesis: '' } });
    child = mountBoundary({ generatedContent: lab.resource, isTeacherMode: true, handleNoteUpdate: lab.update });
    act(() => { child().handleNoteUpdate('question', 'Does light matter?'); child().handleNoteUpdate('hypothesis', 'TEACHER GUESS'); });
    expect(lab.resource.data).toMatchObject({ question: 'Does light matter?', hypothesis: '' });
  });

  it('teacher preview still edits a temporary learner copy', () => {
    const store = hostStore(guided()), save = vi.fn();
    const child = mountBoundary({ generatedContent: store.resource, isTeacherMode: true, startInPreview: true, handleNoteUpdate: store.update, onResponseChange: save });
    act(() => child().handleNoteUpdate('blanks', rows => rows.map((row, i) => i === 0 ? { ...row, studentAnswer: 'guess' } : row)));
    expect(store.update).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    expect(child().generatedContent.data.blanks[0].studentAnswer).toBe('guess');
  });
});

const IMG_T = 'data:image/png;base64,VEVBQ0hFUg==', IMG_NEW = 'data:image/png;base64,TkVXUElD', IMG_L = 'data:image/png;base64,TEVBUk5FUg==';
const memory = (card) => ({ id: 'm1', type: 'memory-aid', data: { title: 'Aid', cards: [{ id: 'c1', target: 'Photosynthesis', mode: 'generated', studentDraft: '', visualImage: IMG_T, visualAlt: 'Teacher description of a leaf', visualAltSource: 'author', visualStatus: 'ready', visualReview: { status: 'unreviewed', note: '', reviewedAt: '' }, ...card }] } });

describe('M1: Memory Aid submissions carry only image descriptions the learner wrote', () => {
  it('omits the teacher or AI description when the learner wrote nothing', () => {
    for (const r of [memory(), memory({ mode: 'student-authored' }), memory({ visualAltSource: 'vision' })]) {
      const card = S.toSubmission(r).data.cards[0];
      expect(card.visualAlt).toBeUndefined();
      expect(Object.keys(S.toResponseEntries(r)).some(key => key.endsWith('-visual-description'))).toBe(false);
      const response = { schemaVersion: 1, cards: [{ id: 'c1', studentDraft: 'Leaves make sugar', visualAlt: r.data.cards[0].visualAlt, visualAltSource: r.data.cards[0].visualAltSource }] };
      expect(JSON.stringify(S.toSubmission(r, response))).not.toContain('Teacher description');
      expect(JSON.stringify(S.toResponseEntries(r, response))).not.toContain('Teacher description');
      expect(Object.values(S.toResponseEntries(r, response))).toContain('Leaves make sugar');
    }
  });

  it('keeps a description the learner authored on a student-authored card, not an AI draft', () => {
    const r = memory({ mode: 'student-authored' });
    const mine = { schemaVersion: 1, cards: [{ id: 'c1', studentDraft: 'x', visualImage: IMG_L, visualAlt: 'My sketch of a leaf eating sunlight', visualAltSource: 'author' }] };
    expect(S.toSubmission(r, mine).data.cards[0].visualAlt).toBe('My sketch of a leaf eating sunlight');
    expect(S.toResponseEntries(r, mine)['m1:memory:c1-visual-description']).toBe('My sketch of a leaf eating sunlight');
    const ai = { schemaVersion: 1, cards: [{ ...mine.cards[0], visualAlt: 'AI drafted words', visualAltSource: 'vision' }] };
    expect(JSON.stringify(S.toSubmission(r, ai))).not.toContain('AI drafted words');
  });
});

describe('M2: a learner edit never freezes the teacher picture, status, or review', () => {
  it('stores only learner fields and shows the teacher picture once it is ready and approved', () => {
    const queued = memory({ visualImage: '', visualAlt: '', visualAltSource: '', visualStatus: 'queued' });
    const save = vi.fn();
    const child = mountBoundary({ generatedContent: queued, isTeacherMode: false, handleNoteUpdate: vi.fn(), onResponseChange: save });
    act(() => child().handleNoteUpdate('cards', cards => cards.map(card => ({ ...card, studentDraft: 'Leaves cook with light' }))));
    const response = save.mock.calls.at(-1)[1];
    expect(response.cards[0].studentDraft).toBe('Leaves cook with light');
    for (const key of ['visualImage', 'visualStatus', 'visualReview', 'visualAlt', 'visualSource', 'visualCheck']) expect(response.cards[0]).not.toHaveProperty(key);
    const later = memory({ visualImage: IMG_NEW, visualAlt: 'Approved leaf picture', visualStatus: 'ready', visualReview: { status: 'approved', note: '', reviewedAt: '2026-09-27' } });
    const shown = S.project(later, response).data.cards[0];
    expect(shown).toMatchObject({ studentDraft: 'Leaves cook with light', visualImage: IMG_NEW, visualStatus: 'ready', visualAlt: 'Approved leaf picture' });
    expect(shown.visualReview.status).toBe('approved');
  });

  it('ignores teacher visuals frozen into an older learner response on a teacher-owned card', () => {
    const frozen = { schemaVersion: 1, cards: [{ id: 'c1', studentDraft: 'Mine', visualImage: '', visualStatus: 'queued', visualReview: { status: 'unreviewed' }, visualAlt: '' }] };
    const shown = S.project(memory({ visualReview: { status: 'approved', note: '', reviewedAt: 'x' } }), frozen).data.cards[0];
    expect(shown).toMatchObject({ studentDraft: 'Mine', visualImage: IMG_T, visualStatus: 'ready', visualAlt: 'Teacher description of a leaf' });
    expect(shown.visualReview.status).toBe('approved');
  });

  it('keeps the learner picture and "cue changed" flag the learner owns', () => {
    const r = memory({ mode: 'student-authored' }), save = vi.fn();
    const child = mountBoundary({ generatedContent: r, isTeacherMode: false, handleNoteUpdate: vi.fn(), onResponseChange: save });
    act(() => child().handleNoteUpdate('cards', cards => cards.map(card => ({ ...card, visualImage: IMG_L, visualSource: 'uploaded', visualAlt: 'My drawing', visualAltSource: 'author', visualNeedsReview: true }))));
    const response = save.mock.calls.at(-1)[1];
    expect(response.cards[0]).toMatchObject({ visualImage: IMG_L, visualAlt: 'My drawing', visualNeedsReview: true });
    expect(S.project(r, response).data.cards[0]).toMatchObject({ visualImage: IMG_L, visualAlt: 'My drawing', visualNeedsReview: true });
  });
});
