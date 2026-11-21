import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function readRepo(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Phase 21: Storage Bridge, Entry Pages & Standalone Providers Hardening', () => {
  it('launch.html: accepts share.gemini.google & gemini.google.com/share URLs, avoids innerHTML on ?tool=, and mirrors cleanly', () => {
    const html = readRepo('launch.html');
    const fnMatch = html.match(/function isSafeCanvasUrl\(u\)\s*\{[\s\S]*?\n      \}/);
    expect(fnMatch).toBeTruthy();
    const isSafeCanvasUrl = vm.runInNewContext(`(${fnMatch[0]})`, { URL });
    expect(isSafeCanvasUrl('https://share.gemini.google/Jdve7XySpYhT')).toBe(true);
    expect(isSafeCanvasUrl('https://gemini.google.com/share/abc_123-XYZ')).toBe(true);
    expect(isSafeCanvasUrl('https://evil.example/share/abc')).toBe(false);
    expect(isSafeCanvasUrl('https://user:pass@share.gemini.google/abc')).toBe(false);
    expect(isSafeCanvasUrl('javascript:alert(1)')).toBe(false);

    expect(html).not.toContain('note.innerHTML');
    expect(html).toContain('strong.textContent = pretty');
    expect(html).toContain("credentials: 'omit', referrerPolicy: 'no-referrer'");

    // Mirror parity across all 3 desktop shells
    const rootBuf = fs.readFileSync(path.join(ROOT, 'launch.html'));
    for (const mirror of ['desktop/web-app/public/launch.html', 'desktop/web-app/build/launch.html', 'desktop/app-build/launch.html']) {
      expect(fs.readFileSync(path.join(ROOT, mirror)).equals(rootBuf), `${mirror} mismatch`).toBe(true);
    }
  });

  it('feedback.js & students.html: uses RFC 6068 %20 encoding in mailto links and guards lucide.createIcons()', () => {
    const fbSrc = readRepo('feedback.js');
    expect(fbSrc).toContain("'?subject=' + encodeURIComponent(subject)");
    expect(fbSrc).toContain("'&body=' + encodeURIComponent(body)");
    expect(fbSrc).not.toContain("return 'mailto:' + CONTACT_EMAIL + '?' + params.toString()");

    const students = readRepo('students.html');
    expect(students).toContain('if (window.lucide) lucide.createIcons();');
  });

  it('storage_bridge.html: blocks wipeAll from clients, enforces clinicalDeletionHeld, guards prototype keys, drops NFC, and mirrors cleanly', () => {
    const src = readRepo('storage_bridge.html');
    expect(src).not.toMatch(/var OPS\s*=.*wipeAll/);
    expect(src).not.toContain("case 'wipeAll':");
    expect(src).toContain("if ((msg.op === 'delete' || msg.op === 'clearNamespace') && ns === 'protected_clinical_records' && clinicalDeletionHeld())");
    expect(src).toContain('if (RESERVED_NS_RE.test(String(r.ns || \'\'))) return;');
    expect(src).toContain("if (needsNs[msg.op] && (typeof ns !== 'string' || !NS_RE.test(ns)))");
    expect(src).toContain('var by = Object.create(null);');
    expect(src).toContain('var byNs = Object.create(null);');
    expect(src).not.toContain("text.normalize('NFC')");
    expect(src).toContain('alloflow_educator_access_backoff_v1');
    expect(src).toContain('db.onversionchange');
    expect(src).toContain("t.onabort = function () { reject(t.error || new Error('tx aborted')); };");

    const rootBuf = fs.readFileSync(path.join(ROOT, 'storage_bridge.html'));
    for (const mirror of ['desktop/web-app/public/storage_bridge.html', 'desktop/web-app/build/storage_bridge.html', 'desktop/app-build/storage_bridge.html']) {
      expect(fs.readFileSync(path.join(ROOT, mirror)).equals(rootBuf), `${mirror} mismatch`).toBe(true);
    }
  });

  it('src/dataProvider.js: injects PocketBase owner_id, only falls back to POST on 404, parses PB_CONNECT clientId, and deletes fields in LocalStorageAdapter', async () => {
    const { DataProvider } = require(path.join(ROOT, 'src/dataProvider.js'));

    // 1. PocketBaseAdapter owner_id injection + non-404 error preservation
    const calls = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, method: opts.method, body: opts.body ? JSON.parse(opts.body) : null });
      if (opts.method === 'PATCH' && url.includes('doc403')) {
        return { ok: false, status: 403, statusText: 'Forbidden', json: async () => ({ message: 'Forbidden' }) };
      }
      if (opts.method === 'PATCH' && url.includes('doc404')) {
        return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({ message: 'Not Found' }) };
      }
      return { ok: true, status: 200, json: async () => ({ id: 'ok' }) };
    };
    try {
      const pb = new DataProvider({ backend: 'pocketbase', baseUrl: 'http://127.0.0.1:8090', debugLog: () => {}, warnLog: () => {} });
      pb._adapter._userId = 'usr_teacher_1';
      await expect(pb.setDoc('sessions', 'doc403', { mode: 'quiz' })).rejects.toThrow(/PocketBase 403/);
      expect(calls).toHaveLength(1); // Must NOT retry with POST on 403
      expect(calls[0].body.owner_id).toBe('usr_teacher_1');

      await pb.setDoc('sessions', 'doc404', { mode: 'quiz' });
      expect(calls).toHaveLength(3); // PATCH 404 -> POST
      expect(calls[2].method).toBe('POST');
      expect(calls[2].body.owner_id).toBe('usr_teacher_1');

      // Invalid collection in onSnapshot must throw synchronously without leaking EventSource
      expect(() => pb.onSnapshot('../admin', 'doc1', () => {})).toThrow(/Invalid PocketBase collection/);
    } finally {
      globalThis.fetch = origFetch;
    }

    // 2. LocalStorageAdapter deleteField() actually deletes + no collection prefix collision
    const map = new Map();
    const origLS = globalThis.localStorage;
    globalThis.localStorage = {
      get length() { return map.size; },
      key: (i) => Array.from(map.keys())[i] ?? null,
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    };
    try {
      const localDp = new DataProvider({ backend: 'local', debugLog: () => {}, warnLog: () => {} });
      await localDp.setDoc('notes', 'd1', { secret: 'PII', keep: 1 });
      await localDp.updateDoc('notes', 'd1', { secret: DataProvider.deleteField() });
      const after = await localDp.getDoc('notes', 'd1');
      expect(after).toEqual({ id: 'd1', keep: 1 });
      expect('secret' in after).toBe(false);

      await localDp.setDoc('foo', 'a', { v: 1 });
      await localDp.setDoc('foo__bar', 'b', { v: 2 });
      const fooDocs = await localDp.getDocs('foo');
      expect(fooDocs).toHaveLength(1);
      expect(fooDocs[0].id).toBe('a');
    } finally {
      globalThis.localStorage = origLS;
    }
  });

  it('src/dataLayer.js: rejects path-segment injection, handles collection queries, preserves Firebase paths, and prevents meta spoofing', async () => {
    const { AlloData, flattenPath } = require(path.join(ROOT, 'src/dataLayer.js'));
    expect(() => flattenPath('artifacts', 'app1', 'public', 'data', 'sessions', '1234/studentProgress/stu1')).toThrow(/Invalid DataLayer path segment/);
    expect(() => flattenPath('artifacts', '..', 'public')).toThrow(/Invalid DataLayer path segment/);

    const colQuery = flattenPath('artifacts', 'app1', 'public', 'data', 'sessions', '1234', 'studentProgress');
    expect(colQuery).toEqual({ collection: 'student_progress', docId: null, meta: { session_code: '1234' } });

    const seen = [];
    const pbFake = { backend: 'pocketbase', setDoc: async (c, id, d) => seen.push({ c, id, d }) };
    const alloPb = new AlloData(pbFake, 'app1');
    await alloPb.createSession('app1', 'ABCD', { code: 'SPOOFED', app_id: 'EVIL', mode: 'quiz' });
    expect(seen[0]).toEqual({ c: 'sessions', id: 'app1__ABCD', d: { code: 'ABCD', app_id: 'app1', mode: 'quiz' } });

    const fbSeen = [];
    const fbFake = { backend: 'firebase', setDoc: async (c, id, d) => fbSeen.push({ c, id, d }) };
    const alloFb = new AlloData(fbFake, 'app1');
    await alloFb.createSession('app1', 'ABCD', { mode: 'quiz' });
    expect(fbSeen[0]).toEqual({ c: 'artifacts/app1/public/data/sessions', id: 'ABCD', d: { mode: 'quiz' } });
  });

  it('src/aiProvider.js, src/searchProvider.js & src/wolframProvider.js: headers/URLs, Ollama stream:false, ReDoS/policy guards, secrets lock & strict verify()', async () => {
    // 1. AIProvider
    const aiWin = {};
    const fetched = [];
    const aiSandbox = {
      window: aiWin,
      globalThis: aiWin,
      URL,
      encodeURIComponent,
      AbortController,
      setTimeout,
      clearTimeout,
      console,
      fetch: async (url, opts) => {
        fetched.push({ url, opts });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'ok' }] } }],
            message: { content: 'ollama-ok' },
          }),
        };
      },
    };
    vm.runInNewContext(readRepo('src/aiProvider.js'), aiSandbox);
    expect(() => new aiWin.AIProvider({ backend: 'custom', baseUrl: 'file:///etc/passwd' })).toThrow(/http: or https:/);

    const gem = new aiWin.AIProvider({ backend: 'gemini', apiKey: 'AIza-secret-test' });
    await gem.generateText('Hello');
    expect(fetched[0].url).not.toContain('AIza-secret-test');
    expect(fetched[0].url).not.toContain('?key=');
    expect(fetched[0].opts.headers['x-goog-api-key']).toBe('AIza-secret-test');
    expect(fetched[0].opts.credentials).toBe('omit');

    const ol = new aiWin.AIProvider({ backend: 'ollama', baseUrl: 'http://localhost:11434/' });
    await ol.generateText('Hi', { json: true });
    expect(fetched[1].url).toBe('http://localhost:11434/api/chat');
    const olPayload = JSON.parse(fetched[1].opts.body);
    expect(olPayload.stream).toBe(false);
    expect(olPayload.format).toBe('json');

    gem.generateText = async () => '{"safe":"false","reason":"bad"}';
    expect(await gem.checkSafety('some text here')).toEqual({ safe: false, reason: 'bad' });

    // 2. WebSearchProvider: ReDoS bounded + policy block + invalid searxngUrl rejected
    const spWin = { ALLOFLOW_MANAGED_AI_POLICY: { version: 1, allowExternalSearch: false } };
    vm.runInNewContext(readRepo('src/searchProvider.js'), {
      window: spWin, navigator: { onLine: true }, URL, encodeURIComponent, AbortController, setTimeout, clearTimeout, console,
    });
    const SP = spWin.WebSearchProvider;
    expect(SP.isAvailable()).toBe(false);
    expect((await SP.testConnection()).blocked).toBe(true);
    const t0 = Date.now();
    SP._extractSearchQuery('topic' + '\n'.repeat(25000));
    SP._extractSearchQuery('write' + ' '.repeat(25000) + 'x');
    expect(Date.now() - t0).toBeLessThan(200);
    SP.searxngUrl = 'file:///etc/passwd';
    expect(SP._safeBaseUrl()).toBe('');

    // 3. WolframProvider: secrets lock blocks getApiKey() + strict verify() rejects "4x" and "12" for "1/2"
    const wWin = { __alloAiSecretsLocked: false };
    let wolframReply = 'x = 4';
    vm.runInNewContext(readRepo('src/wolframProvider.js'), {
      window: wWin,
      localStorage: { getItem: () => JSON.stringify({ wolframAppId: 'SECRET-APPID' }) },
      fetch: async () => ({ ok: true, status: 200, text: async () => wolframReply }),
      URL, encodeURIComponent, AbortController, setTimeout, clearTimeout, console,
    });
    const W = wWin.WolframProvider;
    expect((await W.verify('2x+5=13', '4x')).correct).toBe(false);
    expect((await W.verify('2x+5=13', '4-99')).correct).toBe(false);
    wolframReply = 'x = 1/2';
    expect((await W.verify('2x=1', '0.5')).correct).toBe(true);
    expect((await W.verify('2x=1', '12')).correct).toBe(false);
    wWin.__alloAiSecretsLocked = true;
    expect(W.getApiKey()).toBe('');
  });
});
