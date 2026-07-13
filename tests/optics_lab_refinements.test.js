import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function state(overrides = {}) {
  return {
    opticsLab: {
      mode: 'home',
      showOpticsLibrary: false,
      quizMastery: {},
      quizCompletedCount: 0,
      ...overrides,
    },
  };
}

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_optics.js', 'opticsLab');
});

describe('Optics Lab refinements', () => {
  it('uses a roving tab stop in the main navigation', () => {
    const html = renderTool('opticsLab', state());

    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/role="tab" aria-selected="true" tabindex="0"/);
    expect(html).toMatch(/role="tab" aria-selected="false" tabindex="-1"/);
    expect(html).toContain('data-op-tab-value="home"');
  });

  it('supports arrow, Home, and End keys across every tab system', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');

    expect(source).toContain('function opTabKeyDown(e, activate)');
    expect(source).toContain("key !== 'ArrowLeft' && key !== 'ArrowRight'");
    expect(source).toContain("key === 'Home' ? 0 : key === 'End' ? tabs.length - 1");
    expect(source.match(/onKeyDown: function\(e\) \{ opTabKeyDown/g)).toHaveLength(3);
  });

  it('provides minimum targets and forced-colors affordances', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');

    expect(source).toContain('min-block-size:24px;min-inline-size:24px');
    expect(source).toContain('@media(forced-colors:active)');
    expect(source).toContain('outline:3px solid Highlight!important');
    expect(source).not.toContain('outline: none');
    expect(source.match(/h\('th', \{ scope: 'col'/g)).toHaveLength(7);
    expect(source).toContain("'aria-label': 'Photon wavelength'" );
    expect(source).toContain('Lens ray tracer showing object and image formation.');
    expect(source).toContain('Comparison of coherent and incoherent light waves.');
  });
  it('tracks simulation milestones from effects instead of render timers', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');

    expect(source).toContain('Award simulation milestones from effects, never from render paths.');
    expect(source).toContain("}, [d.refrN1, d.refrN2, d.refrTheta1, d.tirTriggered]);");
    expect(source).toContain("}, [d.mode, d.lensType, d.lensFocal, d.lensDo, d.realImageFormed, d.virtualImageFormed]);");
    expect(source).not.toContain('Quest auto-tracking on the calc render');
    expect(source).not.toContain('Set later via upd to avoid re-render storm');
  });
  it('runs visualizer clocks through cancellable lifecycle effects', () => {
    const source = readFileSync('stem_lab/stem_tool_optics.js', 'utf8');

    expect(source).toContain("}, [d.phenoAfterPhase, d.phenoAfterStartedAt, d.phenoAfterTick]);");
    expect(source).toContain("}, [d.phenoQuantumPlaying, d.phenoQuantumRate, d.phenoQuantumDots, d.phenoQuantumCount]);");
    expect(source.match(/return function\(\) \{ clearTimeout\(timer\); \};/g).length).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain('Schedule a per-second re-render so the countdown updates');
    expect(source).not.toContain('Auto-fire scheduling (mirrors after-image timer pattern)');
  });
});
