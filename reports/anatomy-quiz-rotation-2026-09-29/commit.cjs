const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const folder = __dirname;
const isolatedIndex = path.join(folder, 'anatomy-commit.index');
const isolatedEnv = { ...process.env, GIT_INDEX_FILE: isolatedIndex };
const git = (args, env = process.env) => cp.execFileSync('git', args, { env, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }).trimEnd();
const sourceHash = text => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const verification = JSON.parse(fs.readFileSync(path.join(folder, 'verification.json'), 'utf8'));
const message = path.join(folder, 'commit-message.txt');
fs.writeFileSync(message, 'Refine anatomy study flow and quiz coverage\n\nClarify Cards and Quiz layouts, preserve diagram-study return, and cover every structure across four question types while keeping saved answers stable.\n\nValidated with 400 broad checks, 65 final focused checks, three browser walkthroughs, and 15 scoped accessibility scans.\n');
let result;
for (let attempt = 0; attempt < 3; attempt++) {
  const base = git(['rev-parse', 'HEAD']);
  git(['read-tree', base], isolatedEnv);
  cp.execFileSync(process.execPath, [path.join(folder, 'stage.cjs'), '--stage'], { env: isolatedEnv, stdio: 'inherit' });
  const files = git(['diff', '--cached', '--name-only', base], isolatedEnv).split('\n').filter(Boolean);
  if (!files.length) throw new Error('No anatomy changes to commit');
  const alreadyStaged = git(['diff', '--cached', '--name-only', '--', ...files]);
  if (alreadyStaged.trim()) throw new Error('Anatomy paths already staged in the shared index; preserving them');
  for (const file of ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js']) {
    if (sourceHash(git(['show', ':' + file], isolatedEnv) + '\n') !== verification.sourceSha256) throw new Error('Staged anatomy source differs from the verified source');
  }
  const tree = git(['write-tree'], isolatedEnv);
  const commit = git(['commit-tree', tree, '-p', base, '-F', message]);
  // Compare-and-swap protects another task's concurrent commit from being overwritten.
  try { git(['update-ref', '-m', 'commit: Refine anatomy study flow and quiz coverage', 'HEAD', commit, base]); }
  catch (error) { if (git(['rev-parse', 'HEAD']) !== base) continue; throw error; }
  // Update only our paths in the shared index, leaving its unrelated staged entries intact.
  git(['restore', '--staged', '--source=' + commit, '--', ...files]);
  const committed = git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split('\n').filter(Boolean);
  if (JSON.stringify(committed.sort()) !== JSON.stringify(files.slice().sort())) throw new Error('Unexpected commit scope');
  result = { commit, parent: base, files: committed, sharedStagedFiles: git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean).length };
  fs.writeFileSync(path.join(folder, 'commit-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  break;
}
if (!result) throw new Error('Concurrent HEAD updates prevented an atomic anatomy commit; no other task was overwritten');
