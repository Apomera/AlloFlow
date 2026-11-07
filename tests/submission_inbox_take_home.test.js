// Submission Inbox: Word Sounds take-home results. A take-home file either
// saves a results file or sends the same result through the Class Mailbox
// (submission-*.json in the teacher's Drive). Both import into the real inbox,
// render per activity, and a second copy of the same attempt is not added.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, ReactDOMClient, SubmissionInbox, root, host;

const result = {
  kind: 'alloflow-take-home-result', schemaVersion: 2, lessonId: 'ws-L1', revision: 'r1', lessonTitle: 'Short a',
  activityTitles: { isolation: 'Find Sounds', blending: 'Blending' },
  learnerName: 'Ana', finishedAt: '2026-11-07T15:00:00.000Z',
  items: [
    { activity: 'isolation', word: 'cat', attempts: 1, firstTry: true, correct: true, done: true, responses: ['k'] },
    { activity: 'isolation', word: 'map', attempts: 2, firstTry: false, correct: true, done: true, responses: ['m', 'p'] },
    { activity: 'blending', word: 'sun', attempts: 2, firstTry: false, correct: false, done: true, responses: ['sit', 'sat'] },
    { activity: 'blending', word: 'dog', done: false, responses: [] },
  ],
};
const mailboxCopy = { kind: 'alloflow-take-home-submission', schemaVersion: 1, studentName: 'Ana', takeHomeResult: result,
  mailboxReceipt: { sourceKind: 'homework', sourceId: 'PK-x', receivedAt: '2026-11-07T15:01:00.000Z' } };

const tick = () => new Promise((r) => setTimeout(r, 0));
async function mount() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => {
    root.render(React.createElement(SubmissionInbox, { isOpen: true, onClose: vi.fn(), rosterKey: '', t: (k, f) => f || k, addToast: vi.fn() }));
    await tick();
  });
}
async function importFiles(files) {
  const input = host.querySelector('input[type="file"][aria-label="Submission files"]');
  expect(input).toBeTruthy();
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  await React.act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); for (let i = 0; i < 6; i++) await tick(); });
}
const json = (name, value) => new File([JSON.stringify(value)], name, { type: 'application/json' });
const rowButtons = () => [...host.querySelectorAll('button[aria-controls^="submission-inbox-row-details-"]')];

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  const ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
  ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = ReactDOM;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_submission_inbox_module.js');
  SubmissionInbox = window.AlloModules.SubmissionInbox?.SubmissionInbox;
  expect(SubmissionInbox).toBeTypeOf('function');
  // The inbox loads the take-home reader on demand; give it the real one.
  window.__alloLoadPlugin = vi.fn(async (file) => {
    if (file !== 'word_sounds_take_home_loader.js') return false;
    new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
    return true;
  });
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove();
  root = null; host = null;
});

describe('take-home results in the Submission Inbox', () => {
  it('imports a saved results file and shows each activity', async () => {
    delete window.AlloWordSoundsTakeHome;
    await mount();
    await importFiles([json('ana-results.json', result)]);
    expect(window.__alloLoadPlugin).toHaveBeenCalledWith('word_sounds_take_home_loader.js');
    expect(host.textContent).toContain('Ana');
    expect(host.textContent).toContain('Short a');
    const expand = rowButtons()[0];
    await React.act(async () => { expand.click(); await tick(); });
    const section = host.querySelector('[data-si-take-home]');
    expect(section).toBeTruthy();
    expect(section.textContent).toContain('1 of 4 right on the first try');
    expect(section.textContent).toContain('1 right after a retry, 1 missed, 1 not done');
    expect(section.textContent).toContain('Find Sounds');
    expect(section.textContent).toContain('map ↻ (m, p)');
    expect(section.textContent).toContain('dog –');
  });

  it('imports the mailbox copy from Drive, and does not add the same attempt twice', async () => {
    await mount();
    await importFiles([json('submission-Ana-20261107.json', mailboxCopy), json('ana-results.json', result)]);
    expect(rowButtons()).toHaveLength(1);
    await importFiles([json('again.json', result)]);
    expect(rowButtons()).toHaveLength(1);
  });

  it('reports a damaged results file instead of guessing', async () => {
    await mount();
    await importFiles([json('broken.json', { ...result, items: null })]);
    expect(host.textContent).toContain('This Word Sounds results file could not be read.');
  });
});

describe('Get submissions from Class Mailbox', () => {
  const ben = { kind: 'alloflow-student-submission', studentName: 'Ben', docTitle: 'Worksheet', responses: { q1: 'yes' } };
  function fakeMailbox(files, extra = {}) {
    const api = {
      connected: true,
      openSetup: vi.fn(),
      pull: vi.fn(async ({ skip }) => ({ ok: true, files: files.filter(f => !skip.includes(f.name)), failed: [], more: 0, complete: true })),
      mark: vi.fn(async () => ({ ok: true })),
      ...extra,
    };
    window.__alloMailboxSubmissions = api;
    return api;
  }
  const pullButton = () => [...host.querySelectorAll('button')].find(b => /Get submissions from Class Mailbox/.test(b.textContent));
  const status = () => host.querySelector('[data-si-mailbox-status]').textContent;
  async function pull() {
    await React.act(async () => { pullButton().click(); for (let i = 0; i < 8; i++) await tick(); });
  }
  afterEach(() => { delete window.__alloMailboxSubmissions; });

  it('imports every new file, marks the clean ones collected, and skips them next time', async () => {
    const files = [
      { name: 'submission-Ana-1-aaaaaaaa.json', text: JSON.stringify(mailboxCopy) },
      { name: 'submission-Ben-2-bbbbbbbb.json', text: JSON.stringify(ben) },
      { name: 'submission-Bad-3-cccccccc.json', text: JSON.stringify({ ...mailboxCopy, takeHomeResult: { ...result, items: null } }) },
    ];
    const api = fakeMailbox(files);
    await mount();
    await pull();
    expect(api.pull).toHaveBeenCalledWith(expect.objectContaining({ all: false, skip: [] }));
    expect(rowButtons()).toHaveLength(2);
    expect(host.textContent).toContain('Ana');
    expect(host.textContent).toContain('Ben');
    expect(api.mark).toHaveBeenCalledWith(['submission-Ana-1-aaaaaaaa.json', 'submission-Ben-2-bbbbbbbb.json']);
    expect(status()).toContain('Added 2 submission(s)');
    expect(status()).toContain('1 file(s) could not be read');
    await pull();
    // Files already in the queue are not fetched again.
    expect(api.pull.mock.calls[1][0].skip).toEqual(expect.arrayContaining(['submission-Ana-1-aaaaaaaa.json', 'submission-Ben-2-bbbbbbbb.json']));
    expect(rowButtons()).toHaveLength(2);
  });

  it('does not add a mailbox copy of an attempt already opened from a saved file', async () => {
    const api = fakeMailbox([{ name: 'submission-Ana-1-aaaaaaaa.json', text: JSON.stringify(mailboxCopy) }]);
    await mount();
    await importFiles([json('ana-results.json', result)]);
    await pull();
    expect(rowButtons()).toHaveLength(1);
    // A duplicate is still collected, so it stops showing as new.
    expect(api.mark).toHaveBeenCalledWith(['submission-Ana-1-aaaaaaaa.json']);
  });

  it('explains an outdated mailbox script and offers its setup', async () => {
    const api = fakeMailbox([], { pull: vi.fn(async () => ({ ok: false, e: 'update-needed', v: 28 })) });
    await mount();
    await pull();
    expect(status()).toContain('version 28');
    expect(status()).toContain('update it to version 29');
    const setup = [...host.querySelectorAll('button')].find(b => b.textContent === 'Open Class Mailbox setup');
    await React.act(async () => { setup.click(); await tick(); });
    expect(api.openSetup).toHaveBeenCalled();
    expect(api.mark).not.toHaveBeenCalled();
  });

  it('passes "include ones already collected" through, and offers to connect when no mailbox is set up', async () => {
    const api = fakeMailbox([]);
    await mount();
    const box = [...host.querySelectorAll('label')].find(l => /Include ones already collected/.test(l.textContent)).querySelector('input');
    await React.act(async () => { box.click(); await tick(); });
    await pull();
    expect(api.pull).toHaveBeenCalledWith(expect.objectContaining({ all: true, rescan: true }));
    expect(status()).toContain('No new submissions');
    await React.act(async () => root.unmount());
    root = null; host.remove();
    window.__alloMailboxSubmissions = { connected: false, openSetup: vi.fn() };
    await mount();
    expect(pullButton()).toBeFalsy();
    const connect = [...host.querySelectorAll('button')].find(b => b.textContent === 'Connect Class Mailbox');
    await React.act(async () => { connect.click(); await tick(); });
    expect(window.__alloMailboxSubmissions.openSetup).toHaveBeenCalled();
  });
});
