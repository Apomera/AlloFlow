// Adventure free-response + narrative-text interaction regressions (2026-07-16).
//
// Two Aaron-reported issues from the 07-15 Codex sessions, fixed by this wave:
//  1. Free-response turns "just react to what the user did without driving the story
//     to a new challenge" — the continuation prompt's optionsInstruction was an EMPTY
//     STRING in free-response mode (multiple-choice got detailed scaffolding; free
//     response got nothing), so scenes ended on consequence narration. The prompt now
//     requires every free-response scene (init + continuation) to END with a concrete
//     unresolved problem the student must respond to.
//  2. The inline per-sentence speaker buttons in adventure narrative text (added by
//     52c353dea for keyboard a11y) were redundant with click-to-karaoke and visually
//     clunky. Removed IN ADVENTURE ONLY — the sentence span itself is now the control
//     (role="button", tabIndex, Enter/Space) so keyboard/SR access is preserved with
//     no visual chrome. Global auto-read toggles and the option-audio Listen button stay.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8');
const HANDLERS_SRC = read('adventure_handlers_source.jsx');
const HANDLERS_MOD = read('adventure_handlers_module.js');
const VIEW_SRC = read('view_adventure_source.jsx');
const VIEW_MOD = read('view_adventure_module.js');

describe('free-response drives the story forward (source + built module)', () => {
  for (const [name, s] of [['source', HANDLERS_SRC], ['module', HANDLERS_MOD]]) {
    it(`${name}: continuation optionsInstruction is NOT empty in free-response mode`, () => {
      // The old bug: `: ''` — free-response continuation carried no scene-shape instruction.
      expect(s).toMatch(/CRITICAL \(FREE-RESPONSE MODE\): DRIVE THE STORY FORWARD/);
      expect(s).toMatch(/MUST END with a NEW\s+concrete, unresolved problem/);
      expect(s).toMatch(/NEVER end on pure reaction, praise, calm resolution, or summary/);
    });
    it(`${name}: the free-response INIT prompt also demands an ending challenge`, () => {
      expect(s).toMatch(/opening scene MUST END with a concrete, unresolved problem/);
    });
    it(`${name}: free-response still returns an empty options array`, () => {
      expect(s).toMatch(/Return an empty 'options' array: \[\]/);
    });
  }
});

describe('adventure narrative text: sentence text is the read-aloud control (no inline buttons)', () => {
  for (const [name, s] of [['source', VIEW_SRC], ['module', VIEW_MOD]]) {
    it(`${name}: the per-sentence speaker button is gone`, () => {
      // Signature of the removed button: aria-controls pointing at its sentence span.
      expect(s).not.toMatch(/aria-controls=\{?[`"]sentence-/);
    });
    it(`${name}: the sentence span carries the interaction + keyboard a11y instead`, () => {
      // Both renderers (light + immersive): span is a focusable button-role control.
      const spans = s.match(/id[:=]\s*\{?`sentence-\$\{currentGlobalIdx\}`/g) || [];
      expect(spans.length).toBeGreaterThanOrEqual(2);
      expect(s).toMatch(/role[:=]\s*"button"/);
      expect(s).toMatch(/tabIndex[:=]\s*\{?0\}?/);
      expect(s).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/);
    });
    it(`${name}: global auto-read toggle and option-audio Listen button survive`, () => {
      expect(s).toMatch(/adventureAutoRead/);
      expect(s).toMatch(/opt\?\.audio|opt && opt\.audio|opt\.audio/);
    });
  }
});
