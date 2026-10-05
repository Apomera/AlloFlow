// Heart circulation guide: chamber geometry, valve state, accessible controls, and saved-work continuity.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const steps = [
  ['venous_return', '1. Venous return', 'Oxygen-poor blood returns from the body through the superior and inferior venae cavae and enters the right atrium.', null],
  ['pulmonary_outflow', '2. To the lungs', 'Blood crosses the tricuspid valve into the right ventricle, then passes through the pulmonary valve and pulmonary arteries to the lungs.', 'pulmonary-valve-open'],
  ['pulmonary_return', '3. Oxygenated return', 'After gas exchange, oxygen-rich blood returns through the pulmonary veins and enters the left atrium.', null],
  ['systemic_outflow', '4. To the body', 'Blood crosses the mitral valve into the left ventricle, then passes through the aortic valve and aorta to supply the body.', 'aortic-valve-open'],
];
const originalRoutes = [
  'M574 170 C505 170 504 48 360 48 C320 48 300 57 286 78',
  'M284 145 L284 205 C238 270 170 242 136 186 C123 165 121 149 120 136',
  'M120 120 C160 72 235 48 335 65 L371 82',
  'M379 145 L379 207 C428 279 492 232 523 188 C541 162 554 157 577 157',
];
const clinicalNarrative = {
  change: 'The aortic valve opening narrows, increasing resistance to left-ventricular outflow.',
  effect: 'The left ventricle must generate higher pressure and may thicken over time.',
};
const clone = value => JSON.parse(JSON.stringify(value));
const savedWork = {
  _structureNotes: { heart: 'My explanation of double circulation and cardiac valves.' },
  _structureConfidence: { heart: 'learning' }, _retrievalEvidence: { heart: { attempts: 3, correct: 2 } },
  quizScore: 3, quizIdx: 2, _quizAttempts: 4, quizFeedback: { chosen: 'heart', correct: false },
  _quizQuestion: { token: 'saved-question', index: 2 }, _quizActivityReturn: { token: 'saved-question', index: 2, score: 3 },
  _flashcardDeck: ['heart', 'liver'], _flashcardIdx: 1, _flashcardFlipped: true,
  _spotterActive: true, _spotterTarget: 'heart', _spotterFeedback: 'liver', _spotterScore: 2, _spotterTotal: 3,
  _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My reasoning.' } } },
  _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3', _clinicalAtlasConceptId: 'UBERON:0001225',
  _clinicalFtuCellId: 'CL:0000653', _clinicalFtuAtlasId: 'hra-kidney-renal-corpuscle-v1.4',
};
const work = state => clone(Object.fromEntries(Object.keys(savedWork).map(key => [key, state[key]])));
const contextChanges = [
  ['closed atlas', { _regionalAtlasOpen: null }], ['selected structure', { selectedStructure: 'liver' }],
  ['system', { system: 'respiratory' }], ['view', { view: 'posterior' }], ['level', { complexity: 2 }],
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
  ['handoff', { system: 'respiratory', view: 'anterior', selectedStructure: 'alveoli', _regionalAtlasOpen: 'alveoli', _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
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
    system: 'circulatory', view: 'anterior', complexity: 3, selectedStructure: 'heart', _activeTab: 'explore',
    quizMode: false, _bodyView3d: false, _regionalAtlasOpen: 'heart', _regionalAtlasStep: 1,
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
    const result = find(tool.render(makeCtx(ctx())), node => node.props?.['data-anatomy-atlas'] === 'heart');
    expect(result).not.toBeNull(); return result;
  };
  const control = name => {
    const result = find(atlas(), node => name === 'step'
      ? node.props?.['data-anatomy-heart-step'] === steps[3][0]
      : name === 'clinical' ? node.props?.['data-anatomy-clinical-toggle'] === 'heart'
        : node.props?.['data-anatomy-heart-' + name] === true);
    expect(result).not.toBeNull(); return result;
  };
  const step = index => {
    const result = find(atlas(), node => node.props?.['data-anatomy-heart-step'] === steps[index][0]);
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

for (const file of paths) describe('Heart circulation guide: ' + file, () => {
  it.each(steps.map((step, index) => [...step, index]))('selects %s with its authored narrative and mechanism while preserving paused work', (id, label, narrative, mechanism, index) => {
    const s = session(file), before = work(s.state());
    s.step(index)(); const root = s.mount(); vi.runAllTimers();
    const atlas = root.querySelector('[data-anatomy-atlas="heart"]');
    expect(s.state()).toMatchObject({ _regionalAtlasStep: index, _regionalAtlasPlaying: false,
      system: 'circulatory', view: 'anterior', selectedStructure: 'heart', _regionalAtlasOpen: 'heart' });
    expect(atlas.getAttribute('data-anatomy-atlas-step')).toBe(id);
    const detail = atlas.querySelector('#anatomy-heart-step-detail');
    expect(detail.textContent).toContain(label); expect(detail.textContent).toContain(narrative);
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-heart-scale]')];
    expect(figures).toHaveLength(2);
    expect(atlas.querySelectorAll('[data-anatomy-mechanism]')).toHaveLength(10);
    expect(atlas.querySelectorAll('.anatomy-atlas-route')).toHaveLength(8);
    expect(atlas.querySelectorAll('.anatomy-atlas-route.is-active')).toHaveLength(2);
    figures.forEach(figure => {
      expect(figure.querySelectorAll('[data-anatomy-mechanism]')).toHaveLength(5);
      const activeMechanisms = [...figure.querySelectorAll('[data-anatomy-mechanism].is-active')];
      expect(activeMechanisms).toHaveLength(mechanism ? 1 : 0);
      if (mechanism) expect(activeMechanisms[0].getAttribute('data-anatomy-mechanism')).toBe(mechanism);
      const routes = [...figure.querySelectorAll('.anatomy-atlas-route')];
      expect(routes.map(route => route.getAttribute('d'))).toEqual(originalRoutes);
      expect(figure.querySelector('.anatomy-atlas-route.is-active').getAttribute('d')).toBe(originalRoutes[index]);
      expect(figure.querySelector('.anatomy-atlas-route.is-active').getAttribute('marker-end')).toMatch(/^url\(#.+\)$/);
    });
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
    expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it.each([false, true])('uses two named figures with numbered SVG markers and readable HTML keys (clinical=%s)', clinical => {
    const s = session(file, { _regionalAtlasClinical: clinical }), root = s.mount();
    const atlas = root.querySelector('[data-anatomy-atlas="heart"]');
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-heart-scale]')];
    expect(figures.map(figure => figure.getAttribute('data-anatomy-heart-scale'))).toEqual(['circuit', 'chambers']);
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
      expect(markers).toHaveLength(keyedStructures.length);
      expect(markers.map(marker => Number(marker.textContent.trim()))).toEqual(keyedStructures.map((_entry, index) => index + 1));
      markers.forEach(marker => { expect(Number(marker.textContent.trim())).toBeGreaterThan(0); expect(Number(marker.textContent.trim())).toBeLessThanOrEqual(keyedStructures.length); });
      expect(caption.textContent.trim().length).toBeGreaterThan(20);
      expect(figure.getAttribute('aria-labelledby')).toBeTruthy();
      expect(figure.querySelector('[id="' + figure.getAttribute('aria-labelledby') + '"]')?.textContent.trim()).toBeTruthy();
    }
    const circuitKey = figures[0].querySelector('figcaption').textContent.toLowerCase();
    ['lungs', 'heart', 'body'].forEach(term => expect(circuitKey).toContain(term));
    expect(figures[0].querySelectorAll('figcaption ol li')).toHaveLength(3);
    const chamberKey = figures[1].querySelector('figcaption').textContent.toLowerCase();
    ['right atrium', 'right ventricle', 'left atrium', 'left ventricle'].forEach(term => expect(chamberKey).toContain(term));
    expect(figures[1].querySelectorAll('figcaption ol li')).toHaveLength(4);
    if (clinical) {
      const overlays = [...atlas.querySelectorAll('[data-anatomy-clinical-overlay="aortic_stenosis"]')];
      expect(overlays).toHaveLength(2);
      overlays.forEach(overlay => {
        expect([...overlay.querySelectorAll('path')].map(path => path.getAttribute('d'))).toEqual([
          'M366 151 L376 143 L379 153 L382 143 L392 151', 'M349 188 C342 216 345 258 364 286',
        ]);
        expect(overlay.querySelectorAll('text')).toHaveLength(0);
      });
      const clinicalPanel = atlas.querySelector('[data-anatomy-clinical-panel="aortic_stenosis"]');
      expect(clinicalPanel.textContent).toContain(clinicalNarrative.change);
      expect(clinicalPanel.textContent).toContain(clinicalNarrative.effect);
    }
  });

  it('uses native buttons, pressed state and a shared live detail panel', () => {
    const s = session(file), root = s.mount(), atlas = root.querySelector('[data-anatomy-atlas="heart"]');
    const buttons = [...atlas.querySelectorAll('.anatomy-atlas-steps button')]; expect(buttons).toHaveLength(4);
    const detail = atlas.querySelector('#anatomy-heart-step-detail');
    expect(detail.getAttribute('role')).toBe('status'); expect(detail.getAttribute('aria-live')).toBe('polite');
    expect(detail.getAttribute('aria-atomic')).toBe('true');
    buttons.forEach((button, index) => {
      expect(button.type).toBe('button'); expect(button.getAttribute('data-anatomy-heart-step')).toBe(steps[index][0]);
      expect(button.getAttribute('aria-controls')).toBe(detail.id);
      expect(button.getAttribute('aria-pressed')).toBe(String(index === 1));
      expect(button.textContent).toContain(steps[index][1]);
    });
    for (const selector of ['[data-anatomy-heart-flow]', '[data-anatomy-heart-previous]', '[data-anatomy-heart-next]', '[data-anatomy-clinical-toggle="heart"]']) {
      const button = atlas.querySelector(selector); expect(button?.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
      expect(button.textContent.trim()).toBeTruthy();
    }
    expect(atlas.querySelector('[data-anatomy-heart-flow]').textContent).toMatch(/play/i);
    expect(atlas.querySelector('[data-anatomy-heart-flow]').hasAttribute('aria-pressed')).toBe(false);
    expect(atlas.querySelector('.anatomy-heart-playback').textContent).toMatch(/paused/i);
    expect(atlas.querySelector('[data-anatomy-clinical-toggle="heart"]').getAttribute('aria-pressed')).toBe('false');
    buttons[2].focus(); s.step(2)(); vi.runAllTimers(); expect(document.activeElement).toBe(buttons[2]);
  });

  it('moves through bounded previous and next steps and keeps an explicit pause', () => {
    const s = session(file), before = work(s.state());
    s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0);
    let root = s.mount(); expect(root.querySelector('[data-anatomy-heart-previous]').disabled).toBe(true);
    expect(root.querySelector('[data-anatomy-heart-next]').disabled).toBe(false);
    for (let index = 1; index < steps.length; index++) { s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(index); }
    root = s.mount(); expect(root.querySelector('[data-anatomy-heart-next]').disabled).toBe(true);
    expect(root.querySelector('[data-anatomy-heart-previous]').disabled).toBe(false);
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
    const flow = s.mount().querySelector('[data-anatomy-heart-flow]');
    expect(flow.textContent).toMatch(/play/i);
    expect(s.mount().querySelector('.anatomy-heart-playback').textContent).toMatch(/paused/i);
  });

  it.each(actions)('merges newer learning work when a deferred %s action is accepted', (name, expected) => {
    const s = session(file), action = s.action(name); s.defer(); action();
    expect(s.announceToSR).not.toHaveBeenCalled();
    const newer = { ...clone(savedWork), _structureNotes: { heart: 'A newer explanation.', liver: 'Portal flow.' },
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


  it('resolves each blood-flow arrow within its own figure and keeps all IDs unique', () => {
    const s = session(file), atlas = s.mount().querySelector('[data-anatomy-atlas="heart"]');
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-heart-scale]')];
    const references = [];
    figures.forEach(figure => {
      [...figure.querySelectorAll('.anatomy-atlas-route')].forEach((route, index) => {
        expect(route.getAttribute('d')).toBe(originalRoutes[index]);
        const color = index < 2 ? '#2563eb' : '#dc2626'; expect(route.getAttribute('stroke')).toBe(color);
        const reference = /^url\(#([^()]+)\)$/.exec(route.getAttribute('marker-end')); expect(reference).not.toBeNull();
        references.push(reference[1]);
        const markers = figure.querySelectorAll('marker[id="' + reference[1] + '"]'); expect(markers).toHaveLength(1);
        expect(atlas.querySelectorAll('[id="' + reference[1] + '"]')).toHaveLength(1);
        expect(markers[0].getAttribute('orient')).toBe('auto-start-reverse');
        expect(markers[0].querySelector('path').getAttribute('fill')).toBe(color);
      });
    });
    expect(new Set(references).size).toBe(4);
    const ids = [...atlas.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    const key = atlas.querySelector('[data-anatomy-visual-key="heart"]'); expect(key).not.toBeNull();
    expect(key.textContent.toLowerCase()).toContain('oxygen-poor'); expect(key.textContent.toLowerCase()).toContain('oxygen-rich');
  });

  it.each(steps.map((step, index) => [step[0], index]))('preserves chamber contraction geometry and readable valve states in %s', (_id, index) => {
    const s = session(file, { _regionalAtlasStep: index }), atlas = s.mount().querySelector('[data-anatomy-atlas="heart"]');
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-heart-scale]')];
    figures.forEach(figure => {
      const rightVentricle = figure.querySelector('[data-anatomy-mechanism="right-ventricle-contraction"]');
      expect(rightVentricle.tagName.toLowerCase()).toBe('rect');
      expect(Number(rightVentricle.getAttribute('y'))).toBe(index === 1 ? 193 : 185);
      expect(Number(rightVentricle.getAttribute('height'))).toBe(index === 1 ? 84 : 96);
      expect(Number(rightVentricle.getAttribute('stroke-width'))).toBe(index === 1 ? 5 : 2);
      const leftVentricle = figure.querySelector('[data-anatomy-mechanism="left-ventricle-contraction"]');
      expect(leftVentricle.tagName.toLowerCase()).toBe('rect');
      expect(Number(leftVentricle.getAttribute('y'))).toBe(index === 3 ? 194 : 185);
      expect(Number(leftVentricle.getAttribute('height'))).toBe(index === 3 ? 90 : 105);
      expect(Number(leftVentricle.getAttribute('stroke-width'))).toBe(index === 3 ? 5 : 3);
      const gating = figure.querySelector('[data-anatomy-mechanism="heart-valve-gating"]');
      expect([...gating.querySelectorAll('path')].map(path => path.getAttribute('d'))).toEqual([
        index === 0 ? 'M253 168 L280 181 M315 168 L288 181' : 'M253 172 L315 172',
        index === 2 ? 'M348 168 L375 181 M410 168 L383 181' : 'M348 172 L410 172',
      ]);
      expect(gating.querySelectorAll('text')).toHaveLength(0);
      expect(figure.querySelector('[data-anatomy-mechanism="pulmonary-valve-open"] path').getAttribute('d')).toBe('M272 152 L284 142 L296 152');
      expect(figure.querySelector('[data-anatomy-mechanism="aortic-valve-open"] path').getAttribute('d')).toBe('M367 152 L379 142 L391 152');
    });
    for (const [id, state] of [['tricuspid', index === 0 ? 'Open' : 'Closed'], ['mitral', index === 2 ? 'Open' : 'Closed'], ['pulmonary', index === 1 ? 'Open' : 'Not highlighted in this step'], ['aortic', index === 3 ? 'Open' : 'Not highlighted in this step']]) {
      const valve = atlas.querySelector('[data-anatomy-heart-valve="' + id + '"]');
      expect(valve).not.toBeNull(); expect(valve.closest('svg')).toBeNull();
      expect(valve.textContent.toLowerCase()).toContain(id); expect(valve.textContent).toContain(state);
    }
    const source = fs.readFileSync(file, 'utf8');
    steps.forEach(([, label, detail]) => { expect(source).toContain(label); expect(source).toContain(detail); });
    Object.values(clinicalNarrative).forEach(detail => expect(source).toContain(detail));
  });

  it('keeps the connected route to pulmonary gas exchange visible', () => {
    const s = session(file), atlas = s.mount().querySelector('[data-anatomy-atlas="heart"]');
    const handoff = atlas.querySelector('[data-anatomy-pathway-from="heart"][data-scale-continuation="alveoli"]');
    expect(handoff).not.toBeNull();
    expect(handoff.textContent).toContain('move into the air-blood barrier where pulmonary capillary blood gains oxygen.');
    expect(handoff.querySelector('button').textContent).toBe('Follow gas exchange');
  });


  it.each([false, true])('opens alveolar oxygen diffusion and preserves the playback preference (%s)', playing => {
    const viewed = { liver: true, kidneys: true, epidermis: true };
    const s = session(file, { _regionalAtlasPlaying: playing, _regionalAtlasClinical: true, _anatomyLensViewed: viewed, search: 'heart', _studyFilter: 'bookmarked' });
    const before = work(s.state()), control = s.mount().querySelector('[data-anatomy-heart-handoff]');
    expect(control?.tagName).toBe('BUTTON'); expect(control.type).toBe('button'); expect(control.textContent).toBe('Follow gas exchange');
    s.action('handoff')(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ system: 'respiratory', view: 'anterior', complexity: 3, selectedStructure: 'alveoli',
      _regionalAtlasOpen: 'alveoli', _regionalAtlasStep: 1, _regionalAtlasClinical: false, _regionalAtlasPlaying: playing,
      _activeTab: 'explore', quizMode: false, _bodyView3d: false, _anatomyModelFocus: false,
      _showStudySheet: false, _showAnatomyLens: false, _anatomyLensEntry: null, search: '', _studyFilter: 'all' });
    expect(s.state()._anatomyLensViewed).toEqual({ ...viewed, alveoli: true });
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
    expect(s.announceToSR).toHaveBeenCalledTimes(1);
    expect(s.announceToSR).toHaveBeenCalledWith('Opening alveolar oxygen diffusion, step 2 of 4.');
    const destination = s.mount().querySelector('[data-anatomy-atlas="alveoli"]'); expect(destination).not.toBeNull();
    expect(destination.classList.contains('is-paused')).toBe(!playing); expect(destination.classList.contains('is-clinical')).toBe(false);
  });

  it('marks the alveoli viewed after acceptance and preserves newer deferred notes and viewed records', () => {
    const s = session(file, { _regionalAtlasClinical: true, _anatomyLensViewed: { kidneys: true } }), captured = s.action('handoff');
    const newerWork = { ...clone(savedWork), _structureNotes: { heart: 'New circulation explanation.', alveoli: 'New gas-exchange explanation.' },
      _clinicalStudy: { version: 1, cases: { case_1: { draft: 'Newest clinical reasoning.' } } }, quizScore: 8, _spotterTotal: 9 };
    const newerViewed = { kidneys: true, liver: true, patella: true, heart: true };
    s.defer(); captured(); expect(s.announceToSR).not.toHaveBeenCalled();
    expect(s.state()._anatomyLensViewed).toEqual({ kidneys: true });
    s.patch({ ...newerWork, _anatomyLensViewed: newerViewed }); s.flush(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ selectedStructure: 'alveoli', _regionalAtlasOpen: 'alveoli', _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: false });
    expect(work(s.state())).toEqual(newerWork); expect(s.state()._anatomyLensViewed).toEqual({ ...newerViewed, alveoli: true });
    expect(s.announceToSR).toHaveBeenCalledTimes(1);
    expect(s.announceToSR).toHaveBeenCalledWith('Opening alveolar oxygen diffusion, step 2 of 4.');
  });

  it('focuses the accepted visible alveoli destination after the originating control is replaced', () => {
    const s = session(file), origin = s.mount().querySelector('[data-anatomy-heart-handoff]'); origin.focus();
    expect(document.activeElement).toBe(origin); s.action('handoff')();
    const target = s.mount().querySelector('[data-anatomy-atlas="alveoli"]'); expect(target).not.toBeNull();
    Object.defineProperty(target, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 200 }] });
    const focus = vi.spyOn(target, 'focus'); vi.runAllTimers();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(document.activeElement).toBe(target);
  });

  it('keeps the learner’s newer input focus when accepted handoff focus is pending', () => {
    const s = session(file), origin = s.mount().querySelector('[data-anatomy-heart-handoff]'); origin.focus();
    s.action('handoff')(); const target = s.mount().querySelector('[data-anatomy-atlas="alveoli"]');
    Object.defineProperty(target, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 200 }] });
    const focus = vi.spyOn(target, 'focus'), input = document.createElement('input'); document.body.appendChild(input); input.focus();
    vi.runAllTimers(); expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input);
    expect(s.state().selectedStructure).toBe('alveoli');
  });

  it.each([[-9, steps[0][0]], [50, steps[3][0]], ['invalid', steps[0][0]]])('safely displays restored step %s', (value, expected) => {
    const s = session(file, { _regionalAtlasStep: value }), root = s.mount();
    expect(root.querySelector('[data-anatomy-atlas="heart"]').getAttribute('data-anatomy-atlas-step')).toBe(expected);
  });
});
