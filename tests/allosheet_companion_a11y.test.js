import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet.css'), 'utf8');
const axeSource = fs.readFileSync(path.join(root, 'desktop', 'web-app', 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
const adapterSource = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_adapter.js'), 'utf8');
const analysisSource = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_analysis.js'), 'utf8');
const workspaceSource = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet_workspace.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'allo_sheet', 'allo_sheet.js'), 'utf8');
const staticPage = html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '')
  .replace(/<link rel="stylesheet" href="allo_sheet\.css(?:\?v=\d+)?">/, `<style>${css}</style>`)
  .replace(/<script(?:\s[^>]*)?><\/script>/gi, '');
const interactivePage = html
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, '<base href="https://allosheet.test/">')
  .replace(/<link rel="stylesheet" href="allo_sheet\.css(?:\?v=\d+)?">/, `<style>${css}</style>`)
  .replace(/<script src="allo_sheet_adapter\.js(?:\?v=\d+)?"><\/script>/, `<script>${adapterSource}</script>`)
  .replace(/<script src="allo_sheet_analysis\.js(?:\?v=\d+)?"><\/script>/, `<script>${analysisSource}</script>`)
  .replace(/<script src="allo_sheet_workspace\.js(?:\?v=\d+)?"><\/script>/, `<script>${workspaceSource}</script>`)
  .replace(/<script src="allo_sheet\.js(?:\?v=\d+)?"><\/script>/, `<script>${appSource}</script>`);

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

function hexToRgb(value) {
  const match = String(value).trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) throw new Error(`Expected a six-digit hex color, received ${value}`);
  return [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16));
}

function relativeLuminance(value) {
  const channels = hexToRgb(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('AlloSheet companion accessibility in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 60000);

  afterAll(() => {
    // On managed Windows runners Chromium exits, but Playwright's close promise
    // can remain pending after the process is gone. Trigger cleanup without
    // making that runner-specific transport delay fail the accessibility suite.
    if (browser) browser.close().catch(() => {});
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'reflow-320', width: 320, height: 800 },
  ]) {
    it(`${viewport.name} has no WCAG A/AA violations or page-level horizontal overflow`, async () => {
      const page = await browser.newPage({ viewport });
      await page.setContent(staticPage, { waitUntil: 'domcontentloaded' });
      await page.addScriptTag({ content: axeSource });

      const audit = await page.evaluate(async (tags) => axe.run(document, {
        runOnly: { type: 'tag', values: tags },
      }), wcagTags);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        tabCount: document.querySelectorAll('[role="tab"]').length,
        liveRegion: document.querySelector('#liveStatus')?.getAttribute('aria-live'),
        engineLiveRegion: document.querySelector('#engineStatus')?.getAttribute('aria-live'),
        advancedOpen: document.querySelector('#advancedConnection')?.open,
        documentFieldVisible: document.querySelector('#documentUrlInput')?.getClientRects().length > 0,
        tablistFits: document.querySelector('.view-tabs').scrollWidth <= document.querySelector('.view-tabs').clientWidth + 1,
        selectedCueVisible: getComputedStyle(
          document.querySelector('[role="tab"][aria-selected="true"] .tab-selected-cue')
        ).display !== 'none',
        minimumTargets: Array.from(document.querySelectorAll(
          '.advanced-connection summary, footer a, .radio-row input'
        )).filter((element) => element.getClientRects().length).map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            selector: element.matches('summary') ? 'summary' : element.tagName.toLowerCase(),
            width: rect.width,
            height: rect.height,
          };
        }),
      }));

      expect(audit.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => node.target),
      }))).toEqual([]);
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
      expect(metrics.tabCount).toBe(4);
      expect(metrics.liveRegion).toBe('polite');
      expect(metrics.engineLiveRegion).toBe('polite');
      expect(metrics.advancedOpen).toBe(false);
      expect(metrics.documentFieldVisible).toBe(false);
      expect(metrics.tablistFits).toBe(true);
      expect(metrics.selectedCueVisible).toBe(true);
      expect(metrics.minimumTargets.every((target) => target.width >= 24 && target.height >= 24)).toBe(true);

      await page.focus('#checkServiceButton');
      const focus = await page.$eval('#checkServiceButton', (element) => {
        const style = getComputedStyle(element);
        return { width: style.outlineWidth, style: style.outlineStyle };
      });
      expect(focus).toEqual({ width: '3px', style: 'solid' });
      await page.close();
    }, 15000);
  }

  it('keeps every visual theme at WCAG A/AA and preserves 3:1 control boundaries', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(staticPage, { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ content: axeSource });

    for (const theme of ['dark', 'light', 'contrast']) {
      await page.evaluate((nextTheme) => {
        document.documentElement.dataset.theme = nextTheme;
      }, theme);

      const result = await page.evaluate(async (tags) => {
        const rootStyle = getComputedStyle(document.documentElement);
        return {
          violations: (await axe.run(document, {
            runOnly: { type: 'tag', values: tags },
          })).violations.map((violation) => violation.id),
          colors: {
            line: rootStyle.getPropertyValue('--line').trim(),
            surface: rootStyle.getPropertyValue('--surface').trim(),
            surface2: rootStyle.getPropertyValue('--surface-2').trim(),
            surface3: rootStyle.getPropertyValue('--surface-3').trim(),
          },
        };
      }, wcagTags);

      expect(result.violations, `${theme} theme axe violations`).toEqual([]);
      for (const background of [result.colors.surface, result.colors.surface2, result.colors.surface3]) {
        expect(
          contrastRatio(result.colors.line, background),
          `${theme} boundary ${result.colors.line} against ${background}`
        ).toBeGreaterThanOrEqual(3);
      }
    }
    await page.close();
  }, 15000);

  // The header used to carry a single "High contrast" toggle. It read
  // "High contrast" in every state, and turning contrast back off fell through
  // to the OS color-scheme preference — so on a light-mode machine there was no
  // way to reach the dark theme at all. All three themes must be selectable by
  // name, and choosing one must actually apply it.
  it('offers all three themes by name and applies the one chosen', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(interactivePage, { waitUntil: 'domcontentloaded' });

    const picker = page.locator('#themeSelect');
    await expect.poll(() => picker.count()).toBe(1);
    expect(await picker.locator('option').allTextContents()).toEqual(['Dark', 'Light', 'High contrast']);
    expect(await page.locator('label[for="themeSelect"]').textContent()).toBe('Theme');

    // setContent serves an opaque origin, so sessionStorage throws here. That is
    // deliberate coverage of the persistence try/catch: theme switching has to
    // keep working when storage is unavailable.
    const applied = [];
    for (const theme of ['light', 'contrast', 'dark']) {
      await picker.selectOption(theme);
      applied.push(await page.evaluate(() => ({
        dataset: document.documentElement.dataset.theme,
        value: document.getElementById('themeSelect').value,
      })));
    }
    expect(applied.map((entry) => entry.dataset)).toEqual(['light', 'contrast', 'dark']);
    expect(applied.map((entry) => entry.value)).toEqual(['light', 'contrast', 'dark']);

    // The switch is announced by name, not as a contrast on/off state.
    await expect.poll(() => page.locator('#liveStatus').textContent()).toBe('Dark theme enabled.');
    await page.close();
  }, 15000);

  it('supports keyboard navigation, scrollable plan review, and an unclipped editor focus ring', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.route('https://allosheet.test/api/allosheet/**', (route) => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":"offline test"}',
    }));
    await page.route('https://allosheet.test/', (route) => route.fulfill({
      contentType: 'text/html',
      body: interactivePage,
    }));
    await page.goto('https://allosheet.test/', { waitUntil: 'domcontentloaded' });

    await page.focus('.skip-link');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#mainContent');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('mainContent');

    await page.focus('#editorTab');
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => ({
      active: document.activeElement?.id,
      selected: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
    }))).toEqual({ active: 'tableTab', selected: 'tableTab' });
    await page.keyboard.press('End');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('analysisTab');
    await page.keyboard.press('Home');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('editorTab');

    await page.evaluate(() => {
      document.querySelector('#planSection').hidden = false;
      const body = document.querySelector('#planBody');
      body.innerHTML = '<tr><td></td><th scope="row">1</th><td>Attendance</td><td>Not present</td><td>Present with a long reviewed value</td></tr>';
    });
    const planScroller = page.locator('#planSection .table-scroll');
    await planScroller.focus();
    const beforeScroll = await planScroller.evaluate((element) => element.scrollLeft);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const afterScroll = await planScroller.evaluate((element) => element.scrollLeft);
    expect(afterScroll).toBeGreaterThan(beforeScroll);

    await page.evaluate(() => {
      document.querySelector('#editorEmpty').hidden = true;
      document.querySelector('#gristFrame').hidden = false;
    });
    await page.focus('#gristFrame');
    const editorFocus = await page.evaluate(() => ({
      active: document.activeElement?.id,
      ring: getComputedStyle(document.querySelector('#editorView')).boxShadow,
    }));
    expect(editorFocus.active).toBe('gristFrame');
    expect(editorFocus.ring).not.toBe('none');
    expect(editorFocus.ring).toContain('inset');
    await page.close();
  }, 15000);

  it('survives WCAG text-spacing overrides and forced-colors mode at 320 CSS pixels', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
    await page.setContent(staticPage, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({
      content: `
        * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
        p { margin-bottom: 2em !important; }
      `,
    });
    await page.addScriptTag({ content: axeSource });

    const result = await page.evaluate(async (tags) => ({
      violations: (await axe.run(document, {
        runOnly: { type: 'tag', values: tags },
      })).violations.map((violation) => violation.id),
      pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      tabsFit: document.querySelector('.view-tabs').scrollWidth <= document.querySelector('.view-tabs').clientWidth + 1,
      selectedCueVisible: getComputedStyle(document.querySelector('.tab-selected-cue')).display !== 'none',
    }), wcagTags);

    expect(result.violations).toEqual([]);
    expect(result.pageFits).toBe(true);
    expect(result.tabsFit).toBe(true);
    expect(result.selectedCueVisible).toBe(true);

    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const forcedColors = await page.evaluate(() => ({
      pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      tabsFit: document.querySelector('.view-tabs').scrollWidth <= document.querySelector('.view-tabs').clientWidth + 1,
      selectedCueVisible: getComputedStyle(document.querySelector('.tab-selected-cue')).display !== 'none',
    }));
    expect(forcedColors).toEqual({ pageFits: true, tabsFit: true, selectedCueVisible: true });
    await page.close();
  }, 15000);

  it('automatically starts the managed engine and shows its workbook without exposing server fields', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    let startCalls = 0;
    let configCalls = 0;
    let slowConfig = false;
    let failNextRecordRead = false;
    let failRefreshAfterNextApply = false;
    let delayNextRecordRead = false;
    let delayNextApply = false;
    const gristOperations = [];

    await page.route('https://allosheet.test/api/allosheet/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/api/allosheet/config') {
        configCalls += 1;
        if (slowConfig) await new Promise((resolve) => setTimeout(resolve, 150));
        const ready = startCalls > 0;
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(ready
            ? {
                managedEngine: { phase: 'running', running: true },
                docId: 'managed-demo',
                editorUrl: 'https://sheet.local/doc/managed-demo',
              }
            : { managedEngine: true, phase: 'idle' }),
        });
        return;
      }
      if (pathname === '/api/allosheet/engine/status') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(startCalls
            ? { phase: 'running', running: true }
            : { phase: 'idle', installed: false, running: false }),
        });
        return;
      }
      if (pathname === '/api/allosheet/engine/start' && request.method() === 'POST') {
        startCalls += 1;
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ phase: 'running', installed: true, running: true }),
        });
        return;
      }
      if (pathname === '/api/allosheet/grist' && request.method() === 'POST') {
        const operation = request.postDataJSON();
        gristOperations.push(operation);
        if (operation.operation === 'listTables') {
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ tables: ['T'] }),
          });
          return;
        }
        if (operation.operation === 'readRecords') {
          if (delayNextRecordRead) {
            delayNextRecordRead = false;
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
          if (failNextRecordRead) {
            failNextRecordRead = false;
            await route.fulfill({
              status: 503,
              contentType: 'application/json',
              body: '{"error":"simulated post-write refresh failure"}',
            });
            return;
          }
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              records: [{
                id: 1,
                fields: { Value: ' Loaded from ' + operation.docId + ' ' },
              }],
            }),
          });
          return;
        }
        if (operation.operation === 'applyUpdates') {
          if (delayNextApply) {
            delayNextApply = false;
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
          if (failRefreshAfterNextApply) {
            failRefreshAfterNextApply = false;
            failNextRecordRead = true;
          }
          await route.fulfill({
            contentType: 'application/json',
            body: '{"updated":true}',
          });
          return;
        }
      }
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' });
    });
    await page.route('https://sheet.local/**', (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Managed workbook</title>',
    }));

    await page.setContent(interactivePage, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#serviceBadge')?.textContent === 'Ready');

    const result = await page.evaluate(() => ({
      badge: document.querySelector('#serviceBadge')?.textContent,
      detail: document.querySelector('#serviceDetail')?.textContent,
      frameHidden: document.querySelector('#gristFrame')?.hidden,
      frameUrl: document.querySelector('#gristFrame')?.src,
      tablesDisabled: document.querySelector('#loadTablesButton')?.disabled,
      advancedOpen: document.querySelector('#advancedConnection')?.open,
      documentFieldVisible: document.querySelector('#documentUrlInput')?.getClientRects().length > 0,
    }));

    expect(startCalls).toBe(1);
    expect(configCalls).toBeGreaterThanOrEqual(2);
    expect(result.badge).toBe('Ready');
    expect(result.detail).toContain('ready');
    expect(result.frameHidden).toBe(false);
    expect(result.frameUrl).toContain('/doc/managed-demo');
    expect(result.tablesDisabled).toBe(false);
    expect(result.advancedOpen).toBe(false);
    expect(result.documentFieldVisible).toBe(false);

    await page.click('#loadTablesButton');
    await page.waitForFunction(() => document.querySelectorAll('#tableSelect option').length === 2);
    await page.selectOption('#tableSelect', 'T');
    await page.click('#loadRecordsButton');
    await page.waitForFunction(() =>
      document.querySelector('#dataBody')?.textContent.includes('Loaded from managed-demo')
    );
    expect(await page.locator('.row-share-checkbox').count()).toBe(1);

    await page.locator('#advancedConnection').evaluate((details) => { details.open = true; });
    await page.fill('#documentIdInput', 'other-workbook');
    await page.locator('#documentIdInput').blur();
    await page.waitForFunction(() => document.querySelectorAll('.row-share-checkbox').length === 0);
    expect(await page.evaluate(() => ({
      rows: document.querySelectorAll('.row-share-checkbox').length,
      options: Array.from(document.querySelectorAll('#tableSelect option'), (option) => option.textContent),
      tableDisabled: document.querySelector('#tableSelect')?.disabled,
      loadRecordsDisabled: document.querySelector('#loadRecordsButton')?.disabled,
      planHidden: document.querySelector('#planSection')?.hidden,
      undoDisabled: document.querySelector('#undoButton')?.disabled,
    }))).toEqual({
      rows: 0,
      options: ['Load tables for this workbook'],
      tableDisabled: true,
      loadRecordsDisabled: true,
      planHidden: true,
      undoDisabled: true,
    });

    await page.click('#loadTablesButton');
    await page.waitForFunction(() => document.querySelectorAll('#tableSelect option').length === 2);
    await page.selectOption('#tableSelect', 'T');
    await page.click('#loadRecordsButton');
    await page.waitForFunction(() =>
      document.querySelector('#dataBody')?.textContent.includes('Loaded from other-workbook')
    );
    expect(gristOperations.some((operation) =>
      operation.operation === 'readRecords' && operation.docId === 'managed-demo'
    )).toBe(true);
    expect(gristOperations.some((operation) =>
      operation.operation === 'readRecords' && operation.docId === 'other-workbook'
    )).toBe(true);

    await page.click('#auditTab');
    await page.click('#runAuditButton');
    await page.getByRole('button', { name: 'Review whitespace cleanup' }).click();
    await page.click('#applyPlanButton');
    await page.waitForFunction(() => document.querySelector('#undoButton')?.disabled === false);

    await page.click('#auditTab');
    await page.click('#runAuditButton');
    await page.getByRole('button', { name: 'Review whitespace cleanup' }).click();
    const writesBeforeLockCheck = gristOperations.filter((operation) => operation.operation === 'applyUpdates').length;
    delayNextApply = true;
    await page.click('#applyPlanButton');
    expect(await page.locator('#undoButton').getAttribute('aria-disabled')).toBe('true');
    await page.evaluate(() => document.querySelector('#undoButton').click());
    await page.waitForFunction(() =>
      document.querySelector('#liveStatus')?.textContent.includes('current workbook write')
    );
    await page.waitForFunction(() => !document.querySelector('#applyPlanButton')?.hasAttribute('aria-busy'));
    expect(gristOperations.filter((operation) => operation.operation === 'applyUpdates').length).toBe(writesBeforeLockCheck + 1);
    expect(await page.locator('#undoButton').getAttribute('aria-disabled')).toBeNull();

    await page.click('#auditTab');
    await page.click('#runAuditButton');
    await page.getByRole('button', { name: 'Review whitespace cleanup' }).click();
    delayNextRecordRead = true;
    delayNextApply = true;
    await page.click('#loadRecordsButton');
    await page.evaluate(() => document.querySelector('#applyPlanButton').click());
    await page.waitForFunction(() =>
      document.querySelector('#liveStatus')?.textContent.includes('loaded data changed before refresh')
    );
    expect(await page.evaluate(() => ({
      rows: document.querySelectorAll('.row-share-checkbox').length,
      options: Array.from(document.querySelectorAll('#tableSelect option'), (option) => option.textContent),
      tableDisabled: document.querySelector('#tableSelect')?.disabled,
      auditText: document.querySelector('#auditResults')?.textContent,
    }))).toEqual({
      rows: 0,
      options: ['Load tables for this workbook'],
      tableDisabled: true,
      auditText: 'Run the local audit for the current loaded table.',
    });

    await page.click('#loadTablesButton');
    await page.waitForFunction(() => document.querySelectorAll('#tableSelect option').length === 2);
    await page.selectOption('#tableSelect', 'T');
    await page.click('#loadRecordsButton');
    await page.waitForFunction(() =>
      document.querySelector('#dataBody')?.textContent.includes('Loaded from other-workbook')
    );

    await page.click('#auditTab');
    await page.click('#runAuditButton');
    await page.getByRole('button', { name: 'Review whitespace cleanup' }).click();
    failRefreshAfterNextApply = true;
    await page.click('#applyPlanButton');
    await page.waitForFunction(() =>
      document.querySelector('#liveStatus')?.textContent.includes('current view could not be refreshed')
    );
    expect(await page.evaluate(() => ({
      rows: document.querySelectorAll('.row-share-checkbox').length,
      tableOptions: Array.from(document.querySelectorAll('#tableSelect option'), (option) => option.textContent),
      tableDisabled: document.querySelector('#tableSelect')?.disabled,
      auditText: document.querySelector('#auditResults')?.textContent,
      undoDisabled: document.querySelector('#undoButton')?.disabled,
    }))).toEqual({
      rows: 0,
      tableOptions: ['Load tables for this workbook'],
      tableDisabled: true,
      auditText: 'Run the local audit for the current loaded table.',
      undoDisabled: true,
    });
    expect(gristOperations.some((operation) =>
      operation.operation === 'applyUpdates' && operation.docId === 'other-workbook'
    )).toBe(true);

    await page.fill('#documentIdInput', '');
    await page.locator('#documentIdInput').blur();
    await page.locator('#advancedConnection').evaluate((details) => { details.open = false; });

    slowConfig = true;
    await page.click('#checkServiceButton');
    const busyFocus = await page.evaluate(() => ({
      active: document.activeElement?.id,
      ariaBusy: document.querySelector('#checkServiceButton')?.getAttribute('aria-busy'),
      ariaDisabled: document.querySelector('#checkServiceButton')?.getAttribute('aria-disabled'),
      nativeDisabled: document.querySelector('#checkServiceButton')?.disabled,
    }));
    expect(busyFocus).toEqual({
      active: 'checkServiceButton',
      ariaBusy: 'true',
      ariaDisabled: 'true',
      nativeDisabled: false,
    });
    await page.waitForFunction(() => !document.querySelector('#checkServiceButton')?.hasAttribute('aria-busy'));
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('checkServiceButton');

    await page.evaluate(() => { window.open = () => null; });
    await page.click('#openEditorButton');
    await page.waitForFunction(() =>
      document.querySelector('#liveStatus')?.textContent.includes('blocked the spreadsheet window')
    );
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('openEditorButton');

    await page.evaluate(() => {
      const details = document.querySelector('#advancedConnection');
      details.open = true;
      const input = document.querySelector('#documentUrlInput');
      input.value = 'not a valid URL';
      const openButton = document.querySelector('#openEditorButton');
      openButton.disabled = false;
      openButton.click();
    });
    const advancedError = await page.evaluate(() => ({
      visible: !document.querySelector('#advancedConnectionError')?.hidden,
      message: document.querySelector('#advancedConnectionError')?.textContent,
      invalid: document.querySelector('#documentUrlInput')?.getAttribute('aria-invalid'),
      active: document.activeElement?.id,
    }));
    expect(advancedError.visible).toBe(true);
    expect(advancedError.message).toContain('Invalid URL');
    expect(advancedError.invalid).toBe('true');
    expect(advancedError.active).toBe('documentUrlInput');
    await page.close();
  }, 30000);

  it('uses a validated Canvas opener for a zero-API local CSV workflow with edit, apply, undo, and hardened export', async () => {
    const context = await browser.newContext({ acceptDownloads: true });
    const token = 'a'.repeat(32);
    const canvasOrigin = 'https://canvas-host.googleusercontent.com';
    const companionOrigin = 'https://allosheet.test';
    let apiCalls = 0;

    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === canvasOrigin && url.pathname === '/host.html') {
        await route.fulfill({
          contentType: 'text/html',
          body: `<!doctype html>
            <button id="open" type="button">Open AlloSheet</button>
            <script>
              const token = '${token}';
              window.addEventListener('message', (event) => {
                const data = event.data || {};
                if (data.type !== 'allosheet-hello' || data.bridgeToken !== token) return;
                event.source.postMessage({
                  type: 'allosheet-ready',
                  ai: true,
                  version: 1,
                  bridgeToken: token
                }, event.origin);
              });
              document.querySelector('#open').addEventListener('click', () => {
                const origin = encodeURIComponent(location.origin);
                window.open(
                  '${companionOrigin}/allo_sheet/allo_sheet.html#bridgeToken=' + token + '&hostOrigin=' + origin,
                  'allosheet-canvas-test'
                );
              });
            <\/script>`,
        });
        return;
      }
      if (url.origin === companionOrigin && url.pathname === '/allo_sheet/allo_sheet.html') {
        await route.fulfill({ contentType: 'text/html', body: interactivePage });
        return;
      }
      if (url.origin === companionOrigin && url.pathname.startsWith('/api/allosheet/')) {
        apiCalls += 1;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: '{"error":"Canvas must not call this endpoint"}',
        });
        return;
      }
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
    });

    const host = await context.newPage();
    await host.goto(canvasOrigin + '/host.html');
    const popupPromise = host.waitForEvent('popup');
    await host.click('#open');
    const page = await popupPromise;
    await page.waitForFunction(() => document.querySelector('#serviceBadge')?.textContent === 'Canvas browser mode');
    expect(await page.locator('#askAgentButton').isDisabled()).toBe(true);
    await page.click('#authorizeHostButton');
    expect(await page.locator('#askAgentButton').isEnabled()).toBe(true);

    await page.setInputFiles('#canvasCsvInput', {
      name: 'students.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Name,Score,Note\n" Ada ",3,"=HYPERLINK(""https://bad.invalid"")"\nBen,4,"line one\nline two"', 'utf8'),
    });
    await page.waitForFunction(() => document.querySelectorAll('.canvas-cell-input').length === 6);

    expect(apiCalls).toBe(0);
    expect(await page.locator('#canvasFallback').isVisible()).toBe(true);
    expect(await page.locator('#advancedConnection').isVisible()).toBe(false);
    expect(await page.locator('#editorEmptyDetail').textContent()).toContain('.xlsx');
    expect(await page.getByLabel('Note, record 2').inputValue()).toBe('line one\nline two');

    await page.click('#askAgentButton');
    expect(await page.evaluate(() => ({
      error: document.querySelector('#agentError')?.textContent,
      hidden: document.querySelector('#agentError')?.hidden,
      invalid: document.querySelector('#agentInstruction')?.getAttribute('aria-invalid'),
      active: document.activeElement?.id,
    }))).toEqual({
      error: 'Write an instruction for AlloSheet first.',
      hidden: false,
      invalid: 'true',
      active: 'agentInstruction',
    });

    await page.fill('#agentInstruction', 'Standardize selected attendance values.');
    await page.check('input[name="agentScope"][value="selected-values"]');
    await page.click('#askAgentButton');
    expect(await page.evaluate(() => ({
      activeClass: document.activeElement?.className,
      error: document.querySelector('#agentError')?.textContent,
      selectedTab: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
    }))).toEqual({
      activeClass: 'row-share-checkbox',
      error: 'Select at least one row in the accessible table first.',
      selectedTab: 'tableTab',
    });

    await page.check('.row-share-checkbox');
    expect(await page.locator('#agentError').isHidden()).toBe(true);
    await page.click('#askAgentButton');
    expect(await page.evaluate(() => ({
      active: document.activeElement?.id,
      error: document.querySelector('#agentError')?.textContent,
      invalid: document.querySelector('#valuesConsent')?.getAttribute('aria-invalid'),
    }))).toEqual({
      active: 'valuesConsent',
      error: 'Review the currently selected rows and confirm sharing for this request.',
      invalid: 'true',
    });
    await page.check('#valuesConsent');
    await page.check('input[name="agentScope"][value="structure-only"]');

    const directCell = page.getByLabel('Name, record 1');
    await directCell.fill('Ava');
    await directCell.blur();
    expect(await directCell.inputValue()).toBe('Ava');
    await page.click('#undoButton');
    expect(await page.getByLabel('Name, record 1').inputValue()).toBe(' Ada ');
    expect(await page.locator('#undoButton').isDisabled()).toBe(true);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('dataTableScroll');

    await page.click('#auditTab');
    await page.click('#runAuditButton');
    await page.getByRole('button', { name: 'Review whitespace cleanup' }).click();

    await page.addScriptTag({ content: axeSource });
    const visiblePlanViolations = await page.evaluate(async (tags) => (await axe.run(document, {
      runOnly: { type: 'tag', values: tags },
    })).violations.map((violation) => violation.id), wcagTags);
    expect(visiblePlanViolations).toEqual([]);

    const targetSizes = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.row-share-checkbox, .plan-change-checkbox'))
        .filter((element) => element.getClientRects().length)
        .map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    );
    expect(targetSizes.length).toBeGreaterThan(0);
    expect(targetSizes.every((target) => target.width >= 24 && target.height >= 24)).toBe(true);

    const planScroller = page.locator('#planSection .table-scroll');
    await planScroller.focus();
    const planScrollBefore = await planScroller.evaluate((element) => element.scrollLeft);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    expect(await planScroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(planScrollBefore);

    await page.evaluate(() => {
      window.__allosheetLiveMessages = [];
      window.__allosheetLiveObserver = new MutationObserver(() => {
        const value = document.querySelector('#liveStatus')?.textContent;
        if (value) window.__allosheetLiveMessages.push(value);
      });
      window.__allosheetLiveObserver.observe(document.querySelector('#liveStatus'), {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
    await page.click('#applyPlanButton');
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('dataTableScroll');
    expect(await page.getByLabel('Name, record 1').inputValue()).toBe('Ada');
    await page.waitForTimeout(50);
    const liveMessages = await page.evaluate(() => window.__allosheetLiveMessages);
    expect(liveMessages.some((message) => message.includes('reviewed local change') && message.includes('applied'))).toBe(true);
    expect(liveMessages.some((message) => message.includes('discarded'))).toBe(false);
    await page.click('#undoButton');
    expect(await page.getByLabel('Name, record 1').inputValue()).toBe(' Ada ');
    expect(await page.locator('#undoButton').isDisabled()).toBe(true);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('dataTableScroll');

    const downloadPromise = page.waitForEvent('download');
    await page.click('#downloadCanvasCsvButton');
    const download = await downloadPromise;
    const downloadPath = await download.path();
    const exported = fs.readFileSync(downloadPath, 'utf8');
    expect(download.suggestedFilename()).toBe('students_reviewed.csv');
    expect(exported).toContain(`"'=HYPERLINK(""https://bad.invalid"")"`);
    expect(exported).toContain('"line one\nline two"');
    expect(apiCalls).toBe(0);

    await page.setInputFiles('#canvasCsvInput', {
      name: 'too-long.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Name,Note\nA,' + 'x'.repeat(1201), 'utf8'),
    });
    await page.waitForFunction(() =>
      document.querySelector('#canvasFileStatus')?.textContent.includes('exceeds 1,200')
    );
    expect(await page.locator('.canvas-cell-input').count()).toBe(6);
    expect(await page.getByLabel('Name, record 1').inputValue()).toBe(' Ada ');

    const violations = await page.evaluate(async (tags) => (await axe.run(document, {
      runOnly: { type: 'tag', values: tags },
    })).violations.map((violation) => violation.id), wcagTags);
    expect(violations).toEqual([]);
    await context.close();
  }, 20000);
});
