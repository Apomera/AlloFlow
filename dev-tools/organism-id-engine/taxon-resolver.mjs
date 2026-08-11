/**
 * taxon-resolver.mjs
 * -------------------------------------------------------------------------
 * The deterministic layer that sits AFTER the model.
 *
 * Gemini (via the platform's callGeminiVision) proposes NAMES from a photo.
 * This module never trusts the model to emit a URL or a hierarchy. Instead it
 * resolves each proposed name against authoritative, keyless, CORS-friendly
 * APIs and returns only references that actually resolve:
 *
 *   - GBIF species/match  -> canonical Linnaean ladder + stable taxon keys
 *   - Wikipedia REST summary -> verified article URL + extract + thumbnail
 *
 * If GBIF can't match the name, that is itself a signal the ID is shaky and is
 * surfaced (matched:false), never papered over.
 *
 * Drop-in note: in the AlloFlow STEM Lab this runs in the browser/Canvas
 * sandbox. Both endpoints are public GETs with permissive CORS. Confirm
 * reachability inside Canvas before shipping (the one platform-specific
 * unknown).
 * -------------------------------------------------------------------------
 */

const GBIF_MATCH = "https://api.gbif.org/v1/species/match";
const GBIF_SPECIES = "https://api.gbif.org/v1/species";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const INAT_SEARCH = "https://www.inaturalist.org/taxa/search?q=";

// Ordered so callers can render a top-down ladder (Kingdom -> Species).
const RANK_ORDER = ["kingdom", "phylum", "class", "order", "family", "genus", "species"];

async function getJSON(url, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      signal: ctrl.signal,
      headers: {
        // Wikimedia asks clients to identify themselves.
        "User-Agent": "AlloFlow-OrganismID/0.1 (education; contact via platform)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return { __httpError: res.status };
    return await res.json();
  } catch (err) {
    return { __netError: String(err && err.message ? err.message : err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Build the ordered lineage array from a GBIF match/usage record. */
export function lineageFromGbif(rec) {
  const lineage = [];
  for (const rank of RANK_ORDER) {
    const name = rec[rank];
    if (name) {
      lineage.push({ rank, name, key: rec[`${rank}Key`] ?? null });
    }
  }
  return lineage;
}

/**
 * Resolve one proposed name to a canonical taxon + lineage via GBIF.
 * Returns { matched, input, canonicalName, rank, gbifNameMatchConfidence,
 *           matchType, lineage, gbif:{key,url}, note }
 *
 * NOTE: gbifNameMatchConfidence is how sure GBIF is that the NAME STRING maps
 * to this taxon. It is NOT the confidence that a photo depicts this organism.
 * Keep the two clearly separated in any UI.
 */
/**
 * Resolve a name against the bundled offline backbone (local-backbone.json).
 * Exact species hit → its stored lineage; otherwise the parsed genus →
 * reconstruct a lineage from the genus entry + a species node. Marked
 * source:"local-backbone" and approximate so the UI can say so.
 */
export function resolveFromBackbone(name, backbone) {
  const key = String(name || "").trim().toLowerCase();
  if (!key || !backbone) return null;
  const s = backbone.species?.[key];
  if (s) {
    return {
      matched: true, input: name, canonicalName: s.canonicalName, rank: s.rank, lineage: s.lineage,
      source: "local-backbone", approximate: true,
      matchNote: "Resolved from the bundled offline backbone (no network) — species identity unverified.",
      gbif: s.key ? { key: s.key, url: `https://www.gbif.org/species/${s.key}` } : null,
    };
  }
  const g = backbone.genera?.[key.split(/\s+/)[0]];
  if (g) {
    const isBinomial = /\s/.test(key);
    const lineage = isBinomial ? [...g.lineage, { rank: "species", name, key: null }] : [...g.lineage];
    return {
      matched: true, input: name, canonicalName: name, rank: isBinomial ? "SPECIES" : "GENUS", lineage,
      source: "local-backbone", approximate: true,
      matchNote: "Resolved from the bundled offline backbone (no network).",
    };
  }
  return null;
}

export async function resolveTaxon(name, opts = {}) {
  const rec = await getJSON(`${GBIF_MATCH}?name=${encodeURIComponent(name)}`, opts);
  if (rec.__netError || rec.__httpError) {
    // Network down (e.g. Canvas sandbox can't reach GBIF): fall back to the bundled
    // offline backbone so a hazard taxon still gets a full lineage → the category
    // nets and ladder keep working. Fail toward caution, never toward silence.
    const local = opts.localBackbone && resolveFromBackbone(name, opts.localBackbone);
    if (local) return local;
    return { matched: false, input: name, error: rec.__netError || `HTTP ${rec.__httpError}`, lineage: [] };
  }
  if (!rec.usageKey || rec.matchType === "NONE") {
    return {
      matched: false,
      input: name,
      matchType: rec.matchType || "NONE",
      lineage: [],
      note: "GBIF could not match this name — treat the ID as unverified and do not present it as authoritative.",
    };
  }
  const key = rec.usageKey;
  // matchType quality: EXACT is clean; FUZZY (approximate spelling) and HIGHERRANK
  // (only resolved above the requested rank) are approximate — say so, don't imply certainty.
  const approximate = rec.matchType !== "EXACT";
  const matchNote =
    rec.matchType === "FUZZY" ? "GBIF matched this name approximately (possible misspelling) — treat as tentative."
    : rec.matchType === "HIGHERRANK" ? "GBIF matched only to a higher rank than requested — species-level identity is unverified."
    : null;
  return {
    matched: true,
    input: name,
    canonicalName: rec.canonicalName,
    scientificName: rec.scientificName,
    rank: rec.rank,
    gbifNameMatchConfidence: rec.confidence, // name-string match, NOT photo-ID confidence
    matchType: rec.matchType,
    approximate,
    matchNote,
    status: rec.status,
    lineage: lineageFromGbif(rec),
    gbif: { key, url: `https://www.gbif.org/species/${key}` },
  };
}

/** Fetch a verified Wikipedia reference for a resolved taxon, or null. */
export async function wikipediaRef(canonicalName, opts = {}) {
  if (!canonicalName) return null;
  const title = encodeURIComponent(canonicalName.replace(/ /g, "_"));
  const s = await getJSON(`${WIKI_SUMMARY}/${title}`, opts);
  if (s.__netError || s.__httpError) return null;
  // Skip disambiguation/no-content pages — only surface a real article.
  if (s.type && s.type !== "standard") return null;
  if (!s.content_urls?.desktop?.page) return null;
  return {
    title: s.title,
    url: s.content_urls.desktop.page,
    extract: s.extract || "",
    description: s.description || "",
    thumbnail: s.thumbnail?.source || null,
  };
}

/**
 * Full reference bundle for a resolved taxon: only links that verify are
 * included. iNaturalist is given as a search deep-link (no key needed).
 */
export async function getReferences(resolved, opts = {}) {
  if (!resolved?.matched) return { wikipedia: null, gbif: null, inaturalist: null };
  const wiki = await wikipediaRef(resolved.canonicalName, opts);
  return {
    gbif: resolved.gbif ? { title: `GBIF: ${resolved.canonicalName}`, url: resolved.gbif.url } : null,
    wikipedia: wiki,
    inaturalist: {
      title: `iNaturalist: ${resolved.canonicalName}`,
      url: INAT_SEARCH + encodeURIComponent(resolved.canonicalName),
    },
  };
}

export { RANK_ORDER };
