import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { drawPhysicsElementTree } from './helpers/physics_element_tree.js';

// Hear the curve: the Range explorer's curves played as a left-to-right pitch sweep,
// so the peak and the effect of drag can be heard as well as seen.
let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});

function render(physics = {}) {
  let state = { physics: { angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, showRangeExplorer: true, ...physics } };
  const awardXP = vi.fn(), announceToSR = vi.fn(), addToast = vi.fn();
  const ctx = {
    React: { useState: value => [value, () => {}], createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    icons: {}, props: {}, toolSnapshots: [], gradeLevel: '10th Grade', setToolData: update => { state = update(state); },
    t: (_key, fallback) => fallback, addToast, announceToSR, awardXP,
  };
  return { draw: () => drawPhysicsElementTree(ctx, state), state: () => state.physics, announceToSR, addToast };
}
function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => all(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...all(tree.children, predicate)];
}
const find = (tree, predicate) => all(tree, predicate)[0];
const attr = (tree, name) => find(tree, node => node.props && node.props[name] !== undefined && node.props[name] !== false);
const text = tree => Array.isArray(tree) ? tree.map(text).join(' ') : tree && typeof tree === 'object' ? text(tree.children) : tree == null || tree === false ? '' : String(tree);
const listenButtons = tree => all(tree, n => n.props && n.props['data-physics-range-listen-curve']);

function fakeAudio() {
  const log = { osc: [] };
  const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const ac = {
    currentTime: 10, state: 'running', destination: {},
    createOscillator: vi.fn(() => { const o = { type: '', frequency: param(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; log.osc.push(o); return o; }),
    createGain: vi.fn(() => ({ gain: param(), connect: vi.fn() })),
    createStereoPanner: vi.fn(() => ({ pan: param(), connect: vi.fn() })),
  };
  return { ac, log };
}
const angleCurve = (s, field) => s.points.map(p => ({ x: p.angle, y: p[field] }));

describe('curve sonification plan', () => {
  it('sweeps the no-drag ground curve in 4 s with the chime exactly halfway, at 45°', () => {
    const s = P.rangeSweep(25, 9.8, false, 1, 0);
    const plan = P.curveSonifyPlan(angleCurve(s, 'range'), { refY: s.vacuumBest.range, peakX: s.vacuumBest.angle, peakY: s.vacuumBest.range });
    expect(plan.duration).toBe(P.CURVE_SECONDS);
    expect(plan.samples).toHaveLength(81);
    expect(plan.samples[0]).toMatchObject({ t: 0, pan: -P.SONIFY.panMax });
    expect(plan.samples[80].t).toBeCloseTo(4, 9);
    expect(plan.samples[80].pan).toBeCloseTo(P.SONIFY.panMax, 9);
    expect(plan.cues.map(c => c.kind)).toEqual(['start', 'peak']);
    expect(plan.cues[1].t).toBeCloseTo(2, 4);
    expect(Math.max(...plan.samples.map(x => x.freq))).toBeCloseTo(P.SONIFY.fMax, 3);
  });

  it('puts the drag curve below the no-drag curve at every angle on a shared scale', () => {
    const s = P.rangeSweep(50, 9.8, true, 1, 0);
    const refY = Math.max(...s.points.map(p => p.vacuumRange));
    const drag = P.curveSonifyPlan(angleCurve(s, 'range'), { refY, peakX: s.best.angle, peakY: s.best.range });
    const vac = P.curveSonifyPlan(angleCurve(s, 'vacuumRange'), { refY, peakX: s.vacuumBest.angle, peakY: s.vacuumBest.range });
    drag.samples.forEach((x, i) => expect(x.freq).toBeLessThanOrEqual(vac.samples[i].freq + 1e-9));
    expect(Math.max(...drag.samples.map(x => x.freq))).toBeLessThan(0.7 * P.SONIFY.fMax);   // 498 Hz vs 880 Hz
    expect(drag.cues[1].t).toBeLessThan(vac.cues[1].t);                                        // 40.9° peaks earlier than 45°
    expect(drag.peakX).toBeCloseTo(s.best.angle, 9);
  });

  it('orders pitch exactly as it orders range', () => {
    const s = P.rangeSweep(30, 9.8, true, 2, 5);
    const plan = P.curveSonifyPlan(angleCurve(s, 'range'), { refY: s.vacuumBest.range });
    for (let i = 1; i < plan.samples.length; i++) {
      expect(Math.sign(plan.samples[i].freq - plan.samples[i - 1].freq)).toBe(Math.sign(s.points[i].range - s.points[i - 1].range));
    }
  });

  it('chimes at the end of a rising speed curve but never on top of the start tick', () => {
    const ss = P.speedSweep(45, 9.8, false, 1, 0);
    const rising = P.curveSonifyPlan(ss.points.map(p => ({ x: p.vel, y: p.range })));
    expect(rising.cues.map(c => [c.kind, c.t])).toEqual([['start', 0], ['peak', 4]]);
    const falling = P.curveSonifyPlan([{ x: 0, y: 5 }, { x: 1, y: 3 }, { x: 2, y: 1 }]);
    expect(falling.cues.map(c => c.kind)).toEqual(['start']);
  });

  it('rejects curves it cannot play', () => {
    expect(P.curveSonifyPlan(null)).toBeNull();
    expect(P.curveSonifyPlan([{ x: 0, y: 1 }])).toBeNull();
    expect(P.curveSonifyPlan([{ x: 0, y: 1 }, { x: 0, y: 2 }])).toBeNull();          // x must increase
    expect(P.curveSonifyPlan([{ x: 1, y: 1 }, { x: 0, y: 2 }])).toBeNull();
    expect(P.curveSonifyPlan([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBeNull();          // nothing to scale against
    expect(P.curveSonifyPlan([{ x: 0, y: NaN }, { x: 1, y: 2 }, { x: 2, y: 1 }]).samples).toHaveLength(2);
  });

  it('plays the peak as the same bright triangle chime as a flight apex', () => {
    const audio = fakeAudio();
    const plan = P.curveSonifyPlan([{ x: 0, y: 1 }, { x: 1, y: 4 }, { x: 2, y: 1 }]);
    const handle = P.sonifyPlay(plan, audio.ac);
    expect(audio.log.osc.map(o => o.type)).toEqual(['sine', 'sine', 'triangle']);   // sweep, start tick, peak chime
    handle.stop();
  });
});

describe('Listen to the curve buttons', () => {
  let audio;
  afterEach(() => {
    // The playing sweep is module state; stop it so tests stay independent.
    const app = render({ rangeExplorer: { revealedFor: '25|9.8|vacuum||0' } });
    const b = listenButtons(app.draw()).find(n => n.props['data-playing'] === 'true');
    if (b) b.props.onClick();
  });
  const useAudio = () => { audio = fakeAudio(); window.StemLab.audioContext = () => audio.ac; };

  it('appear only after the reveal, in both modes, so they cannot give away the answer', () => {
    useAudio();
    const app = render();
    expect(attr(app.draw(), 'data-physics-range-listen')).toBeUndefined();
    attr(app.draw(), 'data-physics-range-skip').props.onClick();
    expect(listenButtons(app.draw()).map(b => b.props['data-physics-range-listen-curve'])).toEqual(['vacuum']);
    const speed = render({ rangeExplorer: { mode: 'speed' } });
    expect(attr(speed.draw(), 'data-physics-range-listen')).toBeUndefined();
    attr(speed.draw(), 'data-physics-range-speed-skip').props.onClick();
    expect(listenButtons(speed.draw()).map(b => b.props['data-physics-range-listen-curve'])).toEqual(['vacuum']);
  });

  it('offers both curves with drag on and states each farthest angle', () => {
    useAudio();
    const app = render({ airResist: true, velocity: 50 });
    attr(app.draw(), 'data-physics-range-skip').props.onClick();
    const tree = app.draw();
    expect(listenButtons(tree).map(b => b.props['data-physics-range-listen-curve'])).toEqual(['drag', 'vacuum']);
    const help = text(find(tree, n => n.props && n.props.id === 'physics-range-listen-help'));
    expect(help).toContain('in 4 seconds');
    expect(help).toContain('40.9° through air, 45.0° without drag');
    listenButtons(tree).forEach(b => expect(b.props['aria-describedby']).toBe('physics-range-listen-help'));
  });

  it('plays, announces the peak, shows Stop while playing, and stops on a second press', () => {
    useAudio();
    const app = render();
    attr(app.draw(), 'data-physics-range-skip').props.onClick();
    listenButtons(app.draw())[0].props.onClick();
    expect(audio.log.osc.length).toBe(3);
    expect(app.announceToSR).toHaveBeenLastCalledWith('Playing the curve from 5° to 85° in 4 seconds. The pitch is highest at 45.0°: 63.8 m.');
    let b = listenButtons(app.draw())[0];
    expect(b.props['data-playing']).toBe('true');
    expect(text(b)).toContain('Stop the sound');
    b.props.onClick();
    b = listenButtons(app.draw())[0];
    expect(b.props['data-playing']).toBe('false');
    expect(audio.log.osc[0].stop).toHaveBeenCalled();
  });

  it('switches straight to the other curve, and says so when sound is unavailable', () => {
    useAudio();
    const app = render({ airResist: true, velocity: 50 });
    attr(app.draw(), 'data-physics-range-skip').props.onClick();
    listenButtons(app.draw())[0].props.onClick();
    listenButtons(app.draw())[1].props.onClick();
    expect(listenButtons(app.draw()).map(b => b.props['data-playing'])).toEqual(['false', 'true']);
    listenButtons(app.draw())[1].props.onClick();
    window.StemLab.audioContext = () => null;
    listenButtons(app.draw())[0].props.onClick();
    expect(app.addToast).toHaveBeenCalledWith('⚠️ Sound is not available here.', 'warning');
    expect(listenButtons(app.draw()).every(b => b.props['data-playing'] === 'false')).toBe(true);
  });

  it('sweeps the speed curve along the axis that is drawn', () => {
    useAudio();
    const app = render({ rangeExplorer: { mode: 'speed', vSquared: true } });
    attr(app.draw(), 'data-physics-range-speed-skip').props.onClick();
    listenButtons(app.draw())[0].props.onClick();
    expect(app.announceToSR).toHaveBeenLastCalledWith(expect.stringContaining('from 5 m/s to 50 m/s in 4 seconds. The pitch is highest at 50 m/s'));
    // Against v², equal steps in time are equal steps in v²: 25 m/s sits at (625-25)/(2500-25) of the sweep.
    const freqCalls = audio.log.osc[0].frequency.exponentialRampToValueAtTime.mock.calls;
    expect(freqCalls[19][1] - 10.06).toBeCloseTo((625 - 25) / (2500 - 25) * 4, 6);
  });
});
