import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');

const readSrc = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

function extractBlock(src, startMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error('Start marker not found: ' + startMarker);
  // Skip parameter list `(...)` if marker opens a function header so destructured params don't confuse `{`
  let searchFrom = start + startMarker.length;
  if (startMarker.endsWith('(')) {
    let parenDepth = 1;
    let i = searchFrom;
    while (i < src.length && parenDepth > 0) {
      if (src[i] === '(') parenDepth++;
      else if (src[i] === ')') parenDepth--;
      i++;
    }
    searchFrom = i;
  }
  const openBrace = src.indexOf('{', searchFrom);
  if (openBrace < 0) throw new Error('Opening brace not found after: ' + startMarker);
  let depth = 0;
  let inStr = null;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = openBrace; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') { inBlockComment = false; i++; }
      continue;
    }
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('Unbalanced braces for: ' + startMarker);
}

function extractSlice(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error('Start marker not found: ' + startMarker);
  const end = endMarker ? src.indexOf(endMarker, start + startMarker.length) : src.length;
  if (end < 0) throw new Error('End marker not found: ' + endMarker);
  return src.slice(start, end);
}

describe('Bug Sweep Wave 7 (2026-11-20) — 55 Fixes Regression Suite', () => {
  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = window.AlloLanguageContext || React.createContext({ t: k => k });
    window.__alloShared = window.__alloShared || { db: {}, warnLog() {} };
    window.StemLab = window.StemLab || { registerTool() {} };
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 1: Accessibility, Report Writer, Dispro, Annotation, Test Prep (#1-#15)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 1 — Report Writer, Accessibility Lab, Test Prep Hub, Dispro, Annotation', () => {
    it('#1, #9, #10, #11: report_writer_module.js resets prior student PII before demo, resolves [Student] spans, passes citableFor, and guards missing locator', () => {
      const src = readSrc('report_writer_module.js');

      // #1 FERPA isolation + race guard in runAIDemoCase
      const demoFn = extractBlock(src, 'const runAIDemoCase = async');
      expect(demoFn).toContain('captureSensitiveOperation');
      expect(demoFn).toContain('operationIsCurrent(operation)');
      expect(demoFn).toContain('resetCaseState({ clearStoredDraft: false, silent: true })');
      expect(demoFn).toContain('createEmptyBackground()');
      expect(demoFn).toContain('createEmptyClinicalObs()');
      expect(demoFn).toContain('Array.isArray(parsed.scores)');

      // #9 [Student] substitution in discrepanciesBySection
      const discIdx = src.indexOf('const discrepanciesBySection = useMemo(');
      const discSlice = src.slice(discIdx, discIdx + 1200);
      expect(discSlice).toContain('effectiveStudentName');
      expect(discSlice).toMatch(/replace\(\/\\\[Student\\\]\/g/);

      // #10 citableFor passed to parseEvidenceResponse in repair & regenerateSection
      const regenFn = extractBlock(src, 'const regenerateSection = async');
      expect(regenFn).toContain('citableFor(sectionName, verifiedChunks)');
      expect(src).toContain('citableFor(secName, verifiedChunks)');

      // #11 rwReferencesConsulted guards missing locator
      const refFnSrc = extractBlock(src, 'const rwReferencesConsulted =');
      expect(refFnSrc).toContain('node.locator && node.locator.lineStart != null');
      const rwReferencesConsulted = new Function(
        'rwCaseProjectCache', 'rwRefProjectCache',
        refFnSrc + '\nreturn rwReferencesConsulted;'
      )(
        { project: { evidenceNodes: [], sources: [] } },
        {
          project: {
            evidenceNodes: [
              { id: 'N1', sourceId: 'S1', locator: null, ordinal: 1 },
              { id: 'N2', sourceId: 'S1', locator: { heading: 'Criteria', lineStart: 4, lineEnd: 6 }, ordinal: 2 }
            ],
            sources: [{ id: 'S1', title: 'IDEA Manual' }]
          }
        }
      );
      const out = rwReferencesConsulted({ Summary: ['ref:N1', 'ref:N2'] });
      expect(out.length).toBe(1);
      expect(out[0].passages.length).toBe(2);
      expect(out[0].passages[0].where).toBe('');
      expect(out[0].passages[1].where).toContain('lines 4');
    });

    it('#3, #4, #5, #6: accessibility_lab_module.js fixes provenance truthfulness, scorecard sync, scroll overlay, and hook order', () => {
      const src = readSrc('accessibility_lab_module.js');

      // #3 Single evidenceInput in deriveLabVerification (no duplicate hardcoded manual.executed: true)
      const verFn = extractBlock(src, 'function deriveLabVerification(');
      const manualTrueCount = (verFn.match(/manual:\s*\{\s*executed:\s*true/g) || []).length;
      expect(manualTrueCount).toBe(0);
      expect(verFn).toContain('evidence.attachEvidenceProvenance');
      expect(verFn).toContain('evidenceInput');

      // #4 saveScorecard & persistAutomatedAuditForReview sync evidenceProvenance / evidenceManifest
      const saveFn = extractBlock(src, 'function saveScorecard(');
      expect(saveFn).toContain('evidenceProvenance');
      expect(saveFn).toContain('evidenceManifest');
      const persistFn = extractBlock(src, 'function persistAutomatedAuditForReview(');
      expect(persistFn).toContain('evidenceProvenance');
      expect(persistFn).toContain('evidenceManifest');

      // #5 renderTabOrderOverlay inside position:fixed does not add window.scrollY / window.scrollX
      const tabOverlay = extractBlock(src, 'function renderTabOrderOverlay(');
      expect(tabOverlay).not.toContain('window.scrollY');
      expect(tabOverlay).not.toContain('window.scrollX');

      // #6 Hooks placed before early `if (!artifact) return null;` and `if (!props.isOpen) return null;`
      const dialogFn = extractBlock(src, 'function AccessibilityAlloSheetReviewDialog(');
      expect(dialogFn.indexOf('useEffect')).toBeLessThan(dialogFn.indexOf('if (!artifact) return null'));
      const labFn = extractBlock(src, 'function AccessibilityLab(');
      expect(labFn.indexOf('useEffect')).toBeLessThan(labFn.indexOf('if (!props.isOpen) return null'));
    });

    it('#2, #7, #8, #15: test_prep_hub_module.js fixes resume choice mapping, rationale search, audio prewarm presentation, and DST-safe streaks', () => {
      const src = readSrc('test_prep_hub_module.js');

      // #2 practiceSeed persisted and choiceOrder remapped on resume
      expect(src).toContain('practiceSeed:');
      expect(src).toContain('resumedPresented.choiceOrder.indexOf(resumedAnswer)');

      // #8 prewarmUpcomingQuestionAudio uses testPrepPresentItem
      const prewarmFn = extractBlock(src, 'function prewarmUpcomingQuestionAudio(');
      expect(prewarmFn).toContain('testPrepPresentItem(');

      // #7 Runtime test of testPrepSearchPack on rationale + choiceRationales
      const searchSrc = extractBlock(src, 'function testPrepSearchPack(');
      const testPrepSearchPack = new Function(
        'testPrepFinite', 'normalizeTestPrepPack', 'testPrepItemSkillIds', 'testPrepNativeChapterSearchText', 'testPrepNormalizeWorkshop', 'testPrepStudyPlanLayers', 'normalizeTestPrepAnnotations',
        searchSrc + '\nreturn testPrepSearchPack;'
      )(
        (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb),
        (p) => p,
        () => [],
        () => '',
        () => ({ tasks: [], cases: [], vignettes: [] }),
        () => ({ topicRoutes: [], playbooks: [], sessions: [], sources: [] }),
        () => ({ records: [] })
      );
      const pack = {
        domains: [{ id: 'd1', name: 'Ethics' }],
        items: [
          {
            id: 'q1',
            domainId: 'd1',
            prompt: 'A clinician faces a boundary dilemma.',
            choices: ['Option A', 'Option B'],
            rationale: 'Beneficence requires protecting client welfare.',
            choiceRationales: ['Incorrect because dual roles impair objectivity.', 'Correct because consultation helps.'],
            chapterIds: []
          }
        ],
        guides: [],
        glossary: [],
        vignettes: [],
        skills: [],
        flashcards: [],
        workshops: []
      };
      expect(testPrepSearchPack(pack, null, 'beneficence').results.length).toBe(1);
      expect(testPrepSearchPack(pack, null, 'objectivity').results.length).toBe(1);

      // #15 Runtime test of testPrepBuildStudyPlanStatus across DST spring-forward boundary (2026-03-08)
      const statusSrc = extractBlock(src, 'function testPrepBuildStudyPlanStatus(');
      const testPrepBuildStudyPlanStatus = new Function(
        'normalizeTestPrepProgress', 'testPrepSlug', 'testPrepNormalizeContentIdentity', 'testPrepContentIdentityStatus', 'testPrepStudyPlanForPack', 'testPrepClampTimestamp',
        statusSrc + '\nreturn testPrepBuildStudyPlanStatus;'
      )(
        (p) => p,
        (s) => String(s || ''),
        () => null,
        () => 'current',
        () => ({ weeklyQuestionGoal: 50, weeklyDaysGoal: 4, dailyMinutesGoal: 20 }),
        (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb)
      );
      const dstStatus = testPrepBuildStudyPlanStatus(
        {
          attempts: [
            { packId: 'eppp', total: 5, completedAt: new Date(2026, 2, 7, 10, 0, 0).getTime() },
            { packId: 'eppp', total: 5, completedAt: new Date(2026, 2, 8, 10, 0, 0).getTime() },
            { packId: 'eppp', total: 5, completedAt: new Date(2026, 2, 9, 10, 0, 0).getTime() }
          ]
        },
        {},
        'eppp',
        new Date(2026, 2, 9, 12, 0, 0).getTime() // Mon Mar 9, 2026
      );
      expect(dstStatus.activityStreakDays).toBe(3);
      expect(dstStatus.questionsCompleted).toBe(5);
      expect(dstStatus.activeDaysCompleted).toBe(1);
    });

    it('#12: dispro_analyzer_module.js skips numeric-containing header lines in disproParsePaste', () => {
      const src = readSrc('dispro_analyzer_module.js');
      const splitSrc = extractBlock(src, 'function disproSplitRow(');
      const parseSrc = extractBlock(src, 'function disproParsePaste(');
      const disproParsePaste = new Function(splitSrc + '\n' + parseSrc + '\nreturn disproParsePaste;')();
      const pasted = [
        'Group Name, 2025-26 Total, 2025-26 Identified',
        'Hispanic/Latino, 200, 30',
        'White, 500, 45'
      ].join('\n');
      const parsed = disproParsePaste(pasted);
      expect(parsed.groups.length).toBe(2);
      expect(parsed.skipped.length).toBe(1);
      expect(parsed.groups[0].name).toBe('Hispanic/Latino');
      expect(parsed.groups[0].enrollment).toBe(200);
      expect(parsed.groups[0].students).toBe(30);
    });

    it('#13, #14: annotation_suite_module.js clamps keyboard moves to scroll dimensions and keeps fast strokes synchronously', () => {
      const src = readSrc('annotation_suite_module.js');
      expect(src).toContain('host.scrollWidth');
      expect(src).toContain('host.scrollHeight');
      const drawSrc = extractBlock(src, 'function DrawingCapture(');
      expect(drawSrc).toContain('strokeRef');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 2: Educator & School Systems (#16-#36)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 2 — Seating, Educator Eval, Family Announcements, Meeting Docs, Admin Hub, MTSS, SPED', () => {
    it('#16, #25, #26: seating_chart_module.js guards live->null mode, preserves cross-layout fixed_seat, and seats fixed students even with overflow roster', () => {
      const src = readSrc('seating_chart_module.js');
      expect(src).toMatch(/rawMode\s*===\s*["']live["']\s*&&\s*!live\s*\?\s*["']assign["']\s*:\s*rawMode/);

      const normSrc = extractBlock(src, 'function normalizeSeating(');
      expect(normSrc).toContain('layouts');
      const scoreSrc = extractBlock(src, 'function scoreAssignment(');
      expect(scoreSrc).toContain('seatById');
      expect(scoreSrc).toContain('fixed_seat');
      const solveSrc = extractBlock(src, 'function solveSeating(');
      expect(solveSrc).toContain('fixedSeats');
      expect(solveSrc).toContain('fixed_seat');
    });

    it('#17, #18, #19, #33, #34, #35: educator_evaluation_module.js handles custom frameworks, isolates simulation defaults, versions overall score, fixes audit/comment roles and QR AI gate', () => {
      const src = readSrc('educator_evaluation_module.js');

      // #17 Custom component codes up to 12 chars + AE_ACTIVE_FW.components (runtime test)
      expect(src).toContain('aeBuildComponents(AE_DOMAINS, AE_ACTIVE_FW.components)');
      const tagsSrc = extractBlock(src, 'function aeComponentTags(');
      const aeComponentTags = new Function(
        'AE_COMPONENTS', 'aeString',
        tagsSrc + '\nreturn aeComponentTags;'
      )(
        [{ code: 'STD-1' }, { code: 'P-2A' }, { code: '1a' }],
        (v, max, fb) => String(v == null ? fb : v).trim().slice(0, max)
      );
      expect(aeComponentTags(['std-1', 'P-2A', 'unknown'])).toEqual(['STD-1', 'P-2A']);

      // #18 aeNormalizeSimulationParams never invokes aeSampleWorkspace()
      const simNormSrc = extractBlock(src, 'function aeNormalizeSimulationParams(');
      expect(simNormSrc).not.toContain('aeSampleWorkspace(');

      // #19 aeOverallScore uses aeObservationScoreFor with teacher.frameworkVersion
      const overallSrc = extractBlock(src, 'function aeOverallScore(');
      expect(overallSrc).toContain('aeObservationScoreFor');
      expect(overallSrc).toContain('teacher.frameworkVersion');

      // #33 aeMergeResponsePacket updates lastActivityAt and calls aeRecalculateCycleStatus
      const mergeSrc = extractBlock(src, 'function aeMergeResponsePacket(');
      expect(mergeSrc).toContain('lastActivityAt');
      expect(mergeSrc).toContain('aeRecalculateCycleStatus');

      // #34 Canonical 'Teacher'/'Evaluator' roles in commit & addComment
      expect(src).toMatch(/aeAuditEvent\([\s\S]{0,260}["']Teacher["']/);
      expect(src).toMatch(/role:\s*(?:role\s*===\s*["']teacher["']|mode\s*===\s*["']teacher["'])\s*\?\s*["']Teacher["']\s*:\s*["']Evaluator["']/);

      // #35 QR AI block wired to aeAiBlocked and askUsable
      expect(src).toContain('_alloQrBlocked');
    });

    it('#20, #21: family_announcements_module.js cancels stale translations and exports all announcement langTags', () => {
      const src = readSrc('family_announcements_module.js');
      expect(src).toContain('mountedRef');
      expect(src).toContain('runIdRef');
      expect(src).toContain('forText: sourceText');
      const exportFn = extractBlock(src, 'const exportPacketFor =');
      expect(exportFn).toContain('a.langTags');
    });

    it('#22, #23, #36: meeting_docs_module.js masks apostrophe surnames, guards AI convert races, and recovers from invalid stage/template', () => {
      const src = readSrc('meeting_docs_module.js');
      // #22 Runtime test of meetdocsExpandMaskPairs with O'Connor & D’Angelo
      const maskSrc = extractSlice(src, 'function meetdocsExpandMaskPairs(', '\nfunction ');
      const meetdocsExpandMaskPairs = new Function(
        'MEETDOCS_HONORIFICS',
        maskSrc + '\nreturn meetdocsExpandMaskPairs;'
      )(new Set(['mr', 'mrs', 'ms', 'dr']));
      const pairs = meetdocsExpandMaskPairs([{ name: "Liam O'Connor", code: '[STUDENT_1]' }]);
      const names = pairs.map((p) => p.name);
      expect(names).toContain("O'Connor");
      expect(names).toContain('Liam');

      // #23 & #36
      expect(src).toContain('aiReqRef');
      expect(src).toContain('mountedRef');
      expect(src).toContain('disabled: aiBusy');
    });

    it('#24, #30: admin_hub_module.js guards Drive disconnect race and drops bogus noopener popup warning', () => {
      const src = readSrc('admin_hub_module.js');
      expect(src).toMatch(/status:\s*["']cancelled["']/);
      expect(src).toContain('mountedRef');
      expect(src).not.toMatch(/if\s*\(\s*!popup\s*\)/);
    });

    it('#27, #28, #29: mtss_triage_module.js skips numeric headers, clears stale selections, and wires SensitiveWorkspace sibling counts', () => {
      const src = readSrc('mtss_triage_module.js');
      const splitSrc = extractBlock(src, 'function mtssSplitRow(');
      const parseSrc = extractBlock(src, 'function mtssParsePaste(');
      const mtssParsePaste = new Function(splitSrc + '\n' + parseSrc + '\nreturn mtssParsePaste;')();
      const parsed = mtssParsePaste(
        'Student, 2025-26 Reading, 2025-26 Math, 2025-26 Attendance\nMaya Lin, 72, 68, 94\nNoah Diaz, 45, 50, 82'
      );
      expect(parsed.rows.length).toBe(2);
      expect(parsed.skipped.length).toBe(1);
      expect(parsed.rows[0].code).toBe('Maya Lin');
      expect(parsed.rows[0].score).toBe(72);
      expect(src).toContain('SensitiveWorkspace');
      expect(src).toContain('sped-timelines');
    });

    it('#31, #32: sped_timelines_module.js tracks manual dueDate override and validates/deduplicates JSON import', () => {
      const src = readSrc('sped_timelines_module.js');
      expect(src).toContain('dueDateManual');
      expect(src).toContain('Array.isArray(data.cases)');
      expect(src).toContain('have.add(x.id)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 3: STEM Lab Simulations (#37-#55)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 3 — Titration, Coding, Optics, StatsLab, DNA, Fractions', () => {
    it('#37: stem_tool_titration.js calcPH is strictly monotonic across equivalence for all 4 monoprotic modes (including wa_wb)', () => {
      const src = readSrc('stem_lab/stem_tool_titration.js');
      const calcSrc = extractBlock(src, 'function calcPH(');
      const makeCalcPH = (preset) => new Function('preset', 'Kw', calcSrc + '\nreturn calcPH;')(preset, 1e-14);

      const presets = [
        { name: 'sa_sb', type: 'sa_sb', concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: null, Kb: null },
        { name: 'wa_sb', type: 'wa_sb', concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 1.8e-5, Kb: null },
        { name: 'sa_wb', type: 'sa_wb', concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: null, Kb: 1.8e-5 },
        { name: 'wa_wb', type: 'wa_wb', concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 1.8e-5, Kb: 1.8e-5 }
      ];

      for (const preset of presets) {
        const calcPH = makeCalcPH(preset);
        let prev = -Infinity;
        const vols = [0, 5, 12.5, 20, 24, 24.5, 24.9, 24.99, 25, 25.01, 25.1, 25.5, 26, 30, 40, 50];
        for (const v of vols) {
          const ph = calcPH(v);
          expect(Number.isFinite(ph)).toBe(true);
          expect(ph).toBeGreaterThanOrEqual(prev - 1e-9);
          expect(ph).toBeGreaterThanOrEqual(0);
          expect(ph).toBeLessThanOrEqual(14);
          prev = ph;
        }
        const eqPH = calcPH(25);
        if (preset.name === 'sa_sb') expect(Math.abs(eqPH - 7)).toBeLessThan(0.05);
        if (preset.name === 'wa_sb') expect(eqPH).toBeGreaterThan(8.0);
        if (preset.name === 'sa_wb') expect(eqPH).toBeLessThan(6.0);
        if (preset.name === 'wa_wb') expect(Math.abs(eqPH - 7)).toBeLessThan(0.1);
      }
    });

    it('#38, #39, #41, #42, #43, #52, #53: stem_tool_coding.js fixes closed polygon angle, Robot visual controls, 3D reset/frames, perspective clamp, AST immutability, and challenge bounds', () => {
      const src = readSrc('stem_lab/stem_tool_coding.js');
      expect(src).toContain('_simIterCount');
      expect(src).toContain('Math.max(40, 800 + ry2)');
      expect(src).toContain('initLines3D');
      expect(src).toContain('recordedFrames');
      expect(src).toContain("playgroundMode === 'robot' ? handleRobotRun : handleRun");
      expect(src).toContain('CHALLENGES.length');
      expect(src).toContain('ROBOT_CHALLENGES.length');

      // #38 Verify getEndpoints includes closing vertex turn (360 deg total for a closed square, not 270)
      const epSrc = extractBlock(src, 'function getEndpoints(');
      const getEndpoints = new Function(epSrc + '\nreturn getEndpoints;')();
      const squareLines = [
        { x1: 0, y1: 0, x2: 100, y2: 0 },
        { x1: 100, y1: 0, x2: 100, y2: 100 },
        { x1: 100, y1: 100, x2: 0, y2: 100 },
        { x1: 0, y1: 100, x2: 0, y2: 0 }
      ];
      const ep = getEndpoints(squareLines);
      expect(ep.closed).toBe(true);
      expect(ep.turns).toBeCloseTo(360, 5);
    });

    it('#51: stem_tool_optics.js stops quantum single-photon timer outside interference mode and when tab is hidden', () => {
      const src = readSrc('stem_lab/stem_tool_optics.js');
      expect(src).toContain("d.mode !== 'interference'");
      expect(src).toContain('document.hidden');
    });

    it('#40, #44, #45, #46, #54: stem_tool_statslab.js fixes repeated-measures ANOVA, powerCorrelation, Spearman/Kruskal-Wallis resampling, zero-denominator guards, and sensitivity error propagation', () => {
      const src = readSrc('stem_lab/stem_tool_statslab.js');

      window.jStat = {
        normal: {
          inv: (p) => {
            if (p <= 0 || p >= 1) return NaN;
            const sign = p < 0.5 ? -1 : 1;
            const q = p < 0.5 ? p : 1 - p;
            const t = Math.sqrt(-2 * Math.log(q));
            const num = 2.515517 + 0.802853 * t + 0.010328 * t * t;
            const den = 1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t;
            return sign * (t - num / den);
          }
        },
        centralF: { cdf: () => 0.95 },
        chisquare: { cdf: () => 0.95 },
        studentt: { cdf: () => 0.95 }
      };

      const statsCore = extractSlice(src, 'function _isNum(', 'function _renderBootstrapViz(');
      const permCore = extractSlice(src, 'function _shuffle(', 'function _renderPermutationViz(');
      const harness = new Function(
        'window', '__alloSLT',
        statsCore + '\n' + permCore +
        '\nreturn { anova_oneWay, chiSquareIndependence, anova_repeatedMeasures, multipleRegression, kruskalWallis, spearman, pearson, powerCorrelation, bootstrapCI, permutationTest };'
      )(window, (_k, fb) => fb);

      // #40 Repeated-measures ANOVA: zero interaction error returns clean error (not -1e16 / NaN)
      const rmZero = harness.anova_repeatedMeasures([
        [10, 20, 30],
        [15, 25, 35],
        [20, 30, 40]
      ]);
      expect(rmZero.error).toBeTruthy();

      const rmValid = harness.anova_repeatedMeasures([
        [10, 14, 22],
        [12, 18, 21],
        [9, 15, 25],
        [14, 17, 26]
      ]);
      expect(rmValid.error).toBeUndefined();
      expect(rmValid.ssError).toBeGreaterThan(0);
      expect(rmValid.F).toBeGreaterThan(0);
      expect(Number.isFinite(rmValid.F)).toBe(true);

      // #46 Zero-denominator guards across ANOVA, Chi-square, Multiple Regression, Kruskal-Wallis
      expect(harness.anova_oneWay([[5], [10]]).error).toBeTruthy();
      expect(harness.anova_oneWay([[5, 5], [10, 10]]).error).toBeTruthy();
      expect(harness.chiSquareIndependence([[0, 0], [0, 0]]).error).toBeTruthy();
      expect(harness.multipleRegression([[1], [2], [3], [4]], [5, 5, 5, 5]).error).toBeTruthy();
      expect(harness.multipleRegression([[1], [2], [3], [4]], [2, 4, 6, 8]).error).toBeTruthy();
      const kwSmall = harness.kruskalWallis([[1], [2], [3]]);
      expect(Number.isFinite(kwSmall.etaSquaredH)).toBe(true);

      // #44 powerCorrelation input validation
      expect(harness.powerCorrelation({ r: 0, alpha: 0.05, power: 0.8 }).error).toBeTruthy();
      expect(harness.powerCorrelation({ r: 1, alpha: 0.05, power: 0.8 }).error).toBeTruthy();
      expect(harness.powerCorrelation({ r: -1, alpha: 0.05, power: 0.8 }).error).toBeTruthy();
      expect(harness.powerCorrelation({ r: 1.5, alpha: 0.05, power: 0.8 }).error).toBeTruthy();
      expect(harness.powerCorrelation({ r: 0.3, alpha: 0.05, power: 0.01 }).error).toBeTruthy();
      const pPos = harness.powerCorrelation({ r: 0.3, alpha: 0.05, power: 0.8 });
      const pNeg = harness.powerCorrelation({ r: -0.3, alpha: 0.05, power: 0.8 });
      expect(pPos.n).toBeGreaterThan(50);
      expect(pNeg.n).toBe(pPos.n);
      expect(src).toContain('_lastResult: null');

      // #45 Spearman and Kruskal-Wallis bootstrap & permutation compute their own statistics
      const nonlinearData = {
        twoColData: { a: [1, 2, 3, 4, 5, 6], b: [1, 2, 4, 8, 16, 1000] },
        multiColData: { groups: [{ values: [1, 2, 3, 4] }, { values: [10, 11, 12, 13] }, { values: [20, 21, 22, 23] }] }
      };
      const bootSp = harness.bootstrapCI(nonlinearData, 'spearman', 0.95, 60);
      expect(bootSp.statName).toBe('Spearman ρ');
      expect(Math.abs(bootSp.observed - 1)).toBeLessThan(1e-9);

      const permSp = harness.permutationTest(nonlinearData, 'spearman', 60);
      expect(permSp.statName).toBe('Spearman ρ');
      expect(Math.abs(permSp.observed - 1)).toBeLessThan(1e-9);

      const bootKW = harness.bootstrapCI(nonlinearData, 'kruskalWallis', 0.95, 60);
      expect(bootKW.statName).toBe('Kruskal-Wallis H');
      expect(bootKW.observed).toBeCloseTo(harness.kruskalWallis([[1, 2, 3, 4], [10, 11, 12, 13], [20, 21, 22, 23]]).H, 6);

      const permKW = harness.permutationTest(nonlinearData, 'kruskalWallis', 60);
      expect(permKW.statName).toBe('Kruskal-Wallis H');
      expect(src).toContain("statName === 'Kruskal-Wallis H'");

      // #54 sensitivity error propagation in runTest
      expect(src).toContain('if (sensitivity && sensitivity.error)');
    });

    it('#47, #48, #49: stem_tool_dna.js detects Nonsense/Nonstop substitutions, fixes CRISPR guide RNA strand, and guards short-sequence deletions/GC%', () => {
      const src = readSrc('stem_lab/stem_tool_dna.js');

      // #47 Nonsense when premature stop appears earlier than original stop, plus Nonstop
      expect(src).toContain('fullProtein.stop.pos < beforeProtein.stop.pos');
      expect(src).toContain("if (beforeProtein.stop && !fullProtein.stop) return 'Nonstop'");
      expect(src).toContain('if (mutation.effect) return mutation.effect;');

      // #48 CRISPR guide RNA uses CODING_TO_RNA (not DNA_TO_RNA)
      expect(src).toContain("var crisprGuideRNA = selectedPAMSite ? dnaSeq.substring(selectedPAMSite.guideStart, selectedPAMSite.guideEnd).split('').map(function(base) { return CODING_TO_RNA[base] || base; })");

      // #49 Deletion guarded at <= 6 bases and GC/AT divides by Math.max(1, dnaSeq.length)
      expect(src).toContain("if (type === 'deletion' && seq.length <= 6)");
      expect(src).toContain('disabled: dnaSeq.length <= 6');
      expect(src).toContain('Math.max(1, dnaSeq.length)');
    });

    it('#50, #55: stem_tool_fractions.js renders pie SVG in printed worksheets and cleans up equivalence canvas observers on unmount', () => {
      const src = readSrc('stem_lab/stem_tool_fractions.js');
      // #50 printWorksheet embeds inline SVG pie chart for display.type === 'pie'
      const printFn = extractBlock(src, 'var printWorksheet = function()');
      expect(printFn).toContain("p.display.type === 'pie'");
      expect(printFn).toContain('<svg width="56" height="56"');
      expect(printFn).toContain('<path d="M28,28');

      // #55 Equivalence banner canvas cleans up ResizeObserver and AlloStemTheme.onChange
      expect(src).toContain('efCleanupRef');
      expect(src).toContain('efCanvasRef');
      expect(src).toContain('unsubTheme');
      expect(src).toContain('ro.disconnect()');
    });
  });
});
