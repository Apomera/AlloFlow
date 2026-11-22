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

function loadPageDom(htmlFile, { execScripts = true, injectScripts = [], reducedMotion = false, fetchImpl = null, beforeParseExtra = null } = {}) {
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
      win.print = vi.fn();
      if (fetchImpl) win.fetch = fetchImpl;
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

describe('Other Resources Polish — Wave 27', () => {
  it('polishes Teacher Guide guide-search.js (IME-safe Escape, Reading Tools aria-valuetext, keyboard Reading Ruler, Escape close, polite status) with source parity and zero axe violations', async () => {
    const srcJs = readFileSync(resolve(process.cwd(), 'docs/teacher-guide/guide-search.js'), 'utf8');
    const pubJs = readFileSync(resolve(process.cwd(), 'guide/guide-search.js'), 'utf8');
    expect(pubJs).toBe(srcJs);
    expect(srcJs).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);

    const sampleIndex = [
      {
        title: 'STEAM Lab',
        chapter: 'STEAM Lab',
        section: 'Cloudflare links',
        href: 'steam-lab.html#cloudflare',
        snippet: 'Open any STEAM tool directly via Cloudflare Pages.',
        keywords: ['steam', 'cloudflare', 'physics'],
      },
    ];

    const { win, doc } = loadPageDom('guide/steam-lab.html', {
      injectScripts: ['guide/guide-search.js'],
      fetchImpl: vi.fn(async () => ({
        ok: true,
        json: async () => sampleIndex,
      })),
    });

    await new Promise((r) => setTimeout(r, 40));

    // IME-safe Escape clear on search input
    const searchInput = doc.querySelector('[data-guide-search-input]');
    expect(searchInput).toBeTruthy();
    searchInput.value = 'cloudflare';
    searchInput.dispatchEvent(new win.Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(searchInput.value).toBe('cloudflare');
    searchInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(searchInput.value).toBe('');

    // Reading tools bar & live aria-valuetext
    const toggle = doc.getElementById('rt-toggle');
    const panel = doc.getElementById('rtools-panel');
    const size = doc.getElementById('rt-size');
    const line = doc.getElementById('rt-line');
    const letter = doc.getElementById('rt-letter');
    const rulerBtn = doc.getElementById('rt-ruler');
    const resetBtn = doc.getElementById('rt-reset');
    const status = doc.getElementById('rt-status');

    expect(toggle).toBeTruthy();
    expect(panel?.getAttribute('role')).toBe('region');
    expect(panel?.getAttribute('aria-label')).toBe('Reading tools');
    expect(size?.getAttribute('aria-valuetext')).toBe('100% text size');
    expect(line?.getAttribute('aria-valuetext')).toBe('1.6 line spacing');
    expect(letter?.getAttribute('aria-valuetext')).toBe('Default letter spacing');
    expect(rulerBtn?.getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown');

    toggle.click();
    expect(panel.hasAttribute('hidden')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    size.value = '1.25';
    size.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(size.getAttribute('aria-valuetext')).toBe('125% text size');

    letter.value = '0.06';
    letter.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(letter.getAttribute('aria-valuetext')).toBe('+0.06 em letter spacing');

    // Reading ruler toggle + keyboard arrows + polite status
    rulerBtn.click();
    expect(rulerBtn.getAttribute('aria-pressed')).toBe('true');
    expect(doc.documentElement.getAttribute('data-allo-ruler')).toBe('1');
    await new Promise((r) => setTimeout(r, 35));
    expect(status?.textContent).toContain('Reading ruler on');

    const rulerEl = doc.getElementById('rtools-ruler');
    const topBefore = parseInt(rulerEl.style.top || '0', 10);
    rulerBtn.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const topAfter = parseInt(rulerEl.style.top || '0', 10);
    expect(topAfter).toBeGreaterThanOrEqual(topBefore);

    // Reset announces politely and resets sliders
    resetBtn.click();
    expect(size.getAttribute('aria-valuetext')).toBe('100% text size');
    expect(rulerBtn.getAttribute('aria-pressed')).toBe('false');
    await new Promise((r) => setTimeout(r, 35));
    expect(status?.textContent).toContain('Reading tools reset to defaults.');

    // IME-safe Escape closes panel and restores focus to #rt-toggle
    panel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(panel.hasAttribute('hidden')).toBe(false);
    panel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.hasAttribute('hidden')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(doc.activeElement).toBe(toggle);

    await runAxe(doc.body);
  });

  it('polishes manuals.html, manuals.css, and manuals.js with 44px controls, IME-safe Escape clear, Reset button, back-to-top toggle, and zero axe violations', async () => {
    const css = readFileSync(resolve(process.cwd(), 'manuals.css'), 'utf8');
    const js = readFileSync(resolve(process.cwd(), 'manuals.js'), 'utf8');
    expect(js).not.toContain('innerHTML');
    expect(css).toContain('min-height: 44px;');
    expect(css).toContain('.manual-reset-btn:focus-visible');
    expect(css).toContain('.manual-card a:focus-visible');

    const { win, doc } = loadPageDom('manuals.html', {
      injectScripts: ['manuals.js'],
    });

    const search = doc.querySelector('[data-manual-search]');
    const resetBtn = doc.querySelector('[data-manual-reset="true"]');
    const familiesBtn = doc.querySelector('[data-manual-filter="families"]');
    const status = doc.querySelector('[data-manual-status]');
    const backBtn = doc.querySelector('.back-to-top');

    expect(search).toBeTruthy();
    expect(resetBtn).toBeTruthy();
    expect(resetBtn.hidden).toBe(true);
    expect(doc.querySelectorAll('i[data-lucide]:not([aria-hidden="true"])').length).toBe(0);

    // Filter by audience shows Reset button
    familiesBtn.click();
    expect(familiesBtn.getAttribute('aria-pressed')).toBe('true');
    expect(resetBtn.hidden).toBe(false);

    // Search + IME-safe Escape clear
    search.value = 'coaster';
    search.dispatchEvent(new win.Event('input', { bubbles: true }));
    search.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(search.value).toBe('coaster');
    search.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(search.value).toBe('');

    // Reset restores All guides and focuses search
    resetBtn.click();
    expect(resetBtn.hidden).toBe(true);
    expect(doc.querySelector('[data-manual-filter="all"]').getAttribute('aria-pressed')).toBe('true');
    expect(status.textContent).toContain('all audiences');
    expect(doc.activeElement).toBe(search);

    // Back-to-top scroll visibility toggle
    expect(backBtn.classList.contains('visible')).toBe(false);
    Object.defineProperty(win, 'scrollY', { value: 650, configurable: true });
    win.dispatchEvent(new win.Event('scroll'));
    expect(backBtn.classList.contains('visible')).toBe(true);

    await runAxe(doc.body);
  });

  it('polishes educator-evaluation-manual.html, school-rewards-manual.html, and school-rewards-quick-cards.html with Reading Tools a11y, Print button, mirror parity, and zero axe violations', async () => {
    for (const file of ['educator-evaluation-manual.html', 'school-rewards-manual.html']) {
      const { raw, win, doc } = loadPageDom(file, {
        beforeParseExtra(w) {
          w.HTMLElement.prototype.getBoundingClientRect = function () {
            return { top: 80, height: this.id === 'rtools' ? (w.document.querySelector('#rtools-panel')?.hidden ? 48 : 176) : 24 };
          };
        },
      });
      expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/' + file), 'utf8')).toBe(raw);

      const toggle = doc.getElementById('rt-toggle');
      const panel = doc.getElementById('rtools-panel');
      const size = doc.getElementById('rt-size');
      const line = doc.getElementById('rt-line');
      const letter = doc.getElementById('rt-letter');
      const rulerBtn = doc.getElementById('rt-ruler');
      const resetBtn = doc.getElementById('rt-reset');
      const status = doc.getElementById('rt-status');

      expect(size.getAttribute('aria-valuetext')).toBe('100% text size');
      expect(line.getAttribute('aria-valuetext')).toBe('1.65 line spacing');
      expect(letter.getAttribute('aria-valuetext')).toBe('Default letter spacing');
      expect(status?.getAttribute('role')).toBe('status');

      toggle.click();
      expect(panel.hasAttribute('hidden')).toBe(false);
      if (file === 'school-rewards-manual.html') {
        expect(doc.documentElement.style.getPropertyValue('--reading-tools-height')).toBe('176px');
      }

      size.value = '1.3';
      size.dispatchEvent(new win.Event('input', { bubbles: true }));
      expect(size.getAttribute('aria-valuetext')).toBe('130% text size');

      rulerBtn.click();
      expect(status.textContent).toContain('Reading ruler on');

      resetBtn.click();
      expect(status.textContent).toContain('Reading tools reset to defaults.');
      expect(size.getAttribute('aria-valuetext')).toBe('100% text size');

      // IME-safe Escape closes Reading tools and returns focus to toggle
      panel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
      expect(panel.hasAttribute('hidden')).toBe(false);
      panel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(panel.hasAttribute('hidden')).toBe(true);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(doc.activeElement).toBe(toggle);
      if (file === 'school-rewards-manual.html') {
        expect(doc.documentElement.style.getPropertyValue('--reading-tools-height')).toBe('48px');
      }

      await runAxe(doc.body);
    }

    // Printable Quick Cards
    const { raw: qcRaw, win: qcWin, doc: qcDoc } = loadPageDom('school-rewards-quick-cards.html');
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/school-rewards-quick-cards.html'), 'utf8')).toBe(qcRaw);
    expect(qcRaw).toMatch(/\.card\{[^}]*break-inside:avoid/);
    expect(qcRaw).toMatch(/@media print\{\.card\{page-break-after:always\}.*\.no-print\{display:none !important;\}\}/);
    const printBtn = qcDoc.querySelector('.print-btn.no-print');
    expect(printBtn).toBeTruthy();
    expect(printBtn.textContent).toBe('Print quick cards');
    printBtn.click();
    expect(qcWin.print).toHaveBeenCalledTimes(1);
    await runAxe(qcDoc.body);
  });

  it('gives all 15 packets-*.html sub-pages a programmatically focusable main landmark while preserving strict CSP and zero axe violations', async () => {
    const packetPages = [
      'packets-about.html',
      'packets-check.html',
      'packets-it.html',
      'packets-make.html',
      'packets-math-practice.html',
      'packets-open.html',
      'packets-pictures.html',
      'packets-present-export.html',
      'packets-read-along.html',
      'packets-results.html',
      'packets-symbol-runner.html',
      'packets-verify.html',
      'packets-vocab-lookup.html',
      'packets-vocab.html',
      'packets-voice.html',
    ];

    for (const page of packetPages) {
      const html = readFileSync(resolve(process.cwd(), page), 'utf8');
      expect(html, page).toMatch(/<main\s+id="main"\s+tabindex="-1"/);
      expect(html, page).toContain('href="#main"');
      expect(html, page).toContain('http-equiv="Content-Security-Policy"');
      expect(html, page).not.toMatch(/<style[\s>]/i);
      expect(html, page).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
      expect(html, page).not.toMatch(/\son[a-z]+=/i);
    }

    for (const sample of ['packets-about.html', 'packets-it.html', 'packets-verify.html', 'packets-open.html', 'packets-results.html']) {
      const { doc } = loadPageDom(sample, { execScripts: false });
      const main = doc.getElementById('main');
      expect(main?.getAttribute('tabindex'), sample).toBe('-1');
      await runAxe(doc.body);
    }
  });
});
