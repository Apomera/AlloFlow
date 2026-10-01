import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// Pictures on word supports (2026-09-23): a Mulberry symbol or screened photo
// beside a word's explanation. Stored inline and small, because a live session
// carries only 256 KB for every resource. A bad or over-budget picture is
// dropped - never the teacher's written support.

let api;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  // Mutation runs load a scratch copy so a mutant never reaches the shared file.
  if (process.env.ALLO_FIRESTORE_SYNC_CANDIDATE) new Function(readFileSync(process.env.ALLO_FIRESTORE_SYNC_CANDIDATE, 'utf8'))(); else loadAlloModule('firestore_sync_module.js');
  api = window.AlloModules.InstructionalContext;
});
const text = 'The heron waded through the marsh near the old mill at dawn.';
function owner() {
  return api.createSupportedReading(api.createSourceSnapshot(text, { sourceArtifactId: 'heron' }), { id: 'reader-heron', unitId: 'birds', sourceFamilyId: 'heron' });
}
function support(item, quote, extra = {}) {
  const start = item.data.indexOf(quote);
  return { id: 'word-' + start, start, end: start + quote.length, quote, text: 'Meaning of ' + quote, ...extra };
}
// A syntactically valid base64 image payload of about n characters.
const picture = (n = 400, type = 'image/jpeg') => 'data:' + type + ';base64,' + 'A'.repeat(n - ('data:' + type + ';base64,').length);
const credit = { set: 'Wikimedia Commons', title: 'Grey heron', author: 'Ann', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', via: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Heron.jpg' };

describe('pictures on word supports', () => {
  it('are dropped before any uploaded original when the cloud save is too big, keeping every written support', () => {
    const picture = n => ({ src: 'data:image/png;base64,' + 'A'.repeat(30000), alt: 'Picture ' + n + '.' });
    const readings = Array.from({ length: 32 }, (_, n) => {
      const item = api.createSupportedReading('The heron number ' + n + ' waded through the marsh.', { id: 'r' + n });
      item.readingSupports = api.upsertReadingSupport(item, undefined, { id: 'h', start: 4, end: 9, quote: 'heron', text: 'A bird.', image: picture(n) });
      return item;
    });
    // A teacher-uploaded original (the kind the last pass may drop): a Memory Aid card photo.
    const uploaded = { id: 'up', type: 'memory-aid', data: { cards: [{ front: 'Heron', visualImage: 'data:image/png;base64,' + 'U'.repeat(1000), visualSource: 'uploaded' }] } };
    const fitted = window.fitArtworkToBudget([...readings, uploaded]);
    expect(JSON.stringify(fitted).length).toBeLessThan(850 * 1024);
    expect(fitted.at(-1).data.cards[0].visualImage).toBe(uploaded.data.cards[0].visualImage);
    fitted.slice(0, -1).forEach(item => expect(item.readingSupports.annotations[0]).toMatchObject({ quote: 'heron', text: 'A bird.' }));
    expect(fitted.some(item => item.readingSupports && !item.readingSupports.annotations[0].image)).toBe(true);
    // Oldest first: the newest readings keep their pictures when there is room.
    expect(fitted[readings.length - 1].readingSupports.annotations[0].image).toBeTruthy();
    expect(readings[0].readingSupports.annotations[0].image).toBeTruthy(); // the originals are untouched
  });

  it('keeps a picture on a teacher support, with a cleaned credit', () => {
    const item = owner();
    const saved = api.upsertReadingSupport(item, undefined, support(item, 'heron', { image: {
      src: picture(), alt: '  A grey heron  standing in shallow water. ', altSource: 'vision', source: 'wikimedia',
      attribution: { ...credit, url: 'javascript:alert(1)', licenseUrl: 'http://insecure.test/licence' },
    } }));
    expect(saved.annotations[0].image).toEqual({
      src: picture(), alt: 'A grey heron standing in shallow water.', altSource: 'vision', source: 'wikimedia',
      attribution: { set: 'Wikimedia Commons', title: 'Grey heron', author: 'Ann', license: 'CC BY-SA 4.0', via: 'Wikimedia Commons', url: '' },
    });
    expect(api.isSupportedOriginal(item)).toBe(true);
  });

  it('drops a picture it cannot trust but keeps the written support', () => {
    const item = owner();
    for (const image of [
      { src: 'https://upload.wikimedia.org/heron.jpg' },               // not inline: the screened pixels could change
      { src: 'data:text/html;base64,PHNjcmlwdD4=' },                     // not an image
      { src: picture(40000) },                                           // over the per-picture cap
      { src: 'data:image/png;base64,abc" onerror="alert(1)' },           // not a clean payload
      'heron.jpg',
    ]) {
      const saved = api.upsertReadingSupport(item, undefined, support(item, 'heron', { image }));
      expect(saved.annotations).toHaveLength(1);
      expect(saved.annotations[0].text).toBe('Meaning of heron');
      expect('image' in saved.annotations[0]).toBe(false);
    }
  });

  it('shares one budget across a reading, keeping the earliest pictures', () => {
    const item = owner();
    let saved;
    for (const quote of ['heron', 'marsh', 'mill']) {
      saved = api.upsertReadingSupport(item, saved, support(item, quote, { image: { src: picture(30000), alt: quote } }));
    }
    const pictured = saved.annotations.filter(entry => entry.image).map(entry => entry.quote);
    expect(pictured).toEqual(['heron', 'marsh']);            // 60,000 of 64,000 used
    expect(saved.annotations.find(entry => entry.quote === 'mill').text).toBe('Meaning of mill');
    expect(api.readingSupportPictureBudget(saved)).toMatchObject({ used: 60000, total: 64000, remaining: 4000, perPicture: 32000 });
  });

  it('keeps the picture through text edits, pins and regeneration, and removes it on request', () => {
    const item = owner();
    let saved = api.upsertReadingSupport(item, undefined, support(item, 'marsh', { image: { src: picture(), alt: 'A marsh.', source: 'mulberry' } }));
    const id = saved.annotations[0].id;
    saved = api.upsertReadingSupport(item, saved, { id, start: saved.annotations[0].start, end: saved.annotations[0].end, quote: 'marsh', text: 'Wet, low land.' });
    expect(saved.annotations[0]).toMatchObject({ text: 'Wet, low land.', image: { alt: 'A marsh.', source: 'mulberry', altSource: 'author' } });
    saved = api.setReadingSupportPinned(item, saved, id, true);
    expect(saved.annotations[0].image.alt).toBe('A marsh.');
    const regenerated = api.validateReadingSupports(item, [support(item, 'heron'), support(item, 'mill')]);
    saved = api.mergeReadingSupports(item, saved, regenerated);
    expect(saved.annotations.find(entry => entry.quote === 'marsh').image.alt).toBe('A marsh.');
    expect(saved.annotations.filter(entry => entry.image)).toHaveLength(1);
    saved = api.upsertReadingSupport(item, saved, { id, start: saved.annotations.find(e => e.id === id).start, end: saved.annotations.find(e => e.id === id).end, quote: 'marsh', text: 'Wet, low land.', image: null });
    expect('image' in saved.annotations.find(entry => entry.id === id)).toBe(false);
  });

  it('keeps pictures in cloud saves; live sessions drop them but keep the written support', () => {
    // Live sessions strip every image-like field app-wide (their size policy),
    // so a support picture never reaches students there - its words must.
    const item = owner();
    item.readingSupports = api.upsertReadingSupport(item, undefined, support(item, 'heron', { image: { src: picture(), alt: 'A heron.', source: 'mulberry' } }));
    const cloud = window.sanitizeHistoryForCloud([item])[0];
    expect(cloud.readingSupports.annotations[0].image.alt).toBe('A heron.');
    const live = window.prepareSessionResourcesForWrite([item]).resources[0];
    expect(live.readingSupports.annotations).toHaveLength(1);
    expect(live.readingSupports.annotations[0].text).toBe('Meaning of heron');
    expect(live.readingSupports.annotations[0].image ?? null).toBe(null);
  });

  it('never gives a generated support a picture, however it arrives', () => {
    const item = owner();
    // Pictures come only from a teacher's choice. A generated entry that
    // claims one - from a reply, an import or a merge - loses it.
    const generated = api.validateReadingSupports(item, [support(item, 'heron', { image: { src: picture(), alt: 'x' } })]);
    expect(generated.annotations[0].origin).toBe('generated');
    expect('image' in generated.annotations[0]).toBe(false);
    const merged = api.mergeReadingSupports(item, api.validateReadingSupports(item, []), { ...generated, annotations: [{ ...generated.annotations[0], image: { src: picture(), alt: 'x' } }] });
    expect(merged.annotations[0].origin).toBe('generated');
    expect('image' in merged.annotations[0]).toBe(false);
    // An imported entry marked educator keeps its (valid) picture.
    const educator = api.validateReadingSupports(item, [support(item, 'heron', { origin: 'educator', image: { src: picture(), alt: 'x' } })]);
    expect(educator.annotations[0].image.alt).toBe('x');
  });
});
