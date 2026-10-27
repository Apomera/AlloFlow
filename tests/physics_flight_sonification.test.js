import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { drawPhysicsElementTree } from './helpers/physics_element_tree.js';

// "Hear the flight": a recorded trail played as sound. Pitch follows height (log scale),
// stereo pan follows distance, real flight timing is kept, and cues mark apex and impact.
let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});

function flight(angle, vel, { grav = 9.8, drag = false, mass = 1, height = 0 } = {}) {
  const rad = angle * Math.PI / 180;
  const b = { mX: 0, mY: height, mVx: vel * Math.cos(rad), mVy: vel * Math.sin(rad), grav, drag: drag ? P.DRAG_K : 0, mass, t: 0 };
  const trail = [{ mX: 0, mY: height, mVx: b.mVx, mVy: b.mVy, t: 0 }];
  for (let i = 0; i < 6000 && !b.landed; i++) { P.step(b, P.DT); P.recordSample(trail, b); }
  trail.apex = b.apex;
  return trail;
}
const maxFreq = plan => Math.max(...plan.samples.map(s => s.freq));

describe('sonification plan', () => {
  it('maps height to pitch on a log scale from the ground note to the top note', () => {
    const plan = P.sonifyPlan(flight(45, 25));
    expect(plan.samples[0].freq).toBeCloseTo(P.SONIFY.fMin, 6);
    expect(maxFreq(plan)).toBeCloseTo(P.SONIFY.fMax, 4);
    // Half the height is half the way up in musical terms: one octave above the ground note.
    const mid = plan.samples.reduce((best, s) => Math.abs(s.freq - 440) < Math.abs(best.freq - 440) ? s : best);
    expect(mid.freq).toBeGreaterThan(425); expect(mid.freq).toBeLessThan(455);
    // Rising then falling, never out of order around the apex.
    const top = plan.samples.findIndex(s => s.freq === maxFreq(plan));
    for (let i = 1; i <= top; i++) expect(plan.samples[i].freq).toBeGreaterThanOrEqual(plan.samples[i - 1].freq - 1e-9);
    for (let i = top + 1; i < plan.samples.length; i++) expect(plan.samples[i].freq).toBeLessThanOrEqual(plan.samples[i - 1].freq + 1e-9);
  });

  it('pans left to right with distance and never leaves the safe range', () => {
    const plan = P.sonifyPlan(flight(35, 30));
    expect(plan.samples[0].pan).toBeCloseTo(-P.SONIFY.panMax, 9);
    expect(plan.samples[plan.samples.length - 1].pan).toBeCloseTo(P.SONIFY.panMax, 9);
    plan.samples.forEach((s, i) => { expect(Math.abs(s.pan)).toBeLessThanOrEqual(P.SONIFY.panMax + 1e-9); if (i) expect(s.pan).toBeGreaterThanOrEqual(plan.samples[i - 1].pan); });
  });

  it('keeps real timing: a vacuum arc is symmetric, a drag arc peaks earlier', () => {
    const vac = P.sonifyPlan(flight(45, 25)), air = P.sonifyPlan(flight(45, 50, { drag: true }));
    expect(vac.apexFraction).toBeCloseTo(0.5, 3);
    expect(vac.duration).toBeCloseTo(vac.flightTime, 9);
    expect(air.apexFraction).toBeLessThan(0.49);
    const apexCue = air.cues.find(c => c.kind === 'apex');
    expect(apexCue.t / air.duration).toBeCloseTo(air.apexFraction, 9);
  });

  it('adds a launch tick, an apex tick and an impact thud, and skips an apex that is the launch point', () => {
    const plan = P.sonifyPlan(flight(45, 25));
    expect(plan.cues.map(c => c.kind)).toEqual(['launch', 'apex', 'impact']);
    expect(plan.cues[0].t).toBe(0); expect(plan.cues[2].t).toBeCloseTo(plan.duration, 9);
    const flat = P.sonifyPlan(flight(0, 20, { height: 20 }));
    expect(flat.cues.map(c => c.kind)).toEqual(['launch', 'impact']);
    expect(flat.samples[0].freq).toBeCloseTo(P.SONIFY.fMax, 4);       // already at the top note at release
  });

  it('shares one pitch scale across flights so they can be compared by ear', () => {
    const vac = flight(45, 25), air = flight(45, 25, { drag: true });
    const ref = Math.max(P.sonifyPlan(vac).maxH, P.sonifyPlan(air).maxH);
    const a = P.sonifyPlan(vac, { refHeight: ref }), b = P.sonifyPlan(air, { refHeight: ref });
    expect(maxFreq(a)).toBeCloseTo(P.SONIFY.fMax, 4);
    expect(maxFreq(b)).toBeLessThan(maxFreq(a) - 50);                  // the lower drag arc sounds lower
    expect(b.maxH).toBeLessThan(a.maxH);
  });

  it('stretches tiny flights, slows with slow motion, and compresses long ones without changing proportions', () => {
    expect(P.sonifyPlan(flight(5, 5, { grav: 25 })).duration).toBeCloseTo(P.SONIFY.minSeconds, 9);
    const normal = P.sonifyPlan(flight(45, 25)), slow = P.sonifyPlan(flight(45, 25), { speed: 0.5 });
    expect(slow.duration).toBeCloseTo(normal.duration * 2, 6);
    const moon = P.sonifyPlan(flight(45, 25, { grav: 1.6 }));
    expect(moon.flightTime).toBeGreaterThan(20);
    expect(moon.duration).toBeCloseTo(P.SONIFY.maxSeconds, 9);
    expect(moon.apexFraction).toBeCloseTo(0.5, 3);
    expect(moon.cues[1].t).toBeCloseTo(moon.duration / 2, 2);
  });

  it('refuses unusable trails and ignores corrupt points', () => {
    for (const bad of [null, undefined, [], [{ t: 0, mX: 0, mY: 0 }], [{ t: 0, mX: 0, mY: 0 }, { t: 0, mX: 1, mY: 0 }], 'x', [{ t: NaN, mX: 0, mY: 0 }, { t: 1, mX: 1, mY: 0 }]]) expect(P.sonifyPlan(bad)).toBeNull();
    const t = flight(45, 25); t.splice(10, 0, { t: NaN, mX: 1, mY: 1 }, null, { t: 1, mX: 1, mY: -3 });
    const plan = P.sonifyPlan(t);
    expect(plan).not.toBeNull();
    plan.samples.forEach(s => { expect(Number.isFinite(s.freq)).toBe(true); expect(s.freq).toBeGreaterThanOrEqual(P.SONIFY.fMin - 1e-9); });
  });

  it('thins long trails to a bounded schedule that still ends on the landing', () => {
    const plan = P.sonifyPlan(flight(45, 50, { grav: 3 }));
    expect(plan.samples.length).toBeLessThanOrEqual(161);
    expect(plan.samples[plan.samples.length - 1].t).toBeCloseTo(plan.duration, 6);
    plan.samples.forEach((s, i) => { if (i) expect(s.t).toBeGreaterThan(plan.samples[i - 1].t); });
  });
});

function fakeAudio() {
  const log = { osc: [], gain: [], pan: [] };
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const ac = {
    currentTime: 10, state: 'running', destination: { id: 'dest' },
    createOscillator: vi.fn(() => { const o = { type: '', frequency: param(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; log.osc.push(o); return o; }),
    createGain: vi.fn(() => { const g = { gain: param(), connect: vi.fn() }; log.gain.push(g); return g; }),
    createStereoPanner: vi.fn(() => { const p = { pan: param(), connect: vi.fn() }; log.pan.push(p); return p; }),
  };
  return { ac, log };
}

describe('sonification playback', () => {
  beforeEach(() => { vi.useRealTimers(); });

  it('schedules the whole arc on one oscillator plus three cues, then reports the end once', () => {
    vi.useFakeTimers();
    const { ac, log } = fakeAudio(); const plan = P.sonifyPlan(flight(45, 25)); const onEnd = vi.fn();
    const handle = P.sonifyPlay(plan, ac, onEnd);
    expect(handle.duration).toBeCloseTo(plan.duration, 9);
    expect(log.osc).toHaveLength(1 + plan.cues.length);
    const main = log.osc[0];
    expect(main.frequency.exponentialRampToValueAtTime).toHaveBeenCalledTimes(plan.samples.length - 1);
    expect(log.pan[0].pan.linearRampToValueAtTime).toHaveBeenCalledTimes(plan.samples.length - 1);
    const ramps = main.frequency.exponentialRampToValueAtTime.mock.calls;
    expect(Math.max(...ramps.map(c => c[0]))).toBeCloseTo(P.SONIFY.fMax, 4);
    expect(ramps[ramps.length - 1][1]).toBeCloseTo(10.06 + plan.duration, 6);   // ends at the landing time
    const apexOsc = log.osc[2]; expect(apexOsc.frequency.setValueAtTime.mock.calls[0][0]).toBe(P.SONIFY.apexHz);
    expect(apexOsc.frequency.setValueAtTime.mock.calls[0][1]).toBeCloseTo(10.06 + plan.cues[1].t, 6);
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime((plan.duration + 0.5) * 1000);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('stop() silences every node immediately and ends once', () => {
    vi.useFakeTimers();
    const { ac, log } = fakeAudio(); const onEnd = vi.fn();
    const handle = P.sonifyPlay(P.sonifyPlan(flight(45, 25)), ac, onEnd);
    handle.stop(); handle.stop();
    expect(onEnd).toHaveBeenCalledTimes(1);
    log.osc.forEach(o => { expect(o.stop).toHaveBeenCalledTimes(2); expect(o.disconnect).toHaveBeenCalled(); });   // scheduled stop + immediate stop
    vi.advanceTimersByTime(60000);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('works without a stereo panner and returns null when audio is unavailable or throws', () => {
    const { ac, log } = fakeAudio(); delete ac.createStereoPanner;
    const plan = P.sonifyPlan(flight(45, 25));
    expect(P.sonifyPlay(plan, ac, () => {})).not.toBeNull();
    expect(log.gain[0].connect).toHaveBeenCalledWith(ac.destination);
    const onEnd = vi.fn();
    expect(P.sonifyPlay(plan, null, onEnd)).toBeNull();
    expect(P.sonifyPlay(null, ac, onEnd)).toBeNull();
    const broken = fakeAudio().ac; broken.createOscillator = vi.fn(() => { throw new Error('blocked'); });
    expect(P.sonifyPlay(plan, broken, onEnd)).toBeNull();
    expect(onEnd).toHaveBeenCalledTimes(1);                                   // the throwing case reports an immediate end
  });
});

function render(physics = {}) {
  let state = { physics };
  const ctx = {
    React: { useState: v => [v, () => {}], createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    icons: {}, props: {}, toolSnapshots: [], gradeLevel: '8th Grade', setToolData: u => { state = u(state); },
    t: (_k, fallback) => fallback, addToast: vi.fn(), announceToSR: vi.fn(), awardXP: vi.fn(),
  };
  return { draw: () => drawPhysicsElementTree(ctx, state), ctx, state: () => state.physics };
}
const all = (tree, p) => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(c => all(c, p)) : [...(p(tree) ? [tree] : []), ...all(tree.children, p)];
const find = (tree, p) => all(tree, p)[0];
const text = tree => Array.isArray(tree) ? tree.map(text).join(' ') : tree && typeof tree === 'object' ? text(tree.children) : tree == null || tree === false ? '' : String(tree);
const hearButton = tree => find(tree, n => n.props && n.props['data-physics-hear']);
const canvas = (extra = {}) => { const cv = document.createElement('canvas'); cv.id = 'physicsCanvas'; Object.assign(cv, extra); document.body.appendChild(cv); return cv; };

describe('Hear the flight button', () => {
  let audio;
  beforeEach(() => {
    document.getElementById('physicsCanvas')?.remove();
    audio = fakeAudio();
    window.StemLab.audioContext = () => audio.ac;
  });

  it('is disabled until a flight has landed, and says why in its help line', () => {
    const app = render({});
    const b = hearButton(app.draw());
    expect(b.props.disabled).toBe(true);
    expect(text(find(app.draw(), n => n.props && n.props.id === 'physics-hear-help'))).toMatch(/once a flight has landed/);
    expect(b.props['aria-describedby']).toBe('physics-hear-help');
    canvas({ _trails: [flight(45, 25)] });
    expect(hearButton(app.draw()).props.disabled).toBe(false);
    document.getElementById('physicsCanvas')._launched = true;
    expect(hearButton(app.draw()).props.disabled).toBe(true);
  });

  it('plays the latest flight, announces it, toggles to Stop, and stops on a second press', () => {
    const cv = canvas({ _trails: [flight(45, 25)] });
    const app = render({ simSpeed: 1 });
    hearButton(app.draw()).props.onClick();
    expect(audio.log.osc.length).toBe(4);
    expect(cv._hearing).toBeTruthy();
    expect(app.ctx.announceToSR).toHaveBeenCalledTimes(1);
    expect(app.ctx.announceToSR.mock.calls[0][0]).toMatch(/Highest point 15\.9 m at 1\.80 s; it lands 63\.8 m away after 3\.61 s/);
    expect(text(hearButton(app.draw()))).toContain('Stop the sound');
    hearButton(app.draw()).props.onClick();
    expect(cv._hearing).toBeNull();
    expect(text(hearButton(app.draw()))).toContain('Hear the last flight');
  });

  it('judges the latest flight against the highest retained one (one shared pitch scale)', () => {
    const low = flight(30, 15), high = flight(45, 30);
    canvas({ _trails: [high, low] });
    const app = render({});
    const b = hearButton(app.draw());
    expect(text(b)).toContain('Hear the last flight');
    b.props.onClick();
    const peak = Math.max(...audio.log.osc[0].frequency.exponentialRampToValueAtTime.mock.calls.map(c => c[0]));
    expect(peak).toBeLessThan(P.SONIFY.fMax - 100);       // the low flight is judged against the higher retained one
  });

  it('follows the slow-motion setting, and tells the student when sound is unavailable', () => {
    canvas({ _trails: [flight(45, 25)] });
    const slow = render({ simSpeed: 0.5 });
    hearButton(slow.draw()).props.onClick();
    const last = audio.log.osc[0].frequency.exponentialRampToValueAtTime.mock.calls.at(-1)[1];
    expect(last).toBeCloseTo(10.06 + 3.61 * 2, 1);
    document.getElementById('physicsCanvas')._hearing.stop();
    window.StemLab.audioContext = () => null;
    const quiet = render({}); const toast = quiet.ctx.addToast;
    hearButton(quiet.draw()).props.onClick();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toContain('Sound is not available here.');
  });
});

describe('source contract', () => {
  const src = readFileSync('stem_lab/stem_tool_physics.js', 'utf8');
  it('stops the sound when a new launch starts', () => {
    expect(src).toMatch(/if \(cv\._hearing\) cv\._hearing\.stop\(\);\s*bump\('launchCount', 1\)/);
  });
  it('keeps the public mirror identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js', 'utf8')).toBe(src);
  });
  it('registers every new string key with a literal English fallback', () => {
    for (const k of ['hear_last', 'hear_selected', 'hear_stop', 'hear_help', 'hear_announce', 'hear_unavailable']) expect(src).toContain("__alloT('stem.physics." + k + "', '");
  });
});
