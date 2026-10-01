const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const git = args => cp.execFileSync('git', args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }).trimEnd();
const commit = '963c5a4e8b80eb20ba53f8d3d31fff22f4591537';
const files = git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).split('\n').filter(Boolean);
const verification = JSON.parse(fs.readFileSync(path.join(__dirname, 'verification.json'), 'utf8'));
(async () => {
  let complete = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    if (!fs.existsSync('.git/index.lock')) {
      try { git(['restore', '--staged', '--source=' + commit, '--', ...files]); complete = true; break; }
      catch (error) { if (!String(error.stderr).includes('index.lock')) throw error; }
    }
    if (!attempt) console.log('Waiting for the existing Git index lock; no lock file was removed.');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  if (!complete) throw new Error('The other Git operation still holds the index lock. The anatomy commit already exists.');
  git(['merge-base', '--is-ancestor', commit, 'HEAD']);
  const committedSource = git(['show', 'HEAD:stem_lab/stem_tool_anatomy.js']) + '\n';
  if (crypto.createHash('sha256').update(committedSource).digest('hex') !== verification.sourceSha256) throw new Error('Current HEAD differs from the verified anatomy source');
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  if (staged.some(file => files.includes(file))) throw new Error('An anatomy path is still staged');
  const result = { commit, head: git(['rev-parse', 'HEAD']), files, sharedStagedFiles: staged.length, anatomySourceMatchesVerification: true };
  fs.writeFileSync(path.join(__dirname, 'commit-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
