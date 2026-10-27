import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_ADJACENT_CYCLE_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing adjacent-cycle source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { adjacent: migrationStudyAdjacentCycleTarget, select: selectMigrationStudyCyclePosition };')(num);
const { act } = React, mounts = [];
let tool;
const props = node => node[Object.keys(node).find(key => key.startsWith('__reactProps$'))];
function makeEngine(host, speciesId = 'sandhill_crane') {
  host.setAttribute('data-flight-ready', 'true');
  return { host, speciesId, formationMode: 'natural', season: 'fall', time: 1.3, wingStepSerial: 19, wingStepPhase: .7,
    contextLost: false, flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'adjacent-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: { userData: { captured: false, captureVersion: 0 }, clearPose: vi.fn() }, wingtipPath: { invalidate: vi.fn() } };
}
function pure(index = 2) {
  const host = document.createElement('div'); document.body.append(host);
  const engine = makeEngine(host), live = { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: 'sandhill_crane', flightFormation: 'natural', flightSeason: 'fall', flightShowWingtipPath: true,
    flightStudyBird: 0, flightWingStep: 19 };
  const selection = helpers.select(engine, live, index);
  return { host, engine, live, selection };
}
async function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'sandhill_crane',
    flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.2, flightStudyBird: 0, flightWingStep: 19,
    flightShowAnatomy: true, flightShowWingtipPath: true, flightStudyRegion: 'inner-wing',
    flightStudyObservationOpen: true, ...seed }, refresh;
  const refs = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const write = patch => {
    writes.push(patch);
    if ((options.delayPause && 'flightPaused' in patch) || (options.delayStep && 'flightWingStep' in patch)) { queued.push(patch); return; }
    state = { ...state, ...patch }; refresh(n => n + 1);
  };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce,
    update: (_, key, value) => write({ [key]: value }), updateMulti: (_, patch) => write(patch) });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1], engine = makeEngine(stage, state.flightSpecies);
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    strip: () => host.querySelector('[data-scene-study-actions]'),
    action: direction => host.querySelector('[data-scene-study-action="' + direction + '"]'),
    note: () => host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"),
    cycle: () => host.querySelector('[data-scene-study-cycle]'),
    button: text => [...host.querySelectorAll('button')].find(button => button.textContent === text),
    click(direction) { act(() => { ui.action(direction).focus(); ui.action(direction).click(); }); },
    choose(index) { act(() => host.querySelector('[data-study-cycle-position="' + index + '"]').click()); },
    follow(side) { act(() => host.querySelector('[data-wingtip-follow-side="' + side + '"]').click()); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    flushOne() { act(() => { state = { ...state, ...queued.shift() }; refresh(n => n + 1); }); }
  };
  await act(async () => { engineRef.current = options.deferReady ? null : engine;
    stage.setAttribute('data-flight-ready', options.deferReady ? 'false' : 'true');
    state = { ...state }; refresh(n => n + 1); await Promise.resolve(); });
  return ui;
}
function authored(speciesId = 'sandhill_crane', region = 'inner-wing') { return {
  flightStudyObservations: { drafts: { [speciesId + ':' + region]: 'My prediction and evidence stay my own.' }, records: {}, comparison: { draft: 'My comparison.' } },
  flightInvestigation: { prediction: 'My wind prediction.', trials: [], evidence: 'My wind evidence.' },
  flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'My challenge.', notes: 'My reasoning.', attempts: [] } } },
  inquiry: { hypothesis: 'My hypothesis.' }, aiExplorerText: 'My research.'
}; }
function fixed(ui) { return { time: ui.engine.time, serial: ui.engine.wingStepSerial,
  sources: ui.engine.flyers.map(bird => bird.uuid), bodies: ui.engine.flyers.map(bird => [bird.position.y, bird.rotation.z]),
  mark: JSON.stringify(ui.engine.markedWingPose.userData), view: [ui.live.flightStudyYaw, ui.live.flightStudyPitch, ui.live.flightStudyZoom],
  side: [ui.live.flightWingtipFollowSide, ui.live.flightWingtipFollowSourceUuid], region: ui.live.flightStudyRegion, step: ui.live.flightWingStep };
}
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(() => { act(() => mounts.splice(0).forEach(root => root.unmount())); window.dispatchEvent(new Event('blur')); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Adjacent cycle positions are explicit reversible model observations', () => {
  it.each(Array.from({ length: 8 }, (_, i) => [-1, 1].map(direction => [i, direction])).flat())('maps position %s in direction %s without mutating the experiment', (index, direction) => {
    const f = pure(index), before = JSON.stringify([f.live, f.selection, f.engine.wingStepPhase, f.engine.wingStepSerial]);
    expect(helpers.adjacent(f.engine, f.live, f.selection, direction)).toBe((index + direction + 8) % 8);
    expect(JSON.stringify([f.live, f.selection, f.engine.wingStepPhase, f.engine.wingStepSerial])).toBe(before);
  });
  it.each([0, 2, -2, .5, '1', null, undefined, NaN])('rejects non-unit direction %s', direction => {
    const f = pure(); expect(helpers.adjacent(f.engine, f.live, f.selection, direction)).toBeNull();
  });
  it.each([
    ['missing selection', f => { f.selection = null; }],
    ['marked return', f => { f.selection.kind = 'marked-return'; }],
    ['hidden paths', f => { f.live.flightShowWingtipPath = false; }],
    ['resumed playback', f => { f.live.flightPaused = false; }],
    ['new manual step', f => { f.live.flightWingStep++; }],
    ['new source', f => { f.engine.flyers[0].uuid = 'replacement'; }],
    ['new time', f => { f.engine.time += .1; }],
    ['context loss', f => { f.engine.contextLost = true; }],
    ['not ready', f => { f.host.setAttribute('data-flight-ready', 'false'); }],
    ['detached scene', f => { f.host.remove(); }]
  ])('rejects %s before computing an adjacent target', (_, change) => {
    const f = pure(); change(f); expect(helpers.adjacent(f.engine, f.live, f.selection, 1)).toBeNull();
    expect(helpers.adjacent(f.engine, f.live, f.selection, -1)).toBeNull();
  });
});

describe('Scene-adjacent cycle navigation', () => {
  it('provides named native 44px controls and a prediction prompt without inventing a selected pose', async () => {
    const ui = await fixture(); expect(ui.strip().previousElementSibling).toBe(ui.stage);
    for (const [direction, label] of [['previous', 'Previous cycle position'], ['next', 'Next cycle position']]) {
      const button = ui.action(direction); expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
      expect(button.textContent).toBe(label); expect(button.disabled).toBe(true); expect(getComputedStyle(button).minHeight).toBe('44px');
      expect(button.getAttribute('aria-controls')).toBe(ui.host.querySelector('[data-migration-id="migration-flight-stage"]').id); expect(button.getAttribute('aria-describedby')).toBe(ui.host.querySelector('[data-migration-id="migration-study-adjacent-help"]').id);
    }
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-adjacent-help\"]").textContent).toContain('Predict');
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-adjacent-help\"]").textContent).toContain('not measured flight times');
    expect(ui.writes).toEqual([]); expect(ui.cycle().getAttribute('data-scene-study-cycle')).toBe('none');
  });
  it('wraps 8 to 1 and back while preserving the complete learner experiment and textarea identity', async () => {
    const ui = await fixture(authored()); ui.follow(1); ui.choose(7);
    const note = ui.note(), before = JSON.stringify(ui.state), frozen = fixed(ui), phase = ui.engine.wingStepPhase;
    note.focus(); note.setSelectionRange(3, 15); ui.writes.length = 0;
    ui.click('next'); expect(ui.live.flightStudyCyclePosition).toBe(0); expect(ui.cycle().textContent).toBe('Cycle 1/8 selected');
    expect(ui.host.querySelector('[data-study-cycle-position="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(ui.engine.wingStepPhase).not.toBe(phase); expect(fixed(ui)).toEqual(frozen); expect(JSON.stringify(ui.state)).toBe(before);
    expect(document.activeElement).toBe(ui.action('next')); expect(ui.note()).toBe(note); expect(note.value).toBe('My prediction and evidence stay my own.');
    expect([note.selectionStart, note.selectionEnd]).toEqual([3, 15]);
    ui.click('previous'); expect(ui.live.flightStudyCyclePosition).toBe(7); expect(ui.engine.wingStepPhase).toBe(phase);
    expect(fixed(ui)).toEqual(frozen); expect(JSON.stringify(ui.state)).toBe(before); expect(ui.writes).toEqual([{ flightPaused: true }, { flightPaused: true }]);
    expect(ui.engine.markedWingPose.clearPose).not.toHaveBeenCalled(); expect(ui.engine.wingtipPath.invalidate).not.toHaveBeenCalled();
  });
  it('reads the latest explicit selection through retained rapid clicks and delayed pause acknowledgements', async () => {
    const ui = await fixture({ ...authored(), flightPaused: false }, { delayPause: true }); ui.choose(7);
    const button = ui.action('next'), retained = props(button).onClick, previous = props(ui.action('previous')).onClick;
    act(() => { retained({ currentTarget: button }); retained({ currentTarget: button }); previous({ currentTarget: ui.action('previous') }); });
    expect(ui.live.flightStudyCyclePosition).toBe(0); expect(ui.state.flightPaused).toBe(false); expect(ui.live.flightPaused).toBe(true);
    expect(ui.queued).toHaveLength(4);
    while (ui.queued.length) { ui.flushOne(); expect(ui.live.flightStudyCyclePosition).toBe(0); expect(ui.action('next').disabled).toBe(false); }
    expect(ui.state.flightStudyObservations).toEqual(authored().flightStudyObservations);
  });
  it('consumes a pending manual Step before adjacent choices and preserves its serial on later acknowledgement', async () => {
    const ui = await fixture(authored(), { delayStep: true }); act(() => ui.button('Step wingbeat').click());
    expect(ui.state.flightWingStep).toBe(19); expect(ui.live.flightWingStep).toBe(20); ui.choose(2); ui.click('next'); ui.click('next');
    const phase = ui.engine.wingStepPhase; expect(ui.live.flightStudyCyclePosition).toBe(4); expect(ui.engine.wingStepSerial).toBe(20);
    ui.set({ flightWind: -5 }); expect(ui.live.flightStudyCyclePosition).toBe(4); ui.flushOne();
    expect(ui.state.flightWingStep).toBe(20); expect(ui.live.flightStudyCyclePosition).toBe(4); expect(ui.engine.wingStepPhase).toBe(phase);
    expect(ui.state.flightStudyObservations).toEqual(authored().flightStudyObservations);
  });
  it.each(['monarch', 'sandhill_crane'])('navigates %s with its correct observation region and preserved followed side', async speciesId => {
    const region = speciesId === 'monarch' ? 'whole-wing' : 'primaries';
    const ui = await fixture({ flightSpecies: speciesId, flightStudyRegion: region, ...authored(speciesId, region) });
    ui.follow(0); ui.choose(0); ui.click('previous'); expect(ui.live.flightStudyCyclePosition).toBe(7); expect(ui.live.flightWingtipFollowSide).toBe(0);
    expect(ui.live.flightStudyRegion).toBe(speciesId === 'monarch' ? '' : region);
    expect(ui.strip().querySelector('[data-scene-study-region]').getAttribute('data-scene-study-region')).toBe(region);
    expect(ui.note().value).toBe('My prediction and evidence stay my own.');
    if (speciesId === 'monarch') expect(ui.strip().querySelector('[data-scene-study-region]').textContent).toBe('Whole-insect wing motion');
  });
  it('hides cycle navigation with paths off and removes it outside Study', async () => {
    const ui = await fixture(); ui.choose(2); ui.set({ flightShowWingtipPath: false });
    expect(ui.action('previous')).toBeNull(); expect(ui.action('next')).toBeNull();
    ui.set({ flightShowWingtipPath: true }); expect(ui.action('previous').disabled).toBe(true); expect(ui.action('next').disabled).toBe(true);
    ui.set({ flightCamera: 'chase' }); expect(ui.strip()).toBeNull();
  });
  it('requires a fresh numbered choice after late scene bootstrap', async () => {
    const ui = await fixture(authored(), { deferReady: true }); const note = ui.note(); note.focus(); ui.writes.length = 0;
    expect(ui.action('next').disabled).toBe(true);
    await act(async () => { ui.engineRef.current = ui.engine; ui.stage.setAttribute('data-flight-ready', 'true'); await Promise.resolve(); });
    expect(ui.action('next').disabled).toBe(true); expect(ui.note()).toBe(note); expect(document.activeElement).toBe(note); expect(ui.writes).toEqual([]);
    ui.choose(0); expect(ui.action('next').disabled).toBe(false); ui.click('next'); expect(ui.live.flightStudyCyclePosition).toBe(1);
  });
  it.each([
    ['path hidden', ui => { ui.live.flightShowWingtipPath = false; }],
    ['resumed playback', ui => { ui.live.flightPaused = false; }],
    ['context loss', ui => { ui.engine.contextLost = true; }],
    ['source replaced', ui => { ui.engine.flyers[0].uuid = 'new-bird'; }],
    ['time advanced', ui => { ui.engine.time += 1; }],
    ['different camera', ui => { ui.live.flightCamera = 'chase'; }],
    ['detached strip', ui => { ui.strip().remove(); }],
    ['moved button', ui => { ui.host.append(ui.action('next')); }]
  ])('a retained handler cannot advance after %s', async (_, change) => {
    const ui = await fixture(authored()); ui.choose(2); const button = ui.action('next'), retained = props(button).onClick;
    change(ui); ui.writes.length = 0; const before = JSON.stringify([ui.state, ui.live, ui.engine.wingStepPhase]);
    act(() => retained({ currentTarget: button })); expect(ui.writes).toEqual([]); expect(JSON.stringify([ui.state, ui.live, ui.engine.wingStepPhase])).toBe(before);
  });
});
