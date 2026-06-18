/**
 * AlloFlow — Local Data Backend (C2.2 + C2.3)
 *
 * Pure Node.js HTTP server (no external framework).
 * Storage engine:
 *   - node:sqlite (bundled since Node v22.5) when available
 *   - JSON file store fallback otherwise (works on any Node ≥16, including
 *     Electron's bundled Node via ELECTRON_RUN_AS_NODE)
 *
 * Endpoints:
 *   GET  /health
 *   POST /auth/create-account  — create new teacher account { name, loginId }
 *   POST /auth/login            — loginId auth → token { loginId }
 *   GET  /auth/session          — validate token → user
 *   POST /auth/logout           — revoke token
 *   GET  /auth/accounts         — list all teacher accounts
 *   GET  /db/:collection              — list docs
 *   POST /db/:collection              — create/upsert doc (id in body)
 *   GET  /db/:collection/:id         — get doc
 *   PUT  /db/:collection/:id         — merge-update doc
 *   DELETE /db/:collection/:id       — delete doc
 *
 * Security: localhost-only (127.0.0.1 / ::1). All other remotes → 403.
 *
 * Run standalone: node local-app/backend/server.js
 * Or started automatically by the AlloFlow admin app (localBackendManager).
 */

'use strict';

const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { randomUUID } = require('crypto');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT     = parseInt(process.env.SQLITE_PORT || '3747', 10);
const DATA_DIR = process.env.DATA_DIR  || process.env.ALLOFLOW_DIR || path.join(os.homedir(), '.alloflow');
const DB_FILE  = process.env.DB_FILE   || path.join(DATA_DIR, 'local.db');
const JSON_FILE = process.env.JSON_DB_FILE || path.join(DATA_DIR, 'local-data.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Storage engine selection ─────────────────────────────────────────────────
// Prefer node:sqlite; fall back to a JSON file store on older Node runtimes
// (e.g. the Electron-bundled Node used when no system Node is installed).
let DatabaseSync = null;
try {
    ({ DatabaseSync } = require('node:sqlite'));
} catch {
    console.log('[AlloFlow Backend] node:sqlite unavailable — using JSON file store at', JSON_FILE);
}

// ── SQLite store ──────────────────────────────────────────────────────────────

function createSqliteStore() {
    const sqlite = new DatabaseSync(DB_FILE);
    sqlite.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);

    // Schema migration: detect old PIN-based schema and rebuild if needed.
    // Old schema had: username TEXT NOT NULL, pin_hash TEXT
    // New schema uses: login_id TEXT UNIQUE NOT NULL, display_name TEXT
    (function migrateSchema() {
        const cols = sqlite.prepare("PRAGMA table_info(users)").all();
        const colNames = cols.map(c => c.name);
        const hasOldSchema = colNames.includes('username') || colNames.includes('pin_hash');
        const hasNewSchema = colNames.includes('login_id');
        if (hasOldSchema && !hasNewSchema) {
            console.log('[DB] Migrating from old PIN schema to new login_id schema…');
            sqlite.exec('DROP TABLE IF EXISTS users');
        } else if (hasOldSchema && hasNewSchema) {
            console.log('[DB] Rebuilding hybrid users table (dropping legacy username/pin_hash columns)…');
            const hasRole = colNames.includes('role');
            sqlite.exec(`
                CREATE TABLE IF NOT EXISTS users_new (
                    id           TEXT PRIMARY KEY,
                    login_id     TEXT UNIQUE NOT NULL,
                    display_name TEXT NOT NULL,
                    role         TEXT NOT NULL DEFAULT 'teacher',
                    token        TEXT,
                    created_at   TEXT DEFAULT (datetime('now'))
                );
                INSERT OR IGNORE INTO users_new (id, login_id, display_name, role, token, created_at)
                    SELECT id, login_id,
                           COALESCE(display_name, login_id),
                           ${hasRole ? "COALESCE(role, 'teacher')" : "'teacher'"},
                           token, created_at
                    FROM users
                    WHERE login_id IS NOT NULL AND login_id != '';
                DROP TABLE users;
                ALTER TABLE users_new RENAME TO users;
            `);
        }
    })();

    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id           TEXT PRIMARY KEY,
            login_id     TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            role         TEXT NOT NULL DEFAULT 'teacher',
            token        TEXT,
            created_at   TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS documents (
            collection  TEXT NOT NULL,
            doc_id      TEXT NOT NULL,
            data        TEXT NOT NULL DEFAULT '{}',
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (collection, doc_id)
        );

        CREATE INDEX IF NOT EXISTS idx_docs_collection ON documents(collection);
    `);

    const rowToUser = (r) => r ? {
        id: r.id, loginId: r.login_id, displayName: r.display_name,
        role: r.role, token: r.token, createdAt: r.created_at,
    } : null;

    return {
        engine: 'sqlite',
        location: DB_FILE,

        getUserByLoginId(loginId) {
            return rowToUser(sqlite.prepare('SELECT * FROM users WHERE login_id = ? LIMIT 1').get(loginId));
        },
        getUserByToken(token) {
            return rowToUser(sqlite.prepare('SELECT * FROM users WHERE token = ? LIMIT 1').get(token));
        },
        createUser({ id, loginId, displayName, role, token }) {
            sqlite.prepare(
                'INSERT INTO users (id, login_id, display_name, role, token) VALUES (?, ?, ?, ?, ?)'
            ).run(id, loginId, displayName, role, token);
        },
        setUserToken(userId, token) {
            sqlite.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, userId);
        },
        clearToken(token) {
            sqlite.prepare('UPDATE users SET token = NULL WHERE token = ?').run(token);
        },
        listTeachers() {
            return sqlite.prepare(
                "SELECT * FROM users WHERE role = 'teacher' ORDER BY created_at ASC"
            ).all().map(rowToUser);
        },

        listDocs(collection, limit) {
            return sqlite.prepare(
                'SELECT doc_id, data FROM documents WHERE collection = ? LIMIT ?'
            ).all(collection, limit).map(r => ({ id: r.doc_id, ...JSON.parse(r.data) }));
        },
        getDoc(collection, docId) {
            const row = sqlite.prepare(
                'SELECT data FROM documents WHERE collection = ? AND doc_id = ? LIMIT 1'
            ).get(collection, docId);
            return row ? JSON.parse(row.data) : null;
        },
        setDoc(collection, docId, data) {
            const now = new Date().toISOString();
            sqlite.prepare(`
                INSERT INTO documents (collection, doc_id, data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(collection, doc_id)
                DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
            `).run(collection, docId, JSON.stringify(data), now, now);
        },
        deleteDoc(collection, docId) {
            sqlite.prepare('DELETE FROM documents WHERE collection = ? AND doc_id = ?').run(collection, docId);
        },
    };
}

// ── JSON file store ───────────────────────────────────────────────────────────
// Shape: { users: [user...], documents: { [collection]: { [docId]: data } } }
// Writes are debounced and atomic (tmp file + rename).

function createJsonStore() {
    let state = { users: [], documents: {} };
    try {
        if (fs.existsSync(JSON_FILE)) {
            state = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
            state.users = state.users || [];
            state.documents = state.documents || {};
        }
    } catch (e) {
        console.warn('[AlloFlow Backend] Could not read JSON store (starting fresh):', e.message);
    }

    let writeTimer = null;
    function persist() {
        if (writeTimer) return;
        writeTimer = setTimeout(() => {
            writeTimer = null;
            try {
                const tmp = JSON_FILE + '.tmp';
                fs.writeFileSync(tmp, JSON.stringify(state));
                fs.renameSync(tmp, JSON_FILE);
            } catch (e) {
                console.error('[AlloFlow Backend] Failed to persist JSON store:', e.message);
            }
        }, 150);
    }
    function persistNow() {
        if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
        try {
            const tmp = JSON_FILE + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(state));
            fs.renameSync(tmp, JSON_FILE);
        } catch (e) {
            console.error('[AlloFlow Backend] Failed to persist JSON store:', e.message);
        }
    }
    process.on('exit', persistNow);
    process.on('SIGTERM', () => { persistNow(); process.exit(0); });
    process.on('SIGINT',  () => { persistNow(); process.exit(0); });

    return {
        engine: 'json',
        location: JSON_FILE,

        getUserByLoginId(loginId) {
            return state.users.find(u => u.loginId === loginId) || null;
        },
        getUserByToken(token) {
            return state.users.find(u => u.token === token) || null;
        },
        createUser({ id, loginId, displayName, role, token }) {
            state.users.push({ id, loginId, displayName, role, token, createdAt: new Date().toISOString() });
            persist();
        },
        setUserToken(userId, token) {
            const u = state.users.find(u => u.id === userId);
            if (u) { u.token = token; persist(); }
        },
        clearToken(token) {
            const u = state.users.find(u => u.token === token);
            if (u) { u.token = null; persist(); }
        },
        listTeachers() {
            return state.users
                .filter(u => u.role === 'teacher')
                .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        },

        listDocs(collection, limit) {
            const coll = state.documents[collection] || {};
            return Object.entries(coll).slice(0, limit).map(([id, data]) => ({ id, ...data }));
        },
        getDoc(collection, docId) {
            const coll = state.documents[collection] || {};
            return Object.prototype.hasOwnProperty.call(coll, docId) ? coll[docId] : null;
        },
        setDoc(collection, docId, data) {
            if (!state.documents[collection]) state.documents[collection] = {};
            state.documents[collection][docId] = data;
            persist();
        },
        deleteDoc(collection, docId) {
            if (state.documents[collection]) {
                delete state.documents[collection][docId];
                persist();
            }
        },
    };
}

const store = DatabaseSync ? createSqliteStore() : createJsonStore();

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeLoginId(raw) {
    // Lowercase alphanumeric + hyphens only, max 32 chars
    return String(raw).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk.toString(); });
        req.on('end', () => {
            try { resolve(raw ? JSON.parse(raw) : {}); }
            catch { reject(new Error('Invalid JSON in request body')); }
        });
        req.on('error', reject);
    });
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(body);
}

function getToken(req) {
    const auth = req.headers['authorization'] || '';
    return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

// ── Route handlers ────────────────────────────────────────────────────────────

function handleHealth(_req, res) {
    json(res, 200, { ok: true, version: '0.2.0', backend: `${store.engine}-local`, db: store.location });
}

// POST /auth/create-account
// Body: { name: string, loginId: string, role?: 'teacher'|'parent' }
async function handleCreateAccount(req, res) {
    const body = await parseBody(req);
    const name    = String(body.name || '').trim();
    const loginId = sanitizeLoginId(body.loginId || '');
    const role    = body.role === 'parent' ? 'parent' : 'teacher';

    if (!name)    return json(res, 400, { error: 'Name is required' });
    if (!loginId) return json(res, 400, { error: 'Login ID is required (letters, numbers, hyphens)' });
    if (loginId.length < 2) return json(res, 400, { error: 'Login ID must be at least 2 characters' });

    if (store.getUserByLoginId(loginId)) {
        return json(res, 409, { error: 'That Login ID is already taken' });
    }

    const id    = randomUUID();
    const token = randomUUID();
    store.createUser({ id, loginId, displayName: name, role, token });

    json(res, 200, {
        token,
        user: { uid: id, displayName: name, loginId, role, isTeacher: role === 'teacher' },
    });
}

// POST /auth/login
// Body: { loginId: string }
async function handleLogin(req, res) {
    const body    = await parseBody(req);
    const loginId = sanitizeLoginId(body.loginId || '');
    if (!loginId) return json(res, 400, { error: 'Login ID is required' });

    const user = store.getUserByLoginId(loginId);
    if (!user)  return json(res, 401, { error: 'No account found with that Login ID' });

    // Rotate token on every login
    const token = randomUUID();
    store.setUserToken(user.id, token);

    json(res, 200, {
        token,
        user: {
            uid:         user.id,
            displayName: user.displayName,
            loginId:     user.loginId,
            role:        user.role,
            isTeacher:   true,
        },
    });
}

// GET /auth/accounts — list all teacher accounts (for admin UI)
function handleListAccounts(_req, res) {
    const rows = store.listTeachers();
    json(res, 200, { accounts: rows.map(r => ({
        uid: r.id, loginId: r.loginId, displayName: r.displayName, createdAt: r.createdAt,
    })) });
}

// GET /auth/session
function handleSession(req, res) {
    const user = getToken(req) ? store.getUserByToken(getToken(req)) : null;
    if (!user) return json(res, 401, { error: 'No active session' });
    json(res, 200, {
        user: {
            uid:         user.id,
            displayName: user.displayName,
            role:        user.role,
            email:       `${user.loginId}@alloflow.local`,
            isTeacher:   user.role === 'teacher',
        },
    });
}

// POST /auth/logout
function handleLogout(req, res) {
    const token = getToken(req);
    if (token) store.clearToken(token);
    json(res, 200, { ok: true });
}

// GET /db/:collection[?limit=N]
function handleListDocs(req, res, collection) {
    const url    = new URL(req.url, `http://localhost:${PORT}`);
    const limitN = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 5000);
    json(res, 200, { docs: store.listDocs(collection, limitN) });
}

// GET /db/:collection/:id
function handleGetDoc(req, res, collection, docId) {
    const data = store.getDoc(collection, docId);
    if (data === null) return json(res, 404, { error: 'Document not found' });
    json(res, 200, { id: docId, ...data });
}

// POST /db/:collection
// Body: arbitrary JSON; include "id" field to set doc_id (otherwise UUID generated)
async function handleSetDoc(req, res, collection) {
    const body = await parseBody(req);
    const { id, ...data } = body;
    const docId = id || randomUUID();
    store.setDoc(collection, docId, data);
    json(res, 200, { id: docId, ...data });
}

// PUT /db/:collection/:id  — merge update (shallow)
async function handleUpdateDoc(req, res, collection, docId) {
    const existing = store.getDoc(collection, docId) || {};
    const updates  = await parseBody(req);
    const merged   = { ...existing, ...updates };
    store.setDoc(collection, docId, merged);
    json(res, 200, { id: docId, ...merged });
}

// DELETE /db/:collection/:id
function handleDeleteDoc(req, res, collection, docId) {
    store.deleteDoc(collection, docId);
    json(res, 200, { ok: true });
}

// ── Main HTTP router ──────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        return res.end();
    }

    // Restrict to localhost only
    const remote = req.socket.remoteAddress;
    if (remote !== '127.0.0.1' && remote !== '::1' && remote !== '::ffff:127.0.0.1') {
        return json(res, 403, { error: 'Forbidden: localhost access only' });
    }

    const url   = new URL(req.url, `http://localhost:${PORT}`);
    const parts = url.pathname.split('/').filter(Boolean);

    try {
        // GET /health
        if (req.method === 'GET' && parts[0] === 'health') {
            return handleHealth(req, res);
        }

        // /auth/*
        if (parts[0] === 'auth') {
            if (req.method === 'POST' && parts[1] === 'create-account') return await handleCreateAccount(req, res);
            if (req.method === 'POST' && parts[1] === 'login')          return await handleLogin(req, res);
            if (req.method === 'GET'  && parts[1] === 'session')        return handleSession(req, res);
            if (req.method === 'POST' && parts[1] === 'logout')         return handleLogout(req, res);
            if (req.method === 'GET'  && parts[1] === 'accounts')       return handleListAccounts(req, res);
            return json(res, 404, { error: 'Auth endpoint not found' });
        }

        // /db/:collection[/:id]
        if (parts[0] === 'db' && parts[1]) {
            // Sanitize collection name — alphanumeric, underscore, hyphen only
            const collection = parts[1].replace(/[^a-zA-Z0-9_-]/g, '');
            if (!collection) return json(res, 400, { error: 'Invalid collection name' });

            const docId = parts[2];

            if (!docId && req.method === 'GET')    return handleListDocs(req, res, collection);
            if (!docId && req.method === 'POST')   return await handleSetDoc(req, res, collection);
            if (docId  && req.method === 'GET')    return handleGetDoc(req, res, collection, docId);
            if (docId  && req.method === 'PUT')    return await handleUpdateDoc(req, res, collection, docId);
            if (docId  && req.method === 'DELETE') return handleDeleteDoc(req, res, collection, docId);
        }

        json(res, 404, { error: 'Not found' });

    } catch (err) {
        console.error('[AlloFlow Backend] Error:', err.message);
        json(res, 500, { error: 'Internal server error' });
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ AlloFlow SQLite backend: http://localhost:${PORT}`);
    console.log(`   Storage: ${store.engine} (${store.location})`);
});

module.exports = { server, store };
