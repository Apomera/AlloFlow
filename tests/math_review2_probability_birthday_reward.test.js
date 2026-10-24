// Math review 2 (2026-10-19): Birthday Breaker paid its 30 XP the moment the
// mode opened. The check read `(d.birthdayN || 23) === 23`, and 23 is also the
// room size the mode starts on, so the Claim button was there before the
// student had touched anything. Credit now needs the student to set n = 23.
// MATH_REVIEW2_PROBABILITY_SRC lets a mutation run point this at a variant.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_PROBABILITY_SRC || 'stem_lab/stem_tool_probability.js';

const mounted = [];
beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '';
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadTool(SOURCE, 'probability');
});
afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

async function mount(initial, awards) {
  const cfg = window.StemLab._registry.probability;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const box = { state: { probability: initial } };
  function Host() {
    const [toolData, setToolData] = React.useState({ probability: initial });
    box.state = toolData;
    return cfg.render(makeCtx({ toolData, setToolData, awardXP: (...a) => awards.push(a) }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return { container, get p() { return box.state.probability || {}; } };
}

// The challenge card row: <p>Birthday Breaker — 30 XP</p> sits two levels
// inside the row that holds the Claim button.
function claimButton(container, name) {
  const title = Array.from(container.querySelectorAll('p')).find((p) => p.textContent.startsWith(name + ' '));
  expect(title, name + ' challenge row not rendered').toBeTruthy();
  return title.parentElement.parentElement.querySelector('button[aria-label="Claim"]');
}

const setSlider = (input, value) => React.act(async () => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, String(value));
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});

describe('Birthday Breaker challenge', () => {
  it('pays nothing for opening Birthday mode on its default room of 23', async () => {
    const awards = [];
    const m = await mount({ mode: 'birthday', results: [], trials: 0, _completedChallenges: [] }, awards);
    // The default room really is 23, so this is the exact state the bug paid on.
    expect(m.container.textContent).toContain('23 people');
    expect(claimButton(m.container, 'Birthday Breaker'), 'claimable before the student did anything').toBeNull();
    expect(awards).toEqual([]);
  });

  it('pays nothing for arriving in Birthday mode from another mode', async () => {
    const awards = [];
    const m = await mount({ mode: 'coin', showAllExperiments: true, results: [], trials: 0, _completedChallenges: [] }, awards);
    await React.act(async () => { m.container.querySelector('button[data-probability-mode="birthday"]').click(); });
    expect(m.p.mode).toBe('birthday');
    expect(claimButton(m.container, 'Birthday Breaker')).toBeNull();
  });

  it('becomes claimable once the student picks n = 23, and pays once', async () => {
    const awards = [];
    const m = await mount({ mode: 'birthday', results: [], trials: 0, _completedChallenges: [] }, awards);
    await React.act(async () => { m.container.querySelector('button[aria-label="Set group size to 23 people"]').click(); });
    const claim = claimButton(m.container, 'Birthday Breaker');
    expect(claim, 'setting n = 23 should earn the challenge').toBeTruthy();
    await React.act(async () => { claim.click(); claim.click(); });
    expect(awards.filter((a) => a[1] === 30)).toHaveLength(1);
    expect(m.p._completedChallenges).toContain('birthday23');
  });

  it('counts the slider too, but only at 23', async () => {
    const awards = [];
    const m = await mount({ mode: 'birthday', results: [], trials: 0, _completedChallenges: [] }, awards);
    const slider = m.container.querySelector('input[type="range"][aria-label="Number of people in room"]');
    await setSlider(slider, 30);
    expect(m.p.birthdayN).toBe(30);
    expect(claimButton(m.container, 'Birthday Breaker')).toBeNull();
    await setSlider(slider, 23);
    expect(m.p.birthdayN).toBe(23);
    expect(claimButton(m.container, 'Birthday Breaker')).toBeTruthy();
  });
});
