import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let m;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); m = window.StemLab.evoArchipelagoModel; });
const recipe = (batch = 0, extra = {}) => ({ version: 1, seed: 21, batch, migration: 0, generation: 5, prediction: 'predict ' + batch, reasoning: 'explain ' + batch, ...extra });

describe('bounded, reproducible founder voyage collections', () => {
  it('loads old single-voyage recipes and bounds, deduplicates and sanitizes an untrusted collection', () => {
    expect(m.restoreFounders(recipe())).toEqual({ ...recipe(), archive: [] });
    const raw = recipe(30, { prediction: 'p'.repeat(700), reasoning: 'r'.repeat(5000), fabricated: { result: 999 }, archive: [recipe(0), ...Array.from({ length: 30 }, (_, i) => recipe(i)), recipe(29, { reasoning: 'latest duplicate', archive: [recipe(999)], fabricated: true }), recipe(31, { seed: -1 }), recipe(30)] });
    const restored = m.restoreFounders(raw), entries = m.founderVoyages(restored);
    expect(entries).toHaveLength(12); expect(entries.map(m.founderKey)).toEqual(Array.from({ length: 12 }, (_, i) => '21:' + (i + 19) + ':0'));
    expect(entries[10].reasoning).toBe('latest duplicate'); expect(entries.every(r => !r.archive && !r.fabricated)).toBe(true);
    expect(restored.prediction).toHaveLength(500); expect(restored.reasoning).toHaveLength(4000); expect(JSON.stringify(restored).length).toBeLessThan(60_000);
    expect(m.founderVoyages(null)).toEqual([]); expect(m.founderVoyageComparison(null, 'birds', 'H', 5)).toBeNull();
  });
  it('keeps separate explanations, visits at a common generation and draws a fresh batch after revisiting', () => {
    let saved = m.drawFounderVoyage(null, 21, 0, 'first prediction', 'first evidence');
    saved = m.drawFounderVoyage(saved, 21, 0, 'second prediction', 'second evidence'); saved = m.drawFounderVoyage(saved, 21, 0, 'third prediction', 'third evidence');
    const before = JSON.stringify(saved); const visited = m.visitFounderVoyage(saved, '21:0:0', 4);
    expect(visited).toMatchObject({ batch: 0, generation: 4, prediction: 'first prediction', reasoning: 'first evidence' }); expect(JSON.stringify(saved)).toBe(before);
    const next = m.drawFounderVoyage(visited, 21, 0, 'fresh prediction', ''); expect(next).toMatchObject({ batch: 3, generation: 0, prediction: 'fresh prediction', reasoning: '' }); expect(m.founderVoyages(next)).toHaveLength(4);
    expect(m.visitFounderVoyage(saved, 'missing', 0)).toBeNull(); expect(m.visitFounderVoyage(saved, '21:0:0', 6)).toBeNull();
    const wrap = m.restoreFounders(recipe(4294967295, { archive: [recipe(0)] })); expect(m.nextFounderBatch(wrap, 21)).toBe(1); expect(m.nextFounderBatch(wrap, 99)).toBe(0);
  });
  it('restores each connection condition and its own evidence without silently drawing new founders', () => {
    let saved = m.restoreFounders(recipe(2)); const original = JSON.stringify(saved);
    saved = m.connectFounderVoyage(saved, .3); expect(saved).toMatchObject({ batch: 2, migration: .3, generation: 5 }); saved.reasoning = 'connected evidence'; saved.prediction = 'connected prediction';
    saved = m.connectFounderVoyage(saved, 0); expect(saved.reasoning).toBe('explain 2'); expect(saved.prediction).toBe('predict 2');
    saved.generation = 3; saved = m.connectFounderVoyage(saved, .3); expect(saved).toMatchObject({ reasoning: 'connected evidence', prediction: 'connected prediction', generation: 3 });
    expect(m.founderVoyages(saved)).toHaveLength(2); expect(m.connectFounderVoyage(saved, .2)).toBeNull(); expect(original).toBe(JSON.stringify(m.restoreFounders(recipe(2))));
    expect(m.founderStudy(21, { batch: 2, migration: .3 }).worlds.small.history[0]).toEqual(m.founderStudy(21, { batch: 2 }).worlds.small.history[0]);
  });
  it('compares only the same source and connection setting, at a common generation, with actual paired differences', () => {
    const saved = m.restoreFounders(recipe(3, { archive: [recipe(0), recipe(1, { migration: .3 }), recipe(2, { seed: 22 })] }));
    for (const sp of m.species) for (const metric of ['p', 'H']) for (const g of [0, 3, 5]) {
      const comparison = m.founderVoyageComparison(saved, sp, metric, g); expect(comparison).toMatchObject({ seed: 21, migration: 0, generation: g, species: sp, metric, totalStored: 4, excluded: 2 }); expect(comparison.rows.map(r => r.batch)).toEqual([0, 3]);
      for (const row of comparison.rows) { const study = m.founderStudy(21, { batch: row.batch }); expect(row.small).toBe(m.stats(study.worlds.small.history[g].demes[2][sp])[metric]); expect(row.large).toBe(m.stats(study.worlds.large.history[g].demes[2][sp])[metric]); expect(row.difference).toBe(row.small - row.large); }
      const values = comparison.rows.map(r => r.difference); expect(comparison.difference.mean).toBe(values.reduce((a, b) => a + b, 0) / values.length); expect(comparison.difference.min).toBe(Math.min(...values)); expect(comparison.difference.max).toBe(Math.max(...values)); expect(comparison.lower + comparison.equal + comparison.higher).toBe(2);
    }
    for (const [sp, metric, g] of [['rabbits', 'H', 5], ['birds', 'genome', 5], ['birds', 'H', 6]]) expect(m.founderVoyageComparison(saved, sp, metric, g)).toBeNull();
  });
  it('retains 12 recent settings, reconstructs a JSON round trip and leaves the main expedition and its future unchanged', () => {
    const w = m.step(m.create(21)), before = JSON.stringify(w), future = m.step(w); let saved = null;
    for (let i = 0; i < 14; i++) saved = m.drawFounderVoyage(saved, 21, 0, 'prediction ' + i, 'explanation ' + i);
    expect(m.founderVoyages(saved).map(r => r.batch)).toEqual(Array.from({ length: 12 }, (_, i) => i + 2));
    const replay = m.restoreFounders(JSON.parse(JSON.stringify(saved))); expect(m.founderVoyageComparison(replay, 'birds', 'H', 5)).toEqual(m.founderVoyageComparison(saved, 'birds', 'H', 5));
    expect(JSON.stringify(w)).toBe(before); expect(m.step(w)).toEqual(future);
  });
  it('renders saved comparisons and accessible routes without displaying future generations or losing the active note', () => {
    const saved = m.restoreFounders(recipe(1, { generation: 2, archive: [recipe(0)] })), doc = new DOMParser().parseFromString(renderTool('evoLab', { evoLab: { view: 'archipelago', archipelago: m.create(21), archipelagoFounders: saved } }), 'text/html');
    expect(doc.querySelector('[data-founder-collection]').getAttribute('data-founder-collection')).toBe('2'); expect(doc.querySelectorAll('[data-founder-comparisons] tbody tr')).toHaveLength(2); expect(doc.querySelector('[data-founder-comparisons]').getAttribute('data-founder-comparisons')).toBe('2');
    expect(doc.querySelectorAll('[data-founder-point][role=button][tabindex="0"]')).toHaveLength(4); expect(doc.querySelector('#ea-founders-reasoning').textContent).toBe('explain 1'); expect(doc.querySelectorAll('[data-founder-history] tbody tr')).toHaveLength(3);
  });
});
