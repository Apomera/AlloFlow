// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const rootDir = process.cwd();
const modulesDir = path.resolve(rootDir, 'desktop/web-app/node_modules');
const React = require2(path.resolve(modulesDir, 'react'));
const { createRoot } = require2(path.resolve(modulesDir, 'react-dom/client'));
const act = React.act;

function loadModule(relPath) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.React = React;
  window.React = React;
  window.AlloModules = window.AlloModules || {};
  const code = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(code)();
}

describe('Round 6 Wave 22 regressions', () => {
  let host;
  let root;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.id = 'root';
    document.body.appendChild(host);
    root = createRoot(host);
    window.__alloAiSecretsLocked = false;
    window.__alloStudentAiDisabled = false;
    window.__alloQrStudentMode = false;
    window.__alloScrollLockState = { count: 0, overflow: '', prev: '' };
    window.__alloFocusTrapStack = [];
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      try { root.unmount(); } catch (_) {}
    });
    document.body.innerHTML = '';
    delete window.__alloAiSecretsLocked;
    delete window.__alloStudentAiDisabled;
    delete window.__alloQrStudentMode;
    delete window.__alloAiUsable;
    delete window.__alloResolveAiCapability;
    delete window.AlloSpeechPlayer;
  });

  it('ConfirmDialog settles once on rapid double-click, protects nested live regions, and tolerates missing t()', () => {
    loadModule('view_confirm_dialog_module.js');
    const ConfirmDialog = window.AlloModules.ConfirmDialog.ConfirmDialog;
    const liveWrapper = document.createElement('div');
    const liveInner = document.createElement('div');
    liveInner.setAttribute('aria-live', 'polite');
    liveWrapper.appendChild(liveInner);
    host.appendChild(liveWrapper);
    const mountNode = document.createElement('div');
    host.appendChild(mountNode);
    const localRoot = createRoot(mountNode);
    const onConfirm = vi.fn();

    act(() => {
      localRoot.render(React.createElement(ConfirmDialog, {
        confirmDialog: { title: 'Delete item?', message: 'Sure?', confirmText: 'Delete', cancelText: 'Cancel', onConfirm },
        setConfirmDialog: vi.fn(),
        t: null,
      }));
    });

    expect(liveWrapper.hasAttribute('inert')).toBe(false);
    const buttons = Array.from(mountNode.querySelectorAll('button'));
    const confirmBtn = buttons.find((b) => /Delete/.test(b.textContent || ''));
    expect(confirmBtn).toBeTruthy();

    act(() => {
      confirmBtn.click();
      confirmBtn.click();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);

    act(() => localRoot.unmount());
  });

  it('PromptDialog catches throwing validate() and renders an h2 title', () => {
    loadModule('view_prompt_dialog_module.js');
    const PromptDialog = window.AlloModules.PromptDialog.PromptDialog;
    const onConfirm = vi.fn();
    act(() => {
      root.render(React.createElement(PromptDialog, {
        promptDialog: {
          title: 'Enter code',
          defaultValue: 'bad',
          confirmText: 'Submit',
          cancelText: 'Cancel',
          validate: () => { throw new Error('Validator boom'); },
          onConfirm,
        },
        setPromptDialog: vi.fn(),
        t: (k) => k,
      }));
    });

    const heading = host.querySelector('#alloflow-prompt-title');
    expect(heading?.tagName).toBe('H2');
    const submitBtn = Array.from(host.querySelectorAll('button')).find((b) => /Submit/.test(b.textContent || ''));
    act(() => { submitBtn.click(); });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Validator boom');
  });

  it('KeyConceptMap tolerates malformed branches and avoids inline white backgrounds', () => {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.ResizeObserver = globalThis.ResizeObserver;
    loadModule('key_concept_map_module.js');
    const KeyConceptMapView = window.AlloModules.KeyConceptMapView;
    const BranchItem = ({ branch }) => React.createElement('p', null, (branch && branch.title) || '');
    act(() => {
      root.render(React.createElement(KeyConceptMapView, {
        main: 'Ecosystems',
        branches: [null, { title: null, items: ['Producers'] }, { title: 'Consumers', items: ['Herbivores'] }],
        BranchItem,
        t: () => '',
      }));
    });
    expect(host.textContent).toContain('Ecosystems');
    expect(host.textContent).toContain('Consumers');
    const whiteInline = Array.from(host.querySelectorAll('[style]')).filter((el) => /background-color:\s*(rgb\(255,\s*255,\s*255\)|#ffffff)/i.test(el.getAttribute('style') || ''));
    expect(whiteInline.length).toBe(0);
  });

  it('LessonTeachingScript rejects NaN/Infinity text values and clamps step titles to 240 chars', () => {
    loadModule('resource_content_fingerprint_module.js');
    loadModule('lesson_teaching_script_module.js');
    const api = window.AlloModules.LessonTeachingScript;
    const plan = { id: 'p1', type: 'lesson-plan', title: 'Gravity Lesson', config: { gradeLevel: '5th Grade', language: 'English' }, data: { objectives: [Infinity, 'Explain gravity'], directInstruction: 'Launch discussion' } };
    const settings = { grade: '5th Grade', subject: 'science', topic: 'Gravity', scope: 'segment', durationMinutes: 15, goal: 'Explain how gravity pulls objects.', priorKnowledge: Number.NaN, language: 'English', researchEnabled: false };
    const materials = [{ id: 'r1', type: 'simplified', title: 'Reading', data: 'Gravity pulls objects toward Earth with measurable acceleration. Objects with larger mass exert stronger gravitational pull across space.' }];
    const snap = api.captureInputs(plan, settings, materials);
    expect(String(snap.plan?.objectives?.[0] || '')).not.toContain('Infinity');
    expect(String(snap.settings?.priorKnowledge || '')).not.toContain('NaN');
    const longTitle = 'A'.repeat(300);
    const makeStep = (id, title) => ({
      id,
      minutes: 5,
      title,
      teacherSays: 'Look at our reading about gravity. Gravity pulls objects toward Earth with measurable acceleration and keeps planets in orbit around the sun. Point to the example in paragraph one.',
      studentDoes: 'Discuss with a partner how gravity affects falling objects.',
      checkQuestion: 'What does gravity pull objects toward?',
      possibleResponse: 'Gravity pulls objects toward the center of Earth.',
      ifStruggling: 'A likely misconception is confusing weight with mass; point to the first sentence in the reading and reread it together.',
      ifReady: 'Compare Earth gravity to Moon gravity.',
      resourceIds: ['r1'],
      recommendationIds: [],
    });
    const res = api.normalizeScript(JSON.stringify({
      title: 'Gravity Mini-Lesson',
      scope: 'segment',
      durationMinutes: 15,
      steps: [makeStep('s1', longTitle), makeStep('s2', 'Guided practice'), makeStep('s3', 'Check understanding')],
    }), snap, { status: 'disabled', sources: [], warnings: [] });
    expect(res.ok).toBe(false);
    expect(res.errors).toContain('Keep the teaching step title within 240 characters.');
  });

  it('ColdPathScreens fixes StemArtworkHandoff dialog semantics, AdventureCastLobby AI gate, and TranslateModalView whitespace guard', async () => {
    loadModule('view_cold_path_screens_module.js');
    const { StemArtworkHandoffView, AdventureCastLobbyView, TranslateModalView } = window.AlloModules;
    const Icon = () => React.createElement('span');

    // StemArtworkHandoffView renders role="dialog" with allo-docsuite and unconditional lock hook
    act(() => {
      root.render(React.createElement(StemArtworkHandoffView, {
        _alloReadVisualSupportCollection: () => [],
        saveStemArtworkAsVisualSupport: vi.fn(),
        setStemArtworkDestination: vi.fn(),
        setStemArtworkHandoff: vi.fn(),
        setStemArtworkLabel: vi.fn(),
        stemArtworkDestination: 'board:new',
        stemArtworkHandoff: { src: 'data:image/png;base64,abc', title: 'Spiral', sourceTab: 'Pattern' },
        stemArtworkLabel: 'My spiral',
        t: () => '',
      }));
    });
    expect(host.querySelector('[role="dialog"].allo-docsuite')).toBeTruthy();

    // AdventureCastLobbyView blocks AI portrait generation when student QR mode is active
    window.__alloQrStudentMode = true;
    const callImagen = vi.fn().mockResolvedValue('');
    const setData = vi.fn();
    let capturedCastProps = null;
    const MockCastLobby = (p) => {
      capturedCastProps = p;
      return React.createElement('div', { 'data-cast-lobby': '1' });
    };
    act(() => {
      root.render(React.createElement(AdventureCastLobbyView, {
        CastLobby: MockCastLobby,
        adventureState: {
          theme: 'Space',
          characters: [{ id: 'c1', name: 'Nova', role: 'Pilot', portrait: 'data:image/png;base64,abc' }],
        },
        callImagen,
        callGeminiImageEdit: vi.fn(),
        generateAdventureImage: vi.fn(),
        setAdventureState: setData,
        t: () => '',
      }));
    });
    expect(capturedCastProps).toBeTruthy();
    await act(async () => {
      await capturedCastProps.onGeneratePortrait(0);
    });
    expect(callImagen).not.toHaveBeenCalled();

    // TranslateModalView blocks whitespace-only target language
    window.__alloQrStudentMode = false;
    act(() => {
      root.render(React.createElement(TranslateModalView, {
        Languages: Icon,
        X: Icon,
        _alloHostHandlersOptional: () => ({ getTranslationBatchItems: () => ({ items: [{ id: '1', type: 'simplified' }], kind: 'pack' }) }),
        currentUiLanguage: 'English',
        generatedContent: { id: '1', type: 'simplified' },
        handleSetIsTranslateModalOpenToFalse: vi.fn(),
        handleTranslateAction: vi.fn(),
        headerTranslationMode: 'auto',
        isProcessing: false,
        resolveTranslationPolicy: () => ({ mode: 'auto', enabled: false, target: '' }),
        selectedLanguages: ['Spanish'],
        setHeaderTranslationMode: vi.fn(),
        setTargetTranslationLang: vi.fn(),
        setTranslateScope: vi.fn(),
        t: (k) => k,
        targetTranslationLang: '   ',
        translateModalRef: React.createRef(),
        translationMode: 'auto',
        translationTargetChoices: () => ['Spanish'],
      }));
    });
    const translateBtns = Array.from(host.querySelectorAll('button')).filter((b) => /translate\.action_/.test(b.textContent || ''));
    expect(translateBtns.length).toBe(2);
    expect(translateBtns.every((b) => b.disabled)).toBe(true);
  });

  it('ColdPathSurfaces hides secrets when locked, blocks unsafe LMS URLs, and guards ReadThisPagePanel speech race', async () => {
    loadModule('view_cold_path_surfaces_module.js');
    const { AiBackendSettingsView, LmsAuditBannerView, ReadThisPagePanelView } = window.AlloModules;
    const Icon = () => React.createElement('span');

    // AiBackendSettingsView hides Wolfram input when secrets locked and renders h2
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ wolframAppId: 'SECRET-ID' }));
    window.__alloAiSecretsLocked = true;
    act(() => {
      root.render(React.createElement(AiBackendSettingsView, {
        GEMINI_MODELS: [],
        Settings: Icon,
        X: Icon,
        _isCanvasEnv: false,
        aiBackendModalRef: React.createRef(),
        openCanvasRecoveryManager: vi.fn(),
        setShowAIBackendModal: vi.fn(),
        t: () => '',
      }));
    });
    expect(host.querySelector('#ai-canvas-wolfram')).toBeNull();
    expect(host.querySelector('#ai-backend-canvas-title')?.tagName).toBe('H2');

    // LmsAuditBannerView blocks http:// and localhost URLs without calling fetch
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
    const addToast = vi.fn();
    act(() => {
      root.render(React.createElement(LmsAuditBannerView, {
        addToast,
        isPdfDocumentIntakeCurrent: () => true,
        lmsAuditFetchControllerRef: { current: null },
        lmsAuditUrls: ['http://127.0.0.1/secret.pdf', 'https://user:pass@canvas.edu/file.pdf'],
        setGenerationStep: vi.fn(),
        setIsExtracting: vi.fn(),
        setLmsAuditUrls: vi.fn(),
        setPdfAuditResult: vi.fn(),
        setPendingPdfBase64: vi.fn(),
        setPendingPdfFile: vi.fn(),
        startNewPdfAudit: vi.fn(() => 1),
        t: () => '',
      }));
    });
    const docBtns = Array.from(host.querySelectorAll('button')).filter((b) => /secret\.pdf|file\.pdf/.test(b.textContent || ''));
    expect(docBtns.length).toBe(2);
    await act(async () => {
      docBtns[0].click();
      docBtns[1].click();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringMatching(/Blocked unsafe LMS document link/i), 'error');
    fetchSpy.mockRestore();

    // ReadThisPagePanelView omits dangling aria-describedby when off and prevents stale selection completion
    let savedOnEnd = null;
    window.AlloSpeechPlayer = {
      speak: vi.fn((_text, opts) => { savedOnEnd = opts.onEnd; }),
      stop: vi.fn(),
    };
    const origGetSel = window.getSelection;
    window.getSelection = () => ({ toString: () => 'Selected sentence' });
    act(() => {
      root.render(React.createElement(ReadThisPagePanelView, {
        Ear: Icon,
        _readThisPageItemAt: vi.fn(),
        closeReadThisPage: vi.fn(),
        focusNarrationEnabled: false,
        getReadableContent: () => [{ type: 'text', text: 'A'.repeat(120) }],
        readAllReadThisPage: vi.fn(),
        rtpCurrentIndex: -1,
        rtpPanelRef: React.createRef(),
        rtpPlaybackState: 'idle',
        setFocusNarrationEnabled: vi.fn(),
        stopReadThisPage: vi.fn(),
        t: () => '',
        theme: 'dark',
      }));
    });
    const checkbox = host.querySelector('input[type="checkbox"]');
    expect(checkbox.getAttribute('aria-describedby')).toBeNull();
    const selBtn = host.querySelector('#rtp-read-selection-btn');
    act(() => { selBtn.click(); });
    const firstOnEnd = savedOnEnd;
    act(() => { selBtn.click(); });
    expect(selBtn.getAttribute('aria-pressed')).toBe('true');
    // Stale callback from first invocation must not flip aria-pressed off!
    act(() => { firstOnEnd(); });
    expect(selBtn.getAttribute('aria-pressed')).toBe('true');
    window.getSelection = origGetSel;
  });

  it('ConceptMapHandlers guards zero-dim containers, resets group profile fields, and ignores stale lesson-plan calls', async () => {
    loadModule('concept_map_handlers_module.js');
    const api = window.AlloModules.CmapHandlers;

    // Zero-dimension container guard
    let capturedNodes = [];
    await api.handleInitializeMap({
      generatedContent: {
        data: {
          structureType: 'Cause and Effect',
          main: 'Gravity',
          branches: [{ title: 'Causes', items: ['Mass'] }, { title: 'Effects', items: ['Orbit'] }],
        },
      },
      conceptMapNodes: [],
      conceptMapEdges: [],
      mapContainerRef: { current: { offsetWidth: 0, offsetHeight: 0 } },
      hasAutoLayoutRunRef: { current: false },
      setConceptMapNodes: (n) => { capturedNodes = n; },
      setConceptMapEdges: vi.fn(),
      setIsConceptMapReady: vi.fn(),
      parseFlowChartData: vi.fn(),
      handleAutoLayout: vi.fn(),
      warnLog: vi.fn(),
      t: (k) => k,
    });
    expect(capturedNodes.length).toBeGreaterThan(0);
    expect(capturedNodes[0].x).toBeGreaterThanOrEqual(100);

    // Batch roster generation resets omitted fields between groups and does not count false results
    const gradesSeen = [];
    const handleGenerate = vi.fn()
      .mockResolvedValueOnce({ id: 'g1' })
      .mockResolvedValueOnce(false);
    const addToast = vi.fn();
    await api.handleBatchGenerateForRoster(['simplified'], {
      rosterKey: {
        groups: {
          a: { name: 'Group A', profile: { gradeLevel: '3rd' } },
          b: { name: 'Group B', profile: {} },
        },
      },
      history: [],
      inputText: 'Photosynthesis converts sunlight.',
      gradeLevel: '8th',
      leveledTextLanguage: 'English',
      studentInterests: [],
      dokLevel: 'DOK 2',
      leveledTextCustomInstructions: '',
      selectedLanguages: ['English'],
      targetStandards: [],
      useEmojis: false,
      textFormat: 'paragraph',
      setGradeLevel: (g) => gradesSeen.push(g),
      setLeveledTextLanguage: vi.fn(),
      setStudentInterests: vi.fn(),
      setDokLevel: vi.fn(),
      setLeveledTextCustomInstructions: vi.fn(),
      setSelectedLanguages: vi.fn(),
      setTargetStandards: vi.fn(),
      setStandardInputValue: vi.fn(),
      setUseEmojis: vi.fn(),
      setTextFormat: vi.fn(),
      setIsProcessing: vi.fn(),
      setGenerationStep: vi.fn(),
      addToast,
      t: () => '',
      warnLog: vi.fn(),
      handleGenerate,
    });
    expect(gradesSeen).toEqual(['3rd', '8th', '8th']);
    expect(addToast).toHaveBeenCalledWith('Generated 1 resources for 2 groups!', 'success');

    // Lesson plan superseded call does not overwrite newer result and clears generationStep
    let resolveFirst;
    let resolveSecond;
    const callGemini = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));
    const setGeneratedContent = vi.fn();
    const setGenerationStep = vi.fn();
    const baseDeps = {
      inputText: 'Cell division',
      gradeLevel: '7th',
      isIndependentMode: false,
      isParentMode: false,
      currentUiLanguage: 'English',
      leveledTextLanguage: 'English',
      lessonCustomAdditions: '',
      history: [],
      alloBotRef: { current: null },
      setIsProcessing: vi.fn(),
      setGenerationStep,
      setGeneratedContent,
      setActiveView: vi.fn(),
      setHistory: vi.fn(),
      setError: vi.fn(),
      addToast: vi.fn(),
      t: (k) => k,
      callGemini,
      cleanJson: (s) => s,
      safeJsonParse: (s) => JSON.parse(s),
      warnLog: vi.fn(),
      getLessonContext: () => 'ctx',
      getAssetManifest: () => '',
      buildStudyGuidePrompt: () => 'p',
      buildParentGuidePrompt: () => 'p',
      buildLessonPlanPrompt: () => 'p',
      flyToElement: vi.fn(),
    };
    const p1 = api.handleGenerateLessonPlan(true, baseDeps);
    const p2 = api.handleGenerateLessonPlan(true, baseDeps);
    resolveSecond(JSON.stringify({ title: 'Second Plan' }));
    await p2;
    resolveFirst(JSON.stringify({ title: 'Stale First Plan' }));
    const r1 = await p1;
    expect(r1).toBeNull();
    expect(setGeneratedContent).toHaveBeenCalledTimes(1);
    expect(setGeneratedContent.mock.calls[0][0].data.title).toBe('Second Plan');
    expect(setGenerationStep).toHaveBeenLastCalledWith('');
  });
});
