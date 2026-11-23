import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const cleanups = [];

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
      iframes: false,
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

function loadPageDom(htmlFile, { injectScripts = [], beforeParseExtra = null } = {}) {
  const raw = readRepoFile(htmlFile);
  let html = raw
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  if (injectScripts.length) {
    const inlineTags = injectScripts
      .map((scriptPath) => `<script>${readRepoFile(scriptPath)}</script>`)
      .join('\n');
    html = html.replace(/<\/body>/i, (m) => `${inlineTags}\n${m}`);
  }
  const dom = new JSDOM(html, {
    url: 'https://alloflow-cdn.pages.dev/' + htmlFile,
    runScripts: injectScripts.length ? 'dangerously' : undefined,
    beforeParse(win) {
      win.matchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      win.scrollTo = vi.fn();
      win.HTMLElement.prototype.scrollIntoView = vi.fn();
      win.requestAnimationFrame = () => 1;
      win.cancelAnimationFrame = () => {};
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

describe('Other resources polish wave 35 (AlloPack Library, Shared Site Shell, About/Wave3 Shell, Packets Voice)', () => {
  it('polishes allopack-library.css and allopack-library.js across mirrors with flex 44px links, reduced-motion, forced-colors, IME-safe Escape clear & copy-fallback dismiss, and 0 axe violations', async () => {
    const css = assertMirrorsMatch('allopack-library.css');
    assertMirrorsMatch('allopack-library.js');

    expect(css).toContain('.pack-filters button, .pack-actions button, .pack-actions a { display:inline-flex; align-items:center; justify-content:center; min-height:44px;');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('@media(forced-colors:active)');
    expect(css).toContain('.pack-directory :focus-visible { outline:3px solid Highlight !important; outline-offset:3px !important; }');

    const { win, doc } = loadPageDom('library.html', {
      injectScripts: ['allopack-library.js'],
      beforeParseExtra(w) {
        Object.defineProperty(w.navigator, 'clipboard', { value: undefined, configurable: true });
      },
    });

    const search = doc.getElementById('pack-search');
    const status = doc.getElementById('pack-copy-status');
    const form = doc.getElementById('pack-filters');
    expect(form.hidden).toBe(false);

    search.value = 'fractions';
    search.dispatchEvent(new win.Event('input', { bubbles: true }));

    // IME-composed Escape must NOT clear search
    const imeEsc = new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    search.dispatchEvent(imeEsc);
    expect(search.value).toBe('fractions');

    // Real Escape clears search and announces politely
    search.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(search.value).toBe('');
    expect(status.textContent).toBe('Search cleared.');

    // Reset announces politely
    form.dispatchEvent(new win.Event('reset', { bubbles: true }));
    expect(status.textContent).toBe('Filters cleared.');

    // Copy fallback opens when clipboard unavailable and closes on IME-safe Escape returning focus to button
    const copyBtn = doc.querySelector('[data-copy-pack]');
    expect(copyBtn).not.toBeNull();
    copyBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    const fallback = copyBtn.closest('.pack-version').querySelector('.pack-copy-fallback');
    expect(fallback.hidden).toBe(false);
    const fbInput = fallback.querySelector('input');
    const imeFbEsc = new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeFbEsc, 'isComposing', { value: true });
    fbInput.dispatchEvent(imeFbEsc);
    expect(fallback.hidden).toBe(false);

    fbInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(fallback.hidden).toBe(true);
    expect(doc.activeElement).toBe(copyBtn);

    await runAxe(doc.body);
  });

  it('polishes shared.css and site.js (zero outline:none, 44px nav/footer/pills, darkened AA contrast, forced-colors, aria-hidden copy textarea) with 0 axe violations on about.html', async () => {
    const sharedCss = readRepoFile('shared.css');
    const siteJs = readRepoFile('site.js');

    expect(sharedCss).not.toContain('outline: none');
    expect(sharedCss).toContain('#main-content:focus-visible');
    expect(sharedCss).toMatch(/\.skip-link\s*\{[^}]*min-height:\s*44px/);
    expect(sharedCss).toMatch(/\.nav-logo\s*\{[^}]*min-height:\s*44px/);
    expect(sharedCss).toMatch(/\.nav-links a\s*\{[^}]*min-height:\s*44px/);
    expect(sharedCss).toMatch(/\.nav-links \.sponsor-btn\s*\{[^}]*min-height:\s*44px/);
    expect(sharedCss).toMatch(/\.jump-pill\s*\{[^}]*min-height:\s*44px/);
    expect(sharedCss).toMatch(/\.footer-links a\s*\{[^}]*min-height:\s*44px/);
    expect(sharedCss).toMatch(/\.mobile-nav a\s*\{[^}]*min-height:\s*44px/);
    expect(sharedCss).not.toContain('color: #64748b;');
    expect(sharedCss).toContain('outline: 3px solid Highlight !important;');

    expect(siteJs).toContain("area.setAttribute('aria-hidden', 'true');");
    expect(siteJs).toContain('area.tabIndex = -1;');

    const { doc } = loadPageDom('about.html', { injectScripts: ['site.js'] });
    await runAxe(doc.body);
  });

  it('polishes about.css and promotion-wave3-shell.css with 44px links, high-contrast dark-section focus ring, reduced-motion, and forced-colors', () => {
    const aboutCss = readRepoFile('about.css');
    const shellCss = readRepoFile('promotion-wave3-shell.css');

    expect(aboutCss).toMatch(/\.about-card > a\s*\{[^}]*min-height:\s*44px/);
    expect(aboutCss).toContain('.about-section--dark :focus-visible');
    expect(aboutCss).toContain('outline: 3px solid #fbbf24;');
    expect(aboutCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(aboutCss).toContain('outline: 3px solid Highlight !important;');

    expect(shellCss).toMatch(/\.footer-link-group a\s*\{[^}]*min-height:\s*44px/);
    expect(shellCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(shellCss).toContain('.footer-link-heading');
  });

  it('polishes packets-voice.js with aria-valuetext on progress bar, aria-busy on async controls, IME-safe Escape stop during synthesis, and 0 axe violations on packets-voice.html', async () => {
    let capturedSignal = null;
    let resolveSpeak = null;
    let resolveGet = null;
    let capturedProgress = null;

    const { win, doc } = loadPageDom('packets-voice.html', {
      injectScripts: ['packets-voice.js'],
      beforeParseExtra(w) {
        w.AlloPacketMyWords = {
          available: () => Promise.resolve(true),
          getMany: () => Promise.resolve({}),
          put: () => Promise.resolve(),
        };
        w.AlloPacketVoiceEngine = {
          get: (cb) => {
            capturedProgress = cb;
            return new Promise((res) => { resolveGet = res; });
          },
          speak: (_word, _voice, opts) => {
            capturedSignal = opts.signal;
            return new Promise((res, rej) => {
              resolveSpeak = { res, rej };
            });
          },
          wavMs: () => 400,
          toDataUri: () => 'data:audio/wav;base64,AA==',
        };
      },
    });

    await new Promise((r) => setTimeout(r, 20));
    const getVoiceBtn = doc.getElementById('get-voice');
    const makeAllBtn = doc.getElementById('make-all');
    const voiceBar = doc.getElementById('voice-bar');
    const wordsBox = doc.getElementById('f-words');

    wordsBox.value = 'quokka';
    wordsBox.dispatchEvent(new win.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));

    getVoiceBtn.click();
    expect(getVoiceBtn.getAttribute('aria-busy')).toBe('true');
    capturedProgress({ stage: 'Downloading voice', pct: 0.42 });
    expect(voiceBar.getAttribute('aria-valuetext')).toBe('Downloading voice: 42 percent');

    resolveGet();
    await new Promise((r) => setTimeout(r, 20));
    expect(getVoiceBtn.getAttribute('aria-busy')).toBe('false');
    expect(makeAllBtn.disabled).toBe(false);

    makeAllBtn.click();
    await new Promise((r) => setTimeout(r, 10));
    expect(makeAllBtn.getAttribute('aria-busy')).toBe('true');
    expect(capturedSignal.aborted).toBe(false);

    // IME-composed Escape must NOT abort synthesis
    const imeEsc = new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    doc.dispatchEvent(imeEsc);
    expect(capturedSignal.aborted).toBe(false);

    // Real Escape aborts synthesis cleanly
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(capturedSignal.aborted).toBe(true);
    const abortErr = new Error('Stopped');
    abortErr.name = 'AbortError';
    resolveSpeak.rej(abortErr);
    await new Promise((r) => setTimeout(r, 30));
    expect(makeAllBtn.getAttribute('aria-busy')).toBe('false');

    await runAxe(doc.body);
  });
});
