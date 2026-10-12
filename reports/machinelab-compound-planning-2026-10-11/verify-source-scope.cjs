// Verify that this enhancement touches only the new helper and compound UI.
const fs = require('fs'), cp = require('child_process'), crypto = require('crypto'), assert = require('assert');
const baselineCommit = '64bf6c948f486e28c62ff34453d2598e9ffbe58f';
const source = 'stem_lab/stem_tool_machinelab.js', mirror = 'desktop/web-app/public/' + source;
const current = fs.readFileSync(source, 'utf8');
const baseline = cp.execFileSync('git', ['show', baselineCommit + ':' + source], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert(a >= 0 && b > a); assert.equal(text.indexOf(start, a + 1), -1);
  return { start: a, end: b, text: text.slice(a, b) };
}
const helper = section(current, '    // Inverse energy planning under a sustained mechanical input-power budget.', '    // An ideal task needs MA');
let restored = current.slice(0, helper.start) + current.slice(helper.end);
const start = '      function compoundPowerKinds()', end = '      function stationDesignLimits()';
const now = section(restored, start, end), before = section(baseline, start, end);
restored = restored.slice(0, now.start) + before.text + restored.slice(now.end);
assert.equal(restored, baseline, 'Unexpected production edits outside the scoped compound regions');
assert.equal(fs.readFileSync(mirror, 'utf8'), current);
const proof = { baselineCommit, source, publicMirror: mirror, sourceSha256: sha(current), baselineSha256: sha(baseline), reconstructedBaselineSha256: sha(restored),
  byteParity: true, unchangedOutsideRegions: true, originalCompoundWorkAndPowerHelpersUnchanged: true,
  regions: ['New compoundBudget helper only, inserted immediately before designEnvelope', 'compoundPowerKinds through the end of compoundLab; excludes stationDesignLimits'],
  method: 'Remove the new helper and restore the baseline compound UI region in memory. The complete reconstructed source matches the prior committed source byte for byte.' };
const destination = process.argv[2] || 'reports/machinelab-compound-planning-2026-10-11/source-scope.json';
fs.writeFileSync(destination, JSON.stringify(proof, null, 2) + '\n');
console.log(JSON.stringify(proof));
