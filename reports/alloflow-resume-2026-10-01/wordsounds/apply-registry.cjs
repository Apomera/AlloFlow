const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const files = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const guards = process.argv.includes('--guards');
const candidates = JSON.parse(fs.readFileSync(path.join(__dirname, guards ? 'guard-registry-candidates.json' : 'registry-candidates.json'), 'utf8').replace(/^\uFEFF/, ''));
const keys = Object.keys(candidates);
assert.equal(keys.length, guards ? 7 : 20, 'Only the assigned Word Sounds keys belong to this lane');
const source = fs.readFileSync(path.join(root, guards ? 'word_sounds_module.js' : 'misc_components_source.jsx'), 'utf8');
const pattern = guards ? /ts\("word_sounds\.([a-z_]+)"\)\s*\|\|\s*("(?:\\.|[^"\\])*")/g : /reviewText\('([a-z_]+)',\s*("(?:\\.|[^"\\])*")/g;
const fallbacks = Object.fromEntries([...source.matchAll(pattern)].filter(match => keys.includes(match[1])).map(match => [match[1], JSON.parse(match[2])]));
for (const key of keys) assert.equal(candidates[key], fallbacks[key], `English fallback mismatch: ${key}`);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = files.map(file => fs.readFileSync(path.join(root, file)));
assert(before[0].equals(before[1]), 'Source/public registry differ; stop instead of copying');
const parsed = before.map(bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, '')));
const installed = keys.filter(key => Object.hasOwn(parsed[0].word_sounds, key));
if (installed.length) {
  assert.equal(installed.length, keys.length, 'Partial registry update requires reconciliation');
  for (const key of keys) assert.equal(parsed[0].word_sounds[key], candidates[key]);
  console.log(JSON.stringify({ state: 'already installed', keyCount: keys.length, sha256: sha(before[0]) }));
  process.exit(0);
}
for (const value of parsed) for (const key of keys) assert(!Object.hasOwn(value.word_sounds, key), `Existing key must not be overwritten: ${key}`);
const text = before[0].toString('utf8');
const anchor = /(^  "word_sounds": \{)(\r?\n)/m;
const match = text.match(anchor);
assert(match, 'Expected existing English registry namespace');
const addition = keys.map(key => `    ${JSON.stringify(key)}: ${JSON.stringify(candidates[key])},`).join(match[2]) + match[2];
const output = text.replace(anchor, (_, head, eol) => head + eol + addition);
const next = JSON.parse(output.replace(/^\uFEFF/, ''));
for (const key of keys) delete next.word_sounds[key];
assert.deepEqual(next, parsed[0], 'All existing registry values must be preserved');
assert.equal(output.replace(addition, ''), text, 'All existing bytes must be preserved');
const evidence = { checkedAt: new Date().toISOString(), scope: files, keyCount: keys.length, keys, beforeSha256: sha(before[0]), afterSha256: sha(Buffer.from(output)), preservesEveryExistingByte: true, preservesEveryExistingValue: true, otherLanguagePacksChanged: false, applied: process.argv.includes('--apply') };
if (evidence.applied) {
  for (let i = 0; i < files.length; i++) {
    const target = path.join(root, files[i]);
    assert(fs.readFileSync(target).equals(before[i]), `Concurrent registry edit: ${files[i]}`);
    const temporary = target + `.wordsounds-${process.pid}.tmp`;
    fs.writeFileSync(temporary, output, 'utf8');
    assert(fs.readFileSync(target).equals(before[i]), `Concurrent registry edit before replace: ${files[i]}`);
    fs.renameSync(temporary, target);
    assert.equal(sha(fs.readFileSync(target)), evidence.afterSha256);
  }
  assert(fs.readFileSync(path.join(root, files[0])).equals(fs.readFileSync(path.join(root, files[1]))));
  fs.writeFileSync(path.join(__dirname, guards ? 'guard-registry-validation.json' : 'registry-validation.json'), JSON.stringify(evidence, null, 2) + '\n');
}
console.log(JSON.stringify(evidence));
