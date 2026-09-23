// Eligibility is the IEP team's decision (34 CFR §300.306), not the
// evaluation report's. psycheck flags a draft that states it as a finding, as
// an ADVISORY note that never blocks export, and leaves team-framed sentences
// alone.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let PC;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('report_writer_module.js');
  PC = window.AlloPsycheck;
});

const SRC = [{ assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 96, scoreType: 'standard' }];
const notes = (draft) => PC.verifyDraft(SRC, 'On the WISC-V, the Full Scale IQ was 96. ' + draft).language_notes;

describe('eligibility stated as a finding', () => {
  it('is flagged', () => {
    for (const draft of [
      'Based on these results, [Student] is eligible for special education under SLD.',
      '[Student] qualifies for special education services.',
      '[Student] meets eligibility criteria for Other Health Impairment.',
      '[Student] should be found eligible under the category of Autism.',
      '[Student] is not eligible for an IEP at this time.',
    ]) {
      expect(notes(draft).length, draft).toBeGreaterThan(0);
    }
  });
  it('is advisory: it never becomes a blocking discrepancy', () => {
    const r = PC.verifyDraft(SRC, 'On the WISC-V, the Full Scale IQ was 96. [Student] is eligible for special education.');
    expect(r.discrepancies).toEqual([]);
    expect(r.language_notes).toHaveLength(1);
    expect(r.language_notes[0].detail).toMatch(/IEP team/);
  });
});

describe('team-framed or hedged wording', () => {
  it('is not flagged', () => {
    for (const draft of [
      'The IEP team will determine whether [Student] is eligible for special education.',
      'The team may consider if [Student] qualifies for special education.',
      'Results are consistent with the criteria for a Specific Learning Disability.',
      '[Student] may be eligible for additional supports; the team will decide.',
    ]) {
      expect(notes(draft), draft).toEqual([]);
    }
  });
});
