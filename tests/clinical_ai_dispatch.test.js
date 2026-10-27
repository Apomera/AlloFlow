import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { createHash, webcrypto } from 'node:crypto';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
let SW, service;
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const SYNTHETIC_PROMPT = 'SYNTHETIC CLINICAL DISPATCH SENTINEL: the learner benefits from visual directions.';
const KEY = 'synthetic-dispatch-proof-key';

beforeAll(() => {
  globalThis.React = window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  loadAlloModule('identifier_redaction_module.js');
  loadAlloModule('sensitive_workspace_module.js');
  loadAlloModule('report_writer_module.js');
  loadAlloModule('gemini_api_module.js');
  SW = window.AlloModules.SensitiveWorkspace;
});
afterEach(() => {
  service?.dispose(); service = null;
  delete window.ALLOFLOW_MANAGED_AI_POLICY;
  vi.unstubAllGlobals(); localStorage.clear();
});

function barrier() {
  let enter, release;
  const entered = new Promise(done => { enter = done; });
  const resumed = new Promise(done => { release = done; });
  return { entered, release, async wait() { enter(); await resumed; } };
}
async function harness({ revokeOnResponse = false } = {}) {
  const policy = { version: 1, allowCanvasRecords: true, allowExternalAi: ['report-writer'] };
  const context = { isCanvas: true, learner: false };
  const repo = { store: null, revision: 0,
    async read() { return { store: clone(this.store), revision: this.revision }; },
    async compareAndSwap(revision, store) { if (revision !== this.revision) return false; this.store = clone(store); this.revision++; return true; },
  };
  service = SW.createService({ repository: repo, vaultModule: Vault, crypto: Crypto, lifecycle: false,
    cryptoOptions: { iterations: 10000 }, getPolicy: () => policy, getContext: () => context });
  await service.setup('synthetic saved-record password');
  const recoveryInput = service.getStatus().setupRecoveryCode;
  await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
  const workspace = service.getSession('report-writer');
  window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, allowExternalSearch: false, connections: [{
    backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKeySha256: [createHash('sha256').update(KEY).digest('hex')],
  }] };
  const digest = barrier();
  vi.stubGlobal('crypto', { subtle: { async digest(...args) { await digest.wait(); return webcrypto.subtle.digest(...args); } } });
  const sent = [];
  const nativeAttempt = vi.fn(async (_url, options) => {
    // Invoke the real provider's final authorization callback exactly as the
    // production retry transport does. No network request is made.
    options.beforeRequest(); sent.push(options.body);
    const data = { candidates: [{ content: { parts: [{ text: 'synthetic reply' }] }, finishReason: 'STOP' }] };
    return { ok: true, status: 200,
      text: async () => { if (revokeOnResponse) policy.allowExternalAi = []; return JSON.stringify(data); },
      json: async () => { if (revokeOnResponse) policy.allowExternalAi = []; return data; } };
  });
  const api = window.AlloModules.createGeminiAPI({ apiKey: KEY, _isCanvasEnv: false,
    GEMINI_MODELS: { default: 'synthetic-primary', fallback: 'synthetic-primary' },
    fetchWithExponentialBackoff: nativeAttempt, optimizeImage: async x => x,
    warnLog() {}, debugLog() {}, getAbortSignal: () => null,
  });
  let review, current = true;
  const gate = window.AlloModules.IdentifierRedaction.createSensitivePromptGate({ onChange: next => { review = next; } });
  const caller = window.AlloModules.ReportWriterUtils.createReviewedAiCaller(api.callGemini, {
    getWorkspace: () => workspace, getGate: () => gate, getOptions: () => ({}), isCurrent: () => current,
    createOperation: signal => ({ signal: signal || new AbortController().signal, release() {} }),
  });
  return { policy, context, digest, sent, nativeAttempt, workspace, caller,
    changeCase() { current = false; },
    approve() { const current = review; return gate.accept(current.id, { prompt: current.prompt }); },
  };
}

describe('clinical permission at actual managed provider dispatch', () => {
  it('blocks permission revoked while editable review remains open', async () => {
    const h = await harness();
    const pending = h.caller(SYNTHETIC_PROMPT).then(value => ({ value }), error => ({ error }));
    h.policy.allowExternalAi = []; h.approve();
    expect((await pending).error?.code).toBe('PROTECTED_REMOTE_NOT_APPROVED');
    expect(h.nativeAttempt).not.toHaveBeenCalled();
  });

  it('must block permission revoked during awaited provider credential authorization', async () => {
    const h = await harness();
    const pending = h.caller(SYNTHETIC_PROMPT).then(value => ({ value }), error => ({ error }));
    h.approve(); await h.digest.entered;
    h.policy.allowExternalAi = [];
    expect(() => h.workspace.assertCanTransmit('ai')).toThrow();
    h.digest.release();
    const result = await pending;
    console.log(JSON.stringify({ phase: 'revoked-during-digest', nativeAttempts: h.sent.length, syntheticPromptReachedTransport: h.sent.some(body => body.includes('SYNTHETIC CLINICAL DISPATCH SENTINEL')), result: result.error ? result.error.code : result.value }));
    expect(h.nativeAttempt).not.toHaveBeenCalled();
  });

  it('does not dispatch a reviewed old-case request after its provider has begun preparing', async () => {
    const h = await harness();
    const pending = h.caller(SYNTHETIC_PROMPT).then(value => ({ value }), error => ({ error }));
    h.approve(); await h.digest.entered; h.changeCase(); h.digest.release();
    expect((await pending).error?.name).toBe('AbortError');
    expect(h.nativeAttempt).not.toHaveBeenCalled();
  });

  it('discards a response if clinical permission is revoked after its approved transmission', async () => {
    const h = await harness({ revokeOnResponse: true });
    const pending = h.caller(SYNTHETIC_PROMPT).then(value => ({ value }), error => ({ error }));
    h.approve(); await h.digest.entered; h.digest.release();
    expect((await pending).error).toBeTruthy();
    expect(h.sent).toHaveLength(1);
  });
});
