import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_SCALING_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.scaling = { valid: validScalingFactor, model: geometricScale, diagram: scalingDiagramMeasures, read: readScaling, format: scalingValue, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { valid, model, diagram, read, format, items } = sandbox.window.scaling;

describe('Scale Explorer similar-shape model', () => {
  it('accepts finite complete factors in its stated range and rejects malformed persisted values', () => {
    for (const value of [.01, '.5', 2, ' 3 ', '+10', '1e45']) expect(valid(value)).toBe(Number(value));
    for (const value of ['', ' ', null, false, [], {}, '0x10', '2 cm', '-1', '0', '.009', '1e46', '1e999', Infinity, NaN]) {
      expect(valid(value)).toBeNull(); expect(model(value)).toBeNull();
    }
    for (const factor of [undefined, [], {}, false, 0, 1e46]) expect(read({ factor }, true)).toBeNull();
    expect(read(null, false)).toEqual({ factor: '2', reflection: '', reference: null });
    expect(read({ factor: '1e45' }, true).factor).toBe('1e+45');
  });

  it('uses squares and cubes of the edge factor, including shrinking and surface-to-volume changes', () => {
    expect(model(2)).toEqual({ factor: 2, edge: 2, faceArea: 4, surfaceArea: 24, volume: 8, relativeSurfaceVolume: .5 });
    expect(model(.5)).toEqual({ factor: .5, edge: .5, faceArea: .25, surfaceArea: 1.5, volume: .125, relativeSurfaceVolume: 2 });
    for (const factor of [.01, .1, 1, 1.5, 3, 10, 1e6, 1e15, 1e30, 1e45]) {
      const result = model(factor);
      expect(result.faceArea).toBe(factor * factor); expect(result.volume).toBe(factor * factor * factor);
      expect(result.surfaceArea / result.volume / 6).toBeCloseTo(result.relativeSurfaceVolume, 12);
      expect(Object.values(result).every(Number.isFinite)).toBe(true);
    }
    for (const a of items) for (const b of items) {
      const factor = Math.max(a.size, b.size) / Math.min(a.size, b.size);
      expect(model(factor), a.id + ' ' + b.id).not.toBeNull();
    }
  });

  it('keeps both diagrams at the true shared scale and grids only countable integer ratios', () => {
    for (const factor of [.01, .5, 1, 1.5, 2, 3, 8, 10, 1e45]) {
      const sizes = diagram(factor);
      expect(sizes.copy / sizes.original / factor).toBeCloseTo(1, 12);
      expect(Math.max(sizes.copy, sizes.original)).toBeCloseTo(68, 12);
    }
    expect(diagram(2).copyDivisions).toBe(2); expect(diagram(.5).originalDivisions).toBe(2);
    expect(diagram(1.5).copyDivisions).toBe(1); expect(diagram(10).copyDivisions).toBe(1);
    expect(diagram(1e45).original).toBeLessThan(1e-40);
  });

  it('restores literal explanations and only matching object-length references', () => {
    const factor = 12 / 1.23, reference = { small: { id: 'human', size: 1.23, you: true }, big: { id: 'trex' } };
    const restored = read({ factor, reference, reflection: '<b>Literal text</b>' }, true);
    expect(restored.reference.small).toEqual({ id: 'human', size: 1.23, you: true });
    expect(restored.reflection).toBe('<b>Literal text</b>');
    expect(read({ factor, reference, reflection: 'x'.repeat(1300) }, true).reflection).toHaveLength(1200);
    expect(read({ factor: 2, reference }, true).reference).toBeNull();
    expect(read({ factor: 1, reference: { small: { id: 'human' }, big: { id: 'human' } } }, true).reference).toBeNull();
    const distance = { small: { id: 'sun' }, big: { id: 'alpha-cen-dist' } };
    expect(read({ factor: 4.1e16 / 1.392e9, reference: distance }, true).reference).toBeNull();
    expect(read({ factor: 2, reference: { small: { id: '__proto__' }, big: { id: 'earth' } } }, true).reference).toBeNull();
  });

  it('uses three significant figures without rounding extreme finite results to zero', () => {
    expect(format(.125)).toBe('0.125'); expect(format(1e135)).toBe('1 × 10¹³⁵');
    expect(format(1e-45)).toBe('1 × 10⁻⁴⁵'); expect(format(9.999e6)).toBe('1 × 10⁷');
    expect(format(12742000 / 3475000)).toBe('3.67');
  });
});
