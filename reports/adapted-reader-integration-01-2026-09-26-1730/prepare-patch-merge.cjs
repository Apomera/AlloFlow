'use strict';
// Make source candidates only; reconstruct the exact incremental base by reversing
// the handed-off patch from its completed owner source. Canonical writes are separate.
const fs = require('fs'), path = require('path'), cp = require('child_process'), diff = require('diff');
const root = path.resolve(__dirname, '../..');
const [label, patchFile, incomingRoot] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(label || '')) throw Error('Invalid label');
const folder = path.join(__dirname, 'merge-' + label);
if (fs.existsSync(folder)) throw Error('Candidate already exists');
const norm = value => value.replace(/\r\n/g, '\n');
const manifest = [];
for (const patch of diff.parsePatch(norm(fs.readFileSync(patchFile, 'utf8')))) {
  const file = patch.newFileName.replace(/^b\//, '');
  if (path.isAbsolute(file) || file.includes('..')) throw Error('Invalid target');
  const existed = fs.existsSync(path.join(root, file));
  const before = existed ? norm(fs.readFileSync(path.join(root, file), 'utf8')) : '';
  let incoming, base, resolved = diff.applyPatch(before, patch, { fuzzFactor: 0 });
  if (typeof resolved === 'string') { base = before; incoming = resolved; }
  else {
    incoming = norm(fs.readFileSync(path.join(incomingRoot, file), 'utf8'));
    base = diff.applyPatch(incoming, diff.reversePatch(patch), { fuzzFactor: 0 });
    if (typeof base !== 'string') throw Error('Cannot reconstruct patch base: ' + file);
  }
  for (const [kind, value] of Object.entries({ before, base, incoming })) {
    const target = path.join(folder, kind, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value, { flag: 'wx' });
  }
  if (typeof resolved !== 'string') {
    const result = cp.spawnSync('git', ['merge-file', '--stdout', '--diff3', '-L', 'integrated', '-L', 'incremental-base', '-L', label, path.join(folder, 'before', file), path.join(folder, 'base', file), path.join(folder, 'incoming', file)], { encoding: 'utf8', maxBuffer: 30000000 });
    if (result.status === null || result.status > 127) throw Error(result.stderr || 'Merge failed');
    resolved = result.stdout;
  }
  const target = path.join(folder, 'resolved', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, resolved, { flag: 'wx' });
  const entry = { file, existed, conflicts: (resolved.match(/^<<<<<<< /gm) || []).length }; manifest.push(entry); console.log(JSON.stringify(entry));
}
fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));
