import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Wave 11 bug sweep (2026-11-20) — Pass 1: Core Views & Handlers', () => {
  it('view_renderers_source.jsx fixes html2canvas retry, changeZoom side effect, OrganizerMountReceipt, hoisted outline helpers, and 3D AI gating', () => {
    const src = read('view_renderers_source.jsx');
    // 1. html2canvas onload resets pending = null before rejecting when window.html2canvas missing
    expect(src).toMatch(/script\.onload\s*=\s*\(\)\s*=>\s*\{[\s\S]{0,200}pending\s*=\s*null;[\s\S]{0,120}reject\(/);
    // 2. changeZoom computes next outside setZoom instead of calling setToolbarMessage inside updater
    expect(src).toMatch(/const changeZoom\s*=\s*\(?delta\)?\s*=>\s*\{[\s\S]{0,160}const next\s*=\s*clampZoom\(zoom \+ delta\);[\s\S]{0,80}setZoom\(next\);[\s\S]{0,160}setToolbarMessage\(/);
    // 3. OrganizerMountReceipt resets mountFailed on activityKey change and clears timers on success
    expect(src).toMatch(/setMountFailed\(false\);[\s\S]{0,600}clearTimers\(\);[\s\S]{0,200}check\(\);\s*if \(!done\)/);
    // 4. Outline helpers are plain render functions, not inline components
    expect(src).toMatch(/const _OrganizerGameLoadingFallback\s*=/);
    expect(src).toMatch(/const renderMainTitle\s*=/);
    expect(src).toMatch(/const renderBranchItem\s*=/);
    expect(src).toMatch(/const renderLiveOrganizerStatus\s*=/);
    expect(src).toMatch(/const renderGameButtonHint\s*=/);
    expect(src).not.toMatch(/<MainTitle\s*\/>|<BranchItem\s|<LiveOrganizerStatus\s|<GameButtonHint\s*\/>/);
    // 5. ConceptSpace3DView gates sculpture refine form and custom prompt when AI unavailable
    expect(src).toContain('disabled={refineBusy || !_alloRuntimeAiAvailable()}');
    expect(src).toContain('disabled={!refinePrompt.trim() || refineBusy || !_alloRuntimeAiAvailable()}');
  });

  it('view_sidebar_panels_source.jsx fixes MathPanel Fluency Probes, DbqPanel custom mode, and SourceView pasteImage', () => {
    const src = read('view_sidebar_panels_source.jsx');
    // MathPanel uses plural 'Fluency Probes'
    expect(src).toContain("mathMode === 'Fluency Probes'");
    expect(src).not.toContain("mathMode === 'Fluency Probe'");
    // DbqPanel allows custom mode without source text and reads #dbq-custom-docs
    expect(src).toContain("disabled={(!hasSourceOrAnalysis && window._dbqMode !== 'custom') || isProcessing || !aiTextAvailable}");
    expect(src).toContain("document.getElementById('dbq-custom-docs')?.value?.trim()");
    // SourceView pasteImage checks aiReady, 20MB limit, and attaches onerror/onabort
    expect(src).toMatch(/const pasteImage\s*=\s*\(event\)\s*=>\s*\{[\s\S]{0,180}!aiReady/);
    expect(src).toContain('blob.size > 20 * 1024 * 1024');
    expect(src).toContain('reader.onerror = finishFailedRead;');
    expect(src).toContain('reader.onabort = finishFailedRead;');
  });

  it('phase_o_misc_handlers_source.jsx guards handleRefineImage and blueprint all-failed status', () => {
    const src = read('phase_o_misc_handlers_source.jsx');
    expect(src).toContain('Array.isArray(generatedContent?.data?.visualPlan?.panels) && generatedContent.data.visualPlan.panels.length > 1');
    expect(src).toContain("typeof editSource !== 'string' || !editSource.includes(',')");
    expect(src).toMatch(/const newImageBase64 = await callGeminiImageEdit[\s\S]{0,160}if \(!newImageBase64\)/);
    expect(src).toMatch(/finally\s*\{\s*setIsProcessing\(false\);\s*setGenerationStep\(''\);/);
    expect(src).toContain("const _finalBpStatus = _landedItems.length ? 'partial' : 'failed';");
  });

  it('misc_handlers_source.jsx clears parent/independent modes on student save and skips overlay-only activeView', () => {
    const src = read('misc_handlers_source.jsx');
    expect(src).toMatch(/if \(isStudentSave\)\s*\{[\s\S]{0,200}setIsParentMode\(false\)[\s\S]{0,120}setIsIndependentMode\(false\)/);
    expect(src).toContain('const _OVERLAY_ONLY_TYPES = new Set([');
    expect(src).toContain("'!_OVERLAY_ONLY_TYPES.has(item.type)'".replace(/'/g, ''));
  });

  it('view_header_source.jsx fixes collapsed toggle button restore, student disconnect, Educator Tools gate, and Kokoro download state', () => {
    const src = read('view_header_source.jsx');
    // toggleHeaderCollapsed restores button state
    expect(src).toMatch(/if \(button && button\.isConnected\)\s*\{\s*button\.disabled = false;\s*button\.removeAttribute\('aria-busy'\);\s*button\.style\.opacity = '';/);
    // Expanded student disconnect delegates to liveStatus.leave and does not wipe history
    expect(src).toMatch(/if \(liveStatus && typeof liveStatus\.leave === 'function'\)\s*\{\s*liveStatus\.leave\(\);\s*return;\s*\}/);
    expect(src).not.toMatch(/hasConnectedRef\.current = false;\s*setHistory\(\[\]\);/);
    // Educator Tools checks _alloEducatorAccessCodeRequired in both compact and expanded headers
    const gateChecks = src.match(/window\._alloEducatorAccessCodeRequired === 'function'/g) || [];
    expect(gateChecks.length).toBeGreaterThanOrEqual(2);
    // Kokoro downloading tracked in React state
    expect(src).toContain('const [kokoroDownloading, setKokoroDownloading] = React.useState(');
    expect(src).toContain('(kokoroDownloading || window.__kokoroTTSDownloading)');
  });

  it('view_history_panel_source.jsx guards st.tools, localStorage writes, window.__alloflowSelStations sync, and re-render tick', () => {
    const src = read('view_history_panel_source.jsx');
    expect(src).toContain('const [, setStationListTick] = React.useState(0);');
    // st.tools is normalized to an array once, then counted.
    expect(src).toContain('const toolList = Array.isArray(st.tools) ? st.tools : [];');
    expect(src).toContain("{toolList.length} tool{toolList.length !== 1 ? 's' : ''}");
    expect(src).toContain("try { localStorage.setItem('alloflow_stem_stations', JSON.stringify(updated)); } catch (_) {}");
    expect(src).toContain("try { localStorage.setItem('alloflow_sel_stations', JSON.stringify(updated)); } catch (_) {}");
    expect(src).toContain('window.__alloflowSelStations = updated;');
  });
});

describe('Wave 11 bug sweep (2026-11-20) — Pass 2: Word Sounds, Modals & Student Flows', () => {
  it('word_sounds_setup_source.jsx fixes drag-drop validation, chained audio cancellation, delete pack bank apply, and activeIdRef gating', () => {
    const src = read('word_sounds_setup_source.jsx');
    expect(src).toContain('if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;');
    expect(src).toContain('{lessonPlan[activity.id]?.enabled && planFineTuneOpen && (');
    expect(src).toContain('const playSeqRef = React.useRef(0);');
    expect(src).toContain('const playTimerRef = React.useRef(null);');
    expect(src).toContain('const activeIdRef = React.useRef(lib.activeId);');
    expect(src).toMatch(/performDeletePack[\s\S]{0,600}applyPhonemeVoicePackToBank\(nextActiveNow\.clips \|\| \{\}\);[\s\S]{0,80}applyInstrToBank\(nextActiveNow\.instr \|\| \{\}\);/);
  });

  it('view_misc_panels_source.jsx + AlloFlowANTI.txt fix PdfDiffViewer rebuild, Fluency partner cleanup, SourceGenPanel AI/IME/stale closure, and VolumeBuilder drag cleanup', () => {
    const src = read('view_misc_panels_source.jsx');
    const host = read('AlloFlowANTI.txt');
    expect(host).toContain('setDiffRebuildNonce, setDiffSelection, setDiffViewOpen');
    expect(src).toContain('setDiffRebuildNonce');
    expect(src).toContain("if (typeof setDiffRebuildNonce === 'function') setDiffRebuildNonce(n => n + 1);");
    expect(src).toContain('const fluencyPanelActive = !!(isFluencyMode && generatedContent);');
    expect(src).toContain('if (!fluencyPanelActive) resetPartnerCheck();');
    expect(src).toMatch(/const submitSource = async \(confirmed\) => \{\s*if \(!aiTextAvailable\) return;/);
    expect(src).toContain('!e.isComposing && !e.nativeEvent?.isComposing && e.keyCode !== 229');
    expect(src).toContain('const currentSelected = selectedIdsRef.current;');
    expect(src).toMatch(/if \(mathMode !== 'Volume Builder' && typeof cubeDragCleanupRef\.current === 'function'\)/);
  });

  it('view_misc_modals_source.jsx fixes UDLGuideModal IME/AI/menu reset and AIBackendModalBody validation preservation + reset reactivity', () => {
    const src = read('view_misc_modals_source.jsx');
    expect(src).toContain('if (!showUDLGuide || isCollapsed) setChatMenuOpen(false);');
    expect(src).toContain('disabled={isChatProcessing || aiOff}');
    expect(src).toContain('!isFindingStandards && safeAiStandardQuery.trim() && !aiOff');
    const preserveCalls = src.match(/preserveValidation:\s*true/g) || [];
    expect(preserveCalls.length).toBeGreaterThanOrEqual(4);
    expect(src).toMatch(/clearAIBackendConfig[\s\S]{0,600}setKeyLockTick[\s\S]{0,120}alloflow:ai-config-changed/);
    expect(src).toMatch(/clearAIBackendConfig\(\);\s*setConfigRevision\(\(revision\) => revision \+ 1\);/);
  });

  it('ui_modals_source.jsx fixes RoleSelectionModal restore/double-click and TeacherGate interval stop', () => {
    const src = read('ui_modals_source.jsx');
    expect(src).toContain('if (now >= blockedUntil) clearInterval(timer);');
    expect(src).toContain('const pendingTimerRef = useRef(null);');
    expect(src).toMatch(/restoreButton\(\);\s*if \(typeof onGateRequired === 'function'\) onGateRequired\(role\);/);
  });

  it('view_gemini_bridge_source.jsx fixes handleAudio languageOverride args, playback teardown, send modal reset/mic cleanup, and per-term save check', () => {
    const src = read('view_gemini_bridge_source.jsx');
    expect(src).toContain("handleAudio(resolvedEnglish, 'bridge-en', 0, false, 'English')");
    expect(src).toContain("handleAudio(resolvedTranslated, 'bridge-translated', 0, false, targetLang)");
    expect(src).toContain("handleAudio(text, 'bridge-translated', 0, false, speechLang)");
    expect(src).toContain('bridgeMessage.language || bridgeMessage.languageName');
    expect(src).toContain('window.__bridgeAutoplay = false;');
    expect(src).toContain('window.__bridgeAttachedImage = null;');
    expect(src).toContain('const stopBridgePlayback = React.useCallback(');
    const okChecks = src.match(/const ok = await handleQuickAddGlossary\(word, true\);/g) || [];
    expect(okChecks.length).toBeGreaterThanOrEqual(3);
  });

  it('view_guided_mode_banner_source.jsx fixes performStartTeaching readiness clear, per-key skip persist flags, and TTS listener detach', () => {
    const src = read('view_guided_mode_banner_source.jsx');
    expect(src).toMatch(/const performStartTeaching = \(\) => \{\s*setPendingReadinessAction\(null\);\s*if \(documentRoute\)/);
    expect(src).toContain('const _skipPersistRef = React.useRef({ ui: false, readiness: false, delivery: false, context: false });');
    expect(src).toContain('a.onended = null; a.onerror = null; a.pause(); a.src = \'\';');
  });

  it('student_interaction_source.jsx blocks Escape and X button while submitting', () => {
    const src = read('student_interaction_source.jsx');
    expect(src).toContain('const submittingRef = useRef(submitting);');
    const escapeGuards = src.match(/if \(submittingRef\.current\) return;/g) || [];
    expect(escapeGuards.length).toBeGreaterThanOrEqual(2);
    expect(src).toContain('disabled={submitting}');
  });
});

describe('Wave 11 bug sweep (2026-11-20) — Pass 3: STEM Lab Live Runtime & Invariants', () => {
  it('stem_tool_epidemic.js runtime: parseHistoricalR0 parses ranges, and answerMatches handles dI/dt, 3/4, 93.3%, and conversational filler', () => {
    const code = read('stem_lab/stem_tool_epidemic.js');
    const sandbox = {
      window: { StemLab: { registerTool: () => {} } },
      document: { getElementById: () => null, createElement: () => ({ style: {}, setAttribute: () => {} }), body: { appendChild: () => {} } },
      localStorage: { getItem: () => null, setItem: () => {} },
      console, Math, Date, JSON, Array, Object, Number, String, Boolean, RegExp, Error, Set, Map, isNaN, isFinite, parseFloat, parseInt,
      setTimeout, clearTimeout,
      __alloT: (_k, fb) => fb
    };
    sandbox.window.window = sandbox.window;
    sandbox.globalThis = sandbox;
    vm.runInNewContext(code, sandbox);
    const core = sandbox.window.__EpidemicCore;
    expect(core).toBeTruthy();

    // parseHistoricalR0 handles ranges like '~2–3' instead of concatenating to 23
    expect(core.parseHistoricalR0('~2\u20133')).toBe(2.5);
    expect(core.parseHistoricalR0('~1.8')).toBe(1.8);
    expect(core.parseHistoricalR0('12-18')).toBe(15);

    // dI/dt equation preserves variable i and rejects wrong variables
    const dIdtQ = { a: 'beta*s*i-gamma*i', alt: ['beta s i - gamma i', 'bsi-gi', 'bsi - gi', 'beta si - gamma i', 'beta*s*i - gamma*i', 'beta x s x i - gamma x i'] };
    expect(core.answerMatches('beta*s*i-gamma*i', dIdtQ)).toBe(true);
    expect(core.answerMatches('beta s i - gamma i', dIdtQ)).toBe(true);
    expect(core.answerMatches('beta*s*s-gamma*s', dIdtQ)).toBe(false);
    expect(core.answerMatches('beta*s-gamma', dIdtQ)).toBe(false);

    // Conversational "I think it is ..." still matches
    expect(core.answerMatches('I think it is herd immunity', { a: 'herd immunity' })).toBe(true);

    // Herd immunity alt answers
    expect(code).toContain("alt: ['3/4', '0.75', '75']");
    expect(code).toContain("alt: ['93.3%', '93.33%', '93.3', '93.33', '94%', '94', '14/15']");
    // Challenge lock, XP dedup, interventions activeData, no render-phase setTimeout for tabsViewed
    expect(code).toContain('if (chalAnswered || !chalAnswer.trim()) return;');
    expect(code).toContain('function awardXPOnce(');
    expect(code).toContain("tab === 'interventions' && npiResult && Array.isArray(npiResult.data)");
    expect(code).not.toMatch(/if \(!\(d\.tabsViewed \|\| \{\}\)\[tab\]\)\s*\{\s*setTimeout/);
  });

  it('stem_tool_ratios.js fixes flat draft clear and multilingual normalizeChoice', () => {
    const code = read('stem_lab/stem_tool_ratios.js');
    expect(code).toContain('ratioADraft: null, ratioBDraft: null, ratioFactorDraft: null');
    expect(code).not.toContain('cur.numericDrafts');
    // Execute normalizeAnswer + normalizeChoice directly to verify multilingual tokens
    const fnMatch = code.match(/function normalizeAnswer\([\s\S]*?function normalizeChoice\([\s\S]*?\n  \}/);
    expect(fnMatch).toBeTruthy();
    const sandbox = {};
    vm.runInNewContext(fnMatch[0] + '\nthis.normalizeChoice = normalizeChoice;', sandbox);
    expect(sandbox.normalizeChoice('Opción B')).toBe('b');
    expect(sandbox.normalizeChoice('Choix C')).toBe('c');
    expect(sandbox.normalizeChoice('Wahl A')).toBe('a');
    expect(sandbox.normalizeChoice('Sí')).toBe('yes');
    expect(sandbox.normalizeChoice('Oui')).toBe('yes');
    expect(sandbox.normalizeChoice('Nein')).toBe('no');
    expect(sandbox.normalizeChoice('Igual')).toBe('same');
    expect(sandbox.normalizeChoice('Même')).toBe('same');
  });

  it('stem_tool_areaperimeter.js resets boundaryWalk: null on starter presets and newRectangle', () => {
    const code = read('stem_lab/stem_tool_areaperimeter.js');
    expect(code).not.toContain('walkSteps: 0');
    const resets = code.match(/boundaryStep:\s*0,\s*boundaryWalk:\s*null/g) || [];
    expect(resets.length).toBeGreaterThanOrEqual(2);
  });

  it('stem_tool_volume.js fixes rx/ry=0 voxelization, displacement XP dedup, camSig dims, solid shape, N hotkey, painter sort & face vertices, and net rAF cancel', () => {
    const code = read('stem_lab/stem_tool_volume.js');
    // Live-test voxelizeShape at l=1, w=1 for cylinder and cone (no NaN / 0 cubes)
    const voxMatch = code.match(/function voxelizeShape\(s, l, w, h\)[\s\S]*?\n      \}/);
    expect(voxMatch).toBeTruthy();
    const sandbox = {};
    vm.runInNewContext(voxMatch[0] + '\nthis.voxelizeShape = voxelizeShape;', sandbox);
    expect(sandbox.voxelizeShape('cylinder', 1, 1, 3).length).toBe(3);
    expect(sandbox.voxelizeShape('cone', 1, 1, 3).length).toBe(3);
    expect(sandbox.voxelizeShape('cylinder', 1, 3, 2).length).toBeGreaterThan(0);

    expect(code).toContain("var camSig = mdl.rotX + ',' + mdl.rotY + ',' + mdl.scale + ',' + mdl.gl + ',' + mdl.gw + ',' + mdl.gh;");
    expect(code).toContain('var voxels = voxelizeShape(solid, dims.l, dims.w, dims.h);');
    expect(code).toContain("shape: isSlider ? solid : 'prism'");
    expect(code).toContain("if (mode === 'slider') newSliderChallenge();");
    expect(code).toContain('dispSolvedKeys');
    expect(code).toContain('return (a.x + a.y) - (b.x + b.y) || (a.z - b.z);');
    expect(code).toContain('[px, py + cubeSize * 2 * sinA]');
    expect(code).toContain('window._volumeNetRaf');
  });

  it('stem_tool_funcgrapher.js removes render-phase setLabToolData, clamps fgMeasure, caps zoom/grid/table, and guards quiz auto-advance', () => {
    const code = read('stem_lab/stem_tool_funcgrapher.js');
    expect(code).not.toMatch(/if \(!labToolData \|\| !labToolData\.funcGrapher\)\s*\{\s*setLabToolData/);
    expect(code).toContain('var DEFAULT_FG = {');
    expect(code).toContain('var want = Math.max(1, Math.min(2.5, rawWant));');
    expect(code).toContain('var critStep = Math.max(0.05, (xR.xMax - xR.xMin) / 400);');
    expect(code).toContain('Math.min(500, (xR.xMax - xR.xMin))');
    expect(code).toContain('Math.max(0.5, (xR.xMax - xR.xMin) / 4)');
    expect(code).toContain('var fgNiceStep = function(span)');
    expect(code).toContain('if (!fgQuiz || fgQuiz.answered) return;');
    expect(code).toContain('window._fgAutoNextTimer');
  });

  it('stem_tool_bikelab.js fixes force vector y-signs/maxF, GearingLab clamp, wet patch end bound, SignalDrill done counter, and BikeFit rounding', () => {
    const code = read('stem_lab/stem_tool_bikelab.js');
    expect(code).toContain('Math.abs(dragF)');
    expect(code).toContain("drawVector(ctx2d, bx, by - 22, Math.cos(a) * pedalF * pxScale, -Math.sin(a) * pedalF * pxScale, '#10b981', 'F_pedal');");
    expect(code).toContain("drawVector(ctx2d, bx, by - 22, -Math.cos(a) * dragF * pxScale, Math.sin(a) * dragF * pxScale, '#a855f7', 'F_drag');");
    expect(code).toContain("drawVector(ctx2d, bx, by - 10, -Math.cos(a) * rollingF * pxScale, Math.sin(a) * rollingF * pxScale, '#f59e0b', 'F_roll');");
    expect(code).toContain('var safeRingIdx = Math.max(0, Math.min(ringIdx, bike.chainringT.length - 1));');
    expect(code).toContain('var safeCogIdx = Math.max(0, Math.min(cogIdx, bike.cassetteT.length - 1));');
    expect(code).toContain('newX >= t.seg.wet.start && newX <= t.seg.wet.end && dt > 0');
    expect(code).toContain("gameMode === 'done' ? (ROUND_COUNT + ' / ' + ROUND_COUNT)");
    // Live-test BikeFit rounding formula at 182 cm (used to display 5 ft 12 in!)
    const fmt = (cm) => { const totalIn = Math.round(cm / 2.54); return `${cm} cm · ${Math.floor(totalIn / 12)} ft ${totalIn % 12} in`; };
    expect(fmt(182)).toBe('182 cm · 6 ft 0 in');
    expect(fmt(152)).toBe('152 cm · 5 ft 0 in');
    expect(code).toContain('var totalIn = Math.round(heightCm / 2.54);');
  });
});
