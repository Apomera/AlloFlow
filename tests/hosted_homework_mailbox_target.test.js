import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import vm from 'node:vm';

const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const declarations = parse(shell, { sourceType: 'module', plugins: ['jsx'] }).program.body;
const helperNames = ['_alloBase64UrlDecode', '_alloCleanMailboxUrl', '_alloReadMailboxEntryParam', '_alloResolveHostedShareMailbox'];
const helperSource = helperNames.map(name => {
  const node = declarations.find(item => item.type === 'FunctionDeclaration' && item.id?.name === name);
  if (!node) throw Error('Missing actual mailbox helper: ' + name);
  return shell.slice(node.start, node.end);
}).join('\n');
const helpers = new Function(helperSource + '; return { _alloCleanMailboxUrl, _alloResolveHostedShareMailbox };')();
const artifact = new vm.Script(readFileSync('host_handlers_module.js', 'utf8'), { filename: 'host_handlers_module.js' });
const URL_A = 'https://script.google.com/macros/s/AKfycb-mailbox-a/exec';
const URL_B = 'https://script.google.com/macros/s/AKfycb-mailbox-b/exec';
const PACK_ID = 'PK-aaaaaaaa-bbbb-cccc-dddd-111111111111';
const SECRET = 'reading_secret_reading_20';
function link(payload, hash = false) {
  return 'https://student.example.invalid/' + (hash ? '#' : '?') + 'allo_mbp=' + Buffer.from(JSON.stringify(payload)).toString('base64url');
}
function savedShare({ expired = false, hash = false, ...overrides } = {}) {
  return { type: 'assignment-pack-hosted', url: link({ u: URL_A, id: PACK_ID, k: SECRET }, hash), packId: PACK_ID, packSecret: SECRET,
    title: 'Saved reading', aiPolicy: 'off', expiresAt: new Date(Date.now() + (expired ? -1 : 1) * 86400000).toISOString(), ...overrides };
}
function harness({ share = savedShare(), configuredUrl = URL_A, holdConfirmation = false, call = async () => ({ ok: true }) } = {}) {
  const state = { recent: [share], modal: share, opened: [], confirmation: null };
  const transport = vi.fn(async (url, payload) => {
    const result = await call(url, payload);
    if (!result.ok) throw Object.assign(Error(result.e), { code: result.e });
    return result;
  });
  const deps = {
    _alloResolveHostedShareMailbox: vi.fn(helpers._alloResolveHostedShareMailbox), _alloCleanMailboxUrl: helpers._alloCleanMailboxUrl,
    mbConfig: { url: configuredUrl, admin: 'admin-a', v: 24 }, qrShareModal: share, homeworkExpiryDays: 7,
    _alloMailboxCall: transport, _alloMailboxCallWithRetry: transport,
    setMbUrlInput: vi.fn(), setMbPanelOpen: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(),
    setAssignmentCenterActionByUrl: vi.fn(), setAssignmentCenterStatusByUrl: vi.fn(), setShowRecentQrShares: vi.fn(),
    setRecentQrShares: updater => { state.recent = updater(state.recent); },
    setQrShareModal: updater => { state.modal = updater(state.modal); },
    setConfirmDialog: vi.fn(dialog => { state.confirmation = dialog; if (!holdConfirmation) dialog.onConfirm(); }),
    generateUUID: () => 'ffffffff-aaaa-bbbb-cccc-dddddddddddd', _alloRandomToken: () => 'new_reading_secret_20',
    _buildAlloMailboxEntryUrl: vi.fn((_name, payload) => link(payload)),
    copyToClipboard: vi.fn(), openQrShareModal: value => { state.opened.push(value); },
    appId: 'current-app', db: {}, doc: vi.fn((...args) => ({ args })), deleteDoc: vi.fn(async () => {}),
  };
  const window = { React: {}, AlloModules: {} };
  artifact.runInContext(vm.createContext({ window, console: { log() {}, warn() {}, error() {} } }));
  return { deps, state, transport, handlers: window.AlloModules.HostHandlers(deps), share };
}
const actions = [
  ['extend', 'extendAssignmentCenterShare', 'extendpack', false],
  ['duplicate', 'duplicateAssignmentCenterShare', 'clonepack', true],
  ['revoke', 'revokeHomeworkAssignment', 'delpack', false],
];

describe('saved homework mailbox target', () => {
  it.each(actions)('blocks %s when a different mailbox is connected', async (_name, method, _action, expired) => {
    const h = harness({ configuredUrl: URL_B, share: savedShare({ expired }) });
    await h.handlers[method](h.share);
    expect(h.transport).not.toHaveBeenCalled();
    expect(h.deps.setMbUrlInput).toHaveBeenCalledWith(URL_A); expect(h.deps.setMbPanelOpen).toHaveBeenCalledWith(true);
    expect(h.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('Reconnect'), 'info');
    expect(h.state.recent[0].revokedAt).toBeUndefined(); expect(h.state.opened).toHaveLength(0);
    expect(h.deps.setConfirmDialog).not.toHaveBeenCalled();
  });

  it.each(actions)('sends %s only to the validated saved mailbox with matching credentials', async (_name, method, action, expired) => {
    const h = harness({ configuredUrl: '  ' + URL_A + '  ', share: savedShare({ expired, hash: true }) });
    await h.handlers[method](h.share);
    expect(h.transport).toHaveBeenCalledOnce();
    expect(h.transport).toHaveBeenCalledWith(URL_A, expect.objectContaining({ a: action, admin: 'admin-a', [action === 'clonepack' ? 'sourceId' : 'id']: PACK_ID }));
    expect(h.deps.setMbPanelOpen).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed link', { url: 'https://student.example.invalid/?allo_mbp=broken' }],
    ['mismatched id', { packId: 'PK-ffffffff-aaaa-bbbb-cccc-dddddddddddd' }],
    ['mismatched secret', { packSecret: 'another_reading_secret_20' }],
  ])('refuses to revoke a %s without sending credentials', async (_name, overrides) => {
    const h = harness({ share: savedShare(overrides) });
    await h.handlers.revokeHomeworkAssignment(h.share);
    expect(h.transport).not.toHaveBeenCalled(); expect(h.deps.setConfirmDialog).not.toHaveBeenCalled();
    expect(h.deps.setMbPanelOpen).toHaveBeenCalledWith(true); expect(h.deps.setMbUrlInput).not.toHaveBeenCalled();
    expect(h.state.recent[0].revokedAt).toBeUndefined();
    expect(h.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('fresh homework link'), 'info');
  });

  it('captures the matching endpoint and token before revocation confirmation', async () => {
    const h = harness({ holdConfirmation: true });
    const running = h.handlers.revokeHomeworkAssignment(h.share);
    expect(h.state.confirmation).not.toBeNull();
    h.deps.mbConfig.url = URL_B; h.deps.mbConfig.admin = 'admin-b';
    h.state.confirmation.onConfirm(); await running;
    expect(h.transport).toHaveBeenCalledWith(URL_A, { a: 'delpack', admin: 'admin-a', id: PACK_ID });
    expect(h.state.recent[0].revokedAt).toEqual(expect.any(String));
  });

  it('uses the captured endpoint when constructing a duplicate after an asynchronous mailbox switch', async () => {
    let finish;
    const pending = new Promise(resolve => { finish = resolve; });
    const h = harness({ share: savedShare({ expired: true }), call: () => pending });
    const running = h.handlers.duplicateAssignmentCenterShare(h.share);
    h.deps.mbConfig.url = URL_B; h.deps.mbConfig.admin = 'admin-b';
    finish({ ok: true }); await running;
    expect(h.deps._buildAlloMailboxEntryUrl).toHaveBeenCalledWith('allo_mbp', expect.objectContaining({ u: URL_A, aiPolicy: 'off' }));
    expect(helpers._alloResolveHostedShareMailbox(h.state.opened[0]).url).toBe(URL_A);
  });

  it('retains cloud-assignment revocation without requiring a Class Mailbox target', async () => {
    const share = { type: 'assignment', url: 'https://student.example.invalid/?allo_assignment=cloud', assignmentId: 'cloud', hostAppId: 'original-app' };
    const h = harness({ share, configuredUrl: URL_B });
    await h.handlers.revokeHomeworkAssignment(share);
    expect(h.deps._alloResolveHostedShareMailbox).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
    expect(h.deps.doc).toHaveBeenCalledWith(h.deps.db, 'artifacts', 'original-app', 'public', 'data', 'sessions', 'cloud');
    expect(h.deps.deleteDoc).toHaveBeenCalledOnce(); expect(h.state.recent[0].revokedAt).toEqual(expect.any(String));
  });

  it('prevents false revocation with two actual mailbox servers, then revokes after reconnecting to the owner', async () => {
    const fixture = readFileSync('tests/class_mailbox.test.js', 'utf8');
    const from = fixture.indexOf('function makeGsSandbox()'), to = fixture.indexOf("describe('Code.gs protocol", from);
    if (from < 0 || to < from) throw Error('Missing local Google-service fixture boundaries');
    const makeSandbox = new Function('gsSource', fixture.slice(from, to) + '; return makeGsSandbox;')(readFileSync('apps_script/session_mailbox/Code.gs', 'utf8'));
    const owner = makeSandbox(), other = makeSandbox();
    const ownerAdmin = owner.call({ a: 'claim' }).admin, otherAdmin = other.call({ a: 'claim' }).admin;
    const share = savedShare();
    expect(owner.call({ a: 'putpack', admin: ownerAdmin, id: PACK_ID, k: SECRET, part: 1, of: 1, data: 'original-content', expiresAt: share.expiresAt }).ok).toBe(true);
    // Idempotent deletion is legitimate on the server, but cannot prove that a
    // client contacted the mailbox that actually owns this saved link.
    expect(other.call({ a: 'delpack', admin: otherAdmin, id: PACK_ID }).ok).toBe(true);
    const h = harness({ share, configuredUrl: URL_B, call: (url, payload) => (url === URL_A ? owner : other).call(payload) });
    h.deps.mbConfig.admin = otherAdmin;
    await h.handlers.revokeHomeworkAssignment(share);
    expect(h.transport).not.toHaveBeenCalled(); expect(h.state.recent[0].revokedAt).toBeUndefined();
    expect(owner.call({ a: 'getpack', id: PACK_ID, k: SECRET }).ok).toBe(true);
    h.deps.mbConfig = { url: URL_A, admin: ownerAdmin, v: 24 };
    await h.handlers.revokeHomeworkAssignment(share);
    expect(owner.call({ a: 'getpack', id: PACK_ID, k: SECRET }).e).toBe('no-pack');
    expect(h.state.recent[0].revokedAt).toEqual(expect.any(String));
  });
});
