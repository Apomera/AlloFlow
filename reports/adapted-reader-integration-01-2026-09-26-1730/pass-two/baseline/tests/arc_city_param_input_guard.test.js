import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from './helpers/arc_harness.js';
import { indexOfOrThrow, sliceBetween } from './helpers/anchored_slice.js';

// A non-finite value must never become a param.
//
// WHY THIS EXISTS
// Circuit Clash is the tool's only `<input type=number>` (solo play is sliders, which
// cannot emit non-numeric text). React hands back the RAW STRING, and every legal
// PREFIX of a number -- '-', '.', 'e', '1e' -- is NaN to Number(). That is ordinary
// typing on the way to "-2", not abuse.
//
// Unguarded, the NaN went all the way through: snapToRange's Math.max/min propagate
// NaN rather than clamping it, normalizeBattleState's Object.assign preserved it into
// the SAVED draft, the number box redisplayed the literal string "NaN", the shot
// sampled 201 non-finite points (an invisible curve), and the player was told they
// "missed the node by Infinity units" -- while the turn was still consumed and play
// passed to Player 2. A student mid-keystroke lost their turn to a curve nobody drew.
//
// The guard lives in snapToRange because that is the shared chokepoint for all six
// callers (the vertex/pivot/crest drag solvers and the battle input), so every path
// that can author a param is covered by one derivation.
const TOOL = resolve(process.cwd(), 'stem_lab/stem_tool_arccity.js');

function findAllDeep(node, pred, out = []) {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach(n => findAllDeep(n, pred, out)); return out; }
  if (pred(node)) out.push(node);
  (node.children || []).forEach(c => findAllDeep(c, pred, out));
  return out;
}

// Drive the battle number input with `raw` and fold the queued reducers.
function typeIntoBattleNumber(raw) {
  const state = { view: 'battle', battle: { mode: 'hotseat', status: 'playing' } };
  const r = render(state);
  const inputs = findAllDeep(r.tree, n => n.props && n.props.type === 'number');
  // Vacuity guard: if the control is ever renamed or removed, fail loudly rather
  // than passing by testing nothing.
  expect(inputs.length, 'the battle number input is gone -- this test would be vacuous').toBeGreaterThan(0);
  const before = r.reducers.length;
  inputs[0].props.onChange({ target: { value: raw } });
  let s = { _arccity: state };
  for (const fn of r.reducers.slice(before)) s = fn(s) || s;
  return { after: s._arccity, tree: r.tree };
}

// Every legal prefix of a real number a student types on the way to a value.
const PREFIXES = ['-', '.', '-.', 'e', '1e', '1e-', '+', ''];

describe('Arc City - a half-typed number never becomes a param', () => {
  it('the source guards non-finite input before clamping', () => {
    const src = readFileSync(TOOL, 'utf8');
    const fn = sliceBetween(src, 'function snapToRange', 'function periodOf', { file: 'stem_tool_arccity.js', label: 'snapToRange' });
    expect(fn, 'snapToRange must reject non-finite input').toMatch(/isFinite\(val\)/);
    // The guard has to come BEFORE the snapValues branch, or the nearest-neighbour
    // walk measures Math.abs(NaN - x) and silently returns snapValues[0].
    expect(fn.indexOf('isFinite(val)')).toBeLessThan(fn.indexOf('r.snapValues'));
  });

  PREFIXES.forEach((raw) => {
    it(`typing ${JSON.stringify(raw)} leaves every draft param finite`, () => {
      const { after } = typeIntoBattleNumber(raw);
      const drafts = after.battle.drafts;
      expect(Array.isArray(drafts), 'drafts missing').toBe(true);
      let checked = 0;
      drafts.forEach(seat => seat.forEach(lane => Object.keys(lane).forEach(k => {
        checked++;
        expect(Number.isFinite(lane[k]), `draft param ${k} became ${lane[k]} after typing ${JSON.stringify(raw)}`).toBe(true);
      })));
      expect(checked, 'no params inspected -- vacuous').toBeGreaterThan(5);
    });
  });

  it('the input redisplays a number, never the string "NaN"', () => {
    const { after } = typeIntoBattleNumber('-');
    const r2 = render(after);
    const shown = findAllDeep(r2.tree, n => n.props && n.props.type === 'number')[0];
    expect(String(shown.props.value)).not.toBe('NaN');
    expect(Number.isFinite(Number(shown.props.value))).toBe(true);
  });

  it('a shot fired after a half-typed keystroke is a real curve, not Infinity', () => {
    const { after } = typeIntoBattleNumber('-');
    const r = render(after);
    const fireBtn = r.find('battle-fire');
    expect(fireBtn, 'the battle-fire control is gone -- this test would be vacuous').toBeTruthy();
    const before = r.reducers.length;
    fireBtn.props.onClick({ preventDefault() {}, stopPropagation() {}, target: {}, currentTarget: {} });
    let s = { _arccity: after };
    for (const fn of r.reducers.slice(before)) s = fn(s) || s;
    const trail = (s._arccity.battle.trails || [])[0];
    expect(trail, 'the shot produced no trail -- vacuous').toBeTruthy();
    const samples = trail.samples || [];
    expect(samples.length, 'trail has no samples -- vacuous').toBeGreaterThan(10);
    const bad = samples.filter(pt => !Number.isFinite(pt.y)).length;
    expect(bad, 'the fired curve had non-finite samples').toBe(0);
    // The narration must state a real distance. "Infinity units" is the tell.
    expect((s._arccity.battle.log || []).join(' ')).not.toMatch(/Infinity|NaN/);
  });

  it('a well-formed value still snaps normally (the guard is not a blanket reset)', () => {
    const { after } = typeIntoBattleNumber('2');
    const m = after.battle.drafts[0][0].m;
    expect(Number.isFinite(m)).toBe(true);
    // '2' is inside the slope range, so it must survive as itself -- proving the
    // non-finite branch did not swallow legitimate input.
    expect(m).toBe(2);
  });
});

// ── Hint terminology must name controls the student can actually see ──
//
// Both sine levels author b as PERIOD (`asPeriod: true`, read out as "N units per
// wave"); there is no "frequency" control anywhere in the UI. The gate hint used to
// say "change the frequency b", which named a missing control AND pointed the
// opposite way — raising b SHORTENS the period, so a student told to raise frequency
// has to drag the period slider DOWN. The match-coaching branch already said
// "widen/narrow the period"; this keeps the two branches telling one story.
describe('Arc City - sine coaching names the on-screen control', () => {
  const src = readFileSync(TOOL, 'utf8');
  // Strip comments before asserting: the rule is about SHIPPED STRINGS, and the
  // explanation of why "frequency" is wrong necessarily contains the word.
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const hint = stripComments(sliceBetween(src, 'function actionHint', 'function describeResult', { file: 'stem_tool_arccity.js', label: 'actionHint' }));
  const code = stripComments(src);

  it('never coaches a "frequency" control the UI does not have', () => {
    expect(hint).not.toMatch(/frequency/i);
  });

  it('both sine levels really do label b as period (the premise of the rule above)', () => {
    const asPeriod = (code.match(/asPeriod:\s*true/g) || []).length;
    expect(asPeriod, 'sine b is no longer authored as a period - revisit the hint wording').toBe(2);
    expect(code).not.toMatch(/label:\s*'b\s+\(frequency/);
  });

  it('the sine gate hint offers the phase, which is the control that moves a crest', () => {
    const sineGate = hint.slice(indexOfOrThrow(hint, "if (res.result === 'gate')", { label: 'the gate branch of actionHint' }));
    const line = sineGate.split('\n').find(l => l.includes("fam === 'sine'"));
    expect(line, 'the sine gate branch moved').toBeTruthy();
    expect(line).toMatch(/phase c/);
    expect(line).toMatch(/period/);
  });
});
