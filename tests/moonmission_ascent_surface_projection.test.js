import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

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

// Rotate a vector in a north-up Cartesian frame, then invert Y only when
// mapping to the canvas. This is independent of the surface helper's sag form.
function rotateFrame([x, y], angle) {
  return [x * Math.cos(angle) + y * Math.sin(angle),
    -x * Math.sin(angle) + y * Math.cos(angle)];
}
function polarPosition(sample) {
  const [x, north] = rotateFrame([0, P.ascent.radius + sample.altitude], sample.angle);
  return [x, north - P.ascent.radius];
}
function worldPoint(g, x, y) {
  return [(x - g.originX) / g.pictureScale, (g.originY - y) / g.pictureScale];
}
function projectedPoint(g, sample) {
  const [x, y] = polarPosition(sample);
  return { x: g.originX + x * g.pictureScale, y: g.originY - y * g.pictureScale };
}
function expectPoint(point, x, y, digits = 8) {
  expect(point.x).toBeCloseTo(x, digits);
  expect(point.y).toBeCloseTo(y, digits);
}
function expectOnCanvas(point, width, height) {
  expect(point.x).toBeGreaterThanOrEqual(-1e-8);
  expect(point.x).toBeLessThanOrEqual(width + 1e-8);
  expect(point.y).toBeGreaterThanOrEqual(-1e-8);
  expect(point.y).toBeLessThanOrEqual(height + 1e-8);
}

describe('lunar ascent surface Cartesian projection', () => {
  it('preserves radius, central angle and radial altitude above the same-angle surface foot', () => {
    const profile = P.ascentProfile(), base = P.ascentSample(profile, 120), R = P.ascent.radius;
    for (const angle of [-0.32, 0, 0.43]) {
      const sample = { ...base, angle, altitude: 18000, downrange: 999999999 };
      const g = P.ascentSurfaceGeometry(390, 460, sample, profile);
      const craft = worldPoint(g, g.craftX, g.craftY), foot = worldPoint(g, g.footX, g.footY);
      const expected = polarPosition(sample);
      expectPoint({ x: g.worldX, y: g.worldY }, ...expected, 6);
      expectPoint({ x: craft[0], y: craft[1] }, ...expected, 6);
      expect(Math.hypot(craft[0], craft[1] + R)).toBeCloseTo(R + sample.altitude, 6);
      expect(Math.hypot(foot[0], foot[1] + R)).toBeCloseTo(R, 6);
      expect(Math.atan2(craft[0], craft[1] + R)).toBeCloseTo(angle, 12);
      expect(Math.atan2(foot[0], foot[1] + R)).toBeCloseTo(angle, 12);
      const radial = [foot[0] / R, (foot[1] + R) / R];
      const clearance = [craft[0] - foot[0], craft[1] - foot[1]];
      expect(Math.hypot(...clearance)).toBeCloseTo(sample.altitude, 6);
      expect(clearance[0] * radial[0] + clearance[1] * radial[1]).toBeCloseTo(sample.altitude, 6);
      expect(clearance[0] * radial[1] - clearance[1] * radial[0]).toBeCloseTo(0, 6);
      expect(P.ascentSurfaceGeometry(390, 460, { ...sample, downrange: -1 }, profile)).toEqual(g);
    }
  });

  it('samples and draws the full visible lunar limb on one circle, including precise launch-scale sag', () => {
    const profile = P.ascentProfile(), R = P.ascent.radius;
    for (const [width, height] of SIZES) for (const time of [0, profile.summary.duration]) {
      const sample = P.ascentSample(profile, time), recorder = canvasRecorder();
      const g = P.drawAscentScene(recorder.ctx, width, height, sample, profile, { view: 'surface' });
      const radius = R * g.pictureScale, centerY = g.originY + radius;
      expect(g.surfacePoints.length).toBeGreaterThan(20);
      expect(g.surfacePoints[0].x).toBe(0);
      expect(g.surfacePoints.at(-1).x).toBe(width);
      expect(g.groundAtLaunch).toBe(g.originY);
      for (let i = 0; i < g.surfacePoints.length; i++) {
        const point = g.surfacePoints[i];
        expect(Math.hypot(point.x - g.originX, point.y - centerY) / radius).toBeCloseTo(1, 12);
        expect(point.y).toBeGreaterThanOrEqual(g.originY);
        if (i) {
          expect(point.x).toBeGreaterThan(g.surfacePoints[i - 1].x);
          expect(recorder.calls).toContainEqual(['lineTo', point.x, point.y]);
        } else expect(recorder.calls).toContainEqual(['moveTo', point.x, point.y]);
      }
      if (time === 0) {
        const edge = g.surfacePoints.at(-1), chord = edge.x - g.originX;
        const sag = edge.y - g.originY;
        expect(sag).toBeGreaterThan(0);
        // At liftoff the circle has the independently known parabolic limit.
        expect(sag / (chord * chord / (2 * radius))).toBeCloseTo(1, 6);
      }
    }
  });

  it('rotates radial and tangential velocity consistently with a finite difference of Cartesian position', () => {
    const profile = P.ascentProfile(), base = P.ascentSample(profile, 120);
    const radius = P.ascent.radius + 22000, radialSpeed = 41, tangentialSpeed = 1530, angle = 0.47;
    const at = dt => ({ ...base, altitude: radius + radialSpeed * dt - P.ascent.radius,
      angle: angle + tangentialSpeed / radialSpeed * Math.log1p(radialSpeed * dt / radius),
      radialSpeed, tangentialSpeed, speed: Math.hypot(radialSpeed, tangentialSpeed) });
    const delta = 0.01, g = P.ascentSurfaceGeometry(390, 460, at(0), profile);
    const before = P.ascentSurfaceGeometry(390, 460, at(-delta), profile);
    const after = P.ascentSurfaceGeometry(390, 460, at(delta), profile);
    expect(g.velocityX).toBeCloseTo((after.worldX - before.worldX) / (2 * delta), 5);
    expect(g.velocityY).toBeCloseTo(-(after.worldY - before.worldY) / (2 * delta), 5);
    const velocity = rotateFrame([tangentialSpeed, radialSpeed], angle);
    expect(g.velocityX).toBeCloseTo(velocity[0], 10);
    expect(g.velocityY).toBeCloseTo(-velocity[1], 10);
    expect(Math.hypot(g.velocityX, g.velocityY)).toBeCloseTo(Math.hypot(radialSpeed, tangentialSpeed), 10);
    const recorder = canvasRecorder();
    P.drawAscentScene(recorder.ctx, 390, 460, at(0), profile, { view: 'surface' });
    const speed = Math.hypot(...velocity);
    expect(recorder.calls).toContainEqual(['lineTo', g.craftX + g.velocityX / speed * 38,
      g.craftY + g.velocityY / speed * 38]);
  });

  it('uses local pitch plus central angle for artwork, thrust and the nozzle while preserving engine gating', () => {
    const profile = P.ascentProfile(), base = P.ascentSample(profile, 90);
    const sample = { ...base, angle: 0.37, pitch: 0.91 };
    const g = P.ascentSurfaceGeometry(390, 460, sample, profile), R = P.ascent.radius;
    const radial = [(g.footX - g.originX) / (R * g.pictureScale),
      (g.footY - g.originY - R * g.pictureScale) / (R * g.pictureScale)];
    const tangent = [-radial[1], radial[0]];
    const thrust = radial.map((value, i) => value * Math.cos(sample.pitch) + tangent[i] * Math.sin(sample.pitch));
    expect(g.craftPitch).toBeCloseTo(sample.angle + sample.pitch, 12);
    expect(g.thrustX).toBeCloseTo(thrust[0], 10);
    expect(g.thrustY).toBeCloseTo(thrust[1], 10);
    expect(g.artOffset).toBeGreaterThanOrEqual(0);
    expect(g.artOffset).toBeLessThanOrEqual(36 * g.artScale);
    expectPoint({ x: g.artX - g.craftX, y: g.artY - g.craftY },
      radial[0] * g.artOffset, radial[1] * g.artOffset);
    expectPoint({ x: g.nozzleX - g.artX, y: g.nozzleY - g.artY },
      -thrust[0] * 12 * g.artScale, -thrust[1] * 12 * g.artScale);
    for (const [state, time, firing] of [[sample, -3, false], [sample, 90, true],
      [{ ...sample, thrust: 0 }, 90, false], [{ ...sample, engineOn: false }, 90, false]]) {
      const recorder = canvasRecorder();
      const drawn = P.drawAscentScene(recorder.ctx, 390, 460, state, profile, { view: 'surface', time });
      expect(drawn.engineVisible).toBe(firing);
      expect(drawn.plumeVisible).toBe(firing);
      expect(recorder.calls).toContainEqual(['translate', drawn.artX, drawn.artY]);
      expect(recorder.calls).toContainEqual(['rotate', drawn.craftPitch]);
      expect(recorder.calls).toContainEqual(['arc', drawn.craftX, drawn.craftY, 3.5, 0, Math.PI * 2]);
    }
  });

  it('puts the nominal cutoff below the original launch tangent while retaining positive radial altitude', () => {
    const profile = P.ascentProfile(), sample = P.ascentSample(profile, profile.summary.duration);
    const g = P.ascentSurfaceGeometry(390, 460, sample, profile);
    expect(sample.altitude).toBeGreaterThan(0);
    expect(g.worldY).toBeLessThan(0);
    expect(g.craftY).toBeGreaterThan(g.originY);
    expect(g.footY).toBeGreaterThan(g.craftY);
    expect(Math.hypot(g.craftX - g.footX, g.craftY - g.footY) / g.pictureScale).toBeCloseTo(sample.altitude, 6);
    const foot = worldPoint(g, g.footX, g.footY), craft = worldPoint(g, g.craftX, g.craftY);
    expect(Math.hypot(...foot)).toBeGreaterThan(Math.abs(foot[0]));
    expect(craft[1]).toBeCloseTo(polarPosition(sample)[1], 6);
    expect(craft[1]).not.toBeCloseTo(sample.altitude, 0);
  });

  it('joins the enlarged nozzle to the descent-stage deck at liftoff and separates smoothly during vertical ascent', () => {
    const profile = P.ascentProfile();
    for (const [width, height] of SIZES) {
      let previousGap = -1;
      for (const time of [0, 0.25, 1, 4]) {
        const sample = P.ascentSample(profile, time), recorder = canvasRecorder();
        const g = P.drawAscentScene(recorder.ctx, width, height, sample, profile, { view: 'surface', time });
        const deckY = g.remnantY - 10 * g.artScale, gap = deckY - g.nozzleY;
        expect(sample.pitch).toBe(0);
        expect(g.remnantX).toBe(g.originX);
        expect(g.remnantY).toBeCloseTo(g.originY - 14 * g.artScale, 10);
        expect(recorder.calls).toContainEqual(['translate', g.remnantX, g.remnantY]);
        expect(recorder.calls).toContainEqual(['fillRect', -8, -10, 16, 2]);
        if (time === 0) {
          expectPoint({ x: g.craftX, y: g.craftY }, g.originX, g.originY);
          expectPoint({ x: g.nozzleX, y: g.nozzleY }, g.remnantX, deckY);
          expect(g.artOffset).toBeCloseTo(36 * g.artScale, 10);
        } else {
          expect(sample.altitude).toBeGreaterThan(0);
          expect(gap).toBeGreaterThan(0);
          expect(g.artOffset).toBeLessThan(36 * g.artScale);
        }
        expect(gap).toBeGreaterThan(previousGap);
        previousGap = gap;
      }
    }
  });

  it('excludes poisoned future samples from the scale, limb and flown trail at fractional playback times', () => {
    const profile = P.ascentProfile();
    for (const time of [0, 17.375, 200.125, profile.summary.duration - 0.01]) {
      const sample = P.ascentSample(profile, time);
      const poisoned = { ...profile, samples: profile.samples.map(row => row.time > sample.time ?
        { ...row, altitude: 1e9, angle: 17, downrange: -1e12, radialSpeed: 1e8, tangentialSpeed: 1e8 } : row) };
      const g = P.ascentSurfaceGeometry(390, 460, sample, profile);
      expect(P.ascentSurfaceGeometry(390, 460, sample, poisoned)).toEqual(g);
      expectPoint(g.trail.at(-1), g.craftX, g.craftY);
      const observed = profile.samples.filter(row => row.time <= sample.time).concat([sample]).map(row => projectedPoint(g, row));
      for (const point of g.trail) expect(observed.some(candidate =>
        Math.hypot(candidate.x - point.x, candidate.y - point.y) < 1e-7)).toBe(true);
      const drawn = P.drawAscentScene(canvasRecorder().ctx, 390, 460, sample, poisoned,
        { view: 'surface', time: profile.summary.duration + 100 });
      for (const [key, value] of Object.entries(g)) expect(drawn[key]).toEqual(value);
    }
  });

  it('fits earlier altitude and range extremes even when they fall between retained trail points', () => {
    const base = P.ascentProfile(), initial = P.ascentSample(base, 0);
    const rows = Array.from({ length: 10 }, (_, time) => ({ ...initial, time, altitude: time * 100, angle: time * 0.0002 }));
    rows[3] = { ...rows[3], altitude: 140000, angle: 0.32 };
    const sample = { ...rows.at(-1), time: 10, altitude: 1000, angle: 0.002 };
    const profile = { ...base, samples: rows };
    const withoutPeak = { ...profile, samples: rows.map((row, index) => index === 3 ?
      { ...row, altitude: 300, angle: 0.0006 } : row) };
    for (const [width, height] of SIZES) {
      const g = P.ascentSurfaceGeometry(width, height, sample, profile);
      expect(g.pictureScale).toBeLessThan(P.ascentSurfaceGeometry(width, height, sample, withoutPeak).pictureScale);
      for (const row of rows.concat([sample])) {
        expectOnCanvas(projectedPoint(g, row), width, height);
        expectOnCanvas(projectedPoint(g, { ...row, altitude: 0 }), width, height);
      }
      expectPoint(g.trail.at(-1), g.craftX, g.craftY);
    }
  });

  it('uses equal meter scales and an accurate meter or kilometer ruler at every supported canvas size', () => {
    const profile = P.ascentProfile();
    for (const [width, height] of SIZES) for (const time of [0, 120.123, profile.summary.duration]) {
      const sample = P.ascentSample(profile, time), recorder = canvasRecorder();
      const g = P.drawAscentScene(recorder.ctx, width, height, sample, profile, { view: 'surface' });
      expect(g.scaleX).toBe(g.scaleY);
      expect(g.pictureScale).toBe(g.scaleX);
      expect(g.pictureScale).toBeGreaterThan(0);
      expect(g.artScale).toBeCloseTo(Math.min(1.65, Math.max(1.05, width / 680)), 12);
      expect(Math.hypot(g.craftX - g.footX, g.craftY - g.footY) / g.pictureScale).toBeCloseTo(sample.altitude, 6);
      for (const point of [...g.trail, { x: g.craftX, y: g.craftY }, { x: g.artX, y: g.artY },
        { x: g.nozzleX, y: g.nozzleY }, { x: g.remnantX, y: g.remnantY }]) expectOnCanvas(point, width, height);
      const label = recorder.calls.find(row => row[0] === 'fillText' && /^(\d+(?:\.\d+)?) (m|km)$/.test(row[1]) && row[3] === height - 36);
      expect(label).toBeDefined();
      const [, amount, unit] = label[1].match(/^(\d+(?:\.\d+)?) (m|km)$/);
      const rulerMeters = Number(amount) * (unit === 'km' ? 1000 : 1);
      const endIndex = recorder.calls.findIndex((row, index) => row[0] === 'lineTo' && row[1] === label[2] &&
        row[2] === height - 28 && recorder.calls[index - 1]?.[0] === 'moveTo' && recorder.calls[index - 1][2] === row[2]);
      expect(endIndex).toBeGreaterThan(0);
      const lengthPixels = recorder.calls[endIndex][1] - recorder.calls[endIndex - 1][1];
      expect(lengthPixels / g.pictureScale).toBeCloseTo(rulerMeters, 6);
      expect(recorder.calls.some(row => row[0] === 'fillText' && /Equal scales/.test(row[1]))).toBe(true);
    }
  });

  it('returns detached deterministic geometry and keeps normal and zero-duration inputs immutable', () => {
    const normal = P.ascentProfile(), exhausted = P.ascentProfile({ propellant: 0 });
    expect(exhausted.summary.duration).toBe(0);
    for (const profile of [normal, exhausted]) {
      const sample = Object.freeze(P.ascentSample(profile, profile === exhausted ? 0 : 200.125));
      const before = JSON.stringify({ profile, sample });
      const first = P.ascentSurfaceGeometry(390, 460, sample, profile);
      const expected = P.ascentSurfaceGeometry(390, 460, sample, profile);
      expect(first).toEqual(expected);
      first.trail[0].x = -999;
      first.surfacePoints[0].y = -999;
      first.plot.left = -999;
      expect(P.ascentSurfaceGeometry(390, 460, sample, profile)).toEqual(expected);
      const a = canvasRecorder(), b = canvasRecorder();
      const drawA = P.drawAscentScene(a.ctx, 390, 460, sample, profile, { view: 'surface' });
      P.drawAscentScene(canvasRecorder().ctx, 1100, 320, P.ascentSample(normal, 40), normal, { view: 'surface' });
      const drawB = P.drawAscentScene(b.ctx, 390, 460, sample, profile, { view: 'surface' });
      expect(drawA).toEqual(drawB);
      expect(a.calls).toEqual(b.calls);
      expect(JSON.stringify({ profile, sample })).toBe(before);
      expect(Object.isFrozen(profile.samples)).toBe(true);
      if (profile === exhausted) for (const [width, height] of SIZES) {
        const g = P.drawAscentScene(canvasRecorder().ctx, width, height, sample, profile, { view: 'surface' });
        finiteNumbers(g);
        expect(g.engineVisible).toBe(false);
        expect(g.plumeVisible).toBe(false);
        expectPoint(g.trail.at(-1), g.craftX, g.craftY);
        expectPoint({ x: g.nozzleX, y: g.nozzleY }, g.remnantX, g.remnantY - 10 * g.artScale);
      }
    }
  });
});
