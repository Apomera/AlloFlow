import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Round 30, lane audio (au30). The drive's sound graph, run OUTSIDE the app: jsdom does not run
// Road Ready's frame loop (no WebGL), so these tests slice the production functions out of the
// tool source (updateAudio, the two teardown blocks, the resume helper, the shared buffers) and
// run them on a fake AudioContext that records every node. Where a block is too big to run
// (updatePhysics), the check is at source level and says so.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
function cut(a, b, optional) {
  const i = src.indexOf(a);
  const j = i < 0 ? -1 : src.indexOf(b, i);
  if (i < 0 || j < 0) { if (optional) return ''; throw new Error('cannot find ' + a.trim().slice(0, 60)); }
  return src.slice(i, j);
}
const SHARED = cut('  var _rrAudioBufferCache = {};', '  var _RoadReadyCountUp = null;', true);
const RESUME = cut('      var requestDriveAudioResume = function(now) {', '      var playHorn = function(dur) {', true);
const UPDATE = cut('        var updateAudio = function() {', '        var checkSignalCompliance = function() {');
const EXIT_TEARDOWN = cut('        // Stop ALL audio nodes (prevent memory leak', '        // Cancel any pending tracked timeouts (audio fades');
const NAV_TEARDOWN = cut('          // Stop all long-running audio oscillators on nav-away.', '          // Radio nodes are NOT in the list above');

// One "page": the module-scope part runs once; every drive() call is a new drive on that page.
function makePage() {
  const body = SHARED + '\nreturn function (scope) { with (scope) {\n' + RESUME + '\n' + UPDATE +
    '\nreturn { updateAudio: updateAudio,' +
    ' resume: (typeof requestDriveAudioResume === "undefined" ? null : requestDriveAudioResume),' +
    ' exitTeardown: function () {\n' + EXIT_TEARDOWN + '\n},' +
    ' navTeardown: function () {\n' + NAV_TEARDOWN + '\n} };\n} };';
  return new Function(body)();
}

// ---- fake Web Audio that records nodes ----
function makeAudio() {
  const log = { nodes: [], buffers: [], samples: 0, resumes: 0, suspends: 0 };
  function param(owner, name, v) {
    const p = { owner, name, value: v == null ? 0 : v, targets: [] };
    p.setTargetAtTime = (value, at, tc) => { p.targets.push({ value, at, tc }); return p; };
    p.setValueAtTime = (value, at) => { p.targets.push({ value, at }); return p; };
    p.linearRampToValueAtTime = (value, at) => { p.targets.push({ value, at }); return p; };
    p.exponentialRampToValueAtTime = (value, at) => { p.targets.push({ value, at }); return p; };
    p.last = () => (p.targets.length ? p.targets[p.targets.length - 1].value : p.value);
    return p;
  }
  class Ctx {
    constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 48000; this.destination = { kind: 'destination', connect() {} }; }
    resume() { log.resumes++; return Promise.resolve(); }
    suspend() { log.suspends++; return Promise.resolve(); }
    _node(kind) {
      const n = { kind, ctx: this, started: 0, stopped: 0, stopArgs: [], startArgs: [], buffer: null, loop: false, type: '', frame: log.frame || 0 };
      n.connect = (x) => x; n.disconnect = () => {};
      n.start = (...a) => { n.started++; n.startArgs.push(a); };
      n.stop = (...a) => { n.stopped++; n.stopArgs.push(a); };
      for (const k of ['frequency', 'gain', 'Q', 'pan', 'detune']) n[k] = param(n, k, k === 'gain' ? 1 : 0);
      log.nodes.push(n);
      return n;
    }
    createOscillator() { return this._node('Oscillator'); }
    createBufferSource() { return this._node('BufferSource'); }
    createGain() { return this._node('Gain'); }
    createBiquadFilter() { return this._node('BiquadFilter'); }
    createStereoPanner() { return this._node('StereoPanner'); }
    createBuffer(ch, len, rate) {
      const data = new Float32Array(Math.floor(len));
      const b = { kind: 'Buffer', length: Math.floor(len), sampleRate: rate, getChannelData: () => data };
      log.buffers.push(b); log.samples += Math.floor(len);
      return b;
    }
  }
  const playing = () => log.nodes.filter((n) => (n.kind === 'Oscillator' || n.kind === 'BufferSource') && n.started > 0 && n.stopped === 0);
  return { log, Ctx, playing };
}

// ---- one drive: the refs updateAudio reads, as the simulation effect has them ----
function makeDrive(page, audio, opts) {
  opts = opts || {};
  const ctx = opts.ctx || new audio.Ctx();
  const crossing = { centerX: 48, centerY: 60, activeControl: true };
  const scope = {
    audioRef: { current: opts.audioState || { ctx, engineOsc: null, engineGain: null, started: false } },
    carRef: { current: { x: 48, y: 48, heading: 0, speed: 8, throttle: 0.3, brake: 0, steering: 0 } },
    calmDriveRef: { current: false }, gearRef: { current: 'D' }, playGearShift() {},
    infiniteWorldRef: { current: { _railroadCrossings: [crossing], getChunk: () => ({ biome: 'rural' }) } },
    playerRoadStation: () => 48, CHUNK_SIZE: 96,
    railroadCrossingControlState: () => ({ stopRequired: true, occupied: false, cycle: 1 }),
    currentScenario: { id: 'rural', time: 'day', weather: 'clear', speedLimit: 45 },
    timeRef: { current: 0 }, skidRef: { current: { active: false } },
    blinkerRef: { current: 0 }, blinkerTimerRef: { current: 0 },
    tireDynamicsRef: { current: { surfaceContact: { dominantSurface: 'pavement' } } },
    pausedRef: { current: false }, drivingRef: { current: true },
    dataRef: { current: { view: 'driving' } }, stopInstructorVoice() {},
    safeTimeout(fn, ms) { scope._timeouts.push({ fn, ms }); return scope._timeouts.length; }, _timeouts: [],
  };
  scope.audioRef.current.ctx = ctx;
  const fns = page(scope);
  const DT = 1 / 60;
  let frameNo = 0;
  function frame() {
    // what step() does around updateAudio: the physics advances both clocks first
    scope.timeRef.current += DT;
    scope.blinkerTimerRef.current += DT;
    ctx.currentTime += DT;
    audio.log.frame = ++frameNo;
    fns.updateAudio();
  }
  const run = (seconds) => { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) frame(); };
  return { scope, ctx, fns, frame, run, a: scope.audioRef.current };
}

// Every loop the drive can start: rain + wipers, day birds, night crickets, reverse, a skid, the bell.
function driveEverything(d) {
  d.scope.currentScenario.weather = 'rain';
  d.run(0.5);
  d.scope.gearRef.current = 'R';
  d.scope.skidRef.current.active = true;
  d.run(0.5);
  d.scope.skidRef.current.active = false;
  d.scope.currentScenario.time = 'night';
  d.scope.blinkerRef.current = 1;
  d.run(1);
}

let audio;
beforeEach(() => { audio = makeAudio(); delete window.__alloIsGlobalMuted; });
afterEach(() => { vi.restoreAllMocks(); delete window.__alloIsGlobalMuted; });

describe('Road Ready: nothing keeps playing after the drive ends (au30)', () => {
  it('the drive builds the railroad bell and it rings near an active crossing', () => {
    const d = makeDrive(makePage(), audio);
    d.run(1);
    expect(d.a._rrBellOsc, 'no bell oscillator').toBeTruthy();
    expect(d.a._rrBellOsc.started).toBe(1);
    expect(Math.max(...d.a._rrBellGain.gain.targets.map((t) => t.value))).toBeGreaterThan(0);
  });

  it.each([['End Drive (exitDriving)', 'exitTeardown'], ['leaving the driving view (effect cleanup)', 'navTeardown']])(
    '%s: every source that was started is stopped, the bell included', (label, which) => {
      const d = makeDrive(makePage(), audio);
      driveEverything(d);
      const started = audio.log.nodes.filter((n) => (n.kind === 'Oscillator' || n.kind === 'BufferSource') && n.started > 0);
      expect(started.length).toBeGreaterThan(12);
      const bell = d.a._rrBellOsc, bellGain = d.a._rrBellGain;
      d.fns[which]();
      expect(audio.playing().map((n) => n.kind + ' ' + (n.type || '') + ' made in frame ' + n.frame)).toEqual([]);
      expect(bell.stopped).toBeGreaterThan(0);
      expect(bellGain.gain.value).toBe(0);
      expect(d.a._rrBellOsc).toBeNull();
      expect(d.a._rrBellGain).toBeNull();
    });

  it('leaving the driving view another way also stops the instructor; a scenario or vehicle change inside the drive does not', () => {
    const d = makeDrive(makePage(), audio);
    d.run(0.2);
    const stop = vi.fn();
    d.scope.stopInstructorVoice = stop;
    d.scope.dataRef.current = { view: 'driving' }; // the effect re-runs for a new scenario: still driving
    d.fns.navTeardown();
    expect(stop).not.toHaveBeenCalled();
    d.scope.dataRef.current = { view: 'menu' };
    d.fns.navTeardown();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('a skid that ended just before End Drive: its oscillator has a stop time (not a timeout End Drive cancels)', () => {
    const d = makeDrive(makePage(), audio);
    d.run(0.2);
    d.scope.skidRef.current.active = true;
    d.run(0.2);
    const skid = d.a._skidOsc;
    expect(skid && skid.started).toBe(1);
    d.scope.skidRef.current.active = false;
    d.frame();
    expect(skid.stopped).toBe(1);
    expect(skid.stopArgs[0][0]).toBeGreaterThan(d.ctx.currentTime);
  });

  it('source level: every looping source updateAudio (and the siren / rumble code) keeps on audioRef is in BOTH stop lists', () => {
    const keys = new Set();
    const rx = /(?:\ba|\bar|audioRef\.current)\.(_?[A-Za-z]+) = (?:a|ar|ac|audioRef\.current)\.ctx\.create(?:Oscillator|BufferSource)\(\)|audioRef\.current\.(_?[A-Za-z]+) = ac\.create(?:Oscillator|BufferSource)\(\)/g;
    let m;
    while ((m = rx.exec(src))) keys.add(m[1] || m[2]);
    expect(keys.size).toBeGreaterThan(14);
    expect(keys.has('_rrBellOsc')).toBe(true);
    for (const block of [EXIT_TEARDOWN, NAV_TEARDOWN]) {
      const missing = [...keys].filter((k) => !block.includes("'" + k + "'"));
      expect(missing).toEqual([]);
      expect(block).toContain("'_rrBellGain'");
    }
  });
});

describe('Road Ready: rain follows the weather (au30)', () => {
  it('rain on: the patter fades in; weather clears: its gain goes to 0', () => {
    const d = makeDrive(makePage(), audio);
    d.scope.currentScenario.weather = 'rain';
    d.run(2);
    const g = d.a._rainGain;
    expect(g, 'no rain loop').toBeTruthy();
    expect(g.gain.last()).toBeGreaterThan(0);
    const wiper = d.a._wiperGain;
    d.scope.currentScenario.weather = 'clear'; // Dynamic weather: the shower passes
    d.run(1);
    expect(g.gain.last()).toBe(0);
    expect(wiper.gain.last()).toBe(0);
    d.scope.currentScenario.weather = 'rain'; // and comes back
    d.run(1);
    expect(d.a._rainGain).toBe(g);
    expect(g.gain.last()).toBeGreaterThan(0);
  });

  it('a clear drive never builds the rain loop', () => {
    const d = makeDrive(makePage(), audio);
    d.run(1);
    expect(d.a._rainNode).toBeFalsy();
  });
});

describe('Road Ready: one turn-signal click per flash (au30)', () => {
  // The lamp test the dash arrow, the HUD and the car's lamps all use.
  const lampOn = (t) => Math.floor(t * 2.5) % 2 === 0;

  it('the lamp test in this file is the one the tool draws with', () => {
    const uses = src.split('Math.floor(blinkerTimerRef.current * 2.5) % 2 === 0').length - 1;
    expect(uses).toBeGreaterThanOrEqual(3); // 3D lamps, cluster arrow, HUD arrow (+ the click)
  });

  it('8 s of signalling: exactly one click each time the lamp comes on, none while it is off', () => {
    const d = makeDrive(makePage(), audio);
    d.run(1); // every looping node exists now
    const before = audio.log.nodes.length;
    d.scope.blinkerRef.current = -1;
    let flashes = 0, was = false;
    for (let i = 0; i < 480; i++) {
      d.frame();
      const on = lampOn(d.scope.blinkerTimerRef.current);
      if (on && !was) flashes++;
      was = on;
    }
    const clicks = audio.log.nodes.slice(before).filter((n) => n.kind === 'Oscillator');
    expect(flashes).toBeGreaterThanOrEqual(10); // 8 s at 0.8 s per flash, plus the one already lit when the signal went on
    expect(flashes).toBeLessThanOrEqual(11);
    expect(clicks.length).toBe(flashes);
    // each click is made in a frame where the lamp is lit, and is told to stop
    for (const c of clicks) { expect(c.started).toBe(1); expect(c.stopped).toBe(1); }
    d.scope.blinkerRef.current = 0;
    const n2 = audio.log.nodes.length;
    d.run(3);
    expect(audio.log.nodes.slice(n2).filter((n) => n.kind === 'Oscillator')).toHaveLength(0);
  });

  it('source level (updatePhysics is not run here): no second click generator anywhere', () => {
    expect(src).not.toContain('_lastBlinkTickOn');
    expect(src).not.toContain('_signalPhasePrev');
    expect(UPDATE).not.toContain('(timeRef.current * 1.5) % 1');
    expect(UPDATE.split('blinkerRef.current !== 0').length - 1).toBe(1);
    const afterTimer = src.slice(src.indexOf('blinkerTimerRef.current += dt;'), src.indexOf('blinkerTimerRef.current += dt;') + 900);
    expect(afterTimer).not.toContain('createOscillator');
  });
});

describe('Road Ready: noise is generated once per page, not once per drive (au30)', () => {
  it('two drives (the second on a new AudioContext): buffers are built during the first only', () => {
    const page = makePage();
    const d1 = makeDrive(page, audio);
    driveEverything(d1);
    const built = audio.log.buffers.length, samples = audio.log.samples;
    expect(built).toBeGreaterThan(0);
    expect(built).toBeLessThanOrEqual(2); // white noise + the ambient texture
    expect(samples).toBeLessThanOrEqual(48000 * 6);
    const sources1 = audio.log.nodes.filter((n) => n.kind === 'BufferSource');
    // engine combustion, day birds, night crickets, wiper, wind, tire, rain, ambient
    expect(sources1.length).toBe(8);
    for (const s of sources1) { expect(s.buffer).toBeTruthy(); expect(s.loop).toBe(true); }
    d1.fns.exitTeardown();
    // same component, next drive: same audioRef object, nodes were nulled by the teardown
    const d2 = makeDrive(page, audio, { audioState: d1.a, ctx: new audio.Ctx() });
    driveEverything(d2);
    expect(audio.log.buffers.length).toBe(built);
    expect(audio.log.samples).toBe(samples);
    const sources2 = audio.log.nodes.filter((n) => n.kind === 'BufferSource' && n.ctx === d2.ctx);
    expect(sources2.length).toBe(sources1.length);
    for (const s of sources2) expect(audio.log.buffers).toContain(s.buffer);
  });

  it('a context with another sample rate gets its own buffer', () => {
    const page = makePage();
    driveEverything(makeDrive(page, audio));
    const built = audio.log.buffers.length;
    const other = new audio.Ctx(); other.sampleRate = 44100;
    driveEverything(makeDrive(page, audio, { ctx: other }));
    expect(audio.log.buffers.length).toBe(built * 2);
    expect(audio.log.buffers[audio.log.buffers.length - 1].sampleRate).toBe(44100);
  });

  it('the shared noise is full scale and each loop is scaled to its old level', () => {
    const page = makePage();
    const d = makeDrive(page, audio);
    d.scope.currentScenario.weather = 'rain';
    d.scope.carRef.current.speed = 10;
    d.run(2);
    const data = d.a._windNode.buffer.getChannelData(0);
    let peak = 0; for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    expect(peak).toBeGreaterThan(0.9);
    // old private buffers: wind 0.3, tire 0.6, rain 0.15 of full scale
    expect(d.a._windGain.gain.last()).toBeCloseTo(Math.min(0.06, 10 * 0.003) * 0.3, 10);
    expect(d.a._tireGain.gain.last()).toBeCloseTo(Math.min(0.08, 10 * 0.0022 * 1.25) * 0.6, 10);
    expect(d.a._rainGain.gain.last()).toBeCloseTo(0.025 * 0.15, 10);
  });
});

describe('Road Ready: a suspended context is asked to resume at most once a second (au30)', () => {
  let clock;
  beforeEach(() => { clock = 1750000000000; vi.spyOn(Date, 'now').mockImplementation(() => clock); });
  function suspendedDrive() {
    const d = makeDrive(makePage(), audio);
    d.run(0.1);
    d.ctx.state = 'suspended'; // the browser's autoplay block: resume() does not start it
    audio.log.resumes = 0;
    return d;
  }
  const frames = (d, n) => { for (let i = 0; i < n; i++) { clock += 1000 / 60; d.frame(); } };

  it('3 s of frames: 3 or 4 requests, not 180', () => {
    const d = suspendedDrive();
    frames(d, 180);
    expect(audio.log.resumes).toBeGreaterThanOrEqual(3);
    expect(audio.log.resumes).toBeLessThanOrEqual(4);
  });

  it('never while the app is muted; asked again once it is unmuted', () => {
    const d = suspendedDrive();
    window.__alloIsGlobalMuted = () => true;
    frames(d, 180);
    expect(audio.log.resumes).toBe(0);
    window.__alloIsGlobalMuted = () => false;
    frames(d, 90);
    expect(audio.log.resumes).toBeGreaterThanOrEqual(1);
  });

  it('never while the drive is paused; an explicit request (unpause, unmute) is not held back by the 1 s limit', () => {
    const d = suspendedDrive();
    expect(typeof d.fns.resume).toBe('function');
    d.scope.pausedRef.current = true;
    for (let i = 0; i < 5; i++) { clock += 2000; expect(d.fns.resume(true)).toBe(false); }
    expect(audio.log.resumes).toBe(0);
    d.scope.pausedRef.current = false;
    expect(d.fns.resume()).toBe(true);
    expect(d.fns.resume()).toBe(false);
    expect(d.fns.resume(true)).toBe(true);
    expect(audio.log.resumes).toBe(2);
    d.ctx.state = 'running';
    clock += 5000;
    expect(d.fns.resume(true)).toBe(false);
  });
});
