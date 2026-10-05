const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createTwoFilesPatch } = require('diff');
const parser = require('@babel/parser');
const root = path.resolve(__dirname, '../..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const changes = JSON.parse(fs.readFileSync(path.join(root, 'reports/alloflow-resume-2026-10-01/audio/host-replacements.json'), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const count = (text, part) => text.split(part).length - 1;
const parse = source => parser.parse(source, { sourceType: 'unambiguous', plugins: ['jsx'] });
const manifestPath = path.join(__dirname, 'host-integration.json');
if (process.argv.includes('--apply')) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const entry of manifest.hosts) {
    assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.beforeHash, `Concurrent edit: ${entry.file}`);
    assert.equal(hash(fs.readFileSync(path.join(__dirname, entry.candidate))), entry.afterHash);
  }
  for (const entry of manifest.hosts) {
    const candidate = fs.readFileSync(path.join(__dirname, entry.candidate));
    parse(candidate.toString('utf8'));
    assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.beforeHash, `Concurrent edit before write: ${entry.file}`);
    fs.writeFileSync(path.join(root, entry.file), candidate);
    assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.afterHash);
  }
  fs.writeFileSync(path.join(__dirname, 'host-integration-applied.json'), JSON.stringify({ ...manifest, appliedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log('Applied exact guarded audio integration to three host sources.');
} else {
  fs.mkdirSync(path.join(__dirname, 'host-before'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, 'host-candidate'), { recursive: true });
  const manifest = { preparedAt: new Date().toISOString(), hosts: [] };
  for (const [index, file] of hosts.entries()) {
    const bytes = fs.readFileSync(path.join(root, file));
    let candidate = bytes.toString('utf8');
    const eol = candidate.includes('\r\n') ? '\r\n' : '\n';
    const statuses = [];
    for (const [i, change] of changes.entries()) {
      const before = change.before.replace(/\r?\n/g, eol), after = change.after.replace(/\r?\n/g, eol);
      if (count(candidate, before) === 1) { candidate = candidate.replace(before, after); statuses.push({ index: i, status: 'applied' }); }
      else { assert.equal(count(candidate, after), 1, `Missing or ambiguous anchor ${i}: ${file}`); statuses.push({ index: i, status: 'already-present' }); }
    }
    parse(candidate);
    const snapshot = `host-before/${index}-${path.basename(file)}`;
    const target = `host-candidate/${index}-${path.basename(file)}`;
    fs.writeFileSync(path.join(__dirname, snapshot), bytes);
    fs.writeFileSync(path.join(__dirname, target), candidate);
    fs.writeFileSync(path.join(__dirname, `host-${index}.patch`), createTwoFilesPatch(file, file, bytes.toString('utf8'), candidate));
    manifest.hosts.push({ file, beforeHash: hash(bytes), afterHash: hash(Buffer.from(candidate)), snapshot, candidate: target, statuses });
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest.hosts.map(({ file, statuses }) => ({ file, changes: statuses.filter(s => s.status === 'applied').length })), null, 2));
}
