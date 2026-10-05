#!/usr/bin/env node
'use strict';
// Report-local preparation only. The coordinator owns all host integration.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createTwoFilesPatch } = require('diff');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(__dirname, 'receiver');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const replacements = [
  {
    label: 'bound removal markers to existing transfer records',
    before: 'function _alloFinishResChunk(store, rid, success) {',
    after: `function _alloMarkRemovedResChunks(store, ids) {
    if (!store) return;
    for (const group of ['parts', 'pending', 'failures']) {
        for (const record of Object.values(store[group] || {})) {
            if (record.removalOverflow) continue;
            const removedIds = record.removedIds || (record.removedIds = new Set());
            for (const id of ids) {
                if (removedIds.has(id)) continue;
                // Keep only transfer-local markers. On overflow, retire this old
                // transfer conservatively; future RIDs have no removal markers.
                if (removedIds.size >= 256) { record.removalOverflow = true; removedIds.clear(); break; }
                removedIds.add(id);
            }
        }
    }
}
function _alloFinishResChunk(store, rid, success, expectedPending) {`,
  },
  {
    label: 'identity guard and capture markers before retiring pending record',
    before: `    if (!store || !store.pending || !Object.prototype.hasOwnProperty.call(store.pending, rid)) return;
    delete store.pending[rid];`,
    after: `    if (!store || !store.pending || !Object.prototype.hasOwnProperty.call(store.pending, rid)) return;
    const pending = store.pending[rid];
    if (expectedPending && pending !== expectedPending) return;
    delete store.pending[rid];`,
  },
  {
    label: 'same-RID decode failure keeps transfer removal markers',
    before: '        Object.defineProperty(failures, rid, { value: { count: previous + 1, at: Date.now() }, enumerable: true, configurable: true });',
    after: '        Object.defineProperty(failures, rid, { value: { count: previous + 1, at: Date.now(), removedIds: pending.removedIds, removalOverflow: pending.removalOverflow }, enumerable: true, configurable: true });',
  },
  {
    label: 'partial replay inherits only its same-RID failure markers',
    before: `        Object.defineProperty(slots, v.rid, { value: { of: v.of, got: Object.create(null), chars: 0, at: Date.now() }, enumerable: true, configurable: true });`,
    after: `        const failure = store.failures && own(store.failures, v.rid) ? store.failures[v.rid] : null;
        Object.defineProperty(slots, v.rid, { value: { of: v.of, got: Object.create(null), chars: 0, at: Date.now(), removedIds: failure?.removedIds, removalOverflow: failure?.removalOverflow }, enumerable: true, configurable: true });`,
  },
  {
    label: 'partial completion carries transfer markers into pending identity',
    before: '    Object.defineProperty(pending, v.rid, { value: { at: Date.now() }, enumerable: true, configurable: true });',
    after: '    Object.defineProperty(pending, v.rid, { value: { at: Date.now(), removedIds: slot.removedIds, removalOverflow: slot.removalOverflow }, enumerable: true, configurable: true });',
  },
  {
    label: 'removal marks existing transfer records before filtering resource lists',
    before: `      if (v.kind === 'res-remove' && Array.isArray(v.ids)) {
          setReceivedDeliveryResources`,
    after: `      if (v.kind === 'res-remove' && Array.isArray(v.ids)) {
          _alloMarkRemovedResChunks(mbChunkStoreRef.current, v.ids);
          setReceivedDeliveryResources`,
  },
  {
    label: 'capture identity before asynchronous decode',
    before: `          const assembled = _alloCollectResChunk(store, v);
          if (!assembled) return;
          try {`,
    after: `          const assembled = _alloCollectResChunk(store, v);
          if (!assembled) return;
          const pending = store.pending[v.rid];
          try {`,
  },
  {
    label: 'ignore retired identity and consume removed content before append or open',
    before: `              if (mbChunkStoreRef.current !== store) return;
              setReceivedDeliveryResources(prev => [...prev.filter(item => item.id !== resource.id), resource]);`,
    after: `              if (mbChunkStoreRef.current !== store || store.pending?.[v.rid] !== pending) return;
              if (pending.removalOverflow || pending.removedIds?.has(resource.id)) {
                  _alloFinishResChunk(store, v.rid, true, pending);
                  setMbResourceReceiveError(Object.keys(store.failures || {}).length > 0);
                  return;
              }
              setReceivedDeliveryResources(prev => [...prev.filter(item => item.id !== resource.id), resource]);`,
  },
  {
    label: 'finish only this captured success identity',
    before: `              if (v.open !== false) setPendingQrAssignmentResource(resource);
              _alloFinishResChunk(store, v.rid, true);`,
    after: `              if (v.open !== false) setPendingQrAssignmentResource(resource);
              _alloFinishResChunk(store, v.rid, true, pending);`,
  },
  {
    label: 'old failed decoder cannot retire or retry a newer same-RID record',
    before: `          } catch (decodeErr) {
              if (mbChunkStoreRef.current !== store) return;
              _alloFinishResChunk(store, v.rid, false);`,
    after: `          } catch (decodeErr) {
              if (mbChunkStoreRef.current !== store || store.pending?.[v.rid] !== pending) return;
              _alloFinishResChunk(store, v.rid, false, pending);`,
  },
];

assert.equal(process.argv.length, 2, 'This helper only prepares report-local candidates; it has no apply mode.');
assert.ok(!fs.existsSync(path.join(OUT, 'prepared.json')), 'Retain existing receiver preparation.');
const originals = HOSTS.map(file => ({ file, bytes: fs.readFileSync(path.join(ROOT, file)) }));
assert.ok(originals.every(row => row.bytes.equals(originals[0].bytes)), 'Host triplet byte parity drift');
const original = originals[0].bytes, source = original.toString('utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
const actual = replacements.map(row => ({ ...row, before: row.before.replace(/\n/g, eol), after: row.after.replace(/\n/g, eol) }));
let candidate = source;
for (const row of actual) {
  assert.equal(candidate.split(row.before).length - 1, 1, 'Missing/ambiguous anchor: ' + row.label);
  assert.equal(candidate.split(row.after).length - 1, 0, 'Replacement already present: ' + row.label);
  candidate = candidate.replace(row.before, row.after);
}
let reversed = candidate;
for (const row of actual.slice().reverse()) {
  assert.equal(reversed.split(row.after).length - 1, 1, 'Ambiguous reverse anchor: ' + row.label);
  reversed = reversed.replace(row.after, row.before);
}
assert.ok(Buffer.from(reversed, 'utf8').equals(original), 'Reverse did not recover exact original bytes');
assert.equal(candidate.charCodeAt(0) === 0xfeff, source.charCodeAt(0) === 0xfeff, 'BOM drift');
assert.equal(/(?:\r\n|\n|\r)$/.test(candidate), /(?:\r\n|\n|\r)$/.test(source), 'Final newline drift');
assert.equal((candidate.replace(/\r\n/g, '').match(/\r/g) || []).length,
  (source.replace(/\r\n/g, '').match(/\r/g) || []).length, 'Lone CR drift');
for (const row of originals) assert.ok(fs.readFileSync(path.join(ROOT, row.file)).equals(row.bytes), 'Concurrent edit while preparing: ' + row.file);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'host-before.txt'), original, { flag: 'wx' });
fs.writeFileSync(path.join(OUT, 'host-candidate.txt'), candidate, { flag: 'wx' });
fs.writeFileSync(path.join(OUT, 'receiver.patch'), createTwoFilesPatch(HOSTS[0], HOSTS[0], source, candidate), { flag: 'wx' });
fs.writeFileSync(path.join(OUT, 'replacements.json'), JSON.stringify(actual, null, 2) + '\n', { flag: 'wx' });
for (const row of originals) assert.ok(fs.readFileSync(path.join(ROOT, row.file)).equals(row.bytes), 'Concurrent edit while recording: ' + row.file);
const receipt = { schemaVersion: 1, preparedUtc: new Date().toISOString(), productionApplied: false,
  testsRun: false, syntaxChecked: false, reverseExact: true, eol: eol === '\n' ? 'LF' : 'CRLF',
  bom: source.charCodeAt(0) === 0xfeff, finalNewline: /(?:\r\n|\n|\r)$/.test(source),
  beforeSha256: hash(original), candidateSha256: hash(candidate), replacements: actual.length,
  files: originals.map(row => ({ file: row.file, sha256: hash(row.bytes) })),
  scope: 'Transfer-local removal markers, identity-guarded async completion and same-RID failure/retry marker inheritance only.',
  markerPolicy: 'At most256 IDs per existing record; overflow retires that old record conservatively. New RIDs begin clean. Existing TTL/group count policies are unchanged.' };
fs.writeFileSync(path.join(OUT, 'prepared.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt));
