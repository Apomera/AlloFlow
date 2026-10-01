import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_circuit.js';
const component = (type, id, value = 0) => ({ type, id, value });
const state = (mode, components) => ({
  _circuit: { mode, voltage: 9, components }
});

describe('Circuit Lab meter topology and safety coach', () => {
  let originalMatchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {}
    });
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    resetStemLab();
    loadTool(FILE, 'circuit');
  });

  it('treats an ammeter in parallel as a short-circuit path', () => {
    const html = renderTool('circuit', state('parallel', [
      component('resistor', 1, 100),
      component('ammeter', 2)
    ]));

    expect(html).toContain('Unsafe placement: short-circuit path');
    expect(html).toContain('bypasses the load');
    expect(html).toContain('data-circuit-meter-coach="ammeter-short"');
    expect(html).toContain('SHORT CIRCUIT');
  });

  it('treats a voltmeter in series as a nearly open circuit', () => {
    const html = renderTool('circuit', state('series', [
      component('resistor', 1, 100),
      component('voltmeter', 2)
    ]));

    expect(html).toContain('Incorrect placement: circuit is nearly open');
    expect(html).toContain('nearly stops current');
    expect(html).toContain('data-circuit-meter-coach="voltmeter-open"');
    expect(html).toContain('0.000A');
  });

  it('recognizes an ammeter in series as correct', () => {
    const html = renderTool('circuit', state('series', [
      component('resistor', 1, 100),
      component('ammeter', 2)
    ]));

    expect(html).toContain('Measurement placement is correct');
    expect(html).toContain('data-circuit-meter-coach="correct"');
    expect(html).toContain('0.090A');
    expect(html).not.toContain('Unsafe placement');
  });

  it('recognizes a voltmeter in parallel as correct', () => {
    const html = renderTool('circuit', state('parallel', [
      component('resistor', 1, 100),
      component('voltmeter', 2)
    ]));

    expect(html).toContain('Measurement placement is correct');
    expect(html).toContain('drawing negligible current');
    expect(html).toContain('0.090A');
    expect(html).not.toContain('Incorrect placement');
  });
});
