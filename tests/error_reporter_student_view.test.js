// In student view the reporter stays out of the way and shows no captured text.
// The "⚠ N errors" badge distracted students, and the panel's log listed raw
// messages and stacks, up to 24 hours of them, so on a shared device a student
// could read an earlier user's logged text. Since 2026-10-29, when the host
// publishes window.__alloStudentView:
// - there is no error badge;
// - the panel is only the report form (description, problem type, the reviewed
//   technical-only report, Send): no log entries, toolbar or diagnostic tabs;
// - students can still send, and what they send stays technical facts only.
// Family mode is not student view: adults keep the full diagnostics.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = readFileSync(process.env.REPORTER_SOURCE || 'error_reporter_module.js', 'utf8');
const windows = [];
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const el = (w, id) => w.document.getElementById(id);
const PRIVATE = 'Saved the answer for Jordan Reyes: my grandmother lives on 12 Elm Street';

function boot({ studentView, teacher = false } = {}) {
  vi.useFakeTimers();
  const w = new JSDOM('<html><body></body></html>', { url: 'https://alloflow.example/app/', runScripts: 'outside-only', virtualConsole: new VirtualConsole() }).window;
  windows.push(w);
  w.setTimeout = globalThis.setTimeout;
  w.clearTimeout = globalThis.clearTimeout;
  w.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, id: 'receipt-1' }) }));
  if (teacher) w.__alloPendingCoachPosture = 'educator';
  if (studentView !== undefined) w.__alloStudentView = studentView;
  w.eval(source);
  return w;
}
const badgeShown = (w) => { const badge = el(w, 'allo-err-badge'); return !!badge && badge.style.display !== 'none'; };
const panel = (w) => el(w, 'allo-err-panel');

afterEach(() => {
  for (const w of windows.splice(0)) w.close();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('student view', () => {
  it('shows no error badge, even when errors are captured', () => {
    const w = boot({ studentView: true });
    w.console.error(PRIVATE);
    w.console.error('Second failure');
    expect(badgeShown(w)).toBe(false);
  });

  it('opens only the report form, with no captured text and no diagnostic tabs', () => {
    const w = boot({ studentView: true });
    w.console.error(PRIVATE, { stack: 'at saveAnswer (lesson.js:12)' });
    w.AlloModules.ErrorReporter.openPanel('errors');
    const dialog = panel(w);
    expect(dialog.getAttribute('aria-label')).toBe('Report a problem');
    expect(dialog.querySelector('[data-aer-student-report]')).not.toBeNull();
    expect(dialog.textContent).toContain('Report a problem');
    for (const id of ['aer-tab-errors', 'aer-tab-tts', 'aer-tab-session', 'aer-tab-search', 'aer-tab-compat', 'aer-filter', 'aer-clear', 'aer-copy', 'aer-warns']) {
      expect(el(w, id), id).toBeNull();
    }
    for (const leak of ['Jordan', 'grandmother', 'Elm Street', 'saveAnswer']) expect(dialog.textContent.includes(leak), leak).toBe(false);
    expect(el(w, 'aer-description')).not.toBeNull();
    expect(el(w, 'aer-category')).not.toBeNull();
    expect(dialog.textContent).toContain('Do not include names or other personal details');
  });

  it('keeps diagnostic deep links on the report form too', () => {
    const w = boot({ studentView: true });
    w.AlloModules.ErrorReporter.openReadAloudLog();
    expect(panel(w).querySelector('[data-aer-student-report]')).not.toBeNull();
    expect(el(w, 'aer-tab-tts')).toBeNull();
  });

  it('still lets a student send a report, carrying technical facts only', async () => {
    const w = boot({ studentView: true });
    w.console.error(PRIVATE);
    w.AlloModules.ErrorReporter.openPanel('errors');
    el(w, 'aer-description').value = 'The quiz froze when I pressed submit';
    el(w, 'aer-description').dispatchEvent(new w.Event('input', { bubbles: true }));
    for (let i = 0; i < 3 && !el(w, 'aer-review-confirm').checked; i++) el(w, 'aer-review-confirm').click();
    expect(el(w, 'aer-send').disabled).toBe(false);
    el(w, 'aer-send').click();
    await flush();
    const sent = w.fetch.mock.calls.at(-1)[1].body;
    expect(sent).toContain('The quiz froze when I pressed submit');
    for (const leak of ['Jordan', 'grandmother', 'Elm Street']) expect(sent.includes(leak), leak).toBe(false);
  });

  it('follows a switch between views without a reload', () => {
    const w = boot({ studentView: false, teacher: true });
    w.console.error('A failure');
    expect(badgeShown(w)).toBe(true);
    w.__alloStudentView = true;
    w.AlloModules.ErrorReporter.refreshView();
    expect(badgeShown(w)).toBe(false);
    w.__alloStudentView = false;
    w.AlloModules.ErrorReporter.refreshView();
    expect(badgeShown(w)).toBe(true);
  });

  it('switches an open diagnostics panel to the report form when the view changes', () => {
    const w = boot({ studentView: false, teacher: true });
    w.console.error(PRIVATE);
    w.AlloModules.ErrorReporter.openPanel('errors');
    expect(panel(w).textContent).toContain('Jordan');
    w.__alloStudentView = true;
    w.AlloModules.ErrorReporter.refreshView();
    expect(panel(w).querySelector('[data-aer-student-report]')).not.toBeNull();
    expect(panel(w).textContent.includes('Jordan')).toBe(false);
  });
});

describe('teacher and family views keep full diagnostics', () => {
  it('shows the badge and the captured log when the host says this is not student view', () => {
    const w = boot({ studentView: false, teacher: true });
    w.console.error('Visible failure for the teacher');
    expect(badgeShown(w)).toBe(true);
    w.AlloModules.ErrorReporter.openPanel('errors');
    expect(el(w, 'aer-tab-tts')).not.toBeNull();
    expect(panel(w).textContent).toContain('Visible failure for the teacher');
  });

  it('keeps the existing behavior when an older host never sets the flag', () => {
    const w = boot();
    w.console.error('Failure under an older host');
    expect(badgeShown(w)).toBe(true);
  });
});

describe('the host publishes the view', () => {
  const host = readFileSync('AlloFlowANTI.txt', 'utf8');
  it('marks student view and independent learners, not families, and refreshes the reporter', () => {
    expect(host).toContain('window.__alloStudentView = !isTeacherMode || isIndependentMode;');
    expect(host).toContain('try { window.AlloModules?.ErrorReporter?.refreshView?.(); } catch (_) {}');
    expect(host).toContain('}, [isTeacherMode, isIndependentMode]);');
  });
});

describe('the quiet way in: Student tools', () => {
  it('offers "Report a problem" to students only, closing the tools before the report opens', async () => {
    const { createRequire } = await import('node:module');
    const { resolve } = await import('node:path');
    const { loadAlloModule } = await import('./setup.js');
    const require = createRequire(import.meta.url);
    const React = require(resolve('desktop/web-app/node_modules/react'));
    const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
    globalThis.React = window.React = React;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    loadAlloModule(process.env.ALLO_FAB_CANDIDATE || 'view_fab_stack_module.js');
    const { FabStack } = window.AlloModules.FabStack;
    const openPanel = vi.fn();
    window.AlloModules.ErrorReporter = { openPanel };
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    const toggle = vi.fn();
    const mount = (isTeacherMode) => React.act(() => root.render(React.createElement(FabStack, {
      isTeacherMode, isFabExpanded: true, activeView: 'dashboard', studentProjectSettings: {}, interactionMode: 'read',
      t: (key) => (key === 'student_tools.report_problem' ? 'Something not working? Report a problem' : ''), handleToggleIsFabExpanded: toggle,
    })));
    try {
      mount(true);
      expect(host.querySelector('[data-student-report-problem]'), 'teachers use the badge').toBeNull();
      mount(false);
      const link = host.querySelector('[data-student-report-problem]');
      expect(link.textContent).toBe('Something not working? Report a problem');
      vi.useFakeTimers();
      React.act(() => link.click());
      expect(toggle, 'Student tools closes first').toHaveBeenCalledTimes(1);
      expect(openPanel).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(openPanel).toHaveBeenCalledWith('errors');
    } finally {
      vi.useRealTimers();
      React.act(() => root.unmount());
      host.remove();
      delete window.AlloModules.ErrorReporter;
    }
  });
});

describe('the log belongs to this browser tab, not the device', () => {
  // Boot with storage prepared first, the way a reload or the next user finds it.
  function bootWith(prepare) {
    vi.useFakeTimers();
    const w = new JSDOM('<html><body></body></html>', { url: 'https://alloflow.example/app/', runScripts: 'outside-only', virtualConsole: new VirtualConsole() }).window;
    windows.push(w);
    w.setTimeout = globalThis.setTimeout;
    w.clearTimeout = globalThis.clearTimeout;
    w.__alloPendingCoachPosture = 'educator';
    w.__alloStudentView = false;
    prepare(w);
    w.eval(source);
    return w;
  }
  const entry = (message) => ({ level: 'error', message, ts: new Date().toISOString(), load: 'earlier-load', count: 1 });

  it('keeps new entries in this tab only', () => {
    const w = bootWith(() => {});
    w.console.error('Captured in this tab');
    expect(w.sessionStorage.getItem('alloflow_error_log')).toContain('Captured in this tab');
    expect(w.localStorage.getItem('alloflow_error_log')).toBeNull();
  });

  it('brings back this tab\'s entries after a reload', () => {
    const w = bootWith((win) => win.sessionStorage.setItem('alloflow_error_log', JSON.stringify([entry('Before the reload')])));
    w.AlloModules.ErrorReporter.openPanel('errors');
    expect(panel(w).textContent).toContain('Before the reload');
    expect(panel(w).textContent).toContain('earlier page load');
  });

  it('deletes a device-wide log left by an earlier user and never shows it', () => {
    const w = bootWith((win) => win.localStorage.setItem('alloflow_error_log', JSON.stringify([entry('Earlier user: Jordan Reyes answer')])));
    expect(w.localStorage.getItem('alloflow_error_log'), 'the old device-wide copy is removed').toBeNull();
    w.AlloModules.ErrorReporter.openPanel('errors');
    expect(panel(w).textContent.includes('Jordan')).toBe(false);
  });

  it('still works, in memory, when this browser blocks tab storage', () => {
    const w = bootWith((win) => Object.defineProperty(win, 'sessionStorage', { get() { throw new Error('blocked'); } }));
    w.console.error('Kept in memory');
    w.AlloModules.ErrorReporter.openPanel('errors');
    expect(panel(w).textContent).toContain('Kept in memory');
    expect(w.localStorage.getItem('alloflow_error_log')).toBeNull();
  });
});
