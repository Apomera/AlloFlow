import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const SIZES = [280, 390, 1100].flatMap(width => [320, 460].map(height => [width, height]));
let P;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function finiteNumbers(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(finiteNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteNumbers);
}

function canvasRecorder() {
  const calls = [];
  let gradientId = 0;
  const gradient = (...args) => {
    finiteNumbers(args);
    calls.push(['gradient', ...args]);
    return { gradientId: ++gradientId, addColorStop: (...stops) => calls.push(['stop', ...stops]) };
  };
  const known = {
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 5 }),
  };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => {
      finiteNumbers(args);
      calls.push([key, ...args]);
    }),
    set: (target, key, value) => {
      if (typeof value === 'number') finiteNumbers(value);
      target[key] = value;
      calls.push(['set', key, value && value.gradientId ? 'gradient:' + value.gradientId : value]);
      return true;
    },
  });
  return { ctx, calls };
}

// Recover physical Cartesian coordinates with north as +Y, independently of
// the screen's inverted Y coordinate and the model's orbital-element helper.
function world(g, point) {
  return [(point.x - g.moonX) / g.pictureScale, (g.moonY - point.y) / g.pictureScale];
}
function cartesianOrbit(sample) {
  const { radius: R, mu } = P.ascent;
  const r = R + sample.altitude;
  const x = r * Math.sin(sample.angle), y = r * Math.cos(sample.angle);
  const vx = sample.radialSpeed * Math.sin(sample.angle) + sample.tangentialSpeed * Math.cos(sample.angle);
  const vy = sample.radialSpeed * Math.cos(sample.angle) - sample.tangentialSpeed * Math.sin(sample.angle);
  const h = x * vy - y * vx;
  const v2 = vx * vx + vy * vy, rv = x * vx + y * vy;
  const eX = vy * h / mu - x / r, eY = -vx * h / mu - y / r;
  const energy = v2 / 2 - mu / r;
  return { r, x, y, vx, vy, h, v2, rv, eX, eY,
    e: Math.hypot(eX, eY), energy, a: -mu / (2 * energy), p: h * h / mu };
}
function expectPoint(point, x, y) {
  expect(point.x).toBeCloseTo(x, 10);
  expect(point.y).toBeCloseTo(y, 10);
}


describe('physical lunar ascent orbit and altitude scales', () => {
  it('uses one physical distance scale for the Moon, craft, 110 km reference and ruler at every canvas size', () => {
    const profile = P.ascentProfile(), C = P.ascent;
    for (const [width, height] of SIZES) {
      for (const time of [0, 120.123, profile.summary.duration]) {
        const sample = P.ascentSample(profile, time);
        const g = P.ascentPhysicalOrbitGeometry(width, height, sample, profile);
        expect(g.scaleX).toBe(g.scaleY);
        expect(g.pictureScale).toBeGreaterThan(0);
        expect(g.moonRadius / g.pictureScale).toBeCloseTo(C.radius, 6);
        expect(g.referenceRadius / g.pictureScale - C.radius).toBeCloseTo(110000, 6);
        expect(g.referenceRadius / g.moonRadius).toBeCloseTo((C.radius + 110000) / C.radius, 12);
        expect(Math.hypot(g.craftX - g.moonX, g.craftY - g.moonY) / g.pictureScale).toBeCloseTo(C.radius + sample.altitude, 6);
        expectPoint({ x: g.craftX, y: g.craftY },
          g.moonX + (C.radius + sample.altitude) * Math.sin(sample.angle) * g.pictureScale,
          g.moonY - (C.radius + sample.altitude) * Math.cos(sample.angle) * g.pictureScale);
      }
      const sample = P.ascentSample(profile, 120);
      const north = P.ascentPhysicalOrbitGeometry(width, height, { ...sample, angle: 0 }, profile);
      const east = P.ascentPhysicalOrbitGeometry(width, height, { ...sample, angle: Math.PI / 2 }, profile);
      expect(east.craftX - east.moonX).toBeCloseTo(north.moonY - north.craftY, 10);
      const recorder = canvasRecorder();
      const g = P.drawAscentScene(recorder.ctx, width, height, sample, profile, { view: 'physical' });
      expect(g.view).toBe('physical');
      expect(recorder.calls).toContainEqual(['arc', g.craftX, g.craftY, 4, 0, Math.PI * 2]);
      expect(recorder.calls).toContainEqual(['arc', g.moonX, g.moonY, g.referenceRadius, 0, Math.PI * 2]);
      const rulerX = g.map.left + g.map.width - 10, rulerY = g.map.top + g.map.height - 10;
      const rulerStart = recorder.calls.findIndex(row => row[0] === 'moveTo' &&
        Math.abs(row[1] - (rulerX - 500000 * g.pictureScale)) < 1e-9 && row[2] === rulerY);
      expect(rulerStart).toBeGreaterThanOrEqual(0);
      expect(recorder.calls[rulerStart + 1]).toEqual(['lineTo', rulerX, rulerY]);
      expect(recorder.calls).toContainEqual(['fillText', '500 km', rulerX, rulerY - 5]);
    }
  });

  it('orients the cutoff ellipse with the independent Cartesian eccentricity vector from r cross v', () => {
    const profile = P.ascentProfile(), sample = P.ascentSample(profile, profile.summary.duration);
    const k = cartesianOrbit(sample), { mu } = P.ascent;
    // The equivalent dot-product form checks the independent calculation.
    expect(k.eX).toBeCloseTo(((k.v2 - mu / k.r) * k.x - k.rv * k.vx) / mu, 12);
    expect(k.eY).toBeCloseTo(((k.v2 - mu / k.r) * k.y - k.rv * k.vy) / mu, 12);
    for (const [width, height] of SIZES) {
      const g = P.ascentPhysicalOrbitGeometry(width, height, sample, profile);
      expect(g.orbit).not.toBeNull();
      expect(g.orbit.eX).toBeCloseTo(k.eX, 12);
      expect(g.orbit.eY).toBeCloseTo(k.eY, 12);
      expect(g.orbit.eccentricity).toBeCloseTo(k.e, 12);
      expect(g.orbit.semilatus).toBeCloseTo(k.p, 6);
      expect(Math.sin(g.orbit.periAngle)).toBeCloseTo(k.eX / k.e, 10);
      expect(Math.cos(g.orbit.periAngle)).toBeCloseTo(k.eY / k.e, 10);
      const craft = world(g, { x: g.craftX, y: g.craftY });
      expect(Math.hypot(...craft)).toBeCloseTo(k.p / (1 + (k.eX * craft[0] + k.eY * craft[1]) / k.r), 6);
    }
  });

  it('puts both apsides and every ellipse point on the same focus-centered Kepler conic', () => {
    const profile = P.ascentProfile(), sample = P.ascentSample(profile, profile.summary.duration);
    const k = cartesianOrbit(sample), R = P.ascent.radius;
    const ux = k.eX / k.e, uy = k.eY / k.e, b = k.a * Math.sqrt(1 - k.e * k.e);
    for (const [width, height] of SIZES) {
      const g = P.ascentPhysicalOrbitGeometry(width, height, sample, profile), o = g.orbit;
      const peri = world(g, o.periPoint), apo = world(g, o.apoPoint);
      const rp = k.a * (1 - k.e), ra = k.a * (1 + k.e);
      expect(o.perilune).toBeCloseTo(rp - R, 6);
      expect(o.apolune).toBeCloseTo(ra - R, 6);
      expect(peri[0]).toBeCloseTo(rp * ux, 6); expect(peri[1]).toBeCloseTo(rp * uy, 6);
      expect(apo[0]).toBeCloseTo(-ra * ux, 6); expect(apo[1]).toBeCloseTo(-ra * uy, 6);
      expect(o.points.length).toBeGreaterThan(200);
      expectPoint(o.points.at(-1), o.points[0].x, o.points[0].y);
      for (const point of [...o.points, o.periPoint, o.apoPoint]) {
        const [x, y] = world(g, point), r = Math.hypot(x, y);
        expect(r).toBeCloseTo(k.p / (1 + (k.eX * x + k.eY * y) / r), 6);
        // Eccentric-anomaly parameterization about the ellipse's own center:
        // q = a(cos E - e), t = b sin E. It must also reconstruct the point.
        const q = x * ux + y * uy, t = -x * uy + y * ux;
        const cosE = q / k.a + k.e, sinE = t / b;
        expect(cosE * cosE + sinE * sinE).toBeCloseTo(1, 10);
        expect(x).toBeCloseTo(k.a * (cosE - k.e) * ux - b * sinE * uy, 6);
        expect(y).toBeCloseTo(k.a * (cosE - k.e) * uy + b * sinE * ux, 6);
        expect(point.x).toBeGreaterThanOrEqual(g.map.left);
        expect(point.x).toBeLessThanOrEqual(g.map.left + g.map.width);
        expect(point.y).toBeGreaterThanOrEqual(g.map.top);
        expect(point.y).toBeLessThanOrEqual(g.map.top + g.map.height);
      }
    }
  });

  it('agrees with independent energy, angular momentum and vis-viva along the full measured ellipse', () => {
    const profile = P.ascentProfile(), sample = P.ascentSample(profile, profile.summary.duration);
    const g = P.ascentPhysicalOrbitGeometry(1100, 460, sample, profile), k = cartesianOrbit(sample);
    const { mu, radius: R } = P.ascent;
    const rp = R + g.orbit.perilune, ra = R + g.orbit.apolune, a = (rp + ra) / 2;
    expect(k.energy).toBeCloseTo(-mu / (rp + ra), 6);
    expect(k.h * k.h / mu).toBeCloseTo(rp * ra / a, 6);
    expect(sample.radialSpeed ** 2 + sample.tangentialSpeed ** 2).toBeCloseTo(mu * (2 / k.r - 1 / a), 6);
    expect(g.velocityX).toBeCloseTo(k.vx, 10);
    expect(g.velocityY).toBeCloseTo(-k.vy, 10);
    const ux = k.eX / k.e, uy = k.eY / k.e;
    for (const point of g.orbit.points) {
      const [x, y] = world(g, point), r = Math.hypot(x, y);
      const sinNu = ux * y / r - uy * x / r;
      const vr = mu / Math.abs(k.h) * k.e * sinNu, vt = Math.abs(k.h) / r;
      expect(vr * vr + vt * vt).toBeCloseTo(mu * (2 / r - 1 / a), 6);
      expect((vr * vr + vt * vt) / 2 - mu / r).toBeCloseTo(k.energy, 6);
    }
  });

  it('has a finite circular limit without dividing by eccentricity or inventing an apsis orientation', () => {
    const base = P.ascentProfile(), altitude = 110000, r = P.ascent.radius + altitude;
    const sample = { ...base.events.cutoff, altitude, angle: 0.731, radialSpeed: 0,
      tangentialSpeed: Math.sqrt(P.ascent.mu / r), speed: Math.sqrt(P.ascent.mu / r),
      engineOn: false, thrust: 0, pitch: Math.PI / 2 };
    const profile = { ...base, samples: [sample], events: { ...base.events, cutoff: sample },
      summary: { ...base.summary, outcome: 'orbit', cutoffAltitude: altitude, perilune: altitude,
        apolune: altitude, eccentricity: 0, cutoffSpeed: sample.speed } };
    for (const [width, height] of SIZES) {
      const recorder = canvasRecorder(), g = P.drawAscentPhysicalOrbit(recorder.ctx, width, height, sample, profile);
      finiteNumbers(g);
      expect(g.orbit.eccentricity).toBeLessThan(1e-12);
      expect(g.orbit.perilune).toBeCloseTo(altitude, 6);
      expect(g.orbit.apolune).toBeCloseTo(altitude, 6);
      for (const point of [...g.orbit.points, g.orbit.periPoint, g.orbit.apoPoint]) {
        expect(Math.hypot(...world(g, point))).toBeCloseTo(r, 6);
      }
      expect(Math.hypot(g.craftX - g.moonX, g.craftY - g.moonY)).toBeCloseTo(g.referenceRadius, 10);
      expect(g.engineVisible).toBe(false);
      expect(g.plumeVisible).toBe(false);
    }
  });

  it('shows only flown history and withholds the cutoff ellipse until the sampled time reaches cutoff', () => {
    const profile = P.ascentProfile(), end = profile.summary.duration;
    for (const time of [0, 17.375, 200.125, end - 0.01]) {
      const sample = P.ascentSample(profile, time);
      const futurePoisoned = { ...profile, samples: profile.samples.map(row => row.time > sample.time ?
        { ...row, altitude: 1e9, angle: 17, radialSpeed: 1e8, tangentialSpeed: 1e8 } : row) };
      const g = P.ascentPhysicalOrbitGeometry(390, 460, sample, profile);
      expect(P.ascentPhysicalOrbitGeometry(390, 460, sample, futurePoisoned)).toEqual(g);
      expect(g.orbit).toBeNull();
      expectPoint(g.trail.at(-1), g.craftX, g.craftY);
      expect(g.altitudePoints.at(-1)).toEqual(g.chartCurrent);
      for (const point of g.altitudePoints) {
        const chartTime = (point.x - g.chart.left) / g.chart.width * g.timeMax;
        expect(chartTime).toBeGreaterThanOrEqual(-1e-9);
        expect(chartTime).toBeLessThanOrEqual(sample.time + 1e-9);
      }
      const drawn = P.drawAscentScene(canvasRecorder().ctx, 390, 460, sample, profile,
        { view: 'physical', time: end + 100 });
      expect(drawn.orbit).toBeNull();
      expect(drawn.elapsed).toBe(sample.time);
      expect(drawn.trail).toEqual(g.trail);
    }
    const cutoff = P.ascentSample(profile, end);
    expect(P.ascentPhysicalOrbitGeometry(390, 460, cutoff, profile).orbit).not.toBeNull();
    const suborbital = P.ascentProfile({ propellant: 1000 });
    expect(P.ascentPhysicalOrbitGeometry(390, 460,
      P.ascentSample(suborbital, suborbital.summary.duration), suborbital).orbit).toBeNull();
  });

  it('keeps history axes in seconds and kilometers with the current sample visible at its exact time and altitude', () => {
    const profile = P.ascentProfile();
    for (const [width, height] of SIZES) for (const time of [0, 120.123, profile.summary.duration]) {
      const sample = P.ascentSample(profile, time), recorder = canvasRecorder();
      const g = P.drawAscentScene(recorder.ctx, width, height, sample, profile, { view: 'physical' });
      expect(g.timeMax).toBe(profile.summary.duration);
      expect((g.chartCurrent.x - g.chart.left) / g.chart.width * g.timeMax).toBeCloseTo(sample.time, 10);
      expect((1 - (g.chartCurrent.y - g.chart.top) / g.chart.height) * g.altitudeMax).toBeCloseTo(sample.altitude, 7);
      expect(g.chartCurrent.x).toBeGreaterThanOrEqual(g.chart.left - 1e-9);
      expect(g.chartCurrent.x).toBeLessThanOrEqual(g.chart.left + g.chart.width + 1e-9);
      expect(g.chartCurrent.y).toBeGreaterThanOrEqual(g.chart.top);
      expect(g.chartCurrent.y).toBeLessThanOrEqual(g.chart.top + g.chart.height);
      expect(g.chart.left + g.chart.width).toBeLessThanOrEqual(width);
      expect(g.chart.top + g.chart.height).toBeLessThanOrEqual(height - 30);
      expect(recorder.calls).toContainEqual(['fillText', 'Time (s) · altitude (km)', g.chart.left, g.chart.top - 10]);
      expect(recorder.calls).toContainEqual(['fillText', '0 s', g.chart.left, g.chart.top + g.chart.height + 18]);
      expect(recorder.calls).toContainEqual(['fillText', profile.summary.duration.toFixed(0) + ' s',
        g.chart.left + g.chart.width, g.chart.top + g.chart.height + 18]);
      const labels = recorder.calls.filter(row => row[0] === 'fillText' && row[2] === g.chart.left - 8).map(row => Number(row[1]));
      expect(labels).toEqual([0, g.altitudeMax / 2000, g.altitudeMax / 1000]);
      expect(recorder.calls).toContainEqual(['arc', g.chartCurrent.x, g.chartCurrent.y, 3, 0, Math.PI * 2]);
    }
  });

  it('returns deterministic detached geometry and leaves the sampled state and trajectory immutable', () => {
    const profile = P.ascentProfile(), sample = Object.freeze(P.ascentSample(profile, profile.summary.duration));
    const before = JSON.stringify({ profile, sample });
    const first = P.ascentPhysicalOrbitGeometry(390, 460, sample, profile);
    const expected = P.ascentPhysicalOrbitGeometry(390, 460, sample, profile);
    expect(first).toEqual(expected);
    first.orbit.points[0].x = -999;
    first.trail[0].y = -999;
    first.altitudePoints[0].x = -999;
    expect(P.ascentPhysicalOrbitGeometry(390, 460, sample, profile)).toEqual(expected);
    const a = canvasRecorder(), b = canvasRecorder();
    const drawA = P.drawAscentScene(a.ctx, 390, 460, sample, profile, { view: 'physical' });
    P.drawAscentScene(canvasRecorder().ctx, 1100, 320, P.ascentSample(profile, 40), profile, { view: 'physical' });
    const drawB = P.drawAscentScene(b.ctx, 390, 460, sample, profile, { view: 'physical' });
    expect(drawA).toEqual(drawB);
    expect(a.calls).toEqual(b.calls);
    expect(JSON.stringify({ profile, sample })).toBe(before);
    expect(Object.isFrozen(profile.samples)).toBe(true);
  });

  it('accepts only the exact saved view enum and restores the validated choice in the view control', () => {
    for (const value of ['auto', 'surface', 'physical']) expect(P.ascentView(value)).toBe(value);
    for (const value of [undefined, null, false, true, 0, 1, NaN, Infinity, {}, [], ['physical'],
      new String('physical'), 'orbit', 'Physical', ' physical', 'physical ', '__proto__']) {
      expect(P.ascentView(value)).toBe('auto');
    }
    for (const value of ['auto', 'surface', 'physical', 'orbit', ['physical']]) {
      const host = document.createElement('div');
      host.innerHTML = renderTool('moonMission', { moonMission: { missionPhase: 7, soundOff: true, ascentView: value } });
      const control = host.querySelector('[data-ascent-view-control]');
      expect(control).not.toBeNull();
      expect([...control.options].map(option => option.value)).toEqual(['auto', 'surface', 'physical']);
      expect(control.value).toBe(typeof value === 'string' && ['auto', 'surface', 'physical'].includes(value) ? value : 'auto');
    }
  });

  it('keeps an exhausted zero-duration custom ascent finite with an off engine and a visible initial history point', () => {
    const profile = P.ascentProfile({ propellant: 0 }), sample = P.ascentSample(profile, 0);
    expect(profile.summary.duration).toBe(0);
    expect(sample.engineOn).toBe(false);
    for (const [width, height] of SIZES) {
      const recorder = canvasRecorder(), g = P.drawAscentScene(recorder.ctx, width, height, sample, profile, { view: 'physical' });
      finiteNumbers(g);
      expect(g.timeMax).toBeGreaterThanOrEqual(1);
      expect(g.orbit).toBeNull();
      expect(g.engineVisible).toBe(false);
      expect(g.thrustVisible).toBe(false);
      expect(g.plumeVisible).toBe(false);
      expectPoint(g.chartCurrent, g.chart.left, g.chart.top + g.chart.height);
      expectPoint(g.trail.at(-1), g.craftX, g.craftY);
      expect(g.altitudePoints.at(-1)).toEqual(g.chartCurrent);
      expect(recorder.calls.some(row => row[0] === 'fillText' && row[1] === 'APS OFF')).toBe(true);
      expect(recorder.calls).toContainEqual(['arc', g.chartCurrent.x, g.chartCurrent.y, 3, 0, Math.PI * 2]);
    }
  });
});
