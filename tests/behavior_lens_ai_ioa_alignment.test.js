// Behavior Lens AI-assisted IOA: the practitioner's record must line up with the AI's.
//
// WHY: until 2026-09-23 the AI-assisted comparisons parsed the practitioner's record
// with parseFloat and DROPPED anything else, so a blank or a "+" mark shifted every
// later interval; then they padded the shorter record with nulls, and a null "agreed"
// with any AI zero. That is the invented agreement computeIOA stopped on 2026-09-22
// (behavior_lens_ioa.test.js); the AI path now uses the same parser and refuses
// records of different lengths.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let IOA;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  IOA = window.AlloModules.BehaviorLensIOA;
  if (!IOA || !IOA.parseIOARecord) throw new Error('BehaviorLensIOA.parseIOARecord did not register');
});

describe('parsing the practitioner record', () => {
  it('a blank interval is an error, not a skipped interval (it used to shift the rest)', () => {
    expect(IOA.parseIOARecord('1, ,0,1')).toEqual({ values: [1, null, 0, 1], bad: [2] });
  });
  it('occurrence marks are read, not dropped', () => {
    expect(IOA.parseIOARecord('+,-,x').values).toEqual([1, 0, 1]);
  });
});

describe('what the comparison refuses', () => {
  it('different lengths are refused with both counts', () => {
    const msg = IOA.ioaRecordProblem('Your record', IOA.parseIOARecord('1,0,1'), 'the AI coding', 5);
    expect(msg).toBe('Your record has 3 intervals and the AI coding has 5. Agreement compares the same intervals, so both need the same number.');
  });
  it('an unreadable interval is named', () => {
    expect(IOA.ioaRecordProblem('Your record', IOA.parseIOARecord('1,?,0'), 'the AI coding', 3)).toBe('Your record interval 2 is not a count or occurrence mark.');
  });
  it('a clean record of the right length passes', () => {
    expect(IOA.ioaRecordProblem('Your record', IOA.parseIOARecord('1,0,1'), 'the AI coding', 3)).toBeNull();
  });
});

describe('both AI comparisons use those rules', () => {
  const src = readFileSync('behavior_lens_module.js', 'utf8');
  const body = name => { const i = src.indexOf('function ' + name + '('); return src.slice(i, src.indexOf('\n        }\n', i)); };
  it.each(['doIOAComparison', 'doTripleComparison'])('%s parses with parseIOARecord and never pads', (name) => {
    const fn = body(name);
    expect(fn).toContain('parseIOARecord(practitionerCoding)');
    expect(fn).not.toMatch(/parseFloat\(s\.trim\(\)\)/);
    expect(fn).not.toMatch(/Math\.max\([^)]*practData\.length/);
  });
});
