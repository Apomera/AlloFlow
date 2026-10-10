import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const physics = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  var _issRefOrbit =')) + '\nreturn { plan: issTransferPlan, state: issTransferState, drag: issDragSnapshot, propagate: issDragPropagate, mu: ISS_GM, earth: ISS_R_EARTH };')();
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act, Simulate } = require(resolve(modules, 'react-dom/test-utils'));

describe('space station physical orbital propagation', () => {
  it('requires two positive burns to raise and two negative burns to lower an orbit', () => {
    const raise = physics.plan(420, 800), lower = physics.plan(800, 420);
    expect(raise.burn1).toBeGreaterThan(0);
    expect(raise.burn2).toBeGreaterThan(0);
    expect(lower.burn1).toBeCloseTo(-raise.burn2, 10);
    expect(lower.burn2).toBeCloseTo(-raise.burn1, 10);
    expect(lower.coastSeconds).toBeCloseTo(raise.coastSeconds, 10);
    expect(raise.targetSpeed).toBeLessThan(raise.startSpeed);
    expect(raise.coastSeconds / 60).toBeGreaterThan(45);
    expect(raise.coastSeconds / 60).toBeLessThan(50);
  });

  it.each([[200, 2000], [2000, 200], [420, 440]])('reaches both apsides and preserves mechanical invariants from %s to %s km', (from, to) => {
    const plan = physics.plan(from, to);
    const first = physics.state(plan, 0), last = physics.state(plan, 1);
    expect(first.altitude).toBeCloseTo(from, 9);
    expect(last.altitude).toBeCloseTo(to, 9);
    expect(first.speed).toBeCloseTo(plan.departureSpeed, 10);
    expect(last.speed).toBeCloseTo(plan.arrivalSpeed, 10);
    for (const fraction of [0, .1, .25, .5, .75, .9, 1]) {
      const state = physics.state(plan, fraction);
      const radius = Math.hypot(state.x, state.y);
      const energy = (state.vx ** 2 + state.vy ** 2) / 2 - physics.mu / radius;
      const momentum = state.x * state.vy - state.y * state.vx;
      expect(radius).toBeCloseTo(state.radius, 9);
      expect(energy).toBeCloseTo(-physics.mu / (2 * plan.a), 10);
      expect(momentum).toBeCloseTo(first.x * first.vy, 8);
    }
  });

  it('propagates by elapsed time rather than rotating at constant angular speed', () => {
    const plan = physics.plan(200, 2000), fraction = .4, step = 1e-5;
    const before = physics.state(plan, fraction - step), now = physics.state(plan, fraction), after = physics.state(plan, fraction + step);
    expect((after.x - before.x) / (2 * step * plan.coastSeconds)).toBeCloseTo(now.vx, 7);
    expect((after.y - before.y) / (2 * step * plan.coastSeconds)).toBeCloseTo(now.vy, 7);
    const half = physics.state(plan, .5);
    expect(half.radius).toBeGreaterThan(plan.a);
  });

  it('handles a zero-distance transfer and malformed saved values with finite results', () => {
    const zero = physics.plan(420, 420);
    expect(zero.deltaV).toBe(0);
    expect(zero.coastSeconds).toBe(0);
    const plan = physics.plan(Infinity, 'corrupt');
    expect(plan.startAltitude).toBe(420);
    expect(plan.targetAltitude).toBe(800);
    Object.values(physics.state(plan, NaN)).forEach(value => expect(Number.isFinite(value)).toBe(true));
    expect(physics.state(plan, -20).elapsedSeconds).toBe(0);
    expect(physics.state(plan, 20).elapsedSeconds).toBe(plan.coastSeconds);
  });

  it('scales drag with exposed area, density and inverse mass in physical units', () => {
    const base = physics.drag(420, 1, 800);
    expect(base.dailyLossKm).toBeCloseTo(.075, 12);
    expect(physics.drag(420, 1, 1600).forceN).toBeCloseTo(base.forceN * 2, 12);
    expect(physics.drag(420, 1.8, 800).dailyLossKm).toBeCloseTo(base.dailyLossKm * 1.8, 12);
    expect(physics.drag(420, 1, 800, 840000).acceleration).toBeCloseTo(base.acceleration / 2, 12);
    expect(physics.drag(300, 1, 800).density / base.density).toBeCloseTo(Math.exp(2), 10);
    expect(base.forceN).toBeGreaterThan(0);
    expect(base.forceN).toBeLessThan(1);
  });

  it('integrates faster decay in active air and represents a reboost as a discontinuity on its exact day', () => {
    const quiet = physics.propagate(420, .6, 800, 0);
    const active = physics.propagate(420, 1.8, 800, 0);
    const boost = physics.propagate(420, 1.8, 800, 10);
    expect(active.endAltitude).toBeLessThan(quiet.endAltitude);
    expect(boost.endAltitude).toBeGreaterThan(active.endAltitude);
    expect(boost.boostDeltaV).toBeGreaterThan(0);
    const atBurn = boost.samples.filter(sample => sample.day === 10);
    expect(atBurn.at(-1).altitude - atBurn[0].altitude).toBeCloseTo(5, 10);
    expect(boost.endDay).toBe(30);
  });

  it('ends the model at its validity boundary instead of inventing a reentry or a flat altitude', () => {
    const flight = physics.propagate(200, 1.8, 1600, 20);
    expect(flight.stopped).toBe(true);
    expect(flight.endAltitude).toBe(180);
    expect(flight.endDay).toBeLessThan(20);
    expect(flight.samples.at(-1).day).toBe(flight.endDay);
    expect(flight.boostDeltaV).toBe(0);
  });

  it('keeps a physical burn budget when a reboost raises the highest selectable orbit', () => {
    const flight = physics.propagate(2000, 1, 800, 10);
    expect(flight.endAltitude).toBeGreaterThan(2004.99);
    expect(flight.boostDeltaV).toBeGreaterThan(2);
    expect(flight.boostDeltaV).toBeLessThan(3);
  });
});

function mountOrbit(seed = {}) {
  const cfg = window.StemLab._registry.spaceStation;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: { tab: 'orbit', orbitAlt: 420, orbitPredictRef: 420, ...seed } });
    return cfg.render({ React, toolData, setToolData, update() {}, updateMulti() {}, addToast() {}, announceToSR() {}, awardXP() {}, setStemLabTool() {}, aiHintsEnabled: false, gradeLevel: '7th Grade', t: (key, fallback) => fallback ?? key });
  }
  act(() => root.render(React.createElement(Harness)));
  return { host, close() { act(() => root.unmount()); host.remove(); } };
}

describe('space station transfer flight controls', () => {
  beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation'); });

  it('requires injection, coast and a separate circularization burn', () => {
    const view = mountOrbit();
    const action = name => view.host.querySelector('[data-iss-transfer-action="' + name + '"]');
    try {
      expect(action('circularize').disabled).toBe(true);
      act(() => action('inject').click());
      expect(view.host.querySelector('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage')).toBe('1');
      act(() => action('coast').click());
      expect(view.host.textContent).toContain('5.0 min');
      expect(action('circularize').disabled).toBe(true);
      act(() => action('arrive').click());
      expect(action('circularize').disabled).toBe(false);
      expect(view.host.textContent).toContain('Arrival burn ready');
      act(() => action('circularize').click());
      expect(view.host.textContent).toContain('Target orbit circularized');
      expect(view.host.querySelector('#iss-transfer-time').disabled).toBe(true);
    } finally { view.close(); }
  });

  it('resets an obsolete departure and keeps flight answers behind the prediction gate', () => {
    const view = mountOrbit({ orbitAlt: 250, orbitTransferStage: 2, orbitTransferOrigin: 420, orbitTransferProgress: 1 });
    try {
      expect(view.host.querySelector('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage')).toBe('0');
      expect(view.host.querySelector('[data-iss-transfer-action="inject"]')).toBeNull();
      expect(view.host.textContent).toContain('unlock the flight deck');
      expect(view.host.textContent).not.toContain('7.76 km/s');
      expect(view.host.querySelector('.iss-orbit-visual .iss-visual-caption').textContent).toContain('PERIOD HIDDEN');
    } finally { view.close(); }
  });

  it('discards a completed transfer after changing departure altitude away and back', () => {
    const view = mountOrbit({ orbitTransferStage: 2, orbitTransferOrigin: 420, orbitTransferProgress: 1 });
    const stage = () => view.host.querySelector('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage');
    try {
      expect(stage()).toBe('2');
      expect(view.host.textContent).toContain('Target orbit circularized');
      act(() => Simulate.change(view.host.querySelector('#iss-orbit-alt'), { target: { value: '500' } }));
      expect(stage()).toBe('0');
      act(() => Simulate.change(view.host.querySelector('#iss-orbit-alt'), { target: { value: '420' } }));
      expect(stage()).toBe('0');
      expect(view.host.textContent).not.toContain('Target orbit circularized');
      expect(view.host.querySelector('[data-iss-transfer-action="circularize"]').disabled).toBe(true);
      expect(view.host.querySelector('[data-iss-transfer-action="inject"]').disabled).toBe(false);
    } finally { view.close(); }
  });

  it('has unique input IDs and exposes physical drag readouts alongside working existing controls', () => {
    const view = mountOrbit();
    try {
      const ids = [...view.host.querySelectorAll('[id]')].map(node => node.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(view.host.querySelector('#iss-drag-frontal-area')).not.toBeNull();
      expect(view.host.textContent).toContain('Ballistic coefficient');
      act(() => view.host.querySelector('[data-iss-solar-mode="high"]').click());
      expect(view.host.querySelector('[data-iss-drag-model]').getAttribute('data-iss-drag-model')).toBe('high');
    } finally { view.close(); }
  });
});
