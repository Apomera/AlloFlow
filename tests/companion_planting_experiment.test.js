import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadTool, resetStemLab, newStore, makeCtx, React } from './helpers/stem_widgets_smoke_harness.js';

function emptyGrid() {
  return Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
}
function garden(overrides = {}) {
  const grid = emptyGrid();
  grid[0].plantId = 'corn'; grid[1].plantId = 'beans'; grid[4].plantId = 'squash';
  return { grid, phase: 'grow', day: 0, budget: 41, moisture: 60, ...overrides };
}
function harness(seed = garden()) {
  resetStemLab();
  const config = loadTool('stem_lab/stem_tool_companionplanting.js', 'companionPlanting');
  const store = newStore({ companionPlanting: { gardenMode: 'community', communityGarden: seed } });
  const awardXP = vi.fn(), saveSnapshot = vi.fn();
  const state = () => store.toolData.companionPlanting.communityGarden;
  const tree = () => config.render(makeCtx({ toolData: store.toolData, awardXP, saveSnapshot }, store));
  function find(key, value = true) {
    const visit = node => {
      if (Array.isArray(node)) { for (const child of node) { const match = visit(child); if (match) return match; } return null; }
      if (!React.isValidElement(node)) return null;
      if (node.props[key] === value) return node;
      return visit(node.props.children);
    };
    const node = visit(tree());
    if (!node) throw new Error(`Control not found: ${key}=${value}`);
    return node;
  }
  return { state, store, awardXP, saveSnapshot, find,
    click: (key, value = true) => find(key, value).props.onClick(),
    change: (key, value) => find(key).props.onChange({ target: { value } }),
    patch: patch => Object.assign(state(), patch),
  };
}
afterEach(() => vi.restoreAllMocks());

describe('Companion Planting controlled experiment bench', () => {
  it('copies a garden and swaps entire plants without spending budget, awarding XP, or changing live plots', () => {
    const app = harness();
    const original = structuredClone(app.state());
    app.click('data-experiment-capture');
    app.click('data-experiment-plot', 'b-1');
    app.click('data-experiment-plot', 'b-15');
    const bench = app.state().experimentBench;
    expect(bench.variant[15].plantId).toBe('beans');
    expect(bench.variant[1].plantId).toBeNull();
    expect(bench.baseline.grid).toEqual(original.grid);
    expect(bench.variant.map(c => c.plantId).sort()).toEqual(original.grid.map(c => c.plantId).sort());
    expect(app.state().grid).toEqual(original.grid);
    expect(app.state().budget).toBe(41);
    expect(app.state().day).toBe(0);
    expect(app.awardXP).not.toHaveBeenCalled();
    expect(bench.baseline.grid).not.toBe(app.state().grid);
  });

  it('offers an isolated example when no crops exist', () => {
    const app = harness({ grid: emptyGrid() });
    app.click('data-experiment-capture');
    expect(app.state().experimentBench.source).toBe('Example garden');
    expect(app.state().experimentBench.baseline.grid.filter(c => c.plantId)).toHaveLength(6);
    expect(app.state().grid.filter(c => c.plantId)).toHaveLength(0);
  });

  it('produces identical trajectories for identical layouts without invoking random draws', () => {
    const app = harness(garden({ day: 10, cellHistory: { 0: ['corn'] } }));
    app.click('data-experiment-capture');
    // Rendering has existing decorative random calls; guard only the simulation handler.
    const run = app.find('data-experiment-run').props.onClick;
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Random draw in controlled trial'); });
    run();
    const result = app.state().experimentBench.result;
    expect(result.samples).toHaveLength(15);
    for (const sample of result.samples) expect(sample.a).toEqual(sample.b);
    expect(result.baseline.cellHistory).toEqual({ 0: ['corn'] });
    expect(app.state().day).toBe(10);
  });

  it('uses the same daily model as the live garden', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const app = harness();
    app.click('data-experiment-capture');
    app.change('data-experiment-duration', '7');
    app.change('data-experiment-water', 'none');
    app.click('data-experiment-run');
    const result = structuredClone(app.state().experimentBench.result);
    const crop = result.cropId;
    for (let day = 1; day <= 7; day++) {
      app.patch({ showAdvanceReview: true });
      app.click('data-community-run-day');
      const cells = app.state().grid.filter(cell => cell.plantId === crop);
      expect(result.samples[day].a.health).toBeCloseTo(cells.reduce((sum, cell) => sum + cell.health, 0) / cells.length, 10);
      expect(result.samples[day].a.pests).toBeCloseTo(cells.reduce((sum, cell) => sum + cell.pests, 0) / cells.length, 10);
    }
    expect(app.state().day).toBe(7);
    expect(app.state().experimentBench.baseline.day).toBe(0);
  });

  it('responds to moving helpful neighbors away, and reruns reproducibly', () => {
    const app = harness();
    app.click('data-experiment-capture');
    app.change('data-experiment-crop', 'corn');
    app.click('data-experiment-plot', 'b-1'); app.click('data-experiment-plot', 'b-15');
    app.click('data-experiment-run');
    const first = structuredClone(app.state().experimentBench.result.samples);
    expect(first.at(-1).b.maturity).toBeLessThan(first.at(-1).a.maturity);
    app.click('data-experiment-run');
    expect(app.state().experimentBench.result.samples).toEqual(first);
  });

  it('invalidates results after setup edits but keeps them for chart changes, selection, and conclusions', () => {
    const app = harness(); app.click('data-experiment-capture'); app.click('data-experiment-run');
    const result = app.state().experimentBench.result;
    app.change('data-experiment-conclusion', 'The controls matched.');
    app.click('data-experiment-plot', 'b-0');
    expect(app.state().experimentBench.result).toEqual(result);
    app.click('data-experiment-plot', 'b-0');
    expect(app.state().experimentBench.selected).toBeNull();
    app.change('data-experiment-duration', '30');
    expect(app.state().experimentBench.result).toBeNull();
    expect(app.state().experimentBench.conclusion).toBe('');
  });

  it('keeps saved evidence immutable and deduplicates updates to the same trial', () => {
    const app = harness(); app.click('data-experiment-capture'); app.click('data-experiment-run');
    app.change('data-experiment-conclusion', 'No difference with identical controls.');
    app.click('data-experiment-save'); app.click('data-experiment-save');
    expect(app.state().experimentHistory).toHaveLength(1);
    const saved = structuredClone(app.state().experimentHistory[0]);
    app.click('data-experiment-plot', 'b-1'); app.click('data-experiment-plot', 'b-15');
    expect(app.state().experimentHistory[0]).toEqual(saved);
    expect(app.saveSnapshot).toHaveBeenCalled();
    expect(app.state().resumeCheckpoint).toBeTruthy();
  });

  it('stops before annual clearing and handles winter dormancy without missing or nonfinite measurements', () => {
    const app = harness(garden({ day: 116 }));
    app.click('data-experiment-capture'); app.click('data-experiment-run');
    const result = app.state().experimentBench.result;
    expect(result.duration).toBe(3);
    expect(result.samples.at(-1).day).toBe(119);
    for (const sample of result.samples) {
      expect(sample.a.maturity).toBe(0);
      expect(Number.isFinite(sample.a.health)).toBe(true);
    }
    const endApp = harness(garden({ day: 119 }));
    endApp.click('data-experiment-capture');
    expect(endApp.find('data-experiment-run').props.disabled).toBe(true);
  });

  it('keeps structures across year rollover and does not grow structures as crops', () => {
    const grid = emptyGrid(); grid[0].plantId = 'rain_barrel'; grid[1].plantId = 'corn';
    const app = harness(garden({ day: 119, grid, showAdvanceReview: true }));
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    app.click('data-community-run-day');
    expect(app.state().grid[0]).toEqual(grid[0]);
    expect(app.state().grid[1].plantId).toBeNull();
    expect(app.state().year).toBe(2);
  });

  it('does not count an old event popup as a new observed event', () => {
    const app = harness(garden({ day: 12, showAdvanceReview: true, activeEvent: { label: 'Old rain', emoji: 'Rain', desc: 'Yesterday' } }));
    app.click('data-community-run-day');
    expect(app.state().lastDayReport.eventLabel).toBeNull();
    expect(app.state().soilHistory.at(-1).event).toBeNull();
    expect(app.state().activeEvent.label).toBe('Old rain');
  });

  it('exports both layouts, conditions, measurements, and spreadsheet-safe learner text', () => {
    const app = harness(); app.click('data-experiment-capture');
    app.change('data-experiment-prediction', '=HYPERLINK("https://example.invalid")');
    app.click('data-experiment-run');
    let csv;
    const OriginalBlob = globalThis.Blob;
    vi.stubGlobal('Blob', class { constructor(parts) { csv = parts.join(''); } });
    const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:trial'); URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      app.click('data-experiment-export');
      expect(csv).toContain('"A crop","B crop"');
      expect(csv).toContain('"Starting nitrogen","50"');
      expect(csv).toContain('"B minus A maturity (points)"');
      expect(csv).toContain('"\'=HYPERLINK(""https://example.invalid"")"');
      expect(app.state().experimentStatus).toContain('CSV downloaded');
    } finally {
      vi.stubGlobal('Blob', OriginalBlob); URL.createObjectURL = create; URL.revokeObjectURL = revoke;
    }
  });
});
