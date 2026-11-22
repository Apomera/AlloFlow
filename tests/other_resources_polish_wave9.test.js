import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let axe;
let MeetingDocsPanel;
let DisproAnalyzerPanel;
let ProjectSettingsView;
let SeatingChart;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function setInputValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });

  delete window.AlloModules.MeetingDocs;
  new Function(readFileSync(resolve(process.cwd(), 'meeting_docs_module.js'), 'utf8'))();
  MeetingDocsPanel = window.AlloModules.MeetingDocs.MeetingDocsPanel;

  delete window.AlloModules.DisproAnalyzer;
  new Function(readFileSync(resolve(process.cwd(), 'dispro_analyzer_module.js'), 'utf8'))();
  DisproAnalyzerPanel = window.AlloModules.DisproAnalyzer.DisproAnalyzerPanel;

  loadAlloModule('view_project_settings_module.js');
  ProjectSettingsView = window.AlloModules.ProjectSettingsView;

  delete window.AlloModules.SeatingChart;
  loadAlloModule('seating_chart_module.js');
  SeatingChart = window.AlloModules.SeatingChart;
});

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
  localStorage.clear();
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

describe('Wave 9 polish: Meeting Docs, Disproportionality Analyzer, Project Settings, Seating Chart', () => {
  it('MeetingDocsPanel shows notes word/mask meta, copies saved meeting summary, and filters action items + saved meetings', async () => {
    const copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((txt) => { copied.push(txt); return Promise.resolve(); }) },
    });
    localStorage.setItem('allo_meetdocs_meetings_v1', JSON.stringify([
      {
        id: 'm1', title: 'SST — Reading Support', date: '2026-08-01', templateId: 'sst', templateName: 'Student Support Team (SST)',
        savedAt: 1, aiUsed: true, sections: { attendees: 'AP, Reading Specialist' },
        decisions: [{ id: 'd1', text: 'Start Tier 2 decoding', verified: true }],
        actionItems: [
          { id: 'a1', text: 'Send family letter', owner: 'AP', due: '2020-01-01', done: false, verified: true },
          { id: 'a2', text: 'Collect fluency probe', owner: 'JB', due: '2099-01-01', done: false, verified: true },
          { id: 'a3', text: 'Log baseline score', owner: 'AP', due: '2026-07-01', done: true, verified: true },
          { id: 'a4', text: 'Check hearing screen', owner: 'RN', due: '2099-02-01', done: false, verified: true },
        ],
      },
      { id: 'm2', title: 'IEP Annual — Math', date: '2026-08-02', templateId: 'iep', templateName: 'IEP', savedAt: 2, sections: {}, decisions: [], actionItems: [] },
      { id: 'm3', title: '504 Review — Science', date: '2026-08-03', templateId: '504', templateName: '504', savedAt: 3, sections: {}, decisions: [], actionItems: [] },
      { id: 'm4', title: 'Grade 4 Team Sync', date: '2026-08-04', templateId: 'sst', templateName: 'SST', savedAt: 4, sections: {}, decisions: [], actionItems: [] },
    ]));

    const host = mountEl(React.createElement(MeetingDocsPanel, {
      onClose: vi.fn(),
      t: null,
      addToast: vi.fn(),
      callGemini: null,
    }));

    // Pick template -> notes meta shows live word count
    const sstBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Student Support Team (SST)'));
    await act(async () => { sstBtn.click(); });
    setInputValue(host.querySelector('#meetdocs-raw'), 'Team reviewed phonics check and agreed on Tier 2.');
    expect(host.querySelector('[data-meetdocs-notes-meta="true"]').textContent).toContain('9 words');

    // Meetings tab -> search appears at 4 meetings, open meeting and copy summary
    await act(async () => { host.querySelector('#meetdocs-tab-meetings').click(); });
    const search = host.querySelector('#meetdocs-meetings-search');
    expect(search).toBeTruthy();
    setInputValue(search, 'Reading Support');
    expect(host.textContent).toContain('SST — Reading Support');
    expect(host.textContent).not.toContain('Grade 4 Team Sync');
    const openBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('SST — Reading Support'));
    await act(async () => { openBtn.click(); });
    const copyBtn = host.querySelector('[data-meetdocs-copy-summary="true"]');
    await act(async () => { copyBtn.click(); await Promise.resolve(); });
    expect(copied[0]).toContain('SST — Reading Support');
    expect(copied[0]).toContain('Start Tier 2 decoding');
    expect(copyBtn.textContent).toContain('Copied');

    // Action items tab -> filter pills isolate Overdue and search isolates owner RN
    await act(async () => { host.querySelector('#meetdocs-tab-actions').click(); });
    await act(async () => { host.querySelector('[data-meetdocs-action-filter="overdue"]').click(); });
    expect(host.textContent).toContain('Send family letter');
    expect(host.textContent).not.toContain('Log baseline score');

    await act(async () => { host.querySelector('[data-meetdocs-action-filter="all"]').click(); });
    setInputValue(host.querySelector('#meetdocs-actions-search'), 'RN');
    expect(host.textContent).toContain('Check hearing screen');
    expect(host.textContent).not.toContain('Send family letter');
  });

  it('DisproAnalyzerPanel loads sample counts, shows descriptive highlights, copies summary with 34 CFR note, and filters saved analyses', async () => {
    const copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((txt) => { copied.push(txt); return Promise.resolve(); }) },
    });
    localStorage.setItem('allo_dispro_analyses_v1', JSON.stringify([
      { id: 'd1', title: 'Fall ODRs', outcomeLabel: 'Office discipline referrals', date: '2026-09-01', groups: [{ name: 'A', enrollment: 100, students: 10 }, { name: 'B', enrollment: 900, students: 30 }] },
      { id: 'd2', title: 'Winter ISS', outcomeLabel: 'In-school suspensions', date: '2026-12-01', groups: [{ name: 'A', enrollment: 100, students: 8 }, { name: 'B', enrollment: 900, students: 25 }] },
      { id: 'd3', title: 'Spring OSS', outcomeLabel: 'Out-of-school suspensions', date: '2027-03-01', groups: [{ name: 'A', enrollment: 100, students: 6 }, { name: 'B', enrollment: 900, students: 20 }] },
      { id: 'd4', title: 'AP Enrollment', outcomeLabel: 'Advanced coursework', date: '2027-04-01', groups: [{ name: 'A', enrollment: 100, students: 5 }, { name: 'B', enrollment: 900, students: 90 }] },
    ]));

    const host = mountEl(React.createElement(DisproAnalyzerPanel, {
      onClose: vi.fn(),
      t: null,
      addToast: vi.fn(),
    }));

    // Blank draft shows Load example button; clicking populates sample and renders highlights
    const sampleBtn = host.querySelector('[data-dispro-load-sample="true"]');
    expect(sampleBtn).toBeTruthy();
    await act(async () => { sampleBtn.click(); });
    const hl = host.querySelector('[data-dispro-highlights="true"]');
    expect(hl.textContent).toContain('1,000');
    expect(hl.textContent).toContain('All cells meet floor');

    // Copy summary preserves 34 CFR descriptive note
    const copyBtn = host.querySelector('[data-dispro-copy-summary="draft"]');
    await act(async () => { copyBtn.click(); await Promise.resolve(); });
    expect(copied[0]).toContain('Students with IEPs');
    expect(copied[0]).toContain('34 CFR 300.647');
    expect(copyBtn.textContent).toContain('Copied');

    // Saved tab search appears at 4 analyses
    await act(async () => { host.querySelector('#dispro-tab-saved').click(); });
    const search = host.querySelector('#dispro-saved-search');
    expect(search).toBeTruthy();
    setInputValue(search, 'AP Enrollment');
    expect(host.textContent).toContain('AP Enrollment');
    expect(host.textContent).not.toContain('Fall ODRs');
  });

  it('ProjectSettingsView renders live posture summary and collapsed advanced badge while staying hook-free and axe-clean', async () => {
    const settings = {
      hideStudentAiFeatures: true,
      allowDictation: true,
      allowSocraticTutor: false,
      allowFreeResponse: true,
      allowPersonaFreeResponse: true,
      workStoryEnabled: true,
      socraticCustomInstructions: 'Ask guiding questions only.',
      adventureUnlockXP: 200,
      adventurePermissions: {
        allowDifficultySwitch: false,
        allowModeSwitch: false,
        allowCustomInstructions: false,
        allowLanguageSwitch: false,
        allowVisualsToggle: false,
        lockAllSettings: true,
      },
    };
    const baseProps = {
      t: (k) => k,
      studentProjectSettings: settings,
      setStudentProjectSettings: vi.fn(),
      isTeacherMode: true,
      isParentMode: false,
      isIndependentMode: false,
      handleSetIsProjectSettingsOpenToFalse: vi.fn(),
    };

    // Still safe as a direct hook-free function call
    expect(() => ProjectSettingsView(baseProps)).not.toThrow();

    const host = mountEl(React.createElement(ProjectSettingsView, baseProps));
    const summary = host.querySelector('[data-project-settings-summary="true"]');
    expect(summary.textContent).toContain('Custom');
    expect(summary.textContent).toContain('Student AI hidden');
    expect(summary.textContent).toContain('3/4 supports on');
    expect(summary.textContent).toContain('Adventure locked');
    expect(summary.textContent).toContain('Work Story ON');

    const advBadge = host.querySelector('[data-project-settings-advanced-badge="true"]');
    expect(advBadge.textContent).toContain('Locked');
    expect(advBadge.textContent).toContain('Tutor notes set');
    expect(advBadge.textContent).toContain('XP milestones set');

    const axeRes = await axe.run(host.querySelector('[role="dialog"]'), {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(axeRes.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  it('SeatingChartPanel shows occupancy bar, unseated + list student filters, and one-click Cancel placement banner', async () => {
    const names = ['Ada', 'Ben', 'Cam', 'Dev', 'Eva', 'Fay', 'Gus'];
    const template = SeatingChart._testing.buildTemplate('rows', 8);
    const layout = {
      id: 'l1',
      name: 'Room 101',
      seats: template.seats,
      furniture: template.furniture,
      assignments: { [template.seats[0].id]: 'Ada' },
    };
    const students = {};
    names.forEach((n) => { students[n] = 'g1'; });
    const rosterKey = {
      className: 'Grade 5',
      students,
      groups: { g1: { name: 'Blue', color: '#4f46e5' } },
      seating: { version: 1, activeLayoutId: 'l1', solveSeed: 1, layouts: { l1: layout }, constraints: [] },
    };

    const host = mountEl(React.createElement(SeatingChart.SeatingChartPanel, {
      isOpen: true,
      onClose: vi.fn(),
      rosterKey,
      setRosterKey: vi.fn(),
      t: (k) => (k === 'common.close' ? 'Close' : k === 'common.cancel' ? 'Cancel' : k),
      addToast: vi.fn(),
    }));

    // Occupancy bar shows 1/7 seated · 7 open
    const occ = host.querySelector('[data-seating-occupancy="true"]');
    expect(occ.textContent).toContain('1/7 seated');
    expect(occ.textContent).toContain('7 open');

    // Unseated tray search appears at 6 unseated students
    const traySearch = host.querySelector('#seating-unseated-search');
    expect(traySearch).toBeTruthy();
    setInputValue(traySearch, 'Gus');
    const gusChip = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Gus');
    expect(gusChip).toBeTruthy();

    // Selecting Gus shows placement banner with Cancel button
    await act(async () => { gusChip.click(); });
    expect(host.querySelector('[data-seating-placing-banner="true"]').textContent).toContain('Gus');
    await act(async () => { host.querySelector('[data-seating-cancel-select="true"]').click(); });
    expect(host.querySelector('[data-seating-placing-banner="true"]')).toBeNull();

    // Switch to List view -> list search filters seats
    const listBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'List');
    await act(async () => { listBtn.click(); });
    const listSearch = host.querySelector('#seating-list-search');
    expect(listSearch).toBeTruthy();
    setInputValue(listSearch, 'Ada');
    expect(host.querySelectorAll('tbody tr').length).toBe(1);
    expect(host.querySelector('tbody').textContent).toContain('Seat 1');
  });
});
