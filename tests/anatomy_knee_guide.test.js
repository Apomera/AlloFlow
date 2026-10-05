// Knee mechanics guide: tissue geometry, movement mechanisms, accessible controls, and saved-work continuity.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const steps = [
  ['knee_architecture', '1. Joint architecture', 'The femur meets the tibia across articular cartilage and two menisci that improve fit, distribute load, and absorb shock. The patella glides in the femoral trochlea.', 'joint-load-distribution'],
  ['knee_extension', '2. Extension', 'Quadriceps force travels through the quadriceps tendon, patella, and patellar tendon to the tibial tuberosity. The patella increases the extensor lever arm.', 'patellar-lever-arm'],
  ['knee_flexion', '3. Flexion', 'Hamstrings pull the tibia posteriorly to flex the knee. Joint surfaces roll and glide while the cruciate ligaments guide motion.', 'tibial-flexion-geometry'],
  ['knee_stability', '4. Stability', 'The ACL limits anterior tibial translation and rotation; the PCL limits posterior translation. Collateral ligaments resist side-to-side stress, while menisci share compressive load.', 'ligament-translation-restraint'],
];
const originalRoutes = [
  'M249 151 C269 129 324 122 374 149 C390 165 385 194 366 207 C329 226 282 218 258 196',
  'M220 28 L226 116 L230 180 C242 205 257 229 275 244',
  'M382 294 C414 263 421 214 405 175 C396 153 383 136 364 124',
  'M289 193 L351 139 M333 191 L292 139 M369 136 C385 160 393 193 408 231',
];
const mechanismCaptions = ['load spreads across cartilage + menisci', 'patella increases lever arm', 'flexed tibia position', 'ligaments limit translation'];
const clinicalNarrative = {
  change: 'A discontinuity interrupts the ligament that restrains anterior tibial translation and rotation.',
  effect: 'The knee may become unstable during pivoting or rapid direction changes.',
};
const clone = value => JSON.parse(JSON.stringify(value));
const savedWork = {
  _structureNotes: { patella: 'My explanation of knee movement and stability.' },
  _structureConfidence: { patella: 'learning' }, _retrievalEvidence: { patella: { attempts: 3, correct: 2 } },
  quizScore: 3, quizIdx: 2, _quizAttempts: 4, quizFeedback: { chosen: 'patella', correct: false },
  _quizQuestion: { token: 'saved-question', index: 2 }, _quizActivityReturn: { token: 'saved-question', index: 2, score: 3 },
  _flashcardDeck: ['patella', 'liver'], _flashcardIdx: 1, _flashcardFlipped: true,
  _spotterActive: true, _spotterTarget: 'patella', _spotterFeedback: 'liver', _spotterScore: 2, _spotterTotal: 3,
  _clinicalStudy: { version: 1, cases: { case_1: { draft: 'My reasoning.' } } },
  _clinicalAtlasPackId: 'hra-kidney-female-left-v1.3', _clinicalAtlasConceptId: 'UBERON:0001225',
  _clinicalFtuCellId: 'CL:0000653', _clinicalFtuAtlasId: 'hra-kidney-renal-corpuscle-v1.4',
};
const work = state => clone(Object.fromEntries(Object.keys(savedWork).map(key => [key, state[key]])));
const contextChanges = [
  ['closed atlas', { _regionalAtlasOpen: null }], ['selected structure', { selectedStructure: 'liver' }],
  ['system', { system: 'muscular' }], ['view', { view: 'posterior' }], ['level', { complexity: 2 }],
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
  ['handoff', { system: 'muscular', view: 'anterior', selectedStructure: 'biceps', _regionalAtlasOpen: 'biceps', _regionalAtlasStep: 3, _regionalAtlasPlaying: false, _regionalAtlasClinical: false }],
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
    system: 'skeletal', view: 'anterior', complexity: 3, selectedStructure: 'patella', _activeTab: 'explore',
    quizMode: false, _bodyView3d: false, _regionalAtlasOpen: 'patella', _regionalAtlasStep: 1,
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
    const result = find(tool.render(makeCtx(ctx())), node => node.props?.['data-anatomy-atlas'] === 'patella');
    expect(result).not.toBeNull(); return result;
  };
  const control = name => {
    const result = find(atlas(), node => name === 'step'
      ? node.props?.['data-anatomy-knee-step'] === steps[3][0]
      : name === 'clinical' ? node.props?.['data-anatomy-clinical-toggle'] === 'patella'
        : node.props?.['data-anatomy-knee-' + name] === true);
    expect(result).not.toBeNull(); return result;
  };
  const step = index => {
    const result = find(atlas(), node => node.props?.['data-anatomy-knee-step'] === steps[index][0]);
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

for (const file of paths) describe('Knee mechanics guide: ' + file, () => {
  it.each(steps.map((step, index) => [...step, index]))('selects %s with its authored narrative and mechanism while preserving paused work', (id, label, narrative, mechanism, index) => {
    const s = session(file), before = work(s.state());
    s.step(index)(); const root = s.mount(); vi.runAllTimers();
    const atlas = root.querySelector('[data-anatomy-atlas="patella"]');
    expect(s.state()).toMatchObject({ _regionalAtlasStep: index, _regionalAtlasPlaying: false,
      system: 'skeletal', view: 'anterior', selectedStructure: 'patella', _regionalAtlasOpen: 'patella' });
    expect(atlas.getAttribute('data-anatomy-atlas-step')).toBe(id);
    const detail = atlas.querySelector('#anatomy-knee-step-detail');
    expect(detail.textContent).toContain(label); expect(detail.textContent).toContain(narrative);
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-knee-scale]')];
    expect(figures).toHaveLength(2);
    expect(atlas.querySelectorAll('[data-anatomy-mechanism]')).toHaveLength(8);
    expect(atlas.querySelectorAll('.anatomy-atlas-route')).toHaveLength(8);
    expect(atlas.querySelectorAll('.anatomy-atlas-route.is-active')).toHaveLength(2);
    figures.forEach(figure => {
      expect(figure.querySelectorAll('[data-anatomy-mechanism]')).toHaveLength(4);
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
    const atlas = root.querySelector('[data-anatomy-atlas="patella"]');
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-knee-scale]')];
    expect(figures.map(figure => figure.getAttribute('data-anatomy-knee-scale'))).toEqual(['overview', 'support']);
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
    const overviewKey = figures[0].querySelector('figcaption').textContent;
    ['Femur', 'Patella', 'Tibia', 'Fibula'].forEach(term => expect(overviewKey).toContain(term));
    expect(figures[0].querySelectorAll('figcaption ol li')).toHaveLength(4);
    const supportKey = figures[1].querySelector('figcaption').textContent;
    ['Quadriceps tendon', 'Patellar tendon', 'Articular cartilage', 'Meniscus', 'ACL', 'PCL', 'Collateral ligament'].forEach(term => expect(supportKey).toContain(term));
    expect(figures[1].querySelectorAll('figcaption ol li')).toHaveLength(7);
    expect(atlas.querySelector('[data-anatomy-knee-orientation]').textContent).toBe('This lateral cutaway shows the patella to the left of the femur and tibia.');
    if (clinical) {
      const overlays = [...atlas.querySelectorAll('[data-anatomy-clinical-overlay="acl_tear"]')];
      expect(overlays).toHaveLength(2);
      overlays.forEach(overlay => {
        expect([...overlay.querySelectorAll('path')].map(path => path.getAttribute('d'))).toEqual([
          'M289 193 L312 173 M327 160 L351 139', 'M313 164 L326 176 M326 164 L313 176',
        ]);
        expect(overlay.querySelectorAll('text')).toHaveLength(0);
      });
      const clinicalPanel = atlas.querySelector('[data-anatomy-clinical-panel="acl_tear"]');
      expect(clinicalPanel.textContent).toContain(clinicalNarrative.change);
      expect(clinicalPanel.textContent).toContain(clinicalNarrative.effect);
    }
  });

  it('uses native buttons, pressed state and a shared live detail panel', () => {
    const s = session(file), root = s.mount(), atlas = root.querySelector('[data-anatomy-atlas="patella"]');
    const buttons = [...atlas.querySelectorAll('.anatomy-atlas-steps button')]; expect(buttons).toHaveLength(4);
    const detail = atlas.querySelector('#anatomy-knee-step-detail');
    expect(detail.getAttribute('role')).toBe('status'); expect(detail.getAttribute('aria-live')).toBe('polite');
    expect(detail.getAttribute('aria-atomic')).toBe('true');
    buttons.forEach((button, index) => {
      expect(button.type).toBe('button'); expect(button.getAttribute('data-anatomy-knee-step')).toBe(steps[index][0]);
      expect(button.getAttribute('aria-controls')).toBe(detail.id);
      expect(button.getAttribute('aria-pressed')).toBe(String(index === 1));
      expect(button.textContent).toContain(steps[index][1]);
    });
    for (const selector of ['[data-anatomy-knee-flow]', '[data-anatomy-knee-previous]', '[data-anatomy-knee-next]', '[data-anatomy-clinical-toggle="patella"]']) {
      const button = atlas.querySelector(selector); expect(button?.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
      expect(button.textContent.trim()).toBeTruthy();
    }
    expect(atlas.querySelector('[data-anatomy-knee-flow]').textContent).toMatch(/play/i);
    expect(atlas.querySelector('[data-anatomy-knee-flow]').hasAttribute('aria-pressed')).toBe(false);
    expect(atlas.querySelector('.anatomy-knee-playback').textContent).toMatch(/paused/i);
    expect(atlas.querySelector('[data-anatomy-clinical-toggle="patella"]').getAttribute('aria-pressed')).toBe('false');
    buttons[2].focus(); s.step(2)(); vi.runAllTimers(); expect(document.activeElement).toBe(buttons[2]);
  });

  it('moves through bounded previous and next steps and keeps an explicit pause', () => {
    const s = session(file), before = work(s.state());
    s.action('previous')(); expect(s.state()._regionalAtlasStep).toBe(0);
    let root = s.mount(); expect(root.querySelector('[data-anatomy-knee-previous]').disabled).toBe(true);
    expect(root.querySelector('[data-anatomy-knee-next]').disabled).toBe(false);
    for (let index = 1; index < steps.length; index++) { s.action('next')(); expect(s.state()._regionalAtlasStep).toBe(index); }
    root = s.mount(); expect(root.querySelector('[data-anatomy-knee-next]').disabled).toBe(true);
    expect(root.querySelector('[data-anatomy-knee-previous]').disabled).toBe(false);
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
    const flow = s.mount().querySelector('[data-anatomy-knee-flow]');
    expect(flow.textContent).toMatch(/play/i);
    expect(s.mount().querySelector('.anatomy-knee-playback').textContent).toMatch(/paused/i);
  });

  it.each(actions)('merges newer learning work when a deferred %s action is accepted', (name, expected) => {
    const s = session(file), action = s.action(name); s.defer(); action();
    expect(s.announceToSR).not.toHaveBeenCalled();
    const newer = { ...clone(savedWork), _structureNotes: { patella: 'A newer explanation.', liver: 'Portal flow.' },
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


  it('resolves each movement arrow within its own figure and keeps all IDs unique', () => {
    const s = session(file), atlas = s.mount().querySelector('[data-anatomy-atlas="patella"]');
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-knee-scale]')];
    const references = [];
    figures.forEach(figure => {
      [...figure.querySelectorAll('.anatomy-atlas-route')].forEach((route, index) => {
        expect(route.getAttribute('d')).toBe(originalRoutes[index]);
        const color = ['#64748b', '#dc2626', '#7c3aed', '#059669'][index]; expect(route.getAttribute('stroke')).toBe(color);
        const reference = /^url\(#([^()]+)\)$/.exec(route.getAttribute('marker-end')); expect(reference).not.toBeNull();
        references.push(reference[1]);
        const markers = figure.querySelectorAll('marker[id="' + reference[1] + '"]'); expect(markers).toHaveLength(1);
        expect(atlas.querySelectorAll('[id="' + reference[1] + '"]')).toHaveLength(1);
        expect(markers[0].getAttribute('orient')).toBe('auto-start-reverse');
        expect(markers[0].querySelector('path').getAttribute('fill')).toBe(color);
      });
    });
    expect(new Set(references).size).toBe(8);
    const ids = [...atlas.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    const key = atlas.querySelector('[data-anatomy-visual-key="patella"]'); expect(key).not.toBeNull();
    ['bone', 'cartilage / meniscus', 'force / motion'].forEach(label => expect(key.textContent).toContain(label));
  });

  it.each(steps.map((step, index) => [step[0], index]))('preserves original tissue geometry and readable movement captions in %s', (_id, index) => {
    const s = session(file, { _regionalAtlasStep: index }), atlas = s.mount().querySelector('[data-anatomy-atlas="patella"]');
    const figures = [...atlas.querySelectorAll('figure[data-anatomy-knee-scale]')];
    const originalPaths = [
  "M 0 0 L 10 5 L 0 10 z",
  "M277 20 L277 112 C265 124 256 139 258 154 C260 173 277 180 299 174 C313 170 326 169 342 175 C365 184 386 173 389 154 C392 134 374 119 356 109 L356 20 Z",
  "M270 158 C284 168 300 165 315 160 C333 154 354 168 376 159",
  "M266 193 C284 180 306 184 321 192 C338 182 360 180 384 194 L381 216 L281 215 Z",
  "M281 215 L289 338 L358 338 L376 215 Z",
  "M394 214 C408 208 422 220 423 239 L427 338 L398 338 L397 252 C395 237 386 226 394 214 Z",
  "M270 187 C286 177 304 178 319 187 C306 196 287 199 270 194 Z",
  "M324 187 C344 177 363 179 382 190 C365 198 345 199 326 194 Z",
  "M289 193 L351 139",
  "M333 191 L292 139",
  "M369 136 C385 160 393 193 408 231",
  "M220 22 C219 64 220 96 226 120",
  "M234 181 C244 201 256 222 275 244",
  "M305 70 L305 128 M344 70 L344 128",
  "M277 185 C295 179 307 180 319 187 M326 187 C344 179 361 181 378 190",
  "M176 116 C190 85 214 65 242 57",
  "M333 205 C365 222 398 246 430 285",
  "M349 209 C385 224 416 247 442 278",
  "M286 225 L318 225 M366 225 L334 225"
];
    figures.forEach(figure => {
      const paths = [...figure.querySelectorAll('path')];
      originalPaths.forEach(d => expect(paths.some(node => node.getAttribute('d') === d), d).toBe(true));
      for (const [d, width] of [
        ['M289 193 L351 139', index === 3 ? 9 : 6], ['M333 191 L292 139', index === 3 ? 9 : 6],
        ['M369 136 C385 160 393 193 408 231', index === 3 ? 8 : 5],
        ['M220 22 C219 64 220 96 226 120', index === 1 ? 11 : 7], ['M234 181 C244 201 256 222 275 244', index === 1 ? 11 : 7],
      ]) expect(paths.find(node => node.getAttribute('d') === d).getAttribute('stroke-width')).toBe(String(width));
      const patella = figure.querySelector('ellipse'); expect(patella.getAttribute('cx')).toBe('230'); expect(patella.getAttribute('cy')).toBe('150');
      expect(patella.getAttribute('rx')).toBe('24'); expect(patella.getAttribute('ry')).toBe('34'); expect(patella.getAttribute('transform')).toBe('rotate(-12 230 150)');
      const mechanisms = [...figure.querySelectorAll('[data-anatomy-mechanism]')]; expect(mechanisms.map(node => node.getAttribute('data-anatomy-mechanism'))).toEqual(steps.map(step => step[3]));
      mechanisms.forEach((node, mechanismIndex) => { expect(node.classList.contains('is-active')).toBe(mechanismIndex === index); expect(node.classList.contains('is-muted')).toBe(mechanismIndex !== index); expect(node.getAttribute('aria-hidden')).toBe('true'); });
    });
    const caption = atlas.querySelector('[data-anatomy-knee-mechanism-caption]'); expect(caption.closest('svg')).toBeNull();
    expect(caption.textContent).toContain('Movement highlight'); expect(caption.textContent).toContain(mechanismCaptions[index]);
    const source = fs.readFileSync(file, 'utf8'); steps.forEach(([, label, detail]) => { expect(source).toContain(label); expect(source).toContain(detail); });
    Object.values(clinicalNarrative).forEach(detail => expect(source).toContain(detail));
  });

  it('keeps the connected route to skeletal muscle contraction visible', () => {
    const s = session(file), atlas = s.mount().querySelector('[data-anatomy-atlas="patella"]');
    const handoff = atlas.querySelector('[data-anatomy-pathway-from="patella"][data-scale-continuation="biceps"]');
    expect(handoff).not.toBeNull();
    expect(handoff.textContent).toContain('use the neuromuscular model to see how skeletal muscle generates force that crosses a joint.');
    expect(handoff.querySelector('button').textContent).toBe('Trace muscle force');
  });


  it.each([false, true])('opens skeletal muscle contraction and preserves the playback preference (%s)', playing => {
    const viewed = { liver: true, kidneys: true, epidermis: true };
    const s = session(file, { _regionalAtlasPlaying: playing, _regionalAtlasClinical: true, _anatomyLensViewed: viewed, search: 'knee', _studyFilter: 'bookmarked' });
    const before = work(s.state()), control = s.mount().querySelector('[data-anatomy-knee-handoff]');
    expect(control?.tagName).toBe('BUTTON'); expect(control.type).toBe('button'); expect(control.textContent).toBe('Trace muscle force');
    s.action('handoff')(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ system: 'muscular', view: 'anterior', complexity: 3, selectedStructure: 'biceps',
      _regionalAtlasOpen: 'biceps', _regionalAtlasStep: 3, _regionalAtlasClinical: false, _regionalAtlasPlaying: playing,
      _activeTab: 'explore', quizMode: false, _bodyView3d: false, _anatomyModelFocus: false,
      _showStudySheet: false, _showAnatomyLens: false, _anatomyLensEntry: null, search: '', _studyFilter: 'all' });
    expect(s.state()._anatomyLensViewed).toEqual({ ...viewed, biceps: true });
    expect(work(s.state())).toEqual(before); expect(s.data().otherTool).toEqual({ savedSetting: 'keep' });
    expect(s.announceToSR).toHaveBeenCalledTimes(1);
    expect(s.announceToSR).toHaveBeenCalledWith('Opening skeletal muscle contraction, step 4 of 4.');
    const destination = s.mount().querySelector('[data-anatomy-atlas="biceps"]'); expect(destination).not.toBeNull();
    expect(destination.classList.contains('is-paused')).toBe(!playing); expect(destination.classList.contains('is-clinical')).toBe(false);
  });

  it('marks the muscle model viewed after acceptance and preserves newer deferred notes and viewed records', () => {
    const s = session(file, { _regionalAtlasClinical: true, _anatomyLensViewed: { kidneys: true } }), captured = s.action('handoff');
    const newerWork = { ...clone(savedWork), _structureNotes: { patella: 'New knee movement explanation.', biceps: 'New muscle contraction explanation.' },
      _clinicalStudy: { version: 1, cases: { case_1: { draft: 'Newest clinical reasoning.' } } }, quizScore: 8, _spotterTotal: 9 };
    const newerViewed = { kidneys: true, liver: true, patella: true, heart: true };
    s.defer(); captured(); expect(s.announceToSR).not.toHaveBeenCalled();
    expect(s.state()._anatomyLensViewed).toEqual({ kidneys: true });
    s.patch({ ...newerWork, _anatomyLensViewed: newerViewed }); s.flush(); vi.runAllTimers();
    expect(s.state()).toMatchObject({ selectedStructure: 'biceps', _regionalAtlasOpen: 'biceps', _regionalAtlasStep: 3, _regionalAtlasPlaying: false, _regionalAtlasClinical: false });
    expect(work(s.state())).toEqual(newerWork); expect(s.state()._anatomyLensViewed).toEqual({ ...newerViewed, biceps: true });
    expect(s.announceToSR).toHaveBeenCalledTimes(1);
    expect(s.announceToSR).toHaveBeenCalledWith('Opening skeletal muscle contraction, step 4 of 4.');
  });

  it('focuses the accepted visible biceps destination after the originating control is replaced', () => {
    const s = session(file), origin = s.mount().querySelector('[data-anatomy-knee-handoff]'); origin.focus();
    expect(document.activeElement).toBe(origin); s.action('handoff')();
    const target = s.mount().querySelector('[data-anatomy-atlas="biceps"]'); expect(target).not.toBeNull();
    Object.defineProperty(target, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 200 }] });
    const focus = vi.spyOn(target, 'focus'); vi.runAllTimers();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true }); expect(document.activeElement).toBe(target);
  });

  it('keeps the learner’s newer input focus when accepted handoff focus is pending', () => {
    const s = session(file), origin = s.mount().querySelector('[data-anatomy-knee-handoff]'); origin.focus();
    s.action('handoff')(); const target = s.mount().querySelector('[data-anatomy-atlas="biceps"]');
    Object.defineProperty(target, 'getClientRects', { configurable: true, value: () => [{ width: 300, height: 200 }] });
    const focus = vi.spyOn(target, 'focus'), input = document.createElement('input'); document.body.appendChild(input); input.focus();
    vi.runAllTimers(); expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input);
    expect(s.state().selectedStructure).toBe('biceps');
  });

  it.each([[-9, steps[0][0]], [50, steps[3][0]], ['invalid', steps[0][0]]])('safely displays restored step %s', (value, expected) => {
    const s = session(file, { _regionalAtlasStep: value }), root = s.mount();
    expect(root.querySelector('[data-anatomy-atlas="patella"]').getAttribute('data-anatomy-atlas-step')).toBe(expected);
  });
});
