// Produce a source/test-only incremental patch; do not apply it to the shared tree.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
function diff(args) {
  try { return execFileSync('git', ['diff', '--no-index', '--', ...args], { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { if (error.status === 1) return error.stdout; throw error; }
}
let patch = diff(['base/view_simplified_source.jsx', 'candidate/view_simplified_source.jsx'])
  .replaceAll('a/base/view_simplified_source.jsx', 'a/view_simplified_source.jsx')
  .replaceAll('b/candidate/view_simplified_source.jsx', 'b/view_simplified_source.jsx');
const test = fs.readFileSync(path.join(__dirname, 'reader_listen_along.test.js'), 'utf8')
  .replace("from '../../tests/setup.js'", "from './setup.js'")
  .replace('loadAlloModule(process.env.ALLO_VIEW_CANDIDATE);', "loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');");
fs.mkdirSync(path.join(__dirname, 'candidate/tests'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'candidate/tests/reader_listen_along_access.test.js'), test);
const lines = test.replace(/\n$/, '').split('\n');
patch += '\ndiff --git a/tests/reader_listen_along_access.test.js b/tests/reader_listen_along_access.test.js\nnew file mode 100644\n--- /dev/null\n+++ b/tests/reader_listen_along_access.test.js\n@@ -0,0 +1,' + lines.length + ' @@\n' + lines.map(line => '+' + line).join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, 'listen-along-source.patch'), patch);
const hashes = {};
for (const file of ['base/view_simplified_source.jsx', 'base/reader_place_store.js', 'base/reader_support_drafts.js', 'candidate/view_simplified_source.jsx', 'candidate/view_simplified_module.js', 'candidate/tests/reader_listen_along_access.test.js', 'listen-along-source.patch']) {
  hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex');
}
fs.writeFileSync(path.join(__dirname, 'hashes.json'), JSON.stringify(hashes, null, 2) + '\n');
console.log(JSON.stringify(hashes, null, 2));
