// Prose in a STEM tool states ratios the tool's own numbers can settle:
// "about 60 times what a human has", "about 21 orders of magnitude", "roughly
// 126 times". Nothing checked them. Two shipped wrong and were found by hand:
//
//   nuclearlab   "span 24 orders of magnitude"  -- its own U-238 chain table
//                spans 164 us to 4.468e9 y, which is 10^20.9, about 21.
//   flightsim    "about 50 times faster than highway speeds" -- the nearest
//                antecedent (SR-71, 2,200 mph) is ~34x a 65 mph highway, and
//                the X-43 is ~108x. 50 matched neither reading.
//   nutritionlab "whole blood volume about 60 times a day" -- 60x is the
//                PLASMA figure; against blood volume it is ~36-40x, which is
//                what stem_tool_anatomy.js already said. Two tools, two
//                different numbers, same sentence.
//
// A general "is this ratio true" checker is not possible: most claims cite
// outside facts. What IS possible is a ratchet over the population of such
// claims, so a NEW one has to be looked at by a person before it lands. That
// is the same shape as the comment-budget and anchored-slice gates.
//
//   node dev-tools/check_stem_ratio_claims.cjs            # check
//   node dev-tools/check_stem_ratio_claims.cjs --update   # re-baseline
//
// Exit 1 on a new unreviewed claim. Reviewing one means: work the arithmetic
// out, fix it if wrong, then re-baseline so it stops asking.
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'stem_lab');
const BASELINE = path.join(ROOT, 'dev-tools', 'stem_ratio_claims_baseline.json');
const UPDATE = process.argv.includes('--update');

// Ratio and magnitude claims. Deliberately narrow: these are the shapes where
// a wrong number is both easy to write and hard to notice on a read-through.
const PATTERNS = [
  /\b(?:about|roughly|around|nearly|some)\s+[\d][\d,.]*\s+orders of magnitude/gi,
  /\b(?:about|roughly|around|nearly|some)\s+[\d][\d,.]*\s+times\b/gi,
  /\b[\d][\d,.]*x\s+(?:more|less|faster|slower|bigger|smaller|larger|stronger)\b/gi,
];

function claimsIn(src) {
  const out = new Set();
  for (const re of PATTERNS) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) {
      // Normalise whitespace so a reflow does not read as a new claim.
      out.add(m[0].replace(/\s+/g, ' ').trim().toLowerCase());
    }
  }
  return [...out].sort();
}

const files = fs.readdirSync(DIR)
  .filter((f) => f.startsWith('stem_tool_') && f.endsWith('.js'))
  .sort();

const found = {};
for (const f of files) {
  const claims = claimsIn(fs.readFileSync(path.join(DIR, f), 'utf8'));
  if (claims.length) found[f] = claims;
}

if (UPDATE) {
  fs.writeFileSync(BASELINE, JSON.stringify(found, null, 2) + '\n');
  const total = Object.values(found).reduce((n, c) => n + c.length, 0);
  console.log(`check_stem_ratio_claims: baselined ${total} claims across ${Object.keys(found).length} tools.`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('check_stem_ratio_claims: no baseline. Run with --update once, after reviewing the list it prints.');
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

const added = [];
for (const [file, claims] of Object.entries(found)) {
  const known = new Set(base[file] || []);
  for (const c of claims) if (!known.has(c)) added.push({ file, claim: c });
}

// Claims that were baselined and are no longer there. Not a failure on its own
// -- copy gets rewritten -- but an unreported departure lets the baseline decay
// silently until it protects nothing.
const gone = [];
for (const [file, claims] of Object.entries(base)) {
  const present = new Set(found[file] || []);
  for (const c of claims) if (!present.has(c)) gone.push({ file, claim: c });
}

if (!added.length) {
  const total = Object.values(found).reduce((n, c) => n + c.length, 0);
  if (gone.length) {
    console.log(`check_stem_ratio_claims: ${total} claims tracked, no new ones — but `
      + `${gone.length} baselined claim(s) are gone:`);
    for (const g of gone) console.log('  - ' + g.file + ':  "' + g.claim + '"');
    console.log('\nIf those were deliberately removed or reworded, re-cut the baseline:'
      + '\n  node dev-tools/check_stem_ratio_claims.cjs --update');
    process.exit(0);
  }
  console.log(`check_stem_ratio_claims: clean (${total} baselined ratio claims, no new ones).`);
  process.exit(0);
}

console.error('check_stem_ratio_claims: ' + added.length + ' NEW ratio claim(s). Work each one out against the '
  + "tool's own data before baselining it:");
for (const a of added) console.error('  ' + a.file + ':  "' + a.claim + '"');
console.error('\nIf every one is correct: node dev-tools/check_stem_ratio_claims.cjs --update');
process.exit(1);
