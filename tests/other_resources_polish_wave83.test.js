import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MODULES_DIR = path.resolve(ROOT, 'desktop/web-app/node_modules');
const React = require(path.resolve(MODULES_DIR, 'react'));
const ReactDOM = require(path.resolve(MODULES_DIR, 'react-dom'));
const ReactDOMClient = require(path.resolve(MODULES_DIR, 'react-dom/client'));
const { act } = React;
const acorn = require(path.resolve(MODULES_DIR, 'acorn'));
const axe = require(path.resolve(MODULES_DIR, 'axe-core'));

const MIRROR_DIRS = ['.', 'desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertFourWayParity(relPath) {
  const rootHash = sha256(path.resolve(ROOT, relPath));
  for (const dir of MIRROR_DIRS.slice(1)) {
    const mirrorPath = path.resolve(ROOT, dir, relPath);
    expect(fs.existsSync(mirrorPath), `${mirrorPath} must exist`).toBe(true);
    expect(sha256(mirrorPath), `${mirrorPath} must match root ${relPath}`).toBe(rootHash);
  }
}

function auditModuleAst(relPath) {
  const src = fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest' });
  let totalReactBtn = 0;
  let untypedNonForm = 0;
  let dupType = 0;
  let rangesMissingVt = 0;
  let domBtnTotal = 0;
  let domBtnTyped = 0;
  let canvasTotal = 0;
  let canvasHidden = 0;
  const walk = (n, inForm) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, inForm)); return; }
    let nf = inForm;
    if (n.type === 'CallExpression' && n.arguments[0] && n.arguments[0].type === 'Literal') {
      const isDom = n.callee.type === 'MemberExpression' && n.callee.object && n.callee.object.name === 'document';
      const cname = n.callee.type === 'Identifier'
        ? n.callee.name
        : (n.callee.type === 'MemberExpression' && n.callee.property ? n.callee.property.name : '');
      const tag = n.arguments[0].value;
      if (!isDom && ['ce', 'h', 'createElement'].includes(cname)) {
        if (tag === 'form') nf = true;
        if (tag === 'button') {
          totalReactBtn++;
          const props = n.arguments[1];
          if (props && props.type === 'ObjectExpression') {
            const types = props.properties.filter((p) => p.type === 'Property' && (
              (p.key.type === 'Identifier' && p.key.name === 'type') ||
              (p.key.type === 'Literal' && p.key.value === 'type')
            ));
            if (types.length > 1) dupType++;
            if (types.length === 0 && !inForm) untypedNonForm++;
          } else if (!inForm && (!props || props.type === 'Literal')) {
            untypedNonForm++;
          }
        }
        if (tag === 'input' && n.arguments[1] && n.arguments[1].type === 'ObjectExpression') {
          const isRange = n.arguments[1].properties.some((p) => p.type === 'Property' && (p.key.name === 'type' || p.key.value === 'type') && p.value && p.value.value === 'range');
          if (isRange) {
            const hasVt = n.arguments[1].properties.some((p) => p.type === 'Property' && (p.key.name === 'aria-valuetext' || p.key.value === 'aria-valuetext'));
            if (!hasVt) rangesMissingVt++;
          }
        }
      }
    }
    for (const k of Object.keys(n)) if (k !== 'start' && k !== 'end') walk(n[k], nf);
  };
  walk(ast, false);
  for (const m of src.matchAll(/document\.createElement\(\s*['"]button['"]\s*\)/g)) {
    domBtnTotal++;
    if (/\.type\s*=\s*['"]button['"]/.test(src.slice(m.index, m.index + 240))) domBtnTyped++;
  }
  for (const m of src.matchAll(/document\.createElement\(\s*['"]canvas['"]\s*\)/g)) {
    canvasTotal++;
    if (/setAttribute\(\s*['"]aria-hidden['"]\s*,\s*['"]true['"]\s*\)/.test(src.slice(m.index, m.index + 240))) canvasHidden++;
  }
  return { src, totalReactBtn, untypedNonForm, dupType, rangesMissingVt, domBtnTotal, domBtnTyped, canvasTotal, canvasHidden };
}

async function runAxe(el) {
  const res = await axe.run(el, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  return res.violations;
}

describe('Other Resources Polish — Wave 83 (ErrorReporter, LargeFile, AltText, TextUtilityHelpers)', () => {
  let mountEl = null;
  let root = null;
  let errorSpy = null;
  const domWindows = [];

  beforeAll(() => {
    global.React = window.React = React;
    global.ReactDOM = window.ReactDOM = ReactDOM;
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    if (mountEl) {
      mountEl.remove();
      mountEl = null;
    }
    while (domWindows.length) {
      try { domWindows.pop().close(); } catch (_) {}
    }
    if (errorSpy) {
      errorSpy.mockRestore();
      errorSpy = null;
    }
    window.__alloFocusTrapStack = [];
    vi.restoreAllMocks();
  });

  it('1. error_reporter_module.js: 4-way mirror, scoped WCAG CSS, IME/modifier badge & panel keydown guards, and 0 axe violations', async () => {
    assertFourWayParity('error_reporter_module.js');
    const audit = auditModuleAst('error_reporter_module.js');
    expect(audit.domBtnTotal).toBe(1);
    expect(audit.domBtnTyped).toBe(1);
    expect(audit.src).toContain('allo-err-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    const w = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', {
      url: 'https://alloflow.example/app/',
      runScripts: 'outside-only',
      virtualConsole: new VirtualConsole(),
    }).window;
    domWindows.push(w);
    w.__alloStudentView = false;
    w.__alloPendingCoachPosture = 'educator';
    w.eval(audit.src);

    // Trigger badge & verify Ctrl+Enter does NOT open panel
    w.console.error('Wave 83 diagnostic test');
    const badge = w.document.getElementById('allo-err-badge');
    expect(badge).not.toBeNull();
    expect(badge.getAttribute('type')).toBe('button');
    badge.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    expect(w.document.getElementById('allo-err-panel')).toBeNull();

    // Open panel and verify style injection
    w.AlloModules.ErrorReporter.openPanel('errors');
    const styleEl = w.document.getElementById('allo-err-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    const panel = w.document.getElementById('allo-err-panel');
    expect(panel).not.toBeNull();
    const btns = [...panel.querySelectorAll('button')];
    expect(btns.length).toBeGreaterThan(0);
    for (const b of btns) expect(b.getAttribute('type')).toBe('button');

    // Ctrl+Escape and IME keyCode 229 Escape must NOT close panel
    panel.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
    panel.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    expect(w.document.getElementById('allo-err-panel')).not.toBeNull();

    // Verify 0 axe violations on rendered ErrorReporter panel (imported into Vitest jsdom realm)
    mountEl = document.createElement('div');
    mountEl.appendChild(document.importNode(panel, true));
    document.body.appendChild(mountEl);
    expect(await runAxe(mountEl)).toEqual([]);

    // Plain Escape closes panel
    panel.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(w.document.getElementById('allo-err-panel')).toBeNull();
  });

  it('2. large_file_module.js: 4-way mirror, upgraded guarded WCAG CSS, IME/modifier focus-trap guard, and 0 axe violations', async () => {
    assertFourWayParity('large_file_module.js');
    const audit = auditModuleAst('large_file_module.js');
    expect(audit.totalReactBtn).toBe(3);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('large-file-module-a11y');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('large-file-module-a11y')?.remove();
    delete window.AlloModules?.LargeFileModule;
    delete window.AlloModules?.LargeFileTranscriptionModal;
    loadAlloModule('large_file_module.js');
    const Modal = window.AlloModules.LargeFileTranscriptionModal;
    expect(Modal).toBeTruthy();

    const onClose = vi.fn();
    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(Modal, {
        isOpen: true,
        file: { name: 'seminar.mp3', size: 28 * 1024 * 1024, type: 'audio/mpeg' },
        onClose,
        onConfirm: vi.fn(),
        progress: 0,
        totalChunks: 0,
        status: '',
        isProcessing: false,
        t: (k) => (k === 'common.close' ? 'Close' : k === 'common.cancel' ? 'Cancel' : null),
      }));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('large-file-module-a11y');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    const dialog = mountEl.querySelector('[data-large-file-modal="true"][role="dialog"]');
    expect(dialog).not.toBeNull();

    // Ctrl+Escape and IME keyCode 229 Escape must NOT call onClose
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();

    // Plain Escape calls onClose
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('3. alt_text_module.js: 4-way mirror, 3/3 offscreen canvases aria-hidden, scoped WCAG CSS, and 0 axe violations', async () => {
    assertFourWayParity('alt_text_module.js');
    const audit = auditModuleAst('alt_text_module.js');
    expect(audit.totalReactBtn).toBe(4);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.canvasTotal).toBe(3);
    expect(audit.canvasHidden).toBe(3);
    expect(audit.src).toContain('allo-alt-text-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-alt-text-a11y-css')?.remove();
    delete window.AlloModules?.AltText;
    loadAlloModule('doc_pipeline_module.js');
    loadAlloModule('alt_text_module.js');
    const AltText = window.AlloModules.AltText;
    expect(AltText).toBeTruthy();

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(
        'div',
        null,
        React.createElement(AltText.ImageAltField, {
          id: 'w83-alt-field',
          value: 'A labelled glass beaker showing water evaporation.',
          onChange: vi.fn(),
          source: 'vision',
          decorative: false,
          onDecorativeChange: vi.fn(),
          onRegenerate: vi.fn(),
          busy: false,
          disabled: false,
          t: () => '',
        }),
        React.createElement(AltText.ClassroomImagePicker, {
          onChoose: vi.fn(),
          t: () => '',
        })
      ));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('allo-alt-text-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-alt-text-field="true"]')).not.toBeNull();
    expect(mountEl.querySelector('[data-classroom-image-picker]')).not.toBeNull();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('4. text_utility_helpers_module.js: 4-way mirror, scoped WCAG CSS, IME/modifier Escape guard on GlossaryTermSpan, and 0 axe violations', async () => {
    assertFourWayParity('text_utility_helpers_module.js');
    const audit = auditModuleAst('text_utility_helpers_module.js');
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('allo-text-utility-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-text-utility-a11y-css')?.remove();
    delete window.AlloModules?.TextUtilityHelpers;
    loadAlloModule('text_utility_helpers_module.js');
    const TU = window.AlloModules.TextUtilityHelpers;
    expect(TU).toBeTruthy();

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    const glossary = [{ term: 'photosynthesis', definition: 'Process plants use to convert sunlight into chemical energy.' }];
    await act(async () => {
      root.render(React.createElement(
        'p',
        null,
        TU.highlightGlossaryTerms('Plants rely on photosynthesis every day.', glossary, false, false, { leveledTextLanguage: 'English' })
      ));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('allo-text-utility-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    const term = mountEl.querySelector('.allo-glossary-term');
    expect(term).not.toBeNull();
    await act(async () => {
      term.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(document.querySelector('[data-glossary-tooltip="true"]')).not.toBeNull();

    // Ctrl+Escape and IME keyCode 229 Escape must NOT dismiss the tooltip
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
      term.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
    });
    expect(document.querySelector('[data-glossary-tooltip="true"]')).not.toBeNull();

    expect(await runAxe(mountEl)).toEqual([]);

    // Plain Escape dismisses the tooltip
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.querySelector('[data-glossary-tooltip="true"]')).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
