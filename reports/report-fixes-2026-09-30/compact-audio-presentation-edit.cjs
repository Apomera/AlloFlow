'use strict';
const fs = require('node:fs');
const file = 'view_simplified_source.jsx';
let source = fs.readFileSync(file, 'utf8');
for (const [from, to] of [
  ['{renderAudioPreparationIssues()}{currentWordHelpCard', '{currentWordHelpCard'],
  ["ttsPrepNotice ? 'rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900' : 'sr-only'", "ttsPrepNotice ? 'mt-2 text-sm text-indigo-900' : 'sr-only'"]
]) {
  if (source.split(from).length !== 2) throw new Error('Audio-only replacement is not unique');
  source = source.replace(from, to);
}
fs.writeFileSync(file, source);
console.log('Preparation issues render once inside audio details; existing live notice is compact.');
