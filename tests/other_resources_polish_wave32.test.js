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

function loadPageDom(htmlFile, { execScripts = true, injectScripts = [], beforeParseExtra = null, urlPath = null } = {}) {
  const raw = readRepoFile(htmlFile);
  let html = raw
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  if (injectScripts.length) {
    const inlineTags = injectScripts
      .map((scriptPath) => `<script>${readRepoFile(scriptPath)}</script>`)
      .join('\n');
    if (/<script\b/i.test(html)) {
      html = html.replace(/<script\b/i, (m) => `${inlineTags}\n${m}`);
    } else {
      html = html.replace(/<\/body>/i, (m) => `${inlineTags}\n${m}`);
    }
  }
  const dom = new JSDOM(html, {
    url: 'https://alloflow-cdn.pages.dev/' + (urlPath || htmlFile),
    runScripts: execScripts ? 'dangerously' : undefined,
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

describe('Other Resources Polish — Wave 32', () => {
  it('polishes Molecule Shelf (44px controls, hidden heading emoji, IME-safe tab nav & askInput Escape) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('molecule_shelf/molecule_shelf.html');
    expect(src).toContain('header select { margin-left: auto; background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; min-height: 44px;');
    expect(src).toContain('.steps button { flex: 1; background: var(--panel2); color: var(--dim); border: 1px solid var(--line); border-radius: 8px; padding: 8px 4px; min-height: 44px;');
    expect(src).toContain('button.go { background: var(--accent2); color: var(--btn-fg); border: 1px solid transparent; border-radius: 8px; padding: 10px 14px; min-height: 44px;');
    expect(src).toContain('.backbar button { background: var(--backbar-bg); color: var(--backbar-fg); border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; min-height: 44px;');
    expect(src).toContain('.ra-toggle { display: inline-flex; align-items: center; gap: 4px; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--dim); cursor: pointer; min-height: 44px; }');
    expect(src).toContain('<h1><span aria-hidden="true">🧬 </span>Molecule Shelf</h1>');

    const { win, doc } = loadPageDom('molecule_shelf/molecule_shelf.html');

    // Open a structure to exercise tab IME guard & askInput Escape clear
    const firstCard = doc.querySelector('#pickerGrid button.simcard');
    expect(firstCard).toBeTruthy();
    firstCard.click();

    const tabNotice = doc.getElementById('tabNotice');
    const tabWonder = doc.getElementById('tabWonder');
    expect(tabNotice.getAttribute('aria-selected')).toBe('true');

    tabNotice.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', isComposing: true, bubbles: true }));
    expect(tabNotice.getAttribute('aria-selected')).toBe('true');
    tabNotice.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabWonder.getAttribute('aria-selected')).toBe('true');

    const askInput = doc.getElementById('askInput');
    askInput.value = 'Where is the binding pocket?';
    askInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(askInput.value).toBe('Where is the binding pocket?');
    askInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(askInput.value).toBe('');

    await runAxe(doc.body);
  });

  it('polishes Sim Shelf (contrast --dim, 44px controls, IME-safe tab navigation) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('sim_shelf/sim_shelf.html');
    expect(src).toContain('--text: #e2e8f0; --dim: #cbd5e1;');
    expect(src).toContain('min-height: 44px;');
    expect(src).toContain('if (e.isComposing || e.keyCode === 229) return;');

    const { win, doc } = loadPageDom('sim_shelf/sim_shelf.html');
    const firstSim = doc.querySelector('#pickerGrid button.simcard');
    expect(firstSim).toBeTruthy();
    firstSim.click();

    const tabPredict = doc.getElementById('tabPredict');
    const tabExplore = doc.getElementById('tabExplore');
    expect(tabPredict.getAttribute('aria-selected')).toBe('true');

    tabPredict.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', isComposing: true, bubbles: true }));
    expect(tabPredict.getAttribute('aria-selected')).toBe('true');
    tabPredict.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabExplore.getAttribute('aria-selected')).toBe('true');

    await runAxe(doc.body);
  });

  it('polishes Timeline Studio (contrast --dim, 44px controls, hidden decorative icons, IME-safe Enter submit, Escape close, Tab trap) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('timeline_studio/timeline_studio.html');
    expect(src).toContain('--text: #e2e8f0; --dim: #cbd5e1;');
    expect(src).toContain('header button { min-height: 44px;');
    expect(src).toContain('button.go { min-height: 44px;');
    expect(src).toContain('<h1><span aria-hidden="true">🕰️ </span>Timeline Studio</h1>');

    const { win, doc } = loadPageDom('timeline_studio/timeline_studio.html');
    const builderBtn = doc.getElementById('builderBtn');
    const drawer = doc.getElementById('drawer');
    const headline = doc.getElementById('mHeadline');
    const year = doc.getElementById('mYear');
    const drawerStatus = doc.getElementById('drawerStatus');

    builderBtn.click();
    expect(drawer.classList.contains('open')).toBe(true);
    expect(doc.activeElement).toBe(headline);

    headline.value = 'First Moon landing';
    year.value = '1969';

    // IME Enter does not add event; real Enter adds event and updates status
    year.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    expect(drawerStatus.textContent).toBe('');
    year.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(drawerStatus.textContent).toContain('First Moon landing');
    expect(drawerStatus.textContent).toContain('1969');

    await runAxe(doc.body);

    // IME Escape does not close drawer; real Escape closes and restores focus to builderBtn
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(drawer.classList.contains('open')).toBe(true);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(drawer.classList.contains('open')).toBe(false);
    expect(doc.activeElement).toBe(builderBtn);

    await runAxe(doc.body);
  });

  it('polishes Data Lab Tutor Plugin (44px skip-link, reduced-motion, forced-colors, no-referrer) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('data_lab/tutor_plugin.html');
    expect(src).toContain('<meta name="referrer" content="no-referrer">');
    expect(src).toContain('min-height: 44px;');
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
    expect(src).toContain('@media (forced-colors: active)');

    const { doc } = loadPageDom('data_lab/tutor_plugin.html', { execScripts: false });
    await runAxe(doc.body);
  });

  it('polishes Classroom Import (strict CSP, reduced-motion, forced-colors, 44px skip-link & review checkbox, contrast eyebrow, explicit button types) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('classroom-import.html');
    expect(src).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(src).toContain('<meta name="referrer" content="no-referrer">');
    expect(src).toContain('@media(prefers-reduced-motion:reduce)');
    expect(src).toContain('@media(forced-colors:active)');
    expect(src).toContain('color:#145c52');

    const { doc } = loadPageDom('classroom-import.html', {
      injectScripts: [
        'classroom_import_config.js',
        'classroom_import_service.js',
        'classroom_import_app.js',
      ],
    });
    const buttons = Array.from(doc.querySelectorAll('button'));
    expect(buttons.length).toBe(7);
    for (const btn of buttons) {
      expect(btn.getAttribute('type'), btn.id).toBe('button');
    }

    await runAxe(doc.body);
  });

  it('polishes Walkthrough Copilot standalone page (strict CSP, 44px controls, forced-colors, dark contrast, reduced-motion, h3 tier heading order) with mirror parity and zero axe violations', async () => {
    const src = readRepoFile('walkthrough-copilot.html');
    const standalone = assertMirrorsMatch('walkthrough_copilot_standalone.js');
    expect(standalone).toContain("add(box, el('h3', null, tier.name));");
    expect(src).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(src).toContain('<meta name="referrer" content="no-referrer" />');
    expect(src).toContain('--muted: #cbd5e1;');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain('scroll-behavior: auto !important;');

    const { doc } = loadPageDom('walkthrough-copilot.html', {
      injectScripts: [
        'walkthrough_copilot_module.js',
        'walkthrough_copilot_fixtures.js',
        'walkthrough_copilot_scenarios.js',
        'walkthrough_script_source_module.js',
        'walkthrough_copilot_standalone.js',
      ],
    });
    expect(doc.getElementById('app').textContent.length).toBeGreaterThan(20);
    await runAxe(doc.body);
  });
});
