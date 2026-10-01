// Package the bounded source changes; never apply them to the shared checkout.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
function diff(file) {
  let result;
  try { result = execFileSync('git', ['diff', '--no-index', '--', 'base/' + file, 'candidate/' + file], { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { if (error.status !== 1) throw error; result = error.stdout; }
  return result.replaceAll('a/base/' + file, 'a/' + file).replaceAll('b/candidate/' + file, 'b/' + file);
}
const sources = ['content_engine_source.jsx', 'view_simplified_source.jsx'];
let patch = sources.map(diff).join('\n');
const test = fs.readFileSync(path.join(__dirname, 'bilingual_revision_review.test.js'), 'utf8')
  .replace("from '../../tests/setup.js'", "from './setup.js'").replace(/\r\n/g, '\n');
const testFile = 'tests/reader_bilingual_revision_review.test.js';
fs.mkdirSync(path.join(__dirname, 'candidate/tests'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'candidate', testFile), test);
const lines = test.replace(/\n$/, '').split('\n');
patch += '\ndiff --git a/' + testFile + ' b/' + testFile + '\nnew file mode 100644\n--- /dev/null\n+++ b/' + testFile + '\n@@ -0,0 +1,' + lines.length + ' @@\n' + lines.map(line => '+' + line).join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, 'bilingual-review-source.patch'), patch);
const hashes = {};
for (const file of [
  ...sources.flatMap(file => ['base/' + file, 'candidate/' + file]),
  'base/reader_place_store.js', 'base/reader_support_drafts.js', 'base/_build_simple_iife_module.js',
  'candidate/view_simplified_module.js', 'candidate/content_engine_module.js', 'candidate/' + testFile,
  'bilingual_revision_review.test.js', 'regressions/bilingual_revision_transaction.test.js',
  'build.cjs', 'vitest.config.mjs', 'strings.json', 'bilingual-review-source.patch'
]) hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex');
fs.writeFileSync(path.join(__dirname, 'hashes.json'), JSON.stringify(hashes, null, 2) + '\n');
console.log('Packaged two source deltas and one test file; wrote SHA-256 manifest.');
