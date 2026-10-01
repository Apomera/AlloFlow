// Table accessibility-correctness assertions (Beat-Adobe-on-3 §1.5, 2026-06-14).
//
// Two NEW assertions for the rich-table grid that the shipped span-consistency
// validator (_validateTableGrid) does NOT cover — they check accessibility
// correctness, not span geometry. Built here as a pure, ready-to-wire helper
// (doc_pipeline_source.jsx has in-flight concurrent edits, so it isn't merged in
// yet). When the pipeline file is free, fold these into _validateTableGrid as a
// final pass before its `{ ok: true, ... }` return; any new reason → revert (keep
// the honest image) per the existing accept-or-revert contract.
//
//   1. headers-without-scope : a grid that HAS header cells but NONE is
//      scope="col" or scope="row" — scope-less headers defeat the screen-reader
//      header<->cell association the feature exists for.
//   2. row-N-all-empty : a row whose every cell is empty after normalization — a
//      mostly-empty *reconstruction* means Vision failed silently (a genuine
//      rowspan-continuation does not appear as explicit empty cells in this grid
//      model, so an all-empty row is a real failure signal).

export function assertTableAccessibility(grid) {
  if (!grid || !Array.isArray(grid.rows) || grid.rows.length === 0) return { ok: true };
  const allCells = [];
  grid.rows.forEach((r) => {
    (r && Array.isArray(r.cells) ? r.cells : []).forEach((c) => allCells.push(c || {}));
  });

  // 1. headers-without-scope — only fires when header cells exist at all.
  const headerCells = allCells.filter((c) => c.isHeader);
  if (headerCells.length > 0) {
    const hasScope = allCells.some((c) => c.isHeader && (c.scope === 'col' || c.scope === 'row'));
    if (!hasScope) return { ok: false, reason: 'headers-without-scope' };
  }

  // 2. row-N-all-empty.
  for (let r = 0; r < grid.rows.length; r++) {
    const rc = (grid.rows[r] && Array.isArray(grid.rows[r].cells)) ? grid.rows[r].cells : [];
    if (rc.length >= 1 && rc.every((c) => String((c && c.text) || '').replace(/\s+/g, ' ').trim() === '')) {
      return { ok: false, reason: 'row-' + r + '-all-empty' };
    }
  }
  return { ok: true };
}
