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

  // The tour's own start button is in the expanded header only; Start & setup is in both.
  const openSetupMenu = (extra) => {
    localStorage.setItem('allo_header_collapsed', 'true');
    const calls = { setRunTour: vi.fn(), setTourStep: vi.fn(), setSpotlightMessage: vi.fn() };
    render(header({ ...calls, ...extra }));
    act(() => host.querySelector('[data-help-key="header_rerun_wizard"]').click());
    return calls;
  };

  it('starts the app tour from Start & setup in the compact header', () => {
    const calls = openSetupMenu({ tourResumeStep: 0 });
    const start = host.querySelector('[data-setup-tour-start]');
    expect(start, 'tour entry in the setup menu').not.toBeNull();
    expect(start.textContent).toContain('Take the app tour');
    expect(host.querySelector('[data-setup-tour-resume]'), 'no resume offer without a paused tour').toBeNull();
    act(() => start.click());
    expect(calls.setTourStep).toHaveBeenCalledWith(0);
    expect(calls.setRunTour).toHaveBeenCalledWith(true);
    expect(calls.setSpotlightMessage).toHaveBeenCalledWith('');
    expect(host.querySelector('[data-setup-tour-start]'), 'the menu closes').toBeNull();
  });

  it('resumes a tour that was closed part-way at the step it reached', () => {
    const calls = openSetupMenu({ tourResumeStep: 7 });
    act(() => host.querySelector('[data-setup-tour-resume]').click());
    expect(calls.setTourStep).toHaveBeenCalledWith(7);
    expect(calls.setRunTour).toHaveBeenCalledWith(true);
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

  it('jumps to any step from a list grouped by section', () => {
    const nav = navigator();
    render(overlay({ tourNavigator: nav }));
    const select = host.querySelector('#allo-tour-jump');
    expect(host.querySelector('label[for="allo-tour-jump"]').textContent).toBe('Jump to');
    expect([...select.querySelectorAll('optgroup')].map(group => group.label)).toEqual(['Get started', 'Understand & access']);
    expect(select.value).toBe('1');
    act(() => { select.value = '2'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(nav.onJump).toHaveBeenCalledWith(2);
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
});
