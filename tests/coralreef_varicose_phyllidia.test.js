import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'varicose_phyllidia';
let X, text, profile;
beforeAll(() => {
  const w = { StemLab: { isRegistered: () => false, registerTool() {} }, __RR_TEST_EXPORTS__: {} };
  const source = readFileSync('stem_lab/stem_tool_coralreef.js', 'utf8');
  const anchor = 'SPECIES_META: SPECIES_META, speciesText: speciesText,';
  if (source.split(anchor).length !== 2) throw Error('Observation test export anchor changed');
  vm.runInNewContext(source.replace(anchor, 'MarineObservationDock: MarineObservationDock, ' + anchor), { window: w, Math, Object, JSON, Array, Number, String, Date, URL });
  X = w.__RR_TEST_EXPORTS__.coralReef;
  text = X.speciesText((key, fallback) => fallback)[id];
  profile = X.marineProfiles((key, fallback) => fallback)[id];
});

describe('varicose phyllidia learning integration', () => {
  it('teaches ridges, separate sensory organs and underside gills with traceable facts', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'invertebrate', scientific: 'Phyllidia varicosa', iucn: 'NE', iucnYear: null, lookalikes: ['nudibranch'] });
    expect(text.marks).toHaveLength(4);
    expect(text.marks.join(' ')).toMatch(/Blue-grey ridges.*yellow-tipped/);
    expect(text.marks.join(' ')).toMatch(/Two yellow.*rhinophores/);
    expect(text.marks.join(' ')).toMatch(/gills sit below the mantle edge.*no feathery plume/);
    expect(text.marks.join(' ')).toMatch(/black stripe.*underside of the foot/);
    expect(text.fact).toMatch(/rhinophores sense chemicals/);
    expect(profile.habitat).toMatch(/Indo-West Pacific/);
    expect(profile.diet).toMatch(/Axinyssa cf\. aculeata/);
    expect(profile.observe).toMatch(/Anna’s chromodoris.*underside view/);
    const refs = X.marineProfileSources();
    for (const key of profile.sources) expect(refs.find(r => r.id === key)?.url).toMatch(/^https:\/\//);
    const facts = JSON.parse(readFileSync('docs/coralreef-varicose-phyllidia-2026-10-23.json', 'utf8'));
    expect(facts.specimens[0].iucnDateAssessed).toBeNull();
    expect(facts.specimens[0].claimSupport.variation).toMatch(/stripe sometimes broken/);
    expect(facts.specimens[0].claimSupport.size).toMatch(/not repeated as a species maximum/);
    expect(facts.modelProvenance).toMatchObject({ nominalLengthM: 0.06, depthM: [4, 25], habit: 'bottom', anchor: 'base', zone: null });
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
    expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('provides anonymous underside clues and a saved comparison with the existing nudibranch', () => {
    const pair = [id, 'nudibranch'], bookmarks = { [id]: true }, log = { green_turtle: { firstSeen: 1 } };
    expect(X.marineComparisonPair(id)).toEqual(pair);
    const meta = X.SPECIES_META.filter(m => pair.includes(m.id));
    const clues = X.marinePracticeClues(text, X.SPECIES_META.find(m => m.id === id));
    expect(clues).toHaveLength(4);
    expect(clues.join(' ').toLowerCase()).not.toMatch(/phyllidia|varicosa|varicose/);
    expect(clues.some(clue => /underside of the foot/.test(clue))).toBe(true);
    const before = JSON.stringify({ bookmarks, log });
    for (const seed of [1, 17, 29]) {
      const round = X.buildMarinePracticeRound(meta, seed, pair, []);
      expect(round.map(q => q.id).sort()).toEqual(pair.slice().sort());
      for (const question of round) expect(question.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const ordinary = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(ordinary).toHaveLength(1); expect(ordinary[0].id).toBe(id);
      expect(ordinary[0].choices).toContain('nudibranch');
      expect(new Set(ordinary[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('keeps the isolated specimen out of every reef population with graceful unavailable observation', () => {
    expect(Object.hasOwn(X.POPULATION, id)).toBe(false);
    expect(X.SPECIES_META.findIndex(m => m.id === id)).toBe(X.SPECIES_META.findIndex(m => m.id === 'porcelain_anemone_crab') + 1);
    for (const site of X.EXPLORE_SITES) expect(X.populationFor(site).some(p => p.id === id)).toBe(false);
    const React = { useState: value => [value, () => {}], useRef: value => ({ current: value }), useId: () => ':phyllidia:', useEffect() {} };
    const h = (type, props, ...children) => ({ type, props: props || {}, children });
    const env = { React, h, P: {}, t: (key, fallback) => fallback, fill: (s, v) => s.replace(/\{(\w+)\}/g, (_, key) => v[key]), d: { diveSiteId: 'damaged' }, ctx: { reduceMotion: true } };
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
