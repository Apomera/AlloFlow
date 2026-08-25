// AlloBot accessory integrity guard.
//
// The bot's accessories are a hand-maintained pipeline: SVG art in
// allobot_source.jsx is compiled to allobot_module.js (+ a public mirror),
// while the activeView -> accessory mapping lives in AlloFlowANTI.txt
// (getBotAccessoryInternal). Several invariants make the system work and are
// easy to break silently in a future edit:
//   1. every accessory the mapping can return has a render block in BOTH
//      source and the compiled module (no orphan mapping / missing art);
//   2. source and the compiled module agree on the set of accessories
//      (no source->module compile drift);
//   3. the root module and the prismflow public mirror are byte-identical;
//   4. the reduce-motion gating the accessibility work depends on is intact:
//      idle motion uses animate-allobot-* CSS (caught by the
//      [class*="animate-"] kill rule), SMIL is gated by svg.pauseAnimations(),
//      and the JS blink timer self-gates on disableAnimations.
//
// A failure here means one of those guarantees regressed — fix the cause,
// don't just delete the assertion.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const SRC = read('allobot_source.jsx');
const MOD = read('allobot_module.js');
const PUB = read('desktop/web-app/public/allobot_module.js');
const ANTI = read('AlloFlowANTI.txt');

// Accessory keys the bot can actually display: everything getBotAccessoryInternal
// can return, plus the two override poses (sleep-cap when sleeping, grad-cap for
// interactive flashcards — both already covered by the mapping scan / explicit add).
function mappingKeys() {
  const start = ANTI.indexOf('getBotAccessoryInternal');
  expect(start, 'getBotAccessoryInternal not found in AlloFlowANTI.txt').toBeGreaterThan(-1);
  const end = ANTI.indexOf('\n  };', start);
  expect(end, 'getBotAccessoryInternal end not found in AlloFlowANTI.txt').toBeGreaterThan(start);
  const body = ANTI.slice(start, end);
  const keys = new Set(['sleep-cap']); // isSleeping override pose
  for (const m of body.matchAll(/return '([a-z][a-z-]+)'/g)) keys.add(m[1]);
  return keys;
}

const KEYS = mappingKeys();
const srcKey = (k) => SRC.includes(`effectiveAccessory === '${k}'`);
const modKey = (k) => MOD.includes(`effectiveAccessory === "${k}"`) || MOD.includes(`effectiveAccessory === '${k}'`);

function accessoryBlock(source, key) {
  const quotedKeys = [`effectiveAccessory === '${key}'`, `effectiveAccessory === "${key}"`];
  const start = Math.max(...quotedKeys.map((token) => source.indexOf(token)));
  expect(start, `accessory block ${key} not found`).toBeGreaterThan(-1);
  const nextSingle = source.indexOf("effectiveAccessory === '", start + 1);
  const nextDouble = source.indexOf('effectiveAccessory === "', start + 1);
  const candidates = [nextSingle, nextDouble].filter((index) => index > start);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

describe('AlloBot accessory integrity', () => {
  it('mapping returns a sensible, non-trivial set of accessory keys', () => {
    expect(KEYS.size).toBeGreaterThanOrEqual(15);
    for (const k of KEYS) expect(k).toMatch(/^[a-z][a-z-]+$/);
  });

  it('every mapped accessory has a render block in source AND the compiled module', () => {
    for (const k of KEYS) {
      expect(srcKey(k), `source missing render block for "${k}"`).toBe(true);
      expect(modKey(k), `compiled module missing render block for "${k}"`).toBe(true);
    }
  });

  it('source and module agree on the accessory set (no compile drift)', () => {
    // Quote-agnostic: the compiler may emit single (Babel) or double (esbuild) quotes.
    const re = /effectiveAccessory === ['"]([a-z][a-z-]+)['"]/g;
    const fromSrc = new Set([...SRC.matchAll(re)].map((m) => m[1]));
    const fromMod = new Set([...MOD.matchAll(re)].map((m) => m[1]));
    expect([...fromSrc].sort()).toEqual([...fromMod].sort());
  });

  it('root module and public mirror are byte-identical', () => {
    expect(MOD).toBe(PUB);
  });

  it('scopes SVG paint servers and internal groups to each bot instance', () => {
    // SVG url(#...) references are document-global. Static IDs make a second
    // AlloBot reuse the first instance's mood/theme gradients, which is most
    // visible in galleries and embedded comparison views.
    for (const source of [SRC, MOD]) {
      expect(source).toContain('React.useId()');
      expect(source).toContain('svgPaintPrefix');
      expect(source).toContain('svgPaintIds');
      for (const key of ['body', 'rim', 'hologram', 'beam', 'visor', 'groundShadow', 'heldItem', 'accessories']) {
        expect(source, `missing scoped SVG id for ${key}`).toMatch(new RegExp(`${key}:\\s*`));
      }
      expect(source).not.toMatch(/url\(#(?:bodyGradient-|rimLightGradient|hologram-gradient|hologram-beam|visorReflect)/);
      expect(source).not.toMatch(/id=["'](?:held-item|accessories)["']/);
      expect(source).toContain('data-allobot-held-item');
      expect(source).toContain('data-allobot-accessories');
    }
  });

  it('keeps a theme-aware silhouette and layered contact shadow at avatar size', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toContain('avatarDepthFilter');
      expect(source).toContain('data-allobot-depth');
      expect(source).not.toContain('relative drop-shadow-2xl');
      expect(source).toContain('data-allobot-ground-shadow');
      expect(source).toMatch(/data-allobot-shadow-layer["']?\s*(?:=|:)\s*["']ambient["']/);
      expect(source).toMatch(/data-allobot-shadow-layer["']?\s*(?:=|:)\s*["']contact["']/);
      expect(source).toContain('svgPaintIds.groundShadow');
      expect(source).toContain('feGaussianBlur');
      expect(source).toMatch(/trailFilter\s*=\s*isFlightActive[\s\S]{0,220}?avatarDepthFilter/);
    }
  });

  it('reduce-motion gating is intact (idle CSS, SMIL pause, blink self-gate)', () => {
    // CSS idle classes are named so the reduce-motion kill rule catches them
    for (const cls of ['animate-allobot-float', 'animate-allobot-perk', 'animate-allobot-tick', 'animate-allobot-sway']) {
      expect(MOD.includes(cls), `missing class ${cls}`).toBe(true);
    }
    expect(/\[class\*="animate-"\][^}]*animation:\s*none/.test(MOD), 'reduce-motion kill rule missing').toBe(true);
    // SMIL (held items + microscope/historian/thinking-cap) gated via pauseAnimations
    expect(MOD.includes('pauseAnimations'), 'SMIL pause gate missing').toBe(true);
    // JS blink timer self-gates on the motion toggle (via disableAnimations or a
    // motionDisabled abstraction over it + prefers-reduced-motion).
    expect(/isSleeping \|\| (motionDisabled|disableAnimations)/.test(MOD), 'blink reduce-motion gate missing').toBe(true);
  });

  it('bot + chat lift above the STEM Lab overlay (inline zIndex 10020)', () => {
    // The lab modal's inline zIndex:10020 overrides its z-[9999] class and buries
    // the bot (z-10000) and UDL chat (z-100). Both must lift while the lab is open:
    // bot to 10500, chat to 10490 (preserving bot-above-chat ordering).
    expect(MOD.includes('showStemLab ? 10500'), 'bot z-lift missing').toBe(true);
    const CHAT = read('view_misc_modals_module.js');
    expect(CHAT.includes('showStemLab ? 10490'), 'chat z-lift missing').toBe(true);
  });

  it('STEM discipline accessories + mapping are present', () => {
    for (const k of ['math-tools', 'gear', 'game-pad']) {
      expect(MOD.includes(`effectiveAccessory === "${k}"`) || MOD.includes(`effectiveAccessory === '${k}'`), `missing STEM accessory block ${k}`).toBe(true);
    }
    expect(MOD.includes('STEM_DISCIPLINE_ACCESSORY') && MOD.includes('alloStemAccessory'), 'STEM discipline mapping missing').toBe(true);
    // reads the tool's registered discipline at runtime (new tools auto-inherit)
    expect(MOD.includes('STEM_TOOL_REGISTRY'), 'STEM registry lookup missing').toBe(true);
  });

  it('mood-reactive + signature animation hooks are present', () => {
    for (const tok of ['allobot-thinking', 'allobot-pop', 'allobotWorking', 'allobotTick', 'allobotSway']) {
      expect(MOD.includes(tok), `missing animation hook ${tok}`).toBe(true);
    }
  });

  it('keeps non-wearable props beside the bot and gives Concept Sort an original head accent', () => {
    for (const source of [SRC, MOD]) {
      const conceptSort = accessoryBlock(source, 'sorting-cubes');
      expect(conceptSort).toContain('data-accessory-placement');
      expect(conceptSort).toContain('head-and-side');
      expect(conceptSort).toContain('Sort-of-a-Hat');
      expect(conceptSort).toContain('slide-in-from-left-3');

      for (const key of ['sticky-notes', 'gear']) {
        const block = accessoryBlock(source, key);
        expect(block, `${key} should use the side anchor`).toContain('side-left');
        expect(block, `${key} should enter from the side`).toContain('slide-in-from-left-3');
      }
    }
  });

  it('covers accessibility, planning, and guidance views with meaningful accessories', () => {
    const expectedMappings = {
      'word-sounds': 'phoneme-headset',
      'word-sounds-generator': 'phoneme-headset',
      'ui-tool-wordsounds': 'phoneme-headset',
      'udl-advice': 'choice-fan',
      'alignment-report': 'alignment-target',
      directions: 'wayfinder-sign',
      faq: 'question-cards',
      history: 'historian',
    };
    for (const [view, accessory] of Object.entries(expectedMappings)) {
      const mappingPattern = new RegExp(`case '${view}':[\\s\\S]{0,120}?return '${accessory}';`);
      expect(ANTI, `${view} should map to ${accessory}`).toMatch(mappingPattern);
    }

    const placements = {
      'phoneme-headset': 'head-and-ears',
      'choice-fan': 'side-left',
      'alignment-target': 'side-left',
      'wayfinder-sign': 'side-left',
      'question-cards': 'side-left',
    };
    for (const source of [SRC, MOD]) {
      for (const [key, placement] of Object.entries(placements)) {
        const block = accessoryBlock(source, key);
        expect(block, `${key} should declare its visual anchor`).toContain(placement);
      }
    }
  });

  it('covers hub, dashboard, source, output, and fluency contexts without stale memo state', () => {
    const expectedMappings = {
      dashboard: 'progress-orbit',
      input: 'source-inbox',
      output: 'resource-folder',
      'math-fluency-maze': 'maze-scroll',
    };
    for (const [view, accessory] of Object.entries(expectedMappings)) {
      const mappingPattern = new RegExp(`case '${view}':[\\s\\S]{0,120}?return '${accessory}';`);
      expect(ANTI, `${view} should map to ${accessory}`).toMatch(mappingPattern);
    }
    expect(ANTI).toContain("if (isTestPrepHubOpen) return 'test-prep-kit';");
    expect(ANTI).toContain("activeView === 'output' && generatedContent?.type === 'word-sounds'");
    expect(ANTI).toContain('[activeView, isInteractiveFlashcards, isReadingLibraryOpen, isTestPrepHubOpen, generatedContent?.type]');

    for (const source of [SRC, MOD]) {
      for (const key of ['test-prep-kit', 'source-inbox', 'progress-orbit', 'maze-scroll', 'resource-folder']) {
        expect(accessoryBlock(source, key), `${key} should use the side anchor`).toContain('side-left');
      }
    }
    expect(SRC).toContain("case 'math-fluency-maze': return 'calculator';");
  });

  it('keeps pure side props inside the viewport and declares every movable anchor', () => {
    const mapStart = SRC.indexOf('const ALLOBOT_SIDE_ACCESSORY_SIDE');
    const mapEnd = SRC.indexOf('});', mapStart);
    expect(mapStart, 'responsive side-accessory map missing').toBeGreaterThan(-1);
    expect(mapEnd, 'responsive side-accessory map end missing').toBeGreaterThan(mapStart);
    const entries = [...SRC.slice(mapStart, mapEnd).matchAll(/(?:'([a-z][a-z-]+)'|\b([a-z][a-z-]+)):\s*'(left|right)'/g)]
      .map((match) => [match[1] || match[2], match[3]]);
    expect(entries.length).toBeGreaterThanOrEqual(20);

    for (const source of [SRC, MOD]) {
      expect(source).toContain('ALLOBOT_PROP_SAFE_GUTTER');
      expect(source).toContain('accessoryShiftX');
      expect(source).toContain('data-accessory-side');
      expect(source).toMatch(/addEventListener\(['"]resize['"],\s*syncViewportWidth\)/);
      for (const [key, side] of entries) {
        expect(accessoryBlock(source, key), `${key} should declare its preferred ${side} anchor`)
          .toContain(`side-${side}`);
      }
    }
  });

  it('normalizes every movable prop at avatar size with theme-aware depth', () => {
    const sideMapStart = SRC.indexOf('const ALLOBOT_SIDE_ACCESSORY_SIDE');
    const sideMapEnd = SRC.indexOf('});', sideMapStart);
    const sideKeys = [...SRC.slice(sideMapStart, sideMapEnd).matchAll(/(?:'([a-z][a-z-]+)'|\b([a-z][a-z-]+)):\s*'(?:left|right)'/g)]
      .map((match) => match[1] || match[2]);
    const scaleMapStart = SRC.indexOf('const ALLOBOT_SIDE_ACCESSORY_SCALE');
    const scaleMapEnd = SRC.indexOf('});', scaleMapStart);
    expect(scaleMapStart, 'side-accessory scale map missing').toBeGreaterThan(-1);
    expect(scaleMapEnd, 'side-accessory scale map end missing').toBeGreaterThan(scaleMapStart);
    const scaleEntries = [...SRC.slice(scaleMapStart, scaleMapEnd).matchAll(/(?:'([a-z][a-z-]+)'|\b([a-z][a-z-]+)):\s*(1(?:\.\d+)?)/g)]
      .map((match) => [match[1] || match[2], Number(match[3])]);
    expect(scaleEntries.map(([key]) => key).sort()).toEqual([...sideKeys].sort());
    for (const [key, scale] of scaleEntries) {
      expect(scale, `${key} should stay within the calibrated side-prop scale range`).toBeGreaterThanOrEqual(1);
      expect(scale, `${key} should stay within the calibrated side-prop scale range`).toBeLessThanOrEqual(1.1);
    }

    for (const source of [SRC, MOD]) {
      expect(source).toContain('data-accessory-scale');
      expect(source).toContain('accessoryDepthFilter');
      expect(source).toContain('ALLOBOT_SIDE_ACCESSORY_GAP_NUDGE');
      expect(source).toContain('accessoryTranslateX');
      expect(source).toMatch(/transformBox:\s*["']fill-box["']/);
      expect(source).toMatch(/transformOrigin:\s*accessoryRenderSide\s*===\s*["']left["']\s*\?\s*["']right center["']\s*:\s*["']left center["']/);
      expect(source).toMatch(/theme\s*===\s*["']contrast["']/);
      expect(source).toMatch(/theme\s*===\s*["']dark["']/);
    }
  });

  it('keeps high-contrast expressions visible against the black visor', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toMatch(/eye:\s*["']#FFFFFF["']/);
      expect(source).toMatch(/mouth:\s*["']#FACC15["']/);
      expect(source).toContain('data-allobot-visor');
      expect(source).toContain('data-allobot-shell');
      expect(source).toContain('data-allobot-antenna-outline');
      expect(source).toContain('data-allobot-antenna-light');
      expect(source).toContain('data-allobot-hand');
      expect(source).toMatch(/theme\s*===\s*["']contrast["']\s*\?\s*colors\.screenBg/);
      expect(source).toMatch(/theme\s*===\s*["']contrast["']\s*\?\s*colors\.glow/);
      expect(source).toMatch(/strokeWidth(?:=\{|:)\s*theme\s*===\s*["']contrast["']\s*\?\s*["']2\.5["']/);
    }
  });

  it('uses a prop-aware gaze, reaching hand, and opposite held-tool silhouette', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toContain('propGazeX');
      expect(source).toContain('data-allobot-prop-gaze');
      expect(source).toContain('leftHandX');
      expect(source).toContain('rightHandX');
      expect(source).toContain('data-held-item-side');
      expect(source).toContain('heldItemRenderSide');
      expect(source).toContain('scale(-1 1)');
    }
  });

  it('anchors the face while pupils track props and shares accessory color with the shell', () => {
    expect(SRC).not.toContain('translate(${eyePosition.x + propGazeX}px');
    for (const source of [SRC, MOD]) {
      expect(source).toContain('resolvedGazeX');
      expect(source).toContain('resolvedGazeY');
      expect(source).toContain('data-allobot-prop-gaze');
      expect(source).toContain('ALLOBOT_SIDE_ACCESSORY_ACCENT');
      expect(source).toContain('data-allobot-accessory-reflection');
      expect(source).toContain('animate-allobot-accessory-arrive-left');
      expect(source).toContain('animate-allobot-accessory-arrive-right');
    }
  });

  it('gives the newest learning props one quiet, reduced-motion-safe visual verb each', () => {
    const signatures = [
      'animate-allobot-stopwatch-hand',
      'animate-allobot-inbox-drop',
      'animate-allobot-progress-pulse',
      'animate-allobot-maze-flag',
      'animate-allobot-folder-page',
    ];
    for (const source of [SRC, MOD]) {
      for (const signature of signatures) {
        expect(source.match(new RegExp(signature, 'g'))?.length, `${signature} should have CSS and artwork hooks`)
          .toBeGreaterThanOrEqual(2);
      }
    }
  });
});
