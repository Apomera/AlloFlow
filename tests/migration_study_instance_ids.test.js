import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = new Set();
let tool;
const clone = value => JSON.parse(JSON.stringify(value));
function record(speciesId = 'canada_goose', region = 'head', extra = {}) {
  return { speciesId, region, note: 'My saved ' + region + ' evidence.', bird: 0, yaw: 90, pitch: 10, zoom: 1.2,
    wingStep: 3, paused: true, motionReduced: false, ...extra };
}
function notebook() {
  const first = record(), second = record('arctic_tern', 'tail', { yaw: -60, pitch: 35, wingStep: 7 });
  const firstKey = first.speciesId + ':' + first.region, secondKey = second.speciesId + ':' + second.region;
  return { drafts: { [firstKey]: 'My unsaved revision.', 'canada_goose:primaries': 'My outer feather draft.', 'monarch:whole-wing': 'My butterfly draft.' },
    records: { [firstKey]: first, [secondKey]: second },
    comparison: { firstKey, secondKey, draft: 'My comparison draft.', saved: { firstKey, secondKey, first, second, claim: 'My captured comparison.' } } };
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'canada_goose',
    flightFormation: 'natural', flightSeason: 'fall', flightWind: 0,
    flightStudyRegion: 'head', flightStudyObservationOpen: true, flightShowWingtipPath: false, flightShowAnatomy: true,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, flightStudyBird: 0, flightWingStep: 19,
    flightStudyObservations: notebook(), flightInvestigation: { prediction: 'Keep my flight prediction.', evidence: 'Keep my flight evidence.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge prediction.', notes: 'Keep my explanation.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my energy inquiry.' }, ...seed }, refresh;
  const refs = [], writes = [], award = vi.fn();
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const update = patch => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); };
  const ctx = makeCtx({ React: tracedReact, announceToSR: null, awardXP: award,
    update: (_, key, value) => update({ [key]: value }), updateMulti: (_, patch) => update(patch) });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.add(root);
  function View() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(View)));
  const stage = host.querySelector('[data-migration-id="migration-flight-stage"]');
  expect(stage).not.toBeNull();
  const hostIndex = refs.findIndex(ref => ref.current === stage);
  expect(hostIndex).toBeGreaterThan(-1);
  const engineRef = refs[hostIndex + 1];
  engineRef.current = { host: stage, speciesId: state.flightSpecies, formationMode: state.flightFormation, season: state.flightSeason,
    time: 1.3, wingStepSerial: state.flightWingStep, wingStepPhase: .7, contextLost: false,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'instance-' + stage.id + '-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: { userData: { captured: false, captureVersion: 0 }, clearPose: vi.fn() }, wingtipPath: { invalidate: vi.fn() } };
  stage.setAttribute('data-flight-ready', 'true');
  const ui = { host, stage, refs, writes, award,
    get state() { return state; }, get engine() { return engineRef.current; },
    get deck() { return host.querySelector('.migration-flight-deck'); },
    id(key) { return host.querySelector('[data-migration-id="' + key + '"]'); },
    field() { return ui.id('migration-study-observation-note'); },
    button(selector) { return host.querySelector(selector); },
    click(button) { expect(button).not.toBeNull(); expect(button.disabled).toBe(false); button.focus(); act(() => button.click()); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    unmount() { act(() => root.unmount()); mounts.delete(root); host.remove(); }
  };
  ui.set({}); return ui;
}
function assertOwnReferences(ui) {
  const allIds = [...ui.deck.querySelectorAll('[id]')];
  expect(allIds.length).toBeGreaterThan(4);
  for (const element of allIds) expect(document.querySelectorAll('[id="' + element.id + '"]'), element.id).toHaveLength(1);
  const references = [...ui.deck.querySelectorAll('[aria-controls],[aria-describedby],[aria-labelledby],label[for]')];
  expect(references.length).toBeGreaterThan(0);
  for (const element of references) for (const attribute of ['aria-controls', 'aria-describedby', 'aria-labelledby', 'for']) {
    const value = element.getAttribute(attribute); if (!value) continue;
    for (const id of value.trim().split(/\s+/)) {
      const targets = document.querySelectorAll('[id="' + id + '"]');
      expect(targets, attribute + ': ' + id).toHaveLength(1);
      expect(ui.host.contains(targets[0]), attribute + ' belongs to this instance: ' + id).toBe(true);
    }
  }
  for (const link of ui.deck.querySelectorAll('a[href^="#"]')) {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    expect(target).not.toBeNull(); expect(ui.host.contains(target)).toBe(true);
  }
}
function preservedWork(ui) { return { notebook: ui.state.flightStudyObservations, investigation: ui.state.flightInvestigation,
  challenges: ui.state.flightChallenges, inquiry: ui.state.inquiry }; }
function expectWork(ui, before) {
  expect(ui.state.flightStudyObservations).toBe(before.notebook); expect(ui.state.flightInvestigation).toBe(before.investigation);
  expect(ui.state.flightChallenges).toBe(before.challenges); expect(ui.state.inquiry).toBe(before.inquiry); expect(ui.award).not.toHaveBeenCalled();
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(async () => {
  await act(async () => { mounts.forEach(root => root.unmount()); mounts.clear(); await Promise.resolve(); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Study descriptions and navigation belong to their migration instance', () => {
  it.each([
    ['bird, open notes, paths off', {}],
    ['bird, closed notes, paths off', { flightStudyObservationOpen: false }],
    ['bird, primary feathers and paths on', { flightStudyRegion: 'primaries', flightShowWingtipPath: true }],
    ['bird, different region and anatomy off', { flightStudyRegion: 'tail', flightShowAnatomy: false }],
    ['Monarch with paths on', { flightSpecies: 'monarch', flightStudyRegion: 'tail', flightShowWingtipPath: true, flightShowAnatomy: false }],
    ['Chase with speed vectors', { flightCamera: 'chase', flightShowSpeedVectors: true }],
    ['Aerial without speed vectors', { flightCamera: 'aerial', flightShowSpeedVectors: false }]
  ])('resolves every mounted Study ID reference locally for %s', (_label, seed) => {
    const first = fixture({ flightStudyRegion: 'inner-wing', flightShowWingtipPath: true }), second = fixture(seed);
    assertOwnReferences(first); assertOwnReferences(second);
    expect(first.stage.id).not.toBe(second.stage.id); expect(first.deck.id).not.toBe(second.deck.id);
    expect(first.writes).toEqual([]); expect(second.writes).toEqual([]);
  });

  it('keeps generated IDs stable through settings and camera round-trips', () => {
    const first = fixture(), second = fixture(), keys = ['migration-flight-stage', 'migration-flight-deck', 'migration-study-observation-note', 'migration-study-observation-prompt'];
    const ids = Object.fromEntries(keys.map(key => [key, second.id(key).id]));
    second.set({ flightWind: 4, flightStudyRegion: 'tail' });
    for (const key of keys) expect(second.id(key).id).toBe(ids[key]);
    second.set({ flightCamera: 'chase' }); assertOwnReferences(first); assertOwnReferences(second);
    second.set({ flightCamera: 'study' });
    for (const key of keys) expect(second.id(key).id).toBe(ids[key]);
    assertOwnReferences(first); assertOwnReferences(second);
  });

  it('gives selected and saved matched comparisons distinct help in both tools', () => {
    const first = fixture(), second = fixture(), helpIds = [];
    for (const ui of [first, second]) for (const source of ['selected', 'saved']) {
      const panel = ui.host.querySelector('[data-study-matched-comparison="' + source + '"]');
      expect(panel).not.toBeNull(); const select = panel.querySelector('select');
      const id = select.getAttribute('aria-describedby'), help = document.getElementById(id);
      expect(help).not.toBeNull(); expect(panel.contains(help)).toBe(true); helpIds.push(id);
      expect(help.textContent).toContain('does not establish a biological cause');
      for (const button of panel.querySelectorAll('button')) expect(button.getAttribute('aria-describedby')).toBe(id);
    }
    expect(new Set(helpIds).size).toBe(4);
  });

  it.each(['canada_goose', 'monarch'])('opens and focuses only the %s instance’s existing motion draft', speciesId => {
    const first = fixture(), second = fixture({ flightSpecies: speciesId, flightStudyObservationOpen: false });
    const beforeFirst = clone(first.state), work = preservedWork(second), field = second.field();
    const firstFocus = vi.spyOn(first.field(), 'focus');
    second.click(second.button('[data-study-action="describe-wing-motion"]'));
    expect(document.activeElement).toBe(field); expect(firstFocus).not.toHaveBeenCalled(); expect(first.state).toEqual(beforeFirst);
    expect(field.getAttribute('data-study-observation-key')).toBe(speciesId + ':' + (speciesId === 'monarch' ? 'whole-wing' : 'primaries'));
    expect(field.value).toBe(speciesId === 'monarch' ? 'My butterfly draft.' : 'My outer feather draft.');
    expectWork(second, work);
    expect(second.writes).toEqual([speciesId === 'monarch' ? { flightStudyObservationOpen: true } : { flightStudyObservationOpen: true, flightStudyRegion: 'primaries' }]);
  });

  it('continues its own note with the existing caret, draft and current view', () => {
    const first = fixture(), second = fixture(), work = preservedWork(second), state = second.state;
    const field = second.field(); field.focus(); field.setSelectionRange(3, 11, 'backward'); field.scrollTop = 8;
    const firstFocus = vi.spyOn(first.field(), 'focus');
    second.click(second.button('[data-study-action="inspect-current-view"]')); expect(document.activeElement).toBe(second.stage);
    second.click(second.button('[data-study-scene-action="continue-note"]'));
    expect(document.activeElement).toBe(field); expect(firstFocus).not.toHaveBeenCalled();
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection, field.scrollTop]).toEqual([3, 11, 'backward', 8]);
    expect(field.value).toBe('My unsaved revision.'); expect(second.state).toBe(state); expectWork(second, work);
    expect(second.writes).toEqual([]); expect(first.writes).toEqual([]);
  });

  it('revisits a recorded observation in its own scene and preserves every notebook', () => {
    const first = fixture(), second = fixture(), firstBefore = clone(first.state), work = preservedWork(second);
    const firstFocus = vi.spyOn(first.stage, 'focus');
    second.click(second.button('[data-study-revisit="observation"]'));
    expect(document.activeElement).toBe(second.stage); expect(firstFocus).not.toHaveBeenCalled();
    expect(second.state).toMatchObject({ flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.2, flightWingStep: 3, flightPaused: true });
    expectWork(second, work); expect(first.state).toEqual(firstBefore); expect(first.writes).toEqual([]);
    expect(second.writes).toHaveLength(1);
  });

  it('matched saved-view navigation focuses the owning scene even when the source species changes', () => {
    const first = fixture(), second = fixture(), work = preservedWork(second), beforeFirst = clone(first.state);
    const panel = second.host.querySelector('[data-study-matched-comparison="saved"]');
    second.click(panel.querySelector('[data-study-matched="second"]'));
    expect(document.activeElement).toBe(second.stage); expect(second.state).toMatchObject({ flightSpecies: 'arctic_tern', flightStudyRegion: 'tail', flightPaused: true, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1, flightWingStep: 0 });
    expectWork(second, work); expect(first.state).toEqual(beforeFirst); expect(first.writes).toEqual([]);
  });
});
