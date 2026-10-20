// Universe Explorer, seventeenth pass (2026-10-19): the Hubble Inquiry chart becomes a labelled,
// full-size plot (distance in Mpc against recession speed) with a speed-of-light line and the
// distance c / H0 beyond which space carries galaxies away faster than light.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const inquiry = (distMpc, hubbleConst) => ({ distMpc, hubbleConst, darkEnergy: 70, matter: 30, log: [] });
const chart = (distMpc, hubbleConst) => sliceBetween(renderTool('universe', { universe: { tutorialDismissed: true, showHubbleInquiry: true, hubbleInquiry: inquiry(distMpc, hubbleConst) } }), 'class="uni-hubble-chart"', '</svg>');
const num = (svg, re) => parseFloat(re.exec(svg)[1]);

describe('Hubble sphere (pure)', () => {
  it('is c / H0', () => {
    expect(pure.universeHubbleSphereMpc(70)).toBeCloseTo(4282.7, 1);
    expect(pure.universeHubbleSphereMpc(100)).toBeCloseTo(2997.9, 1);
    expect(pure.universeHubbleSphereMpc(0)).toBe(Infinity);
  });
});

describe('Hubble chart (rendered)', () => {
  it('draws the speed-of-light line and labels both axes', () => {
    const svg = chart(100, 70);
    expect(svg.includes('class="uni-hubble-c"')).toBe(true);
    expect(svg.includes('speed of light')).toBe(true);
    expect(svg.includes('Recession speed (km/s)')).toBe(true);
    expect(svg.includes('Distance (Mpc)')).toBe(true);
    expect(svg.includes('fate: ')).toBe(true);
  });

  it('puts the galaxy dot where v = H0 d says', () => {
    // plot: x = 44 + d / 4000 * 304, y = 150 - v / (1.2 c) * 132
    const svg = chart(2000, 70), v = 2000 * 70;
    expect(num(svg, /<circle cx="([^"]+)" cy="[^"]+" r="5.5"/)).toBeCloseTo(44 + 0.5 * 304, 1);
    expect(num(svg, /<circle cx="[^"]+" cy="([^"]+)" r="5.5"/)).toBeCloseTo(150 - v / (1.2 * 299792.458) * 132, 1);
  });

  it('marks where recession passes light speed only when it is on the chart', () => {
    expect(chart(100, 70).includes('class="uni-hubble-sphere"')).toBe(false);
    const svg = chart(100, 100);
    expect(svg.includes('class="uni-hubble-sphere"')).toBe(true);
    expect(svg.includes('faster than light beyond 2,998 Mpc')).toBe(true);
    expect(num(svg, /class="uni-hubble-sphere" x1="([^"]+)"/)).toBeCloseTo(44 + 2997.9 / 4000 * 304, 0);
  });
});
