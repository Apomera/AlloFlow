// A RATE COLLECTED ACROSS AN INTERRUPTION IS NOT THE SAME NUMBER.
//
// The probe clock is wall-clock: elapsed time, and therefore the
// items-per-minute a teacher may tier a child on, keeps running while the tab
// is in the background. Minimising mid-probe was already blocked, but a tab
// switch, a notification or a fire drill was not, and nothing about the result
// said it had happened.
//
// The time is REPORTED, not subtracted. Quietly removing it would change what
// the measure is, and that is the teacher's decision to make, not one to bury
// in a timer.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MODULE = read('word_sounds_module.js');

/** The real accounting helpers, executed rather than pattern-matched. */
function loadClock() {
  const start = MODULE.indexOf('const probeHiddenMsRef = React.useRef(0);');
  const end = MODULE.indexOf('const PROBE_INTERRUPTION_MS');
  expect(start, 'hidden-time refs not found').toBeGreaterThan(0);
  const body = MODULE.slice(start, end)
    // Drop the React effect; only the accounting is under test here.
    .replace(/React\.useEffect\([\s\S]*?\}, \[isProbeMode\]\);/, '');
  const harness = `
    const React = { useRef: (v) => ({ current: v }) };
    ${body}
    return { probeHiddenMsRef, probeHiddenSinceRef, probeHiddenMs };`;
  // eslint-disable-next-line no-new-func
  return new Function(harness)();
}

describe('hidden time is accounted for honestly', () => {
  it('reports nothing when the probe was never backgrounded', () => {
    const { probeHiddenMs } = loadClock();
    expect(probeHiddenMs()).toBe(0);
  });

  it('counts a finished interruption', () => {
    const c = loadClock();
    c.probeHiddenMsRef.current = 4500;
    expect(c.probeHiddenMs()).toBe(4500);
  });

  it('counts an interruption still in progress', () => {
    // A probe finished from the background would otherwise report none of it.
    const c = loadClock();
    c.probeHiddenSinceRef.current = Date.now() - 3000;
    expect(c.probeHiddenMs()).toBeGreaterThanOrEqual(3000);
  });

  it('adds a finished interruption to one in progress', () => {
    const c = loadClock();
    c.probeHiddenMsRef.current = 2000;
    c.probeHiddenSinceRef.current = Date.now() - 1000;
    expect(c.probeHiddenMs()).toBeGreaterThanOrEqual(3000);
  });
});

describe('the threshold is set where it means something', () => {
  it('two seconds, so a glance at a notification is not called an interruption', () => {
    expect(MODULE).toMatch(/const PROBE_INTERRUPTION_MS = 2000;/);
  });
});

describe('every completion path carries it', () => {
  it('all three probe payloads report hidden time and the flag', () => {
    const payload = MODULE.slice(MODULE.indexOf('const buildProbePayload'), MODULE.indexOf('const emitProbeComplete'));
    expect(payload).toContain('const hiddenMs = Math.round(probeHiddenMs())');
    expect(payload).toContain('hiddenMs,');
    expect(payload).toContain('interrupted: hiddenMs >= PROBE_INTERRUPTION_MS');
    expect((MODULE.match(/emitProbeComplete\(/g) || []).length).toBe(3);
    expect((MODULE.match(/onProbeComplete\(/g) || []).length).toBe(1);
  });

  it('the tally resets wherever the clock starts', () => {
    // Otherwise the second probe of a session inherits the first one's
    // interruption and is wrongly flagged.
    const marker = 'probeStartTimeRef.current = Date.now();';
    let index = MODULE.indexOf(marker);
    let starts = 0;
    while (index >= 0) {
      starts += 1;
      expect(MODULE.slice(index, index + 220)).toContain('probeHiddenMsRef.current = 0;');
      index = MODULE.indexOf(marker, index + marker.length);
    }
    expect(starts).toBeGreaterThan(0);
    const reset = MODULE.slice(MODULE.indexOf('const resetRuntimeSession'), MODULE.indexOf('const runtimeIdentityKey'));
    expect(reset).toContain('probeHiddenMsRef.current = 0;');
    expect(reset).toContain('probeHiddenSinceRef.current = null;');
  });

  it('the elapsed time is NOT quietly reduced', () => {
    // The whole point: report the interruption, do not silently redefine the
    // measure by subtracting it.
    expect(MODULE).not.toMatch(/probeStartTimeRef\.current \+ probeHidden/);
    expect(MODULE).not.toMatch(/- probeHiddenMs\(\)/);
  });
});

describe('the teacher is told on the screen that shows the rate', () => {
  it('a note appears above the threshold', () => {
    const idx = MODULE.indexOf('word_sounds.probe_interrupted');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx - 900, idx)).toMatch(/probeHiddenMs\(\) >= PROBE_INTERRUPTION_MS/);
  });

  it('and it says which way the number is wrong', () => {
    // "Understates" is the direction: the clock ran, the child did not.
    expect(MODULE).toMatch(/understates how fast this child was working/);
  });

  it('the mirror carries it', () => {
    expect(read('desktop/web-app/public/word_sounds_module.js')).toBe(MODULE);
  });
});
