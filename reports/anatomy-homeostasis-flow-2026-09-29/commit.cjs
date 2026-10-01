const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const stageHelper = require('./stage.cjs');

const folder = __dirname;
const subject = 'Refine anatomy homeostasis learning and imaging guidance';
const resultFile = path.join(folder, 'commit-result.json');
const isolatedIndex = path.join(folder, 'anatomy-commit.index');
const sharedEnv = { ...process.env };
delete sharedEnv.GIT_INDEX_FILE;
const gitRaw = (args, env = sharedEnv) => stageHelper.gitRaw(args, env);
const git = (args, env = sharedEnv) => gitRaw(args, env).trimEnd();
const sourceFiles = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const readResult = () => fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf8')) : null;
const saveResult = result => fs.writeFileSync(resultFile, JSON.stringify(result, null, 2) + '\n');
const lines = text => text.split('\n').filter(Boolean);

function indexEntries(files, env = sharedEnv) {
  const entries = Object.fromEntries(files.map(file => [file, '']));
  for (const line of lines(gitRaw(['ls-files', '--stage', '--', ...files], env))) {
    const tab = line.indexOf('\t');
    const file = line.slice(tab + 1);
    if (file in entries) entries[file] += line + '\n';
  }
  return entries;
}

function headEntries(files, head) {
  const entries = Object.fromEntries(files.map(file => [file, '']));
  for (const line of lines(gitRaw(['ls-tree', '-r', head, '--', ...files]))) {
    const match = line.match(/^(\d+) blob ([a-f0-9]+)\t(.+)$/);
    if (match && match[3] in entries) entries[match[3]] = match[1] + ' ' + match[2] + ' 0\t' + match[3] + '\n';
  }
  return entries;
}

async function finishCommit(result) {
  if (!result || !result.commit || !Array.isArray(result.files) || !result.indexBeforeEntries) throw new Error('No recoverable anatomy commit result is available');
  git(['merge-base', '--is-ancestor', result.commit, 'HEAD']);
  const sharedIndex = path.resolve(stageHelper.repoRoot, git(['rev-parse', '--git-path', 'index']));
  const lockPath = sharedIndex + '.lock';
  const cleanupIndex = path.join(folder, 'anatomy-cleanup.index');
  let complete = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    let lock;
    let ownsLock = false;
    try { lock = fs.openSync(lockPath, 'wx'); ownsLock = true; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    if (lock !== undefined) {
      try {
        const head = git(['rev-parse', 'HEAD']);
        git(['merge-base', '--is-ancestor', result.commit, head]);
        for (const file of sourceFiles) if (stageHelper.sourceHash(gitRaw(['show', head + ':' + file])) !== result.sourceSha256) throw new Error('A later commit changed the verified anatomy source; preserving the shared index');
        const current = indexEntries(result.files);
        const expected = headEntries(result.files, head);
        for (const file of result.files) if (current[file] !== result.indexBeforeEntries[file] && current[file] !== expected[file]) throw new Error('Concurrent staging changed an anatomy path; preserving it: ' + file);
        fs.copyFileSync(sharedIndex, cleanupIndex);
        const cleanupEnv = { ...sharedEnv, GIT_INDEX_FILE: cleanupIndex };
        git(['restore', '--staged', '--source=' + head, '--', ...result.files], cleanupEnv);
        if (git(['rev-parse', 'HEAD']) !== head) throw new Error('HEAD changed during index cleanup; run --finish-only again');
        // The lock protects the live index while the temporary copy changes only our paths.
        fs.writeFileSync(lock, fs.readFileSync(cleanupIndex));
        fs.closeSync(lock);
        lock = undefined;
        fs.renameSync(lockPath, sharedIndex);
        ownsLock = false;
        complete = true;
        break;
      } finally {
        if (lock !== undefined) fs.closeSync(lock);
        if (ownsLock && fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      }
    }
    if (!attempt) console.log('Waiting for the existing Git index lock. No existing lock will be removed.');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  if (!complete) throw new Error('Another Git operation still holds the index lock. The anatomy commit already exists; run --finish-only to finish cleanup');
  const staged = lines(git(['diff', '--cached', '--name-only']));
  if (staged.some(file => result.files.includes(file))) throw new Error('An anatomy path remains staged after cleanup');
  result.cleanupStatus = 'complete';
  result.head = git(['rev-parse', 'HEAD']);
  result.sharedStagedFiles = staged.length;
  result.anatomySourceMatchesVerification = true;
  saveResult(result);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function commit() {
  const previous = readResult();
  if (previous && previous.commit) {
    if (previous.cleanupStatus === 'complete') throw new Error('This report already records an anatomy commit; no duplicate commit was created');
    return finishCommit(previous);
  }
  const verification = JSON.parse(fs.readFileSync(path.join(folder, 'verification.json'), 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(verification.sourceSha256 || '')) throw new Error('Missing normalized LF verification hash');
  const message = path.join(folder, 'commit-message.txt');
  fs.writeFileSync(message, subject + '\n\nKeep Homeostasis predictions and retrieval answers aligned with the lesson state, and clarify imaging plane labels and geometric measurements.\n\nValidate focused regressions, browser interaction, responsive layouts, and accessibility.\n');
  for (let attempt = 0; attempt < 5; attempt++) {
    const base = git(['rev-parse', 'HEAD']);
    const isolatedEnv = { ...sharedEnv, GIT_INDEX_FILE: isolatedIndex, ANATOMY_COMMIT_BASE: base };
    git(['read-tree', base], isolatedEnv);
    cp.execFileSync(process.execPath, [path.join(folder, 'stage.cjs'), '--stage'], { cwd: stageHelper.repoRoot, env: isolatedEnv, stdio: 'inherit' });
    const files = lines(git(['diff', '--cached', '--name-only', base], isolatedEnv));
    if (!files.length) throw new Error('No anatomy changes to commit');
    if (git(['diff', '--cached', '--name-only', '--', ...files])) throw new Error('Anatomy paths already staged in the shared index; preserving them');
    const beforeEntries = indexEntries(files);
    for (const file of sourceFiles) if (stageHelper.sourceHash(gitRaw(['show', ':' + file], isolatedEnv)) !== verification.sourceSha256) throw new Error('Staged anatomy source differs from verification: ' + file);
    const tree = git(['write-tree'], isolatedEnv);
    const createdCommit = git(['commit-tree', tree, '-p', base, '-F', message]);
    const committedFiles = lines(git(['diff-tree', '--no-commit-id', '--name-only', '-r', createdCommit])).sort();
    if (JSON.stringify(committedFiles) !== JSON.stringify(files.slice().sort())) throw new Error('Unexpected anatomy commit scope');
    if (git(['diff', '--cached', '--name-only', '--', ...files])) throw new Error('Anatomy staging changed before the commit; preserving it');
    try { git(['update-ref', '-m', 'commit: ' + subject, 'HEAD', createdCommit, base]); }
    catch (error) { if (git(['rev-parse', 'HEAD']) !== base) continue; throw error; }
    // Record the committed SHA before attempting shared-index cleanup, so a lock cannot lead to a duplicate commit.
    const result = { commit: createdCommit, parent: base, files: committedFiles, sourceSha256: verification.sourceSha256, indexBeforeEntries: beforeEntries, cleanupStatus: 'pending' };
    saveResult(result);
    return finishCommit(result);
  }
  throw new Error('Concurrent HEAD changes prevented the anatomy commit; no other commit was overwritten');
}

module.exports = { indexEntries, headEntries, finishCommit, commit };
if (require.main === module) {
  if (process.argv.includes('--finish-only')) finishCommit(readResult()).catch(error => { console.error(error.message); process.exitCode = 1; });
  else if (process.argv.includes('--commit')) commit().catch(error => { console.error(error.message); process.exitCode = 1; });
  else console.log('No Git changes made. Use --commit after verification, or --finish-only to finish a recorded commit.');
}
