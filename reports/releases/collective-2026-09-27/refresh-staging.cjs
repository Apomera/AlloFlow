// Explicit reviewed paths only; never stages files itself.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
process.chdir(root);
const git = args => cp.execFileSync('git', args, { maxBuffer: 16 * 1024 * 1024 });
const report = 'reports/releases/collective-2026-09-27/';
const planFile = path.join(__dirname, 'staging-plan.json');
const previous = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const changed = new Set([
  ...git(['diff', '--name-only', '-z', 'HEAD']).toString().split('\0'),
  ...git(['ls-files', '--others', '--exclude-standard', '-z']).toString().split('\0')
].filter(Boolean));
const selected = new Set(previous.selected.filter(f => changed.has(f) && fs.existsSync(f)));
selected.delete('reports/own-source-citation-durability-2026-09-26/cache-fragment.js');
selected.add('desktop/web-app/public/stem_lab_module.js');
selected.add('dev-tools/stem_ratio_claims_baseline.json');
for (const file of changed) {
  if (!file.startsWith(report)) continue;
  const rel = file.slice(report.length);
  if (rel.split('/').length > 2 || !/\.(md|json|cjs|patch|txt)$/.test(rel)) continue;
  if (/(^|\/)(prepare[^/]*|finalize-bytes|refresh-staging|staged-paths)\./.test(rel)) continue;
  if (/(^|\/)(candidate[^/]*|preimages|candidates|before)(\/|\.)/.test(rel)) continue;
  if (rel.endsWith('.stdout.log') || rel.endsWith('.html')) continue;
  if (fs.statSync(file).size > 5 * 1024 * 1024) throw new Error('Review large report: ' + file);
  selected.add(file);
}
const paths = [...selected].sort();
const byTopLevel = {};
for (const file of paths) byTopLevel[file.split('/')[0]] = (byTopLevel[file.split('/')[0]] || 0) + 1;
const next = {
  at: new Date().toISOString(), head: git(['rev-parse', 'HEAD']).toString().trim(),
  selected: paths, excluded: [...changed].filter(f => !selected.has(f)).sort(),
  byTopLevel, bytes: paths.reduce((n, f) => n + fs.statSync(f).size, 0),
  review: 'Original explicit product/test/tool/asset allowlist plus compact assembled release evidence; unused candidate source removed; incidental snapshots preserved locally.'
};
fs.writeFileSync(planFile, JSON.stringify(next, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'staged-paths.nul'), paths.join('\0') + '\0');
console.log(JSON.stringify({selected: paths.length, excluded: next.excluded.length, bytes: next.bytes}));
