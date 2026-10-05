#!/usr/bin/env node
'use strict';
// Prepare report-local candidates only by default. --apply is reserved for the
// integration owner after review and rechecks every production input hash.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createTwoFilesPatch } = require('diff');
const parser = require('@babel/parser');
const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(__dirname, 'media-preservation');
const MANIFEST = path.join(OUT, 'prepared.json');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const testFile = 'tests/report_storage_mixed_recovery.test.js';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const head = () => execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim();
const beforePolicy = `      if (existing?.assetPolicy === 'text-only') {
          const explicitRemoval = existing.omittedAssetManifest?.some(item => item?.reason === 'user-remove-media');
          return ALLO_WORKSPACE_RECOVERY.stripLargeAssets(
              sessionSafeSnapshot, explicitRemoval ? 'user-remove-media' : 'device-quota');
      }`;
const afterPolicy = `      if (existing?.assetPolicy === 'text-only'
          && existing.omittedAssetManifest?.some(item => item?.reason === 'user-remove-media')) {
          return ALLO_WORKSPACE_RECOVERY.stripLargeAssets(sessionSafeSnapshot, 'user-remove-media');
      }`;
function replaceOnce(source, before, after, label) {
  assert.equal(source.split(before).length - 1, 1, 'Missing or ambiguous ' + label);
  return source.replace(before, after);
}
function productionTests(source) {
  let next = source.replace(/\r\n/g, '\n');
  next = replaceOnce(next, "import { applyPatch } from 'diff';\n", '', 'proposal import');
  const before = `const mediaCandidate = process.env.ALLO_REPORT_STORAGE_MEDIA_PROPOSAL === '1';
const hostActual = readFileSync('AlloFlowANTI.txt', 'utf8');
const hostCandidate = mediaCandidate ? applyPatch(hostActual, readFileSync('reports/report-fixes-2026-09-30/storage-media-host-proposal.patch', 'utf8')) : hostActual;
if (hostCandidate === false) throw Error('Review-only media proposal no longer applies');
const host = hostCandidate.replace(/\\r\\n/g, '\\n');`;
  const after = `const hostPath = process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt';
const host = readFileSync(hostPath, 'utf8').replace(/\\r\\n/g, '\\n');`;
  next = replaceOnce(next, before, after, 'production host source');
  const characterization = "  it.skipIf(mediaCandidate)('characterizes a second-save media omission after a session-only URL marks the prior snapshot text-only'";
  const preservation = "  it.skipIf(!mediaCandidate)('preserves valid media on the next save after a session-only blob omission'";
  const start = next.indexOf(characterization), end = next.indexOf(preservation, start);
  assert.ok(start >= 0 && end > start, 'Missing production preservation test boundary');
  assert.equal(next.split(characterization).length - 1, 1);
  next = next.slice(0, start) + next.slice(end);
  next = replaceOnce(next, '  it.skipIf(!mediaCandidate)(', '  it(', 'unconditional preservation');
  const additional = `  it('tries current valid media after an earlier quota omission and reduces only after a new rejection', async () => {
    const first = recovery.stripLargeAssets(await buildMixedSnapshot(), 'device-quota');
    const second = await buildMixedSnapshot(mixedHistory(), recovery.upsert(recovery.emptyStore(), first));
    expect(second.workspace.history[2].data[0].image).toBe('data:image/png;base64,AQ==');
    expect(second.workspace.history.at(-1).data.narration.audio).toBe('data:audio/wav;base64,Aw==');
    const writer = vi.fn(async candidate => ({ applied: true, store: recovery.upsert(recovery.emptyStore(), candidate) }));
    const saved = await recovery.saveWithQuotaFallback(second, writer);
    expect(writer).toHaveBeenCalledOnce(); expect(saved).toMatchObject({ stage: 'full', degraded: false });
    expect(writer.mock.calls[0][0].workspace.history[2].data[0].image).toBe('data:image/png;base64,AQ==');
    expect(second.omittedAssetManifest.some(item => item.reason === 'device-quota')).toBe(true);
  });
`;
  const marker = "  it('preserves explicit teacher media-removal policy on subsequent saves'";
  next = replaceOnce(next, marker, additional + marker, 'quota regression boundary');
  assert.ok(!next.includes('mediaCandidate') && !next.includes('ALLO_REPORT_STORAGE_MEDIA_PROPOSAL'), 'Proposal mode must not gate production evidence');
  return source.includes('\r\n') ? next.replace(/\n/g, '\r\n') : next;
}

function prepare() {
  assert.ok(!fs.existsSync(MANIFEST), 'Prepared receipt exists; retain it and use a fresh preparation directory for a later revision.');
  const startHead = head();
  const rows = [...hosts, testFile].map((file, index) => {
    const bytes = read(file), source = bytes.toString('utf8'), eol = source.includes('\r\n') ? '\r\n' : '\n';
    const next = hosts.includes(file)
      ? replaceOnce(source, beforePolicy.replace(/\n/g, eol), afterPolicy.replace(/\n/g, eol), 'media retention policy: ' + file)
      : productionTests(source);
    parser.parse(next, { sourceType: 'unambiguous', plugins: ['jsx'] });
    return { file, index, bytes, next, beforeSha256: hash(bytes), afterSha256: hash(next) };
  });
  fs.mkdirSync(path.join(OUT, 'before'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'candidate'), { recursive: true });
  const files = rows.map(row => {
    const filename = row.index + '-' + path.basename(row.file);
    const before = 'before/' + filename, candidate = 'candidate/' + filename, patch = row.index + '.patch';
    fs.writeFileSync(path.join(OUT, before), row.bytes, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, candidate), row.next, { flag: 'wx' });
    fs.writeFileSync(path.join(OUT, patch), createTwoFilesPatch(row.file, row.file, row.bytes.toString('utf8'), row.next), { flag: 'wx' });
    return { file: row.file, beforeSha256: row.beforeSha256, afterSha256: row.afterSha256, before, candidate, patch };
  });
  for (const row of rows) assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent input edit: ' + row.file);
  const endHead = head();
  assert.equal(endHead, startHead, 'HEAD changed during preparation');
  fs.writeFileSync(MANIFEST, JSON.stringify({ schemaVersion: 1, preparedAt: new Date().toISOString(), startHead, endHead, files,
    status: 'syntax-checked-candidates-only', currentCI: 'unverified', testsRun: false, productionApplied: false }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ manifest: MANIFEST, files: files.map(row => row.file), productionApplied: false, testsRun: false }));
}
function apply() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.files.map(row => row.file), [...hosts, testFile]);
  for (const row of manifest.files) {
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent production edit: ' + row.file);
    assert.equal(hash(fs.readFileSync(path.join(OUT, row.candidate))), row.afterSha256, 'Changed candidate: ' + row.file);
  }
  for (const row of manifest.files) {
    const bytes = fs.readFileSync(path.join(OUT, row.candidate)), target = path.join(ROOT, row.file);
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent production edit before write: ' + row.file);
    const temporary = target + '.classroom-media-' + process.pid + '.tmp';
    fs.writeFileSync(temporary, bytes, { flag: 'wx' });
    assert.equal(hash(read(row.file)), row.beforeSha256, 'Concurrent production edit before replacement: ' + row.file);
    fs.renameSync(temporary, target);
    assert.equal(hash(read(row.file)), row.afterSha256, 'Replacement mismatch: ' + row.file);
  }
  fs.writeFileSync(path.join(OUT, 'applied.json'), JSON.stringify({ ...manifest, appliedAt: new Date().toISOString(), productionApplied: true }, null, 2) + '\n', { flag: 'wx' });
  console.log('Applied only the guarded media policy and production regression-test deltas.');
}
if (process.argv.length === 2) prepare();
else if (process.argv.length === 3 && process.argv[2] === '--apply') apply();
else throw Error('Usage: node prepare_media_preservation.cjs [--apply]');
