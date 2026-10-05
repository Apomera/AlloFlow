import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
test.describe.configure({ mode: 'serial', retries: 0, timeout: 360000 });
const out = path.resolve('reports/scale-explorer-report');
const harness = new GlHarness({ toolFile: process.env.SCALE_EXPLORER_REPORT_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer',
  width: 1400, height: 1100, layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'] });
const person = { id: 'human', size: 1.23, you: true }, earth = { id: 'earth' };
const inquiry = (id = 'inquiry-report-1') => ({ id, theme: 'home', small: person, big: earth, guess: '6.5', revealed: true,
  question: 'How can my height anchor a drawing of Earth?', reflection: 'A length ratio between different objects does not establish their volume ratio.',
  comparison: { small: person, big: earth }, drawing: { reference: earth, target: person, extras: [{ id: 'moon' }], size: '16', unit: 'cm', note: '<b>Keep my recorded height.</b>' } });
const saved = () => ({ observations: [{ itemId: 'human', you: true, size: 1.23, note: 'My recorded height.', yaw: .3, pitch: .2 },
  { itemId: 'earth', detailId: 'sahara', sunAngle: 135, note: 'Look for contrasting terrain.' }], investigations: [inquiry()],
  scalingRecord: { factor: '2', reflection: 'Every edge doubled; volume grew by eight.' }, drawingRecord: inquiry().drawing });
const report = (page: any) => page.getByRole('region', { name: 'Learning report', exact: true });
const prepare = (page: any) => report(page).getByRole('button', { name: 'Prepare learning report', exact: true });
const downloadButton = (page: any) => report(page).getByRole('button', { name: 'Download learning report', exact: true });
const data = (page: any) => page.evaluate(() => (window as any).__toolData);
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });
async function mount(page: any, state: any, fallback = true, width = 1400) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width, height: 1100 });
  if (fallback) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]): any { return /webgl/i.test(type) ? null : (original as any).call(this, type, ...args); };
  });
  await harness.mount(page, { unrelated: { retained: true }, _scaleExplorer: { workspaceView: 'notebook', focusId: 'human', yourHeightCm: 220, ...state } },
    '!!document.querySelector("[data-atlas-ready]")', { expectCanvas: !fallback });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
async function download(page: any, button = downloadButton(page)) {
  const event = page.waitForEvent('download'); await button.click(); const file = await event;
  return { filename: file.suggestedFilename(), text: readFileSync((await file.path())!, 'utf8') };
}
async function readOffline(page: any, html: string, width = 1000) {
  const document = await page.context().newPage(); await document.setViewportSize({ width, height: 1100 });
  const requests: string[] = []; document.on('request', (request: any) => requests.push(request.url()));
  await document.route('**/*', (route: any) => route.abort()); await document.setContent(html);
  expect(requests).toEqual([]); return document;
}

test('a real learning report preserves captured measurements, linked evidence and text exports without changing saved data', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const original = saved();
  await mount(page, { ...original, observationDrafts: { 'human:': 'Unsaved observation.' }, inquiryDraft: { ...inquiry('inquiry-draft-2'), question: 'Unsaved question.' },
    drawingDraft: { ...original.drawingRecord, note: 'Unsaved drawing.' } }, false);
  const before = await data(page); await prepare(page).click();
  await expect(report(page).getByLabel('Report title', { exact: true })).toBeFocused();
  await report(page).getByLabel('Report title', { exact: true }).fill('Comparing my height with Earth');
  await expect(report(page).locator('[data-report-selected]')).toHaveAttribute('data-report-selected', '5');
  const downloaded = await download(page); expect(downloaded.filename).toBe('scale-explorer-report.html');
  expect(downloaded.text).not.toContain('Unsaved'); expect(downloaded.text).toContain('&lt;b&gt;Keep my recorded height.&lt;/b&gt;');
  expect(await data(page)).toEqual(before); writeFileSync(path.join(out, 'learning-report.html'), downloaded.text);
  const document = await readOffline(page, downloaded.text);
  await expect(document.getByRole('heading', { level: 1 })).toHaveText('Comparing my height with Earth');
  await expect(document.locator('article')).toHaveCount(5);
  await expect(document.locator('main')).toContainText('1.23 m'); await expect(document.locator('main')).not.toContainText('2.2 m');
  await expect(document.locator('main')).toContainText('Prediction: 6.5 powers of ten');
  await expect(document.locator('main')).toContainText('Measured gap:'); await expect(document.locator('main')).toContainText('Drawing evidence saved with this investigation.');
  await expect(document.locator('main')).toContainText('Volume factor: 8'); await expect(document.locator('main')).toContainText('Lighting model: 135°');
  await expect(document.locator('a[href="https://svs.gsfc.nasa.gov/2915/"]')).toHaveCount(1);
  await expect(document.locator('main')).not.toContainText('Check the 10 mm ruler');
  await document.screenshot({ path: path.join(out, 'desktop-report.png'), fullPage: true }); await document.emulateMedia({ media: 'print' });
  expect(await document.evaluate(() => getComputedStyle(document.body).paddingTop)).toBe('0px'); await document.close();
  const observations = page.getByRole('region', { name: 'Field notebook', exact: true }).locator('details'); await observations.locator('summary').click();
  const notes = await download(page, observations.getByRole('button', { name: 'Download notes', exact: true }));
  expect(notes.filename).toBe('scale-explorer-notebook.txt'); expect(notes.text).toContain('My recorded height.');
  expect(notes.text).toContain('Drawing evidence saved with this investigation.'); expect(notes.text).toContain('My model explanation:');
  expect(notes.text).toContain('Check the 10 mm ruler'); expect(notes.text).not.toContain('Unsaved'); expect(errors).toEqual([]);
});

test('phone keyboard choices create a focused report retaining the investigation’s linked drawing', async ({ page }) => {
  await mount(page, saved(), true, 320); await prepare(page).click();
  const title = report(page).getByLabel('Report title', { exact: true }); await expect(title).toBeFocused(); await title.fill('My evidence for comparing two lengths');
  await report(page).getByRole('button', { name: 'Clear selection', exact: true }).click(); await expect(downloadButton(page)).toBeDisabled();
  const checkbox = report(page).locator('[data-report-row="investigation:inquiry-report-1"] input'); await checkbox.focus(); await checkbox.press('Space');
  await expect(checkbox).toBeChecked(); await expect(report(page).locator('[data-report-selected]')).toHaveAttribute('data-report-selected', '1');
  expect(await checkbox.evaluate((element: any) => getComputedStyle(element).outlineStyle)).toBe('solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await report(page).screenshot({ path: path.join(out, 'phone-preparation.png') });
  const downloaded = await download(page); writeFileSync(path.join(out, 'focused-report.html'), downloaded.text);
  const document = await readOffline(page, downloaded.text, 320);
  await expect(document.locator('article')).toHaveCount(1); await expect(document.locator('article')).toHaveAttribute('data-record-kind', 'investigation');
  await expect(document.locator('main')).toContainText('My drawing plan: <b>Keep my recorded height.</b>');
  await expect(document.locator('main')).not.toContainText('My recorded height.'); await expect(document.locator('main')).not.toContainText('My model explanation:');
  expect(await document.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await document.screenshot({ path: path.join(out, 'phone-report.png'), fullPage: true }); await document.close();
  await report(page).getByRole('button', { name: 'Close report preparation', exact: true }).click(); await expect(prepare(page)).toBeFocused();
  await expect(report(page).locator('.sx-report-review')).toHaveCount(0);
});

test('later saves and restores require review again and refresh preserves choices without selecting new evidence', async ({ page }) => {
  await mount(page, { ...saved(), observationDrafts: { 'human:': 'Later draft observation.' } });
  await prepare(page).click(); await report(page).getByLabel('Report title', { exact: true }).fill('Keep my report title');
  await report(page).getByRole('button', { name: 'Clear selection', exact: true }).click();
  await report(page).locator('[data-report-row="observation:human:"] input').check();
  await report(page).locator('[data-report-row="investigation:inquiry-report-1"] input').check();
  const field = page.getByRole('region', { name: 'Field notebook', exact: true });
  await field.getByRole('textbox').fill('My later saved observation.');
  await expect(downloadButton(page)).toBeEnabled(); const original = await download(page);
  expect(original.text).toContain('My recorded height.'); expect(original.text).not.toContain('My later saved observation.');
  await field.getByRole('button', { name: 'Update observation', exact: true }).click();
  await expect(report(page)).toContainText('Your saved notebook changed'); await expect(downloadButton(page)).toBeDisabled();
  await report(page).getByRole('button', { name: 'Refresh saved evidence', exact: true }).click();
  await expect(report(page).getByLabel('Report title', { exact: true })).toBeFocused();
  await expect(report(page).getByLabel('Report title', { exact: true })).toHaveValue('Keep my report title');
  await expect(report(page).locator('[data-report-selected]')).toHaveAttribute('data-report-selected', '2'); await expect(downloadButton(page)).toBeEnabled();
  const updated = await download(page); expect(updated.text).toContain('My later saved observation.'); expect(updated.text).toContain('2.2 m');
  const backup = page.getByRole('region', { name: 'Notebook backup', exact: true });
  await backup.getByLabel('Choose a notebook backup', { exact: true }).setInputFiles({ name: 'new-evidence.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'alloflow.scale-explorer.notebook', version: 1, notebook: { observations: [{ itemId: 'moon', note: 'Newly restored evidence.' }], investigations: [] } })) });
  await backup.getByRole('button', { name: 'Restore selected records', exact: true }).click(); await expect(downloadButton(page)).toBeDisabled();
  await report(page).getByRole('button', { name: 'Refresh saved evidence', exact: true }).click();
  await expect(report(page).locator('[data-report-row="observation:moon:"] input')).not.toBeChecked();
  await expect(report(page).locator('[data-report-selected]')).toHaveAttribute('data-report-selected', '2');
  const retained = await download(page); expect(retained.text).not.toContain('Newly restored evidence.');
  await report(page).locator('[data-report-row="observation:moon:"] input').check(); await expect(downloadButton(page)).toBeEnabled();
  await backup.getByRole('button', { name: 'Undo last restore', exact: true }).click(); await expect(downloadButton(page)).toBeDisabled();
  await report(page).getByRole('button', { name: 'Refresh saved evidence', exact: true }).click();
  await expect(report(page).locator('[data-report-row="observation:moon:"]')).toHaveCount(0);
  await expect(report(page).locator('[data-report-selected]')).toHaveAttribute('data-report-selected', '2');
});

test('empty notebooks, failed downloads and literal hostile notes leave the workspace usable', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { observations: [{ itemId: 'foreign', note: 'Discard' }] }); await expect(prepare(page)).toBeDisabled();
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  const payload = '</p><script>window.reportAttack=1</script><img src=x onerror="reportAttack=2"> & text\nSecond line.';
  await mount(page, { observations: [{ itemId: 'earth', note: payload }], observationDrafts: { 'earth:': 'Keep this separate draft.' } });
  const before = await data(page); await prepare(page).click(); await report(page).getByLabel('Report title', { exact: true }).fill('Earth <b>literal title</b>');
  await page.evaluate(() => { const original = URL.createObjectURL; (window as any).__restoreReportDownload = () => { URL.createObjectURL = original; }; URL.createObjectURL = () => { throw Error('test download failure'); }; });
  await downloadButton(page).click(); await expect(report(page)).toContainText('The report download could not start.');
  await expect(downloadButton(page)).toBeEnabled(); expect(await data(page)).toEqual(before);
  await page.evaluate(() => (window as any).__restoreReportDownload()); const downloaded = await download(page);
  const document = await readOffline(page, downloaded.text, 320);
  await expect(document.getByRole('heading', { level: 1 })).toHaveText('Earth <b>literal title</b>');
  await expect(document.locator('main')).toContainText(payload); await expect(document.locator('script,img')).toHaveCount(0);
  expect(await document.evaluate(() => (window as any).reportAttack)).toBeUndefined(); await document.close();
  await report(page).getByLabel('Report title', { exact: true }).fill(' ');
  const fallback = await readOffline(page, (await download(page)).text);
  await expect(fallback.getByRole('heading', { level: 1 })).toHaveText('Scale Explorer field notebook'); await fallback.close();
  await report(page).getByRole('button', { name: 'Close report preparation', exact: true }).click(); await expect(prepare(page)).toBeFocused();
  expect(await data(page)).toEqual(before); expect(errors).toEqual([]);
});
