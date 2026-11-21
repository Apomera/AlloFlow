import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';

const require = createRequire(import.meta.url);
const manifestTool = require('../dev-tools/build_browser_delivery_manifest.cjs');

const PHASE42_FILES = [
  'data_kernel_loader.js',
  'glb_library_module.js',
  'verification_policy_module.js',
  'semantic_review_module.js',
  'review_document_session_module.js',
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

function bootInDom(file, setup) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://alloflow.dev/',
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const w = dom.window;
  windows.push(w);
  if (typeof setup === 'function') setup(w);
  w.eval(readFileSync(file, 'utf8'));
  return w;
}

describe('Phase 42 mirror & 3-host SRI manifest integrity', () => {
  it('keeps all 5 Phase 42 modules byte-identical across root and all 3 desktop mirrors', () => {
    for (const file of PHASE42_FILES) {
      const rootHash = createHash('sha256').update(readFileSync(file)).digest('hex');
      for (const dir of MIRROR_DIRS) {
        const copyHash = createHash('sha256').update(readFileSync(`${dir}/${file}`)).digest('hex');
        expect(copyHash, `${dir}/${file} drifted from root`).toBe(rootHash);
      }
    }
  });

  it('keeps all 3 host SRI manifests in sync for all 5 Phase 42 assets', () => {
    const releaseIds = new Set();
    for (const host of HOSTS) {
      const embedded = manifestTool.readEmbeddedManifest(readFileSync(host, 'utf8'));
      expect(embedded.releaseId).toMatch(/^[a-f0-9]{64}$/);
      releaseIds.add(embedded.releaseId);
      for (const file of PHASE42_FILES) {
        const buf = readFileSync(file);
        const sri = 'sha384-' + createHash('sha384').update(buf).digest('base64');
        expect(embedded.assets[file]?.bytes, `${host} bytes for ${file}`).toBe(buf.length);
        expect(embedded.assets[file]?.integrity, `${host} integrity for ${file}`).toBe(sri);
      }
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 42: data_kernel_loader.js hardening', () => {
  it('blocks DuckDB file-path shorthand, dollar quotes, cloud schemes, and metadata functions; bounds columns & strips __proto__', async () => {
    const querySpy = vi.fn(async () => ({ toArray: () => [] }));
    const w = bootInDom('data_kernel_loader.js', (win) => {
      win.Worker = function FakeWorker() { this.terminate = () => {}; };
      win.__alloLoadVerifiedRuntime = async () => ({
        ConsoleLogger: function () {},
        AsyncDuckDB: function () {
          this.instantiate = async () => {};
          this.registerFileText = async () => {};
          this.dropFile = async () => {};
          this.connect = async () => ({ query: querySpy, close: async () => {} });
        },
      });
      win.__alloGetVerifiedRuntimeAsset = async () => ({ url: 'blob:test', revoke: () => {} });
    });
    const K = w.AlloDataKernel;
    expect(Object.isFrozen(K)).toBe(true);
    expect(Object.isFrozen(K.queryHistory)).toBe(true);

    // Cap columns at 200
    const wide = {};
    for (let i = 0; i < 250; i++) wide['col_' + i] = i;
    expect(K.normalizeRows([wide]).columns.length).toBe(200);

    // History JSON reviver strips __proto__ and control chars
    w.localStorage.setItem('alloflow_data_kernel_query_history_v1', '[{"sql":"SELECT 1\\u0000","__proto__":{"polluted":true}}]');
    const hist = K.queryHistory.list();
    expect(hist[0].sql).toBe('SELECT 1');
    expect(({}).polluted).toBeUndefined();

    // SQL sandbox checks
    const ws = await K.createWorkspace([{ a: 1 }]);
    expect(ws.backend).toBe('duckdb-wasm');
    const dangerousQueries = [
      "SELECT * FROM '/etc/passwd'",
      "SELECT * FROM data JOIN 'secret.csv' ON 1=1",
      'SELECT $$hello$$ FROM data',
      'SELECT * FROM read_xlsx(data)',
      'SELECT getenv(\'HOME\') FROM data',
      'SELECT * FROM duckdb_databases()',
      'SELECT current_setting(\'threads\') FROM data',
      "SELECT 's3://bucket/key' FROM data",
      'SELECT * FROM sqlite_scan(data)',
    ];
    for (const badSql of dangerousQueries) {
      expect(() => ws.query(badSql), badSql).toThrow();
    }
    await ws.close();
  });
});

describe('Phase 42: glb_library_module.js hardening', () => {
  it('blocks unsafe URLs/scripts, prototype-key category/id collisions, and Infinity token balance', async () => {
    const w = bootInDom('glb_library_module.js', (win) => {
      win.__alloOfflineOnly = true;
    });
    const G = w.AlloModules.GlbLibrary;
    expect(Object.isFrozen(G)).toBe(true);
    expect(Object.isFrozen(G.STARTER_CATALOG)).toBe(true);
    expect(Object.isFrozen(G.CATEGORIES)).toBe(true);

    // URL scheme & traversal checks
    expect(G.resolveGlbUrl('javascript:alert(1)', 'https://alloflow.dev/')).toBe('');
    expect(G.resolveGlbUrl('data:text/html,<script>1</script>', 'https://alloflow.dev/')).toBe('');
    expect(G.resolveGlbUrl('//evil.example/a.glb', 'https://alloflow.dev/')).toBe('');
    expect(G.resolveGlbUrl('../secret.glb', 'https://alloflow.dev/')).toBe('');
    expect(G.resolveGlbUrl('data:model/gltf-binary;base64,AA==', 'https://alloflow.dev/')).toBe('data:model/gltf-binary;base64,AA==');

    // Prototype-key safety in category & dedup seen map
    const cat = G.normalizeCatalog([
      { id: 'toString', category: 'toString', cost: Infinity, recipe: { parts: [{ shape: 'box' }] } },
    ]);
    expect(cat).toHaveLength(1);
    expect(cat[0].id).toBe('toString');
    expect(cat[0].category).toBe('decor');
    expect(cat[0].cost).toBe(0);

    // Infinity tokens treated as 0 (not infinite balance!)
    expect(G.canAfford({ cost: 10 }, Infinity)).toBe(false);

    // Untrusted gltfUrl and offline mode do not inject <script> tags
    await expect(G.loadModel({}, { id: 'x', glbUrl: 'assets/glb/key.glb' }, { gltfUrl: 'https://evil.example/x.js' })).rejects.toThrow();
    await expect(G.loadModel({}, { id: 'x', glbUrl: 'assets/glb/key.glb' }, {})).rejects.toThrow();
    expect(w.document.head.querySelectorAll('script')).toHaveLength(0);
  });
});

describe('Phase 42: verification_policy_module.js hardening', () => {
  it('bounds extraReasons, strips control chars, sanitizes pdfUaSelfCheck, and freezes API', () => {
    const w = bootInDom('verification_policy_module.js');
    const VP = w.AlloModules.VerificationPolicy;
    expect(Object.isFrozen(VP)).toBe(true);

    const state = VP.deriveVerificationState({
      extraReasons: Array.from({ length: 80 }, (_, i) => 'note-' + i + '\x00'),
      pdfUaSelfCheck: 'pass\x07',
    });
    expect(state.verificationCoverage.pdfUaSelfCheck).toBe('pass');
    expect(state.reasons.filter((r) => r.startsWith('note-'))).toHaveLength(50);
    expect(state.reasons.every((r) => !r.includes('\x00'))).toBe(true);
    expect(VP.formatVerificationReason('Custom\x00 reason')).toBe('Custom reason');
    expect(VP.unavailableVerificationState('bad\x07').reasons[0]).toBe('bad');
  });
});

describe('Phase 42: semantic_review_module.js hardening', () => {
  it('strips on* event handlers during retag, rejects >5MB HTML, and blocks prototype keys in aliases & entry.details', () => {
    const w = bootInDom('semantic_review_module.js');
    const SR = w.AlloModules.SemanticReview;

    // >5MB HTML rejected fail-closed
    const huge = SR.buildSemanticTree('<p>' + 'a'.repeat(5 * 1024 * 1024 + 10) + '</p>');
    expect(huge.ok).toBe(false);
    expect(huge.error).toBe('invalid-html');

    // Retag strips inline event handlers
    const tree = SR.buildSemanticTree('<body><p onclick="alert(1)" data-keep="yes">Hello</p></body>');
    const pId = tree.flat[0].id;
    const cmd = JSON.parse(`{"type":"retag","nodeId":"${pId}","tag":"h2","__proto__":{"polluted":true}}`);
    const retagged = SR.applySemanticCommand(tree.html, cmd);
    expect(retagged.ok).toBe(true);
    expect(retagged.html).not.toContain('onclick');
    expect(retagged.html).toContain('data-keep="yes"');
    expect(Object.prototype.hasOwnProperty.call(retagged.entry.details, '__proto__')).toBe(false);

    // Prototype-key table header mode rejected cleanly
    const tTree = SR.buildSemanticTree('<body><table><tr><td>A</td></tr></table></body>');
    const badMode = SR.applySemanticCommand(tTree.html, { type: 'set-table-headers', nodeId: tTree.flat[0].id, mode: 'toString' });
    expect(badMode.ok).toBe(false);
    expect(badMode.error).toBe('invalid-table-header-mode');
  });
});

describe('Phase 42: review_document_session_module.js hardening', () => {
  it('strips prototype-polluting keys on hydrateSession and bounds ledger & transaction commands', () => {
    const w = bootInDom('review_document_session_module.js');
    const RDS = w.AlloModules.ReviewDocumentSession;

    const hydrated = RDS.hydrateSession('{"accessibleHtml":"<p>Hi</p>","__proto__":{"polluted":true}}', { id: 'sess\x001' });
    expect(hydrated.id).toBe('sess1');
    expect(Object.prototype.hasOwnProperty.call(hydrated.document.remediationResult, '__proto__')).toBe(false);
    expect(({}).polluted).toBeUndefined();

    // Ledger capped at 500
    const bigLedger = Array.from({ length: 600 }, (_, i) => ({ type: 'note', summary: 'n' + i }));
    const sess = RDS.createSession({ id: 'bounded', ledger: bigLedger });
    expect(sess.ledger).toHaveLength(500);

    // Transaction commands capped at 100
    let tx = RDS.beginTransaction(sess);
    for (let i = 0; i < 100; i++) tx = RDS.addCommand(tx, { type: 'retag' });
    expect(() => RDS.addCommand(tx, { type: 'retag' })).toThrow(/review-transaction-command-limit/);
  });
});
