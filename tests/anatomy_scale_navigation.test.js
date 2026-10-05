import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const savedWork = {
  _structureNotes: { quads: 'My explanation of knee extension.' },
  _structureConfidence: { quads: 'learning' },
  _retrievalEvidence: { quads: { attempts: 2, correct: 1 } },
  _flashcardDeck: ['quads', 'biceps'], _flashcardIdx: 1,
  quizScore: 3, quizIdx: 2,
  _spotterActive: true, _spotterTarget: 'biceps', _spotterFeedback: 'quads',
};
const clone = value => JSON.parse(JSON.stringify(value));
const workSnapshot = state => clone(Object.fromEntries(Object.keys(savedWork).map(key => [key, state[key]])));

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function session(file, extra = {}) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = { cell: { existingSetting: 'keep' }, cellAtlasLab: { existingSetting: 'keep' }, anatomy: {
    system: 'muscular', view: 'anterior', complexity: 3, _activeTab: 'explore',
    selectedStructure: 'quads', _bodyView3d: false, _startHereDismissed: true,
    _badges: { firstStructure: true, viewToggler: true, spotterPro: true, speedDemon: true },
    completedChallenges: ['spotter_3', 'cases_solved'], ...clone(savedWork), ...extra,
  } };
  let host;
  const setToolData = update => { data = typeof update === 'function' ? update(data) : update; };
  const setStemLabTool = vi.fn(), setStemLabTab = vi.fn(), announceToSR = vi.fn();
  const ctx = () => ({ toolData: data, setToolData,
    setStemLabTool, setStemLabTab, announceToSR, gradeLevel: '9' });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = predicate => { const result = find(tree(), predicate); expect(result).not.toBeNull(); return result; };
  const mount = () => {
    if (!host?.isConnected) { host = document.createElement('div'); document.body.appendChild(host); }
    host.innerHTML = renderTool('anatomy', data, ctx());
    return host;
  };
  mount(); vi.runAllTimers(); announceToSR.mockClear();
  return { state: () => data.anatomy, lab: () => data, node, mount, setStemLabTool, setStemLabTab, announceToSR,
    action: stage => node(element => element.props?.['data-scale-stage'] === stage).props.onClick,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
  };
}

function openGallery(s) {
  const action = s.action('tissue');
  const trigger = s.mount().querySelector('button[data-scale-stage="tissue"]');
  expect(trigger).not.toBeNull();
  trigger.focus(); action();
  return s.mount();
}
function heldFocus() {
  const control = document.createElement('button'); control.textContent = 'Another action';
  document.body.appendChild(control); control.focus(); return control;
}

let scrollDescriptor, rectsDescriptor, hiddenDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = '';
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  rectsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getClientRects');
  hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', { configurable: true, value: () => [{ width: 220, height: 44 }] });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  for (const [object, key, descriptor] of [
    [HTMLElement.prototype, 'scrollIntoView', scrollDescriptor],
    [HTMLElement.prototype, 'getClientRects', rectsDescriptor], [document, 'hidden', hiddenDescriptor],
  ]) {
    if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key];
  }
});

for (const file of paths) describe('Anatomy scale navigation: ' + file, () => {
  it('names the gallery that quadriceps can actually open and preserves saved learning work', () => {
    const s = session(file), before = workSnapshot(s.state());
    const route = s.mount().querySelector('[data-anatomy-scale-journey="quads"]');
    expect(route.querySelector('[data-scale-stage="structure"]').textContent).toContain('Quadriceps');
    const destination = route.querySelector('button[data-scale-stage="tissue"]');
    expect(destination.textContent).toContain('Anatomy Lens gallery');
    expect(destination.textContent).toContain('Open detail');
    expect(destination.getAttribute('data-scale-specialist')).toBe('anatomyLensGallery');
    expect(route.querySelector('button[data-scale-stage="cell"]').textContent).toContain('Open cell');
    expect(route.querySelector('[data-scale-stage="body"]').tagName).not.toBe('BUTTON');
    expect(route.querySelector('[data-scale-stage="structure"]').tagName).not.toBe('BUTTON');
    const root = openGallery(s); vi.runAllTimers();
    expect(s.state()._showAnatomyLens).toBe(true);
    expect(root.querySelector('#anatomy-lens-panel')).not.toBeNull();
    expect(s.state()._regionalAtlasOpen).toBeUndefined();
    expect(s.setStemLabTool).not.toHaveBeenCalled();
    expect(workSnapshot(s.state())).toEqual(before);
  });

  it('reveals and focuses the mounted gallery heading after the route action', () => {
    const s = session(file), root = openGallery(s), heading = root.querySelector('#anatomy-lens-title');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    vi.runAllTimers();
    expect(document.activeElement).toBe(heading);
    expect(heading.scrollIntoView).toHaveBeenCalled();
  });

  it('accepts newer notes while moving focus to the same gallery route', () => {
    const s = session(file); openGallery(s);
    s.patch({ _structureNotes: { quads: 'A newer explanation written elsewhere.' }, quizScore: 5 });
    const root = s.mount(); vi.runAllTimers();
    expect(document.activeElement).toBe(root.querySelector('#anatomy-lens-title'));
    expect(s.state()._structureNotes.quads).toBe('A newer explanation written elsewhere.');
    expect(s.state().quizScore).toBe(5);
  });

  it('respects deliberate focus movement before the gallery focus callback', () => {
    const s = session(file); openGallery(s); const held = heldFocus();
    vi.runAllTimers();
    expect(document.activeElement).toBe(held);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([
    ['system', { system: 'skeletal', selectedStructure: 'patella' }],
    ['selection', { selectedStructure: 'biceps' }],
    ['view', { view: 'posterior' }],
    ['activity', { _activeTab: 'quiz' }],
    ['closed gallery', { _showAnatomyLens: false }],
  ])('does not scroll or focus a route after changing its %s', (_label, patch) => {
    const s = session(file); openGallery(s); s.patch(patch); s.mount();
    vi.runAllTimers();
    expect(document.activeElement).toBe(document.body);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not focus a removed gallery heading', () => {
    const s = session(file), root = openGallery(s);
    root.querySelector('#anatomy-lens-title').remove();
    vi.runAllTimers();
    expect(document.activeElement).toBe(document.body);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not focus a hidden gallery heading', () => {
    const s = session(file), root = openGallery(s), heading = root.querySelector('#anatomy-lens-title');
    Object.defineProperty(heading, 'getClientRects', { configurable: true, value: () => [] });
    vi.runAllTimers();
    expect(document.activeElement).toBe(document.body);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('keeps the alveolar tissue action in its regional deep dive', () => {
    const s = session(file, { system: 'respiratory', selectedStructure: 'alveoli' });
    const destination = s.mount().querySelector('[data-scale-stage="tissue"]');
    expect(destination.textContent).toContain('Alveolus and gas-exchange deep dive');
    expect(destination.getAttribute('data-scale-specialist')).toBe('anatomyLens');
    s.action('tissue')();
    expect(s.state()).toMatchObject({ _activeTab: 'explore', selectedStructure: 'alveoli',
      _regionalAtlasOpen: 'alveoli', _regionalAtlasStep: 0, _showAnatomyLens: false });
    expect(s.setStemLabTool).not.toHaveBeenCalled();
  });

  it('keeps the alveolar cell action in the lung cell atlas and preserves destination settings', () => {
    const s = session(file, { system: 'respiratory', selectedStructure: 'alveoli' });
    expect(s.mount().querySelector('[data-scale-stage="cell"]').textContent).toContain('Lung Cell Atlas');
    s.action('cell')();
    expect(s.setStemLabTool).toHaveBeenCalledWith('cellAtlasLab');
    expect(s.setStemLabTab).toHaveBeenCalledWith('explore');
    expect(s.lab().cellAtlasLab).toMatchObject({ existingSetting: 'keep', tissue: 'lung', view: 'map',
      _scaleJourneySystem: 'respiratory', _scaleJourneyStructure: 'alveoli' });
  });

  it('keeps brain detail in the specialist atlas and brain cells in the matching cell atlas', () => {
    const s = session(file, { system: 'nervous', selectedStructure: 'brain' });
    const route = s.mount();
    expect(route.querySelector('[data-scale-stage="tissue"]').textContent).toContain('Brain Atlas');
    expect(route.querySelector('[data-scale-stage="cell"]').textContent).toContain('Brain Cell Atlas');
    s.action('tissue')();
    expect(s.setStemLabTool).toHaveBeenCalledWith('brainAtlas');
    expect(s.state()._showAnatomyLens).not.toBe(true);
    s.setStemLabTool.mockClear(); s.action('cell')();
    expect(s.setStemLabTool).toHaveBeenCalledWith('cellAtlasLab');
    expect(s.lab().cellAtlasLab).toMatchObject({ existingSetting: 'keep', tissue: 'brain', view: 'map',
      _scaleJourneySystem: 'nervous', _scaleJourneyStructure: 'brain' });
  });
});
