// Math review 2 (algebra lane): Algebra CAS reads numbers the way students write them.
// "1,000" was split into the roots 1 and 0, "x = 3, x = 3" (a double root listed twice)
// was "Roots differ", "3 1/2" was read as 31/2, and 0.333 for 1/3 was a flat "wrong"
// with the worked solution opened. MATH_REVIEW2_ALGEBRACAS points the suite at another
// copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW2_ALGEBRACAS || 'stem_lab/stem_tool_algebracas.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'algebraCAS'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });
const cas = () => window.__alloCASPure;
const grade = (s, c) => cas().gradeAnswer(s, c);

describe('thousands separators', () => {
  it('1,000 is one thousand, not the roots 1 and 0', () => {
    expect(grade('1,000', '1000')).toMatchObject({ decidable: true, correct: true });
    expect(grade('x = 1,000', 'x = 1000')).toMatchObject({ decidable: true, correct: true });
    expect(grade('x = -2,500.5', 'x = -2500.5')).toMatchObject({ decidable: true, correct: true });
    expect(grade('x = 1,000, x = -1,000', 'x = -1000, x = 1000')).toMatchObject({ decidable: true, correct: true });
    expect(grade('1,000', '100')).toMatchObject({ decidable: true, correct: false });
  });

  it('a root list typed without spaces still grades as a list', () => {
    expect(grade('3,-2', 'x = -2, x = 3')).toMatchObject({ decidable: true, correct: true });
    expect(grade('x=10,100', 'x = 10, x = 100')).toMatchObject({ decidable: true, correct: true });
    expect(grade('1,00', '1, 0')).toMatchObject({ decidable: true, correct: true });
  });

  it('local linear practice accepts a thousands separator', () => {
    expect(cas().gradeLinear('2x = 2000', '1,000')).toMatchObject({ decidable: true, correct: true });
    expect(cas().gradeLinear('2x = 2000', 'x = 1,000')).toMatchObject({ decidable: true, correct: true });
  });
});

describe('repeated roots', () => {
  it('listing a double root twice matches listing it once', () => {
    expect(grade('x=3, x=3', 'x = 3')).toMatchObject({ decidable: true, correct: true });
    expect(grade('x = 3', 'x = 3, x = 3')).toMatchObject({ decidable: true, correct: true });
    expect(grade('x=3, x=3', 'x = 3, x = -3')).toMatchObject({ decidable: true, correct: false });
    expect(grade('x = 3, x = -3', 'x = 3')).toMatchObject({ decidable: true, correct: false });
  });
});

describe('mixed numbers', () => {
  it('3 1/2 is three and a half', () => {
    expect(grade('3 1/2', '7/2')).toMatchObject({ decidable: true, correct: true });
    expect(grade('x = -1 1/2', 'x = -3/2')).toMatchObject({ decidable: true, correct: true });
    expect(grade('3 1/2', '31/2')).toMatchObject({ decidable: true, correct: false });
  });
});

describe('rounded decimals', () => {
  it('0.333 for 1/3 is not graded right, and is flagged as rounded rather than wrong', () => {
    const r = grade('0.333', 'x = 1/3');
    expect(r.correct).toBe(false);
    expect(r.rounded).toBe(true);
    expect(grade('x = 0.33', 'x = 1/3').rounded).toBe(true);
    expect(grade('0.3', '1/3').rounded).toBe(true); // 1/3 to the nearest tenth
    expect(grade('x = 0.67, x = -1', 'x = 2/3, x = -1').rounded).toBe(true);
  });

  it('a decimal that is not a rounding of the answer is just wrong', () => {
    for (const s of ['0.4', '0.34', '0.332', '0.66']) {
      const r = grade(s, s === '0.66' ? '2/3' : '1/3');
      expect(r, s).toMatchObject({ decidable: true, correct: false });
      expect(r.rounded, s).not.toBe(true);
    }
    expect(grade('0.5', '1/2')).toMatchObject({ decidable: true, correct: true });
  });

  async function practice(problem, answer, typed) {
    const gemini = vi.fn(() => Promise.resolve('CORRECT: yes\nFEEDBACK: ok\nSOLUTION:\nSTEP 1: work\nANSWER: ' + answer));
    let latest;
    function App() {
      const [state, setState] = React.useState({ algebraCAS: { tab: 'practice', practiceQ: { problem, answer, hint: '' }, practiceAnswer: typed, practiceStreak: 2 } });
      latest = state;
      return window.StemLab._registry.algebraCAS.render(makeCtx({ toolData: state, setToolData: setState, callGemini: gemini, awardXP: vi.fn(), addToast: vi.fn() }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const check = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '✅ Check');
    expect(check).toBeTruthy();
    await React.act(async () => { check.click(); await Promise.resolve(); });
    await React.act(async () => { await Promise.resolve(); });
    const out = { cas: latest.algebraCAS, text: document.body.textContent, gemini };
    await React.act(() => root.unmount());
    root = null;
    return out;
  }

  it('practice asks for the exact value instead of marking 0.333 wrong', async () => {
    const r = await practice('3x = 1', 'x = 1/3', '0.333');
    expect(r.cas.practiceFeedback || null).toBeNull();
    expect(r.cas.practiceStreak).toBe(2);
    expect(r.cas.practiceNotice).toMatch(/exact/i);
    expect(r.text).toMatch(/exact/i);
  });

  it('when the problem asks for rounding, the engine does not overrule the reviewer', async () => {
    const r = await practice('3x = 1. Round to the nearest hundredth.', 'x = 1/3', '0.33');
    expect(r.cas.practiceFeedback).toMatchObject({ correct: true, gradeSource: 'ai' });
  });

  it('the exact answer still grades right through the engine', async () => {
    const r = await practice('3x = 1', 'x = 1/3', '1/3');
    expect(r.cas.practiceFeedback).toMatchObject({ correct: true, gradeSource: 'verified' });
    expect(r.cas.practiceStreak).toBe(3);
  });
});
