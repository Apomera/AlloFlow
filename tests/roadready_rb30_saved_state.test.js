import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 30, lane robust: saved state that is damaged, hostile or old must not break a screen.
// - Fuzz (ported from the round-30 code review): every one of the tool's views is rendered with each
//   saved key set to ten kinds of wrong value. Before: 91 crashes into the "RoadReady Error" screen.
// - Load Progress applies a file through an explicit per-field type table (rrSanitizeSave).
// - The "RoadReady Error" screen has Back to menu and Try again; the error text is behind <details>.
// - Shared devices: Save Progress says the file holds a name and dates, and "Start fresh" clears
//   Road Ready's state and its three device-storage keys after a confirm step.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const SRC = readFileSync(TOOL, 'utf8');
const VIEWS = Array.from(new Set(Array.from(SRC.matchAll(/^\s*if \(view === '([A-Za-z]+)'/gm)).map((m) => m[1])));
let H, React, ReactDOMClient, guards;
beforeAll(async () => {
  window.__RR_TEST_EXPORTS__ = {};
  H = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ React, ReactDOMClient } = H);
  H.resetStemLab();
  H.loadTool(TOOL, 'roadReady');
  guards = window.__RR_TEST_EXPORTS__.roadReadySaveGuards;
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LS_KEYS = ['roadReady.permitStats.v1', 'roadReady.parkingBest.v1', 'roadReady.permitMastery.v1'];

// ── the key table ──
// Keys the Save Progress file carries (Load Progress applies them) + the device-storage one.
const LOAD_KEYS = ['badges', 'scenariosDriven', 'weathersDriven', 'drivingStats', 'lastJournal', 'completedTrips', 'bestGhosts',
  'logbook', 'maintenanceGame', 'defensiveState', 'lastRoadTest', 'preTripChecks', 'carColor', 'driverName', 'licensePlate',
  'lastReflection', 'pledgeSigned', 'permitFlashHistory', 'permitStats', 'permitMastery', 'gdlBirthDate', 'gdlPermitDate',
  'gdlIntermediateDate', 'dailyChallenge', 'parkingBest'];
// State that gates or feeds a view but is not in the file.
const EXTRA_KEYS = ['permit', 'lastParentReport', 'rideshareLast', 'rideshareTotal', 'freeExploreScenario', 'freeExploreTrip',
  'pendingScenario', 'lesson', 'scenario', 'vehicle', 'roadTestStage', 'challengeTick', 'hudTextScale', 'hudPreset'];
const ALL_KEYS = LOAD_KEYS.concat(EXTRA_KEYS);
const PROFILES = {
  string: () => 'x',
  longString: () => '<img src=x onerror=alert(1)>'.repeat(40),
  number: () => 7,
  bool: () => true,
  array: () => [1, 'a', null, {}],
  arrayOfNull: () => [null, null],
  emptyObject: () => ({}),
  nestedNull: () => ({ a: null, entries: null, deductions: null, errors: null, events: null, path: null, evidence: null, outcome: null, questions: null, answers: null, conditions: null, score: null }),
  nestedWrongTypes: () => ({ entries: 'x', deductions: 5, errors: 'x', events: {}, path: 'x', evidence: 'x', outcome: 'x', questions: 'x', answers: 3, conditions: 'x', score: 'NaN', drivePath: 'x', lastCrashReplay: 'x', missionStatus: 'x', time: 5, at: 'x', name: 5, date: {}, checks: 'x' }),
  nanNumbers: () => ({ score: NaN, safetyScore: NaN, efficiencyScore: NaN, durationSec: NaN, distance_mi: NaN, total: NaN, correct: NaN, startedAt: NaN, endedAt: NaN, streak: NaN, best: NaN }),
};
// Realistic OLD-save shapes: fields that later versions added are simply missing.
const OLD_SAVE = {
  drivingStats: { scenario: 'Residential', vehicle: 'Sedan', time: '1:00', safetyScore: 90, efficiencyScore: 80 },
  lastJournal: { scenario: 'Residential', vehicle: 'Sedan' },
  logbook: [{ scenario: 'Residential' }, {}, { entries: [{}] }, { startedAt: 'yesterday', durationSec: '60', safetyScore: 'A' }],
  lastRoadTest: { score: 80 },
  lastParentReport: { scenario: 'Residential' },
  bestGhosts: { 123: { score: 150 } },
  scenariosDriven: { residential: true, highway: 3 },
  permitStats: { signs: 4, rules: { correct: 1 } },
  permitMastery: ['q1', 'q2'],
  parkingBest: 88,
  dailyChallenge: { date: '2025-01-01' },
  pledgeSigned: true,
  lastReflection: 'Nice drive',
  permit: { questions: [], idx: 0 },
};
const GATE = { drivingStats: OLD_SAVE.drivingStats, lastParentReport: OLD_SAVE.lastParentReport, lastRoadTest: OLD_SAVE.lastRoadTest, lesson: 'basics' };

function crashOf(html) {
  if (typeof html !== 'string') return 'non-string render';
  const i = html.indexOf('RoadReady Error');
  if (i === -1) return null;
  return html.slice(i, i + 900).replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/\s+/g, ' ').slice(16, 260);
}
function render(view, data, ls) {
  try { window.localStorage.clear(); } catch (e) {}
  try { delete window.__alloflowRoadReady; } catch (e) {}
  if (ls) Object.keys(ls).forEach((k) => window.localStorage.setItem(k, ls[k]));
  try { return crashOf(H.renderTool('roadReady', { roadReady: Object.assign({ view }, data) })); }
  catch (e) { return 'THROW ' + String(e && e.message).slice(0, 200); }
}
function quiet(fn) {
  const err = console.error, log = console.log, warn = console.warn;
  console.error = () => {}; console.log = () => {}; console.warn = () => {};
  try { return fn(); } finally { console.error = err; console.log = log; console.warn = warn; }
}
const report = (list) => list.length + ' crashes\n' + list.slice(0, 25).map((x) => '  ' + JSON.stringify(x)).join('\n');

describe('hostile saved state: no view crashes (rb30 fuzz)', () => {
  it('the view list is the whole tool (91 views at round 30)', () => {
    expect(VIEWS.length).toBeGreaterThanOrEqual(91);
    ['menu', 'driving', 'logbook', 'permit', 'customize', 'certificate', 'analytics', 'gdlTracker', 'crashReplay', 'parentReport', 'roadTestResult'].forEach((v) => expect(VIEWS).toContain(v));
  });

  it('control: every view renders with normal state', () => {
    const bad = quiet(() => {
      const out = [];
      for (const v of VIEWS) { const c = render(v, {}); if (c) out.push({ view: v, crash: c }); }
      for (const v of VIEWS) { const c = render(v, GATE); if (c) out.push({ view: v, with: 'gate', crash: c }); }
      return out;
    });
    expect(bad, report(bad)).toEqual([]);
  });

  it('each kind of wrong value in EVERY saved key at once: all views still render', () => {
    const bad = quiet(() => {
      const out = [];
      for (const p of Object.keys(PROFILES)) for (const v of VIEWS) {
        const data = {}; ALL_KEYS.forEach((k) => { data[k] = PROFILES[p](); });
        const c = render(v, data);
        if (!c) continue;
        // name the key(s) responsible
        const culprits = ALL_KEYS.filter((k) => { const one = Object.assign({}, GATE); one[k] = PROFILES[p](); return !!render(v, one); });
        out.push({ view: v, profile: p, keys: culprits, crash: c });
      }
      return out;
    });
    expect(bad, report(bad)).toEqual([]);
  });

  it('each wrong value in ONE key at a time, on the views that read saved state', () => {
    const readers = ['menu', 'logbook', 'gdlTracker', 'analytics', 'certificate', 'customize', 'driving', 'defensiveList', 'maintenanceGame',
      'debrief', 'driveDebrief', 'crashReplay', 'parentReport', 'roadTestResult', 'permit', 'achievementGallery', 'driverPledge', 'dailyChallenge'].filter((v) => VIEWS.indexOf(v) !== -1);
    const bad = quiet(() => {
      const out = [];
      for (const p of Object.keys(PROFILES)) for (const k of ALL_KEYS) for (const v of readers) {
        const one = Object.assign({}, GATE); one[k] = PROFILES[p]();
        const c = render(v, one); if (c) out.push({ view: v, profile: p, key: k, crash: c });
      }
      return out;
    });
    expect(bad, report(bad)).toEqual([]);
  });

  it('realistic OLD saves (fields missing, older shapes): every view renders', () => {
    const bad = quiet(() => {
      const out = [];
      for (const k of Object.keys(OLD_SAVE)) for (const v of VIEWS) {
        const one = Object.assign({}, GATE); one[k] = OLD_SAVE[k];
        const c = render(v, one); if (c) out.push({ view: v, key: k, crash: c });
      }
      return out;
    });
    expect(bad, report(bad)).toEqual([]);
  });

  it('permit quiz edge states: no questions, a null question, position out of range, no answers', () => {
    const Q = { q: 'Q?', a: ['x', 'y'], correct: 0 };
    const states = {
      empty: {}, zeroQuestions: { questions: [], index: 0, answers: [] }, nullQuestion: { questions: [null], index: 0, answers: [] },
      indexPastEnd: { questions: [Q], index: 5, answers: [] }, negativeIndex: { questions: [Q], index: -1, answers: [] },
      fractionIndex: { questions: [Q], index: 0.5, answers: [] }, noAnswers: { questions: [{ q: 'Q?' }], index: 0 },
      oldIdxField: { questions: [Q], idx: 0, answers: [] }, doneNoAnswers: { questions: [Q], done: true, score: 1 },
      done: { questions: [], index: 0, answers: [], done: true },
    };
    const bad = quiet(() => {
      const out = [];
      for (const k of Object.keys(states)) for (const v of ['permit', 'permitStart', 'permitCategory', 'permitFlashcards', 'dailyChallenge', 'signsView']) {
        const c = render(v, { permit: states[k] }); if (c) out.push({ view: v, state: k, crash: c });
      }
      return out;
    });
    expect(bad, report(bad)).toEqual([]);
    const html = quiet(() => H.renderTool('roadReady', { roadReady: { view: 'permit', permit: states.zeroQuestions } }));
    expect(html).toContain('This quiz could not be opened. Start a new one.');
    expect(html).toContain('Start a new quiz');
    // a healthy quiz is untouched
    const ok = quiet(() => H.renderTool('roadReady', { roadReady: { view: 'permit', permit: { questions: [Q, Q], index: 1, answers: [{ chosen: 0, correct: true }], score: 1, done: false } } }));
    expect(ok).toContain('Question 2 of 2');
    expect(ok).not.toContain('could not be opened');
  });

  it('device storage holding the wrong thing: the screens that read it still render', () => {
    const variants = { string: '"x"', number: '7', array: '[1,null,"a"]', nestedNull: '{"signs":null,"rules":{"correct":null}}', garbage: '{not json' };
    const bad = quiet(() => {
      const out = [];
      for (const lk of LS_KEYS) for (const lv of Object.keys(variants)) for (const v of ['menu', 'permitStart', 'permitCategory', 'permit', 'parkingMenu', 'parking', 'analytics', 'learningPath', 'lessonPath', 'achievementGallery', 'certificate', 'permitFlashcards']) {
        const ls = {}; ls[lk] = variants[lv];
        const c = render(v, { drivingStats: OLD_SAVE.drivingStats }, ls); if (c) out.push({ view: v, lsKey: lk, variant: lv, crash: c });
      }
      return out;
    });
    try { window.localStorage.clear(); } catch (e) {}
    expect(bad, report(bad)).toEqual([]);
  });
});

describe('Load Progress type table: rrSanitizeSave (rb30)', () => {
  const realistic = () => ({
    tool: 'roadReady', version: 1, savedAt: '2026-11-09T12:00:00.000Z',
    badges: { first_drive: true, speed_demon: true, ten_drives: true },
    scenariosDriven: { residential: { bestSafety: 92, lastSafety: 90, driveCount: 3, lastOutcome: 'Safe drive' }, highway: true },
    weathersDriven: { clear: true, rain: true }, totalDrives: 4,
    drivingStats: { scenario: 'Residential', vehicle: 'Sedan', time: '5:02', durationSec: 302, safetyScore: 91, efficiencyScore: 84, crashes: 1, distance_mi: '1.20',
      events: [{ kind: 'hardBrake', t: 12, speedMph: 31 }], lastCrashReplay: [{ t: 1, x: 2, y: 3, heading: 0, speed: 4, gear: 'D', steering: 0 }],
      drivePath: [{ x: 1, y: 2, speed: 20 }], evidence: { qualifying: true }, outcome: { label: 'Safe drive' }, missionStatus: null },
    worldSeed: 1234, reducedMotion: true, calmDrive: false, hudPreset: 'science', hudTextScale: 1.2, realMirrors: true, rideAlong: false, instructorVoice: false,
    lastJournal: { scenario: 'Residential', vehicle: 'Sedan', conditions: { weather: 'rain', time: 'night', traffic: 'light', speedLimit: 25 }, startedAt: 1700000000000, endedAt: 1700000302000, durationSec: 302, entries: [{ t: 0, kind: 'start', icon: 'K', text: 'Drive started' }], qualifyingSession: true, outcome: 'Safe drive' },
    completedTrips: { coast: true }, bestGhosts: { 1234: { score: 175, path: [{ x: 1, y: 2, speed: 20 }], durationSec: 302, savedAt: 1700000302000, tripId: null } },
    logbook: [{ scenario: 'Residential', vehicle: 'Sedan', conditions: { weather: 'clear', time: 'day', traffic: 'light', speedLimit: 25 }, startedAt: 1700000000000, endedAt: 1700000302000, durationSec: 302, entries: [{ t: 3, kind: 'tip', icon: 'i', text: 'Mirror check' }], safetyScore: 91, efficiencyScore: 84, freeExplore: false, qualifyingSession: true, outcome: 'Safe drive' }],
    maintenanceGame: { oil: { answered: 1, correct: true } }, defensiveState: { tailgater: { answered: 0, correct: false } },
    lastRoadTest: { score: 88, passed: true, completed: true, evidenceMet: true, critical: false, reason: '', distanceMeters: 900, criticalEvents: [], deductions: [{ type: 'speed', points: 4 }], scenario: 'Residential', durationSec: 300, startedAt: 1, endedAt: 2 },
    preTripChecks: { mirrors: true }, carColor: '#22d3ee', driverName: 'Sam', licensePlate: 'MAINE07',
    lastReflection: { text: 'I braked late.', at: 1700000302000 }, pledgeSigned: 1700000000000, permitFlashHistory: { 3: 'known' },
    permitStats: { signs: { correct: 4, total: 5 } }, permitMastery: { 12: true, 40: true }, tourCompleted: true,
    gdlBirthDate: '2010-05-04', gdlPermitDate: '2026-01-10', gdlIntermediateDate: '', dailyChallenge: { date: '2026-11-09', done: true, streak: 3, challengeTitle: 'Smooth stops' },
  });

  it('a realistic save passes through whole (only the retired speed badge is removed)', () => {
    expect(guards, 'saved-state guards are exported for tests').toBeTruthy();
    const save = realistic();
    const res = guards.rrSanitizeSave(save);
    expect(res.ok).toBe(true);
    expect(res.dropped).toEqual([]);
    const expected = realistic();
    delete expected.tool; delete expected.version; delete expected.savedAt; delete expected.gdlIntermediateDate;
    delete expected.badges.speed_demon;
    expect(res.apply).toEqual(expected);
  });

  it('every field in the Save Progress file has a row in the type table', () => {
    const saved = Array.from(SRC.slice(SRC.indexOf("tool: 'roadReady',\n                    version: 1,"), SRC.indexOf("dailyChallenge: d.dailyChallenge || null")).matchAll(/^\s{20}([A-Za-z]+): /gm)).map((m) => m[1])
      .filter((k) => ['tool', 'version', 'savedAt'].indexOf(k) === -1).concat(['dailyChallenge']);
    expect(saved.length).toBeGreaterThanOrEqual(34);
    expect(Object.keys(guards.RR_SAVE_FIELDS).sort()).toEqual(saved.slice().sort());
  });

  it('unknown keys are never copied, and a file for another tool is refused', () => {
    const res = guards.rrSanitizeSave(Object.assign(realistic(), { view: 'driving', evil: '<script>', __proto__x: 1, permit: { questions: [] }, lastParentReport: 'x' }));
    ['view', 'evil', '__proto__x', 'permit', 'lastParentReport', 'tool', 'version', 'savedAt'].forEach((k) => expect(k in res.apply, k).toBe(false));
    expect(guards.rrSanitizeSave({ tool: 'other', badges: { a: true } })).toEqual({ ok: false, apply: {}, dropped: [] });
    [null, 7, 'x', [], undefined].forEach((v) => expect(guards.rrSanitizeSave(v).ok).toBe(false));
  });

  it('every wrong-value profile in every field: what is applied always has the right type', () => {
    const typeOk = {
      badges: (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x === true),
      logbook: (v) => Array.isArray(v) && v.every((j) => j && typeof j === 'object' && Array.isArray(j.entries) && (j.durationSec === undefined || Number.isFinite(j.durationSec))),
      carColor: (v) => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v), driverName: (v) => typeof v === 'string' && v.length <= 20, licensePlate: (v) => typeof v === 'string' && v.length <= 7,
      hudPreset: (v) => ['driver', 'science', 'instructor', 'calm'].indexOf(v) !== -1,
      drivingStats: (v) => Array.isArray(v.events) && (v.lastCrashReplay === null || Array.isArray(v.lastCrashReplay)) && Array.isArray(v.drivePath),
      lastRoadTest: (v) => Array.isArray(v.deductions),
      maintenanceGame: (v) => Object.values(v).every((x) => x && typeof x === 'object'), defensiveState: (v) => Object.values(v).every((x) => x && typeof x === 'object'),
      gdlBirthDate: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v), gdlPermitDate: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v), gdlIntermediateDate: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
    };
    const fields = Object.keys(guards.RR_SAVE_FIELDS);
    for (const p of Object.keys(PROFILES)) {
      const hostile = { tool: 'roadReady' }; fields.forEach((k) => { hostile[k] = PROFILES[p](); });
      const res = guards.rrSanitizeSave(hostile);
      expect(res.ok).toBe(true);
      Object.keys(res.apply).forEach((k) => {
        expect(fields, 'only table keys').toContain(k);
        if (typeOk[k]) expect(typeOk[k](res.apply[k]), p + ' -> ' + k + ' = ' + JSON.stringify(res.apply[k]).slice(0, 80)).toBe(true);
      });
      // and nothing that survives can crash a view
      const bad = quiet(() => VIEWS.map((v) => ({ view: v, crash: render(v, Object.assign({}, GATE, res.apply)) })).filter((x) => x.crash));
      expect(bad, p + ': ' + report(bad)).toEqual([]);
    }
    const res = guards.rrSanitizeSave({ tool: 'roadReady', logbook: 'x', carColor: 7, driverName: {}, licensePlate: ['A'], hudPreset: 'x', gdlBirthDate: '5/4/2010', totalDrives: -2 });
    expect(res.apply).toEqual({});
    expect(res.dropped.sort()).toEqual(['carColor', 'driverName', 'gdlBirthDate', 'hudPreset', 'licensePlate', 'logbook', 'totalDrives']);
  });

  it('old saves still load: older shapes are kept or trimmed, never refused', () => {
    const res = guards.rrSanitizeSave(Object.assign({ tool: 'roadReady' }, OLD_SAVE));
    expect(res.apply.logbook).toHaveLength(4);
    expect(res.apply.logbook[0].scenario).toBe('Residential');
    expect(res.apply.logbook[3].durationSec).toBeUndefined();
    expect(res.apply.lastReflection).toEqual({ text: 'Nice drive', at: 0 });
    expect(res.apply.pledgeSigned).toBe(true);
    expect(res.apply.scenariosDriven).toEqual({ residential: true, highway: 3 });
    expect(res.apply.drivingStats.safetyScore).toBe(90);
    expect(res.apply.lastRoadTest).toEqual({ score: 80, deductions: [] });
    expect(res.apply.bestGhosts['123'].score).toBe(150);
    expect(res.apply.permitStats).toEqual({ rules: { correct: 1 } });
    expect(res.apply.dailyChallenge.date).toBe('2025-01-01');
    const bad = quiet(() => VIEWS.map((v) => ({ view: v, crash: render(v, Object.assign({}, GATE, res.apply)) })).filter((x) => x.crash));
    expect(bad, report(bad)).toEqual([]);
  });
});

// ── mounted tests ──
let mounted = [];
async function mount(roadReady) {
  const config = window.StemLab._registry.roadReady;
  const state = { toolData: { roadReady } };
  const toasts = [];
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = H.makeCtx({
      toolData,
      addToast: (msg) => { toasts.push(String(msg)); },
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    });
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state, toasts };
  mounted.push(m);
  return m;
}
afterEach(async () => {
  for (const m of mounted) { try { await React.act(async () => { m.root.unmount(); }); } catch (e) {} m.host.remove(); }
  mounted = [];
  try { window.localStorage.clear(); } catch (e) {}
  delete window.__alloflowRoadReady;
  vi.restoreAllMocks();
});
const buttonByText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

describe('Load Progress with a damaged file (rb30)', () => {
  async function loadFile(m, payload) {
    const input = m.host.querySelector('#rr-load-progress-file');
    expect(input, 'Load Progress file input').toBeTruthy();
    const file = new window.File([typeof payload === 'string' ? payload : JSON.stringify(payload)], 'save.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await React.act(async () => { input.dispatchEvent(new window.Event('change', { bubbles: true })); await sleep(80); });
  }

  it('wrong types are skipped, unknown keys are dropped, good fields load, and the student is told', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, driverName: 'Kept', logbook: [{ scenario: 'Mine', durationSec: 60 }] });
    await loadFile(m, { tool: 'roadReady', logbook: 'x', carColor: 7, driverName: { a: 1 }, licensePlate: ['A'], hudPreset: 9, defensiveState: [null],
      badges: { first_drive: true }, totalDrives: 3, gdlBirthDate: '2010-05-04', evil: 'x', view: 'crashReplay' });
    const d = m.state.toolData.roadReady;
    expect(d.logbook).toEqual([{ scenario: 'Mine', durationSec: 60 }]);
    expect(d.driverName).toBe('Kept');
    expect(d.carColor).toBeUndefined();
    expect(d.licensePlate).toBeUndefined();
    expect(d.hudPreset).toBeUndefined();
    expect(d.defensiveState).toBeUndefined();
    expect('evil' in d).toBe(false);
    expect(d.view).toBe('menu');
    expect(d.badges).toEqual({ first_drive: true });
    expect(d.totalDrives).toBe(3);
    expect(d.gdlBirthDate).toBe('2010-05-04');
    expect(m.toasts.join('|')).toContain('Some parts of the file were damaged. Those parts were skipped.');
  });

  it('a clean file loads with no warning; permit progress also reaches device storage', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    await loadFile(m, { tool: 'roadReady', badges: { ten_drives: true }, permitStats: { signs: { correct: 4, total: 5 } }, permitMastery: { 12: true }, driverName: 'Sam' });
    const d = m.state.toolData.roadReady;
    expect(d.driverName).toBe('Sam');
    expect(d.permitStats).toEqual({ signs: { correct: 4, total: 5 } });
    expect(JSON.parse(window.localStorage.getItem('roadReady.permitStats.v1'))).toEqual({ signs: { correct: 4, total: 5 } });
    expect(JSON.parse(window.localStorage.getItem('roadReady.permitMastery.v1'))).toEqual({ 12: true });
    expect(m.toasts.join('|')).not.toContain('damaged');
    expect(m.toasts.join('|')).toContain('Loaded 1 badges');
  });

  it('not JSON, or a file from another tool: refused, state untouched', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true, driverName: 'Kept' });
    await loadFile(m, '{not json');
    await loadFile(m, { tool: 'beehive', driverName: 'Other' });
    expect(m.state.toolData.roadReady.driverName).toBe('Kept');
    expect(m.toasts.join('|')).toContain('Invalid save file.');
    expect(m.toasts.join('|')).toContain('Not a RoadReady save file.');
  });
});

describe('the "RoadReady Error" screen has a way out (rb30)', () => {
  // A record whose field throws when read: the logbook view fails while it adds up the hours.
  const brokenLogbook = () => { const rec = {}; Object.defineProperty(rec, 'durationSec', { enumerable: true, get() { if (brokenLogbook.armed) throw new Error('rb30 render boom'); return 60; } }); return [rec]; };

  it('Back to menu works while the page is still broken; the error text is inside <details>', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    brokenLogbook.armed = true;
    const m = await mount({ view: 'logbook', tourCompleted: true, logbook: brokenLogbook() });
    expect(m.host.textContent).toContain('RoadReady Error');
    expect(m.host.textContent).toContain('This page did not open. Go back to the menu, or try again.');
    const details = m.host.querySelector('details');
    expect(details, 'details element').toBeTruthy();
    expect(details.open).toBe(false);
    expect(details.querySelector('summary').textContent).toBe('Details for an adult');
    expect(details.textContent).toContain('rb30 render boom');
    const outside = m.host.cloneNode(true); outside.querySelector('details').remove();
    expect(outside.textContent).not.toContain('rb30 render boom');
    const back = m.host.querySelector('[data-rr-error-menu]');
    expect(back.tagName).toBe('BUTTON');
    expect(back.textContent).toBe('Back to menu');
    await React.act(async () => { back.click(); });
    expect(m.state.toolData.roadReady.view).toBe('menu');
    expect(m.host.textContent).not.toContain('RoadReady Error');
    expect(m.host.querySelector('#rr-load-progress-file'), 'the menu rendered').toBeTruthy();
  });

  it('Try again renders the page again: still broken stays on the screen, fixed opens the page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    brokenLogbook.armed = true;
    const m = await mount({ view: 'logbook', tourCompleted: true, logbook: brokenLogbook() });
    const retry = () => m.host.querySelector('[data-rr-error-retry]');
    expect(retry().textContent).toBe('Try again');
    await React.act(async () => { retry().click(); });
    expect(m.host.textContent).toContain('RoadReady Error');
    brokenLogbook.armed = false;
    await React.act(async () => { retry().click(); });
    expect(m.host.textContent).not.toContain('RoadReady Error');
    expect(m.host.textContent).toContain('Driving Logbook');
    expect(m.state.toolData.roadReady.view).toBe('logbook');
  });
});

describe('shared devices: the save file warning and Start fresh (rb30)', () => {
  const student = () => ({ view: 'menu', tourCompleted: true, driverName: 'Sam', licensePlate: 'MAINE07', pledgeSigned: 1700000000000,
    gdlBirthDate: '2010-05-04', gdlPermitDate: '2026-01-10', gdlIntermediateDate: '2026-08-01', badges: { first_drive: true },
    logbook: [{ scenario: 'Residential', durationSec: 300, safetyScore: 90, efficiencyScore: 80 }], lastReflection: { text: 'private note', at: 1 },
    permitStats: { signs: { correct: 4, total: 5 } }, permitMastery: { 12: true }, parkingBest: { parallel: 90 }, calmDrive: true, rideAlong: true });
  const seedStorage = () => {
    window.localStorage.setItem('roadReady.permitStats.v1', JSON.stringify({ signs: { correct: 4, total: 5 } }));
    window.localStorage.setItem('roadReady.parkingBest.v1', JSON.stringify({ parallel: 90 }));
    window.localStorage.setItem('roadReady.permitMastery.v1', JSON.stringify({ 12: true }));
    window.localStorage.setItem('someOtherTool.v1', 'keep me');
  };

  it('the Save Progress panel says what the file holds, and no longer says "no PII"', async () => {
    const m = await mount(student());
    const note = m.host.querySelector('#rr-save-privacy-note');
    expect(note, 'privacy sentence').toBeTruthy();
    expect(note.textContent).toBe('This file includes the name and dates you typed. Keep it private.');
    expect(m.host.textContent).not.toContain('no PII');
    expect(SRC).not.toContain('No account, no PII');
  });

  it('Start fresh asks first; "Keep my progress" has the focus and changes nothing', async () => {
    seedStorage();
    const m = await mount(student());
    const btn = m.host.querySelector('#rr-start-fresh-btn');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.textContent).toBe('Start fresh');
    expect(document.getElementById(btn.getAttribute('aria-describedby')).textContent).toContain('shared device');
    await React.act(async () => { btn.click(); });
    expect(m.state.toolData.roadReady.driverName, 'one click clears nothing').toBe('Sam');
    const ask = m.host.querySelector('#rr-start-fresh-ask');
    expect(ask.textContent).toContain('Clear Road Ready on this device?');
    expect(ask.textContent).toContain('You cannot undo this.');
    const no = m.host.querySelector('#rr-start-fresh-no');
    expect(document.activeElement).toBe(no);
    await React.act(async () => { no.click(); });
    expect(m.host.querySelector('#rr-start-fresh-ask')).toBeNull();
    expect(document.activeElement, 'focus returns to the Start fresh button').toBe(m.host.querySelector('#rr-start-fresh-btn'));
    expect(m.state.toolData.roadReady.driverName).toBe('Sam');
    LS_KEYS.forEach((k) => expect(window.localStorage.getItem(k), k).not.toBeNull());
  });

  it('"Yes, clear everything" clears the state, the window mirror and the three storage keys, and says so', async () => {
    seedStorage();
    const m = await mount(student());
    await React.act(async () => { await sleep(0); });
    expect(window.__alloflowRoadReady.permitMastery).toEqual({ 12: true });
    await React.act(async () => { m.host.querySelector('#rr-start-fresh-btn').click(); });
    // the tool's announcer clears the live region, then writes the text 25 ms later
    await React.act(async () => { m.host.querySelector('#rr-start-fresh-yes').click(); await sleep(120); });
    const d = m.state.toolData.roadReady;
    expect(d.view).toBe('menu');
    const left = Object.keys(d).filter((k) => k !== 'view' && d[k] !== undefined);
    expect(left, 'state left behind').toEqual([]);
    LS_KEYS.forEach((k) => expect(window.localStorage.getItem(k), k).toBeNull());
    expect(window.localStorage.getItem('someOtherTool.v1'), 'other tools untouched').toBe('keep me');
    expect(window.__alloflowRoadReady.permitMastery).toEqual({});
    expect(window.__alloflowRoadReady.permitStats).toEqual({});
    expect(window.__alloflowRoadReady.parkingBest).toBeNull();
    expect(m.toasts).toContain('Road Ready was cleared on this device.');
    const said = [...document.querySelectorAll('[aria-live]')].map((n) => n.textContent).join('|');
    expect(said).toContain('Road Ready was cleared on this device.');
    expect(m.host.textContent).not.toContain('Sam');
    expect(m.host.querySelector('#rr-start-fresh-ask')).toBeNull();
    expect(document.activeElement).toBe(m.host.querySelector('#rr-start-fresh-btn'));
  });

  it('after Start fresh a remount (the next student opening the tool) finds nothing in device storage', async () => {
    seedStorage();
    const m = await mount(student());
    await React.act(async () => { m.host.querySelector('#rr-start-fresh-btn').click(); });
    await React.act(async () => { m.host.querySelector('#rr-start-fresh-yes').click(); await sleep(20); });
    await React.act(async () => { m.root.unmount(); });
    m.host.remove(); mounted = [];
    delete window.__alloflowRoadReady;
    const next = await mount({ view: 'menu', tourCompleted: true });
    await React.act(async () => { await sleep(0); });
    const d = next.state.toolData.roadReady;
    expect(d.permitStats).toBeUndefined();
    expect(d.permitMastery).toBeUndefined();
    expect(d.parkingBest).toBeUndefined();
  });
});
