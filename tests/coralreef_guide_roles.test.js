import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, profiles;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; profiles = X.marineProfiles((key, fallback) => fallback);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function select(element, value) { expect(element).toBeTruthy(); await React.act(async () => { element.focus(); element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function query(t, text) { const el = t.host.querySelector('input[type="search"]'); await React.act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
const named = (t, text) => [...t.host.querySelectorAll('button')].find(button => button.textContent.trim() === text);
const role = t => t.host.querySelector('[data-guide-role]');
const ids = t => [...t.host.querySelectorAll('[data-species]')].map(card => card.dataset.species);
async function mount() {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { blue_tang: true, long_spined_urchin: true }, speciesFieldNotes: { parrotfish: 'A note to preserve' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
const featured = {
  grazers: ['parrotfish', 'green_turtle', 'long_spined_urchin'],
  cleaners: ['cleaner_wrasse', 'cleaner_shrimp'],
  plankton: ['blue_tang', 'anthias', 'blue_green_chromis', 'reef_manta', 'christmas_tree_worm', 'sea_fan', 'goldmouth_sea_squirt', 'feather_duster_worm']
};

describe('featured reef roles in the species guide', () => {
  it('shows curated cross-group examples with the exact existing diet notes, without altering the learner record', async () => {
    const t = await mount(), initial = JSON.stringify(t.data);
    expect(role(t).value).toBe('all'); expect(ids(t)).toHaveLength(X.SPECIES_META.length);
    expect(t.host.querySelectorAll('[data-guide-role-note]')).toHaveLength(0);
    const help = t.host.querySelector('#' + role(t).getAttribute('aria-describedby'));
    expect(help.textContent).toContain('a few examples');
    for (const [collection, expected] of Object.entries(featured)) {
      await select(role(t), collection);
      expect(ids(t).sort()).toEqual(expected.slice().sort());
      expect(document.activeElement).toBe(role(t));
      for (const id of expected) {
        expect(t.host.querySelector('[data-guide-role-note="' + id + '"]').textContent).toBe('What it eats: ' + profiles[id].diet);
        expect(profiles[id].sources.length, id + ' retains profile source references').toBeGreaterThan(0);
      }
      expect(t.host.querySelector('[data-guide-result-count]').textContent).toContain('Showing ' + expected.length + ' of');
      expect(JSON.stringify(t.data)).toBe(initial);
    }
    await select(role(t), 'all'); expect(ids(t)).toHaveLength(X.SPECIES_META.length);
    expect(t.host.querySelectorAll('[data-guide-role-note]')).toHaveLength(0);
  });

  it('intersects roles with group and description search and keeps diet excerpts unduplicated', async () => {
    const t = await mount();
    await select(role(t), 'plankton');
    await select(t.host.querySelector('[data-guide-group-filter]'), 'invertebrate');
    expect(ids(t).sort()).toEqual(['christmas_tree_worm', 'feather_duster_worm', 'goldmouth_sea_squirt', 'sea_fan']);
    await select(t.host.querySelector('[data-guide-search-mode]'), 'description'); await query(t, 'protective plankton');
    expect(ids(t)).toEqual(['christmas_tree_worm']);
    const card = t.host.querySelector('[data-species="christmas_tree_worm"]');
    expect(card.querySelector('[data-guide-role-note]').textContent).toContain(profiles.christmas_tree_worm.diet);
    expect(card.textContent.split(profiles.christmas_tree_worm.diet)).toHaveLength(2);
    expect(card.querySelector('[data-guide-match]'), 'other matching evidence remains available').toBeTruthy();
    expect(t.host.querySelector('[data-guide-result-count]').textContent).toContain('Showing 1 of');
  });

  it('explains an empty saved/group intersection and clears only the role, while the full reset clears all filters', async () => {
    const t = await mount();
    await click(named(t, 'Saved species'));
    await select(t.host.querySelector('[data-guide-group-filter]'), 'fish');
    await query(t, 'blue'); await select(role(t), 'cleaners');
    expect(ids(t)).toEqual([]);
    expect(t.host.querySelector('[data-guide-role-empty]').textContent).toContain('keeping your collection, group and search');
    await click(t.host.querySelector('[data-guide-clear-role]'));
    expect(role(t).value).toBe('all'); expect(ids(t)).toEqual(['blue_tang']);
    expect(t.host.querySelector('input[type="search"]').value).toBe('blue');
    expect(document.activeElement).toBe(t.host.querySelector('input[type="search"]'));
    expect(t.data).toMatchObject({ guideFilter: 'saved', guideGroupFilter: 'fish' });
    await select(role(t), 'cleaners'); await click(t.host.querySelector('[data-guide-reset]'));
    expect(role(t).value).toBe('all'); expect(ids(t)).toHaveLength(X.SPECIES_META.length);
    expect(t.host.querySelector('input[type="search"]').value).toBe('');
    expect(t.data).toMatchObject({ guideFilter: 'all', guideGroupFilter: 'all', speciesFieldNotes: { parrotfish: 'A note to preserve' }, speciesLog: { green_turtle: { firstSeen: 1 } } });
  });

  it('preserves role browsing through profiles, reveals out-of-role look-alikes, and practises the selected role', async () => {
    const t = await mount(); await select(role(t), 'grazers');
    await click(t.host.querySelector('[data-open-profile="parrotfish"]'));
    expect(t.host.querySelector('[data-marine-profile="parrotfish"]')).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    expect(role(t).value).toBe('grazers'); expect(ids(t).sort()).toEqual(featured.grazers.slice().sort());
    expect(document.activeElement).toBe(t.host.querySelector('[data-open-profile="parrotfish"]'));
    const other = X.SPECIES_META.find(m => m.id === 'parrotfish').lookalikes.find(id => !featured.grazers.includes(id));
    expect(other).toBeTruthy();
    await click(t.host.querySelector('[data-species="parrotfish"] [data-lookalike="' + other + '"]'));
    expect(role(t).value).toBe('all'); expect(ids(t)).toContain(other);
    expect(document.activeElement).toBe(t.host.querySelector('[data-species="' + other + '"] .cr-sp-name'));
    await select(role(t), 'cleaners'); await click(t.host.querySelector('[data-start-practice]'));
    expect(t.host.querySelector('[data-practice-collection-select]').value).toBe('selection');
    expect(Number(t.host.querySelector('[data-practice-count]').dataset.practiceCount)).toBe(featured.cleaners.length);
    await select(t.host.querySelector('[data-practice-collection-select]'), 'all');
    const available = X.SPECIES_META.filter(m => m.group !== 'structure').length;
    expect(Number(t.host.querySelector('[data-practice-count]').dataset.practiceCount)).toBe(available);
    await select(t.host.querySelector('[data-practice-collection-select]'), 'selection');
    expect(Number(t.host.querySelector('[data-practice-count]').dataset.practiceCount)).toBe(featured.cleaners.length);
    await click(t.host.querySelector('[data-practice-start]'));
    expect(t.host.querySelector('.cr-dxp-heading').textContent).toBe('Organism 1 of 2');
    expect(featured.cleaners).toContain(t.host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''));
    await click(named(t, 'Back to the field guide'));
    expect(role(t).value).toBe('cleaners'); expect(ids(t).sort()).toEqual(featured.cleaners.slice().sort());
    expect(t.data.speciesPractice).toBeUndefined();
    expect(t.data.speciesBookmarks).toEqual({ blue_tang: true, long_spined_urchin: true });
  });
});
