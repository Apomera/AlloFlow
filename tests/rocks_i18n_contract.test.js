// The rocks tools' two ways of translating a string, and the one that can break.
//
// dev-tools/check_i18n_fallback.cjs documents the host contract: `ctx.t` is a
// SINGLE-ARG translator returning the translation or undefined — it ignores a
// second argument. So the two call styles behave very differently on a miss:
//
//   __alloT('stem.rocks.x', 'English')  — wrapper supplies the fallback itself,
//                                          so a miss still renders English.
//   t('stem.rocks.x')                   — a miss renders the literal "undefined"
//                                          (the moneyMath incident, 74 tools,
//                                          2026-07-04).
//
// Every bare call must therefore resolve against the canonical English. This
// guards the class rather than any one key.
//
// TRAP THIS TEST EXISTS TO AVOID REPEATING: ui_strings.js is NESTED JSON, so the
// literal text "stem.rocks." never appears in it. Grepping for that string finds
// zero and proves nothing — which is exactly how a first pass at this concluded
// the tool shipped 17 "undefined" strings. Resolve the dotted key the way the
// app does (AlloFlowANTI.txt:1748, `key.split('.')`) or do not conclude anything.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const src = readFileSync('stem_lab/stem_tool_rocks.js', 'utf8');

function lookup(key) {
  let cur = strings;
  for (const seg of String(key).split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[seg];
  }
  return typeof cur === 'string' ? cur : undefined;
}

// Bare `t('stem.x.y')` — not preceded by a word char or dot (so __alloT( and
// .t( do not match), and closing immediately, so no fallback argument.
function bareKeys() {
  const out = new Set();
  const re = /(^|[^\w.])t\(\s*'(stem\.[a-z0-9_.]+)'\s*\)/g;
  let m;
  while ((m = re.exec(src))) out.add(m[2]);
  return out;
}

describe('rocks i18n call-style contract', () => {
  it('finds bare t() calls at all — otherwise the check below is vacuous', () => {
    expect(bareKeys().size).toBeGreaterThan(20);
  });

  it('every bare t() key resolves in ui_strings.js, so none can render "undefined"', () => {
    const missing = [...bareKeys()].filter((k) => lookup(k) === undefined).sort();
    expect(
      missing,
      `these are called as bare t() with no fallback and are absent from the\n`
      + `canonical English, so they render the literal string "undefined":\n  `
      + missing.join('\n  ')
    ).toEqual([]);
  });

  it('a key added as bare t() without canonical English would be caught', () => {
    // Proves the resolver, not just the current state: a key that is definitely
    // absent must come back undefined rather than silently resolving.
    expect(lookup('stem.rocks.__definitely_not_a_real_key__')).toBeUndefined();
    expect(lookup('stem.rocks.igneous')).toBe('Igneous');
  });
});
