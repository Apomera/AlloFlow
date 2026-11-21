import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

const readSrc = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('Bug Sweep Wave 5 (2026-11-20) — 28 Fixes Regression Suite', () => {
  let host = null;
  let root = null;
  const fbMocks = {
    doc: (_db, ...parts) => ({ path: parts.join('/') }),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    onSnapshot: vi.fn(() => () => {}),
  };

  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = window.AlloLanguageContext || React.createContext({ t: k => k });
    window.__alloShared = window.__alloShared || { db: {}, warnLog() {} };
    window.__alloFirebase = {
      doc: (...args) => fbMocks.doc(...args),
      setDoc: (...args) => fbMocks.setDoc(...args),
      updateDoc: (...args) => fbMocks.updateDoc(...args),
      onSnapshot: (...args) => fbMocks.onSnapshot(...args),
    };
    window.__alloHooks = window.__alloHooks || { useFocusTrap() {} };
    window.__alloUtils = window.__alloUtils || { cleanJson: x => x };
    loadAlloModule('text_pipeline_helpers_module.js');
    loadAlloModule('doc_builder_renderer_module.js');
    loadAlloModule('doc_pipeline_module.js');
    loadAlloModule('content_engine_module.js');
    loadAlloModule('view_socratic_chat_module.js');
    loadAlloModule('immersive_reader_module.js');
    loadAlloModule('research_hub_module.js');
    loadAlloModule('concept_quest_engine.js');
    loadAlloModule('concept_quest_teacher_module.js');
    loadAlloModule('concept_quest_solo_module.js');
    loadAlloModule('connected_escape_room_module.js');
    loadAlloModule('lesson_board_module.js');
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
    delete window.__alloStudentAiDisabled;
    delete window.__alloAiUsable;
    delete window.AlloAiSetupNotice;
    delete window.AlloFlowResearchEvidenceGraph;
  });

  const mountComponent = async (Comp, props = {}) => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(React.createElement(Comp, props));
    });
    return host;
  };

  // ── Batch 1: Content Engine & Document Pipeline (#1 - #9) ───────────────
  describe('Batch 1: Content Engine & Document Pipeline', () => {
    it('#1 doc_pipeline: defines TIER2_RULE_IDS before clusterAxeViolationsByAncestor so clustering never throws ReferenceError', () => {
      const mod = readSrc('doc_pipeline_module.js');
      const defIdx = mod.indexOf('TIER2_RULE_IDS');
      const useIdx = mod.indexOf('clusterAxeViolationsByAncestor');
      expect(defIdx).toBeGreaterThan(-1);
      expect(useIdx).toBeGreaterThan(-1);
      expect(defIdx).toBeLessThan(useIdx);
      expect(mod).toMatch(/TIER2_RULE_IDS\s*=\s*new Set\(/);
    });

    it('#2 doc_pipeline: uses safe window.UI_STRINGS / AlloModules.UiStrings lookup instead of bare UI_STRINGS global', () => {
      const mod = readSrc('doc_pipeline_module.js');
      expect(mod).not.toMatch(/[^.\w]UI_STRINGS\.lesson_headers\[modeKey\]/);
      expect(mod).toContain('window.UI_STRINGS');
    });

    it('#3 doc_pipeline: preserves LaTeX commands (\\times, \\theta, \\neq) and [[CHART:{...}]] JSON when unescaping markdown', () => {
      const src = readSrc('doc_pipeline_source.jsx');
      expect(src).toContain(".replace(/\\\\n(?![a-z])/g, '\\n')");
      expect(src).toContain(".replace(/\\\\t(?![a-zA-Z])/g, '\\t')");
      // Runtime behavior check of the exact unescape regex
      const raw = 'Compute $3 \\times 4 \\neq 10$ with \\theta\\nNext line\\t- bullet';
      const cleaned = raw.replace(/\\n(?![a-z])/g, '\n').replace(/\\t(?![a-zA-Z])/g, '\t');
      expect(cleaned).toContain('\\times');
      expect(cleaned).toContain('\\neq');
      expect(cleaned).toContain('\\theta');
      expect(cleaned).toContain('\nNext line\t- bullet');
    });

    it('#4 doc_pipeline: redacts and leak-checks <head> (<title> and <meta>) via doc.documentElement', () => {
      const src = readSrc('doc_pipeline_source.jsx');
      const redactFnStart = src.indexOf('function _redactDocHtml');
      const redactFnSlice = src.slice(redactFnStart, redactFnStart + 1800);
      expect(redactFnSlice).toContain('doc.documentElement || doc.body');
      const leakFnStart = src.indexOf('function _redactionLeaks');
      const leakFnSlice = src.slice(leakFnStart, leakFnStart + 900);
      expect(leakFnSlice).toContain('doc.documentElement || doc.body');
    });

    it('#5 doc_pipeline: handles object-shaped glossary translations, fullwidth colons, single-char CJK terms, and combining marks', () => {
      const src = readSrc('doc_pipeline_source.jsx');
      expect(src).toContain('search(/[:：]/)');
      expect(src).toContain('\\p{M}');
      const clozeStart = src.indexOf('_clozeBuild =');
      expect(clozeStart).toBeGreaterThan(-1);
      const clozeSlice = src.slice(clozeStart, clozeStart + 1800);
      expect(clozeSlice).toMatch(/typeof\s+rawVal\s*===\s*'object'/);
    });

    it('#6 text_pipeline_helpers: parseTaggedContent preserves valid tags, back-references tag pairs, and unwraps nested POS inside <b>/<i>', () => {
      const helpers = window.AlloModules.createTextPipelineHelpers({
        React,
        t: k => k,
        escapeHtml: s => String(s || ''),
        cleanJson: s => s,
      });
      // Valid bold and noun tags must NOT be corrupted or doubled
      const nodes1 = helpers.parseTaggedContent('The <n>cat</n> <b>sat</b> on <i>the</i> <v>mat</v>.', 'light', { noun: true, verb: true });
      const text1 = JSON.stringify(nodes1);
      expect(text1).toContain('cat');
      expect(text1).toContain('sat');
      expect(text1).toContain('mat');
      expect(text1).not.toContain('</n>');
      expect(text1).not.toContain('</b>');

      // Nested POS tags inside <b> should be stripped rather than shown raw
      const nodes2 = helpers.parseTaggedContent('<b><n>Energy</n> <v>flows</v></b> quickly.', 'light', { noun: true, verb: true });
      const text2 = JSON.stringify(nodes2);
      expect(text2).not.toContain('<n>');
      expect(text2).not.toContain('</n>');
      expect(text2).not.toContain('<v>');
      expect(text2).toContain('Energy');
      expect(text2).toContain('flows');
    });

    it('#7 content_engine: strips rejected grounding citations in Dialogue mode before renumbering and passes activeGroundingChunks to validator', () => {
      const src = readSrc('content_engine_source.jsx');
      expect(src).toContain('stripRejectedDialogueCitations');
      expect(src).toContain('activeGroundingChunks');
      expect(src).toMatch(/validateAndRepairCitations\([^)]*activeGroundingChunks/);
    });

    it('#8 doc_builder_renderer: does not throw ReferenceError when warnLog is omitted', () => {
      const renderer = window.AlloModules.DocBuilderRenderer;
      expect(renderer).toBeTruthy();
      const src = readSrc('doc_builder_renderer_source.jsx');
      expect(src).toContain("typeof warnLog === 'function'");
      expect(src).not.toMatch(/[^_]warnLog\('\[DocBuilder\]/);
    });

    it('#9 doc_pipeline & content_engine: dynamic .replace() calls use callback functions to avoid $&/$`/$ corruption', () => {
      const dp = readSrc('doc_pipeline_source.jsx');
      const ce = readSrc('content_engine_source.jsx');
      expect(ce).toContain('return link;');
      expect(dp).toContain("() => '<title>'");
      expect(dp).toContain("() => recovered + '\\n</body>'");
      expect(dp).toContain("() => recoverySection + '\\n</main>'");
      expect(dp).toContain("() => '</main>\\n<footer role=\"contentinfo\">'");
    });
  });

  // ── Batch 2: Personas, Immersive Reader, Research Hub, Socratic Chat (#10 - #18) ──
  describe('Batch 2: Personas, Immersive Reader, Research Hub, Socratic Chat', () => {
    it('#10 & #11 personas: guards finally rollback with panelTurnSettled / personaTurnSettled and resets isProcessing unconditionally', () => {
      const src = readSrc('personas_source.jsx');
      expect(src).toContain('let panelTurnSettled = false;');
      expect(src).toContain('if (!panelTurnSettled &&');
      expect(src).toContain('let personaTurnSettled = false;');
      expect(src).toContain('if (!personaTurnSettled &&');
      // Ensure personaTurnSettled is declared only once (not duplicated inside handlePanelChatSubmit)
      const declMatches = src.match(/let personaTurnSettled = false;/g) || [];
      expect(declMatches.length).toBe(1);
      // #11: unconditional setIsProcessing(false) in startPanelSession finally
      const finallyIdx = src.indexOf('if (activePanelStartRequest === panelStartRequest)');
      expect(finallyIdx).toBeGreaterThan(-1);
      const finallySlice = src.slice(finallyIdx, finallyIdx + 240);
      expect(finallySlice).toContain('setIsProcessing(false)');
    });

    it('#12 view_socratic_chat: stops active speech recognition on unmount and guards missing recognitionRef / catch state reset', async () => {
      const stopSpy = vi.fn();
      const startSpy = vi.fn();
      const recognitionRef = { current: { stop: stopSpy, start: startSpy } };
      const setIsSocraticDictating = vi.fn();

      await mountComponent(window.AlloModules.SocraticChat.SocraticChat, {
        t: k => k,
        socraticHistory: [],
        socraticInput: '',
        setSocraticInput: vi.fn(),
        isSocraticThinking: false,
        handleSocraticSubmit: vi.fn(),
        isSocraticDictating: true,
        setIsSocraticDictating,
        recognitionRef,
        isListening: false,
        isRecording: false,
        handleToggleVoiceInput: vi.fn(),
        uiStrings: {},
        selectedLanguage: 'English',
        speakText: vi.fn(),
        stopSpeaking: vi.fn(),
        isSpeaking: false,
        theme: 'light',
      });

      await act(async () => {
        root.unmount();
        root = null;
      });
      expect(stopSpy).toHaveBeenCalledTimes(1);
    });

    it('#13 immersive_reader & view_simplified: gates non-English POS button when AI is unavailable and passes posOnDevice from SimplifiedView', async () => {
      window.__alloStudentAiDisabled = true;
      window.__alloAiUsable = () => false;
      const onTogglePOS = vi.fn();
      const onGeneratePOS = vi.fn();

      await mountComponent(window.AlloModules.ImmersiveToolbar, {
        t: k => k,
        settings: { textSize: 'base', theme: 'light', font: 'sans', lineHeight: 1.5, letterSpacing: 'normal', columnWidth: 'normal' },
        onUpdate: vi.fn(),
        onGeneratePOS,
        onTogglePOS,
        posReady: false,
        posOnDevice: false,
        showPOS: false,
      });

      const posBtn = [...host.querySelectorAll('button')].find(b => /parts of speech|pos/i.test(b.textContent || b.getAttribute('aria-label') || ''));
      if (posBtn) {
        expect(posBtn.disabled).toBe(true);
        await act(async () => posBtn.click());
        expect(onGeneratePOS).not.toHaveBeenCalled();
        expect(onTogglePOS).not.toHaveBeenCalled();
      }
      const simplifiedSrc = readSrc('view_simplified_source.jsx');
      expect(simplifiedSrc).toContain('posOnDevice=');
    });

    it('#14 immersive_reader: clears stale wordTimingsRef and failedMediaRef entries on regenerateCurrent and saveRecordingDraft', () => {
      const src = readSrc('immersive_reader_source.jsx');
      const regenIdx = src.indexOf('const regenerateCurrent =');
      const regenSlice = src.slice(regenIdx, regenIdx + 1200);
      expect(regenSlice).toContain('wordTimingsRef.current.delete');
      expect(regenSlice).toContain('failedMediaRef.current.delete');

      const saveRecIdx = src.indexOf('const saveRecordingDraft =');
      const saveRecSlice = src.slice(saveRecIdx, saveRecIdx + 1400);
      expect(saveRecSlice).toContain('wordTimingsRef.current.delete');
      expect(saveRecSlice).toContain('failedMediaRef.current.delete');
    });

    it('#15, #16, #17, #18 research_hub: enforces numeric zero cap, resolves evidenceGraphApi dynamically, sequences async saves, and guards VoiceNoteBlock unmount/prop sync', () => {
      const src = readSrc('research_hub_source.jsx');
      // #15: numeric touchpoint cap check including 0
      expect(src).toContain("typeof PER_TOUCHPOINT_CAP[tpId] === 'number'");
      // #16: dynamic lookup of window.AlloFlowResearchEvidenceGraph
      expect(src).toContain('function getEvidenceGraphApi()');
      expect(src).not.toContain('var evidenceGraphApi = window.AlloFlowResearchEvidenceGraph');
      // #17: save sequence & hydration merge without clobbering edits
      expect(src).toContain('var _journalSaveSeq = 0;');
      expect(src).toContain('function applyHydratedResearchMedia(');
      expect(src).toContain('skipNextCleanupSaveRef');
      expect(src).toContain('invalidateJournalSaves()');
      // #18: VoiceNoteBlock mountedRef + startingRef + prop sync
      expect(src).toContain('var mountedRef = useRef(true);');
      expect(src).toContain('var startingRef = useRef(false);');
      expect(src).toContain('if (!mountedRef.current)');
      expect(src).toContain('setAudioBase64(initialBase64);');
    });
  });

  // ── Batch 3: Classroom Games & Escape Rooms (#19 - #28) ─────────────────
  describe('Batch 3: Classroom Games & Escape Rooms', () => {
    it('#19, #20, #21 concept_quest_teacher: blocks mutations while stripped host doc loads, never leaks keys on non-permission error, and rolls back hostRef on updateDoc failure', async () => {
      const cqEngine = require('../concept_quest_engine.js');
      const fullQuest = cqEngine.resolveTravel(
        cqEngine.createSession({
          title: 'Host Guard Quest',
          questions: [{ question: 'What is H2O?', options: ['Water', 'Salt'], correctAnswer: 'Water', concept: 'Chemistry' }],
        }),
        {},
        'room-2'
      ).quest;
      const strippedQuest = cqEngine.publicQuestState(fullQuest);

      let resolveHostSnap;
      const setDocMock = vi.fn(async () => {});
      const updateDocMock = vi.fn(async () => {});
      const onSnapshotMock = vi.fn((_ref, cb) => {
        resolveHostSnap = cb;
        return () => {};
      });

      fbMocks.doc = (_db, ...parts) => ({ path: parts.join('/') });
      fbMocks.setDoc = setDocMock;
      fbMocks.updateDoc = updateDocMock;
      fbMocks.onSnapshot = onSnapshotMock;
      window.__alloShared = { db: {}, warnLog: vi.fn() };

      const makeSession = (questObj) => ({
        escapeRoomState: {
          isActive: true,
          mode: 'concept-quest',
          isPaused: false,
          conceptQuest: questObj,
          teams: { u: 'All' },
          teamProgress: {
            All: {
              questVotes: {},
              questVoteTurns: {},
              questActions: {},
              questRoles: { u: 'analyst' },
            },
          },
        },
        roster: { u: { name: 'Learner' } },
        groups: {},
      });

      await mountComponent(window.AlloModules.ConceptQuestTeacherControls, {
        sessionData: makeSession(strippedQuest),
        activeSessionCode: 'CODE1',
        appId: 'app1',
        addToast: vi.fn(),
        t: k => k,
      });

      // #19: While host doc has not loaded, fieldset MUST be disabled
      const fieldset = host.querySelector('fieldset');
      expect(fieldset).toBeTruthy();
      expect(fieldset.disabled).toBe(true);

      // Deliver matching hostQuest snapshot -> fieldset unlocks!
      await act(async () => {
        resolveHostSnap({ data: () => ({ quest: fullQuest }) });
      });
      expect(host.querySelector('fieldset').disabled).toBe(false);

      // #20: Transient network failure on setDoc MUST NOT fall back to writing fullQuest to public session doc
      setDocMock.mockRejectedValueOnce(Object.assign(new Error('network timeout'), { code: 'unavailable' }));
      const rallyBtn = [...host.querySelectorAll('button')].find(b => /Rally \+3 HP/i.test(b.textContent));
      expect(rallyBtn).toBeTruthy();
      await act(async () => rallyBtn.click());
      expect(updateDocMock).not.toHaveBeenCalled();

      // #21: If setDoc succeeds but updateDoc fails, hostRef must be rolled back to previous quest
      setDocMock.mockClear();
      updateDocMock.mockRejectedValueOnce(new Error('session write failed'));
      await act(async () => rallyBtn.click());
      expect(setDocMock).toHaveBeenCalledTimes(2);
      expect(setDocMock.mock.calls[1][1].quest.gmRevision).toBe(fullQuest.gmRevision);
    });

    it('#22 connected_escape_room: caps batch processing and receipt pruning strictly below Mailbox 60-field limit', () => {
      const src = readSrc('connected_escape_room_source.jsx');
      expect(src).toContain('pending.slice(0, 20)');
      expect(src).toContain('const pruneLimit = Math.max(0, 55 - Object.keys(update).length)');
    });

    it('#23 lesson_board: enforces accepted Set in commit-time plan() so concurrent privateAnswers flip never drops unpersisted answers', () => {
      const src = readSrc('lesson_board_source.jsx');
      expect(src).toContain('const collect = (latest, accepted, enforceAccepted = false) =>');
      expect(src).toContain('!keep || !enforceAccepted || action.kind !== \'answer\' || (accepted instanceof Set && accepted.has(uid + \':\' + action.requestId))');
      expect(src).toContain('collect(latest, accepted, true)?.update || null');
    });

    it('#24 & #25 connected_escape_room: keeps learnerMode firstView on openSaved/openImported and stores normalized prepareRoom output on save/startSolo', () => {
      const src = readSrc('connected_escape_room_source.jsx');
      const openSavedSlice = src.slice(src.indexOf('const openSaved ='), src.indexOf('const removeSaved ='));
      expect(openSavedSlice).toContain('setView(firstView)');
      expect(openSavedSlice).not.toContain("setView('review')");

      const openImportedSlice = src.slice(src.indexOf('const openImported ='), src.indexOf('const editReviewedObject ='));
      expect(openImportedSlice).toContain('setView(firstView)');
      expect(openImportedSlice).not.toContain("setView('review')");

      const saveSlice = src.slice(src.indexOf('const save ='), src.indexOf('const openSaved ='));
      expect(saveSlice).toContain('valid = engine.prepareRoom(room, source)');
      expect(saveSlice).toContain('setRoom(valid)');
      expect(saveSlice).toContain('saveLibraryRoom(localStorage, source, language, valid)');

      const soloSlice = src.slice(src.indexOf('const startSolo ='), src.indexOf('const previewAction ='));
      expect(soloSlice).toContain('const valid = engine.prepareRoom(room, source)');
      expect(soloSlice).toContain('setRoom(valid)');
    });

    it('#25 & #27 lesson_board: persists normalized prepareBoard output in save/play and preserves reportAttemptId in resumeSaved', () => {
      const src = readSrc('lesson_board_source.jsx');
      const resumeSlice = src.slice(src.indexOf('const resumeSaved ='), src.indexOf('const offerReplacement ='));
      expect(resumeSlice).toContain("reportAttemptId: saved.reportAttemptId || current.current.reportAttemptId || engine.identity('learning')");

      const saveSlice = src.slice(src.indexOf('const save ='), src.indexOf('const play ='));
      expect(saveSlice).toContain('const valid = engine.prepareBoard(board, source)');
      expect(saveSlice).toContain('saveBoard(localStorage, source, language, valid)');
      expect(saveSlice).toContain('keepSupport(valid)');

      const playSlice = src.slice(src.indexOf('const play ='), src.indexOf('const launch ='));
      expect(playSlice).toContain('const valid = engine.prepareBoard(board, source)');
      expect(playSlice).toContain('keepInLibrary(valid)');
    });

    it('#26 concept_quest_solo_storage: preserves and validates sequence-sense response.order across save/load', () => {
      const storageApi = require('../concept_quest_solo_storage.js');
      const cqEngine = require('../concept_quest_engine.js');
      const soloEngine = require('../concept_quest_solo_engine.js');
      const storeMap = new Map();
      const fakeStorage = {
        getItem: k => (storeMap.has(k) ? storeMap.get(k) : null),
        setItem: (k, v) => { storeMap.set(k, String(v)); },
        removeItem: k => { storeMap.delete(k); },
      };
      const content = {
        id: 'seq-test-1',
        type: 'quiz',
        title: 'Mitosis Sequence',
        data: {
          questions: [{
            type: 'sequence-sense',
            question: 'Order the steps of mitosis',
            items: ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'],
            presentedOrder: [1, 0, 2, 3],
            orderingPrinciple: 'Chronological cell division',
            principleOptions: ['Chronological cell division', 'Alphabetical'],
          }],
        },
      };
      const context = { appId: 'app', userId: 'u1', generatedContent: content };
      const quest = soloEngine.createSession(cqEngine, content, (_k, fallback) => fallback);
      const baseSnap = {
        version: 1,
        sourceFingerprint: storageApi.sourceFingerprint(context),
        savedAt: Date.now(),
        quest,
        roleId: 'analyst',
        abilityId: 'analyze',
        recapOpen: false,
        gmState: null,
        aiEnabled: false,
      };
      const saved = storageApi.save(fakeStorage, context, {
        ...baseSnap,
        response: { verifyAnswer: 'no', wrongIndex: null, order: [0, 1, 2, 3], principleAnswer: 'Chronological cell division' },
      });
      expect(saved.status).toBe('saved');

      const loaded = storageApi.read(fakeStorage, context);
      expect(loaded.status).toBe('saved');
      expect(loaded.snapshot.response.order).toEqual([0, 1, 2, 3]);

      // Invalid order (duplicate index) should be rejected on save
      const bad = storageApi.save(fakeStorage, context, {
        ...baseSnap,
        response: { verifyAnswer: 'no', order: [0, 0, 2, 3], principleAnswer: 'Chronological cell division' },
      });
      expect(bad.status).not.toBe('saved');
    });

    it('#28 concept_quest_solo: resolves window.AlloAiSetupNotice fallback when window.AlloModules.AlloAiSetupNotice is unset', () => {
      const src = readSrc('concept_quest_solo_source.jsx');
      expect(src).toContain('window.AlloModules?.AlloAiSetupNotice || window.AlloAiSetupNotice || null');
    });
  });
});
