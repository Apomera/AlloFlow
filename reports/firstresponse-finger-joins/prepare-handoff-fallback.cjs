'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const work=__dirname,p=n=>path.join(work,n),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync(p('deliver.cjs'),'utf8');
assert.equal(sha(original),'6ef9150ae9a4afe8f2d57811f5844a0dfc6306d842807f2ad3d1c1707465947c');
let text=original;
function replace(old,next){assert.equal(text.split(old).length,2,'Unique fallback transformation');text=text.replace(old,next);}
replace('function indexState() {',`function handoffSnapshot(bytes) { return { SHA256:sha(bytes),length:bytes.length,base64:bytes.toString('base64') }; }
function handoffPrefix(snapshot,current) {
  assert.ok(snapshot && Number.isSafeInteger(snapshot.length) && snapshot.length>=0 && typeof snapshot.base64==='string','Valid handoff snapshot');
  const original=Buffer.from(snapshot.base64,'base64');
  assert.equal(original.toString('base64'),snapshot.base64,'Canonical handoff snapshot encoding');
  assert.equal(original.length,snapshot.length,'Exact handoff snapshot length');
  assert.equal(sha(original),snapshot.SHA256,'Exact handoff snapshot digest');
  assert.ok(current.length>=original.length,'Handoff cannot be truncated');
  assert.deepEqual(current.subarray(0,original.length),original,'Exact handoff prefix preserved');
}
function indexState() {`);
replace("'delta.json', 'deliver.cjs', 'prepare-history.cjs'","'delta.json', 'deliver.cjs', 'deliver-with-handoff.cjs', 'prepare-handoff-fallback.cjs', 'run-finish-recovery.cjs', 'prepare-history.cjs'");
replace('  return { passed: true, sourceSHA256: finalSHA, checks };',`  const handoffFile=p('delivery-selftest-handoff-prefix.md'),originalHandoff=fs.readFileSync(r('AGENT_HANDOFF.md')),handoffPin=handoffSnapshot(originalHandoff);
  assert.ok(originalHandoff.length>0,'Handoff selftest has bytes to mutate');
  fs.writeFileSync(handoffFile,originalHandoff);assert.deepEqual(fs.readFileSync(handoffFile),originalHandoff);
  let prefixRejected=false,appendAccepted=false;
  try {
    const damaged=Buffer.from(originalHandoff);damaged[0]^=1;fs.writeFileSync(handoffFile,damaged);
    try { handoffPrefix(handoffPin,fs.readFileSync(handoffFile)); } catch(error) { prefixRejected=/Exact handoff prefix preserved/.test(error.message); }
    assert.ok(prefixRejected,'Changed handoff prefix must be rejected');
    fs.writeFileSync(handoffFile,originalHandoff);assert.deepEqual(fs.readFileSync(handoffFile),originalHandoff,'Handoff prefix restored and reread');
    fs.appendFileSync(handoffFile,'\\nPrivate append-only selftest.\\n');handoffPrefix(handoffPin,fs.readFileSync(handoffFile));appendAccepted=true;
  } finally { fs.writeFileSync(handoffFile,originalHandoff);assert.deepEqual(fs.readFileSync(handoffFile),originalHandoff,'Handoff selftest restored and reread'); }
  handoffPrefix(handoffPin,fs.readFileSync(handoffFile));
  checks.push({kind:'handoff-prefix-change',rejected:prefixRejected,appendAccepted,restoredAndReread:true,restoredSHA256:hash(handoffFile)});
  return { passed: true, sourceSHA256: finalSHA, checks };`);
replace("  return { sourceSHA256: finalSHA, baselineSHA256: beforeSHA, gateSHA256: hash(__filename), index, handoffSHA256: hash(r('AGENT_HANDOFF.md')), sourceHashes:","  const handoff=handoffSnapshot(fs.readFileSync(r('AGENT_HANDOFF.md')));\n  return { sourceSHA256: finalSHA, baselineSHA256: beforeSHA, gateSHA256: hash(__filename), index, handoffSHA256: handoff.SHA256, handoffSnapshot:handoff, sourceHashes:");
replace('assert.equal(test.checks.length, 3);','assert.equal(test.checks.length, 4); assert.equal(test.checks.find(entry=>entry.kind===\'handoff-prefix-change\').appendAccepted,true);');
replace("  checked.selftestSHA256 = hash(p('delivery-selftest.json')); equal(checked, preflight, 'Fresh preflight no longer matches; rerun --check-only --selftest before any shared write');",`  checked.selftestSHA256 = hash(p('delivery-selftest.json'));
  assert.equal(preflight.handoffSHA256,preflight.handoffSnapshot.SHA256,'Preflight handoff digest matches snapshot');
  assert.equal(checked.handoffSHA256,checked.handoffSnapshot.SHA256,'Current handoff digest matches snapshot');
  handoffPrefix(preflight.handoffSnapshot,fs.readFileSync(r('AGENT_HANDOFF.md')));
  equal({...checked,handoffSHA256:preflight.handoffSHA256,handoffSnapshot:preflight.handoffSnapshot},preflight,'Fresh preflight no longer matches; rerun --check-only --selftest before any shared write');`);
replace("function guard() { sharedGuard(); equal(indexState(), checked.index, 'Shared index changed; stopping before further writes'); }","function guard() { sharedGuard(); equal(indexState(), checked.index, 'Shared index changed; stopping before further writes'); handoffPrefix(preflight.handoffSnapshot,fs.readFileSync(r('AGENT_HANDOFF.md'))); }");
replace("function appendHandoff(text) { const current = fs.readFileSync(r('AGENT_HANDOFF.md')); fs.appendFileSync", "function appendHandoff(text) { guard(); const current = fs.readFileSync(r('AGENT_HANDOFF.md')); handoffPrefix(preflight.handoffSnapshot,current); fs.appendFileSync");
replace("    guard(); pin(r('AGENT_HANDOFF.md'), checked.handoffSHA256);","    guard(); handoffPrefix(preflight.handoffSnapshot,fs.readFileSync(r('AGENT_HANDOFF.md')));");
new Function(text);
fs.writeFileSync(p('deliver-with-handoff.cjs'),text,{flag:'wx'});assert.equal(fs.readFileSync(p('deliver-with-handoff.cjs'),'utf8'),text);
fs.writeFileSync(p('handoff-fallback-proposal.json'),JSON.stringify({baselineGateSHA256:sha(original),fallbackGateSHA256:sha(text),onlyRelaxation:'Exact original handoff bytes remain an identical prefix; new suffix bytes may be appended.',allOtherPreflightFieldsExact:true,privateSelftests:4,sharedWritesPerformed:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({syntax:true,fallbackGateSHA256:sha(text),sharedWrites:false}));
