import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderClimate(state = {}) {
  return renderTool('climateExplorer', { climateExplorer: state });
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_climateExplorer.js', 'climateExplorer');
});

describe('Climate Explorer keyboard accessibility', () => {
  it('wires the active tab to a stable tab panel with roving focus', () => {
    const html = renderClimate({ tab: 'keeling' });

    expect(html).toContain('role="tablist"');
    expect(html).toContain('id="ce-tab-keeling"');
    expect(html).toContain('aria-controls="ce-panel"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('id="ce-panel"');
    expect(html).toContain('aria-labelledby="ce-tab-keeling"');
  });

  it('requires Alt for shortcuts and supports standard tab-list keys', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_climateExplorer.js', 'utf8');

    expect(source).toContain('if (!e.altKey || e.ctrlKey || e.metaKey) return;');
    expect(source).toContain("key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End'");
    expect(source).toContain("'aria-keyshortcuts': 'Alt+1 Alt+2 Alt+3 Alt+4 Alt+5 Alt+6 Alt+Q'");
    expect(source).not.toContain("outline: 'none'");
  });
});

describe('Climate Explorer reduced motion', () => {
  it('draws one hero frame without scheduling an animation loop', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_climateExplorer.js', 'utf8');

    expect(source).toContain('heroDraw();');
    // `heroRM` was a value CAPTURED once in the ref callback, which runs a
    // single time per canvas. It is now `heroReduced()`, read live per frame,
    // because the captured version broke both ways: turning the preference on
    // mid-session kept the loop rescheduling, and turning it off left the hero
    // frozen for ever, since the loop had already stopped rescheduling itself.
    // The contract this test asserts is unchanged — one frame, no loop — and
    // the behaviour is covered end to end in
    // tests/climate_explorer_hero_motion_live.test.js.
    expect(source).toContain('if (!heroReduced() && !cv._cePaused) requestAnimationFrame(heroDraw);');
    expect(source, 'the captured flag must not come back').not.toContain('heroRM');
    expect(source).not.toContain('requestAnimationFrame(heroDraw);\n                requestAnimationFrame(heroDraw);');
  });
});
