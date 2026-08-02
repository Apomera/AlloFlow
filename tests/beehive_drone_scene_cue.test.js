import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
});

describe('Beehive Drone live 3D scene cue', () => {
  it('renders a phase/detail pair inside the 3D objective chip', () => {
    const html = renderTool('beehive', { beehive: {
      viewMode: 'drone',
      drone: { active: true, paused: true, difficulty: 'easy' }
    } });

    expect(html).toContain('data-beehive-stage-chip="drone"');
    expect(html).toContain('data-flight-scene-phase="true"');
    expect(html).toContain('data-flight-scene-detail="true"');
    expect(html).toContain('Flight objective');
    expect(html).toContain('data-flight-live-status="true"');
  });

  it('keeps visual phase language and the quiet accessible status synchronized from telemetry', () => {
    expect(source).toContain('function droneSceneCueDetail(state)');
    expect(source).toContain("scenePhaseNode.textContent = scenePhaseLabel");
    expect(source).toContain("sceneDetailNode.textContent = sceneCueDetail");
    expect(source).toContain("state._lastFlightLiveStatusKey !== liveStatusKey");
    expect(source).toContain("'. Scene cue ' + scenePhaseLabel + '. ' + sceneCueDetail");
    expect(source).toContain('Inside DCA - follow the queen signal');
  });
});
