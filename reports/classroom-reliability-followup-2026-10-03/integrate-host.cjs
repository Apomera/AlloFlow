'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), parser = require('@babel/parser');
const { execFileSync } = require('node:child_process');
const { createTwoFilesPatch, applyPatch, reversePatch, parsePatch } = require('diff');
const root = path.resolve(__dirname, '../..'), out = path.join(__dirname, 'host-integration');
const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const head = () => execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8', windowsHide: true}).trim();
const read = file => fs.readFileSync(path.join(root, file));
const groups = ['student-response-v2.patch.json', 'receiver/replacements.json'];
function transform(source) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  let next = source;
  for (const file of groups) {
    const input = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
    for (const row of input.replacements || input) {
      const before = row.before.replace(/\r?\n/g, eol), after = row.after.replace(/\r?\n/g, eol);
      assert.equal(next.split(before).length - 1, 1, 'Missing/ambiguous anchor: ' + (row.name || row.label));
      next = next.replace(before, after);
    }
  }
  parser.parse(next, {sourceType: 'unambiguous', plugins: ['jsx']});
  const patch = createTwoFilesPatch(files[0], files[0], source, next);
  assert.equal(applyPatch(next, reversePatch(parsePatch(patch)[0]), {fuzzFactor: 0}), source, 'Exact reverse-byte guard failed');
  return {next, patch};
}
if (!process.argv.includes('--apply')) {
  assert(!fs.existsSync(path.join(out, 'prepared.json')), 'Retain preparation');
  const startHead = head(), rows = files.map(file => ({file, bytes: read(file)}));
  for (const row of rows) assert(row.bytes.equals(rows[0].bytes), 'Host triplet drift');
  const {next, patch} = transform(rows[0].bytes.toString('utf8'));
  for (const row of rows) assert(read(row.file).equals(row.bytes), 'Concurrent edit while preparing');
  assert.equal(head(), startHead);
  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'before.txt'), rows[0].bytes, {flag: 'wx'});
  fs.writeFileSync(path.join(out, 'candidate.txt'), next, {flag: 'wx'});
  fs.writeFileSync(path.join(out, 'owned.patch'), patch, {flag: 'wx'});
  fs.writeFileSync(path.join(out, 'prepared.json'), JSON.stringify({at: new Date().toISOString(), startHead, productionApplied: false, syntax: 'pass', reverseExact: true, patchInputs: Object.fromEntries(groups.map(f=>[f,hash(fs.readFileSync(path.join(__dirname,f)))])), files: rows.map(row=>({file: row.file, before: hash(row.bytes), after: hash(next)}))}, null, 2)+'\n', {flag:'wx'});
  console.log('Prepared combined host candidate, exact owned diff, syntax and parity guards.');
} else {
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'prepared.json'))), candidate = fs.readFileSync(path.join(out, 'candidate.txt'));
  assert.equal(head(), manifest.startHead, 'HEAD changed');
  for (const [f,sha] of Object.entries(manifest.patchInputs)) assert.equal(hash(fs.readFileSync(path.join(__dirname,f))),sha,'Patch changed');
  const before = fs.readFileSync(path.join(out, 'before.txt'));
  assert.equal(transform(before.toString('utf8')).next, candidate.toString('utf8'));
  for (const row of manifest.files) { assert.equal(hash(read(row.file)),row.before,'Concurrent host edit');assert.equal(hash(candidate),row.after); }
  for (const row of manifest.files) {
    const target = path.join(root,row.file), temporary = target+'.classroom-followup-'+process.pid+'.tmp';
    assert.equal(hash(read(row.file)),row.before);
    fs.writeFileSync(temporary,candidate,{flag:'wx'});
    assert.equal(hash(read(row.file)),row.before);
    fs.renameSync(temporary,target);assert.equal(hash(read(row.file)),row.after);
  }
  fs.writeFileSync(path.join(out,'applied.json'),JSON.stringify({...manifest,at:new Date().toISOString(),productionApplied:true},null,2)+'\n',{flag:'wx'});
  console.log('Applied only reviewed student persistence and receiver host replacements.');
}
