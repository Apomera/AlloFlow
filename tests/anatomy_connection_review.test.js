import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const firstAnswers = { version: 1, answers: { conn_1: 'choice_1', conn_2: 'choice_0' } };
const practice = (row = {}, extra = {}) => ({ version: 1, sessions: { conn_1: { token: 'saved-practice', answer: null, active: true, ...row }, ...extra } });
const work = {
  _structureNotes: { femur: 'My saved thigh-bone explanation.', alveoli: 'My gas-exchange explanation.' },
  _structureConfidence: { femur: 'learning' }, _confidenceAt: { femur: now },
  _retrievalEvidence: { femur: { attempts: 3, correct: 2 } }, _compareStructure: 'ribs',
  quizIdx: 3, quizScore: 2, _quizAttempts: 4,
  quizFeedback: { chosen: 'ribs', correct: false, questionKey: 'saved-question' },
  _quizQuestion: { token: 'saved-question-token', index: 3 },
  _quizActivityReturn: { token: 'saved-question-token', index: 3, score: 2, attempts: 4 },
  _flashcardDeck: ['ribs', 'femur'], _flashcardDeckContext: 'saved-deck', _flashcardIdx: 1,
  _flashcardFlipped: true, _flashcardRoundRated: { ribs: true },
  _flashcardRounds: { 'skeletal:2:all': { context: 'saved-deck', deckIds: ['ribs', 'femur'], index: 1, rated: { ribs: true } } },
  researchPoints: 100, totalRP: 125
};
const protectedWork = state => clone(Object.fromEntries(Object.keys(work).map(key => [key, state[key]])));
const settle = () => vi.runAllTimers();
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
    _activeTab: 'connections', _expandedConn: 'conn_1', system: 'circulatory', view: 'anterior',
    complexity: 3, selectedStructure: null, search: '', _studyFilter: 'all', _bodyView3d: false,
    _startHereDismissed: true, _badges: { firstStructure: true }, ...clone(work), ...extra
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
    click: (hook, value) => byHook(hook, value).props.onClick(),
    answer: choice => byHook('data-anatomy-connection-option', choice).props.onClick,
    start: id => byHook('data-anatomy-connection-practice-start', id).props.onClick,
    saved: id => byHook('data-anatomy-connection-practice-saved', id).props.onClick,
    choose: id => byHook('id', 'anatomy-connection-select').props.onChange({ target: { value: id } }),
    switch: tab => byHook('id', 'anatomy-mode-tab-' + tab).props.onClick(),
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const updates = pending; pending = []; updates.forEach(apply); }
  };
}
function holdFocus() { const button = document.createElement('button'); button.textContent = 'Another action'; document.body.appendChild(button); button.focus(); return button; }
function act(s, callback, selector) {
  if (selector) { const target = s.mount().querySelector(selector); expect(target).not.toBeNull(); target.focus(); }
  callback(); const root = s.mount(); settle(); return root;
}
function startPractice(s, id = 'conn_1') { return act(s, s.start(id), '[data-anatomy-connection-practice-start="' + id + '"]'); }
function answer(s, choice) { return act(s, s.answer(choice), '[data-anatomy-connection-option="' + choice + '"]'); }
function feedback(root, kind) { const result = root.querySelector('[data-anatomy-connection-feedback-kind="' + kind + '"]'); expect(result).not.toBeNull(); return result; }
function expectNoEffects(s, held) { expect(s.announce).not.toHaveBeenCalled(); expect(toneStarts).not.toHaveBeenCalled(); if (held) expect(document.activeElement).toBe(held); }

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
    currentTime = 0;
    destination = {};
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

for (const file of files) describe('Anatomy connection practice and saved first checks: ' + file, () => {
  it('saves one accepted first response, focuses feedback and emits its effects only once', () => {
    const s = session(file), captured = s.answer('choice_1'), before = protectedWork(s.state());
    const root = act(s, captured, '[data-anatomy-connection-option="choice_1"]'), result = feedback(root, 'first');
    expect(s.state()._connectionConcepts).toEqual({ version: 1, answers: { conn_1: 'choice_1' } });
    expect(result.getAttribute('data-anatomy-connection-response')).toBe('choice_1');
    expect(result.getAttribute('role')).toBe('group'); expect(result.getAttribute('tabindex')).toBe('-1');
    expect(result.getAttribute('aria-live')).toBeNull(); expect(document.activeElement).toBe(result);
    expect(root.querySelectorAll('[data-anatomy-connection-option][disabled]')).toHaveLength(3);
    expect(s.announce).toHaveBeenCalledTimes(1); expect(toneStarts).toHaveBeenCalled();
    s.announce.mockClear(); toneStarts.mockClear(); captured(); captured(); s.mount(); const held = holdFocus(); settle();
    expectNoEffects(s, held); expect(protectedWork(s.state())).toEqual(before);
  });

  it('starts practice without exposing the saved answer or explanation and focuses its question', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers) }), before = protectedWork(s.state());
    const root = startPractice(s), row = s.state()._connectionPractice.sessions.conn_1;
    expect(row).toMatchObject({ token: expect.any(String), answer: null, active: true });
    expect(row.token.length).toBeGreaterThan(0); expect(row.token.length).toBeLessThanOrEqual(128);
    expect(root.querySelector('[data-anatomy-connection-feedback-kind]')).toBeNull();
    expect(root.querySelectorAll('[data-anatomy-connection-option][disabled]')).toHaveLength(0);
    const check = root.querySelector('[data-anatomy-connection-practice="conn_1"]');
    expect(check.getAttribute('data-anatomy-connection-attempt')).toBe(row.token);
    expect(check.getAttribute('tabindex')).toBe('-1'); expect(document.activeElement).toBe(check);
    expect(s.state()._connectionConcepts).toEqual(firstAnswers); expect(protectedWork(s.state())).toEqual(before);
  });

  it.each(['choice_0', 'choice_1'])('records a practice response %s without changing first-check score or learner evidence', choice => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers) }); startPractice(s);
    const token = s.state()._connectionPractice.sessions.conn_1.token, before = protectedWork(s.state()), root = answer(s, choice), result = feedback(root, 'practice');
    expect(s.state()._connectionPractice.sessions.conn_1).toEqual({ token, answer: choice, active: true });
    expect(s.state()._connectionConcepts).toEqual(firstAnswers);
    expect(root.querySelector('.anatomy-connection-progress').textContent).toContain('First answers: 2/10 · 1 correct');
    expect(result.getAttribute('data-anatomy-connection-feedback-token')).toBe(token);
    expect(result.getAttribute('data-anatomy-connection-response')).toBe(choice); expect(document.activeElement).toBe(result);
    expect(root.querySelectorAll('[data-anatomy-connection-option][disabled]')).toHaveLength(3);
    expect(protectedWork(s.state())).toEqual(before);
  });

  it('creates a new attempt when practice restarts and rejects an answer captured from the earlier attempt', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers) }); startPractice(s);
    const oldToken = s.state()._connectionPractice.sessions.conn_1.token, captured = s.answer('choice_0');
    answer(s, 'choice_1');
    startPractice(s); const row = s.state()._connectionPractice.sessions.conn_1;
    expect(row.token).not.toBe(oldToken); expect(row).toMatchObject({ active: true, answer: null });
    s.announce.mockClear(); toneStarts.mockClear(); const before = clone(s.state()); captured();
    expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle(); expectNoEffects(s, held);
  });

  it.each([null, 'choice_0'])('returns to the saved first check while retaining practice response %s', response => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice({ answer: response }) });
    const root = act(s, s.saved('conn_1'), '[data-anatomy-connection-practice-saved="conn_1"]');
    expect(s.state()._connectionPractice.sessions.conn_1).toEqual({ token: 'saved-practice', answer: response, active: false });
    expect(s.state()._connectionConcepts).toEqual(firstAnswers);
    const result = feedback(root, 'first'); expect(result.getAttribute('data-anatomy-connection-response')).toBe('choice_1');
    expect(document.activeElement).toBe(result);
  });

  it('keeps another connection practice session and newer unrelated work when starting and answering', () => {
    const other = { token: 'other-session', answer: 'choice_1', active: true };
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice({ active: false }, { conn_2: other }) });
    const start = s.start('conn_1');
    s.patch({ _structureNotes: { femur: 'Newer note.' }, _compareStructure: 'clavicle', _connectionPractice: practice({ active: false }, { conn_2: { ...other, answer: 'choice_0' } }) });
    act(s, start); const before = protectedWork(s.state()), callback = s.answer('choice_0');
    s.patch({ _connectionConcepts: { version: 1, answers: { ...firstAnswers.answers, conn_3: 'choice_1' } } });
    act(s, callback);
    expect(s.state()._connectionPractice.sessions.conn_2).toEqual({ ...other, answer: 'choice_0' });
    expect(s.state()._connectionConcepts.answers).toEqual({ ...firstAnswers.answers, conn_3: 'choice_1' });
    expect(protectedWork(s.state())).toEqual(before);
  });

  it('rejects a captured first-answer handler after that check enters practice', () => {
    const s = session(file), first = s.answer('choice_0'); answer(s, 'choice_1'); startPractice(s);
    s.announce.mockClear(); toneStarts.mockClear(); const before = clone(s.state()); first();
    expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle(); expectNoEffects(s, held);
  });

  it('rejects duplicate practice answers without replacing the accepted answer or repeating effects', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice() }), captured = s.answer('choice_0');
    act(s, captured); s.announce.mockClear(); toneStarts.mockClear(); const before = clone(s.state());
    captured(); captured(); expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle(); expectNoEffects(s, held);
  });

  const foreign = [
    ['activity', { _activeTab: 'explore' }], ['topic', { _expandedConn: 'conn_2' }],
    ['system', { system: 'respiratory' }], ['view', { view: 'posterior' }],
    ['level', { complexity: 2 }], ['selection', { selectedStructure: 'pulm_art' }],
    ['3D display', { _bodyView3d: true }], ['navigation generation', { _connectionNavigationToken: 'newer-route' }]
  ];
  it.each(foreign)('rejects a captured first answer after the %s changes', (_, patch) => {
    const s = session(file), callback = s.answer('choice_0'); s.patch(patch); const before = clone(s.state()); callback();
    expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle(); expectNoEffects(s, held);
  });
  it.each(foreign)('rejects captured practice actions after the %s changes', (_, patch) => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice() });
    const callbacks = [s.answer('choice_0'), s.saved('conn_1')];
    s.patch(patch); const before = clone(s.state()); callbacks.forEach(callback => callback());
    expect(s.state()).toEqual(before); s.mount(); const held = holdFocus(); settle(); expectNoEffects(s, held);
  });
  it.each(foreign)('rejects a captured practice-start action after the %s changes', (_, patch) => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers) }), callback = s.start('conn_1');
    s.patch(patch); const before = clone(s.state()); callback(); expect(s.state()).toEqual(before);
    s.mount(); const held = holdFocus(); settle(); expectNoEffects(s, held);
  });

  it('rejects a captured practice answer if the saved first answer becomes invalid', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice() }), callback = s.answer('choice_0');
    s.patch({ _connectionConcepts: { version: 1, answers: { conn_1: 'forged', conn_2: 'choice_0' } } });
    const before = clone(s.state()); callback(); expect(s.state()).toEqual(before); s.mount(); settle(); expectNoEffects(s);
  });

  it('waits for a deferred updater before committing practice response and emitting feedback effects', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice() }), callback = s.answer('choice_0');
    s.defer(); callback(); expect(s.state()._connectionPractice.sessions.conn_1.answer).toBeNull(); expectNoEffects(s);
    s.flush(); const root = s.mount(); settle(); expect(s.state()._connectionPractice.sessions.conn_1.answer).toBe('choice_0');
    expect(s.announce).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(feedback(root, 'practice'));
  });

  it('rejects a deferred practice response when a restart replaced its attempt before the updater runs', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice() }), callback = s.answer('choice_0');
    s.defer(); callback(); s.patch({ _connectionPractice: practice({ token: 'replacement-attempt' }) });
    const before = clone(s.state()); s.flush(); expect(s.state()).toEqual(before); s.mount(); settle(); expectNoEffects(s);
  });

  it('does not announce or focus feedback from an accepted response after another topic supersedes it', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice() }); s.answer('choice_0')();
    s.patch({ _expandedConn: 'conn_2' }); s.mount(); const held = holdFocus(); settle(); expectNoEffects(s, held);
  });

  it('does not steal focus when the learner chooses another control before feedback focus runs', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice() }); s.answer('choice_0')();
    s.mount(); const held = holdFocus(); settle(); expect(document.activeElement).toBe(held);
  });

  it.each([null, 'choice_0'])('restores an active practice session with saved response %s across reload and activity changes', response => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: practice({ answer: response }) });
    const saved = clone(s.state()); document.body.innerHTML = ''; const restored = session(file, saved);
    let root = restored.mount(); expect(root.querySelector('[data-anatomy-connection-practice="conn_1"]')).not.toBeNull();
    if (response) expect(feedback(root, 'practice').getAttribute('data-anatomy-connection-response')).toBe(response);
    else expect(root.querySelector('[data-anatomy-connection-feedback-kind]')).toBeNull();
    restored.switch('explore'); restored.mount(); settle(); restored.switch('connections'); root = restored.mount(); settle();
    expect(restored.state()._connectionPractice).toEqual(saved._connectionPractice);
    expect(root.querySelector('[data-anatomy-connection-attempt="saved-practice"]')).not.toBeNull();
  });

  it('preserves practice through a marker detour and a return to the originating structure', () => {
    const route = { version: 1, token: 'origin-route', connectionId: 'conn_3', structureId: 'femur', systemId: 'skeletal', view: 'anterior', complexity: 2, search: 'thigh', studyFilter: 'all', entry: 'process', partnerSystemId: null, bodyView3d: false };
    const state = { _expandedConn: 'conn_3', _connectionConcepts: { version: 1, answers: { conn_3: 'choice_1' } },
      _connectionPractice: { version: 1, sessions: { conn_3: { token: 'route-practice', answer: null, active: true } } }, _connectionStudyOrigin: route };
    const s = session(file, state), before = clone(s.state()._connectionPractice);
    act(s, s.byHook('data-anatomy-connection-marker', 'biceps').props.onClick);
    expect(s.state()).toMatchObject({ _activeTab: 'connections', selectedStructure: 'biceps', system: 'muscular' });
    act(s, s.byHook('data-anatomy-connection-origin-return', 'femur').props.onClick);
    expect(s.state()).toMatchObject({ _activeTab: 'explore', selectedStructure: 'femur', system: 'skeletal' });
    s.switch('connections'); const root = s.mount(); settle();
    expect(s.state()._connectionPractice).toEqual(before);
    expect(root.querySelector('[data-anatomy-connection-practice="conn_3"]')).not.toBeNull();
  });

  it('shows only the selected lesson and restores all ten summaries through the overview action', () => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers) }); let root = s.mount();
    expect([...root.querySelectorAll('[data-anatomy-connection]')].filter(article => !article.hidden).map(article => article.getAttribute('data-anatomy-connection'))).toEqual(['conn_1']);
    root = act(s, s.byHook('data-anatomy-connection-all', true).props.onClick);
    expect(s.state()._expandedConn).toBeNull();
    expect([...root.querySelectorAll('[data-anatomy-connection]')].filter(article => !article.hidden)).toHaveLength(10);
    expect(document.activeElement.id).toBe('anatomy-connection-select');
    s.choose('conn_2'); root = s.mount(); settle();
    expect([...root.querySelectorAll('[data-anatomy-connection]')].filter(article => !article.hidden)).toHaveLength(1);
    s.choose(''); root = s.mount(); settle();
    expect([...root.querySelectorAll('[data-anatomy-connection]')].filter(article => !article.hidden)).toHaveLength(10);
  });

  it('labels first-answer status consistently in overview summaries and the native chooser', () => {
    const s = session(file, { _expandedConn: null, _connectionConcepts: clone(firstAnswers), _connectionPractice: practice({ answer: 'choice_0' }) }), root = s.mount();
    expect(root.querySelector('[data-anatomy-connection="conn_1"] [data-anatomy-connection-first-status]').getAttribute('data-anatomy-connection-first-status')).toBe('review');
    expect(root.querySelector('[data-anatomy-connection="conn_2"] [data-anatomy-connection-first-status]').getAttribute('data-anatomy-connection-first-status')).toBe('correct');
    expect(root.querySelector('[data-anatomy-connection="conn_3"] [data-anatomy-connection-first-status]').getAttribute('data-anatomy-connection-first-status')).toBe('unanswered');
    expect(root.querySelector('#anatomy-connection-select option[value="conn_1"]').textContent).toContain('Review first answer');
    expect(root.querySelector('#anatomy-connection-select option[value="conn_2"]').textContent).toContain('Correct first answer');
    expect(root.querySelector('#anatomy-connection-select option[value="conn_3"]').textContent).toContain('Not answered');
    expect(root.querySelector('.anatomy-connection-progress').textContent).toContain('First answers: 2/10 · 1 correct');
  });

  const invalidPractice = [
    ['a missing version', { sessions: { conn_1: { token: 'saved', answer: null, active: true } } }],
    ['an unknown version', { version: 0, sessions: { conn_1: { token: 'saved', answer: null, active: true } } }],
    ['an array container', []], ['an array session map', { version: 1, sessions: [] }],
    ['an array row', { version: 1, sessions: { conn_1: [] } }], ['an empty token', practice({ token: '' })],
    ['an oversized token', practice({ token: 'x'.repeat(129) })], ['a nonstring token', practice({ token: 3 })],
    ['an unknown choice', practice({ answer: 'forged' })], ['an array answer', practice({ answer: ['choice_0'] })],
    ['a nonboolean active flag', practice({ active: 'yes' })], ['an object answer', practice({ answer: { id: 'choice_0' } })],
    ['an inherited session row', { version: 1, sessions: Object.create({ conn_1: { token: 'inherited', answer: 'choice_0', active: true } }) }]
  ];
  it.each(invalidPractice)('ignores practice restored from %s and still exposes the saved first feedback', (_, saved) => {
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: saved }), root = s.mount();
    expect(root.querySelector('[data-anatomy-connection-practice]')).toBeNull();
    expect(root.querySelector('[data-anatomy-connection-attempt="first"]')).not.toBeNull();
    expect(feedback(root, 'first').getAttribute('data-anatomy-connection-response')).toBe('choice_1');
  });

  it.each([
    ['no saved first answer', { version: 1, answers: { conn_2: 'choice_0' } }],
    ['an invalid saved first choice', { version: 1, answers: { conn_1: 'forged' } }],
    ['a legacy first-answer version', { version: 0, answers: { conn_1: 'choice_0' } }],
    ['an inherited first answer', { version: 1, answers: Object.create({ conn_1: 'choice_0' }) }]
  ])('does not restore practice or expose practice actions when there is %s', (_, saved) => {
    const s = session(file, { _connectionConcepts: saved, _connectionPractice: practice({ answer: 'choice_0' }) }), root = s.mount();
    expect(root.querySelector('[data-anatomy-connection-practice]')).toBeNull();
    expect(root.querySelector('[data-anatomy-connection-practice-start]')).toBeNull();
    expect(root.querySelector('[data-anatomy-connection-feedback-kind]')).toBeNull();
  });

  it('keeps forged and inherited connection IDs out of normalized practice after a legitimate write', () => {
    const sessions = { conn_2: { token: 'known', answer: 'choice_1', active: true }, forged: { token: 'forged', answer: 'choice_0', active: true },
      constructor: { token: 'constructor', answer: 'choice_0', active: true }, toString: { token: 'method', answer: 'choice_0', active: true } };
    const s = session(file, { _connectionConcepts: clone(firstAnswers), _connectionPractice: { version: 1, sessions } }); startPractice(s);
    expect(Object.keys(s.state()._connectionPractice.sessions).sort()).toEqual(['conn_1', 'conn_2']);
    expect(s.state()._connectionPractice.sessions.conn_2).toEqual(sessions.conn_2);
  });
});
