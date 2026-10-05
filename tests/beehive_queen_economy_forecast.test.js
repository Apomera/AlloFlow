import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
const { act } = React;
let config, BH;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

function economyFixture(day = 0) {
  return { active: true, paused: false, speed: 1, day, hiveHealth: 100, territory: 50,
    resources: { nectar: 20.04, pollen: 8.06, wax: 3.02, royalJelly: 1.03 },
    population: { nurses: 12, builders: 3, guards: 7, foragers: 8, scouts: 2, drones: 4 },
    pheromones: { qmp: 100, alarm: 0, nasonov: 50, brood: 40 },
    rival: { name: 'Rival', health: 100, strength: 270, stores: 35, structures: 2, pressure: 0, intel: 0, doctrine: 'conservation' },
    structures: [{ type: 'brood', level: 2, x: 0.2, y: 0.2 }, { type: 'guard', level: 3, x: 0.3, y: 0.3 }, { type: 'nursery', level: 2, x: 0.2, y: 0.4 }, { type: 'honey', level: 1, x: 0.3, y: 0.4 }, { type: 'pollen', level: 2, x: 0.2, y: 0.6 }, { type: 'fan', level: 1, x: 0.3, y: 0.6 }],
    productionQueue: [{ id: 'workers-now', type: 'workers', label: 'Worker brood', icon: 'w', amount: 20, remaining: 1 }, { id: 'drones-now', type: 'drones', label: 'Drone brood', icon: 'd', amount: 40, remaining: 1 }, { id: 'workers-later', type: 'workers', label: 'Worker brood', icon: 'w', amount: 3, remaining: 2 }],
  };
}

describe('Queen economy forecast matches the actual deterministic stage', () => {
  let host, root, latest, originalRaf, originalCancelRaf;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks(); vi.useRealTimers();
  });
  async function mount(queen) {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'queen', queen } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    // Keep scene setup's sampling independent of the deterministic cycle events.
    vi.spyOn(Math, 'random').mockReturnValue(0.99999);
  }

  it('matures only ready brood, includes new guards in upkeep, and preserves the source state', () => {
    const queen = economyFixture(), before = JSON.stringify(queen);
    const next = BH.bhQueenEconomyStep(queen, 1);
    expect(next.population).toMatchObject({ nurses: 44, guards: 13, foragers: 15, drones: 44 });
    expect(next.completedProduction.map((order) => order.id)).toEqual(['workers-now', 'drones-now']);
    expect(next.productionQueue).toEqual([expect.objectContaining({ id: 'workers-later', remaining: 1 })]);
    expect(next.totalPopulation).toBe(121);
    expect(next.resources.nectar).toBeCloseTo(20.7 - 121 * 0.004 * 0.9, 10);
    expect(next.resources.royalJelly).toBeCloseTo(1.5, 10);
    expect(JSON.stringify(queen)).toBe(before);
  });

  it.each([[0, 'Spring'], [10, 'Summer'], [20, 'Autumn'], [30, 'Winter']])('matches displayed deltas and real cycle resources at day %i entering %s', async (day, season) => {
    const queen = economyFixture(day);
    const expected = BH.bhQueenEconomyStep(queen, day + 1);
    await mount(queen);
    expect(host.querySelector('[data-rts-next-cycle-economy]').textContent).toContain(season);
    for (const key of ['nectar', 'pollen', 'wax', 'royalJelly']) {
      const shownDelta = Number(host.querySelector(`[data-rts-next-cycle-delta="${key}"]`).textContent.replace(' next', ''));
      expect(shownDelta).toBeCloseTo(Math.round((expected.resources[key] - queen.resources[key]) * 10) / 10, 10);
    }
    await act(async () => { vi.advanceTimersByTime(2450); await Promise.resolve(); });
    expect(latest.beehive.queen.day).toBe(day + 1);
    for (const key of ['nectar', 'pollen', 'wax', 'royalJelly']) expect(latest.beehive.queen.resources[key]).toBeCloseTo(expected.resources[key], 10);
  });

  it('limits negative forecasts to available stores when winter upkeep exceeds them', async () => {
    const queen = economyFixture(30);
    queen.resources.nectar = 0.1; queen.resources.pollen = 0.01;
    queen.structures = [];
    const expected = BH.bhQueenEconomyStep(queen, 31);
    expect(expected.resources.nectar).toBe(0);
    expect(expected.resources.pollen).toBe(0);
    await mount(queen);
    expect(host.querySelector('[data-rts-next-cycle-delta="nectar"]').textContent).toBe('-0.1 next');
    await act(async () => { vi.advanceTimersByTime(2450); await Promise.resolve(); });
    expect(latest.beehive.queen.resources.nectar).toBe(0);
    expect(latest.beehive.queen.resources.pollen).toBe(0);
  });
});

describe('Queen RTS next-cycle economy forecast', () => {
  it('shows deterministic resource deltas alongside current stockpiles', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'queen', queen: { active: true, paused: true } },
    });

    expect(html).toContain('data-rts-next-cycle-economy="true"');
    expect(html).toContain('Next-cycle forecast');
    expect(html).toContain('data-rts-next-cycle-resource="nectar"');
    expect(html).toContain('data-rts-next-cycle-delta="wax"');
    expect(html).toContain('Worker throughput, structures, season, and upkeep are projected from the current state.');
  });

  it('labels the forecast as a baseline and exposes the explanation to assistive technology', () => {
    const html = renderTool('beehive', {
      beehive: { viewMode: 'queen', queen: { active: true, paused: true, difficulty: 'standard', opening: 'balanced', scenario: 'field_report', rival: { name: 'Rival hive', health: 100, strength: 100, stores: 10, structures: 2, pressure: 72, intel: 0 } } },
    });

    expect(html).toContain('data-rts-economy-watch="true"');
    expect(html).toContain('Raid pressure is high; a rival strike can steal nectar beyond this baseline.');
    expect(source).toContain("'aria-labelledby': 'rts-next-cycle-title'");
    expect(source).toContain("'aria-describedby': 'rts-next-cycle-note'");
  });
});
