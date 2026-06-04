// Symbol Studio golden master.
//
// A characterization baseline for SymbolStudio (symbol_studio_module.js), the
// hand-maintained ~7,700-line AAC god-component slated for decomposition. These
// snapshots pin its render output so the internals can be refactored with a
// safety net: a diff here means a behavior change, intended or not. Re-baseline
// deliberately with `vitest -u` ONLY when a change is reviewed and expected.
//
// The render is exercised under each host theme (default / dark / high-contrast),
// which also pins the theme-mirror added on 2026-05-31. See
// tests/helpers/symbol_studio_harness.js for the headless render contract.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupSymbolStudio, renderStudio } from './helpers/symbol_studio_harness.js';

const _origRandom = Math.random;
const _origNow = Date.now;

beforeAll(() => { setupSymbolStudio(); });
afterAll(() => {
  // restore the primitives the harness froze (hygiene for any later suite)
  Math.random = _origRandom;
  Date.now = _origNow;
});

describe('Symbol Studio — registration', () => {
  it('the module registers SymbolStudio on window.AlloModules', () => {
    const api = setupSymbolStudio();
    expect(api.SymbolStudio).toBeTruthy(); // React.memo(...) is an object, not a function
  });
});

describe('Symbol Studio — render under each host theme (snapshot)', () => {
  it('default (light) theme renders identically', () => {
    expect(renderStudio({ theme: 'default' })).toMatchSnapshot();
  });
  it('dark theme renders identically', () => {
    expect(renderStudio({ theme: 'dark' })).toMatchSnapshot();
  });
  it('high-contrast theme renders identically', () => {
    expect(renderStudio({ theme: 'contrast' })).toMatchSnapshot();
  });
  it('Canvas / FERPA environment renders identically', () => {
    expect(renderStudio({ props: { isCanvasEnv: true } })).toMatchSnapshot();
  });
});

// The 8 non-default tabs (the 'symbols' tab is already pinned by the theme snapshots above).
// Characterizing each one closes the gap where 8 of the 9 tabs were never snapshot-tested — the
// safety net the deferred decomposition of this 7,993-line component needs before it can be split.
const NON_DEFAULT_TABS = ['board', 'schedule', 'stories', 'quickboards', 'books', 'quest', 'search', 'garden'];

describe('Symbol Studio — per-tab renders (snapshot)', () => {
  NON_DEFAULT_TABS.forEach((tab) => {
    it(`tab "${tab}" renders identically`, () => {
      expect(renderStudio({ tab })).toMatchSnapshot();
    });
  });
});

describe('Symbol Studio — per-tab seam guards', () => {
  it('the initialTab seam is backward-compatible (absent => the symbols tab, byte-identical to the default render)', () => {
    expect(renderStudio({})).toBe(renderStudio({ theme: 'default' }));
  });
  it('seeding a tab actually renders that tab (non-empty + distinct from the default symbols tab)', () => {
    const def = renderStudio({});
    NON_DEFAULT_TABS.forEach((tab) => {
      const r = renderStudio({ tab });
      expect(r.length).toBeGreaterThan(200); // a real render, not a crash/empty
      expect(r).not.toBe(def);               // the seam changed which tab is active
    });
  });
});

describe('Symbol Studio — determinism + theme-mirror guards', () => {
  it('default theme renders byte-identically on repeat (a golden master is only trustworthy if stable)', () => {
    expect(renderStudio({ theme: 'default' })).toBe(renderStudio({ theme: 'default' }));
  });
  it('dark differs from default (the theme-mirror actually changes the render)', () => {
    expect(renderStudio({ theme: 'dark' })).not.toBe(renderStudio({ theme: 'default' }));
  });
  it('high-contrast render carries the ss-theme-contrast class on the modal root', () => {
    expect(renderStudio({ theme: 'contrast' })).toContain('ss-theme-contrast');
  });
});
