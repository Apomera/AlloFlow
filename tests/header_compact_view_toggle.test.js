// The compact header kept Dashboard, Session and Setup but dropped the
// teacher/student switch, so checking the student side meant expanding the
// header first. It now carries the same gated switch, labeled.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const STRINGS = { 'header.view_student': 'Switch to Student View', 'header.view_teacher': 'Switch to Teacher View', 'header.nav_student_view': 'Student view', 'header.nav_teacher_view': 'Teacher view' };
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

beforeEach(() => { localStorage.setItem('allo_header_collapsed', 'true'); });
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null;
  localStorage.clear();
});

// HeaderBar takes ~150 props; unnamed callbacks default to no-ops.
function mount(role, extra = {}) {
  const base = { t: key => STRINGS[key] || key, APP_CONFIG: {}, isStudentLinkMode: false, history: [], ...extra };
  const props = new Proxy(base, { get: (o, k) => k in o ? o[k] : (typeof k === 'string' && /^(set|handle|on|toggle|open|close|start|join)/.test(k) ? () => {} : undefined) });
  const Shell = () => React.createElement(window.AlloRoleContext.Provider, { value: role }, React.createElement(() => HeaderBar(props)));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Shell)));
}
const toggle = () => host.querySelector('[data-compact-view-toggle]');

describe('compact header view switch', () => {
  it('switches a teacher to student view in one click, labeled', () => {
    const setIsTeacherMode = vi.fn();
    mount({ isTeacherMode: true, isIndependentMode: false, isParentMode: false, setIsTeacherMode });
    expect(host.querySelector('[data-help-key="header_rerun_wizard"]'), 'compact header is mounted').not.toBeNull();
    expect(toggle().getAttribute('aria-label')).toBe('Switch to Student View');
    expect(toggle().textContent).toBe('Student view');
    expect(toggle().closest('nav'), 'outside the scrolling nav').toBeNull();
    act(() => toggle().click());
    expect(setIsTeacherMode).toHaveBeenCalledWith(false);
  });

  it('switches back to teacher view without a code when none is configured', () => {
    const setIsTeacherMode = vi.fn();
    mount({ isTeacherMode: false, isIndependentMode: false, isParentMode: false, setIsTeacherMode });
    expect(toggle().textContent).toBe('Teacher view');
    act(() => toggle().click());
    expect(setIsTeacherMode).toHaveBeenCalledWith(true);
  });

  it('asks for the access code before returning to teacher view when one is set', () => {
    const setIsTeacherMode = vi.fn(), setPendingRole = vi.fn(), setIsGateOpen = vi.fn();
    mount({ isTeacherMode: false, isIndependentMode: false, isParentMode: false, setIsTeacherMode }, { APP_CONFIG: { _cfg_validation_key: 'k' }, setPendingRole, setIsGateOpen });
    act(() => toggle().click());
    expect(setIsTeacherMode).not.toHaveBeenCalled();
    expect(setPendingRole).toHaveBeenCalledWith('toggle_view');
    expect(setIsGateOpen).toHaveBeenCalledWith(true);
  });

  it('stays hidden for student links and independent learners, like the expanded header', () => {
    mount({ isTeacherMode: false, isIndependentMode: false, isParentMode: false }, { isStudentLinkMode: true });
    expect(toggle()).toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    mount({ isTeacherMode: true, isIndependentMode: true, isParentMode: false });
    expect(toggle()).toBeNull();
  });

  it('keeps one switch: the expanded header uses the same gated handler', () => {
    // The expanded header needs far more props than this harness supplies, so check the source.
    const src = readFileSync('view_header_source.jsx', 'utf8');
    const expanded = sliceBetween(src, 'id="tour-header-tools"', 'data-help-key={isTeacherMode ? "header_view_student" : "header_view_teacher"}', { file: 'view_header_source.jsx', label: 'expanded view switch' });
    expect(expanded).toContain('{viewModeAvailable && (');
    expect(expanded).toContain('onClick={toggleViewMode}');
    expect(src.split("setPendingRole('toggle_view')").length - 1, 'one gate, not two copies').toBe(1);
  });
});
