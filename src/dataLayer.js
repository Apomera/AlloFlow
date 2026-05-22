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
        // artifacts/{appId}/public/data/sessions/{code}/studentProgress/{studentId}
        match: /^artifacts\/([^/]+)\/public\/data\/sessions\/([^/]+)\/studentProgress\/([^/]+)$/,
        collection: 'student_progress',
        docId: (m) => `${m[2]}__${m[3]}`,
        meta: (m) => ({ session_code: m[2], student_id: m[3] }),
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

/**
 * Flatten a Firestore-style path (e.g. from doc(db, ...segments)) into
 * a PocketBase-compatible { collection, docId, meta } tuple.
 *
 * @param {...string} segments - Path segments (e.g. 'artifacts', appId, 'public', 'data', 'sessions', code)
 * @returns {{ collection: string, docId: string|null, meta: Object }}
 */
function flattenPath(...segments) {
    const fullPath = segments.join('/');
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
    if (segments.length >= 2) {
        return {
            collection: segments[segments.length - 2],
            docId: segments[segments.length - 1],
            meta: {},
        };
    }
    return { collection: segments[0] || 'unknown', docId: null, meta: {} };
}

// ─── Path Parameter Validation (Week 3 Security) ──────────────────────────────
// Validates appId and sessionId/code to prevent path traversal attacks.
// Whitelist: alphanumeric, underscore, hyphen only.
// Throws error if validation fails (fail-safe approach).

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function validatePathParameter(value, paramName) {
    if (typeof value !== 'string') {
        throw new TypeError(`${paramName} must be a string, got ${typeof value}`);
    }
    if (value.length === 0) {
        throw new Error(`${paramName} cannot be empty`);
    }
    if (value.length > 255) {
        throw new Error(`${paramName} exceeds maximum length of 255 characters`);
    }
    if (!SAFE_ID_REGEX.test(value)) {
        throw new Error(`${paramName} contains invalid characters. Only alphanumeric, underscore, and hyphen allowed. Got: ${value}`);
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

    // ── Firestore-compatible shim methods ────────────────────────────────
    // These mirror the Firebase SDK surface so refactoring is minimal.

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   await setDoc(ref, data, options);
     */
    async setDoc(segments, data, options) {
        const { collection, docId, meta } = flattenPath(...segments);
        const enriched = this.backend !== 'firebase'
            ? { ...meta, ...data }
            : data;
        return this.dp.setDoc(collection, docId, enriched, options);
    }

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   await getDoc(ref);
     */
    async getDoc(segments) {
        const { collection, docId } = flattenPath(...segments);
        return this.dp.getDoc(collection, docId);
    }

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   await updateDoc(ref, data);
     */
    async updateDoc(segments, data) {
        const { collection, docId, meta } = flattenPath(...segments);
        const enriched = this.backend !== 'firebase'
            ? { ...meta, ...data }
            : data;
        return this.dp.updateDoc(collection, docId, enriched);
    }

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   await deleteDoc(ref);
     */
    async deleteDoc(segments) {
        const { collection, docId } = flattenPath(...segments);
        return this.dp.deleteDoc(collection, docId);
    }

    /**
     * Drop-in replacement for:
     *   const ref = doc(db, ...segments);
     *   const unsub = onSnapshot(ref, callback);
     */
    onSnapshot(segments, callback) {
        const { collection, docId } = flattenPath(...segments);
        return this.dp.onSnapshot(collection, docId, callback);
    }

    /**
     * Drop-in replacement for collection queries:
     *   const q = query(collection(db, ...segments), where(...), ...);
     *   const snap = await getDocs(q);
     */
    async getDocs(segments, constraints = []) {
        const { collection } = flattenPath(...segments);
        return this.dp.getDocs(collection, constraints);
    }

    /**
     * Drop-in replacement for writeBatch
     */
    async writeBatch(operations) {
        // Flatten paths in each operation
        const flatOps = operations.map(op => {
            if (op.segments) {
                const { collection, docId, meta } = flattenPath(...op.segments);
                return {
                    ...op,
                    collection,
                    docId,
                    data: op.data ? { ...meta, ...op.data } : undefined,
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
        validatePathParameter(appId, 'appId');
        validatePathParameter(code, 'sessionId');
        return this.updateDoc(
            ['artifacts', appId, 'public', 'data', 'sessions', code],
            data
        );
    }

    /** Session-specific shortcut: get session doc */
    async getSession(appId, code) {
        validatePathParameter(appId, 'appId');
        validatePathParameter(code, 'sessionId');
        return this.getDoc(
            ['artifacts', appId, 'public', 'data', 'sessions', code]
        );
    }

    /** Session-specific shortcut: create session doc */
    async createSession(appId, code, data) {
        validatePathParameter(appId, 'appId');
        validatePathParameter(code, 'sessionId');
        return this.setDoc(
            ['artifacts', appId, 'public', 'data', 'sessions', code],
            data
        );
    }

    /** Session-specific shortcut: listen to session changes */
    onSessionSnapshot(appId, code, callback) {
        validatePathParameter(appId, 'appId');
        validatePathParameter(code, 'sessionId');
        return this.onSnapshot(
            ['artifacts', appId, 'public', 'data', 'sessions', code],
            callback
        );
    }

    // ── Static field operations (re-export from DataProvider) ────────────

    static get serverTimestamp() { return DataProvider.serverTimestamp; }
    static get arrayUnion() { return DataProvider.arrayUnion; }
    static get arrayRemove() { return DataProvider.arrayRemove; }
    static get increment() { return DataProvider.increment; }
    static get deleteField() { return DataProvider.deleteField; }
    static get where() { return DataProvider.where; }
    static get orderBy() { return DataProvider.orderBy; }
    static get limit() { return DataProvider.limit; }
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

    if (backend === 'auto') {
        // Step 1: Try PocketBase
        try {
            const health = await fetch(`${pocketbaseUrl}/api/health`, {
                signal: AbortSignal.timeout(2000),
            });
            if (health.ok) {
                resolvedBackend = 'pocketbase';
                debugLog('[AlloData] ✅ PocketBase detected at', pocketbaseUrl);
            }
        } catch {
            debugLog('[AlloData] PocketBase not available, checking Firebase...');
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

    // Create the DataProvider
    const dp = new DataProvider({
        backend: resolvedBackend,
        baseUrl: pocketbaseUrl,
        firebaseApp,
        firestoreDb,
        firebaseAuth,
        debugLog,
        warnLog,
    });

    // Create the high-level API
    const alloData = new AlloData(dp, appId);

    // Expose globally
    window.__alloData = alloData;
    window.__alloDataProvider = dp;

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
