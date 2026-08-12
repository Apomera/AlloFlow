#!/usr/bin/env node
/**
 * Find the controls the STEM Lab a11y reporter (stem_lab_module.js:2792) would
 * flag, but from SOURCE rather than from a render.
 *
 * The reporter only sees what is currently on screen. A tool's fifth tab, an
 * error state, a modal that opens on a rare branch — none of those are reachable
 * without driving every tool into every state, so a runtime list systematically
 * under-reports. This scans instead.
 *
 * WHAT IT CANNOT SEE, and why the counts are a floor rather than a total:
 *   - Props spread from a variable (`h('input', propsVar)`) — the attribute may
 *     be there and this cannot follow it. Reported as `unresolved`, not as a
 *     finding, so a spread never inflates the number.
 *   - Names supplied at runtime (a `<label for>` matched by id, aria-labelledby
 *     pointing at a sibling). `id` and `aria-labelledby` are both treated as
 *     "possibly named elsewhere" and excluded, matching the reporter's own
 *     :not([id]) / :not([aria-labelledby]) selectors.
 *
 * Usage:  node dev-tools/scan_a11y_names.cjs [glob-ish path ...]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// tag -> the attribute that would give it a name
const RULES = {
  select: { attrs: ['aria-label', 'aria-labelledby', 'id'], rule: 'select-unlabelled' },
  input:  { attrs: ['aria-label', 'aria-labelledby', 'id'], rule: 'input-unlabelled' },
  canvas: { attrs: ['aria-label', 'aria-labelledby'], rule: 'canvas-unnamed' },
  img:    { attrs: ['alt'], rule: 'img-no-alt' },
};

/** Walk from the opening brace of a props object to its matching close. */
function propsSlice(src, openIdx) {
  let depth = 0;
  let inStr = null;
  // 40k, not 8k: several tools inline an entire canvas drawing routine into the
  // element's own `ref` handler, so the props object legitimately runs tens of
  // thousands of characters. At 8k those all came back unjudged — and most of
  // them turned out to already carry role="img" and a label.
  for (let i = openIdx; i < src.length && i < openIdx + 40000; i += 1) {
    const c = src[i];
    const prev = src[i - 1];
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  return null;
}

/** Walk from an opening paren to its match, string-aware and window-capped. */
function matchParen(src, openIdx) {
  let depth = 0;
  let inStr = null;
  const limit = Math.min(src.length, openIdx + 20000);
  for (let i = openIdx; i < limit; i += 1) {
    const c = src[i];
    const prev = src[i - 1];
    if (inStr) {
      if (c === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return null;
}

/**
 * Is this call site nested inside a <label> element?
 *
 * `h('label', {...}, h('input', {type:'checkbox'}), 'Show grid')` is IMPLICITLY
 * associated — correctly accessible, with no id or aria-label for an attribute
 * scan to see. Counting those as defects took an early run of this scanner from
 * a real number to 463, of which the great majority were checkboxes sitting
 * inside their own label.
 *
 * Only a provable nesting suppresses a finding; anything unprovable stays in the
 * list, so the failure mode is a false alarm rather than a missed defect.
 */
function insideLabel(src, idx) {
  const re = /(?:createElement|\bh)\(\s*["']label["']\s*[,)]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > idx) break;
    const open = src.indexOf('(', m.index);
    if (open === -1) continue;
    const close = matchParen(src, open);
    if (close !== null && close > idx) return true;
  }
  return false;
}

/**
 * Is this call site inside an element marked aria-hidden?
 *
 * A decorative canvas under an aria-hidden wrapper is already out of the
 * accessibility tree and needs no name — flagging it sends someone to write a
 * description for something no assistive tech will ever reach.
 */
function insideAriaHidden(src, idx) {
  // Both spellings occur: 'aria-hidden': 'true' (string) and 'aria-hidden': true
  // (boolean). Matching only the quoted form reported a display:none file input
  // with tabIndex -1 as an unnamed control — a name for something deliberately
  // removed from the tree and unreachable by any user.
  const re = /["']aria-hidden["']\s*:\s*(?:["']true["']|true\b)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > idx) break;
    // Walk back to the element call that owns these props.
    const before = src.slice(Math.max(0, m.index - 400), m.index);
    const call = [...before.matchAll(/(?:createElement|\bh)\(/g)].pop();
    if (!call) continue;
    const open = Math.max(0, m.index - 400) + call.index + call[0].length - 1;
    const close = matchParen(src, open);
    if (close !== null && close > idx) return true;
  }
  return false;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const findings = [];
  const unresolvedAt = [];
  let unresolved = 0;
  let implicit = 0;

  for (const [tag, cfg] of Object.entries(RULES)) {
    // Both call styles used in this codebase.
    const re = new RegExp(`(?:createElement|\\bh)\\(\\s*["']${tag}["']\\s*,`, 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const after = src.slice(m.index + m[0].length, m.index + m[0].length + 40);
      const braceOffset = after.indexOf('{');
      // No literal props object => spread/variable/null. Cannot judge it.
      if (braceOffset === -1 || after.slice(0, braceOffset).trim().length > 0) {
        // `null` props means definitively no attributes -> that IS a finding.
        if (/^\s*null\s*[,)]/.test(after)) {
          findings.push({ tag, rule: cfg.rule, line: lineOf(src, m.index), at: m.index, why: 'null props' });
        } else {
          unresolved += 1;
          unresolvedAt.push({ tag, line: lineOf(src, m.index) });
        }
        continue;
      }
      const props = propsSlice(src, m.index + m[0].length + braceOffset);
      if (props === null) {
        // Brace matching ran past its window without closing — usually a props
        // object with an enormous inline handler. Counted as unjudged, never as
        // clean, so a parse failure cannot masquerade as a pass.
        unresolved += 1;
        unresolvedAt.push({ tag, line: lineOf(src, m.index) });
        continue;
      }
      const named = cfg.attrs.some((a) => new RegExp(`["']?${a}["']?\\s*:`).test(props));
      if (!named) {
        // A hidden input is not exposed to anyone and needs no name.
        if (/type\s*:\s*["']hidden["']/.test(props)) continue;
        // aria-hidden on the element ITSELF, not an ancestor — insideAriaHidden
        // only walks outwards, so without this a self-hidden control is still
        // reported. Both the string and boolean spellings occur.
        if (/["']aria-hidden["']\s*:\s*(?:["']true["']|true\b)/.test(props)) continue;
        // Wrapped in its own <label> — implicitly associated, genuinely fine.
        if (insideLabel(src, m.index)) { implicit += 1; continue; }
        // Decorative and already out of the accessibility tree.
        if (insideAriaHidden(src, m.index)) { implicit += 1; continue; }
        const ph = props.match(/placeholder\s*:\s*(["'])((?:\\.|(?!\1).)*)\1/);
        findings.push({
          tag,
          rule: cfg.rule,
          line: lineOf(src, m.index),
          at: m.index,
          why: ph ? `placeholder only: "${ph[2].slice(0, 46)}"` : 'no name attribute',
        });
      }
    }
  }
  return { findings, unresolved, unresolvedAt, implicit };
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const targets = args.filter((a) => !a.startsWith('--')).length
  ? args.filter((a) => !a.startsWith('--'))
  : ['stem_lab/stem_lab_module.js'];

let total = 0;
let totalUnresolved = 0;
let totalImplicit = 0;
const allUnresolved = [];
const byRule = {};
const byFile = [];

for (const t of targets) {
  const abs = path.join(ROOT, t);
  if (!fs.existsSync(abs) || !abs.endsWith('.js')) continue;
  const { findings, unresolved, unresolvedAt, implicit } = scanFile(abs);
  totalUnresolved += unresolved;
  totalImplicit += implicit;
  unresolvedAt.forEach((u) => allUnresolved.push(`${t}:${u.line} <${u.tag}>`));
  if (!findings.length) continue;
  total += findings.length;
  byFile.push({ file: t, findings });
  findings.forEach((f) => { byRule[f.rule] = (byRule[f.rule] || 0) + 1; });
}

if (JSON_OUT) { console.log(JSON.stringify(byFile)); process.exit(0); }
byFile.sort((a, b) => b.findings.length - a.findings.length);
for (const { file, findings } of byFile) {
  console.log(`\n${file}  (${findings.length})`);
  findings
    .sort((a, b) => a.line - b.line)
    .forEach((f) => console.log(`  ${String(f.line).padStart(6)}  ${f.rule.padEnd(20)} ${f.why}`));
}

console.log('\n── summary ──');
Object.keys(byRule).sort().forEach((r) => console.log(`  ${r.padEnd(20)} ${byRule[r]}`));
console.log(`  ${'TOTAL'.padEnd(20)} ${total}`);
console.log(`  (${totalUnresolved} unjudgeable, ${totalImplicit} correctly wrapped in their own <label>)`);
if (allUnresolved.length && (allUnresolved.length <= 40 || args.includes('--unjudged'))) {
  allUnresolved.forEach((u) => console.log(`    unjudged: ${u}`));
}
process.exit(0);
