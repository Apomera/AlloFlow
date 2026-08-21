// AI Backend modal — guided-setup render suite (2026-08-10 redesign).
//
// The modal's default is now a guided flow (three choice cards → only the
// fields that choice needs → Test → ready), with the full legacy surface
// behind one Advanced disclosure. This mounts the real built module (same
// harness as quickstart_wizard_render.test.js) and drives every mode,
// asserting the contracts the redesign promised: canonical element ids render
// in exactly one place per mode, values survive layout switches (config-backed
// uncontrolled inputs), the student variant keeps its fixed trimmed layout,
// and repeated open/close cycles stay hook-order stable.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, Modal;
let container, root;

const baseProps = () => ({
  _isCanvasEnv: false,
  ai: null,
  showAIBackendModal: true,
  setShowAIBackendModal: () => {},
  t: () => '',
  GEMINI_MODELS: {},
});

const render = async (props = {}) => {
  await act(async () => {
    root.render(React.createElement(Modal, { ...baseProps(), ...props }));
  });
};

const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

const byHelpKey = (key) => container.querySelector(`[data-help-key="${key}"]`);
const readCfg = () => JSON.parse(window.localStorage.getItem('alloflow_ai_config') || '{}');

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  loadAlloModule('view_misc_modals_module.js');
  Modal = window.AlloModules.AIBackendModal;
  if (!Modal) throw new Error('AIBackendModal did not register');
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.__alloStudentAiSetupAllowed;
  delete window.__alloQrStudentMode;
  delete window.__alloOpenDeviceStorageProbe;
  delete window.__alloAISettingsRequestedSection;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete window.__alloAISettingsRequestedSection;
});

describe('guided default', () => {
  it('opens on the three choice cards, with no legacy surface visible', async () => {
    await render();
    expect(byHelpKey('ai_backend_guided_card_gemini')).toBeTruthy();
    expect(byHelpKey('ai_backend_guided_card_private')).toBeTruthy();
    expect(byHelpKey('ai_backend_guided_card_connect')).toBeTruthy();
    expect(byHelpKey('ai_backend_guided_storage_btn')).toBeTruthy();
    expect(container.querySelector('#ai-platform-diagnostics-section')).toBeNull();
    // Legacy controls live behind Advanced only
    expect(container.querySelector('#ai-backend-provider')).toBeNull();
    expect(container.querySelector('#ai-backend-wolfram')).toBeNull();
    expect(container.querySelector('#ai-backend-model-default')).toBeNull();
    // No Test button on the picker view — nothing to test yet
    expect(container.querySelector('#ai-backend-test')).toBeNull();
  });

  // L9/N5 (2026-08-16). This test used to assert the button called
  // __alloOpenDeviceStorageProbe — it pinned the bug. The probe is the DEVELOPMENT
  // harness that confirms this browser can keep data; it never showed a teacher any
  // saved work. The button must reach the Storage and recovery manager (the resource
  // pack history) and must NOT fall back to the probe when that bridge is absent,
  // because one label opening two different screens is the whole defect.
  it('opens the saved-work manager, never the device-storage probe', async () => {
    let managerOpens = 0;
    let probeOpens = 0;
    window.__alloOpenStorageRecoveryManager = () => { managerOpens += 1; };
    window.__alloOpenDeviceStorageProbe = () => { probeOpens += 1; };
    await render();
    const storageButton = byHelpKey('ai_backend_guided_storage_btn');
    expect(storageButton.textContent).toContain('Open saved work');
    expect(container.textContent).toContain('resource packs');
    expect(container.textContent).toContain('Whisper and Kokoro');
    await click(storageButton);
    expect(managerOpens).toBe(1);
    expect(probeOpens).toBe(0);

    // Bridge missing (an app build older than this panel): still never the probe.
    delete window.__alloOpenStorageRecoveryManager;
    let toasts = 0;
    window.__alloAddToast = () => { toasts += 1; };
    await click(storageButton);
    expect(toasts).toBe(1);
    expect(probeOpens).toBe(0);
    delete window.__alloAddToast;
  });

  it('Gemini card leads to the key step with the AI Studio link', async () => {
    await render();
    await click(byHelpKey('ai_backend_guided_card_gemini'));
    const link = container.querySelector('a[href="https://aistudio.google.com/apikey"]');
    expect(link).toBeTruthy();
    expect(container.querySelector('#ai-backend-apikey')).toBeTruthy();
    expect(container.querySelector('#ai-backend-test')).toBeTruthy();
    expect(readCfg().backend).toBe('gemini');
  });

  it('Private card writes alloflow-local config and renders the engine strip', async () => {
    await render();
    await click(byHelpKey('ai_backend_guided_card_private'));
    expect(readCfg().backend).toBe('alloflow-local');
    expect(readCfg().baseUrl).toBe('http://localhost:32173');
    expect(container.querySelector('#ai-backend-engine-strip')).toBeTruthy();
    expect(container.querySelector('#ai-backend-test')).toBeTruthy();
  });

  it('connect picker leads to a prefilled URL for the chosen app', async () => {
    await render();
    await click(byHelpKey('ai_backend_guided_card_connect'));
    expect(byHelpKey('ai_backend_guided_connect_lmstudio')).toBeTruthy();
    await click(byHelpKey('ai_backend_guided_connect_lmstudio'));
    const url = container.querySelector('#ai-backend-url');
    expect(url).toBeTruthy();
    expect(url.defaultValue).toBe('http://localhost:1234');
    expect(readCfg().backend).toBe('lmstudio');
    // Back returns to the picker without losing the stored backend
    await click(byHelpKey('ai_backend_guided_back_btn'));
    expect(byHelpKey('ai_backend_guided_connect_ollama')).toBeTruthy();
    expect(readCfg().backend).toBe('lmstudio');
  });

  it('typed values survive a layout switch (config-backed inputs)', async () => {
    await render();
    await click(byHelpKey('ai_backend_guided_card_gemini'));
    const key = container.querySelector('#ai-backend-apikey');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(key, 'test-key-123');
      key.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    expect(readCfg().apiKey).toBe('test-key-123');
    // Jump to Advanced and back — the key field re-reads config on remount
    await click(byHelpKey('ai_backend_advanced_toggle'));
    expect(container.querySelector('#ai-backend-apikey').defaultValue).toBe('test-key-123');
    await click(byHelpKey('ai_backend_advanced_toggle'));
    expect(readCfg().apiKey).toBe('test-key-123');
  });
});

describe('advanced surface', () => {
  it('reveals every legacy control, none of which render in guided mode', async () => {
    await render();
    await click(byHelpKey('ai_backend_advanced_toggle'));
    for (const id of ['ai-backend-provider', 'ai-backend-url', 'ai-backend-apikey',
      'ai-backend-wolfram', 'ai-backend-test', 'ai-backend-status',
      'ai-backend-model-default', 'ai-backend-model-fallback',
      'ai-backend-tts-provider', 'ai-backend-image-provider',
      'ai-backend-device-storage-section', 'ai-backend-diagnostics-section', 'ai-platform-diagnostics-section']) {
      expect(container.querySelector('#' + id), id).toBeTruthy();
    }
    // provider select still offers the full catalog incl. cloud + custom
    const options = Array.from(container.querySelectorAll('#ai-backend-provider option')).map((o) => o.value);
    for (const backend of ['gemini', 'alloflow-local', 'lmstudio', 'localai', 'ollama', 'openai', 'claude', 'custom']) {
      expect(options).toContain(backend);
    }
  });

  it('configures Gemini voice access without changing a local text backend', async () => {
    window.localStorage.setItem('alloflow_ai_config', JSON.stringify({
      backend: 'alloflow-local', baseUrl: 'http://localhost:32173',
      validation: { ok: true, backend: 'alloflow-local' },
    }));
    window.__alloAISettingsRequestedSection = 'gemini-audio';
    await render();
    const key = container.querySelector('#ai-backend-gemini-services-key');
    expect(key).toBeTruthy();
    expect(container.textContent).toContain('Your primary text AI remains the built-in private AI');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(key, 'voice-only-gemini-key');
      key.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(readCfg()).toMatchObject({
      backend: 'alloflow-local',
      geminiApiKey: 'voice-only-gemini-key',
      validation: { ok: true, backend: 'alloflow-local' },
    });
    expect(document.activeElement).toBe(key);
  });

  it('never renders a duplicate element id in any mode', async () => {
    const sweep = () => {
      const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
      expect(new Set(ids).size, 'duplicate ids: ' + ids.filter((v, i, a) => a.indexOf(v) !== i).join(',')).toBe(ids.length);
    };
    await render();
    sweep();
    await click(byHelpKey('ai_backend_guided_card_private'));
    sweep();
    await click(byHelpKey('ai_backend_advanced_toggle'));
    sweep();
  });

  it('stays stable across repeated open/close cycles (hook order)', async () => {
    for (let i = 0; i < 3; i++) {
      await render({ showAIBackendModal: true });
      expect(byHelpKey('ai_backend_guided_card_gemini')).toBeTruthy();
      await render({ showAIBackendModal: false });
      expect(container.innerHTML).toBe('');
    }
  });
});

describe('student variant', () => {
  it('keeps the fixed trimmed legacy layout — no cards, no Advanced toggle', async () => {
    window.__alloStudentAiSetupAllowed = true;
    window.__alloQrStudentMode = true;
    await render();
    expect(byHelpKey('ai_backend_guided_card_gemini')).toBeNull();
    expect(byHelpKey('ai_backend_advanced_toggle')).toBeNull();
    // consent panel + key entry + provider select all present
    expect(container.textContent).toContain('Personal AI for this session');
    expect(container.querySelector('#ai-backend-provider')).toBeTruthy();
    expect(container.querySelector('#ai-backend-apikey')).toBeTruthy();
    expect(container.textContent).toContain('Disconnect & erase key');
  });
});
