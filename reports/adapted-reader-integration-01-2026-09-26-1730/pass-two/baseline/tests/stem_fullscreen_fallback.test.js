import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// AlloFlow reaches a lot of learners inside a sandboxed embed (the Canvas surface),
// where the host's permissions policy refuses real fullscreen: requestFullscreen()
// rejects, or is missing outright. A tool that only calls the native API therefore has
// a fullscreen button that does nothing at all, with no message — which is exactly how
// this surfaced, twice, as a bug report about a specific tool rather than about the
// class. `stem_lab_module.js` carries the shared `window.__alloStemFS(el)` helper: it
// tries real fullscreen and falls back to a CSS fill-frame with Escape to leave.
//
// A tool that touches the native API must therefore do one of two things, and this
// pins which one each currently does. Adding a new tool that does neither fails here.
const STEM_DIR = resolve(process.cwd(), 'stem_lab');

// Tools that predate the shared helper and carry their own, more elaborate fallback.
// The value is the entry point that proves it — not a spelling of the whole approach.
const OWN_FALLBACK = {
  'stem_tool_physics.js': 'physFsMode',
  'stem_tool_particlelab3d.js': 'function enterCssFullscreen()',
  'stem_tool_fisherlab.js': 'useTheaterFallback',
  'stem_tool_brainatlas.js': '__brainAtlasFullscreenFallback',
  'stem_tool_galaxy.js': 'function galaxyFsEnterCss()',
};

const toolFiles = readdirSync(STEM_DIR).filter((f) => /^stem_tool_.*\.js$/.test(f));

describe('STEM fullscreen never dead-ends in a sandboxed embed', () => {
  const usesNative = toolFiles.filter((f) => {
    const src = readFileSync(resolve(STEM_DIR, f), 'utf8');
    // Skip files where the only mention is a comment about the API.
    return /(?:^|[^/*\s])\s*\w*\.?requestFullscreen|requestFullscreen\s*\|\|/.test(src)
      && /\.requestFullscreen|RequestFullscreen/.test(src.replace(/\/\/[^\n]*/g, ''));
  });

  it('finds the tools that touch the native fullscreen API', () => {
    // A sanity floor: if this drops to zero the detection above has broken and every
    // assertion below would pass vacuously.
    expect(usesNative.length).toBeGreaterThanOrEqual(8);
  });

  usesNative.forEach((file) => {
    it(file + ' routes through the shared helper or carries its own fallback', () => {
      const src = readFileSync(resolve(STEM_DIR, file), 'utf8');
      const marker = OWN_FALLBACK[file];
      const ok = src.includes('__alloStemFS') || (marker && src.includes(marker));
      expect(ok, file + ' calls requestFullscreen with no fallback path: route it through '
        + 'window.__alloStemFS(el), or add its own fallback and register it in OWN_FALLBACK').toBe(true);
    });
  });

  it('never blames the browser for a host policy', () => {
    // The embed refuses fullscreen; the browser supports it perfectly well. Telling a
    // learner their browser cannot do it sends them looking in the wrong place.
    toolFiles.forEach((file) => {
      const src = readFileSync(resolve(STEM_DIR, file), 'utf8');
      expect(src).not.toContain('Fullscreen is not available in this browser');
    });
  });

  it('keeps the shared helper itself intact', () => {
    const host = readFileSync(resolve(STEM_DIR, 'stem_lab_module.js'), 'utf8');
    expect(host).toContain('window.__alloStemFS = function(el)');
    // Falls back rather than giving up when the API is missing or refuses.
    expect(host).toContain("if (pr && pr.catch) pr.catch(function() { _stemFsEnter(el); });");
    expect(host).toContain("ev.key === 'Escape'");
    // The marker the tools read to show the right button label in fill-frame mode.
    expect(host).toContain("data-allo-fullscreen-active");
  });
});
