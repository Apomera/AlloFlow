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
 *   node scripts/test_local_app.js --no-mock        # use real LM Studio on :1234
 *   node scripts/test_local_app.js --verbose        # print all logs to stdout too
 *   node scripts/test_local_app.js --keep-servers   # don't kill servers after tests
 *
 * Prerequisites for frontend tests:
 *   cd local-app && npm install --save-dev @playwright/test
 *   cd local-app && npx playwright install chromium
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
const NO_MOCK_AI     = ARGS.includes('--no-mock');
const VERBOSE        = ARGS.includes('--verbose');
const KEEP_SERVERS   = ARGS.includes('--keep-servers');

// ── Logging ───────────────────────────────────────────────────────────────────

fs.mkdirSync(RESULTS_DIR, { recursive: true });
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

function log(msg, tag = 'RUNNER') {
    const line = `[${new Date().toISOString()}] [${tag}] ${msg}`;
    logStream.write(line + '\n');
    if (VERBOSE || tag === 'FAIL' || tag === 'PASS' || tag === 'INFO') {
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

function addResult(suite, name, passed, ms, extra = {}) {
    results[suite].push({ name, passed, ms, ...extra });
    const icon = passed ? '✓' : '✗';
    log(`${icon} ${name} (${ms}ms)${extra.error ? ' — ' + extra.error : ''}`, passed ? 'PASS' : 'FAIL');
}

// ── Process list for cleanup ───────────────────────────────────────────────────

const procs = [];

function spawnServer(label, cmd, args_, cwd, readyPattern) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args_, {
            cwd,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false,
        });
        procs.push({ label, proc });

        let ready = false;
        const timeout = setTimeout(() => {
            if (!ready) reject(new Error(`${label} did not become ready within 10s`));
        }, 10000);

        const onData = (data) => {
            logRaw(data, label);
            if (!ready && readyPattern.test(String(data))) {
                ready = true;
                clearTimeout(timeout);
                results.servers.push({ name: label, status: 'started' });
                log(`${label} ready`, 'INFO');
                resolve(proc);
            }
        };

        proc.stdout.on('data', onData);
        proc.stderr.on('data', (d) => {
            logRaw(d, `${label}:ERR`);
            onData(d);
        });

        proc.on('error', (err) => {
            results.servers.push({ name: label, status: 'error: ' + err.message });
            reject(err);
        });
        proc.on('close', (code) => {
            if (!ready) {
                results.servers.push({ name: label, status: `exited(${code})` });
                reject(new Error(`${label} exited with code ${code}`));
            }
        });
    });
}

// ── Mock LM Studio ─────────────────────────────────────────────────────────────
//  Responds to OpenAI-compatible /v1/chat/completions.
//  Detects the request intent from the prompt and returns appropriate JSON.

function startMockAI() {
    return new Promise((resolve) => {
        const CANNED = {
            analysis: JSON.stringify({
                readingLevel: { range: '6th-8th Grade', explanation: 'Moderate vocabulary and sentence complexity.' },
                concepts: ['Main Concept', 'Supporting Idea', 'Key Theme'],
                accuracy: { rating: 'High', reason: 'Content appears factually consistent.' },
                grammar: ['No significant issues detected.'],
            }),
            quiz: JSON.stringify({
                questions: [
                    { question: 'What is the main topic discussed?', options: ['Option A', 'Option B', 'Option C', 'Option D'], correctAnswer: 'Option A' },
                    { question: 'Which concept was introduced first?', options: ['Concept 1', 'Concept 2', 'Concept 3', 'Concept 4'], correctAnswer: 'Concept 1' },
                ],
                reflections: ['What did you learn from this text?'],
            }),
            glossary: JSON.stringify([
                { term: 'Analysis', def: 'The process of examining something in detail.', tier: 'Academic' },
                { term: 'Concept', def: 'An abstract idea or general notion.', tier: 'Academic' },
                { term: 'Synthesis', def: 'The combination of elements to form a whole.', tier: 'Academic' },
            ]),
            outline: JSON.stringify({
                main: 'Central Topic',
                branches: [
                    { title: 'Key Point 1', items: ['Supporting detail A', 'Supporting detail B'] },
                    { title: 'Key Point 2', items: ['Supporting detail C', 'Supporting detail D'] },
                ],
                structureType: 'Structured Outline',
            }),
            faq: JSON.stringify([
                { question: 'What is the main topic?', answer: 'The main topic is about test content used for automated testing.' },
                { question: 'Why is testing important?', answer: 'Testing ensures the app works correctly and catches bugs early.' },
            ]),
            brainstorm: JSON.stringify([
                { title: 'Classroom Activity', description: 'A hands-on group activity related to the topic.', connection: 'Reinforces key concepts.' },
                { title: 'Research Project', description: 'Students investigate the topic independently.', connection: 'Extends understanding beyond the text.' },
            ]),
            frames: JSON.stringify({
                mode: 'list',
                items: [
                    { text: 'I think the main idea is...' },
                    { text: 'The author supports this by...' },
                    { text: 'This reminds me of...' },
                ],
                rubric: '| Criteria | 1 | 2 | 3 | 4 |\n|---|---|---|---|---|\n| Content | Minimal | Basic | Adequate | Thorough |',
            }),
            simplified: 'This is a simplified version of the text for testing purposes. The content has been adapted to be easier to understand while preserving the core ideas.',
        };

        function detectType(prompt) {
            const p = prompt.toLowerCase();
            if (p.includes('"readinglevel"') || p.includes('analyze')) return 'analysis';
            if (p.includes('"questions"') || p.includes('exit ticket') || p.includes('multiple choice')) return 'quiz';
            if (p.includes('"term"') || p.includes('tier 2') || p.includes('tier 3') || p.includes('vocabulary')) return 'glossary';
            if (p.includes('"branches"') || p.includes('structured outline') || p.includes('visual organizer')) return 'outline';
            if (p.includes('frequently asked') || p.includes('"question"')) return 'faq';
            if (p.includes('brainstorm') || p.includes('activity ideas')) return 'brainstorm';
            if (p.includes('sentence starters') || p.includes('scaffold')) return 'frames';
            return 'simplified';
        }

        const server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', mock: true }));
                return;
            }
            if (req.url === '/v1/models') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ data: [{ id: 'mock-model', object: 'model' }] }));
                return;
            }
            if (req.url === '/v1/chat/completions' && req.method === 'POST') {
                let body = '';
                req.on('data', c => body += c);
                req.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        const fullPrompt = (parsed.messages || []).map(m => m.content || '').join(' ');
                        const type = detectType(fullPrompt);
                        const content = CANNED[type] || CANNED.simplified;
                        logRaw(`[mock:${type}] returning canned response`, 'MOCK_AI');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            id: 'chatcmpl-mock-' + Date.now(),
                            object: 'chat.completion',
                            created: Math.floor(Date.now() / 1000),
                            model: 'mock-model',
                            choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
                            usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
                        }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: e.message }));
                    }
                });
                return;
            }
            res.writeHead(404); res.end('Not found');
        });

        server.listen(PORTS.mockAI, '127.0.0.1', () => {
            results.servers.push({ name: 'Mock LM Studio', status: 'started' });
            log(`Mock LM Studio listening on :${PORTS.mockAI}`, 'INFO');
            resolve(server);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                log(`Port ${PORTS.mockAI} already in use — assuming real LM Studio running`, 'INFO');
                results.servers.push({ name: 'Mock LM Studio', status: 'skipped (port in use)' });
                resolve(null);
            } else {
                throw err;
            }
        });
    });
}

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
            addResult('backend', name, false, Date.now() - t0, { error: e.message });
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

    // ── Mock AI connectivity ──────────────────────────────────────────────────

    await test('Mock LM Studio /health → ok', async () => {
        const r = await get(PORTS.mockAI, '/health');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.status) throw new Error('No status field');
    });

    await test('Mock LM Studio /v1/chat/completions → valid response', async () => {
        const r = await post(PORTS.mockAI, '/v1/chat/completions', {
            model: 'mock-model',
            messages: [{ role: 'user', content: 'Analyze this text: "The sun is a star."' }],
        });
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.choices?.[0]?.message?.content) throw new Error('No content in response');
    });

    await test('Mock LM Studio returns quiz JSON for quiz prompt', async () => {
        const r = await post(PORTS.mockAI, '/v1/chat/completions', {
            model: 'mock-model',
            messages: [{ role: 'user', content: 'Create an exit ticket quiz with multiple choice questions. Return JSON with "questions" array.' }],
        });
        const content = r.body.choices?.[0]?.message?.content || '';
        try {
            const parsed = JSON.parse(content);
            if (!parsed.questions) throw new Error('No questions array');
        } catch (e) {
            throw new Error(`Expected quiz JSON, got: ${content.slice(0, 100)}`);
        }
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
}

// ── Playwright Frontend Tests ──────────────────────────────────────────────────

async function runFrontendTests() {
    log('─── Frontend E2E Tests (Playwright) ──────────────────────────', 'INFO');

    const playwrightConfig = path.join(LOCAL_APP, 'tests', 'playwright.config.js');
    const playwrightBin    = path.join(LOCAL_APP, 'node_modules', '.bin', 'playwright');

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
            '--reporter', `json:${playwrightJsonOutput}`,
        ];

        const proc = spawn(playwrightBin, args_, {
            cwd: LOCAL_APP,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32',
            env: {
                ...process.env,
                ALLOFLOW_APP_PORT:     String(PORTS.app),
                ALLOFLOW_BACKEND_PORT: String(PORTS.backend),
                ALLOFLOW_AI_PORT:      String(PORTS.mockAI),
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
    procs.forEach(({ label, proc }) => {
        try { proc.kill('SIGTERM'); } catch {}
        log(`Stopped ${label}`, 'INFO');
    });
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

    // ── Check build exists ────────────────────────────────────────────────────

    const appJsPath = path.join(LOCAL_APP, 'build', 'app.js');
    if (!fs.existsSync(appJsPath)) {
        log('Build not found. Running: node local_build.js', 'INFO');
        try {
            execSync('node local_build.js', { cwd: ROOT, stdio: 'inherit' });
        } catch (e) {
            log('Build failed — aborting tests', 'FAIL');
            process.exit(1);
        }
    }

    // ── Start services ────────────────────────────────────────────────────────

    let mockAIServer = null;

    if (!NO_MOCK_AI) {
        mockAIServer = await startMockAI();
    }

    try {
        await spawnServer(
            'SQLite Backend',
            'node',
            ['backend/server.js'],
            LOCAL_APP,
            /Listening|ready|:3747/i
        );
    } catch (e) {
        log(`Failed to start SQLite backend: ${e.message}`, 'FAIL');
        log('Trying to continue — backend may already be running', 'INFO');
        try { await waitForPort(PORTS.backend, 2000); }
        catch { log('Backend not available — backend tests will fail', 'FAIL'); }
    }

    try {
        await spawnServer(
            'Static App Server',
            'node',
            ['server.js'],
            LOCAL_APP,
            /AlloFlow local app|localhost:\d+/i
        );
    } catch (e) {
        log(`Failed to start static server: ${e.message}`, 'FAIL');
        try { await waitForPort(PORTS.app, 2000); }
        catch { log('Static server not available — app tests will fail', 'FAIL'); }
    }

    // ── Run tests ─────────────────────────────────────────────────────────────

    await runBackendTests();

    if (!BACKEND_ONLY) {
        await runFrontendTests();
    }

    // ── Generate report ───────────────────────────────────────────────────────

    const failCount = generateReport();

    // ── Cleanup ───────────────────────────────────────────────────────────────

    if (!KEEP_SERVERS) {
        cleanup();
    }

    // Open report automatically on Windows/Mac
    try {
        if (process.platform === 'win32') execSync(`start "" "${REPORT_FILE}"`);
        else if (process.platform === 'darwin') execSync(`open "${REPORT_FILE}"`);
    } catch {}

    process.exit(failCount > 0 ? 1 : 0);
})();
