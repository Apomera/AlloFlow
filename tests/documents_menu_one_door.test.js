// 2026-11-23 (docs/ui_complexity_review_2026-11-23.md M1 + M14): a finished resource's bar opens the
// header's one Documents menu, and that menu now also renders while the header is compact (before,
// it lived inside the expanded header only, so the command palette's "Open the export menu" did
// nothing in the default compact bar). The menu's first view is Document Builder, Homework QR with
// its link length, and "Polls, sign-ups & shared links"; the other formats sit under one disclosure.
// ALLO_HEADER_CANDIDATE / ALLO_ANTI_CANDIDATE point at other copies for the fail-first check.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
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
const PARENT = { isTeacherMode: true, isIndependentMode: false, isParentMode: true };
const INDEPENDENT = { isTeacherMode: true, isIndependentMode: true, isParentMode: false };
const STUDENT = { isTeacherMode: false, isIndependentMode: false, isParentMode: false };

function HeaderHost({ props }) { return HeaderBar(props); }
function mount(role, extra = {}, { collapsed = true, activeView = 'simplified' } = {}) {
  localStorage.setItem('allo_header_collapsed', collapsed ? 'true' : 'false');
  const Blank = () => null;
  const build = (more) => new Proxy({ t: key => key, APP_CONFIG: {}, isStudentLinkMode: false, history: [], pptxLoaded: true, ...extra, ...more }, { get: (o, k) => k in o ? o[k] : typeof k !== 'string' ? undefined : /^[A-Z][a-z]/.test(k) ? Blank : /^(set|handle|on|toggle|open|close|start|join|dismiss|create)/.test(k) ? () => {} : undefined });
  // One stable component type, as in the app (<HeaderBar/>), so a re-render does not remount it.
  const Shell = ({ props }) => React.createElement(window.AlloActiveViewContext.Provider, { value: { activeView } },
    React.createElement(window.AlloRoleContext.Provider, { value: role }, React.createElement(HeaderHost, { props })));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Shell, { props: build({}) })));
  return (more) => act(() => root.render(React.createElement(Shell, { props: build(more) })));
}
const dialog = () => host.querySelector('[aria-labelledby="header-documents-dialog-title"]');
const row = (key) => dialog().querySelector(`[data-help-key="${key}"]`);
const more = () => dialog().querySelector('[data-documents-more-formats]');
const FORMAT_ROWS = ['export_worksheet', 'export_html', 'export_slides'];

describe('one Documents menu, opened from any trigger', () => {
  it('renders in the compact header (the default), not only in the expanded one', () => {
    mount(TEACHER, { showExportMenu: true }, { collapsed: true });
    expect(dialog(), 'compact header').not.toBeNull();
    act(() => root.unmount()); root = null; host.remove();
    mount(TEACHER, { showExportMenu: true }, { collapsed: false });
    expect(dialog(), 'expanded header').not.toBeNull();
    expect(host.querySelectorAll('[aria-labelledby="header-documents-dialog-title"]')).toHaveLength(1);
  });

  it('is closed until asked for, and never shows for a student', () => {
    mount(TEACHER, { showExportMenu: false });
    expect(dialog()).toBeNull();
    act(() => root.unmount()); root = null; host.remove();
    mount(STUDENT, { showExportMenu: true });
    expect(dialog(), 'students do not gain export').toBeNull();
  });
});

describe('first view and the one disclosure', () => {
  it('first view: Document Builder, Homework QR with its link length, and shared links', () => {
    const openExportPreview = vi.fn();
    mount(TEACHER, { showExportMenu: true, openExportPreview });
    expect(row('export_pdf')).not.toBeNull();
    expect(row('homework_qr')).not.toBeNull();
    expect(dialog().querySelector('#homework-qr-expiry')).not.toBeNull();
    expect(dialog().textContent).toContain('export_menu.shared_links');
    for (const key of [...FORMAT_ROWS, 'export_qti', 'export_ims']) expect(row(key), key).toBeNull();
    expect(more().tagName).toBe('BUTTON');
    expect(more().getAttribute('type')).toBe('button');
    expect(more().getAttribute('aria-expanded')).toBe('false');
    expect(more().textContent).toContain('export_preview.additional_export_formats');
    act(() => row('export_pdf').click());
    expect(openExportPreview).toHaveBeenCalledWith('print');
  });

  it('the disclosure holds Worksheet, HTML, Slides and IMS with their old handlers; QTI only in quiz view', () => {
    const openExportPreview = vi.fn(), handleExportIMS = vi.fn(), handleExportQTI = vi.fn(), setShowExportMenu = vi.fn();
    mount(TEACHER, { showExportMenu: true, openExportPreview, handleExportIMS, handleExportQTI, setShowExportMenu });
    act(() => more().click());
    expect(more().getAttribute('aria-expanded')).toBe('true');
    for (const key of [...FORMAT_ROWS, 'export_ims']) expect(row(key), key).not.toBeNull();
    expect(row('export_qti'), 'QTI stays quiz-only').toBeNull();
    act(() => row('export_worksheet').click());
    act(() => row('export_html').click());
    act(() => row('export_slides').click());
    expect(openExportPreview.mock.calls.map(c => c[0])).toEqual(['worksheet', 'html', 'slides']);
    act(() => row('export_ims').click());
    expect(handleExportIMS).toHaveBeenCalledTimes(1);
    expect(setShowExportMenu).toHaveBeenCalledWith(false);
    act(() => more().click());
    expect(more().getAttribute('aria-expanded')).toBe('false');
    for (const key of [...FORMAT_ROWS, 'export_ims']) expect(row(key), key).toBeNull();
    act(() => root.unmount()); root = null; host.remove();
    mount(TEACHER, { showExportMenu: true, handleExportQTI }, { activeView: 'quiz' });
    expect(row('export_qti')).toBeNull();
    act(() => more().click());
    act(() => row('export_qti').click());
    expect(handleExportQTI).toHaveBeenCalledTimes(1);
  });

  it('keeps the role gates: families get no LMS rows, independent learners no QR and no LMS rows', () => {
    mount(PARENT, { showExportMenu: true }, { activeView: 'quiz' });
    expect(row('homework_qr')).not.toBeNull();
    act(() => more().click());
    for (const key of FORMAT_ROWS) expect(row(key), key).not.toBeNull();
    expect(row('export_qti')).toBeNull(); expect(row('export_ims')).toBeNull();
    act(() => root.unmount()); root = null; host.remove();
    mount(INDEPENDENT, { showExportMenu: true }, { activeView: 'quiz' });
    expect(row('homework_qr')).toBeNull();
    expect(dialog().querySelector('#homework-qr-expiry')).toBeNull();
    // fix2: only three more rows for an independent learner, so no fold: they show directly.
    expect(more(), 'no disclosure for independent learners').toBeNull();
    for (const key of FORMAT_ROWS) expect(row(key), key).not.toBeNull();
    expect(row('export_qti')).toBeNull(); expect(row('export_ims')).toBeNull();
  });

  it('independent learners see Worksheet, HTML and Slides directly with their handlers; other roles keep the fold', () => {
    const openExportPreview = vi.fn();
    mount(INDEPENDENT, { showExportMenu: true, openExportPreview });
    expect(more()).toBeNull();
    const order = Array.from(dialog().querySelectorAll('[data-help-key]')).map(n => n.getAttribute('data-help-key'));
    expect(order).toEqual(['export_pdf', ...FORMAT_ROWS]);
    for (const key of FORMAT_ROWS) act(() => row(key).click());
    expect(openExportPreview.mock.calls.map(c => c[0])).toEqual(['worksheet', 'html', 'slides']);
    for (const role of [TEACHER, PARENT]) {
      act(() => root.unmount()); root = null; host.remove();
      mount(role, { showExportMenu: true });
      expect(more(), 'fold kept').not.toBeNull();
      for (const key of FORMAT_ROWS) expect(row(key), key).toBeNull();
    }
  });

  it('opens on the short first view again after the menu closes', () => {
    const rerender = mount(TEACHER, { showExportMenu: true });
    act(() => more().click());
    expect(row('export_worksheet')).not.toBeNull();
    rerender({ showExportMenu: false });
    expect(dialog()).toBeNull();
    rerender({ showExportMenu: true });
    expect(more().getAttribute('aria-expanded')).toBe('false');
    expect(row('export_worksheet')).toBeNull();
  });

  it('uses a registered key for the disclosure label and keeps the focus trap with Escape on the dialog', () => {
    const strings = readFileSync('ui_strings.js', 'utf8');
    expect(strings).toContain('"additional_export_formats": "Additional export formats"');
    const src = readFileSync('view_header_source.jsx', 'utf8');
    expect(src).toMatch(/_headerUseFocusTrap\(_exportDialogRef,\s*showExportMenu,\s*handleSetShowExportMenuToFalse\)/);
    expect(src.split('{isTeacherMode && showExportMenu && _headerPortal(').length - 1).toBe(1);
    const portalAt = src.indexOf('{isTeacherMode && showExportMenu && _headerPortal(');
    const denseAt = src.indexOf('{!headerCollapsed && (\n            <div className="flex flex-col items-stretch');
    expect(denseAt).toBeGreaterThan(0);
    expect(portalAt, 'outside the expanded-only surface').toBeLessThan(denseAt);
  });
});

// fix2: opened from the command palette, the focus trap's restore target (the palette input) is
// gone when Documents closes, so focus fell to <body>. The header now moves it to the Documents
// trigger (expanded header), else the compact "Settings & more" toggle, else the compact Help "?".
describe('focus after Documents closes with nowhere to return to', () => {
  const settingsToggle = () => Array.from(host.querySelectorAll('[data-help-key="header_settings_toggle"]')).find(b => b.textContent.includes('header.more_settings'));
  const docsTrigger = () => host.querySelector('[data-help-key="header_export"]');
  const closeFromInside = (rerender) => {
    act(() => row('export_pdf').focus());
    expect(document.activeElement).toBe(row('export_pdf'));
    rerender({ showExportMenu: false });
    expect(dialog()).toBeNull();
  };
  it('compact header: lands on "Settings & more"', () => {
    const rerender = mount(TEACHER, { showExportMenu: true }, { collapsed: true });
    expect(settingsToggle(), 'compact Settings & more').toBeTruthy();
    closeFromInside(rerender);
    expect(document.activeElement).toBe(settingsToggle());
  });
  it('expanded header: lands on the header Documents trigger', () => {
    const rerender = mount(TEACHER, { showExportMenu: true }, { collapsed: false });
    expect(docsTrigger()).toBeTruthy();
    closeFromInside(rerender);
    expect(document.activeElement).toBe(docsTrigger());
  });
  it('compact header without "Settings & more" in reach: lands on the compact Help "?"', () => {
    const rerender = mount(TEACHER, { showExportMenu: true }, { collapsed: true });
    const help = host.querySelector('[data-compact-help-toggle]');
    expect(help, 'compact Help ?').toBeTruthy();
    settingsToggle().setAttribute('hidden', '');
    closeFromInside(rerender);
    expect(document.activeElement).toBe(help);
  });
  it('leaves focus alone when it was restored to a live element (the button-opened path)', () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('data-output-documents-toggle', '');
    document.body.append(trigger);
    try {
      const rerender = mount(TEACHER, { showExportMenu: false }, { collapsed: true });
      act(() => trigger.focus());
      rerender({ showExportMenu: true });
      act(() => trigger.focus()); // the trap restores focus to the button that opened it
      rerender({ showExportMenu: false });
      expect(document.activeElement).toBe(trigger);
    } finally { trigger.remove(); }
  });
  // Browser check 11-23: opened from the palette with the header expanded, focus sat on an
  // unrelated header button while the sheet was open and stayed there after Escape.
  it('palette path, expanded header: focus moves into the sheet, and on close to the Documents trigger', async () => {
    const rerender = mount(TEACHER, { showExportMenu: false }, { collapsed: false });
    const unrelated = Array.from(host.querySelectorAll('button')).find((b) => b !== docsTrigger() && !b.closest('[hidden]'));
    expect(unrelated, 'an unrelated header button').toBeTruthy();
    act(() => unrelated.focus());
    rerender({ showExportMenu: true });
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
    expect(dialog().contains(document.activeElement), 'focus pulled into the sheet').toBe(true);
    act(() => unrelated.focus()); // what the trap's restore does on Escape
    rerender({ showExportMenu: false });
    expect(document.activeElement).toBe(docsTrigger());
  });
  it('palette path: a row that opened another dialog keeps its focus', () => {
    const rerender = mount(TEACHER, { showExportMenu: false }, { collapsed: true });
    rerender({ showExportMenu: true });
    const other = document.createElement('div');
    other.setAttribute('role', 'dialog');
    const field = document.createElement('input');
    other.append(field);
    document.body.append(other);
    try {
      act(() => field.focus());
      rerender({ showExportMenu: false });
      expect(document.activeElement).toBe(field);
    } finally { other.remove(); }
  });
  it('does nothing on first render with the menu closed', () => {
    const outside = document.createElement('input');
    document.body.append(outside);
    try {
      outside.focus(); outside.remove();
      mount(TEACHER, { showExportMenu: false }, { collapsed: true });
      expect(document.activeElement === document.body || document.activeElement === null).toBe(true);
    } finally { outside.remove(); }
  });
});

describe('the finished-resource bar has a Documents button', () => {
  const anti = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
  it('sits beside Maximize, for the roles that have the menu, and opens the same menu', () => {
    expect(anti.split('data-output-documents-toggle').length - 1).toBe(1);
    const at = anti.indexOf('data-output-documents-toggle');
    const line = anti.slice(anti.lastIndexOf('\n', at), anti.indexOf('</button>', at));
    const gate = anti.slice(anti.lastIndexOf('{', anti.lastIndexOf('\n', at) - 1), at);
    expect(gate).toContain('{isTeacherMode && generatedContent && (');
    expect(line).toContain('onClick={handleToggleShowExportMenu}');
    expect(line).toContain('aria-haspopup="dialog"');
    expect(line).toContain('aria-expanded={!!showExportMenu}');
    expect(line).toContain("aria-label={t('header.documents_menu_aria') || 'Documents menu'}");
    expect(line).toContain('<FileText size={18} aria-hidden="true" />');
    expect(line).toContain(`<span className="hidden lg:inline">{t('header.nav_documents') || 'Documents'}</span>`);
    expect(at).toBeGreaterThan(anti.indexOf('data-annotate-toggle'));
    const maximize = anti.indexOf("t('common.maximize_view')", at);
    expect(maximize - at, 'right before Maximize').toBeLessThan(1200);
  });
});
