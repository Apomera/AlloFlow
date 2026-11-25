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

describe('Other Resources Polish — Wave 88 (MeetingDocs, DirectionsComposer, UdlWalkthrough, QuickStartWizard)', () => {
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
    window.AlloLanguageContext = React.createContext({ t: (k) => k });
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

  it('1. meeting_docs_module.js: 4-way mirror, 25/25 typed buttons, scoped WCAG CSS, IME/modifier tab & Escape guards, and 0 axe violations', async () => {
    assertFourWayParity('meeting_docs_module.js');
    const audit = auditModuleAst('meeting_docs_module.js');
    expect(audit.reactBtnTotal).toBe(25);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-meetdocs-a11y-css')?.remove();
    loadAlloModule('meeting_docs_module.js');
    const Panel = window.AlloModules.MeetingDocs.MeetingDocsPanel;

    const closeSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(Panel, { isOpen: true, onClose: closeSpy, t: () => null }));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-meeting-docs="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-meetdocs-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-meeting-docs="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    // Alt+ArrowRight / IME ArrowRight must not switch tab; plain ArrowRight switches
    const tabs = [...dialog.querySelectorAll('[role="tab"]')];
    expect(tabs.length).toBeGreaterThanOrEqual(3);
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

  it('2. view_directions_composer_module.js: 4-way mirror, 15/15 typed buttons, scoped WCAG CSS, IME/modifier Escape guard, and 0 axe violations', async () => {
    assertFourWayParity('view_directions_composer_module.js');
    const audit = auditModuleAst('view_directions_composer_module.js');
    expect(audit.reactBtnTotal).toBe(15);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-directions-composer-a11y-css')?.remove();
    loadAlloModule('view_directions_composer_module.js');
    const View = window.AlloModules.DirectionsComposer.DirectionsComposerView;

    const Icon = () => React.createElement('span', { 'aria-hidden': 'true' });
    const closeSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(View, {
        ArrowRight: Icon,
        ClipboardList: Icon,
        Sparkles: Icon,
        X: Icon,
        _alloDirectionsGoalResources: [],
        _alloGoalOptionsForResource: () => [],
        _alloStationStyle: () => ({}),
        _mbDirectionsChoiceDraftChoices: [],
        _mbDirectionsChoicePreviewItems: [],
        _mbDirectionsChoiceReady: false,
        _mbDirectionsChoiceStaleCount: 0,
        addDirectionsToPack: vi.fn(),
        deriveDirectionsDraft: vi.fn(),
        directionsDeriving: false,
        generateUUID: () => 'goal-1',
        mbDirectionsDraft: { title: 'Directions', body: 'Step 1', objectives: [], choiceBoard: { enabled: false, choices: [] } },
        mbDirectionsGoalRes: '',
        mbDirectionsGoalText: '',
        setMbDirectionsDraft: vi.fn(),
        setMbDirectionsGoalRes: vi.fn(),
        setMbDirectionsGoalText: vi.fn(),
        setShowDirectionsChoicePreview: vi.fn(),
        setShowDirectionsComposer: closeSpy,
        showDirectionsChoicePreview: false,
        t: () => '',
      }));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-directions-composer="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-directions-composer-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-directions-composer="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

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

  it('3. udl_walkthrough_module.js: 4-way mirror, 33/33 typed buttons, scoped WCAG CSS, IME/modifier tab & Escape guards, and 0 axe violations', async () => {
    assertFourWayParity('udl_walkthrough_module.js');
    const audit = auditModuleAst('udl_walkthrough_module.js');
    expect(audit.reactBtnTotal).toBe(33);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-udlwalk-a11y-css')?.remove();
    loadAlloModule('udl_walkthrough_module.js');
    const Panel = window.AlloModules.UdlWalkthrough.UdlWalkthroughPanel;

    const closeSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(Panel, { isOpen: true, onClose: closeSpy, t: () => null }));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-udl-walkthrough="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-udlwalk-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-udl-walkthrough="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    // Alt+ArrowRight / IME ArrowRight on tablist must not switch; plain ArrowRight switches
    const tabs = [...dialog.querySelectorAll('[role="tab"]')];
    expect(tabs.length).toBeGreaterThanOrEqual(3);
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

  it('4. quickstart_module.js: 4-way mirror, 46/46 typed buttons, scoped WCAG CSS, IME/modifier Escape guard, and 0 axe violations', async () => {
    assertFourWayParity('quickstart_module.js');
    const audit = auditModuleAst('quickstart_module.js');
    expect(audit.reactBtnTotal).toBe(46);
    expect(audit.reactBtnUntyped).toBe(0);
    expect(audit.reactBtnDupType).toBe(0);

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-quickstart-a11y-css')?.remove();
    loadAlloModule('quickstart_module.js');
    const Wizard = window.AlloModules.QuickStartWizard;

    const closeSpy = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);

    await act(async () => {
      root.render(React.createElement(Wizard, {
        isOpen: true,
        onClose: closeSpy,
        onComplete: vi.fn(),
        onUpload: vi.fn(),
        onLookupStandards: null,
        onCallGemini: () => Promise.resolve(''),
        onWebSearch: null,
        addToast: vi.fn(),
        isParentMode: false,
        isIndependentMode: false,
        isHelpMode: false,
        setIsHelpMode: vi.fn(),
      }));
      await Promise.resolve();
    });

    const dialog = mountEl.querySelector('[data-quickstart-wizard="true"][role="dialog"]');
    expect(dialog).not.toBeNull();
    const styleEl = document.getElementById('allo-quickstart-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('[data-quickstart-wizard="true"]');
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

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
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
