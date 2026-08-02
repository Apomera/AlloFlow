// AlloStudio PPTX import (2026-08-02). stImportPptxDoc is PURE over a
// {path: content} file map (xml strings, base64 media), so the whole OOXML
// parse path is tested here with synthetic fixtures — no JSZip needed.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let ST;
beforeAll(() => {
  loadAlloModule('studio_module.js');
  ST = window.AlloModules.AlloStudio;
  if (!ST) throw new Error('AlloStudio failed to register');
});

const T0 = 1751477000000;
const PX = 9525; // EMU per px
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const P_NS = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function presentationXml(slideRels, wPx = 1280, hPx = 720) {
  const ids = slideRels.map((rid, i) => `<p:sldId id="${256 + i}" r:id="${rid}"/>`).join('');
  return `<?xml version="1.0"?><p:presentation ${P_NS}><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="${wPx * PX}" cy="${hPx * PX}"/></p:presentation>`;
}
function presRelsXml(entries) {
  const rels = entries.map(([id, target]) => `<Relationship Id="${id}" Type="slide" Target="${target}"/>`).join('');
  return `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}
function xfrm(x, y, w, h) {
  return `<a:xfrm><a:off x="${x * PX}" y="${y * PX}"/><a:ext cx="${w * PX}" cy="${h * PX}"/></a:xfrm>`;
}
function textSp(text, { title = false, x = 100, y = 100, w = 400, h = 100, sz, bold } = {}) {
  const ph = title ? '<p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>' : '';
  const rPr = sz || bold ? `<a:rPr${sz ? ` sz="${sz}"` : ''}${bold ? ' b="1"' : ''}/>` : '';
  const paras = String(text).split('\n').map((line) => `<a:p><a:r>${rPr}<a:t>${line}</a:t></a:r></a:p>`).join('');
  return `<p:sp>${ph}<p:spPr>${xfrm(x, y, w, h)}</p:spPr><p:txBody>${paras}</p:txBody></p:sp>`;
}
function picXml(relId, { descr = '', x = 0, y = 0, w = 200, h = 100 } = {}) {
  return `<p:pic><p:nvPicPr><p:cNvPr id="9" name="Picture"${descr ? ` descr="${descr}"` : ''}/></p:nvPicPr><p:blipFill><a:blip r:embed="${relId}"/></p:blipFill><p:spPr>${xfrm(x, y, w, h)}</p:spPr></p:pic>`;
}
function slideXml(bodyXml) {
  return `<?xml version="1.0"?><p:sld ${P_NS}><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/>${bodyXml}</p:spTree></p:cSld></p:sld>`;
}

function basicDeck() {
  return {
    'ppt/presentation.xml': presentationXml(['rId1', 'rId2']),
    'ppt/_rels/presentation.xml.rels': presRelsXml([['rId1', 'slides/slide1.xml'], ['rId2', 'slides/slide2.xml']]),
    'ppt/slides/slide1.xml': slideXml(
      textSp('Deck title', { title: true, x: 96, y: 48, w: 1088, h: 110, sz: '4400' }) +
      textSp('A subtitle line', { x: 96, y: 200, w: 1088, h: 60 })
    ),
    'ppt/slides/slide2.xml': slideXml(
      textSp('Second slide', { title: true }) +
      picXml('rId5', { descr: 'A labeled diagram', x: 700, y: 100, w: 400, h: 300 }) +
      picXml('rId6', { x: 100, y: 420, w: 200, h: 150 })
    ),
    'ppt/slides/_rels/slide2.xml.rels': presRelsXml([['rId5', '../media/image1.png'], ['rId6', '../media/image2.png']]),
    'ppt/media/image1.png': PNG_B64,
    'ppt/media/image2.png': PNG_B64,
  };
}

describe('stImportPptxDoc', () => {
  it('imports a two-slide deck: pages, roles, geometry, and actor all correct', () => {
    const res = ST.stImportPptxDoc(basicDeck(), 'Unit 3 Photosynthesis.pptx', T0);
    expect(res.error).toBeUndefined();
    const d = res.doc;
    expect(ST.stValidateDoc(d)).toEqual([]);
    expect(d.title).toBe('Unit 3 Photosynthesis');
    expect(d.canvas.preset).toBe('slide-16x9');
    expect(ST.stScenePageCount(d)).toBe(2);
    // every op is the import actor
    expect(d.ledger.ops.every((op) => op.actor === 'import')).toBe(true);
    // slide 1: title became the document H1 at its EMU-converted frame
    const h1 = ST.stObjectsOnPage(d.objects, 0).find((o) => o.role === 'heading1');
    expect(h1.runs[0].text).toBe('Deck title');
    expect(h1.frame).toMatchObject({ x: 96, y: 48, w: 1088, h: 110 });
    expect(h1.runs[0].style.size).toBe(Math.round(4400 / 75)); // 44pt -> px
    // slide 2: title placeholder demoted to heading2 (one H1 per document)
    expect(ST.stObjectsOnPage(d.objects, 1).find((o) => o.role === 'heading2').runs[0].text).toBe('Second slide');
    expect(res.summary).toMatchObject({ slides: 2, texts: 3, images: 2 });
  });

  it('carries alt text through and counts the images that arrive without it', () => {
    const res = ST.stImportPptxDoc(basicDeck(), 'deck.pptx', T0);
    const images = res.doc.objects.filter((o) => o.type === 'image');
    expect(images.find((o) => o.alt === 'A labeled diagram')).toBeTruthy();
    expect(res.summary.altMissing).toBe(1);
    // and the gate holds re-export hostage until it is described
    expect(ST.stAltGate(res.doc.objects).length).toBe(1);
  });

  it('counts tables/charts and groups as skipped instead of silently dropping them', () => {
    const files = basicDeck();
    files['ppt/slides/slide1.xml'] = slideXml(
      textSp('Title', { title: true }) +
      `<p:graphicFrame>${xfrm(0, 0, 400, 300)}</p:graphicFrame>` +
      '<p:grpSp><p:sp/></p:grpSp>'
    );
    const res = ST.stImportPptxDoc(files, 'deck.pptx', T0);
    expect(res.summary.skipped['table-or-chart']).toBe(1);
    expect(res.summary.skipped['group']).toBe(1);
  });

  it('imports rect/ellipse fills as decorative shapes', () => {
    const files = basicDeck();
    files['ppt/slides/slide1.xml'] = slideXml(
      `<p:sp><p:spPr>${xfrm(10, 20, 300, 40)}<a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="4F46E5"/></a:solidFill></p:spPr></p:sp>` +
      textSp('Title', { title: true })
    );
    const res = ST.stImportPptxDoc(files, 'deck.pptx', T0);
    const shape = res.doc.objects.find((o) => o.type === 'shape');
    expect(shape).toMatchObject({ shape: 'rect', decorative: true });
    expect(String(shape.fill).toLowerCase()).toBe('#4f46e5');
  });

  it('resizes the canvas for a non-16:9 deck instead of letterboxing', () => {
    const files = basicDeck();
    files['ppt/presentation.xml'] = presentationXml(['rId1', 'rId2'], 960, 720); // classic 4:3
    const res = ST.stImportPptxDoc(files, 'old-deck.pptx', T0);
    expect(res.error).toBeUndefined();
    expect(res.doc.canvas.w).toBe(960);
    expect(res.doc.canvas.h).toBe(720);
    expect(ST.stValidateDoc(res.doc)).toEqual([]);
  });

  it('falls back to filename order when the sldIdLst is unreadable', () => {
    const files = basicDeck();
    files['ppt/presentation.xml'] = `<?xml version="1.0"?><p:presentation ${P_NS}><p:sldSz cx="${1280 * PX}" cy="${720 * PX}"/></p:presentation>`;
    const res = ST.stImportPptxDoc(files, 'deck.pptx', T0);
    expect(res.error).toBeUndefined();
    expect(res.summary.slides).toBe(2);
  });

  it('rejects a file with no presentation.xml with a clear error', () => {
    const res = ST.stImportPptxDoc({ 'word/document.xml': '<w:document/>' }, 'essay.docx', T0);
    expect(res.error).toMatch(/PowerPoint/);
  });

  it('round-trips: an imported deck exports back to a PPTX spec with the same slide count', () => {
    const res = ST.stImportPptxDoc(basicDeck(), 'deck.pptx', T0);
    // describe the undescribed image so the gate opens, as a teacher would
    const missing = ST.stAltGate(res.doc.objects)[0];
    ST.stAppend(res.doc, { type: 'object.update', target: missing.id, patch: { alt: 'Chloroplast close-up' } }, 'user', T0);
    expect(ST.stAltGate(res.doc.objects)).toEqual([]);
    const spec = ST.stExportPptxSpec(res.doc);
    expect(spec.slideCount).toBe(2);
    expect(spec.layout.standard).toBe(true);
    expect(spec.slides[1].shapes.filter((s) => s.kind === 'image').length).toBe(2);
  });
});
