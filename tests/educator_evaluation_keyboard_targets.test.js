// Runtime backing for the accessibility claims the user manual makes: keyboard
// operability and a 44px minimum on real controls. The repo's static
// scan_mouse_only_controls.cjs only reads stem_tool_*.js, so it has never seen
// this tool; these assertions run against the rendered DOM instead.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const PAGE = pathToFileURL(path.join(process.cwd(), 'desktop', 'web-app', 'public', 'educator-evaluation.html')).href;
const TABS = ['Overview', 'Trends', 'Staff', 'Walkthroughs', 'Formal observations', 'SPM / SLO', 'Reports & audit', 'Setup'];

describe('Educator Evaluation: keyboard and touch targets', () => {
  let browser;

  beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  const open = async (viewport) => {
    const page = await browser.newPage({ viewport });
    await page.goto(PAGE);
    await page.waitForSelector('.ae-onboarding-overlay .ae-onboarding-option');
    await page.locator('.ae-onboarding-overlay .ae-onboarding-option').nth(1).click();
    await page.waitForSelector('.ae-tabs');
    await page.waitForTimeout(400);
    return page;
  };

  it('moves between tabs with arrow keys, which is what makes roving tabindex legitimate', async () => {
    const page = await open({ width: 1180, height: 900 });
    // Unselected tabs carry tabIndex -1 on purpose; that is only correct if the
    // arrow keys move focus, otherwise seven tabs are unreachable by keyboard.
    const unselected = await page.locator('.ae-tab[aria-selected="false"]').first().evaluate((el) => el.tabIndex);
    expect(unselected).toBe(-1);
    await page.locator('.ae-tab[aria-selected="true"]').focus();
    const before = await page.evaluate(() => document.activeElement.textContent.trim());
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => document.activeElement.textContent.trim());
    expect(after).not.toBe(before);
    await page.keyboard.press('End');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.activeElement.textContent.trim())).toBe('Setup');
    await page.close();
  }, 60000);

  it('holds two floors: 44px for primary controls, and the 24px WCAG minimum for every control', async () => {
    for (const viewport of [{ width: 1180, height: 900 }, { width: 402, height: 800 }]) {
      const page = await open(viewport);
      const undersized = [];
      for (const tab of TABS) {
        await page.locator('.ae-tab', { hasText: tab }).first().click();
        await page.waitForTimeout(250);
        const found = await page.evaluate(() => {
          const scope = document.querySelector('.ae-workspace') || document.body;
          const visible = (el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0;
          const label = (el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40);
          // Inline text links are exempt from target sizing; these are all real controls.
          const controls = [...scope.querySelectorAll('button,select,input:not([type="hidden"]),textarea')].filter(visible);
          const belowWcag = controls
            .filter((el) => el.getBoundingClientRect().height < 24)
            .map((el) => 'UNDER-24 ' + label(el));
          // The 44px floor covers primary controls. Compact in-table row buttons and
          // checkboxes are inherently small and are held to the 24px floor above.
          const belowPrimary = controls
            .filter((el) => !el.classList.contains('ae-row-btn'))
            .filter((el) => !/^(checkbox|radio)$/.test(el.getAttribute('type') || ''))
            .filter((el) => el.getBoundingClientRect().height < 44)
            .map((el) => 'UNDER-44 ' + label(el));
          return [...belowWcag, ...belowPrimary];
        });
        undersized.push(...found.map((entry) => `${tab}: ${entry}`));
      }
      expect(undersized, `viewport ${viewport.width}px`).toEqual([]);
      await page.close();
    }
  }, 120000);

  it('leaves no interactive control that a keyboard cannot reach', async () => {
    const page = await open({ width: 1180, height: 900 });
    const stranded = [];
    for (const tab of TABS) {
      await page.locator('.ae-tab', { hasText: tab }).first().click();
      await page.waitForTimeout(250);
      const found = await page.evaluate(() => {
        const scope = document.querySelector('.ae-workspace') || document.body;
        return [...scope.querySelectorAll('[role="button"],[role="checkbox"],[role="switch"],[role="link"],[onclick]')]
          .filter((el) => el.offsetParent !== null)
          .filter((el) => !(el.matches('a[href],button,input,select,textarea,summary') || el.tabIndex >= 0))
          .map((el) => el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 30));
      });
      stranded.push(...found.map((label) => `${tab}: ${label}`));
    }
    expect(stranded).toEqual([]);
    await page.close();
  }, 90000);
});
