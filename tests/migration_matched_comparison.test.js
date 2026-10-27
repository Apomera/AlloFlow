import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool;
const mounts = [];
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function recorded(speciesId = 'canada_goose', region = 'head', values = {}) {
  return { speciesId, region, note: 'A saved shape observation.', bird: 4, yaw: -65, pitch: 30, zoom: 1.45, wingStep: 11, paused: false, motionReduced: false, ...values };
}
function comparison(first = recorded(), second = recorded('arctic_tern', 'tail', { bird: 1, yaw: 175, pitch: -5, zoom: .7, wingStep: 6, paused: true })) {
  return { firstKey: first.speciesId + ':' + first.region, secondKey: second.speciesId + ':' + second.region, first, second, claim: 'Saved evidence from both views.' };
}
function notebook(saved = comparison(), records = { [saved.firstKey]: saved.first, [saved.secondKey]: saved.second }) {
  return { records, drafts: { [saved.firstKey]: 'Unrecorded source revision.' }, comparison: { saved, draft: 'Unrecorded comparison revision.' } };
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightStudyObservationOpen: true, ...seed }, tree, rerender;
  const writes = [], announce = vi.fn();
  const ctx = makeCtx({ announceToSR: announce,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; rerender(); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; rerender(); }
  });
  function Component() {
    const [, force] = React.useState(0);
    rerender = () => force(value => value + 1);
    ctx.toolData = { migration: state };
    tree = tool.render(ctx);
    return tree;
  }
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host);
  React.act(() => root.render(React.createElement(Component)));
  mounts.push({ root, host });
  const ui = {
    host, writes, announce,
    get state() { return state; },
    node(predicate) { return find(tree, predicate); },
    matchedSource() { return state.flightStudyObservations?.comparison?.saved ? 'saved' : 'selected'; },
    matchedPanel() { return host.querySelector('[data-study-matched-comparison="' + ui.matchedSource() + '"]'); },
    action(which) { return ui.matchedPanel()?.querySelector('[data-study-matched="' + which + '"]') || null; },
    click(which) { React.act(() => ui.action(which).click()); },
    select(value) { React.act(() => { const select = ui.matchedPanel().querySelector('[aria-label="Matched comparison view"]'); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }); },
    set(values) { React.act(() => { state = { ...state, ...values }; rerender(); }); },
    status() { return host.querySelector('[data-study-revisit-status]').textContent; }
  };
  return ui;
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  for (const { root, host } of mounts.splice(0)) { React.act(() => root.unmount()); host.remove(); }
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration matched comparison viewing activity', () => {
  it('offers one native view selector and two native actions for a usable observation pair', () => {
    const empty = fixture(); expect(empty.action('first')).toBeNull();
    const ui = fixture({ flightStudyObservations: notebook() });
    const section = ui.matchedPanel();
    expect(section.closest('details').hasAttribute('data-study-comparison')).toBe(true);
    const select = section.querySelector('select');
    expect(select.getAttribute('aria-label')).toBe('Matched comparison view');
    expect(select.getAttribute('aria-describedby')).toBe(ui.host.querySelector('[data-migration-id="migration-study-matched-help-saved"]').id);
    expect([...select.options].map(option => [option.value, option.textContent])).toEqual([['profile', 'Profile'], ['above', 'From above']]);
    expect(select.value).toBe('profile'); expect(select.hasAttribute('role')).toBe(false);
    expect(ui.node(node => node.type === 'select' && node.props['aria-label'] === 'Matched comparison view').props.onKeyDown).toBeUndefined();
    for (const [which, label] of [['first', 'Compare first in matched view'], ['second', 'Compare second in matched view']]) {
      const action = ui.action(which);
      expect(action.tagName).toBe('BUTTON'); expect(action.type).toBe('button'); expect(action.textContent).toBe(label);
      expect(action.getAttribute('aria-describedby')).toBe(ui.host.querySelector('[data-migration-id="migration-study-matched-help-saved"]').id);
      expect(action.hasAttribute('tabindex')).toBe(false); expect(action.hasAttribute('role')).toBe(false);
      expect(ui.node(node => node.props?.['data-study-matched'] === which).props.onKeyDown).toBeUndefined();
    }
    expect(section.textContent).toContain('does not compare physical size');
    expect(section.textContent).toContain('still pose is illustrative');
    expect(section.textContent).toContain('does not establish a biological cause');
    expect(section.textContent).toContain('revise My observation comparison');
    expect(section.querySelectorAll('textarea,input')).toHaveLength(0);
    expect(ui.host.querySelectorAll('[aria-label="My observation comparison"]')).toHaveLength(1);
  });

  it('supports inspecting selected records before writing or recording a comparison and guards changes to those selections', () => {
    const saved = comparison(), third = recorded('sandhill_crane', 'head');
    const book = { records: { [saved.firstKey]: saved.first, [saved.secondKey]: saved.second, 'sandhill_crane:head': third }, comparison: { firstKey: saved.firstKey, secondKey: saved.secondKey, draft: '' } };
    const ui = fixture({ flightStudyObservations: book });
    expect(ui.host.querySelector('[data-study-matched-source]').dataset.studyMatchedSource).toBe('selected');
    expect(ui.host.querySelector('[data-study-saved-comparison]')).toBeNull();
    ui.click('first'); expect(ui.status()).toContain('Matched view: Canada Goose');
    expect(ui.state.flightStudyObservations).toBe(book); expect(book.comparison).not.toHaveProperty('saved'); expect(book.comparison.draft).toBe('');
    ui.set({ flightStudyObservations: { ...book, comparison: { ...book.comparison, firstKey: 'sandhill_crane:head' } } });
    expect(ui.status()).toBe(''); ui.click('first');
    expect(ui.state.flightSpecies).toBe('sandhill_crane'); expect(ui.status()).toContain('Matched view: Sandhill Crane');
    expect(ui.writes.every(patch => !Object.hasOwn(patch, 'flightStudyObservations'))).toBe(true);
  });

  it('restores the first captured source in a fitted still Profile view and preserves every notebook and inquiry draft', () => {
    const book = notebook(), investigation = { prediction: 'Keep this wind evidence.', trials: [] }, challenges = { selected: 'wind', results: {} };
    const ui = fixture({ flightStudyObservations: book, flightInvestigation: investigation, flightChallenges: challenges, flightWind: -9, flightSeason: 'spring', flightFormation: 'natural', flightWingStep: 340 });
    ui.click('first');
    expect(ui.writes).toEqual([{ flightSpecies: 'canada_goose', flightCamera: 'study', flightPaused: true, flightStudyRegion: 'head', flightStudyBird: 4, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1, flightWingStep: 0, flightShowAnatomy: true, flightStudyObservationOpen: true }]);
    expect(ui.state.flightStudyObservations).toBe(book); expect(ui.state.flightInvestigation).toBe(investigation); expect(ui.state.flightChallenges).toBe(challenges);
    expect(ui.state.flightWind).toBe(-9); expect(ui.state.flightSeason).toBe('spring'); expect(ui.state.flightFormation).toBe('natural');
    expect(book.comparison.saved.first).toMatchObject({ yaw: -65, pitch: 30, zoom: 1.45, wingStep: 11 });
    expect(book.comparison.draft).toBe('Unrecorded comparison revision.');
    expect(ui.status()).toContain('Matched view: Canada Goose');
    expect(ui.announce).toHaveBeenLastCalledWith(expect.stringContaining('Paused, fitted view, wing step 0.'));
    expect(document.activeElement?.id).toBe(ui.host.querySelector('[data-migration-id="migration-flight-stage"]').id);
  });

  it('switches captured sources using one selected angle even when current records have different species views and notes', () => {
    const saved = comparison();
    const book = notebook(saved, { [saved.firstKey]: recorded('canada_goose', 'head', { bird: 0, note: 'Newer goose evidence.' }), [saved.secondKey]: recorded('arctic_tern', 'tail', { bird: 0, note: 'Newer tern evidence.' }) });
    const ui = fixture({ flightStudyObservations: book });
    ui.select('above'); expect(ui.writes).toHaveLength(0);
    for (const [which, speciesId, region, bird] of [['first', 'canada_goose', 'head', 4], ['second', 'arctic_tern', 'tail', 1], ['first', 'canada_goose', 'head', 4]]) {
      ui.click(which);
      expect(ui.state).toMatchObject({ flightSpecies: speciesId, flightStudyRegion: region, flightStudyBird: bird, flightStudyYaw: 0, flightStudyPitch: 60, flightStudyZoom: 1, flightWingStep: 0, flightPaused: true });
      expect(ui.host.querySelector('[aria-label="Matched comparison view"]').value).toBe('above');
    }
    expect(ui.writes).toHaveLength(3); expect(ui.state.flightStudyObservations).toBe(book);
    expect(saved.first.note).toBe('A saved shape observation.'); expect(book.records[saved.firstKey].note).toBe('Newer goose evidence.');
    expect(ui.matchedPanel().querySelector('[data-study-matched-source]').dataset.studyMatchedSource).toBe('saved');
  });

  it('keeps both matched actions working after both source records have been removed', () => {
    const saved = comparison(), book = notebook(saved, {}), ui = fixture({ flightStudyObservations: book });
    ui.click('second'); expect(ui.state).toMatchObject({ flightSpecies: 'arctic_tern', flightStudyRegion: 'tail', flightStudyBird: 1, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1, flightWingStep: 0 });
    expect(ui.status()).toContain('Matched view: Arctic Tern');
    ui.click('first'); expect(ui.state.flightStudyBird).toBe(4);
    expect(ui.state.flightStudyObservations).toBe(book); expect(Object.keys(book.records)).toHaveLength(0);
    expect(ui.host.querySelector('[data-study-saved-comparison]').textContent).toContain(saved.claim);
  });

  it('normalizes imported records and excludes malformed comparison sources before offering matched actions', () => {
    const saved = comparison(recorded('canada_goose', 'head', { bird: 999, yaw: {}, pitch: NaN, zoom: 'bad', wingStep: -3 }), recorded('arctic_tern', 'tail'));
    const ui = fixture({ flightFormation: 'solo', flightStudyObservations: notebook(saved, {}) });
    ui.click('first'); expect(ui.state).toMatchObject({ flightStudyBird: 0, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1, flightWingStep: 0 });
    expect(ui.status()).toContain('fewer individuals; showing Individual 1.');
    const bad = fixture({ flightStudyObservations: { comparison: { saved: { ...saved, firstKey: 'constructor:head', first: recorded('constructor', 'head') } } } });
    expect(bad.action('first')).toBeNull(); expect(bad.action('second')).toBeNull();
  });

  it('uses whole-insect regions without bird anatomy while preserving the current device motion preference', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const saved = comparison(recorded(), recorded('monarch', 'whole-wing', { bird: 0, motionReduced: false }));
    const book = notebook(saved, {}), ui = fixture({ flightStudyObservations: book, flightShowAnatomy: true });
    ui.select('above'); ui.click('second');
    expect(ui.state).toMatchObject({ flightSpecies: 'monarch', flightStudyRegion: 'head', flightStudyBird: 0, flightShowAnatomy: false, flightStudyYaw: 0, flightStudyPitch: 60, flightWingStep: 0, flightPaused: true });
    expect(ui.status()).toContain('Whole-insect wing motion'); expect(ui.writes[0]).not.toHaveProperty('reducedMotion');
    expect(ui.writes[0]).not.toHaveProperty('motionReduced'); expect(saved.second.motionReduced).toBe(false);
  });

  it('does not persist selector choices and rejects synthetic values outside its two native options', () => {
    const book = notebook(), ui = fixture({ flightStudyObservations: book });
    const selector = ui.node(node => node.type === 'select' && node.props['aria-label'] === 'Matched comparison view');
    React.act(() => selector.props.onChange({ target: { value: 'constructor' } }));
    expect(ui.host.querySelector('[aria-label="Matched comparison view"]').value).toBe('profile');
    expect(ui.writes).toHaveLength(0); expect(ui.state.flightStudyObservations).toBe(book);
    ui.select('above'); expect(ui.writes).toHaveLength(0);
    ui.click('first'); expect(ui.state.flightStudyPitch).toBe(60);
    expect(Object.keys(ui.state).some(key => /matched/i.test(key))).toBe(false);
  });

  it('keeps ordinary recorded-view revisit settings independent of the matched selector', () => {
    const saved = comparison(), ui = fixture({ flightStudyObservations: notebook(saved) });
    ui.select('above'); ui.click('first');
    React.act(() => ui.host.querySelector('[data-study-revisit="comparison-first"]').click());
    expect(ui.state).toMatchObject({ flightStudyBird: 4, flightStudyYaw: -65, flightStudyPitch: 30, flightStudyZoom: 1.45, flightWingStep: 11, flightPaused: true });
    expect(ui.status()).toContain('Revisited: Canada Goose');
    expect(ui.status()).toContain('Recorded state: Running.');
    expect(ui.host.querySelector('[aria-label="Matched comparison view"]').value).toBe('above');
  });

  for (const changed of [{ flightStudyYaw: 85 }, { flightStudyBird: 0 }, { flightStudyRegion: 'tail' }, { flightStudyZoom: 1.1 }, { flightWingStep: 1 }, { flightPaused: false }, { flightCamera: 'side' }, { flightShowAnatomy: false }]) {
    it('hides transient matched feedback when the actual restored view changes: ' + Object.keys(changed)[0], () => {
      const ui = fixture({ flightStudyObservations: notebook() }); ui.click('first'); expect(ui.status()).toContain('Matched view');
      ui.set(changed); expect(ui.host.querySelector('[data-study-revisit-status]')?.textContent || '').toBe('');
    });
  }

  it('guards feedback by the saved source snapshot and selected matched viewpoint while keeping drafts independent', () => {
    const book = notebook(), ui = fixture({ flightStudyObservations: book });
    ui.click('first'); expect(ui.status()).toContain('Matched view');
    ui.set({ flightStudyObservations: { ...book, comparison: { ...book.comparison, draft: 'Another unsaved claim.' } } });
    expect(ui.status()).toContain('Matched view');
    ui.select('above'); expect(ui.status()).toBe(''); ui.select('profile'); expect(ui.status()).toBe('');
    ui.click('first'); expect(ui.status()).toContain('Matched view');
    ui.set({ flightStudyObservations: { ...book, comparison: { ...book.comparison, saved: { ...book.comparison.saved, first: { ...book.comparison.saved.first, note: 'A replacement saved source.' } } } } });
    expect(ui.status()).toBe('');
  });

  it('cancels an active pointer orbit before a matched action so a late release cannot overwrite it', () => {
    const ui = fixture({ flightStudyObservations: notebook() });
    const stage = ui.host.querySelector("[data-migration-id=\"migration-flight-stage\"]"), canvas = document.createElement('canvas'); stage.append(canvas);
    stage.setAttribute('data-flight-ready', 'true');
    let captured = null;
    stage.setPointerCapture = id => { captured = id; }; stage.hasPointerCapture = id => captured === id; stage.releasePointerCapture = () => { captured = null; };
    const props = ui.node(node => node.props?.["data-migration-id"] === 'migration-flight-stage').props;
    const event = values => ({ pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, target: canvas, currentTarget: stage, preventDefault() {}, ...values });
    React.act(() => { props.onPointerDown(event()); props.onPointerMove(event({ clientX: 220 })); });
    ui.click('second'); React.act(() => props.onPointerUp(event({ clientX: 220 })));
    expect(captured).toBeNull(); expect(stage.hasAttribute('data-study-dragging')).toBe(false);
    expect(ui.writes).toHaveLength(1); expect(ui.state).toMatchObject({ flightSpecies: 'arctic_tern', flightStudyYaw: 90, flightStudyPitch: 10 });
  });
});

const canonical = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
const resetStart = canonical.indexOf('          // Revisit starts a repeatable illustrative pose.');
const resetEnd = canonical.indexOf('          for (var fl = 0;', resetStart);
const applyPoseAndStep = new Function('_f3dStudyRevisitRef', 'species', 'live', 'engineNow', 'migrNum', canonical.slice(resetStart, resetEnd));
function pose(bird = 4, matchPhase = true) { return { speciesId: 'canada_goose', bird, wingStep: 0, yaw: 90, pitch: 10, zoom: 1, matchPhase }; }
function livePose(value) { return { flightCamera: 'study', flightPaused: true, flightStudyBird: value.bird, flightStudyYaw: value.yaw, flightStudyPitch: value.pitch, flightStudyZoom: value.zoom, flightWingStep: value.wingStep }; }
function engine() { return { time: 300, wingStepSerial: 999, wingStepPhase: 1.234, flyers: Array.from({ length: 6 }, (_, index) => ({ userData: { phase: index * .71 } })) }; }
const numeric = (value, fallback, low, high) => Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : fallback;
const wrapped = value => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

describe('Migration matched comparison actual wing-phase reset', () => {
  it('aligns selected individuals to the same absolute wing-cycle phase across repeated backward and cross-species switches', () => {
    expect(resetStart).toBeGreaterThan(0); expect(resetEnd).toBeGreaterThan(resetStart);
    const scene = engine();
    for (const [bird, speciesId] of [[4, 'canada_goose'], [1, 'arctic_tern'], [0, 'monarch'], [4, 'canada_goose']]) {
      scene.time = 121; scene.wingStepSerial = 523; scene.wingStepPhase = 5.9;
      const pending = { ...pose(bird), speciesId }, ref = { current: pending };
      applyPoseAndStep(ref, { id: speciesId }, livePose(pending), scene, numeric);
      expect(scene.time).toBe(0); expect(scene.wingStepSerial).toBe(0); expect(ref.current).toBeNull();
      expect(Math.sin(scene.flyers[bird].userData.phase + scene.wingStepPhase)).toBeCloseTo(0, 12);
      expect(Math.cos(scene.flyers[bird].userData.phase + scene.wingStepPhase)).toBeCloseTo(1, 12);
      const phase = scene.wingStepPhase;
      applyPoseAndStep({ current: null }, { id: speciesId }, livePose(pending), scene, numeric);
      expect(scene.wingStepPhase).toBe(phase);
      applyPoseAndStep({ current: null }, { id: speciesId }, { ...livePose(pending), flightWingStep: 1 }, scene, numeric);
      expect(wrapped(scene.flyers[bird].userData.phase + scene.wingStepPhase)).toBeCloseTo(Math.PI / 4, 12);
    }
  });

  it('leaves ordinary revisit individual offsets intact and cancels stale requests before boot', () => {
    const scene = engine(), ordinary = { ...pose(4, false), wingStep: 3 };
    applyPoseAndStep({ current: ordinary }, { id: ordinary.speciesId }, livePose(ordinary), scene, numeric);
    expect(scene.wingStepPhase).toBe(3 * Math.PI / 4);
    for (const altered of [{ flightStudyYaw: -90 }, { flightCamera: 'chase' }, { flightPaused: false }, { flightStudyBird: 0 }]) {
      const pending = pose(), ref = { current: pending }; scene.time = 19; scene.wingStepSerial = 0; scene.wingStepPhase = .7;
      applyPoseAndStep(ref, { id: 'canada_goose' }, { ...livePose(pending), ...altered }, scene, numeric);
      expect(scene.time).toBe(19); expect(scene.wingStepPhase).toBe(.7); expect(ref.current).toBeNull();
    }
  });
});
