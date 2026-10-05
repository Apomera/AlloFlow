// Muscle guide: split scale figures, original mechanisms, and safe study continuity for both muscle aliases.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const steps = [
  ['motor_terminal', '1. Nerve signal', 'A motor-neuron action potential reaches the axon terminal and opens voltage-gated calcium channels. Calcium entry triggers synaptic vesicles to fuse with the membrane.', 'terminal-calcium-entry'],
  ['end_plate', '2. Motor end plate', 'Acetylcholine crosses the synaptic cleft and binds nicotinic receptors on the motor end plate. Sodium entry produces an end-plate potential that initiates a muscle action potential.', 'end-plate-depolarization'],
  ['calcium_release', '3. Calcium release', 'The action potential travels along the sarcolemma and down T-tubules. Voltage sensors activate ryanodine receptors in the sarcoplasmic reticulum, releasing calcium that binds troponin.', 'calcium-release-to-troponin'],
  ['cross_bridge_cycle', '4. Sarcomere shortens', 'Calcium moves tropomyosin away from actin binding sites. ATP-powered myosin cross-bridge cycles pull thin filaments toward the sarcomere center; calcium reuptake and acetylcholine breakdown allow relaxation.', 'cross-bridge-power-stroke'],
];
const originalRoutes = [
  'M22 72 C94 72 160 69 218 101 C239 111 264 111 292 102',
  'M242 108 C242 132 242 149 242 174 M280 112 C280 139 280 153 280 178',
  'M304 181 C334 181 362 195 375 225 L375 272 C375 289 390 297 407 300',
  'M468 258 L523 258 M595 291 L540 291',
];
const originalPaths = [
  'M 0 0 L 10 5 L 0 10 z',
  'M20 72 C80 72 127 70 177 82 C197 87 207 91 221 101',
  'M202 86 C224 58 281 56 314 83 C338 103 329 135 298 143 C263 152 219 139 205 116 C198 105 198 96 202 86 Z',
  'M26 184 C75 176 120 188 166 180 C211 173 245 190 284 179 C328 167 370 190 416 179 C463 168 515 190 614 180',
  'M362 180 L362 252 C362 268 388 268 388 252 L388 180',
  'M230 185 L230 211 M318 185 L318 211',
  'M506 275 L520 258 M532 275 L544 291 M555 275 L566 258',
];
const activationKey = ['Motor axon', 'Axon terminal', 'Synaptic vesicles', 'Synaptic cleft', 'Nicotinic ACh receptors', 'Muscle sarcolemma', 'T-tubule', 'Sarcoplasmic reticulum + Ca2+'];
const sarcomereKey = ['Actin', 'Myosin', 'Z discs'];
const mechanismCaptions = ['terminal Ca2+ entry triggers vesicle fusion', 'Na+ entry depolarizes the end plate', 'Ca2+ exposes actin binding sites', 'Z discs move closer'];
const clinicalNarrative = {
  change: 'Fewer functional nicotinic acetylcholine receptors reduce the motor end plate safety factor.',
  effect: 'Repeated nerve signals are less likely to trigger reliable muscle-fiber action potentials.',
  note: 'Educational comparison only — not a diagnostic view.',
};
const clone = value => JSON.parse(JSON.stringify(value));
const savedWork = {
  _structureNotes: { biceps: 'My muscle activation explanation.', quads: 'My quadriceps mechanism explanation.', patella: 'My knee explanation.' },
  _structureConfidence: { biceps: 'learning', quads: 'learning' }, _retrievalEvidence: { biceps: { attempts: 3, correct: 2 }, quads: { attempts: 2, correct: 1 } },
  quizScore: 3, quizIdx: 2, _quizAttempts: 4, quizFeedback: { chosen: 'biceps', correct: false },
  _quizQuestion: { token: 'saved-question', index: 2 }, _quizActivityReturn: { token: 'saved-question', index: 2, score: 3 },
  _flashcardDeck: ['biceps', 'quads', 'liver'], _flashcardIdx: 1, _flashcardFlipped: true,
  _spotterActive: true, _spotterTarget: 'biceps', _spotterFeedback: 'liver', _spotterScore: 2, _spotterTotal: 3,
  _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My reasoning.' } } },
  _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3', _clinicalAtlasConceptId: 'UBERON:0001225',
  _clinicalFtuCellId: 'CL:0000653', _clinicalFtuAtlasId: 'hra-kidney-renal-corpuscle-v1.4',
};
const work = state => clone(Object.fromEntries(Object.keys(savedWork).map(key => [key, state[key]])));
const contextChanges = structureId => [
  ['closed atlas', { _regionalAtlasOpen: null }], ['selected structure', { selectedStructure: 'liver' }],
  ['system', { system: 'skeletal' }], ['view', { view: 'posterior' }], ['level', { complexity: 2 }],
  ['activity', { _activeTab: 'flashcards' }], ['Quiz mode', { quizMode: true }],
  ['step', { _regionalAtlasStep: 0 }], ['flow choice', { _regionalAtlasPlaying: true }],
  ['clinical choice', { _regionalAtlasClinical: true }],
  ['3D choice', { _bodyView3d: true }], ['model focus', { _anatomyModelFocus: true }],
  ['study sheet', { _showStudySheet: true }], ['gallery', { _showAnatomyLens: true }],
  ['raw muscle alias', { selectedStructure: structureId === 'biceps' ? 'quads' : 'biceps', _regionalAtlasOpen: structureId === 'biceps' ? 'quads' : 'biceps' }],
  ['open muscle alias only', { _regionalAtlasOpen: structureId === 'biceps' ? 'quads' : 'biceps' }],
];
const actions = [
  ['step', { _regionalAtlasStep: 3, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['previous', { _regionalAtlasStep: 0, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['next', { _regionalAtlasStep: 2, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
  ['flow', { _regionalAtlasStep: 1, _regionalAtlasPlaying: true, _regionalAtlasClinical: false }],
  ['clinical', { _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: true }],
  ['handoff', { system: 'skeletal', view: 'anterior', complexity: 2, selectedStructure: 'patella', _regionalAtlasOpen: 'patella', _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
];
const guide = (root, structureId) => root.querySelector('[data-anatomy-atlas="' + structureId + '"]');

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, structureId, extra = {}) {
  resetStemLab(); document.body.innerHTML = ''; const tool = loadTool(file, 'anatomy');
  let data = { otherTool: { savedSetting: 'keep' }, anatomy: {
    system: 'muscular', view: 'anterior', complexity: 1, selectedStructure: structureId, _activeTab: 'explore',
    quizMode: false, _bodyView3d: false, _regionalAtlasOpen: structureId, _regionalAtlasStep: 1,
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
    const result = find(tool.render(makeCtx(ctx())), node => node.props?.['data-anatomy-atlas'] === structureId);
    expect(result).not.toBeNull(); return result;
  };
  const control = name => {
    const result = find(atlas(), node => name === 'step'
      ? node.props?.['data-anatomy-muscle-step'] === steps[3][0]
      : name === 'clinical' ? node.props?.['data-anatomy-clinical-toggle'] === 'biceps'
        : node.props?.['data-anatomy-muscle-' + name] === true);
    expect(result).not.toBeNull(); return result;
  };
  const step = index => {
    const result = find(atlas(), node => node.props?.['data-anatomy-muscle-step'] === steps[index][0]);
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

for (const file of paths) for (const structureId of ['biceps', 'quads']) describe('Muscle activation guide: ' + structureId + ': ' + file, () => {
  it.each(steps.map((step, index) => [...step, index]))('selects %s with its authored narrative and one mechanism while preserving paused work', (id, label, narrative, mechanism, index) => {
    const s = session(file, structureId), before = work(s.state());
    s.step(index)(); const atlas = guide(s.mount(), structureId); vi.runAllTimers();
    expect(s.state()).toMatchObject({ _regionalAtlasStep: index, _regionalAtlasPlaying: false, system: 'muscular', view: 'anterior', selectedStructure: structureId, _regionalAtlasOpen: structureId });
    expect(atlas.getAttribute('data-anatomy-atlas-step')).toBe(id);
    const detail = atlas.querySelector('#anatomy-muscle-step-detail'); expect(detail.textContent).toContain(label); expect(detail.textContent).toContain(narrative);
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-muscle-scale]')]; expect(figures).toHaveLength(2);
    expect(atlas.querySelectorAll('.anatomy-mechanism-layer')).toHaveLength(4);
    expect(atlas.querySelectorAll('.anatomy-atlas-route')).toHaveLength(4);
    const active = atlas.querySelectorAll('.anatomy-mechanism-layer.is-active'); expect(active).toHaveLength(1); expect(active[0].getAttribute('data-anatomy-mechanism')).toBe(mechanism);
    expect(atlas.querySelectorAll('.anatomy-atlas-route.is-active')).toHaveLength(1);
    figures.forEach((figure, figureIndex) => {
      const expectedIndices = figureIndex === 0 ? [0, 1, 2] : [3];
      expect([...figure.querySelectorAll('.anatomy-atlas-route')].map(route => route.getAttribute('d'))).toEqual(expectedIndices.map(i => originalRoutes[i]));
      expect([...figure.querySelectorAll('.anatomy-mechanism-layer')].map(layer => layer.getAttribute('data-anatomy-mechanism'))).toEqual(expectedIndices.map(i => steps[i][3]));
      expect(figure.querySelectorAll('.anatomy-mechanism-layer.is-active')).toHaveLength(expectedIndices.includes(index) ? 1 : 0);
    });
    expect(atlas.querySelector('.anatomy-atlas-route.is-active').getAttribute('d')).toBe(originalRoutes[index]);
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' }); expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it.each([false, true])('uses two named scale figures with numbered markers, readable keys and the shared-model scope (clinical=%s)', clinical => {
    const s = session(file, structureId, { _regionalAtlasClinical: clinical }), atlas = guide(s.mount(), structureId);
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-muscle-scale]')];
    expect(figures.map(figure => figure.getAttribute('data-anatomy-muscle-scale'))).toEqual(['activation', 'sarcomere']);
    expect(figures.map(figure => figure.querySelector('svg').getAttribute('viewBox'))).toEqual(['-8 -20 460 390', '426 192 211 178']);
    expect(figures.map(figure => figure.querySelector('h6').textContent)).toEqual(['1. Nerve signal and calcium release', '2. Sarcomere close-up']);
    figures.forEach((figure, index) => {
      const svg = figure.querySelector('svg[role="img"]'), names = (svg.getAttribute('aria-labelledby') || '').trim().split(/\s+/); expect(names).toHaveLength(2);
      names.forEach(id => expect(figure.querySelector('[id="' + id + '"]')?.textContent.trim()).toBeTruthy());
      expect(figure.querySelector('[id="' + figure.getAttribute('aria-labelledby') + '"]')?.textContent.trim()).toBeTruthy();
      const markers = [...svg.querySelectorAll('text')], keys = [...figure.querySelectorAll('figcaption ol li')], labels = index === 0 ? activationKey : sarcomereKey;
      expect(markers).toHaveLength(labels.length); expect(keys).toHaveLength(labels.length);
      markers.forEach((marker, markerIndex) => { expect(marker.textContent.trim()).toBe(String(markerIndex + 1)); expect(keys[markerIndex].textContent).toContain(labels[markerIndex]); });
      expect(svg.querySelectorAll('[data-anatomy-filament]')).toHaveLength(index === 0 ? 0 : 2);
      expect(figure.querySelector('figcaption').closest('svg')).toBeNull();
    });
    expect(atlas.querySelector('[data-anatomy-muscle-orientation]').textContent).toBe('The first illustration follows the signal into a muscle fiber. The close-up shows the sarcomere where filaments slide.');
    expect([...atlas.querySelectorAll('.anatomy-muscle-scale-path li')].map(li => li.textContent.slice(1))).toEqual(['Motor neuron', 'Muscle fiber', 'Sarcomere']);
    if (structureId === 'quads') expect(atlas.querySelector('.anatomy-muscle-intro p').textContent).toBe('Representative skeletal-muscle fiber mechanism, also used by the quadriceps. This is a cellular schematic, not a drawing of the thigh.');
    if (clinical) {
      const overlays = [...atlas.querySelectorAll('[data-anatomy-clinical-overlay="myasthenia_gravis"]')]; expect(overlays).toHaveLength(1);
      expect(overlays[0].closest('figure')).toBe(figures[0]);
      expect([...overlays[0].querySelectorAll('path')].map(node => node.getAttribute('d'))).toEqual(['M228 173 L244 190 M244 173 L228 190', 'M273 173 L289 190 M289 173 L273 190', 'M224 205 C250 214 283 214 315 205']);
      expect(overlays[0].querySelectorAll('text')).toHaveLength(0);
      const panel = atlas.querySelector('[data-anatomy-clinical-panel="myasthenia_gravis"]'); Object.values(clinicalNarrative).forEach(text => expect(panel.textContent).toContain(text));
    } else expect(atlas.querySelector('[data-anatomy-clinical-overlay]')).toBeNull();
  });

  it('isolates charged ion symbols while preserving readable structure and mechanism text', () => {
    const s = session(file, structureId);
    for (let index = 0; index < steps.length; index++) {
      s.step(index)(); const atlas = guide(s.mount(), structureId);
      const key = atlas.querySelector('figure[data-anatomy-muscle-scale="activation"] figcaption li:last-child');
      expect(key.textContent).toContain('Sarcoplasmic reticulum + Ca2+');
      const caption = atlas.querySelector('[data-anatomy-muscle-mechanism-caption] p');
      expect(caption.textContent).toBe(mechanismCaptions[index]);
      const keyIons = [...key.querySelectorAll('bdi')], captionIons = [...caption.querySelectorAll('bdi')];
      expect(keyIons.map(node => node.textContent)).toEqual(['Ca2+']);
      expect(captionIons.map(node => node.textContent)).toEqual(index === 3 ? [] : [index === 1 ? 'Na+' : 'Ca2+']);
      [...keyIons, ...captionIons].forEach(node => { expect(node.getAttribute('dir')).toBe('ltr'); expect(node.style.unicodeBidi).toBe('isolate'); });
    }
  });

  it('uses native controls, pressed state and one polite live detail panel', () => {
    const s = session(file, structureId), atlas = guide(s.mount(), structureId), buttons = [...atlas.querySelectorAll('.anatomy-atlas-steps button')]; expect(buttons).toHaveLength(4);
    expect(atlas.querySelector('.anatomy-atlas-steps').getAttribute('aria-label')).toBe('Muscle activation steps');
    const detail = atlas.querySelector('#anatomy-muscle-step-detail'); expect(detail.getAttribute('role')).toBe('status'); expect(detail.getAttribute('aria-live')).toBe('polite'); expect(detail.getAttribute('aria-atomic')).toBe('true');
    buttons.forEach((button, index) => { expect(button.type).toBe('button'); expect(button.getAttribute('data-anatomy-muscle-step')).toBe(steps[index][0]); expect(button.getAttribute('aria-controls')).toBe(detail.id); expect(button.getAttribute('aria-pressed')).toBe(String(index === 1)); expect(button.textContent).toContain(steps[index][1]); });
    for (const selector of ['[data-anatomy-muscle-flow]', '[data-anatomy-muscle-previous]', '[data-anatomy-muscle-next]', '[data-anatomy-clinical-toggle="biceps"]']) { const button = atlas.querySelector(selector); expect(button?.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent.trim()).toBeTruthy(); }
    expect(atlas.querySelector('[data-anatomy-muscle-flow]').textContent).toBe('Play activation'); expect(atlas.querySelector('[data-anatomy-muscle-flow]').hasAttribute('aria-pressed')).toBe(false);
    expect(atlas.querySelector('.anatomy-muscle-playback').textContent).toBe('Activation paused'); expect(atlas.querySelector('[data-anatomy-clinical-toggle]').getAttribute('aria-pressed')).toBe('false');
    buttons[2].focus(); s.step(2)(); vi.runAllTimers(); expect(document.activeElement).toBe(buttons[2]);
  });

  it('bounds previous and next steps while preserving an explicit pause', () => {
    const s = session(file, structureId), before = work(s.state()); s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0);
    let atlas = guide(s.mount(), structureId); expect(atlas.querySelector('[data-anatomy-muscle-previous]').disabled).toBe(true); expect(atlas.querySelector('[data-anatomy-muscle-next]').disabled).toBe(false);
    for (let index = 1; index < steps.length; index++) { s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(index); }
    atlas = guide(s.mount(), structureId); expect(atlas.querySelector('[data-anatomy-muscle-next]').disabled).toBe(true); expect(atlas.querySelector('[data-anatomy-muscle-previous]').disabled).toBe(false);
    s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(3); s.step(0)(); s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0);
    expect(s.state()._regionalAtlasPlaying).toBe(false); expect(work(s.state())).toEqual(before);
  });

  it('keeps explicit Play and Pause independent of step selection and the clinical lens', () => {
    const s = session(file, structureId), before = work(s.state()); s.action('flow')(); expect(s.state()._regionalAtlasPlaying).toBe(true); s.step(2)(); expect(s.state()._regionalAtlasPlaying).toBe(true);
    s.action('flow')(); expect(s.state()._regionalAtlasPlaying).toBe(false); s.step(3)(); expect(s.state()._regionalAtlasPlaying).toBe(false);
    s.action('clinical')(); expect(s.state()._regionalAtlasClinical).toBe(true); s.action('previous')(); expect(s.state()._regionalAtlasPlaying).toBe(false); s.action('clinical')(); expect(s.state()._regionalAtlasClinical).toBe(false);
    expect(s.state()._regionalAtlasStep).toBe(2); expect(work(s.state())).toEqual(before); const atlas = guide(s.mount(), structureId); expect(atlas.querySelector('[data-anatomy-muscle-flow]').textContent).toBe('Play activation'); expect(atlas.querySelector('.anatomy-muscle-playback').textContent).toBe('Activation paused');
  });

  it.each(actions)('merges newer study work when a deferred %s action is accepted', (name, expected) => {
    const s = session(file, structureId), action = s.action(name); s.defer(); action(); expect(s.announceToSR).not.toHaveBeenCalled();
    const newer = { ...clone(savedWork), _structureNotes: { biceps: 'A newer muscle explanation.', quads: 'New quadriceps explanation.', liver: 'Portal flow.' }, quizScore: 5, quizFeedback: { chosen: 'liver', correct: true }, _flashcardIdx: 0, _spotterScore: 7, _clinicalStudy: { version: 1, cases: { case_1: { draft: 'New clinical reasoning.' } } } };
    s.patch(newer); s.flush(); vi.runAllTimers(); expect(s.state()).toMatchObject(expected); expect(work(s.state())).toEqual(newer); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
  });
  it.each(contextChanges(structureId))('rejects captured actions after the %s changes', (_label, patch) => {
    const s = session(file, structureId), captured = actions.map(([name]) => s.action(name)); s.patch(patch); const before = clone(s.state()); captured.forEach(action => action()); vi.runAllTimers(); expect(s.state()).toEqual(before); expect(s.announceToSR).not.toHaveBeenCalled();
  });
  it.each(contextChanges(structureId))('rejects deferred actions when the %s changes before acceptance', (_label, patch) => {
    const s = session(file, structureId), captured = actions.map(([name]) => s.action(name)); s.defer(); captured.forEach(action => action()); expect(s.announceToSR).not.toHaveBeenCalled(); s.patch(patch); const before = clone(s.state()); s.flush(); vi.runAllTimers(); expect(s.state()).toEqual(before); expect(s.announceToSR).not.toHaveBeenCalled();
  });

  it('resolves each original signal arrow locally and keeps all illustration IDs unique', () => {
    const s = session(file, structureId), atlas = guide(s.mount(), structureId), figures = [...atlas.querySelectorAll('figure[data-anatomy-muscle-scale]')];
    const references = []; figures.forEach(figure => [...figure.querySelectorAll('.anatomy-atlas-route')].forEach(route => {
      const index = Number(route.getAttribute('data-anatomy-muscle-route')), color = ['#7c3aed', '#d97706', '#0284c7', '#dc2626'][index]; expect(route.getAttribute('d')).toBe(originalRoutes[index]); expect(route.getAttribute('stroke')).toBe(color);
      const reference = /^url\(#([^()]+)\)$/.exec(route.getAttribute('marker-end')); expect(reference).not.toBeNull(); references.push(reference[1]);
      const markers = figure.querySelectorAll('marker[id="' + reference[1] + '"]'); expect(markers).toHaveLength(1); expect(atlas.querySelectorAll('[id="' + reference[1] + '"]')).toHaveLength(1);
      expect(markers[0].getAttribute('orient')).toBe('auto-start-reverse'); expect(markers[0].getAttribute('markerUnits')).toBe('userSpaceOnUse'); expect(markers[0].getAttribute('markerWidth')).toBe('9'); expect(markers[0].getAttribute('markerHeight')).toBe('9'); expect(markers[0].querySelector('path').getAttribute('fill')).toBe(color);
      if (index === 3) expect(route.style.strokeWidth).toBe('3');
    })); expect(references).toEqual(['anatomy-arrow-neuron', 'anatomy-arrow-ach', 'anatomy-arrow-calcium', 'anatomy-arrow-contraction']);
    const ids = [...atlas.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    const key = atlas.querySelector('[data-anatomy-visual-key="biceps"]'); expect(key).not.toBeNull(); ['neural signal', 'calcium', 'contraction'].forEach(text => expect(key.textContent).toContain(text)); expect(key.getAttribute('role')).toBe('list'); expect(key.querySelectorAll('[role="listitem"]')).toHaveLength(3);
  });

  it.each(steps.map((step, index) => [step[0], index]))('preserves original tissue geometry, fixed-length filaments and HTML mechanism caption in %s', (_id, index) => {
    const s = session(file, structureId, { _regionalAtlasStep: index }), atlas = guide(s.mount(), structureId), paths = [...atlas.querySelectorAll('path')];
    originalPaths.forEach(d => expect(paths.some(node => node.getAttribute('d') === d), d).toBe(true));
    ['M229 177 L236 188 L243 177', 'M251 181 L258 192 L265 181', 'M274 177 L281 188 L288 177', 'M297 181 L304 192 L311 181', 'M510 274 l-9 -12', 'M530 274 l9 -12', 'M551 274 l-9 -12'].forEach(d => expect(paths.filter(node => node.getAttribute('d') === d)).toHaveLength(1));
    const layers = [...atlas.querySelectorAll('.anatomy-mechanism-layer')]; expect(layers.map(node => node.getAttribute('data-anatomy-mechanism'))).toEqual(steps.map(step => step[3]));
    layers.forEach((node, i) => { expect(node.classList.contains('is-active')).toBe(i === index); expect(node.classList.contains('is-muted')).toBe(i !== index); expect(node.getAttribute('aria-hidden')).toBe('true'); });
    const shortening = atlas.querySelector('[data-anatomy-mechanism="sarcomere-shortening"]'); expect(shortening.tagName.toLowerCase()).toBe('line'); expect(shortening.classList.contains('anatomy-mechanism-layer')).toBe(false); expect(shortening.getAttribute('x1')).toBe(index === 3 ? '482' : '462');
    const filaments = [...atlas.querySelectorAll('[data-anatomy-filament]')]; expect(filaments).toHaveLength(2);
    const coords = index === 3 ? [[482, 547, 258], [581, 516, 291]] : [[462, 527, 258], [601, 536, 291]];
    filaments.forEach((node, i) => { expect(node.closest('figure').getAttribute('data-anatomy-muscle-scale')).toBe('sarcomere'); expect([Number(node.getAttribute('x1')), Number(node.getAttribute('x2')), Number(node.getAttribute('y1'))]).toEqual(coords[i]); expect(Math.abs(Number(node.getAttribute('x2')) - Number(node.getAttribute('x1')))).toBe(65); expect(node.getAttribute('y1')).toBe(node.getAttribute('y2')); expect(node.getAttribute('stroke-width')).toBe('5'); });
    const rightZ = [...atlas.querySelectorAll('figure[data-anatomy-muscle-scale="sarcomere"] line')].find(node => node.getAttribute('stroke') === '#475569' && !node.hasAttribute('data-anatomy-mechanism')); expect(rightZ.getAttribute('x1')).toBe(index === 3 ? '581' : '601'); expect(rightZ.getAttribute('x1')).toBe(rightZ.getAttribute('x2'));
    const caption = atlas.querySelector('[data-anatomy-muscle-mechanism-caption]'); expect(caption.closest('svg')).toBeNull(); expect(caption.textContent).toContain('Activation highlight'); expect(caption.textContent).toContain(mechanismCaptions[index]);
    const source = fs.readFileSync(file, 'utf8'); steps.forEach(([, label, detail]) => { expect(source).toContain(label); expect(source).toContain(detail); }); Object.values(clinicalNarrative).forEach(text => expect(source).toContain(text));
  });

  it('keeps the connected route from muscle activation to joint force visible', () => {
    const s = session(file, structureId), atlas = guide(s.mount(), structureId), handoff = atlas.querySelector('[data-anatomy-pathway-from="biceps"][data-scale-continuation="patella"]'); expect(handoff).not.toBeNull(); expect(handoff.textContent).toContain('connect muscle tension and tendon pull to the changing geometry of a synovial joint.'); expect(handoff.querySelector('button').textContent).toBe('Apply force at a joint');
  });
  it.each([false, true])('opens the visible knee extension step and preserves playback (%s)', playing => {
    const viewed = { liver: true, kidneys: true, epidermis: true }, s = session(file, structureId, { _regionalAtlasPlaying: playing, _regionalAtlasClinical: true, _anatomyLensViewed: viewed, search: 'muscle', _studyFilter: 'bookmarked' }), before = work(s.state());
    const control = guide(s.mount(), structureId).querySelector('[data-anatomy-muscle-handoff]'); expect(control?.tagName).toBe('BUTTON'); expect(control.type).toBe('button'); s.action('handoff')(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ system: 'skeletal', view: 'anterior', complexity: 2, selectedStructure: 'patella', _regionalAtlasOpen: 'patella', _regionalAtlasStep: 1, _regionalAtlasClinical: false, _regionalAtlasPlaying: playing, _activeTab: 'explore', quizMode: false, _bodyView3d: false, _anatomyModelFocus: false, _showStudySheet: false, _showAnatomyLens: false, _anatomyLensEntry: null, search: '', _studyFilter: 'all' });
    expect(s.state()._anatomyLensViewed).toEqual({ ...viewed, patella: true }); expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
    expect(s.announceToSR).toHaveBeenCalledTimes(1); expect(s.announceToSR).toHaveBeenCalledWith('Opening knee extension mechanics, step 2 of 4.'); const target = guide(s.mount(), 'patella'); expect(target).not.toBeNull(); expect(target.getAttribute('data-anatomy-atlas-step')).toBe('knee_extension'); expect(target.classList.contains('is-paused')).toBe(!playing); expect(target.classList.contains('is-clinical')).toBe(false);
  });
  it('merges newest deferred notes and viewed records before opening the knee', () => {
    const s = session(file, structureId, { _regionalAtlasClinical: true, _anatomyLensViewed: { kidneys: true } }), captured = s.action('handoff');
    const newerWork = { ...clone(savedWork), _structureNotes: { biceps: 'Newest muscle explanation.', quads: 'Newest shared muscle explanation.', patella: 'Newest knee explanation.' }, _clinicalStudy: { version: 1, cases: { case_1: { draft: 'Newest clinical reasoning.' } } }, quizScore: 8, _spotterTotal: 9 }, newerViewed = { kidneys: true, liver: true, biceps: true, heart: true };
    s.defer(); captured(); expect(s.announceToSR).not.toHaveBeenCalled(); expect(s.state()._anatomyLensViewed).toEqual({ kidneys: true }); s.patch({ ...newerWork, _anatomyLensViewed: newerViewed }); s.flush(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ complexity: 2, selectedStructure: 'patella', _regionalAtlasOpen: 'patella', _regionalAtlasStep: 1, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }); expect(work(s.state())).toEqual(newerWork); expect(s.state()._anatomyLensViewed).toEqual({ ...newerViewed, patella: true }); expect(s.announceToSR).toHaveBeenCalledTimes(1); expect(s.announceToSR).toHaveBeenCalledWith('Opening knee extension mechanics, step 2 of 4.');
  });
  it('focuses the accepted visible knee destination after its origin is replaced', () => {
    const s = session(file, structureId), origin = guide(s.mount(), structureId).querySelector('[data-anatomy-muscle-handoff]'); origin.focus(); expect(document.activeElement).toBe(origin); s.action('handoff')();
    const target = guide(s.mount(), 'patella'); expect(target).not.toBeNull(); Object.defineProperty(target, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 200 }] }); const focus = vi.spyOn(target, 'focus'); vi.runAllTimers(); expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(document.activeElement).toBe(target);
  });
  it('respects newer input focus while accepted handoff focus is pending', () => {
    const s = session(file, structureId), origin = guide(s.mount(), structureId).querySelector('[data-anatomy-muscle-handoff]'); origin.focus(); s.action('handoff')(); const target = guide(s.mount(), 'patella'); Object.defineProperty(target, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 200 }] }); const focus = vi.spyOn(target, 'focus'), input = document.createElement('input'); document.body.appendChild(input); input.focus(); vi.runAllTimers(); expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input); expect(s.state().selectedStructure).toBe('patella');
  });
  it.each([[-9, steps[0][0]], [50, steps[3][0]], ['invalid', steps[0][0]]])('safely displays restored step %s', (value, expected) => { const s = session(file, structureId, { _regionalAtlasStep: value }); expect(guide(s.mount(), structureId).getAttribute('data-anatomy-atlas-step')).toBe(expected); });
});
