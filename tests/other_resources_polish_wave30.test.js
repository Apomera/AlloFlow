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

function loadPageDom(htmlFile, { execScripts = true, injectScripts = [], reducedMotion = false, beforeParseExtra = null, urlPath = null } = {}) {
  const raw = readRepoFile(htmlFile);
  let html = raw
    .replace(/<link\b[^>]*href="https?:\/\/[^"]+"[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  if (injectScripts.length) {
    const inlineTags = injectScripts
      .map((scriptPath) => `<script>${readRepoFile(scriptPath)}</script>`)
      .join('\n');
    html = html.replace(/<script>/i, `${inlineTags}\n<script>`);
  }
  const dom = new JSDOM(html, {
    url: 'https://alloflow-cdn.pages.dev/' + (urlPath || htmlFile),
    runScripts: execScripts ? 'dangerously' : undefined,
    beforeParse(win) {
      win.matchMedia = vi.fn((q) => ({
        matches: reducedMotion && String(q).includes('prefers-reduced-motion'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      win.scrollTo = vi.fn();
      win.HTMLElement.prototype.scrollIntoView = vi.fn();
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

describe('Other Resources Polish — Wave 30', () => {
  it('polishes Text Inquiry Studio (skip-link, focusable main, 44px controls, reduced-motion scroll, IME-safe Enter/Escape) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('text_inquiry/text_inquiry.html');
    expect(src).toContain('<meta name="referrer" content="no-referrer">');
    expect(src).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(src).toContain('<a class="skip-link" href="#main">Skip to main content</a>');
    expect(src).toContain('<main id="main" class="layout" tabindex="-1">');
    expect(src).toContain('.term{min-height:44px;');
    expect(src).toContain('.annotation-list button{float:right;min-height:44px;');
    expect(src).toContain('.source-search-results button{min-height:44px;');
    expect(src).toContain('details summary{min-height:44px;');

    const { win, doc } = loadPageDom('text_inquiry/text_inquiry.html', {
      reducedMotion: true,
      injectScripts: [
        'annotation_inquiry_bridge.js',
        'tool_integration_sdk.js',
        'text_inquiry/text_inquiry_core.js',
        'text_inquiry/text_inquiry_search.js',
      ],
    });

    const sourceSearchQuery = doc.getElementById('sourceSearchQuery');
    const sourceSearchStatus = doc.getElementById('sourceSearchStatus');
    sourceSearchQuery.value = 'Gilman Yellow Wallpaper';
    sourceSearchQuery.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(sourceSearchQuery.value).toBe('Gilman Yellow Wallpaper');
    sourceSearchQuery.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(sourceSearchQuery.value).toBe('');
    expect(sourceSearchStatus.textContent).toContain('cleared');

    // Load sample + analyze respects prefers-reduced-motion on scrollIntoView
    doc.getElementById('sampleBtn').click();
    const resultsCard = doc.getElementById('resultsCard');
    const scrollSpy = vi.fn();
    resultsCard.scrollIntoView = scrollSpy;
    doc.getElementById('analyzeBtn').click();
    expect(resultsCard.hidden).toBe(false);
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });

    // Concordance Enter + IME-safe Escape clear
    const queryTerm = doc.getElementById('queryTerm');
    const summary = doc.getElementById('concordanceSummary');
    queryTerm.value = 'john';
    queryTerm.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    expect(doc.getElementById('concordanceList').children.length).toBe(0);
    queryTerm.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(doc.getElementById('concordanceList').children.length).toBeGreaterThan(0);

    queryTerm.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(queryTerm.value).toBe('john');
    queryTerm.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(queryTerm.value).toBe('');
    expect(summary.textContent).toContain('cleared');

    await runAxe(doc.body);
  });

  it('polishes AlphaFold Explorer (no outline:none, reduced-motion CSS, 44px controls, slider aria-valuetext, IME-safe Escape) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('alphafold_explorer/alphafold_explorer.html');
    expect(src).toContain('<meta name="referrer" content="no-referrer">');
    expect(src).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(src).toContain('integrity="sha384-eq20u4xjAngOakfX2/AnZKJBUf3lRv/ULwa5hKesdI12bQdoLE8NS3Dae4LjEn1s"');
    expect(src).not.toMatch(/outline\s*:\s*none\s*;/i);
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
    expect(src).toContain('input[type="range"] { min-height: 44px; }');

    const { win, doc } = loadPageDom('alphafold_explorer/alphafold_explorer.html', {
      injectScripts: ['tool_integration_sdk.js'],
      beforeParseExtra(w) {
        w.requestAnimationFrame = () => 1;
        w.cancelAnimationFrame = () => {};
      },
    });

    expect(doc.getElementById('coordinateMorphFrameInput').getAttribute('aria-valuetext')).toBe('0% variant');
    expect(doc.getElementById('coordinateMorphAmplifyInput').getAttribute('aria-valuetext')).toBe('1.0x displacement emphasis');
    expect(doc.getElementById('paeAlignedResidue').getAttribute('aria-valuetext')).toBe('Residue 1');
    expect(doc.getElementById('paeComparedResidue').getAttribute('aria-valuetext')).toBe('Residue 1');

    // IME-safe Escape clear on accessionInput
    const acc = doc.getElementById('accessionInput');
    const lookupStatus = doc.getElementById('lookupStatus');
    acc.value = 'P01308';
    acc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(acc.value).toBe('P01308');
    acc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(acc.value).toBe('');
    expect(lookupStatus.textContent).toContain('Accession input cleared');

    // Focus view Escape respects IME composition and restores focus to focusViewBtn
    const focusBtn = doc.getElementById('focusViewBtn');
    focusBtn.click();
    expect(doc.body.classList.contains('viewerFocus')).toBe(true);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(doc.body.classList.contains('viewerFocus')).toBe(true);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(doc.body.classList.contains('viewerFocus')).toBe(false);
    expect(doc.activeElement).toBe(focusBtn);

    await runAxe(doc.body);
  });

  it('polishes Whiteboard (offscreen canvases aria-hidden, IME-safe Enter/Escape on nameInput and aiPrompt) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('whiteboard/whiteboard.html');
    expect(src).toContain('<meta name="referrer" content="no-referrer">');
    expect(src).toContain('.privacy { font-size: 12px; color: #94a3b8; }');
    expect(src).toContain("cv.setAttribute('aria-hidden', 'true');");
    expect(src).toContain("gc.setAttribute('aria-hidden', 'true');");
    expect(src).toContain("probeCanvas.setAttribute('aria-hidden', 'true');");

    const { win, doc } = loadPageDom('whiteboard/whiteboard.html', {
      beforeParseExtra(w) {
        w.React = { createElement: () => ({}) };
        w.ReactDOM = { createRoot: () => ({ render: () => {} }) };
        w.ExcalidrawLib = { Excalidraw: () => null };
        w.requestAnimationFrame = () => 1;
      },
    });

    const nameInput = doc.getElementById('nameInput');
    const flash = doc.getElementById('flashmsg');
    nameInput.value = 'Water cycle sketch';
    nameInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(nameInput.value).toBe('Water cycle sketch');
    nameInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(nameInput.value).toBe('');
    expect(flash.textContent).toContain('Sketch name cleared');

    const aiPrompt = doc.getElementById('aiPrompt');
    const aiStatus = doc.getElementById('aiStatus');
    aiPrompt.value = 'Draw mitosis stages';
    // IME Enter must not trigger aiRequest
    aiPrompt.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    expect(aiStatus.textContent).toBe('');
    // IME Escape must not clear
    aiPrompt.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(aiPrompt.value).toBe('Draw mitosis stages');
    // Real Escape clears and announces
    aiPrompt.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(aiPrompt.value).toBe('');
    expect(aiStatus.textContent).toContain('AI prompt cleared');

    await runAxe(doc.body);
  });

  it('polishes Device Storage Bridge (no-referrer, skip-link, 44px buttons, dark danger contrast, accessible labeled educator-code dialog with Escape & focus return) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('storage_bridge.html');
    expect(src).toContain('<meta name="referrer" content="no-referrer">');
    expect(src).toContain('class="skip-link"');
    expect(src).toContain('button.danger { color: #fca5a5 !important; border-color: #f87171 !important; }');
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain('<th scope="col"><span class="sr-only">Actions</span></th>');

    const { win, doc } = loadPageDom('storage_bridge.html', {
      beforeParseExtra(w) {
        w.localStorage.setItem('alloflow_educator_access_code_v1', JSON.stringify({
          kind: 'pwhash',
          alg: 'PBKDF2-SHA256',
          iter: 100000,
          salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
          hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        }));
      },
    });

    expect(doc.getElementById('review-ui').hidden).toBe(false);
    expect(doc.getElementById('review-ui').getAttribute('tabindex')).toBe('-1');
    expect(doc.getElementById('btn-export').getAttribute('type')).toBe('button');

    // Audit review UI
    await runAxe(doc.body);

    // Trigger educator access code modal via Export button
    const exportBtn = doc.getElementById('btn-export');
    exportBtn.focus();
    exportBtn.click();

    const dialog = doc.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe('bridge-code-dialog-title');
    const codeInput = doc.getElementById('bridge-code-input');
    expect(codeInput).toBeTruthy();
    expect(codeInput.getAttribute('aria-label')).toBe('Educator access code');
    expect(doc.querySelector('label[for="bridge-code-input"]')).toBeTruthy();

    // Audit open modal too!
    await runAxe(doc.body);

    // IME Escape does not close dialog; real Escape closes and restores focus to exportBtn
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(doc.querySelector('[role="dialog"]')).toBeTruthy();
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(doc.querySelector('[role="dialog"]')).toBeNull();
    expect(doc.activeElement).toBe(exportBtn);
  });

  it('polishes School Rewards Index.html and Evaluation Share Helper Index.html (no-referrer, 44px controls, aria-busy, IME-safe Escape review cancel) with mirror parity and zero axe violations', async () => {
    const srSrc = assertMirrorsMatch('apps_script/school_rewards/Index.html');
    expect(srSrc).toContain('<meta name="referrer" content="no-referrer">');
    expect(srSrc).toContain('min-height:44px');
    expect(srSrc).toContain('@media (prefers-reduced-motion:reduce)');
    expect(srSrc).toContain('@media (forced-colors:active)');
    expect(srSrc).toContain('<?= initialView ?>');
    expect(srSrc).toContain('<?= claimToken ?>');
    expect(srSrc).toContain("<?!= include('Portal'); ?>");

    const shareSrc = assertMirrorsMatch('apps_script/educator_evaluation_share/Index.html');
    expect(shareSrc).toContain('<meta name="referrer" content="no-referrer">');
    expect(shareSrc).toContain('summary{min-height:44px;');
    expect(shareSrc).toContain('class="review hidden" tabindex="-1"');
    expect(shareSrc).toContain("button.setAttribute('aria-busy', on ? 'true' : 'false')");

    const { win, doc } = loadPageDom('apps_script/educator_evaluation_share/Index.html', {
      beforeParseExtra(w) {
        w.google = {
          script: {
            run: {
              withSuccessHandler(cb) {
                this._ok = cb;
                return this;
              },
              withFailureHandler() { return this; },
              verifyShareHelper() {
                this._ok({
                  ready: true,
                  driveApiV3Ready: true,
                  managedIdentityReady: true,
                  recommendedDomain: 'district.org',
                  version: '2.0',
                  deployerEmail: 'principal@district.org',
                  note: 'Verified.',
                  rootFolderUrl: 'https://drive.google.com/drive/folders/test',
                });
              },
            },
          },
        };
      },
    });

    // Run deployment check, paste valid packet, open review panel, test focus + IME-safe Escape cancel
    doc.getElementById('verify').click();
    const packetPayload = JSON.stringify({
      kind: 'alloflow-educator-evaluation-packet',
      version: 1,
      packetType: 'educator',
      packetId: 'pkt-123',
      teacherId: 't-1',
      issuedAt: '2026-10-01T12:00:00Z',
      includeNames: false,
      config: { academicYear: '2026-2027' },
      teachers: [{ id: 't-1', code: 'T-01', name: 'T-01' }],
    });
    const packetArea = doc.getElementById('packet');
    packetArea.value = `<script id="allo-evaluation-packet">${packetPayload}</script>`;
    packetArea.dispatchEvent(new win.Event('input', { bubbles: true }));

    doc.getElementById('email').value = 'teacher@district.org';
    doc.getElementById('confirmEmail').value = 'teacher@district.org';
    doc.getElementById('policy').checked = true;

    const reviewBtn = doc.getElementById('review');
    const reviewPanel = doc.getElementById('reviewPanel');
    expect(reviewBtn.disabled).toBe(false);
    reviewBtn.click();
    expect(reviewPanel.classList.contains('hidden')).toBe(false);
    expect(doc.activeElement).toBe(reviewPanel);

    // Audit open review state
    await runAxe(doc.body);

    // IME Escape does not cancel; real Escape cancels and restores focus to #review
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(reviewPanel.classList.contains('hidden')).toBe(false);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(reviewPanel.classList.contains('hidden')).toBe(true);
    expect(doc.activeElement).toBe(reviewBtn);
  });
});
