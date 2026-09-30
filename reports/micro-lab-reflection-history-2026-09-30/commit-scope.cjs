// Build a Micro Lab commit without including other working-tree or staged changes.
// Abort on overlapping changes; preserve unrelated staging under the real index lock.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = process.cwd();
const report = path.resolve('reports/micro-lab-reflection-history-2026-09-30');
const mode = process.argv[2];
if (!['--prepare', '--commit'].includes(mode)) throw new Error('Use --prepare or --commit.');
const git = (args, env = {}, input) => cp.execFileSync('git', args, { cwd: root, env: { ...process.env, ...env }, input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const shared = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const owned = [
  'stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js',
  'reports/micro-lab-enhancement-2026-09-27/sync.cjs',
  ...fs.readdirSync('tests').filter(n => /^(microbiology_.*|stem_microbiology_quiz)\.test\.js$/.test(n)).map(n => 'tests/' + n),
  ...fs.readdirSync('tests/e2e').filter(n => /^microbiology-.*\.spec\.ts$/.test(n)).map(n => 'tests/e2e/' + n)
];
for (const folder of ['reports/micro-lab-reflection-history-2026-09-30']) {
  for (const name of fs.readdirSync(folder)) {
    if (/^commit-(manifest|receipt)/.test(name)) continue;
    if (/\.(md|json|png|txt|csv|cjs)$/.test(name) && fs.statSync(path.join(folder, name)).isFile()) owned.push(folder + '/' + name);
  }
}
function namespace(text) {
  const marker = '    "microbiology": {';
  const index = text.indexOf(marker);
  if (index < 0 || text.indexOf(marker, index + 1) >= 0) throw new Error('Ambiguous Micro Lab namespace');
  const start = text.indexOf('{', index);
  let depth = 0, quoted = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (escape) escape = false; else if (ch === '\\') escape = true; else if (ch === '"') quoted = false; continue; }
    if (ch === '"') quoted = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      const raw = text.slice(start, i + 1);
      if (JSON.stringify(JSON.parse(raw)) !== JSON.stringify(JSON.parse(text).stem.microbiology)) throw new Error('Wrong namespace');
      return { start, end: i + 1, raw };
    }
  }
  throw new Error('Unclosed namespace');
}
function mergeNamespace(base, incoming) {
  const part = namespace(base), desired = namespace(incoming);
  const result = base.slice(0, part.start) + desired.raw + base.slice(part.end);
  JSON.parse(result); return result;
}
const sealed = new Map(owned.map(file => [file, hash(fs.readFileSync(file))]));
const translations = new Map(shared.map(file => [file, fs.readFileSync(file, 'utf8')]));
if (process.env.GIT_INDEX_FILE) throw new Error('Run this helper with the normal repository index.');
const branch = git(['symbolic-ref', '-q', 'HEAD']).trim();
const initialParent = git(['rev-parse', branch]).trim();
const actualIndex = path.resolve(git(['rev-parse', '--git-path', 'index']).trim());
const index = path.join(report, '.commit-index-' + process.pid);
const startupIndex = path.join(report, '.startup-index-' + process.pid);
const env = { GIT_INDEX_FILE: index };
const receiptPath = path.join(report, 'commit-receipt.json');
let initialStaging;
function verifyInputs() {
  for (const [file, sha] of sealed) if (hash(fs.readFileSync(file)) !== sha) throw new Error('File changed during preparation: ' + file);
  for (const [file, text] of translations) if (namespace(fs.readFileSync(file, 'utf8')).raw !== namespace(text).raw) throw new Error('Micro Lab translations changed during preparation: ' + file);
}
function assertBranch() {
  if (git(['symbolic-ref', '-q', 'HEAD']).trim() !== branch) throw new Error('The checked-out branch changed; nothing else will be published.');
}
function assertSafeParent(parent) {
  if (parent === initialParent) return;
  try { git(['merge-base', '--is-ancestor', initialParent, parent]); }
  catch { throw new Error('The original parent was rewritten; restart after reviewing the repository.'); }
  const overlap = git(['diff', '--name-only', '-z', initialParent, parent, '--', ...owned]).split('\0').filter(Boolean);
  if (overlap.length) throw new Error('Concurrent commit changed owned files: ' + overlap.join(', '));
  for (const file of shared) {
    if (namespace(git(['show', initialParent + ':' + file])).raw !== namespace(git(['show', parent + ':' + file])).raw) {
      throw new Error('Concurrent commit changed Micro Lab translations: ' + file);
    }
  }
}
function scopedStaging(targetEnv) {
  return {
    owned: git(['ls-files', '--stage', '-z', '--', ...owned], targetEnv),
    translations: shared.map(file => namespace(git(['show', ':' + file], targetEnv)).raw)
  };
}
function assertStaging(targetEnv) {
  if (JSON.stringify(scopedStaging(targetEnv)) !== JSON.stringify(initialStaging)) {
    throw new Error('Owned files or Micro Lab translations were staged differently after startup.');
  }
}
function stageBlob(file, text, targetEnv, fileMode) {
  const oid = git(['hash-object', '-w', '--stdin'], {}, text).trim();
  git(['update-index', '--add', '--cacheinfo', fileMode + ',' + oid + ',' + file], targetEnv);
}
function treeEntry(tree, file) {
  const match = /^(\d+) blob ([a-f0-9]+)\t/.exec(git(['ls-tree', tree, '--', file]));
  if (!match) throw new Error('Missing committed file: ' + file);
  return { mode: match[1], oid: match[2] };
}
function ownedIndexUpdates(tree) {
  const entries = new Map();
  for (const row of git(['ls-tree', '-z', tree, '--', ...owned]).split('\0').filter(Boolean)) {
    const match = /^(\d+) blob ([a-f0-9]+)\t([^\0]+)$/.exec(row);
    if (!match) throw new Error('Unexpected owned tree entry.');
    entries.set(match[3], { mode: match[1], oid: match[2] });
  }
  return owned.map(file => {
    if (/[\r\n\t\0]/.test(file)) throw new Error('Unsupported owned filename: ' + file);
    const entry = entries.get(file);
    if (!entry) throw new Error('Missing committed file: ' + file);
    return entry.mode + ' ' + entry.oid + '\t' + file + '\n';
  }).join('');
}
function prepare(parent) {
  git(['read-tree', parent], env);
  git(['add', '--', ...owned], env);
  for (const file of shared) stageBlob(file, mergeNamespace(git(['show', parent + ':' + file]), translations.get(file)), env, treeEntry(parent, file).mode);
  const tree = git(['write-tree'], env).trim();
  const changed = git(['diff', '--name-only', parent, tree]).trim().split('\n').filter(Boolean);
  if (!changed.length || changed.some(file => !owned.includes(file) && !shared.includes(file))) throw new Error('Invalid commit scope');
  fs.writeFileSync(path.join(report, 'commit-manifest.json'), JSON.stringify({ branch, parent, tree, changed, validatedFiles: Object.fromEntries(sealed) }, null, 2) + '\n');
  return { tree, changed };
}
function writeDurable(file, contents) {
  const fileFd = fs.openSync(file, 'w');
  try { fs.writeFileSync(fileFd, contents); fs.fsyncSync(fileFd); }
  finally { fs.closeSync(fileFd); }
}
function writeReceipt(receipt) {
  const temporary = receiptPath + '.' + process.pid + '.tmp';
  try {
    writeDurable(temporary, JSON.stringify(receipt, null, 2) + '\n');
    fs.renameSync(temporary, receiptPath);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function publish(commit, parent, prepared) {
  const lock = actualIndex + '.lock';
  const refresh = path.join(report, '.refresh-index-' + process.pid);
  const beforeFile = path.join(report, 'commit-recovery-' + commit + '-before.index');
  const afterFile = path.join(report, 'commit-recovery-' + commit + '-after.index');
  const receipt = { branch, commit, parent, tree: prepared.tree, changed: prepared.changed, refUpdated: false, indexRefreshed: false,
    actualIndex, originalIndex: beforeFile, refreshedIndex: afterFile };
  let fd, ownsLock = false;
  // Wait only for an existing Git operation; never remove someone else's lock.
  for (let attempt = 0; attempt < 300; attempt++) {
    try { fd = fs.openSync(lock, 'wx'); ownsLock = true; break; }
    catch (error) { if (error.code !== 'EEXIST') throw error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); }
  }
  if (!ownsLock) throw new Error('Shared index is busy; no commit reference was updated.');
  try {
    assertBranch();
    const currentParent = git(['rev-parse', branch]).trim();
    assertSafeParent(currentParent);
    if (currentParent !== parent) return false; // Rebuild and rerun the hook on the new, nonoverlapping parent.
    verifyInputs();
    const targetEnv = { GIT_INDEX_FILE: refresh };
    const before = fs.readFileSync(actualIndex);
    fs.writeFileSync(refresh, before);
    assertStaging(targetEnv);
    git(['update-index', '--index-info'], targetEnv, ownedIndexUpdates(prepared.tree));
    for (const file of shared) {
      const staged = git(['show', ':' + file], targetEnv);
      const entry = /^(\d+) [a-f0-9]+ 0\t/.exec(git(['ls-files', '--stage', '--', file], targetEnv));
      if (!entry) throw new Error('Shared translation file has no resolved staged entry: ' + file);
      stageBlob(file, mergeNamespace(staged, git(['show', prepared.tree + ':' + file])), targetEnv, entry[1]);
    }
    const after = fs.readFileSync(refresh);
    writeDurable(beforeFile, before); writeDurable(afterFile, after);
    fs.writeFileSync(fd, after); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    // Keep the lock file present through the ref update and index replacement.
    assertBranch(); verifyInputs();
    if (git(['rev-parse', branch]).trim() !== parent) return false;
    receipt.originalIndexHash = hash(before); receipt.refreshedIndexHash = hash(after);
    writeReceipt(receipt); // Recovery intent is durable before the reference can move.
    // Target the captured branch, never whichever branch symbolic HEAD might name.
    git(['update-ref', '-m', 'commit: Improve Micro Lab evidence reflections and Gram report history', branch, commit, parent]);
    receipt.refUpdated = true; writeReceipt(receipt);
    assertBranch();
    if (git(['rev-parse', branch]).trim() !== commit) throw new Error('The branch advanced again; preserve the recovery index for review.');
    fs.renameSync(lock, actualIndex); ownsLock = false;
    receipt.indexRefreshed = true; receipt.originalIndex = null; receipt.refreshedIndex = null;
    writeReceipt(receipt);
    return true;
  } catch (error) {
    // If Git returned an error after publishing, do not retry and create another commit.
    if (!receipt.refUpdated) {
      try { git(['merge-base', '--is-ancestor', commit, branch]); receipt.refUpdated = true; } catch {}
    }
    receipt.error = String(error.message || error);
    try { writeReceipt(receipt); } catch (receiptError) { console.error('Could not update recovery receipt: ' + receiptError.message); }
    if (receipt.refUpdated && !receipt.indexRefreshed) {
      console.error('Commit ' + commit + ' exists. Recover the index using ' + receiptPath + '; do not create another commit.');
    }
    throw error;
  } finally {
    try { if (fd !== undefined) fs.closeSync(fd); }
    finally { if (ownsLock && fs.existsSync(lock)) fs.unlinkSync(lock); }
    if (fs.existsSync(refresh)) fs.unlinkSync(refresh);
    if (!receipt.refUpdated || receipt.indexRefreshed) {
      for (const file of [beforeFile, afterFile]) if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
}
try {
  if (fs.existsSync(receiptPath)) {
    const previous = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    if (previous.indexRefreshed === false && previous.commit) {
      let published = previous.refUpdated === true;
      try { git(['merge-base', '--is-ancestor', previous.commit, branch]); published = true; } catch {}
      if (published) throw new Error('A published commit still needs index recovery; review ' + receiptPath + ' before rerunning.');
    }
  }
  fs.copyFileSync(actualIndex, startupIndex);
  initialStaging = scopedStaging({ GIT_INDEX_FILE: startupIndex });
  assertBranch();
  if (git(['rev-parse', branch]).trim() !== initialParent) throw new Error('The parent changed during startup; rerun after reviewing the repository.');
  let finished = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    assertBranch(); verifyInputs();
    const parent = git(['rev-parse', branch]).trim();
    assertSafeParent(parent);
    const prepared = prepare(parent);
    if (mode === '--prepare') { verifyInputs(); console.log(git(['diff', '--stat', parent, prepared.tree])); finished = true; break; }
    // Honor the installed pre-commit checks with this commit's isolated index.
    process.stdout.write(git(['hook', 'run', 'pre-commit'], env));
    verifyInputs();
    if (git(['write-tree'], env).trim() !== prepared.tree) throw new Error('The pre-commit hook changed the isolated index; review and prepare again.');
    const message = 'Improve Micro Lab evidence reflections and Gram report history\n\nKeep later Resistance and quiz correction reflections separate from original evidence. Resume saved Resistance review from Home and preserve one previous Gram report with explicit restore. Include focused regressions and validation artifacts.\n';
    const args = ['commit-tree', prepared.tree, '-p', parent, '-F', '-'];
    try { if (git(['config', '--bool', '--get', 'commit.gpgsign']).trim() === 'true') args.push('-S'); } catch {}
    const commit = git(args, {}, message).trim();
    if (!publish(commit, parent, prepared)) continue;
    console.log(JSON.stringify({ branch, commit, changedFiles: prepared.changed.length, indexRefreshed: true })); finished = true; break;
  }
  if (!finished) throw new Error('The parent kept advancing; no commit reference was updated.');
} finally {
  for (const file of [index, startupIndex]) if (fs.existsSync(file)) fs.unlinkSync(file);
}
