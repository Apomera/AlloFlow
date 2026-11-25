import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = path.resolve(__dirname, '..');

const CORE_MODULES = [
  'agent_core_resource_pack_module.js',
  'agent_core_blueprint_service_module.js',
  'instructional_context_module.js',
  'generation_matrix_module.js',
  'allo_device_storage_module.js',
  'allo_provenance_module.js',
  'sensitive_workspace_module.js',
  'learning_web_registry_module.js',
  'pd_core_module.js',
  'fluency_module.js',
  'pyodide_runtime_module.js',
  'question_board_view_module.js'
];

const ALL_DELIVERABLES = [...CORE_MODULES, 'udl_chat_module.js'];

const MIRROR_DIRS = [
  ROOT,
  path.join(ROOT, 'desktop', 'web-app', 'public'),
  path.join(ROOT, 'desktop', 'web-app', 'build'),
  path.join(ROOT, 'desktop', 'app-build')
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadInWindow(filename, extraGlobals = {}) {
  const src = fs.readFileSync(path.join(ROOT, filename), 'utf8');
  const win = {
    AlloModules: {},
    location: { origin: 'https://alloflow.example', hostname: 'alloflow.example' },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    ...extraGlobals.windowProps
  };
  const ctx = vm.createContext({
    window: win,
    self: win,
    globalThis: win,
    console,
    URL,
    TextEncoder,
    TextDecoder,
    Intl,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
    Promise,
    Map,
    Set,
    WeakMap,
    Reflect,
    Symbol,
    Int32Array,
    Uint8Array,
    Float32Array,
    DataView,
    ArrayBuffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    ...extraGlobals.globals
  });
  vm.runInContext(src, ctx, { filename });
  return { win, ctx };
}

describe('Wave 45 Bug Sweep - 12 Core Modules + UdlChat Rebuild', () => {
  it('maintains 4-way byte-for-byte SHA-256 mirror parity across all 13 deliverables', () => {
    for (const rel of ALL_DELIVERABLES) {
      const hashes = MIRROR_DIRS.map((dir) => sha256(path.join(dir, rel)));
      for (let i = 1; i < hashes.length; i++) {
        expect(hashes[i], `${rel} mismatch in ${MIRROR_DIRS[i]}`).toBe(hashes[0]);
      }
    }
  });

  it('survives 5-mode hostile SSR evaluation (60/60) across all 12 core modules', () => {
    const baseGlobals = () => ({
      console, URL, TextEncoder, TextDecoder, Intl, Date, Math, JSON, Object, Array,
      Number, String, Boolean, RegExp, Error, TypeError, RangeError, Promise, Map, Set,
      WeakMap, Reflect, Symbol, Int32Array, Uint8Array, Float32Array, DataView, ArrayBuffer,
      setTimeout, clearTimeout, setInterval, clearInterval, parseInt, parseFloat, isNaN,
      isFinite, encodeURIComponent, decodeURIComponent
    });
    const modes = [
      ['bare', () => baseGlobals()],
      ['window=null', () => ({ ...baseGlobals(), window: null })],
      ['window=42', () => ({ ...baseGlobals(), window: 42 })],
      ['self=null', () => ({ ...baseGlobals(), self: null })],
      ['module=null', () => ({ ...baseGlobals(), module: null, exports: null })]
    ];
    for (const file of CORE_MODULES) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      for (const [modeName, makeEnv] of modes) {
        expect(() => {
          const ctx = vm.createContext(makeEnv());
          vm.runInContext(src, ctx, { filename: file });
        }, `${file} failed in ${modeName}`).not.toThrow();
      }
    }
  });

  it('Batch A: ResourcePack ReDoS/Symbol safety, Blueprint AI gate, InstructionalContext K/Pre-K, GenerationMatrix NaN', async () => {
    // 1. agent_core_resource_pack_module.js
    const { win: rpWin } = loadInWindow('agent_core_resource_pack_module.js');
    const rp = rpWin.AlloModules.AgentCoreResourcePack;
    expect(Object.isFrozen(rp)).toBe(true);
    const t0 = Date.now();
    const evilFence = '```json\n' + ' '.repeat(120000) + '\n```X';
    const generated = await rp.generate(
      { topic: 'Ecosystems', grade: '5', resourceTypes: ['glossary'] },
      { provider: { generate: async () => evilFence } }
    );
    expect(Date.now() - t0).toBeLessThan(500);
    expect(generated.ok).toBe(false);
    expect(() => rp.buildPrompt(null, null)).not.toThrow();

    // 2. agent_core_blueprint_service_module.js
    const { win: bpWin, ctx: bpCtx } = loadInWindow('agent_core_contracts_module.js', {
      windowProps: {
        ALLOFLOW_MANAGED_AI_POLICY: { managedDeployment: true, aiAllowed: true, connections: [] }
      }
    });
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'agent_core_blueprint_service_module.js'), 'utf8'), bpCtx, {
      filename: 'agent_core_blueprint_service_module.js'
    });
    const bp = bpWin.AlloModules.AgentCoreBlueprintService;
    expect(Object.isFrozen(bp)).toBe(true);
    let aiCalled = false;
    const bpSvc = bp.createBlueprintService({
      callGemini: async () => { aiCalled = true; return '{}'; }
    });
    const draftRes = await bpSvc.createDraft({ topic: 'Fractions', grade: '4' });
    expect(aiCalled).toBe(false);
    expect(draftRes).toBeTruthy();
    const frozenArch = bp.createBlueprintArchive({
      getItem: () => JSON.stringify({ v: 'corrupt', plans: [] }),
      setItem: () => { throw new Error('must not overwrite'); }
    });
    expect(frozenArch.isFrozen()).toBe(true);
    expect(() => bp.toLessonTemplate({ title: Symbol('t'), settings: { grade: Symbol('g') } })).not.toThrow();

    // 3. instructional_context_module.js
    const { win: icWin } = loadInWindow('instructional_context_module.js');
    const ic = icWin.AlloModules.InstructionalContext;
    expect(Object.isFrozen(ic)).toBe(true);
    expect(ic.normalizeGrade('Kindergarten').numericGrade).toBe(0);
    expect(ic.normalizeGrade('Pre-K').numericGrade).toBe(-1);
    expect(typeof ic.isWordEdge(null, NaN)).toBe('boolean');

    // 4. generation_matrix_module.js
    const { win: gmWin } = loadInWindow('generation_matrix_module.js');
    const gm = gmWin.AlloModules.GenerationMatrix;
    expect(gm.hasAnalysisFindings({ items: [], score: NaN, coverage: Infinity })).toBe(false);
    expect(() => gm.isCompletedAnalysis({ status: Symbol('done') })).not.toThrow();
    expect(gm.isCompletedAnalysis({ status: Symbol('done') })).toBe(false);
  });

  it('Batch B: DeviceStorage cycle/queue, Provenance Symbol/assistiveTech, SensitiveWorkspace tombstone/clock, Registry freeze/bounds', async () => {
    // 5. allo_device_storage_module.js
    const { win: dsWin } = loadInWindow('allo_device_storage_module.js');
    const ds = dsWin.alloDeviceStorage;
    expect(Object.isFrozen(ds)).toBe(false);
    expect(Object.isFrozen(ds._internal)).toBe(true);
    const cyclic = { id: 's1', workspace: { history: [] } };
    cyclic.workspace.self = cyclic;
    const stripped = ds._internal.stripRecoveryMedia(cyclic);
    expect(stripped.assetPolicy).toBe('text-only');
    const store = ds._internal.normalizeRecoveryStore({ removedSnapshotIds: ['__proto__', 'valid-1'] });
    expect(Object.getPrototypeOf(store.removedSnapshotIds)).toBe(null);
    expect(store.removedSnapshotIds['valid-1']).toBeTruthy();
    expect(store.removedSnapshotIds['__proto__']).toBeUndefined();

    // 6. allo_provenance_module.js
    const { win: pvWin } = loadInWindow('allo_provenance_module.js');
    const pv = pvWin.AlloModules.Provenance;
    expect(Object.isFrozen(pv)).toBe(true);
    expect(Object.isFrozen(pv.PROMPT_LEVELS)).toBe(true);
    expect(pv.stableStringify({ a: 1, b: Symbol('x'), c: () => {} })).toBe('{"a":1}');
    expect(pv.stableStringify([1, Symbol('x'), undefined])).toBe('[1,null,null]');
    expect(() => pv.stableStringify(1n)).toThrow();
    expect(pv.classifySupport(Symbol('s'))).toBe('unattributed');
    expect(pv.bucketDuration(Symbol('d'))).toBe('unknown');

    // 7. sensitive_workspace_module.js
    const { win: swWin } = loadInWindow('sensitive_workspace_module.js');
    const sw = swWin.AlloModules.SensitiveWorkspace;
    expect(Object.isFrozen(sw)).toBe(true);
    expect(Object.isFrozen(sw.FEATURES)).toBe(true);
    const fakeVault = {
      isVaultStore: () => false,
      createRecoveryVaultController: () => ({ lock: () => {} })
    };
    const protoStore = Object.create({ kind: 'alloflow-clinical-deletion-tombstone', version: 1, deletedAt: '2026-01-01T00:00:00.000Z' });
    const svc = sw.createService({
      repository: { read: async () => ({ revision: 1, store: protoStore }), compareAndSwap: async () => false },
      vaultModule: fakeVault,
      now: () => NaN,
      lifecycle: false
    });
    await expect(svc.init()).rejects.toMatchObject({ code: 'PROTECTED_STORE_INVALID' });
    svc.dispose();

    // 8. learning_web_registry_module.js
    const { win: lwWin } = loadInWindow('learning_web_registry_module.js');
    const lw = lwWin.AlloModules.LearningWebRegistry;
    expect(Object.isFrozen(lw)).toBe(true);
    expect(Object.isFrozen(lw.LIMITS)).toBe(true);
    expect(Object.isFrozen(lw.GRAPH_KINDS)).toBe(true);
    expect(() => lw.normalizeEntry({ title: Symbol('t') })).not.toThrow();
    const bigBranches = Array.from({ length: 80 }, (_, bi) => ({
      title: `Branch ${bi}`,
      items: Array.from({ length: 80 }, (__, ii) => `Item ${bi}-${ii}`)
    }));
    const orgGraph = lw.graphFromResource({ type: 'graphic-organizer', data: { main: 'Root', branches: bigBranches } });
    expect(orgGraph.nodes.length).toBeLessThanOrEqual(lw.LIMITS.nodes);
  });

  it('Batch C: PdCore bounds/Symbol, Fluency SSRF/CSV/Int32Array, PyodideRuntime freeze/circular, QuestionBoard LIMITS guard', async () => {
    // 9. pd_core_module.js
    const { win: pdWin } = loadInWindow('pd_core_module.js');
    const pd = pdWin.AlloModules.PdCore;
    expect(pd.validatePdModule({ kind: 'pd_module', schema_version: pd.SCHEMA_VERSION, metadata: [], sections: [] }).ok).toBe(false);
    expect(pd.validatePdModule({
      kind: 'pd_module',
      schema_version: pd.SCHEMA_VERSION,
      metadata: { id: 'm1', title: 'T' },
      sections: [{ title: 'S1', activities: [{ id: 'a1', type: Symbol('bad'), title: 'A', content: {} }] }]
    }).ok).toBe(false);
    expect(pd.buildCompletionRecord(null, null, null, 12345).contentDigest).toBe(null);

    // 10. fluency_module.js
    let fetchCalled = false;
    const { win: flWin } = loadInWindow('fluency_module.js', {
      globals: { fetch: async () => { fetchCalled = true; return { ok: true, json: async () => ({ text: 'x' }) }; } }
    });
    const fl = flWin.AlloModules.Fluency;
    expect(Object.isFrozen(fl)).toBe(true);
    const ssrfRes = await fl.transcribeAudioLocal('AAAA', 'audio/webm', { inferenceUrl: 'https://evil.example/asr' });
    expect(ssrfRes).toBe(null);
    expect(fetchCalled).toBe(false);
    const aligned = fl.alignTranscriptToReference('The cat sat', 'The big cat sat on');
    expect(aligned.wordData.map((w) => w.status)).toEqual(['correct', 'correct', 'correct']);
    expect(aligned.insertions).toEqual(['big', 'on']);
    expect(fl.getBenchmarkComparison(Symbol('x'), '3', Symbol('s'))).toEqual({ level: 'unknown', target: 0 });

    // 11. pyodide_runtime_module.js
    const { win: pyWin } = loadInWindow('pyodide_runtime_module.js', {
      windowProps: { __alloOfflineOnly: true }
    });
    const py = pyWin.AlloModules.PyodideRuntime;
    expect(Object.isFrozen(py)).toBe(true);
    const circ = {};
    circ.self = circ;
    await expect(py.runAudit({ reportSections: circ })).rejects.toThrow(/serialize/i);
    const poemRes = await py.runPoetryCheck({
      form: { id: 'haiku', name: Symbol('h'), lineCount: 3, syllablesPerLine: [5, 7, 5] },
      poemText: 'An old silent pond\nA frog jumps into the pond\nSplash silence again',
      offlineOnly: true
    });
    expect(poemRes.lines.length).toBe(3);

    // 12. question_board_view_module.js
    const { win: qbWin } = loadInWindow('question_board_view_module.js', {
      windowProps: {
        React: { createElement: (type, props, ...children) => ({ type, props, children }) }
      }
    });
    const qb = qbWin.AlloModules.QuestionBoardView;
    expect(Object.isFrozen(qb)).toBe(true);
    expect(qb.STATE_COLORS.pending.border).toBe('#1d4ed8');
    expect(qb.escapeMarkdown(Symbol('x'))).toBe('');
    expect(qb.boardCapacity({ estimateBoardBytes: () => { throw new Error('boom'); } }, { items: [] }).full).toBe(true);
    const el = qb.QuestionBoardStudent({
      contract: { visibleItemsFor: () => [], isExpired: () => false },
      board: { config: { prompt: 'Why?', itemsPerStudent: 2 }, items: [] },
      actor: { role: 'student', uid: 'u1' },
      draft: Symbol('d')
    });
    expect(el).toBeTruthy();
  });
});
