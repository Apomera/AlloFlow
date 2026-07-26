// Geometry World non-visual wayfinding.
//
// The compass strip and the minimap are the only way to tell where the characters
// are and which still owe you a question — and both are <canvas>, so a screen
// reader sees nothing. The student who most needs "who have I missed, and which
// way" is precisely the one who cannot see the pips. L now speaks it.
//
// The left/right convention is pinned hard here: telling a blind student "left"
// when the character is on their right is worse than saying nothing at all.
// bearingDeg is measured against the player's facing — 0 straight ahead, positive
// toward the player's RIGHT — and the runtime derives it from the same `right`
// vector the movement code uses for strafing, so "your right" is by construction
// the direction D walks you.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const PATHS = [
  'stem_lab/stem_tool_geometryworld.js',
  'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js',
];
const SOURCE = readFileSync(PATHS[0], 'utf8');

/** Extract the two pure wayfinding helpers without running the tool. */
function loadWayfinding() {
  const start = SOURCE.indexOf('  function describeBearing(deg) {');
  const end = SOURCE.indexOf('  function gwChatKey(');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(SOURCE.slice(start, end) + '\nreturn { describeBearing, summarizeNearbyNpcs };')();
}

const wf = loadWayfinding();

describe('describeBearing', () => {
  it('calls straight ahead by its name', () => {
    expect(wf.describeBearing(0)).toBe('straight ahead');
    expect(wf.describeBearing(20)).toBe('straight ahead');
    expect(wf.describeBearing(-20)).toBe('straight ahead');
  });

  it('never confuses left with right', () => {
    // Positive = the player's right. Getting this backwards would walk a blind
    // student away from the character they are looking for.
    expect(wf.describeBearing(45)).toContain('right');
    expect(wf.describeBearing(90)).toContain('right');
    expect(wf.describeBearing(135)).toContain('right');
    expect(wf.describeBearing(-45)).toContain('left');
    expect(wf.describeBearing(-90)).toContain('left');
    expect(wf.describeBearing(-135)).toContain('left');

    expect(wf.describeBearing(45)).not.toContain('left');
    expect(wf.describeBearing(-45)).not.toContain('right');
  });

  it('separates ahead-ish, beside, and behind-ish', () => {
    expect(wf.describeBearing(45)).toBe('ahead and to your right');
    expect(wf.describeBearing(90)).toBe('to your right');
    expect(wf.describeBearing(135)).toBe('behind you to the right');
    expect(wf.describeBearing(180)).toBe('behind you');
    expect(wf.describeBearing(-180)).toBe('behind you');
  });

  it('is stable for angles outside -180..180', () => {
    // atan2 output is in range, but a wrapped value must not flip the side.
    expect(wf.describeBearing(360)).toBe('straight ahead');
    expect(wf.describeBearing(405)).toBe(wf.describeBearing(45));
    expect(wf.describeBearing(-315)).toBe(wf.describeBearing(45));
    expect(wf.describeBearing(270)).toBe(wf.describeBearing(-90));
  });
});

describe('summarizeNearbyNpcs', () => {
  const npc = (name, distance, bearingDeg, extra) =>
    Object.assign({ name, distance, bearingDeg, hasQuestion: true, answered: false }, extra || {});

  it('leads with how many questions are left', () => {
    const out = wf.summarizeNearbyNpcs([
      npc('Ada', 4, 0),
      npc('Ben', 9, 90, { answered: true }),
      npc('Cy', 12, -90),
    ]);
    expect(out).toMatch(/^2 characters still have a question\./);
  });

  it('uses singular wording for exactly one', () => {
    const out = wf.summarizeNearbyNpcs([npc('Ada', 3, 0)]);
    expect(out).toMatch(/^1 character still has a question\./);
  });

  it('says so when the lesson is finished', () => {
    const out = wf.summarizeNearbyNpcs([
      npc('Ada', 3, 0, { answered: true }),
      npc('Ben', 5, 45, { answered: true }),
    ]);
    expect(out).toMatch(/^Every question here is answered\./);
  });

  it('orders by distance, nearest first', () => {
    const out = wf.summarizeNearbyNpcs([npc('Far', 30, 0), npc('Near', 2, 0), npc('Mid', 10, 0)]);
    expect(out.indexOf('Near')).toBeLessThan(out.indexOf('Mid'));
    expect(out.indexOf('Mid')).toBeLessThan(out.indexOf('Far'));
  });

  it('gives distance in whole steps, never zero', () => {
    const out = wf.summarizeNearbyNpcs([npc('Ada', 0.2, 0)]);
    expect(out).toContain('1 step ');
    expect(out).not.toContain('0 steps');
  });

  it('marks which characters are already done', () => {
    const out = wf.summarizeNearbyNpcs([npc('Ada', 3, 0, { answered: true }), npc('Ben', 5, 0)]);
    expect(out).toContain('Ada is 3 steps straight ahead, already answered');
    expect(out).toContain('Ben is 5 steps straight ahead, still has a question');
  });

  it('says nothing about questions for a character that has none', () => {
    const out = wf.summarizeNearbyNpcs([npc('Guide', 3, 0, { hasQuestion: false })]);
    expect(out).toContain('Guide is 3 steps straight ahead.');
    expect(out).not.toContain('still has a question');
  });

  it('caps the spoken list and counts the remainder', () => {
    const many = [1, 2, 3, 4, 5, 6].map((i) => npc('N' + i, i, 0));
    const out = wf.summarizeNearbyNpcs(many, 4);
    expect(out).toContain('N1');
    expect(out).toContain('N4');
    expect(out).not.toContain('N5 is');
    expect(out).toContain('And 2 further away.');
  });

  it('handles an empty world without throwing', () => {
    expect(wf.summarizeNearbyNpcs([])).toBe('There are no characters in this world.');
    expect(wf.summarizeNearbyNpcs(null)).toBe('There are no characters in this world.');
    expect(wf.summarizeNearbyNpcs([null, undefined])).toBe('There are no characters in this world.');
  });
});

describe('Geometry World wayfinding wiring', () => {
  PATHS.forEach((p) => {
    const src = readFileSync(p, 'utf8');

    it(`binds it to a key and announces through the live region — ${p}`, () => {
      expect(src).toMatch(/case 'KeyL':[\s\S]{0,140}announceNearbyNpcs\(\);/);
      expect(src).toContain('announceToSR(summarizeNearbyNpcs(entries, 4));');
    });

    it(`derives right from the SAME vector the movement code strafes with — ${p}`, () => {
      // Any second convention here is a chance to invert left/right.
      expect(src).toContain("var right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();");
      expect(src).toContain('ux * right.x + uz * right.z, ux * fwd.x + uz * fwd.z');
    });

    it(`hides the two decorative canvases from assistive tech — ${p}`, () => {
      // Unlabelled canvases are noise in the AT tree; their content is spoken now.
      expect((src.match(/'aria-hidden': 'true',\n\s+ref: function\(/g) || []).length).toBe(2);
    });

    it(`documents L for students and for screen readers — ${p}`, () => {
      expect(src).toContain("'L'), 'Say where characters are',");
      expect(src).toContain('L says where the characters are and who still has a question');
    });
  });
});
