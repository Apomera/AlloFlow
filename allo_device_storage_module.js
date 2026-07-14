/**
 * AlloFlow Device Storage adapter (2026-07-13).
 *
 * Persistent on-device key-value storage that works in the Gemini Canvas
 * iframe, where the app's own origin is ephemeral (localStorage/IndexedDB
 * vanish between sessions). Three backends, picked per environment:
 *
 *   direct        — the app runs on a stable origin (self-hosted shell,
 *                   desktop app): use our own IndexedDB, no bridge needed.
 *   bridge-popup  — Canvas: window.open storage_bridge.html on the stable
 *                   alloflow-cdn.pages.dev origin and speak protocol "ds1"
 *                   over postMessage. Requires a user gesture to connect.
 *   bridge-iframe — Canvas, experimental: hidden iframe of the same bridge.
 *                   Chrome partitions its storage by (top-level site, frame
 *                   origin); if the partition survives Canvas reloads this
 *                   needs no gesture. The probe() below measures exactly that.
 *   memory        — graceful fallback (popup blocked, no bridge reachable).
 *
 * FERPA posture: every backend keeps data on the student's device only.
 * The bridge page itself is the review/export/erase UI when opened directly.
 *
 * NOT yet wired into the app (no loadModule call) — consumers land later;
 * see docs/DEVICE_STORAGE_BRIDGE.md for the probe + integration plan.
 * Protocol must stay in sync with storage_bridge.html (same repo root).
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.AlloModules && window.AlloModules.DeviceStorageModule) {
    console.log('[CDN] DeviceStorageModule already loaded, skipping');
    return;
  }

  var PROTO = 'ds1';
  var DEFAULT_BRIDGE_URL = 'https://alloflow-cdn.pages.dev/storage_bridge.html';
  var NS_RE = /^[a-z0-9_.-]{1,64}$/i;
  var REQUEST_TIMEOUT_MS = 8000;
  var CONNECT_TIMEOUT_MS = 12000;

  function validateNs(ns) { return typeof ns === 'string' && NS_RE.test(ns); }
  function validateKey(key) { return typeof key === 'string' && key.length > 0 && key.length <= 512; }
  function makeNonce() {
    try {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    } catch (_) {
      return 'n' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
  }
  function buildEnvelope(nonce, id, op, params) {
    var msg = { allo: PROTO, nonce: nonce, id: id, op: op };
    if (params) {
      if (params.ns !== undefined) msg.ns = params.ns;
      if (params.key !== undefined) msg.key = params.key;
      if (params.value !== undefined) msg.value = params.value;
      if (params.channel !== undefined) msg.channel = params.channel;
    }
    return msg;
  }
  function isValidResponse(msg, nonceIgnored) {
    return !!(msg && msg.allo === PROTO && typeof msg.id === 'string' && typeof msg.ok === 'boolean');
  }
  function storageError(code, message) {
    var err = new Error(message || code);
    err.code = code;
    return err;
  }
  // Mirrors the monolith's _isCanvasEnv hostname heuristic (ANTI ~3403) so
  // consumers can init({}) without plumbing that flag through.
  function detectSurface() {
    try {
      var host = window.location.hostname || '';
      var href = window.location.href || '';
      if (href.indexOf('blob:') === 0) return 'canvas';
      if (host.indexOf('googleusercontent') !== -1 || host.indexOf('scf.usercontent') !== -1 ||
          host.indexOf('code-server') !== -1 || host.indexOf('idx.google') !== -1 ||
          host.indexOf('run.app') !== -1) return 'canvas';
      return 'stable';
    } catch (_) { return 'canvas'; }
  }

  // ── Transport over postMessage to a bridge window/iframe ────────
  function BridgeTransport(kind) {
    this.kind = kind;            // 'popup' | 'iframe'
    this.win = null;             // target Window
    this.frameEl = null;         // iframe element (iframe kind)
    this.nonce = null;
    this.ready = false;
    this.pending = {};           // id -> {resolve, reject, timer}
    this.seq = 0;
    this.onMessage = null;
  }
  BridgeTransport.prototype.alive = function () {
    if (!this.win) return false;
    if (this.kind === 'popup') { try { return !this.win.closed; } catch (_) { return false; } }
    return !!(this.frameEl && this.frameEl.isConnected);
  };
  BridgeTransport.prototype.connect = function (bridgeUrl) {
    var self = this;
    if (self.ready && self.alive()) return Promise.resolve(self);
    return new Promise(function (resolve, reject) {
      self.nonce = makeNonce();
      var url = bridgeUrl + '#allo-ds=' + self.nonce;
      if (self.kind === 'popup') {
        var win = null;
        try { win = window.open(url, 'alloflow_device_storage', 'width=380,height=460,popup=yes'); } catch (_) {}
        if (!win) {
          reject(storageError('allo/popup-blocked', 'The storage window was blocked. Allow popups for this site and try again.'));
          return;
        }
        self.win = win;
      } else {
        var frame = document.createElement('iframe');
        frame.src = url;
        frame.setAttribute('aria-hidden', 'true');
        frame.setAttribute('title', 'AlloFlow device storage bridge');
        frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;';
        document.body.appendChild(frame);
        self.frameEl = frame;
        self.win = frame.contentWindow;
      }
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        self.teardown();
        reject(storageError('allo/bridge-timeout', 'The storage bridge did not answer (offline, blocked, or CSP-denied).'));
      }, CONNECT_TIMEOUT_MS);
      self.onMessage = function (event) {
        var msg = event.data;
        if (!msg || msg.allo !== PROTO) return;
        if (event.source !== self.win) return;
        if (msg.type === 'allo-bridge-ready' && msg.nonce === self.nonce) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            self.ready = true;
            resolve(self);
          }
          return;
        }
        if (isValidResponse(msg) && self.pending[msg.id]) {
          var entry = self.pending[msg.id];
          delete self.pending[msg.id];
          clearTimeout(entry.timer);
          if (msg.ok) entry.resolve(msg.value);
          else entry.reject(storageError((msg.error && msg.error.code) || 'allo/storage-error',
                                         (msg.error && msg.error.message) || 'Storage bridge error'));
        }
      };
      window.addEventListener('message', self.onMessage);
    });
  };
  BridgeTransport.prototype.request = function (op, params) {
    var self = this;
    if (!self.ready || !self.alive()) {
      return Promise.reject(storageError('allo/storage-disconnected', 'Device storage is not connected.'));
    }
    var id = 'r' + (++self.seq) + '-' + Date.now().toString(36);
    var msg = buildEnvelope(self.nonce, id, op, params);
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        delete self.pending[id];
        reject(storageError('allo/storage-timeout', 'Device storage request timed out.'));
      }, REQUEST_TIMEOUT_MS);
      self.pending[id] = { resolve: resolve, reject: reject, timer: timer };
      try {
        self.win.postMessage(msg, '*');
      } catch (e) {
        delete self.pending[id];
        clearTimeout(timer);
        reject(storageError('allo/storage-post-failed', String(e && e.message || e)));
      }
    });
  };
  BridgeTransport.prototype.teardown = function () {
    if (this.onMessage) { window.removeEventListener('message', this.onMessage); this.onMessage = null; }
    Object.keys(this.pending).forEach(function (id) {
      clearTimeout(this.pending[id].timer);
      this.pending[id].reject(storageError('allo/storage-disconnected', 'Bridge closed.'));
    }, this);
    this.pending = {};
    if (this.kind === 'popup' && this.win) { try { this.win.close(); } catch (_) {} }
    if (this.frameEl) { try { this.frameEl.remove(); } catch (_) {} }
    this.win = null;
    this.frameEl = null;
    this.ready = false;
  };

  // ── Direct backend (own-origin IndexedDB; stable-origin surfaces) ──
  var DIRECT_DB = 'allo_device_storage';
  var DIRECT_STORE = 'kv';
  var _directDb = null;
  function directDb() {
    if (_directDb) return _directDb;
    _directDb = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DIRECT_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DIRECT_STORE)) {
          db.createObjectStore(DIRECT_STORE, { keyPath: 'k' }).createIndex('ns', 'ns', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || storageError('allo/idb-open-failed')); };
    });
    return _directDb;
  }
  var directBackend = {
    request: function (op, params) {
      return directDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var mode = (op === 'get' || op === 'list' || op === 'getAll' || op === 'namespaces') ? 'readonly' : 'readwrite';
          var t = db.transaction(DIRECT_STORE, mode);
          var store = t.objectStore(DIRECT_STORE);
          var k = params && (params.ns + ' ' + params.key);
          var result;
          if (op === 'get') {
            var g = store.get(k);
            g.onsuccess = function () { result = g.result ? g.result.value : null; };
          } else if (op === 'set') {
            store.put({ k: k, ns: params.ns, key: params.key, value: params.value, updatedAt: new Date().toISOString() });
            result = true;
          } else if (op === 'delete') {
            store.delete(k);
            result = true;
          } else if (op === 'list' || op === 'getAll') {
            var a = store.index('ns').getAll(params.ns);
            a.onsuccess = function () {
              var rows = a.result || [];
              result = op === 'list'
                ? rows.map(function (r) { return r.key; })
                : rows.map(function (r) { return { key: r.key, value: r.value, updatedAt: r.updatedAt }; });
            };
          } else if (op === 'clearNamespace') {
            var c = store.index('ns').openCursor(params.ns);
            result = 0;
            c.onsuccess = function () {
              var cur = c.result;
              if (cur) { cur.delete(); result++; cur.continue(); }
            };
          } else if (op === 'namespaces') {
            var all = store.getAll();
            all.onsuccess = function () {
              var by = {};
              (all.result || []).forEach(function (r) {
                var b = by[r.ns] = by[r.ns] || { ns: r.ns, count: 0, bytes: 0 };
                b.count++;
                try { b.bytes += typeof r.value === 'string' ? r.value.length : JSON.stringify(r.value).length; } catch (_) {}
              });
              result = Object.keys(by).sort().map(function (k) { return by[k]; });
            };
          } else if (op === 'ping') {
            result = { pong: true, proto: PROTO };
          } else {
            t.abort();
            reject(storageError('allo/bad-op', 'Unknown op: ' + op));
            return;
          }
          t.oncomplete = function () { resolve(result); };
          t.onerror = function () { reject(t.error || storageError('allo/idb-tx-failed')); };
        });
      });
    }
  };

  // ── Memory fallback ──────────────────────────────────────────────
  var _mem = {};
  var memoryBackend = {
    request: function (op, params) {
      var ns = params && params.ns, key = params && params.key;
      var bucket = _mem[ns] = _mem[ns] || {};
      switch (op) {
        case 'get': return Promise.resolve(key in bucket ? bucket[key] : null);
        case 'set': bucket[key] = params.value; return Promise.resolve(true);
        case 'delete': delete bucket[key]; return Promise.resolve(true);
        case 'list': return Promise.resolve(Object.keys(bucket));
        case 'getAll': return Promise.resolve(Object.keys(bucket).map(function (k) { return { key: k, value: bucket[k] }; }));
        case 'clearNamespace': { var n = Object.keys(bucket).length; _mem[ns] = {}; return Promise.resolve(n); }
        case 'namespaces': return Promise.resolve(Object.keys(_mem).sort().map(function (k) {
          return { ns: k, count: Object.keys(_mem[k]).length, bytes: 0 };
        }));
        case 'ping': return Promise.resolve({ pong: true, proto: PROTO });
        default: return Promise.reject(storageError('allo/bad-op', 'Unknown op: ' + op));
      }
    }
  };

  // ── Public API ───────────────────────────────────────────────────
  var state = {
    backendName: 'unset',      // unset | direct | bridge-popup | bridge-iframe | memory
    backend: null,
    transport: null,
    bridgeUrl: DEFAULT_BRIDGE_URL,
    writeQueue: []             // {op, params} queued while a bridge backend is disconnected
  };

  function activeBackend() {
    if (state.backendName === 'direct') return directBackend;
    if (state.backendName === 'memory') return memoryBackend;
    if (state.transport && state.transport.ready && state.transport.alive()) return state.transport;
    return null;
  }
  function flushQueue() {
    var backend = activeBackend();
    if (!backend) return Promise.resolve(0);
    var queued = state.writeQueue.splice(0);
    var chain = Promise.resolve();
    queued.forEach(function (item) {
      chain = chain.then(function () {
        return backend.request(item.op, item.params).catch(function () {});
      });
    });
    return chain.then(function () { return queued.length; });
  }
  function guarded(op, params, opts) {
    if (params && params.ns !== undefined && !validateNs(params.ns)) {
      return Promise.reject(storageError('allo/bad-namespace', 'Namespace must match ' + NS_RE));
    }
    if ((op === 'get' || op === 'set' || op === 'delete') && !validateKey(params.key)) {
      return Promise.reject(storageError('allo/bad-key', 'Key must be a 1-512 char string.'));
    }
    var backend = activeBackend();
    if (backend) return backend.request(op, params);
    var isWrite = op === 'set' || op === 'delete' || op === 'clearNamespace';
    if (isWrite && (!opts || opts.queue !== false)) {
      state.writeQueue.push({ op: op, params: params });
      return Promise.resolve({ queued: true });
    }
    return Promise.reject(storageError('allo/storage-disconnected',
      'Device storage is not connected. Call alloDeviceStorage.connect() from a user gesture.'));
  }

  var api = {
    /**
     * Pick a backend. opts:
     *   surface: 'canvas' | 'stable'  (omit to auto-detect — same hostname
     *            heuristic as the monolith's _isCanvasEnv)
     *   bridgeUrl: override the hosted bridge page URL
     *   mode: 'popup' | 'iframe'      (bridge flavor for Canvas; default
     *            iframe — probe 2026-07-14 verified partitioned iframe
     *            storage PERSISTS across Canvas sessions, no gesture needed)
     * Does NOT open anything — bridge backends connect lazily via connect().
     */
    init: function (opts) {
      opts = opts || {};
      if (opts.bridgeUrl) state.bridgeUrl = opts.bridgeUrl;
      var surface = opts.surface || detectSurface();
      if (surface === 'stable') {
        state.backendName = 'direct';
      } else {
        state.backendName = opts.mode === 'popup' ? 'bridge-popup' : 'bridge-iframe';
      }
      return api.status();
    },
    /** init (if needed) + connect. Gesture-free on the iframe/direct paths. */
    ready: function () {
      if (state.backendName === 'unset') api.init({});
      return api.connect();
    },
    /** Open the bridge (popup needs a user gesture). Resolves when ready. */
    connect: function () {
      if (state.backendName === 'direct' || state.backendName === 'memory') return Promise.resolve(api.status());
      if (state.backendName === 'unset') api.init({});
      var kind = state.backendName === 'bridge-iframe' ? 'iframe' : 'popup';
      if (!state.transport || state.transport.kind !== kind || !state.transport.alive()) {
        if (state.transport) state.transport.teardown();
        state.transport = new BridgeTransport(kind);
      }
      return state.transport.connect(state.bridgeUrl).then(function () {
        return flushQueue();
      }).then(function () { return api.status(); });
    },
    disconnect: function () {
      if (state.transport) { state.transport.teardown(); state.transport = null; }
      return api.status();
    },
    /** Fall back to in-memory for this session (e.g. popup permanently blocked). */
    useMemory: function () {
      api.disconnect();
      state.backendName = 'memory';
      return flushQueue().then(function () { return api.status(); });
    },
    get: function (ns, key) { return guarded('get', { ns: ns, key: key }); },
    set: function (ns, key, value, opts) { return guarded('set', { ns: ns, key: key, value: value }, opts); },
    remove: function (ns, key, opts) { return guarded('delete', { ns: ns, key: key }, opts); },
    list: function (ns) { return guarded('list', { ns: ns }); },
    getAll: function (ns) { return guarded('getAll', { ns: ns }); },
    clearNamespace: function (ns, opts) { return guarded('clearNamespace', { ns: ns }, opts); },
    namespaces: function () { return guarded('namespaces', {}); },
    status: function () {
      return {
        backend: state.backendName,
        connected: !!activeBackend(),
        queuedWrites: state.writeQueue.length,
        bridgeUrl: state.bridgeUrl
      };
    },
    /** Open transiently: connect → run fn(api) → close the bridge. */
    withConnection: function (fn) {
      return api.connect().then(function () { return fn(api); }).then(function (result) {
        api.disconnect();
        return result;
      }, function (err) {
        api.disconnect();
        throw err;
      });
    },
    /**
     * Persistence probe for the Canvas smoke test. Run once per Canvas
     * session (from a user gesture, for the popup half); the SECOND run in a
     * FRESH session tells the truth: previous !== null ⇒ that channel
     * persists across Canvas reloads.
     */
    probe: function (opts) {
      opts = opts || {};
      var bridgeUrl = opts.bridgeUrl || state.bridgeUrl;
      var out = { proto: PROTO, bridgeUrl: bridgeUrl, when: new Date().toISOString(), popup: null, iframe: null };
      var iframeT = new BridgeTransport('iframe');
      var iframeRun = iframeT.connect(bridgeUrl).then(function () {
        return iframeT.request('probe', { channel: 'iframe' });
      }).then(function (r) { out.iframe = r; }, function (e) {
        out.iframe = { error: e.code || String(e && e.message || e) };
      }).then(function () { iframeT.teardown(); });
      var popupT = new BridgeTransport('popup');
      var popupRun = popupT.connect(bridgeUrl).then(function () {
        return popupT.request('probe', { channel: 'popup' });
      }).then(function (r) { out.popup = r; }, function (e) {
        out.popup = { error: e.code || String(e && e.message || e) };
      }).then(function () { popupT.teardown(); });
      return Promise.all([iframeRun, popupRun]).then(function () {
        function verdict(r) {
          if (!r || r.error) return 'FAILED: ' + (r && r.error);
          if (r.previous) return 'PERSISTS across sessions (seen ' + r.current.count + 'x, last ' + r.previous.t + ')';
          return 'first run on this device — run again in a FRESH Canvas session to confirm persistence';
        }
        out.summary = { popup: verdict(out.popup), iframe: verdict(out.iframe) };
        return out;
      });
    },
    _internal: {
      buildEnvelope: buildEnvelope,
      isValidResponse: isValidResponse,
      validateNs: validateNs,
      validateKey: validateKey,
      PROTO: PROTO,
      DEFAULT_BRIDGE_URL: DEFAULT_BRIDGE_URL
    }
  };

  // ── On-screen probe panel (no DevTools needed) ───────────────────
  // Opened via Ctrl+Alt+Shift+D (bootstrap in text_utility_helpers_module)
  // or window.alloDeviceStorage.__openProbePanel(). Plain DOM on purpose —
  // must work before/without React and inside any surface.
  var _probePanel = null;
  api.__openProbePanel = function () {
    if (typeof document === 'undefined' || !document.body) return null;
    if (_probePanel && _probePanel.isConnected) { _probePanel.remove(); _probePanel = null; return null; }
    var dark = false;
    try { dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch (_) {}
    var panel = document.createElement('div');
    _probePanel = panel;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Device storage probe');
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000;width:360px;max-width:92vw;' +
      'font:13px/1.5 system-ui,-apple-system,sans-serif;border-radius:12px;padding:14px;text-align:left;' +
      (dark ? 'background:#1e293b;color:#e2e8f0;border:1px solid #475569;'
            : 'background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;') +
      'box-shadow:0 8px 30px rgba(0,0,0,.35);';
    var btnCss = 'font:inherit;font-weight:600;padding:5px 12px;border-radius:999px;cursor:pointer;' +
      (dark ? 'background:#334155;color:#e2e8f0;border:1px solid #64748b;'
            : 'background:#f1f5f9;color:#0f172a;border:1px solid #94a3b8;');
    var close = function () {
      document.removeEventListener('keydown', onKey, true);
      panel.remove();
      _probePanel = null;
    };
    var onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
    var title = document.createElement('strong');
    title.textContent = '🔌 Device storage probe';
    var x = document.createElement('button');
    x.textContent = '✕';
    x.setAttribute('aria-label', 'Close probe panel');
    x.style.cssText = btnCss;
    x.onclick = close;
    head.appendChild(title); head.appendChild(x);

    var blurb = document.createElement('p');
    blurb.style.cssText = 'margin:0 0 10px;opacity:.85;';
    blurb.textContent = 'Tests whether on-device storage survives Canvas reloads. ' +
      'Run once, then run again in a completely fresh session — the second run gives the verdict. ' +
      'A small window may flash open; that is the storage bridge.';

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;';
    var runBtn = document.createElement('button');
    runBtn.textContent = '▶ Run probe';
    runBtn.style.cssText = btnCss;
    var reviewBtn = document.createElement('button');
    reviewBtn.textContent = '🔍 Open review page';
    reviewBtn.style.cssText = btnCss;
    reviewBtn.onclick = function () {
      try { window.open(state.bridgeUrl, '_blank', 'noopener'); } catch (_) {}
    };
    // The standalone review page sees the FIRST-PARTY bucket only. The iframe
    // channel's storage is partitioned under the Canvas top-level site, so
    // the app's own data must be reviewable from HERE, through the same
    // transport the app uses.
    var dataBtn = document.createElement('button');
    dataBtn.textContent = '📂 View app data';
    dataBtn.style.cssText = btnCss;
    row.appendChild(runBtn); row.appendChild(reviewBtn); row.appendChild(dataBtn);

    var out = document.createElement('div');
    out.setAttribute('aria-live', 'polite');
    out.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:12px;';

    dataBtn.onclick = function () {
      out.textContent = 'Loading stored data…';
      api.ready().then(function () { return api.namespaces(); }).then(function (list) {
        out.textContent = '';
        if (!list || !list.length) {
          out.textContent = 'Nothing stored by the app on this device yet (backend: ' + state.backendName + ').';
          return;
        }
        var note = document.createElement('div');
        note.style.cssText = 'opacity:.75;margin-bottom:6px;';
        note.textContent = 'Backend: ' + state.backendName + ' — data stays on this device.';
        out.appendChild(note);
        list.forEach(function (info) {
          var line = document.createElement('div');
          line.style.cssText = 'display:flex;align-items:center;gap:8px;margin:3px 0;';
          var label = document.createElement('span');
          label.style.cssText = 'flex:1;';
          label.textContent = info.ns + ' — ' + info.count + ' record(s), ~' + info.bytes + ' B';
          var exp = document.createElement('button');
          exp.textContent = 'Export';
          exp.style.cssText = btnCss + 'padding:2px 8px;';
          exp.onclick = function () {
            api.getAll(info.ns).then(function (rows) {
              var blob = new Blob([JSON.stringify({ ns: info.ns, exportedAt: new Date().toISOString(), records: rows }, null, 2)], { type: 'application/json' });
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'alloflow_' + info.ns + '_export.json';
              a.click();
              setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
            }).catch(function (e) { out.appendChild(document.createTextNode('\nExport failed: ' + (e.code || e.message))); });
          };
          var del = document.createElement('button');
          del.textContent = 'Erase';
          del.style.cssText = btnCss + 'padding:2px 8px;color:#dc2626;';
          del.onclick = function () {
            if (window.confirm('Erase all ' + info.count + ' record(s) in ' + info.ns + ' from this device?')) {
              api.clearNamespace(info.ns).then(function () { dataBtn.onclick(); });
            }
          };
          line.appendChild(label); line.appendChild(exp); line.appendChild(del);
          out.appendChild(line);
        });
      }).catch(function (e) {
        out.textContent = 'Could not load stored data: ' + (e && (e.code || e.message) || e);
      });
    };

    runBtn.onclick = function () {
      runBtn.disabled = true;
      runBtn.textContent = '… probing (up to ~15s)';
      out.textContent = '';
      api.probe().then(function (res) {
        out.textContent =
          'POPUP channel:  ' + res.summary.popup + '\n\n' +
          'IFRAME channel: ' + res.summary.iframe + '\n\n' +
          '(popup needs the click you just made; iframe needs no gesture — ' +
          'if the iframe persists, features can save silently)';
      }, function (err) {
        out.textContent = 'Probe failed: ' + (err && (err.code || err.message) || err);
      }).then(function () {
        runBtn.disabled = false;
        runBtn.textContent = '▶ Run probe again';
      });
    };

    panel.appendChild(head);
    panel.appendChild(blurb);
    panel.appendChild(row);
    panel.appendChild(out);
    document.body.appendChild(panel);
    try { runBtn.focus(); } catch (_) {}
    return panel;
  };

  window.alloDeviceStorage = api;
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.DeviceStorageModule = true;
  console.log('[DeviceStorage] adapter registered (backend: lazy)');
})();
