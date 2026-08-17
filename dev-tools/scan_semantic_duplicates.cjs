#!/usr/bin/env node
// Semantic concept-duplicate sweep over the non-EPPP credential packs.
//
//   node dev-tools/scan_semantic_duplicates.cjs            # report
//   node dev-tools/scan_semantic_duplicates.cjs --check    # ratchet (exit 1 if worse)
//   node dev-tools/scan_semantic_duplicates.cjs --update   # rewrite the baseline
//   node dev-tools/scan_semantic_duplicates.cjs --pack <stem>   # show the pairs
//
// WHY THIS EXISTS.
//
// The EPPP bank has had a semantic duplicate detector since July
// (audit_eppp_distractor_quality.cjs). The 22 credential packs have never had
// one, and the measure they ARE judged by cannot see the defect.
//
// `contentKernel` canonicalises answer + sorted distractors + rationale +
// references. It drives `distinctSourceContentKernels`, the 500-per-pack target,
// and the headline "independent questions remain" figure. It is an EXACT hash,
// so two items that ask the same question and key the same fact count as fully
// distinct the moment a rationale is reworded. That is not hypothetical; it is
// exactly what the EPPP audit found:
//
//   eppp-v2-lifespan-011  "Object permanence develops during which Piagetian stage?"
//   eppp-v3-lifespan-002  "Object permanence TYPICALLY develops during which stage?"
//
// Same key, same distractor set, two distinct kernels, because the rationale
// used dashes instead of parentheses and the reference pointed at a different
// anchor of the same chapter.
//
// This scanner asks the question the kernel hash cannot: do the credential packs
// carry the same hidden duplication? It deliberately splits the answer in two,
// because only one half is news:
//
//   knownPairs  - semantically duplicate AND kernel-identical. Already counted
//                 as `parallelSourceVariants`. Visible, expected, mostly the
//                 legitimate bank-1/bank-2 parallel form.
//   hiddenPairs - semantically duplicate but kernel-DISTINCT. Counted as two
//                 distinct kernels today, so every one of these inflates the
//                 distinctness figure and understates the real authoring gap.
//
// METHOD. Mirrors audit_eppp_distractor_quality.cjs exactly so the numbers are
// comparable: same tokenizer and stopwords, same TF-IDF cosine over
// prompt + keyed answer only, same same-domain restriction, same thresholds
// (0.72 with three shared terms, or a shared acronym / rare hyphenated term at a
// lower bar). Distractors and rationales are deliberately excluded from the
// comparison text, because rewording those is precisely how a duplicate hides.
//
// Guided-review banks are excluded: expand_test_prep_packs_to_500.cjs derives
// them from source items on purpose.
//
// PRECISION, MEASURED RATHER THAN ASSUMED. This is a TRIAGE tool and is
// deliberately NOT wired into verify:gate. Spot-checking the kernel-distinct
// pairs it reports found roughly half to be false positives driven by shared
// technical vocabulary rather than a shared question:
//
//   aud5343-b1-022 "What does a comprehensive hearing-conservation program
//                   include?"                                        (recall)
//   aud5343-b3-022 "Equipment is modified and may increase exposure. What
//                   should the team do next?"                   (application)
//
// Those share the hearing-conservation lexicon and ask different questions.
// `sameKeyText` is not a precision signal either: the three identical-key pairs
// found are Praxis Core maths items whose ANSWERS coincide (3/4 + 5/8 and
// 1 7/8 - 1/2 both equal 1 3/8), not items that duplicate each other.
//
// Confirmed-genuine finds so far are a small subset, e.g. parapro
// writing-skills-001 vs -023, whose prompts differ by a single word
// ("uses correct" / "has correct" subject-verb agreement). Treat the output as a
// ranked review queue for a human, which is exactly how the EPPP equivalent is
// used (`warningOnly: true`).
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const baselinePath = path.join(root, 'tests', 'fixtures', 'test_prep_semantic_duplicate_baseline.json');
const { contentKernel } = require('./apply_test_prep_independent_additions.cjs');

// Identical to the EPPP audit's list so similarity scores are comparable.
const stopWords = new Set(`
  a an the and or but if then than as at by for from in into of on to with
  without about above below after before between during under over through
  is are was were be been being am do does did doing have has had having
  can could may might must shall should will would this that these those it
  its their them they we you your who whom whose which what when where why how
  all any each every both few more most other some such no nor not only own
  same so too very complete statement according best accurately accurate
  described describes describe primarily refers refer mean means indicate
  indicates question answer response psychologist psychologists client clients
  person people individual individuals one two three four
`.trim().split(/\s+/));

const ignoredAcronyms = new Set(['A', 'B', 'C', 'D', 'I', 'II', 'III', 'IV', 'TRUE', 'FALSE']);

function canonicalToken(value) {
  let token = String(value || '').toLowerCase().replace(/[’']/g, '');
  if (token.length > 5 && token.endsWith('ies')) token = token.slice(0, -3) + 'y';
  else if (token.length > 5 && token.endsWith('ing')) token = token.slice(0, -3);
  else if (token.length > 4 && token.endsWith('ed')) token = token.slice(0, -2);
  else if (token.length > 4 && token.endsWith('es')) token = token.slice(0, -2);
  else if (token.length > 4 && token.endsWith('s')) token = token.slice(0, -1);
  return token;
}

function meaningfulTokens(value) {
  const matches = String(value || '').match(/[A-Za-z][A-Za-z0-9’'_-]*|\d+(?:\.\d+)?/g) || [];
  return [...new Set(matches
    .map(canonicalToken)
    .filter((token) => token.length >= 3 && !stopWords.has(token)))];
}

function intersection(left, right) {
  return left.filter((entry) => right.has(entry));
}

// Prompt plus the KEYED option only. Distractors and rationale are excluded on
// purpose: they are the fields a near-duplicate hides behind.
function conceptText(item) {
  const choices = Array.isArray(item.choices) ? item.choices : [];
  return String(item.prompt || '') + ' ' + String(choices[item.answerIndex] || '');
}

function conceptSignatures(item) {
  const text = conceptText(item);
  const acronyms = new Set((text.match(/\b[A-Z][A-Z0-9-]{1,}\b/g) || [])
    .filter((entry) => !ignoredAcronyms.has(entry)));
  const hyphenated = new Set((text.toLowerCase().match(/\b[a-z]{3,}-[a-z]{3,}\b/g) || [])
    .map(canonicalToken));
  return { acronyms, hyphenated };
}

function duplicatePairs(items) {
  const tokenDocuments = items.map((item) => meaningfulTokens(conceptText(item)));
  const documentFrequency = new Map();
  for (const document of tokenDocuments) {
    for (const token of document) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }
  const idf = (token) => Math.log((1 + items.length) / (1 + (documentFrequency.get(token) || 0))) + 1;
  const vectors = tokenDocuments.map((document) => {
    const values = new Map(document.map((token) => [token, idf(token)]));
    const norm = Math.sqrt([...values.values()].reduce((sum, value) => sum + value * value, 0));
    return { values, norm };
  });
  const signatures = items.map(conceptSignatures);
  const kernels = items.map(contentKernel);
  const pairs = [];

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      if (items[leftIndex].domainId !== items[rightIndex].domainId) continue;
      const left = vectors[leftIndex];
      const right = vectors[rightIndex];
      if (!left.norm || !right.norm) continue;
      let dotProduct = 0;
      const sharedTerms = [];
      for (const [token, value] of left.values) {
        if (!right.values.has(token)) continue;
        dotProduct += value * right.values.get(token);
        sharedTerms.push(token);
      }
      if (sharedTerms.length < 2) continue;
      // TEMPLATE GUARD. The EPPP bank has no boilerplate prompt stem, so the
      // upstream audit never needed this. Several credential packs do:
      // early_childhood_5025 opens 40+ items with "Without using a calculator,
      // solve or interpret this early-childhood content-knowledge problem:".
      // That prefix is long and the real question after it ("What is 3/4 + 2/3?")
      // is short and mostly digits and stopwords, so the boilerplate dominates
      // the vector and two unrelated arithmetic items score similarity 1.0.
      //
      // A genuine concept duplicate shares DISTINCTIVE vocabulary - permanence,
      // sensorimotor, yerkes-dodson - not shared scaffolding. So require at
      // least two shared terms that are rare within the pack. This is what keeps
      // the scanner from re-reporting prompt templating, which
      // scan_source_bank_duplication.cjs already measures directly.
      const rarityCeiling = Math.max(3, Math.round(items.length * 0.05));
      const distinctiveShared = sharedTerms.filter((token) => (documentFrequency.get(token) || 0) <= rarityCeiling);
      if (distinctiveShared.length < 2) continue;
      const similarity = dotProduct / (left.norm * right.norm);
      const sharedAcronyms = intersection([...signatures[leftIndex].acronyms], signatures[rightIndex].acronyms);
      const sharedHyphenated = intersection([...signatures[leftIndex].hyphenated], signatures[rightIndex].hyphenated)
        .filter((token) => (documentFrequency.get(token) || 0) <= 5);
      const matchBasis = [];
      if (similarity >= 0.72 && sharedTerms.length >= 3) matchBasis.push('high-tfidf-similarity');
      if (sharedAcronyms.length && similarity >= 0.28 && sharedTerms.length >= 3) matchBasis.push('shared-acronym');
      if (sharedHyphenated.length && similarity >= 0.15) matchBasis.push('shared-rare-hyphenated-term');
      if (!matchBasis.length) continue;
      pairs.push({
        leftId: items[leftIndex].id,
        rightId: items[rightIndex].id,
        leftIndex,
        rightIndex,
        domainId: items[leftIndex].domainId,
        similarity: Number(similarity.toFixed(4)),
        matchBasis,
        // The distinction that matters: is this pair already visible as a
        // parallel variant, or is it counted as two distinct kernels today?
        kernelIdentical: kernels[leftIndex] === kernels[rightIndex],
        sameKeyText: items[leftIndex].choices[items[leftIndex].answerIndex]
          === items[rightIndex].choices[items[rightIndex].answerIndex],
      });
    }
  }
  pairs.sort((left, right) => right.similarity - left.similarity);
  return pairs;
}

function packFiles() {
  return fs.readdirSync(sourceDir)
    .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'))
    .sort();
}

function measure(pack) {
  const guided = Math.max(0, Number(pack.guidedReviewItems) || 0);
  const items = pack.items.slice(0, pack.items.length - guided)
    .filter((item) => Array.isArray(item.choices) && Number.isInteger(item.answerIndex));
  const size = Math.max(1, Number(pack.batchSize) || 100);
  const pairs = duplicatePairs(items);
  const hidden = pairs.filter((pair) => !pair.kernelIdentical);
  const sameBank = pairs.filter((pair) => Math.floor(pair.leftIndex / size) === Math.floor(pair.rightIndex / size));
  return {
    scoredItems: items.length,
    pairs: pairs.length,
    knownPairs: pairs.length - hidden.length,
    hiddenPairs: hidden.length,
    hiddenSameBank: hidden.filter((pair) => Math.floor(pair.leftIndex / size) === Math.floor(pair.rightIndex / size)).length,
    sameBankPairs: sameBank.length,
    allPairs: pairs,
  };
}

const args = process.argv.slice(2);
const rows = [];
for (const file of packFiles()) {
  const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
  rows.push(Object.assign({ pack: file.replace('_pack.json', '') }, measure(pack)));
}

const packArg = args.indexOf('--pack');
if (packArg !== -1) {
  const stem = args[packArg + 1];
  const row = rows.find((entry) => entry.pack === stem);
  if (!row) { console.error('No such pack: ' + stem); process.exit(1); }
  const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, stem + '_pack.json'), 'utf8'));
  const byId = new Map(pack.items.map((item) => [item.id, item]));
  console.log(stem + ': ' + row.pairs + ' pairs (' + row.hiddenPairs + ' kernel-distinct)\n');
  for (const pair of row.allPairs.filter((entry) => !entry.kernelIdentical).slice(0, 25)) {
    const left = byId.get(pair.leftId);
    const right = byId.get(pair.rightId);
    console.log('sim ' + pair.similarity + '  [' + pair.domainId + ']  same key text: ' + pair.sameKeyText);
    console.log('   L ' + pair.leftId + '  ' + String(left.prompt).slice(0, 100));
    console.log('   R ' + pair.rightId + '  ' + String(right.prompt).slice(0, 100));
  }
  process.exit(0);
}

if (args.includes('--update')) {
  const payload = {
    note: 'Semantic concept-duplicate ratchet for the non-EPPP credential packs. Mirrors '
      + 'audit_eppp_distractor_quality.cjs so scores are comparable. hiddenPairs are semantically '
      + 'duplicate but kernel-distinct, so each one inflates distinctContentKernels and understates '
      + 'the authoring gap; those are the number to drive down. Rates may fall, never rise.',
    packs: Object.fromEntries(rows.map((row) => [row.pack, {
      pairs: row.pairs,
      hiddenPairs: row.hiddenPairs,
      hiddenSameBank: row.hiddenSameBank,
    }])),
  };
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('Wrote semantic-duplicate baseline for ' + rows.length + ' packs');
  process.exit(0);
}

const sorted = rows.slice().sort((a, b) => b.hiddenPairs - a.hiddenPairs || b.pairs - a.pairs);
console.log('pack'.padEnd(48), 'scored'.padStart(7), 'pairs'.padStart(6), 'known'.padStart(6),
  'HIDDEN'.padStart(7), 'hidden/bank'.padStart(12));
console.log('-'.repeat(96));
for (const row of sorted) {
  console.log(
    row.pack.padEnd(48),
    String(row.scoredItems).padStart(7),
    String(row.pairs).padStart(6),
    String(row.knownPairs).padStart(6),
    String(row.hiddenPairs).padStart(7),
    String(row.hiddenSameBank).padStart(12),
  );
}
const totalHidden = rows.reduce((sum, row) => sum + row.hiddenPairs, 0);
const totalPairs = rows.reduce((sum, row) => sum + row.pairs, 0);
console.log('\ntotal: ' + totalPairs + ' semantic duplicate pairs, of which ' + totalHidden
  + ' are kernel-distinct and therefore invisible to distinctContentKernels; '
  + rows.reduce((sum, row) => sum + row.hiddenSameBank, 0) + ' of those sit in one bank.');

if (!args.includes('--check')) process.exit(0);

if (!fs.existsSync(baselinePath)) {
  console.error('\nNo baseline. Run with --update once to record the current state.');
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const regressions = [];
for (const row of rows) {
  const previous = baseline.packs[row.pack];
  if (!previous) {
    if (row.hiddenPairs) regressions.push(row.pack + ': not in baseline and ships ' + row.hiddenPairs + ' hidden pairs');
    continue;
  }
  if (row.hiddenPairs > previous.hiddenPairs) {
    regressions.push(row.pack + ': hidden semantic duplicates ' + previous.hiddenPairs + ' -> ' + row.hiddenPairs);
  }
  if (row.hiddenSameBank > previous.hiddenSameBank) {
    regressions.push(row.pack + ': same-bank hidden duplicates ' + previous.hiddenSameBank + ' -> ' + row.hiddenSameBank);
  }
}
if (regressions.length) {
  console.error('\nSemantic duplication got WORSE in ' + regressions.length + ' place(s):');
  for (const entry of regressions) console.error('  ' + entry);
  console.error('\nA new item must test a different question, not the same fact behind a reworded '
    + 'prompt. Rewording a rationale changes the kernel without changing what the item tests.');
  process.exit(1);
}
console.log('\nRatchet OK: no pack added hidden semantic duplicates.');
