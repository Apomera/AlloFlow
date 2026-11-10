// Word Sounds readiness contract: the syllable top-up guard (2026-11-10). NOT YET APPLIED: the lane that wrote it
// was told not to hand-edit word_sounds_readiness_contract.js. tests/word_sounds_syllable_topup.test.js runs the
// contract through patch() in memory, so it passes before and after this is applied.
// The contract's own (hand-written) part walks every word x every activity. Since 2026-11-10 a syllable
// activity uses only the words it can play, and a word added for one syllable activity (_wsOnlyFor)
// belongs to no other activity. Without this patch the contract reports
//   - "Syllable blending for cat needs checked syllable audio..." for every lesson word left out, and
//   - "Rhyme Time for raincoat needs a checked matching rhyme." for every added word,
// so a lesson with a syllable activity reads as not ready for independent use.
// With it: an added word is checked only for its own activity; a syllable activity reports its unusable
// words only when it has no usable word at all, or in a fixed form (assessment).
// Usage: node dev-tools/apply_word_sounds_contract_topup_guard.cjs   (patches the root file and its public mirror)
//        require(...).patch(text)   (returns the patched text; a patched text comes back unchanged)
const fs = require('node:fs');
const path = require('node:path');
const STEPS = [
  ["    if (activities.indexOf('syllable_counting') !== -1) {\n",
   "    var fixedForm = config.fixedForm === true || !!(resource && resource.isProbeMode);\n    var countIssues = [], countReady = 0, blendIssues = [], blendReady = 0;\n    var otherActivityWord = function (item, activity) { return WS_CORE.isTopUpItem(item) && item._wsOnlyFor.indexOf(activity) === -1; };\n    if (activities.indexOf('syllable_counting') !== -1) {\n"],
  ["        var word = wordOf(item); if (!word) return;\n        var boards = item.activityItems || {}, prepared = boards.syllable_counting;\n",
   "        var word = wordOf(item); if (!word || otherActivityWord(item, 'syllable_counting')) return;\n        var boards = item.activityItems || {}, prepared = boards.syllable_counting;\n"],
  ["          contentIssues.push('Syllable count for ' + word + ' needs review: '", "          countIssues.push('Syllable count for ' + word + ' needs review: '"],
  ["        } else if (WS_CORE.isTeacherSpokenSyllableCount(word, input)) {\n", "        } else countReady += 1;\n        if (resolved.supported && WS_CORE.isTeacherSpokenSyllableCount(word, input)) {\n"],
  ["        }\n      });\n    }\n    words.slice(0, MAX_WORDS).forEach(function (item) {\n      if (!item || typeof item !== 'object' || !wordOf(item)) { overflow = true; return; }\n",
   "        }\n      });\n      // A word with an unsettled count is left out of the activity; it is a problem only when no word is left.\n      if (fixedForm || !countReady) countIssues.forEach(function (issue) { contentIssues.push(issue); });\n    }\n    words.slice(0, MAX_WORDS).forEach(function (item) {\n      if (!item || typeof item !== 'object' || !wordOf(item)) { overflow = true; return; }\n"],
  ["      activities.forEach(function (activity) {\n        var board = boards[activity] || {};\n",
   "      activities.forEach(function (activity) {\n        if (otherActivityWord(item, activity)) return;\n        var board = boards[activity] || {};\n"],
  ["            contentIssues.push('Syllable blending for ' + wordOf(item)", "            blendIssues.push('Syllable blending for ' + wordOf(item)"],
  ["          } else if (board.contentStatus !== 'teacher_recorded') board.audioUnits.forEach(function (unit) { add(unit.key, 'speech'); });\n",
   "          } else { blendReady += 1; if (board.contentStatus !== 'teacher_recorded') board.audioUnits.forEach(function (unit) { add(unit.key, 'speech'); }); }\n"],
  ["    if (words.length && !(resource && resource.isProbeMode)) FEEDBACK.forEach(",
   "    if (fixedForm || !blendReady) blendIssues.forEach(function (issue) { contentIssues.push(issue); });\n    if (words.length && !(resource && resource.isProbeMode)) FEEDBACK.forEach("],
];
function patch(text) {
  if (text.includes('var otherActivityWord = function')) return text;
  const crlf = text.includes('\r\n');
  let out = crlf ? text.replace(/\r\n/g, '\n') : text;
  STEPS.forEach(([from, to], index) => {
    const parts = out.split(from);
    if (parts.length !== 2) throw new Error('contract patch step ' + (index + 1) + ': anchor found ' + (parts.length - 1) + ' times');
    out = parts[0] + to + parts[1];
  });
  return crlf ? out.replace(/\n/g, '\r\n') : out;
}
module.exports = { patch, STEPS };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const file = path.join(root, 'word_sounds_readiness_contract.js');
  const before = fs.readFileSync(file, 'utf8'), after = patch(before);
  if (after === before) { console.log('already patched'); process.exit(0); }
  fs.writeFileSync(file, after);
  fs.writeFileSync(path.join(root, 'desktop/web-app/public/word_sounds_readiness_contract.js'), after);
  console.log('contract patched and mirrored; run: node dev-tools/sync_word_sounds_core.cjs --check');
}
