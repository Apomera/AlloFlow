import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as lessonBoard from '../lesson_board_engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadGlobalScript(rel, extra = {}) {
  const win = Object.assign({ AlloModules: {} }, extra.window || {});
  const sandbox = Object.assign({
    window: win,
    self: win,
    globalThis: win,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    Blob,
  }, extra.globals || {});
  const ctx = vm.createContext(sandbox);
  vm.runInContext(read(rel), ctx, { filename: rel });
  return ctx.window;
}

describe('Wave 15 Bug Sweep — Pass 1: Clinical SEL Hub Tools', () => {
  it('traumapsychoed implements WAI-ARIA roving tablist and tabpanel', () => {
    const src = read('sel_hub/sel_tool_traumapsychoed.js');
    expect(src).toContain("id: 'trauma-tab-' + t.id");
    expect(src).toContain("'aria-controls': 'trauma-panel-' + t.id");
    expect(src).toContain('tabIndex: active ? 0 : -1');
    expect(src).toContain("'ArrowRight'");
    expect(src).toContain("role: 'tabpanel'");
  });

  it('dearman wires crisis text scanning, renderCrisisResources, and AA/HC print banners', () => {
    const src = read('sel_hub/sel_tool_dearman.js');
    expect(src).toContain('function scanDearManText');
    expect(src).toContain('safeRehearseCheck');
    expect(src).toContain('showCrisisModal');
    expect(src).toContain('renderCrisisResources');
    expect(src).toContain('_dePrintFill');
    expect(src).toContain("border: _deHC ? '1px solid #ffff00' : 'none'");
  });

  it('behavioralactivation fixes HC/Dark button contrast, adds crisis scan, initializes M/P on Done, and roving tablist', () => {
    const src = read('sel_hub/sel_tool_behavioralactivation.js');
    expect(src).toContain("_beaSolid = function(c){ return _beaHC ? '#000000'");
    expect(src).toContain('safeRehearseCheck');
    expect(src).toContain('renderCrisisResources');
    expect(src).toContain('patch.mastery = 5');
    expect(src).toContain('patch.pleasure = 5');
    expect(src).toContain("id: 'ba-tab-' + t.id");
    expect(src).toContain("role: 'tabpanel'");
  });

  it('substancepsychoed fixes HC ink/print contrast, crisis scan, imp===0 prompt, and roving tablist', () => {
    const src = read('sel_hub/sel_tool_substancepsychoed.js');
    expect(src).toContain("_subInk = function(c){ return _subHC ? '#ffff00'");
    expect(src).toContain('function scanSubstanceText');
    expect(src).toContain('renderCrisisResources');
    expect(src).toContain('imp === 0');
    expect(src).toContain("id: 'sub-tab-' + t.id");
    expect(src).toContain("role: 'tabpanel'");
  });

  it('healthyrelationships wires crisis/abusive escalation, AA print colors, live hr-notes, and roving tablist', () => {
    const src = read('sel_hub/sel_tool_healthyrelationships.js');
    expect(src).toContain('function scanRelationshipText');
    expect(src).toContain('onSafetyFlag');
    expect(src).toContain('renderCrisisResources');
    expect(src).not.toContain('_hreFg(ratingColor)[r]');
    expect(src).toContain("id: 'hr-notes'");
    expect(src).toContain('tabIndex: active ? 0 : -1');
    expect(src).toContain("role: 'tabpanel'");
  });

  it('anxietytoolkit fixes triage re-entry, crisis scan across inputs, softRoute 988/741741, listEditor a11y/AA, and roving tablist', () => {
    const src = read('sel_hub/sel_tool_anxietytoolkit.js');
    expect(src).toContain('function scanAnxietyText');
    expect(src).toContain('var _anxBtnFill =');
    expect(src).toContain('call or text 988, or text HOME to 741741');
    expect(src).toContain("'aria-label': 'Add to ' + title");
    expect(src).not.toContain("listEditor('myBodySigns', '🫀 How anxiety shows up in MY body', _anxBg(");
    expect(src).not.toContain("listEditor('mySigsThoughts', '💭 My common anxious thoughts', _anxBg(");
    expect(src).toContain('renderCrisisResources');
    expect(src).toContain("id: 'anx-tab-' + t.id");
    expect(src).toContain("role: 'tabpanel'");
  });
});

describe('Wave 15 Bug Sweep — Pass 2: Core Assessment, Lesson & Response Engines', () => {
  it('quiz_live_aggregators handles prototype keys, numeric keys, order reasoning, partial/accuracy policy, sequence-sense, stale completion, and strict indices', () => {
    const win = loadGlobalScript('quiz_live_aggregators.js');
    const Q = win.AlloModules.QuizLiveAggregators;

    // 1. textBuckets prototype safety
    const textAgg = Q.aggregatePresentationResponses(
      { type: 'short-answer', prompt: 'Name a JS key' },
      {
        s1: { answer: '__proto__' },
        s2: { answer: 'constructor' },
        s3: { answer: 'toString' },
      }
    );
    expect(textAgg.rows.map(r => r.text).sort()).toEqual(['__proto__', 'constructor', 'toString']);

    // 2. describePresentationCorrectAnswer rejects blank/boolean correctValue & boolean tolerance
    expect(Q.describePresentationCorrectAnswer({ type: 'numeric-response', correctValue: '' })).toBe('');
    expect(Q.describePresentationCorrectAnswer({ type: 'numeric-response', correctValue: null })).toBe('');
    expect(Q.describePresentationCorrectAnswer({ type: 'numeric-response', correctValue: false })).toBe('');
    expect(Q.describePresentationCorrectAnswer({ type: 'numeric-response', correctValue: 10, tolerance: true })).toBe('10');

    // 3. assessmentResponseFingerprint preserves order reasoning and does not mutate answer
    const orderQ = { type: 'order', items: ['A', 'B'], correctOrder: [0, 1], requireReasoning: true };
    const fp1 = Q.assessmentResponseFingerprint(orderQ, { answer: { order: [0, 1], explanation: 'First reason' } });
    const fp2 = Q.assessmentResponseFingerprint(orderQ, { answer: { order: [0, 1], explanation: 'Different reason' } });
    expect(fp1).not.toBe(fp2);
    const customAnswer = { raw: 'x', explanation: 'Why' };
    Q.assessmentResponseFingerprint({ type: 'custom-type', requireReasoning: true }, { answer: customAnswer });
    expect(customAnswer).toEqual({ raw: 'x', explanation: 'Why' });

    // 4. aggregatePresentationResponses separates partialCount from incorrectCount and honors policy.accuracy === false
    const aeQ = {
      type: 'answer-evidence',
      answerOptions: ['A', 'B'],
      evidenceOptions: ['E1', 'E2'],
      correctAnswer: 'A',
      correctEvidence: 'E1',
    };
    const aeAgg = Q.aggregatePresentationResponses(
      aeQ,
      {
        s1: { answer: { answerIdx: 0, evidenceIdx: 1 } }, // partially-correct
        s2: { answer: { answerIdx: 1, evidenceIdx: 1 } }, // incorrect
      },
      { accuracy: false, partialCredit: true }
    );
    expect(aeAgg.partialCount).toBe(1);
    expect(aeAgg.incorrectCount).toBe(1);
    expect(aeAgg.accuracyRate).toBeNull();

    // 5. multi-select resolves correctIndices-only schema
    const msAgg = Q.aggregatePresentationResponses(
      { type: 'multi-select', options: ['Red', 'Blue', 'Green'], correctIndices: [0, 2] },
      { s1: { answer: { selectedIndices: [0, 2] } } }
    );
    expect(msAgg.rows.map(r => r.isCorrect)).toEqual([true, false, true]);

    // 6. sequence-sense non-compact verifyAnswer='no' requires valid clickedIdx
    const seqQ = {
      type: 'sequence-sense',
      items: ['Step 1', 'Step 2', 'Step 3'],
      presentedOrder: [1, 0, 2],
      intentionallyWrongIndex: 0,
      orderingPrinciple: 'Chronological',
    };
    const missingClick = Q.gradePresentationResponse(
      { answer: { verifyAnswer: 'no', principleAnswer: 'Chronological' } },
      seqQ
    );
    expect(missingClick.status).toBe('submitted');
    expect(missingClick.evaluable).toBe(false);

    // 7. aggregateSuccessCriteria prototype safety + strict integer keys
    const scRes = Q.aggregateSuccessCriteria(
      {
        allResponses: {
          toString: {
            '0': { answer: { optionIdx: 0 } },
            '0extra': { answer: { optionIdx: 1 } },
          },
        },
      },
      {
        data: {
          questions: [{ type: 'mcq', options: ['Yes', 'No'], correctIndex: 0, conceptLabel: 'constructor' }],
        },
      }
    );
    expect(scRes.respondents).toBe(1);
    expect(scRes.byConcept.constructor.total).toBe(1);
    expect(scRes.byConcept.constructor.met).toBe(1);

    // 8. buildPrivacySafeQuizEvidenceSnapshot ignores stale completion marker when __assessmentAttempt is newer
    const snap = Q.buildPrivacySafeQuizEvidenceSnapshot(
      {
        allResponses: {
          u1: {
            __assessmentAttempt: { attemptId: 'att-2', startedAt: 200 },
            0: { answer: { optionIdx: 0 }, assessmentAttemptId: 'att-2', assessmentAttemptStartedAt: 200 },
            2: { itemType: 'assessment-complete', assessmentAttemptId: 'att-1', assessmentAttemptStartedAt: 100 },
          },
        },
      },
      {
        data: {
          questions: [
            { type: 'mcq', options: ['A', 'B'], correctIndex: 0 },
            { type: 'mcq', options: ['C', 'D'], correctIndex: 0 },
          ],
        },
      }
    );
    expect(snap.completedCount).toBe(0);
    expect(snap.byUid.u1.completed).toBe(false);
  });

  it('psychometric_probes ORF passage wordCount matches actual word count across every passage', () => {
    const win = loadGlobalScript('psychometric_probes.js');
    const orf = win.ORF_SCREENING_PASSAGES;
    expect(orf).toBeTruthy();
    const mismatches = [];
    for (const [grade, forms] of Object.entries(orf)) {
      for (const [form, passages] of Object.entries(forms)) {
        for (const p of passages) {
          const actual = p.text.trim().split(/\s+/).length;
          if (actual !== p.wordCount) {
            mismatches.push({ grade, form, title: p.title, declared: p.wordCount, actual });
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('lesson_board_engine guards prototype-named UIDs and enforces tabletop buildSite in replay()', () => {
    const board = {
      version: 1,
      title: 'Test Tabletop',
      theme: 'garden',
      goal: 'core',
      playStyle: 'tabletop',
      starts: ['loc-a'],
      concepts: [{ id: 'c1', name: 'Concept 1' }],
      locations: [
        { id: 'loc-a', name: 'Start', conceptId: 'c1', kind: 'choice', prompt: 'Q1', options: ['Right', 'Wrong'], answer: 0, reward: [3, 3], pos: [0, 0] },
        { id: 'loc-b', name: 'Far', conceptId: 'c1', kind: 'choice', prompt: 'Q2', options: ['Right', 'Wrong'], answer: 0, reward: [3, 3], pos: [1, 0] },
      ],
      edges: [['loc-a', 'loc-b']],
      projects: [
        { id: 'proj-far', name: 'Far Shed', siteId: 'loc-b', cost: [1, 1], effect: { kind: 'yield', resource: 0 } },
      ],
    };

    const run = {
      turn: 0,
      members: ['toString'],
      steps: {
        t0: {
          phase: 'answer',
          targetId: 'loc-a',
          votes: {},
          answers: {},
          seen: {},
        },
      },
    };
    const action = { attemptId: 'att1', turn: 0, requestId: 'req1', kind: 'answer', targetId: 'loc-a', value: '0' };
    const patch = lessonBoard.processAction(board, run, action, 'toString', { attemptId: 'att1', active: true, paused: false });
    expect(patch['steps.t0.seen.toString']?.code).toBe('answer-recorded');
    const merged = lessonBoard.merge(run, patch);
    const resolvedPatch = lessonBoard.resolve(board, merged, { toString: true });
    const resolvedRun = lessonBoard.merge(merged, resolvedPatch);
    const progress = lessonBoard.derive(board, resolvedRun);
    expect(progress.performance.toString).toEqual({ answered: 1, correct: 1 });

    // Tabletop replay must reject remote project build when position !== buildSite(board, project)
    const remoteBuildRun = {
      turn: 1,
      members: ['u1'],
      steps: {
        t0: { phase: 'review', targetId: 'loc-a', result: { success: true, marks: { u1: true } } },
        t1: { phase: 'review', targetId: 'proj-far', result: { success: true, marks: {} } },
      },
    };
    const afterRemote = lessonBoard.derive(board, remoteBuildRun);
    expect(afterRemote.position).toBe('loc-a');
    expect(afterRemote.built).toEqual([]);
  });

  it('lesson_revision_service preserves numeric id 0 as current and catches nativeChangesValid errors on undo', () => {
    const win = loadGlobalScript('lesson_revision_service.js');
    const svc = win.AlloModules.LessonRevision;
    const resources = [{ id: 0, type: 'note-taking', title: 'Zero Notes', data: { title: 'Zero Notes', summary: 'Hello' } }];
    const desc = svc.describeResources(resources, 0);
    expect(desc[0].current).toBe(true);
    expect(read('lesson_revision_service.js')).toContain("return fail('Native revision validation is unavailable.');");
  });

  it('remediation_review_helpers wcagRefs ignores inherited Object.prototype keys', () => {
    const win = loadGlobalScript('remediation_review_helpers.js');
    const refs = win.AlloModules.RemediationDecisionGuides.wcagRefs(['1.1.1', 'toString', 'constructor', '__proto__']);
    expect(refs.map(r => r.sc)).toEqual(['1.1.1']);
  });

  it('studio_response_module preserves note row fields across backup/restore, deduplicates anchor IDs, avoids prototype leakage, and validates scalar fields', () => {
    const win = loadGlobalScript('studio_response_module.js');
    const S = win.AlloModules.StudioResponse;

    const noteRes = {
      id: 'n1',
      type: 'note-taking',
      data: {
        templateType: 'double-entry',
        entries: [
          { id: 0, quote: 'Teacher Quote 0', response: 'Student Resp 0' },
          { quote: 'Teacher Quote 1', response: 'Student Resp 1' },
        ],
      },
    };
    const bk = S.backup(noteRes);
    const restored = S.readBackup(noteRes, bk);
    const projected = S.project(noteRes, restored);
    expect(projected.data.entries[0].quote).toBe('Teacher Quote 0');
    expect(projected.data.entries[0].response).toBe('Student Resp 0');
    expect(projected.data.entries[1].quote).toBe('Teacher Quote 1');
    expect(projected.data.entries[1].response).toBe('Student Resp 1');

    const anchorRes = {
      id: 'a1',
      type: 'anchor-chart',
      data: {
        sections: [
          { id: 's', label: 'S1', bullets: ['b1'], bulletIds: ['toString'] },
          { id: 's', label: 'S2', bullets: ['b2'] },
          { id: 's-1', label: 'S3', bullets: ['b3'] },
        ],
      },
    };
    const projAnchor = S.project(anchorRes, { studentAnswers: {} });
    expect(new Set(projAnchor.data.sections.map(s => s.id)).size).toBe(3);
    expect(projAnchor.data.studentAnswers.s.toString).toBe('');

    const badApplied = {
      id: 'ac1',
      type: 'applied-challenge',
      data: { workspace: {}, evidenceLedger: [null, { claim: 'Valid' }], criteriaCheck: { c1: null } },
    };
    expect(() => S.toResponseEntries(badApplied, badApplied.data)).not.toThrow();

    const badBk = JSON.parse(JSON.stringify(bk));
    badBk.studio.summary = [{ text: 'Not a scalar string' }];
    expect(() => S.readBackup(noteRes, badBk)).toThrow(/Invalid note text/);
  });
});

describe('Wave 15 Bug Sweep — Pass 3: Arcade, Quest & STEM Engines', () => {
  it('arcade_mode_boss_encounter scopes class submissions, defers turn commit on send, passes fresh history on end, fixes score input & accent fallback', () => {
    const src = read('arcade_mode_boss_encounter.js');
    expect(src).toContain('var activeEncounterKey = be.startedAt || \'\';');
    expect(src).toContain('endedOutcome: null,');
    expect(src).toContain('function commitSparkTurn()');
    expect(src).toContain('sparkSent.then(function () {');
    expect(src).toContain('emitEncounterRecord(\'won\', newHp, { history: nextHistory, transformCount: nextTransformCount })');
    expect(src).toContain('var channelBlocked = isClassStudent && (bossIssue === \'rules\' || bossIssue === \'transport\');');
    expect(src).toContain('var parsedScore = parseInt(editingScore, 10);');
    expect(src).not.toContain("palette.accent + '22' || 'rgba(96,165,250,0.18)'");
  });

  it('arcade_mode_realm_builder removes side effects from state updaters, guards class rewards & palace normalization against prototype/stale keys', () => {
    const src = read('arcade_mode_realm_builder.js');
    expect(src).toContain('awardedMilestonesRef');
    expect(src).toContain('visualInFlightRef');
    expect(src).toContain('payload.realmBuilder.classRewardTokens = null;');
    expect(src).toContain("if (rb.status !== 'closed' && rb.isComplete !== true) return;");
    expect(src).not.toContain("palette.accent + '22' || 'rgba(96,165,250,0.18)'");

    const win = loadGlobalScript('arcade_mode_realm_builder.js', {
      window: {
        React: { createElement: () => null, useState: () => [null, () => {}], useEffect: () => {}, useRef: () => ({ current: null }) },
        AlloHavenArcade: { registerMode: () => {}, registerPlugin: () => {} },
      },
    });
    const palaceHelpers = win.AlloHavenArcade && win.AlloHavenArcade.classMemoryPalaceHelpers;
    expect(palaceHelpers).toBeTruthy();
    const normalized = palaceHelpers.normalize({
      activityId: 'palace-2',
      groups: [{ id: 'g1', title: 'Group 1' }],
      rooms: [{ id: 'r1', groupId: 'g1', title: 'Room 1' }],
      participants: {
        oldP: { participantId: 'oldP', nickname: 'Old', activityId: 'palace-1' },
        curP: { participantId: 'curP', nickname: 'Cur', activityId: 'palace-2' },
        constructor: { participantId: 'constructor', nickname: 'Bad', activityId: 'palace-2' },
      },
      submissions: {
        oldS: { id: 'oldS', roomId: 'r1', label: 'Old', mnemonic: 'Old m', activityId: 'palace-1' },
        curS: { id: 'curS', roomId: 'r1', label: 'Cur', mnemonic: 'Cur m', activityId: 'palace-2' },
      },
    });
    expect(Object.keys(normalized.participants)).toEqual(['curP']);
    expect(Object.keys(normalized.submissions)).toEqual(['curS']);
    expect(palaceHelpers.assignParticipant(normalized, 'toString', 'Stu')?.participantId).toBe('toString');
    expect(palaceHelpers.assignParticipant(normalized, 'constructor', 'Bad')).toBeNull();
  });

  it('concept_quest_engine ignores prototype property names as supportTargetUid in resolveBattle', () => {
    const win = loadGlobalScript('concept_quest_engine.js');
    const CQ = win.AlloModules.ConceptQuestEngine;
    const quest = {
      phase: 'battle',
      turn: 1,
      currentRoomId: 'r1',
      party: { hp: 10, maxHp: 10, shield: 0, energy: 0 },
      rooms: [{
        id: 'r1',
        kind: 'battle',
        title: 'Room 1',
        enemy: { name: 'Slime', hp: 20, maxHp: 20, attack: 2 },
        challenge: { id: 'c1', prompt: '1+1?', options: ['2', '3'], correctIndex: 0 },
      }],
    };
    const key = CQ.getTurnKey(quest);
    const res = CQ.resolveBattle(quest, {
      u1: { turnKey: key, answerIndex: 0, abilityId: 'analyze', supportId: 'clarify', supportTargetUid: 'toString' },
    }, {});
    expect(res.error).toBeFalsy();
    expect(res.summary.assistedCount).toBe(0);
    expect(res.quest.lastRound.assistedCount).toBe(0);
  });

  it('renewables_tycoon_engine rejects demand===0 NaN bypass and prototype assetId/conditionByAsset ids in restore', () => {
    const win = loadGlobalScript('stem_lab/renewables_tycoon_engine.js');
    const RT = win.StemLab.renewablesTycoonEngine;
    const state = RT.create('seed-1');
    const chosen = RT.apply(state, { type: 'event', choiceId: RT.outlook(state).event.choices[0].id });
    const played = RT.apply(chosen, { type: 'advance' });
    const raw = JSON.parse(JSON.stringify(played));

    const badDemand = JSON.parse(JSON.stringify(raw));
    badDemand.history[0].totals.demand = 0;
    badDemand.history[0].totals.served = 0;
    badDemand.history[0].totals.unserved = 0;
    badDemand.history[0].totals.generation = 0;
    badDemand.history[0].totals.charge = 0;
    badDemand.history[0].totals.discharge = 0;
    badDemand.history[0].totals.curtailed = 0;
    badDemand.history[0].totals.revenue = 0;
    badDemand.history[0].totals.profit = -badDemand.history[0].totals.operatingCost;
    badDemand.history[0].totals.endStored = badDemand.history[0].totals.initialStored - badDemand.history[0].totals.storageLoss;
    badDemand.assets.forEach(a => { a.stored = 0; });
    if (badDemand.assets[2]) badDemand.assets[2].stored = badDemand.history[0].totals.endStored;
    expect(RT.restore(badDemand)).toBeNull();

    const badFault = JSON.parse(JSON.stringify(raw));
    badFault.history[0].faults = [{ assetId: 'toString', hour: 1, existing: false }];
    expect(RT.restore(badFault)).toBeNull();

    const badCond = JSON.parse(JSON.stringify(raw));
    badCond.history[0].conditionByAsset[0].id = 'valueOf';
    expect(RT.restore(badCond)).toBeNull();
  });

  it('water_worlds_kernel rejects prototype cover and extreme minutes and terminates cleanly in advance()', () => {
    const win = loadGlobalScript('stem_lab/water_worlds_kernel.js');
    const WW = win.WaterWorldsKernel;
    const state = WW.initial();

    const badCover = JSON.parse(JSON.stringify(state.world));
    badCover.cells[0].cover = 'toString';
    expect(WW.validWorld(badCover)).toBe(false);

    const hugeMinutes = JSON.parse(JSON.stringify(state.world));
    hugeMinutes.minutes = 1e20;
    expect(WW.validWorld(hugeMinutes)).toBe(false);

    const running = WW.begin(state);
    running.world.minutes = 1e20;
    running.run.start.minutes = 1e20;
    const advanced = WW.advance(running, 5);
    expect(advanced).toBeTruthy();
  });

  it('stem_lumen_evidence fixes prototype collisions in labels/retrieval/validation and closes SSRF bypasses in canonicalWebUrl', () => {
    const win = loadGlobalScript('stem_lab/stem_lumen_evidence.js');
    const L = win.LumenEvidence;

    expect(L.normalizeSourceLabels(['constructor', 'toString', 'Biology'])).toEqual(['constructor', 'toString', 'Biology']);

    const project = L.makeProject({ title: 'Test' });
    const withSource = L.upsertSource(project, {
      title: 'JS Docs',
      kind: 'paste',
      content: 'The constructor initializes an object and toString formats values cleanly for learners.',
    });
    const hits = L.retrieve(withSource, 'constructor toString');
    expect(hits.length).toBeGreaterThan(0);
    expect(Number.isFinite(hits[0].score)).toBe(true);

    const val = L.validateGroundedResponse(
      { claims: [{ text: 'Claim', evidenceIds: ['toString'], quote: 'constructor' }] },
      hits
    );
    expect(val.ok).toBe(false);

    expect(L.canonicalWebUrl('https://localhost./secret')).toBe('');
    expect(L.canonicalWebUrl('https://api.localhost/secret')).toBe('');
    expect(L.canonicalWebUrl('http://[::]/secret')).toBe('');
    expect(L.canonicalWebUrl('http://[::ffff:127.0.0.1]/secret')).toBe('');
    expect(L.canonicalWebUrl('https://example.org/study?utm_source=x')).toBe('https://example.org/study');
  });
});
