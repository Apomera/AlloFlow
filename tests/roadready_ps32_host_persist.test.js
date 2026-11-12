import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 32, lane persist. The STEAM Lab host keeps Road Ready progress and settings between
// visits, and nothing a student typed. This file runs the host's real save code (the
// STEM_AUTOSAVE block cut from the hub, the way tests/helpers/math_review3_autosave_fixtures.js
// does) with realistic and hostile Road Ready state:
// - the privacy proof: no typed string, and no string with whitespace at all, reaches storage,
//   not as a value and not as a map key; a hand-edited stored blob loses them on the way back in;
// - the round trip keeps badges, settings, drive counts and a trimmed logbook;
// - the host's id lists are pinned against the tool's own tables;
// - a save that was scheduled before "Start fresh" never writes the old state afterwards.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
const KEY = 'alloflow_stemlab_v2';
const HUB_SRC = readFileSync(HUB, 'utf8');
const TOOL_SRC = readFileSync(TOOL, 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b); if (i === -1 || j === -1) throw new Error('marker missing: ' + a); return src.slice(i, j); };

function memoryStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)); }, removeItem: (k) => { map.delete(k); }, map };
}
function loadHub(storage) {
  const code = cut(HUB_SRC, '// BEEHIVE_PERSISTENCE_HELPER_START', '// BEEHIVE_PERSISTENCE_HELPER_END') + cut(HUB_SRC, '// STEM_AUTOSAVE_START', '// STEM_AUTOSAVE_END');
  const win = new EventTarget(), doc = new EventTarget();
  doc.hidden = false;
  const store = storage || memoryStorage();
  const api = Function('window', 'document', 'localStorage', 'JSON', code +
    '\nreturn { payload: _stemPersistencePayload, createSaver: _createStemAutosave, hydrate: _stemHydrateLabToolData,' +
    ' road: typeof _ROAD_READY_SAVED === "object" ? _ROAD_READY_SAVED : null,' +
    ' lists: typeof _RR_BADGES === "object" ? { badges: _RR_BADGES, scenarios: _RR_SCENARIOS, weathers: _RR_WEATHERS, trips: _RR_TRIPS, pretrip: _RR_PRETRIP } : null };')(win, doc, store, JSON);
  api.storage = store; api.win = win; api.doc = doc;
  return api;
}
// What the host writes for this lab state: the real saver, its real 400 ms timer.
function written(toolData) {
  const hub = loadHub();
  const saver = hub.createSaver();
  saver.queue(Object.assign({ _persisted: true }, toolData));
  saver.flush();
  saver.dispose();
  return hub.storage.getItem(KEY) || '';
}
// Every string in a JSON value, keys included.
function allStrings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === 'object') Object.keys(v).forEach((k) => { out.push(k); allStrings(v[k], out); });
  return out;
}

let RR, guards;
beforeAll(async () => {
  window.__RR_TEST_EXPORTS__ = {};
  const H = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  H.resetStemLab();
  H.loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  guards = window.__RR_TEST_EXPORTS__.roadReadySaveGuards;
});
afterEach(() => { vi.useRealTimers(); });

// ── a realistic student: progress, settings, and everything they typed ──
const NAME = 'Maria Lopez-Ortiz';
const PLATE = 'MARIA 07';
const REFLECTION = 'I braked too late near the school because I was looking at my phone.';
const TYPED = [NAME, 'Maria', 'Lopez', PLATE, 'MARIA', REFLECTION, 'braked', '2010-05-04', '2026-01-10', '2026-08-01', 'My hypothesis about wet roads', 'hypothesis',
  'Coach, why did I skid?', 'skid', 'Grandma Rosa', 'Rosa', 'Smooth stops', 'Residential Street', 'Safe drive'];
const DRIVE_AT = new Date(2026, 10, 9, 15, 42, 7).getTime(); // 9 Nov 2026, 3:42 pm local
function student() {
  return {
    view: 'customize', scenario: 'residential', vehicle: 'sedan',
    // progress
    badges: { first_drive: true, ten_drives: true, road_test_pass: 1762700000000, 'Maria Lopez-Ortiz': true, Maria: true, speed_demon: true },
    scenariosDriven: { residential: { bestSafety: 92, lastSafety: 88, driveCount: 3, lastOutcome: 'Safe drive' }, rain: { bestSafety: 71, lastSafety: 71, driveCount: 1 }, 'Maria Lopez-Ortiz': { bestSafety: 99 }, Rosa: { driveCount: 2 } },
    weathersDriven: { clear: true, rain: true, 'Grandma Rosa': true },
    totalDrives: 4,
    completedTrips: { lighthouse_loop: { at: 1762700000000, timeSec: 412 }, 'Maria trip': { timeSec: 5 } },
    rideshareTotal: { rides: 3, earnings: 41.5, rider: NAME },
    preTripChecks: { tire_psi: true, lights_head: true, defog: false, 'Maria Lopez-Ortiz': true },
    permitFlashHistory: { 3: { correct: 2, wrong: 1, lastSeen: 1762700000000 }, 17: { correct: 0, wrong: 2, lastSeen: 1762700000001 }, 'Maria Lopez-Ortiz': { correct: 1, wrong: 0 }, 'What does a red octagon mean?': { correct: 1, wrong: 0 } },
    dailyChallenge: { date: '2026-11-09', done: true, streak: 3, challengeTitle: 'Smooth stops' },
    logbook: [
      { scenario: 'Residential Street', scenarioId: 'residential', vehicle: 'Compact Sedan', conditions: { weather: 'clear', time: 'day', traffic: 'light', speedLimit: 25 }, startedAt: DRIVE_AT - 302000, endedAt: DRIVE_AT, durationSec: 302,
        entries: [{ t: 0, kind: 'start', icon: 'K', text: 'Drive started with Maria Lopez-Ortiz' }], safetyScore: 91, efficiencyScore: 84, freeExplore: false, qualifyingSession: true, outcome: 'Safe drive', driver: NAME },
      { scenario: 'Rain', scenarioId: 'rain', vehicle: 'Compact Sedan', startedAt: DRIVE_AT + 1000, endedAt: DRIVE_AT + 46000, durationSec: 45, entries: [], safetyScore: 60, efficiencyScore: 70, qualifyingSession: false, outcome: 'Practice sample' },
    ],
    tourCompleted: true,
    // settings
    reducedMotion: true, calmDrive: true, hudPreset: 'science', hudTextScale: 1.18, realMirrors: false, rideAlong: true, instructorVoice: false, gfxQuality: 'low', carColor: '#22d3ee',
    // typed, or holding typed text: must never be kept
    driverName: NAME, licensePlate: PLATE, gdlBirthDate: '2010-05-04', gdlPermitDate: '2026-01-10', gdlIntermediateDate: '2026-08-01', pledgeSigned: 1762700000000,
    lastReflection: { text: REFLECTION, at: 1762700000000 }, brakingHunt: { hypothesis: 'My hypothesis about wet roads', explanation: REFLECTION },
    coachResponse: 'Coach, why did I skid? ' + REFLECTION, helpQuery: 'skid', guideQuiz: { answers: { a: 'Grandma Rosa' } }, worldSeed: 20100504,
    lastJournal: { scenario: 'Residential Street', vehicle: 'Compact Sedan', entries: [{ t: 0, kind: 'start', icon: 'K', text: 'Drive started' }] },
    drivingStats: { scenario: 'Residential Street', vehicle: 'Compact Sedan', time: '5:02', safetyScore: 91, outcome: { label: 'Safe drive' } },
    lastRoadTest: { score: 88, scenario: 'Residential Street', deductions: [{ type: 'speed', points: 4 }] },
    lastParentReport: { scenario: 'Residential Street', errors: [{ category: 'Grandma Rosa' }] },
    bestGhosts: { 20100504: { score: 175, path: [{ x: 1, y: 2 }], durationSec: 302, savedAt: 1762700000000, tripId: null } },
    maintenanceGame: { oil: { answered: 1, correct: true } }, defensiveState: { tailgater: { answered: 0, correct: false } },
    permitStats: { signs: { correct: 4, total: 5 } }, permitMastery: { 'What does a red octagon mean?': true }, permitStudy: { misses: { 3: { n: 1, d: '2026-11-09' } }, cards: {} },
    parkingBest: { parallel: 90 }, coachMode: true, highBeams: true,
  };
}

describe('host save of Road Ready: progress and settings only (ps32)', () => {
  it('the hub has a Road Ready table, and roadReady is one of the buckets the saver watches', () => {
    const hub = loadHub();
    expect(hub.road, '_ROAD_READY_SAVED').toBeTruthy();
    const saver = hub.createSaver();
    saver.queue({ _persisted: true, roadReady: { badges: { first_drive: true } } });
    saver.flush();
    expect(JSON.parse(hub.storage.getItem(KEY)).roadReady).toEqual({ badges: { first_drive: true } });
    // a change to Road Ready alone is enough to schedule the next write
    saver.queue({ _persisted: true, roadReady: { badges: { first_drive: true, ten_drives: true } } });
    saver.flush();
    expect(JSON.parse(hub.storage.getItem(KEY)).roadReady.badges).toEqual({ first_drive: true, ten_drives: true });
    saver.dispose();
  });

  it('PRIVACY: nothing the student typed is written, as a value or as a map key', () => {
    const raw = written({ roadReady: student() });
    expect(raw).toContain('"roadReady"');
    TYPED.forEach((s) => expect(raw.includes(s), 'typed text in storage: ' + s).toBe(false));
    expect(/maria|lopez|rosa/i.test(raw)).toBe(false);
    // dates of birth and GDL dates in any spelling the app could have made of them
    ['2010', '05-04', '20100504', '01-10', '08-01'].forEach((s) => expect(raw.includes(s), s).toBe(false));
  });

  it('PRIVACY: no string with whitespace anywhere in what is written (values and keys)', () => {
    const saved = JSON.parse(written({ roadReady: student() })).roadReady;
    const strings = allStrings(saved);
    expect(strings.length).toBeGreaterThan(20);
    expect(strings.filter((s) => /\s/.test(s))).toEqual([]);
    // every string is a field name, an id from a fixed list, a number key, a colour or a day key
    const hub = loadHub();
    const known = new Set([].concat(Object.keys(hub.road), hub.lists.badges, hub.lists.scenarios, hub.lists.weathers, hub.lists.trips, hub.lists.pretrip,
      ['driver', 'science', 'instructor', 'calm', 'auto', 'high', 'medium', 'low'],
      ['bestSafety', 'lastSafety', 'driveCount', 'timeSec', 'rides', 'earnings', 'correct', 'wrong', 'date', 'done', 'streak', 'scenario', 'durationSec', 'safetyScore', 'efficiencyScore', 'day', 'qualifyingSession', 'correctCount']));
    const odd = strings.filter((s) => !known.has(s) && !/^\d{1,4}$/.test(s) && !/^#[0-9a-f]{6}$/i.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s));
    expect(odd).toEqual([]);
  });

  it('only fields from the table are written, and the fields that hold typed text are not in it', () => {
    const hub = loadHub();
    const saved = JSON.parse(written({ roadReady: student() })).roadReady;
    Object.keys(saved).forEach((k) => expect(Object.keys(hub.road), k).toContain(k));
    ['driverName', 'licensePlate', 'gdlBirthDate', 'gdlPermitDate', 'gdlIntermediateDate', 'pledgeSigned', 'lastReflection', 'brakingHunt', 'coachResponse', 'helpQuery', 'guideQuiz',
      'worldSeed', 'lastJournal', 'drivingStats', 'lastRoadTest', 'lastParentReport', 'bestGhosts', 'maintenanceGame', 'defensiveState', 'permitStats', 'permitStudy',
      'parkingBest', 'coachMode', 'highBeams', 'view', 'scenario', 'vehicle'].forEach((k) => {
      expect(k in hub.road, k + ' must not be in the table').toBe(false);
      expect(k in saved, k + ' was written').toBe(false);
    });
  });

  it('a typed string planted in EVERY field of the state, one field at a time and all at once: none is written', () => {
    const hub = loadHub();
    const fields = Array.from(new Set(Object.keys(student()).concat(Object.keys(hub.road), Object.keys(guards.RR_SAVE_FIELDS),
      Array.from(TOOL_SRC.matchAll(/\bupd\(\s*'([A-Za-z_0-9]+)'/g)).map((m) => m[1]))));
    expect(fields.length).toBeGreaterThan(100);
    const plants = {
      text: () => 'PLANT typed text', word: () => 'PLANTword', list: () => ['PLANT in a list', { name: 'PLANT name' }],
      keyed: () => ({ 'PLANT key': true, PLANTkey: { 'PLANT inner': 1, note: 'PLANT note', bestSafety: 'PLANT', date: 'PLANT', scenario: 'PLANT', scenarioId: 'PLANTid', day: 'PLANT' } }),
      rows: () => [{ scenario: 'PLANT course', scenarioId: 'PLANTid', day: 'PLANT day', durationSec: 60, safetyScore: 90, efficiencyScore: 80, text: 'PLANT', name: 'PLANT', PLANTkey: 1 }],
    };
    for (const p of Object.keys(plants)) {
      const all = {};
      fields.forEach((f) => { all[f] = plants[p](); });
      expect(written({ roadReady: all }).includes('PLANT'), p + ' in every field').toBe(false);
      for (const f of fields) {
        const one = student(); one[f] = plants[p]();
        const raw = written({ roadReady: one });
        expect(raw.includes('PLANT'), p + ' in ' + f).toBe(false);
      }
    }
  });

  it('PRIVACY on the way back in: a hand-edited stored blob loses typed text, unknown ids and unknown fields', () => {
    const hub = loadHub();
    const blob = { roadReady: Object.assign(student(), { evil: '<script>', view: 'driving', __proto__x: 1 }) };
    const next = hub.hydrate({}, JSON.parse(JSON.stringify(blob)));
    const raw = JSON.stringify(next.roadReady);
    TYPED.forEach((s) => expect(raw.includes(s), 'typed text restored: ' + s).toBe(false));
    expect(allStrings(next.roadReady).filter((s) => /\s/.test(s))).toEqual([]);
    Object.keys(next.roadReady).forEach((k) => expect(Object.keys(hub.road), k).toContain(k));
    expect(next.roadReady.view).toBeUndefined();
    expect(next._persisted).toBe(true);
    // a blob with nothing usable leaves no bucket at all, so the tool starts from its defaults
    expect('roadReady' in hub.hydrate({}, { roadReady: { driverName: NAME, licensePlate: PLATE } })).toBe(false);
    expect('roadReady' in hub.hydrate({}, { roadReady: 'x' })).toBe(false);
    expect('roadReady' in hub.hydrate({}, { roadReady: [1, 2] })).toBe(false);
  });
});

describe('round trip: what a returning student gets back (ps32)', () => {
  const back = () => { const hub = loadHub(); return hub.hydrate({}, JSON.parse(written({ roadReady: student() }))).roadReady; };

  it('badges (known ids only, as true), drive counts, trips and the seen-tour flag', () => {
    const got = back();
    expect(got.badges).toEqual({ first_drive: true, ten_drives: true, road_test_pass: true });
    expect(got.scenariosDriven).toEqual({ residential: { bestSafety: 92, lastSafety: 88, driveCount: 3 }, rain: { bestSafety: 71, lastSafety: 71, driveCount: 1 } });
    expect(got.weathersDriven).toEqual({ clear: true, rain: true });
    expect(got.totalDrives).toBe(4);
    expect(got.completedTrips).toEqual({ lighthouse_loop: { timeSec: 412 } });
    expect(got.rideshareTotal).toEqual({ rides: 3, earnings: 41.5 });
    expect(got.preTripChecks).toEqual({ tire_psi: true, lights_head: true });
    expect(got.permitFlashHistory).toEqual({ 3: { correct: 2, wrong: 1 }, 17: { correct: 0, wrong: 2 } });
    expect(got.dailyChallenge).toEqual({ date: '2026-11-09', done: true, streak: 3 });
    expect(got.tourCompleted).toBe(true);
  });

  it('every setting, including the ones saved as OFF', () => {
    const got = back();
    expect(got).toMatchObject({ reducedMotion: true, calmDrive: true, hudPreset: 'science', hudTextScale: 1.18, realMirrors: false, rideAlong: true, instructorVoice: false, gfxQuality: 'low', carColor: '#22d3ee' });
  });

  it('the logbook comes back trimmed: course id, length, two scores and the day, nothing else', () => {
    const got = back();
    expect(got.logbook).toEqual([
      { scenario: 'residential', durationSec: 302, safetyScore: 91, efficiencyScore: 84, day: '2026-11-09' },
      { scenario: 'rain', durationSec: 45, safetyScore: 60, efficiencyScore: 70, day: '2026-11-09', qualifyingSession: false },
    ]);
  });

  it('the logbook is capped at the newest 100 lines', () => {
    const many = Array.from({ length: 130 }, (_, i) => ({ scenarioId: 'rural', startedAt: DRIVE_AT + i * 1000, durationSec: i, safetyScore: 80, efficiencyScore: 80 }));
    const hub = loadHub();
    const got = hub.hydrate({}, JSON.parse(written({ roadReady: { logbook: many } }))).roadReady.logbook;
    expect(got).toHaveLength(100);
    expect(got[0].durationSec).toBe(30);
    expect(got[99].durationSec).toBe(129);
  });

  it('saving what was restored writes the same thing again (stable across visits)', () => {
    const first = written({ roadReady: student() });
    const hub = loadHub();
    const restored = hub.hydrate({}, JSON.parse(first));
    // the tool gives restored logbook lines their display fields; the host must read them back the same
    const withDisplay = Object.assign({}, restored.roadReady, { logbook: guards.rrRestoreLogbook(restored.roadReady.logbook) });
    expect(JSON.parse(written({ roadReady: withDisplay })).roadReady).toEqual(JSON.parse(first).roadReady);
  });

  it('out-of-range and wrong-type values are left out one field at a time; the rest still saves', () => {
    const cases = { totalDrives: -3, hudTextScale: 9, hudPreset: 'huge', gfxQuality: 'ultra', carColor: 'red', reducedMotion: 'yes', tourCompleted: 'yes', instructorVoice: 0,
      dailyChallenge: { date: 'Nov 9 2026', done: true, streak: 2 }, logbook: 'x', badges: ['first_drive'], scenariosDriven: 7, rideshareTotal: 'lots' };
    for (const k of Object.keys(cases)) {
      const s = student(); s[k] = cases[k];
      const saved = JSON.parse(written({ roadReady: s })).roadReady;
      expect(k in saved, k).toBe(false);
      expect(saved.totalDrives === 4 || k === 'totalDrives').toBe(true);
    }
    const nums = JSON.parse(written({ roadReady: { scenariosDriven: { residential: { bestSafety: 400, lastSafety: -1, driveCount: NaN } }, logbook: [{ durationSec: 60, safetyScore: 900, efficiencyScore: 'A', startedAt: 'yesterday' }, { safetyScore: 90 }, null, 'x'] } })).roadReady;
    expect(nums.scenariosDriven).toEqual({ residential: {} });
    expect(nums.logbook).toEqual([{ durationSec: 60 }]);
  });

  it('other tools in the same save are untouched by the Road Ready filter', () => {
    const raw = written({ roadReady: student(), wave: { amplitude: 3 }, kitchenLab: { klUnits: 'metric', scratch: 'x' } });
    const saved = JSON.parse(raw);
    expect(saved.wave).toEqual({ amplitude: 3 });
    expect(saved.kitchenLab).toEqual({ klUnits: 'metric' });
    const hub = loadHub();
    const next = hub.hydrate({ other: 1 }, saved);
    expect(next.wave).toEqual({ amplitude: 3 });
    expect(next.other).toBe(1);
  });
});

describe('the host id lists match the tool (ps32)', () => {
  it('badges = the achievement catalog; every badge the tool awards is in it', () => {
    const hub = loadHub();
    expect(hub.lists.badges.slice().sort()).toEqual(RR.ACHIEVEMENTS.map((a) => a.id).sort());
    const awarded = new Set(Array.from(TOOL_SRC.matchAll(/\b[A-Za-z]*[Bb]adges\.([a-z][a-z0-9_]+) = true/g)).map((m) => m[1]));
    expect(awarded.size).toBeGreaterThan(15);
    awarded.delete('speed_demon');
    awarded.forEach((id) => expect(hub.lists.badges, 'awarded badge not kept by the host: ' + id).toContain(id));
    expect(hub.lists.badges).not.toContain('speed_demon');
  });
  it('scenarios, trips, weathers and the pre-trip checklist', () => {
    const hub = loadHub();
    expect(hub.lists.scenarios.slice().sort()).toEqual(RR.SCENARIOS.map((s) => s.id).sort());
    expect(hub.lists.trips.slice().sort()).toEqual(RR.TRIPS.map((t) => t.id).sort());
    expect(hub.lists.weathers.slice().sort()).toEqual(Array.from(new Set(RR.SCENARIOS.map((s) => s.weather))).sort());
    const pre = cut(TOOL_SRC, '// ── PRE-TRIP INSPECTION CHECKLIST ──', 'var ptState = d.preTripChecks');
    const ids = Array.from(pre.matchAll(/\{ id: '([a-z_]+)', t: /g)).map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(20);
    expect(hub.lists.pretrip.slice().sort()).toEqual(ids.sort());
  });
  it('settings: HUD presets, HUD text sizes and graphics levels the menu offers all survive', () => {
    const hub = loadHub();
    const menu = cut(TOOL_SRC, "'aria-label': __alloT('stem.roadready.a11y_driving_hud_select'", '// ── Progress Save/Load panel ──');
    const presets = Array.from(cut(menu, 'a11y_driving_hud_select', 'a11y_hud_text_size_select').matchAll(/h\('option', \{ value: '([a-z]+)' \}/g)).map((m) => m[1]);
    expect(presets).toEqual(['driver', 'science', 'instructor', 'calm']);
    presets.forEach((p) => expect(hub.road.hudPreset(p)).toBe(p));
    const sizes = Array.from(cut(menu, 'a11y_hud_text_size_select', 'gfx_label').matchAll(/h\('option', \{ value: '([0-9.]+)' \}/g)).map((m) => Number(m[1]));
    expect(sizes).toEqual([1, 1.18, 1.32]);
    sizes.forEach((n) => expect(hub.road.hudTextScale(n)).toBe(n));
    const gfx = Array.from(cut(menu, 'data-rr-gfx-quality', "id: 'rr-gfx-quality-note'").matchAll(/h\('option', \{ value: '([a-z]+)' \}/g)).map((m) => m[1]);
    expect(gfx).toEqual(['auto', 'high', 'medium', 'low']);
    gfx.forEach((g) => expect(hub.road.gfxQuality(g)).toBe(g));
  });
  it('the tool writes the course id on each new logbook line, so the host never has to keep the display name', () => {
    const push = cut(TOOL_SRC, 'if (rrLogbookAdded) logbookNext.push({', "upd('logbook', logbookNext);");
    expect(push).toContain('scenarioId: exitScenario.id,');
  });
});

describe('a delayed save never writes the old state after Start fresh (ps32)', () => {
  it('queued before, cleared before the timer fires: the write that lands is the cleared state', () => {
    vi.useFakeTimers();
    const hub = loadHub();
    const saver = hub.createSaver();
    saver.queue({ _persisted: true, roadReady: student(), wave: { a: 1 } });
    vi.advanceTimersByTime(200); // the 400 ms save is still pending
    expect(hub.storage.getItem(KEY)).toBeNull();
    // Start fresh: every field undefined, view back to the menu (what startFresh() writes)
    const cleared = {}; Object.keys(student()).forEach((k) => { cleared[k] = undefined; }); cleared.view = 'menu';
    saver.queue({ _persisted: true, roadReady: cleared, wave: { a: 1 } });
    vi.advanceTimersByTime(250);
    const raw = hub.storage.getItem(KEY);
    expect(raw).toBe('{"wave":{"a":1}}');
    vi.advanceTimersByTime(5000);
    expect(hub.storage.getItem(KEY)).toBe('{"wave":{"a":1}}');
    saver.dispose();
    expect(hub.storage.getItem(KEY)).toBe('{"wave":{"a":1}}');
  });

  it('already saved, then Start fresh: the stored Road Ready bucket is removed, on the timer or when the page hides', () => {
    vi.useFakeTimers();
    for (const how of ['timer', 'pagehide', 'dispose']) {
      const hub = loadHub();
      const saver = hub.createSaver();
      saver.queue({ _persisted: true, roadReady: student() });
      vi.advanceTimersByTime(450);
      expect(hub.storage.getItem(KEY)).toContain('first_drive');
      saver.queue({ _persisted: true, roadReady: { view: 'menu', badges: undefined, logbook: undefined } });
      if (how === 'timer') vi.advanceTimersByTime(450);
      if (how === 'pagehide') hub.win.dispatchEvent(new Event('pagehide'));
      if (how === 'dispose') saver.dispose();
      expect(hub.storage.getItem(KEY), how).toBe('{}');
      saver.dispose();
    }
  });

  it('after the saver is disposed (the lab closed) a late queue or timer writes nothing', () => {
    vi.useFakeTimers();
    const hub = loadHub();
    const saver = hub.createSaver();
    saver.queue({ _persisted: true, roadReady: { badges: { first_drive: true } } });
    saver.dispose();
    const atClose = hub.storage.getItem(KEY);
    saver.queue({ _persisted: true, roadReady: student() });
    vi.advanceTimersByTime(5000);
    expect(hub.storage.getItem(KEY)).toBe(atClose);
  });

  it('state that has not been restored yet (_persisted missing) is never written over the stored copy', () => {
    const hub = loadHub(memoryStorage({ [KEY]: '{"roadReady":{"badges":{"first_drive":true}}}' }));
    const saver = hub.createSaver();
    saver.queue({ roadReady: { view: 'menu' } });
    saver.flush();
    saver.dispose();
    expect(hub.storage.getItem(KEY)).toBe('{"roadReady":{"badges":{"first_drive":true}}}');
  });
});
