'use strict';
// The comments a person left on the original PDF, made usable for the edit tools (2026-11-09; pdf_read_annotations).
// The page side (pipeline.readPdfAnnotations) returns each comment with its quads and the text-layer words under them.
// Here, in Node, with no model:
//   fillFromScanReading: a scan has no text layer, so the marked words come from the run's saved scan reading (word boxes,
//     top-left origin in points) under the same quads (PDF space, bottom-left origin);
//   matchToOutline: the element of the accessible HTML that holds the marked words (or, for a note, the line next to it),
//     by its outline id, so edit_accessible_html can act on it.

const keyWords = (s) => String(s || '').normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

function fillFromScanReading(annotations, reading) {
  const pages = reading && Array.isArray(reading.pages) ? reading.pages : [];
  let filled = 0;
  for (const a of Array.isArray(annotations) ? annotations : []) {
    if (!a) continue;
    const pg = pages.find((p) => p && p.pageNum === a.page);
    if (!pg || !Array.isArray(pg.words) || !pg.words.length) continue;
    const pageW = Number(pg.pageW) || Number(a.pageW) || 612, pageH = Number(pg.pageH) || Number(a.pageH) || 792;
    const sx = (Number(a.pageW) || pageW) / pageW, sy = (Number(a.pageH) || pageH) / pageH;
    if (!(a.markedText && a.markedText.trim()) && Array.isArray(a.quads) && a.quads.length) {
      const picked = [];
      pg.words.forEach((w, i) => {
        if (!w || !Number.isFinite(w.x0) || !Number.isFinite(w.x1) || !Number.isFinite(w.y0) || !Number.isFinite(w.y1)) return;
        // reading box (top-left origin) -> PDF space (bottom-left origin), centre point
        const cx = ((w.x0 + w.x1) / 2) * sx, cy = (pageH - (w.y0 + w.y1) / 2) * sy;
        if (a.quads.some((q) => Array.isArray(q) && q.length >= 4 && cx >= q[0] - 1 && cx <= q[2] + 1 && cy >= q[1] - 1 && cy <= q[3] + 1)) picked.push({ i, t: w.t });
      });
      if (picked.length) { a.markedText = picked.sort((x, y) => x.i - y.i).map((x) => x.t).join(' ').slice(0, 1000); a.markedFrom = 'scan reading'; filled++; continue; }
    }
    // Non-markup scan annotations (sticky notes, text boxes, shapes) have no quads and no PDF text layer:
    // recover nearText from the nearest scan-reading line within 30pt of the annotation center.
    if (!(a.markedText && a.markedText.trim()) && !(a.nearText && a.nearText.trim()) && Array.isArray(a.rect) && a.rect.length === 4) {
      const rcy = (a.rect[1] + a.rect[3]) / 2;
      let best = null;
      const positioned = [];
      pg.words.forEach((w, i) => {
        if (!w || typeof w.t !== 'string' || !w.t.trim() || !Number.isFinite(w.x0) || !Number.isFinite(w.x1) || !Number.isFinite(w.y0) || !Number.isFinite(w.y1)) return;
        const cx = ((w.x0 + w.x1) / 2) * sx, cy = (pageH - (w.y0 + w.y1) / 2) * sy;
        positioned.push({ i, cx, cy, t: w.t.trim() });
        const d = Math.abs(cy - rcy);
        if (d <= 30 && (!best || d < best.d)) best = { d, y: cy };
      });
      if (best) {
        const line = positioned.filter((w) => Math.abs(w.cy - best.y) <= 6)
          .sort((x, y) => x.cx - y.cx || x.i - y.i)
          .map((w) => w.t).join(' ').replace(/\s+/g, ' ').slice(0, 300);
        if (line) { a.nearText = line; a.nearFrom = 'scan reading'; filled++; }
      }
    }
  }
  return filled;
}

// items: outline items with { id, kind, text, full?, alt?, caption?, firstRow?, level? }. Returns the best element or null.
function matchToOutline(text, items) {
  const toks = keyWords(text);
  if (!toks.length || !Array.isArray(items)) return null;
  const phrase = ' ' + toks.join(' ') + ' ';
  let best = null;
  for (const it of items) {
    if (!it || !it.id) continue;
    const body = keyWords([it.full || it.text, it.alt, it.caption, it.firstRow].filter((x) => typeof x === 'string').join(' '));
    if (!body.length) continue;
    const joined = ' ' + body.join(' ') + ' ';
    let score;
    if (joined.includes(phrase)) score = 2 + 1 / (1 + body.length); // contains the whole phrase: the smallest such element wins
    else {
      const have = new Set(body);
      const share = toks.filter((t) => have.has(t)).length / toks.length;
      if (share < 0.6) continue;
      score = share + 1e-4 / (1 + body.length); // prefer the smallest element on equal token share
    }
    if (!best || score > best.score) best = { score, it };
  }
  if (!best) return null;
  const it = best.it;
  return {
    id: it.id, kind: it.kind, ...(it.level ? { level: it.level } : {}),
    text: String(it.text || it.alt || it.caption || it.firstRow || '').slice(0, 160),
    match: best.score >= 2 ? 'contains the marked words' : 'shares most of the marked words',
  };
}

// A comment placed ON a picture: the image whose source crop (page fractions, origin top-left) holds the comment's centre
// (PDF space, origin bottom-left). The smallest such crop wins. items carry { kind: 'image', crop } from the outline.
function matchImage(a, items) {
  if (!a || !Array.isArray(a.rect) || !(a.pageW > 0) || !(a.pageH > 0) || !Array.isArray(items)) return null;
  const fx = ((a.rect[0] + a.rect[2]) / 2) / a.pageW, fy = 1 - ((a.rect[1] + a.rect[3]) / 2) / a.pageH;
  let best = null;
  for (const it of items) {
    const c = it && it.kind === 'image' && it.crop;
    if (!c || c.page !== a.page || fx < c.x0 || fx > c.x1 || fy < c.y0 || fy > c.y1) continue;
    const area = (c.x1 - c.x0) * (c.y1 - c.y0);
    if (!best || area < best.area) best = { area, it };
  }
  if (!best) return null;
  const it = best.it;
  return { id: it.id, kind: 'image', text: String(it.alt || it.caption || it.source || '').slice(0, 160), alt: it.alt === undefined ? null : it.alt, match: 'the comment sits on this picture' };
}

module.exports = { fillFromScanReading, matchToOutline, matchImage, keyWords };
