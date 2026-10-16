/** Geometry and Canvas contracts for the schematic Saturn V structural details. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

const copy = value => JSON.parse(JSON.stringify(value));
const section = (id = 's4bis', w0 = 20, w1 = 32) => ({ id, y0: 30, y1: 90, w0, w1 });
const geometry = sections => ({ k: 2, nozzle: 100, sections: sections || [section()] });
const pointsOf = detail => [...detail.outline, ...detail.lines.flatMap(line => line.points), ...detail.panels.flatMap(panel => panel.points)];
function nearPoint(actual, expected, digits = 10) {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

// This records Canvas paint-time state, including the clip inherited from the
// caller. Paths remain outside the save/restore stack, as on a native canvas.
function recorder(alpha = 0.37) {
  let state = { globalAlpha: alpha, fillStyle: '#123456', strokeStyle: '#654321', lineWidth: 2.3,
    lineCap: 'square', lineJoin: 'bevel', transform: [1, 0, 0, 1, 12, 7], clips: ['caller-clip'] };
  let path = [], stack = [];
  const paints = [], clips = [], calls = [], gradients = [];
  const cloneState = () => ({ ...state, transform: [...state.transform], clips: [...state.clips] });
  const snapshot = cloneState();
  const grad = (...args) => { const g = { args, stops: [], addColorStop: (at, color) => g.stops.push([at, color]) }; gradients.push(g); return g; };
  const methods = {
    save() { stack.push(cloneState()); calls.push('save'); },
    restore() { state = stack.pop(); calls.push('restore'); },
    beginPath() { path = []; },
    moveTo(x, y) { path.push({ x, y }); },
    lineTo(x, y) { path.push({ x, y }); },
    closePath() {},
    clip() { const p = copy(path); state.clips.push(p); clips.push({ path: p, state: cloneState() }); },
    translate(x, y) { state.transform[4] += state.transform[0] * x + state.transform[2] * y; state.transform[5] += state.transform[1] * x + state.transform[3] * y; },
    fill() { paints.push({ kind: 'fill', path: copy(path), state: cloneState() }); },
    stroke() { paints.push({ kind: 'stroke', path: copy(path), state: cloneState() }); },
    fillRect(x, y, width, height) { paints.push({ kind: 'rect', x, y, width, height, state: cloneState() }); },
    fillText() {}, measureText: text => ({ width: String(text).length * 5 }),
    createLinearGradient: grad, createConicGradient: grad,
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key in methods ? methods[key] : state[key],
    set: (_, key, value) => { state[key] = value; return true; },
  });
  return { ctx, paints, clips, calls, gradients, snapshot, state: cloneState, depth: () => stack.length };
}

function stack(stage = 1, options = {}, height = 330) {
  return P.saturnV(recorder().ctx, 83, -12, height, stage, options);
}

describe('Saturn structural geometry', () => {
  it('rejects invalid dimensions, duplicate IDs and excessive input before generating details', () => {
    for (const input of [undefined, null, {}, { k: 1, sections: null }, { k: 1, sections: Array(11).fill(section()) }]) {
      expect(P.saturnHardwareGeometry(input)).toBeNull();
    }
    for (const k of [0, -1, 1001, NaN, Infinity, '2']) expect(P.saturnHardwareGeometry({ ...geometry(), k })).toBeNull();
    for (const key of ['y0', 'y1', 'w0', 'w1']) {
      for (const value of [NaN, Infinity, -Infinity, '2', 1000001]) {
        expect(P.saturnHardwareGeometry(geometry([{ ...section(), [key]: value }]))).toBeNull();
      }
    }
    for (const bad of [{ w0: 0 }, { w1: -1 }, { y1: 30 }, { y0: 91 }, { id: 'unknown' }]) {
      expect(P.saturnHardwareGeometry(geometry([{ ...section(), ...bad }]))).toBeNull();
    }
    expect(P.saturnHardwareGeometry(geometry([section(), section()]))).toBeNull();
    expect(P.saturnHardwareGeometry(geometry([{ ...section(), y0: 0, y1: 1e-320 }]))).toBeNull();
    expect(P.saturnHardwareGeometry(geometry([]))).toEqual({ scale: 2, sections: [] });
  });

  it('is deterministic, does not mutate frozen inputs and keeps detail counts bounded', () => {
    const input = deepFreeze(geometry(['s1', 's1is', 's2', 's4bis', 's4b', 'iu', 'sla', 'sm'].map(id => section(id))));
    const before = JSON.stringify(input), field = P.saturnHardwareGeometry(input);
    expect(P.saturnHardwareGeometry(input)).toEqual(field);
    expect(JSON.stringify(input)).toBe(before);
    expect(field.sections).toHaveLength(8);
    for (const detail of field.sections) {
      expect(detail.lines.length).toBeGreaterThan(0);
      expect(detail.lines.length).toBeLessThanOrEqual(100);
      expect(detail.panels.length).toBeLessThanOrEqual(8);
      pointsOf(detail).forEach(p => expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true));
    }
  });

  it('follows only retained stages and omits escape-tower and capsule overlays', () => {
    for (const [stageNumber, opts, ids] of [
      [1, {}, ['sm', 'sla', 'iu', 's4b', 's4bis', 's2', 's1is', 's1']],
      [2, {}, ['sm', 'sla', 'iu', 's4b', 's4bis', 's2']],
      [3, { les: false }, ['sm', 'sla', 'iu', 's4b']],
      [1, { only: ['s1is', 's1'] }, ['s1is', 's1']],
      [1, { only: ['les'] }, []],
    ]) {
      const g = stack(stageNumber, opts), detail = P.saturnHardwareGeometry(g);
      expect(detail.sections.map(s => s.id)).toEqual(ids);
      expect(g.hardware).toEqual(detail);
    }
  });

  it('projects equally spaced cylinder longitudes with limb foreshortening', () => {
    const detail = P.saturnHardwareGeometry(geometry([section('s1is', 20, 20)])).sections[0];
    const ribs = detail.lines.filter(line => line.kind === 'stringer-shadow');
    expect(ribs.length).toBeGreaterThan(8);
    const longitudes = ribs.map(line => Math.asin(line.points[0].x / 10));
    const step = longitudes[1] - longitudes[0];
    longitudes.slice(1).forEach((angle, index) => expect(angle - longitudes[index]).toBeCloseTo(step, 12));
    expect(longitudes[Math.floor(longitudes.length / 2)]).toBeCloseTo(0, 12);
    expect(longitudes[0]).toBeCloseTo(-longitudes.at(-1), 12);
    const gaps = ribs.slice(1).map((rib, index) => rib.points[0].x - ribs[index].points[0].x);
    expect(gaps[0]).toBeLessThan(gaps[Math.floor(gaps.length / 2)] * 0.55);
  });

  it('keeps rib longitudes and panel boundaries on the local tapered surface', () => {
    for (const source of [section('s4bis', 20, 32), section('sla', 12, 32), section('sm', 18, 18)]) {
      const detail = P.saturnHardwareGeometry(geometry([source])).sections[0];
      const halfAt = y => (source.w0 + (source.w1 - source.w0) * (y - source.y0) / (source.y1 - source.y0)) / 2;
      for (const item of [...detail.panels, ...detail.lines.filter(line => line.kind !== 'stringer-light')]) {
        item.points.forEach(p => {
          expect(p.y).toBeGreaterThanOrEqual(source.y0); expect(p.y).toBeLessThanOrEqual(source.y1);
          expect(Math.abs(p.x)).toBeLessThanOrEqual(halfAt(p.y) + 1e-12);
        });
      }
      for (const line of detail.lines.filter(line => line.u !== undefined && line.kind !== 'stringer-light')) {
        expect(line.points[0].x / halfAt(line.points[0].y)).toBeCloseTo(line.points[1].x / halfAt(line.points[1].y), 12);
        expect(line.points[0].x / halfAt(line.points[0].y)).toBeCloseTo(line.u, 12);
      }
    }
  });

  it('uses surface normals perpendicular to the tapered rib tangent', () => {
    const source = section('s4bis', 20, 32), detail = P.saturnHardwareGeometry(geometry([source])).sections[0];
    const radiusSlope = (source.w1 - source.w0) / (2 * (source.y1 - source.y0));
    for (const line of detail.lines.filter(line => line.kind === 'stringer-shadow')) {
      const nz = Math.sqrt(Math.max(0, 1 - line.normal.x ** 2 - line.normal.y ** 2));
      const tangent = [line.u * radiusSlope, 1, Math.sqrt(1 - line.u ** 2) * radiusSlope];
      expect(line.normal.x * tangent[0] + line.normal.y + nz * tangent[2]).toBeCloseTo(0, 12);
      expect(line.normal.y).toBeLessThan(0);
    }
  });

  it('preserves structural coordinates under translation and uniform scale', () => {
    const source = geometry([section('s1'), section('sm'), section('sla')]), scale = 1.7, dy = -33;
    const transformed = { k: source.k * scale, sections: source.sections.map(s => ({ ...s,
      y0: s.y0 * scale + dy, y1: s.y1 * scale + dy, w0: s.w0 * scale, w1: s.w1 * scale })) };
    const a = P.saturnHardwareGeometry(source), b = P.saturnHardwareGeometry(transformed);
    expect(b.scale).toBe(a.scale * scale);
    a.sections.forEach((s, index) => {
      const first = pointsOf(s), second = pointsOf(b.sections[index]);
      expect(second).toHaveLength(first.length);
      first.forEach((p, i) => nearPoint(second[i], { x: p.x * scale, y: p.y * scale + dy }));
    });
  });

  it('fades subpixel detail smoothly without changing the underlying structure', () => {
    const at = width => P.saturnHardwareGeometry(geometry([section('s1is', width, width)])).sections[0];
    expect(at(2).opacity).toBe(0); expect(at(3).opacity).toBe(0);
    expect(at(6.5).opacity).toBeCloseTo(0.5, 14); expect(at(10).opacity).toBe(1); expect(at(30).opacity).toBe(1);
    expect(at(3.001).opacity).toBeLessThan(1e-6); expect(1 - at(9.999).opacity).toBeLessThan(1e-6);
    let previous = 0;
    for (let w = 3; w <= 10; w += 0.25) { expect(at(w).opacity).toBeGreaterThanOrEqual(previous); previous = at(w).opacity; }
    expect(at(2).lines.map(line => line.kind)).toEqual(at(30).lines.map(line => line.kind));
  });
});

describe('Saturn bell contours', () => {
  it('rejects nonfinite, reversed and unbounded nozzle inputs', () => {
    const values = [12, 40, 18, 8, 20];
    for (let i = 0; i < values.length; i++) for (const invalid of [NaN, Infinity, -Infinity, null, '4']) {
      const args = [...values]; args[i] = invalid; expect(P.saturnNozzleGeometry(...args)).toBeNull();
    }
    for (const args of [[1000001, 0, 10, 4, 8], [0, -1000001, 10, 4, 8], [0, 0, 0, 4, 8],
      [0, 0, -1, 4, 8], [0, 0, 10, 0, 8], [0, 0, 10, 9, 8], [0, 0, 100001, 4, 8], [0, 0, 10, 4, 100001], [0, 0, 10, Number.MIN_VALUE, 8],
      [0, 1, 1e-320, 4, 8], [1, 0, 10, 1e-320, 8]]) {
      expect(P.saturnNozzleGeometry(...args)).toBeNull();
    }
  });

  it('keeps exact attachment, symmetric sides and the original exhaust exit', () => {
    const g = P.saturnNozzleGeometry(37, -18, 24, 10, 22);
    nearPoint(g.outline[0], { x: 32, y: -18 }); nearPoint(g.outline[1], { x: 42, y: -18 });
    expect(g.exit).toBe(6);
    expect(g.outline).toHaveLength(34);
    expect(g.outline.filter(p => p.y === g.exit).map(p => p.x).sort((a, b) => a - b)).toEqual([26, 48]);
    for (const point of g.outline) {
      const mirror = g.outline.find(other => Math.abs(other.y - point.y) < 1e-12 && Math.abs(other.x + point.x - 74) < 1e-12);
      expect(mirror).toBeTruthy();
      expect(point.y).toBeGreaterThanOrEqual(g.base); expect(point.y).toBeLessThanOrEqual(g.exit);
    }
  });

  it('expands continuously while its wall turns toward the axis', () => {
    const g = P.saturnNozzleGeometry(0, 0, 24, 10, 22), right = g.outline.slice(1, 18);
    const slopes = right.slice(1).map((p, i) => (p.x - right[i].x) / (p.y - right[i].y));
    slopes.forEach((slope, i) => { expect(slope).toBeGreaterThan(0); if (i) expect(slope).toBeLessThan(slopes[i - 1]); });
    right.slice(1, -1).forEach(p => expect(p.x).toBeGreaterThan(5 + 6 * p.y / 24));
    const straight = P.saturnNozzleGeometry(0, 0, 24, 10, 10);
    straight.outline.forEach(p => expect(Math.abs(p.x)).toBe(5));
  });

  it('scales and translates the full bell and keeps cooling ribs inside its wall', () => {
    const a = P.saturnNozzleGeometry(2, 8, 24, 10, 22), scale = 2.2, dx = 14, dy = -7;
    const b = P.saturnNozzleGeometry(2 * scale + dx, 8 * scale + dy, 24 * scale, 10 * scale, 22 * scale);
    const first = [...a.outline, ...a.ribs.flat()], second = [...b.outline, ...b.ribs.flat()];
    first.forEach((p, i) => nearPoint(second[i], { x: p.x * scale + dx, y: p.y * scale + dy }));
    expect(a.ribs).toHaveLength(5);
    for (const rib of a.ribs) {
      expect(rib[0].y).toBe(rib[1].y);
      const y = rib[0].y, edge = a.outline.slice(1, 18);
      const index = edge.findIndex(p => p.y >= y), lo = edge[index - 1], hi = edge[index];
      const radius = lo.x - a.x + (hi.x - lo.x) * (y - lo.y) / (hi.y - lo.y);
      expect(Math.abs(rib[0].x - a.x)).toBeLessThan(radius);
      expect(Math.abs(rib[1].x - a.x)).toBeLessThan(radius);
    }
  });
});

describe('Saturn detail painting', () => {
  it('clips each section and restores caller transform, clip, alpha and line style', () => {
    const field = P.saturnHardwareGeometry(geometry([section('sm'), section('s4bis')])), rec = recorder();
    expect(P.drawSaturnHardware(rec.ctx, 73, field)).toBe(field);
    expect(rec.clips).toHaveLength(2);
    field.sections.forEach((s, index) => expect(rec.clips[index].path).toEqual(s.outline));
    expect(rec.paints.length).toBe(field.sections.reduce((sum, s) => sum + s.lines.length + s.panels.length, 0));
    let paintIndex = 0;
    for (const s of field.sections) for (const item of [...s.panels, ...s.lines]) {
      const paint = rec.paints[paintIndex++];
      expect(paint.path).toEqual(item.points);
      expect(paint.state.clips).toEqual(['caller-clip', s.outline]);
      expect(paint.state.globalAlpha).toBeCloseTo(0.37 * s.opacity * item.opacity, 14);
      expect(paint.state.transform).toEqual([1, 0, 0, 1, 85, 7]);
    }
    expect(rec.state()).toEqual(rec.snapshot); expect(rec.depth()).toBe(0);
  });

  it('suppresses unreadable details and respects fully transparent callers', () => {
    const tiny = P.saturnHardwareGeometry(geometry([section('s1is', 2, 2)])), rec = recorder();
    P.drawSaturnHardware(rec.ctx, 0, tiny);
    expect(rec.paints).toHaveLength(0); expect(rec.clips).toHaveLength(0); expect(rec.state()).toEqual(rec.snapshot);
    const hidden = recorder(0);
    expect(P.drawSaturnHardware(hidden.ctx, 0, P.saturnHardwareGeometry(geometry()))).toBeNull();
    expect(hidden.calls).toHaveLength(0);
  });

  it('rejects caller-edited unsafe paths, colors and stroke widths without Canvas calls', () => {
    const field = P.saturnHardwareGeometry(geometry());
    const bad = [null, {}, { sections: Array(11).fill(field.sections[0]) }];
    for (const change of [
      f => { f.sections[0].outline[0].x = Infinity; },
      f => { f.sections[0].lines[0].color = 'url(secret)'; },
      f => { f.sections[0].lines[0].width = 11; },
      f => { f.sections[0].lines[0].opacity = 2; },
      f => { f.sections[0].lines[0].normal.x = NaN; },
      f => { f.sections[0].opacity = -1; },
      f => { f.sections[0].lines.push(...Array(101).fill(f.sections[0].lines[0])); },
    ]) { const edited = copy(field); change(edited); bad.push(edited); }
    for (const value of bad) {
      const rec = recorder(); expect(P.drawSaturnHardware(rec.ctx, 0, value)).toBeNull(); expect(rec.calls).toHaveLength(0);
    }
    const rec = recorder();
    for (const x of [NaN, Infinity, 1000001]) expect(P.drawSaturnHardware(rec.ctx, x, field)).toBeNull();
    expect(rec.calls).toHaveLength(0);
  });

  it('responds to Sun direction through the same local rib normals', () => {
    const field = P.saturnHardwareGeometry(geometry([section('s1is', 20, 20)]));
    const right = recorder(), left = recorder(), unlit = recorder();
    P.drawSaturnHardware(right.ctx, 0, field, { x: 1, y: 0, fraction: 1 });
    P.drawSaturnHardware(left.ctx, 0, field, { x: -1, y: 0, fraction: 1 });
    P.drawSaturnHardware(unlit.ctx, 0, field);
    const rgb = paint => paint.state.strokeStyle.match(/\d+/g).map(Number);
    const lines = field.sections[0].lines;
    const index = lines.findIndex(line => line.kind === 'stringer-shadow' && line.u > 0.9);
    expect(rgb(right.paints[index]).reduce((a, b) => a + b)).toBeGreaterThan(rgb(left.paints[index]).reduce((a, b) => a + b));
    expect(unlit.paints[index].state.strokeStyle).toBe(lines[index].color);
  });

  it('rebuilds nozzle paths from trusted scalar dimensions and restores state', () => {
    const source = P.saturnNozzleGeometry(17, 60, 24, 10, 22), edited = copy(source), rec = recorder();
    edited.outline = [{ x: Infinity, y: NaN }]; edited.ribs = [[{ x: 1e99, y: 1e99 }]];
    const result = P.drawSaturnNozzle(rec.ctx, edited);
    expect(result).toEqual(source); expect(rec.paints[0].path).toEqual(source.outline);
    expect(rec.clips).toHaveLength(1); expect(rec.clips[0].path).toEqual(source.outline);
    expect(rec.paints[0].state.globalAlpha).toBe(0.37);
    rec.paints.slice(1).forEach((paint, index) => {
      expect(paint.path).toEqual(source.ribs[index]);
      expect(paint.state.clips).toEqual(['caller-clip', source.outline]);
      expect(paint.state.globalAlpha).toBeCloseTo(0.37 * source.opacity * 0.6, 14);
    });
    expect(rec.state()).toEqual(rec.snapshot); expect(rec.depth()).toBe(0);
  });

  it('lights opposing first-stage fins consistently with the Sun direction', () => {
    const right = recorder(), left = recorder();
    P.saturnV(right.ctx, 0, 0, 330, 1, { orbitLight: { x: 1, y: 0, fraction: 1 } });
    P.saturnV(left.ctx, 0, 0, 330, 1, { orbitLight: { x: -1, y: 0, fraction: 1 } });
    const fins = rec => rec.paints.filter(p => p.kind === 'fill' && p.path.length === 4 &&
      p.path[0].y !== p.path[1].y && p.path[2].y > p.path[3].y);
    const a = fins(right), b = fins(left);
    expect(a).toHaveLength(2); expect(b).toHaveLength(2);
    expect(a.map(p => p.path)).toEqual(b.map(p => p.path));
    const brightness = paint => paint.state.fillStyle.match(/\d+/g).map(Number).reduce((sum, value) => sum + value);
    expect(brightness(a[1])).toBeGreaterThan(brightness(a[0]));
    expect(brightness(b[0])).toBeGreaterThan(brightness(b[1]));
    expect(brightness(a[0])).toBe(brightness(b[1]));
  });

  it('rejects invalid nozzle dimensions before any painting', () => {
    const valid = P.saturnNozzleGeometry(0, 0, 24, 10, 22), rec = recorder();
    for (const value of [null, {}, { ...valid, length: -2 }, { ...valid, exitWidth: 4 }, { ...valid, x: NaN }]) {
      expect(P.drawSaturnNozzle(rec.ctx, value)).toBeNull();
    }
    expect(rec.calls).toHaveLength(0);
    const hidden = recorder(0); expect(P.drawSaturnNozzle(hidden.ctx, valid)).toBeNull(); expect(hidden.calls).toHaveLength(0);
  });
});
