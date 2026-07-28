// ONE definition of "time spent" (2026-07-27).
//
// Three places measure it: the host's engagedMinutes heartbeat, a directions
// `time` goal, and a STEM Lab `timeSpent` quest. They did NOT agree. STEM used
// wall clock — Date.now() minus mount, banked on unmount — so an abandoned open
// tab satisfied "spend 5 minutes" in STEM Lab while failing the identical phrase
// on a directions goal. These tests keep the definitions welded together.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const anti = read('AlloFlowANTI.txt');
const stem = read('stem_lab/stem_lab_module.js');

// ── eval-slice STEM's real engagement helper ───────────────────────────────────
const sliceStart = stem.indexOf('var _STEM_ENGAGEMENT_TIMEOUT_MS');
const sliceEnd = stem.indexOf('// ── AlloStemTheme JS helper');
if (sliceStart < 0 || sliceEnd < 0 || sliceEnd <= sliceStart) throw new Error('stem engagement slice anchors missed');
const stemSlice = stem.slice(sliceStart, sliceEnd);

function makeStemEngaged({ hidden = false, hostProbe = undefined } = {}) {
  const listeners = [];
  const fakeWindow = {
    addEventListener: (evt, fn) => listeners.push([evt, fn]),
    __alloEngagement: hostProbe,
  };
  const fakeDocument = { hidden };
  const fn = new Function('window', 'document', stemSlice + `
    return {
      isEngaged: _stemIsEngaged,
      touch: function () { _stemLastInteractionAt = Date.now(); },
      stale: function () { _stemLastInteractionAt = Date.now() - 10 * 60000; },
      timeout: _STEM_ENGAGEMENT_TIMEOUT_MS
    };`);
  return { ...fn(fakeWindow, fakeDocument), listeners };
}

describe('the two engines share one timeout constant', () => {
  it('_ALLO_ENGAGEMENT_TIMEOUT_MS and _STEM_ENGAGEMENT_TIMEOUT_MS are equal', () => {
    const hostMatch = anti.match(/const _ALLO_ENGAGEMENT_TIMEOUT_MS = (\d+);/);
    const stemMatch = stem.match(/var _STEM_ENGAGEMENT_TIMEOUT_MS = (\d+);/);
    expect(hostMatch, 'host constant missing').toBeTruthy();
    expect(stemMatch, 'stem constant missing').toBeTruthy();
    expect(Number(stemMatch[1])).toBe(Number(hostMatch[1]));
  });
  it('the host heartbeat uses the hoisted constant, not its own literal', () => {
    expect(anti).toContain('const ENGAGEMENT_TIMEOUT_MS = _ALLO_ENGAGEMENT_TIMEOUT_MS;');
  });
});

describe('STEM timeSpent no longer credits an abandoned tab', () => {
  it('the wall-clock accrual is gone', () => {
    // The exact shape of the old bug: elapsed since mount, banked on unmount.
    expect(stem).not.toContain('var elapsed = Date.now() - openTs;');
    expect(stem).not.toContain('qp.timeAccumMs = (qp.timeAccumMs || 0) + elapsed;');
  });
  it('accrual ticks and is gated on engagement', () => {
    expect(stem).toContain('if (!_stemIsEngaged()) return; // idle or hidden — not time spent');
    expect(stem).toContain('qp.timeAccumMs = (qp.timeAccumMs || 0) + TICK_MS;');
  });
  it('the live readout no longer claims to be "timing" while the clock is stalled', () => {
    expect(stem).not.toContain("'timing...'");
    expect(stem).toContain("'counting active time'");
  });
});

describe('STEM engagement helper behavior', () => {
  it('prefers the host probe when one is published', () => {
    const alwaysFalse = makeStemEngaged({ hostProbe: { isEngaged: () => false } });
    expect(alwaysFalse.isEngaged()).toBe(false);
    const alwaysTrue = makeStemEngaged({ hostProbe: { isEngaged: () => true } });
    expect(alwaysTrue.isEngaged()).toBe(true);
  });
  it('a throwing host probe falls back instead of breaking the quest clock', () => {
    const boom = makeStemEngaged({ hostProbe: { isEngaged: () => { throw new Error('nope'); } } });
    expect(boom.isEngaged()).toBe(true); // fresh interaction timestamp, tab visible
  });
  it('standalone (no host): hidden tab is never engaged', () => {
    expect(makeStemEngaged({ hidden: true }).isEngaged()).toBe(false);
  });
  it('standalone: idle past the timeout is not engaged, fresh interaction is', () => {
    const api = makeStemEngaged();
    expect(api.isEngaged()).toBe(true);
    api.stale();
    expect(api.isEngaged()).toBe(false);
    api.touch();
    expect(api.isEngaged()).toBe(true);
  });
  it('registers its own passive listeners so raw tools still measure correctly', () => {
    const api = makeStemEngaged();
    expect(api.listeners.map(l => l[0]).sort()).toEqual(['click', 'keydown', 'mousemove', 'scroll']);
  });
});

describe('the host publishes and retracts the probe', () => {
  it('publishes window.__alloEngagement alongside the interaction tracker', () => {
    expect(anti).toContain('window.__alloEngagement = {');
    expect(anti).toContain('timeoutMs: _ALLO_ENGAGEMENT_TIMEOUT_MS,');
  });
  it('the probe reports false for a hidden tab, matching the heartbeat gate', () => {
    expect(anti).toMatch(/isEngaged: \(\) => \{\s*if \(typeof document !== 'undefined' && document\.hidden\) return false;/);
  });
  it('cleanup retracts it so a stale probe cannot outlive the app', () => {
    expect(anti).toContain('try { delete window.__alloEngagement; } catch (_) { window.__alloEngagement = null; }');
  });
});
