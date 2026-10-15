const fs=require('fs'),cp=require('child_process'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
process.chdir(path.resolve(__dirname,'../..'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n');
const canonical='stem_lab/stem_tool_machinelab.js',mirror='desktop/web-app/public/'+canonical,expected='cc5a78cf1044d1aef086d393df5c0ca891d6d85005bc253fbcb4a2401b363289';
assert.equal(hash(canonical),expected);assert.equal(hash(mirror),expected);
const baseline=cp.execFileSync('git',['show','db4550a7c:'+canonical],{maxBuffer:5e6}).toString().replace(/\r\n/g,'\n');
const oldFog="    if (!contrast && S.scene && typeof THREE.Fog === 'function') S.scene.fog = new THREE.Fog(clearColor, 11, 27);";
const newFog="    if (S.scene) S.scene.fog = !contrast && typeof THREE.Fog === 'function' ? new THREE.Fog(clearColor, 11, 27) : null;";
const oldBloom=`        // The workshop has a lit torch flame (emissive 0xff5a00 at intensity
        // 1.1) and a fire that grows with the sim. Threshold 0.72 catches
        // those while the 0.45-luma slate machinery and the white callout
        // labels stay out of the glow — the readable surfaces must not bloom.
        // env gives the metalness-0.55 parts something to reflect; without it
        // PBR metal loses its diffuse and just goes dark.
        bloom: { strength: 0.6, radius: 0.38, threshold: 0.72 },`;
const newBloom=`        // Whole-scene bloom also amplifies the pale light-theme background,
        // washing out machinery and motion guides. Keep direct rendering;
        // the environment still gives metal parts their reflected light.`;
assert(baseline.includes(oldFog)&&baseline.includes(oldBloom));
assert.equal(read(canonical),baseline.replace(oldFog,newFog).replace(oldBloom,newBloom));
const json=p=>JSON.parse(fs.readFileSync(path.join(__dirname,p)));
const browser=json('browser/run-01/results.json'),diagnostic=json('diagnostic/run-01/results.json');
assert.deepEqual(browser.errors,[]);assert.equal(browser.checks.length,168);assert.equal(browser.observations.length,24);assert.deepEqual(browser.before,browser.after);assert.equal(browser.before[0].sha256,expected);
assert.deepEqual(diagnostic.errors,[]);assert.equal(diagnostic.checks.length,2);assert.deepEqual(diagnostic.before,diagnostic.after);assert.equal(diagnostic.before[0].sha256,'f253abaf842de6a16003053526359561b78b3cea1412a9e07f8eb302f1715d7d');
for(const [run,data] of [['browser/run-01',browser],['diagnostic/run-01',diagnostic]])for(const shot of data.shots)assert.equal(hash(path.join(__dirname,run,shot.file)),shot.sha256);
const native=json('tests/run-02/native-exit.json'),tests=json('tests/run-02/vitest.json');
assert.equal(native.exitCode,0);assert.equal(native.signal,null);assert.equal(native.error,null);assert(native.unchanged);assert.deepEqual(native.before,native.after);
for(const row of native.before)assert.equal(hash(row.file),row.sha256);
assert(tests.success);assert.equal(tests.numPassedTests,66);assert.equal(tests.numFailedTests,0);
const passed=tests.testResults.flatMap(s=>s.assertionResults).filter(t=>t.status==='passed');assert.equal(passed.length,66);assert.equal(new Set(passed.map(t=>t.fullName)).size,66);
console.log(JSON.stringify({sourceSha256:expected,sourceMirrorEqual:true,onlyChanges:['workshop bloom removed','theme fog cleared in high contrast'],unitTests:66,browserChecks:168,browserScenes:24,diagnosticChecks:2,screenshotHashes:6}));
