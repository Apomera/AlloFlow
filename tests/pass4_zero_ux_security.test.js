import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { loadAlloModule } from './setup.js';

const ROOT = process.cwd();
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  expect(start, `Missing marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start);
  expect(end, `Missing end marker: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Pass-4 F-34: SEL _lsKey allowlist and aiKeyDestination binding', () => {
  beforeAll(() => {
    loadAlloModule('allo_crypto_module.js');
    loadAlloModule('device_access_code_module.js');
    loadAlloModule('misc_handlers_module.js');
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.APP_CONFIG = { _cfg_validation_key: '' };
  });

  it('keeps F-34 built modules synchronized with desktop/web-app/public mirrors', () => {
    expect(read('misc_handlers_module.js')).toBe(read('desktop/web-app/public/misc_handlers_module.js'));
    expect(read('device_access_code_module.js')).toBe(read('desktop/web-app/public/device_access_code_module.js'));
  });

  it('blocks arbitrary localStorage key overwrites and prototype pollution in MiscHandlers.handleLoadProject', async () => {
    localStorage.setItem('alloflow_educator_access_code_v1', 'keep-pin');
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com' }));
    localStorage.setItem('allo_adminhubdrive_config_v1', '{"url":"https://script.google.com/macros/s/safe/exec"}');

    const payloadJson = '{"history":[],"selToolData":{"__proto__":{"polluted":true},"evilPin":{"_lsKey":"alloflow_educator_access_code_v1","_lsValue":"pwn"},"evilAi":{"_lsKey":"alloflow_ai_config","_lsValue":"pwn"},"evilDrive":{"_lsKey":"allo_adminhubdrive_config_v1","_lsValue":"pwn"},"voice":{"_lsKey":"alloSelVoiceDetective1","_lsValue":{"ok":1}},"breath":{"_lsKey":"alloflow_sel_breathing","_lsValue":{"ok":2}},"mood":{"_lsKey":"sel_mood_check","_lsValue":{"ok":3}}}}';

    const origFileReader = globalThis.FileReader;
    class MockFileReader {
      readAsText() {
        setTimeout(() => {
          if (this.onload) this.onload({ target: { result: payloadJson } });
        }, 0);
      }
      abort() {}
    }
    globalThis.FileReader = MockFileReader;

    try {
      const deps = new Proxy(
        {
          t: (k) => k,
          warnLog: vi.fn(),
          addToast: vi.fn(),
          hydrateHistory: (h) => h,
          normalizeArtifactInstanceIds: (h) => h,
          projectFileInputRef: { current: { value: 'test.alloflow' } },
          onProjectLoadStart: vi.fn(),
          onProjectLoadComplete: vi.fn(),
        },
        {
          get(target, prop) {
            if (prop in target) return target[prop];
            return () => {};
          },
        }
      );

      window.AlloModules.MiscHandlers.handleLoadProject(
        { target: { files: [{ name: 'test.alloflow', size: payloadJson.length }] } },
        deps
      );
      await new Promise((r) => setTimeout(r, 30));

      expect(localStorage.getItem('alloflow_educator_access_code_v1')).toBe('keep-pin');
      expect(localStorage.getItem('alloflow_ai_config')).toContain('generativelanguage.googleapis.com');
      expect(localStorage.getItem('allo_adminhubdrive_config_v1')).toContain('script.google.com');
      expect({}.polluted).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(window.__alloflowSelToolData, '__proto__')).toBe(false);
      expect(JSON.parse(localStorage.getItem('alloSelVoiceDetective1'))).toEqual({ ok: 1 });
      expect(JSON.parse(localStorage.getItem('alloflow_sel_breathing'))).toEqual({ ok: 2 });
      expect(JSON.parse(localStorage.getItem('sel_mood_check'))).toEqual({ ok: 3 });
    } finally {
      globalThis.FileReader = origFileReader;
    }
  });

  it('enforces SEL-only _lsKey allowlist in AlloFlowANTI.txt _alloApplyCanvasSelAuthoringState', () => {
    const anti = read('AlloFlowANTI.txt');
    const fnSrc = sliceBetween(anti, 'const _alloApplyCanvasSelAuthoringState = (candidate) => {', '\nconst ');
    const fakeStorage = new Map([
      ['alloflow_educator_access_code_v1', 'keep-pin'],
      ['alloSelOldKey', 'old'],
    ]);
    const localStorageStub = {
      getItem: (k) => (fakeStorage.has(k) ? fakeStorage.get(k) : null),
      setItem: (k, v) => fakeStorage.set(k, String(v)),
      removeItem: (k) => fakeStorage.delete(k),
    };
    const fakeWindow = {
      __alloflowSelToolData: {
        priorEvil: { _lsKey: 'alloflow_educator_access_code_v1' },
        priorSel: { _lsKey: 'alloSelOldKey' },
      },
      dispatchEvent: vi.fn(),
    };
    const apply = new Function('window', 'localStorage', 'CustomEvent', `${fnSrc}\nreturn _alloApplyCanvasSelAuthoringState;`)(
      fakeWindow,
      localStorageStub,
      function (name) { this.type = name; }
    );

    const parsedCandidate = JSON.parse('{"stations":[],"snapshots":[],"toolData":{"evil":{"_lsKey":"alloflow_educator_access_code_v1","_lsValue":"pwn"},"bad":{"_lsKey":"alloflow_ai_config","_lsValue":"pwn"},"ok":{"_lsKey":"sel_ok_key","_lsValue":{"v":42}}}}');
    apply(parsedCandidate);

    expect(fakeStorage.get('alloflow_educator_access_code_v1')).toBe('keep-pin');
    expect(fakeStorage.has('alloflow_ai_config')).toBe(false);
    expect(fakeStorage.has('alloSelOldKey')).toBe(false);
    expect(fakeStorage.get('sel_ok_key')).toBe('{"v":42}');
  });

  it('binds apiKeyDestination in DeviceAccessCode and AlloFlowANTI _alloStoredAiConfig and drops mismatched credentials', async () => {
    const access = window.AlloModules.DeviceAccessCode;
    const opts = { iterations: 50000, now: 1000 };

    const mismatch = access.splitAiSecretsForSave({
      backend: 'gemini',
      apiKey: 'AIzaShouldBeDropped',
      apiKeyDestination: 'custom|https://evil.example',
    });
    expect(mismatch.apiKey).toBeUndefined();
    expect(JSON.parse(sessionStorage.getItem(access.AI_SESSION_KEY) || '{}').apiKey).toBeUndefined();

    const savedGemini = access.splitAiSecretsForSave({
      backend: 'gemini',
      apiKey: 'AIzaLegitGeminiKey',
      ttsProvider: 'auto',
    });
    localStorage.setItem('alloflow_ai_config', JSON.stringify(savedGemini));
    expect(savedGemini.apiKey).toBeUndefined();
    expect(savedGemini.apiKeyDestination).toBe('gemini|https://generativelanguage.googleapis.com');

    await access.protectAiKey('Cedar-Hill-77', opts);
    sessionStorage.clear();
    expect(await access.verify('Cedar-Hill-77', opts)).toMatchObject({ ok: true });
    const unlockedSession = JSON.parse(sessionStorage.getItem(access.AI_SESSION_KEY));
    expect(unlockedSession.apiKey).toBe('AIzaLegitGeminiKey');
    expect(unlockedSession.apiKeyDestination).toBe('gemini|https://generativelanguage.googleapis.com');

    const anti = read('AlloFlowANTI.txt');
    const aiFnSrc = sliceBetween(anti, 'function _alloAiCredentialDestination(config) {', "if (typeof window !== 'undefined') window.__alloReadStoredAiConfig");
    const runRead = (storedObj, sessionObj) => {
      const store = new Map([['alloflow_ai_config', JSON.stringify(storedObj)]]);
      const sess = new Map(sessionObj ? [['alloflow_ai_secrets_session_v1', JSON.stringify(sessionObj)]] : []);
      const factory = new Function(
        'window',
        'localStorage',
        `${aiFnSrc}\nreturn { dest: _alloAiCredentialDestination, read: _alloStoredAiConfig };`
      );
      return factory(
        { sessionStorage: { getItem: (k) => (sess.has(k) ? sess.get(k) : null) } },
        { getItem: (k) => (store.has(k) ? store.get(k) : null) }
      ).read();
    };

    const legit = runRead(
      { backend: 'gemini', apiKeyDestination: 'gemini|https://generativelanguage.googleapis.com' },
      unlockedSession
    );
    expect(legit.apiKey).toBe('AIzaLegitGeminiKey');

    const redirected = runRead(
      { backend: 'custom', baseUrl: 'https://evil.example/v1', apiKeyDestination: 'gemini|https://generativelanguage.googleapis.com' },
      unlockedSession
    );
    expect(redirected.apiKey).toBeUndefined();

    const plaintextMismatch = runRead(
      { backend: 'custom', baseUrl: 'https://evil.example/v1', apiKey: 'sk-stolen', apiKeyDestination: 'openai|https://api.openai.com' },
      null
    );
    expect(plaintextMismatch.apiKey).toBeUndefined();
  });
});

describe('Pass-4 F-35 & F-40: Admin Hub Drive URL allowlist and backup scrubbing', () => {
  beforeAll(() => {
    globalThis.React = globalThis.React || {
      useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
      useEffect: () => {},
      useRef: (v) => ({ current: v }),
    };
    loadAlloModule('admin_hub_module.js');
  });

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps admin_hub_module.js mirrored in desktop/web-app/public', () => {
    expect(read('admin_hub_module.js')).toBe(read('desktop/web-app/public/admin_hub_module.js'));
  });

  it('blocks non-Apps-Script or query-bearing Drive backup URLs before fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('allo_mtss_triage_v1', JSON.stringify({ ok: 1 }));

    const rejectedUrls = [
      'http://script.google.com/macros/s/AKfycbTest123/exec',
      'https://evil.example/macros/s/AKfycbTest123/exec',
      'https://script.google.com/macros/s/AKfycbTest123/exec?exfil=1',
      'https://user:pass@script.google.com/macros/s/AKfycbTest123/exec',
      'https://script.google.com/macros/s/AKfycbTest123/dev',
    ];
    for (const badUrl of rejectedUrls) {
      localStorage.setItem('allo_adminhubdrive_config_v1', JSON.stringify({ url: badUrl, token: 't1' }));
      const res = await window.AlloModules.AdminHub.maybeDriveBackup({ force: true });
      expect(res.status, badUrl).toBe('no-config');
    }
    expect(fetchMock).not.toHaveBeenCalled();

    const acceptedUrls = [
      'https://script.google.com/macros/s/AKfycbTest123/exec',
      'https://script.google.com/a/macros/district.edu/s/AKfycbTest123/exec',
    ];
    for (const goodUrl of acceptedUrls) {
      localStorage.setItem('allo_adminhubdrive_config_v1', JSON.stringify({ url: goodUrl, token: 't1' }));
      const res = await window.AlloModules.AdminHub.maybeDriveBackup({ force: true });
      expect(res.status, goodUrl).toBe('saved');
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('strips wcop delivery tokens and omits real evaluation stash during Sample Mode', async () => {
    let sentBody = null;
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      sentBody = JSON.parse(init.body);
      return { json: async () => ({ ok: true }) };
    }));

    localStorage.setItem('allo_adminhubdrive_config_v1', JSON.stringify({
      url: 'https://script.google.com/macros/s/AKfycbTest123/exec',
      token: 'drive-write-tok',
    }));
    localStorage.setItem('allo_wcop_delivery_v1', JSON.stringify({
      url: 'https://script.google.com/macros/s/AKfycbWcop/exec',
      token: 'secret-wcop-token',
      wr_admin_token: 'secret-wr-admin',
      school: 'Oak Elementary',
    }));
    localStorage.setItem('allo_educator_evaluation_real_stash_v1', JSON.stringify({ privateEval: 'sensitive' }));
    localStorage.setItem('allo_educator_evaluation_workspace_v1', JSON.stringify({ config: { sampleMode: true } }));

    const sampleRes = await window.AlloModules.AdminHub.maybeDriveBackup({ force: true });
    expect(sampleRes.status).toBe('saved');
    expect(sentBody.payload.keys.allo_educator_evaluation_real_stash_v1).toBeUndefined();
    const cleanedWcop = JSON.parse(sentBody.payload.keys.allo_wcop_delivery_v1);
    expect(cleanedWcop.token).toBeUndefined();
    expect(cleanedWcop.wr_admin_token).toBeUndefined();
    expect(cleanedWcop.school).toBe('Oak Elementary');

    localStorage.setItem('allo_educator_evaluation_workspace_v1', JSON.stringify({ config: { sampleMode: false } }));
    const liveRes = await window.AlloModules.AdminHub.maybeDriveBackup({ force: true });
    expect(liveRes.status).toBe('saved');
    expect(sentBody.payload.keys.allo_educator_evaluation_real_stash_v1).toBe('{"privateEval":"sensitive"}');
  });
});

describe('Pass-4 F-36: Diagnostic probe, storage bridge, and pre-boot recovery hardening', () => {
  beforeAll(() => {
    loadAlloModule('allo_crypto_module.js');
    loadAlloModule('device_access_code_module.js');
    loadAlloModule('text_utility_helpers_module.js');
    loadAlloModule('allo_device_storage_module.js');
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.APP_CONFIG = { _cfg_validation_key: '' };
    document.body.innerHTML = '';
    window.__alloQrStudentMode = false;
    delete window.__alloSensitiveWorkspaceContext;
    delete window.ALLOFLOW_SENSITIVE_RECORD_RETENTION_POLICY;
    window.history.replaceState({}, '', '/');
    delete window.AlloModules.SensitiveWorkspace;
  });

  it('keeps F-36 files synchronized with desktop/web-app/public mirrors', () => {
    expect(read('text_utility_helpers_module.js')).toBe(read('desktop/web-app/public/text_utility_helpers_module.js'));
    expect(read('allo_device_storage_module.js')).toBe(read('desktop/web-app/public/allo_device_storage_module.js'));
    expect(read('storage_bridge.html')).toBe(read('desktop/web-app/public/storage_bridge.html'));
  });

  it('blocks Ctrl+Alt+Shift+D and __alloOpenDeviceStorageProbe during learner contexts', () => {
    const spyOpen = vi.fn();
    const origOpen = window.alloDeviceStorage.__openProbePanel;
    window.alloDeviceStorage.__openProbePanel = spyOpen;

    try {
      window.__alloQrStudentMode = true;
      window.__alloOpenDeviceStorageProbe();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', ctrlKey: true, altKey: true, shiftKey: true }));
      expect(spyOpen).not.toHaveBeenCalled();

      window.__alloQrStudentMode = false;
      window.__alloSensitiveWorkspaceContext = { learner: true };
      window.__alloOpenDeviceStorageProbe();
      expect(spyOpen).not.toHaveBeenCalled();

      delete window.__alloSensitiveWorkspaceContext;
      window.history.replaceState({}, '', '/?allo_qr=1');
      window.__alloOpenDeviceStorageProbe();
      expect(spyOpen).not.toHaveBeenCalled();

      window.history.replaceState({}, '', '/');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', ctrlKey: true, altKey: true, shiftKey: true }));
      expect(spyOpen).toHaveBeenCalledTimes(1);
    } finally {
      window.alloDeviceStorage.__openProbePanel = origOpen;
    }
  });

  it('gates Export and Erase inside allo_device_storage __openProbePanel on learner mode, legal hold, and Educator Access Code', async () => {
    const origReady = window.alloDeviceStorage.ready;
    const origNamespaces = window.alloDeviceStorage.namespaces;
    const origClear = window.alloDeviceStorage.clearNamespace;
    const clearSpy = vi.fn().mockResolvedValue(undefined);
    window.alloDeviceStorage.ready = vi.fn().mockResolvedValue(undefined);
    window.alloDeviceStorage.namespaces = vi.fn().mockResolvedValue([
      { ns: 'protected_clinical_records', count: 1, bytes: 120 },
      { ns: 'teacher_workspace', count: 1, bytes: 40 },
    ]);
    window.alloDeviceStorage.clearNamespace = clearSpy;

    try {
      const panel = window.alloDeviceStorage.__openProbePanel();
      const viewBtn = [...panel.querySelectorAll('button')].find((b) => b.textContent.includes('View app data'));
      viewBtn.click();
      await new Promise((r) => setTimeout(r, 20));

      const exportBtns = [...panel.querySelectorAll('button')].filter((b) => b.textContent === 'Export');
      const eraseBtns = [...panel.querySelectorAll('button')].filter((b) => b.textContent === 'Erase');
      expect(exportBtns.length).toBe(2);
      expect(eraseBtns.length).toBe(2);

      // 1) Learner context blocks both Export and Erase
      window.__alloQrStudentMode = true;
      exportBtns[0].click();
      expect(panel.textContent).toContain('Export is disabled in student mode.');
      eraseBtns[0].click();
      expect(panel.textContent).toContain('Erasing stored data is disabled in student mode.');
      expect(clearSpy).not.toHaveBeenCalled();
      window.__alloQrStudentMode = false;

      // 2) Legal hold blocks clinical Erase
      localStorage.setItem('alloflow_retention_legal_hold_v1', '1');
      eraseBtns[0].click();
      expect(panel.textContent).toContain('Manual clinical-record deletion is blocked by retention policy or legal hold.');
      expect(clearSpy).not.toHaveBeenCalled();
      localStorage.removeItem('alloflow_retention_legal_hold_v1');

      // 3) Educator Access Code gate prompts & verifies before Export / Erase
      const access = window.AlloModules.DeviceAccessCode;
      await access.setCode('Maple-River-91', { iterations: 50000, now: 1000 });
      exportBtns[1].click();
      const form = document.body.querySelector('form');
      expect(form).toBeTruthy();
      expect(form.textContent).toContain('Educator access code required');
      const cancelBtn = [...form.querySelectorAll('button')].find((b) => b.textContent === 'Cancel');
      cancelBtn.click();
      await new Promise((r) => setTimeout(r, 10));
      expect(clearSpy).not.toHaveBeenCalled();
    } finally {
      window.alloDeviceStorage.ready = origReady;
      window.alloDeviceStorage.namespaces = origNamespaces;
      window.alloDeviceStorage.clearNamespace = origClear;
    }
  });

  it('hardens storage_bridge.html Review Mode and desktop/web-app/public/index.html pre-boot loader', () => {
    const bridge = read('storage_bridge.html');
    expect(bridge).toContain('if (window.top !== window.self)');
    expect(bridge).toContain('function requireBridgeEducatorCode');
    expect(bridge).toContain('PBKDF2-SHA256');
    expect(bridge).toContain('function isClinicalHoldActive');

    const preboot = read('desktop/web-app/public/index.html');
    for (const key of [
      'alloflow_classroom_roster_state_v1',
      'alloflow_classroom_sync_keys',
      'alloflow_educator_access_code_v1',
      'alloflow_educator_access_backoff_v1',
      'alloflow_ai_secrets_locked_v1',
      'allo_adminhubdrive_config_v1',
      'allo_wcop_delivery_v1',
      'allo_educator_evaluation_real_stash_v1',
      'allo_educator_evaluation_workspace_v1',
    ]) {
      expect(preboot).toContain(`${key}: 1`);
    }
    expect(preboot).toContain("value.ns === 'protected_clinical_records'");
    expect(preboot).not.toContain('alloflow_roster_key');
    expect(preboot).toContain('verifyPrebootCode');
    expect(preboot).toContain('isPrebootHoldActive');
  });
});

describe('Pass-4 F-41: Desktop loopback port pinning & saveConfig credential isolation', () => {
  it('pins localPort in desktop runtime frame-ancestors CSP', () => {
    const runtimeSrc = read('desktop/runtime/alloflow-desktop-runtime.cjs');
    const serveBundled = sliceBetween(runtimeSrc, 'function serveBundledApp(', 'async function handleApi(');
    expect(serveBundled).toContain('req.socket.localPort');
    expect(serveBundled).toContain("frame-ancestors 'self' http://127.0.0.1:${localPort} http://localhost:${localPort}");
  });

  it('pins parent origin/port and refuses cross-destination apiKey carryover in alloflow_desktop_bridge.js', async () => {
    const bridgeCode = read('desktop/web-app/public/alloflow_desktop_bridge.js');
    const listeners = [];
    const store = new Map([
      [
        'alloflow_ai_config',
        JSON.stringify({
          backend: 'gemini',
          baseUrl: '',
          apiKey: 'AIzaDesktopSecret',
          apiKeyDestination: 'gemini|https://generativelanguage.googleapis.com',
        }),
      ],
    ]);
    const parentWin = { postMessage: vi.fn() };
    const sandboxWindow = {
      location: new URL('http://127.0.0.1:43115/app/'),
      parent: parentWin,
      localStorage: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
      },
      crypto: {
        getRandomValues: (arr) => crypto.randomFillSync(arr),
      },
      CustomEvent: function CustomEvent(type, init) {
        this.type = type;
        this.detail = init?.detail;
      },
      dispatchEvent: vi.fn(),
      addEventListener: (type, fn) => {
        if (type === 'message') listeners.push(fn);
      },
    };
    sandboxWindow.window = sandboxWindow;

    vm.runInNewContext(bridgeCode, {
      window: sandboxWindow,
      localStorage: sandboxWindow.localStorage,
      CustomEvent: sandboxWindow.CustomEvent,
      document: { readyState: 'complete', addEventListener: vi.fn() },
      setTimeout: vi.fn(),
      URL,
      Promise,
      console,
      caches: undefined,
    });
    expect(listeners.length).toBe(1);
    const onMessage = listeners[0];
    parentWin.postMessage.mockClear();

    // Wrong port -> ignored
    onMessage({
      source: parentWin,
      origin: 'http://localhost:9999',
      data: {
        channel: 'alloflow-desktop-bridge',
        version: 1,
        kind: 'request',
        id: 'wrong-port',
        action: 'config.apply',
        payload: { aiConfig: { backend: 'custom', baseUrl: 'https://evil.example', apiKey: '' } },
      },
    });
    await new Promise((r) => setTimeout(r, 15));
    expect(parentWin.postMessage).not.toHaveBeenCalled();

    // Valid matching port (parent http://localhost:43115 hosting iframe http://127.0.0.1:43115/app/)
    // pins lockedParentOrigin and preserves key on matching destination
    onMessage({
      source: parentWin,
      origin: 'http://localhost:43115',
      data: {
        channel: 'alloflow-desktop-bridge',
        version: 1,
        kind: 'request',
        id: 'same-dest',
        action: 'config.apply',
        payload: { aiConfig: { backend: 'gemini', baseUrl: '', apiKey: '' } },
      },
    });
    await new Promise((r) => setTimeout(r, 15));
    expect(parentWin.postMessage).toHaveBeenCalledTimes(1);
    expect(parentWin.postMessage.mock.lastCall[0].ok).toBe(true);
    const preserved = JSON.parse(store.get('alloflow_ai_config'));
    expect(preserved.apiKey).toBe('AIzaDesktopSecret');
    expect(preserved.apiKeyDestination).toBe('gemini|https://generativelanguage.googleapis.com');

    // Different loopback hostname ([::1] vs pinned http://localhost:43115) is now rejected
    onMessage({
      source: parentWin,
      origin: 'http://[::1]:43115',
      data: {
        channel: 'alloflow-desktop-bridge',
        version: 1,
        kind: 'request',
        id: 'cross-host',
        action: 'config.apply',
        payload: { aiConfig: { backend: 'custom', baseUrl: 'https://evil.example', apiKey: '' } },
      },
    });
    await new Promise((r) => setTimeout(r, 15));
    expect(parentWin.postMessage).toHaveBeenCalledTimes(1);

    // Pinned parent switching backend/baseUrl without incoming key drops stored apiKey
    onMessage({
      source: parentWin,
      origin: 'http://localhost:43115',
      data: {
        channel: 'alloflow-desktop-bridge',
        version: 1,
        kind: 'request',
        id: 'diff-dest',
        action: 'config.apply',
        payload: { aiConfig: { backend: 'openai', baseUrl: 'https://evil.example/v1', apiKey: '' } },
      },
    });
    await new Promise((r) => setTimeout(r, 15));
    expect(parentWin.postMessage).toHaveBeenCalledTimes(2);
    expect(parentWin.postMessage.mock.lastCall[0].ok).toBe(true);
    const cleared = JSON.parse(store.get('alloflow_ai_config'));
    expect(cleared.apiKey).toBe('');
    expect(cleared.apiKeyDestination).toBeUndefined();
  });
});

describe('Pass-4 F-47: Standalone tool opener origin scoping & handshake pinning', () => {
  it('keeps standalone tools synced with desktop/web-app/public mirrors', () => {
    expect(read('video_studio/video_studio.html')).toBe(read('desktop/web-app/public/video_studio/video_studio.html'));
    expect(read('data_lab/data_lab.html')).toBe(read('desktop/web-app/public/data_lab/data_lab.html'));
    expect(read('alphafold_explorer/alphafold_explorer.html')).toBe(read('desktop/web-app/public/alphafold_explorer/alphafold_explorer.html'));
  });

  it('restricts video_studio openerOriginRecognised to AlloFlow and Canvas hosts', () => {
    const vs = read('video_studio/video_studio.html');
    const fnSrc = sliceBetween(vs, 'function openerOriginRecognised(origin) {', 'var unknownOriginSendApproved = false;');
    const recognise = new Function(`${fnSrc}\nreturn openerOriginRecognised;`)();

    expect(recognise('https://alloflow-cdn.pages.dev')).toBe(true);
    expect(recognise('https://branch.alloflow-cdn.pages.dev')).toBe(true);
    expect(recognise('https://alloflow.org')).toBe(true);
    expect(recognise('https://1234.usercontent.goog')).toBe(true);
    expect(recognise('http://localhost:3000')).toBe(true);

    expect(recognise('https://evil.pages.dev')).toBe(false);
    expect(recognise('https://evil.web.app')).toBe(false);
    expect(recognise('https://evil.firebaseapp.com')).toBe(false);
    expect(recognise('https://evil.run.app')).toBe(false);
    expect(recognise('null')).toBe(false);
    expect(recognise('')).toBe(false);
  });

  it('pins lockedOpenerOrigin and drops .run.app and empty origin in data_lab and alphafold_explorer', () => {
    for (const [file, fnName] of [
      ['data_lab/data_lab.html', 'isTrustedDataLabOpener'],
      ['alphafold_explorer/alphafold_explorer.html', 'isTrustedAlphaFoldOpener'],
    ]) {
      const html = read(file);
      expect(html, file).toContain('lockedOpenerOrigin');
      expect(html, file).not.toContain('.run.app');
      expect(html, file).toContain("lockedOpenerOrigin === 'null'");

      const fnSrc = sliceBetween(html, `function ${fnName}(origin) {`, 'function toOpener(payload)');
      const checkUnpinned = new Function(
        'window',
        `var lockedOpenerOrigin = '';\n${fnSrc}\nreturn ${fnName};`
      )({ location: { origin: 'https://alloflow-cdn.pages.dev' } });

      expect(checkUnpinned('')).toBe(false);
      expect(checkUnpinned('https://alloflow-cdn.pages.dev')).toBe(true);
      expect(checkUnpinned('https://evil.run.app')).toBe(false);
      expect(checkUnpinned('https://evil.pages.dev')).toBe(false);
    }
  });
});

describe('Pass-4 F-50: Leadership Hub CSV formula injection neutralization', () => {
  beforeAll(() => {
    globalThis.React = globalThis.React || {
      useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
      useEffect: () => {},
      useRef: (v) => ({ current: v }),
    };
    loadAlloModule('dispro_analyzer_module.js');
    loadAlloModule('mtss_triage_module.js');
    loadAlloModule('sped_timelines_module.js');
    loadAlloModule('udl_walkthrough_module.js');
  });

  it('keeps rebuilt CSV module mirrors synchronized', () => {
    expect(read('dispro_analyzer_module.js')).toBe(read('desktop/web-app/public/dispro_analyzer_module.js'));
    expect(read('mtss_triage_module.js')).toBe(read('desktop/web-app/public/mtss_triage_module.js'));
    expect(read('sped_timelines_module.js')).toBe(read('desktop/web-app/public/sped_timelines_module.js'));
    expect(read('udl_walkthrough_module.js')).toBe(read('desktop/web-app/public/udl_walkthrough_module.js'));
  });

  it('neutralizes = + - @ and leading-tab formula prefixes across all four exporters', () => {
    const payloads = ['=CMD|\'/C calc\'!A0', '  +SUM(A1:A2)', '-2+3', '@IMPORTXML("http://x","//a")', '\t=1+1'];
    const rfc = (s) => (/[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);

    for (const p of payloads) {
      const escaped = rfc("'" + p);
      const disproCsv = window.AlloModules.DisproAnalyzer._testing.disproResultCsv(
        { outcomeLabel: p, date: '2026-11-14' },
        { rows: [{ name: p, enrollment: 50, students: 10, risk: 0.2, riskRatio: 1.5, altRiskRatio: null, enrollShare: 0.5, outcomeShare: 0.5, flags: [p] }], totals: { enrollment: 50, students: 10 } }
      );
      expect(disproCsv).toContain(escaped);

      const mtssCsv = window.AlloModules.MtssTriage._testing.mtssCsv({
        label: p,
        window: 'Fall',
        cutpoints: { tier2Cut: 30, tier3Cut: 15, higherBetter: true },
        rows: [{ code: p, score: 10 }],
      });
      expect(mtssCsv).toContain(rfc("'" + p.trim()));

      const spedCsv = window.AlloModules.SpedTimelines._testing.spedCsv(
        [{ id: '1', code: p, type: 'initial_eval', provider: p, keyDate: '2026-10-01', dueDate: '2026-11-30' }],
        '2026-11-14'
      );
      expect(spedCsv).toContain(escaped);

      const udlCsv = window.AlloModules.UdlWalkthrough._testing.udlwalkCsv([{ teacher: p, note: p }]);
      expect(udlCsv).toContain(escaped);
    }
  });
});

describe('Pass-4 F-52 & F-53: Response headers, Cloud Function clientIpHash, and Firestore rules', () => {
  it('enforces HSTS, X-Frame-Options, and frame-ancestors in firebase.json and _headers /app/*', () => {
    const firebaseCfg = JSON.parse(read('desktop/web-app/firebase.json'));
    const catchAll = firebaseCfg.hosting.headers.find((h) => h.source === '**');
    expect(catchAll).toBeTruthy();
    const headerMap = Object.fromEntries(catchAll.headers.map((h) => [h.key, h.value]));
    expect(headerMap['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(headerMap['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(headerMap['Content-Security-Policy']).toContain("frame-ancestors 'self'");
    expect(headerMap['Content-Security-Policy']).toContain("object-src 'none'");
    expect(headerMap['Content-Security-Policy']).toContain("base-uri 'self'");

    const edgeHeaders = read('_headers');
    expect(edgeHeaders).toMatch(/\/app\/\*\s*\r?\n\s*X-Frame-Options:\s*SAMEORIGIN\s*\r?\n\s*Content-Security-Policy:\s*frame-ancestors 'self'; object-src 'none'; base-uri 'self'/);
  });

  it('uses Fastly-Client-IP and rightmost X-Forwarded-For hop in functions clientIpHash', () => {
    const fnCode = read('desktop/web-app/functions/index.js');
    const hashFnSrc = sliceBetween(fnCode, 'function clientIpHash(req) {', 'async function enforceRateLimit');
    const clientIpHash = new Function('crypto', `${hashFnSrc}\nreturn clientIpHash;`)(crypto);

    const makeReq = (headers, ip = '10.0.0.9') => ({
      ip,
      get: (name) => headers[name.toLowerCase()] || '',
    });

    const fromFastly = clientIpHash(makeReq({ 'fastly-client-ip': '203.0.113.50', 'x-forwarded-for': '198.51.100.1, 198.51.100.2' }));
    const expectFastly = clientIpHash(makeReq({ 'fastly-client-ip': '203.0.113.50' }));
    expect(fromFastly).toBe(expectFastly);
    expect(fromFastly).toHaveLength(64);

    // Spoofed leftmost X-Forwarded-For must be ignored in favor of rightmost proxy-appended IP
    const spoofedLeft = clientIpHash(makeReq({ 'x-forwarded-for': '1.2.3.4, 198.51.100.77' }));
    const honestRight = clientIpHash(makeReq({ 'x-forwarded-for': '9.9.9.9, 198.51.100.77' }));
    expect(spoofedLeft).toBe(honestRight);
  });

  it('tightens appId, non-null session expiry, and user document key cap in firestore.rules', () => {
    const rules = read('firestore.rules');
    expect(rules).toContain('function validAppId(id)');
    expect(rules).toContain("id.matches('^[A-Za-z0-9_.:-]+$')");
    expect(rules).toContain('validAppId(appId) && request.resource.data.hostId == request.auth.uid');
    expect(rules).toContain('validAppId(appId) && arcadeSession().get');
    expect(rules).toContain("(!('expiresAt' in data) || data.expiresAt == null || (data.expiresAt is timestamp && data.expiresAt > request.time))");
    expect(rules).toContain('request.resource.data.keys().size() <= 200');
  });
});

describe('Pass-4 F-55 & F-56: Session mailbox SSRF/rate-limit, sw.js window check, and MCP PDF eval lock', () => {
  it('keeps session_mailbox Code.gs synced with desktop/web-app/public and hardens getPack + fetchPage', () => {
    const code = read('apps_script/session_mailbox/Code.gs');
    expect(code).toBe(read('desktop/web-app/public/apps_script/session_mailbox/Code.gs'));

    const getPackSrc = sliceBetween(code, 'function getPack(cache, p) {', 'function delPack(cache, p) {');
    const packIdx = getPackSrc.indexOf("'r:packid:' + id.slice(-12)");
    const pkIdx = getPackSrc.indexOf("'r:pack:' + id.slice(-12)");
    expect(packIdx).toBeGreaterThan(-1);
    expect(pkIdx).toBeGreaterThan(packIdx);

    const fetchIdx = code.indexOf('function fetchPage(cache, p) {');
    expect(fetchIdx).toBeGreaterThan(-1);
    const fetchPageFull = code.slice(fetchIdx);
    expect(fetchPageFull).toContain('followRedirects: false');
    expect(fetchPageFull).toContain('for (var hop = 0; hop <= 5; hop++)');
    expect(fetchPageFull).toContain('fetchPageBlockedHost(nextHost)');
    expect(fetchPageFull).toContain("e: 'blocked-url'");
  });

  it('gates sw.js update activation and cache purge on top-level same-origin window clients', () => {
    const sw = read('desktop/web-app/public/sw.js');
    expect(sw).toContain("const isTrustedTopWindow = (e) => !e.source || (e.source.frameType === 'top-level' && typeof e.source.url === 'string' && e.source.url.startsWith(self.location.origin + '/'))");
    expect(sw).toContain('if (isTrustedTopWindow(event)) self.skipWaiting()');
    expect(sw).toContain("event.data.type === 'ALLOFLOW_PURGE_RUNTIME_CACHE'");
    expect(sw).toContain('if (isTrustedTopWindow(event)) event.waitUntil(caches.delete(CACHE_NAME))');
  });

  it('passes isEvalSupported: false in every pdfjsLib/lib.getDocument call across mcp-testing/tools', () => {
    const tools = [
      'mcp-testing/tools/order_sweep.cjs',
      'mcp-testing/tools/page_items.cjs',
      'mcp-testing/tools/page_outline.cjs',
      'mcp-testing/tools/page_text.cjs',
      'mcp-testing/tools/render_pages.cjs',
      'mcp-testing/tools/trace_page.cjs',
      'mcp-testing/tools/tranche_recall.cjs',
    ];
    for (const rel of tools) {
      const src = read(rel);
      const getDocMatches = [...src.matchAll(/getDocument\s*\(\s*\{[\s\S]*?\}\s*\)/g)];
      expect(getDocMatches.length, rel).toBeGreaterThan(0);
      for (const m of getDocMatches) {
        expect(m[0], rel).toMatch(/isEvalSupported\s*:\s*false/);
      }
    }
  });
});
