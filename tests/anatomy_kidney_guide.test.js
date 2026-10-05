// Scratch fixture. The harness import matches the final repository tests/ location.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const steps = [
  ['glomerular_filtration', '1. Filtration', 'Blood pressure pushes water and small solutes across the glomerular filtration barrier into Bowman capsule. Blood cells and most proteins remain in the circulation.', 'glomerular-barrier'],
  ['tubular_reabsorption', '2. Reabsorption', 'The proximal tubule returns most filtered water and sodium, plus nearly all glucose and amino acids, to nearby peritubular capillaries.', 'proximal-reabsorption'],
  ['tubular_secretion', '3. Secretion', 'Tubule cells move selected ions, medications, and metabolic wastes from the capillary blood into the tubular fluid, helping regulate pH and composition.', 'distal-secretion'],
  ['urine_concentration', '4. Urine formation', 'The loop of Henle builds a medullary concentration gradient. The distal tubule and collecting duct make final hormone-guided adjustments before urine enters the renal pelvis and ureter.', 'medullary-concentration'],
];
const clone = value => JSON.parse(JSON.stringify(value));
const savedWork = {
  _structureNotes: { kidneys: 'My explanation of filtration and reabsorption.' },
  _structureConfidence: { kidneys: 'learning' }, _retrievalEvidence: { kidneys: { attempts: 3, correct: 2 } },
  quizScore: 3, quizIdx: 2, _quizAttempts: 4, quizFeedback: { chosen: 'kidneys', correct: false },
  _quizQuestion: { token: 'saved-question', index: 2 }, _quizActivityReturn: { token: 'saved-question', index: 2, score: 3 },
  _flashcardDeck: ['kidneys', 'liver'], _flashcardIdx: 1, _flashcardFlipped: true,
  _spotterActive: true, _spotterTarget: 'kidneys', _spotterFeedback: 'liver', _spotterScore: 2, _spotterTotal: 3,
  _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My reasoning.' } } },
  _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3', _clinicalAtlasConceptId: 'UBERON:0001225',
  _clinicalFtuCellId: 'CL:0000653', _clinicalFtuAtlasId: 'hra-kidney-renal-corpuscle-v1.4',
};
const work = state => clone(Object.fromEntries(Object.keys(savedWork).map(key => [key, state[key]])));
const contextChanges = [
  ['closed atlas', { _regionalAtlasOpen: null }], ['selected structure', { selectedStructure: 'liver' }],
  ['system', { system: 'circulatory' }], ['view', { view: 'anterior' }], ['level', { complexity: 2 }],
  ['activity', { _activeTab: 'flashcards' }], ['Quiz mode', { quizMode: true }],
  ['step', { _regionalAtlasStep: 0 }], ['flow choice', { _regionalAtlasPlaying: true }],
  ['clinical choice', { _regionalAtlasClinical: true }],
];
const actions = [
  ['step', { _regionalAtlasStep: 3, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['previous', { _regionalAtlasStep: 0, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['next', { _regionalAtlasStep: 2, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['flow', { _regionalAtlasStep: 1, _regionalAtlasPlaying: true, _regionalAtlasClinical: false }],
  ['clinical', { _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: true }],
];

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, extra = {}) {
  resetStemLab(); document.body.innerHTML = ''; const tool = loadTool(file, 'anatomy');
  let data = { otherTool: { savedSetting: 'keep' }, anatomy: {
    system: 'organs', view: 'posterior', complexity: 3, selectedStructure: 'kidneys', _activeTab: 'explore',
    quizMode: false, _bodyView3d: false, _regionalAtlasOpen: 'kidneys', _regionalAtlasStep: 1,
    _regionalAtlasPlaying: false, _regionalAtlasClinical: false, _startHereDismissed: true,
    _badges: { firstStructure: true, viewToggler: true, spotterPro: true, speedDemon: true },
    completedChallenges: ['spotter_3', 'cases_solved'], ...clone(savedWork), ...extra,
  } };
  let host, deferred = false, pending = [];
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? pending.push(update) : apply(update);
  const announceToSR = vi.fn();
  const ctx = () => ({ toolData: data, setToolData, announceToSR, gradeLevel: '9' });
  const atlas = () => {
    const result = find(tool.render(makeCtx(ctx())), node => node.props?.['data-anatomy-atlas'] === 'kidneys');
    expect(result).not.toBeNull(); return result;
  };
  const control = name => {
    const result = find(atlas(), node => name === 'step'
      ? node.props?.['data-anatomy-kidney-step'] === steps[3][0]
      : name === 'clinical' ? node.props?.['data-anatomy-clinical-toggle'] === 'kidneys'
        : node.props?.['data-anatomy-kidney-' + name] === true);
    expect(result).not.toBeNull(); return result;
  };
  const step = index => {
    const result = find(atlas(), node => node.props?.['data-anatomy-kidney-step'] === steps[index][0]);
    expect(result).not.toBeNull(); return result.props.onClick;
  };
  const mount = () => {
    if (!host?.isConnected) { host = document.createElement('div'); document.body.appendChild(host); }
    host.innerHTML = renderTool('anatomy', data, ctx()); return host;
  };
  mount(); vi.runAllTimers(); announceToSR.mockClear();
  return { state: () => data.anatomy, data: () => data, atlas, control, step, mount, announceToSR,
    action: name => control(name).props.onClick,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const updates = pending; pending = []; updates.forEach(apply); },
  };
}

beforeEach(() => { resetStemLab(); vi.useFakeTimers(); document.body.innerHTML = ''; });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

for (const file of paths) describe('Kidney guide: ' + file, () => {
  it.each(steps.map((step, index) => [...step, index]))('selects %s with its authored narrative and mechanism while preserving paused work', (id, label, narrative, mechanism, index) => {
    const s = session(file), before = work(s.state());
    s.step(index)(); const root = s.mount(); vi.runAllTimers();
    const atlas = root.querySelector('[data-anatomy-atlas="kidneys"]');
    expect(s.state()).toMatchObject({ _regionalAtlasStep: index, _regionalAtlasPlaying: false,
      system: 'organs', view: 'posterior', selectedStructure: 'kidneys', _regionalAtlasOpen: 'kidneys' });
    expect(atlas.getAttribute('data-anatomy-atlas-step')).toBe(id);
    const detail = atlas.querySelector('#anatomy-kidney-step-detail');
    expect(detail.textContent).toContain(label); expect(detail.textContent).toContain(narrative);
    expect(atlas.querySelectorAll('[data-anatomy-mechanism]')).toHaveLength(4);
    expect(atlas.querySelectorAll('[data-anatomy-mechanism].is-active')).toHaveLength(1);
    expect(atlas.querySelector('[data-anatomy-mechanism].is-active').getAttribute('data-anatomy-mechanism')).toBe(mechanism);
    expect(atlas.querySelectorAll('.anatomy-atlas-route')).toHaveLength(4);
    expect(atlas.querySelectorAll('.anatomy-atlas-route.is-active')).toHaveLength(1);
    expect(atlas.querySelector('.anatomy-atlas-route.is-active').getAttribute('marker-end')).toMatch(/^url\(#.+\)$/);
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
  });

  it.each([false, true])('uses three named figures with numbered SVG markers and readable HTML keys (clinical=%s)', clinical => {
    const s = session(file, { _regionalAtlasClinical: clinical }), root = s.mount();
    const atlas = root.querySelector('[data-anatomy-atlas="kidneys"]');
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-kidney-scale]')];
    expect(figures.map(figure => figure.getAttribute('data-anatomy-kidney-scale'))).toEqual(['body', 'regions', 'nephron']);
    for (const figure of figures) {
      const svg = figure.querySelector('svg[role="img"]'); expect(svg).not.toBeNull();
      const labels = (svg.getAttribute('aria-labelledby') || '').trim().split(/\s+/);
      expect(labels).toHaveLength(2);
      labels.forEach(id => expect(figure.querySelector('[id="' + id + '"]')?.textContent.trim()).toBeTruthy());
      const markers = [...svg.querySelectorAll('text')]; expect(markers.length).toBeGreaterThan(0);
      markers.forEach(marker => expect(marker.textContent.trim()).toMatch(/^\d+$/));
      const caption = figure.querySelector('figcaption'); expect(caption).not.toBeNull();
      expect(caption.textContent.trim().length).toBeGreaterThan(20);
    }
    expect(figures[0].querySelector('figcaption').textContent).toMatch(/posterior/i);
    const regionKey = figures[1].querySelector('figcaption').textContent;
    ['cortex', 'medulla', 'renal pelvis'].forEach(term => expect(regionKey.toLowerCase()).toContain(term));
    const nephronKey = figures[2].querySelector('figcaption').textContent;
    ['glomerulus', 'proximal', 'distal', 'loop of Henle', 'collecting duct'].forEach(term => expect(nephronKey.toLowerCase()).toContain(term.toLowerCase()));
    if (clinical) {
      const overlay = atlas.querySelector('[data-anatomy-clinical-overlay="glomerular_barrier_injury"]');
      expect(overlay).not.toBeNull(); expect(overlay.querySelectorAll('polygon')).toHaveLength(4);
      expect(overlay.querySelector('circle[stroke-dasharray]')).not.toBeNull();
      expect(atlas.querySelector('[data-anatomy-clinical-panel="glomerular_barrier_injury"]').textContent).toContain('allows protein to enter the filtrate');
    }
  });

  it('uses native buttons, pressed state and a shared live detail panel', () => {
    const s = session(file), root = s.mount(), atlas = root.querySelector('[data-anatomy-atlas="kidneys"]');
    const buttons = [...atlas.querySelectorAll('.anatomy-atlas-steps button')]; expect(buttons).toHaveLength(4);
    const detail = atlas.querySelector('#anatomy-kidney-step-detail');
    expect(detail.getAttribute('role')).toBe('status'); expect(detail.getAttribute('aria-live')).toBe('polite');
    expect(detail.getAttribute('aria-atomic')).toBe('true');
    buttons.forEach((button, index) => {
      expect(button.type).toBe('button'); expect(button.getAttribute('data-anatomy-kidney-step')).toBe(steps[index][0]);
      expect(button.getAttribute('aria-controls')).toBe(detail.id);
      expect(button.getAttribute('aria-pressed')).toBe(String(index === 1));
      expect(button.textContent).toContain(steps[index][1]);
    });
    for (const selector of ['[data-anatomy-kidney-flow]', '[data-anatomy-kidney-previous]', '[data-anatomy-kidney-next]', '[data-anatomy-clinical-toggle="kidneys"]']) {
      const button = atlas.querySelector(selector); expect(button?.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
      expect(button.textContent.trim()).toBeTruthy();
    }
    expect(atlas.querySelector('[data-anatomy-kidney-flow]').textContent).toBe('Play flow');
    expect(atlas.querySelector('.anatomy-kidney-playback').textContent).toBe('Flow paused');
    expect(atlas.querySelector('[data-anatomy-clinical-toggle="kidneys"]').getAttribute('aria-pressed')).toBe('false');
    buttons[2].focus(); s.step(2)(); vi.runAllTimers(); expect(document.activeElement).toBe(buttons[2]);
  });

  it('moves through bounded previous and next steps and keeps an explicit pause', () => {
    const s = session(file), before = work(s.state());
    s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0);
    let root = s.mount(); expect(root.querySelector('[data-anatomy-kidney-previous]').disabled).toBe(true);
    expect(root.querySelector('[data-anatomy-kidney-next]').disabled).toBe(false);
    for (let index = 1; index < steps.length; index++) { s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(index); }
    root = s.mount(); expect(root.querySelector('[data-anatomy-kidney-next]').disabled).toBe(true);
    expect(root.querySelector('[data-anatomy-kidney-previous]').disabled).toBe(false);
    s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(3);
    s.step(0)(); s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0);
    expect(s.state()._regionalAtlasPlaying).toBe(false); expect(work(s.state())).toEqual(before);
  });

  it('keeps explicit Play and Pause choices independent of guide steps and the clinical lens', () => {
    const s = session(file), before = work(s.state());
    s.action('flow')(); expect(s.state()._regionalAtlasPlaying).toBe(true);
    s.step(2)(); expect(s.state()._regionalAtlasPlaying).toBe(true);
    s.action('flow')(); expect(s.state()._regionalAtlasPlaying).toBe(false);
    s.step(3)(); expect(s.state()._regionalAtlasPlaying).toBe(false);
    s.action('clinical')(); expect(s.state()._regionalAtlasClinical).toBe(true);
    s.action('previous')(); expect(s.state()._regionalAtlasPlaying).toBe(false);
    s.action('clinical')(); expect(s.state()._regionalAtlasClinical).toBe(false);
    expect(s.state()._regionalAtlasStep).toBe(2); expect(work(s.state())).toEqual(before);
    const flow = s.mount().querySelector('[data-anatomy-kidney-flow]');
    expect(flow.textContent).toBe('Play flow');
    expect(s.mount().querySelector('.anatomy-kidney-playback').textContent).toBe('Flow paused');
  });

  it.each(actions)('merges newer learning work when a deferred %s action is accepted', (name, expected) => {
    const s = session(file), action = s.action(name); s.defer(); action();
    expect(s.announceToSR).not.toHaveBeenCalled();
    const newer = { ...clone(savedWork), _structureNotes: { kidneys: 'A newer explanation.', liver: 'Portal flow.' },
      quizScore: 5, quizFeedback: { chosen: 'liver', correct: true }, _flashcardIdx: 0, _spotterScore: 7,
      _clinicalStudy: { version: 1, cases: { case_1: { draft: 'New clinical reasoning.' } } } };
    s.patch(newer); s.flush(); vi.runAllTimers();
    expect(s.state()).toMatchObject(expected); expect(work(s.state())).toEqual(newer);
    expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
  });

  it.each(contextChanges)('rejects captured guide actions after the %s changes', (_label, patch) => {
    const s = session(file), captured = actions.map(([name]) => s.action(name)); s.patch(patch);
    const before = clone(s.state()); captured.forEach(action => action()); vi.runAllTimers();
    expect(s.state()).toEqual(before); expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it.each(contextChanges)('rejects deferred guide actions when the %s changes before acceptance', (_label, patch) => {
    const s = session(file), captured = actions.map(([name]) => s.action(name)); s.defer(); captured.forEach(action => action());
    expect(s.announceToSR).not.toHaveBeenCalled(); s.patch(patch); const before = clone(s.state());
    s.flush(); vi.runAllTimers(); expect(s.state()).toEqual(before); expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it.each([[-9, steps[0][0]], [50, steps[3][0]], ['invalid', steps[0][0]]])('safely displays restored step %s', (value, expected) => {
    const s = session(file, { _regionalAtlasStep: value }), root = s.mount();
    expect(root.querySelector('[data-anatomy-atlas="kidneys"]').getAttribute('data-anatomy-atlas-step')).toBe(expected);
  });
});
