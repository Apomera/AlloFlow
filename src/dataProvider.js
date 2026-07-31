/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                   AlloFlow DataProvider — v1.0                         ║
 * ║              Backend-Agnostic Data Abstraction Layer                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Mirrors firebase/firestore API surface with pluggable backends:       ║
 * ║  • Firebase/Firestore (default — zero migration needed)               ║
 * ║  • PocketBase (self-hosted, open-source, single binary)               ║
 * ║  • localStorage (offline-only fallback, no server needed)             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Provides:                                                             ║
 * ║    • CRUD: setDoc, getDoc, updateDoc, deleteDoc, getDocs              ║
 * ║    • Queries: where, orderBy, limit                                    ║
 * ║    • Real-time: onSnapshot (SSE for PocketBase, polling for local)    ║
 * ║    • Batch: writeBatch                                                 ║
 * ║    • Auth: signInAnonymously, onAuthStateChanged                      ║
 * ║    • Field ops: serverTimestamp, arrayUnion, arrayRemove, increment   ║
 * ║    • Sessions: 4-digit session codes for live teacher-student sync    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ─── Secure Random ──────────────────────────────────────────────────────────
// Credentials and session codes must not come from Math.random(): it is seeded from
// predictable state and is not a CSPRNG, so anonymous-account passwords and live-session
// codes generated from it are guessable. Uses WebCrypto in the browser, node:crypto under
// Node, and throws rather than silently degrading to a weak fallback.
const _webcrypto = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues)
    ? globalThis.crypto
    : (() => { try { return require('crypto').webcrypto; } catch (_) { return null; } })();

// getRandomValues rejects requests over 65,536 bytes, so fill in chunks.
function _randomBytes(count) {
    if (!_webcrypto) throw new Error('No CSPRNG available: cannot generate credentials securely.');
    const out = new Uint8Array(count);
    for (let offset = 0; offset < count; offset += 65536) {
        _webcrypto.getRandomValues(out.subarray(offset, Math.min(offset + 65536, count)));
    }
    return out;
}

// Uniform over `alphabet` via rejection sampling — modulo would bias toward early characters.
function _secureString(length, alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    const max = Math.floor(256 / alphabet.length) * alphabet.length;
    let out = '';
    while (out.length < length) {
        for (const byte of _randomBytes(length - out.length + 8)) {
            if (byte >= max) continue;
            out += alphabet[byte % alphabet.length];
            if (out.length === length) break;
        }
    }
    return out;
}

// Uniform integer in [min, max] inclusive.
function _secureInt(min, max) {
    const range = max - min + 1;
    const limit = Math.floor(4294967296 / range) * range;
    for (;;) {
        const b = _randomBytes(4);
        const n = ((b[0] << 24) >>> 0) + (b[1] << 16) + (b[2] << 8) + b[3];
        if (n < limit) return min + (n % range);
    }
}

// ─── Field Operation Sentinels ──────────────────────────────────────────────
// These are sentinel objects used to represent Firestore field operations.
// Each backend adapter interprets them during write operations.
const _FIELD_OPS = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    arrayUnion: (...elements) => ({ __op: 'arrayUnion', elements }),
    arrayRemove: (...elements) => ({ __op: 'arrayRemove', elements }),
    increment: (n) => ({ __op: 'increment', value: n }),
    deleteField: () => ({ __op: 'deleteField' }),
};

// ─── Query Constraint Builders ──────────────────────────────────────────────
const _queryConstraint = {
    where: (field, op, value) => ({ type: 'where', field, op, value }),
    orderBy: (field, direction = 'asc') => ({ type: 'orderBy', field, direction }),
    limit: (n) => ({ type: 'limit', value: n }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Firebase Adapter — wraps actual Firebase SDK (zero-cost when already used)
// ═══════════════════════════════════════════════════════════════════════════
class FirebaseAdapter {
    constructor(firebaseApp, firestoreDb, firebaseAuth) {
        this.app = firebaseApp;
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        // Lazy-load Firebase SDK functions
        this._sdk = null;
    }

    _getSDK() {
        if (this._sdk) return this._sdk;
        // These are already imported in AlloFlowANTI.txt — we reference them
        // directly from the firebase/firestore module
        const firestore = require('firebase/firestore');
        const auth = require('firebase/auth');
        this._sdk = { ...firestore, ...auth };
        return this._sdk;
    }

    async setDoc(collectionPath, docId, data, options = {}) {
        const sdk = this._getSDK();
        const ref = sdk.doc(this.db, collectionPath, docId);
        return sdk.setDoc(ref, this._resolveFieldOps(data), options);
    }

    async getDoc(collectionPath, docId) {
        const sdk = this._getSDK();
        const ref = sdk.doc(this.db, collectionPath, docId);
        const snap = await sdk.getDoc(ref);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    }

    async updateDoc(collectionPath, docId, data) {
        const sdk = this._getSDK();
        const ref = sdk.doc(this.db, collectionPath, docId);
        return sdk.updateDoc(ref, this._resolveFieldOps(data));
    }

    async deleteDoc(collectionPath, docId) {
        const sdk = this._getSDK();
        const ref = sdk.doc(this.db, collectionPath, docId);
        return sdk.deleteDoc(ref);
    }

    async getDocs(collectionPath, constraints = []) {
        const sdk = this._getSDK();
        let ref = sdk.collection(this.db, collectionPath);
        const queryConstraints = constraints.map(c => {
            if (c.type === 'where') return sdk.where(c.field, c.op, c.value);
            if (c.type === 'orderBy') return sdk.orderBy(c.field, c.direction);
            if (c.type === 'limit') return sdk.limit(c.value);
            return null;
        }).filter(Boolean);
        const q = queryConstraints.length > 0 ? sdk.query(ref, ...queryConstraints) : ref;
        const snap = await sdk.getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    onSnapshot(collectionPath, docId, callback) {
        const sdk = this._getSDK();
        const ref = docId
            ? sdk.doc(this.db, collectionPath, docId)
            : sdk.collection(this.db, collectionPath);
        return sdk.onSnapshot(ref, (snap) => {
            if (snap.docs) {
                // Collection snapshot
                callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                // Document snapshot
                callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
            }
        });
    }

    async writeBatch(operations) {
        const sdk = this._getSDK();
        const batch = sdk.writeBatch(this.db);
        for (const op of operations) {
            const ref = sdk.doc(this.db, op.collection, op.docId);
            if (op.type === 'set') batch.set(ref, this._resolveFieldOps(op.data), op.options || {});
            else if (op.type === 'update') batch.update(ref, this._resolveFieldOps(op.data));
            else if (op.type === 'delete') batch.delete(ref);
        }
        return batch.commit();
    }

    async signInAnonymously() {
        const sdk = this._getSDK();
        return sdk.signInAnonymously(this.auth);
    }

    onAuthStateChanged(callback) {
        const sdk = this._getSDK();
        return sdk.onAuthStateChanged(this.auth, callback);
    }

    getCurrentUser() {
        return this.auth?.currentUser || null;
    }

    // Resolve sentinel field operations to Firebase SDK equivalents
    _resolveFieldOps(data) {
        if (!data || typeof data !== 'object') return data;
        const sdk = this._getSDK();
        const resolved = {};
        for (const [key, value] of Object.entries(data)) {
            if (value && value.__op) {
                switch (value.__op) {
                    case 'serverTimestamp': resolved[key] = sdk.serverTimestamp(); break;
                    case 'arrayUnion': resolved[key] = sdk.arrayUnion(...value.elements); break;
                    case 'arrayRemove': resolved[key] = sdk.arrayRemove(...value.elements); break;
                    case 'increment': resolved[key] = sdk.increment(value.value); break;
                    case 'deleteField': resolved[key] = sdk.deleteField(); break;
                    default: resolved[key] = value;
                }
            } else if (Array.isArray(value)) {
                resolved[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                resolved[key] = this._resolveFieldOps(value);
            } else {
                resolved[key] = value;
            }
        }
        return resolved;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PocketBase Adapter — self-hosted, single-binary backend
// ═══════════════════════════════════════════════════════════════════════════
class PocketBaseAdapter {
    constructor({ baseUrl = 'http://localhost:8090', debugLog, warnLog }) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.debugLog = debugLog || console.log;
        this.warnLog = warnLog || console.warn;
        this._authToken = null;
        this._userId = null;
        this._authCallbacks = [];
        this._subscriptions = new Map();
    }

    async _fetch(path, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (this._authToken) headers['Authorization'] = `Bearer ${this._authToken}`;
        const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`PocketBase ${res.status}: ${err.message || JSON.stringify(err)}`);
        }
        return res.status === 204 ? null : res.json();
    }

    // Map Firestore collection names → PocketBase collection names
    _col(collectionPath) { return collectionPath; }

    async setDoc(collectionPath, docId, data, options = {}) {
        const resolved = this._resolveFieldOps(data);
        resolved.id = docId; // PocketBase uses 'id' field
        try {
            // Try update first, create if not exists
            await this._fetch(`/api/collections/${this._col(collectionPath)}/records/${docId}`, {
                method: 'PATCH', body: JSON.stringify(resolved),
            });
        } catch {
            // Record doesn't exist, create it
            await this._fetch(`/api/collections/${this._col(collectionPath)}/records`, {
                method: 'POST', body: JSON.stringify(resolved),
            });
        }
    }

    async getDoc(collectionPath, docId) {
        try {
            const record = await this._fetch(`/api/collections/${this._col(collectionPath)}/records/${docId}`);
            return record ? { id: record.id, ...record } : null;
        } catch {
            return null;
        }
    }

    async updateDoc(collectionPath, docId, data) {
        const resolved = this._resolveFieldOps(data);
        return this._fetch(`/api/collections/${this._col(collectionPath)}/records/${docId}`, {
            method: 'PATCH', body: JSON.stringify(resolved),
        });
    }

    async deleteDoc(collectionPath, docId) {
        return this._fetch(`/api/collections/${this._col(collectionPath)}/records/${docId}`, {
            method: 'DELETE',
        });
    }

    async getDocs(collectionPath, constraints = []) {
        const params = new URLSearchParams();
        const filters = [];
        let sort = '';
        let perPage = 500;

        for (const c of constraints) {
            if (c.type === 'where') {
                const opMap = { '==': '=', '!=': '!=', '<': '<', '<=': '<=', '>': '>', '>=': '>=', 'array-contains': '~' };
                filters.push(`${c.field}${opMap[c.op] || '='}${JSON.stringify(c.value)}`);
            } else if (c.type === 'orderBy') {
                sort = c.direction === 'desc' ? `-${c.field}` : c.field;
            } else if (c.type === 'limit') {
                perPage = c.value;
            }
        }

        if (filters.length) params.set('filter', filters.join(' && '));
        if (sort) params.set('sort', sort);
        params.set('perPage', String(perPage));

        const result = await this._fetch(`/api/collections/${this._col(collectionPath)}/records?${params}`);
        return (result.items || []).map(r => ({ id: r.id, ...r }));
    }

    onSnapshot(collectionPath, docId, callback) {
        // PocketBase supports SSE (Server-Sent Events) for real-time
        const url = `${this.baseUrl}/api/realtime`;
        let eventSource;

        try {
            eventSource = new EventSource(url);
            const topic = docId
                ? `${this._col(collectionPath)}/${docId}`
                : this._col(collectionPath);

            eventSource.addEventListener('PB_CONNECT', (e) => {
                const data = JSON.parse(e.data);
                // Subscribe to the specific topic
                fetch(`${this.baseUrl}/api/realtime`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: data.id, subscriptions: [topic] }),
                }).catch(err => this.warnLog('[DataProvider] SSE subscribe error:', err));
            });

            eventSource.addEventListener(topic, (e) => {
                const data = JSON.parse(e.data);
                if (docId) {
                    callback(data.record ? { id: data.record.id, ...data.record } : null);
                } else {
                    // For collection subscriptions, re-fetch the full list
                    this.getDocs(collectionPath).then(callback).catch(err =>
                        this.warnLog('[DataProvider] SSE collection refresh error:', err)
                    );
                }
            });

            eventSource.onerror = () => {
                this.warnLog('[DataProvider] SSE connection error — will auto-reconnect');
            };
        } catch (err) {
            this.warnLog('[DataProvider] SSE not available, falling back to polling');
            // Fallback: poll every 3 seconds
            const interval = setInterval(async () => {
                try {
                    if (docId) {
                        const doc = await this.getDoc(collectionPath, docId);
                        callback(doc);
                    } else {
                        const docs = await this.getDocs(collectionPath);
                        callback(docs);
                    }
                } catch (err) {
                    this.warnLog('[DataProvider] Polling error:', err);
                }
            }, 3000);
            return () => clearInterval(interval);
        }

        // Return unsubscribe function
        return () => {
            if (eventSource) eventSource.close();
        };
    }

    async writeBatch(operations) {
        // PocketBase doesn't have native batch writes — execute sequentially
        for (const op of operations) {
            if (op.type === 'set') await this.setDoc(op.collection, op.docId, op.data, op.options);
            else if (op.type === 'update') await this.updateDoc(op.collection, op.docId, op.data);
            else if (op.type === 'delete') await this.deleteDoc(op.collection, op.docId);
        }
    }

    async signInAnonymously() {
        // PocketBase: create an anonymous user via the users collection
        try {
            const uid = 'anon_' + _secureString(10);
            const password = _secureString(32);
            // Create user
            await this._fetch('/api/collections/users/records', {
                method: 'POST',
                body: JSON.stringify({
                    username: uid,
                    password: password,
                    passwordConfirm: password,
                    isAnonymous: true,
                }),
            });
            // Auth with new user
            const authResult = await this._fetch('/api/collections/users/auth-with-password', {
                method: 'POST',
                body: JSON.stringify({ identity: uid, password }),
            });
            this._authToken = authResult.token;
            this._userId = authResult.record.id;
            this._notifyAuthCallbacks({ uid: this._userId, isAnonymous: true });
            return { user: { uid: this._userId, isAnonymous: true } };
        } catch (err) {
            this.warnLog('[DataProvider] Anonymous sign-in failed:', err);
            // Fallback: use a local-only ID
            this._userId = 'local_' + Date.now();
            this._notifyAuthCallbacks({ uid: this._userId, isAnonymous: true });
            return { user: { uid: this._userId, isAnonymous: true } };
        }
    }

    onAuthStateChanged(callback) {
        this._authCallbacks.push(callback);
        // Immediately notify with current state
        if (this._userId) {
            callback({ uid: this._userId, isAnonymous: true });
        } else {
            callback(null);
        }
        // Return unsubscribe
        return () => {
            this._authCallbacks = this._authCallbacks.filter(cb => cb !== callback);
        };
    }

    getCurrentUser() {
        return this._userId ? { uid: this._userId, isAnonymous: true } : null;
    }

    _notifyAuthCallbacks(user) {
        for (const cb of this._authCallbacks) {
            try { cb(user); } catch { }
        }
    }

    _resolveFieldOps(data) {
        if (!data || typeof data !== 'object') return data;
        const resolved = {};
        for (const [key, value] of Object.entries(data)) {
            if (value && value.__op) {
                switch (value.__op) {
                    case 'serverTimestamp': resolved[key] = new Date().toISOString(); break;
                    case 'arrayUnion':
                        // PocketBase: handled via JSON+ append — just set the value for now
                        resolved[`${key}+`] = value.elements;
                        break;
                    case 'arrayRemove':
                        resolved[`${key}-`] = value.elements;
                        break;
                    case 'increment':
                        resolved[`${key}+`] = value.value;
                        break;
                    case 'deleteField':
                        resolved[key] = null; // PocketBase: set to null to remove
                        break;
                    default: resolved[key] = value;
                }
            } else if (Array.isArray(value)) {
                resolved[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                resolved[key] = this._resolveFieldOps(value);
            } else {
                resolved[key] = value;
            }
        }
        return resolved;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// LocalStorage Adapter — fully offline, no server needed
// ═══════════════════════════════════════════════════════════════════════════
class LocalStorageAdapter {
    constructor({ debugLog, warnLog }) {
        this.debugLog = debugLog || console.log;
        this.warnLog = warnLog || console.warn;
        this._prefix = 'alloflow_data_';
        this._userId = null;
        this._authCallbacks = [];
        this._subscriptions = new Map();
    }

    _key(collection, docId) { return `${this._prefix}${collection}__${docId}`; }
    _collPrefix(collection) { return `${this._prefix}${collection}__`; }

    async setDoc(collectionPath, docId, data) {
        const resolved = this._resolveFieldOps(data, collectionPath, docId);
        localStorage.setItem(this._key(collectionPath, docId), JSON.stringify(resolved));
        this._notifySubscribers(collectionPath, docId);
    }

    async getDoc(collectionPath, docId) {
        const raw = localStorage.getItem(this._key(collectionPath, docId));
        return raw ? { id: docId, ...JSON.parse(raw) } : null;
    }

    async updateDoc(collectionPath, docId, data) {
        const existing = await this.getDoc(collectionPath, docId);
        if (!existing) throw new Error(`Document ${collectionPath}/${docId} not found`);
        const resolved = this._resolveFieldOps(data, collectionPath, docId);
        const merged = { ...existing, ...resolved, id: docId };
        localStorage.setItem(this._key(collectionPath, docId), JSON.stringify(merged));
        this._notifySubscribers(collectionPath, docId);
    }

    async deleteDoc(collectionPath, docId) {
        localStorage.removeItem(this._key(collectionPath, docId));
        this._notifySubscribers(collectionPath, docId);
    }

    async getDocs(collectionPath, constraints = []) {
        const prefix = this._collPrefix(collectionPath);
        const results = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                const docId = key.substring(prefix.length);
                const data = JSON.parse(localStorage.getItem(key));
                results.push({ id: docId, ...data });
            }
        }
        // Apply constraints
        let filtered = results;
        for (const c of constraints) {
            if (c.type === 'where') {
                filtered = filtered.filter(doc => {
                    const val = doc[c.field];
                    switch (c.op) {
                        case '==': return val === c.value;
                        case '!=': return val !== c.value;
                        case '<': return val < c.value;
                        case '<=': return val <= c.value;
                        case '>': return val > c.value;
                        case '>=': return val >= c.value;
                        case 'array-contains': return Array.isArray(val) && val.includes(c.value);
                        default: return true;
                    }
                });
            } else if (c.type === 'orderBy') {
                filtered.sort((a, b) => {
                    const aVal = a[c.field], bVal = b[c.field];
                    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                    return c.direction === 'desc' ? -cmp : cmp;
                });
            } else if (c.type === 'limit') {
                filtered = filtered.slice(0, c.value);
            }
        }
        return filtered;
    }

    onSnapshot(collectionPath, docId, callback) {
        const key = docId ? `${collectionPath}/${docId}` : collectionPath;
        const handler = async () => {
            if (docId) {
                callback(await this.getDoc(collectionPath, docId));
            } else {
                callback(await this.getDocs(collectionPath));
            }
        };
        // Initial call
        handler();
        // Store subscription
        if (!this._subscriptions.has(key)) this._subscriptions.set(key, []);
        this._subscriptions.get(key).push(handler);
        // Return unsubscribe
        return () => {
            const subs = this._subscriptions.get(key);
            if (subs) {
                this._subscriptions.set(key, subs.filter(h => h !== handler));
            }
        };
    }

    _notifySubscribers(collectionPath, docId) {
        // Notify document-level subscribers
        const docKey = `${collectionPath}/${docId}`;
        (this._subscriptions.get(docKey) || []).forEach(h => h());
        // Notify collection-level subscribers
        (this._subscriptions.get(collectionPath) || []).forEach(h => h());
    }

    async writeBatch(operations) {
        for (const op of operations) {
            if (op.type === 'set') await this.setDoc(op.collection, op.docId, op.data);
            else if (op.type === 'update') await this.updateDoc(op.collection, op.docId, op.data);
            else if (op.type === 'delete') await this.deleteDoc(op.collection, op.docId);
        }
    }

    async signInAnonymously() {
        this._userId = localStorage.getItem('alloflow_anon_uid') || ('local_' + Date.now());
        localStorage.setItem('alloflow_anon_uid', this._userId);
        const user = { uid: this._userId, isAnonymous: true };
        this._notifyAuthCallbacks(user);
        return { user };
    }

    onAuthStateChanged(callback) {
        this._authCallbacks.push(callback);
        if (this._userId) callback({ uid: this._userId, isAnonymous: true });
        else callback(null);
        return () => { this._authCallbacks = this._authCallbacks.filter(cb => cb !== callback); };
    }

    getCurrentUser() {
        return this._userId ? { uid: this._userId, isAnonymous: true } : null;
    }

    _notifyAuthCallbacks(user) {
        for (const cb of this._authCallbacks) { try { cb(user); } catch { } }
    }

    _resolveFieldOps(data, collectionPath, docId) {
        if (!data || typeof data !== 'object') return data;
        const resolved = {};
        for (const [key, value] of Object.entries(data)) {
            if (value && value.__op) {
                switch (value.__op) {
                    case 'serverTimestamp': resolved[key] = new Date().toISOString(); break;
                    case 'arrayUnion': {
                        const existing = JSON.parse(localStorage.getItem(this._key(collectionPath, docId)) || '{}');
                        const arr = Array.isArray(existing[key]) ? existing[key] : [];
                        resolved[key] = [...new Set([...arr, ...value.elements])];
                        break;
                    }
                    case 'arrayRemove': {
                        const existing2 = JSON.parse(localStorage.getItem(this._key(collectionPath, docId)) || '{}');
                        const arr2 = Array.isArray(existing2[key]) ? existing2[key] : [];
                        resolved[key] = arr2.filter(el => !value.elements.includes(el));
                        break;
                    }
                    case 'increment': {
                        const existing3 = JSON.parse(localStorage.getItem(this._key(collectionPath, docId)) || '{}');
                        resolved[key] = (existing3[key] || 0) + value.value;
                        break;
                    }
                    case 'deleteField': break; // Omit from result
                    default: resolved[key] = value;
                }
            } else if (Array.isArray(value)) {
                resolved[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                resolved[key] = this._resolveFieldOps(value, collectionPath, docId);
            } else {
                resolved[key] = value;
            }
        }
        return resolved;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DataProvider — main entry point
// ═══════════════════════════════════════════════════════════════════════════
class DataProvider {
    /**
     * @param {Object} config
     * @param {string} config.backend - 'firebase' | 'pocketbase' | 'local'
     * @param {Object} [config.firebaseApp] - Firebase app instance (for firebase backend)
     * @param {Object} [config.firestoreDb] - Firestore db instance (for firebase backend)
     * @param {Object} [config.firebaseAuth] - Firebase auth instance (for firebase backend)
     * @param {string} [config.baseUrl] - PocketBase server URL
     * @param {boolean} [config.isCanvasEnv] - Whether running in Canvas mode
     * @param {Function} [config.debugLog] - Debug logging function
     * @param {Function} [config.warnLog] - Warning logging function
     */
    constructor(config) {
        this.backend = config.backend || 'firebase';
        this.isCanvasEnv = config.isCanvasEnv || false;
        this.debugLog = config.debugLog || console.log;
        this.warnLog = config.warnLog || console.warn;

        switch (this.backend) {
            case 'firebase':
                this._adapter = new FirebaseAdapter(config.firebaseApp, config.firestoreDb, config.firebaseAuth);
                break;
            case 'pocketbase':
                this._adapter = new PocketBaseAdapter({
                    baseUrl: config.baseUrl || 'http://localhost:8090',
                    debugLog: this.debugLog,
                    warnLog: this.warnLog,
                });
                break;
            case 'local':
                this._adapter = new LocalStorageAdapter({
                    debugLog: this.debugLog,
                    warnLog: this.warnLog,
                });
                break;
            default:
                this.warnLog(`[DataProvider] Unknown backend "${this.backend}", falling back to local`);
                this._adapter = new LocalStorageAdapter({
                    debugLog: this.debugLog,
                    warnLog: this.warnLog,
                });
        }
        this.debugLog(`[DataProvider] Initialized with backend: ${this.backend}`);
    }

    // ─── CRUD ──────────────────────────────────────────────────────────────
    async setDoc(collection, docId, data, options) {
        return this._adapter.setDoc(collection, docId, data, options);
    }

    async getDoc(collection, docId) {
        return this._adapter.getDoc(collection, docId);
    }

    async updateDoc(collection, docId, data) {
        return this._adapter.updateDoc(collection, docId, data);
    }

    async deleteDoc(collection, docId) {
        return this._adapter.deleteDoc(collection, docId);
    }

    async getDocs(collection, constraints = []) {
        return this._adapter.getDocs(collection, constraints);
    }

    // ─── Real-Time ─────────────────────────────────────────────────────────
    onSnapshot(collection, docId, callback) {
        return this._adapter.onSnapshot(collection, docId, callback);
    }

    // ─── Batch ─────────────────────────────────────────────────────────────
    async writeBatch(operations) {
        return this._adapter.writeBatch(operations);
    }

    // ─── Auth ──────────────────────────────────────────────────────────────
    async signInAnonymously() {
        return this._adapter.signInAnonymously();
    }

    onAuthStateChanged(callback) {
        return this._adapter.onAuthStateChanged(callback);
    }

    getCurrentUser() {
        return this._adapter.getCurrentUser();
    }

    // ─── Field Operations (convenience re-exports) ─────────────────────────
    static serverTimestamp() { return _FIELD_OPS.serverTimestamp(); }
    static arrayUnion(...elements) { return _FIELD_OPS.arrayUnion(...elements); }
    static arrayRemove(...elements) { return _FIELD_OPS.arrayRemove(...elements); }
    static increment(n) { return _FIELD_OPS.increment(n); }
    static deleteField() { return _FIELD_OPS.deleteField(); }

    // ─── Query Builders (convenience re-exports) ───────────────────────────
    static where(field, op, value) { return _queryConstraint.where(field, op, value); }
    static orderBy(field, direction) { return _queryConstraint.orderBy(field, direction); }
    static limit(n) { return _queryConstraint.limit(n); }

    // ─── Session Codes (4-digit) ───────────────────────────────────────────
    generateSessionCode() {
        return String(_secureInt(1000, 9999)); // 4-digit code
    }

    // ─── Connection Test ──────────────────────────────────────────────────
    async testConnection() {
        try {
            if (this.backend === 'firebase') {
                // Firebase is always "connected" if the SDK loaded
                return { success: true, backend: 'firebase', message: 'Firebase SDK loaded' };
            } else if (this.backend === 'pocketbase') {
                const health = await fetch(`${this._adapter.baseUrl}/api/health`);
                const data = await health.json();
                return { success: true, backend: 'pocketbase', message: `PocketBase v${data.version || '?'}` };
            } else if (this.backend === 'local') {
                return { success: true, backend: 'local', message: 'localStorage available' };
            }
            return { success: false, error: `Unknown backend: ${this.backend}` };
        } catch (err) {
            return { success: false, backend: this.backend, error: err.message };
        }
    }
}

// Make available both as module export and inline
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataProvider, _FIELD_OPS, _queryConstraint };
}
