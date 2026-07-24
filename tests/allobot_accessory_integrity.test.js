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
  const body = ANTI.slice(start, start + 2500);
  const keys = new Set(['sleep-cap']); // isSleeping override pose
  for (const m of body.matchAll(/return '([a-z][a-z-]+)'/g)) keys.add(m[1]);
  return keys;
}

const KEYS = mappingKeys();
const srcKey = (k) => SRC.includes(`effectiveAccessory === '${k}'`);
const modKey = (k) => MOD.includes(`effectiveAccessory === "${k}"`) || MOD.includes(`effectiveAccessory === '${k}'`);

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
});
