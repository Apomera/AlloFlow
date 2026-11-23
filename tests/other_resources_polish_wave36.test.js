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

async function loadPageDom(htmlFile, { injectScripts = [], stripInlineScripts = false } = {}) {
  const raw = readRepoFile(htmlFile);
  let html = raw
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  if (stripInlineScripts) {
    html = html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '');
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
    },
  });
  if (dom.window.document.readyState === 'loading') {
    await new Promise((res) => dom.window.document.addEventListener('DOMContentLoaded', res, { once: true }));
  }
  for (const scriptPath of injectScripts) {
    dom.window.eval(readRepoFile(scriptPath));
  }
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

describe('Other resources polish wave 36 (Tool Finder & Kitchen Studio CSS Trio)', () => {
  it('polishes tool-finder.css and tool-finder-core.js with AA contrast, 44px targets, dark-section amber focus ring, styled .home-tool-empty, IME-safe Escape clear, and 0 axe violations on tools.html', async () => {
    const css = readRepoFile('tool-finder.css');

    expect(css).not.toContain('color:#64748b');
    expect(css).not.toContain('color:#6366f1');
    expect(css).toMatch(/\.tool-clear-button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.tool-launch-link,\.tool-detail-link\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.tool-card-actions\{[^}]*flex-wrap:wrap/);
    expect(css).toMatch(/\.tool-access-card a\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.home-tool-form button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.home-tool-all-link\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.tool-feedback-link\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.home-tool-empty\s*\{[^}]*color:\s*#f8fafc/);
    expect(css).toContain('.home-tool-finder-section :focus-visible');
    expect(css).toContain('outline: 3px solid #fbbf24;');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('outline: 3px solid Highlight !important;');

    // Full finder on tools.html (strip inline scripts to exercise tool-finder-core.js directly)
    const { win, doc } = await loadPageDom('tools.html', {
      stripInlineScripts: true,
      injectScripts: ['tool-catalog-data.js', 'tool-finder-core.js'],
    });
    const search = doc.getElementById('toolSearch');
    const count = doc.getElementById('toolResultCount');
    const initialCount = count.textContent;
    expect(initialCount).toMatch(/\d+ tools found/);

    search.value = 'chemistry';
    search.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(count.textContent).not.toBe(initialCount);

    // IME composition Escape must NOT clear search
    const imeEsc = new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    search.dispatchEvent(imeEsc);
    expect(search.value).toBe('chemistry');

    const ime229Esc = new win.KeyboardEvent('keydown', { key: 'Escape', keyCode: 229, bubbles: true, cancelable: true });
    search.dispatchEvent(ime229Esc);
    expect(search.value).toBe('chemistry');

    // Real Escape clears search and restores full catalog
    search.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(search.value).toBe('');
    expect(count.textContent).toBe(initialCount);

    await runAxe(doc.body);

    // Compact homepage finder on index.html
    const home = await loadPageDom('index.html', {
      stripInlineScripts: true,
      injectScripts: ['tool-catalog-data.js', 'tool-finder-core.js'],
    });
    const homeSearch = home.doc.getElementById('homeToolSearch');
    const homeResults = home.doc.getElementById('homeToolResults');
    expect(homeResults.querySelectorAll('.home-tool-result').length).toBeGreaterThan(0);

    homeSearch.value = 'zzznomatchtoolzzz';
    homeSearch.dispatchEvent(new home.win.Event('input', { bubbles: true }));
    expect(homeResults.querySelector('.home-tool-empty')).not.toBeNull();

    // IME Escape does not clear homepage search
    const homeImeEsc = new home.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(homeImeEsc, 'isComposing', { value: true });
    homeSearch.dispatchEvent(homeImeEsc);
    expect(homeSearch.value).toBe('zzznomatchtoolzzz');

    // Real Escape clears homepage search and restores featured tools
    homeSearch.dispatchEvent(new home.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(homeSearch.value).toBe('');
    expect(homeResults.querySelector('.home-tool-empty')).toBeNull();
    expect(homeResults.querySelectorAll('.home-tool-result').length).toBeGreaterThan(0);
  });

  it('polishes stem_lab/kitchen_studio/recipe_lab_workspace.css across all 3 mirrors (eliminates FOCUS-001 outline:none, lifts 10 controls to 44px, expands reduced-motion)', () => {
    const css = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_workspace.css');

    expect(css).not.toContain('outline:none');
    expect(css).toContain('#recipeScene canvas{outline:2px solid transparent}');
    expect(css).toContain('#recipeScene canvas:focus-visible{outline:3px solid #9b4a0d;outline-offset:-3px}');
    expect(css).toContain('#recipeScene canvas:focus-visible{outline-color:Highlight}');
    expect(css).toMatch(/\.kitchen-tool-groups button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.scene-direct-tools \.kitchen-tool-options select\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.kitchen-tool-options button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.scene-direct-tools>details summary\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.camera-row button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.scene-heat-control select\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.oil-measure-panel input\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.sample-reading-panel button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.utensil-rack-panel summary\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.object-pickup-panel summary\{[^}]*min-height:44px/);
    expect(css).toContain('@media(prefers-reduced-motion:reduce){#expandedKitchen::backdrop{backdrop-filter:none}body,body *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}');
  });

  it('polishes stem_lab/kitchen_studio/recipe_lab.css across all 3 mirrors (lifts 6 controls to 44px and adds prefers-reduced-motion)', () => {
    const css = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab.css');

    expect(css).toMatch(/\.lab-nav a\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.monitor-vessels button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.recipe-replay input\[type=range\]\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.bench-scale input\[type=range\]\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.cut-board-panel input\[type=range\]\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.compare-decision input\{[^}]*min-height:44px/);
    expect(css).toContain('@media(prefers-reduced-motion:reduce){body,body *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}');
  });

  it('polishes stem_lab/kitchen_studio/kitchen_studio_touch.css across all 3 mirrors (lifts disclosure summaries to 44px, adds focus-visible, reduced-motion, and forced-colors focus)', () => {
    const css = assertMirrorsMatch('stem_lab/kitchen_studio/kitchen_studio_touch.css');

    expect(css).toMatch(/\.studio-keyboard summary\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.studio-feedback summary\{[^}]*min-height:44px/);
    expect(css).toContain('.studio-touch :is(button,a,select,input,summary):focus-visible{outline:3px solid #245c42;outline-offset:2px}');
    expect(css).toContain('@media(prefers-reduced-motion:reduce){.studio-touch,.studio-touch *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}');
    expect(css).toContain('@media(forced-colors:active){.studio-touch :is(button,a,select,input,summary):focus-visible{outline-color:Highlight}}');
  });
});
