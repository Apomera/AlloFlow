// Launch Pad role doors (2026-09-25). The first screen asks "who are you?"
// instead of "which workspace?" (brief: .impeccable/shape/launch-pad-role-first-2026-09-25.md).
// The rendered tests mount the BUILT module and click the real doors, so a door
// wired to the wrong role fails here, not just a missing class name.
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = fs.readFileSync('view_launch_pad_source.jsx', 'utf8');

describe('Launch Pad role doors: source contract', () => {
  it('offers exactly four doors as native buttons with visible names and descriptions', () => {
    for (const door of ['teacher', 'student', 'family', 'specialist']) {
      expect(source).toContain("key: '" + door + "'");
    }
    // one renderDoor, plus the four legacy chooser cards kept for older hosts
    expect(source.match(/<button type="button" className="lp-card"/g)).toHaveLength(5);
    expect(source).toContain("aria-labelledby={'launch-pad-' + door.key + '-title'}");
    expect(source).toContain("'launch-pad-' + door.key + '-desc'");
    expect(source).not.toContain('<div className="lp-card"');
    expect(source).not.toContain('role="button"');
    expect(source).toContain('aria-hidden="true" focusable="false"');
  });

  it('uses registered icons and keeps the workspace chooser only for older hosts', () => {
    for (const name of ['School', 'Backpack', 'Heart', 'ClipboardList']) {
      expect(source).toContain("icon: '" + name + "'");
    }
    for (const name of ['Key', 'Search']) {
      expect(source).toContain('<LaunchPadIcon name="' + name + '"');
    }
    // The legacy chooser lives only in the legacyHost branch, never beside the doors.
    expect(source).toContain("var legacyHost = typeof onChooseRole !== 'function';");
    const branch = source.indexOf('{legacyHost ? (<>');
    const legacyChooser = source.indexOf('<section className="lp-choice-section"');
    const doors = source.indexOf('<section className="lp-door-section"');
    expect(branch).toBeGreaterThan(-1);
    expect(legacyChooser).toBeGreaterThan(branch);
    expect(doors).toBeGreaterThan(legacyChooser);
    expect(source).not.toMatch(/fallback="[FGLE]"/);
    expect(source).toContain("voiceAccessStarting ? 'Loader2' : voiceAccessActive ? 'CheckCircle2' : 'Mic'");
  });

  it('keeps focus, target size, contrast, reflow and reduced motion', () => {
    expect(source).toContain('.lp-card { appearance: none; width: 100%; min-height: 44px;');
    expect(source).toContain('.lp-card:focus-visible { outline: 3px solid #facc15; outline-offset: 4px;');
    expect(source).toContain('.lp-alt-link { appearance: none; justify-self: start; min-height: 44px;');
    expect(source).toContain('.lp-code-input { flex: 1 1 0; width: 0; min-width: 0; min-height: 44px;');
    expect(source).toContain('.lp-door-grid, .lp-student-options { grid-template-columns: minmax(0, 1fr) !important; }');
    expect(source).toContain('.lp-card-desc { display: block; color: #c3cede; font-size: 12px;');
    expect(source).toContain('.lp-utility-bar > :only-child { margin-inline-start: auto; }');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('.lp-root, .lp-card, .lp-card:hover, .lp-card:active, .lp-card-icon, .lp-badge, .lp-student-panel');
    expect(source).toContain('@media (max-width: 360px)');
    expect(source).toContain("root.querySelector('[data-lp-initial-focus=\"true\"]')");
  });

  it('keeps generated launch-pad modules synchronized', () => {
    const rootModule = fs.readFileSync('view_launch_pad_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_launch_pad_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('onChooseRole');
    expect(rootModule).not.toContain('role: "button"');
  });
});

describe('Launch Pad role doors: rendered behaviour', () => {
  let React, ReactDOMClient, act, LaunchPadView;
  let host, root, onChooseRole;

  beforeAll(() => {
    React = require(resolve(MODULES_DIR, 'react'));
    ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
    ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    // The host provides this; the pad reads the current UI language from it.
    window.AlloLanguageContext = window.AlloLanguageContext || React.createContext({});
    loadAlloModule('view_launch_pad_module.js');
    LaunchPadView = window.AlloModules && window.AlloModules.LaunchPadView;
    if (!LaunchPadView) throw new Error('LaunchPadView not registered');
  });

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    onChooseRole = vi.fn();
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.useRealTimers();
  });

  function mount(extra) {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const noop = () => {};
    act(() => root.render(React.createElement(LaunchPadView, {
      t: () => '', _isCanvasEnv: true, micPermissionStatus: 'unknown', APP_CONFIG: {},
      setHasSelectedMode: noop, setMicBannerDismissed: noop, setGuidedMode: noop, setHasSelectedRole: noop,
      setShowWizard: noop, setIsTeacherMode: noop, setShowLearningHub: noop, setShowEducatorHub: noop,
      setPendingRole: noop, setIsGateOpen: noop, setShowAIBackendModal: noop,
      onChooseRole, ...(extra || {}),
    })));
  }
  const door = (key) => host.querySelector('[data-pathway="' + key + '"]');
  const byText = (text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  const click = (el) => { act(() => { el.click(); }); act(() => { vi.advanceTimersByTime(100); }); };

  it('renders the four doors in order and focuses Teacher first', () => {
    mount();
    const keys = [...host.querySelectorAll('.lp-card')].map((b) => b.dataset.pathway);
    expect(keys).toEqual(['teacher', 'student', 'family', 'specialist']);
    expect(door('teacher').getAttribute('data-lp-initial-focus')).toBe('true');
    expect(host.textContent).toContain('How will you be using the app today?');
  });

  it('routes Teacher to Guided, and the quiet link to the full workspace', () => {
    mount();
    click(door('teacher'));
    expect(onChooseRole).toHaveBeenLastCalledWith('teacher', {});
    click(byText('Open the full workspace instead'));
    expect(onChooseRole).toHaveBeenLastCalledWith('teacher_full', {});
  });

  it('routes Family and Specialist straight to their roles', () => {
    mount();
    click(door('family'));
    expect(onChooseRole).toHaveBeenLastCalledWith('family', {});
    click(door('specialist'));
    expect(onChooseRole).toHaveBeenLastCalledWith('specialist', {});
  });

  it('opens the Student options in place, and Escape closes them back to the door', () => {
    mount();
    expect(door('student').getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('#launch-pad-student-panel')).toBeNull();
    click(door('student'));
    expect(onChooseRole).not.toHaveBeenCalled();
    expect(door('student').getAttribute('aria-expanded')).toBe('true');
    const panel = host.querySelector('#launch-pad-student-panel');
    expect(panel).not.toBeNull();
    expect(door('student').getAttribute('aria-controls')).toBe('launch-pad-student-panel');
    act(() => { panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(host.querySelector('#launch-pad-student-panel')).toBeNull();
    expect(document.activeElement).toBe(door('student'));
  });

  it('only joins with a full 5-character code, normalised, and passes it to the host', () => {
    mount();
    click(door('student'));
    const input = host.querySelector('#launch-pad-class-code');
    const join = byText('Join class');
    expect(join.disabled).toBe(true);
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => { setValue.call(input, 'ab-1'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(join.disabled).toBe(true);
    act(() => { setValue.call(input, 'ab-12c'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(join.disabled).toBe(false);
    act(() => { input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(onChooseRole).toHaveBeenLastCalledWith('student_code', { code: 'AB12C' });
  });

  it('offers explore-on-my-own and the adult path from the Student options', () => {
    mount();
    click(door('student'));
    click(byText('Explore on my own'));
    expect(onChooseRole).toHaveBeenLastCalledWith('student_explore', {});
    click(byText("I'm an adult learning on my own"));
    expect(onChooseRole).toHaveBeenLastCalledWith('adult', {});
  });

  it('badges and focuses the door this device used last', () => {
    localStorage.setItem('alloflow_last_role', 'parent');
    mount();
    expect(door('family').getAttribute('data-lp-initial-focus')).toBe('true');
    expect(door('teacher').getAttribute('data-lp-initial-focus')).toBeNull();
    expect(door('family').textContent).toContain('Last time');
  });

  it('gives an older host its own workspace chooser, never doors that re-ask the question', () => {
    // An older host has no onChooseRole. Doors there fell through to the old role
    // popup, which asked "How will you be using the app today?" a second time.
    const setHasSelectedMode = vi.fn();
    const setGuidedMode = vi.fn();
    mount({ onChooseRole: undefined, setHasSelectedMode, setGuidedMode });
    const cards = [...host.querySelectorAll('.lp-card')].map((b) => b.dataset.pathway);
    expect(cards).toEqual(['guided', 'full', 'learning', 'educator']);
    expect(host.querySelector('#launch-pad-door-title')).toBeNull();
    click(host.querySelector('[data-pathway="guided"]'));
    expect(setHasSelectedMode).toHaveBeenCalledWith(true);
    expect(setGuidedMode).toHaveBeenLastCalledWith(true);
  });
});
