const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const zlib = require('zlib');
const crypto = require('crypto');
const MAIN = path.resolve(__dirname, '../..');
const TARGET = 'C:/tmp/tyler_integration_candidate';
const REVIEW = 'C:/tmp/tyler_onboarding_review';
const diff = require(path.join(MAIN, 'node_modules/diff'));
const BASE = 'efed3b8d6fee9d7d72a4fbe8919bb0835d2ead16';
const git = (args, cwd = MAIN) => cp.execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 60 * 1024 * 1024 });
const receiptPath = path.join(__dirname, 'integration-merge.json');
if (fs.existsSync(receiptPath)) throw new Error('Merge receipt exists; refuse to overwrite candidate work.');
const families = ['onboarding_coach','teacher','ui_modals','view_educator_hub_modal','view_fab_stack','view_guided_mode_banner','view_header','view_history_panel','view_launch_pad','view_learning_hub_modal','view_sidebar_panels','view_sidebar_tabs_nav','view_teacher_history_tab'];
const generated = new Set(families.map(x => x + '_module.js'));
const all = git(['diff', '--name-only', BASE], REVIEW).trim().split(/\r?\n/).filter(Boolean);
const canonical = all.filter(p => !p.startsWith('desktop/') && !generated.has(p));
const patchText = git(['diff', '--no-ext-diff', '--no-color', BASE, '--', ...canonical], REVIEW);
const parsed = diff.parsePatch(patchText);
const norm = s => s.replace(/\r\n/g, '\n');
const blob = (ref, p) => { try { return norm(git(['show', ref + ':' + p])); } catch { return ''; } };
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const dir = path.join(__dirname, 'integration-preimages');
const temp = path.join(TARGET, '.tyler-merge-scratch');
fs.mkdirSync(temp, { recursive: true });
const results = [];
function mergeJson(base, ours, theirs, prefix, conflicts) {
  if (JSON.stringify(base) === JSON.stringify(theirs)) return ours;
  if (JSON.stringify(base) === JSON.stringify(ours) || JSON.stringify(ours) === JSON.stringify(theirs)) return theirs;
  if ([base, ours, theirs].every(x => x && typeof x === 'object' && !Array.isArray(x))) {
    const result = { ...ours };
    for (const k of new Set([...Object.keys(base), ...Object.keys(theirs)])) {
      const val = mergeJson(base[k], ours[k], theirs[k], prefix ? prefix + '.' + k : k, conflicts);
      if (val === undefined) delete result[k]; else result[k] = val;
    }
    return result;
  }
  conflicts.push({ key: prefix, base, ours, theirs });
  return ours;
}
for (const patch of parsed) {
  const p = patch.newFileName.replace(/^b\//, '');
  const output = path.join(TARGET, p);
  const ours = fs.existsSync(output) ? norm(fs.readFileSync(output, 'utf8')) : '';
  const backup = path.join(dir, p + '.gz');
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, zlib.gzipSync(ours));
  let merged = diff.applyPatch(ours, patch, { fuzzFactor: 0 });
  let mode = 'patch';
  let conflicts = [];
  if (merged === false) {
    const base = blob(BASE, p);
    const theirs = fs.existsSync(path.join(REVIEW, p)) ? norm(fs.readFileSync(path.join(REVIEW, p), 'utf8')) : blob('origin/onboarding-redesign', p);
    if (p === 'ui_strings.js' || p === 'help_strings.js' || p.startsWith('lang/')) {
      merged = JSON.stringify(mergeJson(JSON.parse(base), JSON.parse(ours), JSON.parse(theirs), '', conflicts), null, 2) + '\n';
      mode = 'json';
    } else {
      for (const [name, text] of Object.entries({ ours, base, theirs })) fs.writeFileSync(path.join(temp, name), text);
      const r = cp.spawnSync('git', ['merge-file', '-p', '--diff3', '-L', 'CURRENT_MAIN', '-L', 'COMMON_ANCESTOR', '-L', 'TYLER_REVIEW', path.join(temp,'ours'),path.join(temp,'base'),path.join(temp,'theirs')], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
      if (r.status < 0 || r.status > 127 || !r.stdout) throw new Error('merge-file failed: ' + p + ': ' + r.stderr);
      merged = r.stdout; mode = 'three-way';
      if (r.status) conflicts = [{ count: r.status }];
    }
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, merged);
  results.push({ path: p, mode, before: hash(ours), after: hash(merged), conflicts });
  if (conflicts.length) console.log('CONFLICT ' + p + ': ' + JSON.stringify(conflicts).slice(0, 1600));
}
for (const p of ['tests/onboarding_review_fixes.test.js','tests/role_workspace_transitions.test.js']) {
  const from = path.join(REVIEW, p), to = path.join(TARGET, p);
  if (fs.existsSync(from)) { if (fs.existsSync(to)) throw new Error('New test already exists: '+p); fs.copyFileSync(from,to); results.push({ path:p, mode:'new-review-test', after:hash(fs.readFileSync(to)), conflicts:[] }); }
}
fs.writeFileSync(receiptPath, JSON.stringify({ recordedAt: new Date().toISOString(), base: BASE, target: TARGET, review: REVIEW, results }, null, 2) + '\n');
console.log(JSON.stringify({ files:results.length, conflicts:results.filter(x=>x.conflicts.length).map(x=>x.path) }));
