import { beforeAll, describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

let E;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_treelab.js', 'treeLab'); E = window.__alloTreeLabEngine; });
const config = (choices = [], mode = 'deck', seed = 'GROVE-01') => ({ version: 1, mode, seed, choices });
const choice = (priority = 'offspring', route = 'mixed') => ({ priority, route });
const mount = (data) => { const host = document.createElement('div'); host.innerHTML = renderTool('treeLab', { treeLab: Object.assign({ view: 'grove' }, data) }); return host; };

// Search a bounded set of worlds for one that records a loss; the campaign must be able
// to lose trees or the losses UI is dead weight.
function firstRunWithLoss() {
  for (const mode of ['deck', 'generated']) for (let s = 0; s < 40; s++) {
    const raw = config(Array(8).fill(choice('offspring', 'seed')), mode, 'L' + s);
    const state = E.groveRestore(raw);
    const year = state.receipts.findIndex(r => r.deaths > 0) + 1;
    if (year) return { raw, state, year };
  }
  return null;
}

describe('Grove Journey evidence, prediction and ledger', () => {
  it('records every landing and loss so the receipt can say where things happened', () => {
    for (const mode of ['deck', 'generated']) for (let s = 0; s < 12; s++) {
      let state = E.groveStart(config([], mode, 'E' + s));
      for (let y = 1; y <= 8; y++) {
        const before = state, next = E.groveAdvance(before, choice('offspring', y % 2 ? 'mixed' : 'seed'));
        const r = next.receipts.at(-1);
        expect(r.landings).toHaveLength(r.attempts);
        expect(r.landings.filter(l => l.outcome === 'arrived')).toHaveLength(r.arrivals);
        expect(r.losses).toHaveLength(r.deaths);
        for (const l of r.landings) {
          expect(l.patch).toBeGreaterThanOrEqual(0); expect(l.patch).toBeLessThanOrEqual(8);
          expect(['arrived', 'crowded', 'failed']).toContain(l.outcome);
          if (l.outcome === 'arrived') expect(l.limit).toBe('none');
          if (l.outcome === 'crowded') expect(l.limit).toBe('space');
          if (l.outcome === 'failed') {
            const env = E.groveEnvironment(next, l.patch, r.event);
            const wet = Math.min(1, env.soilWater / 0.55), lit = Math.max(0.25, Math.min(1, env.light / 0.70));
            expect(l.limit).toBe(wet < 1 && wet <= lit ? 'moisture' : lit < 1 ? 'light' : 'chance');
          }
        }
        for (const loss of r.losses) {
          expect(before.trees.find(n => n.id === loss.id).tree.alive).toBe(true);
          expect(next.trees.find(n => n.id === loss.id).tree.alive).toBe(false);
          expect(typeof loss.cause).toBe('string');
        }
        state = next;
      }
    }
  });

  it('lets young trees die in dry patches, never adults by that rule, and keeps weather independent of it', () => {
    const found = firstRunWithLoss();
    expect(found).not.toBeNull();
    const all = [];
    for (const mode of ['deck', 'generated']) for (let s = 0; s < 40; s++) {
      const state = E.groveRestore(config(Array(8).fill(choice('offspring', 'seed')), mode, 'L' + s));
      state.receipts.forEach(r => r.losses.forEach(l => all.push({ r, l })));
    }
    expect(all.length).toBeGreaterThan(0);
    for (const { r, l } of all) if (l.cause === 'dry_seedling') {
      expect(l.age).toBeLessThanOrEqual(3);
      expect(E.groveEnvironment({ gaps: [], trees: [] }, l.patch, r.event).soilWater).toBeLessThan(0.35);
    }
    // Founders are 41+, 26+ and 5+ years old during the run: the seedling rule cannot touch them.
    expect(all.some(({ l }) => l.cause === 'dry_seedling' && ['oak-parent', 'aspen-parent', 'aspen-young'].includes(l.id))).toBe(false);
    const a = E.groveRestore(config(Array(8).fill(choice('offspring', 'seed')), found.raw.mode, found.raw.seed));
    const b = E.groveRestore(config(Array(8).fill(choice('reserve')), found.raw.mode, found.raw.seed));
    expect(a.receipts.map(r => r.event)).toEqual(b.receipts.map(r => r.event));
  });

  it('shows where arrivals, failures and losses happened, with snags and badges on the map', () => {
    const found = firstRunWithLoss();
    const host = mount({ groveRun: config(found.raw.choices.slice(0, found.year), found.raw.mode, found.raw.seed) });
    const where = host.querySelector('.grove-where');
    expect(where).not.toBeNull();
    expect(where.textContent).toMatch(/died/);
    expect(where.textContent).toMatch(/took root|failed/);
    expect(host.querySelector('.grove-patch-badge.is-loss')).not.toBeNull();
    expect([...host.querySelectorAll('.grove-patch-count')].some(el => /snag/.test(el.textContent))).toBe(true);
    expect([...host.querySelectorAll('.grove-map button')].some(b => /lost this year/.test(b.getAttribute('aria-label')))).toBe(true);
    expect(host.querySelector('.grove-caption').textContent).toContain('snag');
  });

  it('checks an optional prediction against the completed year and drops it on rewind', () => {
    const run = config([choice()]);
    const last = E.groveRestore(run).receipts[0];
    const bucket = last.arrivals === 0 ? 'none' : last.arrivals <= 2 ? 'some' : 'many';
    const wrong = bucket === 'none' ? 'many' : 'none';
    const host = mount({ groveRun: run, grovePredictions: [{ year: 1, arrivals: wrong, food: last.net < 0 ? 'shortfall' : 'surplus' }] });
    const check = host.querySelector('[data-grove-prediction]');
    expect(check.textContent).toContain('Missed: you predicted');
    expect(check.textContent).toContain('Matched: you predicted a');
    expect(host.querySelector('#grove-predict-arrivals')).not.toBeNull();
    expect(host.querySelector('#grove-predict-food')).not.toBeNull();
    const silent = mount({ groveRun: run });
    expect(silent.querySelector('[data-grove-prediction]')).toBeNull();
    const stale = mount({ groveRun: config([]), grovePredictions: [{ year: 1, arrivals: 'none', food: '' }] });
    expect(stale.querySelector('[data-grove-prediction]')).toBeNull();
  });

  it('compares completed runs of the same grove code and ignores other codes', () => {
    const run = config(Array(8).fill(choice()));
    const other = { key: 'GROVE-01|deck|other', seed: 'GROVE-01', mode: 'deck', priorities: Array(8).fill('reserve'), years: 8, living: 3, established: 0, patches: 0, success: false };
    const elsewhere = Object.assign({}, other, { key: 'X|deck|x', seed: 'X' });
    const ended = mount({ groveRun: run, groveLedger: [other, elsewhere] });
    const list = ended.querySelector('.grove-ledger');
    expect(list.querySelectorAll('li')).toHaveLength(1);
    expect(list.textContent).toContain('0 established in 0 patches');
    expect(list.textContent).toContain('Priorities: Keep reserves');
    expect(ended.textContent).toContain('same weather every year');
    const alone = mount({ groveRun: run });
    expect(alone.querySelector('.grove-ledger')).toBeNull();
    expect(alone.textContent).toContain('the comparison is fair');
    const setup = mount({ groveSeed: 'GROVE-01', groveMode: 'deck', groveLedger: [other, elsewhere] });
    expect(setup.textContent).toContain('1 completed run on this code is remembered');
  });
});

describe('Grove Journey stored food, grouped evidence, discoveries and journey chart', () => {
  it('records whole-grove stored food and reproductive savings on every receipt', () => {
    const state = E.groveRestore(config(Array(8).fill(choice('reserve'))));
    for (const r of state.receipts) {
      expect(Number.isFinite(r.reserves)).toBe(true); expect(r.reserves).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.banked)).toBe(true); expect(r.banked).toBeGreaterThanOrEqual(0);
    }
    const last = state.receipts.at(-1);
    const living = state.trees.filter(n => n.tree.alive);
    expect(last.reserves).toBeCloseTo(living.reduce((s, n) => s + Math.max(0, n.tree.reserves), 0), 1);
    expect(last.banked).toBeCloseTo(living.reduce((s, n) => s + Math.max(0, n.tree.seedsBanked), 0), 1);
    const host = mount({ groveRun: config([choice('reserve'), choice('reserve')]) });
    expect(host.querySelector('.grove-receipt').textContent).toMatch(/Stored food across living trees: .* \((up|down) .* from last year\)\. Reproductive savings/);
  });

  it('awards a discovery for a dry-soil loss and none without one', () => {
    const found = firstRunWithLoss();
    const state = E.groveRestore(found.raw);
    const dry = state.receipts.some(r => r.losses.some(l => l.cause === 'dry_seedling'));
    expect(E.groveDiscoveries(state).includes('young-loss')).toBe(dry);
    expect(E.groveDiscoveries(E.groveStart(config()))).not.toContain('young-loss');
    const host = mount({ groveRun: found.raw, groveJournal: ['young-loss', 'prediction-hit', 'fair-replay'] });
    const journal = host.querySelector('.grove-notebook');
    expect(journal.textContent).toContain('Lost a young tree to dry soil');
    expect(journal.textContent).toContain('Made a prediction that matched the evidence');
    expect(journal.textContent).toContain('Compared two runs of the same grove');
  });

  it('groups patches with identical landing outcomes onto one line', () => {
    let hit = null;
    outer: for (const mode of ['deck', 'generated']) for (let s = 0; s < 30; s++) {
      const raw = config(Array(8).fill(choice('offspring', 'seed')), mode, 'G' + s);
      const state = E.groveRestore(raw);
      for (const r of state.receipts) {
        const sig = {};
        for (const l of r.landings) { const k = l.patch; sig[k] = (sig[k] || []).concat(l.outcome + l.limit); }
        const counts = {};
        for (const k of Object.keys(sig)) { const v = sig[k].sort().join('|'); counts[v] = (counts[v] || 0) + 1; }
        if (Object.values(counts).some(n => n >= 2)) { hit = { raw, year: r.year }; break outer; }
      }
    }
    expect(hit).not.toBeNull();
    const host = mount({ groveRun: config(hit.raw.choices.slice(0, hit.year), hit.raw.mode, hit.raw.seed) });
    const items = [...host.querySelectorAll('.grove-where li')].map(li => li.textContent);
    expect(items.some(t => /, .*: \d+ (failed|took root) each/.test(t))).toBe(true);
    expect(items.length).toBeLessThan(9);
  });

  it('draws a two-series journey chart with legend, hover titles and a text alternative', () => {
    const run = config(Array(5).fill(choice()));
    const host = mount({ groveRun: run });
    const chart = host.querySelector('.grove-chart');
    expect(chart).not.toBeNull();
    expect(chart.querySelectorAll('polyline')).toHaveLength(2);
    expect(chart.querySelectorAll('title')).toHaveLength(12);
    expect(chart.querySelector('svg').getAttribute('aria-label')).toMatch(/Living trees by year: 3, /);
    expect(chart.querySelectorAll('.grove-chart-legend span')).toHaveLength(2);
    expect(chart.querySelectorAll('circle')).toHaveLength(6);
    expect(chart.querySelectorAll('rect')).toHaveLength(6);
    expect(host.querySelector('[aria-label="Journey timeline"] li')).not.toBeNull();
    expect(mount({ groveRun: config([]) }).querySelector('.grove-chart')).toBeNull();
  });
});

describe('Grove Journey forecast risk preview and reflection notes', () => {
  it('marks patches that will be dry next year and counts young trees standing there', () => {
    let hit = null;
    for (const mode of ['deck', 'generated']) for (let s = 0; s < 30 && !hit; s++) {
      const raw = config(Array(8).fill(choice('offspring', 'seed')), mode, 'R' + s);
      for (let year = 1; year < 8; year++) {
        const state = E.groveRestore(config(raw.choices.slice(0, year), mode, raw.seed));
        const next = E.groveEvent(raw, year + 1);
        const dry = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => E.groveEnvironment(state, i, next).soilWater < 0.35);
        const young = state.trees.filter(n => n.tree.alive && n.tree.age + 1 <= 3 && dry.includes(n.patch)).length;
        if (dry.length && young) { hit = { raw, year, dry, young }; break; }
      }
    }
    expect(hit).not.toBeNull();
    const host = mount({ groveRun: config(hit.raw.choices.slice(0, hit.year), hit.raw.mode, hit.raw.seed), grovePatch: hit.dry[0] });
    expect(host.querySelectorAll('.grove-patch.is-dry-next')).toHaveLength(hit.dry.length);
    expect([...host.querySelectorAll('.grove-map button')].filter(b => /dry next year/.test(b.getAttribute('aria-label')))).toHaveLength(hit.dry.length);
    const risk = host.querySelector('.grove-risk');
    expect(risk.textContent).toContain('Dry next year: ' + E.GROVE_PATCHES[hit.dry[0]].name);
    expect(risk.textContent).toContain(hit.young + ' young tree');
    expect(host.querySelector('.grove-inspect').textContent).toMatch(/next year \d+% soil moisture \(dry\)/);
    const calm = mount({ groveRun: config([]) });
    expect(calm.querySelector('.grove-risk')).toBeNull();
    expect(calm.querySelectorAll('.grove-patch.is-dry-next')).toHaveLength(0);
    expect(calm.querySelector('.grove-inspect').textContent).toMatch(/next year \d+% soil moisture/);
    const ended = mount({ groveRun: config(Array(8).fill(choice())) });
    expect(ended.querySelectorAll('.grove-patch.is-dry-next')).toHaveLength(0);
    expect(ended.querySelector('.grove-inspect').textContent).not.toContain('next year');
  });

  it('offers a reflection note for the completed run and shows earlier notes in the comparison', () => {
    const run = config(Array(8).fill(choice()));
    const key = 'GROVE-01|deck|' + JSON.stringify(E.groveConfig(run).choices);
    const mine = { key, seed: 'GROVE-01', mode: 'deck', priorities: Array(8).fill('offspring'), years: 8, living: 5, established: 2, patches: 2, success: true, note: 'Offspring every year worked.' };
    const other = { key: 'GROVE-01|deck|other', seed: 'GROVE-01', mode: 'deck', priorities: Array(8).fill('reserve'), years: 8, living: 3, established: 0, patches: 0, success: false, note: 'Reserves alone made no descendants.' };
    const host = mount({ groveRun: run, groveLedger: [other, mine] });
    const field = host.querySelector('#grove-note');
    expect(field).not.toBeNull();
    expect(field.textContent || field.value).toContain('Offspring every year worked.');
    expect(host.querySelector('.grove-ledger').textContent).toContain('“Reserves alone made no descendants.”');
    const alone = mount({ groveRun: run, groveLedger: [mine] });
    expect(alone.querySelector('#grove-note')).not.toBeNull();
    expect(alone.textContent).toContain('the comparison is fair');
    expect(mount({ groveRun: run }).querySelector('#grove-note')).toBeNull();
    expect(mount({ groveRun: config([choice()]) }).querySelector('#grove-note')).toBeNull();
  });
});
