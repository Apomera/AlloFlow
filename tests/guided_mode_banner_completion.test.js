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
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

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
  it('reports the current phase with one-based progress', () => {
    const b = mountBanner(baseProps({ guidedStep: 0 }));
    const progress = b.host.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    expect(progress.getAttribute('aria-valuemin')).toBe('1');
    expect(progress.getAttribute('aria-valuemax')).toBe('1');
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

  it('shows completed work in the phase progress display', () => {
    localStorage.removeItem('allo_guided_ui_state');
    const phaseSteps = STEPS.map((item, index) => ({ ...item, phase: ['plan', 'understand', 'practice'][index] }));
    const b = mountBanner(baseProps({ GUIDED_STEPS: phaseSteps, allGuidedSteps: phaseSteps, guidedStep: 1, inputText: 'A source passage that is definitely longer than twenty characters.' }));
    const firstSegment = b.host.querySelector('[role="progressbar"] > div');
    expect(firstSegment.getAttribute('data-state')).toBe('done');
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
describe('Guided banner - AI-configured lesson path', () => {
  it('turns a natural-language goal into a reviewable plan and applies it only after approval', async () => {
    const generateGuidedPlanFromGoal = vi.fn().mockResolvedValue({
      source: 'ai', title: 'Vocabulary and assessment path', summary: 'Build access supports and a short check.',
      rationale: 'The goal asks for vocabulary and independent assessment.',
      stepIds: ['analysis', 'faq'], stepReasons: { analysis: 'Find barriers first.', faq: 'Prepare likely questions.' },
      estimatedMinutes: 18, deliverySetting: 'lms', deliveryPriority: 'assessment', assumptions: ['A short source will be provided.'],
    });
    const applyGuidedPreset = vi.fn();
    const b = mountBanner(baseProps({
      guidedStep: 0, guidedPresets: [], applyGuidedPreset, generateGuidedPlanFromGoal,
      allGuidedSteps: STEPS, GUIDED_STEPS: STEPS,
    }));
    act(() => { b.button('Plan with AI').click(); });
    const textarea = b.host.querySelector('#guided-ai-goal');
    expect(textarea).toBeTruthy();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, 'Build vocabulary support and a short independent assessment with an LMS backup.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => { b.button('Create my Guided plan').click(); });
    expect(generateGuidedPlanFromGoal).not.toHaveBeenCalled();
    expect(b.text()).toContain('Two quick questions will improve this plan');
    const timeQuestion = b.host.querySelector('#guided-ai-question-time');
    const gradeQuestion = b.host.querySelector('#guided-ai-question-grade');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(timeQuestion, '40–50 minutes'); timeQuestion.dispatchEvent(new Event('change', { bubbles: true }));
      setter.call(gradeQuestion, 'Middle school (6–8)'); gradeQuestion.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { b.button('Continue and create plan').click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(generateGuidedPlanFromGoal).toHaveBeenCalledWith(expect.stringMatching(/vocabulary support[\s\S]*PLANNING CONTEXT:[\s\S]*40–50 minutes/));
    expect(b.text()).toContain('Vocabulary and assessment path');
    expect(b.text()).toContain('Find barriers first.');
    expect(b.text()).toContain('Before you begin: lesson roadmap');
    expect(b.text()).toContain('Expected lesson resources');
    expect(b.text()).toContain('Planned delivery');
    expect(b.text()).toContain('Plan readiness');
    expect(b.text()).toContain('QTI packaging requires quiz content');
    expect(b.host.querySelector('[role="dialog"][aria-modal="true"]')).toBeTruthy();
    expect(applyGuidedPreset).not.toHaveBeenCalled();

    const refinement = b.host.querySelector('#guided-ai-refinement');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(refinement, 'Make it shorter and prioritize printable options.');
      refinement.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { b.button('Update this plan').click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(generateGuidedPlanFromGoal).toHaveBeenNthCalledWith(2, expect.stringContaining('vocabulary support'), expect.objectContaining({
      currentPlan: expect.objectContaining({ stepIds: ['analysis', 'faq'] }),
      refinement: expect.stringContaining('prioritize printable'),
    }));
    expect(b.text()).toContain('Make it shorter and prioritize printable options.');
    expect(b.text()).toContain('What changed');
    expect(b.text()).toContain('The plan wording was refined without changing its steps, timing, or delivery settings.');

    act(() => { b.button('Review plan').click(); });
    expect(b.text()).toContain('Review the complete path');
    act(() => { b.button('Save plan').click(); });
    const savedPlans = JSON.parse(localStorage.getItem('allo_guided_saved_plans') || '[]');
    expect(savedPlans).toHaveLength(1);
    expect(savedPlans[0]).toEqual(expect.objectContaining({ name: 'Vocabulary and assessment path', stepIds: ['analysis', 'faq'] }));
    act(() => { b.button('Back to customize').click(); });
    act(() => { b.button('Back to description').click(); });
    act(() => { b.button('Saved plans (1)').click(); });
    expect(b.text()).toContain('Your saved Guided plans');
    act(() => { b.button('Load').click(); });
    expect(b.text()).toContain('Saved plan');
    expect(applyGuidedPreset).not.toHaveBeenCalled();
    act(() => { b.button('Review plan').click(); });
    act(() => { b.button('Use this Guided plan').click(); });
    expect(applyGuidedPreset).toHaveBeenCalledWith(expect.objectContaining({ id: 'ai-plan', stepIds: ['analysis', 'faq'] }));
    expect(JSON.parse(localStorage.getItem('allo_guided_delivery_preferences') || '{}')).toEqual({ setting: 'lms', priority: 'assessment' });
    b.cleanup();
  });
  it('flags a missing QTI prerequisite and adds the Assess step without changing the active path', async () => {
    const planSteps = [
      { id: 'source-input', phase: 'plan', label: 'Source Material', action: 'Add source.', success: 'Ready.' },
      { id: 'analysis', phase: 'understand', label: 'Analyze Source Material', action: 'Analyze.', success: 'Ready.' },
      { id: 'quiz', phase: 'assess', label: 'Assess', action: 'Create a quiz.', success: 'Ready.' },
    ];
    const generateGuidedPlanFromGoal = vi.fn().mockResolvedValue({
      source: 'ai', title: 'LMS assessment', summary: 'Prepare an LMS assessment.', stepIds: ['analysis'],
      estimatedMinutes: 20, deliverySetting: 'lms', deliveryPriority: 'assessment', assumptions: [],
    });
    const applyGuidedPreset = vi.fn();
    const b = mountBanner(baseProps({
      guidedStep: 0, guidedPresets: [], applyGuidedPreset, generateGuidedPlanFromGoal,
      openGuidedDocumentBuilder: vi.fn(), allGuidedSteps: planSteps, GUIDED_STEPS: planSteps,
    }));
    act(() => { b.button('Plan with AI').click(); });
    const textarea = b.host.querySelector('#guided-ai-goal');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, 'I have 40 minutes with seventh grade students. Build an LMS quiz assessment.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { b.button('Create my Guided plan').click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(b.text()).toContain('QTI packaging requires quiz content');
    expect(applyGuidedPreset).not.toHaveBeenCalled();
    act(() => { b.button('Add Assess step').click(); });
    expect(b.text()).toContain('Edited by you');
    act(() => { b.button('Undo last change').click(); });
    expect(b.text()).toContain('QTI packaging requires quiz content');
    act(() => { b.button('Add Assess step').click(); });
    expect(b.text()).toContain('Quiz content is included for the planned QTI package.');
    expect(b.text()).not.toContain('QTI packaging requires quiz content');
    expect(b.text()).toContain('13 min to build');
    expect(b.text()).toContain('2 resources');
    act(() => { b.button('Review plan').click(); });
    act(() => { b.button('Use this Guided plan').click(); });
    expect(applyGuidedPreset).toHaveBeenCalledWith(expect.objectContaining({ stepIds: ['analysis', 'quiz'] }));
    b.cleanup();
  });

  it('can use best judgment instead of blocking on clarification questions', async () => {
    const goal = 'Build vocabulary support and a short independent assessment.';
    const generateGuidedPlanFromGoal = vi.fn().mockResolvedValue({
      source: 'ai', title: 'Best judgment path', summary: 'Use sensible defaults.',
      stepIds: ['analysis'], estimatedMinutes: 12, deliverySetting: 'take-home', deliveryPriority: 'accessible', assumptions: [],
    });
    const b = mountBanner(baseProps({
      guidedStep: 0, guidedPresets: [], generateGuidedPlanFromGoal,
      allGuidedSteps: STEPS, GUIDED_STEPS: STEPS,
    }));
    act(() => { b.button('Plan with AI').click(); });
    const textarea = b.host.querySelector('#guided-ai-goal');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, goal);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => { b.button('Create my Guided plan').click(); });
    expect(b.text()).toContain('Two quick questions will improve this plan');
    await act(async () => { b.button('Use your best judgment').click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(generateGuidedPlanFromGoal).toHaveBeenCalledWith(goal);
    expect(generateGuidedPlanFromGoal.mock.calls[0][0]).not.toContain('PLANNING CONTEXT');
    expect(b.text()).toContain('Best judgment path');
    b.cleanup();
  });

  it('keeps, restores, and can explicitly discard an unfinished private planning draft', () => {
    const goal = 'Create a visual middle-school lesson with printable supports.';
    const b = mountBanner(baseProps({ guidedStep: 0, guidedPresets: [], allGuidedSteps: STEPS, GUIDED_STEPS: STEPS }));
    act(() => { b.button('Plan with AI').click(); });
    const textarea = b.host.querySelector('#guided-ai-goal');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, goal);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => { b.host.querySelector('button[aria-label="Close"]').click(); });
    expect(b.text()).toContain('Keep this unfinished plan?');
    act(() => { b.button('Keep draft and close').click(); });
    expect(b.host.querySelector('[role="dialog"]')).toBeFalsy();
    expect(JSON.parse(localStorage.getItem('allo_guided_planner_draft') || 'null')).toEqual(expect.objectContaining({ goal }));

    act(() => { b.button('Plan with AI').click(); });
    expect(b.text()).toContain('Resume your unfinished plan?');
    act(() => { b.button('Resume draft').click(); });
    expect(b.host.querySelector('#guided-ai-goal').value).toBe(goal);
    act(() => { b.host.querySelector('button[aria-label="Close"]').click(); });
    act(() => { b.button('Discard and close').click(); });
    expect(localStorage.getItem('allo_guided_planner_draft')).toBeNull();
    expect(b.host.querySelector('[role="dialog"]')).toBeFalsy();
    b.cleanup();
  });
});
describe('Guided banner - adaptive planning context and phase checkpoints', () => {
  it('reuses non-identifying classroom context and updates only the remaining path after progress', async () => {
    const generateGuidedPlanFromGoal = vi.fn().mockResolvedValue({
      source: 'ai', title: 'Responsive remaining path', summary: 'Support access before the final resource.',
      stepIds: ['faq'], estimatedMinutes: 8, deliverySetting: 'lms', deliveryPriority: 'accessible', assumptions: [],
    });
    const applyGuidedPreset = vi.fn();
    const applyGuidedPlanToRemaining = vi.fn();
    const b = mountBanner(baseProps({
      guidedStep: 1, guidedCompletedIds: ['analysis'], guidedPresets: [], toggleGuidedStepId: vi.fn(), applyGuidedPreset, applyGuidedPlanToRemaining,
      generateGuidedPlanFromGoal, allGuidedSteps: STEPS, GUIDED_STEPS: STEPS,
    }));
    act(() => { b.host.querySelector('button[aria-label="Choose which steps to include"]').click(); });
    act(() => { b.button('Plan or refine this path with AI').click(); });
    act(() => { b.button('Multilingual learners').click(); });
    const languages = b.host.querySelector('#guided-ai-context-languages');
    const goal = b.host.querySelector('#guided-ai-goal');
    act(() => {
      const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      inputSetter.call(languages, 'English and Spanish'); languages.dispatchEvent(new Event('input', { bubbles: true }));
      const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      textareaSetter.call(goal, 'I have 40 minutes with seventh grade students using an LMS and need a short quiz assessment.');
      goal.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { b.button('Create my Guided plan').click(); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(generateGuidedPlanFromGoal).toHaveBeenCalledWith(expect.stringMatching(/PLANNING CONTEXT:[\s\S]*learner supports: Multilingual learners[\s\S]*classroom languages: English and Spanish/));
    expect(JSON.parse(localStorage.getItem('allo_guided_classroom_context') || '{}')).toEqual(expect.objectContaining({ supports: ['multilingual'], languages: 'English and Spanish' }));
    act(() => { b.button('Review plan').click(); });
    act(() => { b.button('Use this Guided plan').click(); });
    expect(b.text()).toContain('Keep completed work and update only what comes next');
    act(() => { b.button('Update remaining steps').click(); });
    expect(applyGuidedPlanToRemaining).toHaveBeenCalledWith(expect.objectContaining({ stepIds: ['faq'] }));
    expect(applyGuidedPreset).not.toHaveBeenCalled();
    b.cleanup();
  });

  it('imports a validated portable plan file and exports the saved collection', async () => {
    const b = mountBanner(baseProps({
      guidedStep: 0, guidedPresets: [], generateGuidedPlanFromGoal: vi.fn(),
      allGuidedSteps: STEPS, GUIDED_STEPS: STEPS,
    }));
    act(() => { b.button('Plan with AI').click(); });
    const input = b.host.querySelector('input[type="file"][accept=".json,application/json"]');
    const portable = {
      format: 'alloflow-guided-plans', version: 1,
      plans: [{ id: 'portable-1', name: 'Portable lesson', title: 'Portable lesson', summary: 'A reusable path.', stepIds: ['analysis', 'retired-step'], stepReasons: { analysis: 'Scan barriers.', 'retired-step': 'Legacy reason.' }, deliverySetting: 'print', deliveryPriority: 'accessible' }],
    };
    Object.defineProperty(input, 'files', { configurable: true, value: [{ size: 200, text: async () => JSON.stringify(portable) }] });
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(b.text()).toContain('Review plans before importing');
    expect(b.text()).toContain('Portable lesson');
    expect(b.text()).toContain('1 unsupported step(s) will be omitted');
    act(() => { b.button('Import selected plans').click(); });
    expect(b.text()).toContain('Imported 1 new Guided plan(s).');
    expect(JSON.parse(localStorage.getItem('allo_guided_saved_plans') || '[]')).toEqual([expect.objectContaining({ name: 'Portable lesson', stepIds: ['analysis'], stepReasons: { analysis: 'Scan barriers.' } })]);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:guided-plans');
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    act(() => { b.button('Export saved plans').click(); });
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(b.text()).toContain('Exported 1 Guided plan(s).');
    clickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    b.cleanup();
  });
  it('pauses at a phase boundary with a compact recap before continuing', () => {
    const phaseSteps = [
      { id: 'analysis', phase: 'understand', label: 'Analyze', action: 'Analyze.', success: 'Analysis ready.' },
      { id: 'faq', phase: 'participate', label: 'Discuss', action: 'Discuss.', success: 'Discussion ready.' },
    ];
    const handleGuidedSkip = vi.fn();
    const openGuidedHistoryItem = vi.fn();
    const b = mountBanner(baseProps({
      GUIDED_STEPS: phaseSteps, allGuidedSteps: phaseSteps, guidedStep: 0,
      guidedCompletedIds: ['analysis'], guidedCreatedHistoryIds: ['a1'],
      history: [{ id: 'a1', type: 'analysis', title: 'Barrier scan' }],
      guidedPhases: [{ id: 'understand', label: 'Understand' }, { id: 'participate', label: 'Participate' }],
      handleGuidedSkip, openGuidedHistoryItem,
    }));
    expect(b.text()).toContain('Understand phase complete');
    expect(b.text()).toContain('1 completed · 0 skipped · 1 resources created');
    expect(b.text()).toContain('Barrier scan');
    expect(b.button('Next step')).toBeFalsy();
    act(() => { b.button('Continue to Participate').click(); });
    expect(handleGuidedSkip).toHaveBeenCalledWith(false);
    b.cleanup();
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

describe('Guided banner - persistent brief, resilient checkpoints, and launchpad', () => {
  it('keeps the applied lesson brief and remaining-time estimate visible during the run', () => {
    const b = mountBanner(baseProps({
      guidedStep: 1,
      guidedPlanBrief: {
        title: 'Seventh-grade ecosystem discussion',
        summary: 'A focused path from barrier scan to student discussion.',
        goal: 'Prepare a 40-minute lesson for multilingual learners.',
        stepReasons: { analysis: 'Find language and concept barriers before students discuss.' },
      },
    }));
    expect(b.text()).toContain('About 4 min remaining');
    expect(b.text()).toContain('Lesson brief · Seventh-grade ecosystem discussion');
    expect(b.text()).toContain('Prepare a 40-minute lesson for multilingual learners.');
    expect(b.text()).toContain('Why this step');
    expect(b.text()).toContain('Find language and concept barriers before students discuss.');
    b.cleanup();
  });

  it('shows the phase checkpoint after a boundary step is skipped', () => {
    const phaseSteps = [
      { id: 'analysis', phase: 'understand', label: 'Analyze', action: 'Analyze.', success: 'Analysis ready.' },
      { id: 'faq', phase: 'participate', label: 'Discuss', action: 'Discuss.', success: 'Discussion ready.' },
    ];
    const handleGuidedSkip = vi.fn();
    const b = mountBanner(baseProps({
      GUIDED_STEPS: phaseSteps, allGuidedSteps: phaseSteps, guidedStep: 0,
      guidedSkippedIds: ['analysis'], guidedCompletedIds: [],
      guidedPhases: [{ id: 'understand', label: 'Understand' }, { id: 'participate', label: 'Participate' }],
      handleGuidedSkip,
    }));
    expect(b.text()).toContain('Understand phase complete');
    expect(b.text()).toContain('0 completed');
    expect(b.text()).toContain('1 skipped');
    expect(b.button('Skip step')).toBeFalsy();
    act(() => { b.button('Continue to Participate').click(); });
    expect(handleGuidedSkip).toHaveBeenCalledWith(false);
    b.cleanup();
  });

  it('turns the final step into a ready-to-teach launchpad for core materials', () => {
    const finalSteps = [{ id: '_final', phase: 'finish', label: 'Review & Finish', action: 'Review the lesson.', success: 'All set.' }];
    const lessonPlan = { id: 'lp-1', type: 'lesson-plan', title: 'Ecosystems lesson plan' };
    const directions = { id: 'dir-1', type: 'directions', title: 'Student directions' };
    const openGuidedHistoryItem = vi.fn();
    const openGuidedDocumentBuilder = vi.fn();
    const previewGuidedStudentAssignment = vi.fn();
    const b = mountBanner(baseProps({
      GUIDED_STEPS: finalSteps, allGuidedSteps: finalSteps, guidedStep: 0,
      history: [lessonPlan, directions], guidedCreatedHistoryIds: ['lp-1', 'dir-1'],
      guidedDeliveryEvidence: { directionsSaved: true, studentPreviewed: true, exportCreated: true },
      openGuidedHistoryItem, openGuidedDocumentBuilder,
      previewGuidedStudentAssignment, canPreviewGuidedStudentAssignment: true,
    }));
    expect(b.text()).toContain('Ready-to-teach launchpad');
    expect(b.text()).toContain('Lesson plan');
    expect(b.text()).toContain('Student directions');
    act(() => { b.button('Open lesson plan').click(); });
    act(() => { b.button('Open directions').click(); });
    act(() => { b.button('Open package builder').click(); });
    act(() => { b.button('Preview learner view').click(); });
    expect(openGuidedHistoryItem).toHaveBeenNthCalledWith(1, lessonPlan);
    expect(openGuidedHistoryItem).toHaveBeenNthCalledWith(2, directions);
    expect(openGuidedDocumentBuilder).toHaveBeenCalledTimes(1);
    expect(previewGuidedStudentAssignment).toHaveBeenCalledTimes(1);
    b.cleanup();
  });
});

describe('Guided banner - deliberate student-readiness launch gate', () => {
  it('lists unresolved checks before teaching and allows an intentional override', () => {
    const finalSteps = [{ id: '_final', phase: 'finish', label: 'Review & Finish', action: 'Review the lesson.', success: 'All set.' }];
    const oldDirections = { id: 'old-directions', type: 'directions', title: 'Directions from another lesson' };
    const openGuidedDocumentBuilder = vi.fn();
    const b = mountBanner(baseProps({
      GUIDED_STEPS: finalSteps, allGuidedSteps: finalSteps, guidedStep: 0,
      history: [oldDirections], guidedCreatedHistoryIds: [],
      guidedDeliveryEvidence: {},
      openGuidedDocumentBuilder,
    }));

    act(() => { b.button('Start teaching').click(); });
    expect(openGuidedDocumentBuilder).not.toHaveBeenCalled();
    expect(b.text()).toContain('Review before starting class');
    expect(b.text()).toContain('Student directions are saved');
    expect(b.text()).toContain('6 student-readiness checks still need attention');

    act(() => { b.button('Start teaching anyway').click(); });
    expect(openGuidedDocumentBuilder).toHaveBeenCalledTimes(1);
    b.cleanup();
  });

  it('requires confirmation before finishing with checks remaining', () => {
    const finalSteps = [{ id: '_final', phase: 'finish', label: 'Review & Finish', action: 'Review the lesson.', success: 'All set.' }];
    const handleCompleteGuidedMode = vi.fn();
    const b = mountBanner(baseProps({
      GUIDED_STEPS: finalSteps, allGuidedSteps: finalSteps, guidedStep: 0,
      guidedDeliveryEvidence: {},
      openGuidedDocumentBuilder: vi.fn(),
      handleCompleteGuidedMode,
    }));

    act(() => { b.button('Finish with checks remaining').click(); });
    expect(handleCompleteGuidedMode).not.toHaveBeenCalled();
    expect(b.text()).toContain('Finish Guided Mode with open checks?');
    act(() => { b.button('Finish anyway').click(); });
    expect(handleCompleteGuidedMode).toHaveBeenCalledTimes(1);
    expect(handleCompleteGuidedMode.mock.calls[0][0]).toMatchObject({ readinessCount: 0, readinessTotal: 6 });
    b.cleanup();
  });
});

describe('Guided banner - truthful autosave and safe exit', () => {
  it('shows when the active Guided run was saved on this device', () => {
    const b = mountBanner(baseProps({
      guidedProgressSaveState: { status: 'saved', at: '2026-08-01T20:15:00.000Z' },
    }));
    expect(b.text()).toContain('Saved on this device at');
    expect(b.host.querySelector('.allo-guided-progress-save')?.getAttribute('data-state')).toBe('saved');
    b.cleanup();
  });

  it('does not silently exit when device storage failed', () => {
    const handleExitGuidedMode = vi.fn();
    const retryGuidedProgressSave = vi.fn();
    const openGuidedProjectBackup = vi.fn();
    const b = mountBanner(baseProps({
      guidedProgressSaveState: { status: 'error', at: null },
      handleExitGuidedMode, retryGuidedProgressSave, openGuidedProjectBackup,
    }));
    expect(b.text()).toContain('Progress is not saved');
    act(() => { b.button('Resume later').click(); });
    expect(handleExitGuidedMode).not.toHaveBeenCalled();
    expect(b.text()).toContain('Progress could not be saved');
    expect(b.button('Retry save')).toBeTruthy();
    expect(b.button('Save project backup')).toBeTruthy();
    act(() => { b.button('Save project backup').click(); });
    expect(openGuidedProjectBackup).toHaveBeenCalledTimes(1);
    act(() => { b.button('Retry save').click(); });
    expect(retryGuidedProgressSave).toHaveBeenCalledTimes(1);
    act(() => { b.button('Keep Guided Mode open').click(); });
    expect(handleExitGuidedMode).not.toHaveBeenCalled();
    expect(b.text()).not.toContain('Exit without saving');

    act(() => { b.button('Resume later').click(); });
    act(() => { b.button('Exit without saving').click(); });
    expect(handleExitGuidedMode).toHaveBeenCalledTimes(1);
    b.cleanup();
  });
});

describe('Guided banner - continuous journey handoff and resource shelf', () => {
  it('explains automatic advancement and lets the teacher review or go back', () => {
    const result = { id: 'analysis-1', type: 'analysis', title: 'Barrier analysis', summary: 'Key language and concept barriers.' };
    const openGuidedHistoryItem = vi.fn();
    const undoGuidedAutoAdvance = vi.fn();
    const b = mountBanner(baseProps({
      guidedStep: 2,
      history: [result], guidedCreatedHistoryIds: ['analysis-1'],
      guidedAdvanceNotice: { fromStep: 1, fromId: 'analysis', toId: 'faq', historyId: 'analysis-1', at: Date.now() },
      openGuidedHistoryItem, undoGuidedAutoAdvance, clearGuidedAdvanceNotice: vi.fn(),
    }));
    expect(b.text()).toContain('Analyze Source Material is ready');
    expect(b.text()).toContain('Now guiding you through FAQ');
    act(() => { b.button('Review result').click(); });
    act(() => { b.button('Go back').click(); });
    expect(openGuidedHistoryItem).toHaveBeenCalledWith(result);
    expect(undoGuidedAutoAdvance).toHaveBeenCalledTimes(1);
    b.cleanup();
  });

  it('keeps created resources reachable throughout the run and previews why/output/next', () => {
    const analysis = { id: 'analysis-1', type: 'analysis', title: 'Barrier analysis' };
    const faq = { id: 'faq-1', type: 'faq', title: 'Student FAQ' };
    const openGuidedHistoryItem = vi.fn();
    const b = mountBanner(baseProps({
      guidedStep: 1,
      history: [analysis, faq], guidedCreatedHistoryIds: ['analysis-1', 'faq-1'],
      openGuidedHistoryItem,
    }));
    expect(b.text()).toContain('Lesson resources');
    expect(b.text()).toContain('Barrier analysis');
    expect(b.text()).toContain('Student FAQ');
    expect(b.text()).toContain('Why now');
    expect(b.text()).toContain('You’ll create');
    expect(b.text()).toContain('Next');
    const resourceButton = Array.from(b.host.querySelectorAll('.allo-guided-resource-shelf button')).find(button => button.textContent.includes('Student FAQ'));
    act(() => { resourceButton.click(); });
    expect(openGuidedHistoryItem).toHaveBeenCalledWith(faq);
    b.cleanup();
  });
});

describe('Guided reading first use', () => {
  it.each(['A', 'My lesson', '12345678901234567890'])('preserves even a short source draft: %s', draft => {
    const setInputText = vi.fn();
    const b = mountBanner(baseProps({ guidedStep: 0, inputText: draft, setInputText }));
    expect(b.button('example passage')).toBeFalsy();
    expect(setInputText).not.toHaveBeenCalled();
    b.cleanup();
  });

  it('allows a whitespace-only source to load the sample and blocks loading while busy', () => {
    const setInputText = vi.fn();
    const b = mountBanner(baseProps({ guidedStep: 0, inputText: '  ', setInputText, isGuidedRetrying: true }));
    expect(b.button('example passage').disabled).toBe(true);
    act(() => b.button('example passage').click());
    expect(setInputText).not.toHaveBeenCalled();
    b.render(baseProps({ guidedStep: 0, inputText: '  ', setInputText }));
    act(() => b.button('example passage').click());
    expect(setInputText).toHaveBeenCalledTimes(1);
    expect(setInputText.mock.calls[0][0]).toMatch(/^Photosynthesis/);
    b.cleanup();
  });

  it('shows the real reading-path length before selection and applies that preset', () => {
    loadAlloModule('guided_mode_config_module.js');
    const config = window.AlloModules.GuidedModeConfig;
    const preset = config.GUIDED_PRESETS.find(item => item.id === 'reading-access');
    const applyGuidedPreset = vi.fn();
    const b = mountBanner(baseProps({ guidedStep: 0, GUIDED_STEPS: config.GUIDED_STEPS,
      allGuidedSteps: config.GUIDED_STEPS, guidedPresets: [preset], applyGuidedPreset }));
    const button = b.button('Adapt a reading');
    expect(button.textContent).toContain('7 steps, including review and delivery');
    act(() => button.click());
    expect(applyGuidedPreset).toHaveBeenCalledWith(preset);
    b.cleanup();
  });
});

describe('Guided reading review and result ownership', () => {
  const readingSteps = [STEPS[0], { id: 'simplified', label: 'Text Adaptation', action: 'Adapt the text.', success: 'Adapted text ready.' }, STEPS[2]];
  const props = overrides => baseProps({ GUIDED_STEPS: readingSteps, allGuidedSteps: readingSteps, guidedStep: 1, ...overrides });

  it.each([
    ['string payload', 'Plants use light to make sugar.'],
    ['simplifiedText payload', { simplifiedText: 'Plants use light to make sugar.', originalText: 'Unadapted source text.' }],
    ['text payload', { text: 'Plants use light to make sugar.' }],
  ])('previews the actual adaptation from a %s and opens the same saved item', (_label, data) => {
    const result = { id: 'reading-current', type: 'simplified', title: 'Adapted passage', data };
    const openGuidedHistoryItem = vi.fn();
    const b = mountBanner(props({ history: [result], guidedCompletedIds: ['simplified'], guidedCreatedHistoryIds: [result.id], openGuidedHistoryItem }));
    const preview = b.host.querySelector('[aria-labelledby="guided-result-preview-title"]');
    expect(preview.textContent).toContain('Plants use light to make sugar.');
    expect(preview.textContent).not.toContain('Unadapted source text.');
    expect(preview.textContent).toContain('check facts, key vocabulary, and the learning goal');
    act(() => b.button('Open result').click());
    expect(openGuidedHistoryItem).toHaveBeenCalledWith(result);
    b.cleanup();
  });

  it('never presents an unrelated lesson as the result of a resumed step with missing IDs', () => {
    const old = { id: 'another-lesson', type: 'simplified', data: 'Unrelated lesson text.' };
    const b = mountBanner(props({ history: [old], guidedCompletedIds: ['simplified'], guidedCreatedHistoryIds: [] }));
    expect(b.host.querySelector('[aria-labelledby="guided-result-preview-title"]')).toBeNull();
    expect(b.text()).not.toContain('Unrelated lesson text.');
    b.cleanup();
  });

  it('previews a newly arrived result before the host registers its Guided ID', () => {
    const old = { id: 'old-reading', type: 'simplified', data: 'Previous lesson text.' };
    const analysis = { id: 'this-analysis', type: 'analysis' };
    const result = { id: 'new-reading', type: 'simplified', data: 'This lesson adaptation.' };
    const shared = { guidedCreatedHistoryIds: [analysis.id] };
    const b = mountBanner(props({ ...shared, history: [old, analysis] }));
    b.render(props({ ...shared, history: [old, analysis, result] }));
    const preview = b.host.querySelector('[aria-labelledby="guided-result-preview-title"]');
    expect(preview.textContent).toContain('This lesson adaptation.');
    expect(preview.textContent).not.toContain('Previous lesson text.');
    b.cleanup();
  });

  it('renders reading text as text and locks result opening while generation is busy', () => {
    const result = { id: 'safe-reading', type: 'simplified', data: '<img src=x onerror="alert(1)"> is literal example text.' };
    const openGuidedHistoryItem = vi.fn();
    const b = mountBanner(props({ history: [result], guidedCreatedHistoryIds: [result.id], guidedCompletedIds: ['simplified'], isGuidedRetrying: true, openGuidedHistoryItem }));
    const preview = b.host.querySelector('[aria-labelledby="guided-result-preview-title"]');
    expect(preview.querySelector('img')).toBeNull();
    expect(preview.textContent).toContain('<img src=x');
    expect(b.button('Open result').disabled).toBe(true);
    act(() => b.button('Open result').click());
    expect(openGuidedHistoryItem).not.toHaveBeenCalled();
    b.cleanup();
  });
});

describe('Guided step recovery guidance', () => {
  it.each([
    ['Could not generate the adaptation.', 'Review the source and settings, then retry.'],
    [{ status: 401, message: 'Request failed' }, 'Check your AI connection and access settings'],
    [{ code: 'PERMISSION_DENIED', message: 'Request failed' }, 'Check your AI connection and access settings'],
    ['Missing API key', 'Check your AI connection and access settings'],
    [{ status: 429, message: 'Request failed' }, 'The service is busy. Wait a moment'],
    [{ status: 429, message: 'Insufficient quota' }, 'Check your AI provider usage allowance'],
    ['Network connection lost', 'Check your connection, then try again.'],
    ['Request timed out', 'Check your connection, then try again.'],
  ])('offers the appropriate recovery for %j', (error, guidance) => {
    const b = mountBanner(baseProps({ guidedStepError: error }));
    expect(b.text()).toContain(guidance);
    if (typeof error === 'string' && error.startsWith('Could not generate')) expect(b.text()).not.toContain('The service is busy');
    b.cleanup();
  });

  it('opens settings or retries only when chosen, retaining the current result', () => {
    const openUniversalSettings = vi.fn();
    const retryGuidedStep = vi.fn();
    const saved = { id: 'saved-analysis', type: 'analysis', data: 'Existing result.' };
    const shared = { guidedStepError: 'Missing API key', openUniversalSettings, retryGuidedStep,
      history: [saved], guidedCreatedHistoryIds: [saved.id], guidedCompletedIds: ['analysis'] };
    const b = mountBanner(baseProps(shared));
    expect(retryGuidedStep).not.toHaveBeenCalled();
    act(() => b.button('Review settings').click());
    expect(openUniversalSettings).toHaveBeenCalledTimes(1);
    const retry = Array.from(b.host.querySelectorAll('button')).find(button => button.textContent === 'Retry');
    act(() => retry.click());
    expect(retryGuidedStep).toHaveBeenCalledTimes(1);
    expect(b.text()).toContain('Existing result.');
    expect(b.text()).toContain('Saved result available');
    expect(b.text()).toContain('This attempt did not finish');
    expect(b.text()).not.toContain('Latest result ready');
    b.render(baseProps({ ...shared, isGuidedRetrying: true }));
    expect(b.button('Review settings').disabled).toBe(true);
    b.cleanup();
  });

  it('does not offer an inert Retry button when the host has no retry handler', () => {
    const b = mountBanner(baseProps({ guidedStepError: 'Request failed' }));
    expect(Array.from(b.host.querySelectorAll('button')).some(button => button.textContent === 'Retry')).toBe(false);
    b.cleanup();
  });
});

describe('Readiness confirmations belong to the reviewed lesson', () => {
  const key = 'allo_guided_readiness_checks';
  const finalSteps = [{ id: '_final', phase: 'finish', label: 'Review & Finish', action: 'Review the lesson.', success: 'All set.' }];
  const reading = { id: 'lesson-reading', type: 'simplified', data: 'Plants use light to make sugars.', config: { gradeLevel: '5' } };
  const props = overrides => baseProps({ GUIDED_STEPS: finalSteps, allGuidedSteps: finalSteps, guidedStep: 0,
    inputText: 'The original lesson passage about plant energy.', history: [reading], guidedCreatedHistoryIds: [reading.id],
    guidedDeliveryEvidence: {}, ...overrides });
  const check = (b, label = 'Accessibility and reading order') => Array.from(b.host.querySelectorAll('label')).find(item => item.textContent.includes(label))?.querySelector('input[type="checkbox"]');
  const confirm = b => act(() => check(b).click());

  it('does not inherit unscoped confirmations from an older version', () => {
    localStorage.setItem(key, JSON.stringify({ accessibility: true, backup: true, directions: true }));
    const b = mountBanner(props());
    expect(check(b).checked).toBe(false);
    expect(b.text()).toContain('0/6');
    b.cleanup();
  });

  it('restores checks for the same source and resource contents without storing duplicate lesson text', () => {
    const b = mountBanner(props()); confirm(b);
    const saved = localStorage.getItem(key);
    expect(JSON.parse(saved)).toMatchObject({ version: 2, checks: { accessibility: true } });
    expect(saved).not.toContain(reading.data);
    expect(saved).not.toContain('The original lesson passage');
    b.cleanup();
    const c = mountBanner(props({ history: [JSON.parse(JSON.stringify(reading))] }));
    expect(check(c).checked).toBe(true);
    c.cleanup();
  });

  it.each([
    ['source changed', { inputText: 'A different lesson source about rainfall.' }],
    ['resource edited', { history: [{ ...reading, data: 'A teacher-edited adaptation with a new example.' }] }],
    ['resource replaced', { history: [{ ...reading, id: 'new-reading' }], guidedCreatedHistoryIds: ['new-reading'] }],
    ['reading settings changed', { history: [{ ...reading, config: { gradeLevel: '3' } }] }],
    ['learning goal changed', { guidedPlanBrief: { goal: 'Explain how plants store energy.' } }],
  ])('reopens manual checks when %s', (_label, change) => {
    const b = mountBanner(props()); confirm(b);
    b.render(props(change));
    expect(check(b).checked).toBe(false);
    expect(b.text()).toContain('The lesson changed. Please confirm the manual checks again.');
    expect(JSON.parse(localStorage.getItem(key)).checks).toEqual({});
    b.cleanup();
  });

  it('does not restore old checks merely because an edit is undone', () => {
    const b = mountBanner(props()); confirm(b);
    b.render(props({ inputText: 'A changed source passage.' }));
    b.render(props());
    expect(check(b).checked).toBe(false);
    b.cleanup();
  });

  it('keeps checks when unrelated History changes or resources are reordered', () => {
    const b = mountBanner(props()); confirm(b);
    b.render(props({ history: [{ id: 'unrelated', type: 'simplified', data: 'Another lesson.' }, reading] }));
    expect(check(b).checked).toBe(true);
    b.render(props({ history: [reading, { id: 'unrelated', type: 'simplified', data: 'An edited other lesson.' }] }));
    expect(check(b).checked).toBe(true);
    b.cleanup();
  });

  it('waits for saved resources to hydrate before replacing stored checks', () => {
    const b = mountBanner(props()); confirm(b); b.cleanup();
    const saved = localStorage.getItem(key);
    const c = mountBanner(props({ history: [] }));
    expect(check(c).checked).toBe(false);
    expect(check(c).disabled).toBe(true);
    expect(c.text()).toContain('Waiting for the lesson resources');
    expect(localStorage.getItem(key)).toBe(saved);
    c.render(props());
    expect(check(c).checked).toBe(true);
    expect(check(c).disabled).toBe(false);
    c.cleanup();
  });

  it('accepts only known check IDs with literal true values', () => {
    const b = mountBanner(props()); confirm(b); b.cleanup();
    const saved = JSON.parse(localStorage.getItem(key));
    saved.checks = { accessibility: 'true', backup: true, directions: 1, unknown: true };
    localStorage.setItem(key, JSON.stringify(saved));
    const c = mountBanner(props());
    expect(check(c).checked).toBe(false);
    expect(check(c, 'backup access route').checked).toBe(true);
    expect(JSON.parse(localStorage.getItem(key)).checks).toEqual({ backup: true });
    c.cleanup();
  });

  it('reports failed persistence while retaining checks for the current session', () => {
    const original = Storage.prototype.setItem;
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(name, value) {
      if (name === key) throw new Error('Storage quota exceeded');
      return original.call(this, name, value);
    });
    const b = mountBanner(props());
    try {
      confirm(b);
      expect(check(b).checked).toBe(true);
      expect(b.text()).toContain('These checks could not be saved on this device');
    } finally { b.cleanup(); storage.mockRestore(); }
  });

  it('keeps recorded evidence checked and locks manual controls while busy', () => {
    const b = mountBanner(props({ guidedDeliveryEvidence: { directionsSaved: true } }));
    expect(check(b, 'Student directions are saved').checked).toBe(true);
    expect(check(b, 'Student directions are saved').disabled).toBe(true);
    b.render(props({ isGuidedRetrying: true }));
    expect(check(b).disabled).toBe(true);
    b.cleanup();
  });
});

describe('Guided navigation labels', () => {
  it('shows a visible Customize label and opens the step picker', () => {
    const b = mountBanner(baseProps({ toggleGuidedStepId: () => {} }));
    const customize = b.button('Customize');
    expect(customize).toBeTruthy();
    act(() => customize.click());
    expect(customize.getAttribute('aria-expanded')).toBe('true');
    expect(b.host.querySelector('#guided-step-picker')).toBeTruthy();
    b.cleanup();
  });
  it('names the destination on Next step after a completed result', () => {
    const b = mountBanner(baseProps({ guidedCompletedIds: ['analysis'] }));
    expect(b.button('Next step').textContent).toContain('FAQ Generator');
    b.cleanup();
  });
});

describe('Guided resume clarity and busy state', () => {
  it('names the saved step when returning to a lesson', () => {
    const b=mountBanner(baseProps({guidedCompletedIds:['source-input']}));
    expect(b.host.querySelector('.allo-guided-resume-card').textContent).toContain('Your saved step: Analyze Source Material');
    b.cleanup();
  });
  it('disables resume, review, and planning actions while a resource is running', () => {
    const focus=vi.fn(),review=vi.fn();
    const b=mountBanner(baseProps({guidedCompletedIds:['source-input'],guidedCreatedHistoryIds:['result'],history:[{id:'result',type:'analysis',data:'Saved analysis'}],isGuidedRetrying:true,focusGuidedTarget:focus,openGuidedHistoryItem:review,generateGuidedPlanFromGoal:vi.fn()}));
    const actions=Array.from(b.host.querySelectorAll('.allo-guided-resume-card button'));
    expect(actions).toHaveLength(3);expect(actions.every(button=>button.disabled)).toBe(true);
    act(()=>actions.forEach(button=>button.click()));expect(focus).not.toHaveBeenCalled();expect(review).not.toHaveBeenCalled();b.cleanup();
  });
});
