import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve('.');

const CORE_MODULES = [
  'standards_provider_module.js',
  'own_sources_module.js',
  'audit_remediator_module.js',
  'remediation_review_helpers.js',
  'psychometric_probes.js',
  'agent_core_contracts_module.js',
  'agent_core_pack_media_module.js',
  'agent_core_pack_native_module.js',
  'studio_response_module.js',
  'allo_vr_module.js',
  'lexical_graph_module.js',
  'concept_quest_engine.js',
  'concept_quest_solo_engine.js',
  'packet_check_builder.js',
  'packet_math_practice_builder.js'
];

const REBUILT_BUNDLES = [
  'doc_pipeline_module.js',
  'view_pdf_audit_module.js',
  'udl_chat_module.js',
  'concept_quest_solo_module.js'
];

const ALL_DELIVERABLES = [...CORE_MODULES, ...REBUILT_BUNDLES];

const MIRROR_DIRS = [
  '.',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build'
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadInWindow(relPath, extraGlobals = {}) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = { AlloModules: {}, ...extraGlobals.window };
  const ctx = vm.createContext({
    window: win,
    self: win,
    globalThis: win,
    console: { log() {}, warn() {}, error() {} },
    URL,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    ...extraGlobals
  });
  ctx.window = win;
  ctx.self = win;
  new vm.Script(src, { filename: relPath }).runInContext(ctx, { timeout: 3000 });
  return { win, ctx };
}

describe('Wave 44 Bug Sweep (15 core modules + 4 rebuilt bundles)', () => {
  it('maintains byte-identical 4-way SHA-256 mirror parity across all 19 deliverables', () => {
    for (const file of ALL_DELIVERABLES) {
      const rootHash = sha256(path.join(ROOT, file));
      for (const dir of MIRROR_DIRS.slice(1)) {
        const dest = path.join(ROOT, dir, file);
        expect(fs.existsSync(dest), `missing mirror ${dir}/${file}`).toBe(true);
        expect(sha256(dest), `mirror drift in ${dir}/${file}`).toBe(rootHash);
      }
    }
  });

  it('boots cleanly in 5 hostile-global SSR modes across all 15 core modules + view_pdf_audit_module.js (80/80)', () => {
    const ssrTargets = [...CORE_MODULES, 'view_pdf_audit_module.js'];
    const modes = [
      ['bare', () => ({ console, URL, TextEncoder, TextDecoder, setTimeout, clearTimeout })],
      ['window=null', () => ({ window: null, console, URL, TextEncoder, TextDecoder, setTimeout, clearTimeout })],
      ['window=42', () => ({ window: 42, console, URL, TextEncoder, TextDecoder, setTimeout, clearTimeout })],
      ['self=null', () => ({ self: null, console, URL, TextEncoder, TextDecoder, setTimeout, clearTimeout })],
      ['module=null', () => ({ module: null, exports: null, console, URL, TextEncoder, TextDecoder, setTimeout, clearTimeout })]
    ];
    for (const file of ssrTargets) {
      const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const script = new vm.Script(src, { filename: file });
      for (const [modeName, makeCtx] of modes) {
        expect(() => script.runInContext(vm.createContext(makeCtx()), { timeout: 3000 }), `${file} failed in ${modeName}`).not.toThrow();
      }
    }
  });

  it('Batch A: hardens standards_provider, own_sources, audit_remediator, remediation_review_helpers, psychometric_probes', () => {
    const sp = require(path.join(ROOT, 'standards_provider_module.js'));
    expect(Object.isFrozen(sp)).toBe(true);
    expect(sp.validateSnapshot(null).ok).toBe(false);

    const { win: ownWin } = loadInWindow('own_sources_module.js');
    expect(Object.isFrozen(ownWin.AlloModules.OwnSources)).toBe(true);
    expect(Object.isFrozen(ownWin.AlloResearchEvidence)).toBe(true);
    expect(() => ownWin.AlloResearchEvidence.remember(42)).not.toThrow();

    const { win: arWin } = loadInWindow('audit_remediator_module.js', { window: { React: { createElement() {} } } });
    const ar = arWin.AlloModules.AuditRemediator;
    expect(Object.isFrozen(ar._internals)).toBe(true);
    expect(ar._internals._arAiUsable({ allowAI: false })).toBe(false);
    expect(ar._internals.parseEngagementGap(null)).toBeNull();
    expect(() => ar._internals.actionId('quiz', Symbol('t'))).not.toThrow();

    const { win: rrWin } = loadInWindow('remediation_review_helpers.js');
    expect(Object.isFrozen(rrWin.AlloModules.RemediationDecisionGuides)).toBe(true);
    expect(Object.isFrozen(rrWin.AlloModules.RemediationReview.reasons)).toBe(true);

    const probes = require(path.join(ROOT, 'psychometric_probes.js'));
    expect(Object.isFrozen(probes.BENCHMARK_PROBE_BANKS)).toBe(true);
    expect(Object.isFrozen(probes.ORF_SCREENING_PASSAGES)).toBe(true);
  });

  it('Batch B: hardens agent_core_contracts, pack_media, pack_native, studio_response, allo_vr', () => {
    const contracts = require(path.join(ROOT, 'agent_core_contracts_module.js'));
    expect(Object.isFrozen(contracts)).toBe(true);
    // Cyclic artifact emits BOTH cyclic-payload and unserializable-data
    const cyc = { a: 1 };
    cyc.self = cyc;
    const cycRes = contracts.validateArtifact({ schemaVersion: '1.0', artifactId: 'a1', type: 'quiz', data: cyc });
    expect(cycRes.ok).toBe(false);
    const cycCodes = cycRes.errors.map(e => e.code);
    expect(cycCodes).toContain('cyclic-payload');
    expect(cycCodes).toContain('unserializable-data');
    // Symbol safety in normalizePlanItems & validateCapabilityManifest
    expect(() => contracts.normalizePlanItems([{ tool: 'quiz', uiId: Symbol('id'), directive: Object.create(null) }])).not.toThrow();
    expect(() => contracts.validateCapabilityManifest({ schemaVersion: Symbol('v'), deploymentMode: 'canvas' })).not.toThrow();
    // Oversized DAG does not OOM JSON.stringify
    let dag = { leaf: 'x'.repeat(200) };
    for (let i = 0; i < 16; i++) dag = { a: dag, b: dag };
    const dagRes = contracts.validateArtifact({ schemaVersion: '1.0', artifactId: 'dag1', type: 'quiz', data: dag });
    expect(dagRes.ok).toBe(false);
    expect(dagRes.errors.some(e => e.code === 'payload-too-deep' || e.code === 'payload-too-large')).toBe(true);

    const packMedia = require(path.join(ROOT, 'agent_core_pack_media_module.js'));
    expect(Object.isFrozen(packMedia)).toBe(true);
    const hugePrefix = 'x'.repeat(500) + ',AAAA';
    expect(packMedia.inspectDataImage(hugePrefix).ok).toBe(false);

    const packNative = require(path.join(ROOT, 'agent_core_pack_native_module.js'));
    expect(Object.isFrozen(packNative)).toBe(true);
    const natErrs = [];
    packNative.validateResource({
      type: 'dbq',
      data: {
        title: 'T', historicalContext: 'C', synthesisPrompt: 'P',
        documents: [{ id: 'A', title: 'D', source: 'S', excerpt: 'E', excerptKind: 'verbatim', sourceUrl: '/\\evil.test/x' }]
      }
    }, 'pack', natErrs, []);
    expect(natErrs.some(e => e.code === 'unsafe-url')).toBe(true);
    expect(() => packNative.validateMathData({ problem: '1+1', answer: 2 }, Symbol('p'), [], [])).not.toThrow();

    const { win: srWin } = loadInWindow('studio_response_module.js');
    const sr = srWin.AlloModules.StudioResponse;
    expect(Object.isFrozen(sr)).toBe(true);
    expect(sr.toResponseEntries({ id: 'r1', type: 'toString', data: {} }, {})).toEqual({});
    expect(() => sr.responseFromData('anchor-chart', null)).not.toThrow();
    const secs = sr.anchorSections({ sections: [{ id: 0, bullets: ['b'], bulletIds: [Symbol('b')] }, null] });
    expect(secs.length).toBe(1);
    expect(secs[0].id).toBe('0');

    const { win: vrWin } = loadInWindow('allo_vr_module.js');
    const vr = vrWin.AlloModules.AlloVR;
    expect(Object.isFrozen(vr)).toBe(true);
    const fallbackHandle = vr.enable({});
    expect(Object.isFrozen(fallbackHandle)).toBe(true);
    expect(fallbackHandle.isPresenting()).toBe(false);
  });

  it('Batch C: hardens lexical_graph, concept_quest_engine, concept_quest_solo_engine, packet_check_builder, packet_math_practice_builder', () => {
    const lg = require(path.join(ROOT, 'lexical_graph_module.js'));
    const provider = lg.createLocalProvider(lg.PILOT_SNAPSHOT);
    expect(() => provider.getNeighborhood('transport', { depth: true })).toThrow(RangeError);
    expect(() => provider.getNeighborhood('transport', { depth: '   ' })).toThrow(RangeError);
    expect(() => provider.getNeighborhood('transport', { maxNodes: [5] })).toThrow(RangeError);
    expect(() => provider.resolveLexeme(Symbol('q'))).not.toThrow();

    const cq = require(path.join(ROOT, 'concept_quest_engine.js'));
    expect(Object.isFrozen(cq.ABILITIES)).toBe(true);
    expect(Object.isFrozen(cq.ROLES)).toBe(true);
    expect(Object.isFrozen(cq.SUPPORTS)).toBe(true);
    expect(cq.useItem(null, 0).error).toBeTruthy();
    expect(cq.adjustEncounter(null, 'heal', 1).error).toBeTruthy();
    expect(cq.undoLastGmChange(null).error).toBeTruthy();
    expect(cq.dismissEvent(null)).toBeNull();

    const cqs = require(path.join(ROOT, 'concept_quest_solo_engine.js'));
    expect(Object.isFrozen(cqs)).toBe(true);
    expect(Object.isFrozen(cqs.TYPES)).toBe(true);
    expect(cqs.parseNumeric('1/0')).toBeNull();
    expect(cqs.parseNumeric('1e500/1')).toBeNull();
    const msEmpty = cqs.grade({ type: 'multi-select', options: ['a', 'b'], correctIndices: [] }, { selectedIndices: [0] });
    expect(msEmpty.complete).toBe(false);
    expect(Number.isNaN(msEmpty.score)).toBe(false);
    expect(() => cqs.answerGuide({ type: 'mcq', options: ['A'], correctIndex: 0 })).not.toThrow();
    expect(() => cqs.initialResponse(null)).not.toThrow();

    const pcb = require(path.join(ROOT, 'packet_check_builder.js'));
    expect(Object.isFrozen(pcb)).toBe(true);
    expect(Object.isFrozen(pcb.MEASURES)).toBe(true);
    expect(() => pcb.lessonFromMathProblems({ problems: [{ a: '   ', b: 2, op: '+' }] })).toThrow();
    expect(() => pcb.lessonFromMathProblems({ problems: [{ a: [1], b: 2, op: '+' }] })).toThrow();
    expect(() => pcb.lessonFromMathProblems({ problems: [{ display: '('.repeat(18) + '1' + ')'.repeat(18), answer: 1 }] })).not.toThrow();
    expect(() => pcb.lessonFromMathProblems({ problems: [{ display: '('.repeat(100) + '1' + ')'.repeat(100), answer: 1 }] })).toThrow(/longer than 40/i);
    expect(() => pcb.parseProblems('1+1,'.repeat(20000))).toThrow(/too long/i);
    expect(pcb.readyTimeLine(null, NaN)).toBe('');

    const pmp = require(path.join(ROOT, 'packet_math_practice_builder.js'));
    expect(Object.isFrozen(pmp)).toBe(true);
    expect(Object.isFrozen(pmp.METHODS)).toBe(true);
    expect(Array.isArray(pmp.FAMILIES)).toBe(true);
    expect(() => pmp.checkFact({ a: '  ', b: 2, op: '+' }, 1)).toThrow();
    expect(() => pmp.checkFact({ a: [2], b: 2, op: '+' }, 1)).toThrow();
    expect(Number.isNaN(pmp.answerOf({ a: 5, b: 0, op: 'div' }))).toBe(true);
    expect(pmp.related({ a: 7, b: 2, op: 'div' })).toBeNull();
    expect(pmp.related({ a: 14, b: 2, op: 'div' })).toEqual({ a: 14, b: 7, op: 'div' });
  });
});
