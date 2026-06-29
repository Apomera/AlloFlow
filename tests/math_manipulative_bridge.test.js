import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Regression guard for the math-problem <-> manipulative bridge grading
// (view_math_source.jsx "Check My Manipulative"). A duplicated calculus/wave/cell
// block (workflow w5si3heva, 2026-06-29) sat INSIDE the cell branch and overwrote
// a cell problem's isCorrect with calculus logic (labToolData.calculus) — actively
// mis-grading cell-manipulative problems — followed by unreachable dup wave/cell
// else-ifs. Fixed by deleting the duplicate; these pins keep it from recurring.
const vm = readFileSync(resolve(process.cwd(), 'view_math_source.jsx'), 'utf8');

describe('math<->manipulative bridge: manipulativeResponse grading has no duplicate branches', () => {
  it('has exactly ONE grading branch each for calculus / wave / cell', () => {
    const count = (tool) => (vm.match(new RegExp("manipulativeResponse\\.tool === '" + tool + "'", 'g')) || []).length;
    expect(count('calculus')).toBe(1);
    expect(count('wave')).toBe(1);
    expect(count('cell')).toBe(1);
  });
  it('the cell branch grades CELL state, never overwrites isCorrect with calculus (the mis-grade bug)', () => {
    // the exact removed defect: cell sets selectedOrganelle, then `const lcl = labToolData.calculus` overwrites it
    expect(vm).not.toMatch(/selectedOrganelle[\s\S]{0,120}?const lcl = labToolData\.calculus/);
  });
  it('still grades the standard manipulative tools (sanity — the fix only removed the dup)', () => {
    for (const tool of ['coordinate', 'base10', 'numberline', 'fractions', 'volume', 'protractor', 'funcGrapher', 'calculus', 'wave', 'cell']) {
      expect(vm).toMatch(new RegExp("manipulativeResponse\\.tool === '" + tool + "'"));
    }
  });
});
