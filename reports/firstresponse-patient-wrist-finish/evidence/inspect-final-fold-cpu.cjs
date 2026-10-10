const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(__dirname, file));
const reportFile = 'geometry-contract-palm-fold/shading-verification.json';
const r = JSON.parse(read(reportFile));
const candidate = '147670787861ae0251c9b4c65c90847a613c6b879d41737533749c19a5f6f891';
const checker = '31f822223b4cb356d6fc0c5d077a6f269e1a120f57ca17b550206b81de5a1217';
assert.equal(r.passed, true);
assert.equal(r.candidateSHA256, candidate);
assert.equal(r.checkerSHA256, checker);
assert.equal(hash(read('candidate.js')), candidate);
assert.equal(hash(read('verify-patient-wrist-palm.cjs')), checker);
assert.equal(hash(read('before.js')), r.beforeSHA256);
assert.equal(Object.keys(r.inputs).length, 4);
for (const [file, pin] of Object.entries(r.inputs)) assert.equal(hash(fs.readFileSync(file)), pin, file);
const keys = r.results.map(row => `${row.age}:${row.phase}:${row.contrast}`);
const expected = ['adult', 'child', 'infant'].flatMap(age => [0, 3, 4, 5, 8].flatMap(phase => [false, true].map(contrast => `${age}:${phase}:${contrast}`)));
assert.deepEqual(keys, expected);
let wrists = 0;
for (const row of r.results) {
  assert.equal(row.status, 'passed');
  assert.deepEqual(row.wrists.map(w => w.side), ['left', 'right']);
  assert.deepEqual(row.priorResources, row.currentResources);
  assert.deepEqual(row.currentResources, row.repeatResources);
  for (const w of row.wrists) {
    wrists++;
    assert.equal(w.normals.newNegativeFaces, 0);
    assert.equal(w.normals.unchangedFacesExact, true);
    assert.ok(w.normals.minLength > .9999 && w.normals.maxLength < 1.0001);
    assert.equal(w.candidate.samples, 48);
    assert.ok(w.candidate.maximumAngleDegrees < 2);
    assert.ok(w.candidate.meanAngleDegrees < w.baseline.meanAngleDegrees * .25);
    assert.ok(w.palm.samples >= 6 && w.palm.samples === w.palm.rows.length);
    assert.ok(w.palm.candidateMeanAngleDegrees < w.palm.beforeMeanAngleDegrees * .65);
    for (const sample of w.palm.rows) assert.ok(sample.candidateAngleDegrees <= sample.beforeAngleDegrees + 1);
  }
}
assert.deepEqual(r.negative.map(n => n.type), ['omit-patient-wrist-blend', 'omit-patient-palm-blend', 'off-scope-palm-normal', 'omit-palm-alignment-guard', 'omit-palm-fold-skip']);
for (const n of r.negative) {
  assert.equal(n.rejected, true);
  assert.equal(n.restored, true);
  assert.equal(n.restoredSHA256, candidate);
  assert.equal(n.phase, n.type === 'omit-palm-fold-skip' ? 8 : 5);
}
assert.equal(hash(read('geometry-contract-palm-fold/selftest-candidate.js')), candidate);
const original = read('candidate-rejected-recovery-fold/verify-patient-wrist-palm.cjs').toString();
assert.equal(hash(original), 'c02dcbe2ce11d69c9d5192d92de8e8abb797844c9feda3398f19e57f14beb296');
const current = read('verify-patient-wrist-palm.cjs').toString();
const edits = [
  ["const results=[],negative=[];fs.mkdirSync(out,{recursive:true});", "const selectedPhase=option('--phase',null);if(selectedPhase!==null){assert.ok(args.includes('--early'),'--phase requires --early');assert.ok(['0','3','4','5','8'].includes(selectedPhase),'supported focused phase');}\nconst results=[],negative=[];fs.mkdirSync(out,{recursive:true});"],
  ["for(const phase of args.includes('--early')?[5]:[0,3,4,5,8])", "for(const phase of args.includes('--early')?[selectedPhase===null?5:Number(selectedPhase)]:[0,3,4,5,8])"],
  ["{type:'omit-palm-alignment-guard',old:guard,replacement:'',expected:/newly reversed|negative face shading/}]", "{type:'omit-palm-alignment-guard',old:guard,replacement:'',expected:/newly reversed|negative face shading/},{type:'omit-palm-fold-skip',old:'        if (folded[wi]) continue;',replacement:'',phase:8,expected:/pre-existing negative face shading is not worsened/}]"],
  ["for(const mutation of mutations){let prior,current,rejected=false,error='';", "for(const mutation of mutations){equal(candidate.split(mutation.old).length,2,'unique source marker for '+mutation.type);let prior,current,rejected=false,error='';"],
  ["prior=build(priorConfig,'adult',5,false);current=build(capture(fs.readFileSync(target,'utf8')),'adult',5,false);", "prior=build(priorConfig,'adult',mutation.phase??5,false);current=build(capture(fs.readFileSync(target,'utf8')),'adult',mutation.phase??5,false);"],
  ["negative.push({type:mutation.type,rejected,error,restored:true", "negative.push({type:mutation.type,phase:mutation.phase??5,rejected,error,restored:true"]
];
let reconstructed = original;
for (const [old, value] of edits) {
  assert.equal(reconstructed.split(old).length, 2);
  reconstructed = reconstructed.replace(old, value);
}
assert.equal(reconstructed, current, 'Only the six reviewed checker changes exist; original geometric assertions are unchanged');
console.log(JSON.stringify({verified: true, report: reportFile, reportSHA256: hash(read(reportFile)), candidateSHA256: candidate, checkerSHA256: checker, cases: r.results.length, wrists, assertions: r.assertions, restoredNegativeControls: r.negative.length, originalAssertionsPreserved: true, heavyCpuRerun: false}));
