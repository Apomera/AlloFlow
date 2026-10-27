import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const media = require('../agent_core_pack_media_module.js');
const service = require('../agent_core_resource_pack_module.js');
const native = { profile: 'native' };
const codes = report => report.errors.map(error => error.code);
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function crc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length); out.write(type, 4); data.copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, -4)), out.length - 4);
  return out;
}
const compressedRows = new Map();
// Genuine, complete 1-bit palette PNGs with matching zlib scanlines, dimensions,
// and checksums. Only their bounded containers are inspected. Never render or
// decode the aggregate attack fixture into RGBA pixels in this test.
function png(width = 1, height = 1, shade = 0) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 1; header[9] = 3;
  const key = `${width}x${height}`;
  if (!compressedRows.has(key)) compressedRows.set(key, deflateSync(Buffer.alloc((Math.ceil(width / 8) + 1) * height), { level: 9 }));
  return 'data:image/png;base64,' + Buffer.concat([signature, chunk('IHDR', header),
    chunk('PLTE', Buffer.from([shade, shade, shade, 255 - shade, 255 - shade, 255 - shade])),
    chunk('IDAT', compressedRows.get(key)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
const smallPng = png();
const gifSingle = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
function gif(frameCount, canvas = 1) {
  // Each valid GIF frame paints one pixel within the full logical canvas. This
  // also catches undercounting tiny subframes on a much larger canvas.
  const header = Buffer.from(gifSingle.subarray(0, 19));
  header.writeUInt16LE(canvas, 6); header.writeUInt16LE(canvas, 8);
  return 'data:image/gif;base64,' + Buffer.concat([header,
    ...Array.from({ length: frameCount }, () => gifSingle.subarray(19, -1)), Buffer.from([59])]).toString('base64');
}
const panel = (image, extra = {}) => ({ imageUrl: image, alt: 'A plain grayscale test image.', altSource: 'author', altHash: media.hashImage(image), ...extra });
const pack = panels => ({ allopack: { spec: '0.1', title: 'Media boundary fixture', language: 'English', gradeLevel: '6', createdAt: '2026-10-23' },
  sourceTopic: 'Media boundary fixture', history: [{ id: 'visual', title: 'Fixture', type: 'image', meta: '', data: { visualPlan: { panels } } }] });
const animation = (count, canvas = 1, still = smallPng) => panel(gif(count, canvas), { type: 'process_animation',
  altHash: media.hashImage(still), frames: Array(count).fill(still), motionPrompt: 'A single pixel is shown in each frame.',
  motionSteps: Array(count - 1).fill('The pixel remains visible.'), fps: 3, frameWidth: canvas, frameHeight: canvas });

describe('AlloPack aggregate decoded-media budgets', () => {
  it('rejects 256 unique complete 4096-square images despite small encoded size', () => {
    const value = pack(Array.from({ length: 256 }, (_, i) => panel(png(4096, 4096, i))));
    expect(JSON.stringify(value).length).toBeLessThan(800000);
    for (const profile of ['illustrated', 'native']) {
      const report = service.validatePack(value, { profile });
      expect(report.ok).toBe(false);
      expect(codes(report)).toContain('pack-media-pixels-exceeded');
      expect(report.media).toMatchObject({ placements: 256, uniqueImages: 256, pixels: 4294967296 });
      expect(report.media.decodedBytes).toBeLessThan(media.LIMITS.maxTotalBytes);
    }
  });

  it('accepts the exact pixel boundary and charges identical repeated placements', () => {
    const large = png(4096, 4096), atLimit = pack([panel(large), panel(large)]);
    const report = media.validatePackMedia(atLimit, native);
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
    expect(report.stats).toMatchObject({ pixels: media.LIMITS.maxTotalPixels, uniqueImages: 1, placements: 2 });
    atLimit.history[0].data.visualPlan.panels.push(panel(smallPng));
    expect(codes(media.validatePackMedia(atLimit, native))).toContain('pack-media-pixels-exceeded');
  });

  it('charges every encoded GIF canvas and each separate preserved frame', () => {
    const largeStill = png(2048, 2048), value = pack([animation(2, 2048, largeStill), animation(2, 2048, largeStill)]);
    expect(media.inspectDataImage(gif(2, 2048), native)).toMatchObject({ ok: true, pixels: 8388608, frames: 2 });
    const report = media.validatePackMedia(value, native);
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
    expect(report.stats).toMatchObject({ pixels: 33554432, animationFrames: 8, uniqueImages: 2 });
    value.history[0].data.visualPlan.panels.push(animation(2, 2048, largeStill));
    expect(codes(media.validatePackMedia(value, native))).toContain('pack-media-pixels-exceeded');
  });

  it('preserves a bounded sixty-frame animation and caps animation work across panels', () => {
    const value = pack([animation(60)]), report = media.validatePackMedia(value, native);
    expect(report.ok, JSON.stringify(report.errors)).toBe(true);
    expect(report.stats).toMatchObject({ pixels: 120, animationFrames: 120, uniqueImages: 2 });
    value.history[0].data.visualPlan.panels.push(animation(60));
    expect(codes(media.validatePackMedia(value, native))).toContain('pack-animation-budget-exceeded');
    expect(media.validatePackMedia(value, native).stats.animationFrames).toBe(240);
  });

  it('uses encoded GIF frames and actual raster dimensions when metadata understates either', () => {
    const item = animation(60); item.frames = [smallPng, smallPng]; item.motionSteps = ['The pixel stays visible.'];
    const report = media.validatePackMedia(pack([item]), { ...native, maxTotalAnimationFrames: 61 });
    expect(codes(report)).toEqual(expect.arrayContaining(['animation-frame-count-mismatch', 'pack-animation-budget-exceeded']));
    expect(report.stats.animationFrames).toBe(62);
    const large = animation(2, 2048, png(2048, 2048)); large.frameWidth = 1; large.frameHeight = 1;
    const pixels = media.validatePackMedia(pack([large]), { ...native, maxTotalPixels: 16777215 });
    expect(codes(pixels)).toEqual(expect.arrayContaining(['animation-canvas-mismatch', 'pack-media-pixels-exceeded']));
    expect(pixels.stats.pixels).toBe(16777216);
  });

  it('allows options to tighten but never raise pixel or animation limits', () => {
    expect(media.validatePackMedia(pack([panel(smallPng)]), { ...native, maxTotalPixels: 1 }).ok).toBe(true);
    expect(codes(media.validatePackMedia(pack([panel(smallPng), panel(smallPng)]), { ...native, maxTotalPixels: 1 }))).toContain('pack-media-pixels-exceeded');
    expect(codes(media.validatePackMedia(pack([animation(2)]), { ...native, maxTotalAnimationFrames: 3 }))).toContain('pack-animation-budget-exceeded');
    for (const attemptedCap of [Number.MAX_SAFE_INTEGER, Infinity, NaN, -1, '999999999']) {
      expect(codes(media.validatePackMedia(pack([panel(png(4096, 4096)), panel(png(4096, 4096)), panel(smallPng)]), { ...native, maxTotalPixels: attemptedCap }))).toContain('pack-media-pixels-exceeded');
      expect(codes(media.validatePackMedia(pack([animation(60), animation(60)]), { ...native, maxTotalAnimationFrames: attemptedCap }))).toContain('pack-animation-budget-exceeded');
    }
    expect(codes(media.inspectDataImage(gif(61), { ...native, maxAnimationFrames: Number.MAX_SAFE_INTEGER }))).toContain('animation-budget-exceeded');
  });

  it('includes saved originals and annotation overrides in the same placement budget', () => {
    const image = png(4096, 4096), value = pack([panel(image, { originalImage: panel(image) })]);
    value.history[0].data.annotations = { imageOverrides: { 0: smallPng } };
    value.history[0].data.visualPlan.panels[0].altHash = media.hashImage(smallPng);
    const report = media.validatePackMedia(value, native);
    expect(codes(report)).toContain('pack-media-pixels-exceeded');
    expect(report.stats).toMatchObject({ placements: 3, uniqueImages: 2, pixels: 33554433 });
  });

  it('publishes the caps through capabilities and keeps the browser mirror exact', () => {
    for (const profile of ['illustrated', 'native']) expect(service.getCapabilities(profile).limits.media).toMatchObject({ maxTotalPixels: 33554432, maxTotalAnimationFrames: 120 });
    expect(readFileSync('desktop/web-app/public/agent_core_pack_media_module.js', 'utf8')).toBe(readFileSync('agent_core_pack_media_module.js', 'utf8'));
  });

  it('preserves Katie’s visual bytes and accepts the established canonical/illustrated corpus', () => {
    // Katie's 24 images were split on 2026-10-25 between the core pack (15 placements) and
    // Thinking Together: More Practice (23, including a copy of the cue chart). Together they
    // must still hold every one of the 24 distinct images.
    const katie = { academic_discourse_reading_space_grade6: [15, 11, 6000000, 7500000], academic_discourse_more_practice_grade6: [23, 19, 10000000, 12000000] };
    const katieImages = new Set();
    for (const directory of ['allopacks', 'allopacks/illustrated']) {
      for (const filename of readdirSync(directory).filter(name => name.endsWith('.allopack.json'))) {
        const value = JSON.parse(readFileSync(`${directory}/${filename}`, 'utf8').replace(/^\uFEFF/, ''));
        const before = JSON.stringify(value), report = media.validatePackMedia(value, native);
        expect(report.ok, `${directory}/${filename}: ${JSON.stringify(report.errors)}`).toBe(true);
        expect(JSON.stringify(value)).toBe(before);
        const expected = directory === 'allopacks' && katie[filename.replace(/\.allopack\.json$/, '')];
        if (expected) {
          const [placements, unique, minPixels, maxPixels] = expected;
          expect(report.stats.placements, filename).toBe(placements);
          expect(report.stats.uniqueImages, filename).toBe(unique);
          expect(report.stats.pixels, filename).toBeGreaterThan(minPixels);
          expect(report.stats.pixels, filename).toBeLessThan(maxPixels);
          for (const m of before.matchAll(/"(data:image\/[^"]+)"/g)) katieImages.add(m[1]);
        }
      }
    }
    expect(katieImages.size).toBe(24);
  }, 30000);
});
