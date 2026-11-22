/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                 AlloFlow Data Layer Bridge — v1.0                      ║
 * ║          Auto-detects backend, flattens Firestore paths               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  This module bridges the gap between AlloFlowANTI.txt's raw Firebase  ║
 * ║  calls and the DataProvider shim. It provides:                        ║
 * ║                                                                        ║
 * ║  1. Auto-detection: PocketBase → Firebase → localStorage              ║
 * ║  2. Path flattening: Firestore nested paths → flat PB collections     ║
 * ║  3. Drop-in replacements for doc(), setDoc(), updateDoc(), etc.       ║
 * ║  4. window.__alloData — global DataProvider instance                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Usage (in AlloFlowANTI.txt):
 *   // Instead of:
 *   //   const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', code);
 *   //   await updateDoc(ref, { mode: 'quiz' });
 *   //
 *   // Use:
 *   //   await alloData.updateSession(appId, code, { mode: 'quiz' });
 */

// ─── Path Flattener ──────────────────────────────────────────────────────────
// Converts Firestore's deeply nested document paths to PocketBase-friendly
// flat collection + compound docId pairs.
//
// Firestore pattern: artifacts/{appId}/public/data/sessions/{code}
// PocketBase result: collection='sessions', docId='{appId}__{code}'

const PATH_PATTERNS = [
    {
        // artifacts/{appId}/public/data/sessions/{code}
        match: /^artifacts\/([^/]+)\/public\/data\/sessions\/([^/]+)$/,
        collection: 'sessions',
        docId: (m) => `${m[1]}__${m[2]}`,
        meta: (m) => ({ app_id: m[1], code: m[2] }),
    },
    {
        // artifacts/{appId}/public/data/sessions (collection query)
        match: /^artifacts\/([^/]+)\/public\/data\/sessions$/,
        collection: 'sessions',
        docId: null,
        meta: (m) => ({ app_id: m[1] }),
    },
    {
        // artifacts/{appId}/public/data/sessions/{code}/studentProgress/{studentId}
        match: /^artifacts\/([^/]+)\/public\/data\/sessions\/([^/]+)\/studentProgress\/([^/]+)$/,
        collection: 'student_progress',
        docId: (m) => `${m[2]}__${m[3]}`,
        meta: (m) => ({ session_code: m[2], student_id: m[3] }),
    },
    {
        // artifacts/{appId}/public/data/sessions/{code}/studentProgress (collection query)
        match: /^artifacts\/([^/]+)\/public\/data\/sessions\/([^/]+)\/studentProgress$/,
        collection: 'student_progress',
        docId: null,
        meta: (m) => ({ session_code: m[2] }),
    },
    {
        // artifacts/{appId}/users/{uid}/data/teacherHistory
        match: /^artifacts\/([^/]+)\/users\/([^/]+)\/data\/teacherHistory$/,
        collection: 'teacher_history',
        docId: (m) => `${m[1]}__${m[2]}`,
        meta: (m) => ({ app_id: m[1], user_id: m[2] }),
    },
    {
        // artifacts/{appId}/public/data/session_assets/{assetId}
        match: /^artifacts\/([^/]+)\/public\/data\/session_assets\/([^/]+)$/,
        collection: 'session_assets',
        docId: (m) => `${m[1]}__${m[2]}`,
        meta: (m) => ({ app_id: m[1], asset_id: m[2] }),
    },
    {
        // apps/{appId}/liveSessions/{code} (legacy path)
        match: /^apps\/([^/]+)\/liveSessions\/([^/]+)$/,
        collection: 'sessions',
        docId: (m) => `${m[1]}__${m[2]}`,
        meta: (m) => ({ app_id: m[1], code: m[2] }),
    },
    {
        // collection(db, 'artifacts', appId, 'public', 'data', ..., 'images')
        match: /^artifacts\/([^/]+)\/.*\/images$/,
        collection: 'images',
        docId: null, // collection-level query
        meta: (m) => ({ app_id: m[1] }),
    },
];

function _resolveDataProviderCtor() {
    if (typeof DataProvider !== 'undefined') return DataProvider;
    if (typeof globalThis !== 'undefined' && globalThis.DataProvider) return globalThis.DataProvider;
    if (typeof require === 'function') {
        try {
            const mod = require('./dataProvider.js');
            if (mod && mod.DataProvider) return mod.DataProvider;
        } catch (_) {}
    }
    throw new Error('DataProvider is not loaded');
}

function _validatePathSegments(segments) {
    if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error('DataLayer path must contain at least one segment');
    }
    const clean = [];
    for (const seg of segments) {
        const s = typeof seg === 'string' ? seg : String(seg == null ? '' : seg);
        if (!s || s === '.' || s === '..' || s.includes('/') || s.includes('\\') || s.includes('..') || /[\u0000-\u001f\u007f]/.test(s)) {
            throw new Error(`Invalid DataLayer path segment: ${JSON.stringify(seg)}`);
        }
        clean.push(s);
    }
    return clean;
}

/**
 * Flatten a Firestore-style path (e.g. from doc(db, ...segments)) into
 * a PocketBase-compatible { collection, docId, meta } tuple.
 *
 * @param {...string} segments - Path segments (e.g. 'artifacts', appId, 'public', 'data', 'sessions', code)
 * @returns {{ collection: string, docId: string|null, meta: Object }}
 */
function flattenPath(...segments) {
    const clean = _validatePathSegments(segments);
    const fullPath = clean.join('/');
    for (const pattern of PATH_PATTERNS) {
        const m = fullPath.match(pattern.match);
        if (m) {
            return {
                collection: pattern.collection,
                docId: pattern.docId ? pattern.docId(m) : null,
                meta: pattern.meta(m),
            };
        }
    }
    // Fallback: use last two segments as collection/docId
    if (clean.length >= 2) {
        return {
            collection: clean[clean.length - 2],
            docId: clean[clean.length - 1],
            meta: {},
        };
    }
    return { collection: clean[0] || 'unknown', docId: null, meta: {} };
}

function _safeHttpBaseUrl(raw) {
    if (typeof raw !== 'string') return '';
    try {
        const parsed = new URL(raw.trim());
        if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password || parsed.search || parsed.hash) {
            return '';
        }
        return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
    } catch {
        return '';
    }
}

// ─── AlloData High-Level API ─────────────────────────────────────────────────
// Wraps the raw DataProvider with convenience methods that handle path
// flattening transparently, so the main app doesn't need to change its
// data model — just swap the function calls.

class AlloData {
    /**
     * @param {Object} dataProvider - A DataProvider instance (from dataProvider.js)
     * @param {string} [defaultAppId] - Default app ID for path construction
     */
    constructor(dataProvider, defaultAppId = 'default-app-id') {
        this.dp = dataProvider;
        this.appId = defaultAppId;
        this.backend = dataProvider?.backend || 'unknown';
    }

    _resolveTarget(segments, isCollectionQuery = false) {
        const clean = _validatePathSegments(segments);
        if (this.backend === 'firebase') {
            if (isCollectionQuery || clean.length % 2 === 1) {
                return { collection: clean.join('/'), docId: null, meta: {} };
            }
            return {
                collection: clean.slice(0, -1).join('/'),
                docId: clean[clean.length - 1],
                meta: {},
            };
        }
        const joined = clean.join('/');
        for (const pattern of PATH_PATTERNS) {
            const m = joined.match(pattern.match);
            if (m) {
                return {
                    collection: pattern.collection,
                    docId: pattern.docId ? pattern.docId(m) : null,
                    meta: pattern.meta(m),
                };
            }
        }
        if (isCollectionQuery) {
            return { collection: clean[clean.length - 1] || 'unknown', docId: null, meta: {} };
        }
        return flattenPath(...clean);
    }

    // ── Firestore-compatible shim methods ────────────────────────────────
    // These mirror the Firebase SDK surface so refactoring is minimal.

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   await setDoc(ref, data, options);
     */
    async setDoc(segments, data, options) {
        const { collection, docId, meta } = this._resolveTarget(segments, false);
        if (!docId) throw new Error('Document path required for setDoc');
        const enriched = this.backend !== 'firebase'
            ? { ...(data && typeof data === 'object' ? data : {}), ...meta }
            : data;
        return this.dp.setDoc(collection, docId, enriched, options);
    }

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   await getDoc(ref);
     */
    async getDoc(segments) {
        const { collection, docId } = this._resolveTarget(segments, false);
        if (!docId) throw new Error('Document path required for getDoc');
        return this.dp.getDoc(collection, docId);
    }

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   await updateDoc(ref, data);
     */
    async updateDoc(segments, data) {
        const { collection, docId, meta } = this._resolveTarget(segments, false);
        if (!docId) throw new Error('Document path required for updateDoc');
        const enriched = this.backend !== 'firebase'
            ? { ...(data && typeof data === 'object' ? data : {}), ...meta }
            : data;
        return this.dp.updateDoc(collection, docId, enriched);
    }

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   await deleteDoc(ref);
     */
    async deleteDoc(segments) {
        const { collection, docId } = this._resolveTarget(segments, false);
        if (!docId) throw new Error('Document path required for deleteDoc');
        return this.dp.deleteDoc(collection, docId);
    }

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   const unsub = onSnapshot(ref, callback);
     */
    onSnapshot(segments, callback) {
        const { collection, docId, meta } = this._resolveTarget(segments, false);
        const metaEntries = this.backend !== 'firebase' && !docId && meta && typeof meta === 'object'
            ? Object.entries(meta)
            : [];
        if (metaEntries.length > 0 && typeof callback === 'function') {
            const scopedCallback = (snapshot) => {
                if (Array.isArray(snapshot)) {
                    const filtered = snapshot.filter((doc) => doc && typeof doc === 'object' && metaEntries.every(
                        ([k, v]) => Object.prototype.hasOwnProperty.call(doc, k) && doc[k] === v
                    ));
                    return callback(filtered);
                }
                return callback(snapshot);
            };
            return this.dp.onSnapshot(collection, docId, scopedCallback);
        }
        return this.dp.onSnapshot(collection, docId, callback);
    }

    /**
     * Drop-in replacement for collection queries:
     *   const q = query(collection(db, ...segments), where(...), ...);
     *   const snap = await getDocs(q);
     */
    async getDocs(segments, constraints = []) {
        const { collection, meta } = this._resolveTarget(segments, true);
        const list = Array.isArray(constraints) ? constraints.slice() : [];
        if (this.backend !== 'firebase' && meta && typeof meta === 'object') {
            const metaConstraints = Object.entries(meta).map(([field, value]) => ({
                type: 'where',
                field,
                op: '==',
                value,
            }));
            return this.dp.getDocs(collection, [...metaConstraints, ...list]);
        }
        return this.dp.getDocs(collection, list);
    }

    /**
     * Drop-in replacement for writeBatch
     */
    async writeBatch(operations) {
        // Flatten paths in each operation
        const flatOps = operations.map(op => {
            if (op.segments) {
                const { collection, docId, meta } = this._resolveTarget(op.segments, false);
                return {
                    ...op,
                    collection,
                    docId,
                    data: op.data
                        ? (this.backend !== 'firebase' ? { ...op.data, ...meta } : op.data)
                        : undefined,
                };
            }
            return op;
        });
        return this.dp.writeBatch(flatOps);
    }

    // ── Auth pass-through ────────────────────────────────────────────────

    async signInAnonymously() {
        return this.dp.signInAnonymously();
    }

    onAuthStateChanged(callback) {
        return this.dp.onAuthStateChanged(callback);
    }

    getCurrentUser() {
        return this.dp.getCurrentUser();
    }

    async testConnection() {
        return this.dp.testConnection();
    }

    // ── Convenience accessors ────────────────────────────────────────────

    /** Session-specific shortcut (most common pattern in the codebase) */
    async updateSession(appId, code, data) {
        return this.updateDoc(
            ['artifacts', appId, 'public', 'data', 'sessions', code],
            data
        );
    }

    /** Session-specific shortcut: get session doc */
    async getSession(appId, code) {
        return this.getDoc(
            ['artifacts', appId, 'public', 'data', 'sessions', code]
        );
    }

    /** Session-specific shortcut: create session doc */
    async createSession(appId, code, data) {
        return this.setDoc(
            ['artifacts', appId, 'public', 'data', 'sessions', code],
            data
        );
    }

    /** Session-specific shortcut: listen to session changes */
    onSessionSnapshot(appId, code, callback) {
        return this.onSnapshot(
            ['artifacts', appId, 'public', 'data', 'sessions', code],
            callback
        );
    }

    // ── Static field operations (re-export from DataProvider) ────────────

    static get serverTimestamp() { return _resolveDataProviderCtor().serverTimestamp; }
    static get arrayUnion() { return _resolveDataProviderCtor().arrayUnion; }
    static get arrayRemove() { return _resolveDataProviderCtor().arrayRemove; }
    static get increment() { return _resolveDataProviderCtor().increment; }
    static get deleteField() { return _resolveDataProviderCtor().deleteField; }
    static get where() { return _resolveDataProviderCtor().where; }
    static get orderBy() { return _resolveDataProviderCtor().orderBy; }
    static get limit() { return _resolveDataProviderCtor().limit; }
}


// ─── Backend Auto-Detection & Initialization ─────────────────────────────────
// This runs at module load time. It pings PocketBase, falls back to Firebase
// config, and finally to localStorage.

async function initAlloData(config = {}) {
    const {
        backend = 'auto',
        pocketbaseUrl = 'http://localhost:8090',
        firebaseApp = null,
        firestoreDb = null,
        firebaseAuth = null,
        appId = 'default-app-id',
        debugLog = () => {},
        warnLog = console.warn,
    } = config;

    let resolvedBackend = backend;
    const safePbUrl = _safeHttpBaseUrl(pocketbaseUrl);

    if (backend === 'auto') {
        // Step 1: Try PocketBase
        if (safePbUrl) {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), 2000) : null;
            try {
                const health = await fetch(`${safePbUrl}/api/health`, {
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer',
                    signal: controller ? controller.signal : undefined,
                });
                try { await health?.body?.cancel?.(); } catch (_) {}
                if (health && health.ok) {
                    resolvedBackend = 'pocketbase';
                    debugLog('[AlloData] ✅ PocketBase detected at', safePbUrl);
                }
            } catch {
                debugLog('[AlloData] PocketBase not available, checking Firebase...');
            } finally {
                if (timer) clearTimeout(timer);
            }
        }

        // Step 2: Try Firebase
        if (resolvedBackend === 'auto' && firestoreDb) {
            resolvedBackend = 'firebase';
            debugLog('[AlloData] ✅ Firebase configured');
        }

        // Step 3: Fallback to localStorage
        if (resolvedBackend === 'auto') {
            resolvedBackend = 'local';
            debugLog('[AlloData] ⚠️ No remote backend — using localStorage');
        }
    }

    if (resolvedBackend === 'pocketbase' && !safePbUrl) {
        throw new Error('PocketBase backend requires a valid http(s) baseUrl without credentials, query, or fragment.');
    }

    // Create the DataProvider
    const DataProviderCtor = _resolveDataProviderCtor();
    const dp = new DataProviderCtor({
        backend: resolvedBackend,
        baseUrl: safePbUrl || undefined,
        firebaseApp,
        firestoreDb,
        firebaseAuth,
        debugLog,
        warnLog,
    });

    // Create the high-level API
    const alloData = new AlloData(dp, appId);

    // Expose globally in browser environments
    if (typeof window !== 'undefined') {
        window.__alloData = alloData;
        window.__alloDataProvider = dp;
    }

    debugLog(`[AlloData] Initialized: backend=${resolvedBackend}`);

    return alloData;
}


// ─── Exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AlloData, initAlloData, flattenPath, PATH_PATTERNS };
}

// Also expose on window for CDN/script-tag usage
if (typeof window !== 'undefined') {
    window.AlloData = AlloData;
    window.initAlloData = initAlloData;
    window.flattenPath = flattenPath;
}
