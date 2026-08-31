import { test, expect, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const APP_CSS_FILE = readdirSync(join(ROOT, 'desktop/web-app/public/app/static/css'))
  .filter((name) => /^main\.[a-f0-9]+\.css$/.test(name))
  .sort()
  .at(-1);
if (!APP_CSS_FILE) throw new Error('Space Explorer harness could not find the compiled app stylesheet.');

const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>Space Explorer usability harness</title>
<link rel="stylesheet" href="/desktop/web-app/public/app/static/css/${APP_CSS_FILE}">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;min-height:100%;background:#020617;color:#f8fafc}
  body{font-family:ui-sans-serif,system-ui,sans-serif}
  #wrap{width:min(100%,960px);margin:0 auto;padding:16px}
</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script>
  window.__events = { errors: [], toasts: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.addEventListener('unhandledrejection', function (e) { window.__events.errors.push('unhandled: ' + e.reason); });
  window.StemLab = {
    _registry: {},
    registerTool: function (id, cfg) { cfg.id = id; this._registry[id] = cfg; },
    isRegistered: function (id) { return !!this._registry[id]; }
  };
  window.__mount = function (seed) {
    var cfg = window.StemLab._registry.spaceExplorer;
    var root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root = root;
    function Harness() {
      var state = React.useState({ spaceExplorer: seed || {} });
      var toolData = state[0], setToolData = state[1];
      React.useEffect(function () { window.__state = toolData.spaceExplorer || {}; }, [toolData]);
      return cfg.render({
        React: React,
        toolData: toolData,
        setToolData: setToolData,
        addToast: function (message, kind) { window.__events.toasts.push({ message: message, kind: kind }); },
        callGemini: null,
        awardXP: function () {},
        icons: {},
        viewportWidth: window.innerWidth,
        t: function (key, fallback) { return fallback == null ? key : fallback; }
      });
    }
    root.render(React.createElement(Harness));
  };
</script></body></html>`;

let server: Server;
let base = '';

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__harness') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(HARNESS);
      return;
    }
    try {
      const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
      const file = join(ROOT, rel);
      if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function mount(page: Page, seed: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.addScriptTag({ url: '/stem_lab/stem_tool_spaceexplorer.js' });
  await page.addScriptTag({ url: '/desktop/web-app/node_modules/axe-core/axe.min.js' });
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.spaceExplorer);
  await page.evaluate((value) => (window as any).__mount(value), seed);
  await page.locator('[data-spaceexplorer-ux]').waitFor({ state: 'visible' });
}

async function axeViolations(page: Page) {
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.getElementById('wrap'), {
      rules: { region: { enabled: false } }
    });
    return result.violations.map((violation: any) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node: any) => node.target.join(' ')),
      summaries: violation.nodes.map((node: any) => node.failureSummary),
      html: violation.nodes.map((node: any) => node.html),
    }));
  });
}

test.describe('Space Explorer usability and contrast', () => {
  test('keeps the first-run path readable at desktop and phone widths', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await mount(page);

    await expect(page.locator('[data-spaceexplorer-quickstart]')).toBeVisible();
    const cards = page.locator('.se-destination-grid > [role="listitem"]');
    await expect(cards).toHaveCount(9);
    await expect.poll(async () => {
      const xPositions = await cards.evaluateAll((items) => items.slice(0, 2).map((item) => item.getBoundingClientRect().x));
      return xPositions[1] - xPositions[0];
    }).toBeGreaterThan(0);
    const desktopBoxes = await cards.evaluateAll((items) => items.slice(0, 2).map((item) => {
      const rect = item.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width };
    }));
    expect(desktopBoxes[1].x).toBeGreaterThan(desktopBoxes[0].x);
    expect(desktopBoxes[0].width).toBeGreaterThan(300);

    const firstMission = page.getByRole('button', { name: /^Mars\./ });
    const firstBox = await firstMission.boundingBox();
    expect(firstBox?.height || 0).toBeGreaterThanOrEqual(44);
    await firstMission.focus();
    const focus = await firstMission.evaluate((el) => {
      const style = getComputedStyle(el);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
    });
    expect(focus.style).toBe('solid');
    expect(focus.width).toBeGreaterThanOrEqual(3);
    expect(await axeViolations(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: 'test-results/space-explorer-usability-wide.png', fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page);
    const phoneBoxes = await page.locator('.se-destination-grid > [role="listitem"]').evaluateAll((items) => items.slice(0, 2).map((item) => {
      const rect = item.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width };
    }));
    expect(Math.abs(phoneBoxes[1].x - phoneBoxes[0].x)).toBeLessThan(2);
    expect(phoneBoxes[1].y).toBeGreaterThan(phoneBoxes[0].y);
    expect(phoneBoxes[0].width).toBeGreaterThan(330);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/space-explorer-usability-phone.png', fullPage: true });
  });

  test('guides a staged maneuver route with readable cabin labels on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page);

    await page.getByRole('button', { name: /^Mars\./ }).click();
    const interior = page.locator('[data-spaceexplorer-interior]');
    await expect(interior).toBeVisible();

    const maneuver = interior.locator('[data-spaceexplorer-interior-condition="maneuver"]');
    const engineering = interior.locator('[data-spaceexplorer-interior-target="engineering"]');
    await maneuver.click();
    await engineering.click();

    const recommendation = interior.locator('[data-spaceexplorer-staged-route="recommendation"]');
    const activateStagedRoute = recommendation.locator('[data-spaceexplorer-next-brake="lab"]');
    await expect(recommendation).toBeVisible();
    await expect(recommendation.locator('[data-spaceexplorer-staged-route-summary="recommendation"]')).toContainText('Flight → Lab → Med → Engineering');
    await expect(activateStagedRoute).toContainText('Use Science lab as the next braking point');

    for (const control of [maneuver, engineering, activateStagedRoute]) {
      const box = await control.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }

    await activateStagedRoute.click();
    await expect(interior.locator('#se-staged-route-status')).toBeFocused();
    await expect(interior.locator('[data-spaceexplorer-staged-route="active"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-staged-route-visual="true"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-final-target="engineering"]')).toHaveText('Engineering');
    await expect(interior.locator('[data-spaceexplorer-active-next-brake="lab"]')).toContainText('Science lab');
    await expect(interior.locator('[data-spaceexplorer-next-brake-point="lab"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-zone-state="next-brake"]')).toContainText('Lab');

    const gentleMove = interior.locator('[data-spaceexplorer-interior-strategy="gentle"]');
    const directRoute = interior.locator('[data-spaceexplorer-use-direct-route="true"]');
    for (const control of [gentleMove, directRoute]) {
      const box = await control.boundingBox();
      expect(box?.height || 0).toBeGreaterThanOrEqual(44);
    }

    await gentleMove.click();
    await expect(interior.locator('[data-spaceexplorer-interior-position="lab"]')).toHaveText('Science lab');
    await expect(interior.locator('[data-spaceexplorer-final-target="engineering"]')).toHaveText('Engineering');
    await expect(interior.locator('[data-spaceexplorer-active-next-brake="medbay"]')).toContainText('Medical bay');
    await expect(interior.locator('[data-spaceexplorer-next-brake-point="medbay"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-staged-route-summary="active"]')).toContainText('Lab → Med → Engineering');
    await expect(interior.locator('[data-spaceexplorer-route-legend="staged"]')).toContainText('bright ring = next braking point');
    await expect.poll(async () => page.evaluate(() => {
      const orientation = (window as any).__state.interiorOrientation;
      return { position: orientation.position, target: orientation.target, routeMode: orientation.routeMode };
    })).toEqual({ position: 'lab', target: 'engineering', routeMode: 'staged' });

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/space-explorer-staged-route-phone.png', fullPage: true });

    await page.setViewportSize({ width: 320, height: 800 });
    const cabinVisual = interior.locator('[data-spaceexplorer-interior-visual="perspective"]');
    const labelMetrics = await cabinVisual.locator('[data-spaceexplorer-svg-label]').evaluateAll((labels) => labels.map((label) => {
      const node = label as SVGTextElement;
      const matrix = node.getScreenCTM();
      const bounds = node.getBBox();
      const viewBox = node.ownerSVGElement!.viewBox.baseVal;
      return {
        text: node.textContent || '',
        screenFontPx: parseFloat(getComputedStyle(node).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0),
        insideSvg: bounds.x >= viewBox.x && bounds.y >= viewBox.y && bounds.x + bounds.width <= viewBox.x + viewBox.width && bounds.y + bounds.height <= viewBox.y + viewBox.height,
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        viewBox: { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height },
      };
    }));
    expect(labelMetrics.length).toBeGreaterThanOrEqual(6);
    for (const metric of labelMetrics) {
      expect(metric.screenFontPx, `${metric.text} should remain at least 11 screen pixels`).toBeGreaterThanOrEqual(11);
      expect(metric.insideSvg, `${metric.text} should remain inside the cabin SVG: ${JSON.stringify({ bounds: metric.bounds, viewBox: metric.viewBox })}`).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await directRoute.click();
    await expect(interior.locator('#se-interior-route-preview')).toBeFocused();
    await expect(interior.locator('[data-spaceexplorer-staged-route="active"]')).toHaveCount(0);
  });

  test('guides a mission without stealing focus or number keys from typing', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await mount(page);

    await page.getByRole('button', { name: /^Mars\./ }).click();
    await expect(page.getByText('Step 2 of 5')).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to destinations/ })).toBeVisible();
    const interior = page.locator('[data-spaceexplorer-interior]');
    await expect(interior).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-interior-visual="perspective"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-interior-target="lab"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await axeViolations(page)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    const interiorColumns = await interior.locator('.se-two-column-grid').first().locator(':scope > div').evaluateAll((items) => items.slice(0, 2).map((item) => {
      const rect = item.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width };
    }));
    expect(Math.abs(interiorColumns[1].x - interiorColumns[0].x)).toBeLessThan(2);
    expect(interiorColumns[1].y).toBeGreaterThan(interiorColumns[0].y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/space-explorer-interior-phone.png', fullPage: true });
    await page.setViewportSize({ width: 900, height: 900 });

    const maneuverCondition = interior.locator('[data-spaceexplorer-interior-condition="maneuver"]');
    await maneuverCondition.click();
    await expect(maneuverCondition).toHaveAttribute('aria-pressed', 'true');
    await expect(interior.locator('[data-spaceexplorer-interior-condition-status="maneuver"]')).toContainText('Station maneuver');
    await expect(interior.locator('[data-spaceexplorer-interior-route-preview="maneuver"]')).toContainText('Station maneuver');

    await interior.locator('[data-spaceexplorer-interior-target="medbay"]').click();
    await expect(interior.locator('[data-spaceexplorer-interior-prediction="gentle"]')).toHaveAttribute('data-predicted-control', 'recovery');
    await expect(interior.locator('[data-spaceexplorer-interior-prediction="gentle"]')).toContainText('Recovery likely');
    await interior.locator('[data-spaceexplorer-interior-strategy="gentle"]').click();
    await expect(interior.locator('[data-spaceexplorer-interior-position]')).toHaveText('Medical bay');
    await expect(interior.locator('[data-spaceexplorer-interior-result="recovery"]')).toContainText('Recovery needed');
    await expect(interior.locator('[data-spaceexplorer-interior-trace="overshoot"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-interior-overshoot-marker="true"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-interior-trace-summary="overshoot"]')).toContainText('overshoot and recovery');
    await expect(interior.locator('.se-motion-trace')).toHaveCSS('animation-name', 'se-motion-trace-draw');
    expect(await interior.locator('.se-motion-trace').evaluate((path) => (path as SVGPathElement).getTotalLength())).toBeGreaterThan(0);
    expect(await axeViolations(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/space-explorer-interior-overshoot.png', fullPage: true });

    await interior.locator('[data-spaceexplorer-interior-target="lab"]').click();
    await expect(interior.locator('[data-spaceexplorer-interior-prediction="gentle"]')).toHaveAttribute('data-predicted-control', 'controlled');

    await interior.locator('[data-spaceexplorer-interior-strategy="rail"]').click();
    await expect(interior.locator('[data-spaceexplorer-interior-position]')).toHaveText('Science lab');
    await expect(interior.locator('[data-spaceexplorer-interior-result="controlled"]')).toContainText('Controlled arrival');
    await expect(interior.locator('[data-spaceexplorer-interior-trace="controlled"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-interior-trace-summary="controlled"]')).toContainText('controlled stop');
    await expect(interior.locator('[data-spaceexplorer-interior-overshoot-marker]')).toHaveCount(0);

    const quickWork = interior.locator('[data-spaceexplorer-work-choice="quick"]');
    const securedWork = interior.locator('[data-spaceexplorer-work-choice="secured"]');
    await expect(quickWork).toHaveAttribute('data-predicted-control', 'recovery');
    await expect(securedWork).toHaveAttribute('data-predicted-control', 'controlled');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(quickWork).toBeVisible();
    await expect(securedWork).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await axeViolations(page)).toEqual([]);

    await quickWork.click();
    await expect(interior.locator('[data-spaceexplorer-work-result="recovery"]')).toContainText('Work recovery needed');
    await expect(interior.locator('[data-spaceexplorer-work-marker="recovery"]')).toHaveCount(1);
    await expect(interior.locator('[data-spaceexplorer-work-result="recovery"]')).toContainText('activity remains incomplete');
    await expect(interior.locator('[data-spaceexplorer-work-corrections="1"]')).toContainText('1 work correction');
    await expect(interior.locator('[data-spaceexplorer-work-attempts="1"]')).toContainText('1 work attempt');
    await expect(interior.locator('[data-spaceexplorer-interior-progress]')).toContainText('0 of 2 activities');
    const failedWork = await page.evaluate(() => {
      const orientation = (window as any).__state.interiorOrientation;
      return {
        labComplete: !!orientation.tasks.lab,
        attempts: orientation.activityAttempts.lab,
        corrections: orientation.activityRecoveryCount,
        controlled: orientation.lastActivityResult.controlled,
      };
    });
    expect(failedWork).toEqual({ labComplete: false, attempts: 1, corrections: 1, controlled: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/space-explorer-work-recovery-phone.png', fullPage: true });


    await interior.locator('[data-spaceexplorer-interior-target="medbay"]').click();
    await expect(interior.locator('[data-spaceexplorer-work-result="recovery"]')).toContainText('Work recovery needed');
    await expect(interior.locator('[data-spaceexplorer-work-marker="recovery"]')).toHaveCount(1);
    await securedWork.click();
    await expect(interior.locator('[data-spaceexplorer-work-result="secured"]')).toContainText('Procedure secured');
    await expect(interior.locator('[data-spaceexplorer-interior-activity-complete="lab"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-work-marker="secured"]')).toHaveCount(1);
    await expect(interior.locator('#se-interior-feedback')).toBeFocused();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('se-interior-feedback');
    await page.screenshot({ path: 'test-results/space-explorer-work-secured-phone.png', fullPage: true });
    await expect(interior.locator('[data-spaceexplorer-interior-progress]')).toContainText('1 of 2 activities');
    const securedRetry = await page.evaluate(() => {
      const orientation = (window as any).__state.interiorOrientation;
      return {
        labComplete: !!orientation.tasks.lab,
        attempts: orientation.activityAttempts.lab,
        corrections: orientation.activityRecoveryCount,
        controlled: orientation.lastActivityResult.controlled,
      };
    });
    expect(securedRetry).toEqual({ labComplete: true, attempts: 2, corrections: 1, controlled: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
    await page.setViewportSize({ width: 900, height: 900 });

    await interior.locator('[data-spaceexplorer-interior-target="medbay"]').click();
    await interior.locator('[data-spaceexplorer-interior-strategy="gentle"]').click();
    await expect(interior.locator('[data-spaceexplorer-interior-position]')).toHaveText('Medical bay');
    await interior.locator('[data-spaceexplorer-work-choice="secured"]').click();
    await expect(interior.locator('[data-spaceexplorer-interior-activity-complete="medbay"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-maneuver-safe="2"]')).toContainText('2 maneuver-safe');
    await expect(interior.locator('[data-spaceexplorer-work-corrections="1"]')).toContainText('1 work correction');
    await expect(interior.locator('[data-spaceexplorer-interior-progress]')).toContainText('Cabin ready');
    await expect(interior.locator('[data-spaceexplorer-interior-result]')).toContainText('orientation complete');
    await page.getByRole('button', { name: /Continue to power setup/ }).click();

    await expect(page.getByText('Step 3 of 5')).toBeVisible();
    await expect(page.locator('[data-spaceexplorer-preflight]')).toContainText('Cabin orientation complete');
    await expect(page.locator('[data-spaceexplorer-preflight]')).toContainText('Maneuver route practiced.');
    await page.getByRole('button', { name: /Back to briefing/ }).click();
    await expect(page.getByText('Step 2 of 5')).toBeVisible();
    await expect(page.locator('[data-spaceexplorer-interior-progress]')).toContainText('Cabin ready');
    await page.getByRole('button', { name: /Continue to power setup/ }).click();
    await expect(page.getByText('Step 3 of 5')).toBeVisible();

    const balanced = page.getByRole('button', { name: 'Use balanced preset' });
    await balanced.click();
    await expect(balanced).toBeFocused();

    await page.getByRole('button', { name: 'End current mission' }).click();
    await expect(page.getByRole('alert')).toContainText('Current mission progress will be cleared');
    await page.getByRole('button', { name: 'Keep playing' }).click();
    await expect(page.locator('[data-spaceexplorer-ux="power-allocation"]')).toBeVisible();

    await page.getByRole('button', { name: 'Launch Turn' }).click();
    const event = page.locator('[role="region"][aria-labelledby="se-event-title"]');
    await expect(event).toBeVisible();
    await expect(page.locator('[data-resource-status="stable"]').first()).toBeVisible();
    await expect(page.locator('[data-spaceexplorer-readiness-applied="true"]')).toBeVisible();

    const firstReadiness = await page.evaluate(() => {
      const state = (window as any).__state;
      return {
        applied: state.interiorReadinessApplied,
        bonus: state.interiorReadinessBonus,
        logCount: (state.missionLog || []).filter((entry: any) => String(entry.text).includes('Cabin readiness applied')).length,
      };
    });
    expect(firstReadiness.applied).toBe(true);
    expect(firstReadiness.bonus).toBeGreaterThan(0);
    expect(firstReadiness.bonus).toBeLessThanOrEqual(3);
    expect(firstReadiness.logCount).toBe(1);

    const reasoning = page.getByRole('textbox', { name: /Commander reasoning before choosing/ });
    await reasoning.click();
    await reasoning.fill('Evidence ');
    await reasoning.pressSequentially('123 supports this choice.', { delay: 15 });
    await expect(reasoning).toHaveValue('Evidence 123 supports this choice.');
    await expect(event).toBeVisible();

    await event.evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press('1');
    await expect(page.getByRole('button', { name: /Allocate Power/ })).toBeVisible();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    await page.screenshot({ path: 'test-results/space-explorer-usability-outcome.png', fullPage: true });

    await page.getByRole('button', { name: /Allocate Power/ }).click();
    await page.getByRole('button', { name: 'Launch Turn' }).click();
    await expect(event).toBeVisible();
    const secondReadiness = await page.evaluate(() => {
      const state = (window as any).__state;
      return {
        applied: state.interiorReadinessApplied,
        bonus: state.interiorReadinessBonus,
        logCount: (state.missionLog || []).filter((entry: any) => String(entry.text).includes('Cabin readiness applied')).length,
      };
    });
    expect(secondReadiness.applied).toBe(true);
    expect(secondReadiness.bonus).toBe(firstReadiness.bonus);
    expect(secondReadiness.logCount).toBe(1);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});

