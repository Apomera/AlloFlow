import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
const state = extra => ({ alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0, ...extra });
const row = (t, extra = {}) => ({ t, alt: 300 - t * 10, v: -9 - t, h: 4, fuel: 110, throttle: 0, tilt: 0, x: 4 * t, ...extra });
const rec = rows => ({ version: 1, samples: rows });
const value = (host, key) => host.querySelector('[data-descent-energy-value="' + key + '"]').textContent;
function view(s = state(), r = rec([row(0)]), context = {}) {
  const host = document.createElement('div'); host.innerHTML = ReactDOMServer.renderToStaticMarkup(P.descentEnergyView(React.createElement));
  host.querySelector('[data-descent-energy]').open = true; P.updateDescentEnergy(host, s, r, context); return host;
}
function frozen(value) {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozen);
}

describe('specific mechanical energy in lunar descent', () => {
  it('requires a valid measured state and measured time and position', () => {
    for (const s of [null, {}, state({ elapsed: undefined }), state({ x: NaN }), state({ alt: -1 }), state({ fuel: -1 }),
      state({ vVel: Infinity }), state({ hVel: '4' }), state({ tilt: .6 }), state({ contact: true })]) expect(P.descentEnergy(s)).toBeNull();
  });
  it('uses the existing inverse-square gravity potential with zero at the surface', () => {
    const m = P.descentEnergy(state());
    expect(m.current.potential).toBeCloseTo(1.624 * 1737500 * 300 / (1737500 + 300), 10);
    expect(P.descentEnergy(state({ alt: 0 })).current.potential).toBe(0);
  });
  it('the derivative of height energy equals the local gravity over the model range', () => {
    for (const alt of [1, 300, 5000, 99999]) {
      const d = .01, a = P.descentEnergy(state({ alt: alt + d })).current.potential,
        b = P.descentEnergy(state({ alt: alt - d })).current.potential;
      expect((a - b) / (2 * d)).toBeCloseTo(1.624 * (1737500 / (1737500 + alt)) ** 2, 7);
    }
  });
  it('separates vertical and lateral kinetic energy and adds their common units', () => {
    const e = P.descentEnergy(state()).current;
    expect(e.verticalKinetic).toBe(40.5); expect(e.lateralKinetic).toBe(8);
    expect(e.total).toBe(e.potential + 48.5);
  });
  it('kinetic energies preserve magnitudes when measured directions reverse', () => {
    expect(P.descentEnergy(state({ vVel: 9, hVel: -4 })).current).toEqual(P.descentEnergy(state()).current);
  });
  it('normalizes mechanical energy per kilogram rather than mixing changing vehicle mass into its total', () => {
    expect(P.descentEnergy(state({ fuel: 1 })).current).toEqual(P.descentEnergy(state({ fuel: 4000 })).current);
  });
  it('uses actual engine output and current propellant mass for force dotted with velocity', () => {
    const s = state({ thrust: .7, tilt: -.2 }), m = P.descentEnergy(s), g = P.descentGuidance(s), a = g.thrustN / g.massKg;
    expect(m.power.vertical).toBeCloseTo(a * Math.cos(s.tilt) * s.vVel, 12);
    expect(m.power.lateral).toBeCloseTo(a * Math.sin(s.tilt) * s.hVel, 12);
    expect(m.power.total).toBe(m.power.vertical + m.power.lateral);
  });
  it('upright thrust removes mechanical energy while descending and adds it while rising', () => {
    expect(P.descentEnergy(state({ thrust: 1 })).power.total).toBeLessThan(0);
    expect(P.descentEnergy(state({ thrust: 1, vVel: 9 })).power.total).toBeGreaterThan(0);
  });
  it('sideways engine power follows the relative signs of measured tilt and drift', () => {
    expect(P.descentEnergy(state({ thrust: 1, tilt: .3, vVel: 0 })).power.total).toBeGreaterThan(0);
    expect(P.descentEnergy(state({ thrust: 1, tilt: -.3, vVel: 0 })).power.total).toBeLessThan(0);
  });
  it('zero velocity gives zero instantaneous power even with a firing engine', () => {
    expect(P.descentEnergy(state({ thrust: 1, vVel: 0, hVel: 0 })).power.total).toBe(0);
  });
  it('exhausted fuel gives zero power despite stale nonzero throttle', () => {
    const m = P.descentEnergy(state({ fuel: 0, thrust: 1 })); expect(m.power.total).toBe(0); expect(m.power.actualThrottle).toBe(0);
  });
  it('contact retains impact motion energy and omits airborne engine power', () => {
    const m = P.descentEnergy(state({ alt: 0, vVel: -12, hVel: -5, contact: true, thrust: 1 }));
    expect(m.current.total).toBe(84.5); expect(m.power).toBeNull(); expect(m.contact).toBe(true);
  });
  it('free fall conserves specific mechanical energy through the original contact solver', () => {
    const s = state(), initial = P.descentEnergy(s).current.total; let error = 0;
    for (let i = 0; i < 2000 && !s.contact; i++) {
      P.descentStep(s, {}, 1 / 60); error = Math.max(error, Math.abs(P.descentEnergy(s).current.total - initial));
    }
    expect(s.contact).toBe(true); expect(error).toBeLessThan(.0001); expect(s.hVel).toBe(4);
  });
  it('the original changing-mass integrator matches instantaneous engine mechanical power', () => {
    for (const s of [state({ thrust: .65, tilt: -.2 }), state({ thrust: 1, tilt: .35, vVel: 8, hVel: -4 }), state({ thrust: 0 })]) {
      const before = P.descentEnergy(s), next = { ...s }, dt = 1e-7;
      P.descentStep(next, { throttle: s.thrust }, dt);
      expect(Math.abs((P.descentEnergy(next).current.total - before.current.total) / dt - before.power.total)).toBeLessThan(.001);
    }
  });
  it('freezes detached energy, power, history and geometry without mutating state or recording', () => {
    const s = state({ elapsed: 2 }), r = rec([row(0), row(1), row(2)]), before = JSON.stringify([s, r]);
    const m = P.descentEnergy(s, r); frozen(m); frozen(P.descentEnergyGeometry(m)); expect(JSON.stringify([s, r])).toBe(before);
  });
  it('future altitude and speeds cannot enter curves, scale bounds or current readings', () => {
    const s = state({ elapsed: 1 }), r = rec([row(0), row(1), row(2)]), first = P.descentEnergy(s, r);
    r.samples[2].alt = 90000; r.samples[2].v = -4000; r.samples[2].h = 4000;
    expect(P.descentEnergy(s, r)).toEqual(first); expect(P.descentEnergyGeometry(P.descentEnergy(s, r))).toEqual(P.descentEnergyGeometry(first));
  });
  it('keeps current energy available when recording is missing and omits the history', () => {
    const m = P.descentEnergy(state(), null); expect(m.current.total).toBeGreaterThan(0); expect(m.history).toBeNull();
    expect(P.descentEnergyGeometry(m).curves).toBeNull();
  });
  it('uses a measured intervening endpoint and changes from the first shown sample', () => {
    const m = P.descentEnergy(state({ elapsed: 1.5 }), rec([row(0), row(1), row(2)]));
    expect(m.history.samples.map(p => p.time)).toEqual([0, 1, 1.5]);
    expect(m.history.delta).toBe(m.current.total - m.history.samples[0].total);
  });
  it('maps irregular sample times and every curve into the same physical axes', () => {
    const m = P.descentEnergy(state({ elapsed: 4 }), rec([row(0), row(.7), row(4)])), g = P.descentEnergyGeometry(m);
    for (const curve of Object.values(g.curves)) {
      expect(curve.points.map(p => p.x)).toEqual([20, 90, 420]);
      expect(curve.points.every(p => p.y >= 20 && p.y <= 200)).toBe(true);
      expect(curve.dot).toContain('M420 ');
    }
  });
  it('bounds high-energy valid states and gives zero energy an honest finite scale', () => {
    const high = P.descentEnergy(state({ alt: 100000, vVel: 5000, hVel: -5000 })), g = P.descentEnergyGeometry(high);
    expect(g.range).toBeGreaterThan(high.current.total); expect(g.unit).toBe('MJ/kg');
    const zero = P.descentEnergy(state({ alt: 0, vVel: 0, hVel: 0 })), z = P.descentEnergyGeometry(zero);
    expect(z.range).toBe(10); expect(Object.values(z.bars).every(b => b.x === 20)).toBe(true);
  });
  it('rejects malformed or inconsistent energy geometry', () => {
    for (const m of [null, {}, { current: { potential: 0, verticalKinetic: 0, lateralKinetic: 0, total: NaN } },
      { current: { potential: 1, verticalKinetic: 2, lateralKinetic: 3, total: 8 } }]) expect(P.descentEnergyGeometry(m)).toBeNull();
  });
  it('does no measurement or presentation work while its native disclosure is closed', () => {
    const host = document.createElement('div'); host.innerHTML = ReactDOMServer.renderToStaticMarkup(P.descentEnergyView(React.createElement));
    const before = host.innerHTML;
    P.updateDescentEnergy(host, new Proxy({}, { get() { throw Error('Closed energy view read state'); } }), null);
    expect(host.innerHTML).toBe(before);
  });
  it('initial measurements display current components while their history waits', () => {
    const host = view(); expect(host.querySelector('[data-descent-energy-content]').hidden).toBe(false);
    expect(host.querySelector('[data-descent-energy-history]').hidden).toBe(true);
    expect(value(host, 'total')).toMatch(/J\/kg/); expect(value(host, 'power')).toBe('0.00 W/kg');
  });
  it('preserves contact and clears stale history when rewinding to the first measured state', () => {
    const host = view(state({ alt: 0, elapsed: 2 }), rec([row(0), row(2, { alt: 0 })]), { recorded: true });
    expect(value(host, 'power')).toBe('Not modelled at contact');
    P.updateDescentEnergy(host, state(), rec([row(0), row(2, { alt: 0 })]), { recorded: true });
    expect(host.querySelector('[data-descent-energy-history]').hidden).toBe(true);
    expect(host.querySelector('[data-descent-energy-line="total"]').getAttribute('points')).toBe('');
    expect(host.querySelector('[data-descent-energy-chart]').hasAttribute('data-time-last')).toBe(false);
  });
  it('missing legacy state clears previous values, curves, bars and bounds', () => {
    const host = view(state({ elapsed: 2 }), rec([row(0), row(2)])); P.updateDescentEnergy(host, null, null);
    expect(host.querySelector('[data-descent-energy-content]').hidden).toBe(true); expect(value(host, 'total')).toBe('—');
    expect(host.querySelector('[data-descent-energy-bar="potential"]').getAttribute('x2')).toBe('20');
    expect(host.querySelector('[data-descent-energy-chart]').hasAttribute('data-energy-range')).toBe(false);
    expect(host.querySelector('[data-descent-energy-source-label]').textContent).toBe('No measured flight state is available.');
  });
  it('native source markers are unique and the summary has a 44 px target', () => {
    const host = view(); expect(host.querySelectorAll('[data-descent-energy]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-descent-energy-source-label]')).toHaveLength(1);
    expect(host.querySelector('summary').style.minHeight).toBe('44px');
  });
});
