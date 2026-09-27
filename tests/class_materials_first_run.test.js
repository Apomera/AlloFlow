// Class & Materials first run (2026-09-26): a quick first-group form, an empty
// materials list that points to Create, family copy, and the host wiring that
// lets parents start from their child's reading.
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const anti = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const panelSource = fs.readFileSync('view_history_panel_source.jsx', 'utf8');

describe('Class groups quick add (rendered)', () => {
  let React, ReactDOMClient, act, Strip, host, root;
  beforeAll(() => {
    React = require(resolve(MODULES_DIR, 'react'));
    ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
    ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloModules = window.AlloModules || {};
    Function('window', fs.readFileSync('view_teacher_history_tab_module.js', 'utf8'))(window);
    Strip = window.AlloModules.TeacherHistoryTab.TeacherHistoryTab;
  });
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); });
  const render = (props) => act(() => root.render(React.createElement(Strip, {
    t: () => '', handleApplyRosterGroup: () => {}, hasSourceOrAnalysis: false, setIsRosterKeyOpen: () => {}, onDifferentiateByGroup: () => {}, ...props,
  })));
  const setValue = (el, value) => {
    const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };

  it('offers a first-group form, not two roster buttons, when there are no groups', () => {
    render({ rosterKey: null, onQuickAddGroup: vi.fn(() => 'added'), defaultGrade: '3rd Grade', defaultLanguage: 'Spanish' });
    expect(host.querySelector('[data-help-key="roster_manage_btn"]')).toBeNull();
    const form = host.querySelector('[data-help-key="roster_quick_add"]');
    expect(form).not.toBeNull();
    expect(form.querySelector('select').value).toBe('3rd Grade');
    expect(form.querySelectorAll('input')[1].value).toBe('Spanish');
  });

  it('passes name, grade and language to the host and clears on success', () => {
    const add = vi.fn(() => 'added');
    render({ rosterKey: null, onQuickAddGroup: add, defaultGrade: '5th Grade', defaultLanguage: 'English' });
    const form = host.querySelector('[data-help-key="roster_quick_add"]');
    act(() => { setValue(form.querySelector('input'), 'Reading support'); setValue(form.querySelector('select'), '4th Grade'); });
    act(() => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(add).toHaveBeenCalledWith('Reading support', '4th Grade', 'English');
    expect(form.querySelector('input').value).toBe('');
  });

  it('explains a duplicate name instead of failing silently', () => {
    render({ rosterKey: null, onQuickAddGroup: () => 'duplicate' });
    const form = host.querySelector('[data-help-key="roster_quick_add"]');
    act(() => { setValue(form.querySelector('input'), 'Reading support'); });
    act(() => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(host.querySelector('[role="alert"]').textContent).toContain('already have a group');
  });

  it('shows group pills and Edit groups once groups exist', () => {
    render({ rosterKey: { groups: { g1: { name: 'Reading support', color: '#4F46E5', profile: {} } } }, onQuickAddGroup: () => 'added' });
    expect(host.querySelector('[data-help-key="roster_manage_btn"]').textContent).toContain('Edit groups');
    expect(host.querySelector('[data-help-key="roster_quick_add"]')).toBeNull();
    expect(host.textContent).toContain('Reading support');
  });

  it('falls back to the roster button on an older host without quick add', () => {
    render({ rosterKey: null });
    expect(host.querySelector('[data-help-key="roster_quick_add"]')).toBeNull();
    expect(host.textContent).toContain('Set up groups');
  });
});

describe('Class & Materials host and panel contracts', () => {
  it('creates quick groups with the roster identity rules', () => {
    const at = anti.indexOf('const handleQuickAddRosterGroup = (name, grade, language) => {');
    expect(at).toBeGreaterThan(-1);
    const body = anti.slice(at, at + 1500);
    expect(body).toContain("alloStableIdentityId('GRP')");
    expect(body).toContain('alloNormalizeRosterIdentity(');
    expect(body).toContain("return 'duplicate'");
  });

  it('lets parents start from their child\'s reading, without the teacher wizard', () => {
    const parent = anti.slice(anti.indexOf("addToast(t('toasts.mode_parent_enabled'), \"success\");"), anti.indexOf("addToast(t('toasts.mode_parent_enabled'), \"success\");") + 400);
    expect(parent).toContain('setShowWizard(false);');
    expect(anti).toContain('data-help-key="family_start_card"');
    expect(anti).toContain('data-help-key="source_ready_card"');
  });

  it('points an empty materials list to Create and speaks to families', () => {
    expect(panelSource).toContain("t('history.go_to_create') || 'Go to Create'");
    expect(panelSource).toContain("t('history.panel_intro_family')");
    expect(panelSource).toContain('<FolderOpen size={16}/>');
    expect(anti).toContain("<HistoryPanel onGoToCreate={isTeacherMode ?");
  });

  it('never auto-opens the desktop AI modal, and keeps the phone tab usable in Guided Mode', () => {
    expect(anti).not.toContain('desktopAISetupPromptedRef');
    expect(anti).not.toContain('disabled={guidedMode}');
    expect(anti).toContain("display: (isTeacherMode && activeSidebarTab === 'history') ? 'none' : 'contents'");
  });
});
