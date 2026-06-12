/**
 * AlloFlow — Local SQLite Backend (C2.2 + C2.3)
 *
 * Pure Node.js HTTP server (no external framework).
 * Uses node:sqlite (bundled since Node v22.5) — no npm dependencies.
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
 * Or started automatically by local-app/server.js in dev mode.
 */

'use strict';

const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { randomUUID } = require('crypto');

// ── SQLite (Node v22.5+) ──────────────────────────────────────────────────────
let DatabaseSync;
try {
    ({ DatabaseSync } = require('node:sqlite'));
} catch {
    console.error('[AlloFlow SQLite] node:sqlite requires Node.js v22.5 or later.');
    process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────────────────
const PORT     = parseInt(process.env.SQLITE_PORT || '3747', 10);
const DATA_DIR = process.env.DATA_DIR  || path.join(os.homedir(), '.alloflow');
const DB_FILE  = process.env.DB_FILE   || path.join(DATA_DIR, 'local.db');

// ── Database init ─────────────────────────────────────────────────────────────
fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new DatabaseSync(DB_FILE);

sqlite.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);

// ── Schema migration: detect old PIN-based schema and rebuild if needed ──────
// Old schema had: username TEXT NOT NULL, pin_hash TEXT
// New schema uses: login_id TEXT UNIQUE NOT NULL, display_name TEXT
(function migrateSchema() {
    const cols = sqlite.prepare("PRAGMA table_info(users)").all();
    const colNames = cols.map(c => c.name);
    const hasOldSchema = colNames.includes('username') || colNames.includes('pin_hash');
    const hasNewSchema = colNames.includes('login_id');
    if (hasOldSchema && !hasNewSchema) {
        // Old PIN schema — drop and recreate (no real data loss; old PINs are unusable)
        console.log('[DB] Migrating from old PIN schema to new login_id schema…');
        sqlite.exec('DROP TABLE IF EXISTS users');
    } else if (hasOldSchema && hasNewSchema) {
        // Hybrid table (old NOT NULL username column lingering alongside login_id) —
        // inserts fail with "NOT NULL constraint failed: users.username".
        // Rebuild, preserving rows that already have a usable login_id.
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

function getUserByToken(token) {
    if (!token) return null;
    return sqlite.prepare('SELECT * FROM users WHERE token = ? LIMIT 1').get(token) || null;
}

// ── Route handlers ────────────────────────────────────────────────────────────

function handleHealth(_req, res) {
    json(res, 200, { ok: true, version: '0.1.0', backend: 'sqlite-local', db: DB_FILE });
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

    const existing = sqlite.prepare('SELECT id FROM users WHERE login_id = ? LIMIT 1').get(loginId);
    if (existing)  return json(res, 409, { error: 'That Login ID is already taken' });

    const id    = randomUUID();
    const token = randomUUID();
    sqlite.prepare(
        'INSERT INTO users (id, login_id, display_name, role, token) VALUES (?, ?, ?, ?, ?)'
    ).run(id, loginId, name, role, token);

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

    const user = sqlite.prepare('SELECT * FROM users WHERE login_id = ? LIMIT 1').get(loginId);
    if (!user)  return json(res, 401, { error: 'No account found with that Login ID' });

    // Rotate token on every login
    const token = randomUUID();
    sqlite.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, user.id);

    json(res, 200, {
        token,
        user: {
            uid:         user.id,
            displayName: user.display_name,
            loginId:     user.login_id,
            role:        user.role,
            isTeacher:   true,
        },
    });
}

// GET /auth/accounts — list all teacher accounts (for admin UI)
function handleListAccounts(_req, res) {
    const rows = sqlite.prepare(
        "SELECT id, login_id, display_name, created_at FROM users WHERE role = 'teacher' ORDER BY created_at ASC"
    ).all();
    json(res, 200, { accounts: rows.map(r => ({
        uid: r.id, loginId: r.login_id, displayName: r.display_name, createdAt: r.created_at,
    })) });
}

// GET /auth/session
function handleSession(req, res) {
    const user = getUserByToken(getToken(req));
    if (!user) return json(res, 401, { error: 'No active session' });
    json(res, 200, {
        user: {
            uid:         user.id,
            displayName: user.display_name,
            role:        user.role,
            email:       `${user.username}@alloflow.local`,
            isTeacher:   user.role === 'teacher',
        },
    });
}

// POST /auth/logout
function handleLogout(req, res) {
    const token = getToken(req);
    if (token) {
        sqlite.prepare('UPDATE users SET token = NULL WHERE token = ?').run(token);
    }
    json(res, 200, { ok: true });
}

// GET /db/:collection[?limit=N]
function handleListDocs(req, res, collection) {
    const url    = new URL(req.url, `http://localhost:${PORT}`);
    const limitN = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 5000);
    const rows   = sqlite.prepare(
        'SELECT doc_id, data FROM documents WHERE collection = ? LIMIT ?'
    ).all(collection, limitN);
    const docs = rows.map(r => ({ id: r.doc_id, ...JSON.parse(r.data) }));
    json(res, 200, { docs });
}

// GET /db/:collection/:id
function handleGetDoc(req, res, collection, docId) {
    const row = sqlite.prepare(
        'SELECT data FROM documents WHERE collection = ? AND doc_id = ? LIMIT 1'
    ).get(collection, docId);
    if (!row) return json(res, 404, { error: 'Document not found' });
    json(res, 200, { id: docId, ...JSON.parse(row.data) });
}

// POST /db/:collection
// Body: arbitrary JSON; include "id" field to set doc_id (otherwise UUID generated)
async function handleSetDoc(req, res, collection) {
    const body = await parseBody(req);
    const { id, ...data } = body;
    const docId = id || randomUUID();
    const now   = new Date().toISOString();

    sqlite.prepare(`
        INSERT INTO documents (collection, doc_id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(collection, doc_id)
        DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).run(collection, docId, JSON.stringify(data), now, now);

    json(res, 200, { id: docId, ...data });
}

// PUT /db/:collection/:id  — merge update (shallow)
async function handleUpdateDoc(req, res, collection, docId) {
    const existing = (() => {
        const row = sqlite.prepare(
            'SELECT data FROM documents WHERE collection = ? AND doc_id = ? LIMIT 1'
        ).get(collection, docId);
        return row ? JSON.parse(row.data) : {};
    })();

    const updates = await parseBody(req);
    const merged  = { ...existing, ...updates };
    const now     = new Date().toISOString();

    sqlite.prepare(`
        INSERT INTO documents (collection, doc_id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(collection, doc_id)
        DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).run(collection, docId, JSON.stringify(merged), now, now);

    json(res, 200, { id: docId, ...merged });
}

// DELETE /db/:collection/:id
function handleDeleteDoc(req, res, collection, docId) {
    sqlite.prepare(
        'DELETE FROM documents WHERE collection = ? AND doc_id = ?'
    ).run(collection, docId);
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
        console.error('[AlloFlow SQLite Backend] Error:', err.message);
        json(res, 500, { error: 'Internal server error' });
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ AlloFlow SQLite backend: http://localhost:${PORT}`);
    console.log(`   DB file: ${DB_FILE}`);
});

module.exports = { server, sqlite };
