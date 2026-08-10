import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { mountStartedDrone } from './helpers/beehive_drone_runtime_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

let config;
let runtime;

beforeEach(() => {
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

afterEach(() => {
  runtime?.cleanup();
});

describe('Beehive Drone flight attitude cue', () => {
  it('renders pitch and bank values alongside the visual horizon model', async () => {
    runtime = await mountStartedDrone(config, { paused: true });
    const html = runtime.host.innerHTML;

    expect(html).toContain('data-flight-attitude-cue="true"');
    expect(html).toContain('Flight attitude');
    expect(html).toContain('data-flight-attitude-value="pitch"');
    expect(html).toContain('data-flight-attitude-value="bank"');
    expect(html).toContain('data-flight-attitude-summary="true"');
    expect(html).toContain('Horizon model');
  });

  it('uses the shared pitch and roll state and keeps the readout labelled', () => {
    expect(source).toContain('function droneAttitudeReadout(state)');
    expect(source).toContain("var pitchDeg = Math.round((Number(state.pitch) || 0) * 180 / Math.PI)");
    expect(source).toContain("var bankDeg = Math.round((Number(state.roll) || 0) * 180 / Math.PI)");
    expect(source).toContain("attitudeSummary.textContent = attitude.summary + ' / ' + attitude.correction");
    expect(source).toContain("'aria-labelledby': 'beehive-flight-attitude-title'");
    expect(source).toContain("'aria-describedby': 'beehive-flight-attitude-summary'");
  });
});
