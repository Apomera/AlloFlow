import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let E;

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorEvaluation;
  window.React = window.React || {
    createElement: () => null, Fragment: 'Fragment',
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {}, useRef: (value) => ({ current: value }), useMemo: (fn) => fn(),
  };
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  E = window.AlloModules.EducatorEvaluation._testing;
});

describe('Educator Evaluation Simulation Studio', () => {
  it('interprets concrete natural-language parameters locally', () => {
    const parsed = E.aeParseSimulationRequest(
      'Create 18 fictional educators, 3 buildings, 4 overdue, 2 finalized, 2 walkthroughs per educator, thin evidence in Domain 3, using Maine PEPG.',
      { staffCount: 8, buildingCount: 2, finalizedCount: 2, overdueCount: 1, walkthroughsPerTeacher: 1, frameworkProfile: 'pa_act13', thinEvidenceDomain: 'none' },
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.params).toMatchObject({
      staffCount: 18, buildingCount: 3, overdueCount: 4, finalizedCount: 2,
      walkthroughsPerTeacher: 2, frameworkProfile: 'maine_pepg', thinEvidenceDomain: 'd3',
    });
    expect(parsed.recognized.length).toBeGreaterThanOrEqual(6);
  });

  it('does not pretend an unconstrained sentence was understood', () => {
    const parsed = E.aeParseSimulationRequest('Make it feel more realistic.', {
      staffCount: 8, buildingCount: 2, finalizedCount: 2, overdueCount: 1,
      walkthroughsPerTeacher: 1, frameworkProfile: 'pa_act13', thinEvidenceDomain: 'none',
    });
    expect(parsed.ok).toBe(false);
    expect(parsed.recognized).toEqual([]);
  });

  it('accepts compact label-first parameters and publishes scenario starters', () => {
    const parsed = E.aeParseSimulationRequest(
      'Educators: 12; buildings: 2; finalized: 3; overdue: 2; walkthroughs: 4; Maine PEPG; thin Domain 1.',
      { staffCount: 8, buildingCount: 1, finalizedCount: 1, overdueCount: 1, walkthroughsPerTeacher: 1, frameworkProfile: 'pa_act13', thinEvidenceDomain: 'none' },
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.params).toMatchObject({
      staffCount: 12, buildingCount: 2, finalizedCount: 3, overdueCount: 2,
      walkthroughsPerTeacher: 4, frameworkProfile: 'maine_pepg', thinEvidenceDomain: 'd1',
    });
    const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
    expect(source).toContain('Small-school tour');
    expect(source).toContain('Busy midyear');
    expect(source).toContain('Evidence-gap review');
    expect(source).toContain('Advanced workspace options · AI reflection and custom rubric');
  });

  it('builds deterministic bounded fictional counts and published walkthroughs', () => {
    const workspace = E.aeBuildSimulatedWorkspace({
      staffCount: 18, buildingCount: 3, finalizedCount: 2, overdueCount: 4,
      walkthroughsPerTeacher: 2, frameworkProfile: 'pa_act13', thinEvidenceDomain: 'd3',
    });
    const summary = E.aeSimulationSummary(workspace);
    expect(workspace.config).toMatchObject({ sampleMode: true, frameworkProfile: 'pa_act13' });
    expect(summary).toEqual({ staff: 18, buildings: 3, finalized: 2, overdue: 4, walkthroughs: 36 });
    expect(workspace.teachers.every((teacher) => /^Teacher \d{2}$/.test(teacher.name))).toBe(true);
    expect(workspace.walkthroughs.every((item) => item.publishedAt && item.privacyChecked)).toBe(true);
    expect(workspace.walkthroughs.flatMap((item) => item.componentTags).some((tag) => /^3/.test(tag))).toBe(false);
  });

  it('clamps coupled values so finalized plus overdue cannot exceed staff', () => {
    const summary = E.aeSimulationSummary(E.aeBuildSimulatedWorkspace({
      staffCount: 3, buildingCount: 99, finalizedCount: 20, overdueCount: 20,
      walkthroughsPerTeacher: 99,
    }));
    expect(summary).toEqual({ staff: 3, buildings: 3, finalized: 3, overdue: 0, walkthroughs: 24 });
  });

  it('keeps helper setup preferences bounded during workspace normalization', () => {
    const valid = E.aeNormalizeWorkspace({ config: {
      setupPath: 'principal_share',
      shareHelperUrl: 'https://script.google.com/macros/s/abc_123/exec',
      shareHelperVerified: true,
      shareHelperChecklist: ['approval', 'project', 'code', 'code', 'unknown'],
    } });
    expect(valid.config).toMatchObject({ setupPath: 'principal_share', shareHelperVerified: true, shareHelperChecklist: ['approval', 'project', 'code'] });
    expect(valid.config.shareHelperUrl).toMatch(/\/exec$/);
    const invalid = E.aeNormalizeWorkspace({ config: { setupPath: 'unknown', shareHelperUrl: 'javascript:alert(1)' } });
    expect(invalid.config).toMatchObject({ setupPath: 'local', shareHelperUrl: '' });
  });
});
