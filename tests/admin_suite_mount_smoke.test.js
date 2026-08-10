// Leadership Hub suite — REAL-REACT mount smoke.
//
// SSR stubs and pure-seam tests can't catch hook-order bugs, effect
// crashes, or a tab that dies only when clicked. This suite mounts all
// four admin panels with the REAL React 18 from desktop/web-app/
// node_modules (createRoot + act), pre-seeds localStorage with realistic
// data, and CLICKS through every tab and key drill-down, asserting the
// render survives and shows the expected content. This is the closest
// thing to a browser run that lives in the repo.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let Mods;
const roots = [];

function loadModule(file) {
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
}

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.AdminHub;
  delete window.AlloModules.UdlWalkthrough;
  delete window.AlloModules.DisproAnalyzer;
  delete window.AlloModules.MeetingDocs;
  delete window.AlloModules.SpedTimelines;
  delete window.AlloModules.FamilyAnnouncements;
  delete window.AlloModules.MtssTriage;
  loadModule('admin_hub_module.js');
  loadModule('udl_walkthrough_module.js');
  loadModule('dispro_analyzer_module.js');
  loadModule('meeting_docs_module.js');
  loadModule('sped_timelines_module.js');
  loadModule('family_announcements_module.js');
  loadModule('mtss_triage_module.js');
  Mods = window.AlloModules;
  for (const k of ['AdminHub', 'UdlWalkthrough', 'DisproAnalyzer', 'MeetingDocs', 'SpedTimelines', 'FamilyAnnouncements', 'MtssTriage']) {
    if (!Mods[k]) throw new Error(k + ' did not register');
  }
});

afterEach(() => {
  while (roots.length) {
    const { root, container } = roots.pop();
    act(() => { root.unmount(); });
    container.remove();
  }
  localStorage.clear();
});

function mount(Component, props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => { root.render(React.createElement(Component, props)); });
  roots.push({ root, container });
  return container;
}

function clickText(container, text) {
  const btn = Array.from(container.querySelectorAll('button')).find((b) => (b.textContent || '').includes(text));
  if (!btn) throw new Error('No button containing "' + text + '". Buttons: ' + Array.from(container.querySelectorAll('button')).map((b) => b.textContent.trim().slice(0, 30)).join(' | '));
  act(() => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
}

const baseProps = () => ({ isOpen: true, onClose: () => {}, t: null, addToast: () => {} });

describe('AdminHubPanel', () => {
  it('renders the covenant and routes every tool card through openTool', () => {
    const opened = [];
    const c = mount(Mods.AdminHub.AdminHubPanel, { ...baseProps(), openTool: (id) => opened.push(id) });
    expect(c.textContent).toContain('Leadership Hub');
    expect(c.textContent).toContain('never an automated verdict');
    clickText(c, 'MTSS Triage');
    clickText(c, 'Family Announcements');
    clickText(c, 'UDL Walkthrough');
    clickText(c, 'Disproportionality Analyzer');
    clickText(c, 'SpEd Timelines');
    clickText(c, 'Diagnosis, Evaluation & School Eligibility');
    clickText(c, 'Meeting Documentation');
    expect(opened).toEqual(['mtss', 'announcements', 'walkthrough', 'dispro', 'timelines', 'diagnosisEligibility', 'meetings']);
  });
});

describe('UdlWalkthroughPanel', () => {
  const seed = () => {
    localStorage.setItem('allo_udlwalk_roster_v1', JSON.stringify([
      { id: 't1', code: 'T-01', name: 'Ada Teacher', grade: '3', subject: 'ELA' },
      { id: 't2', code: 'T-02', name: '', grade: '5', subject: '' },
    ]));
    localStorage.setItem('allo_udlwalk_sessions_v1', JSON.stringify([
      { id: 's1', teacherId: 't1', date: '2026-07-10', startedAt: 1, durationMin: 8,
        context: { grouping: 'whole', lessonPhase: 'instruction' },
        evidence: { eng_7_1: { rating: 'observed' }, rep_1_1: { rating: 'not', note: 'single modality' }, act_4_1: { rating: 'no_opp' } },
        studentIndicators: [{ id: 'stu_1', at: 2 }], summaryNote: 'note', frameworkVersion: 'udl-3.0',
        observer: { initials: 'AP', role: 'specialist' }, sharedWithTeacher: false },
      { id: 's2', teacherId: 't2', date: '2026-08-01', startedAt: 1, durationMin: 6,
        context: { grouping: 'small', lessonPhase: 'practice' },
        evidence: { eng_7_1: { rating: 'partial' }, rep_2_1: { rating: 'observed' } },
        studentIndicators: [], summaryNote: '', frameworkVersion: 'udl-3.0',
        observer: { initials: 'JB', role: 'coach' }, sharedWithTeacher: true },
    ]));
  };

  it('clicks through Observe, Visits (drill to feedback card), Building, Setup', () => {
    seed();
    const c = mount(Mods.UdlWalkthrough.UdlWalkthroughPanel, baseProps());
    expect(c.textContent).toContain('UDL Walkthrough');
    expect(c.textContent).toContain('Ada Teacher'); // observe picker
    clickText(c, 'Visits');
    expect(c.textContent).toContain('obs. AP');
    clickText(c, 'Ada Teacher'); // open the visit
    expect(c.textContent).toContain('Strengths observed');
    expect(c.textContent).toContain('One thing to consider');
    clickText(c, 'Building');
    expect(c.textContent).toContain('Share of ratings marked');
    expect(c.textContent).toContain('Coverage');
    // Sessions span Jul+Aug -> the real trend chart renders, not the hint.
    expect(c.textContent).toContain('Trend by principle');
    expect(c.querySelector('svg')).toBeTruthy();
    clickText(c, 'Roster & setup');
    expect(c.textContent).toContain('Your initials');
    expect(c.textContent).toContain('Export data (JSON)');
  });

  it('starts and rates a live observation without crashing', () => {
    seed();
    const c = mount(Mods.UdlWalkthrough.UdlWalkthroughPanel, baseProps());
    clickText(c, 'Ada Teacher'); // start draft
    expect(c.textContent).toContain('min elapsed');
    // First look-for card's rating button: cycle it twice (observed -> partial).
    const rateBtn = c.querySelector('button[aria-label*="Activate to cycle"]');
    expect(rateBtn).toBeTruthy();
    act(() => { rateBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    act(() => { rateBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(c.textContent).toContain('1/27');
    clickText(c, 'Student moment');
    clickText(c, 'Used a support unprompted');
    clickText(c, 'Save visit');
    expect(c.textContent).toContain('Strengths observed'); // landed on the new feedback card
    const saved = JSON.parse(localStorage.getItem('allo_udlwalk_sessions_v1'));
    expect(saved.length).toBe(3);
    expect(saved[0].studentIndicators.length).toBe(1);
  });
});

describe('ARIA tabs keyboard contract', () => {
  const pressKey = (el, key) => {
    act(() => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
  };

  it('arrow keys move selection AND focus with a roving tabindex (walkthrough)', () => {
    const c = mount(Mods.UdlWalkthrough.UdlWalkthroughPanel, baseProps());
    const tabsEl = () => Array.from(c.querySelectorAll('[role="tab"]'));
    expect(tabsEl().length).toBe(4);
    // Roving tabindex: exactly one tab is focusable.
    expect(tabsEl().filter((b) => b.tabIndex === 0).length).toBe(1);
    const first = tabsEl()[0];
    pressKey(first, 'ArrowRight');
    expect(c.querySelector('#udlwalk-tab-sessions').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement.id).toBe('udlwalk-tab-sessions');
    pressKey(document.activeElement, 'End');
    expect(c.querySelector('#udlwalk-tab-setup').getAttribute('aria-selected')).toBe('true');
    pressKey(document.activeElement, 'ArrowRight'); // wraps
    expect(c.querySelector('#udlwalk-tab-observe').getAttribute('aria-selected')).toBe('true');
    // The visible panel is a labeled tabpanel.
    const panel = c.querySelector('[role="tabpanel"]');
    expect(panel.getAttribute('aria-labelledby')).toBe('udlwalk-tab-observe');
  });

  it('the same contract holds in dispro and meetdocs', () => {
    for (const [Comp, prefix] of [
      [Mods.DisproAnalyzer.DisproAnalyzerPanel, 'dispro'],
      [Mods.MeetingDocs.MeetingDocsPanel, 'meetdocs'],
    ]) {
      const c = mount(Comp, baseProps());
      const first = c.querySelector('[role="tab"]');
      pressKey(first, 'ArrowLeft'); // wraps backward to the last tab
      const selected = Array.from(c.querySelectorAll('[role="tab"]')).find((b) => b.getAttribute('aria-selected') === 'true');
      expect(selected.id.startsWith(prefix + '-tab-')).toBe(true);
      expect(selected).toBe(c.querySelectorAll('[role="tab"]')[c.querySelectorAll('[role="tab"]').length - 1]);
      expect(c.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(selected.id);
    }
  });
});

describe('DisproAnalyzerPanel', () => {
  const seed = () => {
    const groups = [
      { name: 'Students with IEPs', enrollment: 120, students: 18 },
      { name: 'All other students', enrollment: 880, students: 44 },
    ];
    localStorage.setItem('allo_dispro_draft_v1', JSON.stringify({
      title: '', outcomeLabel: 'ODRs', date: '2026-08-03',
      groups: groups.map((g) => ({ name: g.name, enrollment: String(g.enrollment), students: String(g.students) })),
      altComparison: { label: 'Statewide', enrollment: '100000', students: '5000' },
    }));
    localStorage.setItem('allo_dispro_analyses_v1', JSON.stringify([
      { id: 'a1', title: 'ODRs 2025', outcomeLabel: 'ODRs', date: '2025-06-01', savedAt: 1, groups },
      { id: 'a2', title: 'ODRs 2026', outcomeLabel: 'ODRs', date: '2026-06-01', savedAt: 2, groups },
    ]));
  };

  it('renders live results from the draft and drills through Saved and Trends', () => {
    seed();
    const c = mount(Mods.DisproAnalyzer.DisproAnalyzerPanel, baseProps());
    expect(c.textContent).toContain('Risk ratio');
    expect(c.textContent).toContain('3.00'); // hand-worked RR from the seeded draft
    clickText(c, 'Saved');
    clickText(c, 'ODRs 2025');
    expect(c.textContent).toContain('Risk index');
    clickText(c, 'Trends');
    expect(c.textContent).toContain('Risk ratios over time');
    expect(c.querySelector('svg')).toBeTruthy(); // two saved ODRs analyses -> chart
  });
});

describe('SpedTimelinesPanel', () => {
  it('dashboard shows band counts and urgency order; completing a case round-trips to storage', () => {
    localStorage.setItem('allo_sped_cases_v1', JSON.stringify([
      { id: 'c1', code: 'JD', type: 'annual', provider: 'AP', keyDate: '2025-09-01', dueDate: '2026-07-01', completedAt: null },
      { id: 'c2', code: 'MR', type: 'initial_eval', provider: 'JB', keyDate: '2026-07-20', dueDate: '2099-12-31', completedAt: null },
    ]));
    const opened = [];
    const c = mount(Mods.SpedTimelines.SpedTimelinesPanel, { ...baseProps(), onOpenEligibility: (section) => opened.push(section) });
    expect(c.textContent).toContain('SpEd Timelines');
    expect(c.textContent).toContain('Open timelines, most urgent first');
    // Overdue case listed before the far-future one.
    const rows = Array.from(c.querySelectorAll('tbody th')).map((th) => th.textContent);
    expect(rows[0]).toBe('JD');
    expect(c.textContent).toContain('Caseload by provider');
    clickText(c, 'Review evaluation, eligibility & safeguards');
    expect(opened).toEqual(['elig-documents-title']);
    clickText(c, 'Timelines');
    expect(c.textContent).toContain('Add a timeline');
    const box = Array.from(c.querySelectorAll('input[type="checkbox"]')).find((b) => (b.getAttribute('aria-label') || '').includes('JD'));
    act(() => { box.click(); });
    const stored = JSON.parse(localStorage.getItem('allo_sped_cases_v1'));
    expect(stored.find((x) => x.id === 'c1').completedAt).toBeTruthy();
  });
});

describe('MtssTriagePanel', () => {
  it('renders the tier board from a saved window, shows sibling context, and Progress compares two windows', () => {
    const cuts = { higherBetter: true, tier2Cut: 40, tier3Cut: 20 };
    localStorage.setItem('allo_mtss_datasets_v1', JSON.stringify([
      { id: 'w2', label: 'ORF g3', window: '2027 Winter', cutpoints: cuts, savedAt: 2,
        rows: [{ code: 'JD', score: 22 }, { code: 'MR', score: 44 }] },
      { id: 'w1', label: 'ORF g3', window: '2026 Fall', cutpoints: cuts, savedAt: 1,
        rows: [{ code: 'JD', score: 15 }, { code: 'MR', score: 35 }] },
    ]));
    localStorage.setItem('allo_udlwalk_sessions_v1', JSON.stringify([{}, {}, {}]));
    const c = mount(Mods.MtssTriage.MtssTriagePanel, baseProps());
    expect(c.textContent).toContain('MTSS Triage');
    expect(c.textContent).toContain('3 walkthrough visits'); // sibling context strip
    clickText(c, 'ORF g3 · 2026 Fall');
    expect(c.textContent).toContain('flagged for team review');
    expect(c.textContent).toContain('JD'); // T3 at 15
    // Progress tab: pick both windows through the real selects.
    clickText(c, 'Progress');
    const setSelect = (id, v) => {
      const el = c.querySelector(id);
      const proto = Object.getPrototypeOf(el);
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      act(() => { el.dispatchEvent(new window.Event('change', { bubbles: true })); });
    };
    setSelect('#mtss-prog-A', 'w1');
    setSelect('#mtss-prog-B', 'w2');
    expect(c.textContent).toContain('2 matched');
    expect(c.textContent).toContain('T3→T2 ✓'); // JD moved less intensive
  });

  it('creating a group from checked Tier 2/3 students round-trips to storage', () => {
    localStorage.setItem('allo_mtss_datasets_v1', JSON.stringify([
      { id: 'w1', label: 'ORF g3', window: '2026 Fall', cutpoints: { higherBetter: true, tier2Cut: 40, tier3Cut: 20 }, savedAt: 1,
        rows: [{ code: 'JD', score: 15 }, { code: 'AL', score: 25 }] },
    ]));
    const c = mount(Mods.MtssTriage.MtssTriagePanel, baseProps());
    clickText(c, 'ORF g3 · 2026 Fall');
    const box = Array.from(c.querySelectorAll('input[type="checkbox"]')).find((b) => (b.getAttribute('aria-label') || '').includes('JD'));
    act(() => { box.click(); });
    const name = c.querySelector('#mtss-group-name');
    const proto = Object.getPrototypeOf(name);
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(name, 'Decoding group A');
    act(() => { name.dispatchEvent(new window.Event('input', { bubbles: true })); });
    clickText(c, 'Create group');
    expect(c.textContent).toContain('Decoding group A');
    const stored = JSON.parse(localStorage.getItem('allo_mtss_groups_v1'));
    expect(stored[0].members).toEqual(['JD']);
  });
});

describe('FamilyAnnouncementsPanel', () => {
  it('mock-AI translate flow: sequential calls, editable review boxes, packet export path renders', async () => {
    localStorage.setItem('allo_famann_config_v1', JSON.stringify({ langTags: ['es', 'ar'] }));
    const calls = [];
    const fakeGemini = async (prompt) => { calls.push(prompt); return 'Translation: texto traducido'; };
    const c = mount(Mods.FamilyAnnouncements.FamilyAnnouncementsPanel, { ...baseProps(), callGemini: fakeGemini });
    expect(c.textContent).toContain('Family Announcements');
    // Fill the announcement.
    const ta = c.querySelector('#famann-text');
    const proto = Object.getPrototypeOf(ta);
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(ta, 'School ends at 11:30 AM on Friday for staff training.');
    act(() => { ta.dispatchEvent(new window.Event('input', { bubbles: true })); });
    // Translate all (async — flush inside act).
    const btn = Array.from(c.querySelectorAll('button')).find((b) => b.textContent.includes('Translate all'));
    await act(async () => { btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    expect(calls.length).toBe(2); // es + ar, sequential
    expect(calls[0]).toContain('Español');
    // Cleaned translation (label peeled) lands in the editable review box.
    const esBox = c.querySelector('#famann-tr-es');
    expect(esBox.value).toBe('texto traducido');
    expect(esBox.getAttribute('lang')).toBe('es');
    expect(c.querySelector('#famann-tr-ar').getAttribute('dir')).toBe('rtl');
    // Save -> lands on the saved view with per-language downloads.
    clickText(c, 'Save announcement');
    expect(c.textContent).toContain('Per-language files');
    expect(c.textContent).toContain('Español');
  });

  it('without callGemini it is honest and still usable manually', () => {
    localStorage.setItem('allo_famann_config_v1', JSON.stringify({ langTags: ['es'] }));
    const c = mount(Mods.FamilyAnnouncements.FamilyAnnouncementsPanel, { ...baseProps(), callGemini: null });
    expect(c.textContent).toContain('AI translation is unavailable');
    expect(c.querySelector('#famann-tr-es')).toBeTruthy(); // paste-your-own box still there
  });
});

describe('MeetingDocsPanel', () => {
  const seed = () => {
    localStorage.setItem('allo_meetdocs_meetings_v1', JSON.stringify([
      { id: 'm1', title: 'SST — Marcus R.', date: '2026-08-01', templateId: 'sst', templateName: 'Student Support Team (SST)',
        savedAt: 1, aiUsed: true,
        sections: { attendees: 'AP, classroom teacher', concerns: 'Reading fluency' },
        decisions: [{ id: 'd1', text: 'Move to Tier 2', source: 'q', verified: true }],
        actionItems: [
          { id: 'ai1', text: 'Send consent form', owner: 'AP', due: '2026-08-01', done: false, verified: true },
          { id: 'ai2', text: 'Schedule follow-up', owner: '', due: '', done: true, verified: true },
        ] },
    ]));
  };

  it('walks template pick -> input -> manual review -> save, then Meetings and Actions', () => {
    seed();
    const opened = [];
    const c = mount(Mods.MeetingDocs.MeetingDocsPanel, { ...baseProps(), callGemini: null, onOpenEligibility: (section) => opened.push(section) });
    expect(c.textContent).toContain('Pick a format');
    clickText(c, 'Open the meeting-preparation guide');
    expect(opened).toEqual(['elig-prep-title']);
    clickText(c, 'Student Support Team (SST)');
    expect(c.textContent).toContain('Notes or transcript');
    expect(c.textContent).toContain('Names to mask');
    expect(c.textContent).toContain('AI conversion is unavailable'); // no callGemini -> honest notice
    clickText(c, 'Fill in manually (no AI)');
    expect(c.textContent).toContain('review and edit before saving');
    expect(c.textContent).toContain('Interventions tried so far');
    clickText(c, 'Save record');
    expect(c.textContent).toContain('Student Support Team');
    // Actions tab shows the seeded open item as overdue (due 2026-08-01 < today).
    clickText(c, 'Action items');
    expect(c.textContent).toContain('Send consent form');
    expect(c.textContent).toContain('overdue');
    // Toggle it done through the real checkbox.
    const box = Array.from(c.querySelectorAll('input[type="checkbox"]')).find((b) => (b.getAttribute('aria-label') || '').includes('Send consent form'));
    expect(box).toBeTruthy();
    act(() => { box.click(); });
    const stored = JSON.parse(localStorage.getItem('allo_meetdocs_meetings_v1'));
    const m1 = stored.find((m) => m.id === 'm1');
    expect(m1.actionItems.find((a) => a.id === 'ai1').done).toBe(true);
  });

  it('creates a custom template and starts a record from it', () => {
    const c = mount(Mods.MeetingDocs.MeetingDocsPanel, { ...baseProps(), callGemini: null });
    clickText(c, 'New custom format');
    const name = c.querySelector('#meetdocs-tpl-name');
    const sections = c.querySelector('#meetdocs-tpl-sections');
    const setVal = (el, v) => {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      desc.set.call(el, v);
      act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
    };
    setVal(name, 'District SST Form');
    setVal(sections, 'Attendees\nConcerns: be specific\nNext steps');
    clickText(c, 'Save format');
    expect(c.textContent).toContain('District SST Form');
    clickText(c, 'District SST Form');
    expect(c.textContent).toContain('Notes or transcript');
  });
});
