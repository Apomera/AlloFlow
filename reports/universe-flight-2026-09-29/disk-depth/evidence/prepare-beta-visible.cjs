'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const stage = __dirname, sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let source = fs.readFileSync(path.join(stage, 'native-beta-check.cjs'), 'utf8');
assert.equal(sha(source), '623aa8e14b35f6f8c2620fef75f82b715b7ba37409d412130730cc7bef84bc6b');
function change(before, after) { assert.equal(source.split(before).length - 1, 1, 'Unique transformation: ' + before.slice(0,80)); source = source.replace(before, after); }
change("'native-beta-report'", "'native-beta-visible-report'");
change("const cases = [{ name: 'beta09-edge-diffuse', beta: .9, edge: true, layer: 'target', fov: 50 }, { name: 'beta099-rear-full', beta: .99, position: [0, 0, 156000], layer: 'full', fov: 65 }];", "const cases = [{ name: 'beta09-edge-visible', beta: .9, edge: true, layer: 'target', fov: 50 }];");
change("const result = { completed: false, pins, harnessSha256: sha(fs.readFileSync(__filename)), cases, captures: [], resources: [], math: {}, errors: [] };", "const result = { completed: false, pins, harnessSha256: sha(fs.readFileSync(__filename)), cases, captures: [], resources: [], math: {}, errors: [], originalAttempt: { harnessSha256: '623aa8e14b35f6f8c2620fef75f82b715b7ba37409d412130730cc7bef84bc6b', report: '../native-beta-report/check.json', beta09Scope: 'Compile and finite upload only; rest-direction aim placed the aberrated target outside the frame, yielding zero emitted pixels.', beta099Scope: 'Meaningful dim rear-facing emission remains valid and preserved.' } };");
change("const direction = position.map(value => -value), snapshot = __scene.snapshot();", "const chiefRay = position.map(value => -value / Math.hypot(...position)), direction = UniverseFlight.math.aberrate(chiefRay, spec.beta), snapshot = __scene.snapshot();");
change("let clipped = 0, signal = 0, maxChannel = 0;", "let clipped = 0, signal = 0, maxChannel = 0, nonzeroEmittedPixels = 0;");
change("signal += .2126 * Math.max(0,r-1) + .7152 * Math.max(0,g-3) + .0722 * Math.max(0,b-6);", "const light = .2126 * Math.max(0,r-1) + .7152 * Math.max(0,g-3) + .0722 * Math.max(0,b-6); signal += light; if (light > 1) nonzeroEmittedPixels++;");
change("sumEmittedLuminance: signal, maxChannel };", "sumEmittedLuminance: signal, maxChannel, nonzeroEmittedPixels, chiefRay, apparentAim: direction };");
change("assert.ok(Number.isFinite(capture.sumEmittedLuminance));", "assert.ok(Number.isFinite(capture.sumEmittedLuminance) && capture.sumEmittedLuminance > 0, 'Visible emitted light'); assert.ok(capture.nonzeroEmittedPixels > 0, 'Visible emitted pixels');");
change("assert.deepEqual(result.math.candidate,result.math.baseline);", "assert.deepEqual(result.math.candidate,result.math.baseline); assert.notEqual(result.captures[0].hash,result.captures[1].hash,'Candidate disk branch changes visible pixels');");
new (require('node:vm').Script)(source); // Syntax validation only; no VM execution.
const target = path.join(stage, 'native-beta-visible-check.cjs');
fs.writeFileSync(target, source);
const original = JSON.parse(fs.readFileSync(path.join(stage, 'native-beta-report', 'check.json'), 'utf8'));
assert.ok(original.captures.filter(c => c.name === 'beta09-edge-diffuse').every(c => c.sumEmittedLuminance === 0));
fs.writeFileSync(path.join(stage, 'native-beta-report', 'coverage-note.json'), JSON.stringify({ originalReportPreserved: true, originalImagesPreserved: 4, originalHarnessSha256: original.harnessSha256, beta09: 'Blank: compile and finite upload only; it does not prove visible target emission.', beta099: 'Meaningful dim rear-facing emission with differing baseline/candidate pixels.', correctedBeta09Report: '../native-beta-visible-report/check.json', correctedHarnessSha256: sha(source) },null,2)+'\n');
fs.writeFileSync(path.join(stage, 'native-beta-visible-check.sha256.txt'), sha(source)+'  native-beta-visible-check.cjs\n');
console.log(JSON.stringify({ prepared:true,harnessSha256:sha(source),target },null,2));
