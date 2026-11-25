import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadAlloModule } from './setup.js';
import { setupLane, laneInternals } from './helpers/research_lane_harness.js';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const read = (p) => fs.readFileSync(p, 'utf8');

describe('Wave 10 Pass 1: Core Engine, Commands, Generation, Shared Activity', () => {
  let UP;
  beforeAll(() => {
    loadAlloModule('utils_pure_module.js');
    UP = window.AlloModules.UtilsPure;
  });

  it('#1 safeJsonParse & cleanJson preserve valid strings containing ", word:" and valid escaped backslashes', () => {
    const withColonInString = '{"note":"Step 1, word: value","latex":"\\\\alpha","path":"C:\\\\Users\\\\aaron"}';
    expect(UP.safeJsonParse(withColonInString)).toEqual({
      note: 'Step 1, word: value',
      latex: '\\alpha',
      path: 'C:\\Users\\aaron',
    });
    const fencedWithProse = 'Sure! Here is the JSON:\n```json\n{"msg":"Hello, key: world","dir":"C:\\\\Temp"}\n```';
    expect(UP.safeJsonParse(fencedWithProse)).toEqual({
      msg: 'Hello, key: world',
      dir: 'C:\\Temp',
    });
    // cleanJson still repairs unquoted keys while leaving string values intact
    const unquoted = '{a: "keep, key: inside", b: 2}';
    expect(JSON.parse(UP.cleanJson(unquoted))).toEqual({ a: 'keep, key: inside', b: 2 });
    expect(UP.safeJsonParse('{}')).toBeNull();
  });

  it('#4 fetchAndCleanUrl resolves API key/models at call time and guards YouTube POST', () => {
    const src = read('utils_pure_source.jsx');
    expect(src).toContain('const resolveRuntimeGeminiKey = () =>');
    expect(src).toContain('if (isYouTubeUrl(targetUrl) && cloudAiOk && (resolvedApiKey || resolvedIsCanvasEnv))');
  });

  it('#2, #3, #9, #10, #18 allo_commands fixes: posture, whisper fallback, canvas barge-in, Kokoro timers, safe tx()', () => {
    const src = read('allo_commands_source.jsx');
    // #2 Independent Learner gets learner posture, not educator
    // (and, since 2026-11-23, only an explicit isTeacherMode can reach educator: a
    // missing context reads as 'teacher' to getCommandAudience)
    expect(src).toContain("const posture = (c && c.isTeacherMode === true && getCommandAudience(c) === 'teacher') ? 'educator' : 'learner';");
    // #3 startWhisperEngine rejection falls back to beginWebSpeech
    expect(src).toMatch(/startWhisperEngine\(whisperProfile, mySession\)\.then\([\s\S]*?\}\)\.catch\(function \(e\) \{[\s\S]*?beginWebSpeech\(c, false\)/);
    // #9 barge-in reuses whisperState.stream and skips getUserMedia on desktop Canvas
    expect(src).toContain('whisperState && whisperState.stream ? whisperState.stream : null');
    expect(src).toContain('window._isCanvasEnv === true');
    // #10 speakNow tracks and clears chunk timers with attemptSerial
    expect(src).toContain('clearChunkTimers();');
    expect(src).toContain('attemptSerial');
    // #18 tx() uses split/join so $& and $$ are never expanded
    expect(src).toContain("result.split('{' + name + '}').join(String(params[name]))");
    expect(src).not.toContain("result.replace(new RegExp('\\\\{' + name + '\\\\}', 'g'), String(params[name]))");
  });

  it('#5 & #17 allo_command_context fixes: handleGenerateSource and surface close/describe ordering', () => {
    const src = read('allo_command_context_source.js');
    expect(src).toContain('return handleGenerateSource({ topic: nextTopic });');
    const idxAnalytics = src.indexOf("if (showClassAnalytics) { setShowClassAnalytics(false); return 'Class Analytics closed.'; }");
    const idxResearch = src.indexOf("if (isResearchSuiteOpen) { setIsResearchSuiteOpen(false); return 'Research Suite closed.'; }");
    expect(idxAnalytics).toBeGreaterThan(-1);
    expect(idxResearch).toBeGreaterThan(idxAnalytics);
    expect(src).toContain('isAdminHubOpen');
    expect(src).toContain('adminHub:');
  });

  it('#6, #7, #8, #14 generation_helpers fixes: batchConfig merge, _planSourceRun, single-group profile, effectiveMode', () => {
    const src = read('generation_helpers_source.jsx');
    expect(src).toContain('Object.assign({}, _cloneFullPackValue(batchGlobals), existingBatchConfig)');
    expect(src).toContain('if (_planSourceRun && _planSourceRun.planPayload && _planSourceRun.planPayload.lessonDNA)');
    expect(src).toContain('_planSourceRun && _planSourceRun.planPayload && _planSourceRun.planPayload.batchConfig');
    expect(src).toContain('const singleGroupDeps = Object.assign({}, deps, groupFrozenGenerationDeps');
    // The mode is now sanitized before it is interpolated into the prompt.
    expect(src).toContain('Mode: ${_ghCleanToken(effectiveMode, 60)}');
    expect(src).toContain('meta: `${mathSubject} - ${effectiveMode}`');
  });

  it('#15 & #16 allobot fixes: accPopTimerRef and hudHeadroomLift subtraction on drag start', () => {
    const src = read('allobot_source.jsx');
    expect(src).toContain('const accPopTimerRef = useRef(null);');
    expect(src).toContain('y: rect.top - activeHeadroomLift');
  });

  it('#11, #12, #13 shared_activity fixes: transport guard, question-board poll skip, mutation locking', () => {
    const src = read('shared_activity_source.jsx');
    expect(src).toContain('if (!transport || !board)');
    expect(src).toContain('if (isQuestionBoard) return undefined;');
    expect(src).toContain('if (isQuestionBoard || !mailboxUrl');
    expect(src).toContain("if (!result || result.ok === false) throw Object.assign(new Error('Word not saved')");
    expect(src).toContain("if (!result || result.ok === false) throw Object.assign(new Error('Rating not saved')");
    expect(src).toContain("if (!result || result.ok === false) throw Object.assign(new Error('Moderation not saved')");
  });
});

describe('Wave 10 Pass 2: Research Lanes, Anchor Charts, Alignment Report, Study Views', () => {
  beforeAll(() => {
    setupLane('engineering');
    setupLane('humanities');
  });

  it('#21, #22, #23, #24, #25 Engineering lane: safety regression, tradeoff validator, tagged constraints, minimize scale, finite target', () => {
    const E = laneInternals('engineering');
    // #22 latest physical-safety run failing triggers hasUnmetSafety even if an earlier run passed
    expect(E.hasUnmetSafety({
      constraintMatrix: [],
      criteria: [{ id: 's1', kind: 'physical-safety' }],
      testRun: [{ criterionId: 's1', passed: true }, { criterionId: 's1', passed: false }],
    })).toBe(true);
    expect(E.hasUnmetSafety({
      constraintMatrix: [],
      criteria: [{ id: 's1', kind: 'physical-safety' }],
      testRun: [{ criterionId: 's1', passed: false }, { criterionId: 's1', passed: true }],
    })).toBe(false);

    // #23 computeParetoDominated keeps golden minimize contract; weightedSum flips minimize scores via 6 - s
    expect(E.computeParetoDominated(
      [{ id: 'A' }, { id: 'B' }],
      [{ id: 'cost', direction: 'minimize' }],
      [{ candidateId: 'A', criterionId: 'cost', score: 2 }, { candidateId: 'B', criterionId: 'cost', score: 5 }]
    )).toEqual(['B']);

    const src = read('research_lane_engineering_source.jsx');
    expect(src).toContain("return 'S:' + id;");
    expect(src).toContain("return 'P:' + id;");
    expect(src).toContain("var effective = c.direction === 'minimize' ? (6 - s) : s;");
    expect(src).toContain('Number.isFinite(parseFloat(draft.target))');

    // #24 tradeoffInverterValidate allows verbatim 6-word quoted_phrase from tradeOffDeclaration without self-rejecting
    if (typeof E.tradeoffInverterValidate === 'function') {
      const decl = 'We prioritized lower thermal mass over faster assembly time for neighborhood clinics.';
      const journal = {
        stageNotes: { plan_test: { tradeOffDeclaration: decl } },
        tradeOffLedger: [{ criterion: 'c1', sacrificedCriterion: 'c2', justification: '' }],
      };
      const valid = E.tradeoffInverterValidate({
        per_tradeoff: [{
          tradeoff_v: 1,
          quoted_phrase: 'lower thermal mass over faster assembly',
          inversion_questions: ['What happens if a clinic needs rapid setup?'],
          stakeholder_voice_questions: ['Who bears the extra setup labor?'],
        }],
        what_did_you_not_consider_questions: ['How might humidity affect assembly?'],
      }, journal);
      expect(valid.__rejected).toBeUndefined();
      // Still rejects parroting inside generated question text
      const parroting = E.tradeoffInverterValidate({
        per_tradeoff: [{
          tradeoff_v: 1,
          quoted_phrase: 'lower thermal mass over faster assembly',
          inversion_questions: ['Why did you say we prioritized lower thermal mass over faster assembly time?'],
          stakeholder_voice_questions: ['Who bears the extra setup labor?'],
        }],
        what_did_you_not_consider_questions: [],
      }, journal);
      expect(parroting.__rejected).toBe(true);
      expect(parroting.rejectReason).toBe('ai_parrots_student_decl');
    }
  });

  it('#19, #26, #27, #28, #29 Humanities lane: SIFT atomic patch, warrant imperative detection, questionTitle sync, qualifier log, positionality latest', () => {
    const H = laneInternals('humanities');
    if (typeof H.warrantQuestionerValidate === 'function') {
      const bad = H.warrantQuestionerValidate({
        warrant_assumptions_left_implicit_questions: ['Notice that your warrant should include economic motives?'],
        qualifier_scope_questions: ['When does this fail?'],
        rebuttal_pressure_questions: ['What counters this?'],
        standpoint_dependency_questions: ['Who is missing?'],
      }, { questionTitle: 'Should the archive digitize yearbooks?' });
      expect(bad.__rejected).toBe(true);
      expect(bad.rejectReason).toBe('directive_phrase_in_output');
    }
    const src = read('research_lane_humanities_source.jsx');
    expect(src).toContain('var updateSiftPatch = function (entries)');
    expect(src).toContain("updateSiftPatch([['stop.firstReactionText', e.target.value], ['stop.ts', Date.now()]])");
    expect(src).toContain('var qt = journal.questionTitle || \'\';');
    expect(src).toContain('log[i].open === true || log[i].toQualifier === null');
    expect(src).toContain('var newTokensVsPrior = latest');
  });

  it('#20 & #30 Scientific lane: aiScalarText prop + persisted steelman comparison unlock', () => {
    const src = read('research_lane_scientific_source.jsx');
    expect(src).toContain('<AiResultBody data={data} t={t} aiScalarText={aiScalarText} />');
    expect(src).toContain("h.touchpoint === 'steelman_second_pass' && !h.blocked");
  });

  it('#31 & #39 Anchor Charts: commitIconPrompt before regen, keyed regenKeys, active bulletIds', () => {
    const src = read('anchor_charts_source.jsx');
    expect(src).toContain('const [regenKeys, setRegenKeys] = React.useState({});');
    expect(src).toContain('const regenKey = `${chartId}:${s.id || idx}`;');
    expect(src).toContain('Array.isArray(s.bulletIds) && s.bulletIds.length ? s.bulletIds : Object.keys(sectionAns)');
    expect(src).not.toContain('onClick={() => onRegenIcon(sectionIndex');
  });

  it('#32, #33, #34 Alignment Report: ctxRecord guard, auditText coercion, null includedArtifacts guard, canonical standards count', () => {
    const src = read('view_alignment_report_source.jsx');
    expect(src).toContain('record: (standardNode && standardNode.standardsContext) || {}');
    expect(src).toContain('var explanationText = auditText(r && r.explanation);');
    expect(src).toContain('if (!item || typeof item !== \'object\') return;');
    expect(src).toContain('var standardsReportCount = canonicalPerStandard.length');
  });

  it('#35, #36, #37, #38 Study views: grammar quote preservation, scoped passageBusy, openSelectedGrammarCount, lesson plan speech/edit lock, teaching script saveOwner', () => {
    const analysisSrc = read('view_analysis_source.jsx');
    expect(analysisSrc).toContain('const activePassageBusy = passageBusy.id === generatedContent?.id ? passageBusy.key : \'\';');
    expect(analysisSrc).toContain('const openSelectedGrammarCount = rawGrammarNotes.filter');
    expect(analysisSrc).toContain('origTrimmed.startsWith(\'"\') && origTrimmed.endsWith(\'"\')');

    const lpSrc = read('view_lesson_plan_source.jsx');
    expect(lpSrc).toContain('var editingToggleLockRef = React.useRef(false);');
    expect(lpSrc).toContain('stopLessonPlanSpeech();');
    expect(lpSrc).toContain('lessonTitle: _lessonPlanText(generatedContent.data.essentialQuestion)');

    const ltsSrc = read('view_lesson_teaching_script_source.jsx');
    expect(ltsSrc).toContain('const saveOwner = React.useRef(0);');
    expect(ltsSrc).toContain('{_ltsText(version.title)}');
    expect(ltsSrc).toContain('{_ltsText(step?.title)}');
  });
});

describe('Wave 10 Pass 3: STEM Lab Physics, Electronics, Climate, and Math Labs', () => {
  it('#40, #41, #42, #45, #57 Throw Lab: spinRpm=0, Magnus lift & LHP mirror, dynamic maxT, 3D launch velocity', () => {
    const src = read('stem_lab/stem_tool_throwlab.js');
    // Extract pure physics block up to simulatePitch end using VM
    const sandbox = { window: { StemLab: { register: () => {} } }, Math, Number, Array, Object, isFinite };
    const startIdx = src.indexOf('var RHO = 1.225;');
    const endIdx = src.indexOf('function classifyPlateLocation');
    expect(startIdx).toBeGreaterThan(-1);
    expect(endIdx).toBeGreaterThan(startIdx);
    const snippet = src.slice(startIdx, endIdx) + '\nthis._exports = { spinAxisVector, simulatePitch, VOLLEYBALL_TYPES };';
    vm.runInNewContext(snippet, sandbox);
    const { spinAxisVector, simulatePitch, VOLLEYBALL_TYPES } = sandbox._exports;

    // #40 spinRpm = 0 stays 0 (not 2300)
    const zeroSpin = simulatePitch({ ball: 'baseball', speedMph: 90, spinRpm: 0, spinAxisDeg: 0, aimDegV: 0, truncateAtTarget: true });
    const backSpin = simulatePitch({ ball: 'baseball', speedMph: 90, spinRpm: 2400, spinAxisDeg: 0, aimDegV: 0, truncateAtTarget: true });
    const topSpin = simulatePitch({ ball: 'baseball', speedMph: 90, spinRpm: 2400, spinAxisDeg: 180, aimDegV: 0, truncateAtTarget: true });
    // #41 backspin (0 deg) lifts ball higher than 0-spin; topspin (180 deg) drops ball lower
    expect(backSpin.outcome.plateY).toBeGreaterThan(zeroSpin.outcome.plateY + 0.05);
    expect(topSpin.outcome.plateY).toBeLessThan(zeroSpin.outcome.plateY - 0.05);
    // LHP backspin STILL lifts upward; LHP sidespin (90 deg) mirrors RHP horizontally
    const lhpBack = simulatePitch({ ball: 'baseball', speedMph: 90, spinRpm: 2400, spinAxisDeg: 0, throwerHand: 'left', aimDegV: 0, truncateAtTarget: true });
    expect(lhpBack.outcome.plateY).toBeGreaterThan(zeroSpin.outcome.plateY + 0.05);
    const rhpSlide = simulatePitch({ ball: 'baseball', speedMph: 85, spinRpm: 2400, spinAxisDeg: 90, throwerHand: 'right', aimDegV: 0, truncateAtTarget: true });
    const lhpSlide = simulatePitch({ ball: 'baseball', speedMph: 85, spinRpm: 2400, spinAxisDeg: 90, throwerHand: 'left', aimDegV: 0, truncateAtTarget: true });
    expect(rhpSlide.outcome.plateX * lhpSlide.outcome.plateX).toBeLessThan(0);
    // Volleyball jump serve uses topspin (180 deg)
    expect(VOLLEYBALL_TYPES.find((v) => v.id === 'jump').spinAxisDeg).toBe(180);

    // #42 dynamic maxT lets Golf drive reach ground instead of truncating at 2.0s
    const golf = simulatePitch({ ball: 'golf', speedMph: 145, spinRpm: 2600, spinAxisDeg: 0, aimDegV: 14, releaseHeight: 0.05, releaseStride: 0, truncateAtTarget: false, allowBounces: false, maxT: 12 });
    const lastSample = golf.samples[golf.samples.length - 1];
    expect(lastSample.t).toBeGreaterThan(2.5);
    expect(lastSample.y).toBeLessThanOrEqual(0.2);

    // #57 3D launch velocity magnitude equals v0 even at oblique vertical + horizontal angles
    const angled = simulatePitch({ ball: 'baseball', speedMph: 100, aimDegV: 45, aimDegH: 45, spinRpm: 0 });
    const s0 = angled.samples[0];
    const v0 = 100 / 2.23694;
    expect(Math.hypot(s0.vx, s0.vy, s0.vz)).toBeCloseTo(v0, 3);
    expect(spinAxisVector(0, 'right').x).toBeCloseTo(-1, 5);
  });

  it('#43, #44, #46, #47 Semiconductor: battleHP=0 game over, localized options, 500K I-V range, useEffect init', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_semiconductor.js', 'semiconductor');
    const htmlDead = renderTool('semiconductor', {
      semiconductor: { subtool: 'battle', mode: 'battle', battleActive: true, battleHP: 0, battleEnemyHP: 3, battleRound: 1 },
    });
    expect(htmlDead).toContain('CHIP DESTROYED!');
    const core = window.__SemiconductorCore;
    expect(core.iv('diode', 0.6, 500)).toBeGreaterThan(core.iv('diode', 0.6, 400));

    const src = read('stem_lab/stem_tool_semiconductor.js');
    expect(src).toContain('var playerHP = d.battleHP != null ? d.battleHP : 5;');
    expect(src).toContain('var BATTLE_OPT_I18N = {');
    expect(src).toContain('React.useEffect(function() {\n        if (_semiInitialized) return;');
  });

  it('#48, #49, #50, #60 Climate Explorer: no render-time earnBadge, annual habit wording, XP dedup, Justice <=100%, directional severity', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_climateExplorer.js', 'climateExplorer');
    const htmlAnnual = renderTool('climateExplorer', {
      climateExplorer: { tab: 'carbon', granularFreq: { flight_short: 4 } },
    });
    expect(htmlAnnual).toContain('per year:');
    expect(htmlAnnual).not.toContain('by one <strong>flights/year</strong> per week');

    const src = read('stem_lab/stem_tool_climateExplorer.js');
    expect(src).not.toContain("setTimeout(function(){earnBadge('habitMaster');},0)");
    expect(src).not.toContain("(function() { earnBadge('netZero'); return null; })()");
    expect(src).toContain('function awardXPOnce(key, amount)');
    expect(src).toContain('Math.min(100, Math.round(s.support * 1.3))');
    expect(src).toContain('var scaleEventDelta = function(delta) { return delta < 0 ? delta * sev : delta / sev; };');
  });

  it('#51, #52, #53, #54, #55 Money Math: compound What-If timelines, Cashier Rush 8% tax, pure storeItems, real 401(k) match cap, patience timer', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_money.js', 'moneyMath');
    // #51 With compound interest, saving $5 more/week reaches goal FASTER than 24 months (not 32!)
    const sgHtml = renderTool('moneyMath', {
      _moneyMath: { tab: 'finance', finSub: 'goals', sgTarget: 10000, sgHave: 5000, sgMonths: 24, sgRate: 12 },
    });
    const m = /Save \$5 more\/week\? Reach goal in <strong[^>]*>(\d+) months<\/strong>/.exec(sgHtml);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeLessThan(24);

    // #54 Changing matchCap from 6% to 2% with $500/mo contribution genuinely reduces final retirement total
    const retLowCap = renderTool('moneyMath', {
      _moneyMath: { tab: 'finance', finSub: 'retire', retAge: 25, retMonthly: 500, retMatch: 100, retMatchCap: 2, retReturn: 7 },
    });
    const retHighCap = renderTool('moneyMath', {
      _moneyMath: { tab: 'finance', finSub: 'retire', retAge: 25, retMonthly: 500, retMatch: 100, retMatchCap: 6, retReturn: 7 },
    });
    expect(retLowCap).not.toBe(retHighCap);

    const src = read('stem_lab/stem_tool_money.js');
    expect(src).toContain('var rushTaxRate = includeTax ? 0.08 : 0;');
    expect(src).toContain('React.useEffect(function () {\n              if (!needsStoreSync) return;');
    expect(src).toContain("upd('crGameOver', true);");
  });

  it('#56 Unit Converter: diagnoseTimeAnswer rejects out-of-range, blank-hour, and wrong-AM/PM clock answers', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_unitconvert.js', 'unitConvert');
    const C = window.__UnitConvertCore;
    const pmItem = { answerType: 'clock', ah: 14, am: 30, traps: [] };
    expect(C.diagnosePracticeItem(pmItem, { h: '14', m: '30' }).correct).toBe(true);
    expect(C.diagnosePracticeItem(pmItem, { h: '2', m: '30' }).correct).toBe(true);
    expect(C.diagnosePracticeItem(pmItem, { h: '26', m: '30' }).valid).toBe(false);
    expect(C.diagnosePracticeItem(pmItem, { h: '99', m: '30' }).valid).toBe(false);

    const amItem = { answerType: 'clock', ah: 2, am: 30, traps: [] };
    expect(C.diagnosePracticeItem(amItem, { h: '2', m: '30' }).correct).toBe(true);
    expect(C.diagnosePracticeItem(amItem, { h: '14', m: '30' }).correct).toBe(false);

    const noonItem = { answerType: 'clock', ah: 12, am: 30, traps: [] };
    expect(C.diagnosePracticeItem(noonItem, { h: '', m: '30' }).valid).toBe(false);
    expect(C.diagnosePracticeItem(noonItem, { h: '12', m: '30' }).correct).toBe(true);
  });

  it('#58 & #59 Skate Lab: wall-crossing step guard and predictionLocked redraw dependency', () => {
    const src = read('stem_lab/stem_tool_skatelab.js');
    expect(src).toContain('if (previous.x < gapM && nextX >= gapM && (previous.y < 0 || nextY < 0))');
    expect(src).toContain('[!!estimateBlocked, !!predictionLocked]');
  });
});
