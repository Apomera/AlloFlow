// A truth table doubles with every letter. A student typing a formula with 16 letters froze the tab for 18 s,
// and more letters never came back. LOGIC_SRC points the suite at another copy for the fail-first check.
import fs from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const PATH = process.env.LOGIC_SRC || 'stem_lab/stem_tool_logiclab.js';
const src = fs.readFileSync(PATH, 'utf8');
const LIMIT_MS = 4000;
const formula = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)).join(' ∧ ');

function rowsFor(expr) {
  const a = src.indexOf('var CONN = {'), b = src.indexOf('var engMap', a);
  const script = src.slice(a, b) + '\nvar table = genTable(EXPR);\ntable ? table.rows.length : null;';
  return vm.runInNewContext(script, { EXPR: expr, t: (k, f) => f }, { timeout: LIMIT_MS });
}

describe('Logic Lab truth tables stay bounded', () => {
  it('8 letters still builds the whole table', () => { expect(rowsFor(formula(8))).toBe(256); });
  it.each([9, 16, 26])('%i letters returns at once with no table', (n) => { expect(rowsFor(formula(n))).toBe(null); });
  it('leaves ordinary formulas alone', () => { expect(rowsFor('P → Q')).toBe(4); });
});

describe('the student is told why', () => {
  beforeEach(() => { resetStemLab(); loadTool(PATH, 'logicLab'); });
  it('names the number of letters instead of asking for a formula again', () => {
    const html = renderTool('logicLab', { logicLab: { expression: formula(16) } });
    expect(html).toContain('data-logic-too-many');
    expect(html).toContain('This formula uses 16 different letters');
    expect(html).toContain('stops at 8 letters');
  });
  it('shows a table, not the notice, at the limit', () => {
    const html = renderTool('logicLab', { logicLab: { expression: formula(8) } });
    expect(html).not.toContain('data-logic-too-many');
  });
});
