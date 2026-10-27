import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { createDaWorkspaceFixture, createRealDaWorkspaceFixture } from './helpers/dynamic_assessment_workspace_fixture.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, DA, reviewApi;
const mounted = [];
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('dynamic_assessment_module.js');
  DA = window.AlloModules.DynamicAssessment;
  reviewApi = window.AlloModules.IdentifierRedaction;
});
afterEach(async () => {
  await act(async () => { mounted.splice(0).forEach(({ root, node }) => { root.unmount(); node.remove(); }); await Promise.resolve(); });
  window.AlloModules.IdentifierRedaction = reviewApi;
  delete window.__alloLazySensitiveWorkspace;
  delete window.__alloDAExport;
  delete window.AlloSheetHostBridge;
  localStorage.clear();
  vi.restoreAllMocks();
});
async function mount(fixture, component = DA, props = {}) {
  window.AlloModules.SensitiveWorkspace = fixture?.api;
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node); mounted.push({ root, node });
  const render = async () => { await act(async () => { root.render(React.createElement(component, { React, ...props })); await Promise.resolve(); }); };
  await render(); return { node, root, render };
}
async function adapter(fixture) {
  let assessment;
  function Capture(props) { assessment = props; return null; }
  const host = { studentNickname: 'Private Learner', history: [{ type: 'math-fluency-probe', raw: 'PARENT-CANARY' }],
    callGemini: vi.fn(async () => ({ result: ['kept'], complete: true })), callImagen: vi.fn(), handleGenerate: vi.fn(),
    setHistory: vi.fn(), setGeneratedContent: vi.fn(), setIsDynamicAssessmentOpen: vi.fn(), addToast: vi.fn(), t: key => key };
  const result = await mount(fixture, DA.HostAdapter, { DynamicAssessment: Capture, host });
  return { ...result, host, get assessment() { return assessment; } };
}

describe('protected Dynamic Assessment boundary', () => {
  it('mounts neither clinical tool nor adapter hooks while locked and never reads legacy plaintext', async () => {
    localStorage.setItem('alloflow_dynamic_assessment_v1', JSON.stringify({ sessions: [{ studentNickname: 'LEGACY-CANARY' }] }));
    const rawRead = vi.spyOn(Storage.prototype, 'getItem');
    const fixture = createDaWorkspaceFixture(React, { ready: false });
    const main = await mount(fixture);
    const host = await adapter(fixture);
    expect(main.node.textContent).toContain('Sample shapes only');
    expect(main.node.textContent).not.toContain('LEGACY-CANARY');
    expect(host.assessment).toBeUndefined();
    expect(rawRead).not.toHaveBeenCalled();
    expect(fixture.session.storage.getItem).not.toHaveBeenCalled();
    expect(fixture.session.registerFlush).not.toHaveBeenCalled();
  });
  it('fails closed when the workspace module is absent and retries on registry registration', async () => {
    window.__alloLazySensitiveWorkspace = vi.fn(async () => {});
    const rawRead = vi.spyOn(Storage.prototype, 'getItem');
    const h = await mount(null);
    expect(h.node.textContent).toContain('Clinical records remain closed');
    expect(rawRead).not.toHaveBeenCalled();
    const fixture = createDaWorkspaceFixture(React);
    window.AlloModules.SensitiveWorkspace = fixture.api;
    await act(async () => { window.dispatchEvent(new Event('alloflow:module-registry-changed')); await Promise.resolve(); });
    expect(h.node.querySelector('[aria-label="Dynamic Assessment Studio"]')).toBeTruthy();
    expect(fixture.session.storage.getItem).toHaveBeenCalled();
  });
  it('requires a genuine current session for public ambient history queries', () => {
    localStorage.setItem('alloflow_dynamic_assessment_v1', JSON.stringify({ sessions: [{ studentNickname: 'Legacy' }] }));
    const fixture = createDaWorkspaceFixture(React, { entries: { alloflow_dynamic_assessment_v1: JSON.stringify({ sessions: [{ id: 'secure', studentNickname: 'Private Learner' }] }) } });
    window.AlloModules.SensitiveWorkspace = fixture.api;
    const rawRead = vi.spyOn(Storage.prototype, 'getItem');
    expect(DA._meta.getSessionsByStudent('Legacy')).toEqual([]);
    expect(DA._meta.getSessionsByStudent('Legacy', { isProtected: true, storage: localStorage })).toEqual([]);
    expect(DA._meta.getSessionsByStudent('Private Learner', fixture.session)).toHaveLength(1);
    fixture.control.ready = false;
    expect(DA._meta.getSessionsByStudent('Private Learner', fixture.session)).toEqual([]);
    expect(rawRead).not.toHaveBeenCalled();
  });
  it('stages protected state during locking without a raw fallback or active-session recheck', async () => {
    const state = { sessions: [{ id: 'retained', studentNickname: 'Private Learner', sessionNote: 'PROTECTED-NOTE' }], activeSession: null, savedProbeTemplates: [], onboardingSeen: true };
    const fixture = createDaWorkspaceFixture(React, { entries: { alloflow_dynamic_assessment_v1: JSON.stringify(state) } });
    localStorage.setItem('alloflow_dynamic_assessment_v1', 'LEGACY-UNCHANGED');
    const rawWrite = vi.spyOn(Storage.prototype, 'setItem');
    await mount(fixture);
    expect(fixture.callbacks.size).toBe(1);
    fixture.control.locking = true; fixture.control.epoch++;
    for (const flush of fixture.callbacks) await flush();
    expect(JSON.parse(fixture.entries.get('alloflow_dynamic_assessment_v1')).sessions[0].sessionNote).toBe('PROTECTED-NOTE');
    expect(rawWrite).not.toHaveBeenCalled();
    expect(localStorage.getItem('alloflow_dynamic_assessment_v1')).toBe('LEGACY-UNCHANGED');
  });
  it('retains protected RAM and legacy data when encrypted flush fails', async () => {
    const fixture = createDaWorkspaceFixture(React, { entries: { alloflow_dynamic_assessment_v1: JSON.stringify({ sessions: [{ id: 'keep', studentNickname: 'Private Learner' }] }) } });
    localStorage.setItem('alloflow_da_session_state_v1', 'LEGACY-DRAFT');
    fixture.session.flush.mockRejectedValue(new Error('Encrypted write unavailable'));
    await mount(fixture);
    for (const flush of fixture.callbacks) await flush();
    await expect(fixture.session.flush()).rejects.toThrow('Encrypted write unavailable');
    expect(JSON.parse(fixture.entries.get('alloflow_dynamic_assessment_v1')).sessions[0].id).toBe('keep');
    expect(localStorage.getItem('alloflow_da_session_state_v1')).toBe('LEGACY-DRAFT');
  });
  it('blocks parent-history publishing/delegated generation and automatic math-history imports', async () => {
    const fixture = createDaWorkspaceFixture(React);
    const h = await adapter(fixture);
    expect(h.assessment.mathFluencyProbes).toEqual([]);
    expect(h.assessment.daResourceManifest).toEqual([]);
    for (const key of ['onGenerateGlossary', 'onGenerateManipulative', 'onGenerateWordSoundsProbe', 'onGenerateVisualOrganizer', 'onGenerateSentenceFrames', 'onUpdateManipulativePreset', 'onUpdateWordSoundsProbe', 'onOpenResource']) {
      expect(() => h.assessment[key]('PRIVATE-CONTENT')).toThrow('protected resource route');
    }
    for (const key of ['callGemini', 'callImagen', 'handleGenerate', 'setHistory', 'setGeneratedContent']) expect(h.host[key]).not.toHaveBeenCalled();
  });
  it('requires deployment approval before creating an outbound AI review', async () => {
    const fixture = createDaWorkspaceFixture(React, { approved: false });
    const h = await adapter(fixture);
    const createGate = vi.spyOn(window.AlloModules.IdentifierRedaction, 'createSensitivePromptGate');
    await expect(h.assessment.callGemini('Clinical observation')).rejects.toThrow('Deployment approval');
    expect(createGate).not.toHaveBeenCalled();
    expect(h.host.callGemini).not.toHaveBeenCalled();
  });
  it('revalidates approval and epoch after review before calling the provider', async () => {
    const fixture = createDaWorkspaceFixture(React);
    let approve;
    window.AlloModules.IdentifierRedaction = { ...reviewApi, createSensitivePromptGate: () => ({ request: () => new Promise(resolve => { approve = resolve; }), cancelAll() {} }) };
    const h = await adapter(fixture);
    const pending = h.assessment.callGemini('Clinical observation'); pending.catch(() => {});
    await Promise.resolve(); fixture.control.approved = false;
    approve({ prompt: 'Reviewed observation', searchQuery: null });
    await expect(pending).rejects.toThrow('Deployment approval');
    expect(h.host.callGemini).not.toHaveBeenCalled();
    fixture.control.approved = true;
    const stale = h.assessment.callGemini('Another observation'); stale.catch(() => {});
    await Promise.resolve(); fixture.control.epoch++;
    approve({ prompt: 'Reviewed copy' });
    await expect(stale).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.host.callGemini).not.toHaveBeenCalled();
  });
  it('preserves approved provider arguments and ordinary result schemas', async () => {
    const fixture = createDaWorkspaceFixture(React);
    window.AlloModules.IdentifierRedaction = { ...reviewApi, createSensitivePromptGate: () => ({ request: async () => ({ prompt: 'Reviewed', searchQuery: 'Reviewed query' }), cancelAll() {} }) };
    const h = await adapter(fixture);
    const signal = new AbortController().signal;
    await expect(h.assessment.callGemini('Original', true, false, .2, 'Original query', signal)).resolves.toEqual({ result: ['kept'], complete: true });
    expect(h.host.callGemini).toHaveBeenCalledExactlyOnceWith('Reviewed', true, false, .2, 'Reviewed query', signal, undefined, undefined, { requestControls: { beforeRequest: expect.any(Function) } });
  });
  it('uses protected Report Writer transfer with export permission instead of plaintext globals', () => {
    const fixture = createDaWorkspaceFixture(React); window.AlloModules.SensitiveWorkspace = fixture.api;
    const record = { id: 'session', studentNickname: 'Private Learner', itemResults: [], sessionItemIds: [], domain: 'math' };
    expect(() => DA._meta.exportSessionToReportWriter(record, 'Private Learner')).toThrow('Unlock');
    fixture.control.exportAllowed = false;
    expect(() => DA._meta.exportSessionToReportWriter(record, 'Private Learner', fixture.session)).toThrow();
    expect(fixture.session.transfer).not.toHaveBeenCalled();
    fixture.control.exportAllowed = true;
    const payload = DA._meta.exportSessionToReportWriter(record, 'Private Learner', fixture.session);
    expect(fixture.session.transfer).toHaveBeenCalledExactlyOnceWith('report-writer', payload);
    expect(window.__alloDAExport).toBeUndefined();
  });
  it('guards the AlloSheet host callback itself against canceled exports and stale epochs', async () => {
    const fixture = createDaWorkspaceFixture(React);
    const h = await adapter(fixture);
    window.AlloSheetHostBridge = { transferControlVersion: 1, openTransfer: vi.fn(() => ({ delivered: Promise.resolve() })) };
    fixture.control.exportAllowed = false;
    expect(() => h.assessment.onOpenAlloSheet({ kind: 'alloflow.tabular.v1' })).toThrow();
    expect(window.AlloSheetHostBridge.openTransfer).not.toHaveBeenCalled();
    fixture.control.exportAllowed = true;
    await expect(h.assessment.onOpenAlloSheet({ kind: 'alloflow.tabular.v1' })).resolves.toBe(true);
    expect(window.AlloSheetHostBridge.openTransfer).toHaveBeenCalledTimes(1);
    fixture.control.epoch++;
    expect(() => h.assessment.onOpenAlloSheet({ kind: 'alloflow.tabular.v1' })).toThrow();
    expect(window.AlloSheetHostBridge.openTransfer).toHaveBeenCalledTimes(1);
  });
  it('stages edited clinical work through the real encrypted service, locks the DOM, and restores it after unlock', async () => {
    const fixture = await createRealDaWorkspaceFixture(React);
    fixture.api = { ...fixture.realApi, Boundary: props => React.createElement(fixture.realApi.Boundary, { ...props, service: fixture.service }) };
    const activeSession = {
      id: 'protected-e2e', studentNickname: 'E2E-PRIVATE-LEARNER', sessionNote: 'INITIAL-PRIVATE-NOTE',
      domain: 'math', difficulty: 'easy', mode: 'clinician', isCustomBank: false,
      dateStarted: '2026-10-24T10:00:00.000Z', sessionItemIds: ['math-e-01'],
      currentPhase: 'pretest', currentItemIdx: 0, itemResults: [], currentLadderLevel: 0,
    };
    fixture.session.storage.setItem('alloflow_dynamic_assessment_v1', JSON.stringify({ sessions: [], activeSession, onboardingSeen: true, savedProbeTemplates: [] }));
    try {
      const h = await mount(fixture);
      const note = h.node.querySelector('textarea[aria-label="Session-level notes"]');
      expect(note).toBeTruthy();
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(note, 'EDITED-PRIVATE-NOTE');
        note.dispatchEvent(new Event('input', { bubbles: true }));
        await Promise.resolve();
      });
      expect(JSON.parse(fixture.session.storage.getItem('alloflow_dynamic_assessment_v1')).activeSession.sessionNote).toBe('EDITED-PRIVATE-NOTE');
      await act(async () => { await fixture.service.lock('integration-test'); });
      expect(h.node.textContent).not.toContain('E2E-PRIVATE-LEARNER');
      expect(h.node.textContent).not.toContain('EDITED-PRIVATE-NOTE');
      expect(JSON.stringify(fixture.persisted)).not.toContain('EDITED-PRIVATE-NOTE');
      expect(JSON.stringify(fixture.persisted)).not.toContain('E2E-PRIVATE-LEARNER');
      await act(async () => { await fixture.service.unlock('DA fixture protected passphrase'); });
      const restored = h.node.querySelector('textarea[aria-label="Session-level notes"]');
      expect(restored?.value).toBe('EDITED-PRIVATE-NOTE');
      const current = fixture.service.getSession('dynamic-assessment');
      const record = JSON.parse(current.storage.getItem('alloflow_dynamic_assessment_v1')).activeSession;
      const payload = DA._meta.exportSessionToReportWriter(record, record.studentNickname, current);
      expect(fixture.service.getSession('report-writer').consumeTransfer('dynamic-assessment')).toEqual(payload);
      expect(window.__alloDAExport).toBeUndefined();
      await act(async () => { await fixture.service.lock('integration-cleanup'); });
    } finally { fixture.dispose(); }
  });
});
