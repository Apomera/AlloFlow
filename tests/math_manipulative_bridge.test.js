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

describe('math<->manipulative bridge step 1b: toggle control + tool-list parity + scaffold hydration', () => {
  const gh = readFileSync(resolve(process.cwd(), 'generation_helpers_source.jsx'), 'utf8');
  const sb = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8');
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

  it('autoAttachManipulatives now has a teacher control — default ON, off-switch', () => {
    expect(sb).toMatch(/autoAttachManipulatives, setAutoAttachManipulatives,/);            // MathPanel destructures it
    expect(sb).toMatch(/checked=\{autoAttachManipulatives !== false\}/);                    // default ON (only explicit false unchecks)
    expect(sb).toMatch(/setAutoAttachManipulatives && setAutoAttachManipulatives\(e\.target\.checked\)/);
    expect(anti).toMatch(/autoAttachManipulatives, setAutoAttachManipulatives\s*\n?\s*\}\)\}/); // monolith threads the prop+setter into MathPanel
  });
  it('the "off" generation path advertises the SAME tool set the renderer grades (kills the 6-vs-17 drift)', () => {
    for (const tool of ['funcGrapher', 'calculus', 'wave', 'cell', 'molecule', 'circuit']) {
      expect(gh).toMatch(new RegExp('Supported tools[\\s\\S]{0,420}"' + tool + '"'));
    }
  });
  it('scaffold (support) seeds richer state; answer (response) stays NEUTRAL so it never hands the answer', () => {
    // support path now seeds these from state (was only coordinate+base10)
    expect(vm).toMatch(/manipulativeSupport\.tool === 'numberline'[\s\S]{0,160}setNumberLineRange/);
    expect(vm).toMatch(/manipulativeSupport\.tool === 'fractions'[\s\S]{0,220}setFractionPieces\(\{ numerator: problem\.manipulativeSupport/);
    expect(vm).toMatch(/manipulativeSupport\.tool === 'volume'[\s\S]{0,260}dims\.l \|\| 1/);
    // response path UNCHANGED — neutral seed (numerator 0, volume 1/1/1)
    expect(vm).toMatch(/manipulativeResponse\.tool === 'fractions'[\s\S]{0,200}numerator: 0,/);
    expect(vm).toMatch(/manipulativeResponse\.tool === 'volume'[\s\S]{0,200}\{ l: 1, w: 1, h: 1 \}/);
  });
});
