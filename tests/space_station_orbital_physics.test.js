import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const physics = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  var _issRefOrbit =')) + '\nreturn { plan: issTransferPlan, state: issTransferState, telemetry: issTransferTelemetry, drag: issDragSnapshot, propagate: issDragPropagate, inspect: issDragInspect, mu: ISS_GM, earth: ISS_R_EARTH };')();
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

  it.each([[200, 2000], [2000, 200]])('measures velocity and inward gravity from the propagated orbit, %s to %s km', (from, to) => {
    const plan = physics.plan(from, to), df = 1e-5;
    for (const fraction of [.1, .5, .9]) {
      const state = physics.telemetry(plan, fraction, 1);
      const before = physics.state(plan, fraction - df), after = physics.state(plan, fraction + df);
      const dt = 2 * df * plan.coastSeconds;
      expect((after.altitude - before.altitude) / dt).toBeCloseTo(state.radialSpeed, 8);
      expect((after.vx - before.vx) / dt).toBeCloseTo(state.ax, 9);
      expect((after.vy - before.vy) / dt).toBeCloseTo(state.ay, 9);
      expect(Math.sign(state.radialSpeed)).toBe(Math.sign(to - from));
      expect(state.radialSpeed ** 2 + state.tangentialSpeed ** 2).toBeCloseTo(state.speed ** 2, 10);
      expect(state.x * state.ay - state.y * state.ax).toBeCloseTo(0, 10);
      expect(state.x * state.ax + state.y * state.ay).toBeLessThan(0);
      expect(state.gravity).toBeCloseTo(Math.hypot(state.ax, state.ay) * 1000, 10);
      expect(state.kineticEnergy + state.potentialEnergy).toBeCloseTo(-physics.mu / (2 * plan.a), 10);
    }
    expect(physics.telemetry(plan, 0, 1).radialSpeed).toBe(0);
    expect(physics.telemetry(plan, 1, 1).radialSpeed).toBe(0);
  });

  it.each([[420, 800], [800, 420]])('keeps position continuous and changes velocity and energy at both burns, %s to %s km', (from, to) => {
    const plan = physics.plan(from, to);
    const before = physics.telemetry(plan, .8, 0), injected = physics.telemetry(plan, 0, 1);
    const arriving = physics.telemetry(plan, 1, 1), circular = physics.telemetry(plan, .2, 2);
    expect([before.x, before.y]).toEqual([injected.x, injected.y]);
    expect([arriving.x, arriving.y]).toEqual([circular.x, circular.y]);
    expect((injected.speed - before.speed) * 1000).toBeCloseTo(plan.burn1, 9);
    expect((circular.speed - arriving.speed) * 1000).toBeCloseTo(plan.burn2, 9);
    expect(before.specificEnergy).toBeCloseTo(-physics.mu / (2 * plan.r1), 10);
    expect(circular.specificEnergy).toBeCloseTo(-physics.mu / (2 * plan.r2), 10);
    expect(Math.sign(injected.specificEnergy - before.specificEnergy)).toBe(Math.sign(to - from));
    expect(Math.sign(circular.specificEnergy - arriving.specificEnergy)).toBe(Math.sign(to - from));
    expect(before.elapsedSeconds).toBe(0);
    expect(circular.elapsedSeconds).toBe(plan.coastSeconds);
    expect(circular.radialSpeed).toBe(0);
    expect(circular.tangentialSpeed).toBeCloseTo(circular.speed, 10);
  });

  it('keeps the instruments finite for saved malformed inputs and a zero-length coast', () => {
    const plan = physics.plan('bad', Infinity);
    for (const phase of [0, 1, 2, NaN, Infinity]) {
      Object.values(physics.telemetry(plan, 'bad', phase)).forEach(value => expect(Number.isFinite(value)).toBe(true));
    }
    const zero = physics.plan(420, 420);
    for (const phase of [0, 1, 2]) {
      const state = physics.telemetry(zero, .8, phase);
      expect(state.elapsedSeconds).toBe(0);
      expect(state.altitude).toBeCloseTo(420, 10);
      expect(state.speed).toBeCloseTo(zero.startSpeed, 10);
      expect(state.radialSpeed).toBe(0);
    }
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

  it('reduces station mass by rocket-equation propellant and uses that mass in later drag', () => {
    const flight = physics.propagate(420, 1, 800, 10, { mass: 420000, gain: 12 });
    const before = physics.inspect(flight, 10, 'before'), after = physics.inspect(flight, 10, 'after');
    expect(after.altitude - before.altitude).toBeCloseTo(12, 10);
    expect(before.propellantKg).toBe(0);
    expect(before.boostApplied).toBe(false);
    expect(after.boostApplied).toBe(true);
    expect(after.mass + after.propellantKg).toBeCloseTo(420000, 9);
    expect(300 * 9.80665 * Math.log(before.mass / after.mass)).toBeCloseTo(flight.boostDeltaV, 9);
    expect(after.propellantKg).toBeCloseTo(flight.boostPropellantKg, 9);
    expect(after.drag.acceleration).toBeCloseTo(after.drag.forceN / after.mass, 12);
    expect(after.drag.dailyLossKm).toBeLessThan(before.drag.dailyLossKm);
    expect(physics.inspect(flight, 30).mass).toBe(after.mass);
  });

  it('uses more propellant for a larger raise and slows decay for a heavier station', () => {
    const small = physics.propagate(420, 1, 800, 10, { gain: 1 });
    const large = physics.propagate(420, 1, 800, 10, { gain: 20 });
    expect(large.boostDeltaV).toBeGreaterThan(small.boostDeltaV);
    expect(large.boostPropellantKg).toBeGreaterThan(small.boostPropellantKg);
    expect(large.endAltitude).toBeGreaterThan(small.endAltitude);
    const light = physics.propagate(420, 1, 800, 0, { mass: 200000 });
    const heavy = physics.propagate(420, 1, 800, 0, { mass: 600000 });
    expect(light.initial.forceN).toBeCloseTo(heavy.initial.forceN, 12);
    expect(light.initial.dailyLossKm).toBeCloseTo(heavy.initial.dailyLossKm * 3, 12);
    expect(light.endAltitude).toBeLessThan(heavy.endAltitude);
    expect(light.finalMass).toBe(200000);
    expect(heavy.boostPropellantKg).toBe(0);
  });

  it('never interpolates across the reboost jump or spends propellant before it', () => {
    const flight = physics.propagate(420, 1.8, 1400, 20, { gain: 8 });
    const justBefore = physics.inspect(flight, 20 - 1e-6), justAfter = physics.inspect(flight, 20 + 1e-6);
    const before = physics.inspect(flight, 20, 'before'), after = physics.inspect(flight, 20);
    expect(justBefore.altitude).toBeCloseTo(before.altitude, 5);
    expect(justAfter.altitude).toBeCloseTo(after.altitude, 5);
    expect(before.altitude + 8).toBeCloseTo(after.altitude, 10);
    expect(justBefore.propellantKg).toBe(0);
    expect(justAfter.propellantKg).toBeCloseTo(flight.boostPropellantKg, 9);
    expect(physics.inspect(flight, 20, 'before')).toEqual(before);
    expect(physics.inspect(flight, 12.3).altitude).toBeGreaterThan(before.altitude);
  });

  it('resolves the 180 km crossing inside its final integration step and refuses later comparisons', () => {
    const flight = physics.propagate(200, 1.8, 1600, 20, { mass: 200000 });
    expect(flight.stopped).toBe(true);
    expect(flight.endDay * 24).not.toBeCloseTo(Math.round(flight.endDay * 24), 6);
    expect(flight.samples.at(-2).altitude).toBeGreaterThan(180);
    expect(flight.samples.at(-1).altitude).toBe(180);
    expect(flight.samples.at(-1).day).toBe(flight.endDay);
    expect(flight.boostEvent).toBeNull();
    expect(flight.boostPropellantKg).toBe(0);
    const later = physics.inspect(flight, 30);
    expect(later.valid).toBe(false);
    expect(later.day).toBe(flight.endDay);
    expect(later.altitude).toBe(180);
    expect(later.propellantKg).toBe(0);
  });

  it('matches each stored hourly state and interpolates a coast without inventing mass changes', () => {
    const flight = physics.propagate(420, 1, 800, 10);
    for (const sample of flight.samples.filter(sample => sample.day !== 10)) {
      const state = physics.inspect(flight, sample.day);
      expect(state.altitude).toBeCloseTo(sample.altitude, 10);
      expect(state.mass).toBe(sample.mass);
    }
    const a = physics.inspect(flight, 3), b = physics.inspect(flight, 3 + 1 / 24);
    const midpoint = physics.inspect(flight, 3 + 1 / 48);
    expect(midpoint.altitude).toBeCloseTo((a.altitude + b.altitude) / 2, 10);
    expect(midpoint.mass).toBe(a.mass);
  });

  it('bounds restored drag settings and inspection times with finite outputs', () => {
    const flight = physics.propagate('bad', Infinity, 'bad', 'bad', { mass: Infinity, gain: -9 });
    expect(flight.initialMass).toBe(420000);
    expect(flight.gain).toBe(1);
    expect(flight.boostDeltaV).toBe(0);
    expect(physics.inspect(flight, NaN).day).toBe(0);
    expect(physics.inspect(flight, -4).day).toBe(0);
    expect(physics.inspect(flight, 90).day).toBe(30);
    const state = physics.inspect(flight, Infinity);
    for (const key of ['day', 'altitude', 'mass', 'propellantKg', 'deltaV']) expect(Number.isFinite(state[key])).toBe(true);
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

describe('space station interactive drag investigation', () => {
  beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_spacestation.js', 'spaceStation'); });

  it('inspects both sides of the same burn and restores the unspent fuel state when rewound', () => {
    const view = mountOrbit();
    const action = name => view.host.querySelector('[data-iss-drag-action="' + name + '"]');
    const reading = name => Number.parseFloat(view.host.querySelector('[data-iss-drag-reading="' + name + '"] strong').textContent);
    try {
      act(() => action('before').click());
      expect(view.host.querySelector('#iss-drag-day').value).toBe('20');
      expect(reading('fuel')).toBe(0);
      const beforeAltitude = reading('altitude'), beforeDecay = reading('decay');
      act(() => action('after').click());
      expect(view.host.querySelector('#iss-drag-day').value).toBe('20');
      expect(reading('altitude') - beforeAltitude).toBeCloseTo(5, 8);
      expect(reading('fuel')).toBeGreaterThan(0);
      expect(reading('decay')).toBeLessThan(beforeDecay);
      expect(view.host.querySelector('[data-iss-drag-phase]').getAttribute('data-iss-drag-phase')).toBe('after');
      act(() => action('reset').click());
      expect(reading('altitude')).toBe(420);
      expect(reading('fuel')).toBe(0);
    } finally { view.close(); }
  });

  it('keeps overlay changes independent of time and resets an obsolete trial after changing physical settings', () => {
    const view = mountOrbit();
    const slider = () => view.host.querySelector('#iss-drag-day');
    try {
      act(() => Simulate.change(slider(), { target: { value: '24' } }));
      const readings = view.host.querySelector('.iss-drag-readings').textContent;
      act(() => view.host.querySelector('[data-iss-drag-reference-toggle]').click());
      expect(view.host.querySelector('[data-iss-drag-reference]')).toBeNull();
      expect(slider().value).toBe('24');
      expect(view.host.querySelector('.iss-drag-readings').textContent).toBe(readings);
      for (const [id, value] of [['iss-drag-mass', '600000'], ['iss-drag-gain', '12'], ['iss-orbit-alt', '500']]) {
        act(() => view.host.querySelector('[data-iss-playback-toggle="drag"]').click());
        expect(view.host.querySelector('[data-iss-playback-toggle="drag"]').getAttribute('aria-pressed')).toBe('true');
        act(() => Simulate.change(view.host.querySelector('#' + id), { target: { value } }));
        expect(slider().value).toBe('0');
        expect(view.host.querySelector('[data-iss-playback-toggle="drag"]').getAttribute('aria-pressed')).toBe('false');
        expect(view.host.querySelector('[data-iss-drag-reading="fuel"] strong').textContent).toBe('0.0 kg');
      }
      act(() => view.host.querySelector('[data-iss-reboost-plan="0"]').click());
      expect(view.host.querySelector('#iss-drag-gain').disabled).toBe(true);
      expect(view.host.querySelector('[data-iss-drag-action="after"]').disabled).toBe(true);
    } finally { view.close(); }
  });

  it('captures one primary pointer, clamps inspection, and stops seeking on cancel', () => {
    const view = mountOrbit();
    const plot = view.host.querySelector('[data-iss-drag-plot]');
    const captured = new Set();
    plot.setPointerCapture = id => captured.add(id);
    plot.hasPointerCapture = id => captured.has(id);
    plot.releasePointerCapture = id => captured.delete(id);
    plot.getBoundingClientRect = () => ({ left: 40, width: 600 });
    const event = (clientX, pointerId = 7) => ({ clientX, pointerId, button: 0, isPrimary: true });
    const day = () => Number(view.host.querySelector('#iss-drag-day').value);
    try {
      act(() => Simulate.pointerDown(plot, { ...event(340), button: 2 }));
      act(() => Simulate.pointerDown(plot, { ...event(340), isPrimary: false }));
      expect(day()).toBe(0);
      act(() => Simulate.pointerDown(plot, event(340)));
      expect(day()).toBe(15);
      act(() => Simulate.pointerMove(plot, event(1000, 8)));
      expect(day()).toBe(15);
      act(() => Simulate.pointerMove(plot, event(1000)));
      expect(day()).toBe(30);
      act(() => Simulate.pointerCancel(plot, event(1000)));
      act(() => Simulate.pointerMove(plot, event(46)));
      expect(day()).toBe(30);
      act(() => Simulate.change(view.host.querySelector('#iss-drag-day'), { target: { value: '15' } }));
      expect(day()).toBe(15);
      expect(view.host.querySelector('[data-iss-drag-reading="fuel"] strong').textContent).toBe('0.0 kg');
    } finally { view.close(); }
  });

  it('ends the control range at the validity boundary and disables a burn it never reaches', () => {
    const view = mountOrbit({ orbitAlt: 200, orbitSolar: 'high', orbitFrontalArea: 1600, orbitDragMass: 200000 });
    try {
      expect(Number(view.host.querySelector('#iss-drag-day').max)).toBeLessThan(20);
      expect(view.host.querySelector('[data-iss-drag-action="before"]').disabled).toBe(true);
      expect(view.host.querySelector('[data-iss-drag-action="after"]').disabled).toBe(true);
      expect(view.host.querySelector('[data-iss-drag-burn-budget]').textContent).toContain('before this reboost');
      act(() => view.host.querySelector('[data-iss-drag-action="end"]').click());
      expect(view.host.querySelector('[data-iss-drag-reading="altitude"] strong').textContent).toBe('180.00 km');
      expect(view.host.querySelector('[data-iss-drag-reading="fuel"] strong').textContent).toBe('0.0 kg');
      expect(view.host.querySelector('[data-iss-playback-toggle="drag"]').disabled).toBe(true);
      expect(view.host.querySelector('.iss-drag-inspector').textContent).toContain('Model limit reached');
    } finally { view.close(); }
  });

  it('stops the comparison independently when the unboosted orbit reaches the model boundary first', () => {
    const view = mountOrbit({ orbitAlt: 300, orbitSolar: 'high', orbitFrontalArea: 1600, orbitDragMass: 200000, orbitReboostDay: 10, orbitReboostGain: 20 });
    try {
      expect(view.host.querySelector('[data-iss-drag-action="after"]').disabled).toBe(false);
      act(() => view.host.querySelector('[data-iss-drag-action="end"]').click());
      const comparison = view.host.querySelector('[data-iss-drag-comparison]');
      expect(comparison.getAttribute('data-iss-drag-comparison')).toBe('ended');
      expect(comparison.textContent).toContain('comparison stops there');
      expect(comparison.textContent).not.toContain('km above');
    } finally { view.close(); }
  });
});

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
      expect(view.host.querySelector('[data-iss-transfer-profile]')).toBeNull();
      expect(view.host.querySelector('[data-iss-transfer-vector]')).toBeNull();
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

  it('uses the actual burn phase for its readings and velocity arrow, and leaves the clock alone when toggling overlays', () => {
    const view = mountOrbit();
    const action = name => view.host.querySelector('[data-iss-transfer-action="' + name + '"]');
    const speed = () => Number.parseFloat(view.host.querySelector('[data-iss-transfer-reading="speed"] strong').textContent);
    const arrowLength = () => {
      const arrow = view.host.querySelector('[data-iss-transfer-vector="velocity"]');
      return Math.hypot(Number(arrow.getAttribute('x2')) - Number(arrow.getAttribute('x1')), Number(arrow.getAttribute('y2')) - Number(arrow.getAttribute('y1')));
    };
    const plan = physics.plan(420, 800);
    try {
      expect(speed()).toBeCloseTo(plan.startSpeed, 3);
      expect(arrowLength() / 6).toBeCloseTo(plan.startSpeed, 9);
      act(() => action('inject').click());
      expect(speed()).toBeCloseTo(plan.departureSpeed, 3);
      expect(arrowLength() / 6).toBeCloseTo(plan.departureSpeed, 9);
      act(() => Simulate.change(view.host.querySelector('#iss-transfer-time'), { target: { value: '500' } }));
      const text = view.host.querySelector('.iss-flight-telemetry').textContent;
      for (const overlay of ['vectors', 'marks']) {
        const button = view.host.querySelector('[data-iss-transfer-overlay="' + overlay + '"]');
        act(() => button.click());
        expect(button.getAttribute('aria-pressed')).toBe('false');
      }
      expect(view.host.querySelector('[data-iss-transfer-vectors]')).toBeNull();
      expect(view.host.querySelector('[data-iss-transfer-time-marks]')).toBeNull();
      expect(view.host.querySelector('#iss-transfer-time').value).toBe('500');
      expect(view.host.querySelector('.iss-flight-telemetry').textContent).toBe(text);
      act(() => action('arrive').click());
      expect(speed()).toBeCloseTo(plan.arrivalSpeed, 3);
      act(() => action('circularize').click());
      expect(speed()).toBeCloseTo(plan.targetSpeed, 3);
      expect(view.host.querySelector('[data-iss-transfer-reading="radial"]').textContent).toContain('+0.0 m/s');
    } finally { view.close(); }
  });

  it('seeks by elapsed time with the captured pointer only, and locks the profile before injection and after circularization', () => {
    const view = mountOrbit();
    const plot = () => view.host.querySelector('[data-iss-transfer-profile="altitude"]');
    const time = () => view.host.querySelector('#iss-transfer-time').value;
    const action = name => view.host.querySelector('[data-iss-transfer-action="' + name + '"]');
    const event = (clientX, pointerId = 7) => ({ clientX, pointerId, button: 0, isPrimary: true });
    try {
      plot().getBoundingClientRect = () => ({ left: 40, width: 600 });
      act(() => Simulate.pointerDown(plot(), event(340)));
      expect(time()).toBe('0');
      act(() => action('inject').click());
      act(() => Simulate.pointerDown(plot(), { ...event(340), button: 2 }));
      expect(time()).toBe('0');
      act(() => Simulate.pointerDown(plot(), event(340)));
      expect(time()).toBe('500');
      const midflight = physics.state(physics.plan(420, 800), .5);
      expect(view.host.querySelector('[data-iss-transfer-reading="altitude"]').textContent).toContain(midflight.altitude.toFixed(1));
      act(() => Simulate.pointerMove(plot(), event(1000, 8)));
      expect(time()).toBe('500');
      act(() => Simulate.pointerMove(plot(), event(1000)));
      expect(time()).toBe('1000');
      act(() => Simulate.pointerCancel(plot(), event(1000)));
      act(() => Simulate.pointerMove(plot(), event(48)));
      expect(time()).toBe('1000');
      act(() => action('circularize').click());
      act(() => Simulate.pointerDown(plot(), event(48)));
      expect(time()).toBe('1000');
      expect(view.host.querySelector('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage')).toBe('2');
    } finally { view.close(); }
  });
});
