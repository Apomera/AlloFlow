const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const directory = __dirname;
const baseline = path.join(directory, 'source-before', 'stem_lab__stem_tool_evolab.js');
const candidate = path.join(directory, 'stem_tool_evolab.candidate.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = fs.readFileSync(baseline);
const text = bytes.toString('utf8');
const changes = [
  {
    purpose: 'Keep both complete outcome branches private during parents/survivors in a new walkthrough. Historical playback is unchanged.',
    before: '})), briefing ? h(IslandFieldReport,',
    after: "})), (!watching || phase === 'offspring') && (briefing ? h(IslandFieldReport,"
  },
  {
    purpose: 'Close the same gate around the fallback summary as well as the field report.',
    before: "h('small', null, s[1])); }))),",
    after: "h('small', null, s[1])); })))),"
  },
  {
    purpose: 'Replace active habitat advice with existing registered terminal review guidance when this expedition has ended.',
    before: "h('p', { className: 'ei-small' }, tx('hint_' + shownHabitat, env.hint)),",
    after: "h('p', { className: 'ei-small' }, ended ? (extinct ? tx('extinction', 'Your population went extinct. This is evidence to investigate, not a failed score. Rewind the timeline and inspect the last breeding generation.') : tx('finished', '60 generations recorded. Your expedition is complete: explore the timeline, export your data, and explain what changed.')) : tx('hint_' + shownHabitat, env.hint)),"
  }
];
let next = text;
for (const change of changes) {
  if (next.split(change.before).length !== 2) throw new Error('Expected one patch anchor: ' + change.purpose);
  next = next.replace(change.before, change.after);
}
let reversed = next;
for (const change of changes.slice().reverse()) {
  if (reversed.split(change.after).length !== 2) throw new Error('Expected one reverse anchor');
  reversed = reversed.replace(change.after, change.before);
}
if (reversed !== text) throw new Error('Reverse guard failed');
fs.writeFileSync(candidate, next, 'utf8');
fs.writeFileSync(path.join(directory, 'candidate-patch-evidence.json'), JSON.stringify({
  baseline, candidate, baselineSha256: hash(bytes), candidateSha256: hash(Buffer.from(next)),
  reverseSha256: hash(Buffer.from(reversed)), reverseExact: reversed === text,
  productionFilesEdited: false, changes
}, null, 2) + '\n');
console.log(JSON.stringify({ baselineSha256: hash(bytes), candidateSha256: hash(Buffer.from(next)), reverseExact: true, productionFilesEdited: false }));
