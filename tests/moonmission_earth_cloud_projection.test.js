/** Clouds cover spherical caps, including the visible part of a cap behind the limb. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
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

function recordingCtx() {
  const commands = [], gradients = [], properties = {};
  const ctx = new Proxy(properties, {
    get(target, key) {
      if (/^create(?:Linear|Radial|Conic)Gradient$/.test(String(key))) return (...coords) => {
        const id = gradients.length;
        const gradient = {
          id, kind: key, coords, stops: [],
          addColorStop(offset, color) { this.stops.push([offset, color]); commands.push(['stop', id, offset, color]); },
        };
        gradients.push(gradient);
        commands.push(['gradient', key, id, ...coords]);
        return gradient;
      };
      if (key === 'measureText') return text => ({ width: String(text).length * 6 });
      return key in target ? target[key] : (...args) => commands.push(['call', key, ...args]);
    },
    set(target, key, value) {
      target[key] = value;
      commands.push(['set', key, value && typeof value === 'object' && 'id' in value ? { gradient: value.id } : value]);
      return true;
    },
  });
  return { ctx, commands, gradients };
}
const digest = commands => createHash('sha256').update(JSON.stringify(commands)).digest('hex');
const TAU = 2 * Math.PI;
const normalAt = (z, angle = 0) => [Math.sqrt(Math.max(0, 1 - z * z)) * Math.cos(angle), Math.sqrt(Math.max(0, 1 - z * z)) * Math.sin(angle), z];
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
function contour(cap, cx = 0, cy = 0, r = 1) {
  const rec = recordingCtx();
  const result = P.drawEarthCloudCap(rec.ctx, cx, cy, r, cap);
  return { ...rec, result };
}
function globe(args, opts) {
  const rec = recordingCtx();
  P.drawEarthGlobe(rec.ctx, ...args, opts);
  return rec;
}

// Sample the actual Canvas contour, rather than reconstructing its intended shape.
function polygon(commands) {
  const points = [];
  for (const [kind, op, ...a] of commands) {
    if (kind !== 'call') continue;
    if (op === 'moveTo' || op === 'lineTo') points.push(a.slice(0, 2));
    if (op !== 'ellipse' && op !== 'arc') continue;
    const [cx, cy, rx, ry, rot, start, end, reverse] = op === 'ellipse' ? a : [a[0], a[1], a[2], a[2], 0, a[3], a[4], a[5]];
    let sweep = end - start;
    if (!reverse && sweep >= TAU) sweep = TAU;
    else if (reverse && sweep <= -TAU) sweep = -TAU;
    else if (reverse) sweep = -((start - end) % TAU + TAU) % TAU;
    else sweep = ((end - start) % TAU + TAU) % TAU;
    const count = Math.max(2, Math.ceil(Math.abs(sweep) / TAU * 1024));
    for (let i = 0; i <= count; i++) {
      const t = start + sweep * i / count, x = rx * Math.cos(t), y = ry * Math.sin(t);
      points.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
  }
  return points;
}
function contains(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function area(points) {
  return Math.abs(points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length];
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0)) / 2;
}

// Captured from the accepted renderer before pass62 edits, source SHA-256
// cc732d739943507f290f82a8104343b865abcdaba14e6cba98928615e4d91a0b.
const preserved = [
  ['tiny', [12, 34, 2, 0, 0, undefined], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true }, '77b9267000c7050105202f080bd6488316519e6f665e224e943aae9c7ed448f4'],
  ['default', [12, 34, 86, 500, undefined, undefined], undefined, '44b82f2c0b77abf59769aff1c913a030a33c1c5fbcd765e359ce010962cb4313'],
  ['legacy Sun', [12, 34, 86, 2000, 0, undefined], undefined, '09db2e11936732831944947b29c89d422c0aa1d0f2cd34207d13daa1f734279e'],
  ['surface', [12, 34, 86, 500, 0, undefined], { surfaceLight: true }, '14ceac0fc1eb17dd0e5f3a0501e4e7a96c094b42072981e71fbbe61832166f96'],
  ['thin shell', [12, 34, 86, 500, 0, undefined], { surfaceLight: true, thinAtmosphere: true }, '2b0ac3b034711ab99e9b213c7cac9bc2018db3f38b1f66f3cb22e65429458220'],
  ['ocean glint', [12, 34, 86, 1800, 0.7, undefined], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true }, '9f16656044c3d5f5fa5248bd9b33607253f8da0a7f6194a29625af3f9c67d944'],
  ['rotated glint', [12, 34, 86, 4000, 1.1, undefined], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true }, '0ef370dd22df4478760212a57bacf805f23462455fbe7aed0b9875c69fbb9033'],
  ['crescent', [12, 34, 86, 500, -2.3, 0.25], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true }, '13d795667058438c500d9e7e232209f0816f67a7c35ff07c96ab325d04168b3c'],
  ['gibbous', [12, 34, 86, 500, 0.7, 0.75], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true }, 'd2fc0d4a724b3434f7317ac0cf0e63b2c77340cfe5066febfa31ea43aa34fc4d'],
];

describe('Spherical cloud cap geometry', () => {
  it('projects the center and circular boundary of a cap on the visible sphere', () => {
    for (const rho of [0.01, 0.12, 0.4]) for (const z of [0.5, 0.8, 1]) {
      const n = normalAt(z, 0.7), cap = P.earthCloudCap(...n, rho);
      expect(cap.partial).toBe(false);
      expect(cap.x).toBeCloseTo(Math.cos(rho) * n[0], 12);
      expect(cap.y).toBeCloseTo(Math.cos(rho) * n[1], 12);
      expect(cap.across).toBeCloseTo(z * Math.sin(rho), 12);
      expect(cap.along).toBeCloseTo(Math.sin(rho), 12);
      const points = polygon(contour(cap).commands);
      let planeError = 0, sphereOverflow = 0;
      for (const [u, v] of points) {
        const p = [u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v))];
        planeError = Math.max(planeError, Math.abs(dot(p, n) - Math.cos(rho)));
        sphereOverflow = Math.max(sphereOverflow, u * u + v * v - 1);
      }
      expect(planeError).toBeLessThan(1e-11);
      expect(sphereOverflow).toBeLessThan(1e-12);
    }
  });

  it('preserves shape when the camera plane rotates', () => {
    for (const z of [-0.1, 0, 0.1, 0.6]) for (const turn of [-2, -0.4, 1.8]) {
      const a = P.earthCloudCap(...normalAt(z), 0.2), b = P.earthCloudCap(...normalAt(z, turn), 0.2);
      expect(b.x).toBeCloseTo(a.x * Math.cos(turn), 12);
      expect(b.y).toBeCloseTo(a.x * Math.sin(turn), 12);
      for (const key of ['along', 'across', 'z', 'start', 'end', 'limbHalfAngle']) expect(b[key]).toBeCloseTo(a[key], 12);
      expect(b.partial).toBe(a.partial);
      expect(b.reverse).toBe(a.reverse);
      expect(Math.cos(b.rot - a.rot)).toBeCloseTo(Math.cos(turn), 12);
      expect(Math.sin(b.rot - a.rot)).toBeCloseTo(Math.sin(turn), 12);
    }
  });

  it('keeps partially visible caps after their centers cross the horizon', () => {
    const rho = 0.2, edge = Math.sin(rho);
    expect(P.earthCloudCap(...normalAt(-edge - 1e-8), rho)).toBeNull();
    const nearHidden = P.earthCloudCap(...normalAt(-edge + 1e-6), rho);
    expect(nearHidden.partial).toBe(true);
    expect(area(polygon(contour(nearHidden).commands))).toBeGreaterThan(0);
    for (const z of [-0.15, -0.01, 0, 0.01, 0.05, 0.15]) expect(P.earthCloudCap(...normalAt(z), rho).partial).toBe(true);
    expect(P.earthCloudCap(...normalAt(edge + 1e-8), rho).partial).toBe(false);
  });

  it('matches an independent ray/sphere membership test on both sides of the horizon', () => {
    let checked = 0, interior = 0, mismatches = 0;
    for (const z of [-0.24, -0.12, -0.000001, 0, 0.000001, 0.12, 0.24, 0.7, 1]) {
      for (const turn of [0, 0.8, -1.9]) {
        const n = normalAt(z, turn), rho = 0.3, cap = P.earthCloudCap(...n, rho);
        const points = polygon(contour(cap).commands), cos = Math.cos(rho);
        for (let iy = 0; iy < 59; iy++) for (let ix = 0; ix < 59; ix++) {
          const u = -1.01 + ix * 2.02 / 58, v = -1.01 + iy * 2.02 / 58, rr = u * u + v * v;
          if (rr > 1 || rr > 0.9999) continue;
          const membership = dot(n, [u, v, Math.sqrt(1 - rr)]) - cos;
          if (Math.abs(membership) < 0.0001) continue;
          checked++;
          interior += membership > 0 ? 1 : 0;
          if (contains(points, u, v) !== (membership > 0)) mismatches++;
        }
      }
    }
    expect(checked).toBeGreaterThan(60000);
    expect(interior).toBeGreaterThan(500);
    expect(mismatches).toBe(0);
  });

  it('has continuous projected area as the cap center crosses the horizon', () => {
    const rho = 0.28;
    const samples = [-0.000001, 0, 0.000001].map(z => area(polygon(contour(P.earthCloudCap(...normalAt(z, 0.6), rho)).commands)));
    expect(samples[0]).toBeGreaterThan(0.005);
    expect(samples[0]).toBeLessThan(samples[1]);
    expect(samples[1]).toBeLessThan(samples[2]);
    expect(samples[2] - samples[0]).toBeLessThan(1e-6);
  });

  it('rejects malformed normals and angles without creating non-finite geometry', () => {
    for (const args of [[NaN, 0, 1, 0.2], [0, Infinity, 1, 0.2], [0, 0, '1', 0.2], [0, 0, 0, 0.2], [0.5, 0.5, 0.5, 0.2], [0, 0, 1.1, 0.2], [0, 0, 1, 0], [0, 0, 1, -0.1], [0, 0, 1, Math.PI / 2], [0, 0, 1, Infinity], [0, 0, 1, '0.2']]) {
      expect(P.earthCloudCap(...args)).toBeNull();
    }
    expect(P.earthCloudCap(0, 0, 1 + 1e-9, 0.2).z).toBe(1);
    for (const z of [-0.19, 0, 0.01, 0.2, 1]) {
      const cap = P.earthCloudCap(...normalAt(z), 0.2);
      for (const value of Object.values(cap)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('Seeded spherical cloud field', () => {
  it('uses the existing cloud locations and angular sizes on the front hemisphere', () => {
    for (const tick of [0, 500, 2000, 4000]) {
      const old = P.earthClouds(0, 0, 1, tick), current = P.earthSphericalClouds(0, 0, 1, tick);
      const byId = new Map(current.map(cap => [cap.i, cap]));
      expect(current.length).toBeGreaterThanOrEqual(old.length);
      expect(new Set(current.map(cap => cap.i)).size).toBe(current.length);
      for (const previous of old) {
        const cap = byId.get(previous.i), rho = previous.along;
        expect(cap).toBeTruthy();
        expect(cap.x).toBeCloseTo(previous.x * Math.cos(rho), 12);
        expect(cap.y).toBeCloseTo(previous.y * Math.cos(rho), 12);
        expect(cap.along).toBeCloseTo(Math.sin(rho), 12);
        expect(cap.across).toBeCloseTo(previous.z * Math.sin(rho), 12);
        expect(cap.z).toBeCloseTo(previous.z, 12);
      }
    }
  });

  it('returns clouds across the old center cutoff, including visible far-side footprints', () => {
    let belowOldCutoff = 0, beyondHorizon = 0;
    for (const tick of [0, 500, 1800, 2000, 4000, 7000]) {
      const caps = P.earthSphericalClouds(0, 0, 1, tick);
      for (const cap of caps) {
        if (cap.z <= 0.05) belowOldCutoff++;
        if (cap.z < 0) { beyondHorizon++; expect(cap.partial).toBe(true); }
      }
    }
    expect(belowOldCutoff).toBeGreaterThan(20);
    expect(beyondHorizon).toBeGreaterThan(5);
  });

  it('scales and translates the field without changing angular geometry', () => {
    const base = P.earthSphericalClouds(0, 0, 1, 1800);
    for (const radius of [0.5, 16, 86, 2000]) {
      const scaled = P.earthSphericalClouds(31, -9, radius, 1800);
      expect(scaled).toHaveLength(base.length);
      for (let i = 0; i < base.length; i++) {
        expect(scaled[i].x).toBeCloseTo(31 + radius * base[i].x, 10);
        expect(scaled[i].y).toBeCloseTo(-9 + radius * base[i].y, 10);
        expect(scaled[i].along).toBeCloseTo(radius * base[i].along, 10);
        expect(scaled[i].across).toBeCloseTo(radius * base[i].across, 10);
        for (const key of ['i', 'rot', 'z', 'partial', 'start', 'end', 'reverse', 'limbHalfAngle']) expect(scaled[i][key]).toBe(base[i][key]);
      }
    }
  });

  it('repeats after one sidereal rotation and returns independent results', () => {
    const tick = 1800, a = P.earthSphericalClouds(0, 0, 1, tick), b = P.earthSphericalClouds(0, 0, 1, tick + 360 / 0.0458);
    expect(a.map(c => c.i)).toEqual(b.map(c => c.i));
    for (let i = 0; i < a.length; i++) {
      for (const key of ['x', 'y', 'along', 'across', 'z', 'start', 'end', 'limbHalfAngle']) expect(a[i][key]).toBeCloseTo(b[i][key], 10);
      expect(Math.cos(a[i].rot)).toBeCloseTo(Math.cos(b[i].rot), 10);
      expect(Math.sin(a[i].rot)).toBeCloseTo(Math.sin(b[i].rot), 10);
      expect(a[i].partial).toBe(b[i].partial);
    }
    const snapshot = JSON.parse(JSON.stringify(a));
    a[0].x = 1000; a[0].i = -1; a.pop();
    expect(P.earthSphericalClouds(0, 0, 1, tick)).toEqual(snapshot);
  });

  it('defaults only an omitted tick and rejects invalid field coordinates', () => {
    expect(P.earthSphericalClouds(0, 0, 1)).toEqual(P.earthSphericalClouds(0, 0, 1, 0));
    for (const args of [[NaN, 0, 1, 0], [0, Infinity, 1, 0], [0, 0, 0, 0], [0, 0, -1, 0], [0, 0, '1', 0], [0, 0, 1, null], [0, 0, 1, NaN], [0, 0, 1, '0']]) {
      expect(P.earthSphericalClouds(...args)).toEqual([]);
    }
  });
});

describe('Canvas cloud contour and opt-in integration', () => {
  it('appends one closed contour with no paint or Canvas state changes', () => {
    for (const z of [-0.1, 0, 0.1, 0.6, 1]) {
      const cap = P.earthCloudCap(...normalAt(z, 0.7), 0.2), rec = contour(cap);
      expect(rec.result).toBe(true);
      expect(rec.commands[0][1]).toBe('moveTo');
      expect(rec.commands.at(-1)).toEqual(['call', 'closePath']);
      const allowed = new Set(['moveTo', 'ellipse', 'lineTo', 'arc', 'closePath']);
      for (const command of rec.commands) {
        expect(command[0]).toBe('call');
        expect(allowed.has(command[1])).toBe(true);
      }
      expect(rec.commands.filter(c => c[1] === 'closePath')).toHaveLength(1);
      expect(rec.commands.filter(c => c[1] === 'arc')).toHaveLength(cap.partial ? 1 : 0);
      expect(rec.commands.filter(c => c[1] === 'lineTo')).toHaveLength(z === 0 ? 1 : 0);
    }
  });

  it('joins partial cap boundaries to the actual circular limb in world coordinates', () => {
    for (const z of [-0.15, 0, 0.15]) {
      const cap = P.earthCloudCap(...normalAt(z, -0.8), 0.25);
      const cx = 31, cy = -9, r = 86;
      const world = { ...cap, x: cx + r * cap.x, y: cy + r * cap.y, along: r * cap.along, across: r * cap.across };
      const rec = contour(world, cx, cy, r), points = polygon(rec.commands);
      const arc = rec.commands.find(c => c[1] === 'arc');
      expect(arc.slice(2, 5)).toEqual([cx, cy, r]);
      let overflow = 0;
      for (const [x, y] of points) overflow = Math.max(overflow, Math.hypot(x - cx, y - cy) - r);
      expect(overflow).toBeLessThan(1e-10);
      // Both contour joins meet the globe limb, rather than a chord across it.
      expect(Math.hypot(points[0][0] - cx, points[0][1] - cy)).toBeCloseTo(r, 10);
      expect(points.at(-1)[0]).toBeCloseTo(points[0][0], 10);
      expect(points.at(-1)[1]).toBeCloseTo(points[0][1], 10);
    }
  });

  it('does not touch the Canvas for invalid contour input', () => {
    const cap = P.earthCloudCap(0, 0, 1, 0.2);
    for (const broken of [null, { ...cap, x: NaN }, { ...cap, along: 0 }, { ...cap, across: -1 }, { ...cap, start: Infinity }]) {
      const rec = contour(broken);
      expect(rec.result).toBe(false);
      expect(rec.commands).toEqual([]);
    }
    for (const [cx, cy, r] of [[NaN, 0, 1], [0, Infinity, 1], [0, 0, 0], [0, 0, -1]]) {
      const rec = contour(cap, cx, cy, r);
      expect(rec.result).toBe(false);
      expect(rec.commands).toEqual([]);
    }
    expect(P.drawEarthCloudCap(null, 0, 0, 1, cap)).toBe(false);
  });

  it('requires an explicit flag, a shared surface light, a valid Sun and a large enough globe', () => {
    const args = [12, 34, 86, 1800, 0.7, undefined], base = { surfaceLight: true, oceanGlint: true };
    const old = digest(globe(args, base).commands);
    expect(digest(globe(args, { ...base, sphericalClouds: true }).commands)).not.toBe(old);
    for (const flag of [undefined, false, 0, 1, 'true', null]) expect(digest(globe(args, { ...base, sphericalClouds: flag }).commands)).toBe(old);
    for (const light of [undefined, false, 1, 'true']) {
      expect(globe(args, { surfaceLight: light, sphericalClouds: true }).commands).toEqual(globe(args, { surfaceLight: light }).commands);
    }
    for (const sun of [undefined, NaN, Infinity, '0']) {
      const invalidSun = [12, 34, 86, 1800, sun, undefined];
      expect(globe(invalidSun, { ...base, sphericalClouds: true }).commands).toEqual(globe(invalidSun, base).commands);
    }
    for (const phase of [0, 0.25, 0.75, 1]) {
      const phased = [12, 34, 86, 1800, 0.7, phase];
      expect(globe(phased, { ...base, sphericalClouds: true }).commands).toEqual(globe(phased, base).commands);
    }
    for (const radius of [0.3, 2, 15.99]) {
      const tiny = [12, 34, radius, 1800, 0.7, undefined];
      expect(globe(tiny, { ...base, sphericalClouds: true }).commands).toEqual(globe(tiny, base).commands);
    }
    const boundary = [12, 34, 16, 1800, 0.7, undefined];
    expect(globe(boundary, { ...base, sphericalClouds: true }).commands).not.toEqual(globe(boundary, base).commands);
  });

  it('merges clouds into one soft path below the common solar exposure', () => {
    const args = [12, 34, 86, 1800, 0.7, undefined];
    const commands = globe(args, { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: true }).commands;
    const cloudPaint = commands.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === 'rgba(255,255,255,0.5)');
    const cloudFill = commands.findIndex((c, i) => i > cloudPaint && c[0] === 'call' && c[1] === 'fill');
    const cloudCommands = commands.slice(cloudPaint, cloudFill + 1);
    const caps = P.earthSphericalClouds(...args.slice(0, 4));
    expect(cloudPaint).toBeGreaterThan(0);
    expect(cloudFill).toBeGreaterThan(cloudPaint);
    expect(cloudCommands.filter(c => c[1] === 'beginPath')).toHaveLength(1);
    expect(cloudCommands.filter(c => c[1] === 'closePath')).toHaveLength(caps.length);
    expect(cloudCommands.filter(c => c[1] === 'fill')).toHaveLength(1);
    expect(commands[cloudPaint - 1]).toEqual(['set', 'filter', 'blur(1.03px)']);
    expect(commands[cloudFill + 1]).toEqual(['call', 'restore']);
    expect(commands.slice(cloudFill + 2).some(c => c[0] === 'gradient' && c[1] === 'createLinearGradient')).toBe(true);
    expect(commands.filter(c => c[1] === 'save').length).toBe(commands.filter(c => c[1] === 'restore').length);
  });
});

describe('Spherical cloud rendering preserves previous callers', () => {
  for (const [name, args, opts, expected] of preserved) {
    it('preserves the accepted ' + name + ' Canvas command stream', () => {
      expect(digest(globe(args, opts).commands)).toBe(expected);
    });
  }
});
