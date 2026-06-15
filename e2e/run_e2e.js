#!/usr/bin/env node
/**
 * AlloFlow — End-to-End Test Suite
 *
 * Boots the local stack (data backend + local app server), then verifies:
 *   1. Backend API        — health, auth flow, document CRUD
 *   2. App server         — HTML served with injected __alloLocalConfig
 *   3. Asset completeness — every file in local-app/build/ is served (200)
 *   4. Critical assets    — real AI module (not stub), pdf.js, doc pipeline,
 *                           storage libs, ui_strings parses
 *   5. AI proxy           — /v1/models via the app server (LM Studio optional)
 *   6. Browser smoke test — loads the app in Chromium (Electron), collects
 *                           console errors and failed network requests
 *
 * Usage:
 *   node e2e/run_e2e.js                 # full run
 *   node e2e/run_e2e.js --skip-browser  # endpoint tests only
 *   node e2e/run_e2e.js --require-llm   # fail (not warn) if LM Studio is down
 *
 * Services are started on their REAL ports (3747 backend, 3730 app server).
 * If a port is already in use, the suite attaches to the running instance
 * instead — so it can test against the live admin app too.
 */

'use strict';

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const http = require('http');

const ROOT        = path.join(__dirname, '..');
const BUILD_DIR   = path.join(ROOT, 'local-app', 'build');
const BACKEND_JS  = path.join(ROOT, 'local-app', 'backend', 'server.js');
const APPSERVER_JS = path.join(ROOT, 'admin', 'public', 'localAppServer.js');
const ELECTRON_BIN = path.join(ROOT, 'admin', 'node_modules', '.bin', 'electron');

const BACKEND_PORT = 3747;
const APP_PORT     = 3730;
const LLM_PORT     = 1234;

const args        = process.argv.slice(2);
const skipBrowser = args.includes('--skip-browser');
const requireLLM  = args.includes('--require-llm');

// ── Tiny test framework ───────────────────────────────────────────────────────

let passed = 0, failed = 0, warned = 0;
const failures = [];

function pass(name)        { passed++; console.log(`  ✅ ${name}`); }
function fail(name, why)   { failed++; failures.push(`${name}: ${why}`); console.log(`  ❌ ${name} — ${why}`); }
function warn(name, why)   { warned++; console.log(`  ⚠️  ${name} — ${why}`); }
function section(title)    { console.log(`\n━━ ${title} ━━`); }

function req(method, url, body, headers = {}) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const data = body ? JSON.stringify(body) : null;
        const r = http.request({
            hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
            headers: { ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}), ...headers },
        }, (res) => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve({ status: res.statusCode, body: raw, headers: res.headers }));
        });
        r.on('error', (e) => resolve({ status: 0, error: e.message }));
        r.setTimeout(15000, () => { r.destroy(); resolve({ status: 0, error: 'timeout' }); });
        if (data) r.write(data);
        r.end();
    });
}

function isPortInUse(port) {
    return new Promise((resolve) => {
        const probe = http.get({ host: '127.0.0.1', port, path: '/', timeout: 1500 }, () => resolve(true));
        probe.on('error', () => resolve(false));
        probe.on('timeout', () => { probe.destroy(); resolve(true); });
    });
}

async function waitFor(url, timeoutMs, okStatuses = [200]) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
        const r = await req('GET', url);
        if (okStatuses.includes(r.status)) return true;
        await new Promise(r2 => setTimeout(r2, 400));
    }
    return false;
}

// ── Stack management ──────────────────────────────────────────────────────────

const children = [];

function findNode() {
    try {
        const out = execSync(process.platform === 'win32' ? 'where.exe node' : 'which node',
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().split(/\r?\n/)[0];
        if (out && fs.existsSync(out)) return out;
    } catch {}
    return process.execPath; // running under node already
}

async function startStack() {
    section('Stack startup');

    if (await isPortInUse(BACKEND_PORT)) {
        console.log(`  ↪ backend already running on :${BACKEND_PORT} — attaching`);
    } else {
        const proc = spawn(findNode(), [BACKEND_JS], {
            env: { ...process.env, SQLITE_PORT: String(BACKEND_PORT) },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        proc.stderr.on('data', d => process.stderr.write(`  [backend:err] ${d}`));
        children.push(proc);
        if (!(await waitFor(`http://127.0.0.1:${BACKEND_PORT}/health`, 10000))) {
            throw new Error('Backend failed to start within 10s');
        }
        console.log(`  ↪ backend started on :${BACKEND_PORT}`);
    }

    if (await isPortInUse(APP_PORT)) {
        console.log(`  ↪ app server already running on :${APP_PORT} — attaching`);
    } else {
        const proc = spawn(findNode(), [APPSERVER_JS], {
            env: { ...process.env, PORT: String(APP_PORT) },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        proc.stderr.on('data', d => process.stderr.write(`  [appserver:err] ${d}`));
        children.push(proc);
        if (!(await waitFor(`http://127.0.0.1:${APP_PORT}/`, 10000))) {
            throw new Error('App server failed to start within 10s');
        }
        console.log(`  ↪ app server started on :${APP_PORT}`);
    }
}

function stopStack() {
    for (const c of children) { try { c.kill('SIGTERM'); } catch {} }
}

// ── Test groups ───────────────────────────────────────────────────────────────

async function testBackendAPI() {
    section('1. Backend API');
    const base = `http://127.0.0.1:${BACKEND_PORT}`;

    const health = await req('GET', `${base}/health`);
    health.status === 200 && JSON.parse(health.body).ok
        ? pass('GET /health')
        : fail('GET /health', `status ${health.status}`);

    const loginId = `e2e-test-${Date.now().toString(36)}`;
    const created = await req('POST', `${base}/auth/create-account`, { name: 'E2E Test', loginId });
    let token = null;
    if (created.status === 200 && JSON.parse(created.body).token) {
        token = JSON.parse(created.body).token;
        pass('POST /auth/create-account');
    } else fail('POST /auth/create-account', `status ${created.status}: ${created.body?.slice(0, 120)}`);

    const login = await req('POST', `${base}/auth/login`, { loginId });
    if (login.status === 200 && JSON.parse(login.body).token) {
        token = JSON.parse(login.body).token;
        pass('POST /auth/login');
    } else fail('POST /auth/login', `status ${login.status}`);

    const session = await req('GET', `${base}/auth/session`, null, { Authorization: `Bearer ${token}` });
    session.status === 200
        ? pass('GET /auth/session (token valid)')
        : fail('GET /auth/session', `status ${session.status}`);

    const docId = `e2e-doc-${Date.now().toString(36)}`;
    const setDoc = await req('POST', `${base}/db/e2e_tests`, { id: docId, title: 'E2E', n: 42 });
    setDoc.status === 200 ? pass('POST /db/:collection (create doc)') : fail('POST /db/:collection', `status ${setDoc.status}`);

    const getDoc = await req('GET', `${base}/db/e2e_tests/${docId}`);
    getDoc.status === 200 && JSON.parse(getDoc.body).n === 42
        ? pass('GET /db/:collection/:id')
        : fail('GET /db/:collection/:id', `status ${getDoc.status}`);

    const updDoc = await req('PUT', `${base}/db/e2e_tests/${docId}`, { n: 43 });
    updDoc.status === 200 && JSON.parse(updDoc.body).n === 43 && JSON.parse(updDoc.body).title === 'E2E'
        ? pass('PUT /db/:collection/:id (merge update)')
        : fail('PUT /db/:collection/:id', `status ${updDoc.status}`);

    const delDoc = await req('DELETE', `${base}/db/e2e_tests/${docId}`);
    delDoc.status === 200 ? pass('DELETE /db/:collection/:id') : fail('DELETE /db/:collection/:id', `status ${delDoc.status}`);

    const gone = await req('GET', `${base}/db/e2e_tests/${docId}`);
    gone.status === 404 ? pass('deleted doc returns 404') : fail('deleted doc returns 404', `status ${gone.status}`);

    const logout = await req('POST', `${base}/auth/logout`, null, { Authorization: `Bearer ${token}` });
    logout.status === 200 ? pass('POST /auth/logout') : fail('POST /auth/logout', `status ${logout.status}`);
}

async function testAppServer() {
    section('2. App server');
    const base = `http://127.0.0.1:${APP_PORT}`;

    const home = await req('GET', `${base}/`);
    home.status === 200 && home.body.includes('<div id="root">')
        ? pass('GET / serves app HTML')
        : fail('GET /', `status ${home.status}`);

    home.body.includes('__alloLocalConfig')
        ? pass('HTML has injected __alloLocalConfig')
        : fail('config injection', '__alloLocalConfig not found in served HTML');
}

async function testAssetCompleteness() {
    section('3. Asset completeness (every file in build/ must be served)');
    const base = `http://127.0.0.1:${APP_PORT}`;

    const files = [];
    (function walk(dir, rel) {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const r = rel ? `${rel}/${e.name}` : e.name;
            if (e.isDirectory()) walk(path.join(dir, e.name), r);
            else files.push(r);
        }
    })(BUILD_DIR, '');

    let ok = 0; const bad = [];
    for (const f of files) {
        const r = await req('GET', `${base}/${encodeURI(f)}`);
        if (r.status === 200) ok++;
        else bad.push(`${f} → ${r.status}`);
    }
    bad.length === 0
        ? pass(`all ${ok} build files served with 200`)
        : fail('asset completeness', `${bad.length} files not served: ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? '…' : ''}`);
}

async function testCriticalAssets() {
    section('4. Critical assets sanity');
    const base = `http://127.0.0.1:${APP_PORT}`;

    const ai = await req('GET', `${base}/ai_local_module.js`);
    ai.status === 200 && ai.body.includes('llmEngineUrl') && ai.body.length > 2000
        ? pass('ai_local_module.js is the real implementation')
        : fail('ai_local_module.js', ai.status !== 200 ? `status ${ai.status}` : 'looks like a stub (missing LM Studio routing)');

    const db = await req('GET', `${base}/db_local_module.js`);
    db.status === 200 && db.body.length > 2000
        ? pass('db_local_module.js is the real implementation')
        : fail('db_local_module.js', db.status !== 200 ? `status ${db.status}` : 'looks like a stub');

    const checks = [
        ['shared/ui_strings.js',                      10000, 'i18n strings'],
        ['shared/help_strings.js',                    10000, 'help strings'],
        ['shared/libs/pdf.min.js',                   100000, 'pdf.js (PDF upload)'],
        ['shared/libs/pdf.worker.min.js',            500000, 'pdf.js worker'],
        ['shared/libs/lz-string.min.js',               1000, 'lz-string (storage)'],
        ['shared/libs/idb-keyval.min.js',              1000, 'idb-keyval (storage)'],
        ['shared/libs/math.min.js',                  100000, 'math.js (graphCalc)'],
        ['shared/modules/doc_pipeline_module.js',      5000, 'doc remediation pipeline'],
        ['shared/modules/ai_backend_module.js',        5000, 'AI backend module'],
        ['shared/modules/stem_lab/stem_lab_module.js', 5000, 'STEM Lab registry'],
        ['shared/modules/sel_hub/sel_hub_module.js',   5000, 'SEL Hub registry'],
        ['shared/kokoro_tts_loader.js',                1000, 'Kokoro TTS loader'],
        ['shared/piper_tts_loader.js',                 1000, 'Piper TTS loader'],
        ['shared/audio_bank.json',                      100, 'audio bank'],
    ];
    for (const [p, minSize, label] of checks) {
        const r = await req('GET', `${base}/${p}`);
        r.status === 200 && r.body.length >= minSize
            ? pass(`${label} (${p})`)
            : fail(label, r.status !== 200 ? `${p} → status ${r.status}` : `${p} too small (${r.body.length}B < ${minSize}B)`);
    }

    // ui_strings must actually contain the keys the UI showed as raw
    const ui = await req('GET', `${base}/shared/ui_strings.js`);
    ui.body.includes('educator_hub')
        ? pass('ui_strings.js contains educator_hub strings')
        : fail('ui_strings content', 'educator_hub key missing');
}

async function testAIProxy() {
    section('5. AI proxy / LM Studio');
    const base = `http://127.0.0.1:${APP_PORT}`;

    const lmDirect = await req('GET', `http://127.0.0.1:${LLM_PORT}/v1/models`);
    if (lmDirect.status === 200) {
        const models = (JSON.parse(lmDirect.body).data || []).map(m => m.id);
        pass(`LM Studio is running with ${models.length} model(s)${models[0] ? `: ${models[0]}` : ''}`);

        const proxied = await req('GET', `${base}/v1/models`);
        proxied.status === 200
            ? pass('app server proxies /v1/models')
            : fail('AI proxy /v1/models', `status ${proxied.status}`);

        if (models.length > 0) {
            const chat = await req('POST', `${base}/v1/chat/completions`, {
                model: models[0],
                messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
                max_tokens: 10,
            });
            chat.status === 200
                ? pass('chat completion through proxy works')
                : fail('chat completion', `status ${chat.status}: ${chat.body?.slice(0, 120)}`);
        }
    } else {
        const msg = 'LM Studio not reachable on :1234 — AI round-trip not tested';
        requireLLM ? fail('LM Studio', msg) : warn('LM Studio', msg);
    }

    // Piper TTS HTTP server (port 5500) — started by the admin app, optional in CI
    const piperHealth = await req('GET', 'http://127.0.0.1:5500/health');
    if (piperHealth.status === 200) {
        pass('Piper TTS server is running');
        const speech = await new Promise((resolve) => {
            const u = new URL('http://127.0.0.1:5500/v1/audio/speech');
            const data = JSON.stringify({ input: 'E2E test', voice: 'nova' });
            const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => resolve({ status: res.statusCode, bytes: Buffer.concat(chunks) }));
            });
            r.on('error', () => resolve({ status: 0, bytes: Buffer.alloc(0) }));
            r.setTimeout(40000, () => { r.destroy(); resolve({ status: 0, bytes: Buffer.alloc(0) }); });
            r.write(data); r.end();
        });
        speech.status === 200 && speech.bytes.slice(0, 4).toString() === 'RIFF'
            ? pass(`Piper synthesized audio (${speech.bytes.length} bytes WAV)`)
            : fail('Piper synthesis', `status ${speech.status}, ${speech.bytes.length} bytes`);
    } else {
        warn('Piper TTS', 'server not running on :5500 (start via admin app) — synthesis not tested');
    }
}

async function testBrowser() {
    section('6. Browser smoke test (Chromium via Electron)');
    if (!fs.existsSync(ELECTRON_BIN)) {
        warn('browser test', `electron not found at ${ELECTRON_BIN} — run npm install in admin/`);
        return;
    }
    const report = await new Promise((resolve) => {
        const proc = spawn(ELECTRON_BIN, [path.join(__dirname, 'browser_check.js')], {
            env: { ...process.env, E2E_URL: `http://localhost:${APP_PORT}`, E2E_WAIT_MS: '15000' },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let out = '';
        proc.stdout.on('data', d => out += d);
        proc.stderr.on('data', () => {});
        proc.on('exit', () => {
            const m = out.match(/__E2E_REPORT__(.*)__END__/s);
            try { resolve(m ? JSON.parse(m[1]) : null); } catch { resolve(null); }
        });
        setTimeout(() => { try { proc.kill('SIGKILL'); } catch {}; resolve(null); }, 60000);
    });

    if (!report) { fail('browser smoke test', 'no report produced (Electron crashed or timed out)'); return; }

    report.loaded
        ? pass('page loaded')
        : fail('page load', report.loadError || 'did-fail-load');

    report.reactMounted
        ? pass('React app mounted (#root has content)')
        : fail('React mount', '#root is empty after 15s');

    // Requests that depend on live services (LM Studio, Piper TTS) are
    // availability issues, not build issues — section 5 reports those.
    const isServiceDependent = (r) =>
        r.url.includes('localhost:1234') ||
        /\/v1\/(models|chat|completions|audio)/.test(r.url);
    const badRequests = (report.failedRequests || []).filter(r => !isServiceDependent(r));
    const serviceFails = (report.failedRequests || []).filter(isServiceDependent);
    badRequests.length === 0
        ? pass('no failed network requests (404/500)')
        : fail('network requests', `${badRequests.length} failed: ${badRequests.slice(0, 6).map(r => `${r.url.replace(/^https?:\/\/[^/]+/, '')} (${r.status})`).join(', ')}${badRequests.length > 6 ? '…' : ''}`);
    if (serviceFails.length > 0) {
        warn('service-dependent requests', `${serviceFails.length} failed (LM Studio/TTS offline)`);
    }

    const realErrors = (report.consoleErrors || []).filter(e =>
        !e.includes('LM Studio') &&            // offline LLM is allowed (warned above)
        !e.includes('ERR_CONNECTION_REFUSED') &&  // ditto, raw form
        !e.includes('[TTS-Bot]') &&            // TTS engine offline in test env
        !e.includes('No TTS available')
    );
    realErrors.length === 0
        ? pass('no console errors')
        : fail('console errors', `${realErrors.length} error(s): ${realErrors.slice(0, 3).join(' | ').slice(0, 300)}`);

    if ((report.consoleWarnings || []).length > 0) {
        warn('console warnings', `${report.consoleWarnings.length} warning(s) — first: ${report.consoleWarnings[0].slice(0, 120)}`);
    }
}

async function testRemediationMode() {
    section('7. Remediation focus mode (?mode=remediation)');
    if (!fs.existsSync(ELECTRON_BIN)) {
        warn('remediation mode', 'electron not found — skipped');
        return;
    }
    const report = await new Promise((resolve) => {
        const proc = spawn(ELECTRON_BIN, [path.join(__dirname, 'browser_check.js')], {
            env: {
                ...process.env,
                E2E_URL: `http://localhost:${APP_PORT}/?mode=remediation`,
                E2E_WAIT_MS: '15000',
                E2E_EXPECT_SELECTOR: '[aria-label="PDF Accessibility Audit"]',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let out = '';
        proc.stdout.on('data', d => out += d);
        proc.stderr.on('data', () => {});
        proc.on('exit', () => {
            const m = out.match(/__E2E_REPORT__(.*)__END__/s);
            try { resolve(m ? JSON.parse(m[1]) : null); } catch { resolve(null); }
        });
        setTimeout(() => { try { proc.kill('SIGKILL'); } catch {}; resolve(null); }, 60000);
    });

    if (!report) { fail('remediation mode', 'no report produced'); return; }
    report.reactMounted
        ? pass('app booted in remediation mode (React mounted)')
        : fail('remediation mode', '#root empty — focus mode did not boot');
    report.selectorFound
        ? pass('remediation screen open (PDF Accessibility Audit modal present)')
        : fail('remediation modal', 'audit modal not auto-opened in remediation mode');
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
    console.log('AlloFlow E2E Test Suite');
    console.log('=======================');

    if (!fs.existsSync(BUILD_DIR)) {
        console.error(`Build dir missing: ${BUILD_DIR}\nRun: node local_build.js`);
        process.exit(1);
    }

    try {
        await startStack();
        await testBackendAPI();
        await testAppServer();
        await testAssetCompleteness();
        await testCriticalAssets();
        await testAIProxy();
        if (!skipBrowser) await testBrowser();
        if (!skipBrowser) await testRemediationMode();
    } catch (err) {
        fail('suite', err.message);
    } finally {
        stopStack();
    }

    console.log('\n━━ Summary ━━');
    console.log(`  ${passed} passed, ${failed} failed, ${warned} warnings`);
    if (failures.length) {
        console.log('\nFailures:');
        failures.forEach(f => console.log(`  • ${f}`));
    }
    process.exit(failed > 0 ? 1 : 0);
})();
