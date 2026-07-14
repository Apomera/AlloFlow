// Regression guard for the beehive "no simulations render" bug.
//
// The main render's return statement was a COMMA-OPERATOR sequence:
//   return h('div',{space-y-4}, header, modeTabs, <all 3 canvases>, ...),
//          seasonalGoals, badges, habitatMeters, actionControls;
// The space-y-4 container closed early (line ~18905), so the four trailing
// blocks were comma operands, not children. JS comma operator returns only the
// LAST operand, so the entire space-y-4 tree — header, the Beekeeper/Queen/Drone
// mode tabs, and every simulation <canvas> — was built and thrown away. Users saw
// only the action controls + educational content; queen/drone modes rendered
// nothing at all. Fix: space-y-4 now wraps all five blocks (closes at the return ;).
//
// These assertions fail on the broken (controls-only) output and pass on the fix.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });
const render = (state) => renderTool('beehive', { beehive: state });

describe('beehive — main render wraps the whole simulator (comma-operator regression)', () => {
  it('beekeeper view renders the header, mode tabs, and the live simulation canvas', () => {
    const html = render({});
    // The space-y-4 container must be the root and actually contain the canvas —
    // not be discarded by a comma operator that returns only the controls.
    expect(html).toContain('space-y-4');
    expect(html).toContain('Beehive Colony Simulator');     // header (was discarded)
    expect(html).toContain('Simulation perspective');       // Beekeeper/Queen/Drone tabs (were discarded)
    expect(html).toContain('Animated beehive simulation');  // the <canvas> aria-label (was discarded)
    expect(html).toContain('<canvas');
  });

  it('queen view renders its UI (the whole tree was previously discarded → empty render)', () => {
    const html = render({ viewMode: 'queen' });
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('Queen Command');
  });

  it('drone view renders its UI', () => {
    const html = render({ viewMode: 'drone' });
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('Drone Nuptial Flight');
  });
});
