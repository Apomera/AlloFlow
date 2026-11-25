import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');
const MIRRORS = ['', 'desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

let React;
let ReactDOMClient;
let act;
let axe;
let acorn;

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertFourWayParity(relPath) {
  const expected = sha256(path.resolve(ROOT, relPath));
  for (const prefix of MIRRORS) {
    const full = path.resolve(ROOT, prefix, relPath);
    expect(fs.existsSync(full), `missing mirror ${full}`).toBe(true);
    expect(sha256(full), `hash mismatch for ${full}`).toBe(expected);
  }
}

function walkAst(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => walkAst(c, fn));
    else if (v && typeof v.type === 'string') walkAst(v, fn);
  }
}

function auditModuleAst(relPath) {
  const src = fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
  let reactBtnTotal = 0;
  let reactBtnUntyped = 0;
  let reactBtnDupType = 0;

  walkAst(ast, (n) => {
    if (n.type !== 'CallExpression') return;
    const callee = n.callee;
    const name =
      callee.type === 'Identifier'
        ? callee.name
        : callee.type === 'MemberExpression' && callee.property && callee.property.name
          ? callee.property.name
          : '';
    const arg0 = n.arguments && n.arguments[0];
    if ((name === 'createElement' || name === 'ce' || name === 'h') && arg0 && arg0.type === 'Literal' && arg0.value === 'button' && n.arguments.length >= 2) {
      reactBtnTotal++;
      const props = n.arguments[1];
      let typeCount = 0;
      if (props && props.type === 'ObjectExpression') {
        for (const p of props.properties) {
          const pk = p.key && (p.key.name || p.key.value);
          if (pk === 'type') typeCount++;
        }
      }
      if (typeCount === 0) reactBtnUntyped++;
      if (typeCount > 1) reactBtnDupType++;
    }
  });

  return { src, reactBtnTotal, reactBtnUntyped, reactBtnDupType };
}

async function runAxe(container) {
  const res = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  return res.violations;
}

describe('Other Resources Polish — Wave 87 (EducatorHub, LearningHub, SchoolRewards, CommunicationsStudio)', () => {
  let root;
  let mountEl;
  let errorSpy;

  beforeAll(() => {
    React = require(path.resolve(modulesDir, 'react'));
    ReactDOMClient = require(path.resolve(modulesDir, 'react-dom/client'));
    act = React.act || require(path.resolve(modulesDir, 'react-dom/test-utils')).act;
    axe = require(path.resolve(modulesDir, 'axe-core'));
    acorn = require(path.resolve(modulesDir, 'acorn'));
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    if (root) {
      act(() => root.unmount());
      root = null;
    }
    if (mountEl) {
      mountEl.remove();
      mountEl = null;
    }
    window.__alloFocusTrapStack = [];
    window.__alloScrollLockState = { count: 0, prev: '', overflow: '' };
    document.body.style.overflow = '';
    if (errorSpy) {
      errorSpy.mockRestore();
      errorSpy = null;
    }
    localStorage.clear();
  });

  it('1. view_educator_hub_modal_module.js: 4-way mirror, 64/64 typed buttons, scoped WCAG CSS, IME/modifier guards, and 0 axe violations', async () => {
    assertFourWayParity('view_educator_hub_modal_module.js');
    const audit = auditModuleAst('view_educator_hub_modal_module.js');
    expect(audit.reactBtnTotal).toBe(64);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-educator-hub-a11y-css')?.remove();
    loadAlloModule('view_misc_modals_module.js');
    loadAlloModule('view_educator_hub_modal_module.js');
    const EducatorHubModal = window.AlloModules.EducatorHubModal.EducatorHubModal;

    const closeSpy = vi.fn();
    const launchSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(EducatorHubModal, {
        showEducatorHub: true,
        setShowEducatorHub: closeSpy,
        startLessonFlow: launchSpy,
        setShowStemLab: launchSpy,
        t: () => null,
      }));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-educator-hub-modal="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-educator-hub-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-educator-hub-modal="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    // Ctrl+Enter / IME Enter in search must not launch
    const search = dialog.querySelector('#educator-hub-search');
    expect(search).not.toBeNull();
    await act(async () => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true }));
    });
    expect(launchSpy).not.toHaveBeenCalled();

    // Ctrl+Escape / Alt+Escape / IME Escape must not close; plain Escape closes
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', altKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    });
    expect(closeSpy).not.toHaveBeenCalled();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(dialog)).toEqual([]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closeSpy).toHaveBeenCalledWith(false);
  });

  it('2. view_learning_hub_modal_module.js: 4-way mirror, 49/49 typed buttons, scoped WCAG CSS, IME/modifier guards, and 0 axe violations', async () => {
    assertFourWayParity('view_learning_hub_modal_module.js');
    const audit = auditModuleAst('view_learning_hub_modal_module.js');
    expect(audit.reactBtnTotal).toBe(49);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-learning-hub-a11y-css')?.remove();
    loadAlloModule('view_learning_hub_modal_module.js');
    const LearningHubModal = window.AlloModules.LearningHubModal.LearningHubModal;

    const closeSpy = vi.fn();
    const launchSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(LearningHubModal, {
        showLearningHub: true,
        setShowLearningHub: closeSpy,
        setShowStemLab: launchSpy,
        setShowStoryForge: launchSpy,
        t: () => null,
      }));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-learning-hub-modal="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-learning-hub-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-learning-hub-modal="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    // Ctrl+Escape / Alt+Escape / IME Escape must not close; plain Escape closes
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', altKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    });
    expect(closeSpy).not.toHaveBeenCalled();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(dialog)).toEqual([]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closeSpy).toHaveBeenCalledWith(false);
  });

  it('3. school_rewards_module.js: 4-way mirror, 35/35 typed buttons, scoped WCAG CSS + IT handoff CSS, IME/modifier Escape guard, and 0 axe violations', async () => {
    assertFourWayParity('school_rewards_module.js');
    const audit = auditModuleAst('school_rewards_module.js');
    expect(audit.reactBtnTotal).toBe(35);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadAlloModule('school_rewards_module.js');
    const { SchoolRewardsPanel, _testing } = window.AlloModules.SchoolRewards;

    const handoffHtml = _testing.srHandoffHtml({ schoolName: 'Lincoln Elementary', allowedDomain: 'lincoln.edu' }, 'function run(){}', {});
    expect(handoffHtml).toContain('touch-action:manipulation');
    expect(handoffHtml).toContain('min-height:44px');
    expect(handoffHtml).toContain('forced-colors: active');
    expect(handoffHtml).toContain('prefers-reduced-motion: reduce');

    const closeSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(SchoolRewardsPanel, {
        isOpen: true,
        onClose: closeSpy,
        t: () => null,
      }));
      await Promise.resolve();
    });

    const srRoot = mountEl.querySelector('.sr-root');
    expect(srRoot).not.toBeNull();
    const styleEl = srRoot.querySelector('style');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('.sr-root button');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    });
    expect(closeSpy).not.toHaveBeenCalled();

    const dialog = srRoot.querySelector('[role="dialog"]');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(dialog)).toEqual([]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('4. communications_studio_module.js: 4-way mirror, 31/31 typed buttons, scoped WCAG CSS, IME/modifier tab & Escape guards, and 0 axe violations', async () => {
    assertFourWayParity('communications_studio_module.js');
    const audit = auditModuleAst('communications_studio_module.js');
    expect(audit.reactBtnTotal).toBe(31);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-comms-studio-a11y-css')?.remove();
    loadAlloModule('communications_studio_module.js');
    const Panel = window.AlloModules.CommunicationsStudio.CommunicationsStudioPanel;

    const closeSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(Panel, {
        isOpen: true,
        onClose: closeSpy,
        t: (k) => k,
      }));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-communications-studio="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-comms-studio-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-communications-studio="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    // Alt+ArrowRight / IME ArrowRight on tablist must NOT switch template; plain ArrowRight switches
    const tabs = [...dialog.querySelectorAll('[role="tab"]')];
    expect(tabs.length).toBe(4);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }));
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', keyCode: 229, bubbles: true }));
    });
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');

    // Ctrl+Escape / IME Escape must not close; plain Escape closes
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    });
    expect(closeSpy).not.toHaveBeenCalled();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(dialog)).toEqual([]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
