// Alveolar exchange guide: scientific direction, accessible controls, and saved-work continuity.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const steps = [
  ['alveolar_ventilation', '1. Ventilation', 'Inhalation refreshes alveolar air. Oxygen partial pressure becomes higher in the alveolus than in the arriving pulmonary capillary blood.', 'ventilation-pressure-change'],
  ['oxygen_diffusion', '2. Oxygen diffusion', 'Oxygen diffuses down its partial-pressure gradient across the type I alveolar epithelium, thin interstitial layer, and capillary endothelium, then binds to hemoglobin.', 'oxygen-binding'],
  ['carbon_dioxide_diffusion', '3. Carbon dioxide', 'Carbon dioxide diffuses in the opposite direction, from arriving venous blood across the air-blood barrier into the alveolar air.', 'carbon-dioxide-unloading'],
  ['gas_transport', '4. Transport onward', 'Oxygenated blood continues toward the pulmonary veins and left heart. Carbon dioxide is removed from the alveolus during exhalation; efficient exchange requires matched ventilation and perfusion.', 'matched-ventilation-perfusion'],
];
const originalRoutes = [
  'M28 130 C78 130 132 124 182 160 L218 160',
  'M245 174 L245 243 M520 92 L520 201',
  'M310 267 L310 181 M562 211 L562 92',
  'M150 270 C234 300 342 300 435 255 M218 126 C160 102 96 106 35 121',
];
const clinicalNarrative = {
  change: 'Fluid accumulates around the air-blood barrier and increases diffusion distance.',
  effect: 'Oxygen transfer is impaired before carbon-dioxide removal becomes severely limited.',
};
const clone = value => JSON.parse(JSON.stringify(value));
const savedWork = {
  _structureNotes: { alveoli: 'My explanation of opposite oxygen and carbon-dioxide diffusion.' },
  _structureConfidence: { alveoli: 'learning' }, _retrievalEvidence: { alveoli: { attempts: 3, correct: 2 } },
  quizScore: 3, quizIdx: 2, _quizAttempts: 4, quizFeedback: { chosen: 'alveoli', correct: false },
  _quizQuestion: { token: 'saved-question', index: 2 }, _quizActivityReturn: { token: 'saved-question', index: 2, score: 3 },
  _flashcardDeck: ['alveoli', 'liver'], _flashcardIdx: 1, _flashcardFlipped: true,
  _spotterActive: true, _spotterTarget: 'alveoli', _spotterFeedback: 'liver', _spotterScore: 2, _spotterTotal: 3,
  _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My reasoning.' } } },
  _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3', _clinicalAtlasConceptId: 'UBERON:0001225',
  _clinicalFtuCellId: 'CL:0000653', _clinicalFtuAtlasId: 'hra-kidney-renal-corpuscle-v1.4',
};
const work = state => clone(Object.fromEntries(Object.keys(savedWork).map(key => [key, state[key]])));
const contextChanges = [
  ['closed atlas', { _regionalAtlasOpen: null }], ['selected structure', { selectedStructure: 'liver' }],
  ['system', { system: 'circulatory' }], ['view', { view: 'posterior' }], ['level', { complexity: 2 }],
  ['activity', { _activeTab: 'flashcards' }], ['Quiz mode', { quizMode: true }],
  ['step', { _regionalAtlasStep: 0 }], ['flow choice', { _regionalAtlasPlaying: true }],
  ['clinical choice', { _regionalAtlasClinical: true }],
  ['3D choice', { _bodyView3d: true }], ['model focus', { _anatomyModelFocus: true }],
  ['study sheet', { _showStudySheet: true }], ['gallery', { _showAnatomyLens: true }],
];
const actions = [
  ['step', { _regionalAtlasStep: 3, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['previous', { _regionalAtlasStep: 0, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['next', { _regionalAtlasStep: 2, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['flow', { _regionalAtlasStep: 1, _regionalAtlasPlaying: true, _regionalAtlasClinical: false }],
  ['clinical', { _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: true }],
  ['handoff', { system: 'circulatory', view: 'anterior', selectedStructure: 'heart', _regionalAtlasOpen: 'heart', _regionalAtlasStep: 2, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
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
    system: 'respiratory', view: 'anterior', complexity: 3, selectedStructure: 'alveoli', _activeTab: 'explore',
    quizMode: false, _bodyView3d: false, _regionalAtlasOpen: 'alveoli', _regionalAtlasStep: 1,
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
    const result = find(tool.render(makeCtx(ctx())), node => node.props?.['data-anatomy-atlas'] === 'alveoli');
    expect(result).not.toBeNull(); return result;
  };
  const control = name => {
    const result = find(atlas(), node => name === 'step'
      ? node.props?.['data-anatomy-alveolus-step'] === steps[3][0]
      : name === 'clinical' ? node.props?.['data-anatomy-clinical-toggle'] === 'alveoli'
        : node.props?.['data-anatomy-alveolus-' + name] === true);
    expect(result).not.toBeNull(); return result;
  };
  const step = index => {
    const result = find(atlas(), node => node.props?.['data-anatomy-alveolus-step'] === steps[index][0]);
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

for (const file of paths) describe('Alveolar exchange guide: ' + file, () => {
  it.each(steps.map((step, index) => [...step, index]))('selects %s with its authored narrative and mechanism while preserving paused work', (id, label, narrative, mechanism, index) => {
    const s = session(file), before = work(s.state());
    s.step(index)(); const root = s.mount(); vi.runAllTimers();
    const atlas = root.querySelector('[data-anatomy-atlas="alveoli"]');
    expect(s.state()).toMatchObject({ _regionalAtlasStep: index, _regionalAtlasPlaying: false,
      system: 'respiratory', view: 'anterior', selectedStructure: 'alveoli', _regionalAtlasOpen: 'alveoli' });
    expect(atlas.getAttribute('data-anatomy-atlas-step')).toBe(id);
    const detail = atlas.querySelector('#anatomy-alveolus-step-detail');
    expect(detail.textContent).toContain(label); expect(detail.textContent).toContain(narrative);
    expect(atlas.querySelectorAll('[data-anatomy-mechanism]')).toHaveLength(5);
    expect(atlas.querySelector('[data-anatomy-mechanism="alveolar-expansion"]')).not.toBeNull();
    expect(atlas.querySelectorAll('[data-anatomy-mechanism].is-active')).toHaveLength(1);
    expect(atlas.querySelector('[data-anatomy-mechanism].is-active').getAttribute('data-anatomy-mechanism')).toBe(mechanism);
    expect(atlas.querySelectorAll('.anatomy-atlas-route')).toHaveLength(6);
    expect(atlas.querySelectorAll('.anatomy-atlas-route.is-active')).toHaveLength(index === 1 || index === 2 ? 2 : 1);
    const routePaths = [...atlas.querySelectorAll('.anatomy-atlas-route')].map(route => route.getAttribute('d'));
    originalRoutes.forEach(route => expect(routePaths).toContain(route));
    expect(atlas.querySelector('.anatomy-atlas-route.is-active').getAttribute('marker-end')).toMatch(/^url\(#.+\)$/);
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
    expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it.each([false, true])('uses two named figures with numbered SVG markers and readable HTML keys (clinical=%s)', clinical => {
    const s = session(file, { _regionalAtlasClinical: clinical }), root = s.mount();
    const atlas = root.querySelector('[data-anatomy-atlas="alveoli"]');
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-alveolus-scale]')];
    expect(figures.map(figure => figure.getAttribute('data-anatomy-alveolus-scale'))).toEqual(['overview', 'barrier']);
    for (const figure of figures) {
      const svg = figure.querySelector('svg[role="img"]'); expect(svg).not.toBeNull();
      const labels = (svg.getAttribute('aria-labelledby') || '').trim().split(/\s+/);
      expect(labels).toHaveLength(2);
      labels.forEach(id => expect(figure.querySelector('[id="' + id + '"]')?.textContent.trim()).toBeTruthy());
      const markers = [...svg.querySelectorAll('text')]; expect(markers.length).toBeGreaterThan(0);
      markers.forEach(marker => expect(marker.textContent.trim()).toMatch(/^\d+$/));
      const caption = figure.querySelector('figcaption'); expect(caption).not.toBeNull();
      const key = caption.querySelector('ol'); expect(key).not.toBeNull();
      const keyedStructures = [...key.querySelectorAll('li')]; expect(keyedStructures.length).toBeGreaterThan(0);
      markers.forEach(marker => { expect(Number(marker.textContent.trim())).toBeGreaterThan(0); expect(Number(marker.textContent.trim())).toBeLessThanOrEqual(keyedStructures.length); });
      expect(caption.textContent.trim().length).toBeGreaterThan(20);
      expect(figure.getAttribute('aria-labelledby')).toBeTruthy();
      expect(figure.querySelector('[id="' + figure.getAttribute('aria-labelledby') + '"]')?.textContent.trim()).toBeTruthy();
    }
    const overviewKey = figures[0].querySelector('figcaption').textContent.toLowerCase();
    ['terminal airway', 'alveolar air', 'capillary'].forEach(term => expect(overviewKey).toContain(term));
    const barrierKey = figures[1].querySelector('figcaption').textContent.toLowerCase();
    ['surfactant', 'type i', 'interstiti', 'endothelium', 'red blood cell'].forEach(term => expect(barrierKey).toContain(term));
    if (clinical) {
      const overlay = atlas.querySelector('[data-anatomy-clinical-overlay="pulmonary_edema"]');
      expect(overlay).not.toBeNull(); expect(overlay.querySelectorAll('circle')).toHaveLength(4);
      const fluid = overlay.querySelector('rect'); expect(fluid).not.toBeNull();
      expect(Number(fluid.getAttribute('height'))).toBe(25);
      const clinicalPanel = atlas.querySelector('[data-anatomy-clinical-panel="pulmonary_edema"]');
      expect(clinicalPanel.textContent).toContain(clinicalNarrative.change);
      expect(clinicalPanel.textContent).toContain(clinicalNarrative.effect);
    }
  });

  it('uses native buttons, pressed state and a shared live detail panel', () => {
    const s = session(file), root = s.mount(), atlas = root.querySelector('[data-anatomy-atlas="alveoli"]');
    const buttons = [...atlas.querySelectorAll('.anatomy-atlas-steps button')]; expect(buttons).toHaveLength(4);
    const detail = atlas.querySelector('#anatomy-alveolus-step-detail');
    expect(detail.getAttribute('role')).toBe('status'); expect(detail.getAttribute('aria-live')).toBe('polite');
    expect(detail.getAttribute('aria-atomic')).toBe('true');
    buttons.forEach((button, index) => {
      expect(button.type).toBe('button'); expect(button.getAttribute('data-anatomy-alveolus-step')).toBe(steps[index][0]);
      expect(button.getAttribute('aria-controls')).toBe(detail.id);
      expect(button.getAttribute('aria-pressed')).toBe(String(index === 1));
      expect(button.textContent).toContain(steps[index][1]);
    });
    for (const selector of ['[data-anatomy-alveolus-flow]', '[data-anatomy-alveolus-previous]', '[data-anatomy-alveolus-next]', '[data-anatomy-clinical-toggle="alveoli"]']) {
      const button = atlas.querySelector(selector); expect(button?.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
      expect(button.textContent.trim()).toBeTruthy();
    }
    expect(atlas.querySelector('[data-anatomy-alveolus-flow]').textContent).toMatch(/play/i);
    expect(atlas.querySelector('[data-anatomy-alveolus-flow]').hasAttribute('aria-pressed')).toBe(false);
    expect(atlas.querySelector('.anatomy-alveolus-playback').textContent).toMatch(/paused/i);
    expect(atlas.querySelector('[data-anatomy-clinical-toggle="alveoli"]').getAttribute('aria-pressed')).toBe('false');
    buttons[2].focus(); s.step(2)(); vi.runAllTimers(); expect(document.activeElement).toBe(buttons[2]);
  });

  it('moves through bounded previous and next steps and keeps an explicit pause', () => {
    const s = session(file), before = work(s.state());
    s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0);
    let root = s.mount(); expect(root.querySelector('[data-anatomy-alveolus-previous]').disabled).toBe(true);
    expect(root.querySelector('[data-anatomy-alveolus-next]').disabled).toBe(false);
    for (let index = 1; index < steps.length; index++) { s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(index); }
    root = s.mount(); expect(root.querySelector('[data-anatomy-alveolus-next]').disabled).toBe(true);
    expect(root.querySelector('[data-anatomy-alveolus-previous]').disabled).toBe(false);
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
    const flow = s.mount().querySelector('[data-anatomy-alveolus-flow]');
    expect(flow.textContent).toMatch(/play/i);
    expect(s.mount().querySelector('.anatomy-alveolus-playback').textContent).toMatch(/paused/i);
  });

  it.each(actions)('merges newer learning work when a deferred %s action is accepted', (name, expected) => {
    const s = session(file), action = s.action(name); s.defer(); action();
    expect(s.announceToSR).not.toHaveBeenCalled();
    const newer = { ...clone(savedWork), _structureNotes: { alveoli: 'A newer explanation.', liver: 'Portal flow.' },
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


  it('keeps oxygen and carbon-dioxide arrows opposite with unique markers resolved within each figure', () => {
    const s = session(file, { _regionalAtlasStep: 1 }), root = s.mount(), atlas = root.querySelector('[data-anatomy-atlas="alveoli"]');
    const oxygen = [...atlas.querySelectorAll('.anatomy-atlas-route[data-anatomy-gas-route="1"]')];
    const carbon = [...atlas.querySelectorAll('.anatomy-atlas-route[data-anatomy-gas-route="2"]')];
    expect(oxygen).toHaveLength(2); expect(carbon).toHaveLength(2);
    expect(oxygen.map(route => route.closest('figure').getAttribute('data-anatomy-alveolus-scale'))).toEqual(['overview', 'barrier']);
    expect(carbon.map(route => route.closest('figure').getAttribute('data-anatomy-alveolus-scale'))).toEqual(['overview', 'barrier']);
    const markerIds = [];
    for (const [routes, originalPath, expectedColor, baseId, direction] of [
      [oxygen, originalRoutes[1], '#dc2626', 'anatomy-arrow-oxygen', 1],
      [carbon, originalRoutes[2], '#2563eb', 'anatomy-arrow-carbon', -1],
    ]) {
      routes.forEach((route, index) => {
        expect(route.getAttribute('d')).toBe(originalPath); expect(route.getAttribute('stroke')).toBe(expectedColor);
        const reference = /^url\(#([^()]+)\)$/.exec(route.getAttribute('marker-end')); expect(reference).not.toBeNull();
        const markerId = reference[1]; markerIds.push(markerId); expect(markerId).toBe(baseId + (index ? '-barrier' : ''));
        const figure = route.closest('figure'), markers = figure.querySelectorAll('marker[id="' + markerId + '"]');
        expect(markers).toHaveLength(1); expect(atlas.querySelectorAll('[id="' + markerId + '"]')).toHaveLength(1);
        expect(markers[0].getAttribute('orient')).toBe('auto-start-reverse');
        expect(markers[0].querySelector('path').getAttribute('fill')).toBe(expectedColor);
        const segments = [...route.getAttribute('d').matchAll(/M\s*([\d.]+)\s+([\d.]+)\s*L\s*([\d.]+)\s+([\d.]+)/g)].map(match => match.slice(1).map(Number));
        expect(segments).toHaveLength(2);
        segments.forEach(([x1, y1, x2, y2]) => { expect(x1).toBe(x2); expect(Math.sign(y2 - y1)).toBe(direction); });
      });
    }
    expect(new Set(markerIds).size).toBe(4);
    const ids = [...atlas.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    const key = atlas.querySelector('[data-anatomy-visual-key="alveoli"]'); expect(key).not.toBeNull();
    expect(key.textContent.toLowerCase()).toContain('oxygen'); expect(key.textContent.toLowerCase()).toContain('carbon dioxide');
    s.step(2)(); const next = s.mount().querySelector('[data-anatomy-atlas="alveoli"]');
    expect([...next.querySelectorAll('.anatomy-atlas-route.is-active')].every(route => route.getAttribute('data-anatomy-gas-route') === '2')).toBe(true);
  });

  it('preserves expansion, hemoglobin binding, opposite gas diffusion, and onward transport geometry', () => {
    const s = session(file, { _regionalAtlasStep: 0 });
    let atlas = s.mount().querySelector('[data-anatomy-atlas="alveoli"]');
    const expansion = atlas.querySelector('[data-anatomy-mechanism="alveolar-expansion"]');
    expect(Number(expansion.getAttribute('r'))).toBe(96);
    expect(atlas.querySelector('[data-anatomy-mechanism="ventilation-pressure-change"]').querySelectorAll('circle')).toHaveLength(4);
    s.step(1)(); atlas = s.mount().querySelector('[data-anatomy-atlas="alveoli"]');
    expect(Number(atlas.querySelector('[data-anatomy-mechanism="alveolar-expansion"]').getAttribute('r'))).toBe(91);
    expect(atlas.querySelector('[data-anatomy-mechanism="oxygen-binding"]').querySelectorAll('circle')).toHaveLength(4);
    s.step(2)(); atlas = s.mount().querySelector('[data-anatomy-atlas="alveoli"]');
    expect(atlas.querySelector('[data-anatomy-mechanism="carbon-dioxide-unloading"]').querySelectorAll('rect')).toHaveLength(4);
    s.step(3)(); atlas = s.mount().querySelector('[data-anatomy-atlas="alveoli"]');
    expect(atlas.querySelector('[data-anatomy-mechanism="matched-ventilation-perfusion"]').querySelectorAll('path')).toHaveLength(2);
    const source = fs.readFileSync(file, 'utf8');
    steps.forEach(([, label, detail]) => { expect(source).toContain(label); expect(source).toContain(detail); });
    Object.values(clinicalNarrative).forEach(detail => expect(source).toContain(detail));
  });

  it('keeps the connected route to the left-heart return visible', () => {
    const s = session(file), atlas = s.mount().querySelector('[data-anatomy-atlas="alveoli"]');
    const handoff = atlas.querySelector('[data-anatomy-pathway-from="alveoli"][data-scale-continuation="heart"]');
    expect(handoff).not.toBeNull();
    expect(handoff.textContent).toContain('follow oxygenated pulmonary blood back through the left heart before systemic delivery.');
    expect(handoff.querySelector('button').textContent).toBe('Return to cardiac flow');
  });


  it.each([false, true])('opens the normal left-heart return and preserves the playback preference (%s)', playing => {
    const viewed = { liver: true, kidneys: true, epidermis: true };
    const s = session(file, { _regionalAtlasPlaying: playing, _regionalAtlasClinical: true, _anatomyLensViewed: viewed, search: 'alveolus', _studyFilter: 'bookmarked' });
    const before = work(s.state()), control = s.mount().querySelector('[data-anatomy-alveolus-handoff]');
    expect(control?.tagName).toBe('BUTTON'); expect(control.type).toBe('button'); expect(control.textContent).toBe('Return to cardiac flow');
    s.action('handoff')(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ system: 'circulatory', view: 'anterior', complexity: 3, selectedStructure: 'heart',
      _regionalAtlasOpen: 'heart', _regionalAtlasStep: 2, _regionalAtlasClinical: false, _regionalAtlasPlaying: playing,
      _activeTab: 'explore', quizMode: false, _bodyView3d: false, _anatomyModelFocus: false,
      _showStudySheet: false, _showAnatomyLens: false, _anatomyLensEntry: null, search: '', _studyFilter: 'all' });
    expect(s.state()._anatomyLensViewed).toEqual({ ...viewed, heart: true });
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
    expect(s.announceToSR).toHaveBeenCalledTimes(1);
    expect(s.announceToSR).toHaveBeenCalledWith('Opening oxygenated return to the left heart, step 3 of 4.');
    const destination = s.mount().querySelector('[data-anatomy-atlas="heart"]'); expect(destination).not.toBeNull();
    expect(destination.classList.contains('is-paused')).toBe(!playing); expect(destination.classList.contains('is-clinical')).toBe(false);
  });

  it('marks the heart viewed after acceptance and preserves newer deferred notes and viewed records', () => {
    const s = session(file, { _regionalAtlasClinical: true, _anatomyLensViewed: { kidneys: true } }), captured = s.action('handoff');
    const newerWork = { ...clone(savedWork), _structureNotes: { alveoli: 'New barrier explanation.', heart: 'New left-heart explanation.' },
      _clinicalStudy: { version: 1, cases: { case_1: { draft: 'Newest clinical reasoning.' } } }, quizScore: 8, _spotterTotal: 9 };
    const newerViewed = { kidneys: true, liver: true, patella: true, alveoli: true };
    s.defer(); captured(); expect(s.announceToSR).not.toHaveBeenCalled();
    expect(s.state()._anatomyLensViewed).toEqual({ kidneys: true });
    s.patch({ ...newerWork, _anatomyLensViewed: newerViewed }); s.flush(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ selectedStructure: 'heart', _regionalAtlasOpen: 'heart', _regionalAtlasStep: 2, _regionalAtlasPlaying: false, _regionalAtlasClinical: false });
    expect(work(s.state())).toEqual(newerWork); expect(s.state()._anatomyLensViewed).toEqual({ ...newerViewed, heart: true });
    expect(s.announceToSR).toHaveBeenCalledTimes(1);
    expect(s.announceToSR).toHaveBeenCalledWith('Opening oxygenated return to the left heart, step 3 of 4.');
  });

  it('focuses the accepted visible heart destination after the originating control is replaced', () => {
    const s = session(file), origin = s.mount().querySelector('[data-anatomy-alveolus-handoff]'); origin.focus();
    expect(document.activeElement).toBe(origin); s.action('handoff')();
    const target = s.mount().querySelector('[data-anatomy-atlas="heart"]'); expect(target).not.toBeNull();
    Object.defineProperty(target, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 200 }] });
    const focus = vi.spyOn(target, 'focus'); vi.runAllTimers();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(document.activeElement).toBe(target);
  });

  it('keeps the learner’s newer input focus when accepted handoff focus is pending', () => {
    const s = session(file), origin = s.mount().querySelector('[data-anatomy-alveolus-handoff]'); origin.focus();
    s.action('handoff')(); const target = s.mount().querySelector('[data-anatomy-atlas="heart"]');
    Object.defineProperty(target, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 200 }] });
    const focus = vi.spyOn(target, 'focus'), input = document.createElement('input'); document.body.appendChild(input); input.focus();
    vi.runAllTimers(); expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input);
    expect(s.state().selectedStructure).toBe('heart');
  });

  it.each([[-9, steps[0][0]], [50, steps[3][0]], ['invalid', steps[0][0]]])('safely displays restored step %s', (value, expected) => {
    const s = session(file, { _regionalAtlasStep: value }), root = s.mount();
    expect(root.querySelector('[data-anatomy-atlas="alveoli"]').getAttribute('data-anatomy-atlas-step')).toBe(expected);
  });
});
