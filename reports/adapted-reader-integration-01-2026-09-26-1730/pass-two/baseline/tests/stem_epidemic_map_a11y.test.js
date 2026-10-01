import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const day0Grid = [
  ['S', 'S', 'S'],
  ['S', 'S', 'S'],
  ['I', 'R', 'R'],
];

const day1Grid = [
  ['S', 'S', 'S'],
  ['E', 'E', 'I'],
  ['I', 'H', 'R'],
];

const day2Grid = [
  ['S', 'S', 'E'],
  ['H', 'R', 'R'],
  ['R', 'R', 'R'],
];

function cloneGrid(grid) {
  return grid.map((row) => row.slice());
}

function counts(S, E, I, H, R) {
  return { S, E, I, H, R, total: S + E + I + H + R };
}

function mapState(overrides = {}) {
  return {
    epidemicSim: {
    tab: 'outbreakmap',
    mapScenario: 0,
    mapPathogen: 'respiratory',
    mapSeed: 4242,
    mapGrid: cloneGrid(day0Grid),
    mapBaselineGrid: cloneGrid(day0Grid),
    mapSnapshots: [cloneGrid(day0Grid)],
    mapHistory: [counts(6, 0, 1, 0, 2)],
    mapBaselineHistory: [counts(6, 0, 1, 0, 2)],
    mapStep: 0,
    mapViewStep: 0,
    mapRunning: false,
    mapPlacementMode: false,
    mapQuarantineZones: [],
    ...overrides,
    },
  };
}

function toDOM(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_epidemic.js', 'epidemicSim');
  window._epiMapTimer = null;
});

describe('Epidemic outbreak map interaction and comparison', () => {
  it('uses one roving map-cell tab stop and exposes state without color alone', () => {
    const root = toDOM(renderTool('epidemicSim', mapState({
      mapGrid: cloneGrid(day1Grid),
      mapBaselineGrid: cloneGrid(day1Grid),
      mapSnapshots: [cloneGrid(day1Grid)],
      mapHistory: [counts(3, 2, 2, 1, 1)],
      mapBaselineHistory: [counts(3, 2, 2, 1, 1)],
      mapPlacementMode: true,
    })));
    const cells = [...root.querySelectorAll('[data-epi-map-cell]')];

    expect(cells).toHaveLength(9);
    expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    expect(cells.filter((cell) => cell.tabIndex === -1)).toHaveLength(8);
    expect(cells.every((cell) => cell.tagName === 'BUTTON')).toBe(true);
    expect(cells.every((cell) => cell.hasAttribute('aria-pressed'))).toBe(true);
    expect(new Set(cells.map((cell) => cell.textContent))).toEqual(new Set(['S', 'E', 'I', 'H', 'R']));
    expect(cells[0].getAttribute('aria-label')).toContain('Row 1, column 1');
    expect(root.querySelector('[data-epi-place-zone-control]')).not.toBeNull();
    expect(root.textContent).toContain('Experiment seed');
    expect(root.textContent).toContain('replay the same starting map');
  });

  it('renders a matched baseline, responsive HTML legend, and active E/H phase', () => {
    const actualHistory = [
      counts(6, 0, 1, 0, 2),
      counts(3, 2, 2, 1, 1),
      counts(2, 1, 0, 1, 5),
    ];
    const baselineHistory = [
      counts(6, 0, 1, 0, 2),
      counts(2, 2, 3, 1, 1),
      counts(1, 1, 2, 1, 4),
    ];
    const root = toDOM(renderTool('epidemicSim', mapState({
      mapGrid: cloneGrid(day2Grid),
      mapBaselineGrid: cloneGrid(day2Grid),
      mapSnapshots: [cloneGrid(day0Grid), cloneGrid(day1Grid), cloneGrid(day2Grid)],
      mapHistory: actualHistory,
      mapBaselineHistory: baselineHistory,
      mapStep: 2,
      mapViewStep: 2,
    })));

    expect(root.querySelector('[aria-label="Matched no-additional-response baseline comparison"]')).not.toBeNull();
    expect(root.textContent).toContain('Compared with no additional response');
    expect(root.querySelector('svg[aria-label*="dashed no-additional-response"]')).not.toBeNull();
    expect(root.textContent).toContain('I baseline');
    expect(root.querySelector('[aria-label="Map snapshot summary for day 2"]').textContent).toContain('Transmission easing');
    expect(root.querySelector('[aria-label="Map snapshot summary for day 2"]').textContent).not.toContain('No active infections');
  });

  it('replaces autoplay with a manual day step when reduced motion is enabled', () => {
    const previous = window.matchMedia;
    try {
      window.matchMedia = () => ({ matches: true });
      const root = toDOM(renderTool('epidemicSim', mapState({ mapRunning: true })));
      const buttons = [...root.querySelectorAll('button')].map((button) => button.textContent.trim());

      expect(root.textContent).toContain('Autoplay is off because reduced motion is enabled');
      expect(root.querySelector('button[aria-label="Advance outbreak map one day and stay paused"]')).not.toBeNull();
      expect(buttons.some((label) => label.endsWith('Run'))).toBe(false);
    } finally {
      if (previous) window.matchMedia = previous;
      else delete window.matchMedia;
    }
  });
});
