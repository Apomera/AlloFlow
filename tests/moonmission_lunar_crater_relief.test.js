/** Named lunar crater floors and walls respond to the atlas Sun and rim shadows. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const D = Math.PI / 180;
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

const CRATERS = [
  [-11.4, -43.3, 85, 'Tycho'], [-20.1, 9.6, 93, 'Copernicus'], [-38, 8.1, 31, 'Kepler'],
  [-47.4, 23.7, 40, 'Aristarchus'], [46.8, 16.1, 28, 'Proclus'],
  [-9.3, 51.6, 101, 'Plato'], [-68.3, -5.2, 172, 'Grimaldi'],
  [-14.1, -58.4, 225, 'Clavius'], [26.4, -11.4, 100, 'Theophilus'], [61, -8.9, 132, 'Langrenus'],
  [-1.9, -9.2, 153, 'Ptolemaeus'], [60.4, -25.3, 177, 'Petavius'], [-4, 29.7, 81, 'Archimedes'],
  [-3.2, -24.6, 60, 'Arzachel'], [-7, -60, 110, 'Maginus'], [37, -30, 90, 'Piccolomini'],
];
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const normalise = a => a.map(n => n / Math.hypot(...a));
const height = (x, y, depth) => -depth * Math.min(1, (1 - Math.hypot(x, y)) / 0.35);
const sun = (elevation, azimuth = 0) => [
  Math.cos(elevation * D) * Math.cos(azimuth * D),
  Math.cos(elevation * D) * Math.sin(azimuth * D),
  Math.sin(elevation * D),
];

// Find the circular rim by bisection along the ray. This avoids using the
// renderer's analytic ray/circle intersection and derives the wall normal from
// numerical height samples, so the checks exercise geometry independently.
function oracle(x, y, direction, depth) {
  const h = height(x, y, depth);
  let blocked = direction[2] <= 0;
  const horizontal = Math.hypot(direction[0], direction[1]);
  if (!blocked && horizontal > 1e-12) {
    let near = 0, far = 3 / horizontal;
    for (let i = 0; i < 70; i++) {
      const t = (near + far) / 2;
      if (Math.hypot(x + t * direction[0], y + t * direction[1]) < 1) near = t;
      else far = t;
    }
    blocked = h + ((near + far) / 2) * direction[2] < -1e-10;
  }
  const epsilon = 1e-6;
  const n = normalise([
    -(height(x + epsilon, y, depth) - height(x - epsilon, y, depth)) / (2 * epsilon),
    -(height(x, y + epsilon, depth) - height(x, y - epsilon, depth)) / (2 * epsilon),
    1,
  ]);
  const incidence = blocked ? 0 : Math.max(0, Math.min(1, dot(n, direction)));
  return { height: h, shadow: blocked, incidence, illuminated: incidence > 0 };
}

function frame(lon, lat) {
  return {
    center: [Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D), Math.cos(lat * D) * Math.cos(lon * D)],
    east: [Math.cos(lon * D), 0, -Math.sin(lon * D)],
    north: [-Math.sin(lat * D) * Math.sin(lon * D), Math.cos(lat * D), -Math.sin(lat * D) * Math.cos(lon * D)],
  };
}
function craterPoint(crater, x, y) {
  const basis = frame(crater[0], crater[1]), size = Math.sin(crater[2] / 2 / 1737);
  const z = Math.sqrt(1 - size * size * (x * x + y * y));
  return basis.center.map((n, i) => n * z + size * (basis.east[i] * x + basis.north[i] * y));
}
function overlapsAnotherCrater(crater, n) {
  return CRATERS.some(other => other !== crater && dot(n, frame(other[0], other[1]).center) > Math.cos(other[2] / 2 / 1737));
}

describe('Lunar crater bowl illumination', () => {
  it('rejects nonfinite geometry, nonunit sunlight and unsupported depths', () => {
    for (const bad of [NaN, Infinity, -Infinity, '0', null]) {
      for (const index of [0, 1, 2, 3, 4, 5]) {
        const args = [0, 0, 0, 0, 1, 0.1]; args[index] = bad;
        expect(P.lunarBowlLight(...args), `argument ${index}: ${String(bad)}`).toBeNull();
      }
    }
    for (const args of [[1.001, 0, 0, 0, 1], [0.8, 0.8, 0, 0, 1], [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 2], [0, 0, 1 + 1e-6, 0, 0], [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 1, -0.1], [0, 0, 0, 0, 1, 0.50001]]) expect(P.lunarBowlLight(...args)).toBeNull();
  });

  it('uses a floor one tenth of a crater radius below the rim by default', () => {
    expect(P.lunarBowlLight(0, 0, 0, 0, 1)).toEqual({ height: -0.1, incidence: 1, shadow: false, illuminated: true });
    expect(P.lunarBowlLight(0, 0, 0, 0, 1)).toEqual(P.lunarBowlLight(0, 0, 0, 0, 1, 0.1));
  });

  it('keeps the central 65 percent of the radius flat', () => {
    for (const q of [0, 0.2, 0.5, 0.64, 0.65 - 1e-12]) for (const angle of [0, 0.7, 2.3, 4.9]) {
      const result = P.lunarBowlLight(q * Math.cos(angle), q * Math.sin(angle), 0, 0, 1);
      expect(result.height).toBeCloseTo(-0.1, 12);
      expect(result.incidence).toBeCloseTo(1, 12);
      expect(result.shadow).toBe(false);
    }
  });

  it('joins the floor and rim with finite, continuous conical walls', () => {
    for (const depth of [0.025, 0.1, 0.3, 0.5]) {
      const a = P.lunarBowlLight(0.65 - 1e-7, 0, 0, 0, 1, depth);
      const b = P.lunarBowlLight(0.65 + 1e-7, 0, 0, 0, 1, depth);
      expect(Math.abs(a.height - b.height)).toBeLessThan(2e-7);
      expect(P.lunarBowlLight(0.825, 0, 0, 0, 1, depth).height).toBeCloseTo(-depth / 2, 12);
      expect(P.lunarBowlLight(1, 0, 0, 0, 1, depth).height).toBeCloseTo(0, 12);
      expect(P.lunarBowlLight(1 - 1e-7, 0, 0, 0, 1, depth).height).toBeGreaterThan(-2e-7);
    }
  });

  it('reduces overhead illumination on sloping walls while keeping the floor fully lit', () => {
    const expected = Math.cos(Math.atan(0.1 / 0.35));
    for (const q of [0.7, 0.85, 0.99]) {
      const result = P.lunarBowlLight(q, 0, 0, 0, 1);
      expect(result.incidence).toBeCloseTo(expected, 12);
      expect(result.shadow).toBe(false);
    }
    expect(P.lunarBowlLight(0, 0, 0, 0, 1).incidence).toBe(1);
  });

  it('brightens the wall that faces the Sun', () => {
    const direction = sun(30);
    const west = P.lunarBowlLight(-0.85, 0, ...direction);
    const east = P.lunarBowlLight(0.85, 0, ...direction);
    expect(west.shadow).toBe(false); expect(east.shadow).toBe(false);
    expect(west.incidence).toBeGreaterThan(east.incidence);
    expect(west.incidence).toBeGreaterThan(direction[2]);
    expect(east.incidence).toBeLessThan(direction[2]);
  });

  it('shadows the center below the geometric rim elevation for several depths', () => {
    for (const depth of [0.01, 0.05, 0.1, 0.25, 0.5]) {
      const elevation = Math.atan(depth) / D;
      const hidden = P.lunarBowlLight(0, 0, ...sun(elevation - 0.0001), depth);
      const visible = P.lunarBowlLight(0, 0, ...sun(elevation + 0.0001), depth);
      expect(hidden.shadow).toBe(true); expect(hidden.incidence).toBe(0);
      expect(hidden.illuminated).toBe(false);
      expect(visible.shadow).toBe(false); expect(visible.incidence).toBeGreaterThan(0);
    }
  });

  it('moves the rim shadow across the flat floor when the Sun changes direction', () => {
    const low = sun(8);
    const towardSun = P.lunarBowlLight(0.5, 0, ...low);
    const awayFromSun = P.lunarBowlLight(-0.5, 0, ...low);
    expect(towardSun.shadow).toBe(true);
    expect(awayFromSun.shadow).toBe(false);
    expect(P.lunarBowlLight(-0.5, 0, ...sun(8, 180)).shadow).toBe(true);
    expect(P.lunarBowlLight(0.5, 0, ...sun(8, 180)).shadow).toBe(false);
  });

  it('keeps every wall and floor dark for a Sun on or below the local horizon', () => {
    for (const elevation of [-90, -40, -0.001, 0]) for (const q of [0, 0.4, 0.8, 1]) {
      const result = P.lunarBowlLight(q, 0, ...sun(elevation));
      expect(result.shadow).toBe(true); expect(result.incidence).toBe(0); expect(result.illuminated).toBe(false);
    }
  });

  it('is invariant when the point and Sun rotate together in the crater plane', () => {
    for (const point of [[0.3, -0.2], [0.8, 0.15], [-0.45, -0.72]]) for (const direction of [sun(3, 25), sun(13, -45), sun(55, 71)]) {
      const baseline = P.lunarBowlLight(...point, ...direction);
      for (const angle of [0.2, 1.8, 3.7]) {
        const rotate = ([x, y]) => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
        const result = P.lunarBowlLight(...rotate(point), ...rotate(direction), direction[2]);
        expect(result.height).toBeCloseTo(baseline.height, 12);
        expect(result.incidence).toBeCloseTo(baseline.incidence, 12);
        expect(result.shadow).toBe(baseline.shadow);
      }
    }
  });

  it('agrees with independent rim intersections and sampled terrain normals', () => {
    let lit = 0, shadowed = 0;
    for (const depth of [0.035, 0.1, 0.3]) for (const q of [0, 0.35, 0.6, 0.72, 0.93]) {
      for (const bearing of [0, 0.8, 2.7]) for (const elevation of [2, 7, 16, 45, 89]) {
        const x = q * Math.cos(bearing), y = q * Math.sin(bearing), direction = sun(elevation, 37);
        const expected = oracle(x, y, direction, depth), actual = P.lunarBowlLight(x, y, ...direction, depth);
        expect(actual.height).toBeCloseTo(expected.height, 11);
        expect(actual.incidence).toBeCloseTo(expected.incidence, 8);
        expect(actual.shadow).toBe(expected.shadow);
        expect(actual.illuminated).toBe(expected.illuminated);
        if (actual.shadow) shadowed++; else lit++;
      }
    }
    expect(lit).toBeGreaterThan(50); expect(shadowed).toBeGreaterThan(50);
  });

  it('stays finite at zenith and the rim, with incidence bounded between zero and one', () => {
    for (const q of [0, 1e-14, 0.65, 1 - 1e-12, 1]) for (const elevation of [0, 1e-10, 10, 90 - 1e-10, 90]) {
      const result = P.lunarBowlLight(q, 0, ...sun(elevation));
      expect(Number.isFinite(result.height)).toBe(true); expect(Number.isFinite(result.incidence)).toBe(true);
      expect(result.height).toBeGreaterThanOrEqual(-0.1); expect(result.height).toBeLessThanOrEqual(0);
      expect(result.incidence).toBeGreaterThanOrEqual(0); expect(result.incidence).toBeLessThanOrEqual(1);
      expect(result.illuminated).toBe(result.incidence > 0);
    }
  });
});

describe('Named lunar crater projection', () => {
  it('finds all sixteen named crater centers at their selenographic coordinates', () => {
    for (const crater of CRATERS) {
      const n = craterPoint(crater, 0, 0), result = P.lunarCraterRelief(n[0], n[1], -90);
      expect(result?.name).toBe(crater[3]);
      expect(result.x).toBeCloseTo(0, 10); expect(result.y).toBeCloseTo(0, 10);
      expect(result.depthRatio).toBe(0.1); expect(result.height).toBeCloseTo(-0.1, 12);
    }
  });

  it('recovers east and north offsets from spherical cap points, including limbward craters', () => {
    for (const crater of CRATERS) for (const [x, y] of [[0.2, -0.4], [-0.75, 0.1], [0.1, 0.85]]) {
      const n = craterPoint(crater, x, y);
      // Clavius and Maginus overlap. Which crater owns their shared pixels is a
      // drawing policy; isolate this coordinate test from that choice.
      if (overlapsAnotherCrater(crater, n)) continue;
      const result = P.lunarCraterRelief(n[0], n[1], -90);
      expect(result?.name).toBe(crater[3]);
      expect(result.x).toBeCloseTo(x, 9); expect(result.y).toBeCloseTo(y, 9);
      expect(result.height).toBeCloseTo(height(x, y, 0.1), 10);
    }
  });

  it('does not shade outside the lunar disc or outside every named crater', () => {
    for (const [u, v] of [[NaN, 0], [0, Infinity], [1.001, 0], [0.9, 0.9], ['0', 0], [0, null]]) {
      expect(P.lunarCraterRelief(u, v, 0)).toBeNull();
    }
    for (const [lon, lat] of [[0, 0], [80, 0], [-80, 0], [0, 80], [0, -80]]) {
      const n = frame(lon, lat).center;
      expect(P.lunarCraterRelief(n[0], n[1], -90)).toBeNull();
    }
  });

  it('rejects points just outside isolated crater rims', () => {
    for (const name of ['Tycho', 'Copernicus', 'Grimaldi', 'Theophilus', 'Petavius']) {
      const crater = CRATERS.find(c => c[3] === name);
      for (const [x, y] of [[1.01, 0], [-1.01, 0], [0, 1.01], [0, -1.01]]) {
        const n = craterPoint(crater, x, y);
        expect(P.lunarCraterRelief(n[0], n[1], -90), `${name}: ${x},${y}`).toBeNull();
      }
    }
  });

  it('assigns the shared Clavius and Maginus area to the later painted crater', () => {
    const maginus = CRATERS.find(c => c[3] === 'Maginus'), clavius = CRATERS.find(c => c[3] === 'Clavius');
    const n = craterPoint(maginus, -0.75, 0.1);
    expect(dot(n, frame(clavius[0], clavius[1]).center)).toBeGreaterThan(Math.cos(clavius[2] / 2 / 1737));
    const result = P.lunarCraterRelief(n[0], n[1], -90);
    expect(result.name).toBe('Maginus');
    expect(result.x).toBeCloseTo(-0.75, 9); expect(result.y).toBeCloseTo(0.1, 9);
  });

  it('uses the atlas equatorial Sun in each crater tangent frame', () => {
    for (const crater of CRATERS) for (const term of [-120, -35, 12.673, 100]) {
      const basis = frame(crater[0], crater[1]), worldSun = [Math.sin((term + 90) * D), 0, Math.cos((term + 90) * D)];
      const direction = [dot(worldSun, basis.east), dot(worldSun, basis.north), dot(worldSun, basis.center)];
      for (const [x, y] of [[0, 0], [0.8, -0.2], [-0.7, 0.3]]) {
        const n = craterPoint(crater, x, y);
        if (overlapsAnotherCrater(crater, n)) continue;
        const result = P.lunarCraterRelief(n[0], n[1], term);
        const expected = oracle(x, y, direction, 0.1);
        if (dot(n, worldSun) <= 0) { expected.shadow = true; expected.incidence = 0; }
        expect(result.shadow).toBe(expected.shadow);
        expect(result.incidence).toBeCloseTo(expected.incidence, 8);
        expect(result.baseIncidence).toBeCloseTo(dot(n, worldSun), 11);
      }
    }
  });

  it('uses the existing Apollo 11 landing-day terminator when omitted', () => {
    const crater = CRATERS.find(c => c[3] === 'Theophilus'), n = craterPoint(crater, -0.2, 0.3);
    expect(P.lunarCraterRelief(n[0], n[1])).toEqual(P.lunarCraterRelief(n[0], n[1], 23.473 - 10.8));
  });

  it('repeats its lighting after a full solar rotation', () => {
    for (const crater of CRATERS) {
      const n = craterPoint(crater, -0.75, 0.15), a = P.lunarCraterRelief(n[0], n[1], -35);
      for (const term of [-395, 325, 685]) {
        const b = P.lunarCraterRelief(n[0], n[1], term);
        expect(b.incidence).toBeCloseTo(a.incidence, 11); expect(b.baseIncidence).toBeCloseTo(a.baseIncidence, 11);
        expect(b.shadow).toBe(a.shadow); expect(b.illuminated).toBe(a.illuminated);
      }
    }
  });

  it('shadows part of Theophilus under the landing-day Sun while preserving its lit wall', () => {
    const crater = CRATERS.find(c => c[3] === 'Theophilus');
    const west = craterPoint(crater, -0.85, 0), east = craterPoint(crater, 0.8, 0);
    const a = P.lunarCraterRelief(west[0], west[1]), b = P.lunarCraterRelief(east[0], east[1]);
    expect(a.illuminated).toBe(true); expect(a.incidence).toBeGreaterThan(a.baseIncidence);
    expect(b.shadow).toBe(true); expect(b.incidence).toBe(0);
  });

  it('blocks a locally Sun-facing Grimaldi wall behind the planetary horizon', () => {
    const result = P.lunarCraterRelief(-0.9375, -0.10416666666666674, -70.25);
    expect(result?.name).toBe('Grimaldi'); expect(result.baseIncidence).toBeLessThan(0);
    expect(result.shadow).toBe(true); expect(result.incidence).toBe(0); expect(result.illuminated).toBe(false);
  });

  it('never lights named crater terrain on the global night side as the terminator moves', () => {
    let nightSamples = 0;
    for (const crater of CRATERS) for (let term = -180; term <= 180; term += 15) {
      const worldSun = [Math.sin((term + 90) * D), 0, Math.cos((term + 90) * D)];
      for (const [x, y] of [[0, 0], [0.85, 0], [-0.85, 0], [0, 0.85]]) {
        const n = craterPoint(crater, x, y);
        if (dot(n, worldSun) > -1e-10) continue;
        const result = P.lunarCraterRelief(n[0], n[1], term);
        expect(result).not.toBeNull(); expect(result.shadow).toBe(true);
        expect(result.incidence).toBe(0); expect(result.illuminated).toBe(false);
        nightSamples++;
      }
    }
    expect(nightSamples).toBeGreaterThan(500);
  });
});
