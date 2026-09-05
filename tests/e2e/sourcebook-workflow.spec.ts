import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_sourcebook.js', toolId: 'sourcebook', width: 1280, height: 900, appStyles: true });
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', async route => {
    if (route.request().url().includes('/w/api.php')) {
      return route.fulfill({ json: { query: { pages: [{ imageinfo: [{ url: 'https://upload.wikimedia.org/test.png' }] }] } } });
    }
    await route.fulfill({ contentType: 'image/png', body: pixel });
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block}.sourcebook-tool{width:100%;padding:16px;box-sizing:border-box}' });
});

test('find, compare, prepare and export work with keyboard focus and collapsed advanced controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('[data-sourcebook-workflow]')).toBeVisible();
  await expect(page.locator('[data-sourcebook-loaded-facets]')).not.toHaveAttribute('open', '');
  await page.locator('[data-sourcebook-compare-toggle]').nth(0).click();
  await page.locator('[data-sourcebook-compare-toggle]').nth(1).click();
  await page.locator('[data-sourcebook-workflow-step="compare"]').click();
  await expect(page.locator('#sourcebook-comparison-title')).toBeFocused();
  await page.locator('[data-sourcebook-save-comparison]').click();
  await page.locator('[data-sourcebook-workflow-step="prepare"]').click();
  await expect(page.locator('#sourcebook-results-title')).toBeFocused();
  await expect(page.locator('[data-sourcebook-usage-plan]')).not.toHaveAttribute('open', '');
  await page.locator('[data-sourcebook-workflow-step="export"]').click();
  await expect(page.locator('#sourcebook-output-preflight-title')).toBeFocused();
  await page.locator('[data-sourcebook-workflow-step="find"]').click();
  await expect(page.locator('#sourcebook-search')).toBeFocused();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'scratch/sourcebook-desktop.png', fullPage: false });
});

test('a 13-image palette produces two explicit downloads with every image included', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as any;
    w.__ctx.updateMulti('sourcebook', { collection: w.SourcebookProviders.materials.slice(0, 13).map((item: any) => item.id) });
  });
  await page.locator('[data-sourcebook-workflow-step="export"]').click();
  await page.getByRole('button', { name: 'Reference board (PNG)', exact: true }).click();
  const downloads = page.locator('[data-sourcebook-board-downloads="13"]');
  await expect(downloads).toBeVisible({ timeout: 30000 });
  await expect(downloads.locator('a[download]')).toHaveCount(2);
  await expect(downloads.getByRole('link', { name: 'Download page 1 (12 images)' })).toBeVisible();
  await expect(downloads.getByRole('link', { name: 'Download page 2 (1 image)' })).toBeVisible();
  const file = page.waitForEvent('download');
  await downloads.locator('a').nth(1).click();
  expect((await file).suggestedFilename()).toContain('reference-board-2.png');
  await page.locator('#sourcebook-palette-title').fill('Changed lesson');
  await expect(page.locator('[data-sourcebook-board-downloads]')).toHaveCount(0);
});

test('mobile workflow fits the viewport and inspection restores keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const inspect = page.locator('[data-sourcebook-result-card] [data-sourcebook-inspect]').first();
  await inspect.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(inspect).toBeFocused();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.locator('[data-sourcebook-workflow-step="find"]').click();
  await page.screenshot({ path: 'scratch/sourcebook-mobile.png', fullPage: false });
});


test('undo rechecks external sources and does not restore a record whose rights changed', async ({ page }) => {
  let allowed = true;
  const record = { id: 123, title: 'Verified study', artist_display: 'Catalog artist', image_id: 'abc-123', is_public_domain: true, medium_display: 'Oil on canvas' };
  const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
  let requests = 0;
  await page.route('https://api.artic.edu/api/v1/artworks/123', async route => {
    requests++;
    await route.fulfill({ json: { data: { ...record, is_public_domain: allowed }, config } });
  });
  const seed = async () => page.evaluate(({ record, config }) => {
    const w = window as any; const api = w.SourcebookProviders;
    const item = api.normalizeAicArtwork(record, config, '', 'All');
    const undo = api.buildPalette([item.id], { [item.id]: { note: 'Keep my note' } }, 'Restored lesson', [item]);
    w.__ctx.updateMulti('sourcebook', { collection: [api.materials[0].id], savedAssets: {}, preparation: {}, paletteTitle: 'Current lesson', paletteUndo: undo });
  }, { record, config });
  await seed();
  await page.getByRole('button', { name: 'Undo palette change' }).click();
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Restored lesson');
  expect(requests).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__toolData.sourcebook.preparation['aic-live-123'].note)).toBe('Keep my note');
  await seed(); allowed = false;
  await page.getByRole('button', { name: 'Undo palette change' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__events.toasts.some((toast: any) => toast.message.includes('previous palette could not be verified')))).toBe(true);
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Current lesson');
});

test('failed image preparation leaves no incomplete board download', async ({ page }) => {
  await page.route('https://upload.wikimedia.org/**', route => route.fulfill({ contentType: 'image/png', body: 'invalid image bytes' }));
  await page.evaluate(() => {
    const w = window as any; const ids = w.SourcebookProviders.materials.slice(0, 2).map((item: any) => item.id);
    w.__ctx.updateMulti('sourcebook', { collection: ids, preparation: { [ids[0]]: { mode: 'crop', aspect: 'square' } } });
  });
  await page.locator('[data-sourcebook-workflow-step="export"]').click();
  await page.getByRole('button', { name: 'Reference board (PNG)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__events.toasts.some((toast: any) => toast.message.includes('incomplete board')))).toBe(true);
  await expect(page.locator('[data-sourcebook-board-downloads]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.sourcebook.collection.length)).toBe(2);
});


test('an import preserves edits made while catalog verification is pending', async ({ page }) => {
  const record = { id: 123, title: 'Verified study', artist_display: 'Catalog artist', image_id: 'abc-123', is_public_domain: true };
  const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('https://api.artic.edu/api/v1/artworks/123', async route => {
    requested = true; await pending;
    await route.fulfill({ json: { data: record, config } });
  });
  const manifest = await page.evaluate(({ record, config }) => {
    const w = window as any; const api = w.SourcebookProviders;
    const item = api.normalizeAicArtwork(record, config, '', 'All');
    w.__ctx.updateMulti('sourcebook', { collection: [api.materials[0].id], paletteTitle: 'Original lesson' });
    return api.buildPalette([item.id], {}, 'Imported lesson', [item]);
  }, { record, config });
  await page.locator('[data-sourcebook-workflow-step="export"]').click();
  const file = { name: 'lesson.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(manifest)) };
  await page.getByLabel('Import Sourcebook palette manifest', { exact: true }).setInputFiles(file);
  await expect.poll(() => requested).toBe(true);
  await page.locator('#sourcebook-palette-title').fill('My latest edits');
  release();
  await expect.poll(() => page.evaluate(() => (window as any).__events.toasts.some((t: any) => t.message.includes('Your edits are safe')))).toBe(true);
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('My latest edits');
  expect(await page.evaluate(() => (window as any).__toolData.sourcebook.collection.length)).toBe(1);
  await page.getByLabel('Import Sourcebook palette manifest', { exact: true }).setInputFiles(file);
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Imported lesson');
  await expect(page.getByRole('button', { name: 'Undo palette change' })).toBeEnabled();
  await page.getByRole('button', { name: 'Undo palette change' }).click();
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('My latest edits');
});

for (const reason of ['cancel', 'edit']) {
  test('a pending board cannot download after ' + reason + ' and can be retried', async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let requested = false; let hold = true;
    const downloaded: string[] = [];
    page.on('download', download => downloaded.push(download.suggestedFilename()));
    await page.route('https://upload.wikimedia.org/**', async route => {
      if (hold) { requested = true; await pending; }
      await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => {});
    });
    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.updateMulti('sourcebook', { collection: w.SourcebookProviders.materials.slice(0, 2).map((i: any) => i.id), paletteTitle: 'Original lesson' });
    });
    await page.locator('[data-sourcebook-workflow-step="export"]').click();
    const build = page.getByRole('button', { name: 'Reference board (PNG)', exact: true });
    await build.click();
    await expect.poll(() => requested).toBe(true);
    await expect(page.locator('[data-sourcebook-cancel-board]')).toBeVisible();
    if (reason === 'cancel') await page.locator('[data-sourcebook-cancel-board]').click();
    else await page.locator('#sourcebook-palette-title').fill('Latest lesson');
    await expect(page.locator('[data-sourcebook-cancel-board]')).toHaveCount(0);
    hold = false; release();
    await expect.poll(() => page.evaluate(() => (window as any).__events.toasts.some((t: any) => t.message.includes('cancelled') || t.message.includes('Your palette changed')))).toBe(true);
    await expect(build).toBeEnabled();
    await expect(page.locator('[data-sourcebook-board-downloads]')).toHaveCount(0);
    expect(downloaded).toEqual([]);
    const nextDownload = page.waitForEvent('download');
    await build.click();
    expect((await nextDownload).suggestedFilename()).toContain(reason === 'edit' ? 'latest-lesson' : 'original-lesson');
    await expect(page.locator('[data-sourcebook-board-downloads="2"]')).toBeVisible();
    expect(downloaded).toHaveLength(1);
    expect(await page.evaluate(() => (window as any).__toolData.sourcebook.collection.length)).toBe(2);
  });
}


for (const reason of ['cancel', 'title', 'preparation']) {
  test('package preparation stops after ' + reason + ' and retries independently of old requests', async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let hold = true; let held = 0;
    const downloads: string[] = [];
    page.on('download', item => downloads.push(item.suggestedFilename()));
    await page.route('https://upload.wikimedia.org/**', async route => {
      if (hold && route.request().resourceType() === 'fetch') { held++; await pending; }
      await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => {});
    });
    await page.evaluate(() => {
      const w = window as any;
      const ids = w.SourcebookProviders.materials.slice(0, 4).map((item: any) => item.id);
      w.__ctx.updateMulti('sourcebook', { collection: ids, paletteTitle: 'Original package', preparation: { [ids[0]]: { note: 'Original teaching note' } } });
    });
    try {
      await page.locator('[data-sourcebook-workflow-step="export"]').click();
      await page.getByRole('button', { name: 'Download package', exact: true }).click();
      await expect.poll(() => held).toBe(3);
      await expect(page.getByRole('progressbar', { name: 'Palette package preparation progress' })).toBeVisible();
      if (reason === 'cancel') {
        await page.locator('[data-sourcebook-workflow-step="find"]').click();
        await expect(page.getByRole('button', { name: 'Cancel package preparation', exact: true })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('[data-sourcebook-package-progress]').scrollIntoViewIfNeeded();
        await page.locator('[data-sourcebook-package-progress]').screenshot({ path: 'scratch/sourcebook-package-progress.png' });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await page.getByRole('button', { name: 'Cancel package preparation', exact: true }).click();
        await page.locator('[data-sourcebook-workflow-step="export"]').click();
      } else if (reason === 'title') {
        await page.locator('#sourcebook-palette-title').fill('Latest package');
      } else {
        await page.evaluate(() => {
          const w = window as any; const id = w.__toolData.sourcebook.collection[0];
          w.__ctx.updateMulti('sourcebook', { preparation: { [id]: { note: 'Latest teaching note' } } });
        });
      }
      await expect(page.locator('[data-sourcebook-cancel-package]')).toHaveCount(0);
      expect(downloads).toEqual([]);
      expect(held).toBe(3);
      hold = false;
      const nextDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download package', exact: true }).click();
      const file = await nextDownload;
      expect(file.suggestedFilename()).toBe((reason === 'title' ? 'latest-package' : 'original-package') + '.sourcebook-palette.html');
      const html = await readFile((await file.path())!, 'utf8');
      expect(html).toContain('4 prepared visual assets');
      expect(html).toContain(reason === 'preparation' ? 'Latest teaching note' : 'Original teaching note');
      expect(html).toContain('data:image/png;base64,');
      release();
      await expect(page.getByRole('button', { name: 'Download package', exact: true })).toBeEnabled();
      expect(downloads).toHaveLength(1);
      expect(await page.evaluate(() => (window as any).__toolData.sourcebook.collection.length)).toBe(4);
    } finally { release(); }
  });
}

test('failed package images name their sources and a retry produces the complete package', async ({ page }) => {
  let invalid = true;
  await page.route('https://upload.wikimedia.org/**', route => route.fulfill({ contentType: 'image/png', body: invalid ? Buffer.from('not an image') : pixel }));
  const title = await page.evaluate(() => {
    const w = window as any; const items = w.SourcebookProviders.materials.slice(0, 2);
    w.__ctx.updateMulti('sourcebook', { collection: items.map((item: any) => item.id), paletteTitle: 'Recovered lesson' });
    return items[0].title;
  });
  const downloads: string[] = []; page.on('download', file => downloads.push(file.suggestedFilename()));
  await page.locator('[data-sourcebook-workflow-step="export"]').click();
  const button = page.getByRole('button', { name: 'Download package', exact: true });
  await button.click();
  await expect.poll(() => page.evaluate(title => (window as any).__events.toasts.some((t: any) => t.message.includes(title) && t.message.includes('no incomplete package')), title)).toBe(true);
  await expect(button).toBeEnabled();
  expect(downloads).toEqual([]);
  invalid = false;
  const nextDownload = page.waitForEvent('download'); await button.click();
  const file = await nextDownload;
  const html = await readFile((await file.path())!, 'utf8');
  expect(html).toContain('2 prepared visual assets');
  expect(downloads).toHaveLength(1);
});

test('leaving Sourcebook cancels package work before a download can occur', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  let requests = 0; const downloads: string[] = [];
  page.on('download', file => downloads.push(file.suggestedFilename()));
  await page.route('https://upload.wikimedia.org/**', async route => {
    if (route.request().resourceType() === 'fetch') { requests++; await pending; }
    await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => {});
  });
  await page.evaluate(() => { const w = window as any; w.__ctx.updateMulti('sourcebook', { collection: w.SourcebookProviders.materials.slice(0, 4).map((i: any) => i.id) }); });
  try {
    await page.locator('[data-sourcebook-workflow-step="export"]').click();
    await page.getByRole('button', { name: 'Download package', exact: true }).click();
    await expect.poll(() => requests).toBe(3);
    await page.evaluate(() => (window as any).__root.unmount());
    release();
    await expect(page.locator('.sourcebook-tool')).toHaveCount(0);
    expect(downloads).toEqual([]);
    expect(requests).toBe(3);
    expect(await page.evaluate(() => (window as any).__events.toasts.some((t: any) => t.message.includes('package downloaded')))).toBe(false);
  } finally { release(); }
});


for (const phase of ['pending', 'failed']) {
  test('saving a shelf item preserves hidden saved records while verification is ' + phase, async ({ page }) => {
    const record = { id: 123, title: 'Saved external study', artist_display: 'Catalog artist', image_id: 'abc-123', is_public_domain: true };
    const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
    let allowed = phase !== 'failed'; let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let requested = false;
    await page.route('https://api.artic.edu/api/v1/artworks/123', async route => {
      requested = true;
      if (phase === 'pending') await pending;
      await route.fulfill({ json: { data: { ...record, is_public_domain: allowed }, config } }).catch(() => {});
    });
    const seed = await page.evaluate(({ record, config }) => {
      const w = window as any; const api = w.SourcebookProviders;
      const item = api.normalizeAicArtwork(record, config, '', 'All');
      w.__ctx.updateMulti('sourcebook', { collection: [item.id], savedAssets: { [item.id]: item }, preparation: { [item.id]: { note: 'Keep this teaching note' } } });
      return { id: item.id, shelf: api.materials[0].id };
    }, { record, config });
    try {
      await expect.poll(() => requested).toBe(true);
      await expect(page.locator('[data-sourcebook-smk-saved-status="' + (phase === 'pending' ? 'loading' : 'error') + '"]')).toBeVisible();
      const save = page.locator('[data-sourcebook-result-card="' + seed.shelf + '"] button[aria-label^="Save "]');
      await save.click();
      expect(await page.evaluate(id => Boolean((window as any).__toolData.sourcebook.savedAssets[id]), seed.id)).toBe(true);
      expect(await page.evaluate(() => (window as any).__toolData.sourcebook.collection.length)).toBe(1);
      await expect.poll(() => page.evaluate(() => (window as any).__events.toasts.some((t: any) => t.message.includes('saved sources') && t.message.includes('verification')))).toBe(true);
      allowed = true; release();
      if (phase === 'failed') await page.locator('[data-sourcebook-retry-verification]').click();
      await expect(page.locator('[data-sourcebook-smk-saved-status="ready"]')).toBeVisible();
      await save.click();
      await expect(page.locator('[data-sourcebook-smk-saved-status="ready"]')).toBeVisible();
      await page.locator('[data-sourcebook-workflow-step="prepare"]').click();
      await expect(page.locator('[data-sourcebook-result-card="' + seed.id + '"]')).toBeVisible();
      await expect(page.locator('[data-sourcebook-result-card="' + seed.shelf + '"]')).toBeVisible();
      expect(await page.evaluate(id => (window as any).__toolData.sourcebook.preparation[id].note, seed.id)).toBe('Keep this teaching note');
    } finally { release(); }
  });
}


test('import and comparison saves cannot discard saved sources after verification fails', async ({ page }) => {
  const record = { id: 123, title: 'Saved external study', artist_display: 'Catalog artist', image_id: 'abc-123', is_public_domain: true };
  const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
  await page.route('https://api.artic.edu/api/v1/artworks/123', route => route.fulfill({ json: { data: { ...record, is_public_domain: false }, config } }));
  const seed = await page.evaluate(({ record, config }) => {
    const w = window as any; const api = w.SourcebookProviders;
    const item = api.normalizeAicArtwork(record, config, '', 'All');
    w.__ctx.updateMulti('sourcebook', { collection: [item.id, api.materials[2].id], savedAssets: { [item.id]: item }, paletteTitle: 'Keep my lesson', preparation: { [item.id]: { note: 'Keep my note' } } });
    return { id: item.id, collection: [item.id, api.materials[2].id], manifest: api.buildPalette([api.materials[0].id], {}, 'Incoming lesson') };
  }, { record, config });
  await expect(page.locator('[data-sourcebook-smk-saved-status="error"]')).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.sourcebook));
  await page.locator('[data-sourcebook-workflow-step="export"]').click();
  await page.getByLabel('Import Sourcebook palette manifest', { exact: true }).setInputFiles({ name: 'incoming.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(seed.manifest)) });
  await expect.poll(() => page.evaluate(() => (window as any).__events.toasts.some((t: any) => t.message.includes('Retry verification before')))).toBe(true);
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Keep my lesson');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.sourcebook))).toBe(before);
  await page.locator('[data-sourcebook-workflow-step="find"]').click();
  await page.locator('[data-sourcebook-compare-toggle]').nth(0).click();
  await page.locator('[data-sourcebook-compare-toggle]').nth(1).click();
  await page.locator('[data-sourcebook-workflow-step="compare"]').click();
  await page.locator('[data-sourcebook-save-comparison]').click();
  expect(await page.evaluate(id => (window as any).__toolData.sourcebook.collection, seed.id)).toEqual(seed.collection);
  expect(await page.evaluate(id => Boolean((window as any).__toolData.sourcebook.savedAssets[id]), seed.id)).toBe(true);
  expect(await page.evaluate(id => (window as any).__toolData.sourcebook.preparation[id].note, seed.id)).toBe('Keep my note');
});


async function delayedTextileSearch(page: any, autoCurate = true) {
  const record = { id: 123, title: 'Blue textile study', artist_display: 'Catalog artist', image_id: 'abc-123', is_public_domain: true, medium_display: 'Woven textile', classification_title: 'Textiles' };
  const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('https://api.artic.edu/api/v1/artworks/**', async (route: any) => {
    if (route.request().url().includes('/search?')) {
      requested = true; await pending;
      await route.fulfill({ json: { data: [record], config } }).catch(() => {});
    } else await route.fulfill({ json: { data: record, config } });
  });
  const seed = await page.evaluate((autoCurate: boolean) => {
    const w = window as any; const api = w.SourcebookProviders; const items = api.materials.slice(0, 4);
    w.__root.unmount();
    w.__mount({ sourcebook: { provider: 'Art Institute of Chicago', autoCurate, collection: items.slice(0, 3).map((i: any) => i.id), paletteTitle: 'Original lesson' } });
    return { ids: items.map((i: any) => i.id), manifest: api.buildPalette([items[3].id], { [items[3].id]: { note: 'Added while searching' } }, 'Updated lesson') };
  }, autoCurate);
  await page.locator('#sourcebook-search').fill('textile');
  await page.locator('#sourcebook-search').press('Enter');
  await expect.poll(() => requested).toBe(true);
  return { release, seed };
}

test('late search picks preserve imports, removals, ordering and notes made during search', async ({ page }) => {
  const { release, seed } = await delayedTextileSearch(page);
  try {
    await page.locator('[data-sourcebook-workflow-step="export"]').click();
    await page.getByLabel('Import Sourcebook palette manifest', { exact: true }).setInputFiles({ name: 'extra.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(seed.manifest)) });
    await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Updated lesson');
    await page.locator('[data-sourcebook-result-card="' + seed.ids[0] + '"] button[aria-label$="from the Sourcebook palette"]').click();
    await page.locator('[data-sourcebook-result-card="' + seed.ids[3] + '"]').getByRole('button', { name: /earlier in palette$/ }).click();
    const current = await page.evaluate(() => (window as any).__toolData.sourcebook.collection);
    expect(current).toEqual([seed.ids[1], seed.ids[3], seed.ids[2]]);
    release();
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.sourcebook.collection)).toEqual([...current, 'aic-live-123']);
    await expect(page.locator('[data-sourcebook-smk-saved-status="ready"]')).toBeVisible();
    await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Updated lesson');
    expect(await page.evaluate((id: string) => (window as any).__toolData.sourcebook.preparation[id].note, seed.ids[3])).toBe('Added while searching');
  } finally { release(); }
});

for (const startedEnabled of [true, false]) {
  test('changing automatic saving from ' + startedEnabled + ' during search does not retroactively save its results', async ({ page }) => {
    const { release, seed } = await delayedTextileSearch(page, startedEnabled);
    try {
      await page.getByRole('checkbox', { name: 'Save picks to palette', exact: true }).setChecked(!startedEnabled);
      release();
      await expect.poll(() => page.evaluate(() => (window as any).__toolData.sourcebook.liveSession?.results?.length || 0)).toBe(1);
      expect(await page.evaluate(() => (window as any).__toolData.sourcebook.collection)).toEqual(seed.ids.slice(0, 3));
      await expect(page.locator('[data-sourcebook-result-card="aic-live-123"]')).toBeVisible();
    } finally { release(); }
  });
}


for (const change of ['import', 'opt-out']) {
  test('delayed recommendation refresh honors the latest palette and preference after ' + change, async ({ page }) => {
    const { release } = await delayedTextileSearch(page, false);
    release();
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.sourcebook.liveSession?.results?.length || 0)).toBe(1);
    await page.getByRole('checkbox', { name: 'Save picks to palette', exact: true }).check();
    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.generateText = () => new Promise(resolve => {
        w.__curationRequested = true;
        w.__finishCuration = () => resolve({ ids: ['aic-live-123'], reason: 'Matches the textile study request.' });
      });
      w.__rerender();
    });
    await page.getByRole('button', { name: 'Re-curate matches', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Boolean((window as any).__curationRequested))).toBe(true);
    try {
      if (change === 'opt-out') {
        await page.getByRole('checkbox', { name: 'Save picks to palette', exact: true }).uncheck();
      } else {
        const record = { id: 456, title: 'Alternate textile study', artist_display: 'Another catalog artist', image_id: 'def-456', is_public_domain: true, medium_display: 'Woven textile' };
        const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
        await page.route('https://api.artic.edu/api/v1/artworks/456', route => route.fulfill({ json: { data: record, config } }));
        const manifest = await page.evaluate(({ record, config }) => {
          const api = (window as any).SourcebookProviders;
          const item = api.normalizeAicArtwork(record, config, '', 'All');
          return api.buildPalette([item.id], { [item.id]: { note: 'Keep the imported review note' } }, 'Edited during review', [item]);
        }, { record, config });
        await page.locator('[data-sourcebook-workflow-step="export"]').click();
        await page.getByLabel('Import Sourcebook palette manifest', { exact: true }).setInputFiles({ name: 'review.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(manifest)) });
        await expect(page.locator('[data-sourcebook-smk-saved-status="ready"]')).toBeVisible();
        await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Edited during review');
      }
      const current = await page.evaluate(() => (window as any).__toolData.sourcebook.collection);
      await page.evaluate(() => (window as any).__finishCuration());
      await page.locator('[data-sourcebook-workflow-step="find"]').click();
      await expect(page.getByRole('button', { name: 'Re-curate matches', exact: true })).toBeEnabled();
      await expect.poll(() => page.evaluate(() => (window as any).__toolData.sourcebook.collection)).toEqual(change === 'import' ? [...current, 'aic-live-123'] : current);
      if (change === 'import') {
        expect(await page.evaluate(() => Boolean((window as any).__toolData.sourcebook.savedAssets['aic-live-456']))).toBe(true);
        expect(await page.evaluate(() => (window as any).__toolData.sourcebook.preparation['aic-live-456'].note)).toBe('Keep the imported review note');
        expect(await page.evaluate(() => (window as any).__toolData.sourcebook.paletteTitle)).toBe('Edited during review');
      }
    } finally { await page.evaluate(() => { if ((window as any).__finishCuration) (window as any).__finishCuration(); }); }
  });
}


test('a failed saved source can be retried without hiding or rechecking healthy sources', async ({ page }) => {
  const allowed = new Set([123]); const counts: Record<string, number> = {};
  const records = [123, 456, 789].map(id => ({ id, title: 'Saved study ' + id, artist_display: 'Catalog artist', image_id: 'image-' + id, is_public_domain: true }));
  const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
  await page.route('https://api.artic.edu/api/v1/artworks/*', route => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop()); counts[id] = (counts[id] || 0) + 1;
    return route.fulfill({ json: { data: { ...records.find(r => r.id === id), is_public_domain: allowed.has(id) }, config } });
  });
  await page.evaluate(({ records, config }) => {
    const w = window as any; const items = records.map((r: any) => w.SourcebookProviders.normalizeAicArtwork(r, config, '', 'All'));
    w.__ctx.updateMulti('sourcebook', { collection: items.map((i: any) => i.id), savedAssets: Object.fromEntries(items.map((i: any) => [i.id, i])), preparation: Object.fromEntries(items.map((i: any) => [i.id, { note: 'Note for ' + i.id }])) });
  }, { records, config });
  await expect(page.locator('[data-sourcebook-smk-saved-status="partial"]')).toBeVisible();
  await expect(page.locator('[data-sourcebook-saved-error]')).toHaveCount(2);
  await page.locator('[data-sourcebook-workflow-step="export"]').click();
  await expect(page.locator('[data-sourcebook-result-card="aic-live-123"]')).toBeVisible();
  await expect(page.locator('[data-sourcebook-result-card="aic-live-456"]')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export .json', exact: true }).click();
  const file = await download; const manifest = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(manifest.assets.map((i: any) => i.id)).toEqual(['aic-live-123']);
  const before = { ...counts }; allowed.add(456);
  await page.locator('[data-sourcebook-retry-saved="aic-live-456"]').click();
  await expect(page.locator('[data-sourcebook-result-card="aic-live-456"]')).toBeVisible();
  await expect(page.locator('[data-sourcebook-saved-error]')).toHaveCount(1);
  expect(counts[123]).toBe(before[123]); expect(counts[789]).toBe(before[789]); expect(counts[456]).toBe(before[456] + 1);
  expect(await page.evaluate(() => Object.keys((window as any).__toolData.sourcebook.savedAssets).length)).toBe(3);
  expect(await page.evaluate(() => (window as any).__toolData.sourcebook.preparation['aic-live-789'].note)).toBe('Note for aic-live-789');
  allowed.add(789); await page.locator('[data-sourcebook-retry-saved="aic-live-789"]').click();
  await expect(page.locator('[data-sourcebook-smk-saved-status="ready"]')).toBeVisible();
  await expect(page.locator('[data-sourcebook-saved-error]')).toHaveCount(0);
  await expect(page.locator('[data-sourcebook-result-card]')).toHaveCount(3);
});

for (const action of ['package', 'handoff']) for (const reason of ['cancel', 'edit']) {
  test('single-image ' + action + ' stops after ' + reason + ' and retries with current preparation', async ({ page }) => {
    let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
    let hold = true; let held = 0; const downloads: string[] = [];
    page.on('download', file => downloads.push(file.suggestedFilename()));
    await page.route('https://upload.wikimedia.org/**', async route => {
      if (hold && route.request().resourceType() === 'fetch') { held++; await pending; }
      await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => {});
    });
    await page.evaluate(() => { const w = window as any; w.__handoffs = []; w.__ctx.onUseArtwork = (item: any) => { w.__handoffs.push(item); }; w.__rerender(); });
    await page.locator('[data-sourcebook-inspect]').first().click();
    const button = page.locator('[data-sourcebook-single-action="' + action + '"]').first();
    try {
      await button.click(); await expect.poll(() => held).toBe(1);
      if (reason === 'cancel') await page.locator('[data-sourcebook-cancel-single="global"]').click();
      else await page.evaluate(() => { const w = window as any; const id = w.SourcebookProviders.materials[0].id; w.__ctx.updateMulti('sourcebook', { preparation: { [id]: { note: 'Updated single-image note' } } }); });
      await expect(page.locator('[data-sourcebook-cancel-single]')).toHaveCount(0);
      expect(downloads).toHaveLength(0); expect(await page.evaluate(() => (window as any).__handoffs.length)).toBe(0);
      hold = false;
      if (action === 'package') {
        const ready = page.waitForEvent('download'); await button.click(); const file = await ready;
        const html = await readFile((await file.path())!, 'utf8');
        if (reason === 'edit') expect(html).toContain('Updated single-image note');
      } else {
        await button.click(); await expect.poll(() => page.evaluate(() => (window as any).__handoffs.length)).toBe(1);
        if (reason === 'edit') expect(await page.evaluate(() => JSON.stringify((window as any).__handoffs[0]))).toContain('Updated single-image note');
      }
      release(); await expect(button).toBeEnabled();
      expect(downloads.length + await page.evaluate(() => (window as any).__handoffs.length)).toBe(1);
    } finally { release(); }
  });
}

test('leaving Sourcebook prevents a pending Page Designer transfer', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; }); let started = false;
  await page.route('https://upload.wikimedia.org/**', async route => {
    if (route.request().resourceType() === 'fetch') { started = true; await pending; }
    await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => {});
  });
  await page.evaluate(() => { const w = window as any; w.__handoffs = []; w.__ctx.onUseArtwork = (item: any) => w.__handoffs.push(item); w.__rerender(); });
  try {
    await page.locator('[data-sourcebook-inspect]').first().click();
    await page.locator('[data-sourcebook-single-action="handoff"]').click();
    await expect.poll(() => started).toBe(true);
    await page.evaluate(() => (window as any).__root.unmount()); release();
    await expect(page.locator('.sourcebook-tool')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__handoffs)).toEqual([]);
  } finally { release(); }
});

test('unavailable thumbnails show accessible recovery controls and retry successfully on mobile', async ({ page }) => {
  let broken = true;
  await page.route('https://**/*', route => route.request().resourceType() === 'image' ? route.fulfill({ contentType: 'image/png', body: broken ? Buffer.from('invalid thumbnail') : pixel }) : route.fallback());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.evaluate(() => (window as any).__mount({}));
  await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block}.sourcebook-tool{width:100%;padding:16px;box-sizing:border-box}' });
  const card = page.locator('[data-sourcebook-result-card]').first();
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('[data-sourcebook-image-unavailable]')).toBeVisible();
  const recovery = card.locator('[data-sourcebook-image-recovery]');
  await expect(recovery.getByRole('link', { name: 'Open source record' })).toHaveAttribute('href', /^https:/);
  await expect(page.locator('button button, button a')).toHaveCount(0);
  await recovery.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'scratch/sourcebook-image-recovery-mobile.png', fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  broken = false;
  await recovery.getByRole('button', { name: 'Retry image' }).click();
  await expect(card.locator('[data-sourcebook-image-unavailable]')).toHaveCount(0);
  await expect(card.locator('[data-sourcebook-image-recovery]')).toHaveCount(0);
  await expect.poll(() => card.locator('img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
});

async function seedCheckpointPalette(page: any) {
  return page.evaluate(() => {
    const w = window as any; const api = w.SourcebookProviders;
    const ids = api.materials.slice(0, 2).map((item: any) => item.id).reverse();
    w.__ctx.updateMulti('sourcebook', { collection: ids, savedAssets: {}, paletteTitle: 'Original lesson', preparation: { [ids[0]]: { note: 'Keep this value study', flip: true, grayscale: true, grid: true } }, paletteHistory: [] });
    return ids;
  });
}

test('checkpoints restore order and preparation, retain a backup, and persist when Sourcebook reopens', async ({ page }) => {
  const ids = await seedCheckpointPalette(page);
  const history = page.locator('[data-sourcebook-history]');
  await history.locator('summary').click();
  await page.getByLabel('Checkpoint name', { exact: true }).fill('Before adjustments');
  await page.locator('[data-sourcebook-checkpoint-save]').click();
  await expect(history.locator('[data-sourcebook-checkpoint]')).toHaveCount(1);
  await page.evaluate(({ ids }) => { const w = window as any; w.__ctx.updateMulti('sourcebook', { collection: [ids[1]], paletteTitle: 'New lesson', preparation: { [ids[1]]: { note: 'New note' } } }); }, { ids });
  await page.getByRole('button', { name: 'Restore checkpoint Before adjustments', exact: true }).click();
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Original lesson');
  await expect(history.locator('[data-sourcebook-checkpoint]')).toHaveCount(2);
  const restored = await page.evaluate(() => (window as any).__toolData.sourcebook);
  expect(restored.collection).toEqual(ids);
  expect(restored.preparation[ids[0]]).toMatchObject({ note: 'Keep this value study', flip: true, grayscale: true, grid: true });
  expect(restored.paletteHistory[0].name).toBe('Before restore: New lesson');
  expect(restored.paletteHistory[0].manifest.assets[0].preparation.note).toBe('New note');
  await page.getByRole('button', { name: 'Undo palette change', exact: true }).click();
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('New lesson');
  await page.evaluate(() => { const w = window as any; const saved = JSON.parse(JSON.stringify(w.__toolData)); w.__root.unmount(); w.__mount(saved); });
  await page.locator('[data-sourcebook-history] summary').click();
  await expect(page.locator('[data-sourcebook-checkpoint]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Restore checkpoint Before adjustments', exact: true }).click();
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Original lesson');
  // The current version already has a backup; restoring does not create a duplicate.
  await expect(page.locator('[data-sourcebook-checkpoint]')).toHaveCount(2);
});

test('full checkpoint history preserves current work until an older checkpoint is exported and deleted', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as any; const api = w.SourcebookProviders; const ids = api.materials.slice(0, 2).map((item: any) => item.id);
    const manifest = api.buildPalette([ids[0]], {}, 'Earlier lesson'); let history: any[] = [];
    for (let i=0; i<8; i++) history=api.appendPaletteCheckpoint(history, manifest, 'Version '+i, 'checkpoint-'+i, '2026-09-04T12:00:00.000Z');
    w.__ctx.updateMulti('sourcebook', { collection: [ids[1]], savedAssets: {}, preparation: {}, paletteTitle: 'Unsaved current lesson', paletteHistory: history });
  });
  await page.locator('[data-sourcebook-history] summary').click();
  await page.getByRole('button', { name: 'Restore checkpoint Version 0', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.stringify((window as any).__events.toasts))).toContain('Checkpoint storage is full');
  expect(await page.evaluate(() => (window as any).__toolData.sourcebook.paletteTitle)).toBe('Unsaved current lesson');
  await expect(page.locator('[data-sourcebook-checkpoint]')).toHaveCount(8);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export checkpoint Version 7', exact: true }).click();
  const file = await download; const exported = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(exported.schema).toBe('org.owlflow.sourcebook-palette'); expect(exported.title).toBe('Earlier lesson'); expect(exported.assets).toHaveLength(1);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete checkpoint Version 7', exact: true }).click();
  await expect(page.locator('[data-sourcebook-checkpoint]')).toHaveCount(8);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete checkpoint Version 7', exact: true }).click();
  await expect(page.locator('[data-sourcebook-checkpoint]')).toHaveCount(7);
  await page.getByRole('button', { name: 'Restore checkpoint Version 0', exact: true }).click();
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Earlier lesson');
  await expect(page.locator('[data-sourcebook-checkpoint]')).toHaveCount(8);
  expect(await page.evaluate(() => (window as any).__toolData.sourcebook.paletteHistory[0].manifest.title)).toBe('Unsaved current lesson');
});

for (const interruption of ['rights', 'edit', 'cancel', 'unmount'] as const) {
  test('checkpoint restore preserves current data after '+interruption, async ({ page }) => {
    const record = { id: 123, title: 'External checkpoint study', artist_display: 'Catalog artist', image_id: 'abc-123', is_public_domain: true };
    const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
    let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; }); let started = false;
    await page.route('https://api.artic.edu/api/v1/artworks/123', async route => {
      started = true;
      if (interruption !== 'rights') await pending;
      await route.fulfill({ json: { data: { ...record, is_public_domain: interruption !== 'rights' }, config } }).catch(() => {});
    });
    await page.evaluate(({ record, config }) => {
      const w = window as any; const api = w.SourcebookProviders;
      const item = api.normalizeAicArtwork(record, config, '', 'All');
      const history=api.appendPaletteCheckpoint([], api.buildPalette([item.id], { [item.id]: { note: 'External note' } }, 'External lesson', [item]), 'External', 'checkpoint-external', '2026-09-04T12:00:00.000Z');
      w.__ctx.updateMulti('sourcebook', { collection: [api.materials[0].id], savedAssets: {}, preparation: {}, paletteTitle: 'Current lesson', paletteHistory: history });
    }, { record, config });
    await page.locator('[data-sourcebook-history] summary').click();
    try {
      await page.getByRole('button', { name: 'Restore checkpoint External', exact: true }).click();
      await expect.poll(() => started).toBe(true);
      if (interruption === 'edit') await page.evaluate(() => (window as any).__ctx.updateMulti('sourcebook', { paletteTitle: 'Newer edit' }));
      if (interruption === 'cancel') await page.locator('[data-sourcebook-checkpoint-cancel]').click();
      if (interruption === 'unmount') await page.evaluate(() => (window as any).__root.unmount());
      release();
      if (interruption === 'rights' || interruption === 'edit') await expect.poll(() => page.evaluate(() => JSON.stringify((window as any).__events.toasts))).toContain('Checkpoint was not restored');
      if (interruption !== 'unmount') await expect(page.locator('[data-sourcebook-checkpoint-cancel]')).toHaveCount(0);
      const current = await page.evaluate(() => (window as any).__toolData.sourcebook);
      expect(current.paletteTitle).toBe(interruption === 'edit' ? 'Newer edit' : 'Current lesson');
      expect(current.collection).not.toContain('aic-live-123'); expect(current.paletteHistory).toHaveLength(1);
      expect(current.paletteUndo).toBeFalsy();
      if (interruption === 'cancel') {
        await page.getByRole('button', { name: 'Restore checkpoint External', exact: true }).click();
        await expect(page.locator('#sourcebook-palette-title')).toHaveValue('External lesson');
        await expect(page.locator('[data-sourcebook-smk-saved-status]')).toHaveAttribute('data-sourcebook-smk-saved-status', 'ready');
        expect(await page.evaluate(() => (window as any).__toolData.sourcebook.preparation['aic-live-123'].note)).toBe('External note');
        await expect(page.locator('[data-sourcebook-checkpoint]')).toHaveCount(2);
      }
    } finally { release(); }
  });
}

test('checkpoint history is accessible on mobile and can restore into an empty palette', async ({ page }) => {
  await seedCheckpointPalette(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const history = page.locator('[data-sourcebook-history]');
  await history.locator('summary').focus(); await page.keyboard.press('Enter');
  await page.getByLabel('Checkpoint name', { exact: true }).fill('A saved lesson with a longer checkpoint name');
  await page.locator('[data-sourcebook-checkpoint-save]').click();
  await page.evaluate(() => (window as any).__ctx.updateMulti('sourcebook', { collection: [], savedAssets: {}, preparation: {} }));
  await expect(page.locator('[data-sourcebook-workflow-step="prepare"]')).toBeDisabled();
  await history.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'scratch/sourcebook-checkpoints-mobile.png', fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  for (const button of await history.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Restore checkpoint A saved lesson with a longer checkpoint name', exact: true }).click();
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Original lesson');
  await expect(page.locator('[data-sourcebook-checkpoint]')).toHaveCount(1);
});

async function seedPendingPaletteVerification(page: any) {
  return page.evaluate(() => {
    const w = window as any; const api = w.SourcebookProviders;
    const record = { id: 123, title: 'Pending verified study', artist_display: 'Catalog artist', image_id: 'abc-123', is_public_domain: true };
    const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
    const item = api.normalizeAicArtwork(record, config, '', 'All');
    const manifest = api.buildPalette([item.id], { [item.id]: { note: 'Verified note' } }, 'Recovered lesson', [item]);
    w.__ctx.updateMulti('sourcebook', { collection: [api.materials[0].id], savedAssets: {}, preparation: {}, paletteTitle: 'Current lesson', paletteUndo: manifest });
    const originalFetch = w.fetch.bind(w);
    w.__paletteRequests = [];
    w.fetch = (url: any, options: any) => {
      if (String(url).includes('api.artic.edu/api/v1/artworks/123')) {
        // Deliberately ignore abort: old provider completions must still be harmless.
        return new Promise(resolve => w.__paletteRequests.push({ signal: options?.signal, release: () => resolve({ ok: true, status: 200, json: async () => ({ data: record, config }) }) }));
      }
      return originalFetch(url, options);
    };
    return manifest;
  });
}

async function startPaletteVerification(page: any, action: string, manifest: any) {
  if (action === 'undo') await page.getByRole('button', { name: 'Undo palette change', exact: true }).click();
  else {
    await page.locator('[data-sourcebook-workflow-step="export"]').click();
    await page.getByLabel('Import Sourcebook palette manifest', { exact: true }).setInputFiles({ name: 'recovery.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(manifest)) });
  }
}

for (const action of ['import', 'undo']) {
  test('leaving Sourcebook during '+action+' verification prevents late palette writes', async ({ page }) => {
    const manifest = await seedPendingPaletteVerification(page);
    await startPaletteVerification(page, action, manifest);
    await expect.poll(() => page.evaluate(() => (window as any).__paletteRequests.length)).toBe(1);
    const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.sourcebook));
    await page.evaluate(async () => {
      const w = window as any; w.__root.unmount(); w.__paletteRequests[0].release();
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.sourcebook))).toBe(before);
  });
}

for (const action of ['import', 'undo']) {
  test('cancelled '+action+' verification cannot finish or clear a newer retry', async ({ page }) => {
    const manifest = await seedPendingPaletteVerification(page);
    await startPaletteVerification(page, action, manifest);
    await expect.poll(() => page.evaluate(() => (window as any).__paletteRequests.length)).toBe(1);
    await page.locator('[data-sourcebook-workflow-step="find"]').click();
    const status = page.locator('[data-sourcebook-palette-verification]');
    await expect(status).toHaveAttribute('data-sourcebook-palette-verification', action);
    await page.locator('[data-sourcebook-cancel-palette-verification]').click();
    await expect(status).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__paletteRequests[0].signal.aborted)).toBe(true);
    expect(await page.evaluate(() => (window as any).__toolData.sourcebook.paletteTitle)).toBe('Current lesson');
    await startPaletteVerification(page, action, manifest);
    await expect.poll(() => page.evaluate(() => (window as any).__paletteRequests.length)).toBe(2);
    await page.evaluate(async () => { (window as any).__paletteRequests[0].release(); await new Promise(resolve => setTimeout(resolve, 0)); });
    await expect(status).toHaveAttribute('data-sourcebook-palette-verification', action);
    expect(await page.evaluate(() => (window as any).__toolData.sourcebook.paletteTitle)).toBe('Current lesson');
    await page.evaluate(() => (window as any).__paletteRequests[1].release());
    await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Recovered lesson');
    await expect(status).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__toolData.sourcebook.preparation['aic-live-123'].note)).toBe('Verified note');
  });
}

test('undo verification preserves a newer undo target even when the palette is unchanged', async ({ page }) => {
  const manifest = await seedPendingPaletteVerification(page);
  await startPaletteVerification(page, 'undo', manifest);
  await expect.poll(() => page.evaluate(() => (window as any).__paletteRequests.length)).toBe(1);
  await page.evaluate(() => {
    const w = window as any; const api = w.SourcebookProviders;
    w.__ctx.updateMulti('sourcebook', { paletteUndo: api.buildPalette([api.materials[1].id], {}, 'New undo target') });
    w.__paletteRequests[0].release();
  });
  await expect.poll(() => page.evaluate(() => JSON.stringify((window as any).__events.toasts))).toContain('undo history changed');
  const state = await page.evaluate(() => (window as any).__toolData.sourcebook);
  expect(state.paletteTitle).toBe('Current lesson'); expect(state.paletteUndo.title).toBe('New undo target');
  await page.getByRole('button', { name: 'Undo palette change', exact: true }).click();
  await expect(page.locator('#sourcebook-palette-title')).toHaveValue('New undo target');
});

for (const reason of ['cancel', 'unmount']) {
  test('a pending import file read is aborted after '+reason+' and ignores stale reader callbacks', async ({ page }) => {
    const manifest = await page.evaluate(() => {
      const w = window as any; const api = w.SourcebookProviders;
      w.__ctx.updateMulti('sourcebook', { collection: [api.materials[0].id], paletteTitle: 'Current lesson' });
      w.__fileReads = [];
      w.FileReader = class {
        readyState = 0; result = ''; onload: any; onerror: any; onabort: any; lateLoad: any; lateError: any; aborted = false;
        readAsText() { this.readyState = 1; this.lateLoad = this.onload; this.lateError = this.onerror; w.__fileReads.push(this); }
        abort() { this.aborted = true; this.readyState = 2; if (this.onabort) this.onabort(); }
      };
      return api.buildPalette([api.materials[1].id], {}, 'Read successfully');
    });
    await startPaletteVerification(page, 'import', manifest);
    await expect.poll(() => page.evaluate(() => (window as any).__fileReads.length)).toBe(1);
    const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.sourcebook));
    if (reason === 'cancel') {
      await page.setViewportSize({ width: 390, height: 844 });
      const status = page.locator('[data-sourcebook-palette-verification]');
      await status.scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'scratch/sourcebook-import-cancel-mobile.png', fullPage: false });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator('[data-sourcebook-cancel-palette-verification]').click();
    } else await page.evaluate(() => (window as any).__root.unmount());
    expect(await page.evaluate(() => (window as any).__fileReads[0].aborted)).toBe(true);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.sourcebook))).toBe(before);
    if (reason === 'cancel') await startPaletteVerification(page, 'import', manifest);
    await page.evaluate(() => { const reader = (window as any).__fileReads[0]; reader.result = 'invalid JSON'; reader.lateLoad(); reader.lateError(); });
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.sourcebook))).toBe(before);
    if (reason === 'cancel') {
      await expect(page.locator('[data-sourcebook-palette-verification]')).toHaveAttribute('data-sourcebook-palette-verification', 'import');
      await page.evaluate(manifest => { const reader = (window as any).__fileReads[1]; reader.result = JSON.stringify(manifest); reader.readyState = 2; reader.onload(); }, manifest);
      await expect(page.locator('#sourcebook-palette-title')).toHaveValue('Read successfully');
      await expect(page.locator('[data-sourcebook-palette-verification]')).toHaveCount(0);
    }
  });
}

async function seedKeyboardPalette(page: any, count = 3) {
  const items = await page.evaluate(count => {
    const w = window as any; const items = w.SourcebookProviders.materials.slice(0, count);
    w.__ctx.updateMulti('sourcebook', { collection: items.map((item: any) => item.id), savedAssets: {}, preparation: {}, paletteTitle: 'Keyboard lesson' });
    return items.map((item: any) => ({ id: item.id, title: item.title }));
  }, count);
  await page.locator('[data-sourcebook-workflow-step="prepare"]').click();
  return items;
}

test('keyboard removal focuses the next palette card and the heading when no cards remain', async ({ page }) => {
  const items = await seedKeyboardPalette(page, 2);
  for (let i=0; i<items.length; i++) {
    const card = page.locator('[data-sourcebook-result-card="'+items[i].id+'"]');
    const remove = card.getByRole('button', { name: /^Remove .* from the Sourcebook palette$/ });
    await remove.focus(); await page.keyboard.press('Enter');
    await expect(card).toHaveCount(0);
    if (i===0) await expect(page.locator('[data-sourcebook-inspect="'+items[1].id+'"]')).toBeFocused();
    else await expect(page.locator('#sourcebook-results-title')).toBeFocused();
  }
});

test('keyboard reorder retains its control until the boundary then focuses the moved card', async ({ page }) => {
  const items = await seedKeyboardPalette(page);
  await page.evaluate(() => { const w=window as any;w.__announcements=[];w.__ctx.announceToSR=(message:string)=>w.__announcements.push(message); });
  const card = page.locator('[data-sourcebook-result-card="'+items[2].id+'"]');
  const earlier = card.getByRole('button', { name: 'Move '+items[2].title+' earlier in palette', exact: true });
  await earlier.focus(); await page.keyboard.press('Enter');
  await expect(earlier).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(earlier).toBeDisabled();
  await expect(card.locator('[data-sourcebook-inspect]')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__toolData.sourcebook.collection[0])).toBe(items[2].id);
  expect(await page.evaluate(() => (window as any).__announcements.at(-1))).toBe('Moved '+items[2].title+' to position 1 of 3.');
});

test('keyboard bulk removal and clear return focus to the remaining palette or search', async ({ page }) => {
  const items = await seedKeyboardPalette(page);
  for (const item of items.slice(0,2)) await page.locator('[data-sourcebook-result-card="'+item.id+'"]').getByRole('checkbox').check();
  const remove = page.getByRole('button', { name: 'Remove selected (2)', exact: true });
  page.once('dialog', dialog => dialog.dismiss());
  await remove.focus(); await page.keyboard.press('Enter');
  await expect(remove).toBeFocused(); await expect(page.locator('[data-sourcebook-result-card]')).toHaveCount(3);
  page.once('dialog', dialog => dialog.accept());
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-sourcebook-inspect="'+items[2].id+'"]')).toBeFocused();
  const clear = page.getByRole('button', { name: 'Clear palette', exact: true });
  page.once('dialog', dialog => dialog.accept());
  await clear.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#sourcebook-search')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__toolData.sourcebook.collection)).toEqual([]);
});

test('keyboard checkpoint deletion focuses the next restore control then the name field', async ({ page }) => {
  await seedKeyboardPalette(page,1);
  await page.evaluate(() => {
    const w = window as any;const api = w.SourcebookProviders;const manifest = api.buildPalette(w.__toolData.sourcebook.collection, {}, 'Keyboard lesson');
    let history = api.appendPaletteCheckpoint([], manifest, 'First', 'checkpoint-first', '2026-09-04T12:00:00.000Z');
    history = api.appendPaletteCheckpoint(history, manifest, 'Second', 'checkpoint-second', '2026-09-04T13:00:00.000Z');
    w.__ctx.updateMulti('sourcebook', { paletteHistory: history });
  });
  await page.locator('[data-sourcebook-history] summary').click();
  for (const name of ['Second','First']) {
    const remove = page.getByRole('button', { name: 'Delete checkpoint '+name, exact:true });
    page.once('dialog', dialog => dialog.accept());
    await remove.focus();await page.keyboard.press('Enter');
    if(name==='Second') await expect(page.getByRole('button',{name:'Restore checkpoint First',exact:true})).toBeFocused();
    else await expect(page.getByLabel('Checkpoint name',{exact:true})).toBeFocused();
  }
});

for(const action of ['import','undo']) {
  test('keyboard cancellation of '+action+' returns focus to the active workflow',async({page})=>{
    const manifest=await seedPendingPaletteVerification(page);
    if(action==='undo') await page.locator('[data-sourcebook-workflow-step="prepare"]').click();
    await startPaletteVerification(page,action,manifest);
    await expect.poll(()=>page.evaluate(()=>(window as any).__paletteRequests.length)).toBe(1);
    if(action==='import') await page.locator('[data-sourcebook-workflow-step="find"]').click();
    await page.locator('[data-sourcebook-cancel-palette-verification]').focus();await page.keyboard.press('Enter');
    const target=page.locator(action==='import'?'#sourcebook-search':'#sourcebook-palette-title');
    await expect(target).toBeFocused();
    await page.evaluate(async()=>{(window as any).__paletteRequests[0].release();await new Promise(resolve=>setTimeout(resolve,0));});
    await expect(target).toBeFocused();
  });
}

test('keyboard checkpoint cancellation restores focus to its restore button',async({page})=>{
  const manifest=await seedPendingPaletteVerification(page);
  await page.evaluate(manifest=>{const w=window as any;w.__ctx.updateMulti('sourcebook',{paletteHistory:w.SourcebookProviders.appendPaletteCheckpoint([],manifest,'External','checkpoint-external','2026-09-04T12:00:00.000Z')});},manifest);
  await page.locator('[data-sourcebook-history] summary').click();
  const restore=page.getByRole('button',{name:'Restore checkpoint External',exact:true});
  await restore.click();await expect.poll(()=>page.evaluate(()=>(window as any).__paletteRequests.length)).toBe(1);
  await page.locator('[data-sourcebook-checkpoint-cancel]').focus();await page.keyboard.press('Enter');
  await expect(restore).toBeFocused();await expect(restore).toBeEnabled();
  await page.evaluate(async()=>{(window as any).__paletteRequests[0].release();await new Promise(resolve=>setTimeout(resolve,0));});
  await expect(restore).toBeFocused();
});

test('keyboard removal of the last visible mobile card focuses the preceding card without opening a dialog',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const items=await seedKeyboardPalette(page,2);
  const last=page.locator('[data-sourcebook-result-card="'+items[1].id+'"]');
  await last.getByRole('button',{name:/^Remove .* from the Sourcebook palette$/}).focus();await page.keyboard.press('Enter');
  const previous=page.locator('[data-sourcebook-inspect="'+items[0].id+'"]');
  await expect(previous).toBeFocused();await expect(page.getByRole('dialog')).toHaveCount(0);
  const focusBox=(await previous.boundingBox())!;const trayBox=(await page.locator('[data-sourcebook-palette-tray]').boundingBox())!;
  expect(focusBox.y).toBeGreaterThanOrEqual(trayBox.y+trayBox.height+4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:'scratch/sourcebook-keyboard-mobile.png',fullPage:false});
});

test('keyboard focus recovery does not override a newer focus choice',async({page})=>{
  const items=await seedKeyboardPalette(page);
  await page.evaluate(()=>{const w=window as any;const update=w.__ctx.updateMulti;w.__ctx.updateMulti=(tool:string,patch:any)=>{w.__applyDelayedPaletteEdit=()=>{w.__ctx.updateMulti=update;update(tool,patch);};};});
  await page.locator('[data-sourcebook-result-card="'+items[2].id+'"] [data-sourcebook-reorder="earlier"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#sourcebook-search').focus();
  await page.evaluate(()=>(window as any).__applyDelayedPaletteEdit());
  await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.sourcebook.collection[1])).toBe(items[2].id);
  await expect(page.locator('#sourcebook-search')).toBeFocused();
});
