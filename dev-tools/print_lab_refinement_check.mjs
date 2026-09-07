import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createDemoServer } from './school_rewards_admin_demo.mjs';

const output = new URL('../reports/school-store-refinements-2026-09-07/', import.meta.url);
await mkdir(output, { recursive: true });
const { server, url } = await createDemoServer();
const browser = await chromium.launch({ headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => {
    if (!route.request().url().startsWith(url + '/')) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.goto(url + '/design');
  await page.getByLabel('Object to create', { exact: true }).fill('A turtle with a broad base');
  await page.getByRole('button', { name: 'Create editable recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Edit this model in Sculpt 3D', exact: true }).waitFor();
  // The physical-scale field is inspected by its label in the rendered UI.
  const labels = await page.locator('label').allTextContents();
  const scaleLabel = labels.find(x => /millimeters|mm per|source unit/i.test(x));
  assert.ok(scaleLabel, 'Physical scale control has an accessible label');
  await page.getByLabel(scaleLabel, { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Edit this model in Sculpt 3D', exact: true }).click();
  await page.getByRole('button', { name: 'Continue this sculpture in Print Lab', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Add box; it can also be dragged onto the preview', exact: true }).click();
  assert.equal((await page.evaluate(() => designDemoState.artStudio.sculptRecipe.parts.length)), 4);
  await page.screenshot({ path: fileURLToPath(new URL('sculpt-edit.png', output)), fullPage: true });
  await page.getByRole('button', { name: 'Continue this sculpture in Print Lab', exact: true }).click();
  await page.locator('#print-lab-tab-preflight').click();
  await page.getByRole('button', { name: 'Run advisory preflight', exact: true }).click();
  await page.waitForFunction(() => !!designDemoState.printLab.preflight);
  const state = await page.evaluate(() => designDemoState.printLab);
  assert.equal(state.unitMm, 8);
  assert.equal(state.aiUse, 'ASSISTED');
  assert.equal(state.recipe.parts.length, 4);
  assert.ok(state.aiDisclosure.includes('AI'));
  await page.locator('#print-lab-tab-materials').click();
  await page.getByLabel('Baseline filament (g)', { exact: true }).fill('20');
  await page.getByLabel('Candidate filament (g)', { exact: true }).fill('14');
  await page.getByLabel('Baseline print time (min)', { exact: true }).fill('100');
  await page.getByLabel('Candidate print time (min)', { exact: true }).fill('120');
  assert.ok((await page.locator('#root').innerText()).includes('Filament: 6 g less (30%).'));
  assert.ok((await page.locator('#root').innerText()).includes('Print time: 20 min more (20%).'));
  assert.equal((await page.evaluate(() => designDemoState.printLab.recipe.parts.length)), 4);
  await page.screenshot({ path: fileURLToPath(new URL('material-comparison-desktop.png', output)), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: fileURLToPath(new URL('material-comparison-mobile.png', output)), fullPage: true });
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(widths.page <= widths.viewport + 1, 'No horizontal page overflow');
  await page.getByRole('button', { name: 'Clear comparison', exact: true }).click();
  assert.equal(await page.getByLabel('Baseline filament (g)', { exact: true }).inputValue(), '');
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.equal((await fetch(url + '/design/.git/config')).status, 404);
  await writeFile(new URL('browser-results.json', output), JSON.stringify({ ok: true, path: 'description → editable recipe → Sculpt manual edit → Print Lab preflight → slicer comparison', provider: 'explicitly fictional fixture', scaleMm: state.unitMm, aiUse: state.aiUse, parts: state.recipe.parts.length, comparison: { gramsSaved: 6, percentSaved: 30, minutesAdded: 20 }, widths, errors, external }, null, 2));
  console.log('Design, Sculpt round trip, preflight, material comparison, and mobile checks passed.');
} catch (error) {
  if (page) {
    await writeFile(new URL('browser-failure.txt', output), error.stack + '\n\n' + await page.locator('body').innerText());
    await page.screenshot({ path: fileURLToPath(new URL('browser-failure.png', output)), fullPage: true });
  }
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
