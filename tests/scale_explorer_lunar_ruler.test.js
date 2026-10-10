import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_LUNAR_RULER_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const marker = "  window.StemLab.registerTool('scaleExplorer', {";
if (!source.includes(marker)) throw new Error('Scale Explorer registration marker was not found');
const sandbox = {window: {StemLab: {registerTool() {}}}, console: {log() {}}};
vm.runInNewContext(source.replace(marker, '  window.lunarRulerChecks={start:lunarMeasureStart,arc:lunarArc,map:lunarArcMap,observations:readObservations};\n' + marker), sandbox);
const api = sandbox.window.lunarRulerChecks;
const RADIUS_KM = 1737.5;
const point = (longitude, latitude) => ({longitude, latitude});

function unitVector({longitude, latitude}) {
  const lon = longitude * Math.PI / 180;
  const lat = latitude * Math.PI / 180;
  return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
}

function angularDistance(a, b) {
  const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.atan2(Math.hypot(...cross), a.reduce((sum, value, index) => sum + value * b[index], 0));
}

function expectVector(actual, expected) {
  expect(actual).toHaveLength(3);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 11));
}

function expectSafeMap(paths) {
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    expect(path.length).toBeGreaterThan(1);
    path.forEach(({x, y}, index) => {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
      if (index) expect(Math.abs(x - path[index - 1].x)).toBeLessThanOrEqual(.5);
    });
  }
}

const routes = [
  ['coincident points', point(31.2, -24.7), point(31.2, -24.7)],
  ['equatorial quarter circle', point(0, 0), point(90, 0)],
  ['nearby points', point(0, 0), point(.1, .1)],
  ['oblique route', point(-11.2, -43.3), point(128.5, 36.7)],
  ['dateline crossing', point(179.9, 12), point(-179.9, 12)],
  ['north pole endpoint', point(38, -17), point(120, 90)],
  ['south pole endpoint', point(-73, 55), point(-160, -90)],
  ['north pole crossing', point(0, 80), point(-180, 80)],
  ['south pole crossing', point(0, -80), point(-180, -80)],
  ['equatorial antipodes', point(0, 0), point(-180, 0)],
  ['oblique antipodes', point(34.5, 23.4), point(-145.5, -23.4)],
  ['polar antipodes', point(0, 90), point(120, -90)]
];

describe('Scale Explorer lunar ruler origin', () => {
  it('requires both coordinates to be finite numbers and treats invalid origins as absent', () => {
    const invalid = [undefined, null, false, 0, '12', {}, [], [12, 34], {longitude: 12}, {latitude: 34}];
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '12', true, {}, [], new Number(12)]) {
      invalid.push({longitude: value, latitude: 34}, {longitude: 12, latitude: value});
    }
    invalid.push(Object.assign([], point(12, 34)));
    for (const value of invalid) expect(api.start(value)).toBeNull();
    expect(api.start(point(0, 0))).toEqual(point(0, 0));
  });

  it('wraps, clamps and rounds valid origins without retaining extra fields or mutating input', () => {
    const raw = Object.freeze({longitude: 541.24, latitude: -95, privateField: 'retain in caller'});
    const first = api.start(raw);
    const second = api.start(raw);
    expect(first).toEqual(point(-178.8, -90));
    expect(first).not.toBe(raw);
    expect(first).not.toBe(second);
    expect(api.start(point(-541.26, 12.345))).toEqual(point(178.7, 12.3));
    expect(raw).toEqual({longitude: 541.24, latitude: -95, privateField: 'retain in caller'});
  });
});

describe('Scale Explorer lunar great-circle distance', () => {
  it('measures zero, quarter and half circumference using the 1737.5 km lunar radius', () => {
    for (const [end, angle] of [[point(0, 0), 0], [point(90, 0), Math.PI / 2], [point(-180, 0), Math.PI]]) {
      const arc = api.arc(point(0, 0), end);
      expect(arc.angle).toBeCloseTo(angle, 12);
      expect(arc.distanceKm).toBeCloseTo(RADIUS_KM * angle, 8);
    }
  });

  it.each(routes)('has symmetric length for %s', (_label, start, end) => {
    const forward = api.arc(start, end);
    const reverse = api.arc(end, start);
    expect(forward.distanceKm).toBeCloseTo(reverse.distanceKm, 8);
    expect(forward.angle).toBeGreaterThanOrEqual(0);
    expect(forward.angle).toBeLessThanOrEqual(Math.PI);
  });

  it('takes the short route across the longitude seam', () => {
    const arc = api.arc(point(179, 0), point(-179, 0));
    expect(arc.angle).toBeCloseTo(2 * Math.PI / 180, 12);
    expect(arc.distanceKm).toBeCloseTo(RADIUS_KM * 2 * Math.PI / 180, 8);
    expectVector(arc.points[64], [-1, 0, 0]);
    expect(arc.ambiguous).toBe(false);
  });

  it.each(routes)('samples 129 finite unit vectors with closed endpoints and equal angular spacing for %s', (_label, start, end) => {
    const arc = api.arc(start, end);
    expect(arc.points).toHaveLength(129);
    expectVector(arc.points[0], unitVector(start));
    expectVector(arc.points[128], unitVector(end));
    arc.points.forEach((vector, index) => {
      expect(vector).toHaveLength(3);
      vector.forEach(value => expect(Number.isFinite(value)).toBe(true));
      expect(Math.hypot(...vector)).toBeCloseTo(1, 11);
      if (index) expect(angularDistance(arc.points[index - 1], vector)).toBeCloseTo(arc.angle / 128, 10);
    });
  });

  it('identifies antipodes and chooses a repeatable route without flagging nearby or coincident points', () => {
    for (const [start, end] of [[point(0, 0), point(-180, 0)], [point(34.5, 23.4), point(-145.5, -23.4)], [point(0, 90), point(120, -90)]]) {
      const arc = api.arc(start, end);
      expect(arc.ambiguous).toBe(true);
      expect(arc.points).toEqual(api.arc(start, end).points);
    }
    expectVector(api.arc(point(0, 0), point(-180, 0)).points[64], [0, 1, 0]);
    expect(api.arc(point(0, 0), point(179.9, 0)).ambiguous).toBe(false);
    expect(api.arc(point(10, 20), point(10, 20)).ambiguous).toBe(false);
  });

  it('normalizes fresh endpoints and leaves coordinates and arc data unchanged during map projection', () => {
    const start = Object.freeze({longitude: 541.24, latitude: 95, extra: 'start'});
    const end = Object.freeze({longitude: -541.26, latitude: -12.345, extra: 'end'});
    const arc = api.arc(start, end);
    expect(arc.start).toEqual(point(-178.8, 90));
    expect(arc.end).toEqual(point(178.7, -12.3));
    expect(arc.start).not.toBe(start);
    expect(arc.end).not.toBe(end);
    const before = JSON.stringify(arc);
    arc.points.forEach(Object.freeze);
    Object.freeze(arc.points);
    Object.freeze(arc.start);
    Object.freeze(arc.end);
    Object.freeze(arc);
    expectSafeMap(api.map(arc));
    expect(JSON.stringify(arc)).toBe(before);
    expect(start).toEqual({longitude: 541.24, latitude: 95, extra: 'start'});
    expect(end).toEqual({longitude: -541.26, latitude: -12.345, extra: 'end'});
  });
});

describe('Scale Explorer lunar ruler map', () => {
  it.each(routes)('keeps every segment inside the map without a long horizontal jump for %s', (_label, start, end) => {
    expectSafeMap(api.map(api.arc(start, end)));
  });

  it('splits dateline crossings at matching opposite map edges in both directions', () => {
    for (const [start, end, edge] of [[point(170, 0), point(-170, 0), 1], [point(-170, 0), point(170, 0), 0]]) {
      const paths = api.map(api.arc(start, end));
      expect(paths).toHaveLength(2);
      const exit = paths[0][paths[0].length - 1];
      const entry = paths[1][0];
      expect(exit.x).toBe(edge);
      expect(entry.x).toBe(1 - edge);
      expect(exit.y).toBeCloseTo(.5, 12);
      expect(entry.y).toBeCloseTo(exit.y, 12);
      expect(paths[0][0].x).toBeCloseTo((start.longitude + 180) / 360, 12);
      expect(paths[1][paths[1].length - 1].x).toBeCloseTo((end.longitude + 180) / 360, 12);
      expectSafeMap(paths);
    }
  });

  it('breaks the two meridians at each pole instead of drawing a line across the top or bottom', () => {
    for (const [latitude, poleY] of [[80, 0], [-80, 1]]) {
      const paths = api.map(api.arc(point(0, latitude), point(-180, latitude)));
      expect(paths).toHaveLength(2);
      const beforePole = paths[0][paths[0].length - 1];
      const afterPole = paths[1][0];
      expect(beforePole.y).toBeCloseTo(poleY, 10);
      expect(afterPole.y).toBeCloseTo(poleY, 10);
      expect(Math.abs(beforePole.x - afterPole.x)).toBeCloseTo(.5, 10);
      for (const path of paths) {
        for (let i = 1; i < path.length; i++) expect(Math.abs(path[i].x - path[i - 1].x)).toBeLessThan(1e-8);
      }
      expectSafeMap(paths);
    }
  });

  it('returns no map paths when no sampled arc is available', () => {
    for (const value of [undefined, null, {}, {points: null}, {points: []}]) expect(api.map(value)).toEqual([]);
  });
});

describe('Scale Explorer lunar ruler notebook restoration', () => {
  it('restores a sanitized ruler origin with fresh coordinates and preserves the saved destination', () => {
    const start = Object.freeze({longitude: 190.24, latitude: -100, extra: 'untrusted'});
    const destination = Object.freeze(point(63.2, -24.7));
    const saved = Object.freeze({itemId: 'moon', detailId: 'lunar-surface', lunarMeasureStart: start, lunarPoint: destination, lunarView: 'relief', note: 'Across the Moon'});
    const notes = api.observations(Object.freeze([saved]));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({itemId: 'moon', detailId: 'lunar-surface', lunarMeasureStart: point(-169.8, -90), lunarPoint: destination, lunarView: 'relief', note: 'Across the Moon'});
    expect(notes[0].lunarMeasureStart).not.toBe(start);
    expect(notes[0].lunarPoint).not.toBe(destination);
    expect(saved.lunarMeasureStart).toEqual({longitude: 190.24, latitude: -100, extra: 'untrusted'});
  });

  it('clears missing or invalid ruler origins without losing the lunar observation', () => {
    for (const origin of [undefined, null, {}, [], point('10', 20), point(10, NaN), point(Infinity, 20), {latitude: 20}]) {
      const notes = api.observations([{itemId: 'moon', detailId: 'tycho', lunarMeasureStart: origin, note: 'Keep this observation'}]);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({itemId: 'moon', detailId: 'tycho', lunarMeasureStart: null, note: 'Keep this observation'});
    }
    expect(api.observations([{itemId: 'moon', detailId: 'tycho'}])[0].lunarMeasureStart).toBeNull();
  });

  it('does not add a lunar ruler origin to non-Moon observations', () => {
    const notes = api.observations(['earth', 'jupiter', 'grand-canyon'].map(itemId => ({itemId, lunarMeasureStart: point(12, 34)})));
    expect(notes).toHaveLength(3);
    for (const note of notes) expect(note).not.toHaveProperty('lunarMeasureStart');
  });
});
