'use strict';
// Source-only review audit. Does not execute the renderer or modify product files.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const assert = require('assert/strict');
const repo = path.resolve(__dirname, '../../..');
const baselinePath = 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-3/universe-stellar-dust61/baseline-renderer.js';
const sourcePath = path.join(repo, 'stem_lab/universe_flight_scene.js');
const mirrorPath = path.join(repo, 'desktop/web-app/public/stem_lab/universe_flight_scene.js');
const expected = '11c9f95d62c511ea9b4575598c6847a53c1fc1f37e04e4cd976916d53ef7ee4b';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const baseline = fs.readFileSync(baselinePath);
const source = fs.readFileSync(sourcePath);
const mirror = fs.readFileSync(mirrorPath);
assert.equal(hash(source), expected, 'Source changed since review pin');
assert.deepEqual(source, mirror, 'Desktop mirror differs');
const syntax = cp.spawnSync(process.execPath, ['--check', sourcePath], {encoding: 'utf8', windowsHide: true});
assert.equal(syntax.status, 0, syntax.stderr);
const diff = cp.spawnSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--no-ext-diff', '--no-textconv', '--unified=0', '--', baselinePath, sourcePath], {encoding: 'utf8', windowsHide: true});
assert.equal(diff.status, 1, 'Expected a source delta');
const oldLines = baseline.toString('utf8').match(/[^\n]*\n|[^\n]+$/g) || [];
const newLines = source.toString('utf8').match(/[^\n]*\n|[^\n]+$/g) || [];
const textHunks = [...diff.stdout.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@.*$/gm)].map(match => {
  const oldCount = match[2] === undefined ? 1 : Number(match[2]);
  const newCount = match[4] === undefined ? 1 : Number(match[4]);
  const oldStart = Number(match[1]) - (oldCount ? 1 : 0);
  const newStart = Number(match[3]) - (newCount ? 1 : 0);
  return {oldStart, newStart, oldCount, newCount, before: oldLines.slice(oldStart, oldStart + oldCount).join(''), after: newLines.slice(newStart, newStart + newCount).join('')};
});
// Repository attributes can normalize CRLF in Git's textual diff. Record any
// byte-only differences in unchanged gaps as well, so undo is byte exact.
const hunks = [];
let oldCursor = 0, newCursor = 0;
function appendGap(oldEnd, newEnd) {
  assert.equal(oldEnd - oldCursor, newEnd - newCursor, 'Unaligned unchanged gap');
  while (oldCursor < oldEnd) {
    if (oldLines[oldCursor] !== newLines[newCursor]) hunks.push({oldStart: oldCursor, newStart: newCursor, oldCount: 1, newCount: 1, before: oldLines[oldCursor], after: newLines[newCursor]});
    oldCursor++; newCursor++;
  }
}
for (const hunk of textHunks) {
  appendGap(hunk.oldStart, hunk.newStart);
  hunks.push(hunk);
  oldCursor = hunk.oldStart + hunk.oldCount;
  newCursor = hunk.newStart + hunk.newCount;
}
appendGap(oldLines.length, newLines.length);
function apply(lines, reverse) {
  let cursor = 0;
  const parts = [];
  for (const hunk of hunks) {
    const start = reverse ? hunk.newStart : hunk.oldStart;
    const count = reverse ? hunk.newCount : hunk.oldCount;
    const before = reverse ? hunk.after : hunk.before;
    const after = reverse ? hunk.before : hunk.after;
    assert.equal(lines.slice(start, start + count).join(''), before, 'Hunk preimage differs');
    parts.push(lines.slice(cursor, start).join(''), after);
    cursor = start + count;
  }
  parts.push(lines.slice(cursor).join(''));
  return Buffer.from(parts.join(''), 'utf8');
}
assert.deepEqual(apply(oldLines, false), source, 'Forward byte reconstruction differs');
assert.deepEqual(apply(newLines, true), baseline, 'Reverse byte reconstruction differs');
const artifact = {format: 'universe-source-line-delta-v1', path: 'stem_lab/universe_flight_scene.js', baselineSha256: hash(baseline), sourceSha256: hash(source), encoding: 'utf8', lineEndingsPreserved: true, zeroBasedLineStarts: true, hunks};
fs.writeFileSync(path.join(__dirname, 'renderer-delta.json'), JSON.stringify(artifact, null, 2) + '\n');
let patch = diff.stdout.split('\n');
patch[0] = 'diff --git a/stem_lab/universe_flight_scene.js b/stem_lab/universe_flight_scene.js';
patch = patch.map(line => line.startsWith('--- ') ? '--- a/stem_lab/universe_flight_scene.js' : line.startsWith('+++ ') ? '+++ b/stem_lab/universe_flight_scene.js' : line);
fs.writeFileSync(path.join(__dirname, 'renderer.patch'), patch.join('\n'));
const audit = {completed: true, baselineSha256: hash(baseline), rendererSha256: hash(source), desktopMirrorSha256: hash(mirror), mirrorExact: true, nodeSyntax: true, exactForwardReconstruction: true, exactReverseReconstruction: true, hunks: hunks.length, baselineBytes: baseline.length, rendererBytes: source.length, scope: 'Static source and reversible-delta audit only; numerical tests, GPU rendering and UI checks are recorded separately.'};
fs.writeFileSync(path.join(__dirname, 'renderer-review-audit.json'), JSON.stringify(audit, null, 2) + '\n');
process.stdout.write(JSON.stringify(audit, null, 2) + '\n');
