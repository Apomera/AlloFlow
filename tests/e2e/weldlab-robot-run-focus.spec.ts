import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const phase = process.env.WELDLAB_RUN_PHASE || 'final';
const source = process.env.WELDLAB_RUN_SOURCE || 'stem_lab/stem_tool_weldlab.js';
const output = resolve('reports/weldlab-diagram-accessibility');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: source, preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], appStyles: true, layout: 'document' });
test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
const retained = { car2_reflect: 'Keep this reflection.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const GOOD = [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'J', w: false }];
const runningText = 'Program running. Inspection is paused until it finishes.';

async function mount(page: Page, width: number, contrast: boolean) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await harness.mount(page, { weldLab: { ...retained, view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: GOOD } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const host = document.createElement('div'); document.body.append(host); const w = window as any; w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host); });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block'; });
  await page.waitForFunction(() => Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width - innerWidth) < 1);
  if (contrast) await page.evaluate(() => { document.body.classList.add('theme-contrast'); Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' }); (window as any).__rerender(); });
  await page.waitForTimeout(250);
}
async function focusVisible(page: Page, target: Locator) {
  await expect(target).toBeFocused(); const box = await target.boundingBox(); expect(box).toBeTruthy();
  expect(box!.y).toBeLessThan(900); expect(box!.y + box!.height).toBeGreaterThan(0);
  const style = await target.evaluate(el => ({ width: parseFloat(getComputedStyle(el).outlineWidth), style: getComputedStyle(el).outlineStyle }));
  expect(style.width).toBeGreaterThanOrEqual(2); expect(style.style).not.toBe('none');
}
async function focusedAX(page: Page) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Accessibility.enable');
    const { root } = await client.send('DOM.getDocument');
    const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: ':focus' });
    if (!nodeId) return { node: null, note: 'No explicit :focus target; document.activeElement may be the body fallback.' };
    const { node: domNode } = await client.send('DOM.describeNode', { nodeId });
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    const node = nodes.find(n => n.backendDOMNodeId === domNode.backendNodeId), children = new Set(node?.childIds || []);
    return { node, children: nodes.filter(n => children.has(n.nodeId)), method: 'Chromium accessibility-tree exposure only; not spoken screen-reader validation.' };
  } finally { await client.detach(); }
}

test('Ordinary Robot Run records or verifies the running handoff and existing completion focus', async ({ page }) => {
  for (const width of [1280, 320]) for (const contrast of [false, true]) {
    const suffix = width + '-' + (contrast ? 'contrast' : 'default');
    await mount(page, width, contrast);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
    const run = page.getByRole('button', { name: '▶ Run program', exact: true });
    const running = page.getByText(runningText, { exact: true });
    const beforeLive = await page.evaluate(() => document.getElementById('allo-live-weldlab')?.textContent || '');
    await run.focus(); await page.keyboard.press('Enter');
    await expect(run).toBeDisabled(); await expect(running).toHaveCount(1);
    if (phase !== 'baseline') {
      await expect(running).toHaveAttribute('data-robot-running-status', 'true');
      await expect(running).toHaveAttribute('tabindex', '-1'); await focusVisible(page, running);
    }
    const initial = await running.evaluate(el => {
      const active = document.activeElement, box = el.getBoundingClientRect(), s = getComputedStyle(el);
      return {
        handoffObserved: active === el, statusText: el.textContent, explicitTabIndex: el.getAttribute('tabindex'),
        ariaLive: el.getAttribute('aria-live'), role: el.getAttribute('role'),
        activeTag: active?.tagName, activeText: active?.textContent?.slice(0, 220), activeHtml: active?.outerHTML.slice(0, 500),
        statusBox: { x: box.x, y: box.y, width: box.width, height: box.height },
        outline: { width: s.outlineWidth, style: s.outlineStyle, color: s.outlineColor },
      };
    });
    const initialAX = await focusedAX(page);
    expect(initial.ariaLive).toBeNull(); expect(initial.role).toBeNull();
    if (phase !== 'baseline') expect(initial.handoffObserved).toBe(true);
    const runningImage = await page.screenshot({ animations: 'disabled' });
    // The real RAF animation continues. A consumed handoff must not reclaim
    // focus when the user moves to the still-available workcell during the run.
    const grid = page.locator('[role="application"][aria-describedby="tech2-rob-help"]');
    await expect(running).toHaveCount(1); await grid.focus(); await page.waitForTimeout(100);
    await expect(grid).toBeFocused(); await expect(running).toHaveText(runningText);
    expect(await page.evaluate(() => document.getElementById('allo-live-weldlab')?.textContent || '')).toBe(beforeLive);
    const result = page.locator('div[tabindex="-1"]').filter({ hasText: /Weld complete: seam fully covered, no faults\.|The program needs work\./ });
    await expect(result).toHaveCount(1, { timeout: 15_000 }); await focusVisible(page, result);
    await expect(running).toHaveCount(0); await expect(run).toBeEnabled();
    const latest = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.weldLab)));
    expect(latest).toMatchObject(retained); expect(latest.tech2_rob_prog).toEqual(GOOD);
    const record = { phase, source, width, contrast, motion: 'no-preference', initial, initialAX, manualMidRunFocusRetained: true, completionFocused: true, completionText: await result.innerText(), savedProgramRetained: true, pageOverflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), limitation: 'Browser focus and accessibility-tree checks do not establish actual spoken assistive-technology output.' };
    writeFileSync(resolve(output, 'reader-robot-run-' + phase + '-' + suffix + '-running.png'), runningImage);
    writeFileSync(resolve(output, 'reader-robot-run-' + phase + '-' + suffix + '.json'), JSON.stringify(record, null, 2));
    expect(record.pageOverflow).toBeLessThanOrEqual(1);
  }
});
