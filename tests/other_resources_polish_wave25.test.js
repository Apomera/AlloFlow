import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { JSDOM } = require('jsdom');

let React;
let ReactDOMClient;
let act;
let InfoModal;
let StemLabModal;

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

function loadPageDom(htmlFile, { execScripts = true, extraScriptFiles = [], reducedMotion = false, writeText = null } = {}) {
  const raw = readFileSync(resolve(process.cwd(), htmlFile), 'utf8');
  let html = raw;
  // Strip external <script src="..."> tags so jsdom executes inline scripts cleanly offline
  html = html.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  if (execScripts && extraScriptFiles.length) {
    const extraTags = extraScriptFiles
      .map((sf) => `<script>${readFileSync(resolve(process.cwd(), sf), 'utf8')}</script>`)
      .join('\n');
    html = html.replace('</body>', `${extraTags}\n</body>`);
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
      win.speechSynthesis = { cancel: vi.fn(), speak: vi.fn() };
      win.SpeechSynthesisUtterance = function (text) { this.text = text; };
      if (writeText) {
        Object.defineProperty(win.navigator, 'clipboard', {
          configurable: true,
          value: { writeText },
        });
      }
    },
  });
  cleanups.push(() => { dom.window.close(); });
  return { raw, dom, win: dom.window, doc: dom.window.document };
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  if (typeof window.HTMLElement !== 'undefined' && !window.HTMLElement.prototype.scrollTo) {
    window.HTMLElement.prototype.scrollTo = () => {};
  }
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const icon of [
    'Sparkles', 'X', 'Layers', 'BookOpen', 'CheckSquare', 'Globe', 'Search',
    'ShieldCheck', 'MonitorPlay', 'ArrowLeft', 'ExternalLink', 'Code', 'Users',
    'Heart', 'RefreshCw', 'Layout', 'ImageIcon', 'Quote', 'Lightbulb', 'MapIcon',
    'ListOrdered', 'Filter', 'Calculator', 'ClipboardList', 'Terminal', 'History',
    'Wifi', 'Cloud', 'Mic', 'Download', 'Clock', 'Gamepad2', 'Ear', 'FileQuestion',
    'MessageCircleQuestion', 'HelpCircle', 'Trophy', 'Award', 'Compass', 'Star',
    'Volume2', 'VolumeX', 'Maximize2', 'Minimize2', 'Keyboard', 'FlaskConical',
  ]) {
    if (!window[icon]) window[icon] = () => null;
  }
  loadAlloModule('view_info_modal_module.js');
  loadAlloModule('stem_lab/stem_lab_module.js');
  InfoModal = window.AlloModules.InfoModal?.InfoModal || window.AlloModules.InfoModal;
  StemLabModal = window.AlloModules.StemLabModal || window.AlloModules.StemLab;
});

afterEach(async () => {
  while (cleanups.length) {
    const fn = cleanups.pop();
    await fn();
  }
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.className = '';
  document.body.style.overflow = '';
  delete window.__alloFocusTrapStack;
  delete window.__alloScrollLockState;
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Other Resources Polish — Wave 25 + Cloudflare STEAM Tool Links', () => {
  it('surfaces verified Cloudflare direct links in InfoModal Atlas, StemLab catalog & active toolbar, features.html, and manuals.html with zero axe violations', async () => {
    const redirects = readFileSync(resolve(process.cwd(), '_redirects'), 'utf8');
    expect(redirects).toContain('/water-cycle /app/?tool=waterCycle 302');

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    // 1) In-App InfoModal Atlas tab -> STEAM Lab area -> click Water Cycle & toggle all links
    const infoHost = document.createElement('div');
    document.body.appendChild(infoHost);
    const infoRoot = ReactDOMClient.createRoot(infoHost);
    cleanups.push(async () => {
      await act(async () => infoRoot.unmount());
      infoHost.remove();
    });

    await act(async () => {
      infoRoot.render(React.createElement(InfoModal, {
        showInfoModal: true,
        infoModalTab: 'atlas',
        setInfoModalTab: vi.fn(),
        setShowInfoModal: vi.fn(),
        // Like the host: an unknown key is undefined, so the English fallback shows.
        t: (k, fb) => (typeof fb === 'string' ? fb : undefined),
      }));
    });

    // Switch Atlas view to directory
    const dirBtn = Array.from(infoHost.querySelectorAll('button')).find((b) => /directory/i.test(b.textContent || ''));
    expect(dirBtn).toBeTruthy();
    await act(async () => { dirBtn.click(); });

    // Open STEAM Lab hub
    const steamHub = infoHost.querySelector('#atlas-hub-steam-lab');
    expect(steamHub).toBeTruthy();
    await act(async () => {
      steamHub.open = true;
      steamHub.dispatchEvent(new window.Event('toggle'));
    });
    expect(steamHub.querySelector('a[href="https://alloflow-cdn.pages.dev/tools.html#directory-heading"]')).toBeTruthy();
    expect(steamHub.textContent).not.toMatch(/Cloudflare/);

    // Open Earth & Space Science area and select Water Cycle
    const waterChip = steamHub.querySelector('[data-atlas-steam-tool="Water Cycle"]');
    expect(waterChip).toBeTruthy();
    const areaDetails = waterChip.closest('details');
    if (areaDetails) areaDetails.open = true;

    await act(async () => { waterChip.click(); });
    const selectedPanel = areaDetails.querySelector('[data-atlas-selected-link="true"]');
    expect(selectedPanel).toBeTruthy();
    expect(selectedPanel.textContent).toContain('https://alloflow-cdn.pages.dev/water-cycle');
    const openLink = selectedPanel.querySelector('a[href="https://alloflow-cdn.pages.dev/water-cycle"]');
    expect(openLink?.getAttribute('target')).toBe('_blank');
    expect(openLink?.getAttribute('rel')).toContain('noopener');
    expect(openLink?.getAttribute('rel')).toContain('noreferrer');

    const copyBtn = selectedPanel.querySelector('button[aria-label="Copy the link for Water Cycle"]');
    expect(copyBtn).toBeTruthy();
    await act(async () => { copyBtn.click(); });
    expect(writeText).toHaveBeenCalledWith('https://alloflow-cdn.pages.dev/water-cycle');
    expect(areaDetails.querySelector('[role="status"]')?.textContent).toContain('Copied the link for Water Cycle.');

    // Toggle all links in this area
    const allToggle = areaDetails.querySelector('[data-atlas-area-links-toggle="true"]');
    expect(allToggle).toBeTruthy();
    await act(async () => { allToggle.click(); });
    expect(allToggle.getAttribute('aria-expanded')).toBe('true');
    const allList = document.getElementById(allToggle.getAttribute('aria-controls'));
    expect(allList?.textContent).toContain('https://alloflow-cdn.pages.dev/water-cycle');

    await runAxe(infoHost);

    // 2) In-App STEAM Lab: catalog Cloudflare links drawer + active tool toolbar Share link
    const stemHost = document.createElement('div');
    document.body.appendChild(stemHost);
    const stemRoot = ReactDOMClient.createRoot(stemHost);
    cleanups.push(async () => {
      await act(async () => stemRoot.unmount());
      stemHost.remove();
    });

    const IconStub = () => null;
    function StemWrapper() {
      const [tool, setTool] = React.useState(null);
      const [data, setData] = React.useState({});
      const base = {
        React,
        showStemLab: true,
        setShowStemLab: () => {},
        stemLabTab: 'explore',
        setStemLabTab: vi.fn(),
        stemLabTool: tool,
        setStemLabTool: setTool,
        labToolData: data,
        setLabToolData: setData,
        toolSnapshots: [],
        onClose: vi.fn(),
        addToast: vi.fn(),
        announceToSR: vi.fn(),
        isTeacherMode: true,
        theme: 'light',
        callGemini: null,
        callTTS: null,
        t: (k, fb) => (typeof fb === 'string' ? fb : k),
      };
      const props = new Proxy(base, {
        get(target, key) {
          if (key in target) return target[key];
          if (typeof key === 'string' && /^[A-Z]/.test(key)) return IconStub;
          if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
          return undefined;
        },
      });
      return StemLabModal(props);
    }

    window.StemLab.registerTool('waterCycle', {
      label: 'Water Cycle',
      icon: '💧',
      desc: 'Water Cycle simulation',
      render: () => React.createElement('div', { 'data-testid': 'mock-water-cycle' }, 'Water Cycle Sim'),
    });

    await act(async () => { stemRoot.render(React.createElement(StemWrapper)); });

    // Toggle catalog Cloudflare links
    const catToggle = stemHost.querySelector('[data-stem-catalog-links-toggle="true"]');
    expect(catToggle).toBeTruthy();
    expect(catToggle.getAttribute('aria-expanded')).toBe('false');
    await act(async () => { catToggle.click(); });
    expect(catToggle.getAttribute('aria-expanded')).toBe('true');
    const catPanel = stemHost.querySelector('#stem-catalog-direct-links');
    expect(catPanel?.textContent).toContain('https://alloflow-cdn.pages.dev/water-cycle');

    // Open Water Cycle tool and toggle active toolbar Cloudflare link
    const waterCard = stemHost.querySelector('[data-stem-tool-id="waterCycle"]');
    expect(waterCard).toBeTruthy();
    await act(async () => { waterCard.click(); });

    // 2026-11-23: with a tool open, "Cloudflare link" is an item in the top bar's More menu.
    const moreToggle = stemHost.querySelector('[data-stem-more-toggle="true"]');
    expect(moreToggle).toBeTruthy();
    await act(async () => { moreToggle.click(); });
    const activeToggle = stemHost.querySelector('[data-stem-direct-link-toggle="true"]');
    expect(activeToggle).toBeTruthy();
    await act(async () => { activeToggle.click(); });
    const activePanel = stemHost.querySelector('#stem-active-direct-link-panel');
    expect(activePanel).toBeTruthy();
    expect(activePanel.textContent).toContain('https://alloflow-cdn.pages.dev/water-cycle');
    const activeCopy = activePanel.querySelector('button[aria-label="Copy Cloudflare link for Water Cycle"]');
    await act(async () => { activeCopy.click(); });
    expect(writeText).toHaveBeenCalledWith('https://alloflow-cdn.pages.dev/water-cycle');

    await runAxe(activePanel);

    // 3) Public Features & Manuals pages surface the Cloudflare tool links
    const featuresRaw = readFileSync(resolve(process.cwd(), 'features.html'), 'utf8');
    expect(featuresRaw).toContain('tools.html#directory-heading');
    const manualsRaw = readFileSync(resolve(process.cwd(), 'manuals.html'), 'utf8');
    expect(manualsRaw).toContain('<code>https://alloflow-cdn.pages.dev/water-cycle</code>');
    expect(manualsRaw).toContain('<code>https://alloflow-cdn.pages.dev/coaster-lab</code>');
  }, 20000);

  it('polishes accessibility_demo.html with 44px controls, synced aria-pressed toggles, responsive grid nav, IME/modifier guards, reduced-motion reveal, and zero axe violations', async () => {
    const { raw, win, doc } = loadPageDom('accessibility_demo.html', { reducedMotion: true });
    if (doc.readyState === 'loading') {
      await new Promise((resolveReady) => doc.addEventListener('DOMContentLoaded', resolveReady, { once: true }));
    } else {
      await new Promise((resolveReady) => setTimeout(resolveReady, 20));
    }
    expect(raw).toContain('.btn-sm { padding: 8px 14px; font-size: 12px; min-height: 44px; }');
    expect(raw).toContain('min-height: 44px;');

    // Reduced-motion immediately reveals sections
    expect(doc.querySelectorAll('.reveal.visible').length).toBe(doc.querySelectorAll('.reveal').length);

    // Tap first grid cell and confirm sentence strip updates
    const cells = doc.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBe(12);
    expect(cells[0].querySelector('.symbol')?.getAttribute('aria-hidden')).toBe('true');
    cells[0].click();
    expect(doc.getElementById('strip-words')?.textContent).toContain('more');

    // Ctrl+H / IME composition must NOT trigger High Contrast
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'h', ctrlKey: true, bubbles: true }));
    expect(doc.body.classList.contains('hc')).toBe(false);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'h', isComposing: true, bubbles: true }));
    expect(doc.body.classList.contains('hc')).toBe(false);

    // Pressing H syncs aria-pressed on BOTH High Contrast buttons
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    expect(doc.body.classList.contains('hc')).toBe(true);
    const hcBtns = doc.querySelectorAll('[data-hc-toggle="true"]');
    expect(hcBtns.length).toBe(2);
    hcBtns.forEach((b) => expect(b.getAttribute('aria-pressed')).toBe('true'));

    // Toggle scan & scan mode syncs aria-pressed
    const scanBtn = doc.getElementById('scan-toggle-btn');
    scanBtn.click();
    expect(scanBtn.getAttribute('aria-pressed')).toBe('true');
    const modeBtn = doc.getElementById('scan-mode-btn');
    modeBtn.click();
    expect(modeBtn.getAttribute('aria-pressed')).toBe('true');
    expect(modeBtn.textContent).toBe('2-Switch');
    scanBtn.click();
    expect(scanBtn.getAttribute('aria-pressed')).toBe('false');

    await runAxe(doc.body);
  });

  it('polishes calculator.html by removing outline:none, upgrading dark-surface contrast, adding Select all / Clear selection & polite status updates, and passing axe', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { raw, win, doc } = loadPageDom('calculator.html', { writeText });
    expect(raw).not.toMatch(/\.config-group input:focus\s*\{\s*outline:\s*none/i);
    expect(raw).toContain('.config-group input:focus-visible');
    expect(raw).toContain('.product-card:focus-visible');
    expect(raw).not.toContain('alert("Failed to copy');

    const savingsRegion = doc.querySelector('#savingsBar [role="status"][aria-live="polite"]');
    expect(savingsRegion).toBeTruthy();

    const cards = doc.querySelectorAll('.product-card[role="checkbox"]');
    expect(cards.length).toBeGreaterThanOrEqual(6);
    cards[0].click();
    expect(cards[0].getAttribute('aria-checked')).toBe('true');
    expect(doc.getElementById('selectedCount')?.textContent).toBe('1 tool selected');
    expect(doc.getElementById('clearSelectionBtn')?.disabled).toBe(false);

    // Select all then Clear selection
    doc.getElementById('selectAllBtn')?.click();
    expect(doc.getElementById('selectAllBtn')?.disabled).toBe(true);
    expect(doc.getElementById('selectedCount')?.textContent).toBe(cards.length + ' tools selected');

    doc.getElementById('clearSelectionBtn')?.click();
    expect(doc.getElementById('savingsAmount')?.textContent).toBe('$0');
    expect(doc.getElementById('clearSelectionBtn')?.disabled).toBe(true);

    // Copy Canvas Link updates polite status region
    win.copyCanvasLink();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalled();
    expect(doc.getElementById('copyLinkStatus')?.textContent).toContain('Copied AlloFlow launch link');

    await runAxe(doc.body);
  });

  it('polishes for-districts.html, remediation.html, feedback.html (+ feedback.js), and packets.html with interactive feedback and zero axe violations', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    // 1) for-districts.html
    const dist = loadPageDom('for-districts.html', { reducedMotion: true });
    expect(dist.doc.querySelectorAll('table th:not([scope])').length).toBe(0);
    expect(dist.doc.querySelectorAll('i[data-lucide]:not([aria-hidden="true"])').length).toBe(0);
    expect(dist.doc.querySelectorAll('.reveal.visible').length).toBe(dist.doc.querySelectorAll('.reveal').length);
    const jumpPill = dist.doc.querySelector('.jump-nav a[href="#privacy"]');
    jumpPill.click();
    expect(jumpPill.getAttribute('aria-current')).toBe('location');
    expect(dist.doc.body.innerHTML).toContain('tools.html#directory-heading');
    await runAxe(dist.doc.body);

    // 2) remediation.html
    const rem = loadPageDom('remediation.html', { writeText });
    const copyShaBtn = rem.doc.querySelector('[data-copy-sha]');
    expect(copyShaBtn).toBeTruthy();
    copyShaBtn.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(copyShaBtn.getAttribute('data-copy-sha'));
    expect(rem.doc.getElementById('checksumCopyStatus')?.textContent).toContain('Copied SHA-256 checksum');
    await runAxe(rem.doc.body);

    // 3) feedback.html + feedback.js
    const fb = loadPageDom('feedback.html', { execScripts: true, extraScriptFiles: ['feedback.js'] });
    if (fb.doc.readyState === 'loading') {
      await new Promise((resolveReady) => fb.doc.addEventListener('DOMContentLoaded', resolveReady, { once: true }));
    } else {
      await new Promise((resolveReady) => setTimeout(resolveReady, 20));
    }
    const toolInput = fb.doc.getElementById('feedbackToolInput');
    expect(toolInput).toBeTruthy();
    toolInput.value = 'Water Cycle';
    toolInput.dispatchEvent(new fb.win.Event('input', { bubbles: true }));
    expect(fb.doc.getElementById('feedbackContext')?.hidden).toBe(false);
    expect(fb.doc.getElementById('feedbackContext')?.textContent).toContain('Water Cycle');
    expect(fb.doc.getElementById('ideaFeedback')?.href).toContain('Water+Cycle');
    expect(fb.doc.getElementById('feedbackToolClear')?.hidden).toBe(false);

    // IME Escape is ignored; normal Escape clears
    toolInput.dispatchEvent(new fb.win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(toolInput.value).toBe('Water Cycle');
    toolInput.dispatchEvent(new fb.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(toolInput.value).toBe('');
    expect(fb.doc.getElementById('feedbackContext')?.hidden).toBe(true);
    await runAxe(fb.doc.body);

    // 4) packets.html (strict CSP preserved, focusable main)
    const pk = loadPageDom('packets.html', { execScripts: false });
    expect(pk.raw).toContain("connect-src 'none'");
    expect(pk.doc.querySelector('main#main')?.getAttribute('tabindex')).toBe('-1');
    await runAxe(pk.doc.body);
  });
});
