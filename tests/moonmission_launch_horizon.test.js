/** A rectilinear launch camera sees the tangent to a spherical Earth. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const RADIUS = 6371000;
const invalid = [undefined, null, NaN, Infinity, -Infinity, '400'];
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

// Observer (0, 1 + h/R, 0), Earth radius 1, and the unnormalised camera ray
// (screenX/f, -screenY/f, 1). Solving the ray/sphere quadratic independently
// avoids using the renderer's closed-form horizon expression as its oracle.
function ray(altitude, width, height, x, y) {
  const distance = 1 + altitude / RADIUS;
  const focal = height * Math.sqrt(3) / 2;
  const dx = (x - width / 2) / focal;
  const dy = -(y - height * 0.6) / focal;
  const a = dx * dx + dy * dy + 1;
  const b = 2 * distance * dy;
  const c = distance * distance - 1;
  return { a, b, c, discriminant: b * b - 4 * a * c };
}
function tangentOracle(altitude, width, height, x) {
  if (altitude === 0) return height * 0.6;
  let above = height * 0.6, below = height * 2;
  while (ray(altitude, width, height, x, below).discriminant < 0) below *= 2;
  for (let i = 0; i < 64; i++) {
    const middle = (above + below) / 2;
    if (ray(altitude, width, height, x, middle).discriminant < 0) above = middle;
    else below = middle;
  }
  return (above + below) / 2;
}
function recordingCanvas() {
  const calls = [], fills = [], stack = [];
  let path = [];
  const state = { globalAlpha: 0.37, fillStyle: '#123456', lineWidth: 7 };
  const ctx = new Proxy(state, {
    get(target, key) {
      if (['beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'clip', 'save', 'restore'].includes(key)) {
        return (...args) => {
          calls.push([key, ...args]);
          if (key === 'beginPath') path = [];
          if (['moveTo', 'lineTo', 'closePath'].includes(key)) path.push([key, ...args]);
          if (key === 'save') stack.push({ ...state });
          if (key === 'restore') Object.assign(state, stack.pop());
          if (key === 'fill') fills.push({ alpha: state.globalAlpha, style: state.fillStyle, path: path.map(call => [...call]) });
        };
      }
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, calls, fills, stack, state };
}

describe('Launch horizon geometry', () => {
  it('states a spherical Earth and a nominal 60-degree vertical camera field', () => {
    const g = P.launchHorizonGeometry(80000, 1014, 400);
    expect(g.width).toBe(1014);
    expect(g.height).toBe(400);
    expect(g.altitude).toBe(80000);
    expect(g.radius).toBe(RADIUS);
    expect(g.fieldDegrees).toBe(60);
    expect(g.eyeY).toBe(240);
    expect(g.focal).toBeCloseTo(200 * Math.sqrt(3), 12);
  });

  it('has a flat, zero-dip horizon at the surface', () => {
    const g = P.launchHorizonGeometry(0, 310, 400);
    expect(g.dipDegrees).toBe(0);
    expect(g.tangent).toBe(0);
    expect(g.earth.every(point => point.y === 240)).toBe(true);
    for (const x of [-1000, 0, 155, 310, 1500]) expect(P.launchHorizonAt(g, x)).toBe(240);
  });

  it('rejects nonnumeric, nonfinite, zero and negative canvas dimensions', () => {
    for (const dimension of [...invalid, 0, -1]) {
      expect(P.launchHorizonGeometry(1000, dimension, 400)).toBeNull();
      expect(P.launchHorizonGeometry(1000, 640, dimension)).toBeNull();
    }
  });

  it('normalizes invalid and underground heights to the surface', () => {
    const surface = P.launchHorizonGeometry(0, 640, 400);
    for (const altitude of [...invalid, -1, -RADIUS]) {
      expect(P.launchHorizonGeometry(altitude, 640, 400)).toEqual(surface);
    }
  });

  it('covers both canvas edges with a centered, even and bounded point spacing', () => {
    for (const width of [1, 310, 480, 1014, 1920, 3840]) {
      const g = P.launchHorizonGeometry(185000, width, 400);
      const segments = g.earth.length - 1;
      expect(segments).toBeGreaterThanOrEqual(16);
      expect(segments % 2).toBe(0);
      expect(g.earth[0].x).toBe(-20);
      expect(g.earth[segments].x).toBeCloseTo(width + 20, 10);
      expect(g.earth[segments / 2].x).toBeCloseTo(width / 2, 10);
      g.earth.forEach((point, index) => {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        if (index) {
          expect(point.x - g.earth[index - 1].x).toBeGreaterThan(0);
          expect(point.x - g.earth[index - 1].x).toBeLessThanOrEqual(16 + 1e-10);
        }
      });
    }
  });

  it('bounds geometry work even for extreme finite viewport widths', () => {
    for (const width of [1e6, 1e12, Number.MAX_VALUE]) {
      const g = P.launchHorizonGeometry(1000, width, 400);
      expect(g).not.toBeNull();
      expect(g.earth.length).toBeLessThanOrEqual(1025);
      expect(g.earth.length % 2).toBe(1);
      expect(g.earth.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
    }
  });

  it('rejects finite inputs whose projected limb would overflow', () => {
    expect(P.launchHorizonGeometry(Number.MAX_VALUE, 640, Number.MAX_VALUE)).toBeNull();
    expect(P.launchHorizonGeometry(Number.MAX_VALUE, Number.MAX_VALUE, 400)).toBeNull();
  });

  it('places the generated limb on the independent ray/sphere tangent', () => {
    for (const altitude of [1, 1000, 35000, 80000, 185000, 400000]) {
      for (const [width, height] of [[310, 400], [1014, 400], [1920, 600]]) {
        const g = P.launchHorizonGeometry(altitude, width, height);
        for (const point of g.earth) {
          expect(Math.abs(point.y - tangentOracle(altitude, width, height, point.x))).toBeLessThan(1e-7);
          const r = ray(altitude, width, height, point.x, point.y);
          expect(Math.abs(r.discriminant)).toBeLessThan(1e-10);
          expect(-r.b / (2 * r.a), 'tangency is in front of the camera').toBeGreaterThan(0);
        }
      }
    }
  });

  it('separates clear sky above the limb from forward Earth intersections below it', () => {
    for (const altitude of [1000, 35000, 185000]) {
      const g = P.launchHorizonGeometry(altitude, 1014, 400);
      for (const x of [0, 160, 507, 854, 1014]) {
        const y = P.launchHorizonAt(g, x);
        const above = ray(altitude, 1014, 400, x, y - 0.25);
        const below = ray(altitude, 1014, 400, x, y + 0.25);
        expect(above.discriminant).toBeLessThan(0);
        expect(below.discriminant).toBeGreaterThan(0);
        expect((-below.b - Math.sqrt(below.discriminant)) / (2 * below.a)).toBeGreaterThan(0);
      }
    }
  });

  it('reports physical center dip and lets the horizon sink continuously with altitude', () => {
    let last = 240;
    for (const altitude of [1, 100, 1000, 10000, 35000, 80000, 185000, 400000]) {
      const g = P.launchHorizonGeometry(altitude, 1014, 400);
      const dip = Math.acos(RADIUS / (RADIUS + altitude));
      expect(g.dipDegrees).toBeCloseTo(dip * 180 / Math.PI, 8);
      const centerY = P.launchHorizonAt(g, 507);
      expect(Math.atan2(centerY - g.eyeY, g.focal)).toBeCloseTo(dip, 10);
      expect(centerY).toBeGreaterThan(last);
      last = centerY;
    }
  });

  it('is symmetric about the optical center and curves downward toward both edges', () => {
    const g = P.launchHorizonGeometry(185000, 1014, 400);
    const centerY = P.launchHorizonAt(g, 507);
    g.earth.forEach((point, index) => {
      const mirrored = g.earth[g.earth.length - 1 - index];
      expect(point.x + mirrored.x).toBeCloseTo(1014, 10);
      expect(point.y).toBeCloseTo(mirrored.y, 10);
      expect(point.y).toBeGreaterThanOrEqual(centerY);
    });
    expect(P.launchHorizonAt(g, 0) - centerY).toBeGreaterThan(50);
  });

  it('treats width changes as a horizontal crop of the same camera', () => {
    for (const altitude of [1000, 80000, 185000]) {
      const wide = P.launchHorizonGeometry(altitude, 1014, 400);
      const narrow = P.launchHorizonGeometry(altitude, 310, 400);
      expect(narrow.dipDegrees).toBe(wide.dipDegrees);
      expect(narrow.focal).toBe(wide.focal);
      for (const offset of [-155, -80, 0, 80, 155]) {
        expect(P.launchHorizonAt(narrow, 155 + offset)).toBeCloseTo(P.launchHorizonAt(wide, 507 + offset), 12);
      }
    }
  });

  it('scales the projection with display height without changing its angular dip', () => {
    const base = P.launchHorizonGeometry(80000, 640, 400);
    for (const scale of [0.5, 1.5, 2, 3]) {
      const larger = P.launchHorizonGeometry(80000, 640 * scale, 400 * scale);
      expect(larger.dipDegrees).toBe(base.dipDegrees);
      for (const x of [0, 91, 320, 507, 640]) {
        expect(P.launchHorizonAt(larger, x * scale)).toBeCloseTo(P.launchHorizonAt(base, x) * scale, 10);
      }
    }
  });

  it('keeps the line-segment silhouette within one tenth of a pixel of the physical limb', () => {
    for (const [width, height] of [[310, 400], [480, 400], [1014, 400], [1600, 600], [320, 240], [3840, 1080]]) {
      for (const altitude of [1000, 80000, 185000, 400000]) {
        const g = P.launchHorizonGeometry(altitude, width, height);
        for (let index = 1; index < g.earth.length; index++) {
          const a = g.earth[index - 1], b = g.earth[index];
          for (const fraction of [0.25, 0.5, 0.75]) {
            const x = a.x + (b.x - a.x) * fraction;
            const chordY = a.y + (b.y - a.y) * fraction;
            expect(Math.abs(chordY - tangentOracle(altitude, width, height, x))).toBeLessThan(0.1);
          }
        }
      }
    }
  });

  it('evaluates arbitrary ray positions independently of the sampled path', () => {
    const g = P.launchHorizonGeometry(80000, 640, 400);
    for (const x of [-200, -20, 13.7, 319.123, 555.55, 660, 840]) {
      expect(P.launchHorizonAt(g, x)).toBeCloseTo(tangentOracle(80000, 640, 400, x), 8);
    }
    for (const x of invalid) expect(P.launchHorizonAt(g, x)).toBeNull();
    expect(P.launchHorizonAt(null, 320)).toBeNull();
  });
});

describe('Launch horizon glow', () => {
  const opacity = fill => Number(fill.style.match(/^rgba\(147,197,253,([^\)]+)\)$/)[1]);
  const composite = fills => fills.reduce((alpha, fill) => {
    const source = opacity(fill) * fill.alpha;
    return source + alpha * (1 - source);
  }, 0);

  it('composites nested bands to the intended exposure while preserving inherited opacity and state', () => {
    const g = P.launchHorizonGeometry(80000, 640, 400), rec = recordingCanvas();
    const beforeState = { ...rec.state }, beforeGeometry = JSON.stringify(g);
    expect(P.drawLaunchHorizonGlow(rec.ctx, g, 0.4)).toBe(g);
    expect(rec.fills).toHaveLength(24);
    expect(rec.calls[0]).toEqual(['save']);
    expect(rec.calls[rec.calls.length - 1]).toEqual(['restore']);
    expect(rec.stack).toEqual([]);
    expect(rec.state).toEqual(beforeState);
    expect(JSON.stringify(g)).toBe(beforeGeometry);
    rec.fills.forEach((fill, index) => {
      expect(fill.alpha).toBe(1);
      expect(opacity(fill)).toBeGreaterThan(0);
      expect(opacity(fill)).toBeLessThan(1);
      expect(composite(rec.fills.slice(0, index + 1))).toBeCloseTo(0.9 * 0.4 * 0.37 * (index + 1) / 24, 12);
      expect(fill.path[0][1]).toBe(g.earth[0].x);
      expect(fill.path[0][2]).toBeGreaterThanOrEqual(g.earth[0].y - 20);
      expect(fill.path[0][2]).toBeLessThanOrEqual(g.earth[0].y);
      if (index) expect(fill.path[0][2]).toBeGreaterThan(rec.fills[index - 1].path[0][2]);
      expect(fill.path[fill.path.length - 1]).toEqual(['closePath']);
    });
    expect(rec.fills[23].path[0]).toEqual(['moveTo', g.earth[0].x, g.earth[0].y]);
    expect(composite(rec.fills)).toBeCloseTo(0.1332, 12);
  });

  it('clamps exposure and skips invisible or missing inputs without touching the caller state', () => {
    const g = P.launchHorizonGeometry(80000, 640, 400);
    for (const exposure of [0, -1, ...invalid]) {
      const rec = recordingCanvas(), before = { ...rec.state };
      expect(P.drawLaunchHorizonGlow(rec.ctx, g, exposure)).toBe(g);
      expect(rec.calls).toEqual([]);
      expect(rec.state).toEqual(before);
    }
    const bright = recordingCanvas();
    P.drawLaunchHorizonGlow(bright.ctx, g, 2);
    expect(composite(bright.fills)).toBeCloseTo(0.9 * 0.37, 12);
    const invisible = recordingCanvas();
    invisible.ctx.globalAlpha = 0;
    P.drawLaunchHorizonGlow(invisible.ctx, g, 1);
    expect(invisible.calls).toEqual([]);
    expect(invisible.state.globalAlpha).toBe(0);
    expect(P.drawLaunchHorizonGlow(null, g, 1)).toBeNull();
    expect(P.drawLaunchHorizonGlow(invisible.ctx, null, 1)).toBeNull();
    expect(invisible.calls).toEqual([]);
  });
});

describe('Launch horizon Canvas path', () => {
  it('starts a fresh open silhouette using every computed point in order', () => {
    const g = P.launchHorizonGeometry(80000, 640, 400);
    const rec = recordingCanvas();
    expect(P.launchHorizonPath(rec.ctx, g, false)).toBe(true);
    expect(rec.calls).toEqual([
      ['beginPath'], ['moveTo', g.earth[0].x, g.earth[0].y],
      ...g.earth.slice(1).map(point => ['lineTo', point.x, point.y]),
    ]);
  });

  it('closes the ground silhouette below the viewport without a giant circle', () => {
    const g = P.launchHorizonGeometry(185000, 1014, 400);
    const rec = recordingCanvas();
    P.launchHorizonPath(rec.ctx, g, true);
    const limbEnd = 1 + g.earth.length;
    const closure = rec.calls.slice(limbEnd);
    expect(closure).toHaveLength(3);
    expect(closure[0][0]).toBe('lineTo');
    expect(closure[0][1]).toBe(g.earth[g.earth.length - 1].x);
    expect(closure[0][2]).toBeGreaterThanOrEqual(g.height);
    expect(closure[1]).toEqual(['lineTo', g.earth[0].x, closure[0][2]]);
    expect(closure[2]).toEqual(['closePath']);
  });

  it('uses vertical offsets for parallel glow paths and defaults invalid offsets to zero', () => {
    const g = P.launchHorizonGeometry(35000, 310, 400);
    for (const offset of [3.5, -8, 0, ...invalid]) {
      const rec = recordingCanvas();
      P.launchHorizonPath(rec.ctx, g, false, offset);
      const normalized = Number.isFinite(offset) ? offset : 0;
      const points = rec.calls.slice(1);
      expect(points).toHaveLength(g.earth.length);
      points.forEach((call, index) => expect(call.slice(1)).toEqual([g.earth[index].x, g.earth[index].y + normalized]));
    }
  });

  it('leaves Canvas paint state and geometry intact for the caller to fill, clip or stroke', () => {
    const g = P.launchHorizonGeometry(80000, 640, 400);
    const before = JSON.stringify(g), rec = recordingCanvas();
    const state = { ...rec.state };
    P.launchHorizonPath(rec.ctx, g, true, -4);
    expect(rec.state).toEqual(state);
    expect(JSON.stringify(g)).toBe(before);
    expect(rec.calls.some(call => ['fill', 'stroke', 'clip', 'save', 'restore'].includes(call[0]))).toBe(false);
  });

  it('ignores missing geometry or context without beginning a partial path', () => {
    const rec = recordingCanvas();
    expect(P.launchHorizonPath(rec.ctx, null, true)).toBe(false);
    expect(P.launchHorizonPath(null, P.launchHorizonGeometry(0, 640, 400), true)).toBe(false);
    expect(rec.calls).toEqual([]);
  });
});
