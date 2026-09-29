const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    page.setDefaultTimeout(10000);
    await page.goto('http://127.0.0.1:61792', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch);
    const setState = async (patch) => {
      await page.evaluate(p => window.__setReviewState(prev => ({ ...prev, physics: { ...prev.physics, ...p } })), patch);
      await page.waitForTimeout(100);
    };
    await setState({ angle: 45, velocity: 25, gravity: 9.8, mass: 1, targetMode: true, targetRound: 1, targetConstraint: { type: 'fixedAngle', value: 45 }, targetList: [{ x: 80, y: 0, radius: 10, id: 0, destroyed: false }] });
    const canvas = page.locator('#physicsCanvas');
    const before = await page.evaluate(() => ({ angle: window.__reviewState.physics.angle, disabled: Array.from(document.querySelectorAll('input[type=range]')).find(e => e.getAttribute('aria-label')?.startsWith('Angle'))?.disabled }));
    await canvas.focus();
    await page.keyboard.press('ArrowUp');
    const after = await page.evaluate(() => ({ angle: window.__reviewState.physics.angle, constraint: window.__reviewState.physics.targetConstraint }));
    await setState({ targetMode: false, targetConstraint: null, targetList: null, angle: 45, velocity: 25, gravity: 9.8, airResist: true, showGraphs: true, showFlightData: true, simSpeed: 1 });
    await page.getByRole('button', { name: 'Launch!', exact: true }).click();
    await page.waitForFunction(() => !!window.__reviewState.physics.lastFlight && !document.getElementById('physicsCanvas')._launched, null, { timeout: 10000 });
    const mobile = [];
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      const svg = page.locator('svg[aria-label="Horizontal velocity over time, a flat line"]');
      await svg.scrollIntoViewIfNeeded();
      const graph = await svg.evaluate(el => {
        const r = el.getBoundingClientRect();
        const txt = el.querySelector('text');
        const t = txt?.getBoundingClientRect();
        return { width: r.width, height: r.height, viewBox: el.getAttribute('viewBox'), axisTextDeclaredSize: txt?.getAttribute('font-size'), axisTextRenderedWidth: t?.width, axisTextRenderedHeight: t?.height, transformScale: el.getScreenCTM()?.a, accessibleName: el.getAttribute('aria-label'), documentScrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
      });
      const screenshot = `mobile-graphs-${width}.png`;
      await page.screenshot({ path: path.join(__dirname, screenshot) });
      mobile.push({ width, graph, screenshot });
    }
    const result = { keyboardConstraint: { before, after }, mobile };
    fs.writeFileSync(path.join(__dirname, 'learning-browser-results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
