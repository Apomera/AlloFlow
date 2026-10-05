import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const settle = () => vi.runAllTimers();
const authoredCases = [
  { id: 'case_1', system: 'skeletal', marker: 'patella', view: 'anterior' },
  { id: 'case_2', system: 'muscular', marker: 'rotator_cuff', view: 'posterior' },
  { id: 'case_3', system: 'circulatory', marker: 'heart', view: 'anterior' },
  { id: 'case_4', system: 'nervous', marker: 'median', view: 'anterior' },
  { id: 'case_5', system: 'lymphatic', marker: 'cervical_ln', view: 'anterior' },
  { id: 'case_6', system: 'endocrine', marker: 'islets', view: 'anterior' },
  { id: 'case_7', system: 'skeletal', marker: 'clavicle', view: 'anterior' },
  { id: 'case_8', system: 'respiratory', marker: 'alveoli', view: 'anterior' }
];
const work = {
  quizIdx: 3, quizScore: 2, _quizAttempts: 4,
  quizFeedback: { chosen: 'biceps', correct: false, questionKey: 'saved-question' },
  _quizQuestion: { token: 'saved-question-token', index: 3 },
  _quizActivityReturn: { token: 'saved-question-token', index: 3, score: 2, attempts: 4 },
  _flashcardDeck: ['biceps', 'deltoid'], _flashcardDeckContext: 'saved-deck', _flashcardIdx: 1,
  _flashcardFlipped: true, _flashcardRoundRated: { biceps: true },
  _flashcardRounds: { 'muscular:3:all': { context: 'saved-deck', deckIds: ['biceps', 'deltoid'], index: 1, rated: { biceps: true } } },
  _spotterActive: true, _spotterTarget: 'biceps', _spotterSerial: 7,
  _spotterOpts: ['biceps', 'deltoid', 'quads', 'pectoralis'].map(id => ({ id })),
  _spotterStartTime: now - 2500, _spotterFeedback: 'deltoid', _spotterElapsed: 2.5,
  _spotterTimed: true, _spotterRoundTimed: true, _spotterScore: 2, _spotterTotal: 3,
  _structureNotes: { biceps: 'My saved arm explanation.', patella: 'My saved knee explanation.' },
  _structureConfidence: { biceps: 'learning' }, _confidenceAt: { biceps: now },
  _retrievalEvidence: { biceps: { attempts: 3, correct: 2 } }, _compareStructure: 'deltoid',
  _connectionConcepts: { version: 1, answers: { conn_1: 'choice_1' } },
  _connectionPractice: { version: 1, sessions: { conn_1: { token: 'saved-practice', answer: 'choice_0', active: true } } },
  _body3dStyle: 'clinical', _clinicalAtlasPackId: 'saved-clinical-pack', _clinicalAtlasConceptId: 'saved-concept'
};
const protectedWork = state => clone(Object.fromEntries(Object.keys(work).map(key => [key, state[key]])));
const study = (id = 'case_2', row = {}, other = {}) => ({ version: 1, cases: { [id]: { draft: 'My original reasoning.', hint: false, revealed: true, ...row }, ...other } });
const origin = extra => ({
  version: 1, token: 'saved-case-route', caseId: 'case_2', systemId: 'muscular',
  view: 'anterior', complexity: 3, selectedStructure: 'biceps', search: '  arm  ',
  studyFilter: 'notes', activeTab: 'explore', bodyView3d: false, quizMode: false, ...extra
});
const savedRoute = extra => ({
  system: 'muscular', view: 'posterior', complexity: 3, selectedStructure: 'rotator_cuff',
  search: '', _studyFilter: 'all', _activeTab: 'explore', _bodyView3d: false,
  _caseDiagramReturn: 'case_2', _caseDiagramOrigin: origin(), _clinicalNavigationToken: 'saved-case-route', ...extra
});
let toneStarts;

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, extra = {}) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: {
    system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
    _activeTab: 'explore', _bodyView3d: false, _showClinical: true, _startHereDismissed: true,
    // Existing progress awards stay settled so effect assertions isolate case actions.
    _badges: { firstStructure: true, viewToggler: true, spotterPro: true },
    completedChallenges: ['spotter_3', 'cases_solved'], search: '  arm  ', _studyFilter: 'notes',
    _clinicalStudy: study(), ...clone(work), ...extra
  } };
  let host, deferred = false, pending = [];
  const announce = vi.fn(), apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? pending.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: '9', setToolData, announceToSR: announce });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const match = find(tree(), predicate); expect(match).not.toBeNull(); return match; };
  const byHook = (hook, value) => node(element => element.props?.[hook] === value);
  const mount = () => {
    if (!host || !host.isConnected) { host = document.createElement('div'); document.body.appendChild(host); }
    host.innerHTML = renderTool('anatomy', data, ctx()); return host;
  };
  mount(); settle(); announce.mockClear(); toneStarts.mockClear();
  return {
    state: () => data.anatomy, announce, node, byHook, mount,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    click: (type, id = 'case_2') => byHook('data-anatomy-case-' + type, id).props.onClick(),
    action: (type, id = 'case_2') => byHook('data-anatomy-case-' + type, id).props.onClick,
    draft: (value, id = 'case_2') => byHook('data-anatomy-case-draft', id).props.onChange({ target: { value } }),
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const updates = pending; pending = []; updates.forEach(apply); }
  };
}
function heldFocus() { const button = document.createElement('button'); button.textContent = 'Another action'; document.body.appendChild(button); button.focus(); return button; }
function act(s, callback, selector) {
  if (selector) { const control = s.mount().querySelector(selector); expect(control).not.toBeNull(); control.focus(); }
  callback(); const root = s.mount(); settle(); return root;
}
function showMarker(s, id = 'case_2') { return act(s, s.action('marker', id), '[data-anatomy-case-marker="' + id + '"]'); }
function returnToCase(s, id = 'case_2') { return act(s, s.action('return', id), '[data-anatomy-case-return="' + id + '"]'); }
function noEffects(s, held) { expect(s.announce).not.toHaveBeenCalled(); expect(toneStarts).not.toHaveBeenCalled(); if (held) expect(document.activeElement).toBe(held); }

let rectsDescriptor, scrollDescriptor, audioDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  audioDescriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  toneStarts = vi.fn();
  class TestAudioContext {
    currentTime = 0; destination = {};
    createOscillator() { return { type: '', frequency: { value: 0 }, connect() {}, start: toneStarts, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: TestAudioContext });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  for (const [key, descriptor] of [['getClientRects', rectsDescriptor], ['scrollIntoView', scrollDescriptor]]) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor); else delete HTMLElement.prototype[key];
  }
  if (audioDescriptor) Object.defineProperty(window, 'AudioContext', audioDescriptor); else delete window.AudioContext;
});

for (const file of files) describe('Anatomy clinical-case journeys: ' + file, () => {
  it.each(authoredCases)('round-trips $id through its authored $marker marker', row => {
    const s = session(file, { system: row.system, view: row.view === 'posterior' ? 'anterior' : 'posterior',
      selectedStructure: null, search: '  saved query  ', _studyFilter: 'review', _clinicalStudy: study(row.id) });
    const before = protectedWork(s.state()), original = { system: row.system, view: s.state().view, selectedStructure: null, search: '  saved query  ', _studyFilter: 'review' };
    const root = showMarker(s, row.id), route = s.state()._caseDiagramOrigin;
    expect(route).toMatchObject({ version: 1, caseId: row.id, systemId: row.system, view: original.view,
      complexity: 3, selectedStructure: null, search: original.search, studyFilter: 'review', activeTab: 'explore', bodyView3d: false, quizMode: false });
    expect(route.token).toEqual(expect.any(String)); expect(route.token.length).toBeGreaterThan(0); expect(route.token.length).toBeLessThanOrEqual(128);
    expect(s.state()).toMatchObject({ system: row.system, view: row.view, selectedStructure: row.marker,
      _activeTab: 'explore', _bodyView3d: false, search: '', _studyFilter: 'all', _caseDiagramReturn: row.id });
    expect(root.querySelector('[data-anatomy-case-origin="' + row.id + '"]')).not.toBeNull();
    expect(root.querySelector('[data-anatomy-canvas]')).not.toBeNull();
    expect(document.activeElement.hasAttribute('data-anatomy-model-shell')).toBe(true);
    expect(protectedWork(s.state())).toEqual(before);
    const returned = returnToCase(s, row.id), explanation = returned.querySelector('[data-anatomy-case-explanation="' + row.id + '"]');
    expect(s.state()).toMatchObject({ ...original, complexity: 3, _activeTab: 'explore', _caseDiagramOrigin: null, _caseDiagramReturn: null });
    expect(explanation.getAttribute('role')).toBe('group'); expect(explanation.getAttribute('tabindex')).toBe('-1');
    expect(returned.querySelector('#' + explanation.getAttribute('aria-labelledby')).textContent).toBeTruthy();
    expect(document.activeElement).toBe(explanation); expect(returned.querySelector('[data-anatomy-case-origin]')).toBeNull();
    expect(protectedWork(s.state())).toEqual(before);
  });

  it.each(['explore', 'quiz', 'flashcards', 'tour', 'pathways', 'connections', 'aiTutor', 'spotter', 'homeoHunt'])('preserves saved learning work from %s through a posterior marker', activeTab => {
    const s = session(file, { _activeTab: activeTab, quizMode: activeTab === 'quiz', _bodyView3d: true });
    const before = protectedWork(s.state()); showMarker(s);
    expect(s.state()._caseDiagramOrigin).toMatchObject({ activeTab, quizMode: activeTab === 'quiz', bodyView3d: true, selectedStructure: 'biceps' });
    expect(s.state()).toMatchObject({ _activeTab: 'explore', view: 'posterior', _bodyView3d: false, selectedStructure: 'rotator_cuff' });
    expect(protectedWork(s.state())).toEqual(before);
    returnToCase(s);
    expect(s.state()).toMatchObject({ _activeTab: activeTab, quizMode: activeTab === 'quiz', view: 'anterior', _bodyView3d: true, selectedStructure: 'biceps', search: '  arm  ', _studyFilter: 'notes' });
    expect(protectedWork(s.state())).toEqual(before);
    expect(s.state()._clinicalStudy.cases.case_2.draft).toBe('My original reasoning.');
  });

  it('restores a persisted route after reload while keeping work written during the diagram visit', () => {
    const s = session(file, { _activeTab: 'quiz', quizMode: true, _bodyView3d: true }); showMarker(s);
    const saved = clone(s.state()); document.body.innerHTML = '';
    const restored = session(file, saved);
    restored.patch({ _structureNotes: { biceps: 'Newer note.' }, _structureConfidence: { biceps: 'mastered' },
      quizScore: 5, _spotterScore: 4, _clinicalStudy: study('case_2', { draft: 'Newer reasoning.' }, { case_1: { draft: 'Other case reasoning.', hint: true, revealed: false } }),
      _connectionConcepts: { version: 1, answers: { conn_1: 'choice_1', conn_2: 'choice_0' } }, _compareStructure: 'quads' });
    const before = protectedWork(restored.state()); returnToCase(restored);
    expect(restored.state()).toMatchObject({ _activeTab: 'quiz', quizMode: true, _bodyView3d: true, view: 'anterior', selectedStructure: 'biceps' });
    expect(protectedWork(restored.state())).toEqual(before);
    expect(restored.state()._clinicalStudy.cases).toMatchObject({ case_2: { draft: 'Newer reasoning.' }, case_1: { draft: 'Other case reasoning.' } });
  });

  it('returns to the named case heading when its explanation was hidden during the detour', () => {
    const s = session(file, savedRoute({ _clinicalStudy: study('case_2', { revealed: false }) }));
    const root = returnToCase(s);
    expect(document.activeElement).toBe(root.querySelector('#anatomy-case-case_2-title'));
    expect(s.state()).toMatchObject({ _caseDiagramOrigin: null, _caseDiagramReturn: null });
    expect(root.querySelector('[data-anatomy-case-explanation="case_2"]').hidden).toBe(true);
  });

  it('retains guarded focus-only support for a legacy case return without a saved origin', () => {
    const s = session(file, savedRoute({ _caseDiagramOrigin: null })), before = protectedWork(s.state());
    returnToCase(s);
    expect(s.state()).toMatchObject({ view: 'posterior', selectedStructure: 'rotator_cuff', search: '', _activeTab: 'explore' });
    expect(document.activeElement.getAttribute('data-anatomy-case-explanation')).toBe('case_2');
    expect(protectedWork(s.state())).toEqual(before);
  });

  it('consumes an origin once and rejects duplicate return callbacks without repeated effects', () => {
    const s = session(file, savedRoute()), callback = s.action('return'); returnToCase(s);
    s.announce.mockClear(); toneStarts.mockClear(); const before = clone(s.state()); callback(); callback();
    expect(s.state()).toEqual(before); s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  const staleNavigation = [
    ['activity', { _activeTab: 'flashcards' }], ['system', { system: 'skeletal' }], ['view', { view: 'posterior' }],
    ['detail level', { complexity: 2 }], ['search', { search: 'new query' }], ['study filter', { _studyFilter: 'all' }],
    ['clinical disclosure', { _showClinical: false }], ['navigation token', { _clinicalNavigationToken: 'replacement' }],
    ['guidance revision', { _guidanceRevision: 2 }], ['study-sheet revision', { _studySheetRevision: 2 }],
    ['study-import revision', { _studyImportRevision: 2 }], ['selection', { selectedStructure: 'deltoid' }],
    ['3D preference', { _bodyView3d: true }], ['model style', { _body3dStyle: 'blueprint' }],
    ['model focus', { _anatomyModelFocus: true }], ['connection navigation', { _connectionNavigationToken: 'replacement' }]
  ];
  it.each(staleNavigation)('rejects captured marker, review, hint, reveal and draft handlers after a newer %s', (_, patch) => {
    const s = session(file), callbacks = ['marker', 'review', 'hint-toggle', 'reveal'].map(type => s.action(type));
    const draft = s.byHook('data-anatomy-case-draft', 'case_2').props.onChange;
    s.patch(patch); const before = clone(s.state()); callbacks.forEach(callback => callback()); draft({ target: { value: 'Stale reasoning.' } });
    expect(s.state()).toEqual(before); s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  it.each(staleNavigation.filter(([name]) => name !== 'view' && name !== 'study filter'))('rejects a saved return after a newer %s', (_, patch) => {
    const s = session(file, savedRoute()), callback = s.action('return');
    s.patch(patch); const before = clone(s.state()); callback(); expect(s.state()).toEqual(before);
    s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  it('rejects a return captured before the persisted origin was replaced by another route token', () => {
    const s = session(file, savedRoute()), callback = s.action('return');
    s.patch({ _caseDiagramOrigin: origin({ token: 'replacement-route' }) }); const before = clone(s.state());
    callback(); expect(s.state()).toEqual(before); s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  it.each(['hint-toggle', 'reveal', 'review', 'marker'])('rejects a captured %s action after newer own-case reasoning or feedback', type => {
    const s = session(file), callback = s.action(type);
    s.patch({ _clinicalStudy: study('case_2', { draft: 'Newer same-case reasoning.', hint: true, revealed: false }) });
    const before = clone(s.state()); callback(); expect(s.state()).toEqual(before); s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  it('merges a fresh draft while preserving other cases and newer reviewed flags', () => {
    const s = session(file), callback = s.byHook('data-anatomy-case-draft', 'case_2').props.onChange;
    s.patch({ _clinicalStudy: study('case_2', { draft: 'Newer own draft.', hint: true, revealed: false }, { case_7: { draft: 'Newer other draft.', hint: false, revealed: true } }), _clinicalSolvedIds: { case_7: true }, _clinicalSolved: 1 });
    callback({ target: { value: 'Latest typed reasoning.' } });
    expect(s.state()._clinicalStudy.cases).toMatchObject({ case_2: { draft: 'Latest typed reasoning.', hint: true, revealed: false }, case_7: { draft: 'Newer other draft.', revealed: true } });
    expect(s.state()._clinicalSolvedIds).toEqual({ case_7: true });
  });

  it('accepts repeated input from one textarea callback and retains a bounded final draft', () => {
    const s = session(file), callback = s.byHook('data-anatomy-case-draft', 'case_2').props.onChange;
    callback({ target: { value: 'First typed thought.' } }); callback({ target: { value: 'Second typed thought.' } });
    expect(s.state()._clinicalStudy.cases.case_2.draft).toBe('Second typed thought.');
    callback({ target: { value: 'x'.repeat(900) } }); expect(s.state()._clinicalStudy.cases.case_2.draft).toHaveLength(600);
    s.mount(); settle(); noEffects(s);
  });

  it('merges other-case changes and fresh notes when a captured marker opens', () => {
    const s = session(file), callback = s.action('marker');
    s.patch({ _clinicalStudy: study('case_2', {}, { case_7: { draft: 'Newer other-case reasoning.', hint: true, revealed: false } }), _structureNotes: { biceps: 'Newer note.' }, _spotterScore: 7 });
    const before = protectedWork(s.state()); act(s, callback);
    expect(protectedWork(s.state())).toEqual(before); expect(s.state()._clinicalStudy.cases.case_7.draft).toBe('Newer other-case reasoning.');
    expect(s.state()._caseDiagramOrigin.caseId).toBe('case_2');
  });

  it('accepts a deferred marker only after its updater and resulting route are current', () => {
    const s = session(file), callback = s.action('marker'); s.defer(); callback();
    expect(s.state()._caseDiagramOrigin).toBeUndefined(); expect(s.announce).not.toHaveBeenCalled();
    s.patch({ _structureNotes: { biceps: 'Written before commit.' } }); s.flush(); s.mount(); settle();
    expect(s.state()._caseDiagramOrigin.caseId).toBe('case_2'); expect(s.state()._structureNotes.biceps).toBe('Written before commit.');
    expect(s.announce).toHaveBeenCalledTimes(1); expect(document.activeElement.hasAttribute('data-anatomy-model-shell')).toBe(true);
  });

  it('rejects a deferred marker after the source context changes before commit', () => {
    const s = session(file); s.defer(); s.click('marker'); s.patch({ view: 'posterior' }); const before = clone(s.state());
    s.flush(); expect(s.state()).toEqual(before); s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  it('suppresses accepted marker effects after its destination is superseded', () => {
    const s = session(file); s.click('marker'); s.patch({ _activeTab: 'flashcards' }); s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  it('does not steal intentional focus during an accepted marker or return transition', () => {
    const s = session(file); s.click('marker'); s.mount(); const outside = heldFocus(); settle(); expect(document.activeElement).toBe(outside);
    s.click('return'); s.mount(); const another = heldFocus(); settle(); expect(document.activeElement).toBe(another);
  });

  it('uses named hint and explanation groups and keeps reasoning during retry', () => {
    const s = session(file, { _clinicalStudy: study('case_2', { revealed: false }) });
    let root = act(s, s.action('hint-toggle'), '[data-anatomy-case-hint-toggle="case_2"]');
    const hint = root.querySelector('[data-anatomy-case-hint="case_2"]');
    expect(hint.getAttribute('role')).toBe('group'); expect(hint.getAttribute('tabindex')).toBe('-1');
    expect(root.querySelector('#' + hint.getAttribute('aria-labelledby')).textContent).toBeTruthy(); expect(document.activeElement).toBe(hint);
    root = act(s, s.action('reveal'), '[data-anatomy-case-reveal="case_2"]');
    expect(document.activeElement).toBe(root.querySelector('[data-anatomy-case-explanation="case_2"]'));
    expect(s.state()._clinicalSolvedIds).toBeUndefined();
    root = act(s, s.action('reveal'), '[data-anatomy-case-reveal="case_2"]');
    expect(s.state()._clinicalStudy.cases.case_2).toEqual({ draft: 'My original reasoning.', hint: false, revealed: false });
    expect(root.querySelector('[data-anatomy-case-explanation="case_2"]').hidden).toBe(true);
  });

  it('records accepted review once without creating retrieval credit or duplicate sound', () => {
    const s = session(file), callback = s.action('review'), before = protectedWork(s.state());
    act(s, callback, '[data-anatomy-case-review="case_2"]');
    expect(s.state()._clinicalSolvedIds).toEqual({ case_2: true }); expect(s.state()._clinicalSolved).toBe(1);
    expect(toneStarts).toHaveBeenCalled(); expect(protectedWork(s.state())).toEqual(before);
    s.announce.mockClear(); toneStarts.mockClear(); const snapshot = clone(s.state()); callback(); callback();
    expect(s.state()).toEqual(snapshot); s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  it.each([false, true])('rejects duplicate captured disclosure callbacks when the explanation starts revealed=%s', revealed => {
    const s = session(file, { _clinicalStudy: study('case_2', { revealed }) }), callback = s.action('reveal');
    act(s, callback, '[data-anatomy-case-reveal="case_2"]');
    expect(s.state()._clinicalStudy.cases.case_2.revealed).toBe(!revealed);
    s.announce.mockClear(); toneStarts.mockClear(); const before = clone(s.state()); callback(); callback();
    expect(s.state()).toEqual(before); s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
  });

  it('suppresses an accepted review announcement after its case disappears before effects settle', () => {
    const s = session(file); s.click('review'); s.patch({ _showClinical: false });
    s.mount(); const held = heldFocus(); settle(); noEffects(s, held);
    expect(s.state()._clinicalSolvedIds).toEqual({ case_2: true });
  });

  it('rejects a captured review after its reviewed flag changes and keeps newer global participation', () => {
    const s = session(file), callback = s.action('review'); s.patch({ _clinicalSolvedIds: { case_2: true, case_7: true }, _clinicalSolved: 2 });
    const before = clone(s.state()); callback(); expect(s.state()).toEqual(before); s.mount(); settle(); noEffects(s);
  });

  const invalidOrigins = [
    ['array', []], ['unknown version', origin({ version: 2 })], ['empty token', origin({ token: '' })], ['oversized token', origin({ token: 'x'.repeat(129) })],
    ['numeric token', origin({ token: 3 })], ['unknown case', origin({ caseId: 'forged' })], ['inherited case name', origin({ caseId: 'constructor' })],
    ['wrong authored system', origin({ systemId: 'skeletal' })], ['unknown system', origin({ systemId: 'forged' })],
    ...['constructor', 'toString', '__proto__'].map(systemId => ['inherited system ' + systemId, origin({ systemId })]),
    ...[null, 8, ['muscular'], { id: 'muscular' }].map(systemId => ['non-string system ' + JSON.stringify(systemId), origin({ systemId })]),
    ['unsupported orientation', origin({ view: 'side' })], ['invalid level', origin({ complexity: 2 })],
    ['foreign selection', origin({ selectedStructure: 'patella' })], ['invisible selection', origin({ selectedStructure: 'rotator_cuff' })],
    ['non-string selection', origin({ selectedStructure: 4 })], ['oversized query', origin({ search: 'x'.repeat(201) })], ['non-string query', origin({ search: 4 })],
    ['unknown filter', origin({ studyFilter: 'forged' })], ['unknown activity', origin({ activeTab: 'forged' })],
    ['nonboolean 3D preference', origin({ bodyView3d: 'yes' })], ['nonboolean quiz mode', origin({ quizMode: 'yes' })],
    ['entirely inherited origin', Object.create(origin())],
    // Required persisted values must survive ordinary activity-state serialization.
    ...Object.keys(origin()).map(field => {
      const raw = origin(), value = raw[field]; delete raw[field]; Object.setPrototypeOf(raw, { [field]: value });
      return ['inherited required field ' + field, raw];
    })
  ];
  it.each(invalidOrigins)('hides return controls for a malformed persisted origin: %s', (_, raw) => {
    const s = session(file, savedRoute({ _caseDiagramOrigin: raw })), root = s.mount();
    expect(root.querySelector('[data-anatomy-case-origin]')).toBeNull(); expect(root.querySelector('[data-anatomy-case-return]')).toBeNull();
  });

  it('accepts exact persisted token and query bounds while restoring a null selection', () => {
    const s = session(file, savedRoute({ _clinicalNavigationToken: 't'.repeat(128), _caseDiagramOrigin: origin({ token: 't'.repeat(128), search: 'q'.repeat(200), selectedStructure: null }) }));
    returnToCase(s); expect(s.state()).toMatchObject({ selectedStructure: null, search: 'q'.repeat(200), _caseDiagramOrigin: null });
  });

  it.each([
    ['wrong marker', { selectedStructure: 'biceps' }], ['wrong orientation', { view: 'anterior' }],
    ['3D diagram', { _bodyView3d: true }], ['another activity', { _activeTab: 'quiz' }],
    ['filtered diagram', { _studyFilter: 'notes' }], ['queried diagram', { search: 'arm' }],
    ['wrong case return', { _caseDiagramReturn: 'case_1' }], ['mismatched route token', { _clinicalNavigationToken: 'mismatched-route' }]
  ])('hides a persisted origin outside its authored destination: %s', (_, patch) => {
    const root = session(file, savedRoute(patch)).mount();
    expect(root.querySelector('[data-anatomy-case-origin]')).toBeNull(); expect(root.querySelector('[data-anatomy-case-return]')).toBeNull();
  });

  it('ignores inherited saved-case rows instead of exposing their reasoning and answers', () => {
    const inherited = Object.create({ case_2: { draft: 'Inherited reasoning.', hint: true, revealed: true } });
    const s = session(file, { _clinicalStudy: { version: 1, cases: inherited } }), root = s.mount();
    expect(s.byHook('data-anatomy-case-draft', 'case_2').props.value).toBe('');
    expect(root.querySelector('[data-anatomy-case-explanation="case_2"]').hidden).toBe(true);
    expect(root.querySelector('[data-anatomy-case-marker]')).toBeNull();
  });
});
