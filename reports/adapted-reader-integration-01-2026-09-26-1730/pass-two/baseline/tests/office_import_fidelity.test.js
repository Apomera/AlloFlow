// Office-import fidelity (coverage #5-#8, 2026-07-03). DOCX/PPTX extraction bugs:
//   #5 — PPTX speaker notes were mapped by notesSlideK.xml FILENAME number (creation order), not slide
//        order, so notes landed on the wrong slides. Now resolved via the slide's .rels (authoritative).
//   #6 — mammoth.convertToHtml already renders footnotes/endnotes into bodyText; the augmentation pass
//        appended them AGAIN (duplicated). Now guarded on !usedMammothHtml.
//   #7 — the "never lose the file" regex fallback built <p[\s>] but OOXML is namespaced (<w:p>/<w:t>), so
//        it matched nothing. Now tolerates the namespace prefix.
//   #8 — an image with no descr inherited its neighbor's alt from a fixed 1200-char look-back. Now the
//        window is clamped to AFTER the previous blip.
// Office extraction needs zip/DOMParser, so these are source-pins + faithful mirrors of the pure logic.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('#5 — PPTX notes mapped via slide .rels, not filename number', () => {
  it('source pins the rels-based notes resolver', () => {
    expect(src).toContain('const _notesForSlide = async (sf, slideNum) =>');
    expect(src).toContain('notesSlideK.xml is numbered by CREATION order');
  });
  it('mirror: the notesSlide target normalizes to a zip path', () => {
    const tgt = '../notesSlides/notesSlide3.xml';
    const path = tgt.charAt(0) === '/' ? tgt.slice(1) : ('ppt/slides/' + tgt).replace(/ppt\/slides\/\.\.\//, 'ppt/');
    expect(path).toBe('ppt/notesSlides/notesSlide3.xml');
  });
});

describe('#6 — DOCX footnotes/endnotes not duplicated when mammoth HTML was used', () => {
  it('guards the footnote/endnote augmentation on !usedMammothHtml', () => {
    expect(src).toContain("if (name === 'word/footnotes.xml') { if (!usedMammothHtml)");
    expect(src).toContain("if (name === 'word/endnotes.xml') { if (!usedMammothHtml)");
  });
});

describe('#7 — OOXML fallback regex tolerates the namespace prefix', () => {
  it('source pins the namespace-prefix token', () => {
    expect(src).toContain("const _nsp = '(?:[A-Za-z0-9]+:)?';");
  });
  it('mirror: the namespaced fallback matches <w:p>/<w:t> (the bare one matched nothing)', () => {
    const _nsp = '(?:[A-Za-z0-9]+:)?';
    const paraRe = new RegExp('<' + _nsp + 'p[\\s>]' + '[\\s\\S]*?' + '<\\/' + _nsp + 'p>', 'g');
    const textRe = new RegExp('<' + _nsp + 't[^>]*>([\\s\\S]*?)<\\/' + _nsp + 't>', 'g');
    const xml = '<w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p><w:p><w:t>World</w:t></w:p></w:body>';
    const paras = xml.match(paraRe) || [];
    expect(paras.length).toBe(2);
    const out = [];
    for (const p of paras) { let m; textRe.lastIndex = 0; const parts = []; while ((m = textRe.exec(p)) !== null) parts.push(m[1]); out.push(parts.join('')); }
    expect(out).toEqual(['Hello', 'World']);
    // the OLD bare-tag regex matched nothing (this was the dead safety net):
    expect((xml.match(/<p[\s>]/g) || []).length).toBe(0);
    // and <w:pPr> (properties) is NOT mistaken for a paragraph:
    expect(new RegExp('<' + _nsp + 'p[\\s>]').test('<w:pPr>')).toBe(false);
  });
});

describe('#8 — image alt not stolen from a neighboring image', () => {
  it('source pins the clamped look-back window', () => {
    expect(src).toContain('const _prevBlipIdx = _hi > 0 ? hits[_hi - 1].idx : -1;');
    expect(src).toContain('Math.max(0, hit.idx - 1200, _prevBlipIdx + 1)');
  });
  it('mirror: image 2 (no descr) does NOT inherit image 1\'s descr', () => {
    const partXml = '<pic><docPr descr="Chart A"/><blip r:embed="r1"/></pic><pic><docPr/><blip r:embed="r2"/></pic>';
    const hits = [];
    const blipRe = /r:embed="([^"]+)"/g; let bm;
    while ((bm = blipRe.exec(partXml)) !== null) hits.push({ rid: bm[1], idx: bm.index });
    // image 1 keeps its own descr:
    const w0 = partXml.slice(Math.max(0, hits[0].idx - 1200, -1 + 1), hits[0].idx);
    const d0 = w0.match(/\bdescr="([^"]*)"/g);
    expect(d0 && d0[d0.length - 1]).toContain('Chart A');
    // image 2 (window clamped to after blip r1) has no descr → alt empty, NOT "Chart A":
    const w1 = partXml.slice(Math.max(0, hits[1].idx - 1200, hits[0].idx + 1), hits[1].idx);
    expect(w1.match(/\bdescr="([^"]*)"/g)).toBeNull();
  });
});
