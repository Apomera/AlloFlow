import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'data_lab/data_lab.html'), 'utf8');
const deployed = fs.readFileSync(path.join(root, 'prismflow-deploy/public/data_lab/data_lab.html'), 'utf8');
const axeSource = fs.readFileSync(path.join(root, 'prismflow-deploy/node_modules/axe-core/axe.min.js'), 'utf8');
const staticPage = source.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '');
const interactivePage = source
  .replace('<head>', '<head><base href="http://data-lab.test/data_lab/">')
  .replace("var CODAP_BASE = 'https://codap.concord.org/releases/latest/static/dg/en/cert/index.html';", "var CODAP_BASE = 'about:blank';");
const offlinePage = interactivePage.replace("'use strict';", "'use strict';\n  Object.defineProperty(Navigator.prototype, 'onLine', { configurable: true, get: function () { return false; } });");

describe('Data Lab companion accessibility in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  }, 30000);

  it('keeps the audited companion synchronized with its deployed copy', () => {
    expect(deployed).toBe(source);
  });

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 840 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    it(viewport.name + ' has no WCAG A/AA violations or horizontal overflow', async () => {
      const page = await browser.newPage({ viewport });
      await page.setContent(staticPage, { waitUntil: 'domcontentloaded' });
      await page.addScriptTag({ content: axeSource });

      const audit = await page.evaluate(async () => axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      }));
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        iframeTitle: document.querySelector('iframe')?.title,
      }));

      expect(audit.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target),
      }))).toEqual([]);
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
      expect(metrics.iframeTitle).toContain('CODAP');

      await page.focus('#askInput');
      const focus = await page.$eval('#askInput', (element) => {
        const style = getComputedStyle(element);
        return { width: style.outlineWidth, style: style.outlineStyle };
      });
      expect(focus).toEqual({ width: '3px', style: 'solid' });
      await page.close();
    });
  }

  it('provides a useful standalone tutor when AI is unavailable', async () => {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.setContent(interactivePage, { waitUntil: 'domcontentloaded' });

    await page.fill('#askInput', 'What should I notice first?');
    await page.click('#askBtn');
    const tutorMessages = await page.locator('.msg.tutor-msg').allTextContents();

    expect(await page.locator('.msg.student-msg').last().textContent()).toBe('What should I notice first?');
    expect(tutorMessages.at(-1)).toContain('something to chew on');
    expect(await page.locator('#askForm').getAttribute('aria-busy')).toBe('false');
    await page.close();
  }, 15000);

  it('shows an accessible retry state when the browser is offline', async () => {
    const context = await browser.newContext({ viewport: { width: 900, height: 700 } });
    const page = await context.newPage();
    await page.setContent(offlinePage, { waitUntil: 'domcontentloaded' });

    await expect.poll(async () => page.locator('#workspaceStatusText').textContent()).toContain('internet connection');
    expect(await page.locator('#retryWorkspace').isVisible()).toBe(true);
    expect(await page.locator('#codapRegion').getAttribute('aria-busy')).toBe('false');
    expect(await page.locator('#workspaceStatus').getAttribute('role')).toBe('status');
    await page.addScriptTag({ content: axeSource });
    const offlineAudit = await page.evaluate(async () => axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    }));
    expect(offlineAudit.violations.map((violation) => violation.id)).toEqual([]);
    await context.close();
  }, 15000);
});
