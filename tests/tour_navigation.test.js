// The app tour pointed at controls that were collapsed or unmounted (the
// header's three steps vanished whenever the header was compact; Memory Aid and
// Applied Challenge were highlighted closed), and it could only be walked in
// order. These pin the reveal paths and the grouped jump list. The end-to-end
// walk in Chromium is dev-tools/check_tour_reveal.cjs.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const lookup = key => key.split('.').reduce((value, part) => value?.[part], strings);
let React, createRoot, act, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloRoleContext = React.createContext({});
  window.AlloActiveViewContext = React.createContext({ activeView: 'simplified' });
  window.AlloThemeContext = React.createContext({ theme: 'light', colorOverlay: 'none' });
  loadAlloModule(process.env.ALLO_HEADER_CANDIDATE || 'view_header_module.js');
  loadAlloModule(process.env.ALLO_TOUR_OVERLAY_CANDIDATE || 'view_misc_panels_module.js');
});
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null;
  localStorage.clear();
});
function render(element) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  act(() => root.render(element));
}

describe('the tour reveals the header without changing the teacher preference', () => {
  // HeaderBar takes ~150 props; unnamed callbacks default to no-ops.
  const header = (extra) => {
    const base = { t: key => key, APP_CONFIG: {}, FONT_OPTIONS: [], EDGE_TTS_VOICES: [], GEMINI_VOICES: [], history: [], hintHistory: [], readingThemeFavorites: [], isStudentLinkMode: false, ...extra };
    const props = new Proxy(base, { get: (o, k) => k in o ? o[k] : typeof k !== 'string' ? undefined : /^[A-Z]/.test(k) ? () => null : /^(set|handle|on|toggle|open|close|start|join)/.test(k) ? () => {} : undefined });
    const Bar = () => window.AlloModules.HeaderBar.HeaderBar(props);
    return React.createElement(window.AlloRoleContext.Provider, { value: { isTeacherMode: true, setIsTeacherMode() {} } }, React.createElement(Bar));
  };

  it('shows the full header only while a header step is active', () => {
    localStorage.setItem('allo_header_collapsed', 'true');
    render(header({ tourRevealHeader: false }));
    expect(host.querySelector('#tour-header-utils')).toBeNull();
    expect(host.querySelector('[data-compact-view-toggle]')).not.toBeNull();
    render(header({ tourRevealHeader: true }));
    for (const id of ['tour-header-utils', 'tour-header-tools', 'tour-header-actions']) expect(host.querySelector('#' + id), id).not.toBeNull();
    render(header({ tourRevealHeader: false }));
    expect(host.querySelector('#tour-header-utils')).toBeNull();
    expect(localStorage.getItem('allo_header_collapsed'), 'the remembered choice is untouched').toBe('true');
  });

  it('passes the reveal flag from the host only for the main tour header steps', () => {
    expect(hostSource).toContain('<HeaderBar tourRevealHeader={tourRevealHeader} ');
    expect(hostSource).toContain("const tourRevealHeader = !!runTour && !customTourSteps && ['tour-header-utils', 'tour-header-tools', 'tour-header-actions'].includes(tourSteps[tourStep]?.id);");
  });

  // 2026-11-23: the tour is offered once, in the Help "?" menu that both headers open.
  // It used to be a row in Start & setup as well.
  const openHelpMenu = (extra) => {
    localStorage.setItem('allo_header_collapsed', 'true');
    const calls = { setRunTour: vi.fn(), setTourStep: vi.fn(), setSpotlightMessage: vi.fn() };
    render(header({ ...calls, ...extra }));
    act(() => host.querySelector('[data-compact-help-toggle]').click());
    return calls;
  };

  it('starts the app tour from the Help menu in the compact header', () => {
    const calls = openHelpMenu({ tourResumeStep: 0 });
    const start = host.querySelector('[data-help-menu] [data-help-menu-tour]');
    expect(start, 'tour entry in the Help menu').not.toBeNull();
    expect(start.textContent).toContain('Take the app tour');
    expect(host.querySelector('[data-help-menu-tour-resume]'), 'no resume offer without a paused tour').toBeNull();
    act(() => start.click());
    expect(calls.setTourStep).toHaveBeenCalledWith(0);
    expect(calls.setRunTour).toHaveBeenCalledWith(true);
    expect(calls.setSpotlightMessage).toHaveBeenCalledWith('');
    expect(host.querySelector('[data-help-menu]'), 'the menu closes').toBeNull();
  });

  it('resumes a tour that was closed part-way at the step it reached', () => {
    const calls = openHelpMenu({ tourResumeStep: 7 });
    const resumeBtn = host.querySelector('[data-help-menu] [data-help-menu-tour-resume]');
    expect(resumeBtn.textContent).toContain('Step 8');
    act(() => resumeBtn.click());
    expect(calls.setTourStep).toHaveBeenCalledWith(7);
    expect(calls.setRunTour).toHaveBeenCalledWith(true);
    expect(host.querySelector('[data-help-menu]'), 'the menu closes').toBeNull();
  });

  it('Start & setup keeps Back to Start, Quick Start and Guided Mode, and no longer repeats the tour', () => {
    localStorage.setItem('allo_header_collapsed', 'true');
    render(header({ tourResumeStep: 7 }));
    act(() => host.querySelector('[data-help-key="header_rerun_wizard"]').click());
    const dialog = document.querySelector('[role="dialog"][aria-labelledby="header-setup-options-title"]');
    expect(dialog, 'Start & setup dialog').not.toBeNull();
    for (const key of ['header_return_to_start', 'header_quickstart_setup', 'header_guided_mode_start']) expect(dialog.querySelector('[data-help-key="' + key + '"]'), key).not.toBeNull();
    expect(dialog.querySelector('[data-help-key="header_tour_start"]')).toBeNull();
    expect(dialog.querySelector('[data-setup-tour-start], [data-setup-tour-resume]')).toBeNull();
    expect(dialog.textContent).not.toContain('Take the app tour');
    expect(dialog.textContent).not.toContain('Resume the tour');
    // Close, Back to Start, Quick Start, Guided Mode. Restart Guided Mode joins them once there is progress.
    expect(dialog.querySelectorAll('button')).toHaveLength(4);
  });

  it('records the resume point for the main tour only and restarts the coach tour from step 1', () => {
    expect(hostSource).toContain('<HeaderBar tourRevealHeader={tourRevealHeader} tourResumeStep={tourResumeStep} ');
    expect(hostSource).toContain('useEffect(() => { if (!runTour) { if (!customTourSteps) setTourResumeStep(tourStep > 0 ? tourStep : 0); setCustomTourSteps(null); setTourSection(null); } }, [runTour]);');
    expect(hostSource).toContain('t, setRunTour: (value) => { if (value) setTourStep(0); setRunTour(value); }, embedded: true,');
  });
});

describe('the tour follows the reduce-animations setting', () => {
  // The tour's navigation block, run as written, with a target it can scroll to.
  function measureWith(reduce) {
    window.__alloReduceMotion = reduce;
    const block = sliceBetween(hostSource, '  const _findTourStepIndex =', '  const ensureToolVisible =', { file: 'AlloFlowANTI.txt', label: 'tour measurement' });
    const target = { scrollIntoView: vi.fn(), getBoundingClientRect: () => ({ top: 80, left: 20, right: 200, bottom: 180, width: 180, height: 100 }) };
    const api = new Function('ctx', `
      const {tourSteps,_resolveTourEl,setTourRect}=ctx;
      const runTour=true,spotlightMessage=null,customTourSteps=null,tourStep=0,alloBotRef={current:null},DOM_TO_TOOL_ID_MAP={};
      const _tourRunContextRef={current:{}},_tourTravelDirectionRef={current:1},setTourStep=()=>{},setRunTour=()=>{},setCustomTourSteps=()=>{},setBotSpotlightPos=()=>{};
      const useCallback=fn=>fn;
      ${block}
      return updateTourMetrics;`)({ tourSteps: [{ id: 'target' }], _resolveTourEl: () => target, setTourRect: vi.fn() });
    vi.useFakeTimers();
    try { api(); vi.runAllTimers(); } finally { vi.useRealTimers(); delete window.__alloReduceMotion; }
    return target.scrollIntoView.mock.calls[0][0].behavior;
  }

  it('jumps instead of gliding when animations are reduced, and glides otherwise', () => {
    expect(measureWith(true)).toBe('auto');
    expect(measureWith(false)).toBe('smooth');
  });

  it('publishes the app setting (which defaults to the device preference) and uses it for every tour scroll', () => {
    expect(hostSource).toContain('useEffect(() => { window.__alloReduceMotion = !!disableAnimations; }, [disableAnimations]);');
    const tourScroll = sliceBetween(hostSource, '  useEffect(() => {\n    const _steps = customTourSteps || tourSteps;', '  }, [runTour, tourStep, customTourSteps]);', { file: 'AlloFlowANTI.txt', label: 'tour step scroll' });
    expect(tourScroll).not.toContain("behavior: 'smooth'");
    expect(tourScroll.split("behavior: window.__alloReduceMotion ? 'auto' : 'smooth'").length - 1).toBe(2);
  });
});

describe('every tour step has a reveal path and a section', () => {
  const steps = new Function('t', sliceBetween(hostSource, 'const tourSteps = [', '\n  ];', { file: 'AlloFlowANTI.txt', label: 'tourSteps', includeEnd: true }) + '\nreturn tourSteps;')(lookup);
  const sections = new Function('t', sliceBetween(hostSource, '  const TOUR_SECTIONS = [', '\n  ];', { file: 'AlloFlowANTI.txt', label: 'TOUR_SECTIONS', includeEnd: true }) + '\nreturn TOUR_SECTIONS;')(lookup);

  it('puts each step in exactly one section', () => {
    const placed = sections.flatMap(section => section.ids);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual(steps.map(step => step.id).sort());
    for (const section of sections) expect(section.label, section.id).toBeTruthy();
  });

  it('expands every collapsible tool card the tour points at, including tools added later', () => {
    const guidedConfig = readFileSync('guided_mode_config_source.jsx', 'utf8');
    const GUIDED_TOUR_MAP = new Function(sliceBetween(guidedConfig, '  const GUIDED_TOUR_MAP = {', '\n  };', { file: 'guided_mode_config_source.jsx', includeEnd: true }) + '\nreturn GUIDED_TOUR_MAP;')();
    const helpers = readFileSync('text_pipeline_helpers_source.jsx', 'utf8');
    const helperMap = new Function(sliceBetween(helpers, '  const DOM_TO_TOOL_ID_MAP = {', '\n  };', { file: 'text_pipeline_helpers_source.jsx', includeEnd: true }) + '\nreturn DOM_TO_TOOL_ID_MAP;')();
    const line = sliceBetween(hostSource, '  const DOM_TO_TOOL_ID_MAP = {', '\n', { file: 'AlloFlowANTI.txt', label: 'host tool map' });
    const window = { AlloModules: { TextPipelineHelpers: { DOM_TO_TOOL_ID_MAP: helperMap } } };
    const map = new Function('GUIDED_TOUR_MAP', 'window', line + '\nreturn DOM_TO_TOOL_ID_MAP;')(GUIDED_TOUR_MAP, window);
    // A card collapses when the sidebar toggles it by id; the tour must open it under that same id.
    const sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
    for (const step of steps) {
      const at = sidebar.search(new RegExp(`id=["']${step.id}["']`));
      if (at < 0) continue;
      const toggle = sidebar.slice(at, at + 2500).match(/toggleTool\('([^']+)'\)/);
      if (toggle) expect(map[step.id], step.id).toBe(toggle[1]);
    }
    expect(map['tour-tool-memory-aid']).toBe('memory-aid');
    expect(map['tour-tool-applied-challenge']).toBe('applied-challenge');
    expect(map['quiz-mode-select']).toBe('quiz');
    expect(map['tour-upload-source']).toBe('source-input');
  });

  it('keeps each tour section contiguous in tourSteps and clears Help Mode / stale spotlight on tour start', () => {
    const expectedIds = sections.flatMap(section => section.ids);
    expect(steps.map(step => step.id)).toEqual(expectedIds);
    expect(lookup('tour.quiz_mode_text')).toContain('Student-Voice Poll');
    expect(hostSource).toContain("if (e.key === '?' && !runTour &&");
    expect(hostSource).toContain("if (typeof setIsHelpMode === 'function') setIsHelpMode(false);");
  });
});

describe('tour card navigation', () => {
  const steps = [{ title: 'Source', text: 'Add text.' }, { title: 'Glossary', text: 'Words.' }, { title: 'Quiz', text: 'Check.' }];
  const navigator = (extra = {}) => ({
    sections: [{ id: 'start', label: 'Get started', steps: [{ index: 0, title: 'Source' }] }, { id: 'access', label: 'Understand & access', steps: [{ index: 1, title: 'Glossary' }, { index: 2, title: 'Quiz' }] }],
    activeSection: null, onJump: vi.fn(), onToggleSection: vi.fn(), progress: null, notice: '', ...extra,
  });
  const overlay = (extra = {}) => React.createElement(window.AlloModules.TourOverlay, {
    runTour: true, tourRect: { top: 80, left: 20, right: 200, bottom: 180, width: 180, height: 100 }, tourStep: 1, tourSteps: steps,
    t: key => (key === 'common.next' ? 'Next' : key === 'common.back' ? 'Back' : ''), handleNextTourStep: vi.fn(), handlePrevTourStep: vi.fn(), handleSetRunTourToFalse: vi.fn(),
    setRunTour: vi.fn(), setIsSpotlightMode: vi.fn(), setSpotlightMessage: vi.fn(), ...extra,
  });

  it('jumps to any step from a list grouped by section and via chapter pills', () => {
    const nav = navigator();
    render(overlay({ tourNavigator: nav }));
    const select = host.querySelector('#allo-tour-jump');
    expect(host.querySelector('label[for="allo-tour-jump"]').textContent).toBe('Jump to');
    expect([...select.querySelectorAll('optgroup')].map(group => group.label)).toEqual(['Get started', 'Understand & access']);
    expect(select.value).toBe('1');
    const pills = [...host.querySelectorAll('[data-tour-section-pill]')];
    expect(pills.map(p => p.getAttribute('data-tour-section-pill'))).toEqual(['start', 'access']);
    expect(pills[1].getAttribute('aria-current')).toBe('step');
    expect(pills[0].getAttribute('aria-current')).toBeNull();
    act(() => pills[0].click());
    expect(nav.onJump).toHaveBeenCalledWith(0);
    act(() => { select.value = '2'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(nav.onJump).toHaveBeenCalledWith(2);
    expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-mobile-dock')).toBe('bottom');
    render(overlay({ tourNavigator: nav, tourRect: { top: window.innerHeight - 120, left: 20, right: 200, bottom: window.innerHeight - 20, width: 180, height: 100 } }));
    expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-mobile-dock')).toBe('top');
  });

  it('opens a searchable Tour Index with clickable section and element links, and closes it on Escape before exiting', () => {
    const nav = navigator({
      sections: [
        { id: 'start', label: 'Get started', steps: [{ index: 0, id: 'tour-input-panel', title: 'Source', summary: 'Add your reading passage.' }] },
        { id: 'access', label: 'Understand & access', steps: [{ index: 1, id: 'ui-tool-glossary', title: 'Glossary', summary: 'Define vocabulary terms.' }, { index: 2, id: 'ui-tool-quiz', title: 'Quiz', summary: 'Check understanding.' }] },
      ],
      visited: [0, 1],
    });
    const onExit = vi.fn();
    render(overlay({ tourNavigator: nav, handleSetRunTourToFalse: onExit }));
    const toggle = host.querySelector('[data-tour-index-toggle="true"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    act(() => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = host.querySelector('[data-tour-index-panel="true"]');
    expect(panel).not.toBeNull();
    expect(panel.querySelector('[data-tour-index-summary="true"]').textContent).toContain('2 / 3 visited');
    const links = [...panel.querySelectorAll('[data-tour-index-link]')];
    expect(links.map(a => a.getAttribute('href'))).toEqual(['#tour-input-panel', '#ui-tool-glossary', '#ui-tool-quiz']);
    // Filter narrows results
    const search = panel.querySelector('[data-tour-index-search="true"]');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, 'quiz');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect([...panel.querySelectorAll('[data-tour-index-link]')].map(a => a.getAttribute('data-tour-index-link'))).toEqual(['ui-tool-quiz']);
    // Clicking an index link jumps and closes the index
    act(() => panel.querySelector('[data-tour-index-link="ui-tool-quiz"]').click());
    expect(nav.onJump).toHaveBeenCalledWith(2);
    expect(host.querySelector('[data-tour-index-panel="true"]')).toBeNull();
    // Opening again via 'I' shortcut, pressing Enter in search jumps to top match, and Escape closes only the index
    act(() => host.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true, cancelable: true })));
    const panel2 = host.querySelector('[data-tour-index-panel="true"]');
    expect(panel2).not.toBeNull();
    const search2 = panel2.querySelector('[data-tour-index-search="true"]');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search2, 'glossary');
      search2.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => search2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
    expect(nav.onJump).toHaveBeenCalledWith(1);
    expect(host.querySelector('[data-tour-index-panel="true"]')).toBeNull();
    act(() => toggle.click());
    expect(host.querySelector('[data-tour-index-panel="true"]')).not.toBeNull();
    act(() => host.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(host.querySelector('[data-tour-index-panel="true"]')).toBeNull();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('docks the desktop tour drawer on the side with more horizontal clearance for wide right-aligned targets', () => {
    // Wide header target spanning x=480..1000 on default 1024px window: left clearance 480 > right clearance 24 -> dock left
    render(overlay({ tourRect: { top: 20, left: 480, right: 1000, bottom: 90, width: 520, height: 70 } }));
    expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-desktop-dock')).toBe('left');
    render(overlay({ tourRect: { top: 80, left: 20, right: 200, bottom: 180, width: 180, height: 100 } }));
    expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-desktop-dock')).toBe('right');
  });

  it('minimizes into a slim peek bar via button or M shortcut, supports R for Read Aloud, and guards AlloBot clicks during tour', async () => {
    const callTTS = vi.fn().mockResolvedValue(null);
    window.callTTS = callTTS;
    try {
      const onNext = vi.fn();
      render(overlay({ handleNextTourStep: onNext }));
      const dialog = host.querySelector('[role="dialog"]');
      expect(dialog.getAttribute('data-tour-layout')).toBe('main');
      // R toggles Read Aloud
      await act(async () => {
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
      expect(callTTS).toHaveBeenCalledTimes(1);
      // M minimizes to peek bar
      act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true })));
      expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-layout')).toBe('minimized');
      act(() => host.querySelector('[role="dialog"] button[aria-label="Next"]').click());
      expect(onNext).toHaveBeenCalledTimes(1);
      // Expand restores main layout
      act(() => host.querySelector('[data-tour-minimize="true"]').click());
      expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-layout')).toBe('main');
      expect(hostSource).toContain('if (runTour) {\n          try { updateTourMetrics(true); } catch (_) {}\n          return;\n      }');
    } finally { delete window.callTTS; }
  });

  it('hides the AlloBot spotlight beam when AlloBot is hidden or asleep and keeps AlloBot layered between backdrop and dialog', () => {
    render(overlay({ isSpotlightMode: true, isBotVisible: false, botSpotlightPos: { x: 400, y: 200 } }));
    expect(host.querySelector('svg path[fill="url(#beamGradient)"]')).toBeNull();
    window.__alloBotMuzzle = { asleep: true, active: false };
    try {
      render(overlay({ isSpotlightMode: true, isBotVisible: true, botSpotlightPos: { x: 400, y: 200 } }));
      expect(host.querySelector('svg path[fill="url(#beamGradient)"]')).toBeNull();
      window.__alloBotMuzzle = { x: 420, y: 210, angle: 30, active: true };
      render(overlay({ isSpotlightMode: true, isBotVisible: true, botSpotlightPos: { x: 400, y: 200 } }));
      expect(host.querySelector('svg path[fill="url(#beamGradient)"]')).not.toBeNull();
    } finally { delete window.__alloBotMuzzle; }
    const botSrc = readFileSync('allobot_source.jsx', 'utf8');
    expect(botSrc).toContain('zIndex: (holdingPointer && !isSleeping) ? 11055 :');
    expect(botSrc).toContain('if (isSleeping) return null;');
    expect(botSrc).toContain('window.__alloBotMuzzle = null');
  });

  it('renders clickable related-step cross-links and a refocus button when wired', () => {
    const nav = navigator({
      sections: [
        { id: 'assess', label: 'Assess & deliver', steps: [
          { index: 0, id: 'ui-tool-quiz', title: 'Gamified Quiz' },
          { index: 1, id: 'quiz-mode-select', title: 'Pick the right quiz mode' },
        ] },
      ],
    });
    const onRefocus = vi.fn();
    render(overlay({
      tourStep: 0,
      tourSteps: [
        { id: 'ui-tool-quiz', title: 'Gamified Quiz', text: 'Create a quiz.' },
        { id: 'quiz-mode-select', title: 'Pick the right quiz mode', text: 'Pick mode.' },
      ],
      tourNavigator: nav,
      onRefocusTarget: onRefocus,
    }));
    const rel = host.querySelector('[data-tour-related-link="quiz-mode-select"]');
    expect(rel).not.toBeNull();
    expect(rel.getAttribute('href')).toBe('#quiz-mode-select');
    act(() => rel.click());
    expect(nav.onJump).toHaveBeenCalledWith(1);
    const refocus = host.querySelector('[data-tour-refocus="true"]');
    expect(refocus).not.toBeNull();
    act(() => refocus.click());
    expect(onRefocus).toHaveBeenCalledTimes(1);
  });

  it('offers a section-only walk as a pressed toggle with a fixed name', () => {
    const nav = navigator();
    render(overlay({ tourNavigator: nav }));
    const toggle = host.querySelector('[data-tour-section-toggle]');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.textContent).toBe('Only this section');
    act(() => toggle.click());
    expect(nav.onToggleSection).toHaveBeenCalledTimes(1);
    render(overlay({ tourNavigator: navigator({ activeSection: 'access', progress: { current: 1, total: 2, label: 'Understand & access' } }) }));
    expect(host.querySelector('[data-tour-section-toggle]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-tour-section-toggle]').textContent).toBe('Only this section');
    expect(host.querySelector('[data-tour-progress]').textContent).toBe('Understand & access · 1 / 2');
  });

  it('names skipped steps on screen and to screen readers', () => {
    render(overlay({ tourNavigator: navigator({ notice: 'Skipped, not available in this view: Action Bar' }) }));
    expect(host.querySelector('[data-tour-skip-note]').textContent).toBe('Skipped, not available in this view: Action Bar');
    expect(host.querySelector('[role="status"]').textContent).toContain('Skipped, not available in this view: Action Bar');
  });

  it('keeps the plain counter and no navigator for modal tours and help spotlights', () => {
    render(overlay());
    expect(host.querySelector('#allo-tour-jump')).toBeNull();
    expect(host.querySelector('[data-tour-progress]').textContent).toBe('2 / 3');
    render(overlay({ tourNavigator: navigator(), spotlightMessage: { title: 'Help', text: 'About this control.' } }));
    expect(host.querySelector('#allo-tour-jump')).toBeNull();
  });

  it('formats the skipped note through the shipped string', () => {
    expect(lookup('tour.skipped_unavailable')).toContain('{steps}');
    for (const key of ['jump_to', 'section_only', 'section_start', 'section_access', 'section_engage', 'section_assess', 'section_app']) expect(lookup('tour.' + key), key).toBeTruthy();
  });

  it('themes TourOverlay spotlightMessage cards for Dark and High-Contrast with Read Aloud and Close buttons', () => {
    const prevCallTTS = window.callTTS;
    window.callTTS = vi.fn(() => Promise.resolve(null));
    try {
      render(overlay({
        theme: 'contrast',
        spotlightMessage: { title: 'Quiz Focus', text: '### Quick Tip\n- Click **Generate** to start.\n> Quote note' },
      }));
      const dialog = host.querySelector('[role="dialog"]');
      expect(dialog.getAttribute('data-tour-theme')).toBe('contrast');
      const heading = dialog.querySelector('h4');
      expect(heading.className).toContain('text-yellow-400');
      expect(heading.className).not.toContain('text-indigo-900');
      expect(dialog.querySelector('[data-tour-read-aloud="true"]')).not.toBeNull();
      expect(dialog.querySelector('[data-tour-close="true"]')).not.toBeNull();
      expect(dialog.innerHTML).not.toContain('text-slate-800');
    } finally {
      window.callTTS = prevCallTTS;
    }
  });

  it('allows compact modal tours to minimize into Peek mode via button or M key', () => {
    render(overlay({ compactTour: true }));
    const minBtn = host.querySelector('[data-tour-minimize="true"]');
    expect(minBtn).not.toBeNull();
    act(() => minBtn.click());
    expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-layout')).toBe('minimized');
    act(() => host.querySelector('[data-tour-minimize="true"]').click());
    expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-layout')).toBe('compact');
  });

  it('guards SpotlightTourView against double-overlay with TourOverlay and bridges to Guided Tour with browser TTS fallback', () => {
    expect(hostSource).toContain('!runTour && isSpotlightMode && tourRect && spotlightMessage');
    expect(hostSource).toContain('onOpenInTour: spotlightTourStepIndex >= 0');
    // Load compiled SpotlightTourView and test onOpenInTour + R device-voice fallback without window.callTTS.
    const spotlightCode = readFileSync('view_spotlight_tour_module.js', 'utf8');
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.SpotlightTourView;
    new Function(spotlightCode)();
    const SpotlightTourView = window.AlloModules.SpotlightTourView;
    expect(typeof SpotlightTourView).toBe('function');
    const openTour = vi.fn();
    const speak = vi.fn();
    const cancel = vi.fn();
    const prevCallTTS = window.callTTS;
    const prevSynth = window.speechSynthesis;
    const prevUtterance = globalThis.SpeechSynthesisUtterance;
    try {
      delete window.callTTS;
      window.speechSynthesis = { speak, cancel };
      globalThis.SpeechSynthesisUtterance = function (text) { this.text = text; };
      render(React.createElement(SpotlightTourView, {
        t: (k, o) => (o && o.defaultValue) || k,
        theme: 'dark',
        tourRect: { top: 240, left: 120, right: 420, bottom: 320, width: 300, height: 80 },
        spotlightMessage: { title: 'Quiz Generator', text: 'Build multi-format quizzes.' },
        spotlightOpenTimeRef: { current: 0 },
        setIsSpotlightMode: vi.fn(),
        setSpotlightMessage: vi.fn(),
        onOpenInTour: openTour,
      }));
      const bridgeBtn = host.querySelector('[data-spotlight-open-tour="true"]');
      expect(bridgeBtn).not.toBeNull();
      expect(bridgeBtn.textContent).toContain('View in Guided Tour');
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true, cancelable: true }));
      });
      expect(speak).toHaveBeenCalledTimes(1);
      act(() => bridgeBtn.click());
      expect(openTour).toHaveBeenCalledTimes(1);
    } finally {
      window.callTTS = prevCallTTS;
      window.speechSynthesis = prevSynth;
      globalThis.SpeechSynthesisUtterance = prevUtterance;
    }
  });

  it('renders compact tour step-jump pills when onJumpStep is wired without showing #allo-tour-jump', () => {
    const jump = vi.fn();
    render(overlay({ compactTour: true, onJumpStep: jump }));
    expect(host.querySelector('#allo-tour-jump')).toBeNull();
    const dots = host.querySelectorAll('[data-tour-compact-dots="true"] button');
    expect(dots.length).toBe(3);
    expect(dots[1].getAttribute('aria-current')).toBe('step');
    act(() => dots[2].click());
    expect(jump).toHaveBeenCalledWith(2);
  });

  it('renders AlloBot spotlight beam in Help Mode when awake and suppresses it when hidden, asleep, or High-Contrast', () => {
    expect(hostSource).toContain('data-help-mode-banner="true"');
    expect(hostSource).toContain('prev && prev._fromHelpMode');
    const spotlightCode = readFileSync('view_spotlight_tour_module.js', 'utf8');
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.SpotlightTourView;
    new Function(spotlightCode)();
    const SpotlightTourView = window.AlloModules.SpotlightTourView;
    const prevMuzzle = window.__alloBotMuzzle;
    try {
      window.__alloBotMuzzle = { x: 520, y: 260, active: true };
      const mk = (extra = {}) => React.createElement(SpotlightTourView, {
        t: (k, o) => (o && o.defaultValue) || k,
        theme: 'dark',
        isBotVisible: true,
        tourRect: { top: 200, left: 100, right: 360, bottom: 320, width: 260, height: 120 },
        spotlightMessage: { title: 'Glossary', text: 'Key words.' },
        spotlightOpenTimeRef: { current: 0 },
        setIsSpotlightMode: vi.fn(),
        setSpotlightMessage: vi.fn(),
        ...extra,
      });
      render(mk());
      expect(host.querySelector('[data-spotlight-help-beam="true"]')).not.toBeNull();
      render(mk({ isBotVisible: false }));
      expect(host.querySelector('[data-spotlight-help-beam="true"]')).toBeNull();
      render(mk({ theme: 'contrast' }));
      expect(host.querySelector('[data-spotlight-help-beam="true"]')).toBeNull();
      window.__alloBotMuzzle = { asleep: true, active: false };
      render(mk());
      expect(host.querySelector('[data-spotlight-help-beam="true"]')).toBeNull();
    } finally {
      window.__alloBotMuzzle = prevMuzzle;
    }
  });

  it('supports ArrowDown/ArrowUp keyboard navigation in Tour Index and layers Help Mode AlloBot above its beam', () => {
    expect(hostSource).toContain('z-index: 11055 !important; /* Above spotlight beam (11050)');
    expect(hostSource).toContain('alloBotRef.current.moveTo(botX, botY)');
    const nav = navigator({
      sections: [
        { id: 'start', label: 'Get started', steps: [{ index: 0, id: 'tour-input-panel', title: 'Source', summary: 'Add text.' }] },
        { id: 'access', label: 'Understand & access', steps: [{ index: 1, id: 'ui-tool-glossary', title: 'Glossary', summary: 'Words.' }] },
      ],
    });
    render(overlay({ tourNavigator: nav }));
    act(() => host.querySelector('[data-tour-index-toggle="true"]').click());
    const panel = host.querySelector('[data-tour-index-panel="true"]');
    const search = panel.querySelector('[data-tour-index-search="true"]');
    const links = [...panel.querySelectorAll('a[data-tour-index-link]')];
    search.focus();
    act(() => panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(links[0]);
    act(() => panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(links[1]);
    act(() => panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(links[0]);
    act(() => panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(search);
    // Escape while search has text clears the filter before closing the index.
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, 'quiz');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(search.value).toBe('quiz');
    act(() => search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(search.value).toBe('');
    expect(host.querySelector('[data-tour-index-panel="true"]')).not.toBeNull();
  });

  it('shows UDL Read Aloud status strip in TourOverlay, themes Header Help menu in Dark Mode, and uses flashLensRef on AlloBot', () => {
    const botSource = readFileSync('allobot_source.jsx', 'utf8');
    expect(botSource).toContain('ref={flashLensRef}');
    expect(botSource).toContain('const lensEl = flashLensRef.current');
    const prevCallTTS = window.callTTS;
    const prevSynth = window.speechSynthesis;
    const prevUtterance = globalThis.SpeechSynthesisUtterance;
    try {
      delete window.callTTS;
      window.speechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
      globalThis.SpeechSynthesisUtterance = function (text) { this.text = text; };
      render(overlay({ tourSteps: [{ title: 'Glossary', text: 'First line.\nSecond line.' }], tourStep: 0 }));
      const readBtn = host.querySelector('[data-tour-read-aloud="true"]');
      expect(readBtn).not.toBeNull();
      act(() => readBtn.click());
      const status = host.querySelector('[data-tour-tts-status="playing"]');
      expect(status).not.toBeNull();
      expect(status.textContent).toContain('Press R to stop');
      act(() => readBtn.click());
      expect(host.querySelector('[data-tour-tts-status]')).toBeNull();
    } finally {
      window.callTTS = prevCallTTS;
      window.speechSynthesis = prevSynth;
      globalThis.SpeechSynthesisUtterance = prevUtterance;
    }
    const headerSrc = readFileSync('view_header_source.jsx', 'utf8');
    expect(headerSrc).toContain("data-help-menu-theme={theme || 'light'}");
    expect(headerSrc).toContain("theme === 'dark' ? '#0f172a'");
  });

  it('docks Help Mode popup vertically on narrow mobile screens, persists visited tour steps, and offers Read Aloud in Peek mode', () => {
    expect(hostSource).toContain("allo_tour_visited_steps");
    expect(hostSource).toContain("helpKey: 'read_this_page_toggle'");
    const spotlightCode = readFileSync('view_spotlight_tour_module.js', 'utf8');
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.SpotlightTourView;
    new Function(spotlightCode)();
    const SpotlightTourView = window.AlloModules.SpotlightTourView;
    const prevWidth = window.innerWidth;
    const prevHeight = window.innerHeight;
    const prevSynth = window.speechSynthesis;
    const prevUtterance = globalThis.SpeechSynthesisUtterance;
    try {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 812, configurable: true });
      render(React.createElement(SpotlightTourView, {
        t: (k, o) => (o && o.defaultValue) || k,
        theme: 'dark',
        tourRect: { top: 100, left: 20, right: 355, bottom: 180, width: 335, height: 80 },
        spotlightMessage: { title: 'Quiz Generator', text: 'Build checks.' },
        spotlightOpenTimeRef: { current: 0 },
        setIsSpotlightMode: vi.fn(),
        setSpotlightMessage: vi.fn(),
      }));
      const panel = host.querySelector('#spotlight-message-panel');
      expect(panel.getAttribute('data-spotlight-dock')).toBe('below');
      // Peek bar includes Read Aloud toggle when speech is available.
      window.speechSynthesis = { speak: vi.fn(), cancel: vi.fn() };
      globalThis.SpeechSynthesisUtterance = function (text) { this.text = text; };
      render(overlay());
      act(() => host.querySelector('[data-tour-minimize="true"]').click());
      expect(host.querySelector('[role="dialog"]').getAttribute('data-tour-layout')).toBe('minimized');
      expect(host.querySelector('[data-tour-read-aloud="true"]')).not.toBeNull();
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: prevWidth, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: prevHeight, configurable: true });
      window.speechSynthesis = prevSynth;
      globalThis.SpeechSynthesisUtterance = prevUtterance;
    }
  });
});
