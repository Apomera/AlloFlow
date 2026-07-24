// Load-order regression for the Research Hub lane plugins.
//
// WHY: the hub and its lanes load concurrently from the CDN, so completion
// order is network-dependent. The lanes' "hub not ready yet — defer" branch
// used `setTimeout(arguments.callee || function(){}, 200)`, which THROWS in
// the strict-mode build the moment a lane evaluates before the hub (seen
// live 2026-07-12: ResearchLaneEngineering TypeError at line 9:26, module
// dead until the GitHub-raw fallback double-loaded it). Even where legal,
// the `|| function(){}` fallback made the retry a no-op.
//
// These tests pin the repaired behavior: evaluate-before-hub defers without
// throwing, registers once the hub appears, stamps the loader-visibility
// key (window.AlloModules.<Name>) the host's loadModule() checks, and gives
// up after a bounded number of retries instead of spinning forever.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
});

describe('research lane load-order race (hub not yet loaded)', () => {
  it('evaluating a lane BEFORE the hub defers without throwing and stamps __pending', () => {
    vi.useFakeTimers();
    expect(window.ResearchHub).toBeUndefined();
    expect(() => loadAlloModule('research_lane_scientific_module.js')).not.toThrow();
    expect(window.AlloModules.ResearchLaneScientific).toBeTruthy();
    expect(window.AlloModules.ResearchLaneScientific.__pending).toBe(true);
    expect(window.AlloModules.ResearchLaneScientific.__tier).toBeUndefined();
  });

  it('registers via the retry loop once the hub appears, and upgrades the stamp to __tier 2', () => {
    const registerLane = vi.fn((id, cfg) => { window.ResearchHub._lanes[id] = cfg; });
    window.ResearchHub = { registerLane, _lanes: {}, helpers: {} };
    vi.advanceTimersByTime(450); // a couple of 200ms retry ticks
    expect(registerLane).toHaveBeenCalledTimes(1);
    expect(registerLane.mock.calls[0][0]).toBe('scientific');
    expect(window.ResearchHub._lanes.scientific.__tier).toBe(2);
    expect(window.AlloModules.ResearchLaneScientific.__tier).toBe(2);
    expect(window.AlloModules.ResearchLaneScientific.lane).toBe('scientific');
  });

  it('gives up after the bounded retry budget instead of spinning forever', () => {
    delete window.ResearchHub;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadAlloModule('research_lane_engineering_module.js');
    expect(window.AlloModules.ResearchLaneEngineering.__pending).toBe(true);
    vi.advanceTimersByTime(50 * 200 + 1000); // exhaust the ~10s budget
    expect(vi.getTimerCount()).toBe(0); // no runaway retry timer left
    expect(errSpy.mock.calls.some((c) => String(c[0]).includes('never became available'))).toBe(true);
    errSpy.mockRestore();
    vi.useRealTimers();
  });
});
