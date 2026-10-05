'use strict';

// Native Node runner: real React/jsdom + the complete production module in a VM.
// No Vitest worker, source rewrite, copied restore handler, or timer-based race.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const repo = path.resolve(__dirname, '../../..');
const sourcePath = path.resolve(process.env.STUDIO_RESPONSE_SOURCE || path.join(repo, 'studio_response_module.js'));
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
const desktopRequire = createRequire(path.join(repo, 'desktop/web-app/package.json'));
const { JSDOM } = desktopRequire('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/app/' });
const savedGlobals = new Map();
for (const [key, value] of Object.entries({
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, Node: dom.window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
const React = desktopRequire('react');
const { createRoot } = desktopRequire('react-dom/client');
const act = React.act || desktopRequire('react-dom/test-utils').act;
dom.window.React = React;
vm.runInNewContext(source, {
  window: dom.window, document: dom.window.document, Blob: globalThis.Blob,
  URL: dom.window.URL, setTimeout, clearTimeout, console,
}, { filename: sourcePath });
const api = dom.window.AlloModules.StudioResponse;
assert.equal(typeof api?.Boundary, 'function', 'Load the real exported Boundary');
assert.equal(typeof api?.serializeBackup, 'function', 'Load the real backup validator/serializer');

const RESTORED = 'Backup restored to this workspace. Check the save status before leaving.';
const INVALID = 'Choose a text backup downloaded from this resource. Your current work has not changed.';
const DEFAULT = 'Text backup: writing and feedback only. Images and recordings are not included. This does not submit your work.';
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function resource(id = 'studio-a') {
  return { id, type: 'applied-challenge', title: 'Controlled Studio resource', data: {
    workspace: { response: '' }, sourceRecords: [], reasoningReferences: [], evidenceLedger: [],
    criteriaCheck: {}, validationCycles: [], feedback: null, stressTest: null, coachHint: '',
  } };
}
function file(text, size = 100) {
  return { name: 'alloflow-my-work.json', size, text: typeof text === 'function' ? text : () => Promise.resolve(text) };
}
async function mount() {
  const item = resource(), host = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(host);
  const root = createRoot(host), writes = [];
  let latestResponse, isMounted = true;
  function View(props) {
    return React.createElement('button', {
      type: 'button', 'data-edit-work': true,
      onClick: () => props.handleNoteUpdate('workspace', { response: 'Edited during file read' }),
    }, 'Edit learner work');
  }
  function Harness() {
    const [responses, setResponses] = React.useState({});
    latestResponse = responses[item.id]?.studio;
    return React.createElement(api.Boundary, {
      View, generatedContent: item, studentResponses: responses, studentWorkStatus: 'saved',
      isTeacherMode: false, activeProfileId: 'profile-a', handleNoteUpdate: () => {},
      onResponseChange: (id, response) => {
        writes.push({ id, response });
        setResponses(prior => ({ ...prior, [id]: { studio: response } }));
      },
    });
  }
  await act(async () => root.render(React.createElement(Harness)));
  const status = () => {
    const node = host.querySelector('.studio-recovery p[role="status"]');
    assert.ok(node, 'Render the real restore feedback element');
    return node.textContent;
  };
  const choose = async chosenFile => {
    const input = host.querySelector('input[type="file"]');
    assert.ok(input, 'Render the real file input and onChange handler');
    Object.defineProperty(input, 'files', { configurable: true, value: chosenFile ? [chosenFile] : [] });
    await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
    assert.equal(input.value, '', 'Restore resets the picker so the same file can be selected again');
  };
  const settle = async (pending, value, reject = false) => {
    await act(async () => {
      if (reject) pending.reject(value); else pending.resolve(value);
      await Promise.resolve();
    });
  };
  const textBackup = text => {
    const response = api.emptyResponse(item);
    response.workspace = { response: text };
    return api.serializeBackup(item, response);
  };
  return {
    item, host, writes, status, choose, settle, textBackup,
    response: () => latestResponse,
    edit: async () => act(async () => host.querySelector('[data-edit-work]').click()),
    unmount: async () => {
      if (isMounted) { await act(async () => root.unmount()); isMounted = false; }
      host.remove();
    },
  };
}

const cases = [
  ['current valid restore applies real validated writing and success feedback', async h => {
    await h.choose(file(h.textBackup('Current valid backup')));
    assert.equal(h.writes.length, 1);
    assert.equal(h.writes[0].id, h.item.id);
    assert.equal(h.response().workspace.response, 'Current valid backup');
    assert.equal(h.status(), RESTORED);
  }],
  ['current invalid restore preserves writing and reports the actual failure', async h => {
    await h.edit();
    await h.choose(file('{ invalid json'));
    assert.equal(h.writes.length, 1, 'Only the deliberate learner edit writes');
    assert.equal(h.response().workspace.response, 'Edited during file read');
    assert.equal(h.status(), INVALID);
  }],
  ['oversized current restore never reads the file or changes work', async h => {
    let reads = 0;
    await h.choose(file(() => { reads += 1; return Promise.resolve(h.textBackup('Too large')); }, api.maxBackupBytes + 1));
    assert.equal(reads, 0);
    assert.equal(h.writes.length, 0);
    assert.equal(h.status(), INVALID);
  }],
  ['learner edit during restore is preserved and retains current failure feedback', async h => {
    const pending = deferred();
    await h.choose(file(() => pending.promise));
    await h.edit();
    await h.settle(pending, h.textBackup('Obsolete imported writing'));
    assert.equal(h.writes.length, 1, 'Only the learner edit writes');
    assert.equal(h.response().workspace.response, 'Edited during file read');
    assert.equal(h.status(), INVALID);
  }],
  ['unmount retires a deferred restore before any response write', async h => {
    const pending = deferred();
    await h.choose(file(() => pending.promise));
    await h.unmount();
    await h.settle(pending, h.textBackup('After unmount'));
    assert.equal(h.writes.length, 0);
  }],
  ['older file read rejection cannot overwrite newer successful restore feedback', async h => {
    const older = deferred();
    await h.choose(file(() => older.promise));
    await h.choose(file(h.textBackup('Newest successful backup')));
    assert.equal(h.status(), RESTORED, 'The newer restore first completes normally');
    await h.settle(older, new Error('Delayed old file read failure'), true);
    assert.equal(h.writes.length, 1);
    assert.equal(h.response().workspace.response, 'Newest successful backup');
    assert.equal(h.status(), RESTORED, 'The newest attempt owns feedback');
  }],
  ['older valid backup cannot apply after a newer invalid restore selection', async h => {
    const older = deferred();
    await h.choose(file(() => older.promise));
    await h.choose(file('{ newest selected backup is invalid'));
    assert.equal(h.status(), INVALID, 'The newer selection reports its own failure');
    await h.settle(older, h.textBackup('Older valid backup'));
    assert.equal(h.writes.length, 0, 'Selecting a newer file retires the older attempt even if the new file is invalid');
    assert.equal(h.response(), undefined);
    assert.equal(h.status(), INVALID);
  }],
  ['older valid completion waits out of the way of a newer pending valid attempt', async h => {
    const older = deferred(), newer = deferred();
    await h.choose(file(() => older.promise));
    await h.choose(file(() => newer.promise));
    await h.settle(older, h.textBackup('Older overlapping backup'));
    const intermediate = { writes: h.writes.length, status: h.status() };
    await h.settle(newer, h.textBackup('Newest overlapping backup'));
    assert.equal(intermediate.writes, 0, 'An older attempt cannot write while a newer read is pending');
    assert.equal(intermediate.status, DEFAULT, 'An older completion cannot announce success for the pending newer read');
    assert.equal(h.writes.length, 1);
    assert.equal(h.response().workspace.response, 'Newest overlapping backup');
    assert.equal(h.status(), RESTORED);
  }],
  ['older valid completion after a newer success cannot replace its feedback', async h => {
    const older = deferred();
    await h.choose(file(() => older.promise));
    await h.choose(file(h.textBackup('Latest completed backup')));
    await h.settle(older, h.textBackup('Old delayed backup'));
    assert.equal(h.writes.length, 1, 'The existing response guard already blocks stale content');
    assert.equal(h.response().workspace.response, 'Latest completed backup');
    assert.equal(h.status(), RESTORED, 'The old work-changed catch must not replace newer success');
  }],
];

async function main() {
  const results = [];
  try {
    for (const [name, body] of cases) {
      let h;
      try {
        h = await mount();
        await body(h);
        results.push({ name, status: 'passed' });
      } catch (error) {
        results.push({ name, status: 'failed', message: error.message, stack: error.stack });
      } finally {
        if (h) await h.unmount();
      }
    }
  } finally {
    dom.window.close();
    for (const [key, descriptor] of savedGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
  const receipt = {
    runner: 'native-node-real-react-jsdom-vm-module', sourcePath, sourceSha256: sourceHash,
    total: results.length, passed: results.filter(row => row.status === 'passed').length,
    failed: results.filter(row => row.status === 'failed').length, results,
  };
  const serialized = JSON.stringify(receipt, null, 2) + '\n';
  if (process.env.STUDIO_RESTORE_RESULT) fs.writeFileSync(path.resolve(process.env.STUDIO_RESTORE_RESULT), serialized);
  process.stdout.write(serialized);
  process.exitCode = receipt.failed ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
