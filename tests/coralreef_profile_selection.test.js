import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, TX;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; TX = X.speciesText((key, fallback) => fallback); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function select(element, value) { await React.act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function search(t, value) { const element = t.host.querySelector('input[type="search"]'); await React.act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }); }
const named = (t, text) => [...t.host.querySelectorAll('button')].find(button => button.textContent.trim() === text);
const ids = t => [...t.host.querySelectorAll('[data-species]')].map(card => card.dataset.species);
const profile = t => t.host.querySelector('[data-marine-profile]');
const position = t => t.host.querySelector('[data-profile-selection-position]');
async function mount(seed = {}) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { blue_tang: true, green_turtle: true, long_spined_urchin: true }, speciesFieldNotes: { blue_tang: 'Preserve this note' }, speciesLog: { green_turtle: { firstSeen: 1 } }, ...seed } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}

describe('profile navigation follows the current guide selection', () => {
  it.each(['saved', 'group', 'search', 'role'])('keeps next/previous within the visible %s selection and returns to its opening card', async selection => {
    const t = await mount();
    if (selection === 'saved') await click(named(t, 'Saved species'));
    if (selection === 'group') await select(t.host.querySelector('[data-guide-group-filter]'), 'reptile');
    if (selection === 'search') await search(t, 'turtle');
    if (selection === 'role') await select(t.host.querySelector('[data-guide-role]'), 'cleaners');
    const expected = ids(t), initial = JSON.stringify(t.data);
    expect(expected.length).toBeGreaterThan(1);
    const origin = expected[0]; await click(t.host.querySelector('[data-open-profile="' + origin + '"]'));
    for (let i = 0; i < expected.length; i++) {
      const id = expected[i];
      expect(profile(t).dataset.marineProfile).toBe(id);
      expect(position(t).textContent).toBe('Entry ' + (i + 1) + ' of ' + expected.length + ' in this selection');
      const file = String(X.SPECIES_META.findIndex(m => m.id === id) + 1).padStart(3, '0');
      expect(profile(t).querySelector('.crdx-eyebrow').textContent).toBe('Field file ' + file);
      await click(t.host.querySelector('[data-profile-next]'));
    }
    expect(profile(t).dataset.marineProfile).toBe(origin);
    await click(t.host.querySelector('[data-profile-previous]'));
    expect(profile(t).dataset.marineProfile).toBe(expected.at(-1));
    await click(t.host.querySelector('[data-close-profile]'));
    expect(ids(t)).toEqual(expected);
    expect(document.activeElement).toBe(t.host.querySelector('[data-open-profile="' + origin + '"]'));
    expect(t.data.speciesBookmarks).toEqual(JSON.parse(initial).speciesBookmarks);
    expect(t.data.speciesFieldNotes).toEqual(JSON.parse(initial).speciesFieldNotes);
    expect(t.data.speciesLog).toEqual(JSON.parse(initial).speciesLog);
    expect(t.data.speciesPractice).toBeUndefined();
  });

  it('keeps a saved reading route stable while saving or unsaving, and refreshes it on the next visit', async () => {
    const t = await mount({ speciesBookmarks: { blue_tang: true, green_turtle: true } });
    await click(named(t, 'Saved species')); const expected = ids(t), origin = expected[0];
    await click(t.host.querySelector('[data-open-profile="' + origin + '"]'));
    await click(t.host.querySelector('[data-save-profile="' + origin + '"]'));
    expect(t.data.speciesBookmarks[origin]).toBeUndefined();
    expect(position(t).textContent).toBe('Entry 1 of 2 in this selection');
    await click(t.host.querySelector('[data-profile-next]')); expect(profile(t).dataset.marineProfile).toBe(expected[1]);
    await click(t.host.querySelector('[data-profile-next]')); expect(profile(t).dataset.marineProfile).toBe(origin);
    await click(t.host.querySelector('[data-save-profile="' + origin + '"]'));
    expect(t.data.speciesBookmarks[origin]).toBe(true); expect(position(t).textContent).toBe('Entry 1 of 2 in this selection');
    await click(t.host.querySelector('[data-save-profile="' + origin + '"]'));
    await click(t.host.querySelector('[data-close-profile]'));
    expect(ids(t)).toEqual([expected[1]]); expect(document.activeElement).toBe(t.host.querySelector('input[type="search"]'));
    await click(t.host.querySelector('[data-open-profile="' + expected[1] + '"]'));
    expect(position(t).textContent).toBe('Entry 1 of 1 in this selection');
    expect(t.host.querySelector('[data-profile-next]')).toBeNull(); expect(t.host.querySelector('[data-profile-previous]')).toBeNull();
    expect(JSON.stringify(t.data)).not.toMatch(/navigationIds|profileSelection/);
  });

  it('allows explicit outside look-alikes and comparisons while retaining the original selection and return focus', async () => {
    const t = await mount(); await select(t.host.querySelector('[data-guide-role]'), 'cleaners'); await select(t.host.querySelector('[data-guide-group-filter]'), 'fish');
    expect(ids(t)).toEqual(['cleaner_wrasse']);
    await click(t.host.querySelector('[data-open-profile="cleaner_wrasse"]'));
    expect(position(t).textContent).toContain('1 of 1');
    const related = t.host.querySelector('[data-profile-related]'), otherId = related.dataset.profileRelated;
    await click(related); expect(profile(t).dataset.marineProfile).toBe(otherId); expect(position(t)).toBeNull();
    const next = X.SPECIES_META[(X.SPECIES_META.findIndex(m => m.id === otherId) + 1) % X.SPECIES_META.length];
    expect(t.host.querySelector('[data-profile-next]').getAttribute('aria-label')).toBe('Next entry: ' + TX[next.id].name);
    await click(t.host.querySelector('[data-start-comparison]'));
    await select(t.host.querySelector('[data-compare-select="0"]'), 'cleaner_wrasse');
    await click(t.host.querySelector('[data-comparison-study="cleaner_wrasse"]'));
    expect(profile(t).dataset.marineProfile).toBe('cleaner_wrasse'); expect(position(t).textContent).toContain('1 of 1');
    await click(t.host.querySelector('[data-close-profile]'));
    expect(ids(t)).toEqual(['cleaner_wrasse']); expect(t.host.querySelector('[data-guide-role]').value).toBe('cleaners');
    expect(document.activeElement).toBe(t.host.querySelector('[data-open-profile="cleaner_wrasse"]'));
  });

  it('leaves directly opened and practice-origin profiles on their existing full-guide route', async () => {
    const direct = await mount({ guideSpeciesId: 'blue_tang' });
    expect(position(direct)).toBeNull(); expect(direct.host.querySelector('[data-profile-next]')).toBeTruthy();
    const t = await mount({ speciesBookmarks: { clownfish: true } });
    await click(named(t, 'Saved species')); await click(t.host.querySelector('[data-open-profile="clownfish"]'));
    expect(position(t).textContent).toContain('1 of 1');
    await click(named(t, 'Try identification practice'));
    await select(t.host.querySelector('[data-practice-collection-select]'), 'saved'); await click(t.host.querySelector('[data-practice-start]'));
    await click(t.host.querySelector('[data-practice-skip]')); await click(named(t, 'Study profile'));
    expect(position(t)).toBeNull(); expect(t.host.querySelector('[data-profile-next]')).toBeTruthy();
    await click(t.host.querySelector('[data-profile-next]')); await click(t.host.querySelector('[data-close-profile]'));
    expect(t.host.querySelector('[data-practice-feedback]')).toBeTruthy(); expect(t.host.querySelector('[data-practice-picture-view]')).toBeTruthy();
    expect(t.data.speciesPractice).toBeUndefined(); expect(t.data.speciesFieldNotes).toEqual({ blue_tang: 'Preserve this note' });
  });
});
