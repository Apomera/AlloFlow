import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const profile = 'plan-continuation-learner', resourceKey = 'resource:plan-continuation';
let React, DOM, act, H, root, host;
const card = { id: 'solid', target: 'Solid shape', type: 'keyword-association', mode: 'generated', essentialFacts: ['Solids keep their shape.'], factLocked: true, factVerified: true, aiExample: 'Solid statue keeps its shape.', mapping: 'The statue keeps its shape.', visualStatus: 'off', applicationQuestion: 'Give another example of a solid.' };
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react')); DOM = require(resolve('desktop/web-app/node_modules/react-dom/client'));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').transformSync(require('fs').readFileSync(0,'utf8'),{loader:'jsx',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',target:'es2020'}).code)"], { input: readFileSync(resolve('memory_aid_source.jsx'), 'utf8'), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  H = new Function('React', code + '\nreturn {View:MemoryAidView,create:createMemoryAidPracticeAttempt,normalize:normalizeMemoryAidPracticeAttempt,mutate:mutateMemoryAidPrivatePractice,load:loadMemoryAidPrivatePractice,key:memoryAidPrivatePracticeKey};')(React);
}, 120000);
beforeEach(() => {
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (...args) => { const result = queue.then(args.at(-1)); queue = result.catch(() => {}); return result; } } });
});
afterEach(async () => { vi.restoreAllMocks(); if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; window.localStorage.clear(); window.sessionStorage.clear(); delete navigator.locks; });
const visible = node => node && !node.closest('[hidden]');
const button = label => [...host.querySelectorAll('button')].find(node => visible(node) && node.textContent === label);
const explanation = () => host.querySelector('[aria-label="Your explanation"]');
const comparison = () => [...host.querySelectorAll('[role="alert"]')].find(node => visible(node) && node.textContent.includes('Saved version:'));
const stored = () => H.load(resourceKey, [card], profile).solid?.[0];
async function click(label) { expect(button(label), label).toBeTruthy(); await act(async () => button(label).click()); }
async function input(node, value) {
  const proto = node.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function seedAndOpen() {
  const attempt = H.normalize({ ...H.create(card, { response: 'Solids keep their shape.' }), factChecks: ['recalled'], applicationQuestion: card.applicationQuestion, applicationResponse: 'Original explanation', applicationHistory: [{ applicationQuestion: 'Earlier question', applicationResponse: 'Earlier answer' }] }, card, 0);
  await H.mutate(resourceKey, { action: 'upsert-attempt', cardId: card.id, attempt }, [card], profile);
  host = document.createElement('div'); document.body.append(host); root = DOM.createRoot(host);
  await act(async () => root.render(React.createElement(H.View, { generatedContent: { id: 'plan-continuation', type: 'memory-aid', data: { schemaVersion: 2, resourceId: 'plan-continuation', title: 'Matter', authorshipMode: 'generated', cards: [card] } }, isTeacherMode: false, activeProfileId: profile, handleNoteUpdate: () => {}, addToast: () => {} })));
  await click('Continue my application and plan'); return attempt;
}
async function remote(attempt, patch, notify = false) {
  await act(async () => {
    await H.mutate(resourceKey, { action: 'patch-followup', cardId: card.id, attemptId: attempt.id, patch }, [card], profile);
    if (notify) window.dispatchEvent(new StorageEvent('storage', { key: H.key(resourceKey, profile, 'profile', 2), storageArea: window.localStorage }));
  });
}
async function reopen() { await click('Return to card'); await click('Continue my application and plan'); }
async function conflict(attempt) { await remote(attempt, { applicationResponse: 'Remote version one' }); await input(explanation(), 'My pending explanation'); expect(comparison()).toBeTruthy(); }

describe('Memory Aid plan continuation', () => {
  it.each([true, false])('restores pending text and conflict controls after reopening (keep mine: %s)', async keepMine => {
    const attempt = await seedAndOpen(); await conflict(attempt); await reopen();
    expect(explanation().value).toBe('My pending explanation'); expect(comparison().textContent).toContain('Remote version one');
    expect(host.textContent).not.toContain('Private practice plan saved.'); expect(button('Save private practice plan').disabled).toBe(true);
    await click(keepMine ? 'Keep my changes' : 'Use saved plan');
    expect(stored().applicationResponse).toBe(keepMine ? 'My pending explanation' : 'Remote version one');
    expect(comparison()).toBeUndefined(); expect(host.textContent).toContain('Private practice plan saved.');
  });
  it('restores all pending edits and error status after a failed save, then retries them visibly', async () => {
    await seedAndOpen();
    const failing = vi.spyOn(window.Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Temporary storage failure'); });
    await input(explanation(), 'My unsaved explanation'); await input(host.querySelector('[aria-label="Review again on"]'), '2026-12-07');
    failing.mockRestore(); await reopen();
    expect(explanation().value).toBe('My unsaved explanation'); expect(host.querySelector('[aria-label="Review again on"]').value).toBe('2026-12-07');
    expect(host.textContent).toContain('Could not save these changes'); expect(host.textContent).not.toContain('Private practice plan saved.');
    await click('Save private practice plan'); expect(stored()).toMatchObject({ applicationResponse: 'My unsaved explanation', nextReviewDate: '2026-12-07' });
    expect(stored().applicationHistory).toContainEqual(expect.objectContaining({ applicationQuestion: 'Earlier question', applicationResponse: 'Earlier answer' }));
  });
  it('restores a save in flight and finishes it in the reopened plan', async () => {
    await seedAndOpen(); let release; const held = new Promise(resolve => { release = resolve; });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (...args) => { await held; return args.at(-1)(); } } });
    await input(explanation(), 'Saving while away'); await reopen();
    expect(explanation().value).toBe('Saving while away'); expect(button('Saving…').disabled).toBe(true);
    await act(async () => { release(); await held; }); expect(stored().applicationResponse).toBe('Saving while away');
    expect(host.textContent).toContain('Private practice plan saved.');
  });
  it('does not recreate a deleted attempt when resolving a reopened conflict', async () => {
    const attempt = await seedAndOpen(); await conflict(attempt); await click('Return to card');
    await H.mutate(resourceKey, { action: 'delete-attempt', cardId: card.id, attemptId: attempt.id }, [card], profile);
    await click('Continue my application and plan'); await click('Keep my changes');
    expect(stored()).toBeUndefined(); expect(host.textContent).toContain('will not recreate a removed attempt');
  });
});

describe('Memory Aid conflict comparison ownership', () => {
  it.each([true, false])('requires a new decision if the compared value changes again (storage event: %s)', async notify => {
    const attempt = await seedAndOpen(); await conflict(attempt);
    await remote(attempt, { applicationResponse: 'Remote version two' }, notify);
    await click('Keep my changes');
    expect(stored().applicationResponse).toBe('Remote version two'); expect(comparison().textContent).toContain('Remote version two');
    expect(comparison().textContent).not.toContain('Remote version one'); expect(host.textContent).toContain('The saved plan changed again.');
    expect(explanation().value).toBe('My pending explanation');
    await reopen(); expect(comparison().textContent).toContain('Remote version two'); expect(host.textContent).toContain('The saved plan changed again.');
    await click('Keep my changes'); expect(stored().applicationResponse).toBe('My pending explanation');
  });
  it('preserves independent fields changed remotely while resolving a text conflict', async () => {
    const attempt = await seedAndOpen(); await conflict(attempt);
    await remote(attempt, { nextReviewDate: '2026-12-09', reviewSchedule: 'date' }, true);
    await click('Keep my changes');
    expect(stored()).toMatchObject({ applicationResponse: 'My pending explanation', nextReviewDate: '2026-12-09' });
    expect(comparison()).toBeUndefined();
  });
  it('still detects a new writer after the decision but before the storage lock is acquired', async () => {
    const attempt = await seedAndOpen(); await conflict(attempt);
    let release; const held = new Promise(resolve => { release = resolve; });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (...args) => { await held; return args.at(-1)(); } } });
    await click('Keep my changes');
    const key = H.key(resourceKey, profile, 'profile', 2), payload = JSON.parse(window.localStorage.getItem(key));
    payload.cards.solid[0].applicationResponse = 'Another writer won the lock'; payload.updatedAt += 1;
    window.localStorage.setItem(key, JSON.stringify(payload));
    await act(async () => { release(); await held; });
    expect(stored().applicationResponse).toBe('Another writer won the lock');
    expect(comparison().textContent).toContain('Another writer won the lock'); expect(explanation().value).toBe('My pending explanation');
  });
});
