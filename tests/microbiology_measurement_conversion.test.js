import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const start = source.indexOf('  var MicroMeasurements =');
const end = source.indexOf('  window.__MicrobiologyCore =', start);
if (start < 0 || end < start) throw new Error('Microscope measurement core boundaries were not found');
const measurements = new Function(source.slice(start, end) + '\nreturn MicroMeasurements;')();

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Explicit microscope working-estimate conversion', () => {
  it.each([
    ['2', 'um', '2000', 2],
    ['2000', 'nm', '2', 2],
    ['.2', 'um', '200', 0.2],
    ['200', 'nm', '0.2', 0.2],
    ['7.5', 'um', '7500', 7.5],
    ['7500', 'nm', '7.5', 7.5],
    ['2.50', 'um', '2500', 2.5],
    ['2e+3', 'nm', '2', 2],
    ['2E-1', 'um', '200', 0.2],
    ['0002.000', 'um', '2000', 2],
    [2, 'um', '2000', 2],
    [1000, 'nm', '1', 1],
    ['1e6', 'um', '1000000000', 1000000],
    ['1e9', 'nm', '1000000', 1000000]
  ])('converts %s %s with the factor of 1000', (value, unit, targetValue, estimateUm) => {
    const targetUnit = unit === 'um' ? 'nm' : 'um';
    const result = measurements.convertEstimate(value, unit);
    expect(result).toEqual({ status: 'valid', value, unit, estimateUm, targetUnit, targetValue, canConvert: true });
    expect(measurements.parseEstimate(targetValue, targetUnit)).not.toBeNull();
    expect(targetValue.length).toBeLessThanOrEqual(32);
  });

  it('keeps decimal conversion readable without binary multiplication artifacts', () => {
    expect(measurements.convertEstimate('1.001', 'um').targetValue).toBe('1001');
    expect(measurements.convertEstimate('1001', 'nm').targetValue).toBe('1.001');
    expect(measurements.convertEstimate('0.001001', 'um').targetValue).toBe('1.001');
    expect(measurements.convertEstimate('1.001', 'nm').targetValue).toBe('0.001001');
  });

  it('retains the precision of representable decimal and scientific estimates through a round trip', () => {
    for (const value of ['2.1234567890123', '1.2345678901234567', '1.0000000000000002', '0.10000000000000002', '1.2345678901234567e-20']) {
      const first = measurements.convertEstimate(value, 'um');
      const second = measurements.convertEstimate(first.targetValue, first.targetUnit);
      expect(first.canConvert).toBe(true);
      expect(second.canConvert).toBe(true);
      expect(Number(second.targetValue)).toBe(Number(value));
      expect(second.estimateUm).toBeCloseTo(first.estimateUm, 15);
    }
    expect(measurements.convertEstimate('2.1234567890123', 'um').targetValue).toBe('2123.4567890123');
  });

  it('preserves the original input spelling while projecting the equivalent number', () => {
    const value = '0002.5000E+0';
    const result = measurements.convertEstimate(value, 'um');
    expect(result.value).toBe(value);
    expect(result.targetValue).toBe('2500');
    expect(result.estimateUm).toBe(2.5);
  });

  it('converts the smallest supported positive estimate without rounding it to zero', () => {
    const forward = measurements.convertEstimate('5e-324', 'um');
    expect(forward).toMatchObject({ status: 'valid', estimateUm: Number.MIN_VALUE, targetValue: '5e-321', canConvert: true });
    const reverse = measurements.convertEstimate(forward.targetValue, 'nm');
    expect(reverse).toMatchObject({ status: 'valid', estimateUm: Number.MIN_VALUE, targetValue: '5e-324', canConvert: true });
    expect(measurements.parseEstimate(reverse.targetValue, 'um')).toBe(Number.MIN_VALUE);
  });

  it('blocks nanometer underflow and decimal underflow instead of manufacturing a zero estimate', () => {
    for (const [value, unit] of [['5e-324', 'nm'], ['1e-999', 'um'], ['1e-999', 'nm']]) {
      expect(measurements.convertEstimate(value, unit)).toMatchObject({ status: 'out-of-range', value, unit, estimateUm: null, targetValue: null, canConvert: false });
    }
  });

  it('blocks an out-of-bounds target while retaining the original valid estimate and equivalence', () => {
    expect(measurements.convertEstimate('1e9', 'um')).toEqual({ status: 'out-of-range', value: '1e9', unit: 'um',
      estimateUm: 1000000000, targetUnit: 'nm', targetValue: '1000000000000', canConvert: false });
    expect(measurements.convertEstimate('1000000.0000000002', 'um')).toMatchObject({ status: 'out-of-range', targetValue: '1000000000.0000002', canConvert: false });
    expect(measurements.convertEstimate('1000000', 'um').canConvert).toBe(true);
  });

  it('rejects numeric inputs outside the existing original bounds', () => {
    for (const value of [0, -0, -2, 1000000001, '0', '-2', '1e10', '1e999']) {
      for (const unit of ['um', 'nm']) {
        expect(measurements.convertEstimate(value, unit)).toMatchObject({ status: 'out-of-range', value, unit,
          estimateUm: null, targetValue: null, canConvert: false });
      }
    }
  });

  it('preserves malformed original text and never coerces it into a convertible estimate', () => {
    for (const value of ['', ' ', ' 2 ', '+2', '2.', '0x2', '0b10', '0o2', '1,000', '2px', '2e', 'Infinity', 'NaN', '=2+2', '2\n', '2\t']) {
      expect(measurements.convertEstimate(value, 'um')).toEqual({ status: 'invalid', value, unit: 'um', estimateUm: null,
        targetUnit: 'nm', targetValue: null, canConvert: false });
    }
  });

  it('rejects unsupported original types without invoking their coercion or accessors', () => {
    const coercion = vi.fn(() => { throw new Error('Unexpected value coercion'); });
    const object = { toString: coercion, valueOf: coercion };
    for (const value of [null, undefined, true, false, [], object, NaN, Infinity, -Infinity, 2n]) {
      const result = measurements.convertEstimate(value, 'nm');
      expect(result.status).toBe('invalid');
      expect(result.value).toBe(value);
      expect(result.estimateUm).toBeNull();
      expect(result.targetValue).toBeNull();
      expect(result.canConvert).toBe(false);
    }
    expect(coercion).not.toHaveBeenCalled();
  });

  it('requires an exact supported unit enum and preserves unsupported units', () => {
    const coercion = vi.fn(() => { throw new Error('Unexpected unit coercion'); });
    const object = { toString: coercion };
    for (const unit of [undefined, null, '', 'mm', 'µm', 'μm', 'UM', ' nm ', 0, false, [], object]) {
      const result = measurements.convertEstimate('2', unit);
      expect(result).toEqual({ status: 'unsupported', value: '2', unit, estimateUm: null, targetUnit: null, targetValue: null, canConvert: false });
    }
    expect(coercion).not.toHaveBeenCalled();
  });

  it('rejects an overlong original string rather than converting a hidden or truncated value', () => {
    const allowed = '0'.repeat(31) + '2';
    const overlong = '0'.repeat(32) + '2';
    expect(allowed.length).toBe(32);
    expect(measurements.convertEstimate(allowed, 'um')).toMatchObject({ status: 'valid', value: allowed, targetValue: '2000', canConvert: true });
    expect(measurements.convertEstimate(overlong, 'um')).toEqual({ status: 'out-of-range', value: overlong, unit: 'um', estimateUm: null,
      targetUnit: 'nm', targetValue: null, canConvert: false });
    expect(measurements.parseEstimate(overlong, 'um')).toBe(2);
  });

  it('never truncates a target string to the input limit', () => {
    for (const [value, unit] of [['1.2345678901234567e-100', 'um'], ['1.2345678901234567e-100', 'nm'], ['9.999999999999998e5', 'um']]) {
      const result = measurements.convertEstimate(value, unit);
      expect(result.status).toBe('valid');
      expect(result.targetValue.length).toBeLessThanOrEqual(32);
      expect(measurements.parseEstimate(result.targetValue, result.targetUnit)).not.toBeNull();
      expect(Number(result.targetValue) > 0).toBe(true);
    }
    expect(measurements.convertEstimate('1.2345678901234567e-100', 'um').targetValue).toBe('1.2345678901234567e-97');
  });

  it('blocks a target that needs more than 32 characters instead of silently rounding its digits', () => {
    const value = '0.123456789012345678901234567890';
    expect(value.length).toBe(32);
    expect(measurements.parseEstimate(value, 'nm')).not.toBeNull();
    const result = measurements.convertEstimate(value, 'nm');
    expect(result.status).toBe('out-of-range');
    expect(result.value).toBe(value);
    expect(result.targetValue).toBe('0.00012345678901234567890123456789');
    expect(result.targetValue.length).toBeGreaterThan(32);
    expect(result.estimateUm).toBe(Number(value) / 1000);
    expect(result.canConvert).toBe(false);
  });

  it('returns a frozen projection for every status without freezing or changing caller data', () => {
    const raw = { value: '2', unit: 'um', context: { referenceUm: 999 }, draft: { value: '2' } };
    const before = JSON.stringify(raw);
    for (const [value, unit, status] of [['2', 'um', 'valid'], ['bad', 'um', 'invalid'], ['1e9', 'um', 'out-of-range'], ['2', 'mm', 'unsupported'], [raw, 'um', 'invalid']]) {
      const result = measurements.convertEstimate(value, unit);
      expect(Object.isFrozen(result)).toBe(true);
      expect(result.status).toBe(status);
      expect(Object.keys(result).sort()).toEqual(['canConvert', 'estimateUm', 'status', 'targetUnit', 'targetValue', 'unit', 'value']);
    }
    expect(JSON.stringify(raw)).toBe(before);
    expect(Object.isFrozen(raw)).toBe(false);
    expect(Object.isFrozen(raw.context)).toBe(false);
  });

  it('uses no clock, randomness, specimen reference, or grading state', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Unexpected random draw'); });
    const clock = vi.fn(() => { throw new Error('Unexpected clock access'); });
    vi.stubGlobal('Date', clock);
    const originalSizes = JSON.stringify(measurements.sizes);
    const first = measurements.convertEstimate('2.1234567890123', 'um');
    const second = measurements.convertEstimate('2.1234567890123', 'um');
    expect(second).toEqual(first);
    expect(first).not.toHaveProperty('referenceUm');
    expect(first).not.toHaveProperty('errorPercent');
    expect(first).not.toHaveProperty('withinBand');
    expect(JSON.stringify(measurements.sizes)).toBe(originalSizes);
    expect(random).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
  });
});
