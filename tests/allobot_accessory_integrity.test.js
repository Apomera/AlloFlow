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

  it('connects the hands to the shell and gives the jetpack material layers', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toContain('hardwareVisual');
      expect(source).toContain('leftArmPath');
      expect(source).toContain('rightArmPath');
      expect(source).toContain('data-allobot-arm');
      expect(source).toContain('data-allobot-arm-layer');
      expect(source).toContain('data-allobot-arms');
      expect(source).toContain('data-allobot-hand-layer');
      expect(source).toContain('data-allobot-jetpack-layer');
      expect(source).toContain('data-allobot-hardware-theme');
      expect(source).toContain('data-allobot-shell-layer');
    }
    expect(SRC.match(/data-allobot-arm="(?:left|right)"/g)).toHaveLength(2);
    expect(SRC.match(/data-allobot-hand-layer="palm"/g)).toHaveLength(2);
    for (const layer of ['harness', 'reactor', 'tank-left', 'tank-right', 'tank-seams', 'pod-highlights', 'nozzle-left', 'nozzle-right']) {
      expect(SRC).toContain(`data-allobot-jetpack-layer="${layer}"`);
    }
    for (const layer of ['body', 'rim', 'lower-contour']) {
      expect(SRC).toContain(`data-allobot-shell-layer="${layer}"`);
    }
    expect(SRC).toContain('data-allobot-hand="left" data-allobot-hand-layer="palm"');
    expect(SRC).toContain('fill={`url(#${svgPaintIds.body})`}');
  });

  it('joins the arms behind the shell and keeps every mitt clear of the silhouette', () => {
    // Allobot's body is a sphere. A limb drawn across the front of a sphere
    // reads as a stripe painted on a ball rather than an arm, so both arms are
    // emitted before the shell body circle and the shell hides the join. That
    // only works if the mitt actually hovers outside the silhouette: the old
    // resting pose put the mitt's inner edge 0.27 units INSIDE the body and the
    // thinking pose 2.46 inside, which left no visible arm at all.
    // esbuild turns the JSX attribute into an object key, so match either form.
    const markerAt = (source, attr, value) => {
      const jsx = source.indexOf(`${attr}="${value}"`);
      return jsx > -1 ? jsx : source.indexOf(`"${attr}": "${value}"`);
    };
    for (const source of [SRC, MOD]) {
      const armsAt = markerAt(source, 'data-allobot-arms', 'behind');
      const shellAt = markerAt(source, 'data-allobot-shell-layer', 'body');
      expect(armsAt).toBeGreaterThan(-1);
      expect(shellAt).toBeGreaterThan(-1);
      expect(armsAt, 'arms must be painted before the shell').toBeLessThan(shellAt);
      // The shoulder disc sat 6.15 units inside the silhouette, so behind the
      // shell it is fully occluded. Dead geometry, and it must stay gone.
      expect(source).not.toContain('data-allobot-shoulder');
    }
    const BODY_R = 35;
    const HAND_R = 6.5;
    const poses = [...SRC.matchAll(/(\w+): \{ leftHandX: ([-\d.]+), rightHandX: ([-\d.]+), handY: ([-\d.]+)/g)];
    expect(poses.length).toBeGreaterThanOrEqual(10);
    for (const [, name, leftX, rightX, handY] of poses) {
      expect(Number(leftX) + Number(rightX), `${name} is not symmetric`).toBeCloseTo(100, 6);
      const gap = Math.hypot(Number(leftX) - 50, Number(handY) - 55) - BODY_R - HAND_R;
      expect(gap, `${name} mitt leaves no visible arm`).toBeGreaterThan(1.5);
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
      expect(source).toContain('data-accessory-preferred-side');
      expect(source).toContain('accessoryPreferredSide');
      expect(source).toMatch(/addEventListener\(['"]resize['"],\s*syncViewport\)/);
      for (const [key, side] of entries) {
        const block = accessoryBlock(source, key);
        const usesPreferredLiteral = block.includes(`side-${side}`);
        const usesResponsiveRenderSide = block.includes('side-${accessoryRenderSide');
        expect(
          usesPreferredLiteral || usesResponsiveRenderSide,
          `${key} should render from its preferred ${side} anchor or its responsive side`,
        ).toBe(true);
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

  it('classifies and normalizes every wearable or mixed accessory around its authored anchor', () => {
    const renderedKeys = [...new Set(
      [...SRC.matchAll(/effectiveAccessory === '([a-z][a-z-]+)'/g)].map((match) => match[1]),
    )];
    const sideMapStart = SRC.indexOf('const ALLOBOT_SIDE_ACCESSORY_SIDE');
    const sideMapEnd = SRC.indexOf('});', sideMapStart);
    const sideKeys = new Set(
      [...SRC.slice(sideMapStart, sideMapEnd).matchAll(/(?:'([a-z][a-z-]+)'|\b([a-z][a-z-]+)):\s*'(?:left|right)'/g)]
        .map((match) => match[1] || match[2]),
    );
    const profileMapStart = SRC.indexOf('const ALLOBOT_NON_SIDE_ACCESSORY_PROFILE');
    const profileMapEnd = SRC.indexOf('});', profileMapStart);
    expect(profileMapStart, 'non-side accessory profile map missing').toBeGreaterThan(-1);
    expect(profileMapEnd, 'non-side accessory profile map end missing').toBeGreaterThan(profileMapStart);
    const profileEntries = [...SRC.slice(profileMapStart, profileMapEnd).matchAll(
      /(?:'([a-z][a-z-]+)'|\b([a-z][a-z-]+)):\s*\{\s*placement:\s*'([a-z-]+)',\s*scale:\s*([\d.]+),\s*origin:\s*'([^']+)',\s*depth:\s*'([a-z-]+)'\s*\}/g,
    )].map((match) => ({
      key: match[1] || match[2],
      placement: match[3],
      scale: Number(match[4]),
      origin: match[5],
      depth: match[6],
    }));
    const nonSideKeys = renderedKeys.filter((key) => !sideKeys.has(key)).sort();
    expect(profileEntries.map(({ key }) => key).sort()).toEqual(nonSideKeys);
    for (const profile of profileEntries) {
      expect(profile.scale, `${profile.key} should stay within the calibrated wearable scale range`).toBeGreaterThanOrEqual(0.94);
      expect(profile.scale, `${profile.key} should stay within the calibrated wearable scale range`).toBeLessThanOrEqual(1.04);
      expect(['head', 'hand-adjacent', 'face-and-side', 'head-and-side', 'head-and-ears']).toContain(profile.placement);
      expect(['wearable', 'hand', 'face', 'mixed']).toContain(profile.depth);
      expect(profile.origin, `${profile.key} should anchor in the SVG view box`).toMatch(/^\d+% \d+%$/);
    }

    for (const source of [SRC, MOD]) {
      expect(source).toContain('ALLOBOT_NON_SIDE_ACCESSORY_PROFILE');
      expect(source).toContain('nonSideAccessoryProfile');
      expect(source).toContain('centeredAccessoryVisualStyle');
      expect(source).toContain('data-accessory-silhouette');
      expect(source).toContain('data-accessory-depth');
      expect(source).toContain('data-accessory-origin');
      expect(source).toMatch(/transformBox:\s*["']view-box["']/);
    }
    expect(SRC).toContain("'magnifying-glass': { placement: 'hand-adjacent'");
    expect(SRC).toContain("'sorting-cubes': { placement: 'head-and-side'");
    expect(SRC).toContain("'phoneme-headset': { placement: 'head-and-ears'");
    expect(SRC).toContain('style={sideAccessoryVisualStyle || centeredAccessoryVisualStyle}');
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

  it('layers the visor and reinforces each mood with non-color face cues', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toContain('visorVisual');
      expect(source).toContain('data-allobot-visor-layer');
      expect(source).toContain('data-allobot-face-state');
      expect(source).toContain('data-allobot-expression-cues');
      expect(source).toContain('data-allobot-eye');
      expect(source).toContain('data-allobot-mouth');
      expect(source).toContain('happy-cheeks');
      expect(source).toContain('sad-tear');
      expect(source).toContain('thinking-dots');
    }
    for (const layer of ['frame', 'screen', 'reflection', 'lower-bevel', 'bezel']) {
      expect(SRC).toContain(`data-allobot-visor-layer="${layer}"`);
    }
    expect(SRC).toContain('data-allobot-eye-sparkle="left-primary"');
    expect(SRC).toMatch(/data-allobot-eye="left"[\s\S]*?stroke=\{visorVisual\.eyeOutline\}/);
    expect(SRC).toContain('data-allobot-face-state={faceVisualState}');
  });

  it('shows listening and talking with motion-independent directional visor cues', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toContain('faceVisualState');
      expect(source).toContain('voiceCueState');
      expect(source).toContain('voiceCueDirection');
      expect(source).toContain('voiceCuePaths');
      expect(source).toContain('data-allobot-voice-cue');
      expect(source).toContain('data-allobot-voice-direction');
      expect(source).toContain('data-allobot-voice-cue-motion');
      expect(source).toContain('data-allobot-voice-cue-layer');
      for (const state of ['listening', 'talking', 'inbound', 'outbound']) expect(source).toContain(state);
    }
    expect(SRC.match(/data-allobot-voice-cue-layer=/g)).toHaveLength(6);
    expect(SRC).toContain("isListening ? 'listening' : (isTalking ? 'talking' : effectiveMood)");
    expect(SRC).toContain("voiceCueState === 'listening' ? 'inbound'");
    expect(SRC).toContain("voiceCueState === 'talking' ? 'outbound'");
    // The pupil was replaced by a bead-and-highlight eye on 2026-09-04, so
    // the listening cue widens the highlight instead of a pupil.
    expect(SRC).toContain("voiceCueState === 'listening' ? 0.35 : 0");
    expect(SRC).toContain('const eyeHighlightRx');
    expect(SRC).toContain('M 46 58 Q 50 55 54 58 Q 50 62 46 58');
    expect(SRC).toContain('className={!motionDisabled ? "animate-pulse motion-reduce:animate-none" : undefined}');
  });

  it('uses a prop-aware gaze, reaching hand, and opposite held-tool silhouette', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toContain('propGazeX');
      expect(source).toContain('data-allobot-prop-gaze');
      expect(source).toContain('leftHandX');
      expect(source).toContain('rightHandX');
      expect(source).toContain('data-held-item-side');
      expect(source).toContain('heldItemRenderSide');
      expect(source).toMatch(/heldItemRenderSide === ['"]left['"] \? -1 : 1/);
    }
  });

  it('anchors every held tool to the live palm and draws a foreground grasp', () => {
    const tools = ['pointer', 'pencil', 'calculator', 'map', 'clipboard', 'hourglass', 'magnifying-glass', 'book', 'globe', 'wand', 'paintbrush', 'flashlight'];
    for (const source of [SRC, MOD]) {
      expect(source).toContain('ALLOBOT_HELD_ITEM_GRIP');
      expect(source).toContain('heldItemAuthoredGrip');
      expect(source).toContain('heldItemGripX');
      expect(source).toContain('heldItemGripY');
      expect(source).toContain('heldItemArtworkTransform');
      expect(source).toContain('heldItemMotionClass');
      expect(source).toContain('data-allobot-held-item-grip');
      expect(source).toContain('data-allobot-held-item-authored-grip');
      expect(source).toContain('data-allobot-held-item-motion');
      expect(source).toContain('data-allobot-live-grip');
      expect(source).toContain('data-allobot-held-item-grip-overlay');
    }
    for (const tool of tools) {
      const key = tool.includes('-') ? `'${tool}': { x:` : `${tool}: { x:`;
      expect(SRC, `missing authored grip for ${tool}`).toContain(key);
    }
    expect(SRC).toContain("heldItem !== 'flashlight'");
    expect(SRC).toContain("heldItem === 'pencil' && activeView === 'quiz'");
    expect(SRC).toContain('transform={`translate(${leftHandX}, ${leftHandY}) rotate(15)`}');
    expect(SRC).toContain('transform={`translate(${leftHandX}, ${leftHandY}) rotate(${aimAngle})`}');
    expect(SRC).not.toContain("transformOrigin: '90px 65px'");
    expect(SRC).not.toContain("'translate(100 0) scale(-1 1)'");
    expect(SRC).toContain('transform-origin: 90px 65px;');
  });

  it('braces broad held props with a mirrored support hand below the visor', () => {
    const supportedTools = ['map', 'clipboard', 'book'];
    const mapStart = SRC.indexOf('const ALLOBOT_HELD_ITEM_SUPPORT_GRIP');
    const mapEnd = SRC.indexOf('});', mapStart);
    const supportEntries = [...SRC.slice(mapStart, mapEnd).matchAll(/(?:'([^']+)'|\b([a-z][a-z-]+)):\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/g)]
      .map((match) => match[1] || match[2]);
    expect(supportEntries.sort()).toEqual([...supportedTools].sort());
    for (const source of [SRC, MOD]) {
      expect(source).toContain('ALLOBOT_HELD_ITEM_SUPPORT_GRIP');
      expect(source).toContain('heldItemSupportAuthoredGrip');
      expect(source).toContain('heldItemUsesSupportHand');
      expect(source).toContain('heldItemSupportSide');
      expect(source).toContain('heldItemSupportX');
      expect(source).toContain('heldItemSupportY');
      expect(source).toContain('data-allobot-arm-role');
      expect(source).toContain('data-allobot-hand-role');
      expect(source).toContain('data-allobot-held-item-support');
      expect(source).toContain('data-allobot-held-item-support-grip');
      expect(source).toContain('braced');
    }
    expect(SRC).toContain('&& !accessoryRenderSide');
    expect(SRC).toContain("heldItemSupportSide === 'left'");
    expect(SRC).toContain("heldItemSupportSide === 'right'");
    // Shoulders moved onto the torso on 2026-09-04 so the arm is visible
    // between the shoulder ball and the hand ball; the support curve is
    // otherwise unchanged.
    expect(SRC).toContain("['M', 21.5, 59.5, 'Q', 46, 78");
    expect(SRC).toContain("['M', 78.5, 59.5, 'Q', 54, 78");
    expect(SRC).toContain("transform: !heldItemUsesSupportHand && isMoving");
    expect(SRC.match(/data-allobot-held-item-support-grip=/g)).toHaveLength(1);
  });

  it('anchors the face while soft eye cores acknowledge props and shares accessory color with the shell', () => {
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

  // Rewritten 2026-09-04, second time in a day, because the design changed
  // under it twice. History, so the next person does not re-run the loop:
  // pupils were made pastel to stop the tracking eye looking watchful, which
  // dropped them to 1.1:1 against their own eye and hid the glance entirely;
  // they were then darkened to 6:1 so the glance could be seen; and finally
  // the pupil was removed altogether. The eye is a solid bead of the mood
  // colour with one soft highlight, as it was before it grew a pupil, and the
  // BEAD moves with the glance. Direction reads from where the bead sits in
  // the visor, so nothing dark has to follow the pointer.
  it('carries the glance with the whole eye, so a bead and a highlight are enough', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toContain('data-allobot-eye-core');
      expect(source).toContain('data-allobot-soft-gaze');
      expect(source).toContain('data-allobot-eye-details');
      expect(source).toContain('data-allobot-face-cue');
      expect(source).toContain('eyeCoreVisual');
      expect(source).toContain('faceLensesCoverEyes');
      expect(source).toContain('eyeDetailsVisible');
      expect(source).toContain('cheekOpacity');
      expect(source).toContain('isHovered');
    }
    expect(SRC).toContain('if (motionDisabled || coarsePointer)');
    expect(SRC).toContain("const ALLOBOT_AMBIENT_GAZE_SCALE = 0.8;");
    expect(SRC).toContain('const maxFeatureRadius = 2.2;');
    expect(SRC).toContain('const maxVisorRadius = 0.35;');
    expect(SRC).toContain("const eyeDetailsVisible = blinkScale >= 0.5;");
    expect(SRC).toContain('!faceLensesCoverEyes &&');

    // The eye itself must live inside the group that carries the gaze
    // transform. If it drifts back outside, the eye is pinned again and a
    // pupil becomes necessary, which is how this regressed the first time.
    const gazeGroup = SRC.slice(SRC.indexOf('data-allobot-eye-details={'), SRC.indexOf('</g>', SRC.indexOf('data-allobot-eye-details={')));
    expect(gazeGroup).toContain('data-allobot-eye="left"');
    expect(gazeGroup).toContain('data-allobot-eye="right"');
    expect(gazeGroup).toContain('data-allobot-eye-core="left"');

    // A generous highlight, and no dark pupil hiding inside the bead.
    expect(SRC).toContain('const eyeHighlightRx');
    expect(SRC).toContain('const eyeHighlightRy');
    // The gloss is a white catchlight on a mid-tone bead and a soft shade in the
    // mood's own darker tone on a pale one, because a white catchlight measures
    // 1.00:1 on the pale eyes and cannot be seen. High contrast gets neither.
    expect(SRC).toContain('const eyeGlossMode');
    expect(SRC).toContain("eyeGlossMode === 'shade' ? eyeCoreVisual.rim : eyeCoreVisual.glint");
    expect(SRC).toContain('fill={eyeGlossFill}');
    expect(SRC).toContain("theme === 'contrast' ? 'none'");
    expect(SRC).not.toContain("fill={eyeCoreVisual.fill}");
    expect(SRC).not.toMatch(/const eyeCoreVisual[\s\S]{0,400}?fill: '#0/);

    // The bead has to stand out from the visor it sits on, in every mood.
    const luminance = (hex) => {
      const channel = (value) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const n = Number.parseInt(hex.slice(1), 16);
      return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
    };
    const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
    const visorInterior = '#1E1B4B';
    const eyes = { idle: '#22D3EE', happy: '#FFFFFF', thinking: '#FEF3C7', sad: '#E2E8F0' };
    for (const [mood, eye] of Object.entries(eyes)) {
      expect(SRC, mood).toContain(`eye: '${eye}'`);
      expect(contrast(eye, visorInterior), `${mood} eye against the visor`).toBeGreaterThanOrEqual(4.5);
    }

    // Listening still widens the eye's catchlight, which used to widen a pupil.
    expect(SRC).toContain("voiceCueState === 'listening' ? 0.35 : 0");
    expect(SRC).toContain('M 43 58.5 Q 50 63.5 57 58.5');
    expect(SRC).not.toContain('M 45 58.5 Q 50 63 55 58.5');
  });

  it('mounts responsive side props to a mirrored accent dock beneath their artwork', () => {
    for (const source of [SRC, MOD]) {
      expect(source).toContain('accessoryDockNudge');
      expect(source).toContain('accessoryDockShellX');
      expect(source).toContain('accessoryDockEdgeX');
      expect(source).toContain('accessoryDockPath');
      expect(source).toContain('accessoryDockSignalPath');
      expect(source).toContain('accessoryDockState');
      expect(source).toContain('data-allobot-accessory-dock');
      expect(source).toContain('data-allobot-accessory-dock-state');
      expect(source).toContain('data-allobot-accessory-dock-accent');
      expect(source).toContain('data-allobot-accessory-dock-layer');
      for (const state of ['connected', 'releasing']) expect(source).toContain(state);
    }
    for (const layer of ['tether-shadow', 'tether-signal', 'shell-port', 'shell-core', 'edge-port', 'edge-core']) {
      expect(SRC).toContain(`data-allobot-accessory-dock-layer="${layer}"`);
    }
    expect(SRC.match(/data-allobot-accessory-dock-layer=/g)).toHaveLength(6);
    expect(SRC).toContain("const accessoryDockShellX = accessoryRenderSide === 'left' ? 22 : 78;");
    expect(SRC).toContain("const accessoryDockState = accExiting ? 'releasing' : 'connected';");
    expect(SRC).toContain('data-allobot-accessory-dock-accent={accessoryAccent}');
    expect(SRC).toContain('className={!motionDisabled && !accExiting ? "animate-pulse motion-reduce:animate-none" : undefined}');
    const reflectionIndex = SRC.indexOf('data-allobot-accessory-reflection');
    const dockIndex = SRC.indexOf('data-allobot-accessory-dock={accessoryRenderSide}');
    const visorIndex = SRC.indexOf('data-allobot-visor={theme}');
    expect(reflectionIndex).toBeGreaterThan(-1);
    expect(dockIndex).toBeGreaterThan(reflectionIndex);
    expect(visorIndex).toBeGreaterThan(dockIndex);
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
