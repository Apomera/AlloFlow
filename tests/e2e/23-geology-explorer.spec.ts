import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = [
  '<!doctype html>',
  '<html><head><meta charset="utf-8"><title>Geology Explorer harness</title>',
  '<style>html,body{margin:0;min-height:100%;background:#0f172a}#wrap{width:100%;max-width:960px;margin:0 auto;padding:8px;box-sizing:border-box}</style>',
  '</head><body><div id="wrap"></div>',
  '<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>',
  '<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>',
  '<script>',
  'window.__events={errors:[]};',
  'window.addEventListener("error",function(event){window.__events.errors.push(String(event.message||"unknown error"));});',
  'window.StemLab={registerTool:function(id,tool){window.__geologyTool=tool;},isRegistered:function(){return false;}};',
  '</script>',
  '<script src="/stem_lab/stem_tool_geologyexplorer.js"></script>',
  '<script>',
  'var e=React.createElement;',
  'window.__ctx={React:React,isDark:true,isContrast:false,toolData:{_threeLoaded:false,geologyExplorer:{}},',
  't:function(key,fallback){return fallback;},',
  'update:function(tool,key,value){this.toolData[tool]=this.toolData[tool]||{};this.toolData[tool][key]=value;},',
  'addToast:function(){},setStemLabTool:function(){},icons:{}};',
  'function GeologyTool(){return window.__geologyTool.render(window.__ctx);}',
  'window.__mount=function(){window.__root=ReactDOM.createRoot(document.getElementById("wrap"));window.__root.render(e(GeologyTool));};',
  '</script></body></html>'
].join('\n');


const GL_HARNESS = HARNESS
  .replace('<script src="/stem_lab/stem_tool_geologyexplorer.js"></script>', '<script src="/vendor/three-r128/three.min.js"></script><script src="/vendor/three-r128/examples/js/controls/OrbitControls.js"></script><script src="/stem_lab/stem_tool_geologyexplorer.js"></script>')
  .replace('toolData:{_threeLoaded:false', 'toolData:{_threeLoaded:true');

const NOGL_HARNESS = GL_HARNESS.replace('<script src="/stem_lab/stem_tool_geologyexplorer.js"></script>', '<script>THREE.WebGLRenderer=function(){throw new Error("No WebGL");};</script><script src="/stem_lab/stem_tool_geologyexplorer.js"></script>');

let server;
let base;

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__harness/gl' || url === '/__harness/nogl') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(url.endsWith('/nogl') ? NOGL_HARNESS : GL_HARNESS);
      return;
    }
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
        res.end('no');
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
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  base = 'http://127.0.0.1:' + (typeof address === 'object' && address ? address.port : 0);
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function mount(page, route = '/__harness') {
  await page.goto(base + route);
  await page.waitForFunction(() => !!window.__geologyTool);
  await page.evaluate(() => window.__mount());
  await page.waitForSelector('[data-geology-tool="true"]');
}

test.describe.configure({ timeout: 60_000 });

test.describe('Geology Explorer learning path', () => {
  test('mounts a mission with progressive Explore, Investigate, and Assess modes', async ({ page }) => {
    await mount(page);

    await expect(page.getByRole('region', { name: 'Field mission' })).toContainText('How can rock layers reveal a sequence of events?');
    await expect(page.getByRole('button', { name: /Explore/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /Investigate/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Assess/ })).toBeVisible();
    await expect(page.getByText('0/3')).toBeVisible();
    await expect(page.getByText('What to notice')).toBeVisible();

    await page.getByRole('button', { name: /Investigate/ }).click();
    await expect(page.getByRole('button', { name: /Investigate/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /Play history/ })).toBeVisible();
  });

  test('opens the lesson guide and shows CER feedback in Assess mode', async ({ page }) => {
    await mount(page);

    await page.getByRole('button', { name: 'Lesson guide' }).click();
    await expect(page.getByRole('region', { name: 'Lesson guide' })).toContainText('25-35 minutes');
    await expect(page.getByRole('region', { name: 'Lesson guide' })).toContainText('Teacher prompts');

    await page.getByRole('button', { name: /Assess/ }).click();
    await expect(page.getByRole('region', { name: 'Explain your evidence' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'CER rubric' })).toContainText('0/4');
    await expect(page.getByRole('region', { name: 'CER rubric' })).toContainText('at least two observations');
  });
  test('shows targeted remediation after an incorrect quiz answer', async ({ page }) => {
    await mount(page);

    await page.getByRole('button', { name: /Assess/ }).click();
    const quiz = page.getByRole('region', { name: 'Relative dating quiz' });
    await quiz.getByRole('button', { name: 'Start' }).click();
    await quiz.getByRole('button', { name: 'Sandstone' }).click();

    const remediation = page.getByRole('region', { name: 'Targeted remediation' });
    await expect(remediation).toContainText('Top layers are always oldest');
    await expect(remediation).toContainText('Read from the surface downward');
    await remediation.getByRole('button', { name: 'Try again' }).click();
    await expect(remediation).toHaveCount(0);
    await expect(quiz.getByRole('button', { name: 'Sandstone' })).toBeEnabled();
  });
  test('exposes read-aloud controls for mission, orientation, and remediation text', async ({ page }) => {
    await mount(page);

    await expect(page.locator('[data-geology-read-aloud="mission-crust"]')).toBeVisible();
    await expect(page.locator('[data-geology-read-aloud="orientation-crust"]')).toBeVisible();

    await page.getByRole('button', { name: /Assess/ }).click();
    const quiz = page.getByRole('region', { name: 'Relative dating quiz' });
    await quiz.getByRole('button', { name: 'Start' }).click();
    await quiz.getByRole('button', { name: 'Sandstone' }).click();
    await expect(page.locator('[data-geology-read-aloud^="remediation-"]')).toBeVisible();
  });
  test('stops read-aloud state when the learner changes scene', async ({ page }) => {
    await mount(page);
    await page.evaluate(() => {
      if (window.speechSynthesis) {
        try { window.speechSynthesis.speak = function () {}; } catch (e) {}
        try { window.speechSynthesis.cancel = function () {}; } catch (e) {}
      }
    });

    const missionAudio = page.locator('[data-geology-read-aloud="mission-crust"]');
    await missionAudio.click();
    await expect(missionAudio).toHaveAttribute('aria-label', 'Stop reading aloud');

    await page.getByRole('tab', { name: /Crystal cavern/ }).click();
    await expect(page.locator('[data-geology-read-aloud="mission-geode"]')).toHaveAttribute('aria-label', 'Read mission aloud');
  });
  test('supports drag-and-drop sequencing with targeted feedback', async ({ page }) => {
    await mount(page);

    await page.getByRole('button', { name: /Investigate/ }).click();
    const panel = page.getByRole('region', { name: 'Sequence challenge' });
    await expect(panel).toContainText('Relative-dating event order');
    await panel.getByRole('button', { name: 'Check sequence' }).click();
    await expect(panel.getByRole('alert')).toContainText('Position');

    await panel.locator('[data-geology-sequence-card="shale"]').dragTo(panel.locator('[data-geology-sequence-card="sandstone"]'));
    await panel.locator('[data-geology-sequence-card="soil"]').dragTo(panel.locator('[data-geology-sequence-card="pluton"]'));
    await panel.getByRole('button', { name: 'Check sequence' }).click();
    await expect(panel.locator('[data-geology-sequence-feedback="correct"]')).toContainText('Correct');
    await expect(panel).toContainText('Sequence saved');
  });
  test('supports tap-to-place sequencing on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await mount(page);

    await page.getByRole('button', { name: /Investigate/ }).click();
    const panel = page.getByRole('region', { name: 'Sequence challenge' });
    const touchStatus = panel.locator('[data-geology-sequence-touch-status="true"]');
    await expect(touchStatus).toContainText('Touch reorder is ready');

    await panel.getByRole('button', { name: 'Select Mud settles into shale for touch reorder' }).click();
    await expect(touchStatus).toContainText('Selected Mud settles into shale');
    await expect(panel.getByRole('button', { name: 'Cancel touch reorder for Mud settles into shale' })).toHaveAttribute('aria-pressed', 'true');
    await panel.getByRole('button', { name: 'Place Mud settles into shale before Sand becomes sandstone' }).click();

    await panel.getByRole('button', { name: 'Select The surface weathers for touch reorder' }).click();
    await panel.getByRole('button', { name: 'Place The surface weathers before A granite pluton cuts through' }).click();
    await panel.getByRole('button', { name: 'Check sequence' }).click();
    await expect(panel.locator('[data-geology-sequence-feedback="correct"]')).toContainText('Correct');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
  test('maps collected evidence into observation, process, and outcome roles', async ({ page }) => {
    await mount(page);

    await page.getByRole('button', { name: /Investigate/ }).click();
    await page.getByRole('button', { name: /Soil/ }).click();
    await page.getByRole('button', { name: 'Sandstone', exact: true }).click();
    await page.getByRole('button', { name: 'Shale', exact: true }).click();
    await page.getByRole('button', { name: /Assess/ }).click();

    const map = page.getByRole('region', { name: 'Evidence map' });
    await expect(map).toBeVisible();
    await expect(map.getByText('0/3 roles mapped', { exact: true })).toBeVisible();
    const items = map.locator('[data-geology-evidence-item]');
    await expect(items).toHaveCount(3);
    await items.nth(0).getByRole('button', { name: 'Observation' }).click();
    await items.nth(1).getByRole('button', { name: 'Process' }).click();
    await items.nth(2).getByRole('button', { name: 'Outcome' }).click();
    await expect(items.nth(0).getByRole('button', { name: 'Observation' })).toHaveAttribute('aria-pressed', 'true');
    await expect(map.locator('[data-geology-evidence-map-status="true"]')).toContainText('Map ready');
  });
  test('shows an all-scene progress summary in the lesson guide', async ({ page }) => {
    await mount(page);

    await page.getByRole('button', { name: 'Lesson guide' }).click();
    const summary = page.getByRole('region', { name: 'Progress summary' });
    await expect(summary).toContainText('0/6 scene missions complete');
    await expect(summary.getByRole('group', { name: /Layered crust: 0 of 3/ })).toBeVisible();
    await expect(summary.getByRole('button', { name: 'Export progress summary' })).toBeVisible();
  });
  test('opens the vocabulary bridge and refreshes for the selected scene', async ({ page }) => {
    await mount(page);

    const toggle = page.locator('[data-geology-vocabulary-toggle=\"crust\"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('region', { name: 'Vocabulary bridge' })).toContainText('Superposition');

    await page.getByRole('tab', { name: /Crystal cavern/ }).click();
    const geodeToggle = page.locator('[data-geology-vocabulary-toggle=\"geode\"]');
    await expect(geodeToggle).toHaveAttribute('aria-expanded', 'false');
    await geodeToggle.click();
    await expect(page.getByRole('region', { name: 'Vocabulary bridge' })).toContainText('Cavity');
  });
  test('shows an adaptive hint and scene-specific orientation guidance', async ({ page }) => {
    await mount(page);

    await expect(page.getByRole('region', { name: 'Scene orientation' })).toContainText('Surface -> depth');
    await expect(page.getByRole('region', { name: 'Scene orientation' })).toContainText('Scale');
    await page.getByRole('button', { name: 'Show hint' }).click();
    await expect(page.locator('[data-geology-hint="true"]')).toContainText('three materials');

    await page.getByRole('tab', { name: /Crystal cavern/ }).click();
    await expect(page.getByRole('region', { name: 'Scene orientation' })).toContainText('Cavity wall -> center');
    await page.getByRole('button', { name: 'Show hint' }).click();
    await expect(page.locator('[data-geology-hint="true"]')).toContainText('chalcedony rind');
  });
  test('routes incomplete mission checks to the relevant controls', async ({ page }) => {
    await mount(page);

    await page.getByRole('button', { name: /Open material list: Identify three materials/ }).click();
    await expect(page.locator('[data-geology-target="materials"]')).toBeFocused();
    await expect(page.getByRole('button', { name: /Investigate/ })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: /Open drill core: Read one drill core/ }).click();
    await expect(page.locator('[data-geology-target="core"]')).toBeFocused();

    await page.getByRole('button', { name: /Open quiz: Answer one dating question/ }).click();
    await expect(page.getByRole('button', { name: /Assess/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-geology-target="quiz"]')).toBeFocused();
    await expect(page.getByRole('region', { name: 'Relative dating quiz' })).toContainText('1/5.');
    await expect(page.getByRole('button', { name: 'Hide' })).toBeVisible();
  });
  test('compares the active scene with another environment in Assess mode', async ({ page }) => {
    await mount(page);

    await page.getByRole('button', { name: /Assess/ }).click();
    const panel = page.getByRole('region', { name: 'Compare geology scenes' });
    await expect(panel).toContainText('Relative dating');
    await expect(panel).toContainText('Mineral growth');

    await panel.getByRole('combobox', { name: 'Compare with' }).selectOption('subduction');
    await expect(panel).toContainText('Convergent plate motion');
    await expect(panel).toContainText('cause-and-effect');
    await expect(panel).toContainText('Transfer prompt');
  });
  test('switches scene and compares materials from the active scene palette', async ({ page }) => {
    await mount(page);

    await page.getByRole('tab', { name: /Crystal cavern/ }).click();
    await expect(page.getByRole('region', { name: 'Field mission' })).toContainText('Why do different minerals appear in a geode');
    await page.getByRole('button', { name: /Investigate/ }).click();

    await page.getByRole('button', { name: /Chalcedony/ }).click();
    await page.getByRole('button', { name: /Compare/ }).click();
    await page.getByRole('button', { name: /Agate/ }).click();
    await page.getByRole('button', { name: /Compare/ }).click();

    await page.getByRole('button', { name: /Assess/ }).click();
    await expect(page.getByRole('region', { name: 'Compare two rocks' })).toContainText('Chalcedony');
    await expect(page.getByRole('region', { name: 'Compare two rocks' })).toContainText('Agate');
    await expect(page.getByText('Crystal growth sequence')).toBeVisible();
  });

  test('keeps scene tabs keyboard-navigable and avoids horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await mount(page);

    const crust = page.getByRole('tab', { name: /Layered crust/ });
    await crust.focus();
    await crust.press('End');

    await expect(page.getByRole('tab', { name: /Hotspot chain/ })).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });

  test('keeps the accessible learning core present while 3D is unavailable', async ({ page }) => {
    await mount(page);

    await expect(page.getByRole('region', { name: 'Field mission' })).toBeVisible();
    await expect(page.getByRole('group', { name: /Rock types/ })).toBeVisible();
    await expect(page.getByText(/Loading the 3D engine/)).toBeVisible();
    expect(await page.evaluate(() => window.__events.errors)).toEqual([]);
  });
  test('supports first-person controls and restores focus after fullscreen Escape', async ({ page }) => {
    await mount(page, '/__harness/gl');
    await page.waitForSelector('[data-geology-fullscreen-toggle="true"]', { timeout: 30_000 });

    const enter = page.getByRole('button', { name: /Drop into the world/ });
    await enter.click();
    await expect(page.getByRole('application')).toBeVisible();
    await expect(page.getByRole('button', { name: /Exit first-person/ })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('application')).toHaveCount(0);

    const fullscreen = page.getByRole('button', { name: 'Fullscreen 3D view' });
    await fullscreen.click();
    await expect(page.locator('[data-geology-fullscreen="true"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-geology-fullscreen="true"]')).toHaveCount(0);
    await expect(fullscreen).toBeFocused();
  });

  test('shows the real no-WebGL fallback while preserving the learning core', async ({ page }) => {
    await mount(page, '/__harness/nogl');
    await expect(page.getByText('3D view unavailable')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('region', { name: 'Field mission' })).toBeVisible();
    await expect(page.getByRole('group', { name: /Rock types/ })).toBeVisible();
  });


});
