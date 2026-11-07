import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Independent hunt (2026-11-04): where the Topics bar is sticky, a control
// reached by Shift+Tab must not land fully under it (WCAG 2.4.11).
const FILE = process.env.HEATLAB_SRC || 'stem_lab/stem_tool_heatlab.js';
const root = process.cwd();
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');

function mountedHtml() {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  window.StemLab.makeBayViewer = () => ({ attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; } });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return new Proxy({ canvas: this, measureText: (s) => ({ width: String(s).length * 7 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
      { get: (target, key) => (key in target ? target[key] : () => {}) });
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  const cfg = loadTool(FILE, 'heatLab');
  const host = document.createElement('div');
  document.body.appendChild(host);
  let rootNode;
  function Panel() {
    const [toolData, setToolData] = React.useState({});
    return cfg.render(makeCtx({ toolData, setToolData, gradeBand: 'g68', theme: 'light', isDark: false, isContrast: false }));
  }
  React.act(() => { rootNode = ReactDOMClient.createRoot(host); rootNode.render(React.createElement(Panel)); });
  const html = host.innerHTML;
  React.act(() => rootNode.unmount());
  host.remove();
  return html;
}

describe('Heat Lab sticky Topics bar and keyboard focus', () => {
  let browser, previousAct;
  beforeAll(async () => {
    previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    browser = await chromium.launch({ headless: true });
  });
  afterAll(async () => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; if (browser) await browser.close(); }, 30000);
  afterEach(() => { vi.restoreAllMocks(); });

  it('keeps every control reached by Shift+Tab clear of the bar at 1280 x 800', async () => {
    const rendered = prepareStemBrowserRender(mountedHtml());
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: appCss });
    for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
    await page.evaluate(() => { scrollTo(0, document.documentElement.scrollHeight); document.querySelector('#htsec-conduction [data-ht-pager] button').focus(); });
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-ht-topicbar]')).position)).toBe('sticky');
    const covered = [];
    let visited = 0;
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Shift+Tab');
      const r = await page.evaluate(() => {
        const a = document.activeElement, bar = document.querySelector('[data-ht-topicbar]');
        if (!a || a === document.body || bar.contains(a)) return null;
        const ar = a.getBoundingClientRect(), br = bar.getBoundingClientRect();
        return { name: (a.getAttribute('aria-label') || a.innerText || a.type || a.tagName).slice(0, 50), bottom: Math.round(ar.bottom), barBottom: Math.round(br.bottom) };
      });
      if (!r) break;
      visited++;
      if (r.bottom <= r.barBottom) covered.push(r);
    }
    await page.close();
    expect(visited).toBeGreaterThan(20);
    expect(covered).toEqual([]);
  }, 120000);
});
