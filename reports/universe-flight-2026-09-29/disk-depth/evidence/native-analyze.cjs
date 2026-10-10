'use strict';
// Analyze the already captured PNGs; this script never starts a browser.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const stage = __dirname, report = path.join(stage, 'native-report');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const harness = fs.readFileSync(path.join(stage, 'native-check.cjs'), 'utf8');
assert.equal(sha(harness), '54f997450876bdaf027f8a8feb86742df9f039593aa8e6647fd7143fd9e1e404');
const originalBytes = fs.readFileSync(path.join(report, 'check.json'));
const original = JSON.parse(originalBytes);
assert.equal(original.captures.length, 40);
assert.equal(original.completed, false);
assert.match(original.failure, /galaxy-90-range12 outer disk/);
const attempts = path.join(report, 'attempts');
fs.mkdirSync(attempts, { recursive: true });
const preserved = path.join(attempts, 'postrender-fixed-annulus.json');
if (!fs.existsSync(preserved)) fs.writeFileSync(preserved, originalBytes);
assert.equal(sha(fs.readFileSync(preserved)), sha(originalBytes));
fs.writeFileSync(path.join(attempts, 'postrender-fixed-annulus.sha256.txt'), sha(originalBytes) + '  postrender-fixed-annulus.json\n54f997450876bdaf027f8a8feb86742df9f039593aa8e6647fd7143fd9e1e404  native-check.cjs\n');
for (const phase of ['baseline', 'candidate']) assert.equal(sha(fs.readFileSync(path.join(stage, phase + '-renderer.js'))), original.pins[phase]);
const images = new Map(original.captures.map(capture => { const bytes = fs.readFileSync(path.join(report, capture.file)); assert.equal(sha(bytes), capture.hash, capture.file + ' captured hash'); return [capture.phase + ':' + capture.name, bytes]; }));
const cases = original.matrix;
// Reuse the pinned PNG decoder and moments, with an explicit physical exclusion.
const metricsSource = harness.slice(harness.indexOf('function pixels('), harness.indexOf('const cases = [];'))
  .replace('function stats(bytes) {', 'function stats(bytes, exclusionRadius) {')
  .replace('Math.hypot(dx, dy) > p.height * .12', 'Math.hypot(dx, dy) > exclusionRadius');
const sheetStart = harness.indexOf('function png('), sheetEnd = harness.indexOf('\n(async () => {\n  save();');
assert.ok(sheetStart >= 0 && sheetEnd > sheetStart, 'Pinned contact sheet block');
const sheetSource = harness.slice(sheetStart, sheetEnd);
const { pixels, stats, difference, contactSheet } = new Function('Buffer', 'assert', 'zlib', 'fs', 'path', 'report', 'images', 'cases', metricsSource + '\n' + sheetSource + '\nreturn {pixels,stats,difference,contactSheet};')(Buffer, assert, zlib, fs, path, report, images, cases);
function bounds(bytes) {
  const p = pixels(bytes); let minX = p.width, minY = p.height, maxX = -1, maxY = -1, peak = 0;
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const i = (y * p.width + x) * p.channels, l = .2126 * Math.max(0, p.data[i] - 1) + .7152 * Math.max(0, p.data[i + 1] - 3) + .0722 * Math.max(0, p.data[i + 2] - 6);
    peak = Math.max(peak, l);
    if (l > 1) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  return maxX < 0 ? { observed: null, peak } : { observed: { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 }, margins: { left: minX, top: minY, right: p.width - maxX - 1, bottom: p.height - maxY - 1 }, peak };
}
const analysis = {
  completed: false, nativeCaptured: true, nativeOriginalCompleted: original.completed,
  analysisSha256: sha(fs.readFileSync(__filename)), originalReportSha256: sha(originalBytes), harnessSha256: sha(harness), rendererPins: original.pins,
  browserLaunches: 0, newCaptures: 0, reusedCaptures: original.captures.length,
  earlierAnalysisAttempt: { driver: 'attempts/slow-vm-analysis.cjs', result: 'Stopped with Ctrl+C; observed exit code 1. The VM decoder was slow and did not complete or produce analysis.json.', newCaptures: 0 },
  method: { originalFailure: original.failure, originalExclusion: '0.12 * image height = 57.6 pixels at DPR 1', correctedExclusion: '0.25 * Rpx, where Rpx = imageHeight * 0.5 * cot(FOV/2) / rangeInModelRadii', threshold: 'At rest, edge-on target outer emitted light must exceed baseline by 1.5%. Face-on integrated emitted light remains within 3.5%.', reason: 'The range12 target has projected model radius 42.89 pixels, so the original 57.6-pixel central exclusion contained its entire visible disk. Both original outer sums were zero.', scope: 'Orthographic exterior emission proxy, with actual WebGL perspective, quantization, and source-column compensation. This is a rendered-signal comparison, not physical dust extinction or measured photometry.' },
  proofs: {}, comparisons: [], resources: original.resources, stability: original.stability, nearObserver: original.nearObserver, errors: original.errors
};
const a = original.proof.baseline, b = original.proof.candidate;
for (const key of ['populations', 'metadata', 'functions', 'routeFunctions', 'snapshots', 'pointUploads']) { assert.deepEqual(b[key], a[key], key + ' exact'); analysis.proofs[key] = 'exact'; }
assert.equal(a.snapshots.length, 12);
assert.deepEqual(original.errors, []);
for (const resource of original.resources) { for (const label of ['Textures','Buffers','Programs','Shaders']) assert.equal(resource['created' + label], resource['deleted' + label]); assert.deepEqual(resource.errors, []); assert.equal(resource.finiteUploads, true); assert.equal(resource.lost, false); }
for (const stable of original.stability) { assert.equal(stable.projectionReusedForLensLook, true); assert.equal(stable.orbitReturnExact, true); }
assert.ok(original.nearObserver.every(item => item.finiteUploads && Number.isFinite(item.statistics.sumLuminance) && item.statistics.clippedFraction < .05));
for (const near of original.nearObserver.filter(item => item.phase === 'candidate' && item.range <= .6)) assert.equal(near.diskMarker, -1);
for (const spec of cases) {
  const baselineBytes = images.get('baseline:' + spec.name), candidateBytes = images.get('candidate:' + spec.name);
  const rangeInRadii = spec.distance ? spec.distance / original.proof.baseline.metadata[spec.region][spec.index].radius : spec.range;
  const p = pixels(baselineBytes), modelRpx = p.height * .5 / Math.tan(spec.fov * Math.PI / 360) / rangeInRadii, exclusionRadius = modelRpx * .25;
  const baseline = stats(baselineBytes, exclusionRadius), candidate = stats(candidateBytes, exclusionRadius), delta = difference(baselineBytes, candidateBytes);
  const entry = { name: spec.name, rangeInRadii, modelRpx, exclusionRadius, baseline, candidate, baselineBounds: bounds(baselineBytes), candidateBounds: bounds(candidateBytes), delta, totalLightRatio: candidate.sumLuminance / baseline.sumLuminance, outerLightRatio: baseline.outerLuminance > 0 ? candidate.outerLuminance / baseline.outerLuminance : null };
  analysis.comparisons.push(entry);
  assert.deepEqual(original.captures.find(c => c.phase === 'candidate' && c.name === spec.name).snapshot, original.captures.find(c => c.phase === 'baseline' && c.name === spec.name).snapshot, spec.name + ' camera exact');
  if (spec.name.startsWith('elliptical')) assert.equal(sha(baselineBytes), sha(candidateBytes), spec.name + ' exact pixels');
  if (spec.inclination === 0 && !spec.name.startsWith('elliptical')) assert.ok(Math.abs(entry.totalLightRatio - 1) < .035, spec.name + ' face light within 3.5%');
  if (spec.inclination === 90 && spec.layer === 'target' && !spec.name.startsWith('elliptical') && spec.range >= 3) { assert.ok(baseline.outerLuminance > 0, spec.name + ' nonempty measured annulus'); assert.ok(entry.outerLightRatio > 1.015, spec.name + ' outer disk emitted light'); }
  assert.ok(candidate.clippedFraction < .03, spec.name + ' clipping');
  if (spec.layer === 'target' && spec.range >= 3) assert.ok(Object.values(entry.candidateBounds.margins).every(value => value > 0), spec.name + ' target fits canvas');
}
contactSheet();
analysis.completed = true;
fs.writeFileSync(path.join(report, 'analysis.json'), JSON.stringify(analysis, null, 2) + '\n');
console.log(JSON.stringify({ completed: true, reusedCaptures: 40, browserLaunches: 0, analysisSha256: analysis.analysisSha256, comparisons: analysis.comparisons.map(c => ({ name: c.name, totalLightRatio: c.totalLightRatio, outerLightRatio: c.outerLightRatio, modelRpx: c.modelRpx, exclusionRadius: c.exclusionRadius })) }, null, 2));
