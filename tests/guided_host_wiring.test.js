import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const app = readFileSync(resolve(root, 'AlloFlowANTI.txt'), 'utf8');
const header = readFileSync(resolve(root, 'view_header_source.jsx'), 'utf8');
const wizard = readFileSync(resolve(root, 'quickstart_source.jsx'), 'utf8');
const phaseO = readFileSync(resolve(root, 'phase_o_misc_handlers_source.jsx'), 'utf8');
const banner = readFileSync(resolve(root, 'view_guided_mode_banner_source.jsx'), 'utf8');
const miscHandlers = readFileSync(resolve(root, 'misc_handlers_source.jsx'), 'utf8');
const textPipeline = readFileSync(resolve(root, 'text_pipeline_helpers_source.jsx'), 'utf8');
const dispatcher = readFileSync(resolve(root, 'generate_dispatcher_source.jsx'), 'utf8');

function guidedTourMapEntries() {
  const start = app.indexOf('const GUIDED_TOUR_MAP = {');
  expect(start).toBeGreaterThan(-1);
  const end = app.indexOf('};', start);
  expect(end).toBeGreaterThan(start);
  const block = app.slice(start, end);
  return Array.from(block.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)).map((m) => ({ stepId: m[1], domId: m[2] }));
}

describe('Guided Mode host wiring', () => {
  it('maps every guided step to a real host DOM anchor', () => {
    const entries = guidedTourMapEntries();
    expect(entries.length).toBeGreaterThanOrEqual(20);
    const missing = entries.filter(({ domId }) => !app.includes(`id="${domId}"`) && !app.includes(`id='${domId}'`));
    expect(missing).toEqual([]);
  });

  it('passes Guided Mode setters into HeaderBar so the setup button can start the guided path', () => {
    expect(app).toContain('setGuidedMode={setGuidedMode}');
    expect(app).toContain('setGuidedStep={setGuidedStep}');
    expect(app).toContain('setGuidedSelectedIds={setGuidedSelectedIds}');
    expect(header).toContain('setGuidedMode, setGuidedStep, setGuidedSelectedIds');
    expect(header).toContain('data-help-key="header_guided_mode_start"');
    expect(header).toContain('setShowSetupPathMenu(true)');
    expect(header).not.toContain("onClick={() => { safeRemoveItem('allo_wizard_completed'); setShowWizard(true); }}");
  });

  it('routes QuickStart file uploads through the normal completion handler before opening the file picker', () => {
    expect(wizard).toContain("onClick={() => onComplete({ ...localData, sourceMode: 'file', materialType: 'file' })}");
    expect(wizard).not.toContain('onUpload();\n                                      onClose();');
    expect(phaseO).toContain("finalData.sourceMode === 'file'");
    expect(phaseO).toContain('fileInputRef.current.click()');
    expect(phaseO).toContain("safeSetItem('allo_wizard_completed', 'true')");
  });

  it('centralizes generator auto-advance in one cancellable host observer', () => {
    // Every history-producing Guided step uses the active subset and one host-owned timer.
    const start = app.indexOf('const HISTORY_ADVANCE_STEPS = {');
    expect(start).toBeGreaterThan(-1);
    const end = app.indexOf('};', start);
    const block = app.slice(start, end);
    for (const [type, stepId] of [
      ['analysis', 'analysis'],
      ['anchor-chart', 'anchor-chart'],
      ['note-taking', 'note-taking'],
      ['dbq', 'dbq'],
      ['alignment-report', 'alignment'],
      ['persona', 'persona'],
      ['adventure', 'adventure'],
      ['lesson-plan', 'lesson-plan'],
    ]) {
      expect(block).toContain(`'${type}': '${stepId}'`);
    }
    // The effect must index into the ACTIVE (possibly subset) step list, not GUIDED_STEPS.
    const effectStart = app.indexOf('const _guidedHistLenRef');
    expect(effectStart).toBeGreaterThan(-1);
    const effect = app.slice(effectStart, app.indexOf('}, [history, guidedMode, guidedStep, guidedSelectedIds]);', effectStart));
    expect(effect).toContain('guidedActiveSteps[guidedStep]');
    expect(effect).toContain('len !== prevLen + 1');
    expect(effect).toContain('setGuidedCreatedHistoryIds');
    expect(dispatcher).not.toContain('typeToGuidedId');
    expect(dispatcher).not.toMatch(/setTimeout\([^)]*setGuidedStep/);
  });

  it('type-matches step completion and keeps ✅ across Back via the completed set', () => {
    // stepDone used to flip on ANY history growth (wrong tool marked the step done) and
    // re-baselined on every step change (Back lost the ✅).
    expect(banner).toContain('const STEP_HISTORY_TYPES = {');
    expect(banner).toContain("'alignment': ['alignment-report']");
    expect(banner).toContain('_matchTypes.indexOf(h.type) !== -1');
    expect(banner).toContain('guidedCompletedIds');
    expect(banner).toContain('markGuidedStepDone');
    // Host persists the real completed set (project saves + localStorage mirror).
    expect(app).toContain("completedSteps: guidedCompletedIds");
    expect(app).toContain("localStorage.setItem('allo_guided_progress'");
    expect(app).toContain("localStorage.getItem('allo_guided_progress'");
    expect(miscHandlers).toContain('setGuidedCompletedIds(_cleanIds(_gtp.completedSteps))');
    expect(miscHandlers).toContain('setGuidedSkippedIds(_cleanIds(_gtp.skippedSteps))');
    expect(miscHandlers).toContain('setGuidedCreatedHistoryIds');
    expect(miscHandlers).toContain('setGuidedDeliveryEvidence');
    expect(app).toContain('deliveryEvidence: guidedDeliveryEvidence');
  });

  it('gives the generate dispatcher the ACTIVE step list so subset tours auto-advance', () => {
    expect(app).toContain('GUIDED_STEPS: guidedActiveSteps,');
  });

  it('header re-entry resumes guided progress with an explicit Start over path', () => {
    expect(header).toContain('_guidedHasProgress');
    expect(header).toContain('Array.isArray(guidedSelectedIds)');
    expect(header).toContain('guidedCompletedIds.length > 0');
    expect(header).toContain('restartGuidedModeFromHeader');
    expect(header).toContain("t('guided.resumed')");
    expect(header).toContain("t('toolbar.guided_mode_start_over')");
  });

  it('maps the late-added tour anchors to their expandable panels', () => {
    // The component-scoped map from TextPipelineHelpers SHADOWS the host copy, so the
    // module map is the one the tour/help expand paths actually read.
    for (const entry of [
      "'tour-tool-wordsounds': 'ui-tool-wordsounds'",
      "'tour-tool-note-taking': 'note-taking'",
      "'tour-tool-anchor-chart': 'anchor-chart'",
    ]) {
      expect(textPipeline).toContain(entry);
      expect(app).toContain(entry);
    }
  });

  it('keeps Guided Next step separate from explicit Skip step controls', () => {
    expect(banner).toContain('{!isLast && stepDone && <button');
    expect(banner).toContain('{!isLast && !stepDone && guidedStep > 0 && <button');
    expect(banner).not.toContain('background: guidedEngaged ?');
  });

  it('binds the highlight to the real target and forces the Create sidebar', () => {
    expect(app).toContain("el.classList.add('allo-guided-target')");
    expect(app).toContain('new MutationObserver');
    expect(app).toContain('targetClassObserver.disconnect()');
    expect(app).toContain("el.setAttribute('data-allo-guided-target', 'true')");
    expect(app).toContain("el.removeAttribute('data-allo-guided-target')");
    expect(app).toContain('const targetRetryTimer = setTimeout');
    expect(app).toContain('clearTimeout(targetRetryTimer)');
    expect(app).toContain("el.classList.remove('allo-guided-target')");
    expect(app).not.toContain('setGuidedRect');
    expect(app).toContain("if (guidedMode && activeSidebarTab !== 'create')");
    expect(app).toContain("setActiveSidebarTab('create')");
    expect(app).toContain('[guidedMode, guidedStep, hasSelectedRole, guidedSelectedIds, guidedTargetEpoch]');
  });

  it('sanitizes saved step IDs and persists skipped/session-created state', () => {
    expect(app).toContain('const normalizeGuidedProgress');
    expect(app).toContain('new Set(GUIDED_STEP_IDS)');
    expect(app).not.toContain("_sel.length + 1 : _sel.length) : 22");
    expect(app).toContain('skippedSteps: guidedSkippedIds');
    expect(app).toContain('createdHistoryIds: guidedCreatedHistoryIds');
    expect(banner).toContain('_createdIdSet.has(h.id)');
  });

  it('tracks explicit skips separately from completed steps', () => {
    expect(app).toContain('const handleGuidedSkip = (wasSkipped = false)');
    expect(app).toContain('setGuidedSkippedIds');
    expect(banner).toContain('guidedSkippedIds.includes(s.id)');
    expect(banner).toContain('handleGuidedSkip(true)');
    expect(banner).toContain('handleGuidedSkip(false)');
  });
});

describe('Guided Mode pause semantics', () => {
  it('exits without resetting persisted progress and confirms where it can be resumed', () => {
    expect(app).toContain("const handleExitGuidedMode = () => {");
    expect(app).toContain("addToast(t('guided.progress_saved') || 'Guided progress saved. Resume anytime from Setup.', 'success')");
    const handler = app.slice(app.indexOf('const handleExitGuidedMode'), app.indexOf('const [showGuidedTip'));
    expect(handler).not.toContain('resetGuidedProgress');
    expect(handler).not.toContain('localStorage.removeItem');
  });
});
describe('Guided Mode improvement wiring', () => {
  it('wires goal presets and retry recovery into the banner', () => {
    expect(app).toContain('const GUIDED_PRESETS = [');
    expect(app).toContain('const applyGuidedPreset = (preset) =>');
    expect(app).toContain('const GUIDED_RETRY_TYPES = {');
    expect(app).toContain('const retryGuidedStep = async () =>');
    expect(app).toContain('guidedPresets={GUIDED_PRESETS}');
    expect(app).toContain('guidedStepError={guidedStepError}');
    expect(app).toContain('openGuidedHistoryItem={handleRestoreView}');
  });

  it('adds outcome phases, assignment directions, and comprehensive delivery as real milestones', () => {
    expect(app).toContain('const GUIDED_PHASES = [');
    expect(app).toContain("{ id: 'directions', phase: 'assign'");
    expect(app).toContain("{ id: 'package-deliver', phase: 'deliver'");
    expect(app).toContain("'directions': 'tour-tool-directions'");
    expect(app).toContain("'package-deliver': 'tour-tool-fullpack'");
    expect(app).toContain("guidedPhases={GUIDED_PHASES}");
    expect(app).toContain("guidedDeliveryGroups={GUIDED_DELIVERY_GROUPS}");
    expect(banner).toContain("const GUIDED_CLICK_STEPS = ['math']");
    expect(banner).toContain("step.id === 'package-deliver' ? _deliveryOutcomeDone");
    expect(app).toContain("markGuidedDeliveryEvidence('directionsSaved')");
    expect(banner).toContain("Phase {current} of {total}");
  });

  it('covers every export and sharing family in Package & Deliver', () => {
    for (const option of [
      'PDF / Print', 'Worksheet', 'Slides (.pptx)', 'Accessible Word (.docx)', 'OpenDocument (.odt)',
      'Interactive HTML', 'EPUB (.epub)', 'Plain text (.txt)', 'Markdown (.md)', 'NotebookLM source (.md)', 'Electronic Braille (.brf)',
      'QTI quiz package', 'H5P interactive activity (.h5p)', 'IMS content package',
      'Homework QR / self-contained link', 'Class Mailbox / hosted printable QR', 'Live class session', 'Editable AlloFlow project',
      'Adventure Storybook HTML (optional narration)', 'Persona private-session JSON + HTML transcript',
    ]) expect(app).toContain(option);
    expect(app).toContain("onClick={() => openExportPreview('print')}");
    expect(app).toContain('onClick={createGuidedHomeworkShare}');
    expect(app).toContain('setShowSessionStartOptions(true)');
    expect(app).toContain('previewGuidedStudentAssignment={previewGuidedStudentAssignment}');
    expect(app).toContain("onExportSuccess: () => completeGuidedDelivery('exportCreated')");
  });

  it('keeps one intended left-panel surface visible for Directions, Delivery, and final review', () => {
    expect(app).toContain("guidedActiveSteps[guidedStep]?.id === 'directions')) ? undefined : 'none'");
    expect(app).toContain("guidedActiveSteps[guidedStep]?.id === 'package-deliver' || guidedActiveSteps[guidedStep]?.id === '_final'");
    expect(app).toContain("if (currentStep.id === '_final') return false;");
    expect(app).toContain("guidedActiveSteps[guidedStep]?.id === 'alignment') ? undefined : 'none'");
    expect(app).not.toContain("guidedActiveSteps[guidedStep]?.id === 'alignment' || guidedActiveSteps[guidedStep]?.id === '_final'");
  });
  it('keeps recap feedback local and makes generated and skipped items navigable', () => {
    expect(banner).toContain("localStorage.setItem('allo_guided_feedback'");
    expect(banner).toContain('openGuidedHistoryItem(entry.item)');
    expect(banner).toContain('Review skipped steps');
    expect(banner).toContain('setGuidedStep(entry.index)');
  });
});
describe('Guided Mode controlled-journey safeguards', () => {
  it('makes automatic advancement opt-in and persists the preference', () => {
    expect(app).toContain("localStorage.getItem('allo_guided_auto_advance') === 'true'");
    expect(app).toContain('if (!guidedMode || !guidedAutoAdvance || len !== prevLen + 1) return;');
    expect(app).toContain('guidedAutoAdvance={guidedAutoAdvance}');
    expect(banner).toContain('role="switch" aria-checked={!!guidedAutoAdvance}');
  });

  it('locks all generation variants and requires the source/final bookends', () => {
    expect(app).toContain('isGuidedRetrying={isProcessing || isGeneratingPersona || isGeneratingSource || isExtracting}');
    expect(app).toContain("new Set(['source-input', ...raw.selectedIds.filter(id => valid.has(id)), 'package-deliver', '_final'])");
    expect(app).toContain("if (id === 'source-input' || id === 'package-deliver' || id === '_final') return");
    expect(banner).toContain("const locked = s.id === 'source-input' || s.id === 'package-deliver' || s.id === '_final'");
  });

  it('counts entered source text as completed and ignores panel-shell clicks', () => {
    expect(banner).toContain("_effectiveCompletedSet.add('source-input')");
    expect(banner).toContain('const done = _effectiveCompletedSet.has(s.id)');
    expect(app).toContain("target.closest('button, input, select, textarea, a[href]");
    expect(app).toContain("control.getAttribute('aria-expanded') != null");
  });
});
describe('Guided Mode cleanup contracts', () => {
  it('archives completed runs separately from paused progress', () => {
    expect(app).toContain("localStorage.setItem('allo_guided_completed_runs'");
    expect(app).toContain("localStorage.setItem('allo_guided_last_completion'");
    expect(app).toContain('handleCompleteGuidedMode={handleCompleteGuidedMode}');
  });

  it('restores a temporary target tabindex after focus leaves', () => {
    const helper = app.slice(app.indexOf('const focusGuidedTarget'), app.indexOf('const handleCompleteGuidedMode'));
    expect(helper).toContain("const previousTabIndex = target.getAttribute('tabindex')");
    expect(helper).toContain("target.addEventListener('blur', restoreTabIndex, { once: true })");
    expect(helper).toContain("target.removeAttribute('tabindex')");
  });

  it('passes provider-aware progress data to the Guided banner', () => {
    expect(app).toContain('processingProgress={processingProgress}');
    expect(app).toContain('generationStep={generationStep}');
    expect(app).toContain('guidedProviderProfile={String(');
  });
});