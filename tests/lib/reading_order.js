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
