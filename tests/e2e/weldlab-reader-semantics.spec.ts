import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-reader-contrast');
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
async function activate(page: Page, target: Locator) { await target.focus(); await page.keyboard.press('Enter'); }
async function focusVisible(page: Page, target: Locator) {
  await expect(target).toBeFocused();
  const box = await target.boundingBox(); expect(box).toBeTruthy();
  expect(box!.y).toBeLessThan(900); expect(box!.y + box!.height).toBeGreaterThan(0);
  const outline = await target.evaluate(el => ({ width: parseFloat(getComputedStyle(el).outlineWidth), style: getComputedStyle(el).outlineStyle }));
  expect(outline.width).toBeGreaterThanOrEqual(2); expect(outline.style).not.toBe('none');
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.weldLab))); }
async function audit(page: Page, name: string) {
  await page.waitForTimeout(250);
  const result = await page.evaluate(async () => {
    const axe = (window as any).axe; axe.reset();
    const r = await axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    const detail = (v: any) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html, summary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].map((c: any) => ({ id: c.id, message: c.message, data: c.data })) })) });
    return { violations: r.violations.map(detail), incomplete: r.incomplete.map(detail), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  writeFileSync(resolve(output, 'reader-' + name + '-axe.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
}

// Record actual Chromium accessibility nodes, rather than inferring the AX tree
// from DOM attributes. This verifies browser exposure; it does not test speech
// from NVDA, Narrator, JAWS or VoiceOver.
async function axRecord(page: Page, selectors: string[], name: string) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Accessibility.enable');
    const { root } = await client.send('DOM.getDocument');
    const targets = [];
    for (const selector of selectors) {
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      expect(nodeId, 'Missing AX record target ' + selector).toBeGreaterThan(0);
      const { node } = await client.send('DOM.describeNode', { nodeId });
      targets.push({ selector, backendDOMNodeId: node.backendNodeId });
    }
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    const records = targets.map(target => {
      const node = nodes.find(n => n.backendDOMNodeId === target.backendDOMNodeId);
      expect(node, 'Missing AX node ' + target.selector).toBeTruthy();
      const childIds = new Set(node!.childIds || []);
      return { selector: target.selector, node: node!, children: nodes.filter(n => childIds.has(n.nodeId)) };
    });
    writeFileSync(resolve(output, 'reader-' + name + '-ax.json'), JSON.stringify({ method: 'Chromium CDP Accessibility.getFullAXTree; browser exposure only, not spoken assistive-technology validation', totalNodes: nodes.length, records }, null, 2));
    return records;
  } finally { await client.detach(); }
}
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const retained = { car2_reflect: 'Keep these notes.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };

for (const width of [1280, 320]) {
  test('Decoder summaries and Clear pin expose reader context at ' + width + 'px', async ({ page }) => {
    for (const contrast of [false, true]) {
      const suffix = width + '-' + (contrast ? 'contrast' : 'default');
      await mount(page, { ...retained, view: 'consumables', cons_mode: 'browse', cons_sect: 'decoder', tech2_cons_code: 'E7018' }, width, contrast);
      const pin = page.locator('[data-cons-code-pin]'), clear = page.locator('[data-cons-code-clear]'), input = page.locator('#tech2-dec-input');
      await activate(page, pin); await input.fill('ER70S-6');
      const positionSelector = '[data-cons-code-row="position"] summary';
      const chemistrySelector = '[data-cons-code-row="chem"] summary';
      const position = page.locator(positionSelector), chemistry = page.locator(chemistrySelector);
      await expect(page.locator('[data-cons-code-row="position"]')).toHaveJSProperty('open', false);
      await expect(position).toHaveAccessibleName(/Current:\s*Not present in this decoded example\.[\s\S]*Pinned:\s*1/);
      await expect(chemistry).toHaveAccessibleName(/Pinned:\s*Not present in this decoded example\./);
      await expect(position).not.toHaveAccessibleName(/—/);
      await expect(page.locator('[data-cons-code-compare] strong[aria-label]')).toHaveCount(0);
      const records = await axRecord(page, [positionSelector, chemistrySelector, '[data-cons-specimen-svg]'], 'decoder-comparison-' + suffix);
      for (const record of records.slice(0, 2)) {
        expect(record.node.ignored).toBe(false);
        expect(['DisclosureTriangle', 'button']).toContain(record.node.role?.value);
        expect(record.node.name?.value).toContain('Not present in this decoded example.');
        expect(record.node.name?.value).not.toContain('—');
      }
      expect(records[2].node.role?.value).toBe('image');
      expect(String(records[2].node.name?.value).length).toBeGreaterThan(20);
      await audit(page, 'decoder-comparison-' + suffix);
      const beforeValidClear = await saved(page);
      await activate(page, clear); await focusVisible(page, pin);
      await expect(clear).toHaveCount(0); await expect(page.locator('[data-cons-code-compare]')).toHaveCount(0);
      expect(await saved(page)).toEqual(beforeValidClear);
      await audit(page, 'decoder-valid-clear-' + suffix);
      await activate(page, pin); await input.fill('XYZ'); await expect(pin).toBeDisabled();
      const beforeInvalidClear = await saved(page);
      await activate(page, clear); await focusVisible(page, input);
      await expect(clear).toHaveCount(0); await expect(pin).toBeDisabled(); await expect(input).toHaveValue('XYZ');
      expect(await saved(page)).toEqual(beforeInvalidClear);
      expect(await saved(page)).toMatchObject(retained);
      await audit(page, 'decoder-invalid-clear-' + suffix);
    }
  });

  test('Noise probe results expose a persistent related polite status at ' + width + 'px', async ({ page }) => {
    for (const contrast of [false, true]) {
      const suffix = width + '-' + (contrast ? 'contrast' : 'default');
      await mount(page, { ...retained, view: 'safetyHealth', sh_mode: 'browse', sh_sect: 'noise', safe2_noise: [{ db: 100, h: 1 }, { db: 85, h: 6 }] }, width, contrast);
      const probe = page.locator('[data-noise-probe]'), status = page.locator('[data-noise-cumulative]');
      const before = await saved(page);
      await expect(status).toHaveAttribute('role', 'status'); await expect(status).toHaveAttribute('aria-live', 'polite'); await expect(status).toHaveAttribute('aria-atomic', 'true');
      await expect(probe).toHaveAttribute('aria-describedby', 'safe4-noise-cumulative');
      await page.evaluate(() => {
        const w = window as any, node = document.querySelector('[data-noise-cumulative]')!;
        w.__readerNoiseNode = node; w.__readerNoiseMutations = [];
        w.__readerNoiseObserver = new MutationObserver(records => w.__readerNoiseMutations.push(...records.map(record => ({ type: record.type, text: node.textContent }))));
        w.__readerNoiseObserver.observe(node, { childList: true, characterData: true, subtree: true });
      });
      const doses = async (osha: number, niosh: number) => {
        await expect.poll(() => status.evaluate((el: HTMLElement) => Number(el.dataset.oshaDose))).toBe(osha);
        await expect.poll(() => status.evaluate((el: HTMLElement) => Number(el.dataset.nioshDose))).toBe(niosh);
        expect(await page.evaluate(() => (window as any).__readerNoiseNode === document.querySelector('[data-noise-cumulative]'))).toBe(true);
        const oshaText = await status.locator('[data-noise-dose-reading="osha"]').innerText();
        const nioshText = await status.locator('[data-noise-dose-reading="niosh"]').innerText();
        await expect(probe).toHaveAccessibleDescription(new RegExp('OSHA dose at probe\\s*' + escape(oshaText) + '[\\s\\S]*NIOSH dose at probe\\s*' + escape(nioshText)));
      };
      await doses(87.5, 475);
      await probe.focus(); await page.keyboard.press('Home'); await doses(0, 0); await expect(probe).toBeFocused();
      await page.keyboard.press('End'); await doses(87.5, 475); await expect(probe).toBeFocused();
      const start = page.locator('[data-noise-probe-start]'); await activate(page, start); await doses(0, 0); await focusVisible(page, start);
      const end = page.locator('[data-noise-probe-end]'); await activate(page, end); await doses(87.5, 475); await focusVisible(page, end);
      const first = page.locator('[data-noise-task="0"]'); await activate(page, first); await doses(50, 400); await focusVisible(page, first);
      const records = await axRecord(page, ['[data-noise-cumulative]', '[data-noise-probe]'], 'noise-status-' + suffix);
      const statusNode = records[0].node;
      expect(statusNode.ignored).toBe(false); expect(statusNode.role?.value).toBe('status');
      expect(statusNode.properties?.find(p => p.name === 'live')?.value.value).toBe('polite');
      expect(statusNode.properties?.find(p => p.name === 'atomic')?.value.value).toBe(true);
      expect(records[1].node.description?.value).toContain('OSHA dose at probe');
      expect(records[1].node.description?.value).toContain('NIOSH dose at probe');
      const notifications = await page.evaluate(() => {
        const w = window as any; w.__readerNoiseObserver.disconnect();
        return { nodeRetained: w.__readerNoiseNode === document.querySelector('[data-noise-cumulative]'), mutations: w.__readerNoiseMutations, limitation: 'DOM mutation notifications and Chromium AX properties do not establish actual spoken screen-reader output.' };
      });
      expect(notifications.nodeRetained).toBe(true); expect(notifications.mutations.length).toBeGreaterThan(0);
      writeFileSync(resolve(output, 'reader-noise-status-' + suffix + '-mutations.json'), JSON.stringify(notifications, null, 2));
      expect(await saved(page)).toEqual(before);
      await audit(page, 'noise-status-' + suffix);
    }
  });
}

test('Joint-angle labels retain names and numeric equivalents at 320px in high contrast', async ({ page }) => {
  await mount(page, { ...retained, view: 'jointCatalog', jc_tab: 'butt', proc2_prep: 'v' }, 320, true);
  const drawing = page.locator('[data-joint-angle-drawing]');
  for (const [id, left, right, included] of [['v375', 37.5, 37.5, 75], ['bevel45', 45, 0, 45]] as const) {
    const preset = page.locator('[data-joint-angle-preset="' + id + '"]');
    await activate(page, preset); await focusVisible(page, preset);
    await expect(preset).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-joint-angles]')).toHaveAttribute('data-joint-angles', id);
    await expect(drawing).toHaveAccessibleName(new RegExp('left bevel ' + escape(String(left)) + ' degrees and right bevel ' + escape(String(right)) + ' degrees, making an included angle of ' + included + ' degrees'));
    for (const [field, value] of [['left', left], ['right', right], ['included', included]] as const) {
      const reading = page.locator('[data-joint-angle-reading="' + field + '"]');
      await expect(reading).toHaveAttribute('data-value', String(value)); await expect(reading).toContainText(value + '°');
    }
    await expect(page.locator('[data-joint-angle-equation]')).toContainText('α = βL + βR = ' + left + '° + ' + right + '° = ' + included + '°');
    const records = await axRecord(page, ['[data-joint-angle-drawing]'], 'joint-' + id + '-320-contrast');
    expect(records[0].node.role?.value).toBe('image'); expect(records[0].node.name?.value).toContain('included angle of ' + included + ' degrees');
  }
  await expect(page.locator('[data-joint-angle-equation]')).toContainText('right edge is square');
  await expect(drawing.locator('[data-joint-angle-label-ground="land"]')).toHaveCount(1);
  await drawing.screenshot({ path: resolve(output, 'joint-labels-320-contrast.png') });
  expect(await saved(page)).toMatchObject(retained);
  await audit(page, 'joint-labels-320-contrast');
});
