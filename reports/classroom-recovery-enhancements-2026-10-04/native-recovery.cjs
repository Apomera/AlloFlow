'use strict';
// Native Chromium acceptance for bounded production recovery closures.
// FileReader, File/DataTransfer, IndexedDB and Web Crypto remain native.
// Module-loader and one actual record-decrypt completion are controlled.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const paths = {
  host: path.resolve(process.env.NATIVE_RECOVERY_HOST || path.join(root, 'AlloFlowANTI.txt')),
  handlers: path.resolve(process.env.NATIVE_RECOVERY_HANDLERS || path.join(root, 'host_handlers_module.js')),
  editableHandlers: path.resolve(process.env.NATIVE_RECOVERY_HANDLER_SOURCE || path.join(root, 'host_handlers_source.jsx')),
  crypto: path.join(root, 'allo_crypto_module.js'), vault: path.join(root, 'allo_device_vault_module.js'),
};
const raw = Object.fromEntries(Object.entries(paths).map(([name, file]) => [name, fs.readFileSync(file)]));
const host = raw.host.toString().replace(/\r\n/g, '\n');
function section(start, end) {
  const a = host.indexOf(start), b = host.indexOf(end, a);
  assert.ok(a >= 0 && b > a && host.indexOf(start, a + start.length) < 0, 'Unique actual section: ' + start);
  return host.slice(a, b);
}
const payload = {
  recovery: section('const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage'),
  invalidate: section('  const invalidateLocalDataHydration =', '  const cancelActiveProjectLoad ='),
  dialog: section('  const setCanvasRecoveryDialogMode =', '  const canvasRecoveryVaultPendingActionRef ='),
  close: section('  const closeCanvasRecoveryDialog =', '  const renderCanvasRecoveryCodeConfirmation ='),
  emptyView: section('  const emptyCanvasRecoveryVaultView =', '  const readUnlockedCanvasRecoveryVaultStore ='),
  read: section('  const readUnlockedCanvasRecoveryVaultStore =', '  const publishCanvasRecoveryVaultLockedState ='),
  clearSecrets: section('  const clearCanvasRecoveryVaultSecrets =', '  const commitCanvasRecoveryVaultEnable ='),
  refNames: [...new Set([...raw.editableHandlers.toString().matchAll(/__d\.(\w+Ref)\b/g)].map(match => match[1]))],
};
const inputs = Object.fromEntries(Object.entries(paths).map(([name, file]) => [name, { path: file, sha256: crypto.createHash('sha256').update(raw[name]).digest('hex') }]));
const destination = path.resolve(process.env.NATIVE_RECOVERY_RESULT || path.join(__dirname, 'native-recovery.json'));
const pageErrors = [];
(async () => {
  let server, browser;
  try {
    server = http.createServer((request, response) => {
      const route = { '/handlers.js': 'handlers', '/crypto.js': 'crypto', '/vault.js': 'vault' }[request.url];
      response.writeHead(200, { 'Content-Type': route ? 'application/javascript' : 'text/html; charset=utf-8' });
      response.end(route ? raw[route] : '<!doctype html><title>Local recovery acceptance</title><label>Recovery test file <input id="file" type="file"></label><button id="close" type="button">Close recovery test</button>');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { chromium } = require(path.join(root, 'node_modules/playwright'));
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/cabba/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe' });
    const page = await browser.newPage(); page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.addScriptTag({ content: 'window.React = {}; window.AlloModules = {};' });
    for (const name of ['crypto', 'vault', 'handlers']) await page.addScriptTag({ url: '/' + name + '.js' });
    const result = await page.evaluate(async payload => {
      const assert = (condition, message) => { if (!condition) throw Error(message); };
      const equal = (a, b, message) => assert(JSON.stringify(a) === JSON.stringify(b), message + ': ' + JSON.stringify({ actual: a, expected: b }));
      const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
      const until = async (predicate, message) => { const deadline = Date.now() + 20000; while (!predicate()) { if (Date.now() > deadline) throw Error('Timed out: ' + message); await new Promise(resolve => setTimeout(resolve, 20)); } };
      const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
      const nativeReader = window.FileReader;
      const Crypto = window.AlloModules.AlloCrypto, Vault = window.AlloModules.AlloDeviceVault, factory = window.AlloModules.HostHandlers;
      assert(typeof Crypto?.decryptRecord === 'function' && typeof Vault?.createRecoveryVaultController === 'function' && typeof factory === 'function', 'Load actual crypto, vault and complete generated handlers');
      assert(window.isSecureContext && !!crypto.subtle, 'Use native Web Crypto in a secure local origin');
      const Recovery = new Function('window', payload.recovery + '\nreturn ALLO_WORKSPACE_RECOVERY;')(window);
      const scopeFor = values => new Proxy(values, { has: () => true, get: (target, key) => key === Symbol.unscopables ? undefined : key in target ? target[key] : globalThis[key] });
      const make = (source, output, scope) => new Function('scope', 'with(scope) {\n' + source + '\nreturn ' + output + ';\n}')(scopeFor(scope));
      const privateMarker = 'PRIVATE_RECOVERY_WORK_MUST_STAY_HIDDEN_AFTER_LOCK';
      const plain = Recovery.normalizeStore({ version: 1, snapshots: [{ version: 1, id: 'native-private', title: 'Native private workspace', savedAt: new Date().toISOString(), workspace: { history: [], inputText: privateMarker } }] });
      let database;
      const nativeWrites = [];
      const repository = {
        async read() { return new Promise((resolve, reject) => { const tx = database.transaction('records', 'readonly'), request = tx.objectStore('records').get('state'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); },
        async compareAndSwap(revision, store) { return new Promise((resolve, reject) => { const tx = database.transaction('records', 'readwrite'), records = tx.objectStore('records'); let applied = false; const request = records.get('state'); request.onsuccess = () => { if (request.result.revision !== revision) return; records.put({ revision: revision + 1, store }, 'state'); applied = true; nativeWrites.push({ revision: revision + 1, encrypted: Vault.isVaultStore(store) }); }; tx.oncomplete = () => resolve(applied); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || Error('IndexedDB transaction aborted')); }); },
      };
      const open = indexedDB.open('classroom-native-recovery-' + Date.now(), 1);
      open.onupgradeneeded = () => open.result.createObjectStore('records');
      database = await new Promise((resolve, reject) => { open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
      await new Promise((resolve, reject) => { const tx = database.transaction('records', 'readwrite'); tx.objectStore('records').put({ revision: 0, store: plain }, 'state'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
      let heldDecrypt = null, decryptStarted = null, decryptCount = 0;
      const nativeCrypto = { ...Crypto, async decryptRecord(envelope, key, aad) {
        if (heldDecrypt && String(aad).includes('native-private')) { const gate = heldDecrypt; heldDecrypt = null; decryptStarted.resolve(); await gate.promise; }
        decryptCount += 1; return Crypto.decryptRecord(envelope, key, aad);
      } };
      const controller = Vault.createRecoveryVaultController({ repository, crypto: nativeCrypto, cryptoOptions: { iterations: 10000 } });
      await controller.enableProtection('strong native test password', { useRecoveryKey: false });
      const encryptedSeed = structuredClone((await repository.read()).store);
      assert(Vault.isVaultStore(encryptedSeed), 'Actual controller encrypts native IndexedDB repository');
      assert(!JSON.stringify(encryptedSeed).includes(privateMarker), 'Native stored encrypted representation excludes private plaintext');
      controller.lock();
      const refs = Object.fromEntries(payload.refNames.map(name => [name, { current: null }]));
      Object.assign(refs, {
        canvasRecoveryVaultControllerRef: { current: controller }, canvasRecoveryStoreRef: { current: Recovery.emptyStore() },
        canvasRecoveryVaultSyncRequestRef: { current: null }, canvasRecoveryImportRequestRef: { current: null }, canvasRecoveryRestoreRequestRef: { current: null },
        workspaceReplacementGenerationRef: { current: 0 }, localDataHydrationGenerationRef: { current: 0 }, studentWorkHydrationGenerationRef: { current: 0 },
        isStudentWorkLoaded: { current: false }, canvasRecoveryMutationInProgressRef: { current: false }, canvasRecoverySaveTokenRef: { current: 0 },
        canvasRecoveryPendingSaveCountRef: { current: 0 }, canvasRecoveryWriteQueueRef: { current: Promise.resolve() }, canvasRecoveryCurrentIdRef: { current: 'native-private' },
      });
      const state = { store: Recovery.emptyStore(), vault: { enabled: true, locked: true }, busy: null, dialog: 'vault-locked', saveStatus: 'locked', error: '', form: { mode: 'unlock', password: 'strong native test password' } };
      const events = [], importedProjects = [], input = document.querySelector('#file'); let loader = async () => ({ vault: Vault }), loaderCalls = 0;
      const setter = (key, value) => { state[key] = typeof value === 'function' ? value(state[key]) : value; events.push({ key, value: structuredClone(state[key]) }); };
      const bindings = { ...refs, ALLO_WORKSPACE_RECOVERY: Recovery, setCanvasRecoveryBusyId: value => setter('busy', value), _setCanvasRecoveryDialogMode: value => setter('dialog', value),
        setCanvasRecoveryVaultForm: value => setter('form', value), setPdfRemediationDeleteConfirm: value => setter('pdfConfirm', value) };
      const invalidate = make(payload.invalidate, 'invalidateLocalDataHydration', bindings);
      const dialog = make(payload.dialog, 'setCanvasRecoveryDialogMode', bindings);
      const clearSecrets = make(payload.clearSecrets, 'clearCanvasRecoveryVaultSecrets', bindings);
      const emptyView = make(payload.emptyView, 'emptyCanvasRecoveryVaultView', bindings);
      const readPlain = make(payload.read, 'readUnlockedCanvasRecoveryVaultStore', bindings);
      const deps = { ...refs, ALLO_WORKSPACE_RECOVERY: Recovery,
        history: [], units: [], profiles: [], studentResponses: {}, inputText: '', sourceTopic: '', guidedPlanBrief: null, canvasRecoveryDecisionMade: true,
        hasMeaningfulWordSoundsWorkspace: () => false, getCanvasRecoveryVaultController: async () => controller,
        _alloGetRecoveryVaultStack: () => { loaderCalls += 1; return loader(); }, readUnlockedCanvasRecoveryVaultStore: readPlain, emptyCanvasRecoveryVaultView: emptyView,
        setCanvasRecoveryStore: value => { refs.canvasRecoveryStoreRef.current = value; setter('store', value); }, setCanvasRecoveryStoreAuthoritative: value => setter('authoritative', value),
        setCanvasRecoveryVaultState: value => setter('vault', value), setCanvasRecoveryBusyId: bindings.setCanvasRecoveryBusyId,
        setCanvasRecoveryError: value => setter('error', value), setCanvasRecoverySaveStatus: value => setter('saveStatus', value), setCanvasRecoveryVaultForm: bindings.setCanvasRecoveryVaultForm,
        setCanvasRecoveryDialogMode: dialog, clearCanvasRecoveryVaultSecrets: clearSecrets, clearCanvasWorkspaceState: () => { invalidate(); events.push({ key: 'controlledActiveWorkspaceClear' }); },
        setLastSaved: value => setter('lastSaved', value), setPendingSync: value => setter('pendingSync', value), queueCanvasRecoveryStorage: callback => callback(),
        handleLoadProject: event => importedProjects.push(event.target.files[0].name), addToast: (...args) => events.push({ key: 'toast', value: args }), warnLog() {}, t: key => key,
      };
      // Construct each invocation with fixed current render values and stable refs.
      const handlers = () => { const own = { ...deps, canvasRecoveryVaultState: { ...state.vault }, canvasRecoveryVaultForm: { ...state.form } }; let api;
        own.publishCanvasRecoveryVaultLockedState = status => api.publishCanvasRecoveryVaultLockedState(status);
        own.syncCanvasRecoveryVaultState = (...args) => api.syncCanvasRecoveryVaultState(...args);
        api = factory(own); return api;
      };
      const close = () => make(payload.close, 'closeCanvasRecoveryDialog', { ...bindings, canvasRecoveryVaultForm: { ...state.form }, clearCanvasRecoveryVaultSecrets: clearSecrets, setCanvasRecoveryDialogMode: dialog })(null);
      document.querySelector('#close').onclick = close; input.onchange = event => handlers().handleCanvasRecoveryImport(event);
      const choose = label => { const transfer = new DataTransfer(); transfer.items.add(new File([JSON.stringify({ kind: Vault.BACKUP_KIND, label, vault: encryptedSeed })], label + '.json', { type: 'application/json' })); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); };
      const cases = [];
      await handlers().unlockCanvasRecoveryVault();
      assert(state.store.snapshots[0]?.workspace.inputText === privateMarker && state.vault.locked === false, 'Normal actual unlock publishes decrypted work');
      choose('normal-import'); await until(() => refs.canvasRecoveryVaultImportRef.current?.label === 'normal-import' && state.busy === null, 'normal native file import');
      equal(state.form.mode, 'import-backup', 'Native import publishes real validated backup'); equal(input.value, '', 'Current native picker is cleared');
      cases.push({ name: 'native IndexedDB/Web Crypto unlock and FileReader import control', passed: true });
      const olderLoad = deferred(), olderStarted = deferred(); loader = () => { olderStarted.resolve(); return olderLoad.promise; }; choose('older-A'); await olderStarted.promise;
      loader = async () => ({ vault: Vault }); choose('latest-B'); await until(() => refs.canvasRecoveryVaultImportRef.current?.label === 'latest-B' && state.busy === null, 'latest native backup');
      const afterB = JSON.stringify(state); olderLoad.resolve({ vault: Vault }); await flush(); equal(JSON.stringify(state), afterB, 'Older native read/loader completion preserves latest state');
      equal(refs.canvasRecoveryVaultImportRef.current.label, 'latest-B', 'Newest file owns import');
      cases.push({ name: 'older native file completion cannot replace newest selected backup', passed: true });
      const closingLoad = deferred(), closingStarted = deferred(); loader = () => { closingStarted.resolve(); return closingLoad.promise; }; choose('close-C'); await closingStarted.promise;
      document.querySelector('#close').click(); const afterClose = JSON.stringify(state);
      equal(state.dialog, null, 'Actual close wrapper closes dialog'); equal(refs.canvasRecoveryImportRequestRef.current, null, 'Actual close retires file owner'); equal(state.busy, null, 'Actual close releases import busy'); equal(input.value, '', 'Actual close clears its native picker');
      closingLoad.resolve({ vault: Vault }); await flush(); equal(JSON.stringify(state), afterClose, 'Closed native import cannot republish form/dialog/errors');
      const replacementLoad = deferred(), replacementStarted = deferred(); loader = () => { replacementStarted.resolve(); return replacementLoad.promise; }; choose('replace-D'); await replacementStarted.promise;
      invalidate(); const afterReplacement = JSON.stringify(state); replacementLoad.resolve({ vault: Vault }); await flush(); equal(JSON.stringify(state), afterReplacement, 'Actual invalidation retires native import');
      equal(refs.canvasRecoveryVaultImportRef.current, null, 'Close and replacement publish no obsolete backup');
      cases.push({ name: 'actual close and authoritative invalidation retire native pending reads', passed: true });
      await handlers().lockCanvasRecoveryVault(); equal(state.store.snapshots.length, 0, 'Native lock hides current vault contents');
      state.form = { ...state.form, mode: 'unlock', password: 'strong native test password' };
      const gate = deferred(); heldDecrypt = gate; decryptStarted = deferred();
      const oldUnlock = handlers().unlockCanvasRecoveryVault(); await decryptStarted.promise;
      await handlers().lockCanvasRecoveryVault(); const afterLock = JSON.stringify(state);
      gate.resolve(); await oldUnlock;
      assert((await controller.getStatus()).locked === true, 'Actual controller remains locked after old native decrypt');
      equal(state.store.snapshots.length, 0, 'Old decrypt cannot republish private work'); equal(state.vault.locked, true, 'Old unlock cannot publish unlocked metadata');
      equal(state.dialog, 'vault-locked', 'Old unlock cannot reopen manage dialog'); equal(state.saveStatus, 'locked', 'Old unlock cannot reset locked status');
      equal(JSON.stringify(state), afterLock, 'All current lock feedback survives obsolete unlock caller completion');
      assert(window.FileReader === nativeReader, 'Use unchanged native FileReader throughout'); assert(decryptCount > 0, 'Actual record crypto completed');
      assert(nativeWrites.some(write => write.encrypted), 'At least one native IndexedDB encrypted commit'); assert(!JSON.stringify((await repository.read()).store).includes(privateMarker), 'Final native persisted store stays encrypted');
      cases.push({ name: 'actual unlock decrypt completing after native lock cannot republish state or feedback', passed: true });
      database.close();
      return { passed: true, cases, nativeFileLoaderCalls: loaderCalls, nativeRecordDecryptions: decryptCount, nativeEncryptedWrites: nativeWrites.filter(write => write.encrypted).length,
        exactLatestBackup: true, closeAndWorkspaceRetirement: true, protectedPlaintextHiddenAfterLock: true, nativeReaderUnmodified: true, importedLegacyProjects: importedProjects.length };
    }, payload);
    assert.equal(pageErrors.length, 0, 'Native browser page errors');
    const report = { ...result, completedAt: new Date().toISOString(), inputs, pageErrors,
      scope: 'Complete production generated handlers; actual canonical recovery normalization/invalidation/dialog-close/locked-view/read/secret-clear closures; native Chromium FileReader/File/DataTransfer, IndexedDB and Web Crypto with actual vault controller. Module-loader timing and one actual record decrypt are controlled. Diagnostic controls and injected active-workspace clear stand in for App rendering. No full App, remote Canvas bridge, real private user data, physical audio or assistive-technology claim.' };
    fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ passed: true, cases: result.cases.length, pageErrors, destination }));
  } finally { await browser?.close(); await new Promise(resolve => server ? server.close(resolve) : resolve()); }
})().catch(error => { fs.writeFileSync(destination, JSON.stringify({ passed: false, completedAt: new Date().toISOString(), inputs, pageErrors, error: error.stack }, null, 2) + '\n'); console.error(error); process.exitCode = 1; });
