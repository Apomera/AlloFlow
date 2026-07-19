import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'data_lab/data_lab.html'), 'utf8');
const deployed = fs.readFileSync(path.join(root, 'prismflow-deploy/public/data_lab/data_lab.html'), 'utf8');
const axeSource = fs.readFileSync(path.join(root, 'prismflow-deploy/node_modules/axe-core/axe.min.js'), 'utf8');
const staticPage = source.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '');

describe('Data Lab companion accessibility in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

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
});
