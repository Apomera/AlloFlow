import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

const ids = ['goldmouth_sea_squirt', 'feather_duster_worm', 'christmas_tree_worm', 'bennetts_feather_star',
  'barrel_sponge', 'orange_cup_coral', 'magnificent_anemone', 'giant_clam'];
let X;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});
function profile(id, theme = 'light', data = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('coralReef', { coralReef: { ...data, section: 'guide', guideSpeciesId: id } }, { theme });
  return host.querySelector('[data-marine-profile]');
}

describe('contextual animal-group explanations', () => {
  it('provides concise source-backed notes only for the reviewed animals', () => {
    const notes = X.marineAnimalGroupNotes((key, fallback) => fallback);
    expect(Object.keys(notes)).toEqual(ids);
    for (const [id, note] of Object.entries(notes)) {
      expect(X.SPECIES_META.some(meta => meta.id === id)).toBe(true);
      expect(note.text.trim().split(/\s+/).length, id + ' stays readable').toBeLessThanOrEqual(55);
      expect(note.text.length, id).toBeGreaterThan(100);
      expect(note.source.title).toMatch(/University of Hawaiʻi|Museums Victoria|NOAA/);
      expect(new URL(note.source.url).protocol).toBe('https:');
      expect(['manoa.hawaii.edu', 'collections.museumsvictoria.com.au', 'oceanservice.noaa.gov']).toContain(new URL(note.source.url).hostname);
    }
    expect(notes.reef_manta).toBeUndefined(); expect(notes.biorock).toBeUndefined();
  });

  it('explains body plans that separate visually similar animals', () => {
    const notes = X.marineAnimalGroupNotes((key, fallback) => fallback);
    expect(notes.goldmouth_sea_squirt.label).toMatch(/chordate.*without a backbone/i);
    expect(notes.goldmouth_sea_squirt.text).toMatch(/notochord.*adult has no backbone.*two siphons/);
    for (const id of ['feather_duster_worm', 'christmas_tree_worm']) expect(notes[id].label).toMatch(/^Annelid:/);
    expect(notes.christmas_tree_worm.text).toMatch(/two spirals belong to one segmented worm/i);
    expect(notes.bennetts_feather_star.label).toMatch(/^Echinoderm:/);
    expect(notes.bennetts_feather_star.text).toMatch(/jointed arms.*cirri/);
    expect(notes.barrel_sponge.text).toMatch(/Porifera.*tiny pores.*water outlet/);
    for (const id of ['orange_cup_coral', 'magnificent_anemone']) expect(notes[id].label).toMatch(/^Cnidarian:/);
    expect(notes.orange_cup_coral.text).toContain('hard limestone skeleton');
    expect(notes.magnificent_anemone.text).toContain('Water pressure supports its body');
    expect(notes.giant_clam.label).toMatch(/Mollusc.*bivalve/);
    expect(notes.giant_clam.text).toContain('two hinged shell halves');
  });

  it('puts each explanation beside the profile ecology with its source and preserves learner records', () => {
    const notes = X.marineAnimalGroupNotes((key, fallback) => fallback);
    const data = { speciesBookmarks: { giant_clam: true }, speciesFieldNotes: { barrel_sponge: 'Water leaves the top.' }, speciesLog: { clownfish: { firstSeen: 1 } } };
    const before = JSON.stringify(data);
    for (const id of ids) {
      const host = profile(id, 'light', data), panel = host.querySelector('[data-animal-group="' + id + '"]');
      expect(panel, id).toBeTruthy();
      const heading = panel.querySelector('h4'), titles = [...host.querySelectorAll('h4')].map(h => h.textContent);
      expect(heading.textContent).toBe('What kind of animal is this?');
      expect(panel.getAttribute('aria-labelledby')).toBe(heading.id);
      expect(titles.indexOf(heading.textContent)).toBeGreaterThan(titles.indexOf('Life on the reef'));
      expect(titles.indexOf(heading.textContent)).toBeLessThan(titles.indexOf('A little deeper'));
      expect(panel.textContent).toContain(notes[id].label); expect(panel.textContent).toContain(notes[id].text);
      const source = panel.querySelector('a');
      expect(source.href).toBe(notes[id].source.url); expect(source.textContent).toBe(notes[id].source.title);
      expect(source.target).toBe('_blank'); expect(source.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
      expect(panel.querySelector('canvas')).toBeNull();
    }
    expect(profile('clownfish').querySelector('[data-animal-group]')).toBeNull();
    expect(JSON.stringify(data)).toBe(before);
  });

  it('keeps the classification panel accessible in every theme', async () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const panel = profile('goldmouth_sea_squirt', theme).querySelector('[data-animal-group]');
      const result = await runIsolatedAxe(panel.outerHTML);
      expect(result.violations.map(violation => violation.id), theme).toEqual([]);
    }
  }, 60000);
});
