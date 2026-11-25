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
  let domBtnTotal = 0;
  let domBtnTyped = 0;
  let canvasTotal = 0;
  let canvasHidden = 0;
  const walk = (n, inForm) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, inForm)); return; }
    let nf = inForm;
    if (n.type === 'CallExpression' && n.arguments[0] && n.arguments[0].type === 'Literal') {
      const isDom = n.callee.type === 'MemberExpression' && n.callee.object && ['document', 'doc'].includes(n.callee.object.name);
      const cname = n.callee.type === 'Identifier'
        ? n.callee.name
        : (n.callee.type === 'MemberExpression' && n.callee.property ? n.callee.property.name : '');
      const tag = n.arguments[0].value;
      if (!isDom && ['h', 'ce', 'createElement'].includes(cname)) {
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
      }
    }
    for (const k of Object.keys(n)) if (k !== 'start' && k !== 'end') walk(n[k], nf);
  };
  walk(ast, false);
  for (const m of src.matchAll(/\b(?:document|doc)\.createElement\(\s*['"]button['"]\s*\)|\bel\(\s*['"]button['"]/g)) {
    domBtnTotal++;
    if (/\.type\s*=\s*['"]button['"]/.test(src.slice(m.index, m.index + 240))) domBtnTyped++;
  }
  for (const m of src.matchAll(/\b(?:document|doc)\.createElement\(\s*['"]canvas['"]\s*\)/g)) {
    canvasTotal++;
    if (/setAttribute\(\s*['"]aria-hidden['"]\s*,\s*['"]true['"]\s*\)/.test(src.slice(m.index, m.index + 240))) canvasHidden++;
  }
  return { src, totalReactBtn, untypedNonForm, dupType, domBtnTotal, domBtnTyped, canvasTotal, canvasHidden };
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

describe('Other Resources Polish — Wave 86 (SageLauncher, DocBuilderRenderer, UtilsPure, PacketsPictures)', () => {
  let mountEl = null;
  let root = null;
  let errorSpy = null;
  const domWindows = [];

  beforeAll(() => {
    global.React = window.React = React;
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
    delete window.__alloArcadeSageLauncherLoaded;
    vi.restoreAllMocks();
  });

  it('1. arcade_mode_sage_launcher.js: 4-way mirror, scoped WCAG CSS, 1/1 typed button, and 0 axe violations', async () => {
    assertFourWayParity('arcade_mode_sage_launcher.js');
    const audit = auditModuleAst('arcade_mode_sage_launcher.js');
    expect(audit.totalReactBtn).toBe(1);
    expect(audit.untypedNonForm).toBe(0);
    expect(audit.dupType).toBe(0);
    expect(audit.src).toContain('ah-sage-launcher-a11y-css');
    expect(audit.src).toContain('touch-action: manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('ah-sage-launcher-a11y-css')?.remove();
    delete window.__alloArcadeSageLauncherLoaded;
    const modes = Object.create(null);
    window.AlloHavenArcade = {
      registerMode(id, def) { modes[id] = def; },
      isRegistered(id) { return Object.prototype.hasOwnProperty.call(modes, id); },
    };
    loadAlloModule('arcade_mode_sage_launcher.js');
    const mode = modes['sage-launcher'];
    expect(mode).toBeTruthy();

    function Card() {
      return mode.render({
        React,
        tokens: 15,
        minutesPerToken: 5,
        onLaunch: vi.fn(() => true),
        onClose: vi.fn(),
        palette: {},
      });
    }

    mountEl = document.createElement('div');
    document.body.appendChild(mountEl);
    root = ReactDOMClient.createRoot(mountEl);
    await act(async () => {
      root.render(React.createElement(Card));
      await Promise.resolve();
    });

    const styleEl = document.getElementById('ah-sage-launcher-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action: manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    expect(mountEl.querySelector('[data-arcade-mode="sage-launcher"]')).not.toBeNull();

    const btn = mountEl.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('type')).toBe('button');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('2. doc_builder_renderer_module.js: 4-way mirror, scoped placeholder WCAG CSS, touch-action controls, and 0 axe violations', async () => {
    assertFourWayParity('doc_builder_renderer_module.js');
    const audit = auditModuleAst('doc_builder_renderer_module.js');
    expect(audit.src).toContain('allo-doc-builder-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('allo-doc-builder-a11y-css')?.remove();
    delete window.AlloModules?.DocBuilderRendererModule;
    loadAlloModule('doc_builder_renderer_module.js');
    const Renderer = window.AlloModules.DocBuilderRenderer;
    expect(Renderer).toBeTruthy();

    const render = Renderer.createRenderer({
      docStyle: {
        headingColor: '#0f172a',
        textColor: '#1e293b',
        accentColor: '#2563eb',
        bgColor: '#ffffff',
        sectionBorderColor: '#cbd5e1',
        tableBg: '#1e3a8a',
        headerBg: '#1e3a8a',
      },
      _accessibleHeaderColors: () => null,
      _alloCellRichText: (v, esc) => esc(v),
      _emitAccessibleTableHtml: () => '<table></table>',
      _pipeLog: () => {},
      _sanitizeRawHtmlBlock: (h) => String(h || ''),
      _validateTableGrid: () => ({ ok: false }),
      renderWordArtHtml: (t) => '<span>' + t + '</span>',
      warnLog: () => {},
    });

    const styleEl = document.getElementById('allo-doc-builder-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');

    const html = render([
      { type: 'h2', text: 'Diagram Section', id: 'sec-1' },
      { type: 'image', id: 'img1', description: 'Diagram of the water cycle', alt: 'Water cycle stages' },
    ]);
    mountEl = document.createElement('div');
    mountEl.innerHTML = html;
    document.body.appendChild(mountEl);

    const buttons = [...mountEl.querySelectorAll('button')];
    expect(buttons.length).toBe(2);
    for (const b of buttons) {
      expect(b.getAttribute('type')).toBe('button');
      expect(b.getAttribute('style')).toMatch(/touch-action:\s*manipulation/);
    }
    const uploadLabel = mountEl.querySelector('label');
    expect(uploadLabel.getAttribute('style')).toMatch(/touch-action:\s*manipulation/);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(await runAxe(mountEl)).toEqual([]);
  });

  it('3. utils_pure_module.js: 4-way mirror, offscreen canvas aria-hidden, retired notice WCAG CSS & 44px controls, and 0 axe violations', async () => {
    assertFourWayParity('utils_pure_module.js');
    const audit = auditModuleAst('utils_pure_module.js');
    expect(audit.domBtnTotal).toBe(1);
    expect(audit.domBtnTyped).toBe(1);
    expect(audit.canvasTotal).toBe(1);
    expect(audit.canvasHidden).toBe(1);
    expect(audit.src).toContain('allo-retired-notice-a11y-css');
    expect(audit.src).toContain('touch-action:manipulation');
    expect(audit.src).toContain('forced-colors: active');
    expect(audit.src).toContain('prefers-reduced-motion: reduce');

    const w = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', {
      url: 'https://preview.googleusercontent.com/',
      runScripts: 'outside-only',
      virtualConsole: new VirtualConsole(),
    }).window;
    domWindows.push(w);
    w.eval(audit.src);

    const notice = w.document.getElementById('allo-retired-version-notice');
    expect(notice).not.toBeNull();
    const styleEl = w.document.getElementById('allo-retired-notice-a11y-css');
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain('touch-action:manipulation');
    expect(styleEl.textContent).toContain(':focus-visible');
    expect(styleEl.textContent).toContain('forced-colors: active');
    expect(styleEl.textContent).toContain('prefers-reduced-motion: reduce');
    const link = notice.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.getAttribute('style')).toMatch(/min-height:\s*44px/);
    expect(link.getAttribute('style')).toMatch(/touch-action:\s*manipulation/);

    mountEl = document.createElement('div');
    mountEl.appendChild(document.importNode(notice, true));
    document.body.appendChild(mountEl);
    expect(await runAxe(mountEl)).toEqual([]);

    // Also verify the dismissible 'previous' notice branch (44px typed Dismiss button + 0 axe violations)
    const wPrev = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', {
      url: 'https://preview.googleusercontent.com/',
      runScripts: 'outside-only',
      virtualConsole: new VirtualConsole(),
    }).window;
    domWindows.push(wPrev);
    wPrev.__alloModuleLoadDiagnostics = {};
    wPrev.Date.now = () => Date.parse('2026-10-01T00:00:00Z');
    wPrev.eval(audit.src);

    const prevNotice = wPrev.document.getElementById('allo-retired-version-notice');
    expect(prevNotice).not.toBeNull();
    const dismissBtn = prevNotice.querySelector('button');
    expect(dismissBtn).not.toBeNull();
    expect(dismissBtn.getAttribute('type')).toBe('button');
    expect(dismissBtn.getAttribute('style')).toMatch(/min-height:\s*44px/);
    expect(dismissBtn.getAttribute('style')).toMatch(/touch-action:\s*manipulation/);
    const prevMount = document.createElement('div');
    prevMount.appendChild(document.importNode(prevNotice, true));
    document.body.appendChild(prevMount);
    expect(await runAxe(prevMount)).toEqual([]);
    prevMount.remove();
    dismissBtn.click();
    expect(wPrev.document.getElementById('allo-retired-version-notice')).toBeNull();
  });

  it('4. packets-pictures.js + packets-pictures.css: 4-way mirror, CSP single-createElement, 5/5 DOM buttons typed, scoped WCAG CSS, IME/modifier Enter & Escape guards, and 0 axe violations', async () => {
    assertFourWayParity('packets-pictures.js');
    assertFourWayParity('packets-pictures.css');
    const audit = auditModuleAst('packets-pictures.js');
    expect(audit.domBtnTotal).toBe(5);
    expect(audit.domBtnTyped).toBe(5);
    expect(audit.src.match(/createElement(?:NS)?\(/g)).toEqual(['createElement(']);
    const css = fs.readFileSync(path.resolve(ROOT, 'packets-pictures.css'), 'utf8');
    expect(css).toContain('[data-packets-pictures-root]');
    expect(css).toMatch(/touch-action:\s*manipulation/);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('prefers-reduced-motion: reduce');

    const rawHtml = fs.readFileSync(path.resolve(ROOT, 'packets-pictures.html'), 'utf8')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const w = new JSDOM(rawHtml, {
      url: 'https://alloflow.example/packets-pictures.html',
      runScripts: 'outside-only',
      virtualConsole: new VirtualConsole(),
    }).window;
    domWindows.push(w);

    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    w.fetch = fetchSpy;
    w.AlloPacketMyWords = {
      available: async () => true,
      list: async () => [],
      getMany: async () => ({}),
      put: async (_word, entry) => entry,
      remove: async () => {},
      clear: async () => {},
      creditLine: () => '',
      onChange: () => {},
    };

    w.eval(audit.src);
    await new Promise((r) => setTimeout(r, 10));

    expect(w.document.documentElement.getAttribute('data-packets-pictures-root')).toBe('true');

    // Turn online search on and test Ctrl+Enter / IME keyCode 229 Enter guards
    const onlineOn = w.document.getElementById('online-on');
    onlineOn.checked = true;
    onlineOn.dispatchEvent(new w.Event('change', { bubbles: true }));
    const wordInput = w.document.getElementById('word');
    wordInput.value = 'volcano';
    wordInput.dispatchEvent(new w.Event('input', { bubbles: true }));
    wordInput.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    wordInput.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true }));
    expect(fetchSpy).not.toHaveBeenCalled();

    // Open remove-all-ask prompt and verify Ctrl+Escape keeps it open while plain Escape closes & restores focus
    const removeAllBtn = w.document.getElementById('remove-all');
    const removeAsk = w.document.getElementById('remove-all-ask');
    removeAllBtn.hidden = false;
    removeAllBtn.click();
    expect(removeAsk.hidden).toBe(false);
    removeAsk.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', ctrlKey: true, bubbles: true }));
    removeAsk.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true }));
    expect(removeAsk.hidden).toBe(false);
    removeAsk.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(removeAsk.hidden).toBe(true);
    expect(w.document.activeElement).toBe(removeAllBtn);

    mountEl = document.createElement('div');
    mountEl.appendChild(document.importNode(w.document.body, true));
    document.body.appendChild(mountEl);
    expect(await runAxe(mountEl)).toEqual([]);
  });
});
