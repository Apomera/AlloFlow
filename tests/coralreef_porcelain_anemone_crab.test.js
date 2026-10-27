import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'porcelain_anemone_crab';
let X, text, profile;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  const source = readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8');
  const anchor = 'SPECIES_META: SPECIES_META, speciesText: speciesText,';
  if (source.split(anchor).length !== 2) throw Error('Observation test export anchor changed');
  vm.runInNewContext(source.replace(anchor, 'MarineObservationDock: MarineObservationDock, ' + anchor), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((key, fallback) => fallback)[id]; profile = X.marineProfiles((key, fallback) => fallback)[id];
});

describe('porcelain anemone crab learning integration', () => {
  it('teaches mouthpart fans and walking legs with current taxonomy and anemone habitat', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'invertebrate', scientific: 'Neopetrolisthes maculatus', iucn: 'NE', iucnYear: null, lookalikes: ['cleaner_shrimp'] });
    expect(text.marks).toHaveLength(4);
    expect(text.marks.join(' ')).toMatch(/red or purplish spots/);
    expect(text.marks.join(' ')).toMatch(/large flattened claws/);
    expect(text.marks.join(' ')).toMatch(/Three pairs of walking legs.*antennae/);
    expect(text.marks.join(' ')).toMatch(/feeding fans.*mouth/);
    expect(text.fact).toMatch(/fans are bristly mouthparts/);
    expect(profile.habitat).toMatch(/large sea anemones/);
    expect(profile.behavior).toMatch(/Spot size and colour vary/);
    expect(profile.diet).toMatch(/planktonic algae.*small crustaceans/);
    expect(profile.observe).toMatch(/compact, spotted.*slender striped/);
    const sources = X.marineProfileSources();
    for (const key of profile.sources) expect(sources.find(s => s.id === key)?.url).toMatch(/^https:\/\//);
    const facts = JSON.parse(readFileSync('docs/coralreef-porcelain-anemone-crab-2026-10-23.json', 'utf8'));
    expect(facts.specimens[0].claimSupport.acceptedName).toMatch(/ohshimai.*junior subjective synonym/);
    expect(facts.specimens[0].iucnDateAssessed).toBeNull();
    expect(facts.modelProvenance).toMatchObject({ nominalLengthM: 0.04, depthM: [1, 10], habit: 'bottom', anchor: 'base', zone: null });
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
    expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('supports anonymous saved practice and a shape comparison without altering discoveries', () => {
    const pair = [id, 'cleaner_shrimp'], bookmarks = { [id]: true }, log = { green_turtle: { firstSeen: 1 } };
    expect(X.marineComparisonPair(id)).toEqual(pair);
    const meta = X.SPECIES_META.filter(m => pair.includes(m.id));
    const clues = X.marinePracticeClues(text, X.SPECIES_META.find(m => m.id === id));
    expect(clues).toHaveLength(4);
    expect(clues.join(' ').toLowerCase()).not.toMatch(/neopetrolisthes|porcelain|anemone crab/);
    const before = JSON.stringify({ bookmarks, log });
    for (const seed of [1, 17, 29]) {
      const round = X.buildMarinePracticeRound(meta, seed, pair, []);
      expect(round.map(q => q.id).sort()).toEqual(pair.slice().sort());
      for (const question of round) expect(question.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const ordinary = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(ordinary).toHaveLength(1); expect(ordinary[0].id).toBe(id);
      expect(ordinary[0].choices).toContain('cleaner_shrimp');
      expect(new Set(ordinary[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('includes the host-dependent crab in the healthy population while guarding unavailable locating actions', () => {
    expect(Object.hasOwn(X.POPULATION, id)).toBe(true);
    expect(X.SPECIES_META.findIndex(m => m.id === id)).toBe(X.SPECIES_META.findIndex(m => m.id === 'chocolate_chip_sea_star') + 1);
    expect(X.populationFor(X.EXPLORE_SITES.find(site => site.id === 'healthy')).find(p => p.id === id).count).toBeGreaterThan(0);
    const React = { useState: value => [value, () => {}], useRef: value => ({ current: value }), useId: () => ':crab:', useEffect() {} };
    const h = (type, props, ...children) => ({ type, props: props || {}, children });
    const env = { React, h, P: {}, t: (key, fallback) => fallback, fill: (s, v) => s.replace(/\{(\w+)\}/g, (_, key) => v[key]), d: { diveSiteId: 'healthy' }, ctx: { reduceMotion: true } };
    const rendered = X.MarineObservationDock({ env, id, status: 'ready', ctl: { findSpecies: () => null }, onClose() {}, onReturn() {} });
    const nodes = [];
    function visit(value) { if (!value || typeof value !== 'object') return; if (Array.isArray(value)) { value.forEach(visit); return; } nodes.push(value); visit(value.children); }
    visit(rendered);
    expect(nodes.find(n => n.props?.['data-observation-status'])?.children.join('')).toContain('not available in the current reef');
    for (const key of ['data-observation-locate', 'data-observation-swim', 'data-observation-healthy']) expect(nodes.some(n => n.props?.[key])).toBe(false);
    expect(nodes.some(n => n.props?.['data-observation-return'])).toBe(true);
    expect(nodes.some(n => n.props?.['data-observation-close'])).toBe(true);
  });
});
