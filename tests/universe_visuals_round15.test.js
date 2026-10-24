// Universe Explorer, fifteenth pass (2026-10-19): Catastrophes gets a "how close is too close?"
// chart. Danger distances come from the cards' own numbers, on a log axis, with landmarks
// and the share of the Milky Way's disc each radius covers.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true, showCatastrophes: true }, state) });

describe('Danger distances (pure)', () => {
  it('uses the distances the cards quote', () => {
    const r = Object.fromEntries(pure.UNIVERSE_DANGER_RANGES.map((x) => [x.id, x.ly]));
    expect(r).toEqual({ magnetar: 10, supernova: 30, grb: 6500 });
    const html = render({});
    expect(html.includes('Dangerous within ~10 ly')).toBe(true);
    expect(html.includes('Dangerous within ~30 ly')).toBe(true);
    expect(html.includes('within ~6,500 ly')).toBe(true);
  });

  it('works out the share of the disc as (r / R) squared', () => {
    expect(pure.universeDiscShare(50000)).toBe(1);
    expect(pure.universeDiscShare(25000)).toBeCloseTo(0.25, 10);
    expect(pure.universeDiscShare(6500)).toBeCloseTo(0.016900, 6);
    expect(pure.universeDiscShare(1e6)).toBe(1);
  });

  it('words tiny and large shares', () => {
    expect(pure.universePercentLabel(pure.universeDiscShare(6500))).toBe('1.7%');
    expect(pure.universePercentLabel(pure.universeDiscShare(30))).toBe('under 0.0001%');
    expect(pure.universePercentLabel(0.25)).toBe('25%');
    expect(pure.universePercentLabel(0.0005)).toBe('about 0.05%');
  });
});

describe('Danger chart (rendered)', () => {
  it('draws one bar per event, longer for farther reach, and the landmarks', () => {
    const html = render({});
    const svg = sliceBetween(html, 'data-range="magnetar"', '</svg>');
    const widths = ['magnetar', 'supernova', 'grb'].map((id) => parseFloat(new RegExp('data-range="' + id + '"><rect x="[^"]+" y="[^"]+" width="([^"]+)"').exec(svg)[1]));
    expect(widths[0]).toBeLessThan(widths[1]);
    expect(widths[1]).toBeLessThan(widths[2]);
    // log axis: 30 ly is log10(30) / log10(6500) of the GRB bar
    expect(widths[1] / widths[2]).toBeCloseTo(Math.log10(30) / Math.log10(6500), 2);
    ['proxima', 'ikpeg', 'center'].forEach((id) => expect(html.includes('data-landmark="' + id + '"'), id).toBe(true));
    expect(html.includes('about 1.7% of the disc')).toBe(true);
  });
});
