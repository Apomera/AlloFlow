import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import net from 'node:net';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function readRepo(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Phase 20: Remote MCP Worker, Runner & Docker/Nginx/PocketBase Hardening', () => {
  it('runner/server.cjs: rejects malformed request targets with 400 and rejects ?/# storage URL bypasses', async () => {
    const { createRunnerServer } = require(path.join(ROOT, 'services/alloflow-remote-mcp/runner/server.cjs'));
    const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-p20-runner-'));
    const token = 'p20-test-runner-token-0123456789abcdef';
    const app = createRunnerServer({
      token,
      workRoot,
      allowedHosts: ['r2.internal'],
    });
    await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
    const port = app.server.address().port;
    try {
      // Protocol-relative request target must return 400 invalid_request_url, not 200 /healthz or 500
      const rawReply = await new Promise((resolve, reject) => {
        const sock = net.createConnection({ host: '127.0.0.1', port }, () => {
          sock.write('GET //evil.example/healthz HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
        });
        let data = '';
        sock.setEncoding('utf8');
        sock.on('data', (chunk) => { data += chunk; });
        sock.on('end', () => resolve(data));
        sock.on('error', reject);
      });
      expect(rawReply).toContain('HTTP/1.1 400');
      expect(rawReply).toContain('invalid_request_url');

      // Trailing '?' or '#' in storage URLs must be rejected with 400 invalid_storage_url
      const runResp = await fetch(`http://127.0.0.1:${port}/v1/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: 1,
          jobId: 'job_' + 'a'.repeat(32),
          input: { url: 'http://r2.internal/input', contentType: 'application/pdf' },
          output: {
            taggedPdfUrl: 'http://r2.internal/out?',
            reportUrl: 'http://r2.internal/out',
          },
          options: { targetScore: 90, fixPasses: 1, effortProfile: 'standard', ocrLanguage: 'en', polishPasses: 0, taggedPdf: true, autoContinue: false, autoContinueRounds: 0, validateUa: false, maxRunMinutes: 10 },
        }),
      });
      expect(runResp.status).toBe(400);
      const body = await runResp.json();
      expect(body.error?.code).toBe('invalid_storage_url');
    } finally {
      await app.shutdown();
      fs.rmSync(workRoot, { recursive: true, force: true });
    }
  });

  it('runner/server.cjs: enforces state mutex, graceful retryable shutdown, stream error/destroy guards, and 30s requestTimeout', () => {
    const src = readRepo('services/alloflow-remote-mcp/runner/server.cjs');
    expect(src).toContain('function withStateLock(fn)');
    expect(src).toContain("current.abort.abort(new RunnerError('runner_shutting_down', 503, true));");
    expect(src).toContain("body.on('error', () => {});");
    expect(src).toContain('if (req.aborted || res.destroyed || res.closed)');
    expect(src).toContain('server.requestTimeout = 30_000;');
    expect(src).toContain('async function atomicReplaceFile(tempPath, destinationPath)');
  });

  it('Remote MCP Worker TS: enforces __Host- cookies, bounded R2 upload streams, workflow not_found recovery, RFC6749 OAuthError, and lease abort', () => {
    const authTs = readRepo('services/alloflow-remote-mcp/src/access-auth.ts');
    expect(authTs).toContain('__Host-alloflow_consent=');
    expect(authTs).toContain('__Host-alloflow_oauth_state=');
    expect(authTs).toContain('cookieValue(request, "__Host-alloflow_consent")');
    expect(authTs).toContain('cookieValue(request, "__Host-alloflow_oauth_state")');
    expect(authTs).toContain('throw new PilotError("invalid_request", 400);');

    const opsTs = readRepo('services/alloflow-remote-mcp/src/pilot-operations.ts');
    expect(opsTs).toContain('successRetention: "8 days"');
    expect(opsTs).toContain('function isWorkflowInstanceNotFound(');
    expect(opsTs).toContain('pilot_cleanup_job_failed');

    const transferTs = readRepo('services/alloflow-remote-mcp/src/document-transfer.ts');
    expect(transferTs).toContain('exactLengthBodyStream(');
    expect(transferTs).toContain('createdByThisPut = Boolean(stored)');
    expect(transferTs).toContain('await object.body?.cancel().catch(() => undefined);');

    const containerTs = readRepo('services/alloflow-remote-mcp/src/remediation-container.ts');
    expect(containerTs).toContain('exactLengthBodyStream(');
    expect(containerTs).toContain('current.checkpoint_key !== checkpoint.key');
    expect(containerTs).toContain('!upstream.headers.has("Content-Encoding")');

    const wfTs = readRepo('services/alloflow-remote-mcp/src/remediation-workflow.ts');
    expect(wfTs).toContain('const runController = new AbortController();');
    expect(wfTs).toContain('clearTimeout(overallTimer);');

    const storeTs = readRepo('services/alloflow-remote-mcp/src/job-store.ts');
    expect(storeTs).toContain('AND output_expires_at > ?');
    expect(storeTs).toContain('if (updated.meta.changes !== 1)');
  });

  it('docker/nginx.conf: blocks arbitrary Host headers (DNS rebinding), system collection IDs (pbc_*), static regex hijacks, and X-Forwarded-* spoofing', () => {
    const nginx = readRepo('docker/nginx.conf');
    expect(nginx).toContain('listen 80 default_server;');
    expect(nginx).toContain('return 444;');
    expect(nginx).toContain('collections/?$|collections/(?:_|pbc_|import|meta)');
    for (const prefix of ['/api/ollama/', '/api/pocketbase/', '/api/flux/', '/api/tts/', '/api/piper/', '/api/search/']) {
      expect(nginx).toContain(`location ^~ ${prefix}`);
    }
    expect(nginx).toContain('proxy_set_header X-Forwarded-For $remote_addr;');
    expect(nginx).toContain('proxy_set_header X-Forwarded-Proto $scheme;');
    expect(nginx).toContain('proxy_set_header X-Forwarded-Host $host;');
  });

  it('PocketBase migration works on both v0.23+ app API (with existing-collection upgrade & partial PATCH rule) and legacy v0.22 Dao API', () => {
    const migrationSrc = readRepo('docker/pocketbase/pb_migrations/1731974400_alloflow_collections.js');

    // 1. Test PocketBase v0.23+ runtime (including upgrading pre-existing collection missing owner_id)
    const v23Collections = new Map();
    const preExistingSessions = {
      name: 'sessions',
      fields: (() => {
        const list = [{ name: 'app_id', type: 'text' }];
        return {
          _list: list,
          getByName: (n) => list.find((f) => f.name === n) || null,
          add: (f) => list.push(f),
        };
      })(),
      indexes: [],
    };
    v23Collections.set('sessions', preExistingSessions);
    let upFn = null;
    let downFn = null;
    vm.runInNewContext(migrationSrc, {
      migrate: (up, down) => { upFn = up; downFn = down; },
      Collection: function Collection(def) { Object.assign(this, def); },
      Field: function Field(def) { Object.assign(this, def); },
    });
    const mockAppV23 = {
      findCollectionByNameOrId: (name) => v23Collections.get(name) || null,
      save: (col) => { v23Collections.set(col.name, col); },
      delete: (col) => { v23Collections.delete(col.name); },
    };
    upFn(mockAppV23);
    expect(v23Collections.size).toBe(5);
    expect(preExistingSessions.fields.getByName('owner_id')).toBeTruthy();
    expect(preExistingSessions.indexes.some((i) => i.includes('idx_sessions_owner'))).toBe(true);
    expect(preExistingSessions.createRule).toContain('@request.body.owner_id = @request.auth.id');
    expect(preExistingSessions.updateRule).toContain('@request.body.owner_id:isset = false || @request.body.owner_id = @request.auth.id');
    downFn(mockAppV23);
    expect(v23Collections.size).toBe(0);

    // 2. Test legacy PocketBase v0.22 Dao API fallback
    const v22Collections = new Map();
    let up22 = null;
    vm.runInNewContext(migrationSrc, {
      migrate: (up) => { up22 = up; },
      Dao: function Dao() {
        return {
          findCollectionByNameOrId: (name) => v22Collections.get(name) || null,
          saveCollection: (col) => { v22Collections.set(col.name, col); },
          deleteCollection: (col) => { v22Collections.delete(col.name); },
        };
      },
      Collection: function Collection(def) { Object.assign(this, def); },
      SchemaField: function SchemaField(def) { Object.assign(this, def); },
    });
    up22({});
    expect(v22Collections.size).toBe(5);
    expect(v22Collections.get('sessions').schema).toBeTruthy();
    expect(v22Collections.get('sessions').createRule).toContain('@request.data.owner_id = @request.auth.id');
  });
});
