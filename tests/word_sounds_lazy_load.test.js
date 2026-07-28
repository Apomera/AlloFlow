// LAZY-LOAD WIRING for the Word Sounds player.
//
// word_sounds_module.js is ~744KB — the largest CDN module in the app — and was
// loaded at boot for every user, including the majority who never open it. It is
// now registered as window.__alloLazyWordSounds and pulled in on demand.
//
// The failure mode this guards is severe and silent: if a code path can turn the
// player on WITHOUT triggering the loader, the render site falls through to its
// "Loading Word Sounds..." card forever and the student never gets an activity.
// That is the same shape as the 2026-07-12 live-session blocker.
//
// These are source-level pins rather than a live boot, because AlloFlowANTI.txt
// is the 41k-line host shell and is not mountable in jsdom. They assert the
// invariants that make the wiring safe.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let anti;

beforeAll(() => {
  anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
});

describe('Word Sounds is lazy-loaded, not booted eagerly', () => {
  it('is registered as a lazy loader, not a boot-time loadModule call', () => {
    expect(anti).toMatch(/window\.__alloLazyWordSounds = \(function\(\) \{ var L=false;/);
    // No bare boot-time load. The only loadModule('WordSoundsModal', ...) left
    // must be the one inside the lazy closure.
    const bareLoads = anti
      .split(/\r?\n/)
      .filter((l) => /loadModule\('WordSoundsModal'/.test(l))
      .filter((l) => !/__alloLazyWordSounds/.test(l));
    expect(bareLoads, `eager load(s) still present: ${bareLoads.join(' | ')}`).toEqual([]);
  });

  it('follows the same lazy shape as the other deferred heavy modules', () => {
    // Once-only guard: a second call must not append another <script>.
    const m = anti.match(/window\.__alloLazyWordSounds = \(function\(\) \{ var L=false; return function\(\) \{ if\(L\)return; L=true;/);
    expect(m, 'lazy loader must use the once-only L guard used by SymbolStudio/AlloHaven').not.toBeNull();
  });

  it('keeps the ?v= cache-buster so a deploy invalidates the module', () => {
    const line = anti.split(/\r?\n/).find((l) => /__alloLazyWordSounds/.test(l) && /loadModule/.test(l));
    expect(line).toBeTruthy();
    expect(line, 'build.js rewrites ?v= refs; losing it pins users to a stale module')
      .toMatch(/word_sounds_module\.js\?v=[a-f0-9]+/);
  });
});

describe('every path that renders the player also triggers the load', () => {
  it('the trigger watches isWordSoundsMode — the render site\'s necessary condition', () => {
    expect(anti).toMatch(/React\.useEffect\(\(\) => \{\s*if \(!isWordSoundsMode && activeView !== 'word-sounds' && activeView !== 'word-sounds-generator'\) return;\s*try \{ window\.__alloLazyWordSounds\?\.\(\); \} catch \(_\) \{\}\s*\}, \[isWordSoundsMode, activeView\]\);/);
  });

  it('the render site is still gated on isWordSoundsMode', () => {
    // If this guard ever changes so the modal can render without
    // isWordSoundsMode, the effect above stops covering every entry point.
    const render = anti.split(/\r?\n/).find((l) => /const WS = window\.AlloModules && window\.AlloModules\.WordSoundsModal/.test(l));
    expect(render, 'render site not found — re-check the lazy trigger').toBeTruthy();
    const idx = anti.indexOf(render);
    const gate = anti.slice(Math.max(0, idx - 400), idx);
    expect(gate, 'the modal must remain gated behind isWordSoundsMode').toMatch(/\{isWordSoundsMode &&/);
  });

  it('isWordSoundsMode has exactly one writer, so the effect cannot be bypassed', () => {
    const writers = anti
      .split(/\r?\n/)
      .filter((l) => /field: 'isWordSoundsMode'/.test(l));
    expect(writers.length, `expected 1 writer, found ${writers.length}`).toBe(1);
  });

  it('the render site still has a loading fallback with an escape', () => {
    // The load is async, so the modal can render one tick before the module
    // lands. Without this card (and its Close button) that tick is a blank
    // screen a child cannot get out of. Anchor on the Word Sounds card
    // specifically — several other modules have their own loading fallbacks.
    const idx = anti.indexOf("loading_module', { name: 'Word Sounds' }");
    expect(idx, 'Word Sounds loading fallback not found').toBeGreaterThan(0);
    const card = anti.slice(idx, idx + 600);
    expect(card, 'the loading card needs a Close escape').toMatch(/common\.close/);
    expect(card, 'Close must exit Word Sounds mode, not just hide the card')
      .toMatch(/setIsWordSoundsMode\(false\)/);
  });
});

describe('sibling Word Sounds surfaces are unaffected', () => {
  it('the player module registers only WordSoundsModal', () => {
    const mod = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    const registered = [...new Set(mod.match(/window\.AlloModules\.[A-Za-z]+ =/g) || [])];
    expect(registered, 'deferring this module must not defer any other component')
      .toEqual(['window.AlloModules.WordSoundsModal =']);
  });

  it('the generator, review panel and preview live in other modules', () => {
    const setup = readFileSync(resolve(process.cwd(), 'word_sounds_setup_module.js'), 'utf8');
    const misc = readFileSync(resolve(process.cwd(), 'misc_components_module.js'), 'utf8');
    const preview = readFileSync(resolve(process.cwd(), 'view_word_sounds_preview_module.js'), 'utf8');
    expect(setup).toMatch(/AlloModules\.WordSoundsGenerator/);
    expect(misc).toMatch(/AlloModules\.WordSoundsReviewPanel/);
    expect(preview).toMatch(/WordSoundsPreviewView/);
  });
});
