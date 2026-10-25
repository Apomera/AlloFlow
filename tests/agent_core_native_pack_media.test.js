import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const media = require('../agent_core_pack_media_module.js');
const service = require('../agent_core_resource_pack_module.js');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAAC56t6BAAAAFElEQVR4AWIymXH7PwgzMUABnAEAAAD//4int4EAAAAGSURBVAMAdREFU3hyBowAAAAASUVORK5CYII=';
const WEBP = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAADwAQCdASoCAAMAAUAmJaACdLoB+AAFQIAAm//PTNeYP8nP/qcfk4/Jx/WUAAAA';
// Complete one-pixel GIF with one independently encoded image block. Repeating
// that block makes a two-frame file without changing palette/decoder state.
const singleGifBytes = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
const animatedGifBytes = Buffer.concat([singleGifBytes.subarray(0, -1), singleGifBytes.subarray(19, -1), Buffer.from([59])]);
const GIF = 'data:image/gif;base64,' + animatedGifBytes.toString('base64');
const native = { profile: 'native' };
const codes = report => report.errors.map(e => e.code);
const panel = extra => ({ id: 'p1', imageUrl: PNG, alt: 'A blue rectangle fills the frame.', altHash: media.hashImage(PNG), altSource: 'author', labels: [{ text: 'Area', position: 'bottom-center' }], ...extra });
const pack = data => ({ history: [{ id: 'visual', type: 'image', data: { visualPlan: { panels: [panel()] }, ...data } }] });
const animation = () => pack({ visualPlan: { panels: [panel({ type: 'process_animation', imageUrl: GIF, frames: [PNG, PNG], motionPrompt: 'The rectangle appears and pauses.', motionSteps: ['The rectangle remains in place.'], fps: 3, frameWidth: 1, frameHeight: 1 })] } });
const servicePack = resources => {
  const p = JSON.parse(readFileSync('allopacks/illustrated/water_cycle_grade6.allopack.json', 'utf8'));
  p.history = resources.map(resource => ({ title: 'Native media example', ...resource }));
  return p;
};

describe('native AlloPack media extension', () => {
  it('accepts native GIF playback and preserved still frames without changing the illustrated boundary', () => {
    expect(media.inspectDataImage(GIF, native)).toMatchObject({ ok: true, width: 1, height: 1, animated: true, frames: 2 });
    expect(media.inspectDataImage(GIF).ok).toBe(false);
    const p = animation(), before = JSON.stringify(p);
    const result = media.validatePackMedia(p, native);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.stats).toMatchObject({ placements: 3, uniqueImages: 2 });
    expect(media.getImageSlots(p, native).map(slot => slot.kind)).toEqual(['panel', 'frame', 'frame']);
    expect(codes(media.validatePackMedia(p))).toContain('unsupported-image-placement');
    expect(JSON.stringify(p)).toBe(before);
  });

  it('checks GIF truncation, image bounds, animation budgets, and trailing payloads', () => {
    const asUrl = bytes => 'data:image/gif;base64,' + bytes.toString('base64');
    expect(media.inspectDataImage(asUrl(animatedGifBytes.subarray(0, -1)), native).ok).toBe(false);
    expect(media.inspectDataImage(asUrl(Buffer.concat([animatedGifBytes, Buffer.from('extra')])), native).ok).toBe(false);
    expect(codes(media.inspectDataImage(GIF, { ...native, maxAnimationFrames: 1 }))).toContain('animation-budget-exceeded');
    expect(codes(media.inspectDataImage(GIF, { ...native, maxPixels: 1 }))).toContain('animation-budget-exceeded');
    const badBounds = Buffer.from(singleGifBytes); badBounds[32] = 2;
    expect(media.inspectDataImage(asUrl(badBounds), native).ok).toBe(false);
  });

  it('hashes the displayed override or first animation frame, not the encoded animation', () => {
    const p = animation();
    p.history[0].data.visualPlan.panels[0].altHash = media.hashImage(GIF);
    expect(codes(media.validatePackMedia(p, native))).toContain('stale-image-alt');
    const stillGif = 'data:image/gif;base64,' + singleGifBytes.toString('base64');
    p.history[0].data.annotations = { imageOverrides: { 0: stillGif } };
    p.history[0].data.visualPlan.panels[0].altHash = media.hashImage(stillGif);
    expect(media.validatePackMedia(p, native).ok).toBe(true);
    expect(media.getImageSlots(p, native).at(-1).path).toBe('pack.history[0].data.annotations.imageOverrides.0');
    p.history[0].data.annotations.imageOverrides[0] = GIF;
    p.history[0].data.visualPlan.panels[0].altHash = media.hashImage(GIF);
    expect(codes(media.validatePackMedia(p, native))).toContain('animated-frame-unsupported');
  });

  it('validates native annotation targets, shapes, CSS positions, and bounded drawings', () => {
    const p = pack({ annotations: {
      userLabels: { 0: [{ id: 'label', text: 'Area', x: 10, y: 20, anchorX: 50, anchorY: 50 }] },
      drawings: { 0: [{ type: 'freehand', color: '#123abc', points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }] },
      captionOverrides: { 0: 'Compare the shape.' },
      aiLabelPositions: { '0-0': { left: '10%', top: '25%' } }, aiLabelAnchors: { '0-0': { x: 50, y: 50 } },
      panelOrder: [0], challengeActive: true, challengeType: 'fill-blank',
    } });
    expect(media.validatePackMedia(p, native).ok).toBe(true);
    const bad = patch => { const copy = structuredClone(p); patch(copy.history[0].data.annotations); return media.validatePackMedia(copy, native); };
    expect(codes(bad(a => { a.imageOverrides = { 3: PNG }; }))).toContain('unknown-image-annotation-target');
    expect(codes(bad(a => { a.aiLabelPositions['0-0'].left = 'url(javascript:bad)'; }))).toContain('invalid-label-position');
    expect(codes(bad(a => { a.drawings[0][0].points = null; }))).toContain('invalid-drawing-points');
    expect(codes(bad(a => { a.drawings[0][0].color = 'url(https://example.test/image)'; }))).toContain('invalid-image-drawing');
    expect(codes(bad(a => { a.panelOrder = [0, 0]; }))).toContain('invalid-panel-order');
    expect(codes(bad(a => { a.userLabels[0][0].anchorX = Infinity; }))).toContain('invalid-label-anchor');
    expect(codes(media.validatePackMedia(p, { ...native, maxDrawingPoints: 1 }))).toContain('image-annotation-budget-exceeded');
  });

  it('requires playback, still frames, and descriptions for an explorable animation', () => {
    const mutate = fn => { const p = animation(); fn(p.history[0].data.visualPlan.panels[0]); return media.validatePackMedia(p, native); };
    expect(codes(mutate(p => { p.imageUrl = PNG; }))).toContain('missing-animation-playback');
    expect(codes(mutate(p => { p.frames = [PNG]; }))).toContain('invalid-animation-frames');
    for (const badFrame of ['', null, 0, {}]) expect(codes(mutate(p => { p.frames[1] = badFrame; }))).toContain('invalid-animation-frame');
    expect(codes(mutate(p => { p.frames[1] = GIF; }))).toContain('animated-frame-unsupported');
    expect(codes(mutate(p => { p.motionSteps = []; }))).toContain('invalid-motion-steps');
    expect(codes(mutate(p => { p.fps = 0; }))).toContain('invalid-animation-fps');
    expect(codes(mutate(p => { p.frameWidth = 99999; }))).toContain('invalid-animation-dimensions');
  });

  it('maps only actual native persona, worksheet, and saved adventure artwork', () => {
    const p = { history: [
      { id: 'people', type: 'persona', data: [{ name: 'Fictional guide', avatarUrl: PNG }] },
      { id: 'ideas', type: 'brainstorm', data: [{ title: 'Compare the evidence', coverImage: PNG }] },
      { id: 'story', type: 'adventure', data: { sceneImage: PNG, snapshot: { history: [{ type: 'scene', image: PNG }], inventory: [{ name: 'Map', image: PNG }], characters: [{ name: 'Guide', portrait: PNG }] } } },
    ] };
    const result = media.validatePackMedia(p, native);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.stats.placements).toBe(6);
    expect(codes(media.validatePackMedia(p))).toContain('unsupported-image-placement');
    p.history[1].data[0].unrecognized = PNG;
    expect(codes(media.validatePackMedia(p, native))).toContain('unsupported-image-placement');
    delete p.history[1].data[0].unrecognized;
    p.history[0].data[0].avatarUrl = 'https://example.test/remote.png';
    expect(codes(media.validatePackMedia(p, native))).toContain('unsupported-image-source');
  });

  it('preserves native memory/challenge visual review states and Frayer art', () => {
    const p = { history: [
      { id: 'memory', type: 'memory-aid', data: { cards: [{ visualImage: PNG, visualAlt: 'A'.repeat(300), visualAltSource: 'author', visualReview: { status: 'unreviewed' }, visualNeedsReview: true }] } },
      { id: 'challenge', type: 'applied-challenge', data: { visual: { image: PNG, alt: 'A'.repeat(900), reviewed: false } } },
      { id: 'outline', type: 'outline', data: { structureType: 'Frayer Model', frayerExampleImage: PNG } },
    ] };
    const before = JSON.stringify(p), result = media.validatePackMedia(p, native);
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.stats.placements).toBe(3);
    expect(result.warnings.filter(w => w.code === 'native-visual-review-pending')).toHaveLength(2);
    expect(JSON.stringify(p)).toBe(before);
    expect(codes(media.validatePackMedia(p))).toContain('unsupported-image-placement');
    p.history[0].data.cards[0].visualAlt = 'A'.repeat(801);
    expect(codes(media.validatePackMedia(p, native))).toContain('invalid-image-alt');
    p.history[0].data.cards[0].visualAlt = 'A rectangle.';
    p.history[1].data.visual.reviewed = 'approved';
    expect(codes(media.validatePackMedia(p, native))).toContain('invalid-visual-review');
  });

  it('attaches native single images and timeline artwork without changing the original pack', () => {
    const p = servicePack([
      { id: 'single', type: 'image', data: { prompt: 'A rectangle.' } },
      { id: 'time', type: 'timeline', data: { progressionLabel: 'Observations', items: ['First', 'Second', 'Third'].map(date => ({ date, event: 'Observe', description: 'Notice the rectangle.' })) } },
    ]);
    const before = JSON.stringify(p);
    const first = service.attachImage(p, { resourceId: 'single', slot: 'single', index: 0, dataUrl: PNG, alt: 'A blue rectangle.', altSource: 'author' }, native);
    expect(first.ok, JSON.stringify(first.errors)).toBe(true);
    const second = service.attachImage(first.value, { resourceId: 'time', slot: 'timeline', index: 0, dataUrl: PNG, alt: 'A blue rectangle.', altSource: 'author' }, native);
    expect(second.ok, JSON.stringify(second.errors)).toBe(true);
    expect(second.value.history[1].data.items[0]).toMatchObject({ image: PNG, altHash: media.hashImage(PNG) });
    expect(JSON.stringify(p)).toBe(before);
  });

  it('attaches animated panels and overrides using the actual described image hash', () => {
    const p = servicePack(animation().history);
    const attached = service.attachImage(p, { resourceId: 'visual', slot: 'panel', index: 0, dataUrl: GIF, alt: 'A rectangle pauses in place.', altSource: 'author' }, native);
    expect(attached.ok, JSON.stringify(attached.errors)).toBe(true);
    expect(attached.value.history[0].data.visualPlan.panels[0].altHash).toBe(media.hashImage(PNG));
    const override = service.attachImage(attached.value, { resourceId: 'visual', slot: 'override', index: 0, dataUrl: WEBP, alt: 'A blue replacement rectangle.', altSource: 'author' }, native);
    expect(override.ok, JSON.stringify(override.errors)).toBe(true);
    expect(override.value.history[0].data.annotations.imageOverrides[0]).toBe(WEBP);
    expect(override.value.history[0].data.visualPlan.panels[0].altHash).toBe(media.hashImage(WEBP));
    expect(override.value.history[0].data.visualPlan.panels[0].imageUrl).toBe(GIF);
  });

  it('replaces animation frames and their playback atomically and preserves displayed override metadata', () => {
    const p = servicePack(animation().history);
    const attachment = { resourceId: 'visual', slot: 'frame', panelIndex: 0, index: 0, dataUrl: WEBP, alt: 'A blue rectangle remains in place.', altSource: 'author' };
    expect(service.attachImage(p, attachment, native).ok).toBe(false);
    expect(service.attachImage(p, { ...attachment, playbackDataUrl: GIF }, native).ok).toBe(false);
    const revisedGifBytes = Buffer.from(animatedGifBytes); revisedGifBytes[23] = 10;
    const revisedGif = 'data:image/gif;base64,' + revisedGifBytes.toString('base64');
    const changed = service.attachImage(p, { ...attachment, playbackDataUrl: revisedGif }, native);
    expect(changed.ok, JSON.stringify(changed.errors)).toBe(true);
    expect(changed.value.history[0].data.visualPlan.panels[0]).toMatchObject({ frames: [WEBP, PNG], imageUrl: revisedGif, altHash: media.hashImage(WEBP) });
    p.history[0].data.annotations = { imageOverrides: { 0: PNG } };
    const withOverride = service.attachImage(p, { ...attachment, playbackDataUrl: revisedGif }, native);
    expect(withOverride.ok, JSON.stringify(withOverride.errors)).toBe(true);
    expect(withOverride.value.history[0].data.visualPlan.panels[0].altHash).toBe(media.hashImage(PNG));
    expect(withOverride.value.history[0].data.visualPlan.panels[0].alt).toBe(p.history[0].data.visualPlan.panels[0].alt);
    expect(p.history[0].data.visualPlan.panels[0].frames[0]).toBe(PNG);
  });

  it('attaches memory and challenge illustrations without retaining a stale visual approval or inventing metadata', () => {
    const memory = structuredClone(service.getCapabilities('native').contracts.find(c => c.type === 'memory-aid').example);
    const challenge = structuredClone(service.getCapabilities('native').contracts.find(c => c.type === 'applied-challenge').example);
    Object.assign(memory.data.cards[0], { visualImage: PNG, visualAlt: 'Earlier rectangle.', visualAltSource: 'author', visualNeedsReview: false, visualReview: { status: 'approved', note: 'Check the connection to the fact.', reviewedAt: '2026-10-23' } });
    challenge.data.visual = { image: PNG, alt: 'Earlier rectangle.', reviewed: true, purpose: 'Study the evidence.' };
    const p = servicePack([memory, challenge]);
    const changed = service.attachImage(p, { resourceId: memory.id, slot: 'memory', index: 0, dataUrl: WEBP, alt: 'A blue rectangle.', altSource: 'author' }, native);
    expect(changed.ok, JSON.stringify(changed.errors)).toBe(true);
    const card = changed.value.history[0].data.cards[0];
    expect(card).toMatchObject({ visualImage: WEBP, visualAlt: 'A blue rectangle.', visualAltSource: 'author', visualNeedsReview: true, visualReview: { status: 'unreviewed', note: 'Check the connection to the fact.', reviewedAt: '' } });
    expect(card).not.toHaveProperty('undefined');
    expect(card).not.toHaveProperty('visualAltHash');
    const updated = service.attachImage(changed.value, { resourceId: challenge.id, slot: 'challenge', index: 0, dataUrl: WEBP, alt: 'A blue rectangle.', altSource: 'author' }, native);
    expect(updated.ok, JSON.stringify(updated.errors)).toBe(true);
    expect(updated.value.history[1].data.visual).toMatchObject({ image: WEBP, alt: 'A blue rectangle.', reviewed: false, purpose: 'Study the evidence.' });
    expect(updated.value.history[1].data.visual).not.toHaveProperty('undefined');
    expect(updated.value.history[1].data.visual).not.toHaveProperty('altHash');
    expect(p.history[0].data.cards[0].visualReview.status).toBe('approved');
    expect(p.history[1].data.visual.reviewed).toBe(true);
  });
});
