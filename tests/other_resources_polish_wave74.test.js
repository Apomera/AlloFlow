// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const roots = [];

function readRepoFile(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function assertMirrorsMatch(relPath) {
  const src = readRepoFile(relPath);
  for (const prefix of ['desktop/web-app/public/', 'desktop/web-app/build/', 'desktop/app-build/']) {
    expect(readRepoFile(prefix + relPath), prefix + relPath).toBe(src);
  }
  return src;
}

async function runAxe(container) {
  let result;
  await React.act(async () => {
    result = await axe.run(container, {
      iframes: false,
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
        'page-has-heading-one': { enabled: false },
        'landmark-one-main': { enabled: false },
        'landmark-banner-is-top-level': { enabled: false },
        'html-has-lang': { enabled: false },
        'heading-order': { enabled: false },
      },
    });
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

function assertAllRenderedSlidersHaveValueText(container) {
  const sliders = [...container.querySelectorAll('input[type="range"]')];
  expect(sliders.length).toBeGreaterThan(0);
  const missing = sliders.filter((s) => !(s.getAttribute('aria-valuetext') || '').trim());
  expect(missing.map((s) => s.outerHTML.slice(0, 140))).toEqual([]);
}

function dispatchKey(el, key, opts = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  if (opts.isComposing) {
    Object.defineProperty(ev, 'isComposing', { value: true, configurable: true });
  }
  if (typeof opts.keyCode === 'number') {
    Object.defineProperty(ev, 'keyCode', { value: opts.keyCode, configurable: true });
  }
  el.dispatchEvent(ev);
  return ev;
}

async function mountStemTool(toolId, initialToolData, extraCtx = {}) {
  const config = window.StemLab._registry[toolId];
  expect(config).toBeDefined();
  const host = document.createElement('div');
  host.setAttribute('data-stem-tool-shell', toolId);
  document.body.appendChild(host);
  let latestTool = initialToolData;

  function Host() {
    const [toolData, setToolDataState] = React.useState(initialToolData);
    latestTool = toolData;
    const setToolData = React.useCallback((arg) => {
      setToolDataState((prev) => (typeof arg === 'function' ? arg(prev) : arg));
    }, []);
    const update = React.useCallback((a, b, c) => {
      setToolDataState((prev) => {
        if (c !== undefined) {
          return { ...prev, [a]: { ...(prev[a] || {}), [b]: c } };
        }
        return { ...prev, [a]: b };
      });
    }, []);
    const updateMulti = React.useCallback((a, b) => {
      setToolDataState((prev) => {
        if (typeof a === 'string' && b && typeof b === 'object') {
          return { ...prev, [a]: { ...(prev[a] || {}), ...b } };
        }
        return { ...prev, ...(a || {}) };
      });
    }, []);
    return config.render(makeCtx({
      toolData,
      setToolData,
      labToolData: toolData,
      setLabToolData: setToolData,
      update,
      updateMulti,
      ...extraCtx,
    }));
  }

  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  await React.act(async () => {
    root.render(React.createElement(Host));
  });
  return { host, getState: () => latestTool };
}

afterEach(async () => {
  vi.restoreAllMocks();
  while (roots.length) {
    const { root, host } = roots.pop();
    await React.act(async () => {
      root.unmount();
    });
    host.remove();
  }
  document.body.innerHTML = '';
  document.head.querySelectorAll('style').forEach((s) => s.remove());
  localStorage.clear();
});

describe('Wave 74 STEM Lab Polish (WeldLab, RaptorHunt — 100% clean STEM Lab coverage)', () => {
  it('polishes stem_lab/stem_tool_weldlab.js across mirrors (0 offscreen CANVAS-001 hits, allo-weldlab-a11y-css with touch-action & forced-colors, IME-safe tabs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_weldlab.js');
    expect(src).toContain('allo-weldlab-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');
    expect(src).toContain("c.setAttribute('aria-hidden', 'true');");
    expect(src).toContain('e.nativeEvent && e.nativeEvent.isComposing');

    resetStemLab();
    loadTool('stem_lab/stem_tool_weldlab.js', 'weldLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('weldLab', { weldLab: {} });

    expect(document.getElementById('allo-weldlab-a11y-css')).not.toBeNull();
    await runAxe(host);

    const { host: jointHost } = await mountStemTool('weldLab', {
      weldLab: { view: 'jointCatalog', jc_tab: 'butt' },
    });
    const activeTab = jointHost.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialText = activeTab.textContent;
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(jointHost.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]').textContent).toBe(initialText);

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(jointHost.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]').textContent).not.toBe(initialText);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_raptorhunt.js across mirrors (0 offscreen CANVAS-001 hits, allo-raptorhunt-a11y-css, IME-safe tabs & roving keys, slider aria-valuetext, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_raptorhunt.js');
    expect(src).toContain('allo-raptorhunt-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');
    expect(src).toContain("skyCanvas.setAttribute('aria-hidden', 'true')");
    expect(src).toContain("backdrop.setAttribute('aria-hidden', 'true')");
    expect(src).toContain('event.nativeEvent && event.nativeEvent.isComposing');

    resetStemLab();
    loadTool('stem_lab/stem_tool_raptorhunt.js', 'raptorHunt');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('raptorHunt', { raptorHunt: {} });

    expect(document.getElementById('allo-raptorhunt-a11y-css')).not.toBeNull();
    await runAxe(host);

    const { host: atlasHost } = await mountStemTool('raptorHunt', {
      raptorHunt: { activeSection: 'anatomyatlas', anatomyView: 0 },
    });
    const activeTab = atlasHost.querySelector('[data-raptor-reference-tabs="anatomy"] [role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialId = activeTab.id;
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(atlasHost.querySelector('[data-raptor-reference-tabs="anatomy"] [role="tab"][aria-selected="true"]').id).toBe(initialId);

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(atlasHost.querySelector('[data-raptor-reference-tabs="anatomy"] [role="tab"][aria-selected="true"]').id).not.toBe(initialId);

    const { host: physicsHost } = await mountStemTool('raptorHunt', {
      raptorHunt: { activeSection: 'stoop' },
    });
    assertAllRenderedSlidersHaveValueText(physicsHost);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);
});
