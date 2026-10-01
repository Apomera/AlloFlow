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

describe('Grove Journey K-2 wording layer', () => {
  it('swaps to shorter words for K-2 without changing the facts, and leaves other bands alone', () => {
    const found = firstRunWithLoss();
    const run = config(found.raw.choices.slice(0, found.year), found.raw.mode, found.raw.seed);
    const k2 = mount({ groveRun: run, bandOverride: 'k2', grovePredictions: [{ year: found.year, arrivals: 'none', food: 'surplus' }] });
    const full = mount({ groveRun: run, grovePredictions: [{ year: found.year, arrivals: 'none', food: 'surplus' }] });
    const t = el => el.textContent;
    expect(t(k2.querySelector('.grove-stats'))).toContain('trees alive');
    expect(t(full.querySelector('.grove-stats'))).toContain('living trees');
    expect(t(k2.querySelector('.grove-priorities'))).toContain('Pick a card for this year');
    expect(t(k2.querySelector('.grove-priorities'))).toContain('Make new trees');
    expect(t(full.querySelector('.grove-priorities'))).toContain('Invest in offspring');
    expect(t(k2.querySelector('.grove-receipt'))).toMatch(/Card used: (Grow roots|Save food|Make new trees)\./);
    expect(t(k2.querySelector('.grove-receipt'))).toContain('Saved food: ');
    expect(t(k2.querySelector('.grove-where'))).toMatch(/too dry|too shady|just bad luck|no room|grew/);
    expect(t(k2.querySelector('.grove-where'))).toContain('The soil was too dry for a small tree.');
    expect(t(full.querySelector('.grove-where'))).toContain('died in dry soil while still small.');
    expect(t(k2.querySelector('[data-grove-prediction]'))).toMatch(/You were right: you said|Not this time: you said/);
    expect(t(full.querySelector('[data-grove-prediction]'))).toMatch(/Matched: you predicted|Missed: you predicted/);
    expect(t(k2.querySelector('.grove-inspect'))).toMatch(/Sunny spot|Wet spot|Shady spot/);
    expect(t(full.querySelector('.grove-inspect'))).toMatch(/(Exposed|Damp|Sheltered) habitat/);
    // The numbers are the same in both bands: same living count, same arrivals line.
    expect(k2.querySelector('[data-grove-living]').textContent).toBe(full.querySelector('[data-grove-living]').textContent);
    expect(k2.querySelectorAll('.grove-where li')).toHaveLength(full.querySelectorAll('.grove-where li').length);
    const k2Start = mount({ groveSeed: 'GROVE-01', bandOverride: 'k2' });
    expect(t(k2Start)).toContain('Same code = same weather.');
    const k2Forecast = mount({ groveRun: config([]), bandOverride: 'k2' });
    expect(t(k2Forecast.querySelector('.grove-forecast'))).toContain('A good year. Plenty of water for growing.');
    expect(t(k2Forecast.querySelector('.grove-forecast'))).toMatch(/soil \d+% wet/);
    const g35 = mount({ groveRun: config([]), bandOverride: 'g35' });
    expect(t(g35.querySelector('.grove-forecast'))).toContain('Steady moisture gives the grove a chance');
  });
});

describe('Grove Journey visual cues', () => {
  it('shows event icons on completed year tiles, moisture bars, gap light and growth-scaled symbols', () => {
    let state = E.groveStart(config([], 'deck', 'storm-test'));
    for (let i = 0; i < 8; i++) state = E.groveAdvance(state, choice('roots'));
    const run = config(Array(8).fill(choice('roots')), 'deck', 'storm-test');
    const host = mount({ groveRun: run });
    const tiles = [...host.querySelectorAll('.grove-progress span')];
    expect(tiles).toHaveLength(8);
    tiles.forEach((tile, i) => {
      expect(tile.textContent).toBe(state.receipts[i].event.icon + ' ' + (i + 1));
      expect(tile.getAttribute('title')).toContain(state.receipts[i].event.title);
    });
    expect(host.querySelectorAll('.grove-patch-water i')).toHaveLength(9);
    const widths = [...host.querySelectorAll('.grove-patch-water i')].map(el => parseInt(el.getAttribute('style').match(/width:\s*(\d+)%/)[1], 10));
    const lastEvent = state.receipts.at(-1).event;
    widths.forEach((w, i) => expect(w).toBe(Math.round(E.groveEnvironment(state, i, lastEvent).soilWater * 100)));
    expect([...host.querySelectorAll('.grove-map button')].every(b => /soil \d+% wet/.test(b.getAttribute('aria-label')))).toBe(true);
    expect(state.gaps.length).toBeGreaterThan(0);
    expect(host.querySelectorAll('.grove-map path[d^="M70 2 L30 86"]')).toHaveLength(state.gaps.length);
    // Symbol scale follows modelled height: the 40-year oak is drawn larger than the young aspen.
    const transforms = [...host.querySelectorAll('.grove-glyph > g')].map(g => parseFloat(g.getAttribute('transform').match(/scale\(([\d.]+)\)/)[1]));
    expect(Math.max(...transforms)).toBeGreaterThan(Math.min(...transforms));
    expect(transforms.every(s => s >= 0.42 && s <= 1)).toBe(true);
    const fresh = mount({ groveRun: config([]) });
    expect([...fresh.querySelectorAll('.grove-progress span')].map(t => t.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('marks newly arrived trees for the pop-in only when motion is allowed, and announces new discoveries', () => {
    let hit = null;
    for (let s = 0; s < 30 && !hit; s++) {
      const raw = config(Array(8).fill(choice('offspring', 'seed')), 'deck', 'A' + s);
      const st = E.groveRestore(raw);
      const r = st.receipts.find(r => r.arrivals > 0);
      if (r) hit = { raw, year: r.year, arrivals: r.arrivals };
    }
    expect(hit).not.toBeNull();
    const run = config(hit.raw.choices.slice(0, hit.year), 'deck', hit.raw.seed);
    const host = mount({ groveRun: run });
    expect(host.querySelectorAll('.grove-glyph.is-new')).toHaveLength(hit.arrivals);
    const still = document.createElement('div');
    still.innerHTML = renderTool('treeLab', { treeLab: { view: 'grove', groveRun: run } }, { reduceMotion: true });
    expect(still.querySelectorAll('.grove-glyph.is-new')).toHaveLength(0);
    expect(still.querySelectorAll('.grove-glyph')).toHaveLength(host.querySelectorAll('.grove-glyph').length);
    const first = mount({ groveRun: config([choice()]) });
    expect(first.querySelector('.grove-discovery').textContent).toContain('New discovery: Read a year in the grove');
    const second = mount({ groveRun: config([choice(), choice()]) });
    const banner = second.querySelector('.grove-discovery');
    const earned = E.groveDiscoveries(E.groveRestore(config([choice(), choice()]))).filter(id => !E.groveDiscoveries(E.groveRestore(config([choice()]))).includes(id));
    expect(!!banner).toBe(earned.length > 0);
  });
});

describe('Grove Journey keyboard flow, goal tracker and sharing', () => {
  it('offers a skip link to the decision column, focusable headings and a two-dot goal tracker', () => {
    const host = mount({ groveRun: config([choice(), choice()]) });
    const skip = host.querySelector('.grove-skip');
    expect(skip.getAttribute('href')).toBe('#grove-decisions');
    expect(host.querySelector('#grove-decisions').getAttribute('tabindex')).toBe('-1');
    expect(host.querySelector('.grove-forecast h3').getAttribute('tabindex')).toBe('-1');
    expect(host.querySelectorAll('.grove-goal-dots i')).toHaveLength(2);
    const state = E.groveRestore(config([choice(), choice()]));
    expect(host.querySelectorAll('.grove-goal-dots i.is-filled')).toHaveLength(Math.min(2, E.groveSummary(state).descendantPatches));
    const ended = mount({ groveRun: config(Array(8).fill(choice())) });
    expect(ended.querySelector('[data-grove-ending] h3').getAttribute('tabindex')).toBe('-1');
    expect(mount({ groveSeed: 'GROVE-01' }).querySelector('.grove-setup h3').getAttribute('tabindex')).toBe('-1');
  });

  it('renders copy buttons, reports the copy outcome, and falls back to selectable text', () => {
    const fresh = mount({ groveRun: config([]) });
    expect([...fresh.querySelectorAll('.grove-share-buttons button')].map(b => b.textContent)).toEqual(['Copy grove code']);
    const played = mount({ groveRun: config([choice()]) });
    expect([...played.querySelectorAll('.grove-share-buttons button')].map(b => b.textContent)).toEqual(['Copy grove code', 'Copy run summary']);
    expect(played.querySelector('.grove-share [role="status"]')).toBeNull();
    const copied = mount({ groveRun: config([choice()]), groveShare: { kind: 'code', status: 'copied', text: 'GROVE-01' } });
    expect(copied.querySelector('.grove-share [role="status"]').textContent).toContain('Grove code copied');
    expect(copied.querySelector('.grove-share-text')).toBeNull();
    const failed = mount({ groveRun: config([choice()]), groveShare: { kind: 'summary', status: 'failed', text: 'Year 1: test' } });
    expect(failed.querySelector('.grove-share [role="status"]').textContent).toContain('Ctrl+C');
    const area = failed.querySelector('.grove-share-text');
    expect(area.getAttribute('readonly')).not.toBeNull();
    expect(area.textContent || area.value).toContain('Year 1: test');
    const k2 = mount({ groveRun: config([choice()]), bandOverride: 'k2' });
    expect([...k2.querySelectorAll('.grove-share-buttons button')].map(b => b.textContent)).toEqual(['Copy grove code', 'Copy my grove story']);
  });
});

describe('Grove Journey habitat detail, evidence link and announcements', () => {
  it('draws habitat-specific ground detail, tooltips on patches, and links the decision column to the evidence', () => {
    const fresh = mount({ groveRun: config([]) });
    expect(fresh.querySelectorAll('.grove-habitat.is-exposed')).toHaveLength(E.GROVE_PATCHES.filter(p => p.habitat === 'exposed').length);
    expect(fresh.querySelectorAll('.grove-habitat.is-damp')).toHaveLength(E.GROVE_PATCHES.filter(p => p.habitat === 'damp').length);
    expect(fresh.querySelectorAll('.grove-habitat.is-sheltered')).toHaveLength(E.GROVE_PATCHES.filter(p => p.habitat === 'sheltered').length);
    const buttons = [...fresh.querySelectorAll('.grove-map button')];
    expect(buttons.every(b => /soil \d+% wet/.test(b.getAttribute('title')))).toBe(true);
    expect(buttons[0].getAttribute('title')).toContain('Sunny ridge');
    expect(fresh.querySelector('.grove-evidence-link')).toBeNull();
    const played = mount({ groveRun: config([choice()]) });
    const link = played.querySelector('.grove-evidence-link');
    expect(link.getAttribute('href')).toBe('#grove-receipt');
    expect(link.textContent).toContain('year 1');
    const receipt = played.querySelector('#grove-receipt');
    expect(receipt.classList.contains('grove-receipt')).toBe(true);
    expect(receipt.getAttribute('tabindex')).toBe('-1');
    expect(receipt.getAttribute('aria-live')).toBeNull();
    expect(receipt.getAttribute('aria-label')).toBe('Latest year evidence');
    expect(mount({ groveRun: config([choice()]), bandOverride: 'k2' }).querySelector('.grove-evidence-link').textContent).toContain('See what happened');
  });
});
