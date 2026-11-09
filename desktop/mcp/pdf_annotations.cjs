'use strict';
// The comments a person left on the original PDF, made usable for the edit tools (2026-11-09; pdf_read_annotations).
// The page side (pipeline.readPdfAnnotations) returns each comment with its quads and the text-layer words under them.
// Here, in Node, with no model:
//   fillFromScanReading: a scan has no text layer, so the marked words come from the run's saved scan reading (word boxes,
//     top-left origin in points) under the same quads (PDF space, bottom-left origin);
//   matchToOutline: the element of the accessible HTML that holds the marked words (or, for a note, the line next to it),
//     by its outline id, so edit_accessible_html can act on it.

const keyWords = (s) => String(s || '').normalize('NFKC').toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]+/gu, '')).filter(Boolean);

function fillFromScanReading(annotations, reading) {
  const pages = reading && Array.isArray(reading.pages) ? reading.pages : [];
  let filled = 0;
  for (const a of Array.isArray(annotations) ? annotations : []) {
    if (!a || (a.markedText && a.markedText.trim()) || !Array.isArray(a.quads) || !a.quads.length) continue;
    const pg = pages.find((p) => p && p.pageNum === a.page);
    if (!pg || !Array.isArray(pg.words) || !pg.words.length) continue;
    const pageW = Number(pg.pageW) || Number(a.pageW) || 612, pageH = Number(pg.pageH) || Number(a.pageH) || 792;
    const sx = (Number(a.pageW) || pageW) / pageW, sy = (Number(a.pageH) || pageH) / pageH;
    const picked = [];
    pg.words.forEach((w, i) => {
      // reading box (top-left origin) -> PDF space (bottom-left origin), centre point
      const cx = ((w.x0 + w.x1) / 2) * sx, cy = (pageH - (w.y0 + w.y1) / 2) * sy;
      if (a.quads.some((q) => cx >= q[0] - 1 && cx <= q[2] + 1 && cy >= q[1] - 1 && cy <= q[3] + 1)) picked.push({ i, t: w.t });
    });
    if (picked.length) { a.markedText = picked.sort((x, y) => x.i - y.i).map((x) => x.t).join(' ').slice(0, 1000); a.markedFrom = 'scan reading'; filled++; }
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
      score = share;
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

module.exports = { fillFromScanReading, matchToOutline, keyWords };
