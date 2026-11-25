// Coaster Lab round 2 (2026-11-23): two things a student meets every session.
//
// 1. "Check calculations" answered "✗ off by 12% — recheck" as often as it was
//    pressed, so a number could be found by guessing (hot / cold) instead of by
//    physics. A check now says match / close / not yet, each answer gets three
//    quick checks, then a changed answer waits 15 s from its last check, and the
//    tries go into the inspection report and the report card. A student working
//    honestly is never blocked: re-checking an unchanged answer is free, the
//    wait is shorter than any real recalculation, and certification still passes.
// 2. The top bar held 18 controls in three or four rows. Six stay in view; the
//    rest move into ONE "Settings" drawer with every id, listener and keyboard
//    stop intact, and "Restore panels" waits in the bar while scene focus hides
//    the editing panels.
//
// Everything runs the shipped functions (slices of the tool file) against jsdom.
// COASTER_CALC_SRC points at another copy (fail-first check against start_r2.js).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.COASTER_CALC_SRC || 'stem_lab/stem_tool_coasterlab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const opts = (label) => ({ file: FILE, label });

function memoryStore(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

// ------------------------------------------------------------ calculation checks
const HOST_IDS = ['clab-markerLegend', 'clab-engineerBtns', 'clab-certIntro', 'clab-problems', 'clab-certResult'];

function loadPanel(store) {
  const body = [
    sliceBetween(SRC, 'const G0 = ', ';', { ...opts('G0'), includeEnd: true }),
    sliceBetween(SRC, 'const TOL = ', ';', { ...opts('TOL'), includeEnd: true }),
    sliceBetween(SRC, 'const MARKER_COL = ', ';', { ...opts('MARKER_COL'), includeEnd: true }),
    sliceBetween(SRC, 'const fmt = ', '\n', opts('fmt')),
    sliceBetween(SRC, 'function __clabGet(id){', '\n', opts('__clabGet')),
    "const problemsEl = __clabGet('clab-problems');",
    "const certResultEl = __clabGet('clab-certResult');",
    "function renderExplore(){ throw new Error('not under test'); }",
    'const calls = [];',
    'function banner(m){ calls.push(["banner", m]); }',
    'function designLocked(){ return false; }',
    'function saveDesign(){}',
    'function fullRebuild(){ renderProblems(); }',
    'function geometryPreflightSamples(){ return []; }',
    'function jingle(){}',
    'function spawnFireworks(){ calls.push(["fireworks"]); }',
    'function missionEvent(){}',
    'function bridgeReport(){}',
    sliceBetween(SRC, 'function renderProblems(){', '\n/* ---------------- Explore level', opts('renderProblems')),
    // checkPredictions, then the calc-check block that sits before gradeCertRun
    sliceBetween(SRC, 'function checkPredictions(){', '\nfunction gradeCertRun(', opts('checkPredictions')),
    sliceBetween(SRC, 'function gradeCertRun(tele){', '\n/* ---------------- simulation', opts('gradeCertRun')),
  ].join('\n');
  const make = new Function('rootEl', 'analysis', 'design', 'track', 'localStorage',
    "let level = 'engineer';\nlet preds = {};\n" + body +
    '\nreturn { renderProblems, checkPredictions, gradeCertRun, preds: () => preds, calls, tries: () => calcTries };');
  return make;
}

const looperDesign = () => ({ certTurnIdx: 5, points: Array.from({ length: 8 }, (_, i) => ({ x: i, y: 5, z: 0, bank: i === 5 ? 50 : 0 })) });
function looperAnalysis() {
  const G0 = 9.81;
  const A = { h: 29.4, v: 3.5 }, B = { h: 4.6, r: 18 }, C = { h: 26.3, r: 6.5 }, D = { h: 12, r: 20 };
  const vAt = (h) => Math.sqrt(A.v * A.v + 2 * G0 * (A.h - h));
  return {
    L: null, A, B, C, D, clears: true,
    ans: {
      vL: null, vB: vAt(B.h), vCmin: Math.sqrt(G0 * C.r), vC: vAt(C.h),
      gB: 1 + vAt(B.h) ** 2 / (G0 * B.r), vD: vAt(D.h),
      bankD: Math.atan(vAt(D.h) ** 2 / (G0 * D.r)) * 180 / Math.PI,
    },
  };
}
const truth = looperAnalysis().ans;
const right = {
  inP1: truth.vB.toFixed(1), inP2a: truth.vCmin.toFixed(1), inP2b: truth.vC.toFixed(1),
  inP3: truth.gB.toFixed(2), inP4: String(Math.round(truth.bankD)),
};

const mounted = [];
afterEach(() => {
  while (mounted.length) mounted.pop().remove();
  vi.useRealTimers();
});

function mount(store = memoryStore()) {
  const rootEl = document.createElement('div');
  rootEl.innerHTML = HOST_IDS.map((id) => `<div id="${id}"></div>`).join('');
  document.body.appendChild(rootEl);
  mounted.push(rootEl);
  const design = looperDesign();
  const panel = loadPanel(store)(rootEl, looperAnalysis(), design, { pos: [], s: [], L: 400 }, store);
  panel.renderProblems();
  return { rootEl, panel, store };
}
const type = (rootEl, id, value) => { rootEl.querySelector('#' + id).value = String(value); };
const verdict = (rootEl, id) => rootEl.querySelector('#' + id).textContent;

describe('Coaster Lab "Check calculations" cannot be used to hunt for the answer', () => {
  it('says match / close / not yet, never a percent', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    const { rootEl, panel } = mount();
    type(rootEl, 'inP1', (truth.vB * 1.1).toFixed(1)); // 10% high: outside 6%, inside "close"
    type(rootEl, 'inP2b', (truth.vC * 1.5).toFixed(1)); // 50% high
    type(rootEl, 'inP4', String(Math.round(truth.bankD)));
    panel.checkPredictions();
    expect(verdict(rootEl, 'vP1')).toBe('≈ close, recheck a step');
    expect(verdict(rootEl, 'vP2b')).toBe('✗ not yet, rework it');
    expect(verdict(rootEl, 'vP4')).toBe('✓ matches physics');
    for (const id of ['vP1', 'vP2b', 'vP4']) expect(verdict(rootEl, id)).not.toMatch(/%|off by/);
  });

  it('after three tries on one answer, a fourth new guess waits; the other answers still check', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    const { rootEl, panel } = mount();
    for (const guess of ['10', '30', '20']) {
      type(rootEl, 'inP1', guess);
      panel.checkPredictions();
      vi.advanceTimersByTime(1000);
    }
    expect(panel.tries().tries.P1).toBe(3);
    type(rootEl, 'inP1', right.inP1);
    type(rootEl, 'inP4', right.inP4);
    panel.checkPredictions();
    // the new guess is not graded yet: no verdict leaks, the try is not spent
    expect(verdict(rootEl, 'vP1')).toMatch(/^⏳ wait 1[0-9] s$/);
    expect(panel.preds().p1.x).toBe(20);
    expect(panel.preds().p1.ok).toBe(false);
    expect(panel.tries().tries.P1).toBe(3);
    expect(verdict(rootEl, 'vP4')).toBe('✓ matches physics');
    // a student who spends the wait reworking it is graded on the next check
    vi.advanceTimersByTime(15000);
    panel.checkPredictions();
    expect(verdict(rootEl, 'vP1')).toBe('✓ matches physics');
    expect(panel.tries().tries.P1).toBe(4);
  });

  it('re-checking an unchanged answer is free, so a careful student is never held up', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    const { rootEl, panel } = mount();
    type(rootEl, 'inP1', right.inP1);
    for (let i = 0; i < 6; i += 1) panel.checkPredictions();
    expect(panel.tries().tries.P1).toBe(1);
    expect(verdict(rootEl, 'vP1')).toBe('✓ matches physics');
  });

  it('a design change re-checks old answers but never grades a newly typed one for free', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    const { rootEl, panel } = mount();
    type(rootEl, 'inP1', '10');
    panel.checkPredictions();
    type(rootEl, 'inP1', right.inP1); // typed, not checked
    panel.renderProblems(); // what any design change does
    expect(rootEl.querySelector('#inP1').value).toBe(right.inP1);
    expect(verdict(rootEl, 'vP1')).toBe('');
    expect(panel.preds().p1.x).toBe(10);
    expect(panel.tries().tries.P1).toBe(1);
  });

  it('tries survive a reload, so reloading does not reset the wait', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    const store = memoryStore();
    const first = mount(store);
    for (const guess of ['10', '30', '20']) { type(first.rootEl, 'inP1', guess); first.panel.checkPredictions(); }
    first.rootEl.remove();
    const second = mount(store);
    type(second.rootEl, 'inP1', '25');
    second.panel.checkPredictions();
    expect(verdict(second.rootEl, 'vP1')).toMatch(/^⏳ wait/);
  });

  it('a bad stored record starts a fresh count instead of breaking the panel', () => {
    const { rootEl, panel } = mount(memoryStore({ coaster_lab_calc_tries: '{"tries":{"P1":"lots"},"last":{"P1":7}}' }));
    type(rootEl, 'inP1', right.inP1);
    panel.checkPredictions();
    expect(verdict(rootEl, 'vP1')).toBe('✓ matches physics');
    expect(panel.tries().tries.P1).toBe(1);
  });
});

describe('Coaster Lab inspection records the tries, and certification is still reachable', () => {
  const capture = { B: { v: truth.vB, gV: truth.gB }, C: { v: truth.vC }, D: { gLat: 0.02 } };
  const run = (panel) => panel.gradeCertRun({ status: 'complete', violations: [], markers: capture });

  it('an honest student who needed a few tries certifies, and the report card keeps the count', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    const { rootEl, panel, store } = mount();
    type(rootEl, 'inP1', '20'); // first attempt wrong
    panel.checkPredictions();
    for (const [id, v] of Object.entries(right)) type(rootEl, id, v);
    panel.checkPredictions();
    run(panel);
    const report = rootEl.querySelector('#clab-certResult').textContent;
    expect(report).toContain('★ SIMULATION CERTIFIED');
    expect(report).toContain('Tries so far: 6 calculation checks.');
    expect(JSON.parse(store.data.coaster_lab_certified_checks)).toEqual({ checks: 6, afterData: 0 });
    // the next coaster starts a fresh count
    expect(panel.tries().tries).toEqual({});
  });

  it('an answer first matched after the inspection showed the model is counted as such', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T15:00:00Z'));
    const { rootEl, panel, store } = mount();
    for (const [id, v] of Object.entries(right)) type(rootEl, id, v);
    type(rootEl, 'inP3', '1.00'); // wrong seat g
    panel.checkPredictions();
    run(panel); // the table now shows the modeled seat g
    expect(rootEl.querySelector('#clab-certResult').textContent).toContain('NOT SIMULATION CERTIFIED');
    type(rootEl, 'inP3', right.inP3);
    panel.checkPredictions();
    run(panel);
    const report = rootEl.querySelector('#clab-certResult').textContent;
    expect(report).toContain('★ SIMULATION CERTIFIED');
    expect(report).toContain("1 matched only after an inspection showed the model's value");
    expect(JSON.parse(store.data.coaster_lab_certified_checks)).toEqual({ checks: 6, afterData: 1 });
  });

  it('the rule is on screen in one line, and the report card and summary carry the count', () => {
    expect(SRC).toContain('id=\\"clab-calcRule\\">A check says match, close or not yet. After 3 tries on one answer, wait 15 s between checks. Your tries go in your report.</p>');
    const facts = sliceBetween(SRC, 'function rideCardFacts(){', '\n}', opts('rideCardFacts'));
    expect(facts).toContain("get('coaster_lab_certified_checks')");
    const card = sliceBetween(SRC, 'function buildRideCard(cb){', "__clabGet('clab-btnRideCard')", opts('buildRideCard'));
    expect(card).toContain('f.certChecks.checks} checks');
    expect(SRC).toContain("' after ' + calcTriesText(f.certChecks)");
  });
});

// ------------------------------------------------------------------ top bar
function loadTemplate() {
  const body = sliceBetween(SRC, '  var CLAB_CSS = ', '/* @clab-settings-end */', opts('template + settings'));
  return new Function(body + '\nreturn { CLAB_HTML, clabBuildSettings, CLAB_SETTINGS_GROUPS };')();
}
const PRIMARY = ['clab-btnRun', 'clab-btnRide', 'clab-btnCam', 'clab-btnVR', 'clab-btnResetDesign', 'clab-btnGuide'];
const SECONDARY = ['clab-rideTopic', 'clab-rideGrade', 'clab-rideTimer', 'clab-rideAiSubject', 'clab-seatSel', 'clab-btnView',
  'clab-trackViz', 'clab-btnVectors', 'clab-btnSceneFocus', 'clab-visualTheme', 'clab-btnFx', 'clab-btnSound', 'clab-btnComfort', 'clab-btnFric'];

function mountBar(store = memoryStore()) {
  const t = loadTemplate();
  const rootEl = document.createElement('div');
  rootEl.innerHTML = t.CLAB_HTML;
  document.body.appendChild(rootEl);
  mounted.push(rootEl);
  const before = [...rootEl.querySelectorAll('#clab-top .controls > *')].map((el) => el.id);
  const api = t.clabBuildSettings(rootEl, store);
  return { rootEl, api, before, store, t };
}

describe('Coaster Lab top bar keeps the every-minute controls and folds the rest into Settings', () => {
  it('six controls stay in the bar, the rest sit in one labelled drawer, and none is lost', () => {
    const { rootEl, before } = mountBar();
    const controls = rootEl.querySelector('#clab-top .controls');
    const direct = [...controls.children].map((el) => el.id);
    expect(direct).toEqual([...PRIMARY, 'clab-btnSettings', 'clab-settings']);
    const drawer = rootEl.querySelector('#clab-settings');
    for (const id of SECONDARY) expect(drawer.querySelector('#' + id), id).toBeTruthy();
    // every control that was in the bar is still there, exactly once
    for (const id of before) expect(rootEl.querySelectorAll('#' + id).length, id).toBe(1);
    expect(before.length).toBe(PRIMARY.length + SECONDARY.length);
    // each group is named for assistive tech
    for (const group of drawer.querySelectorAll('.clab-settings-group')) {
      const label = rootEl.querySelector('#' + group.getAttribute('aria-labelledby'));
      expect(group.getAttribute('role')).toBe('group');
      expect(label && label.textContent.trim().length).toBeGreaterThan(2);
    }
  });

  it('the drawer is a real disclosure: shut by default, announces its state, remembers it for the session', () => {
    const store = memoryStore();
    const { rootEl } = mountBar(store);
    const toggle = rootEl.querySelector('#clab-btnSettings');
    const drawer = rootEl.querySelector('#clab-settings');
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('aria-controls')).toBe('clab-settings');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(drawer.hidden).toBe(true);
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(drawer.hidden).toBe(false);
    expect(store.data.coaster_lab_settings_open).toBe('open');
    rootEl.remove();
    // the next mount in the same session opens it again
    const again = mountBar(store);
    expect(again.rootEl.querySelector('#clab-btnSettings').getAttribute('aria-expanded')).toBe('true');
    expect(again.rootEl.querySelector('#clab-settings').hidden).toBe(false);
  });

  it('Escape inside the drawer shuts it and returns focus to the toggle', () => {
    const { rootEl } = mountBar();
    const toggle = rootEl.querySelector('#clab-btnSettings');
    toggle.click();
    const fx = rootEl.querySelector('#clab-btnFx');
    fx.focus();
    fx.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(rootEl.querySelector('#clab-settings').hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('building twice does not make a second drawer, and storage that throws still mounts', () => {
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    const { rootEl, api, t } = mountBar(throwing);
    expect(api).toBeTruthy();
    expect(t.clabBuildSettings(rootEl, throwing)).toBe(null);
    expect(rootEl.querySelectorAll('#clab-btnSettings').length).toBe(1);
    rootEl.querySelector('#clab-btnSettings').click();
    expect(rootEl.querySelector('#clab-settings').hidden).toBe(false);
  });

  it('while scene focus hides the panels, "Restore panels" waits in the bar, then goes home', () => {
    const { rootEl } = mountBar();
    const sceneFocusButton = rootEl.querySelector('#clab-btnSceneFocus');
    const lift = sliceBetween(SRC, 'function applySceneFocus(announce){', '\nsceneFocusButton.addEventListener', opts('applySceneFocus'));
    const banners = [];
    const api = new Function('rootEl', 'sceneFocusButton', 'banner', 'clearStationViews', 'document',
      'let sceneFocus = false;\n' + lift + '\nreturn { set(v){ sceneFocus = v; applySceneFocus(true); } };')(
      rootEl, sceneFocusButton, (m) => banners.push(m), () => {}, document);
    const toggle = rootEl.querySelector('#clab-btnSettings');
    expect(rootEl.querySelector('#clab-settings').hidden).toBe(true);
    sceneFocusButton.focus(); // what frameStationView does right after the click
    api.set(true);
    expect(sceneFocusButton.nextElementSibling).toBe(toggle);
    expect(sceneFocusButton.closest('[hidden]')).toBe(null);
    expect(sceneFocusButton.textContent).toBe('Restore panels');
    expect(document.activeElement).toBe(sceneFocusButton);
    api.set(false);
    expect(sceneFocusButton.parentElement.id).toBe('clab-settingsView');
    // its drawer is shut, so focus lands on the toggle instead of being lost
    expect(document.activeElement).toBe(toggle);
  });

  it('the guide and banners point at Settings instead of "the top bar"', () => {
    const { t } = mountBar();
    expect(t.CLAB_HTML).toContain('pick the <b>topic</b> &amp; <b>grade</b> under ⚙ Settings:');
    expect(t.CLAB_HTML).toContain('you ride in (⚙ Settings)');
    expect(SRC).not.toContain('in the top bar for AI questions');
    expect(SRC).not.toContain('Try FX: Lite in the top bar');
  });
});
