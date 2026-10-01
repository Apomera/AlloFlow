// Per-span language deterministic core (2026-06-14) — the "code-executes" half of
// Beat-Adobe-on-3 §3 (WCAG 3.1.2 Language of Parts; the win Adobe structurally
// cannot match). The Gemini vision pass emits a BCP-47 lang per text span; these
// pure functions are the deterministic floor + guardrail policy around it:
//   - detectScripts()/dominantScript() : Unicode-script detection (the cheap floor
//     that constrains — but does NOT determine — language; script != language).
//   - scriptLangHint() : a conservative lang ONLY for scripts that map ~1:1
//     (Hangul->ko, Hiragana/Katakana->ja, Thai->th, Hebrew->he, Greek->el, ...).
//     Ambiguous scripts (Latin/Arabic/Cyrillic/Han) return null — never guessed.
//   - isRtlScript() : feed the existing RTL detection per span (dir="rtl").
//   - isValidBcp47() : reject malformed tags before writing lang=.
//   - reconcileSpanLang() : the GlotLID/fastText lid.176 GUARDRAIL POLICY as a
//     pure decision — guardrail can only VETO (re-ask), never originate. Short
//     spans + transliteration + mixed-script are exactly where classical LID
//     fails, so we trust the VLM there and only re-ask on a LONG, CONFIDENT
//     disagreement. The actual LID model call is the pipeline's job; this decides.
// Pure JS; ready to wire (NOT wired — doc_pipeline has in-flight concurrent edits).

const SCRIPT_RES = [
  ['Arabic', /\p{Script=Arabic}/u], ['Hebrew', /\p{Script=Hebrew}/u],
  ['Cyrillic', /\p{Script=Cyrillic}/u], ['Greek', /\p{Script=Greek}/u],
  ['Han', /\p{Script=Han}/u], ['Hiragana', /\p{Script=Hiragana}/u],
  ['Katakana', /\p{Script=Katakana}/u], ['Hangul', /\p{Script=Hangul}/u],
  ['Devanagari', /\p{Script=Devanagari}/u], ['Bengali', /\p{Script=Bengali}/u],
  ['Thai', /\p{Script=Thai}/u], ['Ethiopic', /\p{Script=Ethiopic}/u],
  ['Myanmar', /\p{Script=Myanmar}/u], ['Latin', /\p{Script=Latin}/u],
];
// Scripts that map closely enough to one language to be a safe deterministic hint.
const SCRIPT_LANG = { Hangul: 'ko', Hiragana: 'ja', Katakana: 'ja', Thai: 'th', Hebrew: 'he', Greek: 'el', Ethiopic: 'am', Myanmar: 'my', Bengali: 'bn', Devanagari: 'hi' };
const RTL_SCRIPTS = new Set(['Arabic', 'Hebrew']);

export function detectScripts(text) {
  const s = String(text == null ? '' : text);
  const found = [];
  for (const [name, re] of SCRIPT_RES) { if (re.test(s)) found.push(name); }
  return found;
}
export function dominantScript(text) {
  const s = String(text == null ? '' : text);
  let best = null, bestN = 0;
  for (const [name, re] of SCRIPT_RES) {
    const g = new RegExp(re.source, 'gu');
    const n = (s.match(g) || []).length;
    if (n > bestN) { bestN = n; best = name; }
  }
  return best;
}
export function scriptLangHint(text) {
  const sc = dominantScript(text);
  return (sc && SCRIPT_LANG[sc]) || null; // ambiguous scripts → null (never guess)
}
export function isRtlScript(scriptOrText) {
  if (RTL_SCRIPTS.has(scriptOrText)) return true;
  return detectScripts(scriptOrText).some((s) => RTL_SCRIPTS.has(s));
}
// Basic BCP-47 well-formedness (language + optional script/region/variant subtags).
export function isValidBcp47(tag) {
  return typeof tag === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/.test(tag);
}
const baseLang = (t) => (typeof t === 'string' ? t.split('-')[0].toLowerCase() : '');

// The guardrail decision. opts: { shortSpan=25, highConfidence=0.9 }.
// Returns { lang, action } where action ∈ trust-vlm | reask | split | skip-too-short.
export function reconcileSpanLang(input, opts) {
  input = input || {}; opts = opts || {};
  const SHORT = opts.shortSpan || 25;
  const HIGH = opts.highConfidence || 0.9;
  const text = String(input.text == null ? '' : input.text);
  const vlmLang = isValidBcp47(input.vlmLang) ? input.vlmLang : null;
  const hint = scriptLangHint(text);

  if (text.trim().length < 2) return { lang: null, action: 'skip-too-short' };

  // Mixed non-common scripts on one line → split into multiple lang spans
  // (classical LID fails exactly here; so does a single lang= on the span).
  const nonLatinScripts = detectScripts(text).filter((s) => s !== 'Latin');
  if (nonLatinScripts.length >= 2) return { lang: vlmLang || hint, action: 'split' };

  // Short spans: transliteration + brand names + loanwords live here, where LID is
  // unreliable — trust the VLM (or the unambiguous script hint), never re-ask.
  if (text.length < SHORT) return { lang: vlmLang || hint, action: 'trust-vlm' };

  // Long span + a CONFIDENT LID that DISAGREES with the VLM → re-ask the model
  // (the guardrail vetoes, it does not originate). Otherwise trust the VLM.
  const lidLang = isValidBcp47(input.lidLang) ? input.lidLang : null;
  const conf = typeof input.lidConfidence === 'number' ? input.lidConfidence : 0;
  if (lidLang && conf >= HIGH && vlmLang && baseLang(lidLang) !== baseLang(vlmLang)) {
    return { lang: vlmLang, action: 'reask' };
  }
  return { lang: vlmLang || hint, action: 'trust-vlm' };
}
