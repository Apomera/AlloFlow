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

// ── The Rock Cycle machine's teaching content ──
//
// `stem.rock_cycle` held exactly three keys — the three agent names — while
// RC_TRANSFORMS carried every product, condition, timescale, explanation,
// field-evidence line and stage caption as bare English. That is the entire
// scientific payload of the transformation machine, unreachable by any pack.
describe('the transformation machine speaks through the translator', () => {
  const src = () => readFileSync('stem_lab/stem_tool_rocks.js', 'utf8');

  /** The real table, evaluated rather than regex-parsed: the prose carries
   *  apostrophes, em dashes, arrows and subscripts, and a parser that got any
   *  of them wrong would compare against truncated English. */
  function transforms() {
    const s = src();
    const at = s.indexOf('var RC_TRANSFORMS = {');
    expect(at, 'RC_TRANSFORMS').toBeGreaterThan(-1);
    const open = s.indexOf('{', at);
    const BACKSLASH = String.fromCharCode(92);
    let depth = 0, end = -1, inStr = null;
    for (let i = open; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (ch === BACKSLASH) { i++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    expect(end).toBeGreaterThan(open);
    return new Function('return (' + s.slice(open, end + 1) + ')')();
  }

  it('localizes through the one lookup every consumer already used', () => {
    const s = src();
    expect(s).toContain("var base = 'stem.rock_cycle.tx_' + specimenId + '_' + agentId + '_';");
    expect(s).toContain("out.stages = rec.stages.map(function (stage, i) { return __alloT(base + 'stage' + i, stage); });");
    // family and texture are ids the renderer switches on; translating them
    // would break the drawing, so they must stay out of the text list.
    const list = /const RC_TX_TEXT = \[([^\]]+)\]/.exec(s);
    expect(list, 'RC_TX_TEXT').toBeTruthy();
    expect(list[1]).not.toContain('family');
    expect(list[1]).not.toContain('texture');
  });

  it('has a catalogue key for every string the table ships', () => {
    const table = transforms();
    const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.rock_cycle;
    const TEXT = ['product', 'process', 'conditions', 'time', 'change', 'evidence', 'caveat'];
    let checked = 0;
    Object.keys(table).forEach((specId) => {
      Object.keys(table[specId]).forEach((agentId) => {
        const rec = table[specId][agentId];
        const base = 'tx_' + specId + '_' + agentId + '_';
        TEXT.forEach((k) => {
          if (typeof rec[k] !== 'string') return;
          expect(strings[base + k], base + k).toBe(rec[k]);
          checked++;
        });
        (rec.stages || []).forEach((st, i) => {
          expect(strings[base + 'stage' + i], base + 'stage' + i).toBe(st);
          checked++;
        });
      });
    });
    // Non-vacuous: the table really does carry this much prose.
    expect(checked).toBeGreaterThan(200);
  });

  it('paints no bare label on the rock-cycle canvas either', () => {
    const s = src();
    expect(s).toContain("__alloT('stem.rock_cycle.canvas_badge', 'Rock Cycle')");
    expect(s).not.toContain("ctx.fillText('\u{1FAA8} Rock Cycle'");
  });
});
