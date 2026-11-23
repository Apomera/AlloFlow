import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const cleanups = [];

async function runAxe(container) {
  let target = container;
  let tempHost = null;
  if (container && container.ownerDocument !== document) {
    tempHost = document.createElement('div');
    tempHost.innerHTML = container.innerHTML;
    document.body.appendChild(tempHost);
    target = tempHost;
  }
  try {
    const result = await axe.run(target, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  } finally {
    if (tempHost) tempHost.remove();
  }
}

function loadPageDom(htmlFile, { execScripts = true, injectScripts = [], reducedMotion = false, beforeParseExtra = null } = {}) {
  const raw = readFileSync(resolve(process.cwd(), htmlFile), 'utf8');
  let html = raw.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  if (injectScripts.length) {
    const inlineTags = injectScripts
      .map((scriptPath) => `<script>${readFileSync(resolve(process.cwd(), scriptPath), 'utf8')}</script>`)
      .join('\n');
    html = html.replace(/<\/body>/i, `${inlineTags}\n</body>`);
  }
  const dom = new JSDOM(html, {
    url: 'https://alloflow-cdn.pages.dev/' + htmlFile,
    runScripts: execScripts ? 'dangerously' : undefined,
    beforeParse(win) {
      win.matchMedia = vi.fn((q) => ({
        matches: reducedMotion && String(q).includes('prefers-reduced-motion'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      win.scrollTo = vi.fn();
      if (beforeParseExtra) beforeParseExtra(win);
    },
  });
  cleanups.push(() => { dom.window.close(); });
  return { raw, dom, win: dom.window, doc: dom.window.document };
}

afterEach(() => {
  while (cleanups.length) {
    const fn = cleanups.pop();
    fn();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other Resources Polish — Wave 28', () => {
  it('polishes all generated STEAM tool About pages (tool-page.js, tool-page.css, tabindex=-1 main, 1-click Copy Cloudflare link) with zero axe violations', async () => {
    const js = readFileSync(resolve(process.cwd(), 'tool-page.js'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'tool-page.css'), 'utf8');
    expect(js).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
    expect(css).toContain('.tool-page-copy-btn');
    expect(css).toContain('min-height: 44px;');
    expect(css).toContain('.tool-page .tool-page-manual');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (forced-colors: active)');

    for (const sample of ['tool-coaster-lab.html', 'tool-water-cycle.html', 'tool-evo-lab.html', 'tool-kitchen-lab.html', 'tool-solar-system.html']) {
      const html = readFileSync(resolve(process.cwd(), sample), 'utf8');
      expect(html, sample).toContain('<meta name="referrer" content="no-referrer">');
      expect(html, sample).toContain('<script src="tool-page.js" defer></script>');
      expect(html, sample).toContain('<main id="tool-main" tabindex="-1" class="tool-page">');
    }

    const writeText = vi.fn(async () => {});
    const { win, doc } = loadPageDom('tool-coaster-lab.html', {
      injectScripts: ['tool-page.js'],
      beforeParseExtra(w) {
        Object.defineProperty(w.navigator, 'clipboard', {
          value: { writeText },
          configurable: true,
        });
      },
    });
    doc.dispatchEvent(new win.Event('DOMContentLoaded'));

    const copyBtn = doc.querySelector('.tool-page-copy-btn');
    const status = doc.querySelector('.tool-page-copy-status');
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.getAttribute('aria-label')).toBe('Copy Cloudflare link for Coaster Lab');
    expect(status?.getAttribute('role')).toBe('status');

    copyBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(writeText).toHaveBeenCalledWith('https://alloflow-cdn.pages.dev/coaster-lab');
    expect(status.textContent).toBe('Copied Cloudflare link for Coaster Lab.');

    await runAxe(doc.body);
  });

  it('hardens site.js mobile drawer (IME-safe Escape, document Escape, resize inert cleanup, Lucide aria-hidden, fallback example copy)', async () => {
    const siteJs = readFileSync(resolve(process.cwd(), 'site.js'), 'utf8');
    const html = `<!DOCTYPE html><html lang="en"><head><title>Site Harness</title></head><body>
      <nav class="navbar"><button type="button" class="mobile-menu-btn" aria-expanded="false" aria-controls="mobileNav">Menu</button><i data-lucide="menu"></i></nav>
      <div id="mobileNav" class="mobile-nav" role="dialog" aria-modal="true" aria-label="Site navigation" hidden>
        <button type="button" class="close-btn" aria-label="Close menu">&times;</button>
        <a href="tools.html">Find a Tool</a>
      </div>
      <main id="main" tabindex="-1">
        <h1>Example</h1>
        <pre id="classroom-example-source">Sample classroom passage</pre>
        <button type="button" id="copy-example-source" hidden>Copy sample text</button>
        <p id="copy-example-status" role="status" aria-live="polite"></p>
      </main>
      <script>${siteJs}</script>
    </body></html>`;

    let btnDisplay = 'inline-flex';
    const dom = new JSDOM(html, {
      url: 'https://apomera.github.io/AlloFlow/ways-to-use.html',
      runScripts: 'dangerously',
      beforeParse(win) {
        win.document.execCommand = vi.fn(() => true);
        const origGcs = win.getComputedStyle.bind(win);
        win.getComputedStyle = (el) => {
          if (el && el.classList && el.classList.contains('mobile-menu-btn')) {
            return { display: btnDisplay };
          }
          return origGcs(el);
        };
      },
    });
    cleanups.push(() => { dom.window.close(); });

    const { window: win } = dom;
    const doc = win.document;
    doc.dispatchEvent(new win.Event('DOMContentLoaded'));

    expect(doc.querySelector('i[data-lucide]').getAttribute('aria-hidden')).toBe('true');

    const openBtn = doc.querySelector('.mobile-menu-btn');
    const menu = doc.getElementById('mobileNav');
    const main = doc.getElementById('main');

    openBtn.focus();
    openBtn.click();
    expect(menu.hidden).toBe(false);
    expect(main.hasAttribute('inert')).toBe(true);

    // IME composing Escape must not close menu
    menu.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(menu.hidden).toBe(false);

    // Document-level Escape closes menu and restores focus
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu.hidden).toBe(true);
    expect(main.hasAttribute('inert')).toBe(false);
    expect(doc.activeElement).toBe(openBtn);

    // Resize past mobile breakpoint clears inert and closes open drawer
    openBtn.click();
    expect(menu.hidden).toBe(false);
    btnDisplay = 'none';
    win.dispatchEvent(new win.Event('resize'));
    expect(menu.hidden).toBe(true);
    expect(main.hasAttribute('inert')).toBe(false);

    // Fallback copy works without navigator.clipboard
    const copyBtn = doc.getElementById('copy-example-source');
    const status = doc.getElementById('copy-example-status');
    expect(copyBtn.hidden).toBe(false);
    copyBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(win.document.execCommand).toHaveBeenCalledWith('copy');
    expect(status.textContent).toContain('Copied.');

    await runAxe(doc.body);
  });

  it('polishes download.html and educator-evaluation.html (focus rings, 44px boot link, live OS theme sync, mirror parity) with zero axe violations', async () => {
    const { raw: dlRaw, doc: dlDoc } = loadPageDom('download.html', { execScripts: false });
    expect(dlRaw).toContain('<meta name="referrer" content="no-referrer">');
    expect(dlRaw).toContain('.cta:focus-visible');
    expect(dlRaw).toContain('@media(prefers-reduced-motion:reduce)');
    expect(dlRaw).toContain('@media(forced-colors:active)');
    expect(dlRaw).toContain('rel="noopener noreferrer"');
    await runAxe(dlDoc.body);

    const listeners = {};
    let isDark = false;
    let isContrast = false;
    const { raw: eeRaw, doc: eeDoc } = loadPageDom('educator-evaluation.html', {
      beforeParseExtra(win) {
        win.matchMedia = vi.fn((q) => ({
          get matches() {
            if (q.includes('prefers-contrast')) return isContrast;
            if (q.includes('prefers-color-scheme')) return isDark;
            return false;
          },
          addEventListener(ev, fn) {
            listeners[q] = listeners[q] || [];
            listeners[q].push(fn);
          },
          removeEventListener() {},
        }));
      },
    });
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/educator-evaluation.html'), 'utf8')).toBe(eeRaw);
    expect(eeRaw).toContain('min-height:44px');
    expect(eeRaw).toContain('.boot a:focus-visible');
    expect(eeDoc.documentElement.getAttribute('data-ae-theme')).toBe('light');

    isDark = true;
    (listeners['(prefers-color-scheme: dark)'] || []).forEach((fn) => fn());
    expect(eeDoc.documentElement.getAttribute('data-ae-theme')).toBe('dark');

    isContrast = true;
    (listeners['(prefers-contrast: more)'] || []).forEach((fn) => fn());
    expect(eeDoc.documentElement.getAttribute('data-ae-theme')).toBe('contrast');

    await runAxe(eeDoc.body);
  });

  it('polishes geometry_world_demo.html (semantic toolbar buttons, 44px close, IME Escape, reduced motion) and speech_device_test.html (44px controls, progress aria-valuetext, IME Escape) with zero axe violations', async () => {
    const { raw: gwRaw, win: gwWin, doc: gwDoc } = loadPageDom('geometry_world_demo.html', {
      beforeParseExtra(win) {
        win.HTMLCanvasElement.prototype.getContext = () => ({
          fillStyle: '', font: '', textAlign: '', textBaseline: '',
          fillRect() {}, fillText() {}, roundRect() {}, fill() {}, beginPath() {}, stroke() {},
        });
        // Lightweight Three.js stub so init() builds the real toolbar & listeners cleanly in JSDOM
        function Vec3(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        Vec3.prototype.set = function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; };
        Vec3.prototype.distanceTo = function () { return 99; };
        Vec3.prototype.normalize = function () { return this; };
        Vec3.prototype.crossVectors = function () { return this; };
        Vec3.prototype.add = function () { return this; };
        Vec3.prototype.sub = function () { return this; };
        Vec3.prototype.length = function () { return 0; };
        function Obj3() { this.position = new Vec3(); this.rotation = new Vec3(); this.quaternion = {}; this.userData = {}; this.children = []; this.shadow = { mapSize: {}, camera: {} }; }
        Obj3.prototype.add = function (c) { this.children.push(c); };
        Obj3.prototype.remove = function () {};
        Obj3.prototype.set = function () {};
        Obj3.prototype.getWorldDirection = function () { return new Vec3(); };
        const threeBase = {
          Vector2: function (x = 0, y = 0) { this.x = x; this.y = y; },
          Vector3: Vec3,
          Euler: function () {},
          Raycaster: function () { this.setFromCamera = () => {}; this.intersectObjects = () => []; },
          Clock: function () { this.getDelta = () => 0.016; this.getElapsedTime = () => 1; },
          WebGLRenderer: function () {
            this.shadowMap = {};
            this.xr = { enabled: false };
            this.domElement = win.document.createElement('canvas');
            this.domElement.requestPointerLock = vi.fn();
            this.setSize = () => {};
            this.setPixelRatio = () => {};
            this.setAnimationLoop = () => {};
            this.render = () => {};
          },
        };
        win.THREE = new Proxy(threeBase, {
          get(target, prop) {
            if (prop in target) return target[prop];
            return function StubThree() {
              const obj = new Obj3();
              obj.scale = new Vec3(1, 1, 1);
              return obj;
            };
          },
        });
      },
    });

    expect(gwRaw).toContain('min-width:44px;min-height:44px');
    expect(gwRaw).toContain('prefers-reduced-motion: reduce');

    const toolbarBtns = gwDoc.querySelectorAll('#toolbar button.tool-slot');
    expect(toolbarBtns.length).toBe(8);
    expect(gwDoc.querySelectorAll('#toolbar div.tool-slot').length).toBe(0);
    expect(toolbarBtns[0].getAttribute('aria-pressed')).toBe('true');
    expect(toolbarBtns[0].getAttribute('aria-label')).toContain('Stone block');

    toolbarBtns[2].click();
    expect(toolbarBtns[2].getAttribute('aria-pressed')).toBe('true');
    expect(toolbarBtns[0].getAttribute('aria-pressed')).toBe('false');

    const measureBtn = gwDoc.getElementById('measure-slot');
    expect(measureBtn?.getAttribute('aria-pressed')).toBe('false');
    measureBtn.click();
    expect(measureBtn.getAttribute('aria-pressed')).toBe('true');

    // Escape closes open NPC dialog (IME-safe)
    const dialog = gwDoc.getElementById('npc-dialog');
    dialog.style.display = 'block';
    gwDoc.dispatchEvent(new gwWin.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(dialog.style.display).toBe('block');
    gwDoc.dispatchEvent(new gwWin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.style.display).toBe('none');

    await runAxe(gwDoc.body);

    // Speech Speed Check
    const { raw: spRaw, win: spWin, doc: spDoc } = loadPageDom('speech_device_test.html');
    expect(spRaw).toContain('min-height: 44px;');
    expect(spRaw).toContain('@media (forced-colors: active)');
    expect(spRaw).toContain('function allowedWorkerUrl');

    const bar = spDoc.getElementById('bar');
    expect(bar?.getAttribute('aria-valuetext')).toBe('0%: Not started.');
    spWin.setStatus('Checking device', 35);
    expect(bar.getAttribute('aria-valuetext')).toBe('35%: Checking device');

    const modelInput = spDoc.getElementById('device-model');
    modelInput.value = 'Chromebook 311';
    modelInput.dispatchEvent(new spWin.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(modelInput.value).toBe('Chromebook 311');
    modelInput.dispatchEvent(new spWin.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modelInput.value).toBe('');

    await runAxe(spDoc.body);
  });
});
