// Which tools did scan_answer_position_bias.cjs clear on evidence that is not real?
//
//   node dev-tools/verify_bias_clearance.cjs [--show <tool>]
//
// The scanner excuses a biased bank when `hasShuffle` is true. That flag is two
// tests OR'd together:
//   A. a shuffle keyword  — /Fisher|shuffle|Shuffle|sort(function(){return Math.random/
//   B. a rotation RECIPE  — /\*\s*\d+\s*\)?\s*\+\s*\d+\s*\)?\s*%/
// Test B matches ANY `* n + m %` arithmetic ANYWHERE in the file. In a large tool
// that shape turns up in hash functions, LCGs, canvas layout, shader maths and
// colour ramps, none of which touch the quiz bank. Galaxy was cleared that way on
// 2026-08-23 while containing no shuffle at all: 20 questions with the answer at A
// exactly once.
//
// This re-runs the same two tests separately, and for anything cleared by B alone
// prints the matching expressions so the clearance can be judged rather than
// assumed. It reports only; it changes nothing.
const fs = require('fs');
const path = require('path');

const DIR = 'stem_lab';
const SHOW = process.argv.includes('--show') ? process.argv[process.argv.indexOf('--show') + 1] : null;

const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const SHUFFLE = /Fisher|shuffle|Shuffle|sort\(\s*function\s*\(\s*\)\s*\{\s*return\s+Math\.random/;
const ROTATION = /\*\s*\d+\s*\)?\s*\+\s*\d+\s*\)?\s*%/;
// A rotation that actually neutralises a bank has to be APPLIED to it: some map
// over the questions, or an assignment of a rotated options array.
const APPLIED = /(?:options|opts|answers|choices)\s*[:=]\s*rotated|rotate[A-Za-z]*\s*\(|\.map\(\s*function\s*\([^)]*\)\s*\{\s*return\s+[a-zA-Z]*[Rr]otate/;

const rows = [];
for (const f of fs.readdirSync(DIR).filter((x) => /^stem_tool_.*\.js$/.test(x))) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const code = stripComments(raw);
  const byShuffle = SHUFFLE.test(code);
  const byRotation = ROTATION.test(code);
  if (!byShuffle && !byRotation) continue; // scanner would already hard-flag these
  const applied = APPLIED.test(code);
  // collect what the rotation regex actually matched, for judgement
  const hits = [];
  const re = new RegExp(ROTATION.source, 'g');
  let m;
  while ((m = re.exec(code)) && hits.length < 4) {
    const at = m.index;
    hits.push(code.slice(Math.max(0, at - 60), at + 40).replace(/\s+/g, ' ').trim());
  }
  rows.push({ tool: f.replace(/^stem_tool_|\.js$/g, ''), byShuffle, byRotation, applied, hits });
}

const suspect = rows.filter((r) => !r.byShuffle && r.byRotation && !r.applied);
const ok = rows.filter((r) => r.byShuffle || r.applied);

console.log('tools the scanner would excuse: ' + rows.length);
console.log('  cleared by a real shuffle keyword or an APPLIED rotation : ' + ok.length);
console.log('  cleared ONLY by the loose `* n + m %` recipe            : ' + suspect.length);
console.log('');
console.log('=== CLEARED ONLY BY THE LOOSE RECIPE (clearance is unverified) ===');
for (const r of suspect) {
  console.log('  ' + r.tool);
  if (SHOW && SHOW !== r.tool) continue;
  for (const h of r.hits.slice(0, 2)) console.log('        matched: ...' + h + '...');
}
if (!suspect.length) console.log('  none');
console.log('');
console.log('NOTE: this says the CLEARANCE is unverified, not that the tool is biased.');
console.log('Cross-reference the scanner table for which of these actually have a skewed bank.');
