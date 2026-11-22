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
let UdlWalkthroughPanel;
let CommunicationsStudioPanel;
let FullPackRunView;
let WalkthroughCopilotPanel;

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
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });

  delete window.AlloModules.UdlWalkthrough;
  new Function(readFileSync(resolve(process.cwd(), 'udl_walkthrough_module.js'), 'utf8'))();
  UdlWalkthroughPanel = window.AlloModules.UdlWalkthrough.UdlWalkthroughPanel;

  delete window.AlloModules.CommunicationsStudio;
  new Function(readFileSync(resolve(process.cwd(), 'communications_studio_module.js'), 'utf8'))();
  CommunicationsStudioPanel = window.AlloModules.CommunicationsStudio.CommunicationsStudioPanel;

  loadAlloModule('view_full_pack_run_module.js');
  FullPackRunView = window.AlloModules.FullPackRunView;

  delete window.AlloModules.WalkthroughCopilot;
  new Function(readFileSync(resolve(process.cwd(), 'walkthrough_copilot_cdn_module.js'), 'utf8'))();
  WalkthroughCopilotPanel = window.AlloModules.WalkthroughCopilot.WalkthroughCopilotPanel;
});

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
  localStorage.clear();
  window.__alloFocusTrapStack = [];
  delete window.callGemini;
  delete window.alloCopyText;
  vi.restoreAllMocks();
});

describe('Wave 10 polish: UDL Walkthrough, Communications Studio, Full Pack Run, Walkthrough Copilot', () => {
  it('UdlWalkthroughPanel shows visit-count badges, roster filter, rating progress bar, and shared/search visit filters', async () => {
    const roster = [1, 2, 3, 4, 5, 6].map((n) => ({
      id: `t${n}`, code: `T-0${n}`, name: `Teacher ${n}`, grade: `Grade ${n}`, subject: 'ELA',
    }));
    const sessions = [
      { id: 's1', teacherId: 't1', date: '2026-08-01', startedAt: 4, durationMin: 8, context: {}, evidence: { eng_7_1: { rating: 'observed' } }, studentIndicators: [], summaryNote: '', observer: { initials: 'AP' }, sharedWithTeacher: true },
      { id: 's2', teacherId: 't2', date: '2026-08-02', startedAt: 3, durationMin: 6, context: {}, evidence: {}, studentIndicators: [], summaryNote: '', observer: { initials: 'JB' }, sharedWithTeacher: false },
      { id: 's3', teacherId: 't3', date: '2026-08-03', startedAt: 2, durationMin: 7, context: {}, evidence: {}, studentIndicators: [], summaryNote: '', observer: { initials: 'AP' }, sharedWithTeacher: false },
      { id: 's4', teacherId: 't4', date: '2026-08-04', startedAt: 1, durationMin: 5, context: {}, evidence: {}, studentIndicators: [], summaryNote: '', observer: { initials: 'AP' }, sharedWithTeacher: true },
    ];
    localStorage.setItem('allo_udlwalk_roster_v1', JSON.stringify(roster));
    localStorage.setItem('allo_udlwalk_sessions_v1', JSON.stringify(sessions));

    const host = mountEl(React.createElement(UdlWalkthroughPanel, {
      onClose: vi.fn(),
      t: null,
      addToast: vi.fn(),
    }));

    // Unvisited teacher t6 shows "0 visits" badge; roster search appears at 6 active teachers
    expect(host.querySelector('[data-udlwalk-visit-badge="t6"]').textContent).toContain('0 visits');
    const rosterSearch = host.querySelector('#udlwalk-roster-search');
    expect(rosterSearch).toBeTruthy();
    setInputValue(rosterSearch, 'Teacher 6');
    const t6Btn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Teacher 6'));
    expect(t6Btn).toBeTruthy();

    // Opening a visit renders the rating progress bar
    await act(async () => { t6Btn.click(); });
    expect(host.querySelector('[data-udlwalk-rate-progress="true"]')).toBeTruthy();

    // Visits tab filter pills isolate Not shared visits (t2, t3)
    await act(async () => { host.querySelector('#udlwalk-tab-sessions').click(); });
    expect(host.querySelector('[data-udlwalk-visits-filter="true"]')).toBeTruthy();
    await act(async () => { host.querySelector('[data-udlwalk-visit-filter="unshared"]').click(); });
    expect(host.textContent).toContain('Teacher 2');
    expect(host.textContent).not.toContain('Teacher 1');
  });

  it('CommunicationsStudioPanel displays draft word/read-time meta, inline Copied badge, and batch codename filter', async () => {
    window.alloCopyText = vi.fn(async () => true);
    window.callGemini = vi.fn(async (prompt, json) => {
      if (json) {
        const codes = Array.from(prompt.matchAll(/^(S\d+) \|/gm), (m) => m[1]);
        return JSON.stringify(codes.map((c) => ({ codename: c, comment: `${c} participated thoughtfully in class.` })));
      }
      return 'Dear families, we explored ecosystems and built food-web models together this week.';
    });

    const host = mountEl(React.createElement(CommunicationsStudioPanel, {
      isOpen: true,
      onClose: vi.fn(),
      t: (k) => k,
    }));

    // Draft single update -> word/char/read-time pill + inline Copied feedback keeping "Copy all" prefix
    const learned = Array.from(host.querySelectorAll('label')).find((l) => l.textContent.startsWith('What we learned')).querySelector('textarea');
    setInputValue(learned, 'Built food-web models.');
    const draftBtn = host.querySelector('[data-comms-draft="true"]');
    await act(async () => { draftBtn.click(); await Promise.resolve(); });
    const meta = host.querySelector('[data-comms-draft-meta="true"]');
    expect(meta.textContent).toContain('12 words');
    expect(meta.textContent).toContain('min read');

    const copyAllBtn = host.querySelector('[data-comms-copy-all="true"]');
    await act(async () => { copyAllBtn.click(); await Promise.resolve(); });
    expect(copyAllBtn.textContent).toContain('Copy all');
    expect(copyAllBtn.querySelector('[data-comms-copied-badge="all"]').textContent).toContain('Copied');

    // Switch to Report-card batch with 6 students -> codename search filters rows cleanly
    const rcTab = host.querySelector('#comms-tab-report-card');
    await act(async () => { rcTab.click(); });
    const keepDiscard = host.querySelector('[data-comms-confirm="true"] button:last-child');
    if (keepDiscard) await act(async () => { keepDiscard.click(); });

    const grid = Array.from(host.querySelectorAll('label')).find((l) => l.textContent.startsWith('One student per line')).querySelector('textarea');
    setInputValue(grid, ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((c) => `${c} | strong | pacing | kind`).join('\n'));
    await act(async () => { host.querySelector('[data-comms-draft="true"]').click(); await Promise.resolve(); });

    const batchSearch = host.querySelector('#comms-batch-search');
    expect(batchSearch).toBeTruthy();
    setInputValue(batchSearch, 'S5');
    expect(host.querySelectorAll('[data-comms-row]')).toHaveLength(1);
    expect(host.querySelector('[data-comms-row="S5"]')).toBeTruthy();
  });

  it('FullPackRunView renders ready-plan summary pills and live status breakdown chips during/after generation', () => {
    const noop = () => {};
    const Icon = () => null;
    const commonProps = {
      AlertTriangle: Icon, ArrowDown: Icon, ArrowRight: Icon, ArrowUp: Icon, ChevronDown: Icon, Clock: Icon,
      Copy: Icon, Cpu: Icon, Download: Icon, Eye: Icon, EyeOff: Icon, ImageIcon: Icon, Plus: Icon,
      RefreshCw: Icon, Sparkles: Icon, StopCircle: Icon, Trash2: Icon,
      GUIDED_DELIVERY_GROUPS: [],
      _alloDiagnosticReason: (r) => (r ? { code: 'err', summary: String(r) } : null),
      _alloGenerationHelpersDeps: () => ({}),
      aiCapability: { text: true },
      getDefaultTitle: (type) => type,
      guidedActiveSteps: [],
      guidedMode: false,
      guidedStep: 0,
      hasSourceOrAnalysis: true,
      history: [],
      isAutoConfigEnabled: true,
      isProcessing: false,
      isTeacherMode: true,
      resourceCount: '8',
      selectToolFromCatalog: noop,
      setFullPackAddType: noop,
      setFullPackTargetGroup: noop,
      setIsAutoConfigEnabled: noop,
      setResourceCount: noop,
      setShowCompletedFullPackRows: noop,
      showCompletedFullPackRows: true,
      handlePlanFullPack: noop,
      handleApproveFullPack: noop,
      handleDismissFullPackRun: noop,
      t: (k) => ({
        'fullpack.minutes': 'minutes',
        'fullpack.reused_short': 'reused',
        'fullpack.image_calls': 'image calls',
        'fullpack.status_complete': 'Complete',
        'fullpack.in_progress_short': 'in progress',
        'fullpack.status_failed': 'Needs attention',
      }[k] || ''),
    };

    // Ready status -> shows scannable plan pills
    const readyHost = mountEl(React.createElement(FullPackRunView, {
      ...commonProps,
      fullPackRun: {
        status: 'ready',
        preflight: {
          selected: [{ uiId: 'q1', type: 'quiz' }, { uiId: 'g1', type: 'glossary' }],
          skipped: [],
          generationMatrix: { summary: { actions: { reuse: 1 } } },
          capacity: { estimatedMinutes: 3, imageCalls: 2, aiCalls: 4 },
        },
      },
    }));
    const planPills = readyHost.querySelector('[data-testid="full-pack-plan-pills"]');
    expect(planPills.textContent).toContain('~3 minutes');
    expect(planPills.textContent).toContain('1 reused');
    expect(planPills.textContent).toContain('2 image calls');

    // Partial/running status -> shows live status breakdown chips + elapsed time
    const runHost = mountEl(React.createElement(FullPackRunView, {
      ...commonProps,
      fullPackRun: {
        status: 'partial',
        elapsedMs: 14000,
        preflight: {
          selected: [{ uiId: 'q1', type: 'quiz' }, { uiId: 'g1', type: 'glossary' }, { uiId: 'a1', type: 'analysis' }],
          skipped: [],
        },
        resources: {
          q1: { key: 'q1', type: 'quiz', status: 'completed' },
          g1: { key: 'g1', type: 'glossary', status: 'running' },
          a1: { key: 'a1', type: 'analysis', status: 'failed', reason: 'rate limit' },
        },
      },
    }));
    const breakdown = runHost.querySelector('[data-testid="full-pack-status-breakdown"]');
    expect(breakdown.textContent).toContain('1 Complete');
    expect(breakdown.textContent).toContain('1 in progress');
    expect(breakdown.textContent).toContain('1 Needs attention');
    expect(breakdown.textContent).toContain('14s');
  });

  it('WalkthroughCopilotPanel shows decision progress bar/counts and tracks copied form fields', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.resolve()) },
    });

    const host = mountEl(React.createElement(WalkthroughCopilotPanel, {
      isOpen: true,
      onClose: vi.fn(),
      t: (k, d) => d || k,
      addToast: vi.fn(),
    }));

    // Pick first practice scenario and lock notes
    const scenarioBtn = Array.from(host.querySelectorAll('button')).find((b) => b.getAttribute('aria-pressed') !== null);
    await act(async () => { scenarioBtn.click(); });
    const lockBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Lock these notes'));
    await act(async () => { lockBtn.click(); });

    // Analyze stage shows decision progress bar and updates kept/rejected breakdown
    expect(host.querySelector('[data-wcop-decision-progress="true"]')).toBeTruthy();
    for (let i = 0; i < 30; i += 1) {
      const keep = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Keep' && b.getAttribute('aria-pressed') === 'false');
      const reject = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Reject' && b.getAttribute('aria-pressed') === 'false');
      const target = keep || reject;
      if (!target) break;
      await act(async () => { target.click(); });
    }
    expect(host.querySelector('[data-wcop-decision-progress="true"]').textContent).toContain('kept');

    // Advance to Feedback -> Copy stage
    const toFeedback = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Continue to the feedback'));
    await act(async () => { toFeedback.click(); });
    const toCopy = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Continue to copy'));
    await act(async () => { toCopy.click(); });

    // Copy first individual field and verify copied checklist badge + Copy everything badge
    const firstFieldCopy = host.querySelector('[data-wcop-copy-field]');
    await act(async () => { firstFieldCopy.click(); await Promise.resolve(); });
    expect(firstFieldCopy.textContent).toContain('Copied');
    expect(host.querySelector('[data-wcop-copied-progress="true"]').textContent).toContain('1/');

    const copyAllBtn = host.querySelector('[data-wcop-copy-all="true"]');
    await act(async () => { copyAllBtn.click(); await Promise.resolve(); });
    expect(copyAllBtn.textContent).toContain('Copied');
  });
});
