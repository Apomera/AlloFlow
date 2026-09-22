// BehaviorLens inter-observer agreement (IOA), checked against the textbook
// definitions (Cooper, Heron & Heward, Applied Behavior Analysis, 3rd ed., ch. 5).
//
// WHY: IOA is the number a BCBA or school psychologist reports to show the
// behaviour data are trustworthy. Until 2026-09-22 the calculator:
//   - labelled the MEAN count-per-interval as "Exact Count": counts 3,4 vs 4,4
//     showed 87.5%, where exact agreement is 50%;
//   - offered interval-by-interval twice, under two names;
//   - padded a shorter record with zeros, inventing agreement;
//   - showed "100.0" with "Below threshold" when a method had nothing to compare;
//   - read "+" and "x" marks as non-occurrence in the scored/unscored methods.
// Every expected value below was worked by hand from the definitions, not read
// from the module.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let IOA;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  // The pure calculator registers before any React-dependent code runs.
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  IOA = window.AlloModules && window.AlloModules.BehaviorLensIOA;
  if (!IOA) throw new Error('BehaviorLensIOA did not register');
});

const run = (method, a, b) => IOA.computeIOA(method, a, b);
const OBS1 = ['1', '0', '1', '1', '0', '0', '1', '0', '1', '0'];
const OBS2 = ['1', '0', '0', '1', '0', '1', '1', '0', '1', '0'];

describe('count-per-interval methods', () => {
  it('Exact Count-per-Interval is the share of intervals with identical counts', () => {
    const r = run('exact', ['3', '4'], ['4', '4']);
    expect(r.agreement).toBe('50.0');
    expect(r.exactAgreements).toBe(1);
  });
  it('Mean Count-per-Interval averages smaller/larger per interval (the old "Exact" number)', () => {
    expect(run('meancount', ['3', '4'], ['4', '4']).agreement).toBe('87.5');
  });
  it('an interval where both observers recorded zero counts as full agreement', () => {
    expect(run('meancount', ['0', '2'], ['0', '1']).agreement).toBe('75.0');
    expect(run('exact', ['0', '2'], ['0', '1']).agreement).toBe('50.0');
  });
});

describe('interval methods', () => {
  it('Interval-by-Interval counts agreement on occurrence AND non-occurrence', () => {
    const r = run('pointbypoint', OBS1, OBS2);
    expect(r.agreement).toBe('80.0');
    expect(r.agreements).toBe(8);
    expect(r.interpretation).toMatch(/^Acceptable/);
  });
  it('Scored-Interval uses only intervals where either observer scored an occurrence', () => {
    // occurrences: obs1 {1,3,4,7,9}, obs2 {1,4,6,7,9}; union 6, both 4
    expect(run('scored', OBS1, OBS2).agreement).toBe('66.7');
  });
  it('Unscored-Interval uses only intervals where either observer scored a non-occurrence', () => {
    // non-occurrences: obs1 {2,5,6,8,10}, obs2 {2,3,5,8,10}; union 6, both 4
    expect(run('unscored', OBS1, OBS2).agreement).toBe('66.7');
  });
  it('occurrence marks are read as occurrence, not as zero', () => {
    expect(run('pointbypoint', ['+', '-', 'x'], ['y', 'n', '-']).agreement).toBe('66.7');
    expect(run('scored', ['+', '+'], ['x', '-']).agreement).toBe('50.0');
  });
  it('counts under Interval-by-Interval are read as occurrence, and the result says so', () => {
    const r = run('pointbypoint', ['3', '0'], ['1', '0']);
    expect(r.agreement).toBe('100.0');
    expect(r.note).toMatch(/Counts were read as occurrence/);
  });
});

describe('nothing to compare is "not applicable", never 100%', () => {
  it('Scored-Interval with no occurrences at all', () => {
    const r = run('scored', ['0', '0', '0'], ['0', '0', '0']);
    expect(r.agreement).toBeNull();
    expect(r.interpretation).toMatch(/^Not applicable/);
  });
  it('Unscored-Interval with no non-occurrences at all', () => {
    expect(run('unscored', ['1', '1'], ['1', '1']).agreement).toBeNull();
  });
  it('Total Count when both totals are zero', () => {
    expect(run('totalcount', ['0'], ['0']).agreement).toBeNull();
  });
  it('Total Count is smaller total / larger total', () => {
    expect(run('totalcount', ['2', '3'], ['2', '1']).agreement).toBe('60.0');
  });
});

describe('bad input is refused, not silently scored', () => {
  it('interval methods refuse records of different lengths instead of padding with zeros', () => {
    for (const method of ['pointbypoint', 'scored', 'unscored', 'exact', 'meancount']) {
      expect(run(method, ['1', '0', '1'], ['1', '0']).error, method).toBe('length');
    }
    // Total count compares totals, so lengths may differ.
    expect(run('totalcount', ['1', '0', '1'], ['1', '1']).error).toBeUndefined();
  });
  it('an unreadable value is named, not treated as zero', () => {
    const r = run('pointbypoint', ['1', 'maybe'], ['1', '0']);
    expect(r.error).toBe('invalid');
    expect(r.message).toMatch(/maybe/);
  });
  it('a blank between two commas is an error, not a skipped interval', () => {
    const parts = IOA.splitIOAList('1, , 0');
    expect(parts).toEqual(['1', '', '0']);
    expect(run('pointbypoint', parts, ['1', '0', '0']).error).toBe('invalid');
    expect(IOA.splitIOAList('1 0 1')).toEqual(['1', '0', '1']);
    expect(IOA.splitIOAList('1, 0, 1,')).toEqual(['1', '0', '1']);
  });
});

describe('the offered methods', () => {
  it('every method the clinician can pick is implemented and has a unique name', () => {
    const labels = IOA.methods.map(m => m.label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const m of IOA.methods) {
      expect(run(m.id, OBS1, OBS2).error, m.id).toBeUndefined();
    }
  });
  it('no two offered methods compute the same thing on data that separates them', () => {
    // By hand: interval-by-interval 60.0, total 83.3, scored 50.0, unscored 33.3,
    // exact 40.0, mean count 53.3.
    const a = ['3', '0', '2', '1', '0'], b = ['2', '0', '2', '0', '1'];
    const byMethod = Object.fromEntries(IOA.methods.map(m => [m.id, run(m.id, a, b).agreement]));
    expect(byMethod).toEqual({ pointbypoint: '60.0', totalcount: '83.3', scored: '50.0', unscored: '33.3', exact: '40.0', meancount: '53.3' });
  });
});
