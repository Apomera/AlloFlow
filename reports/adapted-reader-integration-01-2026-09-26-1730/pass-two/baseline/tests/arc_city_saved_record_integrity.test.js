import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from './helpers/arc_harness.js';

// A saved level record must never be able to strand a student.
//
// WHY THIS EXISTS
// The play view derived its level state as `rawLS.params ? rawLS : <blank>` -- an
// all-or-nothing test that threw away a whole record whenever `params` was missing.
// That conflates "no saved params" with "no progress", and the two disagree loudly:
// every OTHER surface reads byLevel directly, so a params-less but solved record
// still counted in the "City restored N/12" tally, still drew its star, and still
// unlocked the next level via isLevelUnlocked -- while the Next-level CTA, which
// reads ls.solved, silently vanished. The tool credited the solve and withheld the
// way forward.
//
// The second half is the same class as the Circuit Clash NaN defect
// (arc_city_param_input_guard.test.js) reached from the OTHER direction: a saved
// params object that is empty, an array, or partly the wrong type ({m:'x'}) put
// "NaN" in the sliders, printed "y = NaN . x +" as the equation, and narrated that
// the beam "missed it by Infinity units". Params are now rebuilt from the level's
// own paramOrder, so a saved object contributes values but never its shape.
//
// Both are corrupted / cross-version save shapes -- the input class wave 27
// hardened for -- not things ordinary play produces.
const TOOL = resolve(process.cwd(), 'stem_lab/stem_tool_arccity.js');

const solvedRecord = (extra) => Object.assign({ solved: true, independent: true, shots: 1, misses: 0 }, extra);
const playState = (record) => ({ view: 'play', levelId: 'L1', byLevel: { L1: record }, fired: true });
const hasCta = (text) => /Next level|Next →/i.test(text);

describe('Arc City - a solved record keeps its progress when params are missing', () => {
  it('the derivation fills gaps instead of discarding the record', () => {
    const src = readFileSync(TOOL, 'utf8');
    // The old shape was a ternary that dropped rawLS wholesale. Object.assign over
    // defaults is what keeps `solved` when only `params` is absent.
    expect(src).not.toMatch(/\(rawLS && rawLS\.params\) \? rawLS :/);
    expect(src).toMatch(/var ls = Object\.assign\(\{[^}]*\}, rawLS \|\| \{\}\)/);
  });

  it('offers the Next-level CTA with params present (the control case)', () => {
    const r = render(playState(solvedRecord({ params: { m: 0.5, b: 0 } })));
    expect(hasCta(r.text), 'the control case must show a CTA or this suite proves nothing').toBe(true);
  });

  it('still offers the Next-level CTA when params are missing', () => {
    const r = render(playState(solvedRecord()));
    expect(hasCta(r.text), 'a solved record lost its CTA because params were absent').toBe(true);
  });

  it('agrees with the surfaces that read byLevel directly', () => {
    // The tally and the star already counted this solve; the CTA must not dissent.
    const r = render(playState(solvedRecord()));
    expect(r.text).toMatch(/City restored\s+1\s*\/\s*12/);
    expect(r.text).toContain('★');
  });
});

describe('Arc City - a junk saved params object never reaches the board', () => {
  // Shapes a corrupted or cross-version save can hold. Each previously produced
  // NaN sliders, a "y = NaN . x +" equation, or "missed it by Infinity units".
  const JUNK = [
    ['null', null],
    ['a string', 'str'],
    ['a number', 42],
    ['an array', []],
    ['a boolean', true],
    ['an empty object', {}],
    ['wrong-typed fields', { m: 'x', b: null }],
    ['a NaN field', { m: NaN }],
    ['a non-finite field', { m: Infinity, b: 2 }],
  ];

  JUNK.forEach(([label, params]) => {
    it(`${label} renders real numbers, not NaN or Infinity`, () => {
      const r = render(playState(solvedRecord({ params })));
      expect(r.text.length, 'nothing rendered -- vacuous').toBeGreaterThan(200);
      expect(r.text, `${label} leaked a non-number to the student`).not.toMatch(/NaN|Infinity|undefined/);
    });
  });

  it('a well-formed saved value is still honoured (not a blanket reset)', () => {
    const r = render(playState(solvedRecord({ params: { m: 1.5, b: 0 } })));
    // L1 locks b, so only m is the player's -- it must survive as authored.
    expect(r.text).toMatch(/1\.5/);
  });

  it('locked params are pinned to their default even if the save disagrees', () => {
    // L1's b is locked at its default; a save claiming otherwise must not win,
    // matching the adjudication-layer clamp classifyShot already applies.
    const r = render(playState(solvedRecord({ params: { m: 0.5, b: 7 } })));
    expect(r.text).not.toMatch(/b\s*\(start height[^)]*\):\s*7/);
  });
});

// ── The corruption must not merely be hidden; it must be HEALED ──
//
// Sanitising on read keeps junk off the board, but if the write path echoed the
// saved object back, the bad record would survive every session and re-poison each
// new surface added later. The fire handler writes the SANITISED params (`P`), so
// the first shot after loading a corrupted save repairs it on disk.
describe('Arc City - firing repairs a corrupted saved record', () => {
  it('rewrites junk params as finite numbers', () => {
    const byLevel = { L1: { solved: false, shots: 0, misses: 0, params: { m: 'x' } } };
    const state = { view: 'play', levelId: 'L1', byLevel, fired: false };
    const r = render(state);
    const fire = r.find('fire');
    expect(fire, 'the fire control is gone -- this test would be vacuous').toBeTruthy();
    const before = r.reducers.length;
    fire.props.onClick({ preventDefault() {}, stopPropagation() {}, target: {}, currentTarget: {} });
    let s = { _arccity: state };
    for (const fn of r.reducers.slice(before)) s = fn(s) || s;
    const saved = s._arccity.byLevel.L1;
    expect(saved.shots, 'no shot was recorded -- the wrong control was clicked').toBe(1);
    Object.keys(saved.params).forEach((k) => {
      expect(Number.isFinite(saved.params[k]), `saved param ${k} is still not a number`).toBe(true);
    });
    // The locked param must land on its default rather than whatever was stored.
    expect(saved.params.b).toBe(0);
  });
});
