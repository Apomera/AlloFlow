import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

describe('Bee tool scientific-integrity guardrails', () => {
  it('attributes alarm and Nasonov pheromones to workers while preserving stable action IDs', () => {
    expect(source).toContain("id: 'alarm_signal'");
    expect(source).toContain("id: 'nasonov_call'");
    expect(source).toContain('Worker Alarm Response');
    expect(source).toContain('Worker Nasonov Relay');
    expect(source).toContain('Threatened workers release alarm pheromone');
    expect(source).toContain('Scenting workers expose Nasonov glands and fan');
    expect(source).not.toContain('Release alarm pheromone — mobilize guards against threat');
    expect(source).not.toContain('Release Nasonov — call foragers home, mark safe areas');
  });

  it('frames the strategy mode as a distributed colony model', () => {
    expect(source).toContain('Colony Network: Distributed Strategy Model');
    expect(source).toContain('DECENTRALIZED COLONY MODEL');
    expect(source).toContain('Colony systems brief');
    expect(source).toContain('Modeled chemical signals that influence worker responses; effects are simplified');
    expect(source).toContain('the queen does not command workers');
    expect(source).toContain('QMP comes from the queen, while workers produce alarm and Nasonov signals');
    expect(source).not.toContain('Queen RTS');
    expect(source).not.toContain('RTS strategy brief');
    expect(source).not.toContain('Live RTS strategy status');
    expect(source).not.toContain('Instant signals that redirect worker behavior');
  });

  it('carries colony condition into launch energy without changing DCA, time, or predators', () => {
    expect(source).toContain('energyScale: 0.86');
    expect(source).toContain('energyScale: 0.94');
    expect(source).toContain('DCA geometry unchanged');
    expect(source).toContain('Scenario hazards unchanged');
    expect(source).not.toContain('queenCarryover.distanceScale');
    expect(source).not.toContain('queenCarryover.timerBonus');
    expect(source).not.toContain('queenCarryover.extraBirds');
    expect(source).not.toContain('Victory route');
    expect(source).not.toContain('Recovery route');
  });

  it('keeps drone route markers observational rather than turning flowers into fuel', () => {
    expect(source).toContain('Route markers do not restore energy');
    expect(source).toContain('energy unchanged');
    expect(source).toContain('var nectarLoadRatio = 0');
    expect(source).toContain('sacs[sacIndex].visible = false');
    expect(source).not.toContain('ds.energy = Math.min(maxDroneEnergy, ds.energy + 7');
    expect(source).not.toContain('ds.energy = Math.min(ds.energy + 0.3 * dt');
    expect(source).not.toContain('NECTAR BOOST');
  });
});
