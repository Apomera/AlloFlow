import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(path.join(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const mounted = [];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function mountLesson(config, callGemini, initial = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const api = { host, updateCount: 0 };
  function Harness() {
    const [data, setData] = React.useState({ view: 'lesson', selectedLesson: 'separation', ...initial });
    api.data = data;
    api.set = (patch) => setData((previous) => ({ ...previous, ...patch }));
    return config.render({
      React,
      toolData: { atcTower: data },
      update: (_tool, key, value) => { api.updateCount += 1; api.set({ [key]: value }); },
      updateMulti: (_tool, patch) => { api.updateCount += 1; api.set(patch); },
      t: (_key, fallback) => fallback,
      addToast: vi.fn(),
      callGemini
    });
  }
  act(() => root.render(React.createElement(Harness)));
  api.write = (patch) => act(() => api.set(patch));
  api.click = async (selector) => {
    const button = host.querySelector(selector);
    expect(button, selector).not.toBeNull();
    await act(async () => { button.click(); });
  };
  api.explain = () => api.click('button[aria-label^="Generate AI explanation"]');
  api.dispose = () => {
    if (api.disposed) return;
    act(() => root.unmount());
    host.remove();
    api.disposed = true;
  };
  mounted.push(api);
  return api;
}

beforeEach(() => {
  resetStemLab();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => {
  mounted.splice(0).forEach((api) => api.dispose());
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('ATC lesson explanations respect mounted instance and reading context', () => {
  it('recovers unsupported saved lesson names and still opens a valid workbench', async () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    for (const selectedLesson of [undefined, null, 'missing', '__proto__', 'constructor', 'toString', ['separation']]) {
      const api = mountLesson(window.StemLab._registry.atcTower, undefined, { selectedLesson, atcMenuPanel: 'airports', totalScore: 75 });
      expect(api.host.querySelector('.atc-menu')).not.toBeNull();
      expect(api.host.querySelectorAll('[data-atctower-lesson]')).toHaveLength(5);
      expect(api.host.querySelector('[data-atctower-playing]')).toBeNull();
      await api.click('[data-atctower-lesson="separation"]');
      expect(api.host.querySelector('[data-atctower-explorer="separation"]')).not.toBeNull();
      expect(api.data.totalScore).toBe(75);
      api.dispose();
    }
  });

  it('ignores an obsolete level request and clears prior text when the level changes', async () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const first = deferred();
    const second = deferred();
    const callGemini = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const api = mountLesson(window.StemLab._registry.atcTower, callGemini);

    await api.explain();
    expect(api.data.aiLoading_separation).toBe(true);
    await api.click('button[aria-label^="Reading level: Plain"]');
    expect(api.data).toMatchObject({ aiLevel_separation: 'plain', aiExplain_separation: '', aiLoading_separation: false, aiError_separation: '' });
    await api.explain();
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(callGemini.mock.calls[1][0]).toContain('simple everyday words');

    await act(async () => first.resolve('Obsolete grade five response.'));
    expect(api.host.textContent).not.toContain('Obsolete grade five response.');
    expect(api.data.aiLoading_separation).toBe(true);
    await act(async () => second.resolve('Current plain language response.'));
    expect(api.host.textContent).toContain('Current plain language response.');
    expect(api.data.aiLoading_separation).toBe(false);

    await api.click('button[aria-label^="Reading level: High School"]');
    expect(api.host.textContent).not.toContain('Current plain language response.');
    expect(api.data.aiExplain_separation).toBe('');
  });

  it('ignores an old lesson rejection while another lesson request is pending', async () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const oldLesson = deferred();
    const newLesson = deferred();
    const callGemini = vi.fn().mockReturnValueOnce(oldLesson.promise).mockReturnValueOnce(newLesson.promise);
    const api = mountLesson(window.StemLab._registry.atcTower, callGemini);
    await api.explain();
    api.write({ selectedLesson: 'weather' });
    expect(api.data.aiLoading_separation).toBe(false);
    await api.explain();

    await act(async () => oldLesson.reject(new Error('Old connection failed')));
    expect(api.host.querySelector('[role="alert"]')).toBeNull();
    expect(api.data.aiLoading_weather).toBe(true);
    await act(async () => newLesson.resolve('Weather explanation for this lesson.'));
    expect(api.host.textContent).toContain('Weather explanation for this lesson.');
    expect(api.data.aiExplain_separation).toBe('');
  });

  it('invalidates a request after leaving the lesson and allows another request on return', async () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const oldRequest = deferred();
    const nextRequest = deferred();
    const api = mountLesson(window.StemLab._registry.atcTower, vi.fn().mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(nextRequest.promise));
    await api.explain();
    api.write({ view: 'menu' });
    const updatesAfterLeaving = api.updateCount;
    await act(async () => oldRequest.resolve('Response after leaving the lesson.'));
    expect(api.updateCount).toBe(updatesAfterLeaving);
    expect(api.data.aiLoading_separation).toBe(false);

    api.write({ view: 'lesson' });
    await api.explain();
    await act(async () => nextRequest.resolve('Response after returning to the lesson.'));
    expect(api.host.textContent).toContain('Response after returning to the lesson.');
    expect(api.host.textContent).not.toContain('Response after leaving the lesson.');
  });

  it('does not write tool data when an unmounted request resolves', async () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const request = deferred();
    const api = mountLesson(window.StemLab._registry.atcTower, vi.fn().mockReturnValue(request.promise));
    await api.explain();
    api.dispose();
    const updatesAfterUnmount = api.updateCount;
    await act(async () => request.resolve('Response after unmount.'));
    expect(api.updateCount).toBe(updatesAfterUnmount);
  });

  it('lets independent tower instances finish their own explanations', async () => {
    loadTool('stem_lab/stem_tool_atctower.js', 'atcTower');
    const first = deferred();
    const second = deferred();
    const config = window.StemLab._registry.atcTower;
    const firstApi = mountLesson(config, vi.fn().mockReturnValue(first.promise));
    const secondApi = mountLesson(config, vi.fn().mockReturnValue(second.promise));
    await firstApi.explain();
    await secondApi.explain();
    await act(async () => first.resolve('First mounted tower response.'));
    await act(async () => second.resolve('Second mounted tower response.'));
    expect(firstApi.host.textContent).toContain('First mounted tower response.');
    expect(secondApi.host.textContent).toContain('Second mounted tower response.');
    expect(firstApi.data.aiLoading_separation).toBe(false);
    expect(secondApi.data.aiLoading_separation).toBe(false);
  });
});
