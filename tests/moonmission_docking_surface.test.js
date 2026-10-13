import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
const RADIUS = 1737400, ALTITUDE = 110000;
const DIMENSIONS = [[250, 280], [320, 320], [670, 360], [1100, 320]];

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

// Independent geometric intersection: project the sphere center onto the ray,
// then use the right triangle from the closest point to the near surface hit.
function geometricHit(W, H, x, y) {
  const focal = H * Math.sqrt(3) / 2, d = RADIUS + ALTITUDE;
  const v = [x - W / 2, focal, H / 2 - y], length = Math.hypot(...v);
  const u = v.map(value => value / length), closest = -d * u[2];
  const q = [closest * u[0], closest * u[1], d + closest * u[2]];
  const square = RADIUS * RADIUS - q.reduce((sum, value) => sum + value * value, 0);
  if (closest <= 0 || square < 0) return null;
  const range = closest - Math.sqrt(square);
  return { range, point: { x: range * u[0], y: range * u[1], z: d + range * u[2] } };
}

function normalAt(cross, along) {
  const latitude = cross / RADIUS, longitude = along / RADIUS;
  return { x: Math.sin(latitude), y: Math.cos(latitude) * Math.sin(longitude), z: Math.cos(latitude) * Math.cos(longitude) };
}

function project(normal, W, H) {
  const focal = H * Math.sqrt(3) / 2;
  return {
    x: W / 2 + focal * normal.x / normal.y,
    y: H / 2 - focal * (normal.z - (1 + ALTITUDE / RADIUS)) / normal.y,
  };
}

function expectSamePhysicalHit(a, b) {
  expect(a).not.toBeNull(); expect(b).not.toBeNull();
  expect(a.range).toBeCloseTo(b.range, 6);
  for (const key of ['x', 'y', 'z']) {
    expect(a.point[key]).toBeCloseTo(b.point[key], 6);
    expect(a.normal[key]).toBeCloseTo(b.normal[key], 12);
  }
}

describe('Moon Mission perspective docking surface', () => {
  it('intersects visible rays with the near lunar surface in metres', () => {
    for (const [W, H] of DIMENSIONS) {
      const g = P.dockingHorizonGeometry(W, H);
      for (const x of [W * 0.2, W / 2, W * 0.8]) {
        const edge = P.dockingHorizonAt(g, x);
        for (const y of [edge + 0.5, edge + H * 0.05, edge + H * 0.2]) {
          const actual = P.dockingSurfaceRay(g, x, y), expected = geometricHit(W, H, x, y);
          expect(actual).not.toBeNull(); expect(expected).not.toBeNull();
          expect(actual.range).toBeCloseTo(expected.range, 5);
          expect(actual.range).toBeGreaterThan(ALTITUDE);
          for (const key of ['x', 'y', 'z']) expect(actual.point[key]).toBeCloseTo(expected.point[key], 5);
          expect(Math.hypot(...Object.values(actual.point))).toBeCloseTo(RADIUS, 6);
          expect(Math.hypot(...Object.values(actual.normal))).toBeCloseTo(1, 13);
          for (const key of ['x', 'y', 'z']) expect(actual.normal[key]).toBeCloseTo(actual.point[key] / RADIUS, 14);
          expect(project(actual.normal, W, H).x).toBeCloseTo(x, 9);
          expect(project(actual.normal, W, H).y).toBeCloseTo(y, 9);
        }
      }
    }
  });

  it('meets the unchanged geometric limb and rejects sky rays on either side', () => {
    for (const [W, H] of DIMENSIONS) {
      const g = P.dockingHorizonGeometry(W, H);
      for (const x of [-10, W * 0.173, W / 2, W * 0.827, W + 10]) {
        const y = P.dockingHorizonAt(g, x), tangent = P.dockingSurfaceRay(g, x, y);
        expect(tangent).not.toBeNull();
        expect(tangent.range).toBeCloseTo(Math.sqrt(ALTITUDE * (2 * RADIUS + ALTITUDE)), 1);
        const cameraToPoint = [tangent.point.x, tangent.point.y, tangent.point.z - RADIUS - ALTITUDE];
        const radialDotRay = cameraToPoint.reduce((sum, value, i) => sum + value * [tangent.normal.x, tangent.normal.y, tangent.normal.z][i], 0) / tangent.range;
        expect(Math.abs(radialDotRay)).toBeLessThan(1e-7);
        expect(P.dockingSurfaceRay(g, x, y - 0.001)).toBeNull();
        expect(P.dockingSurfaceRay(g, x, y + 0.001)).not.toBeNull();
      }
      expect(P.dockingSurfaceRay(g, W / 2, H / 2)).toBeNull();
      expect(P.dockingSurfaceRay(g, W / 2, 0)).toBeNull();
    }
  });

  it('anchors physical landmarks to the sphere across cropping and pixel density changes', () => {
    const base = P.dockingHorizonGeometry(320, 320), doubled = P.dockingHorizonGeometry(640, 640);
    const wide = P.dockingHorizonGeometry(1100, 320);
    for (const x of [90, 160, 230]) for (const y of [280, 300, 320]) {
      const hit = P.dockingSurfaceRay(base, x, y);
      expectSamePhysicalHit(hit, P.dockingSurfaceRay(doubled, x * 2, y * 2));
      expectSamePhysicalHit(hit, P.dockingSurfaceRay(wide, x + 390, y));
      expect(P.dockingSurfaceMaterial(hit.normal)).toEqual(P.dockingSurfaceMaterial(P.dockingSurfaceRay(doubled, x * 2, y * 2).normal));
    }
    for (const cross of [-20000, 0, 20000]) for (const along of [250000, 400000, 550000]) {
      const normal = normalAt(cross, along);
      for (const [W, H] of DIMENSIONS) {
        const screen = project(normal, W, H), hit = P.dockingSurfaceRay(P.dockingHorizonGeometry(W, H), screen.x, screen.y);
        expect(hit).not.toBeNull();
        for (const key of ['x', 'y', 'z']) expect(hit.normal[key]).toBeCloseTo(normal[key], 11);
      }
    }
  });

  it('foreshortens equal surface distances near the limb without a flat texture transform', () => {
    const W = 670, H = 360, g = P.dockingHorizonGeometry(W, H), step = 1000;
    function projectedStep(along) {
      const a = project(normalAt(0, along), W, H), b = project(normalAt(0, along + step), W, H);
      const first = P.dockingSurfaceRay(g, a.x, a.y), second = P.dockingSurfaceRay(g, b.x, b.y);
      expect(first).not.toBeNull(); expect(second).not.toBeNull();
      const chord = Math.hypot(first.point.x - second.point.x, first.point.y - second.point.y, first.point.z - second.point.z);
      expect(chord).toBeCloseTo(2 * RADIUS * Math.sin(step / (2 * RADIUS)), 5);
      return Math.hypot(a.x - b.x, a.y - b.y);
    }
    expect(projectedStep(570000)).toBeLessThan(projectedStep(350000) * 0.15);
  });

  it('rejects malformed camera geometry and nonfinite or degenerate surface inputs', () => {
    const g = P.dockingHorizonGeometry(320, 320);
    const bad = [undefined, null, false, true, '', '320', {}, [], NaN, Infinity, -Infinity];
    for (const value of bad) {
      expect(P.dockingSurfaceRay(value, 160, 320)).toBeNull();
      expect(P.dockingSurfaceRay(g, value, 320)).toBeNull();
      expect(P.dockingSurfaceRay(g, 160, value)).toBeNull();
      expect(P.dockingSurfaceMaterial(value)).toBeNull();
    }
    for (const field of ['width', 'height', 'centerX', 'eyeY', 'focal', 'radius', 'altitude']) {
      for (const value of [NaN, Infinity, undefined, '320']) expect(P.dockingSurfaceRay({ ...g, [field]: value }, 160, 320)).toBeNull();
    }
    for (const field of ['width', 'height', 'focal', 'radius', 'altitude']) {
      for (const value of [0, -1]) expect(P.dockingSurfaceRay({ ...g, [field]: value }, 160, 320)).toBeNull();
    }
    for (const field of ['x', 'y', 'z']) for (const value of bad) expect(P.dockingSurfaceMaterial({ x: 0, y: 0, z: 1, [field]: value })).toBeNull();
    expect(P.dockingSurfaceMaterial({ x: 0, y: 0, z: 0 })).toBeNull();
    expect(P.dockingSurfaceMaterial({ x: Number.MAX_VALUE, y: Number.MAX_VALUE, z: 0 })).toBeNull();
    expect(P.dockingSurfaceRay({ ...g, altitude: Number.MAX_VALUE }, 160, 320)).toBeNull();
  });

  it('keeps finite neutral crater albedo deterministic without changing normals or camera data', () => {
    const g = Object.freeze(P.dockingHorizonGeometry(670, 360)), before = JSON.stringify(g);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('surface material must be seeded'); });
    const colors = new Set();
    for (let row = 0; row < 12; row++) for (let column = 0; column < 13; column++) {
      const normal = Object.freeze(normalAt((column - 6) * 20000, 280000 + row * 20000));
      const first = P.dockingSurfaceMaterial(normal), second = P.dockingSurfaceMaterial(normal);
      expect(first).toEqual(second);
      expect(first).not.toBe(second); expect(first.rgb).not.toBe(second.rgb);
      expect(first.albedo).toBeGreaterThanOrEqual(0.30); expect(first.albedo).toBeLessThanOrEqual(0.70);
      expect(first.brightness).toBeGreaterThan(0); expect(first.brightness).toBeLessThan(1);
      expect(first.rgb[0]).toBe(first.rgb[1]); expect(first.rgb[1]).toBe(first.rgb[2]);
      expect(first.rgb.every(value => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
      expect(first.rgb[0]).toBe(Math.round(first.brightness * 255));
      colors.add(first.rgb[0]);
    }
    expect(colors.size).toBeGreaterThan(12);
    expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify(g)).toBe(before);
    const hit = P.dockingSurfaceRay(g, 335, 360), original = JSON.stringify(hit);
    P.dockingSurfaceMaterial(Object.freeze(hit.normal));
    expect(JSON.stringify(hit)).toBe(original);
  });

  it('keeps the existing small caption readable over every permitted surface tone', () => {
    // Independent WCAG sRGB luminance: the unchanged overview caption is
    // #cbd5e1. The material contract bounds its brightest grayscale tone at 85.
    function luminance(rgb) {
      const linear = rgb.map(channel => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    }
    const caption = luminance([203, 213, 225]);
    const contrast = rgb => (caption + 0.05) / (luminance(rgb) + 0.05);
    expect(contrast([85, 85, 85])).toBeGreaterThanOrEqual(4.5);
    for (let latitude = -90; latitude <= 90; latitude += 5) {
      for (let longitude = -180; longitude <= 180; longitude += 10) {
        const material = P.dockingSurfaceMaterial(normalAt(latitude * Math.PI / 180 * RADIUS, longitude * Math.PI / 180 * RADIUS));
        expect(material.rgb.every(channel => channel >= 0 && channel <= 85)).toBe(true);
        expect(contrast(material.rgb)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('carries crater markings continuously across cell boundaries and the longitude seam', () => {
    for (const spacing of [48000, 170000]) {
      const circumference = 2 * Math.PI * RADIUS, cell = circumference / Math.round(circumference / spacing);
      for (const multiplier of [-5, -1, 0, 1, 5]) {
        for (const other of [-230000, 390000, 570000]) {
          const left = P.dockingSurfaceMaterial(normalAt(multiplier * cell - 0.01, other));
          const right = P.dockingSurfaceMaterial(normalAt(multiplier * cell + 0.01, other));
          const before = P.dockingSurfaceMaterial(normalAt(other, multiplier * cell - 0.01));
          const after = P.dockingSurfaceMaterial(normalAt(other, multiplier * cell + 0.01));
          expect(Math.abs(left.albedo - right.albedo)).toBeLessThan(0.00001);
          expect(Math.abs(before.albedo - after.albedo)).toBeLessThan(0.00001);
        }
      }
    }
    for (const cross of [-550000, -20000, 0, 170000]) {
      const left = P.dockingSurfaceMaterial(normalAt(cross, -Math.PI * RADIUS + 0.01));
      const right = P.dockingSurfaceMaterial(normalAt(cross, Math.PI * RADIUS - 0.01));
      expect(Math.abs(left.albedo - right.albedo)).toBeLessThan(0.00001);
    }
    for (const sign of [-1, 1]) {
      const pole = P.dockingSurfaceMaterial({ x: sign, y: 0, z: 0 });
      for (const along of [-5000000, 0, 5000000]) {
        const near = P.dockingSurfaceMaterial(normalAt(sign * (Math.PI / 2 * RADIUS - 0.01), along));
        expect(Math.abs(near.albedo - pole.albedo)).toBeLessThan(0.00001);
      }
    }
  });
});


function surfaceRecorder() {
  const calls = [], paths = [];
  let currentPath = [];
  const gradient = () => ({ addColorStop() {} });
  const context = new Proxy({}, {
    get: (target, key) => key === 'createLinearGradient' ? gradient : target[key] || ((...args) => {
      calls.push([key, ...args]);
      if (key === 'beginPath') currentPath = [];
      if (['moveTo', 'lineTo', 'rect', 'closePath'].includes(key)) currentPath.push([key, ...args]);
      if (['fill', 'clip', 'stroke'].includes(key)) paths.push({ operation: key, path: currentPath.map(row => [...row]) });
    }),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return { context, calls, paths };
}

function rasterContext() {
  const images = [];
  const context = {
    createImageData: vi.fn((width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })),
    putImageData: vi.fn((image, x, y) => images.push({ ...image, x, y })),
  };
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context);
  return { context, images };
}

describe('Moon Mission bounded docking surface raster', () => {
  it('bounds raster dimensions, reuses one viewport and rebuilds after a viewport change', () => {
    const raster = rasterContext(), first = surfaceRecorder(), second = surfaceRecorder(), tall = surfaceRecorder(), returned = surfaceRecorder();
    P.drawDockingHorizon(first.context, 1100, 320);
    P.drawDockingHorizon(second.context, 1100, 320);
    expect(raster.images).toHaveLength(1);
    const firstSprite = first.calls.find(row => row[0] === 'drawImage')[1];
    expect(firstSprite.width).toBe(512); expect(firstSprite.height).toBe(149);
    expect(second.calls.find(row => row[0] === 'drawImage')[1]).toBe(firstSprite);
    expect(first.calls.find(row => row[0] === 'drawImage').slice(2)).toEqual([0, 0, 1100, 320]);
    P.drawDockingHorizon(tall.context, 320, 1000);
    expect(raster.images).toHaveLength(2);
    const tallSprite = tall.calls.find(row => row[0] === 'drawImage')[1];
    expect(tallSprite.width).toBe(123); expect(tallSprite.height).toBe(384);
    expect(tallSprite).not.toBe(firstSprite);
    P.drawDockingHorizon(returned.context, 1100, 320);
    expect(raster.images).toHaveLength(3);
    expect(returned.calls.find(row => row[0] === 'drawImage')[1]).not.toBe(firstSprite);
    for (const image of raster.images) {
      expect(image.width).toBeLessThanOrEqual(512); expect(image.height).toBeLessThanOrEqual(384);
      expect(image.data.length).toBe(image.width * image.height * 4);
      expect([image.x, image.y]).toEqual([0, 0]);
    }
  });

  it('samples pixel centres with transparent sky and opaque neutral material on physical hits', () => {
    const raster = rasterContext(), draw = surfaceRecorder(), W = 64, H = 64;
    P.drawDockingHorizon(draw.context, W, H);
    expect(raster.images).toHaveLength(1);
    const image = raster.images[0], geometry = P.dockingHorizonGeometry(W, H);
    let sky = 0, ground = 0;
    for (let row = 0; row < H; row++) for (let column = 0; column < W; column++) {
      const offset = (row * W + column) * 4, hit = P.dockingSurfaceRay(geometry, column + 0.5, row + 0.5);
      const pixel = Array.from(image.data.slice(offset, offset + 4));
      if (hit) { expect(pixel).toEqual([...P.dockingSurfaceMaterial(hit.normal).rgb, 255]); ground++; }
      else { expect(pixel).toEqual([0, 0, 0, 0]); sky++; }
    }
    expect(ground).toBeGreaterThan(250); expect(sky).toBeGreaterThan(250);
  });

  it('clips the projected image to the original filled lunar silhouette and preserves its outline', () => {
    rasterContext();
    const draw = surfaceRecorder(), geometry = P.drawDockingHorizon(draw.context, 320, 320);
    expect(geometry).toEqual(P.dockingHorizonGeometry(320, 320));
    const fill = draw.paths.find(item => item.operation === 'fill');
    const clips = draw.paths.filter(item => item.operation === 'clip');
    expect(clips).toHaveLength(2);
    expect(clips[0].path).toEqual([['rect', 0, 0, 320, 320]]);
    expect(clips[1].path).toEqual(fill.path);
    const outline = draw.paths.find(item => item.operation === 'stroke');
    expect(outline.path).toEqual(geometry.points.map((point, index) => [index ? 'lineTo' : 'moveTo', point.x, point.y]));
    expect(draw.calls.filter(row => row[0] === 'save')).toHaveLength(2);
    expect(draw.calls.filter(row => row[0] === 'restore')).toHaveLength(2);
    const imageIndex = draw.calls.findIndex(row => row[0] === 'drawImage');
    const fillIndex = draw.calls.findIndex(row => row[0] === 'fill');
    const strokeIndex = draw.calls.findIndex(row => row[0] === 'stroke');
    expect(imageIndex).toBeGreaterThan(fillIndex); expect(imageIndex).toBeLessThan(strokeIndex);
  });

  it('retains the existing gradient and geometry when image allocation or drawing is unavailable', () => {
    for (const [index, context] of [null, {}, { createImageData: () => null }, { createImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData() {} }, { createImageData: () => { throw new Error('allocation unavailable'); } }].entries()) {
      vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context);
      const draw = surfaceRecorder(), W = 80 + index;
      expect(P.drawDockingHorizon(draw.context, W, 100)).toEqual(P.dockingHorizonGeometry(W, 100));
      expect(draw.calls.some(row => row[0] === 'drawImage')).toBe(false);
      expect(draw.paths.filter(item => item.operation === 'fill')).toHaveLength(1);
      expect(draw.paths.filter(item => item.operation === 'stroke')).toHaveLength(1);
      expect(draw.paths.filter(item => item.operation === 'clip')).toHaveLength(1);
      expect(draw.calls.filter(row => row[0] === 'save')).toHaveLength(1);
      expect(draw.calls.filter(row => row[0] === 'restore')).toHaveLength(1);
    }
  });

  it('memoizes an unavailable raster for that viewport and retries only after resizing', () => {
    const getContext = vi.mocked(HTMLCanvasElement.prototype.getContext);
    const before = getContext.mock.calls.length;
    P.drawDockingHorizon(surfaceRecorder().context, 80, 100);
    expect(getContext.mock.calls.length).toBe(before + 1);
    P.drawDockingHorizon(surfaceRecorder().context, 80, 100);
    expect(getContext.mock.calls.length).toBe(before + 1);
    const raster = rasterContext(), unchanged = surfaceRecorder(), resized = surfaceRecorder();
    P.drawDockingHorizon(unchanged.context, 80, 100);
    expect(raster.images).toHaveLength(0);
    expect(unchanged.calls.some(row => row[0] === 'drawImage')).toBe(false);
    P.drawDockingHorizon(resized.context, 81, 100);
    expect(raster.images).toHaveLength(1);
    expect(resized.calls.some(row => row[0] === 'drawImage')).toBe(true);
  });
});
