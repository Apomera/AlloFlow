'use strict';
// Creates review candidates only. Canonical writes use integrate-delta.cjs later.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const diff = require('diff');
const root = path.resolve(__dirname, '../..');
const norm = text => text.replace(/\r\n/g, '\n');
const [label, source, ref, ...files] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(label || '')) throw new Error('Invalid label');
const folder = path.join(__dirname, 'merge-' + label);
if (source === '--emit') {
  const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json')));
  let patch = '';
  for (const entry of manifest) {
    const before = fs.readFileSync(path.join(folder, 'before', entry.file), 'utf8');
    const current = fs.existsSync(path.join(root, entry.file)) ? norm(fs.readFileSync(path.join(root, entry.file), 'utf8')) : '';
    if (current !== before) throw new Error('Canonical input changed: ' + entry.file);
    const after = fs.readFileSync(path.join(folder, 'resolved', entry.file), 'utf8');
    if (/^(?:<<<<<<< |=======$|>>>>>>> |\|\|\|\|\|\|\| )/m.test(after)) throw new Error('Unresolved conflict: ' + entry.file);
    if (after !== before) patch += diff.createTwoFilesPatch(entry.existed ? 'a/' + entry.file : '/dev/null', 'b/' + entry.file, before, after);
  }
  fs.writeFileSync(path.join(folder, 'resolved.patch'), patch);
  console.log(path.join(folder, 'resolved.patch'));
  process.exit(0);
}
if (fs.existsSync(folder)) throw new Error('Candidate already exists: ' + label);
const manifest = [];
for (const file of files) {
  if (path.isAbsolute(file) || file.includes('..')) throw new Error('Invalid file');
  const existed = fs.existsSync(path.join(root, file));
  const before = existed ? norm(fs.readFileSync(path.join(root, file), 'utf8')) : '';
  const baseResult = cp.spawnSync('git', ['--no-optional-locks', 'show', 'fd4044c862ed9b345b340d69cb1411a19c09dafb:' + file], { cwd: root, encoding: 'utf8', maxBuffer: 30000000 });
  const base = baseResult.status === 0 ? norm(baseResult.stdout) : '';
  const incoming = ref === 'WORKTREE' ? norm(fs.readFileSync(path.join(source, file), 'utf8')) : norm(cp.execFileSync('git', ['--no-optional-locks', '-C', source, 'show', ref + ':' + file], { encoding: 'utf8', maxBuffer: 30000000 }));
  for (const [kind, value] of Object.entries({ before, base, incoming })) {
    const target = path.join(folder, kind, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value, { flag: 'wx' });
  }
  const result = cp.spawnSync('git', ['merge-file', '--stdout', '--diff3', '-L', 'integrated', '-L', 'release-base', '-L', label, path.join(folder, 'before', file), path.join(folder, 'base', file), path.join(folder, 'incoming', file)], { encoding: 'utf8', maxBuffer: 30000000 });
  if (result.status === null || result.status > 127) throw new Error(result.stderr || 'merge failed');
  const output = path.join(folder, 'resolved', file); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, result.stdout, { flag: 'wx' });
  const entry = { file, existed, conflicts: (result.stdout.match(/^<<<<<<< /gm) || []).length }; manifest.push(entry); console.log(JSON.stringify(entry));
}
fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));
