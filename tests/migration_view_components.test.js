import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = process.env.MIGRATION_VIEW_COMPONENTS_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing comparison-breakdown source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const helpers = new Function('migrNum', section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  '\nreturn { current: migrationStudyCurrentContext };')(num);
const advance = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const tau = Math.PI * 2;
const normalize = value => ((value % tau) + tau) % tau;
const { act } = React;
const mounts = [];
let tool;

function walk(node, predicate, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, result)); return result; }
  if (predicate(node)) result.push(node);
  walk(node.props?.children, predicate, result); return result;
}
function fakeEngine(host, values = {}) {
  host.setAttribute('data-flight-ready', 'true');
  const pose = { userData: { captured: false, capturedPhase: null, captureVersion: 0, sourceBirdUuid: '' } };
  pose.capturePose = vi.fn((flyer, speciesId, individual) => {
    pose.userData = { captured: true, capturedPhase: Number.isFinite(flyer.userData.lastRenderedWingPhase) ? normalize(flyer.userData.lastRenderedWingPhase) : null,
      captureVersion: pose.userData.captureVersion + 1, sourceBirdUuid: flyer.uuid, speciesId, individual };
    return true;
  });
  pose.clearPose = vi.fn(() => { pose.userData.captured = false; pose.userData.capturedPhase = null; });
  return { host, flyers: Array.from({ length: 9 }, (_, index) => ({ uuid: 'comparison-breakdown-bird-' + index, visible: true,
    position: { y: 0 }, rotation: { z: 0 }, userData: { phase: 1.19 + index * .29, flapRate: 5.3 + index * .11, baseY: 1, applyWingPhase: vi.fn() } })),
    time: 2.37, wingStepSerial: 14, wingStepPhase: 1.1, contextLost: false,
    speciesId: 'canada_goose', formationMode: 'natural', season: 'fall',
    markedWingPose: pose, wingtipPath: { invalidate: vi.fn() }, ...values };
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightStudyObservationOpen: true,
    flightStudyRegion: 'inner-wing', flightShowAnatomy: true, flightShowWingtipPath: true, flightWingStep: 14,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...seed }, tree, refresh, renders = 0;
  const refs = [], writes = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, values) => { writes.push(values); state = { ...state, ...values }; refresh(value => value + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { renders++; refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const engine = fakeEngine(stage, { speciesId: state.flightSpecies || 'canada_goose', formationMode: state.flightFormation || 'natural',
    season: state.flightSeason || 'fall', wingStepSerial: state.flightWingStep });
  engineRef.current = engine;
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const ui = { host, stage, engine, engineRef, liveRef, writes, announce, awardXP,
    get state() { return state; }, get live() { return liveRef.current; }, get renderCount() { return renders; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action(name) { return ui.node(node => node.props?.['data-marked-pose-action'] === name); },
    button(text) { return ui.node(node => node.type === 'button' && node.props.children === text); },
    click(node) { act(() => { node.props.onClick(); }); }, mark() { ui.click(ui.action('mark')); }, check() { ui.click(ui.action('check')); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(value => value + 1); }); },
    frame() { advance(engine, liveRef.current, num); },
    context() { return host.querySelector("[data-migration-id=\"migration-study-current-context\"]"); },
    field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); },
    breakdown() { return host.querySelector('[data-marked-comparison-breakdown]'); },
    cue() { return host.querySelector('[data-study-checked-comparison]'); },
    prompt() { return host.querySelector('[data-study-checked-prompt]'); }
  };
  ui.set({}); ui.frame(); return ui;
}
function work() {
  return { flightStudyObservations: { drafts: { 'canada_goose:inner-wing': 'My own prediction and observed evidence.',
    'canada_goose:head': 'My head draft.' }, records: {} },
    flightInvestigation: { prediction: 'Keep my wind prediction.', evidence: 'Keep my evidence.' },
    flightChallenges: { work: { wind: { notes: 'Keep my reasoning.' } } },
    inquiry: { hypothesis: 'Keep my hypothesis.' }, aiExplorerText: 'Keep my research.' };
}
function experiment(ui) {
  return { time: ui.engine.time, serial: ui.engine.wingStepSerial, offset: ui.engine.wingStepPhase,
    pose: JSON.stringify(ui.engine.markedWingPose.userData),
    birds: ui.engine.flyers.map(flyer => ({ uuid: flyer.uuid, y: flyer.position.y, z: flyer.rotation.z,
      phase: flyer.userData.lastRenderedWingPhase, calls: flyer.userData.applyWingPhase.mock.calls.length })) };
}

function recordedWork() {
  const seed = work();
  seed.flightStudyObservations.records['canada_goose:inner-wing'] = { speciesId: 'canada_goose', region: 'inner-wing',
    note: 'Keep my earlier recorded wing evidence.', bird: 0, yaw: 35, pitch: 15, zoom: 1, wingStep: 4, paused: true, motionReduced: true };
  return seed;
}
function snapshot(ui) {
  return { state: ui.state, text: JSON.stringify(ui.state), model: experiment(ui),
    field: ui.field(), value: ui.field().value,
    selection: [ui.field().selectionStart, ui.field().selectionEnd, ui.field().selectionDirection] };
}
function expectPreserved(ui, before) {
  expect(ui.state).toBe(before.state); expect(JSON.stringify(ui.state)).toBe(before.text);
  expect(experiment(ui)).toEqual(before.model); expect(ui.field()).toBe(before.field); expect(ui.field().value).toBe(before.value);
  expect([ui.field().selectionStart, ui.field().selectionEnd, ui.field().selectionDirection]).toEqual(before.selection);
  expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
}
function checkBreakdown(ui, kind, view, wing, currentView = 'Current: 35° / 15° · 100%', markedView = 'Marked: 35° / 15° · 100%') {
  const dl = ui.breakdown();
  expect(dl?.tagName).toBe('DL');
  expect(dl.getAttribute('aria-label')).toBe('Checked comparison variables');
  expect(dl.getAttribute('data-marked-comparison-breakdown')).toBe(kind);
  const rows = dl.querySelectorAll(':scope > div');
  expect(rows).toHaveLength(2);
  expect([...dl.querySelectorAll('dt')].map(item => item.textContent)).toEqual(['Selected view settings', 'Wing-cycle position']);
  expect(dl.querySelectorAll('dd')).toHaveLength(2);
  expect(dl.querySelectorAll('[data-marked-comparison-order]')).toHaveLength(1);
  expect(dl.querySelector('[data-marked-comparison-order]').textContent).toBe('Study angle / elevation · zoom');
  expect(dl.querySelector('[data-marked-comparison-variable="view"]').getAttribute('data-comparison-result')).toBe(view);
  expect(dl.querySelector('[data-marked-comparison-variable="wing"]').getAttribute('data-comparison-result')).toBe(wing);
  expect(dl.querySelector('[data-marked-comparison-result="view"]').textContent).toBe(view === 'matches' ? 'Matches' : 'Changed');
  expect(dl.querySelector('[data-marked-comparison-result="wing"]').textContent).toBe(wing === 'matches' ? 'Matches' : 'Changed');
  expect(dl.querySelector('[data-marked-comparison-value="marked-view"]').textContent).toBe(markedView);
  expect(dl.querySelector('[data-marked-comparison-value="current-view"]').textContent).toBe(currentView);
  expect(dl.querySelectorAll('button,input,textarea,select,[contenteditable]')).toHaveLength(0);
  expect(dl.querySelector('[role="status"],[aria-live]')).toBeNull();
  expect(dl.textContent).not.toMatch(/controlled variable|milliseconds|seconds|degrees of wing|grade|score/i);
  return dl;
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool(sourcePath, 'migration'); });
afterEach(async () => {
  await act(async () => { await Promise.resolve(); mounts.splice(0).forEach(root => root.unmount()); });
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});


const rawComponentStart = source.indexOf("['yaw', 'pitch', 'zoom'].map(function(key) {");
const rawComponentEnd = source.indexOf('\n                    ),', rawComponentStart);
const phaseEquivalent = new Function(section('      function migrationStudyComparisonPhaseMatches(', '      function migrationStudyComparisonViewValid(') + '\nreturn migrationStudyComparisonPhaseMatches;')();
const rawComponents = new Function('h','t','checked','migrationStudyComparisonPhaseMatches','return '+source.slice(rawComponentStart,rawComponentEnd).trim()+';');

function componentResults(ui) {
  return Array.from(ui.host.querySelectorAll('[data-marked-view-component]'), row => ({
    key: row.getAttribute('data-marked-view-component'),
    result: row.getAttribute('data-component-result'),
    text: row.querySelector('strong').textContent
  }));
}
function expectComponents(ui, expected) {
  expect(componentResults(ui)).toEqual(['yaw','pitch','zoom'].map((key,i)=>({
    key, result: expected[i] ? 'matches' : 'changed', text: expected[i] ? 'Matches' : 'Changed'
  })));
  const list = ui.breakdown().querySelector('[data-marked-view-components]');
  expect(list.tagName).toBe('UL'); expect(list.getAttribute('aria-label')).toBe('Checked view settings');
  expect([...list.querySelectorAll('li>span')].map(x=>x.textContent)).toEqual(['Study angle','Elevation','Zoom']);
  expect(ui.breakdown().querySelectorAll(':scope>div')).toHaveLength(2);
  expect(list.querySelectorAll('input,button,textarea,select,[role="status"],[aria-live]')).toHaveLength(0);
  const all = expected.every(Boolean);
  expect(ui.breakdown().querySelector('[data-marked-comparison-variable="view"]').getAttribute('data-comparison-result')).toBe(all?'matches':'changed');
}
describe('Checked view components support deliberate one-setting comparisons', () => {
  it.each([
    ['same',{},[true,true,true]],
    ['angle',{flightStudyYaw:90},[false,true,true]],
    ['elevation',{flightStudyPitch:30},[true,false,true]],
    ['zoom',{flightStudyZoom:1.2},[true,true,false]],
    ['angle and elevation',{flightStudyYaw:180,flightStudyPitch:10},[false,false,true]],
    ['all settings',{flightStudyYaw:90,flightStudyPitch:30,flightStudyZoom:1.25},[false,false,false]]
  ])('describes %s from a valid explicit snapshot without changing learner work',(_,changes,expected)=>{
    const ui=fixture(recordedWork()); ui.mark(); ui.set(changes);
    const field=ui.field(); field.focus(); field.setSelectionRange(4,20,'backward');
    const before=snapshot(ui); ui.writes.length=0; ui.check();
    expectComponents(ui,expected); expectPreserved(ui,before); expect(document.activeElement).toBe(field);
    expect(ui.breakdown().querySelector('[data-marked-comparison-value="marked-view"]').textContent).toBe('Marked: 35° / 15° · 100%');
  });
  it('shows equivalent signed half turns as matching while retaining their selected numeric values',()=>{
    const ui=fixture({flightStudyYaw:180});ui.mark();ui.set({flightStudyYaw:-180});ui.check();
    expectComponents(ui,[true,true,true]);
    expect(ui.breakdown().querySelector('[data-marked-comparison-value="current-view"]').textContent).toContain('-180°');
  });
  it.each([
    ['yaw within', {flightStudyYaw:35+0.00001},[true,true,true]],
    ['yaw outside',{flightStudyYaw:35+0.0001},[false,true,true]],
    ['elevation within',{flightStudyPitch:15+0.0000005},[true,true,true]],
    ['elevation outside',{flightStudyPitch:15+0.000002},[true,false,true]],
    ['zoom within',{flightStudyZoom:1+0.0000005},[true,true,true]],
    ['zoom outside',{flightStudyZoom:1+0.000002},[true,true,false]]
  ])('uses existing comparison tolerance for %s',(_,changes,expected)=>{
    const checked={markedView:{yaw:35,pitch:15,zoom:1},view:{yaw:changes.flightStudyYaw??35,pitch:changes.flightStudyPitch??15,zoom:changes.flightStudyZoom??1}};
    const rows=rawComponents(React.createElement,(_,fallback)=>fallback,checked,phaseEquivalent);
    expect(rows.map(row=>row.props['data-component-result'])).toEqual(expected.map(v=>v?'matches':'changed'));
  });
  it('compares normalized selected zoom rather than inventing a change from a discarded fractional value',()=>{
    const ui=fixture();ui.mark();ui.set({flightStudyZoom:1.004});ui.check();expectComponents(ui,[true,true,true]);
    expect(ui.breakdown().querySelector('[data-marked-comparison-value="marked-view"]').textContent).toContain('100%');
    expect(ui.breakdown().querySelector('[data-marked-comparison-value="current-view"]').textContent).toContain('100%');
    expect(ui.live.flightMarkedPose.comparisonCheck.view.zoom).toBe(1);
    expect(ui.breakdown().querySelector('[data-marked-view-rounding]')).toBeNull();
    ui.set({flightStudyZoom:1.1});ui.check();expect(ui.breakdown().querySelector('[data-marked-view-rounding]')).toBeNull();
  });
  it('keeps unchanged zoom visually distinct inside a changed aggregate view',()=>{
    const ui=fixture();ui.mark();ui.set({flightStudyYaw:90});ui.check();expectComponents(ui,[false,true,true]);
    const angle=ui.breakdown().querySelector('[data-marked-view-component="yaw"] strong');
    const zoom=ui.breakdown().querySelector('[data-marked-view-component="zoom"] strong');
    expect(getComputedStyle(angle).color).not.toBe(getComputedStyle(zoom).color);
    expect(zoom.className).toBe('migration-view-component-result');
  });
  it('never infers components before Check or promotes a waiting Check after a frame',()=>{
    const ui=fixture();expect(componentResults(ui)).toEqual([]);ui.mark();expect(componentResults(ui)).toEqual([]);
    ui.click(ui.button('Step wingbeat'));ui.check();expect(componentResults(ui)).toEqual([]);
    ui.frame();ui.set({});expect(componentResults(ui)).toEqual([]);
    ui.check();expectComponents(ui,[true,true,true]);
  });
  it.each([
    ['orbit',ui=>ui.set({flightStudyYaw:90})],
    ['elevation',ui=>ui.set({flightStudyPitch:30})],
    ['zoom',ui=>ui.set({flightStudyZoom:1.2})],
    ['resume',ui=>ui.click(ui.button('Resume flight'))],
    ['clear',ui=>ui.click(ui.action('clear'))],
    ['source',ui=>{ui.engine.flyers[0].uuid='new-source';ui.set({});}],
    ['context loss',ui=>{ui.engine.contextLost=true;ui.stage.setAttribute('data-flight-error','true');ui.set({});}]
  ])('withholds stale component facts after %s',(_,change)=>{
    const ui=fixture(recordedWork());ui.mark();ui.check();expectComponents(ui,[true,true,true]);
    change(ui);expect(componentResults(ui)).toEqual([]);expect(ui.field().value).toBe('My own prediction and observed evidence.');
    expect(ui.state.flightStudyObservations.records['canada_goose:inner-wing'].note).toBe('Keep my earlier recorded wing evidence.');
  });
  it('uses the same selected-settings facts for Monarch without bird anatomy or saving an answer',()=>{
    const ui=fixture({flightSpecies:'monarch',flightShowAnatomy:false,flightStudyObservations:{drafts:{'monarch:whole-wing':'My own butterfly evidence.'},records:{}}});
    ui.mark();ui.set({flightStudyPitch:30});ui.check();expectComponents(ui,[true,false,true]);
    expect(ui.breakdown().textContent).not.toMatch(/feather|bird/);expect(ui.state.flightStudyObservations.records).toEqual({});
    expect(ui.field().value).toBe('My own butterfly evidence.');
  });
});
