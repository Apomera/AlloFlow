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
const graderModule = readFileSync(resolve(process.cwd(), 'math_manipulative_grader_module.js'), 'utf8');

describe('math<->manipulative bridge: grading delegates to one defensive implementation', () => {
  it('delegates the check action to MathManipulativeGrader', () => {
    const count = (tool) => (vm.match(new RegExp("manipulativeResponse\\.tool === '" + tool + "'", 'g')) || []).length;
    expect(count('calculus')).toBe(0);
    expect(count('wave')).toBe(0);
    expect(count('cell')).toBe(0);
    expect(vm).toContain('gradeMathViewManipulativeResponse(');
  });
  it('the cell branch grades CELL state, never overwrites isCorrect with calculus (the mis-grade bug)', () => {
    // the exact removed defect: cell sets selectedOrganelle, then `const lcl = labToolData.calculus` overwrites it
    expect(vm).not.toMatch(/selectedOrganelle[\s\S]{0,120}?const lcl = labToolData\.calculus/);
  });
  it('keeps the standard manipulative tools in the pure grader registry', () => {
    for (const tool of ['coordinate', 'base10', 'numberline', 'fractions', 'volume', 'protractor', 'funcGrapher', 'calculus', 'wave', 'cell']) {
      expect(graderModule).toContain('\n  ' + tool + '(');
    }
  });
});

describe('pure manipulative grader registry', () => {
  it('covers every tool exposed by the MathView bridge', () => {
    const tools = ['coordinate', 'base10', 'numberline', 'fractions', 'volume', 'protractor', 'funcGrapher', 'physics', 'chemBalance', 'punnett', 'circuit', 'dataPlot', 'inequality', 'molecule', 'calculus', 'wave', 'cell'];
    for (const tool of tools) expect(graderModule).toContain('\n  ' + tool + '(');
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
    expect(sb).toMatch(/React\.createElement\(window\.AlloModules\.MathPanel,\s*\{[\s\S]{0,2200}?autoAttachManipulatives,\s*setAutoAttachManipulatives,[\s\S]{0,900}?\}\)\}/); // sidebar shell threads both props into MathPanel, even when later props are added
  });
  it('the "off" generation path advertises the SAME tool set the renderer grades (kills the 6-vs-17 drift)', () => {
    for (const tool of ['funcGrapher', 'calculus', 'wave', 'cell', 'molecule', 'circuit']) {
      expect(gh).toMatch(new RegExp('Supported tools[\\s\\S]{0,420}"' + tool + '"'));
    }
  });
  it('scaffold (support) seeds richer state; answer (response) stays NEUTRAL so it never hands the answer', () => {
    const supportStart = vm.indexOf('var openMathManipulativeSupport');
    const supportBlock = vm.slice(supportStart, vm.indexOf('var openMathManipulativeResponse', supportStart));
    expect(supportStart).toBeGreaterThan(-1);
    expect(supportBlock).toContain("tool === 'numberline'");
    expect(supportBlock).toContain('setNumberLineMarkers(');
    expect(supportBlock).toContain('setNumberLineRange(');
    expect(supportBlock).toContain("tool === 'fractions'");
    expect(supportBlock).toContain('setFractionPieces(supportFraction)');
    expect(supportBlock).toContain("tool === 'volume'");
    expect(supportBlock).toContain('setCubeDims(normalizedSupportDims)');
    expect(supportBlock).toContain("tool === 'protractor'");
    expect(supportBlock).toContain("tool === 'circuit'");
    // Response path remains neutral (numerator 0, volume 1/1/1).
    expect(vm).toMatch(/manipulativeResponse\.tool === 'fractions'[\s\S]{0,200}numerator: 0,/);
    expect(vm).toMatch(/manipulativeResponse\.tool === 'volume'[\s\S]{0,200}\{ l: 1, w: 1, h: 1 \}/);
  });
});

describe('step 2/3: inline parametric diagram renderer (_renderDiagramSvg, canonical in utils_pure) — accessible SVG', () => {
  // Canonical impl now lives in utils_pure (shared with QuizView / future surfaces). Extract + run the REAL fn.
  const up = readFileSync(resolve(process.cwd(), 'utils_pure_source.jsx'), 'utf8');
  const m = up.match(/function _renderDiagramSvg\(tool, state, titleText\) \{[\s\S]*?\r?\n  return null;\r?\n\}/);
  const render = m ? new Function('return (' + m[0] + ')')() : null;

  it('the renderer exists in source', () => {
    expect(m).toBeTruthy();
  });
  it('numberline → accessible SVG with title/desc/role + the marker label', () => {
    const svg = render('numberline', { range: { min: 0, max: 10 }, markers: [{ value: 5, label: 'A' }] }, 'My line');
    expect(svg).toContain('<svg');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>My line</title>');
    expect(svg).toMatch(/<desc>[^<]*Number line from 0 to 10/);
    expect(svg).toContain('>A<'); // marker label rendered as text
  });
  it('coordinate → accessible SVG that lists the plotted point in <desc>', () => {
    const svg = render('coordinate', { points: [{ x: 2, y: 3, label: 'P' }] }, 'Grid');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>Grid</title>');
    expect(svg).toMatch(/<desc>[^<]*Points:[^<]*P \(2, 3\)/);
  });
  it('escapes dynamic label text (no raw markup injection)', () => {
    const svg = render('numberline', { range: { min: 0, max: 4 }, markers: [{ value: 1, label: '<x>' }] }, 'safe');
    expect(svg).toContain('&lt;x&gt;');
    expect(svg).not.toContain('<x>'); // never injected raw
  });
  it('validates graphAlt before exposing it', () => {
    expect(vm).toContain('var mathGraphAlt = _mathScalarText(generatedContent.data.graphAlt, 4000)');
    expect(vm).toContain("aria-label={mathGraphAlt || 'Visual diagram for this problem'}");
  });
  it('returns null for unsupported tools / missing state (caller falls back to the button)', () => {
    expect(render('volume', { dims: { l: 2, w: 2, h: 2 } })).toBeNull();
    expect(render('numberline', null)).toBeNull();
    expect(render(null, {})).toBeNull();
  });
  it('utils_pure exports the canonical renderer; view_math DELEGATES to it (single source, no drift)', () => {
    expect(up).toMatch(/window\.AlloModules\.UtilsPure = \{[\s\S]*?_renderDiagramSvg,/);
    expect(vm).toMatch(/window\.AlloModules && window\.AlloModules\.UtilsPure/);
    expect(vm).toMatch(/_U\._renderDiagramSvg\(tool, state, titleText\)/);
  });
  it('is wired inline in the math view and validates graphAlt', () => {
    expect(vm).toMatch(/_renderDiagramSvg\(problem\.manipulativeSupport\.tool, problem\.manipulativeSupport\.state/);
    expect(vm).toContain('var mathGraphAlt = _mathScalarText(generatedContent.data.graphAlt, 4000)');
  });
  it('fractions → divided bar with N/D label + accessible desc', () => {
    const svg = render('fractions', { numerator: 3, denominator: 4 }, '');
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/<desc>[^<]*3 of 4 equal parts shaded/);
    expect(svg).toContain('>3/4<');
  });
  it('fractions clamps numerator to denominator (no out-of-range shading)', () => {
    const svg = render('fractions', { numerator: 9, denominator: 4 }, '');
    expect(svg).toMatch(/<desc>[^<]*4 of 4 equal parts shaded/);
  });
  it('renders hostile fraction denominators in bounded compact form', () => {
    const svg = render('fractions', { numerator: 500000000, denominator: 1000000000 }, '');
    expect(svg).toMatch(/<desc>[^<]*500000000 of 1000000000 equal parts shaded/);
    expect(svg).toContain('>500000000/1000000000<');
    expect((svg.match(/<rect /g) || []).length).toBeLessThanOrEqual(2);
    expect(svg.length).toBeLessThan(2000);
  });
  it('base10 → blocks with the correct total in <desc>', () => {
    const svg = render('base10', { hundreds: 2, tens: 3, ones: 5 }, '');
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/<desc>[^<]*2 hundreds, 3 tens, 5 ones = 235/);
  });
  it('protractor → rays + degrees in <desc> and label', () => {
    const svg = render('protractor', { angle: 60 }, '');
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/<desc>[^<]*60 degrees/);
    expect(svg).toContain('60°');
  });
  it('generation prefers parametric manipulativeSupport over frozen graphData + requires graphAlt (a11y)', () => {
    const gh = readFileSync(resolve(process.cwd(), 'generation_helpers_source.jsx'), 'utf8');
    expect(gh).toMatch(/PREFER a parametric "manipulativeSupport"/);
    expect(gh).toMatch(/ALWAYS set "graphAlt"/);
    expect(gh).toMatch(/"graphAlt": "one-sentence/);
  });
});
