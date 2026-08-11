/**
 * geo-privacy.mjs  (phase 3 — the observation journal / class biodiversity map)
 * -------------------------------------------------------------------------
 * The tool strips EXIF/GPS from every photo on ingest (image-privacy.mjs). If a
 * teacher opts into a biodiversity map, ANY location must still be coarsened to
 * a privacy-safe cell BEFORE it is stored or shown — never a precise point, and
 * never with a time-of-day that could pin a child to a place and moment.
 *
 * This module owns that coarsening and the safe journal-entry shape. Persistence,
 * consent UI, and the map render are the platform's; these are the invariants
 * they must not violate.
 * -------------------------------------------------------------------------
 */

const KM_PER_DEG = 111;

/**
 * Snap a coordinate to a grid cell. Default ~11 km (0.1°) — neighbourhood/region
 * scale, never a precise point. Returns null for missing/invalid input.
 */
export function coarsenLocation(coord, { gridDeg = 0.1 } = {}) {
  if (!coord || !Number.isFinite(coord.lat) || !Number.isFinite(coord.lng)) return null;
  const snap = (v) => Math.round(v / gridDeg) * gridDeg;
  const lat = +snap(coord.lat).toFixed(4);
  const lng = +snap(coord.lng).toFixed(4);
  const precisionKm = Math.round(gridDeg * KM_PER_DEG);
  return {
    lat, lng, gridDeg, precisionKm,
    label: `~${precisionKm} km cell near ${lat.toFixed(1)}, ${lng.toFixed(1)}`,
    precise: false,
  };
}

/**
 * Build a journal entry that is safe to store and share:
 *   • coarse location cell only (or null),
 *   • DATE only — any time component is stripped,
 *   • no image bytes,
 *   • hasPreciseLocation is a hard-false invariant.
 */
export function journalEntry({ taxon, tier, coord, date, gridDeg } = {}) {
  return {
    scientificName: taxon?.canonicalName || taxon?.scientificName || null,
    commonName: taxon?.common || taxon?.commonName || null,
    tier: tier || null,
    date: date ? String(date).slice(0, 10) : null,      // 'YYYY-MM-DD' — no time of day
    location: coord ? coarsenLocation(coord, { gridDeg }) : null,
    hasPreciseLocation: false,                            // invariant — precise coords never stored
  };
}

/** Bucket entries into map cells for a class biodiversity view (counts per coarse cell). */
export function toMapCells(entries = []) {
  const cells = new Map();
  for (const e of entries) {
    if (!e?.location) continue;
    const key = `${e.location.lat},${e.location.lng}`;
    if (!cells.has(key)) cells.set(key, { lat: e.location.lat, lng: e.location.lng, count: 0, taxa: new Set() });
    const c = cells.get(key);
    c.count++;
    if (e.scientificName) c.taxa.add(e.scientificName);
  }
  return [...cells.values()].map((c) => ({ lat: c.lat, lng: c.lng, count: c.count, distinctTaxa: c.taxa.size }));
}
