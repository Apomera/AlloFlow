/** A continuous, deterministic exhaust field anchored to the launch pad. */
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

const invalid = [undefined, null, NaN, Infinity, -Infinity, '1'];
const geometry = (time = 8, width = 800, height = 400, altitude = 0, engineOn) =>
  P.launchGroundExhaustGeometry(time, width, height, altitude, engineOn);

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

function draw(g = geometry(), options = {}) {
  const rec = canvas(options);
  rec.result = P.drawLaunchGroundExhaust(rec.ctx, g);
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

describe('Launch ground exhaust geometry', () => {
  it('rejects invalid time, viewport, altitude and engine state', () => {
    for (const value of invalid) {
      expect(P.launchGroundExhaustGeometry(value, 800, 400, 0)).toBeNull();
      expect(P.launchGroundExhaustGeometry(8, value, 400, 0)).toBeNull();
      expect(P.launchGroundExhaustGeometry(8, 800, value, 0)).toBeNull();
      expect(P.launchGroundExhaustGeometry(8, 800, 400, value)).toBeNull();
    }
    expect(geometry(-1)).toBeNull();
    expect(geometry(8, 800, 400, -1)).toBeNull();
    expect(geometry(8, 800, 400, Number.MAX_VALUE)).toBeNull();
    for (const value of [0, -1, 1000001, Number.MAX_VALUE]) {
      expect(geometry(8, value)).toBeNull();
      expect(geometry(8, 800, value)).toBeNull();
    }
    for (const value of [null, 0, 1, 'true', NaN]) expect(geometry(8, 800, 400, 0, value)).toBeNull();
    expect(geometry(8, 800, 400, 0, true)).not.toBeNull();
    expect(geometry(8, 800, 400, 0, false)).not.toBeNull();
  });

  it('reproduces a seek time without accumulated history or shared mutable profiles', () => {
    const before = geometry(7.25), snapshot = JSON.stringify(before);
    for (const time of [0, 20, 4, 89, 1]) geometry(time);
    const after = geometry(7.25);
    expect(JSON.stringify(after)).toBe(snapshot);
    expect(after).not.toBe(before);
    before.top[3].y = -1000;
    before.billows[0].rise = 500;
    expect(JSON.stringify(geometry(7.25))).toBe(snapshot);
    expect(geometry(7.5).top).not.toEqual(after.top);
  });

  it('keeps ordered continuous profiles joined at both ends without crossing', () => {
    for (const time of [0, 0.1, 1, 4, 8, 16, 35, 89]) {
      const g = geometry(time), depth = g.maxY - g.minY;
      expect(g.top.length).toBe(g.bottom.length);
      expect(g.top.length).toBeGreaterThan(50);
      expect(g.top[0].x).toBe(-g.span);
      expect(g.top.at(-1).x).toBe(g.span);
      expect(Math.min(...g.top.map(p => p.y))).toBe(g.minY);
      expect(Math.max(...g.bottom.map(p => p.y))).toBe(g.maxY);
      g.top.forEach((top, index) => {
        const bottom = g.bottom[index];
        expect([top.x, top.y, bottom.x, bottom.y].every(Number.isFinite)).toBe(true);
        expect(top.x).toBe(bottom.x);
        expect(top.y).toBeLessThanOrEqual(bottom.y);
        expect(top.y).toBeLessThanOrEqual(0);
        expect(bottom.y).toBeGreaterThanOrEqual(0);
        if (index) {
          expect(top.x).toBeGreaterThan(g.top[index - 1].x);
          expect(Math.abs(top.y - g.top[index - 1].y)).toBeLessThan(depth * 0.2);
          expect(Math.abs(bottom.y - g.bottom[index - 1].y)).toBeLessThan(depth * 0.2);
        }
      });
      for (const index of [0, g.top.length - 1]) {
        expect(g.top[index].y).toBeCloseTo(g.bottom[index].y, 12);
        expect(g.top[index].y).toBeCloseTo(0, 12);
      }
    }
  });

  it('spreads along the ground and develops rising billows after ignition', () => {
    const early = geometry(0.5), middle = geometry(4), developed = geometry(12);
    expect(early.span).toBeLessThan(middle.span);
    expect(middle.span).toBeLessThan(developed.span);
    expect(developed.span).toBeGreaterThan(early.span * 3);
    expect(developed.minY).toBeLessThan(early.minY);
    expect(developed.maxY).toBeGreaterThan(early.maxY);
    expect(developed.billows.some(b => b.x < 0)).toBe(true);
    expect(developed.billows.some(b => b.x > 0)).toBe(true);
    for (const b of developed.billows) {
      expect(b.radius).toBeGreaterThan(0);
      expect(b.rise).toBeGreaterThan(0);
      expect(Math.abs(b.x)).toBeLessThan(developed.span);
    }
  });

  it('remains anchored to pad altitude while adapting its scale to the viewport', () => {
    const base = geometry(8), raised = geometry(8, 800, 400, 250);
    expect(base.x).toBe(400); expect(base.y).toBe(320); expect(base.scale).toBe(1);
    expect(raised.y - base.y).toBeCloseTo(250 * 1.2 / 9.25, 12);
    expect(raised.top).toEqual(base.top);
    for (const [width, height] of [[320, 240], [490, 400], [1100, 640]]) {
      const g = geometry(8, width, height, 0);
      expect(g.x).toBe(width / 2);
      expect(g.y).toBe(height * 0.8);
      expect(g.scale).toBe(height / 400);
      expect(g.top).toEqual(base.top);
      expect(g.bottom).toEqual(base.bottom);
    }
  });

  it('ramps in smoothly, fades with time and disappears when the pad leaves view', () => {
    const start = geometry(0), first = geometry(0.1), ignited = geometry(1.2);
    expect(start.visible).toBe(false); expect(start.opacity).toBe(0);
    expect(first.visible).toBe(true); expect(first.opacity).toBeGreaterThan(0);
    expect(first.opacity).toBeLessThan(ignited.opacity);
    expect(geometry(36).opacity).toBeLessThan(geometry(12).opacity);
    expect(geometry(70).opacity).toBeLessThan(geometry(36).opacity);
    expect(geometry(8, 800, 400, 1000).visible).toBe(false);
    for (const time of [90, 120, Number.MAX_VALUE]) {
      const g = geometry(time);
      expect(g.visible).toBe(false);
      expect(g.opacity).toBeGreaterThanOrEqual(0);
      expect(g.opacity).toBeLessThanOrEqual(1);
    }
  });

  it('attenuates ground heating with altitude and removes heat when engines are off', () => {
    const ground = geometry(8), elevated = geometry(8, 800, 400, 100), coast = geometry(8, 800, 400, 0, false);
    expect(geometry(0).heat).toBe(0);
    expect(ground.heat).toBeGreaterThan(elevated.heat);
    expect(elevated.heat).toBeGreaterThan(0);
    expect(ground.heat).toBeLessThanOrEqual(1);
    expect(coast.heat).toBe(0);
    expect(coast.opacity).toBe(ground.opacity);
    expect(coast.top).toEqual(ground.top);
    expect(coast.bottom).toEqual(ground.bottom);
  });
});

describe('Launch ground exhaust rendering', () => {
  it('rejects malformed geometry before touching Canvas', () => {
    const rec = canvas(), g = geometry();
    const bad = [null, {}, { visible: true },
      ...['x', 'y', 'scale', 'span', 'opacity', 'heat', 'minY', 'maxY'].map(key => ({ ...g, [key]: NaN })),
      { ...g, scale: 0 }, { ...g, scale: -1 }, { ...g, scale: Number.MAX_VALUE },
      { ...g, span: 0 }, { ...g, opacity: 0 }, { ...g, opacity: 1.1 },
      { ...g, top: [] }, { ...g, top: null }, { ...g, bottom: [] },
      { ...g, top: [{ x: 0, y: Infinity }, ...g.top.slice(1)] },
      { ...g, billows: null }, { ...g, billows: [{ x: 0, radius: -1, rise: 1 }] },
      { ...g, billows: [{ x: 0, radius: Number.MAX_VALUE, rise: 1 }] }];
    for (const value of bad) expect(P.drawLaunchGroundExhaust(rec.ctx, value)).toBeNull();
    expect(P.drawLaunchGroundExhaust(null, g)).toBeNull();
    expect(rec.calls).toEqual([]);
    expect(rec.state).toEqual(rec.initial);
  });

  it('does no Canvas work for invisible exhaust or zero inherited opacity', () => {
    for (const g of [geometry(0), geometry(90), geometry(8, 800, 400, 1000)]) {
      const rec = draw(g);
      expect(rec.result).toBeNull(); expect(rec.calls).toEqual([]);
      expect(rec.state).toEqual(rec.initial);
    }
    const transparent = draw(geometry(), { alpha: 0 });
    expect(transparent.result).toBeNull(); expect(transparent.calls).toEqual([]);
    expect(transparent.state).toEqual(transparent.initial);
  });

  it('preserves caller state and applies inherited opacity to every paint operation', () => {
    const g = geometry(), rec = draw(g);
    expect(rec.result).toBe(g);
    expect(rec.state).toEqual(rec.initial);
    expect(rec.stack).toEqual([]);
    expect(rec.calls.filter(call => call[0] === 'save').length).toBeGreaterThan(0);
    expect(rec.calls.filter(call => call[0] === 'save').length).toBe(rec.calls.filter(call => call[0] === 'restore').length);
    for (const paint of [...rec.fills, ...rec.strokes]) {
      expect(paint.globalAlpha).toBeCloseTo(rec.initial.globalAlpha * g.opacity, 14);
      expect(paint.globalCompositeOperation).toBe(rec.initial.globalCompositeOperation);
      expect(paint.transform).toEqual([1.3 * g.scale, 0, 0, 1.3 * g.scale, 17 + 1.3 * g.x, 29 + 1.3 * g.y]);
    }
  });

  it('fills one connected silhouette and clips its highlights inside the caller clip', () => {
    const rec = draw(), bodies = rec.fills.filter(fill => fill.path.at(-1)?.[0] === 'closePath');
    expect(bodies.length).toBe(1);
    const body = bodies[0];
    expect(body.path[0][0]).toBe('moveTo');
    expect(body.path.some(command => command[0] === 'arc' || command[0] === 'ellipse')).toBe(false);
    expect(body.clip).toBe('caller-clip');
    expect(rec.calls.filter(call => call[0] === 'clip').length).toBe(1);
    expect(rec.fills.length).toBeGreaterThan(1);
    rec.fills.filter(fill => fill !== body).forEach(fill => {
      expect(fill.clip.path).toEqual(body.path);
      expect(fill.clip.parent).toBe('caller-clip');
    });
    expect(rec.strokes.length).toBeGreaterThan(0);
    for (const fringe of rec.strokes) {
      expect(fringe.path).toEqual(body.path);
      expect(fringe.lineWidth).toBeGreaterThan(0);
      expect(fringe.clip).toBe('caller-clip');
      const alpha = Number(fringe.strokeStyle.match(/,([\d.]+)\)$/)?.[1]);
      expect(alpha).toBeGreaterThan(0); expect(alpha).toBeLessThan(0.25);
    }
  });

  it('lights the common body and billows from the same fixed launch Sun', () => {
    const g = geometry(), rec = draw(g), sunlight = P.launchSunlight(0);
    const body = rec.gradients.find(item => item.kind === 'createLinearGradient');
    const [x0, y0, x1, y1] = body.coordinates;
    expect((x0 - x1) * sunlight.x + (y0 - y1) * sunlight.y).toBeGreaterThan(0);
    expect((x0 - x1) * sunlight.y - (y0 - y1) * sunlight.x).toBeCloseTo(0, 12);
    const highlights = rec.gradients.filter(item => item.kind === 'createRadialGradient').slice(0, g.billows.length);
    expect(highlights.length).toBe(g.billows.length);
    highlights.forEach((highlight, index) => {
      expect((highlight.coordinates[0] - g.billows[index].x) * sunlight.x).toBeGreaterThan(0);
      expect(highlight.coordinates[1]).toBeLessThan(0);
    });
  });

  it('fades radial highlights to transparent edges and removes the central heat glow during coast', () => {
    const powered = draw(geometry()), coast = draw(geometry(8, 800, 400, 0, false));
    const poweredRadials = powered.gradients.filter(g => g.kind === 'createRadialGradient');
    const coastRadials = coast.gradients.filter(g => g.kind === 'createRadialGradient');
    expect(poweredRadials.length).toBe(coastRadials.length + 1);
    expect(coastRadials.length).toBe(geometry().billows.length);
    expect(powered.fills[0].path).toEqual(coast.fills[0].path);
    for (const radial of poweredRadials) {
      expect(radial.coordinates[2]).toBe(0);
      expect(radial.coordinates[5]).toBeGreaterThan(0);
      expect(radial.stops.at(-1)).toEqual([1, expect.stringMatching(/,0\)$/)]);
    }
    const warm = poweredRadials.at(-1);
    expect(warm.coordinates[0]).toBe(0);
    expect(warm.coordinates[3]).toBe(0);
  });

  it('renders deterministic finite paths and gradients across supported viewport sizes', () => {
    const expected = signature(draw(geometry(6.75)));
    draw(geometry(2)); draw(geometry(12));
    expect(signature(draw(geometry(6.75)))).toEqual(expected);
    for (const [width, height] of [[1, 1], [320, 240], [1100, 640], [1000000, 1000000]]) {
      const rec = draw(geometry(8, width, height));
      expect(rec.result).not.toBeNull();
      for (const call of rec.calls) {
        expect(call.slice(1).filter(value => typeof value === 'number').every(Number.isFinite)).toBe(true);
      }
      for (const gradient of rec.gradients) {
        expect(gradient.coordinates.every(Number.isFinite)).toBe(true);
        gradient.stops.forEach(([offset, color]) => {
          expect(offset).toBeGreaterThanOrEqual(0); expect(offset).toBeLessThanOrEqual(1);
          expect(color).not.toMatch(/NaN|Infinity/);
        });
      }
      expect(rec.state).toEqual(rec.initial);
    }
  });

  it('retains a coherent body and caller state when gradients are unavailable', () => {
    for (const gradient of ['missing', 'null', 'malformed']) {
      const rec = draw(geometry(), { gradient });
      expect(rec.result).not.toBeNull();
      expect(rec.fills.length).toBe(1);
      expect(rec.fills[0].path.at(-1)[0]).toBe('closePath');
      expect(typeof rec.fills[0].fillStyle).toBe('string');
      expect(rec.fills[0].fillStyle.length).toBeGreaterThan(0);
      expect(rec.state).toEqual(rec.initial);
      expect(rec.stack).toEqual([]);
    }
  });
});
