// Blueprint <-> standards-audit connection.
//
// The alignment-report is post-hoc: it audits whatever it can find. Left to
// itself, selectCurriculumArtifacts GUESSES its scope — by curriculumId, else a
// "latest analysis anchor" heuristic, else every eligible item in history, and
// it emits a warning saying so (generate_dispatcher_source.jsx:493-522).
//
// But a blueprint run knows exactly what it produced. Handing that list over as
// `artifactIds` flips the audit from selectionMode 'latest analysis anchor' /
// 'current eligible history' to 'explicit artifact IDs' — and the scope it
// records (content.comprehensive.auditScope, dispatcher:3985) then becomes the
// basis for per-row staleness: a row regenerated after the audit gets a NEW
// artifact ID(s) and drops out of the audited set on its own.

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let PhaseO;
let selectScope;

beforeAll(() => {
  // Blueprint execution intentionally hard-gates on the shared matrix. Tests
  // exercise the production contract, so register it before invoking Phase O.
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule('phase_o_misc_handlers_module.js');
  PhaseO = window.AlloModules?.PhaseOHandlers;
  if (!PhaseO?.executeOneBlueprint) throw new Error('PhaseOHandlers failed to register');
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  selectScope = window.AlloModules?.GenDispatcher?.selectCurriculumArtifacts;
});

// An audit row placed last, as the contract's ordering invariant guarantees
// (analysis first, lesson-plan last — the audit sits among the rest).
const PLAN = {
  resourcePlan: [
    { tool: 'analysis', directive: 'a', uiId: 'row-analysis' },
    { tool: 'glossary', directive: 'g', uiId: 'row-glossary' },
    { tool: 'quiz', directive: 'q', uiId: 'row-quiz' },
    { tool: 'alignment-report', directive: '', uiId: 'row-audit' },
  ],
};

const MULTI_VARIANT_PLAN = {
  resourcePlan: [
    {
      tool: 'quiz', directive: 'q', uiId: 'row-quiz', generationAction: 'variant',
      generationVariants: [
        { type: 'quiz', action: 'variant', variantKey: 'quiz-en', grade: '5th Grade', language: 'English' },
        { type: 'quiz', action: 'variant', variantKey: 'quiz-es', grade: '5th Grade', language: 'Spanish' },
      ],
    },
    { tool: 'alignment-report', directive: '', uiId: 'row-audit' },
  ],
};

const runPlan = async (opts = {}) => {
  const configs = [];
  const callsByType = {};
  const handleGenerate = vi.fn(async (type, language, _k, _t, cfg) => {
    callsByType[type] = (callsByType[type] || 0) + 1;
    const callIndex = callsByType[type];
    configs.push({ type, language, cfg });
    if (opts.failType === type) return null;
    if (typeof opts.failWhen === 'function' && opts.failWhen({ type, language, cfg, callIndex })) return null;
    const suffix = callIndex > 1 ? '-' + callIndex : '';
    return { id: 'res-' + type + suffix, type, data: {} };
  });
  const steps = [];
  const res = await PhaseO.executeOneBlueprint(opts.plan || PLAN, {
    handleGenerate, historyOverride: [], onStep: (s) => steps.push(s),
  });
  return { configs, steps, res };
};

describe('a blueprint run scopes its own audit', () => {
  it('hands the audit exactly the resources this plan produced', async () => {
    const { configs } = await runPlan();
    const auditCall = configs.find((c) => c.type === 'alignment-report');
    expect(auditCall).toBeTruthy();
    expect(auditCall.cfg.artifactIds).toEqual(['res-analysis', 'res-glossary', 'res-quiz']);
  });

  it('does not send artifactIds to any other tool', async () => {
    const { configs } = await runPlan();
    for (const c of configs.filter((x) => x.type !== 'alignment-report')) {
      expect(c.cfg.artifactIds, c.type).toBeUndefined();
    }
  });

  it('excludes a row that failed to generate from the audit scope', async () => {
    const { configs } = await runPlan({ failType: 'glossary' });
    const auditCall = configs.find((c) => c.type === 'alignment-report');
    // The glossary never landed, so it is not in scope — the audit reports on
    // what exists, not on what was intended.
    expect(auditCall.cfg.artifactIds).toEqual(['res-analysis', 'res-quiz']);
  });

  it('carries the audit scope out on the step so the run record can keep it', async () => {
    const { steps } = await runPlan();
    const auditLanded = steps.find((s) => s.uiId === 'row-audit' && s.status === 'landed');
    expect(auditLanded.auditScopeIds).toEqual(['res-analysis', 'res-glossary', 'res-quiz']);
    // No other step carries a scope.
    expect(steps.filter((s) => s.auditScopeIds !== undefined)).toHaveLength(1);
  });

  it('carries no scope when the audit itself failed', async () => {
    const { steps } = await runPlan({ failType: 'alignment-report' });
    const auditStep = steps.find((s) => s.uiId === 'row-audit' && s.status === 'failed');
    expect(auditStep.auditScopeIds).toBeUndefined();
  });

  it('scopes the audit to every artifact landed by a multi-variant row', async () => {
    const { configs, steps } = await runPlan({ plan: MULTI_VARIANT_PLAN });
    const quizStep = steps.find((s) => s.uiId === 'row-quiz' && s.status === 'landed');
    expect(quizStep.resourceIds).toEqual(['res-quiz', 'res-quiz-2']);
    expect(quizStep.variantResults.map((variant) => variant.status)).toEqual(['landed', 'landed']);

    const auditCall = configs.find((c) => c.type === 'alignment-report');
    expect(auditCall.cfg.artifactIds).toEqual(['res-quiz', 'res-quiz-2']);
  });

  it("keeps a partial row's landed artifacts in scope and excludes its failed cells", async () => {
    const { configs, steps } = await runPlan({
      plan: MULTI_VARIANT_PLAN,
      failWhen: ({ type, language }) => type === 'quiz' && language === 'Spanish',
    });
    const quizStep = steps.find((s) => s.uiId === 'row-quiz' && s.status === 'partial');
    expect(quizStep.resourceIds).toEqual(['res-quiz']);
    expect(quizStep.successfulVariantCount).toBe(1);
    expect(quizStep.failedVariantCount).toBe(1);

    const auditCall = configs.find((c) => c.type === 'alignment-report');
    expect(auditCall.cfg.artifactIds).toEqual(['res-quiz']);
  });
});

// The receiving end: prove the dispatcher actually honours the handoff.
describe('the audit honours an explicit scope', () => {
  const HISTORY = [
    { id: 'res-analysis', type: 'analysis', title: 'A' },
    { id: 'res-glossary', type: 'glossary', title: 'G' },
    { id: 'res-quiz', type: 'quiz', title: 'Q' },
    { id: 'stray-old-thing', type: 'simplified', title: 'From another lesson' },
  ];

  it('is exported, so the two checks below are not vacuous', () => {
    expect(typeof selectScope).toBe('function');
  });

  it('switches from a guessed scope to an explicit one', () => {
    const guessed = selectScope(HISTORY, {});
    const explicit = selectScope(HISTORY, { artifactIds: ['res-analysis', 'res-glossary', 'res-quiz'] });
    expect(explicit.metadata.selectionMode).toBe('explicit artifact IDs');
    expect(explicit.metadata.selectionMode).not.toBe(guessed.metadata.selectionMode);
  });

  it('keeps an unrelated resource out of the report', () => {
    const explicit = selectScope(HISTORY, { artifactIds: ['res-analysis', 'res-glossary', 'res-quiz'] });
    expect(explicit.metadata.includedArtifactIds).not.toContain('stray-old-thing');
    expect(explicit.metadata.excludedArtifactCount).toBeGreaterThan(0);
  });
});

// ── Wiring guardrails ──
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
const PHASE_O = ['phase_o_misc_handlers_source.jsx', 'phase_o_misc_handlers_module.js',
                 'desktop/web-app/public/phase_o_misc_handlers_module.js'];
const CARD = ['persona_ui_source.jsx', 'persona_ui_module.js',
              'desktop/web-app/public/persona_ui_module.js'];

describe('audit-connection wiring guardrails', () => {
  it.each(PHASE_O)('%s scopes the audit to the run', (file) => {
    const src = read(file);
    expect(src).toContain("type === 'alignment-report'");
    expect(src).toContain('stepConfig.artifactIds = auditScopeIds');
    // The scope must reach the run record, or staleness is uncomputable.
    expect(src).toContain('auditScopeIds');
    expect(src).toMatch(/audit = \{|next\.audit/);
  });

  it.each(CARD)('%s marks audit coverage per row', (file) => {
    const src = read(file);
    expect(src).toContain('bp-audit-badge');
    // Coverage is by resourceId — that is what makes a regenerated row drop out.
    expect(src).toContain('const _claimedArtifactIds');
    expect(src).toContain('Array.isArray(_rowRun.resourceIds)');
    expect(src).toMatch(/_rowRun\.resourceId\s*\?\s*\[_rowRun\.resourceId\]\s*:\s*\[\]/);
    expect(src).toMatch(/_status !== 'landed'\s*&&\s*_status !== 'partial'/);
    expect(src).toContain('const _survivingArtifactIds');
    expect(src).toContain('const _allSurvivingArtifactsAudited');
    expect(src).toMatch(/_survivingArtifactIds\.every\([\s\S]*?_auditIds\.indexOf\(value\)/);
  });

  it('the dispatcher still reads the explicit-scope key we send', () => {
    const src = read('generate_dispatcher_source.jsx');
    expect(src).toContain('config.artifactIds || config.auditArtifactIds');
    expect(src).toContain("selectionMode = 'explicit artifact IDs'");
    // And still records what it audited, which the staleness story depends on.
    expect(src).toContain('content.comprehensive.auditScope = auditScopeSelection.metadata');
  });
});

// ── Guided-flow audit scoping + eviction reconciliation ──
describe('the step-by-step flow scopes its own audit', () => {
  const read2 = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
  const CHAT = ['udl_chat_source.jsx', 'udl_chat_module.js', 'desktop/web-app/public/udl_chat_module.js'];

  it.each(CHAT)('%s tracks what the session generated', (file) => {
    const src = read2(file);
    expect(src).toContain('const _genTracked');
    expect(src).toContain('generatedIds');
    // Every guided-flow generation goes through the tracker, or the audit
    // scope would silently under-report what the lesson contains.
    expect((src.match(/await _genTracked\(/g) || []).length).toBeGreaterThanOrEqual(12);
  });

  it.each(CHAT)('%s hands that list to the audit', (file) => {
    const src = read2(file);
    expect(src).toMatch(/artifactIds: _auditIds/);
    // The bare call was the bug: it left the dispatcher guessing.
    expect(src).not.toContain("await handleGenerate('alignment-report');");
  });

  it.each(CHAT)('%s still falls back when the list is empty', (file) => {
    const src = read2(file);
    // A resumed flow has no ids; the dispatcher heuristic is the honest default.
    expect(src).toMatch(/_auditIds\.length \? \{ artifactIds: _auditIds \} : \{\}/);
  });
});

describe('run record is reconciled against history', () => {
  const read2 = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
  const HOSTS2 = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

  it.each(HOSTS2)('%s marks rows whose resource was evicted', (file) => {
    const src = read2(file);
    expect(src).toContain('resourceMissing');
    // Must wait for history to load — at mount it is empty and everything
    // would look evicted.
    expect(src).toContain('if (!isHistoryLoaded) return;');
  });

  it.each(HOSTS2)('%s files every artifact landed by landed and partial rows', (file) => {
    const src = read2(file);
    expect(src).toContain(".filter(r => r && ['landed', 'partial'].includes(r.status))");
    expect(src).toContain('.flatMap(r => Array.isArray(r.resourceIds) && r.resourceIds.length ? r.resourceIds : [r.resourceId])');
  });

  it.each(HOSTS2)('%s reconciles all claimed artifacts and distinguishes partial loss', (file) => {
    const src = read2(file);
    expect(src).toContain('const claimed = r && Array.isArray(r.resourceIds) && r.resourceIds.length');
    expect(src).toContain('? r.resourceIds.filter(Boolean)');
    expect(src).toContain(': (r && r.resourceId ? [r.resourceId] : [])');
    expect(src).toContain('const missingResourceIds = claimed.filter(id => !live.has(id));');
    expect(src).toContain('const missing = claimed.length > 0 && missingResourceIds.length === claimed.length;');
    expect(src).toContain('const partiallyMissing = missingResourceIds.length > 0 && !missing;');
    expect(src).toContain('resourcePartiallyMissing: partiallyMissing');
    expect(src).toContain('missingResourceIds });');
  });
});
