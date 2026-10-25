import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000);
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } vi.restoreAllMocks(); });
const q = (t, selector) => t.host.querySelector(selector);
const records = t => JSON.stringify({ bookmarks: t.data.speciesBookmarks, notes: t.data.speciesFieldNotes, log: t.data.speciesLog });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
function target(button) { const node = document.getElementById(button.getAttribute('aria-controls')); expect(node, 'the controlled region exists').toBeTruthy(); return node; }
function connectedControls(t) {
  for (const button of t.host.querySelectorAll('[data-marine-practice="active"] [aria-controls]')) {
    for (const id of button.getAttribute('aria-controls').split(/\s+/)) {
      expect([...t.host.querySelectorAll('[id]')].filter(el => el.id === id), button.textContent + ' has exactly one controlled target').toHaveLength(1);
    }
  }
}
async function mount(mode, ids = ['clownfish']) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: Object.fromEntries(ids.map(id => [id, true])), speciesFieldNotes: { clownfish: 'Keep this field note.' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(q(t, '[data-start-practice]'));
  const collection = q(t, '[data-practice-collection-select]');
  await React.act(async () => { collection.value = 'saved'; collection.dispatchEvent(new Event('change', { bubbles: true })); });
  if (mode === 'marks') await click(q(t, '[data-practice-mode="marks"]'));
  await click(q(t, '[data-practice-start]')); return t;
}

describe('practice disclosure controls have persistent targets', () => {
  it.each(['picture', 'marks'])('keeps %s clue targets available while collapsed, expanded, answered and reset for the next organism', async mode => {
    const t = await mount(mode, ['clownfish', 'blue_tang']), before = records(t), button = q(t, '[data-practice-clue-toggle]');
    const region = target(button); expect(region.hidden).toBe(true); expect(region.children).toHaveLength(0); connectedControls(t);
    await click(button); expect(target(button)).toBe(region); expect(region.hidden).toBe(false); expect(region.children).toHaveLength(1); expect(document.activeElement).toBe(button);
    await click(q(t, '[data-practice-another-clue]')); const shown = region.textContent; expect(region.children.length).toBeGreaterThan(1);
    await click(button); expect(target(button)).toBe(region); expect(region.hidden).toBe(true); expect(region.children).toHaveLength(0); connectedControls(t);
    await click(button); expect(region.textContent).toBe(shown);
    if (mode === 'marks') { await click(q(t, '[data-practice-picture-toggle]')); expect(target(button).textContent).toBe(shown); connectedControls(t); }
    await click(q(t, '[data-practice-skip]')); expect(q(t, '[data-practice-clue-toggle]')).toBeNull(); connectedControls(t);
    await click(q(t, '[data-practice-next]'));
    const next = q(t, '[data-practice-clue-toggle]'); expect(next.getAttribute('aria-expanded')).toBe('false'); expect(target(next).hidden).toBe(true); expect(target(next).children).toHaveLength(0); connectedControls(t);
    expect(t.data.speciesPractice).toBeUndefined(); expect(records(t)).toBe(before);
  });

  it.each(['picture', 'marks'])('keeps the %s comparison target stable while unmounting hidden candidates and retaining focus and results', async mode => {
    const t = await mount(mode), before = records(t), button = q(t, '[data-practice-compare-toggle]'), region = target(button);
    expect(region.hidden).toBe(true); expect(region.children).toHaveLength(0); expect(q(t, '[data-practice-comparison]')).toBeNull(); connectedControls(t);
    await click(button); expect(target(button)).toBe(region); expect(region.hidden).toBe(false); expect(region.contains(document.activeElement)).toBe(true);
    expect(region.querySelectorAll('[data-practice-candidate]')).toHaveLength(3); connectedControls(t);
    await click(q(t, '[data-practice-comparison-close]')); expect(document.activeElement).toBe(button); expect(region.hidden).toBe(true); expect(region.children).toHaveLength(0); connectedControls(t);
    const wrong = [...t.host.querySelectorAll('[data-practice-choice]')].find(el => el.dataset.practiceChoice !== 'clownfish');
    await click(wrong); expect(document.activeElement).toBe(q(t, '[data-practice-feedback]')); expect(target(button)).toBe(region); expect(region.hidden).toBe(true); connectedControls(t);
    await click(button); expect(region.hidden).toBe(false); expect(region.querySelectorAll('[data-practice-candidate]')).toHaveLength(2); expect(region.contains(q(t, '[data-practice-guess-comparison]'))).toBe(true); connectedControls(t);
    await click(q(t, '[data-practice-comparison-close]')); expect(document.activeElement).toBe(button); expect(region.hidden).toBe(true); expect(region.children).toHaveLength(0);
    await click(q(t, '[data-practice-next]')); expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 0, hinted: 1, skipped: 0 }); expect(records(t)).toBe(before);
  });
});
