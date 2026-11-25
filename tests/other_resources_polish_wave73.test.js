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

describe('Wave 73 STEM Lab Polish (Astronomy, CephalopodLab, FirstResponse, LearningLab)', () => {
  it('polishes stem_lab/stem_tool_astronomy.js across mirrors (0 offscreen CANVAS-001 hits, allo-astronomy-a11y-css, IME-safe tabs, moon slider aria-valuetext, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_astronomy.js');
    expect(src).toContain('allo-astronomy-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');
    expect(src).toContain("glowCanvas.setAttribute('aria-hidden', 'true')");
    expect(src).toContain("moonCanvas.setAttribute('aria-hidden', 'true')");
    expect(src).toContain("face.setAttribute('aria-hidden', 'true')");

    resetStemLab();
    loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('astronomy', { astronomy: {} });

    expect(document.getElementById('allo-astronomy-a11y-css')).not.toBeNull();
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

    const { host: moonHost } = await mountStemTool('astronomy', { astronomy: { tab: 'moon' } });
    const orbitBtn = [...moonHost.querySelectorAll('button')].find((b) => /Orbit view/i.test(b.textContent || ''));
    expect(orbitBtn).toBeDefined();
    await React.act(async () => {
      orbitBtn.click();
    });
    const moonSlider = moonHost.querySelector('#astronomy-moon-nodes');
    expect(moonSlider).not.toBeNull();
    expect(moonSlider.getAttribute('aria-valuetext')).toMatch(/\d+°/);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_cephalopodlab.js across mirrors (allo-cephalopodlab-a11y-css, IME-safe tabs, slider aria-valuetext, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_cephalopodlab.js');
    expect(src).toContain('allo-cephalopodlab-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');
    expect(src).toContain('e.nativeEvent && e.nativeEvent.isComposing');

    resetStemLab();
    loadTool('stem_lab/stem_tool_cephalopodlab.js', 'cephalopodLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('cephalopodLab', { cephalopodLab: {} });

    expect(document.getElementById('allo-cephalopodlab-a11y-css')).not.toBeNull();
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

    const { host: camoHost } = await mountStemTool('cephalopodLab', {
      cephalopodLab: { activeSection: 'camo' },
    });
    assertAllRenderedSlidersHaveValueText(camoHost);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_firstresponse.js across mirrors (allo-firstresponse-a11y-css, IME-safe tabs & pressure hold, slider aria-valuetext, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_firstresponse.js');
    expect(src).toContain('allo-firstresponse-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');

    resetStemLab();
    loadTool('stem_lab/stem_tool_firstresponse.js', 'firstResponse');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('firstResponse', { firstResponse: {} });

    expect(document.getElementById('allo-firstresponse-a11y-css')).not.toBeNull();
    await runAxe(host);

    const { host: cprHost } = await mountStemTool('firstResponse', {
      firstResponse: { consentAccepted: true, view: 'cprAed', cprView: 'metronome' },
    });
    const cprTab = cprHost.querySelector('[role="tab"][aria-selected="true"]');
    expect(cprTab).not.toBeNull();
    const cprTabId = cprTab.id;
    await React.act(async () => {
      dispatchKey(cprTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(cprHost.querySelector('[role="tab"][aria-selected="true"]').id).toBe(cprTabId);

    const bpmSlider = cprHost.querySelector('#fr-bpm-slider');
    expect(bpmSlider).not.toBeNull();
    expect((bpmSlider.getAttribute('aria-valuetext') || '').trim().length).toBeGreaterThan(0);

    await React.act(async () => {
      dispatchKey(cprTab, 'ArrowRight');
    });
    expect(cprHost.querySelector('[role="tab"][aria-selected="true"]').id).not.toBe(cprTabId);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes stem_lab/stem_tool_learning_lab.js across mirrors (allo-learninglab-a11y-css with touch-action & forced-colors, IME-safe React handlers, slider aria-valuetext, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('stem_lab/stem_tool_learning_lab.js');
    expect(src).toContain('allo-learninglab-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');
    expect(src).toContain('event.nativeEvent && event.nativeEvent.isComposing');

    resetStemLab();
    loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host } = await mountStemTool('learningLab', { learningLab: {} });

    expect(document.getElementById('allo-learninglab-a11y-css')).not.toBeNull();
    await runAxe(host);

    const { host: valuesHost } = await mountStemTool('learningLab', {
      learningLab: { view: 'mytkValues' },
    });
    const valTab = valuesHost.querySelector('[role="tab"][aria-selected="true"]');
    expect(valTab).not.toBeNull();
    const valTabId = valTab.id;
    await React.act(async () => {
      dispatchKey(valTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(valuesHost.querySelector('[role="tab"][aria-selected="true"]').id).toBe(valTabId);
    await React.act(async () => {
      dispatchKey(valTab, 'ArrowRight');
    });
    expect(valuesHost.querySelector('[role="tab"][aria-selected="true"]').id).not.toBe(valTabId);

    const { host: dayHost } = await mountStemTool('learningLab', {
      learningLab: { view: 'mytkGreatDay' },
    });
    const daySlider = dayHost.querySelector('#learning-lab-day-pattern-rating');
    expect(daySlider).not.toBeNull();
    expect(daySlider.getAttribute('aria-valuetext')).toMatch(/\d+ \/ 10/);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);
});
