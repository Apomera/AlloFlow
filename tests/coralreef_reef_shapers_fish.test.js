import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Two Indo-Pacific reef fish that shape their reef: a blacktip reef shark (a reef
// predator) and a dusky farmerfish (a damselfish that farms turf algae). Facts and
// sources: lane_fish2/NOTES.md (WoRMS, Fishes of Australia, FishBase quoting the IUCN
// Red List, Sharks of the World, Florida Museum, George et al. 2019, Hata and Kato 2002,
// 2003, 2006, Hata et al. 2010, Gochfeld 2010).
const IDS = ['blacktip_reef_shark', 'dusky_farmerfish'];
const META = {
  blacktip_reef_shark: { group: 'fish', scientific: 'Carcharhinus melanopterus', iucn: 'VU', iucnYear: 2020, lookalikes: ['whitetip_reef_shark'] },
  dusky_farmerfish: { group: 'fish', scientific: 'Stegastes nigricans', iucn: 'LC', iucnYear: 2021, lookalikes: ['blue_green_chromis'] }
};
let X, text, profiles, sources;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8'), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((key, fallback) => fallback); profiles = X.marineProfiles((key, fallback) => fallback); sources = X.marineProfileSources();
});

describe('reef shapers learning integration', () => {
  it('registers each with its accepted name, dated Red List status and lookalike, among the fish', () => {
    const ids = X.SPECIES_META.map(m => m.id), at = ids.indexOf(IDS[0]);
    // Together, after the bluefin trevally (the newest fish before them).
    expect(ids.slice(at, at + 2)).toEqual(IDS);
    expect(at).toBeGreaterThan(ids.indexOf('bluefin_trevally'));
    for (const id of IDS) {
      expect(X.SPECIES_META.filter(m => m.id === id)).toHaveLength(1);
      expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject(META[id]);
      for (const look of META[id].lookalikes) expect(ids, look).toContain(look);
    }
  });

  it('teaches the field marks each source names, in plain words without dashes', () => {
    const marks = id => text[id].marks.join(' ');
    for (const id of IDS) {
      expect(text[id].marks, id).toHaveLength(4);
      for (const s of [text[id].name, text[id].role, text[id].fact, ...text[id].marks]) { expect(/[‐-―]/.test(s), id + ': ' + s).toBe(false); expect(s.length).toBeGreaterThan(10); }
    }
    expect(text.blacktip_reef_shark.name).toBe('Blacktip reef shark');
    expect(marks('blacktip_reef_shark')).toMatch(/black tip on the first back fin, with a pale band just below/);
    expect(marks('blacktip_reef_shark')).toMatch(/lower lobe of the tail fin/);
    expect(marks('blacktip_reef_shark')).toMatch(/short, rounded snout/);
    expect(text.blacktip_reef_shark.fact).toMatch(/less than 1 m deep.*tides/);
    expect(text.dusky_farmerfish.name).toMatch(/^Dusky farmerfish/);
    expect(marks('dusky_farmerfish')).toMatch(/darker on top of the head and the nape/);
    expect(marks('dusky_farmerfish')).toMatch(/darker patch on the body under the rear of the back fin/);
    expect(marks('dusky_farmerfish')).toMatch(/broad white bar/);
    expect(text.dusky_farmerfish.role).toMatch(/weeds out algae it cannot digest and chases away/);
    expect(text.dusky_farmerfish.fact).toMatch(/grew only inside these farms.*within about two weeks/);
    // Breathing claims are left out: blacktips have been seen resting on sand, so the
    // contrast with the whitetip is what each is usually seen doing.
    expect(JSON.stringify([text.blacktip_reef_shark, profiles.blacktip_reef_shark]).toLowerCase()).not.toMatch(/breath|ram ventilat/);
  });

  it('gives every profile field substance and resolves each bibliography entry', () => {
    for (const id of IDS) {
      const p = profiles[id];
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) { expect(p[field].length, id + ' ' + field).toBeGreaterThan(25); expect(/[‐-―]/.test(p[field]), id + ' ' + field).toBe(false); }
      expect(p.sources.length, id).toBeGreaterThanOrEqual(5);
      expect(X.marineEntrySources(p).map(s => s.id)).toEqual(p.sources);
      for (const key of p.sources) {
        const s = sources.find(e => e.id === key);
        expect(s?.url, key).toMatch(/^https:\/\//); expect(s.text.length, key).toBeGreaterThan(40);
        expect(sources.filter(e => e.id === key), key).toHaveLength(1);
      }
      expect(sources.find(s => s.id === 'dx-worms-' + id).url).toMatch(/marinespecies\.org\/aphia\.php\?p=taxdetails&id=\d+$/);
    }
    expect(sources.find(s => s.id === 'dx-worms-blacktip_reef_shark').url).toMatch(/id=105795$/);
    expect(sources.find(s => s.id === 'dx-worms-dusky_farmerfish').url).toMatch(/id=218849$/);
    expect(sources.find(s => s.id === 'dx-fishbase-blacktip_reef_shark').text).toMatch(/Vulnerable \(A2bcd\) assessment dated 15 July 2020/);
    expect(sources.find(s => s.id === 'dx-fishbase-dusky_farmerfish').text).toMatch(/Least Concern assessment dated 4 October 2021/);
    expect(profiles.blacktip_reef_shark.observe).toMatch(/whitetip reef shark: white fin tips/);
    expect(profiles.blacktip_reef_shark.sources).toContain('dx-foa-whitetip_reef_shark');
    expect(profiles.dusky_farmerfish.behavior).toMatch(/corals growing inside the territory are protected/);
    expect(profiles.dusky_farmerfish.observe).toMatch(/blue-green chromis/);
  });

  it('compares each with its lookalike and keeps anonymous practice clues', () => {
    expect(X.marineComparisonPair('blacktip_reef_shark')).toEqual(['blacktip_reef_shark', 'whitetip_reef_shark']);
    expect(X.marineComparisonPair('dusky_farmerfish')).toEqual(['dusky_farmerfish', 'blue_green_chromis']);
    for (const id of IDS) {
      const meta = X.SPECIES_META.find(m => m.id === id), clues = X.marinePracticeClues(text[id], meta);
      expect(clues, id).toHaveLength(4);
      const joined = clues.join(' ').toLowerCase();
      for (const word of [text[id].name.toLowerCase(), meta.scientific.toLowerCase(), 'blacktip', 'farmerfish']) expect(joined).not.toContain(word);
      for (let u = 0; u < 12; u++) { const c = X.idChoices(id, 'p' + u); expect(c).toHaveLength(3); expect(c).toContain(id); expect(c).toContain(meta.lookalikes[0]); }
    }
  });

  it('adds them to a healthy reef after the feather duster worm and before the Acropora entries', () => {
    // New species sit together between feather_duster_worm and the Acropora entries.
    const keys = Object.keys(X.POPULATION), at = keys.indexOf(IDS[0]);
    expect(keys.slice(at, at + 2)).toEqual(IDS);
    expect(at).toBeGreaterThan(keys.indexOf('feather_duster_worm')); expect(at + 2).toBeLessThanOrEqual(keys.indexOf('acropora_clathrata'));
    expect(X.POPULATION).toMatchObject({ blacktip_reef_shark: [1, 0.3], dusky_farmerfish: [2, 0.3] });
    const site = id => X.populationFor(X.EXPLORE_SITES.find(s => s.id === id)), count = (p, id) => p.find(e => e.id === id)?.count || 0;
    for (const s of ['healthy', 'restoration', 'heatwave']) expect(count(site(s), 'blacktip_reef_shark'), s).toBe(1);
    expect(count(site('damaged'), 'blacktip_reef_shark')).toBe(0);
    expect(count(site('healthy'), 'dusky_farmerfish')).toBe(2);
    // Farms sit on dead coral and rock, so a farmer stays even on the damaged reef.
    expect(count(site('damaged'), 'dusky_farmerfish')).toBe(1);
  });
});
