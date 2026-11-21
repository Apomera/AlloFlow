import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.cwd());

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

describe('Phase 23 — Track 1: Remote MCP Pilot Operational Scripts Hardening', () => {
  it('rejects CR/LF/whitespace Bearer tokens without leaking secrets in error messages', async () => {
    const alerts = require(path.join(ROOT, 'services/alloflow-remote-mcp/scripts/pilot-alerts.cjs'));
    const lifecycle = require(path.join(ROOT, 'services/alloflow-remote-mcp/scripts/pilot-lifecycle.cjs'));
    const canary = require(path.join(ROOT, 'services/alloflow-remote-mcp/scripts/pilot-release-canary.cjs'));

    const secretWithCrlf = 'SUPER_SECRET_TOKEN_VALUE_1234567890_DO_NOT_LEAK\r\n';
    const acct = 'a'.repeat(32);

    await expect(
      alerts.fetchAlertRows({ accountId: acct, token: secretWithCrlf, fetchImpl: globalThis.fetch })
    ).rejects.toThrow('analytics_api_token_required');

    await expect(
      lifecycle.readRemoteLifecyclePolicy(
        { r2_buckets: [{ binding: 'DOCUMENTS', bucket_name: 'alloflow-staging-documents' }] },
        'alloflow-staging-documents',
        { accountId: acct, token: secretWithCrlf, fetchImpl: globalThis.fetch }
      )
    ).rejects.toThrow('cloudflare_api_token_required_for_lifecycle_readback');

    await expect(
      canary.runReleaseCanary({
        origin: 'https://staging.alloflow.org',
        token: secretWithCrlf,
        expectedRunner: { version: '1', build: {} },
        attempts: 1,
        fetchImpl: globalThis.fetch,
      })
    ).rejects.toThrow('release_canary_secret_required');

    // Origin with embedded credentials must fail closed immediately
    await expect(
      canary.runReleaseCanary({
        origin: 'https://user:pass@staging.alloflow.org',
        token: 'a'.repeat(40),
        expectedRunner: { version: '1', build: {} },
        attempts: 1,
      })
    ).rejects.toThrow('invalid_canary_origin');
  });

  it('pilot-preflight blocks uppercase non-pilot KV IDs, missing ALLOW_LOCAL_OAUTH=false, missing GEMINI_MODEL, and invalid rate limits', () => {
    const preflight = require(path.join(ROOT, 'services/alloflow-remote-mcp/scripts/pilot-preflight.cjs'));
    const examplePath = path.join(ROOT, 'services/alloflow-remote-mcp/wrangler.pilot.example.jsonc');
    const { config } = preflight.readPilotConfig(examplePath);
    const cloned = structuredClone(config);
    // Replace placeholders with valid-looking values except intentional violations
    cloned.vars.PUBLIC_ORIGIN = 'https://mcp-staging.alloflow.org';
    cloned.routes = [{ pattern: 'mcp-staging.alloflow.org', custom_domain: true }];
    cloned.vars.CHATGPT_REDIRECT_URI = 'https://chatgpt.com/connector_platform_oauth_redirect';
    cloned.vars.ALLOW_LOCAL_OAUTH = 'true';
    cloned.vars.GEMINI_MODEL = '';
    cloned.kv_namespaces[0].id = 'B8DDDF6FA1404C088AB63376255E2620'; // uppercase spelling of known non-pilot KV
    cloned.d1_databases[0].database_id = '11111111-2222-3333-4444-555555555555';
    cloned.ratelimits[0].namespace_id = '1001';
    cloned.ratelimits[0].simple.limit = 0;

    const errors = preflight.validatePilotConfig(cloned, JSON.stringify(cloned), { allowSyntheticAcceptance: true });
    expect(errors.some((e) => e.includes('ALLOW_LOCAL_OAUTH'))).toBe(true);
    expect(errors.some((e) => e.includes('GEMINI_MODEL'))).toBe(true);
    expect(errors.some((e) => e.includes('OAUTH_KV'))).toBe(true);
    expect(errors.some((e) => e.includes('DCR_RATE_LIMITER'))).toBe(true);
  });

  it('pilot-admission rejects null/empty-string coercion for active_jobs and admissions_open, and pilot-deploy avoids npm.cmd', async () => {
    const admission = require(path.join(ROOT, 'services/alloflow-remote-mcp/scripts/pilot-admission.cjs'));
    await expect(
      admission.drainAdmissions('wrangler.pilot.local.jsonc', {
        timeoutSeconds: 1,
        pollSeconds: 1,
        executeSql: async () => [{ admissions_open: 0, active_jobs: null }],
      })
    ).rejects.toThrow('invalid_d1_admission_response');

    await expect(
      admission.drainAdmissions('wrangler.pilot.local.jsonc', {
        timeoutSeconds: 1,
        pollSeconds: 1,
        executeSql: async () => [{ admissions_open: null, active_jobs: 0 }],
      })
    ).rejects.toThrow('admission_drain_requires_pause');

    const provision = require(path.join(ROOT, 'services/alloflow-remote-mcp/scripts/pilot-provision.cjs'));
    const parsed = provision.parseJsonArray('\u001b[33m[WARNING] beta\u001b[0m\n[{"id":"abc"}]\n', 'kv');
    expect(parsed).toEqual([{ id: 'abc' }]);

    const deploySrc = fs.readFileSync(path.join(ROOT, 'services/alloflow-remote-mcp/scripts/pilot-deploy.cjs'), 'utf8');
    expect(deploySrc).not.toContain('npm.cmd');
  });
});

describe('Phase 23 — Track 2: Core Delivery, Service Worker, Postbuild & Dev-Tools Hardening', () => {
  it('all 5 sw.js copies allow type==="default" (redirected shell precaching) and guard Vary:*, HTML fallbacks, and /api/', () => {
    const swFiles = [
      'desktop/web-app/public/sw.js',
      'app/sw.js',
      'desktop/web-app/public/app/sw.js',
      'desktop/web-app/build/sw.js',
      'desktop/app-build/sw.js',
    ];
    for (const rel of swFiles) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, rel).toContain("response.type === 'default'");
      expect(src, rel).toContain('isHtmlFallback');
      expect(src, rel).toContain("event.request.headers.has('X-Allo-Lan-Token')");
      expect(src, rel).toContain('if (url.origin !== self.location.origin) return;');
    }
  });

  it('mirror_deliverables blocks Windows-cased Desktop/, agents.md, app/, and dotfiles', () => {
    const { normalizeRelPath } = require(path.join(ROOT, 'dev-tools/mirror_deliverables.cjs'));
    expect(() => normalizeRelPath('Desktop/web-app/public/index.html')).toThrow(/desktop/i);
    expect(() => normalizeRelPath('agents.md')).toThrow(/BLOCKED/);
    expect(() => normalizeRelPath('app/index.html')).toThrow(/BLOCKED/);
    expect(() => normalizeRelPath('.git/config')).toThrow(/BLOCKED/);
    expect(() => normalizeRelPath('Claude Token/secret.txt')).toThrow(/BLOCKED/);
  });

  it('verify_live_cdn_release rejects max-age=0 HSTS, check_shell_boundaries passes, and write_generated_atomic avoids missing-file window', () => {
    const { evaluateSecurityHeaders } = require(path.join(ROOT, 'dev-tools/verify_live_cdn_release.cjs'));
    const weak = evaluateSecurityHeaders({
      rootHeaders: { 'x-content-type-options': 'nosniff', 'strict-transport-security': 'max-age=0' },
      engineHeaders: { 'access-control-allow-origin': '*' },
    });
    expect(weak.ok).toBe(false);

    const strong = evaluateSecurityHeaders({
      rootHeaders: { 'x-content-type-options': 'nosniff', 'strict-transport-security': 'max-age=31536000; includeSubDomains' },
      engineHeaders: { 'access-control-allow-origin': '*' },
    });
    expect(strong.ok).toBe(true);

    const { checkShellBoundaries } = require(path.join(ROOT, 'dev-tools/check_shell_boundaries.cjs'));
    expect(checkShellBoundaries(ROOT)).toEqual([]);

    const atomicSrc = fs.readFileSync(path.join(ROOT, 'dev-tools/write_generated_atomic.cjs'), 'utf8');
    expect(atomicSrc).toContain("flag: 'wx'");
    expect(atomicSrc).not.toContain('.previous-build-');
  });
});

describe('Phase 23 — Track 3: Companions, EdgeTTS Server & Packets Hardening', () => {
  it('mirrors all 4 desktop-mirrored Track 3 deliverables with exact SHA-256 parity', () => {
    const mirrored = [
      'immersive_geometry/immersive_geometry.html',
      'timeline_studio/timeline_studio.html',
      'classroom_import_app.js',
      'packets-results.js',
    ];
    const targets = [
      path.join(ROOT, 'desktop', 'web-app', 'public'),
      path.join(ROOT, 'desktop', 'web-app', 'build'),
      path.join(ROOT, 'desktop', 'app-build'),
    ];
    for (const rel of mirrored) {
      const rootHash = sha256File(path.join(ROOT, rel));
      for (const t of targets) {
        expect(sha256File(path.join(t, rel)), `Drift in ${path.join(t, rel)}`).toBe(rootHash);
      }
    }
  });

  it('timeline_studio.html hardens safeHttpUrl, CSP frame-src, localhost protocol, and array caps', () => {
    const html = fs.readFileSync(path.join(ROOT, 'timeline_studio/timeline_studio.html'), 'utf8');
    expect(html).toContain("frame-src 'none'");
    expect(html).toContain("u.protocol === 'http:' || u.protocol === 'https:'");
    const fnStart = html.indexOf('function scrubTimelineObject(tl)');
    const fnEnd = html.indexOf('window.__alloTimelineTrust =', fnStart);
    const scrub = new Function(
      'escapeTimelineText',
      'sanitizeTimelineHtmlField',
      `${html.slice(fnStart, fnEnd)}; return scrubTimelineObject;`
    )((v) => String(v), (v) => String(v));

    const out = scrub({
      events: Array.from({ length: 250 }, (_, i) => ({
        unique_id: `ev-${i}`,
        media: {
          url: i === 0 ? 'https://example.org/a" onclick="x()' : (i === 1 ? 'http://insecure.example/x.png' : 'https://example.org/ok.png'),
          link: i === 0 ? 'https://user:pass@example.org/p' : 'https://example.org/doc',
        },
      })),
    });
    expect(out.events).toHaveLength(200);
    expect(out.events[0].media.url).toBe('');
    expect(out.events[0].media.link).toBe('');
    expect(out.events[1].media.url).toBe('');
    expect(out.events[2].media.url).toBe('https://example.org/ok.png');
  });

  it('immersive_geometry.html, packets modules, classroom_import_app.js, and edge_tts_server.py retain Phase 23 guards', () => {
    const geo = fs.readFileSync(path.join(ROOT, 'immersive_geometry/immersive_geometry.html'), 'utf8');
    expect(geo).toContain('http-equiv="Content-Security-Policy"');
    expect(geo).toContain(`inspector="url: ''"`);
    expect(geo).toContain('edgeBox.dispose()');
    expect(geo).toContain('if (document.hidden');

    const openJs = fs.readFileSync(path.join(ROOT, 'packets-open.js'), 'utf8');
    expect(openJs).toContain('verify.sha256(bytes).base64 === pin[1]; } catch (_) { return false; }');
    expect(openJs).toContain('revokeAllDownloadUrls');

    const readerJs = fs.readFileSync(path.join(ROOT, 'packets_results_reader.js'), 'utf8');
    expect(readerJs).toContain('var MAX_SKIPPED = 500');
    expect(readerJs).toContain('data.items.slice(0, MAX_ITEMS)');
    expect(readerJs).toContain("own(titles, activity) ? titles[activity] : ''");

    const importJs = fs.readFileSync(path.join(ROOT, 'classroom_import_app.js'), 'utf8');
    expect(importJs).toMatch(/pagehide[\s\S]{0,200}linkContext = null;/);

    const edgePy = fs.readFileSync(path.join(ROOT, 'tts-server/edge_tts_server.py'), 'utf8');
    expect(edgePy).toContain('BoundedSemaphore');
    expect(edgePy).toContain('asyncio.run(');
    expect(edgePy).toContain('X-Content-Type-Options');
    expect(edgePy).toContain('ALLOFLOW_OFFLINE_ONLY');
  });
});
