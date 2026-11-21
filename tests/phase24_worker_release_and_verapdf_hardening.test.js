import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');

function readRepo(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function sha256File(rel) {
  return createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
}

describe('Phase 24 Track 1 — catalog/cloudflare-worker security hardening', () => {
  it('blocks IPv4-compatible IPv6, 2001::/23, single-label hosts, and oversized URLs in source-metadata', async () => {
    const worker = (await import('../catalog/cloudflare-worker/src/index.js')).default;
    const env = {};
    const badUrls = [
      'https://[::127.0.0.1]/secret',
      'https://[::169.254.169.254]/latest/meta-data/',
      'https://[0:0:0:0:0:0:7f00:1]/',
      'https://[2001:db8::1]/doc',
      'https://metadata/computeMetadata/v1/',
      'https://example.org/' + 'a'.repeat(2100),
    ];
    for (const u of badUrls) {
      const req = new Request('https://worker.example/source-metadata?url=' + encodeURIComponent(u), {
        method: 'GET',
        headers: { Origin: 'https://alloflow-cdn.pages.dev' },
      });
      const res = await worker.fetch(req, env);
      expect(res.status, u).toBe(400);
    }
  });

  it('rejects prototype-chain keys in PD branching activity validation and requires auth before KV checks', async () => {
    const worker = (await import('../catalog/cloudflare-worker/src/index.js')).default;

    // Prototype key bypass attempt (content.start: 'toString') must be rejected.
    const pdReq = new Request('https://worker.example/submitPd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://alloflow-cdn.pages.dev' },
      body: JSON.stringify({
        pd_module: {
          schema_version: 'pd-1.0',
          kind: 'pd_module',
          metadata: { id: 'proto-check', version: '1.0.0', language: 'en-US', title: 'Proto Check', topic: 'Behavior', estMinutes: 10, audience: 'educator', license: 'CC-BY-SA-4.0' },
          sections: [{
            title: 'Decide',
            activities: [{
              id: 'b-1',
              type: 'branching',
              title: 'Scenario',
              gate: { kind: 'none' },
              content: {
                intro: 'Walk this.',
                start: 'toString',
                nodes: {
                  n1: { text: 'End.', ending: true },
                },
              },
            }],
          }],
        },
        credit: null,
        affirmations: { author_or_authorized: true, no_pii: true, license_agreed: true, age_eligible: true },
      }),
    });
    const pdRes = await worker.fetch(pdReq, {
      SUBMIT_RATE: { async get() { return null; }, async put() {} },
      PD_SUBMISSIONS: { async put() {}, async get() { return null; } },
    });
    expect(pdRes.status).toBe(422);
    const pdBody = await pdRes.json();
    expect(pdBody.ok).toBe(false);
    expect(pdBody.error).toMatch(/start/i);

    // Admin list routes must return 401 before revealing missing KV binding (503).
    const unauthPd = await worker.fetch(new Request('https://worker.example/pdSubmissions?limit=-5', { method: 'GET' }), { ADMIN_TOKEN: 'secret-token-123' });
    expect(unauthPd.status).toBe(401);
    const unauthPlugin = await worker.fetch(new Request('https://worker.example/pluginSubmissions?limit=9999', { method: 'GET' }), { ADMIN_TOKEN: 'secret-token-123' });
    expect(unauthPlugin.status).toBe(401);

    // /bug-inbox carries HSTS, COOP, and CORP headers.
    const inboxRes = await worker.fetch(new Request('https://worker.example/bug-inbox', { method: 'GET' }), {});
    expect(inboxRes.status).toBe(200);
    expect(inboxRes.headers.get('Strict-Transport-Security')).toContain('max-age=');
    expect(inboxRes.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(inboxRes.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
  });

  it('hardens Cloudflare Worker PowerShell ops scripts (Bearer auth, $LASTEXITCODE checks, clipboard cleanup)', () => {
    const setToken = readRepo('catalog/cloudflare-worker/set-admin-token.ps1');
    expect(setToken).toContain('Authorization = "Bearer $Token"');
    expect(setToken).not.toContain('/bugs?token=');
    expect(setToken).toContain('Invoke-WebRequest');

    const readQueues = readRepo('catalog/cloudflare-worker/read-queues.ps1');
    expect(readQueues).toContain('$LASTEXITCODE');
    expect(readQueues).toContain('^(?:bug|bug-review|pd|plugin|community):[A-Za-z0-9:._-]+$');

    const openInbox = readRepo('catalog/cloudflare-worker/open-bug-inbox.ps1');
    expect(openInbox).toContain("Set-Clipboard -Value ''");
  });
});

describe('Phase 24 Track 2 — build, staging, runtime graphs, and _headers hardening', () => {
  it('enforces deployment-control wildcards and real .assetsignore glob/negation semantics', () => {
    const src = readRepo('dev-tools/security_release_candidate.cjs');
    expect(src).toContain('parseAssetsIgnore');
    expect(src).toContain('matchesAssetsIgnore');
    expect(src).not.toContain('const buffers = new Map()');
    expect(src).toContain("flag: 'wx'");

    const rc = require('../dev-tools/security_release_candidate.cjs');
    if (typeof rc.deploymentControl === 'function') {
      expect(rc.deploymentControl('wrangler.prod.jsonc')).toBe(true);
      expect(rc.deploymentControl('firebase.staging.json')).toBe(true);
    }
  });

  it('rejects global-alias worker acquisition in build_browser_runtime_graphs while keeping dead stubs allowed', () => {
    const { execFileSync } = require('node:child_process');
    const out = execFileSync(process.execPath, ['-e', `
      const { assertClosedCode } = require('./dev-tools/build_browser_runtime_graphs.cjs');
      let aliasBlocked = false, reflectBlocked = false, stubAllowed = false;
      try { assertClosedCode('const g = globalThis; const W = g.Worker; export { W };'); } catch (e) { aliasBlocked = /capability aliases/.test(e.message); }
      try { assertClosedCode('const g = self; const fn = Reflect.get(g, "importScripts"); export { fn };'); } catch (e) { reflectBlocked = /capability aliases/.test(e.message); }
      assertClosedCode('export function deadStub(B) { return B.Worker; }');
      stubAllowed = true;
      console.log(JSON.stringify({ aliasBlocked, reflectBlocked, stubAllowed }));
    `], { cwd: ROOT, encoding: 'utf8' }).trim();
    expect(JSON.parse(out)).toEqual({ aliasBlocked: true, reflectBlocked: true, stubAllowed: true });
  });

  it('rejects option-injection --since refs in check_cloud_deploy_parity', () => {
    const { execFileSync } = require('node:child_process');
    let failed = false;
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'dev-tools/check_cloud_deploy_parity.cjs'), '--since', '--output=/tmp/pwn'], {
        cwd: ROOT,
        stdio: 'pipe',
      });
    } catch (err) {
      failed = err.status !== 0;
    }
    expect(failed).toBe(true);
  });

  it('enforces Permissions-Policy, /app/* cache rules, and /storage_bridge CSP in _headers', () => {
    const headers = readRepo('_headers');
    expect(headers).toContain('Permissions-Policy: camera=(self), geolocation=(), payment=(), usb=()');
    expect(headers).toMatch(/\/app\/\r?\n\s+Cache-Control: no-store/);
    expect(headers).toMatch(/\/app\/index\.html\r?\n\s+Cache-Control: no-store/);
    expect(headers).toMatch(/\/app\/sw\.js\r?\n\s+Cache-Control: no-cache/);
    expect(headers).toMatch(/\/song_library\/songs\.json\r?\n\s+Cache-Control: no-cache/);
    expect(headers).toContain('/storage_bridge.html');
    expect(headers).toContain("! Content-Security-Policy");
    expect(headers).toContain("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; form-action 'none'; frame-ancestors 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'");
  });
});

describe('Phase 24 Track 3 — VeraPDF validator, Packets modules, and mirror parity', () => {
  it('hardens verapdf_validator.html origin check, payload validation, Noto fail-closed check, and cycle budget', () => {
    const html = readRepo('verapdf/verapdf_validator.html');
    expect(html).toContain('function _isOpaqueLocalOrigin()');
    expect(html).toContain('if (o === \'null\') return _isOpaqueLocalOrigin();');
    expect(html).toContain('function _validatePdfPayload(bytes)');
    expect(html).toContain('Substitute font integrity verification unavailable');
    expect(html).toContain('const visited = new Set();');
    expect(html).toContain('const MAX_VISITED = 10000;');
    expect(html).toContain('Files.deleteIfExists(outPath)');
    expect(html).toContain('let _opQueue = Promise.resolve();');

    // Behavioral check on _isTrustedVeraOrigin under HTTPS origin: 'null' MUST be rejected.
    const fnSrc = html.slice(html.indexOf('function _isOpaqueLocalOrigin()'), html.indexOf('function _isTrustedVeraSource('));
    const ctx = vm.createContext({
      URL,
      window: { location: { origin: 'https://alloflow-cdn.pages.dev', protocol: 'https:' } },
    });
    vm.runInContext(fnSrc, ctx);
    expect(ctx._isTrustedVeraOrigin('null')).toBe(false);
    expect(ctx._isTrustedVeraOrigin('https://alloflow-cdn.pages.dev')).toBe(true);
    expect(ctx._isTrustedVeraOrigin('https://evil.example')).toBe(false);

    // Under file:// / opaque origin, 'null' is allowed for local desktop/file workflows.
    const localCtx = vm.createContext({
      URL,
      window: { location: { origin: 'null', protocol: 'file:' } },
    });
    vm.runInContext(fnSrc, localCtx);
    expect(localCtx._isTrustedVeraOrigin('null')).toBe(true);
  });

  it('blocks Zip-Slip paths and bounds corrupted archive headers in packets_zip.js', () => {
    const Zip = require('../packets_zip.js');
    const z = Zip.create();
    z.add('../../evil\x00/./nested\\file.html', 'hello');
    const parts = z.finish();
    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const p of parts) { merged.set(p, offset); offset += p.length; }
    const entries = Zip.readZip(merged);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('evil/nested/file.html');
    expect(entries[0].crcOk).toBe(true);

    // Corrupted / truncated bytes fail closed without throwing.
    expect(Zip.readZip(new Uint8Array([0x50, 0x4b, 0x05, 0x06]))).toEqual([]);
  });

  it('prevents Object.prototype word collisions in packets-print-cards.js and raw SVG fallback in packets-read-along.js', () => {
    const PrintCards = require('../packets-print-cards.js');
    const pics = PrintCards.picturesOf(['constructor', 'toString', '__proto__', 'cat'], {}, null, null);
    expect(Object.getPrototypeOf(pics)).toBeNull();
    expect(pics.constructor).toBeNull();
    expect(pics.toString).toBeNull();
    expect(pics['__proto__']).toBeNull();
    expect(pics.cat).toBeNull();
    expect(readRepo('packets-print-cards.js')).toContain('var seen = Object.create(null), out = [];');

    const readAlongSrc = readRepo('packets-read-along.js');
    expect(readAlongSrc).toContain('MAX_RAW_PIC_FALLBACK_BYTES');
    expect(readAlongSrc).toContain('recorder.onerror = function ()');
    expect(readAlongSrc).not.toContain('https://');
  });

  it('maintains 4-way mirror parity for all Phase 24 desktop-mirrored deliverables', () => {
    const mirrored = [
      'verapdf/verapdf_validator.html',
      'packets-read-along.js',
      'packets-print-cards.js',
      'packets-pictures.js',
      'timeline_studio/timeline_studio.html',
    ];
    const roots = [
      'desktop/web-app/public',
      'desktop/web-app/build',
      'desktop/app-build',
    ];
    for (const rel of mirrored) {
      const rootHash = sha256File(rel);
      for (const dstRoot of roots) {
        const dstRel = path.join(dstRoot, rel);
        if (fs.existsSync(path.join(ROOT, dstRel))) {
          expect(sha256File(dstRel), `${rel} vs ${dstRel}`).toBe(rootHash);
        }
      }
    }
  });
});
