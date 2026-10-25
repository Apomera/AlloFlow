import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-diagram-accessibility');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, state: object, width: number, contrast: boolean) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const host = document.createElement('div'); document.body.append(host); const w = window as any; w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host); });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block'; });
  await page.waitForFunction(() => Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width - innerWidth) < 1);
  if (contrast) await page.evaluate(() => { document.body.classList.add('theme-contrast'); Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' }); (window as any).__rerender(); });
  await page.waitForTimeout(250);
}
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.weldLab))); }
async function focusVisible(page: Page, target: Locator) {
  await expect(target).toBeFocused();
  const box = await target.boundingBox(); expect(box).toBeTruthy();
  expect(box!.y).toBeLessThan(900); expect(box!.y + box!.height).toBeGreaterThan(0);
  const outline = await target.evaluate(el => ({ width: parseFloat(getComputedStyle(el).outlineWidth), style: getComputedStyle(el).outlineStyle }));
  expect(outline.width).toBeGreaterThanOrEqual(2); expect(outline.style).not.toBe('none');
}
async function audit(page: Page, name: string) {
  const result = await page.evaluate(async () => {
    const axe = (window as any).axe; axe.reset();
    const r = await axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    const detail = (v: any) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html, summary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].map((c: any) => ({ id: c.id, message: c.message, data: c.data })) })) });
    return { violations: r.violations.map(detail), incomplete: r.incomplete.map(detail), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  writeFileSync(resolve(output, 'reader-' + name + '-axe.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
}
// These are actual browser accessibility nodes. They do not establish the
// spoken behavior of NVDA, Narrator, JAWS, VoiceOver, or another screen reader.
async function axRecord(page: Page, selectors: string[], name: string) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Accessibility.enable');
    const { root } = await client.send('DOM.getDocument');
    const targets = [];
    for (const selector of selectors) {
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      expect(nodeId, selector).toBeGreaterThan(0);
      const { node } = await client.send('DOM.describeNode', { nodeId });
      targets.push({ selector, backendDOMNodeId: node.backendNodeId });
    }
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    const records = targets.map(target => {
      const node = nodes.find(n => n.backendDOMNodeId === target.backendDOMNodeId);
      expect(node, target.selector).toBeTruthy();
      const children = new Set(node!.childIds || []);
      return { selector: target.selector, node: node!, children: nodes.filter(n => children.has(n.nodeId)) };
    });
    writeFileSync(resolve(output, 'reader-' + name + '-ax.json'), JSON.stringify({ method: 'Chromium CDP Accessibility.getFullAXTree; browser exposure only, not spoken assistive-technology validation', totalNodes: nodes.length, records }, null, 2));
    return records;
  } finally { await client.detach(); }
}
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const retained = { car2_reflect: 'Keep this reflection.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const GOOD = [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'J', w: false }];

for (const width of [1280, 320]) {
  test('Bevel results retain native list semantics and expose derived readings at ' + width + 'px', async ({ page }) => {
    for (const contrast of [false, true]) {
      const suffix = width + '-' + (contrast ? 'contrast' : 'default');
      await mount(page, { ...retained, view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'geometry' }, width, contrast);
      const before = await saved(page), probe = page.locator('[data-bevel-angle]'), result = page.locator('#math9-bevel-readings');
      await expect(result).toHaveJSProperty('tagName', 'DL'); await expect(result).not.toHaveAttribute('role');
      await expect(result).toHaveCount(1); await expect(result.locator('dt')).toHaveCount(4); await expect(result.locator('dd')).toHaveCount(4);
      await expect(result).toHaveAttribute('aria-live', 'polite'); await expect(result).toHaveAttribute('aria-atomic', 'true');
      await expect(probe).toHaveAttribute('aria-describedby', 'math9-bevel-readings');
      await page.evaluate(() => {
        const w = window as any, node = document.getElementById('math9-bevel-readings')!;
        w.__diagramBevelNode = node; w.__diagramBevelMutations = [];
        w.__diagramBevelObserver = new MutationObserver(records => w.__diagramBevelMutations.push(...records.map(record => ({ type: record.type, text: node.textContent }))));
        w.__diagramBevelObserver.observe(node, { childList: true, characterData: true, subtree: true });
      });
      const readings = async (face: string, run: string, angle: string) => {
        await expect(result.locator('[data-bevel-reading="face"]')).toHaveText(face);
        await expect(result.locator('[data-bevel-reading="run"]')).toHaveText(run);
        await expect(result.locator('[data-bevel-reading="angle"]')).toHaveText(angle);
        await expect(probe).toHaveAccessibleDescription(new RegExp('Thickness[\\s\\S]*0\\.5 in[\\s\\S]*Bevel face[\\s\\S]*' + escape(face) + '[\\s\\S]*Horizontal run[\\s\\S]*' + escape(run) + '[\\s\\S]*Highlighted angle[\\s\\S]*' + escape(angle)));
        expect(await page.evaluate(() => (window as any).__diagramBevelNode === document.getElementById('math9-bevel-readings'))).toBe(true);
      };
      await probe.focus(); await page.keyboard.press('Home'); await expect(probe).toHaveValue('0');
      await readings('0.500 in', '0.000 in', '0° from vertical'); await expect(probe).toBeFocused();
      await page.keyboard.press('End'); await expect(probe).toHaveValue('60');
      await readings('1.000 in', '0.866 in', '60° from vertical'); await expect(probe).toBeFocused();
      const horizontal = page.locator('[data-bevel-lens="horizontal"]'); await activate(page, horizontal);
      await readings('1.000 in', '0.866 in', '30° from horizontal'); await focusVisible(page, horizontal);
      const records = await axRecord(page, ['#math9-bevel-readings', '[data-bevel-angle]'], 'bevel-horizontal-' + suffix);
      expect(records[0].node.ignored).toBe(false); expect(records[0].node.role?.value).toBe('DescriptionList');
      expect(records[0].node.properties?.find(p => p.name === 'live')?.value.value).toBe('polite');
      expect(records[0].node.properties?.find(p => p.name === 'atomic')?.value.value).toBe(true);
      expect(records[1].node.description?.value).toContain('1.000 in'); expect(records[1].node.description?.value).toContain('0.866 in');
      expect(records[1].node.description?.value).toContain('30° from horizontal');
      const reset = page.locator('[data-bevel-reset]'); await activate(page, reset); await expect(probe).toHaveValue('30');
      await readings('0.577 in', '0.289 in', '30° from vertical'); await focusVisible(page, reset);
      await axRecord(page, ['#math9-bevel-readings', '[data-bevel-angle]'], 'bevel-restored-' + suffix);
      const mutations = await page.evaluate(() => {
        const w = window as any; w.__diagramBevelObserver.disconnect();
        return { nodeRetained: w.__diagramBevelNode === document.getElementById('math9-bevel-readings'), mutations: w.__diagramBevelMutations, limitation: 'DOM notifications and browser AX properties do not establish spoken screen-reader output.' };
      });
      expect(mutations.nodeRetained).toBe(true); expect(mutations.mutations.length).toBeGreaterThan(0);
      writeFileSync(resolve(output, 'reader-bevel-' + suffix + '-mutations.json'), JSON.stringify(mutations, null, 2));
      expect(await saved(page)).toEqual(before); await audit(page, 'bevel-' + suffix);
    }
  });

  test('Robot inspector returns endpoint focus to the current native move at ' + width + 'px', async ({ page }) => {
    for (const contrast of [false, true]) {
      const suffix = width + '-' + (contrast ? 'contrast' : 'default');
      await mount(page, { ...retained, view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: GOOD }, width, contrast);
      const before = await saved(page), select = page.locator('[data-robot-inspect-select]'), next = page.locator('[data-robot-inspect-next]'), previous = page.locator('[data-robot-inspect-prev]');
      await next.focus(); await page.keyboard.press('Enter'); await expect(select).toHaveValue('1'); await expect(next).toBeFocused();
      await page.keyboard.press('Enter'); await expect(select).toHaveValue('2'); await expect(next).toBeFocused();
      await page.keyboard.press('Enter'); await expect(select).toHaveValue('3'); await expect(next).toBeDisabled(); await focusVisible(page, select);
      const last = await axRecord(page, ['[data-robot-inspect-select]'], 'robot-last-' + suffix);
      expect(last[0].node.role?.value).toBe('combobox'); expect(last[0].node.value?.value).toBe('Move 4 of 4');
      await page.screenshot({ path: resolve(output, 'reader-robot-last-' + suffix + '-focus.png') });
      await previous.focus(); await page.keyboard.press('Enter'); await expect(select).toHaveValue('2'); await expect(previous).toBeFocused();
      await page.keyboard.press('Enter'); await expect(select).toHaveValue('1'); await expect(previous).toBeFocused();
      await page.keyboard.press('Enter'); await expect(select).toHaveValue('0'); await expect(previous).toBeDisabled(); await focusVisible(page, select);
      const first = await axRecord(page, ['[data-robot-inspect-select]'], 'robot-first-' + suffix);
      expect(first[0].node.role?.value).toBe('combobox'); expect(first[0].node.value?.value).toBe('Move 1 of 4');
      await select.selectOption('2'); await expect(select).toBeFocused();
      const progress = page.locator('[data-robot-inspect-progress]'); await progress.focus(); await page.keyboard.press('Home');
      await expect(progress).toHaveValue('0'); await expect(progress).toBeFocused();
      await page.keyboard.press('End'); await expect(progress).toHaveValue('100'); await expect(progress).toBeFocused();
      const position = await page.locator('[data-robot-inspect-position]').evaluate((el: HTMLElement) => ({ x: Number(el.dataset.xMm).toFixed(1), y: Number(el.dataset.yMm).toFixed(1) }));
      await expect(progress).toHaveAttribute('aria-valuetext', '100 percent; torch x ' + position.x + ', y ' + position.y + ' millimetres');
      const row = page.locator('[data-robot-inspect-row="1"]'); await activate(page, row); await expect(row).toBeFocused(); await expect(select).toHaveValue('0');
      expect(await saved(page)).toEqual(before); await audit(page, 'robot-' + suffix);
    }
  });
}
