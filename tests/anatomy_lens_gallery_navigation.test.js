import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const routes = [
  ['heart', 'circulatory', 'anterior', 1], ['kidneys', 'organs', 'posterior', 1],
  ['alveoli', 'respiratory', 'anterior', 1], ['patella', 'skeletal', 'anterior', 2],
  ['biceps', 'muscular', 'anterior', 1], ['liver', 'organs', 'anterior', 1],
  ['sm_intestine', 'organs', 'anterior', 2], ['epidermis', 'integumentary', 'anterior', 1],
];
const clone = value => JSON.parse(JSON.stringify(value));
const savedWork = {
  _structureNotes: { quads: 'My knee-extension explanation.' },
  _structureConfidence: { quads: 'learning' }, _retrievalEvidence: { quads: { attempts: 3, correct: 2 } },
  quizScore: 3, quizIdx: 2, _quizAttempts: 4, quizFeedback: { chosen: 'quads', correct: false },
  _quizQuestion: { token: 'saved-question', index: 2 }, _quizActivityReturn: { token: 'saved-question', index: 2, score: 3 },
  _flashcardDeck: ['quads', 'biceps'], _flashcardIdx: 1, _flashcardFlipped: true,
  _spotterActive: true, _spotterTarget: 'biceps', _spotterFeedback: 'quads', _spotterScore: 2, _spotterTotal: 3,
  _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My reasoning.' } } },
};
const work = state => clone(Object.fromEntries(Object.keys(savedWork).map(key => [key, state[key]])));

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, extra = {}) {
  resetStemLab(); document.body.innerHTML = ''; const tool = loadTool(file, 'anatomy');
  let data = { otherTool: { savedSetting: 'keep' }, anatomy: {
    system: 'muscular', view: 'anterior', complexity: 1, selectedStructure: 'quads', _activeTab: 'explore',
    _bodyView3d: true, _body3dStyle: 'blueprint', _showAnatomyLens: true, _anatomyLensEntry: 'toolbar',
    _regionalAtlasClinical: true, _regionalAtlasStep: 2, _regionalAtlasPlaying: false,
    _anatomyLensViewed: { heart: true }, _startHereDismissed: true,
    _badges: { firstStructure: true, viewToggler: true, spotterPro: true, speedDemon: true },
    completedChallenges: ['spotter_3', 'cases_solved'], ...clone(savedWork), ...extra,
  } };
  let host, deferred = false, pending = [];
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? pending.push(update) : apply(update);
  const announceToSR = vi.fn(), setStemLabTool = vi.fn(), setStemLabTab = vi.fn();
  const ctx = () => ({ toolData: data, setToolData, announceToSR, setStemLabTool, setStemLabTab, gradeLevel: '9' });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const match = find(tree(), predicate); expect(match).not.toBeNull(); return match; };
  const mount = () => {
    if (!host?.isConnected) { host = document.createElement('div'); document.body.appendChild(host); }
    host.innerHTML = renderTool('anatomy', data, ctx()); return host;
  };
  mount(); vi.runAllTimers(); announceToSR.mockClear();
  return { state: () => data.anatomy, data: () => data, node, mount, announceToSR, setStemLabTool, setStemLabTab,
    action: id => node(element => element.props?.['data-anatomy-lens-id'] === id).props.onClick,
    close: () => node(element => element.props?.['data-anatomy-lens-close'] === true).props.onClick,
    toggle: () => node(element => element.props?.['data-anatomy-lens-toggle'] === true).props.onClick,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const updates = pending; pending = []; updates.forEach(apply); },
  };
}
function activate(s, id) {
  const action = s.action(id), trigger = s.mount().querySelector('[data-anatomy-lens-id="' + id + '"]');
  trigger.focus(); action(); return s.mount();
}
function close(s) {
  const action = s.close(), trigger = s.mount().querySelector('[data-anatomy-lens-close]');
  trigger.focus(); action(); return s.mount();
}
function holdFocus() {
  const control = document.createElement('button'); control.textContent = 'Another action';
  document.body.appendChild(control); control.focus(); return control;
}

let rectsDescriptor, scrollDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = '';
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 220, height: 120 }] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  for (const [key, descriptor] of [['getClientRects', rectsDescriptor], ['scrollIntoView', scrollDescriptor]]) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor); else delete HTMLElement.prototype[key];
  }
});

for (const file of paths) describe('Anatomy Lens gallery navigation: ' + file, () => {
  it.each(routes)('opens the %s diagram in its supported system, view and level and focuses it', (id, system, view, level) => {
    const s = session(file), before = work(s.state()), root = activate(s, id);
    vi.runAllTimers();
    expect(s.state()).toMatchObject({ system, view, complexity: level, selectedStructure: id, _activeTab: 'explore',
      quizMode: false, _bodyView3d: false, _regionalAtlasOpen: id, _regionalAtlasStep: 0,
      _regionalAtlasPlaying: true, _regionalAtlasClinical: false, _showAnatomyLens: false, _anatomyLensEntry: null });
    const atlas = root.querySelector('[data-anatomy-atlas="' + id + '"]');
    expect(atlas).not.toBeNull(); expect(document.activeElement).toBe(atlas);
    expect(atlas.scrollIntoView).toHaveBeenCalled();
    expect(s.state()._anatomyLensViewed).toMatchObject({ heart: true, [id]: true });
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
    expect(s.setStemLabTool).not.toHaveBeenCalled();
  });

  it('merges newer progress and notes when a deferred card update is accepted', () => {
    const s = session(file), action = s.action('kidneys');
    s.mount().querySelector('[data-anatomy-lens-id="kidneys"]').focus();
    s.defer(); action();
    s.patch({ _anatomyLensViewed: { heart: true, liver: true, unknown: true },
      _structureNotes: { quads: 'A newer saved explanation.' }, quizScore: 5 });
    s.flush(); const root = s.mount(); vi.runAllTimers();
    expect(s.state()._anatomyLensViewed).toEqual({ heart: true, liver: true, kidneys: true });
    expect(s.state()._structureNotes.quads).toBe('A newer saved explanation.'); expect(s.state().quizScore).toBe(5);
    expect(document.activeElement).toBe(root.querySelector('[data-anatomy-atlas="kidneys"]'));
  });

  it('preserves stored Quiz score and feedback when leaving an active Quiz for a gallery diagram', () => {
    const s = session(file, { _activeTab: 'quiz', quizMode: true }), before = work(s.state());
    activate(s, 'kidneys'); vi.runAllTimers();
    expect(s.state()._activeTab).toBe('explore'); expect(s.state().quizMode).toBe(false);
    expect(work(s.state())).toEqual(before);
  });

  it.each([
    ['system', { system: 'skeletal' }], ['view', { view: 'posterior' }],
    ['level', { complexity: 2 }], ['selection', { selectedStructure: 'biceps' }],
    ['activity', { _activeTab: 'flashcards' }], ['Quiz mode', { quizMode: true }],
    ['spatial view', { _bodyView3d: false }], ['entry control', { _anatomyLensEntry: 'scale' }],
    ['closed gallery', { _showAnatomyLens: false }],
  ])('rejects an old card handler after changing the %s', (_label, patch) => {
    const s = session(file), action = s.action('kidneys'); s.patch(patch);
    const before = clone(s.state()); action(); vi.runAllTimers();
    expect(s.state()).toEqual(before); expect(s.announceToSR).not.toHaveBeenCalled();
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('respects deliberate focus movement after opening a diagram', () => {
    const s = session(file); activate(s, 'kidneys'); const held = holdFocus(); vi.runAllTimers();
    expect(document.activeElement).toBe(held); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not focus an atlas after the learner changes navigation again', () => {
    const s = session(file); activate(s, 'kidneys'); s.patch({ view: 'anterior' }); s.mount(); vi.runAllTimers();
    expect(document.activeElement).toBe(document.body); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(['removed', 'hidden', 'wrong destination'])('does not focus a %s atlas target', condition => {
    const s = session(file), root = activate(s, 'kidneys'), atlas = root.querySelector('#anatomy-regional-atlas');
    if (condition === 'removed') atlas.remove();
    else if (condition === 'hidden') Object.defineProperty(atlas, 'getClientRects', { configurable: true, value: () => [] });
    else atlas.setAttribute('data-anatomy-atlas', 'heart');
    vi.runAllTimers();
    expect(document.activeElement).toBe(document.body); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(['scale', 'toolbar', undefined])('closes the gallery and returns focus to its %s entry', entry => {
    const s = session(file, { _anatomyLensEntry: entry }), before = clone(s.state()), root = close(s);
    const target = entry === 'scale'
      ? root.querySelector('[data-anatomy-scale-journey] button[data-scale-stage="tissue"]')
      : root.querySelector('button[aria-controls="anatomy-lens-panel"]');
    vi.runAllTimers();
    expect(s.state()).toEqual({ ...before, _showAnatomyLens: false, _anatomyLensEntry: null });
    expect(root.querySelector('[data-anatomy-lens]')).toBeNull(); expect(document.activeElement).toBe(target);
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('rejects an old close action after navigation or its entry changes', () => {
    for (const patch of [{ selectedStructure: 'biceps' }, { _anatomyLensEntry: 'scale' }, { _showAnatomyLens: false }]) {
      const s = session(file), action = s.close(); s.patch(patch); const before = clone(s.state());
      action(); vi.runAllTimers(); expect(s.state()).toEqual(before); expect(s.announceToSR).not.toHaveBeenCalled();
    }
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('respects focus movement while closing the gallery', () => {
    const s = session(file); close(s); const held = holdFocus(); vi.runAllTimers();
    expect(document.activeElement).toBe(held); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('uses More controls if the entry was removed and respects a newer navigation context', () => {
    const s = session(file), root = close(s); root.querySelector('[data-anatomy-lens-toggle]').remove(); vi.runAllTimers();
    expect(document.activeElement).toBe(root.querySelector('.anatomy-explorer-settings-toggle'));
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    HTMLElement.prototype.scrollIntoView.mockClear();
    const next = session(file); close(next); next.patch({ complexity: 2 }); next.mount(); vi.runAllTimers();
    expect(document.activeElement).toBe(document.body); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('returns focus to visible More controls when the toolbar entry is hidden', () => {
    const s = session(file), root = close(s), entry = root.querySelector('[data-anatomy-lens-toggle]');
    const fallback = root.querySelector('.anatomy-explorer-settings-toggle');
    expect(entry).not.toBeNull(); expect(fallback).not.toBeNull();
    Object.defineProperty(entry, 'getClientRects', { configurable: true, value: () => [] });
    vi.runAllTimers();
    expect(document.activeElement).toBe(fallback); expect(fallback.scrollIntoView).toHaveBeenCalled();
    expect(root.querySelector('[data-anatomy-lens]')).toBeNull();
  });

  it('opens the gallery from the toolbar with the correct entry and visible heading focus', () => {
    const s = session(file, { _showAnatomyLens: false, _anatomyLensEntry: null });
    const action = s.toggle(); s.mount().querySelector('[data-anatomy-lens-toggle]').focus(); action();
    const root = s.mount(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ _showAnatomyLens: true, _anatomyLensEntry: 'toolbar' });
    expect(document.activeElement).toBe(root.querySelector('#anatomy-lens-title'));
  });
});
