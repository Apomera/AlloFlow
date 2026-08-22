import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const pluginPath = path.join(root, 'stem_lab', 'stem_tool_sourcebook.js');
const pluginSource = fs.readFileSync(pluginPath, 'utf8');

function loadSourcebook(fetchImpl) {
  const sandbox = {
    console,
    window: {
      fetch: fetchImpl,
      StemLab: {
        _registry: {},
        _order: [],
        registerTool(id, config) {
          config.id = id;
          this._registry[id] = config;
          this._order.push(id);
        }
      }
    }
  };
  vm.runInNewContext(pluginSource, sandbox, { filename: pluginPath });
  return sandbox.window;
}

describe('Sourcebook initial feature contract', () => {
  it('registers as a standalone creative tool with no collage framing', () => {
    const window = loadSourcebook();
    expect(window.StemLab._registry.sourcebook).toBeTruthy();
    expect(window.StemLab._registry.sourcebook.category).toBe('creative');
    expect(pluginSource.toLowerCase()).not.toContain('collage');
  });

  it('allows only explicit reusable-rights classes in built-in results', () => {
    const window = loadSourcebook();
    const materials = Array.from(window.SourcebookProviders.materials);
    expect(materials.length).toBeGreaterThanOrEqual(10);
    expect(new Set(materials.map((item) => item.rightsType))).toEqual(new Set(['pd', 'cc0']));
    for (const item of materials) {
      expect(['pd', 'cc0', 'ccby']).toContain(item.rightsType);
      expect(item.license).toMatch(/public domain|cc0/i);
      expect(item.rightsNote.length).toBeGreaterThan(40);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.imageUrl).toMatch(/^https:\/\//);
      expect(item.downloadUrl).toMatch(/^https:\/\//);
    }
    expect(pluginSource).not.toContain("rightsType: 'nkr'");
  });

  it('matches representative natural-language material requests', () => {
    const window = loadSourcebook();
    const search = window.SourcebookProviders.searchCurated;
    expect(Array.from(search('quiet wood grain for a handout', 'All', 'All')).some((item) => item.kind === 'Textures')).toBe(true);
    expect(Array.from(search('historic blueprint linework', 'All', 'All')).some((item) => item.kind === 'Blueprints')).toBe(true);
    expect(Array.from(search('brainwaves and neuron diagrams', 'All', 'All')).some((item) => item.kind === 'Science')).toBe(true);
    expect(Array.from(search('contour map', 'Maps', 'All')).every((item) => item.kind === 'Maps')).toBe(true);
  });

  it('defaults the interface to public-domain-only and supports deliberate rights expansion', () => {
    const window = loadSourcebook();
    const search = window.SourcebookProviders.searchCurated;
    expect(Array.from(search('', 'All', 'All', 'pd')).every((item) => item.rightsType === 'pd')).toBe(true);
    expect(Array.from(search('', 'All', 'All', 'pd-cc0')).some((item) => item.rightsType === 'cc0')).toBe(true);
    expect(pluginSource).toContain("rootState.rightsScope] ? rootState.rightsScope : 'pd'");
    expect(pluginSource).toContain("'Public domain only'");
    expect(pluginSource).toContain("'Add CC0'");
    expect(pluginSource).toContain("'Add CC BY'");
  });

  it('admits live Commons results only when exact reusable-rights metadata is present', async () => {
    const value = (text) => ({ value: text });
    const payload = {
      query: {
        pages: [
          {
            pageid: 101,
            title: 'File:Open contour drawing.svg',
            imageinfo: [{
              mediatype: 'DRAWING',
              url: 'https://upload.wikimedia.org/open-contour.svg',
              thumburl: 'https://upload.wikimedia.org/open-contour-thumb.png',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Open_contour_drawing.svg',
              extmetadata: {
                LicenseShortName: value('CC BY 4.0'),
                LicenseUrl: value('https://creativecommons.org/licenses/by/4.0/'),
                UsageTerms: value('Creative Commons Attribution 4.0'),
                Artist: value('<b>Example Artist</b>'),
                ImageDescription: value('<p>A reusable contour drawing.</p>'),
                DateTimeOriginal: value('2024')
              }
            }]
          },
          {
            pageid: 102,
            title: 'File:Restricted texture.jpg',
            imageinfo: [{
              mediatype: 'BITMAP',
              url: 'https://upload.wikimedia.org/restricted.jpg',
              thumburl: 'https://upload.wikimedia.org/restricted-thumb.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Restricted_texture.jpg',
              extmetadata: {
                LicenseShortName: value('CC BY-NC 4.0'),
                LicenseUrl: value('https://creativecommons.org/licenses/by-nc/4.0/'),
                UsageTerms: value('Noncommercial')
              }
            }]
          },
          {
            pageid: 103,
            title: 'File:Unknown rights.jpg',
            imageinfo: [{
              mediatype: 'BITMAP',
              url: 'https://upload.wikimedia.org/unknown.jpg',
              thumburl: 'https://upload.wikimedia.org/unknown-thumb.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Unknown_rights.jpg',
              extmetadata: { LicenseShortName: value('Unknown') }
            }]
          }
        ]
      }
    };
    const window = loadSourcebook(async () => ({ ok: true, json: async () => payload }));
    const results = Array.from(await window.SourcebookProviders.searchOpen('contour drawing', { kind: 'Maps', provider: 'Wikimedia Commons', rightsScope: 'all' }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ rightsType: 'ccby', license: 'CC BY 4.0', creator: 'Example Artist', kind: 'Maps', live: true });
    expect(results[0].rightsNote).toMatch(/Attribution is required/i);
    expect(results[0].sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org/);
  });

  it('rejects ambiguous and incompatible live license variants', () => {
    const window = loadSourcebook();
    const normalize = window.SourcebookProviders.normalizeCommonsRights;
    const field = (value) => ({ value });
    expect(normalize({ LicenseShortName: field('CC0 1.0'), LicenseUrl: field('https://creativecommons.org/publicdomain/zero/1.0/') })).toMatchObject({ rightsType: 'cc0' });
    expect(normalize({ LicenseShortName: field('Public domain'), UsageTerms: field('Public domain') })).toMatchObject({ rightsType: 'pd' });
    expect(normalize({ LicenseShortName: field('CC BY-SA 4.0'), LicenseUrl: field('https://creativecommons.org/licenses/by-sa/4.0/') })).toBeNull();
    expect(normalize({ LicenseShortName: field('CC BY 4.0') })).toBeNull();
    expect(normalize({ LicenseShortName: field('No known restrictions') })).toBeNull();
  });

  it('admits The Met images only when the object API explicitly marks them public domain', async () => {
    const fetchImpl = async (url) => {
      if (String(url).includes('/search?')) {
        return { ok: true, json: async () => ({ total: 3, objectIDs: [501, 502, 503] }) };
      }
      const id = Number(String(url).match(/\/objects\/(\d+)/)?.[1]);
      const objects = {
        501: {
          objectID: 501,
          isPublicDomain: true,
          title: 'Historic Textile Pattern',
          artistDisplayName: 'Example Maker',
          objectDate: '1890',
          objectName: 'Textile sample',
          medium: 'Woven cotton',
          primaryImage: 'https://images.metmuseum.org/original.jpg',
          primaryImageSmall: 'https://images.metmuseum.org/small.jpg',
          objectURL: 'https://www.metmuseum.org/art/collection/search/501'
        },
        502: {
          objectID: 502,
          isPublicDomain: false,
          title: 'Restricted Object',
          primaryImage: 'https://images.metmuseum.org/restricted.jpg',
          objectURL: 'https://www.metmuseum.org/art/collection/search/502'
        },
        503: {
          objectID: 503,
          isPublicDomain: true,
          title: 'No Reusable Image',
          primaryImage: '',
          objectURL: 'https://www.metmuseum.org/art/collection/search/503'
        }
      };
      return { ok: true, json: async () => objects[id] };
    };
    const window = loadSourcebook(fetchImpl);
    const results = Array.from(await window.SourcebookProviders.searchMet('textile pattern', { kind: 'Patterns' }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'met-live-501', provider: 'The Met Open Access', kind: 'Patterns',
      rightsType: 'pd', rightsShort: 'Public domain', live: true
    });
    expect(results[0].rightsMetadataSource).toContain('isPublicDomain=true');
    expect(results[0].license).toMatch(/Public Domain.*CC0/i);
  });

  it('admits Art Institute IIIF images only with an exact public-domain flag', async () => {
    const urls = [];
    const fetchImpl = async (url) => {
      urls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: 801,
              title: 'Decorative Textile Fragment',
              artist_display: 'Example Workshop',
              date_display: '18th century',
              medium_display: 'Silk and metallic thread',
              classification_title: 'Textiles',
              image_id: 'abc123-def456',
              is_public_domain: true
            },
            {
              id: 802,
              title: 'Restricted Textile',
              image_id: 'restricted-image',
              is_public_domain: false
            },
            {
              id: 803,
              title: 'No Image',
              image_id: '',
              is_public_domain: true
            }
          ],
          config: { iiif_url: 'https://www.artic.edu/iiif/2' }
        })
      };
    };
    const window = loadSourcebook(fetchImpl);
    const results = Array.from(await window.SourcebookProviders.searchAic('decorative textile', { kind: 'Patterns' }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'aic-live-801', provider: 'Art Institute of Chicago', kind: 'Patterns',
      rightsType: 'pd', license: 'CC0 Public Domain Designation', live: true
    });
    expect(results[0].imageUrl).toMatch(/\/full\/843,\/0\/default\.jpg$/);
    expect(results[0].downloadUrl).toMatch(/\/full\/1686,\/0\/default\.jpg$/);
    expect(results[0].sourceUrl).toBe('https://www.artic.edu/artworks/801');
    expect(urls[0]).toContain('is_public_domain%5D=true');
  });

  it('normalizes Cleveland Museum images only with exact CC0 status and trusted asset hosts', () => {
    const window = loadSourcebook();
    const normalize = window.SourcebookProviders.normalizeCmaArtwork;
    const records = [
            {
              id: 901,
              share_license_status: 'CC0',
              title: 'Woven Textile Fragment',
              creation_date: '1700s',
              creators: [{ description: 'Example Weaver (French, 18th century)' }],
              technique: 'silk and metallic thread',
              type: 'Textile',
              department: 'Textiles',
              tombstone: 'A woven textile fragment with a repeating floral pattern.',
              url: 'https://clevelandart.org/art/1920.1',
              images: {
                web: { url: 'https://openaccess-cdn.clevelandart.org/1920.1/1920.1_web.jpg' },
                print: { url: 'https://openaccess-cdn.clevelandart.org/1920.1/1920.1_print.jpg' }
              }
            },
            {
              id: 902,
              share_license_status: 'Copyrighted',
              title: 'Restricted Textile',
              url: 'https://clevelandart.org/art/2020.2',
              images: { web: { url: 'https://openaccess-cdn.clevelandart.org/2020.2/2020.2_web.jpg' } }
            },
            {
              id: 903,
              share_license_status: 'CC0',
              title: 'Untrusted Image Host',
              url: 'https://clevelandart.org/art/1900.3',
              images: { web: { url: 'https://example.com/not-a-cma-image.jpg' } }
            },
            {
              id: 904,
              share_license_status: 'Other',
              title: 'Unclear Rights',
              url: 'https://clevelandart.org/art/1900.4',
              images: { web: { url: 'https://openaccess-cdn.clevelandart.org/1900.4/1900.4_web.jpg' } }
            }
    ];
    const results = records.map((record) => normalize(record, 'woven textile pattern', 'Patterns')).filter(Boolean);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'cma-live-901', provider: 'Cleveland Museum of Art', kind: 'Patterns',
      rightsType: 'pd', rightsShort: 'Public domain', live: true
    });
    expect(results[0].license).toMatch(/CC0 Open Access/i);
    expect(results[0].rightsMetadataSource).toContain('share_license_status=CC0');
    expect(results[0].sourceUrl).toBe('https://clevelandart.org/art/1920.1');
    expect(results[0].downloadUrl).toMatch(/_print\.jpg$/);
    expect(normalize({ ...records[0], id: 905, url: 'https://example.com/not-a-record' }, 'textile', 'Patterns')).toBeNull();
  });

  it('keeps a verified Cleveland CC0 shelf for offline fallback', () => {
    const window = loadSourcebook();
    const cma = Array.from(window.SourcebookProviders.materials).filter((item) => item.provider === 'Cleveland Museum of Art');
    expect(cma).toHaveLength(5);
    expect(new Set(cma.map((item) => item.kind))).toEqual(new Set(['Patterns', 'Botanical', 'Maps', 'Blueprints']));
    expect(cma.every((item) => item.rightsType === 'pd' && /CC0/i.test(item.license))).toBe(true);
    expect(cma.every((item) => /openaccess-cdn\.clevelandart\.org/.test(item.imageUrl))).toBe(true);
    expect(cma.every((item) => /_print\.jpg$/.test(item.downloadUrl))).toBe(true);
  });

  it('searches Cleveland Open Access live with the API rights and image gates enabled', async () => {
    const urls = [];
    const payload = {
      data: [{
        id: 910,
        share_license_status: 'CC0',
        title: 'Architectural Elevation',
        creation_date: '1910',
        creators: [{ description: 'Studio architect' }],
        type: 'Drawing',
        department: 'Drawings',
        tombstone: 'Measured architectural line drawing.',
        url: 'https://clevelandart.org/art/1910.10',
        images: {
          web: { url: 'https://openaccess-cdn.clevelandart.org/1910.10/1910.10_web.jpg' },
          print: { url: 'https://openaccess-cdn.clevelandart.org/1910.10/1910.10_print.jpg' }
        }
      }]
    };
    const window = loadSourcebook(async (url) => {
      urls.push(String(url));
      return { ok: true, json: async () => payload };
    });
    const results = Array.from(await window.SourcebookProviders.searchCma('architectural drawing', { kind: 'Blueprints', limit: 12 }));
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'cma-live-910', rightsType: 'pd', kind: 'Blueprints', live: true });
    expect(urls[0]).toContain('/artworks/?');
    expect(urls[0]).toContain('cc0');
    expect(urls[0]).toContain('has_image=1');
    expect(urls[0]).toContain('limit=12');
  });

  it('builds and safely normalizes multi-query discovery plans', () => {
    const window = loadSourcebook();
    const fallback = window.SourcebookProviders.buildDiscoveryPlan('quiet contour maps for a watershed lesson', 'Maps');
    expect(Array.from(fallback.queries)).toHaveLength(4);
    expect(fallback.paletteSize).toBe(6);
    expect(fallback.aiUsed).toBe(false);

    const normalized = window.SourcebookProviders.normalizeDiscoveryPlan(JSON.stringify({
      queries: ['historic watershed contour map', 'topographic relief line drawing', 'river basin survey sheet'],
      paletteSize: 'not-a-number',
      reason: 'Vary map scale and line density.'
    }), fallback.query, fallback.kind);
    expect(Array.from(normalized.queries)).toHaveLength(4);
    expect(normalized.paletteSize).toBe(6);
    expect(normalized.aiUsed).toBe(true);
  });

  it('ranks live candidates and auto-selects a provider-diverse rights-safe palette', () => {
    const window = loadSourcebook();
    const materials = Array.from(window.SourcebookProviders.materials);
    const candidates = [
      { ...materials[0], id: 'a', provider: 'Provider A', title: 'Unrelated botanical plate' },
      { ...materials[1], id: 'b', provider: 'Provider A', title: 'Contour watershed survey map' },
      { ...materials[2], id: 'c', provider: 'Provider B', title: 'Topographic contour lines' },
      { ...materials[3], id: 'd', provider: 'Provider C', title: 'Historic river basin chart' }
    ];
    const ranked = Array.from(window.SourcebookProviders.rankDiscovery(candidates, 'contour watershed map', 'Maps', 4));
    expect(ranked[0].id).toBe('b');
    const selected = Array.from(window.SourcebookProviders.selectDiscoveryPalette(ranked, 3));
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((item) => item.provider)).size).toBeGreaterThanOrEqual(2);

    const curated = window.SourcebookProviders.normalizeAiSelection(JSON.stringify({ ids: ['c', 'unknown', 'b'], reason: 'Linework variety.' }), ranked, 3);
    expect(Array.from(curated.items).map((item) => item.id).slice(0, 2)).toEqual(['c', 'b']);
    expect(curated.aiUsed).toBe(true);
    const safeFallback = window.SourcebookProviders.normalizeAiSelection(JSON.stringify({ ids: ['unknown'] }), ranked, 3);
    expect(safeFallback.aiUsed).toBe(false);
    expect(Array.from(safeFallback.items)).toHaveLength(3);
  });

  it('caches identical live provider searches briefly to respect anonymous rate limits', async () => {
    let requests = 0;
    const window = loadSourcebook(async () => {
      requests += 1;
      return { ok: true, json: async () => ({ data: [], config: { iiif_url: 'https://www.artic.edu/iiif/2' } }) };
    });
    const options = { provider: 'Art Institute of Chicago', rightsScope: 'pd', kind: 'Patterns' };
    await window.SourcebookProviders.searchOpen('woven ornament', options);
    await window.SourcebookProviders.searchOpen('woven ornament', options);
    expect(requests).toBe(1);
  });

  it('exports a portable provenance-rich palette for future consumers', () => {
    const window = loadSourcebook();
    const materials = Array.from(window.SourcebookProviders.materials);
    const ids = materials.slice(0, 2).map((item) => item.id);
    const manifest = window.SourcebookProviders.buildPalette(ids, { [ids[0]]: { mode: 'tile', tile: 120 } }, 'Lesson textures');
    expect(manifest.schema).toBe('org.owlflow.sourcebook-palette');
    expect(manifest.version).toBe(1);
    expect(manifest.assets).toHaveLength(2);
    expect(manifest.assets[0].preparation.mode).toBe('tile');
    expect(manifest.assets.every((asset) => asset.sourceUrl && asset.license && asset.rightsNote && asset.attribution)).toBe(true);
  });

  it('imports only Sourcebook manifests whose source domains and rights trail are verifiable', () => {
    const window = loadSourcebook();
    const items = Array.from(window.SourcebookProviders.materials).slice(0, 2);
    const manifest = window.SourcebookProviders.buildPalette(items.map((item) => item.id), {
      [items[0].id]: { mode: 'tile', tile: 120 }
    }, 'Imported geography set');
    const imported = window.SourcebookProviders.normalizePalette(manifest);
    expect(imported).toMatchObject({ schema: 'org.owlflow.sourcebook-palette', version: 1, title: 'Imported geography set' });
    expect(imported.assets).toHaveLength(2);
    expect(imported.assets.every((asset) => ['pd', 'cc0', 'ccby'].includes(asset.rightsType))).toBe(true);
    expect(imported.preparation[items[0].id]).toMatchObject({ mode: 'tile', tile: 120 });
    expect(window.SourcebookProviders.normalizePalette({ ...manifest, assets: [{ ...manifest.assets[0], sourceUrl: 'https://example.com/not-a-verified-source' }] })).toBeNull();
    expect(window.SourcebookProviders.normalizePalette({ ...manifest, assets: [{ ...manifest.assets[0], rightsType: 'unknown' }] })).toBeNull();
    expect(window.SourcebookProviders.normalizePalette({ ...manifest, schema: 'other.schema' })).toBeNull();
  });

  it('builds a rights-checked Page Designer handoff with preparation and provenance', () => {
    const window = loadSourcebook();
    const item = Array.from(window.SourcebookProviders.materials)[0];
    const artwork = window.SourcebookProviders.buildPageDesignerArtwork(
      item,
      { mode: 'crop', zoom: 145, x: 25, y: 80 },
      'data:image/png;base64,AAAA'
    );
    expect(artwork).toMatchObject({
      sourceTool: 'sourcebook',
      assetId: item.id,
      provider: item.provider,
      sourceUrl: item.sourceUrl,
      license: item.license,
      rightsType: item.rightsType,
      preparation: { mode: 'crop', zoom: 145, x: 25, y: 80, tile: 180 }
    });
    expect(artwork.attribution).toContain(item.sourceUrl);
    expect(window.SourcebookProviders.buildPageDesignerArtwork(item, { mode: 'crop', x: 0, y: 0 }, 'data:image/png;base64,AAAA').preparation).toMatchObject({ x: 0, y: 0 });
    expect(window.SourcebookProviders.buildPageDesignerArtwork({ ...item, rightsType: 'unknown' }, {}, 'data:image/png;base64,AAAA')).toBeNull();
    expect(window.SourcebookProviders.buildPageDesignerArtwork(item, {}, 'https://example.com/image.png')).toBeNull();
  });

  it('resolves curated Commons redirects through the official API before embedding', async () => {
    const requests = [];
    const window = loadSourcebook(async (url) => {
      requests.push(String(url));
      return {
        ok: true,
        json: async () => ({
          query: { pages: [{ imageinfo: [{ thumburl: 'https://upload.wikimedia.org/resolved-contour.png' }] }] }
        })
      };
    });
    const item = Array.from(window.SourcebookProviders.materials).find((asset) => asset.provider === 'Wikimedia Commons');
    await expect(window.SourcebookProviders.resolveFetchableImageUrl(item)).resolves.toBe('https://upload.wikimedia.org/resolved-contour.png');
    expect(requests[0]).toContain('commons.wikimedia.org/w/api.php');
    expect(requests[0]).toContain('origin=*');
    expect(requests[0]).toContain('iiurlwidth=1400');
  });

  it('builds a self-contained prepared source package with its rights trail', () => {
    const window = loadSourcebook();
    const item = Array.from(window.SourcebookProviders.materials)[0];
    const dataUrl = 'data:image/png;base64,AAAA';
    const html = window.SourcebookProviders.buildSourcePackage(item, { mode: 'tile', tile: 140 }, dataUrl);
    expect(window.SourcebookProviders.version).toBe(10);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain(`<img src="${dataUrl}"`);
    expect(html).toContain('download="contour-map-line-drawing.png"');
    expect(html).toContain('Repeat / tile at 140 px');
    expect(html).toContain(item.license);
    expect(html).toContain(item.sourceUrl);
    expect(html).toContain('Credit and provenance');
    expect(html).not.toContain('<script');
    expect(window.SourcebookProviders.buildSourcePackage({ ...item, rightsType: 'unknown' }, {}, dataUrl)).toBe('');
    expect(window.SourcebookProviders.buildSourcePackage(item, {}, 'data:image/png;base64,AAAA&quot; onerror=alert(1)')).toBe('');
  });

  it('builds an offline-friendly prepared palette package with every rights trail intact', () => {
    const window = loadSourcebook();
    const items = Array.from(window.SourcebookProviders.materials).slice(0, 2);
    const images = {
      [items[0].id]: 'data:image/png;base64,AAAA',
      [items[1].id]: 'data:image/jpeg;base64,BBBB'
    };
    const preparation = {
      [items[0].id]: { mode: 'tile', tile: 125 },
      [items[1].id]: { mode: 'crop', zoom: 135, x: 30, y: 70 }
    };
    const html = window.SourcebookProviders.buildPalettePackage(items, preparation, 'Map study sources', images);
    const credits = window.SourcebookProviders.buildPaletteCredits(items);
    expect(html).toContain('data-sourcebook-schema="org.owlflow.sourcebook-palette-package"');
    expect(html).toContain('2 prepared visual assets');
    expect(html).toContain('Repeat / tile at 125 px');
    expect(html).toContain('Crop at 135% zoom, focus 30% horizontal / 70% vertical');
    expect(html).toContain(`download="contour-map-line-drawing.png"`);
    expect(html).toContain('data:image/jpeg;base64,BBBB');
    expect(items.every((item) => html.includes(item.license) && html.includes(item.sourceUrl))).toBe(true);
    expect(credits).toContain(items[0].title);
    expect(credits).toContain(`\n\n2. ${items[1].creator}`);
    expect(html).not.toContain('<script');
    expect(window.SourcebookProviders.buildPalettePackage([{ ...items[0], rightsType: 'unknown' }], {}, 'Unsafe', images)).toBe('');
    expect(window.SourcebookProviders.buildPalettePackage(items, {}, 'Incomplete', { [items[0].id]: images[items[0].id] })).toBe('');
    expect(window.SourcebookProviders.buildPalettePackage([items[0]], {}, 'Malformed', { [items[0].id]: 'data:image/png;base64,AAAA" onerror=alert(1)' })).toBe('');
  });

  it('supports two-axis crop preparation and attribution copying in the UI', () => {
    expect(pluginSource).toContain("'aria-label': 'Horizontal crop focus'");
    expect(pluginSource).toContain("'aria-label': 'Vertical crop focus'");
    expect(pluginSource).toContain("'Copy credit'");
    expect(pluginSource).toContain("'Open in Page Designer'");
    expect(pluginSource).toContain("'Download source package'");
    expect(pluginSource).toContain("'Download package'");
    expect(pluginSource).toContain("'Copy credits'");
    expect(pluginSource).toContain("'Rights check passed:'");
    expect(pluginSource).toContain("'Import .json'");
    expect(pluginSource).toContain('FileReader');
    expect(pluginSource).toContain("'Find & build palette'");
    expect(pluginSource).toContain("'Auto-build palette'");
    expect(pluginSource).toContain("ctx.generateText");
    expect(pluginSource).toContain("'Federated public collections'");
    expect(pluginSource).toContain('lg:overflow-y-auto');
    expect(pluginSource).toContain("tabIndex: 0");
    expect(pluginSource).toContain("'aria-label': 'Selected source details and preparation controls'");
  });

  it('routes the prepared asset through the existing host handoff and retains its credit in Page Designer', () => {
    const appSource = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
    const studioSource = fs.readFileSync(path.join(root, 'studio_module.js'), 'utf8');
    expect(appSource).toContain("setAlloStudioInitialAction('insert-visual-asset')");
    expect(appSource).toContain('attribution: String(artwork.attribution');
    expect(studioSource).toContain("template: isSourcebook ? 'sourcebook-asset' : 'artstudio-artwork'");
    expect(studioSource).toContain("origin: 'stem-sourcebook-credit'");
    expect(studioSource).toContain('Sourcebook asset added with its source and reuse information');
  });

  it('is reachable from the loader, catalog, fallback renderer, and build mirror', () => {
    const appSource = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
    const hubSource = fs.readFileSync(path.join(root, 'stem_lab', 'stem_lab_module.js'), 'utf8');
    const buildSource = fs.readFileSync(path.join(root, 'build.js'), 'utf8');
    expect(appSource).toContain("'stem_lab/stem_tool_sourcebook.js'");
    expect(appSource).toContain('function normalizedToolKey(value)');
    expect(hubSource).toContain("id: 'sourcebook'");
    expect(hubSource).toContain('sourcebook: true');
    expect(buildSource).toContain("'stem_lab/stem_tool_sourcebook.js'");
  });
});
