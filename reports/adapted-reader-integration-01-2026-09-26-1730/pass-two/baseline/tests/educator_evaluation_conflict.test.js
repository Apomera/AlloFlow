import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let E;

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.EducatorEvaluation;
  window.React = window.React || {
    createElement: () => null, Fragment: 'Fragment', useState: value => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {}, useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn,
  };
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'educator_evaluation_module.js'), 'utf8'))();
  E = window.AlloModules.EducatorEvaluation._testing;
});

describe('district conflict recovery', () => {
  it('replays independent fields and id-addressable records without replacing current district work', () => {
    const base = { config: { year: '2026-27' }, observations: [{ id: 'o1', evidence: 'base', reflection: '' }] };
    const local = { config: { year: '2026-27' }, observations: [{ id: 'o1', evidence: 'local evidence', reflection: '' }, { id: 'o2', evidence: 'new local' }] };
    const remote = { config: { year: '2027-28' }, observations: [{ id: 'o1', evidence: 'base', reflection: 'district reflection' }] };

    const result = E.aeThreeWayMerge(base, local, remote);

    expect(result.conflicts).toEqual([]);
    expect(result.appliedCount).toBeGreaterThan(0);
    expect(result.workspace.config.year).toBe('2027-28');
    expect(result.workspace.observations).toEqual([
      { id: 'o1', evidence: 'local evidence', reflection: 'district reflection' },
      { id: 'o2', evidence: 'new local' },
    ]);
  });

  it('keeps the district value and describes the field when both sessions changed it', () => {
    const result = E.aeThreeWayMerge(
      { observations: [{ id: 'o1', evidence: 'base' }] },
      { observations: [{ id: 'o1', evidence: 'local attempt' }] },
      { observations: [{ id: 'o1', evidence: 'district current' }] },
    );

    expect(result.workspace.observations[0].evidence).toBe('district current');
    expect(result.conflicts).toEqual([{
      path: 'workspace.observations[o1].evidence', attempted: 'local attempt', current: 'district current',
    }]);
    expect(result.appliedCount).toBe(0);
  });

  it('pins the review-first UI and base snapshot carried with each save', () => {
    const source = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
    expect(source).toContain('This record changed in another session');
    expect(source).toContain('Reapply only my non-conflicting work');
    expect(source).toContain('baseWorkspace: aeClone');
    expect(source).toContain("error.code === 'conflict'");
  });
});
