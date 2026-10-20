// Guided Mode exit / resume discoverability (2026-10-20).
//
// Before: the only way out of a normal step was "Resume later", the last of up to six
// equal 12px buttons at the bottom of the banner, hidden entirely while the banner was
// collapsed; after leaving, nothing on screen offered a way back except the header's
// "Start & setup" dialog (icon-only on narrow screens), and the exit toast pointed at
// "Setup". Now: "Save & exit" sits in the banner's top row next to "Step N of M" (so it
// survives collapsing), and the header shows a "Resume guided" chip while saved progress
// exists and Guided Mode is off.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { loadAlloModule } from './setup.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, renderToStaticMarkup, GuidedModeBanner;

const STEPS = [
  { id: 'source-input', label: 'Source Material', action: 'Paste text.', success: 'Source captured.' },
  { id: 'analysis', label: 'Analyze Source Material', action: 'Run Analyze.', success: 'Analysis done.' },
  { id: 'faq', label: 'FAQ Generator', action: 'Generate an FAQ.', success: 'FAQ ready.' },
];

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  ({ renderToStaticMarkup } = require(resolve(MODULES_DIR, 'react-dom/server')));
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
    GUIDED_TOUR_MAP: {}, guidedStep: 1, guidedRect: null, guidedEngaged: false, wizardOpen: false,
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
    buttons(substr) { return Array.from(host.querySelectorAll('button')).filter(b => (b.textContent || '').includes(substr)); },
    cleanup() { try { act(() => root.unmount()); } catch (_) {} host.remove(); },
  };
}

describe('Guided banner: Save & exit is findable', () => {
  it('offers exactly one Save & exit, in the top row beside the step counter, and no old Resume later', () => {
    const handleExitGuidedMode = vi.fn();
    const b = mountBanner(baseProps({ handleExitGuidedMode }));
    const exits = b.buttons('Save & exit');
    expect(exits).toHaveLength(1);
    expect(b.buttons('Resume later')).toHaveLength(0);
    const topRow = exits[0].parentElement;
    expect(topRow.textContent).toContain('Step 2 of 3');
    expect(topRow.querySelector('[aria-controls="guided-banner-details"]')).toBeTruthy();
    expect(exits[0].getAttribute('type')).toBe('button');
    act(() => { exits[0].click(); });
    expect(handleExitGuidedMode).toHaveBeenCalledTimes(1);
    b.cleanup();
  });

  it('stays available while the banner is collapsed', () => {
    localStorage.setItem('allo_guided_ui_state', JSON.stringify({ collapsed: true }));
    const handleExitGuidedMode = vi.fn();
    const b = mountBanner(baseProps({ handleExitGuidedMode }));
    expect(b.host.querySelector('#guided-banner-details')).toBeNull();
    const [exit] = b.buttons('Save & exit');
    expect(exit).toBeTruthy();
    act(() => { exit.click(); });
    expect(handleExitGuidedMode).toHaveBeenCalledTimes(1);
    b.cleanup();
  });

  it('expands a collapsed banner to show the "not saved" warning instead of exiting silently', () => {
    localStorage.setItem('allo_guided_ui_state', JSON.stringify({ collapsed: true }));
    const handleExitGuidedMode = vi.fn();
    const b = mountBanner(baseProps({ handleExitGuidedMode, guidedProgressSaveState: { status: 'error' } }));
    act(() => { b.buttons('Save & exit')[0].click(); });
    expect(handleExitGuidedMode).not.toHaveBeenCalled();
    expect(b.host.querySelector('#guided-banner-details')).toBeTruthy();
    expect(b.host.querySelector('[role="alert"].allo-guided-save-warning')).toBeTruthy();
    b.cleanup();
  });

  it('is locked while a resource is generating, like the other step controls', () => {
    const b = mountBanner(baseProps({ isGuidedRetrying: true }));
    expect(b.buttons('Save & exit')[0].disabled).toBe(true);
    b.cleanup();
  });
});

describe('Header: Resume guided chip after leaving', () => {
  const source = readFileSync('view_header_source.jsx', 'utf8').replace(/\r\n/g, '\n');
  const chipSrc = sliceBetween(source, '  const guidedResumeChip =', '  const openJoinFromCompactHeader =', { label: 'header resume chip' });
  let makeChip;
  beforeAll(() => {
    const compiled = transformSync(`function makeChip(ctx) {
      const { canUseTeacherGuidedMode, guidedMode, _guidedHasProgress, startGuidedModeFromHeader, guidedStep, t } = ctx;
      const MapIcon = () => null;
      ${chipSrc}
      return guidedResumeChip;
    }`, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
    makeChip = new Function('React', compiled + '\nreturn makeChip;')(React);
  });
  const ctx = (extra) => ({ canUseTeacherGuidedMode: true, guidedMode: false, _guidedHasProgress: true, startGuidedModeFromHeader: vi.fn(), guidedStep: 3, t: () => '', ...extra });

  it('shows "Resume guided" with the saved step, wired to the resume handler', () => {
    const c = ctx();
    const chip = makeChip(c);
    expect(chip).toBeTruthy();
    expect(chip.props.onClick).toBe(c.startGuidedModeFromHeader);
    const html = renderToStaticMarkup(chip);
    expect(html).toContain('Resume guided');
    expect(html).toContain('Step 4');
    expect(html).toContain('type="button"');
  });

  it.each([
    ['Guided Mode is already on', { guidedMode: true }],
    ['there is no saved progress', { _guidedHasProgress: false }],
    ['the role cannot use Guided Mode', { canUseTeacherGuidedMode: false }],
  ])('is hidden when %s', (_, extra) => {
    expect(makeChip(ctx(extra))).toBeNull();
  });

  it('renders in both the compact and the expanded header layouts', () => {
    const uses = source.split('{guidedResumeChip}').length - 1;
    expect(uses).toBe(2);
    const compact = sliceBetween(source, '{headerCollapsed && (', '{!headerCollapsed && (', { label: 'compact header' });
    expect(compact.includes('{guidedResumeChip}'), 'chip in the compact header').toBe(true);
  });
});

describe('Guided exit strings', () => {
  const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
  it('declares the new labels and no longer points people at a "Setup" menu that is labelled differently', () => {
    expect(strings.guided.save_and_exit).toBe('Save & exit');
    expect(strings.guided.save_and_exit_hint).toContain('Resume guided');
    expect(strings.guided.progress_saved).toContain('Resume guided');
    expect(strings.guided.progress_saved).not.toContain('from Setup');
    expect(strings.toolbar.guided_resume_short).toBe('Resume guided');
    expect(strings.toolbar.guided_resume_step).toBe('Step {n}');
    expect(strings.launch_pad.switch_hint).toContain('Start & setup');
  });
});
