import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for Logic Lab. Truth tables, parser semantics, and
// proof-challenge solvability are all re-derived independently here.

const sourcePath = 'stem_lab/stem_tool_logiclab.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_logiclab.js';
const src = fs.readFileSync(sourcePath, 'utf8');

const tStub = (key, fallback) => fallback;

// Execute a slice of the tool source (a run of var declarations) and hand
// back the requested bindings. Single-line markers only — the file is CRLF.
function extractScope(startMarker, endMarker, returns, injectT) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  const chunk = src.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function('t', chunk + '\nreturn { ' + returns.join(', ') + ' };')(injectT || tStub);
}

const parser = extractScope('var CONN = {', 'var engMap', [
  'CONN', 'tokenize', 'parseExpr', 'parseUnary', 'evalNode', 'getVars', 'uniqueVars', 'genTable'
]);

// Rows of a truth table as a compact string, for table-vs-table equality.
function signature(exprStr) {
  const table = parser.genTable(exprStr);
  expect(table, exprStr + ' parses').toBeTruthy();
  return table.vars.join('') + '|' + table.rows.map((r) => (r.result ? '1' : '0')).join('');
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'logicLab');
});

describe('connective semantics', () => {
  it('all six connectives match their standard truth tables', () => {
    const expected = {
      '∧': [[false, false, false], [false, true, false], [true, false, false], [true, true, true]],
      '∨': [[false, false, false], [false, true, true], [true, false, true], [true, true, true]],
      '→': [[false, false, true], [false, true, true], [true, false, false], [true, true, true]],
      '↔': [[false, false, true], [false, true, false], [true, false, false], [true, true, true]],
      '⊕': [[false, false, false], [false, true, true], [true, false, true], [true, true, false]]
    };
    for (const op of Object.keys(expected)) {
      for (const [a, b, out] of expected[op]) {
        expect(parser.CONN[op].fn(a, b), op + '(' + a + ',' + b + ')').toBe(out);
      }
    }
    expect(parser.CONN['¬'].fn(true)).toBe(false);
    expect(parser.CONN['¬'].fn(false)).toBe(true);
  });

  it('evalGate implements all seven gates correctly', () => {
    const gates = extractScope('var evalGate = function', 'var isUnaryGate', ['evalGate']);
    const expected = {
      AND: [0, 0, 0, 1], OR: [0, 1, 1, 1], NAND: [1, 1, 1, 0], NOR: [1, 0, 0, 0],
      XOR: [0, 1, 1, 0], XNOR: [1, 0, 0, 1]
    };
    const combos = [[false, false], [false, true], [true, false], [true, true]];
    for (const g of Object.keys(expected)) {
      combos.forEach(([a, b], i) => {
        expect(gates.evalGate(g, a, b), g + '(' + a + ',' + b + ')').toBe(!!expected[g][i]);
      });
    }
    expect(gates.evalGate('NOT', true, false)).toBe(false);
    expect(gates.evalGate('NOT', false, true)).toBe(true);
  });
});

describe('parser', () => {
  it('honors precedence: ¬ over ∧ over ∨ over → over ↔', () => {
    expect(signature('P ∨ Q ∧ R')).toBe(signature('P ∨ (Q ∧ R)'));
    expect(signature('¬ P ∧ Q')).toBe(signature('(¬ P) ∧ Q'));
    expect(signature('P ∧ Q → R')).toBe(signature('(P ∧ Q) → R'));
    expect(signature('P → Q ↔ R')).toBe(signature('(P → Q) ↔ R'));
  });

  it('implication chains are right-associative (regression pin)', () => {
    // P → Q → R must read P → (Q → R). At P=F, Q=T, R=F the standard
    // reading is true while the left-associative reading is false.
    expect(signature('P → Q → R')).toBe(signature('P → (Q → R)'));
    const table = parser.genTable('P → Q → R');
    const row = table.rows.find((r) => !r.env.P && r.env.Q && !r.env.R);
    expect(row.result).toBe(true);
  });

  it('classifies tautology, contradiction, and De Morgan equivalence', () => {
    expect(parser.genTable('P ∨ (¬ P)').type).toBe('tautology');
    expect(parser.genTable('P ∧ (¬ P)').type).toBe('contradiction');
    expect(parser.genTable('(P ∧ (P → Q)) → Q').type).toBe('tautology');
    expect(signature('¬ (P ∧ Q)')).toBe(signature('(¬ P) ∨ (¬ Q)'));
    expect(signature('¬ (P ∨ Q)')).toBe(signature('(¬ P) ∧ (¬ Q)'));
    expect(signature('(P → Q) ∧ (Q → P)')).toBe(signature('P ↔ Q'));
  });
});

describe('inference rules and proof challenges', () => {
  const scope = extractScope('var stripOuterParens = function', 'var FALLACIES', [
    'stripOuterParens', 'RULES', 'PROOF_CHALLENGES'
  ]);

  it('stripOuterParens strips balanced outer parens only', () => {
    expect(scope.stripOuterParens('(P ∧ Q)')).toBe('P ∧ Q');
    expect(scope.stripOuterParens('((P))')).toBe('P');
    expect(scope.stripOuterParens('(P) ∧ (Q)')).toBe('(P) ∧ (Q)');
    expect(scope.stripOuterParens('P ∧ Q')).toBe('P ∧ Q');
  });

  it('canonical applications of each named rule produce the textbook conclusion', () => {
    const byId = {};
    for (const r of scope.RULES) byId[r.id] = r;
    expect(byId.mp.check([], ['P → Q', 'P'])).toBe('Q');
    expect(byId.mp.check([], ['(P ∧ Q) → R', 'P ∧ Q'])).toBe('R');
    expect(byId.mt.check([], ['P → Q', '¬Q'])).toBe('¬P');
    expect(byId.hs.check([], ['P → Q', 'Q → R'])).toBe('P → R');
    expect(byId.ds.check([], ['P ∨ Q', '¬P'])).toBe('Q');
    expect(byId.simp.check([], ['P ∧ Q'])).toBe('P');
    expect(byId.contra.check([], ['P → Q'])).toBe('¬Q → ¬P');
    expect(byId.demorgan.check([], ['¬(P ∧ Q)'])).toBe('¬P ∨ ¬Q');
  });

  it('every proof challenge is solvable by forward-chaining its own rule set', () => {
    // Regression pin: challenge 5 ("(P ∧ Q) → R" + conj) was unsolvable
    // before paren normalization — conj yields "P ∧ Q" and MP compared the
    // strings literally.
    for (const ch of scope.PROOF_CHALLENGES) {
      const goal = ch.conclusion.trim();
      const pool = new Set(ch.premises.map((p) => p.trim()));
      // Conjunction over every pair compounds each round, so bail as soon as
      // the goal lands and cap the pool — 4 rounds over a capped pool is far
      // more than the 2-3 steps any of the eight challenges actually needs.
      for (let round = 0; round < 4 && !pool.has(goal) && pool.size < 200; round++) {
        const items = [...pool];
        for (const rule of scope.RULES) {
          if (!ch.rulesNeeded.includes(rule.id)) continue;
          if (rule.needs === 1) {
            for (const a of items) {
              const out = rule.check(ch.premises, [a]);
              if (out) pool.add(out.trim());
            }
          } else {
            for (const a of items) {
              for (const b of items) {
                if (a === b) continue;
                const out = rule.check(ch.premises, [a, b]);
                if (out) pool.add(out.trim());
                if (pool.has(goal)) break;
              }
              if (pool.has(goal)) break;
            }
          }
          if (pool.has(goal)) break;
        }
      }
      expect(pool.has(goal), 'level ' + ch.level + ' (' + ch.title + ') derives ' + goal).toBe(true);
    }
  });
});

describe('fallacy bank and quick-fire challenges', () => {
  const banks = extractScope('var FALLACIES = [', 'var activeCh', ['FALLACIES', 'TT_CHALLENGES']);

  it('validity flags agree with each argument\'s formal pattern', () => {
    for (const f of banks.FALLACIES) {
      const isFallacyName = /Affirming|Denying|False Exclusive/.test(f.name);
      expect(f.valid, f.arg).toBe(!isFallacyName);
      expect(f.formal.includes(f.valid ? '✓' : '✗'), f.arg + ' formal mark').toBe(true);
    }
  });

  it('every quick-fire expression matches its description semantically', () => {
    const expect2 = (expr, ref) => expect(signature(expr), expr).toBe(signature(ref));
    const byDesc = (needle) => banks.TT_CHALLENGES.find((c) => c.desc.includes(needle));
    expect2(byDesc('AND gate').expr, 'P ∧ Q');
    expect2(byDesc('NAND gate').expr, '¬ (P ∧ Q)');
    expect2(byDesc('NOR gate').expr, '¬ (P ∨ Q)');
    expect2(byDesc('Biconditional').expr, 'P ↔ Q');
    expect(parser.genTable(byDesc('Tautology').expr).type).toBe('tautology');
    expect(parser.genTable(byDesc('Contradiction').expr).type).toBe('contradiction');
  });
});

describe('render and deployment', () => {
  it('renders the default truth-table mode without crashing and shows the expression', () => {
    const html = renderTool('logicLab', { logicLab: {} });
    expect(html.length).toBeGreaterThan(2000);
    expect(html).toContain('Logic Lab');
  });

  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
