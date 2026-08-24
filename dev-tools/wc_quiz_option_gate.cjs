// Gate: within one quiz question, the four option strings must stay DISTINCT
// in every language.
//
//   node dev-tools/wc_quiz_option_gate.cjs [slug ...]      (default: all packs)
//
// WHY THIS IS A CORRECTNESS GATE, NOT A STYLE CHECK.
// stem_tool_watercycle.js decides correctness by comparing STRINGS:
//
//     var correct = opt === d.wcQuiz.a;          // a = opts[correctIndex]
//     wrongFeedback[opts[i]] = feedback[i];      // keyed by option TEXT
//     h('button', { key: opt, ... })             // React key is the text
//
// So if a translation renders two options of the same question identically:
//   1. a WRONG option compares equal to the correct answer and scores as
//      correct - the student is told they are right when they are not;
//   2. the wrongFeedback map silently loses an entry, so the teaching feedback
//      for one distractor disappears;
//   3. two React children share a key.
// English cannot hit this (the authored options differ), which is exactly why
// it has to be checked per language: it is introduced by translation alone.
//
// Resolution order mirrors the host: pack -> master. A key absent from the pack
// renders the master's English, so the comparison must be done on the RESOLVED
// text, not on the pack file in isolation.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const master = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')).stem.watercycle;

// Question ids come from the key names the tool actually uses: <qid>_opt1..4.
const qids = [...new Set(
  Object.keys(master)
    .map((k) => /^(quiz_.+)_opt[1-4]$/.exec(k))
    .filter(Boolean)
    .map((m) => m[1])
)].sort();

const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(ROOT, 'lang'))
      .filter((f) => f.endsWith('.js') && !f.includes('.bak'))
      .map((f) => f.replace(/\.js$/, ''));

let violations = 0;
let checked = 0;

for (const slug of slugs) {
  const packPath = path.join(ROOT, 'lang', slug + '.js');
  if (!fs.existsSync(packPath)) { console.error(`missing pack: ${slug}`); process.exitCode = 1; continue; }
  const wc = (JSON.parse(fs.readFileSync(packPath, 'utf8')).stem || {}).watercycle || {};
  const resolve = (k) => (typeof wc[k] === 'string' && wc[k].length ? wc[k] : master[k]);

  for (const qid of qids) {
    const opts = [1, 2, 3, 4]
      .map((n) => resolve(qid + '_opt' + n))
      .filter((v) => typeof v === 'string' && v.length);
    if (opts.length < 2) continue;
    checked++;
    const seen = new Map();
    for (let i = 0; i < opts.length; i++) {
      const norm = opts[i].trim();
      if (seen.has(norm)) {
        violations++;
        console.log(
          `COLLISION ${slug} ${qid}: opt${seen.get(norm) + 1} and opt${i + 1} both render ` +
          JSON.stringify(norm.slice(0, 70))
        );
      } else {
        seen.set(norm, i);
      }
    }
  }
}

console.log(`\nwc_quiz_option_gate: ${qids.length} questions x ${slugs.length} pack(s), ` +
  `${checked} question-renderings checked, ${violations} collision(s).`);
if (violations) process.exitCode = 1;
