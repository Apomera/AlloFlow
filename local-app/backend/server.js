/**
 * AlloFlow — Local SQLite Backend (C2.2 + C2.3)
 *
 * Pure Node.js HTTP server (no external framework).
 * Uses node:sqlite (bundled since Node v22.5) — no npm dependencies.
 *
 * Endpoints:
 *   GET  /health
 *   POST /auth/setup-pin    — set teacher PIN on first run
 *   POST /auth/login        — PIN auth → token
 *   GET  /auth/session      — validate token → user
 *   POST /auth/logout       — revoke token
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
const { randomUUID, createHash } = require('crypto');

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

sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
        id           TEXT PRIMARY KEY,
        username     TEXT UNIQUE NOT NULL,
        display_name TEXT,
        role         TEXT NOT NULL DEFAULT 'student',
        pin_hash     TEXT,
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

    -- Default teacher account (PIN unset until setup-pin is called)
    INSERT OR IGNORE INTO users (id, username, display_name, role)
    VALUES ('teacher-1', 'teacher', 'Teacher', 'teacher');
`);

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashPin(pin) {
    // Prefix with app salt to prevent rainbow-table attacks against the local DB
    return createHash('sha256').update(`alloflow-local:${pin}`).digest('hex');
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

// POST /auth/setup-pin
// Body: { pin: string }
async function handleSetupPin(req, res) {
    const { pin } = await parseBody(req);
    if (!pin || String(pin).length < 4) {
        return json(res, 400, { error: 'PIN must be at least 4 characters' });
    }
    const token = randomUUID();
    sqlite.prepare(
        `UPDATE users SET pin_hash = ?, token = ? WHERE role = 'teacher'`
    ).run(hashPin(String(pin)), token);
    json(res, 200, { ok: true });
}

// POST /auth/login
// Body: { pin: string, role?: 'teacher' }
async function handleLogin(req, res) {
    const { pin, role = 'teacher' } = await parseBody(req);
    if (!pin) return json(res, 400, { error: 'PIN is required' });

    const user = sqlite.prepare(
        'SELECT * FROM users WHERE role = ? AND pin_hash = ? LIMIT 1'
    ).get(role, hashPin(String(pin)));

    if (!user) return json(res, 401, { error: 'Invalid PIN' });

    // Rotate token on every login
    const token = randomUUID();
    sqlite.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, user.id);

    json(res, 200, {
        token,
        user: {
            uid:         user.id,
            displayName: user.display_name,
            role:        user.role,
            email:       `${user.username}@alloflow.local`,
            isTeacher:   user.role === 'teacher',
        },
    });
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
            if (req.method === 'POST' && parts[1] === 'setup-pin') return await handleSetupPin(req, res);
            if (req.method === 'POST' && parts[1] === 'login')     return await handleLogin(req, res);
            if (req.method === 'GET'  && parts[1] === 'session')   return handleSession(req, res);
            if (req.method === 'POST' && parts[1] === 'logout')    return handleLogout(req, res);
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
