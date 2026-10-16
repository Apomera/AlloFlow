/** Surface rays, water reflection, and the launch camera's bounded Earth raster. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const RADIUS = 6371000;
const invalid = [undefined, null, NaN, Infinity, -Infinity, '1'];
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

const dot = (a, b) => a.reduce((sum, component, index) => sum + component * b[index], 0);
const unit = a => { const length = Math.hypot(...a); return a.map(value => value / length); };
const point = (h = 80000, d = 450000, w = 1014, height = 400, x = w / 2, y = height * 0.95) =>
  P.launchSurfacePoint(h, d, w, height, x, y);
const geometry = (h = 80000, d = 450000, w = 1014, height = 400) =>
  P.launchSurfaceGeometry(h, d, w, height);

// Solve in meters with a normalized ray. This uses the geometric distance to
// the sphere along the ray, independently of any unit-radius renderer formula.
function rayOracle(h, w, height, x, y) {
  const focal = height * Math.sqrt(3) / 2;
  const direction = unit([(x - w / 2) / focal, (height * 0.6 - y) / focal, 1]);
  const observer = RADIUS + h;
  const along = observer * direction[1];
  const determinant = along * along - (observer * observer - RADIUS * RADIUS);
  if (determinant < 0) return null;
  const near = -along - Math.sqrt(determinant);
  const far = -along + Math.sqrt(determinant);
  if (near <= 0) return null;
  const normal = [direction[0] * near / RADIUS, (observer + direction[1] * near) / RADIUS,
    direction[2] * near / RADIUS];
  return { near, far, normal, view: direction.map(value => -value) };
}

// A fixed world location is rotated into the observer's longitude before it
// enters the rectilinear camera. It should retain its coast classification.
function projectWorld(h, d, w, height, longitude, latitude) {
  const worldX = RADIUS * Math.cos(latitude) * Math.sin(longitude);
  const worldY = RADIUS * Math.cos(latitude) * Math.cos(longitude);
  const turn = d / RADIUS;
  const X = worldX * Math.cos(turn) - worldY * Math.sin(turn);
  const Y = worldX * Math.sin(turn) + worldY * Math.cos(turn);
  const Z = RADIUS * Math.sin(latitude);
  const focal = height * Math.sqrt(3) / 2;
  return { x: w / 2 + focal * X / Z, y: height * 0.6 + focal * (RADIUS + h - Y) / Z };
}

function nearVector(actual, expected, tolerance = 1e-9) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThan(tolerance));
}

function subpixelSamples(field, row, col) {
  const cellWidth = field.width / field.columns, cellHeight = (field.height - field.top) / field.rows;
  const left = col * cellWidth, top = field.top + row * cellHeight;
  return [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].map(([u, v]) =>
    P.launchSurfacePoint(field.altitude, field.downrange, field.width, field.height,
      left + u * cellWidth, top + v * cellHeight));
}

function averagedRgba(samples) {
  return Array.from(new Uint8ClampedArray([0, 1, 2].map(channel =>
    samples.reduce((sum, sample) => sum + sample.rgba[channel], 0) / samples.length).concat(255)));
}

describe('Launch surface rays', () => {
  it('rejects missing, nonnumeric and nonfinite camera and pixel inputs', () => {
    const args = [80000, 450000, 1014, 400, 507, 380];
    for (const value of invalid) {
      for (let index = 0; index < args.length; index++) {
        const values = [...args]; values[index] = value;
        expect(P.launchSurfacePoint(...values)).toBeNull();
        if (index < 4) expect(P.launchSurfaceGeometry(...values.slice(0, 4))).toBeNull();
      }
    }
    for (const [x, y] of [[-1, 380], [1015, 380], [507, -1], [507, 401]]) {
      expect(P.launchSurfacePoint(80000, 450000, 1014, 400, x, y)).toBeNull();
    }
  });

  it('bounds supported camera inputs before allocating a surface raster', () => {
    for (const h of [-1, 1000001, Number.MAX_VALUE]) expect(geometry(h)).toBeNull();
    for (const d of [-100000001, 100000001, Number.MAX_VALUE]) expect(geometry(80000, d)).toBeNull();
    for (const size of [0, -1, 8193, Number.MAX_VALUE]) {
      expect(geometry(80000, 0, size)).toBeNull();
      expect(geometry(80000, 0, 1014, size)).toBeNull();
    }
  });

  it('selects the near sphere intersection and reports its physical distance and normal', () => {
    for (const [h, w, height, x, y] of [
      [2000, 1014, 400, 50, 390], [20000, 310, 400, 155, 340],
      [80000, 1014, 400, 507, 360], [185000, 1014, 400, 300, 390],
      [400000, 640, 400, 320, 399],
    ]) {
      const expected = rayOracle(h, w, height, x, y), actual = point(h, 450000, w, height, x, y);
      expect(expected).not.toBeNull(); expect(actual).not.toBeNull();
      nearVector(actual.normal, expected.normal);
      nearVector(actual.view, expected.view);
      expect(Math.abs(actual.distance - expected.near)).toBeLessThan(1e-4);
      expect(actual.distance).toBeLessThan(expected.far);
      expect(Math.hypot(...actual.normal)).toBeCloseTo(1, 10);
      expect(actual.mu).toBeCloseTo(dot(actual.normal, actual.view), 10);
      expect(actual.mu).toBeGreaterThan(0);
    }
  });

  it('leaves sky transparent and resolves the visible side of the tangent', () => {
    expect(point(0)).toBeNull();
    for (const h of [2000, 80000, 185000, 400000]) {
      const w = 1014, height = 400, focal = height * Math.sqrt(3) / 2;
      const tangentY = height * 0.6 + focal * Math.tan(Math.acos(RADIUS / (RADIUS + h)));
      expect(point(h, 0, w, height, w / 2, tangentY - 0.001)).toBeNull();
      const below = point(h, 0, w, height, w / 2, tangentY + 0.001);
      expect(below).not.toBeNull();
      expect(below.mu).toBeGreaterThan(0);
      expect(below.mu).toBeLessThan(0.01);
      expect(point(h, 0, w, height, w / 2, height * 0.2)).toBeNull();
    }
  });

  it('round-trips screen rays through independent world coordinates and reprojection', () => {
    for (const d of [-1e8, -780000, 0, 450000, 1e8]) {
      for (const x of [380, 507, 634]) {
        const actual = point(80000, d, 1014, 400, x, 380);
        expect(actual).not.toBeNull();
        const expectedLongitude = Math.atan2(actual.normal[0], actual.normal[1]) + d / RADIUS;
        expect(actual.longitude).toBeCloseTo(expectedLongitude, 10);
        expect(actual.latitude).toBeCloseTo(Math.asin(actual.normal[2]), 10);
        expect(actual.east).toBeCloseTo(actual.longitude * RADIUS, 6);
        expect(actual.north).toBeCloseTo(actual.latitude * RADIUS, 6);
        const back = projectWorld(80000, d, 1014, 400, actual.longitude, actual.latitude);
        expect(Math.abs(back.x - x)).toBeLessThan(1e-6);
        expect(Math.abs(back.y - 380)).toBeLessThan(1e-6);
      }
    }
  });

  it('treats viewport width changes as a crop of the same surface and lighting', () => {
    for (const offset of [-100, 0, 100]) {
      const wide = point(80000, 450000, 1014, 400, 507 + offset, 380);
      const phone = point(80000, 450000, 310, 400, 155 + offset, 380);
      expect(phone).toEqual(wide);
    }
  });

  it('preserves surface intersections and reflection when the camera scales with height', () => {
    const base = point(80000, 450000, 640, 400, 400, 380);
    for (const scale of [0.5, 1.5, 2, 3]) {
      const scaled = point(80000, 450000, 640 * scale, 400 * scale, 400 * scale, 380 * scale);
      nearVector(scaled.normal, base.normal);
      nearVector(scaled.view, base.view);
      expect(scaled.landFraction).toBeCloseTo(base.landFraction, 10);
      expect(scaled.glint).toBeCloseTo(base.glint, 10);
      expect(scaled.rgba).toEqual(base.rgba);
    }
  });

  it('keeps a fixed world location and coastline stable as the observer moves downrange', () => {
    for (const d of [-250000, 0, 450000]) {
      const first = point(80000, d, 1014, 400, 507, 380);
      for (const travel of [-10000, 10000]) {
        const screen = projectWorld(80000, d + travel, 1014, 400, first.longitude, first.latitude);
        const moved = point(80000, d + travel, 1014, 400, screen.x, screen.y);
        expect(moved).not.toBeNull();
        expect(moved.longitude).toBeCloseTo(first.longitude, 10);
        expect(moved.latitude).toBeCloseTo(first.latitude, 10);
        expect(moved.landFraction).toBeCloseTo(first.landFraction, 8);
        expect(Math.abs(screen.x - 507)).toBeGreaterThan(1);
      }
    }
  });
});

describe('Launch water reflection', () => {
  it('uses the normalized displayed Sun direction at all altitudes and viewport widths', () => {
    const expected = unit([0.2, 0.47, Math.sqrt(3) / 2]);
    for (const [h, w] of [[2000, 310], [80000, 1014], [185000, 640]]) {
      const sample = point(h, 0, w, 400);
      nearVector(sample.sun, expected);
    }
  });

  it('rejects malformed vectors and zero-length reflection directions', () => {
    const valid = [0, 1, 0];
    for (const bad of [...invalid, [], [1, 0], [0, 0, 0], [1, NaN, 0], [0, Infinity, 1], ['1', 0, 0]]) {
      expect(P.launchWaterReflection(bad, valid, valid)).toBeNull();
      expect(P.launchWaterReflection(valid, bad, valid)).toBeNull();
      expect(P.launchWaterReflection(valid, valid, bad)).toBeNull();
    }
  });

  it('normalizes reflection vectors and peaks at the specular half-angle', () => {
    const view = unit([0, 1, -1]), sun = unit([0, 1, 1]), normal = [0, 1, 0];
    const peak = P.launchWaterReflection(normal, view, sun);
    const offset = P.launchWaterReflection(unit([0.4, 1, 0]), view, sun);
    expect(peak.halfCosine).toBeCloseTo(1, 12);
    expect(peak.sunCosine).toBeCloseTo(Math.SQRT1_2, 12);
    expect(peak.viewCosine).toBeCloseTo(Math.SQRT1_2, 12);
    expect(peak.strength).toBeGreaterThan(0);
    expect(peak.strength).toBeGreaterThan(offset.strength);
    const scaled = P.launchWaterReflection(normal.map(v => v * 3), view.map(v => v * 7), sun.map(v => v * 0.2));
    for (const key of Object.keys(peak)) expect(scaled[key]).toBeCloseTo(peak[key], 12);
  });

  it('suppresses reflection on the unlit and invisible sides and increases Fresnel reflectance at grazing angles', () => {
    const normal = [0, 1, 0];
    expect(P.launchWaterReflection(normal, [0, -1, 1], [0, 1, 1]).strength).toBe(0);
    expect(P.launchWaterReflection(normal, [0, 1, -1], [0, -1, 1]).strength).toBe(0);
    const headOn = P.launchWaterReflection(normal, normal, normal);
    const grazing = P.launchWaterReflection(normal, [1, 0.1, 0], [-1, 0.1, 0]);
    expect(grazing.fresnel).toBeGreaterThan(headOn.fresnel);
    for (const result of [headOn, grazing]) {
      expect(Object.values(result).every(Number.isFinite)).toBe(true);
      expect(result.strength).toBeGreaterThanOrEqual(0); expect(result.strength).toBeLessThanOrEqual(1);
      expect(result.fresnel).toBeGreaterThanOrEqual(0); expect(result.fresnel).toBeLessThanOrEqual(1);
    }
  });

  it('matches the Schlick water-interface approximation and is reciprocal for sun and viewer', () => {
    const normal = [0, 1, 0], normalReflectance = 0.0204;
    for (const degrees of [0, 30, 60, 80]) {
      const angle = degrees * Math.PI / 180;
      const view = [Math.sin(angle), Math.cos(angle), 0];
      const sun = [-Math.sin(angle), Math.cos(angle), 0];
      const reflected = P.launchWaterReflection(normal, view, sun);
      const expectedFresnel = normalReflectance + (1 - normalReflectance) * (1 - Math.cos(angle)) ** 5;
      expect(reflected.fresnel).toBeCloseTo(expectedFresnel, 12);
      expect(reflected.halfCosine).toBeCloseTo(1, 12);
      expect(P.launchWaterReflection(normal, sun, view).strength).toBeCloseTo(reflected.strength, 12);
    }
    const view = unit([0.2, 1, -0.9]), sun = unit([-0.1, 0.8, 0.4]);
    const forward = P.launchWaterReflection(normal, view, sun), reverse = P.launchWaterReflection(normal, sun, view);
    expect(forward.strength).toBeCloseTo(reverse.strength, 12);
    expect(forward.fresnel).toBeCloseTo(reverse.fresnel, 12);
    expect(forward.sunCosine).toBeCloseTo(reverse.viewCosine, 12);
    expect(forward.viewCosine).toBeCloseTo(reverse.sunCosine, 12);
  });
});

describe('Launch surface raster', () => {
  it('covers the previous ground at 1.6 km while the shoreline finishes its gradual handoff at 6 km', () => {
    for (const h of [0, 500, 1499, 1500]) {
      const field = geometry(h);
      expect(field.opacity).toBe(0); expect(field.pixels.length).toBe(0);
      expect(field.coastBlend).toBe(0);
    }
    const justAbove = geometry(1500.001), fading = geometry(1550), covered = geometry(1600);
    expect(justAbove.opacity).toBeGreaterThan(0); expect(justAbove.opacity).toBeLessThan(1e-8);
    expect(fading.opacity).toBeCloseTo(0.5, 12); expect(covered.opacity).toBe(1);
    const middle = geometry(3750), full = geometry(6000), ghostCoastRegression = geometry(5000);
    expect(middle.coastBlend).toBeCloseTo(0.5, 12); expect(point(3750).coastBlend).toBeCloseTo(0.5, 12);
    expect(full.coastBlend).toBe(1); expect(point(6000).coastBlend).toBe(1);
    expect(full.opacity).toBe(1); expect(geometry(185000).opacity).toBe(1);
    expect(ghostCoastRegression.opacity).toBe(1);
    expect(ghostCoastRegression.coastBlend).toBeLessThan(1);
    expect(ghostCoastRegression.landPixels + ghostCoastRegression.waterPixels).toBeGreaterThan(0);
    for (let index = 3; index < ghostCoastRegression.pixels.length; index += 4) {
      expect([0, 255]).toContain(ghostCoastRegression.pixels[index]);
    }
  });

  it('moves the visible coastline continuously through the handoff without a material jump', () => {
    for (const h of [3750, 6000]) {
      const width = 1014, height = 400, y = 380;
      let bracket = null, lastX = 0, last = point(h, 0, width, height, lastX, y);
      for (let x = 8; x <= 1008; x += 8) {
        const current = point(h, 0, width, height, x, y);
        if (last.landFraction >= 0.5 && current.landFraction < 0.5) bracket = [lastX, x];
        last = current; lastX = x;
      }
      expect(bracket).not.toBeNull();
      let [left, right] = bracket;
      for (let step = 0; step < 40; step++) {
        const x = (left + right) / 2;
        if (point(h, 0, width, height, x, y).landFraction >= 0.5) left = x; else right = x;
      }
      const boundaryX = (left + right) / 2, boundary = point(h, 0, width, height, boundaryX, y);
      const before = point(h - 0.01, 0, width, height, boundaryX, y);
      const after = point(h + 0.01, 0, width, height, boundaryX, y);
      expect(boundary.landFraction).toBeCloseTo(0.5, 8);
      expect(Math.abs(after.landFraction - before.landFraction)).toBeLessThan(0.01);
      expect(Math.abs(after.coastBlend - before.coastBlend)).toBeLessThan(0.00001);
      expect(Math.abs(after.glint - before.glint)).toBeLessThan(0.01);
    }
  });

  it('caps raster storage at 400 by 140 pixels for extreme supported viewports', () => {
    for (const [h, d, w, height] of [[80000, 450000, 1014, 400], [185000, -1e8, 8192, 8192],
      [1e6, 1e8, 8192, 8192], [2000, 0, 1, 8192], [80000, 0, 8192, 1]]) {
      const field = geometry(h, d, w, height);
      expect(field).not.toBeNull();
      expect(field).toMatchObject({ altitude: h, downrange: d, width: w, height });
      expect(Number.isInteger(field.columns)).toBe(true); expect(Number.isInteger(field.rows)).toBe(true);
      expect(field.columns).toBeGreaterThanOrEqual(0); expect(field.columns).toBeLessThanOrEqual(400);
      expect(field.rows).toBeGreaterThanOrEqual(0); expect(field.rows).toBeLessThanOrEqual(140);
      expect(field.pixels).toBeInstanceOf(Uint8ClampedArray);
      expect(field.pixels.length).toBe(field.columns * field.rows * 4);
      expect(field.pixels.byteLength).toBeLessThanOrEqual(224000);
      expect(field.antialiasedPixels).toBeInstanceOf(Uint8Array);
      expect(field.antialiasedPixels.length).toBe(field.columns * field.rows);
      expect(field.antialiasedPixels.byteLength).toBeLessThanOrEqual(56000);
      expect(Number.isFinite(field.top)).toBe(true);
      expect(field.top).toBeGreaterThanOrEqual(0); expect(field.top).toBeLessThanOrEqual(height);
    }
  });

  it('samples interiors at cell centers, averages flagged boundaries, and leaves sky transparent', () => {
    let compared = 0, sky = 0, surface = 0;
    for (const [h, d] of [[2000, 0], [80000, 450000], [185000, 450000]]) {
      const field = geometry(h, d, 640, 400);
      for (let row = 0; row < field.rows; row += 5) {
        for (let col = 0; col < field.columns; col += 7) {
          const x = (col + 0.5) * field.width / field.columns;
          const y = field.top + (row + 0.5) * (field.height - field.top) / field.rows;
          const sample = P.launchSurfacePoint(h, d, 640, 400, x, y);
          const index = (row * field.columns + col) * 4;
          const rgba = Array.from(field.pixels.slice(index, index + 4));
          if (rayOracle(h, 640, 400, x, y)) {
            expect(sample).not.toBeNull();
            if (field.antialiasedPixels[row * field.columns + col]) {
              const samples = subpixelSamples(field, row, col);
              expect(samples.every(value => value !== null)).toBe(true);
              expect(rgba).toEqual(averagedRgba(samples));
            } else {
              expect(rgba).toEqual(Array.from(new Uint8ClampedArray(sample.rgba)));
            }
            expect(rgba[3]).toBe(255); surface++;
          } else {
            expect(sample).toBeNull(); expect(rgba[3]).toBe(0); sky++;
          }
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(100); expect(sky).toBeGreaterThan(0); expect(surface).toBeGreaterThan(100);
  });

  it('bounds boundary flags and blends mixed land-water cells without changing their opacity', () => {
    let flags = 0, mixedCells = 0, changedPixels = 0;
    for (const h of [2000, 20000, 80000]) {
      const field = geometry(h, 0, 1014, 400);
      expect(field.antialiasCount).toBeGreaterThanOrEqual(0);
      expect(field.antialiasCount).toBeLessThanOrEqual(field.columns * field.rows);
      expect(field.antialiasCount).toBe(field.antialiasedPixels.reduce((sum, flag) => sum + flag, 0));
      expect(field.antialiasedPixels.every(flag => flag === 0 || flag === 1)).toBe(true);
      for (let index = 0; index < field.antialiasedPixels.length; index++) {
        if (!field.antialiasedPixels[index]) continue;
        const row = Math.floor(index / field.columns), col = index % field.columns;
        const samples = subpixelSamples(field, row, col);
        expect(samples.every(value => value !== null)).toBe(true);
        const rgba = Array.from(field.pixels.slice(index * 4, index * 4 + 4));
        expect(rgba).toEqual(averagedRgba(samples));
        expect(rgba[3]).toBe(255);
        const center = P.launchSurfacePoint(h, 0, 1014, 400, (col + 0.5) * field.width / field.columns,
          field.top + (row + 0.5) * (field.height - field.top) / field.rows);
        if (rgba.some((value, channel) => value !== center.rgba[channel])) changedPixels++;
        if (samples.some(sample => sample.landFraction < 0.5) && samples.some(sample => sample.landFraction >= 0.5)) mixedCells++;
        flags++;
      }
    }
    expect(flags).toBeGreaterThan(0); expect(mixedCells).toBeGreaterThan(0); expect(changedPixels).toBeGreaterThan(0);
  });

  it('reports finite coast, ocean and glint diagnostics with bounded display colors', () => {
    let land = 0, water = 0;
    for (const d of [-250000, 0, 450000]) {
      const field = geometry(20000, d, 640, 400);
      expect(field.landPixels).toBeGreaterThanOrEqual(0); expect(field.waterPixels).toBeGreaterThanOrEqual(0);
      expect(field.landPixels + field.waterPixels).toBeLessThanOrEqual(field.columns * field.rows);
      expect(field.maxGlint).toBeGreaterThanOrEqual(0); expect(field.maxGlint).toBeLessThanOrEqual(1);
      land += field.landPixels; water += field.waterPixels;
      for (const x of [100, 320, 540]) {
        const sample = point(20000, d, 640, 400, x, 380);
        expect([sample.landFraction, sample.glint, ...sample.rgba].every(Number.isFinite)).toBe(true);
        expect(sample.landFraction).toBeGreaterThanOrEqual(0); expect(sample.landFraction).toBeLessThanOrEqual(1);
        expect(sample.glint).toBeGreaterThanOrEqual(0); expect(sample.glint).toBeLessThanOrEqual(1);
        sample.rgba.forEach(channel => { expect(channel).toBeGreaterThanOrEqual(0); expect(channel).toBeLessThanOrEqual(255); });
        expect(sample.rgba[3]).toBe(255);
        if (sample.landFraction === 1) expect(sample.glint).toBe(0);
      }
    }
    expect(land).toBeGreaterThan(0); expect(water).toBeGreaterThan(0);
  });

  it('reproduces exact pixels after arbitrary seeks without sharing mutable buffers', () => {
    const first = geometry(), pixels = new Uint8ClampedArray(first.pixels);
    for (const [h, d] of [[185000, 2300000], [2000, 0], [80000, -900000]]) geometry(h, d);
    const again = geometry();
    expect(again).not.toBe(first); expect(again.pixels).not.toBe(first.pixels);
    expect(again.pixels).toEqual(pixels);
    expect(again.antialiasedPixels).not.toBe(first.antialiasedPixels);
    expect(again.antialiasedPixels).toEqual(first.antialiasedPixels);
    expect(again.antialiasCount).toBe(first.antialiasCount);
    expect(again.landPixels).toBe(first.landPixels); expect(again.waterPixels).toBe(first.waterPixels);
    expect(again.maxGlint).toBe(first.maxGlint);
    first.pixels.fill(0);
    expect(geometry().pixels).toEqual(pixels);
  });
});
