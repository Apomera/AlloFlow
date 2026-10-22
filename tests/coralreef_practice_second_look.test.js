import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element).toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
function named(host, text) { return [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text); }
const target = t => t.host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
async function mount(bookmarks = { clownfish: true, blue_tang: true, brain_coral: true, green_turtle: true, barrel_sponge: true }) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: bookmarks, speciesFieldNotes: { clownfish: 'A saved field note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; update = setState; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; }, async patch(patch) { await React.act(async () => update(before => ({ ...before, coralReef: { ...before.coralReef, ...patch } }))); } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(host.querySelector('[data-practice-start]')); return t;
}
async function writeObservation(t, text) {
  const input = t.host.querySelector('[data-practice-observation-input]');
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function answer(t, correct = true) {
  const id = target(t);
  await click(correct ? t.host.querySelector('[data-practice-choice="' + id + '"]') : [...t.host.querySelectorAll('[data-practice-choice]')].find(b => b.dataset.practiceChoice !== id));
  await click(t.host.querySelector('[data-practice-next]'));
  return id;
}

describe('focused second-look practice', () => {
  it('asks only missed or revealed organisms, without treating help or uncertainty as a miss', async () => {
    const t = await mount(), missed = [], all = [];
    for (let i = 0; i < 5; i++) {
      const id = target(t); all.push(id);
      if (i === 0) {
        await writeObservation(t, 'My first shape observation');
        await click(t.host.querySelector('[data-confidence-choice="sure"]'));
        await click([...t.host.querySelectorAll('[data-practice-choice]')].find(b => b.dataset.practiceChoice !== id));
        await click(t.host.querySelector('[data-practice-detail="1"]'));
        await click(t.host.querySelector('[data-practice-next]')); missed.push(id);
      } else if (i === 1) {
        await click(t.host.querySelector('[data-practice-skip]')); await click(t.host.querySelector('[data-practice-next]')); missed.push(id);
      } else {
        if (i === 2) {
          await click(t.host.querySelector('[data-confidence-choice="exploring"]'));
          await click(t.host.querySelector('[data-practice-compare-toggle]'));
        }
        await answer(t);
      }
    }
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 4, correct: 3, last: { total: 5, skipped: 1, hinted: 1 } });
    const chosenMark = t.host.querySelector('[data-practice-review-detail="' + missed[0] + '"]').textContent;
    expect(t.host.querySelector('[data-practice-second-look-offer]').textContent).toContain('these 2 missed or revealed');
    await click(t.host.querySelector('[data-practice-second-look]'));
    expect(t.host.querySelector('[data-practice-second-look-active]')).toBeTruthy();
    expect(t.host.querySelector('.cr-dxp-heading').textContent).toBe('Organism 1 of 2');
    expect(document.activeElement).toBe(t.host.querySelector('.cr-dxp-heading'));
    expect(t.host.querySelector('[data-practice-earlier-review]')).toBeNull();
    expect(t.host.querySelector('[data-practice-observation-input]').value).toBe('');
    expect(t.host.querySelectorAll('[data-confidence-choice][aria-pressed="true"]')).toHaveLength(0);
    const repeated = [await answer(t), await answer(t)];
    expect(repeated.sort()).toEqual(missed.sort());
    expect(t.data.speciesPractice).toMatchObject({ rounds: 2, answered: 6, correct: 5, last: { total: 2, correct: 2, skipped: 0, hinted: 0 } });
    const earlier = t.host.querySelector('[data-practice-earlier-review]');
    expect(earlier.open).toBe(false);
    expect([...earlier.querySelectorAll('[data-practice-earlier-organism]')].map(e => e.dataset.practiceEarlierOrganism).sort()).toEqual(all.sort());
    expect(earlier.querySelector('[data-practice-earlier-observation]').textContent).toBe('My first shape observation');
    expect([...earlier.querySelectorAll('[data-practice-earlier-detail]')].map(e => e.textContent)).toContain(chosenMark);
    expect(earlier.textContent).toContain('Feel sure');
    expect(t.host.querySelectorAll('[data-practice-new-recognition]')).toHaveLength(2);
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/earlierReview|observation|confidence|detailIndex/);
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'A saved field note' });
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
  });

  it('keeps the first review across successive smaller retries and profile roundtrips', async () => {
    const t = await mount({ clownfish: true, blue_tang: true, brain_coral: true });
    const original = [];
    for (let i = 0; i < 3; i++) original.push(await answer(t, i === 2));
    await click(t.host.querySelector('[data-practice-second-look]'));
    const missedAgain = target(t);
    await t.patch({ guideSpeciesId: 'green_turtle' });
    await click(t.host.querySelector('[data-close-profile]'));
    expect(target(t)).toBe(missedAgain);
    expect(t.host.querySelector('[data-practice-second-look-active]')).toBeTruthy();
    await answer(t, false); await answer(t, true);
    expect(t.host.querySelectorAll('[data-practice-earlier-organism]')).toHaveLength(3);
    await click(t.host.querySelector('[data-practice-second-look]'));
    expect(target(t)).toBe(missedAgain);
    expect(t.host.querySelector('.cr-dxp-heading').textContent).toBe('Organism 1 of 1');
    await answer(t);
    expect(t.data.speciesPractice.rounds).toBe(3);
    expect([...t.host.querySelectorAll('[data-practice-earlier-organism]')].map(e => e.dataset.practiceEarlierOrganism).sort()).toEqual(original.sort());
    expect(t.host.querySelectorAll('[data-practice-new-recognition]')).toHaveLength(1);
    await click(named(t.host, 'Choose another group'));
    await click(t.host.querySelector('[data-practice-start]'));
    expect(t.host.querySelector('[data-practice-second-look-active]')).toBeNull();
    for (let i = 0; i < 3; i++) await answer(t);
    expect(t.host.querySelector('[data-practice-earlier-review]')).toBeNull();
  });

  it('can revisit a missed saved organism after the saved collection changes without adding outsiders', async () => {
    const t = await mount({ clownfish: true }); await answer(t, false);
    await t.patch({ speciesBookmarks: {} });
    await click(t.host.querySelector('[data-practice-second-look]'));
    expect(target(t)).toBe('clownfish');
    expect(t.host.querySelector('.cr-dxp-heading').textContent).toBe('Organism 1 of 1');
    await answer(t);
    expect(named(t.host, 'Choose a mixed collection')).toBeTruthy();
    expect(t.data.speciesBookmarks).toEqual({});
  });
});
