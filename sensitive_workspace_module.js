/* Protected clinical records. UI access codes are deliberately independent.
 * Persistence uses the existing authenticated-encryption vault and atomic
 * DeviceStorage repository. This module creates no shared clinical server.
 */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;
  var FEATURES = ['behavior-lens', 'dynamic-assessment', 'report-writer'];
  var META = 'clinical-setup';
  var KIND = 'alloflow-clinical-record-bucket';
  var BACKUP_KIND = 'alloflow-sensitive-workspace-backup';
  var DELETION_KIND = 'alloflow-clinical-deletion-tombstone';
  var sessionOwners = new WeakMap();
  var PREFIXES = {
    'behavior-lens': ['behaviorLens_', 'bl_', 'allo_behaviorlens_'],
    'dynamic-assessment': ['alloflow_dynamic_assessment_', 'alloflow_da_'],
    'report-writer': ['allo_rw_']
  };
  var clone = function (x) { return x == null ? x : JSON.parse(JSON.stringify(x)); };
  var own = function (x, k) { return Object.prototype.hasOwnProperty.call(x, k); };
  function failure(code, message) { var e = new Error(message); e.code = code; return e; }
  function aborted() { var e = failure('ALLOFLOW_PROTECTED_OPERATION_CANCELLED', 'The protected operation was cancelled.'); e.name = 'AbortError'; return e; }
  function checkFeature(feature) { if (FEATURES.indexOf(feature) < 0) throw failure('PROTECTED_FEATURE_INVALID', 'Unknown protected feature.'); }
  function matches(feature, key) { return PREFIXES[feature].some(function (p) { return key.indexOf(p) === 0; }); }
  function validData(data) {
    return data && typeof data === 'object' && !Array.isArray(data)
      && Object.keys(data).every(function (k) { return k.length > 0 && k.length <= 512 && typeof data[k] === 'string'; });
  }
  function validatePolicy(value) {
    if (value === undefined) return { allowCanvasRecords: false, allowExternalAi: [] };
    if (!value || value.version !== 1 || Object.keys(value).some(function (k) { return ['version', 'allowCanvasRecords', 'allowExternalAi'].indexOf(k) < 0; })
      || (own(value, 'allowCanvasRecords') && typeof value.allowCanvasRecords !== 'boolean')
      || (own(value, 'allowExternalAi') && (!Array.isArray(value.allowExternalAi) || value.allowExternalAi.some(function (f) { return FEATURES.indexOf(f) < 0; })))) return null;
    return { allowCanvasRecords: value.allowCanvasRecords === true, allowExternalAi: (value.allowExternalAi || []).slice() };
  }
  function isDeletionTombstone(value) {
    return !!value && value.kind === DELETION_KIND && value.version === 1
      && typeof value.deletedAt === 'string' && Number.isFinite(Date.parse(value.deletedAt))
      && Object.keys(value).every(function (k) { return ['kind', 'version', 'deletedAt', 'revision'].includes(k); });
  }
  function validateRetentionPolicy(value) {
    if (value === undefined) return { allowManualDeletion: true, legalHold: false };
    if (!value || typeof value !== 'object' || Array.isArray(value) || !own(value, 'version') || value.version !== 1 || Object.keys(value).some(function (k) { return !['version', 'allowManualDeletion', 'legalHold'].includes(k); })
      || (own(value, 'allowManualDeletion') && typeof value.allowManualDeletion !== 'boolean')
      || (own(value, 'legalHold') && typeof value.legalHold !== 'boolean')) return null;
    return { allowManualDeletion: value.allowManualDeletion !== false, legalHold: value.legalHold === true };
  }
  function requireDurableStorage(storage) {
    var s = storage && typeof storage.status === 'function' && storage.status();
    if (!s || !['direct', 'bridge-iframe', 'bridge-popup'].includes(s.backend) || s.connected !== true) throw failure('PROTECTED_STORAGE_NOT_DURABLE', 'Protected records need a connected, persistent device store. Existing records were preserved. Reconnect storage and retry.');
  }
  function createDurableRepository(storage, integration) {
    var raw = integration.createDeviceRepository(storage, { namespace: 'protected_clinical_records', key: 'store_v1', queue: false });
    return {
      async read() { requireDurableStorage(storage); var value = await raw.read(); requireDurableStorage(storage); return value; },
      async compareAndSwap(expected, next) { requireDurableStorage(storage); var value = await raw.compareAndSwap(expected, next); requireDurableStorage(storage); return value; }
    };
  }
  function createLegacyMirror(storage) {
    return {
      async read() { requireDurableStorage(storage); var value = await storage.get('ls_prefs', 'all'); requireDurableStorage(storage); return value == null ? null : clone(value); },
      async compareAndSwap(current, next) {
        requireDurableStorage(storage);
        var expected = current == null ? { mode: 'absent' } : Number.isSafeInteger(current.revision) && current.revision >= 1 ? current.revision : { mode: 'value', value: clone(current) };
        var result = await storage.compareAndSwap('ls_prefs', 'all', expected, next, { queue: false });
        requireDurableStorage(storage); return !!(result && result.applied === true);
      }
    };
  }
  function createService(options) {
    options = options || {};
    var repository = options.repository;
    var vaultModule = options.vaultModule;
    if (!repository || !vaultModule) throw failure('PROTECTED_DEPENDENCIES_MISSING', 'Protected storage has not loaded.');
    var listeners = new Set(), flushers = new Set(), capabilities = new WeakMap(), sessions = new Map();
    var maps = new Map(), stamps = new Map(), dirty = new Map(), transfers = new Map();
    var generation = 0, epoch = 0, keyActive = false, initialized = false, pendingSeed = null, activeWrite = null, ticket = 0, disposed = false;
    var staging = false, stagedStore = null, stagedRevision = 0, setupBaseRevision = null, setupBaseDeletedMarker = null, lockInFlight = null;
    var queue = Promise.resolve(), timer = null, credentialBusy = false, credentialCompletion = null, activeCredentialTicket = null, tick = 0, lastActivity = Date.now();
    var setupMeta = null, recoveryCode = '', verifiedBackup = null, idleTimer = null, idleSuspended = false, channel = null;
    var lifecycleListeners = [], viewCount = 0;
    var deletionPlan = null, deletionPlans = new WeakMap(), deletedMarker = null;
    var state = { phase: 'loading', enabled: false, pending: 0, error: '', idleMinutes: 0, recoveryEnabled: false, activeViews: 0 };
    var local = options.localStorage || null, sessionLocal = options.sessionStorage || null;
    var now = typeof options.now === 'function' ? options.now : Date.now;
    function date() { tick = Math.max(tick + 1, Number(now())); return new Date(tick).toISOString(); }
    function notify() {
      state.pending = dirty.size; listeners.forEach(function (fn) { try { fn(status()); } catch (_) {} });
      if (options.lifecycle !== false && root.dispatchEvent && root.Event) root.dispatchEvent(new root.Event('alloflow:sensitive-workspace-status'));
    }
    function status() { return Object.assign({}, state, { epoch: epoch, setupRecoveryCode: state.phase === 'setup' ? recoveryCode : '' }); }
    function discardDeletionReview() { if (deletionPlan) deletionPlans.delete(deletionPlan); deletionPlan = null; state.deletionReview = null; }
    function context() { return typeof options.getContext === 'function' ? options.getContext() || {} : {}; }
    function policy() { return validatePolicy(typeof options.getPolicy === 'function' ? options.getPolicy() : options.policy); }
    function checkDeletionAllowed() {
      checkLocal();
      var p = validateRetentionPolicy(typeof options.getRetentionPolicy === 'function' ? options.getRetentionPolicy() : options.retentionPolicy);
      if (!p || !p.allowManualDeletion || p.legalHold) throw failure('PROTECTED_DELETION_HELD', 'Manual clinical-record deletion is blocked by the deployment retention policy or a legal hold. Contact the records owner.');
    }
    function checkLocal() {
      var p = policy(), c = context();
      if (!p || c.learner === true) throw failure('PROTECTED_CONTEXT_BLOCKED', 'Student access does not open protected staff records.');
      if (c.isCanvas === true && !p.allowCanvasRecords) throw failure('PROTECTED_CANVAS_NOT_APPROVED', 'This Canvas deployment is not configured for real student records. Use the examples or a school-approved deployment.');
    }
    function stamp(store, id) { var r = store && Array.isArray(store.records) && store.records.find(function (x) { return x.id === id; }); return r ? r.savedAt : null; }
    function checkTicket(expected) { if (disposed || expected !== ticket) throw aborted(); }
    function checkCredential() { if (activeCredentialTicket != null) checkTicket(activeCredentialTicket); else if (disposed) throw aborted(); }
    var guardedRepository = {
      async read() { checkCredential(); if (staging) return { revision: stagedRevision, store: clone(stagedStore || pendingSeed) }; var value = await repository.read(); checkCredential(); return value; },
      async compareAndSwap(revision, next) {
        checkCredential();
        if (activeWrite) {
          var current = staging ? await guardedRepository.read() : await repository.read();
          checkCredential();
          if (stamp(current.store, activeWrite) !== (stamps.get(activeWrite) || null)) throw failure('PROTECTED_CONFLICT', 'Another window changed these records. Keep this window open and preserve its work before reopening.');
        }
        if (staging) { if (revision !== stagedRevision) return false; stagedStore = clone(next); stagedRevision++; return true; }
        var applied = await repository.compareAndSwap(revision, next); checkCredential(); return applied;
      }
    };
    var controller = vaultModule.createRecoveryVaultController({ repository: guardedRepository, crypto: options.crypto, cryptoOptions: options.cryptoOptions, now: function () { return new Date(Number(now())); } });
    function snapshot(id, data) { return { id: id, kind: KIND, version: 1, title: 'Protected clinical records', createdAt: date(), savedAt: date(), pinned: true, data: clone(data) }; }
    function decodePlain(plain) {
      var result = new Map(), meta = null;
      (plain.snapshots || []).forEach(function (s) {
        if (s.kind !== KIND || s.version !== 1 || (FEATURES.indexOf(s.id) < 0 && s.id !== META)) throw failure('PROTECTED_BACKUP_INVALID', 'This backup is not a protected clinical workspace.');
        if (s.id === META) meta = clone(s.data);
        else { if (!validData(s.data)) throw failure('PROTECTED_BACKUP_INVALID', 'The protected records have an invalid format.'); result.set(s.id, Object.assign(Object.create(null), s.data)); }
      });
      if (!meta || meta.version !== 1 || !Array.isArray(meta.migrationPlan) || ![true, false].includes(meta.ready)) throw failure('PROTECTED_BACKUP_INVALID', 'The protected setup record is missing or invalid.');
      meta.migrationPlan.forEach(function (p) { if (!p || FEATURES.indexOf(p.feature) < 0 || !['local', 'session', 'prefs'].includes(p.source) || typeof p.key !== 'string' || !matches(p.feature, p.key) || (p.storedKey != null && typeof p.storedKey !== 'string')) throw failure('PROTECTED_BACKUP_INVALID', 'The migration record is invalid.'); });
      if (meta.archives != null && (!Array.isArray(meta.archives) || meta.archives.some(function (p) { return !p || FEATURES.indexOf(p.feature) < 0 || typeof p.key !== 'string' || typeof p.storedKey !== 'string' || !['local', 'session', 'prefs'].includes(p.source); }))) throw failure('PROTECTED_BACKUP_INVALID', 'The preserved-copy record is invalid.');
      FEATURES.forEach(function (f) { if (!result.has(f)) result.set(f, Object.create(null)); });
      return { maps: result, meta: meta };
    }
    async function hydrate(expectedTicket) {
      var decoded = decodePlain(await controller.readPlainStore());
      var head = await guardedRepository.read();
      var v = await controller.getStatus();
      if (disposed || expectedTicket !== ticket) { controller.lock(); throw aborted(); }
      try { checkLocal(); } catch (error) { controller.lock(); throw error; }
      maps = decoded.maps; setupMeta = decoded.meta; stamps.clear();
      (head.store.records || []).forEach(function (r) { stamps.set(r.id, r.savedAt); tick = Math.max(tick, Date.parse(r.savedAt) || 0); });
      keyActive = true; generation++; epoch++; sessions.clear(); dirty.clear();
      discardDeletionReview(); deletedMarker = null;
      state.enabled = true; state.recoveryEnabled = v.recoveryEnabled === true;
      state.idleMinutes = [0, 5, 15, 30].includes(setupMeta.idleMinutes) ? setupMeta.idleMinutes : 0;
      state.phase = setupMeta.ready && state.recoveryEnabled ? 'ready' : 'setup'; state.error = ''; lastActivity = Number(now()); notify();
    }
    async function init() {
      if (disposed) throw aborted();
      if (initialized) return status();
      var head = await repository.read();
      if (disposed) throw aborted();
      if (head.store != null && !vaultModule.isVaultStore(head.store) && !isDeletionTombstone(head.store)) throw failure('PROTECTED_STORE_INVALID', 'Protected storage is damaged or unsupported. Existing data has been preserved.');
      state.enabled = vaultModule.isVaultStore(head.store); state.phase = state.enabled ? 'locked' : 'new'; initialized = true;
      if (isDeletionTombstone(head.store)) { deletedMarker = head.store.deletedAt; state.deletedAt = deletedMarker; }
      notify(); return status();
    }
    async function scanLegacy() {
      var buckets = new Map(), plan = [], archives = [];
      FEATURES.forEach(function (f) { buckets.set(f, Object.create(null)); });
      function preserve(k, value, source) {
        var f = FEATURES.find(function (feature) { return matches(feature, k); }); if (!f || typeof value !== 'string') return;
        var storedKey = k, data = buckets.get(f);
        if (own(data, k) && data[k] !== value) {
          storedKey = '__protected_migration_archive_' + archives.length;
          archives.push({ feature: f, source: source, key: k, storedKey: storedKey });
        }
        data[storedKey] = value; plan.push({ feature: f, source: source, key: k, storedKey: storedKey });
      }
      [[local, 'local'], [sessionLocal, 'session']].forEach(function (pair) {
        var store = pair[0]; if (!store) return;
        for (var i = 0; i < store.length; i++) {
          var k = store.key(i); if (typeof k !== 'string') continue;
          var value = store.getItem(k); if (value == null) continue;
          preserve(k, value, pair[1]);
        }
      });
      if (options.legacyMirror) { var mirror = await options.legacyMirror.read(); Object.keys(mirror || {}).forEach(function (k) { preserve(k, mirror[k], 'prefs'); }); }
      return { buckets: buckets, plan: plan, archives: archives };
    }
    async function credentialAction(fn) {
      if (disposed) throw aborted();
      if (credentialBusy || state.phase === 'locking') throw failure('PROTECTED_BUSY', 'Another protected operation is still running.');
      credentialBusy = true; var started = ++ticket; activeCredentialTicket = started;
      var finishCredential; credentialCompletion = new Promise(function (resolve) { finishCredential = resolve; });
      try { var value = await fn(started); if (disposed || started !== ticket) throw aborted(); return value; }
      finally { try { if (!disposed && started !== ticket) { initialized = false; await init(); } } finally { credentialBusy = false; activeCredentialTicket = null; finishCredential(); credentialCompletion = null; } }
    }
    function checkPassword(password) { if (typeof password !== 'string' || password.length < 10) throw failure('PROTECTED_PASSWORD_REQUIRED', 'Use a password or passphrase of at least 10 characters.'); }
    async function setup(password, idleMinutes) {
      return credentialAction(async function (started) {
        checkLocal(); checkPassword(password); await init();
        if (state.enabled) throw failure('PROTECTED_ALREADY_ENABLED', 'Unlock the existing workspace instead of replacing it.');
        var realHead = await repository.read();
        if (realHead.store != null && !isDeletionTombstone(realHead.store)) throw failure('PROTECTED_CONFLICT', 'Another window created protected records. Reopen protection before continuing.');
        var legacy = await scanLegacy(); if (started !== ticket || disposed) throw aborted(); setupBaseRevision = clone(realHead.revision); setupBaseDeletedMarker = isDeletionTombstone(realHead.store) ? realHead.store.deletedAt : null; staging = true; stagedStore = null; stagedRevision = 0;
        setupMeta = { version: 1, ready: false, migrationPlan: legacy.plan, archives: legacy.archives, idleMinutes: [0, 5, 15, 30].includes(idleMinutes) ? idleMinutes : 0 };
        pendingSeed = vaultModule.emptyPlainStore();
        pendingSeed.snapshots = FEATURES.map(function (f) { return snapshot(f, legacy.buckets.get(f)); }).concat(snapshot(META, setupMeta));
        try {
          var created = await controller.enableProtection(password, { createRecoveryKey: true });
          if (started !== ticket || disposed) throw aborted();
          recoveryCode = created.recoveryCode || ''; verifiedBackup = null; await hydrate(started); return status();
        } finally { pendingSeed = null; }
      });
    }
    async function unlock(password) {
      return credentialAction(async function (started) { checkLocal(); await init(); if (state.phase !== 'locked') throw failure('PROTECTED_LOCK_REQUIRED', 'Save and lock the current workspace before unlocking another copy.'); await controller.unlock(password); await hydrate(started); recoveryCode = ''; verifiedBackup = null; return status(); });
    }
    async function renewRecovery() {
      return credentialAction(async function (started) {
      if (!keyActive || state.phase !== 'setup') throw failure('PROTECTED_SETUP_REQUIRED', 'Unlock the pending setup first.');
      var result = await controller.rotateRecoveryKey(); checkTicket(started); recoveryCode = result.recoveryCode; verifiedBackup = null; state.recoveryEnabled = true; notify(); return recoveryCode;
      });
    }
    async function write(id, data) {
      activeWrite = id;
      try {
        var s = snapshot(id, data), result = await controller.upsertSnapshot(s);
        if (!result.saved) throw failure('PROTECTED_CONFLICT', 'The protected record changed before it could be saved.');
        stamps.set(id, stamp(result.store, id)); return result;
      } finally { activeWrite = null; }
    }
    function cancelTimer() { if (timer != null) { clearTimeout(timer); timer = null; } }
    function flush() {
      cancelTimer();
      queue = queue.catch(function () {}).then(async function () {
        if (!keyActive) { if (dirty.size) throw failure('PROTECTED_LOCKED', 'Unlock protected records before saving.'); return; }
        try {
          while (dirty.size) {
            var entry = dirty.entries().next().value, f = entry[0], version = entry[1];
            await write(f, maps.get(f));
            if (dirty.get(f) === version) dirty.delete(f);
          }
          state.error = ''; notify();
        } catch (error) {
          if (deletedMarker && !keyActive) throw aborted();
          state.error = error && error.code === 'PROTECTED_CONFLICT' ? error.message : 'Protected records could not be saved. Keep this window open and retry; work remains unlocked.';
          idleSuspended = true; notify(); throw failure(error.code || 'PROTECTED_SAVE_FAILED', state.error);
        }
      });
      return queue;
    }
    function changed(f) { dirty.set(f, (dirty.get(f) || 0) + 1); verifiedBackup = null; cancelTimer(); timer = setTimeout(function () { timer = null; flush().catch(function () {}); }, options.saveDelayMs == null ? 150 : options.saveDelayMs); notify(); }
    function isSession(s, feature) { try { checkLocal(); var capability = capabilities.get(s); return !!capability && capability.generation === generation && keyActive && state.phase === 'ready' && (!feature || capability.feature === feature); } catch (_) { return false; } }
    function getSession(feature) {
      checkFeature(feature); checkLocal();
      if (!keyActive || state.phase !== 'ready') throw failure('PROTECTED_LOCKED', 'Unlock the protected workspace first.');
      if (sessions.has(feature)) return sessions.get(feature);
      var born = generation;
      function access() { if (!keyActive || born !== generation || !['ready', 'locking'].includes(state.phase)) throw failure('PROTECTED_LOCKED', 'This protected workspace is locked.'); if (state.phase === 'ready') checkLocal(); }
      function current() { if (!isSession(s)) throw aborted(); checkLocal(); }
      var storage = {
        getItem: function (key) { access(); var data = maps.get(feature); return own(data, String(key)) ? data[String(key)] : null; },
        setItem: function (key, value) { access(); key = String(key); value = String(value); if (!key || key.length > 512) throw failure('PROTECTED_KEY_INVALID', 'The record key is invalid.'); var data = maps.get(feature); if (own(data, key) && data[key] === value) return; data[key] = value; changed(feature); },
        removeItem: function (key) { access(); var data = maps.get(feature); key = String(key); if (own(data, key)) { delete data[key]; changed(feature); } },
        clear: function () { access(); if (Object.keys(maps.get(feature)).length) { maps.set(feature, Object.create(null)); changed(feature); } },
        key: function (i) { access(); return Object.keys(maps.get(feature))[Number(i)] || null; },
        flush: flush
      };
      Object.defineProperty(storage, 'length', { get: function () { access(); return Object.keys(maps.get(feature)).length; } });
      var s = {
        feature: feature, isProtected: true, _generation: born, storage: storage, sessionStorage: storage,
        captureEpoch: function () { current(); return epoch; },
        isCurrent: function (captured) { try { return captured === epoch && isSession(s) && (checkLocal(), true); } catch (_) { return false; } },
        assertCurrent: function (captured) { if (!s.isCurrent(captured)) throw aborted(); },
        assertCanTransmit: function (purpose) { current(); var p = policy(); if (purpose !== 'ai' || !p || p.allowExternalAi.indexOf(feature) < 0) throw failure('PROTECTED_REMOTE_NOT_APPROVED', 'Sending protected records to AI is disabled. Your school must approve and configure this connection.'); },
        assertCanExport: function (kind) { current(); if (kind === 'encrypted-backup') return; var confirm = options.confirmExport || (root.confirm && root.confirm.bind(root)); if (!confirm || !confirm('This creates a readable copy of protected clinical information. Save or share it only in a school-approved location. Continue?')) throw aborted(); current(); },
        registerFlush: function (fn) { current(); if (typeof fn !== 'function') throw new TypeError('A flush callback is required.'); flushers.add(fn); return function () { flushers.delete(fn); }; },
        flush: flush,
        transfer: function (to, payload) { current(); checkFeature(to); transfers.set(to, { source: feature, payload: clone(payload) }); notify(); },
        consumeTransfer: function (source) { current(); var item = transfers.get(feature); if (!item || (source && source !== item.source)) return null; transfers.delete(feature); return clone(item.payload); }
      };
      s.getPreservedCopies = function () { current(); return clone((setupMeta.archives || []).filter(function (p) { return p.feature === feature; })); };
      s.exportPreservedCopy = function (storedKey) { s.assertCanExport('preserved-copy'); var p = (setupMeta.archives || []).find(function (a) { return a.feature === feature && a.storedKey === storedKey; }); if (!p || !own(maps.get(feature), p.storedKey)) throw failure('PROTECTED_ARCHIVE_MISSING', 'This preserved copy is unavailable.'); return { kind: 'alloflow-preserved-clinical-copy', version: 1, source: p.source, key: p.key, value: maps.get(feature)[p.storedKey] }; };
      capabilities.set(s, { generation: born, feature: feature }); sessions.set(feature, s); sessionOwners.set(s, { isSession: isSession }); return s;
    }
    async function stage(reason, forLock) {
      var callbacks = Array.from(flushers);
      for (var i = 0; i < callbacks.length; i++) await callbacks[i]({ reason: reason, forLock: forLock === true });
    }
    function forgetDeleted(marker, external) {
      if (external) ticket++;
      cancelTimer(); controller.lock(); keyActive = false; generation++; epoch++;
      maps.clear(); stamps.clear(); dirty.clear(); sessions.clear(); flushers.clear(); transfers.clear();
      recoveryCode = ''; verifiedBackup = null; pendingSeed = null; stagedStore = null; staging = false; setupBaseDeletedMarker = null;
      discardDeletionReview(); setupMeta = null; deletedMarker = marker;
      state.phase = 'new'; state.enabled = false; state.recoveryEnabled = false; state.idleMinutes = 0; state.deletedAt = marker; state.error = ''; initialized = true; notify();
    }
    async function verifyDeletedMessage(marker) {
      if (typeof marker !== 'string' || !Number.isFinite(Date.parse(marker))) return false;
      if (marker === deletedMarker || (staging && marker === setupBaseDeletedMarker)) return false;
      var expectedTicket = ticket, expectedGeneration = generation;
      var head = await repository.read();
      if (disposed || expectedTicket !== ticket || expectedGeneration !== generation || (staging && marker === setupBaseDeletedMarker)) return false;
      if (!isDeletionTombstone(head.store) || head.store.deletedAt !== marker) return false;
      forgetDeleted(marker, true); initialized = false; await init(); return true;
    }
    async function prepareDeletion() {
      return credentialAction(async function (started) {
        checkDeletionAllowed();
        if (!keyActive || state.phase !== 'ready') throw failure('PROTECTED_LOCKED', 'Unlock protected clinical records before reviewing deletion.');
        state.phase = 'locking'; epoch++; discardDeletionReview(); notify();
        try {
          await stage('deletion-review', true); checkTicket(started); await flush(); checkTicket(started);
          checkDeletionAllowed();
          if ((await scanLegacy()).plan.length) throw failure('PROTECTED_DELETION_LEGACY_PRESENT', 'Readable clinical copies from an older window are present. Preserve and migrate those copies before deleting this encrypted store.');
          var head = await repository.read(); checkTicket(started); checkDeletionAllowed();
          if (!vaultModule.isVaultStore(head.store) || head.store.records.some(function (r) { return !FEATURES.concat(META).includes(r.id); })
            || FEATURES.concat(META).some(function (f) { return stamp(head.store, f) !== (stamps.get(f) || null); })) throw failure('PROTECTED_CONFLICT', 'Another window changed protected records, or this store contains an unknown record type. Review its work before preparing deletion again.');
          var summaries = FEATURES.map(function (f) { return Object.freeze({ feature: f, storedKeys: Object.keys(maps.get(f)).length, preservedCopies: (setupMeta.archives || []).filter(function (a) { return a.feature === f; }).length }); });
          var plan = Object.freeze({ kind: 'alloflow-clinical-deletion-review', version: 1, scope: 'all-protected-clinical-records-on-this-device', features: Object.freeze(summaries), pendingTransfers: transfers.size, reviewedAt: date() });
          generation++; epoch++; sessions.clear(); flushers.clear();
          deletionPlans.set(plan, { head: clone(head), generation: generation, epoch: epoch }); deletionPlan = plan;
          state.deletionReview = plan; state.phase = 'deletion-review'; state.error = ''; lastActivity = Number(now()); notify(); return plan;
        } catch (error) {
          if (disposed || started !== ticket) throw aborted();
          state.phase = 'ready'; state.error = error.code === 'PROTECTED_UNSAVED_SESSION' ? error.message : 'Deletion review did not complete. Protected work remains available; resolve the reported storage or copy conflict before retrying.';
          idleSuspended = true; notify(); throw error;
        }
      });
    }
    function cancelDeletion() {
      if (state.phase !== 'deletion-review') throw failure('PROTECTED_DELETION_REVIEW_REQUIRED', 'Open a deletion review first.');
      discardDeletionReview(); epoch++; state.phase = 'ready'; state.error = ''; notify(); return status();
    }
    async function finishVerifiedDeletion(plan, marker, started) {
      var legacyAbsent = false;
      try { legacyAbsent = (await scanLegacy()).plan.length === 0; } catch (_) {}
      checkTicket(started);
      forgetDeleted(marker, false);
      if (!legacyAbsent) { state.error = 'The encrypted clinical store was deleted, but readable copies appeared or could not be checked. Those copies were not removed; review older windows and connected storage separately.'; notify(); }
      if (channel) { try { channel.postMessage({ kind: 'deleted', marker: marker }); } catch (_) {} }
      return { kind: 'alloflow-clinical-deletion-receipt', version: 1, scope: plan.scope, deletedAt: marker, connectedStoreVerified: true, knownLegacyCopiesAbsent: legacyAbsent, backupsAndOtherCopiesExcluded: true };
    }
    async function reconcileDeletion() {
      return credentialAction(async function (started) {
        checkLocal(); var plan = deletionPlan, review = plan && deletionPlans.get(plan);
        if (!review || !keyActive || state.phase !== 'deletion-unverified') throw failure('PROTECTED_DELETION_REVIEW_REQUIRED', 'There is no uncertain deletion to check.');
        var head = await repository.read(); checkTicket(started);
        if (isDeletionTombstone(head.store)) return finishVerifiedDeletion(plan, head.store.deletedAt, started);
        if (JSON.stringify(head) === JSON.stringify(review.head)) {
          review.attemptedMarker = null; state.phase = 'deletion-review'; state.error = 'The reviewed encrypted store is unchanged. No deletion is currently observed; you may cancel this review or try again.'; notify(); return { reconciled: true, deleted: false };
        }
        throw failure('PROTECTED_DELETION_STATE_CHANGED', 'The connected store changed. This paused copy cannot resume saving. Keep it secure, or lock without resaving before reopening the current records.');
      });
    }
    async function deleteClinicalRecords(plan, input) {
      return credentialAction(async function (started) {
        checkDeletionAllowed(); var review = plan && deletionPlans.get(plan);
        if (!review || plan !== deletionPlan || !keyActive || state.phase !== 'deletion-review' || review.generation !== generation || review.epoch !== epoch) throw failure('PROTECTED_DELETION_REVIEW_REQUIRED', 'Prepare a current deletion review before continuing.');
        if (!input || input.phrase !== 'DELETE PROTECTED RECORDS' || input.retentionApproved !== true || input.holdsReviewed !== true || input.otherClinicalWindowsClosed !== true) throw failure('PROTECTED_DELETION_CONFIRM_REQUIRED', 'Review the scope, retention requirements, holds and other clinical windows, then type the deletion phrase.');
        if (typeof input.password !== 'string' || !input.password) throw failure('PROTECTED_PASSWORD_REQUIRED', 'Re-enter the saved-records password before deleting clinical records.');
        state.phase = 'deleting'; state.error = ''; notify();
        var commitAttempted = false, verifier = vaultModule.createRecoveryVaultController({ crypto: options.crypto, cryptoOptions: options.cryptoOptions, repository: {
          async read() { return clone(review.head); }, async compareAndSwap() { return false; }
        } });
        try {
          await verifier.unlock(input.password); decodePlain(await verifier.readPlainStore()); checkTicket(started); checkDeletionAllowed();
          if ((await scanLegacy()).plan.length) throw failure('PROTECTED_DELETION_LEGACY_PRESENT', 'An older window created readable clinical copies after review. Those copies were preserved; cancel and review them before deletion.');
          var head = await repository.read(); checkTicket(started); checkDeletionAllowed();
          if (JSON.stringify(head) !== JSON.stringify(review.head)) { commitAttempted = true; throw failure('PROTECTED_CONFLICT', 'Protected records changed after deletion review. Recheck the connected store before continuing.'); }
          var marker = date(), next = { kind: DELETION_KIND, version: 1, deletedAt: marker };
          commitAttempted = true; review.attemptedMarker = marker;
          if (!(await repository.compareAndSwap(review.head.revision, next))) throw failure('PROTECTED_CONFLICT', 'Protected records changed before deletion could be committed. Existing work was preserved.');
          checkTicket(started);
          var confirmed = await repository.read(); checkTicket(started);
          if (!isDeletionTombstone(confirmed.store) || confirmed.store.deletedAt !== marker) throw failure('PROTECTED_DELETION_UNVERIFIED', 'The deletion could not be verified. Keep this window secure and reconnect storage before reviewing its state.');
          return finishVerifiedDeletion(plan, marker, started);
        } catch (error) {
          if (disposed || started !== ticket) throw aborted();
          state.phase = commitAttempted ? 'deletion-unverified' : 'deletion-review';
          state.error = commitAttempted ? 'Deletion was not verified. This copy is paused and cannot resume saving until the connected store is checked. Keep this window secure and reconnect storage.' : 'Deletion did not proceed. Saved clinical work and this review remain available.';
          notify(); throw error;
        } finally { verifier.lock(); }
      });
    }
    function lock(reason) {
      if (lockInFlight) return lockInFlight;
      lockInFlight = performLock(reason).finally(function () { lockInFlight = null; }); return lockInFlight;
    }
    async function performLock(reason) {
      if (disposed) throw aborted();
      // A deletion review is already staging the real editors. Let that save
      // settle before locking; cancelling it mid-flush could strand its draft.
      if (credentialBusy && state.phase === 'locking' && credentialCompletion) await credentialCompletion;
      if (disposed) throw aborted();
      ticket++; var lockTicket = ticket;
      discardDeletionReview();
      if (channel && reason !== 'other-window') { try { channel.postMessage({ kind: 'lock' }); } catch (_) {} }
      if (!keyActive) { controller.lock(); epoch++; recoveryCode = ''; verifiedBackup = null; staging = false; stagedStore = null; pendingSeed = null; initialized = false; await init(); return status(); }
      if (state.phase === 'locking') return queue.then(status, status);
      if (state.phase !== 'ready') {
        controller.lock(); keyActive = false; generation++; epoch++; maps.clear(); transfers.clear(); setupMeta = null; recoveryCode = ''; verifiedBackup = null;
        staging = false; stagedStore = null; pendingSeed = null; initialized = false; await init(); return status();
      }
      state.phase = 'locking'; epoch++; notify();
      try {
        await stage(reason || 'manual', true);
        checkTicket(lockTicket);
        if (disposed) throw aborted();
        await flush();
        checkTicket(lockTicket);
        if (disposed) throw aborted();
        controller.lock(); keyActive = false; generation++; sessions.clear(); maps.clear(); transfers.clear(); flushers.clear(); setupMeta = null; recoveryCode = ''; verifiedBackup = null;
        state.phase = 'locked'; state.error = ''; notify(); return status();
      } catch (error) {
        if (disposed) throw aborted();
        if (deletedMarker && !keyActive) return status();
        state.phase = 'ready'; state.error = error && error.code === 'PROTECTED_UNSAVED_SESSION' ? error.message : 'Protected work could not be saved, so this window remains unlocked. Keep it open and retry.';
        idleSuspended = true; notify(); throw failure(error.code || 'PROTECTED_LOCK_SAVE_FAILED', state.error);
      }
    }
    async function verifyBackup(backup, secret, useRecovery) {
      if (!backup || backup.kind !== BACKUP_KIND || backup.version !== 1 || !backup.vaultBackup) throw failure('PROTECTED_BACKUP_INVALID', 'Choose an encrypted protected-records backup.');
      var memory = null, rev = 0;
      var verifier = vaultModule.createRecoveryVaultController({ crypto: options.crypto, cryptoOptions: options.cryptoOptions, repository: {
        async read() { return { revision: rev, store: clone(memory) }; },
        async compareAndSwap(expected, next) { if (expected !== rev) return false; memory = clone(next); rev++; return true; }
      } });
      try { await verifier.importEncryptedBackup(backup.vaultBackup, secret, { useRecoveryKey: useRecovery === true, newPassword: secret, replace: true }); return decodePlain(await verifier.readPlainStore()); }
      finally { verifier.lock(); memory = null; }
    }
    async function backup() {
      var backupTicket = ticket, backupEpoch = epoch;
      if (keyActive && state.phase === 'ready') { await stage('backup', false); await flush(); }
      checkTicket(backupTicket); if (epoch !== backupEpoch) throw aborted();
      var out = { kind: BACKUP_KIND, version: 1, exportedAt: date(), vaultBackup: await controller.exportEncryptedBackup() };
      checkTicket(backupTicket); if (epoch !== backupEpoch) throw aborted();
      if (state.phase === 'setup') {
        if (!recoveryCode) throw failure('PROTECTED_RECOVERY_REQUIRED', 'Create a new recovery key to finish setup.');
        var verified = await verifyBackup(out, recoveryCode, true);
        checkTicket(backupTicket); if (epoch !== backupEpoch) throw aborted();
        FEATURES.forEach(function (f) { if (JSON.stringify(verified.maps.get(f)) !== JSON.stringify(maps.get(f))) throw failure('PROTECTED_BACKUP_INVALID', 'Backup verification failed. Existing records were preserved.'); });
        verifiedBackup = JSON.stringify(out.vaultBackup.vault);
      }
      return out;
    }
    async function finishSetup(input) {
      return credentialAction(async function (started) {
      if (state.phase !== 'setup' || !keyActive || !recoveryCode || !input || input.backupSaved !== true || !controller.confirmRecoveryCode(recoveryCode, input.recoveryInput)) throw failure('PROTECTED_RECOVERY_CONFIRM_REQUIRED', 'Save the encrypted backup and confirm your recovery key before continuing.');
      var current = await controller.exportEncryptedBackup();
      checkTicket(started);
      if (!verifiedBackup || JSON.stringify(current.vault) !== verifiedBackup) throw failure('PROTECTED_BACKUP_REQUIRED', 'Download and verify a current encrypted backup first.');
      function originalValue(p) { return maps.get(p.feature)[p.storedKey || p.key]; }
      function verifySource(source, values) {
        Object.keys(values).forEach(function (k) {
          if (!FEATURES.some(function (f) { return matches(f, k); }) || values[k] == null) return;
          var p = setupMeta.migrationPlan.find(function (entry) { return entry.source === source && entry.key === k; });
          if (!p || values[k] !== originalValue(p)) throw failure('PROTECTED_LEGACY_CONFLICT', 'An older window changed a clinical record. Close older windows and preserve their work before trying migration again.');
        });
      }
      function browserValues(store) { var values = Object.create(null); if (store) for (var i = 0; i < store.length; i++) { var k = store.key(i); if (typeof k === 'string') values[k] = store.getItem(k); } return values; }
      verifySource('local', browserValues(local)); verifySource('session', browserValues(sessionLocal));
      if (options.legacyMirror) verifySource('prefs', await options.legacyMirror.read() || {});
      checkTicket(started);
      if (staging) {
        // Setup is staged only in memory until a verified backup and offline
        // recovery key have been acknowledged. Cancel leaves legacy work alone.
        var head = await repository.read(), copy = isDeletionTombstone(head.store) ? null : clone(head.store);
        checkTicket(started);
        if (copy) delete copy.revision;
        if (copy && JSON.stringify(copy) !== JSON.stringify(stagedStore)) throw failure('PROTECTED_CONFLICT', 'Another window changed protected storage. Existing records were preserved.');
        if (!copy && !(await repository.compareAndSwap(setupBaseRevision, stagedStore))) throw failure('PROTECTED_CONFLICT', 'Protected storage changed before setup could be saved. Existing records were preserved.');
        checkTicket(started);
        staging = false; stagedStore = null; setupBaseDeletedMarker = null;
      }
      // Remove only exact verified originals. A cleanup failure keeps setup
      // incomplete and the verified encrypted copy available for recovery.
      if (options.legacyMirror) {
        var cleaned = false;
        for (var attempt = 0; attempt < 5 && !cleaned; attempt++) {
          var mirrored = await options.legacyMirror.read(); checkTicket(started); verifySource('prefs', mirrored || {});
          var nextMirror = clone(mirrored || {}), removed = false;
          setupMeta.migrationPlan.filter(function (p) { return p.source === 'prefs'; }).forEach(function (p) { if (own(nextMirror, p.key)) { delete nextMirror[p.key]; removed = true; } });
          if (!removed) { cleaned = true; break; }
          await repository.read(); checkTicket(started);
          cleaned = await options.legacyMirror.compareAndSwap(mirrored, nextMirror); checkTicket(started);
        }
        if (!cleaned) throw failure('PROTECTED_LEGACY_CONFLICT', 'The preferences backup changed during migration. Existing records were preserved; close older windows and retry.');
      }
      for (var p of setupMeta.migrationPlan) {
        if (p.source === 'prefs') continue;
        await repository.read(); checkTicket(started);
        var store = p.source === 'local' ? local : sessionLocal;
        if (!store) throw failure('PROTECTED_LEGACY_UNAVAILABLE', 'Original browser storage is unavailable. Existing records were preserved.');
        var present = store.getItem(p.key);
        if (present != null && present !== originalValue(p)) throw failure('PROTECTED_LEGACY_CONFLICT', 'An older window changed a clinical record. Its readable copy was preserved.');
        if (present != null) { store.removeItem(p.key); if (store.getItem(p.key) != null) throw failure('PROTECTED_CLEANUP_FAILED', 'A readable browser copy could not be removed. Setup remains incomplete.'); }
      }
      verifySource('local', browserValues(local)); verifySource('session', browserValues(sessionLocal));
      if (options.legacyMirror) verifySource('prefs', await options.legacyMirror.read() || {});
      checkTicket(started);
      var completed = Object.assign({}, setupMeta, { ready: true, migrationPlan: [] });
      await write(META, completed); checkTicket(started); setupMeta = completed; recoveryCode = ''; verifiedBackup = null; state.phase = 'ready'; state.error = ''; notify(); return status();
      });
    }
    async function recover(code, password) {
      return credentialAction(async function (started) { checkLocal(); checkPassword(password); await init(); if (state.phase !== 'locked') throw failure('PROTECTED_LOCK_REQUIRED', 'Save and lock the current workspace before recovering another copy.'); await controller.recoverWithKey(code, password); await hydrate(started); recoveryCode = ''; verifiedBackup = null; return status(); });
    }
    async function restore(backupValue, secret, recovery, newPassword) {
      return credentialAction(async function (started) {
        checkLocal(); await init(); var h = await repository.read();
        if ((h.store != null && !isDeletionTombstone(h.store)) || (await scanLegacy()).plan.length) throw failure('PROTECTED_RESTORE_WOULD_REPLACE', 'Restore into a clean browser profile to preserve this device\'s existing records.');
        await verifyBackup(backupValue, secret, recovery);
        if (recovery) checkPassword(newPassword);
        await controller.importEncryptedBackup(backupValue.vaultBackup, secret, { useRecoveryKey: recovery === true, newPassword: newPassword, replace: false });
        await hydrate(started); recoveryCode = ''; verifiedBackup = null; return status();
      });
    }
    function touch() { lastActivity = Number(now()); }
    function dispose() {
      disposed = true; ticket++; cancelTimer(); if (idleTimer) clearInterval(idleTimer);
      lifecycleListeners.forEach(function (entry) { root.removeEventListener(entry[0], entry[1]); }); lifecycleListeners = [];
      if (channel) channel.close(); channel = null;
      controller.lock(); keyActive = false; generation++; epoch++; maps.clear(); transfers.clear(); setupMeta = null; recoveryCode = ''; stagedStore = null; pendingSeed = null; staging = false; setupBaseDeletedMarker = null; listeners.clear(); flushers.clear(); discardDeletionReview();
    }
    if (options.lifecycle !== false && root.addEventListener) {
      function listen(name, fn) { root.addEventListener(name, fn, { passive: name !== 'beforeunload' }); lifecycleListeners.push([name, fn]); }
      ['pointerdown', 'keydown', 'focus'].forEach(function (name) { listen(name, touch); });
      listen('beforeunload', function (e) { if (keyActive && (dirty.size || flushers.size)) { e.preventDefault(); e.returnValue = ''; } });
      if (typeof root.BroadcastChannel === 'function') {
        channel = new root.BroadcastChannel('alloflow-protected-clinical-records-v1');
        channel.onmessage = function (event) {
          if (event && event.data && event.data.kind === 'lock') lock('other-window').catch(function () {});
          if (event && event.data && event.data.kind === 'deleted') verifyDeletedMessage(event.data.marker).catch(function () {});
        };
      }
      idleTimer = setInterval(function () { if (['ready', 'deletion-review', 'deletion-unverified'].includes(state.phase) && !idleSuspended && state.idleMinutes && Number(now()) - lastActivity >= state.idleMinutes * 60000) lock('idle').catch(function () {}); }, 15000);
    }
    return { init: init, setup: setup, unlock: unlock, renewRecovery: renewRecovery, finishSetup: finishSetup, recover: recover, restore: restore,
      getSession: getSession, isSession: isSession, getStatus: status, subscribe: function (fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },
      flush: flush, lock: lock, exportBackup: backup, touch: touch, dispose: dispose, checkLocal: checkLocal,
      prepareDeletion: prepareDeletion, cancelDeletion: cancelDeletion, deleteClinicalRecords: deleteClinicalRecords, reconcileDeletion: reconcileDeletion,
      attachView: function () { viewCount++; state.activeViews = viewCount; notify(); return function () { viewCount = Math.max(0, viewCount - 1); state.activeViews = viewCount; notify(); }; } };
  }

  var defaultPromise = null, defaultService = null;
  function ensure() {
    if (!defaultPromise) defaultPromise = Promise.resolve().then(async function () {
      if (typeof root.__alloLoadSensitiveWorkspaceStack !== 'function') throw failure('PROTECTED_DEPENDENCIES_MISSING', 'Protected storage is still loading. Reload the application and try again.');
      var stack = await root.__alloLoadSensitiveWorkspaceStack();
      await stack.storage.ready();
      var repo = createDurableRepository(stack.storage, stack.integration);
      defaultService = createService({ repository: repo, vaultModule: stack.vault, crypto: stack.crypto,
        localStorage: root.localStorage, sessionStorage: root.sessionStorage, legacyMirror: createLegacyMirror(stack.storage),
        getContext: function () { return typeof root.__alloSensitiveWorkspaceContext === 'function' ? root.__alloSensitiveWorkspaceContext() : { learner: true }; },
        getPolicy: function () { return own(root, 'ALLOFLOW_SENSITIVE_WORKSPACE_POLICY') ? (root.ALLOFLOW_SENSITIVE_WORKSPACE_POLICY === undefined ? null : root.ALLOFLOW_SENSITIVE_WORKSPACE_POLICY) : undefined; },
        getRetentionPolicy: function () { return own(root, 'ALLOFLOW_SENSITIVE_RECORD_RETENTION_POLICY') ? (root.ALLOFLOW_SENSITIVE_RECORD_RETENTION_POLICY === undefined ? null : root.ALLOFLOW_SENSITIVE_RECORD_RETENTION_POLICY) : undefined; } });
      await defaultService.init(); return defaultService;
    }).catch(function (e) { defaultPromise = null; throw e; });
    return defaultPromise;
  }
  function downloadJSON(value) {
    var url = root.URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    try { var a = root.document.createElement('a'); a.href = url; a.download = 'alloflow-protected-records-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); }
    finally { setTimeout(function () { root.URL.revokeObjectURL(url); }, 1000); }
  }

  function Boundary(props) {
    var React = props.React || root.React, h = React.createElement;
    var feature = props.feature; checkFeature(feature);
    var serviceState = React.useState(null), service = serviceState[0], setService = serviceState[1];
    var statusState = React.useState({ phase: 'loading' }), status = statusState[0], setStatus = statusState[1];
    var errorState = React.useState(''), error = errorState[0], setError = errorState[1];
    var busyState = React.useState(false), busy = busyState[0], setBusy = busyState[1];
    var formState = React.useState({ password: '', confirm: '', recovery: '', saved: false, idle: 0, recover: false, backupSecret: '', restoreRecovery: false, restoreNewPassword: '', deletePassword: '', deletePhrase: '', retentionApproved: false, holdsReviewed: false, otherClinicalWindowsClosed: false }), form = formState[0], setForm = formState[1];
    var live = React.useRef(true), childRef = React.useRef(null), sessionRef = React.useRef(null), renderedChildRef = React.useRef(null);
    var deletionPanelRef = React.useRef(null), deletionTriggerRef = React.useRef(null), deletionPreviousPhase = React.useRef('loading'), deletionReturnFocusPending = React.useRef(false);
    React.useEffect(function () {
      live.current = true; var stop;
      (props.service ? Promise.resolve(props.service) : ensure()).then(async function (s) { await s.init(); if (!live.current) return; setService(s); setStatus(s.getStatus()); stop = s.subscribe(function (value) { if (live.current) setStatus(value); }); }).catch(function () { if (live.current) setError('Protected storage could not load. Existing records have not been opened. Reload to retry.'); });
      return function () { live.current = false; if (stop) stop(); };
    }, [props.service]);
    React.useEffect(function () { if (childRef.current) childRef.current.inert = status.phase === 'locking'; }, [status.phase]);
    React.useEffect(function () {
      if (['deletion-review', 'deletion-unverified'].includes(status.phase) && status.phase !== deletionPreviousPhase.current && deletionPanelRef.current) { var heading = deletionPanelRef.current.querySelector('h2'); if (heading) heading.focus(); }
      if (status.phase === 'ready' && deletionPreviousPhase.current === 'deletion-review') deletionReturnFocusPending.current = true;
      if (status.phase !== 'ready') deletionReturnFocusPending.current = false;
      if (deletionReturnFocusPending.current && !busy && deletionTriggerRef.current && !deletionTriggerRef.current.disabled) {
        deletionTriggerRef.current.focus(); deletionReturnFocusPending.current = false;
      }
      deletionPreviousPhase.current = status.phase;
    }, [status.phase, busy]);
    React.useEffect(function () { return service && service.attachView ? service.attachView() : undefined; }, [service]);
    async function act(fn) {
      if (busy || !service) return; setBusy(true); setError('');
      try { await fn(); if (live.current) setForm(function (f) { return Object.assign({}, f, { password: '', confirm: '', recovery: '', backupSecret: '', restoreNewPassword: '', deletePassword: '', deletePhrase: '', retentionApproved: false, holdsReviewed: false, otherClinicalWindowsClosed: false }); }); }
      catch (e) { if (live.current && e.name !== 'AbortError') setError(e && /^PROTECTED_|^VAULT_/.test(e.code || '') ? e.message : 'The protected operation could not finish. Existing work was preserved.'); }
      finally { if (live.current) setBusy(false); }
    }
    function field(name, label, type) { return h('label', { style: { display: 'block', margin: '12px 0' } }, label,
      h('input', { type: type || 'password', value: form[name], autoComplete: 'off', disabled: busy, onChange: function (e) { var value = e.target.value; setForm(function (f) { var n = Object.assign({}, f); n[name] = value; return n; }); }, style: { display: 'block', width: '100%', fontSize: 16, padding: 10, border: '1px solid #64748b', borderRadius: 6 } })); }
    function button(label, fn, disabled, ref) { return h('button', { type: 'button', ref: ref, disabled: busy || disabled, onClick: fn, style: { padding: '10px 14px', margin: '8px 8px 8px 0', background: '#1e40af', color: '#fff', border: '1px solid #1e3a8a', borderRadius: 6, fontSize: 16, cursor: 'pointer' } }, label); }
    var title = { 'behavior-lens': 'BehaviorLens', 'dynamic-assessment': 'Dynamic Assessment', 'report-writer': 'Report Writer' }[feature];
    var warning = error || status.error;
    if (service && status.phase === 'deletion-unverified') return h('section', { ref: deletionPanelRef, 'aria-label': 'Unverified clinical deletion', style: { maxWidth: 760, margin: '24px auto', padding: 24, color: '#0f172a', background: '#fff', border: '2px solid #991b1b', borderRadius: 12 } },
      h('h2', { tabIndex: -1 }, 'Deletion status is not verified'),
      h('p', null, 'This paused copy cannot resume saving until connected storage is checked. A deletion may already have committed. Keep this window secure; it will not automatically put the paused records back.'),
      warning ? h('p', { role: 'alert', style: { color: '#991b1b' } }, warning) : null,
      button('Recheck connected storage', function () { act(function () { return service.reconcileDeletion(); }); }),
      button('Lock without resaving the paused copy', function () { act(function () { return service.lock('unverified-deletion-lock'); }); }));
    if (service && ['deletion-review', 'deleting'].includes(status.phase) && status.deletionReview) {
      var deletion = status.deletionReview;
      function deletionAck(name, text) { return h('label', { style: { display: 'block', margin: '12px 0' } }, h('input', { type: 'checkbox', checked: form[name], disabled: busy || status.phase === 'deleting', onChange: function (e) { var checked = e.target.checked; setForm(function (f) { var next = Object.assign({}, f); next[name] = checked; return next; }); } }), ' ', text); }
      return h('section', { ref: deletionPanelRef, 'aria-label': 'Review protected clinical record deletion', style: { maxWidth: 760, margin: '24px auto', padding: 24, color: '#0f172a', background: '#fff', border: '2px solid #991b1b', borderRadius: 12 } },
        h('h2', { tabIndex: -1 }, 'Review deletion of all protected clinical records'),
        h('p', null, 'This removes every saved BehaviorLens, Dynamic Assessment and Report Writer record in this device’s currently connected encrypted clinical store, including preserved older copies and pending transfers. This does not select an individual student.'),
        h('ul', null, deletion.features.map(function (item) { return h('li', { key: item.feature }, item.feature + ': ' + item.storedKeys + ' stored entries; ' + item.preservedCopies + ' preserved older copies.'); })),
        h('p', null, 'Pending protected transfers: ' + deletion.pendingTransfers + '. Stored-entry counts are not counts of students or cases.'),
        h('p', null, 'Backups, exports, other tools, older application windows, remote services and provider copies are excluded. These acknowledgments record your review; they do not verify district approval. Other clinical windows must be closed.'),
        deletionAck('retentionApproved', 'I reviewed the applicable retention schedule and am authorized to delete these records.'),
        deletionAck('holdsReviewed', 'I checked that these records have no preservation or legal hold.'),
        deletionAck('otherClinicalWindowsClosed', 'I closed every other clinical-tool window using this device store.'),
        field('deletePhrase', 'Type DELETE PROTECTED RECORDS to confirm the scope', 'text'),
        field('deletePassword', 'Re-enter the saved-records password'),
        warning ? h('p', { role: 'alert', style: { color: '#991b1b' } }, warning) : null,
        button(status.phase === 'deleting' ? 'Deleting and verifying…' : 'Delete this device’s protected clinical records', function () { act(async function () { var input = { phrase: form.deletePhrase, password: form.deletePassword, retentionApproved: form.retentionApproved, holdsReviewed: form.holdsReviewed, otherClinicalWindowsClosed: form.otherClinicalWindowsClosed }; setForm(function (f) { return Object.assign({}, f, { deletePassword: '' }); }); await service.deleteClinicalRecords(deletion, input); }); }, status.phase === 'deleting'),
        button('Cancel deletion and return to records', function () { act(function () { return service.cancelDeletion(); }); }, status.phase === 'deleting'),
        button('Lock records without deleting', function () { act(function () { return service.lock('deletion-review-close'); }); }, status.phase === 'deleting'));
    }
    if (service && ['ready', 'locking'].includes(status.phase)) {
      var protectedSession;
      try { protectedSession = status.phase === 'ready' ? service.getSession(feature) : sessionRef.current; }
      catch (_) { protectedSession = null; }
      if (protectedSession) sessionRef.current = protectedSession;
      if (protectedSession && protectedSession.feature === feature) {
        if (status.phase === 'ready') renderedChildRef.current = typeof props.children === 'function' ? props.children(protectedSession) : props.children;
        return h('section', { 'aria-label': title + ' protected workspace' },
        h('div', { style: { padding: 12, borderBottom: '1px solid #64748b', background: '#eff6ff', color: '#0f172a' } },
          h('strong', null, 'Protected records'), ' — saved with encryption on this device. ',
          status.pending ? h('span', { role: 'status' }, 'Saving… ') : h('span', { role: 'status' }, 'Encrypted storage active. '),
          button('Encrypted saved-records backup', function () { act(async function () { var value = await service.exportBackup(); if (live.current) downloadJSON(value); }); }, status.phase === 'locking'),
          button(status.phase === 'locking' ? 'Saving before locking…' : 'Lock records', function () { act(function () { return service.lock('manual'); }); }, status.phase === 'locking'),
          typeof service.prepareDeletion === 'function' ? button('Review clinical-record deletion', function () { act(function () { return service.prepareDeletion(); }); }, status.phase === 'locking', deletionTriggerRef) : null,
          warning ? h('p', { role: 'alert', style: { color: '#991b1b' } }, warning) : null,
          status.phase === 'ready' && protectedSession.getPreservedCopies().length ? h('details', null, h('summary', null, 'Preserved older browser copies'),
            h('p', null, 'When browser stores differed, the current local copy was kept for this tool. Each other version remains encrypted and can be retrieved here. Downloaded copies are readable; use an approved location.'),
            protectedSession.getPreservedCopies().map(function (p, i) { return button('Retrieve preserved copy ' + (i + 1) + ' (' + p.source + ')', function () { act(function () { downloadJSON(protectedSession.exportPreservedCopy(p.storedKey)); }); }); })) : null),
        h('div', { ref: childRef, 'aria-busy': status.phase === 'locking' }, renderedChildRef.current));
      }
    }
    return h('section', { 'aria-label': title + ' record protection', style: { maxWidth: 760, margin: '24px auto', padding: 24, color: '#0f172a', background: '#fff', border: '1px solid #64748b', borderRadius: 12 } },
      h('h2', null, title + ': protect student records'),
      h('p', null, 'Ordinary teaching tools and student activities do not need this password. Real clinical records use a separate encrypted workspace.'),
      h('details', { open: true }, h('summary', null, 'View a synthetic example'),
        h('p', null, feature === 'behavior-lens' ? 'Example learner: Student A. Observation: requested a break after a difficult task. Support: offer a short break and a visual first/then cue.' : feature === 'dynamic-assessment' ? 'Example learner: Student A. Baseline: 2 of 5 items. With a model and a visual cue: 4 of 5. Next step: fade the model and check independent use.' : 'Example report: Student A participated in a synthetic learning task. Performance improved with a visual cue. This example contains no real student information.')),
      warning ? h('p', { role: 'alert', style: { color: '#991b1b' } }, warning) : null,
      status.deletedAt ? h('p', { role: 'status' }, 'Protected clinical records were deleted from the connected device store at ' + status.deletedAt + '. Backups, exports, other tools and remote copies were not deleted.') : null,
      !service ? h('p', { role: 'status' }, error ? 'Reload the page to retry protected storage.' : 'Loading protected storage…') : null,
      service && status.phase === 'new' ? h('div', null,
        h('h3', null, 'Set up protected records'), h('p', null, 'Choose a passphrase. Next, save an encrypted backup and confirm an offline recovery key. Existing readable clinical copies are kept until verification finishes.'),
        field('password', 'New saved-records password (at least 10 characters)'), field('confirm', 'Confirm password'),
        h('label', null, 'Optional idle lock ', h('select', { value: form.idle, disabled: busy, onChange: function (e) { var n = Number(e.target.value); setForm(function (f) { return Object.assign({}, f, { idle: n }); }); } }, [0, 5, 15, 30].map(function (n) { return h('option', { key: n, value: n }, n ? n + ' minutes' : 'Manual locking'); }))),
        button('Create protected workspace', function () { act(function () { if (form.password !== form.confirm) throw failure('PROTECTED_PASSWORD_CONFIRM', 'The passwords do not match.'); return service.setup(form.password, form.idle); }); })) : null,
      service && status.phase === 'setup' ? h('div', null,
        h('h3', null, 'Save recovery before opening records'), h('p', null, 'Keep the recovery key separately from this device. Losing both password and key can make locked records inaccessible. This password is separate from the educator access code.'),
        h('p', null, 'If browser stores contain different versions, this device’s current local copy opens first. Other versions are preserved inside the encrypted backup and can be retrieved after unlocking.'),
        status.setupRecoveryCode ? h('p', null, h('code', { style: { overflowWrap: 'anywhere', userSelect: 'all' } }, status.setupRecoveryCode)) : button('Create recovery key', function () { act(function () { return service.renewRecovery(); }); }),
        button('Download verified encrypted backup', function () { act(async function () { var value = await service.exportBackup(); if (live.current) downloadJSON(value); }); }, !status.setupRecoveryCode),
        field('recovery', 'Re-enter the recovery key to confirm it is saved', 'text'),
        h('label', { style: { display: 'block' } }, h('input', { type: 'checkbox', checked: form.saved, onChange: function (e) { var checked = e.target.checked; setForm(function (f) { return Object.assign({}, f, { saved: checked }); }); } }), ' I saved the encrypted backup in an approved location and closed older clinical-tool windows.'),
        button('Verify and open protected records', function () { act(function () { return service.finishSetup({ recoveryInput: form.recovery, backupSaved: form.saved }); }); }),
        button('Lock and finish later', function () { act(function () { return service.lock('setup-cancel'); }); })) : null,
      service && status.phase === 'locked' ? h('div', null,
        h('h3', null, form.recover ? 'Recover with your offline key' : 'Unlock protected records'),
        form.recover ? field('recovery', 'Offline recovery key', 'text') : null,
        field('password', form.recover ? 'New saved-records password (at least 10 characters)' : 'Saved-records password'),
        button(form.recover ? 'Recover records' : 'Unlock records', function () { act(function () { return form.recover ? service.recover(form.recovery, form.password) : service.unlock(form.password); }); }),
        button(form.recover ? 'Use password instead' : 'Forgot password? Use recovery key', function () { setForm(function (f) { return Object.assign({}, f, { recover: !f.recover, password: '', recovery: '' }); }); }),
        button('Export encrypted backup while locked', function () { act(async function () { downloadJSON(await service.exportBackup()); }); })) : null,
      service && status.phase === 'new' ? h('div', { style: { marginTop: 16 } }, h('h3', null, 'Restore an encrypted backup into an empty workspace'),
        h('label', null, h('input', { type: 'checkbox', checked: form.restoreRecovery, onChange: function (e) { var value = e.target.checked; setForm(function (f) { return Object.assign({}, f, { restoreRecovery: value, backupSecret: '' }); }); } }), ' Restore with the offline recovery key'),
        field('backupSecret', form.restoreRecovery ? 'Backup recovery key' : 'Backup password'),
        form.restoreRecovery ? field('restoreNewPassword', 'New saved-records password (at least 10 characters)') : null,
        h('label', null, 'Encrypted backup file ', h('input', { type: 'file', accept: '.json,application/json', disabled: busy, onChange: function (e) {
          var file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
          act(async function () { if (file.size > 200 * 1024 * 1024) throw failure('PROTECTED_BACKUP_INVALID', 'This backup exceeds the supported size.'); var data = JSON.parse(await file.text()); if (!live.current) throw aborted(); await service.restore(data, form.backupSecret, form.restoreRecovery, form.restoreNewPassword); });
        } })), h('p', null, 'Enter the backup password or recovery key before choosing a file. Existing protected or readable clinical records are never replaced by this restore.')) : null,
      props.onClose ? button('Back to ordinary tools', function () { act(async function () { if (service) await service.lock('setup-close'); props.onClose(); }); }) : null,
      h('p', { style: { fontSize: 14 } }, 'Protection here covers the clinical records in these tools on this device. School approval, managed devices, approved AI services, other application stores, and shared-service authorization remain separate requirements.'));
  }
  function Indicator(props) {
    var React = props.React || root.React, h = React.createElement, state = React.useState(0), errorState = React.useState('');
    React.useEffect(function () { var refresh = function () { state[1](function (n) { return n + 1; }); }; root.addEventListener('alloflow:sensitive-workspace-status', refresh); return function () { root.removeEventListener('alloflow:sensitive-workspace-status', refresh); }; }, []);
    var service = props.service || defaultService, status = service && service.getStatus();
    if (!status || !['ready', 'locking', 'deletion-review', 'deleting', 'deletion-unverified'].includes(status.phase) || status.activeViews > 0) return null;
    return h('aside', { 'aria-label': 'Protected record security', style: { position: 'fixed', bottom: 16, left: 16, zIndex: 1400, maxWidth: 'calc(100vw - 32px)', padding: 12, color: '#0f172a', background: '#eff6ff', border: '2px solid #1e40af', borderRadius: 8 } },
      h('span', { role: 'status' }, status.phase === 'locking' ? 'Saving before locking… ' : status.phase === 'deletion-review' ? 'Protected records are unlocked for deletion review. ' : status.phase === 'deletion-unverified' ? 'Clinical deletion is unverified; this copy is paused. ' : status.phase === 'deleting' ? 'Verifying clinical-record deletion… ' : 'Protected records are unlocked. '),
      h('button', { type: 'button', disabled: status.phase === 'locking' || status.phase === 'deleting', onClick: function () { service.lock('manual').catch(function (e) { errorState[1](e.message); }); }, style: { padding: 8, fontSize: 16, fontWeight: 'bold', textDecoration: 'underline' } }, 'Lock records'),
      status.error || errorState[0] ? h('p', { role: 'alert' }, status.error || errorState[0]) : null);
  }
  var api = { VERSION: 1, createService: createService, createDurableRepository: createDurableRepository, createLegacyMirror: createLegacyMirror, Boundary: Boundary, Indicator: Indicator, ensure: ensure,
    isSession: function (s, f) { var owner = s && sessionOwners.get(s); return owner ? owner.isSession(s, f) : false; },
    getSession: function (f) { return defaultService ? defaultService.getSession(f) : null; },
    getStatus: function () { return defaultService ? defaultService.getStatus() : { phase: 'loading' }; },
    lock: function (reason) { return defaultService ? defaultService.lock(reason) : Promise.resolve(); },
    FEATURES: FEATURES.slice(), BACKUP_KIND: BACKUP_KIND };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.AlloModules = root.AlloModules || {}; root.AlloModules.SensitiveWorkspace = api; if (root.dispatchEvent && root.Event) root.dispatchEvent(new root.Event('alloflow:module-registry-changed')); }
})();
