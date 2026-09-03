import { test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const h = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js', toolId: 'anatomy', width: 1280, height: 1400, appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['vendor/three-r128/OrbitControls.js', 'vendor/three-r128/GLTFLoader.js'],
});
test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await h.start(); });
test.afterAll(async () => { await h.stop(); });

test('prose no longer stops mid-word', async ({ page }) => {
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const grade of ['9', '2']) {
    await h.mount(page, { anatomy: { system: 'circulatory', view: 'anterior', complexity: 3, _activeTab: 'explore', _startHereDismissed: true, selectedStructure: 'heart', _compareStructure: 'kidneys' } }, undefined, { expectCanvas: false });
    await page.evaluate((g) => { (window as any).__ctx.gradeLevel = g; (window as any).__rerender(); }, grade);
    const card = page.locator('.bg-violet-50.rounded-lg');
    const texts = await card.locator('p').allTextContents();
    console.log('[compare grade ' + grade + ']', JSON.stringify(texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 105))));
  }
  await h.mount(page, { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'flashcards', _startHereDismissed: true, _flashcardFlipped: true, _flashcardIdx: 0 } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { (window as any).__ctx.gradeLevel = '9'; (window as any).__rerender(); });
  const clin = await page.locator('[role="group"][aria-label^="Flashcard"] p').allTextContents();
  console.log('[flashcard]', JSON.stringify(clin.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 105))));
});
