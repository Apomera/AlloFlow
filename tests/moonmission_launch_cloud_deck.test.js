/** World-fixed cloud footprints projected through the spherical launch camera. */
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

const geometry = (altitude = 80000, downrange = 450000, width = 1014, height = 400) =>
  P.launchCloudDeckGeometry(altitude, downrange, width, height);

// Construct a world vector, then rotate it into the observer's frame. The
// renderer may use relative longitude directly; this oracle takes another path.
function project(field, point) {
  const horizontal = RADIUS * Math.cos(point.latitude);
  const worldX = horizontal * Math.sin(point.longitude);
  const worldY = horizontal * Math.cos(point.longitude);
  const turn = field.downrange / RADIUS;
  const x = worldX * Math.cos(turn) - worldY * Math.sin(turn);
  const y = worldX * Math.sin(turn) + worldY * Math.cos(turn);
  const z = RADIUS * Math.sin(point.latitude);
  const observer = RADIUS + field.altitude;
  const focal = field.height * Math.sqrt(3) / 2;
  const distance = Math.hypot(x, y - observer, z);
  return {
    x: field.width / 2 + focal * x / z,
    y: field.height * 0.6 + focal * (observer - y) / z,
    X: x, Y: y, Z: z, distance,
    mu: (observer * y / RADIUS - RADIUS) / distance,
  };
}

// Solve the ray/sphere quadratic independently of the horizon helper. A cloud
// belongs on the near Earth surface, not the unseen intersection behind it.
function surfaceRay(field, point) {
  const focal = field.height * Math.sqrt(3) / 2;
  const dx = (point.x - field.width / 2) / focal;
  const dy = (field.height * 0.6 - point.y) / focal;
  const observer = 1 + field.altitude / RADIUS;
  const a = dx * dx + dy * dy + 1;
  const b = 2 * observer * dy;
  const c = observer * observer - 1;
  const discriminant = b * b - 4 * a * c;
  return { discriminant, near: (-b - Math.sqrt(Math.max(0, discriminant))) / (2 * a) };
}

function common(a, b) {
  const byId = new Map(b.patches.map(patch => [patch.id, patch]));
  return a.patches.filter(patch => byId.has(patch.id)).map(patch => [patch, byId.get(patch.id)]);
}

function crossed(a, b, c, d) {
  const side = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return side(a, b, c) * side(a, b, d) < -1e-9 && side(c, d, a) * side(c, d, b) < -1e-9;
}

function canvas({ alpha = 0.37, gradient = 'native' } = {}) {
  const state = {
    globalAlpha: alpha, fillStyle: '#123456', strokeStyle: '#abcdef', lineWidth: 7,
    globalCompositeOperation: 'multiply', shadowBlur: 3, shadowColor: '#223344', lineJoin: 'bevel',
    transform: [1.3, 0, 0, 1.3, 17, 29], clip: 'caller-clip',
  };
  const copyState = () => ({ ...state, transform: [...state.transform] });
  const initial = copyState(), stack = [], calls = [], fills = [], strokes = [], gradients = [];
  let path = [];
  const methods = {
    save() { stack.push(copyState()); calls.push(['save']); },
    restore() {
      const saved = stack.pop();
      if (!saved) throw new Error('Unbalanced restore');
      Object.assign(state, saved); calls.push(['restore']);
    },
    beginPath() { path = []; calls.push(['beginPath']); },
    fill() { fills.push({ ...copyState(), path: path.map(p => [...p]) }); calls.push(['fill']); },
    fillRect(...args) { fills.push({ ...copyState(), path: [['rect', ...args]] }); calls.push(['fillRect', ...args]); },
    stroke() { strokes.push({ ...copyState(), path: path.map(p => [...p]) }); calls.push(['stroke']); },
    clip() { state.clip = { parent: state.clip, path: path.map(p => [...p]) }; calls.push(['clip']); },
    translate(x, y) {
      const m = state.transform;
      m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y;
      calls.push(['translate', x, y]);
    },
    scale(x, y) {
      const m = state.transform;
      m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y;
      calls.push(['scale', x, y]);
    },
  };
  for (const name of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'closePath', 'rect']) {
    methods[name] = (...args) => { path.push([name, ...args]); calls.push([name, ...args]); };
  }
  for (const name of ['createLinearGradient', 'createRadialGradient']) {
    if (gradient === 'missing') continue;
    methods[name] = (...coordinates) => {
      calls.push([name, ...coordinates]);
      const result = { kind: name, coordinates, stops: [] };
      if (gradient !== 'malformed') result.addColorStop = function(offset, color) { this.stops.push([offset, color]); };
      gradients.push(result);
      return gradient === 'null' ? null : result;
    };
  }
  const ctx = new Proxy(state, {
    get(target, key) { return key in methods ? methods[key] : target[key]; },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, state, initial, stack, calls, fills, strokes, gradients };
}

function draw(field = geometry(), options = {}) {
  const rec = canvas(options);
  P.drawLaunchCloudDeck(rec.ctx, field);
  return rec;
}

function signature(rec) {
  return rec.fills.map(fill => ({
    alpha: fill.globalAlpha, path: fill.path, transform: fill.transform,
    style: typeof fill.fillStyle === 'string' ? fill.fillStyle : {
      kind: fill.fillStyle.kind, coordinates: fill.fillStyle.coordinates, stops: fill.fillStyle.stops,
    },
  }));
}

describe('Launch cloud deck geometry', () => {
  it('rejects missing, nonnumeric and nonfinite camera inputs', () => {
    for (const value of invalid) {
      expect(P.launchCloudDeckGeometry(value, 450000, 1014, 400)).toBeNull();
      expect(P.launchCloudDeckGeometry(80000, value, 1014, 400)).toBeNull();
      expect(P.launchCloudDeckGeometry(80000, 450000, value, 400)).toBeNull();
      expect(P.launchCloudDeckGeometry(80000, 450000, 1014, value)).toBeNull();
    }
  });

  it('bounds supported altitude, downrange and viewport work', () => {
    for (const value of [-1, 1000001, Number.MAX_VALUE]) expect(geometry(value)).toBeNull();
    for (const value of [-100000001, 100000001, Number.MAX_VALUE]) expect(geometry(80000, value)).toBeNull();
    for (const value of [0, -1, 8193, Number.MAX_VALUE]) {
      expect(geometry(80000, 0, value)).toBeNull();
      expect(geometry(80000, 0, 1014, value)).toBeNull();
    }
    for (const [h, d, w, height] of [[0, -1e8, 1, 1], [1e6, 1e8, 8192, 8192], [185000, -1e8, 8192, 1]]) {
      const field = geometry(h, d, w, height);
      expect(field).not.toBeNull();
      expect(field.patches.length).toBeLessThanOrEqual(600);
      expect(field.patches.reduce((total, patch) => total + patch.points.length, 0)).toBeLessThanOrEqual(29400);
    }
  });

  it('starts above 12 km without an opacity jump at the handoff', () => {
    for (const altitude of [0, 5000, 11999, 12000]) {
      const field = geometry(altitude);
      expect(field.opacity).toBe(0);
      expect(field.patches).toEqual([]);
    }
    const emerging = geometry(12000.001), established = geometry();
    expect(emerging.opacity).toBeGreaterThanOrEqual(0);
    expect(emerging.opacity).toBeLessThan(1e-5);
    expect(established.opacity).toBeGreaterThan(emerging.opacity);
    expect(established.patches.length).toBeGreaterThan(0);
  });

  it('reproduces the field after arbitrary seeks without sharing mutable points', () => {
    const first = geometry(), snapshot = JSON.stringify(first);
    for (const [altitude, downrange] of [[185000, 2300000], [20000, 0], [80000, -900000]]) geometry(altitude, downrange);
    const again = geometry();
    expect(JSON.stringify(again)).toBe(snapshot);
    expect(again).not.toBe(first);
    expect(again.patches[0].points).not.toBe(first.patches[0].points);
    first.patches[0].points[0].x += 1000;
    expect(JSON.stringify(geometry())).toBe(snapshot);
  });

  it('returns finite, tightly bounded, exactly closed footprints in far-to-near order', () => {
    for (const altitude of [20000, 50000, 80000, 185000, 1e6]) {
      const field = geometry(altitude);
      expect(field).toMatchObject({ altitude, downrange: 450000, width: 1014, height: 400 });
      expect(new Set(field.patches.map(patch => patch.id)).size).toBe(field.patches.length);
      field.patches.forEach((patch, index) => {
        expect(patch.points.length).toBe(49);
        expect(patch.points.at(-1)).toEqual(patch.points[0]);
        expect([patch.x, patch.y, patch.longitude, patch.latitude, patch.minX, patch.maxX,
          patch.minY, patch.maxY, patch.width, patch.height, patch.distance, patch.mu, patch.minMu, patch.opacity]
          .every(Number.isFinite)).toBe(true);
        expect(patch.minX).toBe(Math.min(...patch.points.map(point => point.x)));
        expect(patch.maxX).toBe(Math.max(...patch.points.map(point => point.x)));
        expect(patch.minY).toBe(Math.min(...patch.points.map(point => point.y)));
        expect(patch.maxY).toBe(Math.max(...patch.points.map(point => point.y)));
        expect(patch.width).toBeCloseTo(patch.maxX - patch.minX, 10);
        expect(patch.height).toBeCloseTo(patch.maxY - patch.minY, 10);
        expect(patch.width).toBeGreaterThan(0); expect(patch.height).toBeGreaterThan(0);
        expect(patch.points.every(point => [point.x, point.y, point.longitude, point.latitude].every(Number.isFinite))).toBe(true);
        if (index) expect(patch.distance).toBeLessThanOrEqual(field.patches[index - 1].distance);
      });
    }
  });

  it('projects every world point through an independent rotated spherical camera', () => {
    let checked = 0;
    for (const [altitude, downrange] of [[20000, 0], [80000, 450000], [185000, -780000], [185000, 1e8]]) {
      const field = geometry(altitude, downrange);
      for (const patch of field.patches) {
        const center = project(field, patch);
        expect(Math.abs(center.x - patch.x)).toBeLessThan(1e-7);
        expect(Math.abs(center.y - patch.y)).toBeLessThan(1e-7);
        expect(Math.abs(center.distance - patch.distance)).toBeLessThan(1e-5);
        expect(Math.abs(center.mu - patch.mu)).toBeLessThan(1e-10);
        for (const point of patch.points) {
          const expected = project(field, point);
          expect(Math.abs(expected.x - point.x)).toBeLessThan(1e-7);
          expect(Math.abs(expected.y - point.y)).toBeLessThan(1e-7);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('keeps the whole footprint on the visible near Earth surface below the limb', () => {
    let checked = 0;
    for (const altitude of [20000, 80000, 185000]) {
      const field = geometry(altitude);
      for (const patch of field.patches) {
        const cosines = [];
        for (const point of patch.points) {
          const expected = project(field, point), ray = surfaceRay(field, point);
          expect(expected.Z).toBeGreaterThan(0);
          expect(expected.mu).toBeGreaterThanOrEqual(-1e-12);
          expect(ray.discriminant).toBeGreaterThanOrEqual(-1e-12);
          expect(ray.near).toBeGreaterThan(0);
          expect(Math.abs(ray.near - expected.Z / RADIUS)).toBeLessThan(1e-8);
          cosines.push(expected.mu); checked++;
        }
        expect(patch.minMu).toBeCloseTo(Math.min(...cosines), 10);
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('has simple irregular outlines without self-crossing edges', () => {
    const field = geometry();
    expect(field.patches.length).toBeGreaterThan(0);
    for (const patch of field.patches) {
      const points = patch.points;
      for (let a = 0; a < points.length - 1; a++) {
        for (let b = a + 2; b < points.length - 1; b++) {
          if (a === 0 && b === points.length - 2) continue;
          expect(crossed(points[a], points[a + 1], points[b], points[b + 1])).toBe(false);
        }
      }
      const radial = points.slice(0, -1).map(point =>
        Math.hypot((point.longitude - patch.longitude) * Math.cos(patch.latitude), point.latitude - patch.latitude));
      expect(Math.max(...radial) - Math.min(...radial)).toBeGreaterThan(1e-4);
    }
  });

  it('treats a narrower viewport as a crop of the same physical cloud field', () => {
    const wide = geometry(), narrow = geometry(80000, 450000, 310, 400);
    const pairs = common(wide, narrow);
    expect(pairs.length).toBeGreaterThan(0);
    for (const [a, b] of pairs) {
      expect(a.longitude).toBe(b.longitude); expect(a.latitude).toBe(b.latitude);
      expect(a.opacity).toBe(b.opacity);
      expect(a.y).toBe(b.y);
      expect(a.x - b.x).toBeCloseTo((1014 - 310) / 2, 10);
      a.points.forEach((point, index) => {
        expect(point.x - b.points[index].x).toBeCloseTo((1014 - 310) / 2, 10);
        expect(point.y).toBe(b.points[index].y);
      });
    }
  });

  it('scales the view with display height while preserving world geometry and opacity', () => {
    const base = geometry();
    for (const scale of [0.5, 1.5, 2]) {
      const resized = geometry(80000, 450000, 1014 * scale, 400 * scale);
      const pairs = common(base, resized);
      expect(pairs.length).toBeGreaterThan(0);
      for (const [a, b] of pairs) {
        expect(a.opacity).toBe(b.opacity);
        expect(a.longitude).toBe(b.longitude); expect(a.latitude).toBe(b.latitude);
        a.points.forEach((point, index) => {
          expect(b.points[index].x).toBeCloseTo(point.x * scale, 9);
          expect(b.points[index].y).toBeCloseTo(point.y * scale, 9);
        });
      }
    }
  });

  it('keeps cloud world positions fixed as measured downrange moves the observer', () => {
    const before = geometry(), after = geometry(80000, 451000);
    const pairs = common(before, after);
    expect(pairs.length).toBeGreaterThan(0);
    for (const [a, b] of pairs) {
      expect([a.longitude, a.latitude, a.column, a.row]).toEqual([b.longitude, b.latitude, b.column, b.row]);
      expect(b.x).toBeLessThan(a.x);
      a.points.forEach((point, index) => {
        expect(point.longitude).toBe(b.points[index].longitude);
        expect(point.latitude).toBe(b.points[index].latitude);
      });
    }
  });

  it('crosses a procedural tile boundary without respawning the visible field', () => {
    const before = geometry(185000, 260000 - 0.01), after = geometry(185000, 260000 + 0.01);
    const pairs = common(before, after);
    expect(pairs.length).toBeGreaterThan(0);
    expect(before.patches.map(patch => patch.id).sort()).toEqual(after.patches.map(patch => patch.id).sort());
    for (const [a, b] of pairs) {
      expect(Math.abs(a.x - b.x)).toBeLessThan(0.001);
      expect(Math.abs(a.y - b.y)).toBeLessThan(0.001);
      expect(Math.abs(a.opacity - b.opacity)).toBeLessThan(0.001);
    }
  });

  it('keeps horizon haze and patch opacity bounded by the altitude fade', () => {
    const field = geometry(185000);
    expect(field.opacity).toBeGreaterThan(0); expect(field.opacity).toBeLessThanOrEqual(1);
    expect(field.patches.length).toBeGreaterThan(1);
    for (const patch of field.patches) {
      expect(patch.mu).toBeGreaterThanOrEqual(0); expect(patch.mu).toBeLessThanOrEqual(1);
      expect(patch.minMu).toBeLessThanOrEqual(patch.mu);
      expect(patch.opacity).toBeGreaterThan(0);
      expect(patch.opacity).toBeLessThanOrEqual(field.opacity);
      if (patch.minMu < 0.001) expect(patch.opacity).toBeLessThan(field.opacity * 0.1);
    }
  });
});

describe('Launch cloud deck rendering', () => {
  it('rejects extreme finite coordinates before painting any part of the field', () => {
    const field = geometry();
    expect(field.patches.length).toBeGreaterThan(0);
    for (const value of [-Number.MAX_VALUE, Number.MAX_VALUE, -10000001, 10000001]) {
      for (const key of ['x', 'y', 'minX', 'maxX', 'minY', 'maxY', 'pointX', 'pointY']) {
        const patch = JSON.parse(JSON.stringify(field.patches[0]));
        if (key === 'pointX') patch.points[1].x = value;
        else if (key === 'pointY') patch.points[1].y = value;
        else patch[key] = value;
        const rec = canvas();
        const invalidField = { ...field, patches: [field.patches[0], patch] };
        expect(P.drawLaunchCloudDeck(rec.ctx, invalidField)).toBeNull();
        expect(rec.calls).toEqual([]);
        expect(rec.state).toEqual(rec.initial);
        expect(rec.stack).toEqual([]);
      }
    }
  });

  it('preserves the caller transform, clip, opacity, compositing and paint state', () => {
    const rec = draw();
    expect(rec.fills.length).toBeGreaterThan(0);
    expect(rec.state).toEqual(rec.initial);
    expect(rec.stack).toEqual([]);
    expect(rec.calls.filter(call => call[0] === 'save').length).toBe(rec.calls.filter(call => call[0] === 'restore').length);
    for (const paint of [...rec.fills, ...rec.strokes]) {
      expect(paint.globalAlpha).toBeGreaterThanOrEqual(0);
      expect(paint.globalAlpha).toBeLessThanOrEqual(rec.initial.globalAlpha);
      expect(paint.globalCompositeOperation).toBe(rec.initial.globalCompositeOperation);
      expect(paint.transform).toEqual(rec.initial.transform);
    }
  });

  it('paints one continuous body per patch and clips interior lighting to its outline', () => {
    const field = geometry(), rec = draw(field);
    const bodies = rec.fills.filter(fill => fill.clip === rec.initial.clip);
    expect(bodies.length).toBe(field.patches.length);
    bodies.forEach(body => {
      expect(body.path[0][0]).toBe('moveTo');
      expect(body.path.at(-1)[0]).toBe('closePath');
      expect(body.path.some(command => ['arc', 'ellipse'].includes(command[0]))).toBe(false);
    });
    const interiors = rec.fills.filter(fill => fill.clip !== rec.initial.clip);
    expect(interiors.length).toBeGreaterThan(0);
    for (const interior of interiors) {
      expect(interior.clip.parent).toBe(rec.initial.clip);
      expect(bodies.some(body => JSON.stringify(body.path) === JSON.stringify(interior.clip.path))).toBe(true);
    }
  });

  it('does no Canvas work for invisible fields or zero caller opacity', () => {
    for (const rec of [draw(geometry(12000)), draw(geometry(), { alpha: 0 })]) {
      expect(rec.calls).toEqual([]);
      expect(rec.state).toEqual(rec.initial);
      expect(rec.stack).toEqual([]);
    }
  });

  it('replays the same bounded finite paths and gradients without draw history', () => {
    const field = geometry(), first = draw(field);
    draw(geometry(185000, 2300000)); draw(geometry(20000, 0));
    const again = draw(geometry());
    expect(signature(again)).toEqual(signature(first));
    for (const call of again.calls) expect(call.slice(1).filter(value => typeof value === 'number').every(Number.isFinite)).toBe(true);
    for (const gradient of again.gradients) {
      expect(gradient.coordinates.every(Number.isFinite)).toBe(true);
      gradient.stops.forEach(([offset, color]) => {
        expect(offset).toBeGreaterThanOrEqual(0); expect(offset).toBeLessThanOrEqual(1);
        expect(color).not.toMatch(/NaN|Infinity/);
      });
    }
    expect(again.calls.length).toBeLessThan(field.patches.length * 1000);
  });

  it('retains coherent bodies and caller state with unavailable or malformed gradients', () => {
    const field = geometry();
    for (const gradient of ['missing', 'null', 'malformed']) {
      const rec = draw(field, { gradient });
      const bodies = rec.fills.filter(fill => fill.clip === rec.initial.clip);
      expect(bodies.length).toBe(field.patches.length);
      bodies.forEach(body => {
        expect(typeof body.fillStyle).toBe('string');
        expect(body.path.at(-1)[0]).toBe('closePath');
      });
      expect(rec.state).toEqual(rec.initial);
      expect(rec.stack).toEqual([]);
    }
  });
});
