// Guided Mode banner — completion-honesty + new affordances (2026-06-30).
//
// THE BUG (reported by the maintainer): the encouraging "✅ Analysis done" success
// note appeared the instant the teacher *clicked* the highlighted analysis tool —
// before Analyze had actually run. Root cause: the monolith flips `guidedEngaged`
// on the first click of the ringed control, and the banner rendered step.success
// directly off that flag. The async tool result lands later (or never, if they only
// clicked to look), so the banner was claiming work that hadn't happened.
//
// THE FIX: the ✅/success note now keys on a real completion signal —
//   - generate steps (analysis, faq, …): a NEW history item appeared since we
//     arrived at this step (the tool genuinely produced output);
//   - the source step: real text was entered;
//   - the few interaction-only steps: still the click (best signal available).
// `guidedEngaged` is retained ONLY for the "Next step" button affordance.
//
// These mount the real component with a real React renderer and drive the exact
// click-vs-completion transition, so a regression to the old behavior fails here.
// Also covers the source-step "Try this example" loader and the About read-aloud.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');

let React, ReactDOMClient, act, GuidedModeBanner;

// A small, realistic slice of the real GUIDED_STEPS (3 steps so the analysis step at
// index 1 is NOT the last — otherwise the end-of-flow recap renders and muddies text).
const STEPS = [
  { id: 'source-input', label: 'Source Material', action: 'Paste or type the text you want to adapt.', success: 'Source captured.' },
  { id: 'analysis', label: 'Analyze Source Material', action: 'Run Analyze to scan the reading level.', success: 'Analysis done. That shows you where to scaffold.' },
  { id: 'faq', label: 'FAQ Generator', action: 'Generate an FAQ.', success: 'FAQ ready.' },
];
const TOUR_MAP = { 'source-input': 'tour-input-panel', 'analysis': 'tour-tool-analysis', 'faq': 'tour-tool-faq' };
const TOUR_STEPS = [{ id: 'tour-tool-analysis', title: 'About Analysis', text: 'Analysis scans your text for **reading level** and key vocabulary.' }];

beforeEach(() => {
  localStorage.clear();
});
beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  // jsdom has no real audio; stub Audio so playAbout's play() resolves cleanly.
  const AudioStub = function () { return { play: () => Promise.resolve(), pause() {}, set src(_v) {}, set onended(_v) {}, set onerror(_v) {} }; };
  global.Audio = window.Audio = AudioStub;
  loadAlloModule('view_guided_mode_banner_module.js');
  GuidedModeBanner = window.AlloModules && window.AlloModules.GuidedModeBanner && window.AlloModules.GuidedModeBanner.GuidedModeBanner;
  if (!GuidedModeBanner) throw new Error('GuidedModeBanner not registered on window.AlloModules');
});

// t() returns '' so every `t('guided.x') || 'English fallback'` shows its fallback
// (and the few bare t() calls render empty). step.success/action are literal, not t()'d.
function baseProps(overrides) {
  return {
    GUIDED_STEPS: STEPS, allGuidedSteps: STEPS, guidedSelectedIds: null, toggleGuidedStepId: null,
    GUIDED_TOUR_MAP: TOUR_MAP, guidedStep: 1, guidedRect: null, guidedEngaged: false, wizardOpen: false,
    handleExitGuidedMode: () => {}, handleGuidedSkip: () => {}, setGuidedStep: () => {}, setShowGuidedTip: () => {},
    showGuidedTip: false, t: () => '', tourSteps: TOUR_STEPS, history: [], getDefaultTitle: (type) => type,
    inputText: '', setInputText: () => {}, guidedCompletedIds: [], guidedSkippedIds: [],
    guidedCreatedHistoryIds: [], wordSoundsHistory: [], markGuidedStepDone: () => {},
    ...overrides,
  };
}

function mountBanner(props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = {
    host, root,
    render(p) { act(() => { root.render(React.createElement(GuidedModeBanner, p)); }); },
    async renderAsync(p) { await act(async () => { root.render(React.createElement(GuidedModeBanner, p)); }); },
    text() { return host.textContent || ''; },
    button(substr) { return Array.from(host.querySelectorAll('button')).find(b => (b.textContent || '').includes(substr)); },
    cleanup() { try { act(() => root.unmount()); } catch (_) {} host.remove(); },
  };
  api.render(props);
  return api;
}

describe('Guided banner — success note is gated on real completion, not the click', () => {
  it('THE BUG: analysis step shows the ACTION (not "done") even when guidedEngaged is true, while history is empty', () => {
    const b = mountBanner(baseProps({ guidedStep: 1, guidedEngaged: true, history: [] }));
    const txt = b.text();
    // The old code showed step.success off guidedEngaged → would contain "Analysis done" here.
    expect(txt).not.toContain('Analysis done');
    expect(txt).toContain('Run Analyze');     // the still-pending action instruction
    expect(txt).toContain('👉');               // pending marker, not ✅
    expect(txt).not.toContain('✅');
    // A click alone now stays honest: the teacher may skip, but Next step waits for real output.
    expect(b.button('Next step')).toBeFalsy();
    expect(b.button('Skip')).toBeTruthy();
    b.cleanup();
  });

  it('shows "✅ Analysis done" only after a new history item appears on this step', () => {
    const b = mountBanner(baseProps({ guidedStep: 1, guidedEngaged: true, history: [] }));
    expect(b.text()).not.toContain('Analysis done');
    // The async analysis result lands in history (same step, same component instance):
    b.render(baseProps({ guidedStep: 1, guidedEngaged: true, history: [{ type: 'analysis', id: 'a1', title: 'Analysis' }] }));
    const txt = b.text();
    expect(txt).toContain('Analysis done');
    expect(txt).toContain('✅');
    expect(b.button('Next step')).toBeTruthy();
    b.cleanup();
  });

  it('does NOT flash "done" on a fresh step that a prior step\'s history would otherwise satisfy', () => {
    // Arrive at analysis with nothing produced yet, then its result lands → done:
    const b = mountBanner(baseProps({ guidedStep: 1, history: [] }));
    b.render(baseProps({ guidedStep: 1, history: [{ type: 'analysis', id: 'a1' }] }));
    expect(b.text()).toContain('Analysis done');
    // Advance to FAQ with the SAME history — re-baselined on step change, so FAQ is NOT yet "done"
    // even though an (unrelated) analysis item sits in history:
    b.render(baseProps({ guidedStep: 2, history: [{ type: 'analysis', id: 'a1' }] }));
    expect(b.text()).not.toContain('FAQ ready');
    expect(b.text()).toContain('Generate an FAQ');
    // Now FAQ produces its own output → done:
    b.render(baseProps({ guidedStep: 2, history: [{ type: 'analysis', id: 'a1' }, { type: 'faq', id: 'f1' }] }));
    expect(b.text()).toContain('FAQ ready');
    b.cleanup();
  });

  it('source step keys "done" on real entered text, not the click', () => {
    const b = mountBanner(baseProps({ guidedStep: 0, guidedEngaged: true, inputText: '' }));
    expect(b.text()).not.toContain('Source captured');   // clicked but no text → not done
    b.render(baseProps({ guidedStep: 0, guidedEngaged: true, inputText: 'A passage that is well over twenty characters long.' }));
    expect(b.text()).toContain('Source captured');
    b.cleanup();
  });
});

describe('Guided banner — source-step "Try this example" loader (integrity-safe sample data)', () => {
  it('offers the example only on the empty source step, and loads a real passage via setInputText', () => {
    const setInputText = vi.fn();
    const b = mountBanner(baseProps({ guidedStep: 0, inputText: '', setInputText }));
    const btn = b.button('example passage');
    expect(btn).toBeTruthy();
    act(() => { btn.click(); });
    expect(setInputText).toHaveBeenCalledTimes(1);
    const loaded = setInputText.mock.calls[0][0];
    expect(typeof loaded).toBe('string');
    expect(loaded.length).toBeGreaterThan(200);          // a substantial starter passage
    expect(loaded).toMatch(/^Photosynthesis/);           // real content, not a placeholder
    b.cleanup();
  });

  it('hides the example button once the source step already has text', () => {
    const b = mountBanner(baseProps({ guidedStep: 0, inputText: 'Teacher already pasted plenty of their own source text here.' }));
    expect(b.button('example passage')).toBeFalsy();
    expect(b.button('Worked example')).toBeFalsy();
    b.cleanup();
  });

  it('never offers the example on a non-source step', () => {
    const b = mountBanner(baseProps({ guidedStep: 1, inputText: '' }));
    expect(b.button('example passage')).toBeFalsy();
    expect(b.button('Worked example')).toBeTruthy();
    b.cleanup();
  });
});

describe('Guided banner — About-panel read-aloud reuses window.callTTS', () => {
  it('renders a Listen button in the About panel and calls window.callTTS with the step explanation', async () => {
    const callTTS = vi.fn(() => Promise.resolve('blob:fake-url'));
    window.callTTS = callTTS;
    const b = mountBanner(baseProps({ guidedStep: 1, showGuidedTip: true }));
    const listen = b.button('Listen');
    expect(listen).toBeTruthy();
    await act(async () => { listen.click(); });
    expect(callTTS).toHaveBeenCalled();
    const spoken = callTTS.mock.calls[0][0];
    expect(spoken).toContain('Analysis scans');          // the About text, read aloud
    expect(spoken).not.toContain('**');                  // markdown stripped before TTS
    b.cleanup();
    delete window.callTTS;
  });

  it('omits the Listen button when no TTS backend is available', () => {
    delete window.callTTS;
    const b = mountBanner(baseProps({ guidedStep: 1, showGuidedTip: true }));
    expect(b.button('Listen')).toBeFalsy();
    b.cleanup();
  });
});

describe('Guided banner - per-step "Worked example" tab', () => {
  it('opens a display-only worked example on a generate step', () => {
    const b = mountBanner(baseProps({ guidedStep: 1 }));
    const btn = b.button('Worked example');
    expect(btn).toBeTruthy();
    act(() => { btn.click(); });
    const txt = b.text();
    expect(txt).toContain('Example output');
    expect(txt).toContain('Photosynthesis');
    expect(txt).toContain('View the full worked lesson');
    b.cleanup();
  });

  it('toggles the worked example panel locally without a host callback', () => {
    const onShowGuidedExample = vi.fn();
    const b = mountBanner(baseProps({ guidedStep: 1, onShowGuidedExample }));
    const btn = b.button('Worked example');
    act(() => { btn.click(); });
    expect(b.text()).toContain('Example output');
    act(() => { btn.click(); });
    expect(b.text()).not.toContain('Example output');
    expect(onShowGuidedExample).not.toHaveBeenCalled();
    b.cleanup();
  });

  it('does NOT offer the worked-example tab on the source step (it has the load-text example instead)', () => {
    const b = mountBanner(baseProps({ guidedStep: 0 }));
    expect(b.button('Worked example')).toBeFalsy();
    expect(b.button('example passage')).toBeTruthy();
    b.cleanup();
  });
});

describe('Guided banner - progress, skips, and real interaction completion', () => {
  it('reports the visible step number with one-based progress', () => {
    const b = mountBanner(baseProps({ guidedStep: 0 }));
    const progress = b.host.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    expect(progress.getAttribute('aria-valuemin')).toBe('1');
    expect(progress.getAttribute('aria-valuemax')).toBe(String(STEPS.length));
    b.cleanup();
  });

  it('tells the host whether an advance was an explicit skip', () => {
    const handleGuidedSkip = vi.fn();
    const pending = mountBanner(baseProps({ guidedStep: 1, handleGuidedSkip }));
    act(() => { pending.button('Skip').click(); });
    expect(handleGuidedSkip).toHaveBeenCalledWith(true);
    pending.cleanup();

    const done = mountBanner(baseProps({ guidedStep: 1, history: [], guidedCompletedIds: ['analysis'], handleGuidedSkip }));
    act(() => { done.button('Next step').click(); });
    expect(handleGuidedSkip).toHaveBeenLastCalledWith(false);
    done.cleanup();
  });

  it('recaps only resources recorded as created during this Guided run', () => {
    const history = [
      { id: 'old', type: 'analysis', title: 'Old unrelated resource' },
      { id: 'new', type: 'faq', title: 'Guided FAQ' },
    ];
    const b = mountBanner(baseProps({ guidedStep: 2, history, guidedCreatedHistoryIds: ['new'] }));
    expect(b.text()).toContain('Guided FAQ');
    expect(b.text()).not.toContain('Old unrelated resource');
    b.cleanup();
  });

  it('does not complete Word Sounds or Adventure from a panel click alone', () => {
    const wordSteps = [
      STEPS[0],
      { id: 'ui-tool-wordsounds', label: 'Word Sounds', action: 'Practice words.', success: 'Word Sounds set.' },
      STEPS[2],
    ];
    const wordProps = { ...baseProps(), GUIDED_STEPS: wordSteps, allGuidedSteps: wordSteps, guidedStep: 1, guidedEngaged: true };
    const words = mountBanner(wordProps);
    expect(words.text()).not.toContain('Word Sounds set.');
    words.render({ ...wordProps, wordSoundsHistory: [{ word: 'plant', correct: true }] });
    expect(words.text()).toContain('Word Sounds set.');
    words.cleanup();

    const adventureSteps = [
      STEPS[0],
      { id: 'adventure', label: 'Adventure', action: 'Build an adventure.', success: 'Adventure ready.' },
      STEPS[2],
    ];
    const adventureProps = { ...baseProps(), GUIDED_STEPS: adventureSteps, allGuidedSteps: adventureSteps, guidedStep: 1, guidedEngaged: true };
    const adventure = mountBanner(adventureProps);
    expect(adventure.text()).not.toContain('Adventure ready.');
    adventure.render({ ...adventureProps, history: [{ id: 'adv1', type: 'adventure' }] });
    expect(adventure.text()).toContain('Adventure ready.');
    adventure.cleanup();
  });
});

describe('Guided banner - navigation, summary, and declared localization', () => {
  it('supports Back without clearing completion and Resume later through the host exit handler', () => {
    const setGuidedStep = vi.fn();
    const handleExitGuidedMode = vi.fn();
    const b = mountBanner(baseProps({ guidedStep: 1, guidedCompletedIds: ['analysis'], setGuidedStep, handleExitGuidedMode }));
    act(() => { b.button('Back').click(); });
    expect(setGuidedStep).toHaveBeenCalledTimes(1);
    expect(setGuidedStep.mock.calls[0][0](1)).toBe(0);
    act(() => { b.button('Resume later').click(); });
    expect(handleExitGuidedMode).toHaveBeenCalledTimes(1);
    b.cleanup();
  });

  it('summarizes completed, skipped, and Guided-created resources on the final step', () => {
    const history = [{ id: 'guided-faq', type: 'faq', title: 'Guided FAQ' }];
    const b = mountBanner(baseProps({
      guidedStep: 2,
      guidedCompletedIds: ['analysis'],
      guidedSkippedIds: ['source-input'],
      guidedCreatedHistoryIds: ['guided-faq'],
      history,
    }));
    const summary = b.host.querySelector('[role="list"][aria-label="Guided Mode completion summary"]');
    expect(summary).toBeTruthy();
    const items = Array.from(summary.querySelectorAll('[role="listitem"]')).map(item => item.textContent);
    expect(items).toEqual(['1Completed', '1Skipped', '1Resources']);
    b.cleanup();
  });

  it('uses the declared tour translation map and avoids an English success sentence in non-English UI', () => {
    const translated = {
      'tour.analysis_title': 'Analizar el material',
      'tour.analysis_text': 'Ejecuta el análisis del texto.',
    };
    const b = mountBanner(baseProps({
      guidedStep: 1,
      guidedCompletedIds: ['analysis'],
      currentUiLanguage: 'Spanish',
      t: (key) => translated[key] || '',
    }));
    expect(b.text()).toContain('Analizar el material');
    expect(b.text()).toContain('Analizar el material ✓');
    expect(b.text()).not.toContain('Analysis done');
    b.cleanup();
  });
});
describe('Guided banner - controlled journey UX', () => {
  it('locks step-changing controls while a resource is being generated', () => {
    localStorage.removeItem('allo_guided_ui_state');
    const b = mountBanner(baseProps({ guidedStep: 1, isGuidedRetrying: true }));
    expect(b.text()).toContain('Step navigation is paused');
    expect(b.button('Back').disabled).toBe(true);
    expect(b.button('Skip').disabled).toBe(true);
    expect(b.button('Resume later').disabled).toBe(true);
    expect(b.host.querySelector('select').disabled).toBe(true);
    b.cleanup();
  });

  it('shows entered source text as completed in the segmented progress display', () => {
    localStorage.removeItem('allo_guided_ui_state');
    const b = mountBanner(baseProps({ guidedStep: 1, inputText: 'A source passage that is definitely longer than twenty characters.' }));
    const firstSegment = b.host.querySelector('[role="progressbar"] > div');
    expect(firstSegment.style.background).toContain('linear-gradient');
    expect(firstSegment.style.background).toContain('52, 211, 153');
    b.cleanup();
  });

  it('confirms a path change after progress and exposes opt-in auto-advance', () => {
    localStorage.removeItem('allo_guided_ui_state');
    const applyGuidedPreset = vi.fn();
    const setGuidedAutoAdvance = vi.fn();
    const presets = [{ id: 'reading-access', label: 'Adapt a reading', description: 'Reading support', stepIds: ['analysis'] }];
    const b = mountBanner(baseProps({ guidedCompletedIds: ['analysis'], toggleGuidedStepId: vi.fn(), guidedPresets: presets, applyGuidedPreset, guidedAutoAdvance: false, setGuidedAutoAdvance }));
    act(() => { b.host.querySelector('[aria-controls="guided-step-picker"]').click(); });
    act(() => { b.button('Adapt a reading').click(); });
    expect(b.text()).toContain('Change Guided path?');
    expect(applyGuidedPreset).not.toHaveBeenCalled();
    act(() => { b.button('Change path').click(); });
    expect(applyGuidedPreset).toHaveBeenCalledWith(presets[0]);
    b.cleanup();

    const c = mountBanner(baseProps({ toggleGuidedStepId: vi.fn(), guidedAutoAdvance: false, setGuidedAutoAdvance }));
    act(() => { c.host.querySelector('[aria-controls="guided-step-picker"]').click(); });
    const autoSwitch = c.host.querySelector('[role="switch"]');
    expect(autoSwitch.getAttribute('aria-checked')).toBe('false');
    act(() => { autoSwitch.click(); });
    expect(setGuidedAutoAdvance).toHaveBeenCalledTimes(1);
    c.cleanup();
  });
});
describe('Guided banner - data lifecycle and accountable navigation', () => {
  const presets = [{ id: 'complete', label: 'Complete lesson pack', description: 'Use every step.', stepIds: null }];

  it('confirms a forward jump and reports bypassed unfinished steps to the host', () => {
    const handleGuidedJump = vi.fn();
    const b = mountBanner(baseProps({ guidedStep: 0, inputText: 'A source passage that is definitely longer than twenty characters.', handleGuidedJump }));
    const jump = b.host.querySelector('#guided-step-jump');
    act(() => { jump.value = '2'; jump.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(b.text()).toContain('Jump forward?');
    expect(handleGuidedJump).not.toHaveBeenCalled();
    act(() => { b.button('Jump and mark skipped').click(); });
    expect(handleGuidedJump).toHaveBeenCalledWith(2, ['analysis']);
    b.cleanup();
  });

  it('rejects a malformed stored completion summary', () => {
    localStorage.setItem('allo_guided_last_completion', JSON.stringify({ completedAt: 'not-a-date', completedCount: 5000 }));
    const b = mountBanner(baseProps({ guidedStep: 0, guidedPresets: presets, applyGuidedPreset: vi.fn() }));
    expect(b.text()).not.toContain('Last completed run');
    expect(b.text()).not.toContain('Invalid Date');
    b.cleanup();
  });

  it('clears Guided archives, timing, reflections, and preferences while preserving active progress', () => {
    const removable = ['allo_guided_completed_runs', 'allo_guided_last_completion', 'allo_guided_duration_stats', 'allo_guided_feedback', 'allo_guided_ui_state', 'allo_guided_path_prompt_seen', 'allo_guided_auto_advance'];
    removable.forEach(key => localStorage.setItem(key, key.includes('path_prompt') || key.includes('auto_advance') ? 'true' : '{}'));
    localStorage.setItem('allo_guided_progress', JSON.stringify({ version: 1, guidedStep: 1 }));
    const b = mountBanner(baseProps({ toggleGuidedStepId: vi.fn(), guidedAutoAdvance: true, setGuidedAutoAdvance: vi.fn() }));
    act(() => { b.host.querySelector('[aria-controls="guided-step-picker"]').click(); });
    act(() => { b.button('Clear Guided history & preferences').click(); });
    expect(b.text()).toContain('Clear local Guided data?');
    act(() => { b.button('Clear now').click(); });
    removable.forEach(key => expect(localStorage.getItem(key), key).toBeNull());
    expect(localStorage.getItem('allo_guided_progress')).not.toBeNull();
    b.cleanup();
  });

  it('records only successful duration samples and caps history at twenty', () => {
    const key = 'cloud:analysis';
    localStorage.setItem('allo_guided_duration_stats', JSON.stringify({ [key]: { averageMs: 2000, samples: 20, values: Array(20).fill(2000) } }));
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const b = mountBanner(baseProps({ guidedStep: 1, isGuidedRetrying: true, guidedProviderProfile: 'cloud', history: [] }));
    now.mockReturnValue(4000);
    b.render(baseProps({ guidedStep: 1, isGuidedRetrying: false, guidedProviderProfile: 'cloud', history: [{ id: 'a1', type: 'analysis' }] }));
    const stats = JSON.parse(localStorage.getItem('allo_guided_duration_stats'))[key];
    expect(stats.samples).toBe(20);
    expect(stats.values).toHaveLength(20);
    expect(stats.values.at(-1)).toBe(3000);
    now.mockRestore();
    b.cleanup();

    localStorage.removeItem('allo_guided_duration_stats');
    const failedNow = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const c = mountBanner(baseProps({ guidedStep: 1, isGuidedRetrying: true, guidedProviderProfile: 'cloud', history: [] }));
    failedNow.mockReturnValue(5000);
    c.render(baseProps({ guidedStep: 1, isGuidedRetrying: false, guidedProviderProfile: 'cloud', history: [], guidedStepError: new Error('failed') }));
    expect(localStorage.getItem('allo_guided_duration_stats')).toBeNull();
    failedNow.mockRestore();
    c.cleanup();
  });
});
describe('Guided banner - outcome phases and delivery actions', () => {
  it('shows a phase-aware delivery recommender and completes only after verified delivery evidence', () => {
    const deliverySteps = [
      { id: 'package-deliver', phase: 'deliver', label: 'Preview, Package & Deliver', action: 'Choose a delivery route.', success: 'Delivery path reviewed.' },
      { id: '_final', phase: 'finish', label: 'Review & Finish', action: 'Review the lesson.', success: 'All set.' },
    ];
    const markGuidedStepDone = vi.fn();
    const openGuidedDocumentBuilder = vi.fn();
    const b = mountBanner(baseProps({
      GUIDED_STEPS: deliverySteps,
      allGuidedSteps: deliverySteps,
      GUIDED_TOUR_MAP: { 'package-deliver': 'tour-tool-fullpack', '_final': 'tour-tool-fullpack' },
      guidedStep: 0,
      guidedPhases: [{ id: 'deliver', label: 'Preview & deliver', description: 'Choose a route.' }, { id: 'finish', label: 'Review & finish', description: 'Finish.' }],
      guidedDeliveryGroups: [{ id: 'print', label: 'Print & editable documents', options: ['PDF / Print', 'Accessible Word (.docx)'] }],
      markGuidedStepDone,
      openGuidedDocumentBuilder,
      createGuidedHomeworkShare: vi.fn(),
      startGuidedLiveSession: vi.fn(),
      previewGuidedStudentAssignment: vi.fn(),
      canPreviewGuidedStudentAssignment: false,
    }));
    expect(b.text()).toContain('Phase 1 of 2');
    expect(b.text()).toContain('Print & editable documents');
    expect(b.text()).toContain('Accessible Word (.docx)');
    expect(b.text()).toContain('Help me choose');
    expect(b.text()).toContain('Recommended');
    expect(b.button('Test student link').disabled).toBe(true);
    act(() => { b.button('Document Builder').click(); });
    expect(markGuidedStepDone).not.toHaveBeenCalled();
    expect(openGuidedDocumentBuilder).toHaveBeenCalledTimes(1);
    b.render(baseProps({
      GUIDED_STEPS: deliverySteps, allGuidedSteps: deliverySteps,
      GUIDED_TOUR_MAP: { 'package-deliver': 'tour-tool-fullpack', '_final': 'tour-tool-fullpack' },
      guidedStep: 0,
      guidedPhases: [{ id: 'deliver', label: 'Preview & deliver' }, { id: 'finish', label: 'Review & finish' }],
      guidedDeliveryGroups: [{ id: 'print', label: 'Print & editable documents', options: ['PDF / Print', 'Accessible Word (.docx)'] }],
      markGuidedStepDone, openGuidedDocumentBuilder,
      guidedDeliveryEvidence: { exportCreated: true },
    }));
    expect(markGuidedStepDone).toHaveBeenCalledWith('package-deliver');
    b.cleanup();
  });
});