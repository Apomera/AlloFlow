import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ROOT = resolve(__dirname, '..');
const upload = require('../dev-tools/cf_worker_upload.cjs');
const cfWorker = require('../dev-tools/cf_worker.cjs');
const { inspectCloudParity, runSelftest } = require('../dev-tools/check_cloud_deploy_parity.cjs');
const { inspectWorkflow } = require('../dev-tools/check_security_safeguards.cjs');
const YAML = require('../dev-tools/security/node_modules/yaml');

let NodeRequest;
const tempDirs = [];

function makeFixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'alloflow-cloud-auto-'));
  tempDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return dir;
}

beforeAll(() => {
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('File', NodeFile);
  const undici = require('undici');
  NodeRequest = undici.Request;
  vi.stubGlobal('FormData', undici.FormData);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('Cloudflare Workers multi-target bundler and deployer', () => {
  it('bundles the real bug-digest Worker with cloudflare:workers built-in import', async () => {
    const parsed = cfWorker.parseBugDigestConfig(resolve(ROOT, 'catalog/bug-digest-worker'));
    expect(parsed.scriptName).toBe('alloflow-bug-digest');
    expect(parsed.crons).toEqual(['0 * * * *']);

    const metadata = cfWorker.buildBugDigestMetadata(parsed, {
      destinationAddress: 'dev@example.com',
      includeMigrations: true,
    });
    expect(metadata.main_module).toBe('index.js');
    expect(metadata.compatibility_date).toBe('2026-10-22');
    expect(metadata.compatibility_flags).toEqual(['nodejs_compat']);
    expect(metadata.keep_bindings).toEqual(['secret_text']);
    expect(metadata.migrations).toEqual({ new_tag: 'v1', new_sqlite_classes: ['BugDigest'] });
    expect(metadata.bindings).toEqual(
      expect.arrayContaining([
        { type: 'kv_namespace', name: 'BUG_REPORTS', namespace_id: 'b8dddf6fa1404c088ab63376255e2620' },
        { type: 'durable_object_namespace', name: 'BUG_DIGEST', class_name: 'BugDigest' },
        { type: 'send_email', name: 'EMAIL', destination_address: 'dev@example.com' },
      ])
    );

    const form = await new NodeRequest('https://worker-upload.test/', {
      method: 'PUT',
      body: upload.createWorkerUpload(parsed.entry, metadata),
    }).formData();
    expect([...form.keys()]).toEqual(['metadata', 'index.js']);
    expect(JSON.parse(await form.get('metadata').text())).toEqual(metadata);
  });

  it('allows node:* built-in imports only when nodejs_compat is enabled', () => {
    const dir = makeFixture({
      'index.js': "import crypto from 'node:crypto'; export default { fetch() { return new Response(String(!!crypto)); } };",
    });
    const entry = join(dir, 'index.js');
    expect(() => upload.createWorkerUpload(entry, {
      main_module: 'index.js',
      compatibility_date: '2026-10-22',
      bindings: [],
    })).toThrow(/Unsupported Worker import "node:crypto"/);

    expect(() => upload.createWorkerUpload(entry, {
      main_module: 'index.js',
      compatibility_date: '2026-10-22',
      compatibility_flags: ['nodejs_compat'],
      bindings: [],
    })).not.toThrow();
  });

  it('preserves live send_email destination_address, omits migrations on update, and fails closed without a recipient', () => {
    const parsed = cfWorker.parseBugDigestConfig(resolve(ROOT, 'catalog/bug-digest-worker'));

    const updated = cfWorker.buildBugDigestMetadata(parsed, {
      liveBindings: [
        { type: 'send_email', name: 'EMAIL', destination_address: 'private-verified@example.org' },
      ],
      includeMigrations: false,
    });
    expect(updated.migrations).toBeUndefined();
    expect(updated.bindings.find((b) => b.type === 'send_email')).toEqual({
      type: 'send_email',
      name: 'EMAIL',
      destination_address: 'private-verified@example.org',
    });

    expect(() => cfWorker.buildBugDigestMetadata(parsed, {
      liveBindings: null,
      destinationAddress: '',
      useConfigSendEmail: false,
    })).toThrow(/Refusing to deploy alloflow-bug-digest without a verified send_email destination_address/);

    expect(() => cfWorker.buildBugDigestMetadata(parsed, {
      destinationAddress: 'not-an-email',
    })).toThrow(/not a valid email address/);
  });

  it('deploys bug-digest via REST API preserving live destination_address without leaking it to logs', async () => {
    const dir = makeFixture({
      'catalog/bug-digest-worker/wrangler.jsonc': readFileSync(resolve(ROOT, 'catalog/bug-digest-worker/wrangler.jsonc'), 'utf8'),
      'catalog/bug-digest-worker/src/index.js': "import { DurableObject } from 'cloudflare:workers'; export class BugDigest extends DurableObject {} export default { async fetch() { return new Response('ok'); } };",
    });
    const calls = [];
    const logs = [];
    const errors = [];
    const fetchMock = vi.fn(async (url, init = {}) => {
      const method = init.method || 'GET';
      let metadata = null;
      if (init.body instanceof FormData) {
        const parsedForm = await new NodeRequest('https://worker-upload.test/', { method: 'PUT', body: init.body }).formData();
        metadata = JSON.parse(await parsedForm.get('metadata').text());
      }
      calls.push({ url, method, metadata, body: typeof init.body === 'string' ? init.body : null });
      if (url.endsWith('/settings')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            success: true,
            result: {
              bindings: [
                { type: 'send_email', name: 'EMAIL', destination_address: 'secret-owner@example.org' },
              ],
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, result: { id: 'alloflow-bug-digest' } }),
      };
    });
    const exit = vi.fn();

    await runInNewContext(readFileSync(resolve(ROOT, 'dev-tools/cf_worker.cjs'), 'utf8'), {
      __dirname: join(dir, 'dev-tools'),
      require: (name) => (name === './cf_worker_upload.cjs' ? upload : require(name)),
      process: {
        argv: ['node', 'cf_worker.cjs', 'deploy', '--worker', 'bug-digest', '--yes'],
        env: { CLOUDFLARE_API_TOKEN: 'test-token-value', CLOUDFLARE_ACCOUNT_ID: 'acct-123' },
        exit,
      },
      console: {
        log: (...args) => logs.push(args.join(' ')),
        error: (...args) => errors.push(args.join(' ')),
      },
      Blob,
      FormData,
      fetch: fetchMock,
    });

    expect(errors).toEqual([]);
    expect(exit).not.toHaveBeenCalled();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET https://api.cloudflare.com/client/v4/accounts/acct-123/workers/scripts/alloflow-bug-digest/settings',
      'PUT https://api.cloudflare.com/client/v4/accounts/acct-123/workers/scripts/alloflow-bug-digest',
      'PUT https://api.cloudflare.com/client/v4/accounts/acct-123/workers/scripts/alloflow-bug-digest/schedules',
    ]);
    const uploadCall = calls[1];
    expect(uploadCall.metadata.migrations).toBeUndefined();
    expect(uploadCall.metadata.keep_bindings).toEqual(['secret_text']);
    expect(uploadCall.metadata.bindings.find((b) => b.type === 'send_email')).toEqual({
      type: 'send_email',
      name: 'EMAIL',
      destination_address: 'secret-owner@example.org',
    });
    expect(JSON.parse(calls[2].body)).toEqual([{ cron: '0 * * * *' }]);
    const combinedOutput = logs.join('\n');
    expect(combinedOutput).not.toContain('secret-owner@example.org');
    expect(combinedOutput).not.toContain('test-token-value');
  });

  it('rejects broken bug-digest imports before reading credentials or calling fetch', async () => {
    const dir = makeFixture({
      'catalog/bug-digest-worker/wrangler.jsonc': readFileSync(resolve(ROOT, 'catalog/bug-digest-worker/wrangler.jsonc'), 'utf8'),
      'catalog/bug-digest-worker/src/index.js': "import './missing_helper.js'; export default {};",
    });
    let tokenReads = 0;
    const env = new Proxy({}, {
      get(_target, key) {
        if (key === 'CLOUDFLARE_API_TOKEN') { tokenReads += 1; return 'test-token'; }
        return undefined;
      },
    });
    const fetchMock = vi.fn(() => { throw new Error('Network must not be called'); });
    const exit = vi.fn();
    const errors = [];

    await runInNewContext(readFileSync(resolve(ROOT, 'dev-tools/cf_worker.cjs'), 'utf8'), {
      __dirname: join(dir, 'dev-tools'),
      require: (name) => (name === './cf_worker_upload.cjs' ? upload : require(name)),
      process: {
        argv: ['node', 'cf_worker.cjs', 'deploy', '--worker', 'bug-digest', '--yes'],
        env,
        exit,
      },
      console: { log: () => {}, error: (msg) => errors.push(msg) },
      Blob,
      FormData,
      fetch: fetchMock,
    });

    expect(exit).toHaveBeenCalledWith(1);
    expect(errors.join('\n')).toMatch(/Cannot read Worker module: missing_helper\.js/);
    expect(tokenReads).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Automated cloud targets GitHub Actions workflow and deploy.sh integration', () => {
  it('passes AlloFlow security safeguards and configures safe path-filtered triggers', () => {
    const wfPath = resolve(ROOT, '.github/workflows/deploy-cloud-targets.yml');
    const source = readFileSync(wfPath, 'utf8');
    expect(inspectWorkflow(source, 'deploy-cloud-targets.yml')).toEqual([]);

    const wf = YAML.parse(source);
    expect(wf.permissions).toEqual({ contents: 'read' });
    expect(wf.concurrency['cancel-in-progress']).toBe(false);
    expect(wf.on.push.branches).toEqual(['main']);
    expect(wf.on.push.paths).toEqual(expect.arrayContaining([
      'catalog/cloudflare-worker/**',
      'catalog/bug-digest-worker/**',
      'firestore.rules',
      'desktop/web-app/functions/**',
    ]));
    expect(wf.jobs.deploy.if).toBe("github.repository == 'Apomera/AlloFlow'");
    expect(source).toContain('prismflow-911fe');
    expect(source).toContain('cf_worker.cjs deploy --worker catalog --yes');
    expect(source).toContain('cf_worker.cjs deploy --worker bug-digest --yes');
  });

  it('keeps deploy.sh bash-valid with opt-in DEPLOY_WORKERS Step 9 defaulting to off', () => {
    const deployPath = resolve(ROOT, 'deploy.sh');
    const deploySrc = readFileSync(deployPath, 'utf8');
    expect(deploySrc).toContain('WORKER_DEPLOY_MODE="${DEPLOY_WORKERS:-${DEPLOY_CLOUD_WORKERS:-0}}"');
    expect(deploySrc).toContain('node dev-tools/cf_worker.cjs deploy --worker "$WORKER_DEPLOY_MODE" --yes');

    const bash = process.platform === 'win32'
      ? join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe')
      : '/bin/bash';
    if (existsSync(bash)) {
      const check = spawnSync(bash, ['-n', deployPath], { encoding: 'utf8', windowsHide: true });
      expect(check.error).toBeUndefined();
      expect(check.status).toBe(0);
    }
  });

  it('passes check_cloud_deploy_parity live repo inspection and selftest', () => {
    const live = inspectCloudParity({ root: ROOT, changedPaths: [] });
    expect(live.ok).toBe(true);
    expect(live.parityErrors).toEqual([]);
    expect(runSelftest()).toMatchObject({ ok: true, checks: 5 });
  });
});
