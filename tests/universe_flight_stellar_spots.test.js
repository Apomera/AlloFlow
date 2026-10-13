import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/universe_flight_scene.js', 'utf8');
const exposed = {};
new Function('window', source.replace('global.UniverseFlight = {', 'global.__spotShader = FRAGMENT; global.UniverseFlight = {'))(exposed);
const shader = exposed.__spotShader;
const start = shader.indexOf('    structure -= 0.21'), end = shader.indexOf('    cells = mix', start);
if (start < 0 || end < start) throw Error('Stellar spot shading unavailable');
// Execute the renderer's expressions, including its actual sampling gate.
const body = shader.slice(start, end).replace(/\bfloat\s+/g, 'const ');
const calculate = new Function('patchA', 'patchB', 'granuleDetail', 'mu', 'structure', 'smoothstep', body + '\nreturn {structure, facularContrast};');
const gateExpression = shader.match(/float granuleDetail = ([^;]+);/)[1];
const gate = new Function('diskPixels', 'mu', 'smoothstep', 'return ' + gateExpression);
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const shade = (a, b, detail = 1, mu = 1, base = 1) => calculate(a, b, detail, mu, base, smoothstep).structure;

describe('Resolved illustrative stellar spots', () => {
  it('places darker umbrae within both softer penumbrae', () => {
    expect(shade(1, -1)).toBeCloseTo(0.53, 12);
    expect(shade(-1, 1)).toBeCloseTo(0.67, 12);
    expect(shade(0.975, -1)).toBeGreaterThan(shade(0.995, -1));
    expect(shade(-1, 0.98)).toBeGreaterThan(shade(-1, 0.997));
    for (const p of [-1, 0, 0.8, 0.9, 0.97]) {
      expect(shade(p, -1, 1)).toBe(shade(p, -1, 0));
      expect(shade(-1, p, 1)).toBe(shade(-1, p, 0));
    }
  });

  it('removes fine cores when foreshortening or resolution cannot sample them', () => {
    for (const [pixels, mu] of [[40, 1], [96, 0.5], [400, 0.1], [1000, 0]]) {
      expect(gate(pixels, mu, smoothstep)).toBe(0);
      expect(shade(1, -1, gate(pixels, mu, smoothstep), mu)).toBeCloseTo(0.79, 12);
    }
    expect(gate(96, 1, smoothstep)).toBe(1);
    expect(gate(192, 0.5, smoothstep)).toBe(1);
    expect(gate(72, 1, smoothstep)).toBeCloseTo(0.5, 12);
    for (const edge of [48, 96]) expect(Math.abs(gate(edge + 1e-5, 1, smoothstep) - gate(edge - 1e-5, 1, smoothstep))).toBeLessThan(1e-10);
  });

  it('increases bounded facular contrast from disk center toward the limb', () => {
    const values = [1, 0.75, 0.5, 0.25, 0].map(mu => calculate(0.9, -1, 0, mu, 1, smoothstep));
    expect(values[0].facularContrast).toBe(0.25); expect(values.at(-1).facularContrast).toBe(1);
    for (let i = 1; i < values.length; i++) {
      expect(values[i].facularContrast).toBeGreaterThan(values[i - 1].facularContrast);
      expect(values[i].structure).toBeGreaterThan(values[i - 1].structure);
    }
  });

  it('keeps light positive for even the conservative overlapping-spot bound', () => {
    for (const a of [-1, 0.79, 0.88, 0.90, 0.979, 0.988, 0.996, 1]) for (const b of [-1, 0.90, 0.983, 0.992, 0.998, 1]) {
      for (const detail of [0, 0.25, 0.5, 1]) for (const mu of [0, 0.25, 0.7, 1]) {
        const dark = shade(a, b, detail, mu, 1 - 0.085 - 0.028), bright = shade(a, b, detail, mu, 1 + 0.085 + 0.028);
        expect(dark).toBeGreaterThanOrEqual(0.087 - 1e-12);
        expect(bright).toBeLessThanOrEqual(1.158 + 1e-12);
        expect(Number.isFinite(dark) && Number.isFinite(bright)).toBe(true);
      }
    }
  });
});
