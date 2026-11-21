import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

describe('Round 8 Wave 31 — Agent Core, Verification Policy & Question Board Hardening (9 modules)', () => {
  afterEach(() => {
    delete window.__alloStudentAiDisabled;
    delete window.__alloQrStudentMode;
    delete window.__alloAiSecretsLocked;
    delete window.ALLOFLOW_MANAGED_AI_POLICY;
    delete window.__alloAiUsable;
    if (window.AlloModules) delete window.AlloModules.AccessibilityEvidence;
  });

  it('1. agent_core_contracts_module.js: adds memory-aid/applied-challenge, rejects authorization/cookie secrets, enforces https?:// safeUrl, clones blueprint outputs', () => {
    const C = require(path.join(ROOT, 'agent_core_contracts_module.js'));
    expect(C.FALLBACK_TOOL_IDS).toContain('memory-aid');
    expect(C.FALLBACK_TOOL_IDS).toContain('applied-challenge');

    const secretReport = C.validateBlueprint({
      schemaVersion: '1.0',
      blueprintId: 'bp-sec',
      plan: [{ tool: 'quiz' }],
      configs: { authorization: 'Bearer leaked', cookie: 'sid=1' },
      review: { state: 'draft' },
      provenance: {}
    });
    expect(secretReport.ok).toBe(false);
    expect(secretReport.errors.some((e) => e.code === 'secret-like-field')).toBe(true);

    const urlInput = {
      schemaVersion: '1.0',
      blueprintId: 'bp-url',
      audience: { gradeLevel: '5th' },
      standardsContext: {
        version: 'standards-context/v1',
        inputText: 'RL.5.1',
        provenance: { sourceUrls: ['https://example.org/doc', 'ftp://bad.example/file', 'javascript:alert(1)', 'https://ok.test/\npath'] }
      },
      plan: [{ tool: 'quiz' }],
      review: { state: 'draft', reviewer: 'Ed\u0007Admin' },
      provenance: {}
    };
    const res = C.validateBlueprint(urlInput);
    expect(res.ok).toBe(true);
    expect(res.value.standardsContext.provenance.sourceUrls).toEqual(['https://example.org/doc', 'https://ok.test/path']);
    expect(res.value.review.reviewer).toBe('EdAdmin');
    urlInput.audience.gradeLevel = 'MUTATED';
    expect(res.value.audience.gradeLevel).toBe('5th');
  });

  it('2. agent_core_blueprint_service_module.js: preserves adapted policy on simultaneous standards+tool revision, freezes corrupt library/archive, strips reviewer control chars', () => {
    const C = require(path.join(ROOT, 'agent_core_contracts_module.js'));
    const S = require(path.join(ROOT, 'agent_core_blueprint_service_module.js'));
    const svc = S.createBlueprintService({ contracts: C });
    const draft = C.fromLegacyConfig({ resourcePlan: [{ tool: 'analysis' }, { tool: 'simplified' }], globalSettings: { gradeLevel: '6th' } }, { standards: 'RL.6.1' });
    const validated = svc.validate(draft).value;

    const revised = svc.revise(validated, { removeTools: ['simplified'], standards: 'RL.6.2' });
    expect(revised.ok).toBe(true);
    expect(revised.value.instructionalContext.adaptedTextPolicy).toBe('omit');
    expect(revised.value.standards).toBe('RL.6.2');

    // Corrupt JSON must freeze instead of overwriting stored data
    const mem = new Map([[S.LESSON_TEMPLATE_LIBRARY_KEY, '{corrupt-json'], [S.BLUEPRINT_ARCHIVE_KEY, '{corrupt-json']]);
    const store = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v))
    };
    const lib = S.createLessonTemplateLibrary(store);
    expect(lib.list()).toEqual([]);
    expect(lib.isFrozen()).toBe(true);
    expect(lib.save({ id: 't1', name: 'New' })).toBeNull();
    expect(mem.get(S.LESSON_TEMPLATE_LIBRARY_KEY)).toBe('{corrupt-json');

    const arc = S.createBlueprintArchive(store);
    expect(arc.list()).toEqual([]);
    expect(arc.isFrozen()).toBe(true);
    expect(arc.add({ id: 'a1' })).toBe(false);
    expect(mem.get(S.BLUEPRINT_ARCHIVE_KEY)).toBe('{corrupt-json');
  });

  it('3. agent_core_media_planner_module.js: rejects camelCase secrets/proto keys/cycles, deduplicates glossary requestIds, strips leading punctuation in slug', () => {
    const Planner = require(path.join(ROOT, 'agent_core_media_planner_module.js'));
    const MediaContracts = require(path.join(ROOT, 'agent_core_media_contracts_module.js'));

    const batch = Planner.createGlossaryMediaBatch({
      planId: '---Plan One',
      entries: [
        { id: '...same', term: 'Cell', definition: 'Basic unit' },
        { id: '...same', term: 'Cell 2', definition: 'Second unit' }
      ]
    });
    expect(batch.planId).toMatch(/^[A-Za-z0-9]/);
    expect(batch.requests[0].requestId).not.toBe(batch.requests[1].requestId);

    const cyclic = { schemaVersion: '1.0', planId: 'p1', requests: [], batchPolicy: { maxCostUsd: 1, maxOperations: 1 } };
    cyclic.self = cyclic;
    const cycRes = Planner.validateBatch(cyclic, MediaContracts);
    expect(cycRes.ok).toBe(false);
    expect(cycRes.errors.some((e) => e.code === 'cyclic-payload')).toBe(true);

    const secretBatch = { schemaVersion: '1.0', planId: 'p1', privateKey: 'abc', requests: [], batchPolicy: { maxCostUsd: 1, maxOperations: 1 } };
    const secRes = Planner.validateBatch(secretBatch, MediaContracts);
    expect(secRes.ok).toBe(false);
    expect(secRes.errors.some((e) => e.code === 'secret-like-field')).toBe(true);
  });

  it('4. agent_core_openai_media_runtime_module.js: enforces browser AI policy, snapshots createAltText at construction, passes validated plan.request to execute', async () => {
    const Runtime = require(path.join(ROOT, 'agent_core_openai_media_runtime_module.js'));
    let executedWith = null;
    const fakeAdapterModule = {
      createOpenAIMediaAdapter() {
        return {
          providerId: 'openai',
          model: 'gpt-image-1',
          prepare(req) {
            return {
              ready: true,
              request: { requestId: 'validated-req', accessibility: { altTextRequired: true } },
              estimate: { upperBoundUsd: 0.04 },
              provider: 'openai'
            };
          },
          async execute(req) {
            executedWith = req;
            return { schemaVersion: '1.0', requestId: req.requestId, status: 'completed', asset: {}, provider: 'openai', usage: {} };
          }
        };
      }
    };

    const opts = { createAltText: () => 'alt' };
    const guarded = Runtime.createGuardedOpenAIMediaAdapter(opts, fakeAdapterModule);
    // TOCTOU: deleting opts.createAltText after construction cannot flip preflight
    delete opts.createAltText;
    expect(guarded.prepare({ requestId: 'raw' }).ready).toBe(true);

    const mutableReq = { requestId: 'raw', accessibility: { altTextRequired: true } };
    const res = await guarded.execute(mutableReq);
    expect(executedWith).not.toBe(mutableReq);
    expect(executedWith.requestId).toBe('raw');
    expect(res.requestId).toBe('raw');

    // Browser AI policy gate blocks prepare/execute
    window.__alloQrStudentMode = { active: true };
    const blocked = guarded.prepare({ requestId: 'raw' });
    expect(blocked.ready).toBe(false);
    expect(blocked.code).toBe('ai-disabled-in-session');
    await expect(guarded.execute({ requestId: 'raw' })).rejects.toThrow(/preflight/i);
  });

  it('5. agent_core_ui_adapter_module.js: does not inject empty arrays for omitted context fields and blocks object __alloQrStudentMode', async () => {
    const UI = require(path.join(ROOT, 'agent_core_ui_adapter_module.js'));
    const norm = UI.normalizeContext({ gradeLevel: '4th' });
    expect(norm.selectedLanguages).toBeUndefined();
    expect(norm.differentiationTypes).toBeUndefined();
    expect(norm.targetStandards).toBeUndefined();

    window.__alloQrStudentMode = { active: true };
    const adapter = UI.createUIAdapter({ autoConfigure: async () => ({}) });
    await expect(adapter.createDraft({ topic: 'Plants' })).rejects.toThrow(/AI generation is disabled/i);
  });

  it('6. question_board_contract_module.js: enforces EXPIRY_IS_READ_ONLY on host mutations, checks incoming item bytes, honors teacher_review in reference adapter', () => {
    const C = require(path.join(ROOT, 'question_board_contract_module.js'));
    const host = { uid: 'T1', role: 'host', displayName: 'Teacher' };
    const student = { uid: 'S1', role: 'participant', displayName: 'Ada' };
    const expiredCfg = C.normalizeBoardConfig({
      activityId: 'AC-0123abcd-0123-4567-89ab-0123456789ab',
      type: 'question_board',
      prompt: 'Past unit?',
      expiresAt: new Date(Date.now() - 60000).toISOString()
    });
    expect(C.authorize(host, 'setStatus', { config: expiredCfg, items: [] }).invariant).toBe('EXPIRY_IS_READ_ONLY');

    const reviewCfg = C.normalizeBoardConfig({
      activityId: 'AC-0123abcd-0123-4567-89ab-0123456789ab',
      type: 'question_board',
      prompt: 'Moderated?',
      revealPolicy: 'teacher_review'
    });
    const ref = C.createReferenceAdapter();
    const b = ref.createBoard(reviewCfg);
    const added = ref.addItem(b, student, { text: 'Wait for teacher' });
    expect(added.ok).toBe(true);
    expect(ref.snapshot(b).items[0].status).toBe('held');
    expect(ref.setStatus(b, host, added.id, 'hidden').ok).toBe(true);
    expect(ref.snapshot(b).items[0].status).toBe('hidden');
  });

  it('7. question_board_transport_module.js: retries resolved denied response, enforces https/loopback URLs, sane summary defaults, preserves resourceId', async () => {
    const T = require(path.join(ROOT, 'question_board_transport_module.js'));
    expect(() => T.createMailboxTransport({ call: async () => ({}), url: 'http://evil.example/exec' })).toThrow(/unsafe URL/i);
    expect(() => T.createMailboxTransport({ call: async () => ({}), url: '' })).toThrow(/unsafe URL/i);
    expect(() => T.createMailboxTransport({ call: async () => ({}), url: 'http://127.0.0.1:8080/exec' })).not.toThrow();

    const board = T.boardFromSummary({
      ok: true,
      activityId: 'AC-1',
      prompt: 'Test?',
      items: [{ id: 'Q1', uid: 'U1', text: 'Hi', status: 'approved', answered: { at: 10, note: 'Yes', resourceId: 'res-42' } }]
    });
    expect(board.config.itemsPerStudent).toBe(5);
    expect(board.config.boardCap).toBe(400);
    expect(board.items[0].answered.resourceId).toBe('res-42');

    let joinCount = 0;
    let loadCalls = 0;
    const tr = T.createMailboxTransport({
      url: 'https://script.google.com/macros/s/test/exec',
      packId: 'PK-1',
      activityId: 'AC-1',
      packSecret: 'sec',
      isTeacher: false,
      call: async (_u, p) => {
        if (p.a === 'joinactivity') {
          joinCount++;
          return { ok: true, uid: 'U-' + joinCount, pt: 'tok-' + joinCount };
        }
        loadCalls++;
        if (loadCalls === 1) return { ok: false, e: 'denied' };
        return { ok: true, activityId: 'AC-1', prompt: 'Recovered', items: [] };
      }
    });
    const res = await tr.load();
    expect(res.ok).toBe(true);
    expect(joinCount).toBe(2);
    expect(res.board.config.prompt).toBe('Recovered');
  });

  it('8. question_board_view_module.js: respects participantCount for floorPending, separates hidden from needsReview, validates itemsPerStudent > 10 & empty, AA border/labels', () => {
    const C = require(path.join(ROOT, 'question_board_contract_module.js'));
    const V = require(path.join(ROOT, 'question_board_view_module.js'));
    const cfg = C.normalizeBoardConfig({
      activityId: 'AC-0123abcd-0123-4567-89ab-0123456789ab',
      type: 'question_board',
      prompt: 'Why?',
      minParticipants: 3,
      itemsPerStudent: 2,
      boardCap: 50
    });
    const serverFiltered = {
      config: cfg,
      participantCount: 3,
      items: [
        { id: 'Q1', uid: 'S-1', text: 'Mine', status: 'approved' },
        { id: 'Q2', uid: 'S-2', text: 'Peer approved', status: 'approved' }
      ]
    };
    const vm = V.buildBoardViewModel(C, serverFiltered, { uid: 'S-1', role: 'participant' }, {});
    expect(vm.floorPending).toBe(false);
    expect(vm.peerItems.map((i) => i.id)).toEqual(['Q2']);

    const tvm = V.buildTeacherViewModel(C, {
      config: cfg,
      items: [
        { id: 'Q1', uid: 'S-1', text: 'Held', status: 'held' },
        { id: 'Q2', uid: 'S-2', text: 'Hidden', status: 'hidden' },
        { id: 'Q3', uid: 'S-3', text: 'Approved', status: 'approved' }
      ]
    }, { uid: 'T-1', role: 'host' }, {});
    expect(tvm.needsReview.map((i) => i.id)).toEqual(['Q1']);
    expect(tvm.hidden.map((i) => i.id)).toEqual(['Q2']);
    expect(V.STATE_COLORS.pending.border).toBe('#1d4ed8');
    expect(V.validateNewBoard(C, { activityId: cfg.activityId, prompt: 'Ok', itemsPerStudent: 25 }).errors.itemsPerStudent).toBeTruthy();
    expect(V.validateNewBoard(C, { activityId: cfg.activityId, prompt: 'Ok', itemsPerStudent: '' }).errors.itemsPerStudent).toBeTruthy();
  });

  it('9. verification_policy_module.js: formats ai-manual-review:N and sanitizes languageReviewReason', () => {
    const VP = require(path.join(ROOT, 'verification_policy_module.js'));
    expect(VP.formatVerificationReason('ai-manual-review:3')).toBe('3 AI semantic findings need manual review.');
    expect(VP.formatVerificationReason('ai-manual-review:1')).toBe('1 AI semantic finding needs manual review.');
    const state = VP.deriveVerificationState({
      languageReviewRequired: true,
      languageReviewReason: 'Bad\u0007\u0000reason'
    });
    expect(state.reasons).toContain('Badreason');
  });
});
