import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Context;

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
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

  it('makes complex grade-level text required while still including the adapted companion', () => {
    const context = Context.normalizeInstructionalContext(null, {
      standardsInput: 'CCSS.ELA-LITERACY.RI.5.10: Read grade-level complex text independently and proficiently.',
    });
    expect(context).toMatchObject({
      primaryTextAccess: 'required',
      adaptedTextPolicy: 'include',
      textAccessReason: 'standard-text-complexity-requirement',
    });

    const educatorOmit = Context.normalizeInstructionalContext({ adaptedTextPolicy: 'omit' }, {
      standardsInput: 'CCSS.ELA-LITERACY.RI.5.10: Read grade-level complex text independently and proficiently.',
    });
    expect(educatorOmit).toMatchObject({
      primaryTextAccess: 'required',
      adaptedTextPolicy: 'omit',
      adaptedTextPolicySource: 'educator',
    });
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

    const unsourced = Context.normalizeInstructionalContext({
      standardsContext: {
        instructionalConstraints: { textAccessExpectation: 'adaptation-prohibited' },
      },
    });
    expect(unsourced.adaptedTextPolicy).toBe('include');

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
