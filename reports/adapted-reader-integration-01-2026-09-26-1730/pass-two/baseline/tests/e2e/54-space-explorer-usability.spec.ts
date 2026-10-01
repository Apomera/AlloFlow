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

    await gentleMove.click();
    await expect(interior.locator('[data-spaceexplorer-interior-position="medbay"]')).toHaveText('Medical bay');
    await expect(interior.locator('[data-spaceexplorer-active-next-brake="engineering"]')).toContainText('Engineering');
    await expect(interior.locator('[data-spaceexplorer-next-brake-point="engineering"]')).toBeVisible();
    await gentleMove.click();
    await expect(interior.locator('[data-spaceexplorer-interior-position="engineering"]')).toHaveText('Engineering');
    await expect(interior.locator('[data-spaceexplorer-final-target="engineering"]')).toHaveText('Engineering');
    await expect(interior.locator('[data-spaceexplorer-staged-route="active"]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-staged-route-visual="true"]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-next-brake-point]')).toHaveCount(0);
    await expect(gentleMove).toBeDisabled();
    await expect(interior.locator('[data-spaceexplorer-interior-result]')).toContainText('Final destination reached: Engineering');
    await expect.poll(async () => page.evaluate(() => {
      const orientation = (window as any).__state.interiorOrientation;
      return { position: orientation.position, target: orientation.target, routeMode: orientation.routeMode };
    })).toEqual({ position: 'engineering', target: 'engineering', routeMode: 'direct' });
    expect(await axeViolations(page)).toEqual([]);
  });

  test('makes payload inertia testable in predict-first and accessibility media modes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page);

    await page.getByRole('button', { name: /^Mars\./ }).click();
    const interior = page.locator('[data-spaceexplorer-interior]');
    await interior.locator('[data-spaceexplorer-interior-target="medbay"]').click();
    await interior.locator('[data-spaceexplorer-payload="toolcase"]').click();

    await expect(interior.locator('[data-spaceexplorer-payload-status="toolcase"]')).toContainText('10 kg');
    await expect(interior.locator('[data-spaceexplorer-payload-marker="toolcase"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-interior-prediction="gentle"]')).toHaveAttribute('data-predicted-control', 'recovery');
    await expect(interior.locator('[data-spaceexplorer-direct-route]')).toHaveAttribute('data-route-safety', 'recovery');
    await expect(interior.locator('[data-spaceexplorer-route-legend="direct"]')).toContainText('recovery-risk direct route');

    await interior.locator('[data-spaceexplorer-prediction-mode="challenge"]').click();
    await expect(interior.locator('[data-spaceexplorer-prediction-challenge="true"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-direct-route]')).toHaveAttribute('data-route-safety', 'hidden');
    await expect(interior.locator('[data-spaceexplorer-route-legend="direct"]')).toContainText('outcome hidden until test');
    await expect(interior.locator('[data-spaceexplorer-interior-strategy]')).toHaveCount(0);

    await interior.locator('[data-spaceexplorer-prediction-choice="controlled"]').click();
    const testPrediction = interior.locator('[data-spaceexplorer-test-prediction="gentle"]');
    await expect(testPrediction).toBeEnabled();
    await testPrediction.click();

    await expect(interior.locator('[data-spaceexplorer-prediction-result="revise"]')).toContainText('Revise the prediction');
    await expect(interior.locator('[data-spaceexplorer-recovery="active"]')).toBeVisible();
    await expect(interior.locator('.se-motion-trace')).toHaveCSS('animation-name', 'none');
    await expect(interior.locator('[data-spaceexplorer-interior-target="lab"]')).toBeDisabled();
    await interior.locator('[data-spaceexplorer-interior-view="compartment"]').click();
    await expect(interior.locator('[data-spaceexplorer-compartment-visual="medbay"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-compartment-astronaut="drifting"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-compartment-restraint="recovery-rail"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-compartment-hazard="drift"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-orientation-challenge="medbay"]')).toContainText('Recovery has priority');
    await expect(interior.locator('[data-spaceexplorer-orientation-choice]')).toHaveCount(0);
    await interior.locator('[data-spaceexplorer-interior-view="route"]').click();
    await interior.locator('[data-spaceexplorer-recovery-action="counterpush"]').click();
    await expect(interior.locator('[data-spaceexplorer-recovery="active"]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-interior-result="recovered"]')).toContainText('Recovery complete');

    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await expect(interior.locator('[data-spaceexplorer-route-legend="direct"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-skip-practice="true"]')).not.toHaveCSS('border-top-style', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    const forcedColorViolations = (await axeViolations(page)).filter((violation) => violation.id !== 'color-contrast');
    expect(forcedColorViolations).toEqual([]);
  });

  test('switches between route and inside views while teaching fixed local references', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await mount(page);

    await page.getByRole('button', { name: /^Mars\./ }).click();
    const interior = page.locator('[data-spaceexplorer-interior]');
    const routeView = interior.locator('[data-spaceexplorer-interior-view="route"]');
    const insideView = interior.locator('[data-spaceexplorer-interior-view="compartment"]');
    await expect(routeView).toHaveAttribute('aria-pressed', 'true');
    await expect(insideView).toHaveAttribute('aria-pressed', 'false');
    await expect(interior.locator('[data-spaceexplorer-interior-visual="perspective"]')).toBeVisible();

    const stateBefore = await page.evaluate(() => {
      const orientation = (window as any).__state.interiorOrientation;
      return {
        position: orientation.position,
        target: orientation.target,
        routeMode: orientation.routeMode,
        condition: orientation.condition,
        payloadId: orientation.payloadId,
        controlledMoves: orientation.controlledMoves,
        tasks: orientation.tasks,
      };
    });

    await insideView.focus();
    await insideView.press('Enter');
    await expect(insideView).toBeFocused();
    await expect(insideView).toHaveAttribute('aria-pressed', 'true');
    await expect(routeView).toHaveAttribute('aria-pressed', 'false');
    await expect(interior.locator('[data-spaceexplorer-interior-visual]')).toHaveCount(1);
    await expect(interior.locator('[data-spaceexplorer-interior-visual="perspective"]')).toHaveCount(0);

    const closeup = interior.locator('[data-spaceexplorer-compartment-visual="flightdeck"]');
    await expect(closeup).toBeVisible();
    await expect(closeup).toHaveAccessibleName('Flight deck interior close-up');
    await expect(closeup.locator('[data-spaceexplorer-fixed-reference="attitude-display"]')).toBeVisible();
    await expect(closeup.locator('[data-spaceexplorer-compartment-hazard="tablet"]')).toBeVisible();
    await expect(closeup.locator('[data-spaceexplorer-compartment-restraint="cabin-rails"]')).toBeVisible();
    await expect(closeup.locator('[data-spaceexplorer-compartment-astronaut="secured"]')).toBeVisible();
    await expect(closeup.locator('[data-spaceexplorer-compartment-next-direction="engineering"]')).toBeVisible();
    await expect(closeup).toHaveAttribute('data-spaceexplorer-work-visual', 'idle');
    const workStep = interior.locator('[data-spaceexplorer-work-step]');
    const workStepToggle = interior.locator('[data-spaceexplorer-work-step-toggle="true"]');
    await workStepToggle.click();
    await expect(workStep).toHaveJSProperty('open', true);
    await expect(closeup).toHaveAttribute('data-spaceexplorer-work-visual', 'setup');
    await expect(closeup).toHaveAttribute('data-spaceexplorer-work-diagram', 'flightdeck');
    await expect(closeup.locator('[data-spaceexplorer-work-setup="plan"]')).toBeVisible();
    await expect(closeup.locator('[data-spaceexplorer-work-anchor]')).toHaveCount(2);
    await expect(closeup.locator('[data-spaceexplorer-work-anchor="primary"]')).toHaveAttribute('data-work-anchor-label', 'Left foot loop');
    await expect(closeup.locator('[data-spaceexplorer-work-anchor="secondary"]')).toHaveAttribute('data-work-anchor-label', 'Right foot loop');
    await expect(closeup.locator('[data-spaceexplorer-work-tether="planned"]')).toHaveAttribute('data-work-tether-label', 'Tablet tether');
    await expect(closeup.locator('[data-spaceexplorer-work-stabilization="planned"]')).toHaveCount(2);
    await expect(closeup.locator('[data-spaceexplorer-work-visual-label="setup"]')).toContainText('PLAN 2 POINTS');
    await expect(interior.locator('[data-spaceexplorer-work-visual-summary="setup"]')).toContainText('Left foot loop');
    await expect(interior.locator('[data-spaceexplorer-worksite="flightdeck"]')).toContainText('Worksite: Flight deck');
    await expect(interior.locator('[data-spaceexplorer-final-target]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-orientation-challenge]')).toHaveCount(0);
    await expect(closeup.locator('[data-spaceexplorer-compartment-next-direction]')).toHaveCount(0);
    await expect(closeup.locator('[data-spaceexplorer-svg-label="flight-side"], [data-spaceexplorer-svg-label="engineering-side"], [data-spaceexplorer-svg-label="flight-hatch"], [data-spaceexplorer-svg-label="engineering-hatch"]')).toHaveCount(0);
    await expect(closeup.locator('[data-spaceexplorer-compartment-hatch="flightdeck"]')).toHaveAttribute('data-spaceexplorer-hatch-context', 'muted');
    await workStepToggle.click();
    await expect(workStep).toHaveJSProperty('open', false);
    await expect(closeup).toHaveAttribute('data-spaceexplorer-work-visual', 'idle');
    await expect(interior.locator('[data-spaceexplorer-work-visual-summary]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-worksite]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-final-target="lab"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-orientation-challenge="flightdeck"]')).toBeVisible();
    await expect(closeup.locator('[data-spaceexplorer-compartment-next-direction="engineering"]')).toBeVisible();
    await expect(closeup.locator('[data-spaceexplorer-svg-label="flight-side"], [data-spaceexplorer-svg-label="engineering-side"], [data-spaceexplorer-svg-label="flight-hatch"], [data-spaceexplorer-svg-label="engineering-hatch"]')).toHaveCount(4);
    await expect(closeup.locator('[data-spaceexplorer-compartment-hatch="flightdeck"]')).toHaveAttribute('data-spaceexplorer-hatch-context', 'navigation');
    await expect(interior.locator('[data-spaceexplorer-route-legend]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-orientation-progress="0"]')).toContainText('0 of 4 confirmed');

    const wrongReference = interior.locator('[data-spaceexplorer-orientation-choice="floating"]');
    await wrongReference.click();
    const orientationFeedback = interior.locator('#se-orientation-feedback');
    await expect(orientationFeedback).toBeFocused();
    await expect(orientationFeedback).toHaveAttribute('data-spaceexplorer-orientation-result', 'retry');
    await expect(orientationFeedback).toContainText('Reorient and retry');
    await expect(interior.locator('[data-spaceexplorer-orientation-attempts="1"]')).toContainText('1 reference check');

    await interior.locator('[data-spaceexplorer-orientation-choice="fixed"]').click();
    await expect(orientationFeedback).toBeFocused();
    await expect(orientationFeedback).toHaveAttribute('data-spaceexplorer-orientation-result', 'confirmed');
    await expect(orientationFeedback).toContainText('Local frame confirmed');
    await expect(interior.locator('[data-spaceexplorer-orientation-progress="1"]')).toContainText('1 of 4 confirmed');
    await expect(interior.locator('[data-spaceexplorer-orientation-choice]')).toHaveCount(3);
    for (const choice of await interior.locator('[data-spaceexplorer-orientation-choice]').all()) {
      await expect(choice).toBeDisabled();
    }

    const stateAfter = await page.evaluate(() => {
      const orientation = (window as any).__state.interiorOrientation;
      return {
        position: orientation.position,
        target: orientation.target,
        routeMode: orientation.routeMode,
        condition: orientation.condition,
        payloadId: orientation.payloadId,
        controlledMoves: orientation.controlledMoves,
        tasks: orientation.tasks,
      };
    });
    expect(stateAfter).toEqual(stateBefore);

    await routeView.click();
    await expect(interior.locator('[data-spaceexplorer-interior-visual="perspective"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-route-legend="direct"]')).toBeVisible();
    await insideView.click();
    await expect(interior.locator('[data-spaceexplorer-orientation-result="confirmed"]')).toBeVisible();

    await page.setViewportSize({ width: 320, height: 800 });
    const viewTargetSizes = await interior.locator('[data-spaceexplorer-interior-view]').evaluateAll((buttons) => buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    for (const size of viewTargetSizes) {
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    }
    const closeupLabelMetrics = await interior.locator('[data-spaceexplorer-compartment-visual] [data-spaceexplorer-svg-label]').evaluateAll((labels) => labels.map((label) => {
      const node = label as SVGTextElement;
      const matrix = node.getScreenCTM();
      const bounds = node.getBBox();
      const viewBox = node.ownerSVGElement!.viewBox.baseVal;
      return {
        text: node.textContent || '',
        screenFontPx: parseFloat(getComputedStyle(node).fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 0),
        insideSvg: bounds.x >= viewBox.x && bounds.y >= viewBox.y && bounds.x + bounds.width <= viewBox.x + viewBox.width && bounds.y + bounds.height <= viewBox.y + viewBox.height,
      };
    }));
    expect(closeupLabelMetrics.length).toBeGreaterThanOrEqual(7);
    for (const metric of closeupLabelMetrics) {
      expect(metric.screenFontPx, `${metric.text} should remain at least 11 screen pixels`).toBeGreaterThanOrEqual(11);
      expect(metric.insideSvg, `${metric.text} should stay inside the close-up SVG`).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
    await page.screenshot({ path: 'test-results/space-explorer-compartment-phone.png', fullPage: true });

    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    const fixedStroke = await closeup.locator('[data-spaceexplorer-compartment-restraint]').first().evaluate((mark) => getComputedStyle(mark).stroke);
    const hazardStroke = await closeup.locator('[data-spaceexplorer-compartment-hazard]').first().evaluate((mark) => getComputedStyle(mark).stroke);
    expect(fixedStroke).not.toBe('none');
    expect(hazardStroke).not.toBe('none');
    const forcedColorViolations = (await axeViolations(page)).filter((violation) => violation.id !== 'color-contrast');
    expect(forcedColorViolations).toEqual([]);
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
    await expect(interior.locator('[data-spaceexplorer-skip-practice="true"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-readiness-requirement="activities"]')).toContainText('0 of 2 activities');
    await expect(interior.locator('[data-spaceexplorer-readiness-requirement="moves"]')).toContainText('0 of 2 controlled moves');
    const workStep = interior.locator('[data-spaceexplorer-work-step]');
    const workStepToggle = interior.locator('[data-spaceexplorer-work-step-toggle="true"]');
    await expect(workStep).toHaveJSProperty('open', false);
    await workStepToggle.focus();
    await workStepToggle.press('Enter');
    await expect(workStep).toHaveJSProperty('open', true);
    await workStepToggle.press('Enter');
    await expect(workStep).toHaveJSProperty('open', false);
    expect(await axeViolations(page)).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    const interiorColumns = await interior.locator('.se-two-column-grid').first().locator(':scope > div').evaluateAll((items) => items.slice(0, 2).map((item) => {
      const rect = item.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width };
    }));
    expect(Math.abs(interiorColumns[1].x - interiorColumns[0].x)).toBeLessThan(2);
    expect(interiorColumns[1].y).toBeGreaterThan(interiorColumns[0].y);
    const stackedChoiceGroups = await interior.locator('.se-interior-choice-grid').evaluateAll((groups) => groups.slice(0, 2).map((group) => Array.from(group.children).slice(0, 2).map((item) => {
      const rect = item.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width };
    })));
    for (const boxes of stackedChoiceGroups) {
      expect(Math.abs(boxes[1].x - boxes[0].x)).toBeLessThan(2);
      expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
      expect(boxes[0].width).toBeGreaterThan(280);
    }
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
    await expect(interior.locator('[data-spaceexplorer-interior-result="recovery-active"]')).toContainText('Recovery required');
    await expect(interior.locator('[data-spaceexplorer-interior-trace="overshoot"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-interior-overshoot-marker="true"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-interior-trace-summary="overshoot"]')).toContainText('overshoot and recovery');
    await expect(interior.locator('.se-motion-trace')).toHaveCSS('animation-name', 'se-motion-trace-draw');
    await expect(interior.locator('[data-spaceexplorer-recovery="active"]')).toBeVisible();
    await expect(interior.locator('[data-spaceexplorer-drift-status="active"]')).toContainText('recovery response required');
    await expect(interior.locator('[data-spaceexplorer-interior-target="lab"]')).toBeDisabled();
    await expect(interior.locator('[data-spaceexplorer-interior-condition="stable"]')).toBeDisabled();
    await interior.locator('[data-spaceexplorer-recovery-action="counterpush"]').click();
    await expect(interior.locator('[data-spaceexplorer-recovery-attempts="1"]')).toContainText('1 recovery adjustment');
    await expect(interior.locator('[data-spaceexplorer-interior-result="recovery-active"]')).toContainText('Use the marked handrail');
    await interior.locator('[data-spaceexplorer-recovery-action="rail"]').click();
    await expect(interior.locator('[data-spaceexplorer-recovery="active"]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-interior-result="recovered"]')).toContainText('Recovery complete');
    await expect(workStep).toHaveJSProperty('open', true);
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
    const failedVisualAction = interior.locator('[data-spaceexplorer-view-work-result="rotation"]');
    await expect(failedVisualAction).toContainText('See one-point pivot');
    const failedVisualActionBox = await failedVisualAction.boundingBox();
    expect(failedVisualActionBox?.width).toBeGreaterThanOrEqual(44);
    expect(failedVisualActionBox?.height).toBeGreaterThanOrEqual(44);
    const failedStateBeforeVisual = await page.evaluate(() => {
      const orientation = (window as any).__state.interiorOrientation;
      return {
        position: orientation.position,
        target: orientation.target,
        routeMode: orientation.routeMode,
        tasks: orientation.tasks,
        attempts: orientation.activityAttempts,
        corrections: orientation.activityRecoveryCount,
      };
    });
    await failedVisualAction.click();
    const failedCloseup = interior.locator('[data-spaceexplorer-compartment-visual="lab"]');
    await expect(failedCloseup).toBeFocused();
    await expect(failedCloseup).toHaveCSS('outline-style', 'solid');
    await expect(failedCloseup).toHaveCSS('outline-offset', '-4px');
    await expect(failedCloseup).toHaveAttribute('data-spaceexplorer-work-visual', 'rotation');
    await expect(failedCloseup).toHaveAttribute('data-spaceexplorer-work-diagram', 'lab');
    await expect(failedCloseup.locator('[data-spaceexplorer-work-setup="one-point"]')).toBeVisible();
    await expect(failedCloseup.locator('[data-spaceexplorer-work-anchor="primary"]')).toBeVisible();
    await expect(failedCloseup.locator('[data-spaceexplorer-work-anchor="primary"]')).toHaveAttribute('data-work-anchor-label', 'Rail 04 handhold');
    await expect(failedCloseup.locator('[data-spaceexplorer-work-anchor="secondary"]')).toHaveCount(0);
    await expect(failedCloseup.locator('[data-spaceexplorer-work-rotation="one-point"]')).toBeVisible();
    await expect(failedCloseup.locator('[data-spaceexplorer-work-loose-object="specimen bag"]')).toBeVisible();
    await expect(failedCloseup.locator('[data-spaceexplorer-work-object-state="drifting"]')).toBeVisible();
    await expect(failedCloseup.locator('[data-spaceexplorer-work-visual-label="rotation"]')).toContainText('1-POINT PIVOT');
    await expect(failedCloseup.locator('desc')).toContainText('only the Rail 04 handhold controls the body');
    await expect(interior.locator('[data-spaceexplorer-work-visual-summary="rotation"]')).toContainText('body pivots; specimen bag drifts');
    await expect(interior.locator('[data-spaceexplorer-orientation-challenge]')).toHaveCount(0);
    await expect(failedCloseup.locator('[data-spaceexplorer-svg-label="flight-side"], [data-spaceexplorer-svg-label="engineering-side"], [data-spaceexplorer-svg-label="flight-hatch"], [data-spaceexplorer-svg-label="engineering-hatch"]')).toHaveCount(0);
    await failedCloseup.screenshot({ path: 'test-results/space-explorer-work-recovery-closeup.png' });
    await page.setViewportSize({ width: 320, height: 800 });
    const workLabelMetric = await failedCloseup.locator('[data-spaceexplorer-work-visual-label] [data-spaceexplorer-svg-label="work-state"]').evaluate((label) => {
      const node = label as SVGTextElement;
      const matrix = node.getScreenCTM();
      const bounds = node.getBBox();
      const viewBox = node.ownerSVGElement!.viewBox.baseVal;
      return {
        screenFontPx: parseFloat(getComputedStyle(node).fontSize) * Math.abs(matrix?.a || 1),
        insideSvg: bounds.x >= viewBox.x && bounds.y >= viewBox.y && bounds.x + bounds.width <= viewBox.x + viewBox.width && bounds.y + bounds.height <= viewBox.y + viewBox.height,
      };
    });
    expect(workLabelMetric.screenFontPx).toBeGreaterThanOrEqual(11);
    expect(workLabelMetric.insideSvg).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    const failedStateAfterVisual = await page.evaluate(() => {
      const orientation = (window as any).__state.interiorOrientation;
      return {
        position: orientation.position,
        target: orientation.target,
        routeMode: orientation.routeMode,
        tasks: orientation.tasks,
        attempts: orientation.activityAttempts,
        corrections: orientation.activityRecoveryCount,
      };
    });
    expect(failedStateAfterVisual).toEqual(failedStateBeforeVisual);
    expect(await page.evaluate(() => (window as any).__state.interiorOrientation.viewMode)).toBe('compartment');
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await expect(failedCloseup.locator('[data-spaceexplorer-work-loose-object]')).toHaveCSS('animation-name', 'none');
    const forcedWorkStrokes = await failedCloseup.locator('[data-spaceexplorer-work-anchor], [data-spaceexplorer-work-rotation], [data-spaceexplorer-work-loose-object]').evaluateAll((marks) => marks.map((mark) => getComputedStyle(mark).stroke));
    expect(forcedWorkStrokes.every((stroke) => stroke !== 'none' && stroke !== 'transparent')).toBe(true);
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
    await interior.locator('[data-spaceexplorer-interior-view="route"]').click();
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
    const securedVisualAction = interior.locator('[data-spaceexplorer-view-work-result="stabilized"]');
    await expect(securedVisualAction).toContainText('See two-point stable setup');
    await securedVisualAction.click();
    const securedCloseup = interior.locator('[data-spaceexplorer-compartment-visual="lab"]');
    await expect(securedCloseup).toBeFocused();
    await expect(securedCloseup).toHaveCSS('outline-offset', '-4px');
    await expect(securedCloseup).toHaveAttribute('data-spaceexplorer-work-visual', 'stabilized');
    await expect(securedCloseup).toHaveAttribute('data-spaceexplorer-work-diagram', 'lab');
    await expect(securedCloseup.locator('[data-spaceexplorer-work-setup="two-point"]')).toBeVisible();
    await expect(securedCloseup.locator('[data-spaceexplorer-work-anchor]')).toHaveCount(2);
    await expect(securedCloseup.locator('[data-spaceexplorer-work-anchor="primary"]')).toHaveAttribute('data-work-anchor-label', 'Rail 04 brace');
    await expect(securedCloseup.locator('[data-spaceexplorer-work-anchor="secondary"]')).toHaveAttribute('data-work-anchor-label', 'Waist restraint');
    await expect(securedCloseup.locator('[data-spaceexplorer-work-setup="two-point"]')).toHaveAttribute('data-spaceexplorer-work-stabilization', 'two-point');
    await expect(securedCloseup.locator('[data-spaceexplorer-work-tether="secured-object"]')).toHaveAttribute('data-work-tether-label', 'Specimen tether');
    await expect(securedCloseup.locator('[data-spaceexplorer-work-object-state="secured"]')).toBeVisible();
    await expect(securedCloseup.locator('[data-spaceexplorer-work-rotation]')).toHaveCount(0);
    await expect(securedCloseup.locator('[data-spaceexplorer-work-loose-object]')).toHaveCount(0);
    await expect(securedCloseup.locator('[data-spaceexplorer-work-visual-label="stabilized"]')).toContainText('2-POINT STABLE');
    await expect(securedCloseup.locator('desc')).toContainText('the Rail 04 brace and Waist restraint prevent pivot');
    await expect(interior.locator('[data-spaceexplorer-work-visual-summary="stabilized"]')).toContainText('stable work');
    await expect(interior.locator('[data-spaceexplorer-orientation-challenge]')).toHaveCount(0);
    await expect(securedCloseup.locator('[data-spaceexplorer-svg-label="flight-side"], [data-spaceexplorer-svg-label="engineering-side"], [data-spaceexplorer-svg-label="flight-hatch"], [data-spaceexplorer-svg-label="engineering-hatch"]')).toHaveCount(0);
    await securedCloseup.screenshot({ path: 'test-results/space-explorer-work-secured-closeup.png' });
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
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    const securedForcedStrokes = await securedCloseup.locator('[data-spaceexplorer-work-anchor], [data-spaceexplorer-work-stabilization="two-point"], [data-spaceexplorer-work-tether="secured-object"]').evaluateAll((marks) => marks.map((mark) => getComputedStyle(mark).stroke));
    expect(securedForcedStrokes.every((stroke) => stroke !== 'none' && stroke !== 'transparent')).toBe(true);
    await expect(securedCloseup).toHaveCSS('outline-offset', '-4px');
    const securedForcedColorViolations = (await axeViolations(page)).filter((violation) => violation.id !== 'color-contrast');
    expect(securedForcedColorViolations).toEqual([]);
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'none' });
    await workStepToggle.click();
    await expect(workStep).toHaveJSProperty('open', false);
    await expect(securedCloseup).toHaveAttribute('data-spaceexplorer-work-visual', 'idle');
    await expect(interior.locator('[data-spaceexplorer-work-visual-summary]')).toHaveCount(0);
    await expect(interior.locator('[data-spaceexplorer-orientation-challenge="lab"]')).toBeVisible();
    await expect(securedCloseup.locator('[data-spaceexplorer-svg-label="flight-side"], [data-spaceexplorer-svg-label="engineering-side"], [data-spaceexplorer-svg-label="flight-hatch"], [data-spaceexplorer-svg-label="engineering-hatch"]')).toHaveCount(4);
    await interior.locator('[data-spaceexplorer-interior-view="route"]').click();
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
    await page.getByRole('button', { name: /^🚀 Continue to power setup$/ }).click();

    await expect(page.getByText('Step 3 of 5')).toBeVisible();
    await expect(page.locator('[data-spaceexplorer-preflight]')).toContainText('Cabin orientation complete');
    await expect(page.locator('[data-spaceexplorer-preflight]')).toContainText('Maneuver route practiced.');
    await page.getByRole('button', { name: /Back to briefing/ }).click();
    await expect(page.getByText('Step 2 of 5')).toBeVisible();
    await expect(page.locator('[data-spaceexplorer-interior-progress]')).toContainText('Cabin ready');
    await page.getByRole('button', { name: /^🚀 Continue to power setup$/ }).click();
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
