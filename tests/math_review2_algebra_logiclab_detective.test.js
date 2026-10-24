// Math review 2 (algebra lane): Logic Lab "Real-World Reasoning" cases. All six
// built-in answers were "Yes" and "Can't tell" was never correct, so answering Yes
// every time won. Each case is checked here with the tool's own truth-table engine:
// Yes = the clues entail the claim, No = they entail its negation, Can't tell = neither.
// MATH_REVIEW2_LOGICLAB points the suite at another copy (mutation checks).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.MATH_REVIEW2_LOGICLAB || 'stem_lab/stem_tool_logiclab.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let cfg;
beforeEach(() => { resetStemLab(); cfg = loadTool(FILE, 'logicLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

const tFn = (k, fb) => fb;
const eng = (() => {
  const body = sliceBetween(src, 'var CONN = {', '// ── Proof Challenges', { file: FILE, label: 'logic engine' });
  // eslint-disable-next-line no-new-func
  return new Function('t', body + '\nreturn { genTable };')(tFn);
})();
const DETECTIVE = (() => {
  const body = sliceBetween(src, 'var DETECTIVE = [', '];', { file: FILE, label: 'DETECTIVE', includeEnd: true });
  // eslint-disable-next-line no-new-func
  return new Function('t', body + '\nreturn DETECTIVE;')(tFn);
})();

// Each case's clues and question in symbols, found by what the scenario talks about.
const FORMAL = [
  { about: /butler/i, asks: /butler/i, premises: ['B → W', 'M → F', '¬W'], query: 'B' },
  { about: /volcano/i, asks: /win/i, premises: ['V → T', 'T → D', 'D'], query: 'V' },
  { about: /pizza/i, asks: /pasta/i, premises: ['Z ∨ A', '¬Z'], query: 'A' },
  { about: /creature/i, asks: /wings/i, premises: ['W → F', 'F → S', '¬S'], query: 'W' },
  { about: /gold/i, asks: /Cave B/, premises: ['A ∨ B', '¬A'], query: 'B' },
  { about: /picnic/i, asks: /cancel/i, premises: ['C → R', 'R → X', '¬C'], query: 'X' },
];
const tautology = (s) => { const tb = eng.genTable(s); expect(tb, s).not.toBeNull(); return tb.type === 'tautology'; };
function verdict(premises, query) {
  const all = premises.map((p) => '(' + p + ')').join(' ∧ ');
  expect(tautology('¬(' + all + ')'), 'clues contradict each other').toBe(false);
  if (tautology('(' + all + ') → (' + query + ')')) return true;
  if (tautology('(' + all + ') → ¬(' + query + ')')) return false;
  return 'unknown';
}

describe('built-in detective cases', () => {
  it('every answer is what the clues actually support', () => {
    expect(DETECTIVE.length).toBe(FORMAL.length);
    for (const c of DETECTIVE) {
      const f = FORMAL.find((x) => x.about.test(c.scenario));
      expect(f, c.scenario).toBeTruthy();
      expect(c.question, c.scenario).toMatch(f.asks);
      expect(c.answer, c.question).toBe(verdict(f.premises, f.query));
    }
  });

  it('answers vary, and at least one case is genuinely "Can\'t tell"', () => {
    const answers = DETECTIVE.map((c) => c.answer);
    for (const a of [true, false, 'unknown']) expect(answers, String(a)).toContain(a);
    // No single button wins more than half of the cases.
    for (const a of [true, false, 'unknown']) expect(answers.filter((x) => x === a).length, String(a)).toBeLessThanOrEqual(DETECTIVE.length / 2);
  });
});

describe('the answer buttons', () => {
  async function answerCase(index, label) {
    const award = vi.fn();
    let latest;
    function App() {
      const [state, setState] = React.useState({ logicLab: { mode: 'challenges', challengeMode: 'detective', challengeIdx: index } });
      latest = state;
      return cfg.render(makeCtx({ toolData: state, setToolData: setState, awardXP: award, addToast: vi.fn() }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const b = document.querySelector('button[aria-label="' + label + '"]');
    expect(b, label).toBeTruthy();
    await React.act(() => b.click());
    const out = { answer: latest.logicLab.challengeAnswer, paid: award.mock.calls.filter((c) => c[2] === 'Detective reasoning').length };
    await React.act(() => root.unmount());
    root = null;
    return out;
  }
  const LABEL = { true: 'Yes', false: 'No', unknown: "Can't tell" };

  it('grade every case: the right button is correct and pays, the others do not', async () => {
    for (let i = 0; i < DETECTIVE.length; i++) {
      const right = LABEL[String(DETECTIVE[i].answer)];
      for (const label of Object.values(LABEL)) {
        const r = await answerCase(i, label);
        expect(r.answer, 'case ' + i + ' ' + label).toBe(label === right ? 'correct' : 'wrong');
        expect(r.paid, 'case ' + i + ' ' + label).toBe(label === right ? 1 : 0);
      }
    }
  });
});
