import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from '../../tests/helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
let root, host;
const workspaceKey = 'behaviorLens_workspace_studenta001';
const record = { id: 'real-entry', timestamp: '2026-09-12T10:00:00.000Z', antecedent: 'Real antecedent', behavior: 'Real behavior', consequence: 'Real consequence', intensity: 2 };
const tick = async (ms = 10) => React.act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const click = async element => { expect(element).toBeTruthy(); await React.act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await tick(); };
const button = name => Array.from(host.querySelectorAll('button')).find(el => el.textContent.includes(name));
const stored = () => JSON.parse(localStorage.getItem(workspaceKey));
async function mount() { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname: 'Student A', isCanvasEnv: true, isTeacherMode: true })))); await tick(350); }
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('bl_onboarded', '1');
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'studenta001', name: 'Student A' }]));
  localStorage.setItem(workspaceKey, JSON.stringify({ version: 4, student: 'Student A', abcEntries: [record], observationSessions: [] }));
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); if (host) host.remove(); root = null; host = null; });
describe('Read-only audit reproductions (assert current defects)', () => {
  it('practice overwrites the active real student backup and Clear Practice Data then deletes the records', async () => {
    await mount();
    expect(stored().abcEntries[0].id).toBe('real-entry');
    const card = host.querySelector('[aria-labelledby="bl-tool-sandbox-title"]');
    await click(card && Array.from(card.querySelectorAll('button')).find(el => !el.hasAttribute('aria-pressed')));
    const scenario = Array.from(host.querySelectorAll('[role="button"]')).find(el => el.querySelector('h4'));
    await click(scenario);
    await click(host.querySelector('button[aria-label="Load This Scenario"]'));
    await tick(350);
    expect(stored().abcEntries.length).toBeGreaterThan(1);
    expect(stored().abcEntries.some(entry => entry.id === 'real-entry')).toBe(false);
    expect(stored().student).toBe('Student A');
    expect(stored().isPracticeMode).toBeUndefined();
    await click(host.querySelector('button[aria-label="Clear Practice Data"]'));
    await tick(350);
    expect(stored().abcEntries).toEqual([]);
  });

  it('import of an unseen student loses imported records during immutable-ID hydration', async () => {
    await mount();
    const input = host.querySelector('input[aria-label="Load BehaviorLens workspace JSON file"]');
    const imported = { version: 4, student: 'Student New', studentId: 'new-student-export-id', abcEntries: [{ ...record, id: 'imported-entry' }], observationSessions: [] };
    Object.defineProperty(input, 'files', { value: [new File([JSON.stringify(imported)], 'new-student.json', { type: 'application/json' })], configurable: true });
    await React.act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 20)); });
    await tick(350);
    const roster = JSON.parse(localStorage.getItem('bl_student_roster'));
    const newStudent = roster.find(student => student.name === 'Student New');
    expect(newStudent).toBeTruthy();
    const current = JSON.parse(localStorage.getItem('behaviorLens_workspace_' + newStudent.id));
    expect(current.abcEntries.some(entry => entry.id === 'imported-entry')).toBe(false);
  });


  it('saving an existing ABC entry removes phase and metadata even when only notes change', async () => {
    localStorage.setItem(workspaceKey, JSON.stringify({ version: 4, student: 'Student A', abcEntries: [{ ...record, phase: 'baseline', function: 'escape', tags: ['known'], observationSessionId: 'session-1', metadata: { retained: true } }], observationSessions: [] }));
    await mount();
    await click(button('Open ABC Data Collection'));
    await click(host.querySelector('tbody button[aria-label="Toggle edit entry"]'));
    const modal = host.querySelector('[role="dialog"][aria-label="Edit ABC entry"]');
    const notes = modal.querySelector('textarea[aria-label="Additional notes"]');
    await React.act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(notes, 'Only notes changed'); notes.dispatchEvent(new Event('input', { bubbles: true })); });
    await click(Array.from(modal.querySelectorAll('button')).find(el => el.textContent === 'Save Entry'));
    await tick(350);
    expect(stored().abcEntries[0]).toMatchObject({ notes: 'Only notes changed', phase: null, function: null, tags: [], observationSessionId: null, metadata: {} });
  });

  it('normalization silently discards the 5001st record without reporting the loss', () => {
    const runtime = window.AlloModules.BehaviorLensWorkspace;
    const entries = Array.from({ length: 5001 }, (_, index) => ({ ...record, id: String(index) }));
    const normalized = runtime.normalizeAbcEntries(entries);
    expect(normalized.items).toHaveLength(5000);
    expect(normalized.report).toMatchObject({ inputCount: 5001, outputCount: 5000, droppedCount: 0 });
  });
});
