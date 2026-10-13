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

function frame(overrides = {}) {
  return { originX: 195, originY: 140, pictureScale: 1, ...overrides };
}
function finiteNumbers(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(finiteNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteNumbers);
}
function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}
function sharedFeatures(a, b) {
  const byId = new Map(b.features.map(feature => [feature.id, feature]));
  return a.features.filter(feature => byId.has(feature.id)).map(feature => [feature, byId.get(feature.id)]);
}
function expectAnchor(a, b) {
  expect(b.id).toBe(a.id);
  expect(b.level).toBe(a.level);
  expect(b.cellX).toBe(a.cellX);
  expect(b.cellY).toBe(a.cellY);
  expect(b.worldX).toBe(a.worldX);
  expect(b.worldY).toBe(a.worldY);
  expect(b.radiusMeters).toBe(a.radiusMeters);
  expect(b.kind).toBe(a.kind);
  expect(b.shade).toBe(a.shade);
}
function projectedFeature(feature, camera) {
  expect(feature.x).toBeCloseTo(camera.originX + feature.worldX * camera.pictureScale, 9);
  expect(feature.y).toBeCloseTo(camera.originY - feature.worldY * camera.pictureScale, 9);
  expect(feature.radiusPx).toBeCloseTo(feature.radiusMeters * camera.pictureScale, 10);
}
function canvasRecorder() {
  const calls = [], target = {};
  const ctx = new Proxy(target, {
    get: (object, key) => object[key] ?? ((...args) => {
      finiteNumbers(args);
      calls.push([key, ...args]);
    }),
    set: (object, key, value) => {
      finiteNumbers(value);
      object[key] = value;
      calls.push(['set', key, value]);
      return true;
    },
  });
  return { ctx, calls };
}

describe('world anchored lunar ascent terrain', () => {
  it('keeps the same signed world cells and physical anchors while the camera pans or resizes', () => {
    const baseCamera = frame(), base = P.ascentTerrainGeometry(390, 460, baseCamera);
    expect(base.view).toBe('world-terrain');
    expect(base.features.length).toBeGreaterThan(5);
    for (const [width, height, camera] of [
      [390, 460, frame({ originX: 206, originY: 151 })],
      [700, 560, frame({ originX: 240, originY: 170 })],
    ]) {
      const moved = P.ascentTerrainGeometry(width, height, camera), shared = sharedFeatures(base, moved);
      expect(shared.length).toBeGreaterThan(5);
      for (const [a, b] of shared) {
        expectAnchor(a, b);
        expect(b.alpha).toBe(a.alpha);
        projectedFeature(a, baseCamera);
        projectedFeature(b, camera);
        expect(b.x - a.x).toBeCloseTo(camera.originX - baseCamera.originX, 9);
        expect(b.y - a.y).toBeCloseTo(camera.originY - baseCamera.originY, 9);
      }
      expect(new Set(moved.features.map(feature => feature.id)).size).toBe(moved.features.length);
    }
  });

  it('projects shared features with one physical scale and preserves their metre radii across zoom', () => {
    const beforeCamera = frame(), afterCamera = frame({ pictureScale: 1.05 });
    const before = P.ascentTerrainGeometry(390, 460, beforeCamera);
    const after = P.ascentTerrainGeometry(390, 460, afterCamera), shared = sharedFeatures(before, after);
    expect(shared.length).toBeGreaterThan(5);
    for (const [a, b] of shared) {
      expectAnchor(a, b);
      projectedFeature(a, beforeCamera);
      projectedFeature(b, afterCamera);
      expect(b.radiusPx / a.radiusPx).toBeCloseTo(1.05, 12);
      expect((b.x - afterCamera.originX) / (a.x - beforeCamera.originX)).toBeCloseTo(1.05, 12);
      expect((b.y - afterCamera.originY) / (a.y - beforeCamera.originY)).toBeCloseTo(1.05, 12);
    }
    const close = P.ascentTerrainGeometry(390, 460, frame({ pictureScale: 2.4 }));
    expect(close.features.some(feature => feature.kind === 'rock')).toBe(true);
    expect(before.features.some(feature => feature.kind === 'mottle')).toBe(true);
    for (const feature of [...close.features, ...before.features]) {
      const metres = 4 * 4 ** feature.level;
      expect(feature.radiusMeters / metres).toBeGreaterThanOrEqual(0.055 - 1e-12);
      expect(feature.radiusMeters / metres).toBeLessThanOrEqual(0.105 + 1e-12);
      expect(feature.kind).toBe(feature.radiusMeters <= 2 ? 'rock' : 'mottle');
    }
  });

  it('shows exactly the same terrain at actual liftoff and four seconds when the camera is unchanged', () => {
    const profile = P.ascentProfile();
    for (const [width, height] of SIZES) {
      const launch = P.ascentSurfaceGeometry(width, height, P.ascentSample(profile, 0), profile);
      const rise = P.ascentSurfaceGeometry(width, height, P.ascentSample(profile, 4), profile);
      expect(rise.originX).toBe(launch.originX);
      expect(rise.originY).toBe(launch.originY);
      expect(rise.pictureScale).toBe(launch.pictureScale);
      const a = P.ascentTerrainGeometry(width, height, launch);
      const b = P.ascentTerrainGeometry(width, height, rise);
      expect(a.features.length).toBeGreaterThan(0);
      expect(b).toEqual(a);
    }
  });

  it('uses signed cell coordinates and keeps each feature within the central part of its world cell', () => {
    const g = P.ascentTerrainGeometry(1100, 460, frame({ originX: 550, originY: 110, pictureScale: 2.4 }));
    expect(g.features.some(feature => feature.cellX < 0)).toBe(true);
    expect(g.features.some(feature => feature.cellX >= 0)).toBe(true);
    expect(g.features.some(feature => feature.cellY < 0)).toBe(true);
    for (const feature of g.features) {
      expect(Number.isInteger(feature.level)).toBe(true);
      expect(Number.isInteger(feature.cellX)).toBe(true);
      expect(Number.isInteger(feature.cellY)).toBe(true);
      expect(feature.id).toBe([feature.level, feature.cellX, feature.cellY].join(':'));
      const metres = 4 * 4 ** feature.level;
      const cellOffsetX = feature.worldX / metres - feature.cellX;
      const cellOffsetY = feature.worldY / metres - feature.cellY;
      expect(cellOffsetX).toBeGreaterThanOrEqual(0.2 - 1e-12);
      expect(cellOffsetX).toBeLessThanOrEqual(0.8 + 1e-12);
      expect(cellOffsetY).toBeGreaterThanOrEqual(0.2 - 1e-12);
      expect(cellOffsetY).toBeLessThanOrEqual(0.8 + 1e-12);
    }
  });

  it('crossfades adjacent metre grids continuously with total opacity one through interior scales', () => {
    for (const scale of [0.00002, 0.0001, 0.001, 0.01, 0.05, 0.5, 1, 1.55, 2.5, 8, 20]) {
      const g = P.ascentTerrainGeometry(390, 460, frame({ pictureScale: scale }));
      expect(g.layers.length).toBeGreaterThan(0);
      expect(g.layers.reduce((sum, layer) => sum + layer.alpha, 0)).toBeCloseTo(1, 12);
      for (const layer of g.layers) {
        expect(layer.cellMetres).toBe(4 * 4 ** layer.level);
        expect(layer.spacing).toBeCloseTo(layer.cellMetres * scale, 10);
        expect(layer.spacing).toBeGreaterThanOrEqual(24 - 1e-10);
        expect(layer.spacing).toBeLessThanOrEqual(160 + 1e-10);
        expect(layer.alpha).toBeGreaterThanOrEqual(0);
        expect(layer.alpha).toBeLessThanOrEqual(1);
      }
    }
    // Check each transition from both directions, including where a layer
    // enters/leaves the returned set. A missing layer has zero opacity.
    for (const level of [1, 4, 8]) for (const boundary of [24, 40, 96, 160]) {
      const scale = boundary / (4 * 4 ** level), epsilon = 1e-7;
      const before = P.ascentTerrainGeometry(390, 460, frame({ pictureScale: scale * (1 - epsilon) }));
      const after = P.ascentTerrainGeometry(390, 460, frame({ pictureScale: scale * (1 + epsilon) }));
      const levels = new Set([...before.layers, ...after.layers].map(layer => layer.level));
      for (const id of levels) {
        const a = before.layers.find(layer => layer.level === id)?.alpha ?? 0;
        const b = after.layers.find(layer => layer.level === id)?.alpha ?? 0;
        expect(Math.abs(b - a)).toBeLessThan(0.00001);
      }
    }
  });

  it('bounds candidates and projects only nearby features inside the Moon at every observed ascent scale', () => {
    const profile = P.ascentProfile(), R = P.ascent.radius;
    for (const [width, height] of SIZES) for (const time of [0, 4, 15, 120, 300, profile.summary.duration]) {
      const camera = P.ascentSurfaceGeometry(width, height, P.ascentSample(profile, time), profile);
      const g = P.ascentTerrainGeometry(width, height, camera);
      finiteNumbers(g);
      expect(Number.isInteger(g.candidateCount)).toBe(true);
      expect(g.candidateCount).toBeGreaterThanOrEqual(g.features.length);
      expect(g.candidateCount).toBeLessThanOrEqual(6000);
      expect(new Set(g.features.map(feature => feature.id)).size).toBe(g.features.length);
      for (const feature of g.features) {
        projectedFeature(feature, camera);
        expect(Math.hypot(feature.worldX, feature.worldY + R)).toBeLessThanOrEqual(R + 1e-7);
        expect(feature.level).toBeGreaterThanOrEqual(0);
        expect(feature.level).toBeLessThanOrEqual(11);
        expect(feature.alpha).toBeGreaterThanOrEqual(0);
        expect(feature.alpha).toBeLessThanOrEqual(1);
        const margin = 4 * feature.radiusPx;
        expect(feature.x).toBeGreaterThanOrEqual(-margin - 1e-8);
        expect(feature.x).toBeLessThanOrEqual(width + margin + 1e-8);
        expect(feature.y).toBeGreaterThanOrEqual(54 - margin - 1e-8);
        expect(feature.y).toBeLessThanOrEqual(height - 55 + margin + 1e-8);
      }
    }
  });

  it('leaves frozen camera inputs unchanged and returns detached feature and layer records', () => {
    const camera = freezeDeep(frame({ surfacePoints: [{ x: 0, y: 140 }, { x: 390, y: 141 }],
      trail: [{ x: 40, y: 50 }], sample: { time: 4 } }));
    const original = JSON.stringify(camera), first = P.ascentTerrainGeometry(390, 460, camera);
    const expected = JSON.parse(JSON.stringify(first));
    expect(first.features.length).toBeGreaterThan(0);
    expect(first.layers.length).toBeGreaterThan(0);
    first.features[0].worldX += 999999;
    first.features[0].shade = 'changed by caller';
    first.layers[0].alpha = -1;
    first.features.push({ id: 'caller-only' });
    const next = P.ascentTerrainGeometry(390, 460, camera);
    expect(next).toEqual(expected);
    expect(JSON.stringify(camera)).toBe(original);
    expect(next.features).not.toBe(first.features);
    expect(next.layers).not.toBe(first.layers);
    expect(next.features[0]).not.toBe(first.features[0]);
    expect(next.layers[0]).not.toBe(first.layers[0]);
  });

  it('depends only on camera origin and scale while ignoring poisoned time, history and spacecraft state', () => {
    const camera = frame(), expected = P.ascentTerrainGeometry(390, 460, camera);
    const poisoned = frame();
    for (const key of ['time', 'sample', 'profile', 'samples', 'future', 'trail', 'surfacePoints',
      'craftX', 'craftY', 'artX', 'artY', 'pitch', 'altitude', 'engineOn', 'thrust']) {
      Object.defineProperty(poisoned, key, { get() { throw new Error('Terrain read unrelated ' + key); } });
    }
    expect(P.ascentTerrainGeometry(390, 460, poisoned)).toEqual(expected);
    expect(P.ascentTerrainGeometry(390, 460, { ...camera, time: 99999,
      profile: { samples: [{ time: -999, altitude: Infinity }, { time: 1e100, angle: NaN }] },
      sample: { time: NaN, altitude: Infinity }, craftX: Infinity })).toEqual(expected);
  });

  it('returns empty finite geometry for invalid dimensions or camera transforms', () => {
    const cases = [
      [0, 460, frame()], [-390, 460, frame()], [NaN, 460, frame()], [Infinity, 460, frame()],
      [390, 0, frame()], [390, -460, frame()], [390, NaN, frame()], [390, Infinity, frame()],
      [390, 460, null], [390, 460, undefined], [390, 460, {}],
      ...[0, -1, NaN, Infinity].map(pictureScale => [390, 460, frame({ pictureScale })]),
      ...[NaN, Infinity, -Infinity].flatMap(value => [
        [390, 460, frame({ originX: value })], [390, 460, frame({ originY: value })],
      ]),
    ];
    for (const [width, height, camera] of cases) {
      const g = P.ascentTerrainGeometry(width, height, camera);
      expect(g.view).toBe('world-terrain');
      expect(g.features).toEqual([]);
      expect(g.layers).toEqual([]);
      expect(g.candidateCount).toBe(0);
      finiteNumbers(g);
    }
  });

  it('draws through the sampled lunar limb clip with finite canvas commands and balanced state', () => {
    const profile = P.ascentProfile(), sample = P.ascentSample(profile, 4);
    const camera = freezeDeep(P.ascentSurfaceGeometry(390, 460, sample, profile));
    const expected = P.ascentTerrainGeometry(390, 460, camera), recorder = canvasRecorder();
    const result = P.drawAscentTerrain(recorder.ctx, 390, 460, camera);
    expect(result).toEqual(expected);
    expect(expected.features.length).toBeGreaterThan(0);
    const saves = recorder.calls.filter(call => call[0] === 'save').length;
    const restores = recorder.calls.filter(call => call[0] === 'restore').length;
    expect(saves).toBeGreaterThan(0);
    expect(restores).toBe(saves);
    expect(recorder.calls.some(call => call[0] === 'clip')).toBe(true);
    expect(recorder.calls).toContainEqual(['moveTo', camera.surfacePoints[0].x, camera.surfacePoints[0].y]);
    for (const point of camera.surfacePoints.slice(1)) {
      expect(recorder.calls).toContainEqual(['lineTo', point.x, point.y]);
    }
    expect(recorder.calls.some(call => call[0] === 'closePath')).toBe(true);
    const firstClip = recorder.calls.findIndex(call => call[0] === 'clip');
    const firstPaint = recorder.calls.findIndex(call => ['fill', 'stroke', 'fillRect', 'strokeRect'].includes(call[0]));
    expect(firstPaint).toBeGreaterThan(firstClip);
    finiteNumbers(result);
  });
});
