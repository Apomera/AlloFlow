import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-comprehension-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object, contrast = false) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  if (contrast) await page.evaluate(() => {
    document.body.classList.add('theme-contrast');
    (window as any).__ctx.isContrast = true; (window as any).__ctx.theme = 'contrast'; (window as any).__rerender();
  });
}
async function inspect(page: any, name: string, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  await page.locator(selector).screenshot({ path: resolve(output, name + '.png') });
  const result = await page.evaluate(async (selector: string) => {
    const audit = await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'rule',
      values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] } });
    return { overflow: document.documentElement.scrollWidth - innerWidth,
      overflowNodes: [...document.querySelectorAll('body *')].filter(el => el instanceof HTMLElement && el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.overflow-x-auto,.preview-bar')).slice(0, 12).map(el => ({ tag: el.tagName, right: el.getBoundingClientRect().right })),
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.overflowNodes).toEqual([]); expect(result.violations).toEqual([]);
}
const saved = (page: any) => page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
const number = async (node: any, attr: string) => Number(await node.getAttribute(attr));
async function range(input: any, value: number) {
  await input.evaluate((element: HTMLInputElement, value: number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

const diagnoseState = { view: 'defectDiagnose', dd2Idx: 0, dd2Shown: [0], dd2Ans: true, dd2Pick: 'contamination', dd2Score: 1, dd2Rounds: 1 };
const pipeState = { view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '5G', pipe2_hour: 6, pipe2_chal: -1 };
const underwaterState = { view: 'underwater', uw_view: 'decide', tech2_uw_dec: { 0: 1, 1: 0, 2: 0, 3: 0 }, uw_depth: 66, uw_tech: 'wet' };
async function openSection(page: any) { await page.locator('[data-diagnose-section] summary').click(); }
async function openPipe(page: any) { await page.locator('[data-pipe13-motion] summary').click(); }
async function openDepths(page: any) { await page.locator('[data-uw-depth-details] summary').click(); }

for (const width of [1280, 390]) {
  test('Movable section plane follows exact slice contents and leaves the example unchanged at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { ...diagnoseState, dd2Ans: false }); await expect(page.locator('[data-diagnose-section]')).toHaveCount(0);
    await mount(page, width, diagnoseState); const panel = page.locator('[data-diagnose-section]');
    await expect(panel).not.toHaveAttribute('open', ''); await panel.locator('summary').focus(); await page.keyboard.press('Enter');
    const before = await saved(page), input = panel.locator('[data-diagnose-section-plane]');
    const original = await page.locator('canvas[aria-label^="Etched cross-section through"]').evaluate((el: HTMLCanvasElement) => el.toDataURL());
    const model = await page.evaluate(() => { const c = (window as any).__WeldLabCore; return c.DH_DIAG_GEOM[1]; });
    for (const u of [0, .1, .25, .5, .75, 1, model.marks[0].u]) {
      await range(input, u);
      expect(await number(panel, 'data-u')).toBeCloseTo(u, 10);
      const marks = await page.evaluate(u => (window as any).__WeldLabCore.dhSectionMarks((window as any).__WeldLabCore.DH_DIAG_GEOM[1], u).map((m: any) => m.id), u);
      await expect(panel).toHaveAttribute('data-feature-ids', marks.join(','));
      await expect(panel.locator('[data-diagnose-section-reading]')).toHaveAttribute('data-feature-count', String(marks.length));
      expect(await number(panel.locator('[data-diagnose-section-locator]'), 'data-diagnose-section-locator')).toBeCloseTo(u, 10);
      expect(await number(panel.locator('[data-diagnose-section-slice]'), 'data-diagnose-section-slice')).toBeCloseTo(u, 10);
    }
    const locatorCanvas = panel.locator('[data-diagnose-section-locator] canvas');
    const atFeature = await locatorCanvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
    await input.focus(); await page.keyboard.press('Home'); await expect(panel).toHaveAttribute('data-u', '0');
    await expect.poll(() => locatorCanvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())).not.toBe(atFeature);
    await page.keyboard.press('ArrowRight'); expect(await number(panel, 'data-u')).toBeCloseTo(.001, 10);
    await panel.locator('[data-diagnose-section-reset]').click();
    expect(await number(panel, 'data-u')).toBe(await number(panel, 'data-example-u'));
    expect(await saved(page)).toBe(before);
    expect(await page.locator('canvas[aria-label^="Etched cross-section through"]').evaluate((el: HTMLCanvasElement) => el.toDataURL())).toBe(original);
    await inspect(page, 'section-plane-' + width, '[data-diagnose-section]'); expect(errors).toEqual([]);
  });

  test('Rolled and fixed pipe keep the marked material point attached to the exact geometry at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await mount(page, width, pipeState);
    const panel = page.locator('[data-pipe13-motion]'); await expect(panel).not.toHaveAttribute('open', '');
    await panel.locator('summary').focus(); await page.keyboard.press('Enter'); const before = await saved(page);
    const fixedTorch = await panel.locator('[data-pipe13-torch="5G"]').evaluate(el => el.innerHTML);
    for (const hour of [12, 3, 6, 9]) {
      await panel.locator('[data-pipe13-hour]').selectOption(String(hour)); const start = hour % 12 * 30, turn = (360 - start) % 360;
      for (const progress of [0, 50, 100]) {
        await range(panel.locator('[data-pipe13-progress]'), progress);
        const rotation = turn * progress / 100;
        for (const [id, angle] of [['1G', start + rotation], ['5G', start]] as const) {
          const point = panel.locator('[data-pipe13-material-point="' + id + '"]');
          expect(await number(point, 'cx')).toBeCloseTo(100 + 52 * Math.sin(angle * Math.PI / 180), 10);
          expect(await number(point, 'cy')).toBeCloseTo(100 - 52 * Math.cos(angle * Math.PI / 180), 10);
          const error = await panel.locator('[data-pipe13-diagram="' + id + '"]').evaluate((svg: SVGSVGElement) => {
            const line = svg.querySelector('[data-pipe13-material-reference]') as SVGLineElement, circle = svg.querySelector('[data-pipe13-material-point]') as SVGCircleElement;
            const a = svg.createSVGPoint(), b = svg.createSVGPoint(); a.x=line.x2.baseVal.value; a.y=line.y2.baseVal.value; b.x=circle.cx.baseVal.value; b.y=circle.cy.baseVal.value;
            const aa=a.matrixTransform(line.getCTM()!), bb=b.matrixTransform(circle.getCTM()!); return Math.hypot(aa.x-bb.x,aa.y-bb.y);
          }); expect(error).toBeLessThan(.001);
        }
        await expect(panel.locator('[data-pipe13-pipe="5G"]')).toHaveAttribute('transform', 'rotate(0 100 100)');
        await expect(panel.locator('[data-pipe13-torch="1G"]')).toHaveAttribute('data-angle', '0');
      }
    }
    await panel.locator('[data-pipe13-hour]').selectOption('6');
    expect(await panel.locator('[data-pipe13-torch="5G"]').evaluate(el => el.innerHTML)).toBe(fixedTorch);
    await panel.locator('[data-pipe13-progress]').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(panel).toHaveAttribute('data-progress', '1'); await range(panel.locator('[data-pipe13-progress]'), 50);
    expect(await saved(page)).toBe(before);
    await inspect(page, 'pipe-motion-' + width, '[data-pipe13-motion]'); expect(errors).toEqual([]);
  });

  test('Completed underwater jobs use one exact depth scale without changing decisions at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { ...underwaterState, tech2_uw_dec: { 0: 1, 1: 0, 2: 0 } });
    await expect(page.locator('[data-uw-depth-review]')).toHaveCount(0);
    await mount(page, width, underwaterState); const details=page.locator('[data-uw-depth-details]');
    await expect(details).not.toHaveAttribute('open', ''); await details.locator('summary').focus(); await page.keyboard.press('Enter');
    const before=await saved(page), panel=page.locator('[data-uw-depth-review]');
    for (const [job, depth] of [8, 300, 40, 50].entries()) {
      await panel.locator('[data-uw-depth-pick="' + job + '"]').click();
      await expect(panel.locator('[data-uw-depth-pick="' + job + '"]')).toHaveAttribute('aria-pressed', 'true');
      const marker=panel.locator('[data-uw-depth-marker="' + job + '"]');
      expect(await number(marker, 'cy')).toBe(48+depth); expect(await number(marker, 'data-depth-ft')).toBe(depth);
      await expect(panel.locator('[data-uw-depth-selected]')).toContainText(String(depth));
      expect(await panel.locator('[data-uw-depth-reading]').innerText()).not.toBe('');
    }
    await panel.locator('[data-uw-depth-pick="2"]').focus(); await page.keyboard.press('Enter');
    await expect(panel.locator('[data-uw-depth-selected]')).toContainText('40'); expect(await saved(page)).toBe(before);
    await inspect(page, 'underwater-depths-' + width, '[data-uw-depth-review]');
    await page.getByRole('button', { name: /Reset decisions/ }).click(); await expect(panel).toHaveCount(0); expect(errors).toEqual([]);
  });
}

test('The new comparison views retain readable high-contrast controls', async ({ page }) => {
  for (const [name, state, selector, open] of [['section-plane', diagnoseState, '[data-diagnose-section]', openSection], ['pipe-motion', pipeState, '[data-pipe13-motion]', openPipe], ['underwater-depths', underwaterState, '[data-uw-depth-review]', openDepths]] as const) {
    await mount(page, 390, state, true); await open(page);
    if (name === 'pipe-motion') await range(page.locator('[data-pipe13-progress]'), 50);
    await inspect(page, name + '-contrast', selector);
  }
});

test('Local preview shortcuts reach all three new interactions', async ({ page }) => {
  const url=process.env.WELDLAB_PREVIEW_URL; test.skip(!url, 'Local preview is opt-in.'); await page.setViewportSize({ width:390, height:900 }); await page.goto(url!);
  await page.waitForFunction(() => Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));
  await openSection(page); await expect(page.locator('[data-diagnose-section-plane]')).toBeVisible();
  await page.getByRole('button', { name:'Rolled and fixed pipe', exact:true }).click(); await openPipe(page); await expect(page.locator('[data-pipe13-progress]')).toBeVisible();
  await page.getByRole('button', { name:'Underwater job depths', exact:true }).click(); await openDepths(page); await expect(page.locator('[data-uw-depth-plot]')).toBeVisible();
});

