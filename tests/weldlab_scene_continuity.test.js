import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';

beforeEach(() => {
  delete window.__alloflowWeldLab;
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

const arc = () => window.__WeldLabCore.arc;

describe('Bead Lab view continuity', () => {
  it('keeps a partial hand-laid pass at its actual length in both immersive views', () => {
    const live = { useRun: true, TS: 12, segs: Array(8).fill({ width: 0.3 }) };
    [0, 1, 5, 17, 600].forEach((elapsed) => {
      [false, true].forEach((reduced) => {
        expect(arc().sceneFrame(live, elapsed, reduced)).toEqual({
          recorded: true, progress: 0.25, arcOn: false
        });
      });
    });
    expect(arc().sceneFrame({ useRun: true, segs: [] }, 4, false).progress).toBe(0);
    expect(arc().sceneFrame({ useRun: true, segs: Array(32).fill({}) }, 4, false).progress).toBe(1);
  });

  it('preserves automatic preview travel and the reduced-motion end position', () => {
    expect(arc().sceneFrame({ TS: 12 }, 3, false)).toEqual({
      recorded: false, progress: 0.5, arcOn: true
    });
    expect(arc().sceneFrame({ TS: 24 }, 3, false).progress).toBe(0);
    expect(arc().sceneFrame({ TS: 12 }, 3, true).progress).toBe(0.95);
  });

  it('uses the hand-laid pass report for the same score and dimensions in every view', () => {
    const run = Array.from({ length: 32 }, (_, i) => i < 16 ? 6 : 24);
    const report = arc().beadReport(22, 180, 12, 'mig', 'steel', 0.25, run);
    const html = ['topdown', '3d', 'helmet'].map((view) => renderTool('weldLab', {
      weldLab: { view: 'beadLab', bl_view: view, arc_handsOn: true, arc_run: run, arc_runHand: true }
    }));
    html.forEach((page) => {
      expect(page).toContain('data-arc-verdict="' + report.verdict + '"');
      expect(page).toContain(report.width.toFixed(3));
      expect(page).toContain(report.penetration.toFixed(3));
      expect(page).toContain(report.overall + '%');
      const unif = page.slice(page.indexOf('data-arc-row="unif"'));
      expect(unif).toContain(Math.round(report.scores.unif) + '%');
    });
  });

  it('samples the actual slow and fast segments for an inspection section', () => {
    const report = arc().beadReport(22, 180, 12, 'mig', 'steel', 0.25, [6, 6, 24, 24]);
    const slow = arc().segField(report.segs, 0.25, 'width');
    const fast = arc().segField(report.segs, 0.75, 'width');
    expect(slow).toBeGreaterThan(fast);
    expect(arc().segField(report.segs, 0.25, 'penetration'))
      .toBeGreaterThan(arc().segField(report.segs, 0.75, 'penetration'));
  });
});
