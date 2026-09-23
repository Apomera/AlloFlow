// @vitest-environment jsdom
// Live Dashboard — End Session (2026-09-23).
//
// The quiz view's End Session sits bottom-right, where the fixed
// "Live Dashboard" launcher floats over it. The dashboard now carries its own
// End Session in its sticky header. It must open the SAME summary + confirm
// flow as every other End Session (requestEndLiveSession), close the
// dashboard first so that flow is not stacked under it, and stay hidden on an
// older host that does not pass the handler (CDN modules can load against
// an older host).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let Dock;
let root;
let host;

// Every prop the view destructures, pre-filled: verb-named ones are host
// callbacks (stubbed as returning []), the rest undefined unless given.
function makeProps(extra) {
  const base = {
    t: () => null, history: [], sessionData: { roster: {} }, rosterEntries: {}, activeSignals: [],
    activeSessionCode: 'ABCDE', activeSessionAppId: 'app', _alloMbBridgeActive: () => false,
    _alloStudentSafeResources: (h) => h || [], liveDockPanelRef: React.createRef(),
    getFilteredHistory: () => [], dockCardStyle: {}, dockGroupLabel: {}, dockNow: Date.now(),
    recentHavenRecognition: [], liveOrganizerSummary: null, retryableLiveOrganizerUids: [],
    CLASS_GOAL_TEMPLATES: [], ALLOHAVEN_CLASSROOM_REWARD_REASONS: [], ALLOHAVEN_RECOGNITION_CAPS: [],
    TEACHER_ONLY_TYPES: new Set(), liveActivitySnapshots: {}, livePresenterCuesByResourceId: {},
    checklistMarks: {}, havenRecognitionConfig: {}, havenRewardDraftsRef: { current: {} },
    ...extra,
  };
  const VERB = /^(normalize|get|handle|set|resolve|classify|evaluate|format|retry|launch|open|broadcast|summarize|update|toggle|clear|signal|build|record|_allo)/;
  const src = fs.readFileSync(path.join(ROOT, 'view_live_session_dock_source.jsx'), 'utf8');
  const names = (/const \{([^}]*)\} = props;/.exec(src) || [, ''])[1].split(',').map((n) => n.trim()).filter(Boolean);
  const props = {};
  names.forEach((n) => { if (!(n in base)) props[n] = VERB.test(n) ? () => [] : undefined; });
  return Object.assign(props, base);
}

async function render(extra) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Dock, makeProps(extra))); });
  return host;
}

beforeAll(() => {
  React = require(path.resolve(modulesDir, 'react'));
  ReactDOMClient = require(path.resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(path.resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = global.React = React;
  const file = process.env.DOCK_MODULE || path.join(ROOT, 'view_live_session_dock_module.js');
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(file, 'utf8'))();
  Dock = window.AlloModules.LiveSessionDockView;
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = host = null;
});

describe('Live Dashboard End Session', () => {
  it('renders in the sticky header when the host passes the handler', async () => {
    const el = await render({ setShowLiveDock: () => {}, requestEndLiveSession: () => {} });
    const btn = el.querySelector('[data-live-dock-end-session="true"]');
    expect(btn).toBeTruthy();
    expect(btn.closest('div[style*="sticky"]')).toBeTruthy();
  });

  it('closes the dashboard, then opens the shared end flow', async () => {
    const calls = [];
    const el = await render({ setShowLiveDock: (v) => calls.push(['dock', v]), requestEndLiveSession: () => calls.push(['end']) });
    await act(async () => { el.querySelector('[data-live-dock-end-session="true"]').click(); });
    expect(calls).toEqual([['dock', false], ['end']]);
  });

  it('leaves Close as close-only', async () => {
    const calls = [];
    const el = await render({ setShowLiveDock: (v) => calls.push(['dock', v]), requestEndLiveSession: () => calls.push(['end']) });
    await act(async () => { el.querySelector('button[aria-label="Close"]').click(); });
    expect(calls).toEqual([['dock', false]]);
  });

  it('shows no button on an older host without the handler', async () => {
    const el = await render({ setShowLiveDock: () => {} });
    expect(el.querySelector('[data-live-dock-end-session="true"]')).toBeNull();
  });
});
