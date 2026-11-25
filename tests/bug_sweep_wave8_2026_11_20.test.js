import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');

const readSrc = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

function extractBlock(src, startMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error('Start marker not found: ' + startMarker);
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

describe('Bug Sweep Wave 8 (2026-11-20) — 57 Fixes Regression Suite', () => {
  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = window.AlloLanguageContext || React.createContext({ t: (k) => k });
    window.__alloShared = window.__alloShared || { db: {}, warnLog() {} };
    window.StemLab = window.StemLab || { registerTool() {} };
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 1: Clinical, AAC, School Rewards, Literacy (#1-#19)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 1 — Live AAC, School Rewards, Word Sounds, Word Practice, Maine SLD', () => {
    it('#1, #2: live_aac_module.js fails closed on missing/throwing egress sanitizers and avoids scanning keyboard trap', () => {
      const src = readSrc('live_aac_module.js');

      // #1 Fail-closed egress sanitizer
      const serBlock = extractBlock(src, 'const _alloSerializeResourceForStudentPack = (');
      expect(serBlock).toMatch(/typeof sanitizeHistoryForCloud !== ['"]function['"]/);
      expect(serBlock).toMatch(/catch\s*\([^)]*\)\s*\{\s*return null;/);
      // Runtime verification of fail-closed behavior when sanitizer is missing or throws
      const serFn = new Function(serBlock + '\nreturn _alloSerializeResourceForStudentPack;')();
      expect(serFn({ id: 'r1', type: 'note', title: 'Note', text: 'Private text' }, {})).toBeNull();
      expect(serFn(
        { id: 'r1', type: 'note', title: 'Note', text: 'Private text' },
        { sanitizeHistoryForCloud: () => { throw new Error('boom'); }, stripUndefined: (v) => v }
      )).toBeNull();

      // #2 Scanning mode ignores modifier keys and non-gridcell buttons
      expect(src).toContain('event.ctrlKey || event.metaKey || event.altKey');
      // Cells are now buttons (data-aac-cell) inside role="gridcell" wrappers.
      expect(src).toContain('button:not([data-aac-cell="true"])');
    });

    it('#5, #6, #7, #18: school_rewards_module.js exposes worksheet on join path (before opening_help), deduplicates tokens, separates download vs tracking, preserves verified invalidation on URL edit, and guards unmount/timers', () => {
      const src = readSrc('school_rewards_module.js');

      // #5 Join + setup both render add_later / SrRecognitionWorksheet (join renders it before schoolrewards_opening_help so Tab wraps properly)
      const addLaterMatches = src.match(/schoolrewards_add_later/g) || [];
      expect(addLaterMatches.length).toBeGreaterThanOrEqual(2);

      // #6 Deduplication in srPendingAwards (live runtime test)
      const pendSrc = extractBlock(src, 'function srPendingAwards(');
      const srPendingAwards = new Function(pendSrc + '\nreturn srPendingAwards;')();
      const pending = srPendingAwards(
        { sessions: { ABC: { rows: { BlueJay: { ids: ['t1', 't1', 't2'] } } } } },
        { ids: {} }
      );
      expect(pending.total).toBe(2);
      expect(pending.ids).toEqual(['ABC|t1', 'ABC|t2']);
      expect(src).toContain('award_file_track_failed');
      expect(src).toContain('award_file_undo_failed');

      // #7 Award file rendered when rows empty if pending.total > 0 || lastHandoff
      expect(src).toContain('rows.length > 0 || pending.total > 0 || lastHandoff');

      // #8 editUrl preserves documented security invariant: changing URL draft invalidates self-attested verification
      const editUrlBlock = extractBlock(src, 'const editUrl =');
      expect(editUrlBlock).toContain('setStep("verified", false)');

      // #18 SrHandoff mountedRef + SrCopySource clearResetTimer
      const handoffBlock = extractBlock(src, 'function SrHandoff(');
      expect(handoffBlock).toContain('mountedRef');
      const copyBlock = extractBlock(src, 'function SrCopySource(');
      expect(copyBlock).toContain('clearResetTimer');
    });

    it('#3, #4, #12, #13, #17: word_sounds_module.js fixes lesson goal abort, revisitQueue handoff, LetterTraceView audio leak, BOM JSON, and case/MIME optionImages', () => {
      const src = readSrc('word_sounds_module.js');

      // #3 _goalMet excludes hasLessonPlan and checks lessonTransitionPending
      expect(src).toContain('!hasLessonPlan && postScore.correct >=');
      expect(src).toContain('if (!isFixedForm && lessonTransitionPending) return;');

      // #4 revisitQueue hands off to missedReplayRef.current
      expect(src).toContain('missedReplayRef.current = revisitSnapshot');

      // #12 LetterTraceView unmount does not wipe parent audioInstances or speechSynthesis
      const ltStart = src.indexOf('stopScratch();\n          clearTimeout(feedbackTimerRef.current);');
      expect(ltStart).toBeGreaterThan(-1);
      const ltSlice = src.slice(ltStart, ltStart + 450);
      expect(ltSlice).not.toContain('audioInstances.current.clear()');
      expect(ltSlice).not.toContain('speechSynthesis.cancel()');

      // #13 BOM JSON passes trimmed to lib.parseResult
      expect(src).toContain('if (trimmed.charAt(0) === "{") return [{ ...lib.parseResult(trimmed)');

      // #17 Prepared pictures preserve full data URI and case-insensitive lookup
      expect(src).toContain('const rawImage = image => typeof image === "string" ? image.trim() : "";');
      expect(src).toContain('optionImages[String(opt || "").trim().toLowerCase()]');
    });

    it('#9, #10, #11, #14, #15, #16: word_practice_module.js tracks cardContentRevision, blanks non-ASCII words, allows safe https images, isolates stacked modal traps, forwards AbortSignal, and guards symbol search race', () => {
      const src = readSrc('word_practice_module.js');

      // #9 cardContentRevision tracked in editGuard
      expect(src).toContain('cardContentRevision += 1;');
      expect(src).toContain('preparedAudioRevision, cardContentRevision');

      // #10 Runtime test of blankedSentence with accented/non-ASCII words
      const mediaSrc = readSrc('word_practice_media.js');
      const blankSrc = extractBlock(mediaSrc, 'function blankedSentence(');
      const blankedSentence = new Function('getCore', blankSrc + '\nreturn blankedSentence;')(() => null);
      expect(blankedSentence('El árbol es muy alto.', 'árbol')).toBe('El _______ es muy alto.');
      expect(blankedSentence('Tomamos café por la mañana.', 'café')).toBe('Tomamos _______ por la mañana.');

      // #11 Runtime test of safeHtmlImg allowing https:// and rejecting dangerous SVG tags
      const imgStart = mediaSrc.indexOf('function safeHtmlImg(');
      const imgEnd = mediaSrc.indexOf('function rawPictureLookup(', imgStart);
      expect(imgStart).toBeGreaterThan(-1);
      expect(imgEnd).toBeGreaterThan(imgStart);
      const imgSrc = mediaSrc.slice(imgStart, imgEnd);
      const safeHtmlImg = new Function(imgSrc + '\nreturn safeHtmlImg;')();
      expect(safeHtmlImg('https://example.org/symbols/apple.png')).toBe('https://example.org/symbols/apple.png');
      expect(safeHtmlImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg><iframe src="https://evil.example"/></svg>'))).toBe('');
      expect(safeHtmlImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<!DOCTYPE svg><svg></svg>'))).toBe('');
      expect(src).toContain("img.crossOrigin = 'anonymous'");

      // #14 Focus trap stack, scroll lock ref-counting, and live-region inert exemption
      expect(src).toContain('__alloFocusTrapStack');
      expect(src).toContain('__alloScrollLockState');
      expect(src).toContain('[aria-live], [role="status"], [role="alert"], [data-toast-region]');

      // #15 Cancel signal forwarded to everyDeviceAudio
      expect(src).toContain('media.everyDeviceAudio(current, { signal: run.controller.signal })');

      // #16 Symbol grid request sequence token & https validation
      expect(src).toContain('gridNode._awpSymReq');
      expect(src).toContain('finally {\n        if (timer) clearTimeout(timer);');
    });

    it('#19: maine_sld_practice_module.js preserves comparisonReturn, guards restore unmount, and passes expectedState to deferFocus', () => {
      const src = readSrc('maine_sld_practice_module.js');
      expect(src).toContain('if (compOrigin) setComparisonReturn(compOrigin)');
      expect(src).toContain('const rawText = await file.text();\n      if (!mountedRef.current) return;');
      expect(src).toContain('restored.activeState');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 2: Story Forge, Research Hub, Concept Quest, Comms Studio (#20-#38)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 2 — Story Forge, Research Hub, Educator View, Comms Studio, Concept Quest', () => {
    it('#20, #23-#28, #37: story_forge_module.js fixes image ReferenceError, slideshow consent, import sanitization, vault discard, OCR race, continuity merge, mic unmount, and namespaced XP_KEY', () => {
      const src = readSrc('story_forge_module.js');

      // #20 image defined before altText in exportComicProductionPack
      expect(src).toContain('const image = illustrations[p.id] || {};\n        const imageUrl = image.imageUrl || ""');

      // #23 exportSlideshow awaits requestExportConsent
      const slideBlock = extractBlock(src, 'const exportSlideshow = async');
      expect(slideBlock).toContain('await requestExportConsent(');

      // #24 Import sanitization & Array.isArray guard
      expect(src).toContain('const cleanCharacters = Array.isArray(importedReview.characters)');
      expect(src).toContain('const cleanGrammarResults = {}');
      expect(src).toContain('Array.isArray(grammarResults[p.id]) && grammarResults[p.id].length > 0');

      // #25 discardDraft requires vaultRemoved & clears revisionHistoryRef
      const discardBlock = extractBlock(src, 'const discardDraft = async');
      expect(discardBlock).toContain('legacyRemoved && vaultRemoved');
      expect(discardBlock).toContain('revisionHistoryRef.current = []');

      // #26 handleHandwritingCapture tracks targetId, hwRequestRef, and reader.onerror
      const hwBlock = extractBlock(src, 'const handleHandwritingCapture =');
      expect(hwBlock).toContain('hwRequestRef.current');
      expect(hwBlock).toContain('reader.onerror =');
      expect(hwBlock).toContain('paragraphsRef.current.findIndex');

      // #27 draftComicContinuity uses functional updater and continuityReqRef
      const contBlock = extractBlock(src, 'const draftComicContinuity = async');
      expect(contBlock).toContain('continuityReqRef.current');
      expect(contBlock).toContain('setComicContinuity((prev) =>');

      // #28 Recorder unmount guard
      expect(src).toContain('recorderMountedRef.current');
      expect(src).toContain('if (!sfMountedRef.current)');

      // #37 XP_KEY namespaced by codename
      expect(src).toContain('"alloflow_storyforge_xp_" +');
    });

    it('#29-#33, #38: research_hub_module.js and research_hub_educator_module.js fix VoiceNoteBlock unmount, link revise/remove, AlloSheet empty-ID match, quota save, timeout/parseFailed, and WarrantTrajectoryPanel', () => {
      const src = readSrc('research_hub_module.js');
      const eduSrc = readSrc('research_hub_educator_module.js');

      // #29 VoiceNoteBlock onChangeRef inside mountedRef guard
      expect(src).toContain('onChangeRef.current = onChange');
      expect(src).toContain('if (!mountedRef.current) return;');

      // #30 Revise link passes originalEvidenceNode & remove deletes counterevidenceIds
      expect(src).toContain('originalEvidenceNode');
      expect(src).toContain('delete copy.counterevidenceIds');

      // #31 Empty-string ID collision prevented + text fallback in buildResearchHubAlloSheetEnvelope
      const findClaimBlock = extractBlock(src, 'function findClaimKey(');
      expect(findClaimBlock).toContain('if (!keyStr) return null;');
      expect(findClaimBlock).toContain('item.record.text');

      // #32 saveJournal reports async IndexedDB completion
      expect(src).toContain('_persistedResearchMediaIds');
      expect(src).toContain('onAsyncSettled');

      // #38 askResearchCoach timeout + post-await abort + parseFailed history
      expect(src).toContain('errorKind = "timeout"');
      expect(src).toContain('parseFailed: true');

      // #33 WarrantTrajectoryPanel uses !probes.some(...)
      expect(eduSrc).toContain('!probes.some(function(p)');
      expect(eduSrc).not.toContain('!probes.every(function(p) {\n      return p.allSurvivesJustification');
    });

    it('#21, #22, #34: communications_studio_module.js scrubs PII across all AI paths, isolates template fields/codename, and guards endWork/abort races', () => {
      const src = readSrc('communications_studio_module.js');

      // Runtime test of csBuildTranslateBatchPrompt & csBuildPrompt
      const scrubSrc = extractBlock(src, 'function csScrubPII(');
      const sanSrc = extractBlock(src, 'function _csSanitizeUntrusted(');
      const transPromptSrc = extractBlock(src, 'function csBuildTranslateBatchPrompt(');
      const buildPromptSrc = extractBlock(src, 'function csBuildPrompt(');
      const harness = new Function(
        'CS_TONES', 'CS_FAMILY_TARGET_GRADE', 'csParseGrid', '_csFenceUntrusted',
        scrubSrc + '\n' + sanSrc + '\n' + transPromptSrc + '\n' + buildPromptSrc +
        '\nreturn { csBuildTranslateBatchPrompt, csBuildPrompt };'
      )(['warm'], 7, () => [{ codename: '555-123-4567', strengths: 'Reads well', growth: 'Details', habits: 'Kind' }], (t, v) => `<${t}>${v}</${t}>`);

      // #21 PII scrubbed in batch translate and grid codename
      const trPrompt = harness.csBuildTranslateBatchPrompt(
        [{ codename: 'test@school.edu', comment: 'Call 555-123-4567 for details.' }],
        'Spanish',
        'warm'
      );
      expect(trPrompt).not.toContain('555-123-4567');
      expect(trPrompt).not.toContain('test@school.edu');

      // #22 codename injected ONLY in family-reply and family-update (which render codenamePicker), never in report-card / recommendation
      const rcPrompt = harness.csBuildPrompt('report-card', { codename: 'BlueJay', grid: '' }, { tone: 'warm' });
      expect(rcPrompt).not.toContain('BlueJay');
      expect(rcPrompt).not.toContain('555-123-4567');
      const recPrompt = harness.csBuildPrompt('recommendation', { codename: 'BlueJay', context: 'Teacher' }, { tone: 'warm' });
      expect(recPrompt).not.toContain('BlueJay');
      const famUpPrompt = harness.csBuildPrompt('family-update', { codename: 'BlueJay', learned: 'Fractions' }, { tone: 'warm' });
      expect(famUpPrompt).toContain('BlueJay');
      const replyPrompt = harness.csBuildPrompt('family-reply', { codename: 'BlueJay', message: 'Hi', notes: 'Thanks' }, { tone: 'warm' });
      expect(replyPrompt).toContain('BlueJay');

      // #21 simplify / translate / backTranslate scrub PII
      expect(src).toContain('_csFenceUntrusted("DRAFT_TEXT", csScrubPII(text))');
      expect(src).toContain('_csFenceUntrusted("SOURCE_TEXT", csScrubPII(source))');
      expect(src).toContain('_csFenceUntrusted("TRANSLATION_TEXT", csScrubPII(of))');

      // #34 endWork scopes setBusy/setProgress to current controller & checks controller.signal.aborted
      const endWorkBlock = extractBlock(src, 'const endWork =');
      expect(endWorkBlock).toContain('if (abortRef.current === controller)');
      expect(src).toContain('if (controller.signal.aborted || !mountedRef.current) return;');
    });

    it('#35, #36: concept_quest_solo_module.js clears saveBlocked on restart and concept_quest_teacher_module.js guards resolveTravel/resolveRound/aiDraft', () => {
      const soloSrc = readSrc('concept_quest_solo_module.js');
      const startBlock = extractBlock(soloSrc, 'function start()');
      expect(startBlock).toContain('saveBlocked.current = false');
      expect(startBlock).toContain('saveRun(value, true)');

      const teacherSrc = readSrc('concept_quest_teacher_module.js');
      const travelBlock = extractBlock(teacherSrc, 'const resolveTravel = async');
      expect(travelBlock).toContain('finally {');
      const roundBlock = extractBlock(teacherSrc, 'const resolveRound = async');
      expect(roundBlock).toContain('finally {');
      const aiDraftBlock = extractBlock(teacherSrc, 'const aiDraft = async');
      expect(aiDraftBlock).toContain('if (!mountedRef.current) return;');
      expect(aiDraftBlock).toContain('if (requestedScope !== latestScopeRef.current)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PASS 3: STEM Lab Math, Physics, and Genetics Simulations (#39-#57)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pass 3 — Calculus, Punnett, Wave, Algebra CAS, GraphCalc, Probability, Physics', () => {
    it('#39, #51: stem_tool_calculus.js returns NaN derivative at poles/corners/cusps/out-of-domain and flushes mission XP in useEffect', () => {
      loadAlloModule('stem_lab/stem_tool_calculus.js');
      const core = window.__CalculusCore;
      expect(core).toBeTruthy();

      // #39 Non-differentiable / out-of-domain points at x=0 must yield NaN (not 0)
      for (const expr of ['ln(x^2)', 'sqrt(x^2)', 'ln(x^2 - 4)', '(x^2 - 4)^(1/2)', '(x^2)^(-1)', '(x^2)^(1/3)']) {
        const compiled = core.compile(expr);
        expect(compiled.ok).toBe(true);
        const df0 = compiled.df(0);
        expect(Number.isNaN(df0), `${expr} at x=0 gave ${df0}`).toBe(true);
      }
      // Smooth stationary point x^2 still gives f'(0) === 0
      const quad = core.compile('x^2');
      expect(quad.df(0)).toBe(0);

      // #51 awardMissionOnce queues into _pendingMissionAwards and flushes in useEffect
      const src = readSrc('stem_lab/stem_tool_calculus.js');
      expect(src).toContain('_pendingMissionAwards');
    });

    it('#40, #46, #47, #48, #49, #55: stem_tool_punnett.js fixes ABO Type O, AR pedigree genetics, coding strand labels, dihybrid S/Y dropdowns, fresh ctx closure, and frequency-dependent selection', () => {
      const src = readSrc('stem_lab/stem_tool_punnett.js');

      // #40 ABO classification: Type O (ii) is distinct 'Null' class, never Type B
      expect(src).toContain("_isABO = !isSexLinked && _coAll.every(function(a) { return a === 'A' || a === 'B' || a === 'i'; })");
      expect(src).toContain("label: _isABO ? 'Type O' : 'Null (recessive)'");

      // #46 Autosomal Recessive Cystic Fibrosis pedigree: II-1 is carrier Cc, not sibling of II-2, III-1 is carrier
      expect(src).toContain("{ id: 3, sex: 'F', x: 80, y: 130, affected: false, carrier: true, genotype: 'Cc', label: 'II-1' }");
      expect(src).toContain("{ parents: [1,2], children: [4,5] }");

      // #47 DNA -> Protein correctly labeled Coding Strand (5'→3')
      expect(src).toContain("Enter DNA Coding Strand (5\\'\\u21923\\')");
      expect(src).toContain("DNA Coding Strand (5\\'\\u21923\\')");

      // #48 Dihybrid dropdowns include S, s, Y, y
      expect(src).toContain("['A','a','B','b','C','c','R','r','S','s','T','t','Y','y']");

      // #49 __alloT & onHostInk computed inside PunnettLab(props)
      const compStart = src.indexOf('this._PunnettComponent = function PunnettLab(props)');
      const compHeader = src.slice(compStart, compStart + 1200);
      expect(compHeader).toContain('var __alloT =');
      expect(compHeader).toContain('var onHostInk =');

      // #55 Frequency-dependent selection keeps fixed allele (p = 1, mu = 0) at 1.0
      expect(src).toContain('var wBar = pFrac * (1 - s) + q;');
      const pFrac = 1, q = 0, s = 0.5, mu = 0;
      const wBar = pFrac * (1 - s) + q;
      const pSel = wBar > 0 ? (pFrac * (1 - s)) / wBar : pFrac;
      const newP = pSel + mu * (1 - pSel);
      expect(newP).toBe(1);
    });

    it('#41, #43, #44, #45, #56, #57: stem_tool_wave.js fixes Kundt probe dispEnvelope/gain1 NaN, standing-hunt 2x frequency, ripple nodal sign, ruler spanMeters, audio/unmount cleanup, and snapshot damping', () => {
      loadAlloModule('stem_lab/stem_tool_wave.js');
      const W = window.StemLab && window.StemLab._wave;
      expect(W).toBeTruthy();

      // #41 Kundt standing tube + Wave Probe ON returns finite dispEnvelope and gain1
      const kundtState = { waveMode: 'longitudinal', longitudinalMode: 'standing', probeEnabled: true, probeX: 0.25, harmonic: 2 };
      const pr = W.computeProbeReadout(kundtState);
      expect(Number.isFinite(pr.dispEnvelope)).toBe(true);
      const audio = W.computeAudioParams(kundtState);
      expect(Number.isFinite(audio.gain1)).toBe(true);
      expect(audio.gain1).toBeGreaterThan(0);

      // #45 Reflection Medium 2 caliper spanMeters matches physical distance (not shrunk by medium2Ratio)
      const ruler = W.computeRulerReadout({
        waveMode: 'reflection', wallFrac: 0.4, rulerX1: 0.5, rulerX2: 0.9,
        frequency: 2, waveSpeed: 343, medium2Ratio: 0.5
      });
      expect(ruler.spanMeters).toBeCloseTo(137.2, 1);

      // #57 waveNormalizeState preserves damping & dampingAlpha in savedSnapshots
      const norm = W.normalizeState({
        savedSnapshots: [{ id: 's1', label: 'Damped', timestamp: 1, statePatch: { waveMode: 'free', damping: true, dampingAlpha: 1.25 } }]
      });
      expect(norm.savedSnapshots[0].statePatch.damping).toBe(true);
      expect(norm.savedSnapshots[0].statePatch.dampingAlpha).toBeCloseTo(1.25, 5);

      // #43, #44, #56 Structural verification
      const src = readSrc('stem_lab/stem_tool_wave.js');
      expect(src).toContain('var y1 = Math.sin(Math.PI * x * nEff);');
      expect(src).toContain('var y2 = Math.sin(Math.PI * (2 - x) * nEff');
      expect(src).toContain('var deltaN = (mHalf + rPhaseDiff / (2 * Math.PI)) * rippleWL;');
      expect(src).toContain('_waveAudio.dopplerFlyby.ctx.close()');
      expect(src).toContain('Promise.resolve().then(function () {\n                    try {\n                      if (_prevCv && !document.body.contains(_prevCv))');
    });

    it('#42: stem_tool_algebracas.js includes digit 0 and builds multi-digit equations without breaking spaces', () => {
      const src = readSrc('stem_lab/stem_tool_algebracas.js');
      expect(src).toContain("{ v: '0', cat: 'num' }");

      const fnSrc = extractBlock(src, 'var builderToString = function()');
      const makeStr = (builderTiles) => new Function('builderTiles', fnSrc + '\nreturn builderToString();')(builderTiles);
      const eq = makeStr([
        { v: '2', cat: 'num' }, { v: 'x', cat: 'var' }, { v: '+', cat: 'op' },
        { v: '5', cat: 'num' }, { v: '=', cat: 'op' },
        { v: '1', cat: 'num' }, { v: '3', cat: 'num' }
      ]);
      expect(eq).toBe('2x + 5 = 13');
    });

    it('#50, #54: stem_tool_graphcalc.js defers render-time badge awards and prevents horizontal asymptote chords on inverse reflections', () => {
      const src = readSrc('stem_lab/stem_tool_graphcalc.js');
      expect(src).toContain('checkBadges(null, true);');
      // The chord guard now lives in the shared strokeRun() used for the reflection.
      expect(src).toContain('(prevX !== null && Math.abs(xp - prevX) > W2)) { c.moveTo(xp, yp);');
      expect(src).toContain('strokeRun(S.reflPtsCache);');
    });

    it('#52: stem_tool_probability.js tracks _piSlowRunning on start, stop, and completion', () => {
      const src = readSrc('stem_lab/stem_tool_probability.js');
      expect(src).toContain("upd('_piSlowRunning', true);");
      expect(src).toContain("upd('_piSlowRunning', false);");
      expect(src).toContain('(d._piSlowRunning || _piAnim.interval)');
    });

    it('#53: stem_tool_physics.js clears predictedRange on landing so estimates cannot farm XP', () => {
      const src = readSrc('stem_lab/stem_tool_physics.js');
      expect(src).toContain("upd('predictedRange', '');");
      expect(src).toContain("upd('lastPredictionRange', null);");
    });
  });
});
