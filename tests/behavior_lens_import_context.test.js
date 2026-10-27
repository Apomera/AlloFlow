import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const A = 'Synthetic Otter', B = 'Synthetic Beaver';
const record = id => ({ id, timestamp: '2026-10-26T12:00:00.000Z', antecedent: id, behavior: 'Synthetic observation', consequence: 'Synthetic support', intensity: 2 });
const key = id => 'behaviorLens_workspace_' + id;
let host, root, resumeRead, toasts;
const tick = () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
const saved = id => JSON.parse(localStorage.getItem(key(id)) || 'null');
async function select(name) {
  const input = host.querySelector('select[aria-label="Choose a student"]'); expect(input).toBeTruthy();
  await React.act(async () => { input.value = name; input.dispatchEvent(new Event('change', { bubbles: true })); });
  await tick();
}
async function beginImport() {
  const originalRead = FileReader.prototype.readAsText;
  vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (file) { resumeRead = () => originalRead.call(this, file); });
  const input = host.querySelector('input[aria-label="Load BehaviorLens workspace JSON file"]'); expect(input).toBeTruthy();
  const artifact = { student: A, exportDate: '2026-10-26T12:00:00.000Z', abcEntries: [record('imported-for-otter')], observationSessions: [] };
  Object.defineProperty(input, 'files', { value: [new File([JSON.stringify(artifact)], 'synthetic-report.json')], configurable: true });
  await React.act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  expect(resumeRead).toBeTypeOf('function');
}
async function finishImport(beforeConfirm) {
  await React.act(async () => { resumeRead(); await new Promise(resolve => setTimeout(resolve, 80)); });
  const confirmation = document.querySelector('[role="alertdialog"]');
  if (confirmation) {
    if (beforeConfirm) await beforeConfirm();
    const accept = [...confirmation.querySelectorAll('button')].find(button => button.textContent === 'Add records'); expect(accept).toBeTruthy();
    await React.act(async () => accept.click());
  }
  await tick();
}
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(async () => {
  toasts = vi.fn();
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('bl_onboarded', '1');
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'otter', name: A }, { id: 'beaver', name: B }]));
  for (const [id, student] of [['otter', A], ['beaver', B]]) localStorage.setItem(key(id), JSON.stringify({ version: 4, student, studentId: id, abcEntries: [record('existing-' + id)], observationSessions: [] }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: A, isCanvasEnv: true, isTeacherMode: true, addToast: toasts }))));
  await tick();
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; host?.remove(); vi.restoreAllMocks(); });
describe('BehaviorLens file import belongs to its initiating case', () => {
  it('adds an approved partial file while the original case remains selected', async () => {
    await beginImport(); await finishImport();
    expect(saved('otter').abcEntries.map(row => row.antecedent), JSON.stringify(toasts.mock.calls)).toContain('imported-for-otter');
    expect(saved('beaver').abcEntries.map(row => row.id)).toEqual(['existing-beaver']);
  });
  it('does not merge a delayed file into the newly selected case', async () => {
    await beginImport(); await select(B); await finishImport();
    expect(saved('beaver').abcEntries.map(row => row.id)).toEqual(['existing-beaver']);
    expect(saved('otter').abcEntries.map(row => row.id)).toEqual(['existing-otter']);
    expect(host.querySelector('select[aria-label="Choose a student"]').value).toBe(B);
  });
  it('does not revive an old import after switching away and back', async () => {
    await beginImport(); await select(B); await select(A); await finishImport();
    expect(saved('otter').abcEntries.map(row => row.id)).toEqual(['existing-otter']);
    expect(saved('beaver').abcEntries.map(row => row.id)).toEqual(['existing-beaver']);
  });
  it('rechecks the case after an asynchronous confirmation', async () => {
    await beginImport(); await finishImport(() => select(B));
    expect(saved('otter').abcEntries.map(row => row.id)).toEqual(['existing-otter']);
    expect(saved('beaver').abcEntries.map(row => row.id)).toEqual(['existing-beaver']);
  });
  it('ignores completion after the view unmounts', async () => {
    await beginImport(); await React.act(async () => root.unmount()); root = null;
    const calls = toasts.mock.calls.length; await finishImport();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(toasts).toHaveBeenCalledTimes(calls);
    expect(saved('otter').abcEntries.map(row => row.id)).toEqual(['existing-otter']);
  });
});
