import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const start = source.indexOf('function advanceCLHuntSchoolCenter(');
const end = source.indexOf('// Display-only propulsion feedback;', start);
if (start < 0 || end <= start) throw new Error('Could not locate production shoal movement helpers');
const helperSource = source.slice(start, end);
const { center, member } = new Function(helperSource + ';return {center:advanceCLHuntSchoolCenter,member:advanceCLHuntShoalFish};')();

function school(alarm = 0, heading = 0) { return { center: { x: 0, y: 4, z: 0 }, heading, alarm }; }
function fish(heading = 0, offset = { x: 0, y: 0, z: 0 }) {
  return { position: { x: 0, y: 4, z: 0 }, rotation: { x: 0, y: heading, z: 0 }, userData: { alive: true, offset, swimPhase: .7, distracted: false, tail: { rotation: { y: 0 } } } };
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function settle(s, frames = 500) {
  const members = Array.from({ length: 8 }, () => fish(s.heading));
  for (let tick = 0; tick < frames; tick++) members.forEach((f, index) => member(f, s, index, .05, false));
  return members;
}
function span(members, axis) { return Math.max(...members.map(f => f.position[axis])) - Math.min(...members.map(f => f.position[axis])); }
function snapshot(value) { return JSON.parse(JSON.stringify(value)); }
function nose(f) { const pitch = f.rotation.x, yaw = f.rotation.y; return { x: Math.sin(yaw) * Math.cos(pitch), y: -Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) }; }

describe('Cephalopod Hunter coherent shoal movement', () => {
  it('rotates the calm staggered formation with its heading instead of world axes', () => {
    const forward = settle(school()), turned = settle(school(0, Math.PI / 2));
    for (let index = 0; index < 8; index++) {
      expect(turned[index].position.x).toBeCloseTo(forward[index].position.z, 9);
      expect(turned[index].position.z).toBeCloseTo(-forward[index].position.x, 9);
      expect(turned[index].position.y).toBeCloseTo(forward[index].position.y, 9);
    }
    expect(span(forward, 'x')).toBeCloseTo(2.04, 5);
    expect(span(forward, 'z')).toBeCloseTo(.95, 5);
    expect(forward[0].position.z).toBeGreaterThan(forward[4].position.z);
  });

  it('keeps eight members alongside a traveling calm school and preserves lane order', () => {
    const s = school(), members = settle(s);
    for (let tick = 0; tick < 240; tick++) { center(s, false, .05); members.forEach((f, index) => member(f, s, index, .05, false)); }
    expect(s.center.z).toBeCloseTo(18, 10);
    for (let index = 0; index < 8; index++) {
      expect(Math.abs(members[index].position.x - (index % 4 - 1.5) * .68)).toBeLessThan(.08);
      const slotZ = s.center.z + (.5 - Math.floor(index / 4)) * .95;
      expect(Math.abs(members[index].position.z - slotZ)).toBeLessThan(.8);
    }
    expect(span(members, 'x')).toBeGreaterThan(1.9);
  });

  it('tightens when wary, opens a broad escape fan and regroups after alarm clears', () => {
    const calm = settle(school()), wary = settle(school(.3)), escaped = settle(school(1));
    expect(span(wary, 'x')).toBeLessThan(span(calm, 'x') * .9);
    expect(span(wary, 'x')).toBeGreaterThan(span(calm, 'x') * .75);
    expect(span(escaped, 'x')).toBeGreaterThan(span(calm, 'x') * 1.8);
    expect(span(escaped, 'z')).toBeGreaterThan(span(calm, 'z') * 1.5);
    const s = school(0);
    for (let tick = 0; tick < 500; tick++) escaped.forEach((f, index) => member(f, s, index, .05, false));
    for (let index = 0; index < 8; index++) expect(distance(escaped[index].position, calm[index].position)).toBeLessThan(.001);
  });

  it('has no formation jump at the existing wary-to-fleeing alarm threshold', () => {
    const below = settle(school(.3 - .000001)), above = settle(school(.3 + .000001));
    for (let index = 0; index < 8; index++) expect(distance(below[index].position, above[index].position)).toBeLessThan(.00002);
  });

  it('keeps calm, display and full-alarm center and member travel within their per-second budgets', () => {
    for (const [alarm, distracted, centerSpeed, memberSpeed] of [[0, false, 1.5, 2.6], [1, false, 3.5, 4.6], [1, true, .35, .8]]) {
      const s = school(alarm), before = { ...s.center }; center(s, distracted, .05);
      expect(distance(s.center, before)).toBeCloseTo(centerSpeed * .05, 12);
      s.center.z = 100;
      const f = fish(); f.userData.distracted = distracted;
      const p = { ...f.position }; member(f, s, 0, .05, false);
      expect(distance(f.position, p)).toBeLessThanOrEqual(memberSpeed * .05 + 1e-12);
      expect(distance(f.position, p)).toBeGreaterThan(memberSpeed * .05 * .95);
    }
  });

  it('reflects both components at a corner and moves back into the map on the next tick', () => {
    const s = school(1, Math.PI / 4); s.center.x = 59.99; s.center.z = 59.99;
    center(s, false, .05);
    expect(s.center.x).toBe(60); expect(s.center.z).toBe(60);
    expect(Math.sin(s.heading)).toBeLessThan(0); expect(Math.cos(s.heading)).toBeLessThan(0);
    center(s, false, .05);
    expect(s.center.x).toBeLessThan(60); expect(s.center.z).toBeLessThan(60);
    const south = school(0, -3 * Math.PI / 4); south.center.x = -59.99; south.center.z = -59.99;
    center(south, false, .05);
    expect(south.center.x).toBe(-60); expect(south.center.z).toBe(-60);
    expect(Math.sin(south.heading)).toBeGreaterThan(0); expect(Math.cos(south.heading)).toBeGreaterThan(0);
  });

  it('turns before propulsion, aligns its nose with actual three-dimensional travel and slows a sharp turn', () => {
    const s = school(); s.center.x = 20; s.center.y = 10;
    const f = fish(), before = { ...f.position };
    member(f, s, 0, .05, false);
    const movement = { x: f.position.x - before.x, y: f.position.y - before.y, z: f.position.z - before.z }, travel = Math.hypot(movement.x, movement.y, movement.z), forward = nose(f);
    expect(travel).toBeGreaterThan(0);
    expect(travel).toBeLessThan(2.6 * .05 * .6);
    expect((movement.x * forward.x + movement.y * forward.y + movement.z * forward.z) / travel).toBeGreaterThan(1 - 1e-10);
    expect(f.rotation.x).toBeLessThan(0); expect(f.position.y).toBeGreaterThan(before.y);
    expect(Math.abs(f.rotation.y)).toBeLessThanOrEqual(3 * .05 + 1e-12);
    for (let tick = 0; tick < 240; tick++) member(f, s, 0, .05, false);
    expect(distance(f.position, { x: 18.98, y: 10, z: .475 })).toBeLessThan(.05);
  });

  it('uses the short yaw turn across the heading seam and remains finite at a settled target', () => {
    const s = school(); s.center = { x: -.01, y: 4, z: -20 };
    const f = fish(Math.PI - .01), beforeYaw = f.rotation.y;
    member(f, s, 0, .05, false);
    expect(Math.abs(f.rotation.y - beforeYaw)).toBeLessThan(.05);
    const still = settle(school())[0]; const stationary = school();
    for (let tick = 0; tick < 20; tick++) member(still, stationary, 0, .05, false);
    for (const value of Object.values(still.position).concat(Object.values(still.rotation))) expect(Number.isFinite(value)).toBe(true);
  });

  it('makes invalid or zero steps and captured members complete no-ops, and caps long frames', () => {
    for (const dt of [0, -1, NaN, Infinity, -Infinity, undefined]) {
      const s = school(1), f = fish(), priorSchool = snapshot(s), priorFish = snapshot(f);
      center(s, false, dt); member(f, s, 0, dt, false);
      expect(s).toEqual(priorSchool); expect(f).toEqual(priorFish);
    }
    const dead = fish(); dead.userData.alive = false;
    dead.userData.offset = new Proxy({}, { get() { throw new Error('Captured fish data was read'); } });
    expect(() => member(dead, school(1), 0, .05, false)).not.toThrow();
    const short = school(1), long = school(1), fShort = fish(), fLong = fish();
    center(short, false, .05); center(long, false, 5); member(fShort, short, 0, .05, false); member(fLong, long, 0, 5, false);
    expect(long).toEqual(short); expect(fLong).toEqual(fShort);
  });

  it('preserves swimming positions and heading under reduced motion while suppressing bank and tail', () => {
    const s = school(.8); s.center.x = 15; s.center.y = 6;
    const normal = fish(), reduced = fish(), reducedPhase = reduced.userData.swimPhase;
    for (let tick = 0; tick < 30; tick++) { member(normal, s, 2, .05, false); member(reduced, s, 2, .05, true); }
    expect(reduced.position).toEqual(normal.position);
    expect(reduced.rotation.x).toBe(normal.rotation.x); expect(reduced.rotation.y).toBe(normal.rotation.y);
    expect(reduced.rotation.z).toBe(0); expect(reduced.userData.tail.rotation.y).toBe(0);
    expect(reduced.userData.swimPhase).toBe(reducedPhase);
    expect(normal.userData.swimPhase).not.toBe(reducedPhase); expect(normal.userData.tail.rotation.y).not.toBe(0);
    expect(Math.abs(normal.rotation.z)).toBeLessThanOrEqual(.16);
  });

  it('uses allocation-free scalar stepping without random draws or hidden-player knowledge', () => {
    expect(helperSource.replace(/\/\/[^\n]*/g, "")).not.toMatch(/\bnew\s|\.clone\(|\.map\(|\.filter\(|Math\.random|player|lastThreatPosition/);
    const s = school(.7), f = fish();
    s.player = new Proxy({}, { get() { throw new Error('Hidden player was read'); } });
    s.lastThreatPosition = new Proxy({}, { get() { throw new Error('Threat coordinates belong to the visibility helper'); } });
    f.position.clone = () => { throw new Error('Allocated a position vector'); };
    f.userData.offset.clone = () => { throw new Error('Allocated an offset vector'); };
    const keys = Object.keys(f.userData), schoolKeys = Object.keys(s), rng = Math.random;
    Math.random = () => { throw new Error('Movement consumed spawn/wander RNG'); };
    try { for (let tick = 0; tick < 20; tick++) { center(s, false, .05); member(f, s, 3, .05, false); } }
    finally { Math.random = rng; }
    expect(Object.keys(f.userData)).toEqual(keys); expect(Object.keys(s)).toEqual(schoolKeys);
  });
});
