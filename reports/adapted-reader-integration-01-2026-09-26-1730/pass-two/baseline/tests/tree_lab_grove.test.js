import { beforeAll, describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

let E;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_treelab.js', 'treeLab'); E = window.__alloTreeLabEngine; });
const config = (choices = [], mode = 'deck', seed = 'GROVE-01') => ({ version: 1, mode, seed, choices });
const choice = (priority = 'offspring', route = 'mixed') => ({ priority, route });

describe('Grove Journey annual campaign', () => {
  it('restores the same state from a compact decision log and never mutates that log', () => {
    const raw = config([choice(), choice('roots'), choice('reserve'), choice()]);
    const original = JSON.stringify(raw), a = E.groveRestore(raw), b = E.groveRestore(JSON.parse(original));
    expect(a).toEqual(b);
    expect(JSON.stringify(raw)).toBe(original);
    expect(a.year).toBe(4);
  });

  it('keeps weather independent of reproductive choices and random attempt counts', () => {
    for (const mode of ['deck', 'generated']) {
      const a = E.groveRestore(config(Array(8).fill(choice()), mode));
      const b = E.groveRestore(config(Array(8).fill(choice('reserve', 'seed')), mode));
      expect(a.receipts.map(r => r.event)).toEqual(b.receipts.map(r => r.event));
      expect(a.receipts.map(r => r.attempts)).not.toEqual(b.receipts.map(r => r.attempts));
    }
  });

  it('advances existing trees by exactly one year and does not grow newborns in their birth turn', () => {
    const start = E.groveStart(config()), original = JSON.stringify(start);
    const next = E.groveAdvance(start, choice());
    expect(JSON.stringify(start)).toBe(original);
    for (const node of start.trees) {
      const after = next.trees.find(n => n.id === node.id);
      expect(after.tree.age).toBe(node.tree.age + 1);
      expect(after.tree.rings.length).toBe(node.tree.rings.length + 1);
    }
    for (const node of next.trees.filter(n => n.parent)) {
      expect(node.tree.age).toBe(1);
      expect(node.born).toBe(1);
    }
    expect(E.groveSummary(next).established).toBe(0);
  });

  it('debits each reproductive attempt once from that parent’s carbon bank', () => {
    const start = E.groveStart(config()), next = E.groveAdvance(start, choice());
    const alloc = E.GROVE_PRIORITIES.find(p => p.id === 'offspring').alloc;
    let total = 0;
    for (const node of start.trees) {
      const sp = E.speciesById(node.tree.speciesId);
      const unspent = E.simulateYear(node.tree, sp, E.groveEnvironment(start, node.patch, E.groveEvent(start.config, 1)), alloc);
      const maturity = sp.id === 'oak' ? 20 : 10;
      const strategy = E.strategyById(sp.id === 'oak' ? 'seed_animal' : 'root_sucker');
      const debit = unspent.age >= maturity ? Math.min(3, Math.floor(unspent.seedsBanked / strategy.cost)) * strategy.cost : 0;
      expect(next.trees.find(n => n.id === node.id).tree.seedsBanked).toBeCloseTo(unspent.seedsBanked - debit, 10);
      total += debit;
    }
    expect(next.receipts[0].spent).toBeCloseTo(total, 10);
  });

  it('keeps immature trees from reproducing and preserves species-eligible routes', () => {
    const start = E.groveStart(config());
    start.trees.forEach(n => { n.tree = E.newTree(n.tree.speciesId); n.tree.seedsBanked = 100; });
    expect(E.groveAdvance(start, choice()).receipts[0].attempts).toBe(0);
    const mature = E.groveRestore(config(Array(8).fill(choice())));
    for (const node of mature.trees.filter(n => n.parent)) {
      expect(E.speciesById(node.tree.speciesId).modes).toContain(node.route);
      const parent = mature.trees.find(n => n.id === node.parent);
      if (node.route === 'root_sucker') {
        expect(node.cloneGroup).toBe(parent.cloneGroup);
        expect(Math.abs(node.patch % 3 - parent.patch % 3) + Math.abs(Math.floor(node.patch / 3) - Math.floor(parent.patch / 3))).toBeLessThanOrEqual(1);
      } else expect(node.cloneGroup).toBe(node.id);
    }
  });

  it('counts descendants only after survival beyond their arrival year, including when a parent dies', () => {
    const state = E.groveStart(config());
    state.year = 8;
    state.trees.forEach(n => { n.tree.alive = false; });
    state.trees.push({ id: 'a', parent: 'oak-parent', born: 7, patch: 2, tree: E.newTree('oak') }, { id: 'b', parent: 'oak-parent', born: 8, patch: 3, tree: E.newTree('oak') });
    expect(E.groveSummary(state)).toMatchObject({ living: 2, established: 1, descendantPatches: 1, success: false });
    state.trees[4].born = 7;
    expect(E.groveSummary(state)).toMatchObject({ established: 2, success: true });
    state.trees[4].tree.alive = false;
    expect(E.groveSummary(state).success).toBe(false);
  });

  it('stops at eight years or extinction and retains completed evidence', () => {
    const complete = E.groveRestore(config(Array(8).fill(choice())));
    expect(E.groveAdvance(complete, choice())).toBe(complete);
    const extinct = E.groveStart(config());
    extinct.trees.forEach(n => { n.tree.alive = false; });
    expect(E.groveAdvance(extinct, choice())).toBe(extinct);
    expect(E.groveSummary(extinct).ended).toBe(true);
  });

  it('bounds generated conditions and avoids consecutive dry opening hazards', () => {
    const signatures = new Set();
    for (let seed = 0; seed < 40; seed++) {
      let previousDry = false;
      for (let year = 1; year <= 8; year++) {
        const event = E.groveEvent(config([], 'generated', String(seed)), year);
        expect(event.water).toBeGreaterThanOrEqual(0.24);
        expect(event.water).toBeLessThanOrEqual(0.84);
        expect(event.temp).toBeGreaterThanOrEqual(18);
        expect(event.temp).toBeLessThanOrEqual(29);
        expect(event.damage).toBeGreaterThanOrEqual(0);
        expect(event.damage).toBeLessThanOrEqual(0.35);
        expect(previousDry && event.water < 0.42).toBe(false);
        if (year === 1) expect(event.id).toBe('calm');
        previousDry = event.water < 0.42;
        signatures.add(JSON.stringify(event));
      }
    }
    expect(signatures.size).toBeGreaterThan(100);
  });

  it('keeps the population bounded across many worlds and produces different outcomes', () => {
    const totals = new Set();
    for (let seed = 0; seed < 32; seed++) for (const mode of ['deck', 'generated']) {
      const state = E.groveRestore(config(Array(8).fill(choice()), mode, String(seed)));
      const result = E.groveSummary(state);
      totals.add(result.established);
      expect(result.living).toBeLessThanOrEqual(27);
      expect(state.receipts[0].living).toBeGreaterThanOrEqual(3);
      expect(new Set(state.trees.map(n => n.id)).size).toBe(state.trees.length);
      for (let patch = 0; patch < 9; patch++) expect(state.trees.filter(n => n.patch === patch && n.tree.alive).length).toBeLessThanOrEqual(3);
      expect(state.trees.every(n => Number.isFinite(n.tree.reserves) && n.tree.seedsBanked >= 0)).toBe(true);
    }
    expect(totals.size).toBeGreaterThan(2);
  });

  it('creates persistent storm gaps and leaves species definitions unchanged', () => {
    const species = JSON.stringify(E.SPECIES);
    let state = E.groveStart(config([], 'deck', 'storm-test'));
    for (let i = 0; i < 8; i++) state = E.groveAdvance(state, choice('roots'));
    const storm = state.receipts.find(r => r.event.damage);
    expect(storm).toBeDefined();
    expect(state.gaps).toContain(storm.event.patch);
    const site = E.GROVE_PATCHES[storm.event.patch];
    expect(E.groveEnvironment(state, storm.event.patch, storm.event).light).toBeCloseTo(Math.min(1, site.light + 0.18));
    expect(JSON.stringify(E.SPECIES)).toBe(species);
  });

  it('normalises malformed or future-version saves without accepting unbounded histories', () => {
    expect(E.groveConfig(null)).toEqual(config());
    expect(E.groveConfig({ version: 99, mode: 'unknown', seed: ' ', choices: [choice()] })).toEqual(config());
    const raw = E.groveConfig({ version: 1, seed: 'x'.repeat(200), choices: Array(200).fill(null) });
    expect(raw.seed).toHaveLength(32); expect(raw.choices).toHaveLength(8);
    expect(raw.choices.every(c => c.priority === 'reserve')).toBe(true);
    expect(E.groveRestore(raw).year).toBe(8);
  });

  it('does not create a new canopy gap when the storm site has no living trees', () => {
    const raw = config([], 'deck', 'storm-test');
    const event = Array.from({ length: 8 }, (_, i) => E.groveEvent(raw, i + 1)).find(e => e.damage);
    const state = E.groveStart(raw);
    state.year = event.year - 1;
    state.trees = state.trees.filter(n => n.patch !== event.patch);
    const next = E.groveAdvance(state, choice('reserve'));
    expect(next.gaps).not.toContain(event.patch);
    expect(next.receipts.at(-1).damaged).toBe(0);
  });

  it('renders a labelled campaign with resource decisions and explicit scientific boundaries', () => {
    const html = renderTool('treeLab', { treeLab: { view: 'grove', groveRun: config() } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelectorAll('.grove-map button')).toHaveLength(9);
    expect(host.querySelectorAll('input[name="grove-priority"]')).toHaveLength(3);
    expect(host.textContent).toContain('does not change genes');
    expect(host.textContent).toContain('not within-species genetic evolution');
    expect(host.textContent).toContain('cannot become an old-growth forest');
  });
});
