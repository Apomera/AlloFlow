import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let root, host, props, privacy;
const tick = async (ms = 20) => React.act(async () => { await new Promise(done => setTimeout(done, ms)); });
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
const click = async element => { expect(element).toBeTruthy(); await React.act(async () => element.click()); await tick(); };
const review = () => host.querySelector('[role="dialog"][aria-label="Review what AI receives"]');
const accept = async () => {
  await click(review().querySelector('input[type="checkbox"]'));
  await click(button('Send reviewed copy'));
};
const changeText = async (node, text) => {
  const prototype = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, text);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await tick();
};

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  setupBehaviorLens();
  new Function(readFileSync('identifier_redaction_module.js', 'utf8'))();
  privacy = window.AlloModules.IdentifierRedaction;
});
beforeEach(() => {
  localStorage.clear();
  window.AlloModules.IdentifierRedaction = privacy;
  localStorage.setItem('bl_onboarded', '1');
  localStorage.setItem('bl_ai_consent_v1', '1');
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'jordan', name: 'Jordan Rivera' }, { id: 'other', name: 'Kestrel' }]));
  localStorage.setItem('behaviorLens_workspace_jordan', JSON.stringify({ version: 4, student: 'Jordan Rivera', abcEntries: [1, 2, 3].map(id => ({
    id: String(id), timestamp: '2026-09-12T12:00:00.000Z',
    antecedent: 'Jordan Rivera arrived on 09/12/2026. Contact jordan@example.com at 12 Elm Street.',
    behavior: 'Calls out for 15 minutes at a 2nd grade level', consequence: 'Teacher prompt', intensity: 2
  })) }));
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove(); host = null; root = null;
  window.AlloModules.IdentifierRedaction = privacy;
});
async function mount(extra = {}) {
  props = baseProps({ isTeacherMode: true, studentNickname: 'Jordan Rivera', dashboardData: [{ studentNickname: 'Jordan Rivera' }, { studentNickname: 'Kestrel' }], callGemini: vi.fn(async () => 'Reviewed summary'), addToast: vi.fn(), ...extra });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, props)));
  await tick(350);
  await click(button('All tools'));
}
async function requestSummary() { await click(button('Full Student Summary')); }

describe('BehaviorLens final outbound clinical review', () => {
  it('holds the real provider until review and sends the redacted copy without changing source notes', async () => {
    await mount(); await requestSummary();
    expect(props.callGemini).not.toHaveBeenCalled();
    const text = review().querySelector('textarea').value;
    for (const identifier of ['Jordan', 'Rivera', 'jordan@example.com', '12 Elm Street', '09/12/2026']) expect(text).not.toContain(identifier);
    expect(text).not.toContain('@example.com'); expect(text).toContain('[EMAIL]');
    expect(text).toContain('15 minutes'); expect(text).toContain('2nd grade level');
    expect(button('Send reviewed copy').disabled).toBe(true);
    await accept();
    expect(props.callGemini).toHaveBeenCalledExactlyOnceWith(text, false);
    expect(JSON.parse(localStorage.getItem('behaviorLens_workspace_jordan')).abcEntries[0].antecedent).toContain('Jordan Rivera');
    expect(host.textContent).toContain('Reviewed summary');
  });

  it('lets the reviewer remove an unlisted name and sends exactly the edited copy', async () => {
    await mount(); await requestSummary();
    const textarea = review().querySelector('textarea');
    await changeText(textarea, textarea.value + '\nAlexis from Pinecrest School observed.');
    await changeText(review().querySelector('input[aria-label="Additional names or details to remove"]'), 'Alexis, Pinecrest School');
    await click(button('Remove listed details'));
    const edited = textarea.value;
    expect(edited).not.toContain('Alexis'); expect(edited).not.toContain('Pinecrest School');
    await accept();
    expect(props.callGemini).toHaveBeenCalledExactlyOnceWith(edited, false);
  });

  it('cancels without a provider call and allows another deliberate request', async () => {
    await mount(); await requestSummary();
    await click([...review().querySelectorAll('button')].find(node => node.textContent === 'Cancel'));
    expect(props.callGemini).not.toHaveBeenCalled(); expect(review()).toBeNull();
    await requestSummary(); expect(review()).toBeTruthy(); await accept();
    expect(props.callGemini).toHaveBeenCalledTimes(1);
  });

  it('blocks transmission when the shared privacy helper is missing', async () => {
    await mount(); delete window.AlloModules.IdentifierRedaction;
    await requestSummary();
    expect(props.callGemini).not.toHaveBeenCalled(); expect(review()).toBeNull();
    expect(props.addToast.mock.calls.some(([message]) => String(message).includes('Privacy review is unavailable'))).toBe(true);
  });

  it('invalidates review when the active student changes', async () => {
    await mount(); await requestSummary();
    const chooser = host.querySelector('select[aria-label="Choose a student"]');
    await React.act(async () => { chooser.value = 'Kestrel'; chooser.dispatchEvent(new Event('change', { bubbles: true })); });
    await tick(350);
    expect(review()).toBeNull(); expect(props.callGemini).not.toHaveBeenCalled();
  });

  it('does not dispatch a reviewed prompt through a provider that changed during review', async () => {
    await mount(); await requestSummary();
    const original = props.callGemini;
    props = { ...props, callGemini: vi.fn(async () => 'New provider') };
    await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, props)));
    await tick(); await accept();
    expect(original).not.toHaveBeenCalled(); expect(props.callGemini).not.toHaveBeenCalled();
  });

  it('does not dispatch if the privacy helper is replaced while review is open', async () => {
    await mount(); await requestSummary();
    window.AlloModules.IdentifierRedaction = { ...privacy };
    await accept();
    expect(props.callGemini).not.toHaveBeenCalled();
  });
});
