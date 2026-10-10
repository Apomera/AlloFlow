import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_atctower.js', 'utf8');
const helpers = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── EDUCATIONAL LESSONS ──'));
const { model, evidence, compare, fields } = new Function(helpers + '\nreturn {model:atcOpsModel,evidence:atcOpsEvidence,compare:atcOpsComparison,fields:ATC_OPS_FIELDS};')();
const defaults = { wind: 10, spawn: 5, sep: 8, descent: 1, timeout: 30 };
const minimum = { wind: 0, spawn: 10, sep: 20, descent: 0.5, timeout: 60 };
const maximum = { wind: 30, spawn: 1, sep: 5, descent: 2, timeout: 10 };

describe('ATC Ops investigation model and recorded evidence', () => {
  it('retains the original teaching weights and default result', () => {
    const result = model();
    expect(result.values).toEqual(defaults);
    expect(result.score).toBeCloseTo(54.3333333333);
    expect(result.band).toBe('training');
    expect(result.contributions).toMatchObject({ sep: 20, timeout: 6 });
    expect(result.contributions.wind).toBeCloseTo(25 / 3);
    expect(result.contributions.spawn).toBeCloseTo(50 / 3);
    expect(result.contributions.descent).toBeCloseTo(10 / 3);
    expect(Object.values(result.contributions).reduce((sum, value) => sum + value, 0)).toBeCloseTo(result.score);
  });
  it('reaches zero and one hundred at the corresponding endpoints', () => {
    expect(model(minimum)).toMatchObject({ score: 0, index: 0, band: 'sandbox' });
    expect(model(maximum)).toMatchObject({ score: 100, index: 1, band: 'overload' });
  });
  it.each([
    [{ ...minimum, wind: 30, descent: 2 }, 35, 'training'],
    [{ ...minimum, wind: 30, sep: 5, timeout: 35 }, 55, 'operational'],
    [{ ...minimum, wind: 30, spawn: 1, sep: 8 }, 75, 'stressed'],
    [{ ...maximum, timeout: 60 }, 90, 'overload']
  ])('places an exact band boundary in its upper band', (values, score, band) => {
    expect(model(values)).toMatchObject({ score, band });
  });
  it('bounds numeric inputs and replaces invalid values without treating strings as evidence', () => {
    expect(model({ wind: 999, spawn: -4, sep: Infinity, descent: NaN, timeout: '10' }).values).toEqual({ wind: 30, spawn: 1, sep: 8, descent: 1, timeout: 30 });
  });
  it('normalizes restored values to the actual slider steps', () => {
    expect(model({ descent: 1.3000000000000003, timeout: 42, wind: 9.7 }).values).toMatchObject({ descent: 1.3, timeout: 40, wind: 10 });
  });
  it('keeps every legal control step within its weight and the complete index bounds', () => {
    for (const [key, field] of Object.entries(fields)) {
      for (let step = 0; step <= Math.round((field.max - field.min) / field.step); step++) {
        const result = model({ ...defaults, [key]: field.min + step * field.step });
        expect(result.score).toBeGreaterThanOrEqual(0); expect(result.score).toBeLessThanOrEqual(100);
        expect(result.contributions[key]).toBeGreaterThanOrEqual(0); expect(result.contributions[key]).toBeLessThanOrEqual(field.weight);
      }
    }
  });
  it('increases the index with wind and descent, and decreases it with longer intervals, spacing, and windows', () => {
    const base = model(defaults).score;
    for (const key of ['wind', 'descent']) expect(model({ ...defaults, [key]: fields[key].max }).score).toBeGreaterThan(base);
    for (const key of ['spawn', 'sep', 'timeout']) expect(model({ ...defaults, [key]: fields[key].max }).score).toBeLessThan(base);
  });
  it('recalculates old records from their settings rather than their saved result or translated label', () => {
    const rows = evidence([{ ...defaults, state: 'Overload', loadIndex: 999 }]);
    expect(rows).toHaveLength(1); expect(rows[0].number).toBe(1);
    expect(rows[0].model.score).toBeCloseTo(54.3333333333); expect(rows[0].model.band).toBe('training');
  });
  it('excludes incomplete, non-numeric, out-of-range, and off-step records while retaining original setup numbers', () => {
    const rows = evidence([null, {}, { ...defaults, wind: '10' }, { ...defaults, wind: -1 }, { ...defaults, timeout: 42 }, defaults]);
    expect(rows).toHaveLength(1); expect(rows[0].number).toBe(6);
    expect(evidence({})).toEqual([]); expect(evidence(null)).toEqual([]);
  });
  it('tolerates decimal representation noise from older logs without inventing distinct setups', () => {
    const rows = evidence([{ ...defaults, descent: 1.2000000000000002 }, { ...defaults, descent: 1.2 }]);
    expect(rows).toHaveLength(2); expect(rows[0].model.signature).toBe(rows[1].model.signature);
  });
  it('recognizes a fair single-control comparison and its signed numeric change', () => {
    const result = compare(defaults, { ...defaults, wind: 20 });
    expect(result).toMatchObject({ state: 'one-variable', changed: ['wind'], sameBand: false });
    expect(result.delta).toBeCloseTo(25 / 3);
    expect(compare({ ...defaults, wind: 20 }, defaults).delta).toBeCloseTo(-25 / 3);
  });
  it('preserves differences that stay within the same band', () => {
    expect(compare({ ...defaults, wind: 9 }, defaults)).toMatchObject({ state: 'one-variable', sameBand: true });
    expect(compare({ ...defaults, wind: 9 }, defaults).delta).toBeCloseTo(25 / 30);
  });
  it('distinguishes identical scores from identical setups', () => {
    expect(compare(defaults, { ...defaults, wind: 16, timeout: 55 })).toMatchObject({ state: 'multiple-variables', delta: 0, changed: ['wind', 'timeout'] });
    expect(compare(defaults, defaults)).toMatchObject({ state: 'duplicate', changed: [], delta: 0 });
    expect(compare(defaults, null)).toBeNull();
  });
  it('does not alter input records, defaults, saved shifts, or previous explanations', () => {
    const record = { ...defaults, activeShift: { time: 12 }, explanation: 'My observation' };
    const original = structuredClone({ record, fields });
    model(record); evidence([record]); compare(record, maximum);
    expect({ record, fields }).toEqual(original);
  });
});

describe('ATC Ops restored view', () => {
  beforeEach(() => resetStemLab());
  it('renders usable controls and excludes corrupt records from investigation credit', () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const html = renderTool('atcTower', { atcTower: { view: 'menu', atcMenuPanel: 'ops', opsControl: { wind: 'not a number', descent: null, log: [null, { ...defaults, wind: '10' }, defaults], explanation: 'Do not grant completion for a corrupt record.' } } });
    expect(html).not.toContain('NaN'); expect(html).toContain('54.3');
    expect(html).toContain('data-atctower-inquiry-progress="collect-evidence"');
    expect(html).toContain('Some saved setups have incomplete or unsupported values.');
    expect(html).toContain('data-atctower-ops-record="3"');
  });
  it('shows numeric evidence for two valid setups within one band', () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const html = renderTool('atcTower', { atcTower: { view: 'menu', atcMenuPanel: 'ops', opsControl: { ...defaults, log: [{ ...defaults, wind: 9 }, defaults] } } });
    expect(html).toContain('data-atctower-ops-same-band="true"');
    expect(html).toContain('data-atctower-fair-test-check="one-variable"');
    expect(html).toContain('data-atctower-inquiry-progress="explain"');
  });
});
