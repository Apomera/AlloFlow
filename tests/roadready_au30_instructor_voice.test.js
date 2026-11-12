import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 30, lane audio (au30). The instructor's speak():
//  - a safety line is never dropped (it used to be discarded when it came within 1.6 s of any
//    other line): it cuts off the line being spoken, or waits for an earlier safety line;
//  - other lines keep their spacing;
//  - emoji are stripped in one place;
//  - End Drive stops the voice;
//  - the tool's own (global) speechSynthesis.cancel() runs only when the host has no ctx.stopTTS.
// Part 1 slices speak() and stopInstructorVoice() out of the tool source and runs them (the
// drive loop that calls speak() does not run in jsdom). Part 2 mounts the real tool.

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
const makeVoice = new Function('scope', 'with (scope) {\n' + VOICE_A + '\n' + VOICE_B +
  '\nreturn { speak: speak, stopInstructorVoice: stopInstructorVoice }; }');

function rig(opts) {
  opts = opts || {};
  const said = [];
  const order = [];
  const scope = {
    callTTS: (text, voice, speed, o) => { said.push({ text, opts: o, at: Date.now() }); order.push('say:' + text); return new Promise(() => {}); },
    ctx: opts.noStopTTS ? {} : { stopTTS: vi.fn(() => { order.push('stopTTS'); }) },
    _lastSpokenRef: { current: { text: null, at: 0, anyAt: 0, byCategory: {} } },
    instructorVoiceRef: { current: true }, instructorAbortRef: { current: null },
    calmDriveRef: { current: !!opts.calm },
  };
  const v = makeVoice(scope);
  return { said, order, scope, speak: v.speak, stop: v.stopInstructorVoice, texts: () => said.map((s) => s.text) };
}

const TIP = 'Signal before turning or changing lanes. Press E (left) or V (right).';
const WRONG_SIDE = 'Wrong side of the road. Return to your lane immediately.';
const CHILD = 'Child crossing! Brake immediately.';
const BUS = 'You passed a stopped school bus. That violates Maine law.';

describe('Road Ready speak(): safety lines are spoken (au30; speak() run outside the app)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-09T15:00:00Z')); delete window.__alloIsGlobalMuted; delete window.__alloStudentAiDisabled; });
  afterEach(() => { vi.useRealTimers(); });

  it('a safety line 100 ms after a tip is spoken, and cuts the tip off first', () => {
    const r = rig();
    r.speak(TIP);
    const tip = r.said[0];
    vi.advanceTimersByTime(100);
    r.speak(WRONG_SIDE);
    expect(r.texts()).toEqual([TIP, WRONG_SIDE]);
    expect(r.order).toEqual(['say:' + TIP, 'stopTTS', 'say:' + WRONG_SIDE]);
    expect(tip.opts.signal.aborted).toBe(true); // a tip still being made is cancelled too
    expect(r.said[1].opts.signal.aborted).toBe(false);
  });

  it('also in Calm Drive (3.2 s spacing for other lines)', () => {
    const r = rig({ calm: true });
    r.speak(TIP);
    vi.advanceTimersByTime(400);
    r.speak(CHILD);
    expect(r.texts()).toEqual([TIP, CHILD]);
  });

  it('a second safety line right behind the first waits and is spoken when the window opens; the newest one wins', () => {
    const r = rig();
    r.speak(WRONG_SIDE);
    vi.advanceTimersByTime(200);
    r.speak(BUS);
    vi.advanceTimersByTime(200);
    r.speak(CHILD);
    expect(r.texts()).toEqual([WRONG_SIDE]); // the first one is not cut off at once
    vi.advanceTimersByTime(1900);
    expect(r.texts()).toEqual([WRONG_SIDE]);
    vi.advanceTimersByTime(400);
    expect(r.texts()).toEqual([WRONG_SIDE, CHILD]);
    expect(r.said[1].at - r.said[0].at).toBeGreaterThanOrEqual(2500);
    vi.advanceTimersByTime(10000);
    expect(r.texts()).toEqual([WRONG_SIDE, CHILD]);
  });

  it('the waiting safety line is dropped when the voice is stopped (End Drive, mute, voice off)', () => {
    const r = rig();
    r.speak(WRONG_SIDE);
    vi.advanceTimersByTime(200);
    r.speak(CHILD);
    r.stop();
    vi.advanceTimersByTime(10000);
    expect(r.texts()).toEqual([WRONG_SIDE]);
  });

  it('a line marked critical by its caller is treated the same way', () => {
    const r = rig();
    r.speak(TIP);
    vi.advanceTimersByTime(50);
    r.speak('Moose in the travel path. Braking straight, not swerving.', 'hazard', 'critical');
    expect(r.texts()).toHaveLength(2);
    expect(r.scope.ctx.stopTTS).toHaveBeenCalledTimes(1);
  });

  it('other lines keep their spacing: no chattier than before', () => {
    const r = rig();
    r.speak(TIP);
    vi.advanceTimersByTime(1000);
    r.speak('Low fuel. Plan your next stop.');
    expect(r.texts()).toEqual([TIP]); // inside 1.6 s: dropped, as before
    vi.advanceTimersByTime(700);
    r.speak('Low fuel. Plan your next stop.');
    expect(r.texts()).toEqual([TIP, 'Low fuel. Plan your next stop.']);
    expect(r.scope.ctx.stopTTS).not.toHaveBeenCalled(); // an ordinary line never interrupts
    // category windows still hold
    vi.advanceTimersByTime(2000);
    r.speak('In 500 feet, Town Hall on your left. Signal left and slow down.', 'navigation');
    vi.advanceTimersByTime(3000);
    r.speak('Arriving at Town Hall. Pull in when safe.', 'navigation');
    expect(r.texts()).toHaveLength(3);
    // the radio's mention of an emergency vehicle is chatter, not a warning: it keeps its 25 s window
    vi.advanceTimersByTime(2000);
    r.speak('Weather radio: rain conditions holding steady.', 'radio');
    expect(r.texts()).toHaveLength(4);
    vi.advanceTimersByTime(4000);
    r.speak('Traffic alert: emergency vehicle in your area. Be ready to pull right and stop.', 'radio');
    expect(r.texts()).toHaveLength(4);
    expect(r.scope.ctx.stopTTS).not.toHaveBeenCalled();
  });

  it('an ordinary line does not talk over a safety line that just started', () => {
    const r = rig();
    r.speak(CHILD);
    vi.advanceTimersByTime(1800);
    r.speak(TIP);
    expect(r.texts()).toEqual([CHILD]);
    vi.advanceTimersByTime(800);
    r.speak(TIP);
    expect(r.texts()).toEqual([CHILD, TIP]);
  });

  it('the same line twice within 2 s is still said once', () => {
    const r = rig();
    r.speak(CHILD);
    vi.advanceTimersByTime(500);
    r.speak(CHILD);
    vi.advanceTimersByTime(5000);
    expect(r.texts()).toEqual([CHILD]);
  });

  it('emoji are stripped inside speak(), for every caller', () => {
    const r = rig();
    r.speak('\u{1F4A1} Signal before turning. \u{1F6A8}');
    vi.advanceTimersByTime(4000);
    r.speak('❄️ SNOW: gentle inputs only.');
    vi.advanceTimersByTime(4000);
    r.speak('\u{1F6A8}\u{1F6A8}'); // nothing left to say
    expect(r.texts()).toEqual(['Signal before turning.', 'SNOW: gentle inputs only.']);
  });

  it('muted or instructor voice off: nothing, not even a safety line', () => {
    const r = rig();
    window.__alloIsGlobalMuted = () => true;
    r.speak(CHILD);
    window.__alloIsGlobalMuted = () => false;
    r.scope.instructorVoiceRef.current = false;
    r.speak(WRONG_SIDE);
    expect(r.texts()).toEqual([]);
  });

  it('scenario intros and town advisories that only mention a hazard stay ordinary lines (they do not cut in)', () => {
    const intros = [];
    const rx = /introMsg = '((?:[^'\\]|\\.)+)'/g;
    let m;
    while ((m = rx.exec(src))) intros.push(m[1].replace(/\\'/g, "'"));
    const towns = cut('var biomeHazards = {', '};');
    const rx2 = /: '((?:[^'\\]|\\.)+)'/g;
    while ((m = rx2.exec(towns))) intros.push(m[1].replace(/\\'/g, "'"));
    expect(intros.length).toBeGreaterThanOrEqual(8);
    expect(intros.join(' ')).toMatch(/school bus/i); // the school-zone intro names one
    const cutIn = [];
    for (const line of intros) {
      const r = rig();
      r.speak('Fasten your seatbelt before driving.');
      vi.advanceTimersByTime(500);
      r.speak(line);
      if (r.said.length !== 1 || r.scope.ctx.stopTTS.mock.calls.length) cutIn.push(line);
    }
    expect(cutIn).toEqual([]);
  });

  // Not a pin on wording: every line the tool passes to speak() as a literal that is about one
  // of these dangers must get through right after a tip. Chatty categories are left out.
  it('every safety line in the tool source gets through right after a tip', () => {
    const topic = /school bus|emergency vehicle|ambulance|fire truck|child|pedestrian|wrong way|wrong side|rear-ended|airbag|impact|struck|skid|hydroplan|moose|deer|collision/i;
    const lines = [];
    const unq = (s) => s.replace(/\\'/g, "'");
    const call = /speak\(\s*(?:__alloT\('[\w.]+',\s*)?'((?:[^'\\]|\\.)+)'\)?\s*(?:,\s*(?:'(\w+)'|null))?(?:,\s*'(\w+)')?/g;
    let m;
    while ((m = call.exec(src))) {
      if (m[2] === 'navigation' || m[2] === 'coach' || m[2] === 'radio') continue;
      if (topic.test(m[1])) lines.push({ text: unq(m[1]), category: m[2], priority: m[3] });
    }
    // the hazards spoken from a variable: emergency guidance, landmark events, the skid tip
    const feeders = [
      [/return '((?:[^'\\]|\\.)+)'/g, src.slice(src.indexOf('function roundaboutEmergencyGuidance'), src.indexOf('function spawnRoundaboutRider'))],
      [/: '((?:[^'\\]|\\.)+)'/g, cut('var emSpawnGuidance = ', 'showDriveAlert(emRoundaboutSpawn')],
      [/warn: '((?:[^'\\]|\\.)+)'/g, cut("evt = { kind: 'ball'", 'showDriveAlert(evt.icon')],
      [/tip = '((?:[^'\\]|\\.)+)'/g, cut('// Contextual driving tips', 'if (tip) {')],
    ];
    for (const [rx, text] of feeders) while ((m = rx.exec(text))) if (topic.test(m[1])) lines.push({ text: unq(m[1]) });
    const names = lines.map((l) => l.text).join(' | ');
    for (const need of [/school bus/i, /emergency vehicle/i, /child/i, /pedestrian/i, /wrong side/i, /wrong way/i, /rear-ended/i, /airbag/i, /skid/i, /ambulance/i, /fire truck/i]) {
      expect(names).toMatch(need);
    }
    expect(lines.length).toBeGreaterThanOrEqual(20);
    const lost = [];
    for (const line of lines) {
      const r = rig();
      r.speak(TIP);
      vi.advanceTimersByTime(120);
      r.speak(line.text, line.category, line.priority);
      if (r.said.length !== 2) lost.push(line.text);
    }
    expect(lost).toEqual([]);
  });
});

describe('Road Ready stopInstructorVoice: the global device-voice cancel is for old hosts only (au30)', () => {
  let cancel, prevSynth;
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-09T15:00:00Z'));
    cancel = vi.fn();
    prevSynth = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: { cancel, speak: vi.fn() } });
    window.__alloStudentAiDisabled = true; // the case in which the tool used to cancel the device voice
  });
  afterEach(() => {
    vi.useRealTimers();
    if (prevSynth) Object.defineProperty(window, 'speechSynthesis', prevSynth); else delete window.speechSynthesis;
    delete window.__alloStudentAiDisabled;
  });

  it('host has ctx.stopTTS: it is called, and speechSynthesis.cancel() is NOT (it would cut Listen mode or AlloBot)', () => {
    const r = rig();
    r.speak(TIP);
    vi.advanceTimersByTime(300);
    r.stop();
    expect(r.scope.ctx.stopTTS).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    // nor when a safety line cuts in
    r.speak(CHILD);
    expect(r.scope.ctx.stopTTS).toHaveBeenCalledTimes(2);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('older host without ctx.stopTTS: the tool still cancels the device voice it started', () => {
    const r = rig({ noStopTTS: true });
    r.speak(TIP);
    vi.advanceTimersByTime(300);
    r.stop();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

// ---- the real tool, mounted (pattern: tests/roadready_hm25_host_voice.test.js) ----
describe('Road Ready: End Drive stops the instructor (au30; real tool mounted)', () => {
  let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
  beforeAll(async () => {
    const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
    ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let mounted = [];
  async function mount(roadReady, extraCtx) {
    window.__testHooks = {};
    resetStemLab();
    const config = loadTool(TOOL, 'roadReady');
    const calls = [];
    const callTTS = vi.fn((text, voice, speed, opts) => { calls.push({ text, opts }); return new Promise(() => {}); });
    const state = { toolData: { roadReady } };
    function Host() {
      const [toolData, setToolData] = React.useState(state.toolData);
      state.toolData = toolData;
      const ctx = makeCtx(Object.assign({
        toolData,
        callTTS,
        update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
        updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
      }, extraCtx || {}));
      return config.render(ctx);
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    await React.act(async () => { root.render(React.createElement(Host)); });
    const m = { host, root, calls, callTTS, state };
    mounted.push(m);
    return m;
  }
  beforeEach(() => { try { localStorage.removeItem('alloflow_canvas_narrate'); } catch (e) {} delete window.__alloIsGlobalMuted; delete window.__alloStudentAiDisabled; });
  afterEach(async () => {
    for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
    mounted = [];
    delete window.__testHooks;
  });
  const endDriveButton = (host) => [...host.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'End drive and open debrief');

  it('a line still being made is cancelled and ctx.stopTTS is called when End Drive is pressed', async () => {
    const stopTTS = vi.fn();
    const m = await mount({ view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true }, { stopTTS });
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    await React.act(async () => { await sleep(1300); });
    expect(m.calls.length).toBeGreaterThan(0);
    const line = m.calls[m.calls.length - 1];
    expect(line.opts.signal.aborted).toBe(false);
    stopTTS.mockClear();
    const end = endDriveButton(m.host);
    expect(end, 'no End Drive button').toBeTruthy();
    await React.act(async () => { end.click(); });
    expect(m.state.toolData.roadReady.view).not.toBe('driving');
    expect(stopTTS).toHaveBeenCalled();
    expect(line.opts.signal.aborted).toBe(true);
    // nothing is spoken on the way out
    const n = m.calls.length;
    await React.act(async () => { await sleep(300); });
    expect(m.calls.length).toBe(n);
  });
});
