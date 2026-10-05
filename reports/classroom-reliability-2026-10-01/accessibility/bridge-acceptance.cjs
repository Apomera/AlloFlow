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
const inputFiles = ['allo_device_storage_module.js', 'storage_bridge.html'];
const inputs = Object.fromEntries(inputFiles.map(file => {
  const bytes = fs.readFileSync(path.join(root, file));
  return [file, { bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }];
}));
const topOrigin = 'https://classroom-reliability.test';
const clientOrigins = ['https://first.classroom-client.test', 'https://second.classroom-client.test'];
const defaultBridge = /var DEFAULT_BRIDGE_URL = '([^']+)'/.exec(inputs['allo_device_storage_module.js'].bytes.toString('utf8'));
assert(defaultBridge, 'Canonical bridge URL not found');
const bridgeUrl = new URL(defaultBridge[1]);
assert.equal(bridgeUrl.protocol, 'https:');
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
  scope: 'Canonical client and bridge, native nested cross-origin iframe, postMessage, consent and IndexedDB in one isolated Chromium context. Same synthetic top-level site with two different client origins. No real Google Canvas session, full App shell, hosted CDN request, physical device restart or manual screen-reader certification.',
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
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  context.on('page', page => page.on('pageerror', error => report.pageErrors.push(error.message)));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const fulfilled = async (contentType, body) => {
      report.routedRequests.push({ origin: url.origin, path: url.pathname, contentType });
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
  assert.deepEqual(report.pageErrors, []);
  for (const file of inputFiles) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), inputs[file].sha256, 'Input changed during acceptance: ' + file);
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
