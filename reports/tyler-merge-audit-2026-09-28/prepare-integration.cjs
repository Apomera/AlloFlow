const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const MAIN = path.resolve(__dirname, '../..');
const TARGET = 'C:/tmp/tyler_integration_candidate';
const git = (args, cwd = MAIN, input) => cp.execFileSync('git', args, { cwd, input, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
const head = git(['rev-parse', 'HEAD']).trim();
if (fs.existsSync(TARGET)) throw new Error('Candidate already exists; do not overwrite it.');
const rows = git(['ls-tree', '-rl', head]).trim().split('\n').map(s => {
  const m = s.match(/^\d+ \w+ \w+\s+(\d+|-)\t(.*)$/);
  return m && { path: m[2], bytes: Number(m[1]) || 0 };
}).filter(Boolean);
function include(p, n = 0) {
  if (!p.includes('/')) return n < 15000000 && !/\.(mp3|mp4|wav|webm|zip|pdf)$/i.test(p) && !/^word_audio.*\.json$/.test(p);
  return p.startsWith('tests/') || p.startsWith('dev-tools/') && n < 1000000
    || p.startsWith('desktop/web-app/src/') && n < 15000000
    || p.startsWith('desktop/web-app/public/') && !p.slice('desktop/web-app/public/'.length).includes('/') && n < 15000000 && !/^word_audio/.test(path.basename(p))
    || p.startsWith('lang/') && p.endsWith('.js')
    || p.startsWith('desktop/web-app/public/lang/') && p.endsWith('.js')
    || p.startsWith('apps_script/') && n < 15000000
    || p.startsWith('docs/') && p.endsWith('.md')
    || p.startsWith('desktop/web-app/') && !p.slice('desktop/web-app/'.length).includes('/')
    || p.startsWith('desktop/mcp/') && n < 1000000;
}
const selected = rows.filter(x => include(x.path, x.bytes));
const bytes = selected.reduce((n, x) => n + x.bytes, 0);
console.log(JSON.stringify({ head, target: TARGET, files: selected.length, bytes }));
git(['-c', 'core.hooksPath=NUL', 'worktree', 'add', '--no-checkout', '--detach', TARGET, head]);
git(['sparse-checkout', 'init', '--no-cone'], TARGET);
const patterns = selected.map(x => '/' + x.path.replace(/[!*?\[\]#]/g, '\\$&')).join('\n') + '\n';
git(['sparse-checkout', 'set', '--no-cone', '--stdin'], TARGET, patterns);
console.log('Sparse baseline checked out.');
const selectedSet = new Set(selected.map(x => x.path));
const changed = git(['diff', '--name-only', 'HEAD', '-z']).split('\0').filter(Boolean);
const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).filter(p => !p.startsWith('reports/'));
const captured = [];
for (const p of [...new Set([...changed, ...untracked])]) {
  const from = path.join(MAIN, p), to = path.join(TARGET, p);
  if (!selectedSet.has(p) && !(fs.existsSync(from) && include(p, fs.statSync(from).size))) continue;
  if (!fs.existsSync(from)) { if (fs.existsSync(to)) fs.unlinkSync(to); captured.push({ path: p, deleted: true }); continue; }
  const data = fs.readFileSync(from);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, data);
  captured.push({ path: p, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
}
for (const p of ['node_modules', 'desktop/web-app/node_modules']) {
  const from = path.join(MAIN, p), to = path.join(TARGET, p);
  if (!fs.existsSync(to)) fs.symlinkSync(from, to, 'junction');
}
const receipt = { recordedAt: new Date().toISOString(), main: MAIN, target: TARGET, head, selectedFiles: selected.length, baselineBytes: bytes, captured };
fs.writeFileSync(path.join(__dirname, 'integration-main-snapshot.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ candidate: TARGET, copiedWorkingFiles: captured.length }));
