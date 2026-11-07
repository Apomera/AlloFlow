import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Three Indo-Pacific reef predators: a schooling barracuda, a nest-guarding
// triggerfish and a trevally that follows other hunters. Facts and sources:
// lane_fish/NOTES.md (Fishes of Australia, Australian Museum, FishBase, WoRMS,
// Randall & Millington 1990, Reef Smart Guides, Potts 1980/1981, Quimbayo et al. 2014).
const IDS = ['blackfin_barracuda', 'titan_triggerfish', 'bluefin_trevally'];
const META = {
  blackfin_barracuda: { group: 'fish', scientific: 'Sphyraena qenie', iucn: 'LC', iucnYear: 2023, lookalikes: ['bluefin_trevally'] },
  titan_triggerfish: { group: 'fish', scientific: 'Balistoides viridescens', iucn: 'LC', iucnYear: 2022, lookalikes: ['clown_triggerfish'] },
  bluefin_trevally: { group: 'fish', scientific: 'Caranx melampygus', iucn: 'LC', iucnYear: 2015, lookalikes: ['blackfin_barracuda'] }
};
let X, text, profiles, sources;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((key, fallback) => fallback); profiles = X.marineProfiles((key, fallback) => fallback); sources = X.marineProfileSources();
});

describe('reef predators learning integration', () => {
  it('registers each predator with its accepted name, dated Red List status and lookalikes after the last fish', () => {
    const ids = X.SPECIES_META.map(m => m.id), at = ids.indexOf('longfin_bannerfish');
    expect(ids.slice(at + 1, at + 4)).toEqual(IDS);
    for (const id of IDS) {
      expect(X.SPECIES_META.filter(m => m.id === id)).toHaveLength(1);
      expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject(META[id]);
    }
  });

  it('teaches the field marks each source names, in plain words without dashes', () => {
    const marks = id => text[id].marks.join(' ');
    for (const id of IDS) {
      expect(text[id].marks, id).toHaveLength(4);
      for (const s of [text[id].name, text[id].role, text[id].fact, ...text[id].marks]) { expect(/[‐-―]/.test(s), id + ': ' + s).toBe(false); expect(s.length).toBeGreaterThan(10); }
    }
    expect(text.blackfin_barracuda.name).toBe('Blackfin barracuda');
    expect(marks('blackfin_barracuda')).toMatch(/About 20 dark bars: slanted above the side line and almost upright below it/);
    expect(marks('blackfin_barracuda')).toMatch(/forked tail fin that is mostly black/);
    expect(text.blackfin_barracuda.fact).toMatch(/months or even years/);
    expect(marks('titan_triggerfish')).toMatch(/dark centres/);
    expect(marks('titan_triggerfish')).toMatch(/black band with yellow spots runs across the eye down to the side-fin base/);
    expect(marks('titan_triggerfish')).toMatch(/moustache/);
    expect(text.titan_triggerfish.role).toMatch(/sea urchins, crabs.*coral/);
    expect(text.titan_triggerfish.fact).toMatch(/cone that reaches up from the nest toward the surface, so the safe way out is sideways, not upward/);
    expect(marks('bluefin_trevally')).toMatch(/Electric blue second back fin, fin under the tail and tail fin/);
    expect(marks('bluefin_trevally')).toMatch(/scutes/);
    expect(text.bluefin_trevally.fact).toMatch(/follow other hunters.*moray eel/);
    // The goatfish association could not be confirmed in a primary source, so it is not claimed.
    for (const id of IDS) expect(JSON.stringify([text[id], profiles[id]]).toLowerCase()).not.toContain('goatfish');
  });

  it('gives every profile field substance and resolves each bibliography entry', () => {
    for (const id of IDS) {
      const p = profiles[id];
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(p[field].length, id + ' ' + field).toBeGreaterThan(25);
      expect(p.sources.length, id).toBeGreaterThanOrEqual(4);
      expect(X.marineEntrySources(p).map(s => s.id)).toEqual(p.sources);
      for (const key of p.sources) {
        const s = sources.find(e => e.id === key);
        expect(s?.url, key).toMatch(/^https:\/\//); expect(s.text.length, key).toBeGreaterThan(40);
        expect(sources.filter(e => e.id === key), key).toHaveLength(1);
      }
      expect(sources.find(s => s.id === 'dx-worms-' + id).url).toMatch(/marinespecies\.org\/aphia\.php\?p=taxdetails&id=\d+$/);
    }
    expect(sources.find(s => s.id === 'dx-fishbase-blackfin_barracuda').text).toMatch(/Least Concern assessment dated 14 August 2023/);
    expect(sources.find(s => s.id === 'dx-fishbase-titan_triggerfish').text).toMatch(/Least Concern assessment dated 11 January 2022/);
    expect(sources.find(s => s.id === 'dx-fishbase-bluefin_trevally').text).toMatch(/Least Concern assessment dated 9 March 2015/);
    expect(profiles.titan_triggerfish.observe).toMatch(/swim away sideways out of its cone, not straight up/);
    expect(profiles.blackfin_barracuda.behavior).toMatch(/slow-moving schools/);
  });

  it('compares each predator with its lookalike and keeps anonymous practice clues', () => {
    expect(X.marineComparisonPair('blackfin_barracuda')).toEqual(['blackfin_barracuda', 'bluefin_trevally']);
    expect(X.marineComparisonPair('bluefin_trevally')).toEqual(['bluefin_trevally', 'blackfin_barracuda']);
    expect(X.marineComparisonPair('titan_triggerfish')).toEqual(['titan_triggerfish', 'clown_triggerfish']);
    for (const id of IDS) {
      const meta = X.SPECIES_META.find(m => m.id === id), clues = X.marinePracticeClues(text[id], meta);
      expect(clues, id).toHaveLength(4);
      const joined = clues.join(' ').toLowerCase();
      for (const word of [text[id].name.toLowerCase(), meta.scientific.toLowerCase()]) expect(joined).not.toContain(word);
      for (let u = 0; u < 12; u++) { const c = X.idChoices(id, 'p' + u); expect(c).toHaveLength(3); expect(c).toContain(id); expect(c).toContain(meta.lookalikes[0]); }
    }
  });

  it('adds one encounter of each to a healthy reef, before the Acropora entries, and lets them thin out on a damaged reef', () => {
    // New species sit together between feather_duster_worm and the Acropora entries.
    const keys = Object.keys(X.POPULATION), at = keys.indexOf(IDS[0]);
    expect(keys.slice(at, at + 3)).toEqual(IDS);
    expect(at).toBeGreaterThan(keys.indexOf('feather_duster_worm')); expect(at + 3).toBeLessThanOrEqual(keys.indexOf('acropora_clathrata'));
    expect(X.POPULATION).toMatchObject({ blackfin_barracuda: [1, 0.2], titan_triggerfish: [1, 0.5], bluefin_trevally: [1, 0.3] });
    const site = id => X.populationFor(X.EXPLORE_SITES.find(s => s.id === id)), count = (p, id) => p.find(e => e.id === id)?.count || 0;
    for (const id of IDS) for (const s of ['healthy', 'restoration', 'heatwave']) expect(count(site(s), id), id + ' ' + s).toBe(1);
    for (const id of IDS) expect(count(site('damaged'), id), id).toBe(0);
  });
});
