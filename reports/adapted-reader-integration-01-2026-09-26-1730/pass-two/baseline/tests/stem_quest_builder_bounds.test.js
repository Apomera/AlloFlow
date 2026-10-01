import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// The quest builder's number input carried `min: 1`, which a browser applies
// only to its spinner and to HTML form validation this form never runs. A
// typed value reached the saved quest unchecked, so a teacher could create:
//   * a NEGATIVE target, which completes instantly (earned >= -5 at 0 XP)
//   * a target of 0, whose HUD bar computes 0/0 = NaN -> width:"NaN%"
//   * an xpThreshold above 100, permanently unreachable because XP caps at
//     100 per activity
//
// These tests run the SHIPPED QUEST_TYPES table and guards.

const HUB = 'stem_lab/stem_lab_module.js';
const source = () => readFileSync(HUB, 'utf8');

function extractBalanced(src, openAt, openChar, closeChar) {
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = openAt; i < src.length; i++) {
    const char = src[i], next = src[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (char === '\\') { i++; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === openChar) depth++;
    if (char === closeChar) { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar);
}

function extractFunction(src, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\(').exec(src);
  expect(declaration, 'hub no longer declares ' + name).not.toBeNull();
  const openAt = src.indexOf('{', declaration.index);
  return src.slice(declaration.index, openAt) + extractBalanced(src, openAt, '{', '}');
}

function load() {
  const src = source();
  const qtAt = src.indexOf('var QUEST_TYPES = [');
  expect(qtAt, 'QUEST_TYPES moved').toBeGreaterThanOrEqual(0);
  const sandbox = { Math, Number, isFinite, parseInt, t: () => null };
  runInNewContext([
    'var QUEST_TYPES = ' + extractBalanced(src, src.indexOf('[', qtAt), '[', ']') + ';',
    extractFunction(src, '_clampQuestParam'),
    extractFunction(src, '_questPct'),
    'this.clamp=_clampQuestParam; this.pct=_questPct; this.TYPES=QUEST_TYPES;'
  ].join('\n'), sandbox);
  return sandbox;
}

const typeOf = (sb, id) => sb.TYPES.find((x) => x.id === id);

describe('quest parameter bounds', () => {
  it('every measurable quest type declares a range', () => {
    const sb = load();
    for (const t of sb.TYPES) {
      if (t.id === 'toolQuest') continue; // no numeric parameter
      expect(t.minVal, t.id + ' has no minVal').toBeGreaterThan(0);
      expect(t.maxVal, t.id + ' has no maxVal').toBeGreaterThan(t.minVal);
    }
  });

  it('caps xpThreshold at the XP the system can actually award', () => {
    const sb = load();
    // awardStemXP caps each activity at 100, so a larger target can never
    // complete however long the student works.
    expect(typeOf(sb, 'xpThreshold').maxVal).toBe(100);
    expect(source()).toContain('var cap = 100;');
  });

  it('rejects a negative target', () => {
    const sb = load();
    // The original defect: -5 completed the quest instantly.
    expect(sb.clamp('-5', typeOf(sb, 'xpThreshold'))).toBeGreaterThanOrEqual(1);
  });

  it('rejects zero', () => {
    const sb = load();
    expect(sb.clamp('0', typeOf(sb, 'xpThreshold'))).toBeGreaterThanOrEqual(1);
  });

  it('clamps an unreachable target down to the ceiling', () => {
    const sb = load();
    expect(sb.clamp('999999', typeOf(sb, 'xpThreshold'))).toBe(100);
  });

  it('falls back to the default for non-numeric input', () => {
    const sb = load();
    const xp = typeOf(sb, 'xpThreshold');
    for (const raw of ['abc', '', null, undefined]) {
      expect(sb.clamp(raw, xp)).toBe(xp.defaultVal);
    }
  });

  it('never returns a value outside the declared range', () => {
    const sb = load();
    const inputs = ['50', '0', '-5', '999999', '1.9', 'abc', '', '1e9', '-0', '  7  ', null, undefined, NaN, Infinity, -Infinity];
    for (const t of sb.TYPES) {
      if (t.id === 'toolQuest') continue;
      for (const raw of inputs) {
        const out = sb.clamp(raw, t);
        expect(Number.isFinite(out), t.id + ' <- ' + String(raw)).toBe(true);
        expect(out).toBeGreaterThanOrEqual(t.minVal);
        expect(out).toBeLessThanOrEqual(t.maxVal);
      }
    }
  });
});

describe('the quest progress bar always renders', () => {
  it('returns 0 rather than NaN for a zero target', () => {
    const sb = load();
    // 0/0 = NaN reached the DOM as width:"NaN%", which browsers drop — so the
    // bar silently rendered full.
    expect(sb.pct(0, 0)).toBe(0);
  });

  it('never returns a negative width', () => {
    const sb = load();
    expect(sb.pct(0, -5)).toBeGreaterThanOrEqual(0);
    expect(sb.pct(-3, 10)).toBeGreaterThanOrEqual(0);
  });

  it('clamps overshoot to 100', () => {
    const sb = load();
    expect(sb.pct(150, 100)).toBe(100);
  });

  it('survives NaN, undefined and Infinity on either side', () => {
    const sb = load();
    for (const [c, t] of [[NaN, 50], [10, NaN], [5, undefined], [undefined, undefined], [Infinity, 10], [10, Infinity]]) {
      const p = sb.pct(c, t);
      expect(Number.isFinite(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });

  it('still computes ordinary progress correctly', () => {
    const sb = load();
    expect(sb.pct(50, 100)).toBe(50);
    expect(sb.pct(1, 4)).toBe(25);
  });

  it('every progress bar in the HUD goes through the guard', () => {
    const src = source();
    // A raw `Math.min(100, x / y * 100)` would reintroduce the NaN path.
    expect(src).not.toMatch(/pct: Math\.min\(100, [^)]*\/[^)]*\* 100\)/);
    expect((src.match(/pct: _questPct\(/g) || []).length).toBe(5);
  });
});

describe('the builder agrees with itself', () => {
  it('clamps in the input, the preview and the Add handler', () => {
    const src = source();
    // All three must use the same clamp, or the preview promises a value the
    // saved quest will not have.
    expect((src.match(/_clampQuestParam\(/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  it('shows the accepted range next to the field', () => {
    const src = source();
    // A silently clamped value looks like the field ignoring what was typed.
    const at = src.indexOf("'(' + (qtDef.minVal || 1)");
    expect(at, 'range hint is gone').toBeGreaterThanOrEqual(0);
    expect(src.slice(at, at + 120)).toContain('qtDef.maxVal');
  });

  it('keeps the range hint ASCII-only, like the rest of the module', () => {
    const src = source();
    const at = src.indexOf("'(' + (qtDef.minVal || 1)");
    const line = src.slice(at, src.indexOf('\n', at));
    // This file escapes non-ASCII (–) rather than embedding raw bytes; a
    // stray literal here is the kind of thing that survives until an encoding
    // round-trip mangles it.
    // eslint-disable-next-line no-control-regex
    expect(line).toMatch(/^[\x00-\x7F]*$/);
  });

  it('puts the range in the accessible name too', () => {
    const src = source();
    expect(src).toMatch(/'aria-label': qtDef\.paramLabel \+ ' for quest, '/);
  });
});
