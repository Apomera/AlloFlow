// Canonical policy is packaged directly with Firebase Functions; inline copies
// keep the browser and standalone Canvas Worker free of load-order dependencies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const policy = fs.readFileSync(path.join(root, 'desktop/web-app/functions/public_search_policy.js'), 'utf8').replace('module.exports = publicSearchQuery;', '').trim();
const block = '// BEGIN PUBLIC SEARCH POLICY\n' + policy + '\n// END PUBLIC SEARCH POLICY';
for (const file of ['ai_backend_module.js', 'catalog/cloudflare-worker/src/index.js']) {
  const target = path.join(root, file);
  const current = fs.readFileSync(target, 'utf8');
  if (!current.includes('// BEGIN PUBLIC SEARCH POLICY')) throw Error('Missing policy marker: ' + file);
  const begin = current.indexOf('// BEGIN PUBLIC SEARCH POLICY');
  const end = current.indexOf('// END PUBLIC SEARCH POLICY', begin) + '// END PUBLIC SEARCH POLICY'.length;
  const next = current.slice(0, begin) + block + current.slice(end);
  if (process.argv.includes('--check')) {
    if (next.replace(/\r\n/g,'\n') !== current.replace(/\r\n/g,'\n')) throw Error('Stale public search policy: ' + file);
  } else fs.writeFileSync(target, next);
}
const backend = fs.readFileSync(path.join(root, 'ai_backend_module.js'));
const mirror = path.join(root, 'desktop/web-app/public/ai_backend_module.js');
if (process.argv.includes('--check')) {
  if (!backend.equals(fs.readFileSync(mirror))) throw Error('Stale AI backend mirror');
} else fs.writeFileSync(mirror, backend);
console.log('Public search policy copies match.');
