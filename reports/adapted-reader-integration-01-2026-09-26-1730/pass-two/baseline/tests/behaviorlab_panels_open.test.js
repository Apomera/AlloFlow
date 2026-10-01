import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

// Eleven surfaces in this tool are collapsed by default. A render-phase throw
// inside any of them is invisible to every smoke run that renders the tool in
// its default state — the same class that shipped stem_tool_numberline's
// `d.magHunt` ReferenceError, which only executed once a user clicked the tab.
//
// Each panel is opened here on its own AND all together, because a crash can
// also come from two panels interacting through shared state rather than from
// either one alone.
const PANELS = [
  'blShowBeyond',
  'blShowBipPlanner',
  'blShowCondCompare',
  'blShowEthics',
  'blShowGlossary',
  'blShowHints',
  'blShowInquiry',
  'blShowMeasurement',
  'blShowQuickRef',
  'blShowSleuth',
  'blShowTimeline',
];

// The panels live in the running/complete shell, not the intro screen.
const PHASES = ['running', 'complete'];

describe('Behavior Lab collapsible panels render when opened', () => {
  for (const panel of PANELS) {
    for (const phase of PHASES) {
      it(`${panel} renders in the ${phase} phase`, () => {
        loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
        const html = renderTool('behaviorLab', {
          blLevel: 1, blPhase: phase, [panel]: true,
        });
        // A throw fails the call outright; this guards the degraded case where
        // the tool catches its own error and renders a stub.
        expect(html.length, `${panel}/${phase} rendered almost nothing`)
          .toBeGreaterThan(2000);
      });
    }
  }

  it('renders with every panel open at once', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    const all = { blLevel: 1, blPhase: 'running' };
    for (const p of PANELS) all[p] = true;
    const html = renderTool('behaviorLab', all);

    expect(html.length).toBeGreaterThan(2000);
    // Content from panels that read different data sources, so an exception
    // swallowed mid-tree would drop one of these.
    expect(html).toContain('Momentary Time Sampling');
    expect(html).toContain('Least Restrictive');
  });

  it('renders every level with the data-bearing panels open', () => {
    loadTool('stem_lab/stem_tool_behaviorlab.js', 'behaviorLab');
    // Level-dependent branches (chaining at 7, DRO at 8, Pavlov at 9) are the
    // ones most likely to read a key the other levels never set.
    for (let level = 1; level <= 9; level++) {
      const html = renderTool('behaviorLab', {
        blLevel: level, blPhase: 'running',
        blShowSleuth: true, blShowInquiry: true, blShowMeasurement: true,
        blShowCondCompare: true, blShowBipPlanner: true,
      });
      expect(html.length, `level ${level} rendered almost nothing`)
        .toBeGreaterThan(2000);
    }
  });
});
