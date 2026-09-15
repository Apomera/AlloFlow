import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const PETS = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_pets.js'), 'utf8');

const TEACHER = sliceBetween(PETS, 'function renderTeacher()', 'function renderLifespan()',
  { file: 'stem_lab/stem_tool_pets.js' });

// The teacher helpers are sliced into a BARE VM — no globals at all — which is
// exactly the constraint the readouts have to satisfy. Running them the same
// way is what proves they do.
const evidenceOutcome = vm.runInNewContext(
  `(${sliceBetween(TEACHER, 'function evidenceOutcome(record) {', 'function evidenceGrowth(',
    { file: 'renderTeacher' })})`,
);

const row = (moduleId, details, kind = 'activity') => ({ moduleId, kind, details });

describe('Pets teacher readouts — every gated activity says something', () => {
  // The bug this suite exists for: thirteen gated modules fell through to
  // "Saved activity metadata", which tells a teacher nothing.
  const GENERIC = 'Saved activity metadata';

  it('no longer shows the generic fallback for the species checks', () => {
    for (const species of ['dogs', 'cats', 'smallMammals', 'birds', 'reptiles']) {
      const text = evidenceOutcome(row(species, { predicted: 'answered', criterionMet: true }));
      expect(text, species).not.toBe(GENERIC);
      expect(text, species).toMatch(/predicted/i);
    }
  });

  it('distinguishes a correct prediction, a wrong one, and a skip', () => {
    expect(evidenceOutcome(row('dogs', { predicted: 'answered', criterionMet: true })))
      .toMatch(/correctly/i);
    // Being wrong is the useful order, and the wording has to say so rather
    // than read as a failure.
    const wrong = evidenceOutcome(row('dogs', { predicted: 'answered', criterionMet: false }));
    expect(wrong).toMatch(/wrongly/i);
    expect(wrong).toMatch(/useful order/i);
    expect(evidenceOutcome(row('dogs', { predicted: 'skipped' })))
      .toMatch(/without predicting first/i);
  });

  it('reports myths by what was BELIEVED, not just the score', () => {
    const believed = evidenceOutcome(row('myths', { score: 8, total: 11, believed: 3 }));
    expect(believed).toContain('8 of 11');
    expect(believed).toMatch(/believed 3 myths/i);
    // Naming which ones is the actual classroom follow-up.
    expect(believed).toMatch(/worth naming which/i);

    const clean = evidenceOutcome(row('myths', { score: 11, total: 11, believed: 0 }));
    expect(clean).toMatch(/believed none of the myths/i);
  });

  it('calls a weaker welfare pick defensible rather than wrong', () => {
    const partial = evidenceOutcome(row('welfare', { score: 2, total: 4 }));
    expect(partial).toContain('2 of 4');
    expect(partial).toMatch(/defensible, not wrong/i);
    expect(evidenceOutcome(row('welfare', { score: 4, total: 4 })))
      .not.toMatch(/defensible/i);
  });

  it('points a service miss at the half of the rule that was missed', () => {
    const partial = evidenceOutcome(row('service', { score: 3, total: 5 }));
    expect(partial).toContain('3 of 5');
    expect(partial).toMatch(/half of the ADA rule/i);
  });

  it('names epistasis for the Punnett challenges', () => {
    expect(evidenceOutcome(row('genetics', { score: 4, total: 4 })))
      .toMatch(/epistasis/i);
  });

  // Four activities are deliberately scoreless. The readout must not imply a
  // grade that was never recorded.
  it('says plainly that the scoreless activities carry no verdict', () => {
    const careers = evidenceOutcome(row('careers', { answered: 5, total: 5 }));
    expect(careers).not.toBe(GENERIC);
    expect(careers).toMatch(/records no verdict/i);

    const cost = evidenceOutcome(row('cost', { answered: 3, total: 3 }));
    expect(cost).toMatch(/no score by design/i);

    const picker = evidenceOutcome(row('picker', { answered: 4, total: 4 }));
    expect(picker).toMatch(/not a fit score/i);
  });

  it('tells a teacher when an action plan sits at a single scale', () => {
    const oneScale = evidenceOutcome(row('action', { chosen: 2, scales: 1 }));
    expect(oneScale).toMatch(/at one scale/i);
    expect(oneScale).toMatch(/community and civic/i);

    const spread = evidenceOutcome(row('action', { chosen: 3, scales: 3 }));
    expect(spread).toMatch(/across 3 scales/i);
  });

  it('still handles the older activities it already covered', () => {
    expect(evidenceOutcome(row('training', { behaviorPct: 80, trustPct: 90, rounds: 10 })))
      .toMatch(/Behavior 80%/);
    expect(evidenceOutcome(row('sensory', { perspectives: 3 })))
      .toMatch(/3 visual perspectives/);
  });

  it('keeps the generic fallback for a row with no usable detail', () => {
    expect(evidenceOutcome(row('dogs', {}))).toBe(GENERIC);
  });
});

describe('Pets teacher readouts — the bare-VM constraint', () => {
  // A module-level constant here is a ReferenceError inside the teacher VM,
  // which is how this broke the first time.
  it('references no module-level constant from the readout helpers', () => {
    const outcome = sliceBetween(TEACHER, 'function evidenceOutcome(record) {', 'function evidenceGrowth(',
      { file: 'renderTeacher' });
    expect(outcome).not.toMatch(/PETS_SPECIES_CHECK_MODULES|PETS_EVIDENCE_ACTIVITY_FIELDS|COST_COMMITMENTS|SERVICE_CASES|PUNNETT_GOALS/);
  });

  it('covers every gated module that records detail fields', () => {
    const gated = sliceBetween(PETS, 'var PETS_ACTIVITY_COMPLETION_MODULES = {', '};',
      { file: 'stem_lab/stem_tool_pets.js' });
    const ids = [...gated.matchAll(/(\w+): true/g)].map((m) => m[1]);
    // Every gated module should produce something other than the generic
    // fallback for a plausible evidence row.
    const plausible = {
      predicted: 'answered', criterionMet: true, score: 3, total: 4,
      believed: 1, answered: 3, chosen: 2, scales: 2, perspectives: 3,
      behaviorPct: 80, trustPct: 90, rounds: 10, physical: 80,
      scorePct: 75, coverageComplete: true, weakestPct: 70,
    };
    const generic = [];
    for (const id of ids) {
      if (evidenceOutcome(row(id, plausible)) === 'Saved activity metadata') generic.push(id);
    }
    expect(generic, 'gated modules with no teacher readout').toEqual([]);
  });
});
