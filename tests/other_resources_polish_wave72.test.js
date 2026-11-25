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
        'html-has-lang': { enabled: false },
        'heading-order': { enabled: false },
      },
    });
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

function assertAllRenderedButtonsTyped(container) {
  const buttons = [...container.querySelectorAll('button')];
  expect(buttons.length).toBeGreaterThan(0);
  const untyped = buttons.filter((b) => !['button', 'submit', 'reset'].includes(b.getAttribute('type')));
  expect(untyped.map((b) => b.outerHTML.slice(0, 120))).toEqual([]);
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

describe('Wave 72 STEM Lab Polish (TimelineStudio, AlgebraCAS, CellularLab, Lumen)', () => {
  it('polishes stem_lab/stem_tool_timeline.js across mirrors (typed buttons, allo-timeline-a11y-css with touch-action & forced-colors focus ring, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_timeline.js');
    expect(src).toContain('allo-timeline-a11y-css');
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('forced-colors:active');

    resetStemLab();
    loadTool('stem_lab/stem_tool_timeline.js', 'timelineStudio');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('timelineStudio', { timelineStudio: {} });

    assertAllRenderedButtonsTyped(host);
    expect(document.getElementById('allo-timeline-a11y-css')).not.toBeNull();
    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_algebracas.js across mirrors (allo-algebracas-a11y-css with touch-action & forced-colors, IME-safe tabs & Enter handlers, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_algebracas.js');
    expect(src).toContain('allo-algebracas-a11y-css');
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('forced-colors:active');

    resetStemLab();
    loadTool('stem_lab/stem_tool_algebracas.js', 'algebraCAS');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('algebraCAS', { algebraCAS: {} });

    expect(document.getElementById('allo-algebracas-a11y-css')).not.toBeNull();
    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialId = activeTab.id;
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).toBe(initialId);

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).not.toBe(initialId);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_cellular.js across mirrors (typed buttons, allo-cellularlab-a11y-css with touch-action & forced-colors, IME-safe tabs, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_cellular.js');
    expect(src).toContain('allo-cellularlab-a11y-css');
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('forced-colors:active');

    resetStemLab();
    loadTool('stem_lab/stem_tool_cellular.js', 'cellularLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('cellularLab', { cellularLab: {} });

    assertAllRenderedButtonsTyped(host);
    expect(document.getElementById('allo-cellularlab-a11y-css')).not.toBeNull();
    const activeTab = host.querySelector('[role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialId = activeTab.id;
    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).toBe(initialId);

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).not.toBe(initialId);

    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_lumen.js across mirrors (allo-lumen-a11y-css with touch-action & forced-colors, IME-safe Escape, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_lumen.js');
    expect(src).toContain('allo-lumen-a11y-css');
    expect(src).toContain('touch-action:manipulation');
    expect(src).toContain('forced-colors:active');

    resetStemLab();
    loadTool('stem_lab/stem_tool_lumen.js', 'lumen');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('lumen', { lumen: {} });

    expect(document.getElementById('allo-lumen-a11y-css')).not.toBeNull();
    await runAxe(host);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);
});
