import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const now = 1800000000000;
const clone = value => JSON.parse(JSON.stringify(value));
const base = {
  system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', _tourCompleted: true,
  _startHereDismissed: true, _readingMode: true,
  _structureNotes: { ribs: 'My saved explanation of protection.' },
  _systemsMotionLearning: { exercise: { explanation: 'My activity explanation.' } },
  _feedbackExperiment: { direction: 'warm', explanation: 'My feedback explanation.', sessions: {} },
  _aiInput: 'My current Tutor question.', _aiMessages: [{ role: 'user', text: 'My earlier question.' }],
  quizIdx: 3, quizScore: 2, quizFeedback: null, _quizAttempts: 4
};
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children);
}
const protectedWork = state => clone(Object.fromEntries([
  '_structureConfidence', '_confidenceAt', '_structureNotes', '_retrievalEvidence',
  '_systemsMotionLearning', '_feedbackExperiment', '_aiInput', '_aiMessages', '_aiDraftContext', '_aiDraftRevision',
  'quizIdx', 'quizScore', 'quizFeedback', '_quizAttempts', '_quizQuestion'
].filter(key => state[key] !== undefined).map(key => [key, state[key]])));

let rectsDescriptor, scrollDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(now); document.body.innerHTML = '';
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 200, height: 44 }] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  for (const [key, descriptor] of [['getClientRects', rectsDescriptor], ['scrollIntoView', scrollDescriptor]]) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor); else delete HTMLElement.prototype[key];
  }
});
const settle = () => vi.advanceTimersByTime(10);
function marker() { const node = document.createElement('textarea'); document.body.appendChild(node); node.focus(); return node; }
function session(file, extra = {}) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { ...clone(base), ...extra } }, grade = '9', deferred = false, pending = [], host;
  const announce = vi.fn(), sound = vi.fn(), apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => { if (deferred) pending.push(update); else apply(update); };
  const ctx = () => ({ toolData: data, gradeLevel: grade, setToolData, announceToSR: announce, playSound: sound });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const found = find(tree(), predicate); expect(found).not.toBeNull(); return found; };
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); settle(); announce.mockClear(); sound.mockClear();
  const s = {
    data: () => data.anatomy, tree, node, announce, sound,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    grade: value => { grade = value; },
    action: () => node(n => n.type === 'button' && n.props['data-anatomy-guidance-action'] !== undefined).props.onClick,
    queue: id => node(n => n.props?.['data-review-queue-id'] === id).props.onClick,
    click: label => node(n => n.type === 'button' && (text(n).trim() === label || n.props['aria-label'] === label)).props.onClick(),
    captureQuestion: () => node(n => n.props?.['data-anatomy-quiz-panel']).ref({}),
    answer: id => node(n => n.props?.['data-anatomy-quiz-option'] === id).props.onClick(),
    html: () => { const root = document.createElement('div'); root.innerHTML = markup(); return root; },
    mount: () => { if (!host) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = markup(); return host; },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const queue = pending; pending = []; queue.forEach(apply); }
  };
  return s;
}
function exploreAll(s, rated = false) {
  const ids = [...s.html().querySelectorAll('[data-anatomy-structure-option]')].map(node => node.getAttribute('data-anatomy-structure-option'));
  expect(ids.length).toBeGreaterThan(3);
  s.patch({ _structuresViewed: Object.fromEntries(ids.map(id => [id, true])),
    ...(rated ? { _structureConfidence: Object.fromEntries(ids.map(id => [id, 'mastered'])),
      _confidenceAt: Object.fromEntries(ids.map(id => [id, now])) } : {}) });
  return ids;
}
const foreign = [
  ['mode', s => s.patch({ _activeTab: 'quiz', quizMode: true })],
  ['system', s => s.patch({ system: 'respiratory' })],
  ['view', s => s.patch({ view: 'posterior' })],
  ['complexity', s => s.patch({ complexity: 2 })],
  ['selection', s => s.patch({ selectedStructure: 'femur' })],
  ['sheet', s => s.patch({ _showStudySheet: true })],
  ['sheet revision', s => s.patch({ _studySheetRevision: 1 })],
  ['import revision', s => s.patch({ _studyImportRevision: 1 })],
  ['guidance revision', s => s.patch({ _guidanceRevision: 1 })],
  ['model focus', s => s.patch({ _anatomyModelFocus: true })]
];

for (const file of files) describe('Anatomy next-step guidance continuity: ' + file, () => {
  it('opens the latest review target when ratings change after a recommendation renders', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), action = s.action();
    s.patch({ _structureConfidence: { ribs: 'mastered', femur: 'practice' }, _structureNotes: { ribs: 'A newer note.', femur: 'A new femur note.' } });
    const saved = protectedWork(s.data()); action();
    expect(s.data()).toMatchObject({ _activeTab: 'explore', selectedStructure: 'femur', quizMode: false });
    expect(protectedWork(s.data())).toEqual(saved);
  });
  it('skips a structure that has since been explored and opens the latest unseen target', () => {
    const s = session(file), ids = [...s.html().querySelectorAll('[data-anatomy-structure-option]')].map(node => node.getAttribute('data-anatomy-structure-option'));
    const action = s.action(); s.patch({ _structuresViewed: { [ids[0]]: true } }); action();
    expect(s.data().selectedStructure).toBe(ids[1]);
  });
  it('uses fresh tour completion and viewed flags instead of reopening the tour', () => {
    const s = session(file, { _tourCompleted: false }), action = s.action();
    s.patch({ _tourCompleted: true, _structureConfidence: { femur: 'practice' } }); action();
    expect(s.data()).toMatchObject({ _activeTab: 'explore', selectedStructure: 'femur' });
  });
  it('switches from recall cards to the latest Quiz recommendation after new ratings arrive', () => {
    const s = session(file); exploreAll(s); const action = s.action();
    s.patch({ _structureConfidence: { skull: 'mastered', ribs: 'mastered', femur: 'mastered' },
      _confidenceAt: { skull: now, ribs: now, femur: now }, _totalCorrect: 0 });
    const before = protectedWork(s.data()); action();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', quizMode: true, quizIdx: 3, quizScore: 2, _quizAttempts: 4 });
    for (const key of Object.keys(before).filter(key => key !== '_quizQuestion')) expect(s.data()[key]).toEqual(before[key]);
    expect(s.data()._quizQuestion.index).toBe(3);
  });
  it('opens Spotter when fresh successful retrieval totals replace an earlier Quiz suggestion', () => {
    const s = session(file); exploreAll(s, true); s.patch({ _totalCorrect: 0 }); const action = s.action();
    s.patch({ _totalCorrect: 5 }); const before = protectedWork(s.data()); action();
    expect(s.data()._activeTab).toBe('spotter'); expect(protectedWork(s.data())).toEqual(before);
  });
  it('resumes the latest valid saved Quiz question and answered checkpoint without a score reset', () => {
    const s = session(file); exploreAll(s, true);
    s.patch({ _activeTab: 'quiz', quizMode: true, quizIdx: 0 }); s.captureQuestion(); s.answer('skull');
    s.patch({ _activeTab: 'explore', quizMode: false, _totalCorrect: 0 }); const action = s.action();
    s.patch({ _activeTab: 'quiz', quizMode: true, quizIdx: 3, quizFeedback: null, _quizQuestion: null }); s.captureQuestion(); s.answer('sternum');
    s.patch({ _activeTab: 'explore', quizMode: false, _totalCorrect: 0, _aiInput: 'A more recent Tutor draft.' });
    const before = protectedWork(s.data()); action();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', quizMode: true }); expect(protectedWork(s.data())).toEqual(before);
    expect(s.html().querySelector('[data-anatomy-quiz-feedback]')).not.toBeNull();
  });
  it('keeps a completed Quiz checkpoint when returning through guidance', () => {
    const s = session(file); exploreAll(s, true); s.patch({ quizIdx: 10, quizScore: 8, _quizAttempts: 10, _totalCorrect: 0 });
    const saved = protectedWork(s.data()); s.action()();
    expect(s.data()).toMatchObject({ _activeTab: 'quiz', quizIdx: 10, quizScore: 8, _quizAttempts: 10 });
    for (const key of Object.keys(saved)) expect(s.data()[key]).toEqual(saved[key]);
  });
  it('preserves work when the current recommendation opens a new Cards round', () => {
    const s = session(file); exploreAll(s); const saved = protectedWork(s.data()); s.action()();
    expect(s.data()._activeTab).toBe('flashcards'); expect(protectedWork(s.data())).toEqual(saved);
    expect(s.data()._flashcardDeck.length).toBeGreaterThan(0);
  });
  it('recovers from an empty retained review scope by opening populated All structures cards', () => {
    const s = session(file, { _flashcardScope: 'review' }); exploreAll(s); const saved = protectedWork(s.data());
    s.action()();
    expect(s.data()).toMatchObject({ _activeTab: 'flashcards', _flashcardScope: 'all' });
    expect(s.data()._flashcardDeck).toContain('skull'); expect(s.data()._flashcardDeck.length).toBeGreaterThan(0);
    expect(protectedWork(s.data())).toEqual(saved);
  });
  it('offers usable recall cards when too few visible concepts support a Spotter question', () => {
    const s = session(file, { system: 'endocrine', complexity: 1, _totalCorrect: 5 });
    const ids = [...s.html().querySelectorAll('[data-anatomy-structure-option]')].map(node => node.getAttribute('data-anatomy-structure-option'));
    expect(ids.length).toBeGreaterThan(0); expect(ids.length).toBeLessThan(4);
    s.patch({ _structuresViewed: Object.fromEntries(ids.map(id => [id, true])),
      _structureConfidence: Object.fromEntries(ids.map(id => [id, 'mastered'])), _confidenceAt: Object.fromEntries(ids.map(id => [id, now])) });
    const saved = protectedWork(s.data()); s.action()();
    expect(s.data()).toMatchObject({ _activeTab: 'flashcards', _flashcardScope: 'all' });
    expect(s.data()._flashcardDeck.length).toBeGreaterThan(0); expect(protectedWork(s.data())).toEqual(saved);
  });
  it('resumes the current saved Cards deck without discarding its place or rated flags', () => {
    const s = session(file); exploreAll(s); s.click('Cards'); s.click('Reveal function'); s.click('~ Learning'); s.click('Next flashcard'); s.click('Reveal function');
    const savedRound = clone({ deck: s.data()._flashcardDeck, index: s.data()._flashcardIdx, rated: s.data()._flashcardRoundRated, context: s.data()._flashcardDeckContext, flipped: s.data()._flashcardFlipped });
    s.click('Explore'); s.patch({ _structureConfidence: {}, _confidenceAt: {} });
    const saved = protectedWork(s.data()); s.action()();
    expect(s.data()).toMatchObject({ _activeTab: 'flashcards', _flashcardDeck: savedRound.deck, _flashcardIdx: savedRound.index,
      _flashcardRoundRated: savedRound.rated, _flashcardDeckContext: savedRound.context });
    expect(protectedWork(s.data())).toEqual(saved);
  });
  it.each(foreign)('rejects a retained recommendation after its %s owner changes', (_name, change) => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), action = s.action(); change(s);
    const before = clone(s.data()), focused = marker(); s.announce.mockClear(); s.sound.mockClear(); action(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused);
    expect(s.announce).not.toHaveBeenCalled(); expect(s.sound).not.toHaveBeenCalled();
  });
  it('rejects a retained action when the learner profile changes its content band at the same chosen level', () => {
    const s = session(file, { complexity: 1, _structureConfidence: { ribs: 'practice' } }), action = s.action();
    s.grade('1'); s.tree(); const before = clone(s.data()), focused = marker(); action(); settle();
    expect(s.data()).toEqual(before); expect(document.activeElement).toBe(focused); expect(s.announce).not.toHaveBeenCalled();
  });
  it('ignores a duplicate activation from the same rendered action', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), action = s.action(); action(); settle();
    const before = clone(s.data()), announced = s.announce.mock.calls.length, sounded = s.sound.mock.calls.length; action(); settle();
    expect(s.data()).toEqual(before); expect(s.announce.mock.calls.length).toBe(announced); expect(s.sound.mock.calls.length).toBe(sounded);
  });
  it('reads the latest review target when React applies its functional updater later', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), action = s.action(); s.defer(); action();
    expect(s.data().selectedStructure).toBeUndefined(); expect(s.announce).not.toHaveBeenCalled();
    s.patch({ _structureConfidence: { femur: 'practice' }, _structureNotes: { femur: 'Writing saved before the queued update.' } });
    const saved = protectedWork(s.data()); s.flush(); settle();
    expect(s.data().selectedStructure).toBe('femur'); expect(protectedWork(s.data())).toEqual(saved); expect(s.announce).toHaveBeenCalledTimes(1);
  });
  it('rejects a queued action when its diagram changes before the updater is applied', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), action = s.action(); s.defer(); action();
    s.patch({ system: 'respiratory' }); const before = clone(s.data()); s.flush(); settle();
    expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled(); expect(s.sound).not.toHaveBeenCalled();
  });
  it('allows only the first accepted action when duplicate activations were queued together', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), action = s.action(); s.defer(); action(); action();
    s.flush(); settle(); expect(s.data().selectedStructure).toBe('ribs'); expect(s.data()._guidanceRevision).toBe(1);
    expect(s.announce).toHaveBeenCalledTimes(1);
  });
  it('opens a still-current review-queue structure and preserves all saved work', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), action = s.queue('ribs');
    s.patch({ _structureConfidence: { ribs: 'learning' }, _structureNotes: { ribs: 'Updated learning note.' } }); const before = protectedWork(s.data()); action();
    expect(s.data()).toMatchObject({ _activeTab: 'explore', selectedStructure: 'ribs' }); expect(protectedWork(s.data())).toEqual(before);
  });
  it.each(['mastered', null])('rejects a retained review-queue entry after its rating becomes %s', rating => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), action = s.queue('ribs');
    s.patch({ _structureConfidence: rating ? { ribs: rating } : {} }); const before = clone(s.data()), focused = marker(); action(); settle();
    expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focused);
  });
  it('moves keyboard focus into the opened structure explanation', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()(); s.mount(); settle();
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-structure-detail-heading]'));
  });
  it.each([
    ['Quiz', true, { _totalCorrect: 0 }, '[data-anatomy-quiz-panel]'],
    ['Cards', false, {}, '[data-anatomy-recall-card]'],
    ['Spotter', true, { _totalCorrect: 5 }, '[data-anatomy-spotter-question]']
  ])('moves keyboard focus into the opened %s activity', (_name, rated, patch, selector) => {
    const s = session(file); exploreAll(s, rated); s.patch(patch); const host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()(); s.mount(); settle();
    expect(document.activeElement).toBe(host.querySelector(selector));
  });
  it('moves keyboard focus into the guided tour step', () => {
    const s = session(file, { _tourCompleted: false }), host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()(); s.mount(); settle();
    expect(document.activeElement).toBe(host.querySelector('[data-anatomy-tour-step]'));
  });
  it('lands an empty-view recovery at the populated structure list', () => {
    const s = session(file, { system: 'circulatory', view: 'posterior' }), host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()(); s.mount(); settle();
    expect(s.data().view).toBe('anterior'); expect(document.activeElement).toBe(host.querySelector('#anatomy-structure-list-title'));
  });
  it('keeps focus in a newer activity after a delayed structure landing', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()();
    s.patch({ _activeTab: 'aiTutor' }); s.mount(); settle();
    expect(document.activeElement).toBe(document.body);
  });
  it('keeps focus in a newly opened study sheet after a delayed structure landing', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()();
    s.patch({ _showStudySheet: true, _studySheetRevision: 1 }); s.mount(); settle();
    expect(document.activeElement).toBe(document.body);
  });
  it('does not land an accepted action after the current content band changes', () => {
    const s = session(file, { complexity: 1, _structureConfidence: { ribs: 'practice' } }), host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()();
    s.grade('1'); s.mount(); settle();
    expect(document.activeElement).toBe(document.body);
  });
  it('does not land a delayed Quiz action on a different question checkpoint', () => {
    const s = session(file); exploreAll(s, true); s.patch({ _totalCorrect: 0 }); const host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()();
    s.patch({ quizIdx: 4 }); s.mount(); settle();
    expect(document.activeElement).toBe(document.body);
  });
  it('does not steal focus after the learner moves to another control in the accepted view', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), host = s.mount();
    host.querySelector('[data-anatomy-guidance-action]').focus(); s.action()(); s.mount();
    const focused = host.querySelector('#anatomy-global-search-input'); focused.focus(); settle();
    expect(document.activeElement).toBe(focused);
  });
  it('gives every empty diagram an action that reaches a populated diagram without changing saved work', () => {
    const systems = ['skeletal', 'muscular', 'circulatory', 'nervous', 'organs', 'respiratory', 'endocrine', 'lymphatic', 'integumentary', 'reproductive'];
    const empties = [];
    for (const system of systems) for (const view of ['anterior', 'posterior']) for (const complexity of [1, 2, 3]) {
      const s = session(file, { system, view, complexity }), root = s.html();
      if (root.querySelectorAll('[data-anatomy-structure-option]').length) continue;
      empties.push([system, view, complexity]); const action = s.action(), saved = protectedWork(s.data());
      const other = view === 'anterior' ? 'posterior' : 'anterior'; s.patch({ view: other });
      const otherCount = s.html().querySelectorAll('[data-anatomy-structure-option]').length; s.patch({ view });
      let firstAvailableLevel;
      if (!otherCount) for (let level = complexity + 1; level <= 3; level++) {
        s.patch({ complexity: level });
        if (s.html().querySelectorAll('[data-anatomy-structure-option]').length && firstAvailableLevel === undefined) firstAvailableLevel = level;
      }
      s.patch({ complexity }); action();
      expect(s.data()._activeTab).toBe('explore'); expect(s.html().querySelectorAll('[data-anatomy-structure-option]').length).toBeGreaterThan(0);
      expect(protectedWork(s.data())).toEqual(saved);
      if (otherCount) expect(s.data()).toMatchObject({ view: other, complexity });
      else expect(s.data()).toMatchObject({ view, complexity: firstAvailableLevel });
    }
    expect(empties).toHaveLength(12);
  }, 120000);
  it('links the guidance title and help to its action for screen readers', () => {
    const s = session(file, { _structureConfidence: { ribs: 'practice' } }), root = s.html();
    const title = root.querySelector('[data-anatomy-guidance-title]'), help = root.querySelector('[data-anatomy-guidance-help]'), action = root.querySelector('[data-anatomy-guidance-action]');
    expect(title.tagName).toBe('H3'); expect(title.textContent.trim().length).toBeGreaterThan(0); expect(help.textContent.trim().length).toBeGreaterThan(0);
    expect(action.getAttribute('aria-describedby').split(/\s+/)).toContain(help.id);
  });
});
