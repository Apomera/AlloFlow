const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(root, 'reports/bridgelab-frame-energy-2026-10-06');
const read = file => fs.readFileSync(path.join(root, file));
const json = name => JSON.parse(fs.readFileSync(path.join(report, name), 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const sources = ['stem_lab/stem_tool_bridgelab.js', 'desktop/web-app/public/stem_lab/stem_tool_bridgelab.js'];
const canonical = read(sources[0]), mirror = read(sources[1]);
assert(canonical.equals(mirror));
const source = canonical.toString('utf8'); new vm.Script(source);
assert(!/(?<!\r)\n/.test(source));
const calls = /__alloT\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g;
const literals = [...source.matchAll(calls)].map(match => '[' + match[1] + ',' + match[2] + ']');
const pairs = vm.runInNewContext('[' + literals.join(',') + ']', Object.create(null));
const entries = new Map();
for (const [key, value] of pairs) {
  if (!key.startsWith('stem.bridgelab.')) continue;
  if (entries.has(key)) assert.equal(entries.get(key), value);
  entries.set(key, value);
}
assert.equal(entries.size, 1355);
const english = [];
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const bytes = read(file), data = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  for (const [key, value] of entries) assert.equal(data.stem.bridgelab[key.slice('stem.bridgelab.'.length)], value, file + ': ' + key);
  assert.equal(hash(read(file)), hash(bytes));
  english.push({ file, sha256: hash(bytes), literalFallbacksMatched: entries.size });
}
const modelFile = fs.existsSync(path.join(report, 'model-invariants.json')) ? 'model-invariants.json' : 'model-invariants-before-rounding.json';
const model = json(modelFile);
assert.equal(model.status, 'passed'); assert.equal(model.configurations, 144);
const finalCopy = 'J/kg shows the energy amount. Energy transfer shows the rate in W/kg (J/kg each second). Displayed values are rounded.';
const priorCopy = 'J/kg shows the energy amount. Energy transfer shows the rate in W/kg (J/kg each second).';
const sweepMatchesCurrentSource = model.sourceSha256 === hash(canonical);
if (!sweepMatchesCurrentSource) {
  assert.equal(source.split(finalCopy).length, 2);
  assert.equal(hash(Buffer.from(source.replace(finalCopy, priorCopy), 'utf8')), model.sourceSha256, 'Source changed beyond the one display sentence');
}
const proof = { status: 'passed', checkedAt: new Date().toISOString(),
  sourceSha256: hash(canonical), sourceMirrorsIdentical: true, syntaxValid: true,
  independentlyCheckedEnglishFiles: english, numericConfigurations: 144,
  numericProof: { file: modelFile, sweepSourceSha256: model.sourceSha256,
    sweepMatchesCurrentSource, modelCodeUnchanged: true,
    finalDifference: sweepMatchesCurrentSource ? null : 'One sentence in display text: Displayed values are rounded.' } };
fs.writeFileSync(path.join(report, 'source-verification.json'), JSON.stringify(proof, null, 2)+'\n');
console.log(JSON.stringify(proof,null,2));
