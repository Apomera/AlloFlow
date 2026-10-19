import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// The dive reef's species: every animal the explore engine is asked to place
// has a guide entry students can identify it from, identification choices are
// fair, and the dive sites differ the way their descriptions say.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X, TX;
beforeAll(() => {
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync(TOOL, 'utf8'), { window: win, Math, Object, JSON, Array, Number, String, Date, URL });
  X = win.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((k, f) => f);
});

describe('species data', () => {
  it('covers every organism a dive can place, with text students can identify it from', () => {
    const ids = X.SPECIES_META.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of Object.keys(X.POPULATION)) expect(ids.includes(id), 'no guide entry for ' + id).toBe(true);
    for (const m of X.SPECIES_META) {
      const t = TX[m.id];
      expect(t, m.id).toBeTruthy();
      expect(t.name.length, m.id + ' name').toBeGreaterThan(2);
      expect(t.marks.length, m.id + ' field marks').toBeGreaterThanOrEqual(2);
      expect(t.role.length, m.id + ' role').toBeGreaterThan(10);
      expect(t.fact.length, m.id + ' fact').toBeGreaterThan(20);
      expect(['fish', 'reptile', 'invertebrate', 'coral', 'structure'].includes(m.group), m.id).toBe(true);
      if (m.group !== 'structure') expect(['LC', 'NT', 'VU', 'EN', 'CR', 'DD', 'NE'].includes(m.iucn), m.id + ' iucn').toBe(true);
      for (const l of m.lookalikes) expect(ids.includes(l), m.id + ' lookalike ' + l).toBe(true);
      for (const s of [t.name, t.role, t.fact].concat(t.marks)) expect(/[–—]/.test(s), m.id + ' dash').toBe(false);
    }
  });

  it('uses the corrected Coral Triangle species and current Red List statuses', () => {
    const meta = Object.fromEntries(X.SPECIES_META.map((m) => [m.id, m]));
    expect(meta.clownfish.scientific).toBe('Amphiprion ocellaris');
    expect(meta.parrotfish.scientific).toBe('Chlorurus bleekeri');
    expect(meta.green_turtle.iucn).toBe('LC');
    expect(meta.humphead_wrasse.iucn).toBe('EN');
    expect(meta.table_coral.iucn).toBe('EN');
    expect(meta.cauliflower_coral.scientific).toBe('Pocillopora verrucosa');
    expect(meta.foliose_coral.scientific).toBe('Montipora foliosa');
    expect(meta.cauliflower_coral.iucn).toBe('EN');
    expect(meta.foliose_coral.iucn).toBe('EN');
  });
});

describe('identification choices', () => {
  it('offers three different choices that include the right answer', () => {
    for (const m of X.SPECIES_META) {
      const c = X.idChoices(m.id, 'uid-1');
      expect(c.includes(m.id), m.id).toBe(true);
      expect(new Set(c).size, m.id).toBe(c.length);
      expect(c.length, m.id).toBe(3);
      expect(X.idChoices(m.id, 'uid-1'), 'stable for one organism').toEqual(c);
    }
  });

  it('puts the right answer in each position about equally often', () => {
    const pos = [0, 0, 0];
    let n = 0;
    for (const m of X.SPECIES_META) for (let u = 0; u < 60; u++) { pos[X.idChoices(m.id, 'f' + u).indexOf(m.id)] += 1; n += 1; }
    for (const p of pos) { expect(p / n).toBeGreaterThan(0.27); expect(p / n).toBeLessThan(0.4); }
  });

  it('uses look-alikes as the wrong answers when the fact sheet lists them', () => {
    const turtle = X.SPECIES_META.find((m) => m.id === 'hawksbill_turtle');
    if (turtle.lookalikes.includes('green_turtle')) {
      for (let u = 0; u < 20; u++) expect(X.idChoices('hawksbill_turtle', 'u' + u).includes('green_turtle')).toBe(true);
    }
  });
});

describe('dive sites', () => {
  const total = (pop) => pop.reduce((a, p) => a + p.count, 0);
  const count = (pop, id) => (pop.find((p) => p.id === id) || { count: 0 }).count;
  it('places animals on every site, fewer on a damaged reef, and more starfish and urchins there', () => {
    const by = Object.fromEntries(X.EXPLORE_SITES.map((s) => [s.id, X.populationFor(s)]));
    for (const id of Object.keys(by)) expect(total(by[id]), id).toBeGreaterThan(20);
    expect(total(by.damaged)).toBeLessThan(total(by.healthy));
    expect(count(by.damaged, 'threadfin_butterflyfish')).toBeLessThan(count(by.healthy, 'threadfin_butterflyfish'));
    expect(count(by.damaged, 'crown_of_thorns')).toBeGreaterThan(count(by.healthy, 'crown_of_thorns'));
    const restoration = X.EXPLORE_SITES.find((s) => s.id === 'restoration');
    expect(restoration.restoration.kind).toBe('reef_star');
  });

  it('turns a model year into a dive site that reflects its coral', () => {
    const settings = X.scenarioSettings('recent');
    const rows = X.runScenario(settings, 4);
    const site = X.exploreSiteFromModel(rows[10], settings);
    expect(site.health.coralCover).toBeCloseTo(rows[10].coral, 9);
    expect(total(X.populationFor(site))).toBeGreaterThan(0);
  });
});

describe('hopeful content is sourced and honest', () => {
  it('names the evidence limits next to the good news', () => {
    const cards = X.helpCards((k, f) => f);
    const text = cards.map((c) => c.body.join(' ')).join(' ');
    expect(text.includes('17%') && text.includes('56%'), 'Reef Star result').toBe(true);
    expect(text.includes('not found that they help young corals'), 'Reef Ball caveat').toBe(true);
    expect(cards.some((c) => c.id === 'biorock'), 'Biorock caveat').toBe(true);
    expect(X.hopeFacts((k, f) => f).length).toBeGreaterThanOrEqual(4);
  });
});
