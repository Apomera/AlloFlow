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

function loadPageDom(htmlFile, { execScripts = false } = {}) {
  const raw = readRepoFile(htmlFile);
  const html = raw
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  const dom = new JSDOM(html, {
    url: 'https://alloflow-cdn.pages.dev/' + htmlFile,
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

describe('Other resources polish wave 34 (School Rewards Practice, Kitchen Studio companions, Remediation Workspace, Packets CSS)', () => {
  it('polishes dev-tools/build_school_rewards_practice.py and rebuilt school-rewards-practice.html across mirrors with 44px controls, forced-colors, IME-safe Escape panel close, and 0 axe violations', async () => {
    const src = assertMirrorsMatch('school-rewards-practice.html');
    const portal = readRepoFile('apps_script/school_rewards/Portal.html').replace(/\r\n/g, '\n');

    expect(src).toContain('<a class="skip-link practice-skip" href="#main-content">Skip to practice workspace</a>');
    expect(src).toContain('.practice-skip{position:absolute;inset-inline-start:8px;top:8px;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;pointer-events:none;z-index:9999;display:inline-flex;align-items:center;min-height:44px');
    expect(src).toContain('.practice-bar select,.practice-bar button,.practice-bar a{display:inline-flex;align-items:center;min-height:44px');
    expect(src).toContain('.practice-bar :focus-visible,.tour-box :focus-visible{outline:3px solid #fbbf24;outline-offset:2px}');
    expect(src).toContain('.practice-rows button{min-height:44px');
    expect(src).toContain('.practice-rowline input{margin:0;min-height:44px}');
    expect(src).toContain('.practice-step .head button{min-height:44px');
    expect(src).toContain('.practice-step select,.practice-step input,.practice-step textarea{margin:0;min-height:44px');
    expect(src).toContain('.tour-box button{min-height:44px');
    expect(src).toContain('@media (prefers-reduced-motion: reduce){.practice-bar *');
    expect(src).toContain('@media (forced-colors: active){.practice-skip,.practice-bar');
    expect(src).toContain('"Skip to practice workspace": "Ir al espacio de práctica"');
    const portalMainIdx = portal.search(/<main\b[^>]*\bclass="shell"[^>]*>/);
    expect(portalMainIdx).toBeGreaterThan(-1);
    expect(src.replace(/\r\n/g, '\n')).toContain(portal.slice(portalMainIdx, portal.indexOf('<script>')));

    const { win, doc } = loadPageDom('school-rewards-practice.html', { execScripts: true });
    const customizeBtn = doc.getElementById('practice-customize');
    const panel = doc.getElementById('practice-panel');
    expect(panel.hidden).toBe(true);

    customizeBtn.click();
    expect(panel.hidden).toBe(false);
    expect(customizeBtn.getAttribute('aria-expanded')).toBe('true');

    // IME-composed Escape must NOT close the panel
    const imeEsc = new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(imeEsc, 'isComposing', { value: true });
    doc.dispatchEvent(imeEsc);
    expect(panel.hidden).toBe(false);

    // Real Escape closes customize panel and returns focus to customize button
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(panel.hidden).toBe(true);
    expect(customizeBtn.getAttribute('aria-expanded')).toBe('false');
    expect(doc.activeElement).toBe(customizeBtn);

    await runAxe(doc.body);
  });

  it('polishes Kitchen Studio Chef Station (recipe_lab_avatar.html + recipe_lab_avatar.css) across mirrors with no-referrer, hidden arrow, 44px controls, zero outline:none, and 0 axe violations', async () => {
    const html = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_avatar.html');
    const css = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_avatar.css');

    expect(html).toContain('<meta name="referrer" content="no-referrer">');
    expect(html).toContain('<a href="index.html"><span aria-hidden="true">←</span> Skills studio</a>');
    expect(css).toContain('.avatar-page .avatar-skip{position:absolute;left:1rem;top:-150px;display:inline-flex;align-items:center;min-height:44px');
    expect(css).toContain('.avatar-page a:focus-visible,#avatarKitchenApp:focus-visible{outline:3px solid #315f45');
    expect(css).toContain('.avatar-records summary{font-size:.82rem;font-weight:750;min-height:44px');
    expect(css).toContain('.avatar-limits summary{font-weight:750;cursor:pointer;min-height:44px}');
    expect(css).toContain('.avatar-kitchen .avatar-notebook-buttons button,.avatar-kitchen .avatar-notebook-check-nav button{min-height:44px');
    expect(css).toContain('@media(prefers-reduced-motion:reduce){body.avatar-page,body.avatar-page *{');
    expect(css).not.toContain('outline:none');

    const { doc } = loadPageDom('stem_lab/kitchen_studio/recipe_lab_avatar.html', { execScripts: false });
    await runAxe(doc.body);
  });

  it('polishes Kitchen Studio Sauce Science Bench (recipe_lab_investigation.html + .css + kitchen_chemistry.css) across mirrors with no-referrer, 44px nav/summaries, reduced-motion, and 0 axe violations', async () => {
    const html = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_investigation.html');
    const css = assertMirrorsMatch('stem_lab/kitchen_studio/recipe_lab_investigation.css');
    const chemCss = assertMirrorsMatch('stem_lab/kitchen_studio/kitchen_chemistry.css');

    expect(html).toContain('<meta name="referrer" content="no-referrer">');
    expect(html).toContain('<a href="index.html"><span aria-hidden="true">←</span> Skills studio</a>');
    expect(css).toContain('.investigation-page nav a,.investigation-page footer a{color:#315a42;text-underline-offset:3px;min-height:44px;display:inline-flex;align-items:center}');
    expect(css).toContain('.investigation-page .skip-link{position:absolute;left:1rem;top:-100px;display:inline-flex;align-items:center;min-height:44px');
    expect(css).toContain('.investigation-page a:focus-visible,#sauceInvestigationApp:focus-visible');
    expect(css).toContain('.bench-limits summary{cursor:pointer;font-weight:750;min-height:44px;padding:.55rem 0}');
    expect(css).toContain('.bench-json summary{font-size:.82rem;font-weight:750;min-height:44px');
    expect(css).toContain('.bench-control-details summary{cursor:pointer;font-size:.8rem;min-height:44px');
    expect(css).toContain('@media(prefers-reduced-motion:reduce){body.investigation-page,body.investigation-page *{');
    expect(chemCss).toContain('.chem-molecular summary,.chem-sources summary{min-height:44px;padding:.55rem 0');
    expect(chemCss).toContain('@media(prefers-reduced-motion:reduce){.kitchen-chemistry,.kitchen-chemistry *{');
    expect(chemCss).toContain('outline-color:Highlight');

    const { doc } = loadPageDom('stem_lab/kitchen_studio/recipe_lab_investigation.html', { execScripts: false });
    await runAxe(doc.body);
  });

  it('polishes remediation_workspace.css with 44px controls/summaries/sliders and full forced-colors support', () => {
    const css = readRepoFile('remediation_workspace.css');
    expect(css).toContain('.pdf-workspace .pdf-workspace-window-actions button { min-width:44px; min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-manual > summary { font-weight:700; font-size:13px; cursor:pointer; min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-afterfix select { min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-batch-error summary { cursor:pointer; min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-recovery button { min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-batch-review summary { min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-settings summary { min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-settings input[type=range] { min-height:44px; }');
    expect(css).toContain('.pdf-workspace .pdf-workspace-settings select { min-height:44px; }');
    expect(css).toContain('.pdf-workspace .pdf-workspace-log-button { min-width:44px; min-height:44px; }');
    expect(css).toContain('.pdf-workspace .pdf-workspace-evidence > summary { cursor:pointer; min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-repairs > summary { cursor:pointer; min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-review-actions button, .pdf-workspace .pdf-workspace-reviewed > button { min-height:44px;');
    expect(css).toContain('.pdf-workspace .pdf-workspace-reviewed > summary { cursor:pointer; min-height:44px;');
    expect(css).toContain('@media(forced-colors:active)');
  });

  it('polishes Packets Studio companion stylesheets (vocab, words, voice, pictures) with 44px targets, forced-colors, zero outline:none, and 0 axe violations on their HTML shells', async () => {
    const vocabCss = readRepoFile('packets-vocab.css');
    const wordsCss = readRepoFile('packets-words.css');
    const voiceCss = readRepoFile('packets-voice.css');
    const picturesCss = readRepoFile('packets-pictures.css');

    expect(vocabCss).toContain('.v-tools .btn { min-height: 2.75rem;');
    expect(vocabCss).toContain('@media (forced-colors: active)');

    expect(wordsCss).toContain('.wp-x { width: 2.75rem; min-height: 2.75rem;');
    expect(wordsCss).toContain('.my-words > summary { display: inline-flex; align-items: center; min-height: 2.75rem;');
    expect(wordsCss).not.toContain('outline: none');
    expect(wordsCss).toContain('.wl-pick:focus-within { outline: 3px solid Highlight; }');

    expect(voiceCss).toContain('.voice-row .btn { margin: 0; min-height: 2.75rem; }');
    expect(voiceCss).toContain('@media (forced-colors: active)');

    expect(picturesCss).toContain('.mine-list .btn { grid-column: 2; justify-self: start; min-height: 2.75rem; }');
    expect(picturesCss).toContain('.pic { border-color: CanvasText; }');

    for (const page of ['packets-vocab.html', 'packets-voice.html', 'packets-pictures.html']) {
      const { doc } = loadPageDom(page, { execScripts: false });
      await runAxe(doc.body);
    }
  });
});
