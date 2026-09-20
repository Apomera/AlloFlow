import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const BOX_A = 'https://script.google.com/macros/s/MAILBOX_A/exec';
const BOX_B = 'https://script.google.com/macros/s/MAILBOX_B/exec';
const PACK_A = 'PK-11111111-1111-4111-8111-111111111111';
const PACK_B = 'PK-22222222-2222-4222-8222-222222222222';
const KEY_A = 'synthetic-capability-a-0123456789abcdef';
const KEY_B = 'synthetic-capability-b-0123456789abcdef';
const ADMIN_A = 'synthetic-admin-a';
const ADMIN_B = 'synthetic-admin-b';
function section(start, end) {
  const from = shell.indexOf(start), to = shell.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error('Missing mailbox target source boundary: ' + start);
  return shell.slice(from, to);
}
function link(payload, hash = false) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return 'https://student.example.invalid/app/' + (hash ? '#allo_mbp=' : '?allo_mbp=') + encoded;
}
function savedShare(overrides = {}) {
  return {
    type: 'assignment-pack-hosted', url: link({ u: BOX_A, id: PACK_A, k: KEY_A }),
    packId: PACK_A, packSecret: KEY_A, createdAt: '2026-09-20T00:00:00.000Z', expiresAt: '2099-01-01T00:00:00.000Z',
    sharedActivity: { activityId: 'AC-11111111-1111-4111-8111-111111111111', type: 'word_cloud', prompt: 'Fixture reflection' },
    ...overrides,
  };
}
function helpers(currentUrl = 'https://current.example.invalid/') {
  const location = new URL(currentUrl);
  return new Function('window', '_alloGetConfiguredStudentBaseUrl', '_alloShareHostIsNotStudentReachable',
    section('function _alloBase64UrlEncode(value)', 'function _alloValidFirebaseConfig(config)') +
    '\nreturn { read: _alloReadMailboxEntryParam, resolve: _alloResolveHostedShareMailbox, clean: _alloCleanMailboxUrl };')(
      { location }, () => 'https://student.example.invalid/app/', () => false);
}

function refreshHarness(shares, mbConfig) {
  const api = helpers();
  let status = {}, refreshing;
  const call = vi.fn(async () => ({ participantCount: 3, responses: [] }));
  const deps = {
    useCallback: fn => fn, assignmentCenterRefreshEpochRef: { current: 0 }, recentQrShares: shares, mbConfig,
    setAssignmentCenterRefreshing: value => { refreshing = value; },
    setAssignmentCenterStatusByUrl: value => { status = typeof value === 'function' ? value(status) : value; },
    _alloMailboxCallWithRetry: call, _alloResolveHostedShareMailbox: api.resolve, _alloCleanMailboxUrl: api.clean,
    _alloAssignmentCenterActivityStatus: value => value,
  };
  const refresh = new Function(...Object.keys(deps), section('  const refreshAssignmentCenter = useCallback(async () => {', '  useEffect(() => {') + '\nreturn refreshAssignmentCenter;')(...Object.values(deps));
  return { refresh, call, get status() { return status; }, get refreshing() { return refreshing; } };
}
function exportTarget(shares) {
  // Deliberately no mbConfig binding: a portable return target must come from
  // the saved URL even after the current mailbox is forgotten or changed.
  return new Function('recentQrShares', '_alloResolveHostedShareMailbox',
    section('    const _hostedSubmitShare', '    const cfgBase') + '\nreturn _mailboxSubmitTarget;')(shares, helpers().resolve);
}

describe('saved hosted-share mailbox capability', () => {
  it.each([false, true])('resolves an explicit saved %s-hash link independently of the current page', hash => {
    const h = helpers(link({ u: BOX_B, id: PACK_B, k: KEY_B }));
    const url = link({ u: BOX_A, id: PACK_A, k: KEY_A, admin: 'must-not-return' }, hash);
    expect(h.resolve(savedShare({ url, admin: 'also-not-returned' }))).toEqual({ url: BOX_A, id: PACK_A, k: KEY_A });
    expect(h.read('allo_mbp', url)).toMatchObject({ u: BOX_A, id: PACK_A, k: KEY_A });
    expect(h.read('allo_mbp')).toMatchObject({ u: BOX_B, id: PACK_B, k: KEY_B });
  });

  it('normalizes the validated Apps Script endpoint and returns only the pack capability', () => {
    const share = savedShare({ url: link({ u: ' HTTPS://SCRIPT.GOOGLE.COM/macros/s/MAILBOX_A/exec ', id: PACK_A, k: KEY_A, admin: ADMIN_A, extra: 'private' }) });
    const result = helpers().resolve(share);
    expect(result).toEqual({ url: BOX_A, id: PACK_A, k: KEY_A });
    expect(Object.keys(result).sort()).toEqual(['id', 'k', 'url']);
    expect(JSON.stringify(result)).not.toMatch(/admin|private/);
  });

  it('accepts a URL capability when legacy saved metadata has no duplicate secret', () => {
    const share = savedShare(); delete share.packSecret;
    expect(helpers().resolve(share)).toEqual({ url: BOX_A, id: PACK_A, k: KEY_A });
  });

  it.each([
    ['mismatched id', () => savedShare({ packId: PACK_B })],
    ['mismatched key', () => savedShare({ packSecret: KEY_B })],
    ['missing id', () => savedShare({ packId: '' })],
    ['invalid id', () => savedShare({ packId: 'not-a-pack', url: link({ u: BOX_A, id: 'not-a-pack', k: KEY_A }) })],
    ['missing URL capability', () => savedShare({ url: 'https://student.example.invalid/app/' })],
    ['malformed URL', () => savedShare({ url: 'not a URL' })],
    ['malformed encoded JSON', () => savedShare({ url: 'https://student.example.invalid/?allo_mbp=not-json' })],
    ['wrong share type', () => savedShare({ type: 'assignment' })],
    ['missing URL secret', () => savedShare({ url: link({ u: BOX_A, id: PACK_A }) })],
  ])('rejects %s instead of falling back to the current mailbox or page', (_name, make) => {
    const h = helpers(link({ u: BOX_B, id: PACK_B, k: KEY_B }));
    expect(h.resolve(make())).toBeNull();
  });

  it.each([
    'http://script.google.com/macros/s/MAILBOX_A/exec',
    'https://not-google.example.invalid/macros/s/MAILBOX_A/exec',
    'https://script.google.com/macros/s/MAILBOX_A/dev',
    'https://script.google.com/macros/s/MAILBOX_A/exec?admin=bad',
    'https://user:password@script.google.com/macros/s/MAILBOX_A/exec',
    'https://script.google.com:8443/macros/s/MAILBOX_A/exec',
  ])('rejects unsafe mailbox endpoint %s', endpoint => {
    expect(helpers().resolve(savedShare({ url: link({ u: endpoint, id: PACK_A, k: KEY_A }) }))).toBeNull();
  });
});

describe('actual assignment-center refresh target routing', () => {
  it('sends admin only to the exact saved deployment matching the current connection', async () => {
    const shareA = savedShare();
    const shareB = savedShare({ url: link({ u: BOX_B, id: PACK_B, k: KEY_B }), packId: PACK_B, packSecret: KEY_B });
    const malformed = savedShare({ url: 'https://student.example.invalid/?allo_mbp=broken' });
    const h = refreshHarness([shareA, shareB, malformed], { url: BOX_A, admin: ADMIN_A });
    await h.refresh();
    expect(h.call).toHaveBeenCalledOnce();
    expect(h.call).toHaveBeenCalledWith(BOX_A, { a: 'getactivityadmin', admin: ADMIN_A, id: PACK_A, aid: shareA.sharedActivity.activityId });
    expect(h.status[shareA.url].state).toBe('ready');
    expect(h.status[shareB.url].state).toBe('error');
    expect(h.status[malformed.url].state).toBe('error');
    expect(h.refreshing).toBe(false);
  });

  it('does not send saved pack A credentials or current admin B to a different deployment on the same origin', async () => {
    const share = savedShare(), h = refreshHarness([share], { url: BOX_B, admin: ADMIN_B });
    await h.refresh();
    expect(h.call).not.toHaveBeenCalled();
    expect(h.status[share.url].state).toBe('error');
    expect(h.refreshing).toBe(false);
  });

  it('makes no status request when the current mailbox has been forgotten', async () => {
    const share = savedShare(), h = refreshHarness([share], null);
    await h.refresh();
    expect(h.call).not.toHaveBeenCalled();
    expect(h.status[share.url].state).toBe('error');
  });
});

function surveyHarness(mbConfig) {
  const api = helpers();
  const summary = { participantCount: 2, responses: [] };
  const call = vi.fn(async () => summary), importSummary = vi.fn(() => ({ imported: 2, skipped: 0 }));
  const deps = {
    useCallback: fn => fn, mbConfig,
    _alloResolveHostedShareMailbox: api.resolve, _alloCleanMailboxUrl: api.clean,
    _alloMailboxCallWithRetry: call, addToast: vi.fn(), setMbUrlInput: vi.fn(), setMbPanelOpen: vi.fn(),
    window: { AlloModules: { StudentAnalyticsInternals: { importMailboxSurveySummary: importSummary } } },
  };
  const run = new Function(...Object.keys(deps), section('  const importSurveyShareToResearchSuite = useCallback(async (share) => {', '  const extendAssignmentCenterShare') + '\nreturn importSurveyShareToResearchSuite;')(...Object.values(deps));
  return { ...deps, run, call, summary, importSummary };
}
function qrTarget(share, mbConfig) {
  const api = helpers();
  return new Function('useMemo', 'qrShareModal', 'mbConfig', '_alloResolveHostedShareMailbox', '_alloCleanMailboxUrl',
    section('  const qrShareMailbox = useMemo(() => {', '  const [mbStatus, setMbStatus]') + '\nreturn qrShareMailbox;')(fn => fn(), share, mbConfig, api.resolve, api.clean);
}

describe('actual survey import target guard', () => {
  it('reconnects to the saved deployment without sending the currently connected mailbox admin elsewhere', async () => {
    const h = surveyHarness({ url: BOX_B, admin: ADMIN_B });
    await h.run(savedShare());
    expect(h.call).not.toHaveBeenCalled(); expect(h.importSummary).not.toHaveBeenCalled();
    expect(h.setMbUrlInput).toHaveBeenCalledWith(BOX_A); expect(h.setMbPanelOpen).toHaveBeenCalledWith(true);
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('Reconnect'), 'info');
  });

  it('rejects incomplete saved capabilities before any read or mailbox switch', async () => {
    const h = surveyHarness({ url: BOX_A, admin: ADMIN_A });
    await h.run(savedShare({ packSecret: KEY_B }));
    expect(h.call).not.toHaveBeenCalled(); expect(h.importSummary).not.toHaveBeenCalled();
    expect(h.setMbPanelOpen).not.toHaveBeenCalled(); expect(h.setMbUrlInput).not.toHaveBeenCalled();
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('incomplete'), 'info');
  });

  it('reads matching saved survey results and imports only that response', async () => {
    const share = savedShare({ researchMeta: { studyId: 'fixture-study' } });
    const h = surveyHarness({ url: BOX_A, admin: ADMIN_A });
    await h.run(share);
    expect(h.call).toHaveBeenCalledOnce();
    expect(h.call).toHaveBeenCalledWith(BOX_A, { a: 'getactivityadmin', admin: ADMIN_A, id: PACK_A, aid: share.sharedActivity.activityId });
    expect(h.importSummary).toHaveBeenCalledWith(h.summary, share.researchMeta);
    expect(h.setMbPanelOpen).not.toHaveBeenCalled();
  });
});

describe('actual teacher-panel target memo', () => {
  it('returns the saved capability with admin only for its matching cleaned deployment', () => {
    expect(qrTarget(savedShare(), { url: ' HTTPS://SCRIPT.GOOGLE.COM/macros/s/MAILBOX_A/exec ', admin: ADMIN_A }))
      .toEqual({ url: BOX_A, id: PACK_A, secret: KEY_A, admin: ADMIN_A });
  });
  it('blocks a different deployment on the same origin and missing current credentials', () => {
    expect(qrTarget(savedShare(), { url: BOX_B, admin: ADMIN_B })).toBeNull();
    expect(qrTarget(savedShare(), { url: BOX_A })).toBeNull();
    expect(qrTarget(savedShare(), null)).toBeNull();
  });
  it('blocks saved metadata that disagrees with its URL capability', () => {
    expect(qrTarget(savedShare({ packSecret: KEY_B }), { url: BOX_A, admin: ADMIN_A })).toBeNull();
  });
});

describe('actual portable export target', () => {
  it('uses the saved link endpoint and pack capability without requiring a current mailbox', () => {
    const share = savedShare();
    expect(exportTarget([share])).toEqual({ url: BOX_A, id: PACK_A, k: KEY_A, expiresAt: share.expiresAt });
  });

  it('ignores a newer malformed target and selects the newest valid saved capability', () => {
    const valid = savedShare();
    const invalid = savedShare({ url: 'https://student.example.invalid/?allo_mbp=broken', createdAt: '2098-01-01T00:00:00Z' });
    expect(exportTarget([valid, invalid])).toEqual({ url: BOX_A, id: PACK_A, k: KEY_A, expiresAt: valid.expiresAt });
  });

  it('does not export mismatched URL metadata, revoked, or expired capabilities', () => {
    for (const share of [savedShare({ packSecret: KEY_B }), savedShare({ revokedAt: '2026-09-20T00:00:00Z' }), savedShare({ expiresAt: '2000-01-01T00:00:00Z' })]) {
      expect(exportTarget([share])).toBeNull();
    }
  });
});

const require = createRequire(import.meta.url), modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, createRoot, act, View, reactRoot, host;
beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ({ createRoot } = require(resolve(modulesDir, 'react-dom/client')));
  act = React.act || require(resolve(modulesDir, 'react-dom/test-utils')).act;
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_share_session_surfaces_module.js'); View = window.AlloModules.HomeworkQrDialogView;
});
afterEach(() => {
  if (reactRoot) act(() => reactRoot.unmount()); reactRoot = null;
  host?.remove(); host = null;
});
async function renderQr(qrShareMailbox) {
  const captures = [], noop = () => {}, Icon = () => null;
  const props = {
    ...Object.fromEntries(['BookOpen', 'ClipboardList', 'Copy', 'ExternalLink', 'Printer', 'Share2', 'Trash2', 'X'].map(name => [name, Icon])),
    SharedAssignmentActivityPanel: value => { captures.push(value); return React.createElement('div', { 'data-test-activity-panel': true }, 'Teacher activity fixture'); },
    addToast: noop, copyToClipboard: noop, createSelfContainedHomeworkLink: noop, homeworkQrDialogRef: React.createRef(), hostPackOnMailbox: noop,
    mbBusy: false, mbConfig: { url: BOX_B, admin: ADMIN_B }, printQrSheet: noop, qrShareError: true, qrShareSvg: '', revokeHomeworkAssignment: noop, setQrShareModal: noop, t: () => undefined, testHomeworkAsStudent: noop,
    qrShareModal: { ...savedShare(), title: 'Saved mailbox A homework', resourceCount: 1, aiPolicy: 'off' }, qrShareMailbox,
  };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = createRoot(host);
  await act(async () => { reactRoot.render(React.createElement(View, props)); });
  return captures;
}

describe('generated teacher activity panel uses validated share target', () => {
  it('passes only the explicitly validated mailbox into the teacher panel even when current config differs', async () => {
    const captures = await renderQr({ url: BOX_A, id: PACK_A, secret: KEY_A, admin: ADMIN_A });
    expect(captures).toHaveLength(1);
    expect(captures[0].mailbox).toEqual({ url: BOX_A, id: PACK_A, secret: KEY_A, admin: ADMIN_A });
    expect(captures[0].admin).toBe(ADMIN_A);
    expect(JSON.stringify({ mailbox: captures[0].mailbox, admin: captures[0].admin })).not.toContain(ADMIN_B);
  });

  it('renders reconnect guidance without constructing a teacher panel when no target matches', async () => {
    const captures = await renderQr(null);
    expect(captures).toEqual([]);
    expect(host.querySelector('[data-test-activity-panel]')).toBeNull();
    expect(host.textContent).toMatch(/connect.*mailbox.*(?:created|belongs|used)|reconnect.*mailbox/i);
    expect(host.textContent).not.toContain(ADMIN_B);
  });
});
