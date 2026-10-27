import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const services = [], roots = [];
let DA, reviewApi;
beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('dynamic_assessment_module.js');
  DA = window.AlloModules.DynamicAssessment;
  reviewApi = window.AlloModules.IdentifierRedaction;
});
afterEach(async () => {
  await React.act(async () => roots.splice(0).forEach(({ root, node }) => { root.unmount(); node.remove(); }));
  services.splice(0).forEach(service => service.dispose());
  window.AlloModules.IdentifierRedaction = reviewApi;
});
function barrier() {
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; });
  const continued = new Promise(resolve => { release = resolve; });
  return { entered, release, wait: async () => { enter(); await continued; } };
}
async function fixture() {
  let revision = 0, stored = null;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const policy = { version: 1, allowCanvasRecords: true, allowExternalAi: ['report-writer', 'behavior-lens', 'dynamic-assessment'] };
  const service = SW.createService({ lifecycle: false, crypto: Crypto, vaultModule: Vault,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, getPolicy: () => policy,
    getContext: () => ({ learner: false, isCanvas: true }),
    repository: { read: async () => ({ revision, store: clone(stored) }), compareAndSwap: async (expected, next) => {
      if (expected !== revision) return false; stored = clone(next); revision++; return true;
    } }
  });
  services.push(service);
  await service.setup('synthetic request controls password');
  const recoveryInput = service.getStatus().setupRecoveryCode;
  await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
  return { service, policy };
}

describe('real clinical request controls', () => {
  it('retains independent immutable feature permissions instead of trusting display properties', async () => {
    const { service, policy } = await fixture();
    const report = service.getSession('report-writer'), behavior = service.getSession('behavior-lens');
    const reportGuard = report.createRequestControls(report.captureEpoch());
    const behaviorGuard = behavior.createRequestControls(behavior.captureEpoch());
    expect(Object.isFrozen(reportGuard)).toBe(true);
    report.feature = 'behavior-lens'; report._generation = -10;
    report.assertCanTransmit = () => true;
    policy.allowExternalAi = ['behavior-lens'];
    expect(() => reportGuard.beforeRequest()).toThrow();
    expect(behaviorGuard.beforeRequest()).toBe(true);
    await service.lock();
    expect(() => behaviorGuard.beforeRequest()).toThrow();
    await service.unlock('synthetic request controls password');
    expect(() => behaviorGuard.beforeRequest()).toThrow();
    expect(service.getSession('behavior-lens').createRequestControls(service.getSession('behavior-lens').captureEpoch()).beforeRequest()).toBe(true);
  });

  it('captures inherited guards, rejects malformed or asynchronous guards, and rechecks after synchronous callbacks', async () => {
    const { service, policy } = await fixture();
    const session = service.getSession('report-writer'), epoch = session.captureEpoch();
    let allow = true;
    const inherited = { beforeRequest: () => { if (!allow) throw new Error('Synthetic inherited denial'); } };
    const controls = session.createRequestControls(epoch, null, inherited);
    inherited.beforeRequest = () => true; allow = false;
    expect(() => controls.beforeRequest()).toThrow('Synthetic inherited denial');
    const getter = vi.fn(() => () => true);
    const accessor = {}; Object.defineProperty(accessor, 'beforeRequest', { enumerable: true, get: getter });
    for (const value of [{}, { beforeRequest: true }, { beforeRequest: () => true, other: 1 }, Object.create({ beforeRequest() {} }), accessor]) {
      expect(() => session.createRequestControls(epoch, null, value)).toThrow();
    }
    expect(getter).not.toHaveBeenCalled();
    expect(() => session.createRequestControls(epoch, () => false)).toThrow();
    expect(() => session.createRequestControls(epoch, async () => true)).toThrow();
    expect(() => session.createRequestControls(epoch, () => { policy.allowExternalAi = []; })).toThrow();
  });

  it.each(['text', 'vision'])('BehaviorLens forwards controls and denies revoked %s before the injected transmission', async kind => {
    const { service, policy } = await fixture(), session = service.getSession('behavior-lens');
    const source = readFileSync('behavior_lens_module.js', 'utf8');
    const start = source.indexOf('    function useProtectedBehaviorLensTransport(');
    const end = source.indexOf('    function getBehaviorLensWorkspaceRuntime()', start);
    const useTransport = new Function('React', source.slice(start, end) + '\nreturn useProtectedBehaviorLensTransport;')({ useMemo: fn => fn() });
    const gate = barrier(), sent = [];
    const options = { preserved: true };
    const provider = async (...args) => {
      await gate.wait();
      const forwarded = args[kind === 'vision' ? 3 : 8];
      expect(forwarded.preserved).toBe(true);
      forwarded.requestControls.beforeRequest(); sent.push(args[0]); return 'synthetic result';
    };
    const wrapped = useTransport(provider, session, session.captureEpoch(), kind);
    const pending = (kind === 'vision' ? wrapped('synthetic prompt', 'cGljdHVyZQ==', 'image/png', options)
      : wrapped('synthetic prompt', false, false, null, null, null, false, null, options)).then(value => ({ value }), error => ({ error }));
    await gate.entered; policy.allowExternalAi = []; gate.release();
    expect((await pending).error.code).toBe('PROTECTED_REMOTE_NOT_APPROVED');
    expect(sent).toEqual([]); expect(options).toEqual({ preserved: true });
  });
});

async function assessmentHarness() {
  const { service, policy } = await fixture(), session = service.getSession('dynamic-assessment');
  let assessment;
  window.AlloModules.SensitiveWorkspace = { ...SW, Boundary: ({ children }) => children(session) };
  window.AlloModules.IdentifierRedaction = { ...reviewApi, createSensitivePromptGate: () => ({ request: async prompt => ({ prompt }), cancelAll() {} }) };
  const gate = barrier(), sent = [];
  const host = { studentNickname: 'Synthetic learner', history: [], t: key => key, addToast() {},
    callGemini: async (...args) => {
      await gate.wait(); args[8].requestControls.beforeRequest(); sent.push(args[0]); return 'synthetic result';
    }
  };
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node); roots.push({ root, node });
  const render = () => React.act(async () => root.render(React.createElement(DA.HostAdapter, { React,
    DynamicAssessment: props => { assessment = props; return null; }, host })));
  await render();
  return { service, policy, host, gate, sent, render, get assessment() { return assessment; } };
}

describe('Dynamic Assessment dispatch controls with the real protected service', () => {
  it.each(['permission', 'case', 'provider', 'abort'])('blocks a pending request after %s changes', async change => {
    const h = await assessmentHarness(), controller = new AbortController();
    let pending;
    await React.act(async () => { pending = h.assessment.callGemini('synthetic assessment', false, false, null, null, controller.signal).then(value => ({ value }), error => ({ error })); });
    await h.gate.entered;
    if (change === 'permission') h.policy.allowExternalAi = [];
    if (change === 'case') await React.act(async () => h.assessment.onSensitiveContextChange('different-case', 'Synthetic other learner'));
    if (change === 'provider') { h.host.callGemini = () => 'replacement'; await h.render(); }
    if (change === 'abort') controller.abort();
    h.gate.release();
    expect((await pending).error).toBeTruthy(); expect(h.sent).toEqual([]);
  });

  it('allows an unchanged approved request and returns its ordinary schema', async () => {
    const h = await assessmentHarness();
    let pending;
    await React.act(async () => { pending = h.assessment.callGemini('synthetic assessment'); });
    await h.gate.entered; h.gate.release();
    expect(await pending).toBe('synthetic result'); expect(h.sent).toEqual(['synthetic assessment']);
  });
});
