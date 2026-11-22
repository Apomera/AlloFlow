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

function loadPageDom(htmlFile, { execScripts = true, reducedMotion = false, fetchImpl = null } = {}) {
  const raw = readFileSync(resolve(process.cwd(), htmlFile), 'utf8');
  const html = raw.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
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
      if (fetchImpl) win.fetch = fetchImpl;
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

describe('Other Resources Polish — Wave 26', () => {
  it('polishes library.html and allopack-library.css with 44px controls, semantic card h3s, IME-safe Escape clear, hidden icons, mirror parity, and zero axe violations', async () => {
    const { raw, win, doc } = loadPageDom('library.html');
    const css = readFileSync(resolve(process.cwd(), 'allopack-library.css'), 'utf8');
    expect(raw).toContain('min-height: 44px;');
    expect(raw).toContain('.filter-btn:focus-visible');
    expect(css).toContain('min-height:44px');
    expect(doc.querySelectorAll('i[data-lucide]:not([aria-hidden="true"])').length).toBe(0);
    expect(doc.querySelectorAll('#cards-container .lesson-card h2').length).toBe(3);

    // Filter legacy sample projects
    const stemBtn = doc.querySelector('#filters button[data-category="stem"]');
    expect(stemBtn).toBeTruthy();
    stemBtn.click();
    expect(stemBtn.getAttribute('aria-pressed')).toBe('true');
    expect(doc.getElementById('library-results')?.textContent).toContain('Showing 1 of 3');

    // IME-safe Escape clear on #pack-search
    const searchInput = doc.getElementById('pack-search');
    expect(searchInput).toBeTruthy();
    searchInput.value = 'water';
    searchInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(searchInput.value).toBe('water');
    searchInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(searchInput.value).toBe('');

    // Mirror parity with desktop/web-app/public
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/library.html'), 'utf8')).toBe(raw);
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/allopack-library.css'), 'utf8')).toBe(css);

    // Run live axe on header + legacy filter/grid + footer (and sample of directory)
    const sampleHost = document.createElement('div');
    const header = doc.querySelector('header.section')?.cloneNode(true);
    const legacySection = doc.getElementById('lesson-grid')?.cloneNode(true);
    const filterSection = doc.getElementById('filters')?.closest('section')?.cloneNode(true);
    if (header) sampleHost.appendChild(header);
    if (filterSection) sampleHost.appendChild(filterSection);
    if (legacySection) sampleHost.appendChild(legacySection);
    document.body.appendChild(sampleHost);
    cleanups.push(() => sampleHost.remove());
    await runAxe(sampleHost);
  });

  it('polishes features.html with fixed dark sticky CTA contrast, 86+ hidden decorative icons, reduced-motion reveal, active jump-nav, and zero axe violations', async () => {
    const { raw, doc } = loadPageDom('features.html', { reducedMotion: true });
    expect(doc.querySelectorAll('i[data-lucide]:not([aria-hidden="true"])').length).toBe(0);
    expect(doc.querySelectorAll('.reveal.visible').length).toBe(doc.querySelectorAll('.reveal').length);

    // Sticky CTA dark-surface contrast fixed (#cbd5e1 on dark slate, not #475569)
    const stickyHtml = doc.getElementById('stickyCta')?.innerHTML || '';
    expect(stickyHtml).toContain('#cbd5e1');
    expect(stickyHtml).not.toContain('color:#475569');
    expect(raw).toContain('.sticky-cta a:focus-visible');

    // Jump-nav sets aria-current="location"
    const stemPill = doc.querySelector('.jump-nav a[href="#stem"]');
    expect(stemPill).toBeTruthy();
    stemPill.click();
    expect(stemPill.getAttribute('aria-current')).toBe('location');
    expect(doc.getElementById('stem')?.innerHTML).toContain('tools.html#directory-heading');

    await runAxe(doc.body);
  }, 15000);

  it('polishes ways-to-use.html and whitepaper.html with hidden icons, focusable table ring, TOC active location tracking, and zero axe violations', async () => {
    // 1) ways-to-use.html
    const ways = loadPageDom('ways-to-use.html');
    expect(ways.doc.querySelectorAll('i[data-lucide]:not([aria-hidden="true"])').length).toBe(0);
    expect(ways.raw).toContain('.comparison-wrap:focus-visible');
    expect(ways.doc.body.innerHTML).toContain('tools.html#directory-heading');
    await runAxe(ways.doc.body);

    // 2) whitepaper.html
    const wp = loadPageDom('whitepaper.html');
    expect(wp.doc.querySelectorAll('i[data-lucide]:not([aria-hidden="true"])').length).toBe(0);
    expect(wp.doc.querySelector('.paper-flow')?.getAttribute('role')).toBe('region');
    expect(wp.doc.querySelector('.paper-flow')?.getAttribute('aria-label')).toBeTruthy();
    const tocLink = wp.doc.querySelector('.paper-toc a[href="#architecture"]');
    expect(tocLink).toBeTruthy();
    tocLink.click();
    expect(tocLink.getAttribute('aria-current')).toBe('location');
    await runAxe(wp.doc.body);
  });

  it('polishes about.html (restoring scroll Back to Top + reduced motion) and changelog.html (semantic h2s, IME-safe search filter, Retry on error) with zero axe violations', async () => {
    // 1) about.html
    const about = loadPageDom('about.html', { reducedMotion: true });
    expect(about.doc.querySelectorAll('i[data-lucide]:not([aria-hidden="true"])').length).toBe(0);
    expect(about.doc.body.innerHTML).toContain('tools.html#directory-heading');
    Object.defineProperty(about.win, 'scrollY', { configurable: true, value: 700 });
    about.win.dispatchEvent(new about.win.Event('scroll'));
    expect(about.doc.querySelector('.back-to-top')?.classList.contains('visible')).toBe(true);
    await runAxe(about.doc.body);

    // 2) changelog.html — test transient error + Retry recovery + search filter + IME Escape
    let callCount = 0;
    const mockFetch = vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Offline test'));
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([
          { version: '1.19', released: '2026-11-10', notes: 'STEAM Cloudflare links and accessibility polish.' },
          { version: '1.18', released: '2026-10-01', notes: 'Dynamic Assessment Studio improvements.' },
        ])),
      });
    });

    const cl = loadPageDom('changelog.html', { fetchImpl: mockFetch });
    if (cl.doc.readyState === 'loading') {
      await new Promise((r) => cl.doc.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    await new Promise((r) => setTimeout(r, 30));

    // Error state exposes 44px Retry button
    const retryBtn = cl.doc.getElementById('retry-releases-btn');
    expect(retryBtn).toBeTruthy();
    retryBtn.click();
    await new Promise((r) => setTimeout(r, 30));

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(cl.doc.querySelectorAll('#list h2.version').length).toBe(2);
    expect(cl.doc.getElementById('filter-bar')?.hidden).toBe(false);

    // Filter releases live & test IME-safe Escape clear
    const search = cl.doc.getElementById('release-search');
    search.value = 'STEAM';
    search.dispatchEvent(new cl.win.Event('input', { bubbles: true }));
    expect(cl.doc.querySelectorAll('#list li.release').length).toBe(1);
    expect(cl.doc.getElementById('release-filter-status')?.textContent).toContain('Showing 1 of 2');

    search.dispatchEvent(new cl.win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(search.value).toBe('STEAM');
    search.dispatchEvent(new cl.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(search.value).toBe('');
    expect(cl.doc.querySelectorAll('#list li.release').length).toBe(2);

    await runAxe(cl.doc.body);
  });
});
