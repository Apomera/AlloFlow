// Math review 2 (algebra lane): Logic Lab pays each XP item once. "Claim XP" on a
// tautology, opening the Learn panel and loading a preset paid again on every click.
// MATH_REVIEW2_LOGICLAB points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW2_LOGICLAB || 'stem_lab/stem_tool_logiclab.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
let cfg;
beforeEach(() => { resetStemLab(); cfg = loadTool(FILE, 'logicLab'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

async function mount(logicLab) {
  const award = vi.fn();
  const view = { award, state: null, set: null };
  function App() {
    const [state, setState] = React.useState({ logicLab });
    view.state = state; view.set = setState;
    return cfg.render(makeCtx({ toolData: state, setToolData: setState, awardXP: award, addToast: vi.fn(), celebrate: vi.fn() }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return view;
}
const paid = (view, reason) => view.award.mock.calls.filter((c) => c[2] === reason).length;
const button = (label) => document.querySelector('button[aria-label="' + label + '"]');
async function click(label) {
  const b = button(label);
  expect(b, label).toBeTruthy();
  await React.act(() => b.click());
}
async function setExpression(view, expression) {
  await React.act(() => view.set((p) => ({ ...p, logicLab: { ...p.logicLab, expression } })));
}

describe('Claim XP', () => {
  it('pays for a found tautology once, however often it is clicked', async () => {
    const view = await mount({ mode: 'truth', expression: 'P ∨ ¬P' });
    await click('Claim XP');
    for (let i = 0; i < 4; i++) if (button('Claim XP')) await click('Claim XP');
    expect(paid(view, 'Found tautology')).toBe(1);
  });

  it('still pays for a different tautology and for a contradiction', async () => {
    const view = await mount({ mode: 'truth', expression: 'P ∨ ¬P' });
    await click('Claim XP');
    await setExpression(view, 'P → P');
    await click('Claim XP');
    await setExpression(view, 'P ∧ ¬P');
    await click('Claim XP');
    expect(paid(view, 'Found tautology')).toBe(2);
    expect(paid(view, 'Found contradiction')).toBe(1);
    // Back to the first one: already claimed.
    await setExpression(view, 'P ∨ ¬P');
    if (button('Claim XP')) await click('Claim XP');
    expect(paid(view, 'Found tautology')).toBe(2);
  });
});

describe('Learn panel', () => {
  it('opening it again does not pay again', async () => {
    const view = await mount({ mode: 'truth' });
    const toggle = 'Toggle educational panel: What is Propositional Logic';
    for (let i = 0; i < 6; i++) await click(toggle);
    expect(view.state.logicLab.showEdu).toBe(false);
    expect(paid(view, 'First logic session')).toBe(1);
  });
});

describe('truth-table presets', () => {
  it('re-loading the same preset does not pay again', async () => {
    const view = await mount({ mode: 'truth' });
    const presets = [...document.querySelectorAll('button[aria-label^="Load preset: "]')];
    expect(presets.length).toBeGreaterThan(1);
    const first = presets[0].getAttribute('aria-label');
    const second = presets[1].getAttribute('aria-label');
    for (let i = 0; i < 3; i++) await click(first);
    expect(paid(view, 'Truth table explored')).toBe(1);
    await click(second);
    expect(paid(view, 'Truth table explored')).toBe(2);
  });
});
