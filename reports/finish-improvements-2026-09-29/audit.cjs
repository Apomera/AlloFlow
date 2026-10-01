const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = require('./before.json');
const files = [...Object.keys(before.hashes), 'dev-tools/fixture_subprocess.cjs', 'tests/fixture_subprocess.test.js'];
const hashes = Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const parity = {
  pipelinePublicMatches: hashes['doc_pipeline_module.js'] === hashes['desktop/web-app/public/doc_pipeline_module.js'],
  stylesPublicMatches: hashes['app_styles_module.js'] === hashes['desktop/web-app/public/app_styles_module.js'],
};
const block = /<style data-docsuite-theme="v1">\{`[\s\S]*?`\}<\/style>/;
parity.surroundingStylesPreserved = fs.readFileSync(path.join(__dirname, 'before/app_styles_source.jsx'), 'utf8').replace(block, '')
  === fs.readFileSync(path.join(root, 'app_styles_source.jsx'), 'utf8').replace(block, '');
let patch = '';
for (const file of Object.keys(before.hashes)) {
  const old = path.join(__dirname, 'before', file);
  const result = spawnSync('git', ['diff', '--no-index', '--', path.relative(root, old), file], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30000 });
  if (result.error || ![0, 1].includes(result.status)) throw new Error(result.error?.message || result.stderr);
  patch += result.stdout;
}
for (const file of ['dev-tools/fixture_subprocess.cjs', 'tests/fixture_subprocess.test.js']) {
  const dest = path.join(__dirname, 'new-files', file);
  fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(root, file), dest);
}
fs.writeFileSync(path.join(__dirname, 'own-changes.patch'), patch);
const result = { at: new Date().toISOString(), parity, hashes, patchSha256: sha(patch) };
fs.writeFileSync(path.join(__dirname, 'final-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(parity));
if (Object.values(parity).some(value => !value)) process.exitCode = 1;
