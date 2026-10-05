import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
const state = extra => ({ alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 12, elapsed: 8, ...extra });
const sample = extra => P.descentVectorSample(state(extra));
const geometry = extra => P.descentVectorGeometry(state(extra));
function frozenTree(value) {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozenTree);
}
function view(raw = state(), context = {}) {
  const host = document.createElement('div');
  host.innerHTML = ReactDOMServer.renderToStaticMarkup(P.descentVectorsView(React.createElement));
  host.querySelector('[data-descent-vectors]').open = true;
  P.updateDescentVectors(host, raw, context); return host;
}

describe('measured descent vectors', () => {
  it('requires finite measured values and rejects incomplete or malformed states', () => {
    const bad = [null, undefined, {}, state({ alt: -1 }), state({ fuel: NaN }), state({ thrust: '1' }),
      state({ tilt: Infinity }), state({ vVel: undefined }), state({ elapsed: '8' }), state({ contact: true })];
    for (const raw of bad) { expect(P.descentVectorSample(raw)).toBeNull(); expect(P.descentVectorGeometry(raw)).toBeNull(); }
  });

  it('freezes detached measurements and leaves the physical source untouched', () => {
    const s = state({ thrust: .6, tilt: -.2 }), before = JSON.stringify(s);
    frozenTree(P.descentVectorSample(s)); frozenTree(P.descentVectorGeometry(s)); expect(JSON.stringify(s)).toBe(before);
  });

  it('uses actual engine force divided by remaining vehicle mass', () => {
    const s = sample({ thrust: .7 }), D = P.descent;
    const mass = D.dryMass * Math.exp(D.g * 110 / (D.isp * D.earthG));
    expect(s.forces.massKg).toBeCloseTo(mass, 10); expect(s.forces.thrustN).toBe(D.maxThrust * .7);
    expect(s.forces.engine.x).toBe(0); expect(s.forces.engine.y).toBeCloseTo(D.maxThrust * .7 / mass, 12);
  });

  it('shows no sideways acceleration or drag when coasting', () => {
    const s = state({ hVel: -6, tilt: .35 }), measured = P.descentVectorSample(s);
    expect(measured.forces.engine).toEqual({ x: 0, y: 0 }); expect(measured.forces.net.x).toBe(0);
    expect(measured.forces.net.y).toBe(measured.forces.gravity.y);
    P.descentStep(s, { right: true }, 4); expect(s.hVel).toBe(-6);
  });

  it.each([-.35, 0, .35])('resolves the measured thrust vector consistently at tilt %s radians', tilt => {
    const s = sample({ thrust: 1, tilt }), a = s.forces.thrustN / s.forces.massKg;
    expect(s.forces.engine.x).toBeCloseTo(a * Math.sin(tilt), 12);
    expect(s.forces.engine.y).toBeCloseTo(a * Math.cos(tilt), 12);
    expect(Math.hypot(s.forces.engine.x, s.forces.engine.y)).toBeCloseTo(a, 12);
    expect(s.forces.net.x).toBe(s.forces.engine.x); expect(s.forces.net.y).toBeCloseTo(s.forces.engine.y + s.forces.gravity.y, 12);
  });

  it('does not treat a requested throttle or tilt command as measured output', () => {
    const s = state({ targetThrottle: 1, left: true, right: true });
    expect(P.descentVectorSample(s)).toEqual(sample()); expect(P.descentVectorSample(s).actualThrottle).toBe(0);
  });

  it('omits engine acceleration when fuel is exhausted even if a stale throttle remains', () => {
    const s = sample({ fuel: 0, thrust: 1, tilt: -.35 });
    expect(s.actualThrottle).toBe(0); expect(s.forces.thrustN).toBe(0); expect(s.forces.engine.x).toBe(-0);
    expect(s.forces.engine.y).toBe(0); expect(geometry({ fuel: 0, thrust: 1 }).forces.arrows.engine.visible).toBe(false);
  });

  it('agrees with independent finite differences of the existing flight integrator', () => {
    const s = state({ alt: 123, fuel: 80, thrust: .65, tilt: -.2, vVel: -12, hVel: -6 }), before = { ...s }, f = P.descentVectorSample(s).forces;
    const dt = 1e-6; P.descentStep(s, { throttle: .65, left: true }, dt);
    expect((s.hVel - before.hVel) / dt).toBeCloseTo(f.net.x, 3);
    expect((s.vVel - before.vVel) / dt).toBeCloseTo(f.net.y, 3);
  });

  it('shows vertical balance at hover without implying lateral drift has stopped', () => {
    for (const tilt of [0, .2]) {
      const s = state({ tilt, hVel: 4 }), D = P.descent;
      const mass = D.dryMass * Math.exp(D.g * s.fuel / (D.isp * D.earthG)), g = D.g * Math.pow(D.radius / (D.radius + s.alt), 2);
      s.thrust = mass * g / (D.maxThrust * Math.cos(tilt));
      const measured = P.descentVectorSample(s); expect(measured.forces.net.y).toBeCloseTo(0, 12);
      expect(measured.forces.net.x).toBeCloseTo(g * Math.tan(tilt), 12); expect(measured.velocity.x).toBe(4);
      if (!tilt) expect(P.descentVectorGeometry(s).forces.arrows.net.visible).toBe(false);
    }
  });

  it('reflects higher acceleration with less propellant at the same engine output', () => {
    const full = sample({ fuel: 110, thrust: 1 }), light = sample({ fuel: 10, thrust: 1 });
    expect(light.forces.thrustN).toBe(full.forces.thrustN); expect(light.forces.massKg).toBeLessThan(full.forces.massKg);
    expect(light.forces.engine.y).toBeGreaterThan(full.forces.engine.y);
  });

  it('uses the altitude-dependent spherical lunar gravity of the flight model', () => {
    const high = sample({ alt: 15000 }), low = sample({ alt: 1 });
    expect(-high.forces.gravity.y).toBeCloseTo(P.descent.g * Math.pow(P.descent.radius / (P.descent.radius + 15000), 2), 12);
    expect(-high.forces.gravity.y).toBeLessThan(-low.forces.gravity.y);
  });

  it('keeps every airborne acceleration vector on one fixed equal-axis scale', () => {
    for (const extra of [{ thrust: 0 }, { thrust: 1, fuel: .01, tilt: -.35 }, { thrust: 1, fuel: 5000, tilt: .35 }, { fuel: 0 }]) {
      const g = geometry(extra); expect(g.forces.range).toBe(10); expect(g.forces.scale).toBe(14);
      for (const key of ['engine', 'gravity', 'net']) {
        const a = g.forces.arrows[key], vector = g.sample.forces[key];
        expect(a.x - 200).toBeCloseTo(vector.x * 14, 10); expect(180 - a.y).toBeCloseTo(vector.y * 14, 10);
        expect(Math.hypot(a.x - 200, a.y - 180)).toBeLessThan(140);
      }
    }
  });

  it.each([-6, 6])('retains measured velocity angle and sign for lateral speed %s', hVel => {
    const g = geometry({ hVel }), a = g.motion.arrow;
    expect(a.x - 200).toBeCloseTo(hVel * g.motion.scale, 10); expect(180 - a.y).toBeCloseTo(-9 * g.motion.scale, 10);
    expect((a.x - 200) / (180 - a.y)).toBeCloseTo(hVel / -9, 12);
  });

  it('fits large measured speeds without clipping and labels the changed range', () => {
    const slow = geometry({ vVel: -1, hVel: 0 }), initial = geometry(), fast = geometry({ vVel: -5000, hVel: 5000 });
    expect(slow.motion.range).toBe(10); expect(initial.motion.range).toBe(20); expect(fast.motion.range).toBe(10000);
    for (const g of [slow, initial, fast]) expect(Math.hypot(g.motion.arrow.x - 200, g.motion.arrow.y - 180)).toBeLessThan(140);
  });

  it('maps the actual touchdown speed limits without assigning a landing result in midair', () => {
    const g = geometry({ alt: 80, vVel: -2, hVel: 4 }), b = g.motion.limits;
    expect(b.width / g.motion.scale).toBe(10); expect(b.height / g.motion.scale).toBe(6);
    expect(b.x + b.width / 2).toBe(200); expect(b.y + b.height / 2).toBe(180);
    expect(g.sample.contact).toBe(false); expect(g.sample).not.toHaveProperty('landed'); expect(g.sample).not.toHaveProperty('score');
  });

  it('shows zero motion as the origin rather than inventing a direction', () => {
    const g = geometry({ hVel: 0, vVel: 0 }); expect(g.sample.velocity.speed).toBe(0);
    expect(g.motion.arrow).toEqual({ x: 200, y: 180, path: '', visible: false });
  });

  it('preserves contact velocity and omits unintegrated surface support forces', () => {
    const s = state({ alt: 0, contact: true, vVel: -32, hVel: -4, thrust: .6 }), before = JSON.stringify(s), g = P.descentVectorGeometry(s);
    expect(g.sample.velocity).toEqual({ x: -4, y: -32, speed: Math.hypot(4, 32) });
    expect(g.forces).toBeNull(); expect(g.sample.forces).toBeNull(); expect(g.sample.time).toBe(s.elapsed); expect(JSON.stringify(s)).toBe(before);
  });

  it('does no presentation work while the native disclosure is closed', () => {
    const host = view(), root = host.querySelector('[data-descent-vectors]'), before = root.innerHTML; root.open = false;
    P.updateDescentVectors(host, state({ vVel: -30 }), {}); expect(root.innerHTML).toBe(before);
  });

  it('updates measured geometry and rotated lander without changing the source or operating controls', () => {
    const s = state({ thrust: .6, tilt: .2 }), before = JSON.stringify(s), host = view(s, { paused: true });
    const root = host.querySelector('[data-descent-vectors]'); expect(root.dataset.descentVectorActualThrottle).toBe('0.6');
    expect(host.querySelector('[data-descent-vector-craft]').getAttribute('transform')).toBe('rotate(' + (.2 * 180 / Math.PI) + ' 200 180)');
    expect(root.dataset.descentVectorForcesAvailable).toBe('true'); expect(JSON.stringify(s)).toBe(before);
    expect(host.querySelector('[data-descent-vector-source-label]').textContent).toContain('actual throttle 60.0%');
    expect(host.querySelectorAll('[data-descent-vector-source-label]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-descent-vector-source]')).toHaveLength(1);
  });

  it('uses concentric rings when gravity and net acceleration coincide', () => {
    const host = view(), engine = host.querySelector('[data-descent-vector-arrow="engine"]'); expect(engine.style.display).toBe('none');
    const gravity = host.querySelector('[data-descent-vector-ring="gravity"]'), net = host.querySelector('[data-descent-vector-ring="net"]');
    expect(gravity.getAttribute('cx')).toBe(net.getAttribute('cx')); expect(gravity.getAttribute('cy')).toBe(net.getAttribute('cy'));
    expect(Number(gravity.getAttribute('r'))).toBeGreaterThan(Number(net.getAttribute('r')));
  });

  it('hides acceleration values at contact and restores them on an earlier recorded sample', () => {
    const host = view(state({ alt: 0, contact: true }), { recorded: true });
    expect(host.querySelector('[data-descent-vector-plot="forces"]').style.display).toBe('none');
    expect(host.querySelector('[data-descent-vector-value="mass"]').textContent).toBe('—');
    expect(host.querySelector('[data-descent-vector-status]').textContent).toContain('surface support forces are outside');
    P.updateDescentVectors(host, state({ elapsed: 5, thrust: .5 }), { recorded: true });
    expect(host.querySelector('[data-descent-vector-plot="forces"]').style.display).toBe('');
    expect(host.querySelector('[data-descent-vectors]').dataset.descentVectorTime).toBe('5');
    expect(host.querySelector('[data-descent-vector-value="mass"]').textContent).not.toBe('—');
  });

  it('clears old measurements when a saved state is unavailable', () => {
    const host = view(); P.updateDescentVectors(host, null, { unavailable: 'No recording for this landing.' });
    const root = host.querySelector('[data-descent-vectors]'); expect(root.dataset.descentVectorAvailable).toBe('false');
    expect(root.dataset.descentVectorActualThrottle).toBe(''); expect(root.dataset.descentVectorTilt).toBe('');
    expect(host.querySelector('[data-descent-vector-content]').hidden).toBe(true);
    for (const node of host.querySelectorAll('[data-descent-vector-value]')) expect(node.textContent).toBe('—');
  });

  it('keeps path patterns distinct and readable labels outside the scaled SVG', () => {
    const host = view(); expect(host.querySelectorAll('svg text')).toHaveLength(0);
    expect(host.querySelector('[data-descent-vector-arrow="gravity"]').getAttribute('stroke-dasharray')).toBe('5 4');
    expect(host.querySelector('[data-descent-vector-arrow="net"]').getAttribute('stroke-dasharray')).toBe('1 4');
    expect(host.querySelector('[data-descent-vector-arrow="engine"]').hasAttribute('stroke-dasharray')).toBe(false);
  });
});
