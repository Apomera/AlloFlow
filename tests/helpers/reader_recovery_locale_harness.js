// Uses the current source and embedded store in memory; no generated production files are written.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { React, setupReader, fixtures as baseFixtures, mountReader, disposeReader, act, click } from './reader_locale_harness.js';
export { mountReader, disposeReader, act, click };
const require = createRequire(import.meta.url);
export const storageKey = 'alloflow_reading_places_v1';
export const recoveryFixtures = JSON.parse(readFileSync('tests/fixtures/reader_recovery_locales.json', 'utf8')).map(f => ({ ...baseFixtures.find(base => base.id === f.baseFixture), ...f }));
let factory;
export function setupRecoveryReader() {
  setupReader();
  const source = ['reader_place_store.js', 'reader_support_drafts.js', 'view_simplified_source.jsx'].map(file => readFileSync(file, 'utf8')).join('\n');
  const compiled = require('@babel/core').transformSync(source, { plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] } }).code;
  factory = new Function('React', 'Fragment', compiled + '\nreturn SimplifiedView;');
}
export function resetRecoveryReader() {
  window.AlloModules.SimplifiedView = factory(React, React.Fragment);
  setupReader(); // Updates the shared harness binding; module loading is cached by tests/setup.js.
}
export function prepareRecoveryCase() {
  localStorage.clear();
  resetRecoveryReader();
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } } });
}
export function cleanupRecoveryCase() { disposeReader(); vi.restoreAllMocks(); delete navigator.locks; }
export async function typeAnswer(node, value) {
  if (!node) throw Error('Expected the answer textarea');
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
export async function openPrompts(view) { await click(view.host.querySelector('[data-section-prompts-toggle]')); return view.host.querySelector('[data-section-prompt="mainIdea"]'); }
export function failWrites() {
  const original = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === storageKey) throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, key, value); });
}
export const reasonKeys = { conflict: 'place_save_conflict', 'version-conflict': 'place_save_version_conflict', 'corrupt-store': 'place_save_corrupt', 'too-large': 'place_save_large', capacity: 'place_save_capacity', 'coordination-unavailable': 'place_save_coordination' };
export async function openRecoveryFailure(fixture, reason) {
  if (reason === 'corrupt-store') localStorage.setItem(storageKey, '{invalid');
  if (reason === 'coordination-unavailable') delete navigator.locks;
  // Full: the store holds 400 rows, and answers untouched for 180 days may make room, so these are recent.
  if (reason === 'capacity') localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(Array.from({ length: 400 }, (_, i) => ['another-learner|reading-' + i + '|version', { responses: { 0: { mainIdea: 'Protected answer ' + i } }, at: Date.now() - i }]))));
  let view = mountReader(fixture), input = await openPrompts(view);
  if (reason === 'conflict' || reason === 'version-conflict') {
    await typeAnswer(input, 'Previously saved');
    const rows = JSON.parse(localStorage.getItem(storageKey)), row = Object.values(rows)[0];
    if (reason === 'conflict') row.responses[0].mainIdea = 'Other tab answer';
    else row.sourceText = 'A different passage under the same record key';
    localStorage.setItem(storageKey, JSON.stringify(rows));
    if (reason === 'version-conflict') { disposeReader(); resetRecoveryReader(); view = mountReader(fixture); input = await openPrompts(view); }
  }
  const durableBefore = localStorage.getItem(storageKey);
  const answer = reason === 'too-large' ? fixture.answer.repeat(Math.ceil(16001 / fixture.answer.length)) : fixture.answer;
  await typeAnswer(input, answer);
  return { ...view, answer, durableBefore };
}
