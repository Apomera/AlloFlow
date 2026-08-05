// Titration Lab — do the strings the tool asks for actually exist in the language packs?
//
// WHY THIS EXISTS
// Every user-facing string goes through `__alloT('stem.titration.<key>', 'English')`.
// If the key is absent from the loaded pack, ctx.t falls back to the English literal —
// silently. A student on a French device sees English, nothing throws, no gate fires,
// and no screenshot looks wrong. The failure mode of i18n is invisible, which is
// exactly why it needs a test rather than a review.
//
// HOW THE PACKS ARE SHAPED, because it is a trap
// lang/*.js are NESTED JSON despite the extension: `stem.titration.foo` lives at
// `pack.stem.titration.foo`, NOT as a literal dotted string. Grepping a pack for
// "stem.titration" therefore finds nothing and looks like zero coverage when coverage
// is in fact good. (I made exactly that mistake and reported it before catching it.)
//
// THE RATCHET
// tests/fixtures/titration_i18n_baseline.json records, per pack, how many requested
// keys are still untranslated. Those numbers may only go DOWN. Adding an untranslated
// string fails the build; translating one fails until the baseline is refreshed, so it
// cannot rot. Same contract as dev-tools/free_vars_baseline.json.
//
// The PPS cluster (acholi, karen, chin_hakha, chin_falam, marshallese, lao, maay_maay)
// is INTENTIONAL English passthrough per lang/PACK_QUALITY_STATUS.md and is excluded —
// asserting on it would pressure someone into machine-translating languages the
// project deliberately chose to leave in English.

import fs from 'node:fs';
import { describe, it, expect } from 'vitest';

const TOOL = 'stem_lab/stem_tool_titration.js';
const EN_SOURCE = 'dev-tools/i18n/stem_titration_en.json';
const BASELINE = 'tests/fixtures/titration_i18n_baseline.json';

const src = fs.readFileSync(TOOL, 'utf8');
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const englishSource = JSON.parse(fs.readFileSync(EN_SOURCE, 'utf8'));

function requestedKeys() {
  const keys = new Set();
  const re = /__alloT\(\s*'stem\.titration\.([A-Za-z0-9_]+)'/g;
  let m;
  while ((m = re.exec(src))) keys.add(m[1]);
  return keys;
}
// Parsed once per run, not once per assertion. Each pack is ~2.6 MB of JSON and there
// are 56 of them; re-reading inside every `it` meant ~145 MB parsed per test, which
// tipped past the 5 s default timeout whenever anything else was using the disk and
// made this file fail intermittently for reasons that had nothing to do with i18n.
const _packCache = new Map();
function packTitration(name) {
  if (!_packCache.has(name)) {
    const pack = JSON.parse(fs.readFileSync('lang/' + name + '.js', 'utf8'));
    _packCache.set(name, (pack.stem && pack.stem.titration) || {});
  }
  return _packCache.get(name);
}
// Warmed HERE, at import, rather than lazily inside the first assertion that happens
// to need it. Whichever test parsed first was wearing the whole ~145 MB cost and
// tipping past the 5 s per-test timeout under full-suite load — a failure that looked
// like an i18n regression and was really just I/O. Import time is measured separately
// and is not subject to testTimeout.
for (const name of Object.keys(baseline.pack_missing)) packTitration(name);
packTitration('french');
function missingIn(name, requested) {
  const have = packTitration(name);
  return [...requested].filter((k) => !have[k]);
}

describe('titration i18n coverage', () => {
  it('the packs really are nested, not dotted', () => {
    // If the pack shape ever flattens, every assertion below would silently start
    // reporting total failure — this is the canary for that.
    expect(fs.readFileSync('lang/french.js', 'utf8')).not.toContain('"stem.titration.');
    expect(Object.keys(packTitration('french')).length).toBeGreaterThan(300);
  });

  it('the extracted English source is in step with the tool', () => {
    // apply_stem_tool_translations.cjs only injects keys present in this file, so a
    // stale extract silently drops new strings from every translation batch.
    const requested = requestedKeys();
    const stale = [...requested].filter((k) => englishSource[k] === undefined);
    expect(stale,
      stale.length ? `re-run dev-tools/i18n/extract_stem_tool_en.cjs titration — missing: ${stale.join(', ')}` : '')
      .toEqual([]);
  });

  it('every requested key has a literal English fallback', () => {
    const bare = [];
    const re = /__alloT\(\s*'stem\.titration\.([A-Za-z0-9_]+)'\s*([,)])/g;
    let m;
    while ((m = re.exec(src))) if (m[2] === ')') bare.push(m[1]);
    expect(bare, 'keys used with no English fallback: ' + bare.join(', ')).toEqual([]);
  });

  // A fallback built by concatenation — t(key, 'text ' + value + ' more') — passes ONE
  // already-joined string as the default. The moment a pack supplies that key, ctx.t
  // returns the pack string and the interpolated value silently disappears. Split the
  // literal into head/tail keys and concatenate outside the call instead.
  it('no fallback is a runtime-computed concatenation', () => {
    const re = new RegExp("__alloT\\(\\s*'stem\\.titration\\.([A-Za-z0-9_]+)'\\s*,\\s*'(?:[^'\\\\]|\\\\.)*'\\s*\\+", 'g');
    const computed = new Set();
    let m;
    while ((m = re.exec(src))) computed.add(m[1]);
    expect([...computed],
      computed.size
        ? 'translating these would delete the interpolated value: ' + [...computed].join(', ')
        : '').toEqual([]);
  });

  // A prose literal concatenated straight onto a translated fragment produces a
  // half-translated sentence: "…lu depuis 10.0 cm above le ménisque…". It renders in
  // every non-English pack, a screen reader reads it aloud verbatim, and no gate,
  // snapshot or render test notices. This is the same failure class the repo already
  // guards for alerts.*/confirms.* — the guard just never covered composed UI strings.
  it('splices no raw English into a translated sentence', () => {
    // Only prose counts. Units, symbols, formulae, punctuation and separators are
    // language-neutral and are concatenated on purpose.
    // Adjacency alone is too narrow: the original bug was a ternary
    // (cond ? 'above' : 'below') sitting BETWEEN two __alloT calls, so nothing was
    // directly next to a `+`. Instead, take any line that builds a translated string,
    // remove the __alloT(...) calls (their English fallbacks are legitimate), and
    // flag whatever prose literals are left over.
    const PROSE = /[A-Za-z]{3,}/;
    const NEUTRAL = /^[\s\d.,:;()\[\]+\-×·—–%/]*$|^ ?(mL|mm|cm|V|M|pH|mol\/L|N|s)\.? ?$/;
    // Contexts where an English literal is correct: CSS, DOM plumbing, and the AI
    // tutor's prompt, which is written FOR the model and must stay English.
    const EXEMPT = /className|classname|class:|aria-controls|aria-pressed|data-|role:|style|key:|\bid:|getElementById|querySelector|Explain this titration|REDOX titration followed with a platinum/;
    // JSX prop NAMES are string literals too, and are not prose.
    const PROP_NAME = /^(aria-[a-z]+|data-[a-z-]+|className|htmlFor|role|tabIndex|scope|type|href|title)$/;
    const offenders = [];
    src.split('\n').forEach((ln, i) => {
      if (!ln.includes('__alloT(') || EXEMPT.test(ln)) return;
      const stripped = ln.replace(/__alloT\((?:[^()]|\([^()]*\))*\)/g, '@');
      // Concatenation is the risk, and it has to be detected as SYNTAX. Testing the
      // raw line for '+' matched string CONTENT instead — "…for 15+ min" in the
      // question bank — and dragged in every data object. A translated call is only
      // building a sentence if the stripped line joins it with an operator.
      if (!/@\s*\+|\+\s*@/.test(stripped)) return;
      const lits = stripped.match(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g) || [];
      for (const raw of lits) {
        const lit = raw.slice(1, -1);
        if (NEUTRAL.test(lit) || PROP_NAME.test(lit) || !PROSE.test(lit)) continue;
        offenders.push(`${i + 1}: ${JSON.stringify(lit.slice(0, 60))}`);
      }
    });
    expect(offenders,
      offenders.length
        ? 'English spliced into translated sentences — give each clause its own key:\n  '
          + offenders.join('\n  ')
        : '').toEqual([]);
  });

  it('coverage never regresses in any pack', () => {
    const requested = requestedKeys();
    const worse = [];
    for (const [pack, allowed] of Object.entries(baseline.pack_missing)) {
      const now = missingIn(pack, requested).length;
      if (now > allowed) worse.push(`${pack}: ${now} missing, baseline allows ${allowed}`);
    }
    expect(worse, worse.length ? 'i18n coverage regressed:\n  ' + worse.join('\n  ') : '').toEqual([]);
  });

  it('the baseline is refreshed when a pack is finished', () => {
    const requested = requestedKeys();
    const stale = [];
    for (const [pack, allowed] of Object.entries(baseline.pack_missing)) {
      const now = missingIn(pack, requested).length;
      if (now < allowed) stale.push(`${pack}: now ${now} missing but baseline still says ${allowed}`);
    }
    expect(stale,
      stale.length
        ? `regenerate ${BASELINE} so the ratchet cannot rot:\n  ` + stale.join('\n  ')
        : '').toEqual([]);
  });

  it('the packs listed complete really are complete', () => {
    const requested = requestedKeys();
    for (const pack of baseline.complete) {
      expect(missingIn(pack, requested), `${pack} is listed complete but is not`).toEqual([]);
    }
    expect(baseline.complete.length).toBeGreaterThan(0);
  });

  it('leaves the intentional English-passthrough packs alone', () => {
    // Guards against a well-meaning future sweep filling these in.
    for (const pack of baseline.pps_excluded) {
      expect(baseline.pack_missing[pack], `${pack} is PPS passthrough and must not be ratcheted`)
        .toBeUndefined();
    }
  });

  it('translated packs keep the fragments joinable to the value that follows', () => {
    // Many of these strings are sentence fragments concatenated at runtime, so an
    // English fragment ending in a space MUST stay joinable in translation or two
    // tokens fuse into one word.
    //
    // A trailing space is not the only correct way to satisfy that. Hebrew attaches
    // the prefixes ב־ / מ־ ("by", "from") directly to the following number — "ב‑0.167"
    // is right and "ב‑ 0.167" is wrong — so a trailing hyphen/maqaf counts as joined.
    const JOINABLE = /[\s־‐‑-]$/;
    const offenders = [];
    for (const pack of baseline.complete) {
      const t = packTitration(pack);
      for (const [k, en] of Object.entries(englishSource)) {
        if (!t[k]) continue;
        if (/\s$/.test(en) && !JOINABLE.test(t[k])) offenders.push(`${pack}.${k}`);
        if (!/\s$/.test(en) && /\s$/.test(t[k])) offenders.push(`${pack}.${k} (unexpected trailing space)`);
      }
    }
    expect(offenders, offenders.length ? 'fragment-join drift: ' + offenders.join(', ') : '').toEqual([]);
  });

  it('translated packs keep chemical formulae and units intact', () => {
    const TOKENS = ['Fe³⁺', 'Fe²⁺', 'MnO₄⁻', 'Mn²⁺', 'H₂SO₄', 'pKa', 'WebGL'];
    const dropped = [];
    for (const pack of baseline.complete) {
      const t = packTitration(pack);
      for (const [k, en] of Object.entries(englishSource)) {
        if (!t[k]) continue;
        for (const tok of TOKENS) if (en.includes(tok) && !t[k].includes(tok)) dropped.push(`${pack}.${k}:${tok}`);
      }
    }
    expect(dropped, dropped.length ? 'formulae lost in translation: ' + dropped.join(', ') : '').toEqual([]);
  });
});
