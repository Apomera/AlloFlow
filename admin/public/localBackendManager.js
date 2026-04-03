/**
 * AlloFlow — Local Backend Manager (B4.4)
 *
 * Manages the lifecycle of the bundled SQLite REST backend process
 * (local-app/backend/server.js) from within the Electron admin app.
 *
 * The backend is spawned as a child process on port 3747 and
 * automatically restarted if it crashes. On admin app exit the
 * child process is killed.
 *
 * Usage (in main.js):
 *   const localBackend = require('./localBackendManager');
 *   await localBackend.start();
 *   localBackend.stop();
 */

'use strict';

const { spawn }   = require('child_process');
const path        = require('path');
const fs          = require('fs');
const os          = require('os');
const { createServer } = require('http');

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_PORT  = 3747;
const RESTART_DELAY = 3000;   // ms before restarting a crashed backend
const MAX_RESTARTS  = 5;      // give up after this many restarts in one session

let _proc         = null;
let _port         = DEFAULT_PORT;
let _restartCount = 0;
let _stopping     = false;

// ── Path resolution ───────────────────────────────────────────────────────────

/**
 * @param {boolean} isPackaged
 */
function resolveBackendScript(isPackaged) {
    if (isPackaged) {
        return path.join(process.resourcesPath, 'local-app', 'backend', 'server.js');
    }
    return path.join(__dirname, '..', '..', 'local-app', 'backend', 'server.js');
}

// ── Port helpers ──────────────────────────────────────────────────────────────

function isPortFree(port) {
    return new Promise(resolve => {
        const probe = createServer().listen(port, '127.0.0.1', () => {
            probe.close(() => resolve(true));
        });
        probe.on('error', () => resolve(false));
    });
}

async function findFreePort(startPort) {
    let p = startPort;
    for (let i = 0; i < 20; i++) {
        if (await isPortFree(p)) return p;
        p++;
    }
    throw new Error('No free port found near ' + startPort);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

/**
 * Start the SQLite backend.
 * @param {number}  port       Preferred port (default 3747)
 * @param {boolean} isPackaged Electron packaging flag
 * @param {string}  dataDir    Data directory for SQLite DB (default ~/.alloflow)
 * @returns {Promise<number>}  Port the backend is listening on
 */
async function start(port, isPackaged, dataDir) {
    if (_proc) {
        console.log('[localBackend] Already running on port', _port);
        return _port;
    }

    _stopping     = false;
    _restartCount = 0;
    _port         = await findFreePort(port || DEFAULT_PORT);

    const scriptPath = resolveBackendScript(isPackaged);
    if (!fs.existsSync(scriptPath)) {
        throw new Error('[localBackend] Backend script not found: ' + scriptPath);
    }

    const dbDir = dataDir || path.join(os.homedir(), '.alloflow');
    fs.mkdirSync(dbDir, { recursive: true });

    return new Promise((resolve, reject) => {
        _spawn(scriptPath, dbDir, resolve, reject);
    });
}

function _spawn(scriptPath, dbDir, resolveOnce, rejectOnce) {
    const env = {
        ...process.env,
        SQLITE_PORT: String(_port),
        DATA_DIR:    dbDir,
    };

    _proc = spawn(process.execPath, [scriptPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
        detached: false,
    });

    const onReady = (data) => {
        const line = data.toString();
        process.stdout.write(`[localBackend] ${line}`);
        if (line.includes('AlloFlow SQLite backend:') || line.includes('localhost:' + _port)) {
            if (resolveOnce) { resolveOnce(_port); resolveOnce = null; rejectOnce = null; }
        }
    };

    _proc.stdout.on('data', onReady);
    _proc.stderr.on('data', (d) => process.stderr.write(`[localBackend:err] ${d}`));

    _proc.on('error', (err) => {
        console.error('[localBackend] Spawn error:', err.message);
        _proc = null;
        if (rejectOnce) { rejectOnce(err); rejectOnce = null; resolveOnce = null; }
    });

    _proc.on('exit', (code) => {
        _proc = null;
        if (_stopping) return;

        if (_restartCount < MAX_RESTARTS) {
            _restartCount++;
            console.warn(`[localBackend] Exited (code=${code}), restarting in ${RESTART_DELAY}ms (attempt ${_restartCount}/${MAX_RESTARTS})`);
            setTimeout(() => {
                if (!_stopping) _spawn(scriptPath, dbDir, null, null);
            }, RESTART_DELAY);
        } else {
            console.error('[localBackend] Max restart attempts reached. Backend offline.');
        }
    });

    // Resolve after a generous timeout even if the ready line is missed
    const readyTimeout = setTimeout(() => {
        if (resolveOnce) { resolveOnce(_port); resolveOnce = null; rejectOnce = null; }
    }, 4000);

    _proc.stdout.on('close', () => clearTimeout(readyTimeout));
    _proc.stderr.on('close', () => clearTimeout(readyTimeout));
}

/**
 * Stop the backend process (no restart).
 */
function stop() {
    _stopping = true;
    if (_proc) {
        try { _proc.kill('SIGTERM'); } catch {}
        _proc = null;
        console.log('[localBackend] Stopped');
    }
}

/** Returns true if the backend process is running. */
function isRunning() {
    return _proc !== null && !_stopping;
}

/** Returns the port the backend is (or was last) listening on. */
function getPort() {
    return _port;
}

module.exports = { start, stop, isRunning, getPort };
