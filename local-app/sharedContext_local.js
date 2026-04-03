/**
 * AlloFlow B4.2 — Shared Context (Local-Only)
 *
 * Provides the React context layer for the local app.
 * Deliberately does NOT include Firebase, Gemini, OpenAI, or PocketBase.
 *
 * Injects into window so CDN-extracted modules can access:
 *   window.__alloShared.ai        → AIProvider (Ollama-only)
 *   window.__alloShared.t(key)    → i18n translation function
 *   window.__alloShared.db        → SQLite REST client stub
 *   window.__alloShared.user      → local auth user
 *   window.__alloShared.isTeacher → boolean
 *   window.__alloShared.debugLog  → console.log wrapper
 *   window.__alloShared.warnLog   → console.warn wrapper
 *   window.__alloShared.safeGetItem / safeSetItem / safeRemoveItem
 *
 * This file is loaded as a <script> BEFORE app.js so the context is
 * available when the app bundle initializes.
 *
 * Usage inside any module:
 *   const { ai, t, db } = window.__alloShared;
 */

'use strict';

(function (global) {
    // ── Debug / logging ───────────────────────────────────────────────────────
    const DEBUG_LOG = false;
    const debugLog = (...args) => { if (DEBUG_LOG) console.log('[AlloLocal]', ...args); };
    const warnLog = (...args) => { console.warn('[AlloLocal]', ...args); };

    // ── Safe localStorage helpers ─────────────────────────────────────────────
    const safeGetItem = (key, fallback = null) => {
        try { return localStorage.getItem(key); } catch { return fallback; }
    };
    const safeSetItem = (key, value) => {
        try { localStorage.setItem(key, value); } catch {}
    };
    const safeRemoveItem = (key) => {
        try { localStorage.removeItem(key); } catch {}
    };

    // ── Local config (injected by admin app) ──────────────────────────────────
    const config = global.__alloLocalConfig || {
        ollamaUrl: 'http://localhost:11434',
        sqliteUrl: 'http://localhost:3747',
        piperEnabled: true,
        defaultModel: 'llama3.2:3b',
    };

    // ── AI Provider (Ollama-only) ─────────────────────────────────────────────
    // Resolved after AIProvider loads from ai_local_module.js.
    // Any code that calls ai.chat()/ai.generate() before load gets a safe stub.
    const aiStub = {
        chat: () => Promise.resolve('[Local AI not yet available]'),
        generate: () => Promise.resolve('[Local AI not yet available]'),
        tts: (text) => {
            if (global._piperTTS && typeof global._piperTTS.speak === 'function') {
                return global._piperTTS.speak(text);
            }
            return Promise.resolve();
        },
        available: false,
        backend: 'local',
    };

    let _ai = aiStub;

    function getAI() {
        // Prefer window.AIProvider if loaded by ai_local_module.js
        if (global.AIProvider && global.AIProvider !== _ai) {
            _ai = global.AIProvider;
        }
        return _ai;
    }

    // ── i18n ──────────────────────────────────────────────────────────────────
    // Minimal translation stub — looks up window.AlloTranslations first,
    // then falls back to the key itself. The full i18n module (ui_strings.js)
    // populates window.AlloTranslations when loaded.
    function t(key, params = {}) {
        const translations = global.AlloTranslations;
        if (!translations) return key;
        let str = translations[key] || key;
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }
        return str;
    }

    // ── Local DB (SQLite REST client stub) ────────────────────────────────────
    // The actual SQLite REST client is loaded by the data layer module.
    // Until then, this stub provides the same interface so module code
    // doesn't throw on startup.
    const dbStub = {
        get: (path) => {
            debugLog('db.get stub called:', path);
            return Promise.resolve(null);
        },
        set: (path, data) => {
            debugLog('db.set stub called:', path);
            return Promise.resolve();
        },
        update: (path, data) => {
            debugLog('db.update stub called:', path);
            return Promise.resolve();
        },
        delete: (path) => {
            debugLog('db.delete stub called:', path);
            return Promise.resolve();
        },
        query: (path, filters) => {
            debugLog('db.query stub called:', path);
            return Promise.resolve([]);
        },
        subscribe: (_path, _cb) => () => {}, // returns unsubscribe fn
        available: false,
        backend: 'sqlite-local',
        url: config.sqliteUrl,
    };

    let _db = dbStub;

    // ── Local auth ────────────────────────────────────────────────────────────
    // Local app uses token-based auth via the SQLite REST backend.
    // The user object is populated after login or from persisted session.
    let _user = JSON.parse(safeGetItem('alloflow_local_user') || 'null') || {
        uid: 'local-guest',
        email: 'guest@alloflow.local',
        displayName: 'Guest',
        isTeacher: false,
        isGuest: true,
    };

    let _isTeacher = _user.isTeacher || safeGetItem('alloflow_teacher_mode') === 'true';

    function getUser() { return _user; }
    function getIsTeacher() { return _isTeacher; }

    function setUser(user) {
        _user = user;
        safeSetItem('alloflow_local_user', JSON.stringify(user));
        if (user && user.isTeacher) {
            _isTeacher = true;
            safeSetItem('alloflow_teacher_mode', 'true');
        }
        global.dispatchEvent(new CustomEvent('alloflow-user-changed', { detail: { user } }));
    }

    function setTeacherMode(isTeacher) {
        _isTeacher = isTeacher;
        safeSetItem('alloflow_teacher_mode', isTeacher ? 'true' : 'false');
        global.dispatchEvent(new CustomEvent('alloflow-teacher-mode-changed', { detail: { isTeacher } }));
    }

    // ── Expose on window.__alloShared ─────────────────────────────────────────
    global.__alloShared = {
        // Getters (always return current value, even if set after module init)
        get ai() { return getAI(); },
        get db() { return _db; },
        get user() { return getUser(); },
        get isTeacher() { return getIsTeacher(); },

        // Setters (called by auth/data modules when they initialize)
        setAI: (provider) => { _ai = provider; },
        setDB: (db) => { _db = db; global.__alloLocalDB = db; },
        setUser,
        setTeacherMode,

        // Helpers (accessed directly by module code)
        t,
        debugLog,
        warnLog,
        safeGetItem,
        safeSetItem,
        safeRemoveItem,

        // Config
        config,
        isLocalApp: true,
        isCloudApp: false,
    };

    debugLog('Shared context initialized — local-only mode');

})(typeof window !== 'undefined' ? window : global);
