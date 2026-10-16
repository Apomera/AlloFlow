import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800,
});
const artifacts = path.resolve('.codex-artifacts/bee-camera-labels-2026-10-13');
const labels = ['Rotate left', 'Rotate right', 'Tilt up', 'Tilt down', 'Zoom in', 'Zoom out', 'Reset view'];
const methods = ['nudge', 'nudge', 'nudge', 'nudge', 'zoom', 'zoom', 'reset'];
const args = [[-.3, 0], [.3, 0], [0, .2], [0, -.2], [-.6], [.6], []];

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function bay(page: Page, id = 'hive') { return page.locator('[data-beehive-3d-bay="' + id + '"]'); }
function controls(page: Page, id = 'hive') { return page.locator('[data-bee-3d-camera-controls="' + id + '"]'); }
function action(page: Page, index: number, id = 'hive') { return controls(page, id).locator('[data-bee-3d-camera-action="' + index + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }

// Observe the real shell API and the camera supplied to a real scene render.
// Every wrapper delegates to the original method; no ready status or camera
// movement is fabricated. A probe is prepended to the local response; the tool
// implementation itself and the file on disk remain unchanged.
const viewerProbe = `
(function () {
  var original = window.StemLab.makeBayViewer;
  window.__cameraViewers = [];
  window.StemLab.makeBayViewer = function (cfg) {
    var entry = { calls: [], camera: null, frames: 0 };
    window.__cameraViewers.push(entry);
    var build = cfg.buildScene;
    var instrumented = Object.assign({}, cfg, { buildScene: function (THREE, options) {
      var content = build.call(this, THREE, options);
      var previous = options.scene.onAfterRender;
      options.scene.onAfterRender = function (renderer, scene, camera) {
        entry.camera = camera; entry.frames++;
        if (previous) return previous.apply(this, arguments);
      };
      return content;
    } });
    var viewer = original.call(this, instrumented);
    ['nudge', 'zoom', 'reset'].forEach(function (method) {
      var real = viewer[method];
      viewer[method] = function () {
        entry.calls.push({ method: method, args: Array.prototype.slice.call(arguments) });
        return real.apply(this, arguments);
      };
    });
    return viewer;
  };
})();
`;

async function prepare(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.route('**/stem_lab/stem_tool_beehive.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: viewerProbe + await response.text() });
  });
}
async function mount(page: Page, id: 'hive' | 'queen', failed = false) {
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ id, failed }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    if (failed) {
      w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported camera fallback'));
      w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the camera fallback test'); };
    }
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: id === 'hive' ? 'beekeeper' : 'queen', beeView: 'pollination', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000, honey: 40, syrup: 5,
      pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: !failed, show3dQueen: true, hive3dExploded: false, hive3dFrame: 2,
      hive3dFramesSeen: [2], hive3dPart: null, hive3dFoundQueen: false,
      notebook: {
        beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
          explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      queen: { active: id === 'queen', paused: true, day: 6, hiveHealth: 88, territory: 62 },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  }, { id, failed });
  // A synchronous first-render failure can precede the hive effect's status
  // subscription. Open through the learner's control after mount so this
  // fallback fixture exercises the subscribed failure path.
  if (failed && id === 'hive') {
    await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#beehive-interior-title')).toBeFocused();
  }
  await expect(bay(page, id)).toHaveAttribute('data-beehive-3d-status', failed ? 'failed' : 'ready', { timeout: 30000 });
  await expect(controls(page, id)).toBeVisible();
}

async function checkLabels(page: Page, id: 'hive' | 'queen', ready: boolean) {
  const group = controls(page, id);
  await expect(group).toHaveAttribute('role', 'group');
  await expect(group).toHaveAccessibleName((id === 'hive' ? '3D hive' : '3D forage map') + ' camera controls');
  await expect(group.locator('[data-bee-3d-camera-action]')).toHaveCount(7);
  for (let index = 0; index < labels.length; index++) {
    const button = action(page, index, id);
    await expect(button).toHaveAccessibleName(labels[index]);
    await expect(button).toHaveAttribute('title', labels[index]);
    await expect(button.locator('.bee-3d-camera-label')).toHaveText(labels[index]);
    await expect(button.locator('.bee-3d-camera-label')).toBeVisible();
    await expect(button.locator('.bee-3d-camera-symbol')).toHaveAttribute('aria-hidden', 'true');
    if (ready) await expect(button).toBeEnabled(); else await expect(button).toBeDisabled();
  }
}

async function audit(page: Page, id = 'hive') {
  const result = await controls(page, id).evaluate(async node => {
    const forcedColors = window.matchMedia('(forced-colors: active)').matches;
    // axe 4.12.1 reads -webkit-text-fill-color before color. Chromium can
    // retain the author's text-fill value while painting system colors.
    // Check system-color participation below and review the forced-color
    // capture; every other display mode retains axe's full contrast check.
    const result = await (window as any).axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false }, 'color-contrast': { enabled: !forcedColors } },
    });
    const elements = [node, ...Array.from(node.querySelectorAll('button,span'))];
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    let forced: { canvasText: string; adjustments: { tag: string; value: string }[]; statuses: { text: string | null; color: string; textFillColor: string }[] } | null = null;
    if (forcedColors) {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:fixed;visibility:hidden;color:CanvasText;forced-color-adjust:auto';
      document.body.appendChild(probe);
      try {
        forced = {
          canvasText: getComputedStyle(probe).color,
          adjustments: [node, ...Array.from(node.querySelectorAll('*'))].map(el => ({ tag: el.tagName, value: getComputedStyle(el).forcedColorAdjust })),
          statuses: Array.from(node.querySelectorAll('[role="status"]')).map(el => {
            const css = getComputedStyle(el);
            return { text: el.textContent, color: css.color, textFillColor: css.getPropertyValue('-webkit-text-fill-color') };
          }),
        };
      } finally { probe.remove(); }
    }
    return {
      forced,
      violations: result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) })),
      overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: Array.from(node.querySelectorAll('.bee-3d-camera-label')).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, ellipsis: getComputedStyle(el).textOverflow })),
      buttons: Array.from(node.querySelectorAll(':scope > button')).map(el => {
        const box = el.getBoundingClientRect(), css = getComputedStyle(el);
        return { width: box.width, height: box.height, opacity: css.opacity, border: css.borderStyle, disabled: (el as HTMLButtonElement).disabled };
      }),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (result.forced) {
    fs.mkdirSync(artifacts, { recursive: true });
    fs.writeFileSync(path.join(artifacts, 'camera-forced-colors-' + id + '.json'), JSON.stringify(result.forced, null, 2));
    for (const element of result.forced.adjustments) expect(element.value, element.tag + ' must use the system palette').toBe('auto');
    if (id === 'hive') expect(result.forced.statuses).toHaveLength(1);
    for (const status of result.forced.statuses) expect(status.color, status.text || 'Status color').toBe(result.forced.canvasText);
  }
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const label of result.text) { expect(label.size, label.text || '').toBeGreaterThanOrEqual(.875); expect(label.ellipsis).not.toBe('ellipsis'); }
  for (const button of result.buttons) {
    expect(button.width).toBeGreaterThanOrEqual(44); expect(button.height).toBeGreaterThanOrEqual(44);
    expect(button.opacity).toBe('1'); if (button.disabled) expect(button.border).toBe('dashed');
  }
}

async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  const position = await controls(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await controls(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-camera-labels-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-camera-labels-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

async function keyboardActivate(page: Page, button: Locator, key: 'Enter' | 'Space') {
  await button.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(button).toBeFocused();
  const focus = await button.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none');
  await page.keyboard.press(key); await expect(button).toBeFocused();
}

test('visible camera labels activate the real hive and forage viewers by mouse and keyboard without changing colony work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await prepare(page);
  for (const id of ['hive', 'queen'] as const) {
    await mount(page, id); await checkLabels(page, id, true);
    await bay(page, id).locator('canvas').scrollIntoViewIfNeeded();
    const viewerIndex = id === 'hive' ? 0 : 1;
    await expect.poll(() => page.evaluate(index => (window as any).__cameraViewers[index].frames, viewerIndex)).toBeGreaterThan(0);
    const live = await harness.glScene(page, '[data-beehive-3d-bay="' + id + '"]');
    expect(live?.renders).toBeGreaterThan(0); expect(live?.visibleMeshes).toBeGreaterThan(0);
    const initial = await work(page);
    await page.evaluate(index => { (window as any).__cameraViewers[index].calls = []; }, viewerIndex);
    const expected: { method: string; args: number[] }[] = [];
    // A second left turn gives Reset view a distinct starting position after
    // the opposing direction pairs have returned to their original settings.
    for (const index of [0, 1, 2, 3, 4, 5, 0, 6]) {
      const before = await page.evaluate(index => (window as any).__cameraViewers[index].camera.position.toArray(), viewerIndex);
      if ([0, 3, 5].includes(index)) await action(page, index, id).click();
      else await keyboardActivate(page, action(page, index, id), index % 2 ? 'Enter' : 'Space');
      expected.push({ method: methods[index], args: args[index] });
      expect(await page.evaluate(index => (window as any).__cameraViewers[index].calls, viewerIndex)).toEqual(expected);
      await expect.poll(() => page.evaluate(index => (window as any).__cameraViewers[index].camera.position.toArray(), viewerIndex)).not.toEqual(before);
      expect(await work(page)).toEqual(initial);
    }
    await audit(page, id);
    if (id === 'hive') {
      await expect(controls(page).getByRole('button', { name: /Open hive: lift the boxes apart/ })).toBeEnabled();
      await expect(controls(page).getByRole('button', { name: 'Find the queen', exact: true })).toHaveAttribute('aria-pressed', 'false');
      await expect(controls(page).getByRole('group', { name: 'Choose which brood frame to read' })).toContainText('Frame 3/6');
      await capture(page, 'ready');
    }
    expect(await work(page)).toEqual(initial); await harness.destroy(page);
  }
  expect(errors).toEqual([]);
});

test('unavailable camera controls keep readable labels and disabled semantics across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await prepare(page);
  await mount(page, 'hive', true); const initial = await work(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') await page.setViewportSize({ width: 320, height: 1800 });
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await checkLabels(page, 'hive', false); await audit(page); await capture(page, mode);
    await expect(controls(page).getByRole('button', { name: 'Close hive: stack the boxes back together', exact: true })).toBeDisabled();
    await expect(controls(page).getByRole('button', { name: 'Find the queen', exact: true })).toBeDisabled();
    // Native click() cannot activate disabled buttons, including through an
    // assistive technology that requests programmatic button activation.
    await controls(page).locator(':scope > button').evaluateAll(nodes => nodes.forEach(node => (node as HTMLButtonElement).click()));
    expect(await page.evaluate(() => (window as any).__cameraViewers.map((viewer: any) => viewer.calls))).toEqual([[], []]);
    expect(await work(page)).toEqual(initial);
  }
  await harness.destroy(page); await page.setViewportSize({ width: 980, height: 1800 });
  await mount(page, 'queen', true); const queen = await work(page); await checkLabels(page, 'queen', false); await audit(page, 'queen');
  expect(await work(page)).toEqual(queen); expect(errors).toEqual([]);
});
