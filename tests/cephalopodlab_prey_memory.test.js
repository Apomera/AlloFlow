import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const start = source.indexOf('function advanceCLHuntSchoolThreat(');
const end = source.indexOf('function clHuntPropulsionText(', start);
if (start < 0 || end <= start) throw new Error('Could not locate the production school threat helpers');
const { step, text } = new Function(source.slice(start, end) + ';return {step:advanceCLHuntSchoolThreat,text:clHuntPreyIntentText};')();

function school(overrides = {}) {
  return { center: { x: 0, z: 4 }, heading: 0, alarm: 0, ...overrides };
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

describe('Cephalopod Hunter prey threat memory', () => {
  it('keeps the existing alarm rates, threshold and cap while reporting early detection', () => {
    const s = school();
    step(s, { x: -3, z: 0 }, true, false, 0.05);
    expect(s.alarm).toBeCloseTo(0.09, 12);
    expect(s.intent).toBe('wary');
    expect(s.heading).toBe(0);
    for (let i = 0; i < 3; i++) step(s, { x: -3, z: 0 }, true, false, 0.05);
    expect(s.alarm).toBeCloseTo(0.36, 12);
    expect(s.intent).toBe('fleeing');
    expect(s.heading).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) step(s, { x: -3, z: 0 }, true, false, 0.05);
    expect(s.alarm).toBe(1);
    step(s, null, false, false, 0.05);
    expect(s.alarm).toBeCloseTo(0.975, 12);
  });

  it('copies the last visible position and never reads a hidden player position', () => {
    const s = school({ alarm: 0.7 }), player = { x: -3, z: 0 };
    step(s, player, true, false, 0.05);
    player.x = 40;player.z = 60;
    const hidden = new Proxy({}, { get() { throw new Error('Hidden player position was read'); } });
    expect(() => step(s, hidden, false, false, 0.05)).not.toThrow();
    expect(s.lastThreatPosition).toEqual({ x: -3, z: 0 });
    expect(s.intent).toBe('settling');
  });

  it('steers identically after different unseen movements, then responds to a visible reacquisition', () => {
    const initial = school({ alarm: 0.8 });
    step(initial, { x: 0, z: 0 }, true, false, 0.05);
    const left = clone(initial), right = clone(initial);
    for (let i = 0; i < 10; i++) {
      step(left, { x: -20, z: -10 }, false, false, 0.05);
      step(right, { x: 20, z: 10 }, false, false, 0.05);
    }
    expect(left).toEqual(right);
    step(left, { x: -3, z: 0 }, true, false, 0.05);
    step(right, { x: 3, z: 0 }, true, false, 0.05);
    expect(left.heading).toBeGreaterThan(0);
    expect(right.heading).toBeLessThan(0);
    expect(left.lastThreatPosition).toEqual({ x: -3, z: 0 });
    expect(right.lastThreatPosition).toEqual({ x: 3, z: 0 });
  });

  it('forgets a threat when calm and clears it immediately during the existing display interruption', () => {
    const s = school({ alarm: 1, lastThreatPosition: { x: 1, z: 1 } });
    for (let i = 0; i < 41; i++) step(s, null, false, false, 0.05);
    expect(s.alarm).toBe(0);
    expect(s.lastThreatPosition).toBeNull();
    expect(s.intent).toBe('unaware');
    step(s, { x: 2, z: 0 }, true, false, 0.05);
    step(s, null, false, true, 0.05);
    expect(s.alarm).toBe(0);
    expect(s.lastThreatPosition).toBeNull();
    expect(s.intent).toBe('unaware');
  });

  it('takes the short turn across the heading seam and remains finite at coincident positions', () => {
    const s = school({ center: { x: 0.001, z: -4 }, heading: -Math.PI + 0.01, alarm: 0.8 });
    const before = s.heading;
    step(s, { x: 0, z: 0 }, true, false, 0.05);
    expect(Math.abs(s.heading - before)).toBeLessThan(0.01);
    s.center = { x: 0, z: 0 };
    for (let i = 0; i < 30; i++) step(s, { x: 0, z: 0 }, true, false, 0.05);
    expect(Number.isFinite(s.heading)).toBe(true);
    expect(Number.isFinite(s.alarm)).toBe(true);
  });

  it('reports actionable intent without changing crab, distracted or existing fleeing wording', () => {
    expect(text({ userData: { intent: 'wary', alert: false } })).toBe('prey is wary · use cover');
    expect(text({ userData: { intent: 'settling', alert: true } })).toBe('prey is settling · stay out of sight');
    expect(text({ userData: { intent: 'fleeing', alert: true } })).toBe('prey is fleeing');
    expect(text({ userData: { intent: 'distracted', alert: false } })).toBe('prey distracted by display');
    expect(text({ userData: { intent: 'unaware', alert: false } })).toBe('prey is unaware');
  });
});
