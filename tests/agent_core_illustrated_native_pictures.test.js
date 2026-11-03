// Owner decision 2026-11-02: the illustrated AlloPack profile accepts memory-card
// pictures (memory-aid data.cards[i].visualImage + visualAlt/visualAltSource/visualNeedsReview)
// and applied-challenge pictures (data.visual.image + data.visual.alt), with the same
// raster, budget and alt checks the native profile applies. Invalid pictures stay rejected.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const media = require('../agent_core_pack_media_module.js');
const service = require('../agent_core_resource_pack_module.js');
const publicMedia = readFileSync('desktop/web-app/public/agent_core_pack_media_module.js');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAFElEQVR4AWIymXH7PwgzMUABnAEAAAD//4int4EAAAAGSURBVAMAdREFU3hyBowAAAAASUVORK5CYII=';
const water = () => JSON.parse(readFileSync('allopacks/current/water_cycle_grade6.allopack.json', 'utf8').replace(/^﻿/, ''));
const memoryAt = (pack) => {
  const index = pack.history.findIndex((item) => item.type === 'memory-aid');
  const card = pack.history[index].data.cards.findIndex((c) => typeof c.visualImage === 'string' && c.visualImage.startsWith('data:image/'));
  return { index, card, path: `pack.history[${index}].data.cards[${card}].visualImage`, owner: pack.history[index].data.cards[card], key: 'visualImage' };
};
const challengeAt = (pack) => {
  const index = pack.history.findIndex((item) => item.type === 'applied-challenge' && item.data.visual && item.data.visual.image);
  return { index, path: `pack.history[${index}].data.visual.image`, owner: pack.history[index].data.visual, key: 'image' };
};
const illustrated = { profile: 'illustrated' };

describe('illustrated profile accepts memory-card and challenge pictures', () => {
  it('the published Water Cycle pack carries both picture kinds', () => {
    const pack = water();
    expect(memoryAt(pack).card).toBeGreaterThanOrEqual(0);
    expect(challengeAt(pack).index).toBeGreaterThanOrEqual(0);
  });

  it('validates the published Water Cycle pack under illustrated via the media module (default and explicit profile)', () => {
    const pack = water();
    for (const report of [media.validatePackMedia(pack), media.validatePackMedia(pack, illustrated)]) {
      expect(report.ok, JSON.stringify(report.errors)).toBe(true);
      expect(report.errors.map((e) => e.code)).not.toContain('unsupported-image-placement');
    }
    const slots = media.getImageSlots(pack, illustrated).map((s) => s.path);
    expect(slots).toContain(memoryAt(pack).path);
    expect(slots).toContain(challengeAt(pack).path);
  });

  it('validates, previews and exports the published Water Cycle pack under illustrated via the resource-pack service', () => {
    const pack = water();
    const before = structuredClone(pack);
    const validated = service.validatePack(pack, illustrated);
    expect(validated.ok, JSON.stringify(validated.errors)).toBe(true);
    expect(validated.value).toEqual(before);
    expect(service.previewPack(pack, illustrated).ok).toBe(true);
    const exported = service.exportPack(pack, illustrated);
    expect(exported.ok, JSON.stringify(exported.errors)).toBe(true);
    expect(JSON.parse(exported.json)).toEqual(before);
  });

  it('the web-app public mirror carries the same rule', () => {
    expect(publicMedia.equals(readFileSync('agent_core_pack_media_module.js'))).toBe(true);
  });
});

describe('illustrated profile still rejects invalid memory-card and challenge pictures', () => {
  const bad = [
    ['remote URL', 'https://example.invalid/picture.png', 'unsupported-image-source'],
    ['non-image data', 'data:text/plain;base64,aGVsbG8=', 'unsupported-image-source'],
    ['SVG', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=', 'unsupported-image-source'],
    ['GIF (native-only format)', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'unsupported-image-source'],
    ['corrupt PNG', 'data:image/png;base64,iVBORw0KGgoAAAAN', null],
  ];
  for (const [where, locate] of [['memory-card visualImage', memoryAt], ['challenge data.visual.image', challengeAt]]) {
    it.each(bad)(`rejects a %s in ${where}`, (_label, value, code) => {
      const pack = water();
      const at = locate(pack);
      at.owner[at.key] = value;
      for (const report of [media.validatePackMedia(pack, illustrated), service.validatePack(pack, illustrated)]) {
        expect(report.ok).toBe(false);
        const here = report.errors.filter((e) => e.path === at.path);
        expect(here.length, JSON.stringify(report.errors)).toBeGreaterThan(0);
        if (code) expect(here.map((e) => e.code)).toContain(code);
      }
    });
  }

  it('requires a meaningful description for both picture kinds', () => {
    const pack = water();
    const memory = memoryAt(pack), challenge = challengeAt(pack);
    memory.owner.visualAlt = '';
    challenge.owner.alt = '   ';
    const found = media.validatePackMedia(pack, illustrated).errors.map((e) => e.code + ' ' + e.path);
    expect(found).toContain('invalid-image-alt ' + memory.path.replace(/visualImage$/, 'visualAlt'));
    expect(found).toContain('invalid-image-alt ' + challenge.path.replace(/image$/, 'alt'));
  });

  it('checks the memory-card review flag and challenge reviewed flag types', () => {
    const pack = water();
    memoryAt(pack).owner.visualNeedsReview = 'yes';
    challengeAt(pack).owner.reviewed = 'yes';
    const found = media.validatePackMedia(pack, illustrated).errors.map((e) => e.code);
    expect(found.filter((c) => c === 'invalid-visual-review')).toHaveLength(2);
  });

  it('applies the per-image size budget to these fields', () => {
    const pack = water();
    const at = memoryAt(pack);
    const report = media.validatePackMedia(pack, { ...illustrated, maxImageBytes: 8 });
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.path === at.path)).toBe(true);
  });

  it('does not open other fields: a picture in memory-card imageUrl or an unknown key stays an unsupported placement', () => {
    const pack = water();
    const at = memoryAt(pack);
    at.owner.imageUrl = PNG;
    challengeAt(pack).owner.extraPicture = PNG;
    const found = media.validatePackMedia(pack, illustrated).errors.map((e) => e.code + ' ' + e.path);
    expect(found).toContain('unsupported-image-placement ' + at.path.replace(/visualImage$/, 'imageUrl'));
    expect(found).toContain('unsupported-image-placement ' + challengeAt(pack).path.replace(/image$/, 'extraPicture'));
  });
});
