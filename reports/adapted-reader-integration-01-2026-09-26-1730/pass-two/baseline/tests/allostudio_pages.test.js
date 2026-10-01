// AlloStudio multi-page / slide-deck schema (2026-07-31) — the page model that
// makes PPTX export possible. Design decisions under test:
//   * ONE canvas per document. PPTX stores slide size at the presentation level
//     (<p:sldSz>), so pages cannot have individual sizes.
//   * A page is an INDEX on each object, not a container, so every existing op
//     keeps addressing objects by id and the ledger/replay engine is unchanged.
//   * `page` absent === page 0 and `pageCount` absent === 1 page, so every save
//     written before this schema loads as a correct one-page document with no
//     migration pass.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let ST;
beforeAll(() => {
  loadAlloModule('studio_module.js');
  ST = window.AlloModules.AlloStudio;
  if (!ST) throw new Error('AlloStudio failed to register');
});

const T0 = 1751477000000;
// stAppend returns the OP; the minted object is the one it just pushed onto the
// scene, so hand back the live object the caller wants to track.
const addTextOn = (doc, text, page, ts = T0) => {
  ST.stAppend(doc, {
    type: 'object.add',
    object: { type: 'text', role: 'body', page, frame: { x: 10, y: 10, w: 200, h: 40 }, z: 10, runs: [{ text, style: { size: 16 } }] },
  }, 'user', ts);
  return doc.objects[doc.objects.length - 1];
};
const pageOf = (doc, id) => ST.stObjectPage(doc.objects.filter((o) => o.id === id)[0]);
const textsOn = (doc, page) => ST.stObjectsOnPage(doc.objects, page).map((o) => o.runs[0].text);

describe('slide preset', () => {
  it('exposes a 16:9 slide preset sized for PptxGenJS LAYOUT_16x9', () => {
    const slide = ST.ST_CANVAS_PRESETS['slide-16x9'];
    expect(slide).toBeTruthy();
    // 1280x720 at 96 DPI === 13.333in x 7.5in === LAYOUT_16x9, so slide
    // coordinates convert to inches by dividing by 96 with no letterboxing.
    expect(slide.w / 96).toBeCloseTo(13.333, 2);
    expect(slide.h / 96).toBe(7.5);
    expect(slide.w / slide.h).toBeCloseTo(16 / 9, 5);
  });

  it('creates a valid one-page deck from the slide preset', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    expect(ST.stValidateDoc(doc)).toEqual([]);
    expect(doc.canvas.preset).toBe('slide-16x9');
    expect(doc.pageCount).toBe(1);
  });
});

describe('back-compatibility with pre-page saves', () => {
  it('treats a doc with no pageCount and no object.page as exactly one page', () => {
    const doc = ST.stCreateDoc('letter-portrait', 'Legacy', T0);
    addTextOn(doc, 'hello', undefined);
    delete doc.pageCount;
    doc.objects.forEach((o) => { delete o.page; });
    expect(ST.stValidateDoc(doc)).toEqual([]);
    expect(ST.stScenePageCount(doc)).toBe(1);
    expect(ST.stObjectPage(doc.objects[0])).toBe(0);
    expect(textsOn(doc, 0)).toEqual(['hello']);
  });

  it('never reports fewer pages than the objects actually reference', () => {
    // A truncated or hand-edited save must not strand objects on pages the
    // editor would refuse to render.
    const doc = ST.stCreateDoc('slide-16x9', 'Truncated', T0);
    addTextOn(doc, 'stranded', 0);
    doc.objects[0].page = 4;
    doc.pageCount = 1;
    expect(ST.stScenePageCount(doc)).toBe(5);
  });
});

describe('page ops', () => {
  it('appends a page and leaves existing objects where they were', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'slide one', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    expect(doc.pageCount).toBe(2);
    expect(textsOn(doc, 0)).toEqual(['slide one']);
    expect(textsOn(doc, 1)).toEqual([]);
    expect(ST.stValidateDoc(doc)).toEqual([]);
  });

  it('inserts a page in the middle and shifts later pages down', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'first', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    const b = addTextOn(doc, 'second', 1);
    ST.stAppend(doc, { type: 'page.add', at: 1 }, 'user', T0);
    expect(doc.pageCount).toBe(3);
    expect(textsOn(doc, 0)).toEqual(['first']);
    expect(textsOn(doc, 1)).toEqual([]);       // the freshly inserted blank page
    expect(pageOf(doc, b.id)).toBe(2);          // 'second' moved down one
  });

  it('removes a page along with the objects on it', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'keep', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    addTextOn(doc, 'doomed', 1);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    const tail = addTextOn(doc, 'tail', 2);

    ST.stAppend(doc, { type: 'page.remove', at: 1 }, 'user', T0);
    expect(doc.pageCount).toBe(2);
    expect(textsOn(doc, 0)).toEqual(['keep']);
    expect(pageOf(doc, tail.id)).toBe(1);       // shifted up into the gap
    expect(doc.objects.some((o) => o.runs && o.runs[0].text === 'doomed')).toBe(false);
    expect(ST.stValidateDoc(doc)).toEqual([]);
  });

  it('refuses to remove the last page — a document always has one', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'only', 0);
    ST.stAppend(doc, { type: 'page.remove', at: 0 }, 'user', T0);
    expect(doc.pageCount).toBe(1);
    expect(textsOn(doc, 0)).toEqual(['only']);
  });

  it('reorders pages and remaps every affected object', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    const a = addTextOn(doc, 'A', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    const b = addTextOn(doc, 'B', 1);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    const c = addTextOn(doc, 'C', 2);

    // Move the last page to the front: C, A, B
    ST.stAppend(doc, { type: 'page.reorder', from: 2, to: 0 }, 'user', T0);
    expect(pageOf(doc, c.id)).toBe(0);
    expect(pageOf(doc, a.id)).toBe(1);
    expect(pageOf(doc, b.id)).toBe(2);
    expect(doc.pageCount).toBe(3);
  });

  it('moves a single object between pages without touching its frame', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    const a = addTextOn(doc, 'mover', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    const before = JSON.stringify(doc.objects.filter((o) => o.id === a.id)[0].frame);
    ST.stAppend(doc, { type: 'object.page', target: a.id, page: 1 }, 'user', T0);
    expect(pageOf(doc, a.id)).toBe(1);
    expect(JSON.stringify(doc.objects.filter((o) => o.id === a.id)[0].frame)).toBe(before);
  });

  it('clamps an object added past the end onto the last real page', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    const far = addTextOn(doc, 'far', 9);
    expect(pageOf(doc, far.id)).toBe(0);
    expect(ST.stValidateDoc(doc)).toEqual([]);
  });
});

describe('ledger integrity with pages', () => {
  it('reconstructs the page count by replay, including trailing empty pages', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'one', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0); // stays empty
    const head = doc.ledger.ops[doc.ledger.ops.length - 1].seq;

    const replayed = ST.stReplay(doc, head);
    expect(ST.stScenePageCount(replayed)).toBe(3);
    expect(replayed.pageCount).toBe(3);
  });

  it('replays to seq 0 as a single empty page', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'one', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    const base = ST.stReplay(doc, 0);
    expect(base.objects).toEqual([]);
    expect(ST.stScenePageCount(base)).toBe(1);
  });

  it('undoes a page.add back to the previous page count', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'one', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    expect(doc.pageCount).toBe(2);
    ST.stUndo(doc);
    expect(doc.pageCount).toBe(1);
    expect(textsOn(doc, 0)).toEqual(['one']);
  });

  it('undoes a page.remove and restores the objects that were on it', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'keep', 0);
    ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    addTextOn(doc, 'doomed', 1);
    ST.stAppend(doc, { type: 'page.remove', at: 1 }, 'user', T0);
    expect(doc.objects.some((o) => o.runs && o.runs[0].text === 'doomed')).toBe(false);

    ST.stUndo(doc);
    expect(doc.pageCount).toBe(2);
    expect(textsOn(doc, 1)).toEqual(['doomed']);
  });

  it('survives enough ops to cross a checkpoint boundary', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    const every = ST.ST_CHECKPOINT_EVERY;
    for (let i = 0; i < every + 3; i++) ST.stAppend(doc, { type: 'page.add' }, 'user', T0);
    expect(doc.ledger.checkpoints.length).toBeGreaterThan(0);
    const head = doc.ledger.ops[doc.ledger.ops.length - 1].seq;
    expect(ST.stReplay(doc, head).pageCount).toBe(doc.pageCount);
  });
});

describe('deck creation path (the gap that blocked the deck story)', () => {
  it('ships a slideDeck template: 16:9 canvas, two slides, valid, replayable', () => {
    const tpl = ST.stTemplates().find((t) => t.key === 'slideDeck');
    expect(tpl).toBeTruthy();
    const d = tpl.make(T0);
    expect(ST.stValidateDoc(d)).toEqual([]);
    expect(d.canvas.preset).toBe('slide-16x9');
    expect(ST.stScenePageCount(d)).toBe(2);
    // Title slide has the H1; content slide has its own heading + body
    expect(ST.stObjectsOnPage(d.objects, 0).some((o) => o.type === 'text' && o.role === 'heading1')).toBe(true);
    expect(ST.stObjectsOnPage(d.objects, 1).filter((o) => o.type === 'text').length).toBe(2);
    // Every seeded op is 'user' and the ledger replays to the same scene
    expect(d.ledger.ops.every((op) => op.actor === 'user')).toBe(true);
    const last = d.ledger.ops[d.ledger.ops.length - 1].seq;
    expect(JSON.stringify(ST.stReplay(d, last).objects)).toBe(JSON.stringify(d.objects));
    // Nothing blocks export out of the box
    expect(ST.stAltGate(d.objects)).toEqual([]);
  });

  it('exports the template deck to a two-slide PPTX spec on LAYOUT_16x9', () => {
    const d = ST.stTemplates().find((t) => t.key === 'slideDeck').make(T0);
    const spec = ST.stExportPptxSpec(d);
    expect(spec.layout.standard).toBe(true);
    expect(spec.slideCount).toBe(2);
    expect(spec.slides[0].notes).toBe('Presentation title');
  });
});

describe('deck from resource history ("Open in Page Designer" route)', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  it('builds a title slide plus one slide per cue, all as actor import', () => {
    const cues = [
      { id: 'c1', label: 'Photosynthesis', text: 'Plants turn light into chemical energy.', sourceTitle: 'Biology unit' },
      { id: 'c2', label: 'Chloroplast', text: 'The organelle where it happens.', imageSrc: PNG },
      { id: 'c3', label: 'Quick check', text: 'What gas do plants take in?' },
    ];
    const built = ST.stDeckFromResourceCues(cues, { title: 'Biology unit', now: T0 });
    const d = built.doc;
    expect(ST.stValidateDoc(d)).toEqual([]);
    expect(d.canvas.preset).toBe('slide-16x9');
    expect(ST.stScenePageCount(d)).toBe(4);
    expect(built.used).toBe(3);
    expect(d.ledger.ops.every((op) => op.actor === 'import')).toBe(true);
    // slide 2 carries the cue image with the generation label as its alt
    const img = ST.stObjectsOnPage(d.objects, 2).find((o) => o.type === 'image');
    expect(img.alt).toBe('Chloroplast');
    // nothing blocks the PowerPoint export
    expect(ST.stAltGate(d.objects)).toEqual([]);
    expect(ST.stExportPptxSpec(d).slideCount).toBe(4);
  });

  it('caps at the page limit and reports what was left out', () => {
    const many = Array.from({ length: ST.ST_MAX_PAGES + 10 }, (_, i) => ({ id: 'c' + i, label: 'Item ' + i, text: 'Body ' + i }));
    const built = ST.stDeckFromResourceCues(many, { title: 'Big unit', now: T0 });
    expect(ST.stScenePageCount(built.doc)).toBe(ST.ST_MAX_PAGES);
    expect(built.skipped).toBe(11);
    expect(ST.stValidateDoc(built.doc)).toEqual([]);
  });
});

describe('validation', () => {
  it('rejects a page index past the document end', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'x', 0);
    doc.objects[0].page = 3;
    doc.pageCount = 2;
    expect(ST.stValidateDoc(doc).join(' ')).toMatch(/past the document end/);
  });

  it('rejects a non-integer page index', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    addTextOn(doc, 'x', 0);
    doc.objects[0].page = 1.5;
    expect(ST.stValidateDoc(doc).join(' ')).toMatch(/invalid page index/);
  });

  it('rejects an absurd page count', () => {
    const doc = ST.stCreateDoc('slide-16x9', 'Deck', T0);
    doc.pageCount = ST.ST_MAX_PAGES + 1;
    expect(ST.stValidateDoc(doc).join(' ')).toMatch(/Too many pages/);
  });
});
