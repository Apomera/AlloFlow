// Homework QR dialog, Class Mailbox setup and End Session review render their
// copy through the translator instead of hard-coded English.
// FIX0927_SSS_MOD / FIX0927_ESP_MOD point at saved pre-fix modules.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, api, EndSessionPreview, root, host;
const mark = (key) => '[' + key + ']';

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  for (const name of ['ShareSessionSurfaces', 'HomeworkQrDialogView', 'ClassMailboxSetupView', 'EndSessionPreview']) delete window.AlloModules[name];
  new Function(readFileSync(process.env.FIX0927_SSS_MOD || 'view_share_session_surfaces_module.js', 'utf8'))();
  new Function(readFileSync(process.env.FIX0927_ESP_MOD || 'view_end_session_preview_module.js', 'utf8'))();
  api = window.AlloModules;
  EndSessionPreview = window.AlloModules.EndSessionPreview.EndSessionPreview;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; if (host) host.remove(); host = null;
  delete window.__alloT;
  vi.restoreAllMocks();
});
async function render(Component, props) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Component, props)); });
  return host;
}
const Icon = () => null;
const icons = Object.fromEntries(['BookOpen', 'ClipboardList', 'Copy', 'ExternalLink', 'Eye', 'EyeOff', 'FolderDown', 'Maximize', 'Printer', 'Share2', 'Sparkles', 'Trash2', 'X'].map((name) => [name, Icon]));
const homework = (modal, extra = {}) => ({ ...icons, SharedAssignmentActivityPanel: () => null, addToast() {}, copyToClipboard() {}, createSelfContainedHomeworkLink() {}, homeworkQrDialogRef: React.createRef(), hostPackOnMailbox() {}, mbBusy: false, mbConfig: null, printQrSheet: vi.fn(), qrShareError: false, qrShareModal: { title: 'Homework', resourceCount: 1, aiPolicy: 'off', url: 'https://example.edu/h', expiresAt: Date.now() + 86400000, ...modal }, qrShareSvg: '<svg></svg>', revokeHomeworkAssignment() {}, setQrShareModal() {}, t: mark, testHomeworkAsStudent() {}, ...extra });

describe('homework QR dialog copy is translatable', () => {
  it('routes titles, status, copy buttons and the printed sheet through t()', async () => {
    const props = homework({ type: 'assignment-pack', sizeChars: 9000 });
    const node = await render(api.HomeworkQrDialogView, props);
    const text = node.textContent;
    for (const key of ['share_collect.title_self_contained', 'share_collect.copy_self_contained_link', 'share_collect.ai_stays_off', 'share_collect.link_size_kb', 'share_collect.long_link_warning']) expect(text).toContain(mark(key));
    expect(text).not.toContain('Self-contained homework assignment');
    expect(text).not.toContain('Copy self-contained link');
    const print = Array.from(node.querySelectorAll('button')).find((button) => button.textContent.includes('print_qr'));
    await act(async () => { print.click(); });
    const [, , , subtitle] = props.printQrSheet.mock.calls[0];
    expect(subtitle).toContain(mark('share_collect.print_sheet_resources'));
    expect(subtitle).toContain(mark('share_collect.no_live_session'));
    expect(subtitle).not.toContain('No live session');
  });
  it('translates the hosted and plain variants', async () => {
    let node = await render(api.HomeworkQrDialogView, homework({ type: 'assignment-pack-hosted' }));
    expect(node.textContent).toContain(mark('share_collect.title_hosted'));
    expect(node.textContent).toContain(mark('share_collect.delete_from_drive_folder'));
    act(() => root.unmount()); root = null; host.remove();
    node = await render(api.HomeworkQrDialogView, homework({ type: 'assignment', noQr: true }));
    expect(node.textContent).toContain(mark('share_collect.link_ready'));
    expect(node.textContent).toContain(mark('share_collect.copy_homework_link'));
  });
});

describe('end session review copy is translatable', () => {
  it('translates activity kinds, group follow-ups and the copied brief', async () => {
    window.__alloT = (key) => mark(key);
    const copyToClipboard = vi.fn();
    const preview = { summary: { participants: {}, absentCodenames: [], unmatchedCodenames: [], insightBrief: { activityCount: 2, submissions: 3, revisions: 1, followUpCodenames: [], byKind: [{ kind: 'word_cloud', submitted: 1, invited: 2 }], evidenceCohorts: [], groups: [{ groupId: 'g1', followUpCount: 2 }], nextMoves: [] } }, busy: false, followUpBusy: '', followUpResourceId: '', followUpResources: [], followUpStatus: '', deliveryGuard: false, deliverySummary: null };
    const node = await render(EndSessionPreview, { preview, note: '', dialogRef: React.createRef(), canSaveSummary: true, groupNamesById: { g1: 'Blue table' }, copyToClipboard, getConnectedCount: () => 0, onFollowUpResourceChange() {}, onSendCohort() {}, onNoteChange() {}, onKeepOpen() {}, onComplete() {} });
    expect(node.textContent).toContain(mark('end_session.kind_word_cloud'));
    expect(node.textContent).toContain(mark('end_session.group_follow_up'));
    expect(node.textContent).not.toContain('word cloud ·');
    const copy = Array.from(node.querySelectorAll('button')).find((button) => button.textContent.includes('copy_brief'));
    await act(async () => { copy.click(); });
    const brief = copyToClipboard.mock.calls[0][0];
    expect(brief).toContain(mark('end_session.brief_heading'));
    expect(brief).not.toContain('Live session insight brief');
  });
});
