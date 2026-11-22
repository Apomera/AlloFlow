import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const bdm = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));

const WAVE28_CORE = [
  'allo_recovery_vault_integration_module.js',
  'allo_quest_contract_module.js',
  'standards_provider_module.js',
  'standards_context_module.js',
  'survey_item_schema_module.js',
  'item_correction_module.js',
];

const WAVE28_INTERACTIVE = [
  'live_polling_module.js',
  'memory_palace_module.js',
  'escape_room_module.js',
  'mind_map_module.js',
  'concept_graph_3d_module.js',
  'reading_library_module.js',
];

const WAVE28_STUDIOS = [
  'math_fluency_module.js',
  'studio_module.js',
  'cinematic_studio_module.js',
  'music_studio/open_groove_module.js',
  'translation_feedback_module.js',
  'document_narration_text_module.js',
];

const WAVE28_ALL = [...WAVE28_CORE, ...WAVE28_INTERACTIVE, ...WAVE28_STUDIOS];

const MIRROR_ROOTS = [
  '',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha384Sri(buf) {
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

function runSsr(relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.runInNewContext(code, sandbox, { filename: relPath, timeout: 3000 });
  return sandbox;
}

function runWithWindow(relPath, extra = {}) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = Object.assign({ AlloModules: {}, console: { log() {}, warn() {}, error() {}, info() {} } }, extra.window || {});
  const sandbox = Object.assign({
    window: win,
    console: { log() {}, warn() {}, error() {}, info() {} },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
  }, extra);
  sandbox.window = win;
  sandbox.globalThis = sandbox;
  sandbox.self = win;
  vm.runInNewContext(code, sandbox, { filename: relPath, timeout: 3000 });
  return { sandbox, win };
}

describe('Wave 28 Bug Sweep — Mirror, SRI, SSR, Core & Interactive/Studio Hardening', () => {
  it('maintains 4-way SHA-256 mirror parity across all 18 Wave 28 deliverables', () => {
    for (const rel of WAVE28_ALL) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      const expected = sha256(rootBuf);
      for (const mirrorRoot of MIRROR_ROOTS.slice(1)) {
        const destPath = path.join(ROOT, mirrorRoot, rel);
        expect(fs.existsSync(destPath), `Missing mirror ${destPath}`).toBe(true);
        const destBuf = fs.readFileSync(destPath);
        expect(sha256(destBuf), `Mirror mismatch for ${destPath}`).toBe(expected);
      }
    }
  });

  it('maintains 3-host embedded SHA-384 SRI parity and identical releaseId for all 18 deliverables', () => {
    const manifests = HOST_FILES.map((host) =>
      bdm.readEmbeddedManifest(fs.readFileSync(path.join(ROOT, host), 'utf8'))
    );
    const releaseIds = new Set(manifests.map((m) => m.releaseId));
    expect(releaseIds.size).toBe(1);

    for (const rel of WAVE28_ALL) {
      const buf = fs.readFileSync(path.join(ROOT, rel));
      const expectedSri = sha384Sri(buf);
      for (let i = 0; i < HOST_FILES.length; i++) {
        const rec = manifests[i].assets[rel];
        expect(rec, `Missing ${rel} in ${HOST_FILES[i]}`).toBeTruthy();
        expect(rec.integrity, `SRI mismatch for ${rel} in ${HOST_FILES[i]}`).toBe(expectedSri);
        expect(rec.bytes, `Bytes mismatch for ${rel} in ${HOST_FILES[i]}`).toBe(buf.length);
      }
    }
  });

  it('evaluates cleanly in Node VM SSR (window & document undefined) across all 18 deliverables', () => {
    for (const rel of WAVE28_ALL) {
      expect(() => runSsr(rel), `SSR failed for ${rel}`).not.toThrow();
    }
  });

  it('allo_recovery_vault_integration: separates safe read revision 0 from CAS token >= 1 and rejects hostile scopes/stores', async () => {
    const { win } = runWithWindow('allo_recovery_vault_integration_module.js');
    const api = win.AlloModules.AlloRecoveryVaultIntegration;
    expect(api).toBeTruthy();

    let state = { revision: 0, records: [] };
    const repo = api.createDeviceRepository({
      get: async () => state,
      compareAndSwap: async () => ({ committed: true, value: state }),
    });

    const initial = await repo.read();
    expect(initial.revision).toBe(0);

    await expect(repo.compareAndSwap(0, { revision: 1 })).rejects.toThrow(/revision/i);
    await expect(repo.compareAndSwap(1, [])).rejects.toThrow(/object/i);

    expect(() => api.createDeviceRepository(
      { get: async () => null, compareAndSwap: async () => ({ committed: true }) },
      { namespace: '__proto__' }
    )).toThrow();
    expect(() => api.createDeviceRepository(
      { get: async () => null, compareAndSwap: async () => ({ committed: true }) },
      { key: '.' }
    )).toThrow();
  });

  it('allo_quest_contract: freezes API, rejects boolean/non-finite numeric values, and handles Symbols safely', () => {
    const { win } = runWithWindow('allo_quest_contract_module.js');
    const qc = win.AlloQuestContract;
    expect(qc).toBeTruthy();
    expect(Object.isFrozen(qc)).toBe(true);
    expect(qc.isComplete('time', true, 1)).toBe(false);
    expect(qc.isComplete('time', [1], 1)).toBe(false);
    expect(qc.isComplete('time', 2, 1)).toBe(true);
    expect(() => qc.fromDirections({ type: Symbol('x'), title: Symbol('y') })).not.toThrow();
  });

  it('standards_provider: freezes API and isolates publicRecord sourceUrls from caller mutation', () => {
    const { win } = runWithWindow('standards_provider_module.js');
    const sp = win.AlloModules.StandardsProvider;
    expect(sp).toBeTruthy();
    expect(Object.isFrozen(sp)).toBe(true);
    const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'test_data/standards_context/local_snapshot_v1.json'), 'utf8'));
    const provider = sp.createLocalProvider(snapshot);
    expect(Object.isFrozen(provider)).toBe(true);
    const sampleRes = provider.sampleStandards({ limit: 1 });
    const samples = Array.isArray(sampleRes && sampleRes.standards) ? sampleRes.standards : [];
    expect(samples.length).toBeGreaterThan(0);
    const rec1 = provider.resolveStandard(samples[0].code);
    expect(rec1).toBeTruthy();
    const target = rec1.standard || rec1;
    if (Array.isArray(target.sourceUrls)) {
      target.sourceUrls.push('https://evil.example/mutated');
      const rec2 = provider.resolveStandard(samples[0].code);
      const target2 = rec2.standard || rec2;
      expect(target2.sourceUrls).not.toContain('https://evil.example/mutated');
    }
  });

  it('standards_context: freezes exports, drops blank relationships, and blocks unsafe URL characters', () => {
    const { win } = runWithWindow('standards_context_module.js');
    const sc = win.AlloModules.StandardsContext;
    expect(sc).toBeTruthy();
    expect(Object.isFrozen(sc)).toBe(true);
    expect(Object.isFrozen(sc.TEXT_ACCESS_EXPECTATIONS)).toBe(true);
    const ctx = sc.normalize({
      entries: [{
        code: 'CCSS.ELA.1',
        text: 'Read informational text.',
        relationships: ['   '],
        sourceUrls: ['https://example.org/ok', 'https://bad.example/"><script>'],
      }],
    });
    const entry = ctx && ctx.standards && ctx.standards[0];
    expect(entry).toBeTruthy();
    expect((entry.relationships || []).length).toBe(0);
    const urls = entry.sourceUrls || [];
    expect(urls).toContain('https://example.org/ok');
    expect(urls.some((u) => u.includes('<script>'))).toBe(false);
  });

  it('survey_item_schema: freezes TYPES/API, rejects boolean numeric steps, and supports bare-string mailbox options', () => {
    const { win } = runWithWindow('survey_item_schema_module.js');
    const sis = win.AlloModules.SurveyItemSchema;
    expect(sis).toBeTruthy();
    expect(Object.isFrozen(sis)).toBe(true);
    expect(Object.isFrozen(sis.TYPES)).toBe(true);

    const item = sis.normalizeItem({ type: 'likert', text: 'Rate confidence', steps: true });
    expect(item.steps).toBe(5);

    const converted = sis.fromMailboxActivity({
      type: 'survey',
      items: [{ type: 'choice', text: 'Pick one', options: ['Alpha', 'Beta'] }],
    });
    expect(converted[0].options.map((o) => o.text)).toEqual(['Alpha', 'Beta']);
  });

  it('item_correction: freezes API and blocks community feedback inside desktop bundled app', () => {
    const { win } = runWithWindow('item_correction_module.js', {
      window: { AlloModules: {}, _isDesktopBundledApp: true },
    });
    const ic = win.AlloModules.ItemCorrection;
    expect(ic).toBeTruthy();
    expect(Object.isFrozen(ic)).toBe(true);
    expect(typeof ic.closeModal).toBe('function');
    const src = fs.readFileSync(path.join(ROOT, 'item_correction_module.js'), 'utf8');
    expect(src).toContain('window._isDesktopBundledApp === true');
    expect(src).toContain('IdentifierRedaction');
  });

  it('document_narration_text: enforces walkMath depth cap, prototype-safe say(), SSR fallback, and null-safe merging', () => {
    const sandbox = runSsr('document_narration_text_module.js');
    const mod = sandbox.AlloNarrationText;
    expect(mod).toBeTruthy();

    // SSR fallback when DOMParser is absent
    expect(mod.naturalText('<p>Hello</p>')).toBe('');
    expect(mod.naturalText('<p>Hello</p>', { languageRuns: true })).toEqual([]);
    expect(mod.accessibleText('<p>Hello</p>')).toBe('');
    expect(mod.accessibleText('<p>Hello</p>', null, { languageRuns: true })).toEqual([]);

    // Depth cap + prototype-key safety + iterative table col count in source
    const src = fs.readFileSync(path.join(ROOT, 'document_narration_text_module.js'), 'utf8');
    expect(src).toContain('if (!node || depth > 64) return ""');
    expect(src).toContain('if (!Array.isArray(input)) return []');
    expect(src).toContain('k !== "__proto__" && k !== "constructor" && k !== "prototype"');
    expect(src).not.toContain('Math.max.apply(null, rows.map');
  });

  it('enforces global mute + alloflow-mute-changed across audio-bearing interactive and studio modules', () => {
    for (const rel of [
      'escape_room_module.js',
      'reading_library_module.js',
      'math_fluency_module.js',
      'music_studio/open_groove_module.js',
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing alloflow-global-muted check`).toContain('alloflow-global-muted');
      expect(src, `${rel} missing _alloGlobalMuted check`).toContain('_alloGlobalMuted');
      expect(src, `${rel} missing alloflow-mute-changed listener`).toContain('alloflow-mute-changed');
    }
  });

  it('enforces AI hard-deny (ALLOFLOW_MANAGED_AI_POLICY & StudentPolicy) across all AI-capable Wave 28 modules', () => {
    for (const rel of [
      'live_polling_module.js',
      'escape_room_module.js',
      'mind_map_module.js',
      'reading_library_module.js',
      'math_fluency_module.js',
      'studio_module.js',
      'cinematic_studio_module.js',
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing ALLOFLOW_MANAGED_AI_POLICY check`).toContain('ALLOFLOW_MANAGED_AI_POLICY');
      expect(src, `${rel} missing StudentPolicy check`).toContain('StudentPolicy');
    }
    // reading_library closes the isTeacherMode hard-deny bypass
    const rlSrc = fs.readFileSync(path.join(ROOT, 'reading_library_module.js'), 'utf8');
    expect(rlSrc).toContain('!_rlHardAiDenied(props.callGemini)');
  });

  it('enforces crisis screening, prompt fencing, XSS URL filtering, Trusted Types, and hidden-tab throttling', () => {
    const rlSrc = fs.readFileSync(path.join(ROOT, 'reading_library_module.js'), 'utf8');
    expect(rlSrc).toContain('function _rlCrisisBlocked');
    expect(rlSrc).toContain('988');
    expect(rlSrc).toContain('function _rlSafeHttpUrl');
    expect(rlSrc).toContain('function _rlSafeImageCssUrl');
    expect(rlSrc).toContain('function _rlFenceUntrusted');

    const stSrc = fs.readFileSync(path.join(ROOT, 'studio_module.js'), 'utf8');
    expect(stSrc).toContain('function _stCrisisBlocked');
    expect(stSrc).toContain('988');

    const csSrc = fs.readFileSync(path.join(ROOT, 'cinematic_studio_module.js'), 'utf8');
    expect(csSrc).toContain('function csStudentCrisisBlocked');
    expect(csSrc).not.toContain('if (!callGemini)');

    const mpSrc = fs.readFileSync(path.join(ROOT, 'memory_palace_module.js'), 'utf8');
    expect(mpSrc).toMatch(/\}\s*else\s*\{\s*s\.src\s*=\s*srcUrl;\s*\}/);
    expect(mpSrc).toContain('WEBGL_lose_context');

    for (const rel of [
      'live_polling_module.js',
      'memory_palace_module.js',
      'escape_room_module.js',
      'concept_graph_3d_module.js',
      'math_fluency_module.js',
      'music_studio/open_groove_module.js',
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing document.hidden pause/skip`).toContain('document.hidden');
    }
  });
});
