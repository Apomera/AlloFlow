// 2026-11-10: a teacher's "?" opens a short Help menu (explain the screen, the
// tour, past tips). The tour and tips were unlabelled icons in the expanded
// header only. Students keep the one-click Help Mode switch.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, HeaderBar, root, host;

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
  ({ HeaderBar } = window.AlloModules.HeaderBar);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null;
  localStorage.clear();
});

const TEACHER = { isTeacherMode: true, isIndependentMode: false, isParentMode: false };
const STUDENT = { isTeacherMode: false, isIndependentMode: false, isParentMode: false };

function mount(role, extra = {}, collapsed = true) {
  localStorage.setItem('allo_header_collapsed', collapsed ? 'true' : 'false');
  const base = { t: key => key, APP_CONFIG: {}, isStudentLinkMode: false, history: [], ...extra };
  // The expanded header also takes components from the host (AnimatedNumber and the like).
  const Blank = () => null;
  const props = new Proxy(base, { get: (o, k) => k in o ? o[k] : typeof k !== 'string' ? undefined : /^[A-Z][a-z]/.test(k) ? Blank : /^(set|handle|on|toggle|open|close|start|join|dismiss)/.test(k) ? () => {} : undefined });
  const Shell = () => React.createElement(window.AlloRoleContext.Provider, { value: role }, React.createElement(() => HeaderBar(props)));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Shell)));
}
const helpButton = () => host.querySelector('[data-help-menu-toggle]');
const menu = () => host.querySelector('[data-help-menu]');

describe('teacher Help menu, compact header', () => {
  it('"?" opens three labelled rows and does not switch Help Mode on by itself', () => {
    const handleToggleIsHelpMode = vi.fn();
    mount(TEACHER, { handleToggleIsHelpMode });
    expect(menu()).toBeNull();
    expect(helpButton().getAttribute('aria-label')).toBe('Help');
    expect(helpButton().getAttribute('aria-expanded')).toBe('false');
    act(() => helpButton().click());
    expect(menu()).not.toBeNull();
    expect(helpButton().getAttribute('aria-expanded')).toBe('true');
    const rows = Array.from(menu().querySelectorAll('button')).map(b => b.textContent);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('What does this do?');
    expect(rows[1]).toContain('Take the app tour');
    expect(rows[2]).toContain('Past tips and messages');
    expect(handleToggleIsHelpMode).not.toHaveBeenCalled();
    expect(document.activeElement, 'focus moves into the menu').toBe(menu().querySelector('button'));
  });

  it('"What does this do?" turns Help Mode on and closes the menu', () => {
    const handleToggleIsHelpMode = vi.fn();
    mount(TEACHER, { handleToggleIsHelpMode });
    act(() => helpButton().click());
    act(() => menu().querySelector('[data-help-menu-explain]').click());
    expect(handleToggleIsHelpMode).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it('the tour row starts the tour at step 0', () => {
    const setRunTour = vi.fn(), setTourStep = vi.fn();
    mount(TEACHER, { setRunTour, setTourStep });
    act(() => helpButton().click());
    act(() => menu().querySelector('[data-help-menu-tour]').click());
    expect(setTourStep).toHaveBeenCalledWith(0);
    expect(setRunTour).toHaveBeenCalledWith(true);
    expect(menu()).toBeNull();
  });

  it('the tips row opens the tips and messages log', () => {
    const handleSetShowHintsModalToTrue = vi.fn();
    mount(TEACHER, { handleSetShowHintsModalToTrue });
    act(() => helpButton().click());
    act(() => menu().querySelector('[data-help-menu-tips]').click());
    expect(handleSetShowHintsModalToTrue).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it('with Help Mode on, one click on "?" turns it off and opens no menu', () => {
    const handleToggleIsHelpMode = vi.fn();
    mount(TEACHER, { handleToggleIsHelpMode, isHelpMode: true });
    expect(helpButton().getAttribute('aria-label')).toBe('help_mode.deactivate');
    act(() => helpButton().click());
    expect(handleToggleIsHelpMode).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it('Escape closes the menu and returns focus to "?"', () => {
    mount(TEACHER);
    act(() => helpButton().click());
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(helpButton());
  });

  it('a click elsewhere closes the menu', () => {
    mount(TEACHER);
    act(() => helpButton().click());
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(menu()).toBeNull();
  });

  it('the dot shows on "?" only when there are tips or messages to read again', () => {
    mount(TEACHER, { hintHistory: [], toastHistoryCount: 0 });
    expect(host.querySelector('[data-help-dot]')).toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    mount(TEACHER, { hintHistory: [], toastHistoryCount: 2 });
    expect(host.querySelector('[data-help-dot]')).not.toBeNull();
  });
});

describe('students', () => {
  it('"?" stays a one-click Help Mode switch with no menu', () => {
    const handleToggleIsHelpMode = vi.fn();
    mount(STUDENT, { handleToggleIsHelpMode, hintHistory: [{}] });
    expect(helpButton().getAttribute('aria-label')).toBe('help_mode.activate');
    expect(helpButton().hasAttribute('aria-expanded')).toBe(false);
    expect(host.querySelector('[data-help-dot]')).toBeNull();
    act(() => helpButton().click());
    expect(handleToggleIsHelpMode).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });
});

describe('expanded header', () => {
  it('has the same menu, keeps Start & setup, and no longer has the two loose icons', () => {
    const handleSetShowHintsModalToTrue = vi.fn();
    mount(TEACHER, { handleSetShowHintsModalToTrue }, false);
    expect(host.querySelector('[data-compact-help-toggle]'), 'expanded header is mounted').toBeNull();
    expect(host.querySelector('[data-help-key="header_rerun_wizard"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="hints_recall"]')).toBeNull();
    expect(host.querySelector('[data-help-key="header_tour_start"]')).toBeNull();
    act(() => helpButton().click());
    expect(menu().querySelectorAll('button')).toHaveLength(3);
    act(() => menu().querySelector('[data-help-key="hints_recall"]').click());
    expect(handleSetShowHintsModalToTrue).toHaveBeenCalledTimes(1);
  });
});
