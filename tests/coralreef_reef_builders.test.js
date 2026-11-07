import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Four Indo-Pacific reef builders that teach that not every reef builder is a
// stony coral: fire coral (a hydrozoan), blue coral and organ pipe coral
// (octocorals) and birdsnest coral (a stony coral). Guide data, sourced
// profiles, Reef Check survey wording, population and the field study.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const IDS = ['fire_coral', 'blue_coral', 'pipe_organ_coral', 'birdsnest_coral'];
const NOT_STONY = ['fire_coral', 'blue_coral', 'pipe_organ_coral'];
const f = (k, v) => v;
let X, TX, P;
const mounted = [];
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000);
  loadTool(SOURCE, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; TX = X.speciesText(f); P = X.marineProfiles(f);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } vi.restoreAllMocks(); });
const meta = (id) => X.SPECIES_META.find((m) => m.id === id);
const words = (id) => [TX[id].name, TX[id].role, TX[id].fact].concat(TX[id].marks).join(' ');

describe('reef builder guide entries', () => {
  it('lists the four builders right after Acropora millepora with Red List statuses and fair look-alikes', () => {
    const ids = X.SPECIES_META.map((m) => m.id), at = ids.indexOf('acropora_millepora');
    expect(ids.slice(at + 1, at + 5)).toEqual(IDS);
    expect(IDS.map((id) => [meta(id).scientific, meta(id).iucn, meta(id).iucnYear])).toEqual([
      ['Millepora platyphylla', 'EN', 2022], ['Heliopora coerulea', 'LC', 2023], ['Tubipora musica', 'LC', 2023], ['Seriatopora hystrix', 'VU', 2023]]);
    for (const id of IDS) {
      expect(meta(id).group, id).toBe('coral');
      expect(meta(id).lookalikes.length, id).toBeGreaterThan(0);
      for (const other of meta(id).lookalikes) { expect(ids, id).toContain(other); expect(other).not.toBe(id); }
      const choices = X.idChoices(id, 'reef-builder');
      expect(choices, id).toContain(id); expect(new Set(choices).size).toBe(3);
    }
  });

  it('gives four field marks and honest classification text without special dashes', () => {
    for (const id of IDS) {
      const t = TX[id];
      expect(t.marks, id).toHaveLength(4);
      for (const mark of t.marks) expect(mark.length, id).toBeGreaterThan(20);
      expect(/[\u2010-\u2015]/.test(words(id) + P[id].habitat + P[id].diet + P[id].behavior + P[id].observe), id + ' dash').toBe(false);
      expect(X.marinePracticeClues(t, meta(id)), id).toHaveLength(4);
    }
    expect(TX.fire_coral.role).toMatch(/hydrozoan, related to jellyfish, not a true stony coral/);
    expect(TX.fire_coral.marks.join(' ')).toMatch(/stings.*never touch/);
    expect(TX.blue_coral.role).toMatch(/octocoral.*only octocoral known to build a massive skeleton/);
    expect(TX.blue_coral.marks.join(' ')).toMatch(/broken off, the skeleton inside is bright blue/);
    expect(TX.blue_coral.fact).toMatch(/pale blue instead of white/);
    expect(TX.pipe_organ_coral.role).toMatch(/octocoral.*not a stony coral/);
    expect(TX.pipe_organ_coral.marks.join(' ')).toMatch(/deep red.*eight tentacles/);
    expect(TX.birdsnest_coral.role).toMatch(/A stony coral/);
    expect(TX.birdsnest_coral.marks.join(' ')).toMatch(/needle-like points/);
  });

  it('explains each body plan in the animal-group note', () => {
    const notes = X.marineAnimalGroupNotes(f);
    expect(notes.fire_coral.label).toMatch(/hydrozoan, not a stony coral/);
    expect(notes.blue_coral.label).toBe(notes.pipe_organ_coral.label);
    expect(notes.blue_coral.label).toMatch(/octocoral that builds reef/);
    expect(notes.birdsnest_coral.label).toMatch(/stony coral/);
    for (const id of IDS) {
      expect(notes[id].text.trim().split(/\s+/).length, id).toBeLessThanOrEqual(55);
      expect(new URL(notes[id].source.url).protocol).toBe('https:');
    }
  });
});

describe('reef builder profiles and sources', () => {
  it('cites every profile source, including the IUCN assessment behind its status', () => {
    const all = X.marineProfileSources(), ids = all.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of IDS) {
      const p = P[id], cited = X.marineEntrySources(p);
      for (const k of ['habitat', 'diet', 'behavior', 'observe']) expect(p[k].length, id + ' ' + k).toBeGreaterThan(40);
      expect(cited.map((s) => s.id), id).toEqual(p.sources);
      for (const s of cited) { expect(new URL(s.url).protocol, s.id).toBe('https:'); expect(s.text.length, s.id).toBeGreaterThan(40); }
      const iucn = cited.find((s) => /iucnredlist\.org/.test(s.url));
      expect(iucn, id + ' IUCN source').toBeTruthy();
      expect(iucn.text).toContain(meta(id).scientific);
      expect(iucn.text).toContain({ EN: 'Endangered', LC: 'Least Concern', VU: 'Vulnerable' }[meta(id).iucn] + ' (assessed ' + meta(id).iucnYear + ')');
      expect(cited.some((s) => /marinespecies\.org/.test(s.url)), id + ' WoRMS').toBe(true);
    }
  });

  it('tells surveyors that Reef Check records all four as hard coral (HC)', () => {
    const rc = X.marineProfileSources().find((s) => s.id === 'dx-reefcheck-hc-builders');
    expect(rc.text).toMatch(/fire coral \(Millepora\).*blue coral \(Heliopora\) and organ pipe coral \(Tubipora\), because these are reef builders/);
    for (const id of IDS) expect(P[id].observe, id).toContain('hard coral (HC)');
    for (const id of NOT_STONY) { expect(P[id].observe, id).toMatch(/Reef Check counts .* as hard coral \(HC\).*because it builds reef/); expect(P[id].sources, id).toContain('dx-reefcheck-hc-builders'); }
    expect(P.fire_coral.observe).toMatch(/it stings/);
    expect(P.blue_coral.observe).toMatch(/pale blue, not white/);
    expect(P.pipe_organ_coral.observe).toMatch(/ten times wider than real ones/);
  });

  it('keeps the bleaching evidence with its numbers and sources', () => {
    const src = Object.fromEntries(X.marineProfileSources().map((s) => [s.id, s]));
    expect(TX.fire_coral.fact).toContain('85%'); expect(src['dx-bleaching-taxa-2000'].text).toMatch(/Millepora\) were the most susceptible taxa, with 85% mortality/);
    expect(P.blue_coral.behavior).toMatch(/65%.*30%/); expect(src['dx-bleaching-blue_coral-2026'].text).toMatch(/65%.*30%.*bluish rather than white/);
    expect(TX.pipe_organ_coral.fact).toMatch(/136 colonies found 15 separate lineages/); expect(src['dx-tubipora-lineages-2026'].text).toMatch(/136 colonies, 15 lineages/);
    expect(P.pipe_organ_coral.sources).toContain('dx-octocoral-heat-2013');
    expect(P.birdsnest_coral.sources).toContain('dx-bleaching-taxa-2000');
  });

  it('states health notes that match each skeleton', () => {
    const text = readFileSync(SOURCE, 'utf8');
    expect(text).toContain("id === 'blue_coral') return __alloT('stem.coralreef.ex_health_blue_coral_bleached', 'This blue coral has bleached. It looks pale blue, not white");
    expect(text).toContain("id === 'pipe_organ_coral') return __alloT('stem.coralreef.ex_health_pipe_organ_bleached'");
    expect(text).toContain("id === 'blue_coral') return __alloT('stem.coralreef.ex_health_blue_coral_dead'");
    expect(text).toContain("id === 'pipe_organ_coral') return __alloT('stem.coralreef.ex_health_pipe_organ_dead'");
  });
});

describe('reef builders on the dive', () => {
  const count = (pop, id) => (pop.find((p) => p.id === id) || { count: 0 }).count;
  it('places one colony of each on the healthy reef, scaled with live coral like other corals', () => {
    const site = (id) => X.EXPLORE_SITES.find((s) => s.id === id);
    const healthy = X.populationFor(site('healthy')), damaged = X.populationFor(site('damaged'));
    for (const id of IDS) {
      expect(X.POPULATION[id], id).toEqual([1, 1]);
      expect(count(healthy, id), id).toBe(1);
      expect(count(damaged, id), id).toBe(0);
    }
    // New species sit together between feather_duster_worm and the Acropora entries.
    const keys = Object.keys(X.POPULATION), at = keys.indexOf(IDS[0]);
    expect(keys.slice(at, at + 4)).toEqual(IDS);
    expect(at).toBeGreaterThan(keys.indexOf('feather_duster_worm')); expect(at + 4).toBeLessThanOrEqual(keys.indexOf('acropora_clathrata'));
    const bare = { ...site('healthy'), health: { coralCover: 0, bleaching: 0.9, algae: 0.2 } };
    for (const id of IDS) expect(count(X.populationFor(bare), id), id).toBe(0);
  });
});

describe('reef builders field study', () => {
  const q = (t, s) => t.host.querySelector(s);
  async function click(el) { expect(el).toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
  async function select(el, value) { await React.act(async () => { el.focus(); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
  it('compares the three builders that are not stony corals', async () => {
    const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
    function Shell() { const [data, setData] = React.useState({ coralReef: { section: 'guide' } }); return window.StemLab._registry.coralReef.render({ React, toolData: data, setToolData: setData, t: f, reduceMotion: true }); }
    const t = { host, root }; mounted.push(t);
    await React.act(async () => root.render(React.createElement(Shell)));
    await click(q(t, '[data-start-practice]')); await select(q(t, '[data-practice-collection-select]'), 'study_reef_builders');
    expect(q(t, '[data-practice-field-study]').dataset.practiceFieldStudy).toBe('study_reef_builders');
    expect([...t.host.querySelectorAll('[data-practice-study-organism]')].map((el) => el.dataset.practiceStudyOrganism)).toEqual(NOT_STONY);
    expect(q(t, '[data-practice-count]').textContent).toContain('none is a stony coral');
  });
});
