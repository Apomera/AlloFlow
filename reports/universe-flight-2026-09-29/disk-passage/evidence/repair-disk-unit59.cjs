const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const stage = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const originalPath=path.join(stage,'attempts/unit-v1/candidate-disk-passage.test.js'), candidatePath=path.join(stage,'candidate-disk-passage.test.js'), installedPath=path.join(repo,'tests/universe_flight_disk_passage.test.js');
const original=fs.readFileSync(originalPath,'utf8'), candidate=fs.readFileSync(candidatePath,'utf8');
assert.equal(sha(originalPath),'b2bc0c1e3f0e26d7062330ae6699d15d42eef4379e481df32dec5de1234b9d1a');
assert.equal(sha(installedPath),sha(originalPath));
const replacements = [
 {before:'function expectPose(actual, expected) {',after:'function expectPose(actual, expected, expectedGaze = expected) {'},
 {before:'  expect(Math.sin(actual.yaw)).toBeCloseTo(Math.sin(expected.yaw), 11);\n  expect(Math.cos(actual.yaw)).toBeCloseTo(Math.cos(expected.yaw), 11);\n  expect(actual.pitch).toBeCloseTo(expected.pitch, 11);',after:'  expect(Math.sin(actual.yaw)).toBeCloseTo(Math.sin(expectedGaze.yaw), 11);\n  expect(Math.cos(actual.yaw)).toBeCloseTo(Math.cos(expectedGaze.yaw), 11);\n  expect(actual.pitch).toBeCloseTo(expectedGaze.pitch, 11);'},
 {before:'}\n\nbeforeAll(() => {',after:'}\n// Live playback follows the authored gaze with a 0.35-second response. Seeks,\n// highlight stops, and paused Follow view still resolve the authored gaze exactly.\n// Use a shortest-arc angle and exponential decay to predict live orientation.\nfunction followedGaze(previous, target, seconds) {\n  const decay = Math.exp(-seconds / 0.35);\n  const arc = Math.atan2(Math.sin(target.yaw - previous.yaw), Math.cos(target.yaw - previous.yaw));\n  return { yaw: previous.yaw + arc * (1 - decay), pitch: target.pitch + (previous.pitch - target.pitch) * decay };\n}\n\nbeforeAll(() => {'},
 {before:'      launch(rate); for (let step = 0; step < 10; step++) advance(100); publish();',after:'      launch(rate); let gaze = route.atTime(0);\n      for (let step = 0; step < 10; step++) {\n        gaze = followedGaze(gaze, route.atTime((step + 1) * 0.1 * rate), 0.1); advance(100);\n        expectPose(scene.snapshot().state, route.atTime((step + 1) * 0.1 * rate), gaze);\n      }\n      publish();'},
 {before:'      expectPose(scene.snapshot().state, route.atTime(rate)); expect(telemetry.flyby.rate).toBe(rate);',after:'      expectPose(scene.snapshot().state, route.atTime(rate), gaze); expect(telemetry.flyby.rate).toBe(rate);'},
 {before:"    expectPose(scene.snapshot().state, route.atTime(44)); expect(scene.snapshot().targetId).toBe('galactic-center');",after:"    expectPose(scene.snapshot().state, route.atTime(44), followedGaze(route.atTime(43.8), route.atTime(44), 0.1)); expect(scene.snapshot().targetId).toBe('galactic-center');"},
];
let forward=original;
for(const replacement of replacements) { assert.equal(forward.split(replacement.before).length,2); forward=forward.replace(replacement.before,replacement.after); }
assert.equal(forward,candidate);
let inverse=candidate; for(const replacement of replacements.slice().reverse()) {assert.equal(inverse.split(replacement.after).length,2); inverse=inverse.replace(replacement.after,replacement.before);} assert.equal(inverse,original);
assert.equal(sha(path.join(repo,'stem_lab/universe_flight_scene.js')),'255f57893385f5e0ae1a932d00f3ba8e7e98cacc8851bc6ce8985003bd025a75');
assert.equal(sha(path.join(repo,'stem_lab/stem_tool_universe.js')),'52bea55b412a2ce73ce4bd55724e1fce5befef32e17da6ad730f995bfe7a0874');
assert.equal(sha(path.join(repo,'tests/universe_flight_navigation.test.js')),sha(path.join(stage,'attempts/unit-v1/universe_flight_navigation.test.js')));
fs.copyFileSync(candidatePath,installedPath); assert.equal(sha(candidatePath),sha(installedPath));
const manifest={completed:true,repairedAt:new Date().toISOString(),driver:{file:path.basename(__filename),sha256:sha(__filename)},target:'tests/universe_flight_disk_passage.test.js',originalSha256:sha(originalPath),candidateSha256:sha(candidatePath),installedSha256:sha(installedPath),inverseExact:true,reason:'The renderer intentionally damps live playback gaze with a 0.35-second response. Playback tests now check the independent shortest-arc exponential prediction at every frame. Authored position, distance and physical clocks retain their exact checks; seeks, highlight stops and paused Follow retain exact authored gaze checks.',replacements};
fs.writeFileSync(path.join(stage,'disk-test-repair-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const report=path.join(stage,'focused-unit'), archived=path.join(stage,'attempts/unit-v1/live-original-output');
assert.equal(path.resolve(report).startsWith(path.resolve(stage)+path.sep),true); assert.equal(path.resolve(archived).startsWith(path.resolve(stage)+path.sep),true);
for(const file of fs.readdirSync(report)) assert.equal(sha(path.join(report,file)),sha(path.join(stage,'attempts/unit-v1/focused-unit',file)));
assert.equal(fs.existsSync(archived),false); fs.renameSync(report,archived);
console.log(JSON.stringify({completed:true,testHash:sha(installedPath),repairDriverHash:sha(__filename),repairManifestHash:sha(path.join(stage,'disk-test-repair-manifest.json')),originalEvidence:path.join(stage,'attempts/unit-v1')}));
