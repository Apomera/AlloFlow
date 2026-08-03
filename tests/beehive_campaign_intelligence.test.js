import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_beehive.js'), 'utf8');

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); });

describe('Beehive campaign intelligence and coaching', () => {
  it('ships adaptive rival postures with scoutable telegraphs and counters', () => {
    expect(SOURCE).toContain('var QUEEN_RIVAL_DOCTRINES');
    expect(SOURCE).toContain("rivalPosture = 'recover'");
    expect(SOURCE).toContain("rivalPosture = 'assault'");
    expect(SOURCE).toContain("rivalPosture = 'contest'");
    expect(SOURCE).toContain("'data-rts-rival-doctrine': 'true'");
    expect(SOURCE).toContain('rival.intel = Math.max(0');
  });

  it('renders identified competitor doctrine, posture, telegraph, and counterplay', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'queen', queen: { active: true, paused: true, difficulty: 'standard', day: 3, rival: { name: 'Thistle Crown', health: 82, strength: 390, stores: 44, structures: 4, pressure: 40, intel: 61, doctrine: 'opportunist', posture: 'contest', lastMove: 'Scouts are contesting your outer forage lanes', telegraph: 'Map control will drift toward the rival', counter: 'Use Nasonov, scouts, or a raid to protect the forage boundary.' } } } });
    expect(html).toContain('data-rts-rival-doctrine="true"');
    expect(html).toContain('Territorial opportunist');
    expect(html).toContain('Current posture');
    expect(html).toContain('contest');
    expect(html).toContain('Map control will drift toward the rival');
    expect(html).toContain('Best counter');
  });

  it('carries command-map evidence into the Drone briefing', () => {
    const html = renderTool('beehive', { beehive: { viewMode: 'drone', queen: { result: 'victory', territory: 72, rival: { health: 0 } } } });
    expect(html).toContain('data-drone-command-evidence="command"');
    expect(html).toContain('Forage 72% - rival 0% health');
  });

  it('ships prioritized flight diagnoses, experiments, criteria, and colony consequences', () => {
    expect(SOURCE).toContain('function droneDebriefCoach(run)');
    expect(SOURCE).toContain("id: 'energy-budget'");
    expect(SOURCE).toContain("id: 'altitude-gate'");
    expect(SOURCE).toContain("id: 'separation'");
    expect(SOURCE).toContain("'data-drone-debrief-coach': droneDebrief.id");
    expect(SOURCE).toContain("'data-drone-colony-consequence': 'true'");
    expect(SOURCE).toContain('Apply plan & fly again');
  });
});
