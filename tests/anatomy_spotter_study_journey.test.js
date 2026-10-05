import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000, clone = value => JSON.parse(JSON.stringify(value));
const settle = () => vi.runAllTimers();
const round = {
  _spotterActive: true, _spotterTarget: 'skull', _spotterFeedback: 'ribs',
  _spotterOpts: ['skull', 'mandible', 'clavicle', 'ribs'].map(id => ({ id })),
  _spotterStartTime: now - 2500, _spotterSerial: 7, _spotterElapsed: 2.5,
  _spotterTimed: true, _spotterRoundTimed: true, _spotterScore: 2, _spotterTotal: 4,
  _spotterTimedBestTime: 3.5
};
const work = {
  quizIdx: 3, quizScore: 2, _quizAttempts: 4, quizFeedback: { chosen: 'ribs', correct: false },
  _quizQuestion: { token: 'saved-question', index: 3 }, _quizActivityReturn: { token: 'saved-question', index: 3, score: 2 },
  _flashcardDeck: ['ribs', 'femur'], _flashcardDeckContext: 'saved-deck', _flashcardIdx: 1,
  _flashcardFlipped: true, _flashcardRoundRated: { ribs: true },
  _flashcardRounds: { 'skeletal:3:all': { context: 'saved-deck', deckIds: ['ribs', 'femur'], index: 1, rated: { ribs: true } } },
  _structureNotes: { skull: 'My saved skull explanation.', ribs: 'My saved rib explanation.' },
  _structureConfidence: { skull: 'mastered' }, _retrievalEvidence: { skull: { attempts: 3, correct: 2 } },
  _compareStructure: 'ribs', _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My knee reasoning.', hint: true, revealed: false } } },
  _connectionConcepts: { version: 1, answers: { conn_1: 'choice_1' } },
  _connectionPractice: { version: 1, sessions: { conn_1: { token: 'saved-practice', answer: 'choice_0', active: true } } },
  _body3dStyle: 'clinical', _clinicalAtlasPackId: 'saved-pack', _clinicalAtlasConceptId: 'saved-concept'
};
const snapshot = (state, keys) => clone(Object.fromEntries(keys.map(key => [key, state[key]])));
const savedWork = state => snapshot(state, Object.keys(work));
const savedRound = state => snapshot(state, Object.keys(round));
const questionKey = state => JSON.stringify([state._spotterTarget, state._spotterStartTime, state._spotterSerial, state._spotterRoundTimed === true, state._spotterOpts.map(option => option && option.id)]);
const origin = extra => ({ version: 1, token: 'saved-study-route', systemId: 'skeletal', view: 'anterior', complexity: 3,
  selectedStructure: 'ribs', search: '  saved query  ', studyFilter: 'notes', bodyView3d: true, quizMode: false,
  questionKey: questionKey(round), targetId: 'skull', answerId: 'ribs', ...extra });
const restored = extra => ({ _activeTab: 'explore', system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'skull',
  search: '', _studyFilter: 'all', _bodyView3d: false, _spotterStudyOrigin: origin(), _spotterStudyNavigationToken: 'saved-study-route', ...extra });
let tones, frames;

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, extra = {}) {
  resetStemLab(); const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'ribs',
    _activeTab: 'spotter', search: '  saved query  ', _studyFilter: 'notes', _bodyView3d: true, _startHereDismissed: true,
    // Existing awards isolate accepted-answer audio from progress celebrations.
    _badges: { firstStructure: true, viewToggler: true, spotterPro: true, speedDemon: true }, completedChallenges: ['spotter_3', 'cases_solved'],
    ...clone(round), ...clone(work), ...extra } };
  let host, deferred = false, pending = [];
  const announce = vi.fn(), toast = vi.fn(), apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const ctx = () => ({ toolData: data, gradeLevel: '9', announceToSR: announce, addToast: toast, setToolData: update => deferred ? pending.push(update) : apply(update) });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const match = find(tree(), predicate); expect(match).not.toBeNull(); return match; };
  const hook = (key, value = true) => node(element => element.props?.[key] === value);
  const mount = () => { if (!host || !host.isConnected) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = renderTool('anatomy', data, ctx()); return host; };
  mount(); settle(); announce.mockClear(); toast.mockClear(); tones.mockClear();
  return { state: () => data.anatomy, announce, toast, node, hook, mount,
    action: (key, value = true) => hook(key, value).props.onClick,
    click: (key, value = true) => hook(key, value).props.onClick(),
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    defer: () => { deferred = true; }, flush: () => { deferred = false; const updates = pending; pending = []; updates.forEach(apply); } };
}
function holdFocus() { const button = document.createElement('button'); button.textContent = 'Another action'; document.body.appendChild(button); button.focus(); return button; }
function act(s, callback, selector) {
  if (selector) { const control = s.mount().querySelector(selector); expect(control).not.toBeNull(); control.focus(); }
  callback(); const root = s.mount(); settle(); return root;
}
const study = s => act(s, s.action('data-anatomy-spotter-study', s.state()._spotterTarget), '[data-anatomy-spotter-study]');
const back = s => act(s, s.action('data-anatomy-spotter-study-return'), '[data-anatomy-spotter-study-return]');
function noEffects(s, held) { expect(s.announce).not.toHaveBeenCalled(); expect(tones).not.toHaveBeenCalled(); if (held) expect(document.activeElement).toBe(held); }
function paint(s) {
  const root = s.mount(), node = s.hook('data-anatomy-canvas', 'true'), canvas = root.querySelector('[data-anatomy-canvas]'), texts = [];
  const gradient = { addColorStop() {} }, noop = () => {};
  const context = new Proxy({ fillText: text => texts.push(String(text)), measureText: text => ({ width: String(text).length * 6 }),
    createRadialGradient: () => gradient, createLinearGradient: () => gradient, globalAlpha: 1 },
  { get(target, key) { return key in target ? target[key] : noop; }, set(target, key, value) { target[key] = value; return true; } });
  Object.defineProperty(canvas, 'getContext', { configurable: true, value: () => context });
  Object.defineProperty(canvas, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, width: 360, height: 520 }) });
  node.ref(canvas); let paints = 0; while (frames.length && paints++ < 5) frames.shift()(0); node.ref(null);
  expect(texts.length).toBeGreaterThan(0); return { texts, canvas, node };
}

let rectsDescriptor, scrollDescriptor, audioDescriptor, mediaDescriptor, hiddenDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = ''; frames = [];
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  audioDescriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext'); mediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: query => ({ matches: query.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; }); vi.stubGlobal('cancelAnimationFrame', () => {});
  tones = vi.fn(); class TestAudioContext { currentTime = 0; destination = {};
    createOscillator() { return { type: '', frequency: { value: 0 }, connect() {}, start: tones, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } }
  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: TestAudioContext });
});
afterEach(() => {
  if (window.__alloAnatomyCanvasCleanup) window.__alloAnatomyCanvasCleanup();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = '';
  for (const [object, key, descriptor] of [[HTMLElement.prototype, 'getClientRects', rectsDescriptor], [HTMLElement.prototype, 'scrollIntoView', scrollDescriptor],
    [window, 'AudioContext', audioDescriptor], [window, 'matchMedia', mediaDescriptor], [document, 'hidden', hiddenDescriptor]]) {
    if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key];
  }
});

for (const file of files) describe('Spotter study journeys: ' + file, () => {
  it('paints ordinary Explore labels and allows 2D selection while an unanswered round stays paused', () => {
    const s = session(file, { _activeTab: 'explore', _spotterFeedback: null, _bodyView3d: false, selectedStructure: 'skull', search: '', _studyFilter: 'all' });
    const before = savedRound(s.state()), drawing = paint(s);
    expect(drawing.texts).toContain('Skull (Cranium)'); expect(drawing.texts).not.toContain('Name this'); expect(drawing.texts).toContain('✓');
    const pausedRoot = s.mount(), pausedTools = pausedRoot.querySelector('[data-anatomy-learning-tools]');
    expect(pausedTools).not.toBeNull(); expect(pausedTools.textContent).toContain('Skull (Cranium)');
    expect(pausedRoot.querySelector('[data-anatomy-scale-journey="skull"]')).not.toBeNull();
    s.patch({ selectedStructure: null }); const canvas = s.mount().querySelector('[data-anatomy-canvas]');
    Object.defineProperty(canvas, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 360, height: 520 }) });
    s.hook('data-anatomy-canvas', 'true').props.onClick({ currentTarget: canvas, target: canvas, clientX: 180, clientY: 31.2 });
    expect(s.state().selectedStructure).toBe('skull'); expect(savedRound(s.state())).toEqual(before); expect(s.toast).not.toHaveBeenCalled();
  });

  it('keeps the active unanswered canvas protected without leaking the selected answer name', () => {
    const s = session(file, { _spotterFeedback: null, selectedStructure: 'skull', search: '', _studyFilter: 'all' });
    const before = savedRound(s.state()), drawing = paint(s);
    expect(drawing.texts).toContain('Name this'); expect(drawing.texts).not.toContain('Skull (Cranium)'); expect(drawing.texts).not.toContain('✓');
    expect(drawing.canvas.getAttribute('aria-label')).not.toContain('Skull');
    const pendingRoot = s.mount();
    expect(pendingRoot.querySelector('[data-anatomy-learning-tools]')).toBeNull();
    expect(pendingRoot.querySelector('[data-anatomy-scale-journey]')).toBeNull();
    drawing.node.props.onClick({ currentTarget: drawing.canvas, target: drawing.canvas, clientX: 180, clientY: 31.2 });
    expect(savedRound(s.state())).toEqual(before); expect(s.toast).toHaveBeenCalled();
    s.patch({ _spotterFeedback: 'ribs' }); const answeredRoot = s.mount(), answeredTools = answeredRoot.querySelector('[data-anatomy-learning-tools]');
    expect(answeredTools).not.toBeNull(); expect(answeredTools.textContent).toContain('Skull (Cranium)');
    expect(answeredRoot.querySelector('[data-anatomy-scale-journey="skull"]')).not.toBeNull();
  });

  it('studies a missed answer in 2D and returns to the exact saved feedback and original navigation', () => {
    const s = session(file), before = savedRound(s.state()), workBefore = savedWork(s.state()), root = study(s), route = s.state()._spotterStudyOrigin;
    expect(route).toMatchObject(origin({ token: expect.any(String) })); expect(route.token.length).toBeGreaterThan(0); expect(route.token.length).toBeLessThanOrEqual(128);
    expect(s.state()._spotterStudyNavigationToken).toBe(route.token);
    expect(s.state()).toMatchObject({ _activeTab: 'explore', selectedStructure: 'skull', search: '', _studyFilter: 'all', _bodyView3d: false });
    expect(root.querySelector('[data-anatomy-spotter-study-origin="skull"]')).not.toBeNull();
    expect(document.activeElement.hasAttribute('data-anatomy-structure-detail-heading')).toBe(true); expect(savedRound(s.state())).toEqual(before); expect(savedWork(s.state())).toEqual(workBefore);
    const returned = back(s); expect(s.state()).toMatchObject({ _activeTab: 'spotter', selectedStructure: 'ribs', search: '  saved query  ', _studyFilter: 'notes', _bodyView3d: true, _spotterStudyOrigin: null });
    expect(document.activeElement).toBe(returned.querySelector('[data-anatomy-spotter-feedback]')); expect(savedRound(s.state())).toEqual(before); expect(savedWork(s.state())).toEqual(workBefore);
  });

  it.each([
    ['scapula', 'posterior', 2, 'anterior', 1], ['femur', 'anterior', 1, 'posterior', 2]
  ])('locates restored hidden %s without changing the answered round', (target, requiredView, requiredLevel, originalView, originalLevel) => {
    const options = [target, 'skull', 'mandible', 'ribs'].map(id => ({ id }));
    const s = session(file, { view: originalView, complexity: originalLevel, selectedStructure: null, _spotterTarget: target, _spotterOpts: options });
    const before = savedRound(s.state()); study(s); expect(s.state()).toMatchObject({ view: requiredView, complexity: Math.max(originalLevel, requiredLevel), selectedStructure: target });
    expect(savedRound(s.state())).toEqual(before); back(s); expect(s.state()).toMatchObject({ view: originalView, complexity: originalLevel, selectedStructure: null }); expect(savedRound(s.state())).toEqual(before);
  });

  it('restores a persisted study journey and merges newer notes, confidence, Quiz and cards', () => {
    const s = session(file); study(s); const saved = clone(s.state()); document.body.innerHTML = '';
    const reload = session(file, saved); reload.patch({ _structureNotes: { skull: 'Newer explanation.' }, _structureConfidence: { skull: 'learning' },
      quizScore: 5, _flashcardIdx: 0, _clinicalStudy: { version: 1, cases: { case_7: { draft: 'Newer case reasoning.', hint: false, revealed: true } } } });
    const workBefore = savedWork(reload.state()), roundBefore = savedRound(reload.state()); back(reload);
    expect(savedWork(reload.state())).toEqual(workBefore); expect(savedRound(reload.state())).toEqual(roundBefore); expect(reload.state()._bodyView3d).toBe(true);
  });

  it('replaces a clinical marker journey with the new missed-answer Study journey after actual activity switching', () => {
    const s = session(file, { _activeTab: 'explore', _showClinical: true, _bodyView3d: false, search: '', _studyFilter: 'all',
      selectedStructure: null, _spotterTarget: 'patella', _spotterOpts: ['patella', 'skull', 'mandible', 'ribs'].map(id => ({ id })),
      _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My knee reasoning.', hint: true, revealed: true } } },
      _connectionStudyOrigin: { version: 1, token: 'prior-connection', connectionId: 'conn_3', structureId: 'femur', systemId: 'skeletal',
        view: 'anterior', complexity: 3, search: '', studyFilter: 'all', entry: 'process', partnerSystemId: null, bodyView3d: false } });
    const workBefore = savedWork(s.state()), roundBefore = savedRound(s.state());
    const caseRoot = act(s, s.action('data-anatomy-case-marker', 'case_1'), '[data-anatomy-case-marker="case_1"]');
    expect(caseRoot.querySelector('[data-anatomy-case-origin="case_1"]')).not.toBeNull();
    act(s, s.node(node => node.props?.id === 'anatomy-mode-tab-spotter').props.onClick, '#anatomy-mode-tab-spotter');
    expect(s.state()._activeTab).toBe('spotter'); expect(s.state()._caseDiagramReturn).toBe('case_1');
    const destination = study(s);
    expect(s.state()).toMatchObject({ _activeTab: 'explore', selectedStructure: 'patella', _caseDiagramOrigin: null,
      _caseDiagramReturn: null, _connectionStudyOrigin: null });
    expect(destination.querySelector('[data-anatomy-spotter-study-origin="patella"]')).not.toBeNull();
    expect(destination.querySelector('[data-anatomy-case-origin]')).toBeNull();
    expect(savedWork(s.state())).toEqual(workBefore); expect(savedRound(s.state())).toEqual(roundBefore);
    back(s); expect(s.state()._activeTab).toBe('spotter'); expect(savedWork(s.state())).toEqual(workBefore); expect(savedRound(s.state())).toEqual(roundBefore);
  });

  it('does not offer the remedial Study action before an answer or after a correct answer', () => {
    for (const feedback of [null, 'skull']) expect(session(file, { _spotterFeedback: feedback }).mount().querySelector('[data-anatomy-spotter-study]')).toBeNull();
  });

  const stale = [
    ['activity', { _activeTab: 'flashcards' }], ['system', { system: 'muscular' }], ['view', { view: 'posterior' }], ['level', { complexity: 2 }],
    ['selection', { selectedStructure: 'mandible' }], ['query', { search: 'new query' }], ['filter', { _studyFilter: 'all' }],
    ['question serial', { _spotterSerial: 8 }], ['feedback', { _spotterFeedback: 'mandible' }], ['active round', { _spotterActive: false }],
    ['timing preference', { _spotterTimed: false }], ['3D preference', { _bodyView3d: false }], ['model style', { _body3dStyle: 'blueprint' }],
    ['model focus', { _anatomyModelFocus: true }], ['route token', { _spotterStudyNavigationToken: 'replacement' }],
    ['guidance revision', { _guidanceRevision: 2 }], ['sheet revision', { _studySheetRevision: 2 }], ['import revision', { _studyImportRevision: 2 }]
  ];
  it.each(stale)('rejects retained Study, Next, End and diagram controls after a new %s', (_, patch) => {
    const s = session(file, { search: '' }), callbacks = ['data-anatomy-spotter-study', 'data-anatomy-spotter-next', 'data-anatomy-spotter-end', 'data-anatomy-spotter-diagram'].map(key => s.action(key, key.endsWith('study') ? 'skull' : true));
    s.patch(patch); const before = clone(s.state()); callbacks.forEach(callback => callback()); expect(s.state()).toEqual(before);
    s.mount(); const held = holdFocus(); settle(); noEffects(s, held);
  });

  it.each(stale.filter(([name]) => !['query', 'filter', '3D preference'].includes(name)))('rejects retained return after a new %s', (_, patch) => {
    const s = session(file, restored()), callback = s.action('data-anatomy-spotter-study-return'); s.patch(patch);
    const before = clone(s.state()); callback(); expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle(); noEffects(s, held);
  });

  it('consumes a route once and rejects a return captured before its token is replaced', () => {
    const s = session(file, restored()), callback = s.action('data-anatomy-spotter-study-return'); back(s); s.announce.mockClear(); tones.mockClear(); const before = clone(s.state());
    callback(); expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle(); noEffects(s, held);
    const newer = session(file, restored()), old = newer.action('data-anatomy-spotter-study-return'); newer.patch({ _spotterStudyOrigin: origin({ token: 'new-route' }), _spotterStudyNavigationToken: 'new-route' });
    const saved = clone(newer.state()); old(); expect(newer.state()).toEqual(saved);
  });

  it('accepts deferred Study only after commit while retaining newer unrelated work', () => {
    const s = session(file), callback = s.action('data-anatomy-spotter-study', 'skull'); s.defer(); callback(); expect(s.state()._spotterStudyOrigin).toBeUndefined(); noEffects(s);
    s.patch({ _structureNotes: { skull: 'Written before commit.' } }); s.flush(); s.mount(); settle();
    expect(s.state()._spotterStudyOrigin.targetId).toBe('skull'); expect(s.state()._structureNotes.skull).toBe('Written before commit.'); expect(s.announce).toHaveBeenCalledTimes(1);
  });

  it('rejects deferred Study if the source question changed before commit', () => {
    const s = session(file); s.defer(); s.click('data-anatomy-spotter-study', 'skull'); s.patch({ _spotterSerial: 8 }); const before = clone(s.state()); s.flush(); expect(s.state()).toEqual(before);
    s.mount(); const held = holdFocus(); settle(); noEffects(s, held);
  });

  it.each(['study', 'return', 'answer', 'start', 'next'])('retains deliberate focus during an accepted %s', stage => {
    const extra = stage === 'return' ? restored() : stage === 'answer' ? { _spotterFeedback: null } : stage === 'start' ? { _spotterActive: false, search: '' } : stage === 'next' ? { search: '' } : {};
    const s = session(file, extra), key = { study: 'data-anatomy-spotter-study', return: 'data-anatomy-spotter-study-return', answer: 'data-anatomy-spotter-option', start: 'data-anatomy-spotter-start', next: 'data-anatomy-spotter-next' }[stage];
    s.click(key, stage === 'study' || stage === 'answer' ? 'skull' : true);
    s.mount(); const held = holdFocus(); settle(); expect(document.activeElement).toBe(held);
  });

  it.each(['study', 'return', 'answer', 'start', 'next'])('suppresses accepted %s effects when its rendered destination is superseded', stage => {
    const extra = stage === 'return' ? restored() : stage === 'answer' ? { _spotterFeedback: null } : stage === 'start' ? { _spotterActive: false, search: '', _studyFilter: 'all' } : stage === 'next' ? { search: '' } : {};
    const s = session(file, extra), key = { study: 'data-anatomy-spotter-study', return: 'data-anatomy-spotter-study-return', answer: 'data-anatomy-spotter-option', start: 'data-anatomy-spotter-start', next: 'data-anatomy-spotter-next' }[stage];
    s.click(key, stage === 'study' || stage === 'answer' ? 'skull' : true); s.patch({ _activeTab: 'connections' }); s.mount(); const held = holdFocus(); settle(); noEffects(s, held);
  });

  it.each(['skull', 'ribs'])('announces and sounds one accepted answer %s, then rejects duplicates', choice => {
    const s = session(file, { _spotterFeedback: null }), callback = s.action('data-anatomy-spotter-option', choice); act(s, callback, '[data-anatomy-spotter-option="' + choice + '"]');
    expect(s.state()._spotterTotal).toBe(5); expect(s.state()._spotterFeedback).toBe(choice); expect(s.announce).toHaveBeenCalledTimes(1); expect(tones).toHaveBeenCalled();
    s.announce.mockClear(); tones.mockClear(); const before = clone(s.state()); callback(); callback(); expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle(); noEffects(s, held);
  });

  it('keeps a no-op ordinary feedback Return from inserting model-focus state', () => {
    const s = session(file), before = clone(s.state()); s.click('data-anatomy-spotter-return'); s.mount(); settle(); expect(s.state()).toEqual(before);
  });

  it.each([0, null, undefined, -1, NaN, Infinity, '2.5'])('omits a nonexistent or malformed timed best record %s from the footer', value => {
    const s = session(file, { _spotterTimedBestTime: value, _spotterBestTime: 1.2 }), stats = s.mount().querySelector('.anatomy-stats-panel');
    expect(stats.querySelector('[data-anatomy-spotter-best]')).toBeNull();
    expect(stats.textContent).not.toContain('Best Spotter'); expect(stats.textContent).not.toContain('Best timed response');
  });

  it.each([3.5, 1000])('labels a genuine timed best record of %s seconds in the footer', value => {
    const stats = session(file, { _spotterTimedBestTime: value }).mount().querySelector('.anatomy-stats-panel');
    expect(stats.querySelector('[data-anatomy-spotter-best]')).not.toBeNull();
    expect(stats.textContent).toContain('Best timed response'); expect(stats.textContent).toContain(value.toFixed(1)); expect(stats.textContent).not.toContain('Best Spotter');
  });

  const invalid = [
    ['array', []], ['version', origin({ version: 2 })], ['empty token', origin({ token: '' })], ['long token', origin({ token: 'x'.repeat(129) })],
    ...['constructor', 'toString', '__proto__', 'forged'].map(systemId => ['system ' + systemId, origin({ systemId })]),
    ...[null, 7, ['skeletal'], { id: 'skeletal' }].map(systemId => ['non-string system ' + JSON.stringify(systemId), origin({ systemId })]),
    ['view', origin({ view: 'side' })], ['level', origin({ complexity: 4 })], ['selection', origin({ selectedStructure: 'biceps' })],
    ['query length', origin({ search: 'x'.repeat(201) })], ['query type', origin({ search: 7 })], ['filter', origin({ studyFilter: 'forged' })],
    ['3D flag', origin({ bodyView3d: 'yes' })], ['quiz flag', origin({ quizMode: 'yes' })], ['empty question', origin({ questionKey: '' })],
    ['long question', origin({ questionKey: 'x'.repeat(2001) })], ['target', origin({ targetId: 'biceps' })], ['answer', origin({ answerId: 'biceps' })],
    ['correct answer', origin({ answerId: 'skull' })], ['entirely inherited origin', Object.create(origin())],
    ...Object.keys(origin()).map(field => { const raw = origin(), value = raw[field]; delete raw[field]; Object.setPrototypeOf(raw, { [field]: value }); return ['inherited ' + field, raw]; })
  ];
  it.each(invalid)('hides a malformed restored study origin: %s', (_, raw) => {
    const root = session(file, restored({ _spotterStudyOrigin: raw })).mount(); expect(root.querySelector('[data-anatomy-spotter-study-origin]')).toBeNull(); expect(root.querySelector('[data-anatomy-spotter-study-return]')).toBeNull();
  });

  it.each([
    ['token mismatch', { _spotterStudyNavigationToken: 'other-route' }], ['wrong target', { selectedStructure: 'ribs' }], ['3D', { _bodyView3d: true }],
    ['query', { search: 'skull' }], ['filter', { _studyFilter: 'notes' }], ['wrong activity', { _activeTab: 'quiz' }], ['new question', { _spotterSerial: 8 }],
    ['inactive round', { _spotterActive: false }], ['different answer', { _spotterFeedback: 'mandible' }],
    ['incomplete choices', { _spotterOpts: [{ id: 'skull' }, { id: 'ribs' }] }], ['duplicate choices', { _spotterOpts: [{ id: 'skull' }, { id: 'ribs' }, { id: 'ribs' }, { id: 'mandible' }] }]
  ])('hides a study return outside its exact saved destination: %s', (_, patch) => {
    const root = session(file, restored(patch)).mount(); expect(root.querySelector('[data-anatomy-spotter-study-return]')).toBeNull();
  });
});
