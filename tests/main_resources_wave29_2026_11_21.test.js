// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const React = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function loadModule(rel) {
  // eslint-disable-next-line no-new-func
  new Function(read(rel))();
}

describe('Round 8 Wave 29 — Crypto, Vault, Privacy, Sync, Safety, AI Backend & Error Reporter (12 modules)', () => {
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.React = React;
    window.AlloModules = {};
    delete window.__alloQrStudentMode;
    delete window.__alloStudentView;
    delete window.__alloSensitiveWorkspaceContext;
    delete window.ALLOFLOW_MANAGED_AI_POLICY;
    delete window.ALLOFLOW_SENSITIVE_RECORD_RETENTION_POLICY;
    delete window.AI_BACKEND_CONFIG;
    delete window._isCanvasEnv;
    delete window.SafetyContentChecker;
    delete window.WebSearchProvider;
    delete window.AIProvider;
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('1. allo_crypto_module: wrapVaultKey rejects instead of wrapping zeroed DEK when destroyed mid-KDF', async () => {
    const AlloCrypto = require(path.join(ROOT, 'allo_crypto_module.js'));
    const dek = await AlloCrypto.createVaultKey();
    const wrapPromise = AlloCrypto.wrapVaultKey(dek, 'StrongPass123!', { iterations: 100000 });
    AlloCrypto.destroyVaultKey(dek);
    await expect(wrapPromise).rejects.toThrow(/destroyed/i);
  });

  it('2. allo_device_vault_module: disableProtection aborts on concurrent lock, clone strips __proto__, setPolicy validates IDs', async () => {
    const AlloCrypto = require(path.join(ROOT, 'allo_crypto_module.js'));
    const Vault = require(path.join(ROOT, 'allo_device_vault_module.js'));
    let mem = { version: 1, retentionPolicy: 'standard', effectiveRetentionPolicy: 'standard', snapshots: [{ id: 's1', title: 'Alpha', savedAt: '2026-08-12T10:00:00.000Z', resourceCount: 1, approximateBytes: 100 }] };
    let rev = 1;
    const repo = {
      async read() { return { revision: rev, store: JSON.parse(JSON.stringify(mem)) }; },
      async compareAndSwap(expected, next) { if (expected !== rev) return false; mem = JSON.parse(JSON.stringify(next)); rev++; return true; }
    };
    const vault = Vault.createRecoveryVaultController({ repository: repo, crypto: AlloCrypto, cryptoOptions: { iterations: 100000 } });
    await vault.enableProtection('StrongPass123!');
    await expect(vault.setPolicy('bogus-policy')).rejects.toMatchObject({ code: 'VAULT_POLICY_INVALID' });
    const autoPol = await vault.setPolicy('automatic');
    expect(autoPol.store.effectiveRetentionPolicy).toBe('standard');

    // Concurrent lock during disableProtection must fail closed without overwriting encrypted store with plaintext
    const origDecrypt = vault._decryptRecord.bind(vault);
    vault._decryptRecord = async (...args) => {
      const res = await origDecrypt(...args);
      vault.lock();
      return res;
    };
    await expect(vault.disableProtection()).rejects.toMatchObject({ code: 'VAULT_LOCKED' });
    expect(Vault.isVaultStore(mem)).toBe(true);
  });

  it('3. allo_recovery_vault_integration_module: accepts revision 0 and aligns namespace scope with DeviceStorage', async () => {
    const Integration = require(path.join(ROOT, 'allo_recovery_vault_integration_module.js'));
    const fakeStorage = {
      async get() { return { revision: 0, version: 1, snapshots: [] }; },
      async compareAndSwap() { return { applied: true }; }
    };
    const repo = Integration.createDeviceRepository(fakeStorage);
    const head = await repo.read();
    expect(head.revision).toBe(0);
    expect(() => Integration.createDeviceRepository(fakeStorage, { namespace: 'bad:scope' })).toThrow();
  });

  it('4. allo_device_storage_module: blocks probe for function-based learner context and fails closed on invalid retention policy', () => {
    const src = read('allo_device_storage_module.js');
    expect(src).toContain("typeof ctxRaw === 'function' ? ctxRaw() : ctxRaw");
    expect(src).toContain("if (!pol || typeof pol !== 'object' || Array.isArray(pol)) return true;");
    expect(src).toContain("if (!Object.prototype.hasOwnProperty.call(pol, 'version') || pol.version !== 1) return true;");
    expect(src).toContain("if (result && result.applied !== false)");
    expect(src).toContain("inputLabel.setAttribute('for', 'allo-device-storage-code-input')");
  });

  it('5. submission_crypto_module: MAX_CIPHERTEXT_B64 accommodates MAX_PLAINTEXT_BYTES+16 and inline script enforces size cap & JWK checks', () => {
    const src = read('submission_crypto_module.js');
    expect(src).toContain('Math.ceil((MAX_PLAINTEXT_BYTES + 16) / 3) * 4');
    expect(src).toContain('new Uint8Array(aesKeyRaw).fill(0)');
    expect(src).toContain('Could not decrypt the submission payload.');
    loadModule('submission_crypto_module.js');
    const inline = window.AlloModules.SubmissionCrypto.INLINE_ENCRYPT_SCRIPT;
    expect(inline).toContain('payloadBytes.byteLength > 25165824');
    expect(inline).toContain('Array.isArray(publicJwk)');
    expect(inline).toContain('publicJwk.p !== undefined');
  });

  it('6. device_access_code_module: unlockAiKeyWithCode returns not-configured when no locked record, lockAiKey protects unsaved edits, and changeCode re-encrypts AI_LOCKED_KEY', async () => {
    const AlloCrypto = require(path.join(ROOT, 'allo_crypto_module.js'));
    window.AlloModules.AlloCrypto = AlloCrypto;
    loadModule('device_access_code_module.js');
    const dac = window.AlloModules.DeviceAccessCode;

    // No locked record + unconfigured must NOT report unlocked
    const emptyUnlock = await dac.unlockAiKeyWithCode('anything');
    expect(emptyUnlock).toMatchObject({ ok: false, reason: 'not-configured' });

    // Protect a key, change code, and verify unlock with new code works
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ backend: 'gemini', apiKey: 'AIzaTestKey1234567890' }));
    await dac.protectAiKey('Code-One-11', { iterations: 100000 });
    expect(dac.aiKeyStatus().saved).toBe(true);

    // Edit session key (unsaved) — lockAiKey must not silently wipe unsaved edits
    dac.splitAiSecretsForSave({ backend: 'gemini', apiKey: 'AIzaUnsavedEdit987654321' });
    expect(dac.aiKeyStatus().unsaved).toBe(true);
    expect(dac.lockAiKey()).toBe(false);

    // Change code must migrate locked AI secrets under the new code
    const changed = await dac.changeCode('Code-One-11', 'Code-Two-22', { iterations: 100000 });
    expect(changed.ok).toBe(true);
    expect(dac.lockAiKey()).toBe(true);
    const unlocked = await dac.unlockAiKeyWithCode('Code-Two-22', { iterations: 100000 });
    expect(unlocked).toMatchObject({ ok: true, reason: 'unlocked' });
  });

  it('7. identifier_redaction_module: redacts accented & non-Latin names, surfaces unlistedTitledNames, and preserves newly added targets past 100', async () => {
    const IR = require(path.join(ROOT, 'identifier_redaction_module.js'));
    const scrubbed = IR.scrubIdentifiers('José Álvarez and 田中太郎 live at 123 Oak Ridge Dr.', {
      studentName: 'José Álvarez',
      people: [{ name: '田中太郎', role: 'Peer' }]
    });
    expect(scrubbed).not.toContain('José');
    expect(scrubbed).not.toContain('Álvarez');
    expect(scrubbed).not.toContain('田中太郎');
    expect(scrubbed).toContain('[Student]');
    expect(scrubbed).toContain('[Peer]');
    expect(scrubbed).toContain('[ADDRESS]');

    // SensitivePromptReview renders unlistedTitledNames
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const analysis = IR.analyzeRedaction('Dr. Kowalski met with Mark.', { studentName: 'Mark Rivera' });
    expect(analysis.unlistedTitledNames).toContain('Kowalski');
    await act(async () => {
      root.render(React.createElement(IR.SensitivePromptReview, {
        React,
        review: { id: 1, prompt: 'Dr. Kowalski met with Mark.', analysis },
        onAccept: () => ({ sent: true, changed: false }),
        onCancel: () => {}
      }));
    });
    expect(container.textContent).toContain('Kowalski');
    expect(container.textContent).toContain('Mark');
    await act(async () => { root.unmount(); });
  });

  it('8. sensitive_workspace_module: ensure() disposes failed service and deletion review lists all 6 clinical tools', () => {
    const src = read('sensitive_workspace_module.js');
    expect(src).toContain('try { svc.dispose(); } catch (_) {}');
    expect(src).toContain('Educator Evaluation, SPED Timelines, and MTSS Triage');
    expect(src).toContain('service.subscribe(refresh)');
  });

  it('9. firestore_sync_module: withholds stringified/nested quiz keys & voice clips, fails closed on blank draft, handles cycles & falsy gameData', () => {
    loadModule('firestore_sync_module.js');

    // Stringified graded quiz keys are withheld via prepareSessionResourcesForWrite
    const quizPayload = {
      deliverySettings: { feedbackTiming: 'teacher-graded' },
      questions: [{ question: '2+2?', correctAnswer: '4', options: [{ text: '4', isCorrect: true }] }]
    };
    const withheld = window.prepareSessionResourcesForWrite([{ type: 'quiz', data: JSON.stringify(quizPayload) }]).resources[0];
    expect(withheld.data.answerKeysWithheld).toBe(true);
    expect(withheld.data.questions[0].correctAnswer).toBeUndefined();
    expect(withheld.data.questions[0].options[0].isCorrect).toBeUndefined();

    // Nested/stringified fluency voice clip & persona chatHistory stripped
    const cloud = window.sanitizeHistoryForCloud([
      { type: 'fluency-record', data: JSON.stringify({ wpm: 90, nested: { audioRecording: 'data:audio/wav;base64,AAA' } }) },
      { type: 'persona', data: JSON.stringify([{ name: 'Ada', chatHistory: ['secret'] }]) }
    ]);
    expect(JSON.stringify(cloud)).not.toContain('audioRecording');
    expect(JSON.stringify(cloud)).not.toContain('chatHistory');

    // Circular object does not stack-overflow stripUndefined
    const cyc = { a: 1, b: undefined };
    cyc.self = cyc;
    const stripped = window.stripUndefined(cyc);
    expect(stripped.a).toBe(1);
    expect('b' in stripped).toBe(false);

    // Falsy JSON gameData (false) is preserved by hydrateHistory
    const hydrated = window.hydrateHistory([{ type: 'games', data: '{}', gameData: 'false' }]);
    expect(hydrated[0].gameData).toBe(false);

    // Blank draft fails closed when GenDispatcher has not loaded
    const prepared = window.prepareSessionResourcesForWrite([{ type: 'quiz', lessonPath: { seed: { kind: 'blank' } }, data: {} }]);
    expect(prepared.resources.length).toBe(0);
  });

  it('10. safety_checker_module: does not flag non-Latin or math as gibberish, blocks Canvas arbitrary key under managed policy, respects local backend', async () => {
    loadModule('safety_checker_module.js');
    const SC = window.SafetyContentChecker;
    expect(SC.check('2 + 2 = 4')).toEqual([]);
    expect(SC.check('مرحبا بالعالم')).toEqual([]);
    expect(SC.check('こんにちは世界')).toEqual([]);
    expect(SC.check('!!! ???').some((f) => f.category === 'gibberish')).toBe(true);

    // Canvas mode with managed policy canvasHost:true must NOT authorize an arbitrary apiKey
    window._isCanvasEnv = true;
    window.ALLOFLOW_MANAGED_AI_POLICY = {
      version: 1,
      enabled: true,
      connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', canvasHost: true }]
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
    await SC.aiCheck('This is a normal classroom message to test policy.', 'chat', 'AIzaArbitraryKey', () => {});
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('11. ai_backend_module: rejects unsafe baseUrl fallback, blocks object __alloQrStudentMode in _serperDirectKey, restores models on failed testConnection', async () => {
    loadModule('ai_backend_module.js');
    const badProvider = new window.AIProvider({ backend: 'openai', baseUrl: 'http://evil.example/v1', apiKey: 'sk-test' });
    expect(badProvider.baseUrl).toBe('');

    localStorage.setItem('alloflow_ai_config', JSON.stringify({ serperApiKey: 'serper-secret' }));
    window.__alloQrStudentMode = { active: true, aiPolicy: 'off' };
    expect(window.WebSearchProvider._serperDirectKey()).toBe('');

    const provider = new window.AIProvider({ backend: 'openai', baseUrl: 'https://api.openai.com', apiKey: 'sk-test', models: { default: 'orig-model', flash: 'orig-flash' } });
    provider.listAvailableModels = async () => [{ id: 'other-model' }];
    provider.generateText = async () => { throw new Error('probe failed'); };
    const res = await provider.testConnection();
    expect(res.success).toBe(false);
    expect(provider.models.default).toBe('orig-model');
    expect(provider.models.flash).toBe('orig-flash');
  });

  it('12. error_reporter_module: quietStudentView activates for object __alloQrStudentMode and openPanel marks background inert', () => {
    window.__alloQrStudentMode = { active: true };
    loadModule('error_reporter_module.js');
    const bg = document.createElement('main');
    bg.textContent = 'App content';
    document.body.appendChild(bg);
    window.AlloModules.ErrorReporter.openPanel('errors');
    const panel = document.getElementById('allo-err-panel');
    expect(panel).not.toBeNull();
    expect(panel.querySelector('[data-aer-student-report]')).not.toBeNull();
    expect(bg.hasAttribute('inert')).toBe(true);
    document.getElementById('aer-close').click();
    expect(bg.hasAttribute('inert')).toBe(false);
  });
});
