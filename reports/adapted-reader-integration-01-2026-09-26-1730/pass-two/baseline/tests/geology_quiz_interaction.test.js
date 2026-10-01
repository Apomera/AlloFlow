// The per-option remediation lives behind React state (quizAns), so SSR cannot see it and
// the pure-hook tests only prove the DATA is right. This mounts the tool for real, clicks a
// wrong answer, and reads the panel — the only way to show the targeted note actually
// reaches the student rather than sitting unreferenced in a registry.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// React is resolved from the harness's own module dir, so `react-dom/test-utils` is not
// importable from here. React 18.3+ exposes act directly.
const act = React.act;
if (typeof act !== 'function') throw new Error('React.act unavailable; cannot drive the tool');
// Without this React warns "not configured to support act(...)" and never flushes the
// commit, so the container stays empty and every query reads as a missing panel.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let cfg;
let container;
let root;

beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  if (container) container.remove();
  root = null;
  container = null;
});

function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  // The quiz lives behind the Assess tab (`inAssessment ? quizPanel() : null`), which is
  // also why editing quiz content never moves the render golden. `mode` seeds from toolData.
  // Tool state is namespaced: `var d = (ctx.toolData && ctx.toolData.geologyExplorer) || {}`.
  const store = newStore({ geologyExplorer: { mode: 'assess' } });
  const ctx = makeCtx({ toolData: store.toolData }, store);
  const Comp = () => cfg.render(ctx);
  root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(Comp)));
  return container;
}

const quizPanel = () => container.querySelector('[data-geology-target="quiz"]');
const buttonsIn = (el) => Array.from(el.querySelectorAll('button'));
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));

function openQuiz() {
  mount();
  const panel = quizPanel();
  expect(panel, 'quiz panel is not in the default render').toBeTruthy();
  const start = buttonsIn(panel).find((b) => /start/i.test(b.textContent));
  expect(start, 'no Start control on the quiz panel').toBeTruthy();
  click(start);
  return quizPanel();
}

// Strip the ✓/✗ prefix the answer buttons add once an answer is revealed.
const optionText = (btn) => btn.textContent.replace(/^[✓✗]\s*/, '').trim();

describe('Geology Explorer quiz — targeted feedback on the chosen option', () => {
  it('shows the note for the wrong option the student actually picked', () => {
    const panel = openQuiz();
    const answers = buttonsIn(panel).filter((b) => !/start|hide|next|try again/i.test(b.textContent));
    expect(answers.length, 'expected three answer choices').toBe(3);

    // 'They formed at the same time' is a distractor on the opening crust question.
    const wrong = answers.find((b) => optionText(b) === 'They formed at the same time');
    expect(wrong, `options were ${JSON.stringify(answers.map(optionText))}`).toBeTruthy();
    click(wrong);

    const note = quizPanel().querySelector('[data-geology-remediation-note]');
    expect(note, 'no targeted note rendered after a wrong answer').toBeTruthy();
    expect(note.textContent).toMatch(/each one was laid down on the finished surface/i);
  });

  it('gives a different note for the other wrong option on the same question', () => {
    const panel = openQuiz();
    const answers = buttonsIn(panel).filter((b) => !/start|hide|next|try again/i.test(b.textContent));
    const wrong = answers.find((b) => optionText(b) === 'Sandstone');
    expect(wrong).toBeTruthy();
    click(wrong);

    const note = quizPanel().querySelector('[data-geology-remediation-note]');
    expect(note).toBeTruthy();
    // The whole point: this must NOT be the note the other distractor gets.
    expect(note.textContent).toMatch(/sandstone sits above the limestone/i);
    expect(note.textContent).not.toMatch(/each one was laid down/i);
  });

  it('shows no targeted note when the answer is right', () => {
    const panel = openQuiz();
    const answers = buttonsIn(panel).filter((b) => !/start|hide|next|try again/i.test(b.textContent));
    const right = answers.find((b) => optionText(b) === 'Limestone');
    expect(right).toBeTruthy();
    click(right);
    expect(quizPanel().querySelector('[data-geology-remediation-note]')).toBeNull();
    expect(quizPanel().querySelector('[data-geology-remediation]')).toBeNull();
  });

  it('marks the outcome with a tick or a cross, never a question mark', () => {
    // Regression cover for the dead ternary `quizAns === Q.correct ? '? ' : '? '`.
    const panel = openQuiz();
    const answers = buttonsIn(panel).filter((b) => !/start|hide|next|try again/i.test(b.textContent));
    click(answers.find((b) => optionText(b) === 'Limestone'));
    const text = quizPanel().textContent;
    expect(text).toContain('✓');
    expect(text).not.toMatch(/\?\s*(Limestone|Sedimentary)/);
  });
});
