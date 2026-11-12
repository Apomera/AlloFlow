import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 32, lane persist. The REAL STEAM Lab hub (STEM_HUB) with the REAL Road Ready
// (ROADREADY_SOURCE), mounted the way tests/roadready_hm25_host_voice.test.js does, with the
// real localStorage between "visits" (unmount, new mount from empty state = a page reload):
// - progress and settings come back, the first-run tour does not replay, typed text is gone;
// - Start fresh empties what the host stored;
// - a hostile or old stored blob opens every view without the error screen;
// - the Progress panel says what this device keeps, and only when a host that keeps it runs.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
const KEY = 'alloflow_stemlab_v2';
const TOOL_SRC = readFileSync(TOOL, 'utf8');
const HUB_SRC = readFileSync(HUB, 'utf8');
const VIEWS = Array.from(new Set(Array.from(TOOL_SRC.matchAll(/^\s*if \(view === '([A-Za-z]+)'/gm)).map((m) => m[1])));
let H, React, ReactDOMClient;
beforeAll(async () => {
  H = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ React, ReactDOMClient } = H);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const Icon = () => null;
let root, host, live;
function Harness({ seed }) {
  const [stemLabTool, setStemLabTool] = React.useState('roadReady');
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState(seed);
  live = { labToolData, setLabToolData };
  const base = {
    labToolData, setLabToolData, toolSnapshots: [], addToast: () => {}, t: () => undefined,
    stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
    activeStation: null, callGemini: null, callTTS: () => new Promise(() => {}), isTeacherMode: false,
  };
  const props = new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string' && /^[A-Z]/.test(key)) return Icon;
      if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
      return undefined;
    },
  });
  return window.AlloModules.StemLab(props);
}
const flush = async (n = 4) => { for (let i = 0; i < n; i++) await React.act(async () => { await sleep(0); }); };
const wait = (ms) => React.act(async () => { await sleep(ms); });
const click = async (el) => { await React.act(async () => { el.click(); }); await flush(); };
const rr = () => (live.labToolData && live.labToolData.roadReady) || {};
const setRR = async (patch) => { await React.act(async () => { live.setLabToolData((p) => Object.assign({}, p, { roadReady: Object.assign({}, p.roadReady, patch) })); }); await flush(); };
const stored = () => localStorage.getItem(KEY) || '';
const everything = () => Object.keys(localStorage).map((k) => k + '=' + localStorage.getItem(k)).join('\n');
const buttonByText = (text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

// A page load: fresh module state, empty React state, whatever is in localStorage.
async function openPage(seed) {
  global.React = window.React = React;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  delete window.StemLab; delete window.__stemPluginComponents; delete window.__alloflowRoadReady; delete window.__alloflowRoadReadyBank; delete window.__alloStemSavesRoadReady;
  new Function(HUB_SRC)();
  new Function(TOOL_SRC)();
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => root.render(React.createElement(Harness, { seed: seed || {} })));
  await flush();
}
// Closing the page: the hub's saver flushes on unmount, as it does on pagehide.
async function closePage() {
  if (root) await React.act(async () => root.unmount());
  if (host) host.remove();
  root = host = null;
}
// jsdom has no 2D canvas: the badge confetti draws into a stand-in so a real award does not throw in a frame callback.
const fakeCtx = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
beforeEach(() => { localStorage.clear(); vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(fakeCtx); vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(async () => { await closePage(); localStorage.clear(); vi.restoreAllMocks(); delete window.__alloStemSavesRoadReady; });

const NAME = 'Maria Lopez-Ortiz';
const REFLECTION = 'I braked too late near the school.';
const DRIVE_AT = new Date(2026, 10, 9, 15, 42, 7).getTime();
const typed = () => ({ driverName: NAME, licensePlate: 'MARIA 07', gdlBirthDate: '2010-05-04', gdlPermitDate: '2026-01-10', pledgeSigned: 1762700000000, lastReflection: { text: REFLECTION, at: 1 },
  brakingHunt: { hypothesis: 'wet roads are slower' }, badges: { first_drive: true, no_crash: true, 'Maria Lopez-Ortiz': true } });
const drive = () => ({ scenario: 'Residential Street', scenarioId: 'residential', vehicle: 'Compact Sedan', conditions: { weather: 'clear', time: 'day', traffic: 'light', speedLimit: 25 },
  startedAt: DRIVE_AT - 302000, endedAt: DRIVE_AT, durationSec: 302, entries: [{ t: 0, kind: 'start', icon: 'K', text: 'Drive started' }], safetyScore: 91, efficiencyScore: 84, qualifyingSession: true, outcome: 'Safe drive' });

describe('real hub + real Road Ready: a reload keeps progress and settings (ps32)', () => {
  it('first visit: the tour shows; skip it, change settings, earn progress, type a name; reload: kept, tour not replayed, name gone', async () => {
    await openPage();
    await wait(150);
    expect(rr().view, 'a first-time student is taken to the tour').toBe('tour');
    await click(buttonByText('Skip tour'));
    expect(rr().view).toBe('menu');
    expect(rr().tourCompleted).toBe(true);
    // settings, by their real controls
    await click(host.querySelector('input[data-rr-instructor-voice]'));
    expect(rr().instructorVoice).toBe(false);
    const gfx = host.querySelector('select[data-rr-gfx-quality]');
    await React.act(async () => { gfx.value = 'low'; gfx.dispatchEvent(new window.Event('change', { bubbles: true })); });
    expect(rr().gfxQuality).toBe('low');
    // progress and typed text, as the views write them
    await setRR(Object.assign(typed(), { totalDrives: 3, scenariosDriven: { residential: { bestSafety: 91, lastSafety: 91, driveCount: 3, lastOutcome: 'Safe drive' } }, logbook: [drive()], hudTextScale: 1.32, calmDrive: true }));
    await wait(600); // the host saves 400 ms after a change
    const raw = stored();
    expect(raw).toContain('"roadReady"');
    expect(raw).toContain('first_drive');
    [NAME, 'Maria', 'Lopez', 'MARIA', '2010-05-04', '2026-01-10', REFLECTION, 'braked', 'wet roads', 'Residential Street', 'Safe drive'].forEach((s) => {
      expect(everything().includes(s), 'in device storage: ' + s).toBe(false);
    });

    await closePage();
    await openPage();
    await wait(200);
    const d = rr();
    expect(d.view === undefined || d.view === 'menu', 'the tour does not replay (view=' + d.view + ')').toBe(true);
    expect(host.textContent).not.toContain('Skip tour');
    expect(document.getElementById('rr-badge-popup'), 'badges from an earlier visit are not celebrated again').toBeNull();
    expect(d.tourCompleted).toBe(true);
    expect(d.badges).toEqual({ first_drive: true, no_crash: true });
    expect(d.totalDrives).toBe(3);
    expect(d.scenariosDriven).toEqual({ residential: { bestSafety: 91, lastSafety: 91, driveCount: 3 } });
    expect(d.instructorVoice).toBe(false);
    expect(d.gfxQuality).toBe('low');
    expect(d.hudTextScale).toBe(1.32);
    expect(d.calmDrive).toBe(true);
    expect(host.querySelector('input[data-rr-instructor-voice]').checked).toBe(false);
    expect(host.querySelector('select[data-rr-gfx-quality]').value).toBe('low');
    ['driverName', 'licensePlate', 'gdlBirthDate', 'gdlPermitDate', 'pledgeSigned', 'lastReflection', 'brakingHunt'].forEach((k) => expect(d[k], k).toBeUndefined());
    expect(JSON.stringify(live.labToolData).includes('Maria')).toBe(false);
    expect(host.textContent).not.toContain('Maria');
    // the logbook line is back with what the views read; the clock time and event text were not kept
    expect(d.logbook).toHaveLength(1);
    expect(d.logbook[0]).toMatchObject({ scenario: 'Residential Street', scenarioId: 'residential', durationSec: 302, safetyScore: 91, efficiencyScore: 84, day: '2026-11-09', dayOnly: true, entries: [] });
    expect(new Date(d.logbook[0].endedAt).getDate()).toBe(9);

    // a second reload with no change in between keeps the same thing (nothing decays)
    const before = stored();
    await wait(600);
    await closePage();
    expect(JSON.parse(stored()).roadReady).toEqual(JSON.parse(before).roadReady);
    await openPage();
    await wait(200);
    expect(rr().logbook[0]).toMatchObject({ scenario: 'Residential Street', durationSec: 302, day: '2026-11-09' });
    expect(rr().badges).toEqual({ first_drive: true, no_crash: true });
  });

  it('the restored logbook reads well: course name and day, no made-up time or event count; hours still add up', async () => {
    localStorage.setItem(KEY, JSON.stringify({ roadReady: { tourCompleted: true, logbook: [
      { scenario: 'residential', durationSec: 1800, safetyScore: 91, efficiencyScore: 84, day: '2026-11-09' },
      { scenario: 'rain', durationSec: 1800, safetyScore: 70, efficiencyScore: 60, day: '2026-11-08', qualifyingSession: false }] } }));
    await openPage();
    await wait(100);
    await setRR({ view: 'logbook' });
    const text = host.textContent;
    expect(text).not.toContain('RoadReady Error');
    expect(text).toContain('Residential Street');
    expect(text).toContain('Rain');
    expect(text).toContain('2 sessions · 1.0 hours in the simulator');
    expect(text).toContain(new Date(2026, 10, 9, 12).toLocaleDateString());
    expect(text).not.toMatch(/12:00/);
    expect(text).not.toContain('0 events');
    expect(text).toContain('30m 0s');
    // the session that did not qualify still does not count on the certificate
    expect(rr().logbook[1].qualifyingSession).toBe(false);
    for (const v of ['analytics', 'gdlTracker', 'certificate', 'menu']) { await setRR({ view: v }); expect(host.textContent, v).not.toContain('RoadReady Error'); }
  });

  it('Start fresh empties what the host stored, and the next visit is a first visit', async () => {
    localStorage.setItem(KEY, JSON.stringify({ wave: { amplitude: 2 }, roadReady: { tourCompleted: true, badges: { first_drive: true }, totalDrives: 2, calmDrive: true } }));
    await openPage();
    await wait(100);
    expect(rr().badges).toEqual({ first_drive: true });
    await setRR(typed());
    await wait(600);
    expect(stored()).toContain('first_drive');
    await click(host.querySelector('#rr-start-fresh-btn'));
    await click(host.querySelector('#rr-start-fresh-yes'));
    await wait(600);
    const saved = JSON.parse(stored());
    expect('roadReady' in saved, 'Road Ready bucket still stored: ' + stored().slice(0, 200)).toBe(false);
    expect(saved.wave, 'other tools keep their save').toEqual({ amplitude: 2 });
    expect(everything()).not.toContain('first_drive');
    expect(everything()).not.toContain('Maria');
    await closePage();
    expect('roadReady' in JSON.parse(stored())).toBe(false);
    await openPage();
    await wait(200);
    expect(rr().badges).toBeUndefined();
    expect(rr().view, 'the next student gets the tour').toBe('tour');
  });

  it('Start fresh right before the page closes (inside the 400 ms save window) still wins', async () => {
    localStorage.setItem(KEY, JSON.stringify({ roadReady: { tourCompleted: true, badges: { first_drive: true } } }));
    await openPage();
    await wait(100);
    await setRR({ badges: { first_drive: true, no_crash: true } }); // schedules a save of the old progress
    await click(host.querySelector('#rr-start-fresh-btn'));
    await React.act(async () => { host.querySelector('#rr-start-fresh-yes').click(); });
    await closePage(); // no waiting: the pending save must carry the cleared state
    expect(stored()).not.toContain('first_drive');
    expect('roadReady' in JSON.parse(stored())).toBe(false);
    await sleep(700);
    expect(stored()).not.toContain('first_drive');
  });
});

describe('the Progress panel says what this device keeps (ps32)', () => {
  const KEPT = 'This device keeps your progress and settings by itself: badges, drive counts, logbook scores and your display choices. It does not keep your name, plate or dates. Those are only in the file you save.';
  // ms34: in a host that does not save Road Ready the tool still keeps its permit practice itself, and says so.
  const NOT_KEPT = 'This device keeps your permit practice and parking scores by itself. It does not keep badges, drives, the logbook or settings after you close the page. Save a file to keep them.';
  it('inside the hub that saves it: progress and settings are kept, name, plate and dates are not', async () => {
    localStorage.setItem(KEY, JSON.stringify({ roadReady: { tourCompleted: true } }));
    await openPage();
    await wait(100);
    const note = host.querySelector('#rr-save-kept-note');
    expect(note, 'the sentence').toBeTruthy();
    expect(note.textContent).toBe(KEPT);
    expect(host.querySelector('#rr-save-privacy-note').textContent).toBe('This file includes the name and dates you typed. Keep it private.');
  });
  it('in a host that does not save Road Ready (an older hub, a Canvas paste): it says so instead of promising', () => {
    delete window.__alloStemSavesRoadReady;
    H.resetStemLab();
    H.loadTool(TOOL, 'roadReady');
    const html = H.renderTool('roadReady', { roadReady: { view: 'menu', tourCompleted: true } });
    expect(html).toContain(NOT_KEPT);
    expect(html).not.toContain('This device keeps your progress');
  });
  it('the hub raises the flag only where its saver runs', () => {
    const block = HUB_SRC.slice(HUB_SRC.indexOf('function _createStemAutosave()'), HUB_SRC.indexOf('// STEM_AUTOSAVE_END'));
    expect(block).toContain('window.__alloStemSavesRoadReady = true');
    expect(HUB_SRC.split('__alloStemSavesRoadReady').length).toBe(2);
  });
});

describe('a hostile or old stored blob crashes nothing (ps32)', () => {
  const SAVED = ['badges', 'scenariosDriven', 'weathersDriven', 'completedTrips', 'preTripChecks', 'totalDrives', 'rideshareTotal', 'tourCompleted', 'reducedMotion', 'calmDrive',
    'realMirrors', 'rideAlong', 'instructorVoice', 'hudPreset', 'hudTextScale', 'gfxQuality', 'carColor', 'permitFlashHistory', 'permitMastery', 'dailyChallenge', 'logbook'];
  const OTHER = ['drivingStats', 'lastJournal', 'bestGhosts', 'lastRoadTest', 'lastParentReport', 'maintenanceGame', 'defensiveState', 'driverName', 'licensePlate', 'lastReflection', 'pledgeSigned',
    'permitStats', 'permitStudy', 'parkingBest', 'gdlBirthDate', 'permit', 'view', 'scenario', 'vehicle', 'freeExploreScenario', 'roadTestStage', 'lesson'];
  const PROFILES = {
    string: () => 'x', longString: () => '<img src=x onerror=alert(1)>'.repeat(40), number: () => 7, negative: () => -5, huge: () => 1e308, bool: () => true, nul: () => null,
    array: () => [1, 'a', null, {}], arrayOfNull: () => [null, null], emptyObject: () => ({}),
    nestedNull: () => ({ a: null, residential: null, first_drive: null, clear: null, lighthouse_loop: null, tire_psi: null, 3: null, date: null, streak: null, rides: null, earnings: null }),
    nestedWrongTypes: () => ({ residential: 'x', first_drive: 'x', clear: {}, lighthouse_loop: 5, tire_psi: 'yes', 3: 'x', date: {}, done: 'x', streak: 'NaN', rides: 'x', earnings: 'x', scenario: 5, durationSec: 'x', day: 7 }),
    nanNumbers: () => ({ residential: { bestSafety: NaN, lastSafety: NaN, driveCount: NaN }, lighthouse_loop: { timeSec: NaN }, 3: { correct: NaN, wrong: NaN }, date: '2026-11-09', streak: NaN, rides: NaN, earnings: NaN }),
    logRows: () => [null, 'x', 7, {}, { durationSec: 'x' }, { durationSec: 60, day: 'not a day', scenario: 'nowhere' }, { durationSec: 60, day: '9999-99-99', safetyScore: NaN }, { durationSec: 1e9, startedAt: 'x', endedAt: {} }, { durationSec: 30, day: '2026-02-31', scenario: 'rain' }],
    typed: () => 'Maria Lopez-Ortiz typed this',
  };
  function crashOf(html) {
    const i = html.indexOf('RoadReady Error');
    return i === -1 ? null : html.slice(i, i + 700).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(16, 240);
  }
  function hubApi() {
    const cutBlock = (a, b) => HUB_SRC.slice(HUB_SRC.indexOf(a), HUB_SRC.indexOf(b));
    const win = new EventTarget(), doc = new EventTarget();
    return Function('window', 'document', 'localStorage', 'JSON', cutBlock('// BEEHIVE_PERSISTENCE_HELPER_START', '// BEEHIVE_PERSISTENCE_HELPER_END') + cutBlock('// STEM_AUTOSAVE_START', '// STEM_AUTOSAVE_END') +
      '\nreturn { hydrate: _stemHydrateLabToolData };')(win, doc, { getItem: () => null, setItem() {} }, JSON);
  }
  const quiet = (fn) => { const e = console.error; console.error = () => {}; try { return fn(); } finally { console.error = e; } };

  it('every wrong value in every stored field, through the host and into all ' + VIEWS.length + ' views: no error screen, no typed text left', () => {
    expect(VIEWS.length).toBeGreaterThanOrEqual(91);
    H.resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    H.loadTool(TOOL, 'roadReady');
    const guards = window.__RR_TEST_EXPORTS__.roadReadySaveGuards;
    const hub = hubApi();
    const bad = [];
    quiet(() => {
      for (const p of Object.keys(PROFILES)) {
        const blob = {}; SAVED.concat(OTHER).forEach((k) => { blob[k] = PROFILES[p](); });
        const state = hub.hydrate({}, JSON.parse(JSON.stringify({ roadReady: blob }))).roadReady || {};
        expect(JSON.stringify(state).includes('Maria'), p).toBe(false);
        expect(JSON.stringify(state).includes('onerror'), p).toBe(false);
        OTHER.forEach((k) => expect(k in state, p + ' restored ' + k).toBe(false));
        // what the tool does with it when it opens: clear wrong types, give logbook lines their display fields
        const damaged = guards.rrDamagedSavedKeys(state);
        const opened = Object.assign({}, state); damaged.forEach((k) => { delete opened[k]; });
        const lines = guards.rrRestoreLogbook(opened.logbook); if (lines) opened.logbook = lines;
        for (const v of VIEWS) {
          for (const data of [state, opened]) {
            let c; try { c = crashOf(H.renderTool('roadReady', { roadReady: Object.assign({ view: v }, data) })); } catch (e) { c = 'THROW ' + String(e && e.message).slice(0, 160); }
            if (c) bad.push({ profile: p, view: v, opened: data === opened, crash: c });
          }
        }
      }
    });
    expect(bad, bad.length + ' crashes\n' + bad.slice(0, 20).map((x) => JSON.stringify(x)).join('\n')).toEqual([]);
  });

  it('the tool-side guards never throw on garbage, and only rewrite lines the host trimmed', () => {
    H.resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    H.loadTool(TOOL, 'roadReady');
    const g = window.__RR_TEST_EXPORTS__.roadReadySaveGuards;
    [null, undefined, 7, 'x', {}, [], [null, 'x', 7, {}], [{ day: 5 }], [{ day: '2026-11-09', startedAt: 5 }]].forEach((v) => expect(g.rrRestoreLogbook(v), JSON.stringify(v)).toBeNull());
    const full = { scenario: 'Residential Street', startedAt: 1, endedAt: 2, durationSec: 60, entries: [{ t: 0 }] };
    const out = g.rrRestoreLogbook([full, { scenario: 'snow', durationSec: 90, safetyScore: 80, efficiencyScore: 70, day: '2026-01-05' }, { durationSec: 'x', day: '2026-01-06', scenario: 'Maria' }]);
    expect(out[0]).toBe(full);
    expect(out[1]).toMatchObject({ scenario: 'Maine Snow', scenarioId: 'snow', durationSec: 90, safetyScore: 80, efficiencyScore: 70, day: '2026-01-05', dayOnly: true, entries: [] });
    expect(new Date(out[1].startedAt).getHours()).toBe(12);
    expect(out[1].endedAt - out[1].startedAt).toBe(90000);
    expect(out[2]).toMatchObject({ scenario: undefined, durationSec: 0, dayOnly: true });
    expect(JSON.stringify(out[2])).not.toContain('Maria');
    expect(g.rrRestoreLogbook(out), 'a second pass changes nothing').toBeNull();
    [null, 7, 'x', []].forEach((v) => expect(g.rrDamagedSavedKeys(v)).toEqual([]));
    expect(g.rrDamagedSavedKeys({ logbook: 'x', hudPreset: 9, badges: 'x', totalDrives: -1, carColor: 'red', driverName: 'Sam', view: 'menu', dailyChallenge: null }).sort()).toEqual(['badges', 'carColor', 'hudPreset', 'logbook', 'totalDrives']);
  });

  it('mounted in the real hub from a damaged blob: the menu opens, and each screen that reads saved state opens', async () => {
    const blob = {}; SAVED.concat(OTHER).forEach((k) => { blob[k] = PROFILES.nestedWrongTypes(); });
    blob.logbook = PROFILES.logRows(); blob.tourCompleted = true;
    localStorage.setItem(KEY, JSON.stringify({ roadReady: blob }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await openPage();
    await wait(150);
    expect(host.textContent).not.toContain('RoadReady Error');
    expect(host.querySelector('#rr-start-fresh-btn'), 'the menu rendered').toBeTruthy();
    for (const v of ['logbook', 'analytics', 'gdlTracker', 'certificate', 'achievementGallery', 'lessonPath', 'learningPath', 'preTrip', 'permitFlashcards', 'dailyChallenge', 'freeExploreSetup', 'customize', 'scenarioSelect', 'menu']) {
      await setRR({ view: v });
      expect(host.textContent, v).not.toContain('RoadReady Error');
    }
    // not JSON at all: the lab still opens and Road Ready starts empty
    await closePage();
    localStorage.setItem(KEY, '{not json');
    await openPage();
    await wait(200);
    expect(host.textContent).not.toContain('RoadReady Error');
    expect(rr().view).toBe('tour');
  });

  it('an OLDER host that hands the tool raw state (no filter): the tool clears wrong types itself when it opens', async () => {
    H.resetStemLab();
    H.loadTool(TOOL, 'roadReady');
    const config = window.StemLab._registry.roadReady;
    const state = { toolData: { _persisted: true, roadReady: { view: 'menu', tourCompleted: true, logbook: 'x', hudPreset: 9, badges: 'x', totalDrives: -1, driverName: 'Sam',
      scenariosDriven: { residential: { bestSafety: 90 } } } } };
    function Host() {
      const [toolData, setToolData] = React.useState(state.toolData);
      state.toolData = toolData;
      return config.render(H.makeCtx({ toolData,
        update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
        updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })) }));
    }
    vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.append(host);
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Host)));
    await flush();
    const d = state.toolData.roadReady;
    ['logbook', 'hudPreset', 'badges', 'totalDrives'].forEach((k) => expect(d[k], k).toBeUndefined());
    expect(d.driverName, 'healthy fields are left alone').toBe('Sam');
    expect(d.scenariosDriven).toEqual({ residential: { bestSafety: 90 } });
    expect(host.textContent).not.toContain('RoadReady Error');
  });
});
