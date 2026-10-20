import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

// Financial Literacy Quiz explanations. The tool's English fallbacks were
// corrected, but ui_strings.js still SHIPS the old text under the old keys
// ("That's ~$140K difference", "about 24 months ... ~$95"), which contradicts
// the answer key. The translation pipeline never updates an existing key's
// value, so the fix is a new key carrying the corrected English.
//
// MR2_NUMBERSENSE_MONEY_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MONEY_SRC || 'stem_lab/stem_tool_money.js';
const src = fs.readFileSync(FILE, 'utf8');
const UI = fs.readFileSync('ui_strings.js', 'utf8');

// The value ui_strings.js ships for a dotted key (leaf lookup), or undefined.
function shipped(key) {
  const leaf = key.split('.').pop();
  const re = new RegExp('"' + leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")', 'g');
  const values = [...UI.matchAll(re)].map((m) => JSON.parse(m[1]));
  return values.length ? values[0] : undefined;
}

// Run the tool's own quiz table with a recording translator.
const used = [];
// eslint-disable-next-line no-new-func
const QUIZ = new Function('__alloT', sliceBetween(src, 'var FIN_QUIZZES = [', 'var genFinQuiz', { file: FILE }) + '\nreturn FIN_QUIZZES;')(
  (k, fb) => { used.push([k, fb]); return fb; }
);

let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'moneyMath'); });
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function answerQuiz(index) {
  const tool = window.StemLab._registry.moneyMath;
  const view = { state: null };
  // The app's translator: the shipped English pack for the quiz keys.
  const t = (k) => (used.some(([key]) => key === k) ? shipped(k) : undefined);
  function App() {
    const [state, setState] = React.useState({ _moneyMath: { tab: 'finance', finSub: 'quiz', currency: 'USD', fqIdx: index, fqAnswer: QUIZ[index].correct } });
    view.state = state._moneyMath;
    return tool.render(makeCtx({ toolData: state, setToolData: setState, t }));
  }
  document.body.innerHTML = '<div id="money-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('money-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  await React.act(async () => { document.querySelector('button[aria-label="Submit Answer"]').click(); });
  return view.state.fqFb.msg;
}

const annuity = (perYear, years, rate) => perYear * ((Math.pow(1 + rate, years) - 1) / rate);

describe('quiz explanations agree with the answer key', () => {
  it('no explanation key ships English that differs from the tool', () => {
    expect(used.length).toBe(QUIZ.length);
    const stale = used.filter(([k, fb]) => shipped(k) !== undefined && shipped(k) !== fb).map(([k]) => k + ' ships: ' + shipped(k));
    expect(stale).toEqual([]);
  });

  it('early starter: $200/month from 25 vs 35 to 65 at 7%', async () => {
    const early = annuity(2400, 40, 0.07), late = annuity(2400, 30, 0.07), gap = early - late;
    const q = QUIZ.findIndex((x) => /age 25 vs\. age 35/.test(x.q));
    const choiceValues = QUIZ[q].choices.map((c) => Number((/\$([\d,]+)/.exec(c) || ['', 'NaN'])[1].replace(/,/g, '')));
    const nearest = choiceValues.reduce((best, v, i) => (Math.abs(v - gap) < Math.abs(choiceValues[best] - gap) ? i : best), 0);
    expect(QUIZ[q].correct).toBe(nearest);
    const msg = await answerQuiz(q);
    expect(msg).toContain('$' + Math.round(early / 1000) + 'K');
    expect(msg).toContain('$' + Math.round(late / 1000) + 'K');
    expect(msg).toContain('$250K');
    expect(msg).not.toContain('$140K');
  });

  it('credit card: $500 at 22% APR paying $25/month', async () => {
    const r = 0.22 / 12;
    const months = -Math.log(1 - (r * 500) / 25) / Math.log(1 + r);
    const interest = months * 25 - 500;
    expect(Math.round(months)).toBe(25);
    const q = QUIZ.findIndex((x) => /credit card debt at 22% APR/.test(x.q));
    expect(QUIZ[q].choices[QUIZ[q].correct]).toBe('About 2 years');
    const msg = await answerQuiz(q);
    expect(msg).toContain('about ' + Math.round(months) + ' months');
    expect(Math.abs(Number(/\$(\d+) in interest/.exec(msg)[1]) - interest)).toBeLessThan(10);
    expect(msg).not.toContain('~$95');
  });
});
