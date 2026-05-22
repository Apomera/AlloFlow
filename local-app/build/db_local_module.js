/**
 * AlloFlow — Local DB Module (C2.2 + C2.3 + C2.4)
 *
 * Browser-side data layer for the local app.
 * Talks to the SQLite REST backend (local-app/backend/server.js) on port 3747.
 *
 * Provides:
 *   window.initAlloData(config) → DataProvider with Firestore-compatible shims
 *
 * Features:
 *   • REST client for all CRUD ops (C2.2)
 *   • Token-based session restoration on load (C2.3)
 *   • IndexedDB write-through cache for offline reads (C2.4)
 *
 * The bootstrap shim calls initAlloData() and installs returned _shimFunctions
 * to replace the no-op Firestore stubs defined in the bootstrap.
 *
 * Also handles session restoration:
 *   On load: GET /auth/session → if valid, calls window.__alloShared.setUser()
 */

(function (global) {
    'use strict';

    // ── IndexedDB Cache (C2.4) ────────────────────────────────────────────────

    const IDB_NAME    = 'alloflow-local';
    const IDB_VERSION = 1;
    const IDB_STORE   = 'docs';

    let _idb = null;

    function openIDB() {
        if (_idb) return Promise.resolve(_idb);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(IDB_NAME, IDB_VERSION);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    const store = db.createObjectStore(IDB_STORE, { keyPath: '_key' });
                    store.createIndex('collection', 'collection', { unique: false });
                }
            };
            req.onsuccess  = e => { _idb = e.target.result; resolve(_idb); };
            req.onerror    = e => reject(e.target.error);
        });
    }

    function idbKey(collection, docId) {
        return `${collection}::${docId}`;
    }

    async function idbGet(collection, docId) {
        try {
            const db  = await openIDB();
            const tx  = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(idbKey(collection, docId));
            return new Promise(resolve => {
                req.onsuccess = e => resolve(e.target.result || null);
                req.onerror   = () => resolve(null);
            });
        } catch { return null; }
    }

    async function idbSet(collection, docId, data) {
        try {
            const db  = await openIDB();
            const tx  = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put({ _key: idbKey(collection, docId), collection, docId, ...data });
        } catch { /* cache miss is non-fatal */ }
    }

    async function idbDelete(collection, docId) {
        try {
            const db = await openIDB();
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).delete(idbKey(collection, docId));
        } catch {}
    }

    // ── REST Client ───────────────────────────────────────────────────────────

    let _baseUrl = 'http://localhost:3747';
    let _token   = null;

    function _getToken() {
        return _token || localStorage.getItem('alloflow_local_token') || null;
    }

    function _authHeaders() {
        const tok = _getToken();
        return tok ? { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }
                   : { 'Content-Type': 'application/json' };
    }

    async function _apiFetch(method, path, body) {
        const opts = {
            method,
            headers: _authHeaders(),
            signal: AbortSignal.timeout(8000),
        };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const resp = await fetch(`${_baseUrl}${path}`, opts);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }
        return resp.json();
    }

    // ── Firestore Path Mapper ─────────────────────────────────────────────────
    // Maps Firestore nested paths to flat (collection, docId) pairs.
    // Mirrors the patterns in src/dataLayer.js for local app compatibility.

    const PATH_PATTERNS = [
        {
            match: /^artifacts\/([^/]+)\/public\/data\/sessions\/([^/]+)$/,
            collection: 'sessions',
            docId: m => `${m[1]}__${m[2]}`,
        },
        {
            match: /^artifacts\/([^/]+)\/public\/data\/sessions\/([^/]+)\/studentProgress\/([^/]+)$/,
            collection: 'student_progress',
            docId: m => `${m[2]}__${m[3]}`,
        },
        {
            match: /^artifacts\/([^/]+)\/users\/([^/]+)\/data\/teacherHistory$/,
            collection: 'teacher_history',
            docId: m => `${m[1]}__${m[2]}`,
        },
        {
            match: /^artifacts\/([^/]+)\/users\/([^/]+)\/data\/([^/]+)$/,
            collection: 'user_data',
            docId: m => `${m[2]}__${m[3]}`,
        },
        {
            match: /^artifacts\/([^/]+)\/public\/data\/([^/]+)$/,
            collection: 'app_data',
            docId: m => `${m[1]}__${m[2]}`,
        },
    ];

    function flattenPath(path) {
        if (!path || typeof path !== 'string') return null;
        for (const pattern of PATH_PATTERNS) {
            const m = path.match(pattern.match);
            if (m) return { collection: pattern.collection, docId: pattern.docId(m) };
        }
        // Fallback: treat path as collection/docId directly
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 2) {
            const docId     = parts.pop();
            const collection = parts.join('_');
            return { collection, docId };
        }
        return { collection: path, docId: 'default' };
    }

    // ── Ref objects (mimic Firestore DocumentReference) ──────────────────────

    function makeRef(pathStr) {
        const flat = flattenPath(pathStr);
        return flat ? { _path: pathStr, _collection: flat.collection, _docId: flat.docId } : null;
    }

    function makeCollRef(pathStr) {
        return { _collection: pathStr.replace(/\//g, '_'), _isCollection: true };
    }

    // ── CRUD operations ───────────────────────────────────────────────────────

    async function _setDoc(ref, data, _opts) {
        if (!ref) return;
        const { collection, docId } = { collection: ref._collection, docId: ref._docId };
        await _apiFetch('POST', `/db/${collection}`, { id: docId, ...data });
        await idbSet(collection, docId, data);
    }

    async function _getDoc(ref) {
        if (!ref) return { exists: () => false, data: () => ({}) };
        const { collection, docId } = { collection: ref._collection, docId: ref._docId };

        // Try cache first (offline-first)
        const cached = await idbGet(collection, docId);
        if (cached) {
            return {
                exists: () => true,
                id: docId,
                data: () => {
                    const { _key, collection: _c, docId: _d, ...rest } = cached;
                    return rest;
                },
            };
        }

        try {
            const result = await _apiFetch('GET', `/db/${collection}/${encodeURIComponent(docId)}`);
            await idbSet(collection, docId, result);
            return { exists: () => true, id: result.id, data: () => result };
        } catch (e) {
            if (e.message.includes('Document not found')) {
                return { exists: () => false, data: () => ({}) };
            }
            throw e;
        }
    }

    async function _updateDoc(ref, data) {
        if (!ref) return;
        const { collection, docId } = { collection: ref._collection, docId: ref._docId };
        const result = await _apiFetch('PUT', `/db/${collection}/${encodeURIComponent(docId)}`, data);
        await idbSet(collection, docId, result);
    }

    async function _deleteDoc(ref) {
        if (!ref) return;
        const { collection, docId } = { collection: ref._collection, docId: ref._docId };
        await _apiFetch('DELETE', `/db/${collection}/${encodeURIComponent(docId)}`);
        await idbDelete(collection, docId);
    }

    async function _getDocs(queryOrRef) {
        const collection = queryOrRef?._collection || queryOrRef;
        if (!collection) return { docs: [] };
        try {
            const result = await _apiFetch('GET', `/db/${collection}`);
            const docs = (result.docs || []).map(d => ({
                id:     d.id,
                exists: () => true,
                data:   () => d,
            }));
            return { docs };
        } catch {
            return { docs: [] };
        }
    }

    // Simplified onSnapshot — fetches once then returns a no-op unsubscribe.
    // Real-time sync is deferred to B4 (local app runtime).
    function _onSnapshot(refOrQuery, callback, _errorCb) {
        const run = async () => {
            try {
                if (refOrQuery?._docId) {
                    const snap = await _getDoc(refOrQuery);
                    callback(snap);
                } else {
                    const result = await _getDocs(refOrQuery);
                    callback(result);
                }
            } catch (e) {
                if (typeof _errorCb === 'function') _errorCb(e);
            }
        };
        run();
        return () => {}; // unsubscribe (no-op for local)
    }

    // ── Query builders ────────────────────────────────────────────────────────

    function _collection(_db, path) { return makeCollRef(path); }
    function _doc(_db, ...pathParts) { return makeRef(pathParts.join('/')); }
    function _query(collRef, ...constraints) {
        return { ...collRef, _constraints: constraints };
    }
    function _where(field, op, value) { return { type: 'where', field, op, value }; }
    function _limit(n) { return { type: 'limit', value: n }; }
    function _deleteField() { return { __op: 'deleteField' }; }

    // ── Batch writes ──────────────────────────────────────────────────────────

    function _writeBatch() {
        const ops = [];
        return {
            set:    (ref, data) => { ops.push({ type: 'set', ref, data });    },
            update: (ref, data) => { ops.push({ type: 'update', ref, data }); },
            delete: (ref)       => { ops.push({ type: 'delete', ref });       },
            commit: async () => {
                for (const op of ops) {
                    if (op.type === 'set')    await _setDoc(op.ref, op.data);
                    if (op.type === 'update') await _updateDoc(op.ref, op.data);
                    if (op.type === 'delete') await _deleteDoc(op.ref);
                }
            },
        };
    }

    // ── Auth shims ────────────────────────────────────────────────────────────

    function _signInAnonymously() {
        return Promise.resolve({ user: { uid: 'local-guest', email: 'guest@alloflow.local' } });
    }

    function _onAuthStateChanged(_auth, callback) {
        // Emit stored user immediately, then resolve session from backend
        const storedUser = (() => {
            try { return JSON.parse(localStorage.getItem('alloflow_local_user') || 'null'); }
            catch { return null; }
        })();
        callback(storedUser || { uid: 'local-guest', email: 'guest@alloflow.local' });

        // Then try to restore session from backend token
        const tok = _getToken();
        if (tok) {
            fetch(`${_baseUrl}/auth/session`, {
                headers: { Authorization: `Bearer ${tok}` },
                signal: AbortSignal.timeout(3000),
            })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.user) {
                    callback(data.user);
                    localStorage.setItem('alloflow_local_user', JSON.stringify(data.user));
                    if (global.__alloShared?.setUser) global.__alloShared.setUser(data.user);
                }
            })
            .catch(() => {});
        }

        return () => {}; // unsubscribe
    }

    // ── Session restoration (C2.3) ────────────────────────────────────────────
    // Runs automatically on module load. If a stored token is valid,
    // restores the user session and notifies shared context.

    function _restoreSession(baseUrl) {
        const tok = localStorage.getItem('alloflow_local_token');
        if (!tok) return;
        fetch(`${baseUrl}/auth/session`, {
            headers: { Authorization: `Bearer ${tok}` },
            signal: AbortSignal.timeout(3000),
        })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (data?.user) {
                _token = tok;
                localStorage.setItem('alloflow_local_user', JSON.stringify(data.user));
                if (global.__alloShared?.setUser)       global.__alloShared.setUser(data.user);
                if (global.__alloShared?.setTeacherMode) {
                    global.__alloShared.setTeacherMode(data.user.isTeacher || false);
                }
            }
        })
        .catch(() => {}); // backend may not be running yet — silent fail
    }

    // ── initAlloData — called by the bootstrap shim ───────────────────────────

    /**
     * Initialize the local data provider.
     * Called by the bootstrap shim inside LocalApp.jsx.
     *
     * @param {Object} config
     * @param {string} config.sqliteUrl  - SQLite backend URL (default: http://localhost:3747)
     * @param {Function} [config.debugLog]
     * @param {Function} [config.warnLog]
     * @returns {Promise<DataProvider>}
     */
    async function initAlloData(config = {}) {
        _baseUrl = config.sqliteUrl || global.__alloLocalConfig?.sqliteUrl || 'http://localhost:3747';
        _token   = localStorage.getItem('alloflow_local_token');

        // Verify backend is reachable
        let available = false;
        try {
            const resp = await fetch(`${_baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
            available = resp.ok;
        } catch {
            (config.warnLog || console.warn)('[AlloLocalDB] SQLite backend offline at', _baseUrl);
        }

        // Restore session if token present
        _restoreSession(_baseUrl);

        const provider = {
            backend:  'sqlite-local',
            available,
            baseUrl:  _baseUrl,

            // Direct CRUD methods (used by db_local_module consumers)
            get:    (collection, docId) => _getDoc(makeRef(`${collection}/${docId}`)),
            set:    (collection, docId, data) => _setDoc(makeRef(`${collection}/${docId}`), data),
            update: (collection, docId, data) => _updateDoc(makeRef(`${collection}/${docId}`), data),
            delete: (collection, docId) => _deleteDoc(makeRef(`${collection}/${docId}`)),
            list:   (collection) => _getDocs({ _collection: collection }),

            // Auth helpers
            login:  async (pin, role = 'teacher') => {
                const data = await _apiFetch('POST', '/auth/login', { pin, role });
                if (data.token) {
                    _token = data.token;
                    localStorage.setItem('alloflow_local_token', data.token);
                    localStorage.setItem('alloflow_local_user', JSON.stringify(data.user));
                    if (global.__alloShared?.setUser)       global.__alloShared.setUser(data.user);
                    if (global.__alloShared?.setTeacherMode) {
                        global.__alloShared.setTeacherMode(data.user.isTeacher || false);
                    }
                }
                return data;
            },
            logout: async () => {
                await _apiFetch('POST', '/auth/logout', {}).catch(() => {});
                _token = null;
                localStorage.removeItem('alloflow_local_token');
                localStorage.removeItem('alloflow_local_user');
                if (global.__alloShared?.setUser) global.__alloShared.setUser(null);
            },
            setupPin: (pin) => _apiFetch('POST', '/auth/setup-pin', { pin }),

            // Firestore-compatible shim functions (C2.2)
            // These replace the no-op stubs in the bootstrap shim.
            _shimFunctions: {
                doc:              _doc,
                setDoc:           _setDoc,
                updateDoc:        _updateDoc,
                getDoc:           _getDoc,
                deleteDoc:        _deleteDoc,
                deleteField:      _deleteField,
                onSnapshot:       _onSnapshot,
                collection:       _collection,
                getDocs:          _getDocs,
                query:            _query,
                where:            _where,
                limit:            _limit,
                writeBatch:       _writeBatch,
                signInAnonymously: _signInAnonymously,
                onAuthStateChanged: _onAuthStateChanged,
            },
        };

        // Register with shared context
        if (global.__alloShared?.setDB) global.__alloShared.setDB(provider);
        global.__alloLocalDB = provider;

        return provider;
    }

    // Expose globally so the bootstrap shim can call it
    global.initAlloData = initAlloData;

    // Expose login/logout helpers for UI components
    global.__alloAuth = {
        login:    (...args) => global.__alloLocalDB?.login(...args),
        logout:   ()       => global.__alloLocalDB?.logout(),
        setupPin: (pin)    => global.__alloLocalDB?.setupPin(pin),
        getToken: _getToken,

        // Check if teacher PIN has been set
        async needsSetup() {
            try {
                const baseUrl = global.__alloLocalConfig?.sqliteUrl || 'http://localhost:3747';
                const resp = await fetch(`${baseUrl}/auth/session`, {
                    headers: { Authorization: 'Bearer invalid-probe' },
                    signal: AbortSignal.timeout(2000),
                });
                // 401 with "No active session" = backend running, no session
                // 401 with PIN check = backend running
                return resp.status === 401;
            } catch {
                return false;
            }
        },
    };

})(window);
