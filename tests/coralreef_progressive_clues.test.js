import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback);
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function click(el) {
  expect(el, 'control exists').toBeTruthy();
  await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); });
}
const button = (t, label) => [...t.host.querySelectorAll('button')].find(el => el.textContent.trim() === label);
async function mount(ids = ['clownfish'], mode = 'picture') {
  let data = { coralReef: { section: 'guide', speciesBookmarks: Object.fromEntries(ids.map(id => [id, true])), speciesLog: { green_turtle: { firstSeen: 12 } }, speciesFieldNotes: { clownfish: 'Keep this note' } } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Shell() {
    const [state, setState] = React.useState(data); data = state; update = setState;
    return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key });
  }
  const t = { host, root, get data() { return data.coralReef; }, async patch(values) { await React.act(async () => update(before => ({ ...before, coralReef: { ...before.coralReef, ...values } }))); } };
  mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  if (mode === 'marks') await click(host.querySelector('[data-practice-mode="marks"]'));
  await click(host.querySelector('[data-practice-start]'));
  return t;
}
function visibleExtra(t) { return [...t.host.querySelectorAll('[id$="-more-clues"] li')].map(el => el.textContent); }
const marks = id => X.marinePracticeClues(TX[id], X.SPECIES_META.find(m => m.id === id));
const learning = t => JSON.stringify({ bookmarks: t.data.speciesBookmarks, log: t.data.speciesLog, notes: t.data.speciesFieldNotes });

describe('progressive identification clues', () => {
  it('reveals one additional mark at a time, preserves focus, and stops without losing the final control', async () => {
    const t = await mount(), before = learning(t), clues = marks('clownfish');
    expect(visibleExtra(t)).toEqual([]);
    const toggle = t.host.querySelector('[data-practice-clue-toggle]');
    expect(document.getElementById(toggle.getAttribute('aria-describedby')).textContent).toContain('count as help');
    await click(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(visibleExtra(t)).toEqual(clues.slice(1, 2));
    const another = t.host.querySelector('[data-practice-another-clue]');
    for (let n = 3; n <= clues.length; n++) {
      await click(another);
      expect(document.activeElement).toBe(another);
      expect(visibleExtra(t)).toEqual(clues.slice(1, n));
      expect(t.host.querySelector('[data-practice-clue-count]').textContent).toBe(`Showing ${n} of ${clues.length} field marks.`);
    }
    expect(another.getAttribute('aria-disabled')).toBe('true');
    await click(another); expect(visibleExtra(t)).toEqual(clues.slice(1));
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    expect(t.host.querySelector('[data-practice-another-clue]')).toBeNull();
    expect(t.host.querySelectorAll('[data-practice-detail]')).toHaveLength(TX.clownfish.marks.length);
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 1, hinted: 1 });
    expect(learning(t)).toBe(before);
  });

  it('hides and reopens the already uncovered marks without forgetting or revealing more', async () => {
    const t = await mount(), clues = marks('clownfish');
    await click(t.host.querySelector('[data-practice-clue-toggle]'));
    await click(t.host.querySelector('[data-practice-another-clue]'));
    const toggle = t.host.querySelector('[data-practice-clue-toggle]');
    await click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(visibleExtra(t)).toEqual([]);
    expect(t.host.querySelector('[data-practice-clue-count]')).toBeNull();
    await click(toggle);
    expect(visibleExtra(t)).toEqual(clues.slice(1, 3));
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(toggle);
  });

  it('preserves the same clue sequence through written/picture toggles and a profile detour', async () => {
    const t = await mount(['clownfish'], 'marks'), before = learning(t), clues = marks('clownfish');
    await click(t.host.querySelector('[data-practice-clue-toggle]'));
    expect(t.host.querySelector('[data-practice-mystery]').textContent.toLowerCase()).not.toContain('clownfish');
    expect(visibleExtra(t)).toEqual(clues.slice(1, 2));
    await click(t.host.querySelector('[data-practice-picture-toggle]'));
    await click(t.host.querySelector('[data-practice-another-clue]'));
    expect(visibleExtra(t)).toEqual(clues.slice(1, 3));
    await click(t.host.querySelector('[data-practice-picture-toggle]'));
    expect(visibleExtra(t)).toEqual(clues.slice(1, 3));
    await t.patch({ guideSpeciesId: 'blue_tang' });
    await click(t.host.querySelector('[data-close-profile]'));
    expect(visibleExtra(t)).toEqual(clues.slice(1, 3));
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 1, hinted: 1 });
    expect(learning(t)).toBe(before);
  });

  it('resets clues for each organism and retry while keeping original scoring and the earlier review', async () => {
    const t = await mount(['clownfish', 'blue_tang']);
    await click(t.host.querySelector('[data-practice-clue-toggle]'));
    await click(t.host.querySelector('[data-practice-another-clue]'));
    await click(t.host.querySelector('[data-practice-skip]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(visibleExtra(t)).toEqual([]);
    expect(t.host.querySelector('[data-practice-clue-toggle]').getAttribute('aria-expanded')).toBe('false');
    expect(t.host.querySelector('[data-practice-clue-count]')).toBeNull();
    await click(t.host.querySelector('[data-practice-skip]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 2, skipped: 2, hinted: 1 });
    await click(t.host.querySelector('[data-practice-second-look]'));
    expect(visibleExtra(t)).toEqual([]);
    await click(t.host.querySelector('[data-practice-clue-toggle]'));
    expect(visibleExtra(t)).toHaveLength(1);
    for (let i = 0; i < 2; i++) {
      await click(t.host.querySelector('[data-practice-skip]'));
      await click(t.host.querySelector('[data-practice-next]'));
    }
    expect(t.host.querySelectorAll('[data-practice-earlier-organism]')).toHaveLength(2);
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, correct: 0, answered: 0, last: { total: 2, skipped: 2, hinted: 1 } });
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/clueCount|hintUsed/);
    await click(button(t, 'Choose another group'));
    await click(t.host.querySelector('[data-practice-start]'));
    expect(visibleExtra(t)).toEqual([]);
  });

  it('keeps extra clues optional and records an unassisted correct answer without help', async () => {
    const t = await mount();
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 1, hinted: 0 });
  });
});
