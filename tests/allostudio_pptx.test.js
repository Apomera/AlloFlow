// AlloStudio PPTX export (2026-07-31). The exporter is split into a PURE spec
// builder and a thin PptxGenJS driver so the geometry, reading order, and alt
// handling are all testable without the library present.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let ST;
beforeAll(() => {
  loadAlloModule('studio_module.js');
  ST = window.AlloModules.AlloStudio;
  if (!ST) throw new Error('AlloStudio failed to register');
});

const T0 = 1751477000000;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const deck = (title = 'Deck') => ST.stCreateDoc('slide-16x9', title, T0);
const addText = (doc, text, opts = {}) => {
  ST.stAppend(doc, {
    type: 'object.add',
    object: {
      type: 'text', role: opts.role || 'body', page: opts.page,
      frame: opts.frame || { x: 96, y: 96, w: 960, h: 120 }, z: 1,
      runs: [{ text, style: opts.style || { size: 24 } }],
    },
  }, 'user', T0);
  return doc.objects[doc.objects.length - 1];
};
const addImage = (doc, alt, opts = {}) => {
  ST.stAppend(doc, {
    type: 'object.add',
    object: {
      type: 'image', src: PNG, alt, decorative: !!opts.decorative, page: opts.page,
      frame: opts.frame || { x: 0, y: 0, w: 192, h: 96 }, z: 1,
      provenance: { origin: 'upload' },
    },
  }, 'import', T0);
  return doc.objects[doc.objects.length - 1];
};

describe('layout + geometry', () => {
  it('maps the 16:9 preset onto PowerPoint LAYOUT_16x9 exactly', () => {
    const spec = ST.stExportPptxSpec(deck());
    expect(spec.layout.standard).toBe(true);
    expect(spec.layout.name).toBe('LAYOUT_16x9');
    expect(spec.layout.width).toBeCloseTo(13.333, 3);
    expect(spec.layout.height).toBe(7.5);
  });

  it('defines a custom layout for a non-slide canvas instead of letterboxing', () => {
    const spec = ST.stExportPptxSpec(ST.stCreateDoc('letter-portrait', 'Doc', T0));
    expect(spec.layout.standard).toBe(false);
    expect(spec.layout.width).toBeCloseTo(816 / 96, 3);
    expect(spec.layout.height).toBeCloseTo(1056 / 96, 3);
  });

  it('converts pixel frames to inches at 96 DPI', () => {
    const d = deck();
    addText(d, 'Title', { frame: { x: 96, y: 48, w: 480, h: 96 } });
    const box = ST.stExportPptxSpec(d).slides[0].shapes[0].options;
    expect(box.x).toBe(1);
    expect(box.y).toBe(0.5);
    expect(box.w).toBe(5);
    expect(box.h).toBe(1);
  });

  it('converts CSS pixel font sizes to points', () => {
    const d = deck();
    addText(d, 'Big', { style: { size: 48 } });
    expect(ST.stExportPptxSpec(d).slides[0].shapes[0].options.fontSize).toBe(36);
  });

  it('strips the leading # from colors, which PptxGenJS does not accept', () => {
    const d = deck();
    addText(d, 'Colored', { style: { size: 24, color: '#ff0000' } });
    const spec = ST.stExportPptxSpec(d);
    expect(spec.slides[0].shapes[0].options.color).toBe('ff0000');
    expect(spec.slides[0].background.color).not.toMatch(/#/);
  });
});

describe('pages become slides', () => {
  it('emits one slide per page, with each object on its own slide', () => {
    const d = deck();
    addText(d, 'one', { page: 0 });
    ST.stAppend(d, { type: 'page.add' }, 'user', T0);
    addText(d, 'two', { page: 1 });
    ST.stAppend(d, { type: 'page.add' }, 'user', T0);
    addText(d, 'three', { page: 2 });

    const spec = ST.stExportPptxSpec(d);
    expect(spec.slideCount).toBe(3);
    expect(spec.slides.map((s) => s.shapes[0].text)).toEqual(['one', 'two', 'three']);
  });

  it('keeps an empty page as a real blank slide rather than dropping it', () => {
    const d = deck();
    addText(d, 'one', { page: 0 });
    ST.stAppend(d, { type: 'page.add' }, 'user', T0); // never populated
    const spec = ST.stExportPptxSpec(d);
    expect(spec.slideCount).toBe(2);
    expect(spec.slides[1].shapes).toEqual([]);
  });

  it('preserves reading order within a slide', () => {
    const d = deck();
    addText(d, 'first', { page: 0 });
    addText(d, 'second', { page: 0 });
    addText(d, 'third', { page: 0 });
    const texts = ST.stExportPptxSpec(d).slides[0].shapes.map((s) => s.text);
    expect(texts).toEqual(['first', 'second', 'third']);
  });
});

describe('accessibility carried into the deck', () => {
  it('carries alt text onto images', () => {
    const d = deck();
    addImage(d, 'A leaf cross-section');
    const img = ST.stExportPptxSpec(d).slides[0].shapes[0];
    expect(img.kind).toBe('image');
    expect(img.options.altText).toBe('A leaf cross-section');
  });

  it('gives a decorative image an empty description, not its alt string', () => {
    const d = deck();
    addImage(d, 'ignored', { decorative: true });
    expect(ST.stExportPptxSpec(d).slides[0].shapes[0].options.altText).toBe('');
  });

  it('puts each slide heading into the speaker notes', () => {
    const d = deck();
    addText(d, 'Photosynthesis', { role: 'heading1', style: { size: 48 } });
    addText(d, 'body copy', { role: 'body' });
    expect(ST.stExportPptxSpec(d).slides[0].notes).toBe('Photosynthesis');
  });

  it('still flags a missing-alt image through the existing export gate', () => {
    const d = deck();
    addImage(d, '');
    expect(ST.stAltGate(d.objects).length).toBe(1);
  });
});

describe('renderer', () => {
  // A minimal fake stands in for PptxGenJS: the driver is thin by design, so
  // what matters is that it calls the right methods in the right order.
  function makeFake() {
    const calls = [];
    function Fake() {
      this.ShapeType = { rect: 'RECT', ellipse: 'ELLIPSE' };
      this.addSlide = () => {
        const slide = {
          addText: (t, o) => calls.push(['text', t, o]),
          addImage: (o) => calls.push(['image', o]),
          addShape: (s, o) => calls.push(['shape', s, o]),
          addNotes: (n) => calls.push(['notes', n]),
        };
        calls.push(['slide']);
        return slide;
      };
      this.defineLayout = (l) => calls.push(['defineLayout', l]);
    }
    return { Fake, calls };
  }

  it('drives the library once per slide and shape, in order', () => {
    const d = deck('Lesson');
    addText(d, 'Title', { role: 'heading1' });
    ST.stAppend(d, { type: 'page.add' }, 'user', T0);
    addImage(d, 'diagram', { page: 1 });

    const { Fake, calls } = makeFake();
    const built = ST.stRenderPptx(ST.stExportPptxSpec(d), Fake);
    expect(built.layout).toBe('LAYOUT_16x9');
    expect(built.title).toBe('Lesson');
    expect(calls.filter((c) => c[0] === 'slide').length).toBe(2);
    expect(calls.some((c) => c[0] === 'text' && c[1] === 'Title')).toBe(true);
    expect(calls.some((c) => c[0] === 'image')).toBe(true);
  });

  it('defines a custom layout when the canvas is not 16:9', () => {
    const { Fake, calls } = makeFake();
    ST.stRenderPptx(ST.stExportPptxSpec(ST.stCreateDoc('letter-portrait', 'Doc', T0)), Fake);
    expect(calls.some((c) => c[0] === 'defineLayout')).toBe(true);
  });

  it('fails with a clear message when the library is missing', () => {
    expect(() => ST.stRenderPptx(ST.stExportPptxSpec(deck()), null)).toThrow(/not loaded/i);
  });
});
