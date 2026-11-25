// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

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

function ensureReactGlobals() {
  globalThis.React = window.React = React;
  window.ReactDOM = ReactDOM;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
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
  if (window.AlloModules) {
    delete window.AlloModules.ResearchHub;
    delete window.AlloModules.AccessibilityLab;
    delete window.AlloModules.AccessibilityLabInternals;
    delete window.AlloModules.LearningWebExplorer;
    delete window.AlloModules.TimelineStudio;
  }
  delete window.ResearchHub;
});

describe('Wave 75 Standalone UDL Studio Modules (ResearchHub, AccessibilityLab, LearningWebExplorer, TimelineStudio)', () => {
  it('polishes research_hub_source.jsx & research_hub_module.js across mirrors (allo-research-hub-a11y-css with touch-action & forced-colors, typed buttons, 0 axe violations)', async () => {
    const jsxSrc = readRepoFile('research_hub_source.jsx');
    expect(jsxSrc).toContain('allo-research-hub-a11y-css');
    const src = assertMirrorsMatch('research_hub_module.js');
    expect(src).toContain('allo-research-hub-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');

    ensureReactGlobals();
    loadAlloModule('research_hub_module.js');
    const ResearchHub = window.AlloModules.ResearchHub;
    expect(ResearchHub).toBeDefined();

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    roots.push({ root, host });

    await React.act(async () => {
      root.render(React.createElement(ResearchHub, {
        isOpen: true,
        onClose: vi.fn(),
        t: () => undefined,
        addToast: vi.fn(),
        studentCodename: 'Explorer-75',
      }));
    });

    expect(document.getElementById('allo-research-hub-a11y-css')).not.toBeNull();
    assertAllRenderedButtonsTyped(document.body);
    await runAxe(document.body);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes accessibility_lab_module.js across mirrors (29/29 typed buttons, allo-a11ylab-a11y-css, IME-safe tabs, slider aria-valuetext, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('accessibility_lab_module.js');
    expect(src).toContain('allo-a11ylab-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');
    expect(src).toContain("rate.toFixed(1) + 'x'");
    expect(src).toContain("blurPx + 'px'");

    ensureReactGlobals();
    loadAlloModule('accessibility_evidence_module.js');
    loadAlloModule('accessibility_lab_module.js');
    const AccessibilityLab = window.AlloModules.AccessibilityLab;
    expect(AccessibilityLab).toBeDefined();

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    roots.push({ root, host });

    await React.act(async () => {
      root.render(React.createElement(AccessibilityLab, {
        isOpen: true,
        onClose: vi.fn(),
        addToast: vi.fn(),
        history: [],
        t: () => undefined,
      }));
    });

    expect(document.getElementById('allo-a11ylab-a11y-css')).not.toBeNull();
    assertAllRenderedButtonsTyped(document.body);

    const activeTab = document.body.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]');
    expect(activeTab).not.toBeNull();
    const initialTabId = activeTab.id;

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight', { isComposing: true, keyCode: 229 });
    });
    expect(document.body.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]').id).toBe(initialTabId);

    await React.act(async () => {
      dispatchKey(activeTab, 'ArrowRight');
    });
    expect(document.body.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]').id).not.toBe(initialTabId);

    // Switch to Visual Checks / Simulators tab and activate blur slider to verify aria-valuetext
    const simTab = document.getElementById('a11y-lab-tab-simulators');
    expect(simTab).not.toBeNull();
    await React.act(async () => {
      simTab.click();
    });
    const blurBtn = [...document.body.querySelectorAll('button')].find((b) => /blur/i.test(b.textContent || ''));
    expect(blurBtn).toBeDefined();
    await React.act(async () => {
      blurBtn.click();
    });
    const blurSlider = document.body.querySelector('input[type="range"]');
    expect(blurSlider).not.toBeNull();
    expect(blurSlider.getAttribute('aria-valuetext')).toMatch(/\d+(\.\d+)?px/);

    await runAxe(document.body);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes learning_web_explorer_module.js across mirrors (allo-learning-web-a11y-css with 0 var(--) tokens, IME/modifier-safe Escape, typed buttons, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('learning_web_explorer_module.js');
    expect(src).toContain('allo-learning-web-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');
    expect(src.match(/var\(--[a-z-]+/g) || []).toEqual([]);

    ensureReactGlobals();
    loadAlloModule('learning_web_explorer_module.js');
    const Explorer = window.AlloModules.LearningWebExplorer;
    expect(Explorer && Explorer.View).toBeDefined();

    const onClose = vi.fn();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    roots.push({ root, host });

    await React.act(async () => {
      root.render(React.createElement(Explorer.View, {
        graph: {
          version: 'acg/v1',
          title: 'Wave 75 Learning Web',
          nodes: [
            { id: 'n1', label: 'Fractions', type: 'concept' },
            { id: 'n2', label: 'Unit Ratios', type: 'standard' },
          ],
          edges: [{ id: 'e1', fromId: 'n1', toId: 'n2', type: 'supports' }],
        },
        scopeId: 'wave75',
        isModal: true,
        onClose,
        t: () => undefined,
      }));
    });

    expect(document.getElementById('allo-learning-web-a11y-css')).not.toBeNull();
    assertAllRenderedButtonsTyped(host);

    await React.act(async () => {
      dispatchKey(document, 'Escape', { isComposing: true, keyCode: 229 });
      dispatchKey(document, 'Escape', { ctrlKey: true });
    });
    expect(onClose).not.toHaveBeenCalled();

    await runAxe(host);

    await React.act(async () => {
      dispatchKey(document, 'Escape');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);

  it('polishes timeline_studio_module.js across mirrors (allo-timelinestudio-a11y-css, IME-safe Escape, typed buttons, 0 axe violations)', async () => {
    const src = assertMirrorsMatch('timeline_studio_module.js');
    expect(src).toContain('allo-timelinestudio-a11y-css');
    expect(src).toContain('touch-action: manipulation');
    expect(src).toContain('forced-colors: active');

    ensureReactGlobals();
    loadAlloModule('timeline_studio_module.js');
    const TimelineStudio = window.AlloModules.TimelineStudio;
    expect(TimelineStudio).toBeDefined();

    const onClose = vi.fn();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    roots.push({ root, host });

    await React.act(async () => {
      root.render(React.createElement(TimelineStudio, {
        isOpen: true,
        onClose,
        t: () => undefined,
      }));
    });

    expect(document.getElementById('allo-timelinestudio-a11y-css')).not.toBeNull();
    assertAllRenderedButtonsTyped(host);

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    await React.act(async () => {
      dispatchKey(dialog, 'Escape', { isComposing: true, keyCode: 229 });
    });
    expect(onClose).not.toHaveBeenCalled();

    await runAxe(host);

    await React.act(async () => {
      dispatchKey(dialog, 'Escape');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(errSpy).not.toHaveBeenCalled();
  }, 120000);
});
