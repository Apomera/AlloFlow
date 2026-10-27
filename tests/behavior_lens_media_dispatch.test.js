import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const source = readFileSync('behavior_lens_module.js', 'utf8');
function extract(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('BehaviorLens source boundary missing: ' + start);
  return source.slice(a, b);
}
// The optional snapshot is solely for reproducing the pre-fix dispatch failure.
const bodies = process.env.ALLO_IOA_DISPATCH_SNAPSHOT
  ? JSON.parse(readFileSync(process.env.ALLO_IOA_DISPATCH_SNAPSHOT, 'utf8'))
  : {
    transport: extract('    function useProtectedBehaviorLensTransport(', '    function getBehaviorLensWorkspaceRuntime()'),
    capture: extract('        function captureMediaOperation()', '        function isMediaOperationCurrent('),
    call: extract('        async function callGeminiWithMedia(', '        var IOA_METHODS_LIST'),
    wrappers: extract('        const callGeminiGuarded = useCallback(', '        // Replies a family')
  };
const services = [], clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const originalAudioContext = window.AudioContext;
const originalPrivacy = window.AlloModules.IdentifierRedaction;
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
afterEach(() => {
  services.splice(0).forEach(service => service.dispose());
  window.AudioContext = originalAudioContext;
  window.AlloModules.IdentifierRedaction = originalPrivacy;
});

// Execute the actual routing, review, and transport bodies around the real
// encrypted service. Only review UI, audio decoding, and the network are fakes.
async function fixture(route = 'inline-vision') {
  const repository = { revision: 0, store: null,
    async read() { return { revision: this.revision, store: clone(this.store) }; },
    async compareAndSwap(revision, value) { if (revision !== this.revision) return false; this.store = clone(value); this.revision++; return true; }
  };
  const service = SW.createService({ repository, vaultModule: Vault, crypto: Crypto, lifecycle: false,
    cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, getContext: () => ({ isCanvas: true, learner: false }),
    policy: { version: 1, allowCanvasRecords: true, allowExternalAi: ['behavior-lens'] }, confirmExport: () => true });
  services.push(service);
  await service.setup('synthetic-IOA-dispatch-password');
  const recoveryInput = service.getStatus().setupRecoveryCode;
  await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
  const workspace = service.getSession('behavior-lens');
  const file = { type: 'video/mp4' }, owner = { mounted: true, generation: 1, file, contexts: new Set() };
  const mediaOwnerRef = { current: owner };
  const capture = new Function('mediaOwnerRef', 'blRequireProtectedSession', bodies.capture + '\nreturn captureMediaOperation;')(mediaOwnerRef, () => workspace);
  const transport = new Function('React', bodies.transport + '\nreturn useProtectedBehaviorLensTransport;')({ useMemo: fn => fn() });
  const reviewGate = deferred(), dispatchGate = deferred(), resultGate = deferred();
  const reviewEntered = deferred(), providerEntered = deferred(), dispatched = deferred();
  const nativeAttempt = vi.fn();
  const provider = kind => async (...args) => {
    providerEntered.resolve(); await dispatchGate.promise;
    args[kind === 'vision' ? 3 : 8].requestControls.beforeRequest();
    nativeAttempt(kind, args[0], args[1]); dispatched.resolve();
    await resultGate.promise; return 'synthetic result';
  };
  const text = transport(provider('text'), workspace, workspace.captureEpoch(), 'text');
  const vision = route === 'inline-text' ? undefined : transport(provider('vision'), workspace, workspace.captureEpoch(), 'vision');
  window.AlloModules.IdentifierRedaction = {};
  const review = vi.fn(async prompt => { reviewEntered.resolve(); await reviewGate.promise; return { prompt: 'REVIEWED ' + prompt }; });
  const wrappers = new Function('useCallback', 'callGemini', 'callGeminiVision', 'aiConsent', 'addToast', 'tt', 't',
    'aiRequestContextRef', 'aiProviderRef', 'sensitiveWorkspace', 'protectedEpochRef', 'reviewSensitiveAiPrompt', 'buildStudentContext',
    bodies.wrappers + '\nreturn { text: callGeminiWithContext, vision: callGeminiVisionGuarded };')(
    fn => fn, text, vision, true, vi.fn(), (_, fallback) => fallback, key => key,
    { current: { mounted: true, generation: 1 } }, { current: { text, vision } }, workspace,
    { current: workspace.captureEpoch() }, review, () => 'SYNTHETIC PROFILE');
  window.AudioContext = class {
    async decodeAudioData() {
      if (route === 'decode-error-text') throw new Error('Synthetic decode failure');
      const length = route === 'oversized-text' ? 20 : 1;
      return { numberOfChannels: 1, sampleRate: 16000, length, getChannelData: () => new Float32Array(length) };
    }
    close() {}
  };
  const run = new Function('mediaOwnerRef', 'INLINE_LIMIT', 'callGeminiVision', 'callGemini', 'closeMediaContext', 'warnLog',
    bodies.call + '\nreturn callGeminiWithMedia;')(mediaOwnerRef, 50, vision ? wrappers.vision : undefined, wrappers.text,
    context => { owner.contexts.delete(context); context.close(); }, () => {});
  const data = 'data:video/mp4;base64,' + (route.startsWith('inline-') ? 'U1lOVEhFVElD' : 'QUFB'.repeat(40));
  return { nativeAttempt, review, wrappers, reviewEntered: reviewEntered.promise, providerEntered: providerEntered.promise,
    dispatched: dispatched.promise, allowReview: reviewGate.resolve, allowDispatch: dispatchGate.resolve, allowResult: resultGate.resolve,
    replaceFile() { owner.generation++; owner.file = { type: 'video/mp4' }; },
    start: () => run('SYNTHETIC IOA PROMPT', file, data, capture()).catch(error => error) };
}

describe('IOA media identity through actual review wrappers and protected transport', () => {
  for (const route of ['inline-vision', 'inline-text', 'decode-error-text', 'extracted-audio-vision', 'oversized-text']) {
    it(route + ': permits the reviewed current file', async () => {
      const h = await fixture(route), pending = h.start();
      h.allowReview(); h.allowDispatch(); h.allowResult();
      expect(await pending).toBe('synthetic result');
      expect(h.nativeAttempt).toHaveBeenCalledOnce();
      expect(h.nativeAttempt.mock.calls[0][0]).toBe(route.endsWith('vision') ? 'vision' : 'text');
      expect(h.nativeAttempt.mock.calls[0][1]).toContain('REVIEWED ');
    });
    it(route + ': cancels when the selected file changes during review', async () => {
      const h = await fixture(route), pending = h.start();
      await h.reviewEntered; h.replaceFile(); h.allowReview(); h.allowDispatch(); h.allowResult();
      expect((await pending).name).toBe('AbortError');
      expect(h.nativeAttempt).not.toHaveBeenCalled();
    });
    it(route + ': cancels when the selected file changes before provider dispatch', async () => {
      const h = await fixture(route), pending = h.start();
      h.allowReview(); await h.providerEntered; h.replaceFile(); h.allowDispatch(); h.allowResult();
      expect((await pending).name).toBe('AbortError');
      expect(h.nativeAttempt).not.toHaveBeenCalled();
    });
  }
  for (const route of ['inline-vision', 'inline-text']) {
    it(route + ': discards an already requested result after the selected file changes', async () => {
      const h = await fixture(route), pending = h.start();
      h.allowReview(); h.allowDispatch(); await h.dispatched;
      h.replaceFile(); h.allowResult();
      expect((await pending).name).toBe('AbortError');
      expect(h.nativeAttempt).toHaveBeenCalledOnce();
    });
    for (const [label, guard] of [['null', null], ['asynchronous', async () => true], ['false', () => false]]) {
      it(route + ': rejects ' + label + ' operation guards before review', async () => {
        const h = await fixture(route);
        h.allowReview(); h.allowDispatch(); h.allowResult();
        const pending = route.endsWith('vision')
          ? h.wrappers.vision('SYNTHETIC', 'U1lOVEhFVElD', 'video/mp4', guard)
          : h.wrappers.text('SYNTHETIC', false, guard);
        await expect(pending).rejects.toBeDefined();
        expect(h.review).not.toHaveBeenCalled();
        expect(h.nativeAttempt).not.toHaveBeenCalled();
      });
    }
    it(route + ': preserves ordinary callers without an optional operation guard', async () => {
      const h = await fixture(route);
      h.allowReview(); h.allowDispatch(); h.allowResult();
      const pending = route.endsWith('vision')
        ? h.wrappers.vision('SYNTHETIC', 'U1lOVEhFVElD', 'video/mp4')
        : h.wrappers.text('SYNTHETIC', false);
      await expect(pending).resolves.toBe('synthetic result');
      expect(h.nativeAttempt).toHaveBeenCalledOnce();
    });
  }
});
