import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const media = require('../agent_core_pack_media_module.js');
// Real 2 x 3 blue raster images, generated and decoded in Chromium. JPEG APP2
// and WebP ICCP profiles were removed; the resulting fixtures were decoded again.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAFElEQVR4AWIymXH7PwgzMUABnAEAAAD//4int4EAAAAGSURBVAMAdREFU3hyBowAAAAASUVORK5CYII=';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAADAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAACP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgEKNj/2Q==';
const WEBP = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAADwAQCdASoCAAMAAUAmJaACdLoB+AAFQIAAm//PTNeYP8nP/qcfk4/Jx/WUAAAA';
// A real lossless 1 x 1 WebP, also decoded successfully in Chromium.
const WEBP_LOSSLESS = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
const bytes = url => Buffer.from(url.split(',')[1], 'base64');
const url = (mime, data) => 'data:' + mime + ';base64,' + data.toString('base64');
const codes = report => report.errors.map(e => e.code);
const row = (kind, image = PNG, overrides = {}) => {
  const f = media.IMAGE_FIELDS[kind];
  return { [f.image]: image, [f.alt]: 'A blue rectangle fills the frame.', [f.hash]: media.hashImage(image), [f.source]: 'vision', [f.decorative]: false, ...overrides };
};
const pack = (...rows) => ({ history: [{ id: 'glossary', type: 'glossary', data: rows.length ? rows : [row('glossary')] }] });

describe('native AlloPack raster media boundary', () => {
  it.each([['PNG', PNG], ['JPEG', JPEG], ['WebP', WEBP]])('accepts a real complete %s fixture', (_, data) => {
    expect(media.inspectDataImage(data)).toMatchObject({ ok: true, errors: [], width: 2, height: 3, decodedBytes: bytes(data).length, animated: false });
  });

  it('works without Node globals and matches the renderer’s current alt hash', () => {
    const browser = { window: { React: {}, AlloModules: {} }, console: { log() {}, error() {} } };
    vm.runInNewContext(fs.readFileSync('agent_core_pack_media_module.js', 'utf8'), browser);
    vm.runInNewContext(fs.readFileSync('alt_text_module.js', 'utf8'), browser);
    const api = browser.window.AlloModules.AgentCorePackMedia;
    for (const image of [PNG, JPEG, WEBP, WEBP.repeat(90)]) expect(api.hashImage(image)).toBe(browser.window.AlloModules.AltText.hashImage(image));
    expect(api.validatePackMedia(pack()).ok).toBe(true);
  });

  it('rejects MIME disguises, SVG, URLs, non-images, and invalid base64', () => {
    expect(codes(media.inspectDataImage(PNG.replace('image/png', 'image/jpeg')))).toContain('invalid-raster-image');
    for (const input of ['https://example.test/a.png', 'file:///a.png', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/gif;base64,R0lGODlh', null]) expect(media.inspectDataImage(input).ok).toBe(false);
    for (const b64 of ['AAAA=', 'A===', 'AB==', 'AAB=', '!!!!', 'AAAA$AAA', '']) expect(codes(media.inspectDataImage('data:image/png;base64,' + b64))).toContain('invalid-image-base64');
    const wrapped = PNG.replace(/,(.+)/, (_, b64) => ',' + b64.match(/.{1,40}/g).join('\r\n'));
    expect(media.inspectDataImage(wrapped).ok).toBe(true);
  });

  it('rejects corrupt/truncated PNG chunks and JPEG/WebP containers', () => {
    const png = bytes(PNG); png[45] ^= 1;
    expect(codes(media.inspectDataImage(url('image/png', png)))).toContain('invalid-raster-image');
    for (const image of [PNG, JPEG, WEBP]) {
      const mime = image.slice(5, image.indexOf(';'));
      expect(media.inspectDataImage(url(mime, bytes(image).subarray(0, -2))).ok).toBe(false);
      expect(media.inspectDataImage(url(mime, Buffer.concat([bytes(image), Buffer.from([0])]))).ok).toBe(false);
    }
    const jpeg = bytes(JPEG); jpeg.writeUInt16BE(65535, 4);
    expect(media.inspectDataImage(url('image/jpeg', jpeg)).ok).toBe(false);
    const webp = bytes(WEBP); webp.writeUInt32LE(0, 16);
    expect(media.inspectDataImage(url('image/webp', webp)).ok).toBe(false);
  });

  it('accepts lossless and extended still WebP and rejects animation/dimension mismatches', () => {
    expect(media.inspectDataImage(WEBP_LOSSLESS)).toMatchObject({ ok: true, width: 1, height: 1 });
    const base = bytes(WEBP), extension = Buffer.alloc(18);
    extension.write('VP8X', 0); extension.writeUInt32LE(10, 4);
    extension.writeUIntLE(1, 12, 3); extension.writeUIntLE(2, 15, 3);
    const extended = Buffer.concat([base.subarray(0, 12), extension, base.subarray(12)]);
    extended.writeUInt32LE(extended.length - 8, 4);
    expect(media.inspectDataImage(url('image/webp', extended))).toMatchObject({ ok: true, width: 2, height: 3 });
    extended[20] = 2;
    expect(codes(media.inspectDataImage(url('image/webp', extended)))).toContain('animated-image-unsupported');
    extended[20] = 0; extended[24] = 2;
    expect(codes(media.inspectDataImage(url('image/webp', extended)))).toContain('invalid-raster-image');
    const lossless = bytes(WEBP_LOSSLESS); lossless[24] |= 32;
    expect(codes(media.inspectDataImage(url('image/webp', lossless)))).toContain('invalid-raster-image');
  });

  it('enforces dimensions before raster decoding and cannot loosen published limits', () => {
    expect(codes(media.inspectDataImage(PNG, { maxDimension: 1 }))).toContain('image-dimensions-exceeded');
    expect(codes(media.inspectDataImage(PNG, { maxPixels: 5 }))).toContain('image-dimensions-exceeded');
    const big = bytes(WEBP); big.writeUInt16LE(4097, 26);
    expect(codes(media.inspectDataImage(url('image/webp', big), { maxDimension: 999999 }))).toContain('image-dimensions-exceeded');
    expect(codes(media.inspectDataImage('data:image/png;base64,' + 'A'.repeat(1333340), { maxImageBytes: 9999999 }))).toContain('image-too-large');
  });

  it('counts repeated placements against budgets while inspecting unique data once', () => {
    const p = pack(row('glossary'), row('glossary'));
    expect(media.validatePackMedia(p).stats).toMatchObject({ placements: 2, uniqueImages: 1, decodedBytes: bytes(PNG).length * 2, encodedChars: PNG.length * 2, pixels: 12 });
    expect(codes(media.validatePackMedia(p, { maxTotalBytes: bytes(PNG).length }))).toContain('pack-media-too-large');
    expect(codes(media.validatePackMedia(p, { maxPlacements: 1 }))).toContain('too-many-image-placements');
    expect(codes(media.inspectDataImage(PNG, { maxImageBytes: bytes(PNG).length - 1 }))).toContain('image-too-large');
  });

  it('validates all native image slots without changing metadata or image bytes', () => {
    const p = { history: [
      { id: 'words', type: 'glossary', data: [row('glossary')] },
      { id: 'sort', type: 'concept-sort', data: { items: [row('sort', JPEG)] } },
      { id: 'anchor', type: 'anchor-chart', data: { sections: [row('anchor', WEBP)] } },
      { id: 'time', type: 'timeline', data: { items: [row('timeline')] } },
      { id: 'single', type: 'image', data: row('single', JPEG) },
      { id: 'panels', type: 'image', data: { visualPlan: { panels: [row('panel', WEBP)] } } },
    ] };
    const before = JSON.stringify(p), report = media.validatePackMedia(p);
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
    expect(report.stats.placements).toBe(6);
    expect(media.getImageSlots(p).map(s => [s.kind, s.resourceId])).toEqual([['glossary', 'words'], ['sort', 'sort'], ['anchor', 'anchor'], ['timeline', 'time'], ['single', 'single'], ['panel', 'panels']]);
    expect(JSON.stringify(p)).toBe(before);
    expect(report.warnings.map(w => w.code)).toContain('image-visual-review-required');
  });

  it('requires useful alt metadata and a current renderer hash for informative image slots', () => {
    for (const fields of [{ imageAlt: '' }, { imageAlt: 'x'.repeat(251) }, { imageAltHash: '' }, { imageAltHash: media.hashImage(JPEG) }, { imageDecorative: 'true' }, { imageAltSource: 'verified-by-magic' }]) expect(media.validatePackMedia(pack(row('glossary', PNG, fields))).ok).toBe(false);
    const planning = media.validatePackMedia(pack(row('glossary', PNG, { imageAltSource: 'planning' })));
    expect(planning.ok).toBe(true);
    expect(planning.warnings.map(w => w.code)).toContain('image-description-review-required');
  });

  it('reports object-valued image fields without coercing their prototype methods', () => {
    for (const value of [true, 1, [], {}, { toString: 'not callable' }, { toString: null, valueOf: null }]) {
      const p = pack(row('glossary', PNG, { image: value, imageAltHash: 'img-stale' }));
      let report;
      expect(() => { report = media.validatePackMedia(p); }).not.toThrow();
      expect(codes(report)).toContain('invalid-image-value');
      expect(media.hashImage(value)).toBe('');
    }
    const p = JSON.parse(JSON.stringify(pack()));
    p.extra = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}');
    expect(media.validatePackMedia(p).ok).toBe(true);
    expect({}.polluted).toBeUndefined();
    const deep = pack(); let cursor = deep;
    for (let i = 0; i < 20; i++) cursor = cursor.child = {};
    expect(codes(media.validatePackMedia(deep))).toContain('media-payload-too-deep');
  });

  it('respects explicit decorative images and existing anchor fields without a hash', () => {
    expect(media.validatePackMedia(pack(row('glossary', PNG, { imageDecorative: true, imageAlt: '', imageAltHash: '' }))).ok).toBe(true);
    const anchor = { iconUrl: PNG, iconAlt: 'A blue rectangle fills the frame.' };
    const p = { history: [{ id: 'anchor', type: 'anchor-chart', data: { sections: [anchor] } }] };
    expect(media.validatePackMedia(p).ok).toBe(true);
    anchor.iconAltHash = 'stale';
    expect(codes(media.validatePackMedia(p))).toContain('stale-image-alt');
  });

  it('does not allow images to hide in markdown, arbitrary fields, or remote native slots', () => {
    const p = pack(); p.notes = '![Hidden](' + PNG + ')';
    expect(codes(media.validatePackMedia(p))).toContain('unsupported-image-placement');
    const remote = pack(row('glossary', 'https://example.test/image.png'));
    expect(codes(media.validatePackMedia(remote))).toContain('unsupported-image-source');
    const unknown = pack(); unknown.history.push({ type: 'unknown', data: { imageUrl: PNG } });
    expect(codes(media.validatePackMedia(unknown))).toContain('unsupported-image-placement');
    const circular = pack(); circular.loop = circular;
    expect(codes(media.validatePackMedia(circular))).toContain('cyclic-media-payload');
  });

  it('accepts the established illustrated Water Cycle and native timeline assets', () => {
    for (const name of ['water_cycle_grade6', 'then_and_now_grade2', 'weather_vs_climate_grade5']) {
      const p = JSON.parse(fs.readFileSync('allopacks/illustrated/' + name + '.allopack.json', 'utf8').replace(/^\uFEFF/, ''));
      const report = media.validatePackMedia(p);
      expect(report.ok, name + ': ' + JSON.stringify(report.errors)).toBe(true);
      expect(report.stats.placements).toBeGreaterThan(20);
    }
  });
});
