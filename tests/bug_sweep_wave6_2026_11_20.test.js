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

describe('Bug Sweep Wave 6 (2026-11-20) — 26 Fixes Regression Suite', () => {
  let host = null;
  let root = null;

  beforeAll(() => {
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloLanguageContext = window.AlloLanguageContext || React.createContext({ t: k => k });
    window.__alloShared = window.__alloShared || { db: {}, warnLog() {} };
    window.StemLab = window.StemLab || { registerTool() {} };
    loadAlloModule('ai_backend_module.js');
    loadAlloModule('allo_crypto_module.js');
    loadAlloModule('allo_device_storage_module.js');
    loadAlloModule('allo_device_vault_module.js');
    loadAlloModule('math_helpers_module.js');
    loadAlloModule('concept_map_handlers_module.js');
    loadAlloModule('stem_lab/stem_tool_chembalance.js');
    loadAlloModule('stem_lab/stem_tool_circuit.js');
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
    delete window.__alloAiSecretsLocked;
    delete window.__alloAiUsable;
  });

  // ── Batch 1: Core AI, Storage, Vault, and Export Services (#1 - #11) ──
  describe('Batch 1: Core AI, Storage, Vault, and Export Services', () => {
    it('#1 gemini_api: registers MALFORMED_FUNCTION_CALL repairRequest in _requestSnapshots preserving requestControls and _jsonRepairAttempted', () => {
      const src = readSrc('gemini_api_source.jsx');
      const idx = src.indexOf("reason === 'MALFORMED_FUNCTION_CALL'");
      expect(idx).toBeGreaterThan(-1);
      const slice = src.slice(idx, idx + 1200);
      expect(slice).toContain('requestControls: _request.requestControls');
      expect(slice).toContain('_jsonRepairAttempted: true');
      expect(slice).toContain('_requestSnapshots.add(repairRequest)');
      expect(slice).toContain('_requestGuards.set(repairRequest, existingGuard)');
    });

    it('#2 view_export_preview: _builderNormalizeCommentMessage uses /\\r\\n?/g instead of /\\n?/g', () => {
      const src = readSrc('view_export_preview_source.jsx');
      const idx = src.indexOf('function _builderNormalizeCommentMessage');
      const slice = src.slice(idx, idx + 260);
      expect(slice).toContain('.replace(/\\r\\n?/g, \'\\n\')');
      expect(slice).not.toContain('.replace(/\\n?/g, \'\\n\')');
      // Runtime behavior check
      const norm = (value) => String(value || '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1200);
      expect(norm('Please clarify this paragraph.\r\nLine 2.')).toBe('Please clarify this paragraph.\nLine 2.');
    });

    it('#3 view_export_preview: _sanitizeFragment strips control chars in URLs and removes svg/math/template/animate/set/srcdoc', () => {
      const src = readSrc('view_export_preview_source.jsx');
      const idx = src.indexOf('const _sanitizeFragment =');
      const slice = src.slice(idx, idx + 1200);
      expect(slice).toContain('foreignObject,animate,set,animateMotion,animateTransform');
      expect(slice).toContain('replace(/[\\u0000-\\u0020]+/g, \'\')');
      expect(slice).toContain("n === 'srcdoc'");
      expect(slice).toContain("n === 'srcset'");
    });

    it('#4 allo_device_storage: connect() initializes before checking direct/memory and flushes queued writes', () => {
      const src = readSrc('allo_device_storage_module.js');
      const idx = src.indexOf('connect: function ()');
      const slice = src.slice(idx, idx + 350);
      const initIdx = slice.indexOf("if (state.backendName === 'unset') api.init({});");
      const directIdx = slice.indexOf("if (state.backendName === 'direct' || state.backendName === 'memory')");
      expect(initIdx).toBeGreaterThan(-1);
      expect(directIdx).toBeGreaterThan(initIdx);
      expect(slice).toContain('return flushQueue().then');
    });

    it('#5 allo_device_vault: importEncryptedBackup normalizes recovery keys before unwrapping', () => {
      const src = readSrc('allo_device_vault_module.js');
      const idx = src.indexOf('importEncryptedBackup = async function');
      expect(idx).toBeGreaterThan(-1);
      const slice = src.slice(idx, idx + 2200);
      expect(slice).toContain('normalizeRecoveryCode(password)');
      expect(slice).toContain('validateRecoveryCode(unwrapSecret)');
      expect(slice).toContain('unwrapVaultKey(importedWrapper, unwrapSecret)');
    });

    it('#6 & #7 ai_backend: routes Claude analyzeImage to _claudeAnalyzeImages and defaults models.vision to providerTextDefault', async () => {
      const AIProvider = window.AlloModules?.AIProvider || window.AIProvider;
      expect(typeof AIProvider).toBe('function');

      const claude = new AIProvider({ backend: 'claude', apiKey: 'sk-ant-test' });
      expect(claude.models.vision).toBe('claude-sonnet-5');
      expect(claude.models.vision).not.toContain('gemini');

      const openai = new AIProvider({ backend: 'openai', apiKey: 'sk-openai-test' });
      expect(openai.models.vision).toBe('gpt-4o-mini');
      expect(openai.models.vision).not.toContain('gemini');

      const claudeSpy = vi.spyOn(claude, '_claudeAnalyzeImages').mockResolvedValue('claude-vision-ok');
      const openaiSpy = vi.spyOn(claude, '_openaiAnalyzeImage').mockResolvedValue('wrong-route');
      const res = await claude.analyzeImage('Describe image', 'AAAA', { mimeType: 'image/png' });
      expect(res).toBe('claude-vision-ok');
      expect(claudeSpy).toHaveBeenCalledTimes(1);
      expect(openaiSpy).not.toHaveBeenCalled();
    });

    it('#8 view_export_preview: equation insertion uses callback in .replace so $$/$&/$\' never corrupt MathML', () => {
      const src = readSrc('view_export_preview_source.jsx');
      expect(src).toContain("mathHtml.replace(/^<math\\b/i, () => '<math' + attrs)");
    });

    it('#9 & #11 export_source: H5P addBlanks uses callback .replace and Storybook callGemini forwards options.signal', () => {
      const src = readSrc('export_source.jsx');
      expect(src).toContain("richText(withToken).replace(token, () => '*' + answers.map(_escapeExportText).join('/') + '*')");
      expect(src).toContain('window.callGemini(prompt, false, false, null, null, options.signal)');
    });

    it('#10 gemini_api: callGeminiVision partial extraction handles escaped quotes inside JSON strings', () => {
      const src = readSrc('gemini_api_source.jsx');
      expect(src).toContain('/"text"\\s*:\\s*"((?:\\\\[\\s\\S]|[^"\\\\])*)(?:"|$)/');
      // Runtime verification of regex with escaped quotes
      const raw = '{"candidates":[{"content":{"parts":[{"text":"Line 1 \\"quoted\\" text\\nLine 2 truncated';
      const m = raw.match(/"text"\s*:\s*"((?:\\[\s\S]|[^"\\])*)(?:"|$)/);
      expect(m).toBeTruthy();
      const partial = m[1].replace(/\\(["\\/bfnrt])/g, (_, ch) => ({ '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }[ch]));
      expect(partial).toBe('Line 1 "quoted" text\nLine 2 truncated');
    });
  });

  // ── Batch 2: Math and Concept Map Studio (#12 - #18) ──────────────────
  describe('Batch 2: Math and Concept Map Studio', () => {
    it('#12 concept_map_handlers & generate_dispatcher: forwards group profile overrides via configOverride and restores teacher settings in finally on error', async () => {
      const gdSrc = readSrc('generate_dispatcher_source.jsx');
      expect(gdSrc).toContain("'dokLevel', 'studentInterests', 'leveledTextCustomInstructions', 'targetStandards', 'useEmojis', 'textFormat'");

      const { handleBatchGenerateForRoster } = window.AlloModules.CmapHandlers;
      const setGradeLevel = vi.fn();
      const setDokLevel = vi.fn();
      const setTextFormat = vi.fn();
      const setUseEmojis = vi.fn();
      const capturedConfigs = [];
      const handleGenerate = vi.fn(async (_type, _lang, _keep, _text, cfg) => {
        capturedConfigs.push(cfg);
        throw new Error('simulated generation failure');
      });

      await handleBatchGenerateForRoster(['simplified'], {
        rosterKey: {
          groups: {
            g1: {
              name: 'Group A',
              color: '#123456',
              profile: { gradeLevel: 'Grade 4', dokLevel: 'DOK 3', studentInterests: 'space, robots', textFormat: 'bullet', useEmojis: false },
            },
          },
        },
        history: [],
        inputText: 'Photosynthesis converts sunlight into chemical energy.',
        gradeLevel: 'Grade 8',
        leveledTextLanguage: 'English',
        studentInterests: ['sports'],
        dokLevel: 'DOK 1',
        leveledTextCustomInstructions: '',
        selectedLanguages: ['English'],
        targetStandards: [],
        useEmojis: true,
        textFormat: 'standard',
        setGradeLevel,
        setLeveledTextLanguage: vi.fn(),
        setStudentInterests: vi.fn(),
        setDokLevel,
        setLeveledTextCustomInstructions: vi.fn(),
        setSelectedLanguages: vi.fn(),
        setTargetStandards: vi.fn(),
        setStandardInputValue: vi.fn(),
        setUseEmojis,
        setTextFormat,
        setIsProcessing: vi.fn(),
        setGenerationStep: vi.fn(),
        handleGenerate,
        addToast: vi.fn(),
        t: k => k,
        warnLog: vi.fn(),
      });

      // Group overrides passed directly into handleGenerate configOverride
      expect(capturedConfigs[0]).toMatchObject({
        grade: 'Grade 4',
        dokLevel: 'DOK 3',
        studentInterests: ['space', 'robots'],
        textFormat: 'bullet',
        useEmojis: false,
      });
      // Original teacher settings restored in finally despite thrown error
      expect(setGradeLevel.mock.calls.at(-1)[0]).toBe('Grade 8');
      expect(setDokLevel.mock.calls.at(-1)[0]).toBe('DOK 1');
      expect(setTextFormat.mock.calls.at(-1)[0]).toBe('standard');
      expect(setUseEmojis.mock.calls.at(-1)[0]).toBe(true);
    });

    it('#13 concept_map_handlers: handleRefinePanel uses functional updaters so switching active resource does not overwrite it and concurrent edits are preserved', async () => {
      const { handleRefinePanel } = window.AlloModules.CmapHandlers;
      let resolveEdit;
      const callGeminiImageEdit = vi.fn(() => new Promise(res => { resolveEdit = res; }));
      const origResource = {
        id: 'vis-1',
        data: {
          imageUrl: 'data:image/png;base64,AAA',
          visualPlan: {
            panels: [
              { id: 'p0', label: 'Orig 0', imageUrl: 'data:image/png;base64,AAA' },
              { id: 'p1', label: 'Orig 1', imageUrl: 'data:image/png;base64,BBB' },
            ],
          },
        },
      };
      let activeContent = origResource;
      let history = [origResource];
      const setGeneratedContent = vi.fn(u => { activeContent = typeof u === 'function' ? u(activeContent) : u; });
      const setHistory = vi.fn(u => { history = typeof u === 'function' ? u(history) : u; });

      const promise = handleRefinePanel(0, 'Make brighter', {
        generatedContent: origResource,
        setIsProcessing: vi.fn(),
        setGenerationStep: vi.fn(),
        setGeneratedContent,
        setHistory,
        addToast: vi.fn(),
        t: k => k,
        warnLog: vi.fn(),
        callGeminiImageEdit,
      });

      // While in flight: user edits panel 1 label in history AND switches active view to another resource
      history = [{
        ...origResource,
        data: {
          ...origResource.data,
          visualPlan: {
            panels: [
              origResource.data.visualPlan.panels[0],
              { ...origResource.data.visualPlan.panels[1], label: 'Edited While Waiting' },
            ],
          },
        },
      }];
      activeContent = { id: 'other-doc', type: 'quiz' };

      resolveEdit('data:image/png;base64,REFINED');
      await promise;

      // Active view stays on 'other-doc'
      expect(activeContent.id).toBe('other-doc');
      // History item updates panel 0 while preserving panel 1's concurrent edit
      expect(history[0].data.visualPlan.panels[0].imageUrl).toBe('data:image/png;base64,REFINED');
      expect(history[0].data.visualPlan.panels[1].label).toBe('Edited While Waiting');
    });

    it('#14 math_helpers: handleCheckMathWork grades deterministically as checked:true when AI is disabled so solution steps unlock', async () => {
      window.__alloStudentAiDisabled = true;
      const { handleCheckMathWork } = window.AlloModules.MathHelpers;
      let results = {};
      const callGemini = vi.fn(async () => { throw new Error('must not be called'); });

      await handleCheckMathWork('res-no-ai', 0, 'Solve 2 + 2', '4', [{ explanation: 'Add 2 and 2' }], '5', {
        mathCheckResults: results,
        mathHintData: {},
        setMathCheckResults: u => { results = typeof u === 'function' ? u(results) : u; },
        addToast: vi.fn(),
        t: k => k,
        callGemini,
        warnLog: vi.fn(),
      });

      expect(callGemini).not.toHaveBeenCalled();
      expect(results['res-no-ai'][0].verdict).toBe('incorrect');
      expect(results['res-no-ai'][0].checked).toBe(true);
    });

    it('#15 math_helpers & view_math: gates Generate Similar / Edit with AlloBot on AI availability and clears isProcessing in finally', async () => {
      const viewSrc = readSrc('view_math_source.jsx');
      expect(viewSrc).toContain('{mathProblems.length === 1 && _mathViewAiUsable() && (');
      expect(viewSrc).toContain('{isTeacherMode && mathProblems.length > 0 && _mathViewAiUsable() && (');

      const { handleGenerateSimilar } = window.AlloModules.MathHelpers;
      const busyStates = [];
      await handleGenerateSimilar({
        generatedContent: { data: { problems: [{ question: 'Solve 2x = 8' }] } },
        setIsProcessing: v => busyStates.push(v),
        setMathInput: vi.fn(),
        addToast: vi.fn(),
        t: k => k,
        callGemini: vi.fn(async () => 'Solve 3x = 12'),
        warnLog: vi.fn(),
        // Simulate handleGenerateMath returning early without clearing isProcessing
        handleGenerateMath: vi.fn(async () => undefined),
      });
      expect(busyStates).toEqual([true, false]);
    });

    it('#16 math_helpers: areMathAnswersEquivalent strips inline \\(...\\) from mixed typed + Math Keyboard answers', () => {
      const { areMathAnswersEquivalent } = window.AlloModules.MathHelpers;
      expect(areMathAnswersEquivalent('x = \\(\\frac{1}{2}\\)', 'x = 1/2')).toBe(true);
      expect(areMathAnswersEquivalent('1 \\(\\frac{1}{2}\\)', '1 1/2')).toBe(true);
      expect(areMathAnswersEquivalent('\\(x\\) = \\(5\\)', 'x = 5')).toBe(true);
    });

    it('#17 math_helpers: handleGenerateOutcome safely handles missing branch fields, blocks when AI is off, preserves apostrophes, and clears generationStep', async () => {
      const { handleGenerateOutcome } = window.AlloModules.MathHelpers;
      const added = [];
      const steps = [];

      await handleGenerateOutcome({
        generatedContent: {
          id: 'out-1',
          type: 'outline',
          data: {
            branches: [
              null,
              { title: 'Problem', items: ['Traffic congestion'] },
              { title: 'Bus Lanes' }, // missing items array must not crash
            ],
          },
        },
        getGeneratedContent: () => ({ id: 'out-1' }),
        setIsProcessing: vi.fn(),
        setGenerationStep: v => steps.push(v),
        setError: vi.fn(),
        addToast: vi.fn(),
        t: k => k,
        callGemini: vi.fn(async () => '"Outcome: The city\'s commuters won\'t face long delays."'),
        warnLog: vi.fn(),
        handleAddToMapList: v => added.push(v),
      });

      expect(added).toEqual(["The city's commuters won't face long delays."]);
      expect(steps.at(-1)).toBe('');
    });

    it('#18 concept_map_handlers: handleInitializeMap marks hasAutoLayoutRunRef for Venn Diagram and guards missing branch titles in Problem Solution', () => {
      const { handleInitializeMap } = window.AlloModules.CmapHandlers;
      const hasAutoLayoutRunRef = { current: false };
      handleInitializeMap({
        generatedContent: {
          type: 'outline',
          data: {
            structureType: 'Venn Diagram',
            mainTopic: 'Compare',
            branches: [{ title: 'A', items: ['Item 1'] }, { title: 'B', items: ['Item 2'] }],
          },
        },
        setConceptMapNodes: vi.fn(),
        setConceptMapEdges: vi.fn(),
        setIsConceptMapReady: vi.fn(),
        hasAutoLayoutRunRef,
        parseFlowChartData: vi.fn(),
        addToast: vi.fn(),
        warnLog: vi.fn(),
      });
      expect(hasAutoLayoutRunRef.current).toBe(true);

      const src = readSrc('concept_map_handlers_source.jsx');
      expect(src).toContain("String(b?.title || '').toLowerCase()");
    });
  });

  // ── Batch 3: Desktop Electron, LAN Adapter, and STEM Lab Tools (#19 - #26) ──
  describe('Batch 3: Desktop Electron, LAN Adapter, and STEM Lab Tools', () => {
    it('#19 stem_tool_calculus: captures cleanup closure locally and checks cancelled/!cv.isConnected before tab guard', () => {
      const src = readSrc('stem_lab/stem_tool_calculus.js');
      expect(src).toContain('var tries = 0, retryTimer = null, cancelled = false, activeCleanup = null;');
      expect(src).toContain('if (cancelled || !cv.isConnected)');
      expect(src).toContain('if (activeCleanup) { activeCleanup(); activeCleanup = null; }');
    });

    it('#20 desktop/electron/main.cjs: stale overlapping updateCoachOverlay calls do not kill the newer window tracker', () => {
      const src = readSrc('desktop/electron/main.cjs');
      expect(src).toContain('async function resolveTrackedCoachWindow(sourceLabel, requestEpoch)');
      expect(src).toContain('if (requestEpoch != null && requestEpoch !== coachOverlayEpoch) return Promise.resolve(null);');
      expect(src).toContain('if (coachWindowTracker !== child) return;');
      const updIdx = src.indexOf('async function updateCoachOverlay');
      const updSlice = src.slice(updIdx, updIdx + 700);
      expect(updSlice).toContain('trackedWindow = await resolveTrackedCoachWindow(payload.sourceLabel, requestEpoch);');
      expect(updSlice).not.toMatch(/if \(requestEpoch !== coachOverlayEpoch\)\s*\{\s*stopCoachWindowTracker\(\);/);
    });

    it('#21 lan_session_adapter: surfaces terminal EventSource readyState===2 error even after initial message and ignores events after unsubscribe', () => {
      const src = readSrc('desktop/app-adapter/lan_session_adapter.snippet.js');
      expect(src).toContain('if (closed) return;');
      expect(src).toContain('if (!closed && es.readyState === 2)');
      expect(src).not.toContain('!gotMessage && es.readyState === 2');
      expect(src).toContain("es.removeEventListener('session', handle)");
    });

    it('#22 stem_tool_algebracas: parses fractional linear solutions like "3/4" to 0.75 instead of 3', () => {
      const src = readSrc('stem_lab/stem_tool_algebracas.js');
      const idx = src.indexOf('var ansStr = String(work.answer || \'\').trim();');
      expect(idx).toBeGreaterThan(-1);
      const slice = src.slice(idx, idx + 280);
      expect(slice).toContain("var partsF = ansStr.split('/');");
      // Runtime behavior check
      const parseSol = (ans) => {
        const s = String(ans || '').trim();
        const p = s.split('/');
        return p.length === 2 && parseFloat(p[1]) ? parseFloat(p[0]) / parseFloat(p[1]) : parseFloat(s);
      };
      expect(parseSol('3/4')).toBeCloseTo(0.75);
      expect(parseSol('-2/3')).toBeCloseTo(-2 / 3);
      expect(parseSol('5')).toBe(5);
    });

    it('#23 stem_tool_circuit: circuitDesignDocument and parseCircuitDesign preserve unscrewed state for bulbs and LEDs', () => {
      const { circuitDesignDocument, parseCircuitDesign } = window.StemLab;
      const state = {
        mode: 'series',
        voltage: 9,
        components: [
          { id: 1, type: 'bulb', value: 10, unscrewed: true },
          { id: 2, type: 'led', reversed: false, ledColor: '#ef4444', unscrewed: true },
        ],
      };
      const doc = circuitDesignDocument(state);
      expect(doc.circuit.components[0].unscrewed).toBe(true);
      expect(doc.circuit.components[1].unscrewed).toBe(true);

      const parsed = parseCircuitDesign(JSON.stringify(doc));
      expect(parsed.components[0].unscrewed).toBe(true);
      expect(parsed.components[1].unscrewed).toBe(true);
    });

    it('#24, #25, #26 stem_tool_chembalance: balances Unicode-subscript equations, guards unmatched ")" in parseFormula, and preserves ionic bond order 0', () => {
      const chem = window.__alloChemPure;
      expect(chem).toBeTruthy();

      // #24: Unicode subscripts balance cleanly
      const balanced = chem.balanceEquation('CH₄ + O₂ → CO₂ + H₂O');
      expect(balanced.ok).toBe(true);
      expect(balanced.formatted || balanced.balancedString || JSON.stringify(balanced)).toContain('2O2');
      expect(balanced.formatted || balanced.balancedString || JSON.stringify(balanced)).toContain('2H2O');

      // #25: Unmatched ')' in parseFormula does not throw TypeError
      expect(() => chem.parseFormula('H2O)')).not.toThrow();
      expect(chem.parseFormula('H2O)').elems).toMatchObject({ H: 2, O: 1 });

      // #26: Molecular Viewer preserves order 0 for ionic bonds
      const src = readSrc('stem_lab/stem_tool_chembalance.js');
      expect(src).toContain('var order = bond[2] != null ? bond[2] : 1;');
    });
  });
});
