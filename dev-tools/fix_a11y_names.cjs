#!/usr/bin/env node
/**
 * Propose (and optionally apply) an aria-label for each control that
 * scan_a11y_names.cjs flags, sourced from the control's own visible caption.
 *
 * PLAN mode by default — writes nothing. Pass --apply to write.
 *
 * WHY OFFSETS, NOT LINE NUMBERS
 * The first version of this searched backwards from the start of the flagged
 * LINE. That works only when the label sits on its own line. Where a row is
 * written inline —
 *     h('div', null, h('label', ..., 'Pay Period'), h('select', {...}))
 * — searching from the line start skips past this row's own label and finds the
 * PREVIOUS row's, so every control in the block gets its neighbour's name. It
 * proposed "Hours worked per week" for the Pay Period select. A wrong accessible
 * name is worse than a missing one: it confidently tells a screen reader user
 * the wrong thing. So the scanner now emits a byte offset for each finding and
 * the search starts exactly at the element call.
 *
 * WHERE THE NAME COMES FROM
 * A <label> used as a visual caption with no htmlFor, beside an input with no
 * id, is the dominant defect here — the text is already written and already
 * translated. This lifts it.
 *
 * When the caption is `__alloT('some.key', 'Fallback')` the SAME call is reused,
 * so the accessible name tracks the visible one in every locale; hardcoding the
 * English fallback would quietly make these controls English-only.
 *
 * Captions that interpolate a live value — `'n1 (incident): ' + n1.toFixed(3)` —
 * contribute their static prefix only. A range input already announces its own
 * value, so carrying it into the name would double it up.
 *
 * Anything unresolved is listed as SKIP and left untouched.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function findingsFor(file) {
  const out = execFileSync(process.execPath,
    [path.join(__dirname, 'scan_a11y_names.cjs'), file, '--json'], { encoding: 'utf8' });
  const parsed = JSON.parse(out.trim() || '[]');
  return parsed.length ? parsed[0].findings : [];
}

/** Trim a caption down to a name: drop trailing colon and surrounding space. */
function tidy(s) {
  return s.replace(/\s*[:：]\s*$/, '').trim();
}

/**
 * Nearest caption before `at`: the text child of the closest preceding
 * label/span/div element call. Returns the SOURCE expression, so an __alloT()
 * call is carried through verbatim rather than flattened to English.
 */
function captionBefore(src, at) {
  const start = Math.max(0, at - 700);
  const window = src.slice(start, at);
  const tagRe = /(?:createElement|\bh)\(\s*["'](label|span|div)["']\s*,/g;
  let last = null;
  let m;
  while ((m = tagRe.exec(window)) !== null) last = m;
  if (!last) return null;
  const after = window.slice(last.index);

  // __alloT('key', 'Fallback') — reuse the whole call so it stays translated.
  //
  // The `t(...)` alias has to be matched too. Several tools bind translation to
  // a local `t` (economicslab, and others), and matching only __alloT quietly
  // fell through to the plain-string branch — which would have frozen the
  // English fallback into the aria-label and left the control untranslated in
  // every other locale, while looking perfectly fine in review.
  const tr = after.match(
    /((?:__alloT|\bt)\(\s*(["'])(?:\\.|(?!\2).)*\2\s*,\s*(["'])((?:\\.|(?!\3).)*)\3\s*\))/);
  if (tr) return { expr: tr[1], text: tr[4], translated: true };

  // A plain string child, terminated by ')' (bare) or '+' (concatenated).
  const strs = [...after.matchAll(/,\s*(["'])((?:\\.|(?!\1).)*)\1\s*(\)|\+)/g)];
  if (strs.length) {
    const raw = tidy(strs[strs.length - 1][2]);
    if (raw && raw.length <= 60 && /[a-zA-Z]/.test(raw)) {
      return { expr: JSON.stringify(raw), text: raw, translated: false };
    }
  }
  return null;
}

let planned = 0;
let skipped = 0;

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log(`missing: ${rel}`); continue; }
  const src = fs.readFileSync(abs, 'utf8');
  const findings = findingsFor(rel);
  const edits = [];

  for (const f of findings) {
    const cap = captionBefore(src, f.at);
    if (!cap) { edits.push({ ...f, skip: true }); continue; }
    edits.push({ ...f, ...cap });
  }

  console.log(`\n${rel}`);
  edits.forEach((e) => {
    if (e.skip) console.log(`  ${String(e.line).padStart(6)}  SKIP`);
    else console.log(`  ${String(e.line).padStart(6)}  ${e.translated ? 'i18n' : '    '}  "${e.text}"`);
  });
  const doable = edits.filter((e) => !e.skip);
  planned += doable.length;
  skipped += edits.length - doable.length;
  console.log(`  -> ${doable.length} nameable, ${edits.length - doable.length} skipped`);

  if (!APPLY || !doable.length) continue;

  // Bottom-up, so earlier offsets stay valid as text is inserted.
  let out = src;
  doable.sort((a, b) => b.at - a.at).forEach((e) => {
    const brace = out.indexOf('{', e.at);
    if (brace === -1) return;
    out = out.slice(0, brace + 1) + ` 'aria-label': ${e.expr},` + out.slice(brace + 1);
  });
  fs.writeFileSync(abs, out);
  console.log(`  APPLIED`);
}

console.log(`\n${planned} nameable, ${skipped} skipped${APPLY ? ' (written)' : ' (plan only)'}`);
