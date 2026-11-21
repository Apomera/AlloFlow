import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';

const require = createRequire(import.meta.url);
const manifestTool = require('../dev-tools/build_browser_delivery_manifest.cjs');

const PHASE39_FILES = [
  'allo_recovery_vault_integration_module.js',
  'annotation_inquiry_bridge.js',
  'allopack-library.js',
  'tool_integration_sdk.js',
  'translate_loader.js',
];
const MANIFEST_TRACKED = [
  'allo_recovery_vault_integration_module.js',
  'translate_loader.js',
];
const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];
const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

const windows = [];
afterEach(() => {
  windows.splice(0).forEach((w) => w.close());
  vi.restoreAllMocks();
});

function bootInDom(html, file, options = {}) {
  const dom = new JSDOM(html, {
    url: options.url || 'https://alloflow.dev/library',
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const w = dom.window;
  windows.push(w);
  if (typeof options.setup === 'function') options.setup(w);
  w.eval(readFileSync(file, 'utf8'));
  return w;
}

describe('Phase 39 mirror & 3-host SRI manifest integrity', () => {
  it('keeps all 5 Phase 39 modules byte-identical across root and all 3 desktop mirrors', () => {
    for (const file of PHASE39_FILES) {
      const rootHash = createHash('sha256').update(readFileSync(file)).digest('hex');
      for (const dir of MIRROR_DIRS) {
        const copyHash = createHash('sha256').update(readFileSync(`${dir}/${file}`)).digest('hex');
        expect(copyHash, `${dir}/${file} drifted from root`).toBe(rootHash);
      }
    }
  });

  it('keeps all 3 host SRI manifests in sync for manifest-tracked Phase 39 assets', () => {
    const releaseIds = new Set();
    for (const host of HOSTS) {
      const embedded = manifestTool.readEmbeddedManifest(readFileSync(host, 'utf8'));
      expect(embedded.releaseId).toMatch(/^[a-f0-9]{64}$/);
      releaseIds.add(embedded.releaseId);
      for (const file of MANIFEST_TRACKED) {
        const buf = readFileSync(file);
        const sri = 'sha384-' + createHash('sha384').update(buf).digest('base64');
        expect(embedded.assets[file]?.bytes, `${host} bytes for ${file}`).toBe(buf.length);
        expect(embedded.assets[file]?.integrity, `${host} integrity for ${file}`).toBe(sri);
      }
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 39: allo_recovery_vault_integration_module.js hardening', () => {
  const vaultInt = require('../allo_recovery_vault_integration_module.js');

  it('strips prototype-polluting keys on read/write, validates scopes, and rejects invalid CAS tokens', async () => {
    expect(Object.isFrozen(vaultInt)).toBe(true);
    const polluted = JSON.parse('{"version":2,"revision":3,"__proto__":{"polluted":true},"records":[]}');
    const storage = {
      get: vi.fn(async () => polluted),
      compareAndSwap: vi.fn(async () => ({ applied: true })),
    };

    // Invalid namespace / key rejected fail-closed
    expect(() => vaultInt.createDeviceRepository(storage, { namespace: '../escape' })).toThrow(/Invalid recovery-vault namespace/);
    expect(() => vaultInt.createDeviceRepository(storage, { key: '__proto__' })).toThrow(/Invalid recovery-vault key/);

    const repo = vaultInt.createDeviceRepository(storage);
    const head = await repo.read();
    expect(head.revision).toBe(3);
    expect(Object.prototype.hasOwnProperty.call(head.store, '__proto__')).toBe(false);
    expect(({}).polluted).toBeUndefined();

    // Invalid CAS expected tokens rejected before reaching storage
    await expect(repo.compareAndSwap(null, { version: 2 })).rejects.toThrow(/revision token/i);
    await expect(repo.compareAndSwap(0, { version: 2 })).rejects.toThrow(/revision token/i);
    await expect(repo.compareAndSwap({ mode: 'bogus' }, { version: 2 })).rejects.toThrow(/revision token/i);
    expect(storage.compareAndSwap).not.toHaveBeenCalled();

    // Circular nextStore throws typed VAULT_STORE_INVALID
    const circ = { version: 2 };
    circ.self = circ;
    await expect(repo.compareAndSwap(3, circ)).rejects.toMatchObject({ code: 'VAULT_STORE_INVALID' });
  });
});

describe('Phase 39: annotation_inquiry_bridge.js hardening', () => {
  const bridge = require('../annotation_inquiry_bridge.js');

  it('strips unsafe URL schemes, clamps Infinity sentenceIndex, and blocks undefined===undefined handoff spoofing', () => {
    expect(Object.isFrozen(bridge)).toBe(true);
    const res = bridge.createHandoff({
      source: { title: 'Test\x00Title', stableUrl: 'javascript:alert(1)' },
      excerpts: [{ sentenceIndex: Infinity, excerpt: 'A meaningful historical passage for close reading.' }],
    });
    expect(res.ok).toBe(true);
    expect(res.handoff.source.stableUrl).toBe('');
    expect(res.handoff.source.title).toBe('Test Title');
    expect(res.handoff.excerpts[0].sentenceIndex).toBe(1);

    // Valid https URL is preserved
    const okUrl = bridge.createHandoff({
      source: { title: 'Doc', stableUrl: 'https://example.edu/text' },
      excerpts: [{ sentenceIndex: 2, excerpt: 'Valid excerpt for close reading.' }],
    });
    expect(okUrl.handoff.source.stableUrl).toBe('https://example.edu/text');

    // Undefined handoffId must never match undefined inquiryTarget.handoffId
    const spoofedHandoff = { excerpts: [{ excerptId: 'excerpt-1' }] };
    const spoofedAnn = {
      kind: 'note',
      inquiryStance: 'supports',
      content: 'This note is definitely longer than twelve characters.',
      inquiryTarget: { excerptId: 'excerpt-1' },
    };
    expect(bridge.validateAnnotation(spoofedHandoff, spoofedAnn)).toBe(false);
    expect(bridge.validateAnnotation({}, spoofedAnn)).toBe(false);
  });
});

describe('Phase 39: allopack-library.js hardening', () => {
  it('blocks untrusted cross-origin primary download href and javascript: copy links, and survives missing optional DOM nodes', async () => {
    const html = `<!doctype html><html><body>
      <form id="pack-filters" hidden><input id="pack-search" /></form>
      <div class="pack-topic" data-pack-search="water"><div class="pack-version" data-pack-id="w1">
        <button data-copy-pack="javascript:alert(1)">Copy</button>
        <a data-pack-download="allopacks/current/water.allopack.json" href="https://evil.example/payload.json" download="../evil.json">Download</a>
      </div></div>
      <div id="pack-copy-status"></div>
    </body></html>`;
    const fetchedUrls = [];
    const writeText = vi.fn(async () => {});
    const w = bootInDom(html, 'allopack-library.js', {
      setup(win) {
        win.navigator.clipboard = { writeText };
        win.TextDecoder = TextDecoder;
        win.URL.createObjectURL = () => 'blob:https://alloflow.dev/1';
        win.URL.revokeObjectURL = () => {};
        const origClick = win.HTMLAnchorElement.prototype.click;
        win.HTMLAnchorElement.prototype.click = function () {
          if (this.href && this.href.startsWith('blob:')) return;
          return origClick.call(this);
        };
        win.fetch = async (url) => {
          fetchedUrls.push(String(url));
          return {
            ok: true,
            arrayBuffer: async () => new TextEncoder().encode(JSON.stringify({ allopack: { title: 'W' }, history: [] })).buffer,
          };
        };
      },
    });

    // Trigger filter with missing #pack-subject, #pack-grade, #pack-results, #pack-empty (must not throw)
    w.document.getElementById('pack-search').value = 'water';
    w.document.getElementById('pack-search').dispatchEvent(new w.Event('input', { bubbles: true }));

    // javascript: copy URL rejected before clipboard.writeText
    w.document.querySelector('[data-copy-pack]').click();
    await new Promise((r) => setTimeout(r, 10));
    expect(writeText).not.toHaveBeenCalled();

    // Cross-origin evil.example href is skipped directly to allowlisted GitHub raw URL
    w.document.querySelector('[data-pack-download]').click();
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchedUrls).toHaveLength(1);
    expect(fetchedUrls[0]).toBe('https://raw.githubusercontent.com/Apomera/AlloFlow/main/allopacks/current/water.allopack.json');
  });
});

describe('Phase 39: tool_integration_sdk.js hardening', () => {
  const sdk = require('../tool_integration_sdk.js');
  const CONTRACT = {
    schemaVersion: 1,
    id: 'secure_tool',
    name: 'Secure Tool',
    version: '1.0.0',
    reviewedAt: '2026-01-01',
    reviewAfter: '2099-01-01',
    license: { spdx: 'MIT' },
    citation: { text: 'Cite tool.' },
    supportedMethodPacks: ['scientific_investigation'],
    capabilities: { captureArtifact: true },
    privacy: { learnerApprovalRequired: true, sanitizerRequired: true, sanitizerId: 'strip_pii_v1' },
    reproducibility: { requiredFields: ['softwareVersion', 'limitations'] },
  };

  it('prevents forged sourceToolId payloads from bypassing sanitizeCapture/validateReceipt in download() and strips __proto__', () => {
    expect(Object.isFrozen(sdk)).toBe(true);
    const sanitizer = vi.fn((cap) => {
      if (cap.data) delete cap.data.secretPii;
      return cap;
    });
    const adapter = sdk.createAdapter({
      contract: CONTRACT,
      buildCapture: (p) => ({
        title: 'Result\x00',
        summary: 'Valid bounded summary.',
        data: p,
        reproducibilityReceipt: { softwareVersion: '1.0.0', limitations: ['Sample only.'] },
      }),
      sanitizeCapture: sanitizer,
    });

    // Forged payload claiming sourceToolId === contract.id MUST still run sanitizer & receipt validation
    const forgedMissingReceipt = adapter.download({
      sourceToolId: CONTRACT.id,
      summary: 'Forged summary',
      data: { secretPii: 'student-ssn' },
    });
    expect(forgedMissingReceipt.ok).toBe(false);
    expect(sanitizer).toHaveBeenCalledTimes(1);

    // Prototype-polluting payload stripped cleanly on prepare()
    const pollutedInput = JSON.parse('{"ok":1,"secretPii":"drop","__proto__":{"polluted":true}}');
    const prep = adapter.prepare(pollutedInput);
    expect(prep.ok).toBe(true);
    expect(prep.capture.data).toEqual({ ok: 1 });
    expect(Object.prototype.hasOwnProperty.call(prep.capture.data, '__proto__')).toBe(false);
    expect(prep.capture.title).toBe('Result');
    expect(({}).polluted).toBeUndefined();
  });
});

describe('Phase 39: translate_loader.js hardening', () => {
  it('blocks prototype-key lookups and fails closed in desktop/offline/QR modes', async () => {
    const w = bootInDom('<!doctype html><html><body></body></html>', 'translate_loader.js', {
      setup(win) { win.__alloOfflineOnly = true; },
    });
    const T = w.AlloTranslate;
    expect(Object.isFrozen(T)).toBe(true);

    // Prototype-key safety in supports()
    expect(T.supports('toString', 'en')).toBe(false);
    expect(T.supports('en', 'constructor')).toBe(false);
    expect(T.supports('English', 'Spanish')).toBe(true);

    // Offline / QR mode fails closed without loading remote CDN
    expect(await T.preload('en', 'es')).toBe(false);
    expect(await T.translate('Hello world', 'en', 'es')).toBeNull();
    expect(T.ready()).toBe(false);
  });
});
