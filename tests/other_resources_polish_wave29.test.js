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
    url: 'https://apomera.github.io/AlloFlow/' + htmlFile,
    runScripts: execScripts ? 'dangerously' : undefined,
    beforeParse(win) {
      win.matchMedia = vi.fn((q) => ({
        matches: reducedMotion && String(q).includes('prefers-reduced-motion'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      win.scrollTo = vi.fn();
      win.print = vi.fn();
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

describe('Other Resources Polish — Wave 29', () => {
  it('polishes all 5 STEM Teacher Manuals (tool-manual.js, tool-manual.css, fixed EvoLab Cloudflare slug, Copy link, Print, Reading Tools, TOC tracking) with zero axe violations', async () => {
    const js = readFileSync(resolve(process.cwd(), 'tool-manual.js'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'tool-manual.css'), 'utf8');
    const redirects = readFileSync(resolve(process.cwd(), '_redirects'), 'utf8');

    expect(js).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
    expect(css).toContain('.manual-copy-btn');
    expect(css).toContain('.manual-print-btn');
    expect(css).toContain('min-height: 44px;');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (forced-colors: active)');

    const manuals = [
      ['manual-coaster-lab.html', 'coaster-lab'],
      ['manual-water-cycle.html', 'water-cycle'],
      ['manual-evo-lab.html', 'evo-lab'],
      ['manual-solar-system.html', 'solar-system'],
      ['manual-kitchen-lab.html', 'kitchen-lab'],
    ];

    for (const [file, slug] of manuals) {
      const html = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(html, file).toContain('<main id="manual-main" tabindex="-1" class="manual-page">');
      expect(html, file).toContain('<script src="tool-manual.js" defer></script>');
      expect(html, file).toContain('https://alloflow-cdn.pages.dev/' + slug);
      expect(new RegExp('^/' + slug + '\\s', 'm').test(redirects), file + ' slug in _redirects').toBe(true);
    }

    for (const [file, slug] of [['manual-coaster-lab.html', 'coaster-lab'], ['manual-evo-lab.html', 'evo-lab']]) {
      const writeText = vi.fn(async () => {});
      const { win, doc } = loadPageDom(file, {
        injectScripts: ['tool-manual.js'],
        beforeParseExtra(w) {
          Object.defineProperty(w.navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
          });
        },
      });
      doc.dispatchEvent(new win.Event('DOMContentLoaded'));

      // 1-Click Copy Cloudflare link
      const copyBtn = doc.querySelector('.manual-copy-btn');
      const copyStatus = doc.querySelector('.manual-copy-status');
      expect(copyBtn).toBeTruthy();
      expect(copyStatus?.getAttribute('role')).toBe('status');
      copyBtn.click();
      await new Promise((r) => setTimeout(r, 20));
      expect(writeText).toHaveBeenCalledWith('https://alloflow-cdn.pages.dev/' + slug);
      expect(copyStatus.textContent).toContain('https://alloflow-cdn.pages.dev/' + slug);

      // Print button
      const printBtn = doc.querySelector('.manual-print-btn');
      expect(printBtn).toBeTruthy();
      printBtn.click();
      expect(win.print).toHaveBeenCalledTimes(1);

      // Reading Tools
      const toggle = doc.getElementById('rt-toggle');
      const panel = doc.getElementById('rtools-panel');
      const size = doc.getElementById('rt-size');
      const rulerBtn = doc.getElementById('rt-ruler');
      const resetBtn = doc.getElementById('rt-reset');
      const status = doc.getElementById('rt-status');

      expect(size?.getAttribute('aria-valuetext')).toBe('100% text size');
      toggle.click();
      expect(panel.hasAttribute('hidden')).toBe(false);

      size.value = '1.25';
      size.dispatchEvent(new win.Event('input', { bubbles: true }));
      expect(size.getAttribute('aria-valuetext')).toBe('125% text size');

      rulerBtn.click();
      expect(status?.textContent).toContain('Reading ruler on');
      resetBtn.click();
      expect(status?.textContent).toContain('Reading tools reset to defaults.');

      // IME-safe Escape closes Reading Tools and returns focus to #rt-toggle
      panel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
      expect(panel.hasAttribute('hidden')).toBe(false);
      panel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(panel.hasAttribute('hidden')).toBe(true);
      expect(doc.activeElement).toBe(toggle);

      // Active TOC link marked
      expect(doc.querySelector('.manual-toc a[aria-current="location"]')).toBeTruthy();

      await runAxe(doc.body);
    }
  });

  it('polishes docs/dynamic_assessment_guide.html (no-referrer, dark/print themes, 44px Print guide, Reading Tools a11y, TOC tracking, mirror parity) with zero axe violations', async () => {
    const { raw, win, doc } = loadPageDom('docs/dynamic_assessment_guide.html');
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/docs/dynamic_assessment_guide.html'), 'utf8')).toBe(raw);
    expect(raw).toContain('<meta name="referrer" content="no-referrer">');
    expect(raw).toContain('@media (prefers-color-scheme:dark)');
    expect(raw).toContain('@media print');
    expect(raw).toContain('<span aria-hidden="true">🔬</span>');

    const printBtn = doc.querySelector('.print-btn.no-print');
    expect(printBtn).toBeTruthy();
    printBtn.click();
    expect(win.print).toHaveBeenCalledTimes(1);

    const toggle = doc.getElementById('rt-toggle');
    const panel = doc.getElementById('rtools-panel');
    const size = doc.getElementById('rt-size');
    const line = doc.getElementById('rt-line');
    const letter = doc.getElementById('rt-letter');
    const rulerBtn = doc.getElementById('rt-ruler');
    const resetBtn = doc.getElementById('rt-reset');
    const status = doc.getElementById('rt-status');

    expect(size?.getAttribute('aria-valuetext')).toBe('100% text size');
    expect(line?.getAttribute('aria-valuetext')).toBe('1.65 line spacing');
    expect(letter?.getAttribute('aria-valuetext')).toBe('Default letter spacing');

    toggle.click();
    expect(panel.hasAttribute('hidden')).toBe(false);
    rulerBtn.click();
    expect(status.textContent).toContain('Reading ruler on');
    resetBtn.click();
    expect(status.textContent).toContain('Reading tools reset to defaults.');

    panel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(panel.hasAttribute('hidden')).toBe(false);
    panel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.hasAttribute('hidden')).toBe(true);
    expect(doc.activeElement).toBe(toggle);
    expect(doc.querySelector('.toc a[aria-current="location"]')).toBeTruthy();

    await runAxe(doc.body);
  });

  it('polishes apps_script/school_rewards/Portal.html (44px touch targets, IME-safe Help Escape, IME-safe Escape clear on search inputs, mirror parity) with zero axe violations', async () => {
    const portalRaw = readFileSync(resolve(process.cwd(), 'apps_script/school_rewards/Portal.html'), 'utf8');
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/apps_script/school_rewards/Portal.html'), 'utf8')).toBe(portalRaw);
    expect(portalRaw).toContain('.help-btn{min-height:44px;');
    expect(portalRaw).toContain('.lang-wrap select{margin:0;width:auto;min-height:44px;');
    expect(portalRaw).toContain('.admin-index a{display:inline-flex;align-items:center;font-size:12px;font-weight:800;padding:8px 12px;min-height:44px;');
    expect(portalRaw).toContain('.section-toggle{float:right;font-size:12px;min-height:44px;');
    expect(portalRaw).toContain('#notice button{margin-left:10px;min-height:44px;');

    const wrappedHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>School Rewards Portal</title></head><body>${portalRaw}</body></html>`;
    const bootstrapPayload = {
      schoolName: 'Pine Ridge Elementary',
      academicYear: '2026-27',
      actor: { email: 'admin@school.example', role: 'admin', displayName: 'Principal Rivera' },
      students: [
        { id: 'stu-1', firstName: 'Ava', lastInitial: 'R', grade: '4', homeroom: '4A', active: true, availableBalance: 25, refCode: 'A4A' },
        { id: 'stu-2', firstName: 'Leo', lastInitial: 'M', grade: '5', homeroom: '5B', active: true, availableBalance: 40, refCode: 'L5B' },
      ],
      categories: [{ id: 'cat-1', name: 'Collaboration', active: true, description: 'Working together respectfully.' }],
      catalog: [{ id: 'item-1', name: 'Homework Pass', cost: 20, active: true, inventoryLimit: -1, remaining: -1 }],
      windows: [{ id: 'win-1', name: 'Fall Store', status: 'OPEN', startsAt: '2026-01-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z' }],
      members: [{ email: 'admin@school.example', role: 'admin', active: true }],
      recentLedger: [],
      recentOrders: [],
    };

    const dom = new JSDOM(wrappedHtml, {
      url: 'https://script.google.com/macros/s/test/exec',
      runScripts: 'dangerously',
      beforeParse(win) {
        const makeRunner = (onOk, onErr) => new Proxy({}, {
          get(_t, prop) {
            if (prop === 'withSuccessHandler') return (fn) => makeRunner(fn, onErr);
            if (prop === 'withFailureHandler') return (fn) => makeRunner(onOk, fn);
            return () => {
              if (prop === 'getSchoolRewardsBootstrap' && onOk) {
                setTimeout(() => onOk(bootstrapPayload), 0);
              }
            };
          },
        });
        win.google = { script: { run: makeRunner(null, null) } };
        win.scrollTo = vi.fn();
      },
    });
    cleanups.push(() => { dom.window.close(); });

    await new Promise((r) => setTimeout(r, 30));

    const { window: win } = dom;
    const doc = win.document;

    // Help panel IME-safe Escape
    const helpToggle = doc.getElementById('help-toggle');
    const helpPanel = doc.getElementById('help-panel');
    helpToggle.click();
    expect(helpPanel.hidden).toBe(false);
    helpPanel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(helpPanel.hidden).toBe(false);
    helpPanel.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(helpPanel.hidden).toBe(true);
    expect(doc.activeElement).toBe(helpToggle);

    // Search inputs IME-safe Escape clear
    for (const id of ['award-student-search', 'checkout-student-search', 'catalog-search']) {
      const input = doc.getElementById(id);
      expect(input, id).toBeTruthy();
      input.value = 'Ava';
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
      input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
      expect(input.value, id + ' keeps value during IME').toBe('Ava');
      input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(input.value, id + ' clears on Escape').toBe('');
    }

    await runAxe(doc.body);
  });
});
