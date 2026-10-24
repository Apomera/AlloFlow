// Guided Mode "quickest route" to the Full Pack (2026-10-20).
//
// Before: the Full Pack panel appeared in Guided Mode only on the delivery steps, and a
// resource counted for a step only if it was made while that step was open, so a pack made
// early would not tick the later Glossary or Quiz steps (teachers were asked to make them
// again). Now: once the source is in, the banner offers the quickest route (an inline confirm
// names how many steps it passes over, then jumps to the delivery step where the pack lives),
// later steps carry a small "Skip to full pack" link, and anything made earlier in the same
// run counts for its own step.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, GuidedModeBanner;

const STEPS = [
  { id: 'source-input', label: 'Source Material', action: 'Paste text.', success: 'Source captured.' },
  { id: 'analysis', label: 'Analyze Source Material', action: 'Run Analyze.', success: 'Analysis done.' },
  { id: 'glossary', label: 'Glossary', action: 'Make a glossary.', success: 'Glossary ready.' },
  { id: 'quiz', label: 'Quiz', action: 'Make a quiz.', success: 'Quiz ready.' },
  { id: 'package-deliver', label: 'Preview, Package & Deliver', action: 'Share it.', success: 'Shared.' },
];
const SOURCE = 'Plants use sunlight, water and carbon dioxide to make sugar and oxygen.';

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = (cb) => { cb(); return 0; };
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  const AudioStub = function () { return { play: () => Promise.resolve(), pause() {} }; };
  global.Audio = window.Audio = AudioStub;
  loadAlloModule('view_guided_mode_banner_module.js');
  GuidedModeBanner = window.AlloModules?.GuidedModeBanner?.GuidedModeBanner;
  if (!GuidedModeBanner) throw new Error('GuidedModeBanner not registered on window.AlloModules');
});
beforeEach(() => { localStorage.clear(); });

function baseProps(overrides) {
  return {
    GUIDED_STEPS: STEPS, allGuidedSteps: STEPS, guidedSelectedIds: null, toggleGuidedStepId: null,
    GUIDED_TOUR_MAP: {}, guidedStep: 0, guidedRect: null, guidedEngaged: false, wizardOpen: false,
    handleExitGuidedMode: () => {}, handleGuidedSkip: () => {}, setGuidedStep: () => {}, setShowGuidedTip: () => {},
    showGuidedTip: false, t: () => '', tourSteps: [], history: [], getDefaultTitle: (type) => type,
    inputText: '', setInputText: () => {}, guidedCompletedIds: [], guidedSkippedIds: [],
    guidedCreatedHistoryIds: [], wordSoundsHistory: [], markGuidedStepDone: () => {},
    ...overrides,
  };
}
function mountBanner(props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(GuidedModeBanner, props)); });
  return {
    host,
    route() { return host.querySelector('.allo-guided-quick-route'); },
    button(text) { return Array.from(host.querySelectorAll('button')).find(b => (b.textContent || '').trim() === text); },
    cleanup() { try { act(() => root.unmount()); } catch (_) {} host.remove(); },
  };
}

describe('quickest route from the source step', () => {
  it('waits until the source text is in', () => {
    const b = mountBanner(baseProps({ inputText: '' }));
    expect(b.route()).toBeNull();
    b.cleanup();
  });

  it('offers the full pack, names the skipped steps, and jumps to delivery on Continue', () => {
    const handleGuidedJump = vi.fn();
    const b = mountBanner(baseProps({ inputText: SOURCE, handleGuidedJump }));
    expect(b.route().textContent).toContain('Want the quickest route?');
    act(() => { b.button('Make the full pack now').click(); });
    expect(handleGuidedJump).not.toHaveBeenCalled();
    expect(b.route().textContent).toContain('This skips 3 steps for now');
    act(() => { b.button('Continue to the full pack').click(); });
    expect(handleGuidedJump).toHaveBeenCalledWith(4, ['analysis', 'glossary', 'quiz']);
    b.cleanup();
  });

  it('"Not now" closes the confirmation without moving', () => {
    const handleGuidedJump = vi.fn();
    const b = mountBanner(baseProps({ inputText: SOURCE, handleGuidedJump }));
    act(() => { b.button('Make the full pack now').click(); });
    act(() => { b.button('Not now').click(); });
    expect(handleGuidedJump).not.toHaveBeenCalled();
    expect(b.button('Make the full pack now')).toBeTruthy();
    b.cleanup();
  });

  it('is locked while something is generating', () => {
    const b = mountBanner(baseProps({ inputText: SOURCE, isGuidedRetrying: true }));
    expect(b.button('Make the full pack now').disabled).toBe(true);
    b.cleanup();
  });
});

describe('quickest route on later steps', () => {
  it('shows a small "Skip to full pack" link before the delivery step', () => {
    const handleGuidedJump = vi.fn();
    const b = mountBanner(baseProps({ inputText: SOURCE, guidedStep: 2, guidedCompletedIds: ['analysis'], handleGuidedJump }));
    expect(b.route().textContent).toContain('In a hurry?');
    act(() => { b.button('Skip to full pack').click(); });
    act(() => { b.button('Continue to the full pack').click(); });
    expect(handleGuidedJump).toHaveBeenCalledWith(4, ['glossary', 'quiz']);
    b.cleanup();
  });

  it('never lists the step the teacher just finished as skipped, even before the host records it', () => {
    const handleGuidedJump = vi.fn();
    const history = [{ id: 'g1', type: 'glossary', title: 'Glossary' }];
    const b = mountBanner(baseProps({ inputText: SOURCE, guidedStep: 2, guidedCompletedIds: ['analysis'], history, guidedCreatedHistoryIds: ['g1'], handleGuidedJump }));
    act(() => { b.button('Skip to full pack').click(); });
    act(() => { b.button('Continue to the full pack').click(); });
    expect(handleGuidedJump).toHaveBeenCalledWith(4, ['quiz']);
    b.cleanup();
  });

  it('is not offered on the delivery step itself', () => {
    const b = mountBanner(baseProps({ inputText: SOURCE, guidedStep: 4 }));
    expect(b.route()).toBeNull();
    b.cleanup();
  });
});

describe('resources made earlier in the run count for their steps', () => {
  it('marks every step whose resource the run already made, including steps not reached yet', () => {
    const markGuidedStepDone = vi.fn();
    const history = [{ id: 'g1', type: 'glossary', title: 'Glossary' }, { id: 'q1', type: 'quiz', title: 'Quiz' }];
    const b = mountBanner(baseProps({ inputText: SOURCE, guidedStep: 1, history, guidedCreatedHistoryIds: ['g1', 'q1'], markGuidedStepDone }));
    const marked = markGuidedStepDone.mock.calls.map(call => call[0]);
    expect(marked).toEqual(expect.arrayContaining(['glossary', 'quiz']));
    expect(marked).not.toContain('analysis');
    b.cleanup();
  });

  it('shows the current step as done when the run already made its resource', () => {
    const history = [{ id: 'g1', type: 'glossary', title: 'Glossary' }];
    const b = mountBanner(baseProps({ inputText: SOURCE, guidedStep: 2, history, guidedCreatedHistoryIds: ['g1'] }));
    expect(b.host.textContent).toContain('Next step');
    b.cleanup();
  });

  it('does not count a resource that existed before this Guided run', () => {
    const markGuidedStepDone = vi.fn();
    const history = [{ id: 'old', type: 'glossary', title: 'Older glossary' }];
    const b = mountBanner(baseProps({ inputText: SOURCE, guidedStep: 2, history, guidedCreatedHistoryIds: [], markGuidedStepDone }));
    expect(markGuidedStepDone).not.toHaveBeenCalledWith('glossary');
    expect(b.host.textContent).not.toContain('Next step');
    b.cleanup();
  });
});
