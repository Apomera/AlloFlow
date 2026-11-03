import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const service = require('../agent_core_resource_pack_module.js');
const profile = { profile: 'illustrated' };
const readPack = (slug) => JSON.parse(readFileSync(`allopacks/current/${slug}.allopack.json`, 'utf8'));
// Published packs include memory-card (cards[].visualImage) and challenge (visual.image) pictures;
// since 2026-11-02 the illustrated profile accepts them with the native raster and alt checks.
const picturePaths = (pack) => pack.history.flatMap((item, index) =>
  item.type === 'memory-aid' ? item.data.cards.flatMap((card, c) => card.visualImage ? [{ index, card: c }] : [])
    : item.type === 'applied-challenge' && item.data.visual?.image ? [{ index }] : []);
const water = readPack('water_cycle_grade6');
const image = water.history.find((item) => item.type === 'glossary').data[0].image;
const altWindow = { AlloModules: {}, React: {} };
vm.runInNewContext(readFileSync('alt_text_module.js', 'utf8'), { window: altWindow, console: { log() {} } });
const { hashImage } = altWindow.AlloModules.AltText;

function glossaryPack() {
  const pack = structuredClone(water);
  const glossary = pack.history.find((item) => item.type === 'glossary');
  glossary.data = glossary.data.slice(0, 4);
  for (const term of glossary.data) {
    for (const key of ['image', 'imageAlt', 'imageAltSource', 'imageAltHash', 'imageDecorative']) delete term[key];
  }
  pack.history = [glossary];
  return pack;
}

describe('illustrated AlloPack service compatibility', () => {
  it.each(['water_cycle_grade6', 'crew_norms_grade6_8'])('accepts the memory-card and challenge pictures of the published %s pack', (slug) => {
    const pack = readPack(slug);
    const found = picturePaths(pack);
    expect(found.some((p) => p.card !== undefined)).toBe(true);
    expect(found.some((p) => p.card === undefined)).toBe(true);
    const result = service.validatePack(pack, profile);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.errors.map((e) => e.code)).not.toContain('unsupported-image-placement');
  });

  it.each([
    ['remote URL', 'https://example.invalid/picture.png', 'unsupported-image-source'],
    ['SVG data', 'data:image/svg+xml;base64,PHN2Zy8+', 'unsupported-image-source'],
    ['malformed base64', 'data:image/png;base64,not-valid-base64!', null],
  ])('still rejects a %s in memory-card and challenge picture fields', (_label, bad, code) => {
    for (const target of ['memory', 'challenge']) {
      const pack = structuredClone(water);
      const at = picturePaths(pack).find((p) => (target === 'memory') === (p.card !== undefined));
      const data = pack.history[at.index].data;
      if (target === 'memory') data.cards[at.card].visualImage = bad; else data.visual.image = bad;
      const result = service.validatePack(pack, profile);
      expect(result.ok, target).toBe(false);
      const path = target === 'memory' ? `pack.history[${at.index}].data.cards[${at.card}].visualImage` : `pack.history[${at.index}].data.visual.image`;
      expect(result.errors.some((e) => e.path === path && (!code || e.code === code)), target + ' ' + JSON.stringify(result.errors)).toBe(true);
    }
  });

  it('still requires a description for memory-card and challenge pictures', () => {
    const pack = structuredClone(water);
    const memory = picturePaths(pack).find((p) => p.card !== undefined);
    const challenge = picturePaths(pack).find((p) => p.card === undefined);
    pack.history[memory.index].data.cards[memory.card].visualAlt = '';
    pack.history[challenge.index].data.visual.alt = '';
    const codes = service.validatePack(pack, profile).errors.map((e) => e.code + ' ' + e.path);
    expect(codes).toContain(`invalid-image-alt pack.history[${memory.index}].data.cards[${memory.card}].visualAlt`);
    expect(codes).toContain(`invalid-image-alt pack.history[${challenge.index}].data.visual.alt`);
  });

  it.each(['water_cycle_grade6', 'crew_norms_grade6_8'])('round-trips the complete published %s pack without metadata loss', (slug) => {
    const pack = readPack(slug);
    const before = structuredClone(pack);
    const validated = service.validatePack(pack, profile);
    expect(validated.ok, JSON.stringify(validated.errors)).toBe(true);
    expect(validated.value).toEqual(before);
    expect(validated.value).not.toBe(pack);
    const preview = service.previewPack(pack, profile);
    expect(preview.ok, JSON.stringify(preview.errors)).toBe(true);
    expect(preview.resources.map(({ id, type }) => ({ id, type }))).toEqual(pack.history.map(({ id, type }) => ({ id, type })));
    const exported = service.exportPack(pack, profile);
    expect(exported.ok, JSON.stringify(exported.errors)).toBe(true);
    expect(JSON.parse(exported.json)).toEqual(before);
    expect(exported.json.length).toBeLessThanOrEqual(2000000);
    expect(pack).toEqual(before);
  });

  it('keeps embedded pictures opt-in while ordinary text authoring still passes', () => {
    const pack = glossaryPack();
    expect(service.validatePack(pack).ok).toBe(true);
    Object.assign(pack.history[0].data[0], { image, imageAlt: 'A puddle becomes smaller in two views of the same pavement.', imageAltHash: hashImage(image), imageAltSource: 'planning' });
    const textOnly = service.validatePack(pack);
    expect(textOnly.ok).toBe(false);
    expect(textOnly.errors.map((error) => error.code)).toContain('embedded-image-payload');
    expect(service.validatePack(pack, profile).ok).toBe(true);
  });

  it('does not silently treat an unknown profile as illustrated', () => {
    expect(service.validatePack(water, { profile: 'illustratedd' }).ok).toBe(false);
    expect(service.previewPack(water, { profile: 'illustratedd' }).ok).toBe(false);
    expect(service.exportPack(water, { profile: 'illustratedd' }).ok).toBe(false);
  });

  it.each(['prompt', 'imagePrompt', 'imagenPrompt'])('reports unfinished artwork for %s and clears that warning after attaching the image', (promptKey) => {
    const pack = glossaryPack();
    pack.history.push({ id: 'planned-panel', type: 'image', title: 'Observe water', data: { visualPlan: { panels: [{ [promptKey]: 'Compare a puddle over time.', caption: 'Look for what changes.' }] } } });
    const preview = service.previewPack(pack, profile);
    expect(preview.ok).toBe(true);
    expect(preview.warnings.some(w => w.code === 'image-slot-unfilled')).toBe(true);
    const result = service.attachImage(pack, { resourceId: 'planned-panel', slot: 'panel', index: 0, dataUrl: image, alt: 'Two pavement views show a shrinking puddle.' }, profile);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(service.previewPack(result.value, profile).warnings.some(w => w.code === 'image-slot-unfilled')).toBe(false);
    expect(result.value.history[1].data.visualPlan.panels[0].caption).toBe('Look for what changes.');
  });

  it('rejects object-valued image display text before it can reach the native React view', () => {
    const pack = glossaryPack();
    pack.history.push({ id: 'single', type: 'image', title: 'Water', data: { imageUrl: image, altText: 'A shrinking puddle.', prompt: { bad: 'Not a display string' } } });
    expect(service.validatePack(pack, profile)).toMatchObject({ ok: false, errors: expect.arrayContaining([expect.objectContaining({ path: 'pack.history[1].data.prompt' })]) });
    pack.history[1].data.prompt = 'Observe water.';
    pack.history[1].data.visualPlan = { title: { bad: true }, panels: [] };
    expect(service.validatePack(pack, profile)).toMatchObject({ ok: false, errors: expect.arrayContaining([expect.objectContaining({ path: 'pack.history[1].data.visualPlan.title' })]) });
    pack.history[1].data.visualPlan = { title: 'Water', layout: { bad: true }, panels: [] };
    expect(service.validatePack(pack, profile)).toMatchObject({ ok: false, errors: expect.arrayContaining([expect.objectContaining({ path: 'pack.history[1].data.visualPlan.layout' })]) });
  });

  it.each([
    ['image', (data) => { data.visualPlan.panels = 'not a list'; }],
    ['memory-aid', (data) => { data.cards = 'not a list'; }],
    ['applied-challenge', (data) => { data.brief = []; }],
  ])('checks the renderer shape of native %s resources', (type, damage) => {
    const pack = structuredClone(water);
    damage(pack.history.find((item) => item.type === type).data);
    const result = service.validatePack(pack, profile);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns validation errors for malformed memory card ids without coercing them', () => {
    const pack = structuredClone(water);
    pack.history.find(item => item.type === 'memory-aid').data.cards[0].id = { toString: 'not callable' };
    expect(() => service.validatePack(pack, profile)).not.toThrow();
    expect(service.validatePack(pack, profile).ok).toBe(false);
  });

  it('rejects animation frames and malformed panel roles instead of exporting hidden remote media or invalid React children', () => {
    const pack = structuredClone(water);
    const panel = pack.history.find(item => item.type === 'image').data.visualPlan.panels[0];
    panel.type = 'process_animation';
    panel.frames = ['https://example.invalid/frame.png'];
    expect(service.validatePack(pack, profile).errors.map(e => e.code)).toContain('unsupported-animation-profile');
    delete panel.type;
    panel.frames = { bad: true };
    expect(service.validatePack(pack, profile).errors.map(e => e.code)).toContain('unsupported-animation-profile');
    delete panel.frames;
    panel.role = { bad: 'React child' };
    expect(service.validatePack(pack, profile).ok).toBe(false);
  });

  it('rejects saved image-view overrides that would replace the validated artwork in the native renderer', () => {
    const pack = structuredClone(water);
    const resource = pack.history.find(item => item.type === 'image');
    resource.data.annotations = { imageOverrides: { 0: 'https://example.invalid/unreviewed.png' } };
    const original = structuredClone(pack);
    expect(service.validatePack(pack, profile).errors.map(e => e.code)).toContain('unsupported-image-annotations');
    expect(service.exportPack(pack, profile).ok).toBe(false);
    expect(pack).toEqual(original);
    delete resource.data.annotations;
    resource.data.visualPlan.panels[0].id = { toString: 'not callable' };
    expect(service.validatePack(pack, profile).errors.map(e => e.code)).toContain('invalid-panel-id');
  });

  it('authors native illustrated resources through the explicit compose profile', () => {
    const result = service.compose({
      requestId: 'illustrated-native-compose', title: 'Water exploration', sourceTopic: 'Water cycle',
      gradeLevel: '6th Grade', language: 'en', learningGoal: 'Explain water movement using visual evidence.',
      privacy: { confirmNoStudentPii: true, confirmSourcePermission: true },
      profile: 'illustrated', history: structuredClone(water.history),
    });
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    for (const original of water.history) {
      const created = result.value.history.find((item) => item.id === original.id);
      expect(created.data).toEqual(original.data);
      if (original.imageSlot !== undefined) expect(created.imageSlot).toEqual(original.imageSlot);
    }
    expect(service.exportPack(result.value, profile).ok).toBe(true);
  });

  it('preserves native original-image backups while rejecting hidden restore controls and malformed display text', () => {
    const pack = glossaryPack();
    const data = { imageUrl: image, altText: 'A shrinking puddle.', originalImage: {
      imageUrl: image, altText: 'Two views of a puddle.', altSource: 'author', altHash: hashImage(image),
      decorative: false, imageSource: 'author-upload', imageAttribution: null, imageCreditBand: 0,
      provenance: { author: 'Example educator' },
    } };
    pack.history.push({ id: 'restore-image', type: 'image', title: 'Water', data });
    const original = structuredClone(pack);
    expect(service.validatePack(pack, profile).ok).toBe(true);
    expect(JSON.parse(service.exportPack(pack, profile).json)).toEqual(original);
    for (const [key, value] of Object.entries({
      visualPlan: { panels: [{ prompt: 'a' }, { prompt: 'b' }] },
      annotations: { imageOverrides: { 0: 'https://example.invalid/restore.png' } },
      frames: ['https://example.invalid/frame.png'], originalImage: {}, labels: [], type: 'process_animation',
    })) {
      data.originalImage[key] = value;
      expect(service.validatePack(pack, profile)).toMatchObject({ ok: false, errors: expect.arrayContaining([
        expect.objectContaining({ code: 'unsupported-image-backup-state', path: `pack.history[1].data.originalImage.${key}` }),
      ]) });
      delete data.originalImage[key];
    }
    for (const key of ['prompt', 'title', 'caption']) {
      data.originalImage[key] = { bad: 'React child' };
      expect(service.exportPack(pack, profile).ok).toBe(false);
      delete data.originalImage[key];
    }
    data.originalImage = 'not an image backup';
    expect(service.validatePack(pack, profile).errors.map(e => e.code)).toContain('invalid-image-backup');
    data.originalImage = { altText: { bad: 'Unchecked metadata overlay' }, altSource: 'vision' };
    expect(service.validatePack(pack, profile)).toMatchObject({ ok: false, errors: expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-image-backup', path: 'pack.history[1].data.originalImage.imageUrl' }),
    ]) });
    data.originalImage = { imageUrl: '', altText: '', altSource: '', altHash: '', decorative: false, imageSource: '', imageAttribution: null, imageCreditBand: 0 };
    expect(service.validatePack(pack, profile).ok).toBe(true);
  });

  it('applies the same restore-state guard to panel image backups', () => {
    const pack = structuredClone(water);
    const panel = pack.history.find(item => item.type === 'image').data.visualPlan.panels[0];
    panel.originalImage = { imageUrl: image, alt: 'A shrinking puddle.', altHash: hashImage(image), altSource: 'author', annotations: {} };
    expect(service.validatePack(pack, profile).errors.map(e => e.code)).toContain('unsupported-image-backup-state');
  });
});

describe('illustrated AlloPack native image attachment', () => {
  const cases = [
    ['glossary', 'glossary', (data) => data[0], 'image', 'imageAlt', 'imageAltHash', 'imageAltSource'],
    ['panel', 'image', (data) => data.visualPlan.panels[0], 'imageUrl', 'alt', 'altHash', 'altSource'],
    ['anchor', 'anchor-chart', (data) => data.sections[0], 'iconUrl', 'iconAlt', 'iconAltHash', 'iconAltSource'],
    ['sort', 'concept-sort', (data) => data.items[0], 'image', 'imageAlt', 'imageAltHash', 'imageAltSource'],
  ];

  it.each(cases)('updates only the selected %s slot and preserves all teaching content', (slot, type, target, imageKey, altKey, hashKey, sourceKey) => {
    const pack = structuredClone(water);
    const original = structuredClone(pack);
    const resource = pack.history.find((item) => item.type === type);
    const result = service.attachImage(pack, { resourceId: resource.id, slot, index: 0, dataUrl: image, alt: 'Two views show a shrinking puddle on the same pavement.' }, profile);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.value).not.toBe(pack);
    expect(pack).toEqual(original);
    const changed = target(result.value.history.find((item) => item.id === resource.id).data);
    expect(changed[imageKey]).toBe(image);
    expect(changed[altKey]).toBe('Two views show a shrinking puddle on the same pavement.');
    expect(changed[hashKey]).toBe(hashImage(image));
    expect(changed[sourceKey]).toBe('planning');
    const editedKeys = new Set([imageKey, altKey, hashKey, sourceKey, 'decorative', 'imageDecorative', 'iconDecorative']);
    const expected = structuredClone(original);
    const expectedTarget = target(expected.history.find((item) => item.id === resource.id).data);
    for (const key of editedKeys) {
      if (Object.hasOwn(changed, key)) expectedTarget[key] = changed[key];
      else delete expectedTarget[key];
    }
    expect(result.value).toEqual(expected);
    expect(service.validatePack(result.value, profile).ok).toBe(true);
  });

  it('accepts an explicitly reviewed description without inventing its review source', () => {
    const pack = glossaryPack();
    const result = service.attachImage(pack, { resourceId: pack.history[0].id, slot: 'glossary', index: 0, dataUrl: image, alt: 'Two pavement views show a shrinking puddle.', altSource: 'author' }, profile);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.value.history[0].data[0].imageAltSource).toBe('author');
  });

  it.each([
    ['missing resource', { resourceId: 'no-such-resource' }],
    ['wrong native slot', { slot: 'panel' }],
    ['out-of-range index', { index: 200 }],
    ['fractional index', { index: 0.5 }],
    ['unknown path option', { path: ['__proto__'] }],
    ['remote image', { dataUrl: 'https://example.invalid/picture.png' }],
    ['malformed image', { dataUrl: 'data:image/png;base64,not-valid-base64!' }],
    ['missing meaningful alt', { alt: '' }],
  ])('rejects %s without mutating its input', (_label, change) => {
    const pack = glossaryPack();
    const before = structuredClone(pack);
    const result = service.attachImage(pack, { resourceId: pack.history[0].id, slot: 'glossary', index: 0, dataUrl: image, alt: 'A shrinking puddle.', ...change }, profile);
    expect(result.ok).toBe(false);
    expect(pack).toEqual(before);
  });

  it('requires the explicit illustrated profile for attaching media', () => {
    const pack = glossaryPack();
    const attachment = { resourceId: pack.history[0].id, slot: 'glossary', index: 0, dataUrl: image, alt: 'A shrinking puddle.' };
    expect(service.attachImage(pack, attachment).ok).toBe(false);
    expect(service.attachImage(pack, attachment, { profile: 'text' }).ok).toBe(false);
  });
});
