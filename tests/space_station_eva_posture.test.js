import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const reaction = new Function(source.slice(source.indexOf('  function issEvaReaction('), source.indexOf('  function issMomentumTrial(')) + '\nreturn issEvaReaction;')();
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act, Simulate } = require(resolve(modules, 'react-dom/test-utils'));

describe('space station changing-inertia EVA physics', () => {
  it.each([[32, 16], [16, 64], [64, 24]])('conserves angular momentum while changing inertia from %s to %s', (inertia, targetInertia) => {
    const settings = { inertia, targetInertia, braced: false };
    const before = reaction(settings, .75), after = reaction(settings, 1.25);
    expect(before.inertia).toBe(inertia);
    expect(after.inertia).toBe(targetInertia);
    expect(after.omega / before.omega).toBeCloseTo(inertia / targetInertia, 12);
    expect(after.energy / before.energy).toBeCloseTo(inertia / targetInertia, 12);
    expect(after.postureWork).toBeCloseTo(after.energy - before.energy, 12);
    expect(after.toolWork).toBe(before.toolWork);
    for (const time of [.75, .8, 1, 1.2, 1.25, 1.49]) {
      const state = reaction(settings, time);
      expect(state.angularMomentum).toBe(-9);
      expect(state.inertia * state.omega).toBeCloseTo(-9, 12);
      expect(state.netTorque).toBe(0);
    }
  });

  it.each([[64, 16], [16, 64], [32, 32], [32, 32 + 1e-10]])('obeys angle, torque and energy derivatives for inertia %s to %s', (inertia, targetInertia) => {
    const settings = { torque: 30, inertia, targetInertia, counterRatio: 2, braced: false };
    for (const time of [.2, .6, .9, 1.1, 1.3, 1.6, 1.9, 2.3]) {
      const dt = 1e-5;
      const a = reaction(settings, time - dt), b = reaction(settings, time), c = reaction(settings, time + dt);
      const inertiaRate = time > .75 && time < 1.25 ? (targetInertia - inertia) / .5 : 0;
      expect((c.angle - a.angle) / (2 * dt)).toBeCloseTo(b.omega, 8);
      expect((c.angularMomentum - a.angularMomentum) / (2 * dt)).toBeCloseTo(b.netTorque, 7);
      expect((c.energy - a.energy) / (2 * dt)).toBeCloseTo(b.netTorque * b.omega - .5 * b.omega ** 2 * inertiaRate, 7);
      expect(b.energy).toBeCloseTo(b.toolWork + b.postureWork, 11);
    }
  });

  it('keeps position, speed and momentum continuous at every pulse and posture boundary', () => {
    const settings = { torque: 30, inertia: 64, targetInertia: 16, counterRatio: 1.5, braced: false };
    for (const time of [.5, .75, 1.25, 1.5, 2]) {
      const exact = reaction(settings, time);
      for (const nearby of [time - 1e-9, time + 1e-9]) {
        const state = reaction(settings, nearby);
        for (const key of ['angle', 'omega', 'angularMomentum', 'inertia', 'energy']) expect(state[key]).toBeCloseTo(exact[key], 6);
      }
    }
  });

  it('cancels spin with equal opposite impulses after tucking, while accounting for removed energy', () => {
    const settings = { inertia: 32, targetInertia: 16, counterRatio: 1, braced: false };
    const changed = reaction(settings, 1.25), stopped = reaction(settings, 2), end = reaction(settings, 2.5);
    expect(changed.postureWork).toBeGreaterThan(0);
    expect(stopped.angularMomentum).toBe(0);
    expect(stopped.energy).toBe(0);
    expect(stopped.toolWork).toBeCloseTo(-stopped.postureWork, 12);
    expect(end.angle).toBeCloseTo(stopped.angle, 12);
    expect(end.angle).not.toBeCloseTo(reaction({ ...settings, targetInertia: 32 }, 2).angle, 3);
  });

  it('cannot create spin through posture alone when restrained and bounds malformed saved values', () => {
    for (const time of [0, .25, .75, 1, 1.25, 1.8, 2.5]) {
      const state = reaction({ inertia: 64, targetInertia: 16, counterRatio: 2 }, time);
      for (const key of ['angle', 'omega', 'angularMomentum', 'netTorque', 'energy', 'toolWork', 'postureWork']) expect(state[key]).toBe(0);
    }
    for (const value of [Infinity, NaN, 'broken', null]) {
      const state = reaction({ inertia: 40, targetInertia: value, braced: false }, 1);
      expect(state.inertia).toBe(40);
      expect(state.postureChanged).toBe(false);
    }
    expect(reaction({ targetInertia: -99 }, 2).inertia).toBe(16);
    expect(reaction({ targetInertia: 1000 }, 2).inertia).toBe(64);
  });
});

let frames, nextFrame, clock, cleanups;
function advance(seconds) {
  const count = Math.round(seconds * 100);
  for (let index = 0; index <= count; index++) {
    if (index) clock += 10;
    const callbacks = [...frames.values()];
    frames.clear();
    act(() => callbacks.forEach(callback => callback(clock)));
  }
}
function mountEva(eva = {}) {
  const cfg = window.StemLab._registry.spaceStation;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: { tab: 'missions', eva: { pos: 0, tetherA: 0, tetherB: 0, freeTether: 'B', o2: 100, bolts: 0, done: false, started: true, log: [], footRestraint: false, toolTorque: 18, bodyInertia: 32, counterRatio: 0, ...eva } } });
    return cfg.render({ React, toolData, setToolData, update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {}, aiHintsEnabled: false, gradeLevel: '7th Grade', t: (key, fallback) => fallback ?? key });
  }
  act(() => root.render(React.createElement(Harness)));
  cleanups.push(() => { act(() => root.unmount()); host.remove(); });
  return {
    host,
    action(name) { act(() => host.querySelector('[data-eva-pulse-action="' + name + '"]').click()); },
    preset(name) { act(() => host.querySelector('[data-eva-posture-preset="' + name + '"]').click()); },
    get time() { return Number(host.querySelector('#iss-eva-time').value); },
    reading(name) { return Number.parseFloat(host.querySelector('[data-eva-' + name + '] strong').textContent.replace('−', '-')); },
  };
}

describe('space station interactive EVA posture experiment', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation');
    frames = new Map(); nextFrame = 0; clock = 0; cleanups = [];
    vi.stubGlobal('requestAnimationFrame', callback => { const id = ++nextFrame; frames.set(id, callback); return id; });
    vi.stubGlobal('cancelAnimationFrame', id => frames.delete(id));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
  afterEach(() => { cleanups.forEach(cleanup => cleanup()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('changes the actual body drawing and the instruments while conserving momentum', () => {
    const view = mountEva();
    view.preset('tuck');
    view.action('posture-start');
    const limbs = view.host.querySelector('[data-eva-limbs]').getAttribute('d');
    const momentum = view.reading('angular-momentum');
    expect(view.reading('current-inertia')).toBe(32);
    view.action('posture-end');
    expect(view.time).toBe(1.25);
    expect(view.reading('current-inertia')).toBe(16);
    expect(view.reading('angular-momentum')).toBe(momentum);
    expect(view.reading('net-torque')).toBe(0);
    expect(view.reading('posture-work')).toBeGreaterThan(0);
    expect(view.host.querySelector('[data-eva-limbs]').getAttribute('d')).not.toBe(limbs);
    expect(view.host.querySelector('[data-eva-posture-comparison]').textContent).toContain('16.1°/s');
    expect(view.host.querySelector('[data-eva-posture-comparison]').textContent).toContain('32.2°/s');
    expect(view.host.querySelector('#iss-eva-inertia').value).toBe('32');
    view.action('posture-start');
    expect(view.host.querySelector('[data-eva-limbs]').getAttribute('d')).toBe(limbs);
    expect(view.reading('posture-work')).toBe(0);
  });

  it('plays through a changing live inertia and pauses only when a setup or inspection changes', () => {
    const view = mountEva();
    view.preset('tuck');
    const play = view.host.querySelector('[data-iss-playback-toggle="eva"]');
    act(() => play.click());
    advance(1.4);
    expect(play.getAttribute('aria-pressed')).toBe('true');
    expect(view.time).toBeGreaterThan(1.25);
    expect(view.reading('current-inertia')).toBe(16);
    act(() => Simulate.change(view.host.querySelector('#iss-eva-posture-inertia'), { target: { value: '24' } }));
    expect(view.time).toBe(0);
    expect(play.getAttribute('aria-pressed')).toBe('false');
    advance(.5);
    expect(view.time).toBe(0);
  });

  it('keeps the comparison independent of time and combines the changed posture with a stopping pulse', () => {
    const view = mountEva();
    view.preset('tuck');
    view.action('posture-end');
    const angle = view.host.querySelector('[data-eva-body-angle]').getAttribute('data-eva-body-angle');
    act(() => view.host.querySelector('[data-eva-posture-compare]').click());
    expect(view.host.querySelector('[data-eva-held-posture-path]')).toBeNull();
    expect(view.time).toBe(1.25);
    expect(view.host.querySelector('[data-eva-body-angle]').getAttribute('data-eva-body-angle')).toBe(angle);
    act(() => view.host.querySelector('[data-eva-counter-preset="stop"]').click());
    view.action('counter-end');
    expect(view.reading('current-inertia')).toBe(16);
    expect(view.reading('angular-rate')).toBe(0);
    expect(view.reading('rotational-energy')).toBe(0);
    view.preset('hold');
    expect(view.time).toBe(0);
    expect(view.host.querySelector('#iss-eva-posture-inertia').disabled).toBe(true);
    expect(view.host.querySelector('[data-eva-pulse-action="posture-end"]')).toBeNull();
  });

  it('inspects the nonlinear rate curve with a captured primary pointer and clamps the endpoints', () => {
    const view = mountEva();
    view.preset('tuck');
    const plot = view.host.querySelector('[data-eva-rate-plot]');
    const captured = new Set();
    plot.getBoundingClientRect = () => ({ left: 40, width: 343 });
    plot.setPointerCapture = id => captured.add(id);
    plot.hasPointerCapture = id => captured.has(id);
    plot.releasePointerCapture = id => captured.delete(id);
    const event = (time, pointerId = 1) => ({ clientX: 44 + time / 2.5 * 335, pointerId, isPrimary: true, button: 0 });
    act(() => Simulate.pointerDown(plot, { ...event(1), button: 2 }));
    expect(view.time).toBe(0);
    act(() => Simulate.pointerDown(plot, event(1)));
    expect(view.time).toBe(1);
    expect(view.reading('current-inertia')).toBe(24);
    expect(view.host.querySelector('[data-iss-eva-mechanics]').getAttribute('data-eva-phase')).toBe('posture');
    act(() => Simulate.pointerMove(plot, event(2, 2)));
    expect(view.time).toBe(1);
    act(() => Simulate.pointerMove(plot, event(8)));
    expect(view.time).toBe(2.5);
    act(() => Simulate.pointerCancel(plot, event(8)));
    act(() => Simulate.pointerMove(plot, event(0)));
    expect(view.time).toBe(2.5);
    act(() => Simulate.change(view.host.querySelector('#iss-eva-time'), { target: { value: '.75' } }));
    expect(view.time).toBe(.75);
  });
});
