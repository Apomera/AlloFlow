import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(path.join(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));

// Exercise the exact private model shipped to browsers, without copying its
// serialization logic or depending on a drawing canvas.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const modelSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const airportSource = source.slice(source.indexOf('  var AIRPORTS ='), source.indexOf('  // ── AIRCRAFT TYPES ──'));
const typeSource = source.slice(source.indexOf('  var AC_TYPES ='), source.indexOf('  // ── ATC SHIFT RECOVERY ──'));
const recoverySource = source.slice(source.indexOf('  // ── ATC SHIFT RECOVERY ──'), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(modelSource + airportSource + typeSource + recoverySource + '\nreturn { AIRPORTS, AC_TYPES, serializeAtcShift, restoreAtcShift, recordAtcShift, atcShiftHistory };')();

function game(extra = {}) {
  const airport = model.AIRPORTS[1];
  return {
    shiftId: 'atc-fixture-shift', airport, trainingMode: 'guided', time: 34.5,
    score: 70, landed: 3, streak: 2, sessionBestStreak: 3,
    conflicts: 1.25, conflictEpisodes: 2, goArounds: 1, mathCorrect: 1,
    nextSpawn: 4, selected: 101, gameOver: false, paused: false,
    runwayBusyUntil: { 'runway-0': 36.5 }, conflictPairKeys: {},
    wind: { dir: 280, speed: 12 }, messages: [{ text: 'United 101 holding', time: 34, color: '#4ade80' }],
    decisionLog: [{ type: 'hold', callsign: 'United 101', text: 'Entered holding pattern', time: 33 }],
    mathChallenge: { type: 'arrival_order', d1: 24, s1: 120, d2: 12, s2: 60, t1: 12, t2: 12, answer: 'TIE', explanation: 'Both take 12 minutes.' },
    aircraft: [{ id: 101, callsign: 'United 101', type: model.AC_TYPES[1], x: 265, y: 170, heading: 270, speed: 140, altitude: 6000, fuel: 50,
      state: 'holding', assignedRunway: airport.runways[0], targetHeading: 220, targetSpeed: 120, targetAltitude: 5000,
      spawnTime: 20, holdCenter: { x: 275, y: 175 }, fuelWarningIssued: false,
      emergency: { type: 'medical', label: 'MEDICAL EMERGENCY', msg: 'requests priority', lesson: 'Prioritize the aircraft.', priority: true } }],
    ...extra
  };
}

describe('ATC saved shift recovery', () => {
  it('round-trips a shift and reconstructs canonical aircraft/runway references', () => {
    const before = game();
    const saved = model.serializeAtcShift(before, 1234567);
    expect(saved.version).toBe(1);
    expect(saved.savedAt).toBe(1234567);
    expect(saved.aircraft[0].type).toBeUndefined();
    expect(saved.aircraft[0].assignedRunway).toBeUndefined();
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(saved)));
    expect(restored.airport).toBe(model.AIRPORTS[1]);
    expect(restored.aircraft[0].type).toBe(model.AC_TYPES[1]);
    expect(restored.aircraft[0].assignedRunway).toBe(model.AIRPORTS[1].runways[0]);
    expect(restored.paused).toBe(true);
    expect(restored.trainingMode).toBe('guided');
    expect(restored.selected).toBe(101);
    expect(restored.aircraft[0].holdCenter).toEqual({ x: 275, y: 175 });
    expect(restored.aircraft[0].emergency.priority).toBe(true);
    expect(restored.runwayBusyUntil['runway-0']).toBe(36.5);
    for (const key of ['time', 'score', 'landed', 'streak', 'sessionBestStreak', 'conflicts', 'conflictEpisodes', 'goArounds', 'mathCorrect', 'nextSpawn']) expect(restored[key]).toBe(before[key]);
    expect(restored.mathChallenge.answer).toBe('TIE');
    expect(restored.decisionLog).toEqual(before.decisionLog);
  });

  it('keeps approach stage, targets, and runway identity after JSON storage', () => {
    const before = game({ mathChallenge: null });
    Object.assign(before.aircraft[0], { state: 'approach', approachStage: 'final', x: 180, altitude: 750, targetAltitude: 0 });
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(model.serializeAtcShift(before))));
    expect(restored.aircraft[0].state).toBe('approach');
    expect(restored.aircraft[0].approachStage).toBe('final');
    expect(restored.aircraft[0].targetAltitude).toBe(0);
    expect(restored.aircraft[0].assignedRunway).toBe(restored.airport.runways[0]);
  });

  it('preserves rewarded and skipped math completion after JSON storage', () => {
    for (const flags of [
      { answered: true, correct: true, skipped: false },
      { answered: true, correct: false, skipped: true },
      { answered: true, correct: false, skipped: false }
    ]) {
      const before = game();
      Object.assign(before.mathChallenge, flags);
      const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(model.serializeAtcShift(before))));
      expect(restored.mathChallenge).toMatchObject(flags);
      expect(restored.score).toBe(before.score);
      expect(restored.mathCorrect).toBe(before.mathCorrect);
    }
  });

  it('normalizes inconsistent or malformed math completion flags', () => {
    const saved = model.serializeAtcShift(game());
    const cases = [
      [{ answered: false, correct: true, skipped: true }, { answered: false, correct: false, skipped: false }],
      [{ answered: 'true', correct: 1, skipped: 'false' }, { answered: false, correct: false, skipped: false }],
      [{ answered: true, correct: true, skipped: true }, { answered: true, correct: false, skipped: true }],
      [{ answered: true, correct: 'true', skipped: 1 }, { answered: true, correct: false, skipped: false }]
    ];
    for (const [flags, expected] of cases) {
      const restored = model.restoreAtcShift({ ...saved, mathChallenge: { ...saved.mathChallenge, ...flags } });
      expect(restored.mathChallenge).toMatchObject(expected);
    }
  });

  it('never saves runtime objects or callbacks, even when runtime has cycles', () => {
    const before = game();
    before.ctx = { update() {} };
    before.dom = before;
    before.aircraft[0].ctx = before;
    before.aircraft[0].targetSpeed = () => 999;
    const serialized = JSON.stringify(model.serializeAtcShift(before));
    expect(serialized).not.toContain('ctx');
    expect(serialized).not.toContain('dom');
    const restored = model.restoreAtcShift(JSON.parse(serialized));
    expect(restored.aircraft[0].targetSpeed).toBeNull();
  });

  it('rejects unsupported, incomplete, and invalid identity drafts safely', () => {
    const valid = model.serializeAtcShift(game());
    for (const invalid of [null, {}, { ...valid, version: 2 }, { ...valid, airportId: 'unknown' }, { ...valid, aircraft: {} }, { ...valid, time: Infinity }, { ...valid, shiftId: '<bad>' }]) expect(model.restoreAtcShift(invalid)).toBeNull();
    expect(model.serializeAtcShift(game({ airport: null }))).toBeNull();
    expect(model.serializeAtcShift(game({ committed: true }))).toBeNull();
  });

  it('bounds restored data and omits unknown/duplicate aircraft', () => {
    const saved = model.serializeAtcShift(game());
    saved.time = 999999999;
    saved.score = Infinity;
    saved.nextSpawn = -50;
    saved.wind.speed = 10000;
    saved.aircraft[0].callsign = 'U'.repeat(10000);
    saved.aircraft[0].x = 10000;
    saved.aircraft[0].heading = -450;
    saved.aircraft[0].fuel = -10;
    saved.aircraft[0].altitude = 999999;
    saved.aircraft[0].emergency.type = 'unknown';
    saved.aircraft.push({ ...saved.aircraft[0] }, { ...saved.aircraft[0], id: 102, typeId: 'bad' }, { ...saved.aircraft[0], id: 103, speed: NaN });
    saved.messages = Array.from({ length: 500 }, () => ({ text: 'X'.repeat(3000), time: Infinity, color: 'url(x)' }));
    saved.decisionLog = Array.from({ length: 200 }, () => ({ text: 'Y'.repeat(1000), time: Infinity }));
    const restored = model.restoreAtcShift(saved);
    expect(restored.time).toBe(86400);
    expect(restored.score).toBe(0);
    expect(restored.nextSpawn).toBe(0);
    expect(restored.wind.speed).toBe(100);
    expect(restored.aircraft).toHaveLength(1);
    expect(restored.aircraft[0]).toMatchObject({ x: 500, heading: 270, fuel: 0, altitude: 45000, emergency: null });
    expect(restored.aircraft[0].callsign).toHaveLength(64);
    expect(restored.messages).toHaveLength(40);
    expect(restored.messages[0].text).toHaveLength(1500);
    expect(restored.messages[0].color).toBe('#cbd5e1');
    expect(restored.decisionLog).toHaveLength(40);
    expect(restored.decisionLog[0].text).toHaveLength(400);
  });

  it('cannot restore an approach with an invented runway or stale selected id', () => {
    const saved = model.serializeAtcShift(game());
    Object.assign(saved.aircraft[0], { state: 'approach', runwayIndex: 99, touchdownReady: true });
    saved.selected = 999;
    const restored = model.restoreAtcShift(saved);
    expect(restored.aircraft[0]).toMatchObject({ state: 'inbound', assignedRunway: null, touchdownReady: false });
    expect(restored.selected).toBeNull();
  });

  it('preserves known conflict pairs without adding bogus ones', () => {
    const before = game();
    before.aircraft.push({ ...before.aircraft[0], id: 102, callsign: 'Delta 102' });
    before.conflictPairKeys = { '101:102': true, '101:999': true, '__proto__': true };
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(model.serializeAtcShift(before))));
    expect(restored.conflictPairKeys).toEqual({ '101:102': true });
  });
});

describe('ATC completed shift records', () => {
  it('records durable totals and clears the active draft once per shift', () => {
    const current = game();
    const initial = { totalScore: 20, totalLanded: 2, bestStreak: 4, activeShift: model.serializeAtcShift(current) };
    const first = model.recordAtcShift(initial, current, 9000);
    expect(first).toMatchObject({ view: 'debrief', activeShift: null, totalScore: 90, totalLanded: 5, bestStreak: 4, lastCommittedShiftId: current.shiftId });
    expect(first.lastShift).toMatchObject({ completedAt: 9000, airportName: current.airport.name, trainingMode: 'guided', score: 70, landed: 3, conflictSeconds: 1.25, goArounds: 1, mathCorrect: 1 });
    expect(first.lastShift.decisionLog).toEqual(current.decisionLog);
    const savedData = JSON.parse(JSON.stringify({ ...initial, ...first }));
    const second = model.recordAtcShift(savedData, current, 9500);
    expect(second.totalScore).toBeUndefined();
    expect(second.totalLanded).toBeUndefined();
    expect(second.shiftHistory).toBeUndefined();
    expect(second.lastShift.completedAt).toBe(9000);
  });

  it('prevents double counting when another record is newest', () => {
    const firstGame = game();
    const first = model.recordAtcShift({}, firstGame, 1000);
    const secondGame = game({ shiftId: 'atc-second-shift', score: -10, landed: 0 });
    const second = model.recordAtcShift(first, secondGame, 2000);
    const repeated = model.recordAtcShift({ ...first, ...second }, firstGame, 3000);
    expect(second.totalScore).toBe(60);
    expect(second.shiftHistory).toHaveLength(2);
    expect(repeated.totalScore).toBeUndefined();
    expect(repeated.lastShift.shiftId).toBe(firstGame.shiftId);
  });

  it('bounds history at eight debriefs and normalizes malformed saved totals', () => {
    let saved = { totalScore: 'bad', totalLanded: Infinity, bestStreak: NaN, shiftHistory: [{}] };
    for (let i = 0; i < 15; i++) saved = { ...saved, ...model.recordAtcShift(saved, game({ shiftId: 'atc-shift-' + i }), i) };
    expect(saved.totalScore).toBe(1050);
    expect(saved.totalLanded).toBe(45);
    expect(saved.bestStreak).toBe(3);
    expect(saved.shiftHistory).toHaveLength(8);
    expect(saved.shiftHistory[0].shiftId).toBe('atc-shift-14');
    expect(saved.shiftHistory[7].shiftId).toBe('atc-shift-7');
    expect(model.atcShiftHistory([{ shiftId: 'valid', airportId: 'unknown' }])).toEqual([]);
    expect(model.recordAtcShift({}, game({ airport: null }))).toBeNull();
  });
});

describe('ATC mounted shift lifecycle', () => {
  const mounted = [];
  function mount(initial) {
    const config = loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const api = { host, persisted: initial, updates: [] };
    function Harness() {
      const [data, setData] = React.useState(initial);
      api.data = data;
      const updateMulti = (_tool, patch) => {
        api.updates.push(patch);
        api.persisted = { ...api.persisted, ...patch };
        setData(previous => ({ ...previous, ...patch }));
      };
      return config.render({ React, toolData: { atcTower: data }, updateMulti,
        update: (tool, key, value) => updateMulti(tool, { [key]: value }),
        t: (_key, fallback) => fallback, addToast: vi.fn(), callGemini: vi.fn() });
    }
    act(() => root.render(React.createElement(Harness)));
    api.click = selector => {
      const button = host.querySelector(selector);
      expect(button, selector).not.toBeNull();
      act(() => button.click());
    };
    api.dispose = () => {
      if (api.disposed) return;
      act(() => root.unmount());
      host.remove();
      api.disposed = true;
    };
    mounted.push(api);
    return api;
  }

  beforeEach(() => {
    resetStemLab();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T16:00:00Z'));
    // The real loop is covered by browser/model tests. These tests exercise
    // React mount, tool-data writes, menu actions, and effect cleanup only.
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  });
  afterEach(() => {
    mounted.splice(0).forEach(api => api.dispose());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('reloads a playing draft paused, checkpoints, and saves again when leaving', () => {
    const initial = { view: 'playing', activeShift: model.serializeAtcShift(game(), 1), totalScore: 5 };
    const api = mount(initial);
    expect(api.host.querySelector('[data-atctower-playing]')).not.toBeNull();
    expect(api.host.querySelector('[data-atctower-command="pause"]').getAttribute('aria-pressed')).toBe('true');
    expect(api.host.textContent).toContain('United 101');
    const firstSave = api.persisted.activeShift.savedAt;
    act(() => vi.advanceTimersByTime(5000));
    expect(api.persisted.activeShift.savedAt).toBe(firstSave + 5000);
    expect(api.persisted.activeShift.time).toBe(34.5);
    vi.setSystemTime(new Date('2026-10-03T16:00:08Z'));
    api.dispose();
    expect(api.persisted.activeShift.savedAt).toBe(firstSave + 8000);
    expect(api.persisted.totalScore).toBe(5);
    expect(JSON.stringify(api.persisted.activeShift)).not.toContain('updateMulti');
  });

  it('resumes from the menu and End shift commits once without saving the draft again', () => {
    const api = mount({ view: 'menu', activeShift: model.serializeAtcShift(game(), 1), totalScore: 20, totalLanded: 2 });
    expect(Array.from(api.host.querySelectorAll('button')).find(button => button.textContent === 'Start Tower Shift').disabled).toBe(true);
    api.click('[data-atctower-resume]');
    expect(api.host.querySelector('[data-atctower-command="pause"]').getAttribute('aria-pressed')).toBe('true');
    api.click('[data-atctower-command="end"]');
    expect(api.persisted).toMatchObject({ view: 'debrief', activeShift: null, totalScore: 90, totalLanded: 5 });
    expect(api.persisted.shiftHistory).toHaveLength(1);
    act(() => vi.advanceTimersByTime(10000));
    api.dispose();
    expect(api.persisted.activeShift).toBeNull();
    expect(api.persisted.totalScore).toBe(90);
    expect(api.persisted.shiftHistory).toHaveLength(1);
  });

  it('reloads rewarded math as completed without offering the answer or awarding again', () => {
    const completed = game();
    Object.assign(completed.mathChallenge, { answered: true, correct: true, skipped: false });
    const api = mount({ view: 'playing', activeShift: model.serializeAtcShift(completed, 1), totalScore: 20 });
    const panel = api.host.querySelector('[data-atctower-math-challenge]');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('Correct!');
    expect(panel.querySelector('form, input')).toBeNull();
    expect(Array.from(panel.querySelectorAll('button')).map(button => button.textContent)).toEqual(['Continue traffic']);
    expect(api.persisted.activeShift.mathChallenge).toMatchObject({ answered: true, correct: true, skipped: false });
    api.click('[data-atctower-math-continue]');
    expect(api.host.querySelector('[data-atctower-math-challenge]')).toBeNull();
    api.click('[data-atctower-command="end"]');
    expect(api.persisted.totalScore).toBe(20 + completed.score);
    expect(api.persisted.lastShift.mathCorrect).toBe(completed.mathCorrect);
    expect(api.persisted.activeShift).toBeNull();
  });

  it('recovers an unsupported playing draft to a discardable menu without altering totals', () => {
    const api = mount({ view: 'playing', activeShift: { version: 999 }, totalScore: 42, totalLanded: 3 });
    expect(api.persisted.view).toBe('menu');
    expect(api.host.querySelector('[data-atctower-recovery]')).not.toBeNull();
    expect(api.host.querySelector('[data-atctower-resume]')).toBeNull();
    api.click('[data-atctower-discard]');
    expect(api.persisted).toMatchObject({ activeShift: null, totalScore: 42, totalLanded: 3 });
    expect(Array.from(api.host.querySelectorAll('button')).find(button => button.textContent === 'Start Tower Shift').disabled).toBe(false);
  });
});
