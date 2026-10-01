import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 360000 });
const out = path.resolve('reports/scale-explorer-backup');
const harness = new GlHarness({ toolFile: process.env.SCALE_EXPLORER_BACKUP_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'] });
const person = { id: 'human', size: 1.23, you: true }, earth = { id: 'earth' };
const inquiry = (id = 'inquiry-backup-1') => ({ id, theme: 'home', small: person, big: earth, guess: '6.5', revealed: true,
  question: 'How can my height anchor a drawing of Earth?', reflection: 'The length ratio does not establish a volume ratio.',
  comparison: { small: person, big: earth }, drawing: { reference: earth, target: person, extras: [{ id: 'moon' }], size: '16', unit: 'cm', note: '<b>Keep my recorded height.</b>' } });
const saved = () => ({ observations: [{ itemId: 'human', you: true, size: 1.23, note: 'My recorded height.', yaw: .3, pitch: .2 },
  { itemId: 'earth', detailId: 'sahara', sunAngle: 135, note: 'Look for contrasting terrain.' }], investigations: [inquiry()],
  scalingRecord: { factor: '2', reflection: 'Every edge doubled; each face has four times the area.' }, drawingRecord: inquiry().drawing });
const file = (notebook: any, name = 'scale-explorer-notebook.json') => ({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'alloflow.scale-explorer.notebook', version: 1, notebook })) });
const backup = (page: any) => page.getByRole('region', { name: 'Notebook backup', exact: true });
const picker = (page: any) => backup(page).getByLabel('Choose a notebook backup', { exact: true });
const restore = (page: any) => backup(page).getByRole('button', { name: 'Restore selected records', exact: true });
const data = (page: any) => page.evaluate(() => (window as any).__toolData);
const savedState = async (page: any) => {
  const state = (await data(page))._scaleExplorer;
  return { observations: state.observations || [], investigations: state.investigations || [], scalingRecord: state.scalingRecord || null, drawingRecord: state.drawingRecord || null };
};
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });
async function mount(page: any, state: any, fallback = true, width = 1400) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width, height: 1100 });
  if (fallback) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]): any {
      return /webgl/i.test(type) ? null : (original as any).call(this, type, ...args);
    };
  });
  await harness.mount(page, { unrelated: { retained: true }, ...state, _scaleExplorer: { workspaceView: 'notebook', ...state._scaleExplorer } },
    '!!document.querySelector("[data-atlas-ready]")', { expectCanvas: !fallback });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
async function download(page: any, button: any) {
  const event = page.waitForEvent('download'); await button.click(); const downloaded = await event;
  return { filename: downloaded.suggestedFilename(), text: readFileSync((await downloaded.path())!, 'utf8') };
}

test('a real backup restores linked evidence, preserves other drafts and opens the exact recorded 3D comparison', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const original = saved();
  await mount(page, { _scaleExplorer: { ...original, yourHeightCm: 220, drawingDraft: { ...original.drawingRecord, note: 'Unsaved drawing text.' }, observationDrafts: { 'human:': 'Unsaved observation text.' } } }, false);
  const downloaded = await download(page, backup(page).getByRole('button', { name: 'Download notebook backup', exact: true }));
  expect(downloaded.filename).toBe('scale-explorer-notebook.json'); expect(downloaded.text).not.toContain('Unsaved');
  const parsed = JSON.parse(downloaded.text); expect(parsed.notebook.investigations[0].small).toEqual(person);
  writeFileSync(path.join(out, 'notebook-backup.json'), downloaded.text);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  const draft = { ...inquiry('inquiry-current-2'), small: { id: 'human', size: 2.2, you: true }, question: 'Keep my current question.', revealed: false, comparison: null, drawing: null };
  await mount(page, { _scaleExplorer: { yourHeightCm: 220, observations: [{ itemId: 'moon', note: 'Keep this saved note.' }],
    inquiryDraft: draft, drawingDraft: { ...original.drawingRecord, target: draft.small, note: 'Keep my drawing draft.' }, observationDrafts: { 'human:': 'Keep my observation draft.' } } }, false);
  const before = await data(page), beforeSaved = await savedState(page);
  await picker(page).setInputFiles({ name: downloaded.filename, mimeType: 'application/json', buffer: Buffer.from(downloaded.text) });
  await expect(backup(page).getByRole('heading', { name: 'Review backup', exact: true })).toBeFocused();
  await expect(backup(page).locator('[data-backup-selected]')).toHaveAttribute('data-backup-selected', '5');
  expect(await savedState(page)).toEqual(beforeSaved); await backup(page).screenshot({ path: path.join(out, 'desktop-review.png') });
  await restore(page).click(); await expect(backup(page).getByRole('status')).toContainText('5 records restored');
  const stored = await data(page); expect(stored.unrelated).toEqual({ retained: true }); expect(stored._scaleExplorer.yourHeightCm).toBe(220);
  for (const key of ['inquiryDraft', 'drawingDraft', 'observationDrafts']) expect(stored._scaleExplorer[key]).toEqual(before._scaleExplorer[key]);
  expect(stored._scaleExplorer.observations).toHaveLength(3); expect(stored._scaleExplorer.observations[0].note).toBe('Keep this saved note.');
  expect(stored._scaleExplorer.investigations).toEqual(parsed.notebook.investigations);
  const entry = page.locator('[data-investigation="inquiry-backup-1"]'); await expect(entry).toContainText(original.investigations[0].question);
  const svg = await download(page, entry.getByRole('button', { name: 'Download investigation drawing', exact: true }));
  expect(svg.text).toContain('1.23 m'); expect(svg.text).not.toContain('2.2 m'); expect(svg.text).toContain('&lt;b&gt;Keep my recorded height.&lt;/b&gt;');
  writeFileSync(path.join(out, 'restored-drawing.svg'), svg.text);
  await entry.getByRole('button', { name: 'Return to investigation:', exact: false }).click();
  await page.locator('.sx-inquiry').getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-comparison', 'human:earth');
  const ratio = await page.evaluate(() => {
    const record = (window as any).__glRecorder.records.find((entry: any) => !entry.ctx.isContextLost()), sizes: any = {};
    record.scene.traverse((entry: any) => { if (entry.userData.itemId && entry.visible) sizes[entry.userData.itemId] = entry.scale.x; });
    return sizes.earth / sizes.human;
  });
  expect(ratio).toBeCloseTo(12742000 / 1.23, 6); expect(errors).toEqual([]);
});

test('phone review uses explicit conflict choices, keeps independent investigation copies and supports undo and same-file retries', async ({ page }) => {
  const current = saved(), incoming = saved();
  current.observations[0].note = 'Keep my saved observation.'; current.investigations[0].question = 'My earlier investigation.';
  current.scalingRecord.reflection = 'Keep my saved model.'; current.drawingRecord.note = 'Keep my saved drawing.';
  incoming.observations[0].note = 'Recovered observation.';
  await mount(page, { _scaleExplorer: incoming }, true, 320);
  const exported = await download(page, backup(page).getByRole('button', { name: 'Download notebook backup', exact: true }));
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await mount(page, { _scaleExplorer: { ...current, yourHeightCm: 220, observationDrafts: { 'human:': 'Keep this separate draft.' } } }, true, 320);
  const before = await savedState(page), payload = { name: 'phone-notebook.json', mimeType: 'application/json', buffer: Buffer.from(exported.text) };
  const canonical = JSON.parse((await download(page, backup(page).getByRole('button', { name: 'Download notebook backup', exact: true }))).text).notebook;
  await picker(page).setInputFiles(payload); await expect(backup(page).getByRole('heading', { name: 'Review backup', exact: true })).toBeFocused();
  await expect(backup(page)).not.toContainText('adjusted or omitted during recovery');
  await expect(restore(page)).toBeDisabled();
  await expect(backup(page).locator('[data-backup-row="observation:1"]')).toHaveAttribute('data-backup-status', 'duplicate');
  await expect(backup(page).locator('[data-backup-row="observation:1"] input')).toBeDisabled();
  await expect(backup(page).locator('[data-backup-row="investigation:0"]')).toHaveAttribute('data-backup-status', 'copy');
  await backup(page).locator('[data-backup-row="observation:0"] input').check();
  const checkbox = backup(page).locator('[data-backup-row="investigation:0"] input'); await checkbox.focus(); await checkbox.press('Space'); await expect(checkbox).toBeChecked();
  await expect(backup(page).locator('[data-backup-selected]')).toHaveAttribute('data-backup-selected', '2'); expect(await savedState(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await backup(page).screenshot({ path: path.join(out, 'phone-review.png') }); await restore(page).click();
  const after = await data(page); expect(after._scaleExplorer.observations[0].note).toBe('Recovered observation.');
  expect(after._scaleExplorer.investigations).toHaveLength(2); expect(after._scaleExplorer.investigations[0].question).toBe('My earlier investigation.');
  expect(after._scaleExplorer.investigations[1]).toMatchObject({ id: 'inquiry-import-1', small: person, drawing: { target: person } });
  expect(after._scaleExplorer.scalingRecord.reflection).toBe('Keep my saved model.'); expect(after._scaleExplorer.drawingRecord.note).toBe('Keep my saved drawing.');
  expect(after._scaleExplorer.observationDrafts['human:']).toBe('Keep this separate draft.');
  await backup(page).getByRole('button', { name: 'Undo last restore', exact: true }).click();
  await expect(picker(page)).toBeFocused(); expect(await savedState(page)).toEqual(canonical);
  await picker(page).setInputFiles(payload); await expect(backup(page).getByRole('heading', { name: 'Review backup', exact: true })).toBeVisible();
  await backup(page).getByRole('button', { name: 'Cancel backup review', exact: true }).click();
  await expect(picker(page)).toBeFocused(); await expect(backup(page).locator('.sx-backup-review')).toHaveCount(0); expect(await savedState(page)).toEqual(canonical);
});

test('invalid, oversized and future files preserve saved work; recovered literal text and failed downloads stay usable', async ({ page }) => {
  await mount(page, { _scaleExplorer: { observations: [{ itemId: 'moon', note: 'Keep my current saved work.' }] } });
  const before = await savedState(page);
  for (const [buffer, message] of [
    [Buffer.from('{broken'), 'could not be read'],
    [Buffer.from(JSON.stringify({ format: 'another-tool', version: 1, notebook: saved() })), 'created with Download notebook backup'],
    [Buffer.from(JSON.stringify({ format: 'alloflow.scale-explorer.notebook', version: 2, notebook: saved() })), 'version is not supported'],
    [file({ observations: [], investigations: [] }).buffer, 'no recoverable saved records'],
    [Buffer.from('x'.repeat(512 * 1024 + 1)), 'smaller than 512 KB'],
    [Buffer.from('漢'.repeat(180000)), 'smaller than 512 KB']
  ] as const) {
    await picker(page).setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer });
    await expect(backup(page).getByRole('status')).toContainText(message); await expect(backup(page).locator('.sx-backup-review')).toHaveCount(0);
    expect(await savedState(page)).toEqual(before);
  }
  const record = inquiry(); record.question = '<script>window.backupInjected=true</script>'; record.drawing.target = { id: 'human', size: 2.2, you: true };
  await picker(page).setInputFiles(file({ observations: [null, { itemId: 'missing' }, { itemId: 'earth', size: 1, note: '<img src=x onerror="window.backupInjected=true">', source: 'javascript:bad()' }], investigations: [record] }, 'recovered.json'));
  await expect(backup(page)).toContainText('adjusted or omitted during recovery');
  await expect(backup(page).locator('[data-backup-selected]')).toHaveAttribute('data-backup-selected', '2'); await restore(page).click();
  const restored = await savedState(page); expect(restored.observations[1].size).toBe(12742000); expect(restored.observations[1].source).toBeUndefined();
  expect(restored.investigations[0].drawing).toBeNull(); expect(await page.evaluate(() => (window as any).backupInjected)).toBeUndefined();
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download unavailable'); }; });
  await backup(page).getByRole('button', { name: 'Download notebook backup', exact: true }).click();
  await expect(backup(page).getByRole('status')).toContainText('backup download could not start'); expect(await savedState(page)).toEqual(restored);
  await expect(backup(page).getByRole('button', { name: 'Undo last restore', exact: true })).toBeEnabled();
});

test('capacity checks prevent partial restores and undo cannot overwrite later saved evidence', async ({ page }) => {
  const ids = ['ten-billion-ly', 'universe', 'coma-dist', 'laniakea', 'virgo-sc', 'andromeda-dist', 'galactic-centre', 'local-bubble', 'orion-nebula', 'alpha-cen-dist', 'oort', 'light-month', 'lightyear', 'heliosphere', 'solar-system', 'betelgeuse', 'light-minute', 'au', 'sun', 'jupiter', 'earth', 'moon', 'reef', 'human'];
  const observations = ids.map(itemId => ({ itemId, note: 'Current saved note.' }));
  const investigations = Array.from({ length: 12 }, (_, index) => ({ ...inquiry('inquiry-full-' + index), question: 'Current question ' + index }));
  await mount(page, { _scaleExplorer: { observations, investigations } });
  const before = await savedState(page);
  const canonical = JSON.parse((await download(page, backup(page).getByRole('button', { name: 'Download notebook backup', exact: true }))).text).notebook;
  const incoming = { observations: [{ itemId: ids[0], note: 'Recovered note.' }, { itemId: 'milkyway', note: 'A new note.' }],
    investigations: [{ ...inquiry('inquiry-full-0'), question: 'Recovered question.' }] };
  await picker(page).setInputFiles(file(incoming)); await expect(backup(page)).toContainText('0 observation slots and 0 investigation slots available.');
  await backup(page).locator('[data-backup-row="observation:0"] input').check();
  await backup(page).locator('[data-backup-row="observation:1"] input').check();
  await backup(page).locator('[data-backup-row="investigation:0"] input').check();
  await expect(restore(page)).toBeDisabled(); await expect(backup(page)).toContainText('selection exceeds the notebook capacity'); expect(await savedState(page)).toEqual(before);
  await backup(page).locator('[data-backup-row="observation:1"] input').uncheck();
  await backup(page).locator('[data-backup-row="investigation:0"] input').uncheck(); await restore(page).click();
  const after = await savedState(page); expect(after.observations).toHaveLength(24); expect(after.investigations).toHaveLength(12);
  expect(after.observations[0].note).toBe('Recovered note.'); expect(after.investigations).toEqual(canonical.investigations);
  await page.locator('.sx-notebook').getByRole('textbox', { name: 'What do you notice?', exact: true }).fill('Later saved work must survive.');
  await page.locator('.sx-notebook').getByRole('button', { name: 'Update observation', exact: true }).click();
  await expect(backup(page).getByRole('button', { name: 'Undo last restore', exact: true })).toBeDisabled();
  await expect(backup(page)).toContainText('Saved work has changed since the restore');
  expect((await savedState(page)).observations.find((entry: any) => entry.itemId === 'human').note).toBe('Later saved work must survive.');
});

test('failed, superseded and cancelled reads cannot restore stale files or update an unmounted workspace', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { _scaleExplorer: { observations: [{ itemId: 'moon', note: 'Keep my saved work.' }] } });
  const before = await savedState(page);
  await page.evaluate(() => { (window as any).__fileText = File.prototype.text; File.prototype.text = () => Promise.reject(new Error('Read failed')); });
  await picker(page).setInputFiles(file(saved())); await expect(backup(page).getByRole('status')).toContainText('could not be read'); expect(await savedState(page)).toEqual(before);
  await page.evaluate(() => {
    (window as any).__pendingReads = [];
    File.prototype.text = function () {
      const current = this;
      return new Promise(resolve => { (window as any).__pendingReads.push(async () => { resolve(await (window as any).__fileText.call(current)); }); });
    };
  });
  await picker(page).setInputFiles(file({ observations: [{ itemId: 'earth', note: 'First file.' }], investigations: [] }, 'first.json'));
  await picker(page).setInputFiles(file({ observations: [{ itemId: 'human', note: 'Second file.' }], investigations: [] }, 'second.json'));
  await page.evaluate(async () => { await (window as any).__pendingReads[1](); }); await expect(backup(page).locator('.sx-backup-review')).toContainText('second.json');
  await page.evaluate(async () => { await (window as any).__pendingReads[0](); });
  await expect(backup(page).locator('.sx-backup-review')).toContainText('second.json'); await expect(backup(page).locator('.sx-backup-review')).not.toContainText('first.json');
  await backup(page).getByRole('button', { name: 'Cancel backup review', exact: true }).click();
  await picker(page).setInputFiles(file(saved(), 'cancelled.json')); await expect(backup(page).getByRole('status')).toContainText('Reading your notebook backup');
  await backup(page).getByRole('button', { name: 'Cancel backup review', exact: true }).click();
  await page.evaluate(async () => { await (window as any).__pendingReads[2](); });
  await expect(backup(page).locator('.sx-backup-review')).toHaveCount(0); expect(await savedState(page)).toEqual(before);
  await picker(page).setInputFiles(file(saved(), 'unmounted.json')); await expect(backup(page).getByRole('status')).toContainText('Reading your notebook backup');
  await harness.unmount(page); await page.evaluate(async () => { await (window as any).__pendingReads[3](); });
  expect(await harness.leakedAfterUnmount(page)).toEqual([]); expect(errors).toEqual([]);
});
