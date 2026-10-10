'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const files = { host: 'AlloFlowANTI.txt', handlers: 'host_handlers_module.js', source: 'host_handlers_source.jsx', crypto: 'allo_crypto_module.js', vault: 'allo_device_vault_module.js', integration: 'allo_recovery_vault_integration_module.js' };
const raw = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, fs.readFileSync(path.join(root, f))]));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const host = raw.host.toString().replace(/\r\n/g, '\n');
const a = host.indexOf('  const getCanvasRecoveryVaultController = async () => {'), b = host.indexOf('\n\n  const emptyCanvasRecoveryVaultView =', a);
assert.ok(a >= 0 && b > a); const getter = host.slice(a, b);
const inputs = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, { file: f, sha256: sha(raw[k]) }]));
let server, browser;
(async () => {
  const pageErrors = [];
  try {
    server = http.createServer((request, response) => {
      const key = { '/handlers.js': 'handlers', '/crypto.js': 'crypto', '/vault.js': 'vault', '/integration.js': 'integration' }[request.url];
      response.writeHead(200, { 'Content-Type': key ? 'application/javascript' : 'text/html;charset=utf-8' });
      response.end(key ? raw[key] : '<!doctype html><title>Native vault acceptance</title><button id="export">Export encrypted backup</button>');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { chromium } = require(path.join(root, 'node_modules/playwright'));
    const downloadsPath = path.join(__dirname, 'native-downloads'); fs.mkdirSync(downloadsPath, { recursive: true });
    browser = await chromium.launch({ headless: true, downloadsPath, executablePath: process.env.NATIVE_VAULT_BROWSER || 'C:/Users/cabba/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe' });
    const page = await browser.newPage({ acceptDownloads: true }); page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.addScriptTag({ content: 'window.React={}; window.AlloModules={};' });
    for (const name of ['crypto', 'vault', 'integration', 'handlers']) await page.addScriptTag({ url: '/' + name + '.js' });
    const setup = await page.evaluate(async getter => {
      const equal = (x, y, label) => { if (JSON.stringify(x) !== JSON.stringify(y)) throw Error(label + ': ' + JSON.stringify({ actual: x, expected: y })); };
      const check = (x, label) => { if (!x) throw Error(label); };
      const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
      const Crypto = window.AlloModules.AlloCrypto, Vault = window.AlloModules.AlloDeviceVault, Integration = window.AlloModules.AlloRecoveryVaultIntegration;
      check(isSecureContext && !!crypto.subtle && Vault.SESSION_OWNERSHIP_VERSION === 1, 'Native secure WebCrypto and upgraded vault');
      async function storageFor(name, seed) {
        const request = indexedDB.open(name, 1); request.onupgradeneeded = () => request.result.createObjectStore('records');
        const database = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        const storage = {
          async get() { return new Promise((resolve, reject) => { const tx = database.transaction('records', 'readonly'), r = tx.objectStore('records').get('vault'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); },
          async compareAndSwap(namespace, key, expected, next) {
            return new Promise((resolve, reject) => {
              const tx = database.transaction('records', 'readwrite'), store = tx.objectStore('records'); let applied = false;
              const r = store.get('vault'); r.onsuccess = () => {
                const current = r.result;
                const matches = typeof expected === 'number' ? current?.revision === expected : expected?.mode === 'absent' ? current == null : expected?.mode === 'value' && JSON.stringify(current) === JSON.stringify(expected.value);
                if (matches) { const revision = (current?.revision || 0) + 1; store.put({ ...structuredClone(next), revision }, 'vault'); applied = true; }
              };
              tx.oncomplete = () => resolve({ applied }); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || Error('Aborted native transaction'));
            });
          },
          close() { database.close(); }
        };
        if (seed) await new Promise((resolve, reject) => { const tx = database.transaction('records', 'readwrite'); tx.objectStore('records').put(seed, 'vault'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
        return storage;
      }
      const marker = 'SYNTHETIC_PRIVATE_NATIVE_VAULT_WORK';
      const plain = { version: 1, retentionPolicy: 'standard', effectiveRetentionPolicy: 'standard', legacyMigrationComplete: true, snapshots: [{ version: 1, id: 'native-vault-work', title: marker, savedAt: new Date().toISOString(), workspace: { inputText: marker, history: [] } }] };
      const storage = await storageFor('vault-native-' + Date.now(), plain);
      let heldUnwrap = null;
      const nativeCrypto = { ...Crypto, async unwrapVaultKey(...args) { const result = await Crypto.unwrapVaultKey(...args); if (heldUnwrap) { const held = heldUnwrap; heldUnwrap = null; held.entered.resolve(); await held.release.promise; } return result; } };
      let created = 0; const ready = deferred();
      const stack = { crypto: nativeCrypto, vault: Vault, integration: { createController(device, options) { created += 1; return Integration.createController(device, { ...options, cryptoOptions: { iterations: 10000 } }); } } };
      const controllerRef = { current: null }, initRef = { current: null };
      const get = new Function('canvasRecoveryVaultControllerRef', 'canvasRecoveryVaultControllerInitRef', '_alloGetCanvasDeviceStorage', '_alloGetRecoveryVaultStack', getter + '\nreturn getCanvasRecoveryVaultController;')(controllerRef, initRef, async () => { await ready.promise; return storage; }, async () => stack);
      const first = get(), second = get(); ready.resolve(); const controllers = await Promise.all([first, second]);
      check(controllers[0] === controllers[1] && controllerRef.current === controllers[0], 'Concurrent initialization returns the same current controller'); equal(created, 1, 'One actual integration controller'); equal(initRef.current, null, 'Initialization latch releases');
      const controller = controllers[0]; await controller.enableProtection('synthetic native password'); controller.lock();
      check(!(JSON.stringify(await storage.get()).includes(marker)), 'Native IndexedDB excludes plaintext');
      const errors = [];
      const handlers = window.AlloModules.HostHandlers({ getCanvasRecoveryVaultController: get, setCanvasRecoveryError: error => errors.push(error) });
      document.querySelector('#export').onclick = () => void handlers.exportCanvasRecoveryVaultBackup();
      window.nativeVault = { equal, check, deferred, Crypto, Vault, Integration, storageFor, marker, storage, controller, handlers, errors, holdUnwrap() { const held = { entered: deferred(), release: deferred() }; heldUnwrap = held; return held; } };
      return { scenario: 'Concurrent host initialization with native storage and encryption', passed: true, controllersCreated: created, locked: (await controller.getStatus()).locked };
    }, getter);
    const downloadPromise = page.waitForEvent('download'); await page.locator('#export').click(); const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'native-encrypted-backup.json'); await download.saveAs(downloadPath);
    const backup = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    assert.equal(backup.kind, 'alloflow-recovery-vault-backup'); assert.ok(!JSON.stringify(backup).includes('SYNTHETIC_PRIVATE_NATIVE_VAULT_WORK'));
    const afterDownload = await page.evaluate(async backup => {
      const n = window.nativeVault;
      n.equal(n.errors, [], 'Actual extracted export has no error'); n.check((await n.controller.getStatus()).locked, 'Locked export stays locked');
      const storage = await n.storageFor('vault-import-native-' + Date.now());
      const imported = n.Integration.createController(storage, { vaultModule: n.Vault, crypto: n.Crypto, cryptoOptions: { iterations: 10000 } });
      await imported.importEncryptedBackup(backup, 'synthetic native password');
      n.equal((await imported.readPlainStore()).snapshots[0].title, n.marker, 'Actual downloaded encrypted backup restores native content'); imported.lock();
      let lockedError; try { await imported.readPlainStore(); } catch (error) { lockedError = error.code; }
      n.equal(lockedError, 'VAULT_LOCKED', 'Imported locked controller blocks plaintext'); storage.close();
      return { scenario: 'Native locked download and encrypted backup roundtrip', passed: true };
    }, backup);
    const lateUnlock = await page.evaluate(async () => {
      const n = window.nativeVault, held = n.holdUnwrap();
      const pending = n.controller.unlock('synthetic native password').then(() => null, error => error.code);
      await held.entered.promise; const generation = n.controller.getSessionGeneration(); n.controller.lock(); held.release.resolve();
      n.equal(await pending, 'VAULT_LOCKED', 'Late native credential completion is retired'); n.check((await n.controller.getStatus()).locked, 'Late native credential cannot restore key');
      n.check(n.controller.getSessionGeneration() > generation, 'Lock retires session generation');
      let blocked; try { await n.controller.readPlainStore(); } catch (error) { blocked = error.code; } n.equal(blocked, 'VAULT_LOCKED', 'Retired credentials cannot enable later plaintext read');
      await n.controller.unlock('synthetic native password'); n.equal((await n.controller.readPlainStore()).snapshots[0].title, n.marker, 'Explicit fresh unlock still works'); n.controller.lock(); n.storage.close();
      return { scenario: 'Native delayed unlock remains locked and fresh unlock succeeds', passed: true };
    });
    assert.deepEqual(pageErrors, []);
    const stable = Object.entries(files).every(([key, file]) => sha(fs.readFileSync(path.join(root, file))) === inputs[key].sha256); assert.ok(stable);
    const result = { passed: true, completedAt: new Date().toISOString(), inputs, stable, pageErrors, scenarios: [setup, afterDownload, lateUnlock], downloadedFilename: download.suggestedFilename(), backupFile: path.relative(root, downloadPath), scope: 'Native Chromium/IndexedDB/WebCrypto/Blob/download with actual production host getter, complete generated handlers and three vault modules. Synthetic test password and10k crypto configuration; no full App shell or remote service.' };
    fs.writeFileSync(path.join(__dirname, 'native-vault.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ passed: true, scenarios: result.scenarios.length, stable, pageErrors }));
  } finally { await browser?.close(); await new Promise(resolve => server ? server.close(resolve) : resolve()); }
})().catch(error => { fs.writeFileSync(path.join(__dirname, 'native-vault-failure.json'), JSON.stringify({ passed: false, error: error.stack, inputs }, null, 2) + '\n'); console.error(error.stack); process.exitCode = 1; });
