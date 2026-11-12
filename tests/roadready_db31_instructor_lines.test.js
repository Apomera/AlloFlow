import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 31, debrief lane (db31), item 5.
//  - The three start-up lines (seatbelt 1.0 s, scenario intro 1.5 s, "Take your time" 2.5 s) were
//    closer together than speak()'s 1.6 s spacing rule, so the intro and the mirror reminder were
//    discarded on every normal drive. They are now 1.0 / 4.5 / 8.0 s (1.0 / 4.5 s without an
//    intro). speak() itself is unchanged.
//  - Hydroplaning and the wildlife alerts (MOOSE! / DEER! / DOG IN ROAD!) had no spoken line.
// Part 1 runs the tool's own speak() (sliced, as tests/roadready_au30_instructor_voice.test.js does)
// against the start-up schedule read from startDriving. Part 2 mounts the real tool.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
function cut(a, b) {
  const i = src.indexOf(a), j = i < 0 ? -1 : src.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error('cannot find ' + a.trim().slice(0, 60));
  return src.slice(i, j);
}
const VOICE_A = cut('      var instructorTTSOpts = function() {', '      var setInstructorVoice = function(on) {');
const VOICE_B = cut('      var CAT_WINDOW = {', '      var unlockBadge = function(name) {');
const makeVoice = new Function('scope', 'with (scope) {\n' + VOICE_A + '\n' + VOICE_B + '\nreturn { speak: speak }; }');
function rig(opts) {
  opts = opts || {};
  const said = [];
  const scope = {
    callTTS: (text) => { said.push({ text, at: Date.now() }); return new Promise(() => {}); },
    ctx: { stopTTS: vi.fn() },
    _lastSpokenRef: { current: { text: null, at: 0, anyAt: 0, byCategory: {} } },
    instructorVoiceRef: { current: true }, instructorAbortRef: { current: null },
    calmDriveRef: { current: !!opts.calm },
  };
  return { said, scope, speak: makeVoice(scope).speak, texts: () => said.map((s) => s.text) };
}

// The start-up timers, read from startDriving (not typed here).
const START = cut('      var startDriving = useCallback(function(scenarioId, vehicleId) {', '        timeRef.current = 0;');
function startupSchedule(hasIntro) {
  const belt = /speak\('Fasten your seatbelt before driving\.'\);\s*\}\s*\}, (\d+)\);/.exec(START);
  const intro = /if \(introMsg\) rrSpeakStartLine\(introMsg[^\n]*\.trim\(\), (\d+), \d+\);/.exec(START);
  const mirrors = /rrSpeakStartLine\('Take your time\. Check your rearview, left, and right mirrors before accelerating\.', introMsg \? (\d+) : (\d+), \d+\);/.exec(START);
  if (!belt || !intro || !mirrors) throw new Error('start-up timers not found in startDriving');
  const list = [{ at: +belt[1], text: 'Fasten your seatbelt before driving.' }];
  if (hasIntro) list.push({ at: +intro[1], text: 'SCHOOL ZONE: 15 mph. On an undivided road, stop for a school bus with red flashers from either direction.' });
  list.push({ at: hasIntro ? +mirrors[1] : +mirrors[2], text: 'Take your time. Check your rearview, left, and right mirrors before accelerating.' });
  return list.sort((a, b) => a.at - b.at);
}

describe('Road Ready db31: the three start-up lines are all spoken (speak() unchanged)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-10T15:00:00Z')); delete window.__alloIsGlobalMuted; });
  afterEach(() => { vi.useRealTimers(); });

  it.each([[false, false], [true, false], [false, true], [true, true]])('intro %s, Calm Drive %s: every scheduled line gets through speak()', (hasIntro, calm) => {
    const schedule = startupSchedule(hasIntro);
    const r = rig({ calm });
    let now = 0;
    for (const line of schedule) { vi.advanceTimersByTime(line.at - now); now = line.at; r.speak(line.text); }
    expect(r.texts()).toEqual(schedule.map((l) => l.text));
    // and the spacing is wider than the rule in both modes (1.6 s, 3.2 s in Calm Drive)
    for (let i = 1; i < schedule.length; i++) expect(schedule[i].at - schedule[i - 1].at).toBeGreaterThan(3200);
  });

  it('the seatbelt reminder still comes first, at 1.0 s', () => {
    expect(startupSchedule(true).map((l) => l.at)).toEqual([1000, 4500, 8000]);
    expect(startupSchedule(false).map((l) => l.at)).toEqual([1000, 4500]);
  });

  it("speak()'s own rules are the ones wave 1 left: 1.6 s / 3.2 s spacing, 2.5 s safety hold", () => {
    expect(VOICE_B).toContain('if ((now - last.anyAt) < (calmSpeech ? 3200 : 1600)) return;');
    expect(VOICE_B).toContain('var RR_SAFETY_HOLD_MS = 2500;');
    expect(VOICE_B).toContain("var CAT_WINDOW = { navigation: 8000, coach: 8000, radio: 25000, hazard: 4000, _default: 6000 };");
    // the old schedule, for the record: lines 0.5 s and 1.5 s after the belt line are dropped
    const r = rig();
    r.speak('Fasten your seatbelt before driving.');
    vi.advanceTimersByTime(500); r.speak('DOWNTOWN: Dense traffic, many signals, pedestrians everywhere. Patience is the skill here.');
    vi.advanceTimersByTime(1000); r.speak('Take your time. Check your rearview, left, and right mirrors before accelerating.');
    expect(r.texts()).toEqual(['Fasten your seatbelt before driving.']);
  });
});

describe('Road Ready db31: hydroplaning and wildlife alerts are spoken as safety lines', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-10T15:00:00Z')); delete window.__alloIsGlobalMuted; });
  afterEach(() => { vi.useRealTimers(); });
  const SAFETY = new RegExp(/var RR_SAFETY_LINE = \/(.+)\/i;/.exec(src)[1], 'i');
  const linesAt = (block) => { const out = []; const rx = /speak\((?:__alloT\('[\w.]+',\s*)?'((?:[^'\\]|\\.)+)'\)?(?:,\s*'(\w+)')?(?:,\s*'(\w+)')?\)/g; let m; while ((m = rx.exec(block))) out.push({ text: m[1], category: m[2], priority: m[3] }); return out; };

  it('hydroplaning: a spoken line sits beside the alert, matches the safety word list and cuts in after a tip', () => {
    const at = src.indexOf("showDriveAlert('Hydroplaning");
    const lines = linesAt(src.slice(at, at + 400));
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toMatch(/hydroplan/i);
    expect(lines[0].category).toBe('hazard');
    expect(SAFETY.test(lines[0].text)).toBe(true);
    // same advice as the alert on screen
    expect(lines[0].text).toBe('Hydroplaning. Ease off the gas. No sudden braking or steering.');
    const r = rig();
    r.speak('Signal before turning or changing lanes. Press E (left) or V (right).');
    vi.advanceTimersByTime(120);
    r.speak(lines[0].text, lines[0].category, lines[0].priority);
    expect(r.said).toHaveLength(2);
    // it is still rate-limited by the alert's own 8 s timer
    expect(src.slice(at - 300, at)).toContain('timeRef.current - statsRef.current._lastHydroWarn > 8');
  });

  it('moose, deer and other animals: a line for each, spoken unless Ride-Along narrates its own', () => {
    const at = src.indexOf("showDriveAlert('⚠️ ' + spawn.warn +");
    const block = src.slice(at, at + 1200);
    const lines = linesAt(block);
    expect(lines.map((l) => l.text)).toEqual([
      'Moose ahead. Slow down. If a crash is coming, brake and steer straight.',
      'Deer ahead. Slow down and look for more deer. If a crash is coming, brake and steer straight.',
      'Animal in the road. Slow down. If a crash is coming, brake and steer straight.',
    ]);
    expect(block).toContain('if (!rideAlongRef.current) {');
    expect(block).toContain("if (spawn.kind === 'moose') speak(");
    expect(block).toContain("else if (spawn.kind === 'deer') speak(");
    // the kinds the spawner can produce are the ones handled
    expect(src).toMatch(/kind: 'moose'[^\n]*warn: 'MOOSE!'/);
    expect(src).toMatch(/kind: 'deer'[^\n]*warn: 'DEER!'/);
    for (const line of lines) {
      expect(SAFETY.test(line.text), line.text).toBe(true);
      expect(line.category).toBe('hazard');
      const r = rig();
      r.speak('Signal before turning or changing lanes. Press E (left) or V (right).');
      vi.advanceTimersByTime(120);
      r.speak(line.text, line.category, line.priority);
      expect(r.texts()[1], line.text).toBe(line.text);
      expect(r.scope.ctx.stopTTS).toHaveBeenCalledTimes(1); // it cut the tip off
    }
    // no emoji reaches the voice, and the advice is the manual's: brake and steer straight, do not swerve
    for (const line of lines) expect(line.text).not.toMatch(/[\u{1F000}-\u{1FFFF}]/u);
  });
});

// ---- the real tool, mounted ----
describe('Road Ready db31: start-up lines in the mounted tool (real timers)', () => {
  let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
  beforeAll(async () => {
    const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
    ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let mounted = [];
  async function mount(roadReady) {
    window.__testHooks = {};
    resetStemLab();
    const config = loadTool(TOOL, 'roadReady');
    const calls = [];
    const callTTS = vi.fn((text) => { calls.push({ text, at: Date.now() }); return new Promise(() => {}); });
    const state = { toolData: { roadReady } };
    function Host() {
      const [toolData, setToolData] = React.useState(state.toolData);
      state.toolData = toolData;
      const ctx = makeCtx({ toolData, callTTS,
        update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
        updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })) });
      return config.render(ctx);
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    await React.act(async () => { root.render(React.createElement(Host)); });
    const m = { host, root, calls, state };
    mounted.push(m);
    return m;
  }
  beforeEach(() => { try { localStorage.removeItem('alloflow_canvas_narrate'); } catch (e) {} delete window.__alloIsGlobalMuted; delete window.__alloStudentAiDisabled; });
  afterEach(async () => {
    for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
    mounted = [];
    delete window.__testHooks;
  });

  it('a scenario with an intro: seatbelt, then the intro, then "Take your time", each one spoken', async () => {
    const m = await mount({ view: 'driving', scenario: 'school_zone', vehicle: 'sedan', reducedMotion: true });
    const t0 = Date.now();
    await React.act(async () => { window.__testHooks.roadReady.startDriving('school_zone', 'sedan'); });
    await React.act(async () => { await sleep(8600); });
    const texts = m.calls.map((c) => c.text);
    expect(texts).toEqual([
      'Fasten your seatbelt before driving.',
      'SCHOOL ZONE: 15 mph. On an undivided road, stop for a school bus with red flashers from either direction.',
      'Take your time. Check your rearview, left, and right mirrors before accelerating.',
    ]);
    const at = m.calls.map((c) => c.at - t0);
    expect(at[0]).toBeGreaterThanOrEqual(950);
    expect(at[1] - at[0]).toBeGreaterThan(3200);
    expect(at[2] - at[1]).toBeGreaterThan(3200);
  }, 60000);

  it('a slow first frame (both timers due at once) no longer costs the second line: it waits its turn', async () => {
    const m = await mount({ view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true });
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    // the main thread is busy for 5 s, as it is while the first chunks of the 3D world are built
    const until = Date.now() + 5000;
    while (Date.now() < until) { /* busy */ }
    await React.act(async () => { await sleep(4300); });
    expect(m.calls.map((c) => c.text)).toEqual([
      'Fasten your seatbelt before driving.',
      'Take your time. Check your rearview, left, and right mirrors before accelerating.',
    ]);
    expect(m.calls[1].at - m.calls[0].at).toBeGreaterThanOrEqual(3400);
  }, 60000);

  it('a scenario without an intro, in Calm Drive: seatbelt, then "Take your time" at 4.5 s', async () => {
    const m = await mount({ view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true, calmDrive: true });
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    await React.act(async () => { await sleep(5000); });
    expect(m.calls.map((c) => c.text)).toEqual([
      'Fasten your seatbelt before driving.',
      'Take your time. Check your rearview, left, and right mirrors before accelerating.',
    ]);
  }, 60000);
});
