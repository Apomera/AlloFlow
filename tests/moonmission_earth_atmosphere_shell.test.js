/** A Sun-lit atmosphere keeps its physical radial scale around the orbital globe. */
import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const EARTH = 6371000, TOP = 60000;
const HEIGHTS = [0, 2000, 4000, 8000, 14000, 22000, 34000, 46000, 60000];
let P;
beforeAll(() => {
  resetStemLab();
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});

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
function globe(args, opts) {
  const rec = recordingCtx();
  P.drawEarthGlobe(rec.ctx, ...args, opts);
  return rec;
}
function shell(radius, angle = 0, cx = 0, cy = 0) {
  const rec = recordingCtx();
  const result = P.drawEarthGlobeAtmosphere(rec.ctx, cx, cy, radius, angle);
  return { ...rec, result };
}
function paintedPaths(commands) {
  let path = [], color, width;
  const paths = [];
  for (const command of commands) {
    if (command[0] === 'set' && command[1] === 'strokeStyle') color = command[2];
    if (command[0] === 'set' && command[1] === 'lineWidth') width = command[2];
    if (command[0] !== 'call') continue;
    if (command[1] === 'beginPath') path = [];
    else if (command[1] === 'stroke') paths.push({ path: path.slice(), color, width });
    else if (['arc', 'moveTo', 'lineTo', 'closePath'].includes(command[1])) path.push(command);
  }
  return paths;
}
const rgba = color => {
  const match = /^rgba\((\d+),(\d+),(\d+),([\d.eE+-]+)\)$/.exec(color);
  expect(match, 'a finite atmosphere material').not.toBeNull();
  return match.slice(1).map(Number);
};

// Captured from the frozen, accepted pass59 runtime, SHA-256
// 92d8be1bf881c50f24de7fb718f092e75688a97d7caadcf0e817cf2331e6ca52.
// New atmosphere options are deliberately absent from these calls.
const preserved = [
  ['tiny globe', [12, 34, 2, 0, 0, undefined], undefined, '77b9267000c7050105202f080bd6488316519e6f665e224e943aae9c7ed448f4'],
  ['default globe', [12, 34, 86, 500, undefined, undefined], undefined, '44b82f2c0b77abf59769aff1c913a030a33c1c5fbcd765e359ce010962cb4313'],
  ['legacy Sun', [12, 34, 86, 2000, 0, undefined], undefined, '09db2e11936732831944947b29c89d422c0aa1d0f2cd34207d13daa1f734279e'],
  ['surface light only', [12, 34, 86, 500, 0, undefined], { surfaceLight: true }, '14ceac0fc1eb17dd0e5f3a0501e4e7a96c094b42072981e71fbbe61832166f96'],
  ['rotated surface light', [12, 34, 86, 4000, 1.1, undefined], { surfaceLight: true }, '7fdf13aab382a02d572e8f50489539d831c22dd3b9eb6e35c8e55e69ad9bcc91'],
  ['crescent', [12, 34, 86, 500, -2.3, 0.25], { surfaceLight: true }, '13d795667058438c500d9e7e232209f0816f67a7c35ff07c96ab325d04168b3c'],
  ['gibbous', [12, 34, 86, 500, 0.7, 0.75], { surfaceLight: true }, 'd2fc0d4a724b3434f7317ac0cf0e63b2c77340cfe5066febfa31ea43aa34fc4d'],
];

describe('Orbital atmosphere geometry', () => {
  it('keeps shell thickness proportional to the physical 60 km atmosphere at every scale', () => {
    for (const radius of [0.01, 2, 3, 14, 70, 86, 1000, 1000000]) {
      const g = P.earthGlobeAtmosphereGeometry(radius);
      expect(g).toEqual({ radius, outerRadius: radius * (1 + TOP / EARTH), topHeight: TOP, bands: 8, segments: 128 });
      expect((g.outerRadius - radius) / radius).toBeCloseTo(TOP / EARTH, 12);
    }
    expect(P.earthGlobeAtmosphereGeometry(70).outerRadius - 70).toBeLessThan(0.66);
  });

  it('rejects invalid geometry and overflow before any Canvas drawing', () => {
    for (const radius of [undefined, null, false, '70', NaN, Infinity, -Infinity, -1, 0, Number.MAX_VALUE]) {
      expect(P.earthGlobeAtmosphereGeometry(radius), String(radius)).toBeNull();
      const rec = shell(radius);
      expect(rec.result).toBeNull();
      expect(rec.commands).toEqual([]);
    }
    for (const [cx, cy, angle] of [[NaN, 0, 0], [0, Infinity, 0], [0, 0, -Infinity], [0, 0, null], [0, 0, '0']]) {
      const rec = shell(70, angle, cx, cy);
      expect(rec.result).toBeNull();
      expect(rec.commands).toEqual([]);
    }
    expect(P.drawEarthGlobeAtmosphere(null, 0, 0, 70, 0)).toBeNull();
  });

  it('draws every band within its measured annulus without a minimum pixel width', () => {
    for (const radius of [0.5, 3, 70, 2000]) {
      const rec = shell(radius), paths = paintedPaths(rec.commands);
      expect(rec.result).toEqual(P.earthGlobeAtmosphereGeometry(radius));
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.length).toBeLessThanOrEqual(8 * 128);
      const seen = new Set();
      expect(rec.commands).toContainEqual(['set', 'lineCap', 'butt']);
      expect(rec.commands).toContainEqual(['call', 'setLineDash', []]);
      for (const { path, width } of paths) {
        const arcs = path.filter(c => c[1] === 'arc');
        expect(arcs).toHaveLength(1);
        expect(Number.isFinite(width) && width > 0).toBe(true);
        const radii = [arcs[0][4] - width / 2, arcs[0][4] + width / 2];
        const band = HEIGHTS.slice(0, -1).findIndex((h, i) => Math.abs(radii[0] - radius * (1 + h / EARTH)) < radius * 1e-12
          && Math.abs(radii[1] - radius * (1 + HEIGHTS[i + 1] / EARTH)) < radius * 1e-12);
        expect(band, 'painted radii match one physical height band').toBeGreaterThanOrEqual(0);
        seen.add(band);
        expect(radii[0]).toBeGreaterThanOrEqual(radius - 1e-12);
        expect(radii[1]).toBeLessThanOrEqual(rec.result.outerRadius + 1e-12);
        expect(arcs[0][2]).toBe(0);
        expect(arcs[0][3]).toBe(0);
      }
      expect(seen.size).toBe(8);
    }
  });
});

describe('Atmosphere illumination and camera rotation', () => {
  it('rotates the complete annulus with the Sun while keeping shell materials and radii fixed', () => {
    const reference = shell(86).commands.filter(c => !(c[0] === 'call' && ['translate', 'rotate'].includes(c[1])));
    for (const angle of [-2.8, -Math.PI / 2, 0.7, Math.PI, 2 * Math.PI]) {
      const rec = shell(86, angle, 137, -29);
      expect(rec.commands).toContainEqual(['call', 'translate', 137, -29]);
      expect(rec.commands).toContainEqual(['call', 'rotate', angle]);
      expect(rec.commands.filter(c => !(c[0] === 'call' && ['translate', 'rotate'].includes(c[1])))).toEqual(reference);
      const saves = rec.commands.filter(c => c[0] === 'call' && c[1] === 'save').length;
      const restores = rec.commands.filter(c => c[0] === 'call' && c[1] === 'restore').length;
      expect(saves).toBeGreaterThan(0);
      expect(restores).toBe(saves);
    }
  });

  it('matches local shell sunlight after independently rotating each painted normal into the camera', () => {
    const radius = 86;
    for (const angle of [-2.1, 0, 1.3]) {
      for (const { path, color, width } of paintedPaths(shell(radius, angle).commands)) {
        const arcs = path.filter(c => c[1] === 'arc');
        const arc = arcs[0], inner = arc[4] - width / 2, outer = arc[4] + width / 2;
        const height = ((outer + inner) / (2 * radius) - 1) * EARTH;
        const direction = (arc[5] + arc[6]) / 2;
        const nx = Math.cos(direction) * Math.cos(angle) - Math.sin(direction) * Math.sin(angle);
        const ny = Math.sin(direction) * Math.cos(angle) + Math.cos(direction) * Math.sin(angle);
        const expected = P.earthLimbAtmosphere(height, nx, ny, angle);
        const actual = rgba(color), reference = rgba(expected.color);
        expect(actual.slice(0, 3)).toEqual(reference.slice(0, 3));
        expect(actual[3]).toBeCloseTo(reference[3], 9);
        expect(actual[3]).toBeGreaterThanOrEqual(0.00001);
        // At the middle of the night hemisphere every solar ray is occulted.
        expect(Math.cos(direction)).toBeGreaterThan(-0.2);
      }
    }
  });

  it('retains sunlight just beyond the geometric terminator and none on the deep-night rim', () => {
    const paths = paintedPaths(shell(70).commands);
    const angles = paths.flatMap(({ path }) => path.filter(c => c[1] === 'arc').flatMap(c => [c[5], c[6]]));
    expect(Math.max(...angles)).toBeGreaterThan(Math.PI / 2);
    expect(Math.min(...angles)).toBeLessThan(-Math.PI / 2);
    expect(Math.max(...angles)).toBeLessThan(Math.PI * 0.6);
    expect(Math.min(...angles)).toBeGreaterThan(-Math.PI * 0.6);
    for (const { color } of paths) expect(rgba(color)[3]).toBeLessThan(0.68);
  });
});

describe('Globe atmosphere opt-in and preservation', () => {
  it.each(preserved)('preserves accepted %s drawing commands', (_label, args, opts, hash) => {
    expect(digest(globe(args, opts).commands)).toBe(hash);
    expect(digest(globe(args, { ...opts, thinAtmosphere: false }).commands)).toBe(hash);
  });

  it('leaves tiny, invalid-Sun, and explicitly phased globes on their existing branches', () => {
    for (const option of [undefined, null, false, 1, 'true']) {
      const args = [12, 34, 86, 500, 0, undefined];
      expect(globe(args, { thinAtmosphere: option }).commands).toEqual(globe(args).commands);
    }
    for (const radius of [0.3, 2, 2.999]) {
      const args = [12, 34, radius, 500, 0, undefined];
      expect(globe(args, { thinAtmosphere: true, surfaceLight: true }).commands).toEqual(globe(args, { surfaceLight: true }).commands);
    }
    for (const sun of [undefined, null, NaN, Infinity, '0']) {
      const args = [12, 34, 86, 500, sun, undefined];
      expect(globe(args, { thinAtmosphere: true }).commands).toEqual(globe(args).commands);
    }
    for (const phase of [0, 0.25, 0.5, 0.75, 1, NaN]) {
      const args = [12, 34, 86, 500, 0.7, phase];
      expect(globe(args, { thinAtmosphere: true, surfaceLight: true }).commands).toEqual(globe(args, { surfaceLight: true }).commands);
    }
  });

  it('changes only the atmosphere after the complete globe surface has been restored', () => {
    for (const args of [[12, 34, 14, 0, 0, undefined], [12, 34, 86, 500, 1.1, undefined], [12, 34, 2000, 4000, -2.3, undefined]]) {
      for (const surfaceLight of [false, true]) {
        const old = globe(args, { surfaceLight }).commands;
        const current = globe(args, { surfaceLight, thinAtmosphere: true }).commands;
        const oldHalo = old.findIndex(c => c[0] === 'set' && c[1] === 'globalAlpha' && c[2] === 0.25);
        expect(oldHalo).toBeGreaterThan(1);
        // The save immediately before the halo belongs to the old halo renderer.
        const surfaceEnd = oldHalo - 1;
        expect(old[surfaceEnd]).toEqual(['call', 'save']);
        expect(current.slice(0, surfaceEnd)).toEqual(old.slice(0, surfaceEnd));
        expect(current.some(c => c[0] === 'gradient' && c[1] === 'createRadialGradient' && c.at(-1) === args[2] * 1.45)).toBe(false);
        const translated = current.findIndex(c => c[0] === 'call' && c[1] === 'translate' && c[2] === args[0] && c[3] === args[1]);
        expect(translated).toBeGreaterThanOrEqual(surfaceEnd);
      }
    }
  });
});
