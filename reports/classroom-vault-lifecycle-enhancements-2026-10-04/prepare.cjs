'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), before = path.join(__dirname, 'before'), out = path.join(__dirname, 'candidate');
const initial = JSON.parse(fs.readFileSync(path.join(__dirname, 'initial.json')));
const sha = b => crypto.createHash('sha256').update(b).digest('hex'), norm = s => s.replace(/\r\n/g, '\n');
const texts = Object.fromEntries(['AlloFlowANTI.txt', 'host_handlers_source.jsx', 'allo_device_vault_module.js'].map(file => [file, norm(fs.readFileSync(path.join(before, file), 'utf8'))]));
const operations = [];
function change(file, scope, old, replacement) {
  assert.equal(texts[file].split(old).length - 1, 1, 'Unique anchor: ' + scope);
  assert.notEqual(old, replacement); texts[file] = texts[file].replace(old, replacement);
  operations.push({ file, scope, before: old, after: replacement });
}
const host = 'AlloFlowANTI.txt', source = 'host_handlers_source.jsx', vault = 'allo_device_vault_module.js';
change(host, 'controller init ref', '  const canvasRecoveryVaultControllerRef = useRef(null);', '  const canvasRecoveryVaultControllerRef = useRef(null);\n  const canvasRecoveryVaultControllerInitRef = useRef(null);');
const getterStart = texts[host].indexOf('  const getCanvasRecoveryVaultController = async () => {'), getterEnd = texts[host].indexOf('\n\n  const emptyCanvasRecoveryVaultView =', getterStart);
assert.ok(getterStart >= 0 && getterEnd > getterStart);
change(host, 'coalesced controller initialization', texts[host].slice(getterStart, getterEnd), `  const getCanvasRecoveryVaultController = async () => {
      if (canvasRecoveryVaultControllerRef.current) return canvasRecoveryVaultControllerRef.current;
      if (canvasRecoveryVaultControllerInitRef.current) return canvasRecoveryVaultControllerInitRef.current.promise;
      const request = {};
      request.promise = (async () => {
          const deviceStorage = await _alloGetCanvasDeviceStorage();
          const stack = await _alloGetRecoveryVaultStack();
          if (canvasRecoveryVaultControllerRef.current) return canvasRecoveryVaultControllerRef.current;
          const controller = stack.integration.createController(deviceStorage, {
              vaultModule: stack.vault,
              crypto: stack.crypto
          });
          canvasRecoveryVaultControllerRef.current = controller;
          return controller;
      })();
      canvasRecoveryVaultControllerInitRef.current = request;
      try {
          return await request.promise;
      } finally {
          if (canvasRecoveryVaultControllerInitRef.current === request) canvasRecoveryVaultControllerInitRef.current = null;
      }
  };`);
change(host, 'cancelled boot publication', `                canvasRecoveryStoreRef.current = store;
                if (cancelled) return;
                if (isCanvasStudentEntry()) { protectCanvasStudentEntry(); return; }
                setCanvasRecoveryStoreAuthoritative(true);`, `                if (cancelled) return;
                if (isCanvasStudentEntry()) { protectCanvasStudentEntry(); return; }
                canvasRecoveryStoreRef.current = store;
                setCanvasRecoveryStoreAuthoritative(true);`);
change(source, 'encrypted backup host getter', 'const exportCanvasRecoveryVaultBackup = async () => {\n      try {\n          const controller = await getCanvasRecoveryVaultController();', 'const exportCanvasRecoveryVaultBackup = async () => {\n      try {\n          const controller = await __d.getCanvasRecoveryVaultController();');
change(vault, 'session generation initialization', '    this._dek = null;\n  }\n\n  RecoveryVaultController.prototype._crypto', '    this._dek = null;\n    this._keyGeneration = 0;\n  }\n\n  RecoveryVaultController.prototype._crypto');
change(vault, 'key session ownership helpers', '  RecoveryVaultController.prototype._requireUnlockedKey = async function (store) {\n    if (!this._dek) fail(\'VAULT_LOCKED\', \'Unlock the recovery vault before reading or saving workspace contents.\');\n    try {\n      await this._verifyKey(store, this._dek);\n      return this._dek;\n    } catch (error) {\n      this._dek = null;\n      throw error;\n    }\n  };', `  RecoveryVaultController.prototype._beginKeyOperation = function () {
    this._keyGeneration += 1;
    return this._keyGeneration;
  };

  RecoveryVaultController.prototype._setKeyIfCurrent = function (dek, generation) {
    if (generation !== this._keyGeneration) return false;
    this._dek = dek;
    return true;
  };

  RecoveryVaultController.prototype._clearKeyIfCurrent = function (generation) {
    if (generation === this._keyGeneration) this._dek = null;
  };

  RecoveryVaultController.prototype.getSessionGeneration = function () {
    return this._keyGeneration;
  };

  RecoveryVaultController.prototype._requireUnlockedKey = async function (store, generation) {
    if (generation === undefined) generation = this._keyGeneration;
    if (generation !== this._keyGeneration) {
      fail('VAULT_LOCKED', 'The recovery-vault session changed while its saved work was being read.');
    }
    var dek = this._dek;
    if (!dek) fail('VAULT_LOCKED', 'Unlock the recovery vault before reading or saving workspace contents.');
    try {
      await this._verifyKey(store, dek);
      if (generation !== this._keyGeneration || this._dek !== dek) {
        fail('VAULT_LOCKED', 'The recovery-vault session changed while its key was being verified.');
      }
      return dek;
    } catch (error) {
      if (this._dek === dek) this._clearKeyIfCurrent(generation);
      throw error;
    }
  };`);
for (const name of ['enableProtection', 'unlock', 'recoverWithKey', 'rotateRecoveryKey', 'removeRecoveryKey', 'changePassword', 'disableProtection', 'importEncryptedBackup', 'eraseAll']) {
  const start = texts[vault].indexOf('  RecoveryVaultController.prototype.' + name + ' = ');
  const end = texts[vault].indexOf('\n  };', start) + '\n  };'.length;
  assert.ok(start >= 0 && end > start);
  const old = texts[vault].slice(start, end);
  // Own the in-memory session only. CAS success still reports the durable result.
  let next = old.replace(/(async function \([^\n]*\) \{\n)/, '$1    var generation = this._beginKeyOperation();\n');
  assert.notEqual(next, old, name + ' captures session');
  next = next.replace(/this\._dek = null;/g, 'this._clearKeyIfCurrent(generation);');
  next = next.replace(/this\._dek = (built\.dek|verifiedDek|nextDek|dek);/g, 'this._setKeyIfCurrent($1, generation);');
  if (name === 'unlock') next = next.replace('    this._setKeyIfCurrent(dek, generation);', `    if (!this._setKeyIfCurrent(dek, generation)) {
      fail('VAULT_LOCKED', 'The vault was locked or another credential attempt started before unlock completed.');
    }`);
  if (name === 'enableProtection') next = next.replace('        await this.unlock(password);', `        if (generation !== this._keyGeneration) {
          fail('VAULT_LOCKED', 'The recovery-vault session changed before protection could be reopened.');
        }
        await this.unlock(password);`);
  if (name === 'rotateRecoveryKey') next = next.replace('this._requireUnlockedKey(store)', 'this._requireUnlockedKey(store, generation)');
  change(vault, 'session ownership: ' + name, old, next);
}
for (const name of ['listSnapshots', 'readPlainStore', 'restoreSnapshot', 'upsertSnapshot']) {
  const start = texts[vault].indexOf('  RecoveryVaultController.prototype.' + name + ' = ');
  const end = texts[vault].indexOf('\n  };', start) + '\n  };'.length;
  assert.ok(start >= 0 && end > start);
  const old = texts[vault].slice(start, end);
  const next = old.replace(/(async function \([^\n]*\) \{\n)/, '$1    var generation = this._keyGeneration;\n').replace('this._requireUnlockedKey(store)', 'this._requireUnlockedKey(store, generation)');
  change(vault, 'saved-head session ownership: ' + name, old, next);
}
change(source, 'vault sync session ownership', `      __d.canvasRecoveryVaultSyncRequestRef.current = request;
      const isCurrent = () => __d.canvasRecoveryVaultSyncRequestRef.current === request
          && __d.canvasRecoveryVaultControllerRef.current === controller;`, `      __d.canvasRecoveryVaultSyncRequestRef.current = request;
      const sessionGeneration = typeof controller.getSessionGeneration === 'function' ? controller.getSessionGeneration() : null;
      const isCurrent = () => __d.canvasRecoveryVaultSyncRequestRef.current === request
          && __d.canvasRecoveryVaultControllerRef.current === controller
          && (sessionGeneration === null || controller.getSessionGeneration() === sessionGeneration);`);
change(vault, 'lock retires key operations', '  RecoveryVaultController.prototype.lock = function () {\n    this._dek = null;', '  RecoveryVaultController.prototype.lock = function () {\n    this._beginKeyOperation();\n    this._dek = null;');
const apiStart = texts[vault].indexOf('  var AlloDeviceVault = {'); assert.ok(apiStart >= 0);
change(vault, 'session ownership loader contract', texts[vault].slice(apiStart, apiStart + '  var AlloDeviceVault = {'.length), '  var AlloDeviceVault = {\n    SESSION_OWNERSHIP_VERSION: 1,');
const vaultBytes = Buffer.from(initial.files.find(x => x.file === vault).crlf ? texts[vault].replace(/\n/g, '\r\n') : texts[vault]);
const vaultPin = sha(vaultBytes).slice(0, 8);
change(host, 'security module URL version', "  const securityModuleUrl = (fileName) => _isDesktopBundledApp\n    ? `./${fileName}?v=security-v2`\n    : `https://alloflow-cdn.pages.dev/${fileName}?v=security-v2`;", "  const securityModuleUrl = (fileName, version = 'security-v2') => _isDesktopBundledApp\n    ? `./${fileName}?v=${version}`\n    : `https://alloflow-cdn.pages.dev/${fileName}?v=${version}`;");
change(host, 'vault module content pin', "      securityModuleUrl('allo_device_vault_module.js'),", `      securityModuleUrl('allo_device_vault_module.js', '${vaultPin}'),`);
change(host, 'vault module contract check', "        return api && typeof api.createRecoveryVaultController === 'function' && typeof api.validateVaultStore === 'function' && typeof api.isVaultStore === 'function' ? api : null;", "        return api && api.SESSION_OWNERSHIP_VERSION === 1 && typeof api.createRecoveryVaultController === 'function' && typeof api.validateVaultStore === 'function' && typeof api.isVaultStore === 'function' ? api : null;");
change(host, 'vault module cache version', "      { cacheKey: 'allo-device-vault-v2', label: 'Recovery vault module' }", "      { cacheKey: 'allo-device-vault-v3-session', label: 'Recovery vault module' }");
const generator = require(path.join(root, '_build_first_wave_view_modules.js'));
for (const input of initial.inputs) assert.equal(sha(fs.readFileSync(path.join(root, input.file))), input.sha256, 'Generator and support inputs unchanged');
const runtime = generator.buildFirstWaveModule('HostHandlers', texts[source]);
const handlerPin = sha(Buffer.from(runtime)).slice(0, 8);
const previousPin = sha(fs.readFileSync(path.join(before, 'host_handlers_module.js'))).slice(0, 8);
change(host, 'HostHandlers content pin', 'host_handlers_module.js?v=' + previousPin, 'host_handlers_module.js?v=' + handlerPin);
const generated = { 'host_handlers_module.js': Buffer.from(runtime), 'desktop/web-app/public/host_handlers_module.js': Buffer.from(runtime), 'desktop/web-app/public/allo_device_vault_module.js': vaultBytes };
const records = initial.files.map(item => {
  const canonical = item.file.startsWith('desktop/web-app/src/') ? host : item.file;
  const raw = generated[item.file] || (texts[canonical] !== undefined ? Buffer.from(item.crlf ? texts[canonical].replace(/\n/g, '\r\n') : texts[canonical]) : fs.readFileSync(path.join(before, item.file)));
  const destination = path.join(out, item.file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, raw);
  return { file: item.file, beforeSha256: item.sha256, candidateSha256: sha(raw), changed: item.sha256 !== sha(raw), bytes: raw.length };
});
fs.writeFileSync(path.join(__dirname, 'operations.json'), JSON.stringify(operations, null, 2) + '\n');
const receipt = { preparedAt: new Date().toISOString(), files: records, inputs: initial.inputs, handlerPin, vaultPin, operationCount: operations.length };
fs.writeFileSync(path.join(__dirname, 'candidate.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ changed: records.filter(x => x.changed).length, operations: operations.length, handlerPin, vaultPin }));
