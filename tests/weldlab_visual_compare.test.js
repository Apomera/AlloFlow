import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const pin = { V: 22, A: 180, TS: 12, P: 'mig', M: 'steel', TH: 0.25, run: [] };

beforeEach(() => {
  delete window.__alloflowWeldLab;
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

function render(state = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('weldLab', { weldLab: { view: 'beadLab', arc_pin: pin, ...state } });
  return host.querySelector('[data-arc-visual-compare]');
}

describe('Pinned and current visual inspection', () => {
  it('uses one scale for both specimens when thickness and travel change', () => {
    const view = render({ bl_TS: 6, bl_thickness: 0.375 });
    const svgs = [...view.querySelectorAll('svg')];
    expect(svgs).toHaveLength(2);
    expect(svgs[0].getAttribute('data-arc-compare-scale')).toBe(svgs[1].getAttribute('data-arc-compare-scale'));
    expect(svgs[0].getAttribute('aria-label')).toContain('Pinned bead');
    expect(svgs[1].getAttribute('aria-label')).toContain('Now bead');
    expect(view.textContent).toContain('Both specimens share one width and depth scale');
  });

  it('prints the same model dimensions as the numeric comparison', () => {
    const view = render({ bl_TS: 6 });
    const arc = window.__WeldLabCore.arc;
    const before = arc.beadReport(22, 180, 12, 'mig', 'steel', 0.25);
    const now = arc.beadReport(22, 180, 6, 'mig', 'steel', 0.25);
    const svgs = [...view.querySelectorAll('svg')];
    expect(svgs[0].textContent).toContain(`Width ${before.width.toFixed(3)} in`);
    expect(svgs[1].textContent).toContain(`Width ${now.width.toFixed(3)} in`);
    expect(svgs[1].textContent).toContain(`Penetration ${now.penetration.toFixed(3)} in`);
    expect(view.textContent).toContain(`+${(now.width - before.width).toFixed(3)} in`);
  });

  it('preserves the laid length and local width of an incomplete hands-on pass', () => {
    const speeds = [5, 20, 8, 12];
    const view = render({ arc_handsOn: true, arc_run: speeds });
    const current = view.querySelector('[data-arc-compare-specimen="current"] svg');
    const segments = [...current.querySelectorAll('rect')].filter(el => el.getAttribute('fill') === 'url(#arcCmpMetalCurrent)');
    expect(segments).toHaveLength(speeds.length);
    expect(new Set(segments.map(el => el.getAttribute('height'))).size).toBeGreaterThan(1);
    expect(current.getAttribute('aria-label')).toContain('4 of 32 segments laid');
  });

  it('keeps extreme legal settings finite and inside the surface preview', () => {
    const view = render({ bl_V: 40, bl_A: 350, bl_TS: 3, bl_thickness: 0.125 });
    expect(view.innerHTML).not.toMatch(/NaN|Infinity/);
    for (const svg of view.querySelectorAll('svg')) {
      const segments = [...svg.querySelectorAll('rect')].filter(el => /^url\(#arcCmpMetal/.test(el.getAttribute('fill') || ''));
      for (const segment of segments) {
        expect(Number(segment.getAttribute('height'))).toBeLessThanOrEqual(82.000001);
        expect(Number(segment.getAttribute('y'))).toBeGreaterThanOrEqual(38);
      }
    }
  });

  it('does not draw a specimen from an invalid saved pin', () => {
    expect(render({ arc_pin: { ...pin, V: 'invalid' } })).toBeNull();
  });
});
