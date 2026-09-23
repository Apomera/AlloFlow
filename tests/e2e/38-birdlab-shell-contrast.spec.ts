/**
 * Bird Lab inside the host's dark tool shell: text on tinted buttons stays dark.
 *
 * stem_lab_module.js paints every tool on #0f172a and resets dark text CLASSES
 * (text-slate/stone/...-700..900) to `color: inherit`, restoring dark ink only
 * on its list of light backgrounds (bg-white, bg-*-50, ...). A button with a
 * -100/-200 tint and a text-stone-900 class that sits straight on the shell
 * therefore gets the shell's LIGHT ink on a light tint. The species pickers in
 * seven family views were 1.0-1.1:1 (their class string was also mangled into
 * "text-stonetransition-colors -900"), as were the gull picker, the dichotomous
 * key's Back button and the glossary search box. The plain harness has neither
 * the shell nor the shim, so none of this showed there.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolId: 'birdLab',
  toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1100,
  height: 900,
  appStyles: true,
  layout: 'document',
});

test.describe.configure({ timeout: 600_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const DARK_TEXT = ['slate', 'gray', 'zinc', 'neutral', 'stone'].flatMap((c) => [700, 800, 900].map((n) => `.text-${c}-${n}`));
const LIGHT_BG = ['.bg-white', '.bg-slate-100', '.bg-gray-100', '.from-white',
  ...['slate', 'gray', 'zinc', 'neutral', 'stone', 'indigo', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow',
    'amber', 'orange', 'red', 'rose', 'pink', 'fuchsia', 'purple', 'violet'].map((c) => `.bg-${c}-50`)];
const SHIM = DARK_TEXT.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: inherit; }\n'
  + LIGHT_BG.map((c) => `[data-stem-tool-shell] ${c}`).join(', ') + ' { color: #1e293b; }';

async function mountInShell(page: Page, view: string) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab, null, { timeout: 30000 });
  await page.evaluate(({ shim, v }) => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.setAttribute('data-stem-tool-shell', 'true');
    wrap.style.background = '#0f172a';
    wrap.style.color = '#e2e8f0';
    const st = document.createElement('style'); st.textContent = shim; document.head.appendChild(st);
    (window as any).__mount({ birdLab: { view: v } });
  }, { shim: SHIM, v: view });
  await page.waitForFunction(() => ((document.querySelector('#wrap') as HTMLElement).innerText || '').length > 80, null, { timeout: 30000 });
}

const contrast = (page: Page) => page.evaluate(async () => {
  const r = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'rule', values: ['color-contrast'] } });
  return (r.violations[0]?.nodes || []).map((n: any) =>
    `${String(n.target[0]).slice(0, 70)} "${(document.querySelector(n.target[0])?.textContent || '').trim().slice(0, 30)}" ${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor}`);
});

// Each family view: its default species is selected, so every other picker
// button is an unselected tint, the case that failed.
for (const view of ['sparrows', 'thrushes', 'woodpeckers', 'finches', 'blackbirds', 'hummswift', 'flyvireo', 'gullId']) {
  test(`${view}: species picker and card are readable in the shell`, async ({ page }) => {
    await mountInShell(page, view);
    expect(await page.locator('button[aria-pressed="true"]').count(), 'a selected species').toBeGreaterThanOrEqual(1);
    expect(await contrast(page)).toEqual([]);
  });
}

for (const view of ['habitatMatch', 'glossaryDeep', 'lifeList', 'calls', 'ispy']) {
  test(`${view} is readable in the shell`, async ({ page }) => {
    await mountInShell(page, view);
    expect(await contrast(page)).toEqual([]);
  });
}

test('dichotomous key: the Back button is readable once a choice is made', async ({ page }) => {
  await mountInShell(page, 'dichotomous');
  await page.locator('button.w-full.border-violet-300').first().click();
  await expect(page.getByRole('button', { name: '← Back' })).toBeVisible();
  expect(await contrast(page)).toEqual([]);
});

test('glossary search: typed text is dark on the white field', async ({ page }) => {
  await mountInShell(page, 'glossaryDeep');
  const box = page.getByRole('textbox', { name: 'Search birding glossary' });
  await box.fill('lores');
  const ink = await box.evaluate((el) => getComputedStyle(el).color);
  expect(ink).toBe('rgb(30, 41, 59)');
});
