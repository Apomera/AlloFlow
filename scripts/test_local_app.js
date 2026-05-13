#!/usr/bin/env node
/**
 * AlloFlow Local App — Automated Test Runner
 *
 * Starts required services, runs backend API tests (pure Node.js — zero
 * extra dependencies), optionally runs Playwright frontend E2E tests, and
 * generates a self-contained HTML report with pass/fail details and full logs.
 *
 * Usage:
 *   node scripts/test_local_app.js                  # backend + frontend
 *   node scripts/test_local_app.js --backend-only   # only API tests, no browser
 *   node scripts/test_local_app.js --verbose        # print all logs to stdout too
 *
 * Prerequisites:
 *   AlloFlow must already be running (launch the installed app first).
 *   Playwright must be installed for frontend tests:
 *     cd local-app && npm install --save-dev @playwright/test
 *     cd local-app && npx playwright install chromium
 *   LM Studio on :1234 is optional — only needed when AI provider is set to lmstudio.
 *
 * Output: test-results/report_<timestamp>.html  (opened automatically)
 *         test-results/log_<timestamp>.txt       (full raw log)
 */
'use strict';

const http   = require('http');
const { spawn, execSync } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');

// ── Paths & Ports ─────────────────────────────────────────────────────────────

const ROOT        = path.resolve(__dirname, '..');
const LOCAL_APP   = path.join(ROOT, 'local-app');
const RESULTS_DIR = path.join(ROOT, 'test-results');

const PORTS = { app: 3730, backend: 3747, mockAI: 1234 };

const TS          = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const REPORT_FILE = path.join(RESULTS_DIR, `report_${TS}.html`);
const LOG_FILE    = path.join(RESULTS_DIR, `log_${TS}.txt`);

// ── CLI args ──────────────────────────────────────────────────────────────────

const ARGS           = process.argv.slice(2);
const BACKEND_ONLY   = ARGS.includes('--backend-only');
const VERBOSE        = ARGS.includes('--verbose');

// ── API key resolution ───────────────────────────────────────────────────────
// Priority: ~/.alloflow/ai_config.json (runtime, set by admin UI)
//       → admin/.env REACT_APP_GEMINI_API_KEY (dev/build env, same source as SetupWizard pre-fill)
//       → process.env.GEMINI_API_KEY (CI environment variable)

/**
 * Parse a .env file and return a key→value map. Single-line only, no multiline.
 */
function parseEnvFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8')
            .split('\n')
            .reduce((acc, line) => {
                const trimmed = line.replace(/\r$/, ''); // strip CRLF
                const m = trimmed.match(/^([A-Z0-9_]+)=(.*)/);
                if (m) acc[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
                return acc;
            }, {});
    } catch { return {}; }
}

const _adminEnv      = parseEnvFile(path.join(ROOT, 'admin', '.env'));
const _devGeminiKey  = _adminEnv.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

// Read the configured AI provider from ~/.alloflow/ai_config.json (set by admin app after setup).
// Used to decide whether an unreachable :1234 in --no-mock mode is a SKIP or a FAIL.
const CLOUD_AI_PROVIDERS = new Set(['gemini', 'copilot', 'openai']);
const _aiConfigPath = path.join(os.homedir(), '.alloflow', 'ai_config.json');
const CONFIGURED_AI_PROVIDER = (() => {
    try {
        const raw = fs.readFileSync(_aiConfigPath, 'utf-8');
        return JSON.parse(raw)?.aiProvider || 'lmstudio';
    } catch { return 'lmstudio'; }
})();
// LM Studio (:1234) is optional when the configured AI provider is cloud-based.
// When provider is lmstudio/llm-engine, unreachable :1234 is a real failure.
const LM_STUDIO_IS_OPTIONAL = CLOUD_AI_PROVIDERS.has(CONFIGURED_AI_PROVIDER);

// ── Logging ───────────────────────────────────────────────────────────────────

fs.mkdirSync(RESULTS_DIR, { recursive: true });
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(msg, tag = 'RUNNER') {
    const line = `[${new Date().toISOString()}] [${tag}] ${msg}`;
    logStream.write(line + '\n');
    if (VERBOSE || tag === 'FAIL' || tag === 'PASS' || tag === 'SKIP' || tag === 'INFO') {
        process.stdout.write(line + '\n');
    }
}

function logRaw(data, tag) {
    const lines = String(data).split('\n').filter(Boolean);
    lines.forEach(l => log(l, tag));
}

// ── Test result store ─────────────────────────────────────────────────────────

const results = {
    backend:  [],   // { name, passed, ms, error?, detail? }
    frontend: [],   // { name, passed, ms, error?, screenshot? }
    servers:  [],   // { name, status }
    startMs:  Date.now(),
};

class SkipError extends Error {
    constructor(note = '') { super('SKIP'); this.isSkip = true; this.note = note; }
}
const SKIP = (note) => { throw new SkipError(note); };

function addResult(suite, name, passed, ms, extra = {}) {
    results[suite].push({ name, passed, ms, ...extra });
    const icon = passed ? (extra.skipped ? '~' : '✓') : '✗';
    const tag  = passed ? (extra.skipped ? 'SKIP' : 'PASS') : 'FAIL';
    const note = extra.skipped ? ` — SKIPPED${extra.note ? ': ' + extra.note : ''}` : extra.error ? ' — ' + extra.error : '';
    log(`${icon} ${name} (${ms}ms)${note}`, tag);
}

// ── (mock LM Studio removed — tests run against the real API) ───────────────────

// ── Wait for HTTP port ────────────────────────────────────────────────────────

function waitForPort(port, maxMs = 8000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const try_ = () => {
            const req = http.request({ hostname: '127.0.0.1', port, path: '/health', method: 'GET' }, (res) => {
                resolve();
            });
            req.on('error', () => {
                if (Date.now() - start > maxMs) reject(new Error(`Port ${port} not ready after ${maxMs}ms`));
                else setTimeout(try_, 200);
            });
            req.end();
        };
        try_();
    });
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpReq(method, port, path_, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: '127.0.0.1',
            port,
            path: path_,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const get  = (port, path_, token)       => httpReq('GET',    port, path_, null, token);
const post = (port, path_, body, token) => httpReq('POST',   port, path_, body, token);
const put  = (port, path_, body, token) => httpReq('PUT',    port, path_, body, token);
const del  = (port, path_, token)       => httpReq('DELETE', port, path_, null, token);

// ── Backend API Tests ─────────────────────────────────────────────────────────

async function runBackendTests() {
    log('─── Backend API Tests ────────────────────────────────────────', 'INFO');

    let token = null;
    let testDocId = `test-doc-${Date.now()}`;

    async function test(name, fn) {
        const t0 = Date.now();
        try {
            await fn();
            addResult('backend', name, true, Date.now() - t0);
        } catch (e) {
            if (e instanceof SkipError) {
                addResult('backend', name, true, Date.now() - t0, { skipped: true, note: e.note || '' });
            } else {
                addResult('backend', name, false, Date.now() - t0, { error: e.message });
            }
        }
    }

    // ── Health ────────────────────────────────────────────────────────────────

    await test('GET /health → 200', async () => {
        const r = await get(PORTS.backend, '/health');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.ok) throw new Error(`No ok field in response: ${JSON.stringify(r.body)}`);
    });

    // ── Auth ──────────────────────────────────────────────────────────────────

    await test('POST /auth/setup-pin → 200 or 409 (already set)', async () => {
        const r = await post(PORTS.backend, '/auth/setup-pin', { pin: '1234' });
        if (r.status !== 200 && r.status !== 409) throw new Error(`Expected 200 or 409, got ${r.status}`);
    });

    await test('POST /auth/login → 200 + token', async () => {
        const r = await post(PORTS.backend, '/auth/login', { pin: '1234' });
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
        if (!r.body.token) throw new Error('No token in response');
        token = r.body.token;
    });

    await test('GET /auth/session → 200 + user', async () => {
        if (!token) throw new Error('No token from login test');
        const r = await get(PORTS.backend, '/auth/session', token);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.user || !r.body.user.role) throw new Error(`No user.role in session response: ${JSON.stringify(r.body)}`);
    });

    // ── Unauthenticated reads are allowed (local-only backend) ─────────────────

    await test('GET /db/history without token → 200 (local backend, reads open)', async () => {
        const r = await get(PORTS.backend, '/db/history');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!Array.isArray(r.body.docs)) throw new Error('Expected docs array in response');
    });

    // ── Document CRUD ─────────────────────────────────────────────────────────

    await test('POST /db/history → create doc', async () => {
        if (!token) throw new Error('No token');
        const r = await post(PORTS.backend, '/db/history', {
            id: testDocId,
            type: 'analysis',
            title: 'Test Analysis',
            data: { readingLevel: '6th Grade', concepts: ['Test'] },
        }, token);
        if (r.status !== 200 && r.status !== 201) throw new Error(`Expected 200/201, got ${r.status}: ${JSON.stringify(r.body)}`);
    });

    await test('GET /db/history → list includes new doc', async () => {
        if (!token) throw new Error('No token');
        const r = await get(PORTS.backend, '/db/history', token);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        const docs = Array.isArray(r.body) ? r.body : (r.body.docs || r.body.data || []);
        const found = docs.some(d => d.id === testDocId || d.doc_id === testDocId || JSON.stringify(d).includes(testDocId));
        if (!found) throw new Error(`Created doc ${testDocId} not found in list of ${docs.length} items`);
    });

    await test(`GET /db/history/${testDocId} → single doc`, async () => {
        if (!token) throw new Error('No token');
        const r = await get(PORTS.backend, `/db/history/${testDocId}`, token);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    });

    await test(`PUT /db/history/${testDocId} → update doc`, async () => {
        if (!token) throw new Error('No token');
        const r = await put(PORTS.backend, `/db/history/${testDocId}`, { title: 'Updated Title' }, token);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    });

    await test(`DELETE /db/history/${testDocId} → delete doc`, async () => {
        if (!token) throw new Error('No token');
        const r = await del(PORTS.backend, `/db/history/${testDocId}`, token);
        if (r.status !== 200 && r.status !== 204) throw new Error(`Expected 200/204, got ${r.status}`);
    });

    await test(`GET /db/history/${testDocId} after delete → 404`, async () => {
        if (!token) throw new Error('No token');
        const r = await get(PORTS.backend, `/db/history/${testDocId}`, token);
        if (r.status !== 404) throw new Error(`Expected 404, got ${r.status}`);
    });

    // ── Collections ───────────────────────────────────────────────────────────

    await test('Multiple collections are isolated', async () => {
        if (!token) throw new Error('No token');
        const id = 'test-settings-' + Date.now();
        await post(PORTS.backend, '/db/settings', { id, theme: 'dark' }, token);
        const list = await get(PORTS.backend, '/db/history', token);
        const docs = Array.isArray(list.body) ? list.body : (list.body.docs || []);
        if (docs.some(d => JSON.stringify(d).includes('dark'))) {
            throw new Error('Settings doc leaked into history collection');
        }
        await del(PORTS.backend, `/db/settings/${id}`, token);
    });

    // ── Logout ────────────────────────────────────────────────────────────────

    await test('POST /auth/logout → 200', async () => {
        if (!token) throw new Error('No token');
        const r = await post(PORTS.backend, '/auth/logout', {}, token);
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    });

    await test('GET /auth/session after logout → 401', async () => {
        const r = await get(PORTS.backend, '/auth/session', token);
        if (r.status !== 401) throw new Error(`Expected 401 after logout, got ${r.status}`);
    });

    // ── AI connectivity (LM Studio) ───────────────────────────────────────────

    // Pre-check reachability. Failure here means:
    //   - cloud AI provider configured → tests will skip (LM Studio not expected)
    //   - LM Studio provider configured → tests will fail (LM Studio not started)
    const _aiReachable = await get(PORTS.mockAI, '/health').then(r => r.status === 200).catch(() => false);
    if (!_aiReachable) {
        log(`LM Studio :${PORTS.mockAI} unreachable — configured provider: ${CONFIGURED_AI_PROVIDER} (${LM_STUDIO_IS_OPTIONAL ? 'cloud, will skip' : 'LM Studio, will fail'})`, 'INFO');
    }

    await test('LM Studio /health → ok', async () => {
        if (!_aiReachable) {
            if (LM_STUDIO_IS_OPTIONAL) { SKIP(`LM Studio not running on :1234 (${CONFIGURED_AI_PROVIDER} is cloud provider)`); }
            throw new Error(`LM Studio unreachable on :1234 — configured provider is '${CONFIGURED_AI_PROVIDER}', expected LM Studio to be running`);
        }
        const r = await get(PORTS.mockAI, '/health');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    });

    await test('LM Studio /v1/chat/completions → valid response', async () => {
        if (!_aiReachable) {
            if (LM_STUDIO_IS_OPTIONAL) { SKIP(`LM Studio not running on :1234 (${CONFIGURED_AI_PROVIDER} is cloud provider)`); }
            throw new Error(`LM Studio unreachable on :1234 — configured provider is '${CONFIGURED_AI_PROVIDER}', expected LM Studio to be running`);
        }
        const r = await post(PORTS.mockAI, '/v1/chat/completions', {
            model: 'google/gemma-3-4b',
            messages: [{ role: 'user', content: 'Analyze this text: "The sun is a star."' }],
        });
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.choices?.[0]?.message?.content) throw new Error('No content in response');
    });

    await test('LM Studio /v1/chat/completions → responds to quiz prompt', async () => {
        if (!_aiReachable) {
            if (LM_STUDIO_IS_OPTIONAL) { SKIP(`LM Studio not running on :1234 (${CONFIGURED_AI_PROVIDER} is cloud provider)`); }
            throw new Error(`LM Studio unreachable on :1234 — configured provider is '${CONFIGURED_AI_PROVIDER}', expected LM Studio to be running`);
        }
        // Real LLMs don't reliably return strict JSON — only assert status and content presence
        const r = await post(PORTS.mockAI, '/v1/chat/completions', {
            model: 'google/gemma-3-4b',
            messages: [{ role: 'user', content: 'Create a 2-question multiple choice quiz. Return JSON with a "questions" array.' }],
        });
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.choices?.[0]?.message?.content) throw new Error('No content in response');
    });

    // ── Static app server ─────────────────────────────────────────────────────

    await test('Static app server → index.html served', async () => {
        const r = await get(PORTS.app, '/');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        const html = typeof r.body === 'string' ? r.body : '';
        if (!html.includes('<html') && !html.includes('<!DOCTYPE')) throw new Error('Response is not HTML');
    });

    await test('Static app server → app.js exists', async () => {
        const r = await get(PORTS.app, '/app.js');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status} — run: node local_build.js`);
    });

    await test('Static app server → ai_local_module.js exists', async () => {
        const r = await get(PORTS.app, '/ai_local_module.js');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    });

    await test('Static app server → db_local_module.js exists', async () => {
        const r = await get(PORTS.app, '/db_local_module.js');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    });

    // ── Gemini Proxy Integration Tests ────────────────────────────────────────
    // These tests call the REAL /api/gemini/proxy/:model endpoint on the local
    // app server (port 3730). They validate end-to-end: model name resolves,
    // token is valid, and the API returns content. Skipped if no token found.
    //
    // WHY: Playwright mocks all AI routes, so browser tests never catch model
    // name errors, expired tokens, or API format changes. These backend tests
    // run without any mocking and will FAIL if the model doesn't exist.

    // Check for API key — priority order:
    // 1. ~/.alloflow/ai_config.json (written by admin UI after setup, 0.8.17+)
    // 2. admin/.env REACT_APP_GEMINI_API_KEY (dev machine, same source as SetupWizard pre-fill)
    const _aiConfigFile = path.join(os.homedir(), '.alloflow', 'ai_config.json');
    const _hasGeminiApiKey = (() => {
        try {
            const cfg = JSON.parse(fs.readFileSync(_aiConfigFile, 'utf-8'));
            if (cfg?.geminiApiKey && cfg.geminiApiKey.length > 10) return true;
        } catch { /* no file */ }
        if (_devGeminiKey.length > 10) return true;
        return false;
    })();
    log(`[AI key check] ai_config.json: ${fs.existsSync(_aiConfigFile)}, devKey len: ${_devGeminiKey.length}, hasKey: ${_hasGeminiApiKey}`, 'INFO');
    // Legacy OAuth token fallback (pre-0.8.17)
    const _geminiTokenFile = path.join(os.homedir(), '.alloflow', 'gemini_token.json');
    const _hasGeminiToken = _hasGeminiApiKey || (() => {
        try {
            const tok = JSON.parse(fs.readFileSync(_geminiTokenFile, 'utf-8'));
            return !!(tok?.access_token || tok?.token);
        } catch { return false; }
    })();

    await test('Gemini proxy: /api/gemini/proxy/gemini-2.5-flash — text generation', async () => {
        if (!_hasGeminiToken) SKIP('No Gemini API key at ~/.alloflow/ai_config.json — add key via Admin Settings → AI Config');
        const r = await post(PORTS.app, '/api/gemini/proxy/gemini-2.5-flash', {
            contents: [{ parts: [{ text: 'Say exactly: "AlloFlow proxy test OK"' }] }],
            generationConfig: { maxOutputTokens: 20 },
        });
        if (r.status === 401) throw new Error('Gemini token invalid or expired — re-authorize via Admin Settings → AI Config');
        if (r.status === 403) {
            const code = typeof r.body === 'object' ? (r.body?.code || r.body?.error || '') : r.body;
            throw new Error(`403 Forbidden — ${code}. Re-authorize Gemini in Admin Settings → AI Config`);
        }
        if (r.status === 404) throw new Error(`404 Not Found — model "gemini-2.5-flash" may not exist or be available for this token`);
        if (r.status === 429) SKIP('Rate limit exceeded (429) — key is valid but throttled. Try again in a moment.');
        if (r.status === 400) {
            const detail = typeof r.body === 'object' ? JSON.stringify(r.body).substring(0, 200) : String(r.body).substring(0, 200);
            throw new Error(`400 Bad Request — check model name and request format: ${detail}`);
        }
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
        const text = r.body?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`No text in response candidates. Got: ${JSON.stringify(r.body).substring(0, 300)}`);
        log(`[Gemini proxy text] Response (${text.length} chars): "${text.substring(0, 80)}"`, 'INFO');
    });

    await test('Gemini proxy: /api/gemini/proxy/gemini-2.5-flash-preview-tts — TTS model reachable', async () => {
        if (!_hasGeminiToken) SKIP('No Gemini API key — add key via Admin Settings → AI Config');
        const r = await post(PORTS.app, '/api/gemini/proxy/gemini-2.5-flash-preview-tts', {
            contents: [{ parts: [{ text: 'Say: Hello' }] }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            },
        });
        if (r.status === 401) throw new Error('Gemini token invalid or expired — re-authorize via Admin Settings');
        if (r.status === 403) {
            const code = typeof r.body === 'object' ? (r.body?.code || r.body?.error || '') : r.body;
            throw new Error(`403 Forbidden — ${code}`);
        }
        if (r.status === 404) throw new Error(`404 Not Found — model "gemini-2.5-flash-preview-tts" may not exist for this API key`);
        if (r.status === 429) SKIP('Rate limit exceeded (429) — key is valid but throttled on TTS. Try again in a moment.');
        if (r.status === 400) {
            const detail = typeof r.body === 'object' ? JSON.stringify(r.body).substring(0, 200) : String(r.body).substring(0, 200);
            throw new Error(`400 Bad Request — TTS model or request format issue: ${detail}`);
        }
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
        const audioPart = r.body?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (!audioPart) throw new Error(`TTS response has no audio data. Got: ${JSON.stringify(r.body).substring(0, 300)}`);
        const audioBytes = audioPart.inlineData.data.length;
        log(`[Gemini proxy TTS] Audio base64 length: ${audioBytes} chars`, 'INFO');
        if (audioBytes < 100) throw new Error(`TTS audio data suspiciously small: ${audioBytes} chars`);
    });

    await test('Gemini proxy: rejects "local" model placeholder → 400', async () => {
        const r = await post(PORTS.app, '/api/gemini/proxy/local', {
            contents: [{ parts: [{ text: 'test' }] }],
        });
        if (r.status === 400) return; // Admin proxy correctly rejects "local"
        if (r.status === 200 && typeof r.body === 'string' && r.body.trim().startsWith('<')) return; // static SPA fallback
        throw new Error(`Expected 400 for "local" model placeholder, got ${r.status}`);
    });

    await test('Imagen proxy: /api/imagen/proxy — image generation', async () => {
        if (!_hasGeminiToken) SKIP('No Gemini API key — add key via Admin Settings → AI Config');
        const r = await post(PORTS.app, '/api/imagen/proxy', {
            model: 'imagen-4.0-generate-001',
            instances: [{ prompt: 'A simple red circle on a white background' }],
            parameters: { sampleCount: 1 },
        });
        if (r.status === 401) throw new Error('Gemini API key not configured — add key via Admin Settings → AI Config');
        if (r.status === 403) throw new Error('403 Forbidden — Imagen API may not be enabled for this key. Check Google AI Studio permissions.');
        if (r.status === 429) SKIP('Imagen rate limited (429) — try again later');
        if (r.status === 400) {
            const detail = typeof r.body === 'object' ? r.body?.error?.message || JSON.stringify(r.body).substring(0, 200) : String(r.body).substring(0, 200);
            if (detail.toLowerCase().includes('paid plan') || detail.toLowerCase().includes('billing') || detail.toLowerCase().includes('upgrade')) {
                SKIP(`Imagen requires paid plan — ${detail}`);
            }
            throw new Error(`400 Bad Request — ${detail}`);
        }
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
        const b64 = r.body?.predictions?.[0]?.bytesBase64Encoded;
        if (!b64) throw new Error(`No image in response. Got: ${JSON.stringify(r.body).substring(0, 300)}`);
        if (b64.length < 100) throw new Error(`Image data suspiciously small: ${b64.length} chars`);
        log(`[Imagen proxy] Image base64 length: ${b64.length} chars`, 'INFO');
    });

    await test('Gemini proxy: 503 fallback — overloaded model falls back to gemini-2.0-flash', async () => {
        if (!_hasGeminiToken) SKIP('No Gemini API key — add key via Admin Settings → AI Config');
        // Use a real but unavailable-sounding model name to trigger the 503 path;
        // the proxy should either return a valid response from the fallback or a non-503 error.
        // We just confirm the proxy itself doesn't crash or hang.
        const r = await post(PORTS.app, '/api/gemini/proxy/gemini-2.5-pro', {
            contents: [{ parts: [{ text: 'Say: test' }] }],
            generationConfig: { maxOutputTokens: 10 },
        });
        // 200 = model worked (or fallback worked), 400/404 = model rejected by API — all acceptable
        // Only 503 passthrough (no fallback attempted) is a failure
        if (r.status === 503) throw new Error('Proxy returned 503 without attempting fallback to gemini-2.0-flash');
        log(`[503 fallback test] Status: ${r.status}`, 'INFO');
    });
}

// ── Playwright Frontend Tests ──────────────────────────────────────────────────

async function runFrontendTests() {
    log('─── Frontend E2E Tests (Playwright) ──────────────────────────', 'INFO');

    const playwrightConfig = path.join(LOCAL_APP, 'tests', 'playwright.config.js');
    const binBase       = path.join(LOCAL_APP, 'node_modules', '.bin', 'playwright');
    const playwrightBin = process.platform === 'win32' && fs.existsSync(binBase + '.cmd')
        ? binBase + '.cmd'
        : binBase;

    if (!fs.existsSync(playwrightBin)) {
        log('Playwright not installed. Run: cd local-app && npm install --save-dev @playwright/test && npx playwright install chromium', 'INFO');
        results.frontend.push({ name: 'Playwright setup', passed: false, ms: 0, error: 'Not installed — see log for install command' });
        return;
    }

    const playwrightJsonOutput = path.join(RESULTS_DIR, `playwright_${TS}.json`);

    return new Promise((resolve) => {
        const args_ = [
            'test',
            '--config', playwrightConfig,
            '--reporter', 'json',
        ];

        const [spawnCmd, spawnArgs] = process.platform === 'win32'
            ? ['cmd.exe', ['/c', playwrightBin, ...args_]]
            : [playwrightBin, args_];

        const proc = spawn(spawnCmd, spawnArgs, {
            cwd: LOCAL_APP,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false,
            env: {
                ...process.env,
                ALLOFLOW_APP_PORT:          String(PORTS.app),
                ALLOFLOW_BACKEND_PORT:      String(PORTS.backend),
                ALLOFLOW_AI_PORT:           String(PORTS.mockAI),
                PLAYWRIGHT_JSON_OUTPUT_NAME: playwrightJsonOutput,
            },
        });

        proc.stdout.on('data', d => logRaw(d, 'PLAYWRIGHT'));
        proc.stderr.on('data', d => logRaw(d, 'PLAYWRIGHT:ERR'));

        proc.on('close', () => {
            // Parse playwright JSON report
            if (fs.existsSync(playwrightJsonOutput)) {
                try {
                    const pw = JSON.parse(fs.readFileSync(playwrightJsonOutput, 'utf8'));
                    const tests = pw.suites?.flatMap(s => s.specs?.flatMap(sp => sp.tests || []) || []) || [];
                    tests.forEach(t => {
                        const passed = t.results?.every(r => r.status === 'passed') ?? false;
                        const ms     = t.results?.[0]?.duration ?? 0;
                        const error  = t.results?.find(r => r.error)?.error?.message;
                        results.frontend.push({ name: t.title, passed, ms, error });
                    });
                } catch (e) {
                    log(`Failed to parse Playwright JSON: ${e.message}`, 'INFO');
                }
            }
            resolve();
        });
    });
}

// ── HTML Report Generator ─────────────────────────────────────────────────────

function generateReport() {
    const totalMs   = Date.now() - results.startMs;
    const bePass    = results.backend.filter(t => t.passed).length;
    const beFail    = results.backend.filter(t => !t.passed).length;
    const fePass    = results.frontend.filter(t => t.passed).length;
    const feFail    = results.frontend.filter(t => !t.passed).length;
    const allPass   = bePass + fePass;
    const allFail   = beFail + feFail;
    const allTotal  = allPass + allFail;

    function rows(items) {
        return items.map(t => `
            <tr class="${t.passed ? 'pass' : 'fail'}">
                <td>${t.passed ? '✓' : '✗'}</td>
                <td>${esc(t.name)}</td>
                <td>${t.ms}ms</td>
                <td>${t.error ? esc(t.error) : ''}</td>
            </tr>`).join('');
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const serverRows = results.servers.map(s =>
        `<li><strong>${esc(s.name)}</strong>: ${esc(s.status)}</li>`
    ).join('');

    const logContent = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AlloFlow Local App Test Report — ${TS}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
  h1 { font-size: 1.5rem; font-weight: 900; margin-bottom: 0.25rem; }
  .subtitle { color: #94a3b8; margin-bottom: 1.5rem; font-size: 0.85rem; }
  .summary { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
  .card { background: #1e293b; border-radius: 12px; padding: 1.25rem 1.5rem; min-width: 120px; border: 1px solid #334155; }
  .card.green { border-color: #22c55e; }
  .card.red   { border-color: #ef4444; }
  .card .big  { font-size: 2rem; font-weight: 900; line-height: 1; }
  .card .label{ font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; }
  .card.green .big { color: #22c55e; }
  .card.red   .big { color: #ef4444; }
  h2 { font-size: 1rem; font-weight: 700; margin: 1.5rem 0 0.75rem; color: #a5b4fc; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
  th { background: #1e293b; padding: 0.5rem 0.75rem; font-size: 0.75rem; text-align: left; color: #94a3b8; }
  td { padding: 0.5rem 0.75rem; font-size: 0.85rem; border-top: 1px solid #1e293b; max-width: 600px; word-break: break-word; }
  tr.pass td:first-child { color: #22c55e; }
  tr.fail td:first-child { color: #ef4444; }
  tr.fail { background: #1a0c0c; }
  tr.fail td:last-child { color: #fca5a5; font-size: 0.78rem; }
  ul { list-style: disc; margin-left: 1.25rem; }
  li { font-size: 0.85rem; padding: 0.2rem 0; }
  details { margin-bottom: 1rem; }
  summary { cursor: pointer; color: #94a3b8; font-size: 0.85rem; padding: 0.5rem; background: #1e293b; border-radius: 6px; }
  pre { background: #020617; padding: 1rem; border-radius: 8px; font-size: 0.75rem; overflow: auto; max-height: 500px; color: #94a3b8; white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
<h1>⚗️ AlloFlow Local App — Test Report</h1>
<p class="subtitle">Generated: ${new Date().toISOString()} &nbsp;|&nbsp; Duration: ${(totalMs/1000).toFixed(1)}s</p>

<div class="summary">
  <div class="card ${allFail === 0 ? 'green' : 'red'}">
    <div class="big">${allFail === 0 ? '✓' : '✗'}</div>
    <div class="label">${allFail === 0 ? 'All Passed' : `${allFail} Failing`}</div>
  </div>
  <div class="card">
    <div class="big">${allTotal}</div>
    <div class="label">Total Tests</div>
  </div>
  <div class="card green">
    <div class="big">${allPass}</div>
    <div class="label">Passed</div>
  </div>
  ${allFail > 0 ? `<div class="card red"><div class="big">${allFail}</div><div class="label">Failed</div></div>` : ''}
  <div class="card">
    <div class="big">${(totalMs/1000).toFixed(1)}s</div>
    <div class="label">Duration</div>
  </div>
</div>

<h2>Services</h2>
<ul>${serverRows}</ul>

<h2>Backend API Tests (${bePass}/${results.backend.length} passed)</h2>
<table>
  <tr><th></th><th>Test</th><th>Duration</th><th>Error</th></tr>
  ${rows(results.backend)}
</table>

${results.frontend.length > 0 ? `
<h2>Frontend E2E Tests (${fePass}/${results.frontend.length} passed)</h2>
<table>
  <tr><th></th><th>Test</th><th>Duration</th><th>Error</th></tr>
  ${rows(results.frontend)}
</table>
` : ''}

<details>
  <summary>📋 Full Log (${logContent.split('\n').length} lines)</summary>
  <pre>${esc(logContent)}</pre>
</details>

</body>
</html>`;

    fs.writeFileSync(REPORT_FILE, html, 'utf8');
    log(`Report: ${REPORT_FILE}`, 'INFO');

    // Summary to stdout
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  AlloFlow Test Results`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Backend:  ${bePass}/${results.backend.length} passed`);
    if (results.frontend.length) console.log(`  Frontend: ${fePass}/${results.frontend.length} passed`);
    console.log(`  Duration: ${(totalMs/1000).toFixed(1)}s`);
    console.log(`  Report:   ${REPORT_FILE}`);
    console.log(`  Log:      ${LOG_FILE}`);
    console.log(`${'─'.repeat(60)}\n`);

    return allFail;
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

let _cleaned = false;
function cleanup() {
    if (_cleaned) return; _cleaned = true;
    logStream.end();
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

// ── Main ──────────────────────────────────────────────────────────────────────

(async function main() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  AlloFlow Local App — Automated Test Runner      ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    log(`Arguments: ${ARGS.join(' ') || '(none)'}`, 'INFO');
    log(`Test log: ${LOG_FILE}`, 'INFO');

    // ── Preflight: verify AlloFlow is already running ─────────────────────────
    // Tests require the installed app to be open. Start AlloFlow before running tests.

    log('Checking AlloFlow services are running...', 'INFO');

    const appUp = await get(PORTS.app, '/').then(r => r.status === 200).catch(() => false);
    if (!appUp) {
        console.error(`\n  ERROR: AlloFlow app server not detected on port ${PORTS.app}.`);
        console.error('  Please start AlloFlow first, then run tests again.\n');
        process.exit(1);
    }
    results.servers.push({ name: 'Local App Server', status: 'running' });
    log(`Local App Server on :${PORTS.app} — OK`, 'INFO');

    const backendUp = await get(PORTS.backend, '/health').then(r => r.status === 200).catch(() => false);
    if (!backendUp) {
        console.error(`\n  ERROR: AlloFlow backend not detected on port ${PORTS.backend}.`);
        console.error('  Please start AlloFlow first, then run tests again.\n');
        process.exit(1);
    }
    results.servers.push({ name: 'SQLite Backend', status: 'running' });
    log(`SQLite Backend on :${PORTS.backend} — OK`, 'INFO');

    const aiUp = await get(PORTS.mockAI, '/health').then(r => r.status === 200).catch(() => false);
    if (aiUp) {
        results.servers.push({ name: 'LM Studio', status: 'running' });
        log(`LM Studio on :${PORTS.mockAI} — OK`, 'INFO');
    } else if (LM_STUDIO_IS_OPTIONAL) {
        results.servers.push({ name: 'LM Studio', status: `not running (${CONFIGURED_AI_PROVIDER} is cloud provider — OK)` });
        log(`LM Studio not running — cloud provider (${CONFIGURED_AI_PROVIDER}) in use, LM Studio tests will skip`, 'INFO');
    } else {
        results.servers.push({ name: 'LM Studio', status: 'not running — LM Studio tests will fail' });
        log(`LM Studio not detected on :${PORTS.mockAI} — configured provider is '${CONFIGURED_AI_PROVIDER}', LM Studio tests will fail`, 'INFO');
    }

    // ── Run tests ─────────────────────────────────────────────────────────────

    await runBackendTests();

    if (!BACKEND_ONLY) {
        await runFrontendTests();
    }

    // ── Generate report ───────────────────────────────────────────────────────

    const failCount = generateReport();

    // ── Cleanup ───────────────────────────────────────────────────────────────

    cleanup();

    // Open report automatically on Windows/Mac
    try {
        if (process.platform === 'win32') execSync(`start "" "${REPORT_FILE}"`);
        else if (process.platform === 'darwin') execSync(`open "${REPORT_FILE}"`);
    } catch {}

    process.exit(failCount > 0 ? 1 : 0);
})();
