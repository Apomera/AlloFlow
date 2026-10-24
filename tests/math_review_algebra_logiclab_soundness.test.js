// Math review (algebra lane): Logic Lab parser strictness, sound inference rules,
// solved-proof quests, AI proof acceptance, Undo selection and quick-fire XP.
// MATH_REVIEW_LOGICLAB points the suite at another copy (mutation checks).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_LOGICLAB || 'stem_lab/stem_tool_logiclab.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let cfg;
beforeEach(() => { resetStemLab(); cfg = loadTool(FILE, 'logicLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

const tFn = (k, fb) => fb;
function slice(startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('t', src.slice(start, end) + '\nreturn { ' + returns + ' };')(tFn);
}
const eng = slice('var CONN = {', '// ── Proof Challenges', 'genTable, RULES, PRESETS');
const TT = slice('var TT_CHALLENGES = [', 'var activeCh', 'TT_CHALLENGES').TT_CHALLENGES;
const PROOFS = (() => {
  const start = src.indexOf('var PROOF_CHALLENGES = [');
  const end = src.indexOf('];', start) + 2;
  // eslint-disable-next-line no-new-func
  return new Function('t', src.slice(start, end) + '\nreturn PROOF_CHALLENGES;')(tFn);
})();
const rule = (id) => eng.RULES.find((r) => r.id === id);
const tautology = (s) => { const tb = eng.genTable(s); return !!tb && tb.type === 'tautology'; };
const equivalent = (a, b) => tautology('(' + a + ') ↔ (' + b + ')');

describe('truth-table parser', () => {
  it('builds no table for an incomplete or foreign expression', () => {
    for (const bad of ['P → ', 'P ∨ ¬', 'Q →', 'P -> Q', 'p → q', '(P ∧ Q', 'P Q']) {
      expect(eng.genTable(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('still tables every preset and every quick-fire expression', () => {
    for (const p of eng.PRESETS) expect(eng.genTable(p.expr), p.expr).not.toBeNull();
    for (const c of TT) expect(eng.genTable(c.expr), c.expr).not.toBeNull();
    expect(eng.genTable('P → Q').type).toBe('contingency');
    expect(eng.genTable('(P ∧ (P → Q)) → Q').type).toBe('tautology');
  });
});

describe('inference rules are sound', () => {
  const pool = ['P', 'Q', 'R', '¬P', '¬Q', '¬R', '¬¬Q', 'P → Q', 'Q → R', 'P → Q → R', '(P ∧ Q) → R',
    'P ∨ Q', 'P ∨ Q ∧ R', '¬Q ∧ P → Q', '¬(P ∧ Q)', '¬(P ∨ Q)', 'P ∧ Q'];
  const EQUIV = ['dn', 'contra', 'demorgan'];
  function apply(r, sel) { try { return r.check([], sel); } catch (e) { return null; } }
  function expectSound(r, sel, out) {
    const label = r.id + '(' + sel.join(' ; ') + ') = ' + out;
    expect(eng.genTable(out), label + ' is not a formula').not.toBeNull();
    if (EQUIV.indexOf(r.id) !== -1) expect(equivalent(sel[0], out), label).toBe(true);
    else expect(tautology('(' + sel.map((s) => '(' + s + ')').join(' ∧ ') + ') → (' + out + ')'), label).toBe(true);
  }
  it('every derivable result follows from its inputs, two steps deep', () => {
    const level1 = [];
    for (const r of eng.RULES) {
      const sels = r.needs === 2 ? pool.flatMap((a) => pool.filter((b) => b !== a).map((b) => [a, b])) : pool.map((a) => [a]);
      for (const sel of sels) {
        const out = apply(r, sel);
        if (!out) continue;
        expectSound(r, sel, out);
        level1.push({ sel, out });
      }
    }
    // Feed the first-step results back in with a premise (the unsound chains needed two steps).
    for (const { sel, out } of level1) {
      for (const r of eng.RULES) {
        const sels = r.needs === 2 ? pool.map((b) => [out, b]) : [[out]];
        for (const s2 of sels) {
          const out2 = apply(r, s2);
          if (!out2) continue;
          // Sound relative to the ORIGINAL inputs plus the extra premise.
          const prem = sel.concat(s2.slice(1)).map((s) => '(' + s + ')').join(' ∧ ');
          const ok = EQUIV.indexOf(r.id) !== -1 ? equivalent(out, out2) : tautology('(' + prem + ') → (' + out2 + ')');
          expect(ok, r.id + ' after ' + out + ' with ' + s2.slice(1).join(',') + ' = ' + out2).toBe(true);
        }
      }
    }
  });

  it('Simplification of an implication is refused, not "(P"', () => {
    expect(apply(rule('simp'), ['(P ∧ Q) → R'])).toBeNull();
  });

  it('all eight built-in proofs remain solvable', () => {
    for (const ch of PROOFS) {
      let known = ch.premises.slice();
      let solved = known.some((k) => equivalent(k, ch.conclusion));
      for (let depth = 0; depth < 3 && !solved; depth++) {
        const next = known.slice();
        for (const r of eng.RULES) {
          const sels = r.needs === 2 ? known.flatMap((a) => known.filter((b) => b !== a).map((b) => [a, b])) : known.map((a) => [a]);
          for (const sel of sels) { const out = apply(r, sel); if (out && next.indexOf(out) === -1) next.push(out); }
        }
        known = next;
        solved = known.some((k) => k.replace(/\s+/g, '') === ch.conclusion.replace(/\s+/g, ''));
      }
      expect(solved, 'Level ' + ch.level).toBe(true);
    }
  });
});

describe('proof quests and AI proofs', () => {
  it('selecting a level does not complete a challenge quest', () => {
    for (const id of ['complete_challenge', 'complete_3_challenges']) {
      const hook = cfg.questHooks.find((h) => h.id === id);
      expect(hook.check({ currentChallenge: 4 }), id).toBe(false);
    }
    expect(cfg.questHooks.find((h) => h.id === 'complete_challenge').check({ solvedProofs: { L0: true } })).toBe(true);
  });

  it('shows an AI proof that follows the prompt schema', () => {
    const html = renderTool('logicLab', { logicLab: { mode: 'proof', aiProof: { level: 2, title: 'Rainy Day', premises: ['R → S', 'R'], conclusion: 'S', hint: 'Modus Ponens', context: 'A rainy-day story' } } });
    expect(html).toContain('R → S');
    expect(html).toContain('A rainy-day story');
  });

  it('solving records the proof, pays once, and Undo clears the selection', async () => {
    const award = vi.fn();
    let latest, setRef;
    function App() {
      const [state, setState] = React.useState({ logicLab: { mode: 'proof', currentChallenge: 0, selectedSteps: ['P0', 'P1'] } });
      latest = state; setRef = setState;
      return cfg.render(makeCtx({ toolData: state, setToolData: setState, awardXP: award, addToast: vi.fn() }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const mp = () => document.querySelector('button[aria-label="Apply rule: Modus Ponens"]');
    await React.act(() => mp().click());
    expect(latest.logicLab.proofComplete).toBe(true);
    expect(cfg.questHooks.find((h) => h.id === 'complete_challenge').check(latest.logicLab)).toBe(true);
    await React.act(() => setRef((p) => ({ ...p, logicLab: { ...p.logicLab, selectedSteps: ['S0'] } })));
    await React.act(() => document.querySelector('button[aria-label="Undo"]').click());
    expect(latest.logicLab.selectedSteps || []).toEqual([]);
    await React.act(() => setRef((p) => ({ ...p, logicLab: { ...p.logicLab, selectedSteps: ['P0', 'P1'] } })));
    await React.act(() => mp().click());
    expect(latest.logicLab.proofComplete).toBe(true);
    expect(award.mock.calls.filter((c) => c[2] === 'Proof completed').length).toBe(1);
  });
});

describe('AI argument cards', () => {
  it('answering the built-in card does not answer the AI card', () => {
    const aiFallacy = { arg: 'If it rains the road is wet. The road is wet. So it rained.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P', explain: 'Something else could wet the road.' };
    const html = renderTool('logicLab', { logicLab: { mode: 'challenges', challengeMode: 'fallacy', challengeAnswer: 'correct', aiFallacy } });
    expect((html.match(/Correct!/g) || []).length).toBe(1);
    const unanswered = renderTool('logicLab', { logicLab: { mode: 'challenges', challengeMode: 'fallacy', aiChallengeAnswer: 'correct', aiFallacy } });
    expect((unanswered.match(/Correct!/g) || []).length).toBe(1);
  });
});

describe('quick-fire truth tables', () => {
  it('pays for a finished table once, not on every render', () => {
    const answers = { 0: false, 1: false, 2: false, 3: true }; // P AND Q; rows run FF, FT, TF, TT
    const store = newStore({ logicLab: { mode: 'challenges', challengeMode: 'quickfire', challengeIdx: 0, qfAnswers: answers } });
    const award = vi.fn();
    for (let pass = 0; pass < 5; pass++) {
      const ctx = makeCtx({ toolData: store.toolData, awardXP: award }, store);
      ReactDOMServer.renderToStaticMarkup(React.createElement(function C() { return cfg.render(ctx); }));
    }
    expect(award.mock.calls.filter((c) => c[2] === 'Quick-fire completed').length).toBeLessThanOrEqual(1);
  });

  it('pays when the last correct answer is clicked', async () => {
    const award = vi.fn();
    function App() {
      const [state, setState] = React.useState({ logicLab: { mode: 'challenges', challengeMode: 'quickfire', challengeIdx: 0, qfAnswers: { 0: false, 1: false, 2: false } } });
      return cfg.render(makeCtx({ toolData: state, setToolData: setState, awardXP: award }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    await React.act(() => document.querySelector('button[aria-label="T"]').click());
    await React.act(() => root.render(React.createElement(App)));
    expect(award.mock.calls.filter((c) => c[2] === 'Quick-fire completed').length).toBe(1);
  });
});
