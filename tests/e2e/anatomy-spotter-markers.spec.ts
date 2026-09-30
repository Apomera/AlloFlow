import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.ANATOMY_SPOTTER_QA_OUT || 'reports/anatomy-pathway-flow-2026-09-29';
const validation: Record<string, any> = {};
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js', toolId: 'anatomy',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
  extraScripts: ['vendor/three-r128/OrbitControls.js', 'vendor/three-r128/GLTFLoader.js']
});

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ mode: 'serial', retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => {
  await writeFile(out + '/spotter-browser-validation.json', JSON.stringify(validation, null, 2));
  await harness.stop();
});
test.afterEach(async ({ page }) => harness.destroy(page));

function state(extra: Record<string, unknown> = {}) {
  return { anatomy: {
    _activeTab: 'spotter', system: 'skeletal', view: 'anterior', complexity: 1,
    _bodyView3d: true, _body3dStyle: 'blueprint', _startHereDismissed: true,
    ...extra
  } };
}

async function framePage(page: Page) {
  await page.addStyleTag({ content: 'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}' });
}

async function expectBlueprintReady(page: Page) {
  const canvas = page.locator('[data-anatomy-3d-canvas]');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-anatomy-3d-state', /^ready(?:-model)?$/, { timeout: 90000 });
  await expect(canvas).toHaveAttribute('data-anatomy-3d-style', 'blueprint');
  await expect.poll(() => page.evaluate(() => (window as any).__glContexts()
    .some((record: any) => record.connected && record.inWrap && record.createdBy === 'page' && !record.lost && record.renders > 0)
  ), { timeout: 30000 }).toBe(true);
  return page.evaluate(() => (window as any).__glContexts()
    .filter((record: any) => record.connected && record.inWrap)
    .map((record: any) => ({ createdBy: record.createdBy, lost: record.lost, draws: record.draws, renders: record.renders }))
  );
}

async function expectMarkerAtlas(page: Page) {
  await expect(page.locator('[data-anatomy-3d-canvas]')).toHaveCount(0);
  const canvas = page.locator('[data-anatomy-model-shell] canvas[role=img]');
  await expect(canvas).toBeVisible();
  await expect(page.locator('[data-anatomy-canvas-toolbar]')).toHaveAttribute('data-anatomy-canvas-mode', '2d');
  await expect(page.locator('[data-anatomy-view-dimension="2d"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-anatomy-view-dimension="3d"]')).toBeDisabled();
  await expect(page.locator('[data-anatomy-view-dimension="3d"]')).toHaveAttribute('aria-describedby', 'anatomy-spotter-view-help');
  await expect(page.locator('[data-anatomy-spotter-view-help]')).toBeVisible();
  await expect(page.locator('[data-anatomy-spotter-cue]')).not.toBeEmpty();
  await expect(page.locator('[data-anatomy-spotter-panel]')).not.toContainText('The marked structure is hidden');
  expect(await page.evaluate(() => (window as any).__toolData.anatomy._bodyView3d)).toBe(true);
}

test('A 3D Spotter preference uses the marker atlas for practice and returns to a live Blueprint afterward', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  const scans: any[] = [];
  const sizes: any[] = [];
  validation.practice = { errors, scans, sizes };
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await harness.mount(page, state(), undefined, { expectCanvas: false });
  await framePage(page);
  validation.practice.initial3d = await expectBlueprintReady(page);
  await expect(page.locator('[data-anatomy-view-dimension="3d"]')).toBeEnabled();
  await expect(page.locator('[data-anatomy-spotter-view-help]')).toHaveCount(0);
  await page.locator('[data-anatomy-spotter-start]').click();
  await expectMarkerAtlas(page);
  await expect(page.locator('[data-anatomy-spotter-view-help]')).toContainText('Spotter uses the 2D atlas for its crosshair.');
  const target = await page.evaluate(() => (window as any).__toolData.anatomy._spotterTarget as string);
  validation.practice.target = target;
  await expect(page.locator('[data-anatomy-spotter-option]')).toHaveCount(4);
  await expect(page.locator('[data-anatomy-spotter-option]:disabled')).toHaveCount(0);
  await page.addScriptTag({ path: 'axe-core/4.12.1/axe.min.js' });

  for (const width of [390, 1440]) {
    for (const theme of ['light', 'dark', 'contrast']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(theme => { document.body.className = theme === 'light' ? '' : 'theme-' + theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run({ include: [
          ['[data-anatomy-view-model-controls]'], ['[data-anatomy-spotter-view-help]'],
          ['[data-anatomy-study-controls]'], ['[data-anatomy-spotter-panel]']
        ] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] } });
        return result.violations.map((violation: any) => ({
          id: violation.id, nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary }))
        }));
      });
      scans.push({ width, theme, violations });
      if (width === 390) {
        const suffix = theme === 'light' ? '' : '-' + theme;
        await page.locator('[data-anatomy-model-shell]').screenshot({ path: out + '/spotter-marker' + suffix + '-phone.png' });
        if (theme === 'light') await page.locator('[data-anatomy-spotter-panel]').screenshot({ path: out + '/spotter-question-phone.png' });
      }
    }
  }
  await page.evaluate(() => { document.body.className = ''; });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    sizes.push(size);
    expect(size.scrollWidth).toBeLessThanOrEqual(width + 2);
  }

  const arabic = JSON.parse(await readFile(process.env.ANATOMY_QA_ARABIC || 'lang/arabic.js', 'utf8'));
  await page.evaluate(dict => {
    const runtime = window as any;
    runtime.__spotterEnglishT = runtime.__ctx.t;
    document.documentElement.dir = 'rtl';
    runtime.__ctx.t = (key: string, fallback: string) => key.split('.').reduce((node: any, part: string) => node?.[part], dict) || fallback;
    runtime.__ctx.updateMulti('anatomy', { _readingMode: true });
  }, arabic);
  await page.setViewportSize({ width: 320, height: 1000 });
  const hint = page.locator('[data-anatomy-spotter-view-help]');
  await expect(hint).toHaveText(arabic.stem.anatomy.spotter_flow_2d);
  await expect(hint).toHaveAttribute('dir', 'auto');
  await expect(hint).toHaveCSS('font-size', '17px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
  await page.locator('[data-anatomy-model-shell]').screenshot({ path: out + '/spotter-marker-arabic-larger-320.png' });
  validation.practice.arabic = { width: 320, hint: await hint.textContent(), fontSize: await hint.evaluate(element => getComputedStyle(element).fontSize) };

  await page.evaluate(() => {
    const runtime = window as any;
    document.documentElement.dir = 'ltr';
    runtime.__ctx.t = runtime.__spotterEnglishT;
    runtime.__ctx.updateMulti('anatomy', { _readingMode: false });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-anatomy-spotter-option="' + target + '"]').click();
  await expect(page.locator('[data-anatomy-spotter-feedback]')).toContainText('Correct.');
  await expectMarkerAtlas(page);
  await page.locator('[data-anatomy-spotter-end]').click();
  await expect(page.locator('[data-anatomy-spotter-view-help]')).toHaveCount(0);
  await expect(page.locator('[data-anatomy-view-dimension="3d"]')).toBeEnabled();
  validation.practice.restored3d = await expectBlueprintReady(page);
  expect(await page.evaluate(() => (window as any).__toolData.anatomy)).toMatchObject({
    _spotterActive: false, _bodyView3d: true, _body3dStyle: 'blueprint', _spotterScore: 1, _spotterTotal: 1
  });
  expect(scans.flatMap(scan => scan.violations)).toEqual([]);
  expect(errors).toEqual([]);
});

test('Restored active Spotter rounds display the marker atlas for both unanswered and answered 3D saves', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  const restored: any[] = [];
  validation.restoration = { restored, errors };
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 900 });
  for (const answered of [false, true]) {
    if (answered) await harness.destroy(page);
    const round = {
      _spotterActive: true, _spotterTarget: 'skull',
      _spotterOpts: ['skull', 'ribs', 'humerus', 'femur'].map(id => ({ id })),
      _spotterStartTime: Date.now() - 2000, _spotterSerial: 1,
      ...(answered ? { _spotterFeedback: 'ribs', _spotterScore: 0, _spotterTotal: 1 } : {})
    };
    await harness.mount(page, state(round), undefined, { expectCanvas: false });
    await framePage(page);
    await expectMarkerAtlas(page);
    await expect(page.locator('[data-anatomy-spotter-start]')).toHaveCount(0);
    await expect(page.locator('[data-anatomy-spotter-option]')).toHaveCount(4);
    await expect(page.locator('[data-anatomy-spotter-feedback]')).toHaveCount(answered ? 1 : 0);
    if (answered) await expect(page.locator('[data-anatomy-spotter-option]:disabled')).toHaveCount(4);
    else await expect(page.locator('[data-anatomy-spotter-option]:disabled')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__glContexts().some((record: any) => record.connected && record.inWrap))).toBe(false);
    const snapshot = await page.evaluate(() => ({
      requested3d: (window as any).__toolData.anatomy._bodyView3d,
      requestedModel: (window as any).__toolData.anatomy._body3dStyle,
      target: (window as any).__toolData.anatomy._spotterTarget,
      feedback: (window as any).__toolData.anatomy._spotterFeedback || null
    }));
    restored.push({ answered, ...snapshot });
    expect(snapshot).toMatchObject({ requested3d: true, requestedModel: 'blueprint', target: 'skull', feedback: answered ? 'ribs' : null });
    await page.locator('[data-anatomy-model-shell]').screenshot({ path: out + '/spotter-restored-' + (answered ? 'answered' : 'question') + '-phone.png' });
  }
  expect(errors).toEqual([]);
});
