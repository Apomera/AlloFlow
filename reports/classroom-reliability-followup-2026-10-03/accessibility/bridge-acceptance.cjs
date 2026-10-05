'use strict';

// Production iframe transport and bridge bytes; real postMessage and IndexedDB.
// Route fulfillment supplies local bytes at synthetic/canonical HTTPS origins.
// No protocol, database, transactions, clock or acknowledgement is mocked.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..', '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const runnerBytes = fs.readFileSync(__filename);
const runnerSha256 = hash(runnerBytes);
const inputFiles = ['allo_device_storage_module.js', 'storage_bridge.html'];
const inputs = Object.fromEntries(inputFiles.map(file => {
  const bytes = fs.readFileSync(path.join(root, file));
  return [file, { bytes, sha256: hash(bytes) }];
}));
const topOrigin = 'https://classroom-reliability.test';
const clientOrigins = ['https://first.classroom-client.test', 'https://second.classroom-client.test'];
const defaultBridge = /var DEFAULT_BRIDGE_URL = '([^']+)'/.exec(inputs['allo_device_storage_module.js'].bytes.toString('utf8'));
assert(defaultBridge, 'Canonical bridge URL not found');
const bridgeUrl = new URL(defaultBridge[1]);
assert.equal(bridgeUrl.protocol, 'https:');
assert.equal(bridgeUrl.search, '?v=ds6-media-removal-intent');
const shell = index => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Synthetic classroom partition</title></head>
<body><h1>Synthetic classroom bridge acceptance</h1><iframe id="client" title="Synthetic AlloFlow client" src="${clientOrigins[index]}/" style="width:100%;height:650px;border:0"></iframe></body></html>`;
const client = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Synthetic AlloFlow client</title></head><body>
<h1>Synthetic teacher workspace</h1><p id="connection" role="status">Connecting to on-device test storage</p>
<script src="/allo_device_storage_module.js"></script><script>
window.bridgeMessages=[];
window.addEventListener('message',event=>{
 const value=event.data;
 if(value&&value.allo==='ds1')bridgeMessages.push({origin:event.origin,type:value.type||'response',ok:value.ok});
});
alloDeviceStorage.init({surface:'canvas',mode:'iframe'});
window.connection=alloDeviceStorage.connect().then(status=>{
 window.connectedStatus=status;document.querySelector('#connection').textContent='Connected';
 return status;
},error=>{
 window.connectionFailure={code:error.code,message:error.message};
 document.querySelector('#connection').textContent='Connection failed';return null;
});
</script></body></html>`;

let browser;
const report = {
  passed: false,
  scope: 'Canonical client and bridge, native nested cross-origin iframe, postMessage, consent and IndexedDB in one isolated Chromium context. Two initial atomic recovery saves and second-origin restoration; five history-empty meaningful draft roundtrips; actual removeMedia mutation at a 500-entry omission cap and fresh-client restoration. Same synthetic top-level site with two different client origins. No real Google Canvas session, full App shell, hosted CDN request, physical device restart or manual screen-reader certification.',
  runner: { file: path.relative(root, __filename).replace(/\\/g, '/'), sha256: runnerSha256, bytes: runnerBytes.length },
  bridgeUrl: defaultBridge[1],
  sources: Object.fromEntries(inputFiles.map(file => [file, { sha256: inputs[file].sha256, bytes: inputs[file].bytes.length }])),
  routedRequests: [], blockedRequests: [], pageErrors: [],
};

async function getClient(page) {
  const handle = await page.locator('#client').elementHandle();
  assert(handle, 'Synthetic client frame did not render');
  const frame = await handle.contentFrame();
  assert(frame, 'Synthetic client browsing context unavailable');
  await frame.waitForFunction(() => typeof window.alloDeviceStorage?.connect === 'function');
  return frame;
}

async function nativeRows(page) {
  const bridge = page.frames().find(frame => frame.url().startsWith(bridgeUrl.origin + bridgeUrl.pathname));
  assert(bridge, 'Canonical bridge frame unavailable');
  return bridge.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('allo_device_storage', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readonly');
        const request = tx.objectStore('kv').getAll();
        let rows;
        request.onsuccess = () => { rows = request.result; };
        tx.oncomplete = () => resolve(rows);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Native read transaction aborted'));
      });
    } finally { db.close(); }
  });
}

(async () => {
  browser = await chromium.launch({ headless: true, args: ['--disable-background-networking'] });
  report.runtime = { node: process.version, playwright: require('playwright/package.json').version, chromium: browser.version() };
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  context.on('page', page => page.on('pageerror', error => report.pageErrors.push(error.message)));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const fulfilled = async (contentType, body) => {
      report.routedRequests.push({ origin: url.origin, path: url.pathname, search: url.search, contentType });
      await route.fulfill({ status: 200, contentType, body, headers: { 'cache-control': 'no-store' } });
    };
    if (url.origin === topOrigin && /^\/session-[12]$/.test(url.pathname)) {
      return fulfilled('text/html; charset=utf-8', shell(Number(url.pathname.at(-1)) - 1));
    }
    if (clientOrigins.includes(url.origin) && url.pathname === '/') return fulfilled('text/html; charset=utf-8', client);
    if (clientOrigins.includes(url.origin) && url.pathname === '/allo_device_storage_module.js') {
      return fulfilled('application/javascript; charset=utf-8', inputs['allo_device_storage_module.js'].bytes);
    }
    if (url.origin === bridgeUrl.origin && url.pathname === bridgeUrl.pathname) {
      return fulfilled('text/html; charset=utf-8', inputs['storage_bridge.html'].bytes);
    }
    report.blockedRequests.push({ origin: url.origin, path: url.pathname });
    await route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(topOrigin + '/session-1');
  let frame = await getClient(page);
  const approve = page.frameLocator('#client').frameLocator('iframe[title="AlloFlow device storage bridge"]')
    .getByRole('button', { name: 'Approve this connection', exact: true });
  await approve.waitFor({ state: 'visible' });
  assert.equal(await approve.isEnabled(), true);
  const bridgeFrameElement = frame.locator('iframe[title="AlloFlow device storage bridge"]');
  assert.equal(await bridgeFrameElement.getAttribute('aria-hidden'), null, 'Consent frame must be exposed');
  await approve.focus();
  await approve.press('Enter');
  const status = await frame.evaluate(() => connection);
  assert.equal(status.backend, 'bridge-iframe');
  assert.equal(status.connected, true);
  assert.equal(await bridgeFrameElement.getAttribute('aria-hidden'), 'true', 'Connected background frame must return hidden');
  report.consent = { shown: true, nativeKeyboardApproved: true, backgroundFrameHiddenAfterApproval: true, status };

  const saved = await frame.evaluate(async () => {
    const ds = alloDeviceStorage;
    const first = { revision: 1, history: [{ id: 'synthetic-reading', type: 'simplified', title: 'Pond lesson', data: 'Pond plants use sunlight.' }], inputText: 'Pond plants use sunlight.' };
    const second = { revision: 2, history: [...first.history, { id: 'synthetic-glossary', type: 'glossary', title: 'Pond words', data: [{ word: 'pond', def: 'A small body of water.' }] }], inputText: first.inputText };
    const results = [];
    for (const snapshot of [first, second]) {
      const ack = await ds.set('app_kv', 'classroom-acceptance-history', snapshot, { queue: false });
      const readBack = await ds.get('app_kv', 'classroom-acceptance-history');
      if (ack !== true || JSON.stringify(readBack) !== JSON.stringify(snapshot)) throw Error('Acknowledged workspace does not match read-back');
      const recoverySnapshot = { version: 1, id: 'synthetic-recovery-' + snapshot.revision, savedAt: new Date().toISOString(), workspace: { history: snapshot.history, inputText: snapshot.inputText } };
      const mutation = await ds.mutateRecovery('workspace_recovery', 'store_v1', { version: 1, action: 'upsert', snapshot: recoverySnapshot }, { queue: false });
      const vault = await ds.get('workspace_recovery', 'store_v1');
      if (!mutation.applied || !vault.snapshots.some(entry => entry.id === recoverySnapshot.id && entry.resourceCount === snapshot.history.length)) throw Error('Atomic recovery snapshot not durably present');
      results.push({ revision: snapshot.revision, acknowledged: ack, historyCount: readBack.history.length, recoveryCount: vault.snapshots.length });
    }
    return { results, expected: second, messages: bridgeMessages, status: ds.status() };
  });
  assert.deepEqual(saved.results.map(row => row.historyCount), [1, 2]);
  assert.deepEqual(saved.results.map(row => row.recoveryCount), [1, 2]);
  assert.equal(saved.status.queuedWrites, 0);
  const durableRows = await nativeRows(page);
  const nativeHistory = durableRows.find(row => row.ns === 'app_kv' && row.value?.revision === 2);
  const nativeVault = durableRows.find(row => row.ns === 'workspace_recovery');
  assert.deepEqual(nativeHistory?.value, saved.expected, 'Native committed history differs from acknowledgement');
  assert.equal(nativeVault?.value?.snapshots?.length, 2);
  report.twoSaves = saved.results;
  report.nativeCommittedRead = { historyRevision: nativeHistory.value.revision, historyCount: nativeHistory.value.history.length, recoveryCount: nativeVault.value.snapshots.length };

  // A new app origin has no access to the earlier client's local storage. The
  // bridge bucket and consent remain in the same top-level-site partition.
  await page.goto(topOrigin + '/session-2');
  frame = await getClient(page);
  const restored = await frame.evaluate(async () => {
    const status = await connection;
    if (!status?.connected) throw Error('Fresh client did not connect: ' + JSON.stringify(connectionFailure));
    const history = await alloDeviceStorage.get('app_kv', 'classroom-acceptance-history');
    const vault = await alloDeviceStorage.get('workspace_recovery', 'store_v1');
    return { origin: location.origin, status, history, vault, messages: bridgeMessages };
  });
  assert.equal(restored.origin, clientOrigins[1]);
  assert.deepEqual(restored.history, saved.expected);
  assert.equal(restored.vault.snapshots.length, 2);
  assert.equal(restored.messages.some(row => row.type === 'allo-bridge-consent-required'), false, 'Remembered grant was not retained');
  assert(restored.messages.every(row => row.origin === bridgeUrl.origin), 'Unexpected message origin');
  report.freshClientRestore = { origin: restored.origin, historyRevision: restored.history.revision, historyCount: restored.history.history.length, recoveryCount: restored.vault.snapshots.length, approvalPromptRepeated: false, backend: restored.status.backend };

  // Keep the original two-save and second-origin count assertions above intact.
  // New recovery records are added only after those original invariants pass.
  const extended = await frame.evaluate(async () => {
    const ds = alloDeviceStorage, draftFields = [
      ['wordSoundsState', { history: [{ word: 'pond', activity: 'blend' }], phonemeMastery: {} }],
      ['units', [{ id: 'unit', title: 'Teacher planning', resources: [] }]],
      ['profiles', [{ id: 'learner', name: 'Demo learner' }]],
      ['projectState', { responses: { 'planned-activity': 'Keep this draft response.' }, progressLog: [] }],
      ['guidedProgress', { selectedIds: ['planned-activity'], completedIds: [], step: 1 }],
    ];
    const results = [], expectedDrafts = [];
    for (const [field, value] of draftFields) {
      const snapshot = { version: 1, id: 'synthetic-draft-' + field, title: 'Meaningful ' + field + ' draft',
        savedAt: new Date().toISOString(), pinned: field === 'profiles',
        workspace: { history: [], inputText: '', sourceTopic: '', builderDraft: null,
          units: [], profiles: [], guidedProgress: {}, projectState: {}, wordSoundsState: {}, [field]: value },
      };
      const mutation = await ds.mutateRecovery('workspace_recovery', 'store_v1',
        { version: 1, action: 'upsert', snapshot }, { queue: false });
      if (mutation.applied !== true || mutation.reason !== 'upserted') throw Error('Meaningful draft upsert was not acknowledged: ' + field);
      const readBack = await ds.get('workspace_recovery', 'store_v1');
      if (JSON.stringify(readBack) !== JSON.stringify(mutation.store)) throw Error('Draft acknowledgement differs from native read-back: ' + field);
      const stored = readBack.snapshots.find(entry => entry.id === snapshot.id);
      if (!stored || stored.resourceCount !== 0 || stored.workspace.history.length !== 0
          || JSON.stringify(stored.workspace) !== JSON.stringify(snapshot.workspace) || stored.pinned !== snapshot.pinned) {
        throw Error('Meaningful history-empty draft did not roundtrip: ' + field);
      }
      results.push({ id: snapshot.id, field, acknowledged: mutation.applied,
        resourceCount: stored.resourceCount, historyCount: stored.workspace.history.length,
        snapshotCount: readBack.snapshots.length, pinned: stored.pinned, exactWorkspaceReadBack: true });
      expectedDrafts.push({ id: snapshot.id, workspace: snapshot.workspace, pinned: snapshot.pinned });
    }

    const mediaId = 'synthetic-media-removal-at-cap', mediaText = 'Keep the teacher text after explicit media removal.';
    const remoteImage = 'https://school.example/pond.png', remoteAudio = 'https://school.example/pond.wav';
    const manifest = Array.from({ length: 500 }, (_, index) => ({
      path: 'snapshot.workspace.history[0].data.previews[' + index + ']', kind: 'blob-url',
      approximateBytes: 25, reason: 'session-only-url',
    }));
    const mediaSnapshot = { version: 1, id: mediaId, title: 'Explicit media-removal intent',
      savedAt: new Date().toISOString(), pinned: true, assetPolicy: 'text-only', omittedAssets: 500,
      omittedAssetManifest: manifest, workspace: { inputText: mediaText, sourceTopic: 'Pond', history: [
        { id: 'media-reading', type: 'simplified', title: 'Pond', data: {
          text: mediaText, image: 'data:image/png;base64,AQ==', audio: 'data:audio/wav;base64,Ag==',
          remoteImage, remoteAudio, previews: Array.from({ length: 500 }, () => null),
        } },
      ] },
    };
    const mediaSeed = await ds.mutateRecovery('workspace_recovery', 'store_v1',
      { version: 1, action: 'upsert', snapshot: mediaSnapshot }, { queue: false });
    if (mediaSeed.applied !== true) throw Error('Capped-media seed was not acknowledged');
    const beforeRemoval = (await ds.get('workspace_recovery', 'store_v1')).snapshots.find(entry => entry.id === mediaId);
    if (!beforeRemoval || beforeRemoval.omittedAssetManifest.length !== 500
        || beforeRemoval.workspace.history[0].data.image !== mediaSnapshot.workspace.history[0].data.image
        || beforeRemoval.workspace.history[0].data.audio !== mediaSnapshot.workspace.history[0].data.audio) {
      throw Error('Capped-media fixture was not durably stored with embedded media');
    }
    const removal = await ds.mutateRecovery('workspace_recovery', 'store_v1',
      { version: 1, action: 'removeMedia', snapshotId: mediaId }, { queue: false });
    if (removal.applied !== true || removal.reason !== 'media-removed') throw Error('Native media removal was not acknowledged');
    const afterRemoval = await ds.get('workspace_recovery', 'store_v1');
    if (JSON.stringify(afterRemoval) !== JSON.stringify(removal.store)) throw Error('Removal acknowledgement differs from native read-back');
    const removed = afterRemoval.snapshots.find(entry => entry.id === mediaId), data = removed?.workspace.history[0].data;
    const actualRemovalEntry = removed?.omittedAssetManifest.find(entry => entry.reason === 'user-remove-media'
      && entry.path === 'snapshot.workspace.history[0].data.image' && entry.kind === 'image/png');
    if (!removed || removed.omittedAssetManifest.length !== 500 || removed.omittedAssets !== 502
        || !actualRemovalEntry || data.image !== null || data.audio !== null || data.text !== mediaText
        || data.remoteImage !== remoteImage || data.remoteAudio !== remoteAudio || removed.pinned !== true) {
      throw Error('Native capped removal lost teacher intent, text, remote links or pins');
    }
    return { results, expectedDrafts, mediaExpected: removed,
      mediaRemoval: { id: mediaId, beforeManifestCount: beforeRemoval.omittedAssetManifest.length,
        initialEmbeddedMediaReadBack: true, acknowledged: removal.applied, reason: removal.reason,
        afterManifestCount: removed.omittedAssetManifest.length, omittedAssets: removed.omittedAssets,
        actualRemovalEntry, embeddedMediaRemoved: true, exactStoreReadBack: true,
        textPreserved: true, remoteLinksPreserved: true, pinned: removed.pinned,
        snapshotCount: afterRemoval.snapshots.length },
      expectedSnapshotIds: afterRemoval.snapshots.map(entry => entry.id).sort(), status: ds.status(),
    };
  });
  assert.equal(extended.results.length, 5);
  assert.deepEqual(extended.results.map(row => row.snapshotCount), [3, 4, 5, 6, 7]);
  assert(extended.results.every(row => row.acknowledged && row.resourceCount === 0 && row.historyCount === 0 && row.exactWorkspaceReadBack));
  assert.equal(extended.mediaRemoval.snapshotCount, 8);
  assert.equal(extended.status.queuedWrites, 0);
  report.draftOnlyRoundTrips = extended.results;
  report.explicitMediaRemovalAtCap = extended.mediaRemoval;
  const extendedRows = await nativeRows(page), extendedNativeVault = extendedRows.find(row => row.ns === 'workspace_recovery');
  assert.equal(extendedNativeVault?.value?.snapshots?.length, 8);
  assert.deepEqual(extendedNativeVault.value.snapshots.find(entry => entry.id === extended.mediaExpected.id), extended.mediaExpected,
    'Committed native capped-media snapshot differs from acknowledgement');
  for (const expected of extended.expectedDrafts) {
    const actual = extendedNativeVault.value.snapshots.find(entry => entry.id === expected.id);
    assert(actual, 'Committed native draft missing: ' + expected.id);
    assert.deepEqual(actual.workspace, expected.workspace); assert.equal(actual.resourceCount, 0); assert.equal(actual.pinned, expected.pinned);
  }
  report.extendedNativeCommittedRead = { recoveryCount: 8, draftCount: 5,
    exactDraftWorkspaces: true, exactCappedRemovalSnapshot: true };

  // Recreate the first-origin client after all new writes. Restoration uses the
  // actual bridge database; no earlier app window or client-side state survives.
  await page.goto(topOrigin + '/session-1');
  frame = await getClient(page);
  const freshExtended = await frame.evaluate(async () => {
    const status = await connection;
    if (!status?.connected) throw Error('Fresh extended client did not connect: ' + JSON.stringify(connectionFailure));
    return { origin: location.origin, status, vault: await alloDeviceStorage.get('workspace_recovery', 'store_v1'),
      history: await alloDeviceStorage.get('app_kv', 'classroom-acceptance-history'), messages: bridgeMessages };
  });
  assert.equal(freshExtended.origin, clientOrigins[0]);
  assert.deepEqual(freshExtended.history, saved.expected, 'Earlier history was changed by recovery mutations');
  assert.equal(freshExtended.vault.snapshots.length, 8);
  assert.deepEqual(freshExtended.vault.snapshots.map(entry => entry.id).sort(), extended.expectedSnapshotIds);
  for (const expected of extended.expectedDrafts) {
    const actual = freshExtended.vault.snapshots.find(entry => entry.id === expected.id);
    assert(actual, 'Fresh-client draft missing: ' + expected.id);
    assert.deepEqual(actual.workspace, expected.workspace); assert.equal(actual.resourceCount, 0); assert.equal(actual.pinned, expected.pinned);
  }
  assert.deepEqual(freshExtended.vault.snapshots.find(entry => entry.id === extended.mediaExpected.id), extended.mediaExpected,
    'Fresh-client read lost capped-removal intent, preserved text or remote links');
  assert.equal(freshExtended.messages.some(row => row.type === 'allo-bridge-consent-required'), false, 'Remembered grant was not retained');
  assert(freshExtended.messages.every(row => row.origin === bridgeUrl.origin), 'Unexpected fresh-client message origin');
  report.freshExtendedRestore = { origin: freshExtended.origin, recoveryCount: freshExtended.vault.snapshots.length,
    draftCount: extended.expectedDrafts.length, exactDraftWorkspaces: true, exactCappedRemovalSnapshot: true,
    actualRemovalEntry: true, preservedTextAndRemoteLinks: true, approvalPromptRepeated: false, backend: freshExtended.status.backend };
  assert.deepEqual(report.pageErrors, []);
  for (const file of inputFiles) assert.equal(hash(fs.readFileSync(path.join(root, file))), inputs[file].sha256, 'Input changed during acceptance: ' + file);
  assert.equal(hash(fs.readFileSync(__filename)), runnerSha256, 'Runner changed during acceptance');
  report.passed = true;
})().catch(error => {
  report.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, 'bridge-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
});
