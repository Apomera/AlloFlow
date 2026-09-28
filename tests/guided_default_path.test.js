// Guided Mode path choice (2026-09-28). A fresh run, from any entry (Teacher
// door, header, Start over), asks the teacher to choose a path at step 1 rather
// than silently running all 26 steps or picking a path for them. The chosen path
// stays visible with a real "Change path" button.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const anti = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const header = fs.readFileSync('view_header_source.jsx', 'utf8');

let React, ReactDOMClient, act, Banner, config;
beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  loadAlloModule('guided_mode_config_module.js');
  loadAlloModule('view_guided_mode_banner_module.js');
  config = window.AlloModules.GuidedModeConfig;
  Banner = window.AlloModules.GuidedModeBanner.GuidedModeBanner;
});
beforeEach(() => localStorage.clear());

function mount(overrides) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const props = {
    GUIDED_STEPS: config.GUIDED_STEPS, allGuidedSteps: config.GUIDED_STEPS, GUIDED_TOUR_MAP: config.GUIDED_TOUR_MAP,
    guidedPresets: config.GUIDED_PRESETS, guidedSelectedIds: null, guidedPlanBrief: null, guidedStep: 0,
    applyGuidedPreset: vi.fn(), toggleGuidedStepId: vi.fn(), handleExitGuidedMode: () => {}, handleGuidedSkip: () => {},
    setGuidedStep: () => {}, setShowGuidedTip: () => {}, showGuidedTip: false, t: () => '', tourSteps: [], history: [],
    getDefaultTitle: (type) => type, inputText: '', setInputText: () => {}, guidedCompletedIds: [], guidedSkippedIds: [],
    guidedCreatedHistoryIds: [], wordSoundsHistory: [], markGuidedStepDone: () => {}, guidedRect: null, guidedEngaged: false,
    ...overrides,
  };
  act(() => root.render(React.createElement(Banner, props)));
  return {
    host, props,
    q: (sel) => host.querySelector(sel),
    button: (text) => Array.from(host.querySelectorAll('button')).find(b => (b.textContent || '').includes(text)),
    done: () => { act(() => root.unmount()); host.remove(); },
  };
}

describe('Guided step 1 asks for a path', () => {
  it('a fresh run shows the path choice as step 1, with no step instructions yet', () => {
    const b = mount();
    const choice = b.q('[data-help-key="guided_path_choice"]');
    expect(choice).not.toBeNull();
    expect(choice.textContent).toContain('Step 1: Choose a path');
    expect(b.host.textContent).toContain('Choose a path');
    expect(b.host.textContent).not.toMatch(/Step 1 of \d+/);
    expect(b.host.textContent).not.toContain('Paste or type');
    expect(b.button('Decide later')).toBeUndefined();
    expect(b.button('Adapt a reading').textContent).toContain('Recommended for a first lesson');
    expect(b.button('Complete lesson pack').textContent).toContain(`${config.GUIDED_STEPS.length} steps`);
    b.done();
  });

  it('applies only the path the teacher picks', () => {
    const b = mount();
    expect(b.props.applyGuidedPreset).not.toHaveBeenCalled();
    act(() => b.button('Build an assessment').click());
    expect(b.props.applyGuidedPreset).toHaveBeenCalledWith(config.GUIDED_PRESETS.find(p => p.id === 'assessment'));
    b.done();
  });

  it('shows the chosen path with a real Change path button that reopens the choice', () => {
    const reading = config.GUIDED_PRESETS.find(p => p.id === 'reading-access');
    const ids = ['source-input', ...reading.stepIds, 'directions', 'package-deliver', '_final'];
    const steps = config.GUIDED_STEPS.filter(s => ids.includes(s.id));
    localStorage.setItem('allo_guided_path_prompt_seen', 'true'); // set by picking a path in the chooser
    const b = mount({ GUIDED_STEPS: steps, guidedSelectedIds: ids, guidedPlanBrief: { id: 'reading-access', title: 'Adapt a reading' } });
    const summary = b.q('[data-help-key="guided_path_summary"]');
    expect(summary.textContent).toContain('Adapt a reading');
    expect(summary.textContent).toContain('7 steps');
    expect(b.q('[data-help-key="guided_path_choice"]')).toBeNull();
    expect(b.host.textContent).toContain('Step 1 of 7');
    const change = b.q('[data-help-key="guided_path_change"]');
    expect(change.tagName).toBe('BUTTON');
    expect(change.textContent).toContain('Change path');
    act(() => change.click());
    expect(b.q('[data-help-key="guided_path_choice"]')).not.toBeNull();
    expect(b.button('Keep current path')).toBeTruthy();
    b.done();
  });

  it('after progress, Change path opens the step picker (which confirms before restarting)', () => {
    const b = mount({ guidedStep: 1, guidedCompletedIds: ['source-input'], guidedSelectedIds: ['source-input', 'analysis', 'directions', 'package-deliver', '_final'], guidedPlanBrief: { id: 'x', title: 'My plan' } });
    act(() => b.q('[data-help-key="guided_path_change"]').click());
    expect(b.q('#guided-step-picker')).not.toBeNull();
    b.done();
  });
});

describe('every fresh start reaches the path choice', () => {
  it('the host never picks a path for the teacher', () => {
    expect(anti).not.toContain("'reading-access'");
  });

  it('Start over clears both the selection and the plan brief, so step 1 asks again', () => {
    const reset = anti.slice(anti.indexOf('const resetGuidedProgress = () => {'), anti.indexOf('const resetGuidedProgress = () => {') + 400);
    expect(reset).toContain('setGuidedSelectedIds(null)');
    expect(reset).toContain('setGuidedPlanBrief(null)');
    expect(header).toContain('const restartGuidedModeFromHeader = () => {\n    if (typeof resetGuidedProgress === \'function\') resetGuidedProgress();');
  });
});
