import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_optics.js'), 'utf8');

function between(startMarker, endMarker) {
  return sliceBetween(SRC, startMarker, endMarker, { file: 'stem_lab/stem_tool_optics.js' });
}

const PANEL_OPEN = 'function _renderSleuthPanel(d, upd, h, addToast) {';
const PANEL = between(PANEL_OPEN, '// `ssShown` is the de-duplication pool');

// The shipped vignettes and type cards, evaluated from source. sliceBetween
// INCLUDES the start anchor, so drop the function header before wrapping the
// body in our own IIFE.
const PANEL_BODY = PANEL.slice(PANEL_OPEN.length);
const DATA = vm.runInNewContext(`(function () { ${PANEL_BODY} return { TYPES: TYPES, V: V }; })()`, {});

describe('Optics Sleuth — the answer is not printed on the buttons', () => {
  // The bug: every answer button rendered `t.rule`, which names the setup
  // that produces that image ("Object beyond 2f", "DIVERGING lens ...").
  // The vignette states the setup, so matching the words needed no physics.
  it('shows a neutral cue before the pick and the rule only after', () => {
    const buttons = between("role: 'radiogroup'", '// Feedback');
    expect(buttons).toContain('ssAns ? t.rule : t.cue');
    expect(buttons, 'the rule is back on the button face before answering')
      .not.toMatch(/\}\s*\}, t\.rule\)/);
  });

  it('gives every type a cue that does not name the setup', () => {
    // These are the words that would leak the answer: they describe the
    // object/lens configuration rather than the resulting image.
    const LEAKS = [/\b2f\b/i, /diverging/i, /converging/i, /inside f/i, /beyond/i,
                   /object position/i, /focal point/i, /convex mirror/i];
    expect(DATA.TYPES).toHaveLength(4);
    for (const t of DATA.TYPES) {
      expect(typeof t.cue, `${t.id} has no cue`).toBe('string');
      expect(t.cue.length).toBeGreaterThan(10);
      for (const leak of LEAKS) {
        expect(t.cue, `${t.id} cue leaks the setup: ${t.cue}`).not.toMatch(leak);
      }
      // The rule itself must survive — it is the teaching after the answer.
      expect(typeof t.rule).toBe('string');
    }
  });

  it('keeps the rules on the reference cards on the start screen', () => {
    // Removing them from the buttons must not remove them from the tool.
    const start = between("'\uD83D\uDD75\uFE0F Sign Convention Sleuth'", "onClick: startSs");
    expect(start).toContain('t.rule');
  });
});

describe('Optics Sleuth — the vignettes are physically correct', () => {
  // Guards the content itself: every key is re-derived from the lens
  // equation, so a future edit to a focal length cannot silently
  // contradict its own answer key.
  const SETUP = /f\s*=\s*(-?[\d.]+)\s*cm\.?\s*(?:Object|You stand)[^.]*?([\d.]+)\s*cm/i;

  it('derives each answer key from 1/f = 1/d_o + 1/d_i', () => {
    expect(DATA.V).toHaveLength(10);
    let checked = 0;
    for (const v of DATA.V) {
      const m = v.setup.match(SETUP);
      if (!m) continue;              // #9 is "at infinity", handled below
      const f = parseFloat(m[1]);
      const dO = parseFloat(m[2]);
      const di = 1 / (1 / f - 1 / dO);
      const mag = -di / dO;
      const derived = (di > 0 ? 'realInv' : 'virtUpr') + (Math.abs(mag) > 1 ? 'Mag' : 'Red');
      expect(derived, `vignette ${v.id} (${v.setup}) key disagrees with the lens equation`)
        .toBe(v.correct);
      checked++;
    }
    expect(checked, 'the setup parser stopped matching the vignettes').toBeGreaterThanOrEqual(9);
  });

  it('covers all four image types so the deck is not guessable', () => {
    const seen = new Set(DATA.V.map((v) => v.correct));
    expect([...seen].sort()).toEqual(['realInvMag', 'realInvRed', 'virtUprMag', 'virtUprRed']);
    // No single type may dominate: picking the most common one every time
    // must not beat chance by much.
    const counts = {};
    for (const v of DATA.V) counts[v.correct] = (counts[v.correct] || 0) + 1;
    expect(Math.max(...Object.values(counts)),
      'one image type answers too much of the deck').toBeLessThanOrEqual(4);
  });

  it('gives every vignette a worked rationale', () => {
    for (const v of DATA.V) {
      expect(v.why.length, `vignette ${v.id} rationale is too thin`).toBeGreaterThan(80);
    }
  });
});

describe('Optics Sleuth — the progress counter tells the truth', () => {
  // ssShown is the de-dup pool and resets to [] on the 11th draw, so it
  // showed "Vignette 1 of 10" to a learner on their second pass.
  it('counts rounds answered, not the de-duplication pool', () => {
    const body = between('var ssSolved =', '// Vignette');
    expect(body).toContain('ssRounds');
    const header = between("'Vignette ', h('strong'", 'Score');
    expect(header).not.toContain('ssShown.length');
    const banner = between("letterSpacing: '0.06em', marginBottom: 6 } }, 'Vignette '", '),');
    expect(banner).not.toContain('ssShown.length');
    expect(banner).toContain('ssSolved');
  });

  it('completes on rounds answered so the final score is out of the deck size', () => {
    const line = between('var allDone =', 'var correctType');
    expect(line).toContain('ssRounds >= OP_SLEUTH_TOTAL_VIGNETTES');
    expect(line, 'allDone still keys off the pool').not.toContain('ssShown.length');
  });

  it('clears the best streak on restart', () => {
    // Otherwise a fresh run opens displaying a trophy from the last one.
    const restart = between("}, '\uD83D\uDD04 Restart')", '');
    expect(SRC).toContain('ssStreak: 0, ssBest: 0');
  });

  it('derives the deck size rather than hardcoding ten', () => {
    // The start screen and the summary bands live BETWEEN the V array and
    // `var ssSolved`, so slice the whole render body from the panel header to
    // the next function. Slicing from `var ssSolved` skips the start button.
    const body = between('function _renderSleuthPanel(d, upd, h, addToast) {',
      '// QUIZ PANEL');
    expect(body, 'the start button hardcodes the deck size')
      .not.toMatch(/vignette 1 of 10'/);
    expect(body, 'a summary band hardcodes a score threshold')
      .not.toMatch(/ssScore >= 8 \?/);
    expect(body).not.toMatch(/ssScore >= 6 \?/);
    // Positive pin: the derived forms are actually present, so the negative
    // assertions above cannot pass by the region having moved away.
    expect(body).toContain("vignette 1 of ' + V.length");
    expect(body).toContain('Math.ceil(V.length * 0.8)');
    expect(body).toContain('Math.ceil(V.length * 0.6)');
  });
});
