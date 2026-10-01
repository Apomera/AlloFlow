// Circuit Builder analysis-panel smoke. The default circuit state is EMPTY (no
// components → no current), so the crash gate and any default-state render only
// exercise the "Add components below" placeholder. The 2026-07-01 enhancement
// added three panels that appear ONLY once current flows: the energy budget
// (P = ΣI²R), the drift-vs-field paradox (with a live-computed drift velocity),
// and the log-scale current ladder. This pins that a built series/parallel
// circuit renders them without throwing and without NaN leaking into the SVG.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_circuit.js';

function circuit(state) {
  return { _circuit: Object.assign({ mode: 'series', voltage: 9 }, state) };
}
const R = (value, id) => ({ type: 'resistor', value: value, id: id });

describe('circuit builder analysis-panel smoke', () => {
  let origMatchMedia;
  beforeAll(() => {
    // Force reduced-motion so the render does NOT schedule the setTimeout animation
    // tick (which would leave a dangling timer calling setToolData after the test).
    origMatchMedia = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  });
  afterAll(() => { window.matchMedia = origMatchMedia; });
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'circuit'); });

  it('empty circuit renders the placeholder without throwing', () => {
    const html = renderTool('circuit', circuit({ components: [] }));
    expect(html).toContain('Add components below');
    expect(html).not.toContain('NaN');
  });

  it('series circuit renders all three analysis panels', () => {
    const html = renderTool('circuit', circuit({ mode: 'series', components: [R(100, 1), R(220, 2)] }));
    expect(html).toContain('Energy budget');
    expect(html).toContain('The paradox');
    expect(html).toContain('How big is');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });

  it('parallel circuit renders the panels and a valid power split', () => {
    const html = renderTool('circuit', circuit({ mode: 'parallel', components: [R(100, 1), R(50, 2), R(200, 3)] }));
    expect(html).toContain('Energy budget');
    expect(html).toContain('How big is');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefinedW');
  });

  it('drift velocity + current-ladder survive extreme values (24V, tiny R)', () => {
    // High current stresses the log-scale ladder + drift-time formatting.
    const html = renderTool('circuit', circuit({ mode: 'series', voltage: 24, components: [R(2, 1)] }));
    expect(html).toContain('How big is');
    expect(html).not.toContain('NaN');
  });
});
