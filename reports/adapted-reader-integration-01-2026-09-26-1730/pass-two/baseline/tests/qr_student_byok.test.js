import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const modalSource = readFileSync(resolve(process.cwd(), 'view_misc_modals_source.jsx'), 'utf8');
const headerSource = readFileSync(resolve(process.cwd(), 'view_header_source.jsx'), 'utf8');
const phaseOSource = readFileSync(resolve(process.cwd(), 'phase_o_misc_handlers_source.jsx'), 'utf8');

function sliceBetween(startMarker, endMarker) {
  const start = anti.indexOf(startMarker);
  const end = anti.indexOf(endMarker, start);
  if (start === -1 || end === -1) throw new Error(`markers not found: ${startMarker} .. ${endMarker}`);
  return anti.slice(start, end);
}

const readPackSource = sliceBetween('function _alloReadAlloPackParam()', 'function _buildAlloPackShareUrl');
const guardSource = sliceBetween('function _alloHasAnyStudentEntry()', 'function _loadAlloQrLibrary');
const configSource = sliceBetween('function _readAlloAiUserConfig()', 'function _usesLocalTextBackend');

function makeStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function createRuntime({ href, studentConfig, teacherConfig } = {}) {
  const sessionStorage = makeStorage(studentConfig ? {
    alloflow_qr_student_ai_config: JSON.stringify(studentConfig),
  } : {});
  const localStorage = makeStorage(teacherConfig ? {
    alloflow_ai_config: JSON.stringify(teacherConfig),
  } : {});
  const fakeWindow = {
    location: new URL(href || 'https://alloflow-cdn.pages.dev/app/'),
    sessionStorage,
    localStorage,
    dispatchEvent: vi.fn(),
  };
  const factory = new Function(
    'window',
    'localStorage',
    'CustomEvent',
    `
      const ALLO_QR_PACK_PARAM = 'allo_pack';
      const ALLO_QR_STUDENT_AI_OFF_KEY = 'alloflow_qr_student_ai_disabled';
      const ALLO_QR_STUDENT_AI_CONFIG_KEY = 'alloflow_qr_student_ai_config';
      const ALLO_STUDENT_AI_CONFIG_EVENT = 'alloflow:student-ai-config-changed';
      const ALLO_STUDENT_AI_VALIDATION_TTL_MS = 6 * 60 * 60 * 1000;
      const apiKey = 'bundled-teacher-key';
      let callGemini = async () => 'original-text';
      let callGeminiVision = async () => 'original-vision';
      let callGeminiImageEdit = async () => 'original-image';
      const callGeminiAudio = async () => 'original-audio';
      let geminiUpgrades = 0;
      let ttsUpgrades = 0;
      function _upgradeGeminiAPI() { geminiUpgrades += 1; callGemini = async () => 'student-text'; window.callGemini = callGemini; }
      function _upgradeTTS() { ttsUpgrades += 1; }
      ${readPackSource}
      ${guardSource}
      ${configSource}
      return {
        window,
        readConfig: _readAlloAiUserConfig,
        effectiveGeminiKey: _alloEffectiveGeminiApiKey,
        isDisabled: _isQrStudentAiDisabled,
        isValidated: _alloStudentAiConfigIsValidated,
        fingerprint: _alloStudentAiConfigFingerprint,
        installGuard: _installQrStudentAiGuard,
        sync: _syncQrStudentAiAccess,
        setPolicy: _alloSetQrStudentAiPolicy,
        applyPolicy: _alloApplyAuthoritativeStudentAiPolicy,
        disconnect: _alloDisconnectStudentAi,
        upgrades: () => ({ gemini: geminiUpgrades, tts: ttsUpgrades }),
      };
    `,
  );
  return factory(fakeWindow, localStorage, globalThis.CustomEvent);
}

function installValidatedStudentConfig(runtime, config, validationPatch = {}) {
  const next = {
    ...config,
    validation: {
      ok: true,
      backend: config.backend || 'gemini',
      fingerprint: runtime.fingerprint(config),
      capabilities: {
        text: true,
        vision: false,
        image: false,
        imageEdit: false,
        audio: false,
      },
      testedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      ...validationPatch,
    },
  };
  runtime.window.sessionStorage.setItem('alloflow_qr_student_ai_config', JSON.stringify(next));
  return next;
}

describe('QR and mailbox personal AI policy', () => {
  const teacherConfig = {
    backend: 'gemini',
    apiKey: 'teacher-secret',
    validation: { ok: true, backend: 'gemini', text: true },
  };

  it('defaults student links to AI off and never reads the teacher persistent credential', async () => {
    const runtime = createRuntime({
      href: 'https://alloflow-cdn.pages.dev/app/?allo_join=ABCDE&allo_ai=off',
      teacherConfig,
    });

    expect(runtime.readConfig()).toBeNull();
    expect(runtime.effectiveGeminiKey()).toBe('');
    expect(runtime.isDisabled()).toBe(true);
    expect(runtime.sync()).toBe(false);
    expect(runtime.window.sessionStorage.getItem('alloflow_qr_student_ai_disabled')).toBe('1');
    await expect(runtime.window.callGemini('hello')).rejects.toMatchObject({ code: 'allo-qr-ai-disabled' });
  });

  it('unlocks only a fingerprint-matched, unexpired session provider after authoritative BYOK policy', () => {
    const baseConfig = {
      backend: 'openai',
      apiKey: 'student-secret',
      baseUrl: 'https://api.openai.com',
    };
    const runtime = createRuntime({
      href: 'https://alloflow-cdn.pages.dev/app/?allo_mb=handoff&allo_ai=byok',
      studentConfig: baseConfig,
      teacherConfig,
    });
    const studentConfig = installValidatedStudentConfig(runtime, baseConfig);
    runtime.setPolicy('student-byok', { type: 'mailbox-live' }, { authoritative: true });

    expect(runtime.readConfig()).toEqual(studentConfig);
    expect(runtime.effectiveGeminiKey()).toBe('');
    expect(runtime.isValidated(studentConfig)).toBe(true);
    expect(runtime.isDisabled()).toBe(false);
    expect(runtime.sync()).toBe(true);
    expect(runtime.upgrades()).toEqual({ gemini: 2, tts: 2 });
    expect(runtime.window.sessionStorage.getItem('alloflow_qr_student_ai_disabled')).toBeNull();
  });

  it('keeps BYOK locked for missing keys, expired validation, or config edits after testing', () => {
    const runtime = createRuntime({
      href: 'https://alloflow-cdn.pages.dev/app/?allo_assignment=HW-1&allo_ai=byok',
      studentConfig: { backend: 'gemini', apiKey: 'student-secret' },
    });
    runtime.setPolicy('student-byok', { type: 'assignment' }, { authoritative: true });

    const missingKey = installValidatedStudentConfig(runtime, { backend: 'gemini', apiKey: '' });
    expect(runtime.isValidated(missingKey)).toBe(false);

    const expired = installValidatedStudentConfig(
      runtime,
      { backend: 'gemini', apiKey: 'student-secret' },
      { expiresAt: new Date(Date.now() - 1_000).toISOString() },
    );
    expect(runtime.isValidated(expired)).toBe(false);

    const validated = installValidatedStudentConfig(runtime, { backend: 'gemini', apiKey: 'student-secret' });
    const edited = { ...validated, apiKey: 'changed-after-test' };
    runtime.window.sessionStorage.setItem('alloflow_qr_student_ai_config', JSON.stringify(edited));
    expect(runtime.isValidated(edited)).toBe(false);
  });

  it('does not trust allo_ai=byok in the URL and erases credentials on authoritative off', () => {
    const runtime = createRuntime({
      href: 'https://alloflow-cdn.pages.dev/app/?allo_pack=0.abc&allo_ai=byok',
      studentConfig: { backend: 'gemini', apiKey: 'student-gemini-key' },
      teacherConfig,
    });
    installValidatedStudentConfig(runtime, { backend: 'gemini', apiKey: 'student-gemini-key' });
    expect(runtime.isDisabled()).toBe(true);
    runtime.applyPolicy({ aiPolicy: { studentAi: 'student-byok' } }, { type: 'assignment-pack' });
    expect(runtime.effectiveGeminiKey()).toBe('student-gemini-key');
    runtime.applyPolicy({ aiPolicy: { studentAi: 'off' } }, { type: 'assignment-pack' });
    expect(runtime.window.__alloQrStudentMode.aiPolicy).toBe('off');
    expect(runtime.isDisabled()).toBe(true);
    expect(runtime.window.sessionStorage.getItem('alloflow_qr_student_ai_config')).toBeNull();
  });
});

describe('student AI setup source wiring', () => {
  it('stores credentials in sessionStorage, invalidates edits, and requires a connection test', () => {
    expect(modalSource).toContain('window.sessionStorage');
    expect(modalSource).toContain("'alloflow_qr_student_ai_config'");
    expect(modalSource).toContain('delete next.validation');
    expect(modalSource).toContain('testConnection()');
    expect(modalSource).toContain('Use only your own provider account.');
    expect(modalSource).toContain('fingerprintAIBackendConfig');
    expect(modalSource).toContain('expiresAt');
    expect(modalSource).toContain('lockedControls');
    expect(modalSource).not.toContain("configStorageKey = isStudentAiSetup ? 'alloflow_ai_config'");
  });

  it('exposes setup while AI features remain locked and never inherits the active teacher provider', () => {
    expect(headerSource).toContain('window.__alloStudentAiSetupAllowed');
    // Labels are i18n'd now; the configured-state toggle is what matters.
    expect(headerSource).toContain('window.__alloStudentAiConfigured ? personalAIReadyLabel : personalAIConnectLabel');
    expect(headerSource).toContain("t('header.personal_ai_ready') || 'AI ready'");
    expect(headerSource).toContain('header_student_ai_disconnect');
    expect(modalSource).toContain('const canInheritActiveProvider = !isStudentAiSetup');
    expect(anti).toContain("apiKey: _alloHasAnyStudentEntry() ? (_aiUserConfig?.apiKey || '')");
  });

  it('carries teacher policy in live-session documents and starts student entry pending', () => {
    expect(phaseOSource).toContain('aiPolicy');
    expect(phaseOSource).toContain("studentAi: studentAiPolicyForShare === 'student-byok' ? 'student-byok' : 'off'");
    expect(anti).toContain("_alloSetQrStudentAiPolicy('pending', { type: 'live'");
    expect(anti).toContain('_alloApplyAuthoritativeStudentAiPolicy(sessionInfo');
    expect(anti).toContain('Failed to sync student AI policy to the active session:');
    expect(anti).not.toContain('_alloSetQrStudentAiPolicy(_alloQrStudentAiPolicyFromLocation()');
  });
});
