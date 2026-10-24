import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let React, DOM, act, H, View, root, host, resource;
const profile = 'plan-recovery-learner', resourceKey = 'resource:plan-recovery';
const card = extra => ({ id: 'solid', target: 'Solid shape', type: 'keyword-association', mode: 'generated', essentialFacts: ['Solids keep their shape.'], factLocked: true, factVerified: true, aiExample: 'Solid statue keeps its shape.', mapping: 'The statue keeps its shape.', visualStatus: 'off', applicationQuestion: 'Give another example of a solid.', ...extra });
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  DOM = require(resolve('desktop/web-app/node_modules/react-dom/client'));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = execFileSync(process.execPath, ['-e', "const fs=require('fs');process.stdout.write(require('esbuild').transformSync(fs.readFileSync(0,'utf8'),{loader:'jsx',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',target:'es2020'}).code)"], { input: readFileSync(resolve('memory_aid_source.jsx'), 'utf8'), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  H = new Function('React', code + '\nreturn { View: MemoryAidView, create: createMemoryAidPracticeAttempt, normalize: normalizeMemoryAidPracticeAttempt, mutate: mutateMemoryAidPrivatePractice, load: loadMemoryAidPrivatePractice, key: memoryAidPrivatePracticeKey };')(React);
  View = H.View;
});
beforeEach(() => {
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (...args) => { const run = queue.then(args.at(-1)); queue = run.catch(() => {}); return run; } } });
});
afterEach(async () => {
  vi.restoreAllMocks(); if (root) await act(async () => root.unmount()); host?.remove(); root = host = null;
  window.localStorage.clear(); window.sessionStorage.clear(); delete navigator.locks;
});
const visible = node => node && !node.closest('[hidden]');
async function render(nextCard = card()) {
  resource = { id: 'plan-recovery', type: 'memory-aid', data: { schemaVersion: 2, resourceId: 'plan-recovery', title: 'Matter', authorshipMode: 'generated', cards: [nextCard] } };
  if (!host) { host = document.createElement('div'); document.body.append(host); root = DOM.createRoot(host); }
  await act(async () => root.render(React.createElement(View, { generatedContent: resource, isTeacherMode: false, activeProfileId: profile, handleNoteUpdate: () => {}, addToast: () => {} })));
}
async function click(text) { const button = [...host.querySelectorAll('button')].find(node => visible(node) && node.textContent === text); expect(button, text).toBeTruthy(); await act(async () => { button.click(); }); }
async function input(node, value) {
  expect(node).toBeTruthy(); const proto = node.tagName === 'INPUT' ? window.HTMLInputElement.prototype : node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLTextAreaElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
const stored = () => H.load(resourceKey, [card()], profile).solid?.[0];
async function seed(extra = {}) {
  const attempt = H.normalize({ ...H.create(card(), { response: 'A solid keeps its shape.', responseMode: 'written' }), factChecks: ['recalled'], applicationQuestion: card().applicationQuestion, applicationResponse: 'Original explanation', ...extra }, card(), 0);
  await H.mutate(resourceKey, { action: 'upsert-attempt', cardId: 'solid', attempt }, [card()], profile); return attempt;
}
async function remote(attempt, patch, notify = true) {
  await act(async () => {
    await H.mutate(resourceKey, { action: 'patch-followup', cardId: 'solid', attemptId: attempt.id, patch }, [card()], profile);
    if (notify) window.dispatchEvent(new StorageEvent('storage', { key: H.key(resourceKey, profile, 'profile', 2), storageArea: window.localStorage }));
  });
}
async function completeRecall() {
  await click('Try recall'); await click('Start recall practice');
  await input(host.querySelector('textarea[aria-label^="Recall response"]'), 'A solid keeps its shape.');
  await click('Reveal the facts'); await act(async () => host.querySelector('input[value="recalled"]').click());
}

describe('Memory Aid private plan persistence', () => {
  it('refreshes untouched active fields from another tab and explicit Save cannot restore old values', async () => {
    const attempt = await seed(); await render(); await click('Continue my application and plan');
    await remote(attempt, { applicationResponse: 'New explanation from another tab' });
    expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('New explanation from another tab');
    await click('Save private practice plan'); expect(stored().applicationResponse).toBe('New explanation from another tab');
  });
  it('explicit Save reads current values even before the storage event arrives', async () => {
    const attempt = await seed(); await render(); await click('Continue my application and plan');
    await remote(attempt, { applicationResponse: 'Remote replacement' }, false);
    await click('Save private practice plan'); expect(stored().applicationResponse).toBe('Remote replacement');
    expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('Remote replacement');
  });
  it('merges independent remote text and local date edits without overwriting either', async () => {
    const attempt = await seed(); await render(); await click('Continue my application and plan');
    await remote(attempt, { applicationResponse: 'Remote text' }, false);
    await input(host.querySelector('[aria-label="Review again on"]'), '2026-12-01'); await click('Save private practice plan');
    expect(stored()).toMatchObject({ applicationResponse: 'Remote text', nextReviewDate: '2026-12-01' });
  });
  it.each([false, true])('requires an explicit decision for same-field conflicts (keep local: %s)', async keepLocal => {
    const attempt = await seed(); await render(); await click('Continue my application and plan');
    await remote(attempt, { applicationResponse: 'Remote text' }, false);
    await input(host.querySelector('[aria-label="Your explanation"]'), 'Local text');
    expect(stored().applicationResponse).toBe('Remote text'); expect(host.textContent).toContain('changed in another tab');
    expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('Local text');
    await click(keepLocal ? 'Keep my changes' : 'Use saved plan');
    expect(stored().applicationResponse).toBe(keepLocal ? 'Local text' : 'Remote text');
    expect(host.querySelector('[aria-label="Your explanation"]').value).toBe(keepLocal ? 'Local text' : 'Remote text');
  });
  it('serializes rapid own writes without reporting a conflict against the previous keystroke', async () => {
    await seed(); await render(); await click('Continue my application and plan');
    let release; const held = new Promise(resolve => { release = resolve; }); let calls = 0;
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (...args) => { if (++calls === 1) await held; return args.at(-1)(); } } });
    await input(host.querySelector('[aria-label="Your explanation"]'), 'First edit');
    await input(host.querySelector('[aria-label="Your explanation"]'), 'Second edit');
    await act(async () => { release(); await held; });
    expect(stored().applicationResponse).toBe('Second edit'); expect(host.textContent).not.toContain('changed in another tab');
  });
  it('retries the first save for a fully recalled attempt after browser storage recovers', async () => {
    await render(); const failure = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage unavailable'); });
    await completeRecall(); expect(stored()).toBeUndefined(); expect(host.textContent).toContain('available only in the current view');
    failure.mockRestore(); await click('Save private practice plan');
    expect(stored().response).toBe('A solid keeps its shape.'); expect(host.textContent).toContain('Private practice plan saved.');
  });
  it('recovers new attempt and pending follow-up text together', async () => {
    await render(); const failure = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage unavailable'); });
    await completeRecall(); await input(host.querySelector('[aria-label="Your explanation"]'), 'My unsaved explanation');
    failure.mockRestore(); await click('Save private practice plan'); expect(stored().applicationResponse).toBe('My unsaved explanation');
  });
  it('never recreates an attempt deliberately deleted by another tab', async () => {
    const attempt = await seed(); await render(); await click('Continue my application and plan');
    await H.mutate(resourceKey, { action: 'delete-attempt', cardId: 'solid', attemptId: attempt.id }, [card()], profile);
    await input(host.querySelector('[aria-label="Your explanation"]'), 'Still local'); await click('Save private practice plan');
    expect(stored()).toBeUndefined(); expect(host.textContent).toContain('will not recreate a removed attempt');
  });
  it('does not recreate an already persisted attempt when its storage record disappears', async () => {
    await render(); await completeRecall(); window.localStorage.clear(); window.sessionStorage.clear();
    await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: window.localStorage })));
    await click('Save private practice plan'); expect(stored()).toBeUndefined();
  });
});

describe('Memory Aid application question ownership', () => {
  it('does not show an earlier answer, reveal, or self-check under a changed question', async () => {
    await seed({ applicationRevealed: true, applicationCheck: 'connected' }); await render(); await click('Continue my application and plan');
    await render(card({ applicationQuestion: 'Explain a different situation.' }));
    expect(host.querySelector('[aria-label="Your explanation"]').value).toBe('');
    expect(host.querySelector('[aria-label="How did your explanation connect?"]')).toBeNull();
    expect(host.textContent).toContain('Original explanation');
    await input(host.querySelector('[aria-label="Your explanation"]'), 'Answer to the new situation');
    expect(stored()).toMatchObject({ applicationQuestion: 'Explain a different situation.', applicationResponse: 'Answer to the new situation', applicationRevealed: false, applicationCheck: '' });
    expect(stored().applicationHistory).toContainEqual(expect.objectContaining({ applicationQuestion: card().applicationQuestion, applicationResponse: 'Original explanation' }));
    expect(host.textContent).toContain('Original explanation');
  });
  it('preserves unsaved earlier-question text when storage fails and the question changes', async () => {
    await seed(); await render(); await click('Continue my application and plan');
    const failure = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage unavailable'); });
    await input(host.querySelector('[aria-label="Your explanation"]'), 'Unsaved earlier answer');
    await render(card({ applicationQuestion: 'New question' }));
    expect(host.querySelector('[aria-label="Your explanation"]').value).toBe(''); expect(host.textContent).toContain('Unsaved earlier answer');
    await input(host.querySelector('[aria-label="Your explanation"]'), 'New answer'); failure.mockRestore(); await click('Save private practice plan');
    expect(stored()).toMatchObject({ applicationQuestion: 'New question', applicationResponse: 'New answer' });
    expect(stored().applicationHistory.some(item => item.applicationResponse === 'Unsaved earlier answer')).toBe(true);
  });
  it('bounds normalized application history and strips unknown fields', () => {
    const attempt = H.create(card(), { response: 'Recall' });
    const normalized = H.normalize({ ...attempt, applicationHistory: Array.from({ length: 12 }, (_, index) => ({ applicationQuestion: 'Q' + index, applicationResponse: 'A' + index, secret: 'omit' })) }, card(), 0);
    expect(normalized.applicationHistory).toHaveLength(8); expect(JSON.stringify(normalized.applicationHistory)).not.toContain('secret');
  });
});
