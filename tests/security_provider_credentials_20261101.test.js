import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, Modal, root, container, sent;
const readConfig = () => JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
const click = async element => { await React.act(async () => element.click()); };
async function input(id, value) {
  await React.act(async () => {
    const element = container.querySelector('#' + id);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function provider(value) {
  await React.act(async () => {
    const select = container.querySelector('#ai-backend-provider');
    select.value = value; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function mount(config, ai = null, student = false) {
  if (student) {
    window.__alloQrStudentMode = true; window.__alloStudentAiSetupAllowed = true;
    sessionStorage.setItem('alloflow_qr_student_ai_config', JSON.stringify(config));
  } else localStorage.setItem('alloflow_ai_config', JSON.stringify(config));
  await React.act(async () => root.render(React.createElement(Modal, {
    _isCanvasEnv: false, ai, showAIBackendModal: true, setShowAIBackendModal() {}, t: () => '', GEMINI_MODELS: {}
  })));
  if (!student) await click(container.querySelector('[data-help-key="ai_backend_advanced_toggle"]'));
}
async function testConnection() {
  sent.length = 0;
  await click(container.querySelector('#ai-backend-test'));
  return sent.filter(call => /\/v1\/models|\/models$|\/chat\/completions|:generateContent/.test(call.url));
}
beforeAll(() => {
  React = require('../desktop/web-app/node_modules/react');
  ({ createRoot } = require('../desktop/web-app/node_modules/react-dom/client'));
  globalThis.React = window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('ai_backend_module.js'); loadAlloModule('view_misc_modals_module.js');
  Modal = window.AlloModules.AIBackendModal;
});
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); sent = [];
  delete window.__alloQrStudentMode; delete window.__alloStudentAiSetupAllowed;
  delete window.ALLOFLOW_MANAGED_AI_POLICY;
  window.__alloStudentAiConfigFingerprint = value => JSON.stringify(value);
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    sent.push({ url: String(url), options });
    return { ok: true, status: 200, json: async () => ({ data: [{ id: 'synthetic-model' }],
      models: [{ name: 'models/synthetic-model' }], choices: [{ message: { content: 'OK' } }],
      candidates: [{ content: { parts: [{ text: 'OK' }] } }] }) };
  }));
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => {
  await React.act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals();
  delete window.__alloStudentAiConfigFingerprint;
});

describe('AI credentials remain with their selected destination', () => {
  it.each(['openai', 'custom', 'lmstudio', 'localai', 'claude', 'ollama', 'alloflow-local', 'onnx-npu'])('does not carry a saved Gemini key into %s', async backend => {
    await mount({ backend: 'gemini', apiKey: 'SYNTHETIC_GEMINI_SECRET' });
    await provider(backend);
    expect(readConfig().apiKey || '').toBe('');
    expect(readConfig().geminiApiKey).toBe('SYNTHETIC_GEMINI_SECRET');
    expect(container.querySelector('#ai-backend-apikey').value).toBe('');
    if (backend === 'custom') {
      await input('ai-backend-url', 'https://other.synthetic.invalid');
      const calls = await testConnection();
      expect(calls.length).toBeGreaterThan(0);
      expect(JSON.stringify(calls)).not.toContain('SYNTHETIC_GEMINI_SECRET');
    }
  });

  it('clears a custom key on an origin change and sends only a newly entered key', async () => {
    await mount({ backend: 'custom', baseUrl: 'https://first.synthetic.invalid', apiKey: 'SYNTHETIC_FIRST_SECRET' });
    await input('ai-backend-url', 'https://second.synthetic.invalid');
    expect(readConfig().apiKey || '').toBe('');
    expect(container.querySelector('#ai-backend-apikey').value).toBe('');
    let calls = await testConnection();
    expect(JSON.stringify(calls)).not.toContain('SYNTHETIC_FIRST_SECRET');
    await input('ai-backend-apikey', 'SYNTHETIC_SECOND_SECRET');
    calls = await testConnection();
    expect(calls.find(call => call.url.endsWith('/v1/models')).options.headers.Authorization).toBe('Bearer SYNTHETIC_SECOND_SECRET');
    expect(JSON.stringify(calls)).not.toContain('SYNTHETIC_FIRST_SECRET');
  });

  it('retains the key for equivalent normalized origins and clears it for invalid destinations', async () => {
    await mount({ backend: 'custom', baseUrl: 'https://same.synthetic.invalid', apiKey: 'SYNTHETIC_SAME_SECRET' });
    await input('ai-backend-url', 'https://SAME.synthetic.invalid:443/compatible');
    expect(readConfig().apiKey).toBe('SYNTHETIC_SAME_SECRET');
    await input('ai-backend-url', 'not a URL');
    expect(readConfig().apiKey || '').toBe('');
    await input('ai-backend-url', 'https://same.synthetic.invalid');
    expect(readConfig().apiKey || '').toBe('');
  });

  it('reselects the separate Gemini key only for its official provider origin', async () => {
    await mount({ backend: 'openai', apiKey: 'SYNTHETIC_OPENAI_SECRET', geminiApiKey: 'SYNTHETIC_GEMINI_SECRET' });
    await provider('gemini');
    expect(readConfig().apiKey).toBe('SYNTHETIC_GEMINI_SECRET');
    await input('ai-backend-url', 'https://other.synthetic.invalid');
    expect(readConfig().apiKey || '').toBe('');
    expect(container.querySelector('#ai-backend-apikey').value).toBe('');
    expect(JSON.stringify(await testConnection())).not.toContain('SYNTHETIC_GEMINI_SECRET');
    await provider('gemini');
    expect(readConfig().apiKey).toBe('SYNTHETIC_GEMINI_SECRET');
  });

  it('does not inherit the active provider key when settings point at another origin', async () => {
    await mount({ backend: 'custom', baseUrl: 'https://second.synthetic.invalid' },
      { backend: 'custom', baseUrl: 'https://first.synthetic.invalid', apiKey: 'SYNTHETIC_ACTIVE_SECRET' });
    const calls = await testConnection();
    expect(calls.length).toBeGreaterThan(0);
    expect(JSON.stringify(calls)).not.toContain('SYNTHETIC_ACTIVE_SECRET');
  });

  it('also clears student-session credentials without changing or inheriting the teacher configuration', async () => {
    const teacher = { backend: 'gemini', apiKey: 'SYNTHETIC_TEACHER_SECRET' };
    localStorage.setItem('alloflow_ai_config', JSON.stringify(teacher));
    await mount({ backend: 'openai', apiKey: 'SYNTHETIC_STUDENT_SECRET' }, teacher, true);
    await provider('custom'); await input('ai-backend-url', 'https://student.synthetic.invalid');
    const student = JSON.parse(sessionStorage.getItem('alloflow_qr_student_ai_config'));
    expect(student.apiKey || '').toBe('');
    expect(readConfig()).toEqual(teacher);
    const calls = await testConnection();
    expect(calls.length).toBeGreaterThan(0);
    expect(JSON.stringify(calls)).not.toContain('SYNTHETIC_STUDENT_SECRET');
    expect(JSON.stringify(calls)).not.toContain('SYNTHETIC_TEACHER_SECRET');
  });
});
