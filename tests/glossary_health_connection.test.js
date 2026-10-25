import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const { glossaryMediaProps } = createRequire(import.meta.url)('./helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let unmount;
beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); loadAlloModule('gemini_api_module.js'); });
afterEach(() => {
  unmount?.(); unmount = null;
  delete window.__alloResolveAiCapability; delete window.__alloOpenAiSetup;
  document.getElementById('alloflow-quota-banner')?.remove();
  localStorage.removeItem('alloflow_ai_config');
  vi.restoreAllMocks();
});
function mount(props = {}) {
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(window.AlloModules.GlossaryView, glossaryMediaProps(props))));
  unmount = () => { act(() => root.unmount()); container.remove(); };
  const toggle = container.querySelector('button[aria-controls="glossary-teacher-tools"]');
  if (toggle) act(() => toggle.click());
  return container;
}

describe('optional glossary AI health check', () => {
  it('shows setup guidance, keeps existing words and images, and updates when a connection is configured', () => {
    let connected = false;
    window.__alloResolveAiCapability = () => ({ text: connected });
    window.__alloOpenAiSetup = vi.fn();
    const runGlossaryHealthCheck = vi.fn();
    const view = mount({ runGlossaryHealthCheck });
    const check = () => [...view.querySelectorAll('button')].find(button => button.textContent.includes('Run health check'));
    expect(check()?.disabled).toBe(true);
    expect(view.querySelector('#glossary-health-connection-help')?.textContent).toContain('without AI');
    expect(view.textContent).toContain('A plant part that captures sunlight.');
    expect(view.querySelector('img[src^="data:image/"]')).not.toBeNull();
    act(() => [...view.querySelectorAll('button')].find(button => button.textContent === 'AI Backend Settings').click());
    expect(window.__alloOpenAiSetup).toHaveBeenCalledOnce();
    expect(runGlossaryHealthCheck).not.toHaveBeenCalled();
    connected = true;
    act(() => window.dispatchEvent(new CustomEvent('alloflow:ai-config-changed')));
    expect(check().disabled).toBe(false);
    expect(view.querySelector('#glossary-health-connection-help')).toBeNull();
    act(() => check().click());
    expect(runGlossaryHealthCheck).toHaveBeenCalledOnce();
    connected = false;
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'alloflow_ai_config' })));
    expect(check().disabled).toBe(true);
  });

  it('does not show teacher setup prompts in a student glossary', () => {
    window.__alloResolveAiCapability = () => ({ text: false });
    const view = mount({ isTeacherMode: false });
    expect(view.querySelector('#glossary-health-connection-help')).toBeNull();
    expect(view.textContent).not.toContain('Run health check');
  });

  it('a direct keyless AI request reports missing setup and sends no network request', async () => {
    const fetch = vi.fn();
    const api = window.AlloModules.createGeminiAPI({ apiKey: '', _isCanvasEnv: false,
      GEMINI_MODELS: { default: 'fixture' }, fetchWithExponentialBackoff: fetch,
      warnLog: vi.fn(), debugLog: vi.fn() });
    await expect(api.callGemini('Review glossary', true)).rejects.toMatchObject({
      code: 'allo/no-api-key', isAuth: false, isConfig: true,
      classification: { reason: 'missing-api-key', userMessage: expect.stringContaining('AI Backend Settings') }
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
