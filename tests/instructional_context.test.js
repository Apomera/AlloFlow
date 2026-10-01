import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Context;

beforeAll(() => {
  loadAlloModule(process.env.ALLO_CONTEXT_CANDIDATE || 'instructional_context_module.js');
  Context = window.AlloModules.InstructionalContext;
  if (!Context) throw new Error('InstructionalContext failed to register');
});

describe('instructional context contract', () => {
  it.each([
    ['6', '6th Grade'],
    ['Grade 6', '6th Grade'],
    ['6th Grade', '6th Grade'],
    ['K', 'Kindergarten'],
    ['pre-k', 'Pre-K'],
    ['College Level', 'College'],
  ])('normalizes grade alias %s', (input, expected) => {
    expect(Context.normalizeGradeLabel(input)).toBe(expected);
  });

  it('uses one measurable target policy for generation and verdicts', () => {
    const target = Context.getComplexityTarget('Grade 5');
    expect(target.fkRange).toEqual({ min: 5, max: 6 });
    expect(Context.complexityStatus(4.9, '5')).toBe('below-target');
    expect(Context.complexityStatus(5.7, '5th Grade')).toBe('within-target');
    expect(Context.complexityStatus(6.1, 'Grade 5')).toBe('above-target');
  });

  it('keeps internal source calibration separate from the requested target', () => {
    expect(Context.getSourceCalibrationTarget('5th Grade')).toMatchObject({
      requestedGrade: '5th Grade',
      promptGrade: '3rd Grade',
      policyVersion: 'empirical-undershoot/v1',
    });
  });

  it('never infers supplemental or authorized replacement from a legacy simplified type', () => {
    const inferred = Context.inferInstructionalText({
      id: 'legacy-reading',
      type: 'simplified',
      data: 'A legacy reading.',
      config: { grade: '5th Grade' },
    });
    expect(inferred.role).toBe('unspecified');
    expect(inferred.form).toBe('adapted');
    expect(inferred.designationSource).toBe('legacy-inferred');
    expect(inferred.replacementAuthorization.authorized).toBe(false);
  });

  it('accepts replacement authorization only from an explicit educator source', () => {
    expect(Context.normalizeInstructionalText({
      role: 'primary',
      form: 'adapted',
      replacementAuthorization: { authorized: true, source: 'workflow-default' },
    }).replacementAuthorization.authorized).toBe(false);

    expect(Context.normalizeInstructionalText({
      role: 'primary',
      form: 'adapted',
      replacementAuthorization: { authorized: true, source: 'educator' },
    }).replacementAuthorization.authorized).toBe(true);
  });

  it('ties measured complexity to exact content and marks revisions stale', () => {
    const base = Context.normalizeInstructionalText({
      role: 'supplemental',
      form: 'adapted',
      designationSource: 'workflow-default',
      complexity: { requestedGrade: 'Grade 5', language: 'English' },
    });
    const measured = Context.withComplexityEvidence(base, {
      measuredGrade: 5.4,
      method: 'flesch-kincaid-en',
      language: 'English',
    }, 'Exact generated text.');
    expect(measured.complexity.status).toBe('within-target');
    expect(measured.complexity.contentFingerprint).toBe(Context.fingerprintText('Exact generated text.'));

    const stale = Context.invalidateComplexityEvidence(measured, 'Edited text.', 'stale');
    expect(stale.complexity.status).toBe('stale');
    expect(stale.complexity.measuredGrade).toBeNull();
    expect(stale.complexity.contentFingerprint).toBe(Context.fingerprintText('Edited text.'));
  });

  it('does not assign an English readability verdict to bilingual content', () => {
    const normalized = Context.normalizeComplexity({
      requestedGrade: '5th Grade',
      measuredGrade: 5.5,
      language: 'English + Spanish',
    });
    expect(normalized.status).toBe('unavailable');
  });

  it('includes a supplemental adapted companion by default without changing the primary role', () => {
    expect(Context.normalizeInstructionalContext(null, { instructionalGrade: '5th Grade' })).toMatchObject({
      primaryTextPolicy: 'preserve-primary',
      primaryTextAccess: 'available',
      adaptedTextPolicy: 'include',
      adaptedTextPolicySource: 'workflow-default',
      textAccessReason: 'default-access-companion',
    });
  });

  // Changed 2026-09-27 (Novak iteration, lane N1). This used to pin "required
  // grade-level text, adapted companion still included". Katie Novak asked that
  // the original stay at the center when reading standards drive instruction,
  // and AlloFlow told Novak Education that the automated pack omits adapted
  // text when the standard requires grade-level complexity. The default is now
  // to leave the companion out; a teacher's choice to include it is kept.
  it('makes complex grade-level text required and, by default, leaves out the adapted companion', () => {
    const standard = { standardsInput: 'CCSS.ELA-LITERACY.RI.5.10: Read grade-level complex text independently and proficiently.' };
    const context = Context.normalizeInstructionalContext(null, standard);
    expect(context).toMatchObject({
      primaryTextAccess: 'required',
      adaptedTextPolicy: 'omit',
      adaptedTextPolicySource: 'standard',
      textAccessReason: 'standard-text-complexity-requirement',
    });
    // Normalizing an already-normalized context changes nothing.
    expect(Context.normalizeInstructionalContext(context, standard)).toMatchObject({ adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard' });

    const educatorOmit = Context.normalizeInstructionalContext({ adaptedTextPolicy: 'omit' }, standard);
    expect(educatorOmit).toMatchObject({
      primaryTextAccess: 'required',
      adaptedTextPolicy: 'omit',
      adaptedTextPolicySource: 'educator',
    });

    // One click: the teacher includes a companion for background and preview.
    const educatorInclude = Context.normalizeInstructionalContext({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' }, standard);
    expect(educatorInclude).toMatchObject({ primaryTextAccess: 'required', adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' });
    expect(Context.normalizeInstructionalContext(educatorInclude, standard)).toMatchObject({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' });
    expect(Context.normalizeInstructionalContext({ adaptedTextPolicy: 'include' }, standard)).toMatchObject({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' });
  });

  it('derives a default again instead of keeping one that outlived its reason', () => {
    const standard = { standardsInput: 'CCSS.ELA-LITERACY.RL.9-10.10: By the end of grade 10, read and comprehend literature at the high end of the text complexity band independently and proficiently.' };
    // A context saved before a grade-level standard was chosen (workflow default include).
    expect(Context.normalizeInstructionalContext({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default' }, standard))
      .toMatchObject({ primaryTextAccess: 'required', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard' });
    // The standard was removed: its omission no longer applies.
    expect(Context.normalizeInstructionalContext({ adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard' }, {}))
      .toMatchObject({ primaryTextAccess: 'available', adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default', textAccessReason: 'default-access-companion' });
    // A standard with no grade-level text requirement keeps the companion by default.
    expect(Context.normalizeInstructionalContext(null, { standardsInput: 'CCSS.ELA-LITERACY.RI.5.2: Determine two or more main ideas of a text.' }))
      .toMatchObject({ primaryTextAccess: 'available', adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default' });
  });

  it('suppresses adaptation only for an explicit sourced prohibition', () => {
    const sourced = Context.normalizeInstructionalContext({
      adaptedTextPolicy: 'include',
      standardsContext: {
        instructionalConstraints: {
          textAccessExpectation: 'adaptation-prohibited',
          basis: 'Official secure-assessment administration rule',
          sourced: true,
        },
      },
    });
    expect(sourced).toMatchObject({
      primaryTextAccess: 'required',
      adaptedTextPolicy: 'prohibited',
      adaptedTextPolicySource: 'standard',
      textAccessReason: 'sourced-adaptation-prohibition',
    });

    // Unsourced: never a prohibition. It still makes the original required, so
    // since 2026-09-27 the companion is left out by default and a teacher can add it.
    const unsourced = Context.normalizeInstructionalContext({
      standardsContext: {
        instructionalConstraints: { textAccessExpectation: 'adaptation-prohibited' },
      },
    });
    expect(unsourced).toMatchObject({ primaryTextAccess: 'required', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard', textAccessReason: 'standard-primary-text-requirement' });
    expect(Context.normalizeInstructionalContext({ adaptedTextPolicy: 'include', standardsContext: unsourced.standardsContext }))
      .toMatchObject({ adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' });

    const unsourcedRawProhibition = Context.normalizeInstructionalContext({
      adaptedTextPolicy: 'prohibited',
      adaptedTextPolicySource: 'standard',
      standardsContext: {
        instructionalConstraints: { textAccessExpectation: 'adaptation-prohibited' },
      },
    });
    expect(unsourcedRawProhibition).toMatchObject({
      adaptedTextPolicy: 'omit',
      adaptedTextPolicySource: 'educator',
      textAccessReason: 'educator-choice',
    });
  });
});
