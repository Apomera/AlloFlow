// The sequence challenge had no interaction coverage: the pure tests check that
// sequenceIsCorrect() grades an array, but nothing drove the actual cards. A click-probe
// across the tool flagged "Reset order" as inert, which turned out to be correct behaviour
// on a fresh mount (the order already IS the initial order) — but that is an assumption
// until you scramble the cards and watch Reset put them back. So this solves the challenge
// through the real controls, the way a keyboard user would.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
if (typeof act !== 'function') throw new Error('React.act unavailable');

let cfg;
let P;
let live = null;

beforeAll(() => {
  resetStemLab();
  delete window.__alloGeologyPure;
  cfg = loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});

afterEach(() => {
  if (live) {
    act(() => live.root.unmount());
    live.container.remove();
    live = null;
  }
});

function mount(scene) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const store = newStore({ geologyExplorer: { scene, mode: 'investigate' } });
  const ctx = makeCtx({ toolData: store.toolData }, store);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(() => cfg.render(ctx))));
  live = { container, root, store };
  return container;
}

const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const order = (c) => [...c.querySelectorAll('[data-geology-sequence-card]')]
  .map((e) => e.getAttribute('data-geology-sequence-card'));
const panelText = (c) => c.querySelector('[data-geology-sequence-challenge]').textContent;

function moveEarlier(c, key) {
  const card = c.querySelector('[data-geology-sequence-card="' + key + '"]');
  expect(card, 'no card for ' + key).toBeTruthy();
  const btn = [...card.querySelectorAll('button')]
    .find((b) => /move .* earlier/i.test(b.getAttribute('aria-label') || ''));
  expect(btn, 'no "move earlier" control on ' + key).toBeTruthy();
  expect(btn.disabled, key + ' cannot move earlier').toBe(false);
  click(btn);
}

const action = (c, re) => [...c.querySelectorAll('[data-geology-sequence-challenge] button')]
  .find((b) => re.test((b.getAttribute('aria-label') || b.textContent || '')));

describe('Geology Explorer — sequence challenge, driven through its controls', () => {
  it('starts scrambled and reorders when a card is moved', () => {
    const c = mount('crust');
    const initial = order(c);
    expect(initial).toEqual(P.sequenceInitialOrder('crust'));
    expect(initial.length).toBeGreaterThan(2);

    moveEarlier(c, initial[1]);
    const after = order(c);
    expect(after, 'moving a card earlier did not reorder the list').not.toEqual(initial);
    expect(after[0]).toBe(initial[1]);
    expect(new Set(after), 'a card was lost or duplicated').toEqual(new Set(initial));
  });

  it('puts a scrambled order back with Reset order', () => {
    const c = mount('crust');
    const initial = order(c);
    moveEarlier(c, initial[2]);
    expect(order(c)).not.toEqual(initial);

    const reset = action(c, /^Reset order$/);
    expect(reset, 'no Reset order control').toBeTruthy();
    click(reset);
    expect(order(c), 'Reset order did not restore the starting order').toEqual(initial);
  });

  it('rejects a wrong order and accepts the geologic one', () => {
    const c = mount('crust');
    const correct = P.sequenceChallenges().crust.items.map((i) => i.key);
    expect(order(c), 'the challenge starts already solved').not.toEqual(correct);

    const check = action(c, /Check sequence|Check again/);
    expect(check, 'no Check control').toBeTruthy();
    click(check);
    expect(panelText(c)).toMatch(/not yet/i);

    // Insertion sort using only the real "Move earlier" control, the keyboard path.
    for (let target = 0; target < correct.length; target++) {
      let guard = 0;
      while (order(c).indexOf(correct[target]) > target) {
        moveEarlier(c, correct[target]);
        if (++guard > correct.length + 2) throw new Error('move earlier made no progress on ' + correct[target]);
      }
    }
    expect(order(c)).toEqual(correct);

    click(action(c, /Check sequence|Check again/));
    expect(panelText(c)).toMatch(/correct/i);
    expect(panelText(c)).not.toMatch(/not yet/i);
  });

  it('solves the same way in every scene', () => {
    for (const scene of P.scenes()) {
      const c = mount(scene);
      const correct = P.sequenceChallenges()[scene].items.map((i) => i.key);
      expect(order(c), scene + ' starts already solved').not.toEqual(correct);
      for (let target = 0; target < correct.length; target++) {
        let guard = 0;
        while (order(c).indexOf(correct[target]) > target) {
          moveEarlier(c, correct[target]);
          if (++guard > correct.length + 2) throw new Error(scene + ': no progress on ' + correct[target]);
        }
      }
      expect(order(c), scene).toEqual(correct);
      click(action(c, /Check sequence|Check again/));
      expect(panelText(c), scene + ' rejected its own correct order').toMatch(/correct/i);
      act(() => live.root.unmount());
      live.container.remove();
      live = null;
    }
  }, 60000);
});
