import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let host, root;
const tick = async (ms = 20) => React.act(async () => { await new Promise(r => setTimeout(r, ms)); });
const storage = name => JSON.parse(localStorage.getItem('behaviorLens_workspace_' + name));
const button = text => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text));
async function click(b) { expect(b).toBeTruthy(); await React.act(async () => b.click()); await tick(); }
async function select(name) {
  const control = host.querySelector('select[aria-label="Choose a student"]');
  await React.act(async () => { control.value = name; control.dispatchEvent(new Event('change', { bubbles: true })); });
  await tick(350);
}
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('bl_onboarded', '1'); localStorage.setItem('bl_ai_consent_v1', '1');
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'eagle', name: 'Eagle' }, { id: 'falcon', name: 'Falcon' }]));
  for (const name of ['eagle', 'falcon']) localStorage.setItem('behaviorLens_workspace_' + name, JSON.stringify({ version: 4, student: name === 'eagle' ? 'Eagle' : 'Falcon', abcEntries: [1, 2, 3].map(i => ({ id: name + i, timestamp: '2026-09-12T12:00:00.000Z', antecedent: 'Work', behavior: 'Calls out', consequence: 'Prompt', intensity: 2 })) }));
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); host?.remove(); host = null; root = null; });
async function mount() {
  let resolveResponse;
  const callGemini = vi.fn(() => new Promise(resolve => { resolveResponse = resolve; }));
  const addToast = vi.fn();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ isTeacherMode: true, studentNickname: 'Eagle', dashboardData: [{ studentNickname: 'Eagle' }, { studentNickname: 'Falcon' }], callGemini, addToast }))));
  await tick(350);
  return { callGemini, addToast, respond: async value => { await React.act(async () => { resolveResponse(value); await Promise.resolve(); }); await tick(350); } };
}
describe('Behavior Lens AI requests remain bound to their original student', () => {
  it('discards a delayed summary after switching without saving or reporting success', async () => {
    const api = await mount(); await click(button('Full Student Summary')); expect(api.callGemini).toHaveBeenCalledTimes(1);
    await select('Falcon'); await api.respond('EAGLE PRIVATE SUMMARY');
    expect(host.textContent).not.toContain('EAGLE PRIVATE SUMMARY'); expect(storage('falcon').fullSummary || '').toBe('');
    expect(api.addToast.mock.calls.some(([message]) => String(message).includes('summary generated'))).toBe(false);
  });
  it('rejects late responses even after switching away and back', async () => {
    const api = await mount(); await click(button('Full Student Summary')); await select('Falcon'); await select('Eagle'); await api.respond('OUTDATED SUMMARY');
    expect(host.textContent).not.toContain('OUTDATED SUMMARY'); expect(storage('eagle').fullSummary || '').toBe('');
  });
  it('discards a delayed pattern analysis and audit event after switching', async () => {
    const api = await mount(); const card = host.querySelector('[aria-labelledby="bl-tool-analysis-title"]');
    await click([...card.querySelectorAll('button')].at(-1)); expect(api.callGemini).toHaveBeenCalledTimes(1);
    await select('Falcon'); await api.respond(JSON.stringify({ summary: 'EAGLE ANALYSIS', hypothesizedFunction: 'Unknown', confidence: 10 }));
    expect(storage('falcon').aiAnalysis || null).toBeNull(); expect((storage('falcon').auditLog || []).some(e => e.action === 'ai-analysis-generated')).toBe(false);
  });
  it('saves a completed summary when its student and inputs remain current', async () => {
    const api = await mount(); await click(button('Full Student Summary')); await api.respond('CURRENT EAGLE SUMMARY');
    expect(storage('eagle').fullSummary).toBe('CURRENT EAGLE SUMMARY'); expect(host.textContent).toContain('CURRENT EAGLE SUMMARY');
  });
});
