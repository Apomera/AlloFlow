import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
const start = source.indexOf('const sanitizeStyleForWCAG = (htmlContent, options = {}) => {');
const end = source.indexOf('\n  };', start) + 5;
const sanitize = new Function('fixContrastViolations', 'warnLog',
  source.slice(start, end) + '\nreturn sanitizeStyleForWCAG;')(
  html => ({ html, fixCount: 0 }), () => {},
);
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 30000);
afterAll(async () => { await browser?.close(); });

const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
const luminance = color => color.slice(0, 3).map(v => v / 255)
  .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const composite = (color, background) => color.slice(0, 3).map((v, i) => v * (color[3] ?? 1) + background[i] * (1 - (color[3] ?? 1)));
const fixture = (background, head = '') => '<html><head>' + head + '</head><body style="margin:32px;background:' + background + '">'
  + '<label style="display:inline-flex;padding:16px;background:' + background + ';color:inherit">Replace image '
  + '<input type="file" id="target" style="width:180px;outline:none"></label></body></html>';

async function focusedFacts(html, media = {}) {
  const page = await browser.newPage({ viewport: { width: 700, height: 350 } });
  try {
    await page.emulateMedia(media);
    await page.setContent(sanitize(html).html);
    await page.keyboard.press('Tab');
    return await page.locator('#target').evaluate(el => {
      const style = getComputedStyle(el);
      return {
        focused: document.activeElement === el,
        focusVisible: el.matches(':focus-visible'),
        outlineColor: style.outlineColor,
        outlineWidth: parseFloat(style.outlineWidth),
        outlineOffset: parseFloat(style.outlineOffset),
        boxShadow: style.boxShadow,
        background: getComputedStyle(el.parentElement).backgroundColor,
      };
    });
  } finally { await page.close(); }
}

describe('generated keyboard focus remains visible across document surfaces', () => {
  it.each([
    ['light', '#ffffff'],
    ['image-control slate', '#475569'],
    ['dark', '#0f172a'],
    ['middle gray', '#777777'],
  ])('provides a solid contrasting focus band on %s', async (_name, background) => {
    const facts = await focusedFacts(fixture(background));
    expect(facts.focused).toBe(true);
    expect(facts.focusVisible).toBe(true);
    expect(facts.outlineWidth).toBeGreaterThanOrEqual(2);
    const surface = rgb(facts.background);
    const bands = [rgb(facts.outlineColor), ...(facts.boxShadow.match(/rgba?\([^)]+\)/g) || []).map(rgb)];
    expect(Math.max(...bands.map(color => contrast(composite(color, surface), surface)))).toBeGreaterThanOrEqual(3);
  });

  it.each(['light', 'dark'])('retains a visible system-color outline in forced-colors %s', async colorScheme => {
    const facts = await focusedFacts(fixture('#475569'), { forcedColors: 'active', colorScheme });
    expect(facts.focused && facts.focusVisible).toBe(true);
    expect(facts.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(facts.boxShadow).toBe('none');
    expect(contrast(rgb(facts.outlineColor), rgb(facts.background))).toBeGreaterThanOrEqual(3);
  });

  it('upgrades the previous generated blue ring and remains idempotent', async () => {
    const legacy = '<style>/* a11y-focus-visible */\na:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:2px solid #2563eb;outline-offset:2px;box-shadow:0 0 0 4px rgba(37,99,235,0.18)}\n</style>';
    const once = sanitize(fixture('#475569', legacy)).html;
    const twice = sanitize(once).html;
    expect(twice.match(/\/\* a11y-focus-visible \*\//g)).toHaveLength(1);
    expect(twice).toBe(once);
    const facts = await focusedFacts(twice);
    const surface = rgb(facts.background);
    const bands = [rgb(facts.outlineColor), ...(facts.boxShadow.match(/rgba?\([^)]+\)/g) || []).map(rgb)];
    expect(Math.max(...bands.map(color => contrast(composite(color, surface), surface)))).toBeGreaterThanOrEqual(3);
  });
});

describe('generated document footnotes reflow', () => {
  it.each([320, 390])('wraps the source footnote URLs inside a %ipx viewport', async width => {
    const page = await browser.newPage({ viewport: { width, height: 700 } });
    try {
      const bodyRule = source.match(/^body \{ font-family: system-ui, -apple-system, sans-serif; max-width: 800px;[^\n]+/m)?.[0];
      const anchorRule = source.match(/^a \{ color: #2563eb;[^\n]+/m)?.[0];
      expect(bodyRule && anchorRule).toBeTruthy();
      const urls = ['www.lep.gov/resources/EOS_SOI_Philly_012716.pdf', 'https://www.justice.gov/crt/about/cor/lep/DOJFinLEPFRJun182002.pdf'];
      await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + bodyRule + anchorRule + '</style></head><body>'
        + urls.map(url => '<p><a href="' + url + '">' + url + '</a></p>').join('') + '</body></html>');
      const result = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        links: [...document.querySelectorAll('a')].map(a => ({ text: a.textContent, href: a.getAttribute('href'), rects: [...a.getClientRects()].map(r => ({ left: r.left, right: r.right })) })),
      }));
      expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport);
      expect(result.links.map(a => a.text)).toEqual(urls);
      expect(result.links.map(a => a.href)).toEqual(urls);
      for (const link of result.links) for (const rect of link.rects) expect(rect.right).toBeLessThanOrEqual(width - 31);
    } finally { await page.close(); }
  });
});
