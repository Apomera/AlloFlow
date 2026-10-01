const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const main = path.resolve(__dirname, '../..');
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'integration-merge.json')));
const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, 'integration-main-snapshot.json')));
const build = JSON.parse(fs.readFileSync(path.join(__dirname, 'integration-build.json')));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const prior = new Map(snapshot.captured.map(x => [x.path, x.deleted ? null : x.sha256]));
const capturedPaths = new Set(prior.keys());
const normalizedHash = b => hash(Buffer.from(b.toString('utf8').replace(/\r\n/g, '\n')));
for (const item of receipt.results) {
  if (!prior.has(item.path) && item.before) prior.set(item.path, item.before === hash(Buffer.alloc(0)) ? null : item.before);
  if (!prior.has(item.path) && item.mode === 'new-review-test') prior.set(item.path, null);
}
const files = new Set(receipt.results.map(x => x.path));
for (const item of build.pairs) {
  files.add(item.path);
  files.add('desktop/web-app/public/' + item.path);
}
for (const item of receipt.results.filter(x => x.path.startsWith('lang/'))) files.add('desktop/web-app/public/' + item.path);
for (const p of ['desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt', 'tests/tyler_guided_own_sources_integration.test.js', 'tests/roster_session_history.test.js', 'tests/e2e/02-launch-pad.spec.ts', 'dev-tools/tyler-merge-browser.cjs']) files.add(p);
const fallbackPaths = [...files].filter(p => !prior.has(p));
if (fallbackPaths.length) {
  const result = cp.spawnSync('git', ['cat-file', '--batch'], {cwd:main, input:fallbackPaths.map(p=>snapshot.head+':'+p).join('\n')+'\n', maxBuffer:128*1024*1024});
  if (result.status !== 0) throw new Error('Cannot read baseline blobs: '+result.stderr);
  let offset = 0;
  for (const p of fallbackPaths) {
    const end = result.stdout.indexOf(10, offset);
    const header = result.stdout.subarray(offset, end).toString();
    offset = end + 1;
    if (header.endsWith(' missing')) { prior.set(p, null); continue; }
    const match = header.match(/^[0-9a-f]+ blob (\d+)$/);
    if (!match) throw new Error('Unexpected baseline object: '+header);
    const size = Number(match[1]);
    prior.set(p, normalizedHash(result.stdout.subarray(offset, offset+size)));
    offset += size + 1;
  }
}
console.log('Loaded '+files.size+' final paths and '+fallbackPaths.length+' baseline blobs.');
const records = [];
const archived = [];
for (const p of [...files].sort()) {
  const target = path.join(receipt.target, p);
  if (!fs.existsSync(target)) throw new Error('Missing final file: ' + p);
  const content = fs.readFileSync(target);
  if (/^<<<<<<< |^>>>>>>> |^=======\s*$/m.test(content.toString())) throw new Error('Conflict marker: ' + p);
  const before = prior.get(p);
  const liveBytes = fs.existsSync(path.join(main, p)) ? fs.readFileSync(path.join(main, p)) : null;
  const compare = capturedPaths.has(p) ? hash : normalizedHash;
  const live = liveBytes ? hash(liveBytes) : null;
  const liveComparison = liveBytes ? compare(liveBytes) : null;
  records.push({path:p, bytes:content.length, comparison:capturedPaths.has(p)?'exact bytes':'LF-normalized text', beforeSha256:before, integratedSha256:hash(content), integratedComparisonSha256:compare(content), mainNowSha256:live, mainComparisonSha256:liveComparison, mainChangedSinceSnapshot:before !== liveComparison});
  archived.push({path:p, sha256:hash(content)});
}
const manifest = {recordedAt:new Date().toISOString(), candidate:receipt.target, mainHead:snapshot.head, tylerHead:'d7bb1b940d2c96c91517f50f204ba76cfaf73035', commonAncestor:receipt.base, description:'Reviewable uncommitted integration; compare preimage hashes before applying to a shared tree.', files:records};
fs.writeFileSync(path.join(__dirname, 'integration-final-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const archivePath=path.join(__dirname,'integration-final-files.tar.gz');
const listPath=path.join(__dirname,'integration-final-files.txt');
fs.writeFileSync(listPath,archived.map(x=>x.path).join('\n')+'\n');
const python='C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const packed=cp.spawnSync(python,[path.join(__dirname,'pack-integration.py'),path.join(__dirname,'integration-final-manifest.json'),archivePath],{encoding:'utf8',maxBuffer:4*1024*1024});
if(packed.status!==0) throw new Error('Archive failed: '+packed.stderr);
console.log(packed.stdout.trim());
for(const item of archived) if(hash(fs.readFileSync(path.join(receipt.target,item.path)))!==item.sha256) throw new Error('Candidate changed while packaging: '+item.path);
console.log(JSON.stringify({files:records.length, changedAgainstSnapshot:records.filter(x=>x.beforeSha256!==x.integratedComparisonSha256).length, mainDrift:records.filter(x=>x.mainChangedSinceSnapshot).map(x=>x.path), archiveBytes:fs.statSync(archivePath).size}));
