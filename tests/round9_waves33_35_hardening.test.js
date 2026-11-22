import { describe, expect, it, vi } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = resolve(__dirname, '..');

describe('Round 9 Wave 33 — Cloud Workers, Firebase Functions, Web Source Fetch & Firestore Rules', () => {
  it('extractReadableDocument handles self-closing <svg/>, comment-wrapped <article>, and 50k unclosed <article> tags in linear time', () => {
    const { extractReadableDocument } = require('../desktop/web-app/functions/web_source_fetch.js');
    const desktopMirror = readFileSync(resolve(ROOT, 'desktop/runtime/web-source-fetch.cjs'), 'utf8');
    const functionsCopy = readFileSync(resolve(ROOT, 'desktop/web-app/functions/web_source_fetch.js'), 'utf8');
    expect(desktopMirror).toBe(functionsCopy);

    const selfClosingHtml = '<html><head><title>Real Page</title></head><body><svg class="icon"/> <main><p>Readable content after self-closing svg element.</p></main></body></html>';
    const doc1 = extractReadableDocument(selfClosingHtml, 'text/html');
    expect(doc1.title).toBe('Real Page');
    expect(doc1.text).toContain('Readable content after self-closing svg element.');

    const commentHijack = '<html><body><!-- <article>Decoy comment article</article> --><article><p>Authentic article body.</p></article></body></html>';
    const doc2 = extractReadableDocument(commentHijack, 'text/html');
    expect(doc2.text).toContain('Authentic article body.');
    expect(doc2.text).not.toContain('Decoy comment article');

    const hostile = '<article>'.repeat(50000) + '<p>Tail text</p>';
    const t0 = Date.now();
    const doc3 = extractReadableDocument(hostile, 'text/html');
    const elapsedMs = Date.now() - t0;
    expect(elapsedMs).toBeLessThan(2000);
    expect(doc3.text).toContain('Tail text');
  });

  it('isolates /source-metadata KV budget from global Serper /search daily budget and paginates PD/plugin listings beyond 50 keys', async () => {
    const workerModule = await import('../catalog/cloudflare-worker/src/index.js');
    const worker = workerModule.default;

    // 1. /source-metadata uses metadataday:/metadatarate: instead of searchday:/searchrate:
    const kvStore = new Map();
    const kv = {
      async get(k) { return kvStore.has(k) ? kvStore.get(k) : null; },
      async put(k, v) { kvStore.set(k, v); },
    };
    const origFetch = globalThis.fetch;
    const origCaches = globalThis.caches;
    globalThis.caches = { default: { match: async () => null, put: async () => {} } };
    globalThis.fetch = vi.fn(async () => new Response('<html><head><title>Example</title></head><body>Hi</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }));
    try {
      const env = { SEARCH_RATE: kv, SEARCH_DAILY_BUDGET: '2', METADATA_DAILY_BUDGET: '1' };
      const req1 = new Request('https://worker.test/source-metadata?url=https%3A%2F%2Fexample.org%2Fa', {
        headers: { 'CF-Connecting-IP': '203.0.113.10' },
      });
      const res1 = await worker.fetch(req1, env);
      expect(res1.status).toBe(200);
      const req2 = new Request('https://worker.test/source-metadata?url=https%3A%2F%2Fexample.org%2Fb', {
        headers: { 'CF-Connecting-IP': '203.0.113.10' },
      });
      const res2 = await worker.fetch(req2, env);
      expect(res2.status).toBe(429);
      const keys = [...kvStore.keys()];
      expect(keys.some((k) => k.startsWith('metadataday:'))).toBe(true);
      expect(keys.some((k) => k.startsWith('searchday:'))).toBe(false);
    } finally {
      globalThis.fetch = origFetch;
      globalThis.caches = origCaches;
    }

    // 2. GET /pdSubmissions paginates past the oldest 50 keys and returns newest submissions
    const allPdKeys = Array.from({ length: 65 }, (_, i) => `pd:${String(1700000000000 + i).padStart(13, '0')}:id${i}`);
    const pdKv = {
      async list({ cursor } = {}) {
        if (!cursor) {
          return { keys: allPdKeys.slice(0, 40).map((name) => ({ name })), list_complete: false, cursor: 'p2' };
        }
        return { keys: allPdKeys.slice(40).map((name) => ({ name })), list_complete: true };
      },
      async get(name) {
        return JSON.stringify({ title: 'Module ' + name.slice(-4) });
      },
    };
    const pdRes = await worker.fetch(
      new Request('https://worker.test/pdSubmissions?limit=5', {
        headers: { Authorization: 'Bearer admin-secret-token' },
      }),
      { ADMIN_TOKEN: 'admin-secret-token', PD_SUBMISSIONS: pdKv }
    );
    expect(pdRes.status).toBe(200);
    const pdJson = await pdRes.json();
    expect(pdJson.count).toBe(5);
    expect(pdJson.submissions[0].id).toBe(allPdKeys[64]);
    expect(pdJson.submissions[4].id).toBe(allPdKeys[60]);
  });

  it('bounds readBugReview pagination to MAX_REVIEW_SCAN_PAGES and updates bug_inbox a11y + non-thrashing DOM checks', async () => {
    const { readBugReview } = await import('../catalog/cloudflare-worker/src/bug_review.js');
    let pageCalls = 0;
    const runawayKv = {
      async list() {
        pageCalls += 1;
        return { keys: [], list_complete: false, cursor: 'c-' + pageCalls };
      },
    };
    await expect(readBugReview(runawayKv, 'bug:1700000000000:abc123', false)).rejects.toThrow(/Review scan bound exceeded/);
    expect(pageCalls).toBe(40);

    const inboxSrc = readFileSync(resolve(ROOT, 'catalog/cloudflare-worker/src/bug_inbox.js'), 'utf8');
    expect(inboxSrc).toContain('id="report-count" role="status" aria-live="polite" aria-atomic="true"');
    expect(inboxSrc).toContain('input::placeholder, textarea::placeholder { color: #475569; opacity: 1; }');
    expect(inboxSrc).toContain('historyEl.dataset.signature !== historySignature');
    expect(inboxSrc).toContain("tokenInput.setAttribute('aria-invalid', 'true')");
  });

  it('enforces strict parentId regex in canonical and mirrored firestore.rules and separates auth vs rate-limit errors in functions', () => {
    const rootRules = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8');
    const mirroredRules = readFileSync(resolve(ROOT, 'desktop/web-app/firestore.rules'), 'utf8');
    expect(rootRules).toBe(mirroredRules);
    expect(rootRules).toContain("request.resource.data.parentId.matches('^[A-Za-z0-9_-]{5,80}$')");

    const fnSrc = readFileSync(resolve(ROOT, 'desktop/web-app/functions/index.js'), 'utf8');
    expect(fnSrc).toContain('function isTrustedHostingForward(req)');
    expect(fnSrc).toContain('sendError(res, 503, "rate-limit-unavailable")');
  });
});

describe('Round 9 Wave 34 — Desktop Local Runtime Hardening', () => {
  it('enforces mode allowlist, hardlink rejection, and pre-extraction maxBytes in allosheet-zip-extractor.cjs', () => {
    const { validateVerboseArchiveListing } = require('../desktop/runtime/allosheet-zip-extractor.cjs');
    expect(() => validateVerboseArchiveListing('srwxr-xr-x 0 user group 0 Jan 1 2026 app/sock\n', 10)).toThrow(/link or special file/);
    expect(() => validateVerboseArchiveListing('-rw-r--r-- 0 user group 0 Jan 1 2026 app/a link to app/b\n', 10)).toThrow(/link or special file/);
    expect(() => validateVerboseArchiveListing('-rw-r--r-- 0 user group 2048 Jan 1 2026 app/big.bin\n', 10, 1024)).toThrow(/exceeds the extracted size limit/);
    expect(validateVerboseArchiveListing('-rw-r--r-- 0 user group 512 Jan 1 2026 app/ok.bin\n', 10, 1024)).toBe(1);
  });

  it('rejects Windows reserved names, control chars, and private/single-label download hosts in allosheet-engine-manager.cjs', () => {
    const src = readFileSync(resolve(ROOT, 'desktop/runtime/allosheet-engine-manager.cjs'), 'utf8');
    expect(src).toContain('^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])');
    expect(src).toContain("host.endsWith('.local')");
    expect(src).toContain("host.endsWith('.internal')");
    expect(src).toContain('fs.constants.O_NOFOLLOW');
    expect(src).toContain('if (childHasExited(child))');
  });

  it('guards organizer-reflections against non-array resources and null roster entries', () => {
    const { createOrganizerReflectionStore } = require('../desktop/runtime/organizer-reflections.cjs');
    const sessions = new Map([
      ['ABC123', {
        expiresAt: Date.now() + 60000,
        data: {
          isActive: true,
          roster: { 'stu-1': null },
          interactiveOrganizer: { type: 'reflection', activityId: 'act-1', resourceId: 'res-1' },
          resources: 'corrupt-not-array',
        },
      }],
    ]);
    const store = createOrganizerReflectionStore({ sessions, compact: () => {} });
    expect(() => store.submit('ABC123', { uid: 'stu-1', jti: 'tok-1' }, {
      version: 1,
      activityId: 'act-1',
      resourceId: 'res-1',
      fields: [{ id: 'summary', label: 'Summary', text: 'My reflection' }],
    })).toThrow(/diagram is still being delivered/);
  });

  it('isolates engine/ASR binaries under app-owned dataDir, rejects UNC modelDirectory, validates Host ports, and fixes LAN join script', () => {
    const runtimeSrc = readFileSync(resolve(ROOT, 'desktop/runtime/alloflow-desktop-runtime.cjs'), 'utf8');
    expect(runtimeSrc).toContain('function getEngineBinRoot()');
    expect(runtimeSrc).toContain('function getAsrBinRoot()');
    expect(runtimeSrc).toContain('Model directory must be an absolute local directory path');
    expect(runtimeSrc).toContain('if (!Number.isInteger(port) || port < 1 || port > 65535) return false;');
    expect(runtimeSrc).toContain('server.headersTimeout = 15000;');
    expect(runtimeSrc).toContain('if (decodedPath.includes(\'\\0\'))');
    expect(runtimeSrc).toContain('location.protocol === \'http:\' || location.protocol === \'https:\'');
    expect(runtimeSrc).not.toContain('/^https?:\\/\\//i.test(location.origin)');
  });
});

describe('Round 9 Wave 35 — AlloSheet, Access Lens, Data Lab & Text Inquiry Hardening', () => {
  it('enforces nowMs and future-date bounds in withinDateRange("all") and hardens AlloSheet adapter/analysis/bridge', () => {
    const fakeWin = { AlloModules: {} };
    new Function('window', readFileSync(resolve(ROOT, 'allo_sheet/transfer_adapter.js'), 'utf8'))(fakeWin);
    const transfer = fakeWin.AlloSheetTransferAdapter;
    const now = Date.parse('2026-11-21T12:00:00.000Z');
    expect(transfer.withinDateRange(now + 1000, 'all', now)).toBe(false);
    expect(transfer.withinDateRange(now, 'all', Number.NaN)).toBe(false);
    expect(transfer.withinDateRange(now - 1000, 'all', now)).toBe(true);

    const adapter = require('../allo_sheet/allo_sheet_adapter.js');
    expect(() => adapter.parseAgentPlan('null', {})).toThrow(/not valid JSON/);
    expect(() => adapter.parseAgentPlan('[]', {})).toThrow(/not valid JSON/);
    const circular = {};
    circular.self = circular;
    const normalized = adapter.normalizeRecords([{ id: 1, fields: { Good: 'ok', 'Bad\u0000Key': 'drop', Circ: circular } }]);
    expect(normalized[0].fields.Good).toBe('ok');
    expect(normalized[0].fields['Bad\u0000Key']).toBeUndefined();
    expect(normalized[0].fields.Circ).toBe('[value]');

    const analysis = require('../allo_sheet/allo_sheet_analysis.js');
    expect(() => analysis.filterRecords([{ fields: { A: '1' } }], { filterColumn: 'A', filterOperator: 'contains', filterValue: null }, { A: 'text' })).toThrow(/Enter a filter value/);

    const bridgeSrc = readFileSync(resolve(ROOT, 'allo_sheet/host_bridge.js'), 'utf8');
    expect(bridgeSrc).toContain('function neutralizePromptMarkers(text)');
    expect(bridgeSrc).toContain("recordId === '__proto__'");
  });

  it('preserves full maxCharacters > 50000 in text_inquiry_core and preserves custom proxy query params in text_inquiry_search', () => {
    const core = require('../text_inquiry/text_inquiry_core.js');
    const prefix = 'alpha sentence. '.repeat(3500); // 56,000 chars
    const tail = 'zyxwvutunique.';
    const res = core.analyzeText(prefix + tail, { maxCharacters: 70000 });
    expect(res.characterCount).toBeGreaterThan(54000);
    expect(res.topTerms.some((t) => t.term === 'zyxwvutunique')).toBe(true);
    expect(core.concordance(res, 'zyxwvutunique').length).toBe(1);

    const searchSrc = readFileSync(resolve(ROOT, 'text_inquiry/text_inquiry_search.js'), 'utf8');
    expect(searchSrc).toContain("parsed.pathname = parsed.pathname.replace(/\\/search\\/?$/i, '/source-metadata')");
  });

  it('hardens access_lens.html and data_lab/tutor_plugin.html with matching mirrors', () => {
    const accessSrc = readFileSync(resolve(ROOT, 'access_lens/access_lens.html'), 'utf8');
    const accessMirror = readFileSync(resolve(ROOT, 'desktop/web-app/public/access_lens/access_lens.html'), 'utf8');
    expect(accessSrc).toBe(accessMirror);
    expect(accessSrc).toContain('function cancelPendingSend()');
    expect(accessSrc).toContain('if (!verifiedOrigin) return;');
    expect(accessSrc).toContain('role="button"');
    expect(accessSrc).toContain('border: 1px solid #64748b;');

    const tutorSrc = readFileSync(resolve(ROOT, 'data_lab/tutor_plugin.html'), 'utf8');
    const tutorMirror = readFileSync(resolve(ROOT, 'desktop/web-app/public/data_lab/tutor_plugin.html'), 'utf8');
    expect(tutorSrc).toBe(tutorMirror);
    expect(tutorSrc).toContain("if (!target || /[[\\]]/.test(target)) return { ok: false, error: 'no-context' };");
    expect(tutorSrc).toContain('registration\n      .then(function () { return connected ? buildSnapshot() : null; })');
  });
});
