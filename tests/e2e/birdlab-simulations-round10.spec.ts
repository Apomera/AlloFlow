import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'featherAnatomy', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-birdlab-vane-study]')).toBeVisible();
}
async function geometry(page: Page) {
  return page.locator('[data-vane-specimen="current"]').evaluate(element => {
    const map = element as unknown as SVGSVGElement;
    const point = (selector: string, end: boolean) => {
      const path = map.querySelector(selector) as SVGPathElement, value = path.getPointAtLength(end ? path.getTotalLength() : 0);
      return [value.x, value.y];
    };
    return [...map.querySelectorAll('[data-vane-junction]')].map((node, index) => {
      const hook = map.querySelector(`[data-vane-hook="${index}"]`) as SVGPathElement;
      return { hook: point(`[data-vane-hook="${index}"]`, false), bow: point(`[data-vane-bow="${index}"]`, true),
        rootHook: point(`[data-vane-hook-branch="${index}"]`, false), rootBow: point(`[data-vane-bow="${index}"]`, false),
        hookGeometry: hook.getAttribute('d'), joined: node.getAttribute('data-vane-joined') === 'true' };
    });
  });
}
async function seek(page: Page, value: number) {
  await page.locator('#birdlab-vane-stroke').fill(String(value));
  await expect(page.locator('[data-birdlab-vane-study]')).toHaveAttribute('data-vane-stroke', value.toFixed(3));
}
async function insetBounds(page: Page) {
  return page.locator('[data-vane-contact-detail]').evaluate(element => {
    const svg=element as unknown as SVGSVGElement;
    function bounds(selector:string) {
      const path=svg.querySelector(selector) as SVGPathElement, box=path.getBBox();
      const matrix=svg.getCTM()!.inverse().multiply(path.getCTM()!);
      const corners=[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]]
        .map(point=>new DOMPoint(point[0],point[1]).matrixTransform(matrix));
      const stroke=Number.parseFloat(getComputedStyle(path).strokeWidth)/2*Math.hypot(matrix.b,matrix.d);
      return {top:Math.min(...corners.map(point=>point.y))-stroke,bottom:Math.max(...corners.map(point=>point.y))+stroke};
    }
    return {hook:bounds('[data-vane-detail-hook] path'),rail:bounds('[data-vane-detail-rail]'),viewBox:{top:svg.viewBox.baseVal.y,bottom:svg.viewBox.baseVal.y+svg.viewBox.baseVal.height}};
  });
}

test('native vane contacts separate and rejoin in sequence, with a frozen before-view and linked magnifier', async ({ page }) => {
  await mount(page);
  const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  await page.locator('#birdlab-vane-opening').fill('100'); await seek(page, 0);
  const open = await geometry(page); expect(open.every(contact => !contact.joined)).toBe(true);
  for (let i = 0; i < 12; i++) {
    // Native path endpoints independently establish a 72-unit opening. The
    // receiving path extends 19 units beyond its reference contact, while the
    // hook starts five units before its own reference contact.
    expect(open[i].bow[1] - open[i].hook[1]).toBeCloseTo(58, 3);
    expect(open[i].rootBow[1] - open[i].rootHook[1]).toBeCloseTo(282, 3);
  }
  await page.locator('[data-vane-pin]').click();
  const pinned = await page.locator('[data-vane-specimen="Pinned"]').innerHTML();
  await seek(page, 50); const half = await geometry(page);
  expect(half.map(contact => contact.joined)).toEqual([true,true,true,true,true,true,false,false,false,false,false,false]);
  for (let i = 0; i < 12; i++) {
    expect(half[i].bow[1] - half[i].hook[1]).toBeCloseTo(i < 6 ? -14 : 58, 3);
    expect(half[i].rootBow[1] - half[i].rootHook[1]).toBeCloseTo(i < 6 ? 210 : 282, 3);
  }
  await expect(page.locator('[data-vane-count]')).toHaveText('6 / 12 contacts rejoined');
  await page.locator('#birdlab-vane-junction').fill('8');
  await expect(page.locator('[data-vane-contact-detail]')).toHaveAttribute('aria-label', /Contact 9|contact 9/);
  const detachedTransform = await page.locator('[data-vane-detail-hook]').getAttribute('transform');
  await page.locator('#birdlab-vane-junction').fill('2');
  const attachedTransform = await page.locator('[data-vane-detail-hook]').getAttribute('transform');
  expect(detachedTransform).not.toBe(attachedTransform); expect(attachedTransform).toBe('translate(0 0)');
  const rail = await page.locator('[data-vane-detail-rail]').getAttribute('d');
  await page.locator('#birdlab-vane-junction').fill('8');
  expect(await page.locator('[data-vane-detail-rail]').getAttribute('d')).not.toBe(rail);
  await seek(page, 100); const closed = await geometry(page);
  expect(closed.every(contact => contact.joined)).toBe(true);
  await expect(page.locator('[data-vane-count]')).toHaveText('12 / 12 contacts rejoined');
  await page.locator('[data-vane-lens="barbs"]').click();
  expect(await page.locator('[data-vane-specimen="Pinned"]').innerHTML()).toBe(pinned);
  // Use native Bezier bounds plus actual stroke extents and the hook's group
  // transform. Even a tiny open contact must read as detached; the earlier
  // partial-opening screenshot had overlapping strokes despite its label.
  for (const example of [{opening:1,stroke:0,index:0},{opening:70,stroke:70,index:8},{opening:100,stroke:0,index:11}]) {
    await page.locator('#birdlab-vane-opening').fill(String(example.opening)); await seek(page,example.stroke);
    await page.locator('#birdlab-vane-junction').fill(String(example.index)); const bounds=await insetBounds(page);
    expect(bounds.rail.top-bounds.hook.bottom).toBeGreaterThan(10);
    expect(bounds.hook.top).toBeGreaterThanOrEqual(bounds.viewBox.top);
    expect(bounds.rail.bottom).toBeLessThanOrEqual(bounds.viewBox.bottom);
  }
  await seek(page,100); const wrapped=await insetBounds(page);
  expect(wrapped.hook.bottom).toBeGreaterThan(wrapped.rail.top);
  await expect(page.locator('[data-vane-detail-hook]')).toHaveAttribute('transform','translate(0 0)');
  await page.locator('#birdlab-vane-opening').fill('0'); await expect(page.locator('#birdlab-vane-stroke')).toHaveValue('0');
  expect((await geometry(page)).every(contact => contact.joined)).toBe(true);
  await page.locator('[data-vane-answer="grow"]').click();
  await expect(page.locator('.birdlab-vane-feedback[role="status"]')).toContainText('does not require new branches');
  await page.locator('[data-vane-answer="reconnect"]').click();
  await expect(page.locator('.birdlab-vane-feedback[role="status"]')).toContainText('does not show that every damaged feather');
  await page.locator('[data-vane-clear-pin]').click(); await expect(page.locator('[data-vane-comparison]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('one optional smoothing clock preserves manual inspection and pause and cleans up on exit', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    let now = 1000, id = 0; const frames = new Map<number, FrameRequestCallback>();
    requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
    cancelAnimationFrame = handle => { frames.delete(handle); };
    (window as any).vaneStep = (ms: number) => { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
    (window as any).vanePending = () => frames.size;
  });
  const root = page.locator('[data-birdlab-vane-study]');
  const step = (ms: number) => page.evaluate(ms => (window as any).vaneStep(ms), ms);
  await expect(root).toHaveAttribute('data-playing', 'false'); const initial = await geometry(page);
  await step(5000); expect(await geometry(page)).toEqual(initial);
  await page.locator('[data-vane-play]').click(); await step(10); await step(80);
  await expect(root).toHaveAttribute('data-vane-stroke', '37.000');
  await page.locator('[data-vane-play]').click(); const paused = await geometry(page); await step(5000); expect(await geometry(page)).toEqual(paused);
  await page.locator('[data-vane-play]').click(); await step(10); await step(80); await expect(root).toHaveAttribute('data-vane-stroke', '39.000');
  await seek(page, 99); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.locator('[data-vane-play]').click(); await step(10); await step(80);
  await expect(root).toHaveAttribute('data-vane-stroke', '100.000'); await expect(root).toHaveAttribute('data-playing', 'false');
  await step(10000); await expect(root).toHaveAttribute('data-vane-stroke', '100.000');
  await page.locator('[data-vane-play]').click(); await expect(root).toHaveAttribute('data-vane-stroke', '0.000');
  await page.locator('[data-vane-lens="barbs"]').click(); await expect(root).toHaveAttribute('data-playing', 'false');
  await expect(page.locator('[data-vane-focus-note]')).toContainText('neighboring barbs');
  await page.locator('[data-vane-play]').click(); await page.locator('[data-vane-pin]').click(); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.locator('[data-vane-play]').click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-playing', 'false');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('[data-vane-play]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.locator('[data-vane-reopen]').click(); await expect(root).toHaveAttribute('data-vane-stroke', '0.000');
  await page.locator('[data-vane-play]').click(); await page.getByRole('button', { name: '← Menu', exact: true }).click();
  await expect(root).toHaveCount(0); await step(10000); expect(await page.evaluate(() => (window as any).vanePending())).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('vane controls retain keyboard focus and fit desktop, phone and embedded layouts with readable controls', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport:1280,host:1100 },{ viewport:390,host:390 },{ viewport:1280,host:500 }]) {
    await sizing(page, layout.viewport, layout.host);
    const opening = page.locator('#birdlab-vane-opening'); await opening.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(opening).toBeFocused(); await expect(opening).toHaveValue('1'); await page.keyboard.press('End'); await expect(opening).toHaveValue('100');
    const stroke = page.locator('#birdlab-vane-stroke'); await stroke.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(stroke).toBeFocused(); await expect(stroke).toHaveValue('1'); await page.keyboard.press('End'); await expect(stroke).toHaveValue('100');
    const lens = page.locator('[data-vane-lens="barbules"]'); await lens.focus(); await page.keyboard.press('Enter'); await expect(lens).toBeFocused(); await expect(lens).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-vane-pin]').click(); await seek(page, 50); await page.locator('[data-vane-answer="reconnect"]').click();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-birdlab-vane-study]','[data-vane-specimen="current"]','.birdlab-vane-panel','.birdlab-vane-detail','[data-vane-contact-detail]','[data-vane-contact-key]','[data-vane-comparison]','.birdlab-vane-evidence']) {
      const element=page.locator(selector), box=(await element.boundingBox())!;
      expect(box.x,selector).toBeGreaterThanOrEqual(host.x-1); expect(box.x+box.width,selector).toBeLessThanOrEqual(host.x+host.width+1);
      expect(await element.evaluate(node=>node.scrollWidth-node.clientWidth),selector).toBeLessThanOrEqual(1);
    }
    expect((await page.locator('[data-vane-specimen="current"]').boundingBox())!.width).toBeGreaterThan(300);
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-birdlab-vane-study]'), { runOnly:{type:'rule',values:['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']} });
      return report.violations.map((item:any)=>({id:item.id,targets:item.nodes.map((node:any)=>node.target)}));
    }); expect(violations).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
