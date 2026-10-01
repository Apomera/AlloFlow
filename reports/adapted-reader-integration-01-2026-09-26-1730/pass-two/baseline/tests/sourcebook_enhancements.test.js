import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_sourcebook.js', 'utf8');
function load(fetch) {
  const box = { console, setTimeout, clearTimeout, window: { fetch, AbortController } };
  vm.runInNewContext(source, box);
  return box.window.SourcebookProviders;
}
const clone = value => JSON.parse(JSON.stringify(value));
const pd = 'https://creativecommons.org/publicdomain/mark/1.0/';
const uuid = 'cbbaadc3-8e82-44ef-a596-1d16f9b1e404';

function fixtures(api) {
  const commons = { pageid: 77, title: 'File:Study.jpg', imageinfo: [{
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Study.jpg',
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Study.jpg',
    extmetadata: { LicenseShortName: { value: 'Public Domain Mark' }, LicenseUrl: { value: pd }, Artist: { value: 'Catalog artist' } }
  }] };
  const met = { objectID: 123, isPublicDomain: true, title: 'Study', artistDisplayName: 'Catalog artist', medium: 'Oil on canvas',
    objectURL: 'https://www.metmuseum.org/art/collection/search/123', primaryImage: 'https://images.metmuseum.org/Study.jpg' };
  const aic = { id: 123, title: 'Study', artist_display: 'Catalog artist', image_id: 'abc-123', is_public_domain: true, medium_display: 'Oil on canvas' };
  const config = { iiif_url: 'https://www.artic.edu/iiif/2' };
  const cma = { id: 123, title: 'Study', creators: [{ description: 'Catalog artist' }], technique: 'Oil on canvas', share_license_status: 'CC0',
    url: 'https://clevelandart.org/art/1920.1', images: { web: { url: 'https://openaccess-cdn.clevelandart.org/1920.1/web.jpg' }, print: { url: 'https://openaccess-cdn.clevelandart.org/1920.1/print.jpg' } } };
  const loc = { 'item.id': 'https://www.loc.gov/item/study/', 'item.title': 'Study', 'item.medium': ['Oil on canvas'],
    'item.rights': ['These materials are in the public domain and are free to use and reuse.'],
    'resources.0': { files: [[{ url: 'https://tile.loc.gov/study.jpg', mimetype: 'image/jpeg', width: 1800, height: 1200 }]] } };
  const wellcome = { id: 'abcd1234', source: { id: 'work1234', title: 'Study', genres: [{ label: 'Oil on canvas' }] }, locations: [{
    url: 'https://iiif.wellcomecollection.org/image/Study/info.json', license: { id: 'pdm', label: 'Public Domain Mark', url: pd }, accessConditions: [{ status: { id: 'open' } }]
  }] };
  const media = { id: 'https://data.getty.edu/media/image/' + uuid,
    subject_to: [{ classified_as: [{ id: 'https://creativecommons.org/publicdomain/zero/1.0/', _label: 'Creative Commons Public Domain Dedication' }, { id: 'https://data.getty.edu/local/thesaurus/clearance/download' }] }],
    digitally_shown_by: [{ access_point: [{ id: 'https://media.getty.edu/iiif/image/' + uuid, conforms_to: 'http://iiif.io/api/image' }] }] };
  const getty = { id: 'https://data.getty.edu/museum/collection/object/' + uuid, _label: 'Study', shows: [{ id: media.id }], classified_as: [{ _label: 'Oil on canvas' }] };
  const detail = 'https://api.openverse.org/v1/images/' + uuid + '/';
  const openverse = { id: uuid, title: 'Study', creator: 'Catalog artist', license: 'pdm', license_version: '1.0', license_url: pd,
    detail_url: detail, thumbnail: detail + 'thumb/', width: 1800, height: 1200, mature: false,
    foreign_landing_url: 'https://example.org/study', url: 'https://example.org/study.jpg' };
  return [
    { name: 'Commons', item: api.normalizeCommonsPage(commons, '', 'All'), replies: [{ query: { pages: [commons] } }], endpoint: 'commons.wikimedia.org/w/api.php?' },
    { name: 'Met', item: api.normalizeMetObject(met, '', 'All'), replies: [met], endpoint: '/objects/123' },
    { name: 'AIC', item: api.normalizeAicArtwork(aic, config, '', 'All'), replies: [{ data: aic, config }], endpoint: '/artworks/123' },
    { name: 'CMA', item: api.normalizeCmaArtwork(cma, '', 'All'), replies: [{ data: cma }], endpoint: '/artworks/123' },
    { name: 'LOC', item: api.normalizeLocItem(loc, null, '', 'All'), replies: [loc], endpoint: '/item/study/?fo=json' },
    { name: 'Wellcome', item: api.normalizeWellcomeImage(wellcome, '', 'All'), replies: [wellcome], endpoint: '/images/abcd1234?' },
    { name: 'Getty', item: api.normalizeGettyImage(getty, media, '', 'All'), replies: [getty, media], endpoint: '/museum/collection/object/' },
    { name: 'Openverse', item: api.normalizeOpenverseImage(openverse, '', 'All'), replies: [openverse], endpoint: detail }
  ];
}

describe('Sourcebook verified imports', () => {
  for (const name of ['Commons', 'Met', 'AIC', 'CMA', 'LOC', 'Wellcome', 'Getty', 'Openverse']) {
    it(`revalidates ${name} identity, restores authoritative metadata, and retains preparation`, async () => {
      const initial = load();
      const fixture = fixtures(initial).find(entry => entry.name === name);
      expect(fixture.item, name).toBeTruthy();
      const manifest = initial.buildPalette([fixture.item.id], { [fixture.item.id]: { note: 'My teaching note', mode: 'crop', x: 32 } }, 'Lesson', [fixture.item]);
      const medium = manifest.assets[0].medium;
      manifest.assets[0].title = 'Forged title';
      manifest.assets[0].creator = 'Forged creator';
      manifest.assets[0].medium = 'Forged material';
      const requests = [];
      let cursor = 0;
      const api = load(async (url, opts) => {
        requests.push(String(url));
        expect(opts.credentials).toBe('omit');
        return { ok: true, json: async () => clone(fixture.replies[cursor++]) };
      });
      expect(api.normalizePalette(manifest)).toBeNull();
      const imported = await api.revalidatePalette(manifest);
      expect(requests[0]).toContain(fixture.endpoint);
      expect(requests).toHaveLength(fixture.replies.length);
      expect(imported.assets[0].title).toBe('Study');
      expect(imported.assets[0].creator).not.toBe('Forged creator');
      expect(imported.assets[0].medium).toBe(medium);
      expect(imported.preparation[fixture.item.id]).toMatchObject({ note: 'My teaching note', mode: 'crop', x: 32 });
    });
  }

  for (const [provider, category] of [
    ['National Gallery of Art Open Access', 'Images from the National Gallery of Art'],
    ['Smithsonian Open Access', 'Images from the Smithsonian Institution'],
    ['Biodiversity Heritage Library', 'Files from the Biodiversity Heritage Library'],
    ['U.S. National Archives', 'Media contributed by the National Archives and Records Administration']
  ]) {
    it('rechecks the institutional category for ' + provider, async () => {
      const initial = load(); const fixture = fixtures(initial)[0];
      const item = { ...fixture.item, provider };
      const manifest = initial.buildPalette([item.id], {}, 'Collection', [item]);
      const reply = clone(fixture.replies[0]);
      reply.query.pages[0].categories = [{ title: 'Category:' + category }];
      const api = load(async url => {
        const request = new URL(String(url));
        expect(request.searchParams.get('clcategories')).toBe('Category:' + category);
        return { ok: true, json: async () => clone(reply) };
      });
      expect((await api.revalidatePalette(manifest)).assets[0].provider).toBe(provider);
      reply.query.pages[0].categories = [];
      await expect(api.revalidatePalette(manifest)).rejects.toThrow('identity');
    });
  }

  it('rejects altered rights, swapped images, unavailable records, and unknown providers', async () => {
    const initial = load();
    const fixture = fixtures(initial)[0];
    const manifest = initial.buildPalette([fixture.item.id], {}, 'Lesson', [fixture.item]);
    for (const changes of [
      { rightsType: 'ccby', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', license: 'CC BY 4.0' },
      { imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Other.jpg' },
      { provider: 'Unknown provider' }
    ]) {
      const changed = clone(manifest); Object.assign(changed.assets[0], changes);
      const api = load(async () => ({ ok: true, json: async () => clone(fixture.replies[0]) }));
      await expect(api.revalidatePalette(changed)).rejects.toThrow();
    }
    await expect(load(async () => { throw Error('offline'); }).revalidatePalette(manifest)).rejects.toThrow('offline');
  });

  it('restores code-owned shelf metadata offline and ignores forged verification flags', async () => {
    const api = load(() => { throw Error('Unexpected network'); });
    const original = api.materials[0];
    const manifest = api.buildPalette([original.id], {}, 'Shelf');
    Object.assign(manifest.assets[0], { title: 'Forged title', creator: 'Forged creator', verified: true });
    const restored = await api.revalidatePalette(manifest);
    expect(restored.assets[0].title).toBe(original.title);
    expect(api.normalizePalette(manifest).assets[0].creator).toBe(original.creator);
    manifest.assets[0].rightsType = 'ccby';
    expect(api.normalizePalette(manifest)).toBeNull();
    await expect(api.revalidatePalette(manifest)).rejects.toThrow();
  });

  it('does not make requests after cancellation and preserves atomic mixed imports', async () => {
    const initial = load(); const fixture = fixtures(initial)[2];
    const manifest = initial.buildPalette([initial.materials[0].id, fixture.item.id], {}, 'Mixed', [fixture.item]);
    let requests = 0;
    const api = load(async () => { requests++; throw Error('failure'); });
    const controller = new AbortController(); controller.abort();
    await expect(api.revalidatePalette(manifest, { signal: controller.signal })).rejects.toThrow();
    expect(requests).toBe(0);
    await expect(api.revalidatePalette(manifest)).rejects.toThrow('failure');
    expect(manifest.assets).toHaveLength(2);
  });
});

describe('Sourcebook complete reference boards', () => {
  function boardHarness(failPage = -1) {
    let calls = 0;
    const drawn = [];
    const box = { PALETTE_MAX_ASSETS: 48, Promise,
      sourcebookSlug: () => 'lesson',
      loadReferenceBoardEntries: async (items, prep, progress) => { progress(items.length); return calls++ === failPage ? [] : items; },
      buildReferenceBoardDataUrl: (entries, options) => { drawn.push({ entries, options }); return 'data:image/png;base64,YQ=='; }
    };
    vm.runInNewContext(fs.readFileSync('dev-tools/sourcebook/reference-board.js', 'utf8'), box);
    return { box, drawn };
  }
  it.each([1, 12, 13, 25, 48])('includes all %i selected images in ordered pages', async count => {
    const { box, drawn } = boardHarness();
    const items = Array.from({ length: count }, (_, id) => ({ id }));
    const pages = await box.buildReferenceBoardPages(items, {}, { title: 'Lesson', columns: 3 });
    expect(pages.reduce((sum, page) => sum + page.count, 0)).toBe(count);
    expect(drawn.flatMap(page => page.entries.map(item => item.id))).toEqual(items.map(item => item.id));
    expect(pages).toHaveLength(Math.ceil(count / 12));
    expect(new Set(pages.map(page => page.filename)).size).toBe(pages.length);
  });
  it('cancels before fetching or drawing any page', async () => {
    const { box, drawn } = boardHarness();
    const controller = new AbortController(); controller.abort();
    box.loadReferenceBoardEntries = () => { throw Error('Unexpected fetch'); };
    await expect(box.buildReferenceBoardPages([{ id: 'one' }], {}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(drawn).toHaveLength(0);
  });
  it('does not draw or load later pages when cancelled during image preparation', async () => {
    const { box, drawn } = boardHarness();
    const controller = new AbortController(); let calls = 0;
    box.loadReferenceBoardEntries = async items => { calls++; controller.abort(); return items; };
    await expect(box.buildReferenceBoardPages(Array.from({ length: 25 }, (_, id) => ({ id })), {}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toBe(1); expect(drawn).toHaveLength(0);
  });
  it('identifies the missing source in image preparation errors', async () => {
    const { box } = boardHarness();
    box.loadReferenceBoardEntries = async items => items.slice(0, 1);
    await expect(box.buildReferenceBoardPages([{ id: 'a', title: 'Ready study' }, { id: 'b', title: 'Missing study' }], {}, {})).rejects.toThrow('Could not prepare: Missing study');
  });
  it('rejects the entire output if a later page cannot preserve every selected image', async () => {
    const { box } = boardHarness(1);
    await expect(box.buildReferenceBoardPages(Array.from({ length: 25 }, (_, id) => ({ id })), {}, {})).rejects.toThrow('incomplete');
  });
});


describe('Sourcebook saved-source recovery', () => {
  it('recovers healthy records independently while imports remain atomic', async () => {
    const initial = load(); const all = fixtures(initial); const good = all[2]; const bad = all[1];
    const original = { [good.item.id]: good.item, [bad.item.id]: bad.item };
    const before = JSON.stringify(original);
    const api = load(async url => ({ ok: true, json: async () => String(url).includes('api.artic.edu') ? clone(good.replies[0]) : { ...clone(bad.replies[0]), isPublicDomain: false } }));
    const recovered = await api.recoverSavedAssets(original);
    expect(Object.keys(recovered.assets)).toEqual([good.item.id]);
    expect(Object.keys(recovered.errors)).toEqual([bad.item.id]);
    expect(JSON.stringify(original)).toBe(before);
    const manifest = initial.buildPalette([good.item.id, bad.item.id], {}, 'Mixed', [good.item, bad.item]);
    await expect(api.revalidatePalette(manifest)).rejects.toThrow();
  });
  it('retains inconsistent saved IDs as failures instead of trusting them', async () => {
    const api = load(() => { throw Error('Unexpected request'); }); const item = fixtures(api)[2].item;
    const result = await api.recoverSavedAssets({ 'wrong-key': item }, { individual: true });
    expect(Object.keys(result.assets)).toHaveLength(0);
    expect(result.errors['wrong-key']).toContain('inconsistent');
  });
  it('keeps the palette recovery limit before making any record requests', async () => {
    let requests = 0; const api = load(() => { requests++; throw Error('Unexpected request'); });
    const item = fixtures(api)[2].item;
    const oversized = Object.fromEntries(Array.from({ length: 49 }, (_, index) => ['aic-live-' + index, { ...item, id: 'aic-live-' + index }]));
    await expect(api.recoverSavedAssets(oversized)).rejects.toThrow('48-asset');
    expect(requests).toBe(0);
  });
  it('does not turn cancellation into partial success', async () => {
    let calls = 0; const api = load(() => { calls++; throw Error('Unexpected request'); });
    const item = fixtures(api)[2].item; const controller = new AbortController(); controller.abort();
    await expect(api.recoverSavedAssets({ [item.id]: item }, { individual: true, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toBe(0);
  });
});
