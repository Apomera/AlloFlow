// Reading-order deterministic core (2026-06-14) — the "code-executes" + "accept-
// or-revert" half of Beat-Adobe-on-3 §2. The COMPLEX multi-column ordering is
// delegated to the Gemini vision pass (region segmentation + olmOCR-style bbox
// anchoring); these pure functions are what surrounds it:
//   - isSingleColumn(): the cheap gate — single-column pages skip the vision call
//     and use the simple fallback (the plan's "keep the simple rule as a cheap
//     fallback for plainly single-column pages").
//   - simpleReadingOrder(): the single-column / fallback order (y then x).
//   - validateReadingOrder(): the ACCEPT-OR-REVERT check on a vision-emitted order
//     — it must be a permutation of exactly the block ids (no missing/extra/dupe),
//     else the caller reverts to simpleReadingOrder().
//   - applyReadingOrder(): deterministically reorder blocks by an accepted order.
// Pure JS; ready to wire into the pipeline (NOT wired here — doc_pipeline has
// in-flight concurrent edits). Blocks are { id, x, y, w, h } (top-left + size).

const _ok = (b) => b && isFinite(b.x) && isFinite(b.y) && isFinite(b.w) && isFinite(b.h);

// True when the page is plainly single-column: no vertical gutter wide enough to
// separate two stacks of side-by-side (y-overlapping) content. Conservative — it
// only reports multi-column when there's a real gutter AND content straddling it,
// so a single column with ragged right edges still reads as single-column.
export function isSingleColumn(blocks, pageWidth) {
  const bs = (blocks || []).filter(_ok);
  if (bs.length < 2) return true;
  const pw = pageWidth || Math.max.apply(null, bs.map((b) => b.x + b.w));
  if (!(pw > 0)) return true;
  // Largest interior gap in x-coverage.
  const ivs = bs.map((b) => [b.x, b.x + b.w]).sort((a, b) => a[0] - b[0]);
  let covEnd = ivs[0][1], bestGap = 0, gapAt = null;
  for (let i = 1; i < ivs.length; i++) {
    if (ivs[i][0] > covEnd) {
      const g = ivs[i][0] - covEnd;
      if (g > bestGap) { bestGap = g; gapAt = (covEnd + ivs[i][0]) / 2; }
    }
    if (ivs[i][1] > covEnd) covEnd = ivs[i][1];
  }
  if (bestGap < 0.04 * pw || gapAt == null) return true; // no meaningful gutter
  const left = bs.filter((b) => b.x + b.w <= gapAt);
  const right = bs.filter((b) => b.x >= gapAt);
  if (!left.length || !right.length) return true;
  // Side-by-side iff some left block vertically overlaps some right block.
  const sideBySide = left.some((l) => right.some((r) => !(l.y + l.h <= r.y || r.y + r.h <= l.y)));
  return !sideBySide;
}

// Single-column / fallback order: top-to-bottom, then left-to-right on ties.
export function simpleReadingOrder(blocks) {
  return (blocks || []).filter(_ok).slice()
    .sort((a, b) => (a.y - b.y) || (a.x - b.x))
    .map((b) => b.id);
}

// Accept-or-revert validator for a vision-emitted reading order.
export function validateReadingOrder(order, blockIds) {
  if (!Array.isArray(order)) return { ok: false, reason: 'not-an-array' };
  const ids = Array.isArray(blockIds) ? blockIds : [];
  if (order.length !== ids.length) return { ok: false, reason: 'length-' + order.length + '-expected-' + ids.length };
  const idset = new Set(ids);
  const seen = new Set();
  for (const id of order) {
    if (!idset.has(id)) return { ok: false, reason: 'unknown-id-' + id };
    if (seen.has(id)) return { ok: false, reason: 'duplicate-id-' + id };
    seen.add(id);
  }
  return { ok: true };
}

// Reorder blocks by an (already-validated) order; drops ids with no block.
export function applyReadingOrder(blocks, order) {
  const byId = {};
  (blocks || []).forEach((b) => { if (b && b.id != null) byId[b.id] = b; });
  return (order || []).map((id) => byId[id]).filter(Boolean);
}

// Vertical gutters: x-positions of gaps in horizontal coverage wide enough (>= 4% page width) to be a
// column separator. Detected from the NARROW blocks (width < 60% page) so a full-width title/figure that
// covers the whole row can't mask the gutter between the columns beneath it.
function _gutters(bs, pw) {
  const narrow = bs.filter((b) => b.w < 0.6 * pw);
  const src = narrow.length >= 2 ? narrow : bs;
  const ivs = src.map((b) => [b.x, b.x + b.w]).sort((a, b) => a[0] - b[0]);
  const out = [];
  let covEnd = ivs[0][1];
  for (let i = 1; i < ivs.length; i++) {
    if (ivs[i][0] > covEnd && (ivs[i][0] - covEnd) >= 0.04 * pw) out.push((covEnd + ivs[i][0]) / 2);
    if (ivs[i][1] > covEnd) covEnd = ivs[i][1];
  }
  return out;
}

// DETERMINISTIC multi-column reading order (the piece the lib delegated to a vision pass). Single-column
// pages fall through to simpleReadingOrder. For multi-column pages: full-width blocks that STRADDLE a
// gutter (titles, pull-quotes, figures, footers) act as horizontal band dividers — they're read at their
// y-position; the column blocks BETWEEN two dividers are read column-by-column (left→right), each column
// top→bottom. Returns an array of block ids (a permutation of the input ids), so the caller can run it
// through validateReadingOrder and accept-or-revert. Pure; coordinate source is the caller's concern.
export function deriveColumnReadingOrder(blocks, pageWidth) {
  const bs = (blocks || []).filter(_ok);
  if (bs.length < 2) return bs.map((b) => b.id);
  const pw = pageWidth || Math.max.apply(null, bs.map((b) => b.x + b.w));
  // Detect columns from the gutters (which exclude full-width blocks, so a full-width title can't mask
  // the gap the way the all-blocks isSingleColumn does). No gutter → single-column.
  const guts = _gutters(bs, pw);
  if (!guts.length) return simpleReadingOrder(bs);
  const colOf = (b) => { const cx = b.x + b.w / 2; let c = 0; for (const g of guts) if (cx > g) c++; return c; };
  const straddles = (b) => guts.some((g) => b.x < g && b.x + b.w > g);
  const full = bs.filter(straddles).sort((a, b) => a.y - b.y);
  const cols = bs.filter((b) => !straddles(b));
  // Conservative: only treat it as real multi-column when two column blocks in DIFFERENT columns
  // vertically OVERLAP (genuine side-by-side text). A gutter with no side-by-side content (e.g. a
  // left-aligned then right-aligned block at different heights) degrades to plain top-to-bottom.
  const sideBySide = cols.some((a) => cols.some((b) => colOf(a) !== colOf(b) && !(a.y + a.h <= b.y || b.y + b.h <= a.y)));
  if (!sideBySide) return simpleReadingOrder(bs);
  const order = [];
  const emitBand = (yLo, yHi) => {
    const byCol = {};
    cols.filter((b) => b.y >= yLo && b.y < yHi).forEach((b) => { const c = colOf(b); (byCol[c] = byCol[c] || []).push(b); });
    Object.keys(byCol).map(Number).sort((a, b) => a - b).forEach((c) => {
      byCol[c].sort((a, b) => (a.y - b.y) || (a.x - b.x)).forEach((b) => order.push(b.id));
    });
  };
  let bandStart = -Infinity;
  for (const fw of full) { emitBand(bandStart, fw.y); order.push(fw.id); bandStart = fw.y; }
  emitBand(bandStart, Infinity);
  return order;
}
