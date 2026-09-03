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

// ── The accessibility layer is user-facing text too ──
//
// Seven screen-reader announcements and the texture gloss shipped as bare
// English literals that no language pack could reach. The gloss is what a
// screen reader reads INSTEAD of the specimen picture, so in any other
// language the rock grid was unusable.
describe('screen-reader text goes through the translator like everything else', () => {
  const src = () => readFileSync('stem_lab/stem_tool_rocks.js', 'utf8');

  it('finds the announcements at all, so the check below is not vacuous', () => {
    expect((src().match(/announceToSR\(/g) || []).length).toBeGreaterThan(8);
  });

  it('never passes a bare English literal to announceToSR', () => {
    const bare = [];
    const re = /announceToSR\(\s*(['"])/g;
    const s = src();
    let m;
    while ((m = re.exec(s))) {
      // A localized call opens with __alloT(, a variable, or a template of one.
      bare.push(s.slice(m.index, m.index + 90));
    }
    expect(bare, `bare literal(s) passed to announceToSR:\n${bare.join('\n')}`).toEqual([]);
  });

  it('reads every texture gloss through the translator, in one place', () => {
    const s = src();
    expect(s).toContain("return __alloT('stem.rocks.texture_gloss_' + texture, english);");
    // Exactly three mentions survive: the table, the comment naming it, and the
    // single lookup inside rkGloss. Any fourth is a call site that skipped it.
    expect((s.match(/RK_TEXTURE_GLOSS/g) || []).length).toBe(3);
  });

  it('has a catalogue key for every gloss the table defines', () => {
    const s = src();
    const at = s.indexOf('var RK_TEXTURE_GLOSS = {');
    const block = s.slice(at, s.indexOf('};', at));
    const ids = [...block.matchAll(/'([\w-]+)':\s*'/g)].map((x) => x[1]);
    expect(ids.length).toBeGreaterThan(10);
    const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    ids.forEach((id) => {
      expect(strings.stem.rocks, `texture_gloss_${id}`).toHaveProperty('texture_gloss_' + id);
    });
  });
});
