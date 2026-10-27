import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = 'broadclub_cuttlefish';
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

describe('broadclub cuttlefish learning integration', () => {
  it('uses the accepted taxonomy and distinguishes visible arms from retracted feeding tentacles', () => {
    expect(X.SPECIES_META.find(m => m.id === id)).toMatchObject({ group: 'invertebrate', scientific: 'Ascarosepion latimanus', iucn: 'DD', iucnYear: 2009, lookalikes: ['day_octopus'] });
    expect(text.marks).toHaveLength(4);
    expect(text.marks.join(' ')).toMatch(/oval mantle.*fin skirt/);
    expect(text.marks.join(' ')).toMatch(/W-shaped pupils.*yellow/);
    expect(text.marks.join(' ')).toMatch(/Eight short arms.*two longer feeding tentacles.*pockets/);
    expect(text.fact).toMatch(/single colour pattern is not a reliable identity check/);
    expect(profile.habitat).toMatch(/Indo-Pacific/);
    expect(profile.behavior).toMatch(/two longer tentacles.*eight arms/);
    expect(profile.observe).toMatch(/day octopus.*underside view/);
    const refs = X.marineProfileSources();
    for (const key of profile.sources) expect(refs.find(r => r.id === key)?.url).toMatch(/^https:\/\//);
    const facts = JSON.parse(readFileSync('docs/coralreef-broadclub-cuttlefish-2026-10-23.json', 'utf8'));
    expect(facts.specimens[0].iucnDateAssessed).toBe('2009-03-15');
    expect(facts.specimens[0].claimSupport.acceptedName).toMatch(/Sepia latimanus is the superseded combination/);
    expect(facts.specimens[0].claimSupport.size).toMatch(/not mantle length.*typical adult size.*maximum/);
    expect(facts.modelProvenance).toMatchObject({ nominalLengthM: 0.30, depthM: [5, 30], habit: 'hover', anchor: 'centre', zone: null });
    const portrait = readFileSync('stem_lab/assets/coralreef/species/' + id + '.webp');
    expect(portrait.length).toBeGreaterThan(1000);
    expect(portrait.equals(readFileSync('desktop/web-app/public/stem_lab/assets/coralreef/species/' + id + '.webp'))).toBe(true);
  });

  it('provides anonymous anatomy clues and an educational comparison without recording a discovery', () => {
    const pair = [id, 'day_octopus'], bookmarks = { [id]: true }, log = { green_turtle: { firstSeen: 1 } };
    expect(X.marineComparisonPair(id)).toEqual(pair);
    const meta = X.SPECIES_META.filter(m => pair.includes(m.id));
    const clues = X.marinePracticeClues(text, X.SPECIES_META.find(m => m.id === id));
    expect(clues).toHaveLength(4);
    expect(clues.join(' ').toLowerCase()).not.toMatch(/broadclub|cuttlefish|ascarosepion|latimanus/);
    expect(clues.some(clue => /feeding tentacles tuck into pockets/.test(clue))).toBe(true);
    const before = JSON.stringify({ bookmarks, log });
    for (const seed of [1, 17, 29]) {
      const round = X.buildMarinePracticeRound(meta, seed, pair, []);
      expect(round.map(q => q.id).sort()).toEqual(pair.slice().sort());
      for (const question of round) expect(question.choices.slice().sort()).toEqual(pair.slice().sort());
      const saved = X.marinePracticeCollectionIds(X.SPECIES_META, 'saved', bookmarks, []);
      const ordinary = X.buildMarinePracticeRound(X.SPECIES_META, seed, saved, []);
      expect(ordinary).toHaveLength(1); expect(ordinary[0].id).toBe(id);
      expect(ordinary[0].choices).toContain('day_octopus');
      expect(new Set(ordinary[0].choices).size).toBe(3);
    }
    expect(JSON.stringify({ bookmarks, log })).toBe(before);
  });

  it('includes the modeled cuttlefish in the healthy population while guarding unavailable locating actions', () => {
    expect(Object.hasOwn(X.POPULATION, id)).toBe(true);
    expect(X.SPECIES_META.findIndex(m => m.id === id)).toBe(X.SPECIES_META.findIndex(m => m.id === 'varicose_phyllidia') + 1);
    expect(X.populationFor(X.EXPLORE_SITES.find(site => site.id === 'healthy')).find(p => p.id === id).count).toBeGreaterThan(0);
    const React = { useState: value => [value, () => {}], useRef: value => ({ current: value }), useId: () => ':broadclub:', useEffect() {} };
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
